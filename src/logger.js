/**
 * Logger utility for Smaug
 * 
 * When running as a background process (non-TTY), only logs important events.
 * When running interactively, shows all progress.
 * 
 * Also handles log rotation (keeps max 10 log files).
 */

import fs from 'fs';
import path from 'path';

// Detect if running as background process
const isInteractive = process.stdout.isTTY && process.stderr.isTTY;
const isBackground = !isInteractive;

/**
 * Log rotation - keep max 10 log files
 */
function rotateLogs(logPath, maxFiles = 10) {
  if (!fs.existsSync(logPath)) {
    return;
  }

  try {
    const logDir = path.dirname(logPath);
    const logBase = path.basename(logPath);
    const logExt = path.extname(logPath);
    const logName = path.basename(logPath, logExt);

    // Get all log files matching pattern (e.g., smaug.log, smaug.log.1, smaug.log.2)
    const escapedLogName = logName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedLogExt = logExt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const files = fs.readdirSync(logDir)
      .filter(f => f.startsWith(logName) && f.endsWith(logExt))
      .map(f => {
        // Match patterns like: smaug.log or smaug.log.1 or smaug.log.2, etc.
        const match = f.match(new RegExp(`^${escapedLogName}${escapedLogExt}(?:\\.(\\d+))?$`));
        return {
          name: f,
          num: match && match[1] ? parseInt(match[1], 10) : 0,
          path: path.join(logDir, f)
        };
      })
      .sort((a, b) => b.num - a.num); // Sort descending

    // If we have too many files, delete the oldest
    if (files.length >= maxFiles) {
      const toDelete = files.slice(maxFiles - 1);
      for (const file of toDelete) {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          // Ignore deletion errors
        }
      }
    }

    // Rotate existing files
    for (let i = files.length - 1; i >= 0 && i < maxFiles - 1; i--) {
      const file = files[i];
      const newNum = file.num + 1;
      const newPath = path.join(logDir, `${logName}${logExt}.${newNum}`);
      try {
        if (fs.existsSync(file.path)) {
          fs.renameSync(file.path, newPath);
        }
      } catch (e) {
        // Ignore rotation errors
      }
    }
  } catch (e) {
    // Ignore rotation errors - logging should not fail the app
  }
}

/**
 * Check if a message should be logged in background mode
 * Only important messages are logged when running as background process
 */
function shouldLogInBackground(level, message) {
  if (!isBackground) {
    return true; // Always log in interactive mode
  }

  // In background mode, only log important messages
  const importantPatterns = [
    /^\[.*\] Starting smaug job/,
    /^\[.*\] Phase 1: Fetching/,
    /^\[.*\] Phase 2: Invoking/,
    /^\[.*\] Processing \d+ bookmark/,
    /^\[.*\] Pushing to API/,
    /^\[.*\] API push complete/,
    /^\[.*\] Analysis complete/,
    /^\[.*\] Fetched \d+ new bookmark/,
    /^\[.*\] Found \d+ pending bookmark/,
    /^\[.*\] No bookmarks to process/,
    /^\[.*\] Job error:/,
    /^\[.*\] Claude Code failed:/,
    /^\[.*\] API push failed:/,
    /Error:/i,
    /Failed:/i,
    /Complete/i,
    /Done/i
  ];

  // Error/warn messages are always important
  if (level === 'error' || level === 'warn') {
    return true;
  }

  // Check if message matches important patterns
  return importantPatterns.some(pattern => pattern.test(message));
}

/**
 * Logger class
 */
class Logger {
  constructor() {
    this.isBackground = isBackground;
    this.isInteractive = isInteractive;
  }

  /**
   * Log a message (only if it's important in background mode)
   */
  log(message, force = false) {
    if (force || shouldLogInBackground('log', message)) {
      console.log(message);
    }
  }

  /**
   * Log an error (always logged)
   */
  error(message) {
    console.error(message);
  }

  /**
   * Log a warning (always logged)
   */
  warn(message) {
    console.warn(message);
  }

  /**
   * Log progress (only in interactive mode)
   */
  progress(message) {
    if (this.isInteractive) {
      process.stdout.write(message);
    }
  }

  /**
   * Setup log rotation for a log file
   */
  setupRotation(logPath, maxFiles = 10) {
    rotateLogs(logPath, maxFiles);
  }
}

export const logger = new Logger();
export default logger;


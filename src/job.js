/**
 * Smaug Scheduled Job
 *
 * Full two-phase workflow:
 * 1. Fetch bookmarks, expand links, extract content
 * 2. Invoke Claude Code for analysis and filing
 *
 * Can be used with:
 * - Cron: "0,30 * * * *" (every 30 min) - node /path/to/smaug/src/job.js
 * - Bree: Import and add to your Bree jobs array
 * - systemd timers: See README for setup
 * - Any other scheduler
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fetchAndPrepareBookmarks } from './processor.js';
import { loadConfig } from './config.js';
import { pushBookmarksBatch, pushKnowledgeEntries, pushRecentBookmarks } from './api-client.js';
import { logger } from './logger.js';

const JOB_NAME = 'smaug';
const LOCK_FILE = path.join(os.tmpdir(), 'smaug.lock');

// ============================================================================
// Lock Management - Prevents overlapping runs
// ============================================================================

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const { pid, timestamp } = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      try {
        process.kill(pid, 0); // Check if process exists
        const age = Date.now() - timestamp;
        if (age < 20 * 60 * 1000) { // 20 minute timeout
        logger.log(`[${JOB_NAME}] Previous run still in progress (PID ${pid}). Skipping.`);
        return false;
      }
      logger.log(`[${JOB_NAME}] Stale lock found (${Math.round(age / 60000)}min old). Overwriting.`);
    } catch (e) {
      logger.log(`[${JOB_NAME}] Removing stale lock (PID ${pid} no longer running)`);
      }
    } catch (e) {
      // Invalid lock file
    }
    fs.unlinkSync(LOCK_FILE);
  }
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
  return true;
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const { pid } = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      if (pid === process.pid) {
        fs.unlinkSync(LOCK_FILE);
      }
    }
  } catch (e) {}
}

// ============================================================================
// Claude Code Invocation
// ============================================================================

async function invokeClaudeCode(config, bookmarkCount, options = {}) {
  const timeout = config.claudeTimeout || 900000; // 15 minutes default
  const model = config.claudeModel || 'sonnet'; // or 'haiku' for faster/cheaper
  const trackTokens = options.trackTokens || false;

  // Specific tool permissions instead of full YOLO mode
  // Task is needed for parallel subagent processing
  const allowedTools = config.allowedTools || 'Read,Write,Edit,Glob,Grep,Bash,Task,TodoWrite';

  // Find claude binary - check common locations
  let claudePath = 'claude';
  const possiblePaths = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(process.env.HOME || '', '.local/bin/claude'),
    path.join(process.env.HOME || '', 'Library/Application Support/Herd/config/nvm/versions/node/v20.19.4/bin/claude'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      claudePath = p;
      break;
    }
  }
  // Also check via which if we haven't found it
  if (claudePath === 'claude') {
    try {
      const whichResult = execSync('which claude', { encoding: 'utf8' }).trim();
      if (whichResult) {
        claudePath = whichResult;
      }
    } catch {
      // which failed, claude not in PATH
    }
  }

  // Verify claude binary exists before trying to spawn it
  if (claudePath === 'claude' || !fs.existsSync(claudePath)) {
    return Promise.resolve({
      success: false,
      error: `Claude CLI not found. Please install Claude Code:\n\n  Install via npm:\n    npm install -g @anthropic-ai/claude-code\n\n  Or visit: https://github.com/anthropics/claude-code\n\n  After installation, ensure 'claude' is in your PATH.`,
      exitCode: -1
    });
  }

  // Show processing start message
  logger.progress(`\nProcessing ${bookmarkCount} bookmark${bookmarkCount !== 1 ? 's' : ''}...\n\n`);

  return new Promise((resolve) => {
    const args = [
      '--print',
      '--verbose',
      '--output-format', 'stream-json',
      '--model', model,
      '--allowedTools', allowedTools,
      '--',
      `Process the ${bookmarkCount} bookmark(s) in ./.state/pending-bookmarks.json following the instructions in ./.claude/commands/process-bookmarks.md. Read that file first, then process each bookmark.`
    ];

    // Ensure PATH includes common node locations for the claude shebang
    const nodePaths = [
      '/usr/local/bin',
      '/opt/homebrew/bin',
      path.join(process.env.HOME || '', 'Library/Application Support/Herd/config/nvm/versions/node/v20.19.4/bin'),
      path.join(process.env.HOME || '', '.local/bin'),
      path.join(process.env.HOME || '', '.bun/bin'),
    ];
    const enhancedPath = [...nodePaths, process.env.PATH || ''].join(':');

    // Get ANTHROPIC_API_KEY from config or env only
    // Note: Don't parse from ~/.zshrc - OAuth tokens (sk-ant-oat01-*) might be
    // incorrectly stored there and would override valid OAuth credentials
    const apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

    const proc = spawn(claudePath, args, {
      cwd: config.projectRoot || process.cwd(),
      env: {
        ...process.env,
        PATH: enhancedPath,
        ...(apiKey ? { ANTHROPIC_API_KEY: apiKey } : {})
      },
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let lastText = '';
    let filesWritten = [];
    let bookmarksProcessed = 0;
    let totalBookmarks = bookmarkCount;

    // Track parallel tasks
    const parallelTasks = new Map(); // taskId -> { description, startTime, status }
    let tasksSpawned = 0;
    let tasksCompleted = 0;

    // Token usage tracking
    const tokenUsage = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      subagentInput: 0,
      subagentOutput: 0,
      model: model,
      subagentModel: null
    };

    // Helper to format time elapsed
    const startTime = Date.now();
    const elapsed = () => {
      const ms = Date.now() - startTime;
      const secs = Math.floor(ms / 1000);
      return secs < 60 ? `${secs}s` : `${Math.floor(secs/60)}m ${secs%60}s`;
    };

    // Progress bar helper
    const progressBar = (current, total, width = 20) => {
      const pct = Math.min(current / total, 1);
      const filled = Math.round(pct * width);
      const empty = width - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      return `[${bar}] ${current}/${total}`;
    };

    // Status messages
    const statusMessages = [
      'Reading bookmarks...',
      'Processing content...',
      'Categorizing entries...',
      'Writing files...',
      'Updating archive...',
      'Analyzing links...',
    ];
    let statusMsgIndex = 0;
    const nextStatusMsg = () => statusMessages[statusMsgIndex++ % statusMessages.length];

    // Track one-time messages to avoid duplicates
    const shownMessages = new Set();

    // Simple spinner with status messages
    const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const spinnerMessages = [
      'Reading bookmarks',
      'Processing content',
      'Categorizing entries',
      'Writing files',
      'Updating archive',
      'Analyzing links',
    ];
    let spinnerFrame = 0;
    let spinnerMsgFrame = 0;
    let lastSpinnerLine = '';
    let spinnerActive = true;
    let currentSpinnerMsg = spinnerMessages[0];

    // Change message every 10 seconds
    const msgInterval = setInterval(() => {
      if (!spinnerActive) return;
      spinnerMsgFrame = (spinnerMsgFrame + 1) % spinnerMessages.length;
      currentSpinnerMsg = spinnerMessages[spinnerMsgFrame];
    }, 10000);

    const spinnerInterval = setInterval(() => {
      if (!spinnerActive || !logger.isInteractive) return;
      spinnerFrame = (spinnerFrame + 1) % spinnerFrames.length;
      const frame = spinnerFrames[spinnerFrame];
      const spinnerLine = `\r  ${frame} ${currentSpinnerMsg}... [${elapsed()}]`;
      process.stdout.write(spinnerLine + '          '); // Extra spaces to clear previous longer messages
      lastSpinnerLine = spinnerLine;
    }, 150);

    // Start the spinner
    logger.progress('\n  Processing... this may take a moment.\n');
    lastSpinnerLine = '  Processing...';
    logger.progress(lastSpinnerLine);

    // Helper to clear spinner and print a status line
    const printStatus = (msg) => {
      if (logger.isInteractive) {
        // Clear current line and print message
        process.stdout.write('\r' + ' '.repeat(60) + '\r');
        process.stdout.write(msg);
      } else {
        // In background mode, only log important status messages
        logger.log(msg.trim());
      }
    };

    // Helper to stop spinner completely
    const stopSpinner = () => {
      spinnerActive = false;
      clearInterval(spinnerInterval);
      clearInterval(msgInterval);
      if (logger.isInteractive) {
        process.stdout.write('\r' + ' '.repeat(60) + '\r');
      }
    };

    // Buffer for incomplete JSON lines
    let lineBuffer = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;

      // Handle streaming data that may split across chunks
      lineBuffer += text;
      const lines = lineBuffer.split('\n');
      // Keep the last incomplete line in the buffer
      lineBuffer = lines.pop() || '';

      // Parse streaming JSON and extract progress info
      for (const line of lines) {
        if (!line.trim()) continue;

        // Skip lines that don't look like JSON events
        if (!line.startsWith('{')) continue;

        try {
          const event = JSON.parse(line);

          // Show assistant text as it streams (filtered)
          if (event.type === 'assistant' && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === 'text' && block.text !== lastText) {
                const newPart = block.text.slice(lastText.length);
                if (newPart && newPart.length > 50) {
                  // Only show final summaries
                  if (newPart.includes('Processed') && newPart.includes('bookmark')) {
                    logger.progress(`\n💬 ${newPart.trim().slice(0, 200)}${newPart.length > 200 ? '...' : ''}\n`);
                  }
                }
                lastText = block.text;
              }

              // Track tool usage
              if (block.type === 'tool_use') {
                const toolName = block.name;
                const input = block.input || {};

                if (toolName === 'Write' && input.file_path) {
                  const fileName = input.file_path.split('/').pop();
                  const dir = input.file_path.includes('/knowledge/tools/') ? 'tools' :
                             input.file_path.includes('/knowledge/articles/') ? 'articles' : '';
                  filesWritten.push(fileName);
                  if (dir) {
                    printStatus(`    → Created: ${dir}/${fileName}\n`);
                  } else if (fileName === 'bookmarks.md') {
                    bookmarksProcessed++;
                    printStatus(`  ${progressBar(bookmarksProcessed, totalBookmarks)} [${elapsed()}]`);
                  } else {
                    printStatus(`    → Created: ${fileName}\n`);
                  }
                } else if (toolName === 'Edit' && input.file_path) {
                  const fileName = input.file_path.split('/').pop();
                  if (fileName === 'bookmarks.md') {
                    bookmarksProcessed++;
                    printStatus(`  ${progressBar(bookmarksProcessed, totalBookmarks)} [${elapsed()}]`);
                  } else if (fileName === 'pending-bookmarks.json') {
                    printStatus(`  Cleaning up processed bookmarks...\n`);
                  }
                } else if (toolName === 'Read' && input.file_path) {
                  const fileName = input.file_path.split('/').pop();
                  if (fileName === 'pending-bookmarks.json' && !shownMessages.has('reading')) {
                    shownMessages.add('reading');
                    printStatus(`  Reading pending bookmarks...\n`);
                  } else if (fileName === 'process-bookmarks.md' && !shownMessages.has('instructions')) {
                    shownMessages.add('instructions');
                    printStatus(`  Reading processing instructions...\n`);
                  }
                } else if (toolName === 'Task') {
                  const desc = input.description || `batch ${tasksSpawned + 1}`;
                  // Only count if we haven't seen this task description
                  const taskKey = `task-${desc}`;
                  if (!parallelTasks.has(taskKey)) {
                    tasksSpawned++;
                    parallelTasks.set(taskKey, {
                      description: desc,
                      startTime: Date.now(),
                      status: 'running'
                    });
                    printStatus(`  → Spawning parallel task: ${desc}\n`);
                    if (tasksSpawned > 1) {
                      printStatus(`     ${tasksSpawned} tasks running in parallel\n`);
                    }
                  }
                } else if (toolName === 'Bash') {
                  const cmd = input.command || '';
                  if (cmd.includes('jq') && cmd.includes('bookmarks')) {
                    printStatus(`  → ${nextStatusMsg()}\n`);
                  }
                }
              }
            }
          }

          // Track task completions from tool results
          if (event.type === 'user' && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === 'tool_result' && !block.is_error && block.tool_use_id) {
                // Check if this looks like a Task completion and we haven't counted it
                const content = typeof block.content === 'string' ? block.content : '';
                const toolId = block.tool_use_id;
                if ((content.includes('Processed') || content.includes('completed')) &&
                    !shownMessages.has(`task-done-${toolId}`)) {
                  shownMessages.add(`task-done-${toolId}`);
                  tasksCompleted++;
                  if (tasksSpawned > 0 && tasksCompleted <= tasksSpawned) {
                    const pct = Math.round((tasksCompleted / tasksSpawned) * 100);
                    printStatus(`  → Task completed (${tasksCompleted}/${tasksSpawned}) [${pct}%]\n`);
                  }
                }
                // Track subagent token usage from result
                if (trackTokens) {
                  const usageMatch = content.match(/usage.*?input.*?(\d+).*?output.*?(\d+)/i);
                  if (usageMatch) {
                    tokenUsage.subagentInput += parseInt(usageMatch[1], 10);
                    tokenUsage.subagentOutput += parseInt(usageMatch[2], 10);
                  }
                  // Detect subagent model from content
                  if (!tokenUsage.subagentModel && content.includes('haiku')) {
                    tokenUsage.subagentModel = 'haiku';
                  } else if (!tokenUsage.subagentModel && content.includes('sonnet')) {
                    tokenUsage.subagentModel = 'sonnet';
                  }
                }
              }
            }
          }

          // Track token usage from result event
          if (event.type === 'result' && event.usage && trackTokens) {
            tokenUsage.input = event.usage.input_tokens || 0;
            tokenUsage.output = event.usage.output_tokens || 0;
            tokenUsage.cacheRead = event.usage.cache_read_input_tokens || 0;
            tokenUsage.cacheWrite = event.usage.cache_creation_input_tokens || 0;
          }

          // Show result summary
          if (event.type === 'result') {
            stopSpinner();

            // Build token usage display if tracking enabled
            let tokenDisplay = '';
            if (trackTokens && (tokenUsage.input > 0 || tokenUsage.output > 0)) {
              // Pricing per million tokens (as of 2024)
              const pricing = {
                'sonnet': { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
                'haiku': { input: 0.25, output: 1.25, cacheRead: 0.025, cacheWrite: 0.30 },
                'opus': { input: 15.00, output: 75.00, cacheRead: 1.50, cacheWrite: 18.75 }
              };

              const mainPricing = pricing[tokenUsage.model] || pricing.sonnet;
              const subPricing = pricing[tokenUsage.subagentModel || tokenUsage.model] || mainPricing;

              // Calculate costs
              const mainInputCost = (tokenUsage.input / 1_000_000) * mainPricing.input;
              const mainOutputCost = (tokenUsage.output / 1_000_000) * mainPricing.output;
              const cacheReadCost = (tokenUsage.cacheRead / 1_000_000) * mainPricing.cacheRead;
              const cacheWriteCost = (tokenUsage.cacheWrite / 1_000_000) * mainPricing.cacheWrite;
              const subInputCost = (tokenUsage.subagentInput / 1_000_000) * subPricing.input;
              const subOutputCost = (tokenUsage.subagentOutput / 1_000_000) * subPricing.output;

              const totalCost = mainInputCost + mainOutputCost + cacheReadCost + cacheWriteCost + subInputCost + subOutputCost;

              const formatNum = (n) => n.toLocaleString();
              const formatCost = (c) => c < 0.01 ? '<$0.01' : `$${c.toFixed(2)}`;

              tokenDisplay = `
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 TOKEN USAGE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Main (${tokenUsage.model}):
    Input:       ${formatNum(tokenUsage.input).padStart(10)} tokens  ${formatCost(mainInputCost)}
    Output:      ${formatNum(tokenUsage.output).padStart(10)} tokens  ${formatCost(mainOutputCost)}
    Cache Read:  ${formatNum(tokenUsage.cacheRead).padStart(10)} tokens  ${formatCost(cacheReadCost)}
    Cache Write: ${formatNum(tokenUsage.cacheWrite).padStart(10)} tokens  ${formatCost(cacheWriteCost)}
${tokenUsage.subagentInput > 0 || tokenUsage.subagentOutput > 0 ? `
  Subagents (${tokenUsage.subagentModel || 'unknown'}):
    Input:       ${formatNum(tokenUsage.subagentInput).padStart(10)} tokens  ${formatCost(subInputCost)}
    Output:      ${formatNum(tokenUsage.subagentOutput).padStart(10)} tokens  ${formatCost(subOutputCost)}
` : ''}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💰 TOTAL COST: ${formatCost(totalCost)}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
            }

            const summary = `

  ✓ Processing Complete

  Duration:     ${elapsed()}
  Bookmarks:    ${totalBookmarks} processed
  Parallel Tasks: ${tasksSpawned > 0 ? tasksSpawned : 'none'}
  Files Created: ${filesWritten.length > 0 ? filesWritten.join(', ') : 'none'}
${tokenDisplay}
`;
            if (logger.isInteractive) {
              process.stdout.write(summary);
            } else {
              logger.log(`[${new Date().toISOString()}] Processing complete: ${totalBookmarks} bookmarks processed in ${elapsed()}`);
            }
          }
        } catch (e) {
          // JSON parse failed - silently ignore (don't print raw JSON)
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    const timeoutId = setTimeout(() => {
      stopSpinner();
      proc.kill('SIGTERM');
      resolve({
        success: false,
        error: `Timeout after ${timeout}ms`,
        stdout,
        stderr,
        exitCode: -1
      });
    }, timeout);

    proc.on('close', (code) => {
      stopSpinner();
      clearTimeout(timeoutId);
      if (code === 0) {
        resolve({ success: true, output: stdout, tokenUsage });
      } else {
        resolve({
          success: false,
          error: `Exit code ${code}`,
          stdout,
          stderr,
          exitCode: code,
          tokenUsage
        });
      }
    });

    proc.on('error', (err) => {
      stopSpinner();
      clearTimeout(timeoutId);
      let errorMessage = err.message;
      
      // Provide helpful error message if claude command not found
      if (err.code === 'ENOENT') {
        errorMessage = `Claude CLI not found. Please install Claude Code:\n\n  Install via npm:\n    npm install -g @anthropic-ai/claude-code\n\n  Or visit: https://github.com/anthropics/claude-code\n\n  After installation, ensure 'claude' is in your PATH.`;
      }
      
      resolve({
        success: false,
        error: errorMessage,
        stdout,
        stderr,
        exitCode: -1
      });
    });
  });
}

// ============================================================================
// Webhook Notifications (Optional)
// ============================================================================

async function sendWebhook(config, payload) {
  if (!config.webhookUrl) return;

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      logger.error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    logger.error(`Webhook error: ${error.message}`);
  }
}

function formatDiscordPayload(title, description, success = true) {
  return {
    embeds: [{
      title,
      description,
      color: success ? 0x00ff00 : 0xff0000,
      timestamp: new Date().toISOString()
    }]
  };
}

function formatSlackPayload(title, description, success = true) {
  return {
    text: title,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${success ? '✅' : '❌'} ${title}` }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: description }
      }
    ]
  };
}

async function notify(config, title, description, success = true) {
  if (!config.webhookUrl) return;

  let payload;
  if (config.webhookType === 'slack') {
    payload = formatSlackPayload(title, description, success);
  } else {
    // Default to Discord format
    payload = formatDiscordPayload(title, description, success);
  }

  await sendWebhook(config, payload);
}

// ============================================================================
// Main Job Runner
// ============================================================================

export async function run(options = {}) {
  const startTime = Date.now();
  const now = new Date().toISOString();
  const config = loadConfig(options.configPath);

  // Setup log rotation for log files
  const logPath = path.join(process.cwd(), 'smaug.log');
  const errorLogPath = path.join(process.cwd(), 'smaug.error.log');
  logger.setupRotation(logPath, 10);
  logger.setupRotation(errorLogPath, 10);

  logger.log(`[${now}] Starting smaug job...`);
  
  // Check if we should do a periodic retry push (every 30 minutes)
  // This ensures processed items eventually make it to the API
  const retryStateFile = path.join(path.dirname(config.stateFile || './.state'), 'api-retry-state.json');
  let retryState = { lastRetry: null };
  try {
    if (fs.existsSync(retryStateFile)) {
      retryState = JSON.parse(fs.readFileSync(retryStateFile, 'utf8'));
    }
  } catch (e) {
    // Ignore errors reading retry state
  }
  
  const nowTime = Date.now();
  const lastRetryTime = retryState.lastRetry || 0;
  const RETRY_INTERVAL = 30 * 60 * 1000; // 30 minutes
  const shouldRetry = (nowTime - lastRetryTime) >= RETRY_INTERVAL;

  // Overlap protection
  if (!acquireLock()) {
    return { success: true, skipped: true };
  }

  try {
    // Check for existing pending bookmarks first
    let pendingData = null;
    let bookmarkCount = 0;

    if (fs.existsSync(config.pendingFile)) {
      try {
        pendingData = JSON.parse(fs.readFileSync(config.pendingFile, 'utf8'));
        bookmarkCount = pendingData.bookmarks?.length || 0;

        // Apply --limit if specified (process subset of pending)
        const limit = options.limit;
        if (limit && limit > 0 && bookmarkCount > limit) {
          logger.log(`[${now}] Limiting to ${limit} of ${bookmarkCount} pending bookmarks`);
          pendingData.bookmarks = pendingData.bookmarks.slice(0, limit);
          bookmarkCount = limit;
          // Write limited subset back (temporarily)
          fs.writeFileSync(config.pendingFile + '.full', JSON.stringify(
            JSON.parse(fs.readFileSync(config.pendingFile, 'utf8')), null, 2
          ));
          pendingData.count = bookmarkCount;
          fs.writeFileSync(config.pendingFile, JSON.stringify(pendingData, null, 2));
        }
      } catch (e) {
        // Invalid pending file, will fetch fresh
      }
    }

    // Phase 1: Fetch new bookmarks (merges with existing pending)
    if (bookmarkCount === 0 || options.forceFetch) {
      logger.log(`[${now}] Phase 1: Fetching and preparing bookmarks...`);
      // Use smaller default count to avoid credential/API limits
      const fetchOptions = {
        ...options,
        count: options.count || 10
      };
      const prepResult = await fetchAndPrepareBookmarks(fetchOptions);

      // Re-read pending file after fetch
      if (fs.existsSync(config.pendingFile)) {
        pendingData = JSON.parse(fs.readFileSync(config.pendingFile, 'utf8'));
        bookmarkCount = pendingData.bookmarks?.length || 0;
      }

      if (prepResult.count > 0) {
        logger.log(`[${now}] Fetched ${prepResult.count} new bookmarks`);
      }
    } else {
      logger.log(`[${now}] Found ${bookmarkCount} pending bookmarks, skipping fetch`);
    }

    if (bookmarkCount === 0) {
      logger.log(`[${now}] No bookmarks to process`);
      return { success: true, count: 0, duration: Date.now() - startTime };
    }

    logger.log(`[${now}] Processing ${bookmarkCount} bookmarks`);

    // Track IDs we're about to process AND capture bookmarks BEFORE Claude runs
    // (Claude Code will clean up the pending file, so we need to capture them now)
    const idsToProcess = pendingData.bookmarks.map(b => b.id);
    const bookmarksToPush = [...pendingData.bookmarks]; // Copy the bookmarks array

    // Phase 2: Claude Code analysis (if enabled)
    if (config.autoInvokeClaude !== false) {
      logger.log(`[${now}] Phase 2: Invoking Claude Code for analysis...`);

      const claudeResult = await invokeClaudeCode(config, bookmarkCount, {
        trackTokens: options.trackTokens
      });

      if (claudeResult.success) {
        logger.log(`[${now}] Analysis complete`);

        // Push to API if enabled (use captured bookmarks since Claude cleaned up pending file)
        let apiResults = {};
        if (config.api?.enabled) {
          try {
            logger.log(`[${now}] Pushing to API...`);
            
            // Push bookmarks (using the ones we captured before Claude ran)
            if (bookmarksToPush.length > 0) {
              const bookmarkPushResult = await pushBookmarksBatch(bookmarksToPush, config);
              apiResults.bookmarks = bookmarkPushResult;
              
              // Log detailed results
              if (bookmarkPushResult.added > 0 || bookmarkPushResult.updated > 0) {
                logger.log(`[${now}] Bookmarks: ${bookmarkPushResult.added || 0} added, ${bookmarkPushResult.updated || 0} updated`);
              } else {
                // Nothing was added/updated - might be duplicates or validation issues
                const errorCount = bookmarkPushResult.errors?.length || 0;
                if (errorCount > 0) {
                  logger.error(`[${now}] Bookmarks: 0 added/updated, ${errorCount} errors`);
                  // Log first few errors for debugging
                  const sampleErrors = bookmarkPushResult.errors.slice(0, 3);
                  for (const err of sampleErrors) {
                    logger.error(`[${now}]   Error: ${err.error || JSON.stringify(err)}`);
                  }
                } else {
                  logger.log(`[${now}] Bookmarks: All ${bookmarksToPush.length} already exist in API (skipped)`);
                }
              }
            } else {
              apiResults.bookmarks = { skipped: true, reason: 'No bookmarks to push' };
              logger.log(`[${now}] No bookmarks to push`);
            }
            
            // Push knowledge entries
            const knowledgePushResult = await pushKnowledgeEntries(config);
            apiResults.knowledge = knowledgePushResult;
            
            logger.log(`[${now}] API push complete`);
          } catch (apiError) {
            logger.error(`[${now}] API push failed: ${apiError.message}`);
            apiResults.error = apiError.message;
            // Don't fail the job if API push fails - it's a post-processing step
          }
        }
        
        // Periodic retry: Every 30 minutes, push recent bookmarks from archive as backup
        // This ensures processed items eventually make it to the API even if initial push failed
        if (config.api?.enabled && shouldRetry) {
          try {
            logger.log(`[${now}] Periodic API retry: Pushing recent bookmarks from archive...`);
            const retryResult = await pushRecentBookmarks(config, 50, false, false);
            
            // Update retry state
            retryState.lastRetry = nowTime;
            try {
              const retryDir = path.dirname(retryStateFile);
              if (!fs.existsSync(retryDir)) {
                fs.mkdirSync(retryDir, { recursive: true });
              }
              fs.writeFileSync(retryStateFile, JSON.stringify(retryState, null, 2));
            } catch (e) {
              // Ignore errors writing retry state
            }
            
            if (retryResult.added > 0 || retryResult.updated > 0) {
              logger.log(`[${now}] Retry successful: ${retryResult.added || 0} added, ${retryResult.updated || 0} updated`);
            } else if (!retryResult.skipped) {
              logger.log(`[${now}] Retry: All bookmarks already in API`);
            }
          } catch (retryError) {
            logger.log(`[${now}] Retry failed (will retry next cycle): ${retryError.message}`);
          }
        }

        // Remove processed IDs from pending file (AFTER API push)
        // If we used --limit, restore from .full file first
        const fullFile = config.pendingFile + '.full';
        let sourceData;
        if (fs.existsSync(fullFile)) {
          sourceData = JSON.parse(fs.readFileSync(fullFile, 'utf8'));
          fs.unlinkSync(fullFile); // Clean up .full file
        } else if (fs.existsSync(config.pendingFile)) {
          sourceData = JSON.parse(fs.readFileSync(config.pendingFile, 'utf8'));
        }

        if (sourceData) {
          const processedIds = new Set(idsToProcess);
          const remaining = sourceData.bookmarks.filter(b => !processedIds.has(b.id));

          fs.writeFileSync(config.pendingFile, JSON.stringify({
            generatedAt: sourceData.generatedAt,
            count: remaining.length,
            bookmarks: remaining
          }, null, 2));

          logger.log(`[${now}] Cleaned up ${idsToProcess.length} processed bookmarks, ${remaining.length} remaining`);
        }

        // Send success notification
        await notify(
          config,
          'Bookmarks Processed',
          `**New:** ${bookmarkCount} bookmarks archived${config.api?.enabled ? `\n**API:** ${apiResults.bookmarks?.added || 0} bookmarks, ${apiResults.knowledge?.created || 0} knowledge entries` : ''}`,
          true
        );

        return {
          success: true,
          count: bookmarkCount,
          duration: Date.now() - startTime,
          output: claudeResult.output,
          api: apiResults
        };

      } else {
        // Claude failed - bookmarks stay in pending for retry
        logger.error(`[${now}] Claude Code failed: ${claudeResult.error}`);

        await notify(
          config,
          'Bookmark Processing Failed',
          `Prepared ${bookmarkCount} bookmarks but analysis failed:\n${claudeResult.error}`,
          false
        );

        return {
          success: false,
          count: bookmarkCount,
          duration: Date.now() - startTime,
          error: claudeResult.error
        };
      }
    } else {
      // Auto-invoke disabled - just fetch
      logger.log(`[${now}] Claude auto-invoke disabled. Run 'smaug process' or /process-bookmarks manually.`);

      return {
        success: true,
        count: bookmarkCount,
        duration: Date.now() - startTime,
        pendingFile: config.pendingFile
      };
    }

  } catch (error) {
    logger.error(`[${now}] Job error: ${error.message}`);

    await notify(
      config,
      'Smaug Job Failed',
      `Error: ${error.message}`,
      false
    );

    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  } finally {
    releaseLock();
  }
}

// ============================================================================
// Bree-compatible export
// ============================================================================

export default {
  name: JOB_NAME,
  interval: '*/30 * * * *', // Every 30 minutes
  timezone: 'America/New_York',
  run
};

// ============================================================================
// Direct execution
// ============================================================================

if (process.argv[1] && process.argv[1].endsWith('job.js')) {
  run().then(result => {
    // Exit silently - the dragon output is enough
    process.exit(result.success ? 0 : 1);
  });
}

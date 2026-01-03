/**
 * Configuration loader for bookmark archiver
 *
 * Supports:
 * - Config file (bookmarks-archiver.config.json)
 * - Environment variables
 * - CLI arguments
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Load environment variables from .env file
 */
function loadEnvFile() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Only set if not already in process.env (env vars take precedence)
        if (!process.env[key]) {
          process.env[key] = value.trim();
        }
      }
    }
  }
}

// Load .env file before processing config
loadEnvFile();

const DEFAULT_CONFIG = {
  // Where to store the markdown archive
  archiveFile: './bookmarks.md',

  // Where to store pending bookmarks (JSON) before processing
  pendingFile: './.state/pending-bookmarks.json',

  // State file for tracking last processed bookmark
  stateFile: './.state/bookmarks-state.json',

  // Timezone for date formatting
  timezone: 'America/New_York',

  // Path to bird CLI (if not in PATH)
  birdPath: null,

  // Twitter credentials (can also use AUTH_TOKEN and CT0 env vars)
  twitter: {
    authToken: null,
    ct0: null
  },

  // ---- Categories: Define how different bookmark types are handled ----
  // Each category has:
  //   - match: URL patterns or keywords to identify this type
  //   - action: 'file' (create separate file), 'capture' (bookmark only), 'transcribe' (flag for transcript)
  //   - folder: where to save files (if action is 'file')
  //   - template: 'tool', 'article', 'podcast', 'video', or custom template name
  categories: {
    github: {
      match: ['github.com'],
      action: 'file',
      folder: './knowledge/tools',
      template: 'tool',
      description: 'GitHub repositories and code'
    },
    article: {
      match: ['medium.com', 'substack.com', 'dev.to', 'blog', 'article'],
      action: 'file',
      folder: './knowledge/articles',
      template: 'article',
      description: 'Blog posts and articles'
    },
    podcast: {
      match: ['podcasts.apple.com', 'spotify.com/episode', 'overcast.fm', 'pocketcasts.com', 'castro.fm', 'podcast'],
      action: 'transcribe',
      folder: './knowledge/podcasts',
      template: 'podcast',
      description: 'Podcast episodes - flagged for transcription'
    },
    youtube: {
      match: ['youtube.com', 'youtu.be'],
      action: 'transcribe',
      folder: './knowledge/videos',
      template: 'video',
      description: 'YouTube videos - flagged for transcription'
    },
    video: {
      match: ['vimeo.com', 'loom.com', 'video'],
      action: 'transcribe',
      folder: './knowledge/videos',
      template: 'video',
      description: 'Other video content - flagged for transcription'
    },
    tweet: {
      match: [],
      action: 'capture',
      folder: null,
      template: null,
      description: 'Plain tweets - captured in bookmarks.md only'
    }
  },

  // Tools to use for different content types
  // allowedTools: the Claude Code tools the processor can use
  allowedTools: 'Read,Write,Edit,Glob,Grep,Bash,Task,TodoWrite',

  // ---- Automation settings (for scheduled jobs) ----

  // Auto-invoke Claude Code after fetching bookmarks
  autoInvokeClaude: true,

  // Claude model to use (sonnet, haiku, opus)
  claudeModel: 'sonnet',

  // Claude invocation timeout in ms (default 15 min)
  claudeTimeout: 900000,

  // Project root for Claude Code invocation
  projectRoot: null,

  // ---- Notifications (optional) ----

  // Webhook URL for notifications (Discord, Slack, or generic)
  webhookUrl: null,

  // Webhook type: 'discord', 'slack', or 'generic'
  webhookType: 'discord',

  // ---- API Integration (optional) ----
  
  // Enable API push after processing
  api: {
    enabled: false,
    baseUrl: null,
    key: null,
    production: {
      baseUrl: null,
      key: null
    }
  },

  // Testing/Development mode flag
  // When true, uses dev API from .env
  // When false, uses production API from config
  testing: false
};

/**
 * Load configuration from file and environment
 */
export function loadConfig(configPath) {
  let fileConfig = {};

  // Try to load config file
  const configLocations = [
    configPath,
    './smaug.config.json',
    path.join(os.homedir(), '.smaug.json'),
    path.join(os.homedir(), '.config/smaug/config.json')
  ].filter(Boolean);

  for (const loc of configLocations) {
    try {
      if (fs.existsSync(loc)) {
        const content = fs.readFileSync(loc, 'utf8');
        fileConfig = JSON.parse(content);
        console.log(`Loaded config from ${loc}`);
        break;
      }
    } catch (e) {
      console.warn(`Failed to load config from ${loc}: ${e.message}`);
    }
  }

  // Merge with defaults
  const config = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    twitter: {
      ...DEFAULT_CONFIG.twitter,
      ...fileConfig.twitter
    },
    // Deep merge categories - user categories override defaults
    categories: {
      ...DEFAULT_CONFIG.categories,
      ...fileConfig.categories
    }
  };

  // Override with environment variables
  if (process.env.ARCHIVE_FILE) {
    config.archiveFile = process.env.ARCHIVE_FILE;
  }
  if (process.env.PENDING_FILE) {
    config.pendingFile = process.env.PENDING_FILE;
  }
  if (process.env.STATE_FILE) {
    config.stateFile = process.env.STATE_FILE;
  }
  if (process.env.TIMEZONE) {
    config.timezone = process.env.TIMEZONE;
  }
  if (process.env.BIRD_PATH) {
    config.birdPath = process.env.BIRD_PATH;
  }
  if (process.env.AUTH_TOKEN) {
    config.twitter.authToken = process.env.AUTH_TOKEN;
  }
  if (process.env.CT0) {
    config.twitter.ct0 = process.env.CT0;
  }

  // Automation env vars
  if (process.env.AUTO_INVOKE_CLAUDE !== undefined) {
    config.autoInvokeClaude = process.env.AUTO_INVOKE_CLAUDE === 'true';
  }
  if (process.env.CLAUDE_MODEL) {
    config.claudeModel = process.env.CLAUDE_MODEL;
  }
  if (process.env.CLAUDE_TIMEOUT) {
    config.claudeTimeout = parseInt(process.env.CLAUDE_TIMEOUT, 10);
  }
  if (process.env.PROJECT_ROOT) {
    config.projectRoot = process.env.PROJECT_ROOT;
  }
  if (process.env.WEBHOOK_URL) {
    config.webhookUrl = process.env.WEBHOOK_URL;
  }
  if (process.env.WEBHOOK_TYPE) {
    config.webhookType = process.env.WEBHOOK_TYPE;
  }

  // Testing flag from config or environment
  if (process.env.TESTING !== undefined) {
    config.testing = process.env.TESTING === 'true';
  }

  // API configuration - choose dev or prod based on testing flag
  const isTesting = config.testing === true;
  
  if (isTesting) {
    // Development/testing mode: use .env variables
    if (process.env.API_BASE_URL) {
      config.api = config.api || {};
      config.api.baseUrl = process.env.API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
      config.api.enabled = true;
    }
    if (process.env.API_KEY) {
      config.api = config.api || {};
      config.api.key = process.env.API_KEY;
      config.api.enabled = true;
    }
  } else {
    // Production mode: use config.json production settings
    if (config.api?.production?.baseUrl && config.api?.production?.key) {
      config.api.baseUrl = config.api.production.baseUrl.replace(/\/$/, '');
      config.api.key = config.api.production.key;
      config.api.enabled = true;
    }
  }

  // Enable API if both URL and key are set (either from dev or prod)
  if (config.api && config.api.baseUrl && config.api.key) {
    config.api.enabled = true;
  }

  return config;
}

/**
 * Create a default config file
 */
export function initConfig(targetPath = './smaug.config.json') {
  const exampleConfig = {
    archiveFile: './bookmarks.md',
    pendingFile: './.state/pending-bookmarks.json',
    stateFile: './.state/bookmarks-state.json',
    timezone: 'America/New_York',
    birdPath: null,
    twitter: {
      authToken: 'YOUR_AUTH_TOKEN_HERE',
      ct0: 'YOUR_CT0_TOKEN_HERE'
    },

    // Categories define how different bookmark types are handled
    // Customize or add your own! See README for details.
    // Defaults: github->tools, articles->articles, youtube/podcast->transcribe
    categories: {
      // Example: Add a custom category for research papers
      // research: {
      //   match: ['arxiv.org', 'papers.', 'research'],
      //   action: 'file',
      //   folder: './knowledge/research',
      //   template: 'article',
      //   description: 'Academic papers and research'
      // }
    },

    // Automation (for scheduled jobs)
    autoInvokeClaude: true,
    claudeModel: 'sonnet',
    claudeTimeout: 900000,

    // Notifications (optional)
    webhookUrl: null,
    webhookType: 'discord'
  };

  fs.writeFileSync(targetPath, JSON.stringify(exampleConfig, null, 2) + '\n');
  console.log(`Created config file at ${targetPath}`);
  console.log('Edit this file to add your Twitter credentials.');
  return targetPath;
}

/**
 * API Client for Bookmarks & Knowledge API
 *
 * Handles pushing finalized bookmarks and knowledge entries to the remote API.
 * Bookmarks are upserted by tweet ID to prevent duplicates.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { loadConfig } from './config.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Push a single bookmark to the API
 *
 * @param {Object} bookmark - Bookmark object from processor
 * @param {Object} config - Configuration object with api settings
 * @returns {Promise<Object>} API response
 */
export async function pushBookmark(bookmark, config) {
  if (!config.api?.baseUrl || !config.api?.key) {
    throw new Error('API configuration missing. Set API_BASE_URL and API_KEY.');
  }

  const url = `${config.api.baseUrl}/api/v1/bookmarks`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.api.key}`,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(bookmark),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('API error')) {
      throw error;
    }
    throw new Error(`Failed to push bookmark ${bookmark.id}: ${error.message}`);
  }
}

/**
 * Push multiple bookmarks in batch
 *
 * @param {Array<Object>} bookmarks - Array of bookmark objects
 * @param {Object} config - Configuration object with api settings
 * @returns {Promise<Object>} API response with added/updated counts
 */
export async function pushBookmarksBatch(bookmarks, config) {
  if (!config.api?.baseUrl || !config.api?.key) {
    throw new Error('API configuration missing. Set API_BASE_URL and API_KEY.');
  }

  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    return { success: true, added: 0, updated: 0, errors: [] };
  }

  const url = `${config.api.baseUrl}/api/v1/bookmarks`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.api.key}`,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(bookmarks),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('API error')) {
      throw error;
    }
    throw new Error(`Failed to push bookmarks batch: ${error.message}`);
  }
}

/**
 * Create a knowledge entry in the API
 *
 * @param {Object} knowledgeEntry - Knowledge entry object
 * @param {Object} config - Configuration object with api settings
 * @returns {Promise<Object>} API response
 */
export async function createKnowledgeEntry(knowledgeEntry, config) {
  if (!config.api?.baseUrl || !config.api?.key) {
    throw new Error('API configuration missing. Set API_BASE_URL and API_KEY.');
  }

  const url = `${config.api.baseUrl}/api/v1/knowledge/entries`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.api.key}`,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(knowledgeEntry),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('API error')) {
      throw error;
    }
    throw new Error(`Failed to create knowledge entry: ${error.message}`);
  }
}

/**
 * Create multiple knowledge entries in bulk
 *
 * @param {Array<Object>} entries - Array of knowledge entry objects
 * @param {Object} config - Configuration object with api settings
 * @returns {Promise<Object>} API response with created/failed counts
 */
export async function createKnowledgeEntriesBulk(entries, config) {
  if (!config.api?.baseUrl || !config.api?.key) {
    throw new Error('API configuration missing. Set API_BASE_URL and API_KEY.');
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return { success: true, created: 0, failed: 0, entries: [], errors: [] };
  }

  const url = `${config.api.baseUrl}/api/v1/knowledge/entries/bulk`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.api.key}`,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ entries }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('API error')) {
      throw error;
    }
    throw new Error(`Failed to create knowledge entries bulk: ${error.message}`);
  }
}

/**
 * Extract knowledge entries from markdown files in knowledge directory
 *
 * @param {Object} config - Configuration object
 * @returns {Array<Object>} Array of knowledge entry objects ready for API
 */
export function extractKnowledgeEntriesFromFiles(config) {
  const knowledgeDir = path.resolve('./knowledge');
  const entries = [];

  if (!fs.existsSync(knowledgeDir)) {
    return entries;
  }

  const categories = ['tools', 'articles', 'podcasts', 'videos'];

  for (const category of categories) {
    const categoryDir = path.join(knowledgeDir, category);
    if (!fs.existsSync(categoryDir)) {
      continue;
    }

    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(categoryDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      try {
        const entry = parseKnowledgeFile(content, filePath, category);
        if (entry) {
          entries.push(entry);
        }
      } catch (error) {
        console.warn(`Failed to parse ${filePath}: ${error.message}`);
      }
    }
  }

  return entries;
}

/**
 * Parse a knowledge markdown file into API-ready format
 *
 * @param {string} markdownContent - Full markdown file content
 * @param {string} filePath - Path to the file
 * @param {string} category - Category name (tools, articles, etc.)
 * @returns {Object|null} Knowledge entry object or null if parsing fails
 */
function parseKnowledgeFile(markdownContent, filePath, category) {
  // Extract frontmatter (between --- delimiters)
  const frontmatterMatch = markdownContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatterYaml = frontmatterMatch[1];
  const contentMarkdown = frontmatterMatch[2];

  // Simple YAML parsing (basic key: value)
  const frontmatter = {};
  for (const line of frontmatterYaml.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      // Handle arrays (tags: [item1, item2])
      if (value.startsWith('[') && value.endsWith(']')) {
        frontmatter[key] = value
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''));
      } else {
        frontmatter[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  }

  // Parse markdown content sections
  const content = parseMarkdownContent(contentMarkdown, frontmatter.type);

  // Extract slug from filename
  const slug = path.basename(filePath, '.md');

  // Build entry object, only including non-null optional fields
  const entry = {
    title: frontmatter.title,
    type: frontmatter.type,
    category: category,
    date_added: frontmatter.date_added,
    source: frontmatter.source,
    tags: frontmatter.tags || [],
    via: frontmatter.via,
    description: content.description,
    links: content.links,
  };

  // Add optional fields only if they have values (omit null/undefined/empty)
  if (content.keyFeatures && Array.isArray(content.keyFeatures) && content.keyFeatures.length > 0) {
    entry.keyFeatures = content.keyFeatures;
  }
  if (content.keyTakeaways && Array.isArray(content.keyTakeaways) && content.keyTakeaways.length > 0) {
    entry.keyTakeaways = content.keyTakeaways;
  }
  if (content.context && content.context.trim()) {
    entry.context = content.context;
  }
  if (frontmatter.author && frontmatter.author.trim()) {
    entry.author = frontmatter.author;
  }
  if (frontmatter.show && frontmatter.show.trim()) {
    entry.show = frontmatter.show;
  }
  if (frontmatter.channel && frontmatter.channel.trim()) {
    entry.channel = frontmatter.channel;
  }
  if (frontmatter.status && frontmatter.status.trim()) {
    entry.status = frontmatter.status;
  }
  if (content.episodeInfo && typeof content.episodeInfo === 'object') {
    entry.episodeInfo = content.episodeInfo;
  }
  if (content.videoInfo && typeof content.videoInfo === 'object') {
    entry.videoInfo = content.videoInfo;
  }

  return entry;
}

/**
 * Parse markdown content sections
 *
 * @param {string} markdown - Markdown content
 * @param {string} type - Entry type (tool, article, podcast, video)
 * @returns {Object} Parsed content object
 */
function parseMarkdownContent(markdown, type) {
  const content = {
    description: '',
    links: [],
    keyFeatures: null,
    keyTakeaways: null,
    context: null,
    episodeInfo: null,
    videoInfo: null,
  };

  // Extract description (first paragraph before any ## headers)
  const descriptionMatch = markdown.match(/^([^#]+?)(?=\n##|$)/s);
  if (descriptionMatch) {
    content.description = descriptionMatch[1].trim();
  }

  // Extract Key Features (for tools)
  if (type === 'tool') {
    const featuresMatch = markdown.match(/## Key Features\n([\s\S]*?)(?=\n##|$)/);
    if (featuresMatch) {
      content.keyFeatures = featuresMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(Boolean);
    }
  }

  // Extract Key Takeaways (for articles/podcasts/videos)
  if (['article', 'podcast', 'video'].includes(type)) {
    const takeawaysMatch = markdown.match(/## Key Takeaways\n([\s\S]*?)(?=\n##|$)/);
    if (takeawaysMatch) {
      content.keyTakeaways = takeawaysMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(Boolean);
    }
  }

  // Extract Context section
  const contextMatch = markdown.match(/## Context\n([\s\S]*?)(?=\n##|$)/);
  if (contextMatch) {
    content.context = contextMatch[1].trim();
  }

  // Extract Episode Info (for podcasts)
  if (type === 'podcast') {
    const episodeMatch = markdown.match(/## Episode Info\n([\s\S]*?)(?=\n##|$)/);
    if (episodeMatch) {
      const episodeText = episodeMatch[1];
      const showMatch = episodeText.match(/\*\*Show:\*\*\s*(.+)/);
      const episodeMatch = episodeText.match(/\*\*Episode:\*\*\s*(.+)/);
      const whyMatch = episodeText.match(/\*\*Why bookmarked:\*\*\s*(.+)/);
      if (showMatch || episodeMatch || whyMatch) {
        content.episodeInfo = {
          show: showMatch?.[1]?.trim() || '',
          episode: episodeMatch?.[1]?.trim() || '',
          whyBookmarked: whyMatch?.[1]?.trim() || '',
        };
      }
    }
  }

  // Extract Video Info (for videos)
  if (type === 'video') {
    const videoMatch = markdown.match(/## Video Info\n([\s\S]*?)(?=\n##|$)/);
    if (videoMatch) {
      const videoText = videoMatch[1];
      const channelMatch = videoText.match(/\*\*Channel:\*\*\s*(.+)/);
      const titleMatch = videoText.match(/\*\*Title:\*\*\s*(.+)/);
      const whyMatch = videoText.match(/\*\*Why bookmarked:\*\*\s*(.+)/);
      if (channelMatch || titleMatch || whyMatch) {
        content.videoInfo = {
          channel: channelMatch?.[1]?.trim() || '',
          title: titleMatch?.[1]?.trim() || '',
          whyBookmarked: whyMatch?.[1]?.trim() || '',
        };
      }
    }
  }

  // Extract Links section
  const linksMatch = markdown.match(/## Links\n([\s\S]*?)(?=\n##|$)/);
  if (linksMatch) {
    const linksText = linksMatch[1];
    const linkRegex = /- \[([^\]]+)\]\(([^)]+)\)/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(linksText)) !== null) {
      content.links.push({
        label: linkMatch[1],
        url: linkMatch[2],
      });
    }
  }

  return content;
}

/**
 * Fetch tweet details from Twitter using bird CLI
 *
 * @param {Object} config - Configuration object
 * @param {string} tweetId - Tweet ID
 * @returns {Object|null} Tweet object or null if fetch fails
 */
function fetchTweet(config, tweetId) {
  const birdCmd = config.birdPath || 'bird';
  const tmpFile = path.join(os.tmpdir(), `smaug-tweet-${tweetId}-${Date.now()}.json`);
  
  try {
    let cmd;
    const birdArgs = ['read', tweetId, '--json'];
    
    if (config.twitter?.useBrowserCookies !== false) {
      // Use browser cookie extraction (same approach as fetchBookmarks)
      if (config.twitter?.chromeProfile) {
        birdArgs.push('--chrome-profile', config.twitter.chromeProfile);
      }
      // If no chromeProfile specified, bird CLI will try to auto-detect from available browsers
      cmd = `${birdCmd} ${birdArgs.join(' ')} > "${tmpFile}" 2>&1`;
    } else {
      // Use manual credentials
      const envVars = [];
      if (config.twitter?.authToken) {
        envVars.push(`AUTH_TOKEN='${config.twitter.authToken}'`);
      }
      if (config.twitter?.ct0) {
        envVars.push(`CT0='${config.twitter.ct0}'`);
      }
      cmd = `${envVars.join(' ')} ${birdCmd} ${birdArgs.join(' ')} > "${tmpFile}" 2>&1`;
    }

    execSync(cmd, {
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 1024 * 1024,
      shell: '/bin/bash',
      env: process.env
    });
    
    // Read the file
    let output = fs.readFileSync(tmpFile, 'utf8');
    
    // Clean up temp file
    try {
      fs.unlinkSync(tmpFile);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    // Find the start of JSON object (skip any warnings)
    const jsonStart = output.indexOf('{');
    if (jsonStart === -1) {
      throw new Error(`No valid JSON object found in bird output for tweet ${tweetId}`);
    }
    
    // Extract JSON portion
    const jsonOutput = output.slice(jsonStart).trim();
    
    // Parse JSON
    const tweet = JSON.parse(jsonOutput);
    return tweet;
  } catch (error) {
    // Clean up temp file on error
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    console.warn(`  Could not fetch tweet ${tweetId}: ${error.message}`);
    return null;
  }
}

/**
 * Extract bookmarks from bookmarks.md file
 *
 * @param {Object} config - Configuration object
 * @returns {Promise<Array<Object>>} Array of bookmark objects
 */
export async function extractBookmarksFromArchive(config) {
  const archiveFile = config.archiveFile || './bookmarks.md';
  if (!fs.existsSync(archiveFile)) {
    return [];
  }

  const content = fs.readFileSync(archiveFile, 'utf8');
  const bookmarks = [];

  // Split by date sections, then by bookmark entries
  const sections = content.split(/^# [A-Za-z]+day, .+$/m);
  
  for (const section of sections) {
    // Find all bookmark entries (## @author - title)
    const bookmarkMatches = section.matchAll(/^## @(\w+) - (.+)$/gm);
    
    for (const match of bookmarkMatches) {
      const [, author, title] = match;
      const entryStart = match.index;
      const nextMatch = section.indexOf('\n## @', entryStart + 1);
      const entryEnd = nextMatch === -1 ? section.length : nextMatch;
      const entryText = section.slice(entryStart, entryEnd);

      try {
        const bookmark = await parseBookmarkFromMarkdown(entryText, author, config);
        if (bookmark) {
          bookmarks.push(bookmark);
        }
      } catch (error) {
        console.warn(`Failed to parse bookmark @${author}: ${error.message}`);
      }
    }
  }

  return bookmarks;
}

/**
 * Parse a bookmark entry from markdown format
 *
 * @param {string} markdown - Markdown entry text
 * @param {string} author - Twitter username
 * @param {Object} config - Configuration object
 * @returns {Promise<Object|null>} Bookmark object or null
 */
async function parseBookmarkFromMarkdown(markdown, author, config) {
  // Extract tweet URL
  const tweetUrlMatch = markdown.match(/- \*\*Tweet:\*\* (.+)/);
  if (!tweetUrlMatch) {
    return null;
  }
  const tweetUrl = tweetUrlMatch[1].trim();
  
  // Extract tweet ID from URL
  const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
  if (!tweetIdMatch) {
    return null;
  }
  const id = tweetIdMatch[1];

  // Fetch actual tweet details from Twitter to get createdAt timestamp
  const tweetData = fetchTweet(config, id);
  let createdAt = null;
  let date = 'Unknown date';
  
  if (tweetData && tweetData.createdAt) {
    createdAt = tweetData.createdAt; // Twitter's createdAt format (e.g., "Fri Jan 02 09:40:00 +0000 2026")
    // Parse and format the date using the configured timezone
    date = dayjs(createdAt).tz(config.timezone || 'America/Los_Angeles').format('dddd, MMMM D, YYYY');
  } else {
    // Fallback: if we can't fetch, use a placeholder (but this shouldn't happen)
    console.warn(`  Warning: Could not fetch createdAt for tweet ${id}, using placeholder`);
    createdAt = new Date().toUTCString();
    date = dayjs().tz(config.timezone || 'America/Los_Angeles').format('dddd, MMMM D, YYYY');
  }

  // Extract tweet text (content in > quote blocks)
  const textMatches = markdown.matchAll(/^> (.+)$/gm);
  const textLines = [];
  for (const match of textMatches) {
    const line = match[1].trim();
    // Skip if it's a reply/quote indicator
    if (!line.startsWith('*Replying to') && !line.startsWith('*Quoting')) {
      textLines.push(line);
    }
  }
  const text = textLines.join('\n\n').replace(/&amp;/g, '&');

  // Extract links
  const links = [];
  const linkMatch = markdown.match(/- \*\*Link:\*\* (.+)/);
  if (linkMatch) {
    links.push({
      original: linkMatch[1],
      expanded: linkMatch[1],
      type: 'unknown',
      content: {}
    });
  }

  // Extract parent tweet (for replies)
  const parentMatch = markdown.match(/- \*\*Parent:\*\* (.+)/);
  const isReply = !!parentMatch;
  let replyContext = null;
  if (parentMatch) {
    const parentUrl = parentMatch[1].trim();
    const parentIdMatch = parentUrl.match(/\/status\/(\d+)/);
    replyContext = {
      id: parentIdMatch ? parentIdMatch[1] : '',
      author: '',
      authorName: '',
      text: '',
      tweetUrl: parentUrl
    };
  }

  // Extract quoted tweet (for quotes)
  const quotedMatch = markdown.match(/- \*\*Quoted:\*\* (.+)/);
  const isQuote = !!quotedMatch;
  let quoteContext = null;
  if (quotedMatch) {
    const quotedUrl = quotedMatch[1].trim();
    const quotedIdMatch = quotedUrl.match(/\/status\/(\d+)/);
    quoteContext = {
      id: quotedIdMatch ? quotedIdMatch[1] : '',
      author: '',
      authorName: '',
      text: '',
      tweetUrl: quotedUrl,
      source: 'quote-tweet'
    };
  }

  // For bookmarkedAt, we'll use the state file's last_check or current time
  // Since we don't have this info in markdown, we'll use a reasonable fallback
  const bookmarkedAt = dayjs().toISOString();  // When it was bookmarked locally

  return {
    id,
    author,
    authorName: author, // We don't have display name in markdown
    text,
    tweetUrl,
    createdAt,  // Actual tweet creation time from Twitter
    bookmarkedAt,  // When it was bookmarked locally
    date,  // Formatted date string
    links,
    isReply,
    replyContext,
    isQuote,
    quoteContext
  };
}

/**
 * Push all processed bookmarks to the API
 *
 * @param {Object} config - Configuration object
 * @param {boolean} fromArchive - If true, push from bookmarks.md instead of pending file
 * @returns {Promise<Object>} Summary of push results
 */
export async function pushProcessedBookmarks(config, fromArchive = false) {
  if (!config.api?.enabled) {
    console.log('[API] API push disabled, skipping...');
    return { skipped: true };
  }

  let bookmarks = [];

  if (fromArchive) {
    // Extract from bookmarks.md
    const archiveFile = config.archiveFile || './bookmarks.md';
    if (!fs.existsSync(archiveFile)) {
      console.log('[API] No bookmarks.md found, nothing to push');
      return { skipped: true, reason: 'No archive file' };
    }

    bookmarks = await extractBookmarksFromArchive(config);
    if (bookmarks.length === 0) {
      console.log('[API] No bookmarks found in archive');
      return { skipped: true, reason: 'No bookmarks in archive' };
    }
  } else {
    // Read from pending file
    const pendingFile = config.pendingFile || './.state/pending-bookmarks.json';
    if (!fs.existsSync(pendingFile)) {
      console.log('[API] No pending bookmarks found');
      return { skipped: true, reason: 'No pending file' };
    }

    try {
      const pendingData = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
      bookmarks = pendingData.bookmarks || [];
    } catch (error) {
      console.error(`[API] Failed to read pending file: ${error.message}`);
      return { skipped: true, reason: 'Failed to read pending file' };
    }
  }

  if (bookmarks.length === 0) {
    console.log('[API] No bookmarks to push');
    return { skipped: true, reason: 'No bookmarks to push' };
  }

  try {
    console.log(`[API] Pushing ${bookmarks.length} bookmarks...`);
    const result = await pushBookmarksBatch(bookmarks, config);

    console.log(`[API] Push complete: ${result.added || 0} added, ${result.updated || 0} updated`);
    if (result.errors && result.errors.length > 0) {
      // Filter out duplicate key errors (expected when bookmarks already exist)
      const nonDuplicateErrors = result.errors.filter(err => 
        !err.error?.includes('duplicate key value violates unique constraint')
      );
      
      if (nonDuplicateErrors.length > 0) {
        console.warn(`[API] ${nonDuplicateErrors.length} errors occurred:`);
        nonDuplicateErrors.forEach(err => console.warn(`[API] Error:`, err));
      } else {
        // All errors were duplicates - this is expected, just log summary
        const duplicateCount = result.errors.length;
        if (duplicateCount > 0) {
          console.log(`[API] ${duplicateCount} bookmarks already exist in API (skipped)`);
        }
      }
    }

    return result;
  } catch (error) {
    console.error(`[API] Failed to push bookmarks: ${error.message}`);
    throw error;
  }
}

/**
 * Push all knowledge entries to the API
 *
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Summary of push results
 */
export async function pushKnowledgeEntries(config) {
  if (!config.api?.enabled) {
    console.log('[API] API push disabled, skipping...');
    return { skipped: true };
  }

  try {
    const entries = extractKnowledgeEntriesFromFiles(config);

    if (entries.length === 0) {
      console.log('[API] No knowledge entries found to push');
      return { skipped: true, reason: 'No knowledge files' };
    }

    console.log(`[API] Pushing ${entries.length} knowledge entries...`);
    const result = await createKnowledgeEntriesBulk(entries, config);

    console.log(`[API] Push complete: ${result.created || 0} created, ${result.failed || 0} failed`);
    if (result.errors && result.errors.length > 0) {
      // Filter out duplicate key errors (expected when entries already exist)
      const nonDuplicateErrors = result.errors.filter(err => 
        !err.error?.includes('duplicate key value violates unique constraint')
      );
      
      if (nonDuplicateErrors.length > 0) {
        console.warn(`[API] ${nonDuplicateErrors.length} errors occurred:`);
        nonDuplicateErrors.forEach(err => console.warn(`[API] Error:`, err));
      } else {
        // All errors were duplicates - this is expected, just log summary
        const duplicateCount = result.errors.length;
        if (duplicateCount > 0) {
          console.log(`[API] ${duplicateCount} entries already exist in API (skipped)`);
        }
      }
    }

    return result;
  } catch (error) {
    console.error(`[API] Failed to push knowledge entries: ${error.message}`);
    throw error;
  }
}

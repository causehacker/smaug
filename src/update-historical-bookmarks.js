/**
 * Update historical bookmarks with bookmarkedAt field
 * 
 * This script reads all bookmarks from bookmarks.md and adds the bookmarkedAt
 * field. Since we don't have exact bookmark times for historical entries,
 * we'll use the archive file's modification time or state file timestamps.
 */

import fs from 'fs';
import path from 'path';
import { extractBookmarksFromArchive, pushBookmarksBatch } from './api-client.js';
import { loadConfig } from './config.js';

const config = loadConfig();

// Get archive file modification time as fallback
const archiveStats = fs.statSync(config.archiveFile || './bookmarks.md');
const archiveModifiedTime = archiveStats.mtime.toISOString();

// Get state file timestamps
let stateTimestamps = {};
try {
  if (fs.existsSync(config.stateFile)) {
    const stateData = JSON.parse(fs.readFileSync(config.stateFile, 'utf8'));
    stateTimestamps.lastCheck = stateData.last_check;
    stateTimestamps.lastProcessing = stateData.last_processing_run;
  }
} catch (e) {
  console.warn('Could not read state file:', e.message);
}

console.log('Updating historical bookmarks with bookmarkedAt field...\n');

// Extract bookmarks from archive
const bookmarks = extractBookmarksFromArchive(config);

if (bookmarks.length === 0) {
  console.log('No bookmarks found in archive.');
  process.exit(0);
}

console.log(`Found ${bookmarks.length} bookmarks to update\n`);

// Update each bookmark with bookmarkedAt
// For historical bookmarks, we'll use the archive modification time
// or state file timestamp as a reasonable approximation
const updatedBookmarks = bookmarks.map((bookmark, index) => {
  // Use state timestamp if available, otherwise use archive modification time
  const bookmarkedAt = stateTimestamps.lastCheck || 
                       stateTimestamps.lastProcessing || 
                       archiveModifiedTime;
  
  return {
    ...bookmark,
    bookmarkedAt: bookmarkedAt
  };
});

console.log(`Updated ${updatedBookmarks.length} bookmarks with bookmarkedAt\n`);

// Show sample
if (updatedBookmarks.length > 0) {
  console.log('Sample updated bookmark:');
  console.log(JSON.stringify({
    id: updatedBookmarks[0].id,
    author: updatedBookmarks[0].author,
    createdAt: updatedBookmarks[0].createdAt,
    bookmarkedAt: updatedBookmarks[0].bookmarkedAt,
    date: updatedBookmarks[0].date
  }, null, 2));
  console.log('\n');
}

// Push to API
if (config.api?.enabled) {
  console.log('Pushing updated bookmarks to API...\n');
  try {
    const result = await pushBookmarksBatch(updatedBookmarks, config);
    console.log(`✅ Push complete: ${result.added || 0} added, ${result.updated || 0} updated`);
    
    if (result.errors && result.errors.length > 0) {
      const nonDuplicateErrors = result.errors.filter(err => 
        !err.error?.includes('duplicate key value violates unique constraint')
      );
      
      if (nonDuplicateErrors.length > 0) {
        console.warn(`⚠️  ${nonDuplicateErrors.length} errors occurred:`);
        nonDuplicateErrors.forEach(err => console.warn('  Error:', err));
      } else {
        const duplicateCount = result.errors.length;
        if (duplicateCount > 0) {
          console.log(`ℹ️  ${duplicateCount} bookmarks already exist (updated)`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Failed to push: ${error.message}`);
    process.exit(1);
  }
} else {
  console.log('API push disabled. Enable API in config to push updates.');
  console.log('\nUpdated bookmarks (first 3):');
  updatedBookmarks.slice(0, 3).forEach(b => {
    console.log(`  ${b.id}: bookmarkedAt = ${b.bookmarkedAt}`);
  });
}

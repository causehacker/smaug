# API Bookmark Object Update - bookmarkedAt Field

## Overview

The bookmark object schema has been updated to include a new `bookmarkedAt` field that tracks when the bookmark was registered locally (when it was fetched/bookmarked), separate from when the tweet was originally posted.

## Schema Changes

### New Field Added

```typescript
interface Bookmark {
  // ... existing fields ...
  
  /**
   * When the tweet was originally posted on Twitter/X
   * Format: Twitter's standard date format
   * Example: "Fri Jan 02 05:59:29 +0000 2026"
   * 
   * This is the original timestamp from Twitter's API.
   * Preserves the exact time the tweet was created.
   */
  createdAt: string,  // "Fri Jan 02 05:59:29 +0000 2026"
  
  /**
   * When this bookmark was registered/fetched locally
   * Format: ISO 8601 datetime string
   * Example: "2026-01-03T21:52:28.618Z"
   * 
   * This tracks when Smaug fetched and processed the bookmark.
   * Useful for:
   * - Understanding bookmark discovery timeline
   * - Filtering recently bookmarked items
   * - Analytics on bookmarking patterns
   */
  bookmarkedAt: string,  // "2026-01-03T21:52:28.618Z" (ISO 8601)
  
  // ... other fields ...
}
```

## Updated Bookmark Object Example

```json
{
  "id": "2007239758158975130",
  "author": "rakyll",
  "authorName": "rakyll",
  "text": "I'm not joking and this isn't funny...",
  "tweetUrl": "https://x.com/rakyll/status/2007239758158975130",
  "createdAt": "Sat Jan 03 12:30:45 +0000 2026",
  "bookmarkedAt": "2026-01-03T21:52:28.618Z",
  "date": "Saturday, January 3, 2026",
  "links": [],
  "isReply": false,
  "replyContext": null,
  "isQuote": false,
  "quoteContext": null
}
```

## Field Comparison

| Field | Purpose | Format | Example |
|-------|---------|--------|---------|
| `createdAt` | When tweet was posted | Twitter format | `"Fri Jan 02 05:59:29 +0000 2026"` |
| `bookmarkedAt` | When bookmark was registered | ISO 8601 | `"2026-01-03T21:52:28.618Z"` |
| `date` | Human-readable tweet date | Formatted string | `"Friday, January 2, 2026"` |

## Use Cases

### 1. Time Gap Analysis
```javascript
// Find tweets that were bookmarked long after posting
const tweetDate = new Date(bookmark.createdAt);
const bookmarkedDate = new Date(bookmark.bookmarkedAt);
const daysLater = (bookmarkedDate - tweetDate) / (1000 * 60 * 60 * 24);
```

### 2. Recent Bookmarks Filter
```javascript
// Get bookmarks added in the last 24 hours
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
const recent = bookmarks.filter(b => 
  new Date(b.bookmarkedAt) > oneDayAgo
);
```

### 3. Bookmark Discovery Timeline
```javascript
// Sort by when bookmarked, not when tweeted
bookmarks.sort((a, b) => 
  new Date(b.bookmarkedAt) - new Date(a.bookmarkedAt)
);
```

## API Endpoint Updates

### POST /api/v1/bookmarks

**Request Body:**
```json
{
  "id": "2007239758158975130",
  "author": "rakyll",
  "authorName": "rakyll",
  "text": "...",
  "tweetUrl": "https://x.com/rakyll/status/2007239758158975130",
  "createdAt": "Sat Jan 03 12:30:45 +0000 2026",
  "bookmarkedAt": "2026-01-03T21:52:28.618Z",  // NEW FIELD
  "date": "Saturday, January 3, 2026",
  "links": [],
  "isReply": false,
  "replyContext": null,
  "isQuote": false,
  "quoteContext": null
}
```

**Field Requirements:**
- `createdAt`: ✅ Required (Twitter timestamp format)
- `bookmarkedAt`: ✅ Required (ISO 8601 format)
- `date`: ✅ Required (Human-readable format)

## Database Schema Update

If using a database, add the new column:

```sql
ALTER TABLE bookmarks 
ADD COLUMN bookmarked_at TIMESTAMP WITH TIME ZONE;

-- Index for efficient queries
CREATE INDEX idx_bookmarks_bookmarked_at ON bookmarks(bookmarked_at);
```

## Migration Notes

### For Existing Records

If you have existing bookmarks without `bookmarkedAt`:

1. **Option 1: Use createdAt as fallback**
   ```javascript
   const bookmarkedAt = bookmark.bookmarkedAt || bookmark.createdAt;
   ```

2. **Option 2: Set to current time**
   ```javascript
   const bookmarkedAt = bookmark.bookmarkedAt || new Date().toISOString();
   ```

3. **Option 3: Use pending file timestamp**
   ```javascript
   // If available, use the generatedAt from pending file
   const bookmarkedAt = bookmark.bookmarkedAt || pendingFile.generatedAt;
   ```

## Validation

### bookmarkedAt Format Validation

```javascript
// Valid ISO 8601 format
const isValid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(bookmarkedAt);

// Parse and validate
const date = new Date(bookmarkedAt);
const isValid = !isNaN(date.getTime());
```

## Example Queries

### Find Recently Bookmarked Items
```sql
SELECT * FROM bookmarks 
WHERE bookmarked_at > NOW() - INTERVAL '7 days'
ORDER BY bookmarked_at DESC;
```

### Find Old Tweets Recently Bookmarked
```sql
SELECT * FROM bookmarks
WHERE created_at < NOW() - INTERVAL '30 days'
  AND bookmarked_at > NOW() - INTERVAL '1 day'
ORDER BY bookmarked_at DESC;
```

## Summary

- **New Field**: `bookmarkedAt` (ISO 8601 format)
- **Purpose**: Track when bookmark was registered locally
- **Required**: Yes (all new bookmarks will include this)
- **Format**: ISO 8601 datetime string (e.g., `"2026-01-03T21:52:28.618Z"`)
- **Backward Compatibility**: Existing records may need migration

This change allows you to distinguish between:
- **When a tweet was posted** (`createdAt`)
- **When you discovered/bookmarked it** (`bookmarkedAt`)

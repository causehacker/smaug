# API Update Overview - bookmarkedAt Field

## Quick Summary

The bookmark object now includes a new `bookmarkedAt` field to track when bookmarks are registered locally, separate from when tweets were originally posted.

## Updated Bookmark Schema

```typescript
interface Bookmark {
  id: string;                    // Tweet ID (upsert key)
  author: string;                // Twitter username
  authorName: string;            // Display name
  text: string;                  // Tweet content
  tweetUrl: string;              // Full tweet URL
  createdAt: string;             // When tweet was posted (Twitter format)
  bookmarkedAt: string;          // When bookmark was registered locally (ISO 8601) ⭐ NEW
  date: string;                  // Human-readable date
  links: LinkObject[];
  isReply: boolean;
  replyContext: ReplyContext | null;
  isQuote: boolean;
  quoteContext: QuoteContext | null;
}
```

## Field Details

### createdAt
- **Purpose**: When the tweet was originally posted on Twitter/X
- **Format**: Twitter's date format
- **Example**: `"Fri Jan 02 05:59:29 +0000 2026"`
- **Source**: From Twitter API via bird CLI

### bookmarkedAt ⭐ NEW
- **Purpose**: When this bookmark was fetched/registered locally
- **Format**: ISO 8601 datetime string
- **Example**: `"2026-01-03T21:52:28.618Z"`
- **Source**: Generated when Smaug fetches the bookmark

### date
- **Purpose**: Human-readable formatted date (timezone-aware)
- **Format**: `"Friday, January 2, 2026"`
- **Source**: Derived from `createdAt` with timezone conversion

## Example Bookmark Object

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

## API Endpoint: POST /api/v1/bookmarks

### Request Body
- **Format**: Single object or array of bookmark objects
- **Upsert Key**: `id` (tweet ID)
- **Required Fields**: All fields including `bookmarkedAt`

### Response
```json
{
  "success": true,
  "action": "created" | "updated",
  "bookmark": { /* bookmark object */ }
}
```

Or for batch:
```json
{
  "success": true,
  "added": 5,
  "updated": 15,
  "errors": []
}
```

## Database Schema Update

Add the new column to your bookmarks table:

```sql
ALTER TABLE bookmarks 
ADD COLUMN bookmarked_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_bookmarks_bookmarked_at ON bookmarks(bookmarked_at);
```

## Use Cases

1. **Recent Bookmarks**: Filter by `bookmarkedAt` to find items bookmarked in last 24 hours
2. **Discovery Timeline**: Sort by `bookmarkedAt` to see bookmarking patterns
3. **Time Gap Analysis**: Compare `createdAt` vs `bookmarkedAt` to find old tweets recently discovered

## Migration

For existing records without `bookmarkedAt`:
- Option 1: Use `createdAt` as fallback
- Option 2: Set to current timestamp
- Option 3: Use pending file's `generatedAt` if available

## Validation

- `bookmarkedAt` must be valid ISO 8601 format
- Should be parseable by `new Date(bookmarkedAt)`
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`

## Key Points

✅ `createdAt` = When tweet was posted (Twitter time)  
✅ `bookmarkedAt` = When bookmark was registered (Local time)  
✅ `date` = Human-readable formatted date  
✅ All three fields are required in new bookmarks  
✅ `bookmarkedAt` uses ISO 8601 for easy parsing and querying

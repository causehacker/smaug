# Bookmark Object - Date Fields Specification

## Date Fields in Bookmark Object

```typescript
interface Bookmark {
  // ═══════════════════════════════════════════════════════════
  // DATE FIELDS (Primary Focus)
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Original timestamp from Twitter/X API
   * Format: Twitter's standard date format
   * Example: "Fri Jan 02 05:59:29 +0000 2026"
   * 
   * This is the raw date string as returned by the bird CLI
   * from Twitter's API. It includes:
   * - Day of week abbreviation (Fri)
   * - Month abbreviation (Jan)
   * - Day of month (02)
   * - Time in HH:MM:SS format (05:59:29)
   * - Timezone offset (+0000 for UTC)
   * - Year (2026)
   * 
   * This field preserves the original timestamp exactly as
   * received from Twitter, useful for:
   * - API compatibility
   * - Precise timestamp preservation
   * - Debugging and audit trails
   */
  createdAt: string,  // "Fri Jan 02 05:59:29 +0000 2026"
  
  /**
   * Human-readable formatted date
   * Format: "DayOfWeek, Month Day, Year"
   * Example: "Friday, January 2, 2026"
   * 
   * This is a formatted, timezone-aware date string that:
   * - Uses the configured timezone (from smaug.config.json)
   * - Provides a friendly, readable format
   * - Is used for organizing bookmarks in markdown archives
   * - Matches the format used in bookmarks.md section headers
   * 
   * Timezone conversion:
   * - Default: "America/Los_Angeles" (configurable)
   * - Converts from Twitter's UTC timezone
   * - Uses dayjs with timezone plugin
   */
  date: string,  // "Friday, January 2, 2026"
  
  // ═══════════════════════════════════════════════════════════
  // OTHER FIELDS (for context)
  // ═══════════════════════════════════════════════════════════
  
  id: string,                    // Tweet ID
  author: string,                // Twitter username
  authorName: string,            // Display name
  text: string,                  // Full tweet text
  tweetUrl: string,              // Full URL
  links: Array<LinkObject>,
  isReply: boolean,
  replyContext: ReplyContext | null,
  isQuote: boolean,
  quoteContext: QuoteContext | null
}
```

## Date Processing Flow

### 1. Raw Input (from bird CLI)
```json
{
  "createdAt": "Fri Jan 02 05:59:29 +0000 2026"
}
```

### 2. Processing (in processor.js)
```javascript
// Uses dayjs with timezone support
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

// Parse Twitter date and convert to configured timezone
const config = loadConfig();
const now = dayjs().tz(config.timezone || 'America/New_York');
const date = now.format('dddd, MMMM D, YYYY');  // "Friday, January 2, 2026"
```

### 3. Output (in bookmark object)
```json
{
  "createdAt": "Fri Jan 02 05:59:29 +0000 2026",  // Original (UTC)
  "date": "Friday, January 2, 2026"              // Formatted (timezone-aware)
}
```

## Date Format Examples

### createdAt (Twitter Format)
```
"Fri Jan 02 05:59:29 +0000 2026"
"Sat Dec 31 23:59:59 +0000 2025"
"Mon Mar 15 12:30:45 +0000 2026"
```

**Pattern:** `[Day] [Mon] [DD] [HH:MM:SS] [+TZ] [YYYY]`

### date (Formatted)
```
"Friday, January 2, 2026"
"Saturday, December 31, 2025"
"Monday, March 15, 2026"
```

**Pattern:** `[DayOfWeek], [Month] [Day], [Year]`

## Timezone Handling

### Configuration
```json
{
  "timezone": "America/Los_Angeles"  // Default timezone for date formatting
}
```

### Supported Timezones
Any valid IANA timezone identifier:
- `America/Los_Angeles` (PST/PDT)
- `America/New_York` (EST/EDT)
- `UTC`
- `Europe/London`
- `Asia/Tokyo`
- etc.

### Conversion Logic
1. Twitter provides UTC time: `"Fri Jan 02 05:59:29 +0000 2026"`
2. dayjs parses the UTC timestamp
3. Converts to configured timezone
4. Formats as human-readable date string

**Example:**
- Twitter UTC: `Fri Jan 02 05:59:29 +0000 2026`
- Converted to PST: `Thursday, January 1, 2026` (8:59 PM PST)
- Converted to EST: `Friday, January 2, 2026` (12:59 AM EST)

## Date Usage in Archive

### bookmarks.md Structure
```markdown
# Friday, January 2, 2026

## @author - Title
> Tweet text...

- **Tweet:** https://x.com/...
- **Date:** Friday, January 2, 2026
```

The `date` field is used to:
- Create section headers in `bookmarks.md`
- Group bookmarks by day
- Display human-readable dates in the archive

## API Payload Dates

When pushing to API, both date fields are included:

```json
{
  "id": "2006968571268661423",
  "createdAt": "Fri Jan 02 05:59:29 +0000 2026",
  "date": "Friday, January 2, 2026",
  ...
}
```

**API Requirements:**
- `createdAt`: Required, must match Twitter format
- `date`: Required, human-readable format

## Date Parsing Utilities

### Parse createdAt to JavaScript Date
```javascript
// Twitter format: "Fri Jan 02 05:59:29 +0000 2026"
const twitterDate = "Fri Jan 02 05:59:29 +0000 2026";
const date = new Date(twitterDate);  // Works in most browsers
```

### Parse createdAt with dayjs
```javascript
import dayjs from 'dayjs';
const date = dayjs("Fri Jan 02 05:59:29 +0000 2026");
```

### Convert date string back to Date
```javascript
// Formatted: "Friday, January 2, 2026"
import dayjs from 'dayjs';
const date = dayjs("Friday, January 2, 2026", "dddd, MMMM D, YYYY");
```

## Complete Bookmark Object with Dates

```typescript
{
  // Date fields
  createdAt: "Fri Jan 02 05:59:29 +0000 2026",  // Twitter UTC format
  date: "Friday, January 2, 2026",              // Timezone-aware formatted
  
  // Other required fields
  id: "2006968571268661423",
  author: "alexhillman",
  authorName: "📙 Alex Hillman",
  text: "Tweet content...",
  tweetUrl: "https://x.com/alexhillman/status/2006968571268661423",
  
  // Optional fields
  links: [...],
  isReply: false,
  replyContext: null,
  isQuote: false,
  quoteContext: null
}
```

## Summary

| Field | Format | Example | Purpose |
|-------|--------|---------|---------|
| `createdAt` | Twitter UTC | `"Fri Jan 02 05:59:29 +0000 2026"` | Original timestamp, API compatibility |
| `date` | Human-readable | `"Friday, January 2, 2026"` | Display, organization, timezone-aware |

**Key Points:**
- `createdAt` preserves original Twitter timestamp (UTC)
- `date` provides timezone-converted, human-readable format
- Both fields are required in bookmark objects
- Timezone conversion uses configured timezone from `smaug.config.json`

# API Integration Guide

Smaug can automatically push processed bookmarks and knowledge entries to a remote API after processing completes.

## Setup

### 1. Environment Variables

Create a `.env` file in the project root:

```bash
API_BASE_URL=https://your-app.replit.app
API_KEY=bm_your_api_key_here
```

Or set them as environment variables:

```bash
export API_BASE_URL=https://your-app.replit.app
export API_KEY=bm_your_api_key_here
```

### 2. Configuration

The API integration is automatically enabled when both `API_BASE_URL` and `API_KEY` are set. No additional configuration needed.

## How It Works

### Automatic Push

When you run `npx smaug run`, after Claude Code finishes processing bookmarks:

1. **Bookmarks are pushed** to `/api/v1/bookmarks` (upserted by tweet ID)
2. **Knowledge entries are pushed** to `/api/v1/knowledge/entries/bulk`

The push happens automatically and won't fail the job if it errors (errors are logged but don't stop processing).

### Manual Push

You can manually push data to the API:

```bash
npx smaug push
```

This will:
- Push all bookmarks from the pending file
- Push all knowledge entries from the `knowledge/` directory

## API Endpoints Used

### Bookmarks

- **POST** `/api/v1/bookmarks` - Upserts bookmarks by tweet ID
  - Accepts single object or array
  - Returns: `{ success: true, added: N, updated: M, errors: [] }`

### Knowledge Entries

- **POST** `/api/v1/knowledge/entries/bulk` - Creates knowledge entries in bulk
  - Body: `{ entries: [...] }`
  - Returns: `{ success: true, created: N, failed: M, entries: [...], errors: [] }`

## Data Format

### Bookmark Format

Bookmarks are pushed exactly as they appear in the pending file:

```json
{
  "id": "2006968571268661423",
  "author": "alexhillman",
  "authorName": "📙 Alex Hillman",
  "text": "Tweet content...",
  "tweetUrl": "https://x.com/alexhillman/status/2006968571268661423",
  "createdAt": "Fri Jan 02 05:59:29 +0000 2026",
  "date": "Friday, January 2, 2026",
  "links": [...],
  "isReply": false,
  "replyContext": null,
  "isQuote": false,
  "quoteContext": null
}
```

### Knowledge Entry Format

Knowledge entries are extracted from markdown files in `knowledge/` directories:

```json
{
  "title": "Smaug - Twitter Bookmark Archiver",
  "type": "tool",
  "category": "tools",
  "date_added": "2026-01-02",
  "source": "https://github.com/alexknowshtml/smaug",
  "tags": ["twitter", "bookmarks"],
  "via": "Twitter bookmark from @alexhillman",
  "description": "A tool that...",
  "keyFeatures": ["Feature 1", "Feature 2"],
  "links": [
    { "label": "GitHub", "url": "https://github.com/..." }
  ],
  "sourceBookmarkId": "2006968571268661423"
}
```

## Status Check

Check if API is configured:

```bash
npx smaug status
```

Look for the `API:` line - it will show `✓ enabled` if configured, or `✗ disabled` if not.

## Troubleshooting

### API Push Fails

- Check that `API_BASE_URL` and `API_KEY` are set correctly
- Verify the API endpoint is accessible
- Check the error message in the console output

### No Bookmarks Pushed

- Ensure bookmarks have been processed (check `pending-bookmarks.json`)
- The API push only happens after successful Claude processing
- Use `npx smaug push` to manually push existing data

### No Knowledge Entries Pushed

- Ensure knowledge files exist in `knowledge/tools/`, `knowledge/articles/`, etc.
- Files must have valid frontmatter and content sections
- Check console output for parsing errors

## Disabling API Push

To disable API push, simply remove or unset the environment variables:

```bash
unset API_BASE_URL
unset API_KEY
```

Or remove them from your `.env` file.

# Bookmark Data Structure

This document describes the complete data structure for bookmarks in Smaug.

## Pending Bookmarks File Structure

**File:** `.state/pending-bookmarks.json`

```json
{
  "generatedAt": "2026-01-03T19:29:19.859Z",
  "count": 12,
  "bookmarks": [
    {
      // Individual bookmark object (see below)
    }
  ]
}
```

## Individual Bookmark Object

```typescript
{
  // Core tweet information
  id: string,                    // Tweet ID (e.g., "2006968571268661423")
  author: string,                // Twitter username (e.g., "alexhillman")
  authorName: string,            // Display name (e.g., "📙 Alex Hillman")
  text: string,                  // Full tweet text
  tweetUrl: string,              // Full URL (e.g., "https://x.com/alexhillman/status/2006968571268661423")
  createdAt: string,             // Original date from Twitter (e.g., "Fri Jan 02 05:59:29 +0000 2026")
  date: string,                  // Formatted date (e.g., "Friday, January 2, 2026")
  
  // Link information (array of expanded links)
  links: [
    {
      original: string,          // Original t.co URL (e.g., "https://t.co/auS128LhHd")
      expanded: string,          // Expanded URL (e.g., "https://github.com/alexknowshtml/smaug/")
      type: string,              // Link type: "github" | "article" | "video" | "tweet" | "media" | "image" | "unknown"
      content: {                 // Extracted content (varies by type)
        // For GitHub repos:
        name?: string,
        fullName?: string,
        description?: string,
        stars?: number,
        language?: string,
        topics?: string[],
        readme?: string,
        url?: string,
        source?: "github-api"
        
        // For articles:
        text?: string,           // Extracted article text (first 10k chars)
        source?: "direct" | "paywalled",
        paywalled?: boolean
        
        // For quote tweets:
        id?: string,
        author?: string,
        authorName?: string,
        text?: string,
        tweetUrl?: string,
        source?: "quote-tweet"
        
        // Error case:
        error?: string
      }
    }
  ],
  
  // Reply context (if this is a reply)
  isReply: boolean,
  replyContext: {
    id: string,
    author: string,
    authorName: string,
    text: string,
    tweetUrl: string
  } | null,
  
  // Quote tweet context (if this quotes another tweet)
  isQuote: boolean,
  quoteContext: {
    id: string,
    author: string,
    authorName: string,
    text: string,
    tweetUrl: string,
    source: "native-quote" | "quote-tweet"
  } | null
}
```

## Raw Bird CLI Output Structure

**From:** `bird bookmarks -n 20 --json`

```typescript
[
  {
    id: string,
    text: string,
    createdAt: string,            // Format: "Fri Jan 02 05:59:29 +0000 2026"
    replyCount: number,
    retweetCount: number,
    likeCount: number,
    conversationId: string,
    author: {
      username: string,
      name: string
    },
    authorId: string,
    
    // Optional fields:
    inReplyToStatusId?: string,   // If this is a reply
    quotedTweet?: {               // If this quotes a tweet
      id: string,
      text: string,
      createdAt: string,
      author: {
        username: string,
        name: string
      },
      // ... other tweet fields
    }
  }
]
```

## Example Bookmark

```json
{
  "id": "2006968571268661423",
  "author": "alexhillman",
  "authorName": "📙 Alex Hillman",
  "text": "its late so i'll probably regret posting this but...\n\nenter the dragon 🔥🐲\n\nsay hi to Smaug, the helpful hoarding dragon that roams your Twitter bookmarks and helps you organize them into your personal knowledge system of choice. \n\nhttps://t.co/auS128LhHd\n\nspecial thanks to @steipete, this would be a lot messier without his work!",
  "tweetUrl": "https://x.com/alexhillman/status/2006968571268661423",
  "createdAt": "Fri Jan 02 05:59:29 +0000 2026",
  "date": "Friday, January 2, 2026",
  "links": [
    {
      "original": "https://t.co/auS128LhHd",
      "expanded": "https://github.com/alexknowshtml/smaug/",
      "type": "github",
      "content": {
        "name": "smaug",
        "fullName": "alexknowshtml/smaug",
        "description": "Archive your Twitter/X bookmarks to markdown. Automatically.",
        "stars": 219,
        "language": "JavaScript",
        "topics": [],
        "readme": "# Smaug 🐉\n\nArchive your Twitter/X bookmarks...",
        "url": "https://github.com/alexknowshtml/smaug",
        "source": "github-api"
      }
    }
  ],
  "isReply": false,
  "replyContext": null,
  "isQuote": false,
  "quoteContext": null
}
```

## Link Content Types

### GitHub Repo Content
```typescript
{
  name: string,              // Repository name
  fullName: string,          // "owner/repo"
  description: string,       // Repo description
  stars: number,             // Star count
  language: string,          // Primary language
  topics: string[],          // GitHub topics
  readme: string,           // README content (truncated to 5k chars)
  url: string,              // GitHub URL
  source: "github-api"
}
```

### Article Content
```typescript
{
  text: string,             // Extracted article text (first 10k chars)
  source: "direct" | "paywalled",
  paywalled: boolean        // Whether paywall was detected
}
```

### Quote Tweet Content
```typescript
{
  id: string,
  author: string,
  authorName: string,
  text: string,
  tweetUrl: string,
  source: "quote-tweet"
}
```

## State File Structure

**File:** `.state/bookmarks-state.json`

```json
{
  "last_processed_id": "2006968571268661423",
  "last_check": "2026-01-03T19:29:19.859Z",
  "last_processing_run": "2026-01-03T19:31:31.135Z"
}
```

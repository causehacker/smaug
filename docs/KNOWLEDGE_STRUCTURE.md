# Knowledge Structure Schema

This document defines the structure of knowledge files created by Smaug's bookmark processing system. Use this schema to understand, rebuild, and push knowledge entries to APIs.

## Overview

Knowledge files are markdown files with YAML frontmatter, organized by category in the `knowledge/` directory:
- `knowledge/tools/` - Tools, libraries, GitHub repos
- `knowledge/articles/` - Articles, blog posts, documentation
- `knowledge/podcasts/` - Podcast episodes (with transcript status)
- `knowledge/videos/` - Video content (with transcript status)

## File Structure

Each knowledge file follows this pattern:

```markdown
---
{frontmatter}
---

{markdown content}
```

## Frontmatter Schema

### Common Fields (All Types)

```typescript
{
  title: string,              // Display title
  type: "tool" | "article" | "podcast" | "video",
  date_added: string,         // ISO date: "YYYY-MM-DD"
  source: string,             // Primary URL (GitHub, article URL, etc.)
  tags: string[],             // Array of tag strings
  via: string                 // Attribution: "Twitter bookmark from @username"
}
```

### Type-Specific Fields

#### Tool (`type: "tool"`)
```typescript
{
  // Common fields +
  // No additional required fields
}
```

#### Article (`type: "article"`)
```typescript
{
  // Common fields +
  author?: string             // Article author name
}
```

#### Podcast (`type: "podcast"`)
```typescript
{
  // Common fields +
  show?: string,              // Podcast show name
  status?: "needs_transcript" // Transcript status
}
```

#### Video (`type: "video"`)
```typescript
{
  // Common fields +
  channel?: string,           // Channel/creator name
  status?: "needs_transcript"  // Transcript status
}
```

## Content Structure

### Tool Content Template

```markdown
{Description paragraph - what the tool does, key features, why it was bookmarked}

## Key Features

- Feature 1
- Feature 2
- Feature 3

## Links

- [GitHub]({github_url})
- [Original Tweet]({tweet_url})
```

### Article Content Template

```markdown
{Summary paragraph - key points and why it was bookmarked}

## Key Takeaways

- Point 1
- Point 2
- Point 3

## Context

{Optional context section if the bookmark was part of a discussion}

## Links

- [Article]({article_url})
- [Original Tweet]({tweet_url})
```

### Podcast Content Template

```markdown
{Brief description from tweet context}

## Episode Info

- **Show:** {show_name}
- **Episode:** {episode_title}
- **Why bookmarked:** {context from tweet}

## Transcript

*Pending transcription* (or actual transcript if available)

## Links

- [Episode]({podcast_url})
- [Original Tweet]({tweet_url})
```

### Video Content Template

```markdown
{Brief description from tweet context}

## Video Info

- **Channel:** {channel_name}
- **Title:** {video_title}
- **Why bookmarked:** {context from tweet}

## Transcript

*Pending transcription* (or actual transcript if available)

## Links

- [Video]({video_url})
- [Original Tweet]({tweet_url})
```

## Schema Files

Two schema formats are provided:

1. **TypeScript/Zod Schema** (`src/schemas/knowledge.ts`) - For TypeScript projects with Zod validation
2. **JSON Schema** (`src/schemas/knowledge.schema.json`) - Standard JSON Schema for API validation

## JSON Schema for API Integration

### Complete Knowledge Entry Schema

```typescript
interface KnowledgeEntry {
  // Metadata
  id?: string,                    // Optional: unique identifier
  slug: string,                   // Filename slug (e.g., "smaug-twitter-bookmark-archiver")
  category: "tools" | "articles" | "podcasts" | "videos",
  filePath: string,               // Relative path: "knowledge/tools/smaug.md"
  
  // Frontmatter
  frontmatter: {
    title: string,
    type: "tool" | "article" | "podcast" | "video",
    date_added: string,            // ISO date: "YYYY-MM-DD"
    source: string,
    tags: string[],
    via: string,
    
    // Optional type-specific fields
    author?: string,               // For articles
    show?: string,                 // For podcasts
    channel?: string,              // For videos
    status?: "needs_transcript"    // For podcasts/videos
  },
  
  // Content sections
  content: {
    description: string,           // Main description paragraph
    keyFeatures?: string[],        // For tools
    keyTakeaways?: string[],       // For articles
    context?: string,              // Optional context section
    episodeInfo?: {                // For podcasts
      show: string,
      episode: string,
      whyBookmarked: string
    },
    videoInfo?: {                  // For videos
      channel: string,
      title: string,
      whyBookmarked: string
    },
    transcript?: string,           // For podcasts/videos (if available)
    links: {
      label: string,               // e.g., "GitHub", "Article", "Original Tweet"
      url: string
    }[]
  },
  
  // Source bookmark reference
  sourceBookmark?: {
    id: string,
    author: string,
    tweetUrl: string,
    createdAt: string
  }
}
```

### Example JSON Representation

```json
{
  "slug": "smaug-twitter-bookmark-archiver",
  "category": "tools",
  "filePath": "knowledge/tools/smaug.md",
  "frontmatter": {
    "title": "Smaug - Twitter Bookmark Archiver",
    "type": "tool",
    "date_added": "2026-01-02",
    "source": "https://github.com/alexknowshtml/smaug",
    "tags": ["twitter", "bookmarks", "archiving", "markdown", "automation", "knowledge-management"],
    "via": "Twitter bookmark from @alexhillman"
  },
  "content": {
    "description": "A tool that automatically archives Twitter/X bookmarks to markdown files. Like a dragon hoarding treasure, Smaug collects valuable bookmarked content and organizes it into a personal knowledge system.",
    "keyFeatures": [
      "Automatic bookmark fetching from Twitter/X using bird CLI",
      "t.co link expansion to reveal actual URLs",
      "Content extraction from GitHub repos, articles, and quote tweets",
      "Claude Code integration for intelligent analysis and categorization",
      "Markdown-based archiving organized by date",
      "Knowledge library filing system (tools, articles, etc.)",
      "Customizable category system for different content types",
      "Automation support via PM2, cron, or systemd"
    ],
    "links": [
      {
        "label": "GitHub",
        "url": "https://github.com/alexknowshtml/smaug"
      },
      {
        "label": "Original Tweet",
        "url": "https://x.com/alexhillman/status/2006968571268661423"
      }
    ]
  },
  "sourceBookmark": {
    "id": "2006968571268661423",
    "author": "alexhillman",
    "tweetUrl": "https://x.com/alexhillman/status/2006968571268661423",
    "createdAt": "Fri Jan 02 05:59:29 +0000 2026"
  }
}
```

## Conversion Functions

### Markdown → JSON

```typescript
/**
 * Parse a knowledge markdown file into a KnowledgeEntry JSON object
 */
function parseKnowledgeFile(markdownContent: string, filePath: string): KnowledgeEntry {
  // Extract frontmatter (between --- delimiters)
  const frontmatterMatch = markdownContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) throw new Error('Invalid frontmatter');
  
  const frontmatter = parseYAML(frontmatterMatch[1]);
  const content = frontmatterMatch[2];
  
  // Extract category from file path
  const categoryMatch = filePath.match(/knowledge\/(\w+)\//);
  const category = categoryMatch?.[1] as KnowledgeEntry['category'];
  
  // Parse content sections
  const sections = parseMarkdownSections(content);
  
  return {
    slug: extractSlug(filePath),
    category,
    filePath,
    frontmatter,
    content: sections,
    // sourceBookmark would need to be looked up separately
  };
}
```

### JSON → Markdown

```typescript
/**
 * Convert a KnowledgeEntry JSON object back to markdown format
 */
function generateKnowledgeFile(entry: KnowledgeEntry): string {
  const frontmatter = generateYAML(entry.frontmatter);
  const content = generateMarkdownContent(entry);
  
  return `---\n${frontmatter}\n---\n\n${content}`;
}

function generateMarkdownContent(entry: KnowledgeEntry): string {
  const parts: string[] = [];
  
  // Description
  parts.push(entry.content.description);
  parts.push('');
  
  // Type-specific sections
  if (entry.frontmatter.type === 'tool' && entry.content.keyFeatures) {
    parts.push('## Key Features');
    parts.push('');
    entry.content.keyFeatures.forEach(feature => {
      parts.push(`- ${feature}`);
    });
    parts.push('');
  }
  
  if (entry.frontmatter.type === 'article' && entry.content.keyTakeaways) {
    parts.push('## Key Takeaways');
    parts.push('');
    entry.content.keyTakeaways.forEach(takeaway => {
      parts.push(`- ${takeaway}`);
    });
    parts.push('');
  }
  
  if (entry.content.context) {
    parts.push('## Context');
    parts.push('');
    parts.push(entry.content.context);
    parts.push('');
  }
  
  // Links
  parts.push('## Links');
  parts.push('');
  entry.content.links.forEach(link => {
    parts.push(`- [${link.label}](${link.url})`);
  });
  
  return parts.join('\n');
}
```

## API Payload Format

### Create Knowledge Entry

```typescript
POST /api/knowledge/entries

{
  "title": "Smaug - Twitter Bookmark Archiver",
  "type": "tool",
  "category": "tools",
  "date_added": "2026-01-02",
  "source": "https://github.com/alexknowshtml/smaug",
  "tags": ["twitter", "bookmarks", "archiving"],
  "via": "Twitter bookmark from @alexhillman",
  "description": "A tool that automatically archives Twitter/X bookmarks...",
  "keyFeatures": [
    "Automatic bookmark fetching",
    "Content extraction"
  ],
  "links": [
    { "label": "GitHub", "url": "https://github.com/..." },
    { "label": "Original Tweet", "url": "https://x.com/..." }
  ],
  "sourceBookmarkId": "2006968571268661423"
}
```

### Update Knowledge Entry

```typescript
PATCH /api/knowledge/entries/{id}

{
  "title": "Updated Title",
  "tags": ["updated", "tags"],
  "description": "Updated description"
}
```

### Query Knowledge Entries

```typescript
GET /api/knowledge/entries?category=tools&tags=twitter&limit=20&offset=0

Response:
{
  "entries": KnowledgeEntry[],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

## File Naming Convention

- **Slug generation**: Convert title to lowercase, replace spaces/special chars with hyphens
- **Example**: "Smaug - Twitter Bookmark Archiver" → `smaug-twitter-bookmark-archiver.md`
- **Uniqueness**: If file exists, append `-2`, `-3`, etc.

## Directory Structure

```
knowledge/
├── tools/
│   ├── smaug.md
│   └── whisper-flow.md
├── articles/
│   ├── agents-md-format.md
│   └── suno-advanced-prompting-guide.md
├── podcasts/
│   └── {slug}.md
└── videos/
    └── {slug}.md
```

## Validation Rules

1. **Required fields**: `title`, `type`, `date_added`, `source`, `tags`, `via`
2. **Date format**: Must be valid ISO date `YYYY-MM-DD`
3. **Type values**: Must be one of `tool`, `article`, `podcast`, `video`
4. **Category mapping**: Type must match category folder:
   - `tool` → `tools/`
   - `article` → `articles/`
   - `podcast` → `podcasts/`
   - `video` → `videos/`
5. **Links**: Must have at least one link (usually includes "Original Tweet")
6. **Content**: Description paragraph is required

## Example: Complete Round-Trip

### Input: Bookmark Object
```json
{
  "id": "2006968571268661423",
  "author": "alexhillman",
  "text": "say hi to Smaug...",
  "links": [{
    "expanded": "https://github.com/alexknowshtml/smaug/",
    "type": "github",
    "content": {
      "name": "smaug",
      "description": "Archive your Twitter/X bookmarks to markdown..."
    }
  }]
}
```

### Process: Generate Knowledge Entry
```typescript
const entry = {
  slug: "smaug-twitter-bookmark-archiver",
  category: "tools",
  frontmatter: {
    title: "Smaug - Twitter Bookmark Archiver",
    type: "tool",
    date_added: "2026-01-02",
    source: "https://github.com/alexknowshtml/smaug",
    tags: ["twitter", "bookmarks", "archiving"],
    via: "Twitter bookmark from @alexhillman"
  },
  content: {
    description: "A tool that automatically archives Twitter/X bookmarks...",
    keyFeatures: [...],
    links: [...]
  }
};
```

### Output: Markdown File
```markdown
---
title: "Smaug - Twitter Bookmark Archiver"
type: tool
date_added: 2026-01-02
source: "https://github.com/alexknowshtml/smaug"
tags: [twitter, bookmarks, archiving]
via: "Twitter bookmark from @alexhillman"
---

A tool that automatically archives Twitter/X bookmarks...

## Key Features

- Feature 1
- Feature 2

## Links

- [GitHub](https://github.com/alexknowshtml/smaug)
- [Original Tweet](https://x.com/alexhillman/status/2006968571268661423)
```

### API Push
```typescript
POST /api/knowledge/entries
Body: { ...entry }
```

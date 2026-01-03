# API Integration Guide

Quick reference for integrating Smaug knowledge entries with APIs.

## Quick Start

### 1. Parse Existing Knowledge Files

```typescript
import { KnowledgeEntrySchema } from './src/schemas/knowledge.ts';
import fs from 'fs';
import yaml from 'js-yaml';

function parseKnowledgeFile(filePath: string): KnowledgeEntry {
  const content = fs.readFileSync(filePath, 'utf8');
  const [frontmatter, markdown] = content.split('---\n').slice(1);
  const [yamlContent, ...bodyParts] = frontmatter.split('\n---\n');
  
  const frontmatterObj = yaml.load(yamlContent);
  const category = filePath.match(/knowledge\/(\w+)\//)?.[1];
  
  // Parse markdown content sections...
  const contentObj = parseMarkdownContent(bodyParts.join('\n---\n'));
  
  return KnowledgeEntrySchema.parse({
    slug: extractSlug(filePath),
    category,
    filePath,
    frontmatter: frontmatterObj,
    content: contentObj,
  });
}
```

### 2. Push to API

```typescript
async function pushKnowledgeEntry(entry: KnowledgeEntry, apiUrl: string) {
  const response = await fetch(`${apiUrl}/api/knowledge/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: entry.frontmatter.title,
      type: entry.frontmatter.type,
      category: entry.category,
      date_added: entry.frontmatter.date_added,
      source: entry.frontmatter.source,
      tags: entry.frontmatter.tags,
      via: entry.frontmatter.via,
      description: entry.content.description,
      keyFeatures: entry.content.keyFeatures,
      keyTakeaways: entry.content.keyTakeaways,
      links: entry.content.links,
      sourceBookmarkId: entry.sourceBookmark?.id,
    }),
  });
  
  return response.json();
}
```

### 3. Rebuild from API Response

```typescript
async function rebuildKnowledgeFile(apiUrl: string, entryId: string): Promise<string> {
  const response = await fetch(`${apiUrl}/api/knowledge/entries/${entryId}`);
  const entry = await response.json();
  
  return generateMarkdownFile(entry);
}

function generateMarkdownFile(entry: KnowledgeEntry): string {
  const frontmatter = yaml.dump(entry.frontmatter);
  const content = generateMarkdownContent(entry);
  
  return `---\n${frontmatter}---\n\n${content}`;
}
```

## File Locations

- **Schema Documentation**: `docs/KNOWLEDGE_STRUCTURE.md`
- **TypeScript/Zod Schema**: `src/schemas/knowledge.ts`
- **JSON Schema**: `src/schemas/knowledge.schema.json`
- **Bookmark Structure**: `docs/BOOKMARK_DATA_STRUCTURE.md`

## Example API Endpoints

### Create Entry
```
POST /api/knowledge/entries
Content-Type: application/json

{
  "title": "Tool Name",
  "type": "tool",
  "category": "tools",
  "date_added": "2026-01-02",
  "source": "https://github.com/...",
  "tags": ["tag1", "tag2"],
  "via": "Twitter bookmark from @user",
  "description": "Description...",
  "keyFeatures": ["Feature 1", "Feature 2"],
  "links": [
    { "label": "GitHub", "url": "https://github.com/..." },
    { "label": "Original Tweet", "url": "https://x.com/..." }
  ]
}
```

### List Entries
```
GET /api/knowledge/entries?category=tools&tags=twitter&limit=20&offset=0
```

### Update Entry
```
PATCH /api/knowledge/entries/{id}
Content-Type: application/json

{
  "title": "Updated Title",
  "tags": ["updated", "tags"]
}
```

### Get Entry
```
GET /api/knowledge/entries/{id}
```

## Validation

Use the provided schemas to validate data:

```typescript
import { KnowledgeEntrySchema } from './src/schemas/knowledge.ts';

try {
  const entry = KnowledgeEntrySchema.parse(data);
  // Valid entry
} catch (error) {
  // Validation failed
  console.error(error.errors);
}
```

Or with JSON Schema:

```javascript
import Ajv from 'ajv';
import schema from './src/schemas/knowledge.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(schema);

if (validate(data)) {
  // Valid entry
} else {
  console.error(validate.errors);
}
```

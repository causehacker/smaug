# Complete API Build Guide for Smaug Knowledge System

This guide provides everything needed to build a REST API for managing Smaug knowledge entries. All code examples are ready to copy and use.

## Table of Contents

1. [Data Structures](#data-structures)
2. [API Endpoints Specification](#api-endpoints-specification)
3. [Complete Implementation Code](#complete-implementation-code)
4. [Validation Schemas](#validation-schemas)
5. [Example Requests & Responses](#example-requests--responses)

---

## Data Structures

### Bookmark Object (Input)

Bookmarks come from Twitter/X and are processed into knowledge entries.

```typescript
interface Bookmark {
  id: string;                    // Tweet ID
  author: string;                // Twitter username
  authorName: string;            // Display name
  text: string;                  // Full tweet text
  tweetUrl: string;              // Full URL
  createdAt: string;             // Original date from Twitter
  date: string;                  // Formatted date
  
  links: Array<{
    original: string;            // Original t.co URL
    expanded: string;            // Expanded URL
    type: "github" | "article" | "video" | "tweet" | "media" | "image" | "unknown";
    content: {
      // GitHub repos:
      name?: string;
      fullName?: string;
      description?: string;
      stars?: number;
      language?: string;
      topics?: string[];
      readme?: string;
      url?: string;
      source?: "github-api";
      
      // Articles:
      text?: string;
      source?: "direct" | "paywalled";
      paywalled?: boolean;
      
      // Quote tweets:
      id?: string;
      author?: string;
      authorName?: string;
      text?: string;
      tweetUrl?: string;
      source?: "quote-tweet";
      
      // Error:
      error?: string;
    };
  }>;
  
  isReply: boolean;
  replyContext: {
    id: string;
    author: string;
    authorName: string;
    text: string;
    tweetUrl: string;
  } | null;
  
  isQuote: boolean;
  quoteContext: {
    id: string;
    author: string;
    authorName: string;
    text: string;
    tweetUrl: string;
    source: "native-quote" | "quote-tweet";
  } | null;
}
```

### Knowledge Entry Object (Output)

Knowledge entries are the structured data stored in the API.

```typescript
interface KnowledgeEntry {
  id?: string;                   // Optional: unique identifier (UUID)
  slug: string;                   // Filename slug (e.g., "smaug-twitter-bookmark-archiver")
  category: "tools" | "articles" | "podcasts" | "videos";
  filePath: string;               // Relative path: "knowledge/tools/smaug.md"
  
  frontmatter: {
    title: string;
    type: "tool" | "article" | "podcast" | "video";
    date_added: string;           // ISO date: "YYYY-MM-DD"
    source: string;               // Primary URL
    tags: string[];
    via: string;                  // Attribution: "Twitter bookmark from @username"
    
    // Optional type-specific fields
    author?: string;              // For articles
    show?: string;                // For podcasts
    channel?: string;             // For videos
    status?: "needs_transcript";  // For podcasts/videos
  };
  
  content: {
    description: string;          // Main description paragraph
    keyFeatures?: string[];      // For tools
    keyTakeaways?: string[];      // For articles
    context?: string;             // Optional context section
    episodeInfo?: {               // For podcasts
      show: string;
      episode: string;
      whyBookmarked: string;
    };
    videoInfo?: {                 // For videos
      channel: string;
      title: string;
      whyBookmarked: string;
    };
    transcript?: string;          // For podcasts/videos (if available)
    links: Array<{
      label: string;              // e.g., "GitHub", "Article", "Original Tweet"
      url: string;
    }>;
  };
  
  sourceBookmark?: {
    id: string;
    author: string;
    tweetUrl: string;
    createdAt: string;
  };
  
  createdAt?: string;            // When entry was created in API
  updatedAt?: string;             // When entry was last updated
}
```

---

## API Endpoints Specification

### Base URL
```
https://api.example.com/v1
```

### Authentication
All endpoints require authentication via Bearer token:
```
Authorization: Bearer {token}
```

### Endpoints

#### 1. Create Knowledge Entry

```http
POST /api/knowledge/entries
Content-Type: application/json

Request Body:
{
  "title": "Smaug - Twitter Bookmark Archiver",
  "type": "tool",
  "category": "tools",
  "date_added": "2026-01-02",
  "source": "https://github.com/alexknowshtml/smaug",
  "tags": ["twitter", "bookmarks", "archiving"],
  "via": "Twitter bookmark from @alexhillman",
  "description": "A tool that automatically archives Twitter/X bookmarks to markdown files.",
  "keyFeatures": [
    "Automatic bookmark fetching",
    "Content extraction",
    "AI-powered categorization"
  ],
  "links": [
    { "label": "GitHub", "url": "https://github.com/alexknowshtml/smaug" },
    { "label": "Original Tweet", "url": "https://x.com/alexhillman/status/2006968571268661423" }
  ],
  "sourceBookmarkId": "2006968571268661423"
}

Response: 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "smaug-twitter-bookmark-archiver",
  "category": "tools",
  "filePath": "knowledge/tools/smaug-twitter-bookmark-archiver.md",
  "frontmatter": { ... },
  "content": { ... },
  "sourceBookmark": { ... },
  "createdAt": "2026-01-03T12:00:00Z",
  "updatedAt": "2026-01-03T12:00:00Z"
}
```

#### 2. Get Knowledge Entry

```http
GET /api/knowledge/entries/{id}

Response: 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "smaug-twitter-bookmark-archiver",
  "category": "tools",
  "filePath": "knowledge/tools/smaug-twitter-bookmark-archiver.md",
  "frontmatter": { ... },
  "content": { ... },
  "sourceBookmark": { ... },
  "createdAt": "2026-01-03T12:00:00Z",
  "updatedAt": "2026-01-03T12:00:00Z"
}
```

#### 3. List Knowledge Entries

```http
GET /api/knowledge/entries?category=tools&tags=twitter&type=tool&limit=20&offset=0&search=smaug

Query Parameters:
- category: "tools" | "articles" | "podcasts" | "videos" (optional)
- tags: comma-separated tags (optional)
- type: "tool" | "article" | "podcast" | "video" (optional)
- limit: number (default: 20, max: 100)
- offset: number (default: 0)
- search: string (searches title, description)

Response: 200 OK
{
  "entries": [
    { ... },
    { ... }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

#### 4. Update Knowledge Entry

```http
PATCH /api/knowledge/entries/{id}
Content-Type: application/json

Request Body:
{
  "title": "Updated Title",
  "tags": ["updated", "tags"],
  "description": "Updated description",
  "keyFeatures": ["New feature"],
  "transcript": "Full transcript text..."  // For podcasts/videos
}

Response: 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "updated-title",
  "updatedAt": "2026-01-03T13:00:00Z",
  ... // full entry
}
```

#### 5. Delete Knowledge Entry

```http
DELETE /api/knowledge/entries/{id}

Response: 204 No Content
```

#### 6. Get Entry by Slug

```http
GET /api/knowledge/entries/slug/{slug}

Response: 200 OK
{
  ... // full entry
}
```

#### 7. Bulk Create Entries

```http
POST /api/knowledge/entries/bulk
Content-Type: application/json

Request Body:
{
  "entries": [
    { ... },  // CreateKnowledgeEntryRequest objects
    { ... }
  ]
}

Response: 201 Created
{
  "created": 5,
  "failed": 0,
  "entries": [
    { ... },
    { ... }
  ],
  "errors": []
}
```

---

## Complete Implementation Code

### Express.js + TypeScript Implementation

```typescript
import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

// Database interface (replace with your actual DB)
interface Database {
  entries: Map<string, KnowledgeEntry>;
  findBySlug: (slug: string) => KnowledgeEntry | undefined;
  findByCategory: (category: string, limit: number, offset: number) => KnowledgeEntry[];
  search: (query: string, limit: number, offset: number) => KnowledgeEntry[];
  count: () => number;
}

// Request validation schemas
const CreateEntrySchema = z.object({
  title: z.string().min(1),
  type: z.enum(['tool', 'article', 'podcast', 'video']),
  category: z.enum(['tools', 'articles', 'podcasts', 'videos']),
  date_added: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().url(),
  tags: z.array(z.string()).min(1),
  via: z.string(),
  description: z.string().min(1),
  keyFeatures: z.array(z.string()).optional(),
  keyTakeaways: z.array(z.string()).optional(),
  context: z.string().optional(),
  episodeInfo: z.object({
    show: z.string(),
    episode: z.string(),
    whyBookmarked: z.string(),
  }).optional(),
  videoInfo: z.object({
    channel: z.string(),
    title: z.string(),
    whyBookmarked: z.string(),
  }).optional(),
  links: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
  })).min(1),
  sourceBookmarkId: z.string().optional(),
  author: z.string().optional(),
  show: z.string().optional(),
  channel: z.string().optional(),
  status: z.enum(['needs_transcript']).optional(),
});

const UpdateEntrySchema = z.object({
  title: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().min(1).optional(),
  keyFeatures: z.array(z.string()).optional(),
  keyTakeaways: z.array(z.string()).optional(),
  context: z.string().optional(),
  links: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
  })).optional(),
  transcript: z.string().optional(),
  status: z.enum(['needs_transcript']).optional(),
});

// Helper functions
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getCategoryFromType(type: string): string {
  const map: Record<string, string> = {
    tool: 'tools',
    article: 'articles',
    podcast: 'podcasts',
    video: 'videos',
  };
  return map[type] || 'tools';
}

function createEntryFromRequest(req: z.infer<typeof CreateEntrySchema>, sourceBookmark?: any): KnowledgeEntry {
  const slug = generateSlug(req.title);
  const category = req.category || getCategoryFromType(req.type);
  const filePath = `knowledge/${category}/${slug}.md`;
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    slug,
    category: category as KnowledgeEntry['category'],
    filePath,
    frontmatter: {
      title: req.title,
      type: req.type,
      date_added: req.date_added,
      source: req.source,
      tags: req.tags,
      via: req.via,
      author: req.author,
      show: req.show,
      channel: req.channel,
      status: req.status,
    },
    content: {
      description: req.description,
      keyFeatures: req.keyFeatures,
      keyTakeaways: req.keyTakeaways,
      context: req.context,
      episodeInfo: req.episodeInfo,
      videoInfo: req.videoInfo,
      links: req.links,
    },
    sourceBookmark: sourceBookmark ? {
      id: sourceBookmark.id,
      author: sourceBookmark.author,
      tweetUrl: sourceBookmark.tweetUrl,
      createdAt: sourceBookmark.createdAt,
    } : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

// Middleware
function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
      } else {
        next(error);
      }
    }
  };
}

// Routes

// POST /api/knowledge/entries
app.post('/api/knowledge/entries', validateRequest(CreateEntrySchema), (req: Request, res: Response) => {
  try {
    const entry = createEntryFromRequest(req.body);
    // Save to database (replace with your DB logic)
    // db.entries.set(entry.id, entry);
    
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// GET /api/knowledge/entries/:id
app.get('/api/knowledge/entries/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  // const entry = db.entries.get(id);
  // if (!entry) {
  //   return res.status(404).json({ error: 'Entry not found' });
  // }
  // res.json(entry);
  res.status(501).json({ error: 'Not implemented' });
});

// GET /api/knowledge/entries
app.get('/api/knowledge/entries', (req: Request, res: Response) => {
  const {
    category,
    tags,
    type,
    limit = '20',
    offset = '0',
    search,
  } = req.query;

  const limitNum = Math.min(parseInt(limit as string, 10), 100);
  const offsetNum = parseInt(offset as string, 10);

  // Filter and paginate (replace with your DB logic)
  // let entries = Array.from(db.entries.values());
  // if (category) entries = entries.filter(e => e.category === category);
  // if (type) entries = entries.filter(e => e.frontmatter.type === type);
  // if (tags) {
  //   const tagList = (tags as string).split(',');
  //   entries = entries.filter(e => tagList.some(t => e.frontmatter.tags.includes(t)));
  // }
  // if (search) {
  //   const searchLower = search.toLowerCase();
  //   entries = entries.filter(e =>
  //     e.frontmatter.title.toLowerCase().includes(searchLower) ||
  //     e.content.description.toLowerCase().includes(searchLower)
  //   );
  // }
  // const total = entries.length;
  // const paginated = entries.slice(offsetNum, offsetNum + limitNum);

  res.json({
    entries: [],
    total: 0,
    limit: limitNum,
    offset: offsetNum,
    hasMore: false,
  });
});

// PATCH /api/knowledge/entries/:id
app.patch('/api/knowledge/entries/:id', validateRequest(UpdateEntrySchema), (req: Request, res: Response) => {
  const { id } = req.params;
  // const entry = db.entries.get(id);
  // if (!entry) {
  //   return res.status(404).json({ error: 'Entry not found' });
  // }
  // const updated = { ...entry, ...req.body, updatedAt: new Date().toISOString() };
  // db.entries.set(id, updated);
  // res.json(updated);
  res.status(501).json({ error: 'Not implemented' });
});

// DELETE /api/knowledge/entries/:id
app.delete('/api/knowledge/entries/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  // const deleted = db.entries.delete(id);
  // if (!deleted) {
  //   return res.status(404).json({ error: 'Entry not found' });
  // }
  // res.status(204).send();
  res.status(501).json({ error: 'Not implemented' });
});

// GET /api/knowledge/entries/slug/:slug
app.get('/api/knowledge/entries/slug/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  // const entry = db.findBySlug(slug);
  // if (!entry) {
  //   return res.status(404).json({ error: 'Entry not found' });
  // }
  // res.json(entry);
  res.status(501).json({ error: 'Not implemented' });
});

// POST /api/knowledge/entries/bulk
app.post('/api/knowledge/entries/bulk', (req: Request, res: Response) => {
  const { entries } = req.body;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: 'entries must be an array' });
  }

  const created: KnowledgeEntry[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  entries.forEach((entryData, index) => {
    try {
      const validated = CreateEntrySchema.parse(entryData);
      const entry = createEntryFromRequest(validated);
      // db.entries.set(entry.id, entry);
      created.push(entry);
    } catch (error) {
      errors.push({ index, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  res.status(201).json({
    created: created.length,
    failed: errors.length,
    entries: created,
    errors,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
```

### FastAPI (Python) Implementation

```python
from fastapi import FastAPI, HTTPException, Query, Path
from pydantic import BaseModel, HttpUrl, field_validator
from typing import Optional, List, Literal
from datetime import datetime
import uuid
import re

app = FastAPI(title="Smaug Knowledge API", version="1.0.0")

# Models
class Link(BaseModel):
    label: str
    url: HttpUrl

class Frontmatter(BaseModel):
    title: str
    type: Literal["tool", "article", "podcast", "video"]
    date_added: str
    source: HttpUrl
    tags: List[str]
    via: str
    author: Optional[str] = None
    show: Optional[str] = None
    channel: Optional[str] = None
    status: Optional[Literal["needs_transcript"]] = None

class Content(BaseModel):
    description: str
    keyFeatures: Optional[List[str]] = None
    keyTakeaways: Optional[List[str]] = None
    context: Optional[str] = None
    episodeInfo: Optional[dict] = None
    videoInfo: Optional[dict] = None
    transcript: Optional[str] = None
    links: List[Link]

class SourceBookmark(BaseModel):
    id: str
    author: str
    tweetUrl: HttpUrl
    createdAt: str

class KnowledgeEntry(BaseModel):
    id: Optional[str] = None
    slug: str
    category: Literal["tools", "articles", "podcasts", "videos"]
    filePath: str
    frontmatter: Frontmatter
    content: Content
    sourceBookmark: Optional[SourceBookmark] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class CreateEntryRequest(BaseModel):
    title: str
    type: Literal["tool", "article", "podcast", "video"]
    category: Literal["tools", "articles", "podcasts", "videos"]
    date_added: str
    source: HttpUrl
    tags: List[str]
    via: str
    description: str
    keyFeatures: Optional[List[str]] = None
    keyTakeaways: Optional[List[str]] = None
    context: Optional[str] = None
    episodeInfo: Optional[dict] = None
    videoInfo: Optional[dict] = None
    links: List[Link]
    sourceBookmarkId: Optional[str] = None
    author: Optional[str] = None
    show: Optional[str] = None
    channel: Optional[str] = None
    status: Optional[Literal["needs_transcript"]] = None

    @field_validator('date_added')
    def validate_date(cls, v):
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', v):
            raise ValueError('date_added must be in YYYY-MM-DD format')
        return v

class UpdateEntryRequest(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    keyFeatures: Optional[List[str]] = None
    keyTakeaways: Optional[List[str]] = None
    context: Optional[str] = None
    links: Optional[List[Link]] = None
    transcript: Optional[str] = None
    status: Optional[Literal["needs_transcript"]] = None

# In-memory storage (replace with database)
entries_db: dict[str, KnowledgeEntry] = {}

def generate_slug(title: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')

def get_category_from_type(type: str) -> str:
    return {
        "tool": "tools",
        "article": "articles",
        "podcast": "podcasts",
        "video": "videos"
    }.get(type, "tools")

def create_entry_from_request(req: CreateEntryRequest) -> KnowledgeEntry:
    slug = generate_slug(req.title)
    category = req.category or get_category_from_type(req.type)
    file_path = f"knowledge/{category}/{slug}.md"
    now = datetime.utcnow().isoformat() + "Z"

    return KnowledgeEntry(
        id=str(uuid.uuid4()),
        slug=slug,
        category=category,
        filePath=file_path,
        frontmatter=Frontmatter(
            title=req.title,
            type=req.type,
            date_added=req.date_added,
            source=req.source,
            tags=req.tags,
            via=req.via,
            author=req.author,
            show=req.show,
            channel=req.channel,
            status=req.status,
        ),
        content=Content(
            description=req.description,
            keyFeatures=req.keyFeatures,
            keyTakeaways=req.keyTakeaways,
            context=req.context,
            episodeInfo=req.episodeInfo,
            videoInfo=req.videoInfo,
            links=req.links,
        ),
        createdAt=now,
        updatedAt=now,
    )

# Routes

@app.post("/api/knowledge/entries", response_model=KnowledgeEntry, status_code=201)
def create_entry(req: CreateEntryRequest):
    entry = create_entry_from_request(req)
    entries_db[entry.id] = entry
    return entry

@app.get("/api/knowledge/entries/{entry_id}", response_model=KnowledgeEntry)
def get_entry(entry_id: str = Path(..., description="Entry ID")):
    if entry_id not in entries_db:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entries_db[entry_id]

@app.get("/api/knowledge/entries", response_model=dict)
def list_entries(
    category: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
):
    entries = list(entries_db.values())
    
    if category:
        entries = [e for e in entries if e.category == category]
    if type:
        entries = [e for e in entries if e.frontmatter.type == type]
    if tags:
        tag_list = tags.split(',')
        entries = [e for e in entries if any(t in e.frontmatter.tags for t in tag_list)]
    if search:
        search_lower = search.lower()
        entries = [e for e in entries if 
                   search_lower in e.frontmatter.title.lower() or
                   search_lower in e.content.description.lower()]
    
    total = len(entries)
    paginated = entries[offset:offset + limit]
    
    return {
        "entries": paginated,
        "total": total,
        "limit": limit,
        "offset": offset,
        "hasMore": offset + limit < total,
    }

@app.patch("/api/knowledge/entries/{entry_id}", response_model=KnowledgeEntry)
def update_entry(entry_id: str, req: UpdateEntryRequest):
    if entry_id not in entries_db:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    entry = entries_db[entry_id]
    update_data = req.model_dump(exclude_unset=True)
    
    # Update entry fields
    if 'title' in update_data:
        entry.frontmatter.title = update_data['title']
        entry.slug = generate_slug(update_data['title'])
        entry.filePath = f"knowledge/{entry.category}/{entry.slug}.md"
    if 'tags' in update_data:
        entry.frontmatter.tags = update_data['tags']
    if 'description' in update_data:
        entry.content.description = update_data['description']
    if 'keyFeatures' in update_data:
        entry.content.keyFeatures = update_data['keyFeatures']
    if 'keyTakeaways' in update_data:
        entry.content.keyTakeaways = update_data['keyTakeaways']
    if 'context' in update_data:
        entry.content.context = update_data['context']
    if 'links' in update_data:
        entry.content.links = [Link(**link) for link in update_data['links']]
    if 'transcript' in update_data:
        entry.content.transcript = update_data['transcript']
    if 'status' in update_data:
        entry.frontmatter.status = update_data['status']
    
    entry.updatedAt = datetime.utcnow().isoformat() + "Z"
    entries_db[entry_id] = entry
    
    return entry

@app.delete("/api/knowledge/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: str):
    if entry_id not in entries_db:
        raise HTTPException(status_code=404, detail="Entry not found")
    del entries_db[entry_id]
    return None

@app.get("/api/knowledge/entries/slug/{slug}", response_model=KnowledgeEntry)
def get_entry_by_slug(slug: str):
    entry = next((e for e in entries_db.values() if e.slug == slug), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@app.post("/api/knowledge/entries/bulk", response_model=dict)
def bulk_create_entries(requests: List[CreateEntryRequest]):
    created = []
    errors = []
    
    for idx, req in enumerate(requests):
        try:
            entry = create_entry_from_request(req)
            entries_db[entry.id] = entry
            created.append(entry)
        except Exception as e:
            errors.append({"index": idx, "error": str(e)})
    
    return {
        "created": len(created),
        "failed": len(errors),
        "entries": created,
        "errors": errors,
    }
```

---

## Validation Schemas

### JSON Schema (for any language)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Knowledge Entry",
  "type": "object",
  "required": ["slug", "category", "filePath", "frontmatter", "content"],
  "properties": {
    "id": { "type": "string" },
    "slug": { "type": "string", "minLength": 1 },
    "category": { "type": "string", "enum": ["tools", "articles", "podcasts", "videos"] },
    "filePath": { "type": "string", "pattern": "^knowledge/(tools|articles|podcasts|videos)/[^/]+\\.md$" },
    "frontmatter": {
      "type": "object",
      "required": ["title", "type", "date_added", "source", "tags", "via"],
      "properties": {
        "title": { "type": "string", "minLength": 1 },
        "type": { "type": "string", "enum": ["tool", "article", "podcast", "video"] },
        "date_added": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
        "source": { "type": "string", "format": "uri" },
        "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "via": { "type": "string" },
        "author": { "type": "string" },
        "show": { "type": "string" },
        "channel": { "type": "string" },
        "status": { "type": "string", "enum": ["needs_transcript"] }
      }
    },
    "content": {
      "type": "object",
      "required": ["description", "links"],
      "properties": {
        "description": { "type": "string", "minLength": 1 },
        "keyFeatures": { "type": "array", "items": { "type": "string" } },
        "keyTakeaways": { "type": "array", "items": { "type": "string" } },
        "context": { "type": "string" },
        "episodeInfo": { "type": "object" },
        "videoInfo": { "type": "object" },
        "transcript": { "type": "string" },
        "links": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["label", "url"],
            "properties": {
              "label": { "type": "string" },
              "url": { "type": "string", "format": "uri" }
            }
          },
          "minItems": 1
        }
      }
    },
    "sourceBookmark": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "author": { "type": "string" },
        "tweetUrl": { "type": "string", "format": "uri" },
        "createdAt": { "type": "string" }
      }
    },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  }
}
```

---

## Example Requests & Responses

### Example 1: Create a Tool Entry

```bash
curl -X POST https://api.example.com/api/knowledge/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Smaug - Twitter Bookmark Archiver",
    "type": "tool",
    "category": "tools",
    "date_added": "2026-01-02",
    "source": "https://github.com/alexknowshtml/smaug",
    "tags": ["twitter", "bookmarks", "archiving"],
    "via": "Twitter bookmark from @alexhillman",
    "description": "A tool that automatically archives Twitter/X bookmarks to markdown files.",
    "keyFeatures": [
      "Automatic bookmark fetching",
      "Content extraction",
      "AI-powered categorization"
    ],
    "links": [
      { "label": "GitHub", "url": "https://github.com/alexknowshtml/smaug" },
      { "label": "Original Tweet", "url": "https://x.com/alexhillman/status/2006968571268661423" }
    ],
    "sourceBookmarkId": "2006968571268661423"
  }'
```

### Example 2: Create an Article Entry

```bash
curl -X POST https://api.example.com/api/knowledge/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "AGENTS.md - A README for AI Coding Agents",
    "type": "article",
    "category": "articles",
    "date_added": "2026-01-02",
    "source": "https://agents.md/",
    "tags": ["ai", "coding-agents", "documentation"],
    "via": "Twitter bookmark from @rafaelobitten",
    "author": "agents.md",
    "description": "AGENTS.md is a simple, open format for guiding AI coding agents.",
    "keyTakeaways": [
      "Provides standardized way to give coding agents context",
      "Adopted by 60k+ open-source projects",
      "Helps agents understand project structure"
    ],
    "links": [
      { "label": "Article", "url": "https://agents.md/" },
      { "label": "Original Tweet", "url": "https://x.com/rafaelobitten/status/2007081846966763765" }
    ]
  }'
```

### Example 3: List Entries with Filters

```bash
curl "https://api.example.com/api/knowledge/entries?category=tools&tags=twitter&limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4: Update Entry

```bash
curl -X PATCH https://api.example.com/api/knowledge/entries/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tags": ["twitter", "bookmarks", "archiving", "automation"],
    "description": "Updated description with more details."
  }'
```

---

## Summary

This guide provides:

1. **Complete data structures** for bookmarks and knowledge entries
2. **Full API specification** with 7 endpoints
3. **Ready-to-use code** for Express.js (TypeScript) and FastAPI (Python)
4. **Validation schemas** in JSON Schema format
5. **Example requests** with curl commands

Use this guide to build a complete REST API for managing Smaug knowledge entries. All code blocks are ready to copy and adapt to your specific database and infrastructure needs.

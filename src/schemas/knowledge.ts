/**
 * Knowledge Entry Schema
 *
 * Defines the structure for knowledge files created by Smaug's bookmark processing.
 * Use these schemas to validate, parse, and generate knowledge entries for API integration.
 */

import { z } from 'zod';

/**
 * Frontmatter schema for knowledge entries
 */
export const KnowledgeFrontmatterSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['tool', 'article', 'podcast', 'video']),
  date_added: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  source: z.string().url(),
  tags: z.array(z.string()).min(1),
  via: z.string(),
  
  // Optional type-specific fields
  author: z.string().optional(),
  show: z.string().optional(),
  channel: z.string().optional(),
  status: z.enum(['needs_transcript']).optional(),
}).refine(
  (data) => {
    // If type is podcast, show should be present
    if (data.type === 'podcast' && !data.show) return false;
    // If type is video, channel should be present
    if (data.type === 'video' && !data.channel) return false;
    return true;
  },
  {
    message: 'Type-specific fields must be present for podcast/video types',
  }
);

export type KnowledgeFrontmatter = z.infer<typeof KnowledgeFrontmatterSchema>;

/**
 * Link schema
 */
export const LinkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});

export type Link = z.infer<typeof LinkSchema>;

/**
 * Content schema - varies by type
 */
export const KnowledgeContentSchema = z.object({
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
  transcript: z.string().optional(),
  links: z.array(LinkSchema).min(1),
}).refine(
  (data) => {
    // Tools should have keyFeatures
    // Articles should have keyTakeaways
    // Podcasts should have episodeInfo
    // Videos should have videoInfo
    return true; // Validation handled by frontmatter type
  }
);

export type KnowledgeContent = z.infer<typeof KnowledgeContentSchema>;

/**
 * Source bookmark reference schema
 */
export const SourceBookmarkSchema = z.object({
  id: z.string(),
  author: z.string(),
  tweetUrl: z.string().url(),
  createdAt: z.string(),
});

export type SourceBookmark = z.infer<typeof SourceBookmarkSchema>;

/**
 * Complete knowledge entry schema
 */
export const KnowledgeEntrySchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1),
  category: z.enum(['tools', 'articles', 'podcasts', 'videos']),
  filePath: z.string(),
  frontmatter: KnowledgeFrontmatterSchema,
  content: KnowledgeContentSchema,
  sourceBookmark: SourceBookmarkSchema.optional(),
}).refine(
  (data) => {
    // Category must match type
    const typeCategoryMap: Record<string, string> = {
      tool: 'tools',
      article: 'articles',
      podcast: 'podcasts',
      video: 'videos',
    };
    return data.category === typeCategoryMap[data.frontmatter.type];
  },
  {
    message: 'Category must match frontmatter type',
  }
);

export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;

/**
 * API request schema for creating knowledge entries
 */
export const CreateKnowledgeEntryRequestSchema = z.object({
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
  links: z.array(LinkSchema).min(1),
  sourceBookmarkId: z.string().optional(),
  
  // Optional type-specific fields
  author: z.string().optional(),
  show: z.string().optional(),
  channel: z.string().optional(),
  status: z.enum(['needs_transcript']).optional(),
});

export type CreateKnowledgeEntryRequest = z.infer<typeof CreateKnowledgeEntryRequestSchema>;

/**
 * API request schema for updating knowledge entries
 */
export const UpdateKnowledgeEntryRequestSchema = z.object({
  title: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().min(1).optional(),
  keyFeatures: z.array(z.string()).optional(),
  keyTakeaways: z.array(z.string()).optional(),
  context: z.string().optional(),
  links: z.array(LinkSchema).optional(),
  transcript: z.string().optional(),
  status: z.enum(['needs_transcript']).optional(),
});

export type UpdateKnowledgeEntryRequest = z.infer<typeof UpdateKnowledgeEntryRequestSchema>;

/**
 * Query parameters schema for listing knowledge entries
 */
export const ListKnowledgeEntriesQuerySchema = z.object({
  category: z.enum(['tools', 'articles', 'podcasts', 'videos']).optional(),
  tags: z.array(z.string()).optional(),
  type: z.enum(['tool', 'article', 'podcast', 'video']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  search: z.string().optional(),
});

export type ListKnowledgeEntriesQuery = z.infer<typeof ListKnowledgeEntriesQuerySchema>;

/**
 * API response schema for listing knowledge entries
 */
export const ListKnowledgeEntriesResponseSchema = z.object({
  entries: z.array(KnowledgeEntrySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export type ListKnowledgeEntriesResponse = z.infer<typeof ListKnowledgeEntriesResponseSchema>;

/**
 * Helper function to generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Helper function to determine category from type
 */
export function getCategoryFromType(type: KnowledgeFrontmatter['type']): KnowledgeEntry['category'] {
  const map: Record<KnowledgeFrontmatter['type'], KnowledgeEntry['category']> = {
    tool: 'tools',
    article: 'articles',
    podcast: 'podcasts',
    video: 'videos',
  };
  return map[type];
}

/**
 * Helper function to convert CreateKnowledgeEntryRequest to KnowledgeEntry
 */
export function createEntryFromRequest(
  request: CreateKnowledgeEntryRequest,
  sourceBookmark?: SourceBookmark
): KnowledgeEntry {
  const slug = generateSlug(request.title);
  const category = request.category || getCategoryFromType(request.type);
  const filePath = `knowledge/${category}/${slug}.md`;

  return {
    slug,
    category,
    filePath,
    frontmatter: {
      title: request.title,
      type: request.type,
      date_added: request.date_added,
      source: request.source,
      tags: request.tags,
      via: request.via,
      author: request.author,
      show: request.show,
      channel: request.channel,
      status: request.status,
    },
    content: {
      description: request.description,
      keyFeatures: request.keyFeatures,
      keyTakeaways: request.keyTakeaways,
      context: request.context,
      links: request.links,
    },
    sourceBookmark,
  };
}

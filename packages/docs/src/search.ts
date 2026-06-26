import { create, insert, search } from '@orama/orama'
import { loadDocsData } from './content.js'
import { embed } from './embedder.js'
import type { DocSearchHit, DocSummary, Doc, DocOutline, DocSectionContent } from './types.js'

const buildDb = async () => {
  const data = loadDocsData()
  const db = create({
    schema: {
      docSlug: 'string',
      title: 'string',
      category: 'string',
      heading: 'string',
      headingId: 'string',
      content: 'string',
      embedding: 'vector[384]',
    } as const,
  })
  for (const section of data.sections) {
    await insert(db, {
      docSlug: section.docSlug,
      title: section.title,
      category: section.category,
      heading: section.heading,
      headingId: section.headingId,
      content: section.content,
      embedding: section.embedding,
    })
  }
  return db
}

let dbPromise: ReturnType<typeof buildDb> | undefined
const getDb = () => {
  dbPromise ??= buildDb()
  return dbPromise
}

const makeSnippet = (content: string, max = 280): string => {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed
}

/** A section's reference: `slug#headingId`, or just `slug` for the page preamble (empty anchor). */
const sectionRef = (slug: string, headingId: string): string => (headingId ? `${slug}#${headingId}` : slug)

/**
 * List all docs as a table of contents, ordered by category then frontmatter index. The list is small, so pagination is
 * optional — `limit`/`offset` default to "return all" — but `total` is always reported to match the paginated shape of
 * the other tools.
 */
export const listDocs = ({ limit, offset = 0 }: { limit?: number; offset?: number } = {}): {
  docs: DocSummary[]
  total: number
  hasMore: boolean
  nextOffset: number | undefined
} => {
  const data = loadDocsData()
  const categoryOrder = new Map(data.categories.map((category, order) => [category.slug, order]))
  const sorted = data.docs
    .slice()
    .sort((a, b) => {
      const byCategory = (categoryOrder.get(a.category) ?? Infinity) - (categoryOrder.get(b.category) ?? Infinity)
      return byCategory !== 0 ? byCategory : a.index - b.index
    })
    .map((doc) => ({ slug: doc.slug, category: doc.category, title: doc.title, description: doc.description }))
  const total = sorted.length
  const docs = limit === undefined ? sorted.slice(offset) : sorted.slice(offset, offset + limit)
  const hasMore = limit !== undefined && total > offset + limit
  const nextOffset = hasMore ? offset + limit : undefined
  return { docs, total, hasMore, nextOffset }
}

/**
 * Hybrid (keyword + semantic) search across doc sections. Each hit names the precise section it matched: `headingId` is
 * the section anchor and `ref` (`slug#headingId`) is ready to hand to `getDocSectionOrUndefined` so the caller reads
 * only that section instead of the whole page.
 */
export const searchDocs = async (
  query: string,
  { limit = 8, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<{ hits: DocSearchHit[]; total: number; hasMore: boolean; nextOffset: number | undefined }> => {
  const db = await getDb()
  const vector = await embed(query)
  const results = await search(db, {
    mode: 'hybrid',
    term: query,
    vector: { value: vector, property: 'embedding' },
    limit,
    offset,
  })
  const hits = results.hits.map((hit) => ({
    slug: hit.document.docSlug,
    title: hit.document.title,
    category: hit.document.category,
    heading: hit.document.heading,
    headingId: hit.document.headingId,
    ref: sectionRef(hit.document.docSlug, hit.document.headingId),
    snippet: makeSnippet(hit.document.content),
    chars: hit.document.content.length,
    score: hit.score,
  }))
  const total = results.count
  const hasMore = total > offset + limit
  const nextOffset = hasMore ? offset + limit : undefined
  return { hits, total, hasMore, nextOffset }
}

/** Get the full markdown of a single doc by its slug (the file name, e.g. `overview`). */
export const getDocOrUndefined = (slug: string): Doc | undefined => {
  return loadDocsData().docs.find((doc) => doc.slug === slug)
}

/**
 * Get a doc's heading outline (table of contents) — every section heading with its anchor, level, and body size — or
 * `undefined` if the slug is unknown. The preamble before the first heading is omitted (it has no anchor). Use this to
 * navigate a large page, then read one section with `getDocSectionOrUndefined`.
 */
export const getDocOutlineOrUndefined = (slug: string): DocOutline | undefined => {
  const data = loadDocsData()
  const doc = data.docs.find((d) => d.slug === slug)
  if (!doc) return undefined
  const headings = data.sections
    .filter((section) => section.docSlug === slug && section.headingId !== '')
    .map((section) => ({
      headingId: section.headingId,
      heading: section.heading,
      level: section.level,
      chars: section.content.length,
    }))
  return { slug: doc.slug, title: doc.title, headings }
}

/**
 * Get a single section of a doc as markdown — the heading addressed by `headingId` plus its body, including any deeper
 * subsections nested under it (everything up to the next heading of equal-or-higher level). Returns `undefined` for an
 * unknown slug or anchor. Far smaller than `getDocOrUndefined` for large pages; pair it with a search hit's `headingId`
 * or `getDocOutlineOrUndefined`.
 */
export const getDocSectionOrUndefined = (slug: string, headingId: string): DocSectionContent | undefined => {
  if (!headingId) return undefined
  const sections = loadDocsData().sections.filter((section) => section.docSlug === slug)
  const startIndex = sections.findIndex((section) => section.headingId === headingId)
  if (startIndex === -1) return undefined
  const start = sections[startIndex]
  const collected = [start]
  for (let i = startIndex + 1; i < sections.length && sections[i].level > start.level; i++) {
    collected.push(sections[i])
  }
  const content = collected
    .map((section) => {
      const headingLine = section.level >= 2 ? `${'#'.repeat(section.level)} ${section.heading}` : ''
      return [headingLine, section.content].filter(Boolean).join('\n\n')
    })
    .join('\n\n')
    .trim()
  return { slug, headingId: start.headingId, heading: start.heading, level: start.level, content }
}

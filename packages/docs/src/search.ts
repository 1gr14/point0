import { create, insert, search } from '@orama/orama'
import { loadDocsData } from './content.js'
import { embed } from './embedder.js'
import type { DocSearchHit, DocSummary, Doc } from './types.js'

const buildDb = async () => {
  const data = loadDocsData()
  const db = create({
    schema: {
      docSlug: 'string',
      title: 'string',
      category: 'string',
      heading: 'string',
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

/** List all docs as a table of contents, ordered by category then frontmatter index. */
export const listDocs = (): DocSummary[] => {
  const data = loadDocsData()
  const categoryOrder = new Map(data.categories.map((category, order) => [category.slug, order]))
  return data.docs
    .slice()
    .sort((a, b) => {
      const byCategory = (categoryOrder.get(a.category) ?? Infinity) - (categoryOrder.get(b.category) ?? Infinity)
      return byCategory !== 0 ? byCategory : a.index - b.index
    })
    .map((doc) => ({ slug: doc.slug, category: doc.category, title: doc.title, description: doc.description }))
}

/** Hybrid (keyword + semantic) search across doc sections. */
export const searchDocs = async (query: string, limit = 8): Promise<DocSearchHit[]> => {
  const db = await getDb()
  const vector = await embed(query)
  const results = await search(db, {
    mode: 'hybrid',
    term: query,
    vector: { value: vector, property: 'embedding' },
    limit,
  })
  return results.hits.map((hit) => ({
    slug: hit.document.docSlug,
    title: hit.document.title,
    category: hit.document.category,
    heading: hit.document.heading,
    snippet: makeSnippet(hit.document.content),
    score: hit.score,
  }))
}

/** Get the full markdown of a single doc by its slug (the file name, e.g. `overview`). */
export const getDoc = (slug: string): Doc | undefined => {
  return loadDocsData().docs.find((doc) => doc.slug === slug)
}

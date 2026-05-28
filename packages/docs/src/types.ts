export type DocCategory = {
  slug: string
  label: string
}

export type Doc = {
  /** Doc slug — just the file name, e.g. `overview`. Category is cosmetic and not part of the slug. */
  slug: string
  /** Category slug, e.g. `intro`. Cosmetic only (grouping/labels). */
  category: string
  title: string
  description: string
  /** Ordering index from frontmatter. */
  index: number
  /** Full markdown body (frontmatter stripped). */
  content: string
}

export type DocSection = {
  id: string
  docSlug: string
  title: string
  category: string
  heading: string
  content: string
  embedding: number[]
}

export type DocsData = {
  model: string
  dim: number
  categories: DocCategory[]
  docs: Doc[]
  sections: DocSection[]
}

export type DocSummary = {
  slug: string
  category: string
  title: string
  description: string
}

export type DocSearchHit = {
  slug: string
  title: string
  category: string
  heading: string
  snippet: string
  score: number
}

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
  /**
   * Slugified heading anchor (GitHub / `rehype-slug` semantics, deduped per page), e.g. `server-side-rendering`.
   * Matches the on-page `#anchor` on the docs site. Empty string for the page preamble (the slice before the first
   * heading).
   */
  headingId: string
  /** Heading level 2–6; `1` marks the preamble before the first heading. */
  level: number
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
  /** Matched section heading text. */
  heading: string
  /** Section anchor within the page (empty for the preamble). Pass to `get_section` / `getDocSectionOrUndefined`. */
  headingId: string
  /** Ready-to-use reference `slug#headingId` (just `slug` for the preamble) — the precise location of this section. */
  ref: string
  snippet: string
  /** Size of the section body in characters — a cheap signal of how much `get_section` would return. */
  chars: number
  score: number
}

/** One heading in a doc's outline (table of contents), used to navigate a page before reading a section. */
export type DocOutlineEntry = {
  headingId: string
  heading: string
  /** Heading level 2–6. */
  level: number
  /** Size of this heading's own body in characters (excludes nested subsections). */
  chars: number
}

/** A doc's heading outline — every section heading with its anchor, level, and size. */
export type DocOutline = {
  slug: string
  title: string
  headings: DocOutlineEntry[]
}

/** A single resolved section: one heading and its body (including any nested subsections), as markdown. */
export type DocSectionContent = {
  slug: string
  headingId: string
  heading: string
  level: number
  /** Markdown of the heading and its body, including subsections nested under it. */
  content: string
}

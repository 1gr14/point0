import GithubSlugger from 'github-slugger'

/**
 * One section of a doc page: a single heading and the body beneath it (heading line excluded), addressed by a
 * GitHub-style anchor. This is the unit search ranks over and that `get_section` returns.
 */
export type RawSection = {
  /**
   * Slugified heading anchor (GitHub / `rehype-slug` semantics, deduped per page), e.g. `server-side-rendering`. Equals
   * the on-page `#anchor` the docs site renders, so a search hit can deep-link to it. Empty for the page preamble.
   */
  headingId: string
  /** Heading text with inline markdown (code/links/emphasis) stripped. The doc title for the preamble. */
  heading: string
  /** Heading level 2–6; `1` marks the preamble before the first heading. */
  level: number
  /** Section body with the heading line removed, trimmed. */
  content: string
}

/** Strip inline markdown (code, links, emphasis) from a raw heading line so the slug matches `rehype-slug`'s text. */
const normalizeHeading = (raw: string): string =>
  raw
    .replace(/`/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_]/g, '')
    .trim()

/**
 * Split a doc body into sections at every H2–H6 heading. Each section carries a GitHub-style anchor (matching
 * `rehype-slug`, so it equals the on-page `#anchor` and is unique within the page), its level, and its
 * heading-line-stripped body. The slice before the first heading is the preamble (level 1, empty anchor). Fenced code
 * blocks are skipped, so a `#` inside a code sample never reads as a heading.
 *
 * Every heading produces a section even when its body is empty, so the outline derived from these sections lists every
 * heading. Only an empty preamble is dropped.
 */
export const splitSections = (body: string, title: string): RawSection[] => {
  const slugger = new GithubSlugger()
  const sections: RawSection[] = []
  let current = { headingId: '', heading: title, level: 1, lines: [] as string[] }
  let inFence = false
  const flush = () => {
    const content = current.lines.join('\n').trim()
    // A real heading is always emitted (even with an empty body, to keep the outline complete); an empty preamble is not.
    if (current.headingId !== '' || content) {
      sections.push({ headingId: current.headingId, heading: current.heading, level: current.level, content })
    }
  }
  for (const line of body.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence
    }
    const match = inFence ? null : /^(#{2,6})\s+(.+?)\s*$/.exec(line)
    if (match) {
      flush()
      const heading = normalizeHeading(match[2])
      current = { headingId: slugger.slug(heading), heading, level: match[1].length, lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  flush()
  return sections.length > 0 ? sections : [{ headingId: '', heading: title, level: 1, content: body.trim() }]
}

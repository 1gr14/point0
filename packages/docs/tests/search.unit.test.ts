import { describe, expect, expectTypeOf, it } from 'bun:test'
import {
  getDocOrUndefined,
  getDocOutlineOrUndefined,
  getDocSectionOrUndefined,
  listDocs,
  searchDocs,
  type DocSearchHit,
  type DocSectionContent,
} from '../src/index.js'

describe('@point0/docs', () => {
  it('lists docs as a table of contents', () => {
    const { docs, total } = listDocs()
    expect(docs.length).toBeGreaterThan(0)
    expect(total).toBe(docs.length)
    // slug is just the file name; category is cosmetic and not part of the slug
    expect(docs.some((doc) => doc.slug === 'overview')).toBe(true)
  })

  it('paginates the table of contents', () => {
    const all = listDocs()
    const firstPage = listDocs({ limit: 1, offset: 0 })
    expect(firstPage.docs.length).toBe(1)
    expect(firstPage.total).toBe(all.total)
    expect(firstPage.hasMore).toBe(all.total > 1)
    expect(firstPage.nextOffset).toBe(all.total > 1 ? 1 : undefined)
  })

  it('gets the full content of a doc by slug', () => {
    const doc = getDocOrUndefined('overview')
    expect(doc).toBeDefined()
    expect(doc?.title).toBe('Overview')
    expect(doc?.content.length).toBeGreaterThan(0)
  })

  it('returns undefined for an unknown slug', () => {
    expect(getDocOrUndefined('nope')).toBeUndefined()
  })

  it('finds a relevant doc via hybrid semantic search', async () => {
    const { hits, total } = await searchDocs('how does server side rendering work', { limit: 5 })
    expect(hits.length).toBeGreaterThan(0)
    expect(total).toBeGreaterThanOrEqual(hits.length)
    expect(hits[0]).toHaveProperty('snippet')
    expect(hits[0]).toHaveProperty('slug')
  })

  it('addresses each search hit by heading anchor and a ready-to-use ref', async () => {
    const { hits } = await searchDocs('how does server side rendering work', { limit: 5 })
    const hit = hits[0]
    expect(typeof hit.headingId).toBe('string')
    expect(typeof hit.chars).toBe('number')
    // ref is `slug#headingId`, or just `slug` for a preamble hit (empty anchor)
    expect(hit.ref).toBe(hit.headingId ? `${hit.slug}#${hit.headingId}` : hit.slug)
  })

  it('resolves a search hit ref to exactly that section', async () => {
    const { hits } = await searchDocs('server side rendering', { limit: 8 })
    const hit = hits.find((h) => h.headingId !== '')
    expect(hit).toBeDefined()
    const section = getDocSectionOrUndefined(hit!.slug, hit!.headingId)
    expect(section).toBeDefined()
    expect(section!.headingId).toBe(hit!.headingId)
    // a single section is far smaller than the whole page
    const doc = getDocOrUndefined(hit!.slug)
    expect(section!.content.length).toBeLessThan(doc!.content.length)
  })

  it('returns a doc outline of real headings with anchors, levels, and sizes', () => {
    const outline = getDocOutlineOrUndefined('overview')
    expect(outline).toBeDefined()
    expect(outline!.title).toBe('Overview')
    expect(outline!.headings.length).toBeGreaterThan(1)
    for (const heading of outline!.headings) {
      expect(heading.headingId).not.toBe('')
      expect(heading.level).toBeGreaterThanOrEqual(2)
      expect(heading.chars).toBeGreaterThanOrEqual(0)
    }
    // every outline anchor resolves to a section
    const first = outline!.headings[0]
    expect(getDocSectionOrUndefined('overview', first.headingId)).toBeDefined()
  })

  it('includes nested subsections when reading a parent section', () => {
    // full-overview is the deep-structured page (## sections with ### subsections); the short overview is flat
    const headings = getDocOutlineOrUndefined('full-overview')!.headings
    // a real parent → child pair: a heading immediately followed in the outline by a deeper one
    const parentIndex = headings.findIndex((h, i) => headings[i + 1] && headings[i + 1].level > h.level)
    expect(parentIndex).toBeGreaterThanOrEqual(0)
    const parent = headings[parentIndex]
    const child = headings[parentIndex + 1]
    const section = getDocSectionOrUndefined('full-overview', parent.headingId)!
    const childLine = `${'#'.repeat(child.level)} ${child.heading}`
    // the parent read spans down to its subheadings (until the next same-or-higher heading)
    expect(section.content).toContain(childLine)
  })

  it('returns undefined for an unknown section or an empty anchor', () => {
    expect(getDocSectionOrUndefined('overview', 'no-such-heading')).toBeUndefined()
    expect(getDocSectionOrUndefined('overview', '')).toBeUndefined()
    expect(getDocSectionOrUndefined('nope', 'whatever')).toBeUndefined()
  })

  it('returns undefined outline for an unknown slug', () => {
    expect(getDocOutlineOrUndefined('nope')).toBeUndefined()
  })
})

// Type-level guarantees for the public search-hit / section shapes (never executed; tsgo/tsc check the body).
const _typeTests = (): void => {
  expectTypeOf<DocSearchHit>().toHaveProperty('headingId').toEqualTypeOf<string>()
  expectTypeOf<DocSearchHit>().toHaveProperty('ref').toEqualTypeOf<string>()
  expectTypeOf<DocSearchHit>().toHaveProperty('chars').toEqualTypeOf<number>()
  expectTypeOf(getDocSectionOrUndefined('overview', 'x')).toEqualTypeOf<DocSectionContent | undefined>()
}
void _typeTests

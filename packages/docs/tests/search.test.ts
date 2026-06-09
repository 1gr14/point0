import { describe, expect, it } from 'bun:test'
import { getDocOrUndefined, listDocs, searchDocs } from '../src/index.js'

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
})

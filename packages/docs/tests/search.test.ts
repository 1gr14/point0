import { describe, expect, it } from 'bun:test'
import { getDoc, listDocs, searchDocs } from '../src/index.js'

describe('@point0/docs', () => {
  it('lists docs as a table of contents', () => {
    const docs = listDocs()
    expect(docs.length).toBeGreaterThan(0)
    // slug is just the file name; category is cosmetic and not part of the slug
    expect(docs.some((doc) => doc.slug === 'overview')).toBe(true)
  })

  it('gets the full content of a doc by slug', () => {
    const doc = getDoc('overview')
    expect(doc).toBeDefined()
    expect(doc?.title).toBe('Overview')
    expect(doc?.content.length).toBeGreaterThan(0)
  })

  it('returns undefined for an unknown slug', () => {
    expect(getDoc('nope')).toBeUndefined()
  })

  it('finds a relevant doc via hybrid semantic search', async () => {
    const hits = await searchDocs('how does server side rendering work', 5)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]).toHaveProperty('snippet')
    expect(hits[0]).toHaveProperty('slug')
  })
})

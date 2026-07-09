import { describe, expect, it } from 'bun:test'
import { splitSections } from '../src/sections.js'

const md = (...lines: string[]): string => lines.join('\n')

describe('splitSections', () => {
  it('keeps the preamble before the first heading as a level-1 section with an empty anchor', () => {
    const sections = splitSections(md('Intro prose.', '', '## First', 'Body.'), 'Title')
    expect(sections[0]).toMatchObject({ headingId: '', heading: 'Title', level: 1, content: 'Intro prose.' })
  })

  it('drops an empty preamble', () => {
    const sections = splitSections(md('## First', 'Body.'), 'Title')
    expect(sections[0].headingId).toBe('first')
  })

  it('anchors each H2–H6 heading with GitHub-slugger semantics and records its level', () => {
    const sections = splitSections(md('## Server Side Rendering', 'a', '### Nested Bit', 'b'), 'Title')
    const real = sections.filter((s) => s.headingId !== '')
    expect(real).toMatchObject([
      { headingId: 'server-side-rendering', level: 2 },
      { headingId: 'nested-bit', level: 3 },
    ])
  })

  it('dedupes repeated headings the way rehype-slug does (-1, -2)', () => {
    const sections = splitSections(md('## Policies', 'a', '## Policies', 'b', '## Policies', 'c'), 'Title')
    expect(sections.map((s) => s.headingId)).toEqual(['policies', 'policies-1', 'policies-2'])
  })

  it('strips inline markdown from the heading before slugifying', () => {
    const sections = splitSections(md('## The `.with` method', 'a'), 'Title')
    expect(sections[0]).toMatchObject({ heading: 'The .with method', headingId: 'the-with-method' })
  })

  it('does not treat a # inside a fenced code block as a heading', () => {
    const sections = splitSections(md('## Real', '```ts', '## not a heading', '```', 'after'), 'Title')
    expect(sections).toHaveLength(1)
    expect(sections[0].headingId).toBe('real')
    expect(sections[0].content).toContain('## not a heading')
  })

  it('emits a heading even when its body is empty, so the outline stays complete', () => {
    const sections = splitSections(md('## Empty', '## Next', 'body'), 'Title')
    expect(sections.map((s) => s.headingId)).toEqual(['empty', 'next'])
    expect(sections[0].content).toBe('')
  })

  it('leaves an H1 in the body (only H2–H6 split)', () => {
    const sections = splitSections(md('# Big', 'prose', '## Sub', 'x'), 'Title')
    expect(sections[0]).toMatchObject({ headingId: '', level: 1 })
    expect(sections[0].content).toContain('# Big')
  })
})

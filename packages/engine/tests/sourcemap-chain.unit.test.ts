import { addMapping, GenMapping, toEncodedMap } from '@jridgewell/gen-mapping'
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping'
import { describe, expect, it } from 'bun:test'
import nodeFs from 'node:fs/promises'
import nodeOs from 'node:os'
import nodePath from 'node:path'
import { chainBundledSourceMaps, chainSourceMap } from '../src/sourcemap-chain.js'

// Build the two-level shape Bun leaves behind: a `bundle -> intermediate` map whose single source's `sourcesContent`
// is the TRANSFORMED intermediate text, and that text ends with our compiler's own inline `intermediate -> original`
// map. chainSourceMap must collapse the two so a bundle position resolves to the ORIGINAL file/line.
function makeFixture() {
  const originalAbs = '/abs/app/src/pages/page.tsx'
  const originalSrc = [
    'import { root } from "./root"',
    'const err = new Error("boom") // original line 2',
    'export {}',
  ].join('\n')

  // intermediate -> original: token sits on intermediate line 5, original line 2.
  const inner = new GenMapping()
  addMapping(inner, {
    generated: { line: 5, column: 6 },
    source: originalAbs,
    original: { line: 2, column: 12 },
    content: originalSrc,
  })
  const innerMap = toEncodedMap(inner)
  const innerBase64 = Buffer.from(JSON.stringify(innerMap), 'utf8').toString('base64')

  const intermediateText = [
    'function PagePage() {', // 1
    '  const $ = _c(1);', // 2
    '  return null;', // 3
    '}', // 4
    '  const err = new Error("boom");', // 5  <- token
    `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${innerBase64}`, // 6
  ].join('\n')

  // bundle -> intermediate: bundle line 1 col 10 maps to intermediate line 5 col 6.
  const outer = new GenMapping()
  addMapping(outer, {
    generated: { line: 1, column: 10 },
    source: 'src/pages/page.tsx', // bundle's view name
    original: { line: 5, column: 6 },
    content: intermediateText,
  })
  // Round-trip through JSON to mirror reality (Bun writes the map to disk, we read it back with JSON.parse).
  const bundleMap = JSON.parse(JSON.stringify(toEncodedMap(outer)))
  return { bundleMap, originalAbs, originalSrc }
}

describe('sourcemap-chain', () => {
  it('collapses bundle -> intermediate -> original so a bundle position resolves to the real source line', () => {
    const { bundleMap, originalSrc } = makeFixture()

    // BEFORE: the served map resolves to the transformed intermediate (line 5), not the original.
    const before = originalPositionFor(new TraceMap(bundleMap), { line: 1, column: 10 })
    expect(before.line).toBe(5)
    expect(before.source).toContain('page.tsx')

    const chained = chainSourceMap(bundleMap, '/abs/app/dist/client')
    expect(chained).not.toBeNull()

    // AFTER: resolves to the ORIGINAL file + line 2, and carries the real original content.
    const after = originalPositionFor(new TraceMap(JSON.parse(JSON.stringify(chained))), { line: 1, column: 10 })
    expect(after.line).toBe(2)
    expect(after.source).toContain('page.tsx')
    const idx = (chained?.sources ?? []).findIndex((s) => s?.includes('page.tsx'))
    expect(chained!.sourcesContent?.[idx]).toBe(originalSrc)
  })

  it('relativizes the chained source to the map dir (no absolute / file:// leak)', () => {
    const { bundleMap } = makeFixture()
    const chained = chainSourceMap(bundleMap, '/abs/app/dist/client')
    const src = (chained?.sources ?? []).find((s) => s?.includes('page.tsx')) ?? ''
    expect(src.startsWith('/')).toBe(false)
    expect(src.startsWith('file://')).toBe(false)
    expect(src).toBe('../../src/pages/page.tsx')
  })

  it('returns null when no source carries an embedded inline map (nothing to chain)', () => {
    const plain = new GenMapping()
    addMapping(plain, {
      generated: { line: 1, column: 0 },
      source: 'src/pages/plain.tsx',
      original: { line: 1, column: 0 },
      content: 'export const x = 1\n', // no inline sourceMappingURL
    })
    const plainMap = JSON.parse(JSON.stringify(toEncodedMap(plain)))
    expect(chainSourceMap(plainMap, '/abs/app/dist/client')).toBeNull()
  })
})

describe('chainBundledSourceMaps (both map shapes)', () => {
  it('chains an external `*.js.map` AND an inline map embedded in `*.js`', async () => {
    const { bundleMap } = makeFixture()
    const dir = await nodeFs.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'p0-smap-'))
    try {
      // external: a.js points at the sidecar a.js.map (which holds the bundle map)
      await nodeFs.writeFile(nodePath.join(dir, 'a.js'), 'const a=1;\n//# sourceMappingURL=a.js.map\n')
      await nodeFs.writeFile(nodePath.join(dir, 'a.js.map'), JSON.stringify(bundleMap))
      // inline: b.js carries the bundle map as a trailing data URI
      const inlineB64 = Buffer.from(JSON.stringify(bundleMap), 'utf8').toString('base64')
      await nodeFs.writeFile(
        nodePath.join(dir, 'b.js'),
        `const b=1;\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${inlineB64}\n`,
      )

      const { rewritten, total } = await chainBundledSourceMaps(dir)
      expect(rewritten).toBe(2)
      expect(total).toBe(2)

      // external sidecar now resolves to the ORIGINAL line 2
      const extMap = JSON.parse(await nodeFs.readFile(nodePath.join(dir, 'a.js.map'), 'utf8'))
      expect(originalPositionFor(new TraceMap(extMap), { line: 1, column: 10 }).line).toBe(2)

      // inline map in b.js now resolves to the ORIGINAL line 2
      const bCode = await nodeFs.readFile(nodePath.join(dir, 'b.js'), 'utf8')
      const inlineMatch = bCode.match(/base64,([A-Za-z0-9+/=]+)/)
      const inlineMap = JSON.parse(Buffer.from(inlineMatch![1], 'base64').toString('utf8'))
      expect(originalPositionFor(new TraceMap(inlineMap), { line: 1, column: 10 }).line).toBe(2)
    } finally {
      await nodeFs.rm(dir, { recursive: true, force: true })
    }
  })
})

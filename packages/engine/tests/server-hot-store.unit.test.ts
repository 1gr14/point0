import { describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import nodePath from 'node:path'
import { stronglyConnectedComponents, sweepStaleStoreFiles } from '../src/server-hot-store.js'

// Pure unit tests for the SCC primitive that drives the hot store's cycle-safe cascade hashing. The store hashes each
// SCC as a unit and rewrites intra-cycle imports to consistent names, so the two properties it relies on — correct
// PARTITION and DEPENDENCY-FIRST emission order — must hold for any graph, including cycles.

type Graph = Record<string, string[]>
// Every graph below is self-contained (each edge target is also a key), so `g[n]` is always defined here.
const sccOf = (g: Graph) => stronglyConnectedComponents(Object.keys(g), (n) => g[n] as string[])

// Assert: every node appears in exactly one component, and for every edge u->v crossing components, v's component is
// emitted BEFORE u's (deps-first). Returns the components for further assertions.
const assertPartitionAndDepsFirst = (g: Graph): string[][] => {
  const comps = sccOf(g)
  const flat = comps.flat()
  expect(flat.sort()).toEqual(Object.keys(g).sort()) // exact partition, no dup, full coverage
  const compIndexOf = new Map<string, number>()
  comps.forEach((c, i) => c.forEach((n) => compIndexOf.set(n, i)))
  for (const [u, outs] of Object.entries(g)) {
    for (const v of outs) {
      if (compIndexOf.get(u) !== compIndexOf.get(v)) {
        expect(compIndexOf.get(v)! < compIndexOf.get(u)!).toBe(true) // dependency's component comes first
      }
    }
  }
  return comps
}

describe('stronglyConnectedComponents', () => {
  it('puts each node of a DAG in its own component, dependencies first', () => {
    // page -> layout -> root ; page -> lib -> root
    const comps = assertPartitionAndDepsFirst({
      page: ['layout', 'lib'],
      layout: ['root'],
      lib: ['root'],
      root: [],
    })
    expect(comps.every((c) => c.length === 1)).toBe(true)
    expect(comps[0]).toEqual(['root']) // a sink (pure dependency) is emitted first
  })

  it('collapses a 2-cycle into one component', () => {
    const comps = assertPartitionAndDepsFirst({ a: ['b'], b: ['a'] })
    expect(comps.length).toBe(1)
    expect(comps[0]!.sort()).toEqual(['a', 'b'])
  })

  it('collapses a 3-cycle and orders an external dependent after it', () => {
    // cycle a<->b<->c ; importer -> a (so {a,b,c} must come before {importer})
    const comps = assertPartitionAndDepsFirst({
      importer: ['a'],
      a: ['b'],
      b: ['c'],
      c: ['a'],
    })
    const cycle = comps.find((c) => c.length === 3)!
    expect(cycle.sort()).toEqual(['a', 'b', 'c'])
    expect(comps.indexOf(cycle)).toBeLessThan(comps.findIndex((c) => c.includes('importer')))
  })

  it('handles a self-loop as a single-node component', () => {
    const comps = assertPartitionAndDepsFirst({ a: ['a', 'b'], b: [] })
    expect(comps.find((c) => c.includes('a'))).toEqual(['a'])
  })

  it('separates two disjoint cycles joined by a bridge', () => {
    // {a<->b} -> {c<->d}
    const comps = assertPartitionAndDepsFirst({ a: ['b', 'c'], b: ['a'], c: ['d'], d: ['c'] })
    expect(comps.length).toBe(2)
    expect(comps.every((c) => c.length === 2)).toBe(true)
  })

  it('does not stack-overflow on a long chain (iterative Tarjan)', () => {
    const g: Graph = {}
    const N = 5000
    for (let i = 0; i < N; i++) g[`n${i}`] = i + 1 < N ? [`n${i + 1}`] : []
    const comps = sccOf(g)
    expect(comps.length).toBe(N)
    expect(comps[0]).toEqual([`n${N - 1}`]) // the deepest dependency is emitted first
  })

  it('holds partition + deps-first on a larger mixed graph', () => {
    assertPartitionAndDepsFirst({
      entry: ['m1', 'm2'],
      m1: ['m3', 'm4'],
      m2: ['m4'],
      m3: ['m1'], // cycle m1<->m3
      m4: ['leaf'],
      leaf: [],
    })
  })
})

describe('sweepStaleStoreFiles', () => {
  it('deletes only stale-and-old store files, keeping current files, young files, and non-.tsx', () => {
    const now = 1_000_000_000_000
    const graceMs = 30_000
    const dir = mkdtempSync(nodePath.join(tmpdir(), 'p0-sweep-'))
    try {
      const mk = (name: string, ageMs: number) => {
        const full = nodePath.join(dir, name)
        writeFileSync(full, 'x')
        utimesSync(full, new Date(now), new Date(now - ageMs)) // fix mtime
      }
      mk('current.aaaaaaaaaaaa.tsx', 999_999) // referenced by the build → kept regardless of age
      mk('stale_old.bbbbbbbbbbbb.tsx', 100_000) // not referenced + older than grace → deleted
      mk('stale_young.cccccccccccc.tsx', 1_000) // not referenced but within grace → kept (may be mid-import)
      mk('manifest.json', 100_000) // not a .tsx → never swept

      const deleted = sweepStaleStoreFiles({
        dir,
        keep: new Set(['current.aaaaaaaaaaaa.tsx']),
        graceMs,
        now,
      })

      expect(deleted).toBe(1)
      const left = readdirSync(dir).sort()
      expect(left).toEqual(['current.aaaaaaaaaaaa.tsx', 'manifest.json', 'stale_young.cccccccccccc.tsx'])
      expect(existsSync(nodePath.join(dir, 'stale_old.bbbbbbbbbbbb.tsx'))).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('returns 0 on a missing dir without throwing', () => {
    expect(
      sweepStaleStoreFiles({
        dir: nodePath.join(tmpdir(), 'p0-nope-does-not-exist'),
        keep: new Set(),
        graceMs: 0,
        now: 1,
      }),
    ).toBe(0)
  })
})

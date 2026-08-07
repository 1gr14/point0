import { Compiler, toPosixPath } from '@point0/compiler'
import { describe, expect, it, setDefaultTimeout } from 'bun:test'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import nodePath from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  applyImportSourceRewrites,
  collectImportSourceRanges,
  ServerHotStore,
  stronglyConnectedComponents,
  sweepStaleStoreFiles,
} from '../src/server-hot-store.js'

// The SCC and rewriting tests below are microseconds, but the store-dialect ones at the bottom run the real compiler
// over a fixture tree and import what it wrote (the markdown one compiles MDX) — under the parallel runner that
// outruns bun's 5s default. Same guard, same reason as compiler.unit.test.ts.
setDefaultTimeout(30000)

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

describe('import-source rewriting', () => {
  const SPEC = '@/components/ui/section'
  const ABS = '/abs/app/src/components/ui/section.tsx'
  // The file the code came from — it decides the parser's dialect, so every call names one.
  const PAGE = '/abs/app/src/page.tsx'

  it('collects only real import / export-from / export-all / dynamic-import / require source positions', () => {
    const code = [
      `import { Section } from '@/components/ui/section'`,
      `export { Section } from '@/components/ui/section'`,
      `export * from '@/components/ui/section'`,
      `const a = await import('@/components/ui/section')`,
      `const b = require('@/components/ui/section')`,
    ].join('\n')
    const ranges = collectImportSourceRanges(code, PAGE)
    expect(ranges.map((r) => r.value)).toEqual(Array(5).fill(SPEC))
    for (const r of ranges) expect(code.slice(r.start, r.end)).toBe(`'${SPEC}'`)
  })

  // The regression: a quoted specifier sitting INSIDE a string / template literal (e.g. a page that renders
  // `import x from '@/foo'` as a code sample) is NOT a source position, so it must be left verbatim. A text-level regex
  // used to rewrite it and leak the resolved path into the SSR'd page.
  it('ignores specifier-looking text inside strings and template literals', () => {
    const code = [
      `import { Section } from '@/components/ui/section'`, // real import
      'export const sample = `// shown on the page',
      `import { Section } from '@/components/ui/section'`, // inside a template literal
      'const x = 1`',
      `const note = 'see @/components/ui/section'`, // inside a plain string
    ].join('\n')
    expect(collectImportSourceRanges(code, PAGE)).toHaveLength(1)

    const out = applyImportSourceRewrites(code, collectImportSourceRanges(code, PAGE), (s) =>
      s === SPEC ? ABS : undefined,
    )
    expect(out).toContain(`import { Section } from '${ABS}'`) // real import rewritten
    expect(out).toContain(`// shown on the page\nimport { Section } from '${SPEC}'`) // sample untouched
    expect(out).toContain(`const note = 'see @/components/ui/section'`) // plain string untouched
    expect(out.split(ABS)).toHaveLength(2) // exactly one rewrite
  })

  it('returns [] on unparseable code instead of throwing', () => {
    expect(collectImportSourceRanges('const = = =', PAGE)).toEqual([])
  })

  // The parse follows the FILE's dialect, not a fixed one. Read as JSX, `<string>x` is an unterminated tag: the parse
  // throws, the ranges come back empty, the node's imports are never rewritten — and the build reads that as a module
  // it cannot flatten and quietly drops it to cold (edit ⇒ full restart) instead of hot-swapping it.
  it('parses a .ts module as TypeScript, not JSX', () => {
    const code = `import { a } from './a.js'\nexport const n = (x: unknown) => (<string>x).length + a`
    expect(collectImportSourceRanges(code, '/abs/app/src/util.ts').map((r) => r.value)).toEqual(['./a.js'])
  })

  it('applyImportSourceRewrites keeps line structure and the original quote char', () => {
    const code = `import { Section } from "@/components/ui/section"\nconst x = 1`
    const out = applyImportSourceRewrites(code, collectImportSourceRanges(code, PAGE), () => ABS)
    expect(out.split('\n')).toHaveLength(2)
    expect(out).toContain(`from "${ABS}"`) // double quotes preserved
  })

  it('applyImportSourceRewrites leaves specifiers the resolver does not claim', () => {
    const code = `import a from '@/keep'\nimport b from '@/swap'`
    const out = applyImportSourceRewrites(code, collectImportSourceRanges(code, PAGE), (s) =>
      s === '@/swap' ? ABS : undefined,
    )
    expect(out).toBe(`import a from '@/keep'\nimport b from '${ABS}'`)
  })
})

describe('sweepStaleStoreFiles', () => {
  it('deletes only stale-and-old store files, keeping current files, young files, and non-store files', () => {
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
      // Store files come in every extension `relocatedExtension` can return, so the sweep must reclaim more than
      // `.tsx` — otherwise every flattened `.ts` module ever written would linger in the dir for the whole session.
      mk('stale_old_ts.dddddddddddd.ts', 100_000)
      mk('manifest.json', 100_000) // not a store file → never swept

      const deleted = sweepStaleStoreFiles({
        dir,
        keep: new Set(['current.aaaaaaaaaaaa.tsx']),
        graceMs,
        now,
      })

      expect(deleted).toBe(2)
      const left = readdirSync(dir).sort()
      expect(left).toEqual(['current.aaaaaaaaaaaa.tsx', 'manifest.json', 'stale_young.cccccccccccc.tsx'])
      expect(existsSync(nodePath.join(dir, 'stale_old.bbbbbbbbbbbb.tsx'))).toBe(false)
      expect(existsSync(nodePath.join(dir, 'stale_old_ts.dddddddddddd.ts'))).toBe(false)
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

// A store file is the app's module MOVED somewhere else, and the runtime picks its parser from the new name. When
// everything was written `.tsx`, Bun read every `.ts` module as JSX and `dev --hot` failed on a plain generic arrow
// (`<T>(x: T) => x`) that `dev` and `build` both accept. These run the real store over a real fixture and import what
// it wrote — the only proof that the emitted name and the emitted code agree.
describe('ServerHotStore store-file dialect', () => {
  // Two constraints on where the fixture lives. The store dir must sit under a `node_modules/` segment with no
  // "point0" after it, or `compiler.filter` claims the written files and the build's own invariant check fails — hence
  // the `node_modules/.cache/…` tail. And the tree must be INSIDE the repo, so a store file containing JSX still
  // resolves `react/jsx-dev-runtime` by walking up to the workspace's node_modules.
  const withProject = async (
    files: Record<string, string>,
    fn: (ctx: { storeDir: string; names: Record<string, string>; entryAbs: string }) => void | Promise<void>,
  ) => {
    const tempRoot = nodePath.join(__dirname, 'temp')
    mkdirSync(tempRoot, { recursive: true })
    const root = mkdtempSync(nodePath.join(tempRoot, 'p0-store-'))
    try {
      const appSrcDir = nodePath.join(root, 'src')
      mkdirSync(appSrcDir, { recursive: true })
      for (const [name, content] of Object.entries(files)) writeFileSync(nodePath.join(appSrcDir, name), content)
      const storeDir = nodePath.join(root, 'node_modules/.cache/server-hot/one-0')
      mkdirSync(storeDir, { recursive: true })

      const entryAbs = nodePath.join(appSrcDir, 'entry.tsx')
      const compiler = Compiler.create({ side: 'server', scope: 'one', mode: 'development' })
      const store = ServerHotStore.forBuild({ dir: storeDir, appSrcDir, compiler, log: () => {} })
      store.registerAggregator(entryAbs)
      store.rebuild()

      // Store filenames are `<sanitized source base>_<hash>.<hash>.<ext>`, so the source each one came from is
      // readable off the front — enough to assert per-source without reaching into the build result.
      const names: Record<string, string> = {}
      for (const name of readdirSync(storeDir)) {
        const base = name.split('_')[0] as string
        if (base !== 'manifest.json') names[base] = name
      }
      await fn({ storeDir, names, entryAbs })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }

  it('gives every module the extension it came in with, and the whole graph imports', async () => {
    await withProject(
      {
        // Every line here is legal `.ts` and an unterminated tag in `.tsx`: a generic arrow, an `async` one, and the
        // angle-bracket type assertion.
        'util.ts': `export const identity = <T>(x: T): T => x
export const wait = async <T>(x: T): Promise<T> => x
export const len = (x: unknown) => (<string>x).length`,
        'view.tsx': `export const view = () => <div id="v">hi</div>`,
        // Plain JS. It lands as `.mjs`, not `.js`: the plugin gives `.js` the `js` loader, and `.mjs` is the name
        // whose by-extension loader matches that — `.js` here would be jsx-enabled, i.e. looser than dev and build.
        'plain.js': `export const shout = (s) => s + '!'`,
        'widget.jsx': `export const widget = () => <span id="w">w</span>`,
        'legacy.cjs': `const two = 2\nmodule.exports = { two }`,
        'entry.tsx': `import { identity, len, wait } from './util.js'
import { view } from './view.js'
import { shout } from './plain.js'
import { widget } from './widget.jsx'
import legacy from './legacy.cjs'
export const mark = async () =>
  shout(await wait(identity('MARK'))) + len('!') + legacy.two + (view() && widget() ? '' : '')`,
      },
      async ({ storeDir, names, entryAbs }) => {
        expect(names.util).toMatch(/\.ts$/)
        expect(names.view).toMatch(/\.tsx$/)
        expect(names.plain).toMatch(/\.mjs$/)
        expect(names.widget).toMatch(/\.jsx$/)
        expect(names.legacy).toMatch(/\.cjs$/)
        expect(names.entry).toMatch(/\.tsx$/)

        // The name is only half of it — the runtime has to accept every file under its new name.
        const mod = (await import(pathToFileURL(nodePath.join(storeDir, names.entry as string)).href)) as {
          mark: () => Promise<string>
        }
        expect(await mod.mark()).toBe('MARK!12')

        // And the manifest still points the child at the entry it registered.
        const manifest = JSON.parse(readFileSync(nodePath.join(storeDir, 'manifest.json'), 'utf8')) as {
          aggregators: Record<string, string>
        }
        expect(Object.values(manifest.aggregators)).toEqual([names.entry])
        // Posix, not the native join: the store normalizes every path it keys on, so the watcher's native-separator
        // events land in the same sets. Asserting the native form passes on macOS and fails on Windows.
        expect(Object.keys(manifest.aggregators)).toEqual([toPosixPath(entryAbs)])
      },
    )
  })

  it('is no more permissive than the file it moved', async () => {
    // The other direction of the rule, and why the fix is "keep the extension" rather than "pick the permissive one".
    // A `.js` file gets Bun's `js` loader, which rejects TypeScript — so type annotations in a `.js` file are an error
    // in `dev` and in `build`. Naming the store copy `.tsx` quietly made them legal under `--hot` alone: hot mode ran
    // code the other two modes refuse. It has to fail here exactly as it fails there.
    await withProject(
      {
        'bad.js': `export const n: number = 1`,
        'jsxbad.js': `export const view = () => <div>nope</div>`,
        'entry.tsx': `import { n } from './bad.js'\nimport { view } from './jsxbad.js'\nexport const v = [n, view]`,
      },
      async ({ storeDir, names }) => {
        expect(names.bad).toMatch(/\.mjs$/)
        expect(names.jsxbad).toMatch(/\.mjs$/)
        await expect(import(pathToFileURL(nodePath.join(storeDir, names.entry as string)).href)).rejects.toThrow()
      },
    )
  })

  it('rewrites markdown to .mjs, since no runtime loads markdown as code', async () => {
    // `.md`/`.mdx`/`.mdc` are compiled to plain JS before they reach the store, and `js` is also the loader the
    // non-hot path gives the original file — so this rewrite keeps the two paths identical rather than breaking the
    // rule.
    await withProject(
      {
        'note.mdx': `# Title\n\nSome text.`,
        'entry.tsx': `import Note from './note.mdx'\nexport const has = typeof Note === 'function'`,
      },
      async ({ storeDir, names }) => {
        expect(names.note).toMatch(/\.mjs$/)
        const mod = (await import(pathToFileURL(nodePath.join(storeDir, names.entry as string)).href)) as {
          has: boolean
        }
        expect(mod.has).toBe(true)
      },
    )
  })

  it('flattens a .ts module rather than dropping it to cold', async () => {
    // The quieter half of the same bug: a `.ts` module read as JSX can fail the import-range parse, come back with no
    // ranges, and keep its relative specifier — which the build reads as un-flattenable and externalizes. The node
    // stays correct but stops hot-swapping, so nothing fails; edits just silently start costing a full restart.
    await withProject(
      {
        'util.ts': `export const len = (x: unknown) => (<string>x).length`,
        'entry.tsx': `import { len } from './util.js'
export const n = len('abc')`,
      },
      ({ storeDir, names }) => {
        const entryCode = readFileSync(nodePath.join(storeDir, names.entry as string), 'utf8')
        expect(entryCode).toContain(`'./${names.util as string}'`) // rewritten to the store name, i.e. hot
        expect(entryCode).not.toContain(`'./util.js'`) // not left pointing at the real path, i.e. not cold
      },
    )
  })
})

import { describe, expect, it } from 'bun:test'
import * as nodePath from 'node:path'
import {
  buildPreloadManifest,
  chunkGraphFromBunMetafile,
  chunkGraphFromRollup,
  isModulePreloadDisabledByEnv,
  renderModulePreloadLinks,
  resolvePreloadsForPoint,
  shouldServeModulePreload,
  staticClosure,
  type ChunkGraph,
} from '../src/preload-manifest.js'

const outdir = nodePath.join(process.cwd(), 'dist', 'client')

// Mirrors a real Bun.build metafile (verified shape): outputs keyed cwd-relative, imports carry `kind`
// (import-statement = static, dynamic-import = lazy), entryPoint set on the html entry + each dynamic entry.
const bunMetafile = {
  outputs: {
    'dist/client/entry.js': {
      entryPoint: 'src/index.html',
      inputs: { 'src/index.client.tsx': {} },
      imports: [
        { path: 'dist/client/chunk-shared.js', kind: 'import-statement' },
        { path: 'dist/client/chunk-home.js', kind: 'dynamic-import' },
        { path: 'dist/client/chunk-about.js', kind: 'dynamic-import' },
      ],
    },
    'dist/client/chunk-shared.js': {
      inputs: { 'src/lib/shared.ts': {} },
      imports: [{ path: 'dist/client/chunk-vendor.js', kind: 'import-statement' }],
    },
    'dist/client/chunk-vendor.js': { inputs: { 'node_modules/react/index.js': {} }, imports: [] },
    'dist/client/chunk-home.js': {
      entryPoint: 'src/pages/home.tsx',
      inputs: { 'src/pages/home.tsx': {} },
      imports: [{ path: 'dist/client/chunk-shared.js', kind: 'import-statement' }],
    },
    'dist/client/chunk-about.js': {
      entryPoint: 'src/pages/about.tsx',
      inputs: { 'src/pages/about.tsx': {} },
      imports: [{ path: 'dist/client/chunk-heavy.js', kind: 'import-statement' }],
    },
    'dist/client/chunk-heavy.js': { inputs: { 'node_modules/shiki/index.js': {} }, imports: [] },
  },
}

describe('preload-manifest: bun metafile', () => {
  it('normalizes the graph to public paths and finds the entry by the html entryPoint', () => {
    const graph = chunkGraphFromBunMetafile({ metafile: bunMetafile, outdir, indexHtmlKey: 'src/index.html' })
    expect(graph.entryFile).toBe('/entry.js')
    expect(graph.chunks['/entry.js'].staticImports).toEqual(['/chunk-shared.js'])
    expect(graph.chunks['/entry.js'].dynamicImports.sort()).toEqual(['/chunk-about.js', '/chunk-home.js'])
    expect(graph.chunks['/chunk-home.js'].entryPoint).toBe('src/pages/home.tsx')
  })

  it('entryPreload is the entry static closure (shared+vendor), NOT the lazy page chunks', () => {
    const graph = chunkGraphFromBunMetafile({ metafile: bunMetafile, outdir, indexHtmlKey: 'src/index.html' })
    const manifest = buildPreloadManifest({ graph })
    expect(manifest.entry).toBe('/entry.js')
    expect(manifest.entryPreload.sort()).toEqual(['/chunk-shared.js', '/chunk-vendor.js'])
    // lazy page chunks must never leak into the always-eager set
    expect(manifest.entryPreload).not.toContain('/chunk-home.js')
    expect(manifest.entryPreload).not.toContain('/chunk-heavy.js')
  })

  it('per-route extras = page chunk + its closure, minus what entryPreload already covers', () => {
    const graph = chunkGraphFromBunMetafile({ metafile: bunMetafile, outdir, indexHtmlKey: 'src/index.html' })
    const manifest = buildPreloadManifest({
      graph,
      pages: [
        { name: 'home', sourceFiles: ['src/pages/home.tsx'] },
        { name: 'about', sourceFiles: ['src/pages/about.tsx'] },
      ],
    })
    // home's only static dep (shared) is already in entryPreload → just the page chunk
    expect(manifest.byPoint['home']).toEqual(['/chunk-home.js'])
    // about pulls a heavy chunk NOT in the entry closure → both preloaded for that route
    expect(manifest.byPoint['about'].sort()).toEqual(['/chunk-about.js', '/chunk-heavy.js'])
  })
})

describe('preload-manifest: rollup (vite) output', () => {
  it('builds an equivalent manifest from rollup chunks (imports vs dynamicImports)', () => {
    const graph = chunkGraphFromRollup({
      chunks: [
        {
          type: 'chunk',
          fileName: 'entry.js',
          isEntry: true,
          imports: ['chunk-shared.js'],
          dynamicImports: ['chunk-home.js'],
          moduleIds: ['/abs/src/index.client.tsx'],
        },
        {
          type: 'chunk',
          fileName: 'chunk-shared.js',
          isEntry: false,
          imports: [],
          dynamicImports: [],
          moduleIds: ['/abs/src/lib/shared.ts'],
        },
        {
          type: 'chunk',
          fileName: 'chunk-home.js',
          isEntry: false,
          imports: ['chunk-shared.js'],
          dynamicImports: [],
          facadeModuleId: '/abs/src/pages/home.tsx',
          moduleIds: ['/abs/src/pages/home.tsx'],
        },
        { type: 'asset', fileName: 'style.css' },
      ],
    })
    expect(graph.entryFile).toBe('/entry.js')
    const manifest = buildPreloadManifest({
      graph,
      pages: [{ name: 'home', sourceFiles: ['/abs/src/pages/home.tsx'] }],
    })
    expect(manifest.entryPreload).toEqual(['/chunk-shared.js'])
    expect(manifest.byPoint['home']).toEqual(['/chunk-home.js'])
  })
})

describe('preload-manifest: helpers', () => {
  it('staticClosure follows only static edges, transitively, without cycles blowing up', () => {
    const graph: ChunkGraph = {
      entryFile: '/a.js',
      chunks: {
        '/a.js': { staticImports: ['/b.js'], dynamicImports: [], inputs: [] },
        '/b.js': { staticImports: ['/c.js', '/a.js'], dynamicImports: ['/d.js'], inputs: [] },
        '/c.js': { staticImports: [], dynamicImports: [], inputs: [] },
        '/d.js': { staticImports: [], dynamicImports: [], inputs: [] },
      },
    }
    expect(staticClosure(graph, '/a.js').sort()).toEqual(['/b.js', '/c.js'])
  })

  it('resolvePreloadsForPoint merges entry closure + route extras, dedupes, drops the entry itself', () => {
    const manifest = {
      entry: '/entry.js',
      entryPreload: ['/chunk-shared.js'],
      byPoint: { home: ['/chunk-home.js', '/chunk-shared.js'] },
    }
    expect(resolvePreloadsForPoint(manifest, 'home')).toEqual(['/chunk-shared.js', '/chunk-home.js'])
    expect(resolvePreloadsForPoint(manifest, 'missing')).toEqual(['/chunk-shared.js'])
  })

  it('renders crossorigin modulepreload links', () => {
    expect(renderModulePreloadLinks(['/chunk-a.js'])).toBe('<link rel="modulepreload" crossorigin href="/chunk-a.js">')
  })
})

describe('preload-manifest: layouts ride the page static closure (no explicit layout tracking)', () => {
  it("a page that statically imports a separately-chunked layout preloads the layout chunk via the page's closure", () => {
    // Mirrors the real shape: the layout is its OWN chunk (it's a dynamic-import entry from the aggregator), AND the
    // page chunk STATICALLY imports it (a page is authored as `generalLayout.lets('page', …)`, so it imports the
    // layout module). That static edge means staticClosure(pageChunk) already contains the layout chunk — so we feed
    // buildPreloadManifest ONLY the page's source file and still get the layout chunk in byPoint. This is why
    // PagePreloadSources carries no layout files.
    const graph: ChunkGraph = {
      entryFile: '/entry.js',
      chunks: {
        '/entry.js': { staticImports: [], dynamicImports: ['/page-home.js', '/layout-general.js'], inputs: [] },
        '/page-home.js': {
          staticImports: ['/layout-general.js'],
          dynamicImports: [],
          entryPoint: '/abs/src/pages/home.tsx',
          inputs: ['/abs/src/pages/home.tsx'],
        },
        '/layout-general.js': {
          staticImports: [],
          dynamicImports: [],
          entryPoint: '/abs/src/layouts/general.tsx',
          inputs: ['/abs/src/layouts/general.tsx'],
        },
      },
    }
    const manifest = buildPreloadManifest({
      graph,
      pages: [{ name: 'home', sourceFiles: ['/abs/src/pages/home.tsx'] }],
    })
    expect(manifest.byPoint['home']!.sort()).toEqual(['/layout-general.js', '/page-home.js'])
  })
})

describe('modulepreload gating policy', () => {
  it('isModulePreloadDisabledByEnv: only false/0/off disable; default on', () => {
    for (const off of ['false', '0', 'off']) {
      expect(isModulePreloadDisabledByEnv(off)).toBe(true)
    }
    for (const on of [undefined, '', 'true', '1', 'on', 'yes', 'whatever']) {
      expect(isModulePreloadDisabledByEnv(on)).toBe(false)
    }
  })

  it('shouldServeModulePreload: PROD-build-only — never serves until built, even with a stale manifest', () => {
    // The dev regression: build.was=false (dev / builder process) must NEVER inject, regardless of the env flag or a
    // leftover dist manifest.
    expect(shouldServeModulePreload({ buildWas: false, envFlag: undefined })).toBe(false)
    expect(shouldServeModulePreload({ buildWas: false, envFlag: 'true' })).toBe(false)
    // built prod runtime: on by default, off only via the kill switch.
    expect(shouldServeModulePreload({ buildWas: true, envFlag: undefined })).toBe(true)
    expect(shouldServeModulePreload({ buildWas: true, envFlag: 'false' })).toBe(false)
    expect(shouldServeModulePreload({ buildWas: true, envFlag: 'off' })).toBe(false)
  })
})

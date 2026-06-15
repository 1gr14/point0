import { describe, expect, it } from 'bun:test'
import * as nodePath from 'node:path'
import {
  buildPreloadManifest,
  chunkGraphFromBunMetafile,
  chunkGraphFromRollup,
  parseAggregatorPoints,
  renderModulePreloadLinks,
  resolvePreloadsForPoint,
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

describe('preload-manifest: parseAggregatorPoints', () => {
  // Mirrors the canonical generated lazy aggregator, plus a statically-imported point and a bare identifier entry.
  const aggregator = `import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from '../../lib/root.js'
import { staticPage } from '../../pages/static.js'
export default [
  root_0,
  {
    type: 'layout',
    name: 'general',
    route: undefined,
    polh: false,
    layouts: [],
    point: async () => (await import('../../layouts/general.js')).generalLayout,
  },
  {
    type: 'page',
    name: 'home',
    route: '/',
    polh: false,
    layouts: ['general'],
    point: async () => (await import('../../pages/home.js')).homePage,
  },
  {
    type: 'page',
    name: 'staticPage',
    route: '/s',
    polh: false,
    layouts: ['general'],
    point: staticPage,
  },
  {
    type: 'page',
    name: 'about',
    route: '/about',
    polh: false,
    layouts: [],
    point: async () => (await import('../../pages/about.js')).aboutPage,
  },
]`

  it('extracts type/name/layouts/importSpec for lazy points', () => {
    const points = parseAggregatorPoints(aggregator)
    const home = points.find((p) => p.name === 'home')
    expect(home).toEqual({ type: 'page', name: 'home', layoutNames: ['general'], importSpec: '../../pages/home.js' })
    const general = points.find((p) => p.name === 'general')
    expect(general?.importSpec).toBe('../../layouts/general.js')
  })

  it('a statically-imported point yields importSpec undefined and does NOT grab a neighbour entry import', () => {
    const points = parseAggregatorPoints(aggregator)
    const staticPage = points.find((p) => p.name === 'staticPage')
    expect(staticPage?.importSpec).toBeUndefined()
    // the next entry keeps its own import (no cross-entry bleed)
    expect(points.find((p) => p.name === 'about')?.importSpec).toBe('../../pages/about.js')
  })
})

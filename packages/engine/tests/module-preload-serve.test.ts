import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
import { PRELOAD_MANIFEST_BASENAME, type PreloadManifest } from '../src/preload-manifest.js'
import { bundlers } from './utils/focus.js'
import type {
  TestProjectOneClient,
  TestProjectOneClientFactoryCreateProjectOptions,
} from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(15000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'preload',
  portsRange: [3600, 3699],
})

type ItFn = (done: (err?: unknown) => void) => void | Promise<void>

function wrp(
  options: TestProjectOneClientFactoryCreateProjectOptions,
  callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>,
): ItFn {
  const tp = tpf.create(options)
  return async () => {
    try {
      await tp.init()
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await tp.cleanup({ files: true, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: true, ports: true, processes: true })
      throw error
    }
  }
}

describe('preload', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  afterAll(async () => {
    void tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  describe.each(bundlers)('%s', (bundler) => {
    it(
      'emits a preload manifest and injects per-page modulepreload (entry closure + the requested page) into the HTML',
      wrp({ ssr: true, vite: bundler === 'vite' }, async ({ tp, engine }) => {
        await tp.write(
          'src/page.tsx',
          `import { root } from './lib/root.js'
          export const page = root.lets('page', 'home', '/').page(() => <div id="probe">HOME PAGE</div>)`,
        )
        await tp.write(
          'src/other.tsx',
          `import { root } from './lib/root.js'
          export const otherPage = root.lets('page', 'other', '/other').page(() => <div id="probe">OTHER PAGE ONLY HERE</div>)`,
        )
        // A layout used by exactly one page, and the page built ON it (the page module statically imports the layout —
        // that's how a page is authored). The layout is its own lazy point (own chunk), but the page's STATIC import of
        // it means the layout's code rides the page chunk's static closure — so it lands in byPoint WITHOUT us ever
        // resolving the layout's source file. This is the case that justifies dropping explicit layout tracking.
        await tp.write(
          'src/special-layout.tsx',
          `import { root } from './lib/root.js'
          export const specialLayout = root.lets('layout', 'specialLayout').layout(({ children }) => <div id="special-layout-probe">{children}</div>)`,
        )
        await tp.write(
          'src/withlayout.tsx',
          `import { specialLayout } from './special-layout.js'
          export const withLayoutPage = specialLayout.lets('page', 'withLayout', '/withlayout').page(() => <div id="probe">WITH LAYOUT PAGE</div>)`,
        )
        await tp.generate()
        const bp = tp.spawn(['bun', 'run', 'build'])
        await bp.exited

        // 1) the build emitted a preload manifest next to the client chunks
        const manifestPath = tp.resolve('dist', 'client', PRELOAD_MANIFEST_BASENAME)
        expect(await Bun.file(manifestPath).exists()).toBe(true)
        const manifest = JSON.parse(await Bun.file(manifestPath).text()) as PreloadManifest
        expect(manifest.entry).toMatch(/\.js$/)
        expect(manifest.entryPreload).not.toContain(manifest.entry)
        // Bun splits shared static deps (react/core/…) into their own chunks → a non-trivial entry closure. Vite/rolldown
        // inlines all static deps INTO the one entry chunk and only splits dynamic imports, so its entry closure is
        // legitimately empty (the entry <script> already carries it).
        if (bundler === 'bun') {
          expect(manifest.entryPreload.length).toBeGreaterThan(0)
        }
        // 2) each lazy page got its own per-point preload set (its lazy chunk, which is never in the entry closure)
        expect(manifest.byPoint['home'].length).toBeGreaterThan(0)
        expect(manifest.byPoint['other'].length).toBeGreaterThan(0)
        // the page with its own layout got a per-point set too (built from the page's source file alone)
        expect(manifest.byPoint['withLayout'].length).toBeGreaterThan(0)
        for (const chunk of [
          ...manifest.entryPreload,
          ...manifest.byPoint['home']!,
          ...manifest.byPoint['other']!,
          ...manifest.byPoint['withLayout']!,
        ]) {
          expect(chunk).toMatch(/^\/.*\.js$/)
        }
        // chunks unique to /other (not shared with home or the entry closure) — must preload ONLY on /other
        const otherOnly = manifest.byPoint['other']!.filter(
          (c) => !manifest.entryPreload.includes(c) && !(manifest.byPoint['home'] ?? []).includes(c),
        )
        expect(otherOnly.length).toBeGreaterThan(0)

        tp.spawn(['bun', 'run', 'start'])
        await tp.waitStarted(engine.server.port)

        // 3) GET / preloads entry closure + home's chunks, one <link> per chunk, and NOT /other's unique chunk
        const homeHtml = await tp.fetchServerHtml('/')
        expect(homeHtml).toContain('<div id="probe">HOME PAGE')
        const expectedHome = [...new Set([...manifest.entryPreload, ...manifest.byPoint['home']!])]
        for (const chunk of expectedHome) {
          expect(homeHtml).toContain(`<link rel="modulepreload" crossorigin href="${chunk}">`)
        }
        for (const chunk of otherOnly) {
          expect(homeHtml).not.toContain(`href="${chunk}"`)
        }
        expect((homeHtml.match(/rel="modulepreload"/g) ?? []).length).toBe(expectedHome.length)

        // 4) GET /other preloads entry closure + other's chunks (incl. its unique chunk)
        const otherHtml = await tp.fetchServerHtml('/other')
        expect(otherHtml).toContain('OTHER PAGE ONLY HERE')
        const expectedOther = [...new Set([...manifest.entryPreload, ...manifest.byPoint['other']!])]
        for (const chunk of expectedOther) {
          expect(otherHtml).toContain(`<link rel="modulepreload" crossorigin href="${chunk}">`)
        }
        expect((otherHtml.match(/rel="modulepreload"/g) ?? []).length).toBe(expectedOther.length)

        // 5) the layout's code is actually in the page's preload set — even though we never resolved the layout's
        // source file. We feed buildPreloadManifest only the page's own file; the layout rides the page chunk's static
        // closure. Whether the bundler keeps the layout as its own chunk or inlines it into the page chunk, its code
        // ends up in byPoint['withLayout']. And it must NOT be in a page that doesn't use it.
        const readChunks = async (chunks: string[]): Promise<string> =>
          (await Promise.all(chunks.map(async (c) => (await tp.fetchServer(c)).text()))).join('\n')
        const withLayoutHtml = await tp.fetchServerHtml('/withlayout')
        expect(withLayoutHtml).toContain('WITH LAYOUT PAGE')
        expect(withLayoutHtml).toContain('special-layout-probe') // SSR proves the layout is wired to the page
        expect(await readChunks(manifest.byPoint['withLayout']!)).toContain('special-layout-probe')
        expect(await readChunks(manifest.byPoint['home']!)).not.toContain('special-layout-probe')
      }),
      { timeout: 120000 },
    )
  })
})

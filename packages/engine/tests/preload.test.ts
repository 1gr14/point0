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
        for (const chunk of [...manifest.entryPreload, ...manifest.byPoint['home']!, ...manifest.byPoint['other']!]) {
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
      }),
      { timeout: 120000 },
    )
  })
})

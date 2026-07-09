import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { getClientBuildVersionPathSegments, type ClientBuildVersionFile } from '../src/client-build-version.js'
import { bundlers } from './utils/focus.js'
import type { PlaywrightPage } from './utils/playwright.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(300000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'stale',
  portsRange: [3020, 3099],
})

// A layout with links, a home page with a mutation button (the proactive header channel), and a lazy "other" page
// whose chunk changes between the two builds — the deploy swap invalidates exactly that chunk.
const layoutTsx = `import { root } from '../lib/root.js'
import { Link } from '../lib/navigate.js'
export const layout = root.lets('layout', 'staleLayout', '/')
  .layout(({ children }) => (
    <>
      <nav>
        <Link id="link-home" to="/">home</Link>
        <Link id="link-other" to="/other">other</Link>
      </nav>
      {children}
    </>
  ))
`

const homeTsx = `import { root } from '../lib/root.js'
import { layout } from './layout.js'
export const stalePingMutation = root.lets('mutation', 'stalePing').loader(() => ({ ok: 1 })).mutation()
export const staleHomePage = layout.lets('page', 'staleHome', '/').page(() => {
  const mutation = stalePingMutation.useMutation()
  return (
    <div id="home">
      <button id="ping" onClick={() => mutation.mutate()}>ping</button>
      <div id="pong">pong={mutation.data?.ok ?? 'no'}</div>
    </div>
  )
})
`

const otherTsx = (marker: string) => `import { layout } from './layout.js'
export const staleOtherPage = layout.lets('page', 'staleOther', 'other').page(() => (
  <div id="other">OTHER_MARKER_${marker}</div>
))
`

// A createNavigation with a custom stale handler that takes full ownership (returns nothing): the framework must
// neither document-navigate nor commit the failed client navigation.
const navigateCustomStaleTsx = `import { createNavigation } from '@point0/react-dom/router'
import { navigate as browserNavigate, useBrowserLocation as hook } from 'wouter/use-browser-location'
import { routes } from './routes.js'

export const { navigate, Link, NavLink, Redirect, Router, RouterRoutes, redirect } = createNavigation({
  routes,
  navigate: browserNavigate,
  hook,
  Page404: () => <div>Page Not Found</div>,
  stale: (ctx) => {
    document.title = 'STALE:' + ctx.latestBuildVersion
  },
})
`

// Click through the DOM, not through Playwright's mouse — same rationale as the scroll tests: no implicit
// scroll-into-view side effects, and it works identically across the CDP/win32 launch path.
const clickLink = async (page: PlaywrightPage, selector: string): Promise<void> => {
  await page.original.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!(el instanceof HTMLElement)) {
      throw new Error(`No element for selector: ${sel}`)
    }
    el.click()
  }, selector)
}

// The SPA sentinel: set on the loaded document, it survives any client-side navigation and dies with the document —
// its disappearance is the proof a FULL document navigation happened.
const setSentinel = async (page: PlaywrightPage): Promise<void> => {
  await page.original.evaluate(() => {
    ;(window as unknown as { __SPA_SENTINEL__?: boolean }).__SPA_SENTINEL__ = true
  })
}
const hasSentinel = async (page: PlaywrightPage): Promise<boolean> => {
  return await page.original.evaluate(
    () => (window as unknown as { __SPA_SENTINEL__?: boolean }).__SPA_SENTINEL__ === true,
  )
}

const waitPathname = async (page: PlaywrightPage, pathname: string, timeout = 10000): Promise<void> => {
  const start = Date.now()
  while (new URL(page.original.url()).pathname !== pathname) {
    if (Date.now() - start > timeout) {
      throw new Error(`Timeout waiting for pathname ${pathname}, last seen ${new URL(page.original.url()).pathname}`)
    }
    await new Promise((r) => setTimeout(r, 100))
  }
}

const readBuildVersion = async (tp: TestProjectOneClient): Promise<string> => {
  const filePath = tp.resolve('dist', 'client', ...getClientBuildVersionPathSegments('root'))
  return (JSON.parse(await Bun.file(filePath).text()) as ClientBuildVersionFile).buildVersion
}

const buildProject = async (tp: TestProjectOneClient): Promise<void> => {
  const buildProcess = tp.spawn(['bun', 'run', 'build'])
  const exitCode = await buildProcess.exited
  if (exitCode !== 0) {
    throw new Error(`Build failed with code ${exitCode}:\n${buildProcess.output}`)
  }
}

describe('client-build-stale', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
  })

  afterAll(async () => {
    void tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  describe.each(bundlers)('%s', (bundler) => {
    it(`emits the build handshake and recovers open tabs with a document navigation after a redeploy`, async () => {
      const tp = tpf.create({ ssr: true, vite: bundler === 'vite' })
      try {
        await tp.init()
        await tp.write('src/stale/layout.tsx', layoutTsx)
        await tp.write('src/stale/home.tsx', homeTsx)
        await tp.write('src/stale/other.tsx', otherTsx('A'))
        await tp.generate()
        await buildProject(tp)

        // 1) the build emitted the version file and stamped the dist html with the version + entry guard
        const versionA = await readBuildVersion(tp)
        expect(versionA).toMatch(/^[0-9a-f]{16}$/)
        const distHtml = await Bun.file(tp.resolve('dist', 'client', 'index.html')).text()
        expect(distHtml).toContain(`window.__POINT0_CLIENT_BUILD_VERSION__ = "${versionA}"`)
        expect(distHtml).toContain('__POINT0_STALE_ENTRY_GUARD__')

        let serverProcess = tp.spawn(['bun', 'run', 'start'])
        const engine = await tp.importEngine()
        await tp.waitStarted(engine.server.port)

        // 2) serve-time handshake: the version header on every scope-attributable response, and the version file
        // served from the same base the chunks load from
        const htmlResponse = await tp.fetchServer('/')
        expect(htmlResponse.headers.get('x-point0-client-build')).toBe(`root:${versionA}`)
        const versionResponse = await tp.fetchServer('/_point0/root/build-version.json')
        expect(versionResponse.status).toBe(200)
        expect(((await versionResponse.json()) as ClientBuildVersionFile).buildVersion).toBe(versionA)
        expect(versionResponse.headers.get('x-point0-client-build')).toBe(`root:${versionA}`)
        // a missing chunk is an honest JSON 404 — never an HTML fallback (whose text/html MIME would make the
        // import failure undiagnosable)
        const missingResponse = await tp.fetchServer('/chunk-deadbeefdeadbeef.js', { headers: { accept: '*/*' } })
        expect(missingResponse.status).toBe(404)
        expect(missingResponse.headers.get('content-type') ?? '').not.toContain('text/html')

        // 3) two tabs open on build A — they will outlive the deploy
        const tabReactive = await tp.gotoServer('/')
        await tabReactive.waitContent('#home')
        await setSentinel(tabReactive)
        const tabProactive = await tp.gotoServer('/')
        await tabProactive.waitContent('#home')
        await setSentinel(tabProactive)

        // 4) the redeploy: the other page changes, the rebuild wipes dist (old chunk hashes are GONE), restart
        await serverProcess.killTree()
        await tp.cleanup('ports')
        await tp.write('src/stale/other.tsx', otherTsx('B'))
        await buildProject(tp)
        const versionB = await readBuildVersion(tp)
        expect(versionB).not.toBe(versionA)
        serverProcess = tp.spawn(['bun', 'run', 'start'])
        await tp.waitStarted(engine.server.port)

        // 5) REACTIVE: the old tab navigates → its chunk URL 404s → the stale check confirms a newer build →
        // full document navigation lands on the TARGET page, on the new build
        await clickLink(tabReactive, '#link-other')
        await tabReactive.waitContent('OTHER_MARKER_B', 20000)
        expect(await hasSentinel(tabReactive)).toBe(false)
        expect(new URL(tabReactive.original.url()).pathname).toBe('/other')

        // 6) PROACTIVE: a mutation response carries the new build's header → the tab is marked stale → the NEXT
        // navigation leaves the SPA without even trying the dead chunk
        await clickLink(tabProactive, '#ping')
        await tabProactive.waitContent('pong=1', 10000)
        await clickLink(tabProactive, '#link-other')
        await tabProactive.waitContent('OTHER_MARKER_B', 20000)
        expect(await hasSentinel(tabProactive)).toBe(false)
        expect(new URL(tabProactive.original.url()).pathname).toBe('/other')

        await tp.cleanup({ files: true, ports: true, processes: true })
      } catch (error) {
        await tp.cleanup({ files: true, ports: true, processes: true })
        throw error
      }
    })
  })

  // The remaining scenarios exercise policy branches that are bundler-independent — run them once, on the bun build.

  it('a custom stale handler takes ownership: no document navigation, no commit, context delivered', async () => {
    const tp = tpf.create({ ssr: true })
    try {
      await tp.init()
      await tp.write('src/lib/navigate.tsx', navigateCustomStaleTsx)
      await tp.write('src/stale/layout.tsx', layoutTsx)
      await tp.write('src/stale/home.tsx', homeTsx)
      await tp.write('src/stale/other.tsx', otherTsx('A'))
      await tp.generate()
      await buildProject(tp)
      let serverProcess = tp.spawn(['bun', 'run', 'start'])
      const engine = await tp.importEngine()
      await tp.waitStarted(engine.server.port)

      const tab = await tp.gotoServer('/')
      await tab.waitContent('#home')
      await setSentinel(tab)

      await serverProcess.killTree()
      await tp.cleanup('ports')
      await tp.write('src/stale/other.tsx', otherTsx('B'))
      await buildProject(tp)
      const versionB = await readBuildVersion(tp)
      serverProcess = tp.spawn(['bun', 'run', 'start'])
      await tp.waitStarted(engine.server.port)

      await clickLink(tab, '#link-other')
      // the handler ran with the latest version in its context…
      const start = Date.now()
      while ((await tab.original.title()) !== `STALE:${versionB}`) {
        if (Date.now() - start > 15000) {
          throw new Error(`Timeout waiting for the stale title, last seen "${await tab.original.title()}"`)
        }
        await new Promise((r) => setTimeout(r, 100))
      }
      // …and the framework backed off entirely: same document, no navigation committed
      expect(await hasSentinel(tab)).toBe(true)
      expect(new URL(tab.original.url()).pathname).toBe('/')
      await tab.waitContent('#home')

      await tp.cleanup({ files: true, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: true, ports: true, processes: true })
      throw error
    }
  })

  it('a genuine network failure (build unchanged) surfaces the error — never a reload', async () => {
    const tp = tpf.create({ ssr: true })
    try {
      await tp.init()
      await tp.write('src/stale/layout.tsx', layoutTsx)
      await tp.write('src/stale/home.tsx', homeTsx)
      await tp.write('src/stale/other.tsx', otherTsx('A'))
      await tp.generate()
      await buildProject(tp)
      tp.spawn(['bun', 'run', 'start'])
      const engine = await tp.importEngine()
      await tp.waitStarted(engine.server.port)

      const tab = await tp.gotoServer('/')
      await tab.waitContent('#home')
      await setSentinel(tab)

      // Cut ONLY the chunk loads — the build-version.json check still answers, and answers "same version":
      // this is a network hiccup, not a deploy, so recovery-by-reload must NOT kick in.
      await tab.original.route('**/*.js', (route) => route.abort())
      await clickLink(tab, '#link-other')
      // the navigation commits with the error state (pinned current behavior: no document navigation, app alive)
      await waitPathname(tab, '/other')
      expect(await hasSentinel(tab)).toBe(true)

      await tp.cleanup({ files: true, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: true, ports: true, processes: true })
      throw error
    }
  })
})

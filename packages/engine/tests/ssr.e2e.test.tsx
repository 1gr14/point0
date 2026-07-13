import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(45000)

// The per-point SSR switch, end-to-end: a temp dev project (bun bundler, ports 4000-4049) driven
// through real Chromium plus raw `fetch()` of the page URLs for the server HTML + the dev-only
// `x-point0-discovery-renders` header. Proves three things the in-process harness cannot observe
// from HTTP: a plain page is server-rendered (SSR on), `.ssr(false)` ships the bare shell and lets
// the browser render the body (an SPA section), and `.ssr({ allowedDiscoveryRenders })` caps the
// SSR discovery-pass count per page. See scripts/slow-tests.ts — this is a SLOW shard (dev boot +
// browser).
//
// note: bun-bundler only. The switch is bundler-agnostic (the compiler strip + the executor's
// discovery loop / header are the same code for both bundlers, exercised by the vite half of
// suspend.slow), so a second vite dev server would only double the boot time without new coverage.

// The pages written into the temp dev project. A distinct file per concern, all discovered by the
// walker under src/.
const writeSsrPages = async (project: TestProjectOneClient) => {
  // Plain SSR page at `/` — the baseline: its body is rendered into the server HTML.
  await project.write(
    'src/ssr/home.tsx',
    `import { root } from '../lib/root.js'
export const homePage = root.lets('page', 'home', '/').page(() => <div id="home">SSR_ON_BODY</div>)
`,
  )
  // `.ssr(false)` — an SPA section. The compiler strips this page's render (body AND its positional
  // loading) from the server build, and the fetcher's SSR gate ships the bare document shell for it,
  // so neither marker is in the server HTML; the browser renders the body after hydration.
  await project.write(
    'src/ssr/spa.tsx',
    `import { root } from '../lib/root.js'
export const spaPage = root
  .lets('page', 'spa', '/spa')
  .ssr(false)
  .loading(() => <div id="spa-loading">SPA_LOADING</div>)
  .page(() => <div id="spa-body">SPA_BODY</div>)
`,
  )
  // Two never-stabilizing pages, identical but for the cap: each stages a NEW SsrStore value on
  // every render (a module counter, so it never settles), so the SSR discovery loop runs exactly
  // `allowedDiscoveryRenders` passes before the soft cap stops it quietly — the header then reads
  // the cap. Each page owns its store key so the two never interfere.
  await project.write(
    'src/ssr/renders.tsx',
    `import { root } from '../lib/root.js'
import { useEffectSsr } from '@point0/core'
import { SsrStore } from '@point0/core/ssr-store'

let n1 = 0
const churn1 = SsrStore.define('ssr.slow.churn.r1', () => 'init')
export const renders1Page = root
  .lets('page', 'renders1', '/renders-1')
  .ssr({ allowedDiscoveryRenders: 1 })
  .page(() => {
    useEffectSsr(() => {
      churn1.set('v' + n1++)
    }, [])
    return <div id="renders1">R1_BODY</div>
  })

let n3 = 0
const churn3 = SsrStore.define('ssr.slow.churn.r3', () => 'init')
export const renders3Page = root
  .lets('page', 'renders3', '/renders-3')
  .ssr({ allowedDiscoveryRenders: 3 })
  .page(() => {
    useEffectSsr(() => {
      churn3.set('v' + n3++)
    }, [])
    return <div id="renders3">R3_BODY</div>
  })
`,
  )
  // A page that uses `useId` the way Radix does (an id on one node, referenced from another). React's `useId` encodes
  // tree position relative to the render root, so if the server rendered the app under a different root than the
  // client hydrates (the `#root` boundary), every id here would be offset — a "won't be patched up" hydration
  // mismatch under React 19.2. The engine renders the app AS the `#root` root so the ids match; this page proves it
  // end-to-end in a real browser.
  await project.write(
    'src/ssr/useid.tsx',
    `import { root } from '../lib/root.js'
import { useId } from 'react'
export const useIdPage = root.lets('page', 'useid', '/useid').page(() => {
  const id = useId()
  return (
    <div id="useid">
      <span id={id}>USEID_BODY</span>
      <button aria-describedby={id}>USEID_BTN</button>
      <i id="useid-probe" data-uid={id} />
    </div>
  )
})
`,
  )
}

// Boot a temp dev project with the SSR-switch pages, with the retry-over-ports pattern the other
// dev-server suites use.
const bootSsrProject = async (tpf: TestProjectOneClientFactory): Promise<TestProjectOneClient> => {
  let tp: TestProjectOneClient | undefined
  const tries = 3
  for (let tryIndex = 0; tryIndex < tries; tryIndex++) {
    tp = tpf.create()
    try {
      await tp.cleanup('ports')
      await tp.init()
      await writeSsrPages(tp)
      tp.spawn(['bun', 'run', 'dev'])
      await tp.waitStarted()
      break
    } catch (error) {
      await tp.cleanup({ files: true, processes: true, ports: true })
      if (tryIndex === tries - 1) {
        throw error
      }
    }
  }
  // warm every route so the first ASSERTED fetch never races a cold on-demand compile
  await tp!.fetchServerHtml('/')
  await tp!.fetchServerHtml('/spa')
  await tp!.fetchServerHtml('/renders-1')
  await tp!.fetchServerHtml('/renders-3')
  await tp!.fetchServerHtml('/useid')
  return tp!
}

const discoveryRendersHeader = 'x-point0-discovery-renders'

describe('ssr switch e2e (browser)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'ssr',
    portsRange: [4000, 4049],
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await bootSsrProject(tpf)
  }, 120000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('SSR on by default: the page body is server-rendered into the HTML', async () => {
    const res = await tp.fetchServer('/')
    const html = await res.text()
    // the page body is in the server response — this was real SSR
    expect(html).toContain('SSR_ON_BODY')
    // the dev-only header reports at least one discovery/render pass ran on the server
    const renders = res.headers.get(discoveryRendersHeader)
    expect(renders).not.toBeNull()
    expect(Number(renders)).toBeGreaterThanOrEqual(1)
    // and the browser shows the same server-rendered body
    const page = await tp.gotoServer('/')
    await page.waitContent('SSR_ON_BODY', 10000)
    await page.close()
  })

  it('.ssr(false) makes an SPA section: server ships the shell, the browser renders the body', async () => {
    const res = await tp.fetchServer('/spa')
    const html = await res.text()
    // The page opted out of SSR: the fetcher's gate fails and ships the bare document shell,
    // matching the compiler which stripped this page's render from the server build. So the server
    // HTML carries NEITHER the body NOR the page's own positional loading (that loading is a
    // client-side flash, never server HTML for a page-level `.ssr(false)`).
    expect(html).not.toContain('SPA_BODY')
    expect(html).not.toContain('SPA_LOADING')
    // no SSR ran, so the dev-only discovery-renders header is absent (or 0)
    const renders = res.headers.get(discoveryRendersHeader)
    expect(renders === null || renders === '0').toBe(true)
    // after hydration the browser mounts the page and renders the body client-side
    const page = await tp.gotoServer('/spa')
    await page.waitContent('SPA_BODY', 10000)
    await page.stable
    expect(page.preview).toContain('SPA_BODY')
    await page.close()
  })

  it('.ssr({ allowedDiscoveryRenders }) tunes the SSR render count', async () => {
    // Both pages never stabilize; the ONLY difference is the per-point cap. The header reading back
    // the cap (1 vs 3) — not the forbidden-cap default of 25 — is the proof that `.ssr({...})` on the
    // page reached the SSR discovery loop. The soft cap stops quietly, so the response is a normal
    // 200 with the rendered body (no SSR error page).
    const res1 = await tp.fetchServer('/renders-1')
    const html1 = await res1.text()
    expect(res1.status).toBe(200)
    expect(html1).toContain('R1_BODY')
    expect(res1.headers.get(discoveryRendersHeader)).toBe('1')

    const res3 = await tp.fetchServer('/renders-3')
    const html3 = await res3.text()
    expect(res3.status).toBe(200)
    expect(html3).toContain('R3_BODY')
    expect(res3.headers.get(discoveryRendersHeader)).toBe('3')
  })

  it('useId is stable across SSR and hydration (no mismatch)', async () => {
    // The server bakes a `useId` value into the HTML (on `#useid-probe`); the client, hydrating at `#root`, must
    // recompute the SAME value. It only does if the app is rendered at the same tree position on both sides — which
    // is exactly what the `#root`-as-render-root fix guarantees.
    const res = await tp.fetchServer('/useid')
    const html = await res.text()
    const serverId = /<i id="useid-probe" data-uid="([^"]+)"/.exec(html)?.[1] ?? null
    expect(serverId, `no server useId found in HTML:\n${html.slice(0, 600)}`).toBeTruthy()

    const page = await tp.gotoServer('/useid')
    await page.waitContent('USEID_BODY', 10000)
    await page.stable
    // The value React renders after hydration. A tree-position offset makes React 19.2 throw out the server subtree
    // and regenerate it with a DIFFERENT id — so equality here is the whole invariant.
    const clientId = await page.original.evaluate(
      () => document.querySelector('#useid-probe')?.getAttribute('data-uid') ?? null,
    )
    expect(clientId).toBe(serverId)
    // Belt-and-suspenders: React (dev) logs a hydration error on a useId mismatch — assert none was logged.
    const hydrationErrors = page.logs.filter((l) => /hydrat|did not match|Recoverable/i.test(l.text))
    expect(hydrationErrors.map((l) => l.text)).toEqual([])
    await page.close()
  })
})

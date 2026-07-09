import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(60000)

// RSC e2e — a real dev server + a real Chromium, then a real production build, ON BOTH BUNDLERS
// (ports 4100-4199, one sub-range per describe). Covers what the in-process harness
// (rsc.int.test.tsx) cannot: hydration of SSR-shipped element payloads (zero refetch, zero
// hydration errors), interactive islands, `.clientOnly()` islands, a component point living in
// its OWN FILE (aggregator lazy record → its own chunk, loaded on demand), and the compiler strip
// guarantees (server code out of the client bundle, client-only render out of the server bundle).
// The vite describes run the SAME shared assertions — RSC is bundler-independent by design
// (mini-Flight in the data transformer, no react-server module graph), and these prove it: the
// only bundler-specific seams are the aggregator's dynamic imports (chunk splitting), the chunk
// graph feeding the preload manifest, and the compiler strip in each bundler's plugin.
//
// The tests are SERIAL on purpose (`it`, not `it.concurrent`) — they share one dev project and
// one browser, same as suspend.test.tsx.

// The fixture pages. Markers:
// - SERVER_ONLY_MARKER lives in a server component's output — it must exist in the server bundle
//   and NEVER in the client bundle (the loader and its imports are stripped).
// - LONELY_CLIENT_MARKER lives in a `.clientOnly()` component's render — it must exist in the
//   client bundle and NEVER in the server bundle (clientOnly cuts the render from the server).
const writeRscPages = async (project: TestProjectOneClient) => {
  await project.write(
    'src/rsc/home.tsx',
    `import { root } from '../lib/root.js'
import { Link } from '../lib/navigate.js'
export const homePage = root.lets('page', 'home', '/').page(() => (
  <div id="home">
    home
    <Link to="/rsc">go-rsc</Link>
    <Link to="/warm">go-warm</Link>
    <Link to="/defer-island">go-defer-island</Link>
    <Link to="/promise-prop">go-promise-prop</Link>
  </div>
))
`,
  )
  // the interactive island — its own file, imported ONLY inside loaders below
  await project.write(
    'src/rsc/cta.tsx',
    `import { useState } from 'react'
import { root } from '../lib/root.js'
export const RscCta = root.lets('component', 'rscCta').component(() => {
  const [count, setCount] = useState(0)
  return (
    <button id="cta" onClick={() => setCount((c) => c + 1)}>
      clicks={count}
    </button>
  )
})
`,
  )
  // the client-only island — never server-rendered, its render body never in the server bundle
  await project.write(
    'src/rsc/lonely.tsx',
    `import { root } from '../lib/root.js'
export const LonelyBadge = root.lets('component', 'lonelyBadge').clientOnly().component(() => (
  <div id="lonely">LONELY_CLIENT_MARKER</div>
))
`,
  )
  await project.write(
    'src/rsc/page.tsx',
    `import { root } from '../lib/root.js'
import { RscCta } from './cta.js'
import { LonelyBadge } from './lonely.js'

const ServerInfo = async ({ n }: { n: number }) => {
  return <b id="hero">hero-{n}-SERVER_ONLY_MARKER</b>
}

export const rscPage = root.lets('page', 'rscPage', '/rsc')
  .rsc({ depth: 1 })
  .loader(async () => ({
    n: 1,
    hero: <ServerInfo n={7} />,
    cta: <RscCta />,
    lonely: <LonelyBadge />,
  }))
  .page(({ data }) => (
    <main id="rsc-page">
      {data.hero}
      {data.cta}
      {data.lonely}
    </main>
  ))
`,
  )
  await project.write(
    'src/rsc/warm.tsx',
    `import { root } from '../lib/root.js'
import { RscCta } from './cta.js'
export const promoQuery = root.lets('query', 'promo')
  .rsc({ depth: 1 })
  .loader(async () => ({ hero: <b id="hero-w">W!</b>, cta: <RscCta /> }))
  .query()
export const warmPage = root.lets('page', 'warmPage', '/warm')
  .onPrefetchPage(async () => {
    await promoQuery.prefetchQuery()
  })
  .page(() => {
    const query = promoQuery.useQuery()
    return (
      <main id="warm-page">
        {query.data ? (
          <>
            {query.data.hero}
            {query.data.cta}
          </>
        ) : (
          <span id="warm-pending">pending</span>
        )}
      </main>
    )
  })
`,
  )
  // three deferred server subtrees at different speeds — each streams into the shell independently and
  // displays as it lands. DEFER_SERVER_MARKER lives in a server component → must be stripped from the
  // client bundle like any server component.
  await project.write(
    'src/rsc/defer.tsx',
    `import { defer } from '@point0/core'
import { root } from '../lib/root.js'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const Fast = async () => {
  await sleep(150)
  return <div id="d-fast">FAST_DEFER</div>
}
const Med = async () => {
  await sleep(700)
  return <div id="d-med">MED_DEFER</div>
}
const Slow = async () => {
  await sleep(1400)
  return <div id="d-slow">DEFER_SERVER_MARKER</div>
}

export const deferPage = root.lets('page', 'deferPage', '/defer')
  .rsc({ depth: 1 })
  .loader(async () => ({
    fast: defer(<Fast />, <span id="d-fast-fb">fast-loading</span>),
    med: defer(<Med />, <span id="d-med-fb">med-loading</span>),
    slow: defer(<Slow />, <span id="d-slow-fb">slow-loading</span>),
  }))
  .page(({ data }) => (
    <main id="defer-page">
      {data.fast}
      {data.med}
      {data.slow}
    </main>
  ))
`,
  )
  // a server component that WRAPS an island — proves a nested island still hydrates and stays
  // interactive (the SSR hydration limitation is about defer holes, not about nesting in server markup).
  await project.write(
    'src/rsc/nested.tsx',
    `import { root } from '../lib/root.js'
import { RscCta } from './cta.js'

const ServerWrap = async () => (
  <div id="server-wrap">
    NESTED_SERVER_MARKER
    <RscCta />
  </div>
)

export const nestedPage = root.lets('page', 'nestedPage', '/nested-island')
  .loader(async () => <ServerWrap />)
  .page(({ data }) => <main id="nested-page">{data}</main>)
`,
  )
  // Phase 2 payoff: a defer hole whose subtree WRAPS an interactive island. On a CLIENT navigation the hole renders
  // fresh on the client (no Fizz $RC), so the island inside it is LIVE — the exact thing an SSR hole can't hydrate.
  await project.write(
    'src/rsc/defer-island.tsx',
    `import { defer } from '@point0/core'
import { root } from '../lib/root.js'
import { RscCta } from './cta.js'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const SlowIsland = async () => {
  await sleep(600)
  return (
    <div id="di-wrap">
      DEFER_ISLAND_MARKER
      <RscCta />
    </div>
  )
}

export const deferIslandPage = root.lets('page', 'deferIslandPage', '/defer-island')
  .rsc({ depth: 1 })
  .loader(async () => ({
    fast: <span id="di-fast">DEFER_ISLAND_FAST</span>,
    slow: defer(<SlowIsland />, <span id="di-fb">island-loading</span>),
  }))
  .page(({ data }) => (
    <main id="defer-island-page">
      {data.fast}
      {data.slow}
    </main>
  ))
`,
  )
  // The contrast to defer: a slow query that returns an interactive island as element data, streamed on SSR via
  // suspend:'server' (not defer). An island revealed through the QUERY channel stays live on first paint (observer).
  await project.write(
    'src/rsc/suspend-island.tsx',
    `import { root } from '../lib/root.js'
import { RscCta } from './cta.js'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const slowIslandQuery = root.lets('query', 'slowIsland')
  .rsc({ depth: 1 })
  .loader(async () => { await sleep(600); return { cta: <RscCta /> } })
  .query()

export const suspendIslandPage = root.lets('page', 'suspendIslandPage', '/suspend-island')
  .loading(() => <span id="si-loading">si-loading</span>)
  .page(() => {
    const q = slowIslandQuery.useQuery(undefined, { suspend: 'server' })
    return <main id="suspend-island-page">SUSPEND_ISLAND {q.data?.cta}</main>
  })
`,
  )
  // The exact "put the loader on the island itself" pattern: an interactive island that fetches its OWN slow data with
  // suspend:'server' inside its body (top-level, no defer). Stays live once its own query streams in (same observer).
  await project.write(
    'src/rsc/self-suspend.tsx',
    `import { useState } from 'react'
import { root } from '../lib/root.js'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const selfSlowQuery = root.lets('query', 'selfSlow')
  .loader(async () => { await sleep(600); return { label: 'DATA_READY' } })
  .query()

export const SelfSuspendIsland = root.lets('component', 'selfSuspendIsland').component(() => {
  const q = selfSlowQuery.useQuery(undefined, { suspend: 'server' })
  const [n, setN] = useState(0)
  return <button id="cta" onClick={() => setN((c) => c + 1)}>{q.data?.label} clicks={n}</button>
})

export const selfSuspendPage = root.lets('page', 'selfSuspendPage', '/self-suspend')
  .loading(() => <span id="ss-loading">ss-loading</span>)
  .page(() => <main id="self-suspend-page">SELF_SUSPEND <SelfSuspendIsland /></main>)
`,
  )
  // defer's 3rd arg: a per-hole error fallback. The deferred subtree throws on the server; its error fallback renders in
  // its place (scoped to the hole) and the rest of the page survives — the root error boundary is never hit.
  await project.write(
    'src/rsc/defer-error.tsx',
    `import { defer } from '@point0/core'
import { root } from '../lib/root.js'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const BoomServer = async () => {
  await sleep(300)
  throw new Error('DEFER_BOOM_SECRET')
}

export const deferErrorPage = root.lets('page', 'deferErrorPage', '/defer-error')
  .rsc({ depth: 1 })
  .loader(async () => ({
    ok: <span id="de-ok">DEFER_ERROR_OK</span>,
    slow: defer(<BoomServer />, <span id="de-fb">de-loading</span>, <span id="de-err">DEFER_ERROR_FALLBACK</span>),
  }))
  .page(({ data }) => <main id="defer-error-page">{data.ok}{data.slow}</main>)
`,
  )
  // "islands within islands, each with its OWN loader": a component point whose loader ships data AND wraps a SECOND
  // component point whose loader ships its own data. Both resolve server-side, both hydrate, both stay interactive.
  await project.write(
    'src/rsc/nested-loaders.tsx',
    `import { useState } from 'react'
import { root } from '../lib/root.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const InnerLoaderIsland = root.lets('component', 'innerLoaderIsland')
  .loader(async () => { await sleep(200); return { label: 'INNER_LOADER_DATA' } })
  .component(({ data }) => {
    const [n, setN] = useState(0)
    return <button id="inner-cta" onClick={() => setN((c) => c + 1)}>{data.label} inner={n}</button>
  })

export const OuterLoaderIsland = root.lets('component', 'outerLoaderIsland')
  .loader(async () => { await sleep(200); return { label: 'OUTER_LOADER_DATA' } })
  .component(({ data }) => {
    const [n, setN] = useState(0)
    return (
      <div id="outer-wrap">
        <button id="outer-cta" onClick={() => setN((c) => c + 1)}>{data.label} outer={n}</button>
        <InnerLoaderIsland />
      </div>
    )
  })

export const nestedLoadersPage = root.lets('page', 'nestedLoadersPage', '/nested-loaders')
  .rsc({ depth: 1 })
  .loader(async () => ({ island: <OuterLoaderIsland /> }))
  .page(({ data }) => <main id="nested-loaders-page">{data.island}</main>)
`,
  )
  // defer's 3rd arg as a FUNCTION: a server component throws a TYPED error; the function fallback renders its \`code\`. In
  // a real browser this proves the whole error path — a typed throw is preserved (not flattened to the RSC hint), and it
  // reaches the fallback projected, code intact.
  await project.write(
    'src/rsc/defer-error-fn.tsx',
    `import { defer, ErrorPoint0 } from '@point0/core'
import { root } from '../lib/root.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BoomTyped = async () => {
  await sleep(300)
  throw new ErrorPoint0('typed defer failure', { code: 'DEFER_TYPED_CODE' })
}

export const deferErrorFnPage = root.lets('page', 'deferErrorFnPage', '/defer-error-fn')
  .rsc({ depth: 1 })
  .loader(async () => ({
    slow: defer(<BoomTyped />, <span id="def-fb">def-loading</span>, (error) => <span id="def-err">CODE:{String(error.code)}</span>),
  }))
  .page(({ data }) => <main id="defer-error-fn-page">{data.slow}</main>)
`,
  )
  // Promises as island props: the loader hands still-resolving promises straight to island props; each island reads
  // its prop with React 19 use() behind its OWN Suspense. One prop resolves before the shell (the fill is buffered and
  // applied before hydration), one resolves ~1.5s later (the boundary reveals after hydration started) — BOTH islands
  // must be live on the first SSR paint: the island itself is never inside a server-revealed hole, and its use()
  // thenable is the client's own (from the t:3 decode), which is exactly why the defer-hole limitation does not apply.
  await project.write(
    'src/rsc/promise-prop.tsx',
    `import { Suspense, use, useState } from 'react'
import { root } from '../lib/root.js'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const StatsReader = ({ data }: { data: Promise<string> }) => <span className="pp-value">{use(data)}</span>

export const PromiseWidget = root.lets<{ tag?: string; stats?: Promise<string> }>('component', 'promiseWidget')
  .component(({ props }) => {
    const [n, setN] = useState(0)
    return (
      <div id={'pp-' + props.tag}>
        <button id={'pp-btn-' + props.tag} onClick={() => setN((c) => c + 1)}>{props.tag}-clicks={n}</button>
        <Suspense fallback={<span id={'pp-fb-' + props.tag}>{props.tag}-loading</span>}>
          <StatsReader data={props.stats!} />
        </Suspense>
      </div>
    )
  })

export const promisePropPage = root.lets('page', 'promisePropPage', '/promise-prop')
  .rsc({ depth: 1 })
  .loader(async () => ({
    fast: <PromiseWidget tag="fast" stats={Promise.resolve('PP_FAST_VALUE')} />,
    slow: <PromiseWidget tag="slow" stats={sleep(1500).then(() => 'PP_SLOW_VALUE')} />,
  }))
  .page(({ data }) => (
    <main id="promise-prop-page">
      {data.fast}
      {data.slow}
    </main>
  ))
`,
  )
  // A defer slower than Bun's default 10s idleTimeout (and typical proxy idle windows): only the stream heartbeats
  // keep the socket alive until the subtree lands — this page/action pair is fetched by the idle-reaper survival test.
  await project.write(
    'src/rsc/slow-stream.tsx',
    `import { defer } from '@point0/core'
import { root } from '../lib/root.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const VerySlow = async () => {
  await sleep(12000)
  return <b id="slow12">SLOW-12S-MARKER</b>
}

export const slowStreamPage = root.lets('page', 'slowStreamPage', '/slow-stream')
  .rsc({ depth: 1 })
  .loader(async () => ({ slow: defer(<VerySlow />, <span id="slow12-fb">slow12-waiting</span>) }))
  .page(({ data }) => <main id="slow-stream-page">{data.slow}</main>)

export const slowStreamAction = root.lets('action', 'slowStreamAction', 'GET', '/api/slow-stream')
  .rsc({ depth: 1 })
  .loader(async () => ({ slow: defer(<VerySlow />, <span>slow12-waiting</span>) }))
  .action()
`,
  )
}

const bootRscProject = async (
  tpf: TestProjectOneClientFactory,
  options: { spawn?: 'dev' | 'none' } = {},
): Promise<TestProjectOneClient> => {
  let tp: TestProjectOneClient | undefined
  const tries = 3
  for (let tryIndex = 0; tryIndex < tries; tryIndex++) {
    tp = tpf.create()
    try {
      await tp.cleanup('ports')
      await tp.init()
      await writeRscPages(tp)
      if (options.spawn !== 'none') {
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
      }
      break
    } catch (error) {
      await tp.cleanup({ files: true, processes: true, ports: true })
      if (tryIndex === tries - 1) {
        throw error
      }
    }
  }
  return tp!
}

// ——— The shared assertion bodies. Each runs identically against the bun and vite projects: the
// observable RSC contract (SSR html, hydration, islands, strip, chunks, manifest, preloads) must
// not depend on the bundler. ———

// Slow streams survive idle reapers — the regression that motivated the heartbeats: Bun's default idleTimeout kills a
// SILENT response after 10s (and reverse proxies carry idle windows of their own), so a legitimately slow defer used
// to die mid-stream on a real socket. 12 seconds of real wall-clock against a real server is the whole point; the two
// channels (SSR document push and NDJSON data fetch) run concurrently, so the test costs ~12s, not 24. Channel
// behavior is bundler-independent — this runs in ONE describe (dev) rather than all four.
const expectSlowStreamsSurviveIdleReapers = async (tp: TestProjectOneClient) => {
  const [html, ndjson] = await Promise.all([
    tp.fetchServerHtml('/slow-stream'),
    (async () => {
      const response = await tp.fetchServer('/api/slow-stream', { headers: { 'x-point0-stream': 'true' } })
      return await response.text()
    })(),
  ])
  // the SSR shell shipped the fallback and the fill's push script arrived ~12s later on the SAME response
  expect(html).toContain('slow12-waiting')
  expect(html).toContain('SLOW-12S-MARKER')
  // the NDJSON stream stayed open through the silence (heartbeat blank lines) and delivered the fill line
  expect(ndjson).toContain('"t":2')
  expect(ndjson).toContain('SLOW-12S-MARKER')
}

// SSR html: server component and island rendered, clientOnly island absent, payload encoded.
const expectRscSsrHtml = async (tp: TestProjectOneClient) => {
  const html = await tp.fetchServerHtml('/rsc')
  // the server component rendered on the server
  expect(html).toContain('SERVER_ONLY_MARKER')
  // the island server-rendered with its initial state
  expect(html).toContain('clicks=')
  // the `.clientOnly()` island did NOT server-render
  expect(html).not.toContain('LONELY_CLIENT_MARKER')
  // the dehydrated payload carries encoded elements and component references by name
  expect(html).toContain('__p0e')
  expect(html).toContain('rscCta')
  expect(html).toContain('lonelyBadge')
}

// Direct load: hydration is clean, no refetch, islands interactive, clientOnly appears after
// hydration.
const expectRscDirectLoadFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/rsc')
  await page.waitContent('#hero', 15000)
  await page.waitContent('clicks=0', 15000)
  // the clientOnly island renders only in the browser — after hydration
  await page.waitContent('LONELY_CLIENT_MARKER', 15000)
  await page.stable
  // the page loader data shipped in the dehydrated store — the client must not refetch it
  expect(page.requestsTale).not.toContain('page.rsc-page (data)')
  // boundaries can mask hydration mismatches — the client logs them explicitly, catch that
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('recoverable hydration/render error')
  expect(logsText).not.toContain('Hydration')
  expect(logsText).not.toContain('RSC:')
  // the island is ALIVE: its handler works after hydration
  await page.original.click('#cta')
  await page.waitContent('clicks=1', 10000)
  await page.close()
}

// onPrefetchPage warm-up: the RSC query ships warm — zero client refetch. Also the sharpest probe
// of the server-side client-points collection (eager on the server): the warmed payload survives
// a server-cache decode → encode roundtrip into the SSR embed without suspending.
const expectRscWarmFlow = async (tp: TestProjectOneClient) => {
  // the warmed query renders into the SSR html — no pending fallback anywhere
  const warmHtml = await tp.fetchServerHtml('/warm')
  expect(warmHtml).toContain('hero-w')
  expect(warmHtml).not.toContain('warm-pending')
  const page = await tp.gotoServer('/warm')
  await page.waitContent('#hero-w', 15000)
  await page.waitContent('clicks=0', 15000)
  await page.stable
  // the whole point of the warm-up: the query was prefetched on the server, travelled in the
  // dehydrated state, and the client never asked for it
  expect(page.requestsTale).not.toContain('query.promo')
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('recoverable hydration/render error')
  expect(logsText).not.toContain('Hydration')
  // the island inside the warmed payload is interactive
  await page.original.click('#cta')
  await page.waitContent('clicks=1', 10000)
  await page.close()
}

// Client navigation: the loader is fetched over the wire, elements decode, the island lives.
const expectRscClientNavigationFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/')
  await page.waitContent('#home')
  await page.original.getByRole('link', { name: 'go-rsc', exact: true }).click()
  await page.waitContent('#hero', 15000)
  await page.waitContent('LONELY_CLIENT_MARKER', 15000)
  // this time the loader went over the wire as a client fetch (decode path, not hydration)
  expect(page.requestsTale).toContain('page.rsc-page (data)')
  await page.original.click('#cta')
  await page.waitContent('clicks=1', 10000)
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('RSC:')
  await page.close()
}

// Deferred holes: all three server subtrees stream into the shell (fast/med/slow) and DISPLAY as they
// land, with ZERO client refetch and clean hydration (their code never shipped — rendered on the
// server). Progressive out-of-order ordering is pinned by the in-process suite (rsc.fast); this proves
// the browser sees every block and the page hydrates without a mismatch or a refetch.
const expectRscDeferFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/defer')
  await page.waitContent('FAST_DEFER', 15000)
  await page.waitContent('MED_DEFER', 15000)
  await page.waitContent('DEFER_SERVER_MARKER', 15000)
  await page.stable
  // the deferred content arrived over the SSR stream + push — the client did NOT refetch the loader
  expect(page.requestsTale).not.toContain('page.defer-page (data)')
  // clean hydration — no mismatch, no RSC decode error
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('recoverable hydration/render error')
  expect(logsText).not.toContain('Hydration')
  expect(logsText).not.toContain('RSC:')
  await page.close()
}

// An island NESTED inside a server component (plain RSC, no defer) hydrates and stays interactive —
// nesting is irrelevant, only defer holes have the hydration limitation.
const expectRscNestedIslandFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/nested-island')
  // the server component rendered its markup on the server…
  await page.waitContent('NESTED_SERVER_MARKER', 15000)
  // …and the island wrapped inside it hydrated with its initial state
  await page.waitContent('clicks=0', 15000)
  await page.stable
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('recoverable hydration/render error')
  expect(logsText).not.toContain('Hydration')
  expect(logsText).not.toContain('RSC:')
  // the nested island is ALIVE — clicking works (what a defer hole can't do, plain RSC can)
  await page.original.click('#cta')
  await page.waitContent('clicks=1', 10000)
  await page.close()
}

// Phase 2 payoff: on a CLIENT navigation a deferred hole streams over the wire (NDJSON) and renders fresh on the client
// — no Fizz `$RC` — so an interactive island INSIDE the hole is LIVE (clickable), the exact thing an SSR hole can't
// hydrate. The fast field paints first, the slow subtree streams in, and its island responds to clicks.
const expectRscDeferIslandClientNavFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/')
  await page.waitContent('#home')
  await page.original.getByRole('link', { name: 'go-defer-island', exact: true }).click()
  // the fast field paints at once — the hole holds its fallback while the subtree streams
  await page.waitContent('DEFER_ISLAND_FAST', 15000)
  await page.waitContent('island-loading', 15000)
  // the deferred subtree streams in as a client fetch and reveals its island…
  await page.waitContent('DEFER_ISLAND_MARKER', 15000)
  await page.waitContent('clicks=0', 15000)
  await page.stable
  // the loader travelled over the wire as a client fetch (the streaming data path), not hydration
  expect(page.requestsTale).toContain('page.defer-island-page (data)')
  // …and the island inside the client-fetch hole is ALIVE — clicking it updates its own state (an SSR hole can't)
  await page.original.click('#cta')
  await page.waitContent('clicks=1', 10000)
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('recoverable hydration/render error')
  expect(logsText).not.toContain('Hydration')
  expect(logsText).not.toContain('RSC:')
  await page.close()
}

// CONFIRMED (both bundlers): an interactive island stays LIVE on the first SSR load when it rides a `suspend: 'server'`
// query — unlike a defer hole. Its data streams over the query channel and its subscriber carries a react-query
// observer, which drives a client re-render when the data lands, mounting the island fresh with its handlers attached.
// That observer is exactly what a defer hole lacks (it relies on the Fizz reveal, which React never re-hydrates).
const expectSuspendIslandSsrFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/suspend-island')
  await page.waitContent('SUSPEND_ISLAND', 15000)
  await page.waitContent('clicks=0', 15000)
  await page.stable
  await page.original.click('#cta')
  // short window — a dead island never reaches clicks=1, so this fails fast instead of hanging 15s
  await page.waitContent('clicks=1', 5000)
  await page.close()
}

// PIN the documented Phase-1 limitation as a real test: an interactive island INSIDE a `defer` hole displays on the
// first SSR load but its handlers are NOT wired — React completes the server-revealed boundary and never re-enters.
const expectDeferIslandSsrDeadFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/defer-island')
  await page.waitContent('DEFER_ISLAND_MARKER', 15000)
  await page.waitContent('clicks=0', 15000)
  await page.stable
  await page.original.click('#cta')
  // give a live island time to react; a dead one stays at clicks=0
  await page.original.waitForTimeout(800)
  expect(await page.original.locator('#cta').first().textContent()).toContain('clicks=0')
  await page.close()
}

// CONFIRMED (both bundlers): the "loader on the island itself" pattern — an island fetching its OWN slow data with
// suspend:'server' inside its body (top-level, no defer) — is also live on the first SSR load, same observer rescue. So
// the rule holds both ways: interactive slow content on SSR → suspend (island or query), never defer.
const expectSelfSuspendIslandSsrFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/self-suspend')
  await page.waitContent('SELF_SUSPEND', 15000)
  await page.waitContent('DATA_READY', 15000)
  await page.waitContent('clicks=0', 15000)
  await page.stable
  await page.original.click('#cta')
  await page.waitContent('clicks=1', 5000)
  await page.close()
}

// defer's 3rd arg on SSR: the deferred subtree throws on the server, its per-hole error fallback streams into the hole,
// the fast field survives, and the page never falls to the root error boundary (both markers rendering proves it).
const expectDeferErrorFallbackSsrFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/defer-error')
  await page.waitContent('DEFER_ERROR_OK', 15000) // fast field, in the shell
  await page.waitContent('DEFER_ERROR_FALLBACK', 15000) // the per-hole error fallback replaced the failed subtree
  await page.stable
  await page.close()
}

// "islands within islands, each with its OWN loader": an outer component point (its own loader) wraps an inner component
// point (its own loader). Both loaders resolve server-side and ship dehydrated, both hydrate, and BOTH stay interactive
// — nested islands each carrying independent data is not a limitation. (The DATA side of this is also pinned in-process
// in rsc.int.test.tsx; here we prove hydration + interactivity in a real browser.)
const expectNestedIslandLoadersFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/nested-loaders')
  await page.waitContent('OUTER_LOADER_DATA', 15000) // the outer island's own loader resolved
  await page.waitContent('INNER_LOADER_DATA', 15000) // the inner island's own loader resolved too
  await page.waitContent('outer=0', 15000)
  await page.waitContent('inner=0', 15000)
  await page.stable
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('recoverable hydration/render error')
  expect(logsText).not.toContain('Hydration')
  expect(logsText).not.toContain('RSC:')
  // both nested islands hydrated interactive — each responds to its own clicks independently
  await page.original.click('#outer-cta')
  await page.waitContent('outer=1', 10000)
  await page.original.click('#inner-cta')
  await page.waitContent('inner=1', 10000)
  await page.close()
}

// THE promise-props thesis, SSR side: an island whose prop is a still-resolving promise is LIVE on the first SSR
// paint — for BOTH fill orders. The fast prop settles before the shell (its fill is buffered and applied before
// hydrateRoot, so use() reads it synchronously at hydration); the slow prop reveals its boundary AFTER hydration
// started (React parks the dehydrated boundary and retries when the fill resolves the thenable). Neither island is
// inside a server-revealed hole — the defer-hole inertness does not transfer, and this test is what pins that.
const expectPromisePropSsrFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/promise-prop')
  // the fast value rendered (pre-shell settle); the slow one streams in after its 1.5s
  await page.waitContent('PP_FAST_VALUE', 15000)
  await page.waitContent('fast-clicks=0', 15000)
  await page.waitContent('slow-clicks=0', 15000)
  await page.waitContent('PP_SLOW_VALUE', 15000)
  await page.stable
  // the fills rode the document stream — the client never refetched the loader
  expect(page.requestsTale).not.toContain('page.promise-prop-page (data)')
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('recoverable hydration/render error')
  expect(logsText).not.toContain('Hydration')
  expect(logsText).not.toContain('RSC:')
  // both islands are ALIVE on the first paint — short windows so a dead island fails fast
  await page.original.click('#pp-btn-fast')
  await page.waitContent('fast-clicks=1', 5000)
  await page.original.click('#pp-btn-slow')
  await page.waitContent('slow-clicks=1', 5000)
  await page.close()
}

// Promise props over a client navigation: the islands mount live at once (the slow prop's fallback showing), the
// value streams in as an NDJSON fill, and the island's state SURVIVES the fill (use() re-renders the reader only —
// the island is never remounted).
const expectPromisePropClientNavFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/')
  await page.waitContent('#home')
  await page.original.getByRole('link', { name: 'go-promise-prop', exact: true }).click()
  await page.waitContent('fast-clicks=0', 15000)
  await page.waitContent('slow-clicks=0', 15000)
  // click the slow island (usually while its prop is still streaming — liveness holds either way)
  await page.original.click('#pp-btn-slow')
  await page.waitContent('slow-clicks=1', 5000)
  await page.waitContent('PP_SLOW_VALUE', 15000)
  // the loader travelled over the wire as a streamed client fetch. Asserted only now: the recorder logs a request when
  // its response FINISHES, and the NDJSON stream stays open until the slow fill drains (the defer nav test implicitly
  // waits the same way).
  expect(page.requestsTale).toContain('page.promise-prop-page (data)')
  // the fill re-rendered only the suspended reader: the click count survived
  expect(await page.original.locator('#pp-btn-slow').first().textContent()).toContain('slow-clicks=1')
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('RSC:')
  await page.close()
}

// defer's 3rd arg as a FUNCTION, end-to-end: a server component throws a TYPED error; the function fallback renders its
// \`code\`. Proves the error-class fix in a browser — the typed throw is preserved (not flattened to the RSC hint) and
// reaches the fallback projected with its code intact.
const expectDeferErrorFnFlow = async (tp: TestProjectOneClient) => {
  const page = await tp.gotoServer('/defer-error-fn')
  await page.waitContent('DEFER_TYPED_CODE', 15000) // the function fallback rendered the REAL typed error's code
  await page.stable
  await page.close()
}

// Strip guarantees: server code never in the client bundle, clientOnly render never in the server
// bundle.
const expectRscStripGuarantees = async (tp: TestProjectOneClient) => {
  const distServer = await tp.getDistServerFilesContent()
  const distClient = await tp.getDistClientFilesContent()
  // the server component (and the whole loader) exists on the server…
  expect(distServer).toContain('SERVER_ONLY_MARKER')
  // …and never ships to the browser
  expect(distClient).not.toContain('SERVER_ONLY_MARKER')
  // the `.clientOnly()` island's render exists in the client bundle…
  expect(distClient).toContain('LONELY_CLIENT_MARKER')
  // …and is cut from the server bundle
  expect(distServer).not.toContain('LONELY_CLIENT_MARKER')
  // the interactive island's code is in the client bundle (it renders in the browser)
  expect(distClient).toContain('clicks=')
  // a DEFERRED server component is stripped from the client just like any server component
  expect(distServer).toContain('DEFER_SERVER_MARKER')
  expect(distClient).not.toContain('DEFER_SERVER_MARKER')
}

// A component point in its own file becomes its own chunk, listed in the preload manifest.
const expectRscComponentChunkManifest = async (tp: TestProjectOneClient) => {
  const manifest = (await Bun.file(tp.resolve('dist/client/_point0/root/preload-manifest.json')).json()) as {
    entry: string | null
    byComponent?: Record<string, string[]>
  }
  // every component point declared in its own fixture file gets a per-component manifest entry pointing at a real chunk
  // (rscCta, the clientOnly lonelyBadge, the two nested-loaders islands, the self-suspend island, and the promise-prop
  // widget — one chunk each; innerLoaderIsland + outerLoaderIsland share nested-loaders' chunk since they live in one
  // file)
  expect(Object.keys(manifest.byComponent ?? {}).sort()).toEqual([
    'innerLoaderIsland',
    'lonelyBadge',
    'outerLoaderIsland',
    'promiseWidget',
    'rscCta',
    'selfSuspendIsland',
  ])
  for (const files of Object.values(manifest.byComponent ?? {})) {
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      expect(file).not.toBe(manifest.entry)
      expect(await Bun.file(tp.resolve(`dist/client${file}`)).exists()).toBe(true)
    }
  }
  // the island code lives in ITS chunk, not in the entry
  const entryContent = await Bun.file(tp.resolve(`dist/client${manifest.entry}`)).text()
  expect(entryContent).not.toContain('clicks=')
  const ctaChunkFiles = manifest.byComponent!.rscCta!
  const ctaChunksContent = (
    await Promise.all(ctaChunkFiles.map(async (file) => await Bun.file(tp.resolve(`dist/client${file}`)).text()))
  ).join('\n')
  expect(ctaChunksContent).toContain('clicks=')
}

// Production flow: modulepreload for referenced islands, hydration clean, islands interactive.
const expectRscProductionFlow = async (tp: TestProjectOneClient) => {
  const engine = await tp.importEngine()
  tp.spawn(['bun', 'run', 'start'])
  await tp.waitStarted(engine.server.port)
  const html = await tp.fetchServerHtml('/rsc')
  // per-payload modulepreload links for the referenced islands (prod-build-only feature)
  expect(html).toContain('rel="modulepreload"')
  expect(html).toContain('SERVER_ONLY_MARKER')
  expect(html).not.toContain('LONELY_CLIENT_MARKER')

  const page = await tp.gotoServer('/rsc')
  await page.waitContent('clicks=0', 15000)
  await page.waitContent('LONELY_CLIENT_MARKER', 15000)
  await page.stable
  const logsText = page.strlogs.join('\n')
  expect(logsText).not.toContain('recoverable hydration/render error')
  expect(logsText).not.toContain('Hydration')
  expect(logsText).not.toContain('RSC:')
  await page.original.click('#cta')
  await page.waitContent('clicks=1', 10000)
  await page.close()
}

describe('rsc e2e (browser, dev)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'rsc',
    portsRange: [4100, 4124],
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await bootRscProject(tpf)
    // warm the dev bundler so hydration timings never race a cold compile
    await tp.fetchServerHtml('/rsc')
  }, 180000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('SSR html: server component and island rendered, clientOnly island absent, payload encoded', async () => {
    await expectRscSsrHtml(tp)
  })

  it('slow streams survive idle reapers: a 12s defer arrives over SSR and NDJSON on a real socket (heartbeats)', async () => {
    await expectSlowStreamsSurviveIdleReapers(tp)
  })

  it('direct load: hydration is clean, no refetch, islands interactive, clientOnly appears after hydration', async () => {
    await expectRscDirectLoadFlow(tp)
  })

  it('onPrefetchPage warm-up: the RSC query ships warm — zero client refetch', async () => {
    await expectRscWarmFlow(tp)
  })

  it('client navigation: the loader is fetched over the wire, elements decode, the island lives', async () => {
    await expectRscClientNavigationFlow(tp)
  })

  it('deferred holes: three server subtrees stream into the shell, display, and hydrate with no refetch', async () => {
    await expectRscDeferFlow(tp)
  })

  it('an island nested inside a server component hydrates and is interactive (nesting is not the limitation)', async () => {
    await expectRscNestedIslandFlow(tp)
  })

  it('client-fetch defer hole: an interactive island inside a streamed hole is live (clickable) on client navigation', async () => {
    await expectRscDeferIslandClientNavFlow(tp)
  })

  it('SSR: an island streamed via a suspend:server query IS interactive on first load (unlike a defer hole)', async () => {
    await expectSuspendIslandSsrFlow(tp)
  })

  it('SSR limitation: an island inside a defer hole is NOT interactive on first load', async () => {
    await expectDeferIslandSsrDeadFlow(tp)
  })

  it('SSR: an island with its OWN suspend:server loader IS interactive on first load', async () => {
    await expectSelfSuspendIslandSsrFlow(tp)
  })

  it("SSR: defer()'s 3rd arg renders a per-hole error fallback when the subtree throws (page survives)", async () => {
    await expectDeferErrorFallbackSsrFlow(tp)
  })

  it('islands within islands: an island with its own loader, nested in an island with its own loader, both hydrate and stay interactive', async () => {
    await expectNestedIslandLoadersFlow(tp)
  })

  it("SSR: defer()'s 3rd arg as a FUNCTION renders the typed error's code (error-class fix, browser)", async () => {
    await expectDeferErrorFnFlow(tp)
  })

  it('promise props: an island with a streaming promise prop is LIVE on the first SSR paint (both fill orders)', async () => {
    await expectPromisePropSsrFlow(tp)
  })

  it('promise props: on a client navigation the island mounts live, the value streams in, state survives the fill', async () => {
    await expectPromisePropClientNavFlow(tp)
  })
})

describe('rsc e2e (build)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'rsc-build',
    portsRange: [4125, 4149],
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await bootRscProject(tpf, { spawn: 'none' })
    const bp = tp.spawn(['bun', 'run', 'build'])
    await bp.exited
  }, 240000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('strip guarantees: server code never in the client bundle, clientOnly render never in the server bundle', async () => {
    await expectRscStripGuarantees(tp)
  })

  it('a component point in its own file becomes its own chunk, listed in the preload manifest', async () => {
    await expectRscComponentChunkManifest(tp)
  })

  it('production flow: modulepreload for referenced islands, hydration clean, islands interactive', async () => {
    await expectRscProductionFlow(tp)
  })
})

// The vite bundler runs the same contract: the client (and, in vite mode, the server too) is
// bundled by vite, SSR in dev runs through the vite module runner, chunk splitting comes from the
// aggregator's dynamic imports, and the preload manifest is fed by the rollup chunk graph.
describe('rsc e2e (browser, vite dev)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'rsc-vite',
    portsRange: [4150, 4174],
    vite: true,
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await bootRscProject(tpf)
    // warm the dev bundler so hydration timings never race a cold compile
    await tp.fetchServerHtml('/rsc')
  }, 180000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('SSR html: server component and island rendered, clientOnly island absent, payload encoded', async () => {
    await expectRscSsrHtml(tp)
  })

  it('direct load: hydration is clean, no refetch, islands interactive, clientOnly appears after hydration', async () => {
    await expectRscDirectLoadFlow(tp)
  })

  it('onPrefetchPage warm-up: the RSC query ships warm — zero client refetch', async () => {
    await expectRscWarmFlow(tp)
  })

  it('client navigation: the loader is fetched over the wire, elements decode, the island lives', async () => {
    await expectRscClientNavigationFlow(tp)
  })

  it('deferred holes: three server subtrees stream into the shell, display, and hydrate with no refetch', async () => {
    await expectRscDeferFlow(tp)
  })

  it('an island nested inside a server component hydrates and is interactive (nesting is not the limitation)', async () => {
    await expectRscNestedIslandFlow(tp)
  })

  it('client-fetch defer hole: an interactive island inside a streamed hole is live (clickable) on client navigation', async () => {
    await expectRscDeferIslandClientNavFlow(tp)
  })

  it('SSR: an island streamed via a suspend:server query IS interactive on first load (unlike a defer hole)', async () => {
    await expectSuspendIslandSsrFlow(tp)
  })

  it('SSR limitation: an island inside a defer hole is NOT interactive on first load', async () => {
    await expectDeferIslandSsrDeadFlow(tp)
  })

  it('SSR: an island with its OWN suspend:server loader IS interactive on first load', async () => {
    await expectSelfSuspendIslandSsrFlow(tp)
  })

  it("SSR: defer()'s 3rd arg renders a per-hole error fallback when the subtree throws (page survives)", async () => {
    await expectDeferErrorFallbackSsrFlow(tp)
  })

  it('islands within islands: an island with its own loader, nested in an island with its own loader, both hydrate and stay interactive', async () => {
    await expectNestedIslandLoadersFlow(tp)
  })

  it("SSR: defer()'s 3rd arg as a FUNCTION renders the typed error's code (error-class fix, browser)", async () => {
    await expectDeferErrorFnFlow(tp)
  })

  it('promise props: an island with a streaming promise prop is LIVE on the first SSR paint (both fill orders)', async () => {
    await expectPromisePropSsrFlow(tp)
  })

  it('promise props: on a client navigation the island mounts live, the value streams in, state survives the fill', async () => {
    await expectPromisePropClientNavFlow(tp)
  })
})

describe('rsc e2e (vite build)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'rsc-vite-build',
    portsRange: [4175, 4199],
    vite: true,
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await bootRscProject(tpf, { spawn: 'none' })
    const bp = tp.spawn(['bun', 'run', 'build'])
    await bp.exited
  }, 240000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('strip guarantees: server code never in the client bundle, clientOnly render never in the server bundle', async () => {
    await expectRscStripGuarantees(tp)
  })

  it('a component point in its own file becomes its own chunk, listed in the preload manifest', async () => {
    await expectRscComponentChunkManifest(tp)
  })

  it('production flow: modulepreload for referenced islands, hydration clean, islands interactive', async () => {
    await expectRscProductionFlow(tp)
  })
})

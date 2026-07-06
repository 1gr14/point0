import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(45000)

// Streamed SSR, end-to-end: a temp dev project (bun bundler, ports 3900-3949) driven through
// real Chromium, plus a vite smoke (ports 3950-3999). The in-process half of the suspend
// coverage lives in suspend.fast.test.tsx — this file is the SLOW shard (dev server boot + browser),
// see scripts/slow-tests.ts.

const readUntil = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  initial: string,
  search: string,
): Promise<string> => {
  let html = initial
  while (!html.includes(search)) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    html += decoder.decode(value, { stream: true })
  }
  return html
}

const readToEnd = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  initial: string,
): Promise<string> => {
  let html = initial
  let result = await reader.read()
  while (!result.done) {
    html += decoder.decode(result.value, { stream: true })
    result = await reader.read()
  }
  return html
}
// Shared by the e2e describes below: the pages written into the temp dev project.
const deferLoaderMs = 1200

const writeDeferPages = async (project: TestProjectOneClient) => {
  await project.write(
    'src/defer/home.tsx',
    `import { root } from '../lib/root.js'
import { Link } from '../lib/navigate.js'
export const homePage = root.lets('page', 'home', '/').page(() => (
  <div id="home">
    home
    <Link to="/defer">go-defer</Link>
    <Link to="/suspense">go-suspense</Link>
    <Link to="/client-suspend">go-client-suspend</Link>
    <Link to="/opt-suspend">go-opt-suspend</Link>
    <Link to="/opt-suspend-fail">go-opt-fail</Link>
    <Link to="/suspense-inf">go-suspense-inf</Link>
  </div>
))
`,
  )
  await project.write(
    'src/defer/defer.tsx',
    `import { root } from '../lib/root.js'
export const statsQuery = root
  .lets('query', 'stats')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, ${deferLoaderMs}))
    return { n: 42 }
  })
  .query()
export const deferPage = root
  .lets('page', 'defer', '/defer')
  .loading(() => <div id="defer-loading">defer-loading</div>)
  .page(() => {
    const q = statsQuery.useQuery(undefined, { suspend: 'server' })
    return <div id="defer-page">{q.data ? 'n=' + q.data.n : 'defer-pending'}</div>
  })
`,
  )
  await project.write(
    'src/defer/suspense.tsx',
    `import { root } from '../lib/root.js'
export const hookedQuery = root
  .lets('query', 'hooked')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, 500))
    return { m: 7 }
  })
  .query()
export const suspensePage = root
  .lets('page', 'suspensePage', '/suspense')
  .loading(() => <div id="suspense-loading">suspense-loading</div>)
  .page(() => {
    const { data } = hookedQuery.useSuspenseQuery()
    return <div id="suspense-page">{'m=' + data.m}</div>
  })
`,
  )
  await project.write(
    'src/defer/fail.tsx',
    `import { root } from '../lib/root.js'
export const failPage = root
  .lets('page', 'deferFail', '/defer-fail')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, 300))
    throw new Error('defer boom')
  })
  .query({ suspend: 'server' })
  .loading(() => <div id="fail-loading">fail-loading</div>)
  .error(({ error }) => <div id="fail-error">{error.message}</div>)
  .page(() => <div id="fail-page">never</div>)
`,
  )
  await project.write(
    'src/defer/client-suspend.tsx',
    `import { root } from '../lib/root.js'
export const clientSuspendQuery = root
  .lets('query', 'clientSuspend')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, 500))
    return { k: 11 }
  })
  .query({ suspend: 'client' })
export const clientSuspendPage = root
  .lets('page', 'clientSuspendPage', '/client-suspend')
  .loading(() => <div id="client-suspend-loading">client-suspend-loading</div>)
  .page(() => {
    const q = clientSuspendQuery.useQuery()
    return <div id="client-suspend-page">{q.data ? 'k=' + q.data.k : 'client-suspend-pending'}</div>
  })
`,
  )
  await project.write(
    'src/defer/opt-suspend.tsx',
    `import { root } from '../lib/root.js'
export const optQuery = root
  .lets('query', 'opt')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, 500))
    return { v: 21 }
  })
  .query({ suspend: true })
export const optSuspendPage = root
  .lets('page', 'optSuspendPage', '/opt-suspend')
  .loading(() => <div id="opt-suspend-loading">opt-suspend-loading</div>)
  .page(() => {
    const q = optQuery.useQuery()
    return <div id="opt-suspend-page">{q.data ? 'v=' + q.data.v : 'opt-suspend-pending'}</div>
  })
export const optFailQuery = root
  .lets('query', 'optFail')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, 300))
    throw new Error('opt boom')
  })
  .query({ suspend: true })
export const optSuspendFailPage = root
  .lets('page', 'optSuspendFailPage', '/opt-suspend-fail')
  .loading(() => <div id="opt-fail-loading">opt-fail-loading</div>)
  .error(({ error }) => <div id="opt-fail-boundary">boundary-rendered {error.message}</div>)
  .page(() => {
    const q = optFailQuery.useQuery()
    if (q.error) {
      return <div id="opt-fail-state">state-error {q.error.message}</div>
    }
    return <div id="opt-fail-page">{q.data ? 'never' : 'opt-fail-pending'}</div>
  })
`,
  )
  await project.write(
    'src/defer/suspense-inf.tsx',
    `import { root } from '../lib/root.js'
import { z } from 'zod'
export const infQuery = root
  .lets('infiniteQuery', 'suspenseInf')
  .input(z.object({ cursor: z.number().optional() }))
  .loader(async ({ input }) => {
    await new Promise((r) => setTimeout(r, 400))
    const cursor = input.cursor ?? 0
    return { items: ['i' + cursor, 'i' + (cursor + 1)], nextCursor: cursor + 2 }
  })
  .infiniteQuery({
    pageParamFromInput: {
      get: ({ input, get }) => get(input, 'cursor'),
      set: ({ input, value, set }) => set(input, 'cursor', value),
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  })
export const suspenseInfPage = root
  .lets('page', 'suspenseInfPage', '/suspense-inf')
  .loading(() => <div id="suspense-inf-loading">suspense-inf-loading</div>)
  .page(() => {
    const query = infQuery.useSuspenseInfiniteQuery()
    const joined = query.data.pages.map((p) => p.items.join(',')).join(';')
    return (
      <div id="suspense-inf-page">
        <div id="suspense-inf-items">items={joined}</div>
        {query.isFetchingNextPage ? <div id="fetching-next">fetching-next</div> : null}
        <button id="fetch-next" onClick={() => void query.fetchNextPage()}>next</button>
      </div>
    )
  })
`,
  )
  await project.write(
    'src/defer/ssr-false-suspend.tsx',
    `import { root } from '../lib/root.js'
export const sfQuery = root
  .lets('query', 'sfq')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, 500))
    return { f: 33 }
  })
  .query({ ssr: false, suspend: true })
export const ssrFalseSuspendPage = root
  .lets('page', 'ssrFalseSuspendPage', '/ssr-false-suspend')
  .loading(() => <div id="sf-loading">sf-loading</div>)
  .page(() => {
    const q = sfQuery.useQuery()
    return <div id="sf-page">{q.data ? 'f=' + q.data.f : 'sf-pending'}</div>
  })
`,
  )
  await project.write(
    'src/defer/suspense-fail.tsx',
    `import { root } from '../lib/root.js'
export const suspenseFailQuery = root
  .lets('query', 'suspenseFail')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, 300))
    throw new Error('suspense-fail boom')
  })
  .query()
export const suspenseFailPage = root
  .lets('page', 'suspenseFailPage', '/suspense-fail')
  .loading(() => <div id="suspense-fail-loading">suspense-fail-loading</div>)
  .error(({ error }) => <div id="suspense-fail-error">boundary-rendered {error.message}</div>)
  .page(() => {
    const { data } = suspenseFailQuery.useSuspenseQuery()
    return <div id="suspense-fail-page">{'never ' + String(data)}</div>
  })
`,
  )
  await project.write(
    'src/defer/redirect-stream.tsx',
    `import { root } from '../lib/root.js'
import { redirect } from '../lib/navigate.js'
export const redirectStreamPage = root
  .lets('page', 'redirectStreamPage', '/redirect-stream')
  .loader(async (): Promise<{ x: number }> => {
    await new Promise((r) => setTimeout(r, 300))
    throw redirect.to('/redirect-target')
  })
  .query({ suspend: 'server' })
  .loading(() => <div id="redirect-stream-loading">redirect-stream-loading</div>)
  .page(({ data }) => <div id="redirect-stream-page">{'x=' + data.x}</div>)
export const redirectTargetPage = root
  .lets('page', 'redirectTargetPage', '/redirect-target')
  .page(() => <div id="redirect-target">redirect-target-content</div>)
`,
  )
}

// Boot a temp dev project with the defer pages, with the retry-over-ports pattern the other
// dev-server suites use.
const bootDeferProject = async (
  tpf: TestProjectOneClientFactory,
  options: { vite?: boolean } = {},
): Promise<TestProjectOneClient> => {
  let tp: TestProjectOneClient | undefined
  const tries = 3
  for (let tryIndex = 0; tryIndex < tries; tryIndex++) {
    tp = tpf.create(options)
    try {
      await tp.cleanup('ports')
      await tp.init()
      await writeDeferPages(tp)
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
  // warm the dev bundler so the streaming-order assertions never race a cold compile
  await tp!.fetchServerHtml('/defer')
  return tp!
}

// The streaming-over-HTTP assertion shared by the bun and vite e2e describes: the shell (with the
// fallback) leaves the server while the deferred loader still runs; the content and the query
// push follow in the same response.
const expectStreamedDeferResponse = async (tp: TestProjectOneClient) => {
  const response = await tp.fetchServer('/defer')
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let html = await readUntil(reader, decoder, '', 'defer-loading')
  expect(html).toContain('defer-loading')
  expect(html).not.toContain('n=42')
  expect(html).not.toContain('</html>')
  html = await readToEnd(reader, decoder, html)
  expect(html).toContain('n=42')
  expect(html).toContain('__POINT0_PUSH_QUERY__("')
  expect(html).toContain('</html>')
}

// The browser half of streamed SSR: a real dev server + a real Chromium. Covers what the
// in-process harness above cannot — client hydration of the streamed query pushes (no refetch),
// client-side navigation semantics ('server' means nothing there; the suspense hooks DO suspend),
// the failed-stream hydration, and the lazy-point navigation UX with the universal Suspense
// wrappers.
describe('suspend e2e (browser)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'suspend',
    portsRange: [3900, 3949],
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await bootDeferProject(tpf)
  }, 120000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('streams over HTTP: the shell ships while the deferred loader still runs, the content follows in the same response', async () => {
    await expectStreamedDeferResponse(tp)
  })

  it('push-hydration: after hydration the client has the streamed data — zero refetch, no hydration errors', async () => {
    const page = await tp.gotoServer('/defer')
    await page.waitContent('n=42', 10000)
    await page.stable
    // the pushed query state seeded the client cache, so mounting the page found the data —
    // any request for the query point here would mean push-hydration silently failed
    expect(page.requestsTale).not.toContain('query.stats')
    // boundaries can mask hydration mismatches — the client logs them explicitly, catch that
    const logsText = page.strlogs.join('\n')
    expect(logsText).not.toContain('recoverable hydration/render error')
    expect(logsText).not.toContain('failed to hydrate a streamed query push')
    expect(logsText).not.toContain('Hydration')
    await page.close()
  })

  it('client navigation to a deferred page: the option means nothing — the client fetches, no boundary fallback flash', async () => {
    const page = await tp.gotoServer('/')
    await page.waitContent('#home')
    await page.original.getByRole('link', { name: 'go-defer', exact: true }).click()
    // the client runs the query like any other: pending state first, data after the fetch
    await page.waitContent('n=42', 10000)
    await page.stable
    expect(page.requestsTale).toContain('query.stats')
    // the lazy page chunk is awaited by the navigation (prefetchPage → loadPage) BEFORE React
    // renders the new page, so the universal Suspense wrappers never flash a loading fallback
    // for the chunk itself — neither the page's own `.loading()` nor the root's
    const navigationTale = page.tale
    expect(navigationTale).not.toContain('defer-loading')
    expect(navigationTale).not.toContain('Loading...')
    await page.close()
  })

  it('failed deferred loader: `.error()` streams in place and the page hydrates alive (no SPA fallback)', async () => {
    const page = await tp.gotoServer('/defer-fail')
    await page.waitContent('defer boom', 10000)
    await page.stable
    // the dehydrated store shipped with the shell — this was streamed SSR, not the bare-index
    // SPA fallback
    const hasStore = await page.original.evaluate(() => {
      return typeof (window as any).__POINT0_DEHYDRATED_SUPER_STORE__ === 'string'
    })
    expect(hasStore).toBe(true)
    // the error state was pushed with the shell, hydration matched, and the page is alive —
    // `.error()` still on screen after hydration and stability
    expect(page.preview).toContain('defer boom')
    await page.close()
  })

  it('useSuspenseQuery direct load: streams on the server and hydrates without a refetch', async () => {
    const page = await tp.gotoServer('/suspense')
    await page.waitContent('m=7', 10000)
    await page.stable
    // the pushed query state seeded the cache — the hook returns data on hydration, no request
    expect(page.requestsTale).not.toContain('query.hooked')
    const logsText = page.strlogs.join('\n')
    expect(logsText).not.toContain('recoverable hydration/render error')
    expect(logsText).not.toContain('Hydration')
    await page.close()
  })

  it('useSuspenseQuery on client navigation: suspends into the positional `.loading()`, then renders — the client fetches itself', async () => {
    const page = await tp.gotoServer('/')
    await page.waitContent('#home')
    await page.original.getByRole('link', { name: 'go-suspense', exact: true }).click()
    // client-side suspension: the page's own positional fallback shows while the query fetches
    // (~500ms loader — plenty for the DOM tale to capture the frame)
    await page.waitContent('suspense-loading', 10000)
    await page.waitContent('m=7', 10000)
    expect(page.requestsTale).toContain('query.hooked')
    await page.close()
  })

  it("suspend: 'client' on client navigation: suspends into the positional `.loading()`, then renders", async () => {
    const page = await tp.gotoServer('/')
    await page.waitContent('#home')
    await page.original.getByRole('link', { name: 'go-client-suspend', exact: true }).click()
    // the client half of `true` alone: the plain useQuery suspends while the query fetches
    await page.waitContent('client-suspend-loading', 10000)
    await page.waitContent('k=11', 10000)
    expect(page.requestsTale).toContain('query.client-suspend')
    // the query suspended — its pending branch never rendered
    expect(page.tale).not.toContain('client-suspend-pending')
    await page.close()
  })

  it('suspend: true on a plain useQuery, client side: suspends into the positional `.loading()`, then renders', async () => {
    const page = await tp.gotoServer('/')
    await page.waitContent('#home')
    await page.original.getByRole('link', { name: 'go-opt-suspend', exact: true }).click()
    await page.waitContent('opt-suspend-loading', 10000)
    await page.waitContent('v=21', 10000)
    expect(page.requestsTale).toContain('query.opt')
    expect(page.tale).not.toContain('opt-suspend-pending')
    await page.close()
  })

  it('suspend: true error path: the failure arrives as query STATE — the ErrorBoundary is not involved', async () => {
    const page = await tp.gotoServer('/')
    await page.waitContent('#home')
    await page.original.getByRole('link', { name: 'go-opt-fail', exact: true }).click()
    // pending suspends as usual…
    await page.waitContent('opt-fail-loading', 10000)
    // …but the option gate throws only PENDING promises: the error lands in `query.error` and
    // the component's own state branch renders — not the boundary's `.error()`
    await page.waitContent('state-error opt boom', 10000)
    expect(page.preview).not.toContain('boundary-rendered')
    await page.close()
  })

  it('useSuspenseInfiniteQuery on client navigation: suspends into the positional `.loading()`; fetchNextPage does NOT suspend', async () => {
    const page = await tp.gotoServer('/')
    await page.waitContent('#home')
    await page.original.getByRole('link', { name: 'go-suspense-inf', exact: true }).click()
    // navigation suspends into the positional fallback while the first page fetches
    await page.waitContent('suspense-inf-loading', 10000)
    await page.waitContent('items=i0,i1', 10000)
    // fetchNextPage keeps the rendered pages on screen (TanStack semantics: no suspension) —
    // the in-flight state is visible via isFetchingNextPage, never via the Suspense fallback
    await page.original.click('#fetch-next')
    await page.waitContent('items=i0,i1;i2,i3', 10000)
    const taleAfterContent = page.tale.split('items=i0,i1').slice(1).join('items=i0,i1')
    expect(taleAfterContent).not.toContain('suspense-inf-loading')
    await page.close()
  })

  it('ssr: false + suspend: true on direct load: the server ships the loading state, the post-hydration fetch never flashes the fallback', async () => {
    // On the server `ssr: false` disables the suspend gate entirely (suspending would run the
    // loader the user excluded from SSR) — the combination reads as `suspend: false` there, so
    // the HTML always carries the query's loading state (here the body's own pending branch).
    // After hydration the client starts the one real fetch; the suspension resolves inside the
    // still-dehydrated boundary, so the positional `.loading()` never flashes — the screen goes
    // straight from the server-rendered loading state to the data. (`suspend: true` keeps only
    // its client half: client NAVIGATION to such a page suspends into `.loading()` like any
    // other `suspend: true` query — pinned above.)
    const page = await tp.gotoServer('/ssr-false-suspend')
    await page.waitContent('f=33', 10000)
    await page.stable
    const tale = page.tale
    expect(tale).toContain('sf-pending')
    expect(tale).not.toContain('sf-loading')
    // exactly one client fetch of the query
    expect(page.requestsTale.split('query.sfq').length - 1).toBe(1)
    await page.close()
  })

  it('useSuspenseQuery over a failed stream: after hydration the boundary renders `.error()` from the pushed state — no refetch, no loop', async () => {
    // SSR ships the fallback (the hook throws the query error server-side, Fizz contains it);
    // the pushed ERROR state must make the client retry read the cache and throw to the
    // ErrorBoundary — NOT trust the fresh observer's optimistic-pending report (`retryOnMount`
    // defaults true on the client), which would refetch → reject → retry forever
    const page = await tp.gotoServer('/suspense-fail')
    await page.waitContent('boundary-rendered suspense-fail boom', 10000)
    await page.stable
    expect(page.requestsTale).not.toContain('query.suspense-fail')
    await page.close()
  })

  it('a streamed loader that redirects post-shell: the client hydrates the pushed redirect and hops', async () => {
    // direct load: the shell leaves before the loader throws its redirect — no HTTP 302
    // possible; the redirect-carrying error state is pushed with the stream, hydration reads it
    // and the `.error()` data path renders `<Redirect>` — the client ends up on the target page
    const page = await tp.gotoServer('/redirect-stream')
    await page.waitContent('redirect-target-content', 10000)
    // the hop happened from the pushed state, not from refetching the failed loader
    expect(page.requestsTale).not.toContain('page.redirect-stream-page')
    await page.close()
  })
})

// The vite bundler serves SSR through the same fetcher/streaming path — one smoke test proves the
// response actually stays progressive there too (no browser needed).
describe('suspend e2e (vite smoke)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'suspend-vite',
    portsRange: [3950, 3999],
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
    tp = await bootDeferProject(tpf, { vite: true })
  }, 120000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('streams over HTTP through the vite dev server', async () => {
    await expectStreamedDeferResponse(tp)
  })
})

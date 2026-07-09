import { describe, expect, it, setDefaultTimeout, spyOn } from 'bun:test'
import { Routes } from '@1gr14/route0'
import { ErrorPoint0, Point0, useEffectSsr } from '@point0/core'
import { CookieStore } from '@point0/core/cookie-store'
import { createNavigation } from '@point0/react-dom/router'
import z from 'zod'
import { createTestThings } from './utils/internal-testing.js'

setDefaultTimeout(45000)

// Streamed SSR — the `suspend` query option ('auto' | 'server' | boolean), the `ssr: boolean`
// option, and the useSuspenseQuery/useSuspenseInfiniteQuery hooks. The shell ships immediately
// with the mountable's `.loading()` fallback; a streamed query's content arrives in the same
// response when its loader resolves, together with a `window.__POINT0_PUSH_QUERY__("…")` script
// that seeds the client query cache. This file is the IN-PROCESS half (createTestThings
// harness); the browser/vite e2e half lives in suspend.e2e.test.tsx (the slow shard; the fast/slow
// suffix pair is a deliberate one-off — one feature split by speed).
//
// The tests are SERIAL on purpose (`it`, not `it.concurrent`): most of them hold a response
// stream open on a gated loader and read it incrementally — several gated streams interleaving in
// one process deadlock/flake. Don't "fix" them back to concurrent.

// The documented recommended config: `retryOnMount: false` on the root makes an errored server
// loader report honestly during SSR — the mountable's `.error()` (and its `status` effect)
// reaches the response. Most tests here pin THAT mode.
const createRoot = () =>
  Point0.lets('root', 'root')
    .loading(() => <div id="loading">root-loading</div>)
    .error(({ error }) => <div id="error">{error.message}</div>)
    .queryOptions({
      retry: false,
      retryOnMount: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
    })
    .root()

// TanStack-default mode: `retryOnMount` NOT set (→ true). During SSR an errored query reports
// itself as optimistically pending ("a mount will retry me"), so the server renders the LOADING
// state, the error rides the dehydrated/pushed cache, and the client retries on mount after
// hydration — the exact imitation of a client-side mount. The `…default retryOnMount…` tests
// below pin THIS mode.
const createDefaultRetryRoot = () =>
  Point0.lets('root', 'root')
    .loading(() => <div id="loading">root-loading</div>)
    .error(({ error }) => <div id="error">{error.message}</div>)
    .queryOptions({
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
    })
    .root()

const createGate = () => {
  let release!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((resolve, rejectFn) => {
    release = resolve
    reject = rejectFn
  })
  return { promise, release, reject }
}

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

describe('suspend', () => {
  it('shell ships before the deferred loader resolves; content streams into the same response', async () => {
    const root = createRoot()
    const gate = createGate()
    const q = root
      .lets('query', 'slow')
      .loader(async () => {
        await gate.promise
        return { x: 1 }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">deferred-loading</div>)
      .page(() => {
        const query = q.useQuery(undefined, { suspend: 'server' })
        return (
          <div id="page">
            <div id="static">static-content</div>
            <div id="slow">{query.data ? `x=${query.data.x}` : 'pending'}</div>
          </div>
        )
      })
    const { client } = await createTestThings({ ssr: true, points: [root, q, page] })
    // The sealed-effects warning is reserved for USER loaders touching the response too late —
    // the engine's own status bubble-up after the streamed loader's nested fetch must not trip it.
    const warnSpy = spyOn(console, 'warn')
    try {
      await client.run(async () => {
        const response = await client.fetch('http://localhost/')
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        // the shell arrives while the loader is still pending — with the fallback in place
        let html = await readUntil(reader, decoder, '', 'deferred-loading')
        expect(html).toContain('deferred-loading')
        expect(html).not.toContain('x=1')
        expect(html).not.toContain('</html>')
        gate.release()
        html = await readToEnd(reader, decoder, html)
        expect(html).toContain('x=1')
        expect(html).toContain('__POINT0_PUSH_QUERY__("')
        expect(html).toContain('</html>')
      })
      const sealWarnings = warnSpy.mock.calls
        .flat()
        .map(String)
        .filter((warning) => warning.includes('has no effect'))
      expect(sealWarnings).toEqual([])
    } finally {
      warnSpy.mockRestore()
    }
  }, 15000)

  it('defer via .with() query options: streams the fallback, then the content, and pushes the query state', async () => {
    const root = createRoot()
    const gate = createGate()
    const stats = root
      .lets('component', 'stats')
      .loader(async () => {
        await gate.promise
        return { y: 2 }
      })
      .component(({ data }) => <div id="stats">{`y=${data.y}`}</div>)
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">with-deferred-loading</div>)
      .with(stats, undefined, { suspend: 'server' }, true)
      .page(({ props }) => <div id="page">{`y=${props.y}`}</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, stats, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'with-deferred-loading')
      expect(html).toContain('with-deferred-loading')
      expect(html).not.toContain('y=2')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('y=2')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
    })
  }, 15000)

  it('resolve over a streaming query: the callback never runs against empty data, the mapped props stream in', async () => {
    const root = createRoot()
    const gate = createGate()
    let resolveSawEmptyData = false
    const stats = root
      .lets('component', 'stats')
      .loader(async () => {
        await gate.promise
        return { y: 2 }
      })
      .component(({ data }) => <div id="stats">{`y=${data.y}`}</div>)
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">resolve-loading</div>)
      .with(stats, undefined, { suspend: 'server' }, ({ data }) => {
        // the resolve contract: it maps SUCCESS data — a streaming (still-pending) query must
        // never reach it. The types already promise that; this probe pins it at RUNTIME.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!data) {
          resolveSawEmptyData = true
        }
        return { label: `label-y=${data.y}` }
      })
      .page(({ props }) => <div id="page">{props.label}</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, stats, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'resolve-loading')
      expect(html).toContain('resolve-loading')
      expect(html).not.toContain('label-y=2')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('label-y=2')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('</html>')
    })
    expect(resolveSawEmptyData).toBe(false)
  }, 15000)

  it('resolve over a FAILED streaming query: `.error()` streams in place, the resolve callback never runs', async () => {
    const root = createRoot()
    const gate = createGate()
    let resolveRan = false
    const stats = root
      .lets('component', 'stats')
      .loader(async () => {
        await gate.promise
        return { y: 2 }
      })
      .component(({ data }) => <div id="stats">{`y=${data.y}`}</div>)
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">failing-resolve-loading</div>)
      .with(stats, undefined, { suspend: 'server' }, ({ data }) => {
        resolveRan = true
        return { label: `label-y=${data.y}` }
      })
      .page(({ props }) => <div id="page">{props.label}</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, stats, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'failing-resolve-loading')
      gate.reject(new Error('resolve boom'))
      html = await readToEnd(reader, decoder, html)
      // the page's own `.error()` (inherited from the root here) streams in place
      expect(html).toContain('resolve boom')
      expect(html).not.toContain('label-y=')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('</html>')
    })
    expect(resolveRan).toBe(false)
  }, 15000)

  it('nested defer cascade: a query revealed only after the outer defer resolves still streams', async () => {
    const root = createRoot()
    const outerGate = createGate()
    const loaderCalls: string[] = []
    const outer = root
      .lets('query', 'outer')
      .loader(async () => {
        loaderCalls.push('outer')
        await outerGate.promise
        return { a: 1 }
      })
      .query()
    const inner = root
      .lets('query', 'inner')
      .loader(() => {
        loaderCalls.push('inner')
        return { b: 2 }
      })
      .query()
    const Inner = () => {
      const query = inner.useQuery(undefined, { suspend: 'server' })
      return <div id="inner">{query.data ? `b=${query.data.b}` : 'inner-pending'}</div>
    }
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">outer-loading</div>)
      .page(() => {
        const query = outer.useQuery(undefined, { suspend: 'server' })
        if (!query.data) {
          return <div id="page">outer-pending</div>
        }
        return (
          <div id="page">
            <div id="outer">{`a=${query.data.a}`}</div>
            <Inner />
          </div>
        )
      })
    const { client } = await createTestThings({ ssr: true, points: [root, outer, inner, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'outer-loading')
      // the inner query is invisible to discovery — it exists only under the unresolved outer one
      expect(loaderCalls).toEqual(['outer'])
      expect(html).not.toContain('a=1')
      outerGate.release()
      html = await readToEnd(reader, decoder, html)
      // outer resolved → its subtree rendered → inner suspended, started its own fetch, streamed
      expect(loaderCalls).toEqual(['outer', 'inner'])
      expect(html).toContain('a=1')
      expect(html).toContain('b=2')
      expect(html).toContain('</html>')
    })
  })

  it('defer on useInfiniteQuery: the first page streams after the shell', async () => {
    const root = createRoot()
    const gate = createGate()
    const q = root
      .lets('infiniteQuery', 'inf')
      .input(z.object({ cursor: z.number().optional() }))
      .loader(async ({ input }) => {
        await gate.promise
        const cursor = input.cursor ?? 0
        return { items: ['a', 'b'], nextCursor: cursor + 2 }
      })
      .infiniteQuery({
        pageParamFromInput: {
          get: ({ input, get }) => get(input, 'cursor'),
          set: ({ input, value, set }) => set(input, 'cursor', value),
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">inf-loading</div>)
      .page(() => {
        // call-site options are partial for infinite queries too — the required infinite shape
        // came from the `.infiniteQuery({…})` close, the call site only overrides `ssr`
        const query = q.useInfiniteQuery(undefined, { suspend: 'server' })
        const first = query.data?.pages[0]?.items.join(',')
        return <div id="page">{first ? `items=${first}` : 'pending'}</div>
      })
    const { client } = await createTestThings({ ssr: true, points: [root, q, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'inf-loading')
      expect(html).toContain('inf-loading')
      expect(html).not.toContain('items=a,b')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('items=a,b')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('</html>')
    })
  }, 15000)

  it(".relatedQuery with { suspend: 'server' }: streams like a `.with` query", async () => {
    const root = createRoot()
    const gate = createGate()
    const q = root
      .lets('query', 'rel')
      .loader(async () => {
        await gate.promise
        return { x: 5 }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">related-loading</div>)
      .relatedQuery(q, undefined, { suspend: 'server' })
      .page(({ data }) => <div id="page">{`x=${data.x}`}</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, q, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'related-loading')
      expect(html).toContain('related-loading')
      expect(html).not.toContain('x=5')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('x=5')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('</html>')
    })
  }, 15000)

  it('ssr: false — the loader never runs on the server, the client is left to fetch', async () => {
    const root = createRoot()
    const q = root
      .lets('query', 'clientish')
      .loader(() => ({ x: 1 }))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">false-loading</div>)
      .page(() => {
        const query = q.useQuery(undefined, { ssr: false })
        return <div id="page">{query.data ? `x=${query.data.x}` : 'skipped-on-server'}</div>
      })
    const { fetchSsr, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
    const result = await fetchSsr(page)
    expect(result.html).toContain('skipped-on-server')
    expect(result.html).not.toContain('x=1')
    expect(result.html).not.toContain('__POINT0_PUSH_QUERY__("')
    // only the page HTML request itself — the query's server loader was never executed
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      "
    `)
  })

  it('clientLoader query + suspend: true — never suspends during SSR (ships the loading state), suspends on the client', async () => {
    const root = createRoot()
    const clientLoaderCalls: string[] = []
    const q = root
      .lets('query', 'clientOnlyData')
      .clientLoader(() => {
        clientLoaderCalls.push('client')
        return { c: 3 }
      })
      .query({ suspend: true })
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">client-loader-loading</div>)
      .page(() => {
        const query = q.useQuery()
        return <div id="page">{query.data ? `c=${query.data.c}` : 'client-pending'}</div>
      })
    const { render, fetchSsr } = await createTestThings({ ssr: true, points: [root, q, page] })
    // SERVER: a client loader cannot resolve during SSR, so despite `suspend: true` the query
    // never suspends there — the page body ships with its own pending branch, whole-HTML, no
    // stream, no push
    const result = await fetchSsr(page)
    expect(result.html).toContain('client-pending')
    expect(result.html).not.toContain('c=3')
    expect(result.html).not.toContain('client-loader-loading')
    expect(result.html).not.toContain('__POINT0_PUSH_QUERY__("')
    expect(clientLoaderCalls).toEqual([])
    // CLIENT: the same query suspends into the positional boundary while it fetches
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #page-loading: client-loader-loading

          #page: c=3
        "
      `)
    })
    expect(clientLoaderCalls).toEqual(['client'])
  }, 15000)

  it("suspend: 'client' — never suspends during SSR (like `false` on the server): a discovered query ships its data, a hidden one ships pending", async () => {
    const root = createRoot()
    const loaderCalls: string[] = []
    const q1 = root
      .lets('query', 'first')
      .loader(() => {
        loaderCalls.push('first')
        return { a: 1 }
      })
      .query()
    const q2 = root
      .lets('query', 'second')
      .loader(() => {
        loaderCalls.push('second')
        return { b: 2 }
      })
      .query({ suspend: 'client' })
    const Second = () => {
      const query = q2.useQuery()
      return <div id="second">{query.data ? `b=${query.data.b}` : 'second-pending'}</div>
    }
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">client-suspend-loading</div>)
      .page(() => {
        const query = q1.useQuery()
        if (!query.data) {
          return <div id="page">first-pending</div>
        }
        return (
          <div id="page">
            <div id="first">{`a=${query.data.a}`}</div>
            <Second />
          </div>
        )
      })
    // Same cut-short setup as the `suspend: false` test above — with 'auto' the hidden q2 would
    // suspend and STREAM; `'client'` is the server half of `false`, so the HTML ships whole with
    // q2's pending state and the client fetches it after hydration (the client-side suspension
    // itself is pinned by the "suspend: 'client' on client navigation" browser e2e below).
    const { fetchSsr } = await createTestThings({ ssr: { allowedDiscoveryRenders: 1 }, points: [root, q1, q2, page] })
    const result = await fetchSsr(page)
    expect(loaderCalls).toEqual(['first'])
    expect(result.html).toContain('a=1')
    expect(result.html).toContain('second-pending')
    expect(result.html).not.toContain('b=2')
    expect(result.html).not.toContain('client-suspend-loading')
  })

  it('option override: the call site wins over the point declaration', async () => {
    const root = createRoot()
    const q = root
      .lets('query', 'declaredFalse')
      .loader(() => ({ x: 7 }))
      .query({ ssr: false })
    const page = root.lets('page', 'home', '/').page(() => {
      // the point said `ssr: false`, the call site overrides back to blocking `true`
      const query = q.useQuery(undefined, { ssr: true })
      return <div id="page">{query.data ? `x=${query.data.x}` : 'pending'}</div>
    })
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, q, page] })
    const result = await fetchSsr(page)
    // fetched and awaited on the server: content is in the HTML, nothing streamed or pushed
    expect(result.html).toContain('x=7')
    expect(result.html).not.toContain('__POINT0_PUSH_QUERY__("')
    expect(result.queryClientQueriesPreview).toContain('{"x":7}')
  })

  it('data endpoint (queryClientDehydratedState) skips defer and false queries', async () => {
    const root = createRoot()
    const deferred = root
      .lets('component', 'deferred')
      .loader(() => ({ y: 2 }))
      .component(({ data }) => <div id="deferred">{`y=${data.y}`}</div>)
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .with(deferred, undefined, { suspend: 'server' })
      .page(({ data }) => <div id="page">{`x=${data.x}`}</div>)
    const { fetchQueryClientDehydratedState, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, deferred, page],
    })
    const result = await fetchQueryClientDehydratedState(page)
    // the page's own (blocking) query is there; the deferred one was not even started
    expect(result.queryClientQueriesPreview).toContain('{"x":1}')
    expect(result.queryClientQueriesKeys.join('\n')).not.toContain('deferred')
    expect(await fetchesTale()).not.toContain('component.deferred')
  })

  it('useSuspenseQuery in a data request: the response does not hang, the query stays out of the dehydrated state', async () => {
    const root = createRoot()
    const loaderCalls: string[] = []
    const q = root
      .lets('query', 'suspenseData')
      .loader(() => {
        loaderCalls.push('suspenseData')
        return { s: 9 }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ own: 1 }))
      .loading(() => <div id="page-loading">suspense-data-loading</div>)
      .page(({ data }) => {
        const { data: hookData } = q.useSuspenseQuery()
        return <div id="page">{`own=${data.own} s=${hookData.s}`}</div>
      })
    const { fetchQueryClientDehydratedState } = await createTestThings({ ssr: true, points: [root, q, page] })
    // during data-path discovery the hook throws its never-resolving "paused subtree" promise;
    // the pass awaits only the shell, and `suspenseQueryPolicy: 'skip'` never starts the loader
    // — the response must come back instead of hanging on that promise
    const result = await fetchQueryClientDehydratedState(page)
    // the page's own (blocking) query is served; the suspense query was never started
    expect(result.queryClientQueriesPreview).toContain('{"own":1}')
    expect(result.queryClientQueriesKeys.join('\n')).not.toContain('suspenseData')
    expect(loaderCalls).toEqual([])
  }, 15000)

  it("prefetchLoadersBeforePageRender: kicks a streamed (`suspend: 'server'`) self loader without awaiting it", async () => {
    const root = createRoot()
    const gate = createGate()
    const loaderCalls: string[] = []
    // the page's own chain query is streamed — the before-render prefetch kicks it and moves on
    // (this exercises the self-queries block of `_prefetchPage`)
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => {
        loaderCalls.push('deferred')
        await gate.promise
        return { a: 1 }
      })
      .query({ suspend: 'server' })
      .loading(() => <div id="page-loading">policy-loading</div>)
      .page(({ data }) => <div id="page">{`a=${data.a}`}</div>)
    const { client } = await createTestThings({
      ssr: { prefetchLoadersBeforePageRender: true },
      points: [root, page],
    })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'policy-loading')
      // the shell is out while the deferred loader still hangs on the gate — the prefetch step
      // started it exactly once (the discovery pass and the suspend path dedupe into the same
      // in-flight fetch)
      expect(loaderCalls).toEqual(['deferred'])
      expect(html).not.toContain('a=1')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('a=1')
      expect(loaderCalls).toEqual(['deferred'])
    })
  }, 15000)

  it('prefetchLoadersBeforePageRender: never runs an `ssr: false` related loader', async () => {
    const root = createRoot()
    const loaderCalls: string[] = []
    // `ssr: false` declared on the related query's close — the before-render prefetch must skip
    // it (this exercises the relatedQueries block of `_prefetchPage`), and discovery skips it
    // too, so the loader never runs on the server at all
    const skipped = root
      .lets('query', 'skipped')
      .loader(() => {
        loaderCalls.push('skipped')
        return { b: 2 }
      })
      .query({ ssr: false })
    const page = root
      .lets('page', 'home', '/')
      .relatedQuery(skipped)
      .loading(() => <div id="page-loading">skip-loading</div>)
      .page(({ data }) => <div id="page">{`b=${data.b}`}</div>)
    const { fetchSsr, fetchesTale } = await createTestThings({
      ssr: { prefetchLoadersBeforePageRender: true },
      points: [root, skipped, page],
    })
    const result = await fetchSsr(page)
    // the pending related query keeps the page in its loading state (the `ssr: false` /
    // clientLoader shape) and the loader was never executed
    expect(loaderCalls).toEqual([])
    expect(result.html).toContain('skip-loading')
    expect(result.html).not.toContain('b=2')
    expect(await fetchesTale()).not.toContain('skipped')
  })

  it('useSuspenseQuery: the shell ships the fallback, the data follows in the same response', async () => {
    const root = createRoot()
    const gate = createGate()
    const q = root
      .lets('query', 'slow')
      .loader(async () => {
        await gate.promise
        return { s: 5 }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">hook-loading</div>)
      .page(() => {
        // data is non-optional in types — the hook suspends while pending, throws on error
        const { data } = q.useSuspenseQuery()
        return <div id="page">{`s=${data.s}`}</div>
      })
    const { client } = await createTestThings({ ssr: true, points: [root, q, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      // during discovery the hook throws a paused promise (the pass awaits only the shell), the
      // executor sees the marker in the cache and kicks the fetch in the background
      let html = await readUntil(reader, decoder, '', 'hook-loading')
      expect(html).toContain('hook-loading')
      expect(html).not.toContain('s=5')
      expect(html).not.toContain('</html>')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('s=5')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('</html>')
    })
  }, 15000)

  it('useSuspenseQuery error: the fallback ships, the error state is pushed, the response closes (client retries after hydration)', async () => {
    const root = createRoot()
    const gate = createGate()
    const q = root
      .lets('query', 'failing')
      .loader(async () => {
        await gate.promise
        return { s: 5 }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">hook-fail-loading</div>)
      .error(({ error }) => <div id="page-error">{error.message}</div>)
      .page(() => {
        const { data } = q.useSuspenseQuery()
        return <div id="page">{`s=${data.s}`}</div>
      })
    const { client } = await createTestThings({ ssr: true, points: [root, q, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'hook-fail-loading')
      gate.reject(new Error('suspense boom'))
      html = await readToEnd(reader, decoder, html)
      // the suspension resolves, the hook re-runs and THROWS the query error (TanStack suspense
      // semantics) — on the server the boundary keeps its fallback and the CLIENT retries after
      // hydration (ErrorBoundary → `.error()`); the pushed error state means no client refetch
      expect(html).toContain('hook-fail-loading')
      expect(html).not.toContain('s=5')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('</html>')
      // not the bare-index SPA fallback
      expect(html).toContain('__POINT0_DEHYDRATED_SUPER_STORE__')
    })
  }, 15000)

  it('useSuspenseInfiniteQuery: the first page streams after the shell', async () => {
    const root = createRoot()
    const gate = createGate()
    const q = root
      .lets('infiniteQuery', 'suspenseInf')
      .input(z.object({ cursor: z.number().optional() }))
      .loader(async ({ input }) => {
        await gate.promise
        const cursor = input.cursor ?? 0
        return { items: ['s1', 's2'], nextCursor: cursor + 2 }
      })
      .infiniteQuery({
        pageParamFromInput: {
          get: ({ input, get }) => get(input, 'cursor'),
          set: ({ input, value, set }) => set(input, 'cursor', value),
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">suspense-inf-loading</div>)
      .page(() => {
        // data non-optional, first page guaranteed once rendered
        const { data } = q.useSuspenseInfiniteQuery()
        return <div id="page">{`items=${data.pages[0].items.join(',')}`}</div>
      })
    const { client } = await createTestThings({ ssr: true, points: [root, q, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'suspense-inf-loading')
      expect(html).toContain('suspense-inf-loading')
      expect(html).not.toContain('items=s1,s2')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('items=s1,s2')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('</html>')
    })
  }, 15000)

  it("allowedDiscoveryRenders cuts discovery short: a still-pending 'auto' query streams instead of shipping a dead pending state", async () => {
    const root = createRoot()
    const gate = createGate()
    const loaderCalls: string[] = []
    const q1 = root
      .lets('query', 'first')
      .loader(() => {
        loaderCalls.push('first')
        return { a: 1 }
      })
      .query()
    const q2 = root
      .lets('query', 'second')
      .loader(async () => {
        loaderCalls.push('second')
        await gate.promise
        return { b: 2 }
      })
      .query()
    const Second = () => {
      const query = q2.useQuery()
      return <div id="second">{query.data ? `b=${query.data.b}` : 'second-pending'}</div>
    }
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">budget-loading</div>)
      .page(() => {
        const query = q1.useQuery()
        if (!query.data) {
          return <div id="page">first-pending</div>
        }
        return (
          <div id="page">
            <div id="first">{`a=${query.data.a}`}</div>
            <Second />
          </div>
        )
      })
    const { client } = await createTestThings({ ssr: { allowedDiscoveryRenders: 1 }, points: [root, q1, q2, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      // the single allowed discovery render found and awaited q1, but the budget forbids the
      // re-render that would discover q2 — the final render reveals it and, as an 'auto' query,
      // it suspends into the page boundary and streams (the shell ships the fallback meanwhile)
      let html = await readUntil(reader, decoder, '', 'budget-loading')
      expect(loaderCalls).toEqual(['first', 'second'])
      expect(html).not.toContain('b=2')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('a=1')
      expect(html).toContain('b=2')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('</html>')
    })
  }, 15000)

  it('suspend: false — a query the cut-short discovery never reached ships its pending state, no streaming', async () => {
    const root = createRoot()
    const loaderCalls: string[] = []
    const q1 = root
      .lets('query', 'first')
      .loader(() => {
        loaderCalls.push('first')
        return { a: 1 }
      })
      .query()
    const q2 = root
      .lets('query', 'second')
      .loader(() => {
        loaderCalls.push('second')
        return { b: 2 }
      })
      .query({ suspend: false })
    const Second = () => {
      const query = q2.useQuery()
      return <div id="second">{query.data ? `b=${query.data.b}` : 'second-pending'}</div>
    }
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">nostream-loading</div>)
      .page(() => {
        const query = q1.useQuery()
        if (!query.data) {
          return <div id="page">first-pending</div>
        }
        return (
          <div id="page">
            <div id="first">{`a=${query.data.a}`}</div>
            <Second />
          </div>
        )
      })
    const { fetchSsr } = await createTestThings({ ssr: { allowedDiscoveryRenders: 1 }, points: [root, q1, q2, page] })
    const result = await fetchSsr(page)
    // q2 was revealed only in the final render; `suspend: false` forbids suspending, so the HTML
    // ships whole with its pending state in place and the client fetches after hydration — the
    // loader never ran on the server
    expect(loaderCalls).toEqual(['first'])
    expect(result.html).toContain('a=1')
    expect(result.html).toContain('second-pending')
    expect(result.html).not.toContain('b=2')
  })

  it('allowedDiscoveryRenders: 0 — no discovery render at all: the shell ships immediately, everything streams', async () => {
    const root = createRoot()
    const gate = createGate()
    const q = root
      .lets('query', 'slow')
      .loader(async () => {
        await gate.promise
        return { x: 1 }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">zero-loading</div>)
      .page(() => {
        // plain 'auto' — a discovery pass would have awaited it and blocked the response on the
        // gate; with a zero budget it is first revealed in the final render and streams instead
        const query = q.useQuery()
        return <div id="page">{query.data ? `x=${query.data.x}` : 'pending'}</div>
      })
    const { client } = await createTestThings({ ssr: { allowedDiscoveryRenders: 0 }, points: [root, q, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      expect(response.headers.get('x-point0-discovery-renders')).toBe('0')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      // the shell arrives while the loader is still gated — zero renders happened before it
      let html = await readUntil(reader, decoder, '', 'zero-loading')
      expect(html).not.toContain('x=1')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('x=1')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('</html>')
    })
  }, 15000)

  it('allowedDiscoveryRenders: 0 — the data endpoint still serves whatever the warm-up prefetched', async () => {
    const root = createRoot()
    const loaderCalls: string[] = []
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => {
        loaderCalls.push('self')
        return { x: 1 }
      })
      .query()
      .page(({ data }) => <div id="page">{`x=${data.x}`}</div>)
    // Zero discovery renders is NOT an empty data response: the pre-render warm-up
    // (`prefetchLoadersBeforePageRender` → the declared loaders, plus any onPrefetch hooks)
    // still runs, so the dehydrated state carries exactly what a client-navigation prefetch
    // would have warmed — undiscovered queries just load on the client after navigating.
    const { fetchQueryClientDehydratedState } = await createTestThings({
      ssr: { allowedDiscoveryRenders: 0, prefetchLoadersBeforePageRender: true },
      points: [root, page],
    })
    const result = await fetchQueryClientDehydratedState(page)
    expect(result.rendersCount).toBe(0)
    expect(result.queryClientQueriesPreview).toContain('{"x":1}')
    expect(loaderCalls).toEqual(['self'])
  })

  it('allowedDiscoveryRenders: 0 — a redirect in the final render shell still becomes the HTTP redirect', async () => {
    const root = createRoot()
    const routes = Routes.create({ page1: '/1', page2: '/2' })
    let { redirect } = createNavigation({ routes })
    const page1 = root
      .lets('page', 'page1', '/1')
      .with(() => redirect('page2'))
      .page(() => <div id="page1">never</div>)
    const page2 = root.lets('page', 'page2', '/2').page(() => <div id="page2">target-content</div>)
    const {
      fetchPreview,
      fetchRecorder,
      redirect: redirect_fixCicular,
    } = await createTestThings({ ssr: { allowedDiscoveryRenders: 0 }, points: [root, page1, page2], routes })
    redirect = redirect_fixCicular
    fetchRecorder.prune()
    expect(await fetchPreview(page1)).toMatchInlineSnapshot(`
      "
      #page2: target-content
      "
    `)
    const fetchRecords = await fetchRecorder.waitFinishedResults()
    expect(fetchRecords.map((r) => r.response.status)).toMatchInlineSnapshot(`
      [
        302,
        200,
      ]
    `)
  }, 15000)

  it("streaming-first for free: `.queryOptions({ suspend: 'server' })` on the root streams every query", async () => {
    const root = Point0.lets('root', 'root')
      .loading(() => <div id="loading">root-loading</div>)
      .error(({ error }) => <div id="error">{error.message}</div>)
      .queryOptions({
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
        // the app-wide streaming-first "mode": every query inherits it through the options merge
        suspend: 'server',
      })
      .root()
    const gate = createGate()
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => {
        await gate.promise
        return { x: 9 }
      })
      .query()
      .loading(() => <div id="page-loading">firstpaint-loading</div>)
      .page(({ data }) => <div id="page">{`x=${data.x}`}</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      // nothing blocks discovery (every query is streamed by inherited default) — the shell ships
      // at once and the data follows in the same response
      let html = await readUntil(reader, decoder, '', 'firstpaint-loading')
      expect(html).toContain('firstpaint-loading')
      expect(html).not.toContain('x=9')
      gate.release()
      html = await readToEnd(reader, decoder, html)
      expect(html).toContain('x=9')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('</html>')
    })
  }, 15000)

  it('deferred loader error (recommended `retryOnMount: false` root): the mountable `.error()` streams in place, the page and the response stay alive', async () => {
    const root = createRoot()
    const gate = createGate()
    // the deferred query is the page's own chain query (`.loader()` + `.query()`), so the error
    // path renders the mountable's `.error()` — a hook called manually inside the body would
    // leave error rendering to the user's own code instead
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => {
        await gate.promise
        return { x: 1 }
      })
      .query({ suspend: 'server' })
      .loading(() => <div id="page-loading">failing-loading</div>)
      .page(({ data }) => <div id="page">{`x=${data.x}`}</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, page] })
    // The failed loader's post-shell bookkeeping (the nested fetch's status bubble-up, the bound
    // `.error()` component setting the page status) must not trip the sealed-effects warning —
    // it is reserved for USER loaders touching the response too late.
    const warnSpy = spyOn(console, 'warn')
    try {
      await client.run(async () => {
        const response = await client.fetch('http://localhost/')
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let html = await readUntil(reader, decoder, '', 'failing-loading')
        // the response is streaming, the shell is out — now the deferred loader fails
        gate.reject(new Error('deferred boom'))
        html = await readToEnd(reader, decoder, html)
        // the boundary resolves with the mountable's `.error()` streamed in place, and the error
        // state is pushed so the client hydrates the same thing — the page stays alive
        expect(html).toContain('failing-loading')
        expect(html).toContain('deferred boom')
        expect(html).not.toContain('x=1')
        expect(html).toContain('__POINT0_PUSH_QUERY__("')
        expect(html).toContain('</html>')
        // and it was NOT the bare-index SPA fallback — the dehydrated store shipped with the shell
        expect(html).toContain('__POINT0_DEHYDRATED_SUPER_STORE__')
      })
      const sealWarnings = warnSpy.mock.calls
        .flat()
        .map(String)
        .filter((warning) => warning.includes('has no effect'))
      expect(sealWarnings).toEqual([])
    } finally {
      warnSpy.mockRestore()
    }
  }, 15000)

  it('failed blocking loader with the default retryOnMount: SSR ships the loading state, the error rides the dehydrated cache', async () => {
    const root = createDefaultRetryRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(async (): Promise<{ x: number }> => {
        throw new Error('default boom')
      })
      .query()
      .loading(() => <div id="page-loading">default-loading</div>)
      .page(({ data }) => <div id="page">{`x=${data.x}`}</div>)
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
    const result = await fetchSsr(page)
    // with `retryOnMount` left at the TanStack default (true), an errored query reports itself
    // as optimistically pending ("a mount will retry me") — SSR imitates the client and renders
    // the loading state; an errored query is not pending, so nothing streams either. Only the
    // BODY is optimistic: the loader's error status still reaches the response through the
    // nested-fetch status bubble-up, exactly as it always did
    expect(result.response.status).toBe(500)
    expect(result.preview).toContain('default-loading')
    expect(result.preview).not.toContain('default boom')
    expect(result.html).not.toContain('__POINT0_PUSH_QUERY__("')
    // the error itself travels in the dehydrated cache — the client hydrates the same
    // optimistic-pending view and retries on mount
    expect(result.queryClientQueriesPreview).toContain('Error: default boom')
  })

  it('failed streamed loader with the default retryOnMount: the loading state streams in place, the error is pushed, the response closes', async () => {
    const root = createDefaultRetryRoot()
    const gate = createGate()
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => {
        await gate.promise
        return { x: 1 }
      })
      .query({ suspend: 'server' })
      .loading(() => <div id="page-loading">default-failing-loading</div>)
      .error(({ error }) => <div id="page-error">{error.message}</div>)
      .page(({ data }) => <div id="page">{`x=${data.x}`}</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'default-failing-loading')
      gate.reject(new Error('default deferred boom'))
      html = await readToEnd(reader, decoder, html)
      // the suspension resolves and the retry render sees the optimistic-pending report — the
      // LOADING state streams into the boundary, never `.error()` (that belongs to the client
      // after its on-mount retry fails); the pushed error state is what that retry reads. The
      // cache read under the observer is what keeps this from re-suspending forever.
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).not.toContain('id="page-error"')
      expect(html).toContain('</html>')
      expect(html).toContain('__POINT0_DEHYDRATED_SUPER_STORE__')
    })
  }, 15000)

  it('useSuspenseQuery error with the default retryOnMount: the hook still throws to the boundary — the fallback ships, the response closes', async () => {
    const root = createDefaultRetryRoot()
    const gate = createGate()
    const q = root
      .lets('query', 'failingDefault')
      .loader(async () => {
        await gate.promise
        return { s: 5 }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">hook-default-loading</div>)
      .error(({ error }) => <div id="page-error">{error.message}</div>)
      .page(() => {
        const { data } = q.useSuspenseQuery()
        return <div id="page">{`s=${data.s}`}</div>
      })
    const { client } = await createTestThings({ ssr: true, points: [root, q, page] })
    await client.run(async () => {
      const response = await client.fetch('http://localhost/')
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let html = await readUntil(reader, decoder, '', 'hook-default-loading')
      gate.reject(new Error('suspense default boom'))
      html = await readToEnd(reader, decoder, html)
      // deliberate deviation from the option on the server: a "retry on mount" cannot happen
      // during SSR (nothing mounts), so the hook reads the cache underneath the
      // optimistic-pending report and throws the error to the boundary either way — the fallback
      // stays in the HTML, the error is pushed, and the client (with the truthy default) retries
      // on mount after hydration
      expect(html).toContain('hook-default-loading')
      expect(html).not.toContain('s=5')
      expect(html).toContain('__POINT0_PUSH_QUERY__("')
      expect(html).toContain('</html>')
    })
  }, 15000)

  it('a streamed loader that throws a redirect post-shell: the redirect-carrying error state is pushed, the stream closes', async () => {
    const root = createRoot()
    const gate = createGate()
    const routes = Routes.create({ home: '/', target: '/target' })
    const { redirect } = createNavigation({ routes })
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => {
        await gate.promise
        // resolves AFTER the shell: no HTTP 302 possible anymore — the redirect travels to the
        // client inside the pushed error state, and the hydrated `.error()` data path renders
        // `<Redirect>` for the client-side hop (designed in code; the hop itself is a hydration
        // concern — see the browser e2e)
        throw redirect('target')

        return { x: 1 }
      })
      .query({ suspend: 'server' })
      .loading(() => <div id="page-loading">redirect-stream-loading</div>)
      .page(({ data }) => <div id="page">{`x=${data.x}`}</div>)
    const target = root.lets('page', 'target', '/target').page(() => <div id="target">target</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, page, target], routes })
    const warnSpy = spyOn(console, 'warn')
    const errorSpy = spyOn(console, 'error')
    try {
      await client.run(async () => {
        const response = await client.fetch('http://localhost/')
        expect(response.status).toBe(200)
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let html = await readUntil(reader, decoder, '', 'redirect-stream-loading')
        gate.release()
        html = await readToEnd(reader, decoder, html)
        // the redirect-carrying error state is pushed for the client's cache…
        expect(html).toContain('__POINT0_PUSH_QUERY__("')
        expect(html).toContain('</html>')
        // …and the server rendered no page content for the redirecting query
        expect(html).not.toContain('x=1')
        expect(html).not.toContain('id="target"')
      })
      // a post-shell redirect degrading to the client-side hop is normal operation: no sealed
      // warning, no stream-render-error log
      const sealWarnings = warnSpy.mock.calls
        .flat()
        .map(String)
        .filter((warning) => warning.includes('has no effect'))
      expect(sealWarnings).toEqual([])
      const streamRenderErrorLogs = errorSpy.mock.calls.filter((call) =>
        call.some((arg) => String(arg).includes('SSR streamed render error')),
      )
      expect(streamRenderErrorLogs).toEqual([])
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  }, 15000)

  it('a streamed subtree setting a cookie after the shell warns instead of dropping it silently', async () => {
    const root = createRoot()
    const gate = createGate()
    const theme = CookieStore.define('theme')
    const q = root
      .lets('query', 'slow')
      .loader(async () => {
        await gate.promise
        return { x: 1 }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">cookie-loading</div>)
      .page(() => {
        const query = q.useQuery(undefined, { suspend: 'server' })
        // Set only once the streamed data arrived: in discovery the query is pending (no set —
        // nothing staged pre-shell), in the final render the resolved subtree runs post-shell.
        useEffectSsr(() => {
          if (query.data) {
            theme.set('dark')
          }
        }, [!!query.data])
        return <div id="page">{query.data ? `x=${query.data.x}` : 'pending'}</div>
      })
    const { client } = await createTestThings({ ssr: true, points: [root, q, page] })
    const warnSpy = spyOn(console, 'warn')
    try {
      await client.run(async () => {
        const response = await client.fetch('http://localhost/')
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let html = await readUntil(reader, decoder, '', 'cookie-loading')
        // headers already left with the shell — the late cookie cannot be in them
        expect(response.headers.getSetCookie().some((cookie) => cookie.startsWith('theme='))).toBe(false)
        gate.release()
        html = await readToEnd(reader, decoder, html)
        expect(html).toContain('x=1')
        expect(html).toContain('</html>')
      })
      const cookieWarnings = warnSpy.mock.calls
        .flat()
        .map(String)
        .filter((warning) => warning.includes('CookieStore.set("theme") has no effect'))
      expect(cookieWarnings.length).toBeGreaterThanOrEqual(1)
    } finally {
      warnSpy.mockRestore()
    }
  }, 15000)

  it('a render throw is contained by the mountable boundaries — no SPA fallback', async () => {
    const root = createRoot()
    const broken = root
      .lets('component', 'broken')
      .loading(() => <div id="broken-loading">broken-loading</div>)
      .error(({ error }) => <div id="broken-error">{error.message}</div>)
      .component((): React.ReactNode => {
        throw new Error('render boom')
      })
    const page = root.lets('page', 'home', '/').page(() => (
      <div id="page">
        <div id="alive">alive-content</div>
        <broken.X />
      </div>
    ))
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, broken, page] })
    // fetchSsr itself proves no SPA fallback: the bare index.html has no dehydrated store script
    const result = await fetchSsr(page)
    // the rest of the page rendered and shipped
    expect(result.html).toContain('alive-content')
    // on the server React contains the throw at the mountable's Suspense boundary and ships its
    // loading fallback; the client retries on hydration and the ErrorBoundary renders `.error()`
    expect(result.html).toContain('broken-loading')
  })

  it('a redirect thrown after the shell cannot become an HTTP redirect: the shell status stands, the stream closes, no error log', async () => {
    const root = createRoot()
    const gate = createGate()
    const routes = Routes.create({ home: '/', target: '/target' })
    const { redirect } = createNavigation({ routes })
    const q = root
      .lets('query', 'slow')
      .loader(async () => {
        await gate.promise
        return { x: 1 }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">redirect-loading</div>)
      .page(() => {
        const query = q.useQuery(undefined, { suspend: 'server' })
        if (query.data) {
          // Runs only in the post-shell retry render (during discovery the query is pending).
          // Sealed effects: the throw cannot 302 anymore and is skipped SILENTLY — a post-shell
          // redirect degrading to the client-side hop is normal operation, not a failure, so it
          // must not be error-logged either (the client boundary's redirect passthrough hops
          // after hydration, reading the pushed query data without a refetch).
          throw redirect('target')
        }
        return <div id="page">pending</div>
      })
    const target = root.lets('page', 'target', '/target').page(() => <div id="target">target</div>)
    const { client } = await createTestThings({ ssr: true, points: [root, q, page, target], routes })
    const warnSpy = spyOn(console, 'warn')
    const errorSpy = spyOn(console, 'error')
    try {
      await client.run(async () => {
        const response = await client.fetch('http://localhost/')
        expect(response.status).toBe(200)
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let html = await readUntil(reader, decoder, '', 'redirect-loading')
        expect(html).toContain('redirect-loading')
        gate.release()
        // the stream closes cleanly — the errored boundary keeps the fallback in the HTML and
        // the resolved query state is still pushed for the client's retry
        html = await readToEnd(reader, decoder, html)
        expect(html).toContain('__POINT0_PUSH_QUERY__("')
        expect(html).toContain('</html>')
        expect(html).not.toContain('#target')
      })
      const sealWarnings = warnSpy.mock.calls
        .flat()
        .map(String)
        .filter((warning) => warning.includes('has no effect'))
      expect(sealWarnings).toEqual([])
      const streamRenderErrorLogs = errorSpy.mock.calls.filter((call) =>
        call.some((arg) => String(arg).includes('SSR streamed render error')),
      )
      expect(streamRenderErrorLogs).toEqual([])
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  }, 15000)

  it('an error thrown after the shell: the shell status stands (silent sealed skip), the failure is logged once', async () => {
    const root = createRoot()
    const gate = createGate()
    const q = root
      .lets('query', 'slow')
      .loader(async () => {
        await gate.promise
        return { x: 1 }
      })
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loading(() => <div id="page-loading">late-status-loading</div>)
      .page(() => {
        const query = q.useQuery(undefined, { suspend: 'server' })
        if (query.data) {
          // Post-shell retry render: the 401 can no longer reach the response (headers left with
          // the shell) — the sealed skip is SILENT, matching what the bound `.error()` component
          // does for a returned error post-shell; the throw itself is still a real render
          // failure and gets the one SSR_STREAM_RENDER_ERROR log.
          throw new ErrorPoint0('late boom', { status: 401 })
        }
        return <div id="page">pending</div>
      })
    const { client } = await createTestThings({ ssr: true, points: [root, q, page] })
    const warnSpy = spyOn(console, 'warn')
    const errorSpy = spyOn(console, 'error')
    try {
      await client.run(async () => {
        const response = await client.fetch('http://localhost/')
        expect(response.status).toBe(200)
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let html = await readUntil(reader, decoder, '', 'late-status-loading')
        gate.release()
        html = await readToEnd(reader, decoder, html)
        expect(html).toContain('</html>')
      })
      const sealWarnings = warnSpy.mock.calls
        .flat()
        .map(String)
        .filter((warning) => warning.includes('has no effect'))
      expect(sealWarnings).toEqual([])
      // one console.error CALL (a call's args match the message twice: the text + the error object)
      const streamRenderErrorLogs = errorSpy.mock.calls.filter((call) =>
        call.some((arg) => String(arg).includes('SSR streamed render error')),
      )
      expect(streamRenderErrorLogs.length).toBe(1)
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  }, 15000)
})

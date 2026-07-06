import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout, spyOn } from 'bun:test'
import { Point0, useEffectSsr } from '@point0/core'
import { CookieStore } from '@point0/core/cookie-store'
import z from 'zod'
import { createTestThings } from './utils/internal-testing.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(45000)

// Streamed SSR — the `suspend` query option ('auto' | 'server' | boolean), the `ssr: boolean`
// option, and the useSuspenseQuery/useSuspenseInfiniteQuery hooks. The shell ships immediately
// with the mountable's `.loading()` fallback; a streamed query's content arrives in the same
// response when its loader resolves, together with a `window.__POINT0_PUSH_QUERY__("…")` script
// that seeds the client query cache.
//
// The tests are SERIAL on purpose (`it`, not `it.concurrent`): most of them hold a response
// stream open on a gated loader and read it incrementally — several gated streams interleaving in
// one process deadlock/flake. Don't "fix" them back to concurrent.

const createRoot = () =>
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
    // itself is exercised in the browser e2e matrix — see the backlog).
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

  it('deferred loader error: the mountable `.error()` streams in place, the page and the response stay alive', async () => {
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
})

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

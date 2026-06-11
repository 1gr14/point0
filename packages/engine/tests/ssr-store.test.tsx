import { describe, expect, it } from 'bun:test'
import { Point0, useEffectSsr } from '@point0/core'
import { SsrStore } from '@point0/core/ssr-store'
import z from 'zod'
import { createTestThings } from './utils/internal-testing.js'

describe('ssr-store', () => {
  it('default value renders and is transferred to the client', async () => {
    const title = SsrStore.define('ssr-store.test.default', () => 'default title')
    const root = Point0.lets('root', 'root').root()
    const layout = root.lets('layout', 'app').layout(({ children }) => (
      <div id="layout">
        <div id="title">{title.use()}</div>
        {children}
      </div>
    ))
    const page = layout.lets('page', 'home', '/').page(() => <div id="page">x</div>)

    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, layout, page] })
    const result = await fetchSsr(page)

    expect(result.preview).toMatchInlineSnapshot(`
      "
      #layout:
        #title: default title
        #page: x
      "
    `)
    expect(result.dehydratedSuperStore['ssr-store.test.default']).toBe('default title')
    expect(result.rendersCount).toBe(1)
  })

  it('page override during SSR is reflected in an already-rendered layout', async () => {
    const title = SsrStore.define('ssr-store.test.override', () => 'default title')
    const root = Point0.lets('root', 'root').root()
    // The layout renders ABOVE the page, so on the first render it reads the
    // default. The page overrides the value during SSR (via useEffectSsr). Only
    // because prefetchAppPagePointDeep re-renders until the SSR stores stabilize
    // does the layout end up showing the overridden value.
    const layout = root.lets('layout', 'app').layout(({ children }) => (
      <div id="layout">
        <div id="title">{title.use()}</div>
        {children}
      </div>
    ))
    const page = layout.lets('page', 'home', '/').page(() => {
      useEffectSsr(() => {
        title.set('overridden title')
      }, [])
      return <div id="page">x</div>
    })

    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, layout, page] })
    const result = await fetchSsr(page)

    expect(result.preview).toMatchInlineSnapshot(`
      "
      #layout:
        #title: overridden title
        #page: x
      "
    `)
    expect(result.dehydratedSuperStore['ssr-store.test.override']).toBe('overridden title')
    expect(result.rendersCount).toBe(2)
  })

  it('page override during SSR is reflected in an already-rendered layout with queries', async () => {
    const title = SsrStore.define('ssr-store.test.override', () => 'default title')
    const root = Point0.lets('root', 'root').root()
    // The layout renders ABOVE the page, so on the first render it reads the
    // default. The page overrides the value during SSR (via useEffectSsr). Only
    // because prefetchAppPagePointDeep re-renders until the SSR stores stabilize
    // does the layout end up showing the overridden value.
    const layout = root
      .lets('layout', 'app')
      .loader(() => ({ x: 'layout data' }))
      .layout(({ data, children }) => (
        <div id="layout">
          <div id="title">{title.use()}</div>
          <div id="layout-content">{data.x}</div>
          {children}
        </div>
      ))
    const page = layout
      .lets('page', 'home', '/')
      .loader(() => ({ x: 'page data' }))
      .page(({ data }) => {
        useEffectSsr(() => {
          title.set('overridden title')
        }, [])
        return <div id="page">{data.x}</div>
      })

    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, layout, page] })
    const result = await fetchSsr(page)

    expect(result.preview).toMatchInlineSnapshot(`
      "
      #layout:
        #title: overridden title
        #layout-content: layout data
        #page: page data
      "
    `)
    expect(result.dehydratedSuperStore['ssr-store.test.override']).toBe('overridden title')
    expect(result.rendersCount).toBe(4) // initial, layout, page, ssr-store
  })

  it('request.renders is readable everywhere: live in a loader, final in the engineFetchSettled event data and meta', async () => {
    const title = SsrStore.define('ssr-store.test.renders', () => 'default title')
    const settledRenders: Array<{ path: string; variant: string; data: number; meta: number | undefined }> = []
    const root = Point0.lets('root', 'root')
      .on('engineFetchSettled', (event) => {
        settledRenders.push({
          path: event.data.request.location.pathname,
          variant: event.data.request.variant.type,
          data: event.data.request.renders,
          meta: (event.meta.request as { renders?: number }).renders,
        })
      })
      .root()
    const layout = root.lets('layout', 'app').layout(({ children }) => (
      <div id="layout">
        <div id="title">{title.use()}</div>
        {children}
      </div>
    ))
    const page = layout
      .lets('page', 'home', '/')
      .loader(({ request }) => ({ loaderSawRenders: request.renders }))
      .page(({ data }) => {
        useEffectSsr(() => {
          title.set('overridden title')
        }, [])
        return <div id="page">loader saw {data.loaderSawRenders}</div>
      })

    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, layout, page] })
    const result = await fetchSsr(page)

    expect(result.rendersCount).toBe(3) // initial, page, ssr-store
    // The loader was prefetched during the FIRST pass — request.renders is live mid-SSR.
    expect(result.preview).toContain('loader saw 1')
    // In data the count always travels on the request itself (`data.request.renders`, the same
    // object as `data.result.request`); meta gets a `renders` key only when the SSR loop actually
    // ran. The dev-client middleware probe rendered nothing (data 0, no meta key); the nested
    // in-SSR query fetch shares the page request's cache through the request chain, so it reports
    // the live mid-SSR value; the page request itself reports the final total.
    expect(settledRenders).toEqual([
      { path: '/', variant: 'page', data: 0, meta: undefined },
      { path: '/_point0/root/page/home', variant: 'endpoint', data: 1, meta: 1 },
      { path: '/', variant: 'page', data: 3, meta: 3 },
    ])
  })

  it('allowedRerendersCount stops the loop quietly (no error) before the hard cap', async () => {
    let setCount = 0
    const title = SsrStore.define('ssr-store.test.allowed-one', () => 'init')
    const root = Point0.lets('root', 'root').root()
    const layout = root.lets('layout', 'app').layout(({ children }) => (
      <div id="layout">
        <div id="title">{title.use()}</div>
        {children}
      </div>
    ))
    // Never stabilizes, but the soft cap stops it well before forbiddenRerendersCount.
    const page = layout.lets('page', 'home', '/').page(() => {
      useEffectSsr(() => {
        title.set(`v${setCount}`)
        setCount++
      }, [])
      return <div id="page">x</div>
    })

    const logs: Array<{ level: string; category: string[]; message: string }> = []
    const { fetchSsr } = await createTestThings({
      ssr: { allowedRerendersCount: 1 },
      points: [root, layout, page],
      engineOptions: {
        logger: {
          log: (o) => {
            logs.push(o)
          },
        },
      },
    })
    await fetchSsr(page)

    // Soft cap: stops at allowedRerendersCount without raising the forbidden-cap error.
    expect(logs.filter((l) => l.level === 'error' && l.category.includes('ssr'))).toEqual([])
  })

  // A query feeds an SsrStore (via useEffectSsr), and the stored value is the input of a
  // SECOND query. The SSR loop must commit the staged store value during prefetch so the
  // dependent query (q2 with the real input) is discovered and prefetched — in BOTH the
  // HTML and the data-only (queryClientDehydratedState) paths. If the store is committed
  // only after the HTML stabilization render (or, worse, never in data mode), q2 is issued
  // with the stale/fallback input — or not at all — and the prefetched value is wrong/missing.
  const buildChainPoints = () => {
    const x = SsrStore.define<number>('ssr-store.test.chain', () => 0)
    const root = Point0.lets('root', 'root')
      .queryOptions({ retry: false, refetchOnMount: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
      .root()
    const q1 = root
      .lets('query', 'q1')
      .loader(async () => ({ id: 5 }))
      .query()
    const q2 = root
      .lets('query', 'q2')
      .input(z.object({ x: z.number() }))
      .loader(async ({ input }) => ({ y: input.x * 10 }))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => ({}))
      .page(() => {
        const q1res = q1.useQuery()
        useEffectSsr(() => {
          if (q1res.data) {
            x.set(q1res.data.id)
          }
        }, [q1res.data])
        const xValue = x.use()
        // Dependent query: gated with `enabled` so it is issued only once the store carries
        // the real value (idiomatic react-query dependent-query pattern).
        const q2res = q2.useQuery({ x: xValue }, { enabled: !!xValue })
        return (
          <div id="page">
            x={xValue}, y={q2res.data?.y ?? 'nothing'}
          </div>
        )
      })
    return { root, q1, q2, page }
  }

  it('dependent query whose input comes from an SsrStore is prefetched in HTML mode', async () => {
    const { root, q1, q2, page } = buildChainPoints()
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, q1, q2, page] })
    const result = await fetchSsr(page)
    // Final HTML uses the committed store value (5) and the dependent query result (50).
    expect(result.preview).toMatchInlineSnapshot(`
      "
      #page: x=5, y=50
      "
    `)
    // The dependent query was prefetched with the REAL input ({"x":5}), not the fallback.
    expect(result.queryClientQueriesPreview).toContain('point0|root|query|q2|server|finite||data|{"x":5}')
    expect(result.queryClientQueriesPreview).toContain('{"y":50}')
    expect(result.rendersCount).toBe(5) // initial, page, q1, ssr-store, q2
  })

  it('dependent query whose input comes from an SsrStore is prefetched in data-only mode', async () => {
    const { root, q1, q2, page } = buildChainPoints()
    const { fetchQueryClientDehydratedState } = await createTestThings({ ssr: true, points: [root, q1, q2, page] })
    const result = await fetchQueryClientDehydratedState(page)
    // BUG (pre-fix): in data mode the store is never committed, so q2 is never issued with
    // x=5 and its value is missing from the dehydrated state — the client would have to
    // refetch it. After the fix the SSR loop commits the store during prefetch in data mode
    // too, so q2({"x":5})={"y":50} is present.
    expect(result.queryClientQueriesPreview).toContain('point0|root|query|q2|server|finite||data|{"x":5}')
    expect(result.queryClientQueriesPreview).toContain('{"y":50}')
    expect(result.rendersCount).toBe(5) // initial, page, q1, ssr-store, q2
  })

  it('forbiddenRerendersCount stops the loop and logs a server error', async () => {
    let setCount = 0
    const title = SsrStore.define('ssr-store.test.forbidden', () => 'init')
    const root = Point0.lets('root', 'root').root()
    const layout = root.lets('layout', 'app').layout(({ children }) => (
      <div id="layout">
        <div id="title">{title.use()}</div>
        {children}
      </div>
    ))
    // Sets a different value on every render, so the snapshot never stabilizes.
    const page = layout.lets('page', 'home', '/').page(() => {
      useEffectSsr(() => {
        title.set(`v${setCount}`)
        setCount++
      }, [])
      return <div id="page">x</div>
    })

    const logs: Array<{ level: string; category: string[]; message: string }> = []
    const { fetchSsr } = await createTestThings({
      ssr: { forbiddenRerendersCount: 2 },
      points: [root, layout, page],
      engineOptions: {
        logger: {
          log: (o) => {
            logs.push(o)
          },
        },
      },
    })
    await fetchSsr(page)

    const ssrErrors = logs.filter((l) => l.level === 'error' && l.category.includes('ssr'))
    expect(ssrErrors.length).toBe(1)
    expect(ssrErrors[0].message).toContain('did not stabilize after 2 re-renders')
  })
})

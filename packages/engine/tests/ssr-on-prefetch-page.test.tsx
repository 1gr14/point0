import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import { createTestThings } from './utils/internal-testing.js'

describe('ssr onPrefetchPage hooks', () => {
  // onPrefetch hooks run only via prefetchPage (never in the normal render-to-discover
  // flow), so they are a clean signal that the always-on before-render prefetch step fired.

  it('runs the page onPrefetchPage hook before the first render by default (no opt-in)', async () => {
    const root = Point0.lets('root', 'root').root()
    const calls: string[] = []
    const page = root
      .lets('page', 'home', '/')
      .onPrefetchPage(() => {
        calls.push('onPrefetchPage')
      })
      .page(() => <div id="page">x</div>)
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
    await fetchSsr(page)
    expect(calls).toEqual(['onPrefetchPage'])
  })

  it('runs the serverOnPrefetchPage hook on the server before the first render', async () => {
    const root = Point0.lets('root', 'root').root()
    const calls: string[] = []
    const page = root
      .lets('page', 'home', '/')
      .serverOnPrefetchPage(() => {
        calls.push('serverOnPrefetchPage')
      })
      .page(() => <div id="page">x</div>)
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
    await fetchSsr(page)
    expect(calls).toEqual(['serverOnPrefetchPage'])
  })

  it('runs onPrefetch hooks on a layout (not just the page) before render', async () => {
    const root = Point0.lets('root', 'root').root()
    const calls: string[] = []
    const layout = root
      .lets('layout', 'app')
      .onPrefetchPage(() => {
        calls.push('layout')
      })
      .layout(({ children }) => <div id="layout">{children}</div>)
    const page = layout
      .lets('page', 'home', '/')
      .onPrefetchPage(() => {
        calls.push('page')
      })
      .page(() => <div id="page">x</div>)
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, layout, page] })
    await fetchSsr(page)
    expect(calls.sort()).toEqual(['layout', 'page'])
  })

  describe('prefetchLoadersBeforePageRender', () => {
    const createRoot = () =>
      Point0.lets('root', 'root')
        .loading(() => <div id="loading">...</div>)
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

    const buildPoints = (calls: string[]) => {
      const root = createRoot()
      const layout = root
        .lets('layout', 'app')
        .loader(() => ({ x: 1 }))
        .layout(({ data, children }) => (
          <div id="layout">
            <div id="layout-content">x={data.x}</div>
            {children}
          </div>
        ))
      const page = layout
        .lets('page', 'home', '/')
        .onPrefetchPage(() => {
          calls.push('onPrefetchPage')
        })
        .loader(() => ({ title: 'hi' }))
        .page(({ data }) => <div id="page">{data.title}</div>)
      return { root, layout, page }
    }

    it('off (default): fires the hook but leaves loaders to the discover loop (no render collapse)', async () => {
      const calls: string[] = []
      const { root, layout, page } = buildPoints(calls)
      const { fetchSsr } = await createTestThings({ ssr: true, points: [root, layout, page] })
      const { preview, rendersCount } = await fetchSsr(page)
      // the hook ran...
      expect(calls).toEqual(['onPrefetchPage'])
      // ...but it warmed nothing, so the layout + page loaders are still discovered by
      // rendering: initial, layout, page = 3 passes (turn on prefetchLoadersBeforePageRender
      // to prefetch the declared loaders up front and collapse it).
      expect(rendersCount).toBe(3)
      expect(preview).toMatchInlineSnapshot(`
        "
        #layout:
          #layout-content: x=1
          #page: hi
        "
      `)
    })

    it('on: prefetches the layout + page .loader() queries before render, collapsing to 1 pass', async () => {
      const calls: string[] = []
      const { root, layout, page } = buildPoints(calls)
      const { fetchSsr } = await createTestThings({
        ssr: { prefetchLoadersBeforePageRender: true },
        points: [root, layout, page],
      })
      const { preview, rendersCount } = await fetchSsr(page)
      // the hook still runs...
      expect(calls).toEqual(['onPrefetchPage'])
      // ...and the declared loaders are warmed up front, so the render finds the data in
      // cache on the first pass — no discover-then-fetch round-trips.
      expect(rendersCount).toBe(1)
      expect(preview).toMatchInlineSnapshot(`
        "
        #layout:
          #layout-content: x=1
          #page: hi
        "
      `)
    })

    it('on: prefetches a lone page .loader() (no layout) so the page renders in a single pass', async () => {
      const root = createRoot()
      const page = root
        .lets('page', 'home', '/')
        .loader(() => ({ title: 'from page loader' }))
        .page(({ data }) => <div id="page">{data.title}</div>)
      const { fetchSsr } = await createTestThings({
        ssr: { prefetchLoadersBeforePageRender: true },
        points: [root, page],
      })
      const { preview, rendersCount } = await fetchSsr(page)
      expect(rendersCount).toBe(1)
      expect(preview).toMatchInlineSnapshot(`
        "
        #page: from page loader
        "
      `)
    })
  })

  it('skips the prefetch step entirely for a hookless page (loader still discovered by the render loop)', async () => {
    const root = Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
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
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ title: 'from page loader' }))
      .page(({ data }) => <div id="page">{data.title}</div>)
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
    const { preview } = await fetchSsr(page)
    expect(preview).toMatchInlineSnapshot(`
      "
      #page: from page loader
      "
    `)
  })
})

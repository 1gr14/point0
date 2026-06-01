import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import { createTestThings } from './utils/internal-testing.js'

describe('ssr prefetchBeforePageRender', () => {
  // onPrefetch hooks run only via prefetchPage (never in the normal render-to-discover
  // flow), so they are a clean signal that the before-render prefetch fired.
  const build = () => {
    const root = Point0.lets('root', 'root').root()
    const calls: string[] = []
    const page = root
      .lets('page', 'home', '/')
      .onPrefetchPage(() => {
        calls.push('prefetched')
      })
      .page(() => <div id="page">x</div>)
    return { root, page, calls }
  }

  it('does not run the page onPrefetch hook during SSR by default', async () => {
    const { root, page, calls } = build()
    const { fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
    await fetchSsr(page)
    expect(calls).toEqual([])
  })

  it('runs the page onPrefetch hook before render when prefetchBeforePageRender is on', async () => {
    const { root, page, calls } = build()
    const { fetchSsr } = await createTestThings({
      ssr: { prefetchBeforePageRender: true },
      points: [root, page],
    })
    await fetchSsr(page)
    expect(calls).toEqual(['prefetched'])
  })

  it('runs onPrefetch on a layout (not just the page) before render', async () => {
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
    const { fetchSsr } = await createTestThings({
      ssr: { prefetchBeforePageRender: true },
      points: [root, layout, page],
    })
    await fetchSsr(page)
    expect(calls.sort()).toEqual(['layout', 'page'])
  })

  describe('with loaders', () => {
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

    it('prefetches a page loader before render', async () => {
      const root = createRoot()
      const page = root
        .lets('page', 'home', '/')
        .loader(() => ({ title: 'from page loader' }))
        .page(({ data }) => <div id="page">{data.title}</div>)
      const { fetchSsr } = await createTestThings({
        ssr: { prefetchBeforePageRender: true },
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

    it('prefetches a layout loader before render', async () => {
      const root = createRoot()
      const layout = root
        .lets('layout', 'app')
        .loader(() => ({ x: 7 }))
        .layout(({ data, children }) => (
          <div id="layout">
            <div id="layout-content">x={data.x}</div>
            {children}
          </div>
        ))
      const page = layout.lets('page', 'home', '/').page(() => <div id="page">p</div>)
      const { fetchSsr } = await createTestThings({
        ssr: { prefetchBeforePageRender: true },
        points: [root, layout, page],
      })
      const { preview, rendersCount } = await fetchSsr(page)
      expect(rendersCount).toBe(1)
      expect(preview).toMatchInlineSnapshot(`
        "
        #layout:
          #layout-content: x=7
          #page: p
        "
      `)
    })

    it('prefetches nested layouts (one with a loader, one without) and a page loader', async () => {
      const root = createRoot()
      const outer = root
        .lets('layout', 'outer')
        .loader(() => ({ name: 'outer data' }))
        .layout(({ data, children }) => (
          <div id="outer">
            <div id="outer-content">{data.name}</div>
            {children}
          </div>
        ))
      const inner = outer.lets('layout', 'inner').layout(({ children }) => <div id="inner">{children}</div>)
      const page = inner
        .lets('page', 'home', '/')
        .loader(() => ({ title: 'page data' }))
        .page(({ data }) => <div id="page">{data.title}</div>)
      const { fetchSsr } = await createTestThings({
        ssr: { prefetchBeforePageRender: true },
        points: [root, outer, inner, page],
      })
      const { preview, rendersCount } = await fetchSsr(page)
      expect(rendersCount).toBe(1)
      expect(preview).toMatchInlineSnapshot(`
        "
        #outer:
          #outer-content: outer data
          #inner:
            #page: page data
        "
      `)
    })

    it('renders identical output with and without prefetchBeforePageRender (it only changes when data is fetched)', async () => {
      const buildPoints = () => {
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
          .loader(() => ({ title: 'hi' }))
          .page(({ data }) => <div id="page">{data.title}</div>)
        return { root, layout, page }
      }

      const off = buildPoints()
      const offThings = await createTestThings({ ssr: true, points: [off.root, off.layout, off.page] })
      const on = buildPoints()
      const onThings = await createTestThings({
        ssr: { prefetchBeforePageRender: true },
        points: [on.root, on.layout, on.page],
      })

      const offResult = await offThings.fetchSsr(off.page)
      const onResult = await onThings.fetchSsr(on.page)
      expect(offResult.rendersCount).toBe(3) // initial, layout, page
      expect(onResult.rendersCount).toBe(1)
      expect(onResult.preview).toBe(offResult.preview)
      expect(onResult.preview).toMatchInlineSnapshot(`
        "
        #layout:
          #layout-content: x=1
          #page: hi
        "
      `)
    })
  })
})

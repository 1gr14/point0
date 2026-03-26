import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings, waitReturn } from './utils/internal-testing.js'

describe('loading component', () => {
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

  const createRootWithPageLoading = () =>
    Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
      .pageLoading(() => <div id="page-loading">...</div>)
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

  it('by default uses loading component defined in root', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .loader(() => waitReturn({ x: 1 }))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(query)
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ points: [root, query, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #loading: ...
    
              #page: x=1
            "
          `)
    })
  })

  it('by default uses pageLoading component defined in root', async () => {
    const root = createRootWithPageLoading()
    const query = root
      .lets('query', 'test')
      .loader(() => waitReturn({ x: 1 }))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(query)
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ points: [root, query, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #page-loading: ...
    
              #page: x=1
            "
          `)
    })
  })

  it('uses pageLoading and layoutLoading defined in layout', async () => {
    const root = createRootWithPageLoading()
    const layout = root
      .lets('layout', 'layout')
      .pageLoading(() => <div id="page-loading">...</div>)
      .layoutLoading(() => <div id="layout-loading">...</div>)
      .loader(() => waitReturn({ x: 1 }))
      .layout(({ children, data }) => (
        <div id="layout">
          <div id="layout-data">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout
      .lets('page', 'home', '/')
      .loader(() => waitReturn({ y: 1 }))
      .page(({ data }) => <div id="page-data">y={data.y}</div>)
    const { render } = await createTestThings({ points: [root, layout, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page-data')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #layout-loading: ...

              #layout:
                #layout-data: x=1
                #page-loading: ...

              #layout:
                #layout-data: x=1
                #page-data: y=1
            "
          `)
    })
  })

  it('uses loading component defined in page', async () => {
    const root = createRootWithPageLoading()
    const layout = root
      .lets('layout', 'layout')
      .pageLoading(() => <div id="page-loading">...</div>)
      .layoutLoading(() => <div id="layout-loading">...</div>)
      .loader(() => waitReturn({ x: 1 }))
      .layout(({ children, data }) => (
        <div id="layout">
          <div id="layout-data">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout
      .lets('page', 'home', '/')
      .loading(() => <div id="special-page-loading">...</div>)
      .loader(() => waitReturn({ y: 1 }))
      .page(({ data }) => <div id="page-data">y={data.y}</div>)
    const { render } = await createTestThings({ points: [root, layout, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page-data')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #layout-loading: ...

              #layout:
                #layout-data: x=1
                #special-page-loading: ...

              #layout:
                #layout-data: x=1
                #page-data: y=1
            "
          `)
    })
  })

  it('uses loading component defined in page, even for queries defined in base', async () => {
    const root = createRootWithPageLoading()
    const query1 = root
      .lets('query', 'query1')
      .loader(() => waitReturn({ x: 1 }))
      .query()
    const query2 = root
      .lets('query', 'query2')
      .loader(() => waitReturn({ y: 1 }))
      .query()
    const base = root
      .lets('base', 'base')
      .loading(() => <div id="shared-loading">...</div>)
      .pageLoading(() => <div id="page-loading">...</div>)
      .layoutLoading(() => <div id="layout-loading">...</div>)
      .with(query1)
      .base()
    const page = base
      .lets('page', 'home', '/')
      .loading(() => <div id="special-page-loading">...</div>)
      .with(query2)
      .page(({ queries }) => (
        <div id="page-data">
          x={queries[0].data.x} y={queries[1].data.y}
        </div>
      ))
    const { render } = await createTestThings({ points: [root, query1, query2, base, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page-data')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #special-page-loading: ...

              #page-data: x=1 y=1
            "
          `)
    })
  })

  it('uses loading component defined in plugin', async () => {
    const root = createRootWithPageLoading()
    const plugin = Point0.lets('plugin', 'test-plugin')
      .loading(() => <div id="plugin-loading">...</div>)
      .plugin()
    const layout = root
      .lets('layout', 'layout')
      .pageLoading(() => <div id="page-loading">...</div>)
      .layoutLoading(() => <div id="layout-loading">...</div>)
      .use(plugin)
      .loader(() => waitReturn({ x: 1 }))
      .layout(({ children, data }) => (
        <div id="layout">
          <div id="layout-data">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout
      .lets('page', 'home', '/')
      .loader(() => waitReturn({ y: 1 }))
      .page(({ data }) => <div id="page-data">y={data.y}</div>)
    const { render } = await createTestThings({ points: [root, layout, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page-data')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #plugin-loading: ...

              #layout:
                #layout-data: x=1
                #plugin-loading: ...

              #layout:
                #layout-data: x=1
                #page-data: y=1
            "
          `)
    })
  })
})

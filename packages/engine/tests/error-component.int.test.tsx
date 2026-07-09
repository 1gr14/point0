import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings, waitThrow, waitReturn } from './utils/internal-testing.js'

describe('error component', () => {
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
      .error(({ error }) => <div id="error">{error.message}</div>)
      .pageError(({ error }) => <div id="page-error">{error.message}</div>)
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
      .loader(() => waitThrow<{ x: number }>(new Error('test')))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(query)
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ points: [root, query, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #loading: ...

              #error: test
            "
          `)
    })
  })

  it('by default uses pageLoading component defined in root', async () => {
    const root = createRootWithPageLoading()
    const query = root
      .lets('query', 'test')
      .loader(() => waitThrow<{ x: number }>(new Error('test')))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .with(query)
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render } = await createTestThings({ points: [root, query, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page-error')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #loading: ...

              #page-error: test
            "
          `)
    })
  })

  it('uses layoutError defined in layout', async () => {
    const root = createRootWithPageLoading()
    const layout = root
      .lets('layout', 'layout')
      .pageError(({ error }) => <div id="page-error">{error.message}</div>)
      .layoutError(({ error }) => <div id="layout-error">{error.message}</div>)
      .loader(() => waitThrow<{ x: number }>(new Error('test')))
      .layout(({ children, data }) => (
        <div id="layout">
          <div id="layout-data">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout
      .lets('page', 'home', '/')
      .loader(() => waitThrow<{ y: number }>(new Error('test')))
      .page(({ data }) => <div id="page-data">y={data.y}</div>)
    const { render } = await createTestThings({ points: [root, layout, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#layout-error')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #loading: ...

              #layout-error: test
            "
          `)
    })
  })

  it('uses pageError defined in layout', async () => {
    const root = createRootWithPageLoading()
    const layout = root
      .lets('layout', 'layout')
      .pageError(({ error }) => <div id="page-error">{error.message}</div>)
      .layoutError(({ error }) => <div id="layout-error">{error.message}</div>)
      .loader(() => waitReturn({ x: 1 }))
      .layout(({ children, data }) => (
        <div id="layout">
          <div id="layout-data">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout
      .lets('page', 'home', '/')
      .loader(() => waitThrow<{ y: number }>(new Error('test')))
      .page(({ data }) => <div id="page-data">y={data.y}</div>)
    const { render } = await createTestThings({ points: [root, layout, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page-error')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #loading: ...

              #layout:
                #layout-data: x=1
                #loading: ...

              #layout:
                #layout-data: x=1
                #page-error: test
            "
          `)
    })
  })

  it('uses error component defined in page', async () => {
    const root = createRootWithPageLoading()
    const layout = root
      .lets('layout', 'layout')
      .pageError(({ error }) => <div id="page-error">{error.message}</div>)
      .layoutError(({ error }) => <div id="layout-error">{error.message}</div>)
      .loader(() => waitReturn({ x: 1 }))
      .layout(({ children, data }) => (
        <div id="layout">
          <div id="layout-data">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout
      .lets('page', 'home', '/')
      .error(({ error }) => <div id="special-page-error">{error.message}</div>)
      .loader(() => waitThrow<{ y: number }>(new Error('test')))
      .page(({ data }) => <div id="page-data">y={data.y}</div>)
    const { render } = await createTestThings({ points: [root, layout, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#special-page-error')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #loading: ...

              #layout:
                #layout-data: x=1
                #loading: ...

              #layout:
                #layout-data: x=1
                #special-page-error: test
            "
          `)
    })
  })

  it('uses error component defined in page, even for queries defined in base', async () => {
    const root = createRootWithPageLoading()
    const query1 = root
      .lets('query', 'query1')
      .loader(() => waitThrow<{ x: number }>(new Error('test')))
      .query()
    const query2 = root
      .lets('query', 'query2')
      .loader(() => waitReturn({ y: 1 }))
      .query()
    const base = root
      .lets('base', 'base')
      .error(({ error }) => <div id="shared-error">{error.message}</div>)
      .pageError(({ error }) => <div id="page-error">{error.message}</div>)
      .layoutError(({ error }) => <div id="layout-error">{error.message}</div>)
      .with(query1)
      .base()
    const page = base
      .lets('page', 'home', '/')
      .error(({ error }) => <div id="special-page-error">{error.message}</div>)
      .with(query2)
      .page(({ queries }) => (
        <div id="page-data">
          x={queries[0].data.x} y={queries[1].data.y}
        </div>
      ))
    const { render } = await createTestThings({ points: [root, query1, query2, base, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#special-page-error')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #loading: ...

              #special-page-error: test
            "
          `)
    })
  })

  it('uses error component defined in plugin', async () => {
    const root = createRootWithPageLoading()
    const plugin = Point0.lets('plugin', 'test-plugin')
      .error(({ error }) => <div id="plugin-error">{error.message}</div>)
      .plugin()
    const layout = root
      .lets('layout', 'layout')
      .pageError(({ error }) => <div id="page-error">{error.message}</div>)
      .layoutError(({ error }) => <div id="layout-error">{error.message}</div>)
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
      .loader(() => waitThrow<{ y: number }>(new Error('test')))
      .page(({ data }) => <div id="page-data">y={data.y}</div>)
    const { render } = await createTestThings({ points: [root, layout, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#plugin-error')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #loading: ...

              #layout:
                #layout-data: x=1
                #loading: ...

              #layout:
                #layout-data: x=1
                #plugin-error: test
            "
          `)
    })
  })
})

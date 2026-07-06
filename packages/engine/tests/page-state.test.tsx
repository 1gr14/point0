import { Point0 } from '@point0/core'
import { useNavigationPageState, useSetNavigationPageState } from '@point0/core/navigation'
import { describe, expect, it } from 'bun:test'
import { createTestThings, waitReturn, waitThrow } from './utils/internal-testing.js'

describe('page state', () => {
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

  it('success always without loader', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return (
        <div id="page-state">
          status={pageState.status}, error={pageState.error?.message ?? 'undefined'}
        </div>
      )
    }
    const layout = root.lets('layout', 'layout').layout(({ children }) => (
      <div id="layout">
        <PageStateComponent />
        {children}
      </div>
    ))
    const page = layout.lets('page', 'home', '/').page(() => <div id="page">x=1</div>)
    const { render, fetchPreview } = await createTestThings({ points: [root, layout, page], ssr: true })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #layout:
            #page-state: status=success, error=undefined
            #page: x=1
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=success, error=undefined
        #page: x=1
      "
    `)
  })

  it('loading then success', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .loader(() => waitReturn({ x: 1 }))
      .query()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return (
        <div id="page-state">
          status={pageState.status}, error={pageState.error?.message ?? 'undefined'}
        </div>
      )
    }
    const layout = root.lets('layout', 'layout').layout(({ children }) => (
      <div id="layout">
        <PageStateComponent />
        {children}
      </div>
    ))
    const page = layout
      .lets('page', 'home', '/')
      .with(query)
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render, fetchPreview } = await createTestThings({
      points: [root, query, layout, page],
      ssr: true,
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #layout:
            #page-state: status=loading, error=undefined
            #loading: ...

          #layout:
            #page-state: status=success, error=undefined
            #page: x=1
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=success, error=undefined
        #page: x=1
      "
    `)
  })

  it('loading then error', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .loader(() => waitThrow<{ x: number }>(new Error('test')))
      .query()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return (
        <div id="page-state">
          status={pageState.status}, error={pageState.error?.message ?? 'undefined'}
        </div>
      )
    }
    const layout = root.lets('layout', 'layout').layout(({ children }) => (
      <div id="layout">
        <PageStateComponent />
        {children}
      </div>
    ))
    const page = layout
      .lets('page', 'home', '/')
      .with(query)
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { render, fetchPreview } = await createTestThings({ points: [root, query, layout, page], ssr: true })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #layout:
            #page-state: status=loading, error=undefined
            #loading: ...

          #layout:
            #page-state: status=error, error=test
            #error: test
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=error, error=test
        #error: test
      "
    `)
  })

  it('loading then success, layout with loader, page no loader', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return (
        <div id="page-state">
          status={pageState.status}, error={pageState.error?.message ?? 'undefined'}
        </div>
      )
    }
    const layout = root
      .lets('layout', 'layout')
      .loader(() => waitReturn({ x: 1 }))
      .layout(({ children, data }) => (
        <div id="layout">
          <PageStateComponent />
          <div id="layout-data">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout.lets('page', 'home', '/').page(() => <div id="page-data">empty</div>)
    const { render, fetchPreview } = await createTestThings({
      points: [root, layout, page],
      ssr: true,
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page-data')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #layout:
            #page-state: status=success, error=undefined
            #layout-data: x=1
            #page-data: empty
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=success, error=undefined
        #layout-data: x=1
        #page-data: empty
      "
    `)
  })

  it('loading then success, layout with loader, page with loader', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return (
        <div id="page-state">
          status={pageState.status}, error={pageState.error?.message ?? 'undefined'}
        </div>
      )
    }
    const layout = root
      .lets('layout', 'layout')
      .loader(() => waitReturn({ x: 1 }))
      .layout(({ children, data }) => (
        <div id="layout">
          <PageStateComponent />
          <div id="layout-data">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout
      .lets('page', 'home', '/')
      .loader(() => waitReturn({ y: 1 }))
      .page(({ data }) => <div id="page-data">y={data.y}</div>)
    const { render, fetchPreview } = await createTestThings({
      points: [root, layout, page],
      ssr: true,
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page-data')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #layout:
            #page-state: status=loading, error=undefined
            #layout-data: x=1
            #loading: ...

          #layout:
            #page-state: status=success, error=undefined
            #layout-data: x=1
            #page-data: y=1
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=success, error=undefined
        #layout-data: x=1
        #page-data: y=1
      "
    `)
  })

  it('loading then error, layout with loader, page no loader', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return (
        <div id="page-state">
          status={pageState.status}, error={pageState.error?.message ?? 'undefined'}
        </div>
      )
    }
    const layout = root
      .lets('layout', 'layout')
      .loader(() => waitThrow<{ x: number }>(new Error('test')))
      .layout(({ children, data }) => (
        <div id="layout">
          <PageStateComponent />
          <div id="layout-data">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout.lets('page', 'home', '/').page(() => <div id="page-data">empty</div>)
    const { render, fetchPreview } = await createTestThings({
      points: [root, layout, page],
      ssr: true,
    })
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
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #error: test
      "
    `)
  })

  it('loading then error, layout with loader (error), page with loader (error)', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return (
        <div id="page-state">
          status={pageState.status}, error={pageState.error?.message ?? 'undefined'}
        </div>
      )
    }
    const layout = root
      .lets('layout', 'layout')
      .loader(() => waitThrow<{ x: number }>(new Error('test')))
      .layout(({ children, data }) => (
        <div id="layout">
          <PageStateComponent />
          <div id="layout-data">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout
      .lets('page', 'home', '/')
      .loader(() => waitThrow<{ y: number }>(new Error('test')))
      .page(({ data }) => <div id="page-data">y={data.y}</div>)
    const { render, fetchPreview } = await createTestThings({
      points: [root, layout, page],
      ssr: true,
    })
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
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #error: test
      "
    `)
  })

  it('loading then error, layout with loader (success), page with loader (error)', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return (
        <div id="page-state">
          status={pageState.status}, error={pageState.error?.message ?? 'undefined'}
        </div>
      )
    }
    const layout = root
      .lets('layout', 'layout')
      .loader(() => waitReturn<{ x: number }>({ x: 1 }))
      .layout(({ children, data }) => (
        <div id="layout">
          <PageStateComponent />
          <div id="layout-data">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout
      .lets('page', 'home', '/')
      .loader(() => waitThrow<{ y: number }>(new Error('test')))
      .page(({ data }) => <div id="page-data">y={data.y}</div>)
    const { render, fetchPreview } = await createTestThings({
      points: [root, layout, page],
      ssr: true,
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #layout:
            #page-state: status=loading, error=undefined
            #layout-data: x=1
            #loading: ...

          #layout:
            #page-state: status=error, error=test
            #layout-data: x=1
            #error: test
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=error, error=test
        #layout-data: x=1
        #error: test
      "
    `)
  })

  it('error on 404 page', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return (
        <div id="page-state">
          status={pageState.status}, error={pageState.error?.message}
        </div>
      )
    }
    const Page404 = () => {
      useSetNavigationPageState({ status: 'error', error: 'My Page Not Found' })
      return (
        <div id="page-404">
          <PageStateComponent />
        </div>
      )
    }
    const layout = root.lets('layout', 'layout').layout(({ children }) => (
      <div id="layout">
        <PageStateComponent />
        {children}
      </div>
    ))
    const page = layout.lets('page', 'home', '/').page(() => <div id="page">x=1</div>)
    const neverPage = layout.lets('page', 'never', '/never').page(() => <div id="never">never</div>) // do not add it to points
    const { render, fetchPreview } = await createTestThings({ points: [root, layout, page], ssr: true, Page404 })
    await render(neverPage.route(), async ({ waitContent, tale }) => {
      await waitContent('#page-404')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /never
          #page-404:
            #page-state: status=error, error=My Page Not Found
        "
      `)
    })
    expect(await fetchPreview(neverPage)).toMatchInlineSnapshot(`
      "
      #page-404:
        #page-state: status=error, error=My Page Not Found
      "
    `)
  })
})

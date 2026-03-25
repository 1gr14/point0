import { Point0 } from '@point0/core'
import { useNavigationPageState } from '@point0/core/navigation'
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
      return <div id="page-state">status={pageState.status}</div>
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
            #page-state: status=success
            #page: x=1
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=success
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
      return <div id="page-state">status={pageState.status}</div>
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
            #page-state: status=loading
            #loading: ...

          #layout:
            #page-state: status=loading
            #page: x=1

          #layout:
            #page-state: status=success
            #page: x=1
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=success
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
      return <div id="page-state">status={pageState.status}</div>
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
            #page-state: status=loading
            #loading: ...

          #layout:
            #page-state: status=loading
            #error: test

          #layout:
            #page-state: status=error
            #error: test
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=loading
        #loading: ...
      "
    `)
  })

  it('loading then success, layout with loader, page no loader', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return <div id="page-state">status={pageState.status}</div>
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
            #page-state: status=loading
            #layout-data: x=1
            #page-data: empty

          #layout:
            #page-state: status=success
            #layout-data: x=1
            #page-data: empty
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=success
        #layout-data: x=1
        #page-data: empty
      "
    `)
  })

  it('loading then success, layout with loader, page with loader', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return <div id="page-state">status={pageState.status}</div>
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
            #page-state: status=loading
            #layout-data: x=1
            #loading: ...

          #layout:
            #page-state: status=loading
            #layout-data: x=1
            #page-data: y=1

          #layout:
            #page-state: status=success
            #layout-data: x=1
            #page-data: y=1
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=success
        #layout-data: x=1
        #page-data: y=1
      "
    `)
  })

  it('loading then error, layout with loader, page no loader', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return <div id="page-state">status={pageState.status}</div>
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
      #loading: ...
      "
    `)
  })

  it('loading then error, layout with loader (error), page with loader (error)', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return <div id="page-state">status={pageState.status}</div>
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
      #loading: ...
      "
    `)
  })

  it('loading then error, layout with loader (success), page with loader (error)', async () => {
    const root = createRoot()
    const PageStateComponent = () => {
      const pageState = useNavigationPageState()
      return <div id="page-state">status={pageState.status}</div>
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
            #page-state: status=loading
            #layout-data: x=1
            #loading: ...

          #layout:
            #page-state: status=loading
            #layout-data: x=1
            #error: test

          #layout:
            #page-state: status=error
            #layout-data: x=1
            #error: test
        "
      `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #layout:
        #page-state: status=loading
        #layout-data: x=1
        #loading: ...
      "
    `)
  })

  // loading in layout, loading in page
  // error in layout, loading in page
  // LoadingCompoentn with children
  // ErrorComponent with children
  // SuccessComponent with children
})

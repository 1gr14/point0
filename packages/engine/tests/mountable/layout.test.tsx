import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from '../utils/internal-testing.js'

describe('layout', () => {
  const root = Point0.lets('root', 'root')
    .ssr(true)
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

  it('simple', async () => {
    const layout = root.lets('layout', 'app').layout(({ children }) => <div id="layout">{children}</div>)
    const page = layout.lets('page', 'home').page(() => <div id="page">x=nothing</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, layout, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "/home
            #layout:
              #page: x=nothing
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "#layout:
          #page: x=nothing
        "
      `)
  })

  it('layout in layout', async () => {
    const layout1 = root.lets('layout', 'layout1').layout(({ children }) => <div id="layout1">{children}</div>)
    const layout2 = layout1.lets('layout', 'layout2').layout(({ children }) => <div id="layout2">{children}</div>)
    const page = layout2.lets('page', 'home').page(() => <div id="page">x=nothing</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, layout1, layout2, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "/home
            #layout1:
              #layout2:
                #page: x=nothing
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "#layout1:
          #layout2:
            #page: x=nothing
        "
      `)
  })

  it('loader', async () => {
    const layout = root
      .lets('layout', 'app')
      .loader(() => ({ x: 1 }))
      .layout(({ data, children }) => (
        <div id="layout">
          <div id="layout-content">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout.lets('page', 'home').page(() => <div id="page">x={layout.getValue().x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, layout, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/home
          #loading: ...

          #layout:
            #layout-content: x=1
            #page: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "layout.app (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#layout:
        #layout-content: x=1
        #page: x=1
      "
    `)
  })

  it('loader error', async () => {
    const layout = root
      .lets('layout', 'app')
      .loader(() => {
        if (Math.random()) {
          throw new Error('test error')
        }
        return { x: 1 }
      })
      .layout(({ data, children }) => (
        <div id="layout">
          <div id="layout-content">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout.lets('page', 'home').page(() => <div id="page">x=nothing</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, layout, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "/home
          #loading: ...

          #error: test error
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "layout.app (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#loading: ...
      "
    `)
  })

  it('loader with input', async () => {
    const layout = root
      .lets('layout', 'app', '/:id')
      .loader(({ input }) => ({ x: input.id }))
      .layout(({ data, children }) => (
        <div id="layout">
          <div id="layout-input">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout.lets('page', 'home', '/page').page(() => {
      const value = layout.useValue()
      return <div id="page">x={value.x}</div>
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, layout, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc/page
          #loading: ...

          #layout:
            #layout-input: x=zxc
            #page: x=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "layout.app (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "#layout:
        #layout-input: x=zxc
        #page: x=zxc
      "
    `)
  })

  it('layout input includes page params', async () => {
    const layout = root
      .lets('layout', 'app', '/:id')
      .loader(({ input }) => ({ x: input.id }))
      .layout(({ data, children }) => (
        <div id="layout">
          <div id="layout-input">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout.lets('page', 'home', '/:sn').page(({ location }) => {
      const value = layout.useValue()
      return (
        <div id="page">
          x={value.x} sn={location.params.sn}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, layout, page] })
    await render(page.route({ id: 'zxc', sn: 'qwe' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc/qwe
          #loading: ...

          #layout:
            #layout-input: x=zxc
            #page: x=zxc sn=qwe
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "layout.app (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc', sn: 'qwe' })).toMatchInlineSnapshot(`
      "#layout:
        #layout-input: x=zxc
        #page: x=zxc sn=qwe
      "
    `)
  })

  it('wrapper', async () => {
    const layout = root
      .lets('layout', 'app', '/:id')
      .loader(({ input }) => ({ x: input.id }))
      .wrapper(({ children, queries, location }) => (
        <div id="wrapper">
          <div id="input">{location.params.id}</div>
          <div id="query-status">{queries.map((q) => q.status).join(', ') || 'undefined'}</div>
          {children}
        </div>
      ))
      .layout(({ data, children }) => (
        <div id="layout">
          <div id="layout-input">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout.lets('page', 'home', '/page').page(() => <div id="page">x=nothing</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, layout, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc/page
          #wrapper:
            #input: zxc
            #query-status: pending
            #loading: ...

          #wrapper:
            #input: zxc
            #query-status: success
            #layout:
              #layout-input: x=zxc
              #page: x=nothing
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "layout.app (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "#wrapper:
        #input: zxc
        #query-status: success
        #layout:
          #layout-input: x=zxc
          #page: x=nothing
      "
    `)
  })

  it('defines layout in page', async () => {
    const layout = root
      .lets('layout', 'app')
      .loader(() => ({ x: 1 }))
      .layout(({ data, children }) => (
        <div id="layout">
          <div id="layout-content">x={data.x}</div>
          {children}
        </div>
      ))
    const page = root
      .lets('page', 'home')
      .layout(layout)
      .page(() => <div id="page">x={layout.getValue().x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, layout, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/home
          #loading: ...

          #layout:
            #layout-content: x=1
            #page: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "layout.app (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#layout:
        #layout-content: x=1
        #page: x=1
      "
    `)
  })
})

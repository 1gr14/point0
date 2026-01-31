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
    const page = layout.lets('page', 'home').page(() => <div id="page">x=nothing</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, layout, page] })
    // TODO:ASAP here should not be loading, becouse layout now is just provider and on letsPage it removes it loaders
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/home
          #loading: ...

          #layout:
            #layout-content: x=1
            #loading: ...

          #layout:
            #layout-content: x=1
            #page: x=nothing
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "layout.app (client) < {}
      page.home (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#layout:
        #layout-content: x=1
        #page: x=nothing
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
      .input<{ id: string }>()
      .loader(({ input }) => ({ x: input.id }))
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
          #loading: ...

          #layout:
            #layout-input: x=zxc
            #loading: ...

          #layout:
            #layout-input: x=zxc
            #page: x=nothing
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "layout.app (client) < {"id":"zxc"}
      page.home (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "#layout:
        #layout-input: x=zxc
        #page: x=nothing
      "
    `)
  })

  it('layout input includes page params', async () => {
    const layout = root
      .lets('layout', 'app', '/:id')
      .input<{ id: string; sn: string }>()
      .loader(({ input }) => ({ x: `${input.id}-${input.sn}` }))
      .layout(({ data, children }) => (
        <div id="layout">
          <div id="layout-input">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout.lets('page', 'home', '/:sn').page(() => <div id="page">x=nothing</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, layout, page] })
    await render(page.route({ id: 'zxc', sn: 'qwe' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc/qwe
          #loading: ...

          #layout:
            #layout-input: x=zxc-undefined
            #loading: ...

          #layout:
            #layout-input: x=zxc-undefined
            #page: x=nothing
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "layout.app (client) < {"id":"zxc"}
      page.home (client) < {"id":"zxc","sn":"qwe"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc', sn: 'qwe' })).toMatchInlineSnapshot(`
      "#layout:
        #layout-input: x=zxc-undefined
        #page: x=nothing
      "
    `)
  })

  it('wrapper', async () => {
    const layout = root
      .lets('layout', 'app', '/:id')
      .input<{ id: string }>()
      .loader(({ input }) => ({ x: input.id }))
      .wrapper(({ children, query, input }) => (
        <div id="wrapper">
          <div id="input">{input?.id}</div>
          <div id="query-status">{query?.status}</div>
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
              #wrapper:
                #input: zxc
                #query-status: pending
                #loading: ...

          #wrapper:
            #input: zxc
            #query-status: success
            #layout:
              #layout-input: x=zxc
              #wrapper:
                #input: zxc
                #query-status: success
                #page: x=nothing
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "layout.app (client) < {"id":"zxc"}
      page.home (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "#wrapper:
        #input: zxc
        #query-status: success
        #layout:
          #layout-input: x=zxc
          #wrapper:
            #input: zxc
            #query-status: success
            #page: x=nothing
      "
    `)
  })

  it('outer can block query', async () => {
    const layout = root
      .lets('layout', 'app', '/:id')
      .input<{ id: string }>()
      .loader(({ input }) => ({ x: input.id }))
      .outer(({ children, input }) => {
        if (input.id.length > 2) {
          return <div id="outer">you shell not pass</div>
        }
        return children
      })
      .layout(({ data, children }) => (
        <div id="layout">
          <div id="layout-input">x={data.x}</div>
          {children}
        </div>
      ))
    const page = layout.lets('page', 'home', '/page').page(() => <div id="page">x=nothing</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, layout, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#outer')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc/page
          #outer: you shell not pass
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "#outer: you shell not pass
      "
    `)
  })
})

import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from '../utils/internal-testing.js'

describe('page', () => {
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
    const page = root.lets('page', 'home', '/').page(({ data }) => <div id="page">x=nothing</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #page: x=nothing
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#page: x=nothing
      "
    `)
  })

  it.only('loader', async () => {
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #loading: ...

          #page: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#page: x=1
      "
    `)
  })

  it('clientLoader', async () => {
    const page = root
      .lets('page', 'home', '/')
      .clientLoader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #loading: ...

          #page: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#loading: ...
      "
    `)
  })

  it('loader and clientLoader', async () => {
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .clientLoader(({ data }) => ({ y: 2, ...data }))
      .page(({ data }) => (
        <div id="page">
          x={data.x}, y={data.y}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #loading: ...

          #page: x=1, y=2
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#loading: ...
      "
    `)
  })

  it('loader error', async () => {
    const page = root
      .lets('page', 'home', '/')
      .loader(() => {
        if (Math.random()) {
          throw new Error('test error')
        }
        return { x: 1 }
      })
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #loading: ...

          #error: test error
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "#error: test error
      "
    `)
  })

  it('loader with input', async () => {
    const page = root
      .lets('page', 'home', '/:id')
      .loader(({ input }) => ({ x: input.id }))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc
          #loading: ...

          #page: x=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "#page: x=zxc
      "
    `)
  })

  it('wrapper', async () => {
    const page = root
      .lets('page', 'home', '/:id')
      .loader(({ input }) => ({ x: input.id }))
      .wrapper(({ children, queries, input }) => (
        <div id="wrapper">
          <div id="input">{input?.id}</div>
          <div id="query-status">{queries?.map((q) => q.status).join(', ') || 'undefined'}</div>
          {children}
        </div>
      ))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc
          #wrapper:
            #input: zxc
            #query-status: pending
            #loading: ...

          #wrapper:
            #input: zxc
            #query-status: success
            #page: x=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "#wrapper:
        #input: zxc
        #query-status: success
        #page: x=zxc
      "
    `)
  })

  it('outer can block query', async () => {
    const page = root
      .lets('page', 'home', '/:id')
      .loader(({ input }) => ({ x: input.id }))
      .outer(({ children, input }) => {
        if (!input || input.id.length > 2) {
          return <div id="outer">you shell not pass</div>
        }
        return children
      })
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#outer')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc
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

  it('many wrappers and outer', async () => {
    const page = root
      .lets('page', 'home', '/:id')
      .loader(({ input }) => ({ x: input.id }))
      .outer(({ children, input }) => {
        if (!input || input.id.length < 2) {
          return <div id="outer">you shell not pass</div>
        }
        return <div id="outer">{children}</div>
      })
      .wrapper(({ children, queries }) => (
        <div id="wrapper1">
          <div id="query-status">{queries?.map((q) => q.status).join(', ') || 'undefined'}</div>
          {children}
        </div>
      ))
      .wrapper(({ children, queries }) => (
        <div id="wrapper2">
          <div id="query-status">{queries?.map((q) => q.status).join(', ') || 'undefined'}</div>
          {children}
        </div>
      ))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc
          #outer:
            #wrapper1:
              #query-status: pending
              #wrapper2:
                #query-status: pending
                #loading: ...

          #outer:
            #wrapper1:
              #query-status: success
              #wrapper2:
                #query-status: success
                #page: x=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "#outer:
        #wrapper1:
          #query-status: success
          #wrapper2:
            #query-status: success
            #page: x=zxc
      "
    `)
  })
})

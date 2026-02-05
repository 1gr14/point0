import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
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

  it('loader', async () => {
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
      "#loading: ...
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
      .wrapper(({ children, queries, location }) => (
        <div id="wrapper">
          <div id="params">{location.params.id}</div>
          <div id="query-status">{queries.map((q) => q.status).join(', ') || 'undefined'}</div>
          {children}
        </div>
      ))
      .page(({ data, queries }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc
          #wrapper:
            #params: zxc
            #query-status: pending
            #loading: ...

          #wrapper:
            #params: zxc
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
        #params: zxc
        #query-status: success
        #page: x=zxc
      "
    `)
  })

  it('wrapper can block query', async () => {
    const page = root
      .lets('page', 'home', '/:id')
      .wrapper(({ children, location }) => {
        if (location.params.id.length > 2) {
          return <div id="wrapper">you shell not pass</div>
        }
        return children
      })
      .loader(({ input }) => ({ x: input.id }))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#wrapper')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc
          #wrapper: you shell not pass
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "#wrapper: you shell not pass
      "
    `)
  })

  it('with', async () => {
    const page = root
      .lets('page', 'home', '/:y')
      .with(() => ({ x: 1 }))
      .page(({ props, location }) => (
        <div id="page">
          x={props.x} y={location.params.y}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ y: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc
          #page: x=1 y=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      "
    `)
    expect(await fetchPreview(page, { y: 'zxc' })).toMatchInlineSnapshot(`
      "#page: x=1 y=zxc
      "
    `)
  })

  it('query', async () => {
    const query = root
      .lets('query', 'test')
      .loader(() => ({ x: 1 }))
      .query()
    const page = root
      .lets('page', 'home')
      .query(query)
      .page(({ data, location }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/home
          #loading: ...

          #page: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "query.test (client) < {}
      "
    `)
    expect(await fetchPreview(page, { y: 'zxc' })).toMatchInlineSnapshot(`
      "#page: x=1
      "
    `)
  })

  it('query with input', async () => {
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home', '/:y')
      .query(query, ({ location }) => ({ y: +location.params.y }))
      // .query(query)
      .page(({ data, location }) => (
        <div id="page">
          x={data.x} y={location.params.y}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
    await render(page.route({ y: 123 }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/123
          #loading: ...

          #page: x=246 y=123
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "query.test (client) < {"y":123}
      "
    `)
    expect(await fetchPreview(page, { y: '123' })).toMatchInlineSnapshot(`
      "#page: x=246 y=123
      "
    `)
  })

  it('query with injected query', async () => {
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home', '/:y')
      .loader(() => ({ z: 3 }))
      .query(query, ({ location }) => ({ y: +location.params.y }))
      // .query(query)
      .page(({ data, location, queries }) => (
        <div id="page">
          x={queries[1].data.x} y={location.params.y} z={data.z}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
    await render(page.route({ y: 123 }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/123
          #loading: ...

          #page: x=246 y=123 z=3
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "query.test (client) < {"y":123}
      page.home (client) < {"y":"123"}
      "
    `)
    expect(await fetchPreview(page, { y: '123' })).toMatchInlineSnapshot(`
      "#page: x=246 y=123 z=3
      "
    `)
  })

  it('mapper standalone', async () => {
    const page = root
      .lets('page', 'home', '/:y')
      .mapper(({ data }) => {
        expect(Object.keys(data).length).toBe(0)
        return { data, x: 1 }
      })
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ y: 123 }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/123
          #page: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      "
    `)
    expect(await fetchPreview(page, { y: '123' })).toMatchInlineSnapshot(`
      "#page: x=1
      "
    `)
  })

  it('mapper with qureies', async () => {
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home', '/:y')
      .loader(() => ({ z: 3 }))
      .query(query, ({ location }) => ({ y: +location.params.y }))
      .mapper(({ data, queries, location }) => {
        return { x: queries[1].data.x, y: location.params.y, z: data.z }
      })
      .page(({ data }) => (
        <div id="page">
          x={data.x} y={data.y} z={data.z}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
    await render(page.route({ y: 123 }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/123
          #loading: ...

          #page: x=246 y=123 z=3
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "query.test (client) < {"y":123}
      page.home (client) < {"y":"123"}
      "
    `)
    expect(await fetchPreview(page, { y: '123' })).toMatchInlineSnapshot(`
      "#page: x=246 y=123 z=3
      "
    `)
  })

  it('many wrappers and with', async () => {
    const page = root
      .lets('page', 'home', '/:id')
      .wrapper(({ children, location }) => {
        if (location.params.id.length < 2) {
          return <div id="wrapper">you shell not pass</div>
        }
        return <div id="wrapper">{children}</div>
      })
      .with(() => ({ y: 1 }))
      .loader(({ input }) => ({ x: input.id }))
      .wrapper(({ children, queries, props }) => (
        <div id="wrapper1">
          <div id="props">y={props.y}</div>
          <div id="query-status">{queries.map((q) => q.status).join(', ') || 'undefined'}</div>
          {children}
        </div>
      ))
      .with(() => ({ z: 1 }))
      .wrapper(({ children, queries, props }) => (
        <div id="wrapper2">
          <div id="props">
            y={props.y} z={props.z}
          </div>
          <div id="query-status">{queries.map((q) => q.status).join(', ') || 'undefined'}</div>
          {children}
        </div>
      ))
      .page(({ data, props }) => (
        <div id="page">
          x={data.x} y={props.y} z={props.z}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/zxc
          #wrapper:
            #wrapper1:
              #props: y=1
              #query-status: pending
              #wrapper2:
                #props: y=1 z=1
                #query-status: pending
                #loading: ...

          #wrapper:
            #wrapper1:
              #props: y=1
              #query-status: success
              #wrapper2:
                #props: y=1 z=1
                #query-status: success
                #page: x=zxc y=1 z=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "#wrapper:
        #wrapper1:
          #props: y=1
          #query-status: success
          #wrapper2:
            #props: y=1 z=1
            #query-status: success
            #page: x=zxc y=1 z=1
      "
    `)
  })
})

import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'

describe('use', () => {
  it('use(query) executes query loader', async () => {
    const root = Point0.lets('root', 'root').root()
    const query = root
      .lets('query', 'stats')
      .loader(() => ({ query: 1 }))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ page: 2 }))
      .use(query)
      .page()

    const { loadPoint, fetchesTale } = await createTestThings({ points: [root, page, query] })
    const data = await loadPoint(page)
    expect(data).toMatchInlineSnapshot(`
      {
        "page": 2,
        "query": 1,
      }
    `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) < {}
      query.stats (server) < {}
      "
    `)
  })

  it('use(query) matches loader with client loaders and mappers', async () => {
    const root = Point0.lets('root', 'root').root()
    const query = root
      .lets('query', 'stats')
      .loader(() => ({ query: 1 }))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .use(query)
      .loader(({ data }) => ({ page: 2, ...data }))
      .clientLoader(({ data }) => ({ clientLoader: 3, ...data }))
      .mapper(({ data }) => ({ mapper: 4, ...data }))
      .page()

    const { loadPoint, fetchesTale } = await createTestThings({ points: [root, page, query] })
    const data = await loadPoint(page)
    expect(data).toMatchInlineSnapshot(`
      {
        "clientLoader": 3,
        "mapper": 4,
        "page": 2,
        "query": 1,
      }
    `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) < {}
      query.stats (server) < {}
      "
    `)
  })

  it('use(query) use same query key on page and layout and query', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const query = root
      .lets('query', 'stats')
      .loader(() => ({ x: 1 }))
      .query()
    const layout = root
      .lets('layout', 'layout')
      .use(query)
      .layout(({ children }) => <div id="layout">{children}</div>)
    const page = layout
      .lets('page', 'home')
      .use(query)
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { fetchSsr, fetchesTale } = await createTestThings({ points: [root, page, query] })
    const result = await fetchSsr(page)
    expect(result.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|query|stats|server|finite|{}|data
      {"x":1}
      "
    `)
    expect(result.preview).toMatchInlineSnapshot(`
      "#page: x=1
      "
    `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) (page) < {}
      query.stats (server) < {}
      "
    `)
  })

  it('use(query1).use(query2) not use same query key on page, but prefetch it with ssr', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const query1 = root
      .lets('query', 'query1')
      .loader(() => {
        return { x: 1 }
      })
      .query()
    const query2 = root
      .lets('query', 'query2')
      .loader(() => {
        return { y: 2 }
      })
      .query()
    const page = root
      .lets('page', 'home')
      .use(query1)
      .use(query2)
      .page(({ data }) => (
        <div id="page">
          x={data.x} y={data.y}
        </div>
      ))
    const { fetchSsr, fetchesTale } = await createTestThings({ points: [root, query1, query2, page] })
    const result = await fetchSsr(page)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) (page) < {}
      query.query1 (server) < {}
      query.query2 (server) < {}
      page.home (server) < {}
      query.query1 (server) < {}
      query.query2 (server) < {}
      query.query1 (server) < {}
      query.query2 (server) < {}
      "
    `)
    expect(result.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|page|home|server|finite|{}|data
      {"x":1,"y":2}
      point0|root|query|query1|server|finite|{}|data
      {"x":1}
      point0|root|query|query2|server|finite|{}|data
      {"y":2}
      "
    `)
    console.log(page.point._sameQueryPoint?.name)
    console.log(page.point._relatedQueryPoints?.map((p) => p.name))
    expect(result.preview).toMatchInlineSnapshot(`
      "#page: x=1 y=2
      "
    `)
  })

  it('use(query1).use(query2) not use same query key on page without ssr', async () => {
    const root = Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
      .ssr(false)
      .root()
    const query1 = root
      .lets('query', 'query1')
      .loader(() => {
        return { x: 1 }
      })
      .query()
    const query2 = root
      .lets('query', 'query2')
      .loader(() => {
        return { y: 2 }
      })
      .query()
    const page = root
      .lets('page', 'home')
      .use(query1)
      .use(query2)
      .page(({ data }) => (
        <div id="page">
          x={data.x} y={data.y}
        </div>
      ))
    const { render, fetchesTale } = await createTestThings({ points: [root, query1, query2, page] })
    await render(page.route({}), async ({ waitContent, tale, queryClient, getQueryClientPreview }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "/home
          #loading: ...

          #page: x=1 y=2
        "
      `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "page.home (client) < {}
        query.query1 (server) < {}
        query.query2 (server) < {}
        "
      `)
      expect(getQueryClientPreview()).toMatchInlineSnapshot(`
        "point0|root|page|home|server|finite|{}|data
            {"x":1,"y":2}
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home (client) < {}
      query.query1 (server) < {}
      query.query2 (server) < {}
      "
    `)
  })

  it('use(query) get input from page', async () => {
    const root = Point0.lets('root', 'root').ssr(true).root()
    const query = root
      .lets('query', 'stats')
      .input<{ x: string }>()
      .loader(({ input }) => ({ x: input.x }))
      .query()
    const page = root
      .lets('page', 'home/:x')
      .use(query)
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { fetchSsr, fetchesTale } = await createTestThings({ points: [root, page, query] })
    const result = await fetchSsr(page, { x: '123' })
    expect(result.preview).toMatchInlineSnapshot(`
      "#page: x=123
      "
    `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "page.home/:x (client) (page) < {"x":"123"}
      query.stats (server) < {"x":"123"}
      "
    `)
  })
})

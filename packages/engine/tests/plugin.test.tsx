import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'

describe('plugin', () => {
  it('use(plugin) merges loader actions', async () => {
    const plugin = Point0.lets('plugin', 'test-plugin')
      .loader(() => ({ plugin: 'ok' }))
      .plugin()
    const root = Point0.lets('root', 'root').use(plugin).root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ page: 'ok' }))
      .page()

    const { loadPoint } = await createTestThings({ points: [root, page] })
    const data = await loadPoint(page)
    expect(data).toMatchInlineSnapshot(`
      {
        "page": "ok",
      }
    `)
  })

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

    const { loadPoint } = await createTestThings({ points: [root, page, query] })
    const data = await loadPoint(page)
    expect(data).toMatchInlineSnapshot(`
      {
        "page": 2,
        "query": 1,
      }
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

    const { loadPoint } = await createTestThings({ points: [root, page, query] })
    const data = await loadPoint(page)
    expect(data).toMatchInlineSnapshot(`
      {
        "clientLoader": 3,
        "mapper": 4,
        "page": 2,
        "query": 1,
      }
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

    const { fetchSsr } = await createTestThings({ points: [root, page, query] })
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

    const { fetchSsr } = await createTestThings({ points: [root, page, query] })
    const result = await fetchSsr(page, { x: '123' })
    expect(result.preview).toMatchInlineSnapshot(`
      "#page: x=123
      "
    `)
  })
})

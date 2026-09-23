import { Routes } from '@1gr14/route0'
import { getQueryClient, Point0 } from '@point0/core'
import { createNavigation } from '@point0/react-dom/router'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { z } from 'zod'
import { createTestThings, lineQueryKey, ymlifyline } from './utils/internal-testing.js'

// The route0 string is the schema: a typed path param (`:id[int]`) validates and converts exactly like an equivalent
// `.params(schema)` call, and search params declared in the pattern (`&page[int]=0`) exactly like `.search(schema)`.
describe('route-declared params and search', () => {
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
        staleTime: Infinity,
      })
      .root()

  describe('action', () => {
    it('typed path params arrive as JS values — the .params(z.coerce.number()) effect from the string alone', async () => {
      const root = createRoot()
      const action = root
        .lets('action', 'item', 'GET', '/api/items/:id[int]')
        .loader(({ params }) => ({ params }))
        .action()

      expectTypeOf<typeof action.Infer.ParamsParsed>().toEqualTypeOf<{ id: number }>()

      const { loadPoint, fetch } = await createTestThings({ ssr: true, points: [root, action] })
      const result = await loadPoint(action, { params: { id: 42 } })
      expect(result).toEqual({ params: { id: 42 } })

      // over the wire the segment is canonical-form matched: a non-int URL never reaches the action
      const miss = await fetch('http://localhost/api/items/abc')
      expect(miss.status).toBe(404)
      const missLeadingZero = await fetch('http://localhost/api/items/007')
      expect(missLeadingZero.status).toBe(404)
    })

    it('declared search params validate and coerce — the .search(schema) effect from the string alone', async () => {
      const root = createRoot()
      const action = root
        .lets('action', 'list', 'GET', '/api/list&q&page[int]=0&ids[int][]&token!')
        .loader(({ search }) => ({ search }))
        .action()

      const { loadPoint } = await createTestThings({ ssr: true, points: [root, action] })

      const full = await loadPoint(action, { search: { token: 't', page: 2, ids: [1, 2] } })
      expect(full).toEqual({ search: { q: undefined, page: 2, ids: [1, 2], token: 't' } })

      // defaults fill, an absent array parses to []
      const defaults = await loadPoint(action, { search: { token: 't' } })
      expect(defaults).toEqual({ search: { q: undefined, page: 0, ids: [], token: 't' } })

      // a required (`!`) search param missing fails validation, like a required key in a .search(schema)
      await expect(loadPoint(action, { search: { page: 2 } } as never)).rejects.toThrow()
    })

    it('declared search over the wire: URL strings coerce into typed values', async () => {
      const root = createRoot()
      const action = root
        .lets('action', 'list', 'GET', '/api/list&page[int]=0&ids[int][]')
        .action(({ search }) => new Response(JSON.stringify(search)))

      const { fetch } = await createTestThings({ ssr: true, points: [root, action] })
      const response = await fetch('http://localhost/api/list?page=2&ids[]=7&ids[]=8')
      expect(response.status).toBe(200)
      expect(JSON.parse(await response.text())).toEqual({ page: 2, ids: [7, 8] })
    })

    it('a route-declared search and an equivalent .search(schema) parse the same input to the same result', async () => {
      const root = createRoot()
      const declared = root
        .lets('action', 'declared', 'GET', '/api/declared&page[int]=0&sort(new|top)=new')
        .loader(({ search }) => ({ search }))
        .action()
      const schemed = root
        .lets('action', 'schemed', 'GET', '/api/schemed')
        .search(
          z.object({
            page: z.coerce.number().int().default(0),
            sort: z.enum(['new', 'top']).default('new'),
          }),
        )
        .loader(({ search }) => ({ search }))
        .action()

      const { loadPoint } = await createTestThings({ ssr: true, points: [root, declared, schemed] })
      const fromDeclared = await loadPoint(declared, { search: { page: 2 } })
      const fromSchemed = await loadPoint(schemed, { search: { page: 2 } })
      expect(fromDeclared).toEqual({ search: { page: 2, sort: 'new' } })
      expect(fromSchemed).toEqual({ search: { page: 2, sort: 'new' } })
    })
  })

  describe('page', () => {
    it('typed params and declared search flow typed into the loader, the page and the query key — no schemaHelper needed', async () => {
      const root = createRoot()
      const routes = Routes.create({
        idea: '/ideas/:id[int]&page[int]=0&q',
      })
      const { Link } = createNavigation({ routes })
      const page = root
        .lets('page', 'idea', '/ideas/:id[int]&page[int]=0&q')
        .loader(({ params, search }) => ({ paramsLoader: params, searchLoader: search }))
        .page(({ data, params, search }) => (
          <>
            <div id="params-loader">{ymlifyline(data.paramsLoader)}</div>
            <div id="search-loader">{ymlifyline(data.searchLoader)}</div>
            <div id="params-mountable">{ymlifyline(params)}</div>
            <div id="search-mountable">{ymlifyline(search)}</div>
            <div id="page-type">{typeof search.page}</div>
            <Link route="idea" id="link-next-page" input={{ id: 7, '?': { page: search.page + 1 } }}>
              next page
            </Link>
          </>
        ))

      expectTypeOf<typeof page.Infer.ParamsParsed>().toEqualTypeOf<{ id: number }>()

      const { render, fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route({ id: 7, '?': { page: 2, q: 'x' } }), async ({ waitContent, tale, click }) => {
        await waitContent('#page-type:number')
        await click('#link-next-page')
        await waitContent('#search-mountable:page: 3')

        expect(await tale()).toMatchInlineSnapshot(`
          "
          /ideas/7?page=2&q=x
            #loading: ...

            #params-loader: id: 7
            #search-loader: page: 2, q: x
            #params-mountable: id: 7
            #search-mountable: page: 2, q: x
            #page-type: number
            #link-next-page: next page

          /ideas/7?page=3
            #loading: ...

            #params-loader: id: 7
            #search-loader: page: 3
            #params-mountable: id: 7
            #search-mountable: page: 3
            #page-type: number
            #link-next-page: next page
          "
        `)

        // declared keys land in the query key without any schemaHelper — the declaration itself names them
        const queryKeys = getQueryClient()
          .getQueryCache()
          .findAll()
          .map((q) => lineQueryKey(q.queryKey))
        expect(queryKeys).toMatchInlineSnapshot(`
          [
            "point0|root|page|idea|server|finite||data|{"?":{"page":"2","q":"x"},"id":"7"}",
            "point0|root|page|idea|server|finite||data|{"?":{"page":"3"},"id":"7"}",
          ]
        `)
      })

      const { preview } = await fetchSsr(page, { id: 7, '?': { page: 2, q: 'x' } })
      expect(preview).toMatchInlineSnapshot(`
        "
        #params-loader: id: 7
        #search-loader: page: 2, q: x
        #params-mountable: id: 7
        #search-mountable: page: 2, q: x
        #page-type: number
        #link-next-page: next page
        "
      `)
    })

    it('an invalid declared search value degrades to its absent case on a page (coerceSearch on match), it does not error', async () => {
      const root = createRoot()
      const page = root
        .lets('page', 'ideas', '/ideas&page[int]=0')
        .loader(({ search }) => ({ searchLoader: search }))
        .page(({ data }) => <div id="search-loader">{ymlifyline(data.searchLoader)}</div>)

      const { fetch } = await createTestThings({ ssr: true, points: [root, page] })
      const response = await fetch('http://localhost/ideas?page=abc')
      expect(response.status).toBe(200)
      expect(await response.text()).toContain('page: 0')
    })

    it('undeclared search keys still pass through to request.location.search but stay out of the query key', async () => {
      const root = createRoot()
      const page = root
        .lets('page', 'ideas', '/ideas&page[int]=0')
        .loader(({ request, search }) => ({
          searchLoader: search,
          searchRequest: request.location.search,
        }))
        .page(({ data }) => (
          <>
            <div id="search-loader">{ymlifyline(data.searchLoader)}</div>
            <div id="search-request">{ymlifyline(data.searchRequest)}</div>
          </>
        ))

      const { render } = await createTestThings({ ssr: true, points: [root, page] })
      await render(page.route({ '?': { page: 2, utm_source: 'x' } as never }), async ({ waitContent, tale }) => {
        await waitContent('#search-loader')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /ideas?page=2&utm_source=x
            #loading: ...

            #search-loader: page: 2
            #search-request: page: "2", utm_source: x
          "
        `)
        const queryKeys = getQueryClient()
          .getQueryCache()
          .findAll()
          .map((q) => lineQueryKey(q.queryKey))
        expect(queryKeys).toMatchInlineSnapshot(`
          [
            "point0|root|page|ideas|server|finite||data|{"?":{"page":"2"}}",
          ]
        `)
      })
    })
  })
})

import { Routes } from '@devp0nt/route0'
import { getQueryClient, Point0 } from '@point0/core'
import { useLocation } from '@point0/core/navigation'
import { zodSchemaHelper } from '@point0/core/schema/zod'
import { createNavigation } from '@point0/wouter'
import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { createTestThings, ymlifyline } from './utils/internal-testing.js'

describe('search', () => {
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

  const createRootWithSchemaHelper = () =>
    Point0.lets('root', 'root')
      .schemaHelper(zodSchemaHelper)
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

  describe('page', () => {
    it('if no search params schema, then search params not come to queryKey, and passed to server in request.location.search, and not refetches on search change', async () => {
      const root = createRoot()
      const routes = Routes.create({
        home: '/',
      })
      const { Link } = createNavigation({ routes })
      const page = root
        .lets('page', 'home', '/')
        .loader(({ request }) => ({ searchRequest: request.location.search }))
        .page(({ data }) => {
          const location = useLocation()
          return (
            <>
              <div id="utm">
                {location.search.utm_source as string},{data.searchRequest.utm_source as string}
              </div>
              <div id="search-request">{ymlifyline(data.searchRequest)}</div>
              <div id="search-location">{ymlifyline(location.search)}</div>
              <Link route="home" id="link-with-initial-search" input={{ '?': { utm_source: 'x' } }}>
                goto with initial search
              </Link>
              <Link route="home" id="link-with-another-search" input={{ '?': { utm_source: 'y' } }}>
                goto with another search
              </Link>
            </>
          )
        })

      const { render, fetchesTale, fetchRecorder, fetchSsr } = await createTestThings({
        ssr: true,
        points: [root, page],
      })
      await render(page.route({ '?': { utm_source: 'x' } }), async ({ waitContent, tale, click }) => {
        await waitContent('#utm:x,x')
        await click('#link-with-another-search')
        await waitContent('#utm:y,x')
        await click('#link-with-initial-search')
        await waitContent('#utm:x,x')

        expect(await tale()).toMatchInlineSnapshot(`
        "
        /?utm_source=x
          #loading: ...

          #utm: x,x
          #search-request: utm_source: x
          #search-location: utm_source: x
          #link-with-initial-search: goto with initial search
          #link-with-another-search: goto with another search

        /?utm_source=y
          #utm: y,x
          #search-request: utm_source: x
          #search-location: utm_source: "y"
          #link-with-initial-search: goto with initial search
          #link-with-another-search: goto with another search

        /?utm_source=x
          #utm: x,x
          #search-request: utm_source: x
          #search-location: utm_source: x
          #link-with-initial-search: goto with initial search
          #link-with-another-search: goto with another search
        "
      `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {"utm_source":"x"}
      "
    `)

      fetchRecorder.prune()
      const { preview, queryClientQueriesKeys } = await fetchSsr(page, { '?': { utm_source: 'x' } })
      expect(preview).toMatchInlineSnapshot(`
      "
      #utm: x,x
      #search-request: utm_source: x
      #search-location: utm_source: x
      #link-with-initial-search: goto with initial search
      #link-with-another-search: goto with another search
      "
    `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      page.home (server) < {"utm_source":"x"}
      "
    `)
      expect(queryClientQueriesKeys).toMatchInlineSnapshot(`
      [
        "point0|root|page|home|server|finite|{}|data",
      ]
    `)
    })

    it('if has search params schema, but has no schemaHelper for extractingKeys, then all search params come to queryKey, and passed to server in request.location.search, and always refetches on search changes', async () => {
      const root = createRoot()
      const routes = Routes.create({
        home: '/',
      })
      const { Link } = createNavigation({ routes })
      const page = root
        .lets('page', 'home', '/')
        .search(z.object({ filter: z.string() }))
        .loader(({ request, search }) => ({ searchRequest: request.location.search, searchLoader: search }))
        .page(({ data, search }) => {
          const location = useLocation()
          return (
            <>
              <div id="utm">
                {location.search.utm_source as string},{data.searchRequest.utm_source as string}
              </div>
              <div id="search-request">{ymlifyline(data.searchRequest)}</div>
              <div id="search-loader">{ymlifyline(data.searchLoader)}</div>
              <div id="search-location">{ymlifyline(location.search)}</div>
              <div id="search-mountable">{ymlifyline(search)}</div>
              <Link
                route="home"
                id="link-with-initial-search"
                input={{ '?': { utm_source: 'x', filter: 'my-filter' } as never }}
              >
                goto with initial search
              </Link>
              <Link
                route="home"
                id="link-with-another-search"
                input={{ '?': { utm_source: 'y', filter: 'my-filter' } as never }}
              >
                goto with another search
              </Link>
            </>
          )
        })

      const { render, fetchesTale, fetchRecorder, fetchSsr } = await createTestThings({
        ssr: true,
        points: [root, page],
      })
      await render(
        page.route({ '?': { filter: 'my-filter', utm_source: 'x' } as never }),
        async ({ waitContent, tale, click }) => {
          await waitContent('#utm:x,x')
          await click('#link-with-another-search')
          await waitContent('#utm:y,y')
          await click('#link-with-initial-search')
          await waitContent('#utm:x,x')

          expect(await tale()).toMatchInlineSnapshot(`
          "
          /?filter=my-filter&utm_source=x
            #loading: ...

            #utm: x,x
            #search-request: filter: my-filter, utm_source: x
            #search-loader: filter: my-filter
            #search-location: filter: my-filter, utm_source: x
            #search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search

          /?utm_source=y&filter=my-filter
            #loading: ...

            #utm: y,y
            #search-request: filter: my-filter, utm_source: "y"
            #search-loader: filter: my-filter
            #search-location: utm_source: "y", filter: my-filter
            #search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search

          /?utm_source=x&filter=my-filter
            #utm: x,x
            #search-request: filter: my-filter, utm_source: x
            #search-loader: filter: my-filter
            #search-location: utm_source: x, filter: my-filter
            #search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search
          "
        `)
          const queryKeys = getQueryClient()
            .getQueryCache()
            .findAll()
            .map((q) => q.queryKey.join('|'))
          expect(queryKeys).toMatchInlineSnapshot(`
          [
            "point0|root|page|home|server|finite|{"?":{"filter":"my-filter","utm_source":"x"}}|data",
            "point0|root|page|home|server|finite|{"?":{"filter":"my-filter","utm_source":"y"}}|data",
          ]
        `)
        },
      )
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {"filter":"my-filter","utm_source":"x"}
      page.home (client) < {"utm_source":"y","filter":"my-filter"}
      "
    `)

      fetchRecorder.prune()
      const { preview, queryClientQueriesKeys } = await fetchSsr(page, {
        '?': { filter: 'my-filter', utm_source: 'x' } as never,
      })
      expect(preview).toMatchInlineSnapshot(`
      "
      #utm: x,x
      #search-request: filter: my-filter, utm_source: x
      #search-loader: filter: my-filter
      #search-location: filter: my-filter, utm_source: x
      #search-mountable: filter: my-filter
      #link-with-initial-search: goto with initial search
      #link-with-another-search: goto with another search
      "
    `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      page.home (server) < {"filter":"my-filter","utm_source":"x"}
      "
    `)
      expect(queryClientQueriesKeys).toMatchInlineSnapshot(`
      [
        "point0|root|page|home|server|finite|{"?":{"filter":"my-filter","utm_source":"x"}}|data",
      ]
    `)
    })

    it('if has search params schema, and has schemaHelper for extractingKeys, then only known search params come to queryKey, but still all search params passed to server in request.location.search, and refetches only when known search params changes', async () => {
      const root = createRootWithSchemaHelper()
      const routes = Routes.create({
        home: '/',
      })
      const { Link } = createNavigation({ routes })
      const page = root
        .lets('page', 'home', '/')
        .search(z.object({ filter: z.string() }))
        .loader(({ request, search }) => ({ searchRequest: request.location.search, searchLoader: search }))
        .page(({ data, search }) => {
          const location = useLocation()
          return (
            <>
              <div id="utm">
                {location.search.utm_source as string},{data.searchRequest.utm_source as string}
              </div>
              <div id="search-request">{ymlifyline(data.searchRequest)}</div>
              <div id="search-loader">{ymlifyline(data.searchLoader)}</div>
              <div id="search-location">{ymlifyline(location.search)}</div>
              <div id="search-mountable">{ymlifyline(search)}</div>
              <Link
                route="home"
                id="link-with-initial-search"
                input={{ '?': { utm_source: 'x', filter: 'my-filter' } as never }}
              >
                goto with initial search
              </Link>
              <Link
                route="home"
                id="link-with-another-search"
                input={{ '?': { utm_source: 'y', filter: 'my-filter' } as never }}
              >
                goto with another search
              </Link>
              <Link
                route="home"
                id="link-with-really-another-search"
                input={{ '?': { utm_source: 'z', filter: 'another-filter' } as never }}
              >
                goto with really another search
              </Link>
            </>
          )
        })

      const { render, fetchesTale, fetchRecorder, fetchSsr } = await createTestThings({
        ssr: true,
        points: [root, page],
      })
      await render(
        page.route({ '?': { filter: 'my-filter', utm_source: 'x' } as never }),
        async ({ waitContent, tale, click }) => {
          await waitContent('#utm:x,x')
          await click('#link-with-another-search')
          await waitContent('#utm:y,x')
          await click('#link-with-really-another-search')
          await waitContent('#utm:z,z')
          await click('#link-with-initial-search')
          await waitContent('#utm:x,x')

          expect(await tale()).toMatchInlineSnapshot(`
          "
          /?filter=my-filter&utm_source=x
            #loading: ...

            #utm: x,x
            #search-request: filter: my-filter, utm_source: x
            #search-loader: filter: my-filter
            #search-location: filter: my-filter, utm_source: x
            #search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search
            #link-with-really-another-search: goto with really another search

          /?utm_source=y&filter=my-filter
            #utm: y,x
            #search-request: filter: my-filter, utm_source: x
            #search-loader: filter: my-filter
            #search-location: utm_source: "y", filter: my-filter
            #search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search
            #link-with-really-another-search: goto with really another search

          /?utm_source=z&filter=another-filter
            #loading: ...

            #utm: z,z
            #search-request: filter: another-filter, utm_source: z
            #search-loader: filter: another-filter
            #search-location: utm_source: z, filter: another-filter
            #search-mountable: filter: another-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search
            #link-with-really-another-search: goto with really another search

          /?utm_source=x&filter=my-filter
            #utm: x,x
            #search-request: filter: my-filter, utm_source: x
            #search-loader: filter: my-filter
            #search-location: utm_source: x, filter: my-filter
            #search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search
            #link-with-really-another-search: goto with really another search
          "
        `)
          const queryKeys = getQueryClient()
            .getQueryCache()
            .findAll()
            .map((q) => q.queryKey.join('|'))
          expect(queryKeys).toMatchInlineSnapshot(`
          [
            "point0|root|page|home|server|finite|{"?":{"filter":"my-filter"}}|data",
            "point0|root|page|home|server|finite|{"?":{"filter":"another-filter"}}|data",
          ]
        `)
        },
      )
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {"filter":"my-filter","utm_source":"x"}
      page.home (client) < {"utm_source":"z","filter":"another-filter"}
      "
    `)

      fetchRecorder.prune()
      const { preview, queryClientQueriesKeys } = await fetchSsr(page, {
        '?': { filter: 'my-filter', utm_source: 'x' } as never,
      })
      expect(preview).toMatchInlineSnapshot(`
      "
      #utm: x,x
      #search-request: filter: my-filter, utm_source: x
      #search-loader: filter: my-filter
      #search-location: filter: my-filter, utm_source: x
      #search-mountable: filter: my-filter
      #link-with-initial-search: goto with initial search
      #link-with-another-search: goto with another search
      #link-with-really-another-search: goto with really another search
      "
    `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      page.home (server) < {"filter":"my-filter","utm_source":"x"}
      "
    `)
      expect(queryClientQueriesKeys).toMatchInlineSnapshot(`
      [
        "point0|root|page|home|server|finite|{"?":{"filter":"my-filter"}}|data",
      ]
    `)
    })
  })

  describe('layout + page', () => {
    it('if no search params schema, then search params not come to queryKey, and passed to server in request.location.search, and not refetches on search change', async () => {
      const root = createRoot()
      const routes = Routes.create({
        home: '/',
      })
      const { Link } = createNavigation({ routes })
      const layout = root
        .lets('layout', 'app')
        .loader(({ request }) => ({ searchRequest: request.location.search }))
        .layout(({ data, children }) => {
          const location = useLocation()
          return (
            <>
              <div id="layout-utm">
                {location.search.utm_source as string},{data.searchRequest.utm_source as string}
              </div>
              <div id="layout-search-request">{ymlifyline(data.searchRequest)}</div>
              <div id="layout-search-location">{ymlifyline(location.search)}</div>
              {children}
            </>
          )
        })
      const page = layout
        .lets('page', 'home', '/')
        .loader(({ request }) => ({ searchRequest: request.location.search }))
        .page(({ data }) => {
          const location = useLocation()
          return (
            <>
              <div id="page-utm">
                {location.search.utm_source as string},{data.searchRequest.utm_source as string}
              </div>
              <div id="page-search-request">{ymlifyline(data.searchRequest)}</div>
              <div id="page-search-location">{ymlifyline(location.search)}</div>
              <Link route="home" id="link-with-initial-search" input={{ '?': { utm_source: 'x' } }}>
                goto with initial search
              </Link>
              <Link route="home" id="link-with-another-search" input={{ '?': { utm_source: 'y' } }}>
                goto with another search
              </Link>
            </>
          )
        })

      const { render, fetchesTale, fetchRecorder, fetchSsr } = await createTestThings({
        ssr: true,
        points: [root, layout, page],
      })
      await render(page.route({ '?': { utm_source: 'x' } }), async ({ waitContent, tale, click }) => {
        console.log(await tale())
        await waitContent('#layout-utm:x,x')
        await click('#link-with-another-search')
        await waitContent('#layout-utm:y,x')
        await click('#link-with-initial-search')
        await waitContent('#layout-utm:x,x')

        expect(await tale()).toMatchInlineSnapshot(`
        "
        /?utm_source=x
          #loading: ...

          #layout-utm: x,x
          #layout-search-request: utm_source: x
          #layout-search-location: utm_source: x
          #page-utm: x,x
          #page-search-request: utm_source: x
          #page-search-location: utm_source: x
          #link-with-initial-search: goto with initial search
          #link-with-another-search: goto with another search

        /?utm_source=y
          #layout-utm: y,x
          #layout-search-request: utm_source: x
          #layout-search-location: utm_source: "y"
          #page-utm: y,x
          #page-search-request: utm_source: x
          #page-search-location: utm_source: "y"
          #link-with-initial-search: goto with initial search
          #link-with-another-search: goto with another search

        /?utm_source=x
          #layout-utm: x,x
          #layout-search-request: utm_source: x
          #layout-search-location: utm_source: x
          #page-utm: x,x
          #page-search-request: utm_source: x
          #page-search-location: utm_source: x
          #link-with-initial-search: goto with initial search
          #link-with-another-search: goto with another search
        "
      `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      layout.app (client) < {"utm_source":"x"}
      page.home (client) < {"utm_source":"x"}
      "
    `)

      fetchRecorder.prune()
      const { preview, queryClientQueriesKeys } = await fetchSsr(page, { '?': { utm_source: 'x' } })
      expect(preview).toMatchInlineSnapshot(`
      "
      #layout-utm: x,x
      #layout-search-request: utm_source: x
      #layout-search-location: utm_source: x
      #page-utm: x,x
      #page-search-request: utm_source: x
      #page-search-location: utm_source: x
      #link-with-initial-search: goto with initial search
      #link-with-another-search: goto with another search
      "
    `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      layout.app (server) < {"utm_source":"x"}
      page.home (server) < {"utm_source":"x"}
      "
    `)
      expect(queryClientQueriesKeys).toMatchInlineSnapshot(`
      [
        "point0|root|layout|app|server|finite|{}|data",
        "point0|root|page|home|server|finite|{}|data",
      ]
    `)
    })

    it('if has search params schema, but has no schemaHelper for extractingKeys, then all search params come to queryKey, and passed to server in request.location.search, and always refetches on search changes', async () => {
      const root = createRoot()
      const routes = Routes.create({
        home: '/',
      })
      const { Link } = createNavigation({ routes })
      const layout = root
        .lets('layout', 'app')
        .search(z.object({ filter: z.string() }))
        .loader(({ request }) => ({ searchRequest: request.location.search, searchLoader: request.location.search }))
        .layout(({ data, children, search }) => {
          const location = useLocation()
          return (
            <>
              <div id="layout-utm">
                {location.search.utm_source as string},{data.searchRequest.utm_source as string}
              </div>
              <div id="layout-search-request">{ymlifyline(data.searchRequest)}</div>
              <div id="layout-search-loader">{ymlifyline(data.searchLoader)}</div>
              <div id="layout-search-location">{ymlifyline(location.search)}</div>
              <div id="layout-search-mountable">{ymlifyline(search)}</div>
              {children}
            </>
          )
        })
      const page = layout
        .lets('page', 'home', '/')
        .loader(({ request, search }) => ({ searchRequest: request.location.search, searchLoader: search }))
        .page(({ data, search }) => {
          const location = useLocation()
          return (
            <>
              <div id="page-utm">
                {location.search.utm_source as string},{data.searchRequest.utm_source as string}
              </div>
              <div id="page-search-request">{ymlifyline(data.searchRequest)}</div>
              <div id="page-search-loader">{ymlifyline(data.searchLoader)}</div>
              <div id="page-search-location">{ymlifyline(location.search)}</div>
              <div id="page-search-mountable">{ymlifyline(search)}</div>
              <Link
                route="home"
                id="link-with-initial-search"
                input={{ '?': { utm_source: 'x', filter: 'my-filter' } as never }}
              >
                goto with initial search
              </Link>
              <Link
                route="home"
                id="link-with-another-search"
                input={{ '?': { utm_source: 'y', filter: 'my-filter' } as never }}
              >
                goto with another search
              </Link>
            </>
          )
        })

      const { render, fetchesTale, fetchRecorder, fetchSsr } = await createTestThings({
        ssr: true,
        points: [root, layout, page],
      })
      await render(
        page.route({ '?': { filter: 'my-filter', utm_source: 'x' } as never }),
        async ({ waitContent, tale, click }) => {
          await waitContent('#layout-utm:x,x')
          await click('#link-with-another-search')
          await waitContent('#layout-utm:y,y')
          await click('#link-with-initial-search')
          await waitContent('#layout-utm:x,x')

          expect(await tale()).toMatchInlineSnapshot(`
          "
          /?filter=my-filter&utm_source=x
            #loading: ...

            #layout-utm: x,x
            #layout-search-request: filter: my-filter, utm_source: x
            #layout-search-loader: filter: my-filter, utm_source: x
            #layout-search-location: filter: my-filter, utm_source: x
            #layout-search-mountable: filter: my-filter
            #page-utm: x,x
            #page-search-request: filter: my-filter, utm_source: x
            #page-search-loader: filter: my-filter
            #page-search-location: filter: my-filter, utm_source: x
            #page-search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search

          /?utm_source=y&filter=my-filter
            #loading: ...

            #layout-utm: y,y
            #layout-search-request: filter: my-filter, utm_source: "y"
            #layout-search-loader: filter: my-filter, utm_source: "y"
            #layout-search-location: utm_source: "y", filter: my-filter
            #layout-search-mountable: filter: my-filter
            #page-utm: y,y
            #page-search-request: filter: my-filter, utm_source: "y"
            #page-search-loader: filter: my-filter
            #page-search-location: utm_source: "y", filter: my-filter
            #page-search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search

          /?utm_source=x&filter=my-filter
            #layout-utm: x,x
            #layout-search-request: filter: my-filter, utm_source: x
            #layout-search-loader: filter: my-filter, utm_source: x
            #layout-search-location: utm_source: x, filter: my-filter
            #layout-search-mountable: filter: my-filter
            #page-utm: x,x
            #page-search-request: filter: my-filter, utm_source: x
            #page-search-loader: filter: my-filter
            #page-search-location: utm_source: x, filter: my-filter
            #page-search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search
          "
        `)
          const queryKeys = getQueryClient()
            .getQueryCache()
            .findAll()
            .map((q) => q.queryKey.join('|'))
          expect(queryKeys).toMatchInlineSnapshot(`
          [
            "point0|root|layout|app|server|finite|{"?":{"filter":"my-filter","utm_source":"x"}}|data",
            "point0|root|page|home|server|finite|{"?":{"filter":"my-filter","utm_source":"x"}}|data",
            "point0|root|layout|app|server|finite|{"?":{"filter":"my-filter","utm_source":"y"}}|data",
            "point0|root|page|home|server|finite|{"?":{"filter":"my-filter","utm_source":"y"}}|data",
          ]
        `)
        },
      )
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      layout.app (client) < {"filter":"my-filter","utm_source":"x"}
      page.home (client) < {"filter":"my-filter","utm_source":"x"}
      layout.app (client) < {"utm_source":"y","filter":"my-filter"}
      page.home (client) < {"utm_source":"y","filter":"my-filter"}
      "
    `)

      fetchRecorder.prune()
      const { preview, queryClientQueriesKeys } = await fetchSsr(page, {
        '?': { filter: 'my-filter', utm_source: 'x' } as never,
      })
      expect(preview).toMatchInlineSnapshot(`
      "
      #layout-utm: x,x
      #layout-search-request: filter: my-filter, utm_source: x
      #layout-search-loader: filter: my-filter, utm_source: x
      #layout-search-location: filter: my-filter, utm_source: x
      #layout-search-mountable: filter: my-filter
      #page-utm: x,x
      #page-search-request: filter: my-filter, utm_source: x
      #page-search-loader: filter: my-filter
      #page-search-location: filter: my-filter, utm_source: x
      #page-search-mountable: filter: my-filter
      #link-with-initial-search: goto with initial search
      #link-with-another-search: goto with another search
      "
    `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      layout.app (server) < {"filter":"my-filter","utm_source":"x"}
      page.home (server) < {"filter":"my-filter","utm_source":"x"}
      "
    `)
      expect(queryClientQueriesKeys).toMatchInlineSnapshot(`
      [
        "point0|root|layout|app|server|finite|{"?":{"filter":"my-filter","utm_source":"x"}}|data",
        "point0|root|page|home|server|finite|{"?":{"filter":"my-filter","utm_source":"x"}}|data",
      ]
    `)
    })

    it('if has search params schema, and has schemaHelper for extractingKeys, then only known search params come to queryKey, but still all search params passed to server in request.location.search, and refetches only when known search params changes', async () => {
      const root = createRootWithSchemaHelper()
      const routes = Routes.create({
        home: '/',
      })
      const { Link } = createNavigation({ routes })
      const layout = root
        .lets('layout', 'app')
        .search(z.object({ filter: z.string() }))
        .loader(({ request }) => ({ searchRequest: request.location.search, searchLoader: request.location.search }))
        .layout(({ data, children, search }) => {
          const location = useLocation()
          return (
            <>
              <div id="layout-utm">
                {location.search.utm_source as string},{data.searchRequest.utm_source as string}
              </div>
              <div id="layout-search-request">{ymlifyline(data.searchRequest)}</div>
              <div id="layout-search-loader">{ymlifyline(data.searchLoader)}</div>
              <div id="layout-search-location">{ymlifyline(location.search)}</div>
              <div id="layout-search-mountable">{ymlifyline(search)}</div>
              {children}
            </>
          )
        })
      const page = layout
        .lets('page', 'home', '/')
        .search(z.object({ filter: z.string() }))
        .loader(({ request, search }) => ({ searchRequest: request.location.search, searchLoader: search }))
        .page(({ data, search }) => {
          const location = useLocation()
          return (
            <>
              <div id="page-utm">
                {location.search.utm_source as string},{data.searchRequest.utm_source as string}
              </div>
              <div id="page-search-request">{ymlifyline(data.searchRequest)}</div>
              <div id="page-search-loader">{ymlifyline(data.searchLoader)}</div>
              <div id="page-search-location">{ymlifyline(location.search)}</div>
              <div id="page-search-mountable">{ymlifyline(search)}</div>
              <Link
                route="home"
                id="link-with-initial-search"
                input={{ '?': { utm_source: 'x', filter: 'my-filter' } as never }}
              >
                goto with initial search
              </Link>
              <Link
                route="home"
                id="link-with-another-search"
                input={{ '?': { utm_source: 'y', filter: 'my-filter' } as never }}
              >
                goto with another search
              </Link>
              <Link
                route="home"
                id="link-with-really-another-search"
                input={{ '?': { utm_source: 'z', filter: 'another-filter' } as never }}
              >
                goto with really another search
              </Link>
            </>
          )
        })

      const { render, fetchesTale, fetchRecorder, fetchSsr } = await createTestThings({
        ssr: true,
        points: [root, layout, page],
      })
      await render(
        page.route({ '?': { filter: 'my-filter', utm_source: 'x' } as never }),
        async ({ waitContent, tale, click }) => {
          await waitContent('#layout-utm:x,x')
          await click('#link-with-another-search')
          await waitContent('#layout-utm:y,x')
          await click('#link-with-really-another-search')
          await waitContent('#layout-utm:z,z')
          await click('#link-with-initial-search')
          await waitContent('#layout-utm:x,x')

          expect(await tale()).toMatchInlineSnapshot(`
          "
          /?filter=my-filter&utm_source=x
            #loading: ...

            #layout-utm: x,x
            #layout-search-request: filter: my-filter, utm_source: x
            #layout-search-loader: filter: my-filter, utm_source: x
            #layout-search-location: filter: my-filter, utm_source: x
            #layout-search-mountable: filter: my-filter
            #page-utm: x,x
            #page-search-request: filter: my-filter, utm_source: x
            #page-search-loader: filter: my-filter
            #page-search-location: filter: my-filter, utm_source: x
            #page-search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search
            #link-with-really-another-search: goto with really another search

          /?utm_source=y&filter=my-filter
            #layout-utm: y,x
            #layout-search-request: filter: my-filter, utm_source: x
            #layout-search-loader: filter: my-filter, utm_source: x
            #layout-search-location: utm_source: "y", filter: my-filter
            #layout-search-mountable: filter: my-filter
            #page-utm: y,x
            #page-search-request: filter: my-filter, utm_source: x
            #page-search-loader: filter: my-filter
            #page-search-location: utm_source: "y", filter: my-filter
            #page-search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search
            #link-with-really-another-search: goto with really another search

          /?utm_source=z&filter=another-filter
            #loading: ...

            #layout-utm: z,z
            #layout-search-request: filter: another-filter, utm_source: z
            #layout-search-loader: filter: another-filter, utm_source: z
            #layout-search-location: utm_source: z, filter: another-filter
            #layout-search-mountable: filter: another-filter
            #page-utm: z,z
            #page-search-request: filter: another-filter, utm_source: z
            #page-search-loader: filter: another-filter
            #page-search-location: utm_source: z, filter: another-filter
            #page-search-mountable: filter: another-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search
            #link-with-really-another-search: goto with really another search

          /?utm_source=x&filter=my-filter
            #layout-utm: x,x
            #layout-search-request: filter: my-filter, utm_source: x
            #layout-search-loader: filter: my-filter, utm_source: x
            #layout-search-location: utm_source: x, filter: my-filter
            #layout-search-mountable: filter: my-filter
            #page-utm: x,x
            #page-search-request: filter: my-filter, utm_source: x
            #page-search-loader: filter: my-filter
            #page-search-location: utm_source: x, filter: my-filter
            #page-search-mountable: filter: my-filter
            #link-with-initial-search: goto with initial search
            #link-with-another-search: goto with another search
            #link-with-really-another-search: goto with really another search
          "
        `)
          const queryKeys = getQueryClient()
            .getQueryCache()
            .findAll()
            .map((q) => q.queryKey.join('|'))
          expect(queryKeys).toMatchInlineSnapshot(`
          [
            "point0|root|layout|app|server|finite|{"?":{"filter":"my-filter"}}|data",
            "point0|root|page|home|server|finite|{"?":{"filter":"my-filter"}}|data",
            "point0|root|layout|app|server|finite|{"?":{"filter":"another-filter"}}|data",
            "point0|root|page|home|server|finite|{"?":{"filter":"another-filter"}}|data",
          ]
        `)
        },
      )
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      layout.app (client) < {"filter":"my-filter","utm_source":"x"}
      page.home (client) < {"filter":"my-filter","utm_source":"x"}
      layout.app (client) < {"utm_source":"z","filter":"another-filter"}
      page.home (client) < {"utm_source":"z","filter":"another-filter"}
      "
    `)

      fetchRecorder.prune()
      const { preview, queryClientQueriesKeys } = await fetchSsr(page, {
        '?': { filter: 'my-filter', utm_source: 'x' } as never,
      })
      expect(preview).toMatchInlineSnapshot(`
      "
      #layout-utm: x,x
      #layout-search-request: filter: my-filter, utm_source: x
      #layout-search-loader: filter: my-filter, utm_source: x
      #layout-search-location: filter: my-filter, utm_source: x
      #layout-search-mountable: filter: my-filter
      #page-utm: x,x
      #page-search-request: filter: my-filter, utm_source: x
      #page-search-loader: filter: my-filter
      #page-search-location: filter: my-filter, utm_source: x
      #page-search-mountable: filter: my-filter
      #link-with-initial-search: goto with initial search
      #link-with-another-search: goto with another search
      #link-with-really-another-search: goto with really another search
      "
    `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      layout.app (server) < {"filter":"my-filter","utm_source":"x"}
      page.home (server) < {"filter":"my-filter","utm_source":"x"}
      "
    `)
      expect(queryClientQueriesKeys).toMatchInlineSnapshot(`
      [
        "point0|root|layout|app|server|finite|{"?":{"filter":"my-filter"}}|data",
        "point0|root|page|home|server|finite|{"?":{"filter":"my-filter"}}|data",
      ]
    `)
    })
  })
})

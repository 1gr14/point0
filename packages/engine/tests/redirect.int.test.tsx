import { Routes } from '@1gr14/route0'
import { Point0 } from '@point0/core'
import { createNavigation } from '@point0/react-dom/router'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'

describe('redirect', () => {
  const createRoot = () =>
    Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
      .error(({ error }) => <div id="error">{error.message}</div>)
      .queryOptions({
        retry: false,
        retryOnMount: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
      })
      .root()

  describe('by Redirect', () => {
    it('route no params', async () => {
      const root = createRoot()
      const page1 = root.lets('page', 'page1', '/1').page(() => (
        <div id="page1">
          content
          <Redirect route="page2" />
        </div>
      ))
      const page2 = root.lets('page', 'page2', '/2').page(() => <div id="page2">content</div>)
      const routes = Routes.create({
        page1: '/1',
        page2: '/2',
      })
      const { render, fetchPreview, fetchesTale, fetchRecorder, Redirect } = await createTestThings({
        ssr: true,
        points: [root, page1, page2],
        routes,
      })
      await render(page1.route(), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /1
            #page1: content

          /2
            #page2: content
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1)).toMatchInlineSnapshot(`
        "
        #page2: content
        "
      `)
      const fetchRecords = await fetchRecorder.waitFinishedResults()
      expect(fetchRecords.map((r) => r.response.status)).toMatchInlineSnapshot(`
        [
          302,
          200,
        ]
      `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) (page) < {}
        page.page2 (client) (page) < {}
        "
      `)
    })

    it('route with params', async () => {
      const root = createRoot()
      const page1 = root.lets('page', 'page1', '/x/:id').page(({ params }) => (
        <div id="page1">
          {params.id}
          <Redirect route="page2" status={308} input={{ id: '222' }} />
        </div>
      ))
      const page2 = root.lets('page', 'page2', '/y/:id').page(({ params }) => <div id="page2">{params.id}</div>)
      const routes = Routes.create({
        page1: '/x/:id',
        page2: '/y/:id',
      })
      const { render, fetchPreview, fetchesTale, fetchRecorder, Redirect } = await createTestThings({
        ssr: true,
        points: [root, page1, page2],
        routes,
      })
      await render(page1.route({ id: '111' }), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /x/111
            #page1: 111

          /y/222
            #page2: 222
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1, { id: '111' })).toMatchInlineSnapshot(`
        "
        #page2: 222
        "
      `)
      const fetchRecords = await fetchRecorder.waitFinishedResults()
      expect(fetchRecords.map((r) => r.response.status)).toMatchInlineSnapshot(`
        [
          308,
          200,
        ]
      `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) (page) < {}
        page.page2 (client) (page) < {}
        "
      `)
    })

    it('route with params and search', async () => {
      const root = createRoot()
      const page1 = root.lets('page', 'page1', '/x/:id').page(({ params, location }) => (
        <div id="page1">
          {params.id}, {location.search.q as string}
          <Redirect route="page2" input={{ id: '222', '?': { q: 'qwe' } }} />
        </div>
      ))
      const page2 = root.lets('page', 'page2', '/y/:id').page(({ params, location }) => (
        <div id="page2">
          {params.id}, {location.search.q as string}
        </div>
      ))
      const routes = Routes.create({
        page1: '/x/:id',
        page2: '/y/:id',
      })
      const { render, fetchPreview, fetchesTale, fetchRecorder, Redirect } = await createTestThings({
        ssr: true,
        points: [root, page1, page2],
        routes,
      })
      await render(page1.route({ id: '111', '?': { q: 'zxc' } }), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /x/111?q=zxc
            #page1: 111, zxc

          /y/222?q=qwe
            #page2: 222, qwe
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1, { id: '111' })).toMatchInlineSnapshot(`
        "
        #page2: 222, qwe
        "
      `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) (page) < {}
        page.page2 (client) (page) < {}
        "
      `)
    })
  })

  describe('by with', () => {
    it('route no params', async () => {
      const root = createRoot()
      const routes = Routes.create({
        page1: '/1',
        page2: '/2',
      })
      let { redirect } = createNavigation({
        routes,
      })
      const page1 = root
        .lets('page', 'page1', '/1')
        .with(() => redirect('page2'))
        .page(() => <div id="page1">content</div>)
      const page2 = root.lets('page', 'page2', '/2').page(() => <div id="page2">content</div>)
      const {
        render,
        fetchPreview,
        fetchesTale,
        fetchRecorder,
        redirect: redirect_fixCicular,
      } = await createTestThings({
        ssr: true,
        points: [root, page1, page2],
        routes,
      })
      redirect = redirect_fixCicular
      await render(page1.route(), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /1
            (Empty)

          /2
            #page2: content
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1)).toMatchInlineSnapshot(`
        "
        #page2: content
        "
      `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) (page) < {}
        page.page2 (client) (page) < {}
        "
      `)
    })

    it('route with params and search', async () => {
      const root = createRoot()
      const routes = Routes.create({
        page1: '/x/:id',
        page2: '/y/:id',
      })
      let { redirect } = createNavigation({
        routes,
      })
      const page1 = root
        .lets('page', 'page1', '/x/:id')
        .with(({ params }) => redirect('page2', { id: params.id, '?': { q: 'qwe' } }))
        .page(() => <div id="page1">content</div>)
      const page2 = root.lets('page', 'page2', 'y/:id').page(({ params, location }) => (
        <div id="page2">
          {params.id}, {location.search.q as string}
        </div>
      ))
      const {
        render,
        fetchPreview,
        fetchesTale,
        fetchRecorder,
        redirect: redirect_fixCicular,
      } = await createTestThings({
        ssr: true,
        points: [root, page1, page2],
      })
      redirect = redirect_fixCicular
      await render(page1.route({ id: '111', '?': { q: 'zxc' } }), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
            "
            /x/111?q=zxc
              (Empty)

            /y/111?q=qwe
              #page2: 111, qwe
            "
          `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "

          "
        `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1, { id: '111', '?': { q: 'zxc' } })).toMatchInlineSnapshot(`
          "
          #page2: 111, qwe
          "
        `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
          page.page1 (client) (page) < {}
          page.page2 (client) (page) < {}
          "
        `)
    })

    it('two queries', async () => {
      const root = createRoot()
      const routes = Routes.create({
        page1: '/x/:id',
        page2: '/y/:id',
      })
      let { redirect } = createNavigation({
        routes,
      })
      const query1 = root
        .lets('query', 'query1')
        .loader(() => {
          return { result: 'query1' }
        })
        .query()
      const query2 = root
        .lets('query', 'query2')
        .loader(() => {
          if (Math.random() + 1) {
            throw redirect('page2', { id: '234', '?': { q: 'qwe' } })
          }
          return { result: 'query2' }
        })
        .query()
      const page1 = root
        .lets('page', 'page1', '/x/:id')
        .with(() => {
          return [query1.useQuery(), query2.useQuery()]
        })
        .page(() => <div id="page1">content</div>)
      const page2 = root.lets('page', 'page2', 'y/:id').page(({ params, location }) => (
        <div id="page2">
          {params.id}, {location.search.q as string}
        </div>
      ))
      const {
        render,
        fetchPreview,
        fetchesTale,
        fetchRecorder,
        redirect: redirect_fixCicular,
      } = await createTestThings({
        ssr: true,
        points: [root, page1, page2, query1, query2],
      })
      redirect = redirect_fixCicular
      await render(page1.route({ id: '111', '?': { q: 'zxc' } }), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
            "
            /x/111?q=zxc
              #loading: ...

            /y/234?q=qwe
              (Empty)

              #page2: 234, qwe
            "
          `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
          query.query1 (client) < {}
          query.query2 (client) < {}
          "
        `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1, { id: '111', '?': { q: 'zxc' } })).toMatchInlineSnapshot(`
          "
          #page2: 234, qwe
          "
        `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
          page.page1 (client) (page) < {}
          query.query1 (server) < {}
          query.query2 (server) < {}
          page.page2 (client) (page) < {}
          "
        `)
    })

    it('conditional', async () => {
      const root = createRoot()
      const routes = Routes.create({
        page1: '/x/:id',
        page2: '/y/:id',
      })
      let { redirect } = createNavigation({
        routes,
      })
      const page1 = root
        .lets('page', 'page1', '/x/:id')
        .with(({ params }) => (params.id === '1' ? redirect('page2', { id: params.id }) : undefined))
        .page(() => <div id="page1">content</div>)
      const page2 = root.lets('page', 'page2', 'y/:id').page(() => <div id="page2">content</div>)
      const {
        render,
        fetchPreview,
        fetchesTale,
        fetchRecorder,
        redirect: redirect_fixCicular,
      } = await createTestThings({
        ssr: true,
        points: [root, page1, page2],
      })
      redirect = redirect_fixCicular
      await render(page1.route({ id: '1' }), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
            "
            /x/1
              (Empty)

            /y/1
              #page2: content
            "
          `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "

          "
        `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1, { id: '1' })).toMatchInlineSnapshot(`
          "
          #page2: content
          "
        `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
          page.page1 (client) (page) < {}
          page.page2 (client) (page) < {}
          "
        `)

      fetchRecorder.prune()
      await render(page1.route({ id: '2' }), async ({ waitContent, tale }) => {
        await waitContent('#page1')
        expect(await tale()).toMatchInlineSnapshot(`
            "
            /x/2
              #page1: content
            "
          `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "

          "
        `)
    })

    it('with loader before redirct', async () => {
      const root = createRoot()
      const routes = Routes.create({
        page1: '/x/:id',
        page2: '/y/:id',
      })
      let { redirect } = createNavigation({
        routes,
      })
      const page1 = root
        .lets('page', 'page1', '/x/:id')
        .loader(({ params }) => ({ result: params.id + '-page1' }))
        .with(({ params }) => (params.id === '1' ? redirect('page2', { id: params.id }) : undefined))
        .page(({ data }) => <div id="page1">content {data.result}</div>)
      const page2 = root
        .lets('page', 'page2', 'y/:id')
        .loader(({ params }) => ({ result: params.id + '-page2' }))
        .page(({ data }) => <div id="page2">{data.result}</div>)
      const {
        render,
        fetchPreview,
        fetchesTale,
        fetchRecorder,
        redirect: redirect_fixCicular,
      } = await createTestThings({
        ssr: true,
        points: [root, page1, page2],
        routes,
      })
      redirect = redirect_fixCicular
      await render(page1.route({ id: '1' }), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
            "
            /x/1
              (Empty)

            /y/1
              #page2: 1-page2
            "
          `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
          page.page1 (client) < {"id":"1"}
          page.page2 (client) < {"id":"1"}
          "
        `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1, { id: '1' })).toMatchInlineSnapshot(`
          "
          #page2: 1-page2
          "
        `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
          page.page1 (client) (page) < {}
          page.page2 (client) (page) < {}
          page.page1 (server) < {"id":"1"}
          page.page2 (server) < {"id":"1"}
          "
        `)
    })

    it('with loader after redirct', async () => {
      const root = createRoot()
      const routes = Routes.create({
        page1: '/x/:id',
        page2: '/y/:id',
      })
      let { redirect } = createNavigation({
        routes,
      })
      const page1 = root
        .lets('page', 'page1', '/x/:id')
        .with(({ params }) => (params.id === '1' ? redirect('page2', { id: params.id }) : undefined))
        .loader(({ params }) => ({ result: params.id + '-page1' }))
        .page(({ data }) => <div id="page1">content {data.result}</div>)
      const page2 = root
        .lets('page', 'page2', 'y/:id')
        .loader(({ params }) => ({ result: params.id + '-page2' }))
        .page(({ data }) => <div id="page2">{data.result}</div>)
      const {
        render,
        fetchPreview,
        fetchesTale,
        fetchRecorder,
        redirect: redirect_fixCicular,
      } = await createTestThings({
        ssr: true,
        points: [root, page1, page2],
        routes,
      })
      redirect = redirect_fixCicular
      await render(page1.route({ id: '1' }), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
            "
            /x/1
              (Empty)

            /y/1
              #loading: ...

              #page2: 1-page2
            "
          `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
          page.page2 (client) < {"id":"1"}
          "
        `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1, { id: '1' })).toMatchInlineSnapshot(`
          "
          #page2: 1-page2
          "
        `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
          page.page1 (client) (page) < {}
          page.page2 (client) (page) < {}
          page.page2 (server) < {"id":"1"}
          "
        `)
    })

    it('with thrown redirect: a render-phase throw produces the same real HTTP redirect as a returned task', async () => {
      const root = createRoot()
      const routes = Routes.create({
        page1: '/1',
        page2: '/2',
      })
      let { redirect } = createNavigation({
        routes,
      })
      // THROWN, not returned: the throw happens during render, where no error boundary runs on
      // the server — the discovery render's onError recovers the task instead (throw/return
      // parity), and `handleRedirectTask` turns it into the same HTTP redirect a returned task
      // gets. On the client the mountable's ErrorBoundary catches the throw and its redirect
      // passthrough renders `<Redirect>` — the same hop.
      const page1 = root
        .lets('page', 'page1', '/1')
        .with((): undefined => {
          throw redirect('page2')
        })
        .page(() => <div id="page1">content</div>)
      const page2 = root.lets('page', 'page2', '/2').page(() => <div id="page2">content</div>)
      const {
        render,
        fetchPreview,
        fetchesTale,
        fetchRecorder,
        redirect: redirect_fixCicular,
      } = await createTestThings({
        ssr: true,
        points: [root, page1, page2],
        routes,
      })
      redirect = redirect_fixCicular
      await render(page1.route(), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /1
            (Empty)

          /2
            #page2: content
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1)).toMatchInlineSnapshot(`
        "
        #page2: content
        "
      `)
      const fetchRecords = await fetchRecorder.waitFinishedResults()
      expect(fetchRecords.map((r) => r.response.status)).toMatchInlineSnapshot(`
        [
          302,
          200,
        ]
      `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) (page) < {}
        page.page2 (client) (page) < {}
        "
      `)
    })
  })

  describe('by loader', () => {
    it('the default retryOnMount does not degrade loader redirects — the HTTP redirect still happens', async () => {
      // No `retryOnMount: false` on this root. A loader redirect never depends on how the errored
      // query REPORTS itself to an observer (the optimistic-pending render): the redirect travels
      // through the fetch/prefetch layer during discovery, so the real HTTP redirect happens in
      // both retryOnMount modes. Only rendered-error VISIBILITY (`.error()` vs loading state)
      // differs between the modes — see the suspend tests.
      const root = Point0.lets('root', 'root')
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
      const page1 = root
        .lets('page', 'page1', '/1')
        .loader(() => {
          throw redirect.to('/2')
        })
        .page(() => <div id="page1">content</div>)
      const page2 = root.lets('page', 'page2', '/2').page(() => <div id="page2">content</div>)
      const routes = Routes.create({
        page1: '/1',
        page2: '/2',
      })
      const { render, fetchPreview, fetchRecorder, redirect } = await createTestThings({
        ssr: true,
        routes,
        points: [root, page1, page2],
      })
      await render(page1.route(), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /1
            #loading: ...

          /2
            (Empty)

            #page2: content
          "
        `)
      })

      fetchRecorder.prune()
      expect(await fetchPreview(page1)).toMatchInlineSnapshot(`
        "
        #page2: content
        "
      `)
      // the recorder also sees the nested server loader fetch, so only pin the page request:
      // it answered with the real HTTP redirect
      const fetchRecords = await fetchRecorder.waitFinishedResults()
      expect(fetchRecords[0]?.response.status).toBe(302)
    })

    it('route no params', async () => {
      const root = createRoot()
      const page1 = root
        .lets('page', 'page1', '/1')
        .loader(() => {
          throw redirect.to('/2')
        })
        .page(() => <div id="page1">content</div>)
      const page2 = root.lets('page', 'page2', '/2').page(() => <div id="page2">content</div>)
      const routes = Routes.create({
        page1: '/1',
        page2: '/2',
      })
      const { render, fetchPreview, fetchesTale, fetchRecorder, redirect } = await createTestThings({
        ssr: true,
        routes,
        points: [root, page1, page2],
      })
      await render(page1.route(), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /1
            #loading: ...

          /2
            (Empty)

            #page2: content
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) < {}
        "
      `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1)).toMatchInlineSnapshot(`
        "
        #page2: content
        "
      `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) (page) < {}
        page.page1 (server) < {}
        page.page2 (client) (page) < {}
        "
      `)
    })

    it('route params and search', async () => {
      const root = createRoot()
      const page1 = root
        .lets('page', 'page1', '/x/:id')
        .loader(() => {
          throw redirect('page2', { id: '222', '?': { q: 'qwe' } })
        })
        .page(({ params, location }) => (
          <div id="page1">
            {params.id}, {location.search.q as string}
          </div>
        ))
      const page2 = root.lets('page', 'page2', '/y/:id').page(({ params, location }) => (
        <div id="page2">
          {params.id}, {location.search.q as string}
        </div>
      ))
      const routes = Routes.create({
        page1: '/x/:id',
        page2: '/y/:id',
      })
      const { render, fetchPreview, fetchesTale, fetchRecorder, redirect } = await createTestThings({
        ssr: true,
        routes,
        points: [root, page1, page2],
      })
      await render(page1.route({ id: '111', '?': { q: 'zxc' } }), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /x/111?q=zxc
            #loading: ...

          /y/222?q=qwe
            (Empty)

            #page2: 222, qwe
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) < {"q":"zxc","id":"111"}
        "
      `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1, { id: '111', '?': { q: 'zxc' } })).toMatchInlineSnapshot(`
        "
        #page2: 222, qwe
        "
      `)
      // you can notice that in input on redirect we have no search, but we pass it in location
      // and below inside {} you see query key input, which has only prepared to parse search params
      // it is only testing purposes, we have separate tests on it in search.test.tsx
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) (page) < {}
        page.page1 (server) < {"q":"zxc","id":"111"}
        page.page2 (client) (page) < {}
        "
      `)
    })
  })

  describe('by ctx', () => {
    it('route no params (return)', async () => {
      const root = createRoot()
      const routes = Routes.create({
        page1: '/1',
        page2: '/2',
      })
      // this ifx never needed in usual case, only inside internal tests
      const { redirect: redirect_fixCicular } = createNavigation({
        routes,
      })
      const page1 = root
        .lets('page', 'page1', '/1')
        .ctx(() => {
          return redirect_fixCicular('page2')
        })
        .loader() // without loaders on page, it will never have server request, so it will never have ctx call, so we need add .loader()
        .page(() => <div id="page1">content</div>)
      const page2 = root.lets('page', 'page2', '/2').page(() => <div id="page2">content</div>)
      const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
        ssr: true,
        routes,
        points: [root, page1, page2],
      })
      await render(page1.route(), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /1
            #loading: ...

          /2
            (Empty)

            #page2: content
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) < {}
        "
      `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1)).toMatchInlineSnapshot(`
        "
        #page2: content
        "
      `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) (page) < {}
        page.page1 (server) < {}
        page.page2 (client) (page) < {}
        "
      `)
    })

    it('route params and search (throw)', async () => {
      const root = createRoot()
      const page1 = root
        .lets('page', 'page1', '/x/:id')
        .ctx(() => {
          throw redirect('page2', { id: '222', '?': { q: 'qwe' } })
        })
        .loader()
        .page(({ params, location }) => (
          <div id="page1">
            {params.id}, {location.search.q as string}
          </div>
        ))
      const page2 = root.lets('page', 'page2', '/y/:id').page(({ params, location }) => (
        <div id="page2">
          {params.id}, {location.search.q as string}
        </div>
      ))
      const routes = Routes.create({
        page1: '/x/:id',
        page2: '/y/:id',
      })
      const { render, fetchPreview, fetchesTale, fetchRecorder, redirect } = await createTestThings({
        ssr: true,
        routes,
        points: [root, page1, page2],
      })
      await render(page1.route({ id: '111', '?': { q: 'zxc' } }), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /x/111?q=zxc
            #loading: ...

          /y/222?q=qwe
            (Empty)

            #page2: 222, qwe
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) < {"q":"zxc","id":"111"}
        "
      `)

      fetchRecorder.prune()
      expect(await fetchPreview(page1, { id: '111', '?': { q: 'zxc' } })).toMatchInlineSnapshot(`
        "
        #page2: 222, qwe
        "
      `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.page1 (client) (page) < {}
        page.page1 (server) < {"q":"zxc","id":"111"}
        page.page2 (client) (page) < {}
        "
      `)
    })
  })

  describe('by clientLoader', () => {
    it('route no params', async () => {
      const root = createRoot()
      const page1 = root
        .lets('page', 'page1', '/1')
        .clientLoader(() => {
          throw redirect('page2')
        })
        .page(() => <div id="page1">content</div>)
      const page2 = root.lets('page', 'page2', '/2').page(() => <div id="page2">content</div>)
      const routes = Routes.create({
        page1: '/1',
        page2: '/2',
      })
      const { render, fetchesTale, redirect } = await createTestThings({
        ssr: true,
        routes,
        points: [root, page1, page2],
      })
      await render(page1.route(), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /1
            #loading: ...

          /2
            (Empty)

            #page2: content
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    })

    it('route params and search', async () => {
      const root = createRoot()
      const page1 = root
        .lets('page', 'page1', '/x/:id')
        .clientLoader(() => {
          throw redirect('page2', { id: '222', '?': { q: 'qwe' } })
        })
        .page(({ params, location }) => (
          <div id="page1">
            {params.id}, {location.search.q as string}
          </div>
        ))
      const page2 = root.lets('page', 'page2', '/y/:id').page(({ params, location }) => (
        <div id="page2">
          {params.id}, {location.search.q as string}
        </div>
      ))
      const routes = Routes.create({
        page1: '/x/:id',
        page2: '/y/:id',
      })
      const { render, fetchesTale, redirect } = await createTestThings({
        ssr: true,
        routes,
        points: [root, page1, page2],
      })
      await render(page1.route({ id: '111', '?': { q: 'zxc' } }), async ({ waitContent, tale }) => {
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /x/111?q=zxc
            #loading: ...

          /y/222?q=qwe
            (Empty)

            #page2: 222, qwe
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    })
  })

  describe('by mutation', () => {
    it('route params and search from server response', async () => {
      const root = createRoot()
      const mutation = root
        .lets('mutation', 'go')
        .loader(() => {
          throw redirect('page2', { id: '222', '?': { q: 'qwe' } })
        })
        .mutation()
      const page1 = root.lets('page', 'page1', '/x').page(() => {
        const go = mutation.useMutation()
        return (
          <div id="page1">
            <button id="mutate" onClick={() => go.mutate()}>
              Mutate
            </button>
          </div>
        )
      })
      const page2 = root.lets('page', 'page2', '/y/:id').page(({ params, location }) => (
        <div id="page2">
          {params.id}, {location.search.q as string}
        </div>
      ))
      const routes = Routes.create({
        page1: '/x',
        page2: '/y/:id',
      })
      const { render, fetchesTale, redirect } = await createTestThings({
        ssr: true,
        routes,
        points: [root, mutation, page1, page2],
      })
      await render(page1.route(), async ({ waitContent, tale, click }) => {
        await waitContent('#page1')
        await click('#mutate')
        await waitContent('#page2')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /x
            #page1:
              #mutate: Mutate

          /y/222?q=qwe
            #page2: 222, qwe
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        mutation.go (client) < {}
        "
      `)
    })

    it('respects redirect navigation options', async () => {
      const events: string[] = []
      const root = createRoot()
      const mutation = root
        .lets('mutation', 'go')
        .clientLoader(() => {
          throw redirect.to('/2', {
            before: () => {
              events.push('before')
            },
            after: () => {
              events.push('after')
            },
          })
        })
        .mutation()
      const page1 = root.lets('page', 'page1', '/1').page(() => {
        const go = mutation.useMutation()
        return (
          <div id="page1">
            <button id="mutate" onClick={() => go.mutate()}>
              Mutate
            </button>
          </div>
        )
      })
      const page2 = root.lets('page', 'page2', '/2').page(() => <div id="page2">content</div>)
      const routes = Routes.create({
        page1: '/1',
        page2: '/2',
      })
      const { render, fetchesTale, redirect } = await createTestThings({
        ssr: true,
        routes,
        points: [root, mutation, page1, page2],
      })
      await render(page1.route(), async ({ waitContent, tale, click }) => {
        await waitContent('#page1')
        await click('#mutate')
        await waitContent('#page2')
        expect(events).toEqual(['before', 'after'])
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /1
            #page1:
              #mutate: Mutate

          /2
            #page2: content
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    })
  })
})

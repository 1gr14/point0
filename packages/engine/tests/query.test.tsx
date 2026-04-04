import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import z from 'zod'
import { createTestThings, waitReturn } from './utils/internal-testing.js'

describe('query', () => {
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

  it.concurrent(
    'simple',
    async () => {
      const root = createRoot()
      const q = root
        .lets('query', 'test')
        .loader(() => ({ x: 1 }))
        .query()
      const page = root.lets('page', 'home', '/').page(() => {
        const query = q.useQuery()
        return (
          <div id="page">
            <div id="data">{query.data?.x ?? 'nothing'}</div>
          </div>
        )
      })

      const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
        ssr: true,
        points: [root, q, page],
      })
      await render(page.route(), async ({ waitContent, tale }) => {
        await waitContent('#data')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page:
              #data: nothing

            #page:
              #data: 1
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        query.test (client) < {}
        "
      `)
      fetchRecorder.prune()
      expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page:
          #data: 1
        "
      `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.home (client) (page) < {}
        query.test (server) < {}
        "
      `)
    },
    { retry: 3 },
  )

  it.concurrent(
    'with page loader and query loader',
    async () => {
      const root = createRoot()
      const q = root
        .lets('query', 'test')
        .loader(async () => await waitReturn({ x: 1 }))
        .query()
      const page = root
        .lets('page', 'home', '/')
        .loader(async () => await waitReturn({ y: 2 }))
        .page(({ data }) => {
          const query = q.useQuery()
          return (
            <div id="page">
              q={query.data?.x ?? 'nothing'} y={data.y}
            </div>
          )
        })

      const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
      await render(page.route(), async ({ waitContent, tale }) => {
        await waitContent('#page')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #loading: ...

            #page: q=nothing y=2

            #page: q=1 y=2
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.home (client) < {}
        query.test (client) < {}
        "
      `)
      expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: q=1 y=2
        "
      `)
    },
    { retry: 3 },
  )

  it.concurrent(
    'with clientLoader',
    async () => {
      const root = createRoot()
      const q = root
        .lets('query', 'test')
        .clientLoader(() => ({ y: 2 }))
        .query()
      const page = root.lets('page', 'home', '/').page(() => {
        const query = q.useQuery()
        return <div id="page">y={query.data?.y ?? 'nothing'}</div>
      })

      const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
      await render(page.route(), async ({ waitContent, tale }) => {
        await waitContent('#page')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page: y=nothing

            #page: y=2
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
      expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: y=nothing
        "
      `)
    },
    { retry: 3 },
  )

  it.concurrent(
    'with loader and clientLoader',
    async () => {
      const root = createRoot()
      const q = root
        .lets('query', 'test')
        .loader(() => ({ x: 1 }))
        .clientLoader(({ data }) => ({ y: 2, ...data }))
        .query()
      const page = root.lets('page', 'home', '/').page(() => {
        const query = q.useQuery()
        return (
          <div id="page">
            q={query.data?.x ?? 'nothing'} y={query.data?.y ?? 'nothing'}
          </div>
        )
      })

      const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
      await render(page.route(), async ({ waitContent, tale }) => {
        await waitContent('#page')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page: q=nothing y=nothing

            #page: q=1 y=2
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        query.test (client) < {}
        "
      `)
      expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: q=nothing y=nothing
        "
      `)
    },
    { retry: 3 },
  )

  it.concurrent(
    'with input and loader',
    async () => {
      const root = createRoot()
      const q = root
        .lets('query', 'test')
        .input(z.object({ y: z.number() }))
        .loader(({ input }) => ({ x: input.y * 2 }))
        .query()
      const page = root.lets('page', 'home', '/').page(() => {
        const query = q.useQuery({ y: 123 })
        return <div id="page">x={query.data?.x ?? 'nothing'}</div>
      })

      const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
      await render(page.route(), async ({ waitContent, tale }) => {
        await waitContent('#page')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page: x=nothing

            #page: x=246
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        query.test (client) < {"y":123}
        "
      `)
      expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=246
        "
      `)
    },
    { retry: 3 },
  )

  it.concurrent(
    'with input and clientLoader',
    async () => {
      const root = createRoot()
      const q = root
        .lets('query', 'test')
        .sharedInput(z.object({ y: z.number() }))
        .clientLoader(({ input }) => ({ x: input.y * 2 }))
        .query()
      const page = root.lets('page', 'home', '/').page(() => {
        const query = q.useQuery({ y: 123 })
        return <div id="page">x={query.data?.x ?? 'nothing'}</div>
      })

      const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
      await render(page.route(), async ({ waitContent, tale }) => {
        await waitContent('#page')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page: x=nothing

            #page: x=246
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
      expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=nothing
        "
      `)
    },
    { retry: 3 },
  )

  it.concurrent(
    'with input and clientLoader and loader',
    async () => {
      const root = createRoot()
      const q = root
        .lets('query', 'test')
        .sharedInput(z.object({ y: z.number() }))
        .loader(() => ({ z: 3 }))
        .clientLoader(({ input }) => ({ x: input.y * 2 }))
        .query()
      const page = root.lets('page', 'home', '/').page(() => {
        const query = q.useQuery({ y: 123 })
        return <div id="page">x={query.data?.x ?? 'nothing'}</div>
      })

      const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
      await render(page.route(), async ({ waitContent, tale }) => {
        await waitContent('#page')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page: x=nothing

            #page: x=246
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        query.test (client) < {"y":123}
        "
      `)
      expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=nothing
        "
      `)
    },
    { retry: 3 },
  )

  it(
    'type error when schema, params or body schema provided',
    () => {
      const root = createRoot()
      // const baseParams = root
      //   .lets('base', 'baseWithParams')
      //   .params(z.object({ id: z.string() }))
      //   .base()
      const baseSearch = root
        .lets('base', 'baseWithSearch')
        .search(z.object({ id: z.string() }))
        .base()
      const baseBody = root
        .lets('base', 'baseWithBody')
        .body(z.object({ id: z.string() }))
        .base()
      // baseParams
      //   .lets('query', 'test')
      //   // @ts-expect-error - params schema not allowed for query
      //   .loader(() => ({ x: 1 }))
      //   .query()
      baseSearch
        .lets('query', 'test')
        // @ts-expect-error - search schema not allowed for query
        .loader(() => ({ x: 1 }))
        .query()
      baseBody
        .lets('query', 'test')
        // @ts-expect-error - body schema not allowed for query
        .loader(() => ({ x: 1 }))
        .query()
    },
    { retry: 3 },
  )
})

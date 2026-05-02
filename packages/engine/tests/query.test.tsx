import { describe, expect, it } from 'bun:test'
import { getQueryPredicate, Point0 } from '@point0/core'
import { QueryClient } from '@tanstack/react-query'
import z from 'zod'
import { createTestThings, waitReturn } from './utils/internal-testing.js'
import { useState, useEffect } from 'react'

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

  it.concurrent(
    'can be not enabled',
    async () => {
      const root = createRoot()
      const q = root
        .lets('query', 'test')
        .input(z.object({ x: z.number() }))
        .loader(({ input }) => ({ y: input.x * 2 }))
        .query()
      const page = root.lets('page', 'home', '/').page(() => {
        const [x, setX] = useState<number>(0)
        useEffect(() => {
          setTimeout(() => {
            setX(123)
          }, 100)
        }, [])
        const query = q.useQuery({ x }, { enabled: !!x })
        return (
          <div id="page">
            x={x}, y={query.data?.y ?? 'nothing'}
          </div>
        )
      })

      const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
        ssr: true,
        points: [root, q, page],
      })
      await render(page.route(), async ({ waitContent, tale }) => {
        await waitContent('#page')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page: x=0, y=nothing

            #page: x=123, y=nothing

            #page: x=123, y=246
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        query.test (client) < {"x":123}
        "
      `)

      fetchRecorder.prune()
      expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=0, y=nothing
        "
      `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.home (client) (page) < {}
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

  describe('helpers', () => {
    it.concurrent('query helper methods', async () => {
      const root = createRoot()
      const q = root
        .lets('query', 'helpers')
        .sharedInput(z.object({ id: z.number().optional() }))
        .clientLoader(({ input }) => ({ value: (input.id ?? 0) + 1 }))
        .query()
      const queryClient = new QueryClient()
      const input = { id: 2 }
      const options = { queryClient, mode: 'client' as const }

      const fetched = await q.fetchQuery(input, undefined, options)
      expect(fetched).toEqual({ value: 3 })
      expect(q.getQueryData(input, options)).toEqual({ value: 3 })

      await q.prefetchQuery(input, undefined, options)
      expect(await q.ensureQueryData(input, undefined, options)).toEqual({ value: 3 })

      const setResult = q.setQueryData(input, () => ({ value: 10 }), undefined, options)
      expect(setResult).toEqual({ value: 10 })
      expect(q.getQueryData(input, options)).toEqual({ value: 10 })

      const cachedQuery = q.getQueryCache(input, options)
      expect(cachedQuery?.state.data).toEqual({ value: 10 })
      const cachedQueries = q.getQueriesCache(true, options)
      expect(cachedQueries.length).toBe(1)
      expect(cachedQueries[0]?.state.data).toEqual({ value: 10 })
      expect(q.getQueryState(input, options)?.data).toEqual({ value: 10 })

      await q.refetchQuery(input, undefined, options)
      expect(q.getQueryData(input, options)).toEqual({ value: 3 })
      await q.cancelQuery(input, undefined, options)
      await q.invalidateQuery(input, undefined, options)
      expect(q.getQueryState(input, options)?.isInvalidated).toBe(true)
      await q.resetQuery(input, undefined, options)
      expect(q.getQueryData(input, options)).toBeUndefined()

      q.removeQuery(input, options)
      expect(q.getQueryData(input, options)).toBeUndefined()
      expect(q.getQueriesCache(true, options)).toEqual([])
    })

    it.concurrent('getQueryPredicate filters query cache by tags', async () => {
      const root = createRoot()
      const qa = root
        .lets('query', 'helpers-tag-a')
        .tag('my-tag-a')
        .clientLoader(() => ({ value: 'A' }))
        .query()
      const qb = root
        .lets('query', 'helpers-tag-b')
        .tag('my-tag-b')
        .clientLoader(() => ({ value: 'B' }))
        .query()
      const queryClient = new QueryClient()

      await qa.fetchQuery(undefined, undefined, { queryClient, mode: 'client' })
      await qb.fetchQuery(undefined, undefined, { queryClient, mode: 'client' })

      const tagAQueries = queryClient.getQueryCache().findAll({
        predicate: getQueryPredicate({ tags: 'my-tag-a' }),
      })
      expect(tagAQueries.length).toBe(1)
      expect(tagAQueries[0]?.state.data).toEqual({ value: 'A' })

      const tagBQueries = queryClient.getQueryCache().findAll({
        predicate: getQueryPredicate({ tags: ['my-tag-b'] }),
      })
      expect(tagBQueries.length).toBe(1)
      expect(tagBQueries[0]?.state.data).toEqual({ value: 'B' })

      const scopedByName = queryClient.getQueryCache().findAll({
        predicate: getQueryPredicate({ type: 'query', name: 'helpers-tag-a', scope: 'root', mode: 'client' }),
      })
      expect(scopedByName.length).toBe(1)
      expect(scopedByName[0]?.state.data).toEqual({ value: 'A' })
    })
  })
})

import { describe, expect, it } from 'bun:test'
import { ErrorPoint0, getQueryPredicate, Point0, type AnyEventerEvent } from '@point0/core'
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

  it(
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

  it(
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

  it(
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

  it(
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

  it(
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

  it(
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
    it('query helper methods', async () => {
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

    it('invalidateQuery(true) and predicate invalidate across inputs', async () => {
      const root = createRoot()
      const q = root
        .lets('query', 'helpers-invalidate-all')
        .sharedInput(z.object({ id: z.number() }))
        .clientLoader(({ input }) => ({ value: input.id }))
        .query()
      const queryClient = new QueryClient()
      const options = { queryClient, mode: 'client' as const }

      await q.fetchQuery({ id: 1 }, undefined, options)
      await q.fetchQuery({ id: 2 }, undefined, options)
      await q.fetchQuery({ id: 3 }, undefined, options)
      expect(q.getQueriesCache(true, options).length).toBe(3)

      // `true` → every entry of this query, regardless of input
      await q.invalidateQuery(true, undefined, options)
      expect(q.getQueryState({ id: 1 }, options)?.isInvalidated).toBe(true)
      expect(q.getQueryState({ id: 2 }, options)?.isInvalidated).toBe(true)
      expect(q.getQueryState({ id: 3 }, options)?.isInvalidated).toBe(true)

      // refetch all to clear the invalidated flag, then target one input via predicate
      await q.fetchQuery({ id: 1 }, undefined, options)
      await q.fetchQuery({ id: 2 }, undefined, options)
      await q.fetchQuery({ id: 3 }, undefined, options)
      await q.invalidateQuery((i) => i.id === 2, undefined, options)
      expect(q.getQueryState({ id: 1 }, options)?.isInvalidated).toBe(false)
      expect(q.getQueryState({ id: 2 }, options)?.isInvalidated).toBe(true)
      expect(q.getQueryState({ id: 3 }, options)?.isInvalidated).toBe(false)

      // exact input still works unchanged
      await q.fetchQuery({ id: 2 }, undefined, options)
      await q.invalidateQuery({ id: 1 }, undefined, options)
      expect(q.getQueryState({ id: 1 }, options)?.isInvalidated).toBe(true)
      expect(q.getQueryState({ id: 2 }, options)?.isInvalidated).toBe(false)
    })

    it('removeQuery / resetQuery accept a predicate and true across inputs', async () => {
      const root = createRoot()
      const q = root
        .lets('query', 'helpers-remove-all')
        .sharedInput(z.object({ id: z.number() }))
        .clientLoader(({ input }) => ({ value: input.id }))
        .query()
      const queryClient = new QueryClient()
      const options = { queryClient, mode: 'client' as const }

      const seed = async () => {
        await q.fetchQuery({ id: 1 }, undefined, options)
        await q.fetchQuery({ id: 2 }, undefined, options)
        await q.fetchQuery({ id: 3 }, undefined, options)
      }

      // predicate removes only matching entries
      await seed()
      q.removeQuery((i) => i.id === 2, options)
      expect(q.getQueriesCache(true, options).length).toBe(2)
      expect(q.getQueryData({ id: 2 }, options)).toBeUndefined()
      expect(q.getQueryData({ id: 1 }, options)).toEqual({ value: 1 })

      // true removes every entry of this query
      await seed()
      q.removeQuery(true, options)
      expect(q.getQueriesCache(true, options)).toEqual([])

      // resetQuery(true) clears data for every entry
      await seed()
      await q.resetQuery(true, undefined, options)
      expect(q.getQueryData({ id: 1 }, options)).toBeUndefined()
      expect(q.getQueryData({ id: 2 }, options)).toBeUndefined()
      expect(q.getQueryData({ id: 3 }, options)).toBeUndefined()
    })

    it('getQueryPredicate filters query cache by tags', async () => {
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

      await qa.fetchQuery(undefined, undefined, { queryClient })
      await qb.fetchQuery(undefined, undefined, { queryClient })

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

      // `id` is exposed on every point as `scope:type:name`, and predicates accept it
      expect(qa.id).toBe('root:query:helpers-tag-a')
      const byId = queryClient.getQueryCache().findAll({
        predicate: getQueryPredicate({ id: qa.id }),
      })
      expect(byId.length).toBe(1)
      expect(byId[0]?.state.data).toEqual({ value: 'A' })
    })
  })

  it(
    'a cancelled in-flight server query emits pointQueryCancelled, not pointQueryError / error',
    async () => {
      // Block the server loader so the client query stays in-flight while we cancel it — the navigate-away / unmount
      // shape that produced spurious Sentry "AbortError" noise. The loader then throws on release so the query function
      // is guaranteed to reject even if the in-process fetch does not honour the abort: by then the signal is already
      // aborted, so the catch must classify it as a cancellation, not an error.
      let release: (() => void) | undefined
      const blocked = new Promise<void>((resolve) => {
        release = resolve
      })
      const events: AnyEventerEvent<ErrorPoint0>[] = []
      const errorEvents: AnyEventerEvent<ErrorPoint0>[] = []
      const root = Point0.lets('root', 'root')
        .queryOptions({ retry: false })
        .on('*', (e) => {
          events.push(e)
        })
        .on('error', (e) => {
          errorEvents.push(e)
        })
        .root()
      const page = root
        .lets('page', 'home', '/')
        .loader(async () => {
          await blocked
          throw new ErrorPoint0('should be swallowed by the cancellation')
        })
        .page(() => <div id="page" />)
      const { render } = await createTestThings({ ssr: false, points: [root, page] })
      await render(page.route(), async (state) => {
        const has = (name: string) => events.some((e) => e.name === name)
        const waitUntil = async (cond: () => boolean) => {
          for (let i = 0; i < 150 && !cond(); i++) {
            await waitReturn(10)
          }
        }
        // wait until the server query's fetch is in flight, then cancel it (what TanStack does on unmount)
        await waitUntil(() => has('pointFetchServerStart'))
        await state.queryClient.cancelQueries()
        release?.()
        await waitUntil(() => has('pointQueryCancelled') || has('pointQueryError'))

        // The client query settles as the dedicated cancelled outcome, NOT pointQueryError — so `.on('error')` (which
        // fans out to pointQueryError) never reports the cancellation, which is the whole bug. (The loader is forced to
        // throw only because the in-process fetch ignores the abort signal and would otherwise resolve; that produces an
        // unrelated server-side engineFetchError, a harness artifact we deliberately don't assert on.)
        expect(has('pointQueryCancelled')).toBe(true)
        expect(has('pointQueryError')).toBe(false)
        expect(errorEvents.map((e) => e.name)).not.toContain('pointQueryError')
      })
    },
    { retry: 3 },
  )
})

import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import { QueryClient } from '@tanstack/react-query'
import z from 'zod'
import { createTestThings, waitReturn } from './utils/internal-testing.js'

describe('infinityQuery', () => {
  const items: Array<{ id: number; name: string }> = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
    { id: 4, name: 'Item 4' },
    { id: 5, name: 'Item 5' },
  ]
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

  it.concurrent('simple', async () => {
    const root = createRoot()
    const q = root
      .lets('infiniteQuery', 'test')
      .input(z.object({ cursor: z.number().optional() }))
      .loader(({ input }) => {
        const cursor = input.cursor ?? 0
        const nextCursor = cursor + 2
        return {
          items: items.slice(cursor, cursor + 2),
          nextCursor: nextCursor < items.length ? nextCursor : undefined,
        }
      })
      .infiniteQuery({
        pageParamFromInput: {
          get: ({ input, get }) => get(input, 'cursor'),
          set: ({ input, value, set }) => set(input, 'cursor', value),
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useInfiniteQuery()
      const itms = query.data?.pages.flatMap((page) => page.items) ?? []
      const nextCursor = query.data?.pages.at(-1)?.nextCursor
      if (query.isLoading) {
        return <div id="loading">...</div>
      }
      return (
        <div id="page">
          {itms.map((item) => (
            <div key={item.id}>{item.name}</div>
          ))}
          {nextCursor && (
            <button
              id="more"
              onClick={() => {
                void query.fetchNextPage()
              }}
            >
              Load more
            </button>
          )}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
      ssr: true,
      points: [root, q, page],
    })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#more')
      await click('#more')
      await waitContent('Item 4')
      await click('#more')
      await waitContent('Item 5')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #loading: ...

            #page:
              div: Item 1
              div: Item 2
              #more: Load more

            #page:
              div: Item 1
              div: Item 2
              div: Item 3
              div: Item 4
              #more: Load more

            #page:
              div: Item 1
              div: Item 2
              div: Item 3
              div: Item 4
              div: Item 5
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        infiniteQuery.test (client) < {"cursor":0}
        infiniteQuery.test (client) < {"cursor":2}
        infiniteQuery.test (client) < {"cursor":4}
        "
      `)
    fetchRecorder.prune()
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page:
          div: Item 1
          div: Item 2
          #more: Load more
        "
      `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.home (client) (page) < {}
        infiniteQuery.test (server) < {"cursor":0}
        "
      `)
  })

  it.concurrent('with loader and clientLoader', async () => {
    const root = createRoot()
    const q = root
      .lets('infiniteQuery', 'test')
      .input(z.object({ cursor: z.number().optional() }))
      .loader(({ input }) => {
        const cursor = input.cursor ?? 0
        const nextCursor = cursor + 2
        return {
          items: items.slice(cursor, cursor + 2),
          nextCursor: nextCursor < items.length ? nextCursor : undefined,
        }
      })
      .clientLoader(({ data }) => ({
        ...data,
        items: data.items.map((item) => ({ ...item, name: item.name.toUpperCase() })),
      }))
      .infiniteQuery({
        pageParamFromInput: 'cursor',
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useInfiniteQuery()
      const itms = query.data?.pages.flatMap((page) => page.items) ?? []
      const nextCursor = query.data?.pages.at(-1)?.nextCursor
      if (query.isLoading) {
        return <div id="loading">...</div>
      }
      return (
        <div id="page">
          {itms.map((item) => (
            <div key={item.id}>{item.name}</div>
          ))}
          {nextCursor && (
            <button
              id="more"
              onClick={() => {
                void query.fetchNextPage()
              }}
            >
              Load more
            </button>
          )}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
      ssr: true,
      points: [root, q, page],
    })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#more')
      await click('#more')
      await waitContent('ITEM 4')
      await click('#more')
      await waitContent('ITEM 5')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #loading: ...

            #page:
              div: ITEM 1
              div: ITEM 2
              #more: Load more

            #page:
              div: ITEM 1
              div: ITEM 2
              div: ITEM 3
              div: ITEM 4
              #more: Load more

            #page:
              div: ITEM 1
              div: ITEM 2
              div: ITEM 3
              div: ITEM 4
              div: ITEM 5
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        infiniteQuery.test (client) < {"cursor":0}
        infiniteQuery.test (client) < {"cursor":2}
        infiniteQuery.test (client) < {"cursor":4}
        "
      `)
    fetchRecorder.prune()
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #loading: ...
        "
      `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.home (client) (page) < {}
        infiniteQuery.test (server) < {"cursor":0}
        "
      `)
  })

  it.concurrent('with page loader and query loader', async () => {
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
  })

  it.concurrent('with clientLoader', async () => {
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
  })

  it.concurrent('with loader and clientLoader', async () => {
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
  })

  it.concurrent('with input and loader', async () => {
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
  })

  it.concurrent('with input and clientLoader', async () => {
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
  })

  it.concurrent('with input and clientLoader and loader', async () => {
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
  })

  describe('helpers', () => {
    it.concurrent('infinite query helper methods', async () => {
      const root = createRoot()
      const q = root
        .lets('infiniteQuery', 'helpers')
        .sharedInput(z.object({ cursor: z.number().optional() }))
        .clientLoader(({ input }) => {
          const cursor = input.cursor ?? 0
          return {
            items: [{ id: cursor + 1, name: `Item ${cursor + 1}` }],
            nextCursor: cursor + 1,
          }
        })
        .infiniteQuery({
          pageParamFromInput: 'cursor',
          getNextPageParam: (lastPage) => lastPage.nextCursor,
          initialPageParam: 0,
        })
      const queryClient = new QueryClient()
      const input = { cursor: 0 }
      const options = { queryClient, mode: 'client' as const }

      const fetched = await q.fetchInfiniteQuery(input, undefined, options)
      expect(fetched.pages).toEqual([{ items: [{ id: 1, name: 'Item 1' }], nextCursor: 1 }])
      expect(fetched.pageParams).toEqual([0])
      expect(q.getInfiniteQueryData(input, options)).toEqual(fetched)

      await q.prefetchInfiniteQuery(input, undefined, options)
      expect(await q.ensureInfiniteQueryData(input, undefined, options)).toEqual(fetched)

      q.setInfiniteQueryData(
        input,
        ((old: any) => ({
          pages: [
            ...old.pages,
            {
              items: [{ id: 99, name: 'Item 99' }],
              nextCursor: undefined,
            },
          ],
          pageParams: [...old.pageParams, 99],
        })) as any,
        undefined,
        options,
      )

      const updated = q.getInfiniteQueryData(input, options) as any
      expect(updated.pages).toEqual([
        { items: [{ id: 1, name: 'Item 1' }], nextCursor: 1 },
        { items: [{ id: 99, name: 'Item 99' }], nextCursor: undefined },
      ])
      expect(updated.pageParams).toEqual([0, 99])
      expect(q.getInfiniteQueryCache(input, options)?.state.data).toEqual(updated)
      const allCached = q.getInfiniteQueriesCache(true, options)
      expect(allCached.length).toBe(1)
      expect((q.getInfiniteQueryState(input, options) as any)?.data).toEqual(updated)

      await q.refetchInfiniteQuery(input, undefined, options)
      await q.cancelInfiniteQuery(input, undefined, options)
      await q.invalidateInfiniteQuery(input, undefined, options)
      expect((q.getInfiniteQueryState(input, options) as any)?.isInvalidated).toBe(true)
      await q.resetInfiniteQuery(input, undefined, options)
      expect(q.getInfiniteQueryData(input, options)).toBeUndefined()

      q.removeInfiniteQuery(input, options)
      expect(q.getInfiniteQueryData(input, options)).toBeUndefined()
      expect(q.getInfiniteQueriesCache(true, options)).toEqual([])
    })
  })
})

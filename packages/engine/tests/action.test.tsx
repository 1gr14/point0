import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import z from 'zod'
import { createTestThings } from './utils/internal-testing.js'

describe('action', () => {
  const createRoot = () =>
    Point0.lets('root', 'root')
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

  describe.concurrent('query', () => {
    it.concurrent('simple', async () => {
      const root = createRoot()
      const q = root
        .lets('action', 'test')
        .loader(() => ({ x: 1 }))
        .query()
        .action()
      const page = root.lets('page', 'home', '/').page(() => {
        const query = q.useQuery()
        return (
          <div id="page">
            <div id="data">{query.data?.x ?? 'nothing'}</div>
          </div>
        )
      })

      const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
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
        action.test (client) < {}
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
        action.test (server) < {}
        "
      `)
    })

    it.concurrent('with clientLoader', async () => {
      const root = createRoot()
      const q = root
        .lets('action', 'test')
        .clientLoader(() => ({ y: 2 }))
        .query()
        .action()
      const page = root.lets('page', 'home', '/').page(() => {
        const query = q.useQuery()
        return <div id="page">y={query.data?.y ?? 'nothing'}</div>
      })

      const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, q, page] })
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
        .lets('action', 'test')
        .loader(() => ({ x: 1 }))
        .clientLoader(({ data }) => ({ y: 2, ...data }))
        .query()
        .action()
      const page = root.lets('page', 'home', '/').page(() => {
        const query = q.useQuery()
        return (
          <div id="page">
            q={query.data?.x ?? 'nothing'} y={query.data?.y ?? 'nothing'}
          </div>
        )
      })

      const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, q, page] })
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
        action.test (client) < {}
        "
      `)
      expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: q=nothing y=nothing
        "
      `)
    })
  })

  describe.concurrent('infinite query', () => {
    const items: Array<{ id: number; name: string }> = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
      { id: 4, name: 'Item 4' },
      { id: 5, name: 'Item 5' },
    ]

    it.concurrent('simple', async () => {
      const root = createRoot()
      const q = root
        .lets('action', 'test')
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
          pageParamFromInput: 'cursor',
          getNextPageParam: (lastPage) => lastPage.nextCursor,
          initialPageParam: 0,
        })
        .action()
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

      const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({ points: [root, q, page] })
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
          action.test (client) < {"cursor":0}
          action.test (client) < {"cursor":2}
          action.test (client) < {"cursor":4}
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
          action.test (server) < {"cursor":0}
          "
        `)
    })

    it.concurrent('with loader and clientLoader', async () => {
      const root = createRoot()
      const q = root
        .lets('action', 'test')
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
        .action()
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

      const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({ points: [root, q, page] })
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
          action.test (client) < {"cursor":0}
          action.test (client) < {"cursor":2}
          action.test (client) < {"cursor":4}
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
          action.test (server) < {"cursor":0}
          "
        `)
    })

    // it.concurrent('as query', async () => {
    //   const root = createRoot()
    //   const q = root
    //     .lets('action', 'test')
    //     .input(z.object({ cursor: z.number().optional() }))
    //     .loader(({ input }) => {
    //       const cursor = input.cursor ?? 0
    //       const nextCursor = cursor + 2
    //       return {
    //         items: items.slice(cursor, cursor + 2),
    //         nextCursor: nextCursor < items.length ? nextCursor : undefined,
    //       }
    //     })
    //     .infiniteQuery({
    //       pageParamFromInput: 'cursor',
    //       getNextPageParam: (lastPage) => lastPage.nextCursor,
    //       initialPageParam: 0,
    //     })
    //     .action()
    //   const page = root.lets('page', 'home', '/').page(() => {
    //     const query = q.useQuery()
    //     const itms = query.data?.items ?? []
    //     if (query.isLoading) {
    //       return <div id="loading">...</div>
    //     }
    //     return (
    //       <div id="page">
    //         {itms.map((item) => (
    //           <div key={item.id}>{item.name}</div>
    //         ))}
    //       </div>
    //     )
    //   })

    //   const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({ points: [root, q, page] })
    //   await render(page.route(), async ({ waitContent, tale }) => {
    //     await waitContent('#page')
    //     expect(await tale()).toMatchInlineSnapshot(`
    //         "
    //         /
    //           #loading: ...

    //           #page:
    //             div: Item 1
    //             div: Item 2
    //         "
    //       `)
    //   })
    //   expect(await fetchesTale()).toMatchInlineSnapshot(`
    //       "
    //       action.test (client) < {}
    //       "
    //     `)
    //   fetchRecorder.prune()
    //   expect(await fetchPreview(page)).toMatchInlineSnapshot(`
    //       "
    //       #page:
    //         div: Item 1
    //         div: Item 2
    //       "
    //     `)
    //   expect(await fetchesTale()).toMatchInlineSnapshot(`
    //       "
    //       page.home (client) (page) < {}
    //       action.test (server) < {}
    //       "
    //     `)
    // })
  })

  describe.concurrent('mutation', () => {
    it.concurrent('simple', async () => {
      const root = createRoot()
      const q = root
        .lets('action', 'test')
        .loader(() => ({ x: 1 }))
        .action()
      const page = root.lets('page', 'home', '/').page(() => {
        const mutation = q.useMutation()
        return (
          <div id="page">
            <div id="data">x={mutation.data?.x ?? 'nothing'}</div>
            <button id="mutate" onClick={() => mutation.mutate()}>
              Mutate
            </button>
          </div>
        )
      })

      const { render, fetchesTale } = await createTestThings({ points: [root, q, page] })
      await render(page.route(), async ({ waitContent, tale, click }) => {
        await waitContent('#data')
        await click('#mutate')
        await waitContent('x=1')
        expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #page:
                #data: x=nothing
                #mutate: Mutate
  
              #page:
                #data: x=1
                #mutate: Mutate
            "
          `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
          action.test (client) < {}
          "
        `)
    })

    it.concurrent('with clientLoader', async () => {
      const root = createRoot()
      const q = root
        .lets('action', 'test')
        .clientLoader(() => ({ y: 2 }))
        .action()
      const page = root.lets('page', 'home', '/').page(() => {
        const mutation = q.useMutation()
        return (
          <div id="page">
            <div id="data">y={mutation.data?.y ?? 'nothing'}</div>
            <button id="mutate" onClick={() => mutation.mutate()}>
              Mutate
            </button>
          </div>
        )
      })

      const { render, fetchesTale } = await createTestThings({ points: [root, q, page] })
      await render(page.route(), async ({ waitContent, tale, click }) => {
        await waitContent('#data')
        await click('#mutate')
        await waitContent('y=2')
        expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #page:
                #data: y=nothing
                #mutate: Mutate
  
              #page:
                #data: y=2
                #mutate: Mutate
            "
          `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
  
          "
        `)
    })

    it.concurrent('with loader and clientLoader', async () => {
      const root = createRoot()
      const q = root
        .lets('action', 'test')
        .loader(() => ({ x: 1 }))
        .clientLoader(({ data }) => ({ y: 2, ...data }))
        .action()
      const page = root.lets('page', 'home', '/').page(() => {
        const mutation = q.useMutation()
        return (
          <div id="page">
            <div id="data">
              x={mutation.data?.x ?? 'nothing'} y={mutation.data?.y ?? 'nothing'}
            </div>
            <button id="mutate" onClick={() => mutation.mutate()}>
              Mutate
            </button>
          </div>
        )
      })

      const { render, fetchesTale } = await createTestThings({ points: [root, q, page] })
      await render(page.route(), async ({ waitContent, tale, click }) => {
        await waitContent('#data')
        await click('#mutate')
        await waitContent('x=1 y=2')
        expect(await tale()).toMatchInlineSnapshot(`
            "
            /
              #page:
                #data: x=nothing y=nothing
                #mutate: Mutate
  
              #page:
                #data: x=1 y=2
                #mutate: Mutate
            "
          `)
        expect(await fetchesTale()).toMatchInlineSnapshot(`
          "
          action.test (client) < {}
          "
        `)
      })
    })
  })

  describe.concurrent('page', () => {
    it('with query', async () => {
      const root = createRoot()
      const query = root
        .lets('action', 'test')
        .loader(() => ({ x: 1 }))
        .query()
        .action()

      const page = root
        .lets('page', 'home')
        .with(query)
        .page(({ data }) => <div id="page">x={data.x}</div>)

      const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
      await render(page.route(), async ({ waitContent, tale }) => {
        await waitContent('#page')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /home
            #loading: ...
  
            #page: x=1
          "
        `)
      })
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        action.test (client) < {}
        "
      `)
      expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=1
        "
      `)
    })

    it('with infinite query', async () => {
      const root = createRoot()

      const items: Array<{ id: number; name: string }> = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
        { id: 4, name: 'Item 4' },
        { id: 5, name: 'Item 5' },
      ]

      const query = root
        .lets('action', 'test')
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
          pageParamFromInput: 'cursor',
          getNextPageParam: (lastPage) => lastPage.nextCursor,
          initialPageParam: 0,
        })
        .action()
      const page = root
        .lets('page', 'home')
        .with(query)
        .page(({ data, queries: [query] }) => {
          const itms = data.pages.flatMap((page) => page.items)
          const nextCursor = data.pages.at(-1)?.nextCursor
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

      const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
      await render(page.route(), async ({ waitContent, tale, click }) => {
        await waitContent('#more')
        await click('#more')
        await waitContent('Item 4')
        await click('#more')
        await waitContent('Item 5')
        expect(await tale()).toMatchInlineSnapshot(`
          "
          /home
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
        action.test (client) < {"cursor":0}
        action.test (client) < {"cursor":2}
        action.test (client) < {"cursor":4}
        "
      `)
      expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page:
          div: Item 1
          div: Item 2
          #more: Load more
        "
      `)
    })
  })
})

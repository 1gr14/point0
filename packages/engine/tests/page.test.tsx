import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { createTestThings, ymlifyline } from './utils/internal-testing.js'

describe('page', () => {
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

  it('simple', async () => {
    const root = createRoot()
    const page = root.lets('page', 'home', '/').page(() => <div id="page">x=nothing</div>)
    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
                  "
                  /
                    #page: x=nothing
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

  it('page param', async () => {
    const root = createRoot()
    const page = root.lets('page', 'home', '/:x').page(({ params }) => <div id="page">x={params.x}</div>)
    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ x: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /zxc
            #page: x=zxc
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    expect(await fetchPreview(page, { x: 'zxc' })).toMatchInlineSnapshot(`
        "
        #page: x=zxc
        "
      `)
  })

  it('page optional param and asterisk', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/a/:x?/b/*?')
      .page(({ params }) => <div id="page">{ymlifyline(params)}</div>)
    const { render, fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ x: 'zxc', '*': 'qwe/asd' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /a/zxc/b/qwe/asd
            #page: x: zxc, *: qwe/asd
          "
        `)
    })
    expect(await fetchPreview(page, { x: 'zxc', '*': 'qwe/asd' })).toMatchInlineSnapshot(`
        "
        #page: x: zxc, *: qwe/asd
        "
      `)
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /a/b
              #page: {}
            "
          `)
    })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
          "
          #page: {}
          "
        `)
  })

  it('query loader', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x=1
      "
    `)
  })

  it('query loader finalized', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .query({
        enabled: true,
      })
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x=1
      "
    `)
  })

  it('query clientLoader', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .clientLoader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "

      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #loading: ...
      "
    `)
  })

  it('query loader error', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => {
        if (Math.random() + 1) {
          throw new Error('test error')
        }
        return { x: 1 }
      })
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #error: test error
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #loading: ...
      "
    `)
  })

  it('query loader with input', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:id')
      .loader(({ params }) => ({ x: params.id }))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /zxc
          #loading: ...

          #page: x=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "
      #page: x=zxc
      "
    `)
  })

  it('inner component can be externalized', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:id')
      .loader(({ params }) => ({ x: params.id }))
      .page((props) => <Page {...props} />)
    const Page: typeof page.Infer.EdgeComponent = ({ data }) => <div id="page">x={data.x}</div>

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /zxc
          #loading: ...

          #page: x=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "
      #page: x=zxc
      "
    `)
  })

  const items: Array<{ id: number; name: string }> = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
    { id: 4, name: 'Item 4' },
    { id: 5, name: 'Item 5' },
  ]

  it('infinite query loader', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .search(
        z.object({
          cursor: z
            .string()
            .optional()
            .transform((val) => (val ? +val : undefined)),
        }),
      )
      .loader(({ search }) => {
        const cursor = search.cursor ?? 0
        const nextCursor = cursor + 2
        return {
          items: items.slice(cursor, cursor + 2),
          nextCursor: nextCursor < items.length ? nextCursor : undefined,
        }
      })
      .infiniteQuery({
        // pageParamFromInput: {
        //   get: ({ input, get }) => get(input, '?.cursor'),
        //   set: ({ input, value, set }) => set(input, '?.cursor', value),
        // },
        pageParamFromInput: '?.cursor',
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
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
      page.home (client) < {"cursor":"0"}
      page.home (client) < {"cursor":"2"}
      page.home (client) < {"cursor":"4"}
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

  it('infinite query clientLoader', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .search(
        z.object({
          cursor: z
            .string()
            .optional()
            .transform((val) => (val ? +val : undefined)),
        }),
      )
      .clientLoader(({ search }) => {
        const cursor = search.cursor ?? 0
        const nextCursor = cursor + 2
        return {
          items: items.slice(cursor, cursor + 2),
          nextCursor: nextCursor < items.length ? nextCursor : undefined,
        }
      })
      .infiniteQuery({
        pageParamFromInput: '?.cursor',
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
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

      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #loading: ...
      "
    `)
  })

  it('infinite query loader error', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .search(
        z.object({
          cursor: z
            .string()
            .optional()
            .transform((val) => (val ? +val : undefined)),
        }),
      )
      .loader(({ search }) => {
        if (Math.random() + 1) {
          throw new Error('test error')
        }
        const cursor = search.cursor ?? 0
        const nextCursor = cursor + 2
        return {
          items: items.slice(cursor, cursor + 2),
          nextCursor: nextCursor < items.length ? nextCursor : undefined,
        }
      })
      .infiniteQuery({
        pageParamFromInput: '?.cursor',
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #error: test error
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {"cursor":"0"}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #loading: ...
      "
    `)
  })

  it('wrapper', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:id')
      .loader(({ params }) => ({ x: params.id }))
      .wrapper(({ children, location }) => (
        <div id="wrapper">
          <div id="params">{location.params.id}</div>
          {children}
        </div>
      ))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /zxc
          #wrapper:
            #params: zxc
            #loading: ...

          #wrapper:
            #params: zxc
            #page: x=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "
      #wrapper:
        #params: zxc
        #page: x=zxc
      "
    `)
  })

  it('wrapper can block query', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:id')
      .wrapper(({ children, location }) => {
        if (location.params.id.length > 2) {
          return <div id="wrapper">you shell not pass</div>
        }
        return children
      })
      .loader(({ params }) => ({ x: params.id }))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#wrapper')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /zxc
          #wrapper: you shell not pass
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "

      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "
      #wrapper: you shell not pass
      "
    `)
  })

  it('related query', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .loader(() => ({ x: 1 }))
      .query()
    const page = root
      .lets('page', 'home', '/home')
      .relatedQuery(query)
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, query] })
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
      query.test (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x=1
      "
    `)
  })

  it('related query input', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home', '/:y')
      .relatedQuery(query, ({ location }) => ({ y: +location.params.y }))
      .page(({ data, location }) => (
        <div id="page">
          x={data.x} y={location.params.y}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, query] })
    await render(page.route({ y: 123 }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /123
          #loading: ...

          #page: x=246 y=123
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test (client) < {"y":123}
      "
    `)
    expect(await fetchPreview(page, { y: '123' })).toMatchInlineSnapshot(`
      "
      #page: x=246 y=123
      "
    `)
  })

  // it('related query fn', async () => {
  //   const query = root
  //     .lets('query', 'test')
  //     .input(z.object({ y: z.number() }))
  //     .loader(({ input }) => ({ x: input.y * 2 }))
  //     .query()
  //   const page = root
  //     .lets('page', 'home', '/:y')
  //     .relatedQuery(({ location }) => {
  //       return query.useQuery({ y: +location.params.y })
  //     })
  //     .page(({ data, location }) => (
  //       <div id="page">
  //         x={data.x} y={location.params.y}
  //       </div>
  //     ))

  //   const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, query] })
  //   await render(page.route({ y: 123 }), async ({ waitContent, tale }) => {
  //     await waitContent('#page')
  //     expect(await tale()).toMatchInlineSnapshot(`
  //       "/123
  //         #loading: ...

  //         #page: x=246 y=123
  //       "
  //     `)
  //   })
  //   expect(await fetchesTale()).toMatchInlineSnapshot(`
  //     "query.test (client) < {"y":123}
  //     "
  //   `)
  //   expect(await fetchPreview(page, { y: '123' })).toMatchInlineSnapshot(`
  //     "#page: x=246 y=123
  //     "
  //   `)
  // })

  it('related infinite query', async () => {
    const root = createRoot()
    const query = root
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
        pageParamFromInput: 'cursor',
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
    const page = root
      .lets('page', 'home', '/home')
      .relatedQuery(query)
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, query] })
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
      infiniteQuery.test (client) < {"cursor":0}
      infiniteQuery.test (client) < {"cursor":2}
      infiniteQuery.test (client) < {"cursor":4}
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

  // it('related infinite query fn', async () => {
  //   const query = root
  //     .lets('infiniteQuery', 'test')
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
  //   const page = root
  //     .lets('page', 'home', '/home')
  //     .relatedQuery(({ location }) => {
  //       return query.useInfiniteQuery()
  //     })
  //     .page(({ data, queries: [query] }) => {
  //       const itms = data.pages.flatMap((page) => page.items)
  //       const nextCursor = data.pages.at(-1)?.nextCursor
  //       return (
  //         <div id="page">
  //           {itms.map((item) => (
  //             <div key={item.id}>{item.name}</div>
  //           ))}
  //           {nextCursor && (
  //             <button
  //               id="more"
  //               onClick={() => {
  //                 void query.fetchNextPage()
  //               }}
  //             >
  //               Load more
  //             </button>
  //           )}
  //         </div>
  //       )
  //     })

  //   const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, query] })
  //   await render(page.route(), async ({ waitContent, tale, click }) => {
  //     await waitContent('#more')
  //     await click('#more')
  //     await waitContent('Item 4')
  //     await click('#more')
  //     await waitContent('Item 5')
  //     expect(await tale()).toMatchInlineSnapshot(`
  //       "/home
  //         #loading: ...

  //         #page:
  //           div: Item 1
  //           div: Item 2
  //           #more: Load more

  //         #page:
  //           div: Item 1
  //           div: Item 2
  //           div: Item 3
  //           div: Item 4
  //           #more: Load more

  //         #page:
  //           div: Item 1
  //           div: Item 2
  //           div: Item 3
  //           div: Item 4
  //           div: Item 5
  //       "
  //     `)
  //   })
  //   expect(await fetchesTale()).toMatchInlineSnapshot(`
  //     "infiniteQuery.test (client) < {"cursor":0}
  //     infiniteQuery.test (client) < {"cursor":2}
  //     infiniteQuery.test (client) < {"cursor":4}
  //     "
  //   `)
  //   expect(await fetchPreview(page)).toMatchInlineSnapshot(`
  //     "#page:
  //       div: Item 1
  //       div: Item 2
  //       #more: Load more
  //     "
  //   `)
  // })

  it('query with injected query', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()

    const page = root
      .lets('page', 'home', '/:y')
      .loader(() => ({ z: 3 }))
      .with(query, ({ location }) => ({ y: +location.params.y }))
      // .query(query)
      .page(({ data, location, queries }) => (
        <div id="page">
          x={queries[1].data.x} y={location.params.y} z={data.z}
        </div>
      ))

    const { render, fetchPreview } = await createTestThings({ ssr: true, points: [root, page, query] })
    await render(page.route({ y: 123 }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /123
          #loading: ...

          #page: x=246 y=123 z=3
        "
      `)
    })
    expect(await fetchPreview(page, { y: '123' })).toMatchInlineSnapshot(`
      "
      #page: x=246 y=123 z=3
      "
    `)
  })

  it('mapper standalone', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:y')
      .mapper(({ data }) => {
        expect(Object.keys(data).length).toBe(0)
        return { data, x: 1 }
      })
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ y: 123 }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /123
          #page: x=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "

      "
    `)
    expect(await fetchPreview(page, { y: '123' })).toMatchInlineSnapshot(`
      "
      #page: x=1
      "
    `)
  })

  it('mapper with qureies', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home', '/:y')
      .loader(() => ({ z: 3 }))
      .with(query, ({ location }) => ({ y: +location.params.y }))
      .mapper(({ data, queries, location }) => {
        return { x: queries[1].data.x, y: location.params.y, z: data.z }
      })
      .page(({ data }) => (
        <div id="page">
          x={data.x} y={data.y} z={data.z}
        </div>
      ))

    const { render, fetchPreview } = await createTestThings({ ssr: true, points: [root, page, query] })
    await render(page.route({ y: 123 }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /123
          #loading: ...

          #page: x=246 y=123 z=3
        "
      `)
    })
    expect(await fetchPreview(page, { y: '123' })).toMatchInlineSnapshot(`
      "
      #page: x=246 y=123 z=3
      "
    `)
  })

  it('many wrappers and with', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:id')
      .wrapper(({ children, location }) => {
        if (location.params.id.length < 2) {
          return <div id="wrapper">you shell not pass</div>
        }
        return <div id="wrapper">{children}</div>
      })
      .with(() => ({ y: 1 }))
      .loader(({ params }) => ({ x: params.id }))
      .wrapper(({ children, location }) => (
        <div id="wrapper1">
          <div id="params">id={location.params.id}</div>
          {children}
        </div>
      ))
      .with(() => ({ z: 1 }))
      .wrapper(({ children, location }) => (
        <div id="wrapper2">
          <div id="params">id={location.params.id}</div>
          {children}
        </div>
      ))
      .page(({ data, props }) => (
        <div id="page">
          x={data.x} y={props.y} z={props.z}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /zxc
          #wrapper:
            #wrapper1:
              #params: id=zxc
              #wrapper2:
                #params: id=zxc
                #loading: ...

          #wrapper:
            #wrapper1:
              #params: id=zxc
              #wrapper2:
                #params: id=zxc
                #page: x=zxc y=1 z=1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) < {"id":"zxc"}
      "
    `)
    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "
      #wrapper:
        #wrapper1:
          #params: id=zxc
          #wrapper2:
            #params: id=zxc
            #page: x=zxc y=1 z=1
      "
    `)
  })

  it('type error when input or body schema provided', () => {
    const root = createRoot()
    const baseBody = root
      .lets('base', 'baseWithBody')
      .body(z.object({ id: z.string() }))
      .base()
    const baseInput = root
      .lets('base', 'baseWithInput')
      .input(z.object({ id: z.string() }))
      .base()
    // @ts-expect-error - body schema not allowed for page
    baseBody.lets('page', 'home', '/:id').page()
    // @ts-expect-error - input schema not allowed for page
    baseInput.lets('page', 'home', '/:id').page()
  })

  // it('can return async component from loader', async () => {
  //   const root = createRoot()
  //   const x = await import('react-server-dom-bun/client.browser')
  //   const { createFromReadableStream } = await import('react-server-dom-bun/client.browser')
  //   const page = root
  //     .lets('page', 'home', '/')
  //     .loader(async () => {
  //       return <div id="page-inner">x=1</div>
  //     })
  //     .page(({ data }) => {
  //       return <div id="page-outer">{data}</div>
  //     })
  //   const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
  //   await render(page.route(), async ({ waitContent, tale }) => {
  //     // await waitContent('#page-outer')
  //     expect(await tale()).toMatchInlineSnapshot(`
  //       "
  //       /
  //         #page-outer: x=1
  //       "
  //     `)
  //   })
  //   expect(await fetchesTale()).toMatchInlineSnapshot(`
  //     "
  //     page.home (client) < {}
  //     "
  //   `)
  //   expect(await fetchPreview(page)).toMatchInlineSnapshot(`
  //     "
  //     #page-outer: x=1
  //     "
  //   `)
  // })

  it('same query key when a search param is undefined', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .search(z.object({ filter: z.string(), utm: z.string().optional() }))
      .loader(({ search }) => ({ filter: search.filter }))
      .page(({ data }) => <div id="page">{data.filter}</div>)

    const withUndefined = page.getQueryKey({ '?': { filter: 'f', utm: undefined } })
    const withoutKey = page.getQueryKey({ '?': { filter: 'f' } })
    const withValue = page.getQueryKey({ '?': { filter: 'f', utm: 'x' } })

    // an undefined GET param must not affect the query key
    expect(withUndefined).toEqual(withoutKey)
    // a real value must still produce a different key
    expect(withValue).not.toEqual(withUndefined)
  })
})

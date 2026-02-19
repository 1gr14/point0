import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { createTestThings } from './utils/internal-testing.js'

describe('page', () => {
  const createRoot = () =>
    Point0.lets('root', 'root')
      .ssr(true)
      .baseurl('http://localhost/')
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
    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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
    const page = root.lets('page', 'home', '/:x').page(({ location }) => <div id="page">x={location.params.x}</div>)
    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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

  it('query loader', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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

  it('query loader and clientLoader', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .clientLoader(({ data }) => ({ y: 2, ...data }))
      .page(({ data }) => (
        <div id="page">
          x={data.x}, y={data.y}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          #loading: ...

          #page: x=1, y=2
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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
      .loader(({ input }) => ({ x: input.id }))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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
      page.home (client) < {"cursor":0}
      page.home (client) < {"cursor":2}
      page.home (client) < {"cursor":4}
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
      .clientInput(z.object({ cursor: z.number().optional() }))
      .clientLoader(({ input }) => {
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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

  it('infinite query loader and clientLoader', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .sharedInput(z.object({ cursor: z.number().optional() }))
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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
      page.home (client) < {"cursor":0}
      page.home (client) < {"cursor":2}
      page.home (client) < {"cursor":4}
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
      .input(z.object({ cursor: z.number().optional() }))
      .loader(({ input }) => {
        if (Math.random() + 1) {
          throw new Error('test error')
        }
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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
      page.home (client) < {"cursor":0}
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
      .loader(({ input }) => ({ x: input.id }))
      .wrapper(({ children, queries, location }) => (
        <div id="wrapper">
          <div id="params">{location.params.id}</div>
          <div id="query-status">{queries.map((q) => q.status).join(', ') || 'undefined'}</div>
          {children}
        </div>
      ))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /zxc
          #wrapper:
            #params: zxc
            #query-status: pending
            #loading: ...

          #wrapper:
            #params: zxc
            #query-status: success
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
        #query-status: success
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
      .loader(({ input }) => ({ x: input.id }))
      .page(({ data }) => <div id="page">x={data.x}</div>)

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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

  it('with fn', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:y')
      .with(() => ({ x: 1 }))
      .page(({ props, location }) => (
        <div id="page">
          x={props.x} y={location.params.y}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ y: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /zxc
          #page: x=1 y=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "

      "
    `)
    expect(await fetchPreview(page, { y: 'zxc' })).toMatchInlineSnapshot(`
      "
      #page: x=1 y=zxc
      "
    `)
  })

  it('with fn state', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:y')
      .with(() => {
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState<Error | null>(null)
        useEffect(() => {
          setTimeout(() => {
            setError(new Error('test error'))
          }, 50)
          setTimeout(() => {
            setError(null)
          }, 100)
          setTimeout(() => {
            setLoading(false)
          }, 150)
        }, [])
        if (error) {
          return error
        }
        if (loading) {
          return 'loading'
        }
        return {
          x: 1,
        }
      })
      .page(({ props, location }) => (
        <div id="page">
          x={props.x} y={location.params.y}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ y: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /zxc
          #loading: ...

          #error: test error

          #loading: ...

          #page: x=1 y=zxc
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "

      "
    `)
    expect(await fetchPreview(page, { y: 'zxc' })).toMatchInlineSnapshot(`
      "
      #loading: ...
      "
    `)
  })

  it('with query', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .loader(() => ({ x: 1 }))
      .query()

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
      query.test (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x=1
      "
    `)
  })

  it('with query input', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home', '/:y')
      .with(query, ({ location }) => ({ y: +location.params.y }))
      // .with(query)
      .page(({ data, location }) => (
        <div id="page">
          x={data.x} y={location.params.y}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
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

  it('with query props input', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home')
      .with(() => ({ y: 123 }))
      .with(query, ({ props }) => ({ y: props.y }))
      .page(({ data, props }) => (
        <div id="page">
          x={data.x} y={props.y}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /home
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
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x=246 y=123
      "
    `)
  })

  it('with query fn', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home', '/:y')
      .with(({ location }) => {
        return query.useQuery({ y: +location.params.y })
      })
      .page(({ data, location }) => (
        <div id="page">
          x={data.x} y={location.params.y}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
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

  it('with query fn return many queries', async () => {
    const root = createRoot()
    const query1 = root
      .lets('query', 'query1')
      .loader(() => ({ x: 1 }))
      .query()
    const query2 = root
      .lets('query', 'query2')
      .loader(() => ({ y: 2 }))
      .query()
    const page = root
      .lets('page', 'home')
      .with(() => {
        return [query1.useQuery(), query2.useQuery()] as const
      })
      .page(({ data, queries }) => (
        <div id="page">
          x={data.x}, y={queries[1].data.y}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query1, query2] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /home
          #loading: ...

          #page: x=1, y=2
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.query1 (client) < {}
      query.query2 (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x=1, y=2
      "
    `)
  })

  it('with infinite query', async () => {
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

  it('with infinite query fn', async () => {
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
      .lets('page', 'home')
      .with(() => {
        return query.useInfiniteQuery()
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

  it('with infinite query fn return many queries', async () => {
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
    const query2 = root
      .lets('query', 'query2')
      .loader(() => ({ y: 2 }))
      .query()
    const page = root
      .lets('page', 'home')
      .with(() => {
        return [query.useInfiniteQuery(), query2.useQuery()] as const
      })
      .page(({ data, queries: [query, query2] }) => {
        const itms = data.pages.flatMap((page) => page.items)
        const nextCursor = data.pages.at(-1)?.nextCursor
        return (
          <div id="page">
            <div id="y">{query2.data.y}</div>
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query, query2] })
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
            #y: 2
            div: Item 1
            div: Item 2
            #more: Load more

          #page:
            #y: 2
            div: Item 1
            div: Item 2
            div: Item 3
            div: Item 4
            #more: Load more

          #page:
            #y: 2
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
      query.query2 (client) < {}
      infiniteQuery.test (client) < {"cursor":2}
      infiniteQuery.test (client) < {"cursor":4}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        #y: 2
        div: Item 1
        div: Item 2
        #more: Load more
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
      .lets('page', 'home')
      .relatedQuery(query)
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
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

  //   const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
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
      .lets('page', 'home')
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
  //     .lets('page', 'home')
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

  //   const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
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
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test (client) < {"y":123}
      page.home (client) < {"y":"123"}
      "
    `)
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
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

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page, query] })
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
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test (client) < {"y":123}
      page.home (client) < {"y":"123"}
      "
    `)
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
      .loader(({ input }) => ({ x: input.id }))
      .wrapper(({ children, queries, props }) => (
        <div id="wrapper1">
          <div id="props">y={props.y}</div>
          <div id="query-status">{queries.map((q) => q.status).join(', ') || 'undefined'}</div>
          {children}
        </div>
      ))
      .with(() => ({ z: 1 }))
      .wrapper(({ children, queries, props }) => (
        <div id="wrapper2">
          <div id="props">
            y={props.y} z={props.z}
          </div>
          <div id="query-status">{queries.map((q) => q.status).join(', ') || 'undefined'}</div>
          {children}
        </div>
      ))
      .page(({ data, props }) => (
        <div id="page">
          x={data.x} y={props.y} z={props.z}
        </div>
      ))

    const { render, fetchPreview, fetchesTale } = await createTestThings({ points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /zxc
          #wrapper:
            #wrapper1:
              #props: y=1
              #query-status: pending
              #wrapper2:
                #props: y=1 z=1
                #query-status: pending
                #loading: ...

          #wrapper:
            #wrapper1:
              #props: y=1
              #query-status: success
              #wrapper2:
                #props: y=1 z=1
                #query-status: success
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
          #props: y=1
          #query-status: success
          #wrapper2:
            #props: y=1 z=1
            #query-status: success
            #page: x=zxc y=1 z=1
      "
    `)
  })
})

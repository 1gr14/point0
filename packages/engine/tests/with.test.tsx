import { ErrorPoint0, Point0 } from '@point0/core'
import type { EmptyObject } from '@point0/core'
import type { InfiniteData, InfiniteQueryObserverSuccessResult, QueryObserverSuccessResult } from '@tanstack/query-core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { createTestThings } from './utils/internal-testing.js'
import { createNavigation } from '@point0/react-dom/router'
import { Routes } from '@devp0nt/route0'

describe('with', () => {
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

  it('with fn', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:y')
      .with(() => ({ x: 1 }))
      .page(({ props, location }) => {
        expectTypeOf<typeof props>().toEqualTypeOf<{ x: number }>()
        return (
          <div id="page">
            x={props.x} y={location.params.y}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
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

  it('with many fn and undefined', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:y')
      .with(() => ({ x: 1 }))
      .with(() => {
        const [ready, setReady] = useState(false)
        setTimeout(() => {
          setReady(true)
        }, 100)
        if (!ready) {
          return 'loading'
        }
        return undefined
      })
      .with(() => {
        return {
          y: 2,
        }
      })
      .page(({ props, location }) => {
        expectTypeOf<typeof props>().toEqualTypeOf<{ x: number; y: number }>()
        return (
          <div id="page">
            x={props.x} y={location.params.y}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ y: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
            "
            /zxc
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

  it('with many fn and partial', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/:y')
      .with(() => ({ x: 1 }))
      .with(() => {
        if (Math.random() + 1) {
          return
        }
        return {
          y: 2,
        }
      })
      .with(() => ({ z: 3 }))
      .page(({ props, location }) => {
        expectTypeOf<typeof props>().toEqualTypeOf<{ x: number; y?: number; z: number }>()
        return (
          <div id="page">
            x={props.x} y={location.params.y}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
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

  it(
    'with fn state',
    async () => {
      const root = createRoot()
      const page = root
        .lets('page', 'home', '/:y')
        .with(() => {
          const [loading, setLoading] = useState(true)
          const [error, setError] = useState<Error | null>(null)
          useEffect(() => {
            setTimeout(() => {
              setError(new Error('test error'))
            }, 150)
            setTimeout(() => {
              setError(null)
            }, 300)
            setTimeout(() => {
              setLoading(false)
            }, 450)
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
        .page(({ props, location }) => {
          expectTypeOf<typeof props>().toEqualTypeOf<{ x: number }>()
          return (
            <div id="page">
              x={props.x} y={location.params.y}
            </div>
          )
        })

      const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page] })
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
    },
    {
      retry: 3,
    },
  )

  it('with query', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .loader(() => ({ x: 1 }))
      .query()

    const page = root
      .lets('page', 'home', '/home')
      .with(query)
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        return <div id="page">x={data.x}</div>
      })

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

  it('with query input', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home', '/:y')
      .with(query, ({ params }) => ({ y: +params.y }))
      // .with(query)
      .page(({ data, location }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        return (
          <div id="page">
            x={data.x} y={location.params.y}
          </div>
        )
      })

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

  it('with query props input', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home', '/home')
      .with(() => ({ y: 123 }))
      .with(query, ({ props }) => ({ y: props.y }))
      .page(({ data, props }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        expectTypeOf<typeof props>().toEqualTypeOf<{ y: number }>()
        return (
          <div id="page">
            x={data.x} y={props.y}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, query] })
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
      .page(({ data, location }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        return (
          <div id="page">
            x={data.x} y={location.params.y}
          </div>
        )
      })

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
      .lets('page', 'home', '/home')
      .with(() => {
        return [query1.useQuery(), query2.useQuery()] as const
      })
      .page(({ data, queries }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        expectTypeOf<typeof queries>().toEqualTypeOf<
          [
            QueryObserverSuccessResult<{ x: number }, ErrorPoint0>,
            QueryObserverSuccessResult<{ y: number }, ErrorPoint0>,
          ]
        >()
        return (
          <div id="page">
            x={data.x}, y={queries[1].data.y}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, page, query1, query2],
    })
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
        pageParamFromInput: {
          get: ({ input, get }) => get(input, 'cursor'),
          set: ({ input, value, set }) => set(input, 'cursor', value),
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
    const page = root
      .lets('page', 'home', '/home')
      .with(query)
      .page(({ data, queries }) => {
        const itms = data.pages.flatMap((page) => page.items)
        expectTypeOf<typeof data>().toEqualTypeOf<
          InfiniteData<{ items: { id: number; name: string }[]; nextCursor: number | undefined }>
        >()
        expectTypeOf<typeof queries>().toEqualTypeOf<
          [
            InfiniteQueryObserverSuccessResult<
              InfiniteData<{ items: { id: number; name: string }[]; nextCursor: number | undefined }>,
              ErrorPoint0
            >,
          ]
        >()
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
                  void queries[0].fetchNextPage()
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
        pageParamFromInput: {
          get: ({ input, get }) => get(input, 'cursor'),
          set: ({ input, value, set }) => set(input, 'cursor', value),
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
    const page = root
      .lets('page', 'home', '/home')
      .with(() => {
        return query.useInfiniteQuery()
      })
      .page(({ data, queries }) => {
        const itms = data.pages.flatMap((page) => page.items)
        const nextCursor = data.pages.at(-1)?.nextCursor
        expectTypeOf<typeof data>().toEqualTypeOf<
          InfiniteData<{ items: { id: number; name: string }[]; nextCursor: number | undefined }>
        >()
        expectTypeOf<typeof queries>().toEqualTypeOf<
          [
            InfiniteQueryObserverSuccessResult<
              InfiniteData<{ items: { id: number; name: string }[]; nextCursor: number | undefined }>,
              ErrorPoint0
            >,
          ]
        >()

        return (
          <div id="page">
            {itms.map((item) => (
              <div key={item.id}>{item.name}</div>
            ))}
            {nextCursor && (
              <button
                id="more"
                onClick={() => {
                  void queries[0].fetchNextPage()
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
      .lets('page', 'home', '/home')
      .with(() => {
        return [query.useInfiniteQuery(), query2.useQuery()] as const
      })
      .page(({ data, queries }) => {
        const itms = data.pages.flatMap((page) => page.items)
        const nextCursor = data.pages.at(-1)?.nextCursor
        expectTypeOf<typeof data>().toEqualTypeOf<
          InfiniteData<{ items: { id: number; name: string }[]; nextCursor: number | undefined }>
        >()
        expectTypeOf<typeof queries>().toEqualTypeOf<
          [
            InfiniteQueryObserverSuccessResult<
              InfiniteData<{ items: { id: number; name: string }[]; nextCursor: number | undefined }>,
              ErrorPoint0
            >,
            QueryObserverSuccessResult<{ y: number }, ErrorPoint0>,
          ]
        >()
        return (
          <div id="page">
            <div id="y">{queries[1].data.y}</div>
            {itms.map((item) => (
              <div key={item.id}>{item.name}</div>
            ))}
            {nextCursor && (
              <button
                id="more"
                onClick={() => {
                  void queries[0].fetchNextPage()
                }}
              >
                Load more
              </button>
            )}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, page, query, query2],
    })
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

  it('with query as prop', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home', '/:y')
      .with(({ location }) => {
        const result = query.useQuery({ y: +location.params.y })
        return result.error ? result.error : !result.data ? 'loading' : { x: result.data.x }
      })
      .page(({ data, props, queries }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<EmptyObject>()
        expectTypeOf<typeof props>().toEqualTypeOf<{ x: number }>()
        expectTypeOf<typeof queries>().toEqualTypeOf<[]>()
        return (
          <div id="page">
            {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
            data={Object.keys(data).length > 0 ? 'exists' : 'empty'} queries={queries.length > 0 ? 'exists' : 'empty'}{' '}
            x={props.x}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, query] })
    await render(page.route({ y: 123 }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /123
          #loading: ...

          #page: data=empty queries=empty x=246
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
      #page: data=empty queries=empty x=246
      "
    `)
  })

  it('with error status', async () => {
    const root = createRoot()

    const page = root
      .lets('page', 'home', '/home')
      .with(() => new ErrorPoint0('test error', { status: 401 }))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .page(({ data, props, queries }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<EmptyObject>()
        expectTypeOf<typeof props>().toEqualTypeOf<EmptyObject>()
        expectTypeOf<typeof queries>().toEqualTypeOf<[]>()
        return <div id="page">never</div>
      })

    const { render, fetchPreview, fetchesTale, fetchSsr } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /home
          #error: test error
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "

      "
    `)
    const { response } = await fetchSsr(page)
    expect(response.status).toBe(401)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #error: test error
      "
    `)
  })

  it('with can override props by made it non-null', async () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/home')
      .with(() => ({ x: 1 as number | null }))
      .with(() => ({ x: 2 }))
      .page(({ props }) => {
        expectTypeOf<typeof props>().toEqualTypeOf<{ x: number }>()
        return <div id="page">x={props.x}</div>
      })
  })

  it('with can override props by made it non-null when loading and error and redirect can happen', async () => {
    const root = createRoot()
    const { redirect } = createNavigation({
      routes: Routes.create({
        home: '/home',
      }),
    })
    root
      .lets('page', 'home', '/home')
      .with(() => ({ x: 1 as number | null }))
      .with(() => {
        if (!(Math.random() + 1)) {
          return new ErrorPoint0('test error')
        }
        if (!(Math.random() + 1)) {
          return 'loading'
        }
        if (!(Math.random() + 1)) {
          return redirect('home')
        }
        return { x: 2 }
      })
      .page(({ props }) => {
        expectTypeOf<typeof props>().toEqualTypeOf<{ x: number }>()
        return <div id="page">x={props.x}</div>
      })
  })

  it('forbids returning array as data', () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      // @ts-expect-error -- array is forbidden to return as data
      .with(() => [{ x: 1 }])
      .page()
  })

  it('forbids returning string as data', () => {
    const root = createRoot()
    root
      .lets('page', 'home', '/')
      // @ts-expect-error -- string is forbidden to return as data
      .with(() => 'zxc')
      .page()
  })
})

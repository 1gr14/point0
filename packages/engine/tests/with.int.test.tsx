import { Routes } from '@1gr14/route0'
import { ErrorPoint0, Point0 } from '@point0/core'
import type { EmptyObject } from '@point0/core'
import { createNavigation } from '@point0/react-dom/router'
import type { InfiniteData, InfiniteQueryObserverSuccessResult, QueryObserverSuccessResult } from '@tanstack/query-core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import path from 'node:path'
import url from 'node:url'
import ts from 'typescript'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { createTestThings } from './utils/internal-testing.js'
import { toPosixPath } from '@point0/compiler'
import type { EmptyProps } from '@point0/core'

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
        retryOnMount: false,
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
      .page(({ data, props }) => {
        expectTypeOf<typeof props>().toEqualTypeOf<EmptyProps>()
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        return (
          <div id="page">
            x={data.x}, props.length={Object.keys(props).length}
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

          #page: x=1, props.length=0
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
      #page: x=1, props.length=0
      "
    `)
  })

  it('with blocking component', async () => {
    const root = createRoot()
    const query1 = root
      .lets('query', 'test1')
      .loader(() => ({ x: 1 }))
      .query()
    const query2 = root
      .lets('query', 'test2')
      .loader(() => ({ y: 2 }))
      .query()

    const page = root
      .lets('page', 'home', '/home')
      .with(query1)
      .with(({ queries }) => <div id="blocked">{queries.length}</div>)
      .with(query2)
      .page(({ data, props }) => {
        expectTypeOf<typeof props>().toEqualTypeOf<EmptyProps>()
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        return (
          <div id="page">
            x={data.x}, props.length={Object.keys(props).length}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({
      ssr: true,
      points: [root, page, query1, query2],
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#blocked')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /home
          #blocked: 1
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test1 (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #blocked: 1
      "
    `)
  })

  it('with wrapping component', async () => {
    const root = createRoot()
    const query1 = root
      .lets('query', 'test1')
      .loader(() => ({ x: 1 }))
      .query()
    const query2 = root
      .lets('query', 'test2')
      .loader(() => ({ y: 2 }))
      .query()

    const page = root
      .lets('page', 'home', '/home')
      .with(query1)
      .with(({ queries, children }) => (
        <div id="wrapper1">
          <div id="queries1">{queries.length}</div>
          {children}
        </div>
      ))
      .with(query2)
      .with(({ queries, children }) => (
        <div id="wrapper2">
          <div id="queries2">{queries.length}</div>
          {children}
        </div>
      ))
      .page(({ data, props }) => {
        expectTypeOf<typeof props>().toEqualTypeOf<EmptyProps>()
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        return (
          <div id="page">
            x={data.x}, props.length={Object.keys(props).length}
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
          #wrapper1:
            #queries1: 1
            #wrapper2:
              #queries2: 2
              #loading: ...

          #wrapper1:
            #queries1: 1
            #wrapper2:
              #queries2: 2
              #page: x=1, props.length=0
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test2 (client) < {}
      query.test1 (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #wrapper1:
        #queries1: 1
        #wrapper2:
          #queries2: 2
          #page: x=1, props.length=0
      "
    `)
  })

  it('with query sequential, by resolve helper', async () => {
    const root = createRoot()
    const query1 = root
      .lets('query', 'test1')
      .loader(() => ({ x: 1 }))
      .query()
    const query2 = root
      .lets('query', 'test2')
      .loader(() => ({ y: 2 }))
      .query()

    const page = root
      .lets('page', 'home', '/home')
      .with(query1)
      .with(({ queries, resolve }) => {
        return resolve(queries, ([{ data }]) => data)
      })
      .with(query2)
      .page(({ data, queries: [q1, q2], props }) => {
        expect(data).toBe(q1.data)
        expect(data.x).toBe(props.x)
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        expectTypeOf<typeof q1>().toEqualTypeOf<QueryObserverSuccessResult<{ x: number }, ErrorPoint0>>()
        expectTypeOf<typeof q2>().toEqualTypeOf<QueryObserverSuccessResult<{ y: number }, ErrorPoint0>>()
        return (
          <div id="page">
            x={q1.data.x} y={q2.data.y}
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

          #page: x=1 y=2
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test1 (client) < {}
      query.test2 (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x=1 y=2
      "
    `)
  })

  it('with query sequential, by fourth arg of with fn', async () => {
    const root = createRoot()
    const query1 = root
      .lets('query', 'test1')
      .loader(() => ({ x: 1 }))
      .query()
    const query2 = root
      .lets('query', 'test2')
      .loader(() => ({ y: 2 }))
      .query()

    const page = root
      .lets('page', 'home', '/home')
      .with(query1, undefined, undefined, ({ data }) => data)
      .with(query2)
      .page(({ data, queries: [q1, q2] }) => {
        expect(data).toBe(q1.data)
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        expectTypeOf<typeof q1>().toEqualTypeOf<QueryObserverSuccessResult<{ x: number }, ErrorPoint0>>()
        expectTypeOf<typeof q2>().toEqualTypeOf<QueryObserverSuccessResult<{ y: number }, ErrorPoint0>>()
        return (
          <div id="page">
            x={q1.data.x} y={q2.data.y}
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

          #page: x=1 y=2
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test1 (client) < {}
      query.test2 (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x=1 y=2
      "
    `)
  })

  it('with query sequential, by thrid arg of with fn', async () => {
    const root = createRoot()
    const query1 = root
      .lets('query', 'test1')
      .loader(() => ({ x: 1 }))
      .query()
    const query2 = root
      .lets('query', 'test2')
      .loader(() => ({ y: 2 }))
      .query()

    const page = root
      .lets('page', 'home', '/home')
      .with(query1, undefined, undefined, ({ data }) => data)
      .with(query2)
      .page(({ data, queries: [q1, q2] }) => {
        expect(data).toBe(q1.data)
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        expectTypeOf<typeof q1>().toEqualTypeOf<QueryObserverSuccessResult<{ x: number }, ErrorPoint0>>()
        expectTypeOf<typeof q2>().toEqualTypeOf<QueryObserverSuccessResult<{ y: number }, ErrorPoint0>>()
        return (
          <div id="page">
            x={q1.data.x} y={q2.data.y}
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

          #page: x=1 y=2
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test1 (client) < {}
      query.test2 (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x=1 y=2
      "
    `)
  })

  it('with query sequential, by thrid arg of with fn', async () => {
    const root = createRoot()
    const query1 = root
      .lets('query', 'test1')
      .loader(() => ({ x: 1 }))
      .query()
    const query2 = root
      .lets('query', 'test2')
      .loader(() => ({ y: 2 }))
      .query()

    const page = root
      .lets('page', 'home', '/home')
      .with(query1, undefined, undefined, ({ data }) => data)
      .with(query2)
      .page(({ data, queries: [q1, q2] }) => {
        expect(data).toBe(q1.data)
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        expectTypeOf<typeof q1>().toEqualTypeOf<QueryObserverSuccessResult<{ x: number }, ErrorPoint0>>()
        expectTypeOf<typeof q2>().toEqualTypeOf<QueryObserverSuccessResult<{ y: number }, ErrorPoint0>>()
        return (
          <div id="page">
            x={q1.data.x} y={q2.data.y}
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

          #page: x=1 y=2
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test1 (client) < {}
      query.test2 (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x=1 y=2
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

  it('forbid by types not provide query input', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root
      .lets('page', 'home', '/:y')
      // @ts-expect-error -- not provide with query input
      .with(query)
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
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /123
          #loading: ...

          #error: y: Invalid input: expected number, received undefined
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test (client) < {}
      "
    `)
    expect(await fetchPreview(page, { y: '123' })).toMatchInlineSnapshot(`
      "
      #error: y: Invalid input: expected number, received undefined
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

  it('with thrown error is caught by the mountable boundary and renders `.error()` in place, the page stays alive', async () => {
    const root = createRoot()

    // Unlike the RETURNED error above (a data short-circuit rendered by the bound `.error()`), a
    // THROW is a render-phase error. On the client the mountable's ErrorBoundary catches it and
    // renders the nearest `.error` declared above — the rest of the page keeps rendering. On the
    // server no boundary runs (Fizz): React contains the throw at the mountable's Suspense
    // boundary and ships its loading fallback; the client retries into `.error()` after
    // hydration. The throw's SSR effects (status, redirect) still reach the response — see the
    // thrown-status test below.
    const broken = root
      .lets('component', 'broken')
      .error(({ error }) => <div id="broken-error">{error.message}</div>)
      .with((): undefined => {
        throw new Error('with boom')
      })
      .component(() => <div id="broken">never</div>)
    const page = root.lets('page', 'home', '/home').page(() => (
      <div id="page">
        <div id="alive">alive-content</div>
        <broken.X />
      </div>
    ))

    const { render, fetchSsr } = await createTestThings({ ssr: true, points: [root, broken, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#broken-error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /home
          #page:
            #alive: alive-content
            #broken-error: with boom
        "
      `)
    })
    // SSR contains the throw the same way — the rest of the page ships, no SPA fallback
    const result = await fetchSsr(page)
    expect(result.html).toContain('alive-content')
    expect(result.html).toContain('__POINT0_DEHYDRATED_SUPER_STORE__')
    // a statusless throw changes nothing about the response status
    expect(result.response.status).toBe(200)
  })

  it('with thrown error status: the SSR response carries the same status a returned error does', async () => {
    const root = createRoot()

    // Throw/return parity: no error boundary runs on the server, so the discovery render's
    // onError recovers the thrown error's `status` — the response carries it exactly like the
    // returned-error test above. The HTML itself still ships the mountable's loading fallback
    // (the client retries into `.error()` after hydration) — returning stays the only way to put
    // `.error()` into the SSR HTML itself.
    const page = root
      .lets('page', 'home', '/home')
      .with((): undefined => {
        throw new ErrorPoint0('test error', { status: 401 })
      })
      .page(() => <div id="page">never</div>)

    const { render, fetchSsr, fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /home
          #error: test error
        "
      `)
    })
    const { response } = await fetchSsr(page)
    expect(response.status).toBe(401)
    // the fallback + React's client-recovery template — not `.error()` — is what the HTML holds
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      template:
      #loading: ...
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

  it('with chaos', async () => {
    const root = createRoot()
    const query1 = root
      .lets('query', 'test1')
      .loader(() => ({ x: 1 }))
      .query()
    const query2 = root
      .lets('query', 'test2')
      .loader(() => ({ y: 2 }))
      .query()
    const query3 = root
      .lets('query', 'test3')
      .input(z.object({ mul: z.number() }))
      .loader(({ input: { mul } }) => ({ z: 3 * mul }))
      .query()

    const page = root
      .lets('page', 'home', '/home')
      .with(query1)
      .with(({ queries, children }) => (
        <div id="wrapper1">
          <div id="queries1">{queries.length}</div>
          {children}
        </div>
      ))
      .with(query2, undefined, undefined, ({ data }) => ({ mul: data.y }))
      .with(({ queries, children }) => {
        const [ready, setReady] = useState(false)
        useEffect(() => {
          setTimeout(() => {
            setReady(true)
          }, 50)
        }, [])
        if (!ready) {
          return <div>I AM NOT READY</div>
        }
        return (
          <div id="wrapper2">
            <div id="queries2">{queries.length}</div>
            {children}
          </div>
        )
      })
      .with(query3, ({ props: { mul } }) => ({ mul }))
      .page(({ data, props, queries: [q1, q2, q3] }) => {
        expectTypeOf<typeof props>().toEqualTypeOf<{ mul: number }>()
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        expectTypeOf<typeof q1>().toEqualTypeOf<QueryObserverSuccessResult<{ x: number }, ErrorPoint0>>()
        expectTypeOf<typeof q2>().toEqualTypeOf<QueryObserverSuccessResult<{ y: number }, ErrorPoint0>>()
        expectTypeOf<typeof q3>().toEqualTypeOf<QueryObserverSuccessResult<{ z: number }, ErrorPoint0>>()
        expect(data.x).toBe(q1.data.x)
        return (
          <div id="page">
            x={data.x}, y={q2.data.y}, z={q3.data.z}, mul={props.mul}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
      ssr: true,
      points: [root, page, query1, query2, query3],
    })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /home
          #wrapper1:
            #queries1: 1
            #loading: ...

          #wrapper1:
            #queries1: 1
            div: I AM NOT READY

          #wrapper1:
            #queries1: 1
            #wrapper2:
              #queries2: 2
              #loading: ...

          #wrapper1:
            #queries1: 1
            #wrapper2:
              #queries2: 2
              #page: x=1, y=2, z=6, mul=2
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      query.test2 (client) < {}
      query.test1 (client) < {}
      query.test3 (client) < {"mul":2}
      "
    `)

    fetchRecorder.prune()
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #wrapper1:
        #queries1: 1
        div: I AM NOT READY
      "
    `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      query.test1 (server) < {}
      query.test2 (server) < {}
      "
    `)
  })

  it('resolve helper: explicit true spreads merged data into props', async () => {
    const root = createRoot()
    const query1 = root
      .lets('query', 'test1')
      .loader(() => ({ x: 1 }))
      .query()
    const query2 = root
      .lets('query', 'test2')
      .loader(() => ({ y: 2 }))
      .query()

    const page = root
      .lets('page', 'home', '/home')
      .with(query1)
      .with(query2)
      .with(({ queries, resolve }) => resolve(queries, true))
      .page(({ props }) => {
        expectTypeOf<typeof props.x>().toEqualTypeOf<number>()
        expectTypeOf<typeof props.y>().toEqualTypeOf<number>()
        return (
          <div id="page">
            x={props.x} y={props.y}
          </div>
        )
      })

    const { render } = await createTestThings({ ssr: true, points: [root, page, query1, query2] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('#page:x=1 y=2')
    })
  })

  it('resolve helper: default (and false) waits but adds nothing to props', async () => {
    const root = createRoot()
    const query1 = root
      .lets('query', 'test1')
      .loader(() => ({ x: 1 }))
      .query()

    const page = root
      .lets('page', 'home', '/home')
      .with(query1)
      // no second arg -> default false -> nothing is added to props
      .with(({ queries, resolve }) => resolve(queries))
      .page(({ props }) => <div id="page">keys={Object.keys(props).length}</div>)

    const { render } = await createTestThings({ ssr: true, points: [root, page, query1] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('#page:keys=0')
    })
  })

  it('with(point, input, options, true) spreads query data into props', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'test')
      .loader(() => ({ x: 1 }))
      .query()

    const page = root
      .lets('page', 'home', '/home')
      .with(query, undefined, undefined, true)
      .page(({ props }) => {
        expectTypeOf<typeof props.x>().toEqualTypeOf<number>()
        return <div id="page">x={props.x}</div>
      })

    const { render } = await createTestThings({ ssr: true, points: [root, page, query] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('#page:x=1')
    })
  })

  // ── with(component) — a point that is BOTH callable and a query ────────────────────────────────
  // A component point is a real React component (callable) AND a point carrying a query. Passing one
  // to `.with` must read it AS A QUERY — inject its data, never render its UI — exactly like
  // `.with(query)`. Regression: the signature used to see the call signature first and treat the
  // component as a with-fn, which silently dropped the injected query, refused the `input` argument,
  // and skipped the "input required" check. These prove a point is detected before the function form.

  it('with component point injects its query (not its UI), no input', async () => {
    const root = createRoot()
    const stats = root
      .lets('component', 'stats')
      .loader(() => ({ x: 1 }))
      .component(({ data }) => <div id="stats">x={data.x}</div>)

    const page = root
      .lets('page', 'home', '/home')
      .with(stats)
      .page(({ data, props }) => {
        expectTypeOf<typeof props>().toEqualTypeOf<EmptyProps>()
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number }>()
        return (
          <div id="page">
            x={data.x}, props.length={Object.keys(props).length}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, stats] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /home
          #loading: ...

          #page: x=1, props.length=0
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      component.stats (client) < {}
      "
    `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page: x=1, props.length=0
      "
    `)
  })

  it('with component point that requires input — with(component, input)', async () => {
    const root = createRoot()
    const mul = root
      .lets('component', 'mul')
      .input(z.object({ a: z.number(), b: z.number() }))
      .loader(({ input }) => ({ mul: input.a * input.b }))
      .component(({ data }) => <div id="mul">mul={data.mul}</div>)

    const page = root
      .lets('page', 'home', '/:a/:b')
      .with(mul, ({ params }) => ({ a: +params.a, b: +params.b }))
      .page(({ data, location }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ mul: number }>()
        return (
          <div id="page">
            mul={data.mul} a={location.params.a} b={location.params.b}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, page, mul] })
    await render(page.route({ a: 3, b: 4 }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /3/4
          #loading: ...

          #page: mul=12 a=3 b=4
        "
      `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      component.mul (client) < {"a":3,"b":4}
      "
    `)
    expect(await fetchPreview(page, { a: '3', b: '4' })).toMatchInlineSnapshot(`
      "
      #page: mul=12 a=3 b=4
      "
    `)
  })

  it('forbid by types: with(component) without the required input', () => {
    const root = createRoot()
    const mul = root
      .lets('component', 'mul')
      .input(z.object({ a: z.number(), b: z.number() }))
      .loader(({ input }) => ({ mul: input.a * input.b }))
      .component(({ data }) => <div id="mul">mul={data.mul}</div>)
    root
      .lets('page', 'home', '/:a/:b')
      // @ts-expect-error -- a component point requires its input, exactly like a query
      .with(mul)
      .page()
  })

  it('with component point + resolve true spreads its data into props', async () => {
    const root = createRoot()
    const stats = root
      .lets('component', 'stats')
      .loader(() => ({ x: 1 }))
      .component(({ data }) => <div id="stats">x={data.x}</div>)

    const page = root
      .lets('page', 'home', '/home')
      // queryOptions undefined, resolve true — all three arg-tail positions are accepted for a
      // component now; before the fix the component was a with-fn and refused every extra argument.
      .with(stats, undefined, undefined, true)
      .page(({ props }) => {
        expectTypeOf<typeof props.x>().toEqualTypeOf<number>()
        return <div id="page">x={props.x}</div>
      })

    const { render } = await createTestThings({ ssr: true, points: [root, page, stats] })
    await render(page.route(), async ({ waitContent }) => {
      await waitContent('#page:x=1')
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────────────────────────
// The tests above prove `with` BEHAVES correctly at runtime. The tests below prove it FEELS correct
// in the editor — the developer-facing surface: does `input` autocomplete? when you misuse `with`,
// is the red squiggle helpful or garbage? That surface is produced entirely by the (enormous) `with`
// type signature, and it can rot silently: a careless edit still type-checks, but autocomplete dies
// and errors turn into "No overload matches this call". Plain runtime/`expectTypeOf` tests can't
// catch that — so here we drive the TypeScript language service over the *source* types (exactly
// what the editor uses) and assert on the actual completions and diagnostic messages.
//
// One shared probe file holds every scenario; each line is tagged in a trailing comment so a test
// can find its diagnostic. `/*CURSOR*/` marks where we ask "what would autocomplete offer here?".
const dxProbe = `
import { Point0 } from '@point0/core'
import { z } from 'zod'

const root = Point0.lets('root', 'root')
  .loading(() => null)
  .error(() => null)
  .root()

// a query whose input is REQUIRED ({ y: number })
const queryReq = root
  .lets('query', 'reqd')
  .input(z.object({ y: z.number() }))
  .loader(({ input }) => ({ x: input.y * 2 }))
  .query()

// a query with NO input
const queryOpt = root
  .lets('query', 'opt')
  .loader(() => ({ x: 1 }))
  .query()

// a COMPONENT whose input is REQUIRED ({ a, b }). A component is BOTH callable (it renders) and a
// point carrying a query, so \`with\` must still feel it as a query — require the input, complete its
// fields — and never mistake it for a with-fn just because it has a call signature.
const componentReq = root
  .lets('component', 'comp')
  .input(z.object({ a: z.number(), b: z.number() }))
  .loader(({ input }) => ({ mul: input.a * input.b }))
  .component(() => null)

// a COMPONENT with NO input
const componentOpt = root
  .lets('component', 'compOpt')
  .loader(() => ({ x: 1 }))
  .component(() => null)

root.lets('page', 'm1', '/:y').with(queryReq) /* MISSING */
root.lets('page', 'm2', '/:y').with(queryReq, {}) /* EMPTY */
root.lets('page', 'm3', '/:y').with(queryReq, { y: 'str' }) /* WRONG */
root.lets('page', 'm4', '/:y').with(queryReq, { y: 1 }) /* OKAY */
root.lets('page', 'm5', '/:y').with(queryOpt) /* OPTOK */
const _complete = root.lets('page', 'm6', '/:y').with(queryReq, { /*CURSOR*/ })

root.lets('page', 'c1', '/:y').with(componentReq) /* CMISSING */
root.lets('page', 'c2', '/:y').with(componentReq, { a: 1, b: 2 }) /* COKAY */
root.lets('page', 'c3', '/:y').with(componentOpt) /* COPTOK */
const _completeC = root.lets('page', 'c4', '/:y').with(componentReq, { /*CCURSOR*/ })
`

// Build one language service over the engine project, serving the probe from memory and reading the
// real `@point0/core` *source* (via the tsconfig path mapping) — no dist build needed.
const dxEngineDir = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..')
// TypeScript normalizes program file names to posix internally, so the probe path must be posix too — otherwise the
// LanguageServiceHost's `f === dxProbePath` snapshot check never matches on Windows ("Could not find source file").
const dxProbePath = toPosixPath(path.join(dxEngineDir, 'tests', '__with_dx_probe__.tsx'))
const dxParsed = ts.parseJsonConfigFileContent(
  ts.readConfigFile(path.join(dxEngineDir, 'tsconfig.json'), ts.sys.readFile).config,
  ts.sys,
  dxEngineDir,
)
const dxOptions: ts.CompilerOptions = { ...dxParsed.options, noEmit: true }
delete dxOptions.rootDir // avoid TS6059 emit-layout noise; we only read the probe's own diagnostics
const dxHost: ts.LanguageServiceHost = {
  getScriptFileNames: () => [dxProbePath],
  getScriptVersion: () => '1',
  getScriptSnapshot: (f) =>
    f === dxProbePath
      ? ts.ScriptSnapshot.fromString(dxProbe)
      : ts.sys.fileExists(f)
        ? ts.ScriptSnapshot.fromString(ts.sys.readFile(f)!)
        : undefined,
  getCurrentDirectory: () => dxEngineDir,
  getCompilationSettings: () => dxOptions,
  getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,
  realpath: ts.sys.realpath,
}
const dxService = ts.createLanguageService(dxHost, ts.createDocumentRegistry())
const dxSourceFile = dxService.getProgram()!.getSourceFile(dxProbePath)!
const dxDiagnostics = dxService.getSemanticDiagnostics(dxProbePath)
// diagnostics that land on the line carrying the given tag comment
const dxCodesOf = (tag: string) => {
  const line = dxSourceFile.getLineAndCharacterOfPosition(dxProbe.indexOf(tag)).line
  return dxDiagnostics
    .filter((d) => d.start !== undefined && dxSourceFile.getLineAndCharacterOfPosition(d.start).line === line)
    .map((d) => d.code)
}
const dxMessageOf = (tag: string) => {
  const line = dxSourceFile.getLineAndCharacterOfPosition(dxProbe.indexOf(tag)).line
  const d = dxDiagnostics.find(
    (x) => x.start !== undefined && dxSourceFile.getLineAndCharacterOfPosition(x.start).line === line,
  )
  return d ? ts.flattenDiagnosticMessageText(d.messageText, '\n') : ''
}

describe('with — what the developer sees in the editor (autocomplete & type errors)', () => {
  it('offers the query input fields while typing the input object', () => {
    // The developer injects a query and starts typing its input:
    //
    //     page.with(queryReq, { ▮ })     // queryReq input is { y: number }
    //
    // They expect the editor to suggest `y` (and only the input fields). With the old multi-overload
    // signature the language server couldn't pick an overload to complete against, so it gave a
    // useless global list (everything in scope) and `y` was nowhere — you had to already know the
    // shape. We assert real member-completion: `y` is offered, and a global name like `Point0` is not.
    const completions = dxService.getCompletionsAtPosition(dxProbePath, dxProbe.indexOf('/*CURSOR*/'), {})
    const names = (completions?.entries ?? []).map((e) => e.name)
    expect(completions?.isMemberCompletion).toBe(true)
    expect(names).toContain('y')
    expect(names).not.toContain('Point0')
  })

  it('says "Expected N arguments" when a required input is forgotten', () => {
    // The query needs an input, but the author forgot to pass one:
    //
    //     page.with(queryReq)            // ← missing the required { y } input
    //
    // The signature must NOT silently accept this, and must NOT collapse to the old
    // "No overload matches this call" (which even blamed the unrelated `with(fn)` form). The single
    // signature gives the plain, correct message — "Expected 2-4 arguments, but got 1" — code 2554.
    expect(dxCodesOf('/* MISSING */')).toContain(2554)
    expect(dxMessageOf('/* MISSING */')).toContain('Expected')
  })

  it('points at the bad argument when the input object is incomplete', () => {
    // Author passes an input, but leaves out a required field:
    //
    //     page.with(queryReq, {})        // ← `y` is missing
    //
    // We want a precise argument error (code 2345, "Argument of type '{}' is not assignable …"),
    // landing on the `{}` — not a wall of "no overload matches" with every candidate listed.
    expect(dxCodesOf('/* EMPTY */')).toContain(2345)
  })

  it('shows the exact type mismatch when an input field has the wrong type', () => {
    // Author passes the right field with the wrong type:
    //
    //     page.with(queryReq, { y: 'str' })   // ← y must be a number
    //
    // We want the error to point at the value and read "Type 'string' is not assignable to type
    // 'number'" (code 2322) — the same message you'd get assigning to a plain typed variable.
    expect(dxCodesOf('/* WRONG */')).toContain(2322)
    expect(dxMessageOf('/* WRONG */')).toContain('not assignable')
  })

  it('accepts a correct required input with no error', () => {
    // The happy path must stay clean — no false positives:
    //
    //     page.with(queryReq, { y: 1 })
    expect(dxCodesOf('/* OKAY */')).toEqual([])
  })

  it('lets a query with no input be used without an input argument', () => {
    // A query that takes no input must be usable as just `with(query)` — the "optional" half of the
    // same signature that makes the required half above demand an argument:
    //
    //     page.with(queryOpt)            // queryOpt has no input
    expect(dxCodesOf('/* OPTOK */')).toEqual([])
  })

  // ── A component point is BOTH callable and a query. The editor must feel it as a query, the same as
  // a `.query()` point — because a component is a real React component, an earlier function-first
  // discriminator saw the call signature and treated it as a with-fn: no input arg, no "input
  // required" error, no member completion. These four mirror the query cases above, one tier harder.

  it('treats a component with a required input as a query: "Expected N arguments" when it is forgotten', () => {
    // A component is callable, yet `with(componentReq)` must still demand its input — exactly like a
    // query — instead of silently accepting it as a zero-arg with-fn:
    //
    //     page.with(componentReq)        // ← missing the required { a, b } input
    expect(dxCodesOf('/* CMISSING */')).toContain(2554)
    expect(dxMessageOf('/* CMISSING */')).toContain('Expected')
  })

  it('accepts a component with its correct required input — no error', () => {
    // The input argument the function-first signature used to refuse is now accepted:
    //
    //     page.with(componentReq, { a: 1, b: 2 })
    expect(dxCodesOf('/* COKAY */')).toEqual([])
  })

  it('lets a component with no input be used without an input argument', () => {
    //     page.with(componentOpt)        // componentOpt has no input
    expect(dxCodesOf('/* COPTOK */')).toEqual([])
  })

  it('offers the component input fields while typing its input object', () => {
    // Member completion must work for a component's input just like a query's:
    //
    //     page.with(componentReq, { ▮ })   // componentReq input is { a, b }
    const completions = dxService.getCompletionsAtPosition(dxProbePath, dxProbe.indexOf('/*CCURSOR*/'), {})
    const names = (completions?.entries ?? []).map((e) => e.name)
    expect(completions?.isMemberCompletion).toBe(true)
    expect(names).toContain('a')
    expect(names).toContain('b')
    expect(names).not.toContain('Point0')
  })
})

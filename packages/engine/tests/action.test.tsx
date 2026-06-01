import { Point0 } from '@point0/core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { z } from 'zod'
import { createTestThings } from './utils/internal-testing.js'
import superjson from 'superjson'

describe('action', () => {
  const createRoot = () =>
    Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
      .error(({ error }) => <div id="error">{error.message}</div>)
      .transformer(superjson)
      .queryOptions({
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
      })
      .root()

  it('general', async () => {
    const root = createRoot()
    const action = root
      .lets('action', 'test', 'POST', '/api/my-test/:id')
      .params(z.object({ id: z.string().min(1) }))
      .headers(z.object({ x: z.string().min(1) }))
      .search(z.object({ y: z.string().min(1) }))
      .body(z.object({ b: z.number().min(1), d: z.bigint() }))
      .loader(({ request, headers, search, body, params }) => {
        return {
          headers,
          search,
          params,
          body,
          bodyUsed: request.original.bodyUsed,
          date: new Date('2026-03-11T12:00:00.000Z'),
        }
      })
      .action()

    const { loadPoint } = await createTestThings({ ssr: true, points: [root, action] })
    const result = await loadPoint(
      action,
      { body: { b: 3, d: 100n }, search: { y: '2' }, params: { id: '1' } },
      { headers: { x: '1' } },
    )
    expect(result).toEqual({
      headers: { x: '1' },
      search: { y: '2' },
      params: { id: '1' },
      body: { b: 3, d: 100n },
      bodyUsed: true,
      date: new Date('2026-03-11T12:00:00.000Z'),
    })
  })

  it('short notation', async () => {
    const root = createRoot()
    const action = root
      .lets('POST', '/api/my-test/:id')
      .params(z.object({ id: z.string().min(1) }))
      .headers(z.object({ x: z.string().min(1) }))
      .search(z.object({ y: z.string().min(1) }))
      .body(z.object({ b: z.number().min(1), d: z.bigint() }))
      .action(({ request, headers, search, body, params }) => {
        return {
          headers,
          search,
          params,
          body,
          bodyUsed: request.original.bodyUsed,
          date: new Date('2026-03-11T12:00:00.000Z'),
        }
      })

    const { loadPoint } = await createTestThings({ ssr: true, points: [root, action] })
    const result = await loadPoint(
      action,
      { body: { b: 3, d: 100n }, search: { y: '2' }, params: { id: '1' } },
      { headers: { x: '1' } },
    )
    expect(action.point.name).toBe('POST /api/my-test/:id')
    expectTypeOf<typeof action.Infer.RouteDefinition>().toEqualTypeOf<'/api/my-test/:id'>()
    expect(action.route.definition).toBe('/api/my-test/:id')
    expect(action.method).toBe('POST')
    expect(result).toEqual({
      headers: { x: '1' },
      search: { y: '2' },
      params: { id: '1' },
      body: { b: 3, d: 100n },
      bodyUsed: true,
      date: new Date('2026-03-11T12:00:00.000Z'),
    })
  })

  it('extends basePath', async () => {
    const root = createRoot()
    const base = root.lets('base', 'base').basePath('/my/prefix').base()
    const action = base
      .lets('POST', '/api/my-test/:id')
      .params(z.object({ id: z.string().min(1) }))
      .headers(z.object({ x: z.string().min(1) }))
      .search(z.object({ y: z.string().min(1) }))
      .body(z.object({ b: z.number().min(1), d: z.bigint() }))
      .action(({ request, headers, search, body, params }) => {
        return {
          headers,
          search,
          params,
          body,
          bodyUsed: request.original.bodyUsed,
          date: new Date('2026-03-11T12:00:00.000Z'),
        }
      })

    const { loadPoint } = await createTestThings({ ssr: true, points: [root, action] })
    const result = await loadPoint(
      action,
      { body: { b: 3, d: 100n }, search: { y: '2' }, params: { id: '1' } },
      { headers: { x: '1' } },
    )
    expect(action.point.name).toBe('POST /my/prefix/api/my-test/:id')
    expectTypeOf<typeof action.Infer.RouteDefinition>().toEqualTypeOf<'/my/prefix/api/my-test/:id'>()
    expect(action.route.definition).toBe('/my/prefix/api/my-test/:id')
    expect(action.point.method).toBe('POST')
    expect(result).toEqual({
      headers: { x: '1' },
      search: { y: '2' },
      params: { id: '1' },
      body: { b: 3, d: 100n },
      bodyUsed: true,
      date: new Date('2026-03-11T12:00:00.000Z'),
    })
  })

  it('twice extends basePath', async () => {
    const root = createRoot()
    const base1 = root.lets('base', 'base').basePath('/my/prefix').base()
    const base2 = base1.lets('base', 'base').basePath('/another/prefix').base()
    const action = base2
      .lets('POST', '/api/my-test/:id')
      .params(z.object({ id: z.string().min(1) }))
      .headers(z.object({ x: z.string().min(1) }))
      .search(z.object({ y: z.string().min(1) }))
      .body(z.object({ b: z.number().min(1), d: z.bigint() }))
      .action(({ request, headers, search, body, params }) => {
        return {
          headers,
          search,
          params,
          body,
          bodyUsed: request.original.bodyUsed,
          date: new Date('2026-03-11T12:00:00.000Z'),
        }
      })

    const { loadPoint } = await createTestThings({ ssr: true, points: [root, action] })
    const result = await loadPoint(
      action,
      { body: { b: 3, d: 100n }, search: { y: '2' }, params: { id: '1' } },
      { headers: { x: '1' } },
    )
    expect(action.point.name).toBe('POST /my/prefix/another/prefix/api/my-test/:id')
    expectTypeOf<typeof action.Infer.RouteDefinition>().toEqualTypeOf<'/my/prefix/another/prefix/api/my-test/:id'>()
    expect(action.route.definition).toBe('/my/prefix/another/prefix/api/my-test/:id')
    expect(action.point.method).toBe('POST')
    expect(result).toEqual({
      headers: { x: '1' },
      search: { y: '2' },
      params: { id: '1' },
      body: { b: 3, d: 100n },
      bodyUsed: true,
      date: new Date('2026-03-11T12:00:00.000Z'),
    })
  })

  it('body not used if body schema not provided', async () => {
    const root = createRoot()
    const action = root
      .lets('action', 'test', 'POST', '/api/my-test/:id')
      .params(z.object({ id: z.string().min(1) }))
      .headers(z.object({ x: z.string().min(1) }))
      .search(z.object({ y: z.string().min(1) }))
      .action(({ request, headers, search, params }) => {
        return { headers, search, params, bodyUsed: request.original.bodyUsed }
      })

    const { loadPoint } = await createTestThings({ ssr: true, points: [root, action] })
    const result = await loadPoint(action, { search: { y: '2' }, params: { id: '1' } }, { headers: { x: '1' } })
    expect(result).toEqual({ headers: { x: '1' }, search: { y: '2' }, params: { id: '1' }, bodyUsed: false })
  })

  it('do not transform when fetch not from point0', async () => {
    const root = createRoot()
    const action = root
      .lets('action', 'test', 'GET', '/api/my-test/:id')
      .loader(({ params }) => {
        return { c: new Date('2026-03-11T12:00:00.000Z'), id: params.id }
      })
      .action()

    const { engine } = await createTestThings({ ssr: true, points: [root, action] })
    const request = new Request('http://localhost:3000/api/my-test/1', {
      headers: { 'Content-Type': 'application/json' },
    })
    const result = await engine.fetch(request)
    const json = await result.json()
    expect(json).toEqual({ c: '2026-03-11T12:00:00.000Z', id: '1' })
  })

  it('uses request.rawBody when preset before body parsing', async () => {
    const root = Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
      .error(({ error }) => <div id="error">{error.message}</div>)
      .transformer(superjson)
      .queryOptions({
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
      })
      .middleware(async ({ request, next }) => {
        request.rawBody = JSON.stringify({ b: 123 })
        return await next()
      })
      .root()
    const action = root
      .lets('action', 'test', 'POST', '/api/raw-body/preset')
      .body(z.object({ b: z.number() }))
      .loader(({ request, body }) => {
        return { body, rawBody: request.rawBody, bodyUsed: request.original.bodyUsed }
      })
      .action()

    const { engine } = await createTestThings({ ssr: true, points: [root, action] })
    const request = new Request('http://localhost:3000/api/raw-body/preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: 'THIS_IS_NOT_JSON',
    })
    const result = await engine.fetch(request)
    const json = await result.json()

    expect(json).toEqual({
      body: { b: 123 },
      rawBody: '{"b":123}',
      bodyUsed: false,
    })
  })

  it('stores original json text into request.rawBody after parsing', async () => {
    const root = createRoot()
    const action = root
      .lets('action', 'test', 'POST', '/api/raw-body/store')
      .body(z.object({ b: z.number() }))
      .loader(({ request, body }) => {
        return { body, rawBody: request.rawBody, bodyUsed: request.original.bodyUsed }
      })
      .action()

    const { engine } = await createTestThings({ ssr: true, points: [root, action] })
    const request = new Request('http://localhost:3000/api/raw-body/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{"b":777}',
    })
    const result = await engine.fetch(request)
    const json = await result.json()

    expect(json).toEqual({
      body: { b: 777 },
      rawBody: '{"b":777}',
      bodyUsed: true,
    })
  })

  it('can be query', async () => {
    const root = createRoot()
    const action = root
      .lets('action', 'test', 'GET', '/api/my-test/:id')
      .loader(({ params }) => {
        return { date: new Date('2026-03-11T12:00:00.000Z'), id: params.id }
      })
      .query()
    const page = root
      .lets('page', 'home', '/:id')
      .with(action, ({ params }) => ({ params }))
      .page(({ data }) => (
        <div id="page">
          date={data.date.toISOString()},id={data.id}
        </div>
      ))

    const { render, fetchPreview } = await createTestThings({ ssr: true, points: [root, page, action] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /zxc
          #loading: ...

          #page: date=2026-03-11T12:00:00.000Z,id=zxc
        "
      `)
    })

    expect(await fetchPreview(page, { id: 'zxc' })).toMatchInlineSnapshot(`
      "
      #page: date=2026-03-11T12:00:00.000Z,id=zxc
      "
    `)
  })

  it('returns error when not found', async () => {
    const root = createRoot()
    const action = root
      .lets('action', 'test', 'GET', '/api/my-test/:id')
      .loader(({ params }) => {
        return { date: new Date('2026-03-11T12:00:00.000Z'), id: params.id }
      })
      .query()
    const page = root
      .lets('page', 'home', '/:id')
      .with(action, ({ params }) => ({ params }))
      .page(({ data }) => (
        <div id="page">
          date={data.date.toISOString()},id={data.id}
        </div>
      ))

    // we do not add action to points, to imitate point deletion o server and stale client
    const { render, engine } = await createTestThings({ ssr: true, points: [root, page] })
    await render(page.route({ id: 'zxc' }), async ({ waitContent, tale }) => {
      await waitContent('#error')
      expect(await tale()).toMatchInlineSnapshot(`
        "
        /zxc
          #loading: ...

          #error: Not Found
        "
      `)
    })

    const request = new Request('http://localhost:3000/api/my-test/123', {
      headers: { Accept: 'application/json' },
    })
    const result = await engine.fetch(request)
    const json = await result.json()
    delete json.stack
    expect(json).toEqual({ message: 'Not Found', code: 'POINT0_NOT_FOUND' })
  })

  it('can be infinite query', async () => {
    const items: Array<{ id: number; name: string }> = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
      { id: 4, name: 'Item 4' },
      { id: 5, name: 'Item 5' },
    ]

    const root = createRoot()
    const action = root
      .lets('action', 'test', 'POST', '/api/my-test')
      .body(z.object({ cursor: z.number().optional() }))
      .loader(({ body }) => {
        const cursor = body.cursor ?? 0
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
        pageParamFromInput: 'body.cursor',
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
    const page = root
      .lets('page', 'home', '/')
      .with(action)
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

    const { render, fetchPreview } = await createTestThings({ ssr: true, points: [root, page, action] })
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

    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #page:
        div: Item 1
        div: Item 2
        #more: Load more
      "
    `)
  })

  it('can be mutation', async () => {
    const root = createRoot()
    const action = root
      .lets('action', 'test', 'POST', '/api/my-test')
      .body(z.object({ y: z.number() }))
      .loader(({ body }) => ({ x: body.y * 2 }))
      .mutation()
    const page = root.lets('page', 'home', '/').page(() => {
      const mutation = action.useMutation()
      return (
        <div id="page">
          <div id="data">x={mutation.data?.x ?? 'nothing'}</div>
          <button id="mutate" onClick={() => mutation.mutate({ body: { y: 123 } })}>
            Mutate
          </button>
        </div>
      )
    })

    const { render, fetchesTale } = await createTestThings({ ssr: true, points: [root, action, page] })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#data')
      await click('#mutate')
      await waitContent('x=246')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page:
              #data: x=nothing
              #mutate: Mutate

            #page:
              #data: x=246
              #mutate: Mutate
          "
        `)
      expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        action.test (client) < {"body":{"y":123},"search":{},"params":{}}
        "
      `)
    })
  })

  it('throws on conflicted routes', async () => {
    const root = createRoot()
    const action1 = root
      .lets('action', 'test1', 'POST', '/api/my-test/:id')
      .params(z.object({ id: z.string().min(1) }))
      .headers(z.object({ x: z.string().min(1) }))
      .search(z.object({ y: z.string().min(1) }))
      .body(z.object({ b: z.number().min(1), d: z.bigint() }))
      .loader(({ request, headers, search, body, params }) => {
        return {
          headers,
          search,
          params,
          body,
          bodyUsed: request.original.bodyUsed,
          date: new Date('2026-03-11T12:00:00.000Z'),
        }
      })
      .action()

    const action2 = root
      .lets('action', 'test2', 'POST', '/api/my-test/:sn')
      .params(z.object({ sn: z.string().min(1) }))
      .headers(z.object({ x: z.string().min(1) }))
      .search(z.object({ y: z.string().min(1) }))
      .body(z.object({ b: z.number().min(1), d: z.bigint() }))
      .loader(({ request, headers, search, body, params }) => {
        return {
          headers,
          search,
          params,
          body,
          bodyUsed: request.original.bodyUsed,
          date: new Date('2026-03-11T12:00:00.000Z'),
        }
      })
      .action()

    await expect(createTestThings({ ssr: true, points: [root, action1, action2] })).rejects.toThrow()
  })
})

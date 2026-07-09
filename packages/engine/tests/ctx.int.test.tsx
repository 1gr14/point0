import { Point0 } from '@point0/core'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { createTestThings, ymlify } from './utils/internal-testing.js'
import { createNavigation } from '@point0/react-dom/router'
import { Routes } from '@1gr14/route0'

describe('ctx', () => {
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

  it('as object', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx({ x: 1 })
      .loader(({ ctx }) => ctx)
      .page(({ data }) => {
        expectTypeOf(data).toEqualTypeOf<{ x: number }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      x: 1
      "
    `)
  })

  it('as fn', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ x: 1 }))
      .loader(({ ctx }) => ctx)
      .page(({ data }) => {
        expectTypeOf(data).toEqualTypeOf<{ x: number }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      x: 1
      "
    `)
  })

  it('as fn extends', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ x: 1 }))
      .ctx(({ ctx }) => ({ y: ctx.x + 1 }))
      .loader(({ ctx }) => ctx)
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number; y: number }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      x: 1
      y: 2
      "
    `)
  })

  it('as fn overrides', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ x: 1 }))
      .ctx(({ ctx }) => ({ y: ctx.x + 1, x: 999 }))
      .loader(({ ctx }) => ctx)
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number; y: number }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      x: 999
      y: 2
      "
    `)
  })

  it('as fn extends optional', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ x: 1 }))
      .ctx(({ ctx }) => {
        if (!(Math.random() + 1)) {
          return
        }
        return { y: ctx.x + 1 }
      })
      .loader(({ ctx }) => {
        return ctx
      })
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ x: number; y?: number }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      x: 1
      y: 2
      "
    `)
  })

  it('as object exposes', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx({ x: 1 }, true)
      .loader(({ ctx, x }) => ({ ctx, x }))
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ ctx: { x: number }; x: number }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      ctx: 
        x: 1
      x: 1
      "
    `)
  })

  it('as object exposes partial', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx({ x: 1, y: 2 }, ['x'])
      .loader((o) => ({
        ctx: o.ctx,
        x: o.x,
        y:
          // @ts-expect-error -- y should nt exists
          o.y ?? '❌',
      }))
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ ctx: { x: number; y: number }; x: number; y: any }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      ctx: 
        x: 1
        y: 2
      x: 1
      y: ❌
      "
    `)
  })

  it('as fn exposes', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ x: 1 }), true)
      .loader(({ ctx, x }) => ({ ctx, x }))
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ ctx: { x: number }; x: number }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      ctx: 
        x: 1
      x: 1
      "
    `)
  })

  it('as fn exposes partial', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ x: 1, y: 2 }), ['x'])
      .loader((o) => ({
        ctx: o.ctx,
        x: o.x,
        y:
          // @ts-expect-error -- y should nt exists
          o.y ?? '❌',
      }))
      .page(({ data }) => {
        expectTypeOf<typeof data>().toEqualTypeOf<{ ctx: { x: number; y: number }; x: number; y: any }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      ctx: 
        x: 1
        y: 2
      x: 1
      y: ❌
      "
    `)
  })

  it('throws error', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ x: 1 }))
      .ctx(() => {
        throw new Error('test error')
      })
      .loader(({ ctx }) => ctx)
      .page(({ data }) => {
        expectTypeOf(data).toEqualTypeOf<{ x: number }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #error: test error
      "
    `)
  })

  it('returns error', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx(() => ({ x: 1 }))
      .ctx(() => {
        return new Error('test error')
      })
      .loader(({ ctx }) => ctx)
      .page(({ data }) => {
        expectTypeOf(data).toEqualTypeOf<{ x: number }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #error: test error
      "
    `)
  })

  it('forbids returning array as ctx', () => {
    const root = createRoot()
    const point = root.lets('page', 'home', '/')
    // @ts-expect-error -- array is forbidden to return as ctx
    point.ctx(() => [{ x: 1 }])
  })

  it('forbids exposing reserved keys', () => {
    const root = createRoot()
    const point = root.lets('page', 'home', '/')

    // @ts-expect-error -- request is forbidden to expose
    point.ctx({ request: 'x' }, true)
    // @ts-expect-error -- input is forbidden to expose
    point.ctx({ input: 'x' }, true)
    // @ts-expect-error -- data is forbidden to expose
    point.ctx({ data: 'x' }, true)
    // @ts-expect-error -- set is forbidden to expose
    point.ctx({ set: 'x' }, true)
    // @ts-expect-error -- execute is forbidden to expose
    point.ctx({ execute: 'x' }, true)
    // @ts-expect-error -- ctx is forbidden to expose
    point.ctx({ ctx: 'x' }, true)

    // @ts-expect-error -- request is forbidden in explicit exposed keys
    point.ctx({ request: 'x', ok: 1 }, ['request'])
    // @ts-expect-error -- ctx is forbidden in explicit exposed keys
    point.ctx(() => ({ ctx: 'x', ok: 1 }), ['ctx'])
    // @ts-expect-error -- execute is forbidden in explicit exposed keys
    point.ctx(() => ({ execute: 'x', ok: 1 }), ['execute'])
  })

  it('can return undefined, then no ctx overrides', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx({ x: 1 })
      .ctx(() => {
        if (!(Math.random() + 1)) {
          throw new Error('test error')
        }
      })
      .ctx(() => ({ y: 2 }))
      .loader(({ ctx }) => {
        expectTypeOf<typeof ctx>().toEqualTypeOf<{ x: number; y: number }>()
        expect(ctx).toEqual({ x: 1, y: 2 })
        return { x: 1 }
      })
      .page(({ data }) => {
        expectTypeOf(data).toEqualTypeOf<{ x: number }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      x: 1
      "
    `)
  })

  it('can return never, then no ctx overrides', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx({ x: 1 })
      .ctx(() => {
        throw new Error('test error')
      })
      .ctx(() => ({ y: 2 }))
      .loader(({ ctx }) => {
        expectTypeOf<typeof ctx>().toEqualTypeOf<{ x: number; y: number }>()
        expect(ctx).toEqual({ x: 1, y: 2 })
        return { x: 1 }
      })
      .page(({ data }) => {
        expectTypeOf(data).toEqualTypeOf<{ x: number }>()
        return ymlify(data)
      })
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      #error: test error
      "
    `)
  })

  it('can return redirect task, then no ctx overrides', async () => {
    const root = createRoot()
    const routes = Routes.create({
      page1: '/1',
      page2: '/2',
    })
    const { redirect } = createNavigation({
      routes,
    })
    const page1 = root
      .lets('page', 'page1', '/1')
      .ctx({ x: 1 })
      .ctx(async () => {
        return redirect('page2')
      })
      .ctx(() => ({ y: 2 }))
      .loader(({ ctx }) => {
        // never come here, just check types
        expectTypeOf<typeof ctx>().toEqualTypeOf<{ x: number; y: number }>()
        expect(ctx).toEqual({ x: 1, y: 2 })
        return { x: 1 }
      })
      .page(({ data }) => {
        expectTypeOf(data).toEqualTypeOf<{ x: number }>()
        return ymlify(data)
      })
    const page2 = root.lets('page', 'page2', '/2').page(() => <div id="page2">content</div>)
    const { fetchPreview } = await createTestThings({ ssr: true, points: [root, page1, page2] })
    expect(await fetchPreview(page1)).toMatchInlineSnapshot(`
      "
      #page2: content
      "
    `)
  })
})

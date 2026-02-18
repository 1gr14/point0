import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings, ymlify } from './utils/internal-testing.js'

describe('ctx', () => {
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

  it('as object', async () => {
    const root = createRoot()
    const page = root
      .lets('page', 'home', '/')
      .ctx({ x: 1 })
      .loader(({ ctx }) => ctx)
      .page(({ data }) => ymlify(data))
    const { fetchPreview } = await createTestThings({ points: [root, page] })
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
      .page(({ data }) => ymlify(data))
    const { fetchPreview } = await createTestThings({ points: [root, page] })
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
      .page(({ data }) => ymlify(data))
    const { fetchPreview } = await createTestThings({ points: [root, page] })
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
      .page(({ data }) => ymlify(data))
    const { fetchPreview } = await createTestThings({ points: [root, page] })
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
      "
      x: 999
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
      .page(({ data }) => ymlify(data))
    const { fetchPreview } = await createTestThings({ points: [root, page] })
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
      .page(({ data }) => ymlify(data))
    const { fetchPreview } = await createTestThings({ points: [root, page] })
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
      .page(({ data }) => ymlify(data))
    const { fetchPreview } = await createTestThings({ points: [root, page] })
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
      .page(({ data }) => ymlify(data))
    const { fetchPreview } = await createTestThings({ points: [root, page] })
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
})

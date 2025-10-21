import { Route0 } from '@devp0nt/route0'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import type { EmptyCtx, EmptyData, UndefinedCtx } from './index.js'
import { Point0 } from './index.js'
import { Eversion0 } from '../eversion/index.js'

// TODO: move all tests to separate files in test dir and refactor it

describe('Point0', () => {
  const testDir = nodePath.join(__dirname, 'test-temp')

  beforeEach(() => {
    nodeFs.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    nodeFs.rmSync(testDir, { recursive: true, force: true })
  })

  it('creates an empty instance', () => {
    const server = Point0.create()
    expect(server).toBeInstanceOf(Point0)
    expectTypeOf(server).toEqualTypeOf<Point0>()
    expectTypeOf(server).toEqualTypeOf<Point0<undefined, UndefinedCtx, EmptyCtx, EmptyData>>()
    expect(server._extendFns).toEqual([])
  })

  it('extends with ctx fn', () => {
    const server = Point0.create()
    const server1 = server.ctx(() => ({
      a: 1,
      b: 2,
    }))
    expect(server1).toBeInstanceOf(Point0)

    expectTypeOf(server1).toEqualTypeOf<Point0<undefined, UndefinedCtx, { a: number; b: number }, EmptyData>>()
    expect(server1._extendFns).toHaveLength(1)
    // not modified original server
    expect(server._extendFns).toHaveLength(0)
    const server2 = server1.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    expect(server2).toBeInstanceOf(Point0)

    expectTypeOf(server2).toEqualTypeOf<Point0<undefined, undefined, { a: number; b: number; c: number }, EmptyData>>()
    expect(server2._extendFns).toHaveLength(2)
    // not modified original server1
    expect(server1._extendFns).toHaveLength(1)
    // not modified original server
    expect(server._extendFns).toHaveLength(0)
  })

  it('override ctx with {}', async () => {
    const server = Point0.create()
    const server1 = server.ctx(() => ({
      a: 1,
      b: 2,
    }))
    expect(server1).toBeInstanceOf(Point0)

    expectTypeOf(server1).toEqualTypeOf<Point0<undefined, UndefinedCtx, { a: number; b: number }, EmptyData>>()
    expect(server1._extendFns).toHaveLength(1)
    // not modified original server
    expect(server._extendFns).toHaveLength(0)
    const server2 = server1.ctx({
      a: 3,
      c: 4,
    })
    expect(server2).toBeInstanceOf(Point0)

    expectTypeOf(server2).toEqualTypeOf<Point0<undefined, undefined, { a: number; c: number }, EmptyData>>()
    expect(server2._extendFns).toHaveLength(2)
    // not modified original server1
    expect(server1._extendFns).toHaveLength(1)
    // not modified original server
    expect(server._extendFns).toHaveLength(0)
    const eversion2 = Eversion0.create({ id: 'test', base: server2 })
    expect(
      await eversion2.extract({
        location: Route0.getLocation('/'),
        requiredCtx: undefined,
      }),
    ).toEqual({
      ctx: {
        a: 3,
        c: 4,
      },
      payload: { data: {}, meta: { title: 'Hello, world!' }, location: Route0.getLocation('/') },
      error: undefined,
      status: 200,
    })
  })

  it('extends with loader fn', () => {
    const server = Point0.create()
    const server1 = server.loader(() => ({
      a: 1,
      b: 2,
    }))
    expect(server1).toBeInstanceOf(Point0)
    expectTypeOf(server1).toEqualTypeOf<
      Point0<undefined, undefined, EmptyCtx, { a: number; b: number }, undefined, false>
    >()
    expect(server1._extendFns).toHaveLength(1)
    // not modified original server
    expect(server._extendFns).toHaveLength(0)
    const server2 = server1.loader(({ data }) => ({
      ...data,
      a: 3,
      c: 4,
    }))
    expect(server2).toBeInstanceOf(Point0)
    expectTypeOf(server2).toEqualTypeOf<
      Point0<undefined, undefined, EmptyCtx, { a: number; b: number; c: number }, undefined, false>
    >()
    expect(server2._extendFns).toHaveLength(2)
    // not modified original server1
    expect(server1._extendFns).toHaveLength(1)
    // not modified original server
    expect(server._extendFns).toHaveLength(0)
  })

  it('extract without required ctx', async () => {
    const server = Point0.create()
    const url = '/z/x/c'
    const server1 = server.ctx(() => ({
      a: 1,
      b: 2,
    }))
    const clientPoint01 = Point0.extend<typeof server1>()
      .route(Route0.create('/'))
      .page((x) => <div>Hello</div>)
    const eversion1 = Eversion0.create({ id: 'test', base: server1 })
    expect(
      await eversion1.extract({
        location: Route0.getLocation(url),
        point: clientPoint01,
        requiredCtx: undefined,
      }),
    ).toEqual({
      ctx: {
        a: 1,
        b: 2,
      },
      payload: { data: {}, meta: { title: 'Hello, world!' }, location: Route0.getLocation(url) },
      error: undefined,
      status: 200,
    })
    const server2 = server1.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    const clientPoint02 = Point0.extend<typeof server2>().page(() => <div>Hello</div>)
    const eversion2 = Eversion0.create({ id: 'test', base: server2 })
    expect(
      await eversion2.extract({
        point: clientPoint02,
        location: Route0.getLocation(url),
        requiredCtx: undefined,
      }),
    ).toEqual({
      ctx: {
        a: 3,
        b: 2,
        c: 4,
      },
      payload: { data: {}, meta: { title: 'Hello, world!' }, location: Route0.getLocation(url) },
      error: undefined,
      status: 200,
    })
    const server3 = server1.ctx(({ ctx }) => ({
      c: 5,
    }))
    const clientPoint03 = Point0.extend<typeof server3>().page(() => <div>Hello</div>)
    const eversion3 = Eversion0.create({ id: 'test', base: server3 })
    expect(
      await eversion3.extract({
        point: clientPoint03,
        location: Route0.getLocation(url),
      }),
    ).toEqual({
      ctx: {
        c: 5,
      },
      payload: { data: {}, meta: { title: 'Hello, world!' }, location: Route0.getLocation(url) },
      error: undefined,
      status: 200,
    })
  })

  it('extract ctx with required ctx input', async () => {
    const server = Point0.create().requireCtx<{ r: string }>()
    const url = '/z/x/c'
    const server1 = server.ctx(({ ctx }) => ({
      ...ctx,
      a: 1,
      b: 2,
    }))
    const clientPoint01 = Point0.extend<typeof server1>()
      .route(Route0.create('/'))
      .page(() => <div>Hello</div>)
    const eversion1 = Eversion0.create({ id: 'test', base: server1 })
    expect(
      await eversion1.extract({
        point: clientPoint01,
        location: Route0.getLocation(url),
        requiredCtx: { r: 'str' },
      }),
    ).toEqual({
      ctx: {
        r: 'str',
        a: 1,
        b: 2,
      },
      payload: { data: {}, meta: { title: 'Hello, world!' }, location: Route0.getLocation(url) },
      error: undefined,
      status: 200,
    })
    const server2 = server1.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    const clientPoint02 = Point0.extend<typeof server2>().page(() => <div>Hello</div>)
    const eversion2 = Eversion0.create({ id: 'test', base: server2 })
    expect(
      await eversion2.extract({
        location: Route0.getLocation(url),
        point: clientPoint02,
        requiredCtx: { r: 'str' },
      }),
    ).toEqual({
      ctx: {
        r: 'str',
        a: 3,
        b: 2,
        c: 4,
      },
      payload: { data: {}, meta: { title: 'Hello, world!' }, location: Route0.getLocation(url) },
      error: undefined,
      status: 200,
    })
    const server3 = server1.ctx(({ ctx }) => ({
      r: ctx.r,
      c: 5,
    }))
    const clientPoint03 = Point0.extend<typeof server3>().page(() => <div>Hello</div>)
    const eversion3 = Eversion0.create({ id: 'test', base: server3 })
    expect(
      await eversion3.extract({
        location: Route0.getLocation(url),
        point: clientPoint03,
        requiredCtx: { r: 'str' },
      }),
    ).toEqual({
      ctx: {
        r: 'str',
        c: 5,
      },
      payload: { data: {}, meta: { title: 'Hello, world!' }, location: Route0.getLocation(url) },
      error: undefined,
      status: 200,
    })
  })

  // it('getSuitableReactNode', async () => {
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   const server = Point0.server()
  //   const clientPage1 = Point0.client<typeof server>()
  //     .route(Route0.create('/hello/:name'))
  //     .page(({ location }) => <div>Hello, {location.params.name}</div>)
  //   const clientPage2 = Point0.client<typeof server>()
  //     .route(Route0.create('/bye/:name'))
  //     .page(({ location }) => <div>Bye, {location.params.name}</div>)
  //   const points: PagesCollection = [
  //     [clientPage1.getRoute(), async () => clientPage1],
  //     [clientPage2.getRoute(), clientPage2],
  //   ]
  //   const { element: reactEl1 } = await Point0.extractSuitablePageElement({ routePath: '/hello/world', points })
  //   expect(React.isValidElement(reactEl1)).toBe(true)
  //   const html1 = renderToStaticMarkup(reactEl1)
  //   expect(html1).toBe('<div>Hello, world</div>')
  //   const { element: reactEl2 } = await Point0.extractSuitablePageElement({ routePath: '/bye/bye', points })
  //   expect(React.isValidElement(reactEl2)).toBe(true)
  //   const html2 = renderToStaticMarkup(reactEl2)
  //   expect(html2).toBe('<div>Bye, bye</div>')
  // })

  it('creates an empty instance', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const server = Point0.create()
    const clientPoint0 = Point0.extend<typeof server>()
    expect(clientPoint0).toBeInstanceOf(Point0)
    expectTypeOf(clientPoint0).toEqualTypeOf<Point0<typeof server>>()
    expectTypeOf(clientPoint0).toEqualTypeOf<Point0<typeof server, UndefinedCtx, EmptyCtx, EmptyData>>()
    expect(clientPoint0._extendFns).toEqual([])
  })

  it('creates ready page', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const server = Point0.create()
      .ctx(() => ({
        a: 1,
        b: 2,
        say: async (text: string) => `server says ${text}!`,
        hello: (name: string) => `server says hello to ${name}!`,
      }))
      .loader(({ data, ctx }) => ({
        preloadedServer: 10,
      }))
    const clientPoint0 = Point0.extend<typeof server>()
      // ctx is client only in ctx fns
      .ctx(({ ctx }) => ({
        ...ctx,
        addedToServerFromClient: 'something',
      }))
      .ctx(({ ctx }) => ({
        ...ctx,
        hello: (name: string) => `client says hello to ${name}!`,
        b: 'b',
        sum: async (a: number, b: number) => a + b,
      }))
      // but in loaders ctx is both server and client
      .loader(async ({ ctx, data, location }) => ({
        ...data,
        preloadedClient: 'something',
        preloadedClientFromServer: await ctx.say('something good'),
      }))
    const routeX = Route0.create('/my/:id')
    const pageX = clientPoint0
      .route(routeX)
      .ctx(({ ctx, location }) => ({
        ...ctx,
        loadedCtxAfterRoute: `something: ${location.params.id}`,
      }))
      .loader(({ data, location }) => ({
        ...data,
        loadedDataAfterRoute: `something: ${location.params.id}`,
      }))
      .page(({ data, location }) => {
        expectTypeOf(location).toEqualTypeOf<Route0.Location<typeof routeX>>()
        expectTypeOf(data).toEqualTypeOf<{
          loadedDataAfterRoute: string
          preloadedClient: string
          preloadedClientFromServer: string
          preloadedServer: number
        }>()
        return (
          <div>
            <pre>DATA: {JSON.stringify(data, null, 2)}</pre>
            <pre>LOCATION: {JSON.stringify(location, null, 2)}</pre>
          </div>
        )
      })
    expect(pageX.getRoute()).toEqual(routeX)
    expect(pageX.getPageComponent()).toEqual(expect.any(Function))
  })
})

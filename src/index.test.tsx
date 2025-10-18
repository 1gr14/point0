import { Route0 } from '@devp0nt/route0'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { EmptyCtx, EmptyData, PagesCollection, UndefinedCtx } from './index.js'
import { Point0 } from './index.js'

describe('Point0', () => {
  const testDir = nodePath.join(__dirname, 'test-temp')

  beforeEach(() => {
    nodeFs.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    nodeFs.rmSync(testDir, { recursive: true, force: true })
  })

  it('creates an empty instance', () => {
    const serverPoint0 = new Point0()
    expect(serverPoint0).toBeInstanceOf(Point0)
    expectTypeOf(serverPoint0).toEqualTypeOf<Point0>()
    expectTypeOf(serverPoint0).toEqualTypeOf<Point0<undefined, undefined, EmptyCtx, EmptyData>>()
    expect(serverPoint0._extendFns).toEqual([])
  })

  it('extends with ctx fn', () => {
    const serverPoint0 = new Point0()
    const serverPoint01 = serverPoint0.ctx(() => ({
      a: 1,
      b: 2,
    }))
    expect(serverPoint01).toBeInstanceOf(Point0)

    expectTypeOf(serverPoint01).toEqualTypeOf<Point0<undefined, undefined, { a: number; b: number }, EmptyData>>()
    expect(serverPoint01._extendFns).toHaveLength(1)
    // not modified original serverPoint0
    expect(serverPoint0._extendFns).toHaveLength(0)
    const serverPoint02 = serverPoint01.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    expect(serverPoint02).toBeInstanceOf(Point0)

    expectTypeOf(serverPoint02).toEqualTypeOf<
      Point0<undefined, undefined, { a: number; b: number; c: number }, EmptyData>
    >()
    expect(serverPoint02._extendFns).toHaveLength(2)
    // not modified original serverPoint01
    expect(serverPoint01._extendFns).toHaveLength(1)
    // not modified original serverPoint0
    expect(serverPoint0._extendFns).toHaveLength(0)
  })

  it('extends with loader fn', () => {
    const serverPoint0 = new Point0()
    const serverPoint01 = serverPoint0.loader(() => ({
      a: 1,
      b: 2,
    }))
    expect(serverPoint01).toBeInstanceOf(Point0)
    expectTypeOf(serverPoint01).toEqualTypeOf<
      Point0<undefined, undefined, EmptyCtx, { a: number; b: number }, undefined, false>
    >()
    expect(serverPoint01._extendFns).toHaveLength(1)
    // not modified original serverPoint0
    expect(serverPoint0._extendFns).toHaveLength(0)
    const serverPoint02 = serverPoint01.loader(({ data }) => ({
      ...data,
      a: 3,
      c: 4,
    }))
    expect(serverPoint02).toBeInstanceOf(Point0)
    expectTypeOf(serverPoint02).toEqualTypeOf<
      Point0<undefined, undefined, EmptyCtx, { a: number; b: number; c: number }, undefined, false>
    >()
    expect(serverPoint02._extendFns).toHaveLength(2)
    // not modified original serverPoint01
    expect(serverPoint01._extendFns).toHaveLength(1)
    // not modified original serverPoint0
    expect(serverPoint0._extendFns).toHaveLength(0)
  })

  it('extract without required ctx', async () => {
    const serverPoint0 = new Point0()
    const url = '/z/x/c'
    const serverPoint01 = serverPoint0.ctx(() => ({
      a: 1,
      b: 2,
    }))
    const clientPoint01 = new Point0<typeof serverPoint01>().route(Route0.create('/')).page((x) => <div>Hello</div>)
    expect(
      await Point0.extract({
        location: Route0.getLocation(url),
        point: clientPoint01,
        server: serverPoint01,
        requiredCtx: undefined,
      }),
    ).toEqual({
      ctx: {
        a: 1,
        b: 2,
      },
      data: {},
    })
    const serverPoint02 = serverPoint01.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    const clientPoint02 = new Point0<typeof serverPoint02>().page(() => <div>Hello</div>)
    expect(
      await Point0.extract({
        point: clientPoint02,
        server: serverPoint02,
        location: Route0.getLocation(url),
        requiredCtx: undefined,
      }),
    ).toEqual({
      ctx: {
        a: 3,
        b: 2,
        c: 4,
      },
      data: {},
    })
    const serverPoint03 = serverPoint01.ctx(({ ctx }) => ({
      c: 5,
    }))
    const clientPoint03 = new Point0<typeof serverPoint03>().page(() => <div>Hello</div>)
    expect(
      await Point0.extract({
        server: serverPoint03,
        point: clientPoint03,
        location: Route0.getLocation(url),
      }),
    ).toEqual({
      ctx: {
        c: 5,
      },
      data: {},
    })
  })

  it('extract ctx with required ctx input', async () => {
    const serverPoint0 = new Point0().requireCtx<{ r: string }>()
    const url = '/z/x/c'
    const serverPoint01 = serverPoint0.ctx(({ ctx }) => ({
      ...ctx,
      a: 1,
      b: 2,
    }))
    const clientPoint01 = new Point0<typeof serverPoint01>().route(Route0.create('/')).page(() => <div>Hello</div>)
    expect(
      await Point0.extract({
        server: serverPoint01,
        location: Route0.getLocation(url),
        point: clientPoint01,
        requiredCtx: { r: 'str' },
      }),
    ).toEqual({
      ctx: {
        r: 'str',
        a: 1,
        b: 2,
      },
      data: {},
    })
    const serverPoint02 = serverPoint01.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    const clientPoint02 = new Point0<typeof serverPoint02>().page(() => <div>Hello</div>)
    expect(
      await Point0.extract({
        server: serverPoint02,
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
      data: {},
    })
    const serverPoint03 = serverPoint01.ctx(({ ctx }) => ({
      r: ctx.r,
      c: 5,
    }))
    const clientPoint03 = new Point0<typeof serverPoint03>().page(() => <div>Hello</div>)
    expect(
      await Point0.extract({
        server: serverPoint03,
        location: Route0.getLocation(url),
        point: clientPoint03,
        requiredCtx: { r: 'str' },
      }),
    ).toEqual({
      ctx: {
        r: 'str',
        c: 5,
      },
      data: {},
    })
  })

  it('getSuitableReactNode', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const serverPoint0 = new Point0()
    const clientPage1 = new Point0<typeof serverPoint0>()
      .route(Route0.create('/hello/:name'))
      .page(({ location }) => <div>Hello, {location.params.name}</div>)
    const clientPage2 = new Point0<typeof serverPoint0>()
      .route(Route0.create('/bye/:name'))
      .page(({ location }) => <div>Bye, {location.params.name}</div>)
    const points: PagesCollection = [
      [clientPage1.getRoute(), async () => clientPage1],
      [clientPage2.getRoute(), clientPage2],
    ]
    const { element: reactEl1 } = await Point0.extractSuitablePageElement({ routePath: '/hello/world', points })
    expect(React.isValidElement(reactEl1)).toBe(true)
    const html1 = renderToStaticMarkup(reactEl1)
    expect(html1).toBe('<div>Hello, world</div>')
    const { element: reactEl2 } = await Point0.extractSuitablePageElement({ routePath: '/bye/bye', points })
    expect(React.isValidElement(reactEl2)).toBe(true)
    const html2 = renderToStaticMarkup(reactEl2)
    expect(html2).toBe('<div>Bye, bye</div>')
  })

  it('creates an empty instance', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const serverPoint0 = new Point0()
    const clientPoint0 = new Point0<typeof serverPoint0>()
    expect(clientPoint0).toBeInstanceOf(Point0)
    expectTypeOf(clientPoint0).toEqualTypeOf<Point0<typeof serverPoint0>>()
    expectTypeOf(clientPoint0).toEqualTypeOf<Point0<typeof serverPoint0, UndefinedCtx, EmptyCtx, EmptyData>>()
    expect(clientPoint0._extendFns).toEqual([])
  })

  it('creates ready page', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const serverPoint0 = new Point0()
      .ctx(() => ({
        a: 1,
        b: 2,
        say: async (text: string) => `server says ${text}!`,
        hello: (name: string) => `server says hello to ${name}!`,
      }))
      .loader(({ data, ctx }) => ({
        preloadedServer: 10,
      }))
    const clientPoint0 = new Point0<typeof serverPoint0>()
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

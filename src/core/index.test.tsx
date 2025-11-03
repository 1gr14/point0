import { Route0 } from '@devp0nt/route0'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Eversion } from './eversion.js'
import { Point0 } from './index.js'
import type {
  AnyPoint,
  EmptyCtx,
  UndefinedCtx,
  UndefinedData,
  UndefinedInferredRootSourcePoint,
  UndefinedInputSchema,
  UndefinedProps,
  UndefinedQueryResultType,
  UndefinedResponseOutput,
  UndefinedRoute,
  UndefinedRouteDefinition,
} from './types.js'
import { Points } from './points.js'

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
    const server = Point0.source('server')
    expect(server).toBeInstanceOf(Point0)
    expectTypeOf(server).toEqualTypeOf<
      Point0<
        'middleware',
        'base',
        UndefinedInferredRootSourcePoint,
        UndefinedCtx,
        EmptyCtx,
        UndefinedData,
        UndefinedData,
        UndefinedRouteDefinition,
        UndefinedRouteDefinition,
        UndefinedInputSchema,
        UndefinedResponseOutput,
        UndefinedQueryResultType,
        UndefinedProps
      >
    >()
    expect(server._extractFns).toEqual([])
  })

  it('extends with ctx fn', () => {
    const server = Point0.source('server')
    const server1 = server.ctx(() => ({
      a: 1,
      b: 2,
    }))
    expect(server1).toBeInstanceOf(Point0)

    expectTypeOf(server1).toEqualTypeOf<
      Point0<
        'middleware',
        'base',
        UndefinedInferredRootSourcePoint,
        UndefinedCtx,
        { a: number; b: number },
        UndefinedData,
        UndefinedData,
        UndefinedRouteDefinition,
        UndefinedRouteDefinition,
        UndefinedInputSchema,
        UndefinedResponseOutput,
        UndefinedQueryResultType,
        UndefinedProps
      >
    >()
    expect(server1._extractFns).toHaveLength(1)
    // not modified original server
    expect(server._extractFns).toHaveLength(0)
    const server2 = server1.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    expect(server2).toBeInstanceOf(Point0)

    expectTypeOf(server2).toEqualTypeOf<
      Point0<
        'middleware',
        'base',
        undefined,
        undefined,
        { a: number; b: number; c: number },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      >
    >()
    expect(server2._extractFns).toHaveLength(2)
    // not modified original server1
    expect(server1._extractFns).toHaveLength(1)
    // not modified original server
    expect(server._extractFns).toHaveLength(0)
  })

  it('extends with ctx with {}', async () => {
    const server = Point0.source('server')
    const server1 = server
      .ctx(() => ({
        a: 1,
        b: 2,
      }))
      .base()
    expect(server1).toBeInstanceOf(Point0)

    expectTypeOf(server1).toEqualTypeOf<
      Point0<
        'base',
        undefined,
        undefined,
        undefined,
        { a: number; b: number },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      >
    >()
    expect(server1._extractFns).toHaveLength(1)
    // not modified original server
    expect(server._extractFns).toHaveLength(0)
    const server2 = server1
      .ctx({
        a: 3,
        c: 4,
      })
      .base()
    expect(server2).toBeInstanceOf(Point0)

    expectTypeOf(server2).toEqualTypeOf<
      Point0<
        'base',
        undefined,
        undefined,
        undefined,
        { a: number; c: number },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      >
    >()
    expect(server2._extractFns).toHaveLength(2)
    // not modified original server1
    expect(server1._extractFns).toHaveLength(1)
    // not modified original server
    expect(server._extractFns).toHaveLength(0)
    const pageComponent = () => <div>Hello</div>
    const clientPointBase02 = Point0.connect<typeof server2>('client').base()
    const clientPoint02 = clientPointBase02.lets('page', 'page').route(Route0.create('/')).page(pageComponent)
    const eversion2 = await Eversion.create({ root: server2 })
    const eversion2Connection = await eversion2.connect({
      root: clientPointBase02,
      points: Points.ready([clientPoint02]),
    })
    const run = await eversion2Connection.createRun({ pageLocation: Route0.getLocation('/'), requiredCtx: undefined })
    const x: AnyPoint = clientPoint02
    x._route.get()
    expect(await run.extract({ point: clientPoint02, input: {} })).toEqual({
      ctx: {
        a: 3,
        b: 2,
        c: 4,
      },
      data: {},
      head: [],
      error: undefined,
      status: 200,
      response: undefined,
    })
  })

  it('extends with loader fn', () => {
    const server = Point0.source('server')
    const server1 = server
      .loader(() => ({
        a: 1,
        b: 2,
      }))
      .base()
    expect(server1).toBeInstanceOf(Point0)
    expectTypeOf(server1).toEqualTypeOf<
      Point0<
        'base',
        undefined,
        undefined,
        undefined,
        EmptyCtx,
        { a: number; b: number },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      >
    >()
    expect(server1._extractFns).toHaveLength(1)
    // not modified original server
    expect(server._extractFns).toHaveLength(0)
    const server2 = server1
      .loader(({ data }) => ({
        ...data,
        a: 3,
        c: 4,
      }))
      .base()
    expect(server2).toBeInstanceOf(Point0)
    expectTypeOf(server2).toEqualTypeOf<
      Point0<
        'base',
        undefined,
        undefined,
        undefined,
        EmptyCtx,
        { a: number; b: number; c: number },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      >
    >()
    expect(server2._extractFns).toHaveLength(2)
    // not modified original server1
    expect(server1._extractFns).toHaveLength(1)
    // not modified original server
    expect(server._extractFns).toHaveLength(0)
  })

  it('extract without required ctx', async () => {
    const server = Point0.source('server')
    const url = '/z/x/c'
    const server1 = server
      .ctx(() => ({
        a: 1,
        b: 2,
      }))
      .base()
    const pageComponent = () => <div>Hello</div>
    const clientPointBase01 = Point0.connect<typeof server1>('client').base()
    const clientPoint01 = clientPointBase01.lets('page', 'page').route(Route0.create('/')).page(pageComponent)
    expectTypeOf<(typeof clientPoint01)['Infer']['QueryResultType']>().toEqualTypeOf<undefined>()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const clientPoint011 = clientPointBase01
      .lets('page', 'page')
      .route(Route0.create('/'))
      .loader(() => ({}))
      .page(({ query }) => <div>Hello</div>)
    expectTypeOf<(typeof clientPoint011)['Infer']['QueryResultType']>().toEqualTypeOf<'query'>()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const clientPoint0111 = clientPointBase01
      .lets('page', 'page')
      .route(Route0.create('/'))
      .infiniteQuery(() => ({ x: 1 }), {
        initialPageParam: 0,
        getNextPageParam: () => 1,
        pageParamInputKey: 'page',
      })
      .page(({ query }) => <div>Hello{query.data.pages[0].x}</div>)
    expectTypeOf<(typeof clientPoint0111)['Infer']['QueryResultType']>().toEqualTypeOf<'infiniteQuery'>()

    const eversion1 = await Eversion.create({ root: server1 })
    const eversion1Connection = await eversion1.connect({
      root: clientPointBase01,
      points: Points.ready([clientPoint01]),
    })
    const run = await eversion1Connection.createRun({ pageLocation: Route0.getLocation(url), requiredCtx: undefined })
    expect(await run.extract({ point: clientPoint01, input: {} })).toEqual({
      ctx: {
        a: 1,
        b: 2,
      },
      data: {},
      head: [],
      error: undefined,
      status: 200,
      response: undefined,
    })
    const server2 = server1.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    const clientPointBase02 = Point0.connect<typeof server2>('client').base()
    const clientPoint02 = clientPointBase02.lets('page', 'page').route(Route0.create('/')).page(pageComponent)
    const eversion2 = await Eversion.create({ root: server2 })
    const eversion2Connection = await eversion2.connect({
      root: clientPointBase02,
      points: Points.ready([clientPoint02]),
    })
    const run2 = await eversion2Connection.createRun({ pageLocation: Route0.getLocation(url), requiredCtx: undefined })
    expect(await run2.extract({ point: clientPoint02, input: {} })).toEqual({
      ctx: {
        a: 3,
        b: 2,
        c: 4,
      },
      data: {},
      head: [],
      error: undefined,
      status: 200,
      response: undefined,
    })
    const server3 = server1.ctx(({ ctx }) => ({
      c: 5,
    }))
    const clientPointBase03 = Point0.connect<typeof server3>('client').base()
    const clientPoint03 = clientPointBase03.lets('page', 'page').route(Route0.create('/')).page(pageComponent)
    const eversion3 = await Eversion.create({ root: server3 })
    const eversion3Connection = await eversion3.connect({
      root: clientPointBase03,
      points: Points.ready([clientPoint03]),
    })
    const run3 = await eversion3Connection.createRun({ pageLocation: Route0.getLocation(url), requiredCtx: undefined })
    expect(
      await run3.extract({
        point: clientPoint03,
        input: {},
      }),
    ).toEqual({
      ctx: {
        c: 5,
      },
      data: {},
      head: [],
      error: undefined,
      status: 200,
      response: undefined,
    })
  })

  it('extract ctx with required ctx input', async () => {
    const server = Point0.source('server').requireCtx<{ r: string }>().base()
    const url = '/z/x/c'
    const server1 = server.ctx(({ ctx }) => ({
      ...ctx,
      a: 1,
      b: 2,
    }))
    const pageComponent = () => <div>Hello</div>
    const clientPointBase01 = Point0.connect<typeof server1>('client').base()
    const clientPoint01 = clientPointBase01.lets('page', 'page').route(Route0.create('/')).page(pageComponent)
    const eversion1 = await Eversion.create({ root: server1 })
    const eversion1Connection = await eversion1.connect({
      root: clientPointBase01,
      points: Points.ready([clientPoint01]),
    })
    const run1 = await eversion1Connection.createRun({
      pageLocation: Route0.getLocation(url),
      requiredCtx: { r: 'str' },
    })
    expect(
      await run1.extract({
        point: clientPoint01,
        input: {},
      }),
    ).toEqual({
      ctx: {
        r: 'str',
        a: 1,
        b: 2,
      },
      data: {},
      head: [],
      error: undefined,
      status: 200,
      response: undefined,
    })
    const server2 = server1.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    const clientPointBase02 = Point0.connect<typeof server2>('client').base()
    const clientPoint02 = clientPointBase02.lets('page', 'page').route(Route0.create('/')).page(pageComponent)
    const eversion2 = await Eversion.create({ root: server2 })
    const eversion2Connection = await eversion2.connect({
      root: clientPointBase02,
      points: Points.ready([clientPoint02]),
    })
    const run2 = await eversion2Connection.createRun({
      pageLocation: Route0.getLocation(url),
      requiredCtx: { r: 'str' },
    })
    expect(await run2.extract({ point: clientPoint02, input: {} })).toEqual({
      ctx: {
        r: 'str',
        a: 3,
        b: 2,
        c: 4,
      },
      data: {},
      head: [],
      error: undefined,
      status: 200,
      response: undefined,
    })
    const server3 = server1.ctx(({ ctx }) => ({
      r: ctx.r,
      c: 5,
    }))
    const clientPointBase03 = Point0.connect<typeof server3>('client').base()
    const clientPoint03 = clientPointBase03.lets('page', 'page').route(Route0.create('/')).page(pageComponent)
    const eversion3 = await Eversion.create({ root: server3 })
    const eversion3Connection = await eversion3.connect({
      root: clientPointBase03,
      points: Points.ready([clientPoint03]),
    })
    const run3 = await eversion3Connection.createRun({
      pageLocation: Route0.getLocation(url),
      requiredCtx: { r: 'str' },
    })
    expect(await run3.extract({ point: clientPoint03, input: {} })).toEqual({
      ctx: {
        r: 'str',
        c: 5,
      },
      data: {},
      head: [],
      error: undefined,
      status: 200,
      response: undefined,
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
    const server = Point0.source('server')
    const clientPoint0 = Point0.connect<typeof server>('client')
    expect(clientPoint0).toBeInstanceOf(Point0)
    expectTypeOf(clientPoint0).toEqualTypeOf<
      Point0<
        'middleware',
        'base',
        typeof server,
        UndefinedCtx,
        EmptyCtx,
        undefined,
        undefined,
        UndefinedRoute,
        UndefinedRoute,
        UndefinedInputSchema,
        UndefinedResponseOutput,
        UndefinedQueryResultType,
        UndefinedProps
      >
    >()
    expect(clientPoint0._extractFns).toEqual([])
  })

  it('creates ready page', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const server = Point0.source('server')
      .ctx(() => ({
        a: 1,
        b: 2,
        say: async (text: string) => `server says ${text}!`,
        hello: (name: string) => `server says hello to ${name}!`,
      }))
      .loader(({ data, ctx }) => ({
        preloadedServer: 10,
      }))
    const clientPoint0 = Point0.connect<typeof server>('client')
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
      .loader(async ({ ctx, data }) => ({
        ...data,
        preloadedClient: 'something',
        preloadedClientFromServer: await ctx.say('something good'),
      }))
    const routeX = Route0.create('/my/:id')
    const pageX = clientPoint0
      .route(routeX)
      .ctx(({ ctx, input }) => ({
        ...ctx,
        // TODO: fix it
        loadedCtxAfterRoute: `something: ${input.id}`,
      }))
      .loader(({ data, input }) => ({
        ...data,
        loadedDataAfterRoute: `something: ${input.id}`,
      }))
      .page(({ data, location }) => {
        // expectTypeOf(location).toEqualTypeOf<LocationExact<typeof routeX>>()
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
    expect(pageX._route).toEqual(routeX)
    expect(pageX._page).toEqual(expect.any(Function))
  })
})

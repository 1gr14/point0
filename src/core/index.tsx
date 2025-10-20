import { Route0 } from '@devp0nt/route0'
import type { ReactDOMServerReadableStream, RenderToReadableStreamOptions } from 'react-dom/server'

export class Point0<
  TServer extends Server | UndefinedServer = UndefinedServer,
  TIsClient extends IsClient = false,
  TRequiredCtx extends RequiredCtx = UndefinedCtx,
  TOutputCtx extends Ctx = InferOutputCtx<TServer>,
  TOutputData extends Data = InferOutputData<TServer>,
  TRoute extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute,
  THasPage extends HasPage = HasPageFalse, // TODO: replace with end type and it will be 'endpoint' ro 'page'
> {
  Infer: Infer<TServer, TIsClient, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> = {} as never

  _extendFns: ExtendFnRecord[]
  _route: TRoute
  _page: THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined

  private constructor(props?: {
    _extendFns?: ExtendFnRecord[]
    _route?: TRoute
    _page?: THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined
  }) {
    this._extendFns = props?._extendFns ?? []
    this._route = props?._route ?? (undefined as TRoute)
    this._page = props?._page ?? (undefined as THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined)
  }

  _clone<
    TServer extends Server | UndefinedServer,
    TIsClient extends IsClient,
    TRequiredCtx extends RequiredCtx,
    TOutputCtx extends Ctx,
    TOutputData extends Data,
    TRoute extends Route0.AnyRoute | UndefinedRoute,
    THasPage extends HasPage,
  >(overrides?: {
    _extendFns?: ExtendFnRecord[]
    _route?: Route0.AnyRoute | UndefinedRoute
    _page?: PageComponent | UndefinedPageComponent
  }): Point0<TServer, TIsClient, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return new Point0<TServer, TIsClient, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _extendFns: overrides?._extendFns ?? this._extendFns,
      _route: (overrides?._route ?? this._route) as TRoute,
      _page: (overrides?._page ?? this._page) as THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined,
    })
  }

  // base

  static client<TServer extends Server | UndefinedServer = UndefinedServer>(): Point0<TServer, true> {
    return new Point0<TServer, true>()
  }

  static server(): Point0<UndefinedServer, false> {
    return new Point0<UndefinedServer, false>()
  }

  // setters

  requireCtx<TExtraRequiredCtx extends Ctx>(): Point0<
    TServer,
    TIsClient,
    AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
    PrependCtx<TOutputCtx, TExtraRequiredCtx>,
    TOutputData,
    TRoute,
    THasPage
  > {
    const newPoint = new Point0<
      TServer,
      TIsClient,
      AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
      PrependCtx<TOutputCtx, TExtraRequiredCtx>,
      TOutputData,
      TRoute,
      THasPage
    >()
    newPoint._extendFns.push(...this._extendFns)
    newPoint._route = this._route
    newPoint._page = this._page
    return newPoint
  }

  ctx<TNewOutputCtx extends Ctx = Ctx>(
    ctxFn: CtxFn<TOutputCtx, TOutputData, CurrentRoute<TRoute>, TNewOutputCtx>,
  ): Point0<TServer, TIsClient, TRequiredCtx, TNewOutputCtx, TOutputData, TRoute, THasPage>
  ctx<TNewOutputCtx extends Ctx = Ctx>(
    ctx: TNewOutputCtx,
  ): Point0<TServer, TIsClient, TRequiredCtx, TNewOutputCtx, TOutputData, TRoute, THasPage>
  ctx<TNewOutputCtx extends Ctx = Ctx>(
    ctxOrFn: TNewOutputCtx,
  ): Point0<TServer, TIsClient, TRequiredCtx, TNewOutputCtx, TOutputData, TRoute, THasPage> {
    const ctxFn = typeof ctxOrFn === 'function' ? ctxOrFn : () => ctxOrFn
    return this._clone<TServer, TIsClient, TRequiredCtx, TNewOutputCtx, TOutputData, TRoute, THasPage>({
      _extendFns: [...this._extendFns, { type: 'ctx', fn: ctxFn }],
    } as never)
  }

  loader<TNewOutputData extends Data = Data>(
    loaderFn: LoaderFn<TOutputCtx, TOutputData, CurrentRoute<TRoute>, TNewOutputData>,
  ): Point0<TServer, TIsClient, TRequiredCtx, TOutputCtx, TNewOutputData, TRoute, THasPage> {
    return this._clone<TServer, TIsClient, TRequiredCtx, TOutputCtx, TNewOutputData, TRoute, THasPage>({
      _extendFns: [...this._extendFns, { type: 'loader', fn: loaderFn }],
    } as never)
  }

  route<TNewRoute0 extends Route0.AnyRoute>(
    route: TNewRoute0,
  ): Point0<TServer, TIsClient, TRequiredCtx, TOutputCtx, TOutputData, TNewRoute0, THasPage> {
    return this._clone<TServer, TIsClient, TRequiredCtx, TOutputCtx, TOutputData, TNewRoute0, THasPage>({
      _route: route,
    } as never)
  }

  page<TPage extends PageComponent<TOutputData, TRoute>>(
    page: TPage,
  ): Point0<TServer, TIsClient, TRequiredCtx, TOutputCtx, TOutputData, CurrentRoute<TRoute>, true> {
    return this._clone<TServer, TIsClient, TRequiredCtx, TOutputCtx, TOutputData, CurrentRoute<TRoute>, true>({
      _page: page,
    } as never)
  }

  // getters

  getRoute(): TRoute {
    return this._route
  }

  getPageComponent(): THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined {
    return this._page
  }

  getExtendFns(): ExtendFnRecord[] {
    return this._extendFns
  }

  // TODO: move to eversion.ts
  // helpers

  static async getSuitable<TPointsCollection extends PointsCollection>({
    points,
    ...restProps
  }: {
    points: TPointsCollection
    // TODO: | { id: string }
  } & ({ routePath: string } | { location: Route0.Location })): Promise<{
    point: InferPointFromPointsCollection<TPointsCollection> | undefined
    location: Route0.Location
  }> {
    const location = 'location' in restProps ? restProps.location : Route0.getLocation(restProps.routePath)
    for (const [route, getPage] of points) {
      const match = Route0.getMatch(route, location)
      if (!match.exact) {
        continue
      }
      const point = getPage instanceof Point0 ? getPage : await getPage()
      return { point: point as InferPointFromPointsCollection<TPointsCollection> | undefined, location: match.location }
    }
    return { point: undefined, location }
  }

  static async extract<TPoint extends AnyPoint | undefined = undefined>({
    location,
    server,
    point,
    requiredCtx,
  }: WithServerRequiredCtx<InferServer<TPoint>> & {
    // TODO: location | routePath
    location: Route0.Location
    point?: TPoint
    server?: InferServer<TPoint>
  }): Promise<InferExtractResult<TPoint>> {
    let ctxOutput: Ctx = requiredCtx ?? {}
    let dataOutput: Data = {}
    const extendFns = [...(server?._extendFns ?? []), ...(point?._extendFns ?? [])]

    for (const extendFn of extendFns) {
      switch (extendFn.type) {
        case 'ctx':
          ctxOutput = await extendFn.fn({ ctx: { ...ctxOutput }, data: { ...dataOutput }, location })
          break
        case 'loader':
          dataOutput = await extendFn.fn({ ctx: { ...ctxOutput }, data: { ...dataOutput }, location })
          break
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        default:
          throw new Error(`Unknown extend function type: ${(extendFn as any).type}`)
      }
    }

    return { ctx: ctxOutput, data: dataOutput } as InferExtractResult<TPoint>
  }

  static async extractEndpoint<TPoint extends AnyPoint | undefined = undefined>({
    requiredCtx,
    server,
    client,
    point,
    ...restProps
  }: WithServerRequiredCtx<InferServer<TPoint>> & {
    server?: InferServer<TPoint> | UndefinedServer
    client?: AnyClient<InferServer<TPoint>>
    point?: TPoint | undefined
  } & ({ routePath: string } | { location: Route0.Location })): Promise<{
    status: number
    data: Data | undefined
    error: unknown
    location: Route0.Location
  }> {
    const location = 'location' in restProps ? restProps.location : Route0.getLocation(restProps.routePath)
    let data: Data = {}
    try {
      const extractResult = await Point0.extract({
        location,
        server,
        point,
        requiredCtx,
      } as WithServerRequiredCtx<InferServer<TPoint>> & {
        location: Route0.Location
        point?: TPoint
        server?: InferServer<TPoint>
        requiredCtx?: Ctx
      })
      data = extractResult.data
      if (!point) {
        return { data, error: new Error(`Endpoint Not Found: ${location.pathname}`), status: 404, location }
      }
      return { data, error: undefined, status: 200, location }
    } catch (error) {
      return { data, error, status: 500, location }
    }
  }

  static async extractPage<TPoint extends AnyPoint | undefined = undefined>({
    requiredCtx,
    server,
    client,
    point,
    ...restProps
  }: WithServerRequiredCtx<InferServer<TPoint>> & {
    server?: InferServer<TPoint> | UndefinedServer
    client?: AnyClient<InferServer<TPoint>>
    point?: TPoint | undefined
  } & ({ routePath: string } | { location: Route0.Location })): Promise<{
    status: number
    payload: Payload
    error: unknown
    location: Route0.Location
  }> {
    const location = 'location' in restProps ? restProps.location : Route0.getLocation(restProps.routePath)
    let data: Data = {}
    try {
      // TODO: make run result for each layout first, and then rend each one to each one
      // TODO: here
      // const payloads = []
      // for (const layout of point.layouts) {
      //   payloads.push( layout payload )
      // }
      const extractResult = await Point0.extract({
        location,
        server,
        point,
        requiredCtx,
      } as WithServerRequiredCtx<InferServer<TPoint>> & {
        location: Route0.Location
        point?: TPoint
        server?: InferServer<TPoint>
        requiredCtx?: Ctx
      })
      data = extractResult.data
      const payload = { location, data, meta: { title: 'Hello, world!' } }
      // TODO: payloads.push( page payload )
      if (!point) {
        return { payload, error: new Error(`Page not found: ${location.pathname}`), status: 404, location }
      }
      const PageComponent = point.getPageComponent()
      if (!PageComponent) {
        // TODO: use provided errors
        // TODO: return undefined element
        return { payload, error: new Error(`Endpoint has no page elemnt`), status: 404, location }
      }
      // TODO: <Layout1 data location><Layout2 data location><PageComponent data={data} location={location} /></Layout2></Layout1>
      // TODO: use provided meta
      return { payload, error: undefined, status: 200, location }
    } catch (error) {
      // TODO: use provided errors
      const payload = { location, data, meta: { title: 'Error' } }
      return { payload, error, status: 500, location }
    }
  }

  static async fillPage<TPoint extends AnyPoint | undefined = undefined>({
    server,
    client,
    point,
    payload,
    ...restProps
  }: {
    server?: InferServer<TPoint> | undefined
    client: AnyClient<InferServer<TPoint>>
    point: TPoint | undefined
    payload: Payload
  } & ({ routePath: string } | { location: Route0.Location })): Promise<{
    element: React.ReactElement
    status: number
    error: unknown
    location: Route0.Location
  }> {
    const location = 'location' in restProps ? restProps.location : Route0.getLocation(restProps.routePath)
    if (!point) {
      // TODO: use provided errors
      const element = <div>Page not found</div>
      return { element, error: new Error(`Page not found: ${location.pathname}`), status: 404, location }
    }
    const PageComponent = point.getPageComponent()
    if (!PageComponent) {
      // TODO: use provided errors
      const element = <div>Endpoint has no page elemnt</div>
      return { element, error: new Error(`Endpoint has no page elemnt`), status: 404, location }
    }
    const element = <PageComponent data={payload.data} location={payload.location} />
    // TODO: use provided meta
    return { element, error: undefined, status: 200, location }
  }
}

type Infer<
  TServer extends Server | UndefinedServer = UndefinedServer,
  TIsClient extends IsClient = IsClient,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute,
  THasPage extends HasPage = HasPageFalse,
> = {
  Server: TServer
  IsClient: TIsClient
  RequiredCtx: TRequiredCtx
  OutputCtx: TOutputCtx
  OutputData: TOutputData
  AssignedRoute0: TRoute
  HasPage: THasPage
}

export type HasPageTure = true
export type HasPageFalse = false
export type HasPage = boolean
export type IsClientTrue = true
export type IsClientFalse = false
export type IsClient = boolean

export type AnyPoint<
  TServer extends Server | UndefinedServer = Server | UndefinedServer,
  TIsClient extends IsClient = IsClient,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  THasPage extends HasPage = HasPage,
> = Point0<TServer, TIsClient, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>
export type ReadyPoint<
  TServer extends Server | UndefinedServer = Server | UndefinedServer,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  THasPage extends HasPage = HasPage,
> = AnyPoint<TServer, any, any, any, any, TRoute, THasPage>
export type AnyClient<TServer extends AnyServer | UndefinedServer = AnyServer | UndefinedServer> = AnyPoint<
  TServer,
  true,
  any,
  any,
  any,
  any,
  any
>
export type AnyServer = Server<any, false, any, any, any, any, any>

export type PagePoint<
  TServer extends Server | UndefinedServer = Server | UndefinedServer,
  TIsClient extends IsClient = IsClient,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  THasPage extends HasPage = HasPageTure,
> = Point0<TServer, TIsClient, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>

export type Server<
  TServer extends UndefinedServer = UndefinedServer,
  TIsClient extends IsClientFalse = IsClientFalse,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute,
  THasPage extends HasPage = HasPageFalse,
> = {
  Infer: Infer<TServer, TIsClient, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>
  _extendFns: ExtendFnRecord[]
}
export type UndefinedServer = undefined

export type InferOutputCtx<TPoint extends AnyPoint | Server | undefined> =
  TPoint extends AnyPoint<any, any, any, infer TOutputCtx, any, any, any>
    ? TOutputCtx
    : TPoint extends Server
      ? TPoint['Infer']['OutputCtx']
      : EmptyCtx
export type InferOutputData<TPoint extends AnyPoint | Server | undefined> =
  TPoint extends AnyPoint<any, any, any, any, infer TOutputData, any, any>
    ? TOutputData
    : TPoint extends Server
      ? TPoint['Infer']['OutputData']
      : EmptyData
// export type InferServer<TPoint extends AnyPoint | undefined> =
//   TPoint extends AnyPoint<Server> ? (TPoint extends AnyPoint<infer TServer> ? TServer : undefined) : undefined
export type InferServer<TPoint extends AnyPoint | undefined> =
  TPoint extends AnyPoint<infer TServer> ? TServer : undefined
export type InferExtractResult<TPoint extends AnyPoint | undefined = undefined> =
  TPoint extends AnyPoint<any, any, any, infer TOutputCtx, infer TOutputData, any, any>
    ? { ctx: TOutputCtx; data: TOutputData }
    : { ctx: EmptyCtx; data: EmptyData }
export type InferServerFromPointsCollection<TPointsCollection extends PointsCollection> =
  TPointsCollection extends PointsCollection<infer TServer> ? TServer : UndefinedServer
export type InferPointFromPointsCollection<TPointsCollection extends PointsCollection> =
  TPointsCollection extends PointsCollection<infer TServer> ? AnyPoint<TServer> : undefined
export type InferPagePointFromPointsCollection<TPointsCollection extends PointsCollection> =
  TPointsCollection extends PointsCollection<infer TServer> ? PagePoint<TServer> : undefined

export type WithRequiredCtx<TRequiredCtx extends RequiredCtx> = TRequiredCtx extends Ctx
  ? {
      requiredCtx: TRequiredCtx
    }
  : { requiredCtx?: undefined }

export type WithServerRequiredCtx<TServer extends Server | undefined> = TServer extends Server
  ? TServer['Infer']['RequiredCtx'] extends Ctx
    ? {
        requiredCtx: TServer['Infer']['RequiredCtx']
      }
    : { requiredCtx?: undefined }
  : { requiredCtx?: undefined }

export type PageComponentProps<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = { data: TOutputData; location: Route0.Location<CurrentRoute<TRoute>> }
export type PageComponent<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = React.ComponentType<PageComponentProps<TOutputData, TRoute>>
export type UndefinedPageComponent = undefined

export type CurrentRoute<TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute> =
  TRoute extends Route0.AnyRoute ? TRoute : Route0.AnyRoute

// TODO: add layouts here
export type PageLayout = React.ComponentType<{ children: React.ReactNode }>
export type PagesCollection<TServer extends Server | undefined = Server | undefined> = Array<
  [
    Route0.AnyRoute,
    (
      | PagePoint<TServer, any, any, any, any, any, true>
      | (() =>
          | Promise<PagePoint<TServer, any, any, any, any, any, true>>
          | PagePoint<TServer, any, any, any, any, any, true>)
    ),
  ]
>
export type PointsCollection<TServer extends Server | undefined = Server | undefined> = Array<
  [Route0.AnyRoute, ReadyPoint<TServer> | (() => Promise<ReadyPoint<TServer>> | ReadyPoint<TServer>)]
>

// TODO: unknown and undefined objects
export type UndefinedRoute = undefined
export type UnknownCtx = Record<string, unknown>
export type EmptyCtx = Record<string, unknown> // Record<string, never>
export type UndefinedCtx = undefined
export type RequiredCtx = UnknownCtx | UndefinedCtx
export type Ctx = UnknownCtx | EmptyCtx
export type EmptyData = Record<string, unknown> // Record<string, never>
export type UnknownData = Record<string, unknown>
export type UndefinedData = undefined
export type Data = UnknownData | EmptyData

export type AppendCtx<TCtx extends UnknownCtx | UndefinedCtx, TAppend extends UnknownCtx> = TCtx extends Ctx
  ? Omit<TCtx, keyof TAppend> & TAppend
  : TAppend
export type PrependCtx<TCtx extends UnknownCtx | UndefinedCtx, TPrepend extends UnknownCtx> = TCtx extends Ctx
  ? Omit<TPrepend, keyof TCtx> & TPrepend
  : TPrepend

export type CtxFnProps<
  TCtxInput extends Ctx = Ctx,
  TData extends Data = Data,
  TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
> = {
  ctx: TCtxInput
  data: TData
  location: Route0.Location<TRoute0>
}
export type CtxFn<
  TCtxInput extends Ctx = Ctx,
  TData extends Data = Data,
  TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
  TCtxOutput extends Ctx = Ctx,
> = (props: CtxFnProps<TCtxInput, TData, TRoute0>) => Promise<TCtxOutput> | TCtxOutput
export type CtxFnOutput<TCtxFn extends CtxFn> = Awaited<ReturnType<TCtxFn>>
export type InferCtxFnOutput<TCtxFn> = TCtxFn extends CtxFn<any, any, any, infer TCtxFnOutput> ? TCtxFnOutput : never

export type LoaderFnProps<
  TCtx extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = {
  ctx: TCtx
  data: TDataInput
  location: Route0.Location<CurrentRoute<TRoute0>>
}
export type LoaderFn<
  TCtx extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TDataOutput extends Data = Data,
> = (props: LoaderFnProps<TCtx, TDataInput, TRoute0>) => Promise<TDataOutput> | TDataOutput
export type LoaderFnOutput<TLoader extends LoaderFn> = Awaited<ReturnType<TLoader>>

export type ExtendFnRecord<
  TType extends 'ctx' | 'loader' = 'ctx' | 'loader',
  TCtxInput extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
  TOutput extends Ctx | Data = Ctx | Data,
> = TType extends 'ctx'
  ? { type: 'ctx'; fn: CtxFn<TCtxInput, TDataInput, TRoute0, TOutput> }
  : TType extends 'loader'
    ? { type: 'loader'; fn: LoaderFn<TCtxInput, TDataInput, TRoute0, TOutput> }
    : never

export type StaticRenderer = (reactNode: React.ReactNode) => string
export type ReadableStreamRenderer = (
  reactNode: React.ReactNode,
  options?: RenderToReadableStreamOptions,
) => Promise<ReactDOMServerReadableStream>
export type Payload = { location: Route0.Location; data: Record<string, any>; meta: MetaMap | MetaMap[] }

export type MetaMapPrimitiveValue = string | boolean | number | null | undefined
export type MetaMapRecordValue = Record<string, MetaMapPrimitiveValue>
export type MetaMapValue = MetaMapPrimitiveValue | MetaMapRecordValue
export type MetaMap = Record<string, MetaMapValue>

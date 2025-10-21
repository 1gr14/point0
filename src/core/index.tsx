import { Route0 } from '@devp0nt/route0'

export class Point0<
  TParent extends ParentPoint | UndefinedParent = UndefinedParent,
  TRequiredCtx extends RequiredCtx = UndefinedCtx,
  TOutputCtx extends Ctx = InferOutputCtx<TParent>,
  TOutputData extends Data = InferOutputData<TParent>,
  TRoute extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute,
  THasPage extends HasPage = HasPageFalse, // TODO: replace with end type and it will be 'endpoint' ro 'page' or 'layout' or 'component'
> {
  Infer: Infer<TRequiredCtx, TOutputCtx, TOutputData> = {} as never

  _extendFns: ExtendFnRecord[]
  _route: TRoute
  _page: THasPage extends true ? PageComponent<TOutputData, TRoute> : UndefinedPageComponent
  _id: Id | UndefinedId
  _method: Method | UndefinedMethod

  private constructor(props?: {
    _extendFns?: ExtendFnRecord[]
    _route?: TRoute
    _page?: THasPage extends true ? PageComponent<TOutputData, TRoute> : UndefinedPageComponent
    _id?: Id | UndefinedId
    _method?: Method | UndefinedMethod
  }) {
    this._extendFns = props?._extendFns ?? []
    this._route = props?._route ?? (undefined as TRoute)
    this._page = props?._page ?? (undefined as THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined)
    this._id = props?._id
    this._method = props?._method ?? (undefined as Method | UndefinedMethod)
  }

  _clone<
    TParent extends ParentPoint | UndefinedParent,
    TRequiredCtx extends RequiredCtx,
    TOutputCtx extends Ctx,
    TOutputData extends Data,
    TRoute extends Route0.AnyRoute | UndefinedRoute,
    THasPage extends HasPage,
  >(overrides?: {
    _extendFns?: ExtendFnRecord[]
    _route?: Route0.AnyRoute | UndefinedRoute
    _page?: PageComponent | UndefinedPageComponent
    _id?: Id | UndefinedId
    _method?: Method | UndefinedMethod
  }): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return new Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _extendFns: overrides?._extendFns ?? this._extendFns,
      _route: (overrides?._route ?? this._route) as TRoute,
      _page: (overrides?._page ?? this._page) as THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined,
      _id: overrides?._id ?? this._id,
      _method: overrides?._method ?? this._method,
    })
  }

  // base

  static create(): Point0 {
    return new Point0()
  }

  static extend<TParent extends ParentPoint>(): Point0<TParent, TParent['Infer']['RequiredCtx']> {
    return new Point0<TParent, TParent['Infer']['RequiredCtx']>()
  }

  // setters

  requireCtx<TExtraRequiredCtx extends Ctx>(): Point0<
    TParent,
    AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
    PrependCtx<TOutputCtx, TExtraRequiredCtx>,
    TOutputData,
    TRoute,
    THasPage
  > {
    const newPoint = new Point0<
      TParent,
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
  ): Point0<TParent, TRequiredCtx, TNewOutputCtx, TOutputData, TRoute, THasPage>
  ctx<TNewOutputCtx extends Ctx = Ctx>(
    ctx: TNewOutputCtx,
  ): Point0<TParent, TRequiredCtx, TNewOutputCtx, TOutputData, TRoute, THasPage>
  ctx<TNewOutputCtx extends Ctx = Ctx>(
    ctxOrFn: TNewOutputCtx,
  ): Point0<TParent, TRequiredCtx, TNewOutputCtx, TOutputData, TRoute, THasPage> {
    const ctxFn = typeof ctxOrFn === 'function' ? ctxOrFn : () => ctxOrFn
    return this._clone<TParent, TRequiredCtx, TNewOutputCtx, TOutputData, TRoute, THasPage>({
      _extendFns: [...this._extendFns, { type: 'ctx', fn: ctxFn }],
    } as never)
  }

  loader<TNewOutputData extends Data = Data>(
    loaderFn: LoaderFn<TOutputCtx, TOutputData, CurrentRoute<TRoute>, TNewOutputData>,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TNewOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TNewOutputData, TRoute, THasPage>({
      _extendFns: [...this._extendFns, { type: 'loader', fn: loaderFn }],
    } as never)
  }

  route<TNewRoute0 extends Route0.AnyRoute>(
    route: TNewRoute0,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TNewRoute0, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TNewRoute0, THasPage>({
      _route: route,
    } as never)
  }

  page<TPage extends PageComponent<TOutputData, TRoute>>(
    page: TPage,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, CurrentRoute<TRoute>, true> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, CurrentRoute<TRoute>, true>({
      _page: page,
    } as never)
  }

  // getters

  getRoute(): TRoute {
    return this._route
  }

  getId(): Id | UndefinedId {
    return this._id
  }

  getPageComponent(): THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined {
    return this._page
  }

  getExtendFns(): ExtendFnRecord[] {
    return this._extendFns
  }

  // TODO: move to eversion.ts
  // TODO: base and parent

  static idToLocation(id: string): Route0.Location {
    return Route0.getLocation(`/endpoints/${id}`)
  }

  static normalizeLocation(input: LocationInput): Route0.Location {
    const location = 'location' in input ? input.location : 'path' in input ? Route0.getLocation(input.path) : undefined
    if (location) {
      return location
    }
    const id = 'id' in input ? input.id : undefined
    if (id) {
      return Point0.idToLocation(id)
    }
    throw new Error('location or path or id is required')
  }

  static async getSuitable<TPointsCollection extends PointsCollection>({
    points,
    method: providedMethod,
    ...locationProps
  }: {
    points: TPointsCollection
    method: Method
  } & LocationInput): Promise<{
    point: ReadyPoint | undefined
    location: Route0.Location
  }> {
    const location = Point0.normalizeLocation(locationProps)
    for (const { method, route, point: getPoint } of points) {
      if (providedMethod.toLowerCase() !== method.toLowerCase()) {
        continue
      }
      const match = Route0.getMatch(route, location)
      if (!match.exact) {
        continue
      }
      const point = getPoint instanceof Point0 ? getPoint : await getPoint()
      return {
        point: point as ReadyPoint,
        location: match.location,
      }
    }
    return { point: undefined, location }
  }

  static async extract<TPoint extends InitialPoint>({
    point,
    requiredCtx,
    ...locationProps
  }: WithRequiredCtx<TPoint> & {
    point: TPoint
  } & LocationInput): Promise<InferExtractResult<TPoint>>
  static async extract<TPoint extends ExtendedPoint>({
    point,
    parent,
    requiredCtx,
    ...locationProps
  }: WithRequiredCtx<TPoint> & {
    point: TPoint
    parent: InferParent<TPoint>
  } & LocationInput): Promise<InferExtractResult<TPoint>>
  static async extract({
    point,
    parent,
    requiredCtx,
    ...locationProps
  }: WithRequiredCtx & {
    point: undefined
    parent: AnyPoint | undefined
  } & LocationInput): Promise<ExtractResult>
  static async extract({
    point,
    parent,
    requiredCtx,
    ...locationProps
  }: WithRequiredCtx & {
    parent: AnyPoint | undefined
    point: AnyPoint | undefined
  } & LocationInput): Promise<ExtractResult> {
    let ctxOutput: Ctx = requiredCtx ?? {}
    let dataOutput: Data = {}
    const extendFns = [...(parent?._extendFns ?? []), ...(point?._extendFns ?? [])]
    const location = Point0.normalizeLocation(locationProps)
    const meta = { title: 'Hello, world!' }
    // TODO: get status from real point data

    try {
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
      // TODO: parse meta
      if (point) {
        return { ctx: ctxOutput, payload: { data: dataOutput, meta, location }, error: undefined, status: 200 }
      } else {
        return {
          ctx: ctxOutput,
          payload: { data: dataOutput, meta, location },
          error: new Error(`Point Not Found: ${location.pathname}`),
          status: 404,
        }
      }
    } catch (error) {
      return { ctx: ctxOutput, payload: { data: dataOutput, meta, location }, error, status: 500 }
    }
  }

  static async fillPage<TPoint extends AnyPoint | undefined = undefined>({
    base,
    point,
    error,
    status,
    payload,
    ...locationProps
  }: {
    base: AnyPoint
    point: TPoint | undefined
    payload: PagePayload
    error?: unknown
    status?: number | undefined
  } & LocationInput): Promise<{
    element: React.ReactElement
    status: number | undefined
    error: unknown
    location: Route0.Location
  }> {
    const location = Point0.normalizeLocation(locationProps)
    if (error) {
      const element = <div>Error: {(error as Error).message}</div>
      return { element, error, status, location }
    }
    if (!point) {
      // TODO: use provided errors
      const element = <div>Page not found</div>
      return { element, error: new Error(`Page not found: ${location.pathname}`), status: 404, location }
    }
    const PageComponent = point.getPageComponent()
    if (!PageComponent) {
      // TODO: use provided errors
      const element = <div>Point has no page element</div>
      return { element, error: new Error(`Point has no page element`), status: 404, location }
    }
    const element = <PageComponent data={payload.data} location={location} />
    // TODO: use provided meta
    return { element, error: undefined, status, location }
  }
}

// used to avoid circular depedencies
type Infer<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = Data,
> = {
  RequiredCtx: TRequiredCtx
  OutputCtx: TOutputCtx
  OutputData: TOutputData
}

export type HasPageTure = true
export type HasPageFalse = false
export type HasPage = boolean
export type IsClientTrue = true
export type IsClientFalse = false
export type IsClient = boolean

export type Method = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'
export type UndefinedMethod = undefined
export type Id = string
export type UndefinedId = undefined

export type AnyPoint<
  TParent extends ParentPoint | UndefinedParent = ParentPoint | UndefinedParent,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  THasPage extends HasPage = HasPage,
> = Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>
export type InitialPoint<
  TParent extends UndefinedParent = UndefinedParent,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  THasPage extends HasPage = HasPage,
> = AnyPoint<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>
export type ExtendedPoint<
  TParent extends ParentPoint = ParentPoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  THasPage extends HasPage = HasPage,
> = AnyPoint<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>
export type PagePoint<
  TParent extends ParentPoint | UndefinedParent = ParentPoint | UndefinedParent,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  THasPage extends HasPageTure = HasPageTure,
> = AnyPoint<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>
export type ReadyPoint<
  TParent extends ParentPoint | UndefinedParent = ParentPoint | UndefinedParent,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  THasPage extends HasPageTure = HasPageTure,
> = AnyPoint<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>
export type ParentPoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
> = {
  Infer: Infer<TRequiredCtx, TOutputCtx, TOutputData>
  _extendFns: ExtendFnRecord[]
}
export type UndefinedParent = undefined

export type InferOutputCtx<TPoint extends AnyPoint | ParentPoint | undefined> =
  TPoint extends AnyPoint<any, any, infer TOutputCtx, any, any, any>
    ? TOutputCtx
    : TPoint extends ParentPoint
      ? TPoint['Infer']['OutputCtx']
      : EmptyCtx
export type InferOutputData<TPoint extends AnyPoint | ParentPoint | undefined> =
  TPoint extends AnyPoint<any, any, any, infer TOutputData, any, any>
    ? TOutputData
    : TPoint extends ParentPoint
      ? TPoint['Infer']['OutputData']
      : EmptyData
export type InferParent<TPoint extends AnyPoint | undefined> =
  TPoint extends AnyPoint<infer TParent> ? TParent : undefined
export type ExtractResult<TOutputCtx extends Ctx = Ctx, TOutputData extends Data = Data> = {
  ctx: TOutputCtx
  payload: { data: TOutputData; meta: MetaMap; location: Route0.Location }
  error: unknown
  status: number | undefined
}
export type InferExtractResult<TPoint extends AnyPoint> =
  TPoint extends AnyPoint<any, any, infer TOutputCtx, infer TOutputData, any, any>
    ? ExtractResult<TOutputCtx, TOutputData>
    : ExtractResult<EmptyCtx, EmptyData>

export type WithRequiredCtx<TBasePoint extends AnyPoint = AnyPoint<any, Ctx> | AnyPoint<any, UndefinedCtx>> =
  TBasePoint extends AnyPoint
    ? TBasePoint['Infer']['RequiredCtx'] extends Ctx
      ? {
          requiredCtx: TBasePoint['Infer']['RequiredCtx']
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

export type PagesCollectionRecord = {
  route: Route0.AnyRoute
  component: (() => Promise<PageComponent> | (() => PageComponent)) | PageComponent
}
export type PagesCollection = PagesCollectionRecord[]
export type PointsCollectionRecord = {
  method: Method
  route: Route0.AnyRoute
  point: (() => Promise<ReadyPoint> | (() => ReadyPoint)) | ReadyPoint
}
export type PointsCollection = PointsCollectionRecord[]
export type LocationInput = { path: string } | { location: Route0.Location } | { id: string }

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

export type PagePayload = { location: Route0.Location; data: Record<string, any>; meta: MetaMap | MetaMap[] }

export type MetaMapPrimitiveValue = string | boolean | number | null | undefined
export type MetaMapRecordValue = Record<string, MetaMapPrimitiveValue>
export type MetaMapValue = MetaMapPrimitiveValue | MetaMapRecordValue
export type MetaMap = Record<string, MetaMapValue>

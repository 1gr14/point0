import type { Error0 } from '@devp0nt/error0'
import type { Route0 } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import { DefaultErrorComponent, DefaultLoaderComponent } from '../adapters/react-dom/components.js'

export class Point0<
  TParent extends ParentPoint | UndefinedParent = UndefinedParent,
  TRequiredCtx extends RequiredCtx = UndefinedCtx,
  TOutputCtx extends Ctx = InferOutputCtx<TParent>,
  TOutputData extends Data = InferOutputData<TParent>,
  TRoute extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute,
  THasPage extends HasPage = HasPageFalse, // TODO: replace with end type and it will be 'endpoint' ro 'page' or 'layout' or 'component'
> {
  Infer: Infer<TRequiredCtx, TOutputCtx, TOutputData> = {} as never

  // TODO: may it help somebody?
  // static readyPoints: ReadyPoint[] = []
  // static pagePoints: PagePoint[] = []
  static pointsCount = 0

  _baseId: BaseId
  _queryClient: QueryClient | undefined
  _wrapper: WrapperComponentType | undefined
  _hasParent: TParent extends UndefinedParent ? false : true
  _extendFns: ExtendFnRecord[]
  _route: TRoute
  _page: THasPage extends true ? PageComponent<TOutputData, TRoute> : UndefinedPageComponent
  _id: Id | UndefinedId
  _index: number
  _method: Method | UndefinedMethod
  _fetchOptions: FetchOptionsFn

  _errorComponent: ErrorComponentType
  _pageErrorComponent?: ErrorComponentType<'page'>
  _componentErrorComponent?: ErrorComponentType<'component'>
  _loaderComponent: LoaderComponentType
  _pageLoaderComponent?: LoaderComponentType<'page'>
  _componentLoaderComponent?: LoaderComponentType<'component'>
  _appLoaderComponent?: LoaderComponentType<'app'>

  private constructor(props: {
    _baseId: BaseId
    _queryClient?: QueryClient | undefined
    _wrapper?: WrapperComponentType | undefined
    _hasParent?: TParent extends UndefinedParent ? false : true
    _extendFns?: ExtendFnRecord[]
    _route?: TRoute
    _page?: THasPage extends true ? PageComponent<TOutputData, TRoute> : UndefinedPageComponent
    _id?: Id | UndefinedId
    _method?: Method | UndefinedMethod
    _fetchOptions?: FetchOptionsFn
    _errorComponent?: ErrorComponentType
    _pageErrorComponent?: ErrorComponentType<'page'>
    _componentErrorComponent?: ErrorComponentType<'component'>
    _loaderComponent?: LoaderComponentType
    _pageLoaderComponent?: LoaderComponentType<'page'>
    _componentLoaderComponent?: LoaderComponentType<'component'>
    _appLoaderComponent?: LoaderComponentType<'app'>
  }) {
    // persistent
    this._baseId = props._baseId

    // overridable
    this._wrapper = props._wrapper
    this._queryClient = props._queryClient
    this._hasParent = props._hasParent as TParent extends UndefinedParent ? false : true
    this._extendFns = props._extendFns ?? []
    this._route = props._route ?? (undefined as TRoute)
    this._page = props._page ?? (undefined as THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined)
    this._id = props._id
    this._method = props._method ?? (undefined as Method | UndefinedMethod)
    this._fetchOptions = props._fetchOptions ?? (() => ({}))
    this._errorComponent = props._errorComponent ?? DefaultErrorComponent
    this._pageErrorComponent = props._pageErrorComponent
    this._componentErrorComponent = props._componentErrorComponent
    this._pageLoaderComponent = props._pageLoaderComponent
    this._loaderComponent = props._loaderComponent ?? DefaultLoaderComponent
    this._componentLoaderComponent = props._componentLoaderComponent
    this._appLoaderComponent = props._appLoaderComponent

    // calculated
    this._index = Point0.pointsCount++
  }

  _clone<
    TParent extends ParentPoint | UndefinedParent,
    TRequiredCtx extends RequiredCtx,
    TOutputCtx extends Ctx,
    TOutputData extends Data,
    TRoute extends Route0.AnyRoute | UndefinedRoute,
    THasPage extends HasPage,
  >(overrides?: {
    _queryClient?: QueryClient | undefined
    _wrapper?: WrapperComponentType | undefined
    _extendFns?: ExtendFnRecord[]
    _route?: Route0.AnyRoute | UndefinedRoute
    _page?: PageComponent | UndefinedPageComponent
    _id?: Id | UndefinedId
    _method?: Method | UndefinedMethod
    _fetchOptions?: FetchOptionsFn
    _errorComponent?: ErrorComponentType
    _pageErrorComponent?: ErrorComponentType<'page'>
    _componentErrorComponent?: ErrorComponentType<'component'>
    _loaderComponent?: LoaderComponentType
    _pageLoaderComponent?: LoaderComponentType<'page'>
    _componentLoaderComponent?: LoaderComponentType<'component'>
    _appLoaderComponent?: LoaderComponentType<'app'>
  }): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return new Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      // persistent
      _baseId: this._baseId,

      // overridable
      _queryClient: overrides?._queryClient ?? this._queryClient,
      _wrapper: overrides?._wrapper ?? this._wrapper,
      _hasParent: this._hasParent as TParent extends UndefinedParent ? false : true,
      _extendFns: overrides?._extendFns ?? this._extendFns,
      _route: (overrides?._route ?? this._route) as TRoute,
      _page: (overrides?._page ?? this._page) as THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined,
      _id: overrides?._id ?? this._id,
      _method: overrides?._method ?? this._method,
      _fetchOptions: overrides?._fetchOptions ?? this._fetchOptions,
      _errorComponent: overrides?._errorComponent ?? this._errorComponent,
      _pageErrorComponent: overrides?._pageErrorComponent ?? this._pageErrorComponent,
      _componentErrorComponent: overrides?._componentErrorComponent ?? this._componentErrorComponent,
      _loaderComponent: overrides?._loaderComponent ?? this._loaderComponent,
      _pageLoaderComponent: overrides?._pageLoaderComponent ?? this._pageLoaderComponent,
      _componentLoaderComponent: overrides?._componentLoaderComponent ?? this._componentLoaderComponent,
      _appLoaderComponent: overrides?._appLoaderComponent ?? this._appLoaderComponent,
    })
  }

  // base

  static create(props: { id: BaseId }): Point0 {
    return new Point0({ _hasParent: false, _baseId: props.id })
  }

  static extend<TParent extends ParentPoint>(props: { id: BaseId }): Point0<TParent, TParent['Infer']['RequiredCtx']> {
    return new Point0<TParent, TParent['Infer']['RequiredCtx']>({ _hasParent: true as never, _baseId: props.id })
  }

  // setters

  id(id: Id): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      // TODO: extends - by default, if provide true in end, then will override previous
      _id: id,
    } as never)
  }

  queryClient(queryClient: QueryClient): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _queryClient: queryClient,
    })
  }

  fetchOptions(
    fetchOptionsOrFn: FetchOptionsOrFn,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _fetchOptions: typeof fetchOptionsOrFn === 'function' ? fetchOptionsOrFn : () => fetchOptionsOrFn,
    })
  }

  wrapper(wrapper: WrapperComponentType): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _wrapper: wrapper,
    })
  }

  errorComponent(
    errorComponent: ErrorComponentType,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _errorComponent: errorComponent,
    })
  }

  pageErrorComponent(
    pageErrorComponent: ErrorComponentType<'page'>,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _pageErrorComponent: pageErrorComponent,
    })
  }

  componentErrorComponent(
    componentErrorComponent: ErrorComponentType<'component'>,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _componentErrorComponent: componentErrorComponent,
    })
  }

  pageLoaderComponent(
    pageLoaderComponent: LoaderComponentType<'page'>,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _pageLoaderComponent: pageLoaderComponent,
    })
  }

  componentLoaderComponent(
    componentLoaderComponent: LoaderComponentType<'component'>,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _componentLoaderComponent: componentLoaderComponent,
    })
  }

  appLoaderComponent(
    appLoaderComponent: LoaderComponentType<'app'>,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _appLoaderComponent: appLoaderComponent,
    })
  }

  loaderComponent(
    loaderComponent: LoaderComponentType,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>({
      _loaderComponent: loaderComponent,
    })
  }

  requireCtx<TExtraRequiredCtx extends Ctx>(): Point0<
    TParent,
    AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
    PrependCtx<TOutputCtx, TExtraRequiredCtx>,
    TOutputData,
    TRoute,
    THasPage
  > {
    return this._clone<
      TParent,
      AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
      PrependCtx<TOutputCtx, TExtraRequiredCtx>,
      TOutputData,
      TRoute,
      THasPage
    >({} as never)
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
    const ctxFn = typeof ctxOrFn === 'function' ? ctxOrFn : ({ ctx }: { ctx: TOutputCtx }) => ({ ...ctx, ...ctxOrFn })
    return this._clone<TParent, TRequiredCtx, TNewOutputCtx, TOutputData, TRoute, THasPage>({
      _extendFns: [...this._extendFns, { type: 'ctx', fn: ctxFn }],
    } as never)
  }

  route<TNewRoute0 extends Route0.AnyRoute>(
    route: TNewRoute0,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TNewRoute0, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TOutputData, TNewRoute0, THasPage>({
      _route: route,
    } as never)
  }

  loader<TNewOutputData extends Data = Data>(
    loaderFn: LoaderFn<TOutputCtx, TOutputData, CurrentRoute<TRoute>, TNewOutputData>,
  ): Point0<TParent, TRequiredCtx, TOutputCtx, TNewOutputData, TRoute, THasPage> {
    return this._clone<TParent, TRequiredCtx, TOutputCtx, TNewOutputData, TRoute, THasPage>({
      _extendFns: [...this._extendFns, { type: 'loader', fn: loaderFn }],
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

  getLabel(): string {
    return this._id || this._route?.getDefinition() || `${this._baseId}-${this._index}`
  }

  getQueryKey({ location }: { location: Route0.Location }): readonly [string, ...string[]] {
    return [this.getLabel(), ...Object.values(location.params)]
  }

  getErrorComponent<TType extends DestinationComponentType>({ type }: { type: TType }): ErrorComponentType<TType> {
    return ({
      app: this._errorComponent,
      page: this._pageErrorComponent,
      component: this._componentErrorComponent,
    }[type] ?? this._errorComponent) as ErrorComponentType<TType>
  }

  getLoaderComponent<TType extends DestinationComponentType>({ type }: { type: TType }): LoaderComponentType<TType> {
    return ({
      app: this._loaderComponent,
      page: this._pageLoaderComponent,
      component: this._componentLoaderComponent,
    }[type] ?? this._loaderComponent) as LoaderComponentType<TType>
  }

  getPageComponent(): THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined {
    return this._page
  }

  getAnyPageComponentOrThrow(): PageComponent {
    if (!this._page) {
      throw new Error(`Page component is not set for point "${this.getLabel()}"`)
    }
    return this._page as PageComponent
  }

  getExtendFns(): ExtendFnRecord[] {
    return this._extendFns
  }

  // TODO: move to eversion.ts
  // TODO: not has page, but finish type
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
export type BaseId = string
export type UndefinedBaseId = undefined

export type AnyPoint<
  TParent extends ParentPoint | UndefinedParent = ParentPoint | UndefinedParent,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  THasPage extends HasPage = HasPage,
> = Point0<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>
export type InitialBasePoint<
  TParent extends UndefinedParent = UndefinedParent,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  THasPage extends HasPage = HasPage,
> = AnyPoint<TParent, TRequiredCtx, TOutputCtx, TOutputData, TRoute, THasPage>
export type ExtendedBasePoint<
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

export type PageComponentProps<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = { data: TOutputData; location: Route0.Location<CurrentRoute<TRoute>> }
export type PageComponent<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = React.ComponentType<PageComponentProps<TOutputData, TRoute>>
export type UndefinedPageComponent = undefined

export type DestinationComponentType = 'app' | 'page' | 'component'
export type ErrorComponentProps<TType extends DestinationComponentType = DestinationComponentType> = {
  type: TType
  error: Error0
  location: Route0.Location
}
export type LoaderComponentProps<TType extends DestinationComponentType = DestinationComponentType> = {
  type: TType
  location: Route0.Location
}
export type LoaderComponentType<TType extends DestinationComponentType = DestinationComponentType> =
  React.ComponentType<LoaderComponentProps<TType>>
export type ErrorComponentType<TType extends DestinationComponentType = DestinationComponentType> = React.ComponentType<
  ErrorComponentProps<TType>
>

export type CurrentRoute<TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute> =
  TRoute extends Route0.AnyRoute ? TRoute : Route0.AnyRoute

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

export type FetchOptionsFn = (location: Route0.Location) => FetchOptions
export type FetchOptionsOrFn = FetchOptionsFn | FetchOptions
export type FetchOptions = RequestInit

export type WrapperComponentType = React.ComponentType<{ children: React.ReactNode }>
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

export type MetaMapPrimitiveValue = string | boolean | number | null | undefined
export type MetaMapRecordValue = Record<string, MetaMapPrimitiveValue>
export type MetaMapValue = MetaMapPrimitiveValue | MetaMapRecordValue
export type MetaMap = Record<string, MetaMapValue>

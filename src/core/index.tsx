import type { Error0 } from '@devp0nt/error0'
import type { Route0 } from '@devp0nt/route0'
import type { QueryClient, QueryOptions } from '@tanstack/react-query'
import * as React from 'react'
import type { ResolvableHead } from 'unhead/types'
import type z from 'zod'

export class Point0<
  TPointType extends PointType = 'middleware',
  TConnectedSourceBasePoint extends
    | ConnectedSourceBasePoint
    | UndefinedConnectedSourceBasePoint = UndefinedConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx = UndefinedCtx,
  TOutputCtx extends Ctx = InferOutputCtx<TConnectedSourceBasePoint>,
  TOutputData extends Data = InferOutputData<TConnectedSourceBasePoint>,
  TRoute extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
  THasPage extends HasPage = HasPageFalse, // TODO: replace with end type and it will be 'endpoint' ro 'page' or 'layout' or 'component'
> {
  Infer: Infer<TRequiredCtx, TOutputCtx, TOutputData> = {} as never

  // TODO: may it help somebody?
  // static readyPoints: ReadyPoint[] = []
  // static pagePoints: PagePoint[] = []
  static pointsCount = 0

  _pointType: TPointType
  _inputSchema: TInputSchema
  _baseId: BaseId
  _head: ResolvableHead[]
  _queryClient: QueryClient | undefined
  _queryOptions: QueryOptionsSettings
  _pageQueryOptions: QueryOptionsSettings
  _wrapper: WrapperComponentType | undefined
  _hasSourceBase: TConnectedSourceBasePoint extends UndefinedConnectedSourceBasePoint ? false : true
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
    _pointType: TPointType
    _inputSchema?: TInputSchema
    _baseId: BaseId
    _wrapper?: WrapperComponentType | undefined
    _queryClient?: QueryClient | undefined
    _head?: ResolvableHead[]
    _queryOptions?: QueryOptionsSettings | undefined
    _pageQueryOptions?: QueryOptionsSettings | undefined
    _hasSourceBase?: TConnectedSourceBasePoint extends UndefinedConnectedSourceBasePoint ? false : true
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
    this._inputSchema = (props._inputSchema ?? undefined) as TInputSchema
    this._pointType = props._pointType
    this._wrapper = props._wrapper
    this._queryClient = props._queryClient
    this._head = props._head ?? []
    this._queryOptions = props._queryOptions ?? {}
    this._pageQueryOptions = props._pageQueryOptions ?? {}
    this._hasSourceBase = props._hasSourceBase as TConnectedSourceBasePoint extends UndefinedConnectedSourceBasePoint
      ? false
      : true
    this._extendFns = props._extendFns ?? []
    this._route = props._route ?? (undefined as TRoute)
    this._page = props._page ?? (undefined as THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined)
    this._id = props._id
    this._method = props._method ?? (undefined as Method | UndefinedMethod)
    this._fetchOptions = props._fetchOptions ?? (() => ({}))
    this._errorComponent =
      props._errorComponent ??
      ((({ error }) => React.createElement(React.Fragment, null, JSON.stringify(error.toJSON()))) as ErrorComponentType)
    this._pageErrorComponent = props._pageErrorComponent
    this._componentErrorComponent = props._componentErrorComponent
    this._pageLoaderComponent = props._pageLoaderComponent
    this._loaderComponent =
      props._loaderComponent ?? ((() => React.createElement(React.Fragment, null, 'Loading...')) as LoaderComponentType)
    this._componentLoaderComponent = props._componentLoaderComponent
    this._appLoaderComponent = props._appLoaderComponent

    // calculated
    this._index = Point0.pointsCount++
  }

  _clone<
    TPointType extends PointType,
    TSourceBasePoint extends ConnectedSourceBasePoint | UndefinedConnectedSourceBasePoint,
    TRequiredCtx extends RequiredCtx,
    TOutputCtx extends Ctx,
    TOutputData extends Data,
    TRoute extends Route0.AnyRoute | UndefinedRoute,
    TInputSchema extends InputSchema | UndefinedInputSchema,
    THasPage extends HasPage,
  >(overrides: {
    _pointType: TPointType
    _inputSchema?: TInputSchema
    _queryClient?: QueryClient | undefined
    _head?: ResolvableHead[]
    _queryOptions?: QueryOptionsSettings | undefined
    _pageQueryOptions?: QueryOptionsSettings | undefined
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
  }): Point0<TPointType, TSourceBasePoint, TRequiredCtx, TOutputCtx, TOutputData, TRoute, TInputSchema, THasPage> {
    return new Point0<
      TPointType,
      TSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      // persistent
      _baseId: this._baseId,

      // overridable
      _pointType: overrides._pointType,
      _inputSchema: (overrides._inputSchema ?? this._inputSchema) as TInputSchema,
      _queryClient: overrides._queryClient ?? this._queryClient,
      _wrapper: overrides._wrapper ?? this._wrapper,
      _head: [...this._head, ...(overrides._head ?? [])],
      _queryOptions: { ...this._queryOptions, ...(overrides._queryOptions ?? {}) },
      _pageQueryOptions: { ...this._pageQueryOptions, ...(overrides._pageQueryOptions ?? {}) },
      _hasSourceBase: this._hasSourceBase as TSourceBasePoint extends UndefinedConnectedSourceBasePoint ? false : true,
      _extendFns: overrides._extendFns ?? this._extendFns,
      _route: (overrides._route ?? this._route) as TRoute,
      _page: (overrides._page ?? this._page) as THasPage extends true ? PageComponent<TOutputData, TRoute> : undefined,
      _id: overrides._id ?? this._id,
      _method: overrides._method ?? this._method,
      _fetchOptions: overrides._fetchOptions ?? this._fetchOptions,
      _errorComponent: overrides._errorComponent ?? this._errorComponent,
      _pageErrorComponent: overrides._pageErrorComponent ?? this._pageErrorComponent,
      _componentErrorComponent: overrides._componentErrorComponent ?? this._componentErrorComponent,
      _loaderComponent: overrides._loaderComponent ?? this._loaderComponent,
      _pageLoaderComponent: overrides._pageLoaderComponent ?? this._pageLoaderComponent,
      _componentLoaderComponent: overrides._componentLoaderComponent ?? this._componentLoaderComponent,
      _appLoaderComponent: overrides._appLoaderComponent ?? this._appLoaderComponent,
    })
  }

  // base

  static source(baseId: string): Point0 {
    return new Point0({
      _pointType: 'middleware',
      _hasSourceBase: false,
      _baseId: baseId,
    })
  }

  static connect<TConnectedSourceBasePoint extends ConnectedSourceBasePoint>(
    baseId: string,
  ): Point0<'middleware', TConnectedSourceBasePoint, TConnectedSourceBasePoint['Infer']['RequiredCtx']> {
    return new Point0<'middleware', TConnectedSourceBasePoint, TConnectedSourceBasePoint['Infer']['RequiredCtx']>({
      _pointType: 'middleware',
      _hasSourceBase: true as never,
      _baseId: baseId,
    })
  }

  // middlewares

  id(
    id: Id,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      // TODO: extends - by default, if provide true in end, then will override previous
      _pointType: 'middleware',
      _id: id,
    })
  }

  fetchOptions(
    fetchOptionsOrFn: FetchOptionsOrFn,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _fetchOptions: typeof fetchOptionsOrFn === 'function' ? fetchOptionsOrFn : () => fetchOptionsOrFn,
    })
  }

  errorComponent(
    errorComponent: ErrorComponentType,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _errorComponent: errorComponent,
    })
  }

  pageErrorComponent(
    pageErrorComponent: ErrorComponentType<'page'>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _pageErrorComponent: pageErrorComponent,
    })
  }

  componentErrorComponent(
    componentErrorComponent: ErrorComponentType<'component'>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _componentErrorComponent: componentErrorComponent,
    })
  }

  pageLoaderComponent(
    pageLoaderComponent: LoaderComponentType<'page'>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _pageLoaderComponent: pageLoaderComponent,
    })
  }

  componentLoaderComponent(
    componentLoaderComponent: LoaderComponentType<'component'>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _componentLoaderComponent: componentLoaderComponent,
    })
  }

  appLoaderComponent(
    appLoaderComponent: LoaderComponentType<'app'>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _appLoaderComponent: appLoaderComponent,
    })
  }

  loaderComponent(
    loaderComponent: LoaderComponentType,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _loaderComponent: loaderComponent,
    })
  }

  requireCtx<TExtraRequiredCtx extends Ctx>(): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
    PrependCtx<TOutputCtx, TExtraRequiredCtx>,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
      PrependCtx<TOutputCtx, TExtraRequiredCtx>,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
    })
  }

  ctx<TNewOutputCtx extends Ctx = Ctx>(
    ctxFn: CtxFn<TOutputCtx, TOutputData, CurrentRoute<TRoute>, TNewOutputCtx>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TNewOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  >
  ctx<TNewOutputCtx extends Ctx = Ctx>(
    ctx: TNewOutputCtx,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TNewOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  >
  ctx<TNewOutputCtx extends Ctx = Ctx>(
    ctxOrFn: TNewOutputCtx,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TNewOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    const ctxFn = typeof ctxOrFn === 'function' ? ctxOrFn : ({ ctx }: { ctx: TOutputCtx }) => ({ ...ctx, ...ctxOrFn })
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TNewOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _extendFns: [...this._extendFns, { type: 'ctx', fn: ctxFn }] as never,
    })
  }

  route<TNewRoute0 extends Route0.AnyRoute>(
    route: TNewRoute0,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TNewRoute0,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TNewRoute0,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _route: route,
    })
  }

  loader<TNewOutputData extends Data = Data>(
    loaderFn: LoaderFn<TOutputCtx, TOutputData, CurrentRoute<TRoute>, TNewOutputData>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TNewOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TNewOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _extendFns: [...this._extendFns, { type: 'loader', fn: loaderFn }] as never,
    })
  }

  head(
    headFn: HeadFn<TOutputData, CurrentRoute<TRoute>>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  >
  head(
    head: ResolvableHead,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  >
  head(
    headFnOrHead: HeadFn<TOutputData, CurrentRoute<TRoute>> | ResolvableHead,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    const headFn = typeof headFnOrHead === 'function' ? headFnOrHead : () => headFnOrHead
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _extendFns: [...this._extendFns, { type: 'head', fn: headFn }] as never,
    })
  }

  title(
    titleFn: TitleFn<TOutputData, CurrentRoute<TRoute>>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  >
  title(
    title: string,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  >
  title(
    titleFnOrTitle: TitleFn<TOutputData, CurrentRoute<TRoute>> | string,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    THasPage
  > {
    const headFn =
      typeof titleFnOrTitle === 'function'
        ? async (props: HeadFnProps<TOutputData, TRoute>) => ({
            title: await titleFnOrTitle(props),
          })
        : () => ({ title: titleFnOrTitle })
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >({
      _pointType: 'middleware',
      _extendFns: [...this._extendFns, { type: 'head', fn: headFn }] as never,
    })
  }

  // end points

  page<TPage extends PageComponent<TOutputData, TRoute>>(
    page: TPage,
  ): Point0<
    'page',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    CurrentRoute<TRoute>,
    TInputSchema,
    true
  > {
    return this._clone<
      'page',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      CurrentRoute<TRoute>,
      TInputSchema,
      true
    >({
      _pointType: 'page',
      _page: page as PageComponent<Data, CurrentRoute<TRoute>>,
    })
  }

  // getters

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

  hasLoader(): boolean {
    return this._extendFns.some((fn) => fn.type === 'loader')
  }

  hasHead(): boolean {
    return this._extendFns.some((fn) => fn.type === 'head')
  }
}

export type QueryOptionsSettings = Omit<QueryOptions<any, any, any, any, any>, 'queryFn' | 'queryKey'>
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
  TPointType extends PointType = PointType,
  TConnectedSourceBasePoint extends ConnectedSourceBasePoint | UndefinedConnectedSourceBasePoint =
    | ConnectedSourceBasePoint
    | UndefinedConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
  THasPage extends HasPage = HasPage,
> = Point0<TPointType, TConnectedSourceBasePoint, TRequiredCtx, TOutputCtx, TOutputData, TRoute, TInputSchema, THasPage>
export type BaseSourcePoint<
  TConnectedSourceBasePoint extends UndefinedConnectedSourceBasePoint = UndefinedConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends UndefinedRoute = UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
  THasPage extends HasPage = HasPage,
> = AnyPoint<
  'middleware',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TOutputCtx,
  TOutputData,
  TRoute,
  TInputSchema,
  THasPage
>
export type BaseConnectionPoint<
  TConnectedSourceBasePoint extends ConnectedSourceBasePoint = ConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends UndefinedRoute = UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
  THasPage extends HasPage = HasPage,
> = AnyPoint<
  'middleware',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TOutputCtx,
  TOutputData,
  TRoute,
  TInputSchema,
  THasPage
>
export type BasePoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends UndefinedRoute = UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
  THasPage extends HasPage = HasPage,
> =
  | BaseSourcePoint<
      UndefinedConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      THasPage
    >
  | BaseConnectionPoint<ConnectedSourceBasePoint, TRequiredCtx, TOutputCtx, TOutputData, TRoute, TInputSchema, THasPage>
export type PagePoint<
  TConnectedSourceBasePoint extends ConnectedSourceBasePoint | UndefinedConnectedSourceBasePoint =
    | ConnectedSourceBasePoint
    | UndefinedConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
  THasPage extends HasPageTure = HasPageTure,
> = AnyPoint<'page', TConnectedSourceBasePoint, TRequiredCtx, TOutputCtx, TOutputData, TRoute, TInputSchema, THasPage>
export type EndPoint<
  TPointType extends EndPointType = EndPointType,
  TConnectedSourceBasePoint extends ConnectedSourceBasePoint | UndefinedConnectedSourceBasePoint =
    | ConnectedSourceBasePoint
    | UndefinedConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
  THasPage extends HasPageTure = HasPageTure,
> = AnyPoint<
  TPointType,
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TOutputCtx,
  TOutputData,
  TRoute,
  TInputSchema,
  THasPage
>
export type ConnectedSourceBasePoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
> = {
  Infer: Infer<TRequiredCtx, TOutputCtx, TOutputData>
  _extendFns: ExtendFnRecord[]
}
export type UndefinedConnectedSourceBasePoint = undefined

export type InferOutputCtx<TPoint extends AnyPoint | ConnectedSourceBasePoint | undefined> =
  TPoint extends AnyPoint<any, any, any, infer TOutputCtx, any, any, any>
    ? TOutputCtx
    : TPoint extends ConnectedSourceBasePoint
      ? TPoint['Infer']['OutputCtx']
      : EmptyCtx
export type InferOutputData<TPoint extends AnyPoint | ConnectedSourceBasePoint | undefined> =
  TPoint extends AnyPoint<any, any, any, any, infer TOutputData, any, any>
    ? TOutputData
    : TPoint extends ConnectedSourceBasePoint
      ? TPoint['Infer']['OutputData']
      : EmptyData
export type InferSourceBase<TPoint extends AnyPoint | undefined> =
  TPoint extends AnyPoint<infer TSourceBasePoint> ? TSourceBasePoint : undefined

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

export type FetchOptionsFn = ({ location }: { location: Route0.Location }) => FetchOptions
export type FetchOptionsOrFn = FetchOptionsFn | FetchOptions
export type FetchOptions = RequestInit

export type WrapperComponentType = React.ComponentType<{ children: React.ReactNode }>

export type InputSchema = z.ZodObject<any>
export type UndefinedInputSchema = undefined
export type Input<TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema> =
  TInputSchema extends InputSchema ? z.infer<TInputSchema> : undefined
export type UndefinedInput = undefined

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

export type HeadFnProps<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = { data: TOutputData; location: Route0.Location<CurrentRoute<TRoute>> }
export type HeadFn<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = (props: HeadFnProps<TOutputData, TRoute>) => Promise<ResolvableHead> | ResolvableHead

export type TitleFnProps<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = { data: TOutputData; location: Route0.Location<CurrentRoute<TRoute>> }
export type TitleFn<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = (props: HeadFnProps<TOutputData, TRoute>) => Promise<string> | string

export type ExtendFnRecord<
  TType extends 'ctx' | 'loader' | 'head' = 'ctx' | 'loader' | 'head',
  TCtxInput extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
  TOutput extends Ctx | Data = Ctx | Data,
> = TType extends 'ctx'
  ? { type: 'ctx'; fn: CtxFn<TCtxInput, TDataInput, TRoute0, TOutput> }
  : TType extends 'loader'
    ? { type: 'loader'; fn: LoaderFn<TCtxInput, TDataInput, TRoute0, TOutput> }
    : TType extends 'head'
      ? { type: 'head'; fn: HeadFn<TDataInput, TRoute0> }
      : never

export type PointType = 'page' | 'component' | 'response' | 'layout' | 'middleware'
export type EndPointType = Exclude<PointType, 'middleware'>

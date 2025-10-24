import { Error0 } from '@devp0nt/error0'
import type { Route0 } from '@devp0nt/route0'
import type {
  MutationOptions,
  QueryClient,
  QueryOptions,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useHead } from '@unhead/react'
import qs from 'qs'
import * as React from 'react'
import { stringify } from 'safe-stable-stringify'
import type { ResolvableHead } from 'unhead/types'
import type z from 'zod'
import { mergeHeaders } from './utils.js'

export class Point0<
  TPointType extends PointType,
  TConnectedSourceBasePoint extends ConnectedSourceBasePoint | UndefinedConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx,
  TOutputCtx extends Ctx,
  TOutputData extends Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
> {
  Infer: Infer<TRequiredCtx, TOutputCtx, TOutputData> = {} as never

  // TODO: may it help somebody?
  // static readyPoints: ReadyPoint[] = []
  // static pagePoints: PagePoint[] = []
  static pointsCount = 0

  _pointType: TPointType
  _inputSchema: TInputSchema
  _responseFn: TResponseOutput extends ResponseOutput
    ? ResponseFn<TOutputCtx, TOutputData, TRoute, TInputSchema, TResponseOutput>
    : undefined
  _baseId: BaseId
  _head: ResolvableHead[]
  _queryClient: QueryClient | undefined
  _useLocation: () => Route0.Location<CurrentRoute<TRoute>>
  // TODO: add _pageQueryOptions
  _queryOptions: QueryOptionsSettings
  _pageQueryOptions: QueryOptionsSettings
  _wrapper: WrapperComponentType | undefined
  _hasSourceBase: TConnectedSourceBasePoint extends UndefinedConnectedSourceBasePoint ? false : true
  _extendFns: ExtendFnRecord[]
  _route: TRoute
  _page: PageComponent<TOutputData, TRoute> | UndefinedPageComponent
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
    _useLocation?: () => Route0.Location
    _inputSchema?: TInputSchema
    _responseFn?: TResponseOutput extends ResponseOutput
      ? ResponseFn<TOutputCtx, TOutputData, TRoute, TInputSchema, TResponseOutput>
      : undefined
    _baseId: BaseId
    _wrapper?: WrapperComponentType | undefined
    _queryClient?: QueryClient | undefined
    _head?: ResolvableHead[]
    _queryOptions?: QueryOptionsSettings | undefined
    _pageQueryOptions?: QueryOptionsSettings | undefined
    _hasSourceBase?: TConnectedSourceBasePoint extends UndefinedConnectedSourceBasePoint ? false : true
    _extendFns?: ExtendFnRecord[]
    _route?: TRoute
    _page?: PageComponent<TOutputData, TRoute> | UndefinedPageComponent
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
    this._useLocation = (props._useLocation ??
      (() => {
        throw new Error('add .setUseLocation to chain to use page function')
      })) as () => Route0.Location<CurrentRoute<TRoute>>
    this._responseFn = (props._responseFn ?? undefined) as TResponseOutput extends ResponseOutput
      ? ResponseFn<TOutputCtx, TOutputData, TRoute, TInputSchema, TResponseOutput>
      : undefined
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
    this._page = props._page ?? undefined
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
    TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  >(overrides: {
    _pointType: TPointType
    _inputSchema?: TInputSchema
    _useLocation?: () => Route0.Location
    _responseFn?: TResponseOutput extends ResponseOutput
      ? ResponseFn<TOutputCtx, TOutputData, TRoute, TInputSchema, TResponseOutput>
      : undefined
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
  }): Point0<
    TPointType,
    TSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return new Point0<
      TPointType,
      TSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      // persistent
      _baseId: this._baseId,

      // overridable
      _pointType: overrides._pointType,
      _inputSchema: (overrides._inputSchema ?? this._inputSchema) as TInputSchema,
      _responseFn: (overrides._responseFn ?? this._responseFn) as TResponseOutput extends ResponseOutput
        ? ResponseFn<TOutputCtx, TOutputData, TRoute, TInputSchema, TResponseOutput>
        : undefined,
      _queryClient: overrides._queryClient ?? this._queryClient,
      _useLocation: overrides._useLocation ?? this._useLocation,
      _wrapper: overrides._wrapper ?? this._wrapper,
      _head: [...this._head, ...(overrides._head ?? [])],
      _queryOptions: { ...this._queryOptions, ...(overrides._queryOptions ?? {}) },
      _pageQueryOptions: { ...this._pageQueryOptions, ...(overrides._pageQueryOptions ?? {}) },
      _hasSourceBase: this._hasSourceBase as TSourceBasePoint extends UndefinedConnectedSourceBasePoint ? false : true,
      _extendFns: overrides._extendFns ?? this._extendFns,
      _route: (overrides._route ?? this._route) as TRoute,
      _page: (overrides._page ?? this._page) as PageComponent<TOutputData, TRoute> | UndefinedPageComponent,
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

  static source(
    baseId: string,
  ): Point0<
    'middleware',
    UndefinedConnectedSourceBasePoint,
    UndefinedCtx,
    EmptyCtx,
    EmptyData,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedResponseOutput
  > {
    return new Point0({
      _pointType: 'middleware',
      _hasSourceBase: false,
      _baseId: baseId,
    })
  }

  static connect<TConnectedSourceBasePoint extends ConnectedSourceBasePoint>(
    baseId: string,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TConnectedSourceBasePoint['Infer']['RequiredCtx'],
    TConnectedSourceBasePoint['Infer']['OutputCtx'],
    TConnectedSourceBasePoint['Infer']['OutputData'],
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedResponseOutput
  > {
    return new Point0<
      'middleware',
      TConnectedSourceBasePoint,
      TConnectedSourceBasePoint['Infer']['RequiredCtx'],
      TConnectedSourceBasePoint['Infer']['OutputCtx'],
      TConnectedSourceBasePoint['Infer']['OutputData'],
      UndefinedRoute,
      UndefinedInputSchema,
      UndefinedResponseOutput
    >({
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
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      // TODO: extends - by default, if provide true in end, then will override previous
      _pointType: 'middleware',
      _id: id,
    })
  }

  setUseLocation(
    useLocation: () => Route0.Location,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _useLocation: useLocation,
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
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
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
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
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
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
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
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
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
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
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
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
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
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
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
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
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
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
      PrependCtx<TOutputCtx, TExtraRequiredCtx>,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
    })
  }

  ctx<TNewOutputCtx extends Ctx = Ctx>(
    ctxFn: CtxFn<TOutputCtx, TOutputData, CurrentRoute<TRoute>, TInputSchema, TNewOutputCtx>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TNewOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    TResponseOutput
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
    TResponseOutput
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
    TResponseOutput
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
      TResponseOutput
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
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TNewRoute0,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _route: route,
    })
  }

  loader<TNewOutputData extends Data = Data>(
    loaderFn: LoaderFn<TOutputCtx, TOutputData, CurrentRoute<TRoute>, TInputSchema, TNewOutputData>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TNewOutputData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TNewOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
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
    TResponseOutput
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
    TResponseOutput
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
    TResponseOutput
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
      TResponseOutput
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
    TResponseOutput
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
    TResponseOutput
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
    TResponseOutput
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
      TResponseOutput
    >({
      _pointType: 'middleware',
      _extendFns: [...this._extendFns, { type: 'head', fn: headFn }] as never,
    })
  }

  input<TNewInputSchema extends InputSchema = InputSchema>(
    inputSchema: TNewInputSchema,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TNewInputSchema,
    TResponseOutput
  > {
    return this._clone<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TNewInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _inputSchema: inputSchema,
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
    TResponseOutput
  > {
    return this._clone<
      'page',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      CurrentRoute<TRoute>,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'page',
      _page: page as PageComponent<Data, CurrentRoute<TRoute>>,
    })
  }

  response<TResponseOutput extends ResponseOutput = ResponseOutput>(
    responseFn: ResponseFn<TOutputCtx, TOutputData, CurrentRoute<TRoute>, TInputSchema, TResponseOutput>,
  ): Point0<
    'response',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TOutputData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._clone<
      'response',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'response',
      _responseFn: responseFn as TResponseOutput extends ResponseOutput
        ? ResponseFn<TOutputCtx, TOutputData, TRoute, TInputSchema, TResponseOutput>
        : undefined,
    })
  }

  json<TNewOutputData extends Data = Data>(
    loaderFn: LoaderFn<TOutputCtx, TOutputData, CurrentRoute<TRoute>, TInputSchema, TNewOutputData>,
  ): Point0<
    'json',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TOutputCtx,
    TNewOutputData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._clone<
      'json',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TNewOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'json',
      _extendFns: [...this._extendFns, { type: 'loader', fn: loaderFn }] as never,
    })
  }

  // end points

  _getErrorComponent<TType extends DestinationComponentType>({ type }: { type: TType }): ErrorComponentType<TType> {
    return ({
      app: this._errorComponent,
      page: this._pageErrorComponent,
      component: this._componentErrorComponent,
    }[type] ?? this._errorComponent) as ErrorComponentType<TType>
  }

  _getLoaderComponent<TType extends DestinationComponentType>({ type }: { type: TType }): LoaderComponentType<TType> {
    return ({
      app: this._loaderComponent,
      page: this._pageLoaderComponent,
      component: this._componentLoaderComponent,
    }[type] ?? this._loaderComponent) as LoaderComponentType<TType>
  }

  _hasLoader(): boolean {
    return this._extendFns.some((fn) => fn.type === 'loader')
  }

  _hasHead(): boolean {
    return this._extendFns.some((fn) => fn.type === 'head')
  }

  _getId(): Id {
    return this._id || `${this._baseId}-${this._index}`
  }

  // TODO: not params, but route input
  _getRoutePath = ((params?: Record<string, string>) => {
    if (this._route) {
      return this._route.get(params || {})
    }
    return this._getId()
  }) as TRoute extends Route0.AnyRoute
    ? Route0.Params<TRoute> extends Record<string, string>
      ? (params: Route0.Params<TRoute>) => string
      : () => string
    : () => string

  _getWrappedPageComponent = (): React.ComponentType => {
    // eslint-disable-next-line consistent-this, @typescript-eslint/no-this-alias
    const point = this
    const loaderComponent = point._getLoaderComponent({ type: 'page' })
    const errorComponent = point._getErrorComponent({ type: 'page' })

    if (!this._page) {
      function PageComponent(): React.ReactElement {
        const location = point._useLocation()
        return React.createElement(errorComponent, { type: 'page', error: new Error0('No page component'), location })
      }
      return PageComponent
    }

    if (!point._hasLoader()) {
      function PageComponent(): React.ReactElement {
        const location = point._useLocation()
        for (const head of point._head) {
          useHead(head)
        }
        if (!point._page) {
          return React.createElement(errorComponent, { type: 'page', error: new Error0('No page component'), location })
        }
        return React.createElement(point._page, { data: {} as TOutputData, location })
      }
      return PageComponent
    }

    function PageComponent(): React.ReactElement {
      const location = point._useLocation()
      // const { isInitialPage } = useEversionContext()
      // const queryClient = useQueryClient()
      // const cache = queryClient.getQueryCache()
      const queryKey = point.getQueryKey(location.params as never)
      // const query = cache.find({ queryKey })
      const result = useQuery<TOutputData>({
        queryKey,
        queryFn: async () => {
          const fetchOptions = point._fetchOptions()
          const headers = mergeHeaders(fetchOptions.headers, { Accept: 'application/json' })
          const res = await fetch(location.pathname, {
            ...fetchOptions,
            headers,
          })
          const json = await res.json()
          if (res.ok) {
            return json
          }
          throw Error0.from(json, {
            httpStatus: res.status,
          })
        },
        // enabled: !isInitialPage || query?.state.status !== 'error',
        ...point._queryOptions,
        ...point._pageQueryOptions,
      })
      if (result.error) {
        return React.createElement(errorComponent, { type: 'page', error: Error0.from(result.error), location })
      }
      if (result.isLoading) {
        return React.createElement(loaderComponent, { type: 'page', location })
      }
      if (!result.data) {
        return React.createElement(errorComponent, { type: 'page', error: new Error0('No data'), location })
      }
      if (!point._page) {
        return React.createElement(errorComponent, { type: 'page', error: new Error0('No page component'), location })
      }
      return React.createElement(point._page, { data: result.data, location })
    }
    return PageComponent
  }

  fetch = (async (props: Record<string, any> = {}) => {
    const fetchOptions = this._fetchOptions()
    const headers = mergeHeaders(fetchOptions.headers, { Accept: 'application/json' })
    const routePath = this._getRoutePath((this._inputSchema ? {} : props) as never)
    const url = new URL(routePath, window.location.origin)
    const method = this._method
    let body: string | undefined = undefined
    if (method === 'get' || method === 'head' || method === 'options') {
      if (this._inputSchema) {
        url.search = qs.stringify(props)
      }
    } else {
      if (this._inputSchema) {
        headers.set('Content-Type', 'application/json')
        body = JSON.stringify(props)
      }
    }
    const res = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
      method,
      body,
    })
    if (this._pointType === 'response') {
      return res
    }
    const json = await res.json()
    if (res.ok) {
      return json
    }
    throw Error0.from(json, {
      httpStatus: res.status,
    })
  }) as FetcherFn<TInputSchema, TRoute, Promise<FetchOutput<TResponseOutput, TOutputData>>>

  getQueryKey = ((props?: Record<string, any>): QueryKey => {
    const keyParts: [string, ...string[]] = [this._getId()]
    if (props) {
      const serialized = stringify(props)
      keyParts.push(serialized)
    }
    return keyParts
  }) as FetcherFn<TInputSchema, TRoute, QueryKey>

  getQueryOptions = ((props: Record<string, any> = {}) => {
    const queryKey = this.getQueryKey(props as never)
    const queryFn = async () => {
      const data = await this.fetch(props as never)
      return data
    }
    return {
      queryKey,
      queryFn,
      ...this._queryOptions,
    }
  }) as never as FetcherFn<TInputSchema, TRoute, QueryOptions<FetchOutput<TResponseOutput, TOutputData>, Error0>>

  getMutationOptions = (() => {
    const mutationFn = async (props: Record<string, any> = {}) => {
      const data = await this.fetch(props as never)
      return data
    }
    return {
      mutationFn,
      // TODO: add mutation options
    }
  }) as () => MutationOptions<FetchOutput<TResponseOutput, TOutputData>, Error0, Input<TInputSchema>>

  useQuery = ((props: Record<string, any> = {}) => {
    return useQuery(this.getQueryOptions(props as never) as never)
  }) as FetcherFn<TInputSchema, TRoute, UseQueryResult<FetchOutput<TResponseOutput, TOutputData>, Error0>>

  useMutation = (() => {
    return useMutation(this.getMutationOptions() as never) as never
  }) as () => UseMutationResult<FetchOutput<TResponseOutput, TOutputData>, Error0, Input<TInputSchema>>
}

// TODO: just use any in EndPoint, and move it back
export class UsablePoint0<TPoint extends AnyPoint> {
  point: TPoint
  constructor(point: TPoint) {
    this.point = point
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
  TOutputCtx extends Ctx = any,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
> = Point0<
  TPointType,
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TOutputCtx,
  TOutputData,
  TRoute,
  TInputSchema,
  TResponseOutput
>
export type BaseSourcePoint<
  TConnectedSourceBasePoint extends UndefinedConnectedSourceBasePoint = UndefinedConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = any,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
> = AnyPoint<
  'middleware',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TOutputCtx,
  TOutputData,
  TRoute,
  TInputSchema,
  TResponseOutput
>
export type BaseConnectionPoint<
  TConnectedSourceBasePoint extends ConnectedSourceBasePoint = ConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = Ctx,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
> = AnyPoint<
  'middleware',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TOutputCtx,
  TOutputData,
  TRoute,
  TInputSchema,
  TResponseOutput
>
export type BasePoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = any,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
> =
  | BaseSourcePoint<
      UndefinedConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >
  | BaseConnectionPoint<
      ConnectedSourceBasePoint,
      TRequiredCtx,
      TOutputCtx,
      TOutputData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >
export type PagePoint<
  TConnectedSourceBasePoint extends ConnectedSourceBasePoint | UndefinedConnectedSourceBasePoint =
    | ConnectedSourceBasePoint
    | UndefinedConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = any,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends UndefinedInputSchema = UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
> = AnyPoint<
  'page',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TOutputCtx,
  TOutputData,
  TRoute,
  TInputSchema,
  TResponseOutput
>
export type ResponsePoint<
  TConnectedSourceBasePoint extends ConnectedSourceBasePoint | UndefinedConnectedSourceBasePoint =
    | ConnectedSourceBasePoint
    | UndefinedConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = any,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput = ResponseOutput,
> = AnyPoint<
  'response',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TOutputCtx,
  TOutputData,
  TRoute,
  TInputSchema,
  TResponseOutput
>
export type EndPoint<
  TPointType extends EndPointType = EndPointType,
  TConnectedSourceBasePoint extends ConnectedSourceBasePoint | UndefinedConnectedSourceBasePoint =
    | ConnectedSourceBasePoint
    | UndefinedConnectedSourceBasePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = any,
  TOutputData extends Data = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
> = AnyPoint<
  TPointType,
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TOutputCtx,
  TOutputData,
  TRoute,
  TInputSchema,
  TResponseOutput
>
export type ConnectedSourceBasePoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TOutputCtx extends Ctx = any,
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
export type EmptyCtx = Record<string, unknown> // Record<string, never>
export type UnknownCtx = Record<string, unknown>
export type UndefinedCtx = undefined
export type RequiredCtx = UnknownCtx | UndefinedCtx
export type Ctx = UnknownCtx | EmptyCtx
export type EmptyData = Record<string, unknown> // Record<string, never>
export type UnknownData = Record<string, unknown>
export type UndefinedData = undefined
export type Data = UnknownData | EmptyData

export type FetchOptionsFn = () => FetchOptions
export type FetchOptionsOrFn = FetchOptionsFn | FetchOptions
export type FetchOptions = RequestInit

export type WrapperComponentType = React.ComponentType<{ children: React.ReactNode }>

export type InputSchema = z.ZodObject<any>
export type UndefinedInputSchema = undefined
export type Input<TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema> =
  TInputSchema extends InputSchema ? z.infer<TInputSchema> : Record<string, unknown>
export type UndefinedInput = undefined

export type ResponseOutput = Data | Response
export type UndefinedResponseOutput = undefined
export type ResponseFnProps<
  TCtx extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: TDataInput
  input: Input<TInputSchema>
  location: Route0.Location<CurrentRoute<TRoute0>>
}
export type ResponseFn<
  TCtx extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput = ResponseOutput,
> = (props: ResponseFnProps<TCtx, TDataInput, TRoute0, TInputSchema>) => Promise<TResponseOutput> | TResponseOutput
export type ResponseFnOutput<TResponseFn extends ResponseFn> = Awaited<ReturnType<TResponseFn>>

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
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtxInput
  data: TData
  input: Input<TInputSchema>
  location: Route0.Location<TRoute0>
}
export type CtxFn<
  TCtxInput extends Ctx = Ctx,
  TData extends Data = Data,
  TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCtxOutput extends Ctx = Ctx,
> = (props: CtxFnProps<TCtxInput, TData, TRoute0, TInputSchema>) => Promise<TCtxOutput> | TCtxOutput
export type CtxFnOutput<TCtxFn extends CtxFn> = Awaited<ReturnType<TCtxFn>>
export type InferCtxFnOutput<TCtxFn> = TCtxFn extends CtxFn<any, any, any, infer TCtxFnOutput> ? TCtxFnOutput : never

export type LoaderFnProps<
  TCtx extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: TDataInput
  location: Route0.Location<CurrentRoute<TRoute0>>
  input: Input<TInputSchema>
}
export type LoaderFn<
  TCtx extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TDataOutput extends Data = Data,
> = (props: LoaderFnProps<TCtx, TDataInput, TRoute0, TInputSchema>) => Promise<TDataOutput> | TDataOutput

export type HeadFnProps<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = { data: TOutputData; location: Route0.Location<CurrentRoute<TRoute>>; input: Input<TInputSchema> }
export type HeadFn<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = (props: HeadFnProps<TOutputData, TRoute, TInputSchema>) => Promise<ResolvableHead> | ResolvableHead

export type TitleFnProps<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = { data: TOutputData; location: Route0.Location<CurrentRoute<TRoute>>; input: TInputSchema }
export type TitleFn<
  TOutputData extends Data = Data,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = (props: HeadFnProps<TOutputData, TRoute, TInputSchema>) => Promise<string> | string

export type ExtendFnRecord<
  TType extends 'ctx' | 'loader' | 'head' = 'ctx' | 'loader' | 'head',
  TCtxInput extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TOutput extends Ctx | Data = Ctx | Data,
> = TType extends 'ctx'
  ? { type: 'ctx'; fn: CtxFn<TCtxInput, TDataInput, TRoute0, TInputSchema, TOutput> }
  : TType extends 'loader'
    ? { type: 'loader'; fn: LoaderFn<TCtxInput, TDataInput, TRoute0, TInputSchema, TOutput> }
    : TType extends 'head'
      ? { type: 'head'; fn: HeadFn<TDataInput, TRoute0, TInputSchema> }
      : never

export type PointType = 'page' | 'component' | 'response' | 'json' | 'layout' | 'middleware'
export type EndPointType = Exclude<PointType, 'middleware'>

export type QueryKey = readonly [string, ...string[]]
// export type FetcherInput<
//   TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = TRoute extends Route0.AnyRoute
//   ? TInputSchema extends InputSchema
//     ? { params: Route0.Params<TRoute>; input: Input<TInputSchema> }
//     : { params: Route0.Params<TRoute> }
//   : TInputSchema extends InputSchema
//     ? { input: Record<string, any> }
//     : never
// export type FetcherFn<
//   TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TFnOutput = any,
// > = TInputSchema extends InputSchema
//   ? (props: Input<TInputSchema>) => TFnOutput
//   : TRoute extends Route0.AnyRoute
//     ? (props: Route0.Params<Route0.AnyRoute>) => TFnOutput
//     : (props: Record<string, any>) => TFnOutput
export type FetcherFn<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TFnOutput = any,
> = TInputSchema extends InputSchema
  ? (props: Input<TInputSchema>) => TFnOutput
  : TRoute extends Route0.AnyRoute
    ? Route0.HasParams<TRoute> extends true
      ? (props: Route0.Params<TRoute> & { query?: Route0.Query<TRoute> }) => TFnOutput
      : (props?: { query?: Route0.Query<TRoute> }) => TFnOutput
    : () => TFnOutput

// export type FetchOutput<
//   TPointType extends PointType,
//   TOutputData extends Data = Data,
//   TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
// > = TPointType extends 'response' ? TResponseOutput : TOutputData
export type FetchOutput<
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
  TOutputData extends Data = Data,
> = TResponseOutput extends ResponseOutput ? TResponseOutput : TOutputData

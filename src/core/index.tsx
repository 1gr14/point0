import { Error0 } from '@devp0nt/error0'
import type {
  AnyLocation,
  AnyRoute,
  CallabelRoute,
  ChildrenLocation,
  ExactLocation,
  Extended,
  KnownLocation,
} from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type {
  DehydratedState,
  MutationOptions,
  Query,
  QueryOptions,
  UseMutationResult,
  UseQueryResult,
  QueryKey as OriginalQueryKey,
} from '@tanstack/react-query'
import { QueryClient, hydrate, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHead } from '@unhead/react'
import * as React from 'react'
import { stringify } from 'safe-stable-stringify'
import type { ResolvableHead } from 'unhead/types'
import type { EversionRun, ExtractResult } from './eversion.js'
import { useIsInitalSsrLocation, useLocation } from './router.js'
import type {
  AppendCtx,
  BasePoint,
  ClientExtractFnRecord,
  ClientLoaderFn,
  ComponentComponent,
  ComponentMountable,
  ComponentMountableProps,
  Ctx,
  CtxFn,
  CurrentRouteDefinition,
  Data,
  DestinationComponentType,
  EmptyCtx,
  EndPointType,
  ErrorComponentType,
  ExtractFnRecord,
  FetchOptions,
  FetchOptionsFn,
  FetchOptionsOrFn,
  FetchOutput,
  FinalClientData,
  FinalData,
  FinalProps,
  HeadFn,
  IfAnyThen,
  Infer,
  InferredRootSourcePoint,
  InputParsed,
  InputRaw,
  InputSchema,
  InputSchemaZod,
  IsInputOptional,
  LayoutComponent,
  LayoutPoint,
  LoaderComponentType,
  LoaderFn,
  PageComponent,
  PointName,
  PointType,
  PrependCtx,
  Props,
  QueryKey,
  QueryOptionsSettings,
  FetchOutputType,
  RequiredCtx,
  ResponseFn,
  ResponseOutput,
  RootId,
  RouteDefinition,
  StaticHeadsCollection,
  TitleFn,
  UndefinedComponentComponent,
  UndefinedCtx,
  UndefinedData,
  UndefinedEndPointType,
  UndefinedInferredRootSourcePoint,
  UndefinedInputSchema,
  UndefinedLayoutComponent,
  UndefinedPageComponent,
  UndefinedPointName,
  UndefinedProps,
  UndefinedResponseOutput,
  UndefinedRoute,
  UndefinedRouteDefinition,
  WrapperComponentType,
  GeneralStore,
} from './types.js'
import { mergeHeaders, mergeResolvableHead } from './utils.js'

export class Point0<
  TPointType extends PointType,
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TProps extends Props | UndefinedProps,
> {
  Infer: Infer<TRequiredCtx, TCtx, TData, TClientData, TInputSchema> & {
    Input: InputParsed<TRouteDefinition, TInputSchema>
  } = {} as never

  // TODO: may it help somebody?
  // static readyPoints: ReadyPoint[] = []
  // static pagePoints: PagePoint[] = []
  static _prevUnstableId = 0
  static _getNextUnstableId(): number {
    return Point0._prevUnstableId++
  }

  point: typeof this // this, needed for generator to collect points

  _generalStore: GeneralStore

  _base: BasePoint<any, any, TRequiredCtx> | undefined
  _sourceBaseUrl: string | undefined
  _pointType: TPointType
  _letsEndPointType: TLetsEndPointType
  _inputSchema: TInputSchema
  _responseFn: TResponseOutput extends ResponseOutput
    ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
    : undefined
  _rootId: RootId
  _staticHeads: StaticHeadsCollection
  _queryOptions: QueryOptionsSettings
  _pageQueryOptions: QueryOptionsSettings
  // TODO: remove or use wrapper
  _wrapper: WrapperComponentType | undefined
  _hasSourceBase: TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint ? false : true
  _extractFns: ExtractFnRecord[]
  _clientExtractFns: ClientExtractFnRecord[]
  _route: TRouteDefinition extends RouteDefinition ? CallabelRoute<TRouteDefinition> : UndefinedRoute
  _prevRoute: TPrevRouteDefinition extends RouteDefinition ? CallabelRoute<TPrevRouteDefinition> : UndefinedRoute
  _page: PageComponent<TData, TClientData, TRouteDefinition> | UndefinedPageComponent
  _component: ComponentComponent<TData, TClientData, TProps> | UndefinedComponentComponent
  _layout: LayoutComponent<TData, TClientData, TRouteDefinition> | UndefinedLayoutComponent
  _layouts: LayoutPoint[]
  _name: PointName | UndefinedPointName
  _unstableId: number
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
    _letsEndPointType: TLetsEndPointType
    _base?: BasePoint<any, any, TRequiredCtx> | undefined
    _generalStore: GeneralStore
    _sourceBaseUrl?: string | undefined
    _inputSchema?: TInputSchema
    _responseFn?: TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
      : undefined
    _rootId: RootId
    _wrapper?: WrapperComponentType | undefined
    _staticHeads?: StaticHeadsCollection
    _queryOptions?: QueryOptionsSettings | undefined
    _pageQueryOptions?: QueryOptionsSettings | undefined
    _hasSourceBase?: TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint ? false : true
    _extractFns?: ExtractFnRecord[]
    _clientExtractFns?: ClientExtractFnRecord[]
    _route?: TRouteDefinition extends RouteDefinition ? CallabelRoute<TRouteDefinition> : UndefinedRoute
    _prevRoute?: TPrevRouteDefinition extends RouteDefinition ? CallabelRoute<TPrevRouteDefinition> : UndefinedRoute
    _page?: PageComponent<TData, TClientData, TRouteDefinition> | UndefinedPageComponent
    _component?: ComponentComponent<TData, TClientData, TProps> | UndefinedComponentComponent
    _layout?: LayoutComponent<TData, TClientData, TRouteDefinition> | UndefinedLayoutComponent
    _layouts?: LayoutPoint[]
    _name?: PointName | UndefinedPointName
    _fetchOptions?: FetchOptionsFn
    _errorComponent?: ErrorComponentType
    _pageErrorComponent?: ErrorComponentType<'page'>
    _componentErrorComponent?: ErrorComponentType<'component'>
    _loaderComponent?: LoaderComponentType
    _pageLoaderComponent?: LoaderComponentType<'page'>
    _componentLoaderComponent?: LoaderComponentType<'component'>
    _appLoaderComponent?: LoaderComponentType<'app'>
    _unstableId?: number
  }) {
    this.point = this
    this._rootId = props._rootId
    this._base = props._base ?? undefined
    this._inputSchema = (props._inputSchema ?? undefined) as TInputSchema
    this._sourceBaseUrl = props._sourceBaseUrl ?? undefined
    this._responseFn = (props._responseFn ?? undefined) as TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
      : undefined
    this._pointType = props._pointType
    this._letsEndPointType = props._letsEndPointType
    this._wrapper = props._wrapper
    this._staticHeads = props._staticHeads ?? []
    this._queryOptions = props._queryOptions ?? {}
    this._pageQueryOptions = props._pageQueryOptions ?? {}
    this._hasSourceBase = props._hasSourceBase as TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint
      ? false
      : true
    this._extractFns = props._extractFns ?? []
    this._clientExtractFns = props._clientExtractFns ?? []
    this._route =
      props._route ??
      (undefined as TRouteDefinition extends RouteDefinition ? CallabelRoute<TRouteDefinition> : UndefinedRoute)
    this._prevRoute =
      props._prevRoute ??
      (undefined as TPrevRouteDefinition extends RouteDefinition ? CallabelRoute<TPrevRouteDefinition> : UndefinedRoute)
    this._page = props._page ?? undefined
    this._component = props._component ?? undefined
    this._layout = props._layout ?? undefined
    this._layouts = props._layouts ?? []
    this._name = props._name
    this._fetchOptions = props._fetchOptions ?? (() => ({}))
    this._errorComponent =
      props._errorComponent ??
      ((({ error }) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'pre',
            null,
            JSON.stringify(error.toJSON(), null, 2), // `null, 2` makes it pretty-printed
          ),
        )) as ErrorComponentType)
    this._pageErrorComponent = props._pageErrorComponent
    this._componentErrorComponent = props._componentErrorComponent
    this._pageLoaderComponent = props._pageLoaderComponent
    this._loaderComponent =
      props._loaderComponent ?? ((() => React.createElement(React.Fragment, null, 'Loading...')) as LoaderComponentType)
    this._componentLoaderComponent = props._componentLoaderComponent
    this._appLoaderComponent = props._appLoaderComponent

    // calculated
    this._unstableId = props._unstableId ?? Point0._getNextUnstableId()

    // general store, it one for each point0 instance
    this._generalStore = props._generalStore
  }

  _continue<
    TPointType extends PointType,
    TLetsEndPointType extends EndPointType | UndefinedEndPointType,
    TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint,
    TRequiredCtx extends RequiredCtx,
    TCtx extends Ctx,
    TData extends Data | UndefinedData,
    TClientData extends Data | UndefinedData,
    TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
    TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
    TInputSchema extends InputSchema | UndefinedInputSchema,
    TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
    TProps extends Props | UndefinedProps,
  >(overrides: {
    _pointType: TPointType
    _letsEndPointType?: TLetsEndPointType
    _base?: BasePoint<any, any, TRequiredCtx> | undefined
    _sourceBaseUrl?: string | undefined
    _inputSchema?: TInputSchema
    _responseFn?: TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
      : undefined
    _staticHeads?: StaticHeadsCollection
    _queryOptions?: QueryOptionsSettings | undefined
    _pageQueryOptions?: QueryOptionsSettings | undefined
    _wrapper?: WrapperComponentType | undefined
    _extractFns?: ExtractFnRecord[]
    _clientExtractFns?: ClientExtractFnRecord[]
    _route?: IfAnyThen<
      TRouteDefinition extends RouteDefinition ? CallabelRoute<TRouteDefinition> : UndefinedRoute,
      AnyRoute
    >
    _prevRoute?: IfAnyThen<
      TPrevRouteDefinition extends RouteDefinition ? CallabelRoute<TPrevRouteDefinition> : UndefinedRoute,
      AnyRoute
    >
    _page?: PageComponent | UndefinedPageComponent
    _component?: ComponentComponent | UndefinedComponentComponent
    _layout?: LayoutComponent | UndefinedLayoutComponent
    _name?: PointName | UndefinedPointName
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
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return new Point0<
      TPointType,
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      // persistent
      _rootId: this._rootId,

      // overridable
      _base: overrides._base ?? (this._base as BasePoint<any, any, TRequiredCtx> | undefined),
      _pointType: overrides._pointType,
      _letsEndPointType: (overrides._letsEndPointType ?? this._letsEndPointType) as TLetsEndPointType,
      _sourceBaseUrl: overrides._sourceBaseUrl ?? this._sourceBaseUrl,
      _generalStore: this._generalStore,
      _inputSchema: (overrides._inputSchema ?? this._inputSchema) as TInputSchema,
      _responseFn: (overrides._responseFn ?? undefined) as TResponseOutput extends ResponseOutput
        ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
        : undefined, // remove end artefact on continue
      // _useLocation: overrides._useLocation ?? this._useLocation,
      _wrapper: overrides._wrapper ?? this._wrapper,
      _staticHeads: overrides._staticHeads ?? this._staticHeads,
      _queryOptions: overrides._queryOptions ?? { ...this._queryOptions },
      _pageQueryOptions: overrides._pageQueryOptions ?? { ...this._pageQueryOptions },
      _hasSourceBase: this._hasSourceBase as TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint
        ? false
        : true,
      _extractFns: overrides._extractFns ?? this._extractFns,
      _clientExtractFns: overrides._clientExtractFns ?? this._clientExtractFns,
      _route: (overrides._route ?? this._route) as never,
      _prevRoute: (overrides._prevRoute ?? this._prevRoute) as never,
      _page: (overrides._page ?? undefined) as PageComponent<TData, TClientData, TRouteDefinition> | undefined,
      _component: (overrides._component ?? undefined) as ComponentComponent<TData, TClientData, TProps> | undefined,
      _layout: (overrides._layout ?? undefined) as LayoutComponent<TData, TClientData, TRouteDefinition> | undefined,
      _layouts: !this._layout ? this._layouts : [...this._layouts, this as unknown as LayoutPoint],
      _name: overrides._name ?? this._name,
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

  static _isEndPointType(pointType: PointType): boolean {
    return (
      pointType === 'base' ||
      pointType === 'page' ||
      pointType === 'layout' ||
      pointType === 'response' ||
      pointType === 'query' ||
      pointType === 'infiniteQuery' ||
      pointType === 'mutation' ||
      pointType === 'component' ||
      pointType === 'client-ctx'
    )
  }
  _isEndpoint(): boolean {
    return Point0._isEndPointType(this._pointType)
  }

  // base

  static source(
    rootId: string,
  ): Point0<
    'middleware',
    'base',
    UndefinedInferredRootSourcePoint,
    UndefinedCtx,
    EmptyCtx,
    UndefinedData,
    UndefinedData,
    UndefinedRoute,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedResponseOutput,
    UndefinedProps
  > {
    return new Point0({
      _pointType: 'middleware',
      _hasSourceBase: false,
      _rootId: rootId,
      _letsEndPointType: 'base',
      _generalStore: {
        _queryClient: undefined,
        _createQueryClient: () => new QueryClient(),
      },
    })
  }

  static connect<TConnectedRootSourcePoint extends InferredRootSourcePoint>(
    rootId: string,
  ): Point0<
    'middleware',
    'base',
    TConnectedRootSourcePoint,
    TConnectedRootSourcePoint['Infer']['RequiredCtx'],
    TConnectedRootSourcePoint['Infer']['Ctx'],
    TConnectedRootSourcePoint['Infer']['Data'],
    TConnectedRootSourcePoint['Infer']['ClientData'],
    UndefinedRoute,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedResponseOutput,
    UndefinedProps
  > {
    return new Point0<
      'middleware',
      'base',
      TConnectedRootSourcePoint,
      TConnectedRootSourcePoint['Infer']['RequiredCtx'],
      TConnectedRootSourcePoint['Infer']['Ctx'],
      TConnectedRootSourcePoint['Infer']['Data'],
      TConnectedRootSourcePoint['Infer']['ClientData'],
      UndefinedRoute,
      UndefinedRoute,
      UndefinedInputSchema,
      UndefinedResponseOutput,
      UndefinedProps
    >({
      _pointType: 'middleware',
      _letsEndPointType: 'base',
      _hasSourceBase: true as never,
      _rootId: rootId,
      _generalStore: {
        _queryClient: undefined,
        _createQueryClient: () => new QueryClient(),
      },
    })
  }

  // middlewares

  base(): Point0<
    'base',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'base',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'base',
      _base: this as never as BasePoint<any, any, TRequiredCtx>,
      _name: this._name ?? this._rootId,
      _letsEndPointType: undefined,
    })
  }

  lets<TNewLetsEndPointType extends EndPointType>(
    letsEndPointType: TNewLetsEndPointType,
    pointName: PointName,
  ): Point0<
    'middleware',
    TNewLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    UndefinedData, // drop client data
    UndefinedRouteDefinition, // drop current route
    TRouteDefinition, // and use it as prev route
    TInputSchema,
    UndefinedResponseOutput, // drop response output
    TProps
  > {
    return this._continue<
      'middleware',
      TNewLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      UndefinedData,
      UndefinedRouteDefinition,
      TRouteDefinition,
      TInputSchema,
      UndefinedResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _letsEndPointType: letsEndPointType,
      _name: pointName,
      _route: undefined,
      _prevRoute: this._route as never,
      _sourceBaseUrl: this._base?._sourceBaseUrl,
      _staticHeads: this._base?._staticHeads,
      _queryOptions: this._base?._queryOptions,
      _pageQueryOptions: this._base?._pageQueryOptions,
      _clientExtractFns: [],
      _fetchOptions: this._base?._fetchOptions,
      _errorComponent: this._base?._errorComponent,
      _pageErrorComponent: this._base?._pageErrorComponent,
      _componentErrorComponent: this._base?._componentErrorComponent,
      _loaderComponent: this._base?._loaderComponent,
      _pageLoaderComponent: this._base?._pageLoaderComponent,
      _componentLoaderComponent: this._base?._componentLoaderComponent,
      _appLoaderComponent: this._base?._appLoaderComponent,
    })
  }

  sourceBaseUrl(
    sourceBaseUrl: string,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _sourceBaseUrl: sourceBaseUrl,
    })
  }

  queryClient(
    createQueryClient: () => QueryClient,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    this._generalStore._createQueryClient = createQueryClient
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
    })
  }

  fetchOptions(
    fetchOptionsOrFn: FetchOptionsOrFn,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _fetchOptions: typeof fetchOptionsOrFn === 'function' ? fetchOptionsOrFn : () => fetchOptionsOrFn,
    })
  }

  errorComponent(
    errorComponent: ErrorComponentType,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _errorComponent: errorComponent,
    })
  }

  pageErrorComponent(
    pageErrorComponent: ErrorComponentType<'page'>,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _pageErrorComponent: pageErrorComponent,
    })
  }

  componentErrorComponent(
    componentErrorComponent: ErrorComponentType<'component'>,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _componentErrorComponent: componentErrorComponent,
    })
  }

  pageLoaderComponent(
    pageLoaderComponent: LoaderComponentType<'page'>,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _pageLoaderComponent: pageLoaderComponent,
    })
  }

  componentLoaderComponent(
    componentLoaderComponent: LoaderComponentType<'component'>,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _componentLoaderComponent: componentLoaderComponent,
    })
  }

  appLoaderComponent(
    appLoaderComponent: LoaderComponentType<'app'>,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _appLoaderComponent: appLoaderComponent,
    })
  }

  loaderComponent(
    loaderComponent: LoaderComponentType,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _loaderComponent: loaderComponent,
    })
  }

  requireCtx<TExtraRequiredCtx extends Ctx>(): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
    PrependCtx<TCtx, TExtraRequiredCtx>,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
      PrependCtx<TCtx, TExtraRequiredCtx>,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
    })
  }

  // use<TChain extends Chain<TCtx, TData>(
  //   chain: TChain,
  // ): Point0<
  //   'middleware',
  //   TConnectedRootSourcePoint,
  //   TRequiredCtx,
  //   TChain['Infer']['Ctx'],
  //   TChain['Infer']['Data'],
  //   TRoute,
  //   TChain['Infer']['InputSchema'],
  //   TResponseOutput
  // > {
  //   const mergedExtractFns = [...this._extractFns, ...chain._extractFns].reduce<ExtractFnRecord[]>((acc, record) => {
  //     if (acc.find((f) => f.unstableId === record.unstableId)) {
  //       return acc
  //     }
  //     return [...acc, record]
  //   }, [])
  //   const mergedHeads = [...this._heads, ...chain._heads].reduce<HeadsCollection>((acc, head) => {
  //     if (typeof head === 'function') {
  //       // functions in head, mean that it use data, so we omit them, else it is static object that can be merged
  //       return acc
  //     }
  //     if (acc.find((h) => h === head)) {
  //       return acc
  //     }
  //     return [...acc, head]
  //   }, [])
  //   const layouts = (
  //     chain._layout
  //       ? [...this._layouts, ...chain._layouts, chain._layout]
  //       : [...this._layouts, ...chain._layouts]
  //   ).reduce<Array<LayoutComponent<TData, TRoute>>>((acc, layout) => {
  //     if (acc.find((l) => l === layout)) {
  //       return acc
  //     }
  //     return [...acc, layout]
  //   }, [])
  //   return this._clone<
  //     'middleware',
  //     TConnectedRootSourcePoint,
  //     TRequiredCtx,
  //     TChain['Infer']['Ctx'],
  //     TChain['Infer']['Data'],
  //     TRoute,
  //     TChain['Infer']['InputSchema'],
  //     TResponseOutput
  //   >({
  //     _pointType: 'middleware',
  //     _extractFns: mergedExtractFns,
  //     _heads: mergedHeads,
  //     _appLoaderComponent,
  //     _componentErrorComponent,
  //     _componentLoaderComponent,
  //     _errorComponent,
  //     _fetchOptions,
  //     _name,
  //     _inputSchema,
  //     _layout,
  //     _loaderComponent,
  //     _page,
  //     _pageErrorComponent,
  //     _pageLoaderComponent,
  //     _pageQueryOptions,
  //     _queryOptions,
  //     _responseFn,
  //     _route,
  //     _sourceBaseUrl,
  //     _useLocation,
  //     _wrapper,
  //   })
  // }

  ctx<TNewCtx extends Ctx = Ctx>(
    ctxFn: CtxFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewCtx>,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  ctx<TNewCtx extends Ctx = Ctx>(
    ctx: TNewCtx,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  ctx<TNewCtx extends Ctx = Ctx>(
    ctxOrFn: TNewCtx,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    const ctxFn = typeof ctxOrFn === 'function' ? ctxOrFn : ({ ctx }: { ctx: TCtx }) => ({ ...ctx, ...ctxOrFn })
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TNewCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _extractFns: [...this._extractFns, { type: 'ctx', fn: ctxFn, unstableId: Point0._getNextUnstableId() }] as never,
    })
  }

  route<TNewRoute extends AnyRoute>(
    route: TNewRoute,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TNewRoute['definition'],
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  route<TNewRouteDefinition extends `/${string}`>(
    routeDefinition: TNewRouteDefinition,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    Route0<TNewRouteDefinition>['definition'],
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  route<TNewRouteDefinition extends string>(
    relativeRouteDefinition: TNewRouteDefinition,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TPrevRouteDefinition extends RouteDefinition
      ? Extended<TPrevRouteDefinition, TNewRouteDefinition>['definition']
      : Route0<TNewRouteDefinition>['definition'],
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  route(): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TPrevRouteDefinition extends RouteDefinition ? TPrevRouteDefinition : never,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  route(route?: CallabelRoute | RouteDefinition) {
    const prevRoute = this._prevRoute
    const newRoute = (() => {
      if (typeof route === 'undefined') {
        if (!prevRoute) {
          throw new Error('Parent of this point have no route, so you cannot use .route() without argument')
        }
        return prevRoute.clone()
      }
      if (typeof route === 'string') {
        if (route.startsWith('/')) {
          return Route0.from(route)
        }
        return prevRoute ? prevRoute.extend(route) : Route0.from(route)
      }
      return route
    })()
    return this._continue({
      _pointType: 'middleware',
      _route: newRoute as CallabelRoute,
    }) as never
  }

  loader(): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  loader<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewData>,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  loader<TNewData extends Data = Data>(
    loaderFn?: LoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewData>,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TNewData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _extractFns: [
        ...this._extractFns,
        { type: 'loader', fn: loaderFn ?? ((c: any) => c.data), unstableId: Point0._getNextUnstableId() },
      ] as never,
    })
  }

  clientLoader<TNewClientData extends Data = Data>(
    clientLoaderFn: ClientLoaderFn<
      TLetsEndPointType,
      TRouteDefinition,
      FinalClientData<TData, TClientData>,
      TNewClientData
    >,
  ): Point0<
    'client-middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TNewClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'client-middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TNewClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'client-middleware',
      _clientExtractFns: [
        ...this._clientExtractFns,
        { type: 'loader', fn: clientLoaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
    })
  }

  head(
    headFn: HeadFn<TLetsEndPointType, TRouteDefinition, TData, TClientData>,
  ): Point0<
    'client-middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  head(
    head: ResolvableHead,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  head(headFnOrHead: HeadFn<TLetsEndPointType, TRouteDefinition, TData, TClientData> | ResolvableHead) {
    if (typeof headFnOrHead === 'function') {
      return this._continue({
        _pointType: 'client-middleware',
        _clientExtractFns: [
          ...this._clientExtractFns,
          { type: 'head', fn: headFnOrHead as never, unstableId: Point0._getNextUnstableId() },
        ],
      }) as never
    } else {
      return this._continue({
        _pointType: 'middleware',
        _staticHeads: [...this._staticHeads, headFnOrHead],
      }) as never
    }
  }

  title(
    titleFn: TitleFn<TLetsEndPointType, TRouteDefinition, TData, TClientData>,
  ): Point0<
    'client-middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  title(
    title: string,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  title(titleFnOrTitle: TitleFn<TLetsEndPointType, TRouteDefinition, TData, TClientData> | string) {
    if (typeof titleFnOrTitle === 'function') {
      const headFn: HeadFn = (props) => ({ title: titleFnOrTitle(props as never) })
      return this._continue({
        _pointType: 'client-middleware',
        _clientExtractFns: [
          ...this._clientExtractFns,
          { type: 'head', fn: headFn, unstableId: Point0._getNextUnstableId() },
        ],
      }) as never
    } else {
      return this._continue({
        _pointType: 'middleware',
        _staticHeads: [...this._staticHeads, { title: titleFnOrTitle }],
      }) as never
    }
  }

  props<TNewProps extends Props>(): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TNewProps
  > {
    return this._continue({
      _pointType: 'middleware',
    }) as never
  }

  input<TNewInputSchema extends InputSchemaZod>(
    inputSchema: TNewInputSchema,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TNewInputSchema,
    TResponseOutput,
    TProps
  >
  input(inputSchema: InputSchemaZod) {
    return this._continue({
      _pointType: 'middleware',
      _inputSchema: inputSchema,
    }) as never
  }

  // end points

  _isRoot(): boolean {
    return this._name === this._rootId
  }

  getQueryClient(): QueryClient {
    if (typeof window === 'undefined') {
      return this._generalStore._createQueryClient()
    }
    this._generalStore._queryClient ??= this._generalStore._createQueryClient()
    return this._generalStore._queryClient
  }

  page<TPage extends PageComponent<TData, TClientData, TRouteDefinition>>(
    page: TPage,
  ): Point0<
    'page',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    if (!this._route) {
      throw new Error('add .route() to chain to use .page() function')
    }
    return this._continue<
      'page',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'page',
      _page: page as PageComponent,
      _letsEndPointType: undefined,
    })
  }

  component<TComponent extends ComponentComponent<TData, TClientData, TProps>>(
    component: TComponent,
  ): ComponentMountable<TInputSchema, TProps> & {
    point: Point0<
      'component',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >
  } {
    const point = this._continue<
      'component',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'component',
      _component: component as ComponentComponent,
      _letsEndPointType: undefined,
    })
    const componentWithPoint = point._Component
    Object.assign(componentWithPoint, { point })
    return componentWithPoint as never
  }

  layout<TLayout extends LayoutComponent<TData, TClientData, TRouteDefinition>>(
    layout: TLayout,
  ): Point0<
    'layout',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    if (!this._route) {
      throw new Error('add .route() to chain to use .layout() function')
    }
    return this._continue<
      'layout',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'layout',
      _layout: layout as LayoutComponent,
      _letsEndPointType: undefined,
    })
  }

  clientCtx<TNewClientData extends Data = Data>(
    clientLoaderFn: ClientLoaderFn<
      TLetsEndPointType,
      TRouteDefinition,
      FinalClientData<TData, TClientData>,
      TNewClientData
    >,
  ): Point0<
    'client-ctx',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TNewClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  clientCtx(): Point0<
    'client-ctx',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  clientCtx(clientLoaderFn?: ClientLoaderFn<any, any, any>) {
    return this._continue({
      _pointType: 'client-ctx',
      _clientExtractFns: clientLoaderFn
        ? [...this._clientExtractFns, { type: 'loader', fn: clientLoaderFn, unstableId: Point0._getNextUnstableId() }]
        : this._clientExtractFns,
      _letsEndPointType: undefined,
    }) as never
  }

  response<TNewResponseOutput extends ResponseOutput = ResponseOutput>(
    responseFn: ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewResponseOutput>,
  ): Point0<
    'response',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TNewResponseOutput,
    TProps
  > {
    return this._continue<
      'response',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TNewResponseOutput,
      TProps
    >({
      _pointType: 'response',
      _responseFn: responseFn as never,
      _letsEndPointType: undefined,
    })
  }

  query<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewData>,
  ): Point0<
    'query',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'query',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TNewData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'query',
      _extractFns: [
        ...this._extractFns,
        { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
      _letsEndPointType: undefined,
    })
  }

  mutation<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewData>,
  ): Point0<
    'mutation',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'mutation',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TNewData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'mutation',
      _extractFns: [
        ...this._extractFns,
        { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
      _letsEndPointType: undefined,
    })
  }

  // getters

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
    return this._extractFns.some((fn) => fn.type === 'loader')
  }

  _clientExtractFnsHasOnlyHeadFnsOrEmpty(): boolean {
    return this._clientExtractFns.length === 0 || this._clientExtractFns.every((fn) => fn.type === 'head')
  }

  _getClientHeadFnsUntilFirstClientLoader(): Array<ClientExtractFnRecord<'head'>> {
    const result: Array<ClientExtractFnRecord<'head'>> = []
    for (const fn of this._clientExtractFns) {
      if (fn.type === 'head') {
        result.push(fn)
      } else {
        break
      }
    }
    return result
  }

  _hasClientLoader(): boolean {
    return this._clientExtractFns.some((fn) => fn.type === 'loader')
  }

  _hasClientAsyncLoader(): boolean {
    return this._clientExtractFns.some((fn) => fn.type === 'loader' && fn.fn.constructor.name === 'AsyncFunction')
  }

  _getRouteForce = (): CallabelRoute<NonNullable<TRouteDefinition>> => {
    if (!this._route) {
      throw new Error(`No client route provided for this point. Name: ${this._name}.`)
    }
    return this._route as CallabelRoute<NonNullable<TRouteDefinition>>
  }

  _extractClientAsync = async ({
    data,
    location,
    skipHeads,
  }: {
    data: Data
    location: AnyLocation
    skipHeads: boolean
  }): Promise<{ clientData: Data; clientHeadMerged: ResolvableHead }> => {
    let currentClientData: Data = data
    let clientHeadMerged: ResolvableHead = {}
    for (const clientExtractFn of this._clientExtractFns) {
      switch (clientExtractFn.type) {
        case 'head': {
          if (skipHeads) {
            continue
          }
          clientHeadMerged = mergeResolvableHead(
            clientHeadMerged,
            clientExtractFn.fn({ data: currentClientData, location }),
          )
          break
        }
        case 'loader': {
          currentClientData = await clientExtractFn.fn({
            data: currentClientData,
            location,
          })
          break
        }
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        default: {
          throw new Error(`Unknown client extend fn type: ${(clientExtractFn as any).type}`)
        }
      }
    }
    return { clientData: currentClientData, clientHeadMerged }
  }

  _extractClientSync = ({
    data,
    location,
    skipHeads,
  }: {
    data: Data
    location: AnyLocation
    skipHeads: boolean
  }): { clientData: Data; clientHead: ResolvableHead[] } => {
    let currentClientData: Data = data
    const clientHead: ResolvableHead[] = []
    for (const clientExtractFn of this._clientExtractFns) {
      switch (clientExtractFn.type) {
        case 'head': {
          if (skipHeads) {
            continue
          }
          clientHead.push(clientExtractFn.fn({ data: currentClientData, location }))
          break
        }
        case 'loader': {
          currentClientData = clientExtractFn.fn({
            data: currentClientData,
            location,
          }) as Data
          break
        }
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        default: {
          throw new Error(`Unknown client extend fn type: ${(clientExtractFn as any).type}`)
        }
      }
    }
    return { clientData: currentClientData, clientHead }
  }

  _getSelfLocationByAnotherLocation(location: AnyLocation): KnownLocation<CurrentRouteDefinition<TRouteDefinition>> {
    const route = this._getRouteForce()
    return route.getLocation(route.flat({ ...location.searchParams, ...location.params })) as KnownLocation<
      CurrentRouteDefinition<TRouteDefinition>
    >
  }

  _getUnsafeInputRawByLocation(location: AnyLocation): InputRaw<TRouteDefinition, TInputSchema> {
    const selfLocation = this._getSelfLocationByAnotherLocation(location)
    if (!selfLocation.exact) {
      throw new Error(
        `Location is not exact or children. Name: ${this._name}. Route: ${JSON.stringify(this._getRouteForce().getDefinition())}. Other Location: ${JSON.stringify(location)}. Self Location: ${JSON.stringify(selfLocation)}.`,
      )
    }
    return { ...selfLocation.searchParams, ...selfLocation.params } as InputRaw<TRouteDefinition, TInputSchema>
  }

  _PageInner: React.ComponentType<{
    data: FinalData<TData>
    location: ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
  }> = ({ data, location }) => {
    const errorComponent = this._getErrorComponent({ type: 'page' })
    const loaderComponent = this._getLoaderComponent({ type: 'page' })

    if (!this._page) {
      return React.createElement(errorComponent, { type: 'page', error: new Error0('No page component'), location })
    }

    for (const staticHead of this._staticHeads) {
      useHead(staticHead)
    }

    if (this._clientExtractFnsHasOnlyHeadFnsOrEmpty()) {
      for (const headFn of this._clientExtractFns) {
        useHead((headFn.fn as HeadFn)({ data, location }))
      }
      return React.createElement(this._page, { data: data as FinalClientData<TData, TClientData>, location })
    }

    if (!this._hasClientAsyncLoader()) {
      try {
        const { clientData, clientHead } = this._extractClientSync({ data, location, skipHeads: false })
        for (const head of clientHead) {
          useHead(head)
        }
        return React.createElement(this._page, { data: clientData as FinalClientData<TData, TClientData>, location })
      } catch (error: unknown) {
        return React.createElement(errorComponent, { type: 'page', error: Error0.from(error), location })
      }
    }

    // TODO: we should store state globally, to prevent on hmr rernder of page, it is blinking
    // lets use reactQuery cache here, and store there clientData and clientHead
    const [clientHead, setClientHead] = React.useState<ResolvableHead>({})
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<Error0 | undefined>(undefined)
    const [clientData, setClientData] = React.useState<Data>({})
    React.useEffect(() => {
      void (async () => {
        setLoading(true)
        try {
          const { clientData, clientHeadMerged } = await this._extractClientAsync({ data, location, skipHeads: false })
          setClientHead(clientHeadMerged)
          setClientData(clientData)
          setLoading(false)
        } catch (error) {
          setError(Error0.from(error))
          setLoading(false)
        }
      })()
    }, [data, location])

    useHead(clientHead)

    if (loading) {
      return React.createElement(loaderComponent, { type: 'page', location })
    }
    if (error) {
      return React.createElement(errorComponent, { type: 'page', error, location })
    }
    return React.createElement(this._page, { data: clientData as FinalClientData<TData, TClientData>, location })
  }

  _Page: React.ComponentType = () => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()
    if (!this._hasLoader()) {
      return React.createElement(this._PageInner, {
        data: {} as FinalData<TData>,
        location: location as ExactLocation<CurrentRouteDefinition<TRouteDefinition>>,
      })
    }

    const loaderComponent = this._getLoaderComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })
    const isInitalSsrLocation = useIsInitalSsrLocation()
    const input = this._getUnsafeInputRawByLocation(location)
    const { queryKey, queryCache } = this.useQueryCache(input)
    const result = useQuery({
      queryKey,
      queryFn: async () => {
        return await this.fetch(input)
      },
      enabled: !isInitalSsrLocation || queryCache?.state.status !== 'error',
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      ...this._queryOptions,
      ...this._pageQueryOptions,
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
    return React.createElement(this._PageInner, {
      data: result.data as FinalData<TData>,
      location: location as ExactLocation<CurrentRouteDefinition<TRouteDefinition>>,
    })
  }

  _ComponentInner: React.ComponentType<{
    data: FinalData<TData>
    location: AnyLocation
    props: FinalProps<TProps>
  }> = ({ data, location, props }) => {
    const errorComponent = this._getErrorComponent({ type: 'component' })
    const loaderComponent = this._getLoaderComponent({ type: 'component' })

    if (!this._component) {
      return React.createElement(errorComponent, {
        type: 'component',
        error: new Error0('No component component'),
        location,
      })
    }

    if (this._clientExtractFnsHasOnlyHeadFnsOrEmpty()) {
      return React.createElement(this._component, {
        data: data as FinalClientData<TData, TClientData>,
        location,
        props,
      })
    }

    if (!this._hasClientAsyncLoader()) {
      try {
        const { clientData } = this._extractClientSync({ data, location, skipHeads: true })
        return React.createElement(this._component, {
          data: clientData as FinalClientData<TData, TClientData>,
          location,
          props,
        })
      } catch (error: unknown) {
        return React.createElement(errorComponent, { type: 'component', error: Error0.from(error), location })
      }
    }

    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<Error0 | undefined>(undefined)
    const [clientData, setClientData] = React.useState<Data>({})
    React.useEffect(() => {
      void (async () => {
        setLoading(true)
        try {
          const { clientData } = await this._extractClientAsync({ data, location, skipHeads: true })
          setClientData(clientData)
          setLoading(false)
        } catch (error) {
          setError(Error0.from(error))
          setLoading(false)
        }
      })()
    }, [data, location])

    if (loading) {
      return React.createElement(loaderComponent, { type: 'component', location })
    }
    if (error) {
      return React.createElement(errorComponent, { type: 'component', error, location })
    }
    return React.createElement(this._component, {
      data: clientData as FinalClientData<TData, TClientData>,
      location,
      props,
    })
  }

  _Component: ComponentMountable<TInputSchema, TProps> = (props) => {
    const { input = {}, ...restProps } = props as ComponentMountableProps<InputSchema, TProps>
    const location = useLocation()
    if (!this._hasLoader()) {
      return React.createElement(this._ComponentInner, {
        data: {} as FinalData<TData>,
        location,
        props: restProps as unknown as FinalProps<TProps>,
      })
    }

    const loaderComponent = this._getLoaderComponent({ type: 'component' })
    const errorComponent = this._getErrorComponent({ type: 'component' })
    const result = this.useQuery(input as never)

    if (result.error) {
      return React.createElement(errorComponent, { type: 'component', error: Error0.from(result.error), location })
    }
    if (result.isLoading) {
      return React.createElement(loaderComponent, { type: 'component', location })
    }
    if (!result.data) {
      return React.createElement(errorComponent, { type: 'component', error: new Error0('No data'), location })
    }
    return React.createElement(this._ComponentInner, {
      data: result.data as FinalData<TData>,
      location,
      props: restProps as unknown as FinalProps<TProps>,
    })
  }

  _LayoutInner: React.ComponentType<{
    children: React.ReactNode
    location:
      | ChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
      | ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
    data: FinalData<TData>
  }> = ({ children, location, data }) => {
    const errorComponent = this._getErrorComponent({ type: 'page' })
    const loaderComponent = this._getLoaderComponent({ type: 'page' })

    if (!this._layout) {
      return React.createElement(errorComponent, { type: 'page', error: new Error0('No layout component'), location })
    }

    if (this._clientExtractFnsHasOnlyHeadFnsOrEmpty()) {
      return React.createElement(this._layout, {
        data: data as FinalClientData<TData, TClientData>,
        location,
        children,
      })
    }

    if (!this._hasClientAsyncLoader()) {
      try {
        const { clientData } = this._extractClientSync({ data, location, skipHeads: true })
        return React.createElement(this._layout, {
          data: clientData as FinalClientData<TData, TClientData>,
          location,
          children,
        })
      } catch (error: unknown) {
        return React.createElement(errorComponent, { type: 'page', error: Error0.from(error), location })
      }
    }

    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<Error0 | undefined>(undefined)
    const [clientData, setClientData] = React.useState<Data>({})
    React.useEffect(() => {
      void (async () => {
        setLoading(true)
        try {
          const { clientData } = await this._extractClientAsync({ data, location, skipHeads: true })
          setClientData(clientData)
          setLoading(false)
        } catch (error) {
          setError(Error0.from(error))
          setLoading(false)
        }
      })()
    }, [data, location])

    if (loading) {
      return React.createElement(loaderComponent, { type: 'page', location })
    }
    if (error) {
      return React.createElement(errorComponent, { type: 'page', error, location })
    }
    return React.createElement(this._layout, {
      data: clientData as FinalClientData<TData, TClientData>,
      location,
      children,
    })
  }

  _Layout: React.ComponentType<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()

    if (!this._hasLoader()) {
      return React.createElement(this._LayoutInner, {
        data: {} as FinalData<TData>,
        location: location as
          | ChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
          | ExactLocation<CurrentRouteDefinition<TRouteDefinition>>,
        children,
      })
    }

    const loaderComponent = this._getLoaderComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })
    const input = this._getUnsafeInputRawByLocation(location)
    const { queryKey, queryCache } = this.useQueryCache(input)
    const isInitalSsrLocation = useIsInitalSsrLocation()
    const result = useQuery({
      queryKey,
      queryFn: async () => {
        return await this.fetch(input)
      },
      enabled: !isInitalSsrLocation || queryCache?.state.status !== 'error',
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      ...this._queryOptions,
      ...this._pageQueryOptions,
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
    return React.createElement(this._LayoutInner, {
      data: result.data as FinalData<TData>,
      location: location as
        | ChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
        | ExactLocation<CurrentRouteDefinition<TRouteDefinition>>,
      children,
    })
  }

  _ClientCtxReactContext: React.Context<FinalClientData<TData, TClientData>> = React.createContext<
    FinalClientData<TData, TClientData>
  >(null as never)

  _ClientCtxProviderInner: React.ComponentType<{
    children: React.ReactNode
    location: AnyLocation
    data: FinalData<TData>
  }> = ({ children, location, data }) => {
    const errorComponent = this._getErrorComponent({ type: 'page' })
    const loaderComponent = this._getLoaderComponent({ type: 'page' })

    if (this._pointType !== 'client-ctx') {
      return React.createElement(errorComponent, {
        type: 'page',
        error: new Error0('Point type is not client-ctx'),
        location,
      })
    }

    if (this._clientExtractFnsHasOnlyHeadFnsOrEmpty()) {
      return React.createElement(this._ClientCtxReactContext.Provider, {
        value: data as FinalClientData<TData, TClientData>,
        children,
      })
    }

    if (!this._hasClientAsyncLoader()) {
      try {
        const { clientData } = this._extractClientSync({ data, location, skipHeads: true })
        return React.createElement(this._ClientCtxReactContext.Provider, {
          value: clientData as FinalClientData<TData, TClientData>,
          children,
        })
      } catch (error: unknown) {
        return React.createElement(errorComponent, { type: 'page', error: Error0.from(error), location })
      }
    }

    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<Error0 | undefined>(undefined)
    const [clientData, setClientData] = React.useState<Data>({})
    React.useEffect(() => {
      void (async () => {
        setLoading(true)
        try {
          const { clientData } = await this._extractClientAsync({
            data,
            location: location as AnyLocation<CurrentRouteDefinition<TRouteDefinition>>,
            skipHeads: true,
          })
          setClientData(clientData)
          setLoading(false)
        } catch (error) {
          setError(Error0.from(error))
          setLoading(false)
        }
      })()
    }, [data, location])

    if (loading) {
      return React.createElement(loaderComponent, { type: 'page', location })
    }
    if (error) {
      return React.createElement(errorComponent, { type: 'page', error, location })
    }
    return React.createElement(this._ClientCtxReactContext.Provider, {
      value: clientData as FinalClientData<TData, TClientData>,
      children,
    })
  }

  Provider: React.ComponentType<{ children: React.ReactNode }> = ({ children }) => {
    if (!this._hasLoader()) {
      return React.createElement(this._ClientCtxProviderInner, {
        data: {} as FinalData<TData>,
        location: useLocation<CurrentRouteDefinition<TRouteDefinition>>(),
        children,
      })
    }

    // TODO: allow input as prop
    const input = {} as never
    const loaderComponent = this._getLoaderComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()
    const isInitalSsrLocation = useIsInitalSsrLocation()
    const { queryCache, queryKey } = this.useQueryCache(input)
    const result = useQuery({
      queryKey,
      queryFn: async () => {
        return await this.fetch(input)
      },
      enabled: !isInitalSsrLocation || queryCache?.state.status !== 'error',
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      ...this._queryOptions,
      ...this._pageQueryOptions,
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
    return React.createElement(this._ClientCtxProviderInner, {
      data: result.data as FinalData<TData>,
      location,
      children,
    })
  }

  useClientCtx = (): FinalClientData<TData, TClientData> => {
    const ctx = React.useContext(this._ClientCtxReactContext)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!ctx) {
      throw new Error(`useClientCtx on must be used within a ClientCtxProvider`)
    }
    return ctx
  }

  async fetch(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
      : [input: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
  ): Promise<FetchOutput<TResponseOutput, TData>> {
    const [input = {}, options] = args
    const fetchOptions = { ...this._fetchOptions(), ...options }
    const headers = mergeHeaders(fetchOptions.headers, options?.headers, { Accept: 'application/json' })
    const url = new URL('/_point0', this._sourceBaseUrl)
    const method = 'post'

    headers.set('Content-Type', 'application/json')
    const outputType = args[2] ?? (this._pointType === 'response' ? 'response' : 'data')
    const body = stringify({
      outputType,
      rootId: this._rootId,
      pointInput: input,
      pointType: this._pointType,
      pointName: this._name,
    })
    const res = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
      method,
      body,
    })
    if (this._pointType === 'response') {
      return res as FetchOutput<TResponseOutput, TData>
    }
    const json = await res.json()
    if (res.ok) {
      return json
    }
    throw Error0.from(json, {
      httpStatus: res.status,
    })
  }

  async extract(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [eversionRun: EversionRun<TRequiredCtx>, input?: InputRaw<TRouteDefinition, TInputSchema>]
      : [eversionRun: EversionRun<TRequiredCtx>, input: InputRaw<TRouteDefinition, TInputSchema>]
  ): Promise<ExtractResult<TCtx, FinalData<TData>, TResponseOutput>> {
    const [eversionRun, input = {}] = args
    return (await eversionRun.extract({
      point: this as never,
      input,
    })) as ExtractResult<TCtx, FinalData<TData>, TResponseOutput>
  }

  static parseQueryKey(queryKey: OriginalQueryKey | QueryKey):
    | {
        pointType: EndPointType
        pointName: PointName
        outputType: string
        input: InputRaw
      }
    | undefined {
    const [check, pointType, pointName, outputType, input] = queryKey
    if (
      check !== 'point0' ||
      typeof pointType !== 'string' ||
      typeof pointName !== 'string' ||
      typeof outputType !== 'string' ||
      typeof input !== 'string'
    ) {
      return undefined
    }
    return {
      pointType: pointType as EndPointType,
      pointName,
      outputType,
      input: JSON.parse(input) as InputRaw,
    }
  }

  getQueryKey(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>, _outputType?: FetchOutputType]
      : [input: InputRaw<TRouteDefinition, TInputSchema>, _outputType?: FetchOutputType]
  ): QueryKey {
    if (!this._name) {
      throw new Error('Point name is not provided')
    }
    const [input = {}] = args
    const outputType = args[1] ?? (this._pointType === 'response' ? 'response' : 'data')
    return ['point0', this._pointType, this._name, outputType, stringify(input)]
  }

  getQueryOptions(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: QueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
          _outputType?: FetchOutputType,
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: QueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
          _outputType?: FetchOutputType,
        ]
  ): QueryOptions<FetchOutput<TResponseOutput, TData>, Error0> & { queryKey: QueryKey } {
    const [input, queryOptions, fetchOptions, outputType] = args
    const queryKey = this.getQueryKey(input as never, outputType)
    const queryFn = async () => {
      const data = await this.fetch(input as never, fetchOptions, outputType)
      return data
    }
    return {
      ...this._queryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    } as never
  }

  getMutationOptions(
    mutationOptions?: MutationOptions,
    fetchOptions?: FetchOptions,
  ): MutationOptions<FetchOutput<TResponseOutput, TData>, Error0, InputParsed<TRouteDefinition, TInputSchema>> {
    const mutationFn = async (input: Record<string, any> = {}) => {
      const data = await this.fetch(input as never, fetchOptions)
      return data
    }
    return {
      ...mutationOptions,
      mutationFn,
      // TODO: add .mutationOptions helper
    } as MutationOptions<FetchOutput<TResponseOutput, TData>, Error0, InputParsed<TRouteDefinition, TInputSchema>>
  }

  useQuery = (
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: QueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
          _outputType?: FetchOutputType,
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: QueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
          _outputType?: FetchOutputType,
        ]
  ): UseQueryResult<FetchOutput<TResponseOutput, TData>, Error0> => {
    return useQuery(this.getQueryOptions(...args))
  }

  useQueryCache = (
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>, _outputType?: FetchOutputType]
      : [input: InputRaw<TRouteDefinition, TInputSchema>, _outputType?: FetchOutputType]
  ): {
    queryCache: Query<FetchOutput<TResponseOutput, TData>, Error0> | undefined
    queryKey: QueryKey
  } => {
    const queryClient = useQueryClient()
    const cache = queryClient.getQueryCache()
    const queryKey = this.getQueryKey(...args)
    const query = cache.find({ queryKey })
    return { queryCache: query, queryKey } as never
  }

  useMutation = (
    mutationOptions?: MutationOptions | undefined,
    fetchOptions?: FetchOptions | undefined,
  ): UseMutationResult<FetchOutput<TResponseOutput, TData>, Error0, InputParsed<TRouteDefinition, TInputSchema>> => {
    return useMutation(this.getMutationOptions(mutationOptions, fetchOptions))
  }

  async prefetchQuery(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input: InputRaw<TRouteDefinition, TInputSchema> | undefined,
          options: {
            queryClient: QueryClient
            queryOptions?: QueryOptions
            fetchOptions?: FetchOptions
            force?: boolean
          },
          _outputType?: FetchOutputType,
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          options: {
            queryClient: QueryClient
            queryOptions?: QueryOptions
            fetchOptions?: FetchOptions
            force?: boolean
          },
          _outputType?: FetchOutputType,
        ]
  ): Promise<undefined | QueryKey> {
    const [input, { queryClient, queryOptions: providedQueryOptions, fetchOptions, force }, outputType] = args
    if (!this._hasLoader()) {
      return
    }
    const suitablePointTypes = ['page', 'query', 'infiniteQuery', 'component', 'layout', 'client-ctx']
    if (!suitablePointTypes.includes(this._pointType)) {
      return
    }
    const queryOptions = this.getQueryOptions(input as never, providedQueryOptions, fetchOptions, outputType)
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryOptions.queryKey as never })
    if (query && !force) {
      return
    }
    await queryClient.prefetchQuery(queryOptions as never)
    return queryOptions.queryKey
  }

  async prefetchPage(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input: InputRaw<TRouteDefinition, TInputSchema> | undefined,
          options: {
            queryClient: QueryClient
            queryOptions?: QueryOptions
            fetchOptions?: FetchOptions
            force?: boolean
          },
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          options: {
            queryClient: QueryClient
            queryOptions?: QueryOptions
            fetchOptions?: FetchOptions
            force?: boolean
          },
        ]
  ): Promise<void> {
    if (this._pointType !== 'page') {
      throw new Error('Point type is not page')
    }
    if (!this._hasLoader()) {
      return
    }
    const queryKey = await this.prefetchQuery(...(args as never), 'dehydratedState')
    if (!queryKey) {
      return
    }
    const [, { queryClient }] = args
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryKey as never })
    const data = query?.state.data as { dehydratedState: DehydratedState } | undefined
    if (!data?.dehydratedState) {
      return
    }
    hydrate(queryClient, data.dehydratedState)
  }
}

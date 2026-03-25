import * as flat0 from '@devp0nt/flat0'
import type {
  AnyLocation,
  AnyRoute,
  AnyRouteOrDefinition,
  CallableRoute,
  ExactLocation,
  HasParams,
  ParamsOutput,
  UnknownSearchInput,
  UnknownSearchParsed,
  WeakAncestorLocation,
} from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type {
  DehydratedState,
  InfiniteData,
  MutationOptions,
  QueryClient,
  UseInfiniteQueryResult,
  UseMutationOptions,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query'
import { hydrate, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHead } from '@unhead/react'
import * as React from 'react'
import { stringify } from 'safe-stable-stringify'
import type { ResolvableHead } from 'unhead/types'
import type { Context } from 'use-context-selector'
import { createContext, useContextSelector } from 'use-context-selector'
import { _point0_env } from './env.js'
import type { ClassLikeError0 } from './error.js'
import { ErrorPoint0 } from './error.js'
import type {
  AnyEventerEvent,
  AnyEventerEventName,
  AnyEventerSubscriptionCallback,
  ClientEventerEventName,
  ClientEventerSubscriptionCallback,
  EventerSubscription,
  ServerEventerEventName,
  ServerEventerSubscriptionCallback,
  UniqEventerErrorEventName,
} from './eventer.js'
import { uniqEventerErrorEventNames } from './eventer.js'
import { ClientOnly, getFetch, setStatus, useIsHydrated } from './helpers.js'
import { _getFakeClient, _ss } from './internals.js'
import type { LogFn } from './logger.js'
import type {
  AppendProps,
  AppendQueries,
  ClientOnlyFallbackComponentType,
  ComponentSelfProps,
  ComponentSelfType,
  ComponentSuccessComponentType,
  DestinationComponentVariant,
  EmptyProps,
  ErrorComponentType,
  GlobalHeadFn,
  HeadFn,
  IsQueryShouldBeFinalized,
  LayoutLocation,
  LayoutSelfProps,
  LayoutSelfType,
  LayoutSuccessComponentType,
  LoadingComponentType,
  LocationOrAnyLocation,
  MapperFn,
  MergeQueries,
  MountAction,
  MountableLocation,
  MountableSelfType,
  MountableState,
  MountableSuccessData,
  OnPrefetchMountableFn,
  PageLocation,
  PageSelfProps,
  PageSelfType,
  PageSuccessComponentType,
  Props,
  ProviderSelfProps,
  ProviderSelfType,
  QueriesDefinitions,
  QueriesDefinitionsByQueries,
  QueriesResults,
  QueryDefinition,
  QueryDefinitionByQuery,
  RelatedQueryInputGetter,
  UndefinedComponentSuccessComponent,
  UndefinedLayoutSuccessComponent,
  UndefinedSuccessPageComponent,
  UseQueryOrInfiniteQueryResult,
  WithFn,
  WithFnOptions,
  WithQueryFn,
  WithSelfQueryIfShouldBeFinalized,
  WrapperComponentType,
} from './mountable.js'
import { useNavigationTransitionState, type NavigationPageState } from './navigation.js'
import { useLocation } from './navigation.js'
import type { PopularRequestMethod, WideRequestMethod } from './request0.js'
import { extractKeysBySchemasHelpers } from './schema/utils.js'
import { superstore } from './super-store.js'
import type {
  AnyPoint,
  AppendCtx,
  AppendCtxExposedKeys,
  AsserNotMashInputSchemas,
  AssertActionSchemaOnly,
  AssertInputSchemaHasNotAnotherKeys,
  AssertInputSchemaHasSameKeys,
  AssertInputSchemaIncludesKeys,
  AssertInputSchemaNotWider,
  AssertNoArrayReturn,
  AssertNoForbiddenCtxExposedKeys,
  AssertNoForbiddenMethodsIfNotSuitableStage,
  AssertNotFunction,
  AssertRoutedInputSchemaOnly,
  AssertSchemaNotWider,
  AssertUsualInputSchemaOnly,
  BasePoint,
  ClientExecuteAction,
  ClientLoaderDataFn,
  ClientLoaderResponseFn,
  Ctx,
  CtxExposedKeys,
  CtxFn,
  CurrentRouteDefinition,
  CustomValidationFn,
  CustomValidationFnToRecordValidationSchema,
  CustomValidationFnWithKnownInput,
  CustomValidationFnWithKnownInputToRecordValidationSchema,
  Data,
  DataTransformer,
  DataTransformerExtended,
  EmptyCtx,
  EmptyData,
  EndpointDefinition,
  ExtendRouteDefinition,
  ExtraUseInfiniteQueryOptions,
  ExtraUseQueryOptions,
  FetchOptions,
  FetchOptionsFn,
  FetchOptionsOrFn,
  FetchServerDetailedOutput,
  FetchServerOutput,
  FetchServerOutputType,
  FinalInputRaw,
  FinalInputRawOrUndefined,
  FinalInputRawOrUndefinedOrVoid,
  FinalLoaderData,
  FinalLoaderDataOrNever,
  FinalLoaderOutput,
  IfAnyThenElse,
  IfNeverThen,
  Infer,
  InferCtxFnOutputCtxAppend,
  InputParsed,
  InputRaw,
  InputRawUnknown,
  InputSchema,
  IsFinalInputOptional,
  IsUndefined,
  LayoutPoint,
  LoaderDataFn,
  LoaderOutput,
  LoaderResponseFn,
  MapperOutput,
  MergeRecordValidationSchemas,
  MiddlewareFn,
  MiddlewareFnOptions,
  MountablePointType,
  NiceActionReadyPoint,
  NiceBaseReadyPoint,
  NiceComponentReadyPoint,
  NiceInfiniteQueryReadyPoint,
  NiceLayoutReadyPoint,
  NiceMutationReadyPoint,
  NicePageReadyPoint,
  NicePluginReadyPoint,
  NicePluginStagePoint,
  NiceProviderReadyPoint,
  NiceQueryReadyPoint,
  NiceRootReadyPoint,
  NiceRootStagePoint,
  NiceStagePoint,
  // NormalizeQueryResultType,
  NormalizedPrefetchPagePolicy,
  PartialUseInfiniteQueryOptions,
  PointName,
  PointType,
  PointsScope,
  PrefetchPagePolicy,
  QueriedFiniteData,
  QueriedInfiniteData,
  // QueriedData,
  QueryKey,
  QueryMode,
  QueryResultType,
  ReadyPoint,
  ReadyPointType,
  ReadyPointTypeOrNever,
  RecordValidationSchema,
  RequestableReadyPointType,
  RequiredCtx,
  RootPoint,
  RouteDefinition,
  RouteSchema,
  SchemaHelper,
  ScrollPositionGetter,
  ScrollPositionRestorePolicy,
  ScrollPositionSetter,
  ServerExecuteAction,
  ShowError,
  SimpleSafeParseInputResult,
  StagePointTypeOrNever,
  UndefinedCtx,
  UndefinedCtxExposedKeys,
  UndefinedData,
  UndefinedInputSchema,
  UndefinedLoaderOutput,
  UndefinedMapperOutput,
  UndefinedQueryResultType,
  UndefinedReadyPointType,
  UndefinedRoute,
  UndefinedRouteDefinition,
  UseInfiniteQueryOptions,
  UsePointQueryResult,
  UseQueryOptions,
  WithError,
} from './types.js'
import type { FsLocation } from './utils.js'
import {
  blankDataTransformerExtended,
  generateId,
  getByPath,
  getCallerLocation,
  getWindowScrollPositionGetterByElementGetter,
  getWindowScrollPositionGetterBySelector,
  getWindowScrollPositionSetterByElementGetter,
  getWindowScrollPositionSetterBySelector,
  isContainsBinary,
  mergeHeaders,
  setByPath,
  toExtendedTransformer,
  toKebabCase,
  windowScrollPositionGetter,
  windowScrollPositionSetter,
} from './utils.js'
import { forceFreshDehydratedState } from './query-client.js'

// import stringify from 'safe-stable-stringify'

// known stage fns

// requireCtx: server, nothing to prune
// serverurl: client, nothing to prune
// basepath: both, nothing to prune
// ssr: both, nothing to prune
// mutationOptions: client, prune on server
// queryOptions: client, prune on server
// infiniteQueryOptions: client, prune on server
// pageQueryOptions: client, prune on server
// componentQueryOptions: client, prune on server
// providerQueryOptions: client, prune on server
// layoutQueryOptions: client, prune on server
// fetchOptions: client, prune on server

// error: both, prune on nossr-server
// layoutError: both, prune on nossr-server
// pageError: both, prune on nossr-server
// componentError: both, prune on nossr-server
// layoutLoading: both, prune on nossr-server
// pageLoading: both, prune on nossr-server
// componentLoading: both, prune on nossr-server
// loading: both, prune on nossr-server
// wrapper: both, prune on nossr-server
// with: both, prune on nossr-server !!!

// scrollPosition: client, prune on server
// scrollRestore: client, prune on server
// prefetchPolicy: both, nothing to prune (but in fact right now not used in server code)
// onPrefetch: client, prune on server
// prefetchPageOnLinkHover: client, prune on server

// transformer: both, nothing to prune

// ctx: server, prune on client
// loader: server, prune on client

// clientLoader: client, prune on server

// mapper: both, nothing to prune !!! prune on nossr-server

// head: both, nothing to prune
// props: both, nothing to prune
// input: server, prune on client
// clientInput: client, prune on server
// sharedInput: both, nothing to prune

// root: both, nothing to prune
// base: both, nothing to prune
// page: both, prune on nossr-server (replace last argument wirh () => null)

// component: both, prune on nossr-server
// layout: both, prune on nossr-server
// provider: both, nothing to prune
// query: client, prune on server
// infiniteQuery: client, prune on server
// mutation: client, prune on server

export class Point0<
  in out TPointType extends PointType,
  out TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType,
  out TRequiredCtx extends RequiredCtx,
  in out TError extends ErrorPoint0,
  in out TCtx extends Ctx,
  in out TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  in out TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  in out TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  in out TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  in out TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  in out TServerInputSchema extends InputSchema | UndefinedInputSchema,
  in out TClientInputSchema extends InputSchema | UndefinedInputSchema,
  in out TParamsSchema extends InputSchema | UndefinedInputSchema,
  in out TSearchSchema extends InputSchema | UndefinedInputSchema,
  in out TBodySchema extends InputSchema | UndefinedInputSchema,
  out THeadersSchema extends InputSchema | UndefinedInputSchema,
  out TCookiesSchema extends InputSchema | UndefinedInputSchema,
  out TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  in out TOuterProps extends Props,
  in out TInnerProps extends Props,
  in out TQueriesDefinitions extends QueriesDefinitions,
> {
  Infer: Infer<
    TPointType,
    TLetsReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > = null as never

  point: typeof this // this, needed for generator to collect points

  private readonly __POINT0_INSTANCE__: boolean = true

  toString() {
    return `${this.scope}.${this.type}.${this.name}`
  }
  toStringWithLocation() {
    return this._fsLocation
      ? `${this.toString()}(${this._fsLocation.path}:${this._fsLocation.line}:${this._fsLocation.column})`
      : this.toString()
  }
  toJSON() {
    return this.toString()
  }
  [Symbol.toPrimitive](hint: 'string' | 'number' | 'default') {
    if (hint === 'string') {
      return this.toString()
    }
    return null
  }

  private static _prevUnstableId = 0
  private static _getNextUnstableId(): number {
    return Point0._prevUnstableId++
  }

  private readonly _base: BasePoint | LayoutPoint | undefined
  readonly _root: RootPoint | undefined
  readonly _fsLocation: FsLocation | undefined
  readonly _logger: LogFn | undefined
  readonly _getLogFn = (): LogFn | undefined => {
    if (this._logger) return this._logger
    let _root = this._root
    while (_root) {
      if (_root._logger) return _root._logger
      _root = _root._root
    }
    return undefined
  }
  readonly _Error: ClassLikeError0<TError>
  readonly _middlewares: MiddlewareFn<TError, any>[]
  _serverurl: string | undefined
  readonly _hasServerLoader: boolean | undefined
  readonly _schemasHelpers: SchemaHelper[] | undefined
  readonly _searchSchemaKeys: string[] | true | undefined
  readonly _basepath: AnyRoute | undefined
  readonly _endpoint: EndpointDefinition | undefined
  get method(): TPointType extends RequestableReadyPointType ? WideRequestMethod : undefined {
    return (this._endpoint?.method ?? undefined) as TPointType extends RequestableReadyPointType
      ? WideRequestMethod
      : undefined
  }
  readonly _endpointPrefix: string | undefined
  readonly type: TPointType
  private readonly _letsReadyPointType: TLetsReadyPointType
  readonly _transformer: DataTransformerExtended | undefined
  _getTransformer = () => this._transformer ?? blankDataTransformerExtended
  private readonly _eventerSubscriptions: EventerSubscription<any, TError>[]
  readonly _ssr: boolean | undefined
  readonly _getSsr = () => (typeof this._ssr === 'boolean' ? this._ssr : _point0_env.vars.POINT0_SSR === 'true')
  readonly scope: PointsScope
  readonly scopes: PointsScope[]
  private readonly _defaultMutationOptions: UseMutationOptions | undefined
  private readonly _mutationOptions: UseMutationOptions | undefined
  private readonly _defaultQueryOptions: ExtraUseQueryOptions | undefined
  private readonly _defaultInfiniteQueryOptions: PartialUseInfiniteQueryOptions | undefined
  private readonly _defaultPageQueryOptions: ExtraUseQueryOptions | undefined
  private readonly _defaultLayoutQueryOptions: ExtraUseQueryOptions | undefined
  private readonly _defaultComponentQueryOptions: ExtraUseQueryOptions | undefined
  private readonly _defaultProviderQueryOptions: ExtraUseQueryOptions | undefined
  private readonly _queryOptions: ExtraUseQueryOptions
  readonly _infiniteQueryOptions: ExtraUseInfiniteQueryOptions<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
    QueryKey,
    unknown
  >
  readonly _queryResultType: TQueryResultType
  readonly _serverExecuteActions: ServerExecuteAction[]
  private readonly _clientExecuteActions: ClientExecuteAction[]
  private readonly _mountActions: MountAction[]
  private readonly _useValue: undefined | ((point: AnyPoint, keys?: string | string[] | undefined) => any)
  readonly route: TRouteDefinition extends RouteDefinition
    ? CallableRoute<TRouteDefinition, TSearchSchema extends InputSchema ? InputRaw<TSearchSchema> : UnknownSearchInput>
    : UndefinedRoute
  private readonly _page: PageSuccessComponentType<any, any, any, any, any, any, any> | UndefinedSuccessPageComponent
  private readonly _component:
    | ComponentSuccessComponentType<any, any, any, any, any, any>
    | UndefinedComponentSuccessComponent
  private readonly _layout:
    | LayoutSuccessComponentType<any, any, any, any, any, any, any>
    | UndefinedLayoutSuccessComponent
  readonly _layouts: LayoutPoint[]
  readonly name: PointName
  private readonly _unstableId: number
  private readonly _fetchOptions: FetchOptionsFn | undefined
  private readonly _scrollPositionGetter: ScrollPositionGetter | undefined
  private readonly _getScrollPositionGetter = () => this._scrollPositionGetter ?? windowScrollPositionGetter
  private readonly _scrollPositionSetter: ScrollPositionSetter | undefined
  private readonly _getScrollPositionSetter = () => this._scrollPositionSetter ?? windowScrollPositionSetter
  private readonly _scrollPositionRestorePolicy: ScrollPositionRestorePolicy | undefined
  private readonly _getScrollPositionRestorePolicy = () => this._scrollPositionRestorePolicy ?? (() => null)
  private readonly _polhPolicy: PrefetchPagePolicy | undefined
  private readonly _polhDuration: number | undefined
  private readonly _ponPolicy: PrefetchPagePolicy | undefined
  private readonly _normalizePrefetchPagePolicy = (
    policy: PrefetchPagePolicy | undefined,
  ): NormalizedPrefetchPagePolicy => {
    return !policy
      ? 'none'
      : policy === true
        ? this._getSsr()
          ? 'ssrDehydratedStateAndClientQuery'
          : 'serverAndClientQuery'
        : policy
  }
  readonly _getPrefetchPagePolicy = (
    trigger: 'navigate' | 'linkHover' | undefined,
    providedPolicy: PrefetchPagePolicy | undefined,
  ): NormalizedPrefetchPagePolicy => {
    if (typeof providedPolicy !== 'undefined') {
      return this._normalizePrefetchPagePolicy(providedPolicy)
    }
    return this._normalizePrefetchPagePolicy(
      trigger === 'linkHover' ? this._polhPolicy : trigger === 'navigate' ? this._ponPolicy : undefined,
    )
  }
  private readonly _onPrefetchMountableFns: OnPrefetchMountableFn[]
  get polh(): boolean | number {
    return !this._polhPolicy ? false : (this._polhDuration ?? true)
  }
  private readonly _ProviderReactContext: Context<MountableSuccessData<TQueriesDefinitions, TMapperOutput>> | undefined
  private readonly _errorComponent: ErrorComponentType<DestinationComponentVariant, TError> | undefined
  private readonly DefaultErrorComponent: ErrorComponentType<any, TError> = ({ error }) => {
    const { stack, ...json } = this._Error.serialize(error)
    const isHydrated = useIsHydrated()
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('pre', null, !isHydrated ? null : JSON.stringify(json, null, 2)),
      React.createElement('pre', null, !isHydrated ? null : (stack as string | undefined) || error.stack || ''),
    )
  }
  private readonly _layoutErrorComponent: ErrorComponentType<any, TError> | undefined
  private readonly _pageErrorComponent: ErrorComponentType<any, TError> | undefined
  private readonly _componentErrorComponent: ErrorComponentType<any, TError> | undefined
  private readonly _layoutLoadingComponent: LoadingComponentType<any> | undefined
  private readonly DefaultLoadingComponent: LoadingComponentType<any> = () =>
    React.createElement(React.Fragment, null, 'Loading...')
  private readonly _loadingComponent: LoadingComponentType<any> | undefined
  private readonly _pageLoadingComponent: LoadingComponentType<any> | undefined
  private readonly _componentLoadingComponent: LoadingComponentType<any> | undefined
  private readonly _getComponentLoadingComponent = () => this._componentLoadingComponent ?? this.DefaultLoadingComponent
  X: TPointType extends 'layout'
    ? LayoutSelfType<
        TRouteDefinition,
        TPointType,
        TServerInputSchema,
        TClientInputSchema,
        TParamsSchema,
        TSearchSchema,
        TBodySchema,
        TOuterProps,
        TInnerProps,
        TQueriesDefinitions,
        TMapperOutput
      >
    : TPointType extends 'page'
      ? PageSelfType<
          TRouteDefinition,
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema,
          TOuterProps,
          TInnerProps,
          TQueriesDefinitions,
          TMapperOutput
        >
      : TPointType extends 'component'
        ? ComponentSelfType<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema,
            TOuterProps,
            TInnerProps,
            TQueriesDefinitions,
            TMapperOutput
          >
        : TPointType extends 'provider'
          ? ProviderSelfType<
              TPointType,
              TServerInputSchema,
              TClientInputSchema,
              TParamsSchema,
              TSearchSchema,
              TBodySchema,
              TOuterProps,
              TInnerProps,
              TQueriesDefinitions,
              TMapperOutput
            >
          : null

  private constructor(options: {
    type: TPointType
    _letsReadyPointType: TLetsReadyPointType
    _base?: BasePoint | LayoutPoint | undefined
    _root?: RootPoint | undefined
    _fsLocation?: FsLocation | undefined
    _logger?: LogFn | undefined
    _Error?: ClassLikeError0<TError>
    _middlewares?: MiddlewareFn<TError, any>[] | undefined
    _serverurl?: string | undefined
    _hasServerLoader?: boolean | undefined
    _schemasHelpers?: SchemaHelper[] | undefined
    _searchSchemaKeys?: string[] | true | undefined
    _basepath?: AnyRoute | undefined
    _endpoint?: EndpointDefinition | undefined
    _endpointPrefix?: string | undefined
    _transformer?: DataTransformerExtended | undefined
    _ssr?: boolean | undefined
    _eventerSubscriptions?: EventerSubscription<any, TError>[]
    scope: PointsScope
    scopes: PointsScope[]
    _defaultMutationOptions?: UseMutationOptions
    _mutationOptions?: UseMutationOptions
    _defaultInfiniteQueryOptions?: PartialUseInfiniteQueryOptions
    _defaultQueryOptions?: ExtraUseQueryOptions
    _defaultPageQueryOptions?: ExtraUseQueryOptions
    _defaultLayoutQueryOptions?: ExtraUseQueryOptions
    _defaultComponentQueryOptions?: ExtraUseQueryOptions
    _defaultProviderQueryOptions?: ExtraUseQueryOptions
    _queryOptions?: ExtraUseQueryOptions
    _infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          FinalInputRaw<
            ReadyPointTypeOrNever<TPointType>,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    _queryResultType?: TQueryResultType
    // _asFormData?: boolean | undefined
    _serverExecuteActions?: ServerExecuteAction[]
    _clientExecuteActions?: ClientExecuteAction[]
    _mountActions?: MountAction[]
    _ProviderReactContext?: Context<MountableSuccessData<TQueriesDefinitions, TMapperOutput>> | undefined
    _useValue?: any
    route?: TRouteDefinition extends RouteDefinition
      ? CallableRoute<IfAnyThenElse<TRouteDefinition, string, TRouteDefinition>>
      : UndefinedRoute
    _page?: PageSuccessComponentType<any, any, any, any, any, any, any> | UndefinedSuccessPageComponent
    _component?: ComponentSuccessComponentType<any, any, any, any, any, any> | UndefinedComponentSuccessComponent
    _layout?: LayoutSuccessComponentType<any, any, any, any, any, any, any> | UndefinedLayoutSuccessComponent
    _layouts?: LayoutPoint[]
    name: PointName
    _fetchOptions?: FetchOptionsFn
    _scrollPositionGetter?: ScrollPositionGetter | undefined
    _scrollPositionSetter?: ScrollPositionSetter | undefined
    _scrollPositionRestorePolicy?: ScrollPositionRestorePolicy | undefined
    _polhPolicy?: PrefetchPagePolicy | undefined
    _polhDuration?: number | undefined
    _ponPolicy?: PrefetchPagePolicy | undefined
    _onPrefetchMountableFns?: OnPrefetchMountableFn[]
    _errorComponent?: ErrorComponentType<any, TError>
    _layoutErrorComponent?: ErrorComponentType<any, TError>
    _pageErrorComponent?: ErrorComponentType<any, TError>
    _componentErrorComponent?: ErrorComponentType<any, TError>
    _loadingComponent?: LoadingComponentType<any>
    _layoutLoadingComponent?: LoadingComponentType<any>
    _pageLoadingComponent?: LoadingComponentType<any>
    _componentLoadingComponent?: LoadingComponentType<any>
    X?: MountableSelfType<any, any, any, any, any, any, any, any, any, any, any, any, any> | null
    _unstableId?: number
  }) {
    this.point = this
    this.scope = options.scope
    this.scopes = options.scopes
    this._base = options._base ?? undefined
    this._root = options._root ?? undefined
    this._fsLocation = options._fsLocation ?? undefined
    this._logger = options._logger ?? undefined
    this._Error = options._Error ?? (ErrorPoint0 as unknown as ClassLikeError0<TError>)
    this._middlewares = options._middlewares ?? []
    this._transformer = options._transformer ?? undefined
    this._ssr = options._ssr ?? undefined
    this._eventerSubscriptions = options._eventerSubscriptions ?? []
    this._serverurl = options._serverurl ?? undefined
    this._hasServerLoader = options._hasServerLoader ?? undefined
    this._schemasHelpers = options._schemasHelpers ?? undefined
    this._searchSchemaKeys = options._searchSchemaKeys
    this._basepath = options._basepath ?? undefined
    this._endpoint = options._endpoint ?? undefined
    this._endpointPrefix = options._endpointPrefix ?? undefined
    this.type = options.type
    this._letsReadyPointType = options._letsReadyPointType
    this._defaultMutationOptions = options._defaultMutationOptions ?? {}
    this._mutationOptions = options._mutationOptions ?? {}
    this._defaultQueryOptions = options._defaultQueryOptions ?? {}
    this._defaultInfiniteQueryOptions = options._defaultInfiniteQueryOptions ?? {}
    this._defaultLayoutQueryOptions = options._defaultLayoutQueryOptions ?? {}
    this._defaultComponentQueryOptions = options._defaultComponentQueryOptions ?? {}
    this._defaultProviderQueryOptions = options._defaultProviderQueryOptions ?? {}
    this._defaultPageQueryOptions = options._defaultPageQueryOptions ?? {}
    this._queryOptions = options._queryOptions ?? {}
    this._infiniteQueryOptions = options._infiniteQueryOptions ?? ({} as never)
    this._queryResultType = (options._queryResultType ?? undefined) as TQueryResultType
    // this._asFormData = options._asFormData
    this._serverExecuteActions = options._serverExecuteActions ?? []
    this._clientExecuteActions = options._clientExecuteActions ?? []
    this._mountActions = options._mountActions ?? []
    this._ProviderReactContext = options._ProviderReactContext ?? undefined
    this._useValue = options._useValue ? options._useValue.bind(this) : undefined
    this.route = (options.route ?? undefined) as TRouteDefinition extends RouteDefinition
      ? CallableRoute<
          TRouteDefinition,
          TSearchSchema extends InputSchema ? InputRaw<TSearchSchema> : UnknownSearchInput
        >
      : UndefinedRoute
    this._page = options._page ?? undefined
    this._component = options._component ?? undefined
    this._layout = options._layout ?? undefined
    this._layouts = options._layouts ?? []
    this.name = options.name
    this._fetchOptions = options._fetchOptions ?? (() => ({}))
    this._scrollPositionGetter = options._scrollPositionGetter ?? undefined
    this._scrollPositionSetter = options._scrollPositionSetter ?? undefined
    this._scrollPositionRestorePolicy = options._scrollPositionRestorePolicy ?? undefined
    this._polhPolicy = options._polhPolicy ?? undefined
    this._polhDuration = options._polhDuration ?? undefined
    this._ponPolicy = options._ponPolicy ?? undefined
    this._onPrefetchMountableFns = options._onPrefetchMountableFns ?? []
    this._layoutErrorComponent = options._layoutErrorComponent ?? undefined
    this._pageErrorComponent = options._pageErrorComponent ?? undefined
    this._componentErrorComponent = options._componentErrorComponent ?? undefined
    this._loadingComponent = options._loadingComponent
    this._layoutLoadingComponent = options._layoutLoadingComponent ?? undefined
    this._pageLoadingComponent = options._pageLoadingComponent ?? undefined
    this._componentLoadingComponent = options._componentLoadingComponent ?? undefined
    this.X = (options.X ?? null) as never
    this._unstableId = options._unstableId ?? Point0._getNextUnstableId()
  }

  private _continue<
    TPointType extends PointType,
    TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType,
    TRequiredCtx extends RequiredCtx,
    TCtx extends Ctx,
    TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
    TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
    TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
    TMapperOutput extends MapperOutput | UndefinedMapperOutput,
    TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
    TServerInputSchema extends InputSchema | UndefinedInputSchema,
    TClientInputSchema extends InputSchema | UndefinedInputSchema,
    TParamsSchema extends InputSchema | UndefinedInputSchema,
    TSearchSchema extends InputSchema | UndefinedInputSchema,
    TBodySchema extends InputSchema | UndefinedInputSchema,
    THeadersSchema extends InputSchema | UndefinedInputSchema,
    TCookiesSchema extends InputSchema | UndefinedInputSchema,
    TQueryResultType extends QueryResultType | UndefinedQueryResultType,
    TOuterProps extends Props,
    TInnerProps extends Props,
    TQueriesDefinitions extends QueriesDefinitions,
  >(overrides: {
    type?: PointType
    scope?: PointsScope
    scopes?: PointsScope[]
    _letsReadyPointType?: TLetsReadyPointType
    _base?: BasePoint | LayoutPoint | undefined
    _root?: RootPoint | undefined
    _fsLocation?: FsLocation | undefined
    _logger?: LogFn | undefined
    _Error?: ClassLikeError0<TError> | undefined
    _middlewares?: MiddlewareFn<TError, any>[]
    _serverurl?: string | undefined
    _hasServerLoader?: boolean | undefined
    _schemasHelpers?: SchemaHelper[] | undefined
    _searchSchemaKeys?: string[] | true | undefined
    _basepath?: AnyRoute | undefined
    _endpoint?: EndpointDefinition | undefined
    _endpointPrefix?: string | undefined
    _transformer?: DataTransformerExtended | null
    _ssr?: boolean | undefined
    _eventerSubscriptions?: EventerSubscription<any, TError>[]
    _defaultMutationOptions?: UseMutationOptions | undefined
    _mutationOptions?: UseMutationOptions | undefined
    _defaultInfiniteQueryOptions?: PartialUseInfiniteQueryOptions | undefined
    _defaultQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultPageQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultComponentQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultLayoutQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultProviderQueryOptions?: ExtraUseQueryOptions | undefined
    _queryOptions?: ExtraUseQueryOptions | undefined
    _infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          FinalInputRaw<
            ReadyPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    _queryResultType?: TQueryResultType
    // _asFormData?: boolean | undefined
    _serverExecuteActions?: ServerExecuteAction[]
    _clientExecuteActions?: ClientExecuteAction[]
    _mountActions?: MountAction[]
    _ProviderReactContext?: Context<MountableSuccessData<TQueriesDefinitions, TMapperOutput>> | undefined
    _useValue?: any
    route?: IfAnyThenElse<
      TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute,
      AnyRoute
    >
    _page?: PageSuccessComponentType<any, any, any, any, any, any, any> | UndefinedSuccessPageComponent
    _component?: ComponentSuccessComponentType<any, any, any, any, any, any> | UndefinedComponentSuccessComponent
    _layout?: LayoutSuccessComponentType<any, any, any, any, any, any, any> | UndefinedLayoutSuccessComponent
    _layouts?: LayoutPoint[]
    name?: PointName
    _fetchOptions?: FetchOptionsFn
    _scrollPositionGetter?: ScrollPositionGetter | undefined
    _scrollPositionSetter?: ScrollPositionSetter | undefined
    _scrollPositionRestorePolicy?: ScrollPositionRestorePolicy | undefined
    _polhPolicy?: PrefetchPagePolicy | undefined
    _polhDuration?: number | undefined
    _ponPolicy?: PrefetchPagePolicy | undefined
    _onPrefetchMountableFns?: OnPrefetchMountableFn[]
    _errorComponent?: ErrorComponentType<any, TError> | undefined
    _layoutErrorComponent?: ErrorComponentType<any, TError> | undefined
    _pageErrorComponent?: ErrorComponentType<any, TError> | undefined
    _componentErrorComponent?: ErrorComponentType<any, TError> | undefined
    _loadingComponent?: LoadingComponentType<any> | undefined
    _layoutLoadingComponent?: LoadingComponentType<any> | undefined
    _pageLoadingComponent?: LoadingComponentType<any> | undefined
    _componentLoadingComponent?: LoadingComponentType<any> | undefined
    X?: MountableSelfType<any, any, any, any, any, any, any, any, any, any, any, any, any> | null
  }): Point0<
    TPointType,
    TLetsReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    const set = (...args: [key: keyof typeof overrides, value?: any]) => {
      const [key, value] = args
      if (key in overrides) {
        return overrides[key as keyof typeof overrides]
      }
      if (args.length > 1) {
        return value
      }
      return this[key as keyof this]
    }
    return new Point0<
      TPointType,
      TLetsReadyPointType,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >({
      scope: set('scope'),
      scopes: set('scopes'),
      _base: set('_base'),
      _root: set('_root'),
      _fsLocation: set('_fsLocation'),
      _logger: set('_logger'),
      _Error: set('_Error'),
      type: set('type') as TPointType,
      _letsReadyPointType: set('_letsReadyPointType') as TLetsReadyPointType,
      _middlewares: set('_middlewares', [...this._middlewares]),
      _serverurl: set('_serverurl'),
      _hasServerLoader: set('_hasServerLoader'),
      _schemasHelpers: set('_schemasHelpers'),
      _searchSchemaKeys: set('_searchSchemaKeys'),
      _basepath: set('_basepath'),
      _endpoint: set('_endpoint'),
      _endpointPrefix: set('_endpointPrefix'),
      _transformer: set('_transformer'),
      _ssr: set('_ssr'),
      _eventerSubscriptions: set('_eventerSubscriptions'),
      _defaultMutationOptions: set('_defaultMutationOptions', { ...this._defaultMutationOptions }),
      _mutationOptions: set('_mutationOptions', { ...this._mutationOptions }),
      _defaultQueryOptions: set('_defaultQueryOptions', { ...this._defaultQueryOptions }),
      _defaultInfiniteQueryOptions: set('_defaultInfiniteQueryOptions', { ...this._defaultInfiniteQueryOptions }),
      _defaultPageQueryOptions: set('_defaultPageQueryOptions', { ...this._defaultPageQueryOptions }),
      _defaultLayoutQueryOptions: set('_defaultLayoutQueryOptions', { ...this._defaultLayoutQueryOptions }),
      _defaultComponentQueryOptions: set('_defaultComponentQueryOptions', {
        ...this._defaultComponentQueryOptions,
      }),
      _defaultProviderQueryOptions: set('_defaultProviderQueryOptions', {
        ...this._defaultProviderQueryOptions,
      }),
      _queryOptions: set('_queryOptions', { ...this._queryOptions }),
      _infiniteQueryOptions: set('_infiniteQueryOptions', {
        ...this._infiniteQueryOptions,
      }),
      _queryResultType: set('_queryResultType'),
      // _asFormData: overrides._asFormData ?? this._asFormData,
      _serverExecuteActions: set('_serverExecuteActions'),
      _clientExecuteActions: set('_clientExecuteActions'),
      _mountActions: set('_mountActions'),
      _ProviderReactContext: set('_ProviderReactContext') as never,
      _useValue: set('_useValue'),
      route: set('route'),
      _page: set('_page') as never,
      _component: set('_component') as never,
      _layout: set('_layout') as never,
      _layouts: set('_layouts'),
      name: set('name'),
      _fetchOptions: set('_fetchOptions'),
      _scrollPositionGetter: set('_scrollPositionGetter'),
      _scrollPositionSetter: set('_scrollPositionSetter'),
      _scrollPositionRestorePolicy: set('_scrollPositionRestorePolicy'),
      _polhPolicy: set('_polhPolicy'),
      _polhDuration: set('_polhDuration'),
      _ponPolicy: set('_ponPolicy'),
      _onPrefetchMountableFns: set('_onPrefetchMountableFns'),
      _errorComponent: set('_errorComponent') as never,
      _layoutErrorComponent: set('_layoutErrorComponent') as never,
      _pageErrorComponent: set('_pageErrorComponent') as never,
      _componentErrorComponent: set('_componentErrorComponent') as never,
      _loadingComponent: set('_loadingComponent') as never,
      _layoutLoadingComponent: set('_layoutLoadingComponent') as never,
      _pageLoadingComponent: set('_pageLoadingComponent') as never,
      _componentLoadingComponent: set('_componentLoadingComponent') as never,
      X: set('X') as never,
    })
  }

  static lets<TRequiredCtx extends RequiredCtx = UndefinedCtx>(
    pointType: 'root',
    pointName: string,
  ): NiceRootStagePoint<
    'coreStage',
    'root',
    TRequiredCtx,
    ErrorPoint0,
    EmptyCtx,
    UndefinedCtxExposedKeys,
    UndefinedLoaderOutput,
    UndefinedLoaderOutput,
    UndefinedMapperOutput,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedQueryResultType,
    EmptyProps,
    EmptyProps,
    []
  >
  static lets(
    pointType: 'plugin',
    pointName: string,
  ): NicePluginStagePoint<
    'coreStage',
    'plugin',
    UndefinedCtx,
    ErrorPoint0,
    EmptyCtx,
    UndefinedCtxExposedKeys,
    UndefinedLoaderOutput,
    UndefinedLoaderOutput,
    UndefinedMapperOutput,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedInputSchema,
    UndefinedQueryResultType,
    EmptyProps,
    EmptyProps,
    []
  >
  static lets(pointType: 'root' | 'plugin', pointName: string) {
    const _fsLocation = _point0_env.mode.is.production || _point0_env.build.was ? undefined : getCallerLocation(3)
    if (pointType === 'root') {
      if (pointName === 'plugin') {
        throw new Error('Cannot create root point with "plugin" scope, it is internally used name for plugin points')
      }
      return new Point0({
        type: 'coreStage',
        scope: pointName,
        scopes: [pointName],
        _letsReadyPointType: 'root',
        name: pointName,
        _fsLocation,
      }) as never
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (pointType === 'plugin') {
      return new Point0({
        type: 'coreStage',
        scope: 'plugin',
        scopes: ['plugin'],
        _letsReadyPointType: 'plugin',
        name: pointName,
        _fsLocation,
      }) as never
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Invalid point type: ${pointType}`)
    }
  }

  lets<
    TMethod extends WideRequestMethod,
    TProvidedRoute extends RouteDefinition,
    TCheckError = AssertInputSchemaHasSameKeys<
      RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>,
      TParamsSchema,
      'params'
    > &
      AssertActionSchemaOnly<TServerInputSchema, TClientInputSchema, 'action'>,
  >(
    ...args: TPointType extends 'root' | 'base'
      ? [letsReadyPointType: 'action', pointName: string, method: TMethod, route: TProvidedRoute]
      : never[]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'coreStage',
      'action',
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>,
      TServerInputSchema,
      TClientInputSchema,
      HasParams<TProvidedRoute> extends true
        ? MergeRecordValidationSchemas<
            TParamsSchema,
            RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
          >
        : TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'root' | 'base' ? TInnerProps : EmptyProps,
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
    >
  >
  lets<
    TMethod extends WideRequestMethod,
    TProvidedRoute extends AnyRoute,
    TCheckError = AssertInputSchemaHasSameKeys<
      RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute['definition']>>,
      TParamsSchema,
      'params'
    > &
      AssertActionSchemaOnly<TServerInputSchema, TClientInputSchema, 'action'>,
  >(
    ...args: TPointType extends 'root' | 'base'
      ? [letsReadyPointType: 'action', pointName: string, method: TMethod, route: TProvidedRoute]
      : never[]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'coreStage',
      'action',
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      ExtendRouteDefinition<TRouteDefinition, TProvidedRoute['definition']>,
      TServerInputSchema,
      TClientInputSchema,
      HasParams<TProvidedRoute['definition']> extends true
        ? MergeRecordValidationSchemas<
            TParamsSchema,
            RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute['definition']>>
          >
        : TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'root' | 'base' ? TInnerProps : EmptyProps,
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
    >
  >
  lets<
    TMethod extends PopularRequestMethod,
    TProvidedRoute extends RouteDefinition,
    TCheckError = AssertInputSchemaHasSameKeys<
      RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>,
      TParamsSchema,
      'params'
    > &
      AssertActionSchemaOnly<TServerInputSchema, TClientInputSchema, 'action'>,
  >(
    ...args: TPointType extends 'root' | 'base' ? [method: TMethod, route: TProvidedRoute] : never[]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'coreStage',
      'action',
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>,
      TServerInputSchema,
      TClientInputSchema,
      HasParams<TProvidedRoute> extends true
        ? MergeRecordValidationSchemas<
            TParamsSchema,
            RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
          >
        : TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'root' | 'base' ? TInnerProps : EmptyProps,
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
    >
  >
  lets<
    TMethod extends PopularRequestMethod,
    TProvidedRoute extends AnyRoute,
    TCheckError = AssertInputSchemaHasSameKeys<
      RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute['definition']>>,
      TParamsSchema,
      'params'
    > &
      AssertActionSchemaOnly<TServerInputSchema, TClientInputSchema, 'action'>,
  >(
    ...args: TPointType extends 'root' | 'base' ? [method: TMethod, route: TProvidedRoute] : never[]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'coreStage',
      'action',
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      ExtendRouteDefinition<TRouteDefinition, TProvidedRoute['definition']>,
      TServerInputSchema,
      TClientInputSchema,
      HasParams<TProvidedRoute['definition']> extends true
        ? MergeRecordValidationSchemas<
            TParamsSchema,
            RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute['definition']>>
          >
        : TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'root' | 'base' ? TInnerProps : EmptyProps,
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
    >
  >
  lets<
    TPointName extends PointName,
    TProvidedRoute extends RouteDefinition,
    TCheckError = AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'page'>,
  >(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsReadyPointType: 'page', pointName: TPointName, route: TProvidedRoute]
      : never[]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'coreStage',
      'page',
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>,
      TServerInputSchema,
      TClientInputSchema,
      HasParams<TProvidedRoute> extends true
        ? MergeRecordValidationSchemas<
            TParamsSchema,
            RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
          >
        : TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'root' | 'base' ? TInnerProps : EmptyProps,
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
    >
  >
  lets<
    TPointName extends PointName,
    TProvidedRoute extends AnyRoute,
    TCheckError = AssertInputSchemaIncludesKeys<RouteSchema<TProvidedRoute['definition']>, TParamsSchema, 'params'> &
      AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'page'>,
  >(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsReadyPointType: 'page', pointName: TPointName, route: TProvidedRoute]
      : never[]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'coreStage',
      'page',
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      ExtendRouteDefinition<'/', TProvidedRoute['definition']>,
      TServerInputSchema,
      TClientInputSchema,
      HasParams<TProvidedRoute['definition']> extends true
        ? MergeRecordValidationSchemas<TParamsSchema, RouteSchema<TProvidedRoute['definition']>>
        : TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'root' | 'base' ? TInnerProps : EmptyProps,
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
    >
  >
  lets<
    TPointName extends PointName,
    TProvidedRoute extends RouteDefinition = '/',
    TCheckError = AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'layout'>,
  >(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsReadyPointType: 'layout', pointName: TPointName, route?: TProvidedRoute]
      : never[]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'coreStage',
      'layout',
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>,
      TServerInputSchema,
      TClientInputSchema,
      HasParams<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>> extends true
        ? MergeRecordValidationSchemas<
            TParamsSchema,
            RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
          >
        : TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'root' | 'base' ? TInnerProps : EmptyProps,
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
    >
  >
  lets<
    TPointName extends PointName,
    TProvidedRoute extends AnyRoute,
    TCheckError = AssertInputSchemaIncludesKeys<RouteSchema<TProvidedRoute['definition']>, TParamsSchema, 'params'> &
      AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'layout'>,
  >(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsReadyPointType: 'layout', pointName: TPointName, route: TProvidedRoute]
      : never[]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'coreStage',
      'layout',
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      ExtendRouteDefinition<'/', TProvidedRoute['definition']>,
      TServerInputSchema,
      TClientInputSchema,
      HasParams<TProvidedRoute['definition']> extends true
        ? MergeRecordValidationSchemas<TParamsSchema, RouteSchema<TProvidedRoute['definition']>>
        : TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'root' | 'base' ? TInnerProps : EmptyProps,
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
    >
  >
  lets<
    TNewOuterProps extends Props = EmptyProps,
    TCheckError = AssertUsualInputSchemaOnly<TParamsSchema, TSearchSchema, TBodySchema, 'component'>,
  >(
    ...args: TPointType extends 'root' | 'base' ? [letsReadyPointType: 'component', pointName: string] : never[]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'coreStage',
      'component',
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      UndefinedQueryResultType,
      TNewOuterProps,
      TPointType extends 'root' | 'base' ? AppendProps<TInnerProps, TNewOuterProps> : TNewOuterProps,
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
    >
  >
  lets<
    TNewOuterProps extends Props = EmptyProps,
    TCheckError = AssertUsualInputSchemaOnly<TParamsSchema, TSearchSchema, TBodySchema, 'provider'>,
  >(
    ...args: TPointType extends 'root' | 'base' ? [letsReadyPointType: 'provider', pointName: string] : never[]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'coreStage',
      'provider',
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      UndefinedQueryResultType,
      TNewOuterProps,
      TPointType extends 'root' | 'base' ? AppendProps<TInnerProps, TNewOuterProps> : TNewOuterProps,
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
    >
  >
  lets<
    TNewLetsReadyPointType extends 'query' | 'infiniteQuery' | 'mutation',
    TCheckError = AssertUsualInputSchemaOnly<
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      'query' | 'infiniteQuery' | 'mutation'
    >,
  >(
    ...args: TPointType extends 'root' | 'base'
      ? [letsReadyPointType: TNewLetsReadyPointType, pointName: string]
      : never[]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'coreStage',
      TNewLetsReadyPointType,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'root' | 'base' ? TInnerProps : EmptyProps,
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
    >
  >
  lets<
    TNewLetsReadyPointType extends Exclude<
      ReadyPointType,
      'page' | 'layout' | 'component' | 'provider' | 'action' | 'query' | 'infiniteQuery' | 'mutation'
    >,
    TPointName extends PointName,
  >(
    ...args: TPointType extends 'root' | 'base'
      ? [letsReadyPointType: TNewLetsReadyPointType, pointName: TPointName]
      : never[]
  ): NiceStagePoint<
    'coreStage',
    TNewLetsReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    UndefinedLoaderOutput,
    UndefinedLoaderOutput,
    UndefinedMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    UndefinedQueryResultType,
    EmptyProps,
    TPointType extends 'root' | 'base' ? TInnerProps : EmptyProps,
    TPointType extends 'root' | 'base' ? TQueriesDefinitions : []
  >
  lets(...args: any[]) {
    const _fsLocation = _point0_env.mode.is.production || _point0_env.build.was ? undefined : getCallerLocation(3)
    const [letsReadyPointType, pointName, providedMethod, route] = (() => {
      if (args[0] === 'action') {
        return [args[0], args[1], args[2], args[3]] as [
          ReadyPointType,
          PointName,
          string | undefined,
          AnyRoute | string | undefined,
        ]
      }
      if (
        typeof args[0] === 'string' &&
        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].includes(args[0].toUpperCase())
      ) {
        return ['action', undefined, args[0], args[1]] as [
          ReadyPointType,
          undefined,
          PopularRequestMethod,
          AnyRoute | string | undefined,
        ]
      }
      return [args[0], args[1], undefined, args[2]] as [
        ReadyPointType,
        PointName,
        undefined,
        AnyRoute | string | undefined,
      ]
    })()
    const isLayout = letsReadyPointType === 'layout'
    const isAction = letsReadyPointType === 'action'
    const isPage = letsReadyPointType === 'page'

    const prevRoute = this.route
    const newRoute = (() => {
      if (isPage) {
        if (!route) {
          return undefined // error will be thrown below (it is in case of action was defined without name)
        }
        if (typeof route === 'string') {
          return prevRoute ? prevRoute.extend(route) : Route0.create(route)
        }
        return route
      }
      if (isLayout) {
        if (typeof route === 'string' || !route) {
          const routeNormalized = route ?? '/'
          return prevRoute ? prevRoute.extend(routeNormalized) : Route0.create(routeNormalized)
        }
        return route
      }
      if (isAction) {
        if (!route) {
          return undefined // error will be thrown below
        }
        if (typeof route === 'string') {
          return prevRoute ? prevRoute.extend(route) : Route0.create(route)
        }
        return route
      }
      return prevRoute
    })()
    const newRouteTokens = newRoute?.getTokens()
    const hasWildcard = !!newRouteTokens?.some((token) => token.kind === 'wildcard')
    if (hasWildcard && isLayout) {
      throw new Error(
        `Wildcard is not allowed in layout point ${this.toStringWithLocation()}. You should just attach your pages to layout points instead.`,
      )
    }
    if (hasWildcard && isAction) {
      throw new Error(
        `Wildcard is not allowed in action point ${this.toStringWithLocation()}. Use middleware instead, or add ctx methods before.`,
      )
    }

    const normalizedPointName = (() => {
      if (isAction && !pointName) {
        return `${providedMethod?.toUpperCase()} ${newRoute?.definition}`
      }
      if (!pointName) {
        throw new Error(`Point name is required for point ${this.toStringWithLocation()}`)
      }
      return pointName
    })()

    const _endpoint = (() => {
      if (
        !['page', 'layout', 'component', 'provider', 'action', 'query', 'infiniteQuery', 'mutation'].includes(
          letsReadyPointType,
        )
      ) {
        return undefined
      }
      const method = (() => {
        if (providedMethod) {
          return providedMethod.toUpperCase()
        }
        if (isAction) {
          throw new Error(`Method is required for action point ${this.toStringWithLocation()}`)
        }
        if (isPage || isLayout) {
          return 'GET'
        }
        return 'POST'
      })()
      const route = (() => {
        if (isAction) {
          if (!newRoute) {
            throw new Error(`Route is required for action point ${this.toStringWithLocation()}`)
          }
          return newRoute
        }
        const scopeKebab = toKebabCase(this.scope)
        const typeKebab = letsReadyPointType === 'infiniteQuery' ? 'infinite-query' : letsReadyPointType
        const nameKebab = toKebabCase(normalizedPointName)
        const routeGeneral = Route0.create(
          `/${this._endpointPrefix || '_point0'}/${scopeKebab}/${typeKebab}/${nameKebab}`,
        )
        if (isPage || isLayout) {
          if (!newRoute || !newRouteTokens) {
            throw new Error(`Route is required for page or layout point ${this.toStringWithLocation()}`)
          }
          return routeGeneral.extend(newRoute.definition)
        }
        return routeGeneral
      })()
      return {
        method,
        route,
      }
    })()

    const scopes = letsReadyPointType === 'root' ? [normalizedPointName, ...this.scopes] : this.scopes
    const scope = letsReadyPointType === 'root' ? normalizedPointName : this.scope
    if (letsReadyPointType === 'root' && normalizedPointName === 'plugin') {
      throw new Error('Cannot create root point with "plugin" scope, it is internally used name for plugin points')
    }

    const newExecuteActions = (() => {
      if ((!isAction && !isPage && !isLayout) || !newRoute) {
        return []
      }
      const paramsKeys = newRoute.getParamsKeys()
      if (isPage || isLayout) {
        if (newRoute.definition === prevRoute?.definition || paramsKeys.length === 0) {
          return []
        }
      }
      return [
        ...(paramsKeys.length === 0
          ? []
          : [
              {
                type: 'params' as const,
                schema: newRoute.schema,
              },
            ]),
      ]
    })()

    const serverExecuteActionsAll = [
      ...this._serverExecuteActions,
      ...newExecuteActions.map((action) => ({
        ...action,
        unstableId: Point0._getNextUnstableId(),
      })),
    ]
    const clientExecuteActionsAll = [
      ...this._clientExecuteActions,
      ...newExecuteActions.map((action) => ({
        ...action,
        unstableId: Point0._getNextUnstableId(),
      })),
    ]

    const serverExecuteActionsSuitable = serverExecuteActionsAll.filter((action) => action.type !== 'loader')
    const clientExecuteActionsSuitable = clientExecuteActionsAll.filter((action) => action.type !== 'loader')

    const mountActionsAll = [
      ...this._mountActions,
      ...newExecuteActions.map((action) => ({
        ...action,
        unstableId: Point0._getNextUnstableId(),
      })),
    ]
    const mountActionsSuitable =
      this.type === 'base' || this.type === 'root'
        ? mountActionsAll
        : mountActionsAll.filter(
            (action) =>
              action.type === 'globalHead' ||
              action.type === 'clientOnly' ||
              action.type === 'search' ||
              action.type === 'params' ||
              action.type === 'input',
          )
    if (letsReadyPointType === 'component' || letsReadyPointType === 'provider') {
      mountActionsSuitable.push({ type: 'selfProps', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() })
    }

    return this._continue({
      scope,
      scopes,
      _serverExecuteActions: serverExecuteActionsSuitable,
      _clientExecuteActions: clientExecuteActionsSuitable,
      _mountActions: mountActionsSuitable,
      type: 'coreStage',
      _letsReadyPointType: letsReadyPointType,
      name: normalizedPointName,
      _fsLocation,
      _endpoint,
      route: newRoute as never,
      _page: undefined,
      _component: undefined,
      _layout: undefined,
      _ProviderReactContext: undefined,
      _useValue: undefined,
      _layouts: this.type === 'layout' ? [...this._layouts, this as unknown as LayoutPoint] : [...this._layouts],
      _serverurl: this._base?._serverurl,
      _hasServerLoader: undefined,
      _basepath: this._base?._basepath,
      _defaultMutationOptions: this._base?._defaultMutationOptions,
      _mutationOptions: {},
      _defaultQueryOptions: this._base?._defaultQueryOptions,
      _defaultInfiniteQueryOptions: this._base?._defaultInfiniteQueryOptions,
      _defaultPageQueryOptions: this._base?._defaultPageQueryOptions,
      _defaultComponentQueryOptions: this._base?._defaultComponentQueryOptions,
      _defaultProviderQueryOptions: this._base?._defaultProviderQueryOptions,
      _defaultLayoutQueryOptions: this._base?._defaultLayoutQueryOptions,
      _queryOptions: {},
      _infiniteQueryOptions: {} as never,
      _fetchOptions: this._base?._fetchOptions,
      _scrollPositionGetter: this._base?._scrollPositionGetter,
      _scrollPositionSetter: this._base?._scrollPositionSetter,
      _scrollPositionRestorePolicy: this._base?._scrollPositionRestorePolicy,
      _polhPolicy: this._base?._polhPolicy,
      _polhDuration: this._base?._polhDuration,
      _ponPolicy: this._base?._ponPolicy,
      _onPrefetchMountableFns: this._base?._onPrefetchMountableFns,
      _errorComponent: undefined,
      _layoutErrorComponent: this._base?._layoutErrorComponent as never,
      _pageErrorComponent: this._base?._pageErrorComponent as never,
      _componentErrorComponent: this._base?._componentErrorComponent as never,
      _loadingComponent: undefined,
      _layoutLoadingComponent: this._base?._layoutLoadingComponent as never,
      _pageLoadingComponent: this._base?._pageLoadingComponent as never,
      _componentLoadingComponent: this._base?._componentLoadingComponent as never,
      X: null as never,
    }) as never
  }

  // root settings

  errorClass<TErrorClass extends ClassLikeError0<ErrorPoint0>>(
    ErrorClass: TErrorClass,
  ): NiceRootStagePoint<
    StagePointTypeOrNever<TPointType>,
    'root',
    TRequiredCtx,
    InstanceType<TErrorClass>,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _Error: ErrorClass as never,
    }) as never
  }

  serverurl(
    serverurl: string,
  ): NiceRootStagePoint<
    StagePointTypeOrNever<TPointType>,
    'root',
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _serverurl: serverurl,
    }) as never
  }

  // general settings

  schemaHelper(
    schemaHelper: SchemaHelper | undefined | false | null,
  ): NiceRootStagePoint<
    StagePointTypeOrNever<TPointType>,
    'root',
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    const newSchemasHelpers = schemaHelper ? [...(this._schemasHelpers ?? []), schemaHelper] : this._schemasHelpers
    return this._continue({
      _schemasHelpers: newSchemasHelpers,
    }) as never
  }

  basepath<TBasepath extends string>(
    basepath: TBasepath,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    ExtendRouteDefinition<TRouteDefinition, TBasepath>,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    const newBasepath: CallableRoute = this._basepath ? this._basepath.extend(basepath) : Route0.create(basepath)
    return this._continue({
      _basepath: newBasepath,
      route: newBasepath,
    }) as never
  }

  // asFormData(
  //   shouldAddMultipartFormDataHeaderToFetchOptions = true,
  // ): NiceStagePoint<
  //   TPointType,
  //   ReadyPointTypeOrNever<TLetsReadyPointType>,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   TRouteDefinition,
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponse,
  //   TQueryResultType,
  //   TProps
  // > {
  //   return this._continue({
  //     _asFormData: shouldAddMultipartFormDataHeaderToFetchOptions,
  //   }) as never
  // }

  on<TEventName extends AnyEventerEventName | '*'>(
    name: TEventName,
    callback: AnyEventerSubscriptionCallback<TEventName, TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  on(
    name: 'error',
    callback: AnyEventerSubscriptionCallback<UniqEventerErrorEventName, TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  on<TEventNames extends Array<AnyEventerEventName>>(
    names: TEventNames,
    callback: AnyEventerSubscriptionCallback<TEventNames[number], TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  on(
    name: AnyEventerEventName | 'error' | '*' | Array<AnyEventerEventName>,
    callback: AnyEventerSubscriptionCallback<any, TError> | undefined = () => {},
  ) {
    const names = Array.isArray(name) ? name : name === 'error' ? uniqEventerErrorEventNames : [name]
    const subscriptions = names.map((name) => ({ name, callback, side: undefined }))
    return this._continue({
      _eventerSubscriptions: [...this._eventerSubscriptions, ...subscriptions],
    }) as never
  }

  serverOn<TEventName extends ServerEventerEventName | '*'>(
    name: TEventName,
    callback: ServerEventerSubscriptionCallback<TEventName, TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  serverOn(
    name: 'error',
    callback: ServerEventerSubscriptionCallback<UniqEventerErrorEventName, TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  serverOn<TEventNames extends Array<ServerEventerEventName>>(
    names: TEventNames,
    callback: ServerEventerSubscriptionCallback<TEventNames[number], TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  serverOn(
    name: ServerEventerEventName | 'error' | '*' | Array<ServerEventerEventName>,
    callback: ServerEventerSubscriptionCallback<any, TError> | undefined = () => {},
  ) {
    const names = Array.isArray(name) ? name : name === 'error' ? uniqEventerErrorEventNames : [name]
    const subscriptions = names.map((name) => ({ name, callback, side: 'server' as const }))
    return this._continue({
      _eventerSubscriptions: [...this._eventerSubscriptions, ...subscriptions],
    }) as never
  }

  clientOn<TEventName extends ClientEventerEventName | '*'>(
    name: TEventName,
    callback: ClientEventerSubscriptionCallback<TEventName, TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  clientOn(
    name: 'error',
    callback: ClientEventerSubscriptionCallback<UniqEventerErrorEventName, TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  clientOn<TEventNames extends Array<ClientEventerEventName>>(
    names: TEventNames,
    callback: ClientEventerSubscriptionCallback<TEventNames[number], TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  clientOn(
    name: ClientEventerEventName | 'error' | '*' | Array<ClientEventerEventName>,
    callback: ClientEventerSubscriptionCallback<any, TError> | undefined = () => {},
  ) {
    const names = Array.isArray(name) ? name : name === 'error' ? uniqEventerErrorEventNames : [name]
    const subscriptions = names.map((name) => ({ name, callback, side: 'client' as const }))
    return this._continue({
      _eventerSubscriptions: [...this._eventerSubscriptions, ...subscriptions],
    }) as never
  }

  // ssr(
  //   ssr: false,
  // ): NiceStagePoint<
  //   StagePointTypeOrNever<TPointType>,
  //   ReadyPointTypeOrNever<TLetsReadyPointType>,
  //   TRequiredCtx,
  //   TError,
  //   TCtx,
  //   TCtxExposedKeys,
  //   TServerLoaderOutput,
  //   TClientLoaderOutput,
  //   TMapperOutput,
  //   TRouteDefinition,
  //   TServerInputSchema,
  //   TClientInputSchema,
  //   TParamsSchema,
  //   TSearchSchema,
  //   TBodySchema,
  //   THeadersSchema,
  //   TCookiesSchema,
  //   TQueryResultType,
  //   TOuterProps,
  //   TInnerProps,
  //   TQueriesDefinitions
  // > {
  //   // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  //   if (ssr) {
  //     throw new Error(
  //       `To enable ssr add ssr: true to engine config. In point you can only disable ssr bye .ssr(false) on point ${this.toStringWithLocation()}`,
  //     )
  //   }
  //   const mountActions = (() => {
  //     if (!this._getSsr()) {
  //       return this._mountActions
  //     }
  //     return [...this._mountActions, { type: 'clientOnly' as const, unstableId: Point0._getNextUnstableId() }]
  //   })()
  //   return this._continue({
  //     _ssr: ssr,
  //     _mountActions: mountActions,
  //   }) as never
  // }

  clientOnly(
    Fallback?: ClientOnlyFallbackComponentType<
      MountableLocation<TLetsReadyPointType, TRouteDefinition>,
      TParamsSchema,
      TSearchSchema,
      TClientInputSchema,
      TInnerProps,
      WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      TMapperOutput,
      TError
    >,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    const mountActions = (() => {
      if (!this._getSsr()) {
        return this._mountActions
      }
      return [...this._mountActions, { type: 'clientOnly' as const, Fallback, unstableId: Point0._getNextUnstableId() }]
    })()
    return this._continue({
      _ssr: false,
      _mountActions: mountActions,
    }) as never
  }

  mutationOptions(
    mutationOptions: UseMutationOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _defaultMutationOptions: mutationOptions,
    }) as never
  }

  queryOptions(
    queryOptions: ExtraUseQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  queryOptions(queryOptions: ExtraUseQueryOptions | undefined = {}) {
    return this._continue({
      _defaultQueryOptions: { ...this._defaultQueryOptions, ...queryOptions },
    }) as never
  }

  infiniteQueryOptions(
    infiniteQueryOptions: PartialUseInfiniteQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  infiniteQueryOptions(infiniteQueryOptions: PartialUseInfiniteQueryOptions | undefined = {}) {
    return this._continue({
      _defaultInfiniteQueryOptions: {
        ...this._defaultInfiniteQueryOptions,
        ...infiniteQueryOptions,
      } as PartialUseInfiniteQueryOptions,
    }) as never
  }

  pageQueryOptions(
    pageQueryOptions: UseQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _defaultPageQueryOptions: pageQueryOptions,
    }) as never
  }

  componentQueryOptions(
    componentQueryOptions: UseQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _defaultComponentQueryOptions: componentQueryOptions,
    }) as never
  }

  providerQueryOptions(
    providerQueryOptions: UseQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _defaultProviderQueryOptions: providerQueryOptions,
    }) as never
  }

  layoutQueryOptions(
    layoutQueryOptions: UseQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _defaultLayoutQueryOptions: layoutQueryOptions,
    }) as never
  }

  fetchOptions(
    fetchOptionsOrFn: FetchOptionsOrFn,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    const newFetchOptionsFn: FetchOptionsFn = () => {
      const prevFetchOptions: FetchOptions = this._fetchOptions?.() || {}
      const newFetchOptions: FetchOptions =
        typeof fetchOptionsOrFn === 'function' ? fetchOptionsOrFn() : fetchOptionsOrFn
      return {
        ...prevFetchOptions,
        ...newFetchOptions,
        headers: mergeHeaders(prevFetchOptions.headers, newFetchOptions.headers),
      }
    }
    return this._continue({
      _fetchOptions: newFetchOptionsFn,
    }) as never
  }

  // extra components

  error(
    errorComponent: ErrorComponentType<any, TError>,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
  error(errorComponent: ErrorComponentType<any, any> | undefined) {
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        ...(errorComponent
          ? [
              {
                type: 'errorComponent' as const,
                Component: errorComponent,
                variant: this._getDestinationComponentVariant(),
                unstableId: Point0._getNextUnstableId(),
                ssr: this._getSsr(),
              },
            ]
          : []),
      ],
      ...(!errorComponent
        ? {}
        : this._isMountablePoint()
          ? {
              _errorComponent: errorComponent,
            }
          : {
              _layoutErrorComponent: errorComponent,
              _pageErrorComponent: errorComponent,
              _componentErrorComponent: errorComponent,
            }),
    }) as never
  }

  layoutError(
    layoutErrorComponent: ErrorComponentType<any, TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  layoutError(layoutErrorComponent: ErrorComponentType<any, TError> | undefined) {
    return this._continue({
      _layoutErrorComponent: layoutErrorComponent,
      // _layoutErrorComponent: this._applyComponentDisplayName(layoutErrorComponent || (() => null), {
      //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'LayoutError',
      // }),
    }) as never
  }

  pageError(
    pageErrorComponent: ErrorComponentType<any, TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  pageError(pageErrorComponent: ErrorComponentType<any, TError> | undefined) {
    // this._applyComponentDisplayName(pageErrorComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'PageError',
    // })
    return this._continue({
      _pageErrorComponent: pageErrorComponent,
    }) as never
  }

  componentError(
    componentErrorComponent: ErrorComponentType<any, TError>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  componentError(componentErrorComponent: ErrorComponentType<any, TError> | undefined) {
    return this._continue({
      _componentErrorComponent: componentErrorComponent,
      // _componentErrorComponent: this._applyComponentDisplayName(componentErrorComponent || (() => null), {
      //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'ComponentError',
      // }),
    }) as never
  }

  layoutLoading(
    layoutLoadingComponent: LoadingComponentType<any>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  layoutLoading(layoutLoadingComponent: LoadingComponentType<any> | undefined) {
    return this._continue({
      _layoutLoadingComponent: layoutLoadingComponent,
      // _layoutLoadingComponent: this._applyComponentDisplayName(layoutLoadingComponent || (() => null), {
      //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'LayoutLoading',
      // }),
    }) as never
  }

  pageLoading(
    pageLoadingComponent: LoadingComponentType<any>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  pageLoading(pageLoadingComponent: LoadingComponentType<any> | undefined) {
    // this._applyComponentDisplayName(pageLoadingComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'PageLoading',
    // })
    return this._continue({
      _pageLoadingComponent: pageLoadingComponent,
    }) as never
  }

  componentLoading(
    componentLoadingComponent: LoadingComponentType<any>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  componentLoading(componentLoadingComponent: LoadingComponentType<any> | undefined) {
    return this._continue({
      _componentLoadingComponent: componentLoadingComponent,
      // _componentLoadingComponent: this._applyComponentDisplayName(
      //   // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake componentLoading for serverNoSsr side
      //   (componentLoadingComponent as never) || (() => null),
      //   {
      //     suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'ComponentLoading',
      //   },
      // ),
    }) as never
  }

  loading(
    loadingComponent: LoadingComponentType<any>,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
  loading(loadingComponent: LoadingComponentType<any> | undefined) {
    // this._applyComponentDisplayName(loadingComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'Loading',
    // })
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        ...(loadingComponent
          ? [
              {
                type: 'loadingComponent' as const,
                Component: loadingComponent,
                variant: this._getDestinationComponentVariant(),
                unstableId: Point0._getNextUnstableId(),
                ssr: this._getSsr(),
              },
            ]
          : []),
      ],
      ...(!loadingComponent
        ? {}
        : this._isMountablePoint()
          ? {
              _loadingComponent: loadingComponent,
            }
          : {
              _layoutLoadingComponent: loadingComponent,
              _pageLoadingComponent: loadingComponent,
              _componentLoadingComponent: loadingComponent,
            }),
    }) as never
  }

  wrapper(
    wrapperComponent: WrapperComponentType<
      MountableLocation<TLetsReadyPointType, TRouteDefinition>,
      TParamsSchema,
      TSearchSchema,
      TClientInputSchema,
      TInnerProps,
      WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      TMapperOutput,
      TError
    >,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
  wrapper(wrapperComponent: WrapperComponentType<any, any, any, any, any, any, any, any> | undefined) {
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        ...(wrapperComponent
          ? [
              {
                type: 'wrapper' as const,
                Component: wrapperComponent,
                unstableId: Point0._getNextUnstableId(),
                ssr: this._getSsr(),
              },
            ]
          : []),
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
    }) as never
  }

  with<
    TPoint extends {
      Infer: {
        IsInputOptional: boolean
        InputRawOrUndefined: any
        UseQueryOptions: any
        QueryResultType: 'query' | 'infiniteQuery'
        QueriedData: any
      }
    },
  >(
    // ...args: TLetsReadyPointType extends MountablePointType
    //   ?
    ...args: [
      // point: TPoint &
      //   (TPoint['Infer']['IsInputOptional'] extends true
      //     ? unknown
      //     : Record<`Input as second argument is required`, `Input as second argument is required`>),
      point: TPoint,
      ...rest: TPoint['Infer']['IsInputOptional'] extends true
        ? [
            input?:
              | TPoint['Infer']['InputRawOrUndefined']
              | ((
                  options: WithFnOptions<
                    MountableLocation<TLetsReadyPointType, TRouteDefinition>,
                    TParamsSchema,
                    TSearchSchema,
                    TClientInputSchema,
                    TInnerProps,
                    WithSelfQueryIfShouldBeFinalized<
                      TPointType,
                      TLetsReadyPointType,
                      TServerLoaderOutput,
                      TClientLoaderOutput,
                      TQueriesDefinitions
                    >,
                    TMapperOutput,
                    TError
                  >,
                ) => TPoint['Infer']['InputRawOrUndefined']),
            queryOptions?: TPoint['Infer']['UseQueryOptions'],
          ]
        : [
            input:
              | TPoint['Infer']['InputRawOrUndefined']
              | ((
                  options: WithFnOptions<
                    MountableLocation<TLetsReadyPointType, TRouteDefinition>,
                    TParamsSchema,
                    TSearchSchema,
                    TClientInputSchema,
                    TInnerProps,
                    WithSelfQueryIfShouldBeFinalized<
                      TPointType,
                      TLetsReadyPointType,
                      TServerLoaderOutput,
                      TClientLoaderOutput,
                      TQueriesDefinitions
                    >,
                    TMapperOutput,
                    TError
                  >,
                ) => TPoint['Infer']['InputRawOrUndefined']),
            queryOptions?: TPoint['Infer']['UseQueryOptions'],
          ],
    ] // : never
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    [
      ...WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      {
        type: TPoint['Infer']['QueryResultType'] extends 'infiniteQuery' ? 'infiniteQuery' : 'query'
        data: TPoint['Infer']['QueriedData']
      },
    ]
  >
  with<TNewQueries extends UseQueryOrInfiniteQueryResult | QueriesResults>(
    withQueryFn: WithQueryFn<
      MountableLocation<TLetsReadyPointType, TRouteDefinition>,
      TParamsSchema,
      TSearchSchema,
      TClientInputSchema,
      TInnerProps,
      WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      TMapperOutput,
      TError,
      TNewQueries
    >,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    [
      ...WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      // ...(TNewQueries extends UseQueryOrInfiniteQueryResult
      //   ? [QueryDefinitionByQuery<TNewQueries>]
      //   : TNewQueries extends UseQueryOrInfiniteQueryResult[]
      //     ? QueriesDefinitionsByQueries<TNewQueries>
      //     : never),
      ...(TNewQueries extends QueriesResults
        ? QueriesDefinitionsByQueries<TNewQueries>
        : TNewQueries extends UseQueryOrInfiniteQueryResult
          ? [QueryDefinitionByQuery<TNewQueries>]
          : never),
    ]
  >
  with<TNewInnerProps extends Props>(
    withFn: WithFn<
      MountableLocation<TLetsReadyPointType, TRouteDefinition>,
      TParamsSchema,
      TSearchSchema,
      TClientInputSchema,
      TInnerProps,
      WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      TMapperOutput,
      TError,
      TNewInnerProps
    > &
      (TNewInnerProps extends UseQueryOrInfiniteQueryResult[]
        ? ShowError<`To return array of queries add as const after array like return [q1, q2] as const`>
        : unknown),
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    AppendProps<TInnerProps, IfNeverThen<Exclude<TNewInnerProps, Error | 'loading' | undefined>, EmptyProps>>,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
  with(
    ...args:
      | [withFn?: WithFn<any, any, any, any, any, any, any, any> | undefined]
      | [
          point?: AnyPoint | undefined,
          input?: (
            options: WithFnOptions<
              MountableLocation<TLetsReadyPointType, TRouteDefinition>,
              TParamsSchema,
              TSearchSchema,
              TClientInputSchema,
              TInnerProps,
              WithSelfQueryIfShouldBeFinalized<
                TPointType,
                TLetsReadyPointType,
                TServerLoaderOutput,
                TClientLoaderOutput,
                TQueriesDefinitions
              >,
              TMapperOutput,
              TError
            >,
          ) => InputRaw,
          queryOptions?: ExtraUseQueryOptions | ExtraUseInfiniteQueryOptions<any, any, any, any, any, any> | undefined,
        ]
  ) {
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []

    // in case if we shake with for server without ssr
    if (!args[0]) {
      return this._continue({
        _mountActions: [...this._mountActions, ...selfQueryAction],
        ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
      }) as never
    }

    // it is query injection
    if ('point' in args[0]) {
      const [{ point }, inputFnOrInput, queryOptions = {}] = args
      const getInputFn =
        typeof inputFnOrInput === 'function'
          ? inputFnOrInput
          : typeof inputFnOrInput === 'object'
            ? () => inputFnOrInput
            : () => ({})
      const withQueryFn = ((options) => {
        const input = getInputFn(options)
        if (point._queryResultType === 'infiniteQuery') {
          return point.useInfiniteQuery(input, queryOptions as never)
        } else {
          return point.useQuery(input, queryOptions)
        }
      }) as WithQueryFn<any, any, any, any, any, any, any, any>
      return this._continue({
        _mountActions: [
          ...this._mountActions,
          ...selfQueryAction,
          // { type: 'query', fn: queryFn, unstableId: Point0._getNextUnstableId() },
          {
            type: 'with',
            fn: withQueryFn,
            unstableId: Point0._getNextUnstableId(),
            ssr: this._getSsr(),
          },
        ],
        ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
      }) as never
    }

    // it is with fn
    const [withFn] = args
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        {
          type: 'with',
          fn: withFn,
          unstableId: Point0._getNextUnstableId(),
          ssr: this._getSsr(),
        },
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
    }) as never
  }

  relatedQuery<
    TPoint extends {
      point: AnyPoint
      Infer: {
        IsInputOptional: boolean
        InputRawOrUndefined: any
        UseQueryOptions: any
        QueryResultType: 'query' | 'infiniteQuery'
        QueriedData: any
      }
    },
  >(
    ...args: TLetsReadyPointType extends MountablePointType
      ? [
          point: TPoint,
          ...rest: TPoint['Infer']['IsInputOptional'] extends true
            ? [
                input?:
                  | TPoint['Infer']['InputRawOrUndefined']
                  | RelatedQueryInputGetter<
                      TPoint,
                      LocationOrAnyLocation<MountableLocation<TLetsReadyPointType, TRouteDefinition>>
                    >,
                queryOptions?: TPoint['Infer']['UseQueryOptions'],
              ]
            : [
                input:
                  | TPoint['Infer']['InputRawOrUndefined']
                  | RelatedQueryInputGetter<
                      TPoint,
                      LocationOrAnyLocation<MountableLocation<TLetsReadyPointType, TRouteDefinition>>
                    >,
                queryOptions?: TPoint['Infer']['UseQueryOptions'],
              ],
        ]
      : never
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    [
      ...WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      {
        type: TPoint['Infer']['QueryResultType'] extends 'infiniteQuery' ? 'infiniteQuery' : 'query'
        data: TPoint['Infer']['QueriedData']
      },
    ]
  >
  relatedQuery(
    ...args: [
      point?: AnyPoint | undefined,
      input?: RelatedQueryInputGetter<any, any> | InputRaw | undefined,
      queryOptions?: ExtraUseQueryOptions | ExtraUseInfiniteQueryOptions<any, any, any, any, any, any> | undefined,
    ]
  ) {
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []

    // in case if we shake with for server without ssr
    if (!args[0]) {
      return this._continue({
        _mountActions: [...this._mountActions, ...selfQueryAction],
        ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
      }) as never
    }

    const [{ point }, inputFnOrInput, queryOptions = {}] = args
    const getInputFn =
      typeof inputFnOrInput === 'function'
        ? (inputFnOrInput as RelatedQueryInputGetter<any, any>)
        : typeof inputFnOrInput === 'object'
          ? () => inputFnOrInput
          : () => ({})
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        {
          type: 'relatedQuery',
          point,
          queryOptions,
          inputGetter: getInputFn,
          unstableId: Point0._getNextUnstableId(),
          ssr: this._getSsr(),
        },
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
    }) as never
  }

  // scroll restoration

  scrollPosition(
    documentElementGetter: () => HTMLElement | null,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  scrollPosition(
    selector: string,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  scrollPosition(
    getter: ScrollPositionGetter,
    setter: ScrollPositionSetter,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  scrollPosition(...args: [() => HTMLElement | null] | [string] | [ScrollPositionGetter, ScrollPositionSetter] | []) {
    // [] in case if it was shaked for serverNoSsr
    const { getter, setter } = (() => {
      if (args.length === 2) {
        return { getter: args[0], setter: args[1] }
      }
      if (typeof args[0] === 'function') {
        return {
          getter: getWindowScrollPositionGetterByElementGetter(args[0]),
          setter: getWindowScrollPositionSetterByElementGetter(args[0]),
        }
      }
      if (typeof args[0] === 'string') {
        return {
          getter: getWindowScrollPositionGetterBySelector(args[0]),
          setter: getWindowScrollPositionSetterBySelector(args[0]),
        }
      }
      return {
        getter: this._scrollPositionGetter,
        setter: this._scrollPositionSetter,
      }
    })()
    return this._continue<
      TPointType,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >({
      _scrollPositionGetter: getter,
      _scrollPositionSetter: setter,
    }) as never
  }

  scrollRestore(
    // true - restore, false - do not restore, null - set {x: 0, y: 0}
    policy: ScrollPositionRestorePolicy | boolean | null | undefined, // undefined in case if it was shaked for serverNoSsr
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue<
      TPointType,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >({
      _scrollPositionRestorePolicy: typeof policy === 'function' ? policy : () => policy ?? null,
    }) as never
  }

  private static readonly _prevPageScrollPositions: Array<{ name: PointName; input: InputRaw; x: number; y: number }> =
    []

  // middlewares

  middleware(
    middlewareFn: MiddlewareFn<TError, undefined>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  middleware<TProvidedRoute extends RouteDefinition>(
    route: TProvidedRoute,
    middlewareFn: MiddlewareFn<TError, ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  middleware<TProvidedRoute extends AnyRoute>(
    route: TProvidedRoute,
    middlewareFn: MiddlewareFn<TError, TProvidedRoute['definition']>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  middleware<TProvidedRoute extends RouteDefinition>(
    method: WideRequestMethod | WideRequestMethod[],
    route: TProvidedRoute,
    middlewareFn: MiddlewareFn<TError, ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  middleware<TProvidedRoute extends AnyRoute>(
    method: WideRequestMethod | WideRequestMethod[],
    route: TProvidedRoute,
    middlewareFn: MiddlewareFn<TError, TProvidedRoute['definition']>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  middleware(
    ...args:
      | [MiddlewareFn<TError, any>]
      | [route: RouteDefinition | AnyRoute, middlewareFn: MiddlewareFn<TError, any>]
      | [
          method: WideRequestMethod | WideRequestMethod[],
          route: RouteDefinition | AnyRoute,
          middlewareFn: MiddlewareFn<TError, any>,
        ]
      | []
  ) {
    const middleware = ((): MiddlewareFn<TError, any> => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (_point0_env.side.is.client || args.length === 0 || args[0] === undefined) {
        return ({ next }: MiddlewareFnOptions<TError>) => next()
      }
      if (args.length === 1) {
        return args[0]
      }
      if (args.length === 2) {
        const route = (() => {
          if (!args[0]) {
            throw new Error(`Route is required for middleware in point ${this.toStringWithLocation()}`)
          }
          if (typeof args[0] === 'string') {
            return this.route?.extend(args[0]) ?? Route0.create(args[0])
          }
          return args[0]
        })()
        const handler = args[1]
        const hasParams = route.getParamsKeys().length > 0
        return (options: MiddlewareFnOptions<TError>) => {
          if (route.isExact(options.request.location.pathname)) {
            const params = hasParams ? route.getRelation(options.request.location).params : undefined
            const optionsWithParams = hasParams ? { ...options, params } : options
            return handler(optionsWithParams)
          }
          return options.next()
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (args.length === 3) {
        const methods = Array.isArray(args[0]) ? args[0] : [args[0]]
        const route = (() => {
          if (!args[1]) {
            throw new Error(`Route is required for middleware in point ${this.toStringWithLocation()}`)
          }
          if (typeof args[1] === 'string') {
            return this.route?.extend(args[1]) ?? Route0.create(args[1])
          }
          return args[1]
        })()
        const handler = args[2] as MiddlewareFn<TError, any>
        const hasParams = route.getParamsKeys().length > 0
        return (options: MiddlewareFnOptions<TError>) => {
          if (methods.includes(options.request.method) && route.isExact(options.request.location.pathname)) {
            const params = hasParams ? route.getRelation(options.request.location).params : undefined
            const optionsWithParams = hasParams ? { ...options, params } : options
            return handler(optionsWithParams)
          }
          return options.next()
        }
      }
      throw new Error(`Invalid middleware arguments in point ${this.toStringWithLocation()}`)
    })()
    return this._continue({
      _middlewares: [...this._middlewares, middleware],
    }) as never
  }
  // prefetch mode

  onPrefetchPage(
    fn: TLetsReadyPointType extends 'page'
      ? OnPrefetchMountableFn<PageLocation<TRouteDefinition>, TOuterProps>
      : TLetsReadyPointType extends 'layout'
        ? OnPrefetchMountableFn<LayoutLocation<TRouteDefinition>, TOuterProps>
        : OnPrefetchMountableFn<AnyLocation, TOuterProps>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue<
      TPointType,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      _onPrefetchMountableFns: [...this._onPrefetchMountableFns, (fn ?? (() => undefined)) as never],
    }) as never
  }

  prefetchPageOnLinkHover(
    policy: PrefetchPagePolicy,
    duration?: number,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  prefetchPageOnLinkHover(
    policy?: PrefetchPagePolicy, // in case if it was shaked for nossr server
    duration?: number,
  ) {
    return this._continue({
      _polhPolicy: policy,
      ...(duration !== undefined ? { _polhDuration: duration } : {}),
    }) as never
  }

  prefetchPageOnNavigate(
    policy: PrefetchPagePolicy,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  prefetchPageOnNavigate(
    policy?: PrefetchPagePolicy, // in case if it was shaked for nossr server
  ) {
    return this._continue({
      _ponPolicy: policy,
    }) as never
  }

  prefetchPagePolicy(
    policy: PrefetchPagePolicy,
    duration?: number,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  prefetchPagePolicy(
    policy?: PrefetchPagePolicy, // in case if it was shaked for nossr server
    duration?: number,
  ) {
    return this._continue({
      _polhPolicy: policy,
      _ponPolicy: policy,
      ...(duration !== undefined ? { _polhDuration: duration } : {}),
    }) as never
  }

  // transformer

  transformer(
    transformer: DataTransformer,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _transformer: toExtendedTransformer(transformer),
    }) as never
  }

  // middlewares

  ctx<
    TCtxFn extends CtxFn<
      TCtx,
      TCtxExposedKeys,
      TServerInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      'endpoint',
      TError,
      Ctx | undefined
    >,
  >(
    ctxFn: TCtxFn &
      AssertNoArrayReturn<Awaited<ReturnType<TCtxFn>>, 'Ctx fn should not return array'> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    IsUndefined<InferCtxFnOutputCtxAppend<TCtxFn>> extends true
      ? TCtx
      : AppendCtx<TCtx, InferCtxFnOutputCtxAppend<TCtxFn>>,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  ctx<
    TCtxFn extends CtxFn<
      TCtx,
      TCtxExposedKeys,
      TServerInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      'endpoint',
      TError,
      Ctx | undefined
    >,
  >(
    ctxFn: TCtxFn &
      AssertNoArrayReturn<Awaited<ReturnType<TCtxFn>>, 'Ctx fn should not return array'> &
      AssertNoForbiddenCtxExposedKeys<Extract<keyof InferCtxFnOutputCtxAppend<TCtxFn>, string>> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
    expose: true,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    IsUndefined<InferCtxFnOutputCtxAppend<TCtxFn>> extends true
      ? TCtx
      : AppendCtx<TCtx, InferCtxFnOutputCtxAppend<TCtxFn>>,
    IsUndefined<InferCtxFnOutputCtxAppend<TCtxFn>> extends true
      ? TCtxExposedKeys
      : AppendCtxExposedKeys<TCtxExposedKeys, Extract<keyof InferCtxFnOutputCtxAppend<TCtxFn>, string>>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  ctx<
    TCtxFn extends CtxFn<
      TCtx,
      TCtxExposedKeys,
      TServerInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      'endpoint',
      TError,
      Ctx | undefined
    >,
    TCtxFnExposedKeys extends Extract<keyof InferCtxFnOutputCtxAppend<TCtxFn>, string>,
  >(
    ctxFn: TCtxFn &
      AssertNoArrayReturn<Awaited<ReturnType<TCtxFn>>, 'Ctx fn should not return array'> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
    expose: TCtxFnExposedKeys[] & AssertNoForbiddenCtxExposedKeys<TCtxFnExposedKeys>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    IsUndefined<InferCtxFnOutputCtxAppend<TCtxFn>> extends true
      ? TCtx
      : AppendCtx<TCtx, InferCtxFnOutputCtxAppend<TCtxFn>>,
    IsUndefined<InferCtxFnOutputCtxAppend<TCtxFn>> extends true
      ? TCtxExposedKeys
      : AppendCtxExposedKeys<TCtxExposedKeys, TCtxFnExposedKeys>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  ctx<TAppendCtx extends Ctx>(
    ctx: TAppendCtx &
      AssertNotFunction<TAppendCtx, 'Use ctx(fn) for function values'> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    AppendCtx<TCtx, TAppendCtx>,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  ctx<TAppendCtx extends Ctx>(
    ctx: TAppendCtx &
      AssertNotFunction<TAppendCtx, 'Use ctx(fn) for function values'> &
      AssertNoForbiddenCtxExposedKeys<Extract<keyof TAppendCtx, string>> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
    expose: true,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    AppendCtx<TCtx, TAppendCtx>,
    AppendCtxExposedKeys<TCtxExposedKeys, Extract<keyof TAppendCtx, string>>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  ctx<TAppendCtx extends Ctx, TAppendCtxExposedKeys extends Extract<keyof TAppendCtx, string>>(
    ctx: TAppendCtx &
      AssertNotFunction<TAppendCtx, 'Use ctx(fn) for function values'> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
    expose: TAppendCtxExposedKeys[] & AssertNoForbiddenCtxExposedKeys<TAppendCtxExposedKeys>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    AppendCtx<TCtx, TAppendCtx>,
    AppendCtxExposedKeys<TCtxExposedKeys, TAppendCtxExposedKeys>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  ctx(ctxOrFn?: CtxFn | Ctx, expose?: true | string[]) {
    const ctxFn =
      typeof ctxOrFn === 'undefined' // in case if we shake ctx for client side
        ? () => ({})
        : typeof ctxOrFn === 'function'
          ? ctxOrFn
          : () => ctxOrFn
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'ctx', fn: ctxFn, expose, unstableId: Point0._getNextUnstableId() },
      ] as never,
    }) as never
  }

  loader<TNewServerLoaderOutput extends LoaderOutput = EmptyData>(
    loaderFn: TLetsReadyPointType extends 'mutation' | 'action'
      ? LoaderResponseFn<
          TCtx,
          TCtxExposedKeys,
          TServerLoaderOutput,
          TServerInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema,
          THeadersSchema,
          TCookiesSchema,
          'endpoint',
          TError,
          TNewServerLoaderOutput
        > &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'loader'>
      : // AssertNotUnknownLoaderOutput<TNewServerLoaderOutput>
        LoaderDataFn<
          TCtx,
          TCtxExposedKeys,
          TServerLoaderOutput,
          TServerInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema,
          THeadersSchema,
          TCookiesSchema,
          'endpoint',
          TError,
          TNewServerLoaderOutput
        > &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'loader'>, // AssertNotUnknownLoaderOutput<TNewServerLoaderOutput>
  ): NiceStagePoint<
    TNewServerLoaderOutput extends Response ? 'clientStage' : 'serverStage',
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    IfNeverThen<TNewServerLoaderOutput, EmptyData>,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    // NormalizeQueryResultType<TLetsReadyPointType, TQueryResultType, 'query'>,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  loader(
    loaderFn:
      | LoaderDataFn<any, any, any, any, any, any, any, any, any, any, any, any>
      | LoaderResponseFn<any, any, any, any, any, any, any, any, any, any, any, any>
      | undefined,
  ) {
    return this._continue({
      type: 'serverStage', // it should be clientStage if loader returns response, but we know it only by types, we do not know it in runtime, bu it is ok to have here for runtime serverStage. Not good, but ok.
      // _queryResultType: this._normalizeQueryResultType('query'),
      _hasServerLoader: true,
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'loader', fn: (loaderFn as unknown) ?? ((c: any) => c.data), unstableId: Point0._getNextUnstableId() },
      ] as never,
    }) as never
  }

  clientLoader<TNewClientLoaderOutput extends LoaderOutput = LoaderOutput>(
    clientLoaderFn: TLetsReadyPointType extends 'mutation'
      ? ClientLoaderResponseFn<
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TNewClientLoaderOutput
        > &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientLoader'>
      : ClientLoaderDataFn<
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TNewClientLoaderOutput
        > &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientLoader'>,
  ): NiceStagePoint<
    TNewClientLoaderOutput extends Response ? 'finalStage' : 'clientStage', // response can happen only in mutation, so we not care about this happen in mountable
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    IfNeverThen<TNewClientLoaderOutput, EmptyData>,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    // NormalizeQueryResultType<TLetsReadyPointType, TQueryResultType, 'query'>,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions // so here we not try to finalize query, becouse for mutation it is not needed at all, and in mountable can not happen becouse it can not return response
    // WithSelfQueryIfShouldBeFinalized<
    //   TNewClientLoaderOutput extends Response ? 'finalStage' : 'clientStage',
    //   TLetsReadyPointType,
    //   TServerLoaderOutput,
    //   TNewClientLoaderOutput,
    //   TQueriesDefinitions
    // >
  >
  clientLoader(
    clientLoaderFn:
      | ClientLoaderDataFn<any, any, any, any, any, any>
      | ClientLoaderResponseFn<any, any, any, any, any, any>
      | undefined,
  ) {
    // in case if we shake clientLoader for server without ssr side
    clientLoaderFn ||= (o: any) => o.data
    return this._continue({
      // it should be finalStage if loader returns response, but we know it only by types,
      // we do not know it in runtime, bu it is ok to have here for runtime serverStage. Not good, but ok.
      // it will be really finalized in runtime in one of next methods
      type: 'clientStage',
      // _queryResultType: this._normalizeQueryResultType('query'),
      _clientExecuteActions: [
        ...this._clientExecuteActions,
        {
          type: 'loader',

          fn: clientLoaderFn,
          unstableId: Point0._getNextUnstableId(),
        },
      ] as never,
    }) as never
  }

  mapper<TNewMapperOutput extends MapperOutput = MapperOutput>(
    mapperFn: MapperFn<
      MountableLocation<TLetsReadyPointType, TRouteDefinition>,
      TParamsSchema,
      TSearchSchema,
      TClientInputSchema,
      TInnerProps,
      WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      TMapperOutput,
      TNewMapperOutput
    >,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    IfNeverThen<TNewMapperOutput, EmptyData>,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
  mapper(mapperFn: MapperFn<any, any, any, any, any, any, any, any> | undefined) {
    // in case if we shake mapper for server without ssr side
    mapperFn ||= ((o) => o.data) as MapperFn<any, any, any, any, any, any, any, any>
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []
    return this._continue({
      // _sameQueryPoint: null,
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        { type: 'mapper', fn: mapperFn, unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() },
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
    }) as never
  }

  // too strange, just use usual mapper if you need it
  // flatter<
  //   TDataKey extends FinalLoaderMappedOutput<
  //     TQueryResultType,
  //     TServerLoaderOutput,
  //     TClientLoaderOutput,
  //     TMapperOutput
  //   > extends { pages: Array<Record<infer TAnyDataKey, any>> }
  //     ? Extract<TAnyDataKey, string>
  //     : never,
  // >(
  //   dataKey: TDataKey,
  // ): NiceStagePoint<
  //   TPointType,
  //   ReadyPointTypeOrNever<TLetsReadyPointType>,
  //   TRequiredCtx,
  //   TCtx,
  //   TCtxExposedKeys,
  //   TServerLoaderOutput,
  //   TClientLoaderOutput,
  //   FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TMapperOutput> extends {
  //     pages: Array<Record<any, any>>
  //   }
  //     ? {
  //         flattened: FinalLoaderMappedOutput<
  //           TQueryResultType,
  //           TServerLoaderOutput,
  //           TClientLoaderOutput,
  //           TMapperOutput
  //         >['pages'][number][TDataKey]
  //         original: FinalLoaderMappedOutput<
  //           TQueryResultType,
  //           TServerLoaderOutput,
  //           TClientLoaderOutput,
  //           TMapperOutput
  //         >
  //       }
  //     : never,
  //   TRouteDefinition,
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TQueryResultType,
  //   TProps
  // > {
  //   return this._continue({
  //     _mapperFns: [
  //       ...this._mapperFns,
  //       ({
  //         data,
  //       }: {
  //         data: FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TMapperOutput>
  //       }) => {
  //         if (typeof data !== 'object' || !('pages' in data) || !Array.isArray(data.pages)) {
  //           throw new Error(`Flatter can be called only on infinite query data`)
  //         }
  //         return {
  //           flattened: data.pages.flatMap((page) => page[dataKey]),
  //           original: data,
  //         }
  //       },
  //     ] as never,
  //   }) as never
  // }

  head(
    head:
      | HeadFn<
          'success',
          LocationOrAnyLocation<MountableLocation<TLetsReadyPointType, TRouteDefinition>>,
          TParamsSchema,
          TSearchSchema,
          TClientInputSchema,
          TInnerProps,
          WithSelfQueryIfShouldBeFinalized<
            TPointType,
            TLetsReadyPointType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TQueriesDefinitions
          >,
          TMapperOutput,
          TError
        >
      | ResolvableHead
      | string,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
  head<TStatus extends 'loading' | 'error' | 'success' | 'universal' | 'global'>(
    status: TStatus,
    head: TStatus extends 'global'
      ?
          | GlobalHeadFn<any, LocationOrAnyLocation<MountableLocation<TLetsReadyPointType, TRouteDefinition>>>
          | ResolvableHead
      :
          | HeadFn<
              TStatus extends 'loading' | 'error' | 'success' ? TStatus : any,
              LocationOrAnyLocation<MountableLocation<TLetsReadyPointType, TRouteDefinition>>,
              TParamsSchema,
              TSearchSchema,
              TClientInputSchema,
              TInnerProps,
              WithSelfQueryIfShouldBeFinalized<
                TPointType,
                TLetsReadyPointType,
                TServerLoaderOutput,
                TClientLoaderOutput,
                TQueriesDefinitions
              >,
              TMapperOutput,
              TError
            >
          | ResolvableHead
          | string,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
  head(..._args: any[]) {
    const args = _args as
      | [
          status: 'loading' | 'error' | 'success' | 'global' | 'universal',
          head:
            | HeadFn<
                any,
                LocationOrAnyLocation<MountableLocation<TLetsReadyPointType, TRouteDefinition>>,
                TParamsSchema,
                TSearchSchema,
                TClientInputSchema,
                TInnerProps,
                TQueriesDefinitions,
                TMapperOutput,
                ErrorPoint0
              >
            | ResolvableHead
            | string,
        ]
      | [
          head:
            | HeadFn<
                any,
                LocationOrAnyLocation<MountableLocation<TLetsReadyPointType, TRouteDefinition>>,
                TParamsSchema,
                TSearchSchema,
                TClientInputSchema,
                TInnerProps,
                TQueriesDefinitions,
                TMapperOutput,
                ErrorPoint0
              >
            | ResolvableHead
            | string,
        ]
    const [providedStatus, providedHead] = (() => {
      if (args.length === 2) {
        return args
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (args.length === 1) {
        return ['success', args[0]]
      } else {
        return ['universal', () => ({})]
      }
    })()
    const headFn = (() => {
      if (typeof providedHead === 'function') {
        if (providedStatus === 'universal' || providedStatus === 'global') {
          return providedHead
        } else {
          return ((options) => {
            if (options.status !== providedStatus) {
              return {}
            } else {
              return providedHead(options as never)
            }
          }) as HeadFn<any>
        }
      } else {
        if (providedStatus === 'universal' || providedStatus === 'global') {
          return () => providedHead
        } else {
          return ((options) => {
            if (options.status !== providedStatus) {
              return {}
            } else {
              return providedHead
            }
          }) as HeadFn<any>
        }
      }
    })()
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        ...(providedStatus === 'global'
          ? [
              {
                type: 'globalHead' as const,
                fn: headFn as GlobalHeadFn<any, any>,
                unstableId: Point0._getNextUnstableId(),
                ssr: this._getSsr(),
              },
            ]
          : [{ type: 'head' as const, fn: headFn, unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]),
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
    }) as never
  }

  private static _normalizeInputSchema(inputSchema: InputSchema | CustomValidationFn | undefined): InputSchema {
    return !inputSchema
      ? Point0.customValidationFnToInputSchema((x) => x)
      : '~standard' in inputSchema
        ? inputSchema
        : Point0.customValidationFnToInputSchema(inputSchema)
  }

  input<
    TNextServerInputSchema extends InputSchema,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'> &
      AssertInputSchemaNotWider<TNextServerInputSchema, TServerInputSchema, TClientInputSchema> &
      AsserNotMashInputSchemas<TNextServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
  >(
    inputSchema: TNextServerInputSchema,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      MergeRecordValidationSchemas<TServerInputSchema, TNextServerInputSchema>,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  input<
    TInputRaw extends InputRaw,
    TInputParsed extends InputParsed = TInputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'> &
      AssertInputSchemaNotWider<
        RecordValidationSchema<TInputRaw, TInputParsed>,
        TServerInputSchema,
        TClientInputSchema
      > &
      AsserNotMashInputSchemas<
        RecordValidationSchema<TInputRaw, TInputParsed>,
        TClientInputSchema,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >,
  >(
    ...args: TInputParsed extends InputSchema ? never[] : [validateFn: CustomValidationFn<TInputParsed> & TCheckError]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      MergeRecordValidationSchemas<TServerInputSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  input<
    TValidateFn extends CustomValidationFn<any>,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'> &
      AssertInputSchemaNotWider<
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        TServerInputSchema,
        TClientInputSchema
      > &
      AsserNotMashInputSchemas<
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        TClientInputSchema,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >,
  >(
    validateFn: TValidateFn,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      MergeRecordValidationSchemas<TServerInputSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  input<
    TInput extends InputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'> &
      AssertInputSchemaNotWider<RecordValidationSchema<TInput, TInput>, TServerInputSchema, TClientInputSchema> &
      AsserNotMashInputSchemas<
        RecordValidationSchema<TInput, TInput>,
        TClientInputSchema,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >,
  >(): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      MergeRecordValidationSchemas<TServerInputSchema, RecordValidationSchema<TInput, TInput>>,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  input(...args: any[]) {
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'input', schema, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  clientInput<
    TNextClientInputSchema extends InputSchema,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> &
      AssertInputSchemaNotWider<TNextClientInputSchema, TServerInputSchema, TClientInputSchema> &
      AsserNotMashInputSchemas<TServerInputSchema, TNextClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
  >(
    inputSchema: TNextClientInputSchema,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      MergeRecordValidationSchemas<TClientInputSchema, TNextClientInputSchema>,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  clientInput<
    TInputRaw extends InputRaw,
    TInputParsed extends InputParsed = TInputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> &
      AssertInputSchemaNotWider<
        RecordValidationSchema<TInputRaw, TInputParsed>,
        TServerInputSchema,
        TClientInputSchema
      > &
      AsserNotMashInputSchemas<
        TServerInputSchema,
        RecordValidationSchema<TInputRaw, TInputParsed>,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >,
  >(
    validateFn: CustomValidationFn<TInputParsed> & TCheckError,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      MergeRecordValidationSchemas<TClientInputSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  clientInput<
    TValidateFn extends CustomValidationFn<any>,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> &
      AssertInputSchemaNotWider<
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        TServerInputSchema,
        TClientInputSchema
      > &
      AsserNotMashInputSchemas<
        TServerInputSchema,
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >,
  >(
    validateFn: TValidateFn,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      MergeRecordValidationSchemas<TClientInputSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  clientInput<
    TInput extends InputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> &
      AssertInputSchemaNotWider<RecordValidationSchema<TInput, TInput>, TServerInputSchema, TClientInputSchema> &
      AsserNotMashInputSchemas<
        TServerInputSchema,
        RecordValidationSchema<TInput, TInput>,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >,
  >(
    ...args: unknown extends TCheckError ? [] : [TCheckError]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      MergeRecordValidationSchemas<TClientInputSchema, RecordValidationSchema<TInput, TInput>>,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  clientInput(...args: any[]) {
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _clientExecuteActions: [
        ...this._clientExecuteActions,
        { type: 'input', schema, unstableId: Point0._getNextUnstableId() },
      ],
      _mountActions: [...this._mountActions, { type: 'input', schema, unstableId: Point0._getNextUnstableId() }],
    }) as never
  }

  sharedInput<
    TNextInputSchema extends InputSchema,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'sharedInput'> &
      AssertInputSchemaNotWider<TNextInputSchema, TServerInputSchema, TClientInputSchema> &
      AsserNotMashInputSchemas<TNextInputSchema, TNextInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
  >(
    inputSchema: TNextInputSchema,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      MergeRecordValidationSchemas<TServerInputSchema, TNextInputSchema>,
      MergeRecordValidationSchemas<TClientInputSchema, TNextInputSchema>,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  sharedInput<
    TInputRaw extends InputRaw,
    TInputParsed extends InputParsed = TInputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'sharedInput'> &
      AssertInputSchemaNotWider<
        RecordValidationSchema<TInputRaw, TInputParsed>,
        TServerInputSchema,
        TClientInputSchema
      > &
      AsserNotMashInputSchemas<
        RecordValidationSchema<TInputRaw, TInputParsed>,
        RecordValidationSchema<TInputRaw, TInputParsed>,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >,
  >(
    validateFn: CustomValidationFn<TInputParsed> & TCheckError,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      MergeRecordValidationSchemas<TServerInputSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
      MergeRecordValidationSchemas<TClientInputSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  sharedInput<
    TValidateFn extends CustomValidationFn<any>,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'sharedInput'> &
      AssertInputSchemaNotWider<
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        TServerInputSchema,
        TClientInputSchema
      > &
      AsserNotMashInputSchemas<
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >,
  >(
    validateFn: TValidateFn,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      MergeRecordValidationSchemas<TServerInputSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
      MergeRecordValidationSchemas<TClientInputSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  sharedInput<
    TInput extends InputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'sharedInput'> &
      AssertInputSchemaNotWider<RecordValidationSchema<TInput, TInput>, TServerInputSchema, TClientInputSchema> &
      AsserNotMashInputSchemas<
        RecordValidationSchema<TInput, TInput>,
        RecordValidationSchema<TInput, TInput>,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >,
  >(
    ...args: unknown extends TCheckError ? [] : [TCheckError]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      MergeRecordValidationSchemas<TServerInputSchema, RecordValidationSchema<TInput, TInput>>,
      MergeRecordValidationSchemas<TClientInputSchema, RecordValidationSchema<TInput, TInput>>,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  sharedInput(...args: any[]) {
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'input', schema, unstableId: Point0._getNextUnstableId() },
      ],
      _clientExecuteActions: [
        ...this._clientExecuteActions,
        { type: 'input', schema, unstableId: Point0._getNextUnstableId() },
      ],
      _mountActions: [...this._mountActions, { type: 'input', schema, unstableId: Point0._getNextUnstableId() }],
    }) as never
  }

  params<
    TNextParamsSchema extends InputSchema,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'params'> &
      AssertSchemaNotWider<TNextParamsSchema, TParamsSchema, 'params'> &
      AssertInputSchemaHasNotAnotherKeys<TNextParamsSchema, TParamsSchema, 'params'> &
      AsserNotMashInputSchemas<TServerInputSchema, TClientInputSchema, TNextParamsSchema, TSearchSchema, TBodySchema>,
  >(
    paramsSchema: TNextParamsSchema,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      MergeRecordValidationSchemas<TParamsSchema, TNextParamsSchema>,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  params<
    TValidateFn extends CustomValidationFnWithKnownInput<Record<string, string>, any>,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'params'> &
      AssertSchemaNotWider<
        CustomValidationFnWithKnownInputToRecordValidationSchema<TValidateFn>,
        TParamsSchema,
        'params'
      > &
      AssertInputSchemaHasNotAnotherKeys<
        CustomValidationFnWithKnownInputToRecordValidationSchema<TValidateFn>,
        TParamsSchema,
        'params'
      > &
      AsserNotMashInputSchemas<
        TServerInputSchema,
        TClientInputSchema,
        CustomValidationFnWithKnownInputToRecordValidationSchema<TValidateFn>,
        TSearchSchema,
        TBodySchema
      >,
  >(
    validateFn: TValidateFn,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      MergeRecordValidationSchemas<
        TParamsSchema,
        CustomValidationFnWithKnownInputToRecordValidationSchema<TValidateFn>
      >,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  params(...args: any[]) {
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'params', schema, unstableId: Point0._getNextUnstableId() },
      ],
      _clientExecuteActions: [
        ...this._clientExecuteActions,
        { type: 'params', schema, unstableId: Point0._getNextUnstableId() },
      ],
      _mountActions: [...this._mountActions, { type: 'params', schema, unstableId: Point0._getNextUnstableId() }],
    }) as never
  }

  search<
    TNextSearchSchema extends InputSchema,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'search'> &
      AssertSchemaNotWider<TNextSearchSchema, TSearchSchema, 'search'> &
      AsserNotMashInputSchemas<TServerInputSchema, TClientInputSchema, TParamsSchema, TNextSearchSchema, TBodySchema>,
  >(
    searchSchema: TNextSearchSchema,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      MergeRecordValidationSchemas<TSearchSchema, TNextSearchSchema>,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  search<
    TValidateFn extends CustomValidationFnWithKnownInput<UnknownSearchParsed, any>,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'search'> &
      AssertSchemaNotWider<
        CustomValidationFnWithKnownInputToRecordValidationSchema<TValidateFn>,
        TSearchSchema,
        'search'
      > &
      AsserNotMashInputSchemas<
        TServerInputSchema,
        TClientInputSchema,
        TParamsSchema,
        CustomValidationFnWithKnownInputToRecordValidationSchema<TValidateFn>,
        TBodySchema
      >,
  >(
    validateFn: TValidateFn,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      MergeRecordValidationSchemas<
        TSearchSchema,
        CustomValidationFnWithKnownInputToRecordValidationSchema<TValidateFn>
      >,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  search<
    TInput extends InputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'search'> &
      AssertSchemaNotWider<RecordValidationSchema<TInput, TInput>, TSearchSchema, 'search'> &
      AsserNotMashInputSchemas<
        TServerInputSchema,
        TClientInputSchema,
        TParamsSchema,
        RecordValidationSchema<TInput, TInput>,
        TBodySchema
      >,
  >(): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      MergeRecordValidationSchemas<TSearchSchema, RecordValidationSchema<TInput, TInput>>,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  search(...args: any[]) {
    const schema = Point0._normalizeInputSchema(args[0])
    const newSearchSchemaKeys = (() => {
      if (this._searchSchemaKeys === true) {
        return true
      }
      const addSearchSchemaKeys = extractKeysBySchemasHelpers(schema, this._schemasHelpers)
      if (!addSearchSchemaKeys) {
        return true
      }
      return [...new Set([...(this._searchSchemaKeys ?? []), ...addSearchSchemaKeys])]
    })()
    return this._continue({
      _searchSchemaKeys: newSearchSchemaKeys,
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'search', schema, unstableId: Point0._getNextUnstableId() },
      ],
      _clientExecuteActions: [
        ...this._clientExecuteActions,
        { type: 'search', schema, unstableId: Point0._getNextUnstableId() },
      ],
      _mountActions: [...this._mountActions, { type: 'search', schema, unstableId: Point0._getNextUnstableId() }],
    }) as never
  }

  body<
    TNextBodySchema extends InputSchema,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'body'> &
      AssertSchemaNotWider<TNextBodySchema, TBodySchema, 'body'> &
      AsserNotMashInputSchemas<TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TNextBodySchema>,
  >(
    bodySchema: TNextBodySchema,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      MergeRecordValidationSchemas<TBodySchema, TNextBodySchema>,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  body<
    TBodyRaw extends InputRaw,
    TBodyParsed extends InputParsed = TBodyRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'body'> &
      AssertSchemaNotWider<RecordValidationSchema<TBodyRaw, TBodyParsed>, TBodySchema, 'body'> &
      AsserNotMashInputSchemas<
        TServerInputSchema,
        TClientInputSchema,
        TParamsSchema,
        TSearchSchema,
        RecordValidationSchema<TBodyRaw, TBodyParsed>
      >,
  >(
    ...args: TBodyParsed extends InputSchema ? never[] : [validateFn: CustomValidationFn<TBodyParsed> & TCheckError]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      MergeRecordValidationSchemas<TBodySchema, RecordValidationSchema<TBodyRaw, TBodyParsed>>,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  body<
    TValidateFn extends CustomValidationFn<any>,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'body'> &
      AssertSchemaNotWider<CustomValidationFnToRecordValidationSchema<TValidateFn>, TBodySchema, 'body'> &
      AsserNotMashInputSchemas<
        TServerInputSchema,
        TClientInputSchema,
        TParamsSchema,
        TSearchSchema,
        CustomValidationFnToRecordValidationSchema<TValidateFn>
      >,
  >(
    validateFn: TValidateFn,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      MergeRecordValidationSchemas<TBodySchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  body(...args: any[]) {
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'body', schema, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  headers<
    TNextHeadersSchema extends InputSchema,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'headers'> &
      AssertSchemaNotWider<TNextHeadersSchema, THeadersSchema, 'headers'>,
  >(
    headersSchema: TNextHeadersSchema,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      MergeRecordValidationSchemas<THeadersSchema, TNextHeadersSchema>,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  headers<
    TInputRaw extends InputRaw,
    TInputParsed extends InputParsed = TInputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'headers'> &
      AssertSchemaNotWider<RecordValidationSchema<TInputRaw, TInputParsed>, THeadersSchema, 'headers'>,
  >(
    // it is typeguard for overload
    ...args: TInputParsed extends InputSchema ? never[] : [validateFn: CustomValidationFn<TInputParsed> & TCheckError]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      MergeRecordValidationSchemas<THeadersSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  headers<
    TValidateFn extends CustomValidationFn<any>,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'headers'> &
      AssertSchemaNotWider<CustomValidationFnToRecordValidationSchema<TValidateFn>, THeadersSchema, 'headers'>,
  >(
    validateFn: TValidateFn,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      MergeRecordValidationSchemas<THeadersSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  headers(...args: any[]) {
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'headers', schema, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  cookies<
    TNextCookiesSchema extends InputSchema,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'cookies'> &
      AssertSchemaNotWider<TNextCookiesSchema, TCookiesSchema, 'cookies'>,
  >(
    cookiesSchema: TNextCookiesSchema,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      MergeRecordValidationSchemas<TCookiesSchema, TNextCookiesSchema>,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  cookies<
    TInputRaw extends InputRaw,
    TInputParsed extends InputParsed = TInputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'cookies'> &
      AssertSchemaNotWider<RecordValidationSchema<TInputRaw, TInputParsed>, THeadersSchema, 'cookies'>,
  >(
    // it is typeguard for overload
    ...args: TInputParsed extends InputSchema ? never[] : [validateFn: CustomValidationFn<TInputParsed> & TCheckError]
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      MergeRecordValidationSchemas<TCookiesSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  cookies<
    TValidateFn extends CustomValidationFn<any>,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'cookies'> &
      AssertSchemaNotWider<CustomValidationFnToRecordValidationSchema<TValidateFn>, TCookiesSchema, 'cookies'>,
  >(
    validateFn: TValidateFn,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      MergeRecordValidationSchemas<TCookiesSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  cookies(...args: any[]) {
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'cookies', schema, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  root(): NiceRootReadyPoint<
    'root',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      type: 'root',
      _base: this as never as BasePoint,
      _root: this as never as RootPoint,
      name: this.scope,
      _letsReadyPointType: undefined,
    }) as never
  }

  plugin(): NicePluginReadyPoint<
    'plugin',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      type: 'plugin',
      _letsReadyPointType: undefined,
    }) as never
  }

  base(): NiceBaseReadyPoint<
    'base',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      type: 'base',
      _base: this as never as BasePoint,
      _letsReadyPointType: undefined,
    }) as never
  }

  page(
    ...args: TLetsReadyPointType extends 'page'
      ? [
          page?: PageSuccessComponentType<
            TRouteDefinition,
            TParamsSchema,
            TSearchSchema,
            TClientInputSchema,
            TInnerProps,
            WithSelfQueryIfShouldBeFinalized<
              TPointType,
              TLetsReadyPointType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TQueriesDefinitions
            >,
            TMapperOutput
          >,
        ]
      : never
  ): NicePageReadyPoint<
    'page',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
  page(...args: any[]) {
    const [page = () => null] = args as [PageSuccessComponentType<any, any, any, any, any, any, any> | undefined]
    // this._applyComponentDisplayName(page as React.ComponentType<any>, { suffix: 'PageInner' })
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []
    const point = this._continue({
      type: 'page',
      _page: page,
      _letsReadyPointType: undefined,
      // preserve endpoint for queryClientDehydratedState prefetching
      // _endpoint: this.undefinedEndpointIfHasNotServerLoader(),
      _mountActions: [...this._mountActions, ...selfQueryAction],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query' } : {}),
    })
    // point.X = point.Page.bind(point) as never
    // this._applyComponentDisplayName(point.X, { suffix: 'Page' })
    // this._applyComponentDisplayName(point.Page, { suffix: 'Page' })
    // this._applyComponentDisplayName(point._PageLoader, { suffix: 'PageLoader' })
    point.X = point.Page
    Point0._assignNicePointMethodsToComponent({ component: page, point, extra: { X: point.X } })
    return page as never
  }

  component(
    ...args: TLetsReadyPointType extends 'component'
      ? [
          component?: ComponentSuccessComponentType<
            TParamsSchema,
            TSearchSchema,
            TClientInputSchema,
            TInnerProps,
            WithSelfQueryIfShouldBeFinalized<
              TPointType,
              TLetsReadyPointType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TQueriesDefinitions
            >,
            TMapperOutput
          >,
        ]
      : never
  ): NiceComponentReadyPoint<
    'component',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  > {
    const [component = () => null] = args as never as [
      ComponentSuccessComponentType<any, any, any, any, any, any> | undefined,
    ]
    // this._applyComponentDisplayName(component, { suffix: 'Inner' })
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []
    const point = this._continue({
      type: 'component',
      _component: component,
      _letsReadyPointType: undefined,
      _endpoint: this.undefinedEndpointIfHasNotServerLoader(),
      _mountActions: [...this._mountActions, ...selfQueryAction],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query' } : {}),
    })
    // point.X = this._applyComponentDisplayName(point.Component.bind(point), { suffix: 'ComponentZ' }) as never
    // this._applyComponentDisplayName(point.X, { suffix: 'ComponentL' })
    // this._applyComponentDisplayName(point.Component, { suffix: 'Component' })
    // this._applyComponentDisplayName(point._ComponentLoader, { suffix: 'ComponentLoader' })
    point.X = point.Component
    Point0._assignNicePointMethodsToComponent({ component, point, extra: { X: point.X } })
    return component as never
  }

  layout(
    ...args: TLetsReadyPointType extends 'layout'
      ? [
          layout?: LayoutSuccessComponentType<
            TRouteDefinition,
            TParamsSchema,
            TSearchSchema,
            TClientInputSchema,
            TInnerProps,
            WithSelfQueryIfShouldBeFinalized<
              TPointType,
              TLetsReadyPointType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TQueriesDefinitions
            >,
            TMapperOutput
          >,
        ]
      : never
  ): NiceLayoutReadyPoint<
    'layout',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
  layout<
    TPoint extends {
      Infer: {
        ParamsRaw: any
      }
    },
  >(
    ...args: TLetsReadyPointType extends 'page'
      ? [
          layout: TPoint,
          ...error: InputRaw<TParamsSchema> extends TPoint['Infer']['ParamsRaw']
            ? []
            : [ShowError<`Layout params not compatible to current page params`>],
        ]
      : never
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    [
      ...WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
    ]
  >
  layout(...args: any[]) {
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []
    if (this._letsReadyPointType === 'layout') {
      const [layout = () => null] = args as [LayoutSuccessComponentType<any, any, any, any, any, any, any> | undefined]
      // this._applyComponentDisplayName(layout as React.ComponentType<any>, { suffix: 'LayoutInner' })
      const point = this._continue({
        type: 'layout',
        _layout: layout as never,
        _letsReadyPointType: undefined,
        _base: this as never as BasePoint,
        _endpoint: this.undefinedEndpointIfHasNotServerLoader(),
        ...this._getProviderLikeProps(),
        _mountActions: [...this._mountActions, ...selfQueryAction],
        ...(queryShouldBeFinalized ? { _queryResultType: 'query' } : {}),
      })
      // point.X = point.Layout.bind(point) as never
      // this._applyComponentDisplayName(point.X, { suffix: 'Layout' })
      // this._applyComponentDisplayName(point.Layout, { suffix: 'Layout' })
      // this._applyComponentDisplayName(point._LayoutLoader, { suffix: 'LayoutLoader' })
      point.X = point.Layout
      Point0._assignNicePointMethodsToComponent({ component: layout, point, extra: { X: point.X } })
      return layout as never
    } else {
      const [layoutNicePoint] = args as [
        | NiceLayoutReadyPoint<
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            any
          >
        | undefined,
      ]
      return this._continue({
        _layouts: layoutNicePoint ? [...new Set([...this._layouts, layoutNicePoint.point])] : this._layouts,
      }) as never
    }
  }

  private _getProviderLikeProps() {
    return {
      _ProviderReactContext: createContext<MountableSuccessData<TQueriesDefinitions, TMapperOutput>>(
        null as never,
      ) as never,
      _useValue: (point: AnyPoint, keys?: string | string[] | undefined) => {
        if (!point._ProviderReactContext) {
          throw new Error(`ProviderReactContext not found on point ${point.toStringWithLocation()}`)
        }

        if (keys == null) {
          // no keys — return full context
          return useContextSelector(point._ProviderReactContext, (ctx) => {
            if (!ctx)
              throw new Error(`useValue must be used within a Provider on point ${point.toStringWithLocation()}`)
            return ctx
          })
        }

        if (Array.isArray(keys)) {
          // multiple keys — build a memoized object
          return useContextSelector(point._ProviderReactContext, (ctx) => {
            if (!ctx)
              throw new Error(`useValue must be used within a Provider on point ${point.toStringWithLocation()}`)
            const picked = {} as any
            for (const key of keys) {
              picked[key] = ctx[key]
            }
            return picked
          })
        }

        // single key
        return useContextSelector(point._ProviderReactContext, (ctx) => {
          if (!ctx) throw new Error(`useValue must be used within a Provider on point ${point.toStringWithLocation()}`)
          return ctx[keys]
        })
      },
    }
  }

  provider<
    TNewMapperOutput extends MapperOutput = MountableSuccessData<
      WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      TMapperOutput
    >,
  >(
    ...args: TLetsReadyPointType extends 'provider'
      ? [
          mapper?: MapperFn<
            MountableLocation<TLetsReadyPointType, TRouteDefinition>,
            TParamsSchema,
            TSearchSchema,
            TClientInputSchema,
            TInnerProps,
            WithSelfQueryIfShouldBeFinalized<
              TPointType,
              TLetsReadyPointType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TQueriesDefinitions
            >,
            TMapperOutput,
            TNewMapperOutput
          >,
        ]
      : never
  ): NiceProviderReadyPoint<
    'provider',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TNewMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
  provider(_mapperFn?: any) {
    const mapperFn = _mapperFn as MapperFn<any, any, any, any, any, any, any, any> | undefined
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []
    const point = this._continue({
      type: 'provider',
      _letsReadyPointType: undefined,
      _endpoint: this.undefinedEndpointIfHasNotServerLoader(),
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        ...(mapperFn
          ? [
              {
                type: 'mapper' as const,
                fn: mapperFn,
                unstableId: Point0._getNextUnstableId(),
                ssr: this._getSsr(),
              },
            ]
          : []),
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query' } : {}),
      ...this._getProviderLikeProps(),
    })
    // point.X = point.Provider.bind(point) as never
    // this._applyComponentDisplayName(point.X, { suffix: 'Provider' })
    // this._applyComponentDisplayName(point.Provider, { suffix: 'Provider' })
    point.X = point.Provider
    return point as never
  }

  use<
    T extends NicePluginReadyPoint<
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >,
  >(
    plugin: T &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'use'> &
      AssertInputSchemaHasNotAnotherKeys<T['Infer']['ParamsSchema'], TParamsSchema, 'params'> &
      AssertInputSchemaNotWider<T['Infer']['ServerInputSchema'], TServerInputSchema, TClientInputSchema> &
      AssertInputSchemaNotWider<T['Infer']['ClientInputSchema'], TServerInputSchema, TClientInputSchema> &
      AssertSchemaNotWider<T['Infer']['ParamsSchema'], TParamsSchema, 'params'> &
      AssertSchemaNotWider<T['Infer']['SearchSchema'], TParamsSchema, 'search'> &
      AssertSchemaNotWider<T['Infer']['BodySchema'], TParamsSchema, 'body'> &
      AssertSchemaNotWider<T['Infer']['HeadersSchema'], TParamsSchema, 'headers'> &
      AssertSchemaNotWider<T['Infer']['CookiesSchema'], TParamsSchema, 'cookies'> &
      AsserNotMashInputSchemas<
        MergeRecordValidationSchemas<TServerInputSchema, T['Infer']['ServerInputSchema']>,
        MergeRecordValidationSchemas<TClientInputSchema, T['Infer']['ClientInputSchema']>,
        MergeRecordValidationSchemas<TParamsSchema, T['Infer']['ParamsSchema']>,
        MergeRecordValidationSchemas<TSearchSchema, T['Infer']['SearchSchema']>,
        MergeRecordValidationSchemas<TBodySchema, T['Infer']['BodySchema']>
      >,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    AppendCtx<TCtx, T['Infer']['Ctx']>,
    AppendCtxExposedKeys<TCtxExposedKeys, T['Infer']['CtxExposedKeys']>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, T['Infer']['ServerInputSchema']>,
    MergeRecordValidationSchemas<TClientInputSchema, T['Infer']['ClientInputSchema']>,
    MergeRecordValidationSchemas<TParamsSchema, T['Infer']['ParamsSchema']>,
    MergeRecordValidationSchemas<TSearchSchema, T['Infer']['SearchSchema']>,
    MergeRecordValidationSchemas<TBodySchema, T['Infer']['BodySchema']>,
    MergeRecordValidationSchemas<THeadersSchema, T['Infer']['HeadersSchema']>,
    MergeRecordValidationSchemas<TCookiesSchema, T['Infer']['CookiesSchema']>,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    AppendProps<TInnerProps, T['Infer']['InnerProps']>,
    MergeQueries<
      WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      T['Infer']['Queries']
    >
  >
  use(
    plugin: NicePluginReadyPoint<
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >,
  ) {
    const point = plugin.point

    // // throw new Error(`Point ${this.toString()} and ${point.toString()} have different ssr settings`)
    // let pointMountActionsSsr = 'none' as 'none' | 'mash' | true | false
    // for (const mountAction of point._mountActions) {
    //   if (!('ssr' in mountAction)) {
    //     continue
    //   }
    //   if (mountAction.ssr) {
    //     if (pointMountActionsSsr === true) {
    //       // continue
    //     } else if (pointMountActionsSsr === false) {
    //       pointMountActionsSsr = 'mash'
    //     } else if (pointMountActionsSsr === 'none') {
    //       pointMountActionsSsr = true
    //     } else {
    //       // already mash
    //     }
    //   } else {
    //     if (pointMountActionsSsr === false) {
    //       // continue
    //     } else if (pointMountActionsSsr === true) {
    //       pointMountActionsSsr = 'mash'
    //     } else if (pointMountActionsSsr === 'none') {
    //       pointMountActionsSsr = false
    //     } else {
    //       // already mash
    //     }
    //   }
    // }
    // if (typeof pointMountActionsSsr === 'boolean' && this._getSsr() !== pointMountActionsSsr) {
    //   throw new Error(
    //     `Points have different ssr settings, so you may loose mount actions in ssr mode ${this.toStringWithLocation()} and ${point.toStringWithLocation()} `,
    //   )
    // }

    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() }]
      : []

    const pluginStart = {
      type: 'pluginStart' as const,
      name: point.name,
      unstableId: Point0._getNextUnstableId(),
      ssr: this._getSsr(),
    }
    const pluginEnd = {
      type: 'pluginEnd' as const,
      name: point.name,
      unstableId: Point0._getNextUnstableId(),
      ssr: this._getSsr(),
    }
    const pluginStartServerAction = point._serverExecuteActions.length > 0 ? [pluginStart] : []
    const pluginEndServerAction = point._serverExecuteActions.length > 0 ? [pluginEnd] : []
    const pluginStartClientAction = point._clientExecuteActions.length > 0 ? [pluginStart] : []
    const pluginEndClientAction = point._clientExecuteActions.length > 0 ? [pluginEnd] : []
    const pluginStartMountAction = point._mountActions.length > 0 ? [pluginStart] : []
    const pluginEndMountAction = point._mountActions.length > 0 ? [pluginEnd] : []

    const set = (...args: [key: string, newValue?: any]) => {
      const [key, newValue] = args
      const pointValue = (point as any)[key]
      if (pointValue === undefined) {
        return {}
      }
      return {
        [key]: args.length > 1 ? newValue : pointValue,
      }
    }

    return this._continue({
      // type
      // scope
      // scopes
      // _letsReadyPointType
      // _base
      // _root
      _middlewares: [...this._middlewares, ...point._middlewares],
      // _serverurl: point._serverurl,
      // _basepath: point._basepath,
      // _transformer: point._transformer,
      ...set('_ssr'),
      _eventerSubscriptions: [...this._eventerSubscriptions, ...point._eventerSubscriptions],
      _defaultMutationOptions: { ...this._defaultMutationOptions, ...point._defaultMutationOptions },
      _mutationOptions: { ...this._mutationOptions, ...point._mutationOptions },
      _defaultInfiniteQueryOptions: { ...this._defaultInfiniteQueryOptions, ...point._defaultInfiniteQueryOptions },
      _defaultQueryOptions: { ...this._defaultQueryOptions, ...point._defaultQueryOptions },
      _defaultPageQueryOptions: { ...this._defaultPageQueryOptions, ...point._defaultPageQueryOptions },
      _defaultComponentQueryOptions: { ...this._defaultComponentQueryOptions, ...point._defaultComponentQueryOptions },
      _defaultLayoutQueryOptions: { ...this._defaultLayoutQueryOptions, ...point._defaultLayoutQueryOptions },
      _defaultProviderQueryOptions: { ...this._defaultProviderQueryOptions, ...point._defaultProviderQueryOptions },
      // _queryOptions: { ...this._queryOptions, ...point._queryOptions },
      // _infiniteQueryOptions: { ...this._infiniteQueryOptions, ...point._infiniteQueryOptions },
      // _asFormData: this._asFormData,
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        ...pluginStartServerAction,
        ...point._serverExecuteActions,
        ...pluginEndServerAction,
      ],
      _clientExecuteActions: [
        ...this._clientExecuteActions,
        ...pluginStartClientAction,
        ...point._clientExecuteActions,
        ...pluginEndClientAction,
      ],
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        ...pluginStartMountAction,
        ...point._mountActions,
        ...pluginEndMountAction,
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
      // _ProviderReactContext: point._ProviderReactContext,
      // _useValue: point._useValue,
      // route: point.route,
      // _page: point._page,
      // _component: point._component,
      // _layout: point._layout,
      // _layouts: [...new Set([...this._layouts, ...point._layouts])],
      // name
      // _fetchOptions: () => {
      //   const prevFetchOptions: FetchOptions = this._fetchOptions?.() || {}
      //   const newFetchOptions: FetchOptions = point._fetchOptions?.() || {}
      //   return {
      //     ...prevFetchOptions,
      //     ...newFetchOptions,
      //     headers: mergeHeaders(prevFetchOptions.headers, newFetchOptions.headers),
      //   }
      // },
      ...set('_fetchOptions', () => {
        const prevFetchOptions: FetchOptions = this._fetchOptions?.() || {}
        const newFetchOptions: FetchOptions = point._fetchOptions?.() || {}
        return {
          ...prevFetchOptions,
          ...newFetchOptions,
          headers: mergeHeaders(prevFetchOptions.headers, newFetchOptions.headers),
        }
      }),
      ...set('_scrollPositionGetter'),
      ...set('_scrollPositionSetter'),
      ...set('_scrollPositionRestorePolicy'),
      ...set('_polhPolicy'),
      ...set('_polhDuration'),
      ...set('_ponPolicy'),
      _onPrefetchMountableFns: [...this._onPrefetchMountableFns, ...point._onPrefetchMountableFns],
      ...set('_errorComponent'),
      ...set('_layoutErrorComponent'),
      ...set('_pageErrorComponent'),
      ...set('_componentErrorComponent'),
      ...set('_loadingComponent'),
      ...set('_layoutLoadingComponent'),
      ...set('_pageLoadingComponent'),
      ...set('_componentLoadingComponent'),
      // X
    }) as never
  }

  query(
    ...args: TLetsReadyPointType extends 'query'
      ? FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
        ? [
            queryOptions?: ExtraUseQueryOptions<
              FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
              TError,
              FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
              QueryKey
            >,
          ]
        : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
          ? [ShowError<`Query can not return response. Last loader should provide plain object data, not response.`>]
          : [ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .query()`>]
      : never
  ): NiceQueryReadyPoint<
    'query',
    undefined,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    'query',
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  query(
    ...args: TLetsReadyPointType extends 'action'
      ? TPointType extends 'finalStage'
        ? [ShowError<`You can not use query() to finalize your query, becouse it is already finalized`>]
        : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
          ? [
              queryOptions?: ExtraUseQueryOptions<
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                QueryKey
              >,
            ]
          : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
            ? [ShowError<`Query can not return response. Last loader should provide plain object data, not response.`>]
            : [ShowError<`Point has no loaders. Please add .loader() before calling .query() to finalize action`>]
      : never
  ): NiceActionReadyPoint<
    'action',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    'query',
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  query(
    ...args: TLetsReadyPointType extends MountablePointType
      ? TPointType extends 'finalStage'
        ? [ShowError<`You can not use query() to finalize yout query, becouse it is already finalized`>]
        : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
          ? [
              queryOptions?: ExtraUseQueryOptions<
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                QueryKey
              >,
            ]
          : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
            ? [ShowError<`Query can not return response. Last loader should provide plain object data, not response.`>]
            : [
                ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .query() to finalize query.`>,
              ]
      : never
  ): NiceStagePoint<
    'finalStage',
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    'query',
    TOuterProps,
    TInnerProps,
    AppendQueries<
      TQueriesDefinitions,
      QueryDefinition<'query', FinalLoaderDataOrNever<TServerLoaderOutput, TClientLoaderOutput>>
    >
  >
  query(...args: any) {
    const [queryOptions = {}] = args as [ExtraUseQueryOptions | undefined]
    if (this._isMountablePoint()) {
      // mountable point finalize query
      if (this.type === 'finalStage') {
        throw new Error(
          `You can not use query() becouse this point query already finalized in point ${this.toStringWithLocation()}`,
        )
      }
      return this._continue({
        type: 'finalStage',
        _queryResultType: 'query',
        _queryOptions: queryOptions,
        _mountActions: [
          ...this._mountActions,
          { type: 'selfQuery', unstableId: Point0._getNextUnstableId(), ssr: this._getSsr() },
        ],
      }) as never
    } else if (this._letsReadyPointType === 'query') {
      return this._continue({
        type: 'query',
        _letsReadyPointType: undefined,
        _endpoint: this.undefinedEndpointIfHasNotServerLoader(),
        _queryResultType: 'query',
        _queryOptions: queryOptions,
      }) as never
    } else if (this._letsReadyPointType === 'action') {
      // action
      if (!this._hasServerLoader) {
        throw new Error(`Point has no server loader. Please add .loader() before calling .query() to finalize action`)
      }
      return this._continue({
        type: 'action',
        _letsReadyPointType: undefined,
        _queryResultType: 'query',
        _queryOptions: queryOptions,
      }) as never
    } else {
      throw new Error(`Unknown condition, please report this issue on point ${this.toStringWithLocation()}`)
    }
  }

  infiniteQuery(
    ...args: TLetsReadyPointType extends 'infiniteQuery'
      ? FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
        ? [
            infiniteQueryOptions: ExtraUseInfiniteQueryOptions<
              FinalInputRaw<
                TLetsReadyPointType,
                TServerInputSchema,
                TClientInputSchema,
                TParamsSchema,
                TSearchSchema,
                TBodySchema
              >,
              FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
              TError,
              InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
              QueryKey,
              unknown
            >,
          ]
        : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
          ? [
              ShowError<`InfiniteQuery can not return response. Last loader should provide plain object data, not response.`>,
            ]
          : [ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .infiniteQuery()`>]
      : never
  ): NiceInfiniteQueryReadyPoint<
    'infiniteQuery',
    undefined,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    'infiniteQuery',
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  infiniteQuery(
    ...args: TLetsReadyPointType extends 'action'
      ? TPointType extends 'finalStage'
        ? [ShowError<`You can not use infiniteQuery() to finalize, becouse it is already finalized`>]
        : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
          ? [
              infiniteQueryOptions: ExtraUseInfiniteQueryOptions<
                FinalInputRaw<
                  TLetsReadyPointType,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >,
            ]
          : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
            ? [
                ShowError<`InfiniteQuery can not return response. Last loader should provide plain object data, not response.`>,
              ]
            : [
                ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .infiniteQuery()`>,
              ]
      : never
  ): NiceActionReadyPoint<
    'action',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    'infiniteQuery',
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  infiniteQuery(
    ...args: TLetsReadyPointType extends MountablePointType
      ? TPointType extends 'finalStage'
        ? [ShowError<`You can not use infiniteQuery() to finalize yout query, becouse it is already finalized`>]
        : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
          ? [
              infiniteQueryOptions: ExtraUseInfiniteQueryOptions<
                FinalInputRaw<
                  TLetsReadyPointType,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >,
            ]
          : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
            ? [ShowError<`Query can not return response. Last loader should provide plain object data, not response.`>]
            : [
                ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .infiniteQuery() to finalize query.`>,
              ]
      : never
  ): NiceStagePoint<
    'finalStage',
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    'infiniteQuery',
    TOuterProps,
    TInnerProps,
    AppendQueries<
      TQueriesDefinitions,
      QueryDefinition<'infiniteQuery', InfiniteData<FinalLoaderDataOrNever<TServerLoaderOutput, TClientLoaderOutput>>>
    >
  >
  infiniteQuery(...args: any[]) {
    const [infiniteQueryOptions = {}] = args as [ExtraUseInfiniteQueryOptions<any> | undefined]
    if (this._isMountablePoint()) {
      if (this.type === 'finalStage') {
        throw new Error(
          `You can not use infiniteQuery() becouse this point query already finalized in point ${this.toStringWithLocation()}`,
        )
      }
      return this._continue({
        type: 'finalStage',
        _queryResultType: 'infiniteQuery',
        _infiniteQueryOptions: infiniteQueryOptions as ExtraUseInfiniteQueryOptions<any>,
        _mountActions: [
          ...this._mountActions,
          {
            type: 'selfQuery',
            unstableId: Point0._getNextUnstableId(),
            ssr: this._getSsr(),
          },
        ],
      }) as never
    } else if (this._letsReadyPointType === 'infiniteQuery') {
      return this._continue({
        type: 'infiniteQuery',
        _letsReadyPointType: undefined,
        _endpoint: this.undefinedEndpointIfHasNotServerLoader(),
        _queryResultType: 'infiniteQuery',
        _infiniteQueryOptions: infiniteQueryOptions as ExtraUseInfiniteQueryOptions<
          FinalInputRaw<
            ReadyPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >,
      }) as never
    } else if (this._letsReadyPointType === 'action') {
      if (!this._hasServerLoader) {
        throw new Error(
          `Point has no server loader. Please add .loader() before calling .infiniteQuery() to finalize action`,
        )
      }
      return this._continue({
        type: 'action',
        _letsReadyPointType: undefined,
        _queryResultType: 'infiniteQuery',
        _infiniteQueryOptions: infiniteQueryOptions as ExtraUseInfiniteQueryOptions<any>,
      }) as never
    } else {
      throw new Error(`Unknown condition, please report this issue on point ${this.toStringWithLocation()}`)
    }
  }

  mutation(
    ...args: TLetsReadyPointType extends 'mutation'
      ? FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends LoaderOutput
        ? [
            mutationOptions?: UseMutationOptions<
              FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
              TError,
              FinalInputRawOrUndefinedOrVoid<
                TPointType,
                TServerInputSchema,
                TClientInputSchema,
                TParamsSchema,
                TSearchSchema,
                TBodySchema
              >
            >,
          ]
        : [ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .mutation()`>]
      : never
  ): NiceMutationReadyPoint<
    'mutation',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  mutation(
    ...args: TLetsReadyPointType extends 'action'
      ? TPointType extends 'finalStage'
        ? [ShowError<`You can not use mutation() to finalize action, becouse it is already finalized`>]
        : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends LoaderOutput
          ? [
              mutationOptions?: UseMutationOptions<
                FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                FinalInputRawOrUndefinedOrVoid<
                  TPointType,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >
              >,
            ]
          : [ShowError<`Point has no loaders. Please add .loader() before calling .mutation() to finalize action`>]
      : never
  ): NiceActionReadyPoint<
    'action',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    UndefinedQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  mutation(...args: any) {
    const [mutationOptions = {}] = args as [UseMutationOptions<any, any, any, any> | undefined]
    if (this._letsReadyPointType === 'mutation') {
      return this._continue({
        type: 'mutation',
        _mutationOptions: mutationOptions as UseMutationOptions,
        _letsReadyPointType: undefined,
        _endpoint: this.undefinedEndpointIfHasNotServerLoader(),
      }) as never
    } else if (this._letsReadyPointType === 'action') {
      if (!this._hasServerLoader) {
        throw new Error(
          `Point has no server loader. Please add .loader() before calling .mutation() to finalize action`,
        )
      }
      return this._continue({
        type: 'action',
        _letsReadyPointType: undefined,
        _mutationOptions: mutationOptions as UseMutationOptions,
      }) as never
    } else {
      throw new Error(`Unknown condition, please report this issue on point ${this.toStringWithLocation()}`)
    }
  }

  action<TNewServerLoaderOutput extends LoaderOutput = LoaderOutput>(
    loaderFn: LoaderResponseFn<
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TServerInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      'endpoint',
      TError,
      TNewServerLoaderOutput
    > &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'loader'>,
  ): NiceActionReadyPoint<
    'action',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    IfNeverThen<TNewServerLoaderOutput, EmptyData>,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  action(
    ...args: FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends LoaderOutput
      ? []
      : [ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .action()`>]
  ): NiceActionReadyPoint<
    'action',
    UndefinedReadyPointType,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  action(...args: any[]) {
    const [loaderFn] = args as [LoaderResponseFn<any, any, any, any, any, any, any, any, any, any, any> | undefined]
    const point = this._continue({
      type: 'action',
      _letsReadyPointType: undefined,
      _hasServerLoader: true,
      ...(loaderFn
        ? {
            _serverExecuteActions: [
              ...this._serverExecuteActions,
              { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
            ] as never,
          }
        : {}),
    })
    return point as never
  }

  _tail(component: React.Component): typeof this {
    const point = this._continue({})
    Point0._assignNicePointMethodsToComponent({ component, point, extra: {} })
    return component as never
  }

  // internal utils

  private undefinedEndpointIfHasNotServerLoader(): EndpointDefinition | undefined {
    return this._hasServerLoader ? this._endpoint : undefined
  }

  private static _assignNicePointMethodsToComponent({
    component,
    point,
    extra,
  }: {
    component: React.Component | React.ComponentType<any> | (() => null)
    point: AnyPoint<any, any, any, any, any, any, any, any, any, any, any, any>
    extra: Record<string, any>
  }): void {
    if ((component as any).__POINT0_INSTANCE__) {
      throw new Error(
        `This component is already assigned to a point. Please use a different component. Better always define component in place by arrow function. Point ${point.toStringWithLocation()}`,
      )
    }
    Object.assign(component, {
      __POINT0_INSTANCE__: true,
      Infer: point.Infer,
      point,
      lets: point.lets.bind(point),

      getQueryKey: point.getQueryKey.bind(point),
      getQueryOptions: point.getQueryOptions.bind(point),
      useQuery: point.useQuery.bind(point),
      prefetchQuery: point.prefetchQuery.bind(point),
      fetchQuery: point.fetchQuery.bind(point),

      getInfiniteQueryKey: point.getInfiniteQueryKey.bind(point),
      getInfiniteQueryOptions: point.getInfiniteQueryOptions.bind(point),
      useInfiniteQuery: point.useInfiniteQuery.bind(point),
      prefetchInfiniteQuery: point.prefetchInfiniteQuery.bind(point),
      fetchInfiniteQuery: point.fetchInfiniteQuery.bind(point),

      getMutationOptions: point.getMutationOptions.bind(point),
      fetchMutation: point.fetchMutation.bind(point),
      useMutation: point.useMutation.bind(point),

      getFetchServerOptions: point.getFetchServerOptions.bind(point),
      fetchServerDetailed: point.fetchServerDetailed.bind(point),
      fetchServer: point.fetchServer.bind(point),
      fetch: point.fetch.bind(point),

      // Component: Object.assign(point.Component.bind(point), { displayName: (point.Component as any).displayName }),
      // Page: Object.assign(point.Page.bind(point), { displayName: (point.Page as any).displayName }),
      // Layout: Object.assign(point.Layout.bind(point), { displayName: (point.Layout as any).displayName }),
      // Provider: Object.assign(point.Provider.bind(point), { displayName: (point.Provider as any).displayName }),
      // X: Object.assign((point as any).X?.bind(point) || {}, { displayName: (point as any).X?.displayName }),

      Component: point.Component.bind(point),
      Page: point.Page.bind(point),
      Layout: point.Layout.bind(point),
      Provider: point.Provider.bind(point),
      X: (point as any).X?.bind(point),

      useValue: point.useValue.bind(point),
      _useValue: point._useValue?.bind(point),
      getValue: point.getValue.bind(point),
      getValueWeak: point.getValueWeak.bind(point),

      route: point.route,
      _tail: point._tail.bind(point),
      ...extra,
    })
  }

  // private static _isReadyPointType(pointType: PointType): boolean {
  //   return (
  //     pointType === 'root' ||
  //     pointType === 'base' ||
  //     pointType === 'page' ||
  //     pointType === 'layout' ||
  //     pointType === 'plugin' ||
  //     pointType === 'query' ||
  //     pointType === 'infiniteQuery' ||
  //     pointType === 'mutation' ||
  //     pointType === 'component' ||
  //     pointType === 'provider'
  //   )
  // }
  // private _isReadyPoint(): boolean {
  //   return Point0._isReadyPointType(this.type)
  // }
  // private static _isQueryableReadyPointType(pointType: PointType): boolean {
  //   return (
  //     pointType === 'query' ||
  //     pointType === 'infiniteQuery' ||
  //     pointType === 'page' ||
  //     pointType === 'layout' ||
  //     pointType === 'component' ||
  //     pointType === 'provider'
  //   )
  // }
  // private _isQueryableReadyPoint(): boolean {
  //   return Point0._isQueryableReadyPointType(this._letsReadyPointType || this.type)
  // }
  // private _normalizeQueryResultType(newQueryResultType: QueryResultType): QueryResultType | UndefinedQueryResultType {
  //   return this._isQueryableReadyPoint() ? (this._queryResultType ?? newQueryResultType) : this._queryResultType
  // }
  private static _isMountablePointType(pointType: PointType): boolean {
    return pointType === 'page' || pointType === 'layout' || pointType === 'component' || pointType === 'provider'
  }
  private _isMountablePoint(): boolean {
    return Point0._isMountablePointType(this._letsReadyPointType || this.type)
  }
  private _isMountableQueryShouldBeFinalized(): boolean {
    return this._isMountablePoint() && (this.type === 'serverStage' || this.type === 'clientStage')
  }

  _isRoot(): boolean {
    return this.name === this.scope && this.type === 'root'
  }

  private _getDestinationComponentVariant(): DestinationComponentVariant | undefined {
    return {
      page: 'page' as const,
      component: 'component' as const,
      layout: 'layout' as const,
      provider: 'page' as const,
    }[this.type as MountablePointType]
  }
  // private _getLoadingComponent(): LoadingComponentType<any> {
  //   const variant = this._getDestinationComponentVariant()
  //   return (
  //     this._loadingComponent ??
  //     (variant
  //       ? ({
  //           page: this._pageLoadingComponent,
  //           component: this._componentLoadingComponent,
  //           layout: this._layoutLoadingComponent,
  //         }[variant] ?? Point0.DefaultLoadingComponent)
  //       : Point0.DefaultLoadingComponent)
  //   )
  // }
  // private _getErrorComponent(): ErrorComponentType<any> {
  //   const variant = this._getDestinationComponentVariant()
  //   return (
  //     this._errorComponent ??
  //     (variant
  //       ? ({
  //           page: this._pageErrorComponent,
  //           component: this._componentErrorComponent,
  //           layout: this._layoutErrorComponent,
  //         }[variant] ?? Point0.DefaultErrorComponent)
  //       : Point0.DefaultErrorComponent)
  //   )
  // }

  _hasClientLoader(): boolean {
    return this._clientExecuteActions.length > 0 && this._clientExecuteActions.some((fn) => fn.type === 'loader')
  }

  // private _hasClientAsyncLoader(): boolean {
  //   return (
  //     this._clientExecuteActions.length > 0 &&
  //     this._clientExecuteActions.some((fn) => fn.type === 'loader' && fn.fn.constructor.name === 'AsyncFunction')
  //   )
  // }

  // private _getRouteForce(): CallableRoute<NonNullable<TRouteDefinition>> {
  //   if (!this.route) {
  //     throw new Error(`No client route provided for this point. Name: ${this.name}.`)
  //   }
  //   return this.route as CallableRoute<NonNullable<TRouteDefinition>>
  // }

  // private _generateComponentDisplayName(options?: {
  //   index?: number | undefined
  //   prefix?: string
  //   suffix?: string
  // }): string {
  //   const { index, prefix, suffix } = options ?? {}
  //   return toPascalCase([prefix, this.name, suffix, index].filter(Boolean).join('_'))
  // }

  // private _applyComponentDisplayName<TComponent extends React.ComponentType<any>>(
  //   component: TComponent,
  //   options?: { index?: number | undefined; prefix?: string; suffix?: string },
  // ): TComponent {
  //   // TODO: it breaks HMR in bun (but ok in vite), lets set function CompoentName via compiler
  //   return component
  //   // const { index, prefix, suffix } = options ?? {}
  //   // const currentName = component.displayName || component.name || 'X'
  //   // if (
  //   //   currentName &&
  //   //   ![
  //   //     'X',
  //   //     'X2',
  //   //     '_ComponentLoader',
  //   //     '_PageLoader',
  //   //     '_LayoutLoader',
  //   //     'Page',
  //   //     'Layout',
  //   //     'Component',
  //   //     'Provider',
  //   //     'bound Component',
  //   //     'bound Page',
  //   //     'bound Layout',
  //   //     'bound Provider',
  //   //   ].includes(currentName)
  //   // ) {
  //   //   return component
  //   // }
  //   // Object.assign(component, {
  //   //   displayName: this._generateComponentDisplayName({ index, prefix, suffix }),
  //   // })
  //   // return component
  // }

  private static customValidationFnToInputSchema<TValidateFn extends CustomValidationFn>(
    validateFn: TValidateFn,
  ): InputSchema {
    return {
      '~standard': {
        vendor: 'custom',
        version: 1,
        validate: (data) => {
          try {
            const result = validateFn(data as never)
            return {
              value: result,
            }
          } catch (error) {
            return {
              issues: [
                {
                  message: error instanceof Error ? error.message : String(error),
                },
              ],
            }
          }
        },
      },
    } satisfies InputSchema
  }

  private parseInputSafeSync<TInputSchema extends InputSchema>(
    schema: TInputSchema,
    input: InputRaw | undefined,
  ): SimpleSafeParseInputResult<TInputSchema, TError> {
    try {
      const result = schema['~standard'].validate(input)

      // if promise throw error, promise not allowed
      if (result instanceof Promise) {
        throw new this._Error(
          `Promise returning schema input not allowed for client input schemas on point ${this.toStringWithLocation()}`,
        )
      }

      if ('value' in result) {
        return {
          success: true,
          data: result.value as InputParsed<TInputSchema>,
          error: undefined,
        }
      }

      const firstIssue = result.issues.at(0)
      if (!firstIssue) {
        return {
          success: false,
          data: undefined,
          error: new this._Error(`Unknown input schema error on point ${this.toStringWithLocation()}`, {
            cause: result,
          }),
        }
      }
      const path = firstIssue.path?.map((p) => (typeof p === 'object' ? p.key : p)).join('.')
      const message = [path, firstIssue.message].filter(Boolean).join(': ')
      const error = new this._Error(message, { cause: result })
      return {
        success: false,
        data: undefined,
        error,
      }
    } catch (error) {
      return { success: false, data: undefined, error: this._Error.from(error) }
    }
  }

  private validateClientInputSafe({
    input,
    params,
    search,
  }: {
    input: InputRaw
    params: InputRaw | undefined
    search: InputRaw
  }): { success: true; error: undefined } | { success: false; error: unknown } {
    for (const clientExecuteAction of this._clientExecuteActions) {
      if (clientExecuteAction.type === 'input') {
        const result = this.parseInputSafeSync(clientExecuteAction.schema, input)
        if (!result.success) {
          return result
        }
      }
      if (clientExecuteAction.type === 'params') {
        const result = this.parseInputSafeSync(clientExecuteAction.schema, params)
        if (!result.success) {
          return result
        }
      }
      if (clientExecuteAction.type === 'search') {
        const result = this.parseInputSafeSync(clientExecuteAction.schema, search)
        if (!result.success) {
          return result
        }
      }
    }
    return { success: true, error: undefined }
  }

  private async _executeClientAsync({
    serverData,
    serverResponse,
    // location: providedLocation,
    input,
  }: {
    serverData: Data | undefined
    serverResponse: Response | undefined
    // location?: AnyLocation
    input: InputRaw<TClientInputSchema>
  }): Promise<{
    clientData: Data | undefined
    clientResponse: Response | undefined
    clientOutput: Data | Response | undefined
    clientInput: InputParsed<TClientInputSchema> | undefined
    clientParams: InputParsed<TParamsSchema> | undefined
    clientSearch: InputParsed<TSearchSchema> | undefined
  }> {
    let currentClientData: Data | undefined = serverData
    let currentClientResponse: Response | undefined = serverResponse
    let currentClientOutput: Data | Response | undefined = serverResponse ?? serverData
    let currentInputParsed = undefined as InputParsed | undefined
    let currentParamsParsed = undefined as InputParsed | undefined
    let currentSearchParsed = undefined as InputParsed | undefined
    const { params, search } = ((): { params: InputRaw; search: InputRaw } => {
      if (this.type !== 'page' && this.type !== 'layout') {
        return { params: {}, search: {} }
      }
      const fixedInput = flat0.parse(flat0.stringify(input)) as InputRaw
      const { '?': search = {}, ...params } = fixedInput as {
        '?': InputRaw | undefined
        [key: string]: unknown
      }
      return { params, search }
    })()
    // TODO: add cache for schema parsing results
    const validationResult = this.validateClientInputSafe({ input, params, search })
    if (!validationResult.success) {
      throw validationResult.error
    }
    const getParsed = () => {
      return {
        ...(currentInputParsed ? { input: currentInputParsed } : {}),
        ...(currentParamsParsed ? { params: currentParamsParsed } : {}),
        ...(currentSearchParsed ? { search: currentSearchParsed } : {}),
      }
    }
    for (const clientExecuteAction of this._clientExecuteActions) {
      switch (clientExecuteAction.type) {
        case 'pluginStart': {
          continue
        }
        case 'pluginEnd': {
          continue
        }
        case 'input': {
          const result = this.parseInputSafeSync(clientExecuteAction.schema, input)
          if (result.error) {
            throw result.error
          }
          currentInputParsed = {
            ...currentInputParsed,
            ...result.data,
          }
          break
        }
        case 'params': {
          const result = this.parseInputSafeSync(clientExecuteAction.schema, params)
          if (result.error) {
            throw result.error
          }
          currentParamsParsed = {
            ...currentParamsParsed,
            ...result.data,
          }
          break
        }
        case 'search': {
          const result = this.parseInputSafeSync(clientExecuteAction.schema, search)
          if (result.error) {
            throw result.error
          }
          currentSearchParsed = {
            ...currentSearchParsed,
            ...result.data,
          }
          break
        }
        case 'loader': {
          const promise = clientExecuteAction.fn({
            data: currentClientData ?? {},
            response: serverResponse,
            serverData,
            ...getParsed(),
          })
          const result = (await (promise as any)) as Awaited<ReturnType<ClientLoaderResponseFn | ClientLoaderDataFn>>
          if (result instanceof Response) {
            currentClientResponse = result
            currentClientOutput = result
          } else {
            currentClientResponse = undefined
            currentClientData = result
            currentClientOutput = result
          }
          break
        }

        default: {
          throw new Error(
            `Unknown client extend fn type: ${(clientExecuteAction as any).type} on point ${this.toStringWithLocation()}`,
          )
        }
      }
    }
    return {
      clientData: currentClientData,
      clientResponse: currentClientResponse,
      clientOutput: currentClientOutput,
      clientInput: currentInputParsed as InputParsed<TClientInputSchema> | undefined,
      clientParams: currentParamsParsed as InputParsed<TParamsSchema> | undefined,
      clientSearch: currentSearchParsed as InputParsed<TSearchSchema> | undefined,
    }
  }

  private _getUnsafeSelfParamsByAnotherLocation(
    location: ExactLocation | WeakAncestorLocation,
  ): ParamsOutput<AnyRouteOrDefinition> {
    const route = this.route
    if (!route) {
      return {}
    }
    const selfParamsKeys = route.getParamsKeys()
    return selfParamsKeys.reduce<Record<string, string | undefined>>(
      (acc, key) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (location.params && key in location.params) {
          acc[key] = location.params[key as keyof typeof location.params]
        }
        return acc
      },
      {} as Record<string, string | undefined>,
    )
  }

  _getUnsafeInputRawByLocation(location: ExactLocation | WeakAncestorLocation): InputRaw {
    const selfParams = this._getUnsafeSelfParamsByAnotherLocation(location)
    return {
      ...selfParams,
      ...(location.searchString ? { '?': location.search } : {}),
    } as InputRaw
  }

  // fetching and queries

  useQuery(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: { fetchOptions?: FetchOptions | undefined },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: { fetchOptions?: FetchOptions | undefined },
        ]
  ): UsePointQueryResult<'query', TServerLoaderOutput, TClientLoaderOutput, any> {
    const [input = {}, queryOptions, { fetchOptions } = {}] = args
    const serverQueryEnabled = !!this._hasServerLoader
    const clientQueryEnabled = this._hasClientLoader()
    // if (this._queryResultType === 'infiniteQuery') {
    //   throw new Error(`It is not a finite query on point ${this.toStringWithLocation()} `)
    // }
    if (!serverQueryEnabled && !clientQueryEnabled) {
      return { data: {}, query: undefined, clientQuery: undefined } as never
    }

    if (serverQueryEnabled && !clientQueryEnabled) {
      const query = this._useServerQuery({
        input: input as never,
        queryOptions,
        fetchOptions,
      })
      return query as never
    }

    if (!serverQueryEnabled && clientQueryEnabled) {
      const query = this._useClientQuery({
        input: input as never,
        queryOptions,
      })
      return query as never
    }

    const query = this._useCombinedQuery({
      input: input as never,
      queryOptions,
      fetchOptions,
    })
    return query as never
  }

  useInfiniteQuery(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                FinalInputRaw<
                  TPointType,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: { fetchOptions?: FetchOptions | undefined },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                FinalInputRaw<
                  TPointType,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: { fetchOptions?: FetchOptions | undefined },
        ]
  ): UsePointQueryResult<'infiniteQuery', TServerLoaderOutput, TClientLoaderOutput, any> {
    const [input = {}, infiniteQueryOptions, { fetchOptions } = {}] = args
    const serverQueryEnabled = !!this._hasServerLoader
    const clientQueryEnabled = this._hasClientLoader()
    // if (this._queryResultType !== 'infiniteQuery') {
    //   throw new Error(`It is not an infinite query on point ${this.toStringWithLocation()} `)
    // }
    if (!serverQueryEnabled && !clientQueryEnabled) {
      return { data: {}, query: undefined, clientQuery: undefined } as never
    }

    if (serverQueryEnabled && !clientQueryEnabled) {
      const query = this._useServerInfiniteQuery({
        input: input as never,
        infiniteQueryOptions,
        fetchOptions,
      })
      return query as never
    }

    if (!serverQueryEnabled && clientQueryEnabled) {
      const query = this._useClientInfiniteQuery({
        input: input as never,
        infiniteQueryOptions,
      })
      return query as never
    }

    const query = this._useCombinedInfiniteQuery({
      input: input as never,
      infiniteQueryOptions,
      fetchOptions,
    })
    return query as never
  }

  private getServerUrl(): string | undefined {
    if (this._serverurl) {
      return this._serverurl
    }
    const request0 = _ss.__POINT0_REQUEST0__.getWeak()
    if (request0?.location.origin) {
      return request0.location.origin
    }
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return undefined
  }

  private _getFetchServerOptions({
    input,
    fetchOptions: _fetchOptions,
    _outputType = 'data',
  }: {
    input: InputRawUnknown
    fetchOptions?: FetchOptions
    _outputType?: FetchServerOutputType
  }): { url: string; init: RequestInit; request: Request; transform: boolean } {
    const baseFetchOptions = this._fetchOptions?.() || {}
    const { transform = true, ...fetchOptions } = { ...baseFetchOptions, ..._fetchOptions }
    const serverurl = this.getServerUrl()
    if (!serverurl) {
      throw new Error(`Server URL is not set on point ${this.toStringWithLocation()}`)
    }
    if (!this._endpoint) {
      throw new Error(`Endpoint definition is not set on point ${this.toStringWithLocation()}`)
    }
    const isAction = this.type === 'action'
    const isPage = this.type === 'page'
    const isLayout = this.type === 'layout'
    const route = this._endpoint.route
    const url = new URL(
      isAction
        ? route.get({ ...((input as any).params ?? {}), '?': (input as any).search ?? {} })
        : isPage || isLayout
          ? route.get(input as never) // pages and layouts strictly have only params and search
          : route.get(), // queries can not have nor params, nor search
      serverurl,
    )
    const method = this._endpoint.method

    const fromScope = _ss.__POINT0_CLIENT_POINTS__.getWeak()?.manager.scope ?? _getFakeClient()?.scope
    const baseHeaders = mergeHeaders(baseFetchOptions.headers, _fetchOptions?.headers)
    const headers = mergeHeaders(baseHeaders, {
      ...(baseHeaders.has('Accept') ? {} : { Accept: 'application/json' }),
      ...(fromScope ? { 'X-Point0-From-Scope': fromScope } : {}),
      'X-Point0-To-Scope': this.scope,
      'X-Point0-Client-Request-Id': generateId(),
      ...(_outputType === 'queryClientDehydratedState' ? { 'X-Point0-Output-Type': _outputType } : {}),
      ...(transform ? { 'X-Point0-Transform': 'true' } : {}),
    })

    const body = (() => {
      if (isPage || isLayout) {
        return undefined
      }
      if (isAction) {
        if (!(input as any).body) {
          return (input as any).body
        }
        if ((input as any).body instanceof FormData) {
          // headers.set('Content-Type', 'multipart/form-data')
          return (input as any).body
        }
        const currentHeadersContentType = headers.get('Content-Type')
        if (
          currentHeadersContentType &&
          !currentHeadersContentType.includes('application/json') &&
          !currentHeadersContentType.includes('multipart/form-data')
        ) {
          return (input as any).body
        }
      }
      // const shouldAddMultipartFormDataHeaderToFetchOptions = this._asFormData ?? isContainsBinary(input)
      const isFormData = isContainsBinary(input)
      const bodySrc: Record<string, unknown> = isAction ? (input as any).body : input
      const bodyTransformed = (transform ? this._getTransformer().serialize(bodySrc) : bodySrc) as
        | Record<string, unknown>
        | undefined
      if (bodyTransformed === undefined) {
        throw new Error(
          `Transformer returned undefined for input ${JSON.stringify(input)} on point ${this.toStringWithLocation()}`,
        )
      }
      if (isFormData) {
        const formData = new FormData()
        const flattened = flat0.serialize(bodyTransformed)
        for (const [key, value] of Object.entries(flattened)) {
          if (value instanceof File || value instanceof Blob) {
            formData.append(key, value)
          } else if (value !== undefined) {
            if (transform) {
              formData.append(key, JSON.stringify(value))
            } else {
              formData.append(key, typeof value === 'string' ? value : JSON.stringify(value))
            }
          }
        }
        // headers.set('Content-Type', 'multipart/form-data')
        return formData
      } else {
        headers.set('Content-Type', 'application/json')
        return JSON.stringify(bodyTransformed)
      }
    })()

    const fetchUrl = url.toString()
    const fetchInit = {
      ...fetchOptions,
      headers,
      method,
      body,
    }
    const fetchRequest = new Request(fetchUrl, fetchInit)
    return {
      url: fetchUrl,
      init: fetchInit,
      request: fetchRequest,
      transform,
    }
  }

  getFetchServerOptions(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          fetchOptions?: FetchOptions,
          options?: { _outputType?: FetchServerOutputType },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          fetchOptions?: FetchOptions,
          options?: { _outputType?: FetchServerOutputType },
        ]
  ): { url: string; init: RequestInit; request: Request; transform: boolean } {
    const [input = {}, fetchOptions, { _outputType = 'data' } = {}] = args
    return this._getFetchServerOptions({ input, fetchOptions, _outputType })
  }

  private modifyFetchRequestForServerIfRequired(fetchOptions: ReturnType<typeof this.getFetchServerOptions>): Request {
    if (_point0_env.side.is.server) {
      const currentRequest0 = _ss.__POINT0_REQUEST0__.getWeak()
      if (!currentRequest0) {
        return Object.assign(fetchOptions.request, {
          __POINT0_IS_SERVER_REQUEST__: true,
        })
      }
      const originalRequest = currentRequest0.original
      const updatedHeaders = new Headers(fetchOptions.request.headers)

      const originalRequestCookie = originalRequest.headers.get('cookie')
      if (originalRequestCookie) {
        if (updatedHeaders.has('cookie')) {
          updatedHeaders.set('cookie', `${originalRequestCookie}; ${updatedHeaders.get('cookie')}`)
        } else {
          updatedHeaders.set('cookie', originalRequestCookie)
        }
      }

      // const currentEffects = _ss.__POINT0_EFFECTS__.getWeak()
      // if (currentEffects) {
      //   const cookies = Object.values(currentEffects.cookies)
      //   for (const cookie of cookies) {
      //     const serializedCookie = serializeCookiePair(cookie)
      //     if (updatedHeaders.has('cookie')) {
      //       updatedHeaders.set('cookie', `${updatedHeaders.get('cookie')}; ${serializedCookie}`)
      //     } else {
      //       updatedHeaders.set('cookie', serializedCookie)
      //     }
      //   }
      // }

      const updatedInit: RequestInit = {
        ...fetchOptions.init,
        headers: updatedHeaders,
        referrer: originalRequest.referrer,
        referrerPolicy: originalRequest.referrerPolicy,
        mode: originalRequest.mode,
        credentials: originalRequest.credentials,
        cache: originalRequest.cache,
        redirect: originalRequest.redirect,
        integrity: originalRequest.integrity,
        keepalive: originalRequest.keepalive,
      }
      const updatedRequest = new Request(fetchOptions.url, updatedInit)
      Object.assign(updatedRequest, {
        __POINT0_IS_SERVER_REQUEST__: true,
        __POINT0_PARENT_REQUEST__: currentRequest0,
      })
      return updatedRequest
    } else {
      return fetchOptions.request
    }
  }

  // private modifyEffectsCookiesAfterServerFetchIfRequired(response: Response): void {
  //   if (_point0_env.side.is.server) {
  //     const effects = getEffects()
  //     const responseCookies = parseCookies(response)
  //     if (responseCookies.length === 0) {
  //       return
  //     }
  //     const nowTimestamp = Date.now()

  //     for (const cookie of responseCookies) {
  //       const cookieOptions = {
  //         path: cookie.path,
  //         sameSite: cookie.sameSite,
  //         domain: cookie.domain,
  //         expires: cookie.expires,
  //         secure: cookie.secure,
  //         httpOnly: cookie.httpOnly,
  //         partitioned: cookie.partitioned,
  //         maxAge: cookie.maxAge,
  //       }
  //       const cookieExpiresAt =
  //         cookie.expires === undefined
  //           ? undefined
  //           : (cookie.expires instanceof Date ? cookie.expires : new Date(cookie.expires)).getTime()
  //       const shouldDelete =
  //         (typeof cookie.maxAge === 'number' && cookie.maxAge <= 0) ||
  //         (cookieExpiresAt !== undefined && !Number.isNaN(cookieExpiresAt) && cookieExpiresAt <= nowTimestamp)

  //       if (shouldDelete) {
  //         effects.set.cookies(cookie.name, undefined, cookieOptions)
  //       } else {
  //         effects.set.cookies({
  //           name: cookie.name,
  //           value: cookie.value,
  //           ...cookieOptions,
  //         })
  //       }
  //     }
  //   }
  // }

  private async _fetchServerDetailed({
    input,
    fetchOptions: _fetchOptions,
    _outputType,
  }: {
    input: InputRawUnknown
    fetchOptions?: FetchOptions
    _outputType?: FetchServerOutputType
  }): Promise<FetchServerDetailedOutput<TServerLoaderOutput, TError>> {
    let res: Response | undefined
    const _eventData = {
      input,
      point: this as never as AnyPoint,
      error: undefined,
      output: undefined,
    }
    try {
      const fetchOptions = this._getFetchServerOptions({
        input,
        fetchOptions: _fetchOptions,
        _outputType,
      })
      const fetchFn = getFetch()
      const fetchRequest = this.modifyFetchRequestForServerIfRequired(fetchOptions)
      this._emit('pointFetchServerStart', _eventData)
      res = await fetchFn(fetchRequest)
      // this.modifyEffectsCookiesAfterServerFetchIfRequired(res)

      // Bubble up non-default status codes from nested server point fetches
      // to the current outer request (e.g. SSR page render request).
      if (_point0_env.side.is.server) {
        const currentEffects = _ss.__POINT0_EFFECTS__.getWeak()
        if (typeof currentEffects?.status === 'undefined') {
          currentEffects?.set.status(res.status)
        }
      }

      if (res.headers.get('X-Point0-Not-Json-Data') === 'true') {
        const result = {
          response: res,
          data: undefined,
          error: undefined,
          output: res,
        } as Extract<FetchServerDetailedOutput<TServerLoaderOutput, TError>, { error: undefined }>
        const eventData = {
          ..._eventData,
          ...result,
        }
        this._emit('pointFetchServerSettled', eventData)
        this._emit('pointFetchServerSuccess', eventData)
        return result
      }
      const json = await res.json()
      const data = fetchOptions.transform ? (this._getTransformer().deserialize(json) ?? json) : json
      if (res.ok) {
        const result = {
          response: res,
          data,
          error: undefined,
          output: data,
        } as Extract<FetchServerDetailedOutput<TServerLoaderOutput, TError>, { error: undefined }>
        const eventData = {
          ..._eventData,
          ...result,
        }
        this._emit('pointFetchServerSettled', eventData)
        this._emit('pointFetchServerSuccess', eventData)
        return result
      }
      const error0 = this._Error.from(data)
      error0.status = res.status
      const result = {
        response: res,
        output: undefined,
        data: undefined,
        error: error0,
      }
      const eventData = {
        ..._eventData,
        ...result,
      }
      this._emit('pointFetchServerSettled', eventData)
      this._emit('pointFetchServerError', eventData)
      return result
    } catch (error) {
      const result = {
        response: res,
        data: undefined,
        error: this._Error.from(error),
        output: undefined,
      }
      const eventData = {
        ..._eventData,
        ...result,
      }
      this._emit('pointFetchServerSettled', eventData)
      this._emit('pointFetchServerError', eventData)
      return result
    }
  }

  async fetchServerDetailed(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          fetchOptions?: FetchOptions,
          options?: { _outputType?: FetchServerOutputType },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          fetchOptions?: FetchOptions,
          options?: { _outputType?: FetchServerOutputType },
        ]
  ): Promise<FetchServerDetailedOutput<TServerLoaderOutput, TError>> {
    const [input = {}, fetchOptions, options] = args
    return this._fetchServerDetailed({ input, fetchOptions, _outputType: options?._outputType })
  }

  private async _fetchServer({
    input,
    fetchOptions,
    _outputType,
  }: {
    input: InputRawUnknown
    fetchOptions?: FetchOptions
    _outputType?: FetchServerOutputType
  }): Promise<FetchServerOutput<TServerLoaderOutput>> {
    const detailedResult = await this._fetchServerDetailed({ input, fetchOptions, _outputType })
    if (detailedResult.error) {
      throw detailedResult.error
    }
    return detailedResult.output as FetchServerOutput<TServerLoaderOutput>
  }
  async fetchServer(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          fetchOptions?: FetchOptions,
          options?: { _outputType?: FetchServerOutputType },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          fetchOptions?: FetchOptions,
          options?: { _outputType?: FetchServerOutputType },
        ]
  ): Promise<FetchServerOutput<TServerLoaderOutput>> {
    const [input = {}, fetchOptions, options] = args
    return this._fetchServer({ input, fetchOptions, _outputType: options?._outputType })
  }

  _getServerQueryKey({
    input = {} as never,
    outputType = 'data',
    isInfiniteQuery,
  }: {
    input: InputRaw
    outputType?: FetchServerOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    return [
      'point0',
      this.scope,
      this.type,
      this.name,
      'server',
      isInfiniteQuery ? 'infinite' : 'finite',
      this._getTransformer().stringify(
        this._rawInputToRoutedRawInputForQueryKey({ inputRaw: input as never }),
      ) as string,
      outputType,
    ]
  }

  _getClientQueryKey({
    input = {} as never,
    isInfiniteQuery,
  }: {
    input: InputRaw
    isInfiniteQuery: boolean
  }): QueryKey {
    return [
      'point0',
      this.scope,
      this.type,
      this.name,
      'client',
      isInfiniteQuery ? 'infinite' : 'finite',
      this._getTransformer().stringify(
        this._rawInputToRoutedRawInputForQueryKey({ inputRaw: input as never }),
      ) as string,
      'data',
    ]
  }

  private _getCombinedQueryKey({
    input = {} as never,
    outputType = 'data',
    isInfiniteQuery,
  }: {
    input: InputRaw
    outputType?: FetchServerOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    return [
      'point0',
      this.scope,
      this.type,
      this.name,
      'combined',
      isInfiniteQuery ? 'infinite' : 'finite',
      this._getTransformer().stringify(
        this._rawInputToRoutedRawInputForQueryKey({ inputRaw: input as never }),
      ) as string,
      outputType,
    ]
  }

  _getFinalQueryKey({
    input = {},
    options = {},
    queryResultType,
  }: {
    input?: InputRaw
    options?: { _outputType?: FetchServerOutputType }
    queryResultType: QueryResultType
  }): QueryKey {
    const { _outputType } = options
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = !!this._hasServerLoader
    if (hasClientLoader && hasServerLoader) {
      return this._getCombinedQueryKey({
        input: input as never,
        outputType: _outputType,
        isInfiniteQuery: queryResultType === 'infiniteQuery',
      })
    }
    if (hasClientLoader) {
      return this._getClientQueryKey({
        input: input as never,
        isInfiniteQuery: queryResultType === 'infiniteQuery',
      })
    }
    if (hasServerLoader) {
      return this._getServerQueryKey({
        input: input as never,
        outputType: _outputType,
        isInfiniteQuery: queryResultType === 'infiniteQuery',
      })
    }
    throw new Error(`No loader found on point ${this.toStringWithLocation()}`)
  }

  getQueryKey(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          options?: { _outputType?: FetchServerOutputType },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          options?: { _outputType?: FetchServerOutputType },
        ]
  ): QueryKey {
    const [input, options = {}] = args
    return this._getFinalQueryKey({ input, options, queryResultType: 'query' })
  }

  getInfiniteQueryKey(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          options?: { _outputType?: FetchServerOutputType },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          options?: { _outputType?: FetchServerOutputType },
        ]
  ): QueryKey {
    const [input, options = {}] = args
    return this._getFinalQueryKey({ input, options, queryResultType: 'infiniteQuery' })
  }

  _getServerQueryOptions({
    input = {} as never,
    queryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputRaw
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchServerOutputType
  }): UseQueryOptions<
    FetchServerOutput<TServerLoaderOutput>,
    TError,
    FetchServerOutput<TServerLoaderOutput>,
    QueryKey
  > {
    const queryKey = this._getServerQueryKey({ input, outputType, isInfiniteQuery: false })
    const _eventData = {
      point: this as never as AnyPoint,
      input,
      queryKey,
      mode: 'server' as const,
      error: undefined,
      data: undefined,
    }
    const queryFn = async ({ signal }: { signal: AbortSignal }) => {
      this._emit('pointQueryStart', _eventData)
      try {
        const data = await this._fetchServer({
          input,
          fetchOptions: { signal, ...fetchOptions },
          _outputType: outputType,
        })
        const eventData = {
          ..._eventData,
          data: data as Data,
        }
        this._emit('pointQuerySettled', eventData)
        this._emit('pointQuerySuccess', eventData)
        return data
      } catch (error) {
        const error0 = this._Error.from(error)
        const eventData = {
          ..._eventData,
          error: error0,
        }
        this._emit('pointQuerySettled', eventData)
        this._emit('pointQueryError', eventData)
        throw error0
      }
    }
    const mountableDefaultQueryOptions =
      {
        page: this._defaultPageQueryOptions,
        component: this._defaultComponentQueryOptions,
        layout: this._defaultLayoutQueryOptions,
        provider: this._defaultProviderQueryOptions,
      }[this.type as string] || {}
    const result = {
      ...this._defaultQueryOptions,
      ...mountableDefaultQueryOptions,
      ...this._queryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    } as never
    return result
  }

  private _getClientQueryOptions({
    input = {} as never,
    queryOptions,
    // location,
    serverData,
  }: {
    input: InputRaw
    // location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
    serverData?: Data
  }): UseQueryOptions<
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    QueryKey
  > {
    const queryKey = this._getClientQueryKey({ input, isInfiniteQuery: false })
    const _eventData = {
      point: this as never as AnyPoint,
      input,
      queryKey,
      mode: 'client' as const,
      error: undefined,
      data: undefined,
    }
    const queryFn = async () => {
      this._emit('pointQueryStart', _eventData)
      try {
        const { clientData } = await this._executeClientAsync({
          serverData,
          // location,
          input: input as InputRaw<TClientInputSchema>,
          serverResponse: undefined,
        })
        const eventData = {
          ..._eventData,
          data: clientData as Data,
        }
        this._emit('pointQuerySettled', eventData)
        this._emit('pointQuerySuccess', eventData)
        return clientData
      } catch (error) {
        const error0 = this._Error.from(error)
        const eventData = {
          ..._eventData,
          error: error0,
        }
        this._emit('pointQuerySettled', eventData)
        this._emit('pointQueryError', eventData)
        throw error0
      }
    }
    const mountableDefaultQueryOptions =
      {
        page: this._defaultPageQueryOptions,
        component: this._defaultComponentQueryOptions,
        layout: this._defaultLayoutQueryOptions,
        provider: this._defaultProviderQueryOptions,
      }[this.type as string] || {}
    return {
      ...this._defaultQueryOptions,
      ...mountableDefaultQueryOptions,
      ...this._queryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    } as never
  }

  private _getCombinedQueryOptions({
    input = {} as never,
    // location,
    queryClient = _ss.__POINT0_QUERY_CLIENT__.get(),
    queryOptions,
    fetchOptions,
  }: {
    input: InputRaw
    // location?: AnyLocation
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseQueryOptions<
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    QueryKey
  > {
    const queryKey = this._getCombinedQueryKey({ input, outputType: 'data', isInfiniteQuery: false })
    const _eventData = {
      point: this as never as AnyPoint,
      input,
      queryKey,
      mode: 'combined' as const,
      error: undefined,
      data: undefined,
    }
    const queryFn = async () => {
      this._emit('pointQueryStart', _eventData)
      try {
        const serverData = await (async () => {
          const serverKey = this._getServerQueryKey({ input, outputType: 'data', isInfiniteQuery: false })
          const cachedServerData = queryClient.getQueryData(serverKey)
          if (cachedServerData) {
            return cachedServerData
          }
          const serverOpts = this._getServerQueryOptions({ input, queryOptions, fetchOptions, outputType: 'data' })
          return await queryClient.fetchQuery(serverOpts as any)
        })()

        const clientOpts = this._getClientQueryOptions({
          input: input as never,
          queryOptions,
          // location,
          serverData: serverData as never,
        })
        const data = await queryClient.fetchQuery(clientOpts as any)
        const eventData = {
          ..._eventData,
          data: data as Data,
        }
        this._emit('pointQuerySettled', eventData)
        this._emit('pointQuerySuccess', eventData)
        return data
      } catch (error) {
        const error0 = this._Error.from(error)
        const eventData = {
          ..._eventData,
          error: error0,
        }
        this._emit('pointQuerySettled', eventData)
        this._emit('pointQueryError', eventData)
        throw error0
      }
    }
    const mountableDefaultQueryOptions =
      {
        page: this._defaultPageQueryOptions,
        component: this._defaultComponentQueryOptions,
        layout: this._defaultLayoutQueryOptions,
        provider: this._defaultProviderQueryOptions,
      }[this.type as string] || {}
    const result = {
      ...this._defaultQueryOptions,
      ...mountableDefaultQueryOptions,
      ...this._queryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    } as any
    return result
  }

  getQueryOptions(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchServerOutputType
            mode?: QueryMode
          },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchServerOutputType
            mode?: QueryMode
          },
        ]
  ): UseQueryOptions<
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    QueryKey
  > {
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = !!this._hasServerLoader
    const [input, queryOptions, options = {}] = args
    const { queryClient, fetchOptions, outputType, mode = 'serverAndClient' } = options
    if (hasClientLoader && hasServerLoader && (mode === 'client' || mode === 'serverAndClient')) {
      return this._getCombinedQueryOptions({
        input: input as never,
        queryClient,
        queryOptions,
        fetchOptions,
        // location,
      }) as never
    }
    if (hasClientLoader && (mode === 'client' || mode === 'serverAndClient')) {
      return this._getClientQueryOptions({
        input: input as never,
        queryOptions,
        // location,
      }) as never
    }
    if (hasServerLoader && (mode === 'server' || mode === 'serverAndClient')) {
      return this._getServerQueryOptions({
        input: input as never,
        queryOptions,
        fetchOptions,
        outputType,
      }) as never
    }
    throw new Error(`No loader found on point ${this.toStringWithLocation()}`)
  }

  private _toInputWithPageParam({ input, pageParam }: { input: InputRaw; pageParam: unknown }): InputRaw {
    const inputWithPageParam = { ...input } as Record<string, unknown>
    const { getPageParamFromInput, setPageParamToInput, pageParamFromInput } = (() => {
      if (typeof this._infiniteQueryOptions.pageParamFromInput === 'string') {
        return {
          pageParamFromInput: this._infiniteQueryOptions.pageParamFromInput,
          getPageParamFromInput: undefined,
          setPageParamToInput: undefined,
        }
      }
      return {
        pageParamFromInput: undefined,
        getPageParamFromInput: this._infiniteQueryOptions.pageParamFromInput.get,
        setPageParamToInput: this._infiniteQueryOptions.pageParamFromInput.set,
      }
    })()
    const pageParamFromInputValue =
      pageParam ??
      (getPageParamFromInput
        ? getPageParamFromInput({ input: inputWithPageParam as never, get: getByPath })
        : getByPath(inputWithPageParam as never, pageParamFromInput as never))
    if (setPageParamToInput) {
      setPageParamToInput({ input: inputWithPageParam as never, value: pageParamFromInputValue, set: setByPath })
    } else {
      setByPath(inputWithPageParam as never, pageParamFromInput as never, pageParamFromInputValue)
    }
    return inputWithPageParam as InputRaw
  }

  private _getServerInfiniteQueryOptions({
    input = {} as never,
    infiniteQueryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputRaw
    infiniteQueryOptions:
      | ExtraUseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchServerOutputType
  }): UseInfiniteQueryOptions<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    InfiniteData<FetchServerOutput<TServerLoaderOutput>>,
    TError,
    FetchServerOutput<TServerLoaderOutput>,
    QueryKey
  > {
    const queryKey = this._getServerQueryKey({ input: input as never, outputType, isInfiniteQuery: true })
    const _eventData = {
      point: this as never as AnyPoint,
      input: input as InputRaw,
      queryKey,
      mode: 'server' as const,
      error: undefined,
      data: undefined,
    }
    const queryFn = async ({ pageParam, signal }: { pageParam: unknown; signal: AbortSignal }) => {
      try {
        this._emit('pointInfiniteQueryStart', _eventData)
        const inputWithPageParam = this._toInputWithPageParam({ input, pageParam })
        const data = await this._fetchServer({
          input: inputWithPageParam as never,
          fetchOptions: { signal, ...fetchOptions },
          _outputType: outputType,
        })
        const eventData = {
          ..._eventData,
          data: data as Data,
        }
        this._emit('pointInfiniteQuerySettled', eventData)
        this._emit('pointInfiniteQuerySuccess', eventData)
        return data
      } catch (error) {
        const error0 = this._Error.from(error)
        const eventData = {
          ..._eventData,
          error: error0,
        }
        this._emit('pointInfiniteQuerySettled', eventData)
        this._emit('pointInfiniteQueryError', eventData)
        throw error0
      }
    }
    const result = {
      ...this._defaultQueryOptions,
      ...this._defaultInfiniteQueryOptions,
      ...this._infiniteQueryOptions,
      ...infiniteQueryOptions,
      queryKey,
      queryFn,
    }
    return result as never
  }

  private _getClientInfiniteQueryOptions({
    input = {} as never,
    infiniteQueryOptions,
    serverData,
    // location,
  }: {
    input: InputRaw
    serverData?: Data
    // location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
  }): UseInfiniteQueryOptions<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
    QueryKey
  > {
    const queryKey = this._getClientQueryKey({ input, isInfiniteQuery: true })
    const _eventData = {
      point: this as never as AnyPoint,
      input,
      queryKey,
      mode: 'client' as const,
      error: undefined,
      data: undefined,
    }
    const queryFn = async ({ pageParam }: { pageParam: unknown }) => {
      try {
        this._emit('pointInfiniteQueryStart', _eventData)
        const inputWithPageParam = this._toInputWithPageParam({ input, pageParam })
        const { clientData } = await this._executeClientAsync({
          serverData,
          // location,
          serverResponse: undefined,
          input: inputWithPageParam as InputRaw<TClientInputSchema>,
        })
        const eventData = {
          ..._eventData,
          data: clientData as Data,
        }
        this._emit('pointInfiniteQuerySettled', eventData)
        this._emit('pointInfiniteQuerySuccess', eventData)
        return clientData
      } catch (error) {
        const error0 = this._Error.from(error)
        const eventData = {
          ..._eventData,
          error: error0,
        }
        this._emit('pointInfiniteQuerySettled', eventData)
        this._emit('pointInfiniteQueryError', eventData)
        throw error0
      }
    }
    return {
      ...this._defaultQueryOptions,
      ...this._defaultInfiniteQueryOptions,
      ...this._infiniteQueryOptions,
      ...infiniteQueryOptions,
      queryKey,
      queryFn,
    } as never
  }

  private _getCombinedInfiniteQueryOptions({
    input = {} as never,
    infiniteQueryOptions,
    fetchOptions,
    // location,
    queryClient,
  }: {
    input: InputRaw
    // location?: AnyLocation
    fetchOptions?: FetchOptions | undefined
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    queryClient?: QueryClient
  }): UseInfiniteQueryOptions<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
    QueryKey
  > {
    const queryKey = this._getCombinedQueryKey({ input, outputType: 'data', isInfiniteQuery: true })
    const _eventData = {
      point: this as never as AnyPoint,
      input,
      queryKey,
      mode: 'combined' as const,
      error: undefined,
      data: undefined,
    }
    const queryFn = async (ctx: { pageParam: unknown }) => {
      try {
        this._emit('pointInfiniteQueryStart', _eventData)
        const pageParam = ctx.pageParam ?? this._infiniteQueryOptions.initialPageParam
        const serverData = await (async () => {
          queryClient ??= _ss.__POINT0_QUERY_CLIENT__.get()
          const infiniteServerKey = this._getServerQueryKey({ input, outputType: 'data', isInfiniteQuery: true })
          const infiniteCachedServerData = queryClient.getQueryData(infiniteServerKey)
          if (infiniteCachedServerData) {
            const pageParamIndex = (infiniteCachedServerData as any).pageParams.findIndex(
              (p: unknown) => p === pageParam,
            )
            if (pageParamIndex !== -1) {
              return (infiniteCachedServerData as any).pages[pageParamIndex]
            }
          }
          const inputWithPageParam = this._toInputWithPageParam({ input, pageParam })
          const finiteServerKey = this._getServerQueryKey({ input, outputType: 'data', isInfiniteQuery: false })
          const finiteCachedServerData = queryClient.getQueryData(finiteServerKey)
          if (finiteCachedServerData) {
            return finiteCachedServerData
          }
          const serverFinityOpts = this._getServerQueryOptions({
            input: inputWithPageParam as never,
            queryOptions: infiniteQueryOptions,
            fetchOptions,
            outputType: 'data',
          })
          const serverFinityResult = await queryClient.fetchQuery(serverFinityOpts as any)
          queryClient.setQueryData(infiniteServerKey, (data: { pages: any[]; pageParams: unknown[] } | undefined) => {
            const pageParamIndex = data?.pageParams.findIndex((p: unknown) => p === pageParam)
            if (pageParamIndex === undefined || pageParamIndex === -1) {
              return data
            }
            return {
              pages: [...(data?.pages || []), serverFinityResult],
              pageParams: [...(data?.pageParams || []), pageParam],
            }
          })
          return serverFinityResult
        })()

        const clientOpts = this._getClientInfiniteQueryOptions({
          input: input as never,
          serverData: serverData as never,
          infiniteQueryOptions,
          // location,
        })
        const clientData = await (clientOpts as any).queryFn({ ...input, pageParam })
        const eventData = {
          ..._eventData,
          data: clientData as Data,
        }
        this._emit('pointInfiniteQuerySettled', eventData)
        this._emit('pointInfiniteQuerySuccess', eventData)
        return clientData
      } catch (error) {
        const error0 = this._Error.from(error)
        const eventData = {
          ..._eventData,
          error: error0,
        }
        this._emit('pointInfiniteQuerySettled', eventData)
        this._emit('pointInfiniteQueryError', eventData)
        throw error0
      }
    }
    const result = {
      ...this._defaultQueryOptions,
      ...this._defaultInfiniteQueryOptions,
      ...this._infiniteQueryOptions,
      ...infiniteQueryOptions,
      queryKey,
      queryFn,
    } as never
    return result
  }

  getInfiniteQueryOptions(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                FinalInputRaw<
                  TPointType,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchServerOutputType
            mode?: QueryMode
          },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                FinalInputRaw<
                  TPointType,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchServerOutputType
            mode?: QueryMode
          },
        ]
  ): UseInfiniteQueryOptions<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
    QueryKey
  > {
    const [input, infiniteQueryOptions, options = {}] = args
    const { queryClient, fetchOptions, outputType, mode = 'serverAndClient' } = options
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = !!this._hasServerLoader
    if (hasClientLoader && hasServerLoader && (mode === 'client' || mode === 'serverAndClient')) {
      return this._getCombinedInfiniteQueryOptions({
        input: input as never,
        infiniteQueryOptions,
        fetchOptions,
        queryClient,
        // location,
      }) as never
    }
    if (hasClientLoader && (mode === 'client' || mode === 'serverAndClient')) {
      return this._getClientInfiniteQueryOptions({
        input: input as never,
        infiniteQueryOptions,
        // location,
      }) as never
    }
    if (hasServerLoader && (mode === 'server' || mode === 'serverAndClient')) {
      return this._getServerInfiniteQueryOptions({
        input: input as never,
        infiniteQueryOptions,
        fetchOptions,
        outputType,
      }) as never
    }
    throw new Error(`No loader found on point ${this.toStringWithLocation()}`)
  }

  private _useServerQuery({
    input = {} as never,
    queryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputRaw
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchServerOutputType
  }): UseQueryResult<FetchServerOutput<TServerLoaderOutput>, TError> {
    return useQuery(this._getServerQueryOptions({ input, queryOptions, fetchOptions, outputType }))
  }

  private _useClientQuery({
    input = {} as never,
    queryOptions,
    // location,
  }: {
    input: InputRaw
    // location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
  }): UseQueryResult<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>, TError> {
    return useQuery(
      this._getClientQueryOptions({
        input,
        queryOptions,
        // location,
      }),
    )
  }

  private _useCombinedQuery({
    input = {} as never,
    queryOptions,
    // location,
    fetchOptions,
  }: {
    input: InputRaw
    // location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseQueryResult<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>, TError> {
    const queryClient = useQueryClient()
    return useQuery(
      this._getCombinedQueryOptions({
        input,
        queryOptions,
        // location,
        queryClient,
        fetchOptions,
      }),
    )
  }

  private _useServerInfiniteQuery({
    input = {} as never,
    infiniteQueryOptions: providedInfiniteQueryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputRaw
    infiniteQueryOptions:
      | ExtraUseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchServerOutputType
  }): UseInfiniteQueryResult<InfiniteData<FetchServerOutput<TServerLoaderOutput>>, TError> {
    const infiniteQueryOptions = this._getServerInfiniteQueryOptions({
      input,
      infiniteQueryOptions: providedInfiniteQueryOptions,
      fetchOptions,
      outputType,
    })
    return useInfiniteQuery(infiniteQueryOptions) as never
  }

  private _useClientInfiniteQuery({
    input = {} as never,
    infiniteQueryOptions: providedInfiniteQueryOptions,
    // location,
  }: {
    input: InputRaw
    // location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
  }): UseInfiniteQueryResult<InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>, TError> {
    const infiniteQueryOptions = this._getClientInfiniteQueryOptions({
      input,
      infiniteQueryOptions: providedInfiniteQueryOptions,
      // location,
    })
    return useInfiniteQuery(infiniteQueryOptions) as never
  }

  private _useCombinedInfiniteQuery({
    input = {} as never,
    infiniteQueryOptions: providedInfiniteQueryOptions,
    fetchOptions,
    // location,
  }: {
    input: InputRaw
    // location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseInfiniteQueryResult<InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>, TError> {
    const queryClient = useQueryClient()
    const infiniteQueryOptions = this._getCombinedInfiniteQueryOptions({
      input,
      infiniteQueryOptions: providedInfiniteQueryOptions,
      queryClient,
      // location,
      fetchOptions,
    })
    return useInfiniteQuery(infiniteQueryOptions) as never
  }

  getMutationOptions(
    mutationOptions?: MutationOptions,
    options?: { fetchOptions?: FetchOptions },
  ): MutationOptions<
    FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >
  > {
    const mutationFn = async (input: Record<string, any> = {}) => {
      const eventData = {
        point: this as never as AnyPoint,
        input,
        error: undefined,
        output: undefined,
      }
      this._emit('pointMutationStart', eventData)
      try {
        if (_point0_env.side.is.server) {
          throw new Error(
            `If you want to execute data on server, use engine.execute, or Executor.execute, or get execute fn from loader|ctx options. point.execute is for client only and use fetch under the hood to retrieve server data on point ${this.toStringWithLocation()}`,
          )
        }
        const serverFetchResult = await (async () => {
          if (this._hasServerLoader) {
            return await this._fetchServerDetailed({ input, fetchOptions: options?.fetchOptions })
          }
          return undefined
        })()
        if (serverFetchResult?.error) {
          throw serverFetchResult.error
        }
        if (this._hasClientLoader()) {
          const { clientOutput } = await this._executeClientAsync({
            serverData: serverFetchResult?.data,
            serverResponse: serverFetchResult?.response,
            input: input as never,
          })
          if (!clientOutput) {
            throw new Error(`Client output is not set on point ${this.toStringWithLocation()}`)
          }
          this._emit('pointMutationSettled', { ...eventData, output: clientOutput })
          this._emit('pointMutationSuccess', { ...eventData, output: clientOutput })
          return clientOutput as FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
        }
        if (!serverFetchResult?.output) {
          throw new Error(`Server output is not set on point ${this.toStringWithLocation()}`)
        }
        this._emit('pointMutationSettled', { ...eventData, output: serverFetchResult.output })
        this._emit('pointMutationSuccess', { ...eventData, output: serverFetchResult.output })
        return serverFetchResult.output as never as FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
      } catch (error) {
        const error0 = this._Error.from(error)
        this._emit('pointMutationSettled', { ...eventData, error: error0 })
        this._emit('pointMutationError', { ...eventData, error: error0 })
        throw error0
      }
    }
    return {
      ...this._defaultMutationOptions,
      ...this._mutationOptions,
      ...mutationOptions,
      mutationFn,
    } as MutationOptions<
      FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
      TError,
      FinalInputRawOrUndefinedOrVoid<
        TPointType,
        TServerInputSchema,
        TClientInputSchema,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >
    >
  }

  useMutation = (
    mutationOptions?: MutationOptions | undefined,
    options?: { fetchOptions?: FetchOptions | undefined },
  ): UseMutationResult<
    FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >
  > => {
    return useMutation(this.getMutationOptions(mutationOptions, options))
  }

  fetchMutation = async (
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          mutationOptions?: MutationOptions | undefined,
          options?: { fetchOptions?: FetchOptions | undefined },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          mutationOptions?: MutationOptions | undefined,
          options?: { fetchOptions?: FetchOptions | undefined },
        ]
  ): Promise<FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>> => {
    const [input, mutationOptionsProvided, options] = args
    const mutationOptions = this.getMutationOptions(mutationOptionsProvided, options)
    const queryClient = _ss.__POINT0_QUERY_CLIENT__.get()
    const mutation = queryClient.getMutationCache().build(queryClient, mutationOptions as any)
    return (await mutation.execute(input as any)) as FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
  }

  fetch = async (
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          fetchOptions?: FetchOptions,
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          fetchOptions?: FetchOptions,
        ]
  ): Promise<FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>> => {
    const [input = {}, fetchOptions] = args
    if (!this._queryResultType) {
      return (this.fetchMutation as (...args: any[]) => never)(input, undefined, { fetchOptions })
    }
    if (this._queryResultType === 'infiniteQuery') {
      const result = await (this.fetchInfiniteQuery as (...args: any[]) => any)(input, fetchOptions)
      return result?.pages[0] as never
    }
    return (this.fetchQuery as (...args: any[]) => never)(input, fetchOptions)
  }

  // async _callPrefetchFns({ preventPrefetchFns }: { preventPrefetchFns?: boolean | OnPrefetchFn[] }): Promise<void> {
  //   const prefetchFns =
  //     preventPrefetchFns === true ? new Set<OnPrefetchFn>() : new Set<OnPrefetchFn>([...this._onPrefetchMountableFns])
  //   if (Array.isArray(preventPrefetchFns)) {
  //     for (const fn of preventPrefetchFns) {
  //       if (prefetchFns.has(fn)) {
  //         prefetchFns.delete(fn)
  //       }
  //     }
  //   }
  //   await Promise.all(
  //     Array.from(prefetchFns).map(async (fn) => {
  //       await fn()
  //     }),
  //   )
  // }

  private _prepareFetchQuery({
    input,
    mode,
    queryClient: providedQueryClient,
    queryOptions: providedQueryOptions,
    fetchOptions,
    outputType,
    // location,
  }: {
    input: InputRaw
    mode: QueryMode
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions
    fetchOptions?: FetchOptions
    outputType?: FetchServerOutputType
    // location?: AnyLocation
  }):
    | false
    | {
        cacheData: QueriedFiniteData<any>
        queryOptions: UseQueryOptions<any, any, any, any>
        queryClient: QueryClient
      } {
    const hasClientLoader = this._hasClientLoader()
    if (!this._hasServerLoader && !hasClientLoader) {
      return false
    }
    if (!hasClientLoader && mode === 'client') {
      return false
    }
    if (!this._hasServerLoader && mode === 'server') {
      return false
    }
    const suitablePointTypes = ['page', 'query', 'infiniteQuery', 'action', 'component', 'layout', 'provider']
    if (!suitablePointTypes.includes(this.type)) {
      return false
    }
    const queryClient = providedQueryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const queryOptions = this.getQueryOptions(input as never, providedQueryOptions, {
      // location,
      queryClient,
      fetchOptions,
      outputType,
      mode,
    })
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryOptions.queryKey as never })
    return { cacheData: query?.state.data, queryOptions, queryClient }
  }

  async fetchQuery<TMode extends QueryMode = 'serverAndClient', TCacheOnly extends boolean = false>(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            cacheOnly?: TCacheOnly
            mode?: TMode
            outputType?: FetchServerOutputType
          },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            cacheOnly?: boolean
            mode?: TMode
            outputType?: FetchServerOutputType
          },
        ]
  ): Promise<
    TCacheOnly extends false
      ? TMode extends 'server'
        ? QueriedFiniteData<TServerLoaderOutput>
        : TMode extends 'client'
          ? QueriedFiniteData<TClientLoaderOutput>
          : TMode extends 'serverAndClient'
            ? QueriedFiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
            : never
      :
          | (TMode extends 'server'
              ? QueriedFiniteData<TServerLoaderOutput>
              : TMode extends 'client'
                ? QueriedFiniteData<TClientLoaderOutput>
                : TMode extends 'serverAndClient'
                  ? QueriedFiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
                  : never)
          | undefined
  > {
    const [input = {}, providedQueryOptions, options = {}] = args
    const {
      // location,
      queryClient: providedQueryClient,
      fetchOptions,
      outputType,
      force,
      cacheOnly = false,
      mode = 'serverAndClient',
    } = options
    const preparedFetch = this._prepareFetchQuery({
      input,
      mode,
      queryClient: providedQueryClient,
      queryOptions: providedQueryOptions,
      fetchOptions,
      outputType,
      // location,
    })
    if (!preparedFetch) {
      return undefined as never
    }
    const { cacheData, queryOptions, queryClient } = preparedFetch
    if (cacheData && !force) {
      return cacheData as never
    }
    if (cacheOnly) {
      return undefined as never
    }
    return (await queryClient.fetchQuery(queryOptions)) as never
  }

  async prefetchQuery(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchServerOutputType
          },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchServerOutputType
          },
        ]
  ): Promise<void> {
    const [input = {}, providedQueryOptions, options = {}] = args
    const {
      // location,
      queryClient: providedQueryClient,
      fetchOptions,
      outputType,
      force,
      mode = 'serverAndClient',
    } = options
    const preparedFetch = this._prepareFetchQuery({
      input,
      mode,
      queryClient: providedQueryClient,
      queryOptions: providedQueryOptions,
      fetchOptions,
      outputType,
      // location,
    })
    if (!preparedFetch) {
      return
    }
    const { cacheData, queryOptions, queryClient } = preparedFetch
    if (cacheData && !force) {
      return
    }
    // await Promise.all([this._callPrefetchFns({ preventPrefetchFns }), queryClient.prefetchQuery(queryOptions as never)])
    await queryClient.prefetchQuery(queryOptions as never)
  }

  private _prepareFetchInfiniteQuery({
    input,
    mode,
    queryClient: providedQueryClient,
    infiniteQueryOptions: providedInfiniteQueryOptions,
    fetchOptions,
    outputType,
    // location,
  }: {
    input: InputRaw
    mode: QueryMode
    queryClient?: QueryClient
    infiniteQueryOptions?: ExtraUseInfiniteQueryOptions<any, any, any, any, any, any>
    fetchOptions?: FetchOptions
    outputType?: FetchServerOutputType
    // location?: AnyLocation
  }):
    | false
    | {
        cacheData: QueriedInfiniteData<any>
        infiniteQueryOptions: UseInfiniteQueryOptions<any, any, any, any, any, any>
        queryClient: QueryClient
      } {
    const hasClientLoader = this._hasClientLoader()
    if (!this._hasServerLoader && !hasClientLoader) {
      return false
    }
    if (!hasClientLoader && mode === 'client') {
      return false
    }
    if (!this._hasServerLoader && mode === 'server') {
      return false
    }
    const suitablePointTypes = ['page', 'query', 'infiniteQuery', 'action', 'component', 'layout', 'provider']
    if (!suitablePointTypes.includes(this.type)) {
      return false
    }
    const queryClient = providedQueryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const infiniteQueryOptions = this.getInfiniteQueryOptions(input as never, providedInfiniteQueryOptions, {
      // location,
      queryClient,
      fetchOptions,
      outputType,
      mode,
    })
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: infiniteQueryOptions.queryKey as never })
    return { cacheData: query?.state.data as never, infiniteQueryOptions, queryClient }
  }

  async fetchInfiniteQuery<TMode extends QueryMode = 'serverAndClient', TCacheOnly extends boolean = false>(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                FinalInputRaw<
                  TPointType,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            cacheOnly?: TCacheOnly
            mode?: TMode
            outputType?: FetchServerOutputType
          },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                FinalInputRaw<
                  TPointType,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            cacheOnly?: TCacheOnly
            mode?: TMode
            outputType?: FetchServerOutputType
          },
        ]
  ): Promise<
    TCacheOnly extends false
      ? TMode extends 'server'
        ? QueriedInfiniteData<TServerLoaderOutput>
        : TMode extends 'client'
          ? QueriedInfiniteData<TClientLoaderOutput>
          : TMode extends 'serverAndClient'
            ? QueriedInfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
            : never
      :
          | (TMode extends 'server'
              ? QueriedInfiniteData<TServerLoaderOutput>
              : TMode extends 'client'
                ? QueriedInfiniteData<TClientLoaderOutput>
                : TMode extends 'serverAndClient'
                  ? QueriedInfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
                  : never)
          | undefined
  > {
    const [input = {}, providedInfiniteQueryOptions, options = {}] = args
    const {
      // location,
      queryClient: providedQueryClient,
      fetchOptions,
      outputType,
      force,
      cacheOnly = false,
      mode = 'serverAndClient',
    } = options
    const preparedFetch = this._prepareFetchInfiniteQuery({
      input,
      mode,
      queryClient: providedQueryClient,
      infiniteQueryOptions: providedInfiniteQueryOptions,
      fetchOptions,
      outputType,
      // location,
    })
    if (!preparedFetch) {
      return undefined as never
    }
    const { cacheData, infiniteQueryOptions, queryClient } = preparedFetch
    if (cacheData && !force) {
      return cacheData as never
    }
    if (cacheOnly) {
      return undefined as never
    }
    return (await queryClient.fetchInfiniteQuery(infiniteQueryOptions as never)) as never
  }

  async prefetchInfiniteQuery(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                FinalInputRaw<
                  TPointType,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchServerOutputType
          },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                FinalInputRaw<
                  TPointType,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchServerOutputType
          },
        ]
  ): Promise<void> {
    const [input = {}, providedInfiniteQueryOptions, options = {}] = args
    const {
      // location,
      queryClient: providedQueryClient,
      fetchOptions,
      outputType,
      force,
      mode = 'serverAndClient',
    } = options
    const preparedFetch = this._prepareFetchInfiniteQuery({
      input,
      mode,
      queryClient: providedQueryClient,
      infiniteQueryOptions: providedInfiniteQueryOptions,
      fetchOptions,
      outputType,
      // location,
    })
    if (!preparedFetch) {
      return
    }
    const { cacheData, infiniteQueryOptions, queryClient } = preparedFetch
    if (cacheData && !force) {
      return
    }
    // await Promise.all([
    //   this._callPrefetchFns({ preventPrefetchFns }),
    //   queryClient.prefetchInfiniteQuery(infiniteQueryOptions as never),
    // ])
    await queryClient.prefetchInfiniteQuery(infiniteQueryOptions as never)
  }

  private async _prefetchPageQueryClientDehydratedState({
    input = {} as never,
    queryClient,
    queryOptions,
    fetchOptions,
    force,
  }: {
    input: InputRaw
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions
    fetchOptions?: FetchOptions
    force?: boolean
  }): Promise<void> {
    if (this.type !== 'page') {
      throw new Error(`Point type is not page on point ${this.toStringWithLocation()}`)
    }
    queryClient ??= _ss.__POINT0_QUERY_CLIENT__.get()
    const _queryOptions = this._getServerQueryOptions({
      input,
      queryOptions,
      fetchOptions,
      outputType: 'queryClientDehydratedState',
    })
    const queryKey = _queryOptions.queryKey
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryKey as never })
    const cachedData = query?.state.data as { dehydratedState: DehydratedState } | undefined
    if (cachedData?.dehydratedState && !force) {
      return
    }
    const data = (await queryClient.fetchQuery(_queryOptions as never)) as any
    if (!data?.dehydratedState) {
      throw new Error(`Dehydrated state not found on point ${this.toStringWithLocation()}`)
    }
    const freshDehydratedState = forceFreshDehydratedState(data.dehydratedState)
    hydrate(queryClient, freshDehydratedState)
  }

  private async _prefetchPage({
    input,
    options,
  }: {
    input: InputRaw
    options: {
      // location?: AnyLocation
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      force?: boolean
      policy?: PrefetchPagePolicy
      trigger?: 'navigate' | 'linkHover'
    }
  }): Promise<void> {
    // later may be we will have prefetchComponent and prefetchWrapper, so there will be props
    const outerProps = {} as Props
    const eventData = {
      point: this as never as AnyPoint,
      input,
      options,
      error: undefined,
    }
    // const { location: providedLocation, queryClient, fetchOptions, force, trigger } = options
    const { queryClient, fetchOptions, force, trigger } = options
    const policy = this._getPrefetchPagePolicy(trigger, options.policy)
    if (policy === 'none') {
      return
    }
    this._emit('pointPrefetchPageStart', eventData)

    if (!this.route) {
      const error = new this._Error('Route is not set')
      this._emit('pointPrefetchPageSettled', { ...eventData, error })
      this._emit('pointPrefetchPageError', { ...eventData, error })
      throw error
    }
    // const location = providedLocation ?? this.route.getLocation(this.route.get(input))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { '?': _search, ...paramsRaw } = input as Record<string, unknown>
    const paramsWithStrings = flat0.parse(flat0.stringify(paramsRaw))
    // const location =
    //   providedLocation ??
    //   Object.assign(Route0.getLocation(this.route.get(input)), {
    //     route: this.route.definition,
    //     params,
    //   })
    const location = Object.assign(
      Route0.getLocation(this.route.get(input, typeof window !== 'undefined' ? window.location.origin : undefined)),
      {
        route: this.route.definition,
        params: paramsWithStrings,
      },
    )

    const queryClientDehydratedStateWasPrefetched = await (async () => {
      if (policy === 'ssrDehydratedState' || policy === 'ssrDehydratedStateAndClientQuery') {
        if (!this._root?._getSsr()) {
          throw new Error(
            `Query client dehydrated state can be prefetched only when ssr is enabled on point ${this.toStringWithLocation()}`,
          )
        }
        await this._prefetchPageQueryClientDehydratedState({
          queryClient,
          input,
          fetchOptions,
          force,
        })
        return true
      }
      return false
    })()

    if (policy === 'ssrDehydratedState') {
      this._emit('pointPrefetchPageSuccess', eventData)
      this._emit('pointPrefetchPageSettled', eventData)
      return
    }

    const allRelatedPoints = [this as never as ReadyPoint, ...this._layouts]
    const uniqRelatedPoints = [...new Set<AnyPoint>(allRelatedPoints)]
    const uniqPrefetchFns = [
      ...new Set<OnPrefetchMountableFn>([...uniqRelatedPoints.flatMap((p) => p._onPrefetchMountableFns)]),
    ]
    const allRelatedQueries = allRelatedPoints.flatMap((p) => p._mountActions.filter((a) => a.type === 'relatedQuery'))

    const onPrefetchFnsPromise = Promise.all(
      uniqPrefetchFns.map(async (fn) => {
        return await fn({ location, props: outerProps })
      }),
    )

    const relatedQueriesPrefetching = Promise.all(
      allRelatedQueries.flatMap(async (relatedQuery) => {
        const p = relatedQuery.point
        if (policy === 'onPrefetchOnly') {
          return []
        }
        if (
          policy === 'ssrDehydratedStateAndClientQuery' &&
          !p._hasClientLoader() &&
          queryClientDehydratedStateWasPrefetched
        ) {
          return []
        }
        if (policy === 'clientQuery' && !p._hasClientLoader()) {
          return []
        }
        const mode =
          policy === 'ssrDehydratedStateAndClientQuery'
            ? // server queries was prefetched on prefetchPageQueryClientDehydratedState step
              queryClientDehydratedStateWasPrefetched
              ? 'client'
              : 'serverAndClient'
            : {
                serverQuery: 'server' as const,
                clientQuery: 'client' as const,
                serverAndClientQuery: 'serverAndClient' as const,
              }[policy]
        if (p._queryResultType === 'infiniteQuery') {
          return await p.prefetchInfiniteQuery(
            relatedQuery.inputGetter({ location, props: {} as never }),
            relatedQuery.queryOptions as never,
            {
              queryClient,
              // location,
              fetchOptions,
              force,
              mode,
            },
          )
        } else {
          return await p.prefetchQuery(
            relatedQuery.inputGetter({ location, props: outerProps }),
            relatedQuery.queryOptions as never,
            {
              queryClient,
              // location,
              fetchOptions,
              force,
              mode,
            },
          )
        }
      }),
    )

    const queriesPrefetching = Promise.all(
      uniqRelatedPoints.flatMap(async (p) => {
        if (policy === 'onPrefetchOnly') {
          return []
        }
        if (
          policy === 'ssrDehydratedStateAndClientQuery' &&
          !p._hasClientLoader() &&
          queryClientDehydratedStateWasPrefetched
        ) {
          return []
        }
        if (policy === 'clientQuery' && !p._hasClientLoader()) {
          return []
        }
        // for self we get input, all others is layouts so we calculate its input by page
        const inputHere = p === (this as never as ReadyPoint) ? input : p._getUnsafeInputRawByLocation(location)
        const mode =
          policy === 'ssrDehydratedStateAndClientQuery'
            ? // server queries was prefetched on prefetchPageQueryClientDehydratedState step
              queryClientDehydratedStateWasPrefetched
              ? 'client'
              : 'serverAndClient'
            : {
                serverQuery: 'server' as const,
                clientQuery: 'client' as const,
                serverAndClientQuery: 'serverAndClient' as const,
              }[policy]
        if (p._queryResultType === 'infiniteQuery') {
          return await p.prefetchInfiniteQuery(inputHere as never, undefined, {
            queryClient,
            // location,
            fetchOptions,
            force,
            mode,
          })
        } else {
          return await p.prefetchQuery(inputHere as never, undefined, {
            queryClient,
            // location,
            fetchOptions,
            force,
            mode,
          })
        }
      }),
    )

    try {
      await Promise.all([queriesPrefetching, relatedQueriesPrefetching, onPrefetchFnsPromise])
      this._emit('pointPrefetchPageSettled', eventData)
      this._emit('pointPrefetchPageSuccess', eventData)
    } catch (error) {
      const error0 = this._Error.from(error)
      this._emit('pointPrefetchPageSettled', { ...eventData, error: error0 })
      this._emit('pointPrefetchPageError', { ...eventData, error: error0 })
      throw error0
    }
  }

  async prefetchPage(
    ...args: IsFinalInputOptional<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    > extends true
      ? [
          input?: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            policy?: PrefetchPagePolicy
            trigger?: 'navigate' | 'linkHover'
          },
        ]
      : [
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          options?: {
            // location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            policy?: PrefetchPagePolicy
            trigger?: 'navigate' | 'linkHover'
          },
        ]
  ): Promise<void> {
    const prefetchPagePromises = _ss.__POINT0_PREFETCH_PAGE_PROMISES__.get()
    const [input = {}, options = {}] = args
    const policy = this._getPrefetchPagePolicy(options.trigger, options.policy)
    const hash =
      stringify({ input, id: this.toString(), policy }) ||
      JSON.stringify({ input: 'invalid', id: this.toString(), policy })
    const exPromise = prefetchPagePromises.get(hash)
    if (exPromise) {
      await exPromise
      return
    }
    const newPromise = this._prefetchPage({
      input,
      options,
    })
    prefetchPagePromises.set(hash, newPromise)
    try {
      await newPromise
      prefetchPagePromises.delete(hash)
    } catch (error) {
      prefetchPagePromises.delete(hash)
      throw error
    }
  }

  // mountable components

  private static readonly _usePrevHeadsAndSetPageState = ({
    pageState,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    pageStateManager,
    prevMountActions,
    skipGlobalHead,
  }: {
    pageState: NavigationPageState
    pageStateManager:
      | {
          pageState: NavigationPageState
          setPageState: React.Dispatch<React.SetStateAction<NavigationPageState>>
        }
      | undefined
    prevMountActions: Array<{
      action: MountAction
      state: MountableState<any, any, any, any, any, any, any, any, ErrorPoint0>
    }>
    skipGlobalHead: boolean
  }) => {
    React.useEffect(() => {
      // pageStateManager.setPageState(pageState)
    }, [pageState.status, pageState.error?.message])
    // const unheadController = _ss.__POINT0_UNHEAD_CONTROLLER__.get()
    // const unheadController = useHead()
    // const headFnResultResolvableCombined = {}
    for (const { action, state } of prevMountActions) {
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (action.type) {
        case 'head': {
          const headFnResult = action.fn(state)
          const headFnResultResolvable = typeof headFnResult === 'string' ? { title: headFnResult } : headFnResult
          // console.log('HEAD', headFnResultResolvable)
          useHead(headFnResultResolvable)
          // unheadController.patch(headFnResultResolvable)
          // Object.assign(headFnResultResolvableCombined, headFnResultResolvable)
          continue
        }
        case 'globalHead': {
          const location = (state as any).location as AnyLocation | undefined
          if (!location) {
            throw new Error(
              'Location not defined for global head. It is critical error, please report it to developers.',
            )
          }
          const headFnResult = action.fn({ ...pageState, location })
          const headFnResultResolvable = typeof headFnResult === 'string' ? { title: headFnResult } : headFnResult
          // console.log('GLOBAL HEAD', headFnResultResolvable)
          useHead(skipGlobalHead ? {} : headFnResultResolvable)
          // unheadController.patch(headFnResultResolvable)
          // Object.assign(headFnResultResolvableCombined, headFnResultResolvable)
          continue
        }
      }
    }
    // console.log('USE HEAD', headFnResultResolvableCombined)
    // useHead(headFnResultResolvableCombined as ResolvableHead)
    // unheadController.patch(headFnResultResolvableCombined)
  }

  private static readonly _createBoundLoadingComponent = ({
    componentVariant,
    pageStateManager,
    prevMountActions,
    isHeadable,
    fallbackLoadingComponent,
  }: {
    componentVariant: DestinationComponentVariant
    pageStateManager:
      | {
          pageState: NavigationPageState
          setPageState: React.Dispatch<React.SetStateAction<NavigationPageState>>
        }
      | undefined
    prevMountActions: Array<{
      action: MountAction
      state: MountableState<any, any, any, any, any, any, any, any, ErrorPoint0>
    }>
    isHeadable: boolean
    fallbackLoadingComponent: LoadingComponentType<any>
  }): React.ComponentType<{ _isHeadable?: boolean }> => {
    const loadingComponent =
      prevMountActions.flatMap(({ action }) => (action.type === 'loadingComponent' ? [action.Component] : [])).at(-1) ??
      fallbackLoadingComponent
    return ({ _isHeadable = isHeadable }: { _isHeadable?: boolean }) => {
      if (_isHeadable) {
        Point0._usePrevHeadsAndSetPageState({
          pageState: {
            status: 'loading',
            error: undefined,
            loading: true,
            initial: false,
          },
          pageStateManager,
          prevMountActions,
          skipGlobalHead: false,
        })
      }
      return React.createElement(loadingComponent, {
        type: componentVariant,
      })
    }
  }

  private static readonly _createBoundErrorComponent = ({
    componentVariant,
    pageStateManager,
    prevMountActions,
    isHeadable,
    fallbackErrorComponent,
    ErrorClass,
  }: {
    componentVariant: DestinationComponentVariant
    pageStateManager:
      | {
          pageState: NavigationPageState
          setPageState: React.Dispatch<React.SetStateAction<NavigationPageState>>
        }
      | undefined
    prevMountActions: Array<{
      action: MountAction
      state: MountableState<any, any, any, any, any, any, any, any, ErrorPoint0>
    }>
    isHeadable: boolean
    fallbackErrorComponent: ErrorComponentType<any, any>
    ErrorClass: ClassLikeError0<ErrorPoint0>
  }): React.ComponentType<{ error: Error; _isHeadable?: boolean }> => {
    const errorComponent =
      prevMountActions.flatMap(({ action }) => (action.type === 'errorComponent' ? [action.Component] : [])).at(-1) ??
      fallbackErrorComponent
    return ({ error, _isHeadable = isHeadable }: { error: Error; _isHeadable?: boolean }) => {
      const error0 = ErrorClass.from(error)
      if (error0.status) {
        setStatus(error0.status)
      }
      if (_isHeadable) {
        Point0._usePrevHeadsAndSetPageState({
          pageState: {
            status: 'error',
            error: error0,
            loading: false,
            initial: false,
          },
          pageStateManager,
          prevMountActions,
          skipGlobalHead: false,
        })
      }
      return React.createElement(errorComponent, {
        type: componentVariant,
        error: error0,
      })
    }
  }

  readonly _rawInputToRoutedRawInputForQueryKey = <TInputRaw extends InputRaw>({
    inputRaw,
  }: {
    inputRaw: TInputRaw
  }): TInputRaw => {
    if (this.type === 'page' || this.type === 'layout') {
      const { '?': searchRaw = {}, ...paramsRaw } = flat0.parse(flat0.stringify(inputRaw)) as {
        '?': Record<string, unknown> | undefined
        [key: string]: unknown
      }
      const searchRawFiltered: Record<string, unknown> = {}
      if (this._searchSchemaKeys === true) {
        Object.assign(searchRawFiltered, searchRaw)
      } else if (this._searchSchemaKeys) {
        this._searchSchemaKeys.forEach((key) => {
          if (key in searchRaw) {
            searchRawFiltered[key] = searchRaw[key]
          }
        })
      }
      const searchRawKeysCount = Object.keys(searchRawFiltered).length
      if (searchRawKeysCount === 0) {
        return paramsRaw as TInputRaw
      }
      return {
        ...paramsRaw,
        '?': searchRawFiltered,
      } as never as TInputRaw
    }
    if (this.type === 'action') {
      const {
        params: paramsRaw = {},
        search: searchRaw = {},
        body,
      } = inputRaw as {
        params: InputRaw
        search: InputRaw
        body: InputRaw | undefined
      }
      const paramsWithStrings = flat0.parse(flat0.stringify(paramsRaw))
      const searchWithStrings = flat0.parse(flat0.stringify(searchRaw))
      const paramsKeysCount = Object.keys(paramsWithStrings).length
      const searchKeysCount = Object.keys(searchWithStrings).length
      return {
        ...(paramsKeysCount > 0 ? { params: paramsWithStrings } : {}),
        ...(searchKeysCount > 0 ? { search: searchWithStrings } : {}),
        ...(body ? { body } : {}),
      } as never as TInputRaw
    }
    return inputRaw
  }

  private readonly _Mountable = (props: {
    mountComponent:
      | LayoutSuccessComponentType<any, any, any, any, any, any, any>
      | PageSuccessComponentType<any, any, any, any, any, any, any>
      | ComponentSuccessComponentType<any, any, any, any, any, any>
      | 'children'
    extraProps: (
      mountableState: MountableState<any, any, any, any, any, any, any, any, ErrorPoint0>,
    ) => Record<string, any>
    location?: AnyLocation
    pageStateManager?: {
      pageState: NavigationPageState
      setPageState: React.Dispatch<React.SetStateAction<NavigationPageState>>
    }
    layers: Array<{
      inputRaw: InputRaw
      outerProps: TOuterProps
      queryIndex?: number
      prev?: {
        prevMountActions: Array<{
          action: MountAction
          state: MountableState<any, any, any, any, any, any, any, any, ErrorPoint0>
        }>
        nextMountActions: MountAction[]
        innerProps: Props
        searchParsed: Data | UndefinedData
        paramsParsed: Data | UndefinedData
        inputParsed: Data | UndefinedData
        queries: QueriesResults
        mappedData: Data | undefined
        LoadingComponent: React.ComponentType<{ _isHeadable?: boolean }>
        ErrorComponent: React.ComponentType<{ error: Error; _isHeadable?: boolean }>
      }
    }>
  }): Exclude<React.ReactNode, Promise<any>> => {
    // pageStateManager = _usePageStateManager() (maye be will use it later)
    const { mountComponent, extraProps, location, pageStateManager, layers } = props
    const [currentLayer, ...siblingLayers] = layers

    const componentVariant = this._getDestinationComponentVariant() ?? 'page'
    const isLayout = this.type === 'layout'
    const isPage = this.type === 'page'
    const isHeadable = isPage || isLayout
    const fallbackLoadingComponent =
      this._loadingComponent ??
      {
        page: this._pageLoadingComponent,
        component: this._componentLoadingComponent,
        layout: this._layoutLoadingComponent,
      }[componentVariant] ??
      this.DefaultLoadingComponent
    const fallbackErrorComponent =
      this._errorComponent ??
      {
        page: this._pageErrorComponent,
        component: this._componentErrorComponent,
        layout: this._layoutErrorComponent,
      }[componentVariant] ??
      this.DefaultErrorComponent

    const {
      nextMountActions,
      prevMountActions,
      PrevLoadingComponent,
      PrevErrorComponent,
      prevInnerProps,
      prevSearchParsed,
      prevParamsParsed,
      prevInputParsed,
      prevQueries,
      prevMappedData,
    } = (() => {
      const prev = currentLayer.prev
      if (!prev) {
        return {
          nextMountActions: this._mountActions,
          prevMountActions: [] as Array<{
            action: MountAction
            state: MountableState<any, any, any, any, any, any, any, any, ErrorPoint0>
          }>,
          PrevLoadingComponent: undefined,
          PrevErrorComponent: undefined,
          prevInnerProps: {},
          prevSearchParsed: undefined,
          prevParamsParsed: undefined,
          prevInputParsed: undefined,
          prevQueries: [],
          prevMappedData: undefined,
        }
      } else {
        return {
          nextMountActions: prev.nextMountActions,
          prevMountActions: [...prev.prevMountActions],
          PrevLoadingComponent: prev.LoadingComponent,
          PrevErrorComponent: prev.ErrorComponent,
          prevInnerProps: prev.innerProps,
          prevSearchParsed: prev.searchParsed,
          prevParamsParsed: prev.paramsParsed,
          prevInputParsed: prev.inputParsed,
          prevQueries: prev.queries,
          prevMappedData: prev.mappedData,
        }
      }
    })()

    const queriesState = (() => {
      if (prevQueries.length === 0) {
        return {
          status: 'success',
          error: undefined,
          loading: false,
          data: prevMappedData ?? {},
        }
      }
      const error = prevQueries.find((query) => query.error)?.error
      if (error) {
        return {
          status: 'error',
          error: this._Error.from(error),
          loading: false,
          data: undefined,
        }
      }

      const loading = prevQueries.some((query) => query.status === 'pending')
      if (loading) {
        return {
          status: 'loading',
          error: undefined,
          loading: true,
          data: undefined,
        }
      }
      return {
        status: 'success',
        error: undefined,
        loading: false,
        data: prevMappedData ?? prevQueries.at(0)?.data ?? {},
      }
    })() as Pick<
      MountableState<any, any, any, any, any, any, any, any, ErrorPoint0>,
      'status' | 'error' | 'loading' | 'data'
    >

    const mountState = {
      ...queriesState,
      location,
      props: prevInnerProps,
      search: prevSearchParsed,
      params: prevParamsParsed,
      queries: prevQueries,
      input: prevInputParsed,
    } as MountableState<any, any, any, any, any, any, any, any, ErrorPoint0>
    let nextMappedData = prevMappedData
    let ErrorComponent =
      PrevErrorComponent ??
      React.useCallback(
        Point0._createBoundErrorComponent({
          componentVariant,
          pageStateManager,
          prevMountActions,
          isHeadable,
          fallbackErrorComponent,
          ErrorClass: this._Error,
        }),
        [],
      )
    let LoadingComponent =
      PrevLoadingComponent ??
      React.useCallback(
        Point0._createBoundLoadingComponent({
          componentVariant,
          pageStateManager,
          prevMountActions,
          isHeadable,
          fallbackLoadingComponent,
        }),
        [],
      )

    const createBoundErrorComponent = () =>
      React.useCallback(
        Point0._createBoundErrorComponent({
          componentVariant,
          pageStateManager,
          prevMountActions,
          isHeadable,
          fallbackErrorComponent,
          ErrorClass: this._Error,
        }),
        [],
      )

    const createBoundLoadingComponent = () =>
      React.useCallback(
        Point0._createBoundLoadingComponent({
          componentVariant,
          pageStateManager,
          prevMountActions,
          isHeadable,
          fallbackLoadingComponent,
        }),
        [],
      )

    const currentMountActions = [...nextMountActions]

    const getNextProps = () => {
      const _nextPrev = {
        LoadingComponent,
        ErrorComponent,
        nextMountActions: [...currentMountActions],
        prevMountActions: [...prevMountActions],
        innerProps: mountState.props,
        searchParsed: (mountState as Record<string, Data | UndefinedData>).search,
        paramsParsed: (mountState as Record<string, Data | UndefinedData>).params,
        inputParsed: (mountState as Record<string, Data | UndefinedData>).input,
        queries: mountState.queries,
        mappedData: nextMappedData,
      }
      const _nextLayers: Array<{
        inputRaw: InputRaw
        outerProps: TOuterProps
        queryIndex?: number
        prev?: {
          prevMountActions: Array<{
            action: MountAction
            state: MountableState<any, any, any, any, any, any, any, any, ErrorPoint0>
          }>
          nextMountActions: MountAction[]
          innerProps: Props
          searchParsed: Data | UndefinedData
          paramsParsed: Data | UndefinedData
          inputParsed: Data | UndefinedData
          queries: QueriesResults
          mappedData: Data | undefined
          LoadingComponent: React.ComponentType<{ _isHeadable?: boolean }>
          ErrorComponent: React.ComponentType<{ error: Error; _isHeadable?: boolean }>
        }
      }> = [
        {
          ...currentLayer,
          prev: _nextPrev,
        },
        ...siblingLayers,
      ]
      const _nextMountableProps = {
        mountComponent,
        extraProps,
        location,
        pageStateManager,
        layers: _nextLayers,
      } satisfies Parameters<typeof this._Mountable>[0]
      return {
        _nextPrev,
        _nextLayers,
        _nextMountableProps,
      }
    }

    for (const action of nextMountActions) {
      const actionState = { action, state: mountState }
      prevMountActions.push(actionState)
      currentMountActions.shift()
      siblingLayers.forEach((layer) => {
        if (!layer.prev) {
          return
        }
        layer.prev.prevMountActions.push(actionState)
        layer.prev.nextMountActions.shift()
      })

      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (action.type) {
        case 'pluginStart': {
          const { _nextPrev, _nextLayers, _nextMountableProps } = getNextProps()
          return this._Mountable({
            ..._nextMountableProps,
            layers: [
              {
                inputRaw: {} as never,
                outerProps: {} as never,
                queryIndex: 0,
                prev: {
                  ..._nextPrev,
                  prevMountActions: [..._nextPrev.prevMountActions],
                  nextMountActions: [..._nextPrev.nextMountActions],
                  innerProps: {},
                  queries: [],
                  mappedData: undefined,
                },
              },
              ..._nextLayers,
            ],
          })
        }
        case 'pluginEnd': {
          const { _nextLayers, _nextMountableProps } = getNextProps()
          return this._Mountable({
            ..._nextMountableProps,
            layers: _nextLayers.slice(1),
          })
        }
        case 'errorComponent': {
          ErrorComponent = createBoundErrorComponent()
          continue
        }
        case 'loadingComponent': {
          LoadingComponent = createBoundLoadingComponent()
          continue
        }
        case 'selfProps': {
          mountState.props = { ...mountState.props, ...currentLayer.outerProps }
          continue
        }
        case 'head':
        case 'globalHead': {
          if (isHeadable) {
            ErrorComponent = createBoundErrorComponent()
            LoadingComponent = createBoundLoadingComponent()
          }
          continue
        }
        case 'mapper': {
          if (mountState.status === 'success') {
            nextMappedData = action.fn({
              location: (mountState as any).location as AnyLocation | undefined,
              props: mountState.props,
              queries: mountState.queries,
              data: nextMappedData ?? mountState.data ?? {},
            })
            mountState.data = nextMappedData
          }
          continue
        }
      }

      // below causes wrapping

      const { _nextLayers, _nextMountableProps } = getNextProps()

      switch (action.type) {
        case 'clientOnly': {
          return React.createElement(ClientOnly, {
            children: React.createElement(this._Mountable, _nextMountableProps),
            fallback: action.Fallback
              ? React.createElement(action.Fallback, {
                  ...mountState,
                  LoadingComponent,
                  ErrorComponent,
                })
              : undefined,
          })
        }
        case 'input': {
          if (this.type !== 'component' && this.type !== 'provider') {
            return React.createElement(ErrorComponent, {
              error: new this._Error(
                `Usual input schema are not allowed for this point: ${this.toStringWithLocation()}`,
              ),
            })
          }
          const result = this.parseInputSafeSync(action.schema, currentLayer.inputRaw)
          if (!result.success) {
            return React.createElement(ErrorComponent, {
              error: result.error,
            })
          } else {
            return React.createElement(this._Mountable, {
              ..._nextMountableProps,
              layers: _nextLayers.map((layer) => ({
                ...layer,
                prev: layer.prev
                  ? {
                      ...layer.prev,
                      inputParsed: { ...layer.prev.inputParsed, ...result.data },
                    }
                  : undefined,
              })),
            })
          }
        }
        case 'params': {
          if (this.type !== 'layout' && this.type !== 'page') {
            return React.createElement(ErrorComponent, {
              error: new this._Error(
                `Params input schema are not allowed for this point: ${this.toStringWithLocation()}`,
              ),
            })
          }

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { '?': search, ...params } = currentLayer.inputRaw as {
            '?': InputRaw | undefined
            [key: string]: unknown
          }
          const result = this.parseInputSafeSync(action.schema, params)
          if (!result.success) {
            return React.createElement(ErrorComponent, {
              error: result.error,
            })
          } else {
            return React.createElement(this._Mountable, {
              ..._nextMountableProps,
              layers: _nextLayers.map((layer) => ({
                ...layer,
                prev: layer.prev
                  ? {
                      ...layer.prev,
                      paramsParsed: { ...layer.prev.paramsParsed, ...result.data },
                    }
                  : undefined,
              })),
            })
          }
        }
        case 'search': {
          if (this.type !== 'layout' && this.type !== 'page') {
            return React.createElement(ErrorComponent, {
              error: new this._Error(
                `Search input schema are not allowed for this point: ${this.toStringWithLocation()}`,
              ),
            })
          }
          const result = this.parseInputSafeSync(action.schema, (currentLayer.inputRaw as any)['?'] || {})
          if (!result.success) {
            return React.createElement(ErrorComponent, {
              error: result.error,
            })
          } else {
            return React.createElement(this._Mountable, {
              ..._nextMountableProps,
              layers: _nextLayers.map((layer) => ({
                ...layer,
                prev: layer.prev
                  ? {
                      ...layer.prev,
                      searchParsed: { ...layer.prev.searchParsed, ...result.data },
                    }
                  : undefined,
              })),
            })
          }
        }
        case 'wrapper': {
          return React.createElement(action.Component, {
            ...mountState,
            children: React.createElement(this._Mountable, _nextMountableProps),
            LoadingComponent,
            ErrorComponent,
          })
        }
        case 'with': {
          const result = action.fn(mountState)
          const isQueryResult = (result: any): result is UseQueryOrInfiniteQueryResult => {
            return (
              typeof result === 'object' &&
              'refetch' in result &&
              typeof result.refetch === 'function' &&
              'promise' in result &&
              'errorUpdatedAt' in result
            )
          }
          const isQueryResultArray = (result: any): result is QueriesResults => {
            return Array.isArray(result) && result.every(isQueryResult)
          }

          // with query fn
          if (isQueryResult(result) || isQueryResultArray(result)) {
            const queries = Array.isArray(result) ? result : [result]
            return React.createElement(this._Mountable, {
              ..._nextMountableProps,
              layers: _nextLayers.map((layer) => ({
                ...layer,
                queryIndex: (layer.queryIndex ?? 0) + queries.length,
                prev: layer.prev
                  ? {
                      ...layer.prev,
                      queries: [...layer.prev.queries, ...queries],
                    }
                  : undefined,
              })),
            })
          }

          // with fn
          if (result === 'loading') {
            return React.createElement(LoadingComponent)
          } else if (result instanceof Error) {
            return React.createElement(ErrorComponent, {
              error: result,
            })
          } else {
            return React.createElement(this._Mountable, {
              ..._nextMountableProps,
              layers: _nextLayers.map((layer) => ({
                ...layer,
                prev: layer.prev
                  ? {
                      ...layer.prev,
                      innerProps: { ...layer.prev.innerProps, ...(result || {}) },
                    }
                  : undefined,
              })),
            })
          }
        }
        case 'relatedQuery': {
          const query = (() => {
            const location = (mountState as any).location as AnyLocation | undefined
            if (!location) {
              throw new Error(
                'Location not defined for related query. It is critical error, please report it to developers.',
              )
            }
            if (action.point._queryResultType === 'infiniteQuery') {
              return action.point.useInfiniteQuery(
                action.inputGetter({ location, props: currentLayer.outerProps }),
                action.queryOptions as never,
              )
            } else {
              return action.point.useQuery(
                action.inputGetter({ location, props: currentLayer.outerProps }),
                action.queryOptions as never,
              )
            }
          })()
          return React.createElement(this._Mountable, {
            ..._nextMountableProps,
            layers: _nextLayers.map((layer) => ({
              ...layer,
              queryIndex: (layer.queryIndex ?? 0) + 1,
              prev: layer.prev
                ? {
                    ...layer.prev,
                    queries: [...layer.prev.queries, query],
                  }
                : undefined,
            })),
          })
        }
        case 'selfQuery': {
          const queryResult =
            this._queryResultType === 'infiniteQuery'
              ? this.useInfiniteQuery(currentLayer.inputRaw as never)
              : this.useQuery(currentLayer.inputRaw as never)
          const queries = [queryResult]
          return React.createElement(this._Mountable, {
            ..._nextMountableProps,
            layers: _nextLayers.map((layer) => ({
              ...layer,
              queryIndex: (layer.queryIndex ?? 0) + 1,
              prev: layer.prev
                ? {
                    ...layer.prev,
                    queries: [...layer.prev.queries, ...queries],
                  }
                : undefined,
            })),
          })
        }
      }

      // @ts-expect-error -- we know that this is not possible, but to not forget add case for new action type
      throw new Error(`Unknown mount action type: ${action.type} on point ${this.toStringWithLocation()}`)
    }

    // so we come to the end and can return mount component

    if (isHeadable) {
      const pageState = {
        status: mountState.status,
        error: mountState.error,
        loading: mountState.loading,
      } as NavigationPageState
      Point0._usePrevHeadsAndSetPageState({
        pageState,
        pageStateManager,
        prevMountActions,
        skipGlobalHead: mountState.status === 'success' && isLayout, // we will have page below, and it will use global heads
      })
    }

    if (mountState.status === 'error') {
      return React.createElement(ErrorComponent, {
        error: mountState.error,
        _isHeadable: false, // becouse we use heads in prev block
      })
    }

    if (mountState.status === 'loading') {
      return React.createElement(LoadingComponent, {
        _isHeadable: false,
      })
    }

    if (mountComponent === 'children') {
      return extraProps(mountState).children
    } else {
      return React.createElement(mountComponent as never, {
        ...mountState,
        ...extraProps(mountState),
      })
    }
  }

  Page = (
    props: PageSelfProps<
      TRouteDefinition,
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>() as ExactLocation<
      CurrentRouteDefinition<TRouteDefinition>
    >

    const { inputRaw, restProps } = React.useMemo<{
      inputRaw: InputRaw
      restProps: TOuterProps
    }>(() => {
      const { input: providedInput, ...restProps } = props as any
      const inputRaw = providedInput ?? { ...this._getUnsafeInputRawByLocation(location) }
      return { inputRaw, restProps }
    }, [props, location])

    const { prevLocation, status } = useNavigationTransitionState()
    React.useEffect(() => {
      if (status !== 'idle') {
        return
      }
      const scrollPositionRestorePolicy = this._getScrollPositionRestorePolicy()({ prevLocation })
      const prevPageScrollPosition = Point0._prevPageScrollPositions.find(
        (p) =>
          p.name === this.name &&
          this._getTransformer().stringify(p.input) === this._getTransformer().stringify(inputRaw),
      )
      if (scrollPositionRestorePolicy !== false) {
        if (scrollPositionRestorePolicy === null) {
          this._getScrollPositionSetter()({ x: 0, y: 0 })
        }
        if (scrollPositionRestorePolicy === true) {
          if (!prevPageScrollPosition) {
            this._getScrollPositionSetter()({ x: 0, y: 0 })
          } else {
            this._getScrollPositionSetter()({ x: prevPageScrollPosition.x, y: prevPageScrollPosition.y })
          }
        }
      }
      return () => {
        const currentPageScrollPosition = this._getScrollPositionGetter()()
        if (prevPageScrollPosition) {
          prevPageScrollPosition.x = currentPageScrollPosition?.x ?? 0
          prevPageScrollPosition.y = currentPageScrollPosition?.y ?? 0
        } else {
          Point0._prevPageScrollPositions.push({
            name: this.name,
            input: inputRaw,
            x: currentPageScrollPosition?.x ?? 0,
            y: currentPageScrollPosition?.y ?? 0,
          })
        }
      }
    }, [this.name, inputRaw, prevLocation, status])

    return this._Mountable({
      location,
      layers: [
        {
          inputRaw,
          outerProps: restProps,
        },
      ],
      extraProps: () => {
        return { location }
      },
      mountComponent: this._page as never,
    })
  }

  Component = (
    props: ComponentSelfProps<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const { inputRaw, restProps } = React.useMemo<{
      inputRaw: InputRaw
      restProps: TOuterProps
    }>(() => {
      const { input: providedInput = {}, ...restProps } = props as any
      const inputRaw = { ...providedInput }
      return { inputRaw, restProps }
    }, [props])

    return this._Mountable({
      layers: [
        {
          inputRaw,
          outerProps: restProps,
        },
      ],
      extraProps: () => {
        return {}
      },
      mountComponent: this._component as never,
    })
  }

  Layout = (
    props: LayoutSelfProps<
      TRouteDefinition,
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const location = useLocation() as WeakAncestorLocation<CurrentRouteDefinition<TRouteDefinition>>

    const { inputRaw, children, restProps } = React.useMemo<{
      inputRaw: InputRaw
      children: React.ReactNode
      restProps: TOuterProps
    }>(() => {
      const { input: providedInput, children, ...restProps } = props as any
      const inputRaw = providedInput ?? { ...this._getUnsafeInputRawByLocation(location) }
      return { inputRaw, children, restProps }
    }, [props, location])

    return this._Mountable({
      location,
      layers: [
        {
          inputRaw,
          outerProps: restProps,
        },
      ],
      extraProps: (mountableState: MountableState<any, any, any, any, any, any, any, any, ErrorPoint0>) => {
        if (!this._ProviderReactContext) {
          throw new Error(`ProviderReactContext not found on point ${this.toStringWithLocation()}`)
        }
        if (mountableState.data) {
          superstore.setValue(this.getSsProviderValueKey(inputRaw), mountableState.data, 'clientServerIsolated')
          superstore.setValue(this.getSsProviderValueKey(), mountableState.data, 'clientServerIsolated')
        }
        return {
          children: React.createElement(this._ProviderReactContext.Provider, {
            value: mountableState.data,
            children,
          }),
        }
      },
      mountComponent: this._layout as never,
    })
  }

  // provider
  private getSsProviderValueKey(input?: InputRaw | undefined): string {
    const start = `__POINT0_PROVIDER_VALUE_${this.scope}_${this.type}_${this.name}`
    if (!input) {
      return start
    }
    return `${start}_${this._getTransformer().stringify(input)}`
  }

  getValue(
    // ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
    //   ? [input?: InputsRaw<TServerInputSchema, TClientInputSchema>]
    //   : [input: InputsRaw<TServerInputSchema, TClientInputSchema>]
    input?: FinalInputRawOrUndefined<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
  ): MountableSuccessData<TQueriesDefinitions, TMapperOutput> {
    const value = superstore.getValue<MountableSuccessData<TQueriesDefinitions, TMapperOutput>>(
      this.getSsProviderValueKey(input),
      'clientServerIsolated',
    )
    if (!value) {
      throw new Error(
        `Provider value not found. You should call getValue only after Provider component is mounted and loaded. On point ${this.toStringWithLocation()}`,
      )
    }
    return value
  }

  getValueWeak(
    // ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
    //   ? [input?: InputsRaw<TServerInputSchema, TClientInputSchema>]
    //   : [input: InputsRaw<TServerInputSchema, TClientInputSchema>]
    input?: FinalInputRawOrUndefined<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
  ): MountableSuccessData<TQueriesDefinitions, TMapperOutput> | undefined {
    const value = superstore.getValueWeak<MountableSuccessData<TQueriesDefinitions, TMapperOutput>>(
      this.getSsProviderValueKey(input),
      'clientServerIsolated',
    )
    return value
  }

  Provider = (
    props: ProviderSelfProps<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const { inputRaw, children, restProps } = React.useMemo<{
      inputRaw: InputRaw
      children: React.ReactNode
      restProps: TOuterProps
    }>(() => {
      const { input: providedInput = {}, children, ...restProps } = props as any
      const inputRaw = { ...providedInput }
      return { inputRaw, children, restProps }
    }, [props])

    return this._Mountable({
      layers: [
        {
          inputRaw,
          outerProps: restProps,
        },
      ],
      extraProps: (mountableState: MountableState<any, any, any, any, any, any, any, any, ErrorPoint0>) => {
        if (!this._ProviderReactContext) {
          throw new Error(`ProviderReactContext not found on point ${this.toStringWithLocation()}`)
        }
        if (mountableState.data) {
          superstore.setValue(this.getSsProviderValueKey(inputRaw), mountableState.data, 'clientServerIsolated')
          superstore.setValue(this.getSsProviderValueKey(), mountableState.data, 'clientServerIsolated')
        }
        return {
          children: React.createElement(this._ProviderReactContext.Provider, {
            value: mountableState.data,
            children,
          }),
        }
      },
      mountComponent: 'children',
    })
  }

  useValue<K extends keyof MountableSuccessData<TQueriesDefinitions, TMapperOutput>>(
    key: K,
  ): MountableSuccessData<TQueriesDefinitions, TMapperOutput>[K]
  useValue<K extends keyof MountableSuccessData<TQueriesDefinitions, TMapperOutput>>(
    keys: K[],
  ): Pick<MountableSuccessData<TQueriesDefinitions, TMapperOutput>, K>
  useValue(): MountableSuccessData<TQueriesDefinitions, TMapperOutput>
  useValue(
    keys?:
      | keyof MountableSuccessData<TQueriesDefinitions, TMapperOutput>
      | Array<keyof MountableSuccessData<TQueriesDefinitions, TMapperOutput>>,
  ) {
    if (!this._useValue) {
      throw new Error(`useValue not found on point ${this.toStringWithLocation()}`)
    }
    return (this as any)._useValue(this, keys)
  }

  // bun crashes just when see this code, even if it is not executed, so we need hack with _useValue
  // lets check time to time if crashes no more exists, then uncomment

  // useValue<K extends keyof FinalClientData<TLastServerOutput, TLastClientOutput>>(key: K): FinalClientData<TLastServerOutput, TLastClientOutput>[K]
  // useValue<K extends keyof FinalClientData<TLastServerOutput, TLastClientOutput>>(keys: K[]): Pick<FinalClientData<TLastServerOutput, TLastClientOutput>, K>
  // useValue(): FinalClientData<TLastServerOutput, TLastClientOutput>
  // useValue(keys?: keyof FinalClientData<TLastServerOutput, TLastClientOutput> | Array<keyof FinalClientData<TLastServerOutput, TLastClientOutput>>) {
  //   if (!this._ProviderReactContext) {
  //     throw new Error('ProviderReactContext not found on point: ' + this.name)
  //   }

  //   if (keys == null) {
  //     // no keys — return full context
  //     return useContextSelector(this._ProviderReactContext, (ctx) => {
  //       // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  //       if (!ctx) throw new Error('useValue must be used within a Provider.')
  //       return ctx
  //     })
  //   }

  //   if (Array.isArray(keys)) {
  //     // multiple keys — build a memoized object
  //     return useContextSelector(this._ProviderReactContext, (ctx) => {
  //       // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  //       if (!ctx) throw new Error('useValue must be used within a Provider.')
  //       const picked = {} as any
  //       for (const key of keys) {
  //         picked[key] = ctx[key]
  //       }
  //       return picked
  //     })
  //   }

  //   // single key
  //   return useContextSelector(this._ProviderReactContext, (ctx) => {
  //     // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  //     if (!ctx) throw new Error('useValue must be used within a Provider.')
  //     return ctx[keys]
  //   })
  //   return null
  // }

  _emit<TName extends AnyEventerEventName>(
    name: TName,
    data: Extract<AnyEventerEvent<TError>, { name: TName }>['data'],
    preventEmitError = false,
  ) {
    const event = { name, data, side: _point0_env.side.name } as AnyEventerEvent<TError>
    // const logger = getLogFnForPoint(this)
    for (const subscription of this._eventerSubscriptions) {
      if (subscription.side && subscription.side !== event.side) {
        continue
      }
      if (subscription.name !== '*' && subscription.name !== event.name) {
        continue
      }
      void (async () => {
        try {
          await subscription.callback(event)
        } catch (error) {
          try {
            if (!preventEmitError) {
              this._emit('emitError', { error: this._Error.from(error), event: event as never }, true)
            }
          } catch {}
        }
      })()
    }
  }
}

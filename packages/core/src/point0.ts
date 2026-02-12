import { Error0 } from '@devp0nt/error0'
import type { AnyLocation, AnyRoute, CallableRoute, KnownLocation } from '@devp0nt/route0'
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
import { flatten } from 'flat'
import * as React from 'react'
import type { ResolvableHead } from 'unhead/types'
import type { Context } from 'use-context-selector'
import { createContext, useContextSelector } from 'use-context-selector'
import { Effects } from './effects.js'
import { _point0_env } from './env.js'
import { _getFakeClient, _ssItems } from './internals.js'
import type { MethodQueryForAnyPoint } from './methods/query.js'
import type {
  AppendProps,
  AppendQueries,
  ComponentSelfProps,
  ComponentSelfType,
  ComponentSuccessComponentType,
  DestinationComponentVariant,
  EmptyProps,
  ErrorComponentType,
  GlobalHeadFn,
  HeadFn,
  IsQueryShouldBeFinalized,
  LayoutSelfProps,
  LayoutSelfType,
  LayoutSuccessComponentType,
  LoadingComponentType,
  MapperFn,
  MountAction,
  MountableLocation,
  MountableSelfType,
  MountableState,
  MountableSuccessData,
  PageSelfProps,
  PageSelfType,
  PageSuccessComponentType,
  Props,
  ProviderSelfProps,
  ProviderSelfType,
  QueriesDefinitions,
  QueriesResults,
  QueryDefinition,
  QueryFn,
  UndefinedComponentSuccessComponent,
  UndefinedLayoutSuccessComponent,
  UndefinedSuccessPageComponent,
  WithFn,
  WithSelfQueryIfShouldBeFinalized,
  WrapperComponentType,
} from './mountable.js'
import type { RouterPageState } from './router.js'
import { _usePageStateManager, useLocation, useRouterContext } from './router.js'
import { superstore } from './super-store.js'
import type {
  AnyPoint,
  AppendCtx,
  AppendCtxExposedKeys,
  AssertCurrentCtxExtendsPluginRequiredCtx,
  AssertCurrentInnerPropsExtendsPluginOuterProps,
  AssertInputSchemaNotWider,
  AssertNoForbiddenCtxExposedKeys,
  AssertNoForbiddenMethodsIfNotSuitableStage,
  AssertRouteDefinitionInputExtends,
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
  Data,
  DataTransformer,
  DataTransformerExtended,
  EmptyCtx,
  ExtendRouteDefinition,
  ExtraUseInfiniteQueryOptions,
  ExtraUseQueryOptions,
  FetchFn,
  FetchOptions,
  FetchOptionsFn,
  FetchOptionsOrFn,
  FetchServerDetailedOutput,
  FetchServerOutput,
  FetchServerOutputType,
  FinalLoaderData,
  FinalLoaderDataOrNever,
  FinalLoaderOutput,
  IfAnyThenElse,
  Infer,
  InferCtxFnOutputCtxAppend,
  InferCtxFnOutputCtxExposedKeys,
  InputParsed,
  InputRaw,
  InputSchema,
  InputsRaw,
  InputsRawMaybeOptional,
  IsInputOptional,
  IsInputsOptional,
  LayoutPoint,
  LoaderDataFn,
  LoaderOutput,
  LoaderResponseFn,
  MapperOutput,
  MergeRecordValidationSchemas,
  MiddlewareFn,
  MountablePointType,
  NiceBaseReadyPoint,
  NiceComponentReadyPoint,
  NiceInfiniteQueryReadyPoint,
  NiceLayoutReadyPoint,
  NiceMutationReadyPoint,
  NicePageReadyPoint,
  NicePluginReadyPoint,
  NicePluginStagePoint,
  NiceProviderReadyPoint,
  NiceRootReadyPoint,
  NiceRootStagePoint,
  NiceStagePoint,
  NormalizeQueryResultType,
  OnPrefetchFn,
  PagePrefetchPolicy,
  PartialUseInfiniteQueryOptions,
  PointName,
  PointType,
  PointsScope,
  QueriedData,
  QueryKey,
  QueryMode,
  QueryResultType,
  ReadyPoint,
  ReadyPointType,
  ReadyPointTypeOrNever,
  RecordValidationSchema,
  RequiredCtx,
  RootPoint,
  RouteDefinition,
  RouteDefinitionToRecordValidationSchema,
  SafeParseInputResult,
  ScrollPositionGetter,
  ScrollPositionRestorePolicy,
  ScrollPositionSetter,
  ServerExecuteAction,
  ShowError,
  StagePointTypeOrNever,
  UndefinedCtx,
  UndefinedCtxExposedKeys,
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
import {
  blankDataTransformerExtended,
  dedupeSlashes,
  getWindowScrollPositionGetterByElementGetter,
  getWindowScrollPositionGetterBySelector,
  getWindowScrollPositionSetterByElementGetter,
  getWindowScrollPositionSetterBySelector,
  isContainsBinary,
  mergeHeaders,
  toExtendedTransformer,
  toPascalCase,
  windowScrollPositionGetter,
  windowScrollPositionSetter,
} from './utils.js'
// import stringify from 'safe-stable-stringify'

// known stage fns

// requireCtx: server, nothing to prune
// serverurl: client, nothing to prune
// baseurl: both, nothing to prune
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
// prefetchOnLinkHover: client, prune on server

// transformer: both, nothing to prune

// ctx: server, prune on client
// loader: server, prune on client

// clientLoader: client, prune on server

// mapper: both, nothing to prune !!! prune on nossr-server

// head: both, nothing to prune
// props: both, nothing to prune
// input: server, prune on client
// clientInput: client, prune on server
// combinedInput: both, nothing to prune

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
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
> {
  Infer: Infer<
    TPointType,
    TLetsReadyPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
  readonly _middlewares: MiddlewareFn[]
  _serverurl: string | undefined
  readonly _baseurl: string | null | undefined
  readonly type: TPointType
  private readonly _letsReadyPointType: TLetsReadyPointType
  private readonly _transformer: DataTransformerExtended | undefined
  _getTransformer = () => this._transformer ?? blankDataTransformerExtended
  readonly _ssr: boolean
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
    InputsRaw<TServerInputSchema, TClientInputSchema>,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    Error0,
    InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
    QueryKey,
    unknown
  >
  readonly _queryResultType: TQueryResultType
  readonly _serverExecuteActions: ServerExecuteAction[]
  private readonly _clientExecuteActions: ClientExecuteAction[]
  private readonly _mountActions: MountAction[]
  private readonly _useValue: undefined | ((point: AnyPoint, keys?: string | string[] | undefined) => any)
  readonly route: TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute
  private readonly _page: PageSuccessComponentType<any, any, any, any> | UndefinedSuccessPageComponent
  private readonly _component: ComponentSuccessComponentType<any, any, any> | UndefinedComponentSuccessComponent
  private readonly _layout: LayoutSuccessComponentType<any, any, any, any> | UndefinedLayoutSuccessComponent
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
  private readonly _prefetchPolicy: PagePrefetchPolicy | undefined
  private readonly _getPrefetchPolicy = () => this._prefetchPolicy ?? 'everything'
  private readonly _onPrefetchFns: OnPrefetchFn[]
  readonly _polh: boolean | number | undefined
  get polh() {
    return this._polh ?? false
  }
  private readonly _ProviderReactContext: Context<MountableSuccessData<TQueriesDefinitions, TMapperOutput>> | undefined
  private readonly _errorComponent: ErrorComponentType<DestinationComponentVariant> | undefined
  private static readonly DefaultErrorComponent: ErrorComponentType<any> = ({ error }) => {
    const { stack, ...json } = error.toJSON()
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('pre', null, JSON.stringify(json, null, 2)),
      React.createElement('pre', null, stack),
    )
  }
  private readonly _layoutErrorComponent: ErrorComponentType<any> | undefined
  private readonly _pageErrorComponent: ErrorComponentType<any> | undefined
  private readonly _componentErrorComponent: ErrorComponentType<any> | undefined
  private readonly _layoutLoadingComponent: LoadingComponentType<any> | undefined
  static readonly DefaultLoadingComponent: LoadingComponentType<any> = () =>
    React.createElement(React.Fragment, null, 'Loading...')
  private readonly _loadingComponent: LoadingComponentType<any> | undefined
  private readonly _pageLoadingComponent: LoadingComponentType<any> | undefined
  private readonly _componentLoadingComponent: LoadingComponentType<any> | undefined
  private readonly _getComponentLoadingComponent = () =>
    this._componentLoadingComponent ?? Point0.DefaultLoadingComponent
  X: TPointType extends 'layout'
    ? LayoutSelfType<
        TRouteDefinition,
        TServerInputSchema,
        TClientInputSchema,
        TOuterProps,
        TInnerProps,
        TQueriesDefinitions,
        TMapperOutput
      >
    : TPointType extends 'page'
      ? PageSelfType<
          TRouteDefinition,
          TServerInputSchema,
          TClientInputSchema,
          TOuterProps,
          TInnerProps,
          TQueriesDefinitions,
          TMapperOutput
        >
      : TPointType extends 'component'
        ? ComponentSelfType<
            TServerInputSchema,
            TClientInputSchema,
            TOuterProps,
            TInnerProps,
            TQueriesDefinitions,
            TMapperOutput
          >
        : TPointType extends 'provider'
          ? ProviderSelfType<
              TServerInputSchema,
              TClientInputSchema,
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
    _middlewares?: MiddlewareFn[] | undefined
    _serverurl?: string | undefined
    _baseurl?: string | null | undefined
    _transformer?: DataTransformerExtended | undefined
    _ssr?: boolean
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
          InputsRaw<TServerInputSchema, TClientInputSchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          Error0,
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
    route?: TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute
    _page?:
      | PageSuccessComponentType<TRouteDefinition, TInnerProps, TQueriesDefinitions, TMapperOutput>
      | UndefinedSuccessPageComponent
    _component?:
      | ComponentSuccessComponentType<TInnerProps, TQueriesDefinitions, TMapperOutput>
      | UndefinedComponentSuccessComponent
    _layout?:
      | LayoutSuccessComponentType<TRouteDefinition, TInnerProps, TQueriesDefinitions, TMapperOutput>
      | UndefinedLayoutSuccessComponent
    _layouts?: LayoutPoint[]
    name: PointName
    _fetchOptions?: FetchOptionsFn
    _scrollPositionGetter?: ScrollPositionGetter | undefined
    _scrollPositionSetter?: ScrollPositionSetter | undefined
    _scrollPositionRestorePolicy?: ScrollPositionRestorePolicy | undefined
    _prefetchPolicy?: PagePrefetchPolicy | undefined
    _onPrefetchFns?: OnPrefetchFn[]
    _polh?: boolean | number | undefined
    _errorComponent?: ErrorComponentType<any>
    _layoutErrorComponent?: ErrorComponentType<any>
    _pageErrorComponent?: ErrorComponentType<any>
    _componentErrorComponent?: ErrorComponentType<any>
    _loadingComponent?: LoadingComponentType<any>
    _layoutLoadingComponent?: LoadingComponentType<any>
    _pageLoadingComponent?: LoadingComponentType<any>
    _componentLoadingComponent?: LoadingComponentType<any>
    X?: MountableSelfType<any, any, any, any, any, any, any, any, any> | null
    _unstableId?: number
  }) {
    this.point = this
    this.scope = options.scope
    this.scopes = options.scopes
    this._base = options._base ?? undefined
    this._root = options._root ?? undefined
    this._middlewares = options._middlewares ?? []
    this._transformer = options._transformer ?? undefined
    this._ssr = options._ssr ?? false
    this._serverurl = options._serverurl ?? undefined
    this._baseurl = options._baseurl ?? undefined
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
    this.route =
      options.route ??
      (undefined as TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute)
    this._page = options._page ?? undefined
    this._component = options._component ?? undefined
    this._layout = options._layout ?? undefined
    this._layouts = options._layouts ?? []
    this.name = options.name
    this._fetchOptions = options._fetchOptions ?? (() => ({}))
    this._scrollPositionGetter = options._scrollPositionGetter ?? undefined
    this._scrollPositionSetter = options._scrollPositionSetter ?? undefined
    this._scrollPositionRestorePolicy = options._scrollPositionRestorePolicy ?? undefined
    this._prefetchPolicy = options._prefetchPolicy ?? undefined
    this._onPrefetchFns = options._onPrefetchFns ?? []
    this._polh = options._polh ?? undefined
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
    TQueryResultType extends QueryResultType | UndefinedQueryResultType,
    TOuterProps extends Props,
    TInnerProps extends Props,
    TQueriesDefinitions extends QueriesDefinitions,
  >(overrides: {
    type?: TPointType
    scope?: PointsScope
    scopes?: PointsScope[]
    _letsReadyPointType?: TLetsReadyPointType
    _base?: BasePoint | LayoutPoint | undefined
    _root?: RootPoint | undefined
    _middlewares?: MiddlewareFn[]
    _serverurl?: string | undefined
    _baseurl?: string | null | undefined
    _transformer?: DataTransformerExtended | null
    _ssr?: boolean
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
          InputsRaw<TServerInputSchema, TClientInputSchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          Error0,
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
    _page?:
      | PageSuccessComponentType<TRouteDefinition, TInnerProps, TQueriesDefinitions, TMapperOutput>
      | UndefinedSuccessPageComponent
    _component?:
      | ComponentSuccessComponentType<TInnerProps, TQueriesDefinitions, TMapperOutput>
      | UndefinedComponentSuccessComponent
    _layout?:
      | LayoutSuccessComponentType<TRouteDefinition, TInnerProps, TQueriesDefinitions, TMapperOutput>
      | UndefinedLayoutSuccessComponent
    _layouts?: LayoutPoint[]
    name?: PointName
    _fetchOptions?: FetchOptionsFn
    _scrollPositionGetter?: ScrollPositionGetter | undefined
    _scrollPositionSetter?: ScrollPositionSetter | undefined
    _scrollPositionRestorePolicy?: ScrollPositionRestorePolicy | undefined
    _prefetchPolicy?: PagePrefetchPolicy
    _onPrefetchFns?: OnPrefetchFn[]
    _polh?: boolean | number | undefined
    _errorComponent?: ErrorComponentType<any> | undefined
    _layoutErrorComponent?: ErrorComponentType<any> | undefined
    _pageErrorComponent?: ErrorComponentType<any> | undefined
    _componentErrorComponent?: ErrorComponentType<any> | undefined
    _loadingComponent?: LoadingComponentType<any> | undefined
    _layoutLoadingComponent?: LoadingComponentType<any> | undefined
    _pageLoadingComponent?: LoadingComponentType<any> | undefined
    _componentLoadingComponent?: LoadingComponentType<any> | undefined
    X?: MountableSelfType<any, any, any, any, any, any, any, any, any> | null
  }): Point0<
    TPointType,
    TLetsReadyPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return new Point0<
      TPointType,
      TLetsReadyPointType,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >({
      scope: overrides.scope ?? this.scope,
      scopes: overrides.scopes ?? this.scopes,
      _base: overrides._base ?? this._base,
      _root: overrides._root ?? this._root,
      type: (overrides.type ?? this.type) as TPointType,
      _letsReadyPointType: (overrides._letsReadyPointType ?? this._letsReadyPointType) as TLetsReadyPointType,
      _middlewares: overrides._middlewares ?? this._middlewares,
      _serverurl: overrides._serverurl ?? this._serverurl,
      _baseurl: overrides._baseurl ?? this._baseurl,
      _transformer: overrides._transformer ?? this._transformer,
      _ssr: overrides._ssr ?? this._ssr,
      _defaultMutationOptions: overrides._defaultMutationOptions ?? { ...this._defaultMutationOptions },
      _mutationOptions: overrides._mutationOptions ?? { ...this._mutationOptions },
      _defaultQueryOptions: overrides._defaultQueryOptions ?? { ...this._defaultQueryOptions },
      _defaultInfiniteQueryOptions: overrides._defaultInfiniteQueryOptions ?? { ...this._defaultInfiniteQueryOptions },
      _defaultPageQueryOptions: overrides._defaultPageQueryOptions ?? { ...this._defaultPageQueryOptions },
      _defaultLayoutQueryOptions: overrides._defaultLayoutQueryOptions ?? { ...this._defaultLayoutQueryOptions },
      _defaultComponentQueryOptions: overrides._defaultComponentQueryOptions ?? {
        ...this._defaultComponentQueryOptions,
      },
      _defaultProviderQueryOptions: overrides._defaultProviderQueryOptions ?? {
        ...this._defaultProviderQueryOptions,
      },
      _queryOptions: overrides._queryOptions ?? { ...this._queryOptions },
      _infiniteQueryOptions: (overrides._infiniteQueryOptions ?? {
        ...this._infiniteQueryOptions,
      }) as ExtraUseInfiniteQueryOptions<
        InputsRaw<TServerInputSchema, TClientInputSchema>,
        FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
        Error0,
        InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
        QueryKey,
        unknown
      >,
      _queryResultType: (overrides._queryResultType ?? this._queryResultType) as TQueryResultType,
      // _asFormData: overrides._asFormData ?? this._asFormData,
      _serverExecuteActions: overrides._serverExecuteActions ?? this._serverExecuteActions,
      _clientExecuteActions: overrides._clientExecuteActions ?? this._clientExecuteActions,
      _mountActions: overrides._mountActions ?? this._mountActions,
      _ProviderReactContext: (overrides._ProviderReactContext ?? this._ProviderReactContext) as never,
      _useValue: overrides._useValue ?? this._useValue,
      route: (overrides.route ?? this.route) as never,
      _page: (overrides._page ?? this._page) as never,
      _component: (overrides._component ?? this._component) as never,
      _layout: (overrides._layout ?? this._layout) as never,
      _layouts: overrides._layouts ?? this._layouts,
      name: overrides.name ?? this.name,
      _fetchOptions: overrides._fetchOptions ?? this._fetchOptions,
      _scrollPositionGetter: overrides._scrollPositionGetter ?? this._scrollPositionGetter,
      _scrollPositionSetter: overrides._scrollPositionSetter ?? this._scrollPositionSetter,
      _scrollPositionRestorePolicy: overrides._scrollPositionRestorePolicy ?? this._scrollPositionRestorePolicy,
      _prefetchPolicy: overrides._prefetchPolicy ?? this._prefetchPolicy,
      _onPrefetchFns: overrides._onPrefetchFns ?? this._onPrefetchFns,
      _polh: overrides._polh ?? this._polh,
      _errorComponent: (overrides._errorComponent ?? this._errorComponent) as never,
      _layoutErrorComponent: (overrides._layoutErrorComponent ?? this._layoutErrorComponent) as never,
      _pageErrorComponent: (overrides._pageErrorComponent ?? this._pageErrorComponent) as never,
      _componentErrorComponent: (overrides._componentErrorComponent ?? this._componentErrorComponent) as never,
      _loadingComponent: (overrides._loadingComponent ?? this._loadingComponent) as never,
      _layoutLoadingComponent: (overrides._layoutLoadingComponent ?? this._layoutLoadingComponent) as never,
      _pageLoadingComponent: (overrides._pageLoadingComponent ?? this._pageLoadingComponent) as never,
      _componentLoadingComponent: (overrides._componentLoadingComponent ?? this._componentLoadingComponent) as never,
      X: (overrides.X ?? this.X) as never,
    })
  }

  static lets<TRequiredCtx extends RequiredCtx = UndefinedCtx>(
    pointType: 'root',
    pointName: string,
  ): NiceRootStagePoint<
    'coreStage',
    'root',
    TRequiredCtx,
    EmptyCtx,
    UndefinedCtxExposedKeys,
    UndefinedLoaderOutput,
    UndefinedLoaderOutput,
    UndefinedMapperOutput,
    UndefinedRoute,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedQueryResultType,
    EmptyProps,
    EmptyProps,
    []
  >
  static lets<TRequiredCtx extends Ctx = EmptyCtx, TOuterProps extends Props = EmptyProps>(
    pointType: 'plugin',
    pointName: string,
  ): NicePluginStagePoint<
    'coreStage',
    'plugin',
    TRequiredCtx,
    TRequiredCtx,
    UndefinedCtxExposedKeys,
    UndefinedLoaderOutput,
    UndefinedLoaderOutput,
    UndefinedMapperOutput,
    UndefinedRoute,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedQueryResultType,
    TOuterProps,
    TOuterProps,
    []
  >
  static lets(pointType: 'root' | 'plugin', pointName: string) {
    if (pointType === 'root') {
      return new Point0({
        type: 'coreStage',
        scope: pointName,
        scopes: [pointName],
        _letsReadyPointType: 'root',
        name: pointName,
      }) as never
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (pointType === 'plugin') {
      return new Point0({
        type: 'coreStage',
        scope: 'plugin',
        scopes: ['plugin'],
        _letsReadyPointType: 'plugin',
        name: pointName,
      }) as never
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Invalid point type: ${pointType}`)
    }
  }

  // root settings

  serverurl(
    serverurl: string,
  ): NiceRootStagePoint<
    StagePointTypeOrNever<TPointType>,
    'root',
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _serverurl: serverurl,
    }) as never
  }

  baseurl(
    baseurl: string,
  ): NiceRootStagePoint<
    StagePointTypeOrNever<TPointType>,
    'root',
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _baseurl: baseurl,
    }) as never
  }

  // general settings

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

  ssr(
    ssr: boolean,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _ssr: ssr,
    }) as never
  }

  mutationOptions(
    mutationOptions: UseMutationOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _defaultMutationOptions: mutationOptions,
    }) as never
  }

  // setting default query options in not mountable point
  queryOptions(
    ...args: TLetsReadyPointType extends Exclude<PointType, MountablePointType>
      ? [queryOptions: ExtraUseQueryOptions]
      : never
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  // finalize query in mountable component
  queryOptions(
    ...args: TLetsReadyPointType extends MountablePointType
      ? TPointType extends 'finalStage'
        ? [ShowError<`You can not use queryOptions() to finalize yout query, becouse it is already finalized`>]
        : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
          ? [
              queryOptions?: ExtraUseQueryOptions<
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                Error0,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                QueryKey
              >,
            ]
          : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
            ? [ShowError<`Query can not return response. Last loader should provide plain object data, not response.`>]
            : [
                ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .queryOptions() to finalize query.`>,
              ]
      : never
  ): NiceStagePoint<
    'finalStage',
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
    'query',
    TOuterProps,
    TInnerProps,
    // [...TQueriesDefinitions, UsePointQueryResult<'query', TServerLoaderOutput, TClientLoaderOutput>]
    AppendQueries<
      TQueriesDefinitions,
      QueryDefinition<'query', FinalLoaderDataOrNever<TServerLoaderOutput, TClientLoaderOutput>>
    >
  >
  queryOptions(...args: any[]) {
    const queryOptions = (args[0] || {}) as ExtraUseQueryOptions
    if (this._isMountableReadyPoint()) {
      if (this.type === 'finalStage') {
        throw new Error(
          `You can not use queryOptions() in ${this.toString()} becouse this point query already finalized`,
        )
      }
      return this._continue({
        type: 'finalStage',
        _queryResultType: 'query',
        _queryOptions: queryOptions,
        _mountActions: [...this._mountActions, { type: 'selfQuery', unstableId: Point0._getNextUnstableId() }],
      }) as never
    } else {
      return this._continue({
        _defaultQueryOptions: { ...this._defaultQueryOptions, ...queryOptions },
      }) as never
    }
  }

  // setting default infinite query options in not mountable point
  infiniteQueryOptions(
    ...args: TLetsReadyPointType extends Exclude<PointType, MountablePointType>
      ? [infiniteQueryOptions: PartialUseInfiniteQueryOptions]
      : never
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  // finalize infinite query in mountable point
  infiniteQueryOptions(
    ...args: TLetsReadyPointType extends MountablePointType
      ? TPointType extends 'finalStage'
        ? [ShowError<`You can not use infiniteQueryOptions() to finalize yout query, becouse it is already finalized`>]
        : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
          ? [
              infiniteQueryOptions: ExtraUseInfiniteQueryOptions<
                InputsRaw<TServerInputSchema, TClientInputSchema>,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                Error0,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >,
            ]
          : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
            ? [ShowError<`Query can not return response. Last loader should provide plain object data, not response.`>]
            : [
                ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .infiniteQueryOptions() to finalize query.`>,
              ]
      : never
  ): NiceStagePoint<
    'finalStage',
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
    'infiniteQuery',
    TOuterProps,
    TInnerProps,
    AppendQueries<
      TQueriesDefinitions,
      QueryDefinition<'infiniteQuery', InfiniteData<FinalLoaderDataOrNever<TServerLoaderOutput, TClientLoaderOutput>>>
    >
  >
  infiniteQueryOptions(...args: any[]) {
    const infiniteQueryOptions = (args[0] || {}) as ExtraUseInfiniteQueryOptions<any> | PartialUseInfiniteQueryOptions
    if (this._isMountableReadyPoint()) {
      if (this.type === 'finalStage') {
        throw new Error(
          `You can not use infiniteQueryOptions() in ${this.toString()} becouse this point query already finalized`,
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
          },
        ],
      }) as never
    } else {
      return this._continue({
        _defaultInfiniteQueryOptions: {
          ...this._defaultInfiniteQueryOptions,
          ...infiniteQueryOptions,
        } as PartialUseInfiniteQueryOptions,
      }) as never
    }
  }

  pageQueryOptions(
    pageQueryOptions: UseQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    const newFetchOptionsFn: FetchOptionsFn = () => {
      const prevFetchOptions: FetchOptions = this._fetchOptions?.() || {}
      const newFetchOptions: FetchOptions =
        typeof fetchOptionsOrFn === 'function' ? fetchOptionsOrFn() : fetchOptionsOrFn
      return { ...prevFetchOptions, ...newFetchOptions }
    }
    return this._continue({
      _fetchOptions: newFetchOptionsFn,
    }) as never
  }

  // extra components

  error(
    errorComponent: ErrorComponentType<any>,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
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
  error(errorComponent: ErrorComponentType<any> | undefined) {
    errorComponent ||= () => null
    // this._applyComponentDisplayName(errorComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'Error',
    // })
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        {
          type: 'errorComponent',
          Component: errorComponent,
          variant: this._getDestinationComponentVariant(),
          unstableId: Point0._getNextUnstableId(),
        },
      ],
      ...(this._isMountableReadyPoint()
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
    layoutErrorComponent: ErrorComponentType<any>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake layoutError for serverNoSsr target
      _layoutErrorComponent: (layoutErrorComponent as never) || (() => null),
      // _layoutErrorComponent: this._applyComponentDisplayName(layoutErrorComponent || (() => null), {
      //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'LayoutError',
      // }),
    }) as never
  }

  pageError(
    pageErrorComponent: ErrorComponentType<any>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake pageError for serverNoSsr target
    pageErrorComponent ||= () => null
    // this._applyComponentDisplayName(pageErrorComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'PageError',
    // })
    return this._continue({
      _pageErrorComponent: pageErrorComponent as never,
    }) as never
  }

  componentError(
    componentErrorComponent: ErrorComponentType<any>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake componentError for serverNoSsr target
      _componentErrorComponent: (componentErrorComponent as never) || (() => null),
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake layoutLoading for serverNoSsr target
      _layoutLoadingComponent: (layoutLoadingComponent as never) || (() => null),
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake pageLoading for serverNoSsr target
    pageLoadingComponent ||= () => null
    // this._applyComponentDisplayName(pageLoadingComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'PageLoading',
    // })
    return this._continue({
      _pageLoadingComponent: pageLoadingComponent as never,
    }) as never
  }

  componentLoading(
    componentLoadingComponent: LoadingComponentType<any>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake componentLoading for serverNoSsr target
      _componentLoadingComponent: (componentLoadingComponent as never) || (() => null),
      // _componentLoadingComponent: this._applyComponentDisplayName(
      //   // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake componentLoading for serverNoSsr target
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    loadingComponent ||= () => null
    // this._applyComponentDisplayName(loadingComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'Loading',
    // })
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        {
          type: 'loadingComponent',
          Component: loadingComponent,
          variant: this._getDestinationComponentVariant(),
          unstableId: Point0._getNextUnstableId(),
        },
      ],
      ...(this._isMountableReadyPoint()
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
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
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
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        {
          type: 'wrapper',
          Component: wrapperComponent,
          unstableId: Point0._getNextUnstableId(),
        },
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
    }) as never
  }

  with<TNewInnerProps extends Props>(
    withFn: WithFn<
      MountableLocation<TLetsReadyPointType, TRouteDefinition>,
      TInnerProps,
      WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      TMapperOutput,
      TNewInnerProps
    >,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
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
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    AppendProps<TInnerProps, TNewInnerProps>,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
  with(withFnProvided: WithFn<any, any, any, any, any> | undefined) {
    // in case if we shake with for server without ssr
    const withFn = withFnProvided || ((() => ({})) as WithFn<any, any, any, any, any>)
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        {
          type: 'with',
          fn: withFn,
          unstableId: Point0._getNextUnstableId(),
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    middlewareFn: MiddlewareFn,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      _middlewares: [...this._middlewares, middlewareFn],
    }) as never
  }
  // prefetch mode

  prefetchPolicy(
    policy: PagePrefetchPolicy,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if it was shaked for serverNoSsr
      _prefetchPolicy: policy ?? this._prefetchPolicy,
    }) as never
  }

  onPrefetch(
    fn: OnPrefetchFn,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if it was shaked for server
      _onPrefetchFns: [...this._onPrefetchFns, fn ?? (() => undefined)],
    }) as never
  }

  prefetchOnLinkHover(
    polh: boolean | number,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if it was shaked for server
      _polh: polh ?? this._polh,
    }) as never
  }

  // transformer

  transformer(
    transformer: DataTransformer,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
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

  ctx<TCtxFn extends CtxFn<TCtx, TCtxExposedKeys, TServerInputSchema, Ctx>>(
    ctxFn: TCtxFn &
      AssertNoForbiddenCtxExposedKeys<InferCtxFnOutputCtxExposedKeys<TCtxFn>> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, InferCtxFnOutputCtxAppend<TCtxFn>>,
    AppendCtxExposedKeys<TCtxExposedKeys, InferCtxFnOutputCtxExposedKeys<TCtxFn>>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  ctx<TAppendCtx extends Ctx>(
    ctx: [TAppendCtx] &
      AssertNoForbiddenCtxExposedKeys<Extract<keyof TAppendCtx, string>> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
    AppendCtxExposedKeys<TCtxExposedKeys, Extract<keyof TAppendCtx, string>>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  ctx<TAppendCtx extends Ctx, TAppendCtxExposedKeys extends Extract<keyof TAppendCtx, string>>(
    ctx: [TAppendCtx, ...TAppendCtxExposedKeys[]] &
      AssertNoForbiddenCtxExposedKeys<TAppendCtxExposedKeys> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
    AppendCtxExposedKeys<TCtxExposedKeys, TAppendCtxExposedKeys>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  ctx<TAppendCtx extends Ctx>(
    ctx: TAppendCtx & AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  ctx(ctxOrFn: CtxFn | Ctx | [Ctx, ...CtxExposedKeys[]]) {
    const ctxFn =
      typeof ctxOrFn === 'undefined' // in case if we shake ctx for client target
        ? () => ({})
        : typeof ctxOrFn === 'function'
          ? ctxOrFn
          : () => ctxOrFn
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'ctx', fn: ctxFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
    }) as never
  }

  loader<TNewServerLoaderOutput extends LoaderOutput = LoaderOutput>(
    loaderFn: TLetsReadyPointType extends 'mutation'
      ? LoaderResponseFn<TCtx, TCtxExposedKeys, TServerLoaderOutput, TServerInputSchema, TNewServerLoaderOutput> &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'loader'>
      : LoaderDataFn<TCtx, TCtxExposedKeys, TServerLoaderOutput, TServerInputSchema, TNewServerLoaderOutput> &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'loader'>,
  ): NiceStagePoint<
    TNewServerLoaderOutput extends Response ? 'clientStage' : 'serverStage',
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TNewServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    NormalizeQueryResultType<TLetsReadyPointType, TQueryResultType, 'query'>,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  loader(loaderFn: LoaderDataFn<any, any, any, any, any> | LoaderResponseFn<any, any, any, any, any> | boolean) {
    return this._continue({
      type: 'serverStage', // it should be clientStage if loader returns response, but we know it only by types, we do not know it in runtime, bu it is ok to have here for runtime serverStage. Not good, but ok.
      _queryResultType: this._normalizeQueryResultType('query'),
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'loader', fn: (loaderFn as unknown) ?? ((c: any) => c.data), unstableId: Point0._getNextUnstableId() },
      ] as never,
    }) as never
  }

  clientLoader<TNewClientLoaderOutput extends LoaderOutput = LoaderOutput>(
    clientLoaderFn: TLetsReadyPointType extends 'mutation'
      ? ClientLoaderResponseFn<
          TLetsReadyPointType,
          TRouteDefinition,
          TClientInputSchema,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TNewClientLoaderOutput
        > &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientLoader'>
      : ClientLoaderDataFn<
          TLetsReadyPointType,
          TRouteDefinition,
          TClientInputSchema,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TNewClientLoaderOutput
        > &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientLoader'>,
  ): NiceStagePoint<
    TNewClientLoaderOutput extends Response ? 'finalStage' : 'clientStage', // response can happen only in mutation, so we not care about this happen in mountable
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TNewClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    NormalizeQueryResultType<TLetsReadyPointType, TQueryResultType, 'query'>,
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
    clientLoaderFn ||= (o: any) => o.data
    return this._continue({
      // it should be finalStage if loader returns response, but we know it only by types,
      // we do not know it in runtime, bu it is ok to have here for runtime serverStage. Not good, but ok.
      // it will be really finalized in runtime in one of next methods
      type: 'clientStage',
      _queryResultType: this._normalizeQueryResultType('query'),
      _clientExecuteActions: [
        ...this._clientExecuteActions,
        {
          type: 'loader',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          fn: clientLoaderFn || ((o: any) => o.data), // in case if we shake clientLoader for server without ssr target
          unstableId: Point0._getNextUnstableId(),
        },
      ] as never,
    }) as never
  }

  mapper<TNewMapperOutput extends MapperOutput = MapperOutput>(
    mapperFn: MapperFn<
      MountableLocation<TLetsReadyPointType, TRouteDefinition>,
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TNewMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
  mapper(mapperFn: MapperFn<any, any, any, any, any> | undefined) {
    // in case if we shake mapper for server without ssr target
    mapperFn ||= ((o) => o.data) as MapperFn<any, any, any, any, any>
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    return this._continue({
      // _sameQueryPoint: null,
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        { type: 'mapper', fn: mapperFn, unstableId: Point0._getNextUnstableId() },
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
          MountableLocation<TLetsReadyPointType, TRouteDefinition>,
          TInnerProps,
          WithSelfQueryIfShouldBeFinalized<
            TPointType,
            TLetsReadyPointType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TQueriesDefinitions
          >,
          TMapperOutput
        >
      | ResolvableHead
      | string,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
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
      ? GlobalHeadFn<any, MountableLocation<TLetsReadyPointType, TRouteDefinition>>
      :
          | HeadFn<
              TStatus extends 'loading' | 'error' | 'success' ? TStatus : any,
              MountableLocation<TLetsReadyPointType, TRouteDefinition>,
              TInnerProps,
              WithSelfQueryIfShouldBeFinalized<
                TPointType,
                TLetsReadyPointType,
                TServerLoaderOutput,
                TClientLoaderOutput,
                TQueriesDefinitions
              >,
              TMapperOutput
            >
          | ResolvableHead
          | string,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
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
                MountableLocation<TLetsReadyPointType, TRouteDefinition>,
                TInnerProps,
                TQueriesDefinitions,
                TMapperOutput
              >
            | ResolvableHead
            | string,
        ]
      | [
          head:
            | HeadFn<
                any,
                MountableLocation<TLetsReadyPointType, TRouteDefinition>,
                TInnerProps,
                TQueriesDefinitions,
                TMapperOutput
              >
            | ResolvableHead
            | string,
        ]
    const [providedStatus, providedHead] = (() => {
      if (args.length === 2) {
        return args
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake head for server without ssr target
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
              return providedHead(options)
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
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
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
              },
            ]
          : [{ type: 'head' as const, fn: headFn, unstableId: Point0._getNextUnstableId() }]),
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
    }) as never
  }

  input<TNextServerInputSchema extends InputSchema>(
    inputSchema: TNextServerInputSchema &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'> &
      AssertInputSchemaNotWider<TNextServerInputSchema, TServerInputSchema, TClientInputSchema>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, TNextServerInputSchema>,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  input<TInputRaw extends InputRaw, TInputParsed extends InputParsed = TInputRaw>(
    ...args: TInputParsed extends InputSchema
      ? never[]
      : [
          validateFn: CustomValidationFn<TInputParsed> &
            AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'> &
            AssertInputSchemaNotWider<
              RecordValidationSchema<TInputRaw, TInputParsed>,
              TServerInputSchema,
              TClientInputSchema
            >,
        ]
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  input<TValidateFn extends CustomValidationFn<any>>(
    validateFn: TValidateFn &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'> &
      AssertInputSchemaNotWider<
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        TServerInputSchema,
        TClientInputSchema
      >,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  input<
    TInput extends InputRaw,
    TError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'> &
      AssertInputSchemaNotWider<RecordValidationSchema<TInput, TInput>, TServerInputSchema, TClientInputSchema>,
  >(): WithError<
    TError,
    NiceStagePoint<
      StagePointTypeOrNever<TPointType>,
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      MergeRecordValidationSchemas<TServerInputSchema, RecordValidationSchema<TInput, TInput>>,
      TClientInputSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  >
  input(...args: any[]) {
    const inputSchema = args[0] as InputSchema | CustomValidationFn | undefined
    const schema = !inputSchema
      ? Point0.customValidationFnToInputSchema((x) => x)
      : '~standard' in inputSchema
        ? inputSchema
        : Point0.customValidationFnToInputSchema(inputSchema)
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'input', schema, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  clientInput<TNextClientInputSchema extends InputSchema>(
    inputSchema: TNextClientInputSchema &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> &
      AssertInputSchemaNotWider<TNextClientInputSchema, TServerInputSchema, TClientInputSchema>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    MergeRecordValidationSchemas<TClientInputSchema, TNextClientInputSchema>,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  clientInput<TInputRaw extends InputRaw, TInputParsed extends InputParsed = TInputRaw>(
    validateFn: CustomValidationFn<TInputParsed> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> &
      AssertInputSchemaNotWider<
        RecordValidationSchema<TInputRaw, TInputParsed>,
        TServerInputSchema,
        TClientInputSchema
      >,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    MergeRecordValidationSchemas<TClientInputSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  clientInput<TValidateFn extends CustomValidationFn<any>>(
    validateFn: TValidateFn &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> &
      AssertInputSchemaNotWider<
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        TServerInputSchema,
        TClientInputSchema
      >,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    MergeRecordValidationSchemas<TClientInputSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  clientInput<
    TInput extends InputRaw,
    TError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> &
      AssertInputSchemaNotWider<RecordValidationSchema<TInput, TInput>, TServerInputSchema, TClientInputSchema>,
  >(
    ...args: unknown extends TError ? [] : [TError]
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    MergeRecordValidationSchemas<TClientInputSchema, RecordValidationSchema<TInput, TInput>>,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  clientInput(...args: any[]) {
    const inputSchema = args[0] as InputSchema | CustomValidationFn | undefined
    const schema = !inputSchema
      ? Point0.customValidationFnToInputSchema((x) => x)
      : '~standard' in inputSchema
        ? inputSchema
        : Point0.customValidationFnToInputSchema(inputSchema)
    return this._continue({
      _clientExecuteActions: [
        ...this._clientExecuteActions,
        { type: 'input', schema, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  combinedInput<TNextInputSchema extends InputSchema>(
    inputSchema: TNextInputSchema &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'combinedInput'> &
      AssertInputSchemaNotWider<TNextInputSchema, TServerInputSchema, TClientInputSchema>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, TNextInputSchema>,
    MergeRecordValidationSchemas<TClientInputSchema, TNextInputSchema>,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  combinedInput<TInputRaw extends InputRaw, TInputParsed extends InputParsed = TInputRaw>(
    validateFn: CustomValidationFn<TInputParsed> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'combinedInput'> &
      AssertInputSchemaNotWider<
        RecordValidationSchema<TInputRaw, TInputParsed>,
        TServerInputSchema,
        TClientInputSchema
      >,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
    MergeRecordValidationSchemas<TClientInputSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  combinedInput<TValidateFn extends CustomValidationFn<any>>(
    validateFn: TValidateFn &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'combinedInput'> &
      AssertInputSchemaNotWider<
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        TServerInputSchema,
        TClientInputSchema
      >,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
    MergeRecordValidationSchemas<TClientInputSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  combinedInput<
    TInput extends InputRaw,
    TError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'combinedInput'> &
      AssertInputSchemaNotWider<RecordValidationSchema<TInput, TInput>, TServerInputSchema, TClientInputSchema>,
  >(
    ...args: unknown extends TError ? [] : [TError]
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, RecordValidationSchema<TInput, TInput>>,
    MergeRecordValidationSchemas<TClientInputSchema, RecordValidationSchema<TInput, TInput>>,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
  combinedInput(...args: any[]) {
    const inputSchema = args[0] as InputSchema | CustomValidationFn | undefined
    const schema = !inputSchema
      ? Point0.customValidationFnToInputSchema((x) => x)
      : '~standard' in inputSchema
        ? inputSchema
        : Point0.customValidationFnToInputSchema(inputSchema)
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'input', schema, unstableId: Point0._getNextUnstableId() },
      ],
      _clientExecuteActions: [
        ...this._clientExecuteActions,
        { type: 'input', schema, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  lets<
    TPointName extends PointName,
    TProvidedRoute extends RouteDefinition = TPointName,
    TError = AssertInputSchemaNotWider<
      RouteDefinitionToRecordValidationSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>,
      TServerInputSchema,
      TClientInputSchema
    > &
      AssertRouteDefinitionInputExtends<TRouteDefinition, ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>,
  >(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsReadyPointType: 'page', pointName: TPointName, route?: TProvidedRoute]
      : never[]
  ): WithError<
    TError,
    NiceStagePoint<
      'coreStage',
      'page',
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TPointType extends 'base' ? TServerLoaderOutput : UndefinedLoaderOutput,
      TPointType extends 'base' ? TClientLoaderOutput : UndefinedLoaderOutput,
      TPointType extends 'base' ? TMapperOutput : UndefinedMapperOutput,
      ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>,
      MergeRecordValidationSchemas<
        TServerInputSchema,
        RouteDefinitionToRecordValidationSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
      >,
      MergeRecordValidationSchemas<
        TClientInputSchema,
        RouteDefinitionToRecordValidationSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
      >,
      TPointType extends 'base' ? TQueryResultType : UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'layout' ? EmptyProps : TInnerProps, // if it was layout we drop all wrappers so no inner props, else it was created form base or root so we keep wrappers
      TPointType extends 'layout' ? [] : TQueriesDefinitions // same here
    >
  >
  lets<
    TPointName extends PointName,
    TProvidedRoute extends AnyRoute,
    TError = AssertInputSchemaNotWider<
      RouteDefinitionToRecordValidationSchema<TProvidedRoute['definition']>,
      TServerInputSchema,
      TClientInputSchema
    > &
      AssertRouteDefinitionInputExtends<TRouteDefinition, TProvidedRoute['definition']>,
  >(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsReadyPointType: 'page', pointName: TPointName, route: TProvidedRoute]
      : never[]
  ): WithError<
    TError,
    NiceStagePoint<
      'coreStage',
      'page',
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TPointType extends 'base' ? TServerLoaderOutput : UndefinedLoaderOutput,
      TPointType extends 'base' ? TClientLoaderOutput : UndefinedLoaderOutput,
      TPointType extends 'base' ? TMapperOutput : UndefinedMapperOutput,
      TProvidedRoute['definition'],
      MergeRecordValidationSchemas<
        TServerInputSchema,
        RouteDefinitionToRecordValidationSchema<TProvidedRoute['definition']>
      >,
      MergeRecordValidationSchemas<
        TClientInputSchema,
        RouteDefinitionToRecordValidationSchema<TProvidedRoute['definition']>
      >,
      TPointType extends 'base' ? TQueryResultType : UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'layout' ? EmptyProps : TInnerProps, // if it was layout we drop all wrappers so no inner props, else it was created form base or root so we keep wrappers
      TPointType extends 'layout' ? [] : TQueriesDefinitions // same here
    >
  >
  lets<
    TPointName extends PointName,
    TProvidedRoute extends RouteDefinition = '/',
    TError = AssertInputSchemaNotWider<
      RouteDefinitionToRecordValidationSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>,
      TServerInputSchema,
      TClientInputSchema
    > &
      AssertRouteDefinitionInputExtends<TRouteDefinition, ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>,
  >(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsReadyPointType: 'layout', pointName: TPointName, route?: TProvidedRoute]
      : never[]
  ): WithError<
    TError,
    NiceStagePoint<
      'coreStage',
      'layout',
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TPointType extends 'base' ? TServerLoaderOutput : UndefinedLoaderOutput,
      TPointType extends 'base' ? TClientLoaderOutput : UndefinedLoaderOutput,
      TPointType extends 'base' ? TMapperOutput : UndefinedMapperOutput,
      ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>,
      MergeRecordValidationSchemas<
        TServerInputSchema,
        RouteDefinitionToRecordValidationSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
      >,
      MergeRecordValidationSchemas<
        TClientInputSchema,
        RouteDefinitionToRecordValidationSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
      >,
      TPointType extends 'base' ? TQueryResultType : UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'layout' ? EmptyProps : TInnerProps, // if it was layout we drop all wrappers so no inner props, else it was created form base or root so we keep wrappers
      TPointType extends 'layout' ? [] : TQueriesDefinitions // same here
    >
  >
  lets<
    TPointName extends PointName,
    TProvidedRoute extends AnyRoute,
    TError = AssertInputSchemaNotWider<
      RouteDefinitionToRecordValidationSchema<TProvidedRoute['definition']>,
      TServerInputSchema,
      TClientInputSchema
    > &
      AssertRouteDefinitionInputExtends<TRouteDefinition, TProvidedRoute['definition']>,
  >(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsReadyPointType: 'layout', pointName: TPointName, route: TProvidedRoute]
      : never[]
  ): WithError<
    TError,
    NiceStagePoint<
      'coreStage',
      'layout',
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TPointType extends 'base' ? TServerLoaderOutput : UndefinedLoaderOutput,
      TPointType extends 'base' ? TClientLoaderOutput : UndefinedLoaderOutput,
      TPointType extends 'base' ? TMapperOutput : UndefinedMapperOutput,
      TProvidedRoute['definition'],
      MergeRecordValidationSchemas<
        TServerInputSchema,
        RouteDefinitionToRecordValidationSchema<TProvidedRoute['definition']>
      >,
      MergeRecordValidationSchemas<
        TClientInputSchema,
        RouteDefinitionToRecordValidationSchema<TProvidedRoute['definition']>
      >,
      TPointType extends 'base' ? TQueryResultType : UndefinedQueryResultType,
      EmptyProps,
      TPointType extends 'layout' ? EmptyProps : TInnerProps, // if it was layout we drop all wrappers so no inner props, else it was created form base or root so we keep wrappers
      TPointType extends 'layout' ? [] : TQueriesDefinitions // same here
    >
  >
  lets<TNewOuterProps extends Props = EmptyProps>(
    ...args: TPointType extends 'root' | 'base' ? [letsReadyPointType: 'component', pointName: string] : never[]
  ): NiceStagePoint<
    'coreStage',
    'component',
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TPointType extends 'base' ? TServerLoaderOutput : UndefinedLoaderOutput,
    TPointType extends 'base' ? TClientLoaderOutput : UndefinedLoaderOutput,
    TPointType extends 'base' ? TMapperOutput : UndefinedMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TPointType extends 'base' ? TQueryResultType : UndefinedQueryResultType,
    TNewOuterProps,
    AppendProps<TInnerProps, TNewOuterProps>,
    TQueriesDefinitions
  >
  lets<
    TNewLetsReadyPointType extends Exclude<ReadyPointType, 'page' | 'layout' | 'component'>,
    TPointName extends PointName,
  >(
    ...args: TPointType extends 'root' | 'base'
      ? [letsReadyPointType: TNewLetsReadyPointType, pointName: TPointName]
      : never[]
  ): NiceStagePoint<
    'coreStage',
    TNewLetsReadyPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TPointType extends 'base' ? TServerLoaderOutput : UndefinedLoaderOutput,
    TPointType extends 'base' ? TClientLoaderOutput : UndefinedLoaderOutput,
    TPointType extends 'base' ? TMapperOutput : UndefinedMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TPointType extends 'base' ? TQueryResultType : UndefinedQueryResultType,
    EmptyProps,
    TInnerProps,
    TQueriesDefinitions
  >
  lets(...args: any[]) {
    const [letsReadyPointType, pointName, route] = args as [ReadyPointType, PointName, AnyRoute | string | undefined]
    const prevRoute = this.route
    const newRoute = (() => {
      const routeConfig = { baseurl: this._baseurl ?? undefined }
      if (letsReadyPointType === 'page') {
        if (typeof route === 'string' || !route) {
          const routeOrPointName = route ?? pointName
          if (routeOrPointName === '/') {
            return prevRoute?.clone() ?? Route0.create('/', routeConfig)
          }
          return prevRoute
            ? prevRoute.extend(routeOrPointName).clone(routeConfig)
            : Route0.create(dedupeSlashes(`/${routeOrPointName}`), routeConfig)
        }
        return route
      }
      if (letsReadyPointType === 'layout') {
        if (typeof route === 'string' || !route) {
          const routeNormalized = route ?? '/'
          if (routeNormalized === '/') {
            return prevRoute?.clone() ?? Route0.create('/', routeConfig)
          }
          return prevRoute
            ? prevRoute.extend(routeNormalized).clone(routeConfig)
            : Route0.create(dedupeSlashes(`/${routeNormalized}`), routeConfig)
        }
        return route
      }
      return prevRoute
    })()
    const scopes = letsReadyPointType === 'root' ? [pointName, ...this.scopes] : this.scopes
    const scope = letsReadyPointType === 'root' ? pointName : this.scope
    const newInputExecuteAction =
      prevRoute === newRoute || !newRoute
        ? []
        : [
            {
              type: 'input' as const,
              schema: Point0.customValidationFnToInputSchema((input) => newRoute.parseFlatInput(input)),
              unstableId: 0,
            },
          ]

    const serverExecuteActionsAll = [...this._serverExecuteActions, ...newInputExecuteAction]
    const serverExecuteActionsSuitable =
      this.type !== 'base'
        ? serverExecuteActionsAll.filter((action) => action.type !== 'loader')
        : serverExecuteActionsAll

    const clientExecuteActionsAll = [...this._clientExecuteActions, ...newInputExecuteAction]
    const clientExecuteActionsSuitable =
      this.type !== 'base'
        ? clientExecuteActionsAll.filter((action) => action.type !== 'loader')
        : clientExecuteActionsAll

    const mountActionsAll = [...this._mountActions]
    const mountActionsSuitable = this.type !== 'base' && this.type !== 'root' ? [] : mountActionsAll
    if (letsReadyPointType === 'component') {
      mountActionsSuitable.push({ type: 'selfProps', unstableId: Point0._getNextUnstableId() })
    }

    return this._continue({
      scope,
      scopes,
      _serverExecuteActions: serverExecuteActionsSuitable,
      _clientExecuteActions: clientExecuteActionsSuitable,
      _mountActions: mountActionsSuitable,
      type: 'coreStage',
      _letsReadyPointType: letsReadyPointType,
      name: pointName,
      route: newRoute as never,
      _page: undefined,
      _component: undefined,
      _layout: undefined,
      _ProviderReactContext: undefined,
      _useValue: undefined,
      _layouts: this.type === 'layout' ? [...this._layouts, this as unknown as LayoutPoint] : [...this._layouts],
      _serverurl: this._base?._serverurl,
      _baseurl: this._base?._baseurl,
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
      _prefetchPolicy: this._base?._prefetchPolicy,
      _onPrefetchFns: this._base?._onPrefetchFns,
      _polh: this._base?._polh,
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

  root(): NiceRootReadyPoint<
    'root',
    UndefinedReadyPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    })
  }

  plugin(): NicePluginReadyPoint<
    'plugin',
    UndefinedReadyPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    ...args: [
      page?: PageSuccessComponentType<
        TRouteDefinition,
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
  ): NicePageReadyPoint<
    'page',
    UndefinedReadyPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    const [page = () => null] = args as [PageSuccessComponentType<any, any, any, any> | undefined]
    // this._applyComponentDisplayName(page as React.ComponentType<any>, { suffix: 'PageInner' })
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    const point = this._continue({
      type: 'page',
      _page: page,
      _letsReadyPointType: undefined,
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
    ...args: [
      component?: ComponentSuccessComponentType<
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
  ): NiceComponentReadyPoint<
    'component',
    UndefinedReadyPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    const [component = () => null] = args as [ComponentSuccessComponentType<any, any, any> | undefined]
    // this._applyComponentDisplayName(component, { suffix: 'Inner' })
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    const point = this._continue({
      type: 'component',
      _component: component,
      _letsReadyPointType: undefined,
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
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    TPoint extends NiceLayoutReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>,
  >(
    ...args: TLetsReadyPointType extends 'page'
      ? [
          layout: TPoint,
          ...error: InputsRaw<TServerInputSchema, TClientInputSchema> extends TPoint['Infer']['InputRaw']
            ? []
            : [ShowError<`Layout input not compatible to current page input`>],
        ]
      : never
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
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
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    if (this._letsReadyPointType === 'layout') {
      const [layout = ({ children }: { children: Exclude<React.ReactNode, Promise<any>> }) => children] = args as [
        LayoutSuccessComponentType<any, any, any, any> | undefined,
      ]
      // this._applyComponentDisplayName(layout as React.ComponentType<any>, { suffix: 'LayoutInner' })
      const point = this._continue({
        type: 'layout',
        _layout: layout as never,
        _letsReadyPointType: undefined,
        _base: this as never as BasePoint,
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
        NiceLayoutReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any> | undefined,
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
          throw new Error('ProviderReactContext not found on point: ' + point.name)
        }

        if (keys == null) {
          // no keys — return full context
          return useContextSelector(point._ProviderReactContext, (ctx) => {
            if (!ctx) throw new Error('useValue must be used within a Provider.')
            return ctx
          })
        }

        if (Array.isArray(keys)) {
          // multiple keys — build a memoized object
          return useContextSelector(point._ProviderReactContext, (ctx) => {
            if (!ctx) throw new Error('useValue must be used within a Provider.')
            const picked = {} as any
            for (const key of keys) {
              picked[key] = ctx[key]
            }
            return picked
          })
        }

        // single key
        return useContextSelector(point._ProviderReactContext, (ctx) => {
          if (!ctx) throw new Error('useValue must be used within a Provider.')
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
    ...args: [
      mapper?: MapperFn<
        MountableLocation<TLetsReadyPointType, TRouteDefinition>,
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
  ): NiceProviderReadyPoint<
    'provider',
    UndefinedReadyPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TNewMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
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
    const mapperFn = _mapperFn as MapperFn<any, any, any, any, any> | undefined
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    const point = this._continue({
      type: 'provider',
      _letsReadyPointType: undefined,
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        ...(mapperFn
          ? [
              {
                type: 'mapper' as const,
                fn: mapperFn,
                unstableId: Point0._getNextUnstableId(),
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

  use<T extends NicePluginReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>>(
    plugin: T &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'use'> &
      AssertInputSchemaNotWider<T['Infer']['ServerInputSchema'], TServerInputSchema, TClientInputSchema> &
      AssertInputSchemaNotWider<T['Infer']['ClientInputSchema'], TServerInputSchema, TClientInputSchema> &
      AssertCurrentCtxExtendsPluginRequiredCtx<TCtx, T['Infer']['RequiredCtx']> &
      AssertCurrentInnerPropsExtendsPluginOuterProps<TOuterProps, T['Infer']['OuterProps']>,
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, T['Infer']['Ctx']>,
    AppendCtxExposedKeys<TCtxExposedKeys, T['Infer']['CtxExposedKeys']>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, T['Infer']['ServerInputSchema']>,
    MergeRecordValidationSchemas<TClientInputSchema, T['Infer']['ClientInputSchema']>,
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
  use(plugin: NicePluginReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>) {
    const point = plugin.point

    if (this._ssr !== point._ssr) {
      throw new Error(`Point ${this.toString()} and ${point.toString()} have different ssr settings`)
    }

    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []

    return this._continue({
      // type
      // scope
      // scopes
      // _letsReadyPointType
      // _base
      // _root
      _middlewares: [...this._middlewares, ...point._middlewares],
      _serverurl: point._serverurl,
      _baseurl: point._baseurl,
      _transformer: point._transformer,
      // _ssr
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
      _serverExecuteActions: [...this._serverExecuteActions, ...point._serverExecuteActions],
      _clientExecuteActions: [...this._clientExecuteActions, ...point._clientExecuteActions],
      _mountActions: [...this._mountActions, ...selfQueryAction, ...point._mountActions],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
      // _ProviderReactContext: point._ProviderReactContext,
      // _useValue: point._useValue,
      // route: point.route,
      // _page: point._page,
      // _component: point._component,
      // _layout: point._layout,
      _layouts: [...new Set([...this._layouts, ...point._layouts])],
      // name
      _fetchOptions: () => {
        const prevFetchOptions: FetchOptions = this._fetchOptions?.() || {}
        const newFetchOptions: FetchOptions = point._fetchOptions?.() || {}
        return { ...prevFetchOptions, ...newFetchOptions }
      },
      _scrollPositionGetter: point._scrollPositionGetter,
      _scrollPositionSetter: point._scrollPositionSetter,
      _scrollPositionRestorePolicy: point._scrollPositionRestorePolicy,
      _prefetchPolicy: point._prefetchPolicy,
      _onPrefetchFns: [...this._onPrefetchFns, ...point._onPrefetchFns],
      _polh: point._polh,
      _errorComponent: point._errorComponent,
      _layoutErrorComponent: point._layoutErrorComponent,
      _pageErrorComponent: point._pageErrorComponent,
      _componentErrorComponent: point._componentErrorComponent,
      _loadingComponent: point._loadingComponent,
      _layoutLoadingComponent: point._layoutLoadingComponent,
      _pageLoadingComponent: point._pageLoadingComponent,
      _componentLoadingComponent: point._componentLoadingComponent,
      // X
    }) as never
  }

  query = ((...args: any) => {
    if (this._letsReadyPointType === 'query') {
      // usual query final
      const [queryOptions = {}] = args as [ExtraUseQueryOptions | undefined]
      return this._continue({
        type: 'query',
        _letsReadyPointType: undefined,
        _queryResultType: 'query',
        _queryOptions: queryOptions,
      }) as never
    }
    // mountable query injection
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    if (!args.length) {
      // in case if we prune it for server with no ssr
      return this._continue({
        ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
      }) as never
    }
    const queryFn = (() => {
      if ('point' in args[0]) {
        const point = args[0].point as AnyPoint
        const getInputFn =
          typeof args[1] === 'function' ? args[1] : typeof args[1] === 'object' ? () => args[1] : () => ({})
        const queryOptions = typeof args[2] === 'object' ? args[2] : {}
        return ((options) => {
          const input = getInputFn(options)
          if (point._queryResultType === 'query') {
            return point.useQuery(input, queryOptions)
          } else {
            return point.useInfiniteQuery(input, queryOptions)
          }
        }) as QueryFn<any, any, any, any, any>
      } else if (typeof args[0] === 'function') {
        return args[0] as QueryFn<any, any, any, any, any>
      } else {
        throw new Error('Invalid arguments')
      }
    })()
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        { type: 'query', fn: queryFn, unstableId: Point0._getNextUnstableId() },
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
    }) as never
  }) as MethodQueryForAnyPoint<
    TPointType,
    TLetsReadyPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >

  infiniteQuery(
    ...args: FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
      ? [
          infiniteQueryOptions: ExtraUseInfiniteQueryOptions<
            InputsRaw<TServerInputSchema, TClientInputSchema>,
            FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
            Error0,
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
  ): TLetsReadyPointType extends 'infiniteQuery'
    ? NiceInfiniteQueryReadyPoint<
        'infiniteQuery',
        undefined,
        TRequiredCtx,
        TCtx,
        TCtxExposedKeys,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TMapperOutput,
        TRouteDefinition,
        TServerInputSchema,
        TClientInputSchema,
        'infiniteQuery',
        TOuterProps,
        TInnerProps,
        TQueriesDefinitions
      >
    : NiceStagePoint<
        StagePointTypeOrNever<TPointType>,
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
        'infiniteQuery',
        TOuterProps,
        TInnerProps,
        TQueriesDefinitions
      > {
    const [infiniteQueryOptions = {}] = args
    if (this._letsReadyPointType === 'infiniteQuery') {
      return this._continue({
        type: 'infiniteQuery',
        _letsReadyPointType: undefined,
        _queryResultType: 'infiniteQuery',
        _infiniteQueryOptions: infiniteQueryOptions as ExtraUseInfiniteQueryOptions<
          InputsRaw<TServerInputSchema, TClientInputSchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          Error0,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >,
      }) as never
    } else {
      return this._continue({
        _queryResultType: 'infiniteQuery',
        _infiniteQueryOptions: infiniteQueryOptions as ExtraUseInfiniteQueryOptions<
          InputsRaw<TServerInputSchema, TClientInputSchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          Error0,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >,
      }) as never
    }
  }

  mutation(
    ...args: FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends LoaderOutput
      ? [
          mutationOptions?: UseMutationOptions<
            FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
            Error0,
            InputsRawMaybeOptional<TServerInputSchema, TClientInputSchema>
          >,
        ]
      : [ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .mutation()`>]
  ): NiceMutationReadyPoint<
    'mutation',
    UndefinedReadyPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  > {
    const [mutationOptions = {}] = args
    const point = this._continue({
      type: 'mutation',
      _mutationOptions: mutationOptions as UseMutationOptions,
      _letsReadyPointType: undefined,
    })
    return point as never
  }

  _tail(component: React.Component): typeof this {
    const point = this._continue({})
    Point0._assignNicePointMethodsToComponent({ component, point, extra: {} })
    return component as never
  }

  // internal utils

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
        'This component is already assigned to a point. Please use a different component. Better always define component in place by arrow function.',
      )
    }
    Object.assign(component, {
      __POINT0_INSTANCE__: true,
      Infer: point.Infer,
      point,
      lets: point.lets.bind(point),
      useQuery: point.useQuery.bind(point),
      getQueryOptions: point.getQueryOptions.bind(point),
      prefetchQuery: point.prefetchQuery.bind(point),
      getQueryKey: point.getQueryKey.bind(point),
      useInfiniteQuery: point.useInfiniteQuery.bind(point),
      getInfiniteQueryOptions: point.getInfiniteQueryOptions.bind(point),
      prefetchInfiniteQuery: point.prefetchInfiniteQuery.bind(point),
      getMutationOptions: point.getMutationOptions.bind(point),
      useMutation: point.useMutation.bind(point),
      fetch: point.fetch.bind(point),
      getFetchServerOptions: point.getFetchServerOptions.bind(point),
      fetchServer: point.fetchServer.bind(point),
      fetchQuery: point.fetchQuery.bind(point),
      fetchInfiniteQuery: point.fetchInfiniteQuery.bind(point),
      fetchMutation: point.fetchMutation.bind(point),
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
      _tail: point._tail.bind(point),
      route: point.route,
      ...extra,
    })
  }

  private static _isReadyPointType(pointType: PointType): boolean {
    return (
      pointType === 'root' ||
      pointType === 'base' ||
      pointType === 'page' ||
      pointType === 'layout' ||
      pointType === 'plugin' ||
      pointType === 'query' ||
      pointType === 'infiniteQuery' ||
      pointType === 'mutation' ||
      pointType === 'component' ||
      pointType === 'provider'
    )
  }
  private _isReadyPoint(): boolean {
    return Point0._isReadyPointType(this.type)
  }
  private static _isQueryableReadyPointType(pointType: PointType): boolean {
    return (
      pointType === 'query' ||
      pointType === 'infiniteQuery' ||
      pointType === 'page' ||
      pointType === 'layout' ||
      pointType === 'component' ||
      pointType === 'provider'
    )
  }
  private _isQueryableReadyPoint(): boolean {
    return Point0._isQueryableReadyPointType(this._letsReadyPointType || this.type)
  }
  private _normalizeQueryResultType(newQueryResultType: QueryResultType): QueryResultType | UndefinedQueryResultType {
    return this._isQueryableReadyPoint() ? (this._queryResultType ?? newQueryResultType) : this._queryResultType
  }
  private static _isMountableReadyPointType(pointType: PointType): boolean {
    return pointType === 'page' || pointType === 'layout' || pointType === 'component' || pointType === 'provider'
  }
  private _isMountableReadyPoint(): boolean {
    return Point0._isMountableReadyPointType(this._letsReadyPointType || this.type)
  }
  private _isMountableQueryShouldBeFinalized(): boolean {
    return this._isMountableReadyPoint() && (this.type === 'serverStage' || this.type === 'clientStage')
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
  private _getLoadingComponent(): LoadingComponentType<any> {
    const variant = this._getDestinationComponentVariant()
    return (
      this._loadingComponent ??
      (variant
        ? ({
            page: this._pageLoadingComponent,
            component: this._componentLoadingComponent,
            layout: this._layoutLoadingComponent,
          }[variant] ?? Point0.DefaultLoadingComponent)
        : Point0.DefaultLoadingComponent)
    )
  }
  private _getErrorComponent(): ErrorComponentType<any> {
    const variant = this._getDestinationComponentVariant()
    return (
      this._errorComponent ??
      (variant
        ? ({
            page: this._pageErrorComponent,
            component: this._componentErrorComponent,
            layout: this._layoutErrorComponent,
          }[variant] ?? Point0.DefaultErrorComponent)
        : Point0.DefaultErrorComponent)
    )
  }

  _hasServerLoader(): boolean {
    return this._serverExecuteActions.length > 0 && this._serverExecuteActions.some((fn) => fn.type === 'loader')
  }

  _hasClientLoader(): boolean {
    return this._clientExecuteActions.length > 0 && this._clientExecuteActions.some((fn) => fn.type === 'loader')
  }

  private _hasClientAsyncLoader(): boolean {
    return (
      this._clientExecuteActions.length > 0 &&
      this._clientExecuteActions.some((fn) => fn.type === 'loader' && fn.fn.constructor.name === 'AsyncFunction')
    )
  }

  private _getRouteForce(): CallableRoute<NonNullable<TRouteDefinition>> {
    if (!this.route) {
      throw new Error(`No client route provided for this point. Name: ${this.name}.`)
    }
    return this.route as CallableRoute<NonNullable<TRouteDefinition>>
  }

  private _generateComponentDisplayName(options?: {
    index?: number | undefined
    prefix?: string
    suffix?: string
  }): string {
    const { index, prefix, suffix } = options ?? {}
    return toPascalCase([prefix, this.name, suffix, index].filter(Boolean).join('_'))
  }

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

  private static parseInputSafeSync<TInputSchema extends InputSchema | UndefinedInputSchema>(
    inputSchema: TInputSchema,
    ...args: IsInputOptional<TInputSchema> extends true
      ? [input?: InputRaw<TInputSchema>]
      : [input: InputRaw<TInputSchema>]
  ): SafeParseInputResult<TInputSchema> {
    const [input = {}] = args
    if (!inputSchema) {
      return {
        success: true,
        data: {} as InputParsed<TInputSchema>,
        error: undefined,
      }
    }
    try {
      const result = inputSchema['~standard'].validate(input)

      // if promise throw error, promise not allowed
      if (result instanceof Promise) {
        throw new Error('Promise returning schema input not allowed for client input schemas')
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
          error: new Error0('Unknown input schema error'),
        }
      }
      const path = firstIssue.path?.map((p) => (typeof p === 'object' ? p.key : p)).join('.')
      const message = [path, firstIssue.message].filter(Boolean).join(': ')
      const error = new Error0(message)
      return {
        success: false,
        data: undefined,
        error,
      }
    } catch (error) {
      return { success: false, data: undefined, error: Error0.from(error) }
    }
  }

  parseClientInputSafe(
    ...args: IsInputOptional<TClientInputSchema> extends true
      ? [input?: InputRaw<TClientInputSchema>]
      : [input: InputRaw<TClientInputSchema>]
  ): SafeParseInputResult<TClientInputSchema> {
    const output = {} as InputParsed<TClientInputSchema>
    for (const clientExecuteAction of this._clientExecuteActions) {
      if (clientExecuteAction.type === 'input') {
        const result = Point0.parseInputSafeSync(clientExecuteAction.schema, ...args)
        if (!result.success) {
          return result
        }
        Object.assign(output, result.data)
      }
    }
    return { success: true, data: output, error: undefined }
  }

  parseClientInput(
    ...args: IsInputOptional<TClientInputSchema> extends true
      ? [input?: InputRaw<TClientInputSchema>]
      : [input: InputRaw<TClientInputSchema>]
  ): InputParsed<TClientInputSchema> {
    const result = this.parseClientInputSafe(...args)
    if (!result.success) {
      throw result.error
    }
    return result.data
  }

  private async _executeClientAsync({
    serverData,
    serverResponse,
    location,
    input,
  }: {
    serverData: Data | undefined
    serverResponse: Response | undefined
    location?: AnyLocation
    input: InputRaw<TClientInputSchema>
  }): Promise<{
    clientData: Data | undefined
    clientResponse: Response | undefined
    clientOutput: Data | Response | undefined
    clientInput: InputParsed<TClientInputSchema>
  }> {
    let currentClientData: Data | undefined = serverData
    let currentClientResponse: Response | undefined = serverResponse
    let currentClientOutput: Data | Response | undefined = serverResponse ?? serverData
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- we parse input step by step, so we do not need initial parse result. We do it to not even start loaders if input invalid
    const { parsedInput, inputError } = (() => {
      const result = this.parseClientInputSafe(input)
      if (!result.success) {
        return { parsedInput: {}, inputError: result.error }
      }
      return { parsedInput: result.data, inputError: undefined }
    })()
    if (inputError) {
      throw new Error(`Input error: ${inputError.message}`)
    }
    let currentInputParsed = {} as InputParsed<TClientInputSchema>
    location ??=
      this.type === 'page' || this.type === 'layout'
        ? this._getSelfLocationByAnotherLocationOrInput(location, input)
        : _ssItems.__POINT0_CURRENT_LOCATION__.get()
    for (const clientExecuteAction of this._clientExecuteActions) {
      switch (clientExecuteAction.type) {
        case 'input': {
          const result = Point0.parseInputSafeSync(clientExecuteAction.schema, input)
          if (result.error) {
            throw result.error
          }
          currentInputParsed = {
            ...currentInputParsed,
            ...result.data,
          }
          break
        }
        case 'loader': {
          const promise = clientExecuteAction.fn({
            data: currentClientData ?? {},
            location,
            response: serverResponse,
            input: currentInputParsed,
            serverData,
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
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        default: {
          throw new Error(`Unknown client extend fn type: ${(clientExecuteAction as any).type}`)
        }
      }
    }
    return {
      clientData: currentClientData,
      clientResponse: currentClientResponse,
      clientOutput: currentClientOutput,
      clientInput: currentInputParsed,
    }
  }

  private _getSelfLocationByAnotherLocation(location: AnyLocation): AnyLocation {
    const route = this.route
    if (!route) {
      return _ssItems.__POINT0_CURRENT_LOCATION__.get()
    }
    return route.getLocation(route.flat({ ...location.searchParams, ...location.params })) as KnownLocation<
      CurrentRouteDefinition<TRouteDefinition>
    >
  }

  private _getSelfLocationByAnotherLocationOrInput(
    location?: AnyLocation | undefined,
    input?: InputRaw<TClientInputSchema>,
  ): AnyLocation {
    const route = this.route
    if (!route) {
      return location ?? _ssItems.__POINT0_CURRENT_LOCATION__.get()
    }
    if (!input && !location) {
      return _ssItems.__POINT0_CURRENT_LOCATION__.get()
    }
    if (location) {
      return route.getLocation(route.flat({ ...location.searchParams, ...location.params, ...input }))
    }
    return route.getLocation(route.flat({ ...(input || {}) }))
  }

  _getUnsafeInputRawByLocation(location: AnyLocation): InputRaw<TClientInputSchema> {
    const selfLocation = this._getSelfLocationByAnotherLocation(location)
    return { ...selfLocation.searchParams, ...selfLocation.params } as InputRaw<TClientInputSchema>
  }

  // fetching and queries

  useQuery(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
  ): UsePointQueryResult<'query', TServerLoaderOutput, TClientLoaderOutput, any> {
    const [input = {}, queryOptions, fetchOptions] = args
    const location = useLocation()
    const serverQueryEnabled = this._hasServerLoader()
    const clientQueryEnabled = this._hasClientLoader()
    if (this._queryResultType === 'infiniteQuery') {
      throw new Error(`Point ${this.name} is not a finite query`)
    }
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
        location,
      })
      return query as never
    }

    const query = this._useCombinedQuery({
      input: input as never,
      queryOptions,
      location,
      fetchOptions,
    })
    return query as never
  }

  useInfiniteQuery(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputsRaw<TServerInputSchema, TClientInputSchema>,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                Error0,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputsRaw<TServerInputSchema, TClientInputSchema>,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                Error0,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
  ): UsePointQueryResult<'infiniteQuery', TServerLoaderOutput, TClientLoaderOutput, any> {
    const [input = {}, infiniteQueryOptions, fetchOptions] = args
    const location = useLocation()
    const serverQueryEnabled = this._hasServerLoader()
    const clientQueryEnabled = this._hasClientLoader()
    if (this._queryResultType !== 'infiniteQuery') {
      throw new Error(`Point ${this.name} is not an infinite query`)
    }
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
        location,
      })
      return query as never
    }

    const query = this._useCombinedInfiniteQuery({
      input: input as never,
      infiniteQueryOptions,
      location,
      fetchOptions,
    })
    return query as never
  }

  private getServerUrl(): string | undefined {
    if (this._serverurl) {
      return this._serverurl
    }
    const request0 = _ssItems.__POINT0_REQUEST0__.getWeak()
    if (request0?.location.origin) {
      return request0.location.origin
    }
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return undefined
  }

  getFetchServerOptions(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchServerOutputType,
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchServerOutputType,
        ]
  ): { url: string; init: RequestInit; request: Request } {
    const [input = {}, options] = args
    const fetchOptions = { ...this._fetchOptions?.(), ...options }
    const fromScope = _ssItems.__POINT0_CLIENT_POINTS__.getWeak()?.manager.scope ?? _getFakeClient()?.scope
    const headers = mergeHeaders(fetchOptions.headers, options?.headers, {
      Accept: 'application/json',
      ...(fromScope ? { 'X-Point0-From-Scope': fromScope } : {}),
    })
    const serverurl = this.getServerUrl()
    if (!serverurl) {
      throw new Error('Server URL is not set')
    }
    const url = new URL('/_point0', serverurl)
    const method = 'post'

    const outputType = args[2] ?? 'data'
    url.searchParams.set('type', this.type)
    url.searchParams.set('name', this.name)
    url.searchParams.set('scope', this.scope)
    url.searchParams.set('output', outputType)

    // const shouldAddMultipartFormDataHeaderToFetchOptions = this._asFormData ?? isContainsBinary(input)
    const shouldAddMultipartFormDataHeaderToFetchOptions = isContainsBinary(input)

    const bodySrc = this._getTransformer().serialize(input)
    const body = (() => {
      if (shouldAddMultipartFormDataHeaderToFetchOptions) {
        const formData = new FormData()
        const flattened: Record<string, unknown> = flatten(bodySrc)
        for (const [key, value] of Object.entries(flattened)) {
          if (value instanceof File || value instanceof Blob) {
            formData.append(key, value)
          } else if (value !== undefined) {
            formData.append(key, JSON.stringify(value))
          }
        }
        return formData
      } else {
        headers.set('Content-Type', 'application/json')
        return JSON.stringify(bodySrc)
      }
    })()

    const fetchUrl = url.toString()
    const fetchInit = {
      ...this._fetchOptions?.(),
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
    }
  }

  private static readonly nativeFetch = async (request: Request): Promise<Response> => await fetch(request)

  getFetchFn = (): FetchFn => {
    if (_point0_env.target.is.server) {
      const __POINT0_FETCH_FN__ = _ssItems.__POINT0_FETCH_FN__.getWeak()
      if (!__POINT0_FETCH_FN__) {
        throw new Error(
          'Fetch function in server available only inside loaders, components, etc, do not use it in top level. Or use FakeClient',
        )
      }
      return __POINT0_FETCH_FN__
    }
    return superstore.getFakeClient()?.fetch ?? Point0.nativeFetch
  }

  private modifyFetchRequestForServerIfRequired(fetchOptions: ReturnType<typeof this.getFetchServerOptions>): Request {
    if (!_point0_env.target.is.server) {
      return fetchOptions.request
    }
    const currentRequest0 = _ssItems.__POINT0_REQUEST0__.getWeak()
    if (!currentRequest0) {
      return Object.assign(fetchOptions.request, {
        __POINT0_IS_SERVER_REQUEST__: true,
      })
    }
    const originalRequest = currentRequest0.original
    const updatedHeaders = new Headers(originalRequest.headers)
    updatedHeaders.forEach((value, key) => {
      if (key.startsWith('x-point0-')) {
        updatedHeaders.delete(key)
      }
    })

    const currentEffects = _ssItems.__POINT0_EFFECTS__.getWeak()
    if (currentEffects) {
      const cookies = Object.values(currentEffects.cookies)
      for (const cookie of cookies) {
        const serializedCookie = Effects.serializeCookie(cookie)
        if (updatedHeaders.has('cookie')) {
          updatedHeaders.set('cookie', `${updatedHeaders.get('cookie')}; ${serializedCookie}`)
        } else {
          updatedHeaders.set('cookie', serializedCookie)
        }
      }
    }

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
    })
    return updatedRequest
  }

  async fetchServerDetailed(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchServerOutputType,
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchServerOutputType,
        ]
  ): Promise<FetchServerDetailedOutput<TServerLoaderOutput>> {
    let res: Response | undefined
    try {
      const fetchOptions = this.getFetchServerOptions(...args)
      const fetchFn = this.getFetchFn()
      const fetchRequest = this.modifyFetchRequestForServerIfRequired(fetchOptions)

      res = await fetchFn(fetchRequest)
      // TODO:ASAP create eventer
      // CookiesStore.refresh()
      if (res.headers.get('X-Point0-Not-Json-Data') === 'true') {
        return {
          response: res,
          data: undefined,
          error: null,
          output: res,
        } as FetchServerDetailedOutput<TServerLoaderOutput>
      }
      const json = await res.json()
      const data = this._getTransformer().deserialize(json)
      if (res.ok) {
        return { response: res, data, error: null, output: data } as FetchServerDetailedOutput<TServerLoaderOutput>
      }
      return {
        response: res,
        output: undefined,
        data: undefined,
        error: Error0.from(data, {
          httpStatus: res.status,
        }),
      }
    } catch (error) {
      return {
        response: res,
        data: undefined,
        error: Error0.from(error),
        output: undefined,
      } as FetchServerDetailedOutput<TServerLoaderOutput>
    }
  }

  async fetchServer(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchServerOutputType,
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchServerOutputType,
        ]
  ): Promise<FetchServerOutput<TServerLoaderOutput>> {
    const detailedResult = await this.fetchServerDetailed(...args)
    if (detailedResult.error) {
      throw detailedResult.error
    }
    return detailedResult.output as FetchServerOutput<TServerLoaderOutput>
  }

  _getServerQueryKey({
    input = {} as never,
    outputType = 'data',
    isInfiniteQuery,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
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
      this._getTransformer().stringify(input) as string,
      outputType,
    ]
  }

  _getClientQueryKey({
    input = {} as never,
    isInfiniteQuery,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    isInfiniteQuery: boolean
  }): QueryKey {
    return [
      'point0',
      this.scope,
      this.type,
      this.name,
      'client',
      isInfiniteQuery ? 'infinite' : 'finite',
      this._getTransformer().stringify(input) as string,
      'data',
    ]
  }

  private _getCombinedQueryKey({
    input = {} as never,
    outputType = 'data',
    isInfiniteQuery,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
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
      this._getTransformer().stringify(input) as string,
      outputType,
    ]
  }

  getQueryKey(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [input?: InputsRaw<TServerInputSchema, TClientInputSchema>, _outputType?: FetchServerOutputType]
      : [input: InputsRaw<TServerInputSchema, TClientInputSchema>, _outputType?: FetchServerOutputType]
  ): QueryKey {
    const [input, outputType] = args
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = this._hasServerLoader()
    if (hasClientLoader && hasServerLoader) {
      return this._getCombinedQueryKey({
        input: input as never,
        outputType,
        isInfiniteQuery: this._queryResultType === 'infiniteQuery',
      })
    }
    if (hasClientLoader) {
      return this._getClientQueryKey({
        input: input as never,
        isInfiniteQuery: this._queryResultType === 'infiniteQuery',
      })
    }
    if (hasServerLoader) {
      return this._getServerQueryKey({
        input: input as never,
        outputType,
        isInfiniteQuery: this._queryResultType === 'infiniteQuery',
      })
    }
    throw new Error('No loader found')
  }

  _getServerQueryOptions({
    input,
    queryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchServerOutputType
  }): UseQueryOptions<
    FetchServerOutput<TServerLoaderOutput>,
    Error0,
    FetchServerOutput<TServerLoaderOutput>,
    QueryKey
  > {
    const queryKey = this._getServerQueryKey({ input, outputType, isInfiniteQuery: false })
    const queryFn = async ({ signal }: { signal: AbortSignal }) => {
      const data = await this.fetchServer(input as never, { ...fetchOptions, signal }, outputType)
      return data
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
    input,
    queryOptions,
    location,
    serverData,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
    serverData?: Data
  }): UseQueryOptions<
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    Error0,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    QueryKey
  > {
    const queryKey = this._getClientQueryKey({ input, isInfiniteQuery: false })
    const queryFn = async () => {
      const { clientData } = await this._executeClientAsync({
        serverData,
        location,
        input: input as InputRaw<TClientInputSchema>,
        serverResponse: undefined,
      })
      return clientData
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
    input,
    location,
    queryClient = _ssItems.__POINT0_QUERY_CLIENT__.get(),
    queryOptions,
    fetchOptions,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    location?: AnyLocation
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseQueryOptions<
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    Error0,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    QueryKey
  > {
    const queryKey = this._getCombinedQueryKey({ input, outputType: 'data', isInfiniteQuery: false })
    const queryFn = async () => {
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
        location,
        serverData: serverData as never,
      })
      return await queryClient.fetchQuery(clientOpts as any)
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
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchServerOutputType
            mode?: QueryMode
          },
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchServerOutputType
            mode?: QueryMode
          },
        ]
  ): UseQueryOptions<
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    Error0,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    QueryKey
  > {
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = this._hasServerLoader()
    const [input, queryOptions, options = {}] = args
    const { location, queryClient, fetchOptions, outputType, mode = 'serverAndClient' } = options
    if (hasClientLoader && hasServerLoader && (mode === 'client' || mode === 'serverAndClient')) {
      return this._getCombinedQueryOptions({
        input: input as never,
        queryClient,
        queryOptions,
        fetchOptions,
        location,
      }) as never
    }
    if (hasClientLoader && (mode === 'client' || mode === 'serverAndClient')) {
      return this._getClientQueryOptions({
        input: input as never,
        queryOptions,
        location,
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
    throw new Error('No loader found')
  }

  private _getServerInfiniteQueryOptions({
    input,
    infiniteQueryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    infiniteQueryOptions:
      | ExtraUseInfiniteQueryOptions<
          InputsRaw<TServerInputSchema, TClientInputSchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          Error0,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchServerOutputType
  }): UseInfiniteQueryOptions<
    InfiniteData<FetchServerOutput<TServerLoaderOutput>>,
    Error0,
    FetchServerOutput<TServerLoaderOutput>,
    QueryKey
  > {
    const queryKey = this._getServerQueryKey({ input: input as never, outputType, isInfiniteQuery: true })
    const queryFn = async ({ pageParam, signal }: { pageParam: unknown; signal: AbortSignal }) => {
      try {
        const pageParamFromInput = this._infiniteQueryOptions.pageParamFromInput
        const data = await this.fetchServer(
          { ...input, [pageParamFromInput]: pageParam ?? this._infiniteQueryOptions.initialPageParam } as never,
          { ...fetchOptions, signal },
          outputType,
        )
        return data
      } catch (error) {
        throw Error0.from(error)
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
    input,
    infiniteQueryOptions,
    serverData,
    location,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    serverData?: Data
    location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputsRaw<TServerInputSchema, TClientInputSchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          Error0,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
  }): UseInfiniteQueryOptions<
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput> extends Data
      ? FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>
      : never,
    Error0,
    InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
    QueryKey
  > {
    const queryKey = this._getClientQueryKey({ input, isInfiniteQuery: true })
    const queryFn = async ({ pageParam }: { pageParam: unknown }) => {
      try {
        const pageParamFromInput = this._infiniteQueryOptions.pageParamFromInput
        const { clientData } = await this._executeClientAsync({
          serverData,
          location,
          serverResponse: undefined,
          input: {
            ...input,
            [pageParamFromInput]: pageParam ?? this._infiniteQueryOptions.initialPageParam,
          } as InputRaw<TClientInputSchema>,
        })
        return clientData
      } catch (error) {
        throw Error0.from(error)
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
    input,
    infiniteQueryOptions,
    fetchOptions,
    location,
    queryClient,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    location?: AnyLocation
    fetchOptions?: FetchOptions | undefined
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputsRaw<TServerInputSchema, TClientInputSchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          Error0,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    queryClient?: QueryClient
  }): UseInfiniteQueryOptions<
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput> extends Data
      ? FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>
      : never,
    Error0,
    InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
    QueryKey
  > {
    const queryKey = this._getCombinedQueryKey({ input, outputType: 'data', isInfiniteQuery: true })
    const queryFn = async (ctx: { pageParam: unknown }) => {
      try {
        const pageParam = ctx.pageParam ?? this._infiniteQueryOptions.initialPageParam
        const serverData = await (async () => {
          queryClient ??= _ssItems.__POINT0_QUERY_CLIENT__.get()
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
          const inputWithPageParam = { ...input, [this._infiniteQueryOptions.pageParamFromInput]: pageParam }
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
          location,
        })
        return await (clientOpts as any).queryFn({ ...input, pageParam })
      } catch (error) {
        throw Error0.from(error)
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
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputsRaw<TServerInputSchema, TClientInputSchema>,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                Error0,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchServerOutputType
            mode?: QueryMode
          },
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputsRaw<TServerInputSchema, TClientInputSchema>,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                Error0,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchServerOutputType
            mode?: QueryMode
          },
        ]
  ): UseInfiniteQueryOptions<
    InputsRaw<TServerInputSchema, TClientInputSchema>,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    Error0,
    InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
    QueryKey
  > {
    const [input, infiniteQueryOptions, options = {}] = args
    const { location, queryClient, fetchOptions, outputType, mode = 'serverAndClient' } = options
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = this._hasServerLoader()
    if (hasClientLoader && hasServerLoader && (mode === 'client' || mode === 'serverAndClient')) {
      return this._getCombinedInfiniteQueryOptions({
        input: input as never,
        infiniteQueryOptions,
        fetchOptions,
        queryClient,
        location,
      }) as never
    }
    if (hasClientLoader && (mode === 'client' || mode === 'serverAndClient')) {
      return this._getClientInfiniteQueryOptions({
        input: input as never,
        infiniteQueryOptions,
        location,
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
    throw new Error('No loader found')
  }

  private _useServerQuery({
    input,
    queryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchServerOutputType
  }): UseQueryResult<FetchServerOutput<TServerLoaderOutput>, Error0> {
    return useQuery(this._getServerQueryOptions({ input, queryOptions, fetchOptions, outputType }))
  }

  private _useClientQuery({
    input,
    queryOptions,
    location,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
  }): UseQueryResult<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>, Error0> {
    return useQuery(
      this._getClientQueryOptions({
        input,
        queryOptions,
        location,
      }),
    )
  }

  private _useCombinedQuery({
    input,
    queryOptions,
    location,
    fetchOptions,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseQueryResult<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>, Error0> {
    const queryClient = useQueryClient()
    return useQuery(
      this._getCombinedQueryOptions({
        input,
        queryOptions,
        location,
        queryClient,
        fetchOptions,
      }),
    )
  }

  private _useServerInfiniteQuery({
    input,
    infiniteQueryOptions: providedInfiniteQueryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    infiniteQueryOptions:
      | ExtraUseInfiniteQueryOptions<
          InputsRaw<TServerInputSchema, TClientInputSchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          Error0,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchServerOutputType
  }): UseInfiniteQueryResult<InfiniteData<FetchServerOutput<TServerLoaderOutput>>, Error0> {
    const infiniteQueryOptions = this._getServerInfiniteQueryOptions({
      input,
      infiniteQueryOptions: providedInfiniteQueryOptions,
      fetchOptions,
      outputType,
    })
    return useInfiniteQuery(infiniteQueryOptions) as never
  }

  private _useClientInfiniteQuery({
    input,
    infiniteQueryOptions: providedInfiniteQueryOptions,
    location,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputsRaw<TServerInputSchema, TClientInputSchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          Error0,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
  }): UseInfiniteQueryResult<InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>, Error0> {
    const infiniteQueryOptions = this._getClientInfiniteQueryOptions({
      input,
      infiniteQueryOptions: providedInfiniteQueryOptions,
      location,
    })
    return useInfiniteQuery(infiniteQueryOptions) as never
  }

  private _useCombinedInfiniteQuery({
    input,
    infiniteQueryOptions: providedInfiniteQueryOptions,
    fetchOptions,
    location,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputsRaw<TServerInputSchema, TClientInputSchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          Error0,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseInfiniteQueryResult<InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>, Error0> {
    const queryClient = useQueryClient()
    const infiniteQueryOptions = this._getCombinedInfiniteQueryOptions({
      input,
      infiniteQueryOptions: providedInfiniteQueryOptions,
      queryClient,
      location,
      fetchOptions,
    })
    return useInfiniteQuery(infiniteQueryOptions) as never
  }

  getMutationOptions(
    mutationOptions?: MutationOptions,
    fetchOptions?: FetchOptions,
  ): MutationOptions<
    FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
    Error0,
    InputsRawMaybeOptional<TServerInputSchema, TClientInputSchema>
  > {
    const mutationFn = async (input: Record<string, any> = {}) => {
      try {
        if (_point0_env.target.is.server) {
          throw new Error(
            'If you want to execute data on server, use engine.execute, or Executor.execute, or get execute fn from loader|ctx options. point.execute is for client only and use fetch under the hood to retrieve server data',
          )
        }
        const serverFetchResult = await (async () => {
          if (this._hasServerLoader()) {
            return await this.fetchServerDetailed(input as never, fetchOptions, undefined)
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
            throw new Error('Client output is not set')
          }
          return clientOutput as FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
        }
        if (!serverFetchResult?.output) {
          throw new Error('Server output is not set')
        }
        return serverFetchResult.output as never as FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
      } catch (error) {
        throw Error0.from(error)
      }
    }
    return {
      ...this._defaultMutationOptions,
      ...this._mutationOptions,
      ...mutationOptions,
      mutationFn,
    } as MutationOptions<
      FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
      Error0,
      InputsRawMaybeOptional<TServerInputSchema, TClientInputSchema>
    >
  }

  useMutation = (
    mutationOptions?: MutationOptions | undefined,
    fetchOptions?: FetchOptions | undefined,
  ): UseMutationResult<
    FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
    Error0,
    InputsRawMaybeOptional<TServerInputSchema, TClientInputSchema>
  > => {
    return useMutation(this.getMutationOptions(mutationOptions, fetchOptions))
  }

  fetchMutation = async (
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          mutationOptions?: MutationOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          mutationOptions?: MutationOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
  ): Promise<FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>> => {
    const [input, mutationOptionsProvided, fetchOptions] = args
    const mutationOptions = this.getMutationOptions(mutationOptionsProvided, fetchOptions)
    const queryClient = _ssItems.__POINT0_QUERY_CLIENT__.get()
    const mutation = queryClient.getMutationCache().build(queryClient, mutationOptions as any)
    return (await mutation.execute(input as any)) as FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
  }

  fetch = async (
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [input?: InputsRaw<TServerInputSchema, TClientInputSchema>]
      : [input: InputsRaw<TServerInputSchema, TClientInputSchema>]
  ): Promise<
    TQueryResultType extends 'infiniteQuery'
      ? InfiniteData<FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>>
      : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
  > => {
    if (this.type === 'mutation') {
      return this.fetchMutation(...args) as never
    }
    if (this._queryResultType === 'infiniteQuery') {
      return this.fetchInfiniteQuery(...args) as never
    }
    return this.fetchQuery(...args) as never
  }

  async _callPrefetchFns({ preventPrefetchFns }: { preventPrefetchFns?: boolean | OnPrefetchFn[] }): Promise<void> {
    const prefetchFns =
      preventPrefetchFns === true ? new Set<OnPrefetchFn>() : new Set<OnPrefetchFn>([...this._onPrefetchFns])
    if (Array.isArray(preventPrefetchFns)) {
      for (const fn of preventPrefetchFns) {
        if (prefetchFns.has(fn)) {
          prefetchFns.delete(fn)
        }
      }
    }
    await Promise.all(
      Array.from(prefetchFns).map(async (fn) => {
        await fn()
      }),
    )
  }

  private _prepareFetchQuery({
    input,
    mode,
    queryClient: providedQueryClient,
    queryOptions: providedQueryOptions,
    fetchOptions,
    outputType,
    location,
  }: {
    input: InputsRaw<any, any>
    mode: QueryMode
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions
    fetchOptions?: FetchOptions
    outputType?: FetchServerOutputType
    location?: AnyLocation
  }):
    | false
    | {
        cacheData: QueriedData<any, any>
        queryOptions: UseQueryOptions<any, any, any, any>
        queryClient: QueryClient
      } {
    if (!this._hasServerLoader() && !this._hasClientLoader()) {
      return false
    }
    if (!this._hasClientLoader() && mode === 'client') {
      return false
    }
    if (!this._hasServerLoader() && mode === 'server') {
      return false
    }
    const suitablePointTypes = ['page', 'query', 'infiniteQuery', 'component', 'layout', 'provider']
    if (!suitablePointTypes.includes(this.type)) {
      return false
    }
    const queryClient = providedQueryClient ?? _ssItems.__POINT0_QUERY_CLIENT__.get()
    const queryOptions = this.getQueryOptions(input as never, providedQueryOptions, {
      location,
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
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            cacheOnly?: TCacheOnly
            mode?: TMode
            outputType?: FetchServerOutputType
          },
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            location?: AnyLocation
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
        ? QueriedData<TQueryResultType, TServerLoaderOutput>
        : TMode extends 'client'
          ? QueriedData<TQueryResultType, TClientLoaderOutput>
          : TMode extends 'serverAndClient'
            ? QueriedData<TQueryResultType, FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
            : never
      :
          | (TMode extends 'server'
              ? QueriedData<TQueryResultType, TServerLoaderOutput>
              : TMode extends 'client'
                ? QueriedData<TQueryResultType, TClientLoaderOutput>
                : TMode extends 'serverAndClient'
                  ? QueriedData<TQueryResultType, FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
                  : never)
          | undefined
  > {
    const [input, providedQueryOptions, options = {}] = args
    const {
      location,
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
      location,
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
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchServerOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
          },
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchServerOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
          },
        ]
  ): Promise<void> {
    const [input, providedQueryOptions, options = {}] = args
    const {
      location,
      queryClient: providedQueryClient,
      fetchOptions,
      outputType,
      force,
      mode = 'serverAndClient',
      preventPrefetchFns = false,
    } = options
    const preparedFetch = this._prepareFetchQuery({
      input,
      mode,
      queryClient: providedQueryClient,
      queryOptions: providedQueryOptions,
      fetchOptions,
      outputType,
      location,
    })
    if (!preparedFetch) {
      return
    }
    const { cacheData, queryOptions, queryClient } = preparedFetch
    if (cacheData && !force) {
      return
    }
    await Promise.all([this._callPrefetchFns({ preventPrefetchFns }), queryClient.prefetchQuery(queryOptions as never)])
  }

  private _prepareFetchInfiniteQuery({
    input,
    mode,
    queryClient: providedQueryClient,
    infiniteQueryOptions: providedInfiniteQueryOptions,
    fetchOptions,
    outputType,
    location,
  }: {
    input: InputsRaw<any, any>
    mode: QueryMode
    queryClient?: QueryClient
    infiniteQueryOptions?: ExtraUseInfiniteQueryOptions<any, any, any, any, any, any>
    fetchOptions?: FetchOptions
    outputType?: FetchServerOutputType
    location?: AnyLocation
  }):
    | false
    | {
        cacheData: QueriedData<any, any>
        infiniteQueryOptions: UseInfiniteQueryOptions<any, any, any, any>
        queryClient: QueryClient
      } {
    if (!this._hasServerLoader() && !this._hasClientLoader()) {
      return false
    }
    if (!this._hasClientLoader() && mode === 'client') {
      return false
    }
    if (!this._hasServerLoader() && mode === 'server') {
      return false
    }
    const suitablePointTypes = ['page', 'query', 'infiniteQuery', 'component', 'layout', 'provider']
    if (!suitablePointTypes.includes(this.type)) {
      return false
    }
    const queryClient = providedQueryClient ?? _ssItems.__POINT0_QUERY_CLIENT__.get()
    const infiniteQueryOptions = this.getInfiniteQueryOptions(input as never, providedInfiniteQueryOptions, {
      location,
      queryClient,
      fetchOptions,
      outputType,
      mode,
    })
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: infiniteQueryOptions.queryKey as never })
    return { cacheData: query?.state.data, infiniteQueryOptions, queryClient }
  }

  async fetchInfiniteQuery<TMode extends QueryMode = 'serverAndClient', TCacheOnly extends boolean = false>(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputsRaw<TServerInputSchema, TClientInputSchema>,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                Error0,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            cacheOnly?: TCacheOnly
            mode?: TMode
            outputType?: FetchServerOutputType
          },
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputsRaw<TServerInputSchema, TClientInputSchema>,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                Error0,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            location?: AnyLocation
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
        ? QueriedData<TQueryResultType, TServerLoaderOutput>
        : TMode extends 'client'
          ? QueriedData<TQueryResultType, TClientLoaderOutput>
          : TMode extends 'serverAndClient'
            ? QueriedData<TQueryResultType, FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
            : never
      :
          | (TMode extends 'server'
              ? QueriedData<TQueryResultType, TServerLoaderOutput>
              : TMode extends 'client'
                ? QueriedData<TQueryResultType, TClientLoaderOutput>
                : TMode extends 'serverAndClient'
                  ? QueriedData<TQueryResultType, FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
                  : never)
          | undefined
  > {
    const [input, providedInfiniteQueryOptions, options = {}] = args
    const {
      location,
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
      location,
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
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputsRaw<TServerInputSchema, TClientInputSchema>,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                Error0,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchServerOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
          },
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputsRaw<TServerInputSchema, TClientInputSchema>,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                Error0,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchServerOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
          },
        ]
  ): Promise<void> {
    const [input, providedInfiniteQueryOptions, options = {}] = args
    const {
      location,
      queryClient: providedQueryClient,
      fetchOptions,
      outputType,
      force,
      mode = 'serverAndClient',
      preventPrefetchFns = false,
    } = options
    const preparedFetch = this._prepareFetchInfiniteQuery({
      input,
      mode,
      queryClient: providedQueryClient,
      infiniteQueryOptions: providedInfiniteQueryOptions,
      fetchOptions,
      outputType,
      location,
    })
    if (!preparedFetch) {
      return
    }
    const { cacheData, infiniteQueryOptions, queryClient } = preparedFetch
    if (cacheData && !force) {
      return
    }
    await Promise.all([
      this._callPrefetchFns({ preventPrefetchFns }),
      queryClient.prefetchInfiniteQuery(infiniteQueryOptions as never),
    ])
  }

  private async _prefetchPageQueryClientDehydratedState({
    input,
    queryClient,
    queryOptions,
    fetchOptions,
    force,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions
    fetchOptions?: FetchOptions
    force?: boolean
  }): Promise<void> {
    if (this.type !== 'page') {
      throw new Error('Point type is not page')
    }
    queryClient ??= _ssItems.__POINT0_QUERY_CLIENT__.get()
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
      throw new Error('Dehydrated state not found')
    }
    hydrate(queryClient, data.dehydratedState)
  }

  async prefetchPage(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?:
            | undefined
            | (TQueryResultType extends 'infiniteQuery'
                ? Partial<
                    ExtraUseInfiniteQueryOptions<
                      InputsRaw<TServerInputSchema, TClientInputSchema>,
                      FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                      Error0,
                      InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                      QueryKey,
                      unknown
                    >
                  >
                : Partial<ExtraUseQueryOptions>),
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            policy?: PagePrefetchPolicy
          },
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?:
            | undefined
            | (TQueryResultType extends 'infiniteQuery'
                ? Partial<
                    ExtraUseInfiniteQueryOptions<
                      InputsRaw<TServerInputSchema, TClientInputSchema>,
                      FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                      Error0,
                      InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                      QueryKey,
                      unknown
                    >
                  >
                : Partial<ExtraUseQueryOptions>),
          options?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            policy?: PagePrefetchPolicy
          },
        ]
  ): Promise<void> {
    const [input = {}, queryOptions, options = {}] = args
    const { location: providedLocation, queryClient, fetchOptions, force, policy = this._getPrefetchPolicy() } = options
    if (policy === 'none') {
      return
    }

    if (!this.route) {
      throw new Error('Route is not set')
    }
    const location = providedLocation ?? this.route.getLocation(this.route.flat(input))

    const queryClientDehydratedStateWasPrefetched = await (async () => {
      if (policy === 'queryClientDehydratedState' || policy === 'everything') {
        if (!this._root?._ssr) {
          if (policy === 'queryClientDehydratedState') {
            throw new Error('Query client dehydrated state can be prefetched only when ssr is enabled')
          }
          return false
        }
        await this._prefetchPageQueryClientDehydratedState({
          queryClient,
          input: input as never,
          queryOptions,
          fetchOptions,
          force,
        })
        return true
      }
      return false
    })()

    if (policy === 'queryClientDehydratedState') {
      return
    }

    const allRelatedPoints = [this as never as ReadyPoint, ...this._layouts]
    const uniqRelatedPoints = [...new Set<AnyPoint>(allRelatedPoints)]
    const uniqPrefetchFns = [...new Set<OnPrefetchFn>([...uniqRelatedPoints.flatMap((p) => p._onPrefetchFns)])]

    const onPrefetchFnsPromise = Promise.all(
      uniqPrefetchFns.map(async (fn) => {
        return await fn()
      }),
    )

    const queriesPrefetching = Promise.all(
      uniqRelatedPoints.flatMap(async (p) => {
        if (policy === 'onPrefetchOnly') {
          return []
        }
        if (policy === 'everything' && !p._hasClientLoader()) {
          return []
        }
        if (policy === 'clientQuery' && !p._hasClientLoader()) {
          return []
        }
        const inputHere = p === (this as never as ReadyPoint) ? input : p._getUnsafeInputRawByLocation(location)
        const mode =
          policy === 'everything'
            ? // server queries was prefetched on prefetchPageQueryClientDehydratedState step
              queryClientDehydratedStateWasPrefetched
              ? 'client'
              : 'serverAndClient'
            : {
                serverQuery: 'server' as const,
                clientQuery: 'client' as const,
                serverClientQuery: 'serverAndClient' as const,
              }[policy]
        if (p._queryResultType === 'infiniteQuery') {
          return await p.prefetchInfiniteQuery(inputHere as never, queryOptions as never, {
            queryClient,
            location,
            fetchOptions,
            force,
            mode,
            preventPrefetchFns: true,
          })
        } else {
          return await p.prefetchQuery(inputHere as never, queryOptions, {
            queryClient,
            location,
            fetchOptions,
            force,
            mode,
            preventPrefetchFns: true,
          })
        }
      }),
    )

    await Promise.all([queriesPrefetching, onPrefetchFnsPromise])
  }

  // mountable components

  private static readonly _usePrevHeadsAndSetPageState = ({
    pageState,
    pageStateManager,
    prevMountActions,
  }: {
    pageState: RouterPageState
    pageStateManager: {
      pageState: RouterPageState
      setPageState: React.Dispatch<React.SetStateAction<RouterPageState>>
    }
    prevMountActions: Array<{ action: MountAction; state: MountableState<any, any, any, any, any> }>
  }) => {
    React.useEffect(() => {
      // pageStateManager.setPageState(pageState)
    }, [pageState.status, pageState.error?.message])
    for (const { action, state } of prevMountActions) {
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (action.type) {
        case 'head': {
          const headFnResult = action.fn(state)
          const headFnResultResolvable = typeof headFnResult === 'string' ? { title: headFnResult } : headFnResult
          useHead(headFnResultResolvable)
          continue
        }
        case 'globalHead': {
          const headFnResult = action.fn({ ...pageState, location: state.location })
          const headFnResultResolvable = typeof headFnResult === 'string' ? { title: headFnResult } : headFnResult
          useHead(headFnResultResolvable)
          continue
        }
      }
    }
  }

  private static readonly _createBoundLoadingComponent = ({
    componentVariant,
    pageStateManager,
    prevMountActions,
    isHeadable,
    fallbackLoadingComponent,
  }: {
    componentVariant: DestinationComponentVariant
    pageStateManager: {
      pageState: RouterPageState
      setPageState: React.Dispatch<React.SetStateAction<RouterPageState>>
    }
    prevMountActions: Array<{ action: MountAction; state: MountableState<any, any, any, any, any> }>
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
            error: null,
            loading: true,
            initial: false,
          },
          pageStateManager,
          prevMountActions,
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
  }: {
    componentVariant: DestinationComponentVariant
    pageStateManager: {
      pageState: RouterPageState
      setPageState: React.Dispatch<React.SetStateAction<RouterPageState>>
    }
    prevMountActions: Array<{ action: MountAction; state: MountableState<any, any, any, any, any> }>
    isHeadable: boolean
    fallbackErrorComponent: ErrorComponentType<any>
  }): React.ComponentType<{ error: Error; _isHeadable?: boolean }> => {
    const errorComponent =
      prevMountActions.flatMap(({ action }) => (action.type === 'errorComponent' ? [action.Component] : [])).at(-1) ??
      fallbackErrorComponent
    return ({ error, _isHeadable = isHeadable }: { error: Error; _isHeadable?: boolean }) => {
      const error0 = Error0.from(error)
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
        })
      }
      return React.createElement(errorComponent, {
        type: componentVariant,
        error: error0,
      })
    }
  }

  private readonly _getMountable = (props: {
    inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
    outerProps: TOuterProps
    mountComponent:
      | LayoutSuccessComponentType<any, any, any, any>
      | PageSuccessComponentType<any, any, any, any>
      | ComponentSuccessComponentType<any, any, any>
      | 'children'
    extraProps: (mountableState: MountableState<any, any, any, any, any>) => Record<string, any>

    level?: number
    queryIndex?: number
    location?: AnyLocation
    pageStateManager?: {
      pageState: RouterPageState
      setPageState: React.Dispatch<React.SetStateAction<RouterPageState>>
    }
    prev?: {
      prevMountActions: Array<{ action: MountAction; state: MountableState<any, any, any, any, any> }>
      nextMountActions: MountAction[]
      innerProps: Props
      queries: QueriesResults
      mappedData: Data | undefined
      LoadingComponent: React.ComponentType<{ _isHeadable?: boolean }>
      ErrorComponent: React.ComponentType<{ error: Error; _isHeadable?: boolean }>
    }
  }): Exclude<React.ReactNode, Promise<any>> => {
    const {
      inputRaw,
      outerProps,
      mountComponent,
      extraProps,
      location = useLocation(),
      level = 0,
      queryIndex = 0,
      prev,
      pageStateManager = _usePageStateManager(),
    } = props

    const componentVariant = this._getDestinationComponentVariant() ?? 'page'
    const isHeadable = this.type === 'page' || this.type === 'layout'
    const fallbackLoadingComponent =
      {
        page: this._pageLoadingComponent,
        component: this._componentLoadingComponent,
        layout: this._layoutLoadingComponent,
      }[componentVariant] ?? Point0.DefaultLoadingComponent
    const fallbackErrorComponent =
      {
        page: this._pageErrorComponent,
        component: this._componentErrorComponent,
        layout: this._layoutErrorComponent,
      }[componentVariant] ?? Point0.DefaultErrorComponent

    const {
      nextMountActions,
      prevMountActions,
      PrevLoadingComponent,
      PrevErrorComponent,
      prevInnerProps,
      prevQueries,
      prevMappedData,
    } = (() => {
      if (!prev) {
        const prevInnerProps = {}

        const prevQueries: QueriesResults = []

        return {
          nextMountActions: this._mountActions,
          prevMountActions: [] as Array<{ action: MountAction; state: MountableState<any, any, any, any, any> }>,
          PrevLoadingComponent: undefined,
          PrevErrorComponent: undefined,
          prevInnerProps,
          prevQueries,
          prevMappedData: undefined,
        }
      } else {
        return {
          nextMountActions: prev.nextMountActions,
          prevMountActions: [...prev.prevMountActions],
          PrevLoadingComponent: prev.LoadingComponent,
          PrevErrorComponent: prev.ErrorComponent,
          prevInnerProps: prev.innerProps,
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
          error: Error0.from(error),
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
    })() as Pick<MountableState<any, any, any, any, any>, 'status' | 'error' | 'loading' | 'data'>

    const mountState = {
      ...queriesState,
      location,
      input: inputRaw,
      props: prevInnerProps,
      queries: prevQueries,
    } as MountableState<any, any, any, any, any>
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

    // use memo loop until breaking action and return thin breaking action, then outside loop operate with it
    // dynamic state calculates on first level and sending to next levels, queries come to first level also to allQueries

    const currentMountActions = [...nextMountActions]
    for (const action of nextMountActions) {
      prevMountActions.push({ action, state: mountState })
      currentMountActions.shift()

      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (action.type) {
        case 'errorComponent': {
          ErrorComponent = React.useCallback(
            Point0._createBoundErrorComponent({
              componentVariant,
              pageStateManager,
              prevMountActions,
              isHeadable,
              fallbackErrorComponent,
            }),
            [],
          )
          continue
        }
        case 'loadingComponent': {
          LoadingComponent = React.useCallback(
            Point0._createBoundLoadingComponent({
              componentVariant,
              pageStateManager,
              prevMountActions,
              isHeadable,
              fallbackLoadingComponent,
            }),
            [],
          )
          continue
        }
        case 'selfProps': {
          mountState.props = { ...mountState.props, ...outerProps }
          continue
        }
        case 'head':
        case 'globalHead': {
          if (isHeadable) {
            ErrorComponent = React.useCallback(
              Point0._createBoundErrorComponent({
                componentVariant,
                pageStateManager,
                prevMountActions,
                isHeadable,
                fallbackErrorComponent,
              }),
              [],
            )
            LoadingComponent = React.useCallback(
              Point0._createBoundLoadingComponent({
                componentVariant,
                pageStateManager,
                prevMountActions,
                isHeadable,
                fallbackLoadingComponent,
              }),
              [],
            )
          }
          continue
        }
        case 'mapper': {
          if (mountState.status === 'success') {
            nextMappedData = action.fn({
              location: mountState.location,
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

      const _nextMountableProps = {
        inputRaw,
        outerProps,
        mountComponent,
        extraProps,
        level: level + 1,
        queryIndex,
        location,
        pageStateManager,
        prev: {
          LoadingComponent,
          ErrorComponent,
          nextMountActions: currentMountActions,
          prevMountActions,
          innerProps: mountState.props,
          queries: mountState.queries,
          mappedData: nextMappedData,
        },
      } satisfies Parameters<typeof this._getMountable>[0]

      switch (action.type) {
        case 'wrapper': {
          return React.createElement(action.Component, {
            ...mountState,
            children: React.createElement(this._getMountable, _nextMountableProps),
            LoadingComponent,
            ErrorComponent,
          })
        }
        case 'with': {
          const result = action.fn(mountState)
          if (result === 'loading') {
            return React.createElement(LoadingComponent)
          } else if (result instanceof Error) {
            return React.createElement(ErrorComponent, {
              error: result,
            })
          } else {
            return React.createElement(this._getMountable, {
              ..._nextMountableProps,
              prev: {
                ..._nextMountableProps.prev,
                innerProps: { ..._nextMountableProps.prev.innerProps, ...(result || {}) },
              },
            })
          }
        }
        case 'query': {
          const queryFnResult = action.fn(mountState)
          const queries = Array.isArray(queryFnResult) ? queryFnResult : [queryFnResult]
          return React.createElement(this._getMountable, {
            ..._nextMountableProps,
            queryIndex: queryIndex + queries.length,
            prev: {
              ..._nextMountableProps.prev,
              queries: [..._nextMountableProps.prev.queries, ...queries],
            },
          })
        }
        case 'selfQuery': {
          const queryResult =
            this._queryResultType === 'infiniteQuery'
              ? this.useInfiniteQuery(inputRaw as never)
              : this.useQuery(inputRaw as never)
          const queries = [queryResult]
          return React.createElement(this._getMountable, {
            ..._nextMountableProps,
            queryIndex: queryIndex + 1,
            prev: {
              ..._nextMountableProps.prev,
              queries: [..._nextMountableProps.prev.queries, ...queries],
            },
          })
        }
      }

      // @ts-expect-error -- we know that this is not possible, but to not forget add case for new action type
      throw new Error(`Unknown mount action type: ${action.type}`)
    }

    // so we come to the end and can return mount component

    if (isHeadable) {
      const pageState = {
        status: mountState.status,
        error: mountState.error,
        loading: mountState.loading,
      } as RouterPageState
      Point0._usePrevHeadsAndSetPageState({
        pageState,
        pageStateManager,
        prevMountActions,
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
      TServerInputSchema,
      TClientInputSchema,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()

    const { inputRaw, restProps } = React.useMemo<{
      inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
      restProps: TOuterProps
    }>(() => {
      const { input: providedInput, ...restProps } = props as any
      const inputRaw = { ...this._getUnsafeInputRawByLocation(location), ...providedInput }
      return { inputRaw, restProps }
    }, [props, location])

    const { prevLocation, status } = useRouterContext()
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

    return this._getMountable({
      inputRaw,
      outerProps: restProps,
      extraProps: () => {
        return { location }
      },
      mountComponent: this._page as never,
    })
  }

  Component = (
    props: ComponentSelfProps<
      TServerInputSchema,
      TClientInputSchema,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const { inputRaw, restProps } = React.useMemo<{
      inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
      restProps: TOuterProps
    }>(() => {
      const { input: providedInput = {}, ...restProps } = props as any
      const inputRaw = { ...providedInput }
      return { inputRaw, restProps }
    }, [props])

    return this._getMountable({
      inputRaw,
      outerProps: restProps,
      extraProps: () => {
        return {}
      },
      mountComponent: this._component as never,
    })
  }

  Layout = (
    props: LayoutSelfProps<
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()

    const { inputRaw, children, restProps } = React.useMemo<{
      inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
      children: React.ReactNode
      restProps: TOuterProps
    }>(() => {
      const { input: providedInput = {}, children, ...restProps } = props as any
      const inputRaw = { ...this._getUnsafeInputRawByLocation(location), ...providedInput }
      return { inputRaw, children, restProps }
    }, [props, location])

    return this._getMountable({
      inputRaw,
      outerProps: restProps,
      extraProps: (mountableState: MountableState<any, any, any, any, any>) => {
        if (!this._ProviderReactContext) {
          throw new Error(`ProviderReactContext not found on point: ${this.scope}.${this.type}.${this.name}`)
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
  private getSsProviderValueKey(input?: InputsRaw<TServerInputSchema, TClientInputSchema>): string {
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
    input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
  ): MountableSuccessData<TQueriesDefinitions, TMapperOutput> {
    const value = superstore.getValue<MountableSuccessData<TQueriesDefinitions, TMapperOutput>>(
      this.getSsProviderValueKey(input),
      'clientServerIsolated',
    )
    if (!value) {
      throw new Error(
        `Provider value not found on point: provider.${this.name}. You should call getValue only after Provider component is mounted and loaded.`,
      )
    }
    return value
  }

  getValueWeak(
    // ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
    //   ? [input?: InputsRaw<TServerInputSchema, TClientInputSchema>]
    //   : [input: InputsRaw<TServerInputSchema, TClientInputSchema>]
    input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
  ): MountableSuccessData<TQueriesDefinitions, TMapperOutput> | undefined {
    const value = superstore.getValueWeak<MountableSuccessData<TQueriesDefinitions, TMapperOutput>>(
      this.getSsProviderValueKey(input),
      'clientServerIsolated',
    )
    return value
  }

  Provider = (
    props: ProviderSelfProps<
      TServerInputSchema,
      TClientInputSchema,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const { inputRaw, children, restProps } = React.useMemo<{
      inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
      children: React.ReactNode
      restProps: TOuterProps
    }>(() => {
      const { input: providedInput = {}, children, ...restProps } = props as any
      const inputRaw = { ...providedInput }
      return { inputRaw, children, restProps }
    }, [props])

    return this._getMountable({
      inputRaw,
      outerProps: restProps,
      extraProps: (mountableState: MountableState<any, any, any, any, any>) => {
        if (!this._ProviderReactContext) {
          throw new Error(`ProviderReactContext not found on point: ${this.scope}.${this.type}.${this.name}`)
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
      throw new Error('useValue not found on point: ' + this.name)
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
}

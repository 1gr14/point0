import { Error0 } from '@devp0nt/error0'
import type { AnyLocation, AnyRoute, CallableRoute, ExactLocation, KnownLocation } from '@devp0nt/route0'
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
import { useMemo } from 'react'
import type { ResolvableHead } from 'unhead/types'
import type { Context } from 'use-context-selector'
import { createContext, useContextSelector } from 'use-context-selector'
import { CookiesStore } from './cookies-store.js'
import { _point0_env } from './env.js'
import { _ssItems, getFakeClient } from './internals.js'
import { PointsManager } from './points-manager.js'
import { Response0 } from './response0.js'
import { useLocation, useRouterContext } from './router.js'
import { superstore } from './super-store.js'
import type {
  AnyPoint,
  AnyUseLoaderResult,
  AppendCtx,
  AppendCtxExposedKeys,
  AppendLoaderOutput,
  AppendMapperOutput,
  AssertInputSchemaAssignable,
  AssertInputSchemaNotWider,
  AssertNoForbiddenCtxExposedKeys,
  AssertNoForbiddenMethodsIfNotSuitableStage,
  AssertUseNoLoaderMapperConflict,
  BasePoint,
  ClientExecuteAction,
  ClientExecuteDetailedResult,
  ClientLoaderFn,
  ClientMapperFn,
  ComponentComponent,
  Ctx,
  CtxExposedKeys,
  CtxFn,
  CurrentRouteDefinition,
  CustomValidationFn,
  CustomValidationFnToRecordValidationSchema,
  Data,
  DataTransformer,
  DataTransformerExtended,
  DestinationComponentType,
  EmptyCtx,
  EmptyData,
  EndPoint,
  EndPointType,
  EndPointTypeOrNever,
  ErrorComponentType,
  ErrorHeadFn,
  ExtendRouteDefinition,
  ExtraUseInfiniteQueryOptions,
  ExtraUseQueryOptions,
  FetchDetailedOutput,
  FetchFn,
  FetchOptions,
  FetchOptionsFn,
  FetchOptionsOrFn,
  FetchOutput,
  FetchOutputType,
  FinalLoaderData,
  FinalLoaderMappedOutput,
  FinalProps,
  HeadFn,
  IfAnyThenElse,
  Infer,
  InferCtxFnOutputCtxAppend,
  InferCtxFnOutputCtxExposedKeys,
  InputParseResult,
  InputParsed,
  InputRaw,
  InputSchema,
  InputsRaw,
  InputsRawMaybeOptional,
  IsInputOptional,
  IsInputSchemaConflicts,
  IsInputsOptional,
  IsRouteDefinitionConflicts,
  LayoutComponent,
  LayoutPoint,
  LoaderFn,
  LoaderOutput,
  LoadingComponentType,
  LoadingHeadFn,
  MapperOutput,
  MergeRecordValidationSchemas,
  MiddlewareFn,
  MountableComponent,
  MountableComponentProps,
  MountablePointType,
  NiceBaseEndPoint,
  NiceComponentEndPoint,
  NiceInfiniteQueryEndPoint,
  NiceLayoutEndPoint,
  NiceMutationEndPoint,
  NicePageEndPoint,
  NicePluginEndPoint,
  NicePluginStagePoint,
  NiceProviderEndPoint,
  NiceQueryEndPoint,
  NiceRootEndPoint,
  NiceRootStagePoint,
  NiceStagePoint,
  OnPrefetchFn,
  OuterComponentType,
  PageComponent,
  PagePrefetchPolicy,
  PartialUseInfiniteQueryOptions,
  PointName,
  PointType,
  PointsScope,
  PrependCtx,
  Props,
  QueriedData,
  QueryKey,
  QueryMode,
  QueryResultType,
  RecordValidationSchema,
  RenderablePointType,
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
  SuccessHeadFn,
  UndefinedComponentComponent,
  UndefinedCtx,
  UndefinedCtxExposedKeys,
  UndefinedData,
  UndefinedEndPointType,
  UndefinedInputSchema,
  UndefinedLayoutComponent,
  UndefinedLoaderOutput,
  UndefinedMapperOutput,
  UndefinedPageComponent,
  UndefinedProps,
  UndefinedQueryResultType,
  UndefinedRoute,
  UndefinedRouteDefinition,
  UseInfiniteQueryOptions,
  UsePointQueryResult,
  UseQueryOptions,
  WrapperComponentType,
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
// outer: both, prune on nossr-server

// scrollPosition: client, prune on server
// scrollRestore: client, prune on server
// prefetchPolicy: both, nothing to prune (but in fact right now not used in server code)
// onPrefetch: client, prune on server
// prefetchOnLinkHover: client, prune on server

// transformer: both, nothing to prune

// ctx: server, prune on client
// loader: server, prune on client

// clientLoader: client, prune on server

// mapper: both, nothing to prune

// head: both, nothing to prune
// props: both, nothing to prune
// input: both, nothing to prune

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
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TProps extends Props | UndefinedProps,
> {
  Infer: Infer<
    TPointType,
    TLetsEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
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
  private readonly _letsEndPointType: TLetsEndPointType
  // TODO:ASAP it is false or undefined
  private readonly _transformer: DataTransformerExtended | undefined
  _getTransformer = () => this._transformer ?? blankDataTransformerExtended
  readonly _ssr: boolean
  readonly scope: PointsScope
  readonly scopes: PointsScope[]
  private readonly _headFns: HeadFn[]
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
  readonly _sameQueryPoint: EndPoint | null | undefined
  readonly _getSameQueryPoint = () => this._sameQueryPoint ?? null
  readonly _relatedQueryPoints: EndPoint[]
  // readonly _asFormData: boolean | undefined
  private readonly _wrappers: WrapperComponentType[]
  private readonly _outers: OuterComponentType[]
  readonly _serverExecuteActions: ServerExecuteAction[]
  private readonly _clientExecuteActions: ClientExecuteAction[]
  private readonly _clientMapperFns: Array<ClientMapperFn<any, any, any, any, any>>
  private readonly _useValue: undefined | ((point: AnyPoint, keys?: string | string[] | undefined) => any)
  readonly route: TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute
  private readonly _page:
    | PageComponent<
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TRouteDefinition,
        TClientInputSchema,
        TProps
      >
    | UndefinedPageComponent
  private readonly _component:
    | ComponentComponent<
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        TProps
      >
    | UndefinedComponentComponent
  private readonly _layout:
    | LayoutComponent<
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TRouteDefinition,
        TClientInputSchema,
        TProps
      >
    | UndefinedLayoutComponent
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
  private readonly _ProviderReactContext:
    | Context<FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>>
    | undefined
  private readonly _errorComponent:
    | ErrorComponentType<
        DestinationComponentType,
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        TProps
      >
    | undefined
  private static readonly DefaultErrorComponent: ErrorComponentType<any, any, any, any, any, any, any> = ({
    error,
  }) => {
    const { stack, ...json } = error.toJSON()
    // TODO: move console.error to .onClientError
    console.error(error)
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('pre', null, JSON.stringify(json, null, 2)),
      React.createElement('pre', null, stack),
    )
  }
  private readonly _layoutErrorComponent:
    | ErrorComponentType<
        DestinationComponentType,
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        TProps
      >
    | undefined
  private readonly _pageErrorComponent:
    | ErrorComponentType<
        DestinationComponentType,
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        TProps
      >
    | undefined
  private readonly _componentErrorComponent:
    | ErrorComponentType<
        DestinationComponentType,
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        TProps
      >
    | undefined
  private readonly _layoutLoadingComponent:
    | LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        TProps
      >
    | undefined
  static readonly DefaultLoadingComponent: LoadingComponentType<any, any, any, any, any, any, any> = () =>
    React.createElement(React.Fragment, null, 'Loading...')
  private readonly _loadingComponent:
    | LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        TProps
      >
    | undefined
  private readonly _pageLoadingComponent:
    | LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        TProps
      >
    | undefined
  private readonly _componentLoadingComponent:
    | LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        TProps
      >
    | undefined
  private readonly _getComponentLoadingComponent = () =>
    this._componentLoadingComponent ?? Point0.DefaultLoadingComponent
  X: TPointType extends 'layout'
    ? MountableComponent<TServerInputSchema, TClientInputSchema, TProps, true>
    : TPointType extends 'page'
      ? MountableComponent<TServerInputSchema, TClientInputSchema, TProps, false>
      : TPointType extends 'component'
        ? MountableComponent<TServerInputSchema, TClientInputSchema, TProps, false>
        : TPointType extends 'provider'
          ? MountableComponent<TServerInputSchema, TClientInputSchema, TProps, null>
          : null

  private constructor(options: {
    type: TPointType
    _letsEndPointType: TLetsEndPointType
    _base?: BasePoint | LayoutPoint | undefined
    _root?: RootPoint | undefined
    _middlewares?: MiddlewareFn[] | undefined
    _serverurl?: string | undefined
    _baseurl?: string | null | undefined
    _transformer?: DataTransformerExtended | undefined
    _ssr?: boolean
    scope: PointsScope
    scopes: PointsScope[]
    _wrappers?: WrapperComponentType[]
    _outers?: OuterComponentType[]
    _headFns?: HeadFn[]
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
    _sameQueryPoint?: EndPoint | null | undefined
    _relatedQueryPoints?: EndPoint[]
    // _asFormData?: boolean | undefined
    _serverExecuteActions?: ServerExecuteAction[]
    _clientExecuteActions?: ClientExecuteAction[]
    _clientMapperFns?: ClientMapperFn[]
    _ProviderReactContext?:
      | Context<
          FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
        >
      | undefined
    _useValue?: any
    route?: TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute
    _page?:
      | PageComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TRouteDefinition,
          TClientInputSchema,
          TProps
        >
      | UndefinedPageComponent
    _component?:
      | ComponentComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TProps
        >
      | UndefinedComponentComponent
    _layout?:
      | LayoutComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TRouteDefinition,
          TClientInputSchema,
          TProps
        >
      | UndefinedLayoutComponent
    _layouts?: LayoutPoint[]
    name: PointName
    _fetchOptions?: FetchOptionsFn
    _scrollPositionGetter?: ScrollPositionGetter | undefined
    _scrollPositionSetter?: ScrollPositionSetter | undefined
    _scrollPositionRestorePolicy?: ScrollPositionRestorePolicy | undefined
    _prefetchPolicy?: PagePrefetchPolicy | undefined
    _onPrefetchFns?: OnPrefetchFn[]
    _polh?: boolean | number | undefined
    _errorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TProps
    >
    _layoutErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TProps
    >
    _pageErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TProps
    >
    _componentErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TProps
    >
    _loadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TProps
    >
    _layoutLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TProps
    >
    _pageLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TProps
    >
    _componentLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TProps
    >
    X?: MountableComponent<any, any, any, any> | null
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
    this._letsEndPointType = options._letsEndPointType
    this._wrappers = options._wrappers ?? []
    this._outers = options._outers ?? []
    this._headFns = options._headFns ?? []
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
    this._sameQueryPoint = options._sameQueryPoint ?? undefined
    this._relatedQueryPoints = options._relatedQueryPoints ?? []
    // this._asFormData = options._asFormData
    this._serverExecuteActions = options._serverExecuteActions ?? []
    this._clientExecuteActions = options._clientExecuteActions ?? []
    this._clientMapperFns = options._clientMapperFns ?? []
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
    TLetsEndPointType extends EndPointType | UndefinedEndPointType,
    TRequiredCtx extends RequiredCtx,
    TCtx extends Ctx,
    TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
    TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
    TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
    TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
    TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
    TServerInputSchema extends InputSchema | UndefinedInputSchema,
    TClientInputSchema extends InputSchema | UndefinedInputSchema,
    TQueryResultType extends QueryResultType | UndefinedQueryResultType,
    TProps extends Props | UndefinedProps,
  >(overrides: {
    type?: TPointType
    scope?: PointsScope
    scopes?: PointsScope[]
    _letsEndPointType?: TLetsEndPointType
    _base?: BasePoint | LayoutPoint | undefined
    _root?: RootPoint | undefined
    _middlewares?: MiddlewareFn[]
    _serverurl?: string | undefined
    _baseurl?: string | null | undefined
    _transformer?: DataTransformerExtended | null
    _ssr?: boolean
    _headFns?: HeadFn[]
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
    _sameQueryPoint?: EndPoint | null | undefined
    _relatedQueryPoints?: EndPoint[]
    // _asFormData?: boolean | undefined
    _wrappers?: WrapperComponentType[]
    _outers?: OuterComponentType[]
    _serverExecuteActions?: ServerExecuteAction[]
    _clientExecuteActions?: ClientExecuteAction[]
    _clientMapperFns?: ClientMapperFn[]
    _ProviderReactContext?:
      | Context<
          FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
        >
      | undefined
    _useValue?: any
    route?: IfAnyThenElse<
      TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute,
      AnyRoute
    >
    _page?:
      | PageComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TRouteDefinition,
          TClientInputSchema,
          TProps
        >
      | UndefinedPageComponent
    _component?:
      | ComponentComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TProps
        >
      | UndefinedComponentComponent
    _layout?:
      | LayoutComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TRouteDefinition,
          TClientInputSchema,
          TProps
        >
      | UndefinedLayoutComponent
    _layouts?: LayoutPoint[]
    name?: PointName
    _fetchOptions?: FetchOptionsFn
    _scrollPositionGetter?: ScrollPositionGetter | undefined
    _scrollPositionSetter?: ScrollPositionSetter | undefined
    _scrollPositionRestorePolicy?: ScrollPositionRestorePolicy | undefined
    _prefetchPolicy?: PagePrefetchPolicy
    _onPrefetchFns?: OnPrefetchFn[]
    _polh?: boolean | number | undefined
    _errorComponent?:
      | ErrorComponentType<
          DestinationComponentType,
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TProps
        >
      | undefined
    _layoutErrorComponent?:
      | ErrorComponentType<
          DestinationComponentType,
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TProps
        >
      | undefined
    _pageErrorComponent?:
      | ErrorComponentType<
          DestinationComponentType,
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TProps
        >
      | undefined
    _componentErrorComponent?:
      | ErrorComponentType<
          DestinationComponentType,
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TProps
        >
      | undefined
    _loadingComponent?:
      | LoadingComponentType<
          DestinationComponentType,
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TProps
        >
      | undefined
    _layoutLoadingComponent?:
      | LoadingComponentType<
          DestinationComponentType,
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TProps
        >
      | undefined
    _pageLoadingComponent?:
      | LoadingComponentType<
          DestinationComponentType,
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TProps
        >
      | undefined
    _componentLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TProps
    >
    X?: MountableComponent<any, any, any, any> | null
  }): Point0<
    TPointType,
    TLetsEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return new Point0<
      TPointType,
      TLetsEndPointType,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TQueryResultType,
      TProps
    >({
      scope: overrides.scope ?? this.scope,
      scopes: overrides.scopes ?? this.scopes,
      _base: overrides._base ?? this._base,
      _root: overrides._root ?? this._root,
      type: (overrides.type ?? this.type) as TPointType,
      _letsEndPointType: (overrides._letsEndPointType ?? this._letsEndPointType) as TLetsEndPointType,
      _middlewares: overrides._middlewares ?? this._middlewares,
      _serverurl: overrides._serverurl ?? this._serverurl,
      _baseurl: overrides._baseurl ?? this._baseurl,
      _transformer: overrides._transformer ?? this._transformer,
      _ssr: overrides._ssr ?? this._ssr,
      _wrappers: overrides._wrappers ?? this._wrappers,
      _outers: overrides._outers ?? this._outers,
      _headFns: overrides._headFns ?? this._headFns,
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
      _sameQueryPoint: (typeof overrides._sameQueryPoint === 'undefined'
        ? this._sameQueryPoint
        : overrides._sameQueryPoint) as never,
      _relatedQueryPoints: (overrides._relatedQueryPoints ?? this._relatedQueryPoints) as never,
      // _asFormData: overrides._asFormData ?? this._asFormData,
      _serverExecuteActions: overrides._serverExecuteActions ?? this._serverExecuteActions,
      _clientExecuteActions: overrides._clientExecuteActions ?? this._clientExecuteActions,
      _clientMapperFns: overrides._clientMapperFns ?? this._clientMapperFns,
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

  static lets(
    pointType: 'root',
    pointName: string,
  ): NiceRootStagePoint<
    'coreStage',
    'root',
    UndefinedCtx,
    EmptyCtx,
    UndefinedCtxExposedKeys,
    UndefinedLoaderOutput,
    UndefinedLoaderOutput,
    UndefinedMapperOutput,
    UndefinedRoute,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedQueryResultType,
    UndefinedProps
  >
  static lets(
    pointType: 'plugin',
    pointName: string,
  ): NicePluginStagePoint<
    'coreStage',
    'plugin',
    UndefinedCtx,
    EmptyCtx,
    UndefinedCtxExposedKeys,
    UndefinedLoaderOutput,
    UndefinedLoaderOutput,
    UndefinedMapperOutput,
    UndefinedRoute,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedQueryResultType,
    UndefinedProps
  >
  static lets(pointType: 'root' | 'plugin', pointName: string) {
    if (pointType === 'root') {
      return new Point0({
        type: 'coreStage',
        scope: pointName,
        scopes: [pointName],
        _letsEndPointType: 'root',
        name: pointName,
      }) as never
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (pointType === 'plugin') {
      return new Point0({
        type: 'coreStage',
        scope: 'plugin',
        scopes: ['plugin'],
        _letsEndPointType: 'plugin',
        name: pointName,
      }) as never
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Invalid point type: ${pointType}`)
    }
  }

  // root settings

  requireCtx<TExtraRequiredCtx extends Ctx>(): NiceRootStagePoint<
    StagePointTypeOrNever<TPointType>,
    'root',
    AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
    PrependCtx<TCtx, TExtraRequiredCtx>,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({}) as never
  }

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
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
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
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _baseurl: baseurl,
    }) as never
  }

  // general settings

  // not needed, we check File or Blob in input, and then use FormData instead of JSON
  // asFormData(
  //   shouldAddMultipartFormDataHeaderToFetchOptions = true,
  // ): NiceStagePoint<
  //   TPointType,
  //   EndPointTypeOrNever<TLetsEndPointType>,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _ssr: ssr,
    }) as never
  }

  mutationOptions(
    mutationOptions: UseMutationOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultMutationOptions: mutationOptions,
    }) as never
  }

  queryOptions(
    queryOptions: ExtraUseQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultQueryOptions: queryOptions,
    }) as never
  }

  infiniteQueryOptions(
    infiniteQueryOptions: PartialUseInfiniteQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultInfiniteQueryOptions: infiniteQueryOptions,
    }) as never
  }

  pageQueryOptions(
    pageQueryOptions: UseQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultPageQueryOptions: pageQueryOptions,
    }) as never
  }

  componentQueryOptions(
    componentQueryOptions: UseQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultComponentQueryOptions: componentQueryOptions,
    }) as never
  }

  providerQueryOptions(
    providerQueryOptions: UseQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultProviderQueryOptions: providerQueryOptions,
    }) as never
  }

  layoutQueryOptions(
    layoutQueryOptions: UseQueryOptions,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultLayoutQueryOptions: layoutQueryOptions,
    }) as never
  }

  fetchOptions(
    fetchOptionsOrFn: FetchOptionsOrFn,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
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
    errorComponent: TLetsEndPointType extends 'page' | 'layout' | 'component'
      ? FinalLoaderMappedOutput<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput
        > extends Response
        ? ShowError<`${Capitalize<TLetsEndPointType>} can not accept response. Last loader should provide plain object data, not response.`>
        : ErrorComponentType<
            DestinationComponentType,
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TClientInputSchema,
            TProps
          >
      : ErrorComponentType,
  ): NiceStagePoint<
    TLetsEndPointType extends MountablePointType ? 'renderStage' : StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  error(
    ...args: TLetsEndPointType extends 'page'
      ? FinalLoaderMappedOutput<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput
        > extends Response
        ? [ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>]
        : [
            head: ErrorHeadFn<
              TQueryResultType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TClientMapperOutput,
              TClientInputSchema,
              ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
            >,
            pageErrorComponent: ErrorComponentType<
              DestinationComponentType,
              TQueryResultType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TClientMapperOutput,
              TClientInputSchema,
              TProps
            >,
          ]
      : never
  ): NiceStagePoint<
    TLetsEndPointType extends 'page' ? 'renderStage' : StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  error(...args: [head: any, errorComponent: any] | [errorComponent: any]) {
    // in case if we shake pageError for serverNoSsr target
    const [head, errorComponent = () => null] = (args.length === 2 ? args : [undefined, args[0]]) as [
      ErrorHeadFn | undefined,
      ErrorComponentType<any, any, any, any, any, any, any>,
    ]
    // this._applyComponentDisplayName(errorComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsEndPointType || 'unknown') + 'Error',
    // })
    if (this._letsEndPointType === 'page') {
      const headFn = !head ? undefined : typeof head === 'function' ? head : () => head
      const errorHeadFn: HeadFn | undefined = !headFn
        ? undefined
        : (options) => (!options.error ? {} : headFn(options as never))
      return this._continue({
        _headFns: !errorHeadFn ? this._headFns : [...this._headFns, errorHeadFn],
        _errorComponent: errorComponent as never,
      }) as never
    } else if (
      this._letsEndPointType === 'layout' ||
      this._letsEndPointType === 'component' ||
      this._letsEndPointType === 'provider'
    ) {
      return this._continue({
        _errorComponent: errorComponent,
      }) as never
    } else {
      return this._continue({
        _layoutErrorComponent: errorComponent,
        _pageErrorComponent: errorComponent,
        _componentErrorComponent: errorComponent,
      }) as never
    }
  }

  layoutError(
    layoutErrorComponent: ErrorComponentType,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake layoutError for serverNoSsr target
      _layoutErrorComponent: (layoutErrorComponent as never) || (() => null),
      // _layoutErrorComponent: this._applyComponentDisplayName(layoutErrorComponent || (() => null), {
      //   suffix: toCapitalizedCamelCase(this._letsEndPointType || 'unknown') + 'LayoutError',
      // }),
    }) as never
  }

  pageError(
    head: ErrorHeadFn,
    pageErrorComponent: ErrorComponentType,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  pageError(
    pageErrorComponent: ErrorComponentType,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  pageError(
    ...args: [head: ErrorHeadFn, pageErrorComponent: ErrorComponentType] | [pageErrorComponent: ErrorComponentType]
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    // in case if we shake pageError for serverNoSsr target, but as I know we replace it with () => null, but it is safer to keep it
    const [head, pageErrorComponent = () => null] = args.length === 2 ? args : [undefined, args[0]]
    const headFn = !head ? undefined : typeof head === 'function' ? head : () => head
    // this._applyComponentDisplayName(pageErrorComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsEndPointType || 'unknown') + 'PageError',
    // })
    const errorHeadFn: HeadFn | undefined = !headFn
      ? undefined
      : (options) => (!options.error ? {} : headFn(options as never))
    return this._continue({
      _headFns: !errorHeadFn ? this._headFns : [...this._headFns, errorHeadFn],
      _pageErrorComponent: pageErrorComponent as never,
    }) as never
  }

  componentError(
    componentErrorComponent: ErrorComponentType,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake componentError for serverNoSsr target
      _componentErrorComponent: (componentErrorComponent as never) || (() => null),
      // _componentErrorComponent: this._applyComponentDisplayName(componentErrorComponent || (() => null), {
      //   suffix: toCapitalizedCamelCase(this._letsEndPointType || 'unknown') + 'ComponentError',
      // }),
    }) as never
  }

  layoutLoading(
    layoutLoadingComponent: LoadingComponentType,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake layoutLoading for serverNoSsr target
      _layoutLoadingComponent: (layoutLoadingComponent as never) || (() => null),
      // _layoutLoadingComponent: this._applyComponentDisplayName(layoutLoadingComponent || (() => null), {
      //   suffix: toCapitalizedCamelCase(this._letsEndPointType || 'unknown') + 'LayoutLoading',
      // }),
    }) as never
  }

  pageLoading(
    head: LoadingHeadFn,
    pageLoadingComponent: LoadingComponentType,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  pageLoading(
    pageLoadingComponent: LoadingComponentType,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  pageLoading(
    ...args:
      | [head: LoadingHeadFn, pageLoadingComponent: LoadingComponentType]
      | [pageLoadingComponent: LoadingComponentType]
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    // in case if we shake pageLoading for serverNoSsr target, but as I know we replace it with () => null, but it is safer to keep it
    const [head, pageLoadingComponent = () => null] = args.length === 2 ? args : [undefined, args[0]]
    const headFn = !head ? undefined : typeof head === 'function' ? head : () => head
    // this._applyComponentDisplayName(pageLoadingComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsEndPointType || 'unknown') + 'PageLoading',
    // })
    const loadingHeadFn: HeadFn | undefined = !headFn
      ? undefined
      : (options) => (!options.loading ? {} : headFn(options as never))
    return this._continue({
      _headFns: !loadingHeadFn ? this._headFns : [...this._headFns, loadingHeadFn],
      _pageLoadingComponent: pageLoadingComponent as never,
    }) as never
  }

  componentLoading(
    componentLoadingComponent: LoadingComponentType,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake componentLoading for serverNoSsr target
      _componentLoadingComponent: (componentLoadingComponent as never) || (() => null),
      // _componentLoadingComponent: this._applyComponentDisplayName(
      //   // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we shake componentLoading for serverNoSsr target
      //   (componentLoadingComponent as never) || (() => null),
      //   {
      //     suffix: toCapitalizedCamelCase(this._letsEndPointType || 'unknown') + 'ComponentLoading',
      //   },
      // ),
    }) as never
  }

  loading(
    pageLoadingComponent: TLetsEndPointType extends RenderablePointType
      ? FinalLoaderMappedOutput<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput
        > extends Response
        ? ShowError<`${Capitalize<TLetsEndPointType>} can not accept response. Last loader should provide plain object data, not response.`>
        : LoadingComponentType<
            DestinationComponentType,
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TClientInputSchema,
            TProps
          >
      : LoadingComponentType,
  ): NiceStagePoint<
    TLetsEndPointType extends RenderablePointType ? 'renderStage' : StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  loading(
    ...args: TLetsEndPointType extends 'page'
      ? FinalLoaderMappedOutput<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput
        > extends Response
        ? [ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>]
        : [
            head: LoadingHeadFn<
              TQueryResultType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TClientMapperOutput,
              TClientInputSchema,
              ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
            >,
            pageLoadingComponent: LoadingComponentType<
              DestinationComponentType,
              TQueryResultType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TClientMapperOutput,
              TClientInputSchema,
              TProps
            >,
          ]
      : never
  ): NiceStagePoint<
    TLetsEndPointType extends 'page' ? 'renderStage' : StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  loading(...args: [head: any, pageLoadingComponent: any] | [pageLoadingComponent: any]) {
    // in case if we shake pageLoading for serverNoSsr target
    const [head, loadingComponent = () => null] = args.length === 2 ? args : [undefined, args[0]]
    // this._applyComponentDisplayName(loadingComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsEndPointType || 'unknown') + 'Loading',
    // })
    if (this._letsEndPointType === 'page') {
      const headFn = !head ? undefined : typeof head === 'function' ? head : () => head
      const loadingHeadFn: HeadFn | undefined = !headFn
        ? undefined
        : (options) => (!options.error ? {} : headFn(options as never))
      return this._continue({
        _headFns: !loadingHeadFn ? this._headFns : [...this._headFns, loadingHeadFn],
        _loadingComponent: loadingComponent,
      }) as never
    } else if (
      this._letsEndPointType === 'layout' ||
      this._letsEndPointType === 'component' ||
      this._letsEndPointType === 'provider'
    ) {
      return this._continue({
        _loadingComponent: loadingComponent,
      }) as never
    } else {
      return this._continue({
        _layoutLoadingComponent: loadingComponent,
        _pageLoadingComponent: loadingComponent,
        _componentLoadingComponent: loadingComponent,
      }) as never
    }
  }

  wrapper(
    wrapperComponent: TLetsEndPointType extends RenderablePointType
      ? FinalLoaderMappedOutput<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput
        > extends Response
        ? ShowError<`${Capitalize<TLetsEndPointType>} can not accept response. Last loader should provide plain object data, not response.`>
        : WrapperComponentType<
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TClientInputSchema,
            TProps
          >
      : WrapperComponentType<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TProps
        >,
  ): NiceStagePoint<
    'renderStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _wrappers: [
        ...this._wrappers,
        wrapperComponent as never,
        // this._applyComponentDisplayName(wrapperComponent as React.ComponentType<any>, {
        //   suffix: toCapitalizedCamelCase(this._letsEndPointType || 'unknown') + 'Wrapper',
        //   index: this._wrappers.length,
        // }) as never,
      ],
    }) as never
  }

  outer(
    outerComponent: OuterComponentType<TClientInputSchema, TProps, AnyLocation>,
  ): NiceStagePoint<
    'renderStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _outers: [
        ...this._outers,
        outerComponent as never,
        // this._applyComponentDisplayName(outerComponent, {
        //   suffix: toCapitalizedCamelCase(this._letsEndPointType || 'unknown') + 'Outer',
        //   index: this._outers.length,
        // }) as never,
      ],
    }) as never
  }

  // scroll restoration

  scrollPosition(
    documentElementGetter: () => HTMLElement | null,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  scrollPosition(
    selector: string,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  scrollPosition(
    getter: ScrollPositionGetter,
    setter: ScrollPositionSetter,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
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
      EndPointTypeOrNever<TLetsEndPointType>,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TQueryResultType,
      TProps
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      EndPointTypeOrNever<TLetsEndPointType>,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TQueryResultType,
      TProps
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      EndPointTypeOrNever<TLetsEndPointType>,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TQueryResultType,
      TProps
    >({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if it was shaked for serverNoSsr
      _prefetchPolicy: policy ?? this._prefetchPolicy,
    }) as never
  }

  onPrefetch(
    fn: OnPrefetchFn,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      EndPointTypeOrNever<TLetsEndPointType>,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TQueryResultType,
      TProps
    >({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if it was shaked for server
      _onPrefetchFns: [...this._onPrefetchFns, fn ?? (() => undefined)],
    }) as never
  }

  prefetchOnLinkHover(
    polh: boolean | number,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, InferCtxFnOutputCtxAppend<TCtxFn>>,
    AppendCtxExposedKeys<TCtxExposedKeys, InferCtxFnOutputCtxExposedKeys<TCtxFn>>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  ctx<TAppendCtx extends Ctx>(
    ctx: [TAppendCtx] &
      AssertNoForbiddenCtxExposedKeys<Extract<keyof TAppendCtx, string>> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
    AppendCtxExposedKeys<TCtxExposedKeys, Extract<keyof TAppendCtx, string>>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  ctx<TAppendCtx extends Ctx, TAppendCtxExposedKeys extends Extract<keyof TAppendCtx, string>>(
    ctx: [TAppendCtx, ...TAppendCtxExposedKeys[]] &
      AssertNoForbiddenCtxExposedKeys<TAppendCtxExposedKeys> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
    AppendCtxExposedKeys<TCtxExposedKeys, TAppendCtxExposedKeys>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  ctx<TAppendCtx extends Ctx>(
    ctx: TAppendCtx & AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
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
    loaderFn: LoaderFn<TCtx, TCtxExposedKeys, TServerLoaderOutput, TServerInputSchema, TNewServerLoaderOutput> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'loader'>,
  ): NiceStagePoint<
    TNewServerLoaderOutput extends Response ? 'clientStage' : StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TNewServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType extends UndefinedQueryResultType ? 'query' : TQueryResultType,
    TProps
  >
  loader(
    enableServerLoader: false,
  ): NiceStagePoint<
    'coreStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    UndefinedLoaderOutput,
    UndefinedLoaderOutput,
    UndefinedMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    UndefinedQueryResultType,
    TProps
  >
  loader(enableServerLoader: true & AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'loader'>): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput extends LoaderOutput ? TServerLoaderOutput : EmptyData, // if response or data exists in server, now it is server output, else empty data
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    UndefinedQueryResultType,
    TProps
  >
  loader(loaderFn: LoaderFn<any, any, any, any, any> | boolean) {
    if (loaderFn === false) {
      return this._continue({
        _sameQueryPoint: null,
        _serverExecuteActions: this._serverExecuteActions.filter((fn) => fn.type !== 'loader'),
        _clientExecuteActions: this._clientExecuteActions.filter((fn) => fn.type !== 'loader'),
        _clientMapperFns: [],
        _queryResultType:
          this._letsEndPointType === 'query'
            ? 'query'
            : this._letsEndPointType === 'infiniteQuery'
              ? 'infiniteQuery'
              : undefined,
      }) as never
    }
    if (loaderFn === true) {
      loaderFn = (o) => o.data
    }
    return this._continue({
      _sameQueryPoint: null,
      _queryResultType: this._queryResultType ?? 'query',
      _serverExecuteActions: [
        ...this._serverExecuteActions,

        { type: 'loader', fn: (loaderFn as unknown) ?? ((c: any) => c.data), unstableId: Point0._getNextUnstableId() },
      ] as never,
    }) as never
  }

  clientLoader<TNewClientLoaderOutput extends LoaderOutput = LoaderOutput>(
    clientLoaderFn: ClientLoaderFn<
      TLetsEndPointType,
      TRouteDefinition,
      TClientInputSchema,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TNewClientLoaderOutput
    > &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientLoader'>,
  ): NiceStagePoint<
    TNewClientLoaderOutput extends Response ? 'mapperStage' : 'clientStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TNewClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType extends UndefinedQueryResultType ? 'query' : TQueryResultType,
    TProps
  >
  clientLoader(
    enableClientLoader: false,
  ): NiceStagePoint<
    'coreStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    UndefinedData,
    UndefinedMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TServerLoaderOutput extends LoaderOutput
      ? TQueryResultType
      : TLetsEndPointType extends 'query'
        ? 'query'
        : TLetsEndPointType extends 'infiniteQuery'
          ? 'infiniteQuery'
          : UndefinedQueryResultType,
    TProps
  >
  // client loader true means that we do not want server do ssr here
  clientLoader(
    enableClientLoader: true & AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientLoader'>,
  ): NiceStagePoint<
    'clientStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput extends LoaderOutput
      ? TClientLoaderOutput
      : TServerLoaderOutput extends UndefinedLoaderOutput
        ? EmptyData
        : TServerLoaderOutput, // if response or data exists in server, now it is client output, else empty data
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  clientLoader(clientLoaderFn: ClientLoaderFn<any, any, any, any, any, any> | boolean) {
    if (clientLoaderFn === false) {
      return this._continue({
        _sameQueryPoint: null,
        _clientExecuteActions: this._clientExecuteActions.filter((fn) => fn.type !== 'loader'),
        _clientMapperFns: [],
        _queryResultType: this._hasServerLoader()
          ? this._queryResultType
          : this._letsEndPointType === 'query'
            ? 'query'
            : this._letsEndPointType === 'infiniteQuery'
              ? 'infiniteQuery'
              : undefined,
      }) as never
    }
    if (clientLoaderFn === true) {
      clientLoaderFn = (o) => o.data
    }
    return this._continue({
      type: 'clientStage',
      _sameQueryPoint: null,
      _queryResultType: this._queryResultType ?? 'query',
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

  mapper<TNewClientMapperOutput extends MapperOutput = MapperOutput>(
    mapperFn: ClientMapperFn<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TNewClientMapperOutput
    > &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'mapper'>,
  ): NiceStagePoint<
    'mapperStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TNewClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  mapper(
    enableMapper: false,
  ): NiceStagePoint<
    TClientLoaderOutput extends LoaderOutput ? 'clientStage' : 'coreStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    UndefinedMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  mapper(mapperFn: ClientMapperFn<any, any, any, any, any> | false) {
    if (mapperFn === false) {
      return this._continue({
        _sameQueryPoint: null,
        _clientMapperFns: [],
      }) as never
    }
    return this._continue({
      type: 'mapperStage',
      _sameQueryPoint: null,
      _clientMapperFns: [...this._clientMapperFns, mapperFn],
    }) as never
  }

  // too strange, just use usual mapper if you need it
  // flatter<
  //   TDataKey extends FinalLoaderMappedOutput<
  //     TQueryResultType,
  //     TServerLoaderOutput,
  //     TClientLoaderOutput,
  //     TClientMapperOutput
  //   > extends { pages: Array<Record<infer TAnyDataKey, any>> }
  //     ? Extract<TAnyDataKey, string>
  //     : never,
  // >(
  //   dataKey: TDataKey,
  // ): NiceStagePoint<
  //   TPointType,
  //   EndPointTypeOrNever<TLetsEndPointType>,
  //   TRequiredCtx,
  //   TCtx,
  //   TCtxExposedKeys,
  //   TServerLoaderOutput,
  //   TClientLoaderOutput,
  //   FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput> extends {
  //     pages: Array<Record<any, any>>
  //   }
  //     ? {
  //         flattened: FinalLoaderMappedOutput<
  //           TQueryResultType,
  //           TServerLoaderOutput,
  //           TClientLoaderOutput,
  //           TClientMapperOutput
  //         >['pages'][number][TDataKey]
  //         original: FinalLoaderMappedOutput<
  //           TQueryResultType,
  //           TServerLoaderOutput,
  //           TClientLoaderOutput,
  //           TClientMapperOutput
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
  //     _clientMapperFns: [
  //       ...this._clientMapperFns,
  //       ({
  //         data,
  //       }: {
  //         data: FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
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
    head: HeadFn | ResolvableHead | string,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    if (typeof head === 'function') {
      return this._continue({
        _headFns: [...this._headFns, head],
      }) as never
    } else {
      return this._continue({
        _headFns: [...this._headFns, () => head],
      }) as never
    }
  }

  props<TNewProps extends Props>(
    ...agrs: TPointType extends 'renderStage'
      ? [AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'props'>]
      : never[]
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TNewProps
  > {
    return this._continue({}) as never
  }

  input<TNextServerInputSchema extends InputSchema>(
    inputSchema: IsInputSchemaConflicts<TServerInputSchema, TNextServerInputSchema> extends false
      ? AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'> & TNextServerInputSchema
      : ShowError<`Provided schema is not assignable to previous input schema`> & TNextServerInputSchema,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, TNextServerInputSchema>,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  input<TInputRaw extends InputRaw, TInputParsed extends InputParsed = TInputRaw>(
    validateFn: IsInputSchemaConflicts<
      TServerInputSchema,
      RecordValidationSchema<TInputRaw, TInputParsed>
    > extends false
      ? CustomValidationFn<TInputParsed>
      : ShowError<`Provided schema is not assignable to previous input schema`> &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'> &
          CustomValidationFn<TInputParsed>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  input<TValidateFn extends CustomValidationFn<any>>(
    validateFn: IsInputSchemaConflicts<
      TServerInputSchema,
      CustomValidationFnToRecordValidationSchema<TValidateFn>
    > extends false
      ? TValidateFn
      : ShowError<`Provided schema is not assignable to previous input schema`> &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'> &
          TValidateFn,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  input<
    TInput extends InputRaw,
    TError = IsInputSchemaConflicts<TServerInputSchema, RecordValidationSchema<TInput, TInput>> extends false
      ? unknown extends AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'>
        ? false
        : AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'input'>
      : ShowError<`Provided schema is not assignable to previous input schema`>,
  >(
    ...args: TError extends false ? [] : [TError]
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, RecordValidationSchema<TInput, TInput>>,
    TClientInputSchema,
    TQueryResultType,
    TProps
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
    inputSchema: IsInputSchemaConflicts<TClientInputSchema, TNextClientInputSchema> extends false
      ? IsInputSchemaConflicts<TServerInputSchema, TNextClientInputSchema> extends false
        ? AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> & TNextClientInputSchema
        : ShowError<`Provided schema is not assignable to previous input schema`> & TNextClientInputSchema
      : ShowError<`Provided schema is not assignable to previous input schema`> & TNextClientInputSchema,
  ): NiceStagePoint<
    'clientStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    MergeRecordValidationSchemas<TClientInputSchema, TNextClientInputSchema>,
    TQueryResultType,
    TProps
  >
  clientInput<TInputRaw extends InputRaw, TInputParsed extends InputParsed = TInputRaw>(
    validateFn: IsInputSchemaConflicts<
      TClientInputSchema,
      RecordValidationSchema<TInputRaw, TInputParsed>
    > extends false
      ? IsInputSchemaConflicts<TServerInputSchema, RecordValidationSchema<TInputRaw, TInputParsed>> extends false
        ? AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> & CustomValidationFn<TInputParsed>
        : ShowError<`Provided schema is not assignable to previous input schema`> & CustomValidationFn<TInputParsed>
      : ShowError<`Provided schema is not assignable to previous input schema`> & CustomValidationFn<TInputParsed>,
  ): NiceStagePoint<
    'clientStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    MergeRecordValidationSchemas<TClientInputSchema, RecordValidationSchema<TInputRaw, TInputParsed>>,
    TQueryResultType,
    TProps
  >
  clientInput<TValidateFn extends CustomValidationFn<any>>(
    validateFn: IsInputSchemaConflicts<
      TClientInputSchema,
      CustomValidationFnToRecordValidationSchema<TValidateFn>
    > extends false
      ? IsInputSchemaConflicts<
          TServerInputSchema,
          CustomValidationFnToRecordValidationSchema<TValidateFn>
        > extends false
        ? AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> & TValidateFn
        : ShowError<`Provided schema is not assignable to previous input schema`> & TValidateFn
      : ShowError<`Provided schema is not assignable to previous input schema`> & TValidateFn,
  ): NiceStagePoint<
    'clientStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    MergeRecordValidationSchemas<TClientInputSchema, CustomValidationFnToRecordValidationSchema<TValidateFn>>,
    TQueryResultType,
    TProps
  >
  clientInput<
    TInput extends InputRaw,
    TError = IsInputSchemaConflicts<TClientInputSchema, RecordValidationSchema<TInput, TInput>> extends false
      ? IsInputSchemaConflicts<TServerInputSchema, RecordValidationSchema<TInput, TInput>> extends false
        ? unknown extends AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'>
          ? never[]
          : AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'>
        : ShowError<`Provided schema is not assignable to previous input schema`>
      : ShowError<`Provided schema is not assignable to previous input schema`>,
  >(
    ...args: TError extends false ? [] : [TError]
  ): NiceStagePoint<
    'clientStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    MergeRecordValidationSchemas<TClientInputSchema, RecordValidationSchema<TInput, TInput>>,
    TQueryResultType,
    TProps
  >
  // clientInput<TInputRaw extends InputRaw, TValidateFn extends (input: InputRawUnknown) => any>(
  //   validateFn: IsInputSchemaConflicts<
  //     TClientInputSchema,
  //     RecordValidationSchema<TInputRaw, ReturnType<TValidateFn>>
  //   > extends false
  //     ? IsInputSchemaConflicts<
  //         TServerInputSchema,
  //         RecordValidationSchema<TInputRaw, ReturnType<TValidateFn>>
  //       > extends false
  //       ? AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientInput'> &
  //           RecordValidationSchema<TInputRaw, ReturnType<TValidateFn>>
  //       : ShowError<`Provided schema is not assignable to previous input schema`> &
  //           RecordValidationSchema<TInputRaw, ReturnType<TValidateFn>>
  //     : ShowError<`Provided schema is not assignable to previous input schema`> &
  //         RecordValidationSchema<TInputRaw, ReturnType<TValidateFn>>,
  // ): NiceStagePoint<
  //   'clientStage',
  //   EndPointTypeOrNever<TLetsEndPointType>,
  //   TRequiredCtx,
  //   TCtx,
  //   TCtxExposedKeys,
  //   TServerLoaderOutput,
  //   TClientLoaderOutput,
  //   TClientMapperOutput,
  //   TRouteDefinition,
  //   TServerInputSchema,
  //   MergeRecordValidationSchemas<TClientInputSchema, RecordValidationSchema<TInputRaw, ReturnType<TValidateFn>>>,
  //   TQueryResultType,
  //   TProps
  // >
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

  // end points

  // TODO: remove it when you be mentally ready to remove it
  // route<TNewRoute extends AnyRoute>(
  //   route: FlatInputStringOnly<TNewRoute> extends InputRaw<TRouteDefinition, TInputSchema>
  //     ? TNewRoute
  //     : ShowError<`Route ${TNewRoute['definition']} is not assignable to previous input schema`> & TNewRoute,
  // ): NiceStagePoint<
  //   TPointType,
  //   EndPointTypeOrNever<TLetsEndPointType>,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   TNewRoute['definition'],
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponse,
  //   TQueryResultType,
  //   TProps
  // >
  // route<TNewRouteDefinition extends `/${string}`>(
  //   routeDefinition: TNewRouteDefinition,
  // ): NiceStagePoint<
  //   TPointType,
  //   EndPointTypeOrNever<TLetsEndPointType>,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   Route0<TNewRouteDefinition>['definition'],
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponse,
  //   TQueryResultType,
  //   TProps
  // >
  // route<TNewRouteDefinition extends string>(
  //   relativeRouteDefinition: TNewRouteDefinition,
  // ): NiceStagePoint<
  //   TPointType,
  //   EndPointTypeOrNever<TLetsEndPointType>,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   TPrevRouteDefinition extends RouteDefinition
  //     ? Extended<TPrevRouteDefinition, TNewRouteDefinition>['definition']
  //     : Route0<DedupeSlashes<`/${TNewRouteDefinition}`>>['definition'],
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponse,
  //   TQueryResultType,
  //   TProps
  // >
  // route(): NiceStagePoint<
  //   TPointType,
  //   EndPointTypeOrNever<TLetsEndPointType>,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   TPrevRouteDefinition extends RouteDefinition ? TPrevRouteDefinition : never,
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponse,
  //   TQueryResultType,
  //   TProps
  // >
  // route(route?: CallableRoute | RouteDefinition | ShowError<string>) {
  //   const prevRoute = this._prevRoute
  //   const newRoute = (() => {
  //     if (typeof route === 'undefined') {
  //       if (!prevRoute) {
  //         throw new Error('Parent of this point have no route, so you cannot use .() without argument')
  //       }
  //       return prevRoute.clone()
  //     }
  //     if (typeof route === 'string') {
  //       if (route.startsWith('/')) {
  //         return Route0.from(route)
  //       }
  //       return prevRoute ? prevRoute.extend(route) : Route0.from(dedupeSlashes(`/${route}`))
  //     }
  //     return route
  //   })()
  //   return this._continue({
  //     _route: newRoute as CallableRoute,
  //   }) as never
  // }

  // lets<TPointName extends PointName, TProvidedRoute extends AnyRoute | RouteDefinition = TPointName>(
  //   ...args: TPointType extends 'root' | 'base' | 'layout'
  //     ? [letsEndPointType: 'page', pointName: TPointName, route?: TProvidedRoute]
  //     : never[]
  // ): NiceStagePoint<
  //   'coreStage',
  //   'page',
  //   TRequiredCtx,
  //   TCtx,
  //   TCtxExposedKeys,
  //   TServerLoaderOutput,
  //   TClientLoaderOutput,
  //   TClientMapperOutput,
  //   TProvidedRoute extends AnyRoute
  //     ? FlatInputStringOnly<TProvidedRoute> extends InputRaw<TRouteDefinition, TInputSchema>
  //       ? TProvidedRoute['definition']
  //       : ShowError<`Route ${TProvidedRoute['definition']} is not assignable to previous input schema`> &
  //           TProvidedRoute['definition']
  //     : TProvidedRoute extends RouteDefinition
  //       ? Extended<
  //           StandaloneSlashIfUndefined<TRouteDefinition>,
  //           EmptyStringIfStandaloneSlash<TProvidedRoute>
  //         >['definition']
  //       : never,
  //   TRouteDefinition,
  //   TInputSchema,
  //   TQueryResultType,
  //   UndefinedProps
  // >
  lets<TPointName extends PointName, TProvidedRoute extends RouteDefinition = TPointName>(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsEndPointType: 'page', pointName: TPointName, route?: TProvidedRoute]
      : never[]
  ): NiceStagePoint<
    'coreStage',
    'page',
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    IsRouteDefinitionConflicts<
      ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>,
      TServerInputSchema,
      TClientInputSchema
    > extends false
      ? ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>
      : ShowError<`Route ${ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>} is not assignable to previous input schema`> &
          ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>,
    MergeRecordValidationSchemas<
      TServerInputSchema,
      RouteDefinitionToRecordValidationSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
    >,
    MergeRecordValidationSchemas<
      TClientInputSchema,
      RouteDefinitionToRecordValidationSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
    >,
    TQueryResultType,
    UndefinedProps
  >
  lets<TPointName extends PointName, TProvidedRoute extends AnyRoute>(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsEndPointType: 'page', pointName: TPointName, route: TProvidedRoute]
      : never[]
  ): NiceStagePoint<
    'coreStage',
    'page',
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    IsRouteDefinitionConflicts<TProvidedRoute['definition'], TServerInputSchema, TClientInputSchema> extends false
      ? TProvidedRoute['definition']
      : ShowError<`Route ${TProvidedRoute['definition']} is not assignable to previous input schema`> &
          TProvidedRoute['definition'],
    MergeRecordValidationSchemas<
      TServerInputSchema,
      RouteDefinitionToRecordValidationSchema<TProvidedRoute['definition']>
    >,
    MergeRecordValidationSchemas<
      TClientInputSchema,
      RouteDefinitionToRecordValidationSchema<TProvidedRoute['definition']>
    >,
    TQueryResultType,
    UndefinedProps
  >
  // lets<TPointName extends PointName, TProvidedRoute extends AnyRoute | RouteDefinition = '/'>(
  //   ...args: TPointType extends 'root' | 'base' | 'layout'
  //     ? [letsEndPointType: 'layout', pointName: TPointName, route?: TProvidedRoute]
  //     : never[]
  // ): NiceStagePoint<
  //   'coreStage',
  //   'layout',
  //   TRequiredCtx,
  //   TCtx,
  //   TCtxExposedKeys,
  //   TServerLoaderOutput,
  //   TClientLoaderOutput,
  //   TClientMapperOutput,
  //   TProvidedRoute extends AnyRoute
  //     ? FlatInputStringOnly<TProvidedRoute> extends InputRaw<TRouteDefinition, TInputSchema>
  //       ? TProvidedRoute['definition']
  //       : ShowError<`Route ${TProvidedRoute['definition']} is not assignable to previous input schema`> &
  //           TProvidedRoute['definition']
  //     : TProvidedRoute extends RouteDefinition
  //       ? Extended<
  //           StandaloneSlashIfUndefined<TRouteDefinition>,
  //           EmptyStringIfStandaloneSlash<TProvidedRoute>
  //         >['definition']
  //       : never,
  //   TRouteDefinition,
  //   TInputSchema,
  //   TQueryResultType,
  //   UndefinedProps
  // >
  lets<TPointName extends PointName, TProvidedRoute extends RouteDefinition = '/'>(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsEndPointType: 'layout', pointName: TPointName, route?: TProvidedRoute]
      : never[]
  ): NiceStagePoint<
    'coreStage',
    'layout',
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    IsRouteDefinitionConflicts<
      ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>,
      TServerInputSchema,
      TClientInputSchema
    > extends false
      ? ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>
      : ShowError<`Route ${ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>} is not assignable to previous input schema`> &
          ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>,
    MergeRecordValidationSchemas<
      TServerInputSchema,
      RouteDefinitionToRecordValidationSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
    >,
    MergeRecordValidationSchemas<
      TClientInputSchema,
      RouteDefinitionToRecordValidationSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>
    >,
    TQueryResultType,
    UndefinedProps
  >
  lets<TPointName extends PointName, TProvidedRoute extends AnyRoute>(
    ...args: TPointType extends 'root' | 'base' | 'layout'
      ? [letsEndPointType: 'layout', pointName: TPointName, route: TProvidedRoute]
      : never[]
  ): NiceStagePoint<
    'coreStage',
    'layout',
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    IsRouteDefinitionConflicts<TProvidedRoute['definition'], TServerInputSchema, TClientInputSchema> extends false
      ? TProvidedRoute['definition']
      : ShowError<`Route ${TProvidedRoute['definition']} is not assignable to previous input schema`> &
          TProvidedRoute['definition'],
    MergeRecordValidationSchemas<
      TServerInputSchema,
      RouteDefinitionToRecordValidationSchema<TProvidedRoute['definition']>
    >,
    MergeRecordValidationSchemas<
      TClientInputSchema,
      RouteDefinitionToRecordValidationSchema<TProvidedRoute['definition']>
    >,
    TQueryResultType,
    UndefinedProps
  >
  lets<TNewLetsEndPointType extends Exclude<EndPointType, 'page' | 'layout' | 'plugin'>, TPointName extends PointName>(
    ...args: TPointType extends 'root' | 'base'
      ? [letsEndPointType: TNewLetsEndPointType, pointName: TPointName]
      : never[]
  ): NiceStagePoint<
    'coreStage',
    TNewLetsEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    UndefinedProps
  >
  lets(...args: any[]) {
    const [letsEndPointType, pointName, route] = args as [EndPointType, PointName, AnyRoute | string | undefined]
    const prevRoute = this.route
    const newRoute = (() => {
      if (letsEndPointType === 'page') {
        if (typeof route === 'string' || !route) {
          const routeOrPointName = route ?? pointName
          if (routeOrPointName === '/') {
            return prevRoute?.clone() ?? Route0.from('/')
          }
          return prevRoute ? prevRoute.extend(routeOrPointName) : Route0.from(dedupeSlashes(`/${routeOrPointName}`))
        }
        return route
      }
      if (letsEndPointType === 'layout') {
        if (typeof route === 'string' || !route) {
          const routeNormalized = route ?? '/'
          if (routeNormalized === '/') {
            return prevRoute?.clone() ?? Route0.from('/')
          }
          return prevRoute ? prevRoute.extend(routeNormalized) : Route0.from(dedupeSlashes(`/${routeNormalized}`))
        }
        return route
      }
      return prevRoute
    })()
    const scopes = letsEndPointType === 'root' ? [pointName, ...this.scopes] : this.scopes
    const scope = letsEndPointType === 'root' ? pointName : this.scope
    const newInputExecuteAction =
      prevRoute === newRoute || !newRoute
        ? undefined
        : {
            type: 'input' as const,
            schema: Point0.customValidationFnToInputSchema((input) => newRoute.parseFlatInput(input)),
            unstableId: 0,
          }

    return this._continue({
      scope,
      scopes,
      _serverExecuteActions: newInputExecuteAction
        ? [...this._serverExecuteActions, newInputExecuteAction]
        : this._serverExecuteActions,
      _clientExecuteActions: newInputExecuteAction
        ? [...this._clientExecuteActions, newInputExecuteAction]
        : this._clientExecuteActions,
      type: 'coreStage',
      _letsEndPointType: letsEndPointType,
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
      _headFns: this._base?._headFns,
      _defaultMutationOptions: this._base?._defaultMutationOptions,
      _mutationOptions: {},
      _defaultQueryOptions: this._base?._defaultQueryOptions,
      _defaultInfiniteQueryOptions: this._base?._defaultInfiniteQueryOptions,
      _defaultPageQueryOptions: this._base?._defaultPageQueryOptions,
      _defaultComponentQueryOptions: this._base?._defaultComponentQueryOptions,
      _defaultProviderQueryOptions: this._base?._defaultProviderQueryOptions,
      _defaultLayoutQueryOptions: this._base?._defaultLayoutQueryOptions,
      _queryOptions: {},
      _sameQueryPoint:
        this._hasClientLoader() || this._hasServerLoader() ? this._sameQueryPoint || (this as EndPoint) : null,
      _infiniteQueryOptions: {} as never,
      _fetchOptions: this._base?._fetchOptions,
      _scrollPositionGetter: this._base?._scrollPositionGetter,
      _scrollPositionSetter: this._base?._scrollPositionSetter,
      _scrollPositionRestorePolicy: this._base?._scrollPositionRestorePolicy,
      _prefetchPolicy: this._base?._prefetchPolicy,
      _onPrefetchFns: this._base?._onPrefetchFns,
      _polh: this._base?._polh,
      _wrappers: this._base?._wrappers ?? [],
      _outers: this._base?._outers ?? [],
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

  root(): NiceRootEndPoint<
    'root',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      type: 'root',
      _base: this as never as BasePoint,
      _root: this as never as RootPoint,
      name: this.scope,
      _letsEndPointType: undefined,
    })
  }

  plugin(): NicePluginEndPoint<
    'plugin',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      type: 'plugin',
      _letsEndPointType: undefined,
    }) as never
  }

  base(): NiceBaseEndPoint<
    'base',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      type: 'base',
      _base: this as never as BasePoint,
      _letsEndPointType: undefined,
    }) as never
  }

  page(
    ...args: FinalLoaderMappedOutput<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput
    > extends Response
      ? [ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>]
      : never[]
  ): NicePageEndPoint<
    'page',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  page(
    ...args: FinalLoaderMappedOutput<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput
    > extends Response
      ? [ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>]
      : [
          page: PageComponent<
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TRouteDefinition,
            TClientInputSchema,
            TProps
          >,
        ]
  ): NicePageEndPoint<
    'page',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  page(
    ...args: FinalLoaderMappedOutput<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput
    > extends Response
      ? [
          ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>,
          ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>,
        ]
      : [
          head:
            | SuccessHeadFn<
                TQueryResultType,
                TServerLoaderOutput,
                TClientLoaderOutput,
                TClientMapperOutput,
                TClientInputSchema,
                ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
              >
            | ResolvableHead
            | string,
          page: PageComponent<
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TRouteDefinition,
            TClientInputSchema,
            TProps
          >,
        ]
  ): NicePageEndPoint<
    'page',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  page(...args: any[]) {
    const [head, page = () => null] = (args.length === 2 ? args : [undefined, args[0]]) as [
      SuccessHeadFn | undefined,
      (
        | PageComponent<
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TRouteDefinition,
            TClientInputSchema,
            TProps
          >
        | undefined
      ),
    ]
    const headFn = !head ? undefined : typeof head === 'function' ? head : () => head
    const successHeadFn: HeadFn | undefined = !headFn
      ? undefined
      : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        (options) => (!options.data || options.loading || options.error ? {} : headFn(options as never))
    // this._applyComponentDisplayName(page as React.ComponentType<any>, { suffix: 'PageInner' })
    const point = this._continue({
      type: 'page',
      _page: page,
      _letsEndPointType: undefined,
      _headFns: !successHeadFn ? this._headFns : [...this._headFns, successHeadFn],
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
    ...args: FinalLoaderMappedOutput<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput
    > extends Response
      ? [ShowError<`Component can not accept response. Last loader should provide plain object data, not response.`>]
      : [
          component?: ComponentComponent<
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TClientInputSchema,
            TProps
          >,
        ]
  ): NiceComponentEndPoint<
    'component',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    const [component = () => null] = args as [
      | ComponentComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TProps
        >
      | undefined,
    ]
    // this._applyComponentDisplayName(component, { suffix: 'Inner' })
    const point = this._continue({
      type: 'component',
      _component: component,
      _letsEndPointType: undefined,
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
    ...args: FinalLoaderMappedOutput<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput
    > extends Response
      ? [ShowError<`Layout can not accept response. Last loader should provide plain object data, not response.`>]
      : [
          layout?: LayoutComponent<
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TRouteDefinition,
            TClientInputSchema,
            TProps
          >,
        ]
  ): NiceLayoutEndPoint<
    'layout',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    const [layout = ({ children }: { children: Exclude<React.ReactNode, Promise<any>> }) => children] = args as [
      | LayoutComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TRouteDefinition,
          TClientInputSchema,
          TProps
        >
      | undefined,
    ]
    // this._applyComponentDisplayName(layout as React.ComponentType<any>, { suffix: 'LayoutInner' })

    const point = this._continue({
      type: 'layout',
      _layout: layout as never,
      _letsEndPointType: undefined,
      _base: this as never as BasePoint,
      ...this._getProviderLikeProps(),
    })
    // point.X = point.Layout.bind(point) as never
    // this._applyComponentDisplayName(point.X, { suffix: 'Layout' })
    // this._applyComponentDisplayName(point.Layout, { suffix: 'Layout' })
    // this._applyComponentDisplayName(point._LayoutLoader, { suffix: 'LayoutLoader' })
    point.X = point.Layout
    Point0._assignNicePointMethodsToComponent({ component: layout, point, extra: { X: point.X } })
    return layout as never
  }

  private _getProviderLikeProps() {
    return {
      _ProviderReactContext: createContext<
        FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
      >(null as never) as never,
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

  provider<TNewClientMapperOutput extends MapperOutput = MapperOutput>(
    mapperFn: ClientMapperFn<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TNewClientMapperOutput
    >,
  ): NiceProviderEndPoint<
    'provider',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TNewClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  provider(
    ...args: FinalLoaderMappedOutput<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput
    > extends Data
      ? []
      : never
  ): NiceProviderEndPoint<
    'provider',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >
  provider(
    mapperFn?: ClientMapperFn<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      MapperOutput
    >,
  ) {
    const point = this._continue({
      type: 'provider',
      _letsEndPointType: undefined,
      _clientMapperFns: mapperFn ? [...this._clientMapperFns, mapperFn as never] : this._clientMapperFns,
      ...this._getProviderLikeProps(),
    })
    // point.X = point.Provider.bind(point) as never
    // this._applyComponentDisplayName(point.X, { suffix: 'Provider' })
    // this._applyComponentDisplayName(point.Provider, { suffix: 'Provider' })
    point.X = point.Provider
    return point as never
  }

  // You may think that we can have just clientLoader to provide provider value.
  // We can, but then it will be always loads on client, and we will always have loader after ssr.
  // So we have special providerValueSetter function, which is always sync, and it provides final value
  // So we have no loading state after ssr, and also we can modify infinite query data in this providerValueSetter function
  // provider(
  //   ...args: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Data
  //     ? []
  //     : FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
  //       ? [ShowError<`Provider can not return response. Last loader should provide plain object data, not response.`>]
  //       : [
  //           ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .provider()`>,
  //         ]
  // ): NiceProviderEndPoint<
  //   'provider',
  //   undefined,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   TRouteDefinition,
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponse,
  //   TClientResponse,
  //   TQueryResultType,
  //   TProps,
  //   TLastServerOutput,
  //   TLastClientOutput
  // > {
  //   return this._continue({
  //     // type: this._letsEndPointType === 'query' ? 'query' : this.type,
  //     // _letsEndPointType: (this._letsEndPointType === 'query'
  //     //   ? undefined
  //     //   : this._letsEndPointType) as TLetsEndPointType extends 'query' ? undefined : TLetsEndPointType,
  //     // _queryResultType: 'query',
  //     // _queryOptions: queryOptions as ExtraUseQueryOptions<
  //     //   FinalClientData<TLastServerOutput, TLastClientOutput>,
  //     //   Error0,
  //     //   FinalClientData<TLastServerOutput, TLastClientOutput>,
  //     //   QueryKey
  //     // >,
  //     type: 'provider',
  //     _letsEndPointType: undefined,
  //     _ProviderReactContext: createContext<FinalClientData<TLastServerOutput, TLastClientOutput>>(
  //       null as never,
  //     ) as never,
  //     _useValue: (point: AnyPoint, keys?: string | string[] | undefined) => {
  //       if (!point._ProviderReactContext) {
  //         throw new Error('ProviderReactContext 2 not found on point: ' + point.name)
  //       }

  //       if (keys == null) {
  //         // no keys — return full context
  //         return useContextSelector(point._ProviderReactContext, (ctx) => {
  //           if (!ctx) throw new Error('useValue must be used within a Provider.')
  //           return ctx
  //         })
  //       }

  //       if (Array.isArray(keys)) {
  //         // multiple keys — build a memoized object
  //         return useContextSelector(point._ProviderReactContext, (ctx) => {
  //           if (!ctx) throw new Error('useValue must be used within a Provider.')
  //           const picked = {} as any
  //           for (const key of keys) {
  //             picked[key] = ctx[key]
  //           }
  //           return picked
  //         })
  //       }

  //       // single key
  //       return useContextSelector(point._ProviderReactContext, (ctx) => {
  //         if (!ctx) throw new Error('useValue must be used within a Provider.')
  //         return ctx[keys]
  //       })
  //     },
  //   }) as never
  // }

  use<T extends NicePluginEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any>>(
    plugin: T &
      AssertUseNoLoaderMapperConflict<
        TClientLoaderOutput,
        TClientMapperOutput,
        T['Infer']['ServerLoaderOutput'],
        T['Infer']['ClientLoaderOutput'],
        T['Infer']['ClientMapperOutput']
      > &
      AssertInputSchemaNotWider<
        TServerInputSchema,
        T['Infer']['ServerInputSchema'],
        `Plugin server input schema is not assignable to current point input schema`
      > &
      AssertInputSchemaNotWider<
        TClientInputSchema,
        T['Infer']['ClientInputSchema'],
        `Plugin client input schema is not assignable to current point input schema`
      >,
  ): NiceStagePoint<
    T['Infer']['ClientMapperOutput'] extends MapperOutput
      ? 'mapperStage'
      : T['Infer']['ClientLoaderOutput'] extends LoaderOutput
        ? 'clientStage'
        : 'coreStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    AppendCtx<TRequiredCtx, T['Infer']['RequiredCtx']>,
    AppendCtx<PrependCtx<TCtx, T['Infer']['RequiredCtx']>, T['Infer']['Ctx']>,
    AppendCtxExposedKeys<TCtxExposedKeys, T['Infer']['CtxExposedKeys']>,
    AppendLoaderOutput<TServerLoaderOutput, T['Infer']['ServerLoaderOutput']>,
    AppendLoaderOutput<TClientLoaderOutput, T['Infer']['ClientLoaderOutput']>,
    AppendMapperOutput<TClientMapperOutput, T['Infer']['ClientMapperOutput']>,
    TRouteDefinition,
    MergeRecordValidationSchemas<TServerInputSchema, T['Infer']['ServerInputSchema']>,
    MergeRecordValidationSchemas<TClientInputSchema, T['Infer']['ClientInputSchema']>,
    T['Infer']['QueryResultType'] extends undefined ? TQueryResultType : T['Infer']['QueryResultType'],
    TProps
  >
  use<
    T extends
      | NiceQueryEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any>
      | NiceInfiniteQueryEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any>
      | NiceLayoutEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any>,
  >(
    point: T &
      AssertUseNoLoaderMapperConflict<
        TClientLoaderOutput,
        TClientMapperOutput,
        T['Infer']['ServerLoaderOutput'],
        T['Infer']['ClientLoaderOutput'],
        T['Infer']['ClientMapperOutput']
      > &
      AssertInputSchemaAssignable<
        TServerInputSchema,
        T['Infer']['ServerInputSchema'],
        `Used point server input schema is not compatible with current point input schema`
      > &
      AssertInputSchemaAssignable<
        TClientInputSchema,
        T['Infer']['ClientInputSchema'],
        `Used point client input schema is not compatible with current point input schema`
      >,
  ): NiceStagePoint<
    T['Infer']['ClientMapperOutput'] extends MapperOutput
      ? 'mapperStage'
      : T['Infer']['ClientLoaderOutput'] extends LoaderOutput
        ? 'clientStage'
        : 'coreStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    AppendLoaderOutput<TServerLoaderOutput, T['Infer']['ServerLoaderOutput']>,
    AppendLoaderOutput<TClientLoaderOutput, T['Infer']['ClientLoaderOutput']>,
    AppendMapperOutput<TClientMapperOutput, T['Infer']['ClientMapperOutput']>,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    T['Infer']['QueryResultType'] extends undefined ? TQueryResultType : T['Infer']['QueryResultType'],
    TProps
  >
  use(point: Point0<any, any, any, any, any, any, any, any, any, any, any, any, any>) {
    // myplugin.input(1).loader(2).mapper(3).head(4).ctx(5)
    // mypoint.use(myplugin);
    // same as mypoint.input(1).loader(2).mapper(3).head(4).ctx(5)
    if (
      point.type !== 'query' &&
      point.type !== 'infiniteQuery' &&
      point.type !== 'layout' &&
      point.type !== 'plugin'
    ) {
      throw new Error(`Point type ${point.type} is not supported in use method`)
    }

    if (
      (this._hasMapperFns() || this._hasClientLoader()) &&
      (point._hasClientLoader() || point._hasServerLoader() || point._hasMapperFns())
    ) {
      throw new Error(
        `Point ${this.toString()} has mapper or clientLoader functions. You can not use on it something with loader, clientLoader or mapper`,
      )
    }

    const c: Parameters<typeof this._continue>[0] = {}

    const mergeArraysUnique = <T>(a: T[] | undefined, b: T[] | undefined): T[] => {
      return [...new Set([...(a ?? []), ...(b ?? [])])]
    }

    if (point.type === 'plugin') {
      // in this case plugin works like just injecting all it called methods to current point
      const mergedFetchOptionsFn: FetchOptionsFn = () => {
        const prevFetchOptions: FetchOptions = this._fetchOptions?.() || {}
        const newFetchOptions: FetchOptions = point._fetchOptions?.() || {}
        return { ...prevFetchOptions, ...newFetchOptions }
      }
      c._middlewares = [...this._middlewares, ...point._middlewares]
      c._serverExecuteActions = [...this._serverExecuteActions, ...point._serverExecuteActions]
      c._clientExecuteActions = [...this._clientExecuteActions, ...point._clientExecuteActions]
      c._clientMapperFns = [...this._clientMapperFns, ...point._clientMapperFns]
      c._headFns = [...this._headFns, ...point._headFns]
      c._wrappers = [...this._wrappers, ...point._wrappers]
      c._outers = [...this._outers, ...point._outers]
      c._onPrefetchFns = [...this._onPrefetchFns, ...point._onPrefetchFns]
      c._defaultMutationOptions = { ...this._defaultMutationOptions, ...point._defaultMutationOptions }
      c._mutationOptions = { ...this._mutationOptions, ...point._mutationOptions }
      c._defaultQueryOptions = { ...this._defaultQueryOptions, ...point._defaultQueryOptions }
      c._defaultInfiniteQueryOptions = { ...this._defaultInfiniteQueryOptions, ...point._defaultInfiniteQueryOptions }
      c._defaultPageQueryOptions = { ...this._defaultPageQueryOptions, ...point._defaultPageQueryOptions }
      c._defaultComponentQueryOptions = {
        ...this._defaultComponentQueryOptions,
        ...point._defaultComponentQueryOptions,
      }
      c._defaultLayoutQueryOptions = { ...this._defaultLayoutQueryOptions, ...point._defaultLayoutQueryOptions }
      c._defaultProviderQueryOptions = { ...this._defaultProviderQueryOptions, ...point._defaultProviderQueryOptions }
      c._queryOptions = { ...this._queryOptions, ...point._queryOptions }
      c._infiniteQueryOptions = { ...this._infiniteQueryOptions, ...point._infiniteQueryOptions } as never
      c._fetchOptions = mergedFetchOptionsFn
      c._scrollPositionGetter = point._scrollPositionGetter ?? this._scrollPositionGetter
      c._scrollPositionSetter = point._scrollPositionSetter ?? this._scrollPositionSetter
      c._scrollPositionRestorePolicy = point._scrollPositionRestorePolicy ?? this._scrollPositionRestorePolicy
      c._prefetchPolicy = point._prefetchPolicy ?? this._prefetchPolicy
      c._polh = point._polh ?? this._polh
      c._transformer = point._transformer ?? this._transformer
      c._serverurl = point._serverurl ?? this._serverurl
      c._baseurl = point._baseurl ?? this._baseurl
      c._layouts = mergeArraysUnique(this._layouts, point._layouts)
      c._errorComponent = point._errorComponent ?? (this._errorComponent as never)
      c._layoutErrorComponent = point._layoutErrorComponent ?? (this._layoutErrorComponent as never)
      c._pageErrorComponent = point._pageErrorComponent ?? (this._pageErrorComponent as never)
      c._componentErrorComponent = point._componentErrorComponent ?? (this._componentErrorComponent as never)
      c._loadingComponent = point._loadingComponent ?? (this._loadingComponent as never)
      c._layoutLoadingComponent = point._layoutLoadingComponent ?? (this._layoutLoadingComponent as never)
      c._pageLoadingComponent = point._pageLoadingComponent ?? (this._pageLoadingComponent as never)
      c._componentLoadingComponent = point._componentLoadingComponent ?? (this._componentLoadingComponent as never)
    }

    c._queryResultType = point._queryResultType ?? this._queryResultType

    if (point.type === 'query' || point.type === 'infiniteQuery' || point.type === 'layout') {
      // if it is query or infiniteQuery we get from there queryKey, and to execute actions we add special type pointExecution, so we need respect it in executor to store in queryClient state
      if (point._hasServerLoader() || point._hasClientLoader()) {
        const newRelatedQueryPoint = point._getSameQueryPoint() ?? point
        c._relatedQueryPoints = mergeArraysUnique(this._relatedQueryPoints, [newRelatedQueryPoint])
        if (!this._hasServerLoader() && !this._hasClientLoader()) {
          console.log('add same query point', newRelatedQueryPoint.name)
          c._sameQueryPoint = newRelatedQueryPoint
        } else {
          if (this._getSameQueryPoint() !== newRelatedQueryPoint) {
            console.log('remove same query point', point.name)
            c._sameQueryPoint = null
          }
        }
        if (point._hasServerLoader()) {
          c._serverExecuteActions = [
            ...this._serverExecuteActions,
            {
              type: 'loader',
              fn: async ({ data, input }) => {
                return {
                  ...(data instanceof Response ? {} : data),
                  ...(await point.fetch(input)),
                }
              },
              unstableId: Point0._getNextUnstableId(),
            },
          ]
        }
        if (point._hasClientLoader()) {
          c._clientExecuteActions = [
            ...this._clientExecuteActions,
            {
              type: 'loader',
              fn: async ({ data, input, response, location, serverData }) => ({
                ...(data instanceof Response ? {} : data),
                ...(await point._executeClientAsync({
                  serverData,
                  serverResponse: response,
                  input,
                  skipClientMapperFns: false,
                  location,
                })),
              }),
              unstableId: Point0._getNextUnstableId(),
            },
          ]
        }
        c._clientMapperFns = [...this._clientMapperFns, ...point._clientMapperFns]
      }
    }
    if (point.type === 'layout') {
      // if it is layout we need to add it to layouts
      c._layouts = mergeArraysUnique(this._layouts, [...point._layouts, point as LayoutPoint])
    }
    return this._continue(c) as never
  }

  query(
    ...args: TLetsEndPointType extends 'query'
      ? FinalLoaderMappedOutput<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput
        > extends Data
        ? [
            queryOptions?: ExtraUseQueryOptions<
              FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
              Error0,
              FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
              QueryKey
            >,
          ]
        : FinalLoaderMappedOutput<
              TQueryResultType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TClientMapperOutput
            > extends Response
          ? [ShowError<`Query can not return response. Last loader should provide plain object data, not response.`>]
          : [ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .query()`>]
      : never
  ): NiceQueryEndPoint<
    'query',
    undefined,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    'query',
    TProps
  >
  query(
    ...args: TLetsEndPointType extends 'query'
      ? never
      : [
          queryOptions?: ExtraUseQueryOptions<
            FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
            Error0,
            FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
            QueryKey
          >,
        ]
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    'query',
    TProps
  >
  query(...args: any) {
    const [queryOptions = {}] = args as [ExtraUseQueryOptions]
    if (this._letsEndPointType === 'query') {
      return this._continue({
        type: 'query',
        _letsEndPointType: undefined,
        _queryResultType: 'query',
        _queryOptions: queryOptions,
      }) as never
    } else {
      return this._continue({
        _queryResultType: 'query',
        _queryOptions: queryOptions,
      }) as never
    }
  }

  infiniteQuery(
    ...args: FinalLoaderMappedOutput<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput
    > extends Data
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
      : FinalLoaderMappedOutput<
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput
          > extends Response
        ? [
            ShowError<`InfiniteQuery can not return response. Last loader should provide plain object data, not response.`>,
          ]
        : [ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .infiniteQuery()`>]
  ): TLetsEndPointType extends 'infiniteQuery'
    ? NiceInfiniteQueryEndPoint<
        'infiniteQuery',
        undefined,
        TRequiredCtx,
        TCtx,
        TCtxExposedKeys,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TRouteDefinition,
        TServerInputSchema,
        TClientInputSchema,
        'infiniteQuery',
        TProps
      >
    : NiceStagePoint<
        StagePointTypeOrNever<TPointType>,
        EndPointTypeOrNever<TLetsEndPointType>,
        TRequiredCtx,
        TCtx,
        TCtxExposedKeys,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TRouteDefinition,
        TServerInputSchema,
        TClientInputSchema,
        'infiniteQuery',
        TProps
      > {
    const [infiniteQueryOptions = {}] = args
    return this._continue({
      type: this._letsEndPointType === 'infiniteQuery' ? 'infiniteQuery' : this.type,
      _letsEndPointType: (this._letsEndPointType === 'infiniteQuery'
        ? undefined
        : this._letsEndPointType) as TLetsEndPointType extends 'infiniteQuery' ? undefined : TLetsEndPointType,
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

  mutation(
    ...args: FinalLoaderMappedOutput<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput
    > extends LoaderOutput
      ? [
          mutationOptions?: UseMutationOptions<
            FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>,
            Error0,
            InputsRawMaybeOptional<TServerInputSchema, TClientInputSchema>
          >,
        ]
      : [ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .mutation()`>]
  ): NiceMutationEndPoint<
    'mutation',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  > {
    const [mutationOptions = {}] = args
    const point = this._continue({
      type: 'mutation',
      _mutationOptions: mutationOptions as UseMutationOptions,
      _letsEndPointType: undefined,
    })
    return point as never
  }

  _hmr(component: React.Component): typeof this {
    // TODO: do not clone here, just assign to existing
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
      execute: point.execute.bind(point),
      executeDetailed: point.executeDetailed.bind(point),
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
      _hmr: point._hmr.bind(point),
      route: point.route,
      ...extra,
    })
  }

  private static _isEndPointType(pointType: PointType): boolean {
    return (
      pointType === 'root' ||
      pointType === 'base' ||
      pointType === 'page' ||
      pointType === 'layout' ||
      pointType === 'query' ||
      pointType === 'infiniteQuery' ||
      pointType === 'mutation' ||
      pointType === 'component' ||
      pointType === 'provider'
    )
  }
  private _isEndPoint(): boolean {
    return Point0._isEndPointType(this.type)
  }

  _isRoot(): boolean {
    return this.name === this.scope && this.type === 'root'
  }

  private _getErrorComponent<TType extends DestinationComponentType>({
    type,
  }: {
    type: TType
  }): ErrorComponentType<
    TType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TProps
  > {
    return (this._errorComponent ??
      {
        page: this._pageErrorComponent,
        component: this._componentErrorComponent,
        layout: this._layoutErrorComponent,
      }[type] ??
      Point0.DefaultErrorComponent) as never
  }

  private _getLoadingComponent<TType extends DestinationComponentType>({
    type,
  }: {
    type: TType
  }): LoadingComponentType<
    TType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TProps
  > {
    return (this._loadingComponent ??
      {
        page: this._pageLoadingComponent,
        component: this._componentLoadingComponent,
        layout: this._layoutLoadingComponent,
      }[type] ??
      Point0.DefaultLoadingComponent) as never
  }

  private _withWrappers({
    children,
    useLoaderResult,
    props,
  }: {
    props: FinalProps<TProps>
    children: React.ReactNode
    useLoaderResult: AnyUseLoaderResult<
      any,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      AnyLocation
    >
  }): Exclude<React.ReactNode, Promise<any>> {
    if (this._wrappers.length === 0) {
      return children as Exclude<React.ReactNode, Promise<any>>
    }
    return [...this._wrappers].reverse().reduce((acc, Wrapper, index) => {
      return React.createElement(Wrapper, {
        children: acc,
        ...useLoaderResult,
        props,
      } as never)
    }, children) as Exclude<React.ReactNode, Promise<any>>
  }

  private _withOuters({
    children,
    input,
    props,
    location,
    LoadingComponent,
    ErrorComponent,
  }: {
    children: React.ReactNode
    input: InputParsed<TClientInputSchema>
    props: FinalProps<TProps>
    location: AnyLocation
    LoadingComponent: React.ComponentType
    ErrorComponent: React.ComponentType<{ error: Error }>
  }): Exclude<React.ReactNode, Promise<any>> {
    if (this._outers.length === 0) {
      return children as Exclude<React.ReactNode, Promise<any>>
    }
    return [...this._outers].reverse().reduce(
      (acc, Outer, index) => {
        return React.createElement(Outer, {
          children: acc,
          input,
          props,
          location,
          LoadingComponent,
          ErrorComponent,
        })
      },
      children as Exclude<React.ReactNode, Promise<any>>,
    )
  }

  _hasServerLoader(): boolean {
    return this._serverExecuteActions.some((fn) => fn.type === 'loader')
  }

  _hasClientLoader(): boolean {
    return this._clientExecuteActions.length > 0 && this._clientExecuteActions.some((fn) => fn.type === 'loader')
  }

  _hasMapperFns(): boolean {
    return this._clientMapperFns.length > 0
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

  // static parseInput<TInputSchema extends InputSchema | UndefinedInputSchema>(
  //   inputSchema: TInputSchema,
  //   input: InputRaw<TInputSchema>,
  // ): InputParsed<TInputSchema> {
  //   const schema = inputSchema as unknown
  //   const result = () => {
  //     if (typeof schema !== 'object' || schema === null) {
  //       throw new Error('Input schema is not an object')
  //     }
  //     if ('parse' in schema && typeof schema.parse === 'function') {
  //       return schema.parse(input)
  //     }
  //     if ('validateSync' in schema && typeof schema.validateSync === 'function') {
  //       return schema.validateSync(input)
  //     }
  //     if ('validate' in schema && typeof schema.validate === 'function') {
  //       return schema.validate(input)
  //     }
  //     throw new Error('Unknown input schema type')
  //   }
  //   if ('')
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
    skipClientMapperFns,
  }: {
    serverData: Data | undefined
    serverResponse: Response | undefined
    location?: AnyLocation
    input: InputRaw<TClientInputSchema>
    skipClientMapperFns: boolean
  }): Promise<{
    clientData: Data | undefined
    clientMappedData: Data | undefined
    clientResponse: Response | undefined
    clientOutput: Data | Response | undefined
  }> {
    let currentClientData: Data | undefined = serverData
    let currentClientMappedData: Data | undefined = serverData
    let currentClientResponse: Response | undefined = serverResponse
    let currentClientOutput: Data | Response | undefined = serverResponse ?? serverData
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- we parse input step by step, so we do not need initial parse result
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
          const result = await clientExecuteAction.fn({
            data: currentClientData ?? {},
            location,
            response: serverResponse,
            input: currentInputParsed,
            serverData,
          })
          if (result instanceof Response) {
            currentClientResponse = result
            currentClientOutput = result
          } else {
            currentClientResponse = undefined
            currentClientData = result
            currentClientMappedData = result
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
    if (!skipClientMapperFns) {
      for (const clientMapperFn of this._clientMapperFns) {
        // here we always send data only, becouse if last loader return response, then mapper can not exists by design
        currentClientMappedData = clientMapperFn({ data: currentClientMappedData })
        currentClientOutput = currentClientMappedData
      }
    }
    return {
      clientData: currentClientData,
      clientMappedData: currentClientMappedData,
      clientResponse: currentClientResponse,
      clientOutput: currentClientOutput,
    }
  }

  // TODO: maybe remove it?
  // private _executeClientSync({
  //   data,
  //   response,
  //   location,
  //   input,
  // }: {
  //   data: Data | undefined
  //   response: Response | undefined
  //   location?: AnyLocation
  //   input: InputRaw<TRouteDefinition, TInputSchema>
  // }): {
  //   clientData: Data | undefined
  //   clientResponse: Response | undefined
  //   clientOutput: Data | Response | undefined
  // } {
  //   let currentClientData: Data | undefined = data
  //   let currentClientResponse: Response | undefined = undefined
  //   let currentClientOutput: Data | Response | undefined = response ?? data
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars -- we parse input step by step, so we do not need initial parse result
  //   const { parsedInput, inputError } = (() => {
  //     const result = this.parseInputSafe(input)
  //     if (!result.success) {
  //       return { parsedInput: {}, inputError: result.error }
  //     }
  //     return { parsedInput: result.data, inputError: undefined }
  //   })()
  //   if (inputError) {
  //     throw new Error(`Input error: ${inputError.message}`)
  //   }
  //   let currentInputParsed: InputParsed = this._route ? this._route.parseFlatInput(input) : {}
  //   let currentInputSchema: InputSchema | undefined = this._serverInputSchema
  //   location ??=
  //     this.type === 'page' || this.type === 'layout'
  //       ? this._getSelfLocationByAnotherLocationOrInput(location, input)
  //       : _ssItems.currentLocation.get()
  //   for (const clientExecuteAction of this._clientExecuteActions) {
  //     switch (clientExecuteAction.type) {
  //       case 'input': {
  //         currentInputSchema = currentInputSchema
  //           ? currentInputSchema.extend(clientExecuteAction.schema.shape)
  //           : clientExecuteAction.schema
  //         const safeParseResult = currentInputSchema.safeParse(input)
  //         if (safeParseResult.error) {
  //           throw new Error(`Input error: ${safeParseResult.error.message}`)
  //         }
  //         currentInputParsed = safeParseResult.data
  //         break
  //       }
  //       case 'loader': {
  //         const result = clientExecuteAction.fn({
  //           data: currentClientData ?? {},
  //           location,
  //           input: currentInputParsed,
  //           inputRaw: input,
  //           response: currentClientResponse,
  //         })
  //         if (result instanceof Response) {
  //           currentClientResponse = result
  //           currentClientOutput = result
  //         } else {
  //           currentClientData = result as Data
  //           currentClientOutput = result as Data | Response
  //         }
  //         break
  //       }
  //       // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  //       default: {
  //         throw new Error(`Unknown client extend fn type: ${(clientExecuteAction as any).type}`)
  //       }
  //     }
  //   }
  //   return {
  //     clientData: currentClientData,
  //     clientResponse: currentClientResponse,
  //     clientOutput: currentClientOutput,
  //   }
  // }

  _executeHead(
    useLoaderResult: AnyUseLoaderResult<
      any,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      AnyLocation
    >,
  ): ResolvableHead[] {
    const head: ResolvableHead[] = []
    for (const headFn of this._headFns) {
      const headFnResult = headFn(useLoaderResult as never)
      const headFnResultResolvable = typeof headFnResult === 'string' ? { title: headFnResult } : headFnResult
      head.push(headFnResultResolvable)
    }
    return head
  }

  private _useHead(
    unqueriedLoaderResult: AnyUseLoaderResult<
      any,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      AnyLocation
    >,
  ): void {
    for (const headItem of this._executeHead(unqueriedLoaderResult as never)) {
      useHead(headItem as never)
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
  ): UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, any> {
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
      // const isInitalSsrLocation = useIsInitalSsrLocation()
      // const useQueryCacheMethod = isServerInfiniteQuery ? this.useInfiniteQueryCache : this.useQueryCache
      // const { queryCache } = useQueryCacheMethod(input as never)
      // const { queryCache } = this.useQueryCache(input as never, 'data')
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
  ): UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, any> {
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
      // const isInitalSsrLocation = useIsInitalSsrLocation()
      // const useQueryCacheMethod = isServerInfiniteQuery ? this.useInfiniteQueryCache : this.useQueryCache
      // const { queryCache } = useQueryCacheMethod(input as never)
      // const { queryCache } = this.useQueryCache(input as never, 'data')
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

  useLoader(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?:
            | ExtraUseQueryOptions
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
          _clientInputParseResult?: InputParseResult<TClientInputSchema>,
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          queryOptions?:
            | ExtraUseQueryOptions
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
          _clientInputParseResult?: InputParseResult<TClientInputSchema>,
        ]
  ): AnyUseLoaderResult<
    any,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    AnyLocation
  > & { dataOrLastInfiteData: FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput> } {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()
    const [inputRaw = {}, queryOptions, fetchOptions, _clientInputParseResult] = args

    const clientInputParseResult = React.useMemo<InputParseResult<TClientInputSchema>>(() => {
      if (_clientInputParseResult) {
        return _clientInputParseResult
      }
      const result = this.parseClientInputSafe(inputRaw as never)
      if (!result.success) {
        return { inputParsed: null, inputParseError: result.error } as InputParseResult<TClientInputSchema>
      }
      return { inputParsed: result.data, inputParseError: null } as InputParseResult<TClientInputSchema>
    }, [this._getTransformer().stringify(inputRaw), _clientInputParseResult])

    if (!this._hasServerLoader() && !this._hasClientLoader()) {
      const result = React.useMemo(() => {
        const data = this._clientMapperFns.reduce((data, mapperFn) => mapperFn({ data }), undefined as never) as never
        return {
          data,
          loading: false as const,
          error: (clientInputParseResult.inputParseError ?? null) as never,
          query: null,
          location,
          input: clientInputParseResult.inputParsed,
          dataOrLastInfiteData: data,
        }
      }, [clientInputParseResult, inputRaw, location])
      return result
    }
    const query =
      this._queryResultType === 'infiniteQuery'
        ? this.useInfiniteQuery(inputRaw as never, queryOptions as never, fetchOptions as never)
        : this.useQuery(inputRaw as never, queryOptions as never, fetchOptions as never)
    const mappedData = useMemo(() => {
      if (!query.data) {
        return undefined
      }
      if (!this._clientMapperFns.length) {
        return query.data
      }
      return this._clientMapperFns.reduce((data, mapperFn) => mapperFn({ data }), query.data)
    }, [query.data])
    const result = React.useMemo(() => {
      const dataOrLastInfiteData =
        this._queryResultType === 'infiniteQuery' ? (query.data as any)?.pages?.at(-1) : query.data
      return {
        data: mappedData as never,
        loading: query.isLoading as never,
        error: (query.error ? Error0.from(query.error) : null) as never,
        query: query as never,
        location,
        input: clientInputParseResult.inputParsed,
        dataOrLastInfiteData,
      }
    }, [query, query.data, query.error, query.isLoading, clientInputParseResult, location, mappedData])
    return result
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

  getFetchOptions(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchOutputType,
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchOutputType,
        ]
  ): { url: string; init: RequestInit; request: Request } {
    const [input = {}, options] = args
    const fetchOptions = { ...this._fetchOptions?.(), ...options }
    const fromScope = _ssItems.__POINT0_CLIENT_SCOPE__.getWeak() ?? getFakeClient()?.scope
    if (!fromScope || typeof fromScope !== 'string') {
      throw new Error('Scope is not set. You forget to call PointsManager.create()?')
    }
    const sameQueryPoint = this._getSameQueryPoint()
    const headers = mergeHeaders(fetchOptions.headers, options?.headers, {
      Accept: 'application/json',
      'X-Point0-From-Scope': fromScope,
      'X-Point0-Same-Point': sameQueryPoint
        ? `${sameQueryPoint.scope}.${sameQueryPoint.type}.${sameQueryPoint.name}`
        : '',
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

  private modifyFetchRequestForServerIfRequired(fetchOptions: ReturnType<typeof this.getFetchOptions>): Request {
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

    const currentResponse0 = _ssItems.__POINT0_RESPONSE0__.getWeak()
    if (currentResponse0) {
      const cookies = Object.values(currentResponse0.cookies)
      for (const cookie of cookies) {
        const serializedCookie = Response0.serializeCookie(cookie)
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

  async fetchDetailed(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchOutputType,
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchOutputType,
        ]
  ): Promise<FetchDetailedOutput<TServerLoaderOutput>> {
    let res: Response | undefined
    try {
      const fetchOptions = this.getFetchOptions(...args)
      const fetchFn = this.getFetchFn()
      const fetchRequest = this.modifyFetchRequestForServerIfRequired(fetchOptions)

      res = await fetchFn(fetchRequest)
      CookiesStore.refresh()
      if (res.headers.get('X-Point0-Not-Json-Data') === 'true') {
        return { response: res, data: undefined, error: null, output: res } as FetchDetailedOutput<TServerLoaderOutput>
      }
      const json = await res.json()
      const data = this._getTransformer().deserialize(json)
      if (res.ok) {
        return { response: res, data, error: null, output: data } as FetchDetailedOutput<TServerLoaderOutput>
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
      } as FetchDetailedOutput<TServerLoaderOutput>
    }
  }

  async fetch(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [
          input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchOutputType,
        ]
      : [
          input: InputsRaw<TServerInputSchema, TClientInputSchema>,
          fetchOptions?: FetchOptions,
          _outputType?: FetchOutputType,
        ]
  ): Promise<FetchOutput<TServerLoaderOutput>> {
    const detailedResult = await this.fetchDetailed(...args)
    if (detailedResult.error) {
      throw detailedResult.error
    }
    return detailedResult.output as FetchOutput<TServerLoaderOutput>
  }

  async executeDetailed(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? TServerLoaderOutput extends LoaderOutput
        ? [input?: InputsRaw<TServerInputSchema, TClientInputSchema>, fetchOptions?: FetchOptions]
        : [input?: InputsRaw<TServerInputSchema, TClientInputSchema>]
      : TServerLoaderOutput extends LoaderOutput
        ? [input: InputsRaw<TServerInputSchema, TClientInputSchema>, fetchOptions?: FetchOptions]
        : [input: InputsRaw<TServerInputSchema, TClientInputSchema>]
  ): Promise<
    ClientExecuteDetailedResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
  > {
    if (_point0_env.target.is.server) {
      // throw new Error0(
      //   'If you want to execute data on server, use engine.execute, or Executor.execute, or get execute fn from loader|ctx options. point.execute is for client only and use fetch under the hood to retrieve server data',
      // )
      // lets not throw to be able fullstack tests
    }
    const [input = {}, fetchOptions] = args
    const { serverData, serverResponse, serverOutput } = await (async () => {
      if (this._hasServerLoader()) {
        const serverDataOrResponse = await this.fetch(input as never, fetchOptions)
        if (serverDataOrResponse instanceof Response) {
          return { serverData: undefined, serverResponse: serverDataOrResponse, serverOutput: serverDataOrResponse }
        }
        return { serverData: serverDataOrResponse, serverResponse: undefined, serverOutput: serverDataOrResponse }
      }
      return { serverData: undefined, serverResponse: undefined, serverOutput: undefined }
    })()
    if (this._hasClientLoader()) {
      //   if (this._hasClientAsyncLoader()) {
      const { clientOutput, clientData, clientResponse } = await this._executeClientAsync({
        serverData,
        serverResponse,
        input: input as never,
        skipClientMapperFns: false,
      })
      return {
        serverData,
        serverResponse,
        serverOutput,
        clientData,
        clientResponse,
        clientOutput,
        output: clientOutput ?? serverOutput,
      } as ClientExecuteDetailedResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
      //   } else {
      //     const { clientOutput, clientData, clientResponse } = this._executeClientSync({
      //       data: serverData || {},
      //       response: serverResponse,
      //       input: input as never,
      //     })
      //     return {
      //       serverData,
      //       serverResponse,
      //       serverOutput,
      //       clientData,
      //       clientResponse,
      //       clientOutput,
      //       output: clientOutput ?? serverOutput,
      //     } as ClientExecuteDetailedResult<
      //       TData,
      //       TResponse,
      //       TClientData,
      //       TClientResponse,
      //       TLastServerOutput,
      //       TLastClientOutput
      //     >
      //   }
    }
    return {
      serverData,
      serverResponse,
      serverOutput,
      clientData: undefined,
      clientResponse: undefined,
      clientOutput: undefined,
      output: serverOutput,
    } as ClientExecuteDetailedResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
  }

  async execute(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? TServerLoaderOutput extends LoaderOutput
        ? [input?: InputsRaw<TServerInputSchema, TClientInputSchema>, fetchOptions?: FetchOptions]
        : [input?: InputsRaw<TServerInputSchema, TClientInputSchema>]
      : TServerLoaderOutput extends LoaderOutput
        ? [input: InputsRaw<TServerInputSchema, TClientInputSchema>, fetchOptions?: FetchOptions]
        : [input: InputsRaw<TServerInputSchema, TClientInputSchema>]
  ): Promise<FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>> {
    const detailedResult = await this.executeDetailed(...args)
    return detailedResult.output
  }

  _getServerQueryKey({
    input = {} as never,
    outputType = 'data',
    isInfiniteQuery,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    outputType?: FetchOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    const sameQueryPoint = this._getSameQueryPoint() || this
    return [
      'point0',
      sameQueryPoint.scope,
      sameQueryPoint.type,
      sameQueryPoint.name,
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
    const sameQueryPoint = this._getSameQueryPoint() || this
    return [
      'point0',
      sameQueryPoint.scope,
      sameQueryPoint.type,
      sameQueryPoint.name,
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
    outputType?: FetchOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    const sameQueryPoint = this._getSameQueryPoint() || this
    return [
      'point0',
      sameQueryPoint.scope,
      sameQueryPoint.type,
      sameQueryPoint.name,
      'combined',
      isInfiniteQuery ? 'infinite' : 'finite',
      this._getTransformer().stringify(input) as string,
      outputType,
    ]
  }

  getQueryKey(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [input?: InputsRaw<TServerInputSchema, TClientInputSchema>, _outputType?: FetchOutputType]
      : [input: InputsRaw<TServerInputSchema, TClientInputSchema>, _outputType?: FetchOutputType]
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
    outputType?: FetchOutputType
  }): UseQueryOptions<FetchOutput<TServerLoaderOutput>, Error0, FetchOutput<TServerLoaderOutput>, QueryKey> {
    const queryKey = this._getServerQueryKey({ input, outputType, isInfiniteQuery: false })
    const queryFn = async () => {
      const data = await this.fetch(input as never, fetchOptions, outputType)
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
    const queryFn =
      // this._hasClientAsyncLoader() ?
      async () => {
        const { clientData } = await this._executeClientAsync({
          serverData,
          location,
          input: input as InputRaw<TClientInputSchema>,
          serverResponse: undefined,
          skipClientMapperFns: true,
        })
        return clientData
      }
    // : () => {
    //     const { clientData } = this._executeClientSync({ data: data || {}, location, input, response: undefined })
    //     return clientData
    //   }
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
            outputType?: FetchOutputType
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
            outputType?: FetchOutputType
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
    outputType?: FetchOutputType
  }): UseInfiniteQueryOptions<
    InfiniteData<FetchOutput<TServerLoaderOutput>>,
    Error0,
    FetchOutput<TServerLoaderOutput>,
    QueryKey
  > {
    const queryKey = this._getServerQueryKey({ input: input as never, outputType, isInfiniteQuery: true })
    const queryFn = async ({ pageParam }: { pageParam: unknown }) => {
      try {
        const pageParamFromInput = this._infiniteQueryOptions.pageParamFromInput
        const data = await this.fetch(
          { ...input, [pageParamFromInput]: pageParam ?? this._infiniteQueryOptions.initialPageParam } as never,
          fetchOptions,
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
    const queryFn =
      // this._hasClientAsyncLoader() ?
      async ({ pageParam }: { pageParam: unknown }) => {
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
            skipClientMapperFns: true,
          })
          return clientData
        } catch (error) {
          throw Error0.from(error)
        }
      }
    // : ({ pageParam }: { pageParam: unknown }) => {
    //     try {
    //       const pageParamFromInput = this._infiniteQueryOptions.pageParamFromInput
    //       const { clientData } = this._executeClientSync({
    //         data: data || {},
    //         location,
    //         response: undefined,
    //         input: { ...input, [pageParamFromInput]: pageParam ?? this._infiniteQueryOptions.initialPageParam },
    //       })
    //       return clientData
    //     } catch (error) {
    //       throw Error0.from(error)
    //     }
    //   }
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
            outputType?: FetchOutputType
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
            outputType?: FetchOutputType
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

  // private _usePresetCacheQuery({
  //   queryClient,
  //   queryOptions,
  //   input,
  // }: {
  //   queryClient?: QueryClient
  //   queryOptions: UseQueryOptions<any, any, any, any>
  //   input: InputRaw<TRouteDefinition, TInputSchema>
  // }): void {
  //   const queryFn = queryOptions.queryFn
  //   if (typeof queryFn !== 'function') {
  //     return
  //   }
  //   const isAsyncQueryFn = queryFn.constructor.name === 'AsyncFunction'
  //   if (isAsyncQueryFn) {
  //     return
  //   }
  //   queryClient ??= _ssItems.queryClient.get()
  //   const cache = queryClient.getQueryCache()
  //   const exQuery = cache.find({ queryKey: queryOptions.queryKey as never, stale: false })
  //   if (exQuery) {
  //     return
  //   }
  //   const query = cache.build(queryClient, {
  //     queryKey: queryOptions.queryKey,
  //     queryHash: hashKey(queryOptions.queryKey),
  //   })
  //   try {
  //     const data = (queryFn as any)()
  //     const fixedData =
  //       this._queryResultType === 'infiniteQuery'
  //         ? {
  //             pages: [data],
  //             pageParams: [undefined],
  //           }
  //         : data
  //     query.setState({
  //       data,
  //       error: null,
  //       status: 'success',
  //       fetchStatus: 'idle',
  //     })
  //   } catch (error) {
  //     query.setState({
  //       data: undefined,
  //       error: { ...Error0.toJSON(error), name: 'Error0' },
  //       status: 'error',
  //       fetchStatus: 'idle',
  //     })
  //   }
  // }

  private _useServerQuery({
    input,
    queryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputsRaw<TServerInputSchema, TClientInputSchema>
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseQueryResult<FetchOutput<TServerLoaderOutput>, Error0> {
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
    outputType?: FetchOutputType
  }): UseInfiniteQueryResult<InfiniteData<FetchOutput<TServerLoaderOutput>>, Error0> {
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
    FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>,
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
            return await this.fetchDetailed(input as never, fetchOptions, undefined)
          }
          return undefined
        })()
        if (serverFetchResult?.error) {
          throw serverFetchResult.error
        }
        if (this._hasClientLoader()) {
          // if (this._hasClientAsyncLoader()) {
          const { clientOutput } = await this._executeClientAsync({
            serverData: serverFetchResult?.data,
            serverResponse: serverFetchResult?.response,
            input: input as never,
            skipClientMapperFns: false,
          })
          return clientOutput
          //   } else {
          //     const { clientOutput } = this._executeClientSync({
          //       data: serverDataOrResponse instanceof Response ? {} : (serverDataOrResponse ?? {}),
          //       response: serverDataOrResponse instanceof Response ? serverDataOrResponse : undefined,
          //       input: input as never,
          //     })
          //     return clientOutput
          //   }
        }
        if (this._hasMapperFns()) {
          return this._clientMapperFns.reduce(
            (data, mapperFn) => mapperFn({ data }),
            serverFetchResult?.output,
          ) as FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
        }
        if (!serverFetchResult?.output) {
          throw new Error('Server output is not set')
        }
        return serverFetchResult.output as FinalLoaderMappedOutput<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput
        >
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
      FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>,
      Error0,
      InputsRawMaybeOptional<TServerInputSchema, TClientInputSchema>
    >
  }

  useMutation = (
    mutationOptions?: MutationOptions | undefined,
    fetchOptions?: FetchOptions | undefined,
  ): UseMutationResult<
    FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>,
    Error0,
    InputsRawMaybeOptional<TServerInputSchema, TClientInputSchema>
  > => {
    return useMutation(this.getMutationOptions(mutationOptions, fetchOptions))
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
    outputType?: FetchOutputType
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
            outputType?: FetchOutputType
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
            outputType?: FetchOutputType
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

  async _prefetchRelatedQueryPoints({
    input,
    queryClient,
    fetchOptions,
    mode,
    preventPrefetchRelatedQueryPoints = false,
  }: {
    input: InputsRaw<any, any>
    queryClient?: QueryClient
    fetchOptions?: FetchOptions
    mode: QueryMode
    preventPrefetchRelatedQueryPoints?: boolean
  }): Promise<void> {
    if (preventPrefetchRelatedQueryPoints) {
      return undefined
    }
    const relatedQueryPoints = this._relatedQueryPoints.filter((point) => point !== this._sameQueryPoint)
    await Promise.all(
      relatedQueryPoints.map(async (point) =>
        point._queryResultType === 'infiniteQuery'
          ? await point.prefetchInfiniteQuery(input, undefined, {
              queryClient,
              fetchOptions,
              mode,
              preventPrefetchFns: true,
            })
          : await point.prefetchQuery(input, undefined, {
              queryClient,
              fetchOptions,
              mode,
              preventPrefetchFns: true,
            }),
      ),
    )
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
            outputType?: FetchOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
            preventPrefetchRelatedQueryPoints?: boolean
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
            outputType?: FetchOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
            preventPrefetchRelatedQueryPoints?: boolean
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
      preventPrefetchRelatedQueryPoints = false,
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
    await Promise.all([
      this._callPrefetchFns({ preventPrefetchFns }),
      queryClient.prefetchQuery(queryOptions as never),
      this._prefetchRelatedQueryPoints({
        input,
        queryClient,
        fetchOptions,
        mode,
        preventPrefetchRelatedQueryPoints,
      }),
    ])
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
    outputType?: FetchOutputType
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
            outputType?: FetchOutputType
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
            outputType?: FetchOutputType
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
            outputType?: FetchOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
            preventPrefetchRelatedQueryPoints?: boolean
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
            outputType?: FetchOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
            preventPrefetchRelatedQueryPoints?: boolean
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
      preventPrefetchRelatedQueryPoints = false,
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
      this._prefetchRelatedQueryPoints({
        input,
        queryClient,
        fetchOptions,
        mode,
        preventPrefetchRelatedQueryPoints,
      }),
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

    const pageWithLayouts = [this, ...this._layouts]

    const uniqPrefetchFns = [...new Set<OnPrefetchFn>(pageWithLayouts.flatMap((p) => p._onPrefetchFns))]

    const prefetchRelatedQueryPointsMode =
      policy === 'onPrefetchOnly'
        ? false
        : policy === 'everything'
          ? // server queries was prefetched on prefetchPageQueryClientDehydratedState step
            queryClientDehydratedStateWasPrefetched
            ? 'client'
            : 'serverAndClient'
          : {
              serverQuery: 'server' as const,
              clientQuery: 'client' as const,
              serverClientQuery: 'serverAndClient' as const,
            }[policy]

    const relatedQueryPointsSelfPrefetchPromise = Promise.all(
      prefetchRelatedQueryPointsMode
        ? pageWithLayouts.map(async (p) => {
            return await p._prefetchRelatedQueryPoints({
              input,
              queryClient,
              fetchOptions,
              mode: prefetchRelatedQueryPointsMode,
            })
          })
        : [],
    )

    const onPrefetchFnsPromise = Promise.all(
      uniqPrefetchFns.map(async (fn) => {
        return await fn()
      }),
    )

    const queriesPrefetching = Promise.all(
      pageWithLayouts.flatMap(async (p) => {
        if (policy === 'onPrefetchOnly') {
          return []
        }
        if (policy === 'everything' && !p._hasClientLoader()) {
          return []
        }
        if (policy === 'clientQuery' && !p._hasClientLoader()) {
          return []
        }
        const inputHere = p === this ? input : p._getUnsafeInputRawByLocation(location)
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

    await Promise.all([queriesPrefetching, onPrefetchFnsPromise, relatedQueryPointsSelfPrefetchPromise])
  }

  // mountable components

  Page = (props: MountableComponentProps<TServerInputSchema, TClientInputSchema, TProps, false>): React.ReactNode => {
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()

    const { inputRaw, restProps } = React.useMemo<{
      inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
      restProps: FinalProps<TProps>
    }>(() => {
      const { input: providedInput, ...restProps } = props as any
      const inputRaw = { ...this._getUnsafeInputRawByLocation(location), ...providedInput }
      return { inputRaw, restProps }
    }, [props, location])

    const clientInputParseResult = React.useMemo<InputParseResult<TClientInputSchema>>(() => {
      const result = this.parseClientInputSafe(inputRaw as never)
      if (!result.success) {
        return { inputParsed: null, inputParseError: result.error } satisfies InputParseResult<TClientInputSchema>
      }
      return { inputParsed: result.data, inputParseError: null } satisfies InputParseResult<TClientInputSchema>
    }, [inputRaw])

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

    if (clientInputParseResult.inputParseError) {
      const result = {
        data: undefined,
        error: clientInputParseResult.inputParseError,
        input: clientInputParseResult.inputParsed,
        query: null,
        location,
        loading: false,
      } satisfies AnyUseLoaderResult<
        'error',
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        AnyLocation
      >
      this._useHead(result)
      return this._withWrappers({
        children: React.createElement(errorComponent, {
          ...result,
          props: restProps,
          type: 'page',
        }),
        useLoaderResult: result,
        props,
      })
    }

    const LoadingComponent = React.useMemo(
      () => () => {
        const result = {
          data: undefined,
          error: null,
          input: clientInputParseResult.inputParsed,
          location,
          loading: true,
          query: null,
        } satisfies AnyUseLoaderResult<
          'pending',
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          AnyLocation
        >
        this._useHead(result)
        return this._withWrappers({
          children: React.createElement(loadingComponent, {
            ...result,
            props: restProps,
            type: 'page',
          }),
          useLoaderResult: result,
          props: restProps,
        })
      },
      [loadingComponent, clientInputParseResult],
    )

    const ErrorComponent = React.useMemo(
      () =>
        ({ error }: { error: Error }) => {
          const result = {
            data: undefined,
            error: Error0.from(error),
            input: clientInputParseResult.inputParsed,
            location,
            loading: false,
            query: null,
          } satisfies AnyUseLoaderResult<
            'error',
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TClientInputSchema,
            AnyLocation
          >
          this._useHead(result)
          return this._withWrappers({
            children: React.createElement(errorComponent, {
              ...result,
              props: restProps,
              type: 'page',
            }),
            props: restProps,
            useLoaderResult: result,
          })
        },
      [errorComponent, clientInputParseResult],
    )

    if (this._hasClientLoader() || this._hasServerLoader() || this._hasMapperFns()) {
      return this._withOuters({
        children: React.createElement(this._PageLoader, {
          location,
          inputRaw,
          clientInputParseResult,
          restProps,
        }),
        input: clientInputParseResult.inputParsed,
        props: restProps,
        location,
        LoadingComponent,
        ErrorComponent,
      })
    }

    if (!this._page) {
      // impossible error
      const result = {
        data: undefined,
        error: new Error0('No page component'),
        input: clientInputParseResult.inputParsed,
        location,
        loading: false,
        query: null,
      } satisfies AnyUseLoaderResult<
        'error',
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        AnyLocation
      >
      this._useHead(result)
      return this._withOuters({
        children: this._withWrappers({
          children: React.createElement(errorComponent, {
            ...result,
            props: restProps,
            type: 'page',
          }),
          useLoaderResult: result,
          props: restProps,
        }),
        input: clientInputParseResult.inputParsed,
        props: restProps,
        location,
        LoadingComponent,
        ErrorComponent,
      })
    }

    const result = {
      data: undefined as never,
      error: null,
      input: clientInputParseResult.inputParsed,
      location,
      loading: false,
      query: null as never,
    } satisfies AnyUseLoaderResult<
      'success',
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      AnyLocation
    >

    this._useHead(result as never)

    return this._withOuters({
      children: this._withWrappers({
        children: React.createElement(this._page, {
          ...(result as any),
          props: restProps,
        }),
        useLoaderResult: result as never,
        props: restProps,
      }),
      input: clientInputParseResult.inputParsed,
      props: restProps,
      location,
      LoadingComponent,
      ErrorComponent,
    })
  }

  _PageLoader = (props: {
    location: AnyLocation
    inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
    clientInputParseResult: InputParseResult<TClientInputSchema>
    restProps: FinalProps<TProps>
  }): React.ReactNode => {
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    const { location, inputRaw, clientInputParseResult, restProps } = props

    const result = this.useLoader(inputRaw, undefined, undefined, clientInputParseResult)

    if (!this._page) {
      const result = {
        data: undefined,
        error: new Error0('No page component'),
        input: clientInputParseResult.inputParsed,
        location,
        loading: false,
        query: null,
      } satisfies AnyUseLoaderResult<
        'error',
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        AnyLocation
      >
      this._useHead(result)
      return this._withWrappers({
        children: React.createElement(errorComponent, {
          ...result,
          props: restProps,
          type: 'page',
        }),
        useLoaderResult: result,
        props: restProps,
      })
    }

    this._useHead(result)

    if (result.error) {
      return this._withWrappers({
        children: React.createElement(errorComponent, {
          ...result,
          props: restProps,
          type: 'page',
        }),
        useLoaderResult: result,
        props: restProps,
      })
    }
    if (result.loading) {
      return this._withWrappers({
        children: React.createElement(loadingComponent, {
          ...result,
          props: restProps,
          type: 'page',
        }),
        useLoaderResult: result,
        props: restProps,
      })
    }

    return this._withWrappers({
      children: React.createElement(this._page, {
        ...result,
        location: result.location as never,
        props: restProps,
      }),
      useLoaderResult: result,
      props: restProps,
    })
  }

  Component = (
    props: MountableComponentProps<TServerInputSchema, TClientInputSchema, TProps, false>,
  ): React.ReactNode => {
    const loadingComponent = this._getLoadingComponent({ type: 'component' })
    const errorComponent = this._getErrorComponent({ type: 'component' })

    const location = useLocation()

    const { inputRaw, restProps } = React.useMemo<{
      inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
      restProps: FinalProps<TProps>
    }>(() => {
      const { input: providedInput = {}, ...restProps } = props as any
      const inputRaw = { ...providedInput }
      return { inputRaw, restProps }
    }, [props])

    const clientInputParseResult = React.useMemo<InputParseResult<TClientInputSchema>>(() => {
      const result = this.parseClientInputSafe(inputRaw as never)
      if (!result.success) {
        return { inputParsed: null, inputParseError: result.error } satisfies InputParseResult<TClientInputSchema>
      }
      return { inputParsed: result.data, inputParseError: null } satisfies InputParseResult<TClientInputSchema>
    }, [inputRaw])

    if (clientInputParseResult.inputParseError) {
      const result = {
        data: undefined,
        error: clientInputParseResult.inputParseError,
        input: clientInputParseResult.inputParsed,
        query: null,
        location,
        loading: false,
      } satisfies AnyUseLoaderResult<
        'error',
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        AnyLocation
      >
      return this._withWrappers({
        children: React.createElement(errorComponent, {
          ...result,
          props: restProps,
          type: 'component',
        }),
        useLoaderResult: result,
        props,
      })
    }

    const LoadingComponent = React.useMemo(
      () => () => {
        const result = {
          data: undefined,
          error: null,
          input: clientInputParseResult.inputParsed,
          location,
          loading: true,
          query: null,
        } satisfies AnyUseLoaderResult<
          'pending',
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          AnyLocation
        >
        return this._withWrappers({
          children: React.createElement(loadingComponent, {
            ...result,
            props: restProps,
            type: 'component',
          }),
          useLoaderResult: result,
          props: restProps,
        })
      },
      [loadingComponent, clientInputParseResult],
    )

    const ErrorComponent = React.useMemo(
      () =>
        ({ error }: { error: Error }) => {
          const result = {
            data: undefined,
            error: Error0.from(error),
            input: clientInputParseResult.inputParsed,
            location,
            loading: false,
            query: null,
          } satisfies AnyUseLoaderResult<
            'error',
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TClientInputSchema,
            AnyLocation
          >
          return this._withWrappers({
            children: React.createElement(errorComponent, {
              ...result,
              props: restProps,
              type: 'component',
            }),
            props: restProps,
            useLoaderResult: result,
          })
        },
      [errorComponent, clientInputParseResult],
    )

    if (this._hasClientLoader() || this._hasServerLoader() || this._hasMapperFns()) {
      return this._withOuters({
        children: React.createElement(this._ComponentLoader, {
          location,
          inputRaw,
          clientInputParseResult,
          restProps,
        }),
        input: clientInputParseResult.inputParsed,
        props: restProps,
        location,
        LoadingComponent,
        ErrorComponent,
      })
    }

    if (!this._component) {
      // impossible error
      const result = {
        data: undefined,
        error: new Error0('No component component'),
        input: clientInputParseResult.inputParsed,
        location,
        loading: false,
        query: null,
      } satisfies AnyUseLoaderResult<
        'error',
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        AnyLocation
      >
      return this._withOuters({
        children: this._withWrappers({
          children: React.createElement(errorComponent, {
            ...result,
            props: restProps,
            type: 'component',
          }),
          useLoaderResult: result,
          props: restProps,
        }),
        input: clientInputParseResult.inputParsed,
        props: restProps,
        location,
        LoadingComponent,
        ErrorComponent,
      })
    }

    const result = {
      data: undefined as never,
      error: null,
      input: clientInputParseResult.inputParsed,
      location,
      loading: false,
      query: null as never,
    } satisfies AnyUseLoaderResult<
      'success',
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      AnyLocation
    >

    return this._withOuters({
      children: this._withWrappers({
        children: React.createElement(this._component, {
          ...result,
          props: restProps,
        }),
        useLoaderResult: result,
        props: restProps,
      }),
      input: clientInputParseResult.inputParsed,
      props: restProps,
      location,
      LoadingComponent,
      ErrorComponent,
    })
  }

  _ComponentLoader = (props: {
    location: AnyLocation
    inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
    clientInputParseResult: InputParseResult<TClientInputSchema>
    restProps: FinalProps<TProps>
  }): React.ReactNode => {
    const loadingComponent = this._getLoadingComponent({ type: 'component' })
    const errorComponent = this._getErrorComponent({ type: 'component' })

    const { location, inputRaw, clientInputParseResult, restProps } = props

    const result = this.useLoader(inputRaw, undefined, undefined, clientInputParseResult)

    if (!this._component) {
      const result = {
        data: undefined,
        error: new Error0('No component component'),
        input: clientInputParseResult.inputParsed,
        location,
        loading: false,
        query: null,
      } satisfies AnyUseLoaderResult<
        'error',
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        AnyLocation
      >
      return this._withWrappers({
        children: React.createElement(errorComponent, {
          ...result,
          props: restProps,
          type: 'component',
        }),
        useLoaderResult: result,
        props: restProps,
      })
    }

    if (result.error) {
      return this._withWrappers({
        children: React.createElement(errorComponent, {
          ...result,
          props: restProps,
          type: 'component',
        }),
        useLoaderResult: result,
        props: restProps,
      })
    }
    if (result.loading) {
      return this._withWrappers({
        children: React.createElement(loadingComponent, {
          ...result,
          props: restProps,
          type: 'component',
        }),
        useLoaderResult: result,
        props: restProps,
      })
    }

    return this._withWrappers({
      children: React.createElement(this._component, {
        ...(result as any),
        props: restProps as never,
      }),
      useLoaderResult: result,
      props: restProps,
    })
  }

  Layout = (props: MountableComponentProps<TServerInputSchema, TClientInputSchema, TProps, true>): React.ReactNode => {
    const loadingComponent = this._getLoadingComponent({ type: 'layout' })
    const errorComponent = this._getErrorComponent({ type: 'layout' })

    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()

    const { inputRaw, children, restProps } = React.useMemo<{
      inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
      children: React.ReactNode
      restProps: FinalProps<TProps>
    }>(() => {
      const { input: providedInput = {}, children, ...restProps } = props as any
      const inputRaw = { ...this._getUnsafeInputRawByLocation(location), ...providedInput }
      return { inputRaw, children, restProps }
    }, [props, location])

    const clientInputParseResult = React.useMemo<InputParseResult<TClientInputSchema>>(() => {
      const result = this.parseClientInputSafe(inputRaw as never)
      if (!result.success) {
        return { inputParsed: null, inputParseError: result.error } satisfies InputParseResult<TClientInputSchema>
      }
      return { inputParsed: result.data, inputParseError: null } satisfies InputParseResult<TClientInputSchema>
    }, [inputRaw])

    if (clientInputParseResult.inputParseError) {
      const result = {
        data: undefined,
        error: clientInputParseResult.inputParseError,
        input: clientInputParseResult.inputParsed,
        query: null,
        location,
        loading: false,
      } satisfies AnyUseLoaderResult<
        'error',
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        AnyLocation
      >
      this._useHead(result)
      return this._withWrappers({
        children: React.createElement(errorComponent, {
          ...result,
          props: restProps,
          type: 'layout',
        }),
        useLoaderResult: result,
        props,
      })
    }

    const LoadingComponent = React.useMemo(
      () => () => {
        const result = {
          data: undefined,
          error: null,
          input: clientInputParseResult.inputParsed,
          location,
          loading: true,
          query: null,
        } satisfies AnyUseLoaderResult<
          'pending',
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          AnyLocation
        >
        this._useHead(result)
        return this._withWrappers({
          children: React.createElement(loadingComponent, {
            ...result,
            props: restProps,
            type: 'layout',
          }),
          useLoaderResult: result,
          props: restProps,
        })
      },
      [loadingComponent, clientInputParseResult],
    )

    const ErrorComponent = React.useMemo(
      () =>
        ({ error }: { error: Error }) => {
          const result = {
            data: undefined,
            error: Error0.from(error),
            input: clientInputParseResult.inputParsed,
            location,
            loading: false,
            query: null,
          } satisfies AnyUseLoaderResult<
            'error',
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TClientInputSchema,
            AnyLocation
          >
          this._useHead(result)
          return this._withWrappers({
            children: React.createElement(errorComponent, {
              ...result,
              props: restProps,
              type: 'layout',
            }),
            props: restProps,
            useLoaderResult: result,
          })
        },
      [errorComponent, clientInputParseResult],
    )

    if (this._hasClientLoader() || this._hasServerLoader() || this._hasMapperFns()) {
      return this._withOuters({
        children: React.createElement(this._LayoutLoader, {
          location,
          inputRaw,
          clientInputParseResult,
          restProps,
          children,
        }),
        input: clientInputParseResult.inputParsed,
        props: restProps,
        location,
        LoadingComponent,
        ErrorComponent,
      })
    }

    if (!this._layout) {
      // impossible error
      const result = {
        data: undefined,
        error: new Error0('No layout component'),
        input: clientInputParseResult.inputParsed,
        location,
        loading: false,
        query: null,
      } satisfies AnyUseLoaderResult<
        'error',
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        AnyLocation
      >
      this._useHead(result)
      return this._withOuters({
        children: this._withWrappers({
          children: React.createElement(errorComponent, {
            ...result,
            props: restProps,
            type: 'layout',
          }),
          useLoaderResult: result,
          props: restProps,
        }),
        input: clientInputParseResult.inputParsed,
        props: restProps,
        location,
        LoadingComponent,
        ErrorComponent,
      })
    }

    const result = {
      data: undefined as never,
      error: null,
      input: clientInputParseResult.inputParsed,
      location,
      loading: false,
      query: null as never,
    } satisfies AnyUseLoaderResult<
      'success',
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      AnyLocation
    >

    return this._withOuters({
      children: this._withWrappers({
        children: React.createElement(this._layout, {
          ...result,
          location: result.location as never,
          children,
          props: restProps,
        }),
        useLoaderResult: result,
        props: restProps,
      }),
      input: clientInputParseResult.inputParsed,
      props: restProps,
      location,
      LoadingComponent,
      ErrorComponent,
    })
  }

  _LayoutLoader = (props: {
    location: AnyLocation
    inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
    clientInputParseResult: InputParseResult<TClientInputSchema>
    restProps: FinalProps<TProps>
    children: React.ReactNode
  }): React.ReactNode => {
    const loadingComponent = this._getLoadingComponent({ type: 'layout' })
    const errorComponent = this._getErrorComponent({ type: 'layout' })

    if (!this._ProviderReactContext) {
      throw new Error(`ProviderReactContext not found on point: ${this.scope}.${this.type}.${this.name}`)
    }

    const { location, inputRaw, clientInputParseResult, restProps, children } = props

    const result = this.useLoader(inputRaw, undefined, undefined, clientInputParseResult)

    if (!this._layout) {
      const result = {
        data: undefined,
        error: new Error0('No layout component'),
        input: clientInputParseResult.inputParsed,
        location,
        loading: false,
        query: null,
      } satisfies AnyUseLoaderResult<
        'error',
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        AnyLocation
      >
      this._useHead(result)
      return this._withWrappers({
        children: React.createElement(errorComponent, {
          ...result,
          props: restProps,
          type: 'layout',
        }),
        useLoaderResult: result,
        props: restProps,
      })
    }

    if (result.error) {
      this._useHead(result)
      return this._withWrappers({
        children: React.createElement(errorComponent, {
          ...result,
          props: restProps,
          type: 'layout',
        }),
        useLoaderResult: result,
        props: restProps,
      })
    }
    if (result.loading) {
      this._useHead(result)
      return this._withWrappers({
        children: React.createElement(loadingComponent, {
          ...result,
          props: restProps,
          type: 'layout',
        }),
        useLoaderResult: result,
        props: restProps,
      })
    }

    const value = result.data
    superstore.setValue(
      `__POINT0_PROVIDER_VALUE_${this.scope}_${this.type}_${this.name}_${this._getTransformer().stringify(inputRaw)}`,
      value,
      'clientServerIsolated',
    )

    return this._withWrappers({
      children: React.createElement(this._layout, {
        ...result,
        location: result.location as never,
        children: React.createElement(this._ProviderReactContext.Provider, {
          value,
          children,
        }),
        props: restProps,
      }),
      useLoaderResult: result,
      props: restProps,
    })
  }

  // provider
  private getSsProviderValueKey(input?: InputsRaw<TServerInputSchema, TClientInputSchema>): string {
    return `__POINT0_PROVIDER_VALUE_${this.scope}_${this.type}_${this.name}_${this._getTransformer().stringify(input || {})}`
  }

  getValue(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [input?: InputsRaw<TServerInputSchema, TClientInputSchema>]
      : [input: InputsRaw<TServerInputSchema, TClientInputSchema>]
  ): FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput> {
    const value = superstore.getValue<
      FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
    >(this.getSsProviderValueKey(...args), 'clientServerIsolated')
    if (!value) {
      throw new Error(
        `Provider value not found on point: provider.${this.name}. You should call getValue only after Provider component is mounted and loaded.`,
      )
    }
    return value
  }

  getValueWeak(
    ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
      ? [input?: InputsRaw<TServerInputSchema, TClientInputSchema>]
      : [input: InputsRaw<TServerInputSchema, TClientInputSchema>]
  ):
    | FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
    | undefined {
    const value = superstore.getValueWeak<
      FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
    >(this.getSsProviderValueKey(...args), 'clientServerIsolated')
    return value
  }

  Provider = (
    props: MountableComponentProps<TServerInputSchema, TClientInputSchema, TProps, null>,
  ): React.ReactNode => {
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    if (!this._ProviderReactContext) {
      throw new Error(`ProviderReactContext not found on point: ${this.scope}.${this.type}.${this.name}`)
    }

    const { inputRaw, children, restProps } = React.useMemo<{
      inputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
      children: React.ReactNode
      restProps: FinalProps<TProps>
    }>(() => {
      const { input: providedInput = {}, children, ...restProps } = props as any
      const inputRaw = { ...providedInput }
      return { inputRaw, children, restProps }
    }, [props, location])

    const result = this.useLoader(inputRaw, this._defaultProviderQueryOptions)

    if (result.error) {
      return this._withWrappers({
        children: React.createElement(errorComponent, {
          ...result,
          props: restProps,
          type: 'page',
        }),
        useLoaderResult: result,
        props,
      })
    }
    if (result.loading) {
      return this._withWrappers({
        children: React.createElement(loadingComponent, {
          ...result,
          props: restProps,
          type: 'page',
        }),
        useLoaderResult: result,
        props,
      })
    }

    // if (!result.data) {
    //   return this._withWrappers({
    //     component: React.createElement(errorComponent, {
    //       ...(result as any),
    //       type: 'page',
    //       error: new Error0('No data'),
    //     }),
    //     useLoaderResult: result,
    //     props,
    //   })
    // }
    const value = result.data
    superstore.setValue(this.getSsProviderValueKey(inputRaw), value, 'clientServerIsolated')
    return this._withWrappers({
      children: React.createElement(this._ProviderReactContext.Provider, {
        value,
        children,
      }),
      useLoaderResult: result,
      props,
    })
  }

  useValue<
    K extends keyof FinalLoaderMappedOutput<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput
    >,
  >(key: K): FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>[K]
  useValue<
    K extends keyof FinalLoaderMappedOutput<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput
    >,
  >(
    keys: K[],
  ): Pick<FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>, K>
  useValue(): FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
  useValue(
    keys?:
      | keyof FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
      | Array<
          keyof FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
        >,
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

  // super store

  static getPointsManager = PointsManager.getPointsManager.bind(PointsManager)
}

export * from './cookies-store.js'
export * from './env.js'
export * from './internals.js'
export * from './points-manager.js'
export * from './query-client.js'
export * from './request0.js'
export * from './response0.js'
export * from './router.js'
export * from './super-store.js'
export type * from './types.js'
export * from './unhead.js'
export * from './utils.js'

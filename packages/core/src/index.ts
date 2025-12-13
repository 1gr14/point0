import { Error0 } from '@devp0nt/error0'
import type {
  AnyLocation,
  AnyRoute,
  CallableRoute,
  Extended,
  FlatInputStringOnly,
  KnownLocation,
} from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type {
  DehydratedState,
  InfiniteData,
  MutationOptions,
  UseInfiniteQueryResult,
  UseMutationOptions,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query'
import {
  QueryClient,
  dehydrate,
  hydrate,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useHead } from '@unhead/react'
import * as React from 'react'
import { stringify } from 'safe-stable-stringify'
import type { ResolvableHead } from 'unhead/types'
import type { Context } from 'use-context-selector'
import { createContext, useContextSelector } from 'use-context-selector'
import { ClientServerHelpers } from './client-server.js'
import { PointsManager } from './points-manager.js'
import { useLocation, useRouterContext } from './router.js'
import type { SuperStoreDefinedItem } from './super-store.js'
import { SuperStore } from './super-store.js'
import type {
  AnyDataOrInfiniteData,
  AnyPoint,
  AppendCtx,
  BasePoint,
  ClientExtractAction,
  ClientLoaderFn,
  ComponentComponent,
  Ctx,
  CtxFn,
  CtxLoaderFn,
  CurrentRouteDefinition,
  Data,
  DestinationComponentType,
  EmptyCtx,
  EmptyStringIfStandaloneSlash,
  EndPointType,
  ErrorComponentType,
  ErrorHeadFn,
  ExtraUseInfiniteQueryOptions,
  ExtraUseQueryOptions,
  FetchOptions,
  FetchOptionsFn,
  FetchOptionsOrFn,
  FetchOutput,
  FetchOutputType,
  FinalClientData,
  FinalProps,
  HasAnyLoader,
  IfAnyThenElse,
  Infer,
  InputParsed,
  InputRaw,
  InputRawMaybeOptional,
  InputSchema,
  InputSchemaZod,
  IsInputOptional,
  LayoutComponent,
  LayoutPoint,
  LoaderFn,
  LoadingComponentType,
  LoadingHeadFn,
  MergeInputSchemas,
  MiddlewareHeadFn,
  MountableComponent,
  MountableComponentProps,
  NiceBaseEndPoint,
  NiceComponentEndPoint,
  NiceEndPoint,
  NiceInfiniteQueryEndPoint,
  NiceLayoutEndPoint,
  NiceMiddlePoint,
  NiceMutationEndPoint,
  NicePageEndPoint,
  NiceProviderEndPoint,
  NiceQueryEndPoint,
  NiceResponseEndPoint,
  NiceRootEndPoint,
  NiceRootMiddlePoint,
  OmitUnnamedKeys,
  OnPrefetchFn,
  PageComponent,
  PagePrefetchPolicy,
  PartialUseInfiniteQueryOptions,
  PointName,
  PointType,
  PointsScope,
  PrependCtx,
  Props,
  ProviderValueSetterFn,
  QueryKey,
  QueryMode,
  QueryResultType,
  RequiredCtx,
  ResponseFn,
  ResponseOutput,
  RootPoint,
  RouteDefinition,
  ScrollPositionGetter,
  ScrollPositionRestorePolicy,
  ScrollPositionSetter,
  ServerExtractAction,
  ShowError,
  SpecificUseLoaderResult,
  StandaloneSlashIfUndefined,
  SuccessHeadFn,
  UndefinedComponentComponent,
  UndefinedCtx,
  UndefinedData,
  UndefinedEndPointType,
  UndefinedInputSchema,
  UndefinedLayoutComponent,
  UndefinedPageComponent,
  UndefinedPointName,
  UndefinedProps,
  UndefinedQueryResultType,
  UndefinedResponseOutput,
  UndefinedRoute,
  UndefinedRouteDefinition,
  UseInfiniteQueryOptions,
  UsePointQueryResult,
  UseQueryOptions,
  WrapperComponentType,
} from './types.js'
import { dedupeSlashes, mergeHeaders, windowScrollPositionGetter, windowScrollPositionSetter } from './utils.js'

export class Point0<
  TPointType extends PointType,
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TProps extends Props | UndefinedProps,
> {
  Infer: Infer<
    TPointType,
    TLetsEndPointType,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > = '__I_AM_POINT0__' as never

  point: typeof this // this, needed for generator to collect points

  private static _prevUnstableId = 0
  private static _getNextUnstableId(): number {
    return Point0._prevUnstableId++
  }

  private readonly _base: BasePoint | LayoutPoint | undefined
  readonly _root: RootPoint | undefined
  private readonly _serverurl: string | undefined
  readonly _baseurl: string | null | undefined
  readonly _pointType: TPointType
  private readonly _letsEndPointType: TLetsEndPointType
  inputSchema: TInputSchema
  private readonly _serverInputSchema: InputSchema | undefined
  readonly _responseFn: TResponseOutput extends ResponseOutput
    ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
    : undefined
  readonly _scope: PointsScope
  private readonly _attachedTo: PointsScope[]
  private readonly _headFns: MiddlewareHeadFn[]
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
    InputRaw<TRouteDefinition, TInputSchema>,
    FinalClientData<TData, TClientData>,
    Error0,
    InfiniteData<FinalClientData<TData, TClientData>>,
    QueryKey,
    unknown
  >
  readonly _queryResultType: TQueryResultType
  private readonly _wrappers: WrapperComponentType[]
  readonly _serverExtractActions: ServerExtractAction[]
  private readonly _clientExtractActions: ClientExtractAction[]
  private readonly _providerValueSetter:
    | ProviderValueSetterFn<any, any, any, FinalClientData<TData, TClientData>>
    | undefined
  private readonly _useValue: undefined | ((point: AnyPoint, keys?: string | string[] | undefined) => any)
  readonly _route: TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute
  private readonly _prevRoute: TPrevRouteDefinition extends RouteDefinition
    ? CallableRoute<TPrevRouteDefinition>
    : UndefinedRoute
  private readonly _page:
    | PageComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
    | UndefinedPageComponent
  private readonly _component:
    | ComponentComponent<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TProps>
    | UndefinedComponentComponent
  private readonly _layout:
    | LayoutComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
    | UndefinedLayoutComponent
  readonly _layouts: LayoutPoint[]
  readonly _name: PointName | UndefinedPointName
  private readonly _unstableId: number
  private readonly _fetchOptions: FetchOptionsFn | undefined
  private readonly _scrollPositionGetter: ScrollPositionGetter
  private readonly _scrollPositionSetter: ScrollPositionSetter
  private readonly _scrollPositionRestorePolicy: ScrollPositionRestorePolicy
  private readonly _prefetchPolicy: PagePrefetchPolicy
  private readonly _onPrefetchFns: OnPrefetchFn[]
  readonly shouldBePrefetchedOnLinkHover: boolean | number
  private readonly _ProviderReactContext: Context<FinalClientData<TData, TClientData>> | undefined
  private readonly _errorComponent:
    | ErrorComponentType<
        DestinationComponentType,
        TQueryResultType,
        TData,
        TResponseOutput,
        TClientData,
        TInputSchema,
        TRouteDefinition,
        TProps
      >
    | undefined
  private readonly _layoutErrorComponent: ErrorComponentType<
    DestinationComponentType,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _pageErrorComponent: ErrorComponentType<
    DestinationComponentType,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _componentErrorComponent: ErrorComponentType<
    DestinationComponentType,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _layoutLoadingComponent: LoadingComponentType<
    DestinationComponentType,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _loadingComponent:
    | LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TData,
        TResponseOutput,
        TClientData,
        TInputSchema,
        TRouteDefinition,
        TProps
      >
    | undefined
  private readonly _pageLoadingComponent: LoadingComponentType<
    DestinationComponentType,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _componentLoadingComponent: LoadingComponentType<
    DestinationComponentType,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition,
    TProps
  >

  private constructor(options: {
    _pointType: TPointType
    _letsEndPointType: TLetsEndPointType
    _base?: BasePoint | LayoutPoint | undefined
    _root?: RootPoint | undefined
    _serverurl?: string | undefined
    _baseurl?: string | null | undefined
    inputSchema?: TInputSchema
    _serverInputSchema?: InputSchema | undefined
    _responseFn?: TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
      : undefined
    _scope: PointsScope
    _attachedTo: PointsScope[]
    _wrappers?: WrapperComponentType[]
    _headFns?: MiddlewareHeadFn[]
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
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
    _queryResultType?: TQueryResultType
    _serverExtractActions?: ServerExtractAction[]
    _clientExtractActions?: ClientExtractAction[]
    _providerValueSetter?: ProviderValueSetterFn<any, any, any, any>
    _ProviderReactContext?: Context<FinalClientData<TData, TClientData>> | undefined
    _useValue?: any
    _route?: TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute
    _prevRoute?: TPrevRouteDefinition extends RouteDefinition ? CallableRoute<TPrevRouteDefinition> : UndefinedRoute
    _page?:
      | PageComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
      | UndefinedPageComponent
    _component?:
      | ComponentComponent<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TProps>
      | UndefinedComponentComponent
    _layout?:
      | LayoutComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
      | UndefinedLayoutComponent
    _layouts?: LayoutPoint[]
    _name?: PointName | UndefinedPointName
    _fetchOptions?: FetchOptionsFn
    _scrollPositionGetter?: ScrollPositionGetter
    _scrollPositionSetter?: ScrollPositionSetter
    _scrollPositionRestorePolicy?: ScrollPositionRestorePolicy
    _prefetchPolicy?: PagePrefetchPolicy
    _onPrefetchFns?: OnPrefetchFn[]
    shouldBePrefetchedOnLinkHover?: boolean | number
    _errorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _loadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _unstableId?: number
  }) {
    this.point = this
    this._scope = options._scope
    this._attachedTo = options._attachedTo
    this._base = options._base ?? undefined
    this._root = options._root ?? undefined
    this.inputSchema = (options.inputSchema ?? undefined) as TInputSchema
    this._serverInputSchema = options._serverInputSchema
    this._serverurl = options._serverurl ?? undefined
    this._baseurl = options._baseurl ?? undefined
    this._responseFn = (options._responseFn ?? undefined) as TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
      : undefined
    this._pointType = options._pointType
    this._letsEndPointType = options._letsEndPointType
    this._wrappers = options._wrappers ?? []
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
    this._serverExtractActions = options._serverExtractActions ?? []
    this._clientExtractActions = options._clientExtractActions ?? []
    this._providerValueSetter = options._providerValueSetter ?? undefined
    this._ProviderReactContext = options._ProviderReactContext ?? undefined
    this._useValue = options._useValue ? options._useValue.bind(this) : undefined
    this._route =
      options._route ??
      (undefined as TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute)
    this._prevRoute =
      options._prevRoute ??
      (undefined as TPrevRouteDefinition extends RouteDefinition ? CallableRoute<TPrevRouteDefinition> : UndefinedRoute)
    this._page = options._page ?? undefined
    this._component = options._component ?? undefined
    this._layout = options._layout ?? undefined
    this._layouts = options._layouts ?? []
    this._name = options._name
    this._fetchOptions = options._fetchOptions ?? (() => ({}))
    this._scrollPositionGetter = options._scrollPositionGetter ?? windowScrollPositionGetter
    this._scrollPositionSetter = options._scrollPositionSetter ?? windowScrollPositionSetter
    this._scrollPositionRestorePolicy = options._scrollPositionRestorePolicy ?? (() => null)
    this._prefetchPolicy = options._prefetchPolicy ?? 'everything'
    this._onPrefetchFns = options._onPrefetchFns ?? []
    this.shouldBePrefetchedOnLinkHover = options.shouldBePrefetchedOnLinkHover ?? false
    this._layoutErrorComponent =
      options._layoutErrorComponent ??
      ((({ error }) => {
        const { stack, ...json } = error.toJSON()
        // TODO: move console.error to .onClientError
        console.error(error)
        return React.createElement(
          React.Fragment,
          null,
          React.createElement('pre', null, JSON.stringify(json, null, 2)),
          React.createElement('pre', null, stack),
        )
      }) as ErrorComponentType<
        DestinationComponentType,
        TQueryResultType,
        TData,
        TResponseOutput,
        TClientData,
        TInputSchema,
        TRouteDefinition,
        TProps
      >)
    this._pageErrorComponent =
      options._pageErrorComponent ??
      ((({ error }) => {
        const { stack, ...json } = error.toJSON()
        // TODO: move console.error to .onClientError
        console.error(error)
        return React.createElement(
          React.Fragment,
          null,
          React.createElement('pre', null, JSON.stringify(json, null, 2)),
          React.createElement('pre', null, stack),
        )
      }) as ErrorComponentType<
        DestinationComponentType,
        TQueryResultType,
        TData,
        TResponseOutput,
        TClientData,
        TInputSchema,
        TRouteDefinition,
        TProps
      >)
    this._componentErrorComponent =
      options._componentErrorComponent ??
      ((({ error }) => {
        const { stack, ...json } = error.toJSON()
        // TODO: move console.error to .onClientError
        console.error(error)
        return React.createElement(
          React.Fragment,
          null,
          // TODO: for react native use another element, not pre, but text or whatever
          React.createElement('pre', null, JSON.stringify(json, null, 2)),
          React.createElement('pre', null, stack),
        )
      }) as ErrorComponentType<
        DestinationComponentType,
        TQueryResultType,
        TData,
        TResponseOutput,
        TClientData,
        TInputSchema,
        TRouteDefinition,
        TProps
      >)
    this._loadingComponent = options._loadingComponent
    this._layoutLoadingComponent =
      options._layoutLoadingComponent ??
      ((() => React.createElement(React.Fragment, null, 'Loading...')) as LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TData,
        TResponseOutput,
        TClientData,
        TInputSchema,
        TRouteDefinition,
        TProps
      >)
    this._pageLoadingComponent =
      options._pageLoadingComponent ??
      ((() => React.createElement(React.Fragment, null, 'Loading...')) as LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TData,
        TResponseOutput,
        TClientData,
        TInputSchema,
        TRouteDefinition,
        TProps
      >)
    this._componentLoadingComponent =
      options._componentLoadingComponent ??
      ((() => React.createElement(React.Fragment, null, 'Loading...')) as LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TData,
        TResponseOutput,
        TClientData,
        TInputSchema,
        TRouteDefinition,
        TProps
      >)
    this._unstableId = options._unstableId ?? Point0._getNextUnstableId()
  }

  private _continue<
    TPointType extends PointType,
    TLetsEndPointType extends EndPointType | UndefinedEndPointType,
    TRequiredCtx extends RequiredCtx,
    TCtx extends Ctx,
    TData extends Data | UndefinedData,
    TClientData extends Data | UndefinedData,
    TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
    TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
    TInputSchema extends InputSchema | UndefinedInputSchema,
    TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
    TQueryResultType extends QueryResultType | UndefinedQueryResultType,
    TProps extends Props | UndefinedProps,
  >(overrides: {
    _pointType?: TPointType
    _scope?: PointsScope
    _attachedTo?: PointsScope[]
    _letsEndPointType?: TLetsEndPointType
    _base?: BasePoint | LayoutPoint | undefined
    _root?: RootPoint | undefined
    _serverurl?: string | undefined
    _baseurl?: string | null | undefined
    inputSchema?: TInputSchema
    _serverInputSchema?: InputSchema | undefined
    _responseFn?: TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
      : undefined
    _headFns?: MiddlewareHeadFn[]
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
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
    _queryResultType?: TQueryResultType
    _wrappers?: WrapperComponentType[]
    _serverExtractActions?: ServerExtractAction[]
    _clientExtractActions?: ClientExtractAction[]
    _providerValueSetter?: ProviderValueSetterFn<any, any, any, any> | undefined
    _ProviderReactContext?: Context<FinalClientData<TData, TClientData>> | undefined
    _useValue?: any
    _route?: IfAnyThenElse<
      TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute,
      AnyRoute
    >
    _prevRoute?: IfAnyThenElse<
      TPrevRouteDefinition extends RouteDefinition ? CallableRoute<TPrevRouteDefinition> : UndefinedRoute,
      AnyRoute
    >
    _page?:
      | PageComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
      | UndefinedPageComponent
    _component?:
      | ComponentComponent<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TProps>
      | UndefinedComponentComponent
    _layout?:
      | LayoutComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
      | UndefinedLayoutComponent
    _layouts?: LayoutPoint[]
    _name?: PointName | UndefinedPointName
    _fetchOptions?: FetchOptionsFn
    _scrollPositionGetter?: ScrollPositionGetter
    _scrollPositionSetter?: ScrollPositionSetter
    _scrollPositionRestorePolicy?: ScrollPositionRestorePolicy
    _prefetchPolicy?: PagePrefetchPolicy
    _onPrefetchFns?: OnPrefetchFn[]
    shouldBePrefetchedOnLinkHover?: boolean | number
    _errorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _loadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
  }): Point0<
    TPointType,
    TLetsEndPointType,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return new Point0<
      TPointType,
      TLetsEndPointType,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _scope: overrides._scope ?? this._scope,
      _attachedTo: overrides._attachedTo ?? this._attachedTo,
      _base: overrides._base ?? this._base,
      _root: overrides._root ?? this._root,
      _pointType: (overrides._pointType ?? this._pointType) as TPointType,
      _letsEndPointType: (overrides._letsEndPointType ?? this._letsEndPointType) as TLetsEndPointType,
      _serverurl: overrides._serverurl ?? this._serverurl,
      _baseurl: overrides._baseurl ?? this._baseurl,
      inputSchema: (overrides.inputSchema ?? this.inputSchema) as TInputSchema,
      _serverInputSchema: overrides._serverInputSchema ?? this._serverInputSchema,
      _responseFn: (overrides._responseFn ?? this._responseFn) as TResponseOutput extends ResponseOutput
        ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
        : undefined,
      _wrappers: overrides._wrappers ?? this._wrappers,
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
        InputRaw<TRouteDefinition, TInputSchema>,
        FinalClientData<TData, TClientData>,
        Error0,
        InfiniteData<FinalClientData<TData, TClientData>>,
        QueryKey,
        unknown
      >,
      _queryResultType: (overrides._queryResultType ?? this._queryResultType) as TQueryResultType,
      _serverExtractActions: overrides._serverExtractActions ?? this._serverExtractActions,
      _clientExtractActions: overrides._clientExtractActions ?? this._clientExtractActions,
      _providerValueSetter: overrides._providerValueSetter ?? this._providerValueSetter,
      _ProviderReactContext: (overrides._ProviderReactContext ?? this._ProviderReactContext) as never,
      _useValue: overrides._useValue ?? this._useValue,
      _route: (overrides._route ?? this._route) as never,
      _prevRoute: (overrides._prevRoute ?? this._prevRoute) as never,
      _page: (overrides._page ?? this._page) as never,
      _component: (overrides._component ?? this._component) as never,
      _layout: (overrides._layout ?? this._layout) as never,
      _layouts: overrides._layouts ?? this._layouts,
      _name: overrides._name ?? this._name,
      _fetchOptions: overrides._fetchOptions ?? this._fetchOptions,
      _scrollPositionGetter: overrides._scrollPositionGetter ?? this._scrollPositionGetter,
      _scrollPositionSetter: overrides._scrollPositionSetter ?? this._scrollPositionSetter,
      _scrollPositionRestorePolicy: overrides._scrollPositionRestorePolicy ?? this._scrollPositionRestorePolicy,
      _prefetchPolicy: overrides._prefetchPolicy ?? this._prefetchPolicy,
      _onPrefetchFns: overrides._onPrefetchFns ?? this._onPrefetchFns,
      shouldBePrefetchedOnLinkHover: overrides.shouldBePrefetchedOnLinkHover ?? this.shouldBePrefetchedOnLinkHover,
      _errorComponent: (overrides._errorComponent ?? this._errorComponent) as never,
      _layoutErrorComponent: (overrides._layoutErrorComponent ?? this._layoutErrorComponent) as never,
      _pageErrorComponent: (overrides._pageErrorComponent ?? this._pageErrorComponent) as never,
      _componentErrorComponent: (overrides._componentErrorComponent ?? this._componentErrorComponent) as never,
      _loadingComponent: (overrides._loadingComponent ?? this._loadingComponent) as never,
      _layoutLoadingComponent: (overrides._layoutLoadingComponent ?? this._layoutLoadingComponent) as never,
      _pageLoadingComponent: (overrides._pageLoadingComponent ?? this._pageLoadingComponent) as never,
      _componentLoadingComponent: (overrides._componentLoadingComponent ?? this._componentLoadingComponent) as never,
    })
  }

  // call on on root points
  attach<TPoint extends NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any>>(
    point: TPoint,
  ): TPoint {
    const result = this._continue({
      ...point,
      _headFns: [...this._headFns, ...point.point._headFns],
      _serverExtractActions: [...this._serverExtractActions, ...point.point._serverExtractActions],
      _clientExtractActions: [...this._clientExtractActions, ...point.point._clientExtractActions],
      _scope: this._scope,
      _root: this._root,
      _attachedTo: [],
    }) as never
    return result
  }

  static create(
    scope: string,
  ): NiceRootMiddlePoint<
    'middleware',
    'root',
    UndefinedCtx,
    EmptyCtx,
    UndefinedData,
    UndefinedData,
    UndefinedRoute,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedResponseOutput,
    UndefinedQueryResultType,
    UndefinedProps
  >
  static create<TRootPoint extends NiceRootEndPoint<any, any, any, any, any, any, any, any, any, any, any, any>>(
    scope: string,
    attachedTo: PointsScope[],
  ): NiceRootMiddlePoint<
    'middleware',
    'root',
    // TODO: check .d.ts files, is this approach heavy or not?
    TRootPoint['Infer']['RequiredCtx'],
    TRootPoint['Infer']['Ctx'],
    TRootPoint['Infer']['Data'],
    TRootPoint['Infer']['ClientData'],
    UndefinedRoute,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedResponseOutput,
    UndefinedQueryResultType,
    UndefinedProps
  >
  static create(scope: string, attachedTo?: PointsScope[]) {
    return new Point0({
      _pointType: 'middleware',
      _scope: scope,
      _attachedTo: attachedTo ?? [],
      _letsEndPointType: 'root',
      _serverurl: typeof window !== 'undefined' ? window.location.origin : undefined,
    }) as never
  }

  // root settings

  requireCtx<TExtraRequiredCtx extends Ctx>(): NiceRootMiddlePoint<
    TPointType,
    'root',
    AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
    PrependCtx<TCtx, TExtraRequiredCtx>,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      'root',
      AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
      PrependCtx<TCtx, TExtraRequiredCtx>,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({})
  }

  serverurl(
    serverurl: string,
  ): NiceRootMiddlePoint<
    TPointType,
    'root',
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      'root',
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _serverurl: serverurl,
    })
  }

  baseurl(
    baseurl: string,
  ): NiceRootMiddlePoint<
    TPointType,
    'root',
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      'root',
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _baseurl: baseurl,
    })
  }

  // general settings

  mutationOptions(
    mutationOptions: UseMutationOptions,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultMutationOptions: mutationOptions,
    }) as never
  }

  queryOptions(
    queryOptions: ExtraUseQueryOptions,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultQueryOptions: queryOptions,
    }) as never
  }

  infiniteQueryOptions(
    infiniteQueryOptions: PartialUseInfiniteQueryOptions,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultInfiniteQueryOptions: infiniteQueryOptions,
    }) as never
  }

  pageQueryOptions(
    pageQueryOptions: UseQueryOptions,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultPageQueryOptions: pageQueryOptions,
    }) as never
  }

  componentQueryOptions(
    componentQueryOptions: UseQueryOptions,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultComponentQueryOptions: componentQueryOptions,
    }) as never
  }

  providerQueryOptions(
    providerQueryOptions: UseQueryOptions,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultProviderQueryOptions: providerQueryOptions,
    }) as never
  }

  layoutQueryOptions(
    layoutQueryOptions: UseQueryOptions,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _defaultLayoutQueryOptions: layoutQueryOptions,
    }) as never
  }

  fetchOptions(
    fetchOptionsOrFn: FetchOptionsOrFn,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _fetchOptions: typeof fetchOptionsOrFn === 'function' ? fetchOptionsOrFn : () => fetchOptionsOrFn,
    }) as never
  }

  // extra components

  error(
    errorComponent: TLetsEndPointType extends 'page' | 'layout' | 'component'
      ? ErrorComponentType<
          DestinationComponentType,
          TQueryResultType,
          TData,
          TResponseOutput,
          TClientData,
          TInputSchema,
          TRouteDefinition,
          TProps
        >
      : ErrorComponentType,
  ): NiceMiddlePoint<
    TLetsEndPointType extends 'page' | 'layout' | 'component' ? 'renderMiddleware' : TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  error(
    ...args: TLetsEndPointType extends 'page'
      ? [
          head: ErrorHeadFn<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TRouteDefinition>,
          pageErrorComponent: ErrorComponentType<
            DestinationComponentType,
            TQueryResultType,
            TData,
            TResponseOutput,
            TClientData,
            TInputSchema,
            TRouteDefinition,
            TProps
          >,
        ]
      : never
  ): NiceMiddlePoint<
    TLetsEndPointType extends 'page' ? 'renderMiddleware' : TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  error(...args: [head: any, errorComponent: any] | [errorComponent: any]) {
    const [head, errorComponent] = (args.length === 2 ? args : [undefined, args[0]]) as [
      ErrorHeadFn | undefined,
      ErrorComponentType,
    ]
    if (this._letsEndPointType === 'page') {
      const headFn = !head ? undefined : typeof head === 'function' ? head : () => head
      const errorHeadFn: MiddlewareHeadFn | undefined = !headFn
        ? undefined
        : (options) => (!options.error ? {} : headFn(options as never))
      return this._continue({
        _headFns: !errorHeadFn ? this._headFns : [...this._headFns, errorHeadFn],
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- but as I know we replace it with () => null, but it is safer to keep it
        _errorComponent: (errorComponent as never) || (() => null), // in case if we prune pageError for serverNoSsr customer
      }) as never
    } else if (
      this._letsEndPointType === 'layout' ||
      this._letsEndPointType === 'component' ||
      this._letsEndPointType === 'provider'
    ) {
      return this._continue({
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        _errorComponent: (errorComponent as never) || (() => null), // in case if we prune error for serverNoSsr customer
      }) as never
    } else {
      return this._continue({
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        _layoutErrorComponent: (errorComponent as never) || (() => null), // in case if we prune error for serverNoSsr customer
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        _pageErrorComponent: (errorComponent as never) || (() => null), // in case if we prune error for serverNoSsr customer
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        _componentErrorComponent: (errorComponent as never) || (() => null), // in case if we prune error for serverNoSsr customer
      }) as never
    }
  }

  layoutError(
    layoutErrorComponent: ErrorComponentType,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      _layoutErrorComponent: (layoutErrorComponent as never) || (() => null), // in case if we prune layoutError for serverNoSsr customer
    }) as never
  }

  pageError(
    head: ErrorHeadFn,
    pageErrorComponent: ErrorComponentType,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  pageError(
    pageErrorComponent: ErrorComponentType,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  pageError(
    ...args: [head: ErrorHeadFn, pageErrorComponent: ErrorComponentType] | [pageErrorComponent: ErrorComponentType]
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    const [head, pageErrorComponent] = args.length === 2 ? args : [undefined, args[0]]
    const headFn = !head ? undefined : typeof head === 'function' ? head : () => head
    const errorHeadFn: MiddlewareHeadFn | undefined = !headFn
      ? undefined
      : (options) => (!options.error ? {} : headFn(options as never))
    return this._continue({
      _headFns: !errorHeadFn ? this._headFns : [...this._headFns, errorHeadFn],
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- but as I know we replace it with () => null, but it is safer to keep it
      _pageErrorComponent: (pageErrorComponent as never) || (() => null), // in case if we prune pageError for serverNoSsr customer
    }) as never
  }

  componentError(
    componentErrorComponent: ErrorComponentType,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      _componentErrorComponent: (componentErrorComponent as never) || (() => null), // in case if we prune componentError for serverNoSsr customer
    }) as never
  }

  layoutLoading(
    layoutLoadingComponent: LoadingComponentType,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      _layoutLoadingComponent: (layoutLoadingComponent as never) || (() => null), // in case if we prune layoutLoading for serverNoSsr customer
    }) as never
  }

  pageLoading(
    head: LoadingHeadFn,
    pageLoadingComponent: LoadingComponentType,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  pageLoading(
    pageLoadingComponent: LoadingComponentType,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  pageLoading(
    ...args:
      | [head: LoadingHeadFn, pageLoadingComponent: LoadingComponentType]
      | [pageLoadingComponent: LoadingComponentType]
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    const [head, pageLoadingComponent] = args.length === 2 ? args : [undefined, args[0]]
    const headFn = !head ? undefined : typeof head === 'function' ? head : () => head
    const loadingHeadFn: MiddlewareHeadFn | undefined = !headFn
      ? undefined
      : (options) => (!options.loading ? {} : headFn(options as never))
    return this._continue({
      _headFns: !loadingHeadFn ? this._headFns : [...this._headFns, loadingHeadFn],
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- but as I know we replace it with () => null, but it is safer to keep it
      _pageLoadingComponent: (pageLoadingComponent as never) || (() => null), // in case if we prune pageLoading for serverNoSsr customer
    }) as never
  }

  componentLoading(
    componentLoadingComponent: LoadingComponentType,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      _componentLoadingComponent: (componentLoadingComponent as never) || (() => null), // in case if we prune componentLoading for serverNoSsr customer
    }) as never
  }

  loading(
    pageLoadingComponent: TLetsEndPointType extends 'page' | 'layout' | 'component'
      ? LoadingComponentType<
          DestinationComponentType,
          TQueryResultType,
          TData,
          TResponseOutput,
          TClientData,
          TInputSchema,
          TRouteDefinition,
          TProps
        >
      : LoadingComponentType,
  ): NiceMiddlePoint<
    TLetsEndPointType extends 'page' | 'layout' | 'component' ? 'renderMiddleware' : TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  loading(
    ...args: TLetsEndPointType extends 'page'
      ? [
          head: LoadingHeadFn<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TRouteDefinition>,
          pageLoadingComponent: LoadingComponentType<
            DestinationComponentType,
            TQueryResultType,
            TData,
            TResponseOutput,
            TClientData,
            TInputSchema,
            TRouteDefinition,
            TProps
          >,
        ]
      : never
  ): NiceMiddlePoint<
    TLetsEndPointType extends 'page' ? 'renderMiddleware' : TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  loading(...args: [head: any, pageLoadingComponent: any] | [pageLoadingComponent: any]) {
    const [head, ladingComponent] = args.length === 2 ? args : [undefined, args[0]]
    if (this._letsEndPointType === 'page') {
      const headFn = !head ? undefined : typeof head === 'function' ? head : () => head
      const loadingHeadFn: MiddlewareHeadFn | undefined = !headFn
        ? undefined
        : (options) => (!options.error ? {} : headFn(options as never))
      return this._continue({
        _headFns: !loadingHeadFn ? this._headFns : [...this._headFns, loadingHeadFn],
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- but as I know we replace it with () => null, but it is safer to keep it
        _loadingComponent: (ladingComponent as never) || (() => null), // in case if we prune pageLoading for serverNoSsr customer
      }) as never
    } else if (
      this._letsEndPointType === 'layout' ||
      this._letsEndPointType === 'component' ||
      this._letsEndPointType === 'provider'
    ) {
      return this._continue({
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        _loadingComponent: (ladingComponent as never) || (() => null), // in case if we prune loading for serverNoSsr customer
      }) as never
    } else {
      return this._continue({
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        _layoutLoadingComponent: (ladingComponent as never) || (() => null), // in case if we prune loading for serverNoSsr customer
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        _pageLoadingComponent: (ladingComponent as never) || (() => null), // in case if we prune loading for serverNoSsr customer
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        _componentLoadingComponent: (ladingComponent as never) || (() => null), // in case if we prune loading for serverNoSsr customer
      }) as never
    }
  }

  wrapper(
    wrapperComponent: WrapperComponentType<
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      TProps
    >,
  ): NiceMiddlePoint<
    'renderMiddleware',
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _wrappers: [...this._wrappers, wrapperComponent as never],
    }) as never
  }

  // middlewares

  ctx<TNewCtx extends Ctx = Ctx>(
    ctxFn: CtxFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewCtx>,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  ctx<TNewCtx extends Ctx = Ctx>(
    ctx: TNewCtx,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  ctx<TNewCtx extends Ctx = Ctx>(
    ctxOrFn: TNewCtx,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    const ctxFn =
      typeof ctxOrFn === 'undefined' // in case if we prune ctx for client customer
        ? ({ ctx }: { ctx: TCtx }) => ({ ...ctx })
        : typeof ctxOrFn === 'function'
          ? ctxOrFn
          : ({ ctx }: { ctx: TCtx }) => ({ ...ctx, ...ctxOrFn })
    return this._continue({
      _serverExtractActions: [
        ...this._serverExtractActions,
        { type: 'ctx', fn: ctxFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
    }) as never
  }

  loader<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewData>,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TNewData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType extends UndefinedQueryResultType ? 'query' : TQueryResultType,
    TProps
  > {
    return this._continue({
      _queryResultType: this._queryResultType ?? 'query',
      _serverExtractActions: [
        ...this._serverExtractActions,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we prune loader for client
        { type: 'loader', fn: loaderFn ?? ((c: any) => c.data), unstableId: Point0._getNextUnstableId() },
      ] as never,
    }) as never
  }

  ctxLoader<TNewCtx extends Ctx = Ctx, TNewData extends Data = Data>(
    ctxLoaderFn: CtxLoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewCtx, TNewData>,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TNewCtx,
    TNewData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType extends UndefinedQueryResultType ? 'query' : TQueryResultType,
    TProps
  > {
    return this._continue({
      _queryResultType: this._queryResultType ?? 'query',
      _serverExtractActions: [
        ...this._serverExtractActions,
        {
          type: 'ctxLoader',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we prune ctxLoader for client
          fn: ctxLoaderFn ?? ((c: any) => ({ data: c.data, ctx: c.ctx })),
          unstableId: Point0._getNextUnstableId(),
        },
      ] as never,
    }) as never
  }

  clientLoader<TNewClientData extends Data = Data>(
    clientLoaderFn: ClientLoaderFn<
      TLetsEndPointType,
      TRouteDefinition,
      TInputSchema,
      FinalClientData<TData, TClientData>,
      TNewClientData
    >,
  ): NiceMiddlePoint<
    'clientMiddleware',
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TNewClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType extends UndefinedQueryResultType ? 'query' : TQueryResultType,
    TProps
  > {
    return this._continue({
      _pointType: 'clientMiddleware',
      _queryResultType: this._queryResultType ?? 'query',
      _clientExtractActions: [
        ...this._clientExtractActions,
        {
          type: 'loader',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          fn: clientLoaderFn || (({ data }: { data: TNewClientData }) => ({ ...data })), // in case if we prune clientLoader for server customer
          unstableId: Point0._getNextUnstableId(),
        },
      ] as never,
    }) as never
  }

  head(
    head: MiddlewareHeadFn | ResolvableHead | string,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
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

  props<TNewProps extends Props>(): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TNewProps
  > {
    return this._continue({}) as never
  }

  input<TNewInputSchema extends InputSchemaZod>(
    inputSchema: InputParsed<
      TRouteDefinition,
      MergeInputSchemas<TInputSchema, TNewInputSchema>
    > extends OmitUnnamedKeys<InputParsed<TRouteDefinition, TInputSchema>>
      ? TNewInputSchema
      : ShowError<`Provided schema is not assignable to previous input schema`> & TNewInputSchema,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    MergeInputSchemas<TInputSchema, TNewInputSchema>,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  input(inputSchema: InputSchemaZod) {
    return this._continue({
      inputSchema: this.inputSchema ? this.inputSchema.extend(inputSchema.shape) : inputSchema,
      _serverInputSchema:
        this._pointType === 'middleware'
          ? this._serverInputSchema
            ? this._serverInputSchema.extend(inputSchema.shape)
            : inputSchema
          : this._serverInputSchema,
      _clientExtractActions:
        this._pointType === 'clientMiddleware'
          ? [
              ...this._clientExtractActions,
              { type: 'input', schema: inputSchema, unstableId: Point0._getNextUnstableId() },
            ]
          : this._clientExtractActions,
      _serverExtractActions:
        this._pointType === 'middleware'
          ? [
              ...this._serverExtractActions,
              { type: 'input', schema: inputSchema, unstableId: Point0._getNextUnstableId() },
            ]
          : this._serverExtractActions,
    }) as never
  }

  // end points

  // TODO:ASAP remove it
  // route<TNewRoute extends AnyRoute>(
  //   route: FlatInputStringOnly<TNewRoute> extends InputRaw<TRouteDefinition, TInputSchema>
  //     ? TNewRoute
  //     : ShowError<`Route ${TNewRoute['definition']} is not assignable to previous input schema`> & TNewRoute,
  // ): NiceMiddlePoint<
  //   TPointType,
  //   TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   TNewRoute['definition'],
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponseOutput,
  //   TQueryResultType,
  //   TProps
  // >
  // route<TNewRouteDefinition extends `/${string}`>(
  //   routeDefinition: TNewRouteDefinition,
  // ): NiceMiddlePoint<
  //   TPointType,
  //   TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   Route0<TNewRouteDefinition>['definition'],
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponseOutput,
  //   TQueryResultType,
  //   TProps
  // >
  // route<TNewRouteDefinition extends string>(
  //   relativeRouteDefinition: TNewRouteDefinition,
  // ): NiceMiddlePoint<
  //   TPointType,
  //   TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   TPrevRouteDefinition extends RouteDefinition
  //     ? Extended<TPrevRouteDefinition, TNewRouteDefinition>['definition']
  //     : Route0<DedupeSlashes<`/${TNewRouteDefinition}`>>['definition'],
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponseOutput,
  //   TQueryResultType,
  //   TProps
  // >
  // route(): NiceMiddlePoint<
  //   TPointType,
  //   TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   TPrevRouteDefinition extends RouteDefinition ? TPrevRouteDefinition : never,
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponseOutput,
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

  lets<TPointName extends PointName, TProvidedRoute extends AnyRoute | RouteDefinition = TPointName>(
    letsEndPointType: 'page',
    pointName: TPointName,
    route?: TProvidedRoute,
  ): NiceMiddlePoint<
    'middleware',
    'page',
    TRequiredCtx,
    TCtx,
    TData,
    UndefinedData,
    TProvidedRoute extends AnyRoute
      ? FlatInputStringOnly<TProvidedRoute> extends InputRaw<TRouteDefinition, TInputSchema>
        ? TProvidedRoute['definition']
        : ShowError<`Route ${TProvidedRoute['definition']} is not assignable to previous input schema`> &
            TProvidedRoute['definition']
      : TProvidedRoute extends RouteDefinition
        ? Extended<
            StandaloneSlashIfUndefined<TRouteDefinition>,
            EmptyStringIfStandaloneSlash<TProvidedRoute>
          >['definition']
        : never,
    TRouteDefinition,
    TInputSchema,
    UndefinedResponseOutput,
    TQueryResultType,
    UndefinedProps
  >
  lets<TPointName extends PointName, TProvidedRoute extends AnyRoute | RouteDefinition = '/'>(
    letsEndPointType: 'layout',
    pointName: TPointName,
    route?: TProvidedRoute,
  ): NiceMiddlePoint<
    'middleware',
    'layout',
    TRequiredCtx,
    TCtx,
    TData,
    UndefinedData,
    TProvidedRoute extends AnyRoute
      ? FlatInputStringOnly<TProvidedRoute> extends InputRaw<TRouteDefinition, TInputSchema>
        ? TProvidedRoute['definition']
        : ShowError<`Route ${TProvidedRoute['definition']} is not assignable to previous input schema`> &
            TProvidedRoute['definition']
      : TProvidedRoute extends RouteDefinition
        ? Extended<
            StandaloneSlashIfUndefined<TRouteDefinition>,
            EmptyStringIfStandaloneSlash<TProvidedRoute>
          >['definition']
        : never,
    TRouteDefinition,
    TInputSchema,
    UndefinedResponseOutput,
    TQueryResultType,
    UndefinedProps
  >
  lets<TNewLetsEndPointType extends Exclude<EndPointType, 'page' | 'layout' | 'root'>, TPointName extends PointName>(
    letsEndPointType: TNewLetsEndPointType,
    pointName: TPointName,
  ): NiceMiddlePoint<
    'middleware',
    TNewLetsEndPointType extends EndPointType ? TNewLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    UndefinedData,
    TRouteDefinition,
    TRouteDefinition,
    TInputSchema,
    UndefinedResponseOutput,
    TQueryResultType,
    UndefinedProps
  >
  lets(letsEndPointType: EndPointType, pointName: PointName, route?: AnyRoute | string) {
    const prevRoute = this._route
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
    return this._continue({
      _pointType: 'middleware',
      _letsEndPointType: letsEndPointType,
      _name: pointName,
      _route: newRoute as never,
      _prevRoute: this._route as never,
      _page: undefined,
      _component: undefined,
      _layout: undefined,
      _ProviderReactContext: undefined,
      _providerValueSetter: undefined,
      _useValue: undefined,
      _layouts: this._pointType === 'layout' ? [...this._layouts, this as LayoutPoint] : [...this._layouts],
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
      _infiniteQueryOptions: {} as never,
      _queryResultType: undefined,
      _clientExtractActions: [],
      _fetchOptions: this._base?._fetchOptions,
      _scrollPositionGetter: this._base?._scrollPositionGetter,
      _scrollPositionSetter: this._base?._scrollPositionSetter,
      _scrollPositionRestorePolicy: this._base?._scrollPositionRestorePolicy,
      _prefetchPolicy: this._base?._prefetchPolicy,
      _onPrefetchFns: this._base?._onPrefetchFns,
      shouldBePrefetchedOnLinkHover: this._base?.shouldBePrefetchedOnLinkHover ?? false,
      _wrappers: this._base?._wrappers ?? [],
      _errorComponent: undefined,
      _layoutErrorComponent: this._base?._layoutErrorComponent as never,
      _pageErrorComponent: this._base?._pageErrorComponent as never,
      _componentErrorComponent: this._base?._componentErrorComponent as never,
      _loadingComponent: undefined,
      _layoutLoadingComponent: this._base?._layoutLoadingComponent as never,
      _pageLoadingComponent: this._base?._pageLoadingComponent as never,
      _componentLoadingComponent: this._base?._componentLoadingComponent as never,
    }) as never
  }

  root(): NiceRootEndPoint<
    'root',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _pointType: 'root',
      _base: this as never as BasePoint,
      _root: this as never as RootPoint,
      _name: this._scope,
      _letsEndPointType: undefined,
    })
  }

  base(): NiceBaseEndPoint<
    'base',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _pointType: 'base',
      _base: this as never as BasePoint,
      _letsEndPointType: undefined,
    }) as never
  }

  page(): MountableComponent<TInputSchema, TProps, false> &
    NicePageEndPoint<
      'page',
      UndefinedEndPointType,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >
  page<
    TPage extends PageComponent<
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TRouteDefinition,
      TInputSchema,
      TProps
    >,
  >(
    page: TPage,
  ): MountableComponent<TInputSchema, TProps, false> &
    NicePageEndPoint<
      'page',
      UndefinedEndPointType,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >
  page<
    TPage extends PageComponent<
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TRouteDefinition,
      TInputSchema,
      TProps
    >,
  >(
    head:
      | SuccessHeadFn<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema>
      | ResolvableHead
      | string,
    page: TPage,
  ): MountableComponent<TInputSchema, TProps, false> &
    NicePageEndPoint<
      'page',
      UndefinedEndPointType,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >
  page(
    ...args:
      | [
          (
            | SuccessHeadFn<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema>
            | ResolvableHead
            | string
          ),
          PageComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>,
        ]
      | [
          | PageComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
          | undefined,
        ]
  ): NicePageEndPoint<
    'page',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    const [head, page = () => null] = args.length === 2 ? args : [undefined, args[0]]
    const headFn = !head ? undefined : typeof head === 'function' ? head : () => head
    const successHeadFn: MiddlewareHeadFn | undefined = !headFn
      ? undefined
      : (options) => (!options.data || options.loading || options.error ? {} : headFn(options as never))
    const point = this._continue({
      _pointType: 'page',
      _page: page,
      _letsEndPointType: undefined,
      _headFns: !successHeadFn ? this._headFns : [...this._headFns, successHeadFn],
    })
    const pageWithPoint = point._Page.bind(point)
    Object.assign(pageWithPoint, {
      Infer: point.Infer,
      point,
      lets: point.lets.bind(point),
      inputSchema: point.inputSchema,
      useQuery: point.useQuery.bind(point),
      getQueryKey: point.getQueryKey.bind(point),
      getQueryOptions: point.getQueryOptions.bind(point),
      prefetchQuery: point.prefetchQuery.bind(point),
      fetch: point.fetch.bind(point),
      extract: point.extract.bind(point),
      useInfiniteQuery: point.useInfiniteQuery.bind(point),
      getInfiniteQueryOptions: point.getInfiniteQueryOptions.bind(point),
      prefetchInfiniteQuery: point.prefetchInfiniteQuery.bind(point),
    })
    return pageWithPoint as never
    // Point0.setGlobalPoint(point)
    // return point._Page
  }

  // component(): NiceComponentEndPoint<
  //   'component',
  //   UndefinedEndPointType,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   TRouteDefinition,
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponseOutput,
  //   TQueryResultType,
  //   TProps
  // >
  // component<
  //   TComponent extends ComponentComponent<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TProps>,
  // >(
  //   component: TComponent,
  // ): NiceComponentEndPoint<
  //   'component',
  //   UndefinedEndPointType,
  //   TRequiredCtx,
  //   TCtx,
  //   TData,
  //   TClientData,
  //   TRouteDefinition,
  //   TPrevRouteDefinition,
  //   TInputSchema,
  //   TResponseOutput,
  //   TQueryResultType,
  //   TProps
  // >
  component<
    TComponent extends ComponentComponent<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TProps>,
  >(
    component?: TComponent,
  ): NiceComponentEndPoint<
    'component',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    // ): MountableComponent<TInputSchema, TProps, false> {
    const point = this._continue({
      _pointType: 'component',
      _component: component || ((() => null) as never),
      _letsEndPointType: undefined,
    })
    const componentWithPoint = point._Component
    Object.assign(componentWithPoint, {
      Infer: point.Infer,
      point,
      lets: point.lets.bind(point),
      inputSchema: point.inputSchema,
      useQuery: point.useQuery.bind(point),
      getQueryKey: point.getQueryKey.bind(point),
      getQueryOptions: point.getQueryOptions.bind(point),
      prefetchQuery: point.prefetchQuery.bind(point),
      fetch: point.fetch.bind(point),
      extract: point.extract.bind(point),
      useInfiniteQuery: point.useInfiniteQuery.bind(point),
      getInfiniteQueryOptions: point.getInfiniteQueryOptions.bind(point),
      prefetchInfiniteQuery: point.prefetchInfiniteQuery.bind(point),
    })
    return componentWithPoint as never
    // Point0.setGlobalPoint(point)
    // return point._Component
  }

  layout<
    TLayout extends LayoutComponent<
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TRouteDefinition,
      TInputSchema,
      TProps
    >,
  >(
    layout?: TLayout,
  ): NiceLayoutEndPoint<
    'layout',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    const point = this._continue({
      _pointType: 'layout',
      _layout: layout || ((({ children }: { children: Exclude<React.ReactNode, Promise<any>> }) => children) as never),
      _letsEndPointType: undefined,
      _base: this as never as BasePoint,
    })
    const layoutWithPoint = point._Layout
    Object.assign(layoutWithPoint, {
      Infer: point.Infer,
      point,
      lets: point.lets.bind(point),
      inputSchema: point.inputSchema,
      useQuery: point.useQuery.bind(point),
      getQueryKey: point.getQueryKey.bind(point),
      getQueryOptions: point.getQueryOptions.bind(point),
      prefetchQuery: point.prefetchQuery.bind(point),
      fetch: point.fetch.bind(point),
      extract: point.extract.bind(point),
      useInfiniteQuery: point.useInfiniteQuery.bind(point),
      getInfiniteQueryOptions: point.getInfiniteQueryOptions.bind(point),
      prefetchInfiniteQuery: point.prefetchInfiniteQuery.bind(point),
    })
    return layoutWithPoint as never
  }

  provider<TNewClientData extends Data = Data>(
    valueSetter?: ProviderValueSetterFn<
      TLetsEndPointType,
      TRouteDefinition,
      FinalClientData<TData, TClientData>,
      TNewClientData
    >,
  ): NiceProviderEndPoint<
    'provider',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TData,
    TNewClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    const point = this._continue({
      _pointType: 'provider',
      _letsEndPointType: undefined,
      _providerValueSetter: valueSetter || (({ data }) => data),
      _ProviderReactContext: createContext<FinalClientData<TData, TClientData>>(null as never) as never,
      _useValue: (point: AnyPoint, keys?: string | string[] | undefined) => {
        if (!point._ProviderReactContext) {
          throw new Error('ProviderReactContext 2 not found on point: ' + point._name)
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
    })
    return point as never
  }

  response<TNewResponseOutput extends ResponseOutput = ResponseOutput>(
    responseFn: ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewResponseOutput>,
  ): NiceResponseEndPoint<
    'response',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TNewResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _pointType: 'response',
      _responseFn: responseFn as never,
      _letsEndPointType: undefined,
    }) as never
  }

  query(
    ...args: HasAnyLoader<TData, TClientData> extends true
      ? [
          queryOptions?: ExtraUseQueryOptions<
            FinalClientData<TData, TClientData>,
            Error0,
            FinalClientData<TData, TClientData>,
            QueryKey
          >,
        ]
      : [
          ShowError<`Point has no loaders. Please add .loader() or .clientLoader() or.ctxLoader() before calling .query()`>,
        ]
  ): TLetsEndPointType extends 'query'
    ? NiceQueryEndPoint<
        'query',
        undefined,
        TRequiredCtx,
        TCtx,
        TData,
        TClientData,
        TRouteDefinition,
        TPrevRouteDefinition,
        TInputSchema,
        TResponseOutput,
        'query',
        TProps
      >
    : NiceMiddlePoint<
        TPointType,
        TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
        TRequiredCtx,
        TCtx,
        TData,
        TClientData,
        TRouteDefinition,
        TPrevRouteDefinition,
        TInputSchema,
        TResponseOutput,
        'query',
        TProps
      > {
    const [queryOptions = {}] = args
    return this._continue({
      _pointType: this._letsEndPointType === 'query' ? 'query' : this._pointType,
      _letsEndPointType: (this._letsEndPointType === 'query'
        ? undefined
        : this._letsEndPointType) as TLetsEndPointType extends 'query' ? undefined : TLetsEndPointType,
      _queryResultType: 'query',
      _queryOptions: queryOptions as ExtraUseQueryOptions<
        FinalClientData<TData, TClientData>,
        Error0,
        FinalClientData<TData, TClientData>,
        QueryKey
      >,
    }) as never
  }

  infiniteQuery(
    ...args: HasAnyLoader<TData, TClientData> extends true
      ? [
          infiniteQueryOptions: ExtraUseInfiniteQueryOptions<
            InputRaw<TRouteDefinition, TInputSchema>,
            FinalClientData<TData, TClientData>,
            Error0,
            InfiniteData<FinalClientData<TData, TClientData>>,
            QueryKey,
            unknown
          >,
        ]
      : [
          ShowError<`Point has no loaders. Please add .loader() or .clientLoader() or.ctxLoader() before calling .infiniteQuery()`>,
        ]
  ): TLetsEndPointType extends 'infiniteQuery'
    ? NiceInfiniteQueryEndPoint<
        'infiniteQuery',
        undefined,
        TRequiredCtx,
        TCtx,
        TData,
        TClientData,
        TRouteDefinition,
        TPrevRouteDefinition,
        TInputSchema,
        TResponseOutput,
        'infiniteQuery',
        TProps
      >
    : NiceMiddlePoint<
        TPointType,
        TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
        TRequiredCtx,
        TCtx,
        TData,
        TClientData,
        TRouteDefinition,
        TPrevRouteDefinition,
        TInputSchema,
        TResponseOutput,
        'infiniteQuery',
        TProps
      > {
    const [infiniteQueryOptions = {}] = args
    return this._continue({
      _pointType: this._letsEndPointType === 'infiniteQuery' ? 'infiniteQuery' : this._pointType,
      _letsEndPointType: (this._letsEndPointType === 'infiniteQuery'
        ? undefined
        : this._letsEndPointType) as TLetsEndPointType extends 'infiniteQuery' ? undefined : TLetsEndPointType,
      _queryResultType: 'infiniteQuery',
      _infiniteQueryOptions: infiniteQueryOptions as ExtraUseInfiniteQueryOptions<
        InputRaw<TRouteDefinition, TInputSchema>,
        FinalClientData<TData, TClientData>,
        Error0,
        InfiniteData<FinalClientData<TData, TClientData>>,
        QueryKey,
        unknown
      >,
    }) as never
  }

  mutation(
    ...args: HasAnyLoader<TData, TClientData> extends true
      ? [
          mutationOptions?: UseMutationOptions<
            FinalClientData<TData, TClientData>,
            Error0,
            InputRawMaybeOptional<TRouteDefinition, TInputSchema>
          >,
        ]
      : [
          ShowError<`Point has no loaders. Please add .loader() or .clientLoader() or.ctxLoader() before calling .mutation()`>,
        ]
  ): NiceMutationEndPoint<
    'mutation',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    const [mutationOptions = {}] = args
    return this._continue({
      _pointType: 'mutation',
      _mutationOptions: mutationOptions as UseMutationOptions,
      _letsEndPointType: undefined,
    }) as never
  }

  // internal utils

  private static _isEndPointType(pointType: PointType): boolean {
    return (
      pointType === 'root' ||
      pointType === 'base' ||
      pointType === 'page' ||
      pointType === 'layout' ||
      pointType === 'response' ||
      pointType === 'query' ||
      pointType === 'infiniteQuery' ||
      pointType === 'mutation' ||
      pointType === 'component' ||
      pointType === 'provider'
    )
  }
  private _isEndPoint(): boolean {
    return Point0._isEndPointType(this._pointType)
  }

  _isRoot(): boolean {
    return this._name === this._scope && this._pointType === 'root'
  }

  private _getErrorComponent<TType extends DestinationComponentType>({
    type,
  }: {
    type: TType
  }): ErrorComponentType<
    TType,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition,
    TProps
  > {
    return (this._errorComponent ??
      {
        page: this._pageErrorComponent,
        component: this._componentErrorComponent,
        layout: this._layoutErrorComponent,
      }[type]) as never
  }

  private _getLoadingComponent<TType extends DestinationComponentType>({
    type,
  }: {
    type: TType
  }): LoadingComponentType<
    TType,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition,
    TProps
  > {
    return (this._loadingComponent ??
      {
        page: this._pageLoadingComponent,
        component: this._componentLoadingComponent,
        layout: this._layoutLoadingComponent,
      }[type]) as never
  }

  private _withWrappers({
    component,
    useLoaderResult,
    props,
  }: {
    props: FinalProps<TProps>
    component: React.ReactNode
    useLoaderResult: SpecificUseLoaderResult<
      any,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      AnyLocation
    >
  }): Exclude<React.ReactNode, Promise<any>> {
    if (this._wrappers.length === 0) {
      return component as Exclude<React.ReactNode, Promise<any>>
    }
    return [...this._wrappers].reverse().reduce((acc, Wrapper, index) => {
      return React.createElement(Wrapper, { key: index, children: acc, ...useLoaderResult, props } as never)
    }, component) as Exclude<React.ReactNode, Promise<any>>
  }

  _hasLoader(): boolean {
    return this._serverExtractActions.some((fn) => fn.type === 'loader' || fn.type === 'ctxLoader')
  }

  _hasClientLoader(): boolean {
    return this._clientExtractActions.length > 0 && this._clientExtractActions.some((fn) => fn.type === 'loader')
  }

  private _hasClientAsyncLoader(): boolean {
    return (
      this._clientExtractActions.length > 0 &&
      this._clientExtractActions.some((fn) => fn.type === 'loader' && fn.fn.constructor.name === 'AsyncFunction')
    )
  }

  private _getRouteForce(): CallableRoute<NonNullable<TRouteDefinition>> {
    if (!this._route) {
      throw new Error(`No client route provided for this point. Name: ${this._name}.`)
    }
    return this._route as CallableRoute<NonNullable<TRouteDefinition>>
  }

  private async _extractClientAsync({
    data,
    location,
    input,
  }: {
    data: Data
    location?: AnyLocation
    input: InputRaw<TRouteDefinition, TInputSchema>
  }): Promise<{ clientData: Data }> {
    let currentClientData: Data = data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- we parse input step by step, so we do not need initial parse result
    const { parsedInput, inputError } = (() => {
      if (this.inputSchema) {
        const parseResult = this.inputSchema.safeParse(input)
        if (parseResult.success) {
          return { parsedInput: parseResult.data, inputError: undefined }
        }
        return { parsedInput: {}, inputError: parseResult.error }
      }
      return { parsedInput: input, inputError: undefined }
    })()
    if (inputError) {
      throw new Error(`Input error: ${inputError.message}`)
    }
    let currentInputParsed: InputParsed = input
    let currentInputSchema: InputSchema | undefined = this._serverInputSchema
    location ??= this._getSelfLocationByAnotherLocationOrInput(location, input)
    for (const clientExtractAction of this._clientExtractActions) {
      switch (clientExtractAction.type) {
        case 'input': {
          currentInputSchema = currentInputSchema
            ? currentInputSchema.extend(clientExtractAction.schema.shape)
            : clientExtractAction.schema
          const safeParseResult = currentInputSchema.safeParse(input)
          if (safeParseResult.error) {
            throw new Error(`Input error: ${safeParseResult.error.message}`)
          }
          currentInputParsed = safeParseResult.data
          break
        }
        case 'loader': {
          currentClientData = await clientExtractAction.fn({
            data: currentClientData,
            location,
            input: currentInputParsed,
            inputRaw: input,
          })
          break
        }
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        default: {
          throw new Error(`Unknown client extend fn type: ${(clientExtractAction as any).type}`)
        }
      }
    }
    return { clientData: currentClientData }
  }

  private _extractClientSync({
    data,
    location,
    input,
  }: {
    data: AnyDataOrInfiniteData
    location?: AnyLocation
    input: InputRaw<TRouteDefinition, TInputSchema>
  }): { clientData: AnyDataOrInfiniteData } {
    let currentClientData: AnyDataOrInfiniteData = data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- we parse input step by step, so we do not need initial parse result
    const { parsedInput, inputError } = (() => {
      if (this.inputSchema) {
        const parseResult = this.inputSchema.safeParse(input)
        if (parseResult.success) {
          return { parsedInput: parseResult.data, inputError: undefined }
        }
        return { parsedInput: {}, inputError: parseResult.error }
      }
      return { parsedInput: input, inputError: undefined }
    })()
    if (inputError) {
      throw new Error(`Input error: ${inputError.message}`)
    }
    let currentInputParsed: InputParsed = input
    let currentInputSchema: InputSchema | undefined = this._serverInputSchema
    location ??= this._getSelfLocationByAnotherLocationOrInput(location, input)
    for (const clientExtractAction of this._clientExtractActions) {
      switch (clientExtractAction.type) {
        case 'input': {
          currentInputSchema = currentInputSchema
            ? currentInputSchema.extend(clientExtractAction.schema.shape)
            : clientExtractAction.schema
          const safeParseResult = currentInputSchema.safeParse(input)
          if (safeParseResult.error) {
            throw new Error(`Input error: ${safeParseResult.error.message}`)
          }
          currentInputParsed = safeParseResult.data
          break
        }
        case 'loader': {
          currentClientData = clientExtractAction.fn({
            data: currentClientData,
            location,
            input: currentInputParsed,
            inputRaw: input,
          }) as Data
          break
        }
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        default: {
          throw new Error(`Unknown client extend fn type: ${(clientExtractAction as any).type}`)
        }
      }
    }
    return { clientData: currentClientData }
  }

  _extractHead(
    useLoaderResult: SpecificUseLoaderResult<
      any,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
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
    useLoaderResult: SpecificUseLoaderResult<
      any,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition,
      AnyLocation
    >,
  ): void {
    for (const headItem of this._extractHead(useLoaderResult)) {
      useHead(headItem as never)
    }
  }

  private _getSelfLocationByAnotherLocation(location: AnyLocation): AnyLocation {
    const route = this._route
    if (!route) {
      return Point0._currentLocation.get()
    }
    return route.getLocation(route.flat({ ...location.searchParams, ...location.params })) as KnownLocation<
      CurrentRouteDefinition<TRouteDefinition>
    >
  }

  private _getSelfLocationByAnotherLocationOrInput(
    location?: AnyLocation | undefined,
    input?: InputRaw<TRouteDefinition, TInputSchema>,
  ): AnyLocation {
    const route = this._route
    if (!route) {
      return location ?? Point0._currentLocation.get()
    }
    if (!input && !location) {
      return Point0._currentLocation.get()
    }
    if (location) {
      return route.getLocation(route.flat({ ...location.searchParams, ...location.params, ...input }))
    }
    return route.getLocation(route.flat({ ...(input || {}) }))
  }

  _getUnsafeInputRawByLocation(location: AnyLocation): InputRaw<TRouteDefinition, TInputSchema> {
    const selfLocation = this._getSelfLocationByAnotherLocation(location)
    return { ...selfLocation.searchParams, ...selfLocation.params } as InputRaw<TRouteDefinition, TInputSchema>
  }

  // fetching and queries

  useQuery(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
  ): UsePointQueryResult<TQueryResultType, TData, TResponseOutput, TClientData, any> {
    const [input = {}, queryOptions, fetchOptions] = args
    const location = useLocation()
    const serverQueryEnabled = this._hasLoader()
    const clientQueryEnabled = this._hasClientLoader()
    if (this._queryResultType === 'infiniteQuery') {
      throw new Error(`Point ${this._name} is not a finite query`)
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
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
                FinalClientData<TData, TClientData>,
                Error0,
                InfiniteData<FinalClientData<TData, TClientData>>,
                QueryKey,
                unknown
              >
            | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
                FinalClientData<TData, TClientData>,
                Error0,
                InfiniteData<FinalClientData<TData, TClientData>>,
                QueryKey,
                unknown
              >
            | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
  ): UsePointQueryResult<TQueryResultType, TData, TResponseOutput, TClientData, any> {
    const [input = {}, infiniteQueryOptions, fetchOptions] = args
    const location = useLocation()
    const serverQueryEnabled = this._hasLoader()
    const clientQueryEnabled = this._hasClientLoader()
    if (this._queryResultType !== 'infiniteQuery') {
      throw new Error(`Point ${this._name} is not an infinite query`)
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

  private _useLoader(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?:
            | ExtraUseQueryOptions
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
                FinalClientData<TData, TClientData>,
                Error0,
                InfiniteData<FinalClientData<TData, TClientData>>,
                QueryKey,
                unknown
              >
            | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?:
            | ExtraUseQueryOptions
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
                FinalClientData<TData, TClientData>,
                Error0,
                InfiniteData<FinalClientData<TData, TClientData>>,
                QueryKey,
                unknown
              >
            | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
  ): SpecificUseLoaderResult<
    any,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition,
    AnyLocation
  > {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()

    const { inputRaw, inputParsed, inputParseError } = React.useMemo<
      | {
          inputRaw: InputRaw<TRouteDefinition, TInputSchema>
          inputParsed: InputParsed<TRouteDefinition, TInputSchema>
          inputParseError: null
        }
      | {
          inputRaw: InputRaw<TRouteDefinition, TInputSchema>
          inputParsed: null
          inputParseError: Error0
        }
    >(() => {
      const inputRaw = (args[0] || {}) as InputRaw<TRouteDefinition, TInputSchema>
      // const safeParseResult = this.inputSchema?.safeParse(inputRaw)
      // if (safeParseResult?.error) {
      //   return { inputRaw, inputParsed: null, inputParseError: Error0.from(safeParseResult.error) }
      // }
      // const inputParsed = (safeParseResult?.data ?? inputRaw) as InputParsed<TRouteDefinition, TInputSchema>
      const parsed = (():
        | {
            inputParsed: InputParsed<TRouteDefinition, TInputSchema>
            inputParseError: null
          }
        | {
            inputParsed: null
            inputParseError: Error0
          } => {
        if (this.inputSchema) {
          const safeParseResult = this.inputSchema.safeParse(inputRaw)
          if (safeParseResult.error) {
            return { inputParsed: null, inputParseError: Error0.from(safeParseResult.error) }
          }
          return {
            inputParsed: safeParseResult.data as InputParsed<TRouteDefinition, TInputSchema>,
            inputParseError: null,
          }
        } else {
          try {
            const inputParsed = Object.entries(inputRaw).reduce<InputParsed<TRouteDefinition, TInputSchema>>(
              (acc, [key, value]) => {
                ;(acc as any)[key] = String(value)
                return acc
              },
              {} as InputParsed<TRouteDefinition, TInputSchema>,
            )
            return { inputParsed, inputParseError: null }
          } catch (error) {
            return { inputParsed: null, inputParseError: Error0.from(error) }
          }
        }
      })()
      return { inputRaw, ...parsed }
    }, [stringify(args[0])])

    if (!this._hasLoader() && !this._hasClientLoader()) {
      const result = React.useMemo(() => {
        return {
          data: {},
          loading: false,
          error: inputParseError ?? null,
          query: null,
          location,
          input: inputParsed,
          inputRaw,
        }
      }, [inputParseError, inputRaw, inputParsed, location])
      return result as never
    }
    const query =
      this._queryResultType === 'infiniteQuery' ? this.useInfiniteQuery(...(args as never)) : this.useQuery(...args)
    const result = React.useMemo(() => {
      return {
        data: query?.data,
        loading: query?.isLoading,
        error: query?.error ? Error0.from(query.error) : null,
        query: query as never,
        location,
        input: inputParsed,
        inputRaw,
      }
    }, [query, query?.data, query?.error, query?.isLoading, inputRaw, inputParsed, location])
    return result as never
  }

  async fetch(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
      : [input: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
  ): Promise<FetchOutput<TResponseOutput, TData>> {
    const [input = {}, options] = args
    const fetchOptions = { ...this._fetchOptions?.(), ...options }
    const headers = mergeHeaders(fetchOptions.headers, options?.headers, { Accept: 'application/json' })
    if (!this._serverurl) {
      throw new Error('Server URL is not set')
    }
    const url = new URL('/_point0', this._serverurl)
    const method = 'post'

    headers.set('Content-Type', 'application/json')
    const outputType = args[2] ?? (this._pointType === 'response' ? 'response' : 'data')
    const scope = this._attachedTo.length === 0 ? this._scope : Point0.getPointsManager().scope
    const body = stringify({
      outputType,
      scope,
      pointInput: input,
      pointType: this._pointType,
      pointName: this._name,
    })
    const res = await fetch(url.toString(), {
      ...this._fetchOptions?.(),
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
      ? TData extends Data
        ? [input?: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions]
        : [input?: InputRaw<TRouteDefinition, TInputSchema>]
      : TData extends Data
        ? [input: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions]
        : [input: InputRaw<TRouteDefinition, TInputSchema>]
  ): Promise<FinalClientData<TData, TClientData>> {
    if (Point0.isServer) {
      throw new Error0(
        'If you want to extract data on server, use engine.extract, or ServerExtractor.extract, or get extract fn from loader|ctx|ctxLoader options. point.extract is for client only and use fetch under the hood to retrieve server data',
      )
    }
    const [input = {}, fetchOptions] = args
    const serverData = await (async () => {
      if (this._hasLoader()) {
        return await this.fetch(input as never, fetchOptions)
      }
      return {}
    })()
    if (this._hasClientLoader()) {
      if (this._hasClientAsyncLoader()) {
        const { clientData } = await this._extractClientAsync({ data: serverData, input: input as never })
        return clientData as FinalClientData<TData, TClientData>
      } else {
        const { clientData } = this._extractClientSync({ data: serverData, input: input as never })
        return clientData as FinalClientData<TData, TClientData>
      }
    }
    return serverData as FinalClientData<TData, TClientData>
  }

  _getServerQueryKey({
    input,
    outputType = this._pointType === 'response' ? 'response' : 'data',
    isInfiniteQuery,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    outputType?: FetchOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    if (!this._name) {
      throw new Error('Point name is not provided')
    }
    return [
      'point0',
      'server',
      this._pointType,
      this._name,
      outputType,
      isInfiniteQuery ? 'infinite' : 'finite',
      stringify(input),
    ]
  }

  _getClientQueryKey({
    input = {} as never,
    isInfiniteQuery,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    isInfiniteQuery: boolean
  }): QueryKey {
    if (!this._name) {
      throw new Error('Point name is not provided')
    }
    return [
      'point0',
      'client',
      this._pointType,
      this._name,
      'data',
      isInfiniteQuery ? 'infinite' : 'finite',
      stringify(input),
    ]
  }

  private _getCombinedQueryKey({
    input = {} as never,
    outputType = this._pointType === 'response' ? 'response' : 'data',
    isInfiniteQuery,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    outputType?: FetchOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    if (!this._name) {
      throw new Error('Point name is not provided')
    }
    return [
      'point0',
      'combined',
      this._pointType,
      this._name,
      outputType,
      isInfiniteQuery ? 'infinite' : 'finite',
      stringify(input),
    ]
  }

  getQueryKey(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>, _outputType?: FetchOutputType]
      : [input: InputRaw<TRouteDefinition, TInputSchema>, _outputType?: FetchOutputType]
  ): QueryKey {
    if (!this._name) {
      throw new Error('Point name is not provided')
    }
    const [input, outputType] = args
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = this._hasLoader()
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseQueryOptions<FetchOutput<TResponseOutput, TData>, Error0, FetchOutput<TResponseOutput, TData>, QueryKey> {
    const queryKey = this._getServerQueryKey({ input, outputType, isInfiniteQuery: false })
    const queryFn = async () => {
      const data = await this.fetch(input as never, fetchOptions, outputType)
      return data
    }
    const result = {
      ...this._defaultQueryOptions,
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
    data,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
    data?: Data
  }): UseQueryOptions<FinalClientData<TData, TClientData>, Error0, FinalClientData<TData, TClientData>, QueryKey> {
    const queryKey = this._getClientQueryKey({ input, isInfiniteQuery: false })
    const queryFn = this._hasClientAsyncLoader()
      ? async () => {
          const { clientData } = await this._extractClientAsync({ data: data || {}, location, input })
          return clientData
        }
      : () => {
          const { clientData } = this._extractClientSync({ data: data || {}, location, input })
          return clientData
        }
    return {
      ...this._defaultQueryOptions,
      ...this._queryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    } as never
  }

  private _getCombinedQueryOptions({
    input,
    location,
    queryClient,
    queryOptions,
    fetchOptions,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseQueryOptions<FinalClientData<TData, TClientData>, Error0, FinalClientData<TData, TClientData>, QueryKey> {
    queryClient ??= Point0.getQueryClient()
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
        data: serverData as never,
      })
      return await queryClient.fetchQuery(clientOpts as any)
    }
    const result = {
      ...this._defaultQueryOptions,
      ...this._queryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    } as any
    return result
  }

  getQueryOptions(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          settings?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchOutputType
            mode?: QueryMode
          },
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          settings?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchOutputType
            mode?: QueryMode
          },
        ]
  ): UseQueryOptions<FinalClientData<TData, TClientData>, Error0, FinalClientData<TData, TClientData>, QueryKey> {
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = this._hasLoader()
    const [input, queryOptions, settings = {}] = args
    const { location, queryClient, fetchOptions, outputType, mode = 'serverAndClient' } = settings
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    infiniteQueryOptions:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseInfiniteQueryOptions<
    InfiniteData<FetchOutput<TResponseOutput, TData>>,
    Error0,
    FetchOutput<TResponseOutput, TData>,
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
    data,
    location,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    data?: Data
    location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
  }): UseInfiniteQueryOptions<
    FinalClientData<TData, TClientData>,
    Error0,
    InfiniteData<FinalClientData<TData, TClientData>>,
    QueryKey
  > {
    const queryKey = this._getClientQueryKey({ input, isInfiniteQuery: true })
    const queryFn = this._hasClientAsyncLoader()
      ? async ({ pageParam }: { pageParam: unknown }) => {
          try {
            const pageParamFromInput = this._infiniteQueryOptions.pageParamFromInput
            const { clientData } = await this._extractClientAsync({
              data: data || {},
              location,
              input: { ...input, [pageParamFromInput]: pageParam ?? this._infiniteQueryOptions.initialPageParam },
            })
            return clientData
          } catch (error) {
            throw Error0.from(error)
          }
        }
      : ({ pageParam }: { pageParam: unknown }) => {
          try {
            const pageParamFromInput = this._infiniteQueryOptions.pageParamFromInput
            const { clientData } = this._extractClientSync({
              data: data || {},
              location,
              input: { ...input, [pageParamFromInput]: pageParam ?? this._infiniteQueryOptions.initialPageParam },
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    fetchOptions?: FetchOptions | undefined
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
    queryClient?: QueryClient
  }): UseInfiniteQueryOptions<
    FinalClientData<TData, TClientData>,
    Error0,
    InfiniteData<FinalClientData<TData, TClientData>>,
    QueryKey
  > {
    const queryKey = this._getCombinedQueryKey({ input, outputType: 'data', isInfiniteQuery: true })
    const queryFn = async (ctx: { pageParam: unknown }) => {
      try {
        const pageParam = ctx.pageParam ?? this._infiniteQueryOptions.initialPageParam
        const serverData = await (async () => {
          queryClient ??= Point0.getQueryClient()
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
          data: serverData as never,
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
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
                FinalClientData<TData, TClientData>,
                Error0,
                InfiniteData<FinalClientData<TData, TClientData>>,
                QueryKey,
                unknown
              >
            | undefined,
          settings?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchOutputType
            mode?: QueryMode
          },
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
                FinalClientData<TData, TClientData>,
                Error0,
                InfiniteData<FinalClientData<TData, TClientData>>,
                QueryKey,
                unknown
              >
            | undefined,
          settings?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions | undefined
            outputType?: FetchOutputType
            mode?: QueryMode
          },
        ]
  ): UseInfiniteQueryOptions<
    InputRaw<TRouteDefinition, TInputSchema>,
    FinalClientData<TData, TClientData>,
    Error0,
    InfiniteData<FinalClientData<TData, TClientData>>,
    QueryKey
  > {
    const [input, infiniteQueryOptions, settings = {}] = args
    const { location, queryClient, fetchOptions, outputType, mode = 'serverAndClient' } = settings
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = this._hasLoader()
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseQueryResult<FetchOutput<TResponseOutput, TData>, Error0> {
    return useQuery(this._getServerQueryOptions({ input, queryOptions, fetchOptions, outputType }))
  }

  private _useClientQuery({
    input,
    queryOptions,
    location,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
  }): UseQueryResult<FinalClientData<TData, TClientData>, Error0> {
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseQueryResult<FinalClientData<TData, TClientData>, Error0> {
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    infiniteQueryOptions:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseInfiniteQueryResult<InfiniteData<FetchOutput<TResponseOutput, TData>>, Error0> {
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
  }): UseInfiniteQueryResult<InfiniteData<FinalClientData<TData, TClientData>>, Error0> {
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseInfiniteQueryResult<InfiniteData<FinalClientData<TData, TClientData>>, Error0> {
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
    FinalClientData<TData, TClientData>,
    Error0,
    InputRawMaybeOptional<TRouteDefinition, TInputSchema>
  > {
    const mutationFn = async (input: Record<string, any> = {}) => {
      try {
        // const data = await this.fetch(input as never, fetchOptions)
        // return data
        if (Point0.isServer) {
          throw new Error(
            'If you want to extract data on server, use engine.extract, or ServerExtractor.extract, or get extract fn from loader|ctx|ctxLoader options. point.extract is for client only and use fetch under the hood to retrieve server data',
          )
        }
        const serverData = await (async () => {
          if (this._hasLoader()) {
            return await this.fetch(input as never, fetchOptions)
          }
          return {}
        })()
        if (this._hasClientLoader()) {
          if (this._hasClientAsyncLoader()) {
            const { clientData } = await this._extractClientAsync({ data: serverData, input: input as never })
            return clientData as FinalClientData<TData, TClientData>
          } else {
            const { clientData } = this._extractClientSync({ data: serverData, input: input as never })
            return clientData as FinalClientData<TData, TClientData>
          }
        }
        return serverData as FinalClientData<TData, TClientData>
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
      FinalClientData<TData, TClientData>,
      Error0,
      InputRawMaybeOptional<TRouteDefinition, TInputSchema>
    >
  }

  useMutation = (
    mutationOptions?: MutationOptions | undefined,
    fetchOptions?: FetchOptions | undefined,
  ): UseMutationResult<
    FinalClientData<TData, TClientData>,
    Error0,
    InputRawMaybeOptional<TRouteDefinition, TInputSchema>
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

  async prefetchQuery(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          settings?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
          },
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          settings?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
          },
        ]
  ): Promise<undefined | QueryKey> {
    const [input, providedQueryOptions, settings = {}] = args
    const {
      location,
      queryClient: providedQueryClient,
      fetchOptions,
      outputType,
      force,
      mode = 'serverAndClient',
      preventPrefetchFns,
    } = settings
    if (!this._hasLoader() && !this._hasClientLoader()) {
      return
    }
    if (!this._hasClientLoader() && mode === 'client') {
      return
    }
    if (!this._hasLoader() && mode === 'server') {
      return
    }
    const suitablePointTypes = ['page', 'query', 'infiniteQuery', 'component', 'layout', 'provider']
    if (!suitablePointTypes.includes(this._pointType)) {
      return
    }
    const queryClient = providedQueryClient ?? Point0.getQueryClient()
    const queryOptions = this.getQueryOptions(input as never, providedQueryOptions, {
      location,
      queryClient,
      fetchOptions,
      outputType,
      mode,
    })
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryOptions.queryKey as never })
    if (query && !force) {
      return
    }
    await Promise.all([this._callPrefetchFns({ preventPrefetchFns }), queryClient.prefetchQuery(queryOptions as never)])
    return queryOptions.queryKey
  }

  async prefetchInfiniteQuery(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
                FinalClientData<TData, TClientData>,
                Error0,
                InfiniteData<FinalClientData<TData, TClientData>>,
                QueryKey,
                unknown
              >
            | undefined,
          settings?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
          },
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
                FinalClientData<TData, TClientData>,
                Error0,
                InfiniteData<FinalClientData<TData, TClientData>>,
                QueryKey,
                unknown
              >
            | undefined,
          settings?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            mode?: QueryMode
            outputType?: FetchOutputType
            preventPrefetchFns?: boolean | OnPrefetchFn[]
          },
        ]
  ): Promise<undefined | QueryKey> {
    const [input, infiniteQueryOptions, settings = {}] = args
    const {
      location,
      queryClient: providedQueryClient,
      fetchOptions,
      outputType,
      force,
      mode = 'serverAndClient',
      preventPrefetchFns,
    } = settings
    if (!this._hasLoader() && !this._hasClientLoader()) {
      return
    }
    if (!this._hasClientLoader() && mode === 'client') {
      return
    }
    if (!this._hasLoader() && mode === 'server') {
      return
    }
    const suitablePointTypes = ['page', 'query', 'infiniteQuery', 'component', 'layout', 'provider']
    if (!suitablePointTypes.includes(this._pointType)) {
      return
    }
    const queryClient = providedQueryClient ?? Point0.getQueryClient()
    const queryOptions = this.getInfiniteQueryOptions(input as never, infiniteQueryOptions, {
      location,
      queryClient,
      fetchOptions,
      outputType,
      mode,
    })
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryOptions.queryKey as never })
    if (query && !force) {
      return
    }
    await Promise.all([
      this._callPrefetchFns({ preventPrefetchFns }),
      queryClient.prefetchInfiniteQuery(queryOptions as never),
    ])
    return queryOptions.queryKey
  }

  private async _prefetchPageQueryClientDehydratedState({
    input,
    queryClient,
    queryOptions,
    fetchOptions,
    force,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions
    fetchOptions?: FetchOptions
    force?: boolean
  }): Promise<void> {
    if (this._pointType !== 'page') {
      throw new Error('Point type is not page')
    }
    queryClient ??= Point0.getQueryClient()
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
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?:
            | undefined
            | (TQueryResultType extends 'infiniteQuery'
                ? Partial<
                    ExtraUseInfiniteQueryOptions<
                      InputRaw<TRouteDefinition, TInputSchema>,
                      FinalClientData<TData, TClientData>,
                      Error0,
                      InfiniteData<FinalClientData<TData, TClientData>>,
                      QueryKey,
                      unknown
                    >
                  >
                : Partial<ExtraUseQueryOptions>),
          settings?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            policy?: PagePrefetchPolicy
          },
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?:
            | undefined
            | (TQueryResultType extends 'infiniteQuery'
                ? Partial<
                    ExtraUseInfiniteQueryOptions<
                      InputRaw<TRouteDefinition, TInputSchema>,
                      FinalClientData<TData, TClientData>,
                      Error0,
                      InfiniteData<FinalClientData<TData, TClientData>>,
                      QueryKey,
                      unknown
                    >
                  >
                : Partial<ExtraUseQueryOptions>),
          settings?: {
            location?: AnyLocation
            queryClient?: QueryClient
            fetchOptions?: FetchOptions
            force?: boolean
            policy?: PagePrefetchPolicy
          },
        ]
  ): Promise<void> {
    const [input = {}, queryOptions, settings = {}] = args
    const { location: providedLocation, queryClient, fetchOptions, force, policy = this._prefetchPolicy } = settings
    if (policy === 'none') {
      return
    }

    if (!this._route) {
      throw new Error('Route is not set')
    }
    const location = providedLocation ?? this._route.getLocation(this._route.flat(input))

    if (policy === 'queryClientDehydratedState' || policy === 'everything') {
      await this._prefetchPageQueryClientDehydratedState({
        queryClient,
        input: input as never,
        queryOptions,
        fetchOptions,
        force,
      })
      if (policy === 'queryClientDehydratedState') {
        return
      }
    }

    const pageWithLayouts = [this, ...this._layouts]

    const uniqPrefetchFns = [...new Set<OnPrefetchFn>(pageWithLayouts.flatMap((p) => p._onPrefetchFns))]
    const onPrefetchFnsPromise = Promise.all(
      uniqPrefetchFns.map(async (fn) => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
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
        // const method = p._queryResultType === 'infiniteQuery' ? 'prefetchInfiniteQuery' : 'prefetchQuery'
        const inputHere = p === this ? input : p._getUnsafeInputRawByLocation(location)
        const mode =
          policy === 'everything'
            ? // server queries was prefetched on prefetchPageQueryClientDehydratedState step
              'client'
            : {
                serverQuery: 'server' as const,
                clientQuery: 'client' as const,
                serverClientQuery: 'serverAndClient' as const,
              }[policy]
        // return await p[method](inputHere as never, queryOptions as never, {
        //   queryClient,
        //   location,
        //   fetchOptions,
        //   force,
        //   mode,
        // })
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

  _Page = (props: MountableComponentProps<TInputSchema, TProps, false>): React.ReactNode => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    const { inputRaw, restProps } = React.useMemo<{
      inputRaw: InputRaw<TRouteDefinition, TInputSchema>
      restProps: FinalProps<TProps>
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
      const scrollPositionRestorePolicy = this._scrollPositionRestorePolicy({ prevLocation })
      const prevPageScrollPosition = Point0._prevPageScrollPositions.find(
        (p) => p.name === this._name && stringify(p.input) === stringify(inputRaw),
      )
      if (scrollPositionRestorePolicy !== false) {
        if (scrollPositionRestorePolicy === null) {
          this._scrollPositionSetter({ x: 0, y: 0 })
        }
        if (scrollPositionRestorePolicy === true) {
          if (!prevPageScrollPosition) {
            this._scrollPositionSetter({ x: 0, y: 0 })
          } else {
            this._scrollPositionSetter({ x: prevPageScrollPosition.x, y: prevPageScrollPosition.y })
          }
        }
      }
      return () => {
        const currentPageScrollPosition = this._scrollPositionGetter()
        if (prevPageScrollPosition) {
          prevPageScrollPosition.x = currentPageScrollPosition?.x ?? 0
          prevPageScrollPosition.y = currentPageScrollPosition?.y ?? 0
        } else {
          Point0._prevPageScrollPositions.push({
            name: this._name ?? 'unknown',
            input: inputRaw,
            x: currentPageScrollPosition?.x ?? 0,
            y: currentPageScrollPosition?.y ?? 0,
          })
        }
      }
    }, [this._name, inputRaw, prevLocation, status])

    const result = this._useLoader(inputRaw, this._defaultPageQueryOptions)

    this._useHead(result)

    if (!this._page) {
      // impossible error
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          type: 'page',
          data: undefined as FinalClientData<TData, TClientData> | undefined,
          error: new Error0('No page component'),
          loading: false,
          location,
          query: undefined as never,
          input: {} as InputParsed<TRouteDefinition, TInputSchema>,
        } as never),
        useLoaderResult: result,
        props,
      })
    }

    if (result.error) {
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          ...(result as any),
          type: 'page',
        }),
        useLoaderResult: result,
        props,
      })
    }
    if (result.loading) {
      return this._withWrappers({
        component: React.createElement(loadingComponent, {
          ...(result as any),
          type: 'page',
        }),
        useLoaderResult: result,
        props,
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!result.data) {
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          ...(result as any),
          type: 'page',
          error: new Error0('No data'),
        }),
        useLoaderResult: result,
        props,
      })
    }
    return this._withWrappers({
      component: React.createElement(this._page, {
        ...(result as any),
        props: restProps,
      }),
      useLoaderResult: result,
      props,
    })
  }

  _Component = (props: MountableComponentProps<TInputSchema, TProps, false>): React.ReactNode => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    const { inputRaw, restProps } = React.useMemo<{
      inputRaw: InputRaw<TRouteDefinition, TInputSchema>
      restProps: FinalProps<TProps>
    }>(() => {
      const { input: providedInput, ...restProps } = props as any
      const inputRaw = { ...this._getUnsafeInputRawByLocation(location), ...providedInput }
      return { inputRaw, restProps }
    }, [props])

    const result = this._useLoader(inputRaw, this._defaultComponentQueryOptions)

    if (!this._component) {
      // impossible error
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          ...(result as any),
          type: 'component',
        }),
        useLoaderResult: result,
        props,
      })
    }

    if (result.error) {
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          ...(result as any),
          type: 'component',
        }),
        useLoaderResult: result,
        props,
      })
    }
    if (result.loading) {
      return this._withWrappers({
        component: React.createElement(loadingComponent, {
          ...(result as any),
          type: 'component',
        }),
        useLoaderResult: result,
        props,
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!result.data) {
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          ...(result as any),
          type: 'component',
          error: new Error0('No data'),
        }),
        useLoaderResult: result,
        props,
      })
    }
    return this._withWrappers({
      component: React.createElement(this._component, {
        ...(result as any),
        props: restProps as unknown as FinalProps<TProps>,
      }),
      useLoaderResult: result,
      props,
    })
  }

  _Layout = (props: MountableComponentProps<TInputSchema, TProps, true>): React.ReactNode => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    const { inputRaw, children, restProps } = React.useMemo<{
      inputRaw: InputRaw<TRouteDefinition, TInputSchema>
      children: React.ReactNode
      restProps: FinalProps<TProps>
    }>(() => {
      const { input: providedInput = {}, children, ...restProps } = props as any
      const inputRaw = { ...this._getUnsafeInputRawByLocation(location), ...providedInput }
      return { inputRaw, children, restProps }
    }, [props, location])

    const result = this._useLoader(inputRaw, this._defaultLayoutQueryOptions)

    if (!this._layout) {
      // impossible error
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          ...(result as any),
          type: 'layout',
        }),
        useLoaderResult: result,
        props,
      })
    }

    if (result.error) {
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          ...(result as any),
          type: 'layout',
        }),
        useLoaderResult: result,
        props,
      })
    }
    if (result.loading) {
      return this._withWrappers({
        component: React.createElement(loadingComponent, {
          ...(result as any),
          type: 'layout',
        }),
        useLoaderResult: result,
        props,
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!result.data) {
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          ...(result as any),
          type: 'layout',
          error: new Error0('No data'),
        }),
        useLoaderResult: result,
        props,
      })
    }
    return this._withWrappers({
      component: React.createElement(this._layout, {
        ...result,
        children,
        props: restProps,
      } as never),
      useLoaderResult: result,
      props,
    })
  }

  // provider

  getValue(input?: InputRaw<TRouteDefinition, TInputSchema>): FinalClientData<TData, TClientData> {
    const value = SuperStore.getWeak<FinalClientData<TData, TClientData>>(
      `__POINT0_PROVIDER_VALUE_${this._scope}_${this._name}_${stringify(input || {})}`,
    )
    if (!value) {
      throw new Error(
        `Provider value not found on point: provider.${this._name}. You should call getValue only after Provider component is mounted and loaded.`,
      )
    }
    return value
  }

  getValueSafe(input?: InputRaw<TRouteDefinition, TInputSchema>): FinalClientData<TData, TClientData> | undefined {
    const value = SuperStore.getWeak<FinalClientData<TData, TClientData>>(
      `__POINT0_PROVIDER_VALUE_${this._scope}_${this._name}_${stringify(input || {})}`,
    )
    return value
  }

  Provider = (props: MountableComponentProps<TInputSchema, TProps, true>): React.ReactNode => {
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    if (!this._ProviderReactContext) {
      throw new Error('ProviderReactContext not found on point: ' + this._name)
    }
    if (!this._providerValueSetter) {
      throw new Error('providerValueSetter not found on point: ' + this._name)
    }

    const { inputRaw, children } = React.useMemo<{
      inputRaw: InputRaw<TRouteDefinition, TInputSchema>
      children: React.ReactNode
    }>(() => {
      const { input: providedInput = {}, children } = props as any
      const inputRaw = { ...providedInput }
      return { inputRaw, children }
    }, [props])

    const result = this._useLoader(inputRaw, this._defaultProviderQueryOptions)

    if (result.error) {
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          ...(result as any),
          type: 'page',
        }),
        useLoaderResult: result,
        props,
      })
    }
    if (result.loading) {
      return this._withWrappers({
        component: React.createElement(loadingComponent, {
          ...(result as any),
          type: 'page',
        }),
        useLoaderResult: result,
        props,
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!result.data) {
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          ...(result as any),
          type: 'page',
          error: new Error0('No data'),
        }),
        useLoaderResult: result,
        props,
      })
    }
    const value = this._providerValueSetter(result)
    SuperStore.setWeak(`__POINT0_PROVIDER_VALUE_${this._scope}_${this._name}_${stringify(inputRaw)}`, value)
    return this._withWrappers({
      component: React.createElement(this._ProviderReactContext.Provider, {
        value,
        children,
      }),
      useLoaderResult: result,
      props,
    })
  }

  useValue<K extends keyof FinalClientData<TData, TClientData>>(key: K): FinalClientData<TData, TClientData>[K]
  useValue<K extends keyof FinalClientData<TData, TClientData>>(keys: K[]): Pick<FinalClientData<TData, TClientData>, K>
  useValue(): FinalClientData<TData, TClientData>
  useValue(keys?: keyof FinalClientData<TData, TClientData> | Array<keyof FinalClientData<TData, TClientData>>) {
    if (!this._useValue) {
      throw new Error('useValue not found on point: ' + this._name)
    }
    return (this as any)._useValue(this, keys)
  }

  // bun crashes just when see this code, even if it is not executed, so we need hack with _useValue
  // lets check time to time if crashes no more exists, then uncomment

  // useValue<K extends keyof FinalClientData<TData, TClientData>>(key: K): FinalClientData<TData, TClientData>[K]
  // useValue<K extends keyof FinalClientData<TData, TClientData>>(keys: K[]): Pick<FinalClientData<TData, TClientData>, K>
  // useValue(): FinalClientData<TData, TClientData>
  // useValue(keys?: keyof FinalClientData<TData, TClientData> | Array<keyof FinalClientData<TData, TClientData>>) {
  //   if (!this._ProviderReactContext) {
  //     throw new Error('ProviderReactContext not found on point: ' + this._name)
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

  // extractor store

  static define = SuperStore.define.bind(SuperStore)

  static defineQueryClient(init: () => QueryClient): SuperStoreDefinedItem<QueryClient, DehydratedState> {
    Point0._queryClient.config.init = init
    return Point0._queryClient
  }

  static getQueryClient(): QueryClient {
    return Point0._queryClient.get()
  }

  static readonly _ssrLocation = SuperStore.define<AnyLocation | undefined, true>(
    '__POINT0_SSR_LOCATION__',
    () => undefined,
    true,
  )
  private static readonly _currentLocation = SuperStore.define<AnyLocation, true>(
    '__POINT0_CURRENT_LOCATION__',
    () => Route0.getLocation('/'),
    true,
  )
  private static readonly _queryClient = SuperStore.define<QueryClient, DehydratedState>(
    '__POINT0_QUERY_CLIENT__',
    () => new QueryClient(),
    (queryClient) =>
      dehydrate(queryClient, {
        shouldDehydrateQuery: () => {
          // This will include all queries, including failed ones
          return true
        },
      }),
    (dehydratedState, createQueryClient) => {
      const queryClient = createQueryClient()
      hydrate(queryClient, dehydratedState)

      const prefetchPageQuery = queryClient
        .getQueryCache()
        .getAll()
        .find(
          (q: any) => q.state?.data && typeof q.state.data === 'object' && 'queryClientDehydratedState' in q.state.data,
        )

      if (!prefetchPageQuery) {
        return queryClient
      }

      const relatedQueriesDehydratedState = (prefetchPageQuery.state.data as { dehydratedState: DehydratedState })
        .dehydratedState
      hydrate(queryClient, relatedQueriesDehydratedState)

      return queryClient
    },
  )

  static getPointsManager = PointsManager.getPointsManager.bind(PointsManager)

  // client-server helpers

  static isClient = ClientServerHelpers.isClient
  static isServer = ClientServerHelpers.isServer
  static constServerUnsafe = ClientServerHelpers.constServerUnsafe.bind(ClientServerHelpers)
  static constClientUnsafe = ClientServerHelpers.constClientUnsafe.bind(ClientServerHelpers)
  static constServer = ClientServerHelpers.constServer.bind(ClientServerHelpers)
  static constClient = ClientServerHelpers.constClient.bind(ClientServerHelpers)
  static constClientElseServer = ClientServerHelpers.constClientElseServer.bind(ClientServerHelpers)
  static callServer = ClientServerHelpers.callServer.bind(ClientServerHelpers)
  static callClient = ClientServerHelpers.callClient.bind(ClientServerHelpers)
  static callClientElseServer = ClientServerHelpers.callClientElseServer.bind(ClientServerHelpers)

  // scroll restoration

  scrollPosition(
    getter: ScrollPositionGetter,
    setter: ScrollPositionSetter,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if it was pruned for server
      _scrollPositionGetter: getter ?? this._scrollPositionGetter,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      _scrollPositionSetter: setter ?? this._scrollPositionSetter,
    }) as never
  }

  scrollRestore(
    // true - restore, false - do not restore, null - set {x: 0, y: 0}
    policy: ScrollPositionRestorePolicy | boolean | null,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _scrollPositionRestorePolicy: typeof policy === 'function' ? policy : () => policy,
    }) as never
  }

  private static readonly _prevPageScrollPositions: Array<{ name: PointName; input: InputRaw; x: number; y: number }> =
    []

  // prefetch mode

  prefetchPolicy(
    policy: PagePrefetchPolicy,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _prefetchPolicy: policy,
    }) as never
  }

  onPrefetch(
    fn: OnPrefetchFn,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _onPrefetchFns: [...this._onPrefetchFns, fn],
    }) as never
  }

  prefetchOnHover(
    shouldBePrefetchedOnLinkHover: boolean | number,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      shouldBePrefetchedOnLinkHover,
    }) as never
  }
}

export * from './points-manager.js'
export * from './router.js'
export * from './super-store.js'
export type * from './types.js'
export * from './unhead.js'
export * from './utils.js'

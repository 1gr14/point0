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
import { flatten } from 'flat'
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
  AnyPoint,
  AnyUnqueriedLoaderResult,
  AnyUseLoaderResult,
  AppendCtx,
  BasePoint,
  ClientExecuteAction,
  ClientExecuteDetailedResult,
  ClientLoaderFn,
  ComponentComponent,
  Ctx,
  CtxFn,
  CtxLoaderFn,
  CurrentRouteDefinition,
  Data,
  DestinationComponentType,
  EmptyCtx,
  EmptyData,
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
  FinalLastOutput,
  FinalProps,
  IfAnyThenElse,
  Infer,
  InputParsed,
  InputRaw,
  InputRawMaybeOptional,
  InputSchema,
  InputSchemaZod,
  IsInputOptional,
  LastOutput,
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
  RootPoint,
  RouteDefinition,
  SafeParseInputResult,
  ScrollPositionGetter,
  ScrollPositionRestorePolicy,
  ScrollPositionSetter,
  ServerExecuteAction,
  ShowError,
  StandaloneSlashIfUndefined,
  SuccessHeadFn,
  UndefinedClientResponse,
  UndefinedComponentComponent,
  UndefinedCtx,
  UndefinedData,
  UndefinedEndPointType,
  UndefinedInputSchema,
  UndefinedLastOutput,
  UndefinedLayoutComponent,
  UndefinedPageComponent,
  UndefinedProps,
  UndefinedQueryResultType,
  UndefinedResponse,
  UndefinedRoute,
  UndefinedRouteDefinition,
  UseInfiniteQueryOptions,
  UsePointQueryResult,
  UseQueryOptions,
  WrapperComponentType,
} from './types.js'
import {
  dedupeSlashes,
  getWindowScrollPositionGetterByElementGetter,
  getWindowScrollPositionGetterBySelector,
  getWindowScrollPositionSetterByElementGetter,
  getWindowScrollPositionSetterBySelector,
  isContainsBinary,
  mergeHeaders,
  windowScrollPositionGetter,
  windowScrollPositionSetter,
} from './utils.js'

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
  TResponse extends Response | UndefinedResponse,
  TClientResponse extends Response | UndefinedResponse,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TProps extends Props | UndefinedProps,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  > = '__I_AM_POINT0__' as never

  point: typeof this // this, needed for generator to collect points

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
  private readonly _serverurl: string | undefined
  readonly _baseurl: string | null | undefined
  readonly type: TPointType
  private readonly _letsEndPointType: TLetsEndPointType
  inputSchema: TInputSchema
  private readonly _serverInputSchema: InputSchema | undefined
  readonly scope: PointsScope
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
    FinalClientData<TLastServerOutput, TLastClientOutput>,
    Error0,
    InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
    QueryKey,
    unknown
  >
  readonly _queryResultType: TQueryResultType
  // readonly _asFormData: boolean | undefined
  private readonly _wrappers: WrapperComponentType[]
  readonly _serverExecuteActions: ServerExecuteAction[]
  private readonly _clientExecuteActions: ClientExecuteAction[]
  private readonly _providerValueSetter: ProviderValueSetterFn<any, any, any, any, any, any> | undefined
  private readonly _useValue: undefined | ((point: AnyPoint, keys?: string | string[] | undefined) => any)
  readonly _route: TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute
  private readonly _prevRoute: TPrevRouteDefinition extends RouteDefinition
    ? CallableRoute<TPrevRouteDefinition>
    : UndefinedRoute
  private readonly _page:
    | PageComponent<TQueryResultType, TLastServerOutput, TLastClientOutput, TRouteDefinition, TInputSchema, TProps>
    | UndefinedPageComponent
  private readonly _component:
    | ComponentComponent<TQueryResultType, TLastServerOutput, TLastClientOutput, TInputSchema, TProps>
    | UndefinedComponentComponent
  private readonly _layout:
    | LayoutComponent<TQueryResultType, TLastServerOutput, TLastClientOutput, TRouteDefinition, TInputSchema, TProps>
    | UndefinedLayoutComponent
  readonly _layouts: LayoutPoint[]
  readonly name: PointName
  private readonly _unstableId: number
  private readonly _fetchOptions: FetchOptionsFn | undefined
  private readonly _scrollPositionGetter: ScrollPositionGetter
  private readonly _scrollPositionSetter: ScrollPositionSetter
  private readonly _scrollPositionRestorePolicy: ScrollPositionRestorePolicy
  private readonly _prefetchPolicy: PagePrefetchPolicy
  private readonly _onPrefetchFns: OnPrefetchFn[]
  readonly shouldBePrefetchedOnLinkHover: boolean | number
  private readonly _ProviderReactContext: Context<FinalClientData<TLastServerOutput, TLastClientOutput>> | undefined
  private readonly _errorComponent:
    | ErrorComponentType<
        DestinationComponentType,
        TQueryResultType,
        TLastServerOutput,
        TLastClientOutput,
        TInputSchema,
        TRouteDefinition,
        TProps
      >
    | undefined
  private readonly _layoutErrorComponent: ErrorComponentType<
    DestinationComponentType,
    TQueryResultType,
    TLastServerOutput,
    TLastClientOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _pageErrorComponent: ErrorComponentType<
    DestinationComponentType,
    TQueryResultType,
    TLastServerOutput,
    TLastClientOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _componentErrorComponent: ErrorComponentType<
    DestinationComponentType,
    TQueryResultType,
    TLastServerOutput,
    TLastClientOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _layoutLoadingComponent: LoadingComponentType<
    DestinationComponentType,
    TQueryResultType,
    TLastServerOutput,
    TLastClientOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _loadingComponent:
    | LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TLastServerOutput,
        TLastClientOutput,
        TInputSchema,
        TRouteDefinition,
        TProps
      >
    | undefined
  private readonly _pageLoadingComponent: LoadingComponentType<
    DestinationComponentType,
    TQueryResultType,
    TLastServerOutput,
    TLastClientOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _componentLoadingComponent: LoadingComponentType<
    DestinationComponentType,
    TQueryResultType,
    TLastServerOutput,
    TLastClientOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >

  private constructor(options: {
    type: TPointType
    _letsEndPointType: TLetsEndPointType
    _base?: BasePoint | LayoutPoint | undefined
    _root?: RootPoint | undefined
    _serverurl?: string | undefined
    _baseurl?: string | null | undefined
    inputSchema?: TInputSchema
    _serverInputSchema?: InputSchema | undefined
    scope: PointsScope
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
          FinalClientData<TLastServerOutput, TLastClientOutput>,
          Error0,
          InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    _queryResultType?: TQueryResultType
    // _asFormData?: boolean | undefined
    _serverExecuteActions?: ServerExecuteAction[]
    _clientExecuteActions?: ClientExecuteAction[]
    _providerValueSetter?: ProviderValueSetterFn<any, any, any, any, any, any>
    _ProviderReactContext?: Context<FinalClientData<TLastServerOutput, TLastClientOutput>> | undefined
    _useValue?: any
    _route?: TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute
    _prevRoute?: TPrevRouteDefinition extends RouteDefinition ? CallableRoute<TPrevRouteDefinition> : UndefinedRoute
    _page?:
      | PageComponent<TQueryResultType, TLastServerOutput, TLastClientOutput, TRouteDefinition, TInputSchema, TProps>
      | UndefinedPageComponent
    _component?:
      | ComponentComponent<TQueryResultType, TLastServerOutput, TLastClientOutput, TInputSchema, TProps>
      | UndefinedComponentComponent
    _layout?:
      | LayoutComponent<TQueryResultType, TLastServerOutput, TLastClientOutput, TRouteDefinition, TInputSchema, TProps>
      | UndefinedLayoutComponent
    _layouts?: LayoutPoint[]
    name: PointName
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
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _loadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _unstableId?: number
  }) {
    this.point = this
    this.scope = options.scope
    this._attachedTo = options._attachedTo
    this._base = options._base ?? undefined
    this._root = options._root ?? undefined
    this.inputSchema = (options.inputSchema ?? undefined) as TInputSchema
    this._serverInputSchema = options._serverInputSchema
    this._serverurl = options._serverurl ?? undefined
    this._baseurl = options._baseurl ?? undefined
    this.type = options.type
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
    // this._asFormData = options._asFormData
    this._serverExecuteActions = options._serverExecuteActions ?? []
    this._clientExecuteActions = options._clientExecuteActions ?? []
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
    this.name = options.name
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
        TLastServerOutput,
        TLastClientOutput,
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
        TLastServerOutput,
        TLastClientOutput,
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
        TLastServerOutput,
        TLastClientOutput,
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
        TLastServerOutput,
        TLastClientOutput,
        TInputSchema,
        TRouteDefinition,
        TProps
      >)
    this._pageLoadingComponent =
      options._pageLoadingComponent ??
      ((() => React.createElement(React.Fragment, null, 'Loading...')) as LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TLastServerOutput,
        TLastClientOutput,
        TInputSchema,
        TRouteDefinition,
        TProps
      >)
    this._componentLoadingComponent =
      options._componentLoadingComponent ??
      ((() => React.createElement(React.Fragment, null, 'Loading...')) as LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TLastServerOutput,
        TLastClientOutput,
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
    TResponse extends Response | UndefinedResponse,
    TClientResponse extends Response | UndefinedResponse,
    TQueryResultType extends QueryResultType | UndefinedQueryResultType,
    TProps extends Props | UndefinedProps,
    TLastServerOutput extends LastOutput | UndefinedLastOutput,
    TLastClientOutput extends LastOutput | UndefinedLastOutput,
  >(overrides: {
    type?: TPointType
    scope?: PointsScope
    _attachedTo?: PointsScope[]
    _letsEndPointType?: TLetsEndPointType
    _base?: BasePoint | LayoutPoint | undefined
    _root?: RootPoint | undefined
    _serverurl?: string | undefined
    _baseurl?: string | null | undefined
    inputSchema?: TInputSchema
    _serverInputSchema?: InputSchema | undefined
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
          FinalClientData<TLastServerOutput, TLastClientOutput>,
          Error0,
          InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    _queryResultType?: TQueryResultType
    // _asFormData?: boolean | undefined
    _wrappers?: WrapperComponentType[]
    _serverExecuteActions?: ServerExecuteAction[]
    _clientExecuteActions?: ClientExecuteAction[]
    _providerValueSetter?: ProviderValueSetterFn<any, any, any, any, any, any> | undefined
    _ProviderReactContext?: Context<FinalClientData<TLastServerOutput, TLastClientOutput>> | undefined
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
      | PageComponent<TQueryResultType, TLastServerOutput, TLastClientOutput, TRouteDefinition, TInputSchema, TProps>
      | UndefinedPageComponent
    _component?:
      | ComponentComponent<TQueryResultType, TLastServerOutput, TLastClientOutput, TInputSchema, TProps>
      | UndefinedComponentComponent
    _layout?:
      | LayoutComponent<TQueryResultType, TLastServerOutput, TLastClientOutput, TRouteDefinition, TInputSchema, TProps>
      | UndefinedLayoutComponent
    _layouts?: LayoutPoint[]
    name?: PointName
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
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _loadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
      TResponse,
      TClientResponse,
      TQueryResultType,
      TProps,
      TLastServerOutput,
      TLastClientOutput
    >({
      scope: overrides.scope ?? this.scope,
      _attachedTo: overrides._attachedTo ?? this._attachedTo,
      _base: overrides._base ?? this._base,
      _root: overrides._root ?? this._root,
      type: (overrides.type ?? this.type) as TPointType,
      _letsEndPointType: (overrides._letsEndPointType ?? this._letsEndPointType) as TLetsEndPointType,
      _serverurl: overrides._serverurl ?? this._serverurl,
      _baseurl: overrides._baseurl ?? this._baseurl,
      inputSchema: (overrides.inputSchema ?? this.inputSchema) as TInputSchema,
      _serverInputSchema: overrides._serverInputSchema ?? this._serverInputSchema,
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
        FinalClientData<TLastServerOutput, TLastClientOutput>,
        Error0,
        InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
        QueryKey,
        unknown
      >,
      _queryResultType: (overrides._queryResultType ?? this._queryResultType) as TQueryResultType,
      // _asFormData: overrides._asFormData ?? this._asFormData,
      _serverExecuteActions: overrides._serverExecuteActions ?? this._serverExecuteActions,
      _clientExecuteActions: overrides._clientExecuteActions ?? this._clientExecuteActions,
      _providerValueSetter: overrides._providerValueSetter ?? this._providerValueSetter,
      _ProviderReactContext: (overrides._ProviderReactContext ?? this._ProviderReactContext) as never,
      _useValue: overrides._useValue ?? this._useValue,
      _route: (overrides._route ?? this._route) as never,
      _prevRoute: (overrides._prevRoute ?? this._prevRoute) as never,
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

  attach<TPoint extends NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>>(
    point: TPoint,
  ): TPoint {
    const result = this._continue({
      ...point,
      _headFns: [...this._headFns, ...point.point._headFns],
      _serverExecuteActions: [...this._serverExecuteActions, ...point.point._serverExecuteActions],
      _clientExecuteActions: [...this._clientExecuteActions, ...point.point._clientExecuteActions],
      scope: this.scope,
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
    UndefinedResponse,
    UndefinedClientResponse,
    UndefinedQueryResultType,
    UndefinedProps,
    UndefinedLastOutput,
    UndefinedLastOutput
  >
  static create<
    TRootPoint extends NiceRootEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>,
  >(
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
    UndefinedResponse,
    UndefinedClientResponse,
    UndefinedQueryResultType,
    UndefinedProps,
    UndefinedLastOutput,
    UndefinedLastOutput
  >
  static create(scope: string, attachedTo?: PointsScope[]) {
    return new Point0({
      type: 'middleware',
      scope,
      _attachedTo: attachedTo ?? [],
      _letsEndPointType: 'root',
      _serverurl: typeof window !== 'undefined' ? window.location.origin : undefined,
      name: scope,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
      TResponse,
      TClientResponse,
      TQueryResultType,
      TProps,
      TLastServerOutput,
      TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
      TResponse,
      TClientResponse,
      TQueryResultType,
      TProps,
      TLastServerOutput,
      TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
      TResponse,
      TClientResponse,
      TQueryResultType,
      TProps,
      TLastServerOutput,
      TLastClientOutput
    >({
      _baseurl: baseurl,
    })
  }

  // general settings

  // asFormData(
  //   shouldAddMultipartFormDataHeaderToFetchOptions = true,
  // ): NiceMiddlePoint<
  //   TPointType,
  //   TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  > {
    return this._continue({
      _fetchOptions: typeof fetchOptionsOrFn === 'function' ? fetchOptionsOrFn : () => fetchOptionsOrFn,
    }) as never
  }

  // extra components

  error(
    errorComponent: TLetsEndPointType extends 'page' | 'layout' | 'component'
      ? FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
        ? ShowError<`${Capitalize<TLetsEndPointType>} can not accept response. Last loader should provide plain object data, not response.`>
        : ErrorComponentType<
            DestinationComponentType,
            TQueryResultType,
            TLastServerOutput,
            TLastClientOutput,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  >
  error(
    ...args: TLetsEndPointType extends 'page'
      ? FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
        ? [ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>]
        : [
            head: ErrorHeadFn<TLastServerOutput, TLastClientOutput, TInputSchema, TRouteDefinition>,
            pageErrorComponent: ErrorComponentType<
              DestinationComponentType,
              TQueryResultType,
              TLastServerOutput,
              TLastClientOutput,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  > {
    return this._continue({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      _componentLoadingComponent: (componentLoadingComponent as never) || (() => null), // in case if we prune componentLoading for serverNoSsr customer
    }) as never
  }

  loading(
    pageLoadingComponent: TLetsEndPointType extends 'page' | 'layout' | 'component'
      ? FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
        ? ShowError<`${Capitalize<TLetsEndPointType>} can not accept response. Last loader should provide plain object data, not response.`>
        : LoadingComponentType<
            DestinationComponentType,
            TQueryResultType,
            TLastServerOutput,
            TLastClientOutput,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  >
  loading(
    ...args: TLetsEndPointType extends 'page'
      ? FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
        ? [ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>]
        : [
            head: LoadingHeadFn<TLastServerOutput, TLastClientOutput, TInputSchema, TRouteDefinition>,
            pageLoadingComponent: LoadingComponentType<
              DestinationComponentType,
              TQueryResultType,
              TLastServerOutput,
              TLastClientOutput,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    wrapperComponent: TLetsEndPointType extends 'page' | 'layout' | 'component'
      ? FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
        ? ShowError<`${Capitalize<TLetsEndPointType>} can not accept response. Last loader should provide plain object data, not response.`>
        : WrapperComponentType<
            TQueryResultType,
            TLastServerOutput,
            TLastClientOutput,
            TInputSchema,
            TRouteDefinition,
            TProps
          >
      : WrapperComponentType<
          TQueryResultType,
          TLastServerOutput,
          TLastClientOutput,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  > {
    return this._continue({
      _wrappers: [...this._wrappers, wrapperComponent as never],
    }) as never
  }

  // middlewares

  ctx<TNewCtx extends Ctx = Ctx>(
    ctxFn: CtxFn<TCtx, TData, TResponse, TRouteDefinition, TInputSchema, TNewCtx>,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  > {
    const ctxFn =
      typeof ctxOrFn === 'undefined' // in case if we prune ctx for client customer
        ? ({ ctx }: { ctx: TCtx }) => ({ ...ctx })
        : typeof ctxOrFn === 'function'
          ? ctxOrFn
          : ({ ctx }: { ctx: TCtx }) => ({ ...ctx, ...ctxOrFn })
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'ctx', fn: ctxFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
    }) as never
  }

  loader<TNewLastServerOutput extends Data | Response = Data | Response>(
    loaderFn: LoaderFn<TCtx, TData, TResponse, TRouteDefinition, TInputSchema, TNewLastServerOutput>,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TNewLastServerOutput extends Data ? TNewLastServerOutput : TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TNewLastServerOutput extends Response ? TNewLastServerOutput : TResponse,
    TClientResponse,
    TQueryResultType extends UndefinedQueryResultType ? 'query' : TQueryResultType,
    TProps,
    TNewLastServerOutput,
    TLastClientOutput
  > {
    return this._continue({
      _queryResultType: this._queryResultType ?? 'query',
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we prune loader for client
        { type: 'loader', fn: loaderFn ?? ((c: any) => c.data), unstableId: Point0._getNextUnstableId() },
      ] as never,
    }) as never
  }

  ctxLoader<
    TNewCtx extends Ctx | UndefinedCtx = UndefinedCtx,
    TNewData extends Data | UndefinedData = UndefinedData,
    TNewResponse extends Response | UndefinedResponse = UndefinedResponse,
    TNewLastOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  >(
    ctxLoaderFn: CtxLoaderFn<
      TCtx,
      TData,
      TResponse,
      TLastServerOutput,
      TRouteDefinition,
      TInputSchema,
      TNewCtx,
      TNewData,
      TNewResponse,
      TNewLastOutput
    >,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TNewCtx extends Ctx ? TNewCtx : TCtx,
    // CtxLoader can returns nothing. We should mark that loader exists, so we add here empty data if nothing else exists
    TNewData extends Data
      ? TNewData
      : TData extends Data
        ? TData
        : TNewResponse extends Response
          ? TData
          : TResponse extends Response
            ? TData
            : EmptyData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TNewResponse extends Response ? TNewResponse : TResponse,
    TClientResponse,
    TQueryResultType extends UndefinedQueryResultType ? 'query' : TQueryResultType,
    TProps,
    TNewLastOutput extends LastOutput
      ? TNewLastOutput
      : TNewResponse extends Response
        ? TNewResponse
        : TNewData extends Data
          ? TNewData
          : TLastServerOutput extends LastOutput
            ? TLastServerOutput
            : EmptyData,
    TLastClientOutput
  > {
    return this._continue({
      _queryResultType: this._queryResultType ?? 'query',
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        {
          type: 'ctxLoader',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we prune ctxLoader for client
          fn: ctxLoaderFn ?? ((c: any) => ({})),
          unstableId: Point0._getNextUnstableId(),
        },
      ] as never,
    }) as never
  }

  clientLoader<TNewClientLastOutput extends LastOutput = LastOutput>(
    clientLoaderFn: ClientLoaderFn<
      TLetsEndPointType,
      TRouteDefinition,
      TInputSchema,
      TClientData,
      TClientResponse,
      TLastServerOutput,
      TLastClientOutput,
      TNewClientLastOutput
    >,
  ): NiceMiddlePoint<
    'clientMiddleware',
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    TNewClientLastOutput extends Data ? TNewClientLastOutput : TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponse,
    // server can return only data or only response. so on first client loader, if client loader not provide response, we store there server response to access it later
    TNewClientLastOutput extends Response
      ? TNewClientLastOutput
      : TLastClientOutput extends UndefinedLastOutput
        ? TLastServerOutput extends Response
          ? TLastServerOutput
          : TClientResponse
        : TClientResponse,
    TQueryResultType extends UndefinedQueryResultType ? 'query' : TQueryResultType,
    TProps,
    TLastServerOutput,
    TNewClientLastOutput
  >
  clientLoader(
    keepClientLoaders: false,
  ): NiceMiddlePoint<
    TPointType,
    TLetsEndPointType extends EndPointType ? TLetsEndPointType : never,
    TRequiredCtx,
    TCtx,
    TData,
    UndefinedData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponse,
    UndefinedResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    UndefinedLastOutput
  >
  clientLoader(clientLoaderFn: ClientLoaderFn<any, any, any, any, any, any, any> | false) {
    if (clientLoaderFn === false) {
      return this._continue({
        _clientExecuteActions: [],
      }) as never
    }
    return this._continue({
      type: 'clientMiddleware',
      _queryResultType: this._queryResultType ?? 'query',
      _clientExecuteActions: [
        ...this._clientExecuteActions,
        {
          type: 'loader',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          fn: clientLoaderFn || ((o: any) => o.data), // in case if we prune clientLoader for server without ssr customer
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TNewProps,
    TLastServerOutput,
    TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  >
  input(inputSchema: InputSchemaZod) {
    return this._continue({
      inputSchema: this.inputSchema ? this.inputSchema.extend(inputSchema.shape) : inputSchema,
      _serverInputSchema:
        this.type === 'middleware'
          ? this._serverInputSchema
            ? this._serverInputSchema.extend(inputSchema.shape)
            : inputSchema
          : this._serverInputSchema,
      _clientExecuteActions:
        this.type === 'clientMiddleware'
          ? [
              ...this._clientExecuteActions,
              { type: 'input', schema: inputSchema, unstableId: Point0._getNextUnstableId() },
            ]
          : this._clientExecuteActions,
      _serverExecuteActions:
        this.type === 'middleware'
          ? [
              ...this._serverExecuteActions,
              { type: 'input', schema: inputSchema, unstableId: Point0._getNextUnstableId() },
            ]
          : this._serverExecuteActions,
    }) as never
  }

  // end points

  // TODO: remove it when you be mentally ready to remove it
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
  //   TResponse,
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
  //   TResponse,
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
  //   TResponse,
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
    TClientData,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    UndefinedProps,
    TLastServerOutput,
    TLastClientOutput
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
    TClientData,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    UndefinedProps,
    TLastServerOutput,
    TLastClientOutput
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
    TClientData,
    TRouteDefinition,
    TRouteDefinition,
    TInputSchema,
    TClientResponse,
    TResponse,
    TQueryResultType,
    UndefinedProps,
    TLastServerOutput,
    TLastClientOutput
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
      type: 'middleware',
      _letsEndPointType: letsEndPointType,
      name: pointName,
      _route: newRoute as never,
      _prevRoute: this._route as never,
      _page: undefined,
      _component: undefined,
      _layout: undefined,
      _ProviderReactContext: undefined,
      _providerValueSetter: undefined,
      _useValue: undefined,
      _layouts: this.type === 'layout' ? [...this._layouts, this as LayoutPoint] : [...this._layouts],
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  > {
    return this._continue({
      type: 'root',
      _base: this as never as BasePoint,
      _root: this as never as RootPoint,
      name: this.scope,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  > {
    return this._continue({
      type: 'base',
      _base: this as never as BasePoint,
      _letsEndPointType: undefined,
    }) as never
  }

  page(
    ...args: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
      ? [ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>]
      : never[]
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
      TResponse,
      TClientResponse,
      TQueryResultType,
      TProps,
      TLastServerOutput,
      TLastClientOutput
    >
  page<
    TPage extends PageComponent<
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TRouteDefinition,
      TInputSchema,
      TProps
    >,
  >(
    ...args: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
      ? [ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>]
      : [page: TPage]
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
      TResponse,
      TClientResponse,
      TQueryResultType,
      TProps,
      TLastServerOutput,
      TLastClientOutput
    >
  page<
    TPage extends PageComponent<
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TRouteDefinition,
      TInputSchema,
      TProps
    >,
  >(
    ...args: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
      ? [
          ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>,
          ShowError<`Page can not accept response. Last loader should provide plain object data, not response.`>,
        ]
      : [
          head:
            | SuccessHeadFn<TLastServerOutput, TLastClientOutput, TRouteDefinition, TInputSchema>
            | ResolvableHead
            | string,
          page: TPage,
        ]
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
      TResponse,
      TClientResponse,
      TQueryResultType,
      TProps,
      TLastServerOutput,
      TLastClientOutput
    >
  page(...args: any[]) {
    const [head, page = () => null] = (args.length === 2 ? args : [undefined, args[0]]) as [
      SuccessHeadFn | undefined,
      (
        | PageComponent<TQueryResultType, TLastServerOutput, TLastClientOutput, TRouteDefinition, TInputSchema, TProps>
        | undefined
      ),
    ]
    const headFn = !head ? undefined : typeof head === 'function' ? head : () => head
    const successHeadFn: MiddlewareHeadFn | undefined = !headFn
      ? undefined
      : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        (options) => (!options.data || options.loading || options.error ? {} : headFn(options as never))
    const point = this._continue({
      type: 'page',
      _page: page,
      _letsEndPointType: undefined,
      _headFns: !successHeadFn ? this._headFns : [...this._headFns, successHeadFn],
    })
    const pageWithPoint = point._Page.bind(point)
    Object.assign(pageWithPoint, {
      toString: point.toString.bind(point),
      toJSON: point.toJSON.bind(point),
      [Symbol.toPrimitive]: point[Symbol.toPrimitive].bind(point),
      Infer: point.Infer,
      point,
      lets: point.lets.bind(point),
      inputSchema: point.inputSchema,
      useQuery: point.useQuery.bind(point),
      getQueryKey: point.getQueryKey.bind(point),
      getQueryOptions: point.getQueryOptions.bind(point),
      prefetchQuery: point.prefetchQuery.bind(point),
      fetch: point.fetch.bind(point),
      execute: point.execute.bind(point),
      executeDetailed: point.executeDetailed.bind(point),
      useInfiniteQuery: point.useInfiniteQuery.bind(point),
      getInfiniteQueryOptions: point.getInfiniteQueryOptions.bind(point),
      prefetchInfiniteQuery: point.prefetchInfiniteQuery.bind(point),
    })
    return pageWithPoint as never
    // Point0.setGlobalPoint(point)
    // return point._Page
  }

  component<
    TComponent extends ComponentComponent<TQueryResultType, TLastServerOutput, TLastClientOutput, TInputSchema, TProps>,
  >(
    ...args: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
      ? [ShowError<`Component can not accept response. Last loader should provide plain object data, not response.`>]
      : [component?: TComponent]
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  > {
    const [component = () => null] = args as [TComponent | undefined]
    const point = this._continue({
      type: 'component',
      _component: component,
      _letsEndPointType: undefined,
    })
    const componentWithPoint = point._Component
    Object.assign(componentWithPoint, {
      toString: point.toString.bind(point),
      [Symbol.toPrimitive]: point[Symbol.toPrimitive].bind(point),
      toJSON: point.toJSON.bind(point),
      Infer: point.Infer,
      point,
      lets: point.lets.bind(point),
      inputSchema: point.inputSchema,
      useQuery: point.useQuery.bind(point),
      getQueryKey: point.getQueryKey.bind(point),
      getQueryOptions: point.getQueryOptions.bind(point),
      prefetchQuery: point.prefetchQuery.bind(point),
      fetch: point.fetch.bind(point),
      execute: point.execute.bind(point),
      executeDetailed: point.executeDetailed.bind(point),
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
      TLastServerOutput,
      TLastClientOutput,
      TRouteDefinition,
      TInputSchema,
      TProps
    >,
  >(
    ...args: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
      ? [ShowError<`Layout can not accept response. Last loader should provide plain object data, not response.`>]
      : [layout?: TLayout]
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  > {
    const [layout = ({ children }: { children: Exclude<React.ReactNode, Promise<any>> }) => children] = args as [
      TLayout | undefined,
    ]
    const point = this._continue({
      type: 'layout',
      _layout: layout as never,
      _letsEndPointType: undefined,
      _base: this as never as BasePoint,
    })
    const layoutWithPoint = point._Layout
    Object.assign(layoutWithPoint, {
      toString: point.toString.bind(point),
      toJSON: point.toJSON.bind(point),
      Infer: point.Infer,
      point,
      lets: point.lets.bind(point),
      inputSchema: point.inputSchema,
      useQuery: point.useQuery.bind(point),
      getQueryKey: point.getQueryKey.bind(point),
      getQueryOptions: point.getQueryOptions.bind(point),
      prefetchQuery: point.prefetchQuery.bind(point),
      fetch: point.fetch.bind(point),
      execute: point.execute.bind(point),
      executeDetailed: point.executeDetailed.bind(point),
      useInfiniteQuery: point.useInfiniteQuery.bind(point),
      getInfiniteQueryOptions: point.getInfiniteQueryOptions.bind(point),
      prefetchInfiniteQuery: point.prefetchInfiniteQuery.bind(point),
    })
    return layoutWithPoint as never
  }

  provider<TNewClientData extends Data = Data>(
    valueSetter: ProviderValueSetterFn<
      TLetsEndPointType,
      TQueryResultType,
      TRouteDefinition,
      TLastServerOutput,
      TLastClientOutput,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TNewClientData
  >
  provider(
    ...args: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Data ? [] : never
  ): NiceProviderEndPoint<
    'provider',
    UndefinedEndPointType,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  >
  provider(
    valueSetter?: ProviderValueSetterFn<
      TLetsEndPointType,
      TQueryResultType,
      TRouteDefinition,
      TLastServerOutput,
      TLastClientOutput,
      any
    >,
  ) {
    const point = this._continue({
      type: 'provider',
      _letsEndPointType: undefined,
      _providerValueSetter: valueSetter || (({ data }) => data),
      _ProviderReactContext: createContext<FinalClientData<TLastServerOutput, TLastClientOutput>>(
        null as never,
      ) as never,
      _useValue: (point: AnyPoint, keys?: string | string[] | undefined) => {
        if (!point._ProviderReactContext) {
          throw new Error('ProviderReactContext 2 not found on point: ' + point.name)
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
  //           ShowError<`Point has no loaders. Please add .loader() or .clientLoader() or.ctxLoader() before calling .provider()`>,
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

  query(
    ...args: TLetsEndPointType extends 'query'
      ? FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Data
        ? [
            queryOptions?: ExtraUseQueryOptions<
              FinalClientData<TLastServerOutput, TLastClientOutput>,
              Error0,
              FinalClientData<TLastServerOutput, TLastClientOutput>,
              QueryKey
            >,
          ]
        : FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
          ? [ShowError<`Query can not return response. Last loader should provide plain object data, not response.`>]
          : [
              ShowError<`Point has no loaders. Please add .loader() or .clientLoader() or.ctxLoader() before calling .query()`>,
            ]
      : never
  ): NiceQueryEndPoint<
    'query',
    undefined,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponse,
    TClientResponse,
    'query',
    TProps,
    TLastServerOutput,
    TLastClientOutput
  >
  query(
    ...args: TLetsEndPointType extends 'query'
      ? never
      : [
          queryOptions?: ExtraUseQueryOptions<
            FinalClientData<TLastServerOutput, TLastClientOutput>,
            Error0,
            FinalClientData<TLastServerOutput, TLastClientOutput>,
            QueryKey
          >,
        ]
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
    TResponse,
    TClientResponse,
    'query',
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
    ...args: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Data
      ? [
          infiniteQueryOptions: ExtraUseInfiniteQueryOptions<
            InputRaw<TRouteDefinition, TInputSchema>,
            FinalClientData<TLastServerOutput, TLastClientOutput>,
            Error0,
            InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
            QueryKey,
            unknown
          >,
        ]
      : FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
        ? [
            ShowError<`InfiniteQuery can not return response. Last loader should provide plain object data, not response.`>,
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
        TResponse,
        TClientResponse,
        'infiniteQuery',
        TProps,
        TLastServerOutput,
        TLastClientOutput
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
        TResponse,
        TClientResponse,
        'infiniteQuery',
        TProps,
        TLastServerOutput,
        TLastClientOutput
      > {
    const [infiniteQueryOptions = {}] = args
    return this._continue({
      type: this._letsEndPointType === 'infiniteQuery' ? 'infiniteQuery' : this.type,
      _letsEndPointType: (this._letsEndPointType === 'infiniteQuery'
        ? undefined
        : this._letsEndPointType) as TLetsEndPointType extends 'infiniteQuery' ? undefined : TLetsEndPointType,
      _queryResultType: 'infiniteQuery',
      _infiniteQueryOptions: infiniteQueryOptions as ExtraUseInfiniteQueryOptions<
        InputRaw<TRouteDefinition, TInputSchema>,
        FinalClientData<TLastServerOutput, TLastClientOutput>,
        Error0,
        InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
        QueryKey,
        unknown
      >,
    }) as never
  }

  mutation(
    ...args: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends LastOutput
      ? [
          mutationOptions?: UseMutationOptions<
            FinalClientData<TLastServerOutput, TLastClientOutput>,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  > {
    const [mutationOptions = {}] = args
    return this._continue({
      type: 'mutation',
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
    TLastServerOutput,
    TLastClientOutput,
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
    TLastServerOutput,
    TLastClientOutput,
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
    useLoaderResult: AnyUseLoaderResult<
      any,
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
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
    return this._serverExecuteActions.some((fn) => fn.type === 'loader' || fn.type === 'ctxLoader')
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
    if (!this._route) {
      throw new Error(`No client route provided for this point. Name: ${this.name}.`)
    }
    return this._route as CallableRoute<NonNullable<TRouteDefinition>>
  }

  parseInputSafe(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>]
      : [input: InputRaw<TRouteDefinition, TInputSchema>]
  ): SafeParseInputResult<TRouteDefinition, TInputSchema> {
    const [input = {}] = args
    if (this.inputSchema) {
      const parseResult = this.inputSchema.safeParse(input)
      if (parseResult.success) {
        return {
          success: true,
          data: parseResult.data as InputParsed<TRouteDefinition, TInputSchema>,
          error: undefined,
        }
      }
      return { success: false, data: undefined, error: Error0.from(parseResult.error) }
    }
    if (this._route) {
      const parseResult = this._route.safeParseFlatInput(input)
      if (parseResult.success) {
        return {
          success: true,
          data: parseResult.data as InputParsed<TRouteDefinition, TInputSchema>,
          error: undefined,
        }
      }
      return { success: false, data: undefined, error: Error0.from(parseResult.error) }
    }
    return {
      success: true,
      data: {} as InputParsed<TRouteDefinition, TInputSchema>,
      error: undefined,
    }
  }

  parseInput(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>]
      : [input: InputRaw<TRouteDefinition, TInputSchema>]
  ): InputParsed<TRouteDefinition, TInputSchema> {
    const result = this.parseInputSafe(...args)
    if (!result.success) {
      throw result.error
    }
    return result.data
  }

  private async _executeClientAsync({
    data,
    response,
    location,
    input,
  }: {
    data: Data | undefined
    response: Response | undefined
    location?: AnyLocation
    input: InputRaw<TRouteDefinition, TInputSchema>
  }): Promise<{
    clientData: Data | undefined
    clientResponse: Response | undefined
    clientOutput: Data | Response | undefined
  }> {
    let currentClientData: Data | undefined = data
    let currentClientResponse: Response | undefined = response
    let currentClientOutput: Data | Response | undefined = response ?? data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- we parse input step by step, so we do not need initial parse result
    const { parsedInput, inputError } = (() => {
      const result = this.parseInputSafe(input)
      if (!result.success) {
        return { parsedInput: {}, inputError: result.error }
      }
      return { parsedInput: result.data, inputError: undefined }
    })()
    if (inputError) {
      throw new Error(`Input error: ${inputError.message}`)
    }
    let currentInputParsed: InputParsed = this._route ? this._route.parseFlatInput(input) : {}
    let currentInputSchema: InputSchema | undefined = this._serverInputSchema
    location ??=
      this.type === 'page' || this.type === 'layout'
        ? this._getSelfLocationByAnotherLocationOrInput(location, input)
        : Point0._currentLocation.get()
    for (const clientExecuteAction of this._clientExecuteActions) {
      switch (clientExecuteAction.type) {
        case 'input': {
          currentInputSchema = currentInputSchema
            ? currentInputSchema.extend(clientExecuteAction.schema.shape)
            : clientExecuteAction.schema
          const safeParseResult = currentInputSchema.safeParse(input)
          if (safeParseResult.error) {
            throw new Error(`Input error: ${safeParseResult.error.message}`)
          }
          currentInputParsed = safeParseResult.data
          break
        }
        case 'loader': {
          const result = await clientExecuteAction.fn({
            data: currentClientData ?? {},
            location,
            input: currentInputParsed,
            inputRaw: input,
            response: currentClientResponse,
          })
          if (result instanceof Response) {
            currentClientResponse = result
            currentClientOutput = result
          } else {
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
    }
  }

  // TODO: merge it with _executeClientAsync
  private _executeClientSync({
    data,
    response,
    location,
    input,
  }: {
    data: Data | undefined
    response: Response | undefined
    location?: AnyLocation
    input: InputRaw<TRouteDefinition, TInputSchema>
  }): {
    clientData: Data | undefined
    clientResponse: Response | undefined
    clientOutput: Data | Response | undefined
  } {
    let currentClientData: Data | undefined = data
    let currentClientResponse: Response | undefined = undefined
    let currentClientOutput: Data | Response | undefined = response ?? data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- we parse input step by step, so we do not need initial parse result
    const { parsedInput, inputError } = (() => {
      const result = this.parseInputSafe(input)
      if (!result.success) {
        return { parsedInput: {}, inputError: result.error }
      }
      return { parsedInput: result.data, inputError: undefined }
    })()
    if (inputError) {
      throw new Error(`Input error: ${inputError.message}`)
    }
    let currentInputParsed: InputParsed = this._route ? this._route.parseFlatInput(input) : {}
    let currentInputSchema: InputSchema | undefined = this._serverInputSchema
    location ??=
      this.type === 'page' || this.type === 'layout'
        ? this._getSelfLocationByAnotherLocationOrInput(location, input)
        : Point0._currentLocation.get()
    for (const clientExecuteAction of this._clientExecuteActions) {
      switch (clientExecuteAction.type) {
        case 'input': {
          currentInputSchema = currentInputSchema
            ? currentInputSchema.extend(clientExecuteAction.schema.shape)
            : clientExecuteAction.schema
          const safeParseResult = currentInputSchema.safeParse(input)
          if (safeParseResult.error) {
            throw new Error(`Input error: ${safeParseResult.error.message}`)
          }
          currentInputParsed = safeParseResult.data
          break
        }
        case 'loader': {
          const result = clientExecuteAction.fn({
            data: currentClientData ?? {},
            location,
            input: currentInputParsed,
            inputRaw: input,
            response: currentClientResponse,
          })
          if (result instanceof Response) {
            currentClientResponse = result
            currentClientOutput = result
          } else {
            currentClientData = result as Data
            currentClientOutput = result as Data | Response
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
    }
  }

  _executeHead(
    unqueriedLoaderResult: AnyUnqueriedLoaderResult<
      any,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      AnyLocation
    >,
  ): ResolvableHead[] {
    const head: ResolvableHead[] = []
    for (const headFn of this._headFns) {
      const headFnResult = headFn(unqueriedLoaderResult as never)
      const headFnResultResolvable = typeof headFnResult === 'string' ? { title: headFnResult } : headFnResult
      head.push(headFnResultResolvable)
    }
    return head
  }

  private _useHead(
    unqueriedLoaderResult: AnyUnqueriedLoaderResult<
      any,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      AnyLocation
    >,
  ): void {
    for (const headItem of this._executeHead(unqueriedLoaderResult)) {
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
  ): UsePointQueryResult<TQueryResultType, TLastServerOutput, TLastClientOutput, any> {
    const [input = {}, queryOptions, fetchOptions] = args
    const location = useLocation()
    const serverQueryEnabled = this._hasLoader()
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
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
                FinalClientData<TLastServerOutput, TLastClientOutput>,
                Error0,
                InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
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
                FinalClientData<TLastServerOutput, TLastClientOutput>,
                Error0,
                InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
  ): UsePointQueryResult<TQueryResultType, TLastServerOutput, TLastClientOutput, any> {
    const [input = {}, infiniteQueryOptions, fetchOptions] = args
    const location = useLocation()
    const serverQueryEnabled = this._hasLoader()
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

  private _useLoader(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?:
            | ExtraUseQueryOptions
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
                FinalClientData<TLastServerOutput, TLastClientOutput>,
                Error0,
                InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
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
                FinalClientData<TLastServerOutput, TLastClientOutput>,
                Error0,
                InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
  ): AnyUseLoaderResult<
    any,
    TQueryResultType,
    TLastServerOutput,
    TLastClientOutput,
    TInputSchema,
    TRouteDefinition,
    AnyLocation
  > & { dataOrLastInfiteData: FinalClientData<TLastServerOutput, TLastClientOutput> } {
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
      const parsed = (():
        | {
            inputParsed: InputParsed<TRouteDefinition, TInputSchema>
            inputParseError: null
          }
        | {
            inputParsed: null
            inputParseError: Error0
          } => {
        const result = this.parseInputSafe(inputRaw)
        if (!result.success) {
          return { inputParsed: null, inputParseError: result.error }
        }
        return { inputParsed: result.data, inputParseError: null }
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
          dataOrLastInfiteData: {},
        }
      }, [inputParseError, inputRaw, inputParsed, location])
      return result as never
    }
    const query =
      this._queryResultType === 'infiniteQuery' ? this.useInfiniteQuery(...(args as never)) : this.useQuery(...args)
    const result = React.useMemo(() => {
      const dataOrLastInfiteData =
        this._queryResultType === 'infiniteQuery' ? (query?.data?.pages as any)?.at(-1) : query?.data
      return {
        data: query?.data,
        loading: query?.isLoading,
        error: query?.error ? Error0.from(query.error) : null,
        query: query as never,
        location,
        input: inputParsed,
        inputRaw,
        dataOrLastInfiteData,
      }
    }, [query, query?.data, query?.error, query?.isLoading, inputRaw, inputParsed, location])
    return result as never
  }

  async fetch(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
      : [input: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
  ): Promise<FetchOutput<TLastServerOutput>> {
    const [input = {}, options] = args
    const fetchOptions = { ...this._fetchOptions?.(), ...options }
    const headers = mergeHeaders(fetchOptions.headers, options?.headers, { Accept: 'application/json' })
    if (!this._serverurl) {
      throw new Error('Server URL is not set')
    }
    const url = new URL('/_point0', this._serverurl)
    const method = 'post'

    const outputType = args[2] ?? (this.type === 'response' ? 'response' : 'data')
    const scope = this._attachedTo.length === 0 ? this.scope : Point0.getPointsManager().scope

    // const shouldAddMultipartFormDataHeaderToFetchOptions = this._asFormData ?? isContainsBinary(input)
    const shouldAddMultipartFormDataHeaderToFetchOptions = isContainsBinary(input)

    const bodySrc = {
      outputType,
      scope,
      pointType: this.type,
      pointName: this.name,
      pointInput: input,
    }
    const body = (() => {
      if (shouldAddMultipartFormDataHeaderToFetchOptions) {
        const formData = new FormData()
        const flattened: Record<string, unknown> = flatten(bodySrc)
        for (const [key, value] of Object.entries(flattened)) {
          if (value instanceof File || value instanceof Blob) {
            formData.append(key, value)
          } else if (value !== undefined) {
            formData.append(key, stringify(value))
          }
        }
        return formData
      } else {
        headers.set('Content-Type', 'application/json')
        return stringify(bodySrc)
      }
    })()

    const res = await fetch(url.toString(), {
      ...this._fetchOptions?.(),
      ...fetchOptions,
      headers,
      method,
      body,
    })
    if (res.headers.get('X-Point0-Response') === 'true') {
      return res as FetchOutput<TLastServerOutput>
    }
    try {
      const json = await res.json()
      if (res.ok) {
        return json
      }
      throw Error0.from(json, {
        httpStatus: res.status,
      })
    } catch (error) {
      throw Error0.from(error)
    }
  }

  async executeDetailed(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? TData extends Data
        ? [input?: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions]
        : [input?: InputRaw<TRouteDefinition, TInputSchema>]
      : TData extends Data
        ? [input: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions]
        : [input: InputRaw<TRouteDefinition, TInputSchema>]
  ): Promise<
    ClientExecuteDetailedResult<TData, TResponse, TClientData, TClientResponse, TLastServerOutput, TLastClientOutput>
  > {
    if (Point0.isServer) {
      throw new Error0(
        'If you want to execute data on server, use engine.execute, or Executor.execute, or get execute fn from loader|ctx|ctxLoader options. point.execute is for client only and use fetch under the hood to retrieve server data',
      )
    }
    const [input = {}, fetchOptions] = args
    const { serverData, serverResponse, serverOutput } = await (async () => {
      if (this._hasLoader()) {
        const serverDataOrResponse = await this.fetch(input as never, fetchOptions)
        if (serverDataOrResponse instanceof Response) {
          return { serverData: undefined, serverResponse: serverDataOrResponse, serverOutput: serverDataOrResponse }
        }
        return { serverData: serverDataOrResponse, serverResponse: undefined, serverOutput: serverDataOrResponse }
      }
      return { serverData: undefined, serverResponse: undefined, serverOutput: undefined }
    })()
    if (this._hasClientLoader()) {
      if (this._hasClientAsyncLoader()) {
        const { clientOutput, clientData, clientResponse } = await this._executeClientAsync({
          data: serverData || {},
          response: serverResponse,
          input: input as never,
        })
        return {
          serverData,
          serverResponse,
          serverOutput,
          clientData,
          clientResponse,
          clientOutput,
          output: clientOutput ?? serverOutput,
        } as ClientExecuteDetailedResult<
          TData,
          TResponse,
          TClientData,
          TClientResponse,
          TLastServerOutput,
          TLastClientOutput
        >
      } else {
        const { clientOutput, clientData, clientResponse } = this._executeClientSync({
          data: serverData || {},
          response: serverResponse,
          input: input as never,
        })
        return {
          serverData,
          serverResponse,
          serverOutput,
          clientData,
          clientResponse,
          clientOutput,
          output: clientOutput ?? serverOutput,
        } as ClientExecuteDetailedResult<
          TData,
          TResponse,
          TClientData,
          TClientResponse,
          TLastServerOutput,
          TLastClientOutput
        >
      }
    }
    return {
      serverData,
      serverResponse,
      serverOutput,
      clientData: undefined,
      clientResponse: undefined,
      clientOutput: undefined,
      output: serverOutput,
    } as ClientExecuteDetailedResult<
      TData,
      TResponse,
      TClientData,
      TClientResponse,
      TLastServerOutput,
      TLastClientOutput
    >
  }

  async execute(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? TData extends Data
        ? [input?: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions]
        : [input?: InputRaw<TRouteDefinition, TInputSchema>]
      : TData extends Data
        ? [input: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions]
        : [input: InputRaw<TRouteDefinition, TInputSchema>]
  ): Promise<FinalLastOutput<TLastServerOutput, TLastClientOutput>> {
    const detailedResult = await this.executeDetailed(...args)
    return detailedResult.output
  }

  _getServerQueryKey({
    input,
    outputType = this.type === 'response' ? 'response' : 'data',
    isInfiniteQuery,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    outputType?: FetchOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    if (!this.name) {
      throw new Error('Point name is not provided')
    }
    return [
      'point0',
      'server',
      this.type,
      this.name,
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
    if (!this.name) {
      throw new Error('Point name is not provided')
    }
    return ['point0', 'client', this.type, this.name, 'data', isInfiniteQuery ? 'infinite' : 'finite', stringify(input)]
  }

  private _getCombinedQueryKey({
    input = {} as never,
    outputType = this.type === 'response' ? 'response' : 'data',
    isInfiniteQuery,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    outputType?: FetchOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    if (!this.name) {
      throw new Error('Point name is not provided')
    }
    return [
      'point0',
      'combined',
      this.type,
      this.name,
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
    if (!this.name) {
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
  }): UseQueryOptions<FetchOutput<TLastServerOutput>, Error0, FetchOutput<TLastServerOutput>, QueryKey> {
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
  }): UseQueryOptions<
    FinalClientData<TLastServerOutput, TLastClientOutput>,
    Error0,
    FinalClientData<TLastServerOutput, TLastClientOutput>,
    QueryKey
  > {
    const queryKey = this._getClientQueryKey({ input, isInfiniteQuery: false })
    const queryFn = this._hasClientAsyncLoader()
      ? async () => {
          const { clientData } = await this._executeClientAsync({
            data: data || {},
            location,
            input,
            response: undefined,
          })
          return clientData
        }
      : () => {
          const { clientData } = this._executeClientSync({ data: data || {}, location, input, response: undefined })
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
  }): UseQueryOptions<
    FinalClientData<TLastServerOutput, TLastClientOutput>,
    Error0,
    FinalClientData<TLastServerOutput, TLastClientOutput>,
    QueryKey
  > {
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
  ): UseQueryOptions<
    FinalClientData<TLastServerOutput, TLastClientOutput>,
    Error0,
    FinalClientData<TLastServerOutput, TLastClientOutput>,
    QueryKey
  > {
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
          FinalClientData<TLastServerOutput, TLastClientOutput>,
          Error0,
          InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseInfiniteQueryOptions<
    InfiniteData<FetchOutput<TLastServerOutput>>,
    Error0,
    FetchOutput<TLastServerOutput>,
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
          FinalClientData<TLastServerOutput, TLastClientOutput>,
          Error0,
          InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
          QueryKey,
          unknown
        >
      | undefined
  }): UseInfiniteQueryOptions<
    FinalClientData<TLastServerOutput, TLastClientOutput>,
    Error0,
    InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
    QueryKey
  > {
    const queryKey = this._getClientQueryKey({ input, isInfiniteQuery: true })
    const queryFn = this._hasClientAsyncLoader()
      ? async ({ pageParam }: { pageParam: unknown }) => {
          try {
            const pageParamFromInput = this._infiniteQueryOptions.pageParamFromInput
            const { clientData } = await this._executeClientAsync({
              data: data || {},
              location,
              response: undefined,
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
            const { clientData } = this._executeClientSync({
              data: data || {},
              location,
              response: undefined,
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
          FinalClientData<TLastServerOutput, TLastClientOutput>,
          Error0,
          InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    queryClient?: QueryClient
  }): UseInfiniteQueryOptions<
    FinalClientData<TLastServerOutput, TLastClientOutput>,
    Error0,
    InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
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
                FinalClientData<TLastServerOutput, TLastClientOutput>,
                Error0,
                InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
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
                FinalClientData<TLastServerOutput, TLastClientOutput>,
                Error0,
                InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
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
    FinalClientData<TLastServerOutput, TLastClientOutput>,
    Error0,
    InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
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
  }): UseQueryResult<FetchOutput<TLastServerOutput>, Error0> {
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
  }): UseQueryResult<FinalClientData<TLastServerOutput, TLastClientOutput>, Error0> {
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
  }): UseQueryResult<FinalClientData<TLastServerOutput, TLastClientOutput>, Error0> {
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
          FinalClientData<TLastServerOutput, TLastClientOutput>,
          Error0,
          InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseInfiniteQueryResult<InfiniteData<FetchOutput<TLastServerOutput>>, Error0> {
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
          FinalClientData<TLastServerOutput, TLastClientOutput>,
          Error0,
          InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
          QueryKey,
          unknown
        >
      | undefined
  }): UseInfiniteQueryResult<InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>, Error0> {
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
          FinalClientData<TLastServerOutput, TLastClientOutput>,
          Error0,
          InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseInfiniteQueryResult<InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>, Error0> {
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
    FinalLastOutput<TLastServerOutput, TLastClientOutput>,
    Error0,
    InputRawMaybeOptional<TRouteDefinition, TInputSchema>
  > {
    const mutationFn = async (input: Record<string, any> = {}) => {
      try {
        if (Point0.isServer) {
          throw new Error(
            'If you want to execute data on server, use engine.execute, or Executor.execute, or get execute fn from loader|ctx|ctxLoader options. point.execute is for client only and use fetch under the hood to retrieve server data',
          )
        }
        const serverDataOrResponse = await (async () => {
          if (this._hasLoader()) {
            return await this.fetch(input as never, fetchOptions)
          }
          return {}
        })()
        if (this._hasClientLoader()) {
          if (this._hasClientAsyncLoader()) {
            const { clientOutput } = await this._executeClientAsync({
              data: serverDataOrResponse instanceof Response ? {} : (serverDataOrResponse ?? {}),
              response: serverDataOrResponse instanceof Response ? serverDataOrResponse : undefined,
              input: input as never,
            })
            return clientOutput
          } else {
            const { clientOutput } = this._executeClientSync({
              data: serverDataOrResponse instanceof Response ? {} : (serverDataOrResponse ?? {}),
              response: serverDataOrResponse instanceof Response ? serverDataOrResponse : undefined,
              input: input as never,
            })
            return clientOutput
          }
        }
        return serverDataOrResponse as FinalLastOutput<TLastServerOutput, TLastClientOutput>
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
      FinalLastOutput<TLastServerOutput, TLastClientOutput>,
      Error0,
      InputRawMaybeOptional<TRouteDefinition, TInputSchema>
    >
  }

  useMutation = (
    mutationOptions?: MutationOptions | undefined,
    fetchOptions?: FetchOptions | undefined,
  ): UseMutationResult<
    FinalLastOutput<TLastServerOutput, TLastClientOutput>,
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
    if (!suitablePointTypes.includes(this.type)) {
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
                FinalClientData<TLastServerOutput, TLastClientOutput>,
                Error0,
                InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
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
                FinalClientData<TLastServerOutput, TLastClientOutput>,
                Error0,
                InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
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
    if (!suitablePointTypes.includes(this.type)) {
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
    if (this.type !== 'page') {
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
                      FinalClientData<TLastServerOutput, TLastClientOutput>,
                      Error0,
                      InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
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
                      FinalClientData<TLastServerOutput, TLastClientOutput>,
                      Error0,
                      InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>,
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
        (p) => p.name === this.name && stringify(p.input) === stringify(inputRaw),
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
            name: this.name,
            input: inputRaw,
            x: currentPageScrollPosition?.x ?? 0,
            y: currentPageScrollPosition?.y ?? 0,
          })
        }
      }
    }, [this.name, inputRaw, prevLocation, status])

    const result = this._useLoader(inputRaw, this._defaultPageQueryOptions)

    this._useHead({ ...result, data: result.dataOrLastInfiteData } as AnyUnqueriedLoaderResult<
      any,
      any,
      any,
      any,
      any,
      any
    >)

    if (!this._page) {
      // impossible error
      return this._withWrappers({
        component: React.createElement(errorComponent, {
          type: 'page',
          data: undefined as FinalClientData<TLastServerOutput, TLastClientOutput> | undefined,
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
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    const { inputRaw, restProps } = React.useMemo<{
      inputRaw: InputRaw<TRouteDefinition, TInputSchema>
      restProps: FinalProps<TProps>
    }>(() => {
      const { input: providedInput = {}, ...restProps } = props as any
      const inputRaw = { ...providedInput }
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

  getValue(input?: InputRaw<TRouteDefinition, TInputSchema>): FinalClientData<TLastServerOutput, TLastClientOutput> {
    const value = SuperStore.getWeak<FinalClientData<TLastServerOutput, TLastClientOutput>>(
      `__POINT0_PROVIDER_VALUE_${this.scope}_${this.name}_${stringify(input || {})}`,
    )
    if (!value) {
      throw new Error(
        `Provider value not found on point: provider.${this.name}. You should call getValue only after Provider component is mounted and loaded.`,
      )
    }
    return value
  }

  getValueSafe(
    input?: InputRaw<TRouteDefinition, TInputSchema>,
  ): FinalClientData<TLastServerOutput, TLastClientOutput> | undefined {
    const value = SuperStore.getWeak<FinalClientData<TLastServerOutput, TLastClientOutput>>(
      `__POINT0_PROVIDER_VALUE_${this.scope}_${this.name}_${stringify(input || {})}`,
    )
    return value
  }

  Provider = (props: MountableComponentProps<TInputSchema, TProps, null>): React.ReactNode => {
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    if (!this._ProviderReactContext) {
      throw new Error('ProviderReactContext not found on point: ' + this.name)
    }
    if (!this._providerValueSetter) {
      throw new Error('providerValueSetter not found on point: ' + this.name)
    }

    const { inputRaw, children } = React.useMemo<{
      inputRaw: InputRaw<TRouteDefinition, TInputSchema>
      children: React.ReactNode | undefined
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
    SuperStore.setWeak(`__POINT0_PROVIDER_VALUE_${this.scope}_${this.name}_${stringify(inputRaw)}`, value)
    return this._withWrappers({
      component: React.createElement(this._ProviderReactContext.Provider, {
        value,
        children,
      }),
      useLoaderResult: result,
      props,
    })
  }

  useValue<K extends keyof FinalClientData<TLastServerOutput, TLastClientOutput>>(
    key: K,
  ): FinalClientData<TLastServerOutput, TLastClientOutput>[K]
  useValue<K extends keyof FinalClientData<TLastServerOutput, TLastClientOutput>>(
    keys: K[],
  ): Pick<FinalClientData<TLastServerOutput, TLastClientOutput>, K>
  useValue(): FinalClientData<TLastServerOutput, TLastClientOutput>
  useValue(
    keys?:
      | keyof FinalClientData<TLastServerOutput, TLastClientOutput>
      | Array<keyof FinalClientData<TLastServerOutput, TLastClientOutput>>,
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

  // executor store

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
    documentElementGetter: () => HTMLElement | null,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  >
  scrollPosition(
    selector: string,
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  >
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
  >
  scrollPosition(...args: [() => HTMLElement | null] | [string] | [ScrollPositionGetter, ScrollPositionSetter]) {
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
      throw new Error('Invalid arguments for scrollPosition')
    })()
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
      TResponse,
      TClientResponse,
      TQueryResultType,
      TProps,
      TLastServerOutput,
      TLastClientOutput
    >({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if it was pruned for server
      _scrollPositionGetter: getter ?? this._scrollPositionGetter,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if it was pruned for server
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
      TResponse,
      TClientResponse,
      TQueryResultType,
      TProps,
      TLastServerOutput,
      TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
      TResponse,
      TClientResponse,
      TQueryResultType,
      TProps,
      TLastServerOutput,
      TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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
      TResponse,
      TClientResponse,
      TQueryResultType,
      TProps,
      TLastServerOutput,
      TLastClientOutput
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
    TResponse,
    TClientResponse,
    TQueryResultType,
    TProps,
    TLastServerOutput,
    TLastClientOutput
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

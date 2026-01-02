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
import { useMemo } from 'react'
import type { ResolvableHead } from 'unhead/types'
import type { Context } from 'use-context-selector'
import { createContext, useContextSelector } from 'use-context-selector'
import { ClientServerHelpers } from './client-server.js'
import { CookiesStore } from './cookies-store.js'
import { PointsManager } from './points-manager.js'
import { useLocation, useRouterContext } from './router.js'
import type { SuperStoreDefinedItem } from './super-store.js'
import { SuperStore } from './super-store.js'
import type {
  AnyPoint,
  AnyUnqueriedLoaderResult,
  AnyUseLoaderResult,
  AppendCtx,
  AppendCtxExposedKeys,
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
  Data,
  DataTransformer,
  DataTransformerExtended,
  DestinationComponentType,
  EmptyCtx,
  EmptyData,
  EmptyStringIfStandaloneSlash,
  EndPointType,
  EndPointTypeOrNever,
  ErrorComponentType,
  ErrorHeadFn,
  ExtraUseInfiniteQueryOptions,
  ExtraUseQueryOptions,
  FetchDetailedOutput,
  FetchOptions,
  FetchOptionsFn,
  FetchOptionsOrFn,
  FetchOutput,
  FetchOutputType,
  FinalLoaderData,
  FinalLoaderMappedOutput,
  FinalProps,
  IfAnyThenElse,
  Infer,
  InferCtxFnOutputCtxAppend,
  InferCtxFnOutputCtxExposedKeys,
  InputParsed,
  InputRaw,
  InputRawMaybeOptional,
  InputSchema,
  InputSchemaZod,
  IsInputOptional,
  LayoutComponent,
  LayoutPoint,
  LoaderFn,
  LoaderOutput,
  LoadingComponentType,
  LoadingHeadFn,
  MapperOutput,
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
  blankDataTransformer,
  dedupeSlashes,
  getWindowScrollPositionGetterByElementGetter,
  getWindowScrollPositionGetterBySelector,
  getWindowScrollPositionSetterByElementGetter,
  getWindowScrollPositionSetterBySelector,
  isContainsBinary,
  mergeHeaders,
  toExtendedTransformer,
  windowScrollPositionGetter,
  windowScrollPositionSetter,
} from './utils.js'

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
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
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
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  > = null as never

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
  readonly _tranformer: DataTransformerExtended
  readonly _ssr: boolean
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
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    Error0,
    InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
    QueryKey,
    unknown
  >
  readonly _queryResultType: TQueryResultType
  // readonly _asFormData: boolean | undefined
  private readonly _wrappers: WrapperComponentType[]
  readonly _serverExecuteActions: ServerExecuteAction[]
  private readonly _clientExecuteActions: ClientExecuteAction[]
  private readonly _clientMapperFns: Array<ClientMapperFn<any, any, any, any, any>>
  private readonly _useValue: undefined | ((point: AnyPoint, keys?: string | string[] | undefined) => any)
  readonly _route: TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute
  private readonly _prevRoute: TPrevRouteDefinition extends RouteDefinition
    ? CallableRoute<TPrevRouteDefinition>
    : UndefinedRoute
  private readonly _page:
    | PageComponent<
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TRouteDefinition,
        TInputSchema,
        TProps
      >
    | UndefinedPageComponent
  private readonly _component:
    | ComponentComponent<
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TInputSchema,
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
        TInputSchema,
        TProps
      >
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
        TInputSchema,
        TRouteDefinition,
        TProps
      >
    | undefined
  private readonly _layoutErrorComponent: ErrorComponentType<
    DestinationComponentType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _pageErrorComponent: ErrorComponentType<
    DestinationComponentType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _componentErrorComponent: ErrorComponentType<
    DestinationComponentType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _layoutLoadingComponent: LoadingComponentType<
    DestinationComponentType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _loadingComponent:
    | LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TInputSchema,
        TRouteDefinition,
        TProps
      >
    | undefined
  private readonly _pageLoadingComponent: LoadingComponentType<
    DestinationComponentType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  private readonly _componentLoadingComponent: LoadingComponentType<
    DestinationComponentType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
  X: TPointType extends 'layout'
    ? MountableComponent<TInputSchema, TProps, true>
    : TPointType extends 'page'
      ? MountableComponent<TInputSchema, TProps, false>
      : TPointType extends 'component'
        ? MountableComponent<TInputSchema, TProps, false>
        : TPointType extends 'provider'
          ? MountableComponent<TInputSchema, TProps, null>
          : null

  private constructor(options: {
    type: TPointType
    _letsEndPointType: TLetsEndPointType
    _base?: BasePoint | LayoutPoint | undefined
    _root?: RootPoint | undefined
    _serverurl?: string | undefined
    _baseurl?: string | null | undefined
    inputSchema?: TInputSchema
    _serverInputSchema?: InputSchema | undefined
    _tranformer?: DataTransformerExtended | undefined
    _ssr?: boolean
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
    _clientMapperFns?: ClientMapperFn[]
    _ProviderReactContext?:
      | Context<
          FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
        >
      | undefined
    _useValue?: any
    _route?: TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute
    _prevRoute?: TPrevRouteDefinition extends RouteDefinition ? CallableRoute<TPrevRouteDefinition> : UndefinedRoute
    _page?:
      | PageComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TRouteDefinition,
          TInputSchema,
          TProps
        >
      | UndefinedPageComponent
    _component?:
      | ComponentComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TInputSchema,
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
          TInputSchema,
          TProps
        >
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
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _loadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    X?: MountableComponent<any, any, any> | null
    _unstableId?: number
  }) {
    this.point = this
    this.scope = options.scope
    this._attachedTo = options._attachedTo
    this._base = options._base ?? undefined
    this._root = options._root ?? undefined
    this.inputSchema = (options.inputSchema ?? undefined) as TInputSchema
    this._serverInputSchema = options._serverInputSchema
    this._tranformer = options._tranformer ?? toExtendedTransformer(blankDataTransformer)
    this._ssr = options._ssr ?? false
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
    this._clientMapperFns = options._clientMapperFns ?? []
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
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
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
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
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
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
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
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TInputSchema,
        TRouteDefinition,
        TProps
      >)
    this._pageLoadingComponent =
      options._pageLoadingComponent ??
      ((() => React.createElement(React.Fragment, null, 'Loading...')) as LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TInputSchema,
        TRouteDefinition,
        TProps
      >)
    this._componentLoadingComponent =
      options._componentLoadingComponent ??
      ((() => React.createElement(React.Fragment, null, 'Loading...')) as LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TInputSchema,
        TRouteDefinition,
        TProps
      >)
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
    TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
    TInputSchema extends InputSchema | UndefinedInputSchema,
    TQueryResultType extends QueryResultType | UndefinedQueryResultType,
    TProps extends Props | UndefinedProps,
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
    _tranformer?: DataTransformerExtended | null
    _ssr?: boolean
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
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          Error0,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined
    _queryResultType?: TQueryResultType
    // _asFormData?: boolean | undefined
    _wrappers?: WrapperComponentType[]
    _serverExecuteActions?: ServerExecuteAction[]
    _clientExecuteActions?: ClientExecuteAction[]
    _clientMapperFns?: ClientMapperFn[]
    _ProviderReactContext?:
      | Context<
          FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
        >
      | undefined
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
      | PageComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TRouteDefinition,
          TInputSchema,
          TProps
        >
      | UndefinedPageComponent
    _component?:
      | ComponentComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TInputSchema,
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
          TInputSchema,
          TProps
        >
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
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentErrorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _loadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _layoutLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _pageLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    _componentLoadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TProps
    >
    X?: MountableComponent<any, any, any> | null
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
    TPrevRouteDefinition,
    TInputSchema,
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
      TPrevRouteDefinition,
      TInputSchema,
      TQueryResultType,
      TProps
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
      _tranformer: overrides._tranformer ?? this._tranformer,
      _ssr: overrides._ssr ?? this._ssr,
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
      _clientMapperFns: overrides._clientMapperFns ?? this._clientMapperFns,
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
      X: (overrides.X ?? this.X) as never,
    })
  }

  // TODO: remove it
  attach<TPoint extends NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any>>(
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
  static create<TRootPoint extends NiceRootEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any>>(
    scope: string,
    attachedTo: PointsScope[],
  ): NiceRootMiddlePoint<
    'coreStage',
    'root',
    // TODO: check .d.ts files, is this approach heavy or not?
    TRootPoint['Infer']['RequiredCtx'],
    TRootPoint['Infer']['Ctx'],
    TRootPoint['Infer']['CtxExposedKeys'],
    TRootPoint['Infer']['ServerLoaderOutput'],
    TRootPoint['Infer']['ClientLoaderOutput'],
    TRootPoint['Infer']['ClientMapperOutput'],
    UndefinedRoute,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedQueryResultType,
    UndefinedProps
  >
  static create(scope: string, attachedTo?: PointsScope[]) {
    return new Point0({
      type: 'coreStage',
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
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      'root',
      AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
      PrependCtx<TCtx, TExtraRequiredCtx>,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
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
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      'root',
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
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
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      TPointType,
      'root',
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TQueryResultType,
      TProps
    >({
      _baseurl: baseurl,
    })
  }

  // general settings

  // not needed, we check File or Blob in input, and then use FormData instead of JSON
  // asFormData(
  //   shouldAddMultipartFormDataHeaderToFetchOptions = true,
  // ): NiceMiddlePoint<
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
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _ssr: ssr,
    }) as never
  }

  mutationOptions(
    mutationOptions: UseMutationOptions,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
            TInputSchema,
            TRouteDefinition,
            TProps
          >
      : ErrorComponentType,
  ): NiceMiddlePoint<
    TLetsEndPointType extends 'page' | 'layout' | 'component' ? 'renderStage' : TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
            head: ErrorHeadFn<TServerLoaderOutput, TClientLoaderOutput, TInputSchema, TRouteDefinition>,
            pageErrorComponent: ErrorComponentType<
              DestinationComponentType,
              TQueryResultType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TClientMapperOutput,
              TInputSchema,
              TRouteDefinition,
              TProps
            >,
          ]
      : never
  ): NiceMiddlePoint<
    TLetsEndPointType extends 'page' ? 'renderStage' : TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  pageError(
    pageErrorComponent: ErrorComponentType,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  pageError(
    ...args: [head: ErrorHeadFn, pageErrorComponent: ErrorComponentType] | [pageErrorComponent: ErrorComponentType]
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  pageLoading(
    pageLoadingComponent: LoadingComponentType,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  pageLoading(
    ...args:
      | [head: LoadingHeadFn, pageLoadingComponent: LoadingComponentType]
      | [pageLoadingComponent: LoadingComponentType]
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
            TInputSchema,
            TRouteDefinition,
            TProps
          >
      : LoadingComponentType,
  ): NiceMiddlePoint<
    TLetsEndPointType extends 'page' | 'layout' | 'component' ? 'renderStage' : TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
            head: LoadingHeadFn<TServerLoaderOutput, TClientLoaderOutput, TInputSchema, TRouteDefinition>,
            pageLoadingComponent: LoadingComponentType<
              DestinationComponentType,
              TQueryResultType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TClientMapperOutput,
              TInputSchema,
              TRouteDefinition,
              TProps
            >,
          ]
      : never
  ): NiceMiddlePoint<
    TLetsEndPointType extends 'page' ? 'renderStage' : TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    wrapperComponent: TLetsEndPointType extends 'page' | 'layout' | 'component'
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
            TInputSchema,
            TRouteDefinition,
            TProps
          >
      : WrapperComponentType<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TInputSchema,
          TRouteDefinition,
          TProps
        >,
  ): NiceMiddlePoint<
    'renderStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _wrappers: [...this._wrappers, wrapperComponent as never],
    }) as never
  }

  // middlewares

  ctx<TCtxFn extends CtxFn<TCtx, TCtxExposedKeys, TRouteDefinition, TInputSchema, Ctx>>(
    ctxFn: TCtxFn,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, InferCtxFnOutputCtxAppend<TCtxFn>>,
    AppendCtxExposedKeys<TCtxExposedKeys, InferCtxFnOutputCtxExposedKeys<TCtxFn>>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  ctx<TAppendCtx extends Ctx>(
    ctx: TAppendCtx,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  ctx<TAppendCtx extends Ctx>(
    ctx: [TAppendCtx],
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
    AppendCtxExposedKeys<TCtxExposedKeys, Extract<keyof TAppendCtx, string>>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  ctx<TAppendCtx extends Ctx, TAppendCtxExposedKeys extends Extract<keyof TAppendCtx, string>>(
    ctx: [TAppendCtx, ...TAppendCtxExposedKeys[]],
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
    AppendCtxExposedKeys<TCtxExposedKeys, TAppendCtxExposedKeys>,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  ctx(ctxOrFn: CtxFn | Ctx | [Ctx, ...CtxExposedKeys[]]) {
    const ctxFn =
      typeof ctxOrFn === 'undefined' // in case if we prune ctx for client customer
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
    loaderFn: LoaderFn<
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TRouteDefinition,
      TInputSchema,
      TNewServerLoaderOutput
    >,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TNewServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType extends UndefinedQueryResultType ? 'query' : TQueryResultType,
    TProps
  >
  loader(
    enableServerLoader: false,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    UndefinedLoaderOutput,
    UndefinedLoaderOutput,
    UndefinedMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    UndefinedQueryResultType,
    TProps
  >
  loader(enableServerLoader: true): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput extends LoaderOutput ? TServerLoaderOutput : EmptyData, // if response or data exists in server, now it is server output, else empty data
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    UndefinedQueryResultType,
    TProps
  >
  loader(loaderFn: LoaderFn<any, any, any, any, any, any> | boolean) {
    if (loaderFn === false) {
      return this._continue({
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
      _queryResultType: this._queryResultType ?? 'query',
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case if we prune loader for client
        { type: 'loader', fn: loaderFn ?? ((c: any) => c.data), unstableId: Point0._getNextUnstableId() },
      ] as never,
    }) as never
  }

  clientLoader<TNewClientLoaderOutput extends LoaderOutput = LoaderOutput>(
    clientLoaderFn: ClientLoaderFn<
      TLetsEndPointType,
      TRouteDefinition,
      TInputSchema,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TNewClientLoaderOutput
    >,
  ): NiceMiddlePoint<
    'clientStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TNewClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType extends UndefinedQueryResultType ? 'query' : TQueryResultType,
    TProps
  >
  clientLoader(
    enableClientLoader: false,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    UndefinedData,
    UndefinedMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
  clientLoader(enableClientLoader: true): NiceMiddlePoint<
    TPointType,
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
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  clientLoader(clientLoaderFn: ClientLoaderFn<any, any, any, any, any, any> | boolean) {
    if (clientLoaderFn === false) {
      return this._continue({
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

  mapper<TNewClientMapperOutput extends MapperOutput = MapperOutput>(
    mapperFn: ClientMapperFn<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TNewClientMapperOutput
    >,
  ): NiceMiddlePoint<
    'mapperStage',
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TNewClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  mapper(
    enableMapper: false,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    UndefinedMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  mapper(mapperFn: ClientMapperFn<any, any, any, any, any> | false) {
    if (mapperFn === false) {
      return this._continue({
        _clientMapperFns: [],
      }) as never
    }
    return this._continue({
      type: 'mapperStage',
      _clientMapperFns: [...this._clientMapperFns, mapperFn],
    }) as never
  }

  flatter<
    TDataKey extends FinalLoaderMappedOutput<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput
    > extends { pages: Array<Record<infer TAnyDataKey, any>> }
      ? Extract<TAnyDataKey, string>
      : never,
  >(
    dataKey: TDataKey,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput> extends {
      pages: Array<Record<any, any>>
    }
      ? {
          flattened: FinalLoaderMappedOutput<
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput
          >['pages'][number][TDataKey]
          original: FinalLoaderMappedOutput<
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput
          >
        }
      : never,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _clientMapperFns: [
        ...this._clientMapperFns,
        ({
          data,
        }: {
          data: FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
        }) => {
          if (typeof data !== 'object' || !('pages' in data) || !Array.isArray(data.pages)) {
            throw new Error(`Flatter can be called only on infinite query data`)
          }
          return {
            flattened: data.pages.flatMap((page) => page[dataKey]),
            original: data,
          }
        },
      ] as never,
    }) as never
  }

  head(
    head: MiddlewareHeadFn | ResolvableHead | string,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    MergeInputSchemas<TInputSchema, TNewInputSchema>,
    TQueryResultType,
    TProps
  >
  input(inputSchema: InputSchemaZod) {
    return this._continue({
      inputSchema: this.inputSchema ? this.inputSchema.extend(inputSchema.shape) : inputSchema,
      _serverInputSchema:
        this.type === 'coreStage'
          ? this._serverInputSchema
            ? this._serverInputSchema.extend(inputSchema.shape)
            : inputSchema
          : this._serverInputSchema,
      _clientExecuteActions:
        this.type === 'clientStage'
          ? [
              ...this._clientExecuteActions,
              { type: 'input', schema: inputSchema, unstableId: Point0._getNextUnstableId() },
            ]
          : this._clientExecuteActions,
      _serverExecuteActions:
        this.type === 'coreStage'
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
  // ): NiceMiddlePoint<
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
  // ): NiceMiddlePoint<
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
  // route(): NiceMiddlePoint<
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

  lets<TPointName extends PointName, TProvidedRoute extends AnyRoute | RouteDefinition = TPointName>(
    letsEndPointType: 'page',
    pointName: TPointName,
    route?: TProvidedRoute,
  ): NiceMiddlePoint<
    'coreStage',
    'page',
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
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
    TQueryResultType,
    UndefinedProps
  >
  lets<TPointName extends PointName, TProvidedRoute extends AnyRoute | RouteDefinition = '/'>(
    letsEndPointType: 'layout',
    pointName: TPointName,
    route?: TProvidedRoute,
  ): NiceMiddlePoint<
    'coreStage',
    'layout',
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
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
    TQueryResultType,
    UndefinedProps
  >
  lets<TNewLetsEndPointType extends Exclude<EndPointType, 'page' | 'layout' | 'root'>, TPointName extends PointName>(
    letsEndPointType: TNewLetsEndPointType,
    pointName: TPointName,
  ): NiceMiddlePoint<
    'coreStage',
    TNewLetsEndPointType,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TRouteDefinition,
    TInputSchema,
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
      type: 'coreStage',
      _letsEndPointType: letsEndPointType,
      name: pointName,
      _route: newRoute as never,
      _prevRoute: this._route as never,
      _page: undefined,
      _component: undefined,
      _layout: undefined,
      _ProviderReactContext: undefined,
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
    TPrevRouteDefinition,
    TInputSchema,
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
    TPrevRouteDefinition,
    TInputSchema,
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
  ): MountableComponent<TInputSchema, TProps, false> &
    NicePageEndPoint<
      'page',
      UndefinedEndPointType,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
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
            TInputSchema,
            TProps
          >,
        ]
  ): MountableComponent<TInputSchema, TProps, false> &
    NicePageEndPoint<
      'page',
      UndefinedEndPointType,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
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
            | SuccessHeadFn<TServerLoaderOutput, TClientLoaderOutput, TRouteDefinition, TInputSchema>
            | ResolvableHead
            | string,
          page: PageComponent<
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TRouteDefinition,
            TInputSchema,
            TProps
          >,
        ]
  ): MountableComponent<TInputSchema, TProps, false> &
    NicePageEndPoint<
      'page',
      UndefinedEndPointType,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
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
            TInputSchema,
            TProps
          >
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
    point.X = point.Page.bind(point) as never
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
            TInputSchema,
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
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  > {
    const [component = () => null] = args as [
      | ComponentComponent<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TInputSchema,
          TProps
        >
      | undefined,
    ]
    const point = this._continue({
      type: 'component',
      _component: component,
      _letsEndPointType: undefined,
    })
    point.X = point.Component.bind(point) as never
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
            TInputSchema,
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
    TPrevRouteDefinition,
    TInputSchema,
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
          TInputSchema,
          TProps
        >
      | undefined,
    ]
    const point = this._continue({
      type: 'layout',
      _layout: layout as never,
      _letsEndPointType: undefined,
      _base: this as never as BasePoint,
    })
    point.X = point.Layout.bind(point) as never
    Point0._assignNicePointMethodsToComponent({ component: layout, point, extra: { X: point.X } })
    return layout as never
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
    TPrevRouteDefinition,
    TInputSchema,
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
    TPrevRouteDefinition,
    TInputSchema,
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
    })
    point.X = point.Provider.bind(point) as never
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
    TPrevRouteDefinition,
    TInputSchema,
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
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
            InputRaw<TRouteDefinition, TInputSchema>,
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
        TPrevRouteDefinition,
        TInputSchema,
        'infiniteQuery',
        TProps
      >
    : NiceMiddlePoint<
        TPointType,
        EndPointTypeOrNever<TLetsEndPointType>,
        TRequiredCtx,
        TCtx,
        TCtxExposedKeys,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TRouteDefinition,
        TPrevRouteDefinition,
        TInputSchema,
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
        InputRaw<TRouteDefinition, TInputSchema>,
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
            InputRawMaybeOptional<TRouteDefinition, TInputSchema>
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
    TPrevRouteDefinition,
    TInputSchema,
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
    Object.assign(component, {
      Infer: point.Infer,
      point,
      lets: point.lets.bind(point),
      inputSchema: point.inputSchema,
      attach: point.attach.bind(point),
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
      Component: point.Component.bind(point),
      Page: point.Page.bind(point),
      Layout: point.Layout.bind(point),
      Provider: point.Provider.bind(point),
      X: (point as any).X?.bind(point),
      useValue: point.useValue.bind(point),
      _useValue: point._useValue?.bind(point),
      getValue: point.getValue.bind(point),
      getValueSafe: point.getValueSafe.bind(point),
      _hmr: point._hmr.bind(point),
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
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
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
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
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
    serverData,
    serverResponse,
    location,
    input,
    skipClientMapperFns,
  }: {
    serverData: Data | undefined
    serverResponse: Response | undefined
    location?: AnyLocation
    input: InputRaw<TRouteDefinition, TInputSchema>
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
            response: serverResponse,
            input: currentInputParsed,
            inputRaw: input,
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
  //       : Point0._currentLocation.get()
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
    unqueriedLoaderResult: AnyUnqueriedLoaderResult<
      any,
      TServerLoaderOutput,
      TClientLoaderOutput,
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
      TServerLoaderOutput,
      TClientLoaderOutput,
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
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
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
          input: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
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
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?:
            | ExtraUseQueryOptions
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
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
          input: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?:
            | ExtraUseQueryOptions
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                Error0,
                InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                QueryKey,
                unknown
              >
            | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
  ): AnyUseLoaderResult<
    any,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TRouteDefinition,
    AnyLocation
  > & { dataOrLastInfiteData: FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput> } {
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
    }, [this._tranformer.stringify(args[0])])

    if (!this._hasServerLoader() && !this._hasClientLoader()) {
      const result = React.useMemo(() => {
        return {
          data: this._clientMapperFns.reduce((data, mapperFn) => mapperFn({ data }), undefined as never),
          loading: false,
          error: inputParseError ?? null,
          query: null,
          location,
          input: inputParsed,
          inputRaw,
          dataOrLastInfiteData: undefined,
        }
      }, [inputParseError, inputRaw, inputParsed, location])
      return result as never
    }
    const query =
      this._queryResultType === 'infiniteQuery' ? this.useInfiniteQuery(...(args as never)) : this.useQuery(...args)
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
        this._queryResultType === 'infiniteQuery' ? (query.data?.pages as any)?.at(-1) : query.data
      return {
        data: mappedData,
        loading: query.isLoading,
        error: query.error ? Error0.from(query.error) : null,
        query: query as never,
        location,
        input: inputParsed,
        inputRaw,
        dataOrLastInfiteData,
      }
    }, [query, query.data, query.error, query.isLoading, inputRaw, inputParsed, location, mappedData])
    return result as never
  }

  async fetchDetailed(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
      : [input: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
  ): Promise<FetchDetailedOutput<TServerLoaderOutput>> {
    const [input = {}, options] = args
    const fetchOptions = { ...this._fetchOptions?.(), ...options }
    const fromScope = SuperStore.getWeak('__POINT0_SCOPE__')
    if (!fromScope || typeof fromScope !== 'string') {
      throw new Error('Scope is not set. You forget to call PointsManager.create()?')
    }
    const headers = mergeHeaders(fetchOptions.headers, options?.headers, {
      Accept: 'application/json',
      'X-Point0-From-Scope': fromScope,
    })
    if (!this._serverurl) {
      return { error: new Error0('Server URL is not set'), response: undefined, data: undefined, output: undefined }
    }
    const url = new URL('/_point0', this._serverurl)
    const method = 'post'

    const outputType = args[2] ?? 'data'
    const scope = this._attachedTo.length === 0 ? this.scope : Point0.getPointsManager().scope
    url.searchParams.set('type', this.type)
    url.searchParams.set('name', this.name)
    url.searchParams.set('scope', scope)
    url.searchParams.set('output', outputType)

    // const shouldAddMultipartFormDataHeaderToFetchOptions = this._asFormData ?? isContainsBinary(input)
    const shouldAddMultipartFormDataHeaderToFetchOptions = isContainsBinary(input)

    const bodySrc = this._tranformer.serialize(input)
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

    const res = await fetch(url.toString(), {
      ...this._fetchOptions?.(),
      ...fetchOptions,
      headers,
      method,
      body,
    })
    CookiesStore.refresh()
    console.info('cookies refreshed')
    if (res.headers.get('X-Point0-Not-Json-Data') === 'true') {
      return { response: res, data: undefined, error: null, output: res } as FetchDetailedOutput<TServerLoaderOutput>
    }
    try {
      const json = await res.json()
      const data = this._tranformer.deserialize(json)
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
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
      : [input: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
  ): Promise<FetchOutput<TServerLoaderOutput>> {
    const detailedResult = await this.fetchDetailed(...args)
    if (detailedResult.error) {
      throw detailedResult.error
    }
    return detailedResult.data as FetchOutput<TServerLoaderOutput>
  }

  async executeDetailed(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? TServerLoaderOutput extends LoaderOutput
        ? [input?: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions]
        : [input?: InputRaw<TRouteDefinition, TInputSchema>]
      : TServerLoaderOutput extends LoaderOutput
        ? [input: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions]
        : [input: InputRaw<TRouteDefinition, TInputSchema>]
  ): Promise<
    ClientExecuteDetailedResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
  > {
    if (Point0.isServer) {
      throw new Error0(
        'If you want to execute data on server, use engine.execute, or Executor.execute, or get execute fn from loader|ctx options. point.execute is for client only and use fetch under the hood to retrieve server data',
      )
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
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? TServerLoaderOutput extends LoaderOutput
        ? [input?: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions]
        : [input?: InputRaw<TRouteDefinition, TInputSchema>]
      : TServerLoaderOutput extends LoaderOutput
        ? [input: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions]
        : [input: InputRaw<TRouteDefinition, TInputSchema>]
  ): Promise<FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>> {
    const detailedResult = await this.executeDetailed(...args)
    return detailedResult.output
  }

  _getServerQueryKey({
    input = {} as never,
    outputType = 'data',
    isInfiniteQuery,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    outputType?: FetchOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    return [
      'point0',
      this.scope,
      this.type,
      this.name,
      'server',
      isInfiniteQuery ? 'infinite' : 'finite',
      this._tranformer.stringify(input) as string,
      outputType,
    ]
  }

  _getClientQueryKey({
    input = {} as never,
    isInfiniteQuery,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    isInfiniteQuery: boolean
  }): QueryKey {
    return [
      'point0',
      this.scope,
      this.type,
      this.name,
      'client',
      isInfiniteQuery ? 'infinite' : 'finite',
      this._tranformer.stringify(input) as string,
      'data',
    ]
  }

  private _getCombinedQueryKey({
    input = {} as never,
    outputType = 'data',
    isInfiniteQuery,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    outputType?: FetchOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    return [
      'point0',
      this.scope,
      this.type,
      this.name,
      'combined',
      isInfiniteQuery ? 'infinite' : 'finite',
      this._tranformer.stringify(input) as string,
      outputType,
    ]
  }

  getQueryKey(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>, _outputType?: FetchOutputType]
      : [input: InputRaw<TRouteDefinition, TInputSchema>, _outputType?: FetchOutputType]
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseQueryOptions<FetchOutput<TServerLoaderOutput>, Error0, FetchOutput<TServerLoaderOutput>, QueryKey> {
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
    serverData,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
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
          input,
          serverResponse: undefined,
          skipClientMapperFns: true,
        })
        return clientData
      }
    // : () => {
    //     const { clientData } = this._executeClientSync({ data: data || {}, location, input, response: undefined })
    //     return clientData
    //   }
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
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    Error0,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
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
        serverData: serverData as never,
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
          options?: {
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    infiniteQueryOptions:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    serverData?: Data
    location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
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
            input: { ...input, [pageParamFromInput]: pageParam ?? this._infiniteQueryOptions.initialPageParam },
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    fetchOptions?: FetchOptions | undefined
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
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
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
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
          input: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
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
    InputRaw<TRouteDefinition, TInputSchema>,
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
  //   queryClient ??= Point0.getQueryClient()
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
    input: InputRaw<TRouteDefinition, TInputSchema>
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
    input: InputRaw<TRouteDefinition, TInputSchema>
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
    input: InputRaw<TRouteDefinition, TInputSchema>
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    infiniteQueryOptions:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
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
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    infiniteQueryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
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
    InputRawMaybeOptional<TRouteDefinition, TInputSchema>
  > {
    const mutationFn = async (input: Record<string, any> = {}) => {
      try {
        if (Point0.isServer) {
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
      InputRawMaybeOptional<TRouteDefinition, TInputSchema>
    >
  }

  useMutation = (
    mutationOptions?: MutationOptions | undefined,
    fetchOptions?: FetchOptions | undefined,
  ): UseMutationResult<
    FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>,
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
          options?: {
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
          options?: {
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
    const [input, providedQueryOptions, options = {}] = args
    const {
      location,
      queryClient: providedQueryClient,
      fetchOptions,
      outputType,
      force,
      mode = 'serverAndClient',
      preventPrefetchFns,
    } = options
    if (!this._hasServerLoader() && !this._hasClientLoader()) {
      return
    }
    if (!this._hasClientLoader() && mode === 'client') {
      return
    }
    if (!this._hasServerLoader() && mode === 'server') {
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
          },
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          infiniteQueryOptions?:
            | ExtraUseInfiniteQueryOptions<
                InputRaw<TRouteDefinition, TInputSchema>,
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
          },
        ]
  ): Promise<undefined | QueryKey> {
    const [input, infiniteQueryOptions, options = {}] = args
    const {
      location,
      queryClient: providedQueryClient,
      fetchOptions,
      outputType,
      force,
      mode = 'serverAndClient',
      preventPrefetchFns,
    } = options
    if (!this._hasServerLoader() && !this._hasClientLoader()) {
      return
    }
    if (!this._hasClientLoader() && mode === 'client') {
      return
    }
    if (!this._hasServerLoader() && mode === 'server') {
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
          input: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?:
            | undefined
            | (TQueryResultType extends 'infiniteQuery'
                ? Partial<
                    ExtraUseInfiniteQueryOptions<
                      InputRaw<TRouteDefinition, TInputSchema>,
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
    const { location: providedLocation, queryClient, fetchOptions, force, policy = this._prefetchPolicy } = options
    if (policy === 'none') {
      return
    }

    if (!this._route) {
      throw new Error('Route is not set')
    }
    const location = providedLocation ?? this._route.getLocation(this._route.flat(input))

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

  Page = (props: MountableComponentProps<TInputSchema, TProps, false>): React.ReactNode => {
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
        (p) => p.name === this.name && this._tranformer.stringify(p.input) === this._tranformer.stringify(inputRaw),
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

    const result = this.useLoader(inputRaw, this._defaultPageQueryOptions)

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
          data: undefined as
            | FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
            | undefined,
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
    return this._withWrappers({
      component: React.createElement(this._page, {
        ...(result as any),
        props: restProps,
      }),
      useLoaderResult: result,
      props,
    })
  }

  Component = (props: MountableComponentProps<TInputSchema, TProps, false>): React.ReactNode => {
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

    const result = this.useLoader(inputRaw, this._defaultComponentQueryOptions)

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

    // if (!result.data) {
    //   return this._withWrappers({
    //     component: React.createElement(errorComponent, {
    //       ...(result as any),
    //       type: 'component',
    //       error: new Error0('No data'),
    //     }),
    //     useLoaderResult: result,
    //     props,
    //   })
    // }
    return this._withWrappers({
      component: React.createElement(this._component, {
        ...(result as any),
        props: restProps as unknown as FinalProps<TProps>,
      }),
      useLoaderResult: result,
      props,
    })
  }

  Layout = (props: MountableComponentProps<TInputSchema, TProps, true>): React.ReactNode => {
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

    const result = this.useLoader(inputRaw, this._defaultLayoutQueryOptions)

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

    // if (!result.data) {
    //   return this._withWrappers({
    //     component: React.createElement(errorComponent, {
    //       ...(result as any),
    //       type: 'layout',
    //       error: new Error0('No data'),
    //     }),
    //     useLoaderResult: result,
    //     props,
    //   })
    // }
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

  getValue(
    input?: InputRaw<TRouteDefinition, TInputSchema>,
  ): FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput> {
    const value = SuperStore.getWeak<
      FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
    >(`__POINT0_PROVIDER_VALUE_${this.scope}_${this.name}_${this._tranformer.stringify(input || {})}`)
    if (!value) {
      throw new Error(
        `Provider value not found on point: provider.${this.name}. You should call getValue only after Provider component is mounted and loaded.`,
      )
    }
    return value
  }

  getValueSafe(
    input?: InputRaw<TRouteDefinition, TInputSchema>,
  ):
    | FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
    | undefined {
    const value = SuperStore.getWeak<
      FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
    >(`__POINT0_PROVIDER_VALUE_${this.scope}_${this.name}_${this._tranformer.stringify(input || {})}`)
    return value
  }

  Provider = (props: MountableComponentProps<TInputSchema, TProps, null>): React.ReactNode => {
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    if (!this._ProviderReactContext) {
      throw new Error('ProviderReactContext not found on point: ' + this.name)
    }

    const { inputRaw, children } = React.useMemo<{
      inputRaw: InputRaw<TRouteDefinition, TInputSchema>
      children: React.ReactNode | undefined
    }>(() => {
      const { input: providedInput = {}, children } = props as any
      const inputRaw = { ...providedInput }
      return { inputRaw, children }
    }, [props])

    const result = this.useLoader(inputRaw, this._defaultProviderQueryOptions)

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
    SuperStore.setWeak(
      `__POINT0_PROVIDER_VALUE_${this.scope}_${this.name}_${this._tranformer.stringify(inputRaw)}`,
      value,
    )
    return this._withWrappers({
      component: React.createElement(this._ProviderReactContext.Provider, {
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

  // transformer

  transformer(
    transformer: DataTransformer,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      _tranformer: toExtendedTransformer(transformer),
    }) as never
  }

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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  scrollPosition(
    selector: string,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  >
  scrollPosition(
    getter: ScrollPositionGetter,
    setter: ScrollPositionSetter,
  ): NiceMiddlePoint<
    TPointType,
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
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
      EndPointTypeOrNever<TLetsEndPointType>,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TQueryResultType,
      TProps
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
      TPrevRouteDefinition,
      TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
      TPrevRouteDefinition,
      TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
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
      TPrevRouteDefinition,
      TInputSchema,
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
    EndPointTypeOrNever<TLetsEndPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TQueryResultType,
    TProps
  > {
    return this._continue({
      shouldBePrefetchedOnLinkHover,
    }) as never
  }
}

export * from './cookies-store.js'
export * from './points-manager.js'
export * from './request.js'
export * from './response-effects.js'
export * from './router.js'
export * from './super-store.js'
export type * from './types.js'
export * from './unhead.js'
export * from './utils.js'

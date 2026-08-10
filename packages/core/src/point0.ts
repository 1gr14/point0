import * as flat from '@1gr14/flat'
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
} from '@1gr14/route0'
import { Route0 } from '@1gr14/route0'
import type {
  CancelOptions,
  DehydratedState,
  InfiniteData,
  InvalidateOptions,
  Mutation,
  MutationOptions,
  Query,
  QueryClient,
  QueryFilters,
  QueryState,
  RefetchOptions,
  ResetOptions,
  SetDataOptions,
  Updater,
  UseInfiniteQueryResult,
  UseMutationResult,
  UseQueryResult,
  UseSuspenseInfiniteQueryResult,
  UseSuspenseQueryResult,
} from '@tanstack/react-query'
import { hydrate, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import { useHead, useSeoMeta } from '@unhead/react'
import * as React from 'react'
import { stringify } from 'safe-stable-stringify'
import type { Context } from 'use-context-selector'
import { createContext, useContextSelector } from 'use-context-selector'
import { _point0_env } from './env.js'
import type { ClassLikeError0 } from './error.js'
import { ErrorPoint0, POINT0_ERROR_CODES_MAP, stringifyOrThrow } from './error.js'
import type {
  AnyEventerEvent,
  AnyEventerEventName,
  AnyEventerSubscriptionCallback,
  ClientEventerEventName,
  ClientEventerSubscriptionCallback,
  EventerEventMeta,
  EventerEventPointFetchServerSuccess,
  EventerSubscription,
  ServerEventerEventName,
  ServerEventerSubscriptionCallback,
  UniqEventerErrorEventName,
} from './eventer.js'
import { uniqEventerErrorEventNames } from './eventer.js'
import type { HeadObject } from './head.js'
import { _splitHead } from './head.js'
import { ClientOnly, getEffectsOrUndefined, getFetch, setStatus } from './helpers.js'
import { _getFakeClient, _ss } from './internals.js'
import { noticeClientBuildHeaderFromResponse } from './stale.js'
import { getLogFnForPoint, log, type LogFn } from './logger.js'
import {
  addClientHandlerListener,
  connectToChannel,
  DEFAULT_SEND_TIMEOUT_MS,
  getChannelConnectionOrUndefined,
  getChannelReactContext,
  isDeadSocketFacade,
  isMembershipFacade,
  listChannelConnectionFacades,
  listSpaceClientRooms,
  listSpaceMembershipFacades,
  readBoundSpaceRoom,
  getConnectionFacadeChannel,
  getMembershipFacadeSpace,
  normalizeGate,
  registerClientHandlerPoint,
  registerSpacePoint,
  resolveHandlerTarget,
  sendToServerHandler,
  useAmbientChannelConnection,
  useBoundConnection,
  useSocketConnection,
  useSocketOnMessage,
  joinSpace,
  getSpaceMembershipOrUndefined,
  useSpaceMembership,
  useAmbientSpaceMembership,
  getSpaceReactContext,
  resolveSpaceHandlerTarget,
  useBoundMembership,
  type ChannelConnectOutput,
  iterateClientHandlerMessages,
  getSocketServerAdapterOrThrow,
} from './socket.js'
import type {
  SocketAdminTarget,
  SocketConnectionSnapshot,
  SocketServerAdapter,
  SocketServerPushTarget,
} from './socket.js'
import { iterateSubscription, useSubscriptionValue } from './subscription.js'
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
  MergeConnections,
  MergeMemberships,
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
  ConnectionsDefinitions,
  MembershipsDefinitions,
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
  WithConnectionFn,
  WithFn,
  WithProps,
  WithFnReturnProps,
  WithMembershipFn,
  WithQueryFn,
  WithSelfQueryIfShouldBeFinalized,
  WrapperComponentType,
} from './mountable.js'
import { ErrorBoundary0 } from './error-boundary.js'
import {
  RedirectTask,
  getNavigationHelpers,
  setSearch,
  useLocation,
  useSetNavigationPageState,
  type NavigationPageState,
} from './navigation.js'
import {
  deserializeErrorsInDehydratedState,
  forceFreshDehydratedState,
  readStreamedRscFetch,
  removeRedirectsFromQueryClientCache,
  toLiveDehydratedState,
} from './query-client.js'
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
  AssertResponseNotAllowed,
  AssertRoutedInputSchemaOnly,
  AssertSchemaNotWider,
  AssertUsualInputSchemaOnly,
  BasePoint,
  ClientExecuteAction,
  ClientLoaderFn,
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
  ExtraUseMutationOptions,
  AssertClientReplyMatchesSchema,
  ChannelPointOptions,
  ChannelOptionsResolved,
  ChannelResumeOptions,
  ChannelConnectionComponentProps,
  ChannelAdminTarget,
  ChannelConnectionListed,
  ChannelConnectionsEnumeration,
  EnumerationOptions,
  SpaceAdminTarget,
  SpaceMembershipListed,
  SpaceMembershipsEnumeration,
  SpaceMembershipComponentProps,
  ExtraUseMembershipOptions,
  ClientSpaceMembership,
  AnyClientSpaceMembership,
  JoinerFn,
  EnrollerFn,
  AssertEnrollerNotDefined,
  AssertIdentityAmendable,
  AssertRoomNotWider,
  SpacePointOptions,
  SpaceOptionsResolved,
  NiceSpaceReadyPoint,
  ClientChannelConnection,
  AnyClientChannelConnection,
  Gate,
  ClientHandlerListenerFn,
  IterateMessagesFromServerOptions,
  ClientHandlerPointOptions,
  ClientHandlerOptionsResolved,
  ClientHandlerReply,
  ClientHandlerSendHeadArgs,
  ClientHandlerSendReplies,
  ClientHandlerSendRepliesObject,
  ClientHandlerSendTarget,
  ClientReplyFn,
  ExtraUseConnectionOptions,
  NiceChannelReadyPoint,
  NiceClientHandlerReadyPoint,
  NiceServerHandlerReadyPoint,
  NiceServerHandlerStagePoint,
  NiceServerPoints,
  AssertSubscriptionCursorParams,
  ExtraUseSubscriptionOptions,
  FetchSubscriptionOptions,
  InferSubscriptionYield,
  NiceSubscriptionReadyPoint,
  ServerHandlerInputArgs,
  ServerHandlerPointOptions,
  ServerHandlerOptionsResolved,
  ServerHandlerCallOptions,
  ServerHandlerSendArgs,
  ServerReplyFn,
  ServerReplyChainFn,
  ActionLoaderFnWithStream,
  SubscriptionLoaderFn,
  SubscriptionPointOptions,
  UseOnMessageFromServerOptions,
  UseOnMessageFromServerResultFor,
  UseSubscriptionResultFor,
  UnknownData,
  EmptyObject,
  EmptyObjectOnly,
  UndefinedChannelInput,
  UndefinedIdentity,
  UndefinedSpaceInput,
  UndefinedRoom,
  EmptyQueriesDefinitions,
  EmptyConnectionsDefinitions,
  EmptyMembershipsDefinitions,
  ExtraUseQueryOptions,
  ExtraUseSuspenseQueryOptions,
  FetchOptions,
  FetchOptionsFn,
  FetchOptionsOrFn,
  FetchServerDetailedOutput,
  FetchServerOutput,
  FetchServerOutputType,
  FinalInputRaw,
  FinalServerInputParsed,
  FinalInputRawOrUndefined,
  FinalInputRawOrUndefinedOrVoid,
  FinalLoaderData,
  FinalLoaderDataOrNever,
  FinalLoaderOutput,
  FinalQueriedFiniteData,
  FinalQueriedInfiniteData,
  IfAnyThenElse,
  IfNeverThen,
  Infer,
  InferClientLoaderFnOutput,
  InferCtxFnOutputCtxAppend,
  InferLoaderFnOutput,
  InputParsed,
  InputRaw,
  InputRawUnknown,
  InputSchema,
  IsUndefined,
  LayoutPoint,
  LoaderFn,
  LoaderOutput,
  MapperOutput,
  MergeRecordValidationSchemas,
  MiddlewareFn,
  MiddlewareProps,
  Mountable,
  MountablePointType,
  RenderablePointType,
  MutationKey,
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
  NormalizedEndpointOpenapiSchema,
  // NormalizeQueryResultType,
  NormalizedPrefetchPagePolicy,
  NormalizedResponseSchema,
  PartialUseInfiniteQueryOptions,
  PartialUseSuspenseInfiniteQueryOptions,
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
  ScrollConfig,
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
  PointSsrInput,
  PointSsrState,
  UsePointSuspenseQueryResult,
  UseQueryOptions,
  WithError,
} from './types.js'
import type { FsLocation, ResolveQueryCallback } from './utils.js'
import {
  blankDataTransformerExtended,
  defaultScrollPositionRestorePolicy,
  generateId,
  getByPath,
  getCallerLocation,
  getPointId,
  getWindowScrollPositionGetterByElementGetter,
  getWindowScrollPositionGetterBySelector,
  getWindowScrollPositionSetterByElementGetter,
  getWindowScrollPositionSetterBySelector,
  isAbortCancellation,
  isContainsBinary,
  isErrorCode,
  flattenSidedOptions,
  mergeChannelOptions,
  mergeClientHandlerOptions,
  mergeEndpointOpenapiSchemas,
  mergeHeaders,
  mergeInfiniteQueryOptions,
  mergeMiddlewares,
  mergeMutationOptions,
  mergeQueryOptions,
  mergeServerHandlerOptions,
  mergeSpaceOptions,
  mergeSubscriptionOptions,
  parseMutationKey,
  parseQueryKey,
  resolveQuery,
  sanitizeForLog,
  setByPath,
  singletonize,
  toExtendedTransformer,
  toKebabCase,
  socketFeatureOffError,
  windowScrollPositionGetter,
  windowScrollPositionSetter,
  withLetsSugar,
} from './utils.js'
import {
  getPointEndpointRoutePath,
  pointTypeUsesQueryTransport,
  POINT0_CLIENT_REQUEST_ID_HEADER,
  POINT0_FROM_SCOPE_HEADER,
  POINT0_NOT_JSON_DATA_HEADER,
  POINT0_OUTPUT_TYPE_HEADER,
  POINT0_QUERY_GET_INPUT_SEARCH_PARAM,
  POINT0_QUERY_KEY_NAMESPACE,
  POINT0_REDIRECT_HEADER,
  POINT0_STREAM_HEADER,
  POINT0_TO_SCOPE_HEADER,
  POINT0_TRANSFORM_HEADER,
  POINT0_UPGRADE_TRANSFORM_SEARCH_PARAM,
} from './protocol.js'
import { rscComponentsRegistry, wrapTransformerWithRsc, type RscPointOptions } from './rsc.js'

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
  in out TConnectionsDefinitions extends ConnectionsDefinitions,
  in out TMembershipsDefinitions extends MembershipsDefinitions,
  in out TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput,
  in out TIdentity extends UnknownData | EmptyObject | UndefinedIdentity,
  in out TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput,
  in out TRoom extends UnknownData | EmptyObject | UndefinedRoom,
> {
  /**
   * Type-extraction only — `typeof point.Infer.<Key>` pulls any type out of the point (`InputRaw`, `QueriedData`,
   * `Route`, the component type, …), derived from the point itself, no hand-written interfaces. On every point. GOTCHA:
   * `Infer` is `null` at runtime — read it in TYPE position only (always wrap in `typeof`).
   *
   * Server-and-client — type-only point metadata, present on both bundles (not compiler-stripped).
   *
   *     type Data = typeof ideaQuery.Infer.QueriedData
   *
   * Full reference: https://1gr14.dev/point0/latest/infer
   */
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  > = null as never

  point: typeof this // this, needed for generator to collect points

  private readonly __POINT0_INSTANCE__: boolean = true

  /**
   * The point's stable, unique id (`scope:type:name`, e.g. `root:page:home`) — also what `toString()` returns. Used for
   * keys, logging, and matching points across the build.
   *
   * Server-and-client — point metadata, present on both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/mountable
   */
  get id(): string {
    return getPointId(this)
  }
  toString() {
    return this.id
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
  _serverUrl: string | undefined
  _clientUrl: string | undefined
  readonly _hasServerLoader: boolean | undefined
  readonly _schemasHelpers: SchemaHelper[] | undefined
  readonly _searchSchemaKeys: string[] | true | undefined
  readonly tags: string[]
  readonly _description: string | undefined
  readonly _basePath: AnyRoute | undefined
  readonly _endpoint: EndpointDefinition | undefined
  get method(): TPointType extends RequestableReadyPointType ? WideRequestMethod : undefined {
    return (this._endpoint?.method ?? undefined) as TPointType extends RequestableReadyPointType
      ? WideRequestMethod
      : undefined
  }
  /**
   * The point's kind — `'page' | 'layout' | 'component' | 'provider' | 'query' | 'infiniteQuery' | 'mutation' |
   * 'action' | 'root' | 'base' | 'plugin'`. Read it to branch on what a point is.
   *
   * Server-and-client — point metadata, present on both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/mountable
   */
  readonly type: TPointType
  private readonly _letsReadyPointType: TLetsReadyPointType
  readonly _transformer: DataTransformerExtended | undefined
  _getTransformer = () => this._transformer ?? blankDataTransformerExtended
  /**
   * Did the channel opt its wire out of the app transformer (`preventTransformer` channel option)? Resolved ONCE at
   * `.channel()` — a wire format is a declaration fact — and inherited by the channel's spaces and handlers through the
   * chain. `_transformer` itself stays untouched (it keeps meaning "the app transformer from `.transformer()`"); the
   * socket serialization sites read `_getSocketTransformer` instead.
   */
  readonly _preventSocketTransformer: boolean | undefined
  /**
   * The transformer for THIS point's SOCKET wire — frames (connect input, identity, joins, sends, replies, pushes),
   * room keys, socket query keys, the upgrade `?input=`: the app transformer, unless the channel declared
   * `preventTransformer` (then the blank one — plain JSON). Named access like `_getTransformerWithRsc`: "I serialize
   * this specific surface".
   */
  _getSocketTransformer = () => (this._preventSocketTransformer ? blankDataTransformerExtended : this._getTransformer())
  private _transformerWithRsc: DataTransformerExtended | undefined
  /**
   * The transformer for DATA payloads (loader/query/mutation outputs, dehydrated state, push scripts) — the app
   * transformer wrapped with the RSC element codec, built once per point instance. Input parsing must stay on
   * `_getTransformer` (raw), so the server never decodes React elements from untrusted bytes.
   */
  _getTransformerWithRsc = () => (this._transformerWithRsc ??= wrapTransformerWithRsc(this._getTransformer()))
  private _blankTransformerWithRsc: DataTransformerExtended | undefined
  /**
   * The RSC-wrapped BLANK transformer — the client mirror of the server's output transformer under `transform: false`
   * (server: `wrapTransformerWithRsc(blank)`, fetcher.ts). The RSC element codec is orthogonal to the app transform:
   * `transform: false` only skips the app (superjson) layer, it does NOT skip RSC. So a `transform: false` response
   * whose loader returned elements still round-trips — the server encodes the markers and the client decodes them
   * through this, instead of handing the consumer raw `{__p0e:…}` objects (which React can't render).
   */
  _getBlankTransformerWithRsc = () =>
    (this._blankTransformerWithRsc ??= wrapTransformerWithRsc(blankDataTransformerExtended))
  readonly _rsc: RscPointOptions | undefined
  private readonly _eventerSubscriptions: EventerSubscription<any, TError>[]
  readonly _ssr: PointSsrState | undefined
  // Set by `.clientOnly()`: records that a `<ClientOnly>` wrapper was declared up the chain, so the render tail runs in
  // the browser only. It is about WHERE the render runs, not whether the point does SSR — orthogonal to `_ssr`.
  readonly _clientOnly: boolean
  // Is SSR enabled for this point: its own `.ssr(enabled)` (inherited down the chain from its root) if set, else this
  // side's baked `POINT0_SSR_ENABLED_DEFAULT`. Independent of `_clientOnly`. Server-side tooling that needs another scope's value (the
  // openapi spec) resolves through `ssrDefaultOptionsByScope` instead of this ambient fallback.
  readonly _getSsrEnabled = () => this._ssr?.enabled ?? _point0_env.vars.POINT0_SSR_ENABLED_DEFAULT === 'true'
  readonly scope: PointsScope
  readonly scopes: PointsScope[]
  private readonly _defaultMutationOptions: ExtraUseMutationOptions | undefined
  private readonly _mutationOptions: ExtraUseMutationOptions | undefined
  private readonly _defaultQueryOptions: ExtraUseQueryOptions | undefined
  private readonly _defaultInfiniteQueryOptions: PartialUseInfiniteQueryOptions | undefined
  private readonly _defaultPageQueryOptions: ExtraUseQueryOptions | undefined
  private readonly _defaultLayoutQueryOptions: ExtraUseQueryOptions | undefined
  private readonly _defaultComponentQueryOptions: ExtraUseQueryOptions | undefined
  private readonly _defaultProviderQueryOptions: ExtraUseQueryOptions | undefined
  private readonly _queryOptions: ExtraUseQueryOptions
  private readonly _pageDehydratedStateQueryOptions: ExtraUseQueryOptions | undefined
  // socket state — non-private: the engine (connect endpoint, socket dispatch) and the client socket manager work
  // with points passed around as values, where `private` would be unreachable
  readonly _defaultChannelOptions: ChannelOptionsResolved<TError> | undefined
  readonly _channelOptions: ChannelOptionsResolved<TError> | undefined
  readonly _defaultServerHandlerOptions: ServerHandlerOptionsResolved | undefined
  readonly _serverHandlerOptions: ServerHandlerOptionsResolved | undefined
  readonly _defaultClientHandlerOptions: ClientHandlerOptionsResolved | undefined
  readonly _clientHandlerOptions: ClientHandlerOptionsResolved | undefined
  readonly _defaultSpaceOptions: SpaceOptionsResolved | undefined
  readonly _defaultSubscriptionOptions: SubscriptionPointOptions | undefined
  readonly _spaceOptions: SpaceOptionsResolved | undefined
  readonly _clientSendSchema: InputSchema | undefined
  readonly _serverSendSchema: InputSchema | undefined
  readonly _serverReplyFn: ServerReplyFn<any, any, any, any> | undefined
  /** A space's `.joiner` — runs over the socket per join (in `_executeJoiner`), never through the HTTP pipeline. */
  readonly _joinerFn: JoinerFn<any, any, any> | undefined
  /**
   * Was `.joiner()` DECLARED on this space? The fact, not the callback — `.joiner()` sets it whatever its argument, so
   * it survives into the client bundle (the compiler blanks the callback, the call itself stays). The client refuses a
   * `join` on a space without it before any frame leaves; the server answers the same refusal in `_executeJoiner`.
   */
  readonly _joinerDeclared: boolean
  /**
   * Was `.connector()` DECLARED on this channel? The fact, not the callback — `.connector()` sets it whatever its
   * argument, so it survives into the client bundle (the compiler blanks the callback, the call itself stays). A
   * connectorless channel's identity is the strict `{}`, so `amendIdentity` refuses to run on it — there is nothing
   * declared to amend (the type-level twin is `AssertIdentityAmendable`).
   */
  readonly _connectorDeclared: boolean
  /** A space's `.enroller` — runs server-side at connection setup (in `_executeEnroller`), no client involvement. */
  readonly _enrollerFn: EnrollerFn<any, any> | undefined
  readonly _clientReplyFn: ClientReplyFn<any, any, any, any, any> | undefined
  readonly _clientReplySchema: InputSchema | undefined
  /**
   * The parent channel a handler/space grew from — set by `channel.lets('serverHandler' | 'clientHandler' | 'space',
   * ...)`.
   */
  readonly _channelPoint: AnyPoint | undefined
  /**
   * The parent space a handler grew from — set when a handler is born from a space's `.lets` (undefined for channel
   * handlers).
   */
  readonly _spacePoint: AnyPoint | undefined
  /** The closing `.subscription({...})` options — point-level defaults for every consumer. */
  readonly _subscriptionOptions: SubscriptionPointOptions | undefined
  readonly _infiniteQueryOptions: ExtraUseInfiniteQueryOptions<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
    QueryKey,
    unknown
  >
  readonly _queryResultType: TQueryResultType
  readonly _modelsSchemas: Record<string, InputSchema> | undefined
  readonly _responseSchema: NormalizedResponseSchema | undefined
  readonly _openapiSchema: NormalizedEndpointOpenapiSchema | undefined
  readonly _serverExecuteActions: ServerExecuteAction[]
  private readonly _clientExecuteActions: ClientExecuteAction[]
  private readonly _mountActions: MountAction[]
  private readonly _wrappers: WrapperComponentType<any, any, any>[]
  private readonly _useValue: undefined | ((point: AnyPoint, keys?: string | string[] | undefined) => any)
  /**
   * The point's callable route (pages, layouts, actions) — `route.abs()` / `route.rel()` build URLs, typed to the
   * point's params and search. `undefined` on points with no route (queries, mutations, components, providers).
   *
   * Server-and-client — point metadata, present on both bundles (not compiler-stripped).
   *
   *     fetch(apiHealthAction.route.abs())
   *
   * Full reference: https://1gr14.dev/point0/latest/mountable
   */
  readonly route: TRouteDefinition extends RouteDefinition
    ? IfAnyThenElse<
        TRouteDefinition,
        AnyRoute | undefined,
        CallableRoute<
          TRouteDefinition,
          TSearchSchema extends InputSchema ? InputRaw<TSearchSchema> : UnknownSearchInput
        >
      >
    : UndefinedRoute
  private readonly _page:
    PageSuccessComponentType<any, any, any, any, any, any, any, any, any> | UndefinedSuccessPageComponent
  private readonly _component:
    ComponentSuccessComponentType<any, any, any, any, any, any, any, any> | UndefinedComponentSuccessComponent
  private readonly _layout:
    LayoutSuccessComponentType<any, any, any, any, any, any, any, any, any> | UndefinedLayoutSuccessComponent
  readonly _layouts: LayoutPoint[]
  /**
   * The point's name — inferred from the variable in the short `.lets` form, or given explicitly as the second arg
   * (`Point0.lets('query', 'idea')`). Combined with the scope it forms the point's `id`.
   *
   * Server-and-client — point metadata, present on both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/mountable
   */
  readonly name: PointName
  private readonly _unstableId: number
  private readonly _fetchOptions: FetchOptionsFn | undefined
  private readonly _scrollPositionGetter: ScrollPositionGetter | undefined
  private readonly _getScrollPositionGetter = () => this._scrollPositionGetter ?? windowScrollPositionGetter
  private readonly _scrollPositionSetter: ScrollPositionSetter | undefined
  private readonly _getScrollPositionSetter = () => this._scrollPositionSetter ?? windowScrollPositionSetter
  private readonly _scrollPositionRestorePolicy: ScrollPositionRestorePolicy | undefined
  private readonly _getScrollPositionRestorePolicy = () =>
    this._scrollPositionRestorePolicy ?? defaultScrollPositionRestorePolicy
  // Public accessor so the router's central scroll manager can read this page's
  // resolved scroll config (custom element getter/setter + restore policy).
  readonly _getScrollConfig = (): ScrollConfig => ({
    getter: this._getScrollPositionGetter(),
    setter: this._getScrollPositionSetter(),
    policy: this._getScrollPositionRestorePolicy(),
  })
  private readonly _polhPolicy: PrefetchPagePolicy | undefined
  private readonly _polhDuration: number | undefined
  private readonly _ponPolicy: PrefetchPagePolicy | undefined
  private readonly _normalizePrefetchPagePolicy = (
    policy: PrefetchPagePolicy | undefined,
  ): NormalizedPrefetchPagePolicy => {
    return !policy ? 'none' : policy
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
  /**
   * Whether this point or any of its layouts registered an `.onPrefetchPage` / `.serverOnPrefetchPage` /
   * `.clientOnPrefetchPage` hook. Lets the SSR executor skip the always-on before-render prefetch step (and its events)
   * for pages that have none.
   */
  get _hasOnPrefetchPageFns(): boolean {
    const allRelatedPoints = [this as never as ReadyPoint, ...this._layouts]
    return allRelatedPoints.some((p) => p._onPrefetchMountableFns.length > 0)
  }
  get polh(): boolean | number {
    return !this._polhPolicy ? false : (this._polhDuration ?? true)
  }
  private readonly _ProviderReactContext: Context<MountableSuccessData<TQueriesDefinitions, TMapperOutput>> | undefined
  private readonly _errorComponent: ErrorComponentType<DestinationComponentVariant, TError> | undefined
  private readonly DefaultErrorComponent: ErrorComponentType<any, TError> = ({ error }) => {
    const { stack, ...json } = _point0_env.mode.is.production
      ? this._Error.serializePublic(error)
      : this._Error.serializePrivate(error)
    // const isHydrated = useIsHydrated()
    // return React.createElement(
    //   React.Fragment,
    //   null,
    //   React.createElement('pre', null, !isHydrated ? null : JSON.stringify(json, null, 2)),
    //   React.createElement('pre', null, !isHydrated ? null : (stack as string | undefined) || error.stack || ''),
    // )
    // Show the stack to the developer in dev only. Never fall back to the live `error.stack` in production — the public
    // projection above omits it on purpose, and rendering it would bake the server stack into the SSR HTML the client
    // receives. No stack to show → render nothing rather than an empty <pre>.
    const stackToShow = _point0_env.mode.is.production ? undefined : (stack as string | undefined) || error.stack
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('pre', null, JSON.stringify(json, null, 2)),
      stackToShow ? React.createElement('pre', null, stackToShow) : null,
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
  /**
   * The bound React component a closed mountable produces, carrying the full point API. The ready point IS this
   * component, so `<UserCard />` and `<UserCard.X />` are identical — `.X` is the explicit form (needed for a
   * lowercase-named point, since JSX reads `<userCard />` as an HTML tag). Declare mountables in PascalCase.
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): the render body
   * and the imports it pulls in are removed from the server build. Kept in the client build always, and in the server
   * build only when SSR is on (it renders the mountable on whichever side keeps it).
   *
   *     <UserCard userId={1} />   // === <UserCard.X userId={1} />
   *
   * Full reference: https://1gr14.dev/point0/latest/mountable
   */
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
        TConnectionsDefinitions,
        TMembershipsDefinitions,
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
          TConnectionsDefinitions,
          TMembershipsDefinitions,
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
            TConnectionsDefinitions,
            TMembershipsDefinitions,
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
              TConnectionsDefinitions,
              TMembershipsDefinitions,
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
    _serverUrl?: string | undefined
    _clientUrl?: string | undefined
    _hasServerLoader?: boolean | undefined
    _schemasHelpers?: SchemaHelper[] | undefined
    _searchSchemaKeys?: string[] | true | undefined
    tags?: string[]
    _description?: string
    _basePath?: AnyRoute | undefined
    _endpoint?: EndpointDefinition | undefined
    _transformer?: DataTransformerExtended | undefined
    _preventSocketTransformer?: boolean | undefined
    _ssr?: PointSsrState | undefined
    _clientOnly?: boolean | undefined
    _eventerSubscriptions?: EventerSubscription<any, TError>[]
    scope: PointsScope
    scopes: PointsScope[]
    _defaultMutationOptions?: ExtraUseMutationOptions
    _mutationOptions?: ExtraUseMutationOptions
    _defaultInfiniteQueryOptions?: PartialUseInfiniteQueryOptions
    _defaultQueryOptions?: ExtraUseQueryOptions
    _defaultPageQueryOptions?: ExtraUseQueryOptions
    _defaultLayoutQueryOptions?: ExtraUseQueryOptions
    _defaultComponentQueryOptions?: ExtraUseQueryOptions
    _defaultProviderQueryOptions?: ExtraUseQueryOptions
    _queryOptions?: ExtraUseQueryOptions
    _pageDehydratedStateQueryOptions?: ExtraUseQueryOptions
    _defaultChannelOptions?: ChannelOptionsResolved<TError> | undefined
    _channelOptions?: ChannelOptionsResolved<TError> | undefined
    _defaultServerHandlerOptions?: ServerHandlerOptionsResolved | undefined
    _serverHandlerOptions?: ServerHandlerOptionsResolved | undefined
    _defaultClientHandlerOptions?: ClientHandlerOptionsResolved | undefined
    _clientHandlerOptions?: ClientHandlerOptionsResolved | undefined
    _defaultSpaceOptions?: SpaceOptionsResolved | undefined
    _defaultSubscriptionOptions?: SubscriptionPointOptions | undefined
    _spaceOptions?: SpaceOptionsResolved | undefined
    _clientSendSchema?: InputSchema | undefined
    _serverSendSchema?: InputSchema | undefined
    _serverReplyFn?: ServerReplyFn<any, any, any, any> | undefined
    _joinerFn?: JoinerFn<any, any, any> | undefined
    _joinerDeclared?: boolean | undefined
    _connectorDeclared?: boolean | undefined
    _enrollerFn?: EnrollerFn<any, any> | undefined
    _clientReplyFn?: ClientReplyFn<any, any, any, any, any> | undefined
    _clientReplySchema?: InputSchema | undefined
    _channelPoint?: AnyPoint | undefined
    _spacePoint?: AnyPoint | undefined
    _subscriptionOptions?: SubscriptionPointOptions | undefined
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
    _modelsSchemas?: Record<string, InputSchema> | undefined
    _openapiSchema?: NormalizedEndpointOpenapiSchema | undefined
    _responseSchema?: NormalizedResponseSchema | undefined
    _serverExecuteActions?: ServerExecuteAction[]
    _clientExecuteActions?: ClientExecuteAction[]
    _mountActions?: MountAction[]
    _wrappers?: WrapperComponentType<any, any, any>[]
    _ProviderReactContext?: Context<MountableSuccessData<TQueriesDefinitions, TMapperOutput>> | undefined
    _useValue?: any
    route?: TRouteDefinition extends RouteDefinition
      ? CallableRoute<IfAnyThenElse<TRouteDefinition, string, TRouteDefinition>>
      : UndefinedRoute
    _page?: PageSuccessComponentType<any, any, any, any, any, any, any, any, any> | UndefinedSuccessPageComponent
    _component?:
      ComponentSuccessComponentType<any, any, any, any, any, any, any, any> | UndefinedComponentSuccessComponent
    _layout?: LayoutSuccessComponentType<any, any, any, any, any, any, any, any, any> | UndefinedLayoutSuccessComponent
    _layouts?: LayoutPoint[]
    name: PointName
    _fetchOptions?: FetchOptionsFn
    _rsc?: RscPointOptions
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
    X?: MountableSelfType<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any> | null
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
    this._preventSocketTransformer = options._preventSocketTransformer ?? undefined
    this._ssr = options._ssr ?? undefined
    this._clientOnly = options._clientOnly ?? false
    this._eventerSubscriptions = options._eventerSubscriptions ?? []
    this._serverUrl = options._serverUrl ?? undefined
    this._clientUrl = options._clientUrl ?? undefined
    this._hasServerLoader = options._hasServerLoader ?? undefined
    this._schemasHelpers = options._schemasHelpers ?? undefined
    this._searchSchemaKeys = options._searchSchemaKeys
    this.tags = options.tags ?? []
    this._description = options._description ?? undefined
    this._basePath = options._basePath ?? undefined
    this._endpoint = options._endpoint ?? undefined
    this.type = options.type
    this._letsReadyPointType = options._letsReadyPointType
    this._defaultMutationOptions = options._defaultMutationOptions ?? undefined
    this._mutationOptions = options._mutationOptions ?? undefined
    this._defaultQueryOptions = options._defaultQueryOptions ?? undefined
    this._defaultInfiniteQueryOptions = options._defaultInfiniteQueryOptions ?? undefined
    this._defaultLayoutQueryOptions = options._defaultLayoutQueryOptions ?? undefined
    this._defaultComponentQueryOptions = options._defaultComponentQueryOptions ?? undefined
    this._defaultProviderQueryOptions = options._defaultProviderQueryOptions ?? undefined
    this._defaultPageQueryOptions = options._defaultPageQueryOptions ?? undefined
    this._queryOptions = options._queryOptions ?? {}
    this._pageDehydratedStateQueryOptions = options._pageDehydratedStateQueryOptions ?? undefined
    this._defaultChannelOptions = options._defaultChannelOptions ?? undefined
    this._channelOptions = options._channelOptions ?? undefined
    this._defaultServerHandlerOptions = options._defaultServerHandlerOptions ?? undefined
    this._serverHandlerOptions = options._serverHandlerOptions ?? undefined
    this._defaultClientHandlerOptions = options._defaultClientHandlerOptions ?? undefined
    this._clientHandlerOptions = options._clientHandlerOptions ?? undefined
    this._defaultSpaceOptions = options._defaultSpaceOptions ?? undefined
    this._defaultSubscriptionOptions = options._defaultSubscriptionOptions ?? undefined
    this._spaceOptions = options._spaceOptions ?? undefined
    this._clientSendSchema = options._clientSendSchema ?? undefined
    this._serverSendSchema = options._serverSendSchema ?? undefined
    this._serverReplyFn = options._serverReplyFn ?? undefined
    this._joinerFn = options._joinerFn ?? undefined
    this._joinerDeclared = options._joinerDeclared ?? false
    this._connectorDeclared = options._connectorDeclared ?? false
    this._enrollerFn = options._enrollerFn ?? undefined
    this._clientReplyFn = options._clientReplyFn ?? undefined
    this._clientReplySchema = options._clientReplySchema ?? undefined
    this._channelPoint = options._channelPoint ?? undefined
    this._spacePoint = options._spacePoint ?? undefined
    this._subscriptionOptions = options._subscriptionOptions ?? undefined
    this._infiniteQueryOptions = options._infiniteQueryOptions ?? ({} as never)
    this._queryResultType = (options._queryResultType ?? undefined) as TQueryResultType
    // this._asFormData = options._asFormData
    this._modelsSchemas = options._modelsSchemas ?? undefined
    this._openapiSchema = options._openapiSchema ?? undefined
    this._responseSchema = options._responseSchema ?? undefined
    this._serverExecuteActions = options._serverExecuteActions ?? []
    this._clientExecuteActions = options._clientExecuteActions ?? []
    this._mountActions = options._mountActions ?? []
    this._wrappers = options._wrappers ?? []
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
    this._rsc = options._rsc ?? undefined
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
    TConnectionsDefinitions extends ConnectionsDefinitions,
    TMembershipsDefinitions extends MembershipsDefinitions,
    TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput,
    TIdentity extends UnknownData | EmptyObject | UndefinedIdentity,
    TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput,
    TRoom extends UnknownData | EmptyObject | UndefinedRoom,
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
    _serverUrl?: string | undefined
    _clientUrl?: string | undefined
    _hasServerLoader?: boolean | undefined
    _schemasHelpers?: SchemaHelper[] | undefined
    _searchSchemaKeys?: string[] | true | undefined
    tags?: string[]
    _description?: string | undefined
    _basePath?: AnyRoute | undefined
    _endpoint?: EndpointDefinition | undefined
    _transformer?: DataTransformerExtended | undefined
    _preventSocketTransformer?: boolean | undefined
    _ssr?: PointSsrState | undefined
    _clientOnly?: boolean | undefined
    _eventerSubscriptions?: EventerSubscription<any, TError>[]
    _defaultMutationOptions?: ExtraUseMutationOptions | undefined
    _mutationOptions?: ExtraUseMutationOptions | undefined
    _defaultInfiniteQueryOptions?: PartialUseInfiniteQueryOptions | undefined
    _defaultQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultPageQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultComponentQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultLayoutQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultProviderQueryOptions?: ExtraUseQueryOptions | undefined
    _queryOptions?: ExtraUseQueryOptions | undefined
    _pageDehydratedStateQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultChannelOptions?: ChannelOptionsResolved<TError> | undefined
    _channelOptions?: ChannelOptionsResolved<TError> | undefined
    _defaultServerHandlerOptions?: ServerHandlerOptionsResolved | undefined
    _serverHandlerOptions?: ServerHandlerOptionsResolved | undefined
    _defaultClientHandlerOptions?: ClientHandlerOptionsResolved | undefined
    _clientHandlerOptions?: ClientHandlerOptionsResolved | undefined
    _defaultSpaceOptions?: SpaceOptionsResolved | undefined
    _defaultSubscriptionOptions?: SubscriptionPointOptions | undefined
    _spaceOptions?: SpaceOptionsResolved | undefined
    _clientSendSchema?: InputSchema | undefined
    _serverSendSchema?: InputSchema | undefined
    _serverReplyFn?: ServerReplyFn<any, any, any, any> | undefined
    _joinerFn?: JoinerFn<any, any, any> | undefined
    _joinerDeclared?: boolean | undefined
    _connectorDeclared?: boolean | undefined
    _enrollerFn?: EnrollerFn<any, any> | undefined
    _clientReplyFn?: ClientReplyFn<any, any, any, any, any> | undefined
    _clientReplySchema?: InputSchema | undefined
    _channelPoint?: AnyPoint | undefined
    _spacePoint?: AnyPoint | undefined
    _subscriptionOptions?: SubscriptionPointOptions | undefined
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
    _modelsSchemas?: Record<string, InputSchema> | undefined
    _openapiSchema?: NormalizedEndpointOpenapiSchema | undefined
    _responseSchema?: NormalizedResponseSchema | undefined
    _serverExecuteActions?: ServerExecuteAction[]
    _clientExecuteActions?: ClientExecuteAction[]
    _mountActions?: MountAction[]
    _wrappers?: WrapperComponentType<any, any, any>[]
    _ProviderReactContext?: Context<MountableSuccessData<TQueriesDefinitions, TMapperOutput>> | undefined
    _useValue?: any
    route?: IfAnyThenElse<
      TRouteDefinition extends RouteDefinition ? CallableRoute<TRouteDefinition> : UndefinedRoute,
      AnyRoute
    >
    _page?: PageSuccessComponentType<any, any, any, any, any, any, any, any, any> | UndefinedSuccessPageComponent
    _component?:
      ComponentSuccessComponentType<any, any, any, any, any, any, any, any> | UndefinedComponentSuccessComponent
    _layout?: LayoutSuccessComponentType<any, any, any, any, any, any, any, any, any> | UndefinedLayoutSuccessComponent
    _layouts?: LayoutPoint[]
    name?: PointName
    _fetchOptions?: FetchOptionsFn
    _rsc?: RscPointOptions
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
    X?: MountableSelfType<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any> | null
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      _serverUrl: set('_serverUrl'),
      _clientUrl: set('_clientUrl'),
      _hasServerLoader: set('_hasServerLoader'),
      _schemasHelpers: set('_schemasHelpers'),
      _searchSchemaKeys: set('_searchSchemaKeys'),
      tags: set('tags'),
      _description: set('_description'),
      _basePath: set('_basePath'),
      _endpoint: set('_endpoint'),
      _transformer: set('_transformer'),
      _preventSocketTransformer: set('_preventSocketTransformer'),
      _ssr: set('_ssr'),
      _clientOnly: set('_clientOnly'),
      _eventerSubscriptions: set('_eventerSubscriptions'),
      _defaultMutationOptions: set('_defaultMutationOptions'),
      _mutationOptions: set('_mutationOptions'),
      _defaultQueryOptions: set('_defaultQueryOptions'),
      _defaultInfiniteQueryOptions: set('_defaultInfiniteQueryOptions'),
      _defaultPageQueryOptions: set('_defaultPageQueryOptions'),
      _defaultLayoutQueryOptions: set('_defaultLayoutQueryOptions'),
      _defaultComponentQueryOptions: set('_defaultComponentQueryOptions'),
      _defaultProviderQueryOptions: set('_defaultProviderQueryOptions'),
      _queryOptions: set('_queryOptions'),
      _pageDehydratedStateQueryOptions: set('_pageDehydratedStateQueryOptions'),
      _defaultChannelOptions: set('_defaultChannelOptions'),
      _channelOptions: set('_channelOptions'),
      _defaultServerHandlerOptions: set('_defaultServerHandlerOptions'),
      _serverHandlerOptions: set('_serverHandlerOptions'),
      _defaultClientHandlerOptions: set('_defaultClientHandlerOptions'),
      _clientHandlerOptions: set('_clientHandlerOptions'),
      _defaultSpaceOptions: set('_defaultSpaceOptions'),
      _defaultSubscriptionOptions: set('_defaultSubscriptionOptions'),
      _spaceOptions: set('_spaceOptions'),
      _clientSendSchema: set('_clientSendSchema'),
      _serverSendSchema: set('_serverSendSchema'),
      _serverReplyFn: set('_serverReplyFn'),
      _joinerFn: set('_joinerFn'),
      _joinerDeclared: set('_joinerDeclared'),
      _connectorDeclared: set('_connectorDeclared'),
      _enrollerFn: set('_enrollerFn'),
      _clientReplyFn: set('_clientReplyFn'),
      _clientReplySchema: set('_clientReplySchema'),
      _channelPoint: set('_channelPoint'),
      _spacePoint: set('_spacePoint'),
      _subscriptionOptions: set('_subscriptionOptions'),
      _infiniteQueryOptions: set('_infiniteQueryOptions'),
      _queryResultType: set('_queryResultType'),
      // _asFormData: overrides._asFormData ?? this._asFormData,
      _modelsSchemas: set('_modelsSchemas'),
      _openapiSchema: set('_openapiSchema'),
      _responseSchema: set('_responseSchema'),
      _serverExecuteActions: set('_serverExecuteActions'),
      _clientExecuteActions: set('_clientExecuteActions'),
      _mountActions: set('_mountActions'),
      _wrappers: set('_wrappers'),
      _ProviderReactContext: set('_ProviderReactContext') as never,
      _useValue: set('_useValue'),
      route: set('route'),
      _page: set('_page') as never,
      _component: set('_component') as never,
      _layout: set('_layout') as never,
      _layouts: set('_layouts'),
      name: set('name'),
      _fetchOptions: set('_fetchOptions'),
      _rsc: set('_rsc'),
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

  /**
   * Runtime backstop for the type-level `AssertNoForbiddenMethodsIfNotSuitableStage` guard. Setup methods — the single
   * loader plus ctx and every input schema — may only run while the point is still being composed, which is exactly
   * `coreStage` (a fresh point, and what `.use()` resets a point back to). Once a loader is set (`loadedStage`), the
   * point is finalized (`finalStage`), or it has become a concrete ready point
   * (page/component/layout/provider/mutation/action/base/root/plugin), more setup is forbidden: a second loader would
   * silently stack into `_serverExecuteActions`, and a late ctx/input/schema would be ignored or mis-ordered. The
   * public `Nice*` projections already make this impossible at the type level (setup methods are absent from a
   * finalized point's `Pick`, and the assert errors mid-chain); this throws for the raw `.point` escape hatch and any
   * `as never`/`as any` bypass. Points are declared at the top level, so a violation surfaces right at startup.
   */
  private _assertSetupStageAllowed(method: string): void {
    const composing = this.type === 'coreStage'
    if (!composing) {
      throw new Error(
        `You can not call .${method}() on point ${this.toStringWithLocation()} — its setup stage is "${this.type}". The single loader, ctx and all input schemas (input/clientInput/sharedInput/params/search/body/headers/cookies/clientSend/serverSend) must be defined while the point is still being composed: before the loader, and before the point is finalized.`,
      )
    }
  }

  static lets = withLetsSugar((pointType: 'root' | 'plugin', pointName: string) => {
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
  }) as never as {
    <TRequiredCtx extends RequiredCtx = UndefinedCtx>(
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
      EmptyQueriesDefinitions,
      EmptyConnectionsDefinitions,
      EmptyMembershipsDefinitions,
      UndefinedChannelInput,
      UndefinedIdentity,
      UndefinedSpaceInput,
      UndefinedRoom
    >
    (
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
      EmptyQueriesDefinitions,
      EmptyConnectionsDefinitions,
      EmptyMembershipsDefinitions,
      UndefinedChannelInput,
      UndefinedIdentity,
      UndefinedSpaceInput,
      UndefinedRoom
    >
    root: <TRequiredCtx extends RequiredCtx = UndefinedCtx>() => NiceRootStagePoint<
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
      EmptyQueriesDefinitions,
      EmptyConnectionsDefinitions,
      EmptyMembershipsDefinitions,
      UndefinedChannelInput,
      UndefinedIdentity,
      UndefinedSpaceInput,
      UndefinedRoom
    >
    plugin: () => NicePluginStagePoint<
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
      EmptyQueriesDefinitions,
      EmptyConnectionsDefinitions,
      EmptyMembershipsDefinitions,
      UndefinedChannelInput,
      UndefinedIdentity,
      UndefinedSpaceInput,
      UndefinedRoom
    >
  }

  lets = withLetsSugar((...args: any[]) => {
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
    // the point's public route must resolve absolute urls (route.abs()) against the root's urls — without them
    // route0 only has its location fallback, which does not exist on the server. The origin is picked by route kind,
    // not by runtime side (a side-dependent origin would hydration-mismatch every ssr-rendered href): actions are api
    // endpoints living on the server → serverUrl; pages and layouts are web pages → clientUrl, falling back to
    // serverUrl. Routes built here from strings take that origin outright (it outranks the location fallback, same
    // priority as _getServerUrl); routes received as objects or extended from one keep an origin they already carry —
    // only a missing one is filled in
    const routeOriginUrl = isAction ? this._serverUrl : (this._clientUrl ?? this._serverUrl)
    const routeOriginConfig = routeOriginUrl ? { origin: routeOriginUrl } : undefined
    const fillRouteOrigin = <TRoute extends AnyRoute>(routeToFill: TRoute): TRoute => {
      if (!routeOriginUrl || (routeToFill as unknown as { _origin?: string })._origin) {
        return routeToFill
      }
      return routeToFill.clone({ origin: routeOriginUrl }) as never
    }
    const newRoute = (() => {
      if (isPage) {
        if (!route) {
          return undefined // error will be thrown below (it is in case of action was defined without name)
        }
        if (typeof route === 'string') {
          return prevRoute ? fillRouteOrigin(prevRoute.extend(route)) : Route0.create(route, routeOriginConfig)
        }
        return fillRouteOrigin(route)
      }
      if (isLayout) {
        if (typeof route === 'string' || !route) {
          const routeNormalized = route ?? '/'
          return prevRoute
            ? fillRouteOrigin(prevRoute.extend(routeNormalized))
            : Route0.create(routeNormalized, routeOriginConfig)
        }
        return fillRouteOrigin(route)
      }
      if (isAction) {
        if (!route) {
          return undefined // error will be thrown below
        }
        if (typeof route === 'string') {
          return prevRoute ? fillRouteOrigin(prevRoute.extend(route)) : Route0.create(route, routeOriginConfig)
        }
        return fillRouteOrigin(route)
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
        ![
          'page',
          'layout',
          'component',
          'provider',
          'action',
          'query',
          'infiniteQuery',
          'mutation',
          'subscription',
          'channel',
        ].includes(letsReadyPointType)
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
        // Reads default to GET so a CDN can cache them: pages/layouts (input in the route) and the query family —
        // query, infiniteQuery, and the queries behind component/provider loaders (input in the ?input= search param,
        // see _getFetchServerOptions). Only mutations, which write, stay POST. A channel's nominal method is GET too —
        // its real connect is GET-first (`?input=`, and the cold-start GET+Upgrade handshake, GET by WebSocket spec),
        // POSTing only on the binary/over-long fallback.
        if (letsReadyPointType === 'mutation') {
          return 'POST'
        }
        return 'GET'
      })()
      const route = (() => {
        if (isAction) {
          if (!newRoute) {
            throw new Error(`Route is required for action point ${this.toStringWithLocation()}`)
          }
          return newRoute
        }
        // Segment casing is mirrored by the compiler's endpoint construction in @point0/compiler's point.ts — the
        // generated meta must carry the same URL this mounts. Change one side only and the meta starts lying.
        const scopeKebab = toKebabCase(this.scope)
        const typeKebab = letsReadyPointType === 'infiniteQuery' ? 'infinite-query' : letsReadyPointType
        const nameKebab = toKebabCase(normalizedPointName)
        // the endpoint route is always served by the server, so unlike the point's public route (clientUrl for
        // pages/layouts) its origin is serverUrl regardless of point kind; extend below inherits it
        const routeGeneral = Route0.create(
          getPointEndpointRoutePath({ scope: scopeKebab, type: typeKebab, name: nameKebab }),
          this._serverUrl ? { origin: this._serverUrl } : undefined,
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
        methods: pointTypeUsesQueryTransport(letsReadyPointType) ? ['GET', 'POST'] : [method],
      }
    })()

    const scopes = letsReadyPointType === 'root' ? [normalizedPointName, ...this.scopes] : this.scopes
    const scope = letsReadyPointType === 'root' ? normalizedPointName : this.scope
    if (letsReadyPointType === 'root' && normalizedPointName === 'plugin') {
      throw new Error('Cannot create root point with "plugin" scope, it is internally used name for plugin points')
    }

    // handlers live inside a channel or a space: they need its identity/room/input at runtime, so they grow only from a
    // closed channel (channel handlers) or a closed space (space handlers)
    const isHandler = letsReadyPointType === 'serverHandler' || letsReadyPointType === 'clientHandler'
    // a space grows from a closed channel only — its `.joiner` runs over that channel's socket with its identity
    const isSpaceOpener = letsReadyPointType === 'space'
    if (isHandler && this.type !== 'channel' && this.type !== 'space') {
      throw new Error(
        `A ${letsReadyPointType} point grows from a channel or a space — call .lets on a closed channel/space point, not on ${this.toStringWithLocation()}`,
      )
    }
    if (isSpaceOpener && this.type !== 'channel') {
      throw new Error(
        `A space point grows from a channel — call .lets('space', …) on a closed channel point, not on ${this.toStringWithLocation()}`,
      )
    }
    // a space, like a handler, runs over the socket (no HTTP execute pipeline) — but it keeps its own `.input` schema,
    // added AFTER the opener, so the joiner-side parse still finds it
    const isSocketPoint = isHandler || isSpaceOpener
    // where a handler's channel/space come from: born from a channel → channel is `this`, no space; born from a space →
    // the channel is the space's own channel, and the space is `this`. A space opener keeps its channel (`this`).
    const bornFromSpace = isHandler && this.type === 'space'

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
      mountActionsSuitable.push({
        type: 'selfProps',
        unstableId: Point0._getNextUnstableId(),
      })
    }
    const wrappersSuitable = this.type === 'layout' ? [] : this._wrappers

    return this._continue({
      scope,
      scopes,
      // handlers and spaces run over the socket, never through the HTTP execute pipeline — the channel's input/ctx
      // entries would be dead weight on them (a space adds its OWN `.input` after the opener, kept for the joiner parse)
      _serverExecuteActions: isSocketPoint ? [] : serverExecuteActionsSuitable,
      _clientExecuteActions: isSocketPoint ? [] : clientExecuteActionsSuitable,
      // mount actions follow the COMMON rule for every renderable point — a space renders (`<space.Membership>`), so
      // it inherits like anyone opened from a non-base point (the meta subset); only handlers never render at all
      _mountActions: isHandler ? [] : mountActionsSuitable,
      _wrappers: wrappersSuitable,
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
      _serverUrl: this._base?._serverUrl,
      _clientUrl: this._base?._clientUrl,
      _hasServerLoader: undefined,
      _basePath: this._base?._basePath,
      _defaultMutationOptions: this._base?._defaultMutationOptions,
      _mutationOptions: {},
      // the handler/space keeps its channel at hand (frames carry the channel name; options resolve through it), and
      // every new point starts with a clean socket state of its own — chain-level _default*Options flow through
      // untouched. A handler born from a space rides the space's own channel and remembers the space too; a space
      // opener keeps its channel (`this`) and has no space of its own.
      _channelPoint: bornFromSpace ? this._channelPoint : isHandler || isSpaceOpener ? (this as AnyPoint) : undefined,
      _spacePoint: bornFromSpace ? (this as AnyPoint) : undefined,
      _clientSendSchema: undefined,
      _serverSendSchema: undefined,
      _serverReplyFn: undefined,
      _joinerFn: undefined,
      _joinerDeclared: false,
      _connectorDeclared: false,
      _enrollerFn: undefined,
      _clientReplyFn: undefined,
      _clientReplySchema: undefined,
      _serverHandlerOptions: undefined,
      _clientHandlerOptions: undefined,
      _spaceOptions: undefined,
      _subscriptionOptions: undefined,
      _defaultQueryOptions: this._base?._defaultQueryOptions,
      _defaultInfiniteQueryOptions: this._base?._defaultInfiniteQueryOptions,
      _defaultPageQueryOptions: this._base?._defaultPageQueryOptions,
      _defaultComponentQueryOptions: this._base?._defaultComponentQueryOptions,
      _defaultProviderQueryOptions: this._base?._defaultProviderQueryOptions,
      _defaultLayoutQueryOptions: this._base?._defaultLayoutQueryOptions,
      _queryOptions: {},
      _pageDehydratedStateQueryOptions: this._base?._pageDehydratedStateQueryOptions,
      _infiniteQueryOptions: {} as never,
      _fetchOptions: this._base?._fetchOptions,
      _rsc: this._base?._rsc,
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
  }) as never as {
    <
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <
      TProvidedRoute extends RouteDefinition,
      TCheckError = AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'page'>,
    >(
      ...args: TPointType extends 'root' | 'base' | 'layout'
        ? [letsReadyPointType: 'page', pointName: string, route: TProvidedRoute]
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <
      TProvidedRoute extends AnyRoute,
      TCheckError = AssertInputSchemaIncludesKeys<RouteSchema<TProvidedRoute['definition']>, TParamsSchema, 'params'> &
        AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'page'>,
    >(
      ...args: TPointType extends 'root' | 'base' | 'layout'
        ? [letsReadyPointType: 'page', pointName: string, route: TProvidedRoute]
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <
      TProvidedRoute extends RouteDefinition = '/',
      TCheckError = AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'layout'>,
    >(
      ...args: TPointType extends 'root' | 'base' | 'layout'
        ? [letsReadyPointType: 'layout', pointName: string, route?: TProvidedRoute]
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <
      TProvidedRoute extends AnyRoute,
      TCheckError = AssertInputSchemaIncludesKeys<RouteSchema<TProvidedRoute['definition']>, TParamsSchema, 'params'> &
        AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'layout'>,
    >(
      ...args: TPointType extends 'root' | 'base' | 'layout'
        ? [letsReadyPointType: 'layout', pointName: string, route: TProvidedRoute]
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <
      TNewLetsReadyPointType extends 'query' | 'infiniteQuery' | 'mutation' | 'subscription',
      TCheckError = AssertUsualInputSchemaOnly<
        TParamsSchema,
        TSearchSchema,
        TBodySchema,
        'query' | 'infiniteQuery' | 'mutation' | 'subscription'
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <TNewLetsReadyPointType extends 'root' | 'base'>(
      ...args: TPointType extends 'root' | 'base'
        ? [letsReadyPointType: TNewLetsReadyPointType, pointName: string]
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
      TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
      TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
      TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
      UndefinedChannelInput,
      UndefinedIdentity,
      UndefinedSpaceInput,
      UndefinedRoom
    >
    <TCheckError = AssertUsualInputSchemaOnly<TParamsSchema, TSearchSchema, TBodySchema, 'channel'>>(
      ...args: TPointType extends 'root' | 'base' ? [letsReadyPointType: 'channel', pointName: string] : never[]
    ): WithError<
      TCheckError,
      NiceStagePoint<
        'coreStage',
        'channel',
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
        TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
        TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
        TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
        UndefinedChannelInput,
        UndefinedIdentity,
        UndefinedSpaceInput,
        UndefinedRoom
      >
    >
    <TNewLetsReadyPointType extends 'serverHandler' | 'clientHandler'>(
      ...args: TPointType extends 'channel' | 'space'
        ? [letsReadyPointType: TNewLetsReadyPointType, pointName: string]
        : never[]
    ): NiceStagePoint<
      'coreStage',
      TNewLetsReadyPointType,
      TRequiredCtx,
      TError,
      // handlers take no chain ctx — what the channel/space established per connection travels in the four trailing slots
      EmptyCtx,
      TCtxExposedKeys,
      UndefinedLoaderOutput,
      UndefinedLoaderOutput,
      UndefinedMapperOutput,
      TRouteDefinition,
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
      EmptyQueriesDefinitions,
      EmptyConnectionsDefinitions,
      EmptyMembershipsDefinitions,
      // born from a channel: compute channel input/identity, no space slots. Born from a space: carry the channel's
      // input/identity forward and fill the space slots from the space's own input + joiner room shape
      // the closers already wrote every socket slot (channel: input/identity, space: those plus its own
      // input/room) — a handler grown from either simply inherits them
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
    // open a space from a closed channel — it carries the channel's input/identity; its own input rides the standard
    // schema slots of its chain (filled by `.input`, read back by the `.space()` closer). The ROOM SHAPE is declared
    // right here, like a component's props: `channel.lets<{ chatId: string }>('space', 'chat')`. Omitted, it is the
    // strict empty object — one global room `{}` — and a joiner/enroller returning anything keyed is a type error,
    // which is the nudge to declare the generic
    <
      TNewRoom extends UnknownData = EmptyObjectOnly,
      TCheckSpaceError = AssertUsualInputSchemaOnly<TParamsSchema, TSearchSchema, TBodySchema, 'space'>,
    >(
      ...args: TPointType extends 'channel' ? [letsReadyPointType: 'space', pointName: string] : never[]
    ): WithError<
      TCheckSpaceError,
      NiceStagePoint<
        'coreStage',
        'space',
        TRequiredCtx,
        TError,
        EmptyCtx,
        TCtxExposedKeys,
        UndefinedLoaderOutput,
        UndefinedLoaderOutput,
        UndefinedMapperOutput,
        TRouteDefinition,
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
        EmptyQueriesDefinitions,
        EmptyConnectionsDefinitions,
        EmptyMembershipsDefinitions,
        // opened from a CLOSED channel — its slots are written; the space's input arrives at its `.space()` close, its
        // room is declared right here by the opener's generic
        TChannelInput,
        TIdentity,
        UndefinedSpaceInput,
        TNewRoom
      >
    >
  } & (TPointType extends 'root' | 'base'
    ? {
        root: {
          (): NiceStagePoint<
            'coreStage',
            'root',
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
            TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
            TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
            TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
            UndefinedChannelInput,
            UndefinedIdentity,
            UndefinedSpaceInput,
            UndefinedRoom
          >
        }
        base: {
          (): NiceStagePoint<
            'coreStage',
            'base',
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
            TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
            TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
            TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
            UndefinedChannelInput,
            UndefinedIdentity,
            UndefinedSpaceInput,
            UndefinedRoom
          >
        }
        query: {
          <TCheckError = AssertUsualInputSchemaOnly<TParamsSchema, TSearchSchema, TBodySchema, 'query'>>(): WithError<
            TCheckError,
            NiceStagePoint<
              'coreStage',
              'query',
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
              TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
              TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
              TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
              UndefinedChannelInput,
              UndefinedIdentity,
              UndefinedSpaceInput,
              UndefinedRoom
            >
          >
        }
        infiniteQuery: {
          <
            TCheckError = AssertUsualInputSchemaOnly<TParamsSchema, TSearchSchema, TBodySchema, 'infiniteQuery'>,
          >(): WithError<
            TCheckError,
            NiceStagePoint<
              'coreStage',
              'infiniteQuery',
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
              TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
              TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
              TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
              UndefinedChannelInput,
              UndefinedIdentity,
              UndefinedSpaceInput,
              UndefinedRoom
            >
          >
        }
        mutation: {
          <
            TCheckError = AssertUsualInputSchemaOnly<TParamsSchema, TSearchSchema, TBodySchema, 'mutation'>,
          >(): WithError<
            TCheckError,
            NiceStagePoint<
              'coreStage',
              'mutation',
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
              TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
              TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
              TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
              UndefinedChannelInput,
              UndefinedIdentity,
              UndefinedSpaceInput,
              UndefinedRoom
            >
          >
        }
        subscription: {
          <
            TCheckError = AssertUsualInputSchemaOnly<TParamsSchema, TSearchSchema, TBodySchema, 'subscription'>,
          >(): WithError<
            TCheckError,
            NiceStagePoint<
              'coreStage',
              'subscription',
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
              TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
              TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
              TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
              UndefinedChannelInput,
              UndefinedIdentity,
              UndefinedSpaceInput,
              UndefinedRoom
            >
          >
        }
        channel: {
          <TCheckError = AssertUsualInputSchemaOnly<TParamsSchema, TSearchSchema, TBodySchema, 'channel'>>(): WithError<
            TCheckError,
            NiceStagePoint<
              'coreStage',
              'channel',
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
              TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
              TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
              TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
              UndefinedChannelInput,
              UndefinedIdentity,
              UndefinedSpaceInput,
              UndefinedRoom
            >
          >
        }
        provider: {
          <
            TNewOuterProps extends Props = EmptyProps,
            TCheckError = AssertUsualInputSchemaOnly<TParamsSchema, TSearchSchema, TBodySchema, 'provider'>,
          >(): WithError<
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
              TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
              TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
              TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
              UndefinedChannelInput,
              UndefinedIdentity,
              UndefinedSpaceInput,
              UndefinedRoom
            >
          >
        }
        component: {
          <
            TNewOuterProps extends Props = EmptyProps,
            TCheckError = AssertUsualInputSchemaOnly<TParamsSchema, TSearchSchema, TBodySchema, 'component'>,
          >(): WithError<
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
              TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
              TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
              TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
              UndefinedChannelInput,
              UndefinedIdentity,
              UndefinedSpaceInput,
              UndefinedRoom
            >
          >
        }
        action: {
          <
            TMethod extends WideRequestMethod,
            TProvidedRoute extends RouteDefinition,
            TCheckError = AssertInputSchemaHasSameKeys<
              RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>,
              TParamsSchema,
              'params'
            > &
              AssertActionSchemaOnly<TServerInputSchema, TClientInputSchema, 'action'>,
          >(
            method: TMethod,
            route: TProvidedRoute,
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
              TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
              TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
              TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
              UndefinedChannelInput,
              UndefinedIdentity,
              UndefinedSpaceInput,
              UndefinedRoom
            >
          >
          <
            TMethod extends WideRequestMethod,
            TProvidedRoute extends AnyRoute,
            TCheckError = AssertInputSchemaHasSameKeys<
              RouteSchema<ExtendRouteDefinition<TRouteDefinition, TProvidedRoute['definition']>>,
              TParamsSchema,
              'params'
            > &
              AssertActionSchemaOnly<TServerInputSchema, TClientInputSchema, 'action'>,
          >(
            method: TMethod,
            route: TProvidedRoute,
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
              TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
              TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
              TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
              UndefinedChannelInput,
              UndefinedIdentity,
              UndefinedSpaceInput,
              UndefinedRoom
            >
          >
        }
      }
    : unknown) &
    (TPointType extends 'root' | 'base' | 'layout'
      ? {
          layout: {
            <
              TProvidedRoute extends RouteDefinition = '/',
              TCheckError = AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'layout'>,
            >(
              route?: TProvidedRoute,
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
                TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
                TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
                TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
                UndefinedChannelInput,
                UndefinedIdentity,
                UndefinedSpaceInput,
                UndefinedRoom
              >
            >
            <
              TProvidedRoute extends AnyRoute,
              TCheckError = AssertInputSchemaIncludesKeys<
                RouteSchema<TProvidedRoute['definition']>,
                TParamsSchema,
                'params'
              > &
                AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'layout'>,
            >(
              route: TProvidedRoute,
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
                TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
                TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
                TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
                UndefinedChannelInput,
                UndefinedIdentity,
                UndefinedSpaceInput,
                UndefinedRoom
              >
            >
          }
          page: {
            <
              TProvidedRoute extends RouteDefinition,
              TCheckError = AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'page'>,
            >(
              route: TProvidedRoute,
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
                TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
                TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
                TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
                UndefinedChannelInput,
                UndefinedIdentity,
                UndefinedSpaceInput,
                UndefinedRoom
              >
            >
            <
              TProvidedRoute extends AnyRoute,
              TCheckError = AssertInputSchemaIncludesKeys<
                RouteSchema<TProvidedRoute['definition']>,
                TParamsSchema,
                'params'
              > &
                AssertRoutedInputSchemaOnly<TServerInputSchema, TClientInputSchema, TBodySchema, 'page'>,
            >(
              route: TProvidedRoute,
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
                TPointType extends 'root' | 'base' ? TQueriesDefinitions : EmptyQueriesDefinitions,
                TPointType extends 'root' | 'base' ? TConnectionsDefinitions : EmptyConnectionsDefinitions,
                TPointType extends 'root' | 'base' ? TMembershipsDefinitions : EmptyMembershipsDefinitions,
                UndefinedChannelInput,
                UndefinedIdentity,
                UndefinedSpaceInput,
                UndefinedRoom
              >
            >
          }
        }
      : unknown) &
    // handlers grow from a closed channel OR a closed space — the child carries the level's per-connection types in the
    // four trailing slots (channel: its input/identity, no space slots; space: the channel's input/identity + its own)
    (TPointType extends 'channel' | 'space'
      ? {
          serverHandler: {
            (): NiceStagePoint<
              'coreStage',
              'serverHandler',
              TRequiredCtx,
              TError,
              EmptyCtx,
              TCtxExposedKeys,
              UndefinedLoaderOutput,
              UndefinedLoaderOutput,
              UndefinedMapperOutput,
              TRouteDefinition,
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
              EmptyQueriesDefinitions,
              EmptyConnectionsDefinitions,
              EmptyMembershipsDefinitions,
              // the closers already wrote every socket slot — a handler grown from a channel or a space inherits
              TChannelInput,
              TIdentity,
              TSpaceInput,
              TRoom
            >
          }
          clientHandler: {
            (): NiceStagePoint<
              'coreStage',
              'clientHandler',
              TRequiredCtx,
              TError,
              EmptyCtx,
              TCtxExposedKeys,
              UndefinedLoaderOutput,
              UndefinedLoaderOutput,
              UndefinedMapperOutput,
              TRouteDefinition,
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
              EmptyQueriesDefinitions,
              EmptyConnectionsDefinitions,
              EmptyMembershipsDefinitions,
              // the closers already wrote every socket slot — a handler grown from a channel or a space inherits
              TChannelInput,
              TIdentity,
              TSpaceInput,
              TRoom
            >
          }
        }
      : unknown) &
    // a space opens from a closed channel — the sugar `.lets.space()` (compiler-rewritten to `.lets('space', name)`).
    // The room shape rides the same generic as the long form: `.lets.space<{ chatId: string }>()`
    (TPointType extends 'channel'
      ? {
          space: {
            <TNewRoom extends UnknownData = EmptyObjectOnly>(): NiceStagePoint<
              'coreStage',
              'space',
              TRequiredCtx,
              TError,
              EmptyCtx,
              TCtxExposedKeys,
              UndefinedLoaderOutput,
              UndefinedLoaderOutput,
              UndefinedMapperOutput,
              TRouteDefinition,
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
              EmptyQueriesDefinitions,
              EmptyConnectionsDefinitions,
              EmptyMembershipsDefinitions,
              // opened from a CLOSED channel — its slots are written; the space's input arrives at its `.space()`
              // close, its room is declared right here by the opener's generic
              TChannelInput,
              TIdentity,
              UndefinedSpaceInput,
              TNewRoom
            >
          }
        }
      : unknown)

  // root settings

  /**
   * Set the app's error class. Root only. Default is `ErrorPoint0`; replace it with any class of same-or-wider
   * structure (your own `AppError`). Retypes every point's error — query `.error`, the `.on('error', …)` argument, a
   * `.with` return. Client + server.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   *     .errorClass(AppError)
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  > {
    return this._continue({
      _Error: ErrorClass as never,
    }) as never
  }

  /**
   * The origin where the server and the API live — routes and endpoints resolve against it. Root only (and plugin).
   * Config value, client + server.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   *     .serverUrl(env.SERVER_URL)
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  serverUrl<TSelf>(this: TSelf, serverUrl: string): TSelf
  serverUrl(serverUrl: string) {
    return this._continue({
      _serverUrl: serverUrl,
    }) as never
  }

  /**
   * The public web origin pages live on, when it differs from serverUrl (dev split ports, native shells, a CDN front).
   * Page and layout routes resolve route.abs() against it; action routes always use serverUrl — the API lives on the
   * server. Without it pages fall back to serverUrl.
   */
  /**
   * The public origin pages live on, when it differs from `serverUrl` (split dev ports, a native shell, a CDN front).
   * Page routes resolve against this (falling back to `serverUrl`); endpoint routes always use `serverUrl`. Root only.
   * Optional. Config value, client + server.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   *     .clientUrl(env.CLIENT_URL)
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  clientUrl<TSelf>(this: TSelf, clientUrl: string): TSelf
  clientUrl(clientUrl: string) {
    return this._continue({
      _clientUrl: clientUrl,
    }) as never
  }

  // general settings

  /**
   * Tag this point — variadic, de-duped, accumulates across calls. Tags ride along in the query key, so they group
   * points for invalidation (invalidate a whole group by tag). Available on every point while composing.
   *
   * Server-and-client — kept on both bundles (isomorphic metadata).
   *
   *     .tag('ideas', 'public')
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  tag<TSelf>(this: TSelf, ...tags: [string, ...string[]]): TSelf
  tag(...tags: [string, ...string[]]) {
    return this._continue({
      tags: [...new Set([...this.tags, ...tags])],
    }) as never
  }

  /**
   * Set a human description for this point — appends if called again. Metadata used for docs/OpenAPI. Available on
   * every point while composing.
   *
   * Server-only — stripped from the client bundle (docs/OpenAPI metadata, read server-side).
   *
   *     .description('Fetch one idea by id')
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  description<TSelf>(this: TSelf, description: string): TSelf
  description<TSelf>(this: TSelf, description?: string): TSelf
  description(description?: string) {
    return this._continue({
      _description: description ? [this._description, description].filter(Boolean).join('\n\n') : this._description,
    }) as never
  }

  /**
   * Teach the root how to read one validation library's schemas (detect, extract keys, spot file uploads, emit JSON for
   * OpenAPI). Helpers accumulate — call once per library you use.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   *     .schemaHelper(zodSchemaHelper())
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  schemaHelper<TSelf>(this: TSelf, schemaHelper: SchemaHelper | undefined | false | null): TSelf
  schemaHelper(schemaHelper: SchemaHelper | undefined | false | null) {
    const newSchemasHelpers = schemaHelper ? [...(this._schemasHelpers ?? []), schemaHelper] : this._schemasHelpers
    return this._continue({
      _schemasHelpers: newSchemasHelpers,
    }) as never
  }

  /**
   * A type-level route prefix that every point built off this base inherits. Pair it with a gating plugin to put a
   * whole section behind one prefix and one check. On root and base.
   *
   * Server-and-client — kept on both bundles (routes resolve on both sides).
   *
   *     root.lets.base().basePath('/admin').use(adminOnlyPlugin).base()
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  basePath<TBasePath extends string>(
    basePath: TBasePath,
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
    ExtendRouteDefinition<TRouteDefinition, TBasePath>,
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  > {
    const newBasePath: CallableRoute = this._basePath ? this._basePath.extend(basePath) : Route0.create(basePath)
    return this._continue({
      _basePath: newBasePath,
      route: newBasePath,
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

  /**
   * Subscribe to a framework lifecycle event. `.on` runs on BOTH server and client (use `.serverOn` / `.clientOn` for
   * one side). `'error'` is sugar for the four error events. Available on every point type.
   *
   * Server-and-client — kept on both bundles (the handler runs on both sides).
   *
   *     .on('queryError', ({ error, meta }) => report(error, meta))            // by name
   *     .on(['queryError', 'mutationError'], ({ error }) => report(error))     // by array
   *     .on('error', ({ side, name, error, meta }) => console.error({ side, name, error, ...meta })) // 'error' sugar
   *     .on('*', (e) => trace(e))                                              // every event
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  on<TSelf, TEventName extends AnyEventerEventName | '*'>(
    this: TSelf,
    name: TEventName,
    callback: AnyEventerSubscriptionCallback<TEventName, TError>,
  ): TSelf
  on<TSelf>(
    this: TSelf,
    name: 'error',
    callback: AnyEventerSubscriptionCallback<UniqEventerErrorEventName, TError>,
  ): TSelf
  on<TSelf, TEventNames extends Array<AnyEventerEventName>>(
    this: TSelf,
    names: TEventNames,
    callback: AnyEventerSubscriptionCallback<TEventNames[number], TError>,
  ): TSelf
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

  /**
   * Subscribe to a lifecycle event on the SERVER side only. The callback is stripped from the client bundle, so it can
   * use server-only code. Same shape as `.on`. Available on every point type.
   *
   * Server-only — the handler is stripped from the client bundle (runs server-side).
   *
   *     .serverOn('queryError', ({ error, meta }) => logToSentry(error, meta))   // by name
   *     .serverOn(['queryError', 'mutationError'], ({ error }) => logToSentry(error)) // by array
   *     .serverOn('*', (e) => auditLog(e))                                       // every event
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  serverOn<TSelf, TEventName extends ServerEventerEventName | '*'>(
    this: TSelf,
    name: TEventName,
    callback: ServerEventerSubscriptionCallback<TEventName, TError>,
  ): TSelf
  serverOn<TSelf>(
    this: TSelf,
    name: 'error',
    callback: ServerEventerSubscriptionCallback<UniqEventerErrorEventName, TError>,
  ): TSelf
  serverOn<TSelf, TEventNames extends Array<ServerEventerEventName>>(
    this: TSelf,
    names: TEventNames,
    callback: ServerEventerSubscriptionCallback<TEventNames[number], TError>,
  ): TSelf
  serverOn(
    ...args:
      | [
          name: ServerEventerEventName | 'error' | '*' | Array<ServerEventerEventName>,
          callback?: ServerEventerSubscriptionCallback<any, TError> | undefined,
        ]
      | []
  ) {
    if (args.length === 0) {
      return this._continue({}) as never
    }
    const [name, callback = () => {}] = args
    const names = Array.isArray(name) ? name : name === 'error' ? uniqEventerErrorEventNames : [name]
    const subscriptions = names.map((name) => ({ name, callback, side: 'server' as const }))
    return this._continue({ _eventerSubscriptions: [...this._eventerSubscriptions, ...subscriptions] }) as never
  }

  /**
   * Subscribe to a lifecycle event on the CLIENT side only. The callback is stripped from the server bundle. Same shape
   * as `.on`. Available on every point type.
   *
   * Client-only — the handler is stripped from the server bundle (runs in the browser, regardless of SSR).
   *
   *     .clientOn('queryError', ({ error }) => toast(error.message))            // by name
   *     .clientOn(['queryError', 'mutationError'], ({ error }) => toast(error.message)) // by array
   *     .clientOn('*', (e) => devtools(e))                                      // every event
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  clientOn<TSelf, TEventName extends ClientEventerEventName | '*'>(
    this: TSelf,
    name: TEventName,
    callback: ClientEventerSubscriptionCallback<TEventName, TError>,
  ): TSelf
  clientOn<TSelf>(
    this: TSelf,
    name: 'error',
    callback: ClientEventerSubscriptionCallback<UniqEventerErrorEventName, TError>,
  ): TSelf
  clientOn<TSelf, TEventNames extends Array<ClientEventerEventName>>(
    this: TSelf,
    names: TEventNames,
    callback: ClientEventerSubscriptionCallback<TEventNames[number], TError>,
  ): TSelf
  clientOn(
    ...args:
      | [
          name: ClientEventerEventName | 'error' | '*' | Array<ClientEventerEventName>,
          callback: ClientEventerSubscriptionCallback<any, TError> | undefined,
        ]
      | []
  ) {
    if (args.length === 0) {
      return this._continue({}) as never
    }
    const [name, callback = () => {}] = args
    const names = Array.isArray(name) ? name : name === 'error' ? uniqEventerErrorEventNames : [name]
    const subscriptions = names.map((name) => ({ name, callback, side: 'client' as const }))
    return this._continue({
      _eventerSubscriptions: [...this._eventerSubscriptions, ...subscriptions],
    }) as never
  }

  /**
   * Opt a mountable out of SSR: its render runs in the browser only, and the server bundle drops the render chain.
   * Takes an optional fallback component shown in place during SSR. On page, layout, component, provider.
   *
   * The strip switch — everything after it (`.page`/`.layout`/`.component`/`.provider`, `.loading`, `.error`,
   * `.wrapper`, `.with`, `.mapper`, `.head`) is cut from the server build and runs in the browser only. This is about
   * where the render runs, not whether the point participates in SSR — it is independent of `.ssr()`.
   *
   *     .clientOnly(() => <Spinner />).page(() => <HeavyClientChart />)
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  clientOnly<TSelf>(
    this: TSelf,
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
        TQueriesDefinitions,
        TError
      >,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TMapperOutput,
      TError
    >,
  ): TSelf
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
        TQueriesDefinitions,
        TError
      >,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TMapperOutput,
      TError
    >,
  ) {
    return this._continue({
      _clientOnly: true,
      // Always add the wrapper. Whether it shows the fallback (during SSR) or the content (after hydration, or right
      // away when the page was not SSR'd) is decided at render time by `useIsHydrated` — not here. SSR can still change
      // further down the chain, so deciding now, from this point's current SSR, would be wrong.
      _mountActions: [
        ...this._mountActions,
        { type: 'clientOnly' as const, Fallback, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  /**
   * Turn SSR OFF for this point, or tune its SSR render loop — a per-point narrowing of the engine's per-side `ssr`
   * default. SSR can only be turned OFF here, never on: a point cannot force a side to render. `.ssr(false)` opts the
   * page/subtree out of server rendering (it ships as the client shell, hydrating on the client); an options object
   * (optionally carrying `enabled: false`) tunes the SSR render loop — discovery renders, loader prefetch — for this
   * page. It is point-level, not positional: a `.ssr(false)` anywhere in the point's chain turns the WHOLE point off
   * (even methods declared before it), and a page inherits its root's `.ssr(...)` as the scope default; a later
   * `.ssr(...)` merges over an earlier one. On root, base, page, layout — not in a plugin (the compiler resolves SSR
   * statically along the chain and cannot trace a plugin into its consumers). There is no `.ssr(true)`.
   *
   *     .ssr(false)                            // this page renders client-only (ships the shell, hydrates on the client)
   *     .ssr({ allowedDiscoveryRenders: 1 })   // keep SSR, cap the discovery passes for this page
   *
   * Full reference: https://1gr14.dev/point0/latest/ssr
   */
  ssr<TSelf>(this: TSelf, ssr: PointSsrInput): TSelf
  ssr(ssr: PointSsrInput) {
    const incoming: PointSsrState = ssr === false ? { enabled: false } : ssr
    const merged: PointSsrState = { ...(this._ssr ?? {}), ...incoming }
    const patch: Record<string, unknown> = { _ssr: merged }
    // Turning SSR off retires any `pageDehydratedState` prefetch already set on this point (there is no dehydrated
    // state without SSR). A policy set AFTER this `.ssr(false)` is caught in the setters instead (they throw).
    if (merged.enabled === false) {
      if (this._polhPolicy) {
        patch._polhPolicy = Point0._downgradedDehydrationPolicy(this._polhPolicy)
      }
      if (this._ponPolicy) {
        patch._ponPolicy = Point0._downgradedDehydrationPolicy(this._ponPolicy)
      }
    }
    return this._continue(patch as never) as never
  }

  private static _isDehydrationPolicy(policy: PrefetchPagePolicy | undefined): boolean {
    return policy === 'pageDehydratedState' || policy === 'pageDehydratedStateAndClientQuery'
  }

  // The cheap non-SSR equivalent of a dehydrated-state prefetch policy (others pass through unchanged).
  private static _downgradedDehydrationPolicy(policy: PrefetchPagePolicy | undefined): PrefetchPagePolicy | undefined {
    return policy === 'pageDehydratedState'
      ? 'serverQuery'
      : policy === 'pageDehydratedStateAndClientQuery'
        ? 'serverAndClientQuery'
        : policy
  }

  // Setters call this: declaring a dehydrated-state prefetch policy when SSR is already off here is a contradiction
  // (unlike turning SSR off after the policy, which silently downgrades) — fail loudly at build time.
  private _throwIfDehydrationPolicyWithoutSsr(policy: PrefetchPagePolicy | undefined): void {
    if (Point0._isDehydrationPolicy(policy) && !this._getSsrEnabled()) {
      throw new Error(
        `Prefetch policy "${policy}" needs SSR, but SSR is off on ${this.toStringWithLocation()} (from \`.ssr(false)\` or the side default). Use serverQuery / serverAndClientQuery / clientQuery instead.`,
      )
    }
  }

  /**
   * Default react-query options for every mutation in scope (deep-merged, not replaced). On root, base, plugin. Client
   *
   * - server.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   *     .mutationOptions({ retry: 1 })
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  mutationOptions<TSelf>(this: TSelf, mutationOptions: ExtraUseMutationOptions): TSelf
  mutationOptions(mutationOptions: ExtraUseMutationOptions) {
    return this._continue({
      _defaultMutationOptions: mergeMutationOptions(this._defaultMutationOptions, mutationOptions),
    }) as never
  }

  /**
   * Default react-query options for every query in scope (`staleTime`, `retry`, `refetchOnWindowFocus`, …) — the broad
   * one; the `*QueryOptions` variants target one query kind. Deep-merged, overridable per call site. On root, base,
   * plugin. Client + server.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   *     .queryOptions({ retry: false, refetchOnWindowFocus: false, staleTime: 60_000 })
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  queryOptions<TSelf>(this: TSelf, queryOptions: ExtraUseQueryOptions): TSelf
  queryOptions(queryOptions: ExtraUseQueryOptions | undefined = {}) {
    return this._continue({
      _defaultQueryOptions: mergeQueryOptions(this._defaultQueryOptions, queryOptions),
    }) as never
  }

  /**
   * Default react-query options for every infinite query in scope. On root, base, plugin. Client + server.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  infiniteQueryOptions<TSelf>(this: TSelf, infiniteQueryOptions: PartialUseInfiniteQueryOptions): TSelf
  infiniteQueryOptions(infiniteQueryOptions: PartialUseInfiniteQueryOptions | undefined = {}) {
    return this._continue({
      _defaultInfiniteQueryOptions: mergeInfiniteQueryOptions(
        this._defaultInfiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
        infiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
      ) as PartialUseInfiniteQueryOptions,
    }) as never
  }

  pageDehydratedStateQueryOptions<TSelf>(this: TSelf, pageDehydratedStateQueryOptions: ExtraUseQueryOptions): TSelf
  pageDehydratedStateQueryOptions(pageDehydratedStateQueryOptions: ExtraUseQueryOptions) {
    return this._continue({
      _pageDehydratedStateQueryOptions: mergeQueryOptions(
        this._pageDehydratedStateQueryOptions,
        pageDehydratedStateQueryOptions,
      ),
    }) as never
  }

  /**
   * Default react-query options for a page's own self query (a page with a loader). On root, base, layout, plugin.
   * Client + server.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  pageQueryOptions<TSelf>(this: TSelf, pageQueryOptions: ExtraUseQueryOptions): TSelf
  pageQueryOptions(pageQueryOptions: ExtraUseQueryOptions) {
    return this._continue({
      _defaultPageQueryOptions: mergeQueryOptions(this._defaultPageQueryOptions, pageQueryOptions),
    }) as never
  }

  /**
   * Default react-query options for a component's own self query. On root, base, plugin. Client + server.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  componentQueryOptions<TSelf>(this: TSelf, componentQueryOptions: ExtraUseQueryOptions): TSelf
  componentQueryOptions(componentQueryOptions: ExtraUseQueryOptions) {
    return this._continue({
      _defaultComponentQueryOptions: mergeQueryOptions(this._defaultComponentQueryOptions, componentQueryOptions),
    }) as never
  }

  /**
   * Default react-query options for a provider's own self query. On root, base, plugin. Client + server.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  providerQueryOptions<TSelf>(this: TSelf, providerQueryOptions: ExtraUseQueryOptions): TSelf
  providerQueryOptions(providerQueryOptions: ExtraUseQueryOptions) {
    return this._continue({
      _defaultProviderQueryOptions: mergeQueryOptions(this._defaultProviderQueryOptions, providerQueryOptions),
    }) as never
  }

  /**
   * Default react-query options for a layout's own self query. On root, base, layout, plugin. Client + server.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  layoutQueryOptions<TSelf>(this: TSelf, layoutQueryOptions: ExtraUseQueryOptions): TSelf
  layoutQueryOptions(layoutQueryOptions: ExtraUseQueryOptions) {
    return this._continue({
      _defaultLayoutQueryOptions: mergeQueryOptions(this._defaultLayoutQueryOptions, layoutQueryOptions),
    }) as never
  }

  /**
   * Customize the `fetch` Point0 makes for server queries and mutations — an object (merged) or a function
   * (re-evaluated per request, e.g. for a fresh token each time). On root, base, plugin, and mountables.
   *
   * Server-and-client — kept on both bundles (the fetch runs from whichever side calls the query/mutation).
   *
   *     .fetchOptions({ credentials: 'include' })                              // object, merged once
   *     .fetchOptions(() => ({ headers: { authorization: `Bearer ${getToken()}` } })) // function, per request
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  fetchOptions<TSelf>(this: TSelf, fetchOptionsOrFn: FetchOptionsOrFn): TSelf
  fetchOptions(fetchOptionsOrFn: FetchOptionsOrFn) {
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

  /**
   * The point's RSC knobs ("elements as data") — merged PER KEY down the chain, so `root.rsc({ … })` sets the app-wide
   * default and a point's own `.rsc({ … })` overrides only the keys it names. On root, base, plugin, and every point
   * type.
   *
   * `depth` — how deep in the loader output React elements are allowed. `0` (the default) allows an element only as the
   * whole output — `.loader(async () => <Hello />)`; `1` also allows elements in first-level fields — `.loader(async ()
   * => ({ stats, hero: <Hero /> }))`; and so on. Arrays don't consume a level (`{ items: [<Row />] }` needs `1`).
   * Elements found deeper fail the loader with an error naming the path — depth is an explicitness gate, so elements
   * never leak into data by accident. Inside an element tree the depth no longer applies: props and children nest
   * freely. Plain function components unfold on the server (they are server components — their code never ships to the
   * browser); component points serialize as references and render on the client.
   *
   * `holeTimeoutMs` — the deadline for this point's `defer()` holes, default 60s, `false` disables: a subtree that has
   * not settled by then fails with `POINT0_RSC_HOLE_TIMEOUT` (rendered by the hole's error fallback or its nearest
   * boundary), so a hung subtree never holds the streamed response open forever.
   *
   * Server-and-client — kept on both bundles (isomorphic config).
   *
   *     .rsc({ depth: 1 })
   *     .loader(async () => ({ hero: <Hero />, cta: <MyCta label="Go" /> }))
   *
   * Full reference: https://1gr14.dev/point0/latest/rsc
   */
  rsc<TSelf>(this: TSelf, rsc: RscPointOptions): TSelf
  rsc(rsc: RscPointOptions) {
    return this._continue({
      _rsc: { ...this._rsc, ...rsc },
    }) as never
  }

  // extra components

  /**
   * Declare the error UI for this point and everything below it — Point0 renders the nearest one up the chain when a
   * point's data throws. Usually set once near the root, overridden per point. The component gets `{ type, error }`,
   * with `error` normalized through the configured error class (never a raw `Error`).
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): its body and the
   * imports it pulls in are removed from the server build. Kept in the client build always, and in the server build
   * only when SSR is on.
   *
   *     .error(({ error }) => <ErrorScreen error={error} />)
   *
   * Full reference: https://1gr14.dev/point0/latest/loading-error
   */
  error(
    errorComponent: ErrorComponentType<
      TLetsReadyPointType extends 'layout'
        ? 'layout'
        : TLetsReadyPointType extends 'component'
          ? 'component'
          : TLetsReadyPointType extends 'page' | 'provider'
            ? 'page'
            : 'page' | 'component' | 'layout',
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
      TQueriesDefinitions,
      TError
    >,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  error(errorComponent: ErrorComponentType<any, any> | undefined) {
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        ...(errorComponent && this._isMountablePoint()
          ? [
              {
                type: 'errorComponent' as const,
                Component: errorComponent,
                variant: this._getDestinationComponentVariant(),
                unstableId: Point0._getNextUnstableId(),
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

  layoutError<TSelf>(this: TSelf, layoutErrorComponent: ErrorComponentType<'layout', TError>): TSelf
  layoutError(layoutErrorComponent: ErrorComponentType<'layout', TError> | undefined) {
    return this._continue({
      _layoutErrorComponent: layoutErrorComponent,
      // _layoutErrorComponent: this._applyComponentDisplayName(layoutErrorComponent || (() => null), {
      //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'LayoutError',
      // }),
    }) as never
  }

  pageError<TSelf>(this: TSelf, pageErrorComponent: ErrorComponentType<'page', TError>): TSelf
  pageError(pageErrorComponent: ErrorComponentType<any, TError> | undefined) {
    // this._applyComponentDisplayName(pageErrorComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'PageError',
    // })
    return this._continue({
      _pageErrorComponent: pageErrorComponent,
    }) as never
  }

  /**
   * Like `.error`, but scoped to the `'component'` render position only — the error UI used when a mounted component
   * (not a page or layout) throws. Lets a layout split its error boundaries by where the error sits.
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): its body and the
   * imports it pulls in are removed from the server build. Kept in the client build always, and in the server build
   * only when SSR is on.
   *
   * Full reference: https://1gr14.dev/point0/latest/loading-error
   */
  componentError<TSelf>(this: TSelf, componentErrorComponent: ErrorComponentType<'component', TError>): TSelf
  componentError(componentErrorComponent: ErrorComponentType<'component', TError> | undefined) {
    return this._continue({
      _componentErrorComponent: componentErrorComponent,
      // _componentErrorComponent: this._applyComponentDisplayName(componentErrorComponent || (() => null), {
      //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'ComponentError',
      // }),
    }) as never
  }

  layoutLoading<TSelf>(this: TSelf, layoutLoadingComponent: LoadingComponentType<'layout'>): TSelf
  layoutLoading(layoutLoadingComponent: LoadingComponentType<any> | undefined) {
    return this._continue({
      _layoutLoadingComponent: layoutLoadingComponent,
      // _layoutLoadingComponent: this._applyComponentDisplayName(layoutLoadingComponent || (() => null), {
      //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'LayoutLoading',
      // }),
    }) as never
  }

  pageLoading<TSelf>(this: TSelf, pageLoadingComponent: LoadingComponentType<'page'>): TSelf
  pageLoading(pageLoadingComponent: LoadingComponentType<'page'> | undefined) {
    // this._applyComponentDisplayName(pageLoadingComponent, {
    //   suffix: toCapitalizedCamelCase(this._letsReadyPointType || 'unknown') + 'PageLoading',
    // })
    return this._continue({
      _pageLoadingComponent: pageLoadingComponent,
    }) as never
  }

  componentLoading<TSelf>(this: TSelf, componentLoadingComponent: LoadingComponentType<'component'>): TSelf
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

  /**
   * Declare the loading UI for this point and everything below it — Point0 renders the nearest one up the chain while a
   * point's data is pending, so a page never writes a loading branch itself. Usually set once near the root. The
   * component gets `{ type }` ('page' | 'component' | 'layout') to branch on where it renders.
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): its body and the
   * imports it pulls in are removed from the server build. Kept in the client build always, and in the server build
   * only when SSR is on.
   *
   *     .loading(() => <Spinner size="3xl" />)
   *
   * Full reference: https://1gr14.dev/point0/latest/loading-error
   */
  loading(
    loadingComponent: LoadingComponentType<
      TLetsReadyPointType extends 'layout'
        ? 'layout'
        : TLetsReadyPointType extends 'component'
          ? 'component'
          : TLetsReadyPointType extends 'page' | 'provider'
            ? 'page'
            : 'page' | 'component' | 'layout'
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
      TQueriesDefinitions,
      TError
    >,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  loading(loadingComponent: LoadingComponentType<any> | undefined) {
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
        ...(loadingComponent && this._isMountablePoint()
          ? [
              {
                type: 'loadingComponent' as const,
                Component: loadingComponent,
                variant: this._getDestinationComponentVariant(),
                unstableId: Point0._getNextUnstableId(),
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

  /**
   * Wrap this point's render in a component — it receives `children` plus the point's props and renders around them.
   * Wrappers accumulate (outermost first) and are the place for per-point providers, frames, or boundaries. On page,
   * layout, component, provider.
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): its body and the
   * imports it pulls in are removed from the server build. Kept in the client build always, and in the server build
   * only when SSR is on.
   *
   *     .wrapper(({ children }) => <Card>{children}</Card>)
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  wrapper(
    wrapperComponent: WrapperComponentType<TLetsReadyPointType, TRouteDefinition, TOuterProps>,
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
      TQueriesDefinitions,
      TError
    >,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  wrapper(wrapperComponent: WrapperComponentType<any, any, any> | undefined) {
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    return this._continue({
      _mountActions: [...this._mountActions, ...selfQueryAction],
      _wrappers: wrapperComponent ? [...this._wrappers, wrapperComponent] : this._wrappers,
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
    }) as never
  }

  /**
   * Mount something onto this point. ONE signature (deliberately not overloads) covers every form:
   *
   *     with(point)                                inject a point's query (input optional). `point` is any point that
   *                                                  carries a query — a `.query()` OR a component/layout/page, which
   *                                                  is read as its query here (its data is injected, not its UI)
   *     with(point, input)                         ...input required when the point's input is required
   *     with(point, input, queryOptions)           ...plus react-query options
   *     with(point, input, queryOptions, resolve)  ...resolve (boolean | callback) is ALWAYS the 4th arg;
   *                                                   pass `undefined` for queryOptions if you only want it
   *     with(fn)                                   a with-fn returning queries (appended) or props (merged)
   *     with(channel, input?, connectionOptions?, gate?)  hold a connection for this mountable — it lands in
   *                                                  `connections` next to `queries` and the subtree gets the channel
   *                                                  context; by default only errors gate (`{ loading: false, error:
   *                                                  true }`) — the render is progressive but a failed connect surfaces
   *                                                  through the HOST's own loading/error. `gate: true` also waits on
   *                                                  the connect, `gate: false` renders through everything (pass
   *                                                  `undefined` connectionOptions for gate-only). NOTE: `gate` is
   *                                                  distinct from a query injection's `resolve` (which spreads data)
   *     with(space, input?, membershipOptions?, gate?)    hold a membership for this mountable — it lands in
   *                                                  `memberships` next to `connections`; same `gate` default, and the
   *                                                  space's channel connection is resolved from the chain
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): its body and the
   * imports it pulls in are removed from the server build. Kept in the client build always, and in the server build
   * only when SSR is on.
   *
   * WHY one signature and not overloads: with multiple overloads the language server can't decide which candidate to
   * complete `input` against, so autocomplete dies, and any mistake collapses to a useless "No overload matches this
   * call". A single signature instead gives member completion for `input`, a precise "Expected N arguments" when a
   * required input is omitted, and an exact per-argument error when it's wrong. The cost is the wall of conditional
   * types below — kept here in one readable place (and commented) rather than scattered into single-use aliases that
   * would only move the complexity and add many-param indirection.
   *
   * Everything below branches on what `arg0` is: an injected point (a query — OR a component/layout/page with own
   * loader, read as its query) vs a plain function (with-fn / with-query-fn). Three type params are inferred: `TArg`
   * (arg0), and the two halves of `resolve` (see below).
   *
   * RETURN: the same point, advanced one stage. Every type arg of the returned NiceStagePoint is this point's current
   * state passed through UNCHANGED — only the last two (inner props, queries) are recomputed, since `with` is the only
   * thing that can add props or queries. They're the two interesting positions.
   */
  with<
    // arg0 is exactly one of three things. The union is also the constraint, so passing anything
    // else (e.g. `() => 'a string'`) fails here with a normal "not assignable" error.
    TArg extends // 0. a channel point to hold a connection for — matched by its `Infer.PointType` brand. It lands in

        //    `connections` next to `queries`; the subtree gets the channel context; `gate` (default errors-only) gates the
        //    mountable on the connect with its own loading/error.

        | {
            Infer: {
              PointType: 'channel'
              IsInputOptional: boolean
              InputRawOrUndefined: any
              ServerLoaderOutput: any
              Error: any
            }
          }
        // 0b. a space point to hold a membership for — matched by its `Infer.PointType` brand. It lands in
        //    `memberships` next to `connections`; the subtree gets the space context; `gate` (default errors-only) gates
        //    the mountable on the join with its own loading/error.
        | {
            Infer: {
              PointType: 'space'
              IsInputOptional: boolean
              InputRawOrUndefined: any
              Room: any
              Error: any
            }
          }
        // 1. a point to inject as a query — a `.query()` or a callable component/layout/page. We only ever
        //    read its `Infer` shape (never call it), so a component point is injected for its query, not rendered.
        | {
            Infer: {
              IsInputOptional: boolean
              InputRawOrUndefined: any
              InputRawOrUndefinedOrVoid: any
              UseQueryOptions: any
              QueryResultType: 'query' | 'infiniteQuery'
              QueriedData: any
              Error: any
            }
          }
        // 2. a with-query-fn: a fn returning a query (or array of queries) — they get appended below.
        | WithQueryFn<
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
              TQueriesDefinitions,
              TError
            >,
            TConnectionsDefinitions,
            TMembershipsDefinitions,
            TMapperOutput,
            TError
          >
        // 3. a plain with-fn: a fn returning props (or a React element / nothing) — props get merged.
        | WithFn<
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
              TQueriesDefinitions,
              TError
            >,
            TConnectionsDefinitions,
            TMembershipsDefinitions,
            TMapperOutput,
            TError,
            Props
          >,
    // resolve: true -> data spread into props, false/omitted -> nothing, fn -> mapped props. QUERY injections ONLY.
    // Split into two params so an inline resolve callback infers correctly: `success` is typed
    // concretely inside the rest tuple (so the callback isn't context-sensitive), `TResolveMapped`
    // is inferred from its return, and `TResolveBool` captures the literal `true`.
    TResolveBool extends boolean = false,
    TResolveMapped extends Props | undefined = undefined,
    // a channel/space injection does NOT use TResolveBool — its trailing positional is `gate` (`Gate`), a pure render
    // gate that never narrows the appended connection/membership type (a connection has no data and a status that can
    // flip, so it always lands as the indeterminate facade — see the ConnectionsDefinitions/MembershipsDefinitions slots).
  >(
    // Only a *plain* with-fn is forbidden from returning an array (a frequent mistake: returning the
    // query data array directly). A with-query-fn legitimately returns an array of queries, and an
    // injected point (query / component / …) is read as a query — both skip the assert (`& unknown` is
    // a no-op). The point check comes FIRST because a *component* point IS callable (it renders), so
    // without it a component would fall into the with-fn branch and get the array assertion run on its
    // JSX return. `Infer` is the point brand — present on every point, absent on any plain fn.
    arg0: TArg &
      (TArg extends { Infer: { QueryResultType: QueryResultType } }
        ? unknown
        : TArg extends (...args: any[]) => any
          ? Awaited<ReturnType<TArg>> extends UseQueryOrInfiniteQueryResult | QueriesResults
            ? unknown
            : AssertNoArrayReturn<Awaited<ReturnType<TArg>>, 'With fn should not return array'>
          : unknown),
    // What follows arg0 depends on arg0 — and we must ask "is it a point?" BEFORE "is it a function?",
    // because a *component* point is both (callable AND a point). Discriminating on `Infer` (the point
    // brand) routes every injected point — query OR component — into the query form below:
    //  - an injected point takes [input, queryOptions?, resolve?] (the `input` is required iff the
    //    point's own input is required — that's the single `?` difference between the two branches)
    //  - anything else (a plain with-fn / with-query-fn — no `Infer`) takes no further args -> `[]`
    ...rest: TArg extends {
      Infer: {
        PointType: 'channel'
        IsInputOptional: infer TIsChannelInputOptional
        InputRawOrUndefined: infer TChannelInputRaw
        Error: infer TChannelError extends ErrorPoint0
      }
    }
      ? // a channel injection: [input?, connectionOptions?] — the options are the connection options plus
        // `resolve`; the `input` requiredness follows the channel's input schema, and it may be a fn deriving
        // the input from the mount options, like a query injection's.
        TIsChannelInputOptional extends true
        ? [
            input?:
              | TChannelInputRaw
              | ((
                  props: WithProps<
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
                      TQueriesDefinitions,
                      TError
                    >,
                    TConnectionsDefinitions,
                    TMembershipsDefinitions,
                    TMapperOutput,
                    TError
                  >,
                ) => TChannelInputRaw),
            connectionOptions?: ExtraUseConnectionOptions<
              TChannelError,
              ClientChannelConnection<TChannelInputRaw, TChannelError>
            >,
            gate?: Gate,
          ]
        : [
            input:
              | TChannelInputRaw
              | ((
                  props: WithProps<
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
                      TQueriesDefinitions,
                      TError
                    >,
                    TConnectionsDefinitions,
                    TMembershipsDefinitions,
                    TMapperOutput,
                    TError
                  >,
                ) => TChannelInputRaw),
            connectionOptions?: ExtraUseConnectionOptions<
              TChannelError,
              ClientChannelConnection<TChannelInputRaw, TChannelError>
            >,
            gate?: Gate,
          ]
      : TArg extends {
            Infer: {
              PointType: 'space'
              IsInputOptional: infer TIsSpaceInputOptional
              InputRawOrUndefined: infer TSpaceInputRaw extends UnknownData | EmptyObject | UndefinedSpaceInput
              Room: infer TSpaceRoom extends UnknownData | EmptyObject | UndefinedRoom
              ChannelInput: infer TSpaceChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput
              Error: infer TSpaceError extends ErrorPoint0
            }
          }
        ? // a space injection: [input?, membershipOptions?] — the options are the membership options plus
          // `resolve`; the `input` requiredness follows the space's input schema, and it may be a fn deriving
          // the input from the mount options, like a channel injection's.
          TIsSpaceInputOptional extends true
          ? [
              input?:
                | TSpaceInputRaw
                | ((
                    props: WithProps<
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
                        TQueriesDefinitions,
                        TError
                      >,
                      TConnectionsDefinitions,
                      TMembershipsDefinitions,
                      TMapperOutput,
                      TError
                    >,
                  ) => TSpaceInputRaw),
              membershipOptions?: ExtraUseMembershipOptions<TSpaceRoom>,
              gate?: Gate,
            ]
          : [
              input:
                | TSpaceInputRaw
                | ((
                    props: WithProps<
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
                        TQueriesDefinitions,
                        TError
                      >,
                      TConnectionsDefinitions,
                      TMembershipsDefinitions,
                      TMapperOutput,
                      TError
                    >,
                  ) => TSpaceInputRaw),
              membershipOptions?: ExtraUseMembershipOptions<TSpaceRoom>,
              gate?: Gate,
            ]
        : TArg extends {
              Infer: {
                IsInputOptional: infer TIsInputOptional
                InputRawOrUndefined: infer TInputRawOrUndefined
                UseQueryOptions: infer TUseQueryOptions
                QueryResultType: infer TQueryResultType extends QueryResultType
                QueriedData: infer TQueriedData extends Data
                Error: infer TQueryError extends ErrorPoint0
              }
            }
          ? // `input` is optional iff the query's input is optional. That single `?` on the tuple
            // element is what makes `with(query)` say "Expected 2 arguments" (instead of silently
            // passing) when the query actually requires an input. The two branches are identical
            // except for that `?`. `input` may also be a fn deriving the input from the mount options.
            TIsInputOptional extends true
            ? [
                input?:
                  | TInputRawOrUndefined
                  | ((
                      props: WithProps<
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
                          TQueriesDefinitions,
                          TError
                        >,
                        TConnectionsDefinitions,
                        TMembershipsDefinitions,
                        TMapperOutput,
                        TError
                      >,
                    ) => TInputRawOrUndefined),
                queryOptions?: TUseQueryOptions | undefined,
                resolve?:
                  TResolveBool | ResolveQueryCallback<TQueryResultType, TQueriedData, TQueryError, TResolveMapped>,
              ]
            : [
                input:
                  | TInputRawOrUndefined
                  | ((
                      props: WithProps<
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
                          TQueriesDefinitions,
                          TError
                        >,
                        TConnectionsDefinitions,
                        TMembershipsDefinitions,
                        TMapperOutput,
                        TError
                      >,
                    ) => TInputRawOrUndefined),
                queryOptions?: TUseQueryOptions | undefined,
                resolve?:
                  TResolveBool | ResolveQueryCallback<TQueryResultType, TQueriedData, TQueryError, TResolveMapped>,
              ]
          : []
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
    // ---- NiceStagePoint's TInnerProps slot — who adds props, and which ----
    // Point-first (a component point is callable, so it must be matched as a point before "function").
    TArg extends { Infer: { QueryResultType: QueryResultType } }
      ? // an injected point (query OR component, both read as a query): props change only via `resolve`.
        [TResolveMapped] extends [undefined]
        ? // no resolve callback ->
          TResolveBool extends true
          ? // resolve: true -> spread the query's data into props
            TArg extends { Infer: { QueriedData: infer TQueriedData } }
            ? TQueriedData extends Props
              ? AppendProps<TInnerProps, TQueriedData>
              : TInnerProps
            : TInnerProps
          : TInnerProps // resolve omitted/false -> props unchanged
        : // resolve callback -> merge in whatever it mapped to
          TResolveMapped extends Props
          ? AppendProps<TInnerProps, TResolveMapped>
          : TInnerProps
      : // a function (with-query-fn / with-fn). The `extends (...) => any` re-guard is what proves to
        // TypeScript that `ReturnType<TArg>` is legal here — outside the point branch, TArg's constraint
        // still allows the point member, so without it `ReturnType<TArg>` is rejected. The final `:`
        // arm is unreachable given the constraint (point | fn), it just keeps props unchanged.
        TArg extends (...args: any[]) => any
        ? Awaited<ReturnType<TArg>> extends UseQueryOrInfiniteQueryResult | QueriesResults
          ? TInnerProps // with-query-fn -> adds queries (below), not props
          : // plain with-fn -> merge in the props it returned (nothing to add if it returned undefined)
            IsUndefined<WithFnReturnProps<Awaited<ReturnType<TArg>>>> extends true
            ? TInnerProps
            : AppendProps<TInnerProps, WithFnReturnProps<Awaited<ReturnType<TArg>>>>
        : TInnerProps,
    // ---- NiceStagePoint's TQueriesDefinitions slot — who appends queries, and which ----
    // Point-first, same reason as the props slot above (a component point is callable but is a point).
    TArg extends { Infer: { QueryResultType: QueryResultType } }
      ? // an injected point (query OR component) -> append a definition for the query we just injected.
        [
          ...WithSelfQueryIfShouldBeFinalized<
            TPointType,
            TLetsReadyPointType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TQueriesDefinitions,
            TError
          >,
          {
            type: TArg extends { Infer: { QueryResultType: 'infiniteQuery' } } ? 'infiniteQuery' : 'query'
            data: TArg extends { Infer: { QueriedData: infer TQueriedData } } ? TQueriedData : never
            error: TArg extends { Infer: { Error: infer TQueryError } } ? TQueryError : never
          },
        ]
      : // a function. The `extends (...) => any` re-guard proves `ReturnType<TArg>` is legal here (outside
        // the point branch TArg's constraint still allows the point member). A with-query-fn appends the
        // queries it returned; a plain with-fn appends nothing. The final `:` arm is unreachable given the
        // constraint (point | fn) — it mirrors the plain-with-fn result, queries unchanged.
        TArg extends (...args: any[]) => any
        ? // `infer TNewQueries extends ...` re-narrows the return so the spread is provably an array.
          Awaited<ReturnType<TArg>> extends infer TNewQueries extends UseQueryOrInfiniteQueryResult | QueriesResults
          ? [
              ...WithSelfQueryIfShouldBeFinalized<
                TPointType,
                TLetsReadyPointType,
                TServerLoaderOutput,
                TClientLoaderOutput,
                TQueriesDefinitions,
                TError
              >,
              ...(TNewQueries extends QueriesResults
                ? QueriesDefinitionsByQueries<TNewQueries>
                : TNewQueries extends UseQueryOrInfiniteQueryResult
                  ? [QueryDefinitionByQuery<TNewQueries>]
                  : never),
            ]
          : // plain with-fn -> queries unchanged (the existing list, possibly with this point's own
            // self-query folded in when it's being finalized — that's what the helper does).
            WithSelfQueryIfShouldBeFinalized<
              TPointType,
              TLetsReadyPointType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TQueriesDefinitions,
              TError
            >
        : WithSelfQueryIfShouldBeFinalized<
            TPointType,
            TLetsReadyPointType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TQueriesDefinitions,
            TError
          >,
    // ---- NiceStagePoint's TConnectionsDefinitions slot — a channel injection appends its connection ----
    TArg extends {
      Infer: {
        PointType: 'channel'
        InputRawOrUndefined: infer TChannelInputRaw
        Error: infer TChannelError extends ErrorPoint0
      }
    }
      ? [
          // the injected connection is ALWAYS the indeterminate facade — a connection carries no data and its status
          // can flip (reconnect/kill) at any moment, so `gate` never narrows the type, it only gates the render
          ...TConnectionsDefinitions,
          ClientChannelConnection<TChannelInputRaw, TChannelError>,
        ]
      : TConnectionsDefinitions,
    // ---- NiceStagePoint's TMembershipsDefinitions slot — a space injection appends its membership ----
    TArg extends {
      Infer: {
        PointType: 'space'
        InputRawOrUndefined: infer TSpaceInputRaw extends UnknownData | EmptyObject | UndefinedSpaceInput
        Room: infer TSpaceRoom extends UnknownData | EmptyObject | UndefinedRoom
        ChannelInput: infer TSpaceChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput
        Error: infer TSpaceError extends ErrorPoint0
      }
    }
      ? [
          // the injected membership is ALWAYS the indeterminate facade — same reason as the connection above: no data,
          // a status that can flip, so `gate` gates the render but never narrows the type
          ...TMembershipsDefinitions,
          ClientSpaceMembership<TSpaceInputRaw, TSpaceRoom, TSpaceError, TSpaceChannelInput>,
        ]
      : TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  with(...args: any[]) {
    const _args = args as
      | [withFn?: WithFn<any, any, any, any, any, any, any, any, any, any> | undefined]
      | [
          point?: AnyPoint | undefined,
          input?: (
            props: WithProps<
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
                TQueriesDefinitions,
                TError
              >,
              TConnectionsDefinitions,
              TMembershipsDefinitions,
              TMapperOutput,
              TError
            >,
          ) => InputRaw,
          queryOptions?: ExtraUseQueryOptions | ExtraUseInfiniteQueryOptions<any, any, any, any, any, any> | undefined,
          resolve?: boolean | ResolveQueryCallback<any, any, TError, Props | undefined>,
        ]
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []

    // in case if we shake with for server without ssr
    if (!_args[0]) {
      return this._continue({
        _mountActions: [...this._mountActions, ...selfQueryAction],
        ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
      }) as never
    }

    // it is query injection
    if ('point' in _args[0]) {
      const [{ point }, inputFnOrInput, ...restArgs] = _args
      // `_args` is the untyped runtime surface — pin the injected point to the full class once
      const injected = point
      // queryOptions is always the 3rd arg, resolve always the 4th (pass undefined queryOptions for resolve-only).
      const [queryOptions, resolveCallback] = restArgs as [
        ExtraUseQueryOptions | ExtraUseInfiniteQueryOptions<any, any, any, any, any, any> | undefined,
        boolean | ResolveQueryCallback<any, any, TError, Props> | undefined,
      ]
      const getInputFn =
        typeof inputFnOrInput === 'function'
          ? inputFnOrInput
          : typeof inputFnOrInput === 'object'
            ? () => inputFnOrInput
            : () => ({})
      // a channel injection: hold a connection for this mountable — the third argument is the connection options,
      // the fourth the positional `resolve` (the same word and position a query injection gates with; a connection
      // lands in `connections`, never in props, so `gate` is a pure render gate). A closure like every other
      // `.with` — the hook runs inside it, `'loading'`/the error render through the HOST's own components (an
      // injected connection never brings the channel's), and the returned facade is what the interpreter lands in
      // the `connections` layer (providing the channel context around the subtree).
      if (injected.type === 'channel') {
        if (!_point0_env.feature.socket) {
          throw socketFeatureOffError(`.with(channel), point ${this.id}`)
        }
        const [connectionOptions, gateArg] = restArgs as [
          ExtraUseConnectionOptions<any, any> | undefined,
          Gate | undefined,
        ]
        const gate = normalizeGate(gateArg)
        const withConnectionFn: WithConnectionFn = (options) => {
          const input = getInputFn(options)
          const connection = useSocketConnection(injected, input as never, connectionOptions)
          if (gate.loading && connection.status === 'connecting') {
            return 'loading'
          }
          if (gate.error && connection.status === 'error' && connection.error) {
            return connection.error
          }
          return connection
        }
        return this._continue({
          _mountActions: [
            ...this._mountActions,
            ...selfQueryAction,
            { type: 'with', fn: withConnectionFn, unstableId: Point0._getNextUnstableId() },
          ],
          ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
        }) as never
      }
      // a space injection: hold a membership for this mountable — the third argument is the membership options, the
      // fourth the positional `gate` (a membership lands in `memberships`, never in props, so `gate` is a pure render
      // gate — default errors-only). Same closure shape as the channel injection, one level below.
      if (injected.type === 'space') {
        if (!_point0_env.feature.socket) {
          throw socketFeatureOffError(`.with(space), point ${this.id}`)
        }
        const [membershipOptions, gateArg] = restArgs as [ExtraUseMembershipOptions | undefined, Gate | undefined]
        const gate = normalizeGate(gateArg)
        const withMembershipFn: WithMembershipFn = (options) => {
          const input = getInputFn(options)
          const membership = useSpaceMembership(injected, input as never, membershipOptions)
          if (gate.loading && membership.status === 'joining') {
            return 'loading'
          }
          if (gate.error && membership.status === 'error' && membership.error) {
            return membership.error
          }
          return membership
        }
        return this._continue({
          _mountActions: [
            ...this._mountActions,
            ...selfQueryAction,
            { type: 'with', fn: withMembershipFn, unstableId: Point0._getNextUnstableId() },
          ],
          ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
        }) as never
      }
      const withQueryFn = ((options) => {
        const input = getInputFn(options)
        // a query-flavored serverHandler has no loader — its query rides the socket connection, so read it through
        // the socket hooks (they resolve the ambient connection/membership a preceding `.with(channel)`/`.with(space)`
        // provides and gate on OPEN/JOINED, so during SSR the query stays pending and never dehydrates).
        if (injected.type === 'serverHandler') {
          if (point._queryResultType === 'infiniteQuery') {
            return point.useSocketInfiniteQuery(input as never, queryOptions as never)
          } else {
            return point.useSocketQuery(input as never, queryOptions as never)
          }
        }
        if (point._queryResultType === 'infiniteQuery') {
          return point.useInfiniteQuery(input, queryOptions as never)
        } else {
          return point.useQuery(input, queryOptions)
        }
      }) as WithQueryFn<any, any, any, any, any, any, any, any, any, any>
      const withResolveFn = !resolveCallback
        ? undefined
        : ((({ queries, resolve }) => {
            const lastQuery = queries.at(-1)
            return resolveCallback === true ? resolve(lastQuery, true) : resolve(lastQuery, resolveCallback)
          }) as WithFn<any, any, any, any, any, any, any, any, any, any> | undefined)
      return this._continue({
        _mountActions: [
          ...this._mountActions,
          ...selfQueryAction,
          // { type: 'query', fn: queryFn, unstableId: Point0._getNextUnstableId() },
          {
            type: 'with',
            fn: withQueryFn,
            unstableId: Point0._getNextUnstableId(),
          },
          ...(withResolveFn
            ? [
                {
                  type: 'with' as const,
                  fn: withResolveFn,
                  unstableId: Point0._getNextUnstableId(),
                },
              ]
            : []),
        ],
        ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
      }) as never
      // }
    }

    // it is with fn
    const [withFn] = _args
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

  /**
   * Attach a related query to this mountable — like `.with(query)`, it adds the query to the point's `queries` array
   * and `data`. The difference is PREFETCH: a related query is statically discoverable, so prefetch self-fetches it
   * WITHOUT rendering, under the cheap policies (`serverQuery`/`clientQuery`/`serverAndClientQuery`); a `.with(query)`
   * is only discovered by rendering, so it's prefetched only under `pageDehydratedState*` (the expensive SSR render).
   *
   * Server-and-client — kept on both bundles (isomorphic; the query runs from whichever side calls it).
   *
   *     .relatedQuery(authorQuery)                            // input optional
   *     .relatedQuery(authorQuery, ({ data }) => ({ id: data.authorId })) // input from this point's data
   *     .relatedQuery()                                       // no-arg passthrough (finalizes a self-query)
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  relatedQuery<
    TPoint extends {
      point: AnyPoint
      Infer: {
        IsInputOptional: boolean
        InputRawOrUndefined: any
        UseQueryOptions: any
        QueryResultType: 'query' | 'infiniteQuery'
        QueriedData: any
        Error: any
      }
    },
  >(
    ...args: TLetsReadyPointType extends MountablePointType | 'plugin'
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
        TQueriesDefinitions,
        TError
      >,
      {
        type: TPoint['Infer']['QueryResultType'] extends 'infiniteQuery' ? 'infiniteQuery' : 'query'
        data: TPoint['Infer']['QueriedData']
        error: TPoint['Infer']['Error']
      },
    ],
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
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
        },
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
    }) as never
  }

  // scroll restoration

  /**
   * Point scroll restoration at the scroll container when it isn't the window — a CSS selector, an element getter, or
   * explicit `{ x, y }` accessors. On page and layout.
   *
   * Client-only — stripped from the server bundle (runs in the browser, regardless of SSR).
   *
   *     .scrollPosition('#scroll-root')                      // CSS selector
   *     .scrollPosition(() => document.querySelector('main')) // element getter
   *     .scrollPosition(getScroll, setScroll)                // explicit { x, y } accessors
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  scrollPosition<TSelf>(this: TSelf, documentElementGetter: () => HTMLElement | null): TSelf
  scrollPosition<TSelf>(this: TSelf, selector: string): TSelf
  scrollPosition<TSelf>(this: TSelf, getter: ScrollPositionGetter, setter: ScrollPositionSetter): TSelf
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >({
      _scrollPositionGetter: getter,
      _scrollPositionSetter: setter,
    }) as never
  }

  /**
   * Decide whether to restore scroll on navigation: `true` restores, `false` leaves it, `null` scrolls to top, or a `({
   * prevLocation, type }) => …` policy. Default restores on back/forward (`pop`), scrolls to top on `push`. On page and
   * layout.
   *
   * Applies to navigation _within_ the app. A DOCUMENT LOAD (reload, cross-document back/forward) of a hashless URL is
   * restored by the BROWSER — before the first paint, which no JS restore can match — so this policy does not gate it.
   * Point0 restores such a load itself only where the browser demonstrably cannot: content that arrives after the first
   * paint, a custom scroll container (no browser restores element scroll, in any mode), a `#hash` URL, or `ssr:
   * false`.
   *
   * Client-only — stripped from the server bundle (runs in the browser, regardless of SSR).
   *
   *     .scrollRestore(true)                                 // boolean / null
   *     .scrollRestore(({ type }) => type === 'pop')         // policy fn
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  scrollRestore<TSelf>(
    this: TSelf,
    // true - restore, false - do not restore, null - set {x: 0, y: 0}
    policy: ScrollPositionRestorePolicy | boolean | null | undefined, // undefined in case if it was shaked for serverNoSsr
  ): TSelf
  scrollRestore(
    // true - restore, false - do not restore, null - set {x: 0, y: 0}
    policy: ScrollPositionRestorePolicy | boolean | null | undefined, // undefined in case if it was shaked for serverNoSsr
  ) {
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >({
      _scrollPositionRestorePolicy: typeof policy === 'function' ? policy : () => policy ?? null,
    }) as never
  }

  // middlewares

  /**
   * Add server-side middleware that runs around a request (Express/Koa style), optionally scoped by route or method.
   * Server-only — the body is stripped from the client bundle (runs server-side). Use it to mount things OUTSIDE the
   * point model (CORS, a third-party auth handler, an OpenAPI server); for data and access control use loaders, `.ctx`,
   * and `.with` instead.
   *
   *     .middleware(({ next }) => next())                                       // (…fns) — every request
   *     .middleware('/api/auth/*', ({ request }) => authServer.handler(request.original)) // (route, …fns)
   *     .middleware('POST', '/api/upload', limitBody)                           // (method, route, …fns)
   *
   * Full reference: https://1gr14.dev/point0/latest/middleware
   */
  middleware<TSelf>(
    this: TSelf,
    ...middlewares: [MiddlewareFn<TError, undefined>, ...MiddlewareFn<TError, undefined>[]]
  ): TSelf
  middleware<TSelf, TProvidedRoute extends RouteDefinition>(
    this: TSelf,
    route: TProvidedRoute,
    ...middlewares: [
      MiddlewareFn<TError, ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>,
      ...MiddlewareFn<TError, ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>[],
    ]
  ): TSelf
  middleware<TSelf, TProvidedRoute extends AnyRoute>(
    this: TSelf,
    route: TProvidedRoute,
    ...middlewares: [
      MiddlewareFn<TError, TProvidedRoute['definition']>,
      ...MiddlewareFn<TError, TProvidedRoute['definition']>[],
    ]
  ): TSelf
  middleware<TSelf, TProvidedRoute extends RouteDefinition>(
    this: TSelf,
    method: WideRequestMethod | WideRequestMethod[],
    route: TProvidedRoute,
    ...middlewares: [
      MiddlewareFn<TError, ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>,
      ...MiddlewareFn<TError, ExtendRouteDefinition<TRouteDefinition, TProvidedRoute>>[],
    ]
  ): TSelf
  middleware<TSelf, TProvidedRoute extends AnyRoute>(
    this: TSelf,
    method: WideRequestMethod | WideRequestMethod[],
    route: TProvidedRoute,
    ...middlewares: [
      MiddlewareFn<TError, TProvidedRoute['definition']>,
      ...MiddlewareFn<TError, TProvidedRoute['definition']>[],
    ]
  ): TSelf
  middleware(
    ...args:
      | [...middlewares: [MiddlewareFn<TError, any>, ...MiddlewareFn<TError, any>[]]]
      | [route: RouteDefinition | AnyRoute, ...middlewares: [MiddlewareFn<TError, any>, ...MiddlewareFn<TError, any>[]]]
      | [
          method: WideRequestMethod | WideRequestMethod[],
          route: RouteDefinition | AnyRoute,
          ...middlewares: [MiddlewareFn<TError, any>, ...MiddlewareFn<TError, any>[]],
        ]
      | []
  ) {
    const isFunction = (arg: any): arg is MiddlewareFn<TError, any> => {
      return typeof arg === 'function'
    }
    const middleware = ((): MiddlewareFn<TError, any> => {
      if (_point0_env.side.is.client || args.length === 0 || args[0] === undefined) {
        return ({ next }: MiddlewareProps<TError>) => next()
      }
      if (isFunction(args[0])) {
        return mergeMiddlewares(args as MiddlewareFn<TError, any>[])
      }
      if (isFunction(args[1])) {
        const route = (() => {
          if (!args[0]) {
            throw new Error(`Route is required for middleware in point ${this.toStringWithLocation()}`)
          }
          if (typeof args[0] === 'string') {
            return this.route?.extend(args[0]) ?? Route0.create(args[0])
          }
          return args[0] as AnyRoute
        })()
        const middlewares = args.slice(1) as MiddlewareFn<TError, any>[]
        const mergedMiddlewares = mergeMiddlewares(middlewares)
        const hasParams = route.getParamsKeys().length > 0
        return (props: MiddlewareProps<TError>) => {
          if (route.isExact(props.request.location.pathname)) {
            const params = hasParams ? route.getRelation(props.request.location).params : undefined
            const propsWithParams = hasParams ? { ...props, params } : props
            return mergedMiddlewares(propsWithParams)
          }
          return props.next()
        }
      }
      if (isFunction(args[2])) {
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
        const middlewares = args.slice(2) as MiddlewareFn<TError, any>[]
        const mergedMiddlewares = mergeMiddlewares(middlewares)
        const hasParams = route.getParamsKeys().length > 0
        return (props: MiddlewareProps<TError>) => {
          if (methods.includes(props.request.method) && route.isExact(props.request.location.pathname)) {
            const params = hasParams ? route.getRelation(props.request.location).params : undefined
            const propsWithParams = hasParams ? { ...props, params } : props
            return mergedMiddlewares(propsWithParams)
          }
          return props.next()
        }
      }
      throw new Error(`Invalid middleware arguments in point ${this.toStringWithLocation()}`)
    })()
    return this._continue({
      _middlewares: [...this._middlewares, middleware],
    }) as never
  }

  // prefetch mode

  /**
   * Run a side-effect when this page/layout is prefetched (warm a cache, kick off an analytics ping). Runs on BOTH
   * sides (use `.serverOnPrefetchPage` / `.clientOnPrefetchPage` for one side): on the server once before the first SSR
   * render, and on the client during navigation/hover prefetch. Accumulates across calls. On base, page, layout,
   * plugin.
   *
   * Server-and-client — kept in both bundles (the body runs on both sides).
   *
   *     .onPrefetchPage(({ location }) => warmCache(location))
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  onPrefetchPage<TSelf>(
    this: TSelf,
    fn: TLetsReadyPointType extends 'page'
      ? OnPrefetchMountableFn<PageLocation<TRouteDefinition>, TOuterProps>
      : TLetsReadyPointType extends 'layout'
        ? OnPrefetchMountableFn<LayoutLocation<TRouteDefinition>, TOuterProps>
        : OnPrefetchMountableFn<AnyLocation, TOuterProps>,
  ): TSelf
  onPrefetchPage(
    fn: TLetsReadyPointType extends 'page'
      ? OnPrefetchMountableFn<PageLocation<TRouteDefinition>, TOuterProps>
      : TLetsReadyPointType extends 'layout'
        ? OnPrefetchMountableFn<LayoutLocation<TRouteDefinition>, TOuterProps>
        : OnPrefetchMountableFn<AnyLocation, TOuterProps>,
  ) {
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      _onPrefetchMountableFns: [...this._onPrefetchMountableFns, (fn ?? (() => undefined)) as never],
    }) as never
  }

  /**
   * Like `.onPrefetchPage`, but runs on the SERVER side only — once before the first SSR render. The body (and the
   * imports it pulls in) is stripped from the client bundle, so it can use server-only code. Accumulates across calls.
   * On base, page, layout, plugin.
   *
   * Server-only — the body is stripped from the client bundle (runs server-side, before the first render).
   *
   *     .serverOnPrefetchPage(({ location }) => warmServerCache(location))
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  serverOnPrefetchPage<TSelf>(
    this: TSelf,
    fn: TLetsReadyPointType extends 'page'
      ? OnPrefetchMountableFn<PageLocation<TRouteDefinition>, TOuterProps>
      : TLetsReadyPointType extends 'layout'
        ? OnPrefetchMountableFn<LayoutLocation<TRouteDefinition>, TOuterProps>
        : OnPrefetchMountableFn<AnyLocation, TOuterProps>,
  ): TSelf
  serverOnPrefetchPage(
    fn?: TLetsReadyPointType extends 'page'
      ? OnPrefetchMountableFn<PageLocation<TRouteDefinition>, TOuterProps>
      : TLetsReadyPointType extends 'layout'
        ? OnPrefetchMountableFn<LayoutLocation<TRouteDefinition>, TOuterProps>
        : OnPrefetchMountableFn<AnyLocation, TOuterProps>,
  ) {
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >({
      _onPrefetchMountableFns: fn ? [...this._onPrefetchMountableFns, fn as never] : [...this._onPrefetchMountableFns],
    }) as never
  }

  /**
   * Like `.onPrefetchPage`, but runs on the CLIENT side only — during navigation/hover prefetch. The body (and the
   * imports it pulls in) is stripped from the server bundle. Accumulates across calls. On base, page, layout, plugin.
   *
   * Client-only — the body is stripped from the server bundle (runs in the browser during prefetch, regardless of SSR).
   *
   *     .clientOnPrefetchPage(({ location }) => warmClientCache(location))
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  clientOnPrefetchPage<TSelf>(
    this: TSelf,
    fn: TLetsReadyPointType extends 'page'
      ? OnPrefetchMountableFn<PageLocation<TRouteDefinition>, TOuterProps>
      : TLetsReadyPointType extends 'layout'
        ? OnPrefetchMountableFn<LayoutLocation<TRouteDefinition>, TOuterProps>
        : OnPrefetchMountableFn<AnyLocation, TOuterProps>,
  ): TSelf
  clientOnPrefetchPage(
    fn?: TLetsReadyPointType extends 'page'
      ? OnPrefetchMountableFn<PageLocation<TRouteDefinition>, TOuterProps>
      : TLetsReadyPointType extends 'layout'
        ? OnPrefetchMountableFn<LayoutLocation<TRouteDefinition>, TOuterProps>
        : OnPrefetchMountableFn<AnyLocation, TOuterProps>,
  ) {
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >({
      _onPrefetchMountableFns: fn ? [...this._onPrefetchMountableFns, fn as never] : [...this._onPrefetchMountableFns],
    }) as never
  }

  /**
   * How aggressively a page prefetches on link hover. 2nd arg is the hover delay in ms (default 30). `false` / `'none'`
   * disables it. `serverAndClientQuery` is the cheap policy; `pageDehydratedState` runs a full SSR render (expensive,
   * needs SSR). On root, base, page, layout.
   *
   * Client-only — stripped from the server bundle (the hover trigger runs in the browser).
   *
   *     .prefetchPageOnLinkHover('serverAndClientQuery')      // policy only
   *     .prefetchPageOnLinkHover('serverAndClientQuery', 200) // policy + hover delay (ms)
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  prefetchPageOnLinkHover<TSelf>(this: TSelf, policy: PrefetchPagePolicy, duration?: number): TSelf
  prefetchPageOnLinkHover(
    policy?: PrefetchPagePolicy, // in case if it was shaked for nossr server
    duration?: number,
  ) {
    this._throwIfDehydrationPolicyWithoutSsr(policy)
    return this._continue({
      _polhPolicy: policy,
      ...(duration !== undefined ? { _polhDuration: duration } : {}),
    }) as never
  }

  /**
   * How aggressively a page prefetches when a navigation starts. Same policy values as `.prefetchPageOnLinkHover`. On
   * root, base, page, layout.
   *
   * Client-only — stripped from the server bundle (the navigate trigger runs in the browser).
   *
   *     .prefetchPageOnNavigate('serverAndClientQuery')
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  prefetchPageOnNavigate<TSelf>(this: TSelf, policy: PrefetchPagePolicy): TSelf
  prefetchPageOnNavigate(
    policy?: PrefetchPagePolicy, // in case if it was shaked for nossr server
  ) {
    this._throwIfDehydrationPolicyWithoutSsr(policy)
    return this._continue({
      _ponPolicy: policy,
    }) as never
  }

  /**
   * Convenience that sets BOTH the navigate and link-hover prefetch policies at once (2nd arg is the hover delay). Thin
   * wrapper over `.prefetchPageOnNavigate` + `.prefetchPageOnLinkHover`. On root, base, page, layout (not plugins).
   *
   * Client-only — cut from the server bundle, like the two triggers it sets (they fire on client-side navigation).
   *
   *     .prefetchPagePolicy('serverAndClientQuery')          // policy only
   *     .prefetchPagePolicy('serverAndClientQuery', 200)     // policy + hover delay (ms)
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  prefetchPagePolicy<TSelf>(this: TSelf, policy: PrefetchPagePolicy, duration?: number): TSelf
  prefetchPagePolicy(
    policy?: PrefetchPagePolicy, // in case if it was shaked for nossr server
    duration?: number,
  ) {
    this._throwIfDehydrationPolicyWithoutSsr(policy)
    return this._continue({
      _polhPolicy: policy,
      _ponPolicy: policy,
      ...(duration !== undefined ? { _polhDuration: duration } : {}),
    }) as never
  }

  // transformer

  /**
   * Set how Point0 serializes data crossing the wire — query inputs/outputs, request bodies, the SSR dehydrated state,
   * and the query key. Default is plain JSON (no `Date`/`Map`/`Set`/`BigInt`); pass `superjson` and those round-trip.
   * Root only. Takes any `{ serialize, deserialize }` pair. A CHANNEL opts its wire out of the transformer with the
   * `preventTransformer` channel option, not here. A transformer that answers `undefined` for a value that MUST
   * serialize (a key, a body, a frame, the dehydrated state) fails loud with `POINT0_SERIALIZE_FAILED` — nothing
   * downstream may key or frame on `undefined`.
   *
   * Server-and-client — kept on both bundles (both sides serialize/deserialize the wire).
   *
   *     .transformer(superjson)
   *
   * Full reference: https://1gr14.dev/point0/latest/transformer
   */
  transformer<TSelf>(this: TSelf, transformer: DataTransformer): TSelf
  transformer(transformer: DataTransformer) {
    return this._continue({
      _transformer: toExtendedTransformer(transformer),
    }) as never
  }

  // middlewares

  /**
   * Add values to a server-only context, computed once per request before the loaders. What you return is
   * shallow-merged into the running ctx; every later `.ctx` and the `.loader` can read it. Use it for request-scoped
   * values (the current user, a flag).
   *
   * Server-only — the callback (and its imports) is stripped from the client bundle (runs server-side).
   *
   *     .ctx(async ({ request }) => ({ me: await getMe({ request }) }))
   *
   * Full reference: https://1gr14.dev/point0/latest/ctx
   */
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
      Ctx | RedirectTask | undefined
    >,
  >(
    ctxFn: TCtxFn &
      AssertNoArrayReturn<IfNeverThen<Awaited<ReturnType<TCtxFn>>, undefined>, 'Ctx fn should not return array'> &
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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
      Ctx | RedirectTask | undefined
    >,
  >(
    ctxFn: TCtxFn &
      AssertNoArrayReturn<IfNeverThen<Awaited<ReturnType<TCtxFn>>, undefined>, 'Ctx fn should not return array'> &
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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
      Ctx | RedirectTask | undefined
    >,
    TCtxFnExposedKeys extends Extract<keyof InferCtxFnOutputCtxAppend<TCtxFn>, string>,
  >(
    ctxFn: TCtxFn &
      AssertNoArrayReturn<IfNeverThen<Awaited<ReturnType<TCtxFn>>, undefined>, 'Ctx fn should not return array'> &
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  ctx(ctxOrFn?: CtxFn | Ctx, expose?: true | string[]) {
    this._assertSetupStageAllowed('ctx')
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

  /**
   * The callback that produces this point's data, running on the SERVER. Each point has one loader; whatever it returns
   * becomes the point's `data`. Putting a `.loader` on a mountable also makes that point a query (it gets `useQuery`,
   * `fetchQuery`, …). Call it with no args for a passthrough loader — marks the point as server-loaded (so it still
   * gets a server request and ctx) without custom logic.
   *
   * Server-only — the body (and every import only it uses — your DB client included) is stripped from the client bundle
   * (runs server-side).
   *
   *     .loader(async ({ input }) => ({ idea: await prisma.idea.findUniqueOrThrow({ where: { id: input.id } }) })) // fn form
   *     .loader()                                            // no-arg passthrough (server request + ctx, no logic)
   *
   * Full reference: https://1gr14.dev/point0/latest/loader
   */
  loader<
    // the constraint IS the callback's contextual type, so it is stage-exact: the subscription stage takes the async
    // generator with a required `signal`; the action stage takes the standard loader OR a generator (`signal`
    // optional) — a stream on the action's own method/path closes with `.subscription()`; everything else takes the
    // standard loader. One overload on purpose: contextual typing binds a callback to the FIRST overload candidate
    // and keeps it (a `never`-gated earlier overload still poisons it), so the stage dispatch must live in the type
    TLoaderResponseFn extends (TLetsReadyPointType extends 'subscription'
      ? SubscriptionLoaderFn<
          TCtx,
          TCtxExposedKeys,
          TServerInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema,
          THeadersSchema,
          TCookiesSchema,
          TError,
          UnknownData
        >
      : TLetsReadyPointType extends 'action'
        ? ActionLoaderFnWithStream<
            TCtx,
            TCtxExposedKeys,
            TServerLoaderOutput,
            TServerInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema,
            THeadersSchema,
            TCookiesSchema,
            TError
          >
        : LoaderFn<
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
            TError
          >),
  >(
    loaderFn: TLetsReadyPointType extends 'mutation' | 'action' | 'subscription'
      ? TLoaderResponseFn & AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'loader'>
      : //  &
        // AssertNoArrayReturn<InferLoaderResponseFnOutput<TLoaderResponseFn>, 'Loader fn should not return array'>
        // AssertNotUnknownLoaderOutput<TNewServerLoaderOutput>
        TLoaderResponseFn &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'loader'> &
          // AssertNoArrayReturn<InferLoaderResponseFnOutput<TLoaderResponseFn>, 'Loader fn should not return array'> &
          AssertResponseNotAllowed<InferLoaderFnOutput<TLoaderResponseFn>, ReadyPointTypeOrNever<TLetsReadyPointType>>, // AssertNotUnknownLoaderOutput<TNewServerLoaderOutput>
  ): NiceStagePoint<
    // one loader per point: always move to the single "loaded" stage (no more loaders/setup, only finalize)
    'loadedStage',
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    // a generator loader's data is the union of its yields; everything else keeps the standard inference
    TLetsReadyPointType extends 'subscription' | 'action'
      ? ReturnType<TLoaderResponseFn> extends AsyncIterable<any>
        ? IfNeverThen<InferSubscriptionYield<TLoaderResponseFn>, EmptyData>
        : IfNeverThen<InferLoaderFnOutput<TLoaderResponseFn>, EmptyData>
      : IfNeverThen<InferLoaderFnOutput<TLoaderResponseFn>, EmptyData>,
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
    // a generator loader marks the point 'subscription' — what `.subscription()` requires and `.action()` rejects
    TLetsReadyPointType extends 'subscription'
      ? 'subscription'
      : TLetsReadyPointType extends 'action'
        ? ReturnType<TLoaderResponseFn> extends AsyncIterable<any>
          ? 'subscription'
          : TQueryResultType
        : TQueryResultType,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  // no-arg passthrough loader: marks the point as having a (server) loader without custom logic,
  // so the point still gets a server request/ctx. Allowed only before the single loader.
  loader(
    ...args: TPointType extends 'loadedStage' | 'finalStage'
      ? [AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'loader'>]
      : []
  ): NiceStagePoint<
    'loadedStage',
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput extends undefined ? EmptyData : TServerLoaderOutput,
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  loader(...args: any[]) {
    this._assertSetupStageAllowed('loader')
    const loaderFn = (args[0] ?? ((c: any) => c.data)) as LoaderFn<
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
    return this._continue({
      type: 'loadedStage',
      // _queryResultType: this._normalizeQueryResultType('query'),
      _hasServerLoader: true,
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  /**
   * Like `.loader`, but the callback runs in the BROWSER instead of on the server — no HTTP endpoint. A query or
   * mutation with only a `.clientLoader()` runs entirely client-side. Whatever it returns becomes the point's `data`.
   * Call it with no args for a passthrough (passes the existing `data` through).
   *
   * Client-only — the body is stripped from the server bundle (runs in the browser, regardless of SSR).
   *
   *     .clientLoader(async ({ input }) => ({ profile: await localApi.getProfile(input.id) })) // fn form
   *     .clientLoader()                                      // no-arg passthrough
   *
   * Full reference: https://1gr14.dev/point0/latest/loader
   */
  clientLoader<
    TClientLoaderFn extends ClientLoaderFn<
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TServerLoaderOutput,
      TClientLoaderOutput
    >,
  >(
    clientLoaderFn: TLetsReadyPointType extends 'mutation'
      ? TClientLoaderFn & AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientLoader'>
      : TClientLoaderFn &
          AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientLoader'> &
          AssertResponseNotAllowed<
            InferClientLoaderFnOutput<TClientLoaderFn>,
            ReadyPointTypeOrNever<TLetsReadyPointType>
          >,
  ): NiceStagePoint<
    InferClientLoaderFnOutput<TClientLoaderFn> extends Response ? 'finalStage' : 'loadedStage', // response can happen only in mutation, so we not care about this happen in mountable
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    IfNeverThen<InferClientLoaderFnOutput<TClientLoaderFn>, EmptyData>,
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
    TQueriesDefinitions, // so here we not try to finalize query, becouse for mutation it is not needed at all, and in mountable can not happen becouse it can not return response
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
    // WithSelfQueryIfShouldBeFinalized<
    //   TNewClientLoaderOutput extends Response ? 'finalStage' : 'clientStage',
    //   TLetsReadyPointType,
    //   TServerLoaderOutput,
    //   TNewClientLoaderOutput,
    //   TQueriesDefinitions
    // >
  >
  clientLoader(clientLoaderFn: ClientLoaderFn<any, any, any, any, any, any> | undefined) {
    this._assertSetupStageAllowed('clientLoader')
    // in case if we shake clientLoader for server without ssr side
    clientLoaderFn ||= (o: any) => o.data
    return this._continue({
      // it should be finalStage if the client loader returns a response, but we know that only by types;
      // ok to keep loadedStage at runtime — it is really finalized later by one of the finalizers
      type: 'loadedStage',
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

  /**
   * Fold the loader and query results into the final `data` your render reads. By default `data` is the first query's
   * data; once you add a `.mapper`, `data` is whatever it returns. One synchronous function getting `{ data, queries,
   * props, location }`. Reach for it when a point pulls several queries together or a query's shape isn't the shape
   * your component wants. On a provider, the mapper's return value IS the provided value.
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): its body and the
   * imports it pulls in are removed from the server build. Kept in the client build always, and in the server build
   * only when SSR is on.
   *
   *     .mapper(({ data }) => ({ ideas: data.pages.flatMap((p) => p.ideas) }))
   *
   * Full reference: https://1gr14.dev/point0/latest/mapper
   */
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
        TQueriesDefinitions,
        TError
      >,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
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
      TQueriesDefinitions,
      TError
    >,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  mapper(mapperFn: MapperFn<any, any, any, any, any, any, any, any, any, any> | undefined) {
    // in case if we shake mapper for server without ssr side
    mapperFn ||= ((o) => o.data) as MapperFn<any, any, any, any, any, any, any, any, any, any>
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    return this._continue({
      _mountActions: [
        ...this._mountActions,
        ...selfQueryAction,
        { type: 'mapper', fn: mapperFn, unstableId: Point0._getNextUnstableId() },
      ],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query', type: 'finalStage' } : {}),
    }) as never
  }

  /**
   * Set the document `<head>` for this point — title, SEO meta, canonical. Built on unhead: pass a string, an object,
   * or a function of the per-state context (`data` is the loaded data), so the head can come from your data. Rendered
   * as real `<meta>` on the server and updated on client navigation. Per-state and inherited up the chain; needs
   * `UnheadProvider` mounted. Pass a status first (`'loading' | 'error' | 'success' | 'universal' | 'global'`) to
   * target one render state; `head('global', …)` is the app-wide base head.
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): its body and the
   * imports it pulls in are removed from the server build. Kept in the client build always, and in the server build
   * only when SSR is on.
   *
   *     .head('Ideas')                                       // string shorthand (title)
   *     .head({ title: 'Ideas', meta: [{ name: 'robots', content: 'noindex' }] }) // object
   *     .head(({ data: { idea } }) => ({ title: idea.title, description: idea.content.slice(0, 140) })) // fn of state
   *     .head('loading', { title: 'Loading…' })              // per-status: 'loading' | 'error' | 'success' | 'global'
   *
   * Full reference: https://1gr14.dev/point0/latest/head
   */
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
            TQueriesDefinitions,
            TError
          >,
          TConnectionsDefinitions,
          TMembershipsDefinitions,
          TMapperOutput,
          TError
        >
      | HeadObject
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
      TQueriesDefinitions,
      TError
    >,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  head<TStatus extends 'loading' | 'error' | 'success' | 'universal' | 'global'>(
    status: TStatus,
    head: TStatus extends 'global'
      ? GlobalHeadFn<any, LocationOrAnyLocation<MountableLocation<TLetsReadyPointType, TRouteDefinition>>> | HeadObject
      : | HeadFn<
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
              TQueriesDefinitions,
              TError
            >,
            TConnectionsDefinitions,
            TMembershipsDefinitions,
            TMapperOutput,
            TError
          >
        | HeadObject
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
      TQueriesDefinitions,
      TError
    >,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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
                TConnectionsDefinitions,
                TMembershipsDefinitions,
                TMapperOutput,
                ErrorPoint0
              >
            | HeadObject
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
                TConnectionsDefinitions,
                TMembershipsDefinitions,
                TMapperOutput,
                ErrorPoint0
              >
            | HeadObject
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
          : [
              {
                type: 'head' as const,
                fn: headFn,
                unstableId: Point0._getNextUnstableId(),
              },
            ]),
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

  /**
   * Attach the input schema for a query / infiniteQuery / mutation / component / provider. The input is parsed and
   * typed everywhere it flows — loader, component, cache key, OpenAPI spec — and validated at every call site. Any
   * Standard Schema library (zod, valibot, arktype, …) or a plain validate function works.
   *
   * Server-and-client on a non-action mountable (isomorphic — kept on both bundles); server-only on an action (the
   * server schema is stripped from the client bundle).
   *
   *     .input(z.object({ id: z.number() }))           // schema form (any Standard Schema)
   *     .input((raw) => parseQuery(raw))               // custom validate-fn form
   *     .input<{ id: number }>()                       // no-arg, type-only (no runtime validation)
   *
   * Full reference: https://1gr14.dev/point0/latest/validation
   */
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  input(...args: any[]) {
    this._assertSetupStageAllowed('input')
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'input', schema, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  /**
   * Like `.input`, but the schema is validated on the CLIENT only — input that never reaches the server loader (e.g.
   * params used purely by a `.clientLoader` or a `.with` selector). Pairs with `.input` (server) and `.sharedInput`.
   *
   * Client-only — the schema is stripped from the server bundle (validated in the browser, regardless of SSR).
   *
   *     .clientInput(z.object({ tab: z.string() }))    // schema form
   *     .clientInput((raw) => parseTab(raw))           // custom validate-fn form
   *     .clientInput<{ tab: string }>()                // no-arg, type-only
   *
   * Full reference: https://1gr14.dev/point0/latest/validation
   */
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  clientInput(...args: any[]) {
    this._assertSetupStageAllowed('clientInput')
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _clientExecuteActions: [
        ...this._clientExecuteActions,
        { type: 'input', schema, unstableId: Point0._getNextUnstableId() },
      ],
      _mountActions: [...this._mountActions, { type: 'input', schema, unstableId: Point0._getNextUnstableId() }],
    }) as never
  }

  /**
   * Like `.input`, but the schema applies on BOTH the server and the client at once — shorthand for the common case
   * where the same input is validated on each side. Equivalent to declaring `.input` and `.clientInput` with the same
   * schema.
   *
   * Server-and-client — kept on both bundles (it is `.input` + `.clientInput`, so each side validates).
   *
   *     .sharedInput(z.object({ id: z.number() }))     // schema form
   *     .sharedInput((raw) => parseId(raw))            // custom validate-fn form
   *     .sharedInput<{ id: number }>()                 // no-arg, type-only
   *
   * Full reference: https://1gr14.dev/point0/latest/validation
   */
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  sharedInput(...args: any[]) {
    this._assertSetupStageAllowed('sharedInput')
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

  /**
   * Attach the schema for a page/layout/action's route segments — the `:id` parts of `/ideas/:id`. Parsed and typed
   * into `params` everywhere it flows. Use coercion (`z.coerce.number()`) since route segments arrive as strings.
   *
   * Server-and-client on a non-action mountable (isomorphic — kept on both bundles); server-only on an action (the
   * schema is stripped from the client bundle).
   *
   *     .page('/ideas/:id').params(z.object({ id: z.coerce.number() })) // schema form
   *     .params((raw) => ({ id: Number(raw.id) }))                      // custom validate-fn form
   *
   * Full reference: https://1gr14.dev/point0/latest/validation
   */
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  params(...args: any[]) {
    this._assertSetupStageAllowed('params')
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

  /**
   * Attach the schema for a page/layout/action's query string — `?page=2&limit=10`. Parsed and typed into `search`,
   * with `setSearch` available in the render. Use coercion/defaults since query values arrive as strings.
   *
   * Server-and-client on a non-action mountable (isomorphic — kept on both bundles); server-only on an action (the
   * schema is stripped from the client bundle).
   *
   *     .page('/ideas').search(z.object({ page: z.coerce.number().default(0) })) // schema form
   *     .search((raw) => ({ page: Number(raw.page ?? 0) }))            // custom validate-fn form
   *
   * Full reference: https://1gr14.dev/point0/latest/validation
   */
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  search(...args: any[]) {
    this._assertSetupStageAllowed('search')
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

  /**
   * Attach the schema for an action's request body. Parsed and typed into `body` in the loader. Action-only — queries
   * and mutations carry a flat `.input` instead.
   *
   * Server-only — the schema is stripped from the client bundle (validated server-side in the loader).
   *
   *     .action('PUT', '/api/ideas/:id').body(z.object({ title: z.string() })) // schema form
   *     .body((raw) => parseBody(raw))                 // custom validate-fn form
   *     .body<{ title: string }>()                     // no-arg, type-only
   *
   * Full reference: https://1gr14.dev/point0/latest/validation
   */
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  body(...args: any[]) {
    this._assertSetupStageAllowed('body')
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'body', schema, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  /**
   * Attach the schema for request headers — parsed and typed into `headers` in the loader. Available on every point
   * that issues a request.
   *
   * Server-only — the schema is stripped from the client bundle (validated server-side in the loader).
   *
   *     .headers(z.object({ 'x-api-key': z.string() })) // schema form
   *     .headers((raw) => ({ key: raw['x-api-key'] }))  // custom validate-fn form
   *     .headers<{ 'x-api-key': string }>()             // no-arg, type-only
   *
   * Full reference: https://1gr14.dev/point0/latest/validation
   */
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  headers(...args: any[]) {
    this._assertSetupStageAllowed('headers')
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'headers', schema, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  /**
   * Attach the schema for request cookies — parsed and typed into `cookies` in the loader. Available on every point
   * that issues a request.
   *
   * Server-only — the schema is stripped from the client bundle (validated server-side in the loader).
   *
   *     .cookies(z.object({ session: z.string() }))    // schema form
   *     .cookies((raw) => ({ session: raw.session }))  // custom validate-fn form
   *     .cookies<{ session: string }>()                // no-arg, type-only
   *
   * Full reference: https://1gr14.dev/point0/latest/validation
   */
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  cookies<
    TInputRaw extends InputRaw,
    TInputParsed extends InputParsed = TInputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'cookies'> &
      AssertSchemaNotWider<RecordValidationSchema<TInputRaw, TInputParsed>, TCookiesSchema, 'cookies'>,
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  cookies(...args: any[]) {
    this._assertSetupStageAllowed('cookies')
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'cookies', schema, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  /**
   * Declare the response schema for an action's endpoint — one schema for the success response, or a map keyed by HTTP
   * status. Used for typing and OpenAPI; the server validates the response against it. Action-only.
   *
   * Server-only — the schema is stripped from the client bundle (validated/served server-side).
   *
   *     .response(ideaSchema)                          // single success schema
   *     .response({ 200: ideaSchema, 404: errorSchema }) // per-status map
   *
   * Full reference: https://1gr14.dev/point0/latest/validation
   */
  response<TSelf>(this: TSelf, responseSchema: InputSchema): TSelf
  response<TSelf>(this: TSelf, responseSchemas: Record<number, InputSchema>): TSelf
  response<TSelf>(this: TSelf, responseSchemas: NormalizedResponseSchema): TSelf
  response(schemas: InputSchema | Record<number, InputSchema> | NormalizedResponseSchema | undefined) {
    if (!schemas) {
      return this._continue({}) as never
    }
    const keys = Object.keys(schemas)
    const allKeysAreNumbers = keys.every((key) => Number.isInteger(Number(key)))
    const normalizedResponseSchema = (() => {
      if (!allKeysAreNumbers) {
        return {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: schemas,
              },
            },
          },
        }
      }
      const firstValue = (schemas as any)[keys[0]] as object
      const isAlreadyNormalizedResponseSchema = typeof firstValue === 'object' && 'content' in firstValue
      if (isAlreadyNormalizedResponseSchema) {
        // already a normalized status map ({ 200: { content }, 404: { content } }) — return the whole map,
        // not just the first status, so every declared status reaches the generated spec.
        return schemas
      }
      return Object.fromEntries(
        keys.map((key) => [
          key,
          {
            description: isErrorCode(Number(key)) ? 'Error response' : 'Successful response',
            content: {
              'application/json': {
                schema: (schemas as any)[key] as InputSchema,
              },
            },
          },
        ]),
      )
    })()
    return this._continue({
      _responseSchema: normalizedResponseSchema as NormalizedResponseSchema,
    }) as never
  }

  /**
   * Attach extra OpenAPI metadata for this endpoint (summary, examples, response docs) — merged into the generated
   * spec. On points that issue a request (query, mutation, action).
   *
   * Server-only — stripped from the client bundle (OpenAPI metadata, read server-side).
   *
   *     .openapi({ summary: 'Fetch one idea by id' })
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  openapi<TSelf>(this: TSelf, endpointSchema: NormalizedEndpointOpenapiSchema): TSelf
  openapi(endpointSchema: NormalizedEndpointOpenapiSchema) {
    return this._continue({
      _openapiSchema: mergeEndpointOpenapiSchemas(this._openapiSchema, endpointSchema),
    }) as never
  }

  /**
   * Register named entity schemas (your domain models) for OpenAPI components and shared typing. Accumulates across
   * calls. On root, base, plugin.
   *
   * Server-only — cut from the client bundle (it feeds OpenAPI/docs metadata read server-side).
   *
   *     .models({ Idea: ideaSchema, User: userSchema })
   *
   * Full reference: https://1gr14.dev/point0/latest/stage-methods
   */
  models<TSelf>(this: TSelf, modelsSchemas: Record<string, InputSchema>): TSelf
  models(modelsSchemas: Record<string, InputSchema>) {
    return this._continue({
      _modelsSchemas: {
        ...(this._modelsSchemas ?? {}),
        ...modelsSchemas,
      },
    }) as never
  }

  /**
   * Close the root point. The root is the one point created straight from `Point0` (not inherited): it's the server's
   * entry point and the holder of every default — server/client URLs, transformer, error class, query options, prefetch
   * policy, loading/error UI — that every point beneath it inherits. Open with `.lets.root()`, set defaults, close with
   * `.root()`.
   *
   * Server-and-client — the root closer is kept on both bundles (isomorphic).
   *
   *     export const root = Point0.lets.root().serverUrl(env.SERVER_URL).transformer(superjson).root()
   *
   * Full reference: https://1gr14.dev/point0/latest/root
   */
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  > {
    return this._continue({
      type: 'root',
      _base: this as never as BasePoint,
      _root: this as never as RootPoint,
      name: this.scope,
      _letsReadyPointType: undefined,
    }) as never
  }

  /**
   * Close a plugin point. A plugin bundles methods — `.ctx`, `.with`, `.middleware`, input schemas, related queries —
   * that you inject into another point's chain with `.use(plugin)`. It does nothing on its own; it's the tool for
   * sharing setup across points in your own app. Open with `Point0.lets.plugin()`, add methods, close with
   * `.plugin()`.
   *
   * Server-and-client — the plugin closer is kept on both bundles (each bundled method keeps its own strip behavior).
   *
   *     export const mePlugin = Point0.lets
   *       .plugin()
   *       .ctx(({ request }) => ({ me: getMe({ request }) }))
   *       .plugin()
   *
   * Full reference: https://1gr14.dev/point0/latest/plugin
   */
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  > {
    return this._continue({
      type: 'plugin',
      _letsReadyPointType: undefined,
    }) as never
  }

  /**
   * Close a base point. A base holds shared settings — a route prefix (`.basePath`), query defaults, loading/error UI,
   * a plugin, injected queries — for a _subset_ of points; every point built off it inherits them. It's authoring-time
   * only: no route, no endpoint of its own. Open with `.lets.base()`, configure, close with a second `.base()`.
   *
   * Server-and-client — the base closer is kept on both bundles (isomorphic).
   *
   *     export const adminBase = root.lets.base().basePath('/admin').use(adminOnlyPlugin).base()
   *
   * Full reference: https://1gr14.dev/point0/latest/base
   */
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  > {
    return this._continue({
      type: 'base',
      _base: this as never as BasePoint,
      _letsReadyPointType: undefined,
    }) as never
  }

  /**
   * Close a page point: render this component at the route set by `.lets.page('/path')`. The component receives the
   * loaded `data`, `queries` (in `.with` order), `params`, `search`, `props`, `location`, and the resolved
   * loading/error components. The component is OPTIONAL — omit it to render nothing (`() => null`).
   *
   * A page with a `.loader()` is also its own query (`page.useQuery()`, `page.fetchQuery()`, `page.getQueryKey()`, …)
   * and, when SSR is on (or it has a server loader), a real HTTP endpoint; a loader-less page that only composes other
   * queries is a client-only mountable, not an endpoint. Pages are lazy-loaded by default.
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): its body and the
   * imports it pulls in are removed from the server build. Kept in the client build always, and in the server build
   * only when SSR is on.
   *
   *     export const ideaPage = root.lets
   *       .page('/ideas/:id')
   *       .with(ideaQuery, ({ params }) => ({ id: Number(params.id) }))
   *       .page(({ data: { idea } }) => <h1>{idea.title}</h1>) // component form
   *     // .page()                                              // no component → renders nothing
   *
   * Full reference: https://1gr14.dev/point0/latest/page
   */
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
              TQueriesDefinitions,
              TError
            >,
            TConnectionsDefinitions,
            TMembershipsDefinitions,
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
      TQueriesDefinitions,
      TError
    >,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  page(...args: any[]) {
    const [page = () => null] = args as [
      PageSuccessComponentType<any, any, any, any, any, any, any, any, any> | undefined,
    ]
    // this._applyComponentDisplayName(page as React.ComponentType<any>, { suffix: 'PageInner' })
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    // Endpoint existence is fixed here at point-build time by the BUILDING BUNDLE's side default (ambient
    // `_getSsrEnabled()`), not the owning client's SSR: a side that doesn't SSR keeps the endpoint only when the page
    // has a server loader; a side that DOES SSR keeps `_endpoint` so `queryClientDehydratedState` stays prefetchable
    // even without a server loader. Accepted degenerate cost: a server bundle with `ssr: false` drops a no-loader
    // page's data-endpoint even if an `ssr: true` client owns it, so that page is absent from the server-generated
    // OpenAPI spec — nonsensical in practice (server scope is API-only, SSR is per-client); making endpoint existence
    // client-aware would be a runtime-routing change.
    const _endpoint = !this._getSsrEnabled() ? this.undefinedEndpointIfHasNotServerLoader() : this._endpoint
    const point = this._continue({
      type: 'page',
      _page: page,
      _letsReadyPointType: undefined,
      _endpoint,
      _mountActions: [...this._mountActions, ...selfQueryAction],
      ...(queryShouldBeFinalized ? { _queryResultType: 'query' } : {}),
    })
    // point.X = point.Page.bind(point) as never
    // this._applyComponentDisplayName(point.X, { suffix: 'Page' })
    // this._applyComponentDisplayName(point.Page, { suffix: 'Page' })
    // this._applyComponentDisplayName(point._PageLoader, { suffix: 'PageLoader' })
    point.X = point.Page
    // Decorate and return point.X (the mount component) so it carries every point
    // helper and so `_tail` can hand it back as the export. Pages are router-mounted
    // via `.X` / `.Page`, but keeping the export uniform with component/provider keeps
    // the `_tail` contract simple (`this.X` is always the decorated mount component).
    Point0._assignNicePointMethodsToComponent({ component: point.X, point, extra: { X: point.X } })
    return point.X as never
  }

  /**
   * Close a component point: a reusable mountable with data and UI but NO route — you place it yourself with a JSX tag
   * (`<BestIdea cta="..." />`), wherever you need it. It gets the full chain (`.with`, `.loader`, `.mapper`,
   * loading/error) like a page. The component argument is optional. Declare outer props via `.component<{ … }>()`.
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): its body and the
   * imports it pulls in are removed from the server build. Kept in the client build always, and in the server build
   * only when SSR is on.
   *
   *     export const BestIdea = root.lets.component().loader(loadBest).component(({ data }) => <h2>{data.title}</h2>) // component form
   *     // root.lets.component<{ cta: string }>().component()  // type-only outer props, no component → renders nothing
   *
   * Full reference: https://1gr14.dev/point0/latest/component
   */
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
              TQueriesDefinitions,
              TError
            >,
            TConnectionsDefinitions,
            TMembershipsDefinitions,
            TMapperOutput
          >,
        ]
      : never
  ): Mountable<
    NiceComponentReadyPoint<
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
        TQueriesDefinitions,
        TError
      >,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  > {
    const [component = () => null] = args as never as [
      ComponentSuccessComponentType<any, any, any, any, any, any, any, any> | undefined,
    ]
    // this._applyComponentDisplayName(component, { suffix: 'Inner' })
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
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
    // Return the mount component (point.X) itself, decorated with every point
    // helper, so `<MyComponent />` renders the full point without reaching for
    // `.X`. The user's inner `component` is preserved as `_component` and the
    // compiler hoists it to a top-level declaration for Fast Refresh.
    Point0._assignNicePointMethodsToComponent({ component: point.X, point, extra: { X: point.X } })
    return point.X as never
  }

  /**
   * Close a layout point: a shared shell (header, sidebar, frame) wrapping a set of pages, rendered where the component
   * places `{children}`. It can own part of the route those pages sit under and load its own data with its own
   * loading/error. Navigating between pages in the same layout keeps it mounted — no re-render, no re-fetch. The
   * component argument is optional (omit it to render just children, e.g. to prefix a route or carry shared data). From
   * a page chain, `.layout(someLayout)` attaches that layout to the page instead.
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): its body and the
   * imports it pulls in are removed from the server build. Kept in the client build always, and in the server build
   * only when SSR is on.
   *
   *     export const generalLayout = root.lets.layout(({ children }) => <div className="app">{children}</div>) // close a layout
   *     root.lets.page('/ideas/:id').layout(generalLayout).page(IdeaScreen) // attach a layout to a page
   *
   * Full reference: https://1gr14.dev/point0/latest/layout
   */
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
              TQueriesDefinitions,
              TError
            >,
            TConnectionsDefinitions,
            TMembershipsDefinitions,
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
      TQueriesDefinitions,
      TError
    >,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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
        TQueriesDefinitions,
        TError
      >,
    ],
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  layout(...args: any[]) {
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []
    if (this._letsReadyPointType === 'layout') {
      const [layout = ({ children }) => children] = args as [
        LayoutSuccessComponentType<any, any, any, any, any, any, any, any, any> | undefined,
      ]
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
      // See `page()` — return the decorated mount component (point.X) for a uniform
      // `_tail` contract across all mountable points.
      Point0._assignNicePointMethodsToComponent({ component: point.X, point, extra: { X: point.X } })
      return point.X as never
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
      _ProviderReactContext: singletonize(
        `__POINT0_PROVIDER_REACT_CONTEXT__${this.id}`,
        createContext<MountableSuccessData<TQueriesDefinitions, TMapperOutput>>(null as never) as never,
      ),
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

  /**
   * Close a provider point: produce one value and expose it down the tree, read with `.useValue()` (a hook,
   * fine-grained) or `.getValue()` (a plain read) — no prop drilling. The value can be computed, loaded, or built from
   * injected queries. The closing argument is the value mapper (same as `.mapper`); omit it to provide `data` as-is.
   * Mount the provider once high in the tree; it renders its `{children}`.
   *
   * Server-ssr-and-client — cut from the SERVER bundle when `ssr: false` (or after a `.clientOnly()`): its body and the
   * imports it pulls in are removed from the server build. Kept in the client build always, and in the server build
   * only when SSR is on.
   *
   *     export const AppProvider = root.lets.provider().provider(() => ({ x: 1, y: 2 })) // mapper form
   *     // root.lets.provider().loader(loadValue).provider()   // omit mapper → provide loaded data as-is
   *     const { x } = AppProvider.useValue()
   *
   * Full reference: https://1gr14.dev/point0/latest/provider
   */
  provider<
    TNewMapperOutput extends MapperOutput = MountableSuccessData<
      WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions,
        TError
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
              TQueriesDefinitions,
              TError
            >,
            TConnectionsDefinitions,
            TMembershipsDefinitions,
            TMapperOutput,
            TNewMapperOutput
          >,
        ]
      : never
  ): Mountable<
    NiceProviderReadyPoint<
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
        TQueriesDefinitions,
        TError
      >,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  provider(_mapperFn?: any) {
    const mapperFn = _mapperFn as MapperFn<any, any, any, any, any, any, any, any, any, any> | undefined
    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
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
    // Return the mount component (point.X) itself, decorated with every point
    // helper, so `<MyProvider />` renders the full point without reaching for
    // `.X`. Previously this returned the bare `point` object (not a component),
    // which is why providers could only be mounted via `.X` / `.Provider`.
    Point0._assignNicePointMethodsToComponent({ component: point.X, point, extra: { X: point.X } })
    return point.X as never
  }

  // Merge two `_searchSchemaKeys` sets when a plugin folds into a consumer: `true` means "every query
  // param is search" (the fallback when keys can't be statically extracted) and wins; otherwise union the
  // explicit key lists; `undefined` means "no search declared" and yields to the other side.
  private static _mergeSearchSchemaKeys(
    a: string[] | true | undefined,
    b: string[] | true | undefined,
  ): string[] | true | undefined {
    if (a === undefined) return b
    if (b === undefined) return a
    if (a === true || b === true) return true
    return [...new Set([...a, ...b])]
  }

  /**
   * Inject a plugin into this point's chain. Everything the plugin bundled — `.ctx`, `.with`, `.middleware`, input
   * schemas, related queries — is applied here as if written inline, and its types flow through (e.g. `ctx.me` becomes
   * available). The way to share setup across points in your app.
   *
   * Server-and-client — `.use` itself is kept on both bundles; each applied method keeps its own strip behavior.
   *
   *     .use(authorizedOnlyPlugin) // brings ctx.me — the current user
   *
   * Full reference: https://1gr14.dev/point0/latest/plugin
   */
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
      AssertSchemaNotWider<T['Infer']['SearchSchema'], TSearchSchema, 'search'> &
      AssertSchemaNotWider<T['Infer']['BodySchema'], TBodySchema, 'body'> &
      AssertSchemaNotWider<T['Infer']['HeadersSchema'], THeadersSchema, 'headers'> &
      AssertSchemaNotWider<T['Infer']['CookiesSchema'], TCookiesSchema, 'cookies'> &
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
        TQueriesDefinitions,
        TError
      >,
      T['Infer']['Queries']
    >,
    MergeConnections<TConnectionsDefinitions, T['Infer']['ConnectionsDefinitions']>,
    MergeMemberships<TMembershipsDefinitions, T['Infer']['MembershipsDefinitions']>,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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

    // Runtime backstop for the `NicePluginReadyPoint` type bound: `.use()` only accepts a plugin (a point
    // finalized with `.plugin()`, so `type === 'plugin'`). The type forbids anything else, but `.use()` reads
    // the raw `plugin.point` and would otherwise blindly merge a non-plugin's guts (loaders, mappers, mount
    // actions). `.use()` is never called internally, so this only fires on a `.point`/`as any` bypass — at
    // point-declaration time, i.e. startup.
    const candidate = point as unknown as { __POINT0_INSTANCE__?: boolean; type?: PointType } | null | undefined
    if (!candidate || candidate.__POINT0_INSTANCE__ !== true || candidate.type !== 'plugin') {
      const received =
        candidate?.__POINT0_INSTANCE__ === true
          ? `a point of type "${candidate.type}" (${point.toStringWithLocation()})`
          : String(plugin)
      throw new Error(
        `.use() expects a plugin created via .plugin(), but received ${received}. Used on point ${this.toStringWithLocation()}.`,
      )
    }

    // A client-only plugin can only go onto an already-client-only consumer. `.clientOnly()` is resolved statically by
    // the compiler along the chain, but a plugin reaches its consumer through a runtime `.use()` value the compiler
    // cannot trace. If we flipped the consumer to client-only here at runtime, the compiler would still ship the
    // consumer's render to the server — a desync. So we refuse it and ask for an explicit `.clientOnly()` up front.
    if (point._clientOnly && !this._clientOnly) {
      throw new Error(
        `Cannot .use() a client-only plugin (${point.toStringWithLocation()}) on a point that is not client-only (${this.toStringWithLocation()}). Call .clientOnly() before .use() so the compiler strips the server build consistently.`,
      )
    }

    const queryShouldBeFinalized = this._isMountableQueryShouldBeFinalized()
    const selfQueryAction: MountAction[] = queryShouldBeFinalized
      ? [{ type: 'selfQuery', unstableId: Point0._getNextUnstableId() }]
      : []

    const pluginStart = {
      type: 'pluginStart' as const,
      name: point.name,
      unstableId: Point0._getNextUnstableId(),
    }
    const pluginEnd = {
      type: 'pluginEnd' as const,
      name: point.name,
      unstableId: Point0._getNextUnstableId(),
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
      // _serverUrl: point._serverUrl,
      // _basePath: point._basePath,
      // _transformer: point._transformer,
      ...set('_ssr'),
      // The consumer's own flag — a client-only plugin on a non-client-only consumer already threw above.
      _clientOnly: this._clientOnly,
      _eventerSubscriptions: [...this._eventerSubscriptions, ...point._eventerSubscriptions],
      _defaultMutationOptions: mergeMutationOptions(this._defaultMutationOptions, point._defaultMutationOptions),
      _mutationOptions: mergeMutationOptions(this._mutationOptions, point._mutationOptions),
      _defaultInfiniteQueryOptions: mergeInfiniteQueryOptions(
        this._defaultInfiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
        point._defaultInfiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
      ),
      _defaultQueryOptions: mergeQueryOptions(this._defaultQueryOptions, point._defaultQueryOptions),
      _defaultPageQueryOptions: mergeQueryOptions(this._defaultPageQueryOptions, point._defaultPageQueryOptions),
      _defaultComponentQueryOptions: mergeQueryOptions(
        this._defaultComponentQueryOptions,
        point._defaultComponentQueryOptions,
      ),
      _defaultLayoutQueryOptions: mergeQueryOptions(this._defaultLayoutQueryOptions, point._defaultLayoutQueryOptions),
      _defaultProviderQueryOptions: mergeQueryOptions(
        this._defaultProviderQueryOptions,
        point._defaultProviderQueryOptions,
      ),
      // the socket scope defaults fold exactly like the query family above — a plugin's `.channelOptions()` /
      // `.spaceOptions()` / `.serverHandlerOptions()` / `.clientHandlerOptions()` / `.subscriptionOptions()` reach
      // the consumer's points (callbacks stack, plugin's run after the consumer's own)
      _defaultChannelOptions: mergeChannelOptions(this._defaultChannelOptions, point._defaultChannelOptions),
      _defaultSpaceOptions: mergeSpaceOptions(this._defaultSpaceOptions, point._defaultSpaceOptions),
      _defaultServerHandlerOptions: mergeServerHandlerOptions(
        this._defaultServerHandlerOptions,
        point._defaultServerHandlerOptions,
      ),
      _defaultClientHandlerOptions: mergeClientHandlerOptions(
        this._defaultClientHandlerOptions,
        point._defaultClientHandlerOptions,
      ),
      _defaultSubscriptionOptions: mergeSubscriptionOptions(
        this._defaultSubscriptionOptions,
        point._defaultSubscriptionOptions,
      ),
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
      _wrappers: [...this._wrappers, ...point._wrappers],
      // Search params declared inside the plugin (e.g. via `.search()`) must stay routable on the consumer.
      // Without this, a page/layout consumer keeps only its own `_searchSchemaKeys`, so the plugin's search
      // keys get filtered out of the routed input / query key (see `_rawInputToRoutedRawInputForQueryKey`).
      _searchSchemaKeys: Point0._mergeSearchSchemaKeys(this._searchSchemaKeys, point._searchSchemaKeys),
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
      ...set('_openapiSchema', () => {
        return mergeEndpointOpenapiSchemas(this._openapiSchema, point._openapiSchema)
      }),
      // per-key merge like `_fetchOptions` — a plugin's `.rsc({ … })` adds its keys over the consumer's
      ...set('_rsc', { ...this._rsc, ...point._rsc }),
      ...set('_scrollPositionGetter'),
      ...set('_scrollPositionSetter'),
      ...set('_scrollPositionRestorePolicy'),
      ...set('_polhPolicy'),
      ...set('_polhDuration'),
      ...set('_ponPolicy'),
      tags: [...new Set([...this.tags, ...point.tags])],
      _description:
        point._description || this._description
          ? [this._description, point._description].filter(Boolean).join('\n\n')
          : undefined,
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

  /**
   * Close a query point. The optional argument is the query's default react-query options (`staleTime`, `retry`,
   * `select`, `refetch*`, …); `queryKey` and `queryFn` are supplied by Point0. A query with a server `.loader()` is a
   * real HTTP endpoint (and shows up in the OpenAPI spec); a `.clientLoader()`-only query runs in the browser with no
   * endpoint. Defaults set here are overridable at every call site, and on the server a few (`retry`, refetch-on-*,
   * `staleTime`/`gcTime`) are hard-overridden so a render fetches once.
   *
   * Every query method takes the INPUT first — `useQuery(input, options?)`, `fetchQuery(input)`, `getQueryKey(input)`,
   * `setQueryData(input, updater)`, … — and that input forms the cache key.
   *
   * On a serverHandler chain (after `.serverReply`) the same call declares the handler's FLAVOR instead: the handler
   * becomes a socket query (`useSocketQuery` and the family) — and it throws "Handler has no reply" without a declared
   * `.serverReply`.
   *
   * Server-and-client — the query closer is kept on both bundles (the query runs from whichever side calls it).
   *
   *     export const ideaQuery = root.lets
   *       .query()
   *       .input(z.object({ id: z.number() }))
   *       .loader(async ({ input }) => ({ idea: await findIdea(input.id) }))
   *       .query() // no-arg close
   *     // .query({ staleTime: 60_000 }) // options form: default react-query options
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  query(
    ...args: TLetsReadyPointType extends 'action'
      ? TPointType extends 'finalStage'
        ? [ShowError<`You can not use query() to finalize your query, becouse it is already finalized`>]
        : TQueryResultType extends 'subscription'
          ? [
              ShowError<`This action's .loader is an async generator — a stream closes with .subscription(), not .query()`>,
            ]
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
              ? [
                  ShowError<`Query can not return response. Last loader should provide plain object data, not response.`>,
                ]
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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
      QueryDefinition<'query', FinalLoaderDataOrNever<TServerLoaderOutput, TClientLoaderOutput>, TError>
    >,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  query(
    ...args: TLetsReadyPointType extends 'serverHandler'
      ? TPointType extends 'loadedStage'
        ? TQueryResultType extends UndefinedQueryResultType
          ? [
              queryOptions?: ExtraUseQueryOptions<
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                QueryKey
              >,
            ]
          : [
              ShowError<`This serverHandler already has a flavor — .query()/.mutation()/.infiniteQuery() is declared once`>,
            ]
        : [ShowError<`Add .serverReply() before the .query() flavor — the reply is what the socket query returns`>]
      : never
  ): NiceServerHandlerStagePoint<
    'loadedStage',
    'serverHandler',
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
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
        _mountActions: [...this._mountActions, { type: 'selfQuery', unstableId: Point0._getNextUnstableId() }],
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
    } else if (this._letsReadyPointType === 'serverHandler') {
      if (!_point0_env.feature.socket) {
        throw socketFeatureOffError(`.query() flavor, point ${this.id}`)
      }
      // a serverHandler FLAVOR, not a closer: what this handler IS for the client — the point stays on its stage
      // and still closes with .serverHandler(). Guarded at the type level to come after .serverReply and only once.
      // The runtime mirror of the loader check the action closers make: a query needs the reply to answer with (the
      // compiler leaves a stub on the client bundle, so the check holds on both sides).
      if (!this._serverReplyFn) {
        throw new Error(
          `Handler has no reply. Please add .serverReply() before the .query() flavor on ${this.toStringWithLocation()}`,
        )
      }
      return this._continue({
        _queryResultType: 'query',
        _queryOptions: queryOptions,
      }) as never
    } else {
      throw new Error(`Unknown condition, please report this issue on point ${this.toStringWithLocation()}`)
    }
  }

  /**
   * Close a query as an infinite (paginated) query. You write a loader that returns one page; Point0 turns it into a
   * real TanStack `useInfiniteQuery` with a page cache, `fetchNextPage`, and `hasNextPage`. The closing argument takes
   * the same options as `useInfiniteQuery` (`getNextPageParam`, `initialPageParam`, `maxPages`, …) plus one
   * Point0-specific required key, `pageParamFromInput`, telling Point0 where the cursor lives in the input. Any
   * mountable can also close with `.infiniteQuery({…})` after its loader to make its self-query infinite.
   *
   * On a serverHandler chain (after `.serverReply`) the same call declares the handler's FLAVOR instead — the socket
   * infinite query (`useSocketInfiniteQuery` and the family), the page cursor folding into the message input under
   * `pageParamFromInput`.
   *
   * Server-and-client — the infiniteQuery closer is kept on both bundles (the query runs from whichever side calls it).
   *
   *     export const ideaListQuery = root.lets
   *       .infiniteQuery()
   *       .input(schema)
   *       .loader(loadPage)
   *       .infiniteQuery({
   *         getNextPageParam: (last) => last.nextCursor,
   *         initialPageParam: undefined,
   *         pageParamFromInput: 'cursor',
   *       })
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   *
   * Finalize this point as an infinite query. ONE signature (deliberately not overloads) — same reason as `with`: with
   * 3 overloads the language server can't pick which to complete the options object against, so `.infiniteQuery({ ▮ })`
   * offers a useless global list ("never until correct") and a wrong call collapses to "No overload matches this call".
   * A single signature gives real member completion for the options and a precise error (e.g. "getNextPageParam is
   * missing").
   *
   * It branches on `TLetsReadyPointType` (what `.lets()` declared this point as) — these are mutually exclusive, so
   * exactly one branch is live for any given point:
   *
   * - 'infiniteQuery' -> a standalone infinite query point
   * - 'action' -> an action finalized as an infinite query
   * - MountablePointType (page/component/...) -> finalize the point's own query Each branch first guards that loaders
   *   exist (and didn't return a Response) and that the point isn't already finalized, surfacing a `ShowError` message
   *   in place of the options argument. The options type is the same in every branch; only the guard messages and the
   *   result differ.
   */
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
      : TLetsReadyPointType extends 'action'
        ? TPointType extends 'finalStage'
          ? [ShowError<`You can not use infiniteQuery() to finalize, becouse it is already finalized`>]
          : TQueryResultType extends 'subscription'
            ? [
                ShowError<`This action's .loader is an async generator — a stream closes with .subscription(), not .infiniteQuery()`>,
              ]
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
        : TLetsReadyPointType extends MountablePointType
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
                ? [
                    ShowError<`Query can not return response. Last loader should provide plain object data, not response.`>,
                  ]
                : [
                    ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .infiniteQuery() to finalize query.`>,
                  ]
          : TLetsReadyPointType extends 'serverHandler'
            ? TPointType extends 'loadedStage'
              ? TQueryResultType extends UndefinedQueryResultType
                ? [
                    infiniteQueryOptions: ExtraUseInfiniteQueryOptions<
                      InputRaw<TServerInputSchema>,
                      FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                      TError,
                      InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
                      QueryKey,
                      unknown
                    >,
                  ]
                : [
                    ShowError<`This serverHandler already has a flavor — .query()/.mutation()/.infiniteQuery() is declared once`>,
                  ]
              : [
                  ShowError<`Add .serverReply() before the .infiniteQuery() flavor — the reply is what a page of the socket query returns`>,
                ]
            : never
  ): TLetsReadyPointType extends 'infiniteQuery'
    ? // standalone infinite query point
      NiceInfiniteQueryReadyPoint<
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
        TQueriesDefinitions,
        TConnectionsDefinitions,
        TMembershipsDefinitions,
        TChannelInput,
        TIdentity,
        TSpaceInput,
        TRoom
      >
    : TLetsReadyPointType extends 'action'
      ? // action finalized as an infinite query
        NiceActionReadyPoint<
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
          TQueriesDefinitions,
          TConnectionsDefinitions,
          TMembershipsDefinitions,
          TChannelInput,
          TIdentity,
          TSpaceInput,
          TRoom
        >
      : TLetsReadyPointType extends MountablePointType
        ? // finalize the mountable point's own query (appended to its queries)
          NiceStagePoint<
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
              QueryDefinition<
                'infiniteQuery',
                InfiniteData<FinalLoaderDataOrNever<TServerLoaderOutput, TClientLoaderOutput>>,
                TError
              >
            >,
            TConnectionsDefinitions,
            TMembershipsDefinitions,
            TChannelInput,
            TIdentity,
            TSpaceInput,
            TRoom
          >
        : TLetsReadyPointType extends 'serverHandler'
          ? NiceServerHandlerStagePoint<
              'loadedStage',
              'serverHandler',
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
              TQueriesDefinitions,
              TConnectionsDefinitions,
              TMembershipsDefinitions,
              TChannelInput,
              TIdentity,
              TSpaceInput,
              TRoom
            >
          : never
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
    } else if (this._letsReadyPointType === 'serverHandler') {
      if (!_point0_env.feature.socket) {
        throw socketFeatureOffError(`.infiniteQuery() flavor, point ${this.id}`)
      }
      // a serverHandler FLAVOR, not a closer — see query()
      if (!this._serverReplyFn) {
        throw new Error(
          `Handler has no reply. Please add .serverReply() before the .infiniteQuery() flavor on ${this.toStringWithLocation()}`,
        )
      }
      return this._continue({
        _queryResultType: 'infiniteQuery',
        _infiniteQueryOptions: infiniteQueryOptions as ExtraUseInfiniteQueryOptions<any>,
      }) as never
    } else {
      throw new Error(`Unknown condition, please report this issue on point ${this.toStringWithLocation()}`)
    }
  }

  /**
   * Close a mutation point: an input schema plus a write loader. It's a real HTTP `POST` endpoint (in the OpenAPI spec)
   * and a thin wrapper over a TanStack mutation at once — call it anywhere with `.useMutation()` /
   * `.fetchMutation(input)`. The optional argument is the default react-query `useMutation` options. A `.loader` (or
   * `.clientLoader`) is required before closing. The first argument to every call is the input.
   *
   * On a serverHandler chain (after `.serverReply`) the same call declares the handler's FLAVOR instead — the socket
   * mutation (`useSocketMutation` / `fetchSocketMutation`), which is also the default flavor when none is declared.
   *
   * Server-and-client — the mutation closer is kept on both bundles (the mutation runs from whichever side calls it).
   *
   *     export const ideaCreateMutation = root.lets.mutation().input(schema).loader(createIdea).mutation() // no-arg close
   *     // .mutation({ retry: 1 })   // options form: default useMutation options
   *
   * Full reference: https://1gr14.dev/point0/latest/mutation
   */
  mutation(
    ...args: TLetsReadyPointType extends 'mutation'
      ? FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends LoaderOutput
        ? [
            mutationOptions?: ExtraUseMutationOptions<
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  mutation(
    ...args: TLetsReadyPointType extends 'action'
      ? TPointType extends 'finalStage'
        ? [ShowError<`You can not use mutation() to finalize action, becouse it is already finalized`>]
        : TQueryResultType extends 'subscription'
          ? [
              ShowError<`This action's .loader is an async generator — a stream closes with .subscription(), not .mutation()`>,
            ]
          : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends LoaderOutput
            ? [
                mutationOptions?: ExtraUseMutationOptions<
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  mutation(
    ...args: TLetsReadyPointType extends 'serverHandler'
      ? TPointType extends 'loadedStage'
        ? TQueryResultType extends UndefinedQueryResultType
          ? [
              mutationOptions?: ExtraUseMutationOptions<
                FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
                TError,
                InputRaw<TServerInputSchema>
              >,
            ]
          : [
              ShowError<`This serverHandler already has a flavor — .query()/.mutation()/.infiniteQuery() is declared once`>,
            ]
        : [
            ShowError<`Add .serverReply() before the .mutation() flavor — the reply is what the connection mutation returns`>,
          ]
      : never
  ): NiceServerHandlerStagePoint<
    'loadedStage',
    'serverHandler',
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  mutation(...args: any) {
    const [mutationOptions = {}] = args as [ExtraUseMutationOptions<any, any, any, any> | undefined]
    if (this._letsReadyPointType === 'mutation') {
      return this._continue({
        type: 'mutation',
        _mutationOptions: mutationOptions as ExtraUseMutationOptions,
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
        _mutationOptions: mutationOptions as ExtraUseMutationOptions,
      }) as never
    } else if (this._letsReadyPointType === 'serverHandler') {
      if (!_point0_env.feature.socket) {
        throw socketFeatureOffError(`.mutation() flavor, point ${this.id}`)
      }
      // a serverHandler FLAVOR, not a closer — mutation IS the default (`_queryResultType` stays undefined), the
      // explicit call only carries the default mutation options for useSocketMutation
      if (!this._serverReplyFn) {
        throw new Error(
          `Handler has no reply. Please add .serverReply() before the .mutation() flavor on ${this.toStringWithLocation()}`,
        )
      }
      return this._continue({
        _mutationOptions: mutationOptions as ExtraUseMutationOptions,
      }) as never
    } else {
      throw new Error(`Unknown condition, please report this issue on point ${this.toStringWithLocation()}`)
    }
  }

  /**
   * Close a subscription point: a server stream of values over HTTP (NDJSON). The `.loader` is an async GENERATOR —
   * each `yield` is one streamed value, a `return` completes the stream, and the data type is the union of the yields.
   * The loader receives `signal` — it fires when the consumer unsubscribes; hand it to whatever feeds the generator.
   * Also closes a custom-method/path opener (`.lets.action('GET', '/api/feed')`) whose loader is a generator — the
   * stream on your own URL; closing such a loader with `.action()` is a type error. A subscription is an HTTP concept —
   * a request the server answers with a stream; a clientHandler's pushes are not one: listen with
   * `useOnMessageFromServer` / `onMessageFromServer` or iterate them with `iterateMessagesFromServer`.
   *
   * The options can declare the tracked-cursor pair — `cursorParamFromInput` + `cursorParamFromData` (always both;
   * possibly deep dot-paths, the `pageParamFromInput` rule) — and a broken stream resumes instead of restarting from
   * scratch: the client remembers the cursor plucked from the last delivered value and rewrites the named input field
   * before the auto-reconnect resubscribes. The first subscribe sends the caller's input untouched — the loader reads
   * the cursor out of its input the same way on a fresh start and on a resume.
   *
   * Server-and-client — the closer is kept on both bundles (the generator body itself is server code, cut from the
   * client like any loader; the cursor pair and the callbacks are client code, cut from the server bundle).
   *
   *     export const taskProgressSubscription = root.lets
   *       .subscription()
   *       .input(z.object({ taskId: z.string() }))
   *       .loader(async function* ({ input, signal }) {
   *         for await (const percent of watchProgress(input.taskId, { signal })) {
   *           yield { percent }
   *         }
   *       })
   *       .subscription()
   *     // resumable: .subscription({ cursorParamFromInput: 'lastEventId', cursorParamFromData: 'id' })
   *
   * Full reference: https://1gr14.dev/point0/latest/subscription
   */
  subscription<
    TSubscriptionOptions extends
      | SubscriptionPointOptions<
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          FinalInputRaw<
            ReadyPointTypeOrNever<TLetsReadyPointType>,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          TError
        >
      | undefined =
      | SubscriptionPointOptions<
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          FinalInputRaw<
            ReadyPointTypeOrNever<TLetsReadyPointType>,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
          TError
        >
      | undefined,
  >(
    ...args: TLetsReadyPointType extends 'subscription' | 'action'
      ? TQueryResultType extends 'subscription'
        ? [
            subscriptionOptions?: TSubscriptionOptions &
              AssertSubscriptionCursorParams<
                TSubscriptionOptions,
                FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
                FinalInputRaw<
                  ReadyPointTypeOrNever<TLetsReadyPointType>,
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >
              >,
          ]
        : [
            ShowError<`A subscription's .loader must be an async generator (each yield is one streamed value) — add .loader(async function* () { ... }) before .subscription()`>,
          ]
      : never
  ): TLetsReadyPointType extends 'action'
    ? NiceActionReadyPoint<
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
        'subscription',
        TOuterProps,
        TInnerProps,
        TQueriesDefinitions,
        TConnectionsDefinitions,
        TMembershipsDefinitions,
        TChannelInput,
        TIdentity,
        TSpaceInput,
        TRoom
      >
    : TLetsReadyPointType extends 'subscription'
      ? NiceSubscriptionReadyPoint<
          'subscription',
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
          'subscription',
          TOuterProps,
          TInnerProps,
          TQueriesDefinitions,
          TConnectionsDefinitions,
          TMembershipsDefinitions,
          TChannelInput,
          TIdentity,
          TSpaceInput,
          TRoom
        >
      : never
  subscription(...args: any[]) {
    const [subscriptionOptions = {}] = args as [SubscriptionPointOptions | undefined]
    if (this._letsReadyPointType === 'subscription' || this._letsReadyPointType === 'action') {
      if (!this._hasServerLoader) {
        throw new Error(
          `Point has no loader. Please add an async-generator .loader() before calling .subscription() on ${this.toStringWithLocation()}`,
        )
      }
      const mergedSubscriptionOptions = mergeSubscriptionOptions(this._defaultSubscriptionOptions, subscriptionOptions)
      this._assertSubscriptionCursorParams(mergedSubscriptionOptions)
      return this._continue({
        // an action-opener point STAYS an action (exactly as `.query()`/`.mutation()` closers keep it) — the stream
        // is its FLAVOR, `_queryResultType`; only the dedicated `.lets.subscription()` opener yields the kind
        type: this._letsReadyPointType === 'action' ? 'action' : 'subscription',
        _letsReadyPointType: undefined,
        _queryResultType: 'subscription',
        // scope defaults (`.subscriptionOptions()` on root/base/plugin) under the closing options — same
        // lowest-to-highest resolution the space closer uses
        _subscriptionOptions: mergedSubscriptionOptions,
        _endpoint: this.undefinedEndpointIfHasNotServerLoader(),
      }) as never
    } else {
      throw new Error(`subscription() closes a subscription point, got ${this.toStringWithLocation()}`)
    }
  }

  /**
   * The runtime mirror of `AssertSubscriptionCursorParams`, run when `.subscription({...})` closes the point: the
   * tracked-cursor paths come only as a PAIR, and the input path must start inside the declared input shape — the first
   * segment is checked against the input schema's keys when the schema can be introspected (the same best-effort
   * `extractKeysBySchemasHelpers` the search-key collection uses; a custom validate-fn or a client-stripped schema
   * yields no keys and skips the check). The data path has no runtime schema to check against — the type level owns it.
   * Deeper segments are the type level's job on both paths.
   */
  private _assertSubscriptionCursorParams(subscriptionOptions: SubscriptionPointOptions): void {
    const { cursorParamFromInput, cursorParamFromData } = subscriptionOptions as {
      cursorParamFromInput?: string
      cursorParamFromData?: string
    }
    if ((cursorParamFromInput === undefined) !== (cursorParamFromData === undefined)) {
      throw new Error(
        `cursorParamFromInput and cursorParamFromData come as a pair — declare both or neither on ${this.toStringWithLocation()}`,
      )
    }
    if (cursorParamFromInput === undefined) {
      return
    }
    const firstSegment = cursorParamFromInput.split('.')[0] ?? ''
    if (this._letsReadyPointType === 'action') {
      // an action-opened subscription takes the ACTION input shape — the path starts at one of its three groups
      if (!['params', 'search', 'body'].includes(firstSegment)) {
        throw new Error(
          `cursorParamFromInput of an action-opened subscription must start with params, search or body (the action input shape), got "${cursorParamFromInput}" on ${this.toStringWithLocation()}`,
        )
      }
      return
    }
    const inputAction = this._serverExecuteActions.find((action) => action.type === 'input')
    const inputSchema = inputAction && 'schema' in inputAction ? inputAction.schema : undefined
    const inputKeys = extractKeysBySchemasHelpers(inputSchema, this._schemasHelpers)
    if (inputKeys && !inputKeys.includes(firstSegment)) {
      throw new Error(
        `cursorParamFromInput "${cursorParamFromInput}" does not exist in the input schema (keys: ${inputKeys.join(', ')}) on ${this.toStringWithLocation()}`,
      )
    }
  }

  /**
   * Subscribe to this subscription point's stream while the component is mounted. By default nothing re-renders — react
   * to messages through `options.onMessageFromServer` (per call, or point-level in `.subscription({...})`); with
   * `lastMessageFromServerAsData: true` the result gains `data` (the LATEST streamed value), re-rendering on every
   * message. `status` walks `connecting` → `open` → `closed` (the generator completed) or `error` (a typed error —
   * never restarted), `isLoading` covers the connect. A BROKEN stream (network drop, server restart) restarts with
   * backoff per `reconnect` (point-level `.subscription({ reconnect })`, overridable per call). The lifecycle callbacks
   * (`onConnect` / `onDisconnect` / `onError`, with `connectionIndex` in the props) ride the same two levels — point
   * and call site both fire, point level first. During SSR nothing streams — the hook renders the same
   * `connecting`/`closed` the client's hydration render computes and does the real work after mount.
   *
   * Server-and-client — kept on both bundles (renders the connecting state on the server).
   *
   *     taskProgressSubscription.useSubscription(
   *       { taskId },
   *       { onMessageFromServer: (tick) => setPercent(tick.percent) },
   *     )
   *     // const { data } = taskProgressSubscription.useSubscription({ taskId }, { lastMessageFromServerAsData: true })
   *
   * Full reference: https://1gr14.dev/point0/latest/subscription
   */
  useSubscription<
    TOptions extends
      | ExtraUseSubscriptionOptions<
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          TError
        >
      | undefined =
      | ExtraUseSubscriptionOptions<
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          TError
        >
      | undefined,
  >(
    ...args: TQueryResultType extends 'subscription'
      ? [
          ...ServerHandlerInputArgs<
            FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>
          >,
          options?: TOptions,
        ]
      : never
  ): TQueryResultType extends 'subscription'
    ? UseSubscriptionResultFor<TOptions, FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>, TError>
    : never
  useSubscription(...args: any[]): any {
    if (!this._isHttpSubscription()) {
      throw new Error(`useSubscription() lives on subscription points only, got ${this.toStringWithLocation()}`)
    }
    return useSubscriptionValue(this as never, args[0], args[1])
  }

  /**
   * The imperative subscription consumer: an async iterable of the streamed values — `for await` it. A typed error or a
   * broken stream THROWS (no auto-restart — an imperative consumer loops on its own terms); a completed stream ends the
   * iteration. Breaking out of the loop (or aborting `options.signal`) cancels the stream — the server generator's
   * `signal` fires.
   *
   * Client-side — a runtime error on the server.
   *
   *     for await (const { percent } of taskProgressSubscription.fetchSubscription({ taskId })) {
   *       render(percent)
   *     }
   *
   * Full reference: https://1gr14.dev/point0/latest/subscription
   */
  fetchSubscription(
    ...args: TQueryResultType extends 'subscription'
      ? [
          ...ServerHandlerInputArgs<
            FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>
          >,
          options?: FetchSubscriptionOptions,
        ]
      : never
  ): TQueryResultType extends 'subscription'
    ? AsyncIterable<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
    : never
  fetchSubscription(...args: any[]): any {
    if (!this._isHttpSubscription()) {
      throw new Error(`fetchSubscription() lives on subscription points only, got ${this.toStringWithLocation()}`)
    }
    return iterateSubscription(this as never, args[0], args[1])
  }

  // socket — channels and handlers. The client runtime (socket, holds, dedup, queue) lives in socket.ts; these
  // methods are the point-level surface over it.

  /**
   * Default channel options for every channel in scope, GROUPED by side: `server` (`maxMessageSize`, `maxConnections`,
   * `connectionTtl`), `client` (`reconnect`, `linger`, `ping`, `upgradable`, the lifecycle callbacks), and
   * `preventTransformer` / `resumable` top-level. On root, base, plugin. Resolution lowest-to-highest: chain options →
   * the closing `.channel({...})` → the call site (flat — the call names its own side); callbacks at every level run in
   * order.
   *
   * Server-and-client — the method is kept on both bundles; the compiler drops the `server` group from the client
   * bundle and the `client` group from the server one, so the argument must be an object literal without spreads.
   *
   *     .channelOptions({ client: { linger: 3000, onConnect: ({ connection }) => console.info(connection.status) } })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  channelOptions<TSelf>(this: TSelf, channelOptions: ChannelPointOptions<TError>): TSelf
  channelOptions(channelOptions: ChannelPointOptions<TError>) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`channelOptions, point ${this.id}`)
    }
    return this._continue({
      _defaultChannelOptions: mergeChannelOptions(
        this._defaultChannelOptions,
        flattenSidedOptions(channelOptions),
      ) as never,
    }) as never
  }

  /**
   * Default server-handler options for every serverHandler in scope, GROUPED by side: `client` (`timeout`, `queue`,
   * `onReplyFromServer`, `onSendError`), `server` (`onBeforeServerReply`, `onAfterServerReply`). On root, base, plugin
   * — and on a channel, since handlers grow from it. In the chain-level `onReplyFromServer` the `data` is unknown — the
   * callback's `point` tells which handler replied.
   *
   * Server-and-client — the method is kept on both bundles; the compiler drops the wrong group per bundle, so the
   * argument must be an object literal without spreads.
   *
   *     .serverHandlerOptions({ client: { onReplyFromServer: ({ data, point }) => analytics.track(point.name, data) } })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  serverHandlerOptions<TSelf>(this: TSelf, serverHandlerOptions: ServerHandlerPointOptions): TSelf
  serverHandlerOptions(serverHandlerOptions: ServerHandlerPointOptions) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`serverHandlerOptions, point ${this.id}`)
    }
    return this._continue({
      _defaultServerHandlerOptions: mergeServerHandlerOptions(
        this._defaultServerHandlerOptions,
        flattenSidedOptions(serverHandlerOptions),
      ),
    }) as never
  }

  /**
   * Default client-handler options for every clientHandler in scope, GROUPED by side: `client` (`onMessageFromServer`),
   * `server` (`timeout` — the reply-collection window), plus the top-level `resumable` (opt this handler's pushes into
   * a resumable channel's replay buffer). On root, base, plugin — and on a channel. In the chain-level
   * `onMessageFromServer` the `message` is unknown — narrow by the callback's `point`. Listeners add up: every
   * registered listener fires exactly once per message.
   *
   * Server-and-client — the method is kept on both bundles; the compiler drops the wrong group per bundle, so the
   * argument must be an object literal without spreads.
   *
   *     .clientHandlerOptions({ client: { onMessageFromServer: ({ point, message }) => console.info(point.name, message) } })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  clientHandlerOptions<TSelf>(this: TSelf, clientHandlerOptions: ClientHandlerPointOptions): TSelf
  clientHandlerOptions(clientHandlerOptions: ClientHandlerPointOptions) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`clientHandlerOptions, point ${this.id}`)
    }
    return this._continue({
      _defaultClientHandlerOptions: mergeClientHandlerOptions(
        this._defaultClientHandlerOptions,
        flattenSidedOptions(clientHandlerOptions),
      ),
    }) as never
  }

  /**
   * Default space options for every space in scope, GROUPED by side: `server` (`maxRooms`, `onBeforeJoiner`,
   * `onAfterJoiner`), `client` (`linger`, `onEnter`, `onLeave`), and the top-level `resumable: false` opt-out of a
   * resumable channel's restore. On root, base, plugin — and on a channel, since spaces grow from it. In the
   * chain-level callbacks the `input`/`identity`/`rooms` are unknown — narrow by the callback's `point`. Callbacks
   * stack chain → the closing `.space({...})` and run in order.
   *
   * Server-and-client — the method is kept on both bundles; the compiler drops the `server` group (join guards, cap)
   * from the client bundle and the `client` group from the server one, so the argument must be an object literal
   * without spreads.
   *
   *     .spaceOptions({ server: { onAfterJoiner: ({ point, output }) => metrics.join(point.name, output?.length ?? 0) } })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  spaceOptions<TSelf>(this: TSelf, spaceOptions: SpacePointOptions): TSelf
  spaceOptions(spaceOptions: SpacePointOptions) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`spaceOptions, point ${this.id}`)
    }
    return this._continue({
      _defaultSpaceOptions: mergeSpaceOptions(this._defaultSpaceOptions, flattenSidedOptions(spaceOptions)),
    }) as never
  }

  /**
   * Default subscription options for every subscription in scope (`reconnect`, the point-level `onMessageFromServer`
   * listener, the lifecycle callbacks `onConnect` / `onDisconnect` / `onError`). On root, base, plugin. Resolution
   * lowest-to-highest: `.subscriptionOptions()` → the closing `.subscription({...})` → the call site; listeners and
   * callbacks at every level run in order. The tracked-cursor pair is NOT declarable here — its paths name one point's
   * schema fields, so it lives on the closing `.subscription({...})` only.
   *
   * Server-and-client — kept on both bundles (isomorphic config; the listener and the lifecycle callbacks are client
   * code the compiler cuts from the server bundle).
   *
   *     .subscriptionOptions({ reconnect: { delay: 1000 } })
   *
   * Full reference: https://1gr14.dev/point0/latest/subscription
   */
  subscriptionOptions<TSelf>(
    this: TSelf,
    subscriptionOptions: Omit<SubscriptionPointOptions, 'cursorParamFromInput' | 'cursorParamFromData'>,
  ): TSelf
  subscriptionOptions(subscriptionOptions: SubscriptionPointOptions) {
    return this._continue({
      _defaultSubscriptionOptions: mergeSubscriptionOptions(this._defaultSubscriptionOptions, subscriptionOptions),
    }) as never
  }

  /**
   * The schema of what the CLIENT SENDS to this serverHandler — parsed by the server on every incoming message, like
   * `.input` on a mutation. Optional: a serverHandler without it takes no message payload. The name is the verb pair of
   * `.serverReply`: the client sends, the server replies (and the runtime twin is `sendToServer`). Any Standard Schema
   * library or a plain validate function works, and the no-arg type-only form skips runtime validation.
   *
   * Server-only — the schema is cut from the client bundle (with the imports it pulls in).
   *
   *     .clientSend(z.object({ text: z.string().min(1) }))    // schema form
   *     .clientSend((raw) => parseMessage(raw))               // custom validate-fn form
   *     .clientSend<{ text: string }>()                       // no-arg, type-only
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  clientSend<
    TNextServerInputSchema extends InputSchema,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientSend'> &
      AssertInputSchemaNotWider<TNextServerInputSchema, TServerInputSchema, TClientInputSchema>,
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  clientSend<
    TInputRaw extends InputRaw,
    TInputParsed extends InputParsed = TInputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientSend'> &
      AssertInputSchemaNotWider<
        RecordValidationSchema<TInputRaw, TInputParsed>,
        TServerInputSchema,
        TClientInputSchema
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  clientSend<
    TValidateFn extends CustomValidationFn<any>,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientSend'> &
      AssertInputSchemaNotWider<
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        TServerInputSchema,
        TClientInputSchema
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  clientSend<
    TInput extends InputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientSend'> &
      AssertInputSchemaNotWider<RecordValidationSchema<TInput, TInput>, TServerInputSchema, TClientInputSchema>,
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
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema,
      THeadersSchema,
      TCookiesSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  clientSend(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`clientSend, point ${this.id}`)
    }
    this._assertSetupStageAllowed('clientSend')
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({ _clientSendSchema: schema }) as never
  }

  /**
   * The schema of what the SERVER SENDS through this clientHandler — what `.sendToClient` carries and what the client
   * receives as `input`. Optional: a clientHandler without it is a pure trigger. The name is the verb pair of
   * `.clientReply`: the server sends, the client replies (runtime twin: `sendToClient`) — and the server trusts itself,
   * so the schema types the message without a server-side parse. Any Standard Schema library or a plain validate
   * function works, and the no-arg type-only form is the common one.
   *
   * Client-only — the schema is cut from the server bundle (with the imports it pulls in).
   *
   *     .serverSend(z.object({ message: MessageSchema }))    // schema form
   *     .serverSend((raw) => parseMessage(raw))              // custom validate-fn form
   *     .serverSend<{ message: Message }>()                  // no-arg, type-only
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  serverSend<
    TNextClientInputSchema extends InputSchema,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'serverSend'> &
      AssertInputSchemaNotWider<TNextClientInputSchema, TServerInputSchema, TClientInputSchema>,
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  serverSend<
    TInputRaw extends InputRaw,
    TInputParsed extends InputParsed = TInputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'serverSend'> &
      AssertInputSchemaNotWider<
        RecordValidationSchema<TInputRaw, TInputParsed>,
        TServerInputSchema,
        TClientInputSchema
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  serverSend<
    TValidateFn extends CustomValidationFn<any>,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'serverSend'> &
      AssertInputSchemaNotWider<
        CustomValidationFnToRecordValidationSchema<TValidateFn>,
        TServerInputSchema,
        TClientInputSchema
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  serverSend<
    TInput extends InputRaw,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'serverSend'> &
      AssertInputSchemaNotWider<RecordValidationSchema<TInput, TInput>, TServerInputSchema, TClientInputSchema>,
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  serverSend(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`serverSend, point ${this.id}`)
    }
    this._assertSetupStageAllowed('serverSend')
    const schema = Point0._normalizeInputSchema(args[0])
    return this._continue({ _serverSendSchema: schema }) as never
  }

  /**
   * The server's answer to a serverHandler message — required before closing (a server handler without one is
   * meaningless). Receives `{ input, identity, connectionId, messageId, points }` (+ the typed `room` on a space
   * handler) — no `request`/`set`/`ctx`: messages travel over the socket, everything request-shaped was established by
   * the connector at connect time and lives in the identity. Takes no schema — the server trusts itself, only client
   * answers need checking. The client's `.sendToServer()` resolves with its return.
   *
   * Answer early and keep working: the explicit generic — `.serverReply<T>(...)` — names the reply type and puts the
   * imperative `reply` into the args (a call argument cannot drive inference the way a `return` does, so the type must
   * be named). Call `reply(data)` and the envelope leaves immediately while the code keeps running; a later `return` is
   * ignored. `reply(new Error(...))` rejects the client's send; `.serverReply<undefined>()` makes `reply(undefined)`
   * the early ack. `return` works the same with or without the generic. A throw AFTER the reply cannot reach the sender
   * — it is logged and emitted as `pointHandlerServerLateError` (an `.on('error')` subscription sees it), while the
   * message stays settled as the success the client was already told about.
   *
   * Server-only — the callback body (and the imports it pulls in) is cut from the client bundle.
   *
   *     .serverReply(async ({ input, identity, room }) => ({ message: await createMessage(input, identity, room) }))
   *     .serverReply<{ accepted: boolean }>(async ({ input, reply }) => {
   *       reply({ accepted: true }) // the client resolves now…
   *       await heavyPostProcessing(input) // …while the server keeps working
   *     })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  serverReply<
    // the optional EXPLICIT reply type — `.serverReply<T>(fn)` types the reply without inferring it from the return
    // and unlocks the imperative `reply` in the args (precedent: `.connector<TIdentity>()`)
    TExplicitReply extends UnknownData | undefined = never,
    TReplyFn extends ServerReplyChainFn<TIdentity, TRoom, TServerInputSchema, TExplicitReply> = ServerReplyChainFn<
      TIdentity,
      TRoom,
      TServerInputSchema,
      TExplicitReply
    >,
  >(
    replyFn: TReplyFn & AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'serverReply'>,
  ): NiceStagePoint<
    'loadedStage',
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    // the explicit generic names the reply outright (its `undefined` arm — the pure ack — types as EmptyData, the
    // same shape a bare ack always had); otherwise the reply's data is the awaited return
    [TExplicitReply] extends [never]
      ? IfNeverThen<Exclude<Awaited<ReturnType<TReplyFn>>, void>, EmptyData>
      : IfNeverThen<Exclude<TExplicitReply, undefined>, EmptyData>,
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  serverReply(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`serverReply, point ${this.id}`)
    }
    this._assertSetupStageAllowed('serverReply')
    // the client bundle arrives stripped — `.serverReply()` with no args — mirror the connector's stub fallback so
    // `_serverReplyFn` is set on BOTH bundles (the flavor guards below rely on it). The stub must never RUN on
    // either side — the server bundle keeps the real callback — so executing it is a loud mis-strip signal, not a
    // silent `{}` reply.
    const replyFn = (args[0] ??
      (() => {
        throw new Error(
          `The .serverReply() stub was executed — the reply callback was stripped from the executing bundle. This is a bundling bug: the server bundle must keep the real callback. Point: ${this.toStringWithLocation()}`,
        )
      })) as ServerReplyFn<any, any, any, any>
    // the runtime mirror of the type-level constraint: a reply answers, it never streams — the server streams to
    // clients through a `.subscription()` clientHandler's pushes
    if (Point0._isGeneratorFunction(replyFn)) {
      throw new Error(
        `A generator .serverReply is not supported — a reply answers one send. Stream to clients through a clientHandler instead: the server pushes with sendToClient, the client listens with useOnMessageFromServer or iterates with iterateMessagesFromServer. Point: ${this.toStringWithLocation()}`,
      )
    }
    return this._continue({
      type: 'loadedStage',
      _serverReplyFn: replyFn,
    }) as never
  }

  /** Is this callback declared as a generator (`function*` / `async function*`)? A reply refuses both kinds. */
  private static _isGeneratorFunction(fn: unknown): boolean {
    if (typeof fn !== 'function') {
      return false
    }
    const name = (fn as { constructor?: { name?: string } }).constructor?.name
    return name === 'AsyncGeneratorFunction' || name === 'GeneratorFunction'
  }

  /**
   * The client's answer to a clientHandler message — a module-level reaction that runs on every message regardless of
   * what's mounted. Its return is what listeners receive as `data` and what travels back to the server as this client's
   * reply. Clients can send anything, so pass a schema as the second argument and the server validates every reply with
   * it — the parsed type becomes the reply type.
   *
   * Split by the compiler: the callback is client code (replaced with `() => {}` in the server bundle), the schema is
   * server code (dropped from the client bundle).
   *
   *     .clientReply(({ message }) => ({ answer: `pong: ${message.ask}` }))                          // callback only
   *     .clientReply(({ message }) => ({ answer: message.ask }), z.object({ answer: z.string() }))  // + server-checked schema
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  clientReply<
    TReplyFn extends ClientReplyFn<TChannelInput, TRoom, TClientInputSchema, TError, UnknownData>,
    TReplySchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
    TCheckError = AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'clientReply'> &
      AssertClientReplyMatchesSchema<TReplyFn, TReplySchema>,
  >(
    replyFn: TReplyFn,
    // a bare `TReplySchema & TCheckError` would block inference — the check lives in the WithError return instead
    replySchema?: TReplySchema,
  ): WithError<
    TCheckError,
    NiceStagePoint<
      'loadedStage',
      ReadyPointTypeOrNever<TLetsReadyPointType>,
      TRequiredCtx,
      TError,
      TCtx,
      TCtxExposedKeys,
      TReplySchema extends InputSchema
        ? InputParsed<TReplySchema>
        : IfNeverThen<Awaited<ReturnType<TReplyFn>>, EmptyData>,
      IfNeverThen<Awaited<ReturnType<TReplyFn>>, EmptyData>,
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
      TQueriesDefinitions,
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TChannelInput,
      TIdentity,
      TSpaceInput,
      TRoom
    >
  >
  clientReply(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`clientReply, point ${this.id}`)
    }
    this._assertSetupStageAllowed('clientReply')
    const replySchema = args[1] === undefined ? undefined : Point0._normalizeInputSchema(args[1])
    return this._continue({
      type: 'loadedStage',
      _clientReplyFn: args[0] as ClientReplyFn<any, any, any, any, any>,
      _clientReplySchema: replySchema,
    }) as never
  }

  /**
   * The channel's connect callback — runs on every connect request through the full endpoint pipeline (middleware,
   * plugins, `.ctx`, input parse) and returns the connection's **identity**, bare: the connection's private server-side
   * data (who this connection is — userId, role, …), frozen until a reconnect or a `refresh`. The identity is what
   * handlers receive next to their input, what admin selections (`kill` / `connections`) match over, and what `.joiner`
   * sees when the client enters a space's rooms. Nothing else comes out of a connect — no rooms (spaces own them) and
   * no data (a query next door answers questions). The connector itself is optional: a channel without one connects
   * with an empty identity. The access check lives here — throw and the connect fails with the typed error (and it
   * re-applies on every reconnect and `refresh`).
   *
   * Server-only — the body (and every import only it uses) is stripped from the client bundle (runs server-side).
   *
   *     .connector(async ({ ctx }) => ({ userId: ctx.me.user.id, role: ctx.me.role }))
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  connector<
    // the optional EXPLICIT identity — `.connector<TIdentity>(fn)` types the identity without inferring it from the
    // callback's return. Needed to break a self-referential inference cycle: a connector that calls its own channel's
    // server surface (`appChannel.connections.server.count(...)`) would otherwise fail with "referenced in its own
    // initializer" (precedent: the type-only `.clientSend<T>()`)
    TExplicitIdentity extends UnknownData = never,
    TConnectorFn extends LoaderFn<
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
      TError
    > = LoaderFn<
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
      TError
    >,
  >(
    connectorFn: TConnectorFn &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'connector'> &
      AssertResponseNotAllowed<InferLoaderFnOutput<TConnectorFn>, 'channel'>,
  ): NiceStagePoint<
    'loadedStage',
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    [TExplicitIdentity] extends [never] ? IfNeverThen<InferLoaderFnOutput<TConnectorFn>, EmptyData> : TExplicitIdentity,
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    // the identity is WRITTEN the moment it appears — the connector's return names it (`Extract` guards the record
    // form); an explicit `.connector<TIdentity>` names it directly (breaks the self-referential inference cycle)
    [TExplicitIdentity] extends [never]
      ? IfNeverThen<Extract<InferLoaderFnOutput<TConnectorFn>, UnknownData>, EmptyData>
      : TExplicitIdentity,
    TSpaceInput,
    TRoom
  >
  connector(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`connector, point ${this.id}`)
    }
    this._assertSetupStageAllowed('connector')
    if (this._letsReadyPointType !== 'channel') {
      throw new Error(`connector() lives on channel points only, got ${this.toStringWithLocation()}`)
    }
    // the client bundle arrives stripped — `.connector()` with no args — mirror the loader's passthrough fallback
    const connectorFn = (args[0] ?? ((c: any) => c.data)) as LoaderFn<
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
    return this._continue({
      type: 'loadedStage',
      _hasServerLoader: true,
      // the DECLARATION fact, kept apart from `_hasServerLoader` (which the closer's default connector sets too) —
      // `amendIdentity` reads it to refuse a connectorless channel on every bundle (the stripped call survives)
      _connectorDeclared: true,
      _serverExecuteActions: [
        ...this._serverExecuteActions,
        { type: 'loader', fn: connectorFn, unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  /**
   * The space's join callback: which rooms a client enters. It runs over the socket per join — the channel already
   * authenticated the connection, so there is no request here, just the parsed `input` and the connection's frozen
   * `identity`. Return one room snapshot, an ARRAY of snapshots (enter several at once), an empty array or nothing (a
   * clean deny — `joined` with no rooms). Throw to fail the join (the client sees the typed error on the membership).
   * The return is CHECKED against the room shape the opener declared (`.lets<{ chatId: string }>('space', 'chat')`) —
   * it never declares it, and it may not be WIDER either: a key the space never declared is a type error, because the
   * room snapshot IS the room's address (`{ chatId: 'c1', extra: 1 }` is a different pub/sub topic, deaf to every send
   * aimed at `{ chatId: 'c1' }`). Map a wide row down to the room shape rather than passing it through.
   *
   * Declaring it is what MAKES a space joinable: with no `.joiner` a client `join` is refused outright (a
   * `POINT0_SOCKET_JOIN_NOT_ALLOWED` typed error, thrown on the client before any frame leaves) and the server enrolls
   * into the space itself, through `.enroller` / `space.enroll()`.
   *
   * Server-only — the callback body (and the imports it pulls in) is cut from the client bundle (mirrors `.connector`).
   *
   *     .joiner(async ({ input, identity }) => (await isMember(identity.userId, input.chatId) ? { chatId: input.chatId } : undefined))
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  joiner<TReturnedRoom extends TRoom, TCheckRoom extends AssertRoomNotWider<TReturnedRoom, TRoom>>(
    // the room type comes from the OPENER's generic and NOTHING the chain carries is read out of the callback — `TRoom`
    // passes through this method untouched. That is what lets a joiner call its own space's server surface
    // (`chatSpace.memberships.server.count(…)`): the space's type never depends on the callback's, so a self-reference
    // in the body is a plain value reference, not a "referenced in its own initializer" cycle. (Feeding a RETURN
    // EXPRESSION from that call is still the ordinary circularity every `const` has — TS7024 — and always was.)
    // `TReturnedRoom` is the one thing read back, and it feeds nothing downstream: it is inferred from the return only
    // so `AssertRoomNotWider` can compare its KEYS with the declared room. That comparison is not decoration —
    // assignability alone accepts a wider object, and TypeScript's excess-property check never fires on a callback's
    // return (5.9/6.0/7.0 alike), so without it `() => ({ chatId, extra })` would silently join a DIFFERENT room.
    // `TCheckRoom` carries the verdict as a second type parameter, constrained by it and given NO default on purpose:
    // whatever it infers still has to satisfy that constraint, so a `ShowError` verdict fails the call and reads back
    // as the message, and the second slot keeps `.joiner<{ … }>(…)` an arity error — the room stays declarable at the
    // opener and nowhere else.
    // `TRoom` also goes into `JoinerFn` BARE — no `& UnknownData` to satisfy a narrower constraint (`JoinerFn` takes the
    // chain's own room union): that intersection would drag an index signature into the return position, which makes
    // every key look declared and stops a wrongly-TYPED one from being rejected
    joinerFn: JoinerFn<TIdentity, TServerInputSchema, TReturnedRoom> &
      TCheckRoom &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'joiner'>,
  ): NiceStagePoint<
    'loadedStage',
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    // the room came from the opener and passes through untouched — a joiner names no types, it is checked against them
    TRoom
  >
  joiner(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`joiner, point ${this.id}`)
    }
    this._assertSetupStageAllowed('joiner')
    if (this._letsReadyPointType !== 'space') {
      throw new Error(`joiner() lives on space points only, got ${this.toStringWithLocation()}`)
    }
    // the client bundle arrives stripped — `.joiner()` with no args — but the CALL survives, so `_joinerDeclared` still
    // records the fact and the client can refuse a join on a joinerless space without asking the server
    const joinerFn = args[0] as JoinerFn<any, any, any> | undefined
    return this._continue({
      type: 'loadedStage',
      _joinerFn: joinerFn,
      _joinerDeclared: true,
    }) as never
  }

  /**
   * The space's server-side auto-enrollment: which rooms a FRESH CONNECTION enters without the client joining — runs at
   * connection setup (both connect paths), reading the connection's frozen identity. The canonical case is the hot
   * personal-push room: `.enroller(({ identity }) => ({ userId: identity.userId }))` — then `sendToClient(message, {
   * room: { userId } })` reaches the user over the pub/sub hot path with zero client code. The client learns its
   * enrollments from the connect confirmation and holds them WITHOUT holds: they live with the connection, and the
   * client may still `leave()` one — the rooms drop server-side, and the NEXT connection setup (a reconnect, a
   * `refresh`) re-runs this callback and enrolls again, so a permanent opt-out is data the enroller reads. Return one
   * room snapshot, an array, or nothing — CHECKED against the room shape the opener declared (`.lets<{ userId: string
   * }>('space', 'notifications')`), extra keys included: an undeclared key makes it a different room, so it is a type
   * error, exactly like on `.joiner`. A space takes at most one `.enroller`; `.joiner` and `.enroller` coexist (the
   * client can still join more rooms), in either order, and an enroller-only space is the server-enrolled kind —
   * clients cannot join it at all. A throw here fails the WHOLE connection setup — the client sees a failed connect
   * (`claimErr`), never a connection missing its enrolled rooms. Not allowed together with `resumable: false` — a
   * resume would silently drop the enrollments (the `.space()` closer throws).
   *
   * Server-only — the callback body (and the imports it pulls in) is cut from the client bundle (mirrors `.joiner`).
   *
   *     .enroller(({ identity }) => ({ userId: identity.userId }))
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  enroller<TReturnedRoom extends TRoom, TCheckRoom extends AssertRoomNotWider<TReturnedRoom, TRoom>>(
    // like `.joiner`: the room comes from the OPENER's generic, the chain carries nothing read out of the callback, and
    // `TReturnedRoom`/`TCheckRoom` exist only to compare the returned keys with the declared ones (see `.joiner` for
    // why assignability alone lets an extra key through)
    enrollerFn: EnrollerFn<TIdentity, TReturnedRoom> & TCheckRoom & AssertEnrollerNotDefined<TClientLoaderOutput>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TError,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    // the marker slot: an enroller is declared (the client-loader slot is unused on spaces) — guards the second one.
    // Pure flag — the room itself is written into `TRoom` below, not threaded through slots.
    EmptyData,
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    // the room came from the opener and passes through untouched — an enroller names no types either
    TRoom
  >
  enroller(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`enroller, point ${this.id}`)
    }
    if (this._letsReadyPointType !== 'space') {
      throw new Error(`enroller() lives on space points only, got ${this.toStringWithLocation()}`)
    }
    // allowed while composing AND after `.joiner` (loadedStage) — the two coexist in either order
    if (this.type !== 'coreStage' && this.type !== 'loadedStage') {
      throw new Error(
        `You can not call .enroller() on point ${this.toStringWithLocation()} — its setup stage is "${this.type}"`,
      )
    }
    if (this._enrollerFn) {
      throw new Error(
        `This space already has an .enroller — a space takes at most one (${this.toStringWithLocation()})`,
      )
    }
    // the client bundle arrives stripped — `.enroller()` with no args — the client learns enrollments from the
    // connect confirmation, it never runs the callback
    const enrollerFn = args[0] as EnrollerFn<any, any> | undefined
    return this._continue({
      _enrollerFn: enrollerFn,
    }) as never
  }

  /**
   * Close a channel point: a live connection clients open through the dual-method channel endpoint (`GET`/`POST
   * /_point0/<scope>/channel/<name>`, chosen by input length like a query) — the connector runs per connect and its
   * return IS the connection identity (server-side only), then the connection binds to the client's WebSocket. Grow
   * spaces and message handlers from the closed channel with `.lets.space()` / `.lets.serverHandler()` /
   * `.lets.clientHandler()`. The optional argument is the channel options, grouped by side: `server` (the caps),
   * `client` (reconnect, linger, ping, upgradable, the lifecycle callbacks), plus `preventTransformer` and `resumable`
   * top-level.
   *
   * Server-and-client — the channel closer is kept on both bundles; the compiler drops the wrong group per bundle, so
   * the argument must be an object literal without spreads.
   *
   *     export const chatChannel = root.lets.channel().input(schema).connector(connectFn).channel()
   *     // .channel({ server: { maxMessageSize: 4096 }, client: { linger: 3000 } })   // options form
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  channel(
    ...args: TLetsReadyPointType extends 'channel'
      ? TServerLoaderOutput extends UnknownData | UndefinedLoaderOutput
        ? [
            channelOptions?: ChannelPointOptions<
              TError,
              ClientChannelConnection<
                FinalInputRaw<
                  'channel',
                  TServerInputSchema,
                  TClientInputSchema,
                  TParamsSchema,
                  TSearchSchema,
                  TBodySchema
                >,
                TError
              >
            >,
          ]
        : [
            ShowError<`Channel connector must return the identity (an object) or nothing — anything else is a type error`>,
          ]
      : never
  ): NiceChannelReadyPoint<
    'channel',
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    // the channel exists NOW — the closer writes the connect input; the identity was already written by the
    // `.connector()` itself (a connectorless channel keeps the sentinel → `{}`)
    FinalInputRaw<'channel', TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    [TIdentity] extends [UndefinedIdentity] ? EmptyObject : TIdentity,
    TSpaceInput,
    TRoom
  >
  channel(...args: any) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`channel, point ${this.id}`)
    }
    if (this._letsReadyPointType !== 'channel') {
      throw new Error(`channel() closes a channel point only, got ${this.toStringWithLocation()}`)
    }
    const [channelOptionsGrouped = {}] = args as [ChannelPointOptions<TError> | undefined]
    // the declaration is GROUPED (`{ server, client }` — the compiler cuts the wrong group per bundle); everything
    // downstream reads the RESOLVED flat shape, so flatten once, here at the entry point
    const channelOptions = flattenSidedOptions<ChannelOptionsResolved<TError>>(channelOptionsGrouped)
    // a connectorless channel is legal — one shared identityless pipe. The closer registers the default connector
    // ITSELF (identity `{}` — NOT the input: the input-passthrough fallback above is for a STRIPPED declared
    // connector, a different case), so downstream nobody special-cases "a channel may have no loader".
    const defaultConnectorAction: ServerExecuteAction[] = this._hasServerLoader
      ? []
      : [{ type: 'loader', fn: () => ({}), unstableId: Point0._getNextUnstableId() }]
    // `preventTransformer` resolves HERE, once — a wire format is a declaration fact, not a runtime option: the closed
    // channel carries the fact, and the spaces and handlers that chain off it inherit it. `_transformer` stays the
    // app transformer — the socket serialization sites read `_getSocketTransformer`, which honors this fact.
    const resolvedAtClose = mergeChannelOptions(this._defaultChannelOptions, channelOptions)
    const preventSocketTransformer = resolvedAtClose.preventTransformer === true
    // the resumable validation cascade, the channel's leg: the `server.resume` TUNING configures machinery only
    // `resumable: true` turns on — accepted without the switch it would sit dead and lie about being in force
    if (resolvedAtClose.resume !== undefined && resolvedAtClose.resumable !== true) {
      throw new Error(
        `channel \`server.resume\` needs the top-level \`resumable: true\` (point ${this.toStringWithLocation()}) — the park window and the stream buffers only exist on a resumable channel; remove the group or make the channel resumable`,
      )
    }
    return this._continue({
      type: 'channel',
      _preventSocketTransformer: preventSocketTransformer,
      _channelOptions: channelOptions,
      _letsReadyPointType: undefined,
      _hasServerLoader: true,
      _serverExecuteActions: [...this._serverExecuteActions, ...defaultConnectorAction],
      // a channel is a mountable like a provider: its chain's mount actions (inherited wrappers, .loading/.error,
      // .with injections) run in `<channel.Connection>` through the same interpreter, closed by the channel's own
      // terminal step — hold the connection, gate, provide the channel context. Route-bound actions inherited from
      // the scope (`.search`/`.params`) are dropped — a channel has no route surface to parse them from.
      _mountActions: [
        ...this._mountActions.filter((action) => action.type !== 'search' && action.type !== 'params'),
        { type: 'selfConnection', unstableId: Point0._getNextUnstableId() },
      ],
    }) as never
  }

  /**
   * Close a space point: a family of rooms of one shape inside a channel. The room shape is declared at the OPENER
   * (`.lets<{ chatId: string }>('space', 'chat')` / `.lets.space<{ chatId: string }>()`; omitted, it is the single
   * global room `{}`). Clients `join(input)` it over the socket, the `.joiner` decides which rooms they enter, and its
   * handlers (grown with `.lets.serverHandler()` / `.lets.clientHandler()`) target those rooms. No `.joiner` = clients
   * cannot join at all — only the server enrolls, through `.enroller` / `space.enroll()`. The optional argument is the
   * space options, grouped by side: `server` (`maxRooms` and the join guards `onBeforeJoiner` / `onAfterJoiner`),
   * `client` (`linger` and the membership lifecycle), plus the top-level `resumable: false` opt-out of a resumable
   * channel's restore.
   *
   * Server-and-client — the space closer is kept on both bundles; the compiler drops the `server` group (server code)
   * from the client bundle and the `client` group from the server one, so the argument must be an object literal
   * without spreads.
   *
   *     export const chatSpace = appChannel.lets.space<{ chatId: string }>().input(schema).joiner(joinFn).space()
   *     // .space({ server: { onBeforeJoiner: ({ connectionId }) => assertCanJoinMore(chatSpace.memberships.server.local.rooms({ connectionId })) } })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  space(
    ...args: TLetsReadyPointType extends 'space'
      ? [
          spaceOptions?: SpacePointOptions<
            FinalServerInputParsed<'space', TServerInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
            TIdentity,
            TRoom
          >,
        ]
      : never
  ): NiceSpaceReadyPoint<
    'space',
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    // the space's own input becomes `TSpaceInput` for its handlers
    FinalInputRaw<'space', TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    // the room slot was written at the opener — the closer carries it through, it never falls back to anything
    TRoom
  >
  space(...args: any) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`space, point ${this.id}`)
    }
    if (this._letsReadyPointType !== 'space') {
      throw new Error(`space() closes a space point only, got ${this.toStringWithLocation()}`)
    }
    const [spaceOptionsGrouped = {}] = args as [SpacePointOptions | undefined]
    const spaceOptions = flattenSidedOptions<SpaceOptionsResolved>(spaceOptionsGrouped)
    // the resumable validation cascade, the space's leg (the clientHandler closer holds the other two): the resume
    // opt-out must not lie about itself either. Both checks fail at module load; the resolution is chain -> closer,
    // like every option
    const resolvedResumable = mergeSpaceOptions(this._defaultSpaceOptions, spaceOptions).resumable
    if (resolvedResumable === false) {
      // declaration-only facts on both bundles — this check runs on both sides
      if (this._getChannelPointOptions().resumable !== true) {
        throw new Error(
          `space \`resumable: false\` needs \`resumable: true\` on its channel (point ${this.toStringWithLocation()}) — a non-resumable channel has no resume to opt out of, so the option is a silent no-op; remove it or make the channel resumable`,
        )
      }
      // self-defeating combination: a resume drops the client's enrolled memberships of an opt-out space (the server
      // half is not restored), and the enroller re-runs only on a FULL connect — the enrollment would silently
      // vanish on every resume. The enroller callback is stripped from the client bundle, so in a compiled app this
      // check fires server-side (which fails the app at start all the same).
      if (this._enrollerFn) {
        throw new Error(
          `.enroller is not allowed on a \`resumable: false\` space (point ${this.toStringWithLocation()}) — a resume never restores an opt-out space's enrollments and the enroller only re-runs on a full connect, so the enrollment would silently vanish on every resume; remove the opt-out or the enroller`,
        )
      }
    }
    // the `server.resume` ceilings tune streams this space only HAS while it takes part in the resume — accepted
    // outside that, the group would sit dead and lie about being in force (same posture as the channel's leg)
    const resolvedSpaceResume = mergeSpaceOptions(this._defaultSpaceOptions, spaceOptions).resume
    if (resolvedSpaceResume !== undefined) {
      if (this._getChannelPointOptions().resumable !== true) {
        throw new Error(
          `space \`server.resume\` needs \`resumable: true\` on its channel (point ${this.toStringWithLocation()}) — the stream buffers only exist on a resumable channel; remove the group or make the channel resumable`,
        )
      }
      if (resolvedResumable === false) {
        throw new Error(
          `space \`server.resume\` is not allowed together with \`resumable: false\` (point ${this.toStringWithLocation()}) — an opt-out space has no streams to tune; remove one of the two`,
        )
      }
    }
    const point = this._continue({
      type: 'space',
      _spaceOptions: spaceOptions,
      _letsReadyPointType: undefined,
      // a space is a mountable like a provider — `<space.Membership>` runs the same interpreter, closed by the
      // space's own terminal step (join, gate, provide the space context). Route-bound actions are dropped like on
      // the channel closer — a space has no route surface.
      _mountActions: [
        ...this._mountActions.filter((action) => action.type !== 'search' && action.type !== 'params'),
        { type: 'selfMembership', unstableId: Point0._getNextUnstableId() },
      ],
    })
    // the client resolves ENROLLED spaces from the claimed frame by name — register at close time (module load),
    // like clientHandler points do for dispatch. The closer's own feature guard already refused a stripped build
    // above (declaring a socket point NEEDS the feature), so the registry call is unconditional here.
    registerSpacePoint(point as never)
    return point as never
  }

  /**
   * Close a serverHandler point: a client → server message type inside a channel. `.serverReply` is required before
   * closing. The optional argument is the handler options, grouped by side: `client` (`timeout`, `queue`,
   * `onReplyFromServer`, `onSendError`), `server` (`onBeforeServerReply`, `onAfterServerReply`).
   *
   * Server-and-client — the closer is kept on both bundles; the compiler drops the wrong group per bundle, so the
   * argument must be an object literal without spreads.
   *
   *     export const messageSendHandler = chatChannel.lets
   *       .serverHandler()
   *       .clientSend(schema)
   *       .serverReply(reply)
   *       .serverHandler()
   *     // .serverHandler({ client: { onReplyFromServer: ({ data }) => analytics.track('sent', data) } })   // options form
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  serverHandler(
    ...args: TLetsReadyPointType extends 'serverHandler'
      ? TServerLoaderOutput extends LoaderOutput
        ? [
            serverHandlerOptions?: ServerHandlerPointOptions<
              TServerLoaderOutput,
              InputParsed<TServerInputSchema>,
              TIdentity,
              TRoom,
              InputRaw<TServerInputSchema>
            >,
          ]
        : [ShowError<`Point has no reply. Please add .serverReply() before calling .serverHandler()`>]
      : never
  ): NiceServerHandlerReadyPoint<
    'serverHandler',
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  serverHandler(...args: any) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`serverHandler, point ${this.id}`)
    }
    if (this._letsReadyPointType !== 'serverHandler') {
      throw new Error(`serverHandler() closes a serverHandler point only, got ${this.toStringWithLocation()}`)
    }
    // the client bundle has `.serverReply()` stripped — the runtime guard belongs to the server, where the reply runs
    if (_point0_env.side.is.server && !this._serverReplyFn) {
      throw new Error(
        `Point has no reply. Please add .serverReply() before calling .serverHandler() on ${this.toStringWithLocation()}`,
      )
    }
    const [serverHandlerOptionsGrouped = {}] = args as [ServerHandlerPointOptions | undefined]
    const serverHandlerOptions = flattenSidedOptions<ServerHandlerOptionsResolved>(serverHandlerOptionsGrouped)
    const point = this._continue({
      type: 'serverHandler',
      _serverHandlerOptions: serverHandlerOptions,
      _letsReadyPointType: undefined,
    })
    // the export is the CALLABLE binder — `handler(connection).sendToServer(input)`; the point rides on `.point`
    return point._getCallableHandler() as never
  }

  /**
   * Close a clientHandler point: a server → client message type inside a channel. Everything inside is optional — the
   * minimal one is a pure trigger. The optional argument is the handler options, grouped by side: `client`
   * (`onMessageFromServer` — a module-level listener here makes connecting all a client ever needs to do), `server`
   * (`timeout` — the reply-collection window), plus the top-level `resumable` (opt this handler's pushes into a
   * resumable channel's replay buffer — `true` or a per-connection frame ceiling).
   *
   * Server-and-client — the closer is kept on both bundles; the compiler drops the wrong group per bundle, so the
   * argument must be an object literal without spreads.
   *
   *     export const ideasChangedHandler = ideasChannel.lets.clientHandler().clientHandler()
   *     // .clientHandler({ client: { onMessageFromServer: ({ message }) => notify(message) } })   // options form
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  clientHandler(
    ...args: TLetsReadyPointType extends 'clientHandler'
      ? [clientHandlerOptions?: ClientHandlerPointOptions<InputParsed<TClientInputSchema>, TRoom>]
      : never
  ): NiceClientHandlerReadyPoint<
    'clientHandler',
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  clientHandler(...args: any) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`clientHandler, point ${this.id}`)
    }
    if (this._letsReadyPointType !== 'clientHandler') {
      throw new Error(`clientHandler() closes a clientHandler point only, got ${this.toStringWithLocation()}`)
    }
    const [clientHandlerOptionsGrouped = {}] = args as [ClientHandlerPointOptions | undefined]
    const clientHandlerOptions = flattenSidedOptions<ClientHandlerOptionsResolved>(clientHandlerOptionsGrouped)
    // the resume-buffer opt-in must not lie about itself: buffering frames a resume can never replay is a config
    // error, not a silent no-op. Both facts are declaration-only (top-level, on both bundles), so the check runs on
    // both sides and fails at module load — the closer is the start-time gate a point has
    const resolvedResumable = mergeClientHandlerOptions(
      this._defaultClientHandlerOptions,
      clientHandlerOptions,
    ).resumable
    if (resolvedResumable !== undefined) {
      if (this._getChannelPointOptions().resumable !== true) {
        throw new Error(
          `clientHandler resumable needs \`resumable: true\` on its channel (point ${this.toStringWithLocation()}) — the buffer only replays over a resumable connection`,
        )
      }
      if (this._spacePoint && this._spacePoint._getSpacePointOptions().resumable === false) {
        throw new Error(
          `clientHandler resumable is not allowed on a handler of a \`resumable: false\` space (point ${this.toStringWithLocation()}) — a resume never restores that space's rooms, so there is nowhere to replay the buffer to`,
        )
      }
      // an ambiguous shape must not resolve silently: `0` reads as "don't buffer" but the engine floors every
      // buffering handler at one frame — the honest spellings are omitting the option, a positive integer, `true`,
      // or the object form with the same rules on `buffer` and a known `replay` policy
      if (typeof resolvedResumable === 'number') {
        if (!Number.isInteger(resolvedResumable) || resolvedResumable < 1) {
          throw new Error(
            `clientHandler resumable must be \`true\`, a positive integer, or \`{ buffer?, replay? }\`, got ${String(resolvedResumable)} (point ${this.toStringWithLocation()}) — to not buffer this handler, omit the option`,
          )
        }
      } else if (resolvedResumable !== true) {
        // read through unknown on purpose: the closer guards UNTYPED misuse too, and the declared union would
        // otherwise let the lint call the junk-value comparisons impossible
        const { buffer, replay } = resolvedResumable as { buffer?: unknown; replay?: unknown }
        if (
          buffer !== undefined &&
          buffer !== true &&
          (typeof buffer !== 'number' || !Number.isInteger(buffer) || buffer < 1)
        ) {
          throw new Error(
            `clientHandler resumable.buffer must be \`true\` or a positive integer, got ${String(buffer)} (point ${this.toStringWithLocation()}) — to not buffer this handler, omit the resumable option`,
          )
        }
        if (replay !== undefined && replay !== 'always' && replay !== 'gapless') {
          throw new Error(
            `clientHandler resumable.replay must be 'always' or 'gapless', got ${String(replay)} (point ${this.toStringWithLocation()})`,
          )
        }
      }
    }
    const point = this._continue({
      type: 'clientHandler',
      _clientHandlerOptions: clientHandlerOptions,
      _letsReadyPointType: undefined,
    })
    // module-level listeners fire once the module is loaded — closing is the moment the client knows the handler.
    // Register the POINT (dispatch looks handlers up by point id), not the callable export (the closer's own feature
    // guard already refused a stripped build above; registerClientHandlerPoint no-ops on the server itself).
    if (_point0_env.side.is.client) {
      registerClientHandlerPoint(point as never)
    }
    // the export is the CALLABLE binder — `handler(connection).onMessageFromServer(cb)`; the point rides on `.point`
    return point._getCallableHandler() as never
  }

  /**
   * Hold a connection to this channel while the component is mounted — a regular connect request (the connector runs,
   * any server check applies), then messages flow over the client's one WebSocket. Holds are counted: every
   * `useConnection` / `<Connection>` / `connect()` with an equal input shares one real connection. Returns the
   * connection facade: `status`, `error`, `isLoading`, `input`, `id`, `connectionIndex`, `disconnect()` — no `data` and
   * no `room` (the connector's return is the server-side identity; rooms come from space memberships); re-renders on
   * status changes. During SSR nothing connects — it reports `'connecting'` on the server and does the real work after
   * mount.
   *
   * Server-and-client — kept on both bundles (the server render sees the `'connecting'` state).
   *
   *     const connection = chatChannel.useConnection({ chatId })
   *     // chatChannel.useConnection(
   *     //   { chatId },
   *     //   { onConnect: ({ connectionIndex }) => connectionIndex > 0 && chatMessagesQuery.invalidateQuery({ chatId }) },
   *     // )
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  useConnection(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: ExtraUseConnectionOptions<
      TError,
      ClientChannelConnection<
        FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
        TError
      >
    >,
  ): ClientChannelConnection<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    TError
  >
  useConnection(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`useConnection, point ${this.id}`)
    }
    return useSocketConnection(this as never, args[0], args[1]) as never
  }

  /**
   * The imperative `useConnection`: open (or share) a connection to this channel and hold it until `disconnect()`. Same
   * dedup rules; the returned object is live — `status` updates as the connect settles.
   *
   * Server-and-client — kept on both bundles (on the server it returns the inert `'connecting'` connection).
   *
   *     const connection = chatChannel.connect({ chatId })
   *     connection.disconnect()
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  connect(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: ExtraUseConnectionOptions<
      TError,
      ClientChannelConnection<
        FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
        TError
      >
    >,
  ): ClientChannelConnection<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    TError
  >
  connect(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`connect, point ${this.id}`)
    }
    return connectToChannel(this as never, args[0], args[1]) as never
  }

  /**
   * Look up the live connection of this channel for an input — the connection `useConnection`/`connect` opened with an
   * equal input, if one is live right now. Purely a lookup: no hold is added, nothing connects, and the returned object
   * is the same live facade the holders see (`status` updates as the connection moves). Throws when nothing matches —
   * reach for {@link getConnectionOrUndefined} to probe.
   *
   * Client-side — connections live in the browser (a runtime error on the server).
   *
   *     const connection = chatChannel.getConnection({ chatId })
   *     connection.status
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getConnection(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
  ): ClientChannelConnection<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    TError
  >
  getConnection(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getConnection, point ${this.id}`)
    }
    if (_point0_env.side.is.server) {
      throw new Error(`getConnection() is client-side — nothing is ever connected on the server (point ${this.id})`)
    }
    const connection = getChannelConnectionOrUndefined(this as never, args[0])
    if (!connection) {
      throw new Error(`No live connection of channel ${this.id} for this input — connect first`)
    }
    return connection as never
  }

  /**
   * The probing twin of {@link getConnection}: the live connection for an input, or `undefined` when nothing matches.
   * Same lookup, no hold, nothing connects.
   *
   * Client-side — on the server it always returns `undefined` (nothing is ever connected there).
   *
   *     chatChannel.getConnectionOrUndefined({ chatId })?.status
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getConnectionOrUndefined(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
  ):
    | ClientChannelConnection<
        FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
        TError
      >
    | undefined
  getConnectionOrUndefined(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getConnectionOrUndefined, point ${this.id}`)
    }
    return getChannelConnectionOrUndefined(this as never, args[0]) as never
  }

  /**
   * Hold a connection while mounted and provide it to the subtree — inside, handlers of this channel may omit the
   * `connection` argument (`sendToServer(input)`, `useOnMessageFromServer(cb)`).
   *
   * The children are gated on the connection per `gate`, mountable-style — DEFAULT `{ loading: false, error: true }`:
   * the children render right away while it connects (the handlers inside wait for the connect on their own), and a
   * failed connect renders the nearest `.error()` up the channel's chain with the typed error. `gate={{ loading: true
   * }}` (or `gate` / `true`) also shows the nearest `.loading()` while connecting — during SSR too, nothing connects
   * there. `gate={false}` renders through everything (the old `passthrough`). Once open (or closed later), the children
   * render.
   *
   * Server-and-client — kept on both bundles (renders the loading state on the server, connects after mount).
   *
   *     <chatChannel.Connection input={{ chatId }}>
   *       <Chat />
   *     </chatChannel.Connection>
   *     // <chatChannel.Connection input={{ chatId }} gate={false}> — never gate, render <Chat /> immediately
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  Connection: TPointType extends 'channel'
    ? (
        props: ChannelConnectionComponentProps<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          ExtraUseConnectionOptions<
            TError,
            ClientChannelConnection<
              FinalInputRaw<
                TPointType,
                TServerInputSchema,
                TClientInputSchema,
                TParamsSchema,
                TSearchSchema,
                TBodySchema
              >,
              TError
            >
          >
        >,
      ) => React.ReactNode
    : never = ((props: { input?: unknown; gate?: Gate; children?: React.ReactNode }) => {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`Connection, point ${this.id}`)
    }
    // a channel renders as a MOUNTABLE, exactly like a Provider: the chain's mount actions (inherited wrappers,
    // .loading()/.error(), .with injections) run through the interpreter, and the channel's own `selfConnection`
    // terminal step holds the connection and gates it per `gate` (default errors-only — `closed` does NOT gate: it is
    // either `enabled: false` or a later kill/logout — the children are already there and see the status), and provides
    // the channel context. `mountComponent: 'children'` — once past the terminal step the children render as-is.
    // The rest props ARE the connection options — they sit flat on the component.
    const {
      input = {},
      gate,
      LoadingComponent,
      ErrorComponent,
      children,
      ...options
    } = props as typeof props & {
      LoadingComponent?: LoadingComponentType<any>
      ErrorComponent?: ErrorComponentType<any, ErrorPoint0>
    }
    return this._applyWrappers(
      this._MountableWithBoundaries({
        layers: [
          {
            inputRaw: input as InputRaw,
            outerProps: {} as TOuterProps,
            selfConnectionOptions: options as ExtraUseConnectionOptions<any, any> | undefined,
            selfGate: normalizeGate(gate),
            SelfLoadingComponent: LoadingComponent,
            SelfErrorComponent: ErrorComponent,
          },
        ],
        extraProps: () => ({ children }),
        mountComponent: 'children',
      }),
      { outerProps: {} },
    )
  }) as never

  /**
   * Hold a membership of this space while the component is mounted — a `join` over the socket (the `.joiner` decides
   * which rooms), riding a live connection of the space's channel (the ambient `<channel.Connection>`, else the single
   * live one — it never connects). Holds are counted like connections. Returns the membership object (`status`,
   * `rooms`, `error`, `isLoading`, `input`, `membershipIndex`, `connection`, `leave()`); re-renders as it settles.
   * During SSR nothing joins, and a space with no `.joiner` never joins at all (it takes no client joins).
   *
   * Server-and-client — kept on both bundles (the server render sees the `'joining'` state).
   *
   *     const membership = chatSpace.useMembership({ chatId })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  useMembership(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: ExtraUseMembershipOptions<TRoom>,
  ): ClientSpaceMembership<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    TRoom,
    TError,
    TChannelInput
  >
  useMembership(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`useMembership, point ${this.id}`)
    }
    return useSpaceMembership(this as never, args[0], args[1]) as never
  }

  /**
   * The imperative `useMembership`: join (or share) a membership of this space and hold it until `leave()`. Same dedup
   * and linger; the returned object is live. Optional `channelInput` names which connection to ride when the channel
   * has several. Throws synchronously — nothing leaves the client — when the space declares no `.joiner` (it takes no
   * client joins) or when no live connection of its channel exists.
   *
   * Server-and-client — kept on both bundles (on the server it returns the inert `'joining'` membership).
   *
   *     const membership = chatSpace.join({ chatId })
   *     membership.leave()
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  join(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: ExtraUseMembershipOptions<TRoom>,
    channelInput?: TChannelInput,
  ): ClientSpaceMembership<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    TRoom,
    TError,
    TChannelInput
  >
  join(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`join, point ${this.id}`)
    }
    return joinSpace(this as never, args[0], args[1], args[2] as never) as never
  }

  /**
   * Look up the live membership of this space for an input, if one is live right now — a pure lookup, no hold, nothing
   * joins. Optional `channelInput` names which connection to look on. Throws when nothing matches — reach for
   * {@link getMembershipOrUndefined} to probe.
   *
   * Client-side — memberships live in the browser (a runtime error on the server).
   *
   *     chatSpace.getMembership({ chatId }).rooms
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getMembership(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    channelInput?: TChannelInput,
  ): ClientSpaceMembership<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    TRoom,
    TError,
    TChannelInput
  >
  getMembership(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getMembership, point ${this.id}`)
    }
    if (_point0_env.side.is.server) {
      throw new Error(`getMembership() is client-side — nothing is ever joined on the server (point ${this.id})`)
    }
    const membership = getSpaceMembershipOrUndefined(this as never, args[0], args[1] as never)
    if (!membership) {
      throw new Error(`No live membership of space ${this.id} for this input — join first`)
    }
    return membership as never
  }

  /**
   * The probing twin of {@link getMembership}: the live membership for an input, or `undefined` when nothing matches.
   *
   * Client-side — on the server it always returns `undefined`.
   *
   *     chatSpace.getMembershipOrUndefined({ chatId })?.rooms
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getMembershipOrUndefined(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    channelInput?: TChannelInput,
  ):
    | ClientSpaceMembership<
        FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
        TRoom,
        TError,
        TChannelInput
      >
    | undefined
  getMembershipOrUndefined(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getMembershipOrUndefined, point ${this.id}`)
    }
    return getSpaceMembershipOrUndefined(this as never, args[0], args[1] as never) as never
  }

  /**
   * Hold a membership while mounted and provide it to the subtree — inside, handlers of this space may omit the
   * `membership` argument. The children gate on the join per `gate`, mountable-style — DEFAULT `{ loading: false,
   * error: true }`: they render right away while joining and the chain's `.error()` shows on a failed join. `gate={{
   * loading: true }}` (or `true`) also shows `.loading()` while joining; `gate={false}` renders through everything.
   * Requires a live connection of the space's channel above it.
   *
   * Server-and-client — kept on both bundles (renders the loading state on the server, joins after mount).
   *
   *     <chatSpace.Membership input={{ chatId }}>
   *       <Chat />
   *     </chatSpace.Membership>
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  Membership: TPointType extends 'space'
    ? (
        props: SpaceMembershipComponentProps<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          ExtraUseMembershipOptions<TRoom>
        >,
      ) => React.ReactNode
    : never = ((props: { input?: unknown; gate?: Gate; children?: React.ReactNode }) => {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`Membership, point ${this.id}`)
    }
    // the space mirror of `<channel.Connection>` — the same mountable render, closed by the space's own
    // `selfMembership` terminal step (join, gate per `gate` — default errors-only, provide the space context).
    // The rest props ARE the membership options — they sit flat on the component.
    const {
      input = {},
      gate,
      LoadingComponent,
      ErrorComponent,
      children,
      ...options
    } = props as typeof props & {
      LoadingComponent?: LoadingComponentType<any>
      ErrorComponent?: ErrorComponentType<any, ErrorPoint0>
    }
    return this._applyWrappers(
      this._MountableWithBoundaries({
        layers: [
          {
            inputRaw: input as InputRaw,
            outerProps: {} as TOuterProps,
            selfMembershipOptions: options as ExtraUseMembershipOptions | undefined,
            selfGate: normalizeGate(gate),
            SelfLoadingComponent: LoadingComponent,
            SelfErrorComponent: ErrorComponent,
          },
        ],
        extraProps: () => ({ children }),
        mountComponent: 'children',
      }),
      { outerProps: {} },
    )
  }) as never

  /**
   * Send a message to the server (a **serverHandler**, client side) — resolves with the `.serverReply` return. Don't
   * await it and it's fire-and-forget. The bare form resolves the connection on its own (the single live connection of
   * the channel); bind an explicit one by calling the handler — `handler(connection).sendToServer(input)`. During a
   * reconnect the send queues up to the handler's `timeout` (opt out with `queue: false`).
   *
   * Client-side — sending happens over the client's WebSocket (a runtime error on the server).
   *
   *     const { message } = await messageSendHandler.sendToServer({ text })
   *     void markReadHandler.sendToServer() // no input declared — none passed
   *     void typingHandler.sendToServer({}, { queue: false }) // fail fast during a reconnect
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  sendToServer<
    TArgs extends (TPointType extends 'serverHandler'
      ? ServerHandlerSendArgs<
          InputRaw<TServerInputSchema>,
          ServerHandlerCallOptions<TServerLoaderOutput, InputRaw<TServerInputSchema>>
        >
      : never[]),
  >(...args: TArgs): TPointType extends 'serverHandler' ? Promise<TServerLoaderOutput> : never
  sendToServer(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`sendToServer, point ${this.id}`)
    }
    if (this.type !== 'serverHandler') {
      throw new Error(`sendToServer() lives on serverHandler points only, got ${this.toStringWithLocation()}`)
    }
    return sendToServerHandler(this as never, undefined, args[0], args[1] as never)
  }

  /**
   * Send a message to clients (a **clientHandler**, server side) — `sendToClient(message, target?, replies?)`. The
   * target is the `$`-dictionary, parts AND-combined: a CHANNEL handler addresses connections (`connectionId`,
   * `$identity`; bare = everyone in the channel), a SPACE handler addresses rooms (`room` snapshot(s) — the hot pub/sub
   * path — plus `connectionId` / `$identity` narrowing; bare = everyone in the space). `except` skips connection ids
   * (or, on a space handler, whole rooms). Matchers are Mongo-style sift selections over declared identity/room keys
   * (`{ userId: { $in: [...] } }`). Pass `replies` (exists only with `.clientReply`) to collect each client's reply,
   * validated by its schema.
   *
   * Server-side — callable anywhere on the server: mutation loaders, other handlers, crons (a runtime error on the
   * client — the client listens with `onMessageFromServer`).
   *
   *     void messageNewHandler.sendToClient({ message }, { room: { chatId } })
   *     void announceHandler.sendToClient({ text }) // channel handler — everyone connected
   *     const replies = await pingHandler.sendToClient({ ask }, { room }, { waitForAll: true })
   *     for await (const reply of pingHandler.sendToClient({ ask }, { room }, true)) { ... }
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  sendToClient(
    ...args: TPointType extends 'clientHandler'
      ? [...head: ClientHandlerSendHeadArgs<TRoom, InputRaw<TClientInputSchema>, TIdentity>, replies?: undefined]
      : never[]
  ): TPointType extends 'clientHandler' ? void : never
  sendToClient(
    ...args: TPointType extends 'clientHandler'
      ? [TServerLoaderOutput] extends [undefined]
        ? never
        : [...head: ClientHandlerSendHeadArgs<TRoom, InputRaw<TClientInputSchema>, TIdentity>, replies?: true]
      : never[]
  ): TPointType extends 'clientHandler' ? AsyncIterable<ClientHandlerReply<TServerLoaderOutput>> : never
  sendToClient(
    ...args: TPointType extends 'clientHandler'
      ? [TServerLoaderOutput] extends [undefined]
        ? never
        : [
            ...head: ClientHandlerSendHeadArgs<TRoom, InputRaw<TClientInputSchema>, TIdentity>,
            replies?: ClientHandlerSendRepliesObject<TServerLoaderOutput> & { waitForAll: true },
          ]
      : never[]
  ): TPointType extends 'clientHandler' ? Promise<Array<ClientHandlerReply<TServerLoaderOutput>>> : never
  sendToClient(
    ...args: TPointType extends 'clientHandler'
      ? [TServerLoaderOutput] extends [undefined]
        ? never
        : [
            ...head: ClientHandlerSendHeadArgs<TRoom, InputRaw<TClientInputSchema>, TIdentity>,
            replies?: ClientHandlerSendRepliesObject<TServerLoaderOutput>,
          ]
      : never[]
  ): TPointType extends 'clientHandler' ? Promise<void> : never
  sendToClient(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`sendToClient, point ${this.id}`)
    }
    if (this.type !== 'clientHandler') {
      throw new Error(`sendToClient() lives on clientHandler points only, got ${this.toStringWithLocation()}`)
    }
    return this._sendClientHandler(
      args[0],
      args[1] as ClientHandlerSendTarget<any, any> | undefined,
      args[2] as ClientHandlerSendReplies<any> | undefined,
    )
  }

  /** Normalize a `x | x[]` target part to an array (`undefined` stays `undefined`). */
  private static _toArrayPart<T>(value: T | T[] | undefined): T[] | undefined {
    if (value === undefined) {
      return undefined
    }
    return Array.isArray(value) ? value : [value]
  }

  /**
   * Build the serialized push target from the `$`-dictionary: rooms ride the SPACE transformer (they address room
   * topics, whose keys the space serialized), the identity matcher rides the CHANNEL transformer (identity lives on the
   * channel). A space handler splits `except` by element kind — strings are connection ids, objects are rooms.
   */
  private _buildPushTarget(target: ClientHandlerSendTarget<any, any> | undefined): SocketServerPushTarget {
    if (_point0_env.side.is.client) {
      throw new Error(`Push targeting is server-side (point ${this.id})`)
    }
    const opts = (target ?? {}) as {
      room?: UnknownData | UnknownData[]
      $room?: UnknownData
      connectionId?: string | string[]
      $identity?: UnknownData
      except?: string | string[] | UnknownData | UnknownData[]
    }
    const space = this._spacePoint
    const channel = this._channelPointOrThrow()
    if (opts.$identity !== undefined) {
      Point0._assertNoWhereOperator(opts.$identity, this.id)
    }
    if (opts.$room !== undefined) {
      Point0._assertNoWhereOperator(opts.$room, this.id)
    }
    const rooms = Point0._toArrayPart(opts.room as UnknownData | UnknownData[] | undefined)
    if ((rooms !== undefined || opts.$room !== undefined) && !space) {
      throw new Error(`Point ${this.id} has no space — room targeting lives on space handlers`)
    }
    const spaceTransformer = space?._getSocketTransformer()
    const exceptRaw = Point0._toArrayPart(opts.except as (string | UnknownData)[] | (string | UnknownData) | undefined)
    const exceptConnectionIds = exceptRaw?.filter((item): item is string => typeof item === 'string')
    const exceptRoomObjects = exceptRaw?.filter((item): item is UnknownData => typeof item !== 'string')
    if (exceptRoomObjects !== undefined && exceptRoomObjects.length > 0 && !space) {
      throw new Error(`Point ${this.id} has no space — room excepts live on space handlers`)
    }
    return {
      connectionId: Point0._toArrayPart(opts.connectionId),
      identityMatcher:
        opts.$identity === undefined
          ? undefined
          : stringifyOrThrow(channel._getSocketTransformer(), opts.$identity, channel.id),
      space: space?.name,
      rooms:
        rooms === undefined ? undefined : rooms.map((room) => stringifyOrThrow(spaceTransformer!, room, space!.id)),
      roomMatcher: opts.$room === undefined ? undefined : stringifyOrThrow(spaceTransformer!, opts.$room, space!.id),
      exceptConnectionIds:
        exceptConnectionIds === undefined || exceptConnectionIds.length === 0 ? undefined : exceptConnectionIds,
      exceptRooms:
        exceptRoomObjects === undefined || exceptRoomObjects.length === 0
          ? undefined
          : exceptRoomObjects.map((room) => stringifyOrThrow(spaceTransformer!, room, space!.id)),
    }
  }

  /**
   * The push itself — with the TRANSPORT events (`pointHandlerSendServer*`) around it: `Start` before anything is
   * built, `Settled`/`Success` the moment the engine ACCEPTED the frame for delivery, `Settled`/`Error` if the target,
   * the serialization or the dispatch threw. A push is fire-and-forget by design, so "success" means handed to the
   * transport, never delivered — and a push nobody was there to receive is a successful send, not an error.
   */
  private _sendClientHandler(
    message: unknown,
    target: ClientHandlerSendTarget<any, any> | undefined,
    replies: ClientHandlerSendReplies<any> | undefined,
  ): any {
    if (_point0_env.side.is.client) {
      throw new Error(
        `clientHandler.sendToClient() is server-side — the client listens with onMessageFromServer (point ${this.id})`,
      )
    }
    const sendEventData = { input: message as InputRawUnknown, point: this }
    const sendEventMeta = { point: this.id }
    this._emit('pointHandlerSendServerStart', sendEventData as never, sendEventMeta)
    const emitSendAccepted = (): void => {
      this._emit('pointHandlerSendServerSettled', { ...sendEventData, error: undefined } as never, sendEventMeta)
      this._emit('pointHandlerSendServerSuccess', { ...sendEventData, error: undefined } as never, sendEventMeta)
    }
    try {
      return this._sendClientHandlerPush(message, target, replies, emitSendAccepted)
    } catch (error) {
      const error0 = this._Error.from(error)
      this._emit('pointHandlerSendServerSettled', { ...sendEventData, error: error0 } as never, sendEventMeta)
      this._emit('pointHandlerSendServerError', { ...sendEventData, error: error0 } as never, sendEventMeta)
      throw error
    }
  }

  /** The push proper — see {@link _sendClientHandler}, which owns the transport events around it. */
  private _sendClientHandlerPush(
    message: unknown,
    target: ClientHandlerSendTarget<any, any> | undefined,
    replies: ClientHandlerSendReplies<any> | undefined,
    onAccepted: () => void,
  ): any {
    const channel = this._channelPointOrThrow()
    const adapter = getSocketServerAdapterOrThrow(this.scope, this.id)
    const transformer = this._getSocketTransformer()
    const pushTarget = this._buildPushTarget(target)
    // the wire frame field stays `input` (internal protocol) — the developer-facing name is `message`
    const messageSerialized = message === undefined ? undefined : stringifyOrThrow(transformer, message, this.id)
    if (replies === undefined) {
      adapter.push({ channel, handler: this as never, target: pushTarget, input: messageSerialized })
      onAccepted()
      return undefined
    }
    const repliesOptions = replies === true ? {} : replies
    const resolvedOptions = mergeClientHandlerOptions(this._defaultClientHandlerOptions, this._clientHandlerOptions)
    const timeoutMs = repliesOptions.timeout ?? resolvedOptions.timeout ?? 5000
    const buffered: Array<ClientHandlerReply<unknown>> = []
    let done = false
    const notifiers = new Set<() => void>()
    const notify = () => {
      for (const notifier of [...notifiers]) {
        notifier()
      }
    }
    const onReplyRaw = (reply: { cid: string; data: string | undefined; room?: string | undefined }) => {
      // the payload came off a client's socket, so it is not necessarily deserializable at all — a malformed one is a
      // failed reply, exactly like one that fails the schema below. It must not THROW: the throw would leave the
      // collect window's accounting half-done, and the window would then wait out its whole timeout instead of closing
      // the moment everyone answered
      let data: unknown
      try {
        data = reply.data === undefined ? undefined : transformer.parse(reply.data)
      } catch (error) {
        getLogFnForPoint(this)({
          level: 'warn',
          category: ['point0', 'socket'],
          message: `A client reply was not deserializable and was dropped (point ${this.id}, connection ${reply.cid})`,
          error,
        })
        return
      }
      if (this._clientReplySchema) {
        const parsed = this.parseInputSafeSync(this._clientReplySchema, data as never)
        if (!parsed.success) {
          // clients can send anything — an invalid reply is dropped, never surfaced as a valid one
          getLogFnForPoint(this)({
            level: 'warn',
            category: ['point0', 'socket'],
            message: `A client reply failed the .clientReply schema and was dropped (point ${this.id}, connection ${reply.cid})`,
            error: parsed.error,
          })
          return
        }
        data = parsed.data
      }
      const replyOut: ClientHandlerReply<unknown> = { data, connectionId: reply.cid }
      buffered.push(replyOut)
      if (repliesOptions.onReply) {
        void repliesOptions.onReply(replyOut)
      }
      notify()
    }
    const onDone = () => {
      done = true
      notify()
    }
    adapter.push({
      channel,
      handler: this as never,
      target: pushTarget,
      input: messageSerialized,
      collect: { timeoutMs, onReply: onReplyRaw, onDone },
    })
    // the frame is with the transport — the collect window that follows answers replies, not the send
    onAccepted()
    // the object form settles when the window closes: with `waitForAll` — with the full array, else with nothing
    if (replies !== true) {
      return new Promise((resolve) => {
        const check = () => {
          if (done) {
            resolve(repliesOptions.waitForAll ? [...buffered] : undefined)
          }
        }
        notifiers.add(check)
        check()
      })
    }
    const iterable: AsyncIterable<ClientHandlerReply<unknown>> = {
      [Symbol.asyncIterator]() {
        let index = 0
        return {
          next: async (): Promise<IteratorResult<ClientHandlerReply<unknown>>> => {
            for (;;) {
              if (index < buffered.length) {
                return { value: buffered[index++], done: false }
              }
              if (done) {
                return { value: undefined, done: true }
              }
              await new Promise<void>((resolve) => {
                const notifier = () => {
                  notifiers.delete(notifier)
                  resolve()
                }
                notifiers.add(notifier)
              })
            }
          },
        }
      },
    }
    return iterable
  }

  /**
   * Listen to this clientHandler's messages while the component is mounted. The callback receives `{ message,
   * connection, point }` (a space handler's adds `room`) and fires immediately on arrival — decoupled from the
   * `.clientReply` auto-responder, so a slow or throwing reply never delays or suppresses it. The bare form resolves
   * the connection on its own: the ambient `<channel.Connection>`, else the single live connection — bind an explicit
   * one by calling the handler (`handler(connection).useOnMessageFromServer(cb)`). A connection that opens later is
   * picked up automatically. The options take `enabled` (`false` detaches the listener) and
   * `lastMessageFromServerAsData` — keep the latest message in state: the result gains `data` and re-renders on every
   * push (by default nothing re-renders and the hook returns nothing).
   *
   * Server-and-client — kept on both bundles (a no-op during SSR).
   *
   *     typingHandler.useOnMessageFromServer(({ message }) => setWho(message.userName)) // under <chatChannel.Connection>
   *     // const { data } = tickHandler.useOnMessageFromServer(() => {}, { lastMessageFromServerAsData: true })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  useOnMessageFromServer<
    TOptions extends UseOnMessageFromServerOptions | undefined = UseOnMessageFromServerOptions | undefined,
  >(
    ...args: TPointType extends 'clientHandler'
      ? [listener: ClientHandlerListenerFn<InputParsed<TClientInputSchema>, TRoom>, options?: TOptions]
      : never
  ): TPointType extends 'clientHandler'
    ? UseOnMessageFromServerResultFor<TOptions, InputParsed<TClientInputSchema>>
    : never
  useOnMessageFromServer(...args: any[]): any {
    const [listener, options] = args as [ClientHandlerListenerFn<any, any>, UseOnMessageFromServerOptions | undefined]
    const facade = this._useHandlerConnectionFacade({ target: undefined, consultAmbient: true })
    return this._useOnMessageFromServerInner({ facade, listener, options })
  }

  /** The shared body of `useOnMessageFromServer` (bare + bound) — the listener plus the opt-in latest-input state. */
  private _useOnMessageFromServerInner({
    facade,
    boundRoom,
    listener,
    options,
  }: {
    facade: AnyClientChannelConnection | AnyClientSpaceMembership | undefined
    /** `handler(room)` — the listener then hears only that room's pushes */
    boundRoom?: unknown
    listener: ClientHandlerListenerFn<any, any>
    options: UseOnMessageFromServerOptions | undefined
  }): unknown {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_useOnMessageFromServerInner, point ${this.id}`)
    }
    const enabled = options?.enabled !== false
    const trackData = options?.lastMessageFromServerAsData === true
    const [data, setData] = React.useState<unknown>(undefined)
    const optionsRef = React.useRef(options)
    optionsRef.current = options
    const listenerRef = React.useRef(listener)
    listenerRef.current = listener
    useSocketOnMessage(
      this as never,
      facade as never,
      (listenerProps) => {
        void listenerRef.current(listenerProps as never)
        // messages re-render only when the caller asked for `data` — the reactive path stays render-free
        if (optionsRef.current?.lastMessageFromServerAsData === true) {
          setData((listenerProps as { message: unknown }).message)
        }
      },
      { enabled },
      boundRoom,
    )
    return trackData ? { data } : undefined
  }

  /**
   * Iterate this handler's messages imperatively — the server's pushes as an async iterable, `for await` it. No request
   * leaves the client and there is no transport of its own: iterating attaches a listener to the resolved target (the
   * ambient `<channel.Connection>`, else the single live connection; bind an explicit one by calling the handler —
   * `handler(connection).iterateMessagesFromServer()`). Yields ride while the target lives (a drop parks the loop while
   * the channel's reconnect policy redials); the iteration ends when the target closes for good and throws its typed
   * error when it fails. Break out (or abort `options.signal`) to detach the listener.
   *
   * Client-side — a runtime error on the server.
   *
   *     for await (const tick of tickHandler.iterateMessagesFromServer()) render(tick)
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  iterateMessagesFromServer(
    ...args: TPointType extends 'clientHandler' ? [options?: IterateMessagesFromServerOptions] : never
  ): TPointType extends 'clientHandler' ? AsyncGenerator<InputParsed<TClientInputSchema>, void, undefined> : never
  iterateMessagesFromServer(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`iterateMessagesFromServer, point ${this.id}`)
    }
    if (this.type !== 'clientHandler') {
      throw new Error(
        `iterateMessagesFromServer() lives on clientHandler points only, got ${this.toStringWithLocation()}`,
      )
    }
    return iterateClientHandlerMessages(this as never, undefined, args[0] as never)
  }

  /**
   * The imperative `useOnMessageFromServer`: register a listener, get `{ remove() }` back. Same callback payload; the
   * bare form resolves the single live connection (there is no React context outside components) — bind an explicit one
   * by calling the handler (`handler(connection).onMessageFromServer(cb)`).
   *
   * Server-and-client — kept on both bundles (returns an inert remover during SSR).
   *
   *     const listener = messageReceivedHandler.onMessageFromServer(({ message }) => render(message.message))
   *     listener.remove()
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  onMessageFromServer(
    ...args: TPointType extends 'clientHandler'
      ? [listener: ClientHandlerListenerFn<InputParsed<TClientInputSchema>, TRoom>]
      : never
  ): { remove: () => void }
  onMessageFromServer(...args: any[]) {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`onMessageFromServer, point ${this.id}`)
    }
    return addClientHandlerListener(this as AnyPoint, undefined, args[0])
  }

  private _channelPointOrThrow(): AnyPoint {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_channelPointOrThrow, point ${this.id}`)
    }
    const channel = this._channelPoint
    if (!channel) {
      throw new Error(`Point ${this.id} has no channel — handlers grow from a channel point`)
    }
    return channel
  }

  private _reactConnectionContextCache: React.Context<AnyClientChannelConnection | undefined> | undefined
  /**
   * The ambient CONNECTION React context of this channel — what `<channel.Connection>` provides and the handler hooks
   * beneath consume. A lazy per-point instance (the same pattern as `_callableHandlerCache`): the Provider and every
   * consumer reach the context through this very channel point object, so identity holds on any executor — server
   * render, browser, fake client — with no registry anywhere.
   */
  _getReactConnectionContext(): React.Context<AnyClientChannelConnection | undefined> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getReactConnectionContext, point ${this.id}`)
    }
    if (this.type !== 'channel') {
      throw new Error(`The connection context lives on channel points only, got ${this.toStringWithLocation()}`)
    }
    return (this._reactConnectionContextCache ??= React.createContext<AnyClientChannelConnection | undefined>(
      undefined,
    ))
  }

  private _reactMembershipContextCache: React.Context<AnyClientSpaceMembership | undefined> | undefined
  /**
   * The ambient MEMBERSHIP React context of this space — what `<space.Membership>` provides and the handler hooks
   * beneath consume. The space twin of {@link _getReactConnectionContext}.
   */
  _getReactMembershipContext(): React.Context<AnyClientSpaceMembership | undefined> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getReactMembershipContext, point ${this.id}`)
    }
    if (this.type !== 'space') {
      throw new Error(`The membership context lives on space points only, got ${this.toStringWithLocation()}`)
    }
    return (this._reactMembershipContextCache ??= React.createContext<AnyClientSpaceMembership | undefined>(undefined))
  }

  private _callableHandlerCache: ((target: unknown, channelInput?: unknown) => unknown) | undefined
  /**
   * The handler point's runtime export: a callable binder — `handler(connection)` returns the bound surface — carrying
   * every nice point method. Built once per point (`_assignNicePointMethodsToComponent` refuses a second decoration)
   * and returned by both the closer (`.serverHandler()` / `.clientHandler()`) and `_tail` (the compiled path), so the
   * two roads export the SAME function.
   */
  _getCallableHandler(): (target: unknown, channelInput?: unknown) => unknown {
    if (this._callableHandlerCache) {
      return this._callableHandlerCache
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const point = this
    // a space handler's bind takes a second arg — `handler(membership | room, channelInput?)` — a channel handler ignores it
    const callable = (target: unknown, channelInput?: unknown) => point._bindHandler(target, channelInput)
    Point0._assignNicePointMethodsToComponent({
      component: callable as never,
      point: point,
      // the ready types expose `id` and `type` — the generic map leaves them to real point instances, so carry them here
      extra: { id: point.id, type: point.type },
    })
    this._callableHandlerCache = callable
    return callable
  }

  /**
   * The room a space-handler binding addresses, read off the bind argument alone: a plain object IS the room, a
   * membership facade (the stamp/duck check) is the "take my single room" convenience, and a bare/channel binding has
   * none. Pure classification — no registry lookup.
   *
   * The room stays UNTYPED here and in every `boundRoom` parameter below it: its shape lives in the space point's
   * `TRoom` generic, and the binder runs on the erased point — the typed layer above is what guarantees it.
   */
  private _boundSpaceRoom(target: unknown): unknown {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_boundSpaceRoom, point ${this.id}`)
    }
    return this._spacePoint !== undefined && target !== undefined && !isMembershipFacade(target) ? target : undefined
  }

  /**
   * Build the bound surface `handler(target)` returns — a plain object of closures over the target (the point is never
   * mutated). The target resolves LAZILY per call/render: a facade through the live registry, a ROOM (a space handler's
   * plain-object form) by searching the live memberships covering it (never joining one). Bound methods do NOT consult
   * the ambient `<channel.Connection>` / `<space.Membership>` — an explicit target wins.
   */
  _bindHandler(target: unknown, channelInput?: unknown): unknown {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_bindHandler, point ${this.id}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const point = this
    const isSpace = point._spacePoint !== undefined
    // what room this binding addresses — `handler(room)`; a membership facade / bare binding leaves it undefined and
    // the membership's single room is taken at send/key time
    const boundRoom = point._boundSpaceRoom(target)
    // the strict target resolution for a send/listen: a space handler resolves a membership (target + channelInput), a
    // channel handler a connection. The transport (`sendToServerHandler` / `addClientHandlerListener`) then treats the
    // returned facade as the right kind by looking at `handler._spacePoint`.
    const resolveStrictFacade = (): unknown =>
      isSpace
        ? resolveSpaceHandlerTarget(point as never, target as never, channelInput as never, undefined, { strict: true })
        : resolveHandlerTarget(point as never, target as never, undefined, { strict: true })
    if (this.type === 'serverHandler') {
      return {
        point,
        sendToServer: (input?: unknown, options?: unknown) => {
          if (_point0_env.side.is.server) {
            // let the transport throw its own "client only" error instead of a misleading "not live" one
            return sendToServerHandler(point as never, undefined, input, options as never, boundRoom)
          }
          const facade = resolveStrictFacade()
          return sendToServerHandler(point as never, facade as never, input, options as never, boundRoom)
        },
        useSocketQuery: (input?: unknown, queryOptions?: unknown) => {
          point._assertServerHandlerFlavor('query', 'useSocketQuery')
          const facade = point._useHandlerConnectionFacade({ target, channelInput, consultAmbient: false })
          return point._useSocketQueryInner({
            facade,
            boundRoom,
            input: input as never,
            queryOptions: queryOptions as never,
          })
        },
        useSocketInfiniteQuery: (input?: unknown, infiniteQueryOptions?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'useSocketInfiniteQuery')
          const facade = point._useHandlerConnectionFacade({ target, channelInput, consultAmbient: false })
          return point._useSocketInfiniteQueryInner({
            facade,
            boundRoom,
            input: input as never,
            infiniteQueryOptions: infiniteQueryOptions as never,
          })
        },
        useSocketMutation: (mutationOptions?: unknown) => {
          point._assertServerHandlerFlavor('mutation', 'useSocketMutation')
          return point._useSocketMutationInner({
            target,
            channelInput,
            consultAmbient: false,
            mutationOptions: mutationOptions as never,
          })
        },
        useSuspenseSocketQuery: (input?: unknown, queryOptions?: unknown) => {
          point._assertServerHandlerFlavor('query', 'useSuspenseSocketQuery')
          return point._useSuspenseSocketQueryInner({
            target,
            channelInput,
            consultAmbient: false,
            input: input as never,
            queryOptions,
            isInfiniteQuery: false,
          })
        },
        useSuspenseSocketInfiniteQuery: (input?: unknown, queryOptions?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'useSuspenseSocketInfiniteQuery')
          return point._useSuspenseSocketQueryInner({
            target,
            channelInput,
            consultAmbient: false,
            input: input as never,
            queryOptions,
            isInfiniteQuery: true,
          })
        },
        fetchSocketQuery: (input?: unknown) => {
          point._assertServerHandlerFlavor('query', 'fetchSocketQuery')
          return point._fetchSocketQueryInner({ target, channelInput, input: input as never })
        },
        fetchSocketInfiniteQuery: (input?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'fetchSocketInfiniteQuery')
          return point._fetchSocketInfiniteQueryInner({ target, channelInput, input: input as never })
        },
        prefetchSocketQuery: (input?: unknown, queryOptions?: unknown) => {
          point._assertServerHandlerFlavor('query', 'prefetchSocketQuery')
          return point._prefetchSocketQueryInner({
            target,
            channelInput,
            input: input as never,
            queryOptions,
            isInfiniteQuery: false,
          })
        },
        prefetchSocketInfiniteQuery: (input?: unknown, queryOptions?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'prefetchSocketInfiniteQuery')
          return point._prefetchSocketQueryInner({
            target,
            channelInput,
            input: input as never,
            queryOptions,
            isInfiniteQuery: true,
          })
        },
        ensureSocketQueryData: (input?: unknown, queryOptions?: unknown) => {
          point._assertServerHandlerFlavor('query', 'ensureSocketQueryData')
          return point._ensureSocketQueryDataInner({
            target,
            channelInput,
            input: input as never,
            queryOptions,
            isInfiniteQuery: false,
          })
        },
        ensureSocketInfiniteQueryData: (input?: unknown, queryOptions?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'ensureSocketInfiniteQueryData')
          return point._ensureSocketQueryDataInner({
            target,
            channelInput,
            input: input as never,
            queryOptions,
            isInfiniteQuery: true,
          })
        },
        getSocketQueryOptions: (input?: unknown, queryOptions?: unknown) => {
          point._assertServerHandlerFlavor('query', 'getSocketQueryOptions')
          return point._getSocketQueryOptionsInner({
            target,
            channelInput,
            input: input as never,
            queryOptions,
            isInfiniteQuery: false,
          })
        },
        getSocketInfiniteQueryOptions: (input?: unknown, queryOptions?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueryOptions')
          return point._getSocketQueryOptionsInner({
            target,
            channelInput,
            input: input as never,
            queryOptions,
            isInfiniteQuery: true,
          })
        },
        getSocketQueryKey: (input?: unknown) => {
          point._assertServerHandlerFlavor('query', 'getSocketQueryKey')
          return point._getSocketQueryKeyInner({
            target,
            channelInput,
            input: input as never,
            isInfiniteQuery: false,
          })
        },
        getSocketInfiniteQueryKey: (input?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueryKey')
          return point._getSocketQueryKeyInner({ target, channelInput, input: input as never, isInfiniteQuery: true })
        },
        getSocketQueryData: (input?: unknown) => {
          point._assertServerHandlerFlavor('query', 'getSocketQueryData')
          return point._getSocketQueryDataInner({
            target,
            channelInput,
            input: input as never,
            isInfiniteQuery: false,
          })
        },
        getSocketInfiniteQueryData: (input?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueryData')
          return point._getSocketQueryDataInner({
            target,
            channelInput,
            input: input as never,
            isInfiniteQuery: true,
          })
        },
        setSocketQueryData: (input: unknown, updater: (old: unknown) => unknown) => {
          point._assertServerHandlerFlavor('query', 'setSocketQueryData')
          return point._setSocketQueryDataInner({
            target,
            channelInput,
            input: input as never,
            updater,
            isInfiniteQuery: false,
          })
        },
        setSocketInfiniteQueryData: (input: unknown, updater: (old: unknown) => unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'setSocketInfiniteQueryData')
          return point._setSocketQueryDataInner({
            target,
            channelInput,
            input: input as never,
            updater,
            isInfiniteQuery: true,
          })
        },
        getSocketQueryState: (input?: unknown) => {
          point._assertServerHandlerFlavor('query', 'getSocketQueryState')
          return point._getSocketQueryStateInner({
            target,
            channelInput,
            input: input as never,
            isInfiniteQuery: false,
          })
        },
        getSocketInfiniteQueryState: (input?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueryState')
          return point._getSocketQueryStateInner({
            target,
            channelInput,
            input: input as never,
            isInfiniteQuery: true,
          })
        },
        getSocketQueryCache: (input?: unknown) => {
          point._assertServerHandlerFlavor('query', 'getSocketQueryCache')
          return point._getSocketQueryCacheInner({
            target,
            channelInput,
            input: input as never,
            isInfiniteQuery: false,
          })
        },
        getSocketInfiniteQueryCache: (input?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueryCache')
          return point._getSocketQueryCacheInner({
            target,
            channelInput,
            input: input as never,
            isInfiniteQuery: true,
          })
        },
        getSocketQueriesCache: (input?: unknown) => {
          point._assertServerHandlerFlavor('query', 'getSocketQueriesCache')
          return point._getSocketQueriesCacheInner({
            target,
            channelInput,
            input: input as never,
            isInfiniteQuery: false,
          })
        },
        getSocketInfiniteQueriesCache: (input?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueriesCache')
          return point._getSocketQueriesCacheInner({
            target,
            channelInput,
            input: input as never,
            isInfiniteQuery: true,
          })
        },
        refetchSocketQuery: (input?: unknown, refetchOptions?: unknown) => {
          point._assertServerHandlerFlavor('query', 'refetchSocketQuery')
          return point._refetchSocketQueryInner({
            target,
            channelInput,
            input: input as never,
            refetchOptions: refetchOptions as never,
            isInfiniteQuery: false,
          })
        },
        refetchSocketInfiniteQuery: (input?: unknown, refetchOptions?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'refetchSocketInfiniteQuery')
          return point._refetchSocketQueryInner({
            target,
            channelInput,
            input: input as never,
            refetchOptions: refetchOptions as never,
            isInfiniteQuery: true,
          })
        },
        invalidateSocketQuery: (input?: unknown, invalidateOptions?: unknown) => {
          point._assertServerHandlerFlavor('query', 'invalidateSocketQuery')
          return point._invalidateSocketQueryInner({
            target,
            channelInput,
            input: input as never,
            invalidateOptions: invalidateOptions as never,
            isInfiniteQuery: false,
          })
        },
        invalidateSocketInfiniteQuery: (input?: unknown, invalidateOptions?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'invalidateSocketInfiniteQuery')
          return point._invalidateSocketQueryInner({
            target,
            channelInput,
            input: input as never,
            invalidateOptions: invalidateOptions as never,
            isInfiniteQuery: true,
          })
        },
        cancelSocketQuery: (input?: unknown, cancelOptions?: unknown) => {
          point._assertServerHandlerFlavor('query', 'cancelSocketQuery')
          return point._cancelSocketQueryInner({
            target,
            channelInput,
            input: input as never,
            cancelOptions: cancelOptions as never,
            isInfiniteQuery: false,
          })
        },
        cancelSocketInfiniteQuery: (input?: unknown, cancelOptions?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'cancelSocketInfiniteQuery')
          return point._cancelSocketQueryInner({
            target,
            channelInput,
            input: input as never,
            cancelOptions: cancelOptions as never,
            isInfiniteQuery: true,
          })
        },
        removeSocketQuery: (input?: unknown) => {
          point._assertServerHandlerFlavor('query', 'removeSocketQuery')
          return point._removeSocketQueryInner({
            target,
            channelInput,
            input: input as never,
            isInfiniteQuery: false,
          })
        },
        removeSocketInfiniteQuery: (input?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'removeSocketInfiniteQuery')
          return point._removeSocketQueryInner({ target, channelInput, input: input as never, isInfiniteQuery: true })
        },
        resetSocketQuery: (input?: unknown) => {
          point._assertServerHandlerFlavor('query', 'resetSocketQuery')
          return point._resetSocketQueryInner({ target, channelInput, input: input as never, isInfiniteQuery: false })
        },
        resetSocketInfiniteQuery: (input?: unknown) => {
          point._assertServerHandlerFlavor('infiniteQuery', 'resetSocketInfiniteQuery')
          return point._resetSocketQueryInner({ target, channelInput, input: input as never, isInfiniteQuery: true })
        },
        fetchSocketMutation: (input?: unknown, mutationOptions?: unknown) => {
          point._assertServerHandlerFlavor('mutation', 'fetchSocketMutation')
          return point._fetchSocketMutationInner({
            target,
            channelInput,
            input: input as never,
            mutationOptions: mutationOptions as never,
          })
        },
        getSocketMutationKey: () => {
          point._assertServerHandlerFlavor('mutation', 'getSocketMutationKey')
          return point.getMutationKey()
        },
        getSocketMutationOptions: (mutationOptions?: unknown) => {
          point._assertServerHandlerFlavor('mutation', 'getSocketMutationOptions')
          return point._getSocketMutationOptionsInner({
            target,
            channelInput,
            mutationOptions: mutationOptions as never,
          })
        },
        getSocketMutationCache: (input?: unknown) => {
          point._assertServerHandlerFlavor('mutation', 'getSocketMutationCache')
          return (point.getMutationCache as (input: unknown) => unknown)(input)
        },
        getSocketMutationsCache: (input?: unknown) => {
          point._assertServerHandlerFlavor('mutation', 'getSocketMutationsCache')
          return (point.getMutationsCache as (input: unknown) => unknown)(input)
        },
      }
    }
    if (this.type === 'clientHandler') {
      return {
        point,
        useOnMessageFromServer: (
          listener: ClientHandlerListenerFn<any, any>,
          options?: UseOnMessageFromServerOptions,
        ) => {
          const facade = point._useHandlerConnectionFacade({ target, channelInput, consultAmbient: false })
          return point._useOnMessageFromServerInner({ facade, boundRoom, listener, options })
        },
        onMessageFromServer: (listener: ClientHandlerListenerFn<any, any>) => {
          if (_point0_env.side.is.server) {
            return { remove: () => {} }
          }
          const facade = resolveStrictFacade()
          return addClientHandlerListener(point as never, facade as never, listener, boundRoom)
        },
        iterateMessagesFromServer: (options?: unknown) => {
          if (_point0_env.side.is.server) {
            // let the iterator throw its own "client only" error instead of a misleading "not live" one
            return iterateClientHandlerMessages(point as never, undefined, options as never)
          }
          const facade = resolveStrictFacade()
          return iterateClientHandlerMessages(point as never, facade as never, options as never, boundRoom)
        },
      }
    }
    throw new Error(
      `Handler binding lives on serverHandler/clientHandler points only, got ${this.toStringWithLocation()}`,
    )
  }

  /** Runtime mirror of the type-level flavor gate on the socket-query family. */
  private _assertServerHandlerFlavor(
    expected: 'query' | 'infiniteQuery' | 'mutation' | 'anyQuery',
    method: string,
  ): void {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_assertServerHandlerFlavor, point ${this.id}`)
    }
    if (this.type !== 'serverHandler') {
      throw new Error(`${method}() lives on serverHandler points only, got ${this.toStringWithLocation()}`)
    }
    const actual = (this._queryResultType as QueryResultType | undefined) ?? 'mutation'
    const suits = expected === 'anyQuery' ? actual !== 'mutation' : actual === expected
    if (!suits) {
      const wanted = expected === 'anyQuery' ? 'the .query() or .infiniteQuery() flavor' : `the .${expected}() flavor`
      throw new Error(`${method}() needs ${wanted} on ${this.id} — this serverHandler is a ${actual}`)
    }
  }

  /**
   * The socket query's cache key: `mode: 'socket'` plus the parent channel name, the connection's serialized channel
   * input (channel transformer), and the message input (handler transformer). The connection fields are what makes
   * react-query's partial deep matching scope an invalidation to one connection for free. A SPACE handler's key adds
   * the space name and the serialized ROOM the binding addresses — the address, and the whole address: the membership
   * INPUT is deliberately absent (a membership is information about participation, a client-side hold-dedup key, never
   * an address), so two memberships of the same room share one cache entry and a multi-room membership gets one entry
   * per room through `handler(room)`.
   */
  _getSocketQueryKey({
    facade,
    boundRoom,
    input = {},
    isInfiniteQuery,
  }: {
    facade: AnyClientChannelConnection | AnyClientSpaceMembership | undefined
    /** `handler(room)` — undefined means "the bound membership's single room" */
    boundRoom?: unknown
    input?: InputRaw | undefined
    isInfiniteQuery: boolean
  }): QueryKey {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSocketQueryKey, point ${this.id}`)
    }
    const channel = this._channelPointOrThrow()
    const base = {
      scope: this.scope,
      type: this.type,
      name: this.name,
      mode: 'socket' as const,
      finiteness: (isInfiniteQuery ? 'infinite' : 'finite') as 'infinite' | 'finite',
      tags: this.tags,
      output: 'data' as const,
      channel: channel.name,
      input: stringifyOrThrow(this._getSocketTransformer(), input, this.id),
    }
    const channelTransformer = channel._getSocketTransformer()
    // a SPACE handler's socket query is scoped by the connection it rides plus the space and the addressed ROOM —
    // serialized with the SPACE transformer; a CHANNEL handler by its connection's channel input
    const space = this._spacePoint
    if (space) {
      // the space branch resolves against a MEMBERSHIP facade (a space handler's target is a membership) — `.rooms`
      // lives on memberships only, so this is the one place the union narrows
      const membership = facade as AnyClientSpaceMembership | undefined
      const spaceTransformer = space._getSocketTransformer()
      const { room } = readBoundSpaceRoom(this as never, membership, boundRoom, { strict: true })
      return [
        POINT0_QUERY_KEY_NAMESPACE,
        {
          ...base,
          connectionInput: stringifyOrThrow(channelTransformer, membership?.connection.input ?? {}, channel.id),
          space: space.name,
          room: room === undefined ? undefined : stringifyOrThrow(spaceTransformer, room, space.id),
        },
      ]
    }
    return [
      POINT0_QUERY_KEY_NAMESPACE,
      {
        ...base,
        connectionInput: stringifyOrThrow(channelTransformer, facade?.input ?? {}, channel.id),
      },
    ]
  }

  /**
   * A socket query runs once its facade is READY: an OPEN connection (channel handler) or, for a space handler, a
   * JOINED membership that currently COVERS the addressed room (the bound one, or its single one).
   */
  private _connectionFacadeReady(
    facade: AnyClientChannelConnection | AnyClientSpaceMembership | undefined,
    boundRoom?: unknown,
  ): boolean {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_connectionFacadeReady, point ${this.id}`)
    }
    const status = (facade as { status?: string } | undefined)?.status
    if (!this._spacePoint) {
      return status === 'open'
    }
    return (
      status === 'joined' &&
      readBoundSpaceRoom(this as never, facade as AnyClientSpaceMembership | undefined, boundRoom, { strict: false })
        .live
    )
  }

  /**
   * The resolved react-query options of a socket query: `queryFn` is a `sendToServer` over the resolved connection (the
   * transport already emits the `pointHandler*` events — no extra event family), and `enabled` is gated on the
   * connection being OPEN — a socket query never runs before the connect lands. That gate also covers SSR: nothing is
   * ever open on the server, so the hook renders pending, nothing fetches and nothing reaches the dehydrated state. No
   * redirect handling in `retry` — redirects don't travel the socket — but `preventRetry` does (it rides the reply
   * frame's serialized error), so the wrapper honors it like the HTTP query's does.
   */
  private _getSocketQueryOptions({
    facade,
    boundRoom,
    input = {} as never,
    queryOptions,
  }: {
    facade: AnyClientChannelConnection | AnyClientSpaceMembership | undefined
    boundRoom?: unknown
    input?: InputRaw | undefined
    queryOptions?: ExtraUseQueryOptions | undefined
  }): UseQueryOptions<TServerLoaderOutput, TError, TServerLoaderOutput, QueryKey> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSocketQueryOptions, point ${this.id}`)
    }
    const queryKey = this._getSocketQueryKey({ facade, boundRoom, input, isInfiniteQuery: false })
    const queryFn = async () => {
      return await sendToServerHandler(this as never, facade as never, input, {}, boundRoom)
    }
    const megedQueryOptions = mergeQueryOptions(this._defaultQueryOptions, this._queryOptions, queryOptions)
    return {
      ...megedQueryOptions,
      queryKey,
      queryFn,
      // see _getServerQueryOptions — a legacy `suspense` key must never reach TanStack
      suspense: undefined,
      // a socket query can never run during SSR (nothing is ever connected on the server) — say so explicitly, so
      // every consumer of these options reads the same `ssr: false` a regular query would declare
      ssr: false,
      enabled: this._connectionFacadeReady(facade, boundRoom) && megedQueryOptions.enabled !== false,
      retry: Point0._retryHonoringPreventRetry(megedQueryOptions.retry),
    } as never
  }

  /**
   * Wrap a react-query `retry` option so an error marked `preventRetry` is never retried; otherwise the caller's option
   * (or react-query's default of 3) decides.
   */
  private static _retryHonoringPreventRetry(
    retry: UseQueryOptions['retry'],
    defaultRetries = 3, // react-query's query default; mutations pass 0
  ): (failureCount: number, error: ErrorPoint0) => boolean {
    return (failureCount, error) => {
      if (error.preventRetry) {
        return false
      }
      if (typeof retry === 'boolean') {
        return retry
      }
      if (typeof retry === 'function') {
        return retry(failureCount, error)
      }
      return (retry ?? defaultRetries) > failureCount
    }
  }

  /** The infinite twin of {@link _getSocketQueryOptions} — the page cursor folds into the message input. */
  private _getSocketInfiniteQueryOptions({
    facade,
    boundRoom,
    input = {} as never,
    infiniteQueryOptions,
  }: {
    facade: AnyClientChannelConnection | AnyClientSpaceMembership | undefined
    boundRoom?: unknown
    input?: InputRaw | undefined
    infiniteQueryOptions?: PartialUseInfiniteQueryOptions | undefined
  }): UseInfiniteQueryOptions<InputRaw, InfiniteData<TServerLoaderOutput>, TError, TServerLoaderOutput, QueryKey> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSocketInfiniteQueryOptions, point ${this.id}`)
    }
    const queryKey = this._getSocketQueryKey({ facade, boundRoom, input, isInfiniteQuery: true })
    const queryFn = async ({ pageParam }: { pageParam: unknown }) => {
      const inputWithPageParam = this._toInputWithPageParam({ input, pageParam })
      return await sendToServerHandler(this as never, facade as never, inputWithPageParam, {}, boundRoom)
    }
    const megedQueryOptions = mergeInfiniteQueryOptions(
      this._defaultQueryOptions as UseInfiniteQueryOptions<any> | undefined,
      this._defaultInfiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
      this._infiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
      infiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
    )
    return {
      ...megedQueryOptions,
      queryKey,
      queryFn,
      // see _getServerQueryOptions — a legacy `suspense` key must never reach TanStack
      suspense: undefined,
      // see _getSocketQueryOptions — a socket query is `ssr: false` by construction
      ssr: false,
      enabled: this._connectionFacadeReady(facade, boundRoom) && megedQueryOptions.enabled !== false,
      retry: Point0._retryHonoringPreventRetry(megedQueryOptions.retry as UseQueryOptions['retry']),
    } as never
  }

  /**
   * The one facade-resolving hook under every handler hook — subscribes through `useBoundConnection` (channel) or
   * `useBoundMembership` (space), so a target (or ambient) that opens/joins later re-renders the consumer. Hook order
   * stays stable: both context and store subscriptions run unconditionally; the ambient is consulted only for bare
   * forms.
   */
  private _useHandlerConnectionFacade({
    target,
    channelInput,
    consultAmbient,
  }: {
    target: unknown
    channelInput?: unknown
    consultAmbient: boolean
  }): AnyClientChannelConnection | AnyClientSpaceMembership | undefined {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_useHandlerConnectionFacade, point ${this.id}`)
    }
    const space = this._spacePoint
    if (space) {
      const ambient = useAmbientSpaceMembership(space)
      return useBoundMembership(
        this as never,
        target as never,
        channelInput as never,
        consultAmbient ? ambient : undefined,
      )
    }
    const channel = this._channelPointOrThrow()
    const ambient = useAmbientChannelConnection(channel)
    return useBoundConnection(this as never, target as never, consultAmbient ? ambient : undefined)
  }

  /**
   * Drop this socket query's cache entry when its target is DENIED.
   *
   * `enabled` stops a query from fetching; it does not stop it from RENDERING what it already has. So a membership the
   * server just refused — a room revoked mid-session, a re-join the joiner denied after the identity changed — would
   * otherwise keep its last answer on screen forever: nothing refetches, nothing errors, the data simply stays. A deny
   * is the one signal that says this data is no longer ours to show, and it is the one the app cannot act on itself (it
   * has no key to remove). Everything else — a sign-out, a token swap — is the app's own boundary:
   * `queryClient.clear()` at sign-out, as the docs' recipe has it.
   *
   * A dropped entry is not an error: the hook falls back to pending, and if the target ever opens again it fetches.
   *
   * The key to drop is the last one seen while the target was READY — the same predicate `enabled` runs on, not merely
   * "not yet denied". A membership that is re-joining reports `joining`, and an ambient single-room query's key loses
   * its `room` for every render that is not `joined`: a deny is always reached THROUGH those renders, so anything
   * looser would remember the roomless key, evict an entry that never held data, and leave the denied room's answer
   * sitting in the cache for the next identity to render. (A `handler(room)`-bound query pins its own room and never
   * had the problem — which is exactly why it must not be the only shape that works.)
   */
  private _useSocketQueryDenialEviction(
    facade: AnyClientChannelConnection | AnyClientSpaceMembership | undefined,
    queryKey: unknown,
    ready: boolean,
  ): void {
    const denied = (facade as { status?: string } | undefined)?.status === 'error'
    const lastGoodKeyRef = React.useRef<{ key: unknown; serialized: string }>({
      key: queryKey,
      serialized: stringify(queryKey) ?? '',
    })
    if (ready) {
      lastGoodKeyRef.current = { key: queryKey, serialized: stringify(queryKey) ?? '' }
    }
    // the SERIALIZED key is the dependency — the key itself is a fresh array every render, its content is the identity
    const { serialized } = lastGoodKeyRef.current
    React.useEffect(() => {
      if (!denied) {
        return
      }
      _ss.__POINT0_QUERY_CLIENT__.get().removeQueries({ queryKey: lastGoodKeyRef.current.key as never, exact: true })
    }, [denied, serialized])
  }

  private _useSocketQueryInner({
    facade,
    boundRoom,
    input,
    queryOptions,
  }: {
    facade: AnyClientChannelConnection | AnyClientSpaceMembership | undefined
    boundRoom?: unknown
    input?: InputRaw | undefined
    queryOptions?: ExtraUseQueryOptions | undefined
  }): UseQueryResult<TServerLoaderOutput, TError> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_useSocketQueryInner, point ${this.id}`)
    }
    const socketQueryOptions = this._getSocketQueryOptions({ facade, boundRoom, input, queryOptions })
    this._useSocketQueryDenialEviction(
      facade,
      (socketQueryOptions as { queryKey: unknown }).queryKey,
      this._connectionFacadeReady(facade, boundRoom),
    )
    return useQuery(socketQueryOptions)
  }

  private _useSocketInfiniteQueryInner({
    facade,
    boundRoom,
    input,
    infiniteQueryOptions,
  }: {
    facade: AnyClientChannelConnection | AnyClientSpaceMembership | undefined
    boundRoom?: unknown
    input?: InputRaw | undefined
    infiniteQueryOptions?: PartialUseInfiniteQueryOptions | undefined
  }): UseInfiniteQueryResult<InfiniteData<TServerLoaderOutput>, TError> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_useSocketInfiniteQueryInner, point ${this.id}`)
    }
    const socketInfiniteQueryOptions = this._getSocketInfiniteQueryOptions({
      facade,
      boundRoom,
      input,
      infiniteQueryOptions,
    })
    this._useSocketQueryDenialEviction(
      facade,
      (socketInfiniteQueryOptions as { queryKey: unknown }).queryKey,
      this._connectionFacadeReady(facade, boundRoom),
    )
    return useInfiniteQuery(socketInfiniteQueryOptions as never) as never
  }

  /**
   * A promise that resolves once the target lands in a TERMINAL-or-ready state — what the suspense socket hooks throw
   * while the connect is still running. It resolves (never rejects) on ready AND on a failed connect alike: the retry
   * render re-reads the live status and throws the connect's error synchronously to the ErrorBoundary.
   */
  private _facadeReadySuspensePromise(
    resolveFacade: () => AnyClientChannelConnection | AnyClientSpaceMembership | undefined,
    boundRoom?: unknown,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      // the poll backs off (25 ms → ×1.5 → cap 1 s): a suspended-then-unmounted consumer (or a target that never
      // starts) must not keep a 40 Hz timer chain alive for the life of the page
      let waitMs = 25
      const check = (): void => {
        const facade = resolveFacade()
        const status = (facade as { status?: string } | undefined)?.status
        if (this._connectionFacadeReady(facade, boundRoom) || status === 'error' || status === 'closed') {
          resolve()
          return
        }
        setTimeout(check, waitMs)
        waitMs = Math.min(waitMs * 1.5, 1000)
      }
      check()
    })
  }

  /**
   * The shared body of `useSuspenseSocketQuery` / `useSuspenseSocketInfiniteQuery`. Suspends in two stages: first on
   * the CONNECT (the resolved connection landing open / the membership joined — so the cache key, which carries the
   * room, is only ever built from a ready target), then on the fetch through the regular suspense tail. During SSR
   * nothing is ever connected — the socket `ssr: false` behavior: the render phase throws a descriptive error (the HTML
   * ships the fallback, the client resolves after hydration), discovery pauses the subtree.
   */
  private _useSuspenseSocketQueryInner({
    target,
    channelInput,
    consultAmbient,
    input,
    queryOptions,
    isInfiniteQuery,
  }: {
    target: unknown
    channelInput?: unknown
    consultAmbient: boolean
    input?: InputRaw | undefined
    queryOptions?: unknown
    isInfiniteQuery: boolean
  }): unknown {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_useSuspenseSocketQueryInner, point ${this.id}`)
    }
    const resolvedFacade = this._useHandlerConnectionFacade({ target, channelInput, consultAmbient })
    // hydration hands the ambient slot a DEAD placeholder facade (the SSR stand-in created before the connect effect
    // runs) whose status is frozen forever — for the suspense flow that is "no facade yet": the ready-poll below must
    // fall through to live re-resolution, or it parks on the frozen 'connecting' for good (the dead-facade trap)
    const facade = resolvedFacade && isDeadSocketFacade(resolvedFacade as object) ? undefined : resolvedFacade
    const boundRoom = this._boundSpaceRoom(target)
    // a suspense query can never be disabled — force `enabled: true` over the readiness gate the options builder set:
    // by the time the query actually runs the facade is ready (the connect suspension below ran first)
    const options = (
      isInfiniteQuery
        ? this._getSocketInfiniteQueryOptions({ facade, boundRoom, input, infiniteQueryOptions: queryOptions as never })
        : this._getSocketQueryOptions({ facade, boundRoom, input, queryOptions: queryOptions as never })
    ) as { queryKey: QueryKey } & Record<string, unknown>
    const finalOptions = { ...options, enabled: true }
    const result = (isInfiniteQuery ? useInfiniteQuery(finalOptions as never) : useQuery(finalOptions as never)) as {
      status: 'pending' | 'error' | 'success'
      error: unknown
    }
    if (!this._connectionFacadeReady(facade, boundRoom)) {
      if (_point0_env.side.is.server) {
        if (_ss.__POINT0_SSR_PHASE__.get() === 'render') {
          throw new Error(
            `${isInfiniteQuery ? 'useSuspenseSocketInfiniteQuery' : 'useSuspenseSocketQuery'} on point ${this.toStringWithLocation()} cannot resolve during SSR (nothing is ever connected on the server); the HTML ships the Suspense fallback and the client resolves after hydration`,
          )
        }
        // discovery — a paused subtree, exactly the regular suspense hooks' marker
        throw new Promise(() => undefined)
      }
      const status = (facade as { status?: string } | undefined)?.status
      if (status === 'error' || status === 'closed') {
        const error = (facade as { error?: unknown } | undefined)?.error
        throw (
          error ??
          new Error(
            `The socket suspense query on point ${this.id} could not reach a ready ${this._spacePoint ? 'membership' : 'connection'} — it is "${status}"`,
          )
        )
      }
      // suspend on the connect itself — thrown AFTER every hook ran, so the hook order stays stable across retries.
      // The render-resolved facade (live status getters) is polled when it exists; only a still-unresolved target
      // falls back to lax re-resolution (an ambient wrapper's connection is in the live registry too)
      throw this._facadeReadySuspensePromise(
        () => facade ?? this._resolveBoundHandlerFacade(target, channelInput, undefined, false),
        boundRoom,
      )
    }
    return this._suspenseHookResult({
      result: result,
      mergedQueryOptions: finalOptions,
      ensure: () =>
        isInfiniteQuery
          ? _ss.__POINT0_QUERY_CLIENT__.get().ensureInfiniteQueryData(finalOptions as never)
          : _ss.__POINT0_QUERY_CLIENT__.get().ensureQueryData(finalOptions),
      loaderSide: 'server',
    })
  }

  /** Resolve a handler's bound target strictly — a connection (channel handler) or a membership (space handler). */
  private _resolveBoundHandlerFacade(
    target: unknown,
    channelInput: unknown,
    // the ambient `<channel.Connection>` / `<space.Membership>` value — a facade of the same kind this returns
    ambient: AnyClientChannelConnection | AnyClientSpaceMembership | undefined,
    strict: boolean,
  ): AnyClientChannelConnection | AnyClientSpaceMembership | undefined {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_resolveBoundHandlerFacade, point ${this.id}`)
    }
    return this._spacePoint
      ? resolveSpaceHandlerTarget(this as never, target as never, channelInput as never, ambient as never, { strict })
      : resolveHandlerTarget(this as never, target as never, ambient as never, { strict })
  }

  /**
   * Build the resolved socket mutation options — the shared body of `useSocketMutation` / `fetchSocketMutation` /
   * `getSocketMutationOptions`. The `mutationFn` resolves the target at MUTATE time through `resolveFacade` and sends
   * over the socket (the send queues until the connection claims, like every socket send).
   */
  private _buildSocketMutationOptions({
    resolveFacade,
    boundRoom,
    mutationOptions,
  }: {
    resolveFacade: () => AnyClientChannelConnection | AnyClientSpaceMembership | undefined
    boundRoom?: unknown
    mutationOptions?: ExtraUseMutationOptions | undefined
  }): MutationOptions<TServerLoaderOutput, TError, InputRaw<TServerInputSchema>> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_buildSocketMutationOptions, point ${this.id}`)
    }
    const mutationFn = async (messageInput: unknown) => {
      const facade = resolveFacade()
      return await sendToServerHandler(this as never, facade as never, messageInput, {}, boundRoom)
    }
    const megedMutationOptions = mergeMutationOptions(
      this._defaultMutationOptions,
      this._mutationOptions,
      mutationOptions,
    )
    return {
      ...megedMutationOptions,
      mutationKey: this.getMutationKey(),
      mutationFn,
      retry: Point0._retryHonoringPreventRetry(megedMutationOptions.retry as UseQueryOptions['retry'], 0),
    } as never
  }

  private _useSocketMutationInner({
    target,
    channelInput,
    consultAmbient,
    mutationOptions,
  }: {
    target: unknown
    channelInput?: unknown
    consultAmbient: boolean
    mutationOptions?: ExtraUseMutationOptions | undefined
  }): UseMutationResult<TServerLoaderOutput, TError, InputRaw<TServerInputSchema>> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_useSocketMutationInner, point ${this.id}`)
    }
    const space = this._spacePoint
    // the ambient (connection or membership) at render rides along in a ref; the target resolves at MUTATE time
    const ambient = space ? useAmbientSpaceMembership(space) : useAmbientChannelConnection(this._channelPointOrThrow())
    const ambientRef = React.useRef<AnyClientChannelConnection | AnyClientSpaceMembership | undefined>(undefined)
    ambientRef.current = consultAmbient ? ambient : undefined
    return useMutation(
      this._buildSocketMutationOptions({
        resolveFacade: () => this._resolveBoundHandlerFacade(target, channelInput, ambientRef.current, true),
        boundRoom: this._boundSpaceRoom(target),
        mutationOptions,
      }),
    )
  }

  private _getSocketMutationOptionsInner({
    target,
    channelInput,
    mutationOptions,
  }: {
    target: unknown
    channelInput?: unknown
    mutationOptions?: ExtraUseMutationOptions | undefined
  }): MutationOptions<TServerLoaderOutput, TError, InputRaw<TServerInputSchema>> {
    return this._buildSocketMutationOptions({
      resolveFacade: () => this._resolveBoundHandlerFacade(target, channelInput, undefined, true),
      boundRoom: this._boundSpaceRoom(target),
      mutationOptions,
    })
  }

  private async _fetchSocketMutationInner({
    target,
    channelInput,
    input,
    mutationOptions,
  }: {
    target: unknown
    channelInput?: unknown
    input?: InputRaw | undefined
    mutationOptions?: ExtraUseMutationOptions | undefined
  }): Promise<TServerLoaderOutput> {
    if (_point0_env.side.is.server) {
      throw new Error(
        `fetchSocketMutation() is client-side — mutating happens over the client's WebSocket (point ${this.id})`,
      )
    }
    const normalizedMutationOptions = this._getSocketMutationOptionsInner({ target, channelInput, mutationOptions })
    const queryClient = _ss.__POINT0_QUERY_CLIENT__.get()
    const mutation = queryClient.getMutationCache().build(queryClient, normalizedMutationOptions as any)
    return (await mutation.execute(input as any)) as TServerLoaderOutput
  }

  /** The shared server guard of the socket cache/key methods. */
  private _assertSocketClientSide(method: string): void {
    if (_point0_env.side.is.server) {
      throw new Error(
        `${method}() is client-side — socket queries live in the browser cache, keyed by a live connection (point ${this.id})`,
      )
    }
  }

  /**
   * The imperative socket fetches AWAIT the connect like the send queue: the connection/membership must have been
   * STARTED (strict resolve — the cascade does not auto-connect), then its OPEN/JOINED landing is awaited up to the
   * handler's `timeout`. They fail only when the connect fails (or the window runs out).
   */
  private async _awaitReadyFacadeForFetch(
    target: unknown,
    channelInput: unknown,
    method: string,
  ): Promise<AnyClientChannelConnection | AnyClientSpaceMembership> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_awaitReadyFacadeForFetch, point ${this.id}`)
    }
    if (_point0_env.side.is.server) {
      throw new Error(`${method}() is client-side — a socket query runs over the client's WebSocket (point ${this.id})`)
    }
    const boundRoom = this._boundSpaceRoom(target)
    const facade = this._resolveBoundHandlerFacade(target, channelInput, undefined, true)!
    if (this._connectionFacadeReady(facade, boundRoom)) {
      return facade
    }
    // the send queue's window — the handler's resolved timeout (point-level; there is no call-site options object here)
    const timeoutMs =
      mergeServerHandlerOptions(this._defaultServerHandlerOptions, this._serverHandlerOptions).timeout ??
      DEFAULT_SEND_TIMEOUT_MS
    const kind = this._spacePoint ? 'membership' : 'connection'
    const startedAt = Date.now()
    for (;;) {
      // the facade's `status` is a live getter — a short poll is plenty for an imperative, non-render path
      await new Promise<void>((resolve) => setTimeout(resolve, 25))
      if (this._connectionFacadeReady(facade, boundRoom)) {
        return facade
      }
      const status = (facade as { status?: string }).status
      if (status === 'error' || status === 'closed') {
        const error = (facade as { error?: unknown }).error
        if (error) {
          throw error
        }
        throw new Error(`${method}() could not reach a ready ${kind} — it is "${status}" (point ${this.id})`)
      }
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error(
          `${method}() timed out after ${timeoutMs} ms waiting for the ${kind} to ${this._spacePoint ? 'join' : 'open'} (point ${this.id})`,
        )
      }
    }
  }

  private async _fetchSocketQueryInner({
    target,
    channelInput,
    input,
  }: {
    target: unknown
    channelInput?: unknown
    input?: InputRaw | undefined
  }): Promise<TServerLoaderOutput> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_fetchSocketQueryInner, point ${this.id}`)
    }
    const facade = await this._awaitReadyFacadeForFetch(target, channelInput, 'fetchSocketQuery')
    const socketQueryOptions = this._getSocketQueryOptions({ facade, boundRoom: this._boundSpaceRoom(target), input })
    return await _ss.__POINT0_QUERY_CLIENT__.get().fetchQuery(socketQueryOptions)
  }

  private async _fetchSocketInfiniteQueryInner({
    target,
    channelInput,
    input,
  }: {
    target: unknown
    channelInput?: unknown
    input?: InputRaw | undefined
  }): Promise<InfiniteData<TServerLoaderOutput>> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_fetchSocketInfiniteQueryInner, point ${this.id}`)
    }
    const facade = await this._awaitReadyFacadeForFetch(target, channelInput, 'fetchSocketInfiniteQuery')
    const socketInfiniteQueryOptions = this._getSocketInfiniteQueryOptions({
      facade,
      boundRoom: this._boundSpaceRoom(target),
      input,
    })
    return (await _ss.__POINT0_QUERY_CLIENT__.get().fetchInfiniteQuery(socketInfiniteQueryOptions as never)) as never
  }

  private async _prefetchSocketQueryInner({
    target,
    channelInput,
    input,
    queryOptions,
    isInfiniteQuery,
  }: {
    target: unknown
    channelInput?: unknown
    input?: InputRaw | undefined
    queryOptions?: unknown
    isInfiniteQuery: boolean
  }): Promise<void> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_prefetchSocketQueryInner, point ${this.id}`)
    }
    const method = isInfiniteQuery ? 'prefetchSocketInfiniteQuery' : 'prefetchSocketQuery'
    const facade = await this._awaitReadyFacadeForFetch(target, channelInput, method)
    const queryClient = _ss.__POINT0_QUERY_CLIENT__.get()
    if (isInfiniteQuery) {
      const options = this._getSocketInfiniteQueryOptions({
        facade,
        boundRoom: this._boundSpaceRoom(target),
        input,
        infiniteQueryOptions: queryOptions as never,
      })
      await queryClient.prefetchInfiniteQuery(options)
      return
    }
    const options = this._getSocketQueryOptions({
      facade,
      boundRoom: this._boundSpaceRoom(target),
      input,
      queryOptions: queryOptions as never,
    })
    await queryClient.prefetchQuery(options)
  }

  private async _ensureSocketQueryDataInner({
    target,
    channelInput,
    input,
    queryOptions,
    isInfiniteQuery,
  }: {
    target: unknown
    channelInput?: unknown
    input?: InputRaw | undefined
    queryOptions?: unknown
    isInfiniteQuery: boolean
  }): Promise<unknown> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_ensureSocketQueryDataInner, point ${this.id}`)
    }
    const method = isInfiniteQuery ? 'ensureSocketInfiniteQueryData' : 'ensureSocketQueryData'
    const facade = await this._awaitReadyFacadeForFetch(target, channelInput, method)
    const queryClient = _ss.__POINT0_QUERY_CLIENT__.get()
    if (isInfiniteQuery) {
      const options = this._getSocketInfiniteQueryOptions({
        facade,
        boundRoom: this._boundSpaceRoom(target),
        input,
        infiniteQueryOptions: queryOptions as never,
      })
      return await queryClient.ensureInfiniteQueryData(options)
    }
    const options = this._getSocketQueryOptions({
      facade,
      boundRoom: this._boundSpaceRoom(target),
      input,
      queryOptions: queryOptions as never,
    })
    return await queryClient.ensureQueryData(options)
  }

  private _getSocketQueryOptionsInner({
    target,
    channelInput,
    input,
    queryOptions,
    isInfiniteQuery,
  }: {
    target: unknown
    channelInput?: unknown
    input?: InputRaw | undefined
    queryOptions?: unknown
    isInfiniteQuery: boolean
  }): unknown {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSocketQueryOptionsInner, point ${this.id}`)
    }
    this._assertSocketClientSide(isInfiniteQuery ? 'getSocketInfiniteQueryOptions' : 'getSocketQueryOptions')
    const facade = this._resolveBoundHandlerFacade(target, channelInput, undefined, true)
    return isInfiniteQuery
      ? this._getSocketInfiniteQueryOptions({
          facade,
          boundRoom: this._boundSpaceRoom(target),
          input,
          infiniteQueryOptions: queryOptions as never,
        })
      : this._getSocketQueryOptions({
          facade,
          boundRoom: this._boundSpaceRoom(target),
          input,
          queryOptions: queryOptions as never,
        })
  }

  private _getSocketQueryKeyInner({
    target,
    channelInput,
    input,
    isInfiniteQuery,
  }: {
    target: unknown
    channelInput?: unknown
    input?: InputRaw | undefined
    isInfiniteQuery: boolean
  }): QueryKey {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSocketQueryKeyInner, point ${this.id}`)
    }
    this._assertSocketClientSide(isInfiniteQuery ? 'getSocketInfiniteQueryKey' : 'getSocketQueryKey')
    const facade = this._resolveBoundHandlerFacade(target, channelInput, undefined, true)
    return this._getSocketQueryKey({ facade, boundRoom: this._boundSpaceRoom(target), input, isInfiniteQuery })
  }

  private _getSocketQueryDataInner({
    target,
    channelInput,
    input,
    isInfiniteQuery,
  }: {
    target: unknown
    channelInput?: unknown
    input?: InputRaw | undefined
    isInfiniteQuery: boolean
  }): unknown {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSocketQueryDataInner, point ${this.id}`)
    }
    this._assertSocketClientSide(isInfiniteQuery ? 'getSocketInfiniteQueryData' : 'getSocketQueryData')
    const facade = this._resolveBoundHandlerFacade(target, channelInput, undefined, true)
    const queryKey = this._getSocketQueryKey({
      facade,
      boundRoom: this._boundSpaceRoom(target),
      input,
      isInfiniteQuery,
    })
    return _ss.__POINT0_QUERY_CLIENT__.get().getQueryData(queryKey)
  }

  private _setSocketQueryDataInner({
    target,
    channelInput,
    input,
    updater,
    isInfiniteQuery,
  }: {
    target: unknown
    channelInput?: unknown
    input?: InputRaw | undefined
    updater: (old: unknown) => unknown
    isInfiniteQuery: boolean
  }): unknown {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_setSocketQueryDataInner, point ${this.id}`)
    }
    this._assertSocketClientSide(isInfiniteQuery ? 'setSocketInfiniteQueryData' : 'setSocketQueryData')
    // exact-key write (setQueryData semantics): the connection resolves strictly, like getSocketQueryKey
    const facade = this._resolveBoundHandlerFacade(target, channelInput, undefined, true)
    const queryKey = this._getSocketQueryKey({
      facade,
      boundRoom: this._boundSpaceRoom(target),
      input,
      isInfiniteQuery,
    })
    return _ss.__POINT0_QUERY_CLIENT__.get().setQueryData(queryKey, updater)
  }

  private _getSocketQueryStateInner({
    target,
    channelInput,
    input,
    isInfiniteQuery,
  }: {
    target: unknown
    channelInput?: unknown
    input?: InputRaw | undefined
    isInfiniteQuery: boolean
  }): unknown {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSocketQueryStateInner, point ${this.id}`)
    }
    this._assertSocketClientSide(isInfiniteQuery ? 'getSocketInfiniteQueryState' : 'getSocketQueryState')
    const facade = this._resolveBoundHandlerFacade(target, channelInput, undefined, true)
    const queryKey = this._getSocketQueryKey({
      facade,
      boundRoom: this._boundSpaceRoom(target),
      input,
      isInfiniteQuery,
    })
    return _ss.__POINT0_QUERY_CLIENT__.get().getQueryState(queryKey)
  }

  private _getSocketQueryCacheInner({
    target,
    channelInput,
    input,
    isInfiniteQuery,
  }: {
    target: unknown
    channelInput?: unknown
    input?: InputRaw | undefined
    isInfiniteQuery: boolean
  }): unknown {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSocketQueryCacheInner, point ${this.id}`)
    }
    this._assertSocketClientSide(isInfiniteQuery ? 'getSocketInfiniteQueryCache' : 'getSocketQueryCache')
    const facade = this._resolveBoundHandlerFacade(target, channelInput, undefined, true)
    const queryKey = this._getSocketQueryKey({
      facade,
      boundRoom: this._boundSpaceRoom(target),
      input,
      isInfiniteQuery,
    })
    return _ss.__POINT0_QUERY_CLIENT__.get().getQueryCache().find({ queryKey: queryKey, exact: true })
  }

  /**
   * The socket twin of `_getQueryPredicate` — matches this handler's socket cache entries: same
   * scope/type/name/channel, the requested finiteness, scoped to the resolved connection/membership when there is one
   * (with none, the handler across ALL connections), the input by exact serialized match or a predicate over the parsed
   * input (`true`/omitted = every input). A space handler's `room` is matched only when the binding NAMED one
   * (`handler(room)`); a membership-bound / bare fuzzy form scopes by the connection and sweeps every room of the space
   * on it — including entries left under rooms a re-join replaced, which is exactly what you want. The exact-key path
   * (which always carries the room) is `_getSocketQueryKey`.
   */
  private _getSocketQueryPredicate({
    facade,
    boundRoom,
    input,
    isInfiniteQuery,
  }: {
    facade: AnyClientChannelConnection | AnyClientSpaceMembership | undefined
    boundRoom?: unknown
    input: InputRaw | ((input: InputRaw) => boolean) | true | undefined
    isInfiniteQuery: boolean
  }): (query: Query) => boolean {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSocketQueryPredicate, point ${this.id}`)
    }
    const channel = this._channelPointOrThrow()
    const space = this._spacePoint
    const transformer = this._getSocketTransformer()
    const inputFunctionProvided = typeof input === 'function' ? input : undefined
    const inputStringifiedProvided =
      input !== true && typeof input !== 'function' && input !== undefined
        ? stringifyOrThrow(transformer, input, this.id)
        : undefined
    // a space handler's entries are keyed by the CONNECTION its membership rides — the membership input is not part of
    // the key (it is a hold-dedup key, not an address)
    const connectionInputSource = space
      ? (facade as AnyClientSpaceMembership | undefined)?.connection.input
      : facade?.input
    const connectionInputStringified = facade
      ? stringifyOrThrow(channel._getSocketTransformer(), connectionInputSource ?? {}, channel.id)
      : undefined
    const roomStringified =
      space && boundRoom !== undefined
        ? stringifyOrThrow(space._getSocketTransformer(), boundRoom, space.id)
        : undefined
    return (query) => {
      const obj = parseQueryKey(query.queryKey) as
        | {
            scope?: unknown
            type?: unknown
            name?: unknown
            mode?: unknown
            finiteness?: unknown
            channel?: unknown
            space?: unknown
            room?: unknown
            connectionInput?: unknown
            input?: unknown
          }
        | undefined
      if (!obj) {
        return false
      }
      if (obj.scope !== this.scope || obj.type !== this.type || obj.name !== this.name) {
        return false
      }
      if (obj.mode !== 'socket' || obj.channel !== channel.name) {
        return false
      }
      if (obj.finiteness !== (isInfiniteQuery ? 'infinite' : 'finite')) {
        return false
      }
      if (space && obj.space !== space.name) {
        return false
      }
      if (connectionInputStringified !== undefined && obj.connectionInput !== connectionInputStringified) {
        return false
      }
      if (roomStringified !== undefined && obj.room !== roomStringified) {
        return false
      }
      if (inputStringifiedProvided !== undefined) {
        if (obj.input !== inputStringifiedProvided) {
          return false
        }
      } else if (inputFunctionProvided) {
        const inputParsed = transformer.parse<InputRaw>(obj.input as string)
        if (inputFunctionProvided(inputParsed) === false) {
          return false
        }
      }
      return true
    }
  }

  /**
   * The socket twin of `_getQueryFilters` — an exact input (object / omitted) is an exact-key filter over the strictly
   * resolved connection; a predicate or `true` is a predicate filter, scoped to the laxly resolved connection (a bound
   * target must exist; the bare form with no live connection matches the handler across all connections).
   */
  private _getSocketQueryFiltersInner({
    target,
    channelInput,
    input,
    isInfiniteQuery,
    method,
  }: {
    target: unknown
    channelInput?: unknown
    input: InputRaw | ((input: InputRaw) => boolean) | true | undefined
    isInfiniteQuery: boolean
    method: string
  }): QueryFilters {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSocketQueryFiltersInner, point ${this.id}`)
    }
    this._assertSocketClientSide(method)
    const fuzzy = input === true || typeof input === 'function'
    const facade = this._resolveBoundHandlerFacade(target, channelInput, undefined, fuzzy ? target !== undefined : true)
    if (fuzzy) {
      return {
        predicate: this._getSocketQueryPredicate({
          facade,
          boundRoom: this._boundSpaceRoom(target),
          input,
          isInfiniteQuery,
        }),
      }
    }
    return {
      queryKey: this._getSocketQueryKey({ facade, boundRoom: this._boundSpaceRoom(target), input, isInfiniteQuery }),
      exact: true,
    }
  }

  private _getSocketQueriesCacheInner({
    target,
    channelInput,
    input,
    isInfiniteQuery,
  }: {
    target: unknown
    channelInput?: unknown
    input: InputRaw | ((input: InputRaw) => boolean) | true | undefined
    isInfiniteQuery: boolean
  }): unknown[] {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSocketQueriesCacheInner, point ${this.id}`)
    }
    this._assertSocketClientSide(isInfiniteQuery ? 'getSocketInfiniteQueriesCache' : 'getSocketQueriesCache')
    const facade = this._resolveBoundHandlerFacade(target, channelInput, undefined, target !== undefined)
    return _ss.__POINT0_QUERY_CLIENT__
      .get()
      .getQueryCache()
      .findAll({
        predicate: this._getSocketQueryPredicate({
          facade,
          boundRoom: this._boundSpaceRoom(target),
          input,
          isInfiniteQuery,
        }),
      })
  }

  private async _refetchSocketQueryInner(args: {
    target: unknown
    channelInput?: unknown
    input: InputRaw | ((input: InputRaw) => boolean) | true | undefined
    isInfiniteQuery: boolean
    refetchOptions?: RefetchOptions | undefined
  }): Promise<void> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_refetchSocketQueryInner, point ${this.id}`)
    }
    const filters = this._getSocketQueryFiltersInner({
      ...args,
      method: args.isInfiniteQuery ? 'refetchSocketInfiniteQuery' : 'refetchSocketQuery',
    })
    await _ss.__POINT0_QUERY_CLIENT__.get().refetchQueries(filters, args.refetchOptions)
  }

  private async _invalidateSocketQueryInner(args: {
    target: unknown
    channelInput?: unknown
    input: InputRaw | ((input: InputRaw) => boolean) | true | undefined
    isInfiniteQuery: boolean
    invalidateOptions?: InvalidateOptions | undefined
  }): Promise<void> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_invalidateSocketQueryInner, point ${this.id}`)
    }
    const filters = this._getSocketQueryFiltersInner({
      ...args,
      method: args.isInfiniteQuery ? 'invalidateSocketInfiniteQuery' : 'invalidateSocketQuery',
    })
    await _ss.__POINT0_QUERY_CLIENT__.get().invalidateQueries(filters, args.invalidateOptions)
  }

  private async _cancelSocketQueryInner(args: {
    target: unknown
    channelInput?: unknown
    input: InputRaw | ((input: InputRaw) => boolean) | true | undefined
    isInfiniteQuery: boolean
    cancelOptions?: CancelOptions | undefined
  }): Promise<void> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_cancelSocketQueryInner, point ${this.id}`)
    }
    const filters = this._getSocketQueryFiltersInner({
      ...args,
      method: args.isInfiniteQuery ? 'cancelSocketInfiniteQuery' : 'cancelSocketQuery',
    })
    await _ss.__POINT0_QUERY_CLIENT__.get().cancelQueries(filters, args.cancelOptions)
  }

  private _removeSocketQueryInner(args: {
    target: unknown
    channelInput?: unknown
    input: InputRaw | ((input: InputRaw) => boolean) | true | undefined
    isInfiniteQuery: boolean
  }): void {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_removeSocketQueryInner, point ${this.id}`)
    }
    const filters = this._getSocketQueryFiltersInner({
      ...args,
      method: args.isInfiniteQuery ? 'removeSocketInfiniteQuery' : 'removeSocketQuery',
    })
    _ss.__POINT0_QUERY_CLIENT__.get().removeQueries(filters)
  }

  private async _resetSocketQueryInner(args: {
    target: unknown
    channelInput?: unknown
    input: InputRaw | ((input: InputRaw) => boolean) | true | undefined
    isInfiniteQuery: boolean
  }): Promise<void> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_resetSocketQueryInner, point ${this.id}`)
    }
    const filters = this._getSocketQueryFiltersInner({
      ...args,
      method: args.isInfiniteQuery ? 'resetSocketInfiniteQuery' : 'resetSocketQuery',
    })
    await _ss.__POINT0_QUERY_CLIENT__.get().resetQueries(filters)
  }

  /**
   * The socket query's `useQuery` hook (the `.query()` flavor) — the message input first, react-query options second;
   * the cache key carries the address of the level next to the message input: the channel's connection input, plus —
   * for a space handler — the space and the BOUND room (never the membership input). The connection resolves like every
   * bare handler method: the ambient `<channel.Connection>`, else the single live connection — bind an explicit one
   * with `handler(connection).useSocketQuery(...)`. The query never runs before the connection opens; during SSR
   * nothing is ever open, so it renders pending and never lands in the dehydrated state.
   *
   * Client-side — fetching happens over the client's WebSocket (renders pending during SSR).
   *
   *     const { data } = chatInfoHandler.useSocketQuery({ q })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  useSocketQuery(
    ...args: TPointType extends 'serverHandler'
      ? ServerHandlerSendArgs<
          InputRaw<TServerInputSchema>,
          ExtraUseQueryOptions<TServerLoaderOutput, TError, TServerLoaderOutput, QueryKey>
        >
      : never
  ): TPointType extends 'serverHandler' ? UseQueryResult<TServerLoaderOutput, TError> : never
  useSocketQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`useSocketQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'useSocketQuery')
    const facade = this._useHandlerConnectionFacade({ target: undefined, consultAmbient: true })
    return this._useSocketQueryInner({ facade, input: args[0], queryOptions: args[1] })
  }

  /**
   * The socket query's `useInfiniteQuery` hook (the `.infiniteQuery()` flavor) — the page cursor folds into the message
   * input under the flavor's `pageParamFromInput` key, each page is one `sendToServer`. Same connection resolution and
   * open-gating as `useSocketQuery`.
   *
   * Client-side — fetching happens over the client's WebSocket (renders pending during SSR).
   *
   *     const feed = chatFeedHandler.useSocketInfiniteQuery({ q })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  useSocketInfiniteQuery(
    ...args: TPointType extends 'serverHandler'
      ? ServerHandlerSendArgs<
          InputRaw<TServerInputSchema>,
          PartialUseInfiniteQueryOptions<
            InputRaw<TServerInputSchema>,
            TServerLoaderOutput,
            TError,
            InfiniteData<TServerLoaderOutput>,
            QueryKey,
            unknown
          >
        >
      : never
  ): TPointType extends 'serverHandler' ? UseInfiniteQueryResult<InfiniteData<TServerLoaderOutput>, TError> : never
  useSocketInfiniteQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`useSocketInfiniteQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'useSocketInfiniteQuery')
    const facade = this._useHandlerConnectionFacade({ target: undefined, consultAmbient: true })
    return this._useSocketInfiniteQueryInner({ facade, input: args[0], infiniteQueryOptions: args[1] })
  }

  /**
   * The handler as a TanStack `useMutation` (the default mutation flavor) — pass the message input to `mutate` /
   * `mutateAsync`, the `.serverReply` return is the mutation data. The connection resolves at MUTATE time: the ambient
   * `<channel.Connection>`, else the single live connection — bind an explicit one with
   * `handler(connection).useSocketMutation()`.
   *
   * Client-side — mutating happens over the client's WebSocket (a runtime error on the server).
   *
   *     const send = messageSendHandler.useSocketMutation()
   *     send.mutate({ text })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  useSocketMutation(
    ...args: TPointType extends 'serverHandler'
      ? [mutationOptions?: ExtraUseMutationOptions<TServerLoaderOutput, TError, InputRaw<TServerInputSchema>>]
      : never
  ): TPointType extends 'serverHandler'
    ? UseMutationResult<TServerLoaderOutput, TError, InputRaw<TServerInputSchema>>
    : never
  useSocketMutation(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`useSocketMutation, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('mutation', 'useSocketMutation')
    return this._useSocketMutationInner({ target: undefined, consultAmbient: true, mutationOptions: args[0] })
  }

  /**
   * The socket query's `useSuspenseQuery` (the `.query()` flavor) — TanStack suspense semantics over the socket: the
   * hook first suspends on the CONNECT itself, then on the fetch. During SSR nothing is ever connected — the HTML ships
   * the Suspense fallback and the client resolves after hydration (the socket `ssr: false` behavior).
   *
   * Client-side — fetching happens over the client's WebSocket (renders the fallback during SSR).
   *
   *     const { data } = chatInfoHandler.useSuspenseSocketQuery({ q })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  useSuspenseSocketQuery(
    ...args: TPointType extends 'serverHandler'
      ? ServerHandlerSendArgs<
          InputRaw<TServerInputSchema>,
          ExtraUseSuspenseQueryOptions<TServerLoaderOutput, TError, TServerLoaderOutput, QueryKey>
        >
      : never
  ): TPointType extends 'serverHandler' ? UseSuspenseQueryResult<TServerLoaderOutput, TError> : never
  useSuspenseSocketQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`useSuspenseSocketQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'useSuspenseSocketQuery')
    return this._useSuspenseSocketQueryInner({
      target: undefined,
      consultAmbient: true,
      input: args[0],
      queryOptions: args[1],
      isInfiniteQuery: false,
    })
  }

  /**
   * The infinite socket query's `useSuspenseInfiniteQuery` (the `.infiniteQuery()` flavor) — suspends on the connect,
   * then on the first page; during SSR the HTML ships the fallback (the socket `ssr: false` behavior).
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  useSuspenseSocketInfiniteQuery(
    ...args: TPointType extends 'serverHandler'
      ? ServerHandlerSendArgs<
          InputRaw<TServerInputSchema>,
          PartialUseSuspenseInfiniteQueryOptions<
            InputRaw<TServerInputSchema>,
            TServerLoaderOutput,
            TError,
            InfiniteData<TServerLoaderOutput>,
            QueryKey,
            unknown
          >
        >
      : never
  ): TPointType extends 'serverHandler'
    ? UseSuspenseInfiniteQueryResult<InfiniteData<TServerLoaderOutput>, TError>
    : never
  useSuspenseSocketInfiniteQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`useSuspenseSocketInfiniteQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'useSuspenseSocketInfiniteQuery')
    return this._useSuspenseSocketQueryInner({
      target: undefined,
      consultAmbient: true,
      input: args[0],
      queryOptions: args[1],
      isInfiniteQuery: true,
    })
  }

  /**
   * Imperatively fetch and cache the socket query (the `.query()` flavor) — reads the cache if fresh, otherwise sends
   * the message over the resolved connection, AWAITING the connect first (up to the handler's `timeout`; it fails only
   * when the connect fails). Resolves the single live connection; bind an explicit one with
   * `handler(connection).fetchSocketQuery(...)`. A runtime error on the server.
   *
   * Client-side.
   *
   *     const info = await chatInfoHandler.fetchSocketQuery({ q })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  fetchSocketQuery(
    ...args: TPointType extends 'serverHandler' ? ServerHandlerInputArgs<InputRaw<TServerInputSchema>> : never
  ): TPointType extends 'serverHandler' ? Promise<TServerLoaderOutput> : never
  fetchSocketQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`fetchSocketQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'fetchSocketQuery')
    return this._fetchSocketQueryInner({ target: undefined, input: args[0] })
  }

  /**
   * Imperatively fetch and cache the infinite socket query (the `.infiniteQuery()` flavor). Same connection resolution
   * and await-the-connect as `fetchSocketQuery`.
   *
   * Client-side.
   *
   *     const feed = await chatFeedHandler.fetchSocketInfiniteQuery({ q })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  fetchSocketInfiniteQuery(
    ...args: TPointType extends 'serverHandler' ? ServerHandlerInputArgs<InputRaw<TServerInputSchema>> : never
  ): TPointType extends 'serverHandler' ? Promise<InfiniteData<TServerLoaderOutput>> : never
  fetchSocketInfiniteQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`fetchSocketInfiniteQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'fetchSocketInfiniteQuery')
    return this._fetchSocketInfiniteQueryInner({ target: undefined, input: args[0] })
  }

  /**
   * Warm the socket query's cache without returning the data — fetches only if not already cached, awaiting the connect
   * like `fetchSocketQuery`.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  prefetchSocketQuery(
    ...args: TPointType extends 'serverHandler'
      ? [
          ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
          queryOptions?: ExtraUseQueryOptions<TServerLoaderOutput, TError, TServerLoaderOutput, QueryKey>,
        ]
      : never
  ): TPointType extends 'serverHandler' ? Promise<void> : never
  prefetchSocketQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`prefetchSocketQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'prefetchSocketQuery')
    return this._prefetchSocketQueryInner({
      target: undefined,
      input: args[0],
      queryOptions: args[1],
      isInfiniteQuery: false,
    })
  }

  /**
   * Warm the infinite socket query's cache without returning the data — fetches only if not already cached, awaiting
   * the connect like `fetchSocketInfiniteQuery`.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  prefetchSocketInfiniteQuery(
    ...args: TPointType extends 'serverHandler'
      ? [
          ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
          infiniteQueryOptions?: PartialUseInfiniteQueryOptions<
            InputRaw<TServerInputSchema>,
            TServerLoaderOutput,
            TError,
            InfiniteData<TServerLoaderOutput>,
            QueryKey,
            unknown
          >,
        ]
      : never
  ): TPointType extends 'serverHandler' ? Promise<void> : never
  prefetchSocketInfiniteQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`prefetchSocketInfiniteQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'prefetchSocketInfiniteQuery')
    return this._prefetchSocketQueryInner({
      target: undefined,
      input: args[0],
      queryOptions: args[1],
      isInfiniteQuery: true,
    })
  }

  /**
   * The cached data for an input if present, otherwise fetch it — like `fetchSocketQuery` but never refetches when data
   * already exists.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  ensureSocketQueryData(
    ...args: TPointType extends 'serverHandler'
      ? [
          ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
          queryOptions?: ExtraUseQueryOptions<TServerLoaderOutput, TError, TServerLoaderOutput, QueryKey>,
        ]
      : never
  ): TPointType extends 'serverHandler' ? Promise<TServerLoaderOutput> : never
  ensureSocketQueryData(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`ensureSocketQueryData, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'ensureSocketQueryData')
    return this._ensureSocketQueryDataInner({
      target: undefined,
      input: args[0],
      queryOptions: args[1],
      isInfiniteQuery: false,
    })
  }

  /**
   * The cached pages for an input if present, otherwise fetch the first page — like `fetchSocketInfiniteQuery` but
   * never refetches when data already exists.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  ensureSocketInfiniteQueryData(
    ...args: TPointType extends 'serverHandler'
      ? [
          ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
          infiniteQueryOptions?: PartialUseInfiniteQueryOptions<
            InputRaw<TServerInputSchema>,
            TServerLoaderOutput,
            TError,
            InfiniteData<TServerLoaderOutput>,
            QueryKey,
            unknown
          >,
        ]
      : never
  ): TPointType extends 'serverHandler' ? Promise<InfiniteData<TServerLoaderOutput>> : never
  ensureSocketInfiniteQueryData(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`ensureSocketInfiniteQueryData, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'ensureSocketInfiniteQueryData')
    return this._ensureSocketQueryDataInner({
      target: undefined,
      input: args[0],
      queryOptions: args[1],
      isInfiniteQuery: true,
    })
  }

  /**
   * The resolved react-query `UseQueryOptions` of the socket query (key over the strictly resolved connection,
   * `queryFn` as a `sendToServer`, merged defaults) — ready to hand to TanStack directly.
   *
   * Client-side — the key carries the live connection's room and input.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketQueryOptions(
    ...args: TPointType extends 'serverHandler'
      ? [
          ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
          queryOptions?: ExtraUseQueryOptions<TServerLoaderOutput, TError, TServerLoaderOutput, QueryKey>,
        ]
      : never
  ): TPointType extends 'serverHandler'
    ? UseQueryOptions<TServerLoaderOutput, TError, TServerLoaderOutput, QueryKey>
    : never
  getSocketQueryOptions(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketQueryOptions, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'getSocketQueryOptions')
    return this._getSocketQueryOptionsInner({
      target: undefined,
      input: args[0],
      queryOptions: args[1],
      isInfiniteQuery: false,
    })
  }

  /**
   * The resolved react-query `UseInfiniteQueryOptions` of the infinite socket query — ready to hand to TanStack
   * directly.
   *
   * Client-side — the key carries the live connection's room and input.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketInfiniteQueryOptions(
    ...args: TPointType extends 'serverHandler'
      ? [
          ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
          infiniteQueryOptions?: PartialUseInfiniteQueryOptions<
            InputRaw<TServerInputSchema>,
            TServerLoaderOutput,
            TError,
            InfiniteData<TServerLoaderOutput>,
            QueryKey,
            unknown
          >,
        ]
      : never
  ): TPointType extends 'serverHandler'
    ? UseInfiniteQueryOptions<
        InputRaw<TServerInputSchema>,
        TServerLoaderOutput,
        TError,
        InfiniteData<TServerLoaderOutput>,
        QueryKey
      >
    : never
  getSocketInfiniteQueryOptions(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketInfiniteQueryOptions, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueryOptions')
    return this._getSocketQueryOptionsInner({
      target: undefined,
      input: args[0],
      queryOptions: args[1],
      isInfiniteQuery: true,
    })
  }

  /**
   * The socket query's key tuple for an input — the same key the hooks cache under; it carries the resolved
   * connection's serialized room and channel input. Resolves the connection strictly (the single live one; bind an
   * explicit one with `handler(connection).getSocketQueryKey(...)`).
   *
   * Client-side — resolving the connection needs the live client runtime.
   *
   *     chatInfoHandler.getSocketQueryKey({ q })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketQueryKey(
    ...args: TPointType extends 'serverHandler' ? ServerHandlerInputArgs<InputRaw<TServerInputSchema>> : never
  ): TPointType extends 'serverHandler' ? QueryKey : never
  getSocketQueryKey(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketQueryKey, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'getSocketQueryKey')
    return this._getSocketQueryKeyInner({ target: undefined, input: args[0], isInfiniteQuery: false })
  }

  /**
   * The infinite socket query's key tuple for an input — the same key the hooks cache under. Resolves the connection
   * strictly.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketInfiniteQueryKey(
    ...args: TPointType extends 'serverHandler' ? ServerHandlerInputArgs<InputRaw<TServerInputSchema>> : never
  ): TPointType extends 'serverHandler' ? QueryKey : never
  getSocketInfiniteQueryKey(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketInfiniteQueryKey, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueryKey')
    return this._getSocketQueryKeyInner({ target: undefined, input: args[0], isInfiniteQuery: true })
  }

  /**
   * Read the socket query's cached data for an exact input — `undefined` if uncached. Exact-key, no fetch.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketQueryData(
    ...args: TPointType extends 'serverHandler' ? ServerHandlerInputArgs<InputRaw<TServerInputSchema>> : never
  ): TPointType extends 'serverHandler' ? TServerLoaderOutput | undefined : never
  getSocketQueryData(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketQueryData, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'getSocketQueryData')
    return this._getSocketQueryDataInner({ target: undefined, input: args[0], isInfiniteQuery: false })
  }

  /**
   * Read the infinite socket query's cached pages for an exact input — `undefined` if uncached.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketInfiniteQueryData(
    ...args: TPointType extends 'serverHandler' ? ServerHandlerInputArgs<InputRaw<TServerInputSchema>> : never
  ): TPointType extends 'serverHandler' ? InfiniteData<TServerLoaderOutput> | undefined : never
  getSocketInfiniteQueryData(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketInfiniteQueryData, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueryData')
    return this._getSocketQueryDataInner({ target: undefined, input: args[0], isInfiniteQuery: true })
  }

  /**
   * Write the socket query's cached data directly — the push-driven mirror of `setQueryData`: a clientHandler push
   * carrying the READY data lands it in the cache with zero refetch requests. Exact-key: the connection resolves
   * strictly (the ambient `<channel.Connection>`, else the single live one — bind an explicit target with
   * `handler(connection).setSocketQueryData(...)`); `old` is `undefined` until the query has resolved once. Returns the
   * new data.
   *
   * Client-side — socket queries live in the browser cache (a runtime error on the server).
   *
   *     presenceChangedHandler(membership).useOnMessageFromServer(({ message }) => {
   *       whoIsHereHandler(membership).setSocketQueryData(undefined, () => ({ nicknames: message.nicknames }))
   *     })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  setSocketQueryData(
    ...args: TPointType extends 'serverHandler'
      ? [
          input: InputRaw<TServerInputSchema> | undefined,
          updater: Updater<TServerLoaderOutput | undefined, TServerLoaderOutput>,
        ]
      : never
  ): TPointType extends 'serverHandler' ? TServerLoaderOutput : never
  setSocketQueryData(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`setSocketQueryData, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'setSocketQueryData')
    return this._setSocketQueryDataInner({
      target: undefined,
      input: args[0],
      updater: args[1],
      isInfiniteQuery: false,
    })
  }

  /**
   * Write the infinite socket query's cached pages directly — exact-key, `old` is `undefined` until the query has
   * resolved once. Returns the new pages.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  setSocketInfiniteQueryData(
    ...args: TPointType extends 'serverHandler'
      ? [
          input: InputRaw<TServerInputSchema> | undefined,
          updater: Updater<InfiniteData<TServerLoaderOutput> | undefined, InfiniteData<TServerLoaderOutput>>,
        ]
      : never
  ): TPointType extends 'serverHandler' ? InfiniteData<TServerLoaderOutput> : never
  setSocketInfiniteQueryData(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`setSocketInfiniteQueryData, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'setSocketInfiniteQueryData')
    return this._setSocketQueryDataInner({
      target: undefined,
      input: args[0],
      updater: args[1],
      isInfiniteQuery: true,
    })
  }

  /**
   * Read the TanStack `QueryState` of the socket query for an exact input — `undefined` if uncached.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketQueryState(
    ...args: TPointType extends 'serverHandler' ? ServerHandlerInputArgs<InputRaw<TServerInputSchema>> : never
  ): TPointType extends 'serverHandler' ? QueryState<TServerLoaderOutput, TError> | undefined : never
  getSocketQueryState(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketQueryState, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'getSocketQueryState')
    return this._getSocketQueryStateInner({ target: undefined, input: args[0], isInfiniteQuery: false })
  }

  /**
   * Read the TanStack `QueryState` of the infinite socket query for an exact input — `undefined` if uncached.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketInfiniteQueryState(
    ...args: TPointType extends 'serverHandler' ? ServerHandlerInputArgs<InputRaw<TServerInputSchema>> : never
  ): TPointType extends 'serverHandler' ? QueryState<InfiniteData<TServerLoaderOutput>, TError> | undefined : never
  getSocketInfiniteQueryState(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketInfiniteQueryState, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueryState')
    return this._getSocketQueryStateInner({ target: undefined, input: args[0], isInfiniteQuery: true })
  }

  /**
   * The single TanStack `Query` cache entry of the socket query for an exact input (`undefined` if none). For many
   * entries use `getSocketQueriesCache`.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketQueryCache(
    ...args: TPointType extends 'serverHandler' ? ServerHandlerInputArgs<InputRaw<TServerInputSchema>> : never
  ): TPointType extends 'serverHandler'
    ? Query<TServerLoaderOutput, TError, TServerLoaderOutput, QueryKey> | undefined
    : never
  getSocketQueryCache(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketQueryCache, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'getSocketQueryCache')
    return this._getSocketQueryCacheInner({ target: undefined, input: args[0], isInfiniteQuery: false })
  }

  /**
   * The single TanStack `Query` cache entry of the infinite socket query for an exact input (`undefined` if none).
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketInfiniteQueryCache(
    ...args: TPointType extends 'serverHandler' ? ServerHandlerInputArgs<InputRaw<TServerInputSchema>> : never
  ): TPointType extends 'serverHandler'
    ? Query<InfiniteData<TServerLoaderOutput>, TError, InfiniteData<TServerLoaderOutput>, QueryKey> | undefined
    : never
  getSocketInfiniteQueryCache(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketInfiniteQueryCache, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueryCache')
    return this._getSocketQueryCacheInner({ target: undefined, input: args[0], isInfiniteQuery: true })
  }

  /**
   * An array of `Query` cache entries of this handler — match by exact input, a predicate over the parsed input, or
   * `true`/omitted for every entry (scoped to the resolved connection; with none, across all connections).
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketQueriesCache(
    ...args: TPointType extends 'serverHandler'
      ? [input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true]
      : never
  ): TPointType extends 'serverHandler'
    ? Array<Query<TServerLoaderOutput, TError, TServerLoaderOutput, QueryKey>>
    : never
  getSocketQueriesCache(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketQueriesCache, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'getSocketQueriesCache')
    return this._getSocketQueriesCacheInner({ target: undefined, input: args[0], isInfiniteQuery: false })
  }

  /**
   * An array of `Query` cache entries of this infinite handler — match by exact input, a predicate over the parsed
   * input, or `true`/omitted for every entry.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketInfiniteQueriesCache(
    ...args: TPointType extends 'serverHandler'
      ? [input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true]
      : never
  ): TPointType extends 'serverHandler'
    ? Array<Query<InfiniteData<TServerLoaderOutput>, TError, InfiniteData<TServerLoaderOutput>, QueryKey>>
    : never
  getSocketInfiniteQueriesCache(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketInfiniteQueriesCache, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'getSocketInfiniteQueriesCache')
    return this._getSocketQueriesCacheInner({ target: undefined, input: args[0], isInfiniteQuery: true })
  }

  /**
   * Force a refetch of the socket query, ignoring staleness — target by exact input, a predicate over the parsed input,
   * or `true` for every entry of this handler on the resolved connection.
   *
   * Client-side.
   *
   *     await chatInfoHandler.refetchSocketQuery({ q })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  refetchSocketQuery(
    ...args: TPointType extends 'serverHandler'
      ? [
          input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true,
          refetchOptions?: RefetchOptions,
        ]
      : never
  ): TPointType extends 'serverHandler' ? Promise<void> : never
  refetchSocketQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`refetchSocketQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'refetchSocketQuery')
    return this._refetchSocketQueryInner({
      target: undefined,
      input: args[0],
      refetchOptions: args[1],
      isInfiniteQuery: false,
    })
  }

  /**
   * Force a refetch of the infinite socket query, ignoring staleness — target by exact input, a predicate over the
   * parsed input, or `true`.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  refetchSocketInfiniteQuery(
    ...args: TPointType extends 'serverHandler'
      ? [
          input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true,
          refetchOptions?: RefetchOptions,
        ]
      : never
  ): TPointType extends 'serverHandler' ? Promise<void> : never
  refetchSocketInfiniteQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`refetchSocketInfiniteQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'refetchSocketInfiniteQuery')
    return this._refetchSocketQueryInner({
      target: undefined,
      input: args[0],
      refetchOptions: args[1],
      isInfiniteQuery: true,
    })
  }

  /**
   * Mark the socket query stale and refetch it if active — target by exact input, a predicate over the parsed input, or
   * `true` for every entry of this handler on the resolved connection (with no resolvable connection, across ALL
   * connections).
   *
   * Client-side.
   *
   *     await chatInfoHandler.invalidateSocketQuery({ q }) // one input on the resolved connection
   *     await chatInfoHandler.invalidateSocketQuery(true) // every entry of this handler
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  invalidateSocketQuery(
    ...args: TPointType extends 'serverHandler'
      ? [
          input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true,
          invalidateOptions?: InvalidateOptions,
        ]
      : never
  ): TPointType extends 'serverHandler' ? Promise<void> : never
  invalidateSocketQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`invalidateSocketQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'invalidateSocketQuery')
    return this._invalidateSocketQueryInner({
      target: undefined,
      input: args[0],
      invalidateOptions: args[1],
      isInfiniteQuery: false,
    })
  }

  /**
   * Mark the infinite socket query stale and refetch it if active — target by exact input, a predicate over the parsed
   * input, or `true` (the infinite pair of `invalidateSocketQuery`).
   *
   * Client-side.
   *
   *     await chatFeedHandler.invalidateSocketInfiniteQuery({ q })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  invalidateSocketInfiniteQuery(
    ...args: TPointType extends 'serverHandler'
      ? [
          input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true,
          invalidateOptions?: InvalidateOptions,
        ]
      : never
  ): TPointType extends 'serverHandler' ? Promise<void> : never
  invalidateSocketInfiniteQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`invalidateSocketInfiniteQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'invalidateSocketInfiniteQuery')
    return this._invalidateSocketQueryInner({
      target: undefined,
      input: args[0],
      invalidateOptions: args[1],
      isInfiniteQuery: true,
    })
  }

  /**
   * Cancel any in-flight fetch of the socket query — target by exact input, a predicate over the parsed input, or
   * `true`. Typically before an optimistic `setSocketQueryData`.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  cancelSocketQuery(
    ...args: TPointType extends 'serverHandler'
      ? [
          input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true,
          cancelOptions?: CancelOptions,
        ]
      : never
  ): TPointType extends 'serverHandler' ? Promise<void> : never
  cancelSocketQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`cancelSocketQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'cancelSocketQuery')
    return this._cancelSocketQueryInner({
      target: undefined,
      input: args[0],
      cancelOptions: args[1],
      isInfiniteQuery: false,
    })
  }

  /**
   * Cancel any in-flight fetch of the infinite socket query — target by exact input, a predicate over the parsed input,
   * or `true`.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  cancelSocketInfiniteQuery(
    ...args: TPointType extends 'serverHandler'
      ? [
          input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true,
          cancelOptions?: CancelOptions,
        ]
      : never
  ): TPointType extends 'serverHandler' ? Promise<void> : never
  cancelSocketInfiniteQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`cancelSocketInfiniteQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'cancelSocketInfiniteQuery')
    return this._cancelSocketQueryInner({
      target: undefined,
      input: args[0],
      cancelOptions: args[1],
      isInfiniteQuery: true,
    })
  }

  /**
   * Drop the socket query from the cache entirely — no refetch, the entry is gone. Target by exact input, a predicate
   * over the parsed input, or `true`.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  removeSocketQuery(
    ...args: TPointType extends 'serverHandler'
      ? [input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true]
      : never
  ): TPointType extends 'serverHandler' ? void : never
  removeSocketQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`removeSocketQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'removeSocketQuery')
    return this._removeSocketQueryInner({ target: undefined, input: args[0], isInfiniteQuery: false })
  }

  /**
   * Drop the infinite socket query from the cache entirely — no refetch. Target by exact input, a predicate over the
   * parsed input, or `true`.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  removeSocketInfiniteQuery(
    ...args: TPointType extends 'serverHandler'
      ? [input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true]
      : never
  ): TPointType extends 'serverHandler' ? void : never
  removeSocketInfiniteQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`removeSocketInfiniteQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'removeSocketInfiniteQuery')
    return this._removeSocketQueryInner({ target: undefined, input: args[0], isInfiniteQuery: true })
  }

  /**
   * Reset the socket query to its initial state and refetch if active — clears data/error, not just staleness. Target
   * by exact input, a predicate over the parsed input, or `true`.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  resetSocketQuery(
    ...args: TPointType extends 'serverHandler'
      ? [input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true]
      : never
  ): TPointType extends 'serverHandler' ? Promise<void> : never
  resetSocketQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`resetSocketQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('query', 'resetSocketQuery')
    return this._resetSocketQueryInner({ target: undefined, input: args[0], isInfiniteQuery: false })
  }

  /**
   * Reset the infinite socket query to its initial state and refetch if active — clears data/error, not just staleness.
   * Target by exact input, a predicate over the parsed input, or `true`.
   *
   * Client-side.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  resetSocketInfiniteQuery(
    ...args: TPointType extends 'serverHandler'
      ? [input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true]
      : never
  ): TPointType extends 'serverHandler' ? Promise<void> : never
  resetSocketInfiniteQuery(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`resetSocketInfiniteQuery, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('infiniteQuery', 'resetSocketInfiniteQuery')
    return this._resetSocketQueryInner({ target: undefined, input: args[0], isInfiniteQuery: true })
  }

  /**
   * Run the handler through the mutation machinery imperatively, outside React — the non-hook `useSocketMutation` (the
   * mutation cache entry, its callbacks and retry policy all apply; the plain `sendToServer` bypasses all of that). The
   * send queues until the connection claims, like every socket send.
   *
   * Client-side.
   *
   *     const { message } = await messageSendHandler.fetchSocketMutation({ text })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  fetchSocketMutation(
    ...args: TPointType extends 'serverHandler'
      ? [
          ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
          mutationOptions?: ExtraUseMutationOptions<TServerLoaderOutput, TError, InputRaw<TServerInputSchema>>,
        ]
      : never
  ): TPointType extends 'serverHandler' ? Promise<TServerLoaderOutput> : never
  fetchSocketMutation(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`fetchSocketMutation, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('mutation', 'fetchSocketMutation')
    return this._fetchSocketMutationInner({ target: undefined, input: args[0], mutationOptions: args[1] })
  }

  /**
   * The socket mutation's key — what `useSocketMutation` / `fetchSocketMutation` file their cache entries under.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketMutationKey(
    ...args: TPointType extends 'serverHandler' ? [] : never
  ): TPointType extends 'serverHandler' ? MutationKey : never
  getSocketMutationKey(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketMutationKey, point ${this.id}`)
    }
    void args
    this._assertServerHandlerFlavor('mutation', 'getSocketMutationKey')
    return this.getMutationKey()
  }

  /**
   * The resolved TanStack `MutationOptions` of the socket mutation (key, `mutationFn` over the resolved connection,
   * merged defaults) — ready to hand to `useMutation` / the mutation cache directly.
   *
   * Client-side — the `mutationFn` resolves the connection at mutate time.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketMutationOptions(
    ...args: TPointType extends 'serverHandler'
      ? [mutationOptions?: ExtraUseMutationOptions<TServerLoaderOutput, TError, InputRaw<TServerInputSchema>>]
      : never
  ): TPointType extends 'serverHandler'
    ? MutationOptions<TServerLoaderOutput, TError, InputRaw<TServerInputSchema>>
    : never
  getSocketMutationOptions(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketMutationOptions, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('mutation', 'getSocketMutationOptions')
    return this._getSocketMutationOptionsInner({ target: undefined, mutationOptions: args[0] })
  }

  /**
   * The single `Mutation` cache entry matching an exact input (`undefined` if none) — for inspecting a specific call's
   * state. For an array of matches use `getSocketMutationsCache`.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketMutationCache(
    ...args: TPointType extends 'serverHandler' ? ServerHandlerInputArgs<InputRaw<TServerInputSchema>> : never
  ): TPointType extends 'serverHandler'
    ? Mutation<TServerLoaderOutput, TError, InputRaw<TServerInputSchema>> | undefined
    : never
  getSocketMutationCache(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketMutationCache, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('mutation', 'getSocketMutationCache')
    // the socket mutation files under the same `{ scope, type, name }` mutation key — the regular finder matches it
    return (this.getMutationCache as (input: unknown) => unknown)(args[0])
  }

  /**
   * An array of `Mutation` cache entries of this handler — match by exact input (variables), a predicate over
   * variables, or `true` for all entries.
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  getSocketMutationsCache(
    ...args: TPointType extends 'serverHandler'
      ? [input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true]
      : never
  ): TPointType extends 'serverHandler'
    ? Array<Mutation<TServerLoaderOutput, TError, InputRaw<TServerInputSchema>>>
    : never
  getSocketMutationsCache(...args: any[]): any {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`getSocketMutationsCache, point ${this.id}`)
    }
    this._assertServerHandlerFlavor('mutation', 'getSocketMutationsCache')
    // same delegation as getSocketMutationCache — one predicate, one key shape
    return (this.getMutationsCache as (input: unknown) => unknown)(args[0])
  }

  /** The connect fetch used by the client runtime — the standard endpoint fetch, typed to the connect envelope. */
  async _fetchChannelConnect(
    input: unknown,
  ): Promise<{ data: ChannelConnectOutput | undefined; error: TError | undefined }> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_fetchChannelConnect, point ${this.id}`)
    }
    const result = await this._fetchServerDetailed({ input: input as never })
    return { data: result.data as ChannelConnectOutput | undefined, error: result.error }
  }

  /**
   * The ws:// URL of the cold-start upgrade-connect — the channel endpoint itself with the input riding `?input=` (the
   * WebSocket handshake is GET by spec, so this exists only while the input fits the same URL-length cap the query GET
   * fallback uses). `undefined` = take the ticket path: input too long, binary, or no resolvable base.
   */
  _getChannelConnectUpgradeUrl(input: unknown): string | undefined {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getChannelConnectUpgradeUrl, point ${this.id}`)
    }
    if (this.type !== 'channel' || !this._endpoint) {
      return undefined
    }
    if (isContainsBinary(input as Record<string, unknown> | undefined)) {
      return undefined
    }
    const base = this._getServerUrl() || (typeof location !== 'undefined' ? location.origin : undefined)
    if (!base) {
      return undefined
    }
    const transformer = this._getSocketTransformer()
    const transformed = transformer.serialize(input) as Record<string, unknown> | undefined
    const inputJson = JSON.stringify(transformed)
    const search: Record<string, string> = {
      ...(inputJson && inputJson !== '{}' ? { [POINT0_QUERY_GET_INPUT_SEARCH_PARAM]: inputJson } : {}),
      // browser JS cannot attach CUSTOM headers to the handshake GET (`new WebSocket(url)` exposes none), so the
      // transform fact rides the URL — the query twin of the `x-point0-transform` header the ticket fetch sends
      ...(transformer !== blankDataTransformerExtended ? { [POINT0_UPGRADE_TRANSFORM_SEARCH_PARAM]: 'true' } : {}),
    }
    const url = new URL(this._endpoint.route.get(Object.keys(search).length ? { '?': search } : undefined), base)
    if (url.toString().length > this._getQueryMaxUrlLength()) {
      return undefined
    }
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return url.toString()
  }

  /**
   * The channel options with defaults applied, chain → close — what the engine enforces limits from. The RESOLVED
   * (flat) shape: on the client bundle the `server` group was cut at compile time, so the caps below fall back to these
   * defaults there — harmless, since only the server ever reads them (the mirror holds for the client keys on the
   * server bundle).
   */
  _getChannelPointOptions(): Required<
    Pick<
      ChannelOptionsResolved<TError>,
      'maxMessageSize' | 'maxConnections' | 'linger' | 'ping' | 'connectionTtl' | 'upgradeTimeout' | 'resumeTimeout'
    >
  > & { resume: Required<ChannelResumeOptions> } & ChannelOptionsResolved<TError> {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getChannelPointOptions, point ${this.id}`)
    }
    return mergeChannelOptions(
      {
        reconnect: { delay: 300, maxDelay: 5000 },
        linger: 1000,
        ping: 30_000,
        upgradeTimeout: 5000,
        resumeTimeout: 5000,
        maxMessageSize: 1_048_576,
        maxConnections: 32,
        connectionTtl: 90_000,
        resume: { parkWindow: 30_000, streamMaxFrames: 1024, streamMaxBytes: 4_194_304 },
      },
      this._defaultChannelOptions,
      this._channelOptions,
    ) as never
  }

  /**
   * The space options with defaults applied, chain → close (RESOLVED, flat) — what the engine enforces the room cap
   * from.
   */
  _getSpacePointOptions(): Required<Pick<SpaceOptionsResolved, 'maxRooms' | 'linger'>> & SpaceOptionsResolved {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getSpacePointOptions, point ${this.id}`)
    }
    return mergeSpaceOptions(
      {
        linger: 1000,
        maxRooms: 256,
      },
      this._defaultSpaceOptions,
      this._spaceOptions,
    ) as never
  }

  /**
   * The clientHandler options resolved, chain → close (RESOLVED, flat) — what the engine reads the resume-buffer opt-in
   * (`resumable`) and the reply-collection window from.
   */
  _getClientHandlerPointOptions(): ClientHandlerOptionsResolved {
    if (!_point0_env.feature.socket) {
      throw socketFeatureOffError(`_getClientHandlerPointOptions, point ${this.id}`)
    }
    return mergeClientHandlerOptions(this._defaultClientHandlerOptions, this._clientHandlerOptions)
  }

  /**
   * Kick matching connections OUT OF ROOMS of this space from the server — a forced LEAVE, never a connection kill: the
   * matching rooms are removed, each client learns from a `left` frame, and the connections (and their other rooms)
   * live on. The one verb that revokes rooms — which is also how a server-side enrollment ends. The target is the
   * `$`-dictionary, parts AND-combined; a bare `kick()` empties every room of the space. A membership held by
   * `useMembership` / `<Membership>` replays its join through the reconnect policy, so the joiner rules on it afresh —
   * deny there (with `preventRetry` for a hard deny) and the rooms stay gone. Works across processes through the
   * backplane bus. Closing the whole connection instead is {@link kill}; kick's mirror is {@link enroll} (kick = a forced
   * leave, enroll = a forced join).
   *
   * Server-only — a runtime error on the client; space points only.
   *
   *     await chatSpace.kick({ room: { chatId: '5' } }) // "the room closed" — everyone out
   *     await chatSpace.kick({ room: { chatId: '5' }, $identity: { userId: '42' } }) // one user out of one room
   *     await chatSpace.kick({ $room: { workspaceId: '7' }, reason: 'workspace-archived' })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  kick(
    target?: TPointType extends 'space' ? SpaceAdminTarget<TRoom, TIdentity> & { reason?: string } : never,
  ): TPointType extends 'space' ? Promise<void> : never
  async kick(...args: any[]): Promise<void> {
    if (_point0_env.side.is.client) {
      throw new Error(`kick() is server-side (point ${this.id})`)
    }
    if (this.type !== 'space') {
      throw new Error(
        `kick() lives on space points only (a kick revokes rooms; to close connections use kill()), got ${this.toStringWithLocation()}`,
      )
    }
    const [target] = args as [(SpaceAdminTarget & { reason?: string }) | undefined]
    const { adapter, adminTarget } = this._resolveAdminTarget(target, 'kick')
    await adapter.kick({ ...adminTarget, reason: target?.reason })
  }

  /**
   * Enroll matching live connections of this space into rooms from the server — the imperative twin of `.enroller` and
   * the mirror of `space.kick` (kick = a forced leave, enroll = a forced join). The FIRST argument selects WHO (the
   * usual `$`-dictionary, parts AND-combined; bare = every connection of the channel; the room parts read "already in
   * these rooms"), the SECOND names the rooms to enroll them into. Each match's server-side enrollment grows by those
   * rooms and the client learns the new set from an `enrolled` frame — the rooms behave exactly like `.enroller` rooms
   * (hold-less, no client join behind them, and just as GUARANTEED: the client cannot `leave()` them; only
   * `space.kick`, a `refresh`, or the connection closing ends an enrollment). Works across processes through the
   * backplane bus.
   *
   * Lives as long as the CONNECTION does: a resume restores it — the guarantee holds across a socket blip — but a full
   * reconnect or a `refresh` rebuilds enrollments from `.enroller` alone. A durable enrollment is DATA: write the fact,
   * have `.enroller` read it — `enroll` is how the fact reaches the connections that are ALREADY live.
   *
   * Server-only — a runtime error on the client.
   *
   *     await notificationsSpace.enroll({ $identity: { userId: '42' } }, { threadId: 't1' })
   *     await chatSpace.enroll({ connectionId }, [{ chatId: '5' }, { chatId: '6' }])
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  enroll<
    // the third WRITE path for rooms — the same AssertRoomNotWider verdict as the `.joiner`/`.enroller` returns (an
    // extra key on a VARIABLE room would enroll into a room nothing ever pushes to). Unlike the joiner (a callback,
    // where the verdict needs its own inferred type parameter), a VALUE argument takes the verdict inline — and the
    // parameters are DIRECT (only the target rides the point-type conditional): inference cannot see through a
    // conditional args tuple, and an un-inferred verdict never fires
    TEnrollRoom extends TRoom | readonly TRoom[],
  >(
    target: TPointType extends 'space' ? SpaceAdminTarget<TRoom, TIdentity> | undefined : never,
    room: TEnrollRoom &
      AssertRoomNotWider<TEnrollRoom extends readonly (infer TElement)[] ? TElement : TEnrollRoom, TRoom>,
  ): TPointType extends 'space' ? Promise<void> : never
  async enroll(...args: any[]): Promise<void> {
    if (_point0_env.side.is.client) {
      throw new Error(`enroll() is server-side (point ${this.id})`)
    }
    const [target, room] = args as [SpaceAdminTarget | undefined, UnknownData | UnknownData[] | undefined]
    if (this.type !== 'space') {
      throw new Error(`enroll() lives on space points only, got ${this.toStringWithLocation()}`)
    }
    const roomsRaw = Point0._toArrayPart(room)
    if (!roomsRaw || roomsRaw.length === 0) {
      throw new Error(`enroll() needs the room(s) to enroll into as its second argument (point ${this.id})`)
    }
    const { adapter, adminTarget, roomTransformer } = this._resolveAdminTarget(target, 'enroll')
    const enrollRooms = [...new Set(roomsRaw.map((each) => stringifyOrThrow(roomTransformer!, each, this.id)))]
    await adapter.enroll({ ...adminTarget, enrollRooms })
  }

  /**
   * Ask matching live connections to re-run their connect request — the connector re-applies, the identity is rebuilt,
   * the socket stays up (the client also re-joins its spaces). The server-side "this user's identity changed" signal
   * (roles granted, plan changed). Same targeting as `kill` — on a SPACE point the room parts address the connections
   * HOLDING matching rooms (a room always belongs to connections, so any connection-level command can be sent "into a
   * room"); the refresh itself stays connection-level: the whole connect re-runs, enrollers included. Works across
   * processes through the backplane bus.
   *
   * Server-only — a runtime error on the client.
   *
   *     await chatChannel.refresh({ $identity: { userId: '42' } })
   *     await chatSpace.refresh({ room: { chatId: '5' } }) // re-judge everyone in the room
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  refresh(
    target?: TPointType extends 'space' ? SpaceAdminTarget<TRoom, TIdentity> : ChannelAdminTarget<TIdentity>,
  ): Promise<void>
  async refresh(...args: any[]): Promise<void> {
    if (_point0_env.side.is.client) {
      throw new Error(`refresh() is server-side (point ${this.id})`)
    }
    const [target] = args as [ChannelAdminTarget | SpaceAdminTarget | undefined]
    const { adapter, adminTarget } = this._resolveAdminTarget(target, 'refresh')
    await adapter.refresh(adminTarget)
  }

  /**
   * Close matching live connections from the server — remove them from their rooms, stop sending, notify each client
   * with a `closed` frame. What happens next follows the hold's nature: connections held by hooks/components
   * auto-revive through the reconnect policy (the connector re-judges), imperative `connect()` holders stay closed
   * until a remount or `reconnectAll()`. The target is the `$`-dictionary, parts AND-combined; a bare `kill()` closes
   * every connection of the channel. On a SPACE point the room parts address the connections HOLDING matching rooms —
   * the room always belongs to connections, so the connection-level kill can be sent "into a room" (where `space.kick`
   * only revokes the rooms and leaves the connections up). Works across processes through the backplane bus. A real ban
   * still belongs in the connector — it re-applies on every connect.
   *
   * Server-only — a runtime error on the client.
   *
   *     await chatChannel.kill({ $identity: { userId: '42' } })
   *     await chatChannel.kill({ connectionId, reason: 'signed-out' })
   *     await chatSpace.kill({ room: { chatId: '5' }, reason: 'chat-deleted' }) // everyone holding the room
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  kill(
    target?: (TPointType extends 'space' ? SpaceAdminTarget<TRoom, TIdentity> : ChannelAdminTarget<TIdentity>) & {
      reason?: string
    },
  ): Promise<void>
  async kill(...args: any[]): Promise<void> {
    if (_point0_env.side.is.client) {
      throw new Error(`kill() is server-side (point ${this.id})`)
    }
    const [target] = args as [((ChannelAdminTarget | SpaceAdminTarget) & { reason?: string }) | undefined]
    const { adapter, adminTarget } = this._resolveAdminTarget(target, 'kill')
    await adapter.kill({ ...adminTarget, reason: target?.reason })
  }

  /**
   * Shallow-merge a patch into the stored identity of matching connections — the server-side "this connection's DATA
   * changed" signal (a display name, a plan flag). It amends what selections and pushes match over; it does NOT
   * re-evaluate rights: rooms already granted stay granted (narrowed rights = add a `space.kick`; a full re-evaluation
   * = `refresh`). The client learns nothing — identity never leaves the server. The patch is a plain object (it travels
   * the backplane bus; a function cannot). A CONNECTORLESS channel has no amendable identity at all — its identity is
   * the strict `{}`, so `amendIdentity` on it is a compile error (`AssertIdentityAmendable`) and a runtime one (the
   * `_connectorDeclared` guard), never a silent identity growing keys the type never admitted.
   *
   * On a SPACE point the room parts address the connections HOLDING matching rooms — the same room addressing as
   * `space.refresh`/`space.kill`; the patch still amends the CHANNEL identity of those connections.
   *
   * Server-only — a runtime error on the client.
   *
   *     await chatChannel.amendIdentity({ $identity: { userId: '42' } }, { plan: 'pro' })
   *     await chatChannel.amendIdentity({ connectionId }, { displayName })
   *     await chatSpace.amendIdentity({ room: { chatId: '5' } }, { lastSeenChatId: '5' })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  amendIdentity(
    ...args: TPointType extends 'channel'
      ? [target: ChannelAdminTarget<TIdentity> & AssertIdentityAmendable<TIdentity>, patch: Partial<TIdentity>]
      : TPointType extends 'space'
        ? [target: SpaceAdminTarget<TRoom, TIdentity> & AssertIdentityAmendable<TIdentity>, patch: Partial<TIdentity>]
        : never
  ): TPointType extends 'channel' | 'space' ? Promise<void> : never
  async amendIdentity(...args: any[]): Promise<void> {
    if (_point0_env.side.is.client) {
      throw new Error(`amendIdentity() is server-side (point ${this.id})`)
    }
    const [target, patch] = args as [ChannelAdminTarget | SpaceAdminTarget | undefined, UnknownData | undefined]
    if (this.type !== 'channel' && this.type !== 'space') {
      throw new Error(`amendIdentity() lives on channel or space points only, got ${this.toStringWithLocation()}`)
    }
    // the runtime twin of `AssertIdentityAmendable` — the DECLARATION fact, never the runtime identity value (which
    // this very method could have grown behind the type's back before the guard existed). The identity always lives
    // on the CHANNEL — a space point checks (and names) its channel's declaration
    const identityOwner = this.type === 'space' ? this._channelPointOrThrow() : (this as AnyPoint)
    if (!identityOwner._connectorDeclared) {
      throw new Error(
        `amendIdentity() needs a connector-declared identity — a connectorless channel has nothing to amend (point ${identityOwner.id})`,
      )
    }
    const { adapter, adminTarget, transformer } = this._resolveAdminTarget(target, 'amendIdentity')
    await adapter.amendIdentity({
      ...adminTarget,
      patchSerialized: stringifyOrThrow(transformer, patch ?? {}, this.id),
    })
  }

  /**
   * The live-connection enumerations of this channel, in two FLOORS — `connections.server.*` reads the CLUSTER (every
   * process, over the backplane bus; each read is a snapshot over a gather window, default 1000 ms, and its `local`
   * sub-floor is this process alone, synchronously), `connections.client.*` reads THIS BROWSER TAB (the live connection
   * facades it holds, synchronously). Server targets are the `$`-dictionary; the client floor takes none — a bare call
   * is every live connection of this channel on this client.
   *
   * `connections.server.*` is server-only and `connections.client.*` client-only — the wrong side is a runtime error,
   * never a silent empty answer.
   *
   *     await appChannel.connections.server.count({ $identity: { plan: 'free' } }) // numbers-only on the bus
   *     const list = await appChannel.connections.server.list()
   *     for await (const { connectionId, identity } of appChannel.connections.server.forEach()) { ... }
   *     await appChannel.connections.server.forEach({}, { onConnection: async (c) => { ... } }) // → processed count
   *     appChannel.connections.server.local.count() // SYNCHRONOUS — this process only, no bus
   *     appChannel.connections.client.list() // SYNCHRONOUS — this tab's connection facades
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  get connections(): TPointType extends 'channel'
    ? ChannelConnectionsEnumeration<
        TIdentity,
        ClientChannelConnection<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          TError
        >
      >
    : never {
    this._connectionsEnumerationCache ??= this._buildEnumeration('connections')
    return this._connectionsEnumerationCache as never
  }
  private _connectionsEnumerationCache: unknown

  /**
   * The live-membership enumerations of this space — the same two floors as `channel.connections.*`, one level down.
   * `memberships.server.*` reads the cluster (items are `{ connectionId, identity, rooms }`; the target adds `room` —
   * exact snapshot(s), the presence read — and `$room`, a sift selection over rooms), `memberships.client.*` reads this
   * browser tab's live membership facades, ENROLLED ones included (which is how a space with no `.joiner` is read one
   * membership at a time).
   *
   * `memberships.server.*` is server-only and `memberships.client.*` client-only — the wrong side is a runtime error.
   *
   *     await chatSpace.memberships.server.count({ room: { chatId: '5' } }) // the presence counter
   *     const list = await chatSpace.memberships.server.list({ room })
   *     await chatSpace.memberships.server.forEach({ room }, { onMembership: async ({ connectionId }) => { ... } })
   *     chatSpace.memberships.server.local.rooms({ connectionId }) // SYNCHRONOUS local rooms — the join-guard read
   *     chatSpace.memberships.client.list() // SYNCHRONOUS — this tab's membership facades, enrolled included
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  get memberships(): TPointType extends 'space'
    ? SpaceMembershipsEnumeration<
        TRoom,
        TIdentity,
        ClientSpaceMembership<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          TRoom,
          TError,
          TChannelInput
        >
      >
    : never {
    this._membershipsEnumerationCache ??= this._buildEnumeration('memberships')
    return this._membershipsEnumerationCache as never
  }
  private _membershipsEnumerationCache: unknown

  /**
   * Build the `connections.*` / `memberships.*` namespace — the `server` floor's closures (plus its `local` sub-floor)
   * and the `client` floor's. Every guard runs at CALL time (the namespace object itself is built on any point the
   * getter is touched on).
   */
  private _buildEnumeration(kind: 'connections' | 'memberships'): {
    server: {
      count: (target?: unknown, options?: EnumerationOptions) => Promise<number>
      list: (target?: unknown, options?: EnumerationOptions) => Promise<unknown[]>
      forEach: (
        target?: unknown,
        options?: EnumerationOptions & {
          onConnection?: (item: never) => void | Promise<void>
          onMembership?: (item: never) => void | Promise<void>
        },
      ) => Promise<number> | AsyncIterable<unknown>
      // the synchronous local sub-floor — this process's slice, no bus/window/promise (see `LocalChannelConnectionsEnumeration`)
      local: {
        count: (target?: unknown) => number
        list: (target?: unknown) => unknown[]
        rooms: (target?: unknown) => unknown[]
      }
    }
    // the client floor — this tab's live facades, synchronous, no targets (see `ClientChannelConnectionsEnumeration`)
    client: {
      count: () => number
      list: () => unknown[]
      rooms?: () => unknown[]
    }
  } {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const point = this
    const assertKind = (): void => {
      const expectedType: PointType = kind === 'connections' ? 'channel' : 'space'
      if (point.type !== expectedType) {
        throw new Error(
          kind === 'connections'
            ? `connections.* lives on channel points only (a space enumerates memberships.*), got ${point.toStringWithLocation()}`
            : `memberships.* lives on space points only (a channel enumerates connections.*), got ${point.toStringWithLocation()}`,
        )
      }
    }
    // every SERVER-floor closure below opens with a LITERAL side guard, one by one rather than through a shared
    // helper: a call into a helper is not dead code to a bundler, an inline `throw` under a constant-folded condition
    // is — that is what lets an app's client build cut each body. The namespace object itself, `assertKind` and the
    // CLIENT floor stay guard-free: they run in the browser.
    const resolve = (target: unknown) => {
      if (_point0_env.side.is.client) {
        throw new Error(`${kind}.server.* is server-side (point ${point.id})`)
      }
      assertKind()
      return point._resolveAdminTarget(target as ChannelAdminTarget | SpaceAdminTarget | undefined, `${kind}.server.*`)
    }
    // the client floor's read: the live facades of this channel/space on THIS client, straight off the socket manager's
    // registries — no bus, no window, no promise, and no targets (a bare call is all of them)
    const clientFacades = (): unknown[] => {
      if (!_point0_env.feature.socket) {
        throw socketFeatureOffError(`${kind}.client.*, point ${point.id}`)
      }
      if (_point0_env.side.is.server) {
        throw new Error(
          kind === 'connections'
            ? `connections.client.* is client-side — nothing is ever connected on the server (point ${point.id})`
            : `memberships.client.* is client-side — nothing is ever joined on the server (point ${point.id})`,
        )
      }
      assertKind()
      return kind === 'connections'
        ? listChannelConnectionFacades(point as AnyPoint)
        : listSpaceMembershipFacades(point as AnyPoint)
    }
    const itemFromSnapshot = (
      snapshot: SocketConnectionSnapshot,
      transformer: DataTransformerExtended,
      roomTransformer: DataTransformerExtended | undefined,
    ): unknown => {
      if (_point0_env.side.is.client) {
        throw new Error(`${kind}.server.* is server-side (point ${point.id})`)
      }
      if (kind === 'memberships' && roomTransformer) {
        return {
          connectionId: snapshot.cid,
          identity: transformer.parse(snapshot.identity),
          rooms: (snapshot.spaces?.[point.name] ?? []).map((room) => roomTransformer.parse(room)),
        } satisfies SpaceMembershipListed
      }
      return {
        connectionId: snapshot.cid,
        identity: transformer.parse(snapshot.identity),
        spaces: snapshot.spacesParsed ?? {},
      } satisfies ChannelConnectionListed
    }
    return {
      server: {
        count: async (target, options) => {
          if (_point0_env.side.is.client) {
            throw new Error(`${kind}.server.* is server-side (point ${point.id})`)
          }
          const { adapter, adminTarget } = resolve(target)
          return await adapter.count({ ...adminTarget, timeoutMs: options?.timeout })
        },
        list: async (target, options) => {
          if (_point0_env.side.is.client) {
            throw new Error(`${kind}.server.* is server-side (point ${point.id})`)
          }
          const { adapter, adminTarget, transformer, roomTransformer } = resolve(target)
          const snapshots = await adapter.list({ ...adminTarget, timeoutMs: options?.timeout })
          return snapshots.map((snapshot) => itemFromSnapshot(snapshot, transformer, roomTransformer))
        },
        forEach: (target, options) => {
          if (_point0_env.side.is.client) {
            throw new Error(`${kind}.server.* is server-side (point ${point.id})`)
          }
          const { adapter, adminTarget, transformer, roomTransformer } = resolve(target)
          const callback = (kind === 'connections' ? options?.onConnection : options?.onMembership) as
            ((item: unknown) => void | Promise<void>) | undefined
          if (callback) {
            // the streaming-callback form: fire per item as it arrives, resolve with the processed count once the
            // window closed AND every callback settled (an async callback that throws is logged, still counted)
            return new Promise<number>((resolvePromise) => {
              let processed = 0
              const settled: Array<Promise<void>> = []
              adapter.forEach({
                ...adminTarget,
                timeoutMs: options?.timeout,
                onItem: (snapshot) => {
                  processed++
                  settled.push(
                    (async () => {
                      try {
                        await callback(itemFromSnapshot(snapshot, transformer, roomTransformer))
                      } catch (error) {
                        getLogFnForPoint(point)({
                          level: 'error',
                          category: ['point0', 'socket'],
                          message: `A ${kind}.forEach callback threw (point ${point.id})`,
                          error,
                        })
                      }
                    })(),
                  )
                },
                onDone: () => {
                  void Promise.all(settled).then(() => resolvePromise(processed))
                },
              })
            })
          }
          // the iterable form — buffer items as they arrive, end the iteration when the window closes
          const buffered: unknown[] = []
          let done = false
          const notifiers = new Set<() => void>()
          const notify = (): void => {
            for (const notifier of [...notifiers]) {
              notifier()
            }
          }
          adapter.forEach({
            ...adminTarget,
            timeoutMs: options?.timeout,
            onItem: (snapshot) => {
              buffered.push(itemFromSnapshot(snapshot, transformer, roomTransformer))
              notify()
            },
            onDone: () => {
              done = true
              notify()
            },
          })
          const iterable: AsyncIterable<unknown> = {
            [Symbol.asyncIterator]() {
              let index = 0
              return {
                next: async (): Promise<IteratorResult<unknown>> => {
                  for (;;) {
                    if (index < buffered.length) {
                      return { value: buffered[index++], done: false }
                    }
                    if (done) {
                      return { value: undefined, done: true }
                    }
                    await new Promise<void>((resolveNext) => {
                      const notifier = (): void => {
                        notifiers.delete(notifier)
                        resolveNext()
                      }
                      notifiers.add(notifier)
                    })
                  }
                },
              }
            },
          }
          return iterable
        },
        // the synchronous local floor: this process's matching slice, straight off the room index — no bus, no gather
        // window, no promise. The join path (joiner/enroller/guards) runs on the socket's process, so its local slice is
        // the full truth about the connection; elsewhere it is local only (the async count/list are the global truth).
        local: {
          count: (target) => {
            if (_point0_env.side.is.client) {
              throw new Error(`${kind}.server.* is server-side (point ${point.id})`)
            }
            const { adapter, adminTarget } = resolve(target)
            return adapter.localCount(adminTarget)
          },
          list: (target) => {
            if (_point0_env.side.is.client) {
              throw new Error(`${kind}.server.* is server-side (point ${point.id})`)
            }
            const { adapter, adminTarget, transformer, roomTransformer } = resolve(target)
            return adapter
              .localList(adminTarget)
              .map((snapshot) => itemFromSnapshot(snapshot, transformer, roomTransformer))
          },
          // memberships only (the type withholds it from a channel): the flat, deduped rooms the matching local
          // memberships hold — the join guard's `{ connectionId }` room read that replaced the per-callback `rooms()`
          rooms: (target) => {
            if (_point0_env.side.is.client) {
              throw new Error(`${kind}.server.* is server-side (point ${point.id})`)
            }
            const { adapter, adminTarget, transformer, roomTransformer } = resolve(target)
            const seen = new Set<string>()
            const rooms: unknown[] = []
            for (const snapshot of adapter.localList(adminTarget)) {
              const item = itemFromSnapshot(snapshot, transformer, roomTransformer) as SpaceMembershipListed
              for (const room of item.rooms) {
                const key = roomTransformer ? stringifyOrThrow(roomTransformer, room, this.id) : JSON.stringify(room)
                if (seen.has(key)) {
                  continue
                }
                seen.add(key)
                rooms.push(room)
              }
            }
            return rooms
          },
        },
      },
      // the client floor: this tab's live facades — synchronous, hold-less, no targets. Client-only: on the
      // server it throws (nothing is ever connected/joined there — the cluster picture is the `server` floor).
      client: {
        count: () => clientFacades().length,
        list: () => clientFacades(),
        // the per-ROOM view with provenance — spaces only (a channel has no rooms to view)
        ...(kind === 'memberships'
          ? {
              rooms: () => {
                if (!_point0_env.feature.socket) {
                  throw socketFeatureOffError(`memberships.client.rooms, point ${point.id}`)
                }
                if (_point0_env.side.is.server) {
                  throw new Error(
                    `memberships.client.* is client-side — nothing is ever joined on the server (point ${point.id})`,
                  )
                }
                assertKind()
                return listSpaceClientRooms(point as AnyPoint)
              },
            }
          : {}),
      },
    }
  }

  /**
   * Shared guard + serialization for the admin/enumeration surface. A CHANNEL point addresses connections (identity
   * matcher, its own transformer). A SPACE point addresses rooms of its channel: the identity matcher rides the CHANNEL
   * transformer (identity lives on the channel), the room parts the SPACE transformer. The `$`-rule maps straight onto
   * the wire: bare keys become exact address lists, `$`-keys become serialized sift matchers.
   */
  private _resolveAdminTarget(
    target: ChannelAdminTarget | SpaceAdminTarget | undefined,
    what: string,
  ): {
    adapter: SocketServerAdapter
    adminTarget: SocketAdminTarget
    /** the transformer for the identity (channel-side) — used to parse listed identities */
    transformer: DataTransformerExtended
    /** the space's transformer for rooms — present only for a space point */
    roomTransformer: DataTransformerExtended | undefined
  } {
    // FIRST — everything below is dead code in a client build (the app bundler cuts it), which is the point
    if (_point0_env.side.is.client) {
      throw new Error(`${what} is server-side (point ${this.id})`)
    }
    const isSpace = this.type === 'space'
    const isChannel = this.type === 'channel'
    if (!isSpace && !isChannel) {
      throw new Error(`${what} lives on channel or space points only, got ${this.toStringWithLocation()}`)
    }
    // for a space, identity lives on its channel; the space's own transformer serializes rooms
    const channel = isSpace ? this._channelPointOrThrow() : (this as AnyPoint)
    const adapter = getSocketServerAdapterOrThrow(this.scope, this.id)
    const identityTransformer = channel._getSocketTransformer()
    const roomTransformer = isSpace ? this._getSocketTransformer() : undefined
    const t = target as
      | {
          connectionId?: string | string[]
          $identity?: unknown
          room?: UnknownData | UnknownData[]
          $room?: unknown
        }
      | undefined
    if (t?.$identity !== undefined) {
      Point0._assertNoWhereOperator(t.$identity, this.id)
    }
    if (isSpace && t?.$room !== undefined) {
      Point0._assertNoWhereOperator(t.$room, this.id)
    }
    const rooms = isSpace ? Point0._toArrayPart(t?.room) : undefined
    return {
      adapter,
      transformer: identityTransformer,
      roomTransformer,
      adminTarget: {
        channel,
        ...(isSpace ? { space: this.name } : {}),
        matcher:
          t?.$identity === undefined ? undefined : stringifyOrThrow(identityTransformer, t.$identity, channel.id),
        roomMatcher:
          isSpace && t?.$room !== undefined && roomTransformer
            ? stringifyOrThrow(roomTransformer, t.$room, this.id)
            : undefined,
        rooms:
          rooms === undefined || !roomTransformer
            ? undefined
            : rooms.map((room) => stringifyOrThrow(roomTransformer, room, this.id)),
        connectionId: Point0._toArrayPart(t?.connectionId),
      },
    }
  }

  /** `$where` takes a function — it cannot travel the backplane bus and is an eval hole; reject it everywhere. */
  private static _assertNoWhereOperator(matcher: unknown, pointId: string): void {
    if (_point0_env.side.is.client) {
      throw new Error(`Matcher validation is server-side (point ${pointId})`)
    }
    if (!matcher || typeof matcher !== 'object') {
      return
    }
    for (const [key, value] of Object.entries(matcher)) {
      if (key === '$where') {
        throw new Error(`$where is not allowed in an identity/room matcher (point ${pointId})`)
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          Point0._assertNoWhereOperator(item, pointId)
        }
      } else {
        Point0._assertNoWhereOperator(value, pointId)
      }
    }
  }

  /**
   * Execute this serverHandler's `.serverReply` for one incoming socket message — the engine's dispatch entry. Parses
   * the input with `.clientSend`, runs the reply, emits the `pointHandler*` events, returns the serialized reply.
   * Throws the typed error on failure (the engine serializes it into the `sendErr` frame).
   *
   * `pointHandlerServerStart` fires ABOVE the `.clientSend` parse, so a refused input — the commonest refusal of all —
   * closes the family with `Settled`/`Error` like any other failure instead of throwing before anything was announced.
   * That is what makes the family's `input` the RAW send input, as in every other family (the fetch/query/mutation
   * events carry what the caller passed, unvalidated); the `.serverReply` callback and the `onBefore/AfterServerReply`
   * customizers still see the PARSED one.
   *
   * An imperative `reply()` SETTLES the message where it is called (`Settled`/`Success`, the envelope framed), so a
   * throw after it changes nothing the sender sees: it is logged and emitted as `pointHandlerServerLateError` — the
   * post-reply work failing is still a server-side failure an app's `.on('error')` must see.
   */
  async _executeServerReply({
    inputSerialized,
    room,
    identity,
    connectionId,
    messageId,
    points,
    sendReply,
  }: {
    inputSerialized: string | undefined
    /** the concrete room this message addresses (a space handler); `undefined` for a channel handler */
    room: unknown
    identity: unknown
    connectionId: string
    /** the server-generated message id — what `.serverReply` sees as `messageId` */
    messageId: string
    points: NiceServerPoints
    /** delivers an EARLY reply the moment the callback calls its imperative `reply()` — the engine frames it */
    sendReply?: (early: { dataSerialized: string | undefined } | { error: ErrorPoint0 }) => void
  }): Promise<{ dataSerialized: string | undefined; data: unknown; replied?: boolean }> {
    if (_point0_env.side.is.client) {
      throw new Error(`.serverReply execution is server-side (point ${this.id})`)
    }
    const replyFn = this._serverReplyFn
    if (!replyFn) {
      throw new this._Error(`Point ${this.id} has no .serverReply`, { status: 400 })
    }
    const transformer = this._getSocketTransformer()
    // the family's `input` is the RAW send input, like every other family's (the fetch/query/mutation events carry
    // what the caller passed, before any validation) — which is what lets the `Start` sit ABOVE the `.clientSend`
    // parse: a refused schema is the commonest refusal there is, and it settles the family (`Settled`/`Error`) instead
    // of dying silently before anything was ever announced
    const meta = { point: this.id, connection: connectionId }
    // the DESERIALIZE runs first, but a failure still OPENS the family before closing it: a payload that does not parse
    // at all is the frame a hostile client sends, and it must not be the one frame the events never see. Its `input` is
    // `undefined` because it genuinely is not knowable — every other path carries the raw one, as the rule above says
    const inputRaw = (() => {
      if (inputSerialized === undefined) {
        return {}
      }
      try {
        return transformer.parse(inputSerialized)
      } catch (error) {
        const unparseable = { input: undefined as unknown as InputRawUnknown, point: this, connectionId, identity }
        const parseError = this._Error.from(error)
        parseError.status ??= 400
        parseError.code ??= POINT0_ERROR_CODES_MAP.INPUT_PARSE_FAILED
        this._emit('pointHandlerServerStart', unparseable as never, meta)
        this._emit('pointHandlerServerSettled', { ...unparseable, output: undefined, error: parseError } as never, meta)
        this._emit('pointHandlerServerError', { ...unparseable, output: undefined, error: parseError } as never, meta)
        throw parseError
      }
    })()
    const eventData = {
      input: inputRaw as InputRawUnknown,
      point: this,
      connectionId,
      identity,
    }
    this._emit('pointHandlerServerStart', eventData as never, meta)
    const input = (() => {
      if (!this._clientSendSchema) {
        return inputRaw
      }
      const parsed = this.parseInputSafeSync(this._clientSendSchema, inputRaw as never)
      if (!parsed.success) {
        parsed.error.status ??= 400
        const parseError = this._Error.from(parsed.error)
        this._emit('pointHandlerServerSettled', { ...eventData, output: undefined, error: parseError } as never, meta)
        this._emit('pointHandlerServerError', { ...eventData, output: undefined, error: parseError } as never, meta)
        throw parseError
      }
      return parsed.data
    })()
    // the server-side customizers (chain → closer, callbacks stacked in order): the BEFORE guard may refuse the
    // message (throw → sendErr, the reply never runs); AFTER observes the settled reply and never affects it
    const serverHandlerOptions = mergeServerHandlerOptions(
      this._defaultServerHandlerOptions,
      this._serverHandlerOptions,
    ) as {
      onBeforeServerReply?: (input: unknown) => unknown
      onAfterServerReply?: (input: unknown) => unknown
    }
    // room rides the callback input only for a space handler (`undefined` = a channel handler, no room prop)
    const roomPart = room !== undefined ? { room } : {}
    const customizerBase = {
      input,
      identity,
      connectionId,
      messageId,
      point: this,
      points,
      ...roomPart,
    }
    const runAfterServerReply = (output: unknown, error: ErrorPoint0 | undefined): void => {
      const callback = serverHandlerOptions.onAfterServerReply
      if (!callback) {
        return
      }
      void (async () => {
        try {
          await callback({ ...customizerBase, output, error })
        } catch (callbackError) {
          getLogFnForPoint(this)({
            level: 'error',
            category: ['point0', 'socket'],
            message: `An onAfterServerReply callback threw (point ${this.id})`,
            error: callbackError,
          })
        }
      })()
    }
    // the imperative reply (`.serverReply<T>()`'s `reply`): answer now, keep running. First call wins — it emits the
    // events and frames the envelope through `sendReply`; everything after it (later calls, the return, a throw) no
    // longer reaches the client. (A ref, not a `let` — the mutation happens inside the closure, past narrowing.)
    const repliedRef = { current: false }
    const replyImperative = (data: unknown): void => {
      if (repliedRef.current) {
        getLogFnForPoint(this)({
          level: 'warn',
          category: ['point0', 'socket'],
          message: `reply() called more than once — the reply already left (point ${this.id})`,
        })
        return
      }
      repliedRef.current = true
      if (data instanceof Error) {
        const error0 = this._Error.from(data)
        this._emit('pointHandlerServerSettled', { ...eventData, output: undefined, error: error0 } as never, meta)
        this._emit('pointHandlerServerError', { ...eventData, output: undefined, error: error0 } as never, meta)
        runAfterServerReply(undefined, error0)
        sendReply?.({ error: error0 })
        return
      }
      this._emit('pointHandlerServerSettled', { ...eventData, output: data, error: undefined } as never, meta)
      this._emit('pointHandlerServerSuccess', { ...eventData, output: data, error: undefined } as never, meta)
      runAfterServerReply(data, undefined)
      sendReply?.({ dataSerialized: data === undefined ? undefined : stringifyOrThrow(transformer, data, this.id) })
    }
    try {
      await serverHandlerOptions.onBeforeServerReply?.(customizerBase)
      const output = await replyFn({
        input,
        identity,
        connectionId,
        messageId,
        reply: replyImperative,
        points,
        ...roomPart,
      } as never)
      if (repliedRef.current) {
        // the imperative reply already answered (events included) — the return is ignored by contract
        return { dataSerialized: undefined, data: undefined, replied: true }
      }
      this._emit('pointHandlerServerSettled', { ...eventData, output, error: undefined } as never, meta)
      this._emit('pointHandlerServerSuccess', { ...eventData, output, error: undefined } as never, meta)
      runAfterServerReply(output, undefined)
      return {
        dataSerialized: output === undefined ? undefined : stringifyOrThrow(transformer, output, this.id),
        data: output,
      }
    } catch (error) {
      if (repliedRef.current) {
        // the client already has its answer — the late failure is the server's business only: it is logged and emitted
        // as `pointHandlerServerLateError` (never re-settled — the operation succeeded from the sender's side, and
        // `onAfterServerReply` already ran with the replied output)
        const error0 = this._Error.from(error)
        getLogFnForPoint(this)({
          level: 'error',
          category: ['point0', 'socket'],
          message: `.serverReply threw after reply() was already sent (point ${this.id})`,
          error,
        })
        this._emit('pointHandlerServerLateError', { ...eventData, error: error0 } as never, meta)
        return { dataSerialized: undefined, data: undefined, replied: true }
      }
      const error0 = this._Error.from(error)
      this._emit('pointHandlerServerSettled', { ...eventData, output: undefined, error: error0 } as never, meta)
      this._emit('pointHandlerServerError', { ...eventData, output: undefined, error: error0 } as never, meta)
      runAfterServerReply(undefined, error0)
      throw error0
    }
  }

  /**
   * Execute this space's `.joiner` for one incoming `join` frame — the engine's join entry. Refuses outright when the
   * space declares no `.joiner` (a `POINT0_SOCKET_JOIN_NOT_ALLOWED` typed error, before the guards run: such a space is
   * server-enrolled only). Otherwise parses the input with the space transformer, validates it through the space's
   * `.input` schema (a 400-coded typed error on failure), runs the joiner, normalizes the return (one room | array |
   * nothing) into a deduped, serialized room list, and returns the rooms (parsed + serialized) plus the validated
   * `input`. Throws the typed error on failure (the engine frames it into a `joinErr`).
   *
   * Events: `pointSpaceJoinServerStart` fires here, before the run — and above the `.input` parse, so a refused input
   * closes the family with `Settled`/`Error` instead of dying silently; a throw emits `Settled`/`Error` here too. The
   * SUCCESS pair does NOT fire here — the engine emits it (`_emitSpaceJoinSettled`, the returned `input` is what it
   * needs) once the rooms are registered, so the event means "the join is done". The family's `input` is therefore the
   * RAW join input, like every other family's; the `.joiner` and its guards see the parsed one.
   */
  async _executeJoiner({
    inputSerialized,
    identity,
    connectionId,
    points,
  }: {
    inputSerialized: string | undefined
    identity: unknown
    connectionId: string
    points: NiceServerPoints
  }): Promise<{ rooms: unknown[]; roomsSerialized: string[]; input: InputRawUnknown }> {
    if (_point0_env.side.is.client) {
      throw new Error(`.joiner execution is server-side (point ${this.id})`)
    }
    if (this.type !== 'space') {
      throw new this._Error(`Point ${this.id} is not a space — join runs on space points`, { status: 400 })
    }
    // no `.joiner` — the space takes no client joins at all. The server puts connections into it itself (`.enroller`
    // at connection setup, `space.enroll()` imperatively), so a join frame is refused before anything runs: no input
    // parse, no guards, no events. The client refuses the same join locally (`_joinerDeclared`); this is the wire-side
    // half of the same rule — a space whose rooms the server chooses must never take a room the client authored.
    if (!this._joinerFn) {
      throw new this._Error(`Space ${this.id} takes no client joins — it declares no .joiner`, {
        status: 403,
        code: POINT0_ERROR_CODES_MAP.SOCKET_JOIN_NOT_ALLOWED,
        meta: { point: this.id },
      })
    }
    const transformer = this._getSocketTransformer()
    // the family's `input` is the RAW join input, like every other family's — so the `Start` sits ABOVE the `.input`
    // parse and a refused schema (the commonest refusal) closes the family instead of vanishing before it opened. A
    // payload that does not DESERIALIZE has no raw input to carry, and it is the frame a hostile client sends — so it
    // opens the family and closes it in one breath, with `input: undefined`, rather than being the one frame the
    // events never see
    const meta = { point: this.id, connection: connectionId }
    const inputRaw = (() => {
      if (inputSerialized === undefined) {
        return {}
      }
      try {
        return transformer.parse(inputSerialized)
      } catch (error) {
        const unparseable = { input: undefined as unknown as InputRawUnknown, point: this, connectionId, identity }
        const parseError = this._Error.from(error)
        parseError.status ??= 400
        parseError.code ??= POINT0_ERROR_CODES_MAP.INPUT_PARSE_FAILED
        this._emit('pointSpaceJoinServerStart', { ...unparseable, resumed: false } as never, meta)
        this._emit(
          'pointSpaceJoinServerSettled',
          { ...unparseable, rooms: undefined, error: parseError } as never,
          meta,
        )
        this._emit('pointSpaceJoinServerError', { ...unparseable, rooms: undefined, error: parseError } as never, meta)
        throw parseError
      }
    })()
    const eventData = {
      input: inputRaw as InputRawUnknown,
      point: this,
      connectionId,
      // the server side of the universal family carries the identity — presence recipes key off it
      identity,
    }
    // a real joiner run, never a resume re-announce (those are emitted by the engine's unpark/restore paths)
    this._emit('pointSpaceJoinServerStart', { ...eventData, resumed: false } as never, meta)
    // the space keeps its `.input` schema(s) in the server execute actions (the joiner-side validation) — parse each,
    // same 400-coded pattern as `_executeServerReply`'s clientSend parse
    let input = inputRaw
    for (const action of this._serverExecuteActions) {
      if (action.type !== 'input') {
        continue
      }
      const parsed = this.parseInputSafeSync(action.schema, input as never)
      if (!parsed.success) {
        parsed.error.status ??= 400
        const parseError = this._Error.from(parsed.error)
        this._emit('pointSpaceJoinServerSettled', { ...eventData, rooms: undefined, error: parseError } as never, meta)
        this._emit('pointSpaceJoinServerError', { ...eventData, rooms: undefined, error: parseError } as never, meta)
        throw parseError
      }
      input = parsed.data
    }
    // the join guards (chain `.spaceOptions()` → the closing `.space({...})`, callbacks stacked in order): the BEFORE
    // guard may refuse the join (throw → joinErr, the joiner never runs); AFTER observes the settled join
    const spaceOptions = mergeSpaceOptions(this._defaultSpaceOptions, this._spaceOptions)
    const guardBase = { input, identity, connectionId, point: this, points }
    const runAfterJoiner = (output: unknown[] | undefined, error: ErrorPoint0 | undefined): void => {
      const callback = spaceOptions.onAfterJoiner
      if (!callback) {
        return
      }
      void (async () => {
        try {
          await callback({ ...guardBase, output, error } as never)
        } catch (callbackError) {
          getLogFnForPoint(this)({
            level: 'error',
            category: ['point0', 'socket'],
            message: `An onAfterJoiner callback threw (point ${this.id})`,
            error: callbackError,
          })
        }
      })()
    }
    try {
      await spaceOptions.onBeforeJoiner?.(guardBase as never)
      const output = await this._joinerFn({ input, identity, connectionId, points })
      const { rooms, roomsSerialized } = this._normalizeRooms(output)
      // no Settled/Success emit here — the caller fires it through `_emitSpaceJoinSettled` after the rooms are in the
      // participation and the room index; a handler on `pointSpaceJoinServerSuccess` must see the joiner in the room
      runAfterJoiner(rooms, undefined)
      return { rooms, roomsSerialized, input: eventData.input }
    } catch (error) {
      const error0 = this._Error.from(error)
      this._emit('pointSpaceJoinServerSettled', { ...eventData, rooms: undefined, error: error0 } as never, meta)
      this._emit('pointSpaceJoinServerError', { ...eventData, rooms: undefined, error: error0 } as never, meta)
      runAfterJoiner(undefined, error0)
      throw error0
    }
  }

  /** Normalize a joiner/enroller return (one room | array | undefined/void) into a deduped, serialized room list. */
  private _normalizeRooms(output: unknown): { rooms: unknown[]; roomsSerialized: string[] } {
    if (_point0_env.side.is.client) {
      throw new Error(`Room normalization is server-side (point ${this.id})`)
    }
    const transformer = this._getSocketTransformer()
    const roomsList = output === undefined || output === null ? [] : Array.isArray(output) ? output : [output]
    const rooms: unknown[] = []
    const roomsSerialized: string[] = []
    const seen = new Set<string>()
    for (const room of roomsList) {
      const serialized = stringifyOrThrow(transformer, room, this.id)
      if (seen.has(serialized)) {
        continue
      }
      seen.add(serialized)
      rooms.push(room)
      roomsSerialized.push(serialized)
    }
    return { rooms, roomsSerialized }
  }

  /**
   * Execute this space's `.enroller` for one fresh connection — the engine's connection-setup entry (both connect
   * paths). Runs the enroller with the frozen identity and normalizes the return into a deduped, serialized room list
   * (the engine installs the membership and subscribes the topics). An enrollment IS a join, server-initiated, so it
   * rides the same `pointSpaceJoin*` family with an empty input (and the later `pointSpaceLeaveServer` has its opening
   * pair): `Start` fires here, a throw emits `Settled`/`Error` here, and the engine emits the SUCCESS pair
   * (`_emitSpaceJoinSettled`) after it registered the rooms. Returns `{ rooms: [], roomsSerialized: [] }` when the
   * space has no `.enroller`. A throw fails the CONNECTION setup (the engine answers `claimErr`) — a connection missing
   * its enrolled rooms would drop pushes silently.
   */
  async _executeEnroller({
    identity,
    connectionId,
    points,
  }: {
    identity: unknown
    connectionId: string
    points: NiceServerPoints
  }): Promise<{ rooms: unknown[]; roomsSerialized: string[] }> {
    if (_point0_env.side.is.client) {
      throw new Error(`.enroller execution is server-side (point ${this.id})`)
    }
    if (this.type !== 'space') {
      throw new this._Error(`Point ${this.id} is not a space — enrollment runs on space points`, {
        status: 400,
      })
    }
    if (!this._enrollerFn) {
      return { rooms: [], roomsSerialized: [] }
    }
    const eventData = {
      input: {} as InputRawUnknown,
      point: this,
      connectionId,
      identity,
    }
    const meta = { point: this.id, connection: connectionId }
    // a real enroller run, never a resume re-announce (those are emitted by the engine's unpark/restore paths)
    this._emit('pointSpaceJoinServerStart', { ...eventData, resumed: false } as never, meta)
    try {
      const output = await this._enrollerFn({ identity, connectionId, points })
      const { rooms, roomsSerialized } = this._normalizeRooms(output)
      // same as `_executeJoiner`: the Settled/Success pair belongs after the engine's `addRoomsToEntry`
      return { rooms, roomsSerialized }
    } catch (error) {
      const error0 = this._Error.from(error)
      this._emit('pointSpaceJoinServerSettled', { ...eventData, rooms: undefined, error: error0 } as never, meta)
      this._emit('pointSpaceJoinServerError', { ...eventData, rooms: undefined, error: error0 } as never, meta)
      throw error0
    }
  }

  /**
   * Close the `pointSpaceJoinServer*` family from the ENGINE's side — `Settled` then `Success` (or `Settled` then
   * `Error` when the engine refused the join after the run). Deliberately NOT emitted inside
   * `_executeJoiner`/`_executeEnroller`: the engine calls this right after it registered the rooms (`addRoomsToEntry` —
   * participation, index, topics), so a handler on `pointSpaceJoinServerSuccess` reading
   * `space.memberships.server.list({ room })` SEES the connection that just joined — that is the presence recipe, and
   * it is symmetric with `pointSpaceLeaveServer`, which fires after the removal. A join the engine REFUSES after the
   * run (`maxRooms`, the socket dying mid-join) closes the family with the `error` variant — a `Start` never dangles.
   *
   * `input` is the join input; an enrollment — a server-initiated join, `.enroller` or the imperative `space.enroll` —
   * has none, and the empty object is what its events carry.
   *
   * `resumed: true` marks a resume RE-ANNOUNCE (the engine's unpark/restore paths re-enter the restored rooms through
   * the same family) — no `.joiner`/`.enroller` ran for it. The default is the real-join truth: `false`.
   */
  _emitSpaceJoinSettled({
    rooms,
    identity,
    connectionId,
    input = {},
    error,
    resumed = false,
  }: {
    rooms: unknown[] | undefined
    identity: unknown
    connectionId: string
    input?: InputRawUnknown
    error?: ErrorPoint0
    resumed?: boolean
  }): void {
    if (_point0_env.side.is.client) {
      throw new Error(`The server-side space-join events are server-side (point ${this.id})`)
    }
    const meta = { point: this.id, connection: connectionId }
    if (error) {
      // mirrors the throw path inside `_executeJoiner` — rooms undefined, the typed error on both events; an errored
      // join is never a resume, so the error side carries no `resumed`
      const eventData = { input, point: this, connectionId, identity, rooms: undefined, error }
      this._emit('pointSpaceJoinServerSettled', eventData as never, meta)
      this._emit('pointSpaceJoinServerError', eventData as never, meta)
      return
    }
    const eventData = { input, point: this, connectionId, identity, resumed, rooms, error: undefined }
    this._emit('pointSpaceJoinServerSettled', eventData as never, meta)
    this._emit('pointSpaceJoinServerSuccess', eventData as never, meta)
  }

  action<TNewServerLoaderOutput extends LoaderOutput = LoaderOutput>(
    loaderFn: LoaderFn<
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  /**
   * Close an action point: a real HTTP endpoint with a method and path you choose (`.action('GET', '/api/health')`),
   * and — unlike a query — the freedom to return a native `Response`. Reach for it for webhooks, REST-ish endpoints, or
   * raw bytes; otherwise prefer a query/mutation, which give caching at a framework URL for free. Needs a server
   * `.loader()`. `action.route` is callable like any other route.
   *
   * Server-only — the action's server fn (and its loader body) is stripped from the client bundle (runs server-side);
   * the route stays callable from the client.
   *
   *     export const healthAction = root.lets.action('GET', '/api/health').action(() => new Response('OK'))
   *
   * Full reference: https://1gr14.dev/point0/latest/action
   */
  action(
    ...args: TQueryResultType extends 'subscription'
      ? [
          ShowError<`This action's .loader is an async generator — a stream closes with .subscription(), .action() cannot`>,
        ]
      : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends LoaderOutput
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  action(...args: any[]) {
    const [loaderFn] = args as [LoaderFn<any, any, any, any, any, any, any, any, any, any, any> | undefined]
    const point = this._continue({
      type: 'action',
      _letsReadyPointType: undefined,
      _hasServerLoader: true,
      ...(loaderFn
        ? {
            _serverExecuteActions: [
              ...this._serverExecuteActions,
              { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
            ],
          }
        : {}),
    })
    return point as never
  }

  /**
   * Runtime half of the HMR boundary trick. The compiler appends `._tail(function X() { return null })` to EVERY point
   * chain (see `Point.addHmrFix` in @point0/compiler). That `function X` is a source-level decoy: its only job is to
   * make the module statically look like it exports a React component, which is what makes Bun's / Vite's Fast Refresh
   * accept a point file as a hot-reload boundary. The real runtime export is decided here:
   *
   * - Mountable points already expose their decorated mount component as `this.X` (set by `.component()` / `.provider()`
   *   / `.page()` / `.layout()`), so we return that and discard the decoy — this is what makes `<MyComponent />` /
   *   `<MyProvider />` render the full point.
   * - Non-mountable points have no mount component, so the decoy itself becomes the (boundary-only) export, decorated
   *   with the point's methods.
   */
  _tail(decoy: React.Component): typeof this {
    // handler points export their callable binder — same function the closer returned, the decoy stays a decoy
    if (this.type === 'serverHandler' || this.type === 'clientHandler') {
      return this._getCallableHandler() as never
    }
    if (this.X) {
      return this.X as never
    }
    Point0._assignNicePointMethodsToComponent({ component: decoy, point: this, extra: {} })
    return decoy as never
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
      tags: point.tags,
      lets: point.lets.bind(point),

      getQueryKey: point.getQueryKey.bind(point),
      getQueryOptions: point.getQueryOptions.bind(point),
      useQuery: point.useQuery.bind(point),
      useSuspenseQuery: point.useSuspenseQuery.bind(point),
      prefetchQuery: point.prefetchQuery.bind(point),
      fetchQuery: point.fetchQuery.bind(point),
      getQueryData: point.getQueryData.bind(point),
      ensureQueryData: point.ensureQueryData.bind(point),
      refetchQuery: point.refetchQuery.bind(point),
      setQueryData: point.setQueryData.bind(point),
      getQueryCache: point.getQueryCache.bind(point),
      getQueriesCache: point.getQueriesCache.bind(point),
      getQueryState: point.getQueryState.bind(point),
      cancelQuery: point.cancelQuery.bind(point),
      invalidateQuery: point.invalidateQuery.bind(point),
      removeQuery: point.removeQuery.bind(point),
      resetQuery: point.resetQuery.bind(point),

      getInfiniteQueryKey: point.getInfiniteQueryKey.bind(point),
      getInfiniteQueryOptions: point.getInfiniteQueryOptions.bind(point),
      useInfiniteQuery: point.useInfiniteQuery.bind(point),
      useSuspenseInfiniteQuery: point.useSuspenseInfiniteQuery.bind(point),
      prefetchInfiniteQuery: point.prefetchInfiniteQuery.bind(point),
      fetchInfiniteQuery: point.fetchInfiniteQuery.bind(point),
      getInfiniteQueryData: point.getInfiniteQueryData.bind(point),
      ensureInfiniteQueryData: point.ensureInfiniteQueryData.bind(point),
      refetchInfiniteQuery: point.refetchInfiniteQuery.bind(point),
      setInfiniteQueryData: point.setInfiniteQueryData.bind(point),
      getInfiniteQueryCache: point.getInfiniteQueryCache.bind(point),
      getInfiniteQueriesCache: point.getInfiniteQueriesCache.bind(point),
      getInfiniteQueryState: point.getInfiniteQueryState.bind(point),
      cancelInfiniteQuery: point.cancelInfiniteQuery.bind(point),
      invalidateInfiniteQuery: point.invalidateInfiniteQuery.bind(point),
      removeInfiniteQuery: point.removeInfiniteQuery.bind(point),
      resetInfiniteQuery: point.resetInfiniteQuery.bind(point),

      getMutationOptions: point.getMutationOptions.bind(point),
      getMutationKey: point.getMutationKey.bind(point),
      getMutationCache: point.getMutationCache.bind(point),
      getMutationsCache: point.getMutationsCache.bind(point),
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
      getValueOrUndefined: point.getValueOrUndefined.bind(point),

      // socket — the channel's connection surface and the handlers' messaging surface
      useConnection: point.useConnection.bind(point),
      connect: point.connect.bind(point),
      Connection: point.Connection, // a class-field arrow — already closed over the point instance
      kick: point.kick.bind(point),
      kill: point.kill.bind(point),
      refresh: point.refresh.bind(point),
      amendIdentity: point.amendIdentity.bind(point),
      enroll: point.enroll.bind(point),
      // the enumeration namespaces are objects of closures over the point — no bind needed
      connections: point.connections,
      memberships: point.memberships,
      sendToServer: point.sendToServer.bind(point),
      sendToClient: point.sendToClient.bind(point),
      useOnMessageFromServer: point.useOnMessageFromServer.bind(point),
      onMessageFromServer: point.onMessageFromServer.bind(point),
      useSocketQuery: point.useSocketQuery.bind(point),
      useSuspenseSocketQuery: point.useSuspenseSocketQuery.bind(point),
      useSocketInfiniteQuery: point.useSocketInfiniteQuery.bind(point),
      useSuspenseSocketInfiniteQuery: point.useSuspenseSocketInfiniteQuery.bind(point),
      useSocketMutation: point.useSocketMutation.bind(point),
      fetchSocketQuery: point.fetchSocketQuery.bind(point),
      fetchSocketInfiniteQuery: point.fetchSocketInfiniteQuery.bind(point),
      prefetchSocketQuery: point.prefetchSocketQuery.bind(point),
      prefetchSocketInfiniteQuery: point.prefetchSocketInfiniteQuery.bind(point),
      ensureSocketQueryData: point.ensureSocketQueryData.bind(point),
      ensureSocketInfiniteQueryData: point.ensureSocketInfiniteQueryData.bind(point),
      getSocketQueryOptions: point.getSocketQueryOptions.bind(point),
      getSocketInfiniteQueryOptions: point.getSocketInfiniteQueryOptions.bind(point),
      getSocketQueryKey: point.getSocketQueryKey.bind(point),
      getSocketInfiniteQueryKey: point.getSocketInfiniteQueryKey.bind(point),
      getSocketQueryData: point.getSocketQueryData.bind(point),
      getSocketInfiniteQueryData: point.getSocketInfiniteQueryData.bind(point),
      setSocketQueryData: point.setSocketQueryData.bind(point),
      setSocketInfiniteQueryData: point.setSocketInfiniteQueryData.bind(point),
      getSocketQueryState: point.getSocketQueryState.bind(point),
      getSocketInfiniteQueryState: point.getSocketInfiniteQueryState.bind(point),
      getSocketQueryCache: point.getSocketQueryCache.bind(point),
      getSocketInfiniteQueryCache: point.getSocketInfiniteQueryCache.bind(point),
      getSocketQueriesCache: point.getSocketQueriesCache.bind(point),
      getSocketInfiniteQueriesCache: point.getSocketInfiniteQueriesCache.bind(point),
      refetchSocketQuery: point.refetchSocketQuery.bind(point),
      refetchSocketInfiniteQuery: point.refetchSocketInfiniteQuery.bind(point),
      invalidateSocketQuery: point.invalidateSocketQuery.bind(point),
      invalidateSocketInfiniteQuery: point.invalidateSocketInfiniteQuery.bind(point),
      cancelSocketQuery: point.cancelSocketQuery.bind(point),
      cancelSocketInfiniteQuery: point.cancelSocketInfiniteQuery.bind(point),
      removeSocketQuery: point.removeSocketQuery.bind(point),
      removeSocketInfiniteQuery: point.removeSocketInfiniteQuery.bind(point),
      resetSocketQuery: point.resetSocketQuery.bind(point),
      resetSocketInfiniteQuery: point.resetSocketInfiniteQuery.bind(point),
      fetchSocketMutation: point.fetchSocketMutation.bind(point),
      getSocketMutationKey: point.getSocketMutationKey.bind(point),
      getSocketMutationOptions: point.getSocketMutationOptions.bind(point),
      getSocketMutationCache: point.getSocketMutationCache.bind(point),
      getSocketMutationsCache: point.getSocketMutationsCache.bind(point),
      iterateMessagesFromServer: point.iterateMessagesFromServer.bind(point),
      useSubscription: point.useSubscription.bind(point),
      fetchSubscription: point.fetchSubscription.bind(point),

      // socket — the space's membership surface
      useMembership: point.useMembership.bind(point),
      join: point.join.bind(point),
      Membership: point.Membership, // a class-field arrow — already closed over the point instance
      getMembership: point.getMembership.bind(point),
      getMembershipOrUndefined: point.getMembershipOrUndefined.bind(point),

      route: point.route,
      _tail: point._tail.bind(point),
      ...extra,
    })
  }

  private static _isMountablePointType(pointType: PointType): boolean {
    return pointType === 'page' || pointType === 'layout' || pointType === 'component' || pointType === 'provider'
  }
  private _isMountablePoint(): boolean {
    return Point0._isMountablePointType(this._letsReadyPointType || this.type)
  }
  private _isMountableQueryShouldBeFinalized(): boolean {
    return this._isMountablePoint() && this.type === 'loadedStage'
  }

  private _usesQueryTransportCache: boolean | undefined
  /**
   * Whether this point rides the query transport — a read whose JSON input travels as the `?input=` search param on a
   * GET with a POST-body fallback (see {@link _getFetchServerOptions}), the endpoint registered under BOTH methods (its
   * `_endpoint.methods`). The kind list is the shared {@link pointTypeUsesQueryTransport} — one source of truth with the
   * engine and the compiler. Constant per point — computed once and memoized.
   */
  _usesQueryTransport(): boolean {
    return (this._usesQueryTransportCache ??= pointTypeUsesQueryTransport(this.type))
  }

  /**
   * Is this point an HTTP-stream subscription — a `.lets.subscription()` point, or an action whose generator loader
   * closed with `.subscription()`? The FLAVOR (`_queryResultType`) marks the stream; the action keeps `type: 'action'`
   * exactly as `.query()`/`.mutation()` closers keep it. Only these two forms exist — sockets have no subscription
   * anything (a clientHandler's pushes ride `iterateMessagesFromServer` / the listeners).
   */
  _isHttpSubscription(): boolean {
    return this.type === 'subscription' || (this.type === 'action' && this._queryResultType === 'subscription')
  }

  private _queryMaxUrlLength: number | undefined
  /**
   * The GET-URL length cap for query endpoints: the `POINT0_QUERY_GET_MAX_URL_LENGTH` env override when it's a positive
   * number, else a conservative 2000 — enough to survive proxy/CDN request-line and header caps (nginx's 8k default,
   * common CDN limits). A query input whose GET URL would overflow this rides in a POST body instead. Resolved once and
   * memoized; only ever runs on the client, since server-side query fetches always POST.
   */
  private _getQueryMaxUrlLength(): number {
    return (this._queryMaxUrlLength ??= (() => {
      const override = Number(_point0_env.vars.POINT0_QUERY_GET_MAX_URL_LENGTH)
      return Number.isFinite(override) && override > 0 ? override : 2000
    })())
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
      // channel/space render as components (`<channel.Connection>` / `<space.Membership>`)
      channel: 'component' as const,
      space: 'component' as const,
    }[this.type as RenderablePointType]
  }

  _hasClientLoader(): boolean {
    return this._clientExecuteActions.length > 0 && this._clientExecuteActions.some((fn) => fn.type === 'loader')
  }

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
  //   // it breaks HMR in bun (but ok in vite), lets set function CompoentName via compiler
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
          { code: POINT0_ERROR_CODES_MAP.INPUT_SCHEMA_PROMISE_NOT_ALLOWED, meta: { point: this.id } },
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
            code: POINT0_ERROR_CODES_MAP.INPUT_SCHEMA_UNKNOWN,
            meta: { point: this.id },
          }),
        }
      }
      const path = firstIssue.path?.map((p) => (typeof p === 'object' ? p.key : p)).join('.')
      const message = [path, firstIssue.message].filter(Boolean).join(': ')
      const error = new this._Error(message, {
        cause: result,
        code: POINT0_ERROR_CODES_MAP.INPUT_SCHEMA_INVALID,
        meta: { point: this.id, path },
      })
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
    input,
  }: {
    serverData: Data | undefined
    serverResponse: Response | undefined
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
      const fixedInput = flat.parse(flat.stringify(input)) as InputRaw
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
          const result = (await (promise as any)) as Awaited<ReturnType<ClientLoaderFn>>
          if (RedirectTask.is(result)) {
            throw result
          }
          if (result instanceof Response) {
            currentClientResponse = result
            currentClientOutput = result
          }
          if (result instanceof Error) {
            throw result
          } else {
            currentClientResponse = undefined
            currentClientData = result ?? {}
            currentClientOutput = result ?? {}
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

  /**
   * The query's `useQuery` hook — input first (it forms the cache key), react-query options second. Returns the
   * standard TanStack `useQuery` result. `useQuery(undefined, { enabled: false })` reads the cache without fetching.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaQuery.useQuery({ id: 123 }, { enabled: !!id })
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  useQuery(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    queryOptions?: ExtraUseQueryOptions | undefined,
    options?: { fetchOptions?: FetchOptions | undefined },
  ): UsePointQueryResult<'query', TServerLoaderOutput, TClientLoaderOutput, TError, any> {
    const serverQueryEnabled = !!this._hasServerLoader
    const clientQueryEnabled = this._hasClientLoader()
    if (!serverQueryEnabled && !clientQueryEnabled) {
      // Same error every other query surface throws (the suspense hooks, `fetchQuery`,
      // `getQueryOptions`, …) — types already forbid this call, so only a plain-JS caller can
      // reach it, and a silent `{ data: {} }` stub would just move the failure downstream.
      throw new this._Error(`No loader found on point ${this.toStringWithLocation()}`, {
        code: POINT0_ERROR_CODES_MAP.POINT_NO_LOADER,
        meta: { point: this.id },
      })
    }

    if (serverQueryEnabled && !clientQueryEnabled) {
      const query = this._useServerQuery({
        input: input as never,
        queryOptions,
        fetchOptions: options?.fetchOptions,
      })
      return query as never
    }

    // only one loader per point — any non-server query is a client query
    const query = this._useClientQuery({
      input: input as never,
      queryOptions,
    })
    return query as never
  }

  /**
   * The query's `useSuspenseQuery` hook — TanStack suspense semantics: `data` is always present in types, a pending
   * query suspends into the nearest Suspense boundary (the mountable's positional `.loading()`), an error throws to the
   * nearest ErrorBoundary (the positional `.error()`). During SSR the shell ships with the fallback and the resolved
   * content streams into the same response; on the client it suspends on navigations and fresh inputs. There are no
   * `enabled`/`ssr`/`suspense` options — a suspense query always runs and always suspends.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     const { data } = ideaQuery.useSuspenseQuery({ id: 123 })
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  useSuspenseQuery(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    queryOptions?: ExtraUseSuspenseQueryOptions | undefined,
    options?: { fetchOptions?: FetchOptions | undefined },
  ): UsePointSuspenseQueryResult<'query', TServerLoaderOutput, TClientLoaderOutput, TError> {
    const serverQueryEnabled = !!this._hasServerLoader
    const clientQueryEnabled = this._hasClientLoader()
    if (!serverQueryEnabled && !clientQueryEnabled) {
      throw new this._Error(`No loader found on point ${this.toStringWithLocation()}`, {
        code: POINT0_ERROR_CODES_MAP.POINT_NO_LOADER,
        meta: { point: this.id },
      })
    }
    // `enabled: true` — a suspense query can never be disabled (a merged-in default `enabled: false` would park it
    // forever); `suspend: true` — so the executor classifies the marker as streamed (background kick, never a
    // blocking discovery participant). Both are call-site-level, so they beat every merged default.
    const fixedQueryOptions = { ...queryOptions, enabled: true, suspend: true } as never as ExtraUseQueryOptions
    if (serverQueryEnabled && !clientQueryEnabled) {
      const serverQueryOptions = this._getServerQueryOptions({
        input: input as never,
        queryOptions: fixedQueryOptions,
        fetchOptions: options?.fetchOptions,
      })
      const result = useQuery(serverQueryOptions)
      return this._suspenseHookResult({
        result,
        mergedQueryOptions: serverQueryOptions as never,
        ensure: () => _ss.__POINT0_QUERY_CLIENT__.get().ensureQueryData(serverQueryOptions as never),
        loaderSide: 'server',
      }) as never
    }
    // only one loader per point — any non-server query is a client query
    const clientQueryOptions = this._getClientQueryOptions({
      input: input as never,
      queryOptions: fixedQueryOptions,
    })
    const result = useQuery(clientQueryOptions)
    return this._suspenseHookResult({
      result,
      mergedQueryOptions: clientQueryOptions as never,
      ensure: () => _ss.__POINT0_QUERY_CLIENT__.get().ensureQueryData(clientQueryOptions as never),
      loaderSide: 'client',
    }) as never
  }

  /**
   * The infinite query's `useInfiniteQuery` hook — the real TanStack infinite result (`data.pages`, `fetchNextPage`,
   * `hasNextPage`, `isFetchingNextPage`), typed to your loader's page shape. Input first, options second.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     const q = ideaListQuery.useInfiniteQuery()
   *     q.data?.pages.flatMap((p) => p.ideas)
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  useInfiniteQuery(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    infiniteQueryOptions?:
      | PartialUseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined,
    options?: { fetchOptions?: FetchOptions | undefined },
  ): UsePointQueryResult<'infiniteQuery', TServerLoaderOutput, TClientLoaderOutput, TError, any> {
    const serverQueryEnabled = !!this._hasServerLoader
    const clientQueryEnabled = this._hasClientLoader()
    if (!serverQueryEnabled && !clientQueryEnabled) {
      // see useQuery — aligned with every other query surface
      throw new this._Error(`No loader found on point ${this.toStringWithLocation()}`, {
        code: POINT0_ERROR_CODES_MAP.POINT_NO_LOADER,
        meta: { point: this.id },
      })
    }

    if (serverQueryEnabled && !clientQueryEnabled) {
      const query = this._useServerInfiniteQuery({
        input: input as never,
        infiniteQueryOptions,
        fetchOptions: options?.fetchOptions,
      })
      return query as never
    }

    // only one loader per point — any non-server query is a client query
    const query = this._useClientInfiniteQuery({
      input: input as never,
      infiniteQueryOptions,
    })
    return query as never
  }

  /**
   * The infinite query's `useSuspenseInfiniteQuery` hook — the TanStack suspense infinite result: `data.pages` is
   * always present in types, a pending first page suspends into the nearest Suspense boundary (the mountable's
   * positional `.loading()`), an error throws to the nearest ErrorBoundary. During SSR the shell ships with the
   * fallback and the first page streams into the same response; on the client it suspends on navigations and fresh
   * inputs (`fetchNextPage` never suspends — TanStack semantics). There are no `enabled`/`ssr`/`suspend` options.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     const { data } = ideaListQuery.useSuspenseInfiniteQuery()
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  useSuspenseInfiniteQuery(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    infiniteQueryOptions?:
      | PartialUseSuspenseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined,
    options?: { fetchOptions?: FetchOptions | undefined },
  ): UsePointSuspenseQueryResult<'infiniteQuery', TServerLoaderOutput, TClientLoaderOutput, TError> {
    const serverQueryEnabled = !!this._hasServerLoader
    const clientQueryEnabled = this._hasClientLoader()
    if (!serverQueryEnabled && !clientQueryEnabled) {
      throw new this._Error(`No loader found on point ${this.toStringWithLocation()}`, {
        code: POINT0_ERROR_CODES_MAP.POINT_NO_LOADER,
        meta: { point: this.id },
      })
    }
    // see useSuspenseQuery — same forced call-site options, same reasons
    const fixedInfiniteQueryOptions = {
      ...infiniteQueryOptions,
      enabled: true,
      suspend: true,
    } as never as PartialUseInfiniteQueryOptions
    if (serverQueryEnabled && !clientQueryEnabled) {
      const serverInfiniteQueryOptions = this._getServerInfiniteQueryOptions({
        input: input as never,
        infiniteQueryOptions: fixedInfiniteQueryOptions as never,
        fetchOptions: options?.fetchOptions,
      })
      const result = useInfiniteQuery(serverInfiniteQueryOptions)
      return this._suspenseHookResult({
        result,
        mergedQueryOptions: serverInfiniteQueryOptions as never,
        ensure: () => _ss.__POINT0_QUERY_CLIENT__.get().ensureInfiniteQueryData(serverInfiniteQueryOptions as never),
        loaderSide: 'server',
      }) as never
    }
    // only one loader per point — any non-server query is a client query
    const clientInfiniteQueryOptions = this._getClientInfiniteQueryOptions({
      input: input as never,
      infiniteQueryOptions: fixedInfiniteQueryOptions as never,
    })
    const result = useInfiniteQuery(clientInfiniteQueryOptions)
    return this._suspenseHookResult({
      result,
      mergedQueryOptions: clientInfiniteQueryOptions as never,
      ensure: () => _ss.__POINT0_QUERY_CLIENT__.get().ensureInfiniteQueryData(clientInfiniteQueryOptions as never),
      loaderSide: 'client',
    }) as never
  }

  /** The server origin this point's fetches target — `.serverUrl` first, then the ambient request/window/port. */
  _getServerUrl(): string | undefined {
    if (this._serverUrl) {
      return this._serverUrl
    }
    const request0 = _ss.__POINT0_REQUEST0__.getOrUndefined()
    if (request0?.location.origin) {
      return request0.location.origin
    }
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    const serverPort = _ss.__POINT0_SERVER_PORT__.getOrUndefined()
    if (serverPort) {
      return `http://localhost:${serverPort}`
    }
    return undefined
  }

  /** Build the fetch for this point's endpoint — URL, method (GET `?input=` vs POST by length), headers, transform. */
  _getFetchServerOptions({
    input = {},
    fetchOptions: _fetchOptions,
    outputType = 'data',
  }: {
    input: InputRawUnknown | undefined | void
    fetchOptions?: FetchOptions
    outputType?: FetchServerOutputType
  }): { url: string; init: RequestInit; request: Request; transform: boolean } {
    const baseFetchOptions = this._fetchOptions?.() || {}
    const { transform: transformOption = true, ...fetchOptions } = { ...baseFetchOptions, ..._fetchOptions }
    // a `preventTransformer` channel's connect leg is a transform-less request BY DECLARATION — plain JSON both ways,
    // no transform header: the same shape a raw external client states by sending no header at all
    const transform = this._preventSocketTransformer ? false : transformOption
    const serverUrl = this._getServerUrl()
    if (!serverUrl) {
      throw new Error(`Server URL is not set on point ${this.toStringWithLocation()}`)
    }
    if (!this._endpoint) {
      throw new Error(`Endpoint definition is not set on point ${this.toStringWithLocation()}`)
    }
    const isAction = this.type === 'action'
    const isPage = this.type === 'page'
    const isLayout = this.type === 'layout'
    // a channel connect is a query-shaped read too: same GET-with-?input= / POST-by-length duality (the response is
    // `private, no-store`, so the GET buys no caching — it buys ONE rule for method choice across the wire surface)
    const usesQueryTransport = this._usesQueryTransport()
    const route = this._endpoint.route
    const endpointMethod = this._endpoint.method

    const fromScope = _ss.__POINT0_CLIENT_POINTS__.getOrUndefined()?.manager.scope ?? _getFakeClient()?.scope
    const baseHeaders = mergeHeaders(baseFetchOptions.headers, _fetchOptions?.headers)
    const headers = mergeHeaders(baseHeaders, {
      // a subscription fetch names our native framing — a foreign client without it (EventSource) gets SSE instead
      ...(baseHeaders.has('Accept')
        ? {}
        : { Accept: this._isHttpSubscription() ? 'application/x-ndjson' : 'application/json' }),
      ...(fromScope ? { [POINT0_FROM_SCOPE_HEADER]: fromScope } : {}),
      [POINT0_TO_SCOPE_HEADER]: this.scope,
      [POINT0_CLIENT_REQUEST_ID_HEADER]: generateId(),
      ...(outputType === 'queryClientDehydratedState' ? { [POINT0_OUTPUT_TYPE_HEADER]: outputType } : {}),
      ...(transform ? { [POINT0_TRANSFORM_HEADER]: 'true' } : {}),
      // Advertise that this fetch can read a streamed (NDJSON) body, so a loader/mutation `defer()` streams its holes
      // in (see `defer`). Client-only: a server-to-server SSR nested fetch must keep getting a single JSON body (the
      // outer render's pump drains its holes). Needs the transformer to decode the streamed subtrees, so gated on it.
      ...(_point0_env.side.is.client && transform ? { [POINT0_STREAM_HEADER]: 'true' } : {}),
    })

    // Encode a source object into a request body: FormData when it carries binary (File/Blob), otherwise a JSON string.
    // Shared by mutations, the action body, and a query endpoint's POST fallback. Sets Content-Type for the JSON case.
    const buildBody = (
      src: Record<string, unknown> | undefined,
      isBinary: boolean = isContainsBinary(src),
    ): BodyInit | undefined => {
      const bodyTransformed = (transform ? this._getTransformer().serialize(src) : src) as
        Record<string, unknown> | undefined
      if (bodyTransformed === undefined) {
        throw new Error(
          `Transformer returned undefined for input ${JSON.stringify(input)} on point ${this.toStringWithLocation()}`,
        )
      }
      if (isBinary) {
        const formData = new FormData()
        const flattened = flat.serialize(bodyTransformed)
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
        return formData
      }
      headers.set('Content-Type', 'application/json')
      return JSON.stringify(bodyTransformed)
    }

    const { method, url, body } = ((): { method: WideRequestMethod; url: URL; body: BodyInit | undefined } => {
      // Pages and layouts: the input IS the route — params and search — and never a body.
      if (isPage || isLayout) {
        return { method: endpointMethod, url: new URL(route.get(input as never), serverUrl), body: undefined }
      }
      // Actions: the user-declared method, with the body taken from `input.body` per the action's config.
      if (isAction) {
        const rawBody = (input as any).body
        const body = ((): BodyInit | undefined => {
          if (!rawBody || rawBody instanceof FormData) {
            return rawBody
          }
          const currentHeadersContentType = headers.get('Content-Type')
          if (
            currentHeadersContentType &&
            !currentHeadersContentType.includes('application/json') &&
            !currentHeadersContentType.includes('multipart/form-data')
          ) {
            return rawBody
          }
          return buildBody(rawBody)
        })()
        return {
          method: endpointMethod,
          url: new URL(route.get({ ...((input as any).params ?? {}), '?': (input as any).search ?? {} }), serverUrl),
          body,
        }
      }
      // Query endpoints (query / infiniteQuery / component / provider): GET with the input JSON-encoded in the
      // ?input= search param so a CDN can cache the read. This is a client-only optimization — a server-side fetch
      // (SSR, server-to-server) never reaches a CDN, so it skips the URL encoding and POSTs the body directly. On the
      // client, fall back to a POST body when the input carries binary (can't ride in a URL) or the URL would overflow
      // proxy/CDN limits — the endpoint answers to both methods.
      if (usesQueryTransport) {
        const isBinary = isContainsBinary(input)
        if (_point0_env.side.is.client && !isBinary) {
          const transformed = (transform ? this._getTransformer().serialize(input) : input) as
            Record<string, unknown> | undefined
          if (transformed === undefined) {
            throw new Error(
              `Transformer returned undefined for input ${JSON.stringify(input)} on point ${this.toStringWithLocation()}`,
            )
          }
          const inputJson = JSON.stringify(transformed)
          const search =
            inputJson && inputJson !== '{}' ? { [POINT0_QUERY_GET_INPUT_SEARCH_PARAM]: inputJson } : undefined
          const getUrl = new URL(route.get(search ? { '?': search } : undefined), serverUrl)
          // Over the memoized, env-overridable URL length cap → POST fallback.
          if (getUrl.toString().length <= this._getQueryMaxUrlLength()) {
            return { method: 'GET', url: getUrl, body: undefined }
          }
        }
        return {
          method: 'POST',
          url: new URL(route.get(), serverUrl),
          body: buildBody(input as Record<string, unknown>, isBinary),
        }
      }
      // Mutations: POST the input as a body.
      return {
        method: endpointMethod,
        url: new URL(route.get(), serverUrl),
        body: buildBody(input as Record<string, unknown>),
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
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    fetchOptions?: FetchOptions,
    options?: { outputType?: FetchServerOutputType },
  ): { url: string; init: RequestInit; request: Request; transform: boolean } {
    return this._getFetchServerOptions({ input, fetchOptions, outputType: options?.outputType })
  }

  private modifyFetchRequestForServerIfRequired(fetchOptions: ReturnType<typeof this.getFetchServerOptions>): Request {
    if (_point0_env.side.is.server) {
      const currentRequest0 = _ss.__POINT0_REQUEST0__.getOrUndefined()
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

      // const currentEffects = _ss.__POINT0_EFFECTS__.getOrUndefined()
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
        __POINT0_PREV_REQUEST__: currentRequest0,
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
    input = {},
    fetchOptions: _fetchOptions,
    outputType,
  }: {
    input: InputRawUnknown | undefined | void
    fetchOptions?: FetchOptions
    outputType?: FetchServerOutputType
  }): Promise<FetchServerDetailedOutput<TServerLoaderOutput, TError>> {
    let res: Response | undefined
    const _eventData = {
      input,
      point: this as AnyPoint,
      error: undefined,
      output: undefined,
    }
    const meta = { point: this.id, input: sanitizeForLog(input) }
    try {
      const fetchOptions = this._getFetchServerOptions({
        input,
        fetchOptions: _fetchOptions,
        outputType,
      })
      const fetchFn = getFetch({ scope: this.scopes })
      const fetchRequest = this.modifyFetchRequestForServerIfRequired(fetchOptions)
      this._emit('pointFetchServerStart', _eventData, meta)
      res = await fetchFn(fetchRequest)
      // this.modifyEffectsCookiesAfterServerFetchIfRequired(res)

      // Deploy invalidation: every server response echoes the client build version it serves
      // (x-point0-client-build). A mismatch against the version this tab runs marks the build stale — the next
      // client navigation becomes a full document navigation (see stale.ts). Client-only and free when absent.
      if (_point0_env.side.is.client) {
        noticeClientBuildHeaderFromResponse({
          response: res,
          scope: _ss.__POINT0_CLIENT_POINTS__.getOrUndefined()?.manager.scope,
        })
      }

      // Bubble up non-default status codes from nested server point fetches
      // to the current outer request (e.g. SSR page render request). Skipped once the outer
      // effects are sealed (the streamed shell already left with its status) — a streamed loader
      // settling after the shell must not trip the sealed warning, which is reserved for USER
      // code touching the response too late.
      if (_point0_env.side.is.server) {
        const currentEffects = _ss.__POINT0_EFFECTS__.getOrUndefined()
        if (currentEffects && !currentEffects.sealed && typeof currentEffects.status === 'undefined') {
          currentEffects.set.status(res.status)
        }
      }

      if (res.headers.get(POINT0_NOT_JSON_DATA_HEADER) === 'true') {
        const result = {
          response: res,
          data: undefined,
          error: undefined,
          redirect: undefined,
          output: res,
        } as Extract<FetchServerDetailedOutput<TServerLoaderOutput, TError>, { error: undefined }>
        // The cast resolves the generic `Extract` above for the emit — TS can't reduce it while TServerLoaderOutput
        // and TError are unresolved.
        const eventData = {
          ..._eventData,
          ...result,
        } as EventerEventPointFetchServerSuccess['data']
        this._emit('pointFetchServerSettled', eventData, meta)
        this._emit('pointFetchServerSuccess', eventData, meta)
        return result
      }

      // Streamed (NDJSON) response for deferred holes (see `defer`): read incrementally — line 1 is the payload (holes
      // decode to client slots), returned as `data` so the query/mutation resolves with the fast data at once; the
      // remaining lines fill the holes in the background (`streamed.done`, fire-and-forget) as each subtree lands, a
      // fresh client render that leaves an island inside a hole interactive. A response never advertised as streamed (a
      // foreign endpoint, a hole-free payload, a server-to-server SSR fetch) takes the single-body path below unchanged.
      let data: unknown
      if (res.ok && res.headers.get(POINT0_STREAM_HEADER) === 'true' && res.body) {
        const streamed = await readStreamedRscFetch(this._getTransformerWithRsc(), res.body)
        void streamed.done
        data = streamed.data
      } else {
        const json = await res.json()
        // RSC decode mirrors the server encode, which is independent of `transform` (the server always wraps its output
        // with the RSC codec — `getTransformerWithRsc`). `transform` toggles only the inner app transformer: on → the
        // point's transformer, off → blank. Decoding through the matching wrapper both ways keeps element markers from
        // leaking to the consumer as raw objects under `transform: false`.
        data = fetchOptions.transform
          ? (this._getTransformerWithRsc().deserialize(json) ?? json)
          : (this._getBlankTransformerWithRsc().deserialize(json) ?? json)
      }
      // decoding may have started component-point chunk imports (RSC references) — resolve the fetch only with the
      // chunks warm, so the consumer never renders a Suspense fallback for an island that is already in the data
      await rscComponentsRegistry.drainPending()
      if (res.ok) {
        if (
          outputType === 'queryClientDehydratedState' &&
          data &&
          typeof data === 'object' &&
          'dehydratedState' in data &&
          typeof data.dehydratedState === 'object' &&
          data.dehydratedState !== null
        ) {
          const originalDehydratedState = data.dehydratedState as DehydratedState
          const freshDehydratedState = forceFreshDehydratedState(originalDehydratedState)
          const dehydratedState = deserializeErrorsInDehydratedState(freshDehydratedState, this._Error)
          data.dehydratedState = dehydratedState
        }
        const result = {
          response: res,
          error: undefined,
          ...(res.headers.get(POINT0_REDIRECT_HEADER) === 'true'
            ? {
                redirect: RedirectTask.from(data as never),
                data: undefined,
                output: undefined,
              }
            : {
                redirect: undefined,
                data,
                output: data,
              }),
        } as Extract<FetchServerDetailedOutput<TServerLoaderOutput, TError>, { error: undefined }>
        // Same as above: resolve the generic `Extract` for the emit.
        const eventData = {
          ..._eventData,
          ...result,
        } as EventerEventPointFetchServerSuccess['data']
        const successMeta = result.redirect ? { ...meta, redirect: result.redirect.serialize() } : meta
        this._emit('pointFetchServerSettled', eventData, successMeta)
        this._emit('pointFetchServerSuccess', eventData, successMeta)
        return result
      }
      const error0 = this._Error.from(data)
      error0.status = res.status
      const result = {
        response: res,
        output: undefined,
        data: undefined,
        redirect: undefined,
        error: error0,
      }
      const eventData = {
        ..._eventData,
        ...result,
      }
      this._emit('pointFetchServerSettled', eventData, meta)
      this._emit('pointFetchServerError', eventData, meta)
      return result
    } catch (error) {
      const result = {
        response: res,
        data: undefined,
        redirect: undefined,
        error: this._Error.from(error),
        output: undefined,
      }
      // A cancelled fetch (the caller's `AbortSignal` fired — e.g. a TanStack query whose observer left mid-flight) is
      // not a real failure: emit the dedicated cancelled outcome rather than the error pair, but still return the
      // result so the caller (`_fetchServer` → the query function) keeps throwing and TanStack's revert path runs.
      if (isAbortCancellation(result.error, _fetchOptions?.signal)) {
        this._emit('pointFetchServerCancelled', _eventData, meta)
        return result
      }
      const eventData = {
        ..._eventData,
        ...result,
      }
      this._emit('pointFetchServerSettled', eventData, meta)
      this._emit('pointFetchServerError', eventData, meta)
      return result
    }
  }

  async fetchServerDetailed(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    fetchOptions?: FetchOptions,
    options?: { outputType?: FetchServerOutputType },
  ): Promise<FetchServerDetailedOutput<TServerLoaderOutput, TError>> {
    return this._fetchServerDetailed({ input, fetchOptions, outputType: options?.outputType })
  }

  private async _fetchServer({
    input = {},
    fetchOptions,
    outputType,
  }: {
    input: InputRawUnknown | undefined | void
    fetchOptions?: FetchOptions
    outputType?: FetchServerOutputType
  }): Promise<FetchServerOutput<TServerLoaderOutput>> {
    const detailedResult = await this._fetchServerDetailed({ input, fetchOptions, outputType })
    if (detailedResult.error) {
      throw detailedResult.error
    }
    if (detailedResult.redirect) {
      throw detailedResult.redirect
    }
    return detailedResult.output as FetchServerOutput<TServerLoaderOutput>
  }
  async fetchServer(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    fetchOptions?: FetchOptions,
    options?: { outputType?: FetchServerOutputType },
  ): Promise<FetchServerOutput<TServerLoaderOutput>> {
    return this._fetchServer({ input, fetchOptions, outputType: options?.outputType })
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
      POINT0_QUERY_KEY_NAMESPACE,
      {
        scope: this.scope,
        type: this.type,
        name: this.name,
        mode: 'server',
        finiteness: isInfiniteQuery ? 'infinite' : 'finite',
        tags: this.tags,
        output: outputType,
        input: stringifyOrThrow(
          this._getTransformer(),
          this._rawInputToRoutedRawInputForQueryKey({ inputRaw: input as never }),
          this.id,
        ),
      },
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
      POINT0_QUERY_KEY_NAMESPACE,
      {
        scope: this.scope,
        type: this.type,
        name: this.name,
        mode: 'client',
        finiteness: isInfiniteQuery ? 'infinite' : 'finite',
        tags: this.tags,
        output: 'data',
        input: stringifyOrThrow(
          this._getTransformer(),
          this._rawInputToRoutedRawInputForQueryKey({ inputRaw: input as never }),
          this.id,
        ),
      },
    ]
  }

  _getFinalQueryMode(): QueryMode {
    if (this._hasClientLoader()) {
      return 'client'
    }
    if (this._hasServerLoader) {
      return 'server'
    }
    throw new this._Error(`No loader found on point ${this.toStringWithLocation()}`, {
      code: POINT0_ERROR_CODES_MAP.POINT_NO_LOADER,
      meta: { point: this.id },
    })
  }

  _getFinalQueryKey({
    input = {},
    outputType,
    queryResultType,
  }: {
    input?: InputRaw | void
    outputType?: FetchServerOutputType
    queryResultType: QueryResultType
  }): QueryKey {
    // only one loader per point, so the query mode is always determined by which loader exists
    if (this._hasClientLoader()) {
      return this._getClientQueryKey({
        input: input as never,
        isInfiniteQuery: queryResultType === 'infiniteQuery',
      })
    }
    if (this._hasServerLoader) {
      return this._getServerQueryKey({
        input: input as never,
        outputType: outputType,
        isInfiniteQuery: queryResultType === 'infiniteQuery',
      })
    }
    throw new this._Error(`No loader found on point ${this.toStringWithLocation()}`, {
      code: POINT0_ERROR_CODES_MAP.POINT_NO_LOADER,
      meta: { point: this.id },
    })
  }

  /**
   * Build the TanStack query key tuple for an input — the same key Point0 uses for this query's cache. Handy for manual
   * cache reads or `queryClient` calls.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaQuery.getQueryKey({ id: 123 })
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  getQueryKey(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: { outputType?: FetchServerOutputType },
  ): QueryKey {
    return this._getFinalQueryKey({
      input,
      outputType: options?.outputType,
      queryResultType: 'query',
    })
  }

  /**
   * The infinite query's key tuple — pass the same INPUT you query with. Use it for manual cache reads or `queryClient`
   * calls against the infinite cache. (The finite `.getQueryKey()` returns the non-infinite key.)
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaFeed.getInfiniteQueryKey({ q })
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  getInfiniteQueryKey(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: { outputType?: FetchServerOutputType },
  ): QueryKey {
    return this._getFinalQueryKey({
      input,
      outputType: options?.outputType,
      queryResultType: 'infiniteQuery',
    })
  }

  _getServerQueryOptions({
    input = {} as never,
    queryOptions,
    fetchOptions,
    outputType,
    queryClient = _ss.__POINT0_QUERY_CLIENT__.get(),
  }: {
    input: InputRaw
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchServerOutputType
    queryClient?: QueryClient
  }): UseQueryOptions<
    FetchServerOutput<TServerLoaderOutput>,
    TError,
    FetchServerOutput<TServerLoaderOutput>,
    QueryKey
  > {
    const queryKey = this._getServerQueryKey({ input, outputType, isInfiniteQuery: false })
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey, exact: true })
    const maybeRedirect = (query?.state.error as Record<string, unknown> | undefined)?.redirect
    const redirect = RedirectTask.is(maybeRedirect) ? maybeRedirect : undefined
    const _eventData = {
      point: this as AnyPoint,
      input,
      queryKey,
      mode: 'server' as const,
      error: undefined,
      data: undefined,
    }
    const meta = { point: this.id, input: sanitizeForLog(input), queryKey, mode: _eventData.mode }
    const queryFn = async ({ signal }: { signal: AbortSignal }) => {
      this._emit('pointQueryStart', _eventData, meta)
      try {
        const data = await this._fetchServer({
          input,
          fetchOptions: { signal, ...fetchOptions },
          outputType: outputType,
        })
        const eventData = {
          ..._eventData,
          redirect: undefined,
          data: data as Data,
        }
        this._emit('pointQuerySettled', eventData, meta)
        this._emit('pointQuerySuccess', eventData, meta)
        return data
      } catch (error) {
        const error0 = this._Error.from(error)
        if (isAbortCancellation(error0, signal)) {
          // The fetch was cancelled (navigation away, an unmount, a cancelRefetch supersede) — not a failure. TanStack
          // reverts the query (no error in cache), so emit a dedicated cancelled outcome instead of pointQueryError
          // (it is NOT in uniqEventerErrorEventNames, so `.on('error')` and its reporters stay quiet) and still throw,
          // leaving TanStack's cancel/revert path untouched.
          this._emit('pointQueryCancelled', _eventData, meta)
          throw error0
        }
        if (error0.redirect) {
          const eventData = {
            ..._eventData,
            error: undefined,
            redirect: error0.redirect,
          }
          const redirectMeta = { ...meta, redirect: error0.redirect.serialize() }
          this._emit('pointQuerySettled', eventData, redirectMeta)
          this._emit('pointQuerySuccess', eventData, redirectMeta)
          throw error0
        } else {
          const eventData = {
            ..._eventData,
            error: error0,
            redirect: undefined,
          }
          this._emit('pointQuerySettled', eventData, meta)
          this._emit('pointQueryError', eventData, meta)
          throw error0
        }
      }
    }
    const mountableDefaultQueryOptions =
      {
        page: this._defaultPageQueryOptions,
        component: this._defaultComponentQueryOptions,
        layout: this._defaultLayoutQueryOptions,
        provider: this._defaultProviderQueryOptions,
      }[this.type as string] || {}
    // KEEP IN SYNC: `_getMergedSsrQueryOption` mirrors this source list (the non-dehydrated-state
    // branch) to read the merged `ssr` option cheaply — change one, change both.
    const megedQueryOptions = mergeQueryOptions(
      this._defaultQueryOptions,
      ...(outputType === 'queryClientDehydratedState'
        ? [this._pageDehydratedStateQueryOptions]
        : [mountableDefaultQueryOptions, this._queryOptions]),
      queryOptions,
    )
    const result = {
      ...megedQueryOptions,
      queryKey,
      queryFn,
      // A truthy legacy `suspense` key must never reach TanStack: v5's useBaseQuery still honors
      // it (fetch-in-render via fetchOptimistic + its own suspension), bypassing the framework's
      // SSR phases and the data-mode skip policy. Our option is named `suspend` partly to avoid
      // that collision; neutralize a stray key defensively (plain-JS callers bypass the types).
      suspense: undefined,
      retryOnMount: redirect ? false : megedQueryOptions.retryOnMount,
      ...(_point0_env.side.is.server
        ? {
            // Forced on the server for render determinism: nothing ever mounts, refocuses or
            // reconnects during an SSR pass, and a query must not go stale or get collected
            // mid-request. `retryOnMount` is deliberately NOT in this list (the merged value
            // above rides through): on the server it is a RENDER-time switch — it decides how an
            // ERRORED query reports itself to a fresh observer. Truthy (the TanStack default) →
            // the optimistic `pending` report → SSR renders the loading state and the client
            // retries on mount after hydration, exactly like a client-side mount would; an
            // explicit `false` → the honest error report → the mountable's `.error()` (and its
            // `status`/redirect effects) reaches the SSR response. The suspension gates read the
            // CACHE underneath the observer, so the optimistic report cannot loop a streamed
            // query (see `_maybeSuspendQueryByOption` / `_suspenseHookResult`).
            retry: false,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: Infinity,
            gcTime: Infinity,
          }
        : {
            // redirects, `preventRetry` and the caller's own option — the shared wrapper handles all three
            retry: Point0._retryHonoringPreventRetry(megedQueryOptions.retry as UseQueryOptions['retry']),
          }),
    } as never
    return result
  }

  private _getClientQueryOptions({
    input = {} as never,
    queryOptions,
    serverData,
  }: {
    input: InputRaw
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
      point: this as AnyPoint,
      input,
      queryKey,
      mode: 'client' as const,
      error: undefined,
      data: undefined,
    }
    const meta = { point: this.id, input: sanitizeForLog(input), queryKey, mode: _eventData.mode }
    const queryFn = async () => {
      this._emit('pointQueryStart', _eventData, meta)
      try {
        const { clientData } = await this._executeClientAsync({
          serverData,
          input: input as InputRaw<TClientInputSchema>,
          serverResponse: undefined,
        })
        const eventData = {
          ..._eventData,
          data: clientData as Data,
          redirect: undefined,
        }
        this._emit('pointQuerySettled', eventData, meta)
        this._emit('pointQuerySuccess', eventData, meta)
        return clientData
      } catch (error) {
        const error0 = this._Error.from(error)
        if (error0.redirect) {
          const eventData = {
            ..._eventData,
            error: undefined,
            redirect: error0.redirect,
          }
          const redirectMeta = { ...meta, redirect: error0.redirect.serialize() }
          this._emit('pointQuerySettled', eventData, redirectMeta)
          this._emit('pointQuerySuccess', eventData, redirectMeta)
          throw error0
        } else {
          const eventData = {
            ..._eventData,
            error: error0,
            redirect: undefined,
          }
          this._emit('pointQuerySettled', eventData, meta)
          this._emit('pointQueryError', eventData, meta)
          throw error0
        }
      }
    }
    const mountableDefaultQueryOptions =
      {
        page: this._defaultPageQueryOptions,
        component: this._defaultComponentQueryOptions,
        layout: this._defaultLayoutQueryOptions,
        provider: this._defaultProviderQueryOptions,
      }[this.type as string] || {}
    const megedQueryOptions = mergeQueryOptions(
      this._defaultQueryOptions,
      mountableDefaultQueryOptions,
      this._queryOptions,
      queryOptions,
    )
    return {
      ...megedQueryOptions,
      queryKey,
      queryFn,
      // see _getServerQueryOptions — a legacy `suspense` key must never reach TanStack
      suspense: undefined,
      // redirects, `preventRetry` and the caller's own option — the shared wrapper handles all three
      retry: Point0._retryHonoringPreventRetry(megedQueryOptions.retry as UseQueryOptions['retry']),
    } as never
  }

  /**
   * Build the fully-resolved `UseQueryOptions` for an input — `queryKey`, `queryFn`, and merged defaults — ready to
   * hand to react-query's `useQuery` / `queryClient` directly.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  getQueryOptions(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    queryOptions?: ExtraUseQueryOptions | undefined,
    options?: {
      queryClient?: QueryClient
      fetchOptions?: FetchOptions | undefined
      outputType?: FetchServerOutputType
    },
  ): UseQueryOptions<
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    QueryKey
  > {
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = !!this._hasServerLoader
    const { queryClient, fetchOptions, outputType } = options || {}
    // only one loader per point — pick whichever exists
    if (hasClientLoader) {
      return this._getClientQueryOptions({
        input: input as never,
        queryOptions,
      }) as never
    }
    if (hasServerLoader) {
      return this._getServerQueryOptions({
        input: input as never,
        queryOptions,
        fetchOptions,
        outputType,
        queryClient,
      }) as never
    }
    throw new this._Error(`No loader found on point ${this.toStringWithLocation()}`, {
      code: POINT0_ERROR_CODES_MAP.POINT_NO_LOADER,
      meta: { point: this.id },
    })
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
    queryClient = _ss.__POINT0_QUERY_CLIENT__.get(),
  }: {
    input: InputRaw
    infiniteQueryOptions:
      | PartialUseInfiniteQueryOptions<
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
    queryClient?: QueryClient
  }): UseInfiniteQueryOptions<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    InfiniteData<FetchServerOutput<TServerLoaderOutput>>,
    TError,
    FetchServerOutput<TServerLoaderOutput>,
    QueryKey
  > {
    const queryKey = this._getServerQueryKey({ input: input as never, outputType, isInfiniteQuery: true })
    const _eventData = {
      point: this as AnyPoint,
      input: input as InputRaw,
      queryKey,
      mode: 'server' as const,
      error: undefined,
      data: undefined,
    }
    const meta = { point: this.id, input: sanitizeForLog(input), queryKey, mode: _eventData.mode }
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey, exact: true })
    const maybeRedirect = (query?.state.error as Record<string, unknown> | undefined)?.redirect
    const redirect = RedirectTask.is(maybeRedirect) ? maybeRedirect : undefined
    const queryFn = async ({ pageParam, signal }: { pageParam: unknown; signal: AbortSignal }) => {
      try {
        this._emit('pointInfiniteQueryStart', _eventData, meta)
        const inputWithPageParam = this._toInputWithPageParam({ input, pageParam })
        const data = await this._fetchServer({
          input: inputWithPageParam as never,
          fetchOptions: { signal, ...fetchOptions },
          outputType: outputType,
        })
        const eventData = {
          ..._eventData,
          redirect: undefined,
          data: data as Data,
        }
        this._emit('pointInfiniteQuerySettled', eventData, meta)
        this._emit('pointInfiniteQuerySuccess', eventData, meta)
        return data
      } catch (error) {
        const error0 = this._Error.from(error)
        if (isAbortCancellation(error0, signal)) {
          // Cancelled mid-fetch (navigation/unmount/supersede), not a failure — emit the dedicated cancelled outcome
          // (absent from uniqEventerErrorEventNames) instead of pointInfiniteQueryError, and still throw so TanStack's
          // cancel/revert path is unchanged. See the server-query branch above.
          this._emit('pointInfiniteQueryCancelled', _eventData, meta)
          throw error0
        }
        if (error0.redirect) {
          const eventData = {
            ..._eventData,
            error: undefined,
            redirect: error0.redirect,
          }
          const redirectMeta = { ...meta, redirect: error0.redirect.serialize() }
          this._emit('pointInfiniteQuerySettled', eventData, redirectMeta)
          this._emit('pointInfiniteQuerySuccess', eventData, redirectMeta)
          throw error0
        } else {
          const eventData = {
            ..._eventData,
            error: error0,
            redirect: undefined,
          }
          this._emit('pointInfiniteQuerySettled', eventData, meta)
          this._emit('pointInfiniteQueryError', eventData, meta)
          throw error0
        }
      }
    }
    // KEEP IN SYNC: `_getMergedSsrQueryOption` mirrors this source list to read the merged `ssr`
    // option cheaply — change one, change both.
    const megedQueryOptions = mergeInfiniteQueryOptions(
      this._defaultQueryOptions as UseInfiniteQueryOptions<any> | undefined,
      this._defaultInfiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
      this._infiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
      infiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
    )
    const result = {
      ...megedQueryOptions,
      queryKey,
      queryFn,
      // see _getServerQueryOptions — a legacy `suspense` key must never reach TanStack
      suspense: undefined,
      retryOnMount: redirect ? false : megedQueryOptions.retryOnMount,
      ...(_point0_env.side.is.server
        ? {
            // see _getServerQueryOptions — the same determinism set; `retryOnMount` deliberately
            // rides through from the merge (it decides how an ERRORED query reports itself
            // during SSR: loading state by default, `.error()` under an explicit `false`).
            retry: false,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: Infinity,
            gcTime: Infinity,
          }
        : {
            // redirects, `preventRetry` and the caller's own option — the shared wrapper handles all three
            retry: Point0._retryHonoringPreventRetry(megedQueryOptions.retry as UseQueryOptions['retry']),
          }),
    }
    return result as never
  }

  private _getClientInfiniteQueryOptions({
    input = {} as never,
    infiniteQueryOptions,
    serverData,
  }: {
    input: InputRaw
    serverData?: Data
    infiniteQueryOptions?:
      | PartialUseInfiniteQueryOptions<
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
      point: this as AnyPoint,
      input,
      queryKey,
      mode: 'client' as const,
      error: undefined,
      data: undefined,
    }
    const meta = { point: this.id, input: sanitizeForLog(input), queryKey, mode: _eventData.mode }
    const queryFn = async ({ pageParam }: { pageParam: unknown }) => {
      try {
        this._emit('pointInfiniteQueryStart', _eventData, meta)
        const inputWithPageParam = this._toInputWithPageParam({ input, pageParam })
        const { clientData } = await this._executeClientAsync({
          serverData,
          serverResponse: undefined,
          input: inputWithPageParam as InputRaw<TClientInputSchema>,
        })
        const eventData = {
          ..._eventData,
          redirect: undefined,
          data: clientData as Data,
        }
        this._emit('pointInfiniteQuerySettled', eventData, meta)
        this._emit('pointInfiniteQuerySuccess', eventData, meta)
        return clientData
      } catch (error) {
        const error0 = this._Error.from(error)
        if (error0.redirect) {
          const eventData = {
            ..._eventData,
            error: undefined,
            redirect: error0.redirect,
          }
          const redirectMeta = { ...meta, redirect: error0.redirect.serialize() }
          this._emit('pointInfiniteQuerySettled', eventData, redirectMeta)
          this._emit('pointInfiniteQuerySuccess', eventData, redirectMeta)
          throw error0
        } else {
          const eventData = {
            ..._eventData,
            error: error0,
            redirect: undefined,
          }
          this._emit('pointInfiniteQuerySettled', eventData, meta)
          this._emit('pointInfiniteQueryError', eventData, meta)
          throw error0
        }
      }
    }
    const megedQueryOptions = mergeInfiniteQueryOptions(
      this._defaultQueryOptions as UseInfiniteQueryOptions<any> | undefined,
      this._defaultInfiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
      this._infiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
      infiniteQueryOptions as UseInfiniteQueryOptions<any> | undefined,
    )
    return {
      ...megedQueryOptions,
      queryKey,
      queryFn,
      // see _getServerQueryOptions — a legacy `suspense` key must never reach TanStack
      suspense: undefined,
      // redirects, `preventRetry` and the caller's own option — the shared wrapper handles all three
      retry: Point0._retryHonoringPreventRetry(megedQueryOptions.retry as UseQueryOptions['retry']),
    } as never
  }

  /**
   * Build the fully-resolved infinite-query options for an input — `queryKey`, `queryFn`, `getNextPageParam`,
   * `initialPageParam`, and merged defaults — ready to hand to react-query's `useInfiniteQuery` / `queryClient`
   * directly.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  getInfiniteQueryOptions(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    infiniteQueryOptions?:
      | PartialUseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined,
    options?: {
      queryClient?: QueryClient
      fetchOptions?: FetchOptions | undefined
      outputType?: FetchServerOutputType
    },
  ): UseInfiniteQueryOptions<
    FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
    FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
    TError,
    InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
    QueryKey
  > {
    const { queryClient, fetchOptions, outputType } = options || {}
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = !!this._hasServerLoader
    // only one loader per point — pick whichever exists
    if (hasClientLoader) {
      return this._getClientInfiniteQueryOptions({
        input: input as never,
        infiniteQueryOptions,
      }) as never
    }
    if (hasServerLoader) {
      return this._getServerInfiniteQueryOptions({
        input: input as never,
        infiniteQueryOptions,
        fetchOptions,
        queryClient,
        outputType,
      }) as never
    }
    throw new this._Error(`No loader found on point ${this.toStringWithLocation()}`, {
      code: POINT0_ERROR_CODES_MAP.POINT_NO_LOADER,
      meta: { point: this.id },
    })
  }

  // The option-driven suspension gate (the `suspend` option in ExtraQueryPoint0Options) — the place the
  // framework throws a promise for plain `useQuery`/`useInfiniteQuery` calls (the dedicated
  // suspense hooks have their own tail — see `_suspenseHookResult`).
  //
  // SERVER: fires exclusively in the FINAL streamed SSR render (`__POINT0_SSR_PHASE__ ===
  // 'render'`). During the discovery passes the hook must stay a plain pending result — a suspend
  // there would gate the pass on the loader; the EXECUTOR classifies the marker instead (`'auto'`
  // queries are prefetched and re-rendered as usual, `'server'`/`true` ones are background-kicked).
  // In the final render every pending query with `suspend !== false` suspends: waiting is no
  // longer possible (the shell may already be out), so streaming is the only way to get the data
  // into the same response. `ssr: false` never suspends on the server — suspending would execute
  // the loader the user explicitly excluded from SSR — and a client loader never resolves during
  // SSR at all; both stay pending and render the loading state.
  //
  // CLIENT: only an explicit `suspend: true | 'client'` suspends (client navigations, fresh
  // inputs) — `'auto'`/`'server'` mean nothing after hydration.
  //
  // Throwing `ensureQueryData` (not a bare wait on an existing in-flight fetch) is what makes
  // cascades work: a query revealed only after an outer streamed boundary resolved was never seen
  // by the discovery loop, so the suspend path itself must be able to start the fetch. The thrown
  // thenable must ALWAYS RESOLVE, never reject — Fizz on Bun never retries or aborts a boundary
  // whose suspended thenable rejected; the response would hang open forever. Catching here makes a
  // failed loader resolve the suspension instead: React retries the boundary, the hook re-runs,
  // useQuery reads the ERROR state from the cache, and the chain renders the mountable's
  // `.error()` (streamed in place on the server; the error state is also pushed to the client
  // cache — see the push collector in @point0/engine's render). The failure itself is logged
  // through the normal pointQueryError event pipeline.
  private _maybeSuspendQueryByOption({
    mergedQueryOptions,
    outputType,
    isPending,
    ensure,
    loaderSide,
  }: {
    mergedQueryOptions: {
      queryKey: QueryKey
      enabled?: unknown
      ssr?: boolean
      suspend?: 'auto' | 'server' | 'client' | boolean
    }
    outputType: FetchServerOutputType | undefined
    isPending: boolean
    ensure: () => Promise<unknown>
    loaderSide: 'server' | 'client'
  }): void {
    if (!isPending || (outputType ?? 'data') !== 'data') {
      return
    }
    const suspense = mergedQueryOptions.suspend ?? 'auto'
    if (suspense === false) {
      return
    }
    if (_point0_env.side.is.server) {
      // `'client'` = suspend ONLY on the client — the server half of `false`: never suspends
      // during SSR (a still-pending query ships its loading state, the client fetches after
      // hydration). The mirror of `'server'`, which means nothing on the client.
      if (suspense === 'client') {
        return
      }
      if (loaderSide === 'client') {
        return
      }
      if (_ss.__POINT0_SSR_PHASE__.get() !== 'render') {
        return
      }
      if (mergedQueryOptions.ssr === false) {
        return
      }
    } else if (suspense !== true && suspense !== 'client') {
      return
    }
    // A disabled query is a dependent query waiting for its input — never fetch or suspend it.
    const enabled = mergedQueryOptions.enabled
    if (enabled === false) {
      return
    }
    const cachedQuery = _ss.__POINT0_QUERY_CLIENT__
      .get()
      .getQueryCache()
      .find({ queryKey: mergedQueryOptions.queryKey, exact: true })
    if (typeof enabled === 'function' && cachedQuery && !(enabled as (query: unknown) => boolean)(cachedQuery)) {
      return
    }
    // `isPending` is the OBSERVER's report, and TanStack reports an ERRORED query as
    // optimistically pending to a FRESH observer when `retryOnMount` is truthy ("a mount will
    // retry me" — gotcha #4). A suspended component never commits, so every Suspense retry
    // creates another fresh observer — trusting the report loops forever: suspend →
    // ensure-refetch → reject → resolve → retry render → optimistic pending → suspend… Read the
    // CACHE underneath instead: an errored query never suspends here — the component commits and
    // the error arrives as STATE (the option gate never turns a query error into a boundary
    // throw). On the client TanStack's own `retryOnMount` refetch (if any) then runs as a normal
    // state transition. On the SERVER the same read is what makes the un-forced `retryOnMount`
    // safe: with the truthy default the optimistic report renders the loading state (never a
    // re-suspend), with an explicit `false` the observer reports the error honestly and this
    // gate is not even reached.
    if (cachedQuery?.state.status === 'error') {
      return
    }
    throw ensure().catch(() => undefined)
  }

  // Shared tail of `useSuspenseQuery`/`useSuspenseInfiniteQuery` — TanStack v5 suspense semantics
  // on top of the framework's SSR phases:
  //  - success → return the result (`data` is non-optional in types, and here it is real).
  //  - error → THROW it to the nearest ErrorBoundary (the mountable's positional `.error()`). On
  //    the server a render throw ships the boundary's loading fallback and the CLIENT retries and
  //    renders `.error()` — the same containment any render throw gets.
  //  - pending, client → throw the always-resolving ensure (standard suspense; lands in the
  //    positional Suspense boundary, the fetch starts right here).
  //  - pending, server, final render → throw the always-resolving ensure (streams; this is also
  //    what makes cascades under suspense hooks work). If the loader cannot run here (`ssr: false`
  //    merged in from defaults, or a client loader) — throw a descriptive render error instead:
  //    the HTML ships the fallback and the client retries after hydration (a never-resolving throw
  //    would hang the open response forever).
  //  - pending, server, discovery → throw a promise that NEVER resolves: a pure "paused subtree"
  //    marker. Discovery awaits only the shell, so nothing waits on it; the query registered
  //    itself in the cache BEFORE the throw, so the executor sees the marker (the hook forces
  //    `suspend: true`) and background-kicks the fetch (HTML mode) or skips it (data-only mode).
  private _suspenseHookResult<TResult extends { status: 'pending' | 'error' | 'success'; error: unknown }>({
    result,
    mergedQueryOptions,
    ensure,
    loaderSide,
  }: {
    result: TResult
    mergedQueryOptions: { ssr?: boolean; queryKey: QueryKey }
    ensure: () => Promise<unknown>
    loaderSide: 'server' | 'client'
  }): TResult {
    if (result.status === 'error') {
      throw result.error
    }
    if (result.status !== 'pending') {
      return result
    }
    // `result.status` is the OBSERVER's report, and TanStack reports an ERRORED query as
    // optimistically pending to a FRESH observer when `retryOnMount` is truthy — and a suspended
    // component never commits, so every Suspense retry creates another fresh observer. Trusting
    // the report would refetch → reject → retry forever. Read the CACHE underneath: an errored
    // query THROWS its error (TanStack suspense semantics — the boundary renders the positional
    // `.error()`). This is also what makes the post-hydration retry of a failed streamed
    // suspense query read the PUSHED error state without a refetch. Note the deliberate
    // deviation on the server: `retryOnMount` is not forced there and a truthy value makes the
    // observer report an errored query as pending — but a "retry on mount" cannot happen during
    // SSR (nothing mounts), so the suspense hooks ignore the optimism and throw the cached error
    // either way; the CLIENT half keeps native TanStack behavior.
    const cachedQuery = _ss.__POINT0_QUERY_CLIENT__
      .get()
      .getQueryCache()
      .find({ queryKey: mergedQueryOptions.queryKey, exact: true })
    if (cachedQuery?.state.status === 'error') {
      throw cachedQuery.state.error
    }
    if (_point0_env.side.is.server) {
      if (_ss.__POINT0_SSR_PHASE__.get() === 'render') {
        if (loaderSide === 'client' || mergedQueryOptions.ssr === false) {
          throw new Error(
            `useSuspenseQuery on point ${this.toStringWithLocation()} cannot resolve during SSR (${
              loaderSide === 'client' ? 'the point has a client loader' : 'the query is declared `ssr: false`'
            }); the HTML ships the Suspense fallback and the client retries after hydration`,
          )
        }
        throw ensure().catch(() => undefined)
      }
      throw new Promise(() => undefined)
    }
    throw ensure().catch(() => undefined)
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
    const serverQueryOptions = this._getServerQueryOptions({ input, queryOptions, fetchOptions, outputType })
    const result = useQuery(serverQueryOptions)
    this._maybeSuspendQueryByOption({
      mergedQueryOptions: serverQueryOptions as never,
      outputType,
      isPending: result.isPending,
      ensure: () => _ss.__POINT0_QUERY_CLIENT__.get().ensureQueryData(serverQueryOptions as never),
      loaderSide: 'server',
    })
    return result
  }

  private _useClientQuery({
    input = {} as never,
    queryOptions,
  }: {
    input: InputRaw
    queryOptions?: ExtraUseQueryOptions | undefined
  }): UseQueryResult<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>, TError> {
    const clientQueryOptions = this._getClientQueryOptions({
      input,
      queryOptions,
    })
    const result = useQuery(clientQueryOptions)
    this._maybeSuspendQueryByOption({
      mergedQueryOptions: clientQueryOptions as never,
      outputType: undefined,
      isPending: result.isPending,
      ensure: () => _ss.__POINT0_QUERY_CLIENT__.get().ensureQueryData(clientQueryOptions as never),
      loaderSide: 'client',
    })
    return result
  }

  private _useServerInfiniteQuery({
    input = {} as never,
    infiniteQueryOptions: providedInfiniteQueryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputRaw
    infiniteQueryOptions:
      | PartialUseInfiniteQueryOptions<
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
    const result = useInfiniteQuery(infiniteQueryOptions)
    this._maybeSuspendQueryByOption({
      mergedQueryOptions: infiniteQueryOptions as never,
      outputType,
      isPending: result.isPending,
      ensure: () => _ss.__POINT0_QUERY_CLIENT__.get().ensureInfiniteQueryData(infiniteQueryOptions as never),
      loaderSide: 'server',
    })
    return result as never
  }

  private _useClientInfiniteQuery({
    input = {} as never,
    infiniteQueryOptions: providedInfiniteQueryOptions,
  }: {
    input: InputRaw
    infiniteQueryOptions?:
      | PartialUseInfiniteQueryOptions<
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
    })
    const result = useInfiniteQuery(infiniteQueryOptions)
    this._maybeSuspendQueryByOption({
      mergedQueryOptions: infiniteQueryOptions as never,
      outputType: undefined,
      isPending: result.isPending,
      ensure: () => _ss.__POINT0_QUERY_CLIENT__.get().ensureInfiniteQueryData(infiniteQueryOptions as never),
      loaderSide: 'client',
    })
    return result as never
  }

  /**
   * The mutation's key tuple — takes NO arguments (unlike `getQueryKey`), since a mutation has one key regardless of
   * input. Use it to find this mutation's entries in the mutation cache.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaCreateMutation.getMutationKey()
   *
   * Full reference: https://1gr14.dev/point0/latest/mutation
   */
  getMutationKey(): MutationKey {
    return [POINT0_QUERY_KEY_NAMESPACE, { scope: this.scope, type: this.type, name: this.name, tags: this.tags }]
  }

  /**
   * Build the resolved react-query `MutationOptions` (key, `mutationFn`, merged defaults) — ready to hand to TanStack's
   * `useMutation` / `queryClient` directly.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/mutation
   */
  getMutationOptions(
    mutationOptions?: ExtraUseMutationOptions,
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
        point: this as AnyPoint,
        input,
        error: undefined,
        output: undefined,
        redirect: undefined,
      }
      const meta = { point: this.id, input: sanitizeForLog(input) }
      const handleRedirect = async (redirect: RedirectTask) => {
        const redirectEventData = {
          ...eventData,
          error: undefined,
          output: undefined,
          redirect,
        }
        const redirectMeta = { ...meta, redirect: redirect.serialize() }
        this._emit('pointMutationSettled', redirectEventData, redirectMeta)
        this._emit('pointMutationSuccess', redirectEventData, redirectMeta)
        await getNavigationHelpers().navigate.to(redirect.to, redirect.options)
        return redirect as never as FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
      }
      this._emit('pointMutationStart', eventData, meta)
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
        if (serverFetchResult?.redirect) {
          return await handleRedirect(serverFetchResult.redirect)
        }
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
          this._emit('pointMutationSettled', { ...eventData, output: clientOutput }, meta)
          this._emit('pointMutationSuccess', { ...eventData, output: clientOutput }, meta)
          return clientOutput as FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
        }
        if (!serverFetchResult?.output) {
          throw new Error(`Server output is not set on point ${this.toStringWithLocation()}`)
        }
        this._emit('pointMutationSettled', { ...eventData, output: serverFetchResult.output }, meta)
        this._emit('pointMutationSuccess', { ...eventData, output: serverFetchResult.output }, meta)
        return serverFetchResult.output as never as FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
      } catch (error) {
        const error0 = this._Error.from(error)
        if (error0.redirect) {
          return await handleRedirect(error0.redirect)
        }
        this._emit('pointMutationSettled', { ...eventData, error: error0 }, meta)
        this._emit('pointMutationError', { ...eventData, error: error0 }, meta)
        throw error0
      }
    }
    const mutationKey = this.getMutationKey()
    const megedMutationOptions = mergeMutationOptions(
      this._defaultMutationOptions,
      this._mutationOptions,
      mutationOptions,
    )
    return {
      ...megedMutationOptions,
      mutationFn,
      mutationKey,
      retry: Point0._retryHonoringPreventRetry(megedMutationOptions.retry as UseQueryOptions['retry'], 0),
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

  /**
   * Get the single `Mutation` cache entry matching an exact input (`undefined` if none) — for inspecting a specific
   * call's state. For an array of matches use `getMutationsCache`.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/mutation
   */
  getMutationCache = (
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: { queryClient?: QueryClient },
  ):
    | Mutation<
        FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
        TError,
        FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>
      >
    | undefined => {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const cache = queryClient.getMutationCache()
    const inputStringifiedProvided = stringifyOrThrow(this._getTransformer(), input || {}, this.id)
    return cache.find({
      predicate: (mutation) => {
        const mutationKey = mutation.options.mutationKey as MutationKey
        const obj = parseMutationKey(mutationKey)
        if (!obj) {
          return false
        }
        if (obj.scope !== this.scope) {
          return false
        }
        if (obj.type !== this.type) {
          return false
        }
        if (obj.name !== this.name) {
          return false
        }
        // `|| {}` on BOTH sides: a mutation fired with no input carries `undefined` variables, and by the point0
        // standard that IS the `{}` input — without the coercion the two sides could never compare equal
        const inputStringified = stringifyOrThrow(this._getTransformer(), mutation.state.variables || {}, this.id)
        if (inputStringified !== inputStringifiedProvided) {
          return false
        }
        return true
      },
    }) as never
  }

  /**
   * Get an array of `Mutation` cache entries for this mutation — match by exact input (variables), a predicate over
   * variables, or pass `true` for all entries. Always returns an array.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaCreateMutation.getMutationsCache({ id: 1 }) // exact input
   *     ideaCreateMutation.getMutationsCache((v) => v.id === 1) // predicate over variables
   *     ideaCreateMutation.getMutationsCache(true) // all entries
   *
   * Full reference: https://1gr14.dev/point0/latest/mutation
   */
  getMutationsCache = (
    input?:
      | FinalInputRawOrUndefined<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRawOrUndefined<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | undefined
      | true,
    options?: { queryClient?: QueryClient },
  ): Array<
    Mutation<
      FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>,
      TError,
      FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>
    >
  > => {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const cache = queryClient.getMutationCache()
    const { inputStringifiedProvided, inputFunctionProvided, inputAnyProvided } = (() => {
      if (input === true || !input) {
        return {
          inputStringifiedProvided: undefined,
          inputFunctionProvided: undefined,
          inputAnyProvided: input,
        }
      }
      if (typeof input === 'function') {
        return {
          inputStringifiedProvided: undefined,
          inputFunctionProvided: input,
          inputAnyProvided: undefined,
        }
      }
      return {
        inputStringifiedProvided: stringifyOrThrow(this._getTransformer(), input, this.id),
        inputFunctionProvided: undefined,
        inputAnyProvided: undefined,
      }
    })()

    return cache.findAll({
      predicate: (mutation) => {
        const obj = parseMutationKey(mutation.options.mutationKey)
        if (!obj) {
          return false
        }
        if (obj.scope !== this.scope) {
          return false
        }
        if (obj.type !== this.type) {
          return false
        }
        if (obj.name !== this.name) {
          return false
        }
        if (inputAnyProvided) {
          // continue
        } else if (inputStringifiedProvided) {
          // `|| {}` — see `getMutationCache`: no input means the `{}` input, on both sides of the compare
          const inputStringified = stringifyOrThrow(this._getTransformer(), mutation.state.variables || {}, this.id)
          if (inputStringified !== inputStringifiedProvided) {
            return false
          }
        } else if (inputFunctionProvided) {
          const checkResult = inputFunctionProvided(mutation.state.variables as never)
          if (checkResult === false) {
            return false
          }
        }
        return true
      },
    }) as never
  }

  /**
   * The mutation's `useMutation` hook — returns the standard TanStack `UseMutationResult`. Pass the input to `mutate` /
   * `mutateAsync`, not to the hook. Per-call options merge over the defaults set at close.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     const m = ideaCreateMutation.useMutation()
   *     await m.mutateAsync({ title, content })
   *
   * Full reference: https://1gr14.dev/point0/latest/mutation
   */
  useMutation = (
    mutationOptions?: ExtraUseMutationOptions | undefined,
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

  /**
   * Run the mutation imperatively, outside React — input first, returns a `Promise` of the data. The non-hook
   * counterpart to `useMutation` for event handlers, loaders, and plain functions.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     const { idea } = await ideaUpdateMutation.fetchMutation({ id, title })
   *
   * Full reference: https://1gr14.dev/point0/latest/mutation
   */
  fetchMutation = async (
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    mutationOptions?: ExtraUseMutationOptions | undefined,
    options?: { fetchOptions?: FetchOptions | undefined; queryClient?: QueryClient },
  ): Promise<FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>> => {
    const normalizedMutationOptions = this.getMutationOptions(mutationOptions, options)
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const mutation = queryClient.getMutationCache().build(queryClient, normalizedMutationOptions as any)
    return (await mutation.execute(input as any)) as FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
  }

  fetch = async (
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    fetchOptions?: FetchOptions,
  ): Promise<FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>> => {
    if (!this._queryResultType) {
      return this.fetchMutation(input, undefined, { fetchOptions })
    }
    if (this._queryResultType === 'infiniteQuery') {
      const result = await this.fetchInfiniteQuery(input, undefined, { fetchOptions })
      return result?.pages[0] as never
    }
    return this.fetchQuery(input, undefined, { fetchOptions }) as never
  }

  _getQueryPredicate({
    mode: modeProvided = this._getFinalQueryMode(),
    outputType: outputTypeProvided = 'data',
    input: inputProvided,
    finiteOrInfinite: finiteOrInfiniteProvided,
  }: {
    mode?: QueryMode
    outputType: FetchServerOutputType | undefined
    input: InputRaw | ((input: InputRaw) => boolean) | true | undefined
    finiteOrInfinite: 'finite' | 'infinite'
  }): (query: Query) => boolean {
    const { inputStringifiedProvided, inputFunctionProvided, inputAnyProvided } = (() => {
      if (inputProvided === true || !inputProvided) {
        return {
          inputStringifiedProvided: undefined,
          inputFunctionProvided: undefined,
          inputAnyProvided: inputProvided,
        }
      }
      if (typeof inputProvided === 'function') {
        return {
          inputStringifiedProvided: undefined,
          inputFunctionProvided: inputProvided,
          inputAnyProvided: undefined,
        }
      }
      return {
        inputStringifiedProvided: stringifyOrThrow(this._getTransformer(), inputProvided, this.id),
        inputFunctionProvided: undefined,
        inputAnyProvided: undefined,
      }
    })()
    return (query) => {
      const obj = parseQueryKey(query.queryKey)
      if (!obj) {
        return false
      }
      if (obj.scope !== this.scope) {
        return false
      }
      if (obj.type !== this.type) {
        return false
      }
      if (obj.name !== this.name) {
        return false
      }
      if (obj.mode !== modeProvided) {
        return false
      }
      if (obj.finiteness !== finiteOrInfiniteProvided) {
        return false
      }
      if (obj.output !== outputTypeProvided) {
        return false
      }
      const inputStringified = obj.input
      if (inputAnyProvided) {
        // continue
      } else if (inputStringifiedProvided) {
        if (inputStringified !== inputStringifiedProvided) {
          return false
        }
      } else if (inputFunctionProvided) {
        const inputParsed = this._getTransformer().parse<InputRaw>(inputStringified)
        const checkResult = inputFunctionProvided(inputParsed as never)
        if (checkResult === false) {
          return false
        }
      }
      return true
    }
  }

  /**
   * Build the TanStack `QueryFilters` used by the cache-acting methods (invalidate / remove / reset / cancel /
   * refetch).
   *
   * Two shapes, picked from `input`:
   *
   * - an exact input (object / `undefined` / omitted) → an exact-key filter (`{ queryKey, exact: true }`), the precise
   *   single-entry match the methods have always used;
   * - a predicate `(input) => boolean` or `true` → a predicate filter built from {@link _getQueryPredicate}, matching many
   *   entries of this point regardless of input (`true` = every entry).
   */
  _getQueryFilters({
    input,
    outputType,
    finiteOrInfinite,
  }: {
    input: InputRaw | ((input: InputRaw) => boolean) | true | undefined
    outputType?: FetchServerOutputType
    finiteOrInfinite: 'finite' | 'infinite'
  }): QueryFilters {
    if (input === true || typeof input === 'function') {
      return {
        predicate: this._getQueryPredicate({ outputType, input, finiteOrInfinite }),
      }
    }
    const queryKey =
      finiteOrInfinite === 'infinite'
        ? this.getInfiniteQueryKey(input as never, { outputType })
        : this.getQueryKey(input as never, { outputType })
    return { queryKey, exact: true }
  }

  /**
   * Imperatively fetch and cache the query, outside React — input first, returns a `Promise` of the data. Reads the
   * cache if fresh; otherwise runs the loader. Use it in event handlers, loaders, or other queries.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     const { idea } = await ideaQuery.fetchQuery({ id: 123 })
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  async fetchQuery(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    queryOptions?: ExtraUseQueryOptions | undefined,
    options?: {
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      outputType?: FetchServerOutputType
    },
  ): Promise<QueriedFiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const normalizedQueryOptions = this.getQueryOptions(input, queryOptions, options)
    return (await queryClient.fetchQuery(normalizedQueryOptions)) as never
  }

  /**
   * Read this query's cached data for an input synchronously, without fetching — `undefined` if nothing is cached.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  getQueryData(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): QueriedFiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>> | undefined {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const queryKey = this.getQueryKey(input, options)
    return queryClient.getQueryData(queryKey) as never
  }

  /**
   * Warm the cache for an input without returning the data (`Promise<void>`) — fetches only if not already cached.
   * Ideal for prefetching on hover or before navigation.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  async prefetchQuery(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    queryOptions?: ExtraUseQueryOptions | undefined,
    options?: {
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      outputType?: FetchServerOutputType
    },
  ): Promise<void> {
    const normalizedQueryOptions = this.getQueryOptions(input, queryOptions, options)
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    await queryClient.prefetchQuery(normalizedQueryOptions as never)
  }

  /**
   * Return the cached data for an input if present, otherwise fetch it — like `fetchQuery` but never refetches when
   * data already exists. Returns a `Promise` of the data.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  async ensureQueryData(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    queryOptions?: ExtraUseQueryOptions | undefined,
    options?: {
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      outputType?: FetchServerOutputType
    },
  ): Promise<QueriedFiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const normalizedQueryOptions = this.getQueryOptions(input, queryOptions, options)
    return (await queryClient.ensureQueryData(normalizedQueryOptions)) as never
  }

  /**
   * Force a refetch of this query, ignoring staleness (`Promise<void>`). Target by exact input, by a predicate `(input)
   * => boolean`, or pass `true` to refetch every entry of this query regardless of input.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaQuery.refetchQuery({ id: 1 }) // exact input
   *     ideaQuery.refetchQuery((i) => i.id > 10) // predicate
   *     ideaQuery.refetchQuery(true) // every entry of this query
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  async refetchQuery(
    input:
      | FinalInputRawOrUndefinedOrVoid<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true,
    refetchOptions?: RefetchOptions,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): Promise<void> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const filters = this._getQueryFilters({
      input: input as never,
      outputType: options?.outputType,
      finiteOrInfinite: 'finite',
    })
    await queryClient.refetchQueries(filters, refetchOptions)
  }

  /**
   * Write this query's cache for an input directly — `updater` is a value or `(prev) => next`. Returns the new data.
   * For an optimistic value to stick, set `staleTime: Infinity` so it isn't immediately refetched. Exact-key.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  setQueryData(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    updater: Updater<
      // react-query passes `undefined` to the functional updater when the cache is empty (no entry yet), so the `old`
      // param is nullable — matching runtime, letting recipes write `(old) => old?.field ?? …` without a widening cast.
      FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput> | undefined,
      FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>
    >,
    setDataOptions?: SetDataOptions,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput> {
    const queryKey = this.getQueryKey(input, options)
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    return queryClient.setQueryData(queryKey, updater, setDataOptions) as FinalLoaderData<
      TServerLoaderOutput,
      TClientLoaderOutput
    >
  }

  /**
   * Get the single TanStack `Query` cache entry for an exact input (`undefined` if none) — the low-level cache object,
   * for inspecting state or observers. For many entries use `getQueriesCache`.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  getQueryCache(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ):
    | Query<
        FinalQueriedFiniteData<TServerLoaderOutput, TClientLoaderOutput>,
        TError,
        FinalQueriedFiniteData<TServerLoaderOutput, TClientLoaderOutput>,
        QueryKey
      >
    | undefined {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const cache = queryClient.getQueryCache()
    const queryKey = this.getQueryKey(input, options)
    return cache.find({ queryKey, exact: true }) as never
  }

  /**
   * Get an array of `Query` cache entries for this query — match by exact input, by a predicate, or pass `true` for
   * every entry of this query. The fuzzy counterpart to the exact-key `getQueryCache`.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaQuery.getQueriesCache({ id: 1 }) // exact input
   *     ideaQuery.getQueriesCache((i) => i.id > 10) // predicate
   *     ideaQuery.getQueriesCache(true) // all entries for this query
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  getQueriesCache(
    input?:
      | FinalInputRawOrUndefined<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true
      | undefined,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): Array<
    Query<
      FinalQueriedFiniteData<TServerLoaderOutput, TClientLoaderOutput>,
      TError,
      FinalQueriedFiniteData<TServerLoaderOutput, TClientLoaderOutput>,
      QueryKey
    >
  > {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const { outputType } = options ?? {}
    const cache = queryClient.getQueryCache()
    return cache.findAll({
      predicate: this._getQueryPredicate({
        outputType,
        input,
        finiteOrInfinite: 'finite',
      }),
    }) as never
  }

  /**
   * Read the TanStack `QueryState` for an exact input (`status`, `fetchStatus`, `dataUpdatedAt`, `error`, …), or
   * `undefined` if uncached — for inspecting state without subscribing.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  getQueryState(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): QueryState<FinalQueriedFiniteData<TServerLoaderOutput, TClientLoaderOutput>, TError> | undefined {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const queryKey = this.getQueryKey(input, options)
    return queryClient.getQueryState(queryKey) as never
  }

  /**
   * Cancel any in-flight fetch for this query (`Promise<void>`) — typically before an optimistic `setQueryData` so a
   * racing response doesn't clobber it. Target by exact input, by a predicate `(input) => boolean`, or pass `true` to
   * cancel every entry of this query regardless of input.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaQuery.cancelQuery({ id: 1 }) // exact input
   *     ideaQuery.cancelQuery((i) => i.id > 10) // predicate
   *     ideaQuery.cancelQuery(true) // every entry of this query
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  async cancelQuery(
    input:
      | FinalInputRawOrUndefinedOrVoid<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true,
    cancelOptions?: CancelOptions,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): Promise<void> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const filters = this._getQueryFilters({
      input: input as never,
      outputType: options?.outputType,
      finiteOrInfinite: 'finite',
    })
    await queryClient.cancelQueries(filters, cancelOptions)
  }

  /**
   * Mark this query stale and refetch it if active (`Promise<void>`) — the usual way to refresh after a mutation.
   * Target by exact input, by a predicate `(input) => boolean`, or pass `true` to invalidate every entry of this query
   * regardless of input.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaQuery.invalidateQuery({ id: 1 }) // exact input
   *     ideaQuery.invalidateQuery((i) => i.id > 10) // predicate
   *     ideaQuery.invalidateQuery(true) // every entry of this query
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  async invalidateQuery(
    input:
      | FinalInputRawOrUndefinedOrVoid<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true,
    invalidateOptions?: InvalidateOptions,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): Promise<void> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const filters = this._getQueryFilters({
      input: input as never,
      outputType: options?.outputType,
      finiteOrInfinite: 'finite',
    })
    await queryClient.invalidateQueries(filters, invalidateOptions)
  }

  /**
   * Drop this query from the cache entirely (`void`) — no refetch, the entry is gone. Target by exact input, by a
   * predicate `(input) => boolean`, or pass `true` to remove every entry of this query regardless of input.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaQuery.removeQuery({ id: 1 }) // exact input
   *     ideaQuery.removeQuery((i) => i.id > 10) // predicate
   *     ideaQuery.removeQuery(true) // every entry of this query
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  removeQuery(
    input:
      | FinalInputRawOrUndefinedOrVoid<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): void {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const filters = this._getQueryFilters({
      input: input as never,
      outputType: options?.outputType,
      finiteOrInfinite: 'finite',
    })
    queryClient.removeQueries(filters)
  }

  /**
   * Reset this query to its initial state and refetch if active (`Promise<void>`) — clears data/error, not just
   * staleness. Target by exact input, by a predicate `(input) => boolean`, or pass `true` to reset every entry of this
   * query regardless of input.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaQuery.resetQuery({ id: 1 }) // exact input
   *     ideaQuery.resetQuery((i) => i.id > 10) // predicate
   *     ideaQuery.resetQuery(true) // every entry of this query
   *
   * Full reference: https://1gr14.dev/point0/latest/query
   */
  async resetQuery(
    input:
      | FinalInputRawOrUndefinedOrVoid<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true,
    resetOptions?: ResetOptions,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): Promise<void> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const filters = this._getQueryFilters({
      input: input as never,
      outputType: options?.outputType,
      finiteOrInfinite: 'finite',
    })
    await queryClient.resetQueries(filters, resetOptions)
  }

  /**
   * Imperatively fetch and cache the infinite query, outside React — input first, returns a `Promise` of the
   * `InfiniteData` (`{ pages, pageParams }`). Reads the cache if fresh; otherwise runs the loader for the first page.
   * Use it in event handlers, loaders, or other queries.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     const { pages } = await ideaFeed.fetchInfiniteQuery({ q })
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  async fetchInfiniteQuery(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    infiniteQueryOptions?:
      | PartialUseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined,
    options?: {
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      outputType?: FetchServerOutputType
    },
  ): Promise<QueriedInfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const normalizedInfiniteQueryOptions = this.getInfiniteQueryOptions(input, infiniteQueryOptions, options)
    return (await queryClient.fetchInfiniteQuery(normalizedInfiniteQueryOptions)) as never
  }

  /**
   * Warm the infinite cache for an input without returning the data (`Promise<void>`) — fetches the first page only if
   * not already cached. Ideal for prefetching on hover or before navigation.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  async prefetchInfiniteQuery(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    infiniteQueryOptions?:
      | PartialUseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined,
    options?: {
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      outputType?: FetchServerOutputType
    },
  ): Promise<void> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const normalizedInfiniteQueryOptions = this.getInfiniteQueryOptions(input, infiniteQueryOptions, options)
    await queryClient.prefetchInfiniteQuery(normalizedInfiniteQueryOptions as never)
  }

  /**
   * Return the cached `InfiniteData` for an input if present, otherwise fetch it — like `fetchInfiniteQuery` but never
   * refetches when data already exists. Returns a `Promise` of the data.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  async ensureInfiniteQueryData(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    infiniteQueryOptions?:
      | PartialUseInfiniteQueryOptions<
          FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
          FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
          TError,
          InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
          QueryKey,
          unknown
        >
      | undefined,
    options?: {
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      outputType?: FetchServerOutputType
    },
  ): Promise<QueriedInfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const normalizedInfiniteQueryOptions = this.getInfiniteQueryOptions(input, infiniteQueryOptions, options)
    return (await queryClient.ensureInfiniteQueryData(normalizedInfiniteQueryOptions)) as never
  }

  /**
   * Read this infinite query's cached `InfiniteData` for an input synchronously, without fetching — `undefined` if
   * nothing is cached.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  getInfiniteQueryData(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): QueriedInfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>> | undefined {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const queryKey = this.getInfiniteQueryKey(input, options)
    return queryClient.getQueryData(queryKey) as never
  }

  /**
   * Force a refetch of this infinite query, ignoring staleness (`Promise<void>`). Target by exact input, by a predicate
   * `(input) => boolean`, or pass `true` to refetch every entry of this infinite query regardless of input.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaFeed.refetchInfiniteQuery({ q }) // exact input
   *     ideaFeed.refetchInfiniteQuery((i) => i.q === 'react') // predicate
   *     ideaFeed.refetchInfiniteQuery(true) // every entry of this infinite query
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  async refetchInfiniteQuery(
    input:
      | FinalInputRawOrUndefinedOrVoid<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true,
    refetchOptions?: RefetchOptions,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): Promise<void> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const filters = this._getQueryFilters({
      input: input as never,
      outputType: options?.outputType,
      finiteOrInfinite: 'infinite',
    })
    await queryClient.refetchQueries(filters, refetchOptions)
  }

  /**
   * Write this infinite query's cache for an input directly — `updater` is a value or `(prev) => next` over the
   * `InfiniteData` (`{ pages, pageParams }`). Returns the new data. For an optimistic value to stick, set `staleTime:
   * Infinity` so it isn't immediately refetched. Exact-key.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  setInfiniteQueryData(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    updater: Updater<
      // nullable `old` — react-query passes `undefined` to the functional updater when there is no cache entry yet.
      InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>> | undefined,
      InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
    >,
    setDataOptions?: SetDataOptions,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const queryKey = this.getInfiniteQueryKey(input, options)
    return queryClient.setQueryData(queryKey, updater, setDataOptions) as InfiniteData<
      FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>
    >
  }

  /**
   * Get the single TanStack `Query` cache entry for this infinite query's exact input (`undefined` if none) — the
   * low-level cache object, for inspecting state or observers. For many entries use `getInfiniteQueriesCache`.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  getInfiniteQueryCache(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ):
    | Query<
        FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
        TError,
        FinalQueriedInfiniteData<TServerLoaderOutput, TClientLoaderOutput>,
        QueryKey
      >
    | undefined {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const cache = queryClient.getQueryCache()
    const queryKey = this.getInfiniteQueryKey(input, options)
    const query = cache.find({ queryKey, exact: true })
    return query as never
  }

  /**
   * Get an array of `Query` cache entries for this infinite query — match by exact input, by a predicate, or pass
   * `true` for every entry of this infinite query. The fuzzy counterpart to the exact-key `getInfiniteQueryCache`.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaFeed.getInfiniteQueriesCache({ q }) // exact input
   *     ideaFeed.getInfiniteQueriesCache((i) => i.q === 'react') // predicate
   *     ideaFeed.getInfiniteQueriesCache(true) // all entries for this infinite query
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  getInfiniteQueriesCache(
    input?:
      | FinalInputRawOrUndefined<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true
      | undefined,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): Array<
    Query<
      FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
      TError,
      FinalQueriedInfiniteData<TServerLoaderOutput, TClientLoaderOutput>,
      QueryKey
    >
  > {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const { outputType } = options ?? {}
    const cache = queryClient.getQueryCache()
    return cache.findAll({
      predicate: this._getQueryPredicate({
        outputType,
        input,
        finiteOrInfinite: 'infinite',
      }),
    }) as never
  }

  /**
   * Read the TanStack `QueryState` for this infinite query's exact input (`status`, `fetchStatus`, `dataUpdatedAt`,
   * `error`, …), or `undefined` if uncached — for inspecting state without subscribing.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  getInfiniteQueryState(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): QueryState<FinalQueriedInfiniteData<TServerLoaderOutput, TClientLoaderOutput>, TError> | undefined {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const queryKey = this.getInfiniteQueryKey(input, options)
    return queryClient.getQueryState(queryKey) as never
  }

  /**
   * Cancel any in-flight fetch for this infinite query (`Promise<void>`). Target by exact input, by a predicate
   * `(input) => boolean`, or pass `true` to cancel every entry of this infinite query regardless of input.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaFeed.cancelInfiniteQuery({ q }) // exact input
   *     ideaFeed.cancelInfiniteQuery((i) => i.q === 'react') // predicate
   *     ideaFeed.cancelInfiniteQuery(true) // every entry of this infinite query
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  async cancelInfiniteQuery(
    input:
      | FinalInputRawOrUndefinedOrVoid<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true,
    cancelOptions?: CancelOptions,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): Promise<void> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const filters = this._getQueryFilters({
      input: input as never,
      outputType: options?.outputType,
      finiteOrInfinite: 'infinite',
    })
    await queryClient.cancelQueries(filters, cancelOptions)
  }

  /**
   * Mark this infinite query stale and refetch it if active (`Promise<void>`) — the usual way to refresh after a
   * mutation. Target by exact input, by a predicate `(input) => boolean`, or pass `true` to invalidate every entry of
   * this infinite query regardless of input.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaFeed.invalidateInfiniteQuery({ q }) // exact input
   *     ideaFeed.invalidateInfiniteQuery((i) => i.q === 'react') // predicate
   *     ideaFeed.invalidateInfiniteQuery(true) // every entry of this infinite query
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  async invalidateInfiniteQuery(
    input:
      | FinalInputRawOrUndefinedOrVoid<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true,
    invalidateOptions?: InvalidateOptions,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): Promise<void> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const filters = this._getQueryFilters({
      input: input as never,
      outputType: options?.outputType,
      finiteOrInfinite: 'infinite',
    })
    await queryClient.invalidateQueries(filters, invalidateOptions)
  }

  /**
   * Drop this infinite query from the cache entirely (`void`) — no refetch, the entry is gone. Target by exact input,
   * by a predicate `(input) => boolean`, or pass `true` to remove every entry of this infinite query regardless of
   * input.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaFeed.removeInfiniteQuery({ q }) // exact input
   *     ideaFeed.removeInfiniteQuery((i) => i.q === 'react') // predicate
   *     ideaFeed.removeInfiniteQuery(true) // every entry of this infinite query
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  removeInfiniteQuery(
    input:
      | FinalInputRawOrUndefinedOrVoid<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): void {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const filters = this._getQueryFilters({
      input: input as never,
      outputType: options?.outputType,
      finiteOrInfinite: 'infinite',
    })
    queryClient.removeQueries(filters)
  }

  /**
   * Reset this infinite query to its initial state and refetch if active (`Promise<void>`) — clears data/error, not
   * just staleness. Target by exact input, by a predicate `(input) => boolean`, or pass `true` to reset every entry of
   * this infinite query regardless of input.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     ideaFeed.resetInfiniteQuery({ q }) // exact input
   *     ideaFeed.resetInfiniteQuery((i) => i.q === 'react') // predicate
   *     ideaFeed.resetInfiniteQuery(true) // every entry of this infinite query
   *
   * Full reference: https://1gr14.dev/point0/latest/infinite-query
   */
  async resetInfiniteQuery(
    input:
      | FinalInputRawOrUndefinedOrVoid<
          TPointType,
          TServerInputSchema,
          TClientInputSchema,
          TParamsSchema,
          TSearchSchema,
          TBodySchema
        >
      | ((
          input: FinalInputRaw<
            TPointType,
            TServerInputSchema,
            TClientInputSchema,
            TParamsSchema,
            TSearchSchema,
            TBodySchema
          >,
        ) => boolean)
      | true,
    resetOptions?: ResetOptions,
    options?: {
      queryClient?: QueryClient
      outputType?: FetchServerOutputType
    },
  ): Promise<void> {
    const queryClient = options?.queryClient ?? _ss.__POINT0_QUERY_CLIENT__.get()
    const filters = this._getQueryFilters({
      input: input as never,
      outputType: options?.outputType,
      finiteOrInfinite: 'infinite',
    })
    await queryClient.resetQueries(filters, resetOptions)
  }

  private async _prefetchPageQueryClientDehydratedState({
    input = {} as never,
    queryClient = _ss.__POINT0_QUERY_CLIENT__.get(),
    queryOptions,
    fetchOptions,
  }: {
    input: InputRaw
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions
    fetchOptions?: FetchOptions
  }): Promise<void> {
    if (this.type !== 'page') {
      throw new Error(`Point type is not page on point ${this.toStringWithLocation()}`)
    }
    const _queryOptions = this._getServerQueryOptions({
      input,
      queryOptions,
      fetchOptions,
      outputType: 'queryClientDehydratedState',
      queryClient,
    })
    const data = (await queryClient.fetchQuery(_queryOptions).catch((error) => {
      log({
        level: 'error',
        category: ['client', 'prefetchPage'],
        message: `Error prefetching page ${this.toStringWithLocation()}`,
        error,
      })
    })) as any
    if (data?.dehydratedState) {
      hydrate(queryClient, data.dehydratedState)
      // The store now owns these queries; swap the cached snapshot for a live view so the next
      // prefetch re-hydrate (while this query is still fresh) reads the current store instead of
      // resurrecting removed queries — missing ones simply re-fetch on demand.
      data.dehydratedState = toLiveDehydratedState(data.dehydratedState, queryClient)
    }
  }

  // The merged `ssr` + `suspend` query options (see ExtraQueryPoint0Options), read without
  // building the full query options (no input, no queryFn). `undefined` resolves to the defaults
  // (`ssr: true`, `suspend: 'auto'`).
  // KEEP IN SYNC: the source lists below mirror the real merges in `_getServerQueryOptions`
  // (finite, the non-dehydrated-state branch — this helper serves only the 'data' prefetch path)
  // and `_getServerInfiniteQueryOptions` (infinite) — same merge helpers, same order. If a source
  // is added or reordered there, mirror it here; both ends carry this sentinel.
  _getMergedSsrSuspendQueryOptions(queryOptions?: {
    ssr?: boolean
    suspend?: 'auto' | 'server' | 'client' | boolean
  }): {
    ssr: boolean
    suspend: 'auto' | 'server' | 'client' | boolean
  } {
    const merged = (() => {
      if (this._queryResultType === 'infiniteQuery') {
        return mergeInfiniteQueryOptions(
          this._defaultQueryOptions as never,
          this._defaultInfiniteQueryOptions as never,
          this._infiniteQueryOptions as never,
          queryOptions as never,
        ) as { ssr?: boolean; suspend?: 'auto' | 'server' | 'client' | boolean }
      }
      const mountableDefaultQueryOptions =
        {
          page: this._defaultPageQueryOptions,
          component: this._defaultComponentQueryOptions,
          layout: this._defaultLayoutQueryOptions,
          provider: this._defaultProviderQueryOptions,
        }[this.type as string] || {}
      return mergeQueryOptions(
        this._defaultQueryOptions,
        mountableDefaultQueryOptions,
        this._queryOptions,
        queryOptions as never,
      ) as { ssr?: boolean; suspend?: 'auto' | 'server' | 'client' | boolean }
    })()
    return { ssr: merged.ssr ?? true, suspend: merged.suspend ?? 'auto' }
  }

  async _prefetchPage({
    input = {},
    options = {},
  }: {
    input: InputRaw | undefined | void
    options:
      | {
          queryClient?: QueryClient
          fetchOptions?: FetchOptions
          pageDehydratedStateQueryOptions?: ExtraUseQueryOptions
          policy?: PrefetchPagePolicy
          trigger?: 'navigate' | 'linkHover'
        }
      | undefined
  }): Promise<void> {
    // later may be we will have prefetchComponent and prefetchWrapper, so there will be props
    const outerProps = {} as Props
    const eventData = {
      point: this as AnyPoint,
      input,
      options,
      error: undefined,
    }
    const { queryClient, fetchOptions, trigger, pageDehydratedStateQueryOptions } = options
    const policy = this._getPrefetchPagePolicy(trigger, options.policy)
    if (policy === 'none') {
      return
    }
    const meta = { point: this.id, input: sanitizeForLog(input), options: { policy, trigger } }
    this._emit('pointPrefetchPageStart', eventData, meta)

    if (!this.route) {
      const error = new this._Error('Route is not set', { code: POINT0_ERROR_CODES_MAP.ROUTE_NOT_SET, meta })
      this._emit('pointPrefetchPageSettled', { ...eventData, error }, meta)
      this._emit('pointPrefetchPageError', { ...eventData, error }, meta)
      throw error
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { '?': _search, ...paramsRaw } = input as Record<string, unknown>
    const paramsWithStrings = flat.parse(flat.stringify(paramsRaw))
    const location = Object.assign(
      Route0.getLocation(
        this.route.get(input, { origin: typeof window !== 'undefined' ? window.location.origin : undefined }),
      ),
      {
        route: this.route.definition,
        params: paramsWithStrings,
      },
    )

    const queryClientDehydratedStateWasPrefetched = await (async () => {
      if (policy === 'pageDehydratedState' || policy === 'pageDehydratedStateAndClientQuery') {
        if (!this._getSsrEnabled()) {
          // Safety net: `.ssr()` and the policy setters keep a dehydrated-state policy off an ssr-off point, so this
          // should be unreachable — but a hand-forged policy must never try to prefetch dehydrated state that the
          // server won't produce.
          throw new Error(
            `Query client dehydrated state can be prefetched only when ssr is enabled on point ${this.toStringWithLocation()}`,
          )
        }
        await this._prefetchPageQueryClientDehydratedState({
          queryClient,
          input,
          fetchOptions,
          queryOptions: pageDehydratedStateQueryOptions,
        })
        return true
      }
      return false
    })()

    if (policy === 'pageDehydratedState') {
      this._emit('pointPrefetchPageSettled', eventData, meta)
      this._emit('pointPrefetchPageSuccess', eventData, meta)
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
          policy === 'pageDehydratedStateAndClientQuery' &&
          !p._hasClientLoader() &&
          queryClientDehydratedStateWasPrefetched
        ) {
          return []
        }
        if (policy === 'clientQuery' && !p._hasClientLoader()) {
          return []
        }
        // the policy decides which related points to prefetch by loader type; each point has a
        // single loader, so the prefetch itself resolves which query (server/client) to run.
        const mode =
          policy === 'pageDehydratedStateAndClientQuery'
            ? // server queries were prefetched on the prefetchPageQueryClientDehydratedState step
              queryClientDehydratedStateWasPrefetched
              ? 'client'
              : undefined
            : {
                serverQuery: 'server' as const,
                clientQuery: 'client' as const,
                serverAndClientQuery: undefined,
              }[policy]
        const hasServerLoader = !!p._hasServerLoader
        const hasClientLoader = p._hasClientLoader()
        const hasLoaderForMode =
          mode === 'server' ? hasServerLoader : mode === 'client' ? hasClientLoader : hasServerLoader || hasClientLoader
        if (!hasLoaderForMode) {
          return []
        }
        // Server-side SSR prefetch (prefetchLoadersBeforePageRender) honors the per-query
        // declarations: `ssr: false` never executes on the server; `suspend: 'server' | true`
        // starts now but never blocks the first render (the kick is NOT awaited — awaiting would
        // hold the shell on the exact loader the user marked as streamed). `'auto'`/`false` are
        // awaited — a full warm-up, data in the shell. On the client this changes nothing.
        if (hasServerLoader && _point0_env.side.is.server && _ss.__POINT0_SSR_PHASE__.get() !== 'none') {
          const { ssr, suspend } = p._getMergedSsrSuspendQueryOptions(relatedQuery.queryOptions as never)
          if (ssr === false) {
            return []
          }
          if (suspend === 'server' || suspend === true) {
            if (p._queryResultType === 'infiniteQuery') {
              void p.prefetchInfiniteQuery(
                relatedQuery.inputGetter({ location, props: {} as never }),
                relatedQuery.queryOptions as never,
                { queryClient, fetchOptions },
              )
            } else if (p._queryResultType === 'query') {
              void p.prefetchQuery(
                relatedQuery.inputGetter({ location, props: outerProps }),
                relatedQuery.queryOptions as never,
                { queryClient, fetchOptions },
              )
            }
            return []
          }
        }
        if (p._queryResultType === 'infiniteQuery') {
          return await p.prefetchInfiniteQuery(
            relatedQuery.inputGetter({ location, props: {} as never }),
            relatedQuery.queryOptions as never,
            {
              queryClient,
              fetchOptions,
            },
          )
        } else if (p._queryResultType === 'query') {
          return await p.prefetchQuery(
            relatedQuery.inputGetter({ location, props: outerProps }),
            relatedQuery.queryOptions as never,
            {
              queryClient,
              fetchOptions,
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
          policy === 'pageDehydratedStateAndClientQuery' &&
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
        // the policy decides which related points to prefetch by loader type; each point has a
        // single loader, so the prefetch itself resolves which query (server/client) to run.
        const mode =
          policy === 'pageDehydratedStateAndClientQuery'
            ? // server queries were prefetched on the prefetchPageQueryClientDehydratedState step
              queryClientDehydratedStateWasPrefetched
              ? 'client'
              : undefined
            : {
                serverQuery: 'server' as const,
                clientQuery: 'client' as const,
                serverAndClientQuery: undefined,
              }[policy]
        // A related point can be query-shaped (`_queryResultType === 'query'`) yet have no
        // loader for the resolved mode — e.g. a page with no `.loader()` whose layouts do.
        // Skip it (otherwise the prefetch would target a query that does not exist).
        const hasServerLoader = !!p._hasServerLoader
        const hasClientLoader = p._hasClientLoader()
        const hasLoaderForMode =
          mode === 'server' ? hasServerLoader : mode === 'client' ? hasClientLoader : hasServerLoader || hasClientLoader
        if (!hasLoaderForMode) {
          return []
        }
        // Server-side SSR prefetch (prefetchLoadersBeforePageRender) honors the per-query
        // declarations — same rules as the relatedQueries block above: `ssr: false` skips,
        // `suspend: 'server' | true` kicks without awaiting, the rest are awaited.
        if (hasServerLoader && _point0_env.side.is.server && _ss.__POINT0_SSR_PHASE__.get() !== 'none') {
          const { ssr, suspend } = p._getMergedSsrSuspendQueryOptions(undefined)
          if (ssr === false) {
            return []
          }
          if (suspend === 'server' || suspend === true) {
            if (p._queryResultType === 'infiniteQuery') {
              void p.prefetchInfiniteQuery(inputHere as never, undefined, { queryClient, fetchOptions })
            } else if (p._queryResultType === 'query') {
              void p.prefetchQuery(inputHere as never, undefined, { queryClient, fetchOptions })
            }
            return []
          }
        }
        if (p._queryResultType === 'infiniteQuery') {
          return await p.prefetchInfiniteQuery(inputHere as never, undefined, {
            queryClient,
            fetchOptions,
          })
        } else if (p._queryResultType === 'query') {
          return await p.prefetchQuery(inputHere as never, undefined, {
            queryClient,
            fetchOptions,
          })
        }
      }),
    )

    try {
      await Promise.all([queriesPrefetching, relatedQueriesPrefetching, onPrefetchFnsPromise])
      this._emit('pointPrefetchPageSettled', eventData, meta)
      this._emit('pointPrefetchPageSuccess', eventData, meta)
    } catch (error) {
      const error0 = this._Error.from(error)
      this._emit('pointPrefetchPageSettled', { ...eventData, error: error0 }, meta)
      this._emit('pointPrefetchPageError', { ...eventData, error: error0 }, meta)
      throw error0
    }
  }

  async prefetchPage(
    input: FinalInputRawOrUndefinedOrVoid<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
    options?: {
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      pageDehydratedStateQueryOptions?: ExtraUseQueryOptions
      policy?: PrefetchPagePolicy
      trigger?: 'navigate' | 'linkHover'
    },
  ): Promise<void> {
    const prefetchPagePromises = _ss.__POINT0_PREFETCH_PAGE_PROMISES__.get()
    const policy = this._getPrefetchPagePolicy(options?.trigger, options?.policy)
    const hash = stringify({ input, id: this.id, policy }) || JSON.stringify({ input: 'invalid', id: this.id, policy })
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
    prevMountActions,
    skipPageStateRelated,
  }: {
    pageState: NavigationPageState
    prevMountActions: Array<{
      action: MountAction
      state: MountableState<any, any, any, any, any, any, any, any, any, any, ErrorPoint0>
    }>
    skipPageStateRelated: boolean
  }) => {
    useSetNavigationPageState({
      status: pageState.status,
      error: pageState.error,
      skip: skipPageStateRelated,
    })

    for (const { action, state } of prevMountActions) {
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (action.type) {
        case 'head': {
          const headFnResult = action.fn(state)
          const { head, seoMeta } = _splitHead(headFnResult)
          useHead(head)
          useSeoMeta(seoMeta)
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
          const { head, seoMeta } = _splitHead(headFnResult)
          useHead(skipPageStateRelated ? {} : head)
          useSeoMeta(skipPageStateRelated ? {} : seoMeta)
          continue
        }
      }
    }
  }

  private static readonly _createBoundLoadingComponent = ({
    componentVariant,
    prevMountActions,
    isHeadable,
    fallbackLoadingComponent,
  }: {
    componentVariant: DestinationComponentVariant
    prevMountActions: Array<{
      action: MountAction
      state: MountableState<any, any, any, any, any, any, any, any, any, any, ErrorPoint0>
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
            success: false,
            loading: true,
            initial: false,
          },
          prevMountActions,
          skipPageStateRelated: false,
        })
      }
      return React.createElement(loadingComponent, {
        type: componentVariant,
      })
    }
  }

  private static readonly _createBoundErrorComponent = ({
    componentVariant,
    prevMountActions,
    isHeadable,
    fallbackErrorComponent,
    ErrorClass,
  }: {
    componentVariant: DestinationComponentVariant
    prevMountActions: Array<{
      action: MountAction
      state: MountableState<any, any, any, any, any, any, any, any, any, any, ErrorPoint0>
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
        // The framework's own page-status bookkeeping. Once the streamed shell left, the status
        // is out of our hands — a failed streamed loader rendering its `.error()` post-shell is
        // normal operation, so skip instead of tripping the sealed-effects warning (reserved for
        // USER code touching the response too late).
        const sealed = _point0_env.side.is.server ? getEffectsOrUndefined()?.sealed : false
        if (!sealed) {
          setStatus(error0.status)
        }
      }
      if (_isHeadable) {
        Point0._usePrevHeadsAndSetPageState({
          pageState: {
            status: 'error',
            error: error0,
            success: false,
            loading: false,
            initial: false,
          },
          prevMountActions,
          skipPageStateRelated: false,
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
      const { '?': searchRaw = {}, ...paramsRaw } = flat.parse(flat.stringify(inputRaw)) as {
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
      const paramsWithStrings = flat.parse(flat.stringify(paramsRaw))
      const searchWithStrings = flat.parse(flat.stringify(searchRaw))
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

  private readonly _applyWrappers = (
    children: Exclude<React.ReactNode, Promise<any>>,
    {
      location,
      outerProps,
    }: {
      location?: AnyLocation
      outerProps: Props
    },
  ) => {
    if (this._wrappers.length === 0) {
      return children
    }
    return this._wrappers.reduceRight((children, wrapper) => {
      return React.createElement(wrapper, {
        children,
        location,
        props: outerProps,
      } as never)
    }, children)
  }

  // Builds the ErrorBoundary0 error renderer: redirect-carrying errors keep redirecting (the same
  // passthrough the `mountState.error.redirect` tail path does), everything else renders the given
  // bound ErrorComponent in place.
  private readonly _renderBoundaryError = (
    ErrorComponent: React.ComponentType<{ error: Error; _isHeadable?: boolean }>,
  ): ((error: Error) => React.ReactNode) => {
    return (error: Error): React.ReactNode => {
      const redirectTask = RedirectTask.is(error) ? error : this._Error.from(error).redirect
      if (redirectTask) {
        const Redirect = getNavigationHelpers().Redirect
        return React.createElement(Redirect, {
          task: redirectTask,
          after: () => {
            removeRedirectsFromQueryClientCache(_ss.__POINT0_QUERY_CLIENT__.get(), redirectTask.to)
          },
        })
      }
      return React.createElement(ErrorComponent, { error })
    }
  }

  // Every mountable render (Page/Component/Layout/Provider) goes through this entry wrapper:
  // <ErrorBoundary0><Suspense fallback={loading}>chain…</Suspense></ErrorBoundary0>.
  //
  // - The Suspense boundary is what makes server-side streaming work: when a suspense query
  //   suspends in the final SSR render, React ships this fallback in the shell and streams the
  //   resolved content later. On the client only explicit suspension lands here (`suspend: true`
  //   or the useSuspense* hooks). Lazy point chunks don't land here either: normal navigation
  //   awaits the chunk before rendering (`prefetchPage` → `loadPage` → `await point()`), and a
  //   point's own React.lazy boundary sits ABOVE this wrapper anyway (this Suspense exists only
  //   once the chunk resolved) — a cold CHILD lazy point rendered inside an already-loaded parent
  //   is the one case this boundary would catch its load.
  // - The ErrorBoundary makes a throw inside the chain render this point's `.error()` in place
  //   instead of killing the whole page (SPA fallback remains only for errors outside every
  //   boundary).
  // - The chain element MUST be `createElement(this._Mountable, …)`, not the former direct call:
  //   a direct call runs the first chain slice's hooks (e.g. the self query) in the CALLER's
  //   instance — outside this boundary — so its suspend/throw would escape the wrapper.
  // - The fallbacks bind with an empty prevMountActions, so they resolve to the point's own
  //   `.loading()`/`.error()` fields (the LAST declared one — each call overwrites the field).
  //   Mid-chain `.loading()`/`.error()` actions additionally open NESTED boundaries with
  //   positional semantics — see the `loadingComponent`/`errorComponent` action cases.
  //
  // Called directly (not via createElement) from the entry components, so the useMemo accrues to
  // the entry instance — it runs unconditionally exactly once per entry render.
  private readonly _MountableWithBoundaries = (
    props: Parameters<typeof this._Mountable>[0],
  ): Exclude<React.ReactNode, Promise<any>> => {
    const componentVariant = this._getDestinationComponentVariant() ?? 'page'
    const isHeadable = this.type === 'page' || this.type === 'layout'
    const { EntryLoadingComponent, renderEntryBoundaryError } = React.useMemo(() => {
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
      return {
        EntryLoadingComponent: Point0._createBoundLoadingComponent({
          componentVariant,
          prevMountActions: [],
          isHeadable,
          fallbackLoadingComponent,
        }),
        renderEntryBoundaryError: this._renderBoundaryError(
          Point0._createBoundErrorComponent({
            componentVariant,
            prevMountActions: [],
            isHeadable,
            fallbackErrorComponent,
            ErrorClass: this._Error,
          }),
        ),
      }
    }, [])
    const resetKey =
      (props.location as { href?: string } | undefined)?.href ?? _ss.__POINT0_CURRENT_LOCATION__.getOrUndefined()?.href
    return React.createElement(ErrorBoundary0, {
      renderError: renderEntryBoundaryError,
      resetKey,
      children: React.createElement(React.Suspense, {
        fallback: React.createElement(EntryLoadingComponent),
        children: React.createElement(this._Mountable, props),
      }),
    })
  }

  // _Mountable is the render-time interpreter of the point's static `_mountActions` list.
  // How it runs, and why hooks stay stable:
  //
  // - The list is interpreted with a loop. "Inline" actions (selfProps/mapper/errorComponent/
  //   loadingComponent/head) are consumed with `continue`; "wrapping" actions (selfQuery/
  //   relatedQuery/with/input/params/search/clientOnly) call their hooks (e.g. useQuery) and then
  //   `return` a NEW `React.createElement(this._Mountable, …)` element carrying the remaining
  //   actions in `layers[i].prev.nextMountActions`. So one page render produces a CHAIN of
  //   `_Mountable` element instances, each owning a fixed slice of the action list.
  // - `pluginStart`/`pluginEnd` recurse by DIRECT call (`this._Mountable({...})`), not via
  //   createElement — hooks of the recursion accrue to the same React instance.
  // - Rules of Hooks hold because the action list is static per point and each element instance
  //   always re-consumes exactly its own slice: same actions → same hooks in the same order. That
  //   guarantee only works while a render is PURE — re-rendering an instance with the same props
  //   must consume the same actions again. Hence the sibling-layer cloning below.
  //
  // Layers (plugin isolation): outside a plugin section there is a single layer. `pluginStart`
  // pushes a fresh layer (empty props/queries) on top so the plugin's own actions see ONLY what
  // the plugin declared; `pluginEnd` pops it (slice(1)) and the outer layer resumes. While the
  // plugin layer is current, the outer ("sibling") layers must track the same action stream —
  // every consumed action is appended to their `prev.prevMountActions` and shifted off their
  // `prev.nextMountActions` — so that after `pluginEnd` the outer layer continues from the right
  // position with its own (un-leaked) props/queries.
  private readonly _Mountable = (props: {
    mountComponent:
      | LayoutSuccessComponentType<any, any, any, any, any, any, any, any, any>
      | PageSuccessComponentType<any, any, any, any, any, any, any, any, any>
      | ComponentSuccessComponentType<any, any, any, any, any, any, any, any>
      | 'children'
    extraProps: (
      mountableState: MountableState<any, any, any, any, any, any, any, any, any, any, ErrorPoint0>,
    ) => Record<string, any>
    location?: AnyLocation
    layers: Array<{
      inputRaw: InputRaw
      outerProps: TOuterProps
      queryIndex?: number
      /** `<channel.Connection>` per-mount call options — the `useConnection` options prop (membership mirror below) */
      selfConnectionOptions?: ExtraUseConnectionOptions<any, any> | undefined
      /** `<space.Membership>` per-mount call options — the `useMembership` options prop */
      selfMembershipOptions?: ExtraUseMembershipOptions | undefined
      /**
       * the normalized `gate` prop — which non-ready states hold the children back (default `{ loading: false, error:
       * true }`)
       */
      selfGate?: { loading: boolean; error: boolean } | undefined
      /** the `LoadingComponent` prop — an on-the-spot override of the gate's loading component for THIS mount */
      SelfLoadingComponent?: LoadingComponentType<any> | undefined
      /** the `ErrorComponent` prop — an on-the-spot override of the gate's error component for THIS mount */
      SelfErrorComponent?: ErrorComponentType<any, ErrorPoint0> | undefined
      prev?: {
        prevMountActions: Array<{
          action: MountAction
          state: MountableState<any, any, any, any, any, any, any, any, any, any, ErrorPoint0>
        }>
        nextMountActions: MountAction[]
        innerProps: Props
        searchParsed: Data | UndefinedData
        paramsParsed: Data | UndefinedData
        inputParsed: Data | UndefinedData
        queries: QueriesResults
        connections: AnyClientChannelConnection[]
        memberships: AnyClientSpaceMembership[]
        mappedData: Data | undefined
        LoadingComponent: React.ComponentType<{ _isHeadable?: boolean }>
        ErrorComponent: React.ComponentType<{ error: Error; _isHeadable?: boolean }>
      }
    }>
  }): Exclude<React.ReactNode, Promise<any>> => {
    const { mountComponent, extraProps, location, layers } = props
    const [currentLayer, ...rawSiblingLayers] = layers
    // Clone the sibling layers' action arrays so this render never mutates `props`. The action
    // loop below advances siblings in place (push to prevMountActions / shift nextMountActions),
    // and these arrays live inside React props shared with the element that re-renders. Without
    // the clone, a lone re-render of a mid-chain `_Mountable` (e.g. its useQuery flipping
    // pending → success) would shift the shared arrays a SECOND time: actions get lost, the hook
    // sequence changes between renders (a Rules-of-Hooks crash), and the page renders with wrong
    // data. The current layer needs no clone — its arrays are only ever copied, never mutated.
    // `queries`/`innerProps` need no clone either: the wrapping returns rebuild them with spreads.
    const siblingLayers = rawSiblingLayers.map((layer) =>
      layer.prev
        ? {
            ...layer,
            prev: {
              ...layer.prev,
              prevMountActions: [...layer.prev.prevMountActions],
              nextMountActions: [...layer.prev.nextMountActions],
            },
          }
        : layer,
    )

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
      prevConnections,
      prevMemberships,
      prevMappedData,
    } = (() => {
      const prev = currentLayer.prev
      if (!prev) {
        return {
          nextMountActions: this._mountActions,
          prevMountActions: [] as Array<{
            action: MountAction
            state: MountableState<any, any, any, any, any, any, any, any, any, any, ErrorPoint0>
          }>,
          PrevLoadingComponent: undefined,
          PrevErrorComponent: undefined,
          prevInnerProps: {},
          prevSearchParsed: undefined,
          prevParamsParsed: undefined,
          prevInputParsed: undefined,
          prevQueries: [],
          prevConnections: [] as AnyClientChannelConnection[],
          prevMemberships: [] as AnyClientSpaceMembership[],
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
          prevConnections: prev.connections,
          prevMemberships: prev.memberships,
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
      MountableState<any, any, any, any, any, any, any, any, any, any, ErrorPoint0>,
      'status' | 'error' | 'loading' | 'data'
    >

    const mountState = {
      ...queriesState,
      location,
      props: prevInnerProps,
      search: prevSearchParsed,
      params: prevParamsParsed,
      queries: prevQueries,
      connections: prevConnections,
      memberships: prevMemberships,
      input: prevInputParsed,
    } as MountableState<
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      AnyClientChannelConnection[],
      AnyClientSpaceMembership[],
      any,
      ErrorPoint0
    >
    let nextMappedData = prevMappedData
    // The `??` around React.useCallback LOOKS like a conditional hook, but it is deterministic
    // per React instance: continuation elements always have `currentLayer.prev` (so the hook is
    // always skipped), while the initial direct call from Page/Component/Layout/X never does (so
    // the hook always runs, accruing to the caller's instance). The same applies to the
    // createBound*Component() calls in the action loop — whether they run is fixed by the static
    // action slice this instance consumes.
    let ErrorComponent =
      PrevErrorComponent ??
      React.useCallback(
        Point0._createBoundErrorComponent({
          componentVariant,
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
        connections: mountState.connections,
        memberships: mountState.memberships,
        mappedData: nextMappedData,
      }
      const _nextLayers: Array<{
        inputRaw: InputRaw
        outerProps: TOuterProps
        queryIndex?: number
        prev?: {
          prevMountActions: Array<{
            action: MountAction
            state: MountableState<any, any, any, any, any, any, any, any, any, any, ErrorPoint0>
          }>
          nextMountActions: MountAction[]
          innerProps: Props
          searchParsed: Data | UndefinedData
          paramsParsed: Data | UndefinedData
          inputParsed: Data | UndefinedData
          queries: QueriesResults
          connections: AnyClientChannelConnection[]
          memberships: AnyClientSpaceMembership[]
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
      // Advance the sibling layers past this action too, so the outer layer resumes at the right
      // position after `pluginEnd`. Mutating here is safe ONLY because these are this render's
      // local clones (see the cloning at the top) — never the arrays from `props`.
      siblingLayers.forEach((layer) => {
        if (!layer.prev) {
          return
        }
        layer.prev.prevMountActions.push(actionState)
        layer.prev.nextMountActions.shift()
      })

      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (action.type) {
        // Plugin boundaries recurse by DIRECT call (not createElement): hooks inside the plugin
        // section keep accruing to the current React instance, and the layer stack changes
        // synchronously within this same render.
        case 'pluginStart': {
          // Push an isolated layer for the plugin's own actions: empty props/queries, so the
          // plugin sees only what it declared itself (no leakage from the consumer).
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
                  connections: [],
                  memberships: [],
                  mappedData: undefined,
                },
              },
              ..._nextLayers,
            ],
          })
        }
        case 'pluginEnd': {
          // Pop the plugin layer; the outer layer (kept in step by the sibling advancement
          // above) resumes with its own props/queries.
          const { _nextLayers, _nextMountableProps } = getNextProps()
          return this._Mountable({
            ..._nextMountableProps,
            layers: _nextLayers.slice(1),
          })
        }
        // `.error()` / `.loading()` were pure inline rebinds; they now ALSO open a new
        // ErrorBoundary/Suspense around the REST of the chain. Positional semantics: a throw or a
        // suspense-query suspend is caught by the closest boundary declared ABOVE the
        // failing/suspending query in the chain (queries before every `.loading()` land in the
        // entry boundary, whose fallback already resolves to the point's last-declared components
        // via the `_loadingComponent`/`_errorComponent` fields). Rebind BEFORE getNextProps() so
        // the child chain inherits the new bound component.
        case 'errorComponent': {
          ErrorComponent = createBoundErrorComponent()
          const { _nextMountableProps } = getNextProps()
          return React.createElement(ErrorBoundary0, {
            renderError: this._renderBoundaryError(ErrorComponent),
            resetKey: (location as { href?: string } | undefined)?.href,
            children: React.createElement(this._Mountable, _nextMountableProps),
          })
        }
        case 'loadingComponent': {
          LoadingComponent = createBoundLoadingComponent()
          const { _nextMountableProps } = getNextProps()
          return React.createElement(React.Suspense, {
            fallback: React.createElement(LoadingComponent),
            children: React.createElement(this._Mountable, _nextMountableProps),
          })
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
          const mapperFn = action.fn
          const isSuccess = mountState.status === 'success'
          const mapperLocation = (mountState as any).location as AnyLocation | undefined
          const mapperProps = mountState.props
          const mapperQueries = mountState.queries
          const mapperConnections = mountState.connections
          const mapperMemberships = mountState.memberships
          const mapperInputData = nextMappedData ?? mountState.data ?? {}
          // Memoize the mapped result keyed on the mapper inputs, so a re-render
          // that doesn't change those inputs returns the same reference. Without
          // this the mapper produces a fresh object every render, defeating any
          // memoization in the page component below and forcing it to re-render.
          // The hook is called unconditionally (the branch lives inside the
          // callback) to keep hook order stable across loading/success renders.
          const mappedData = React.useMemo(
            () =>
              isSuccess
                ? mapperFn({
                    location: mapperLocation,
                    props: mapperProps,
                    queries: mapperQueries,
                    connections: mapperConnections,
                    memberships: mapperMemberships,
                    data: mapperInputData,
                  })
                : undefined,
            [
              isSuccess,
              mapperLocation,
              mapperProps,
              mapperInputData,
              ...mapperQueries.map((query: { data?: unknown }) => query.data),
              // the connection facade reference is stable (live getters) — the deps must read the values
              ...mapperConnections.flatMap((connection) => [connection.status, connection.id]),
              // same for membership facades: read the values, not the (stable) reference
              ...mapperMemberships.flatMap((membership) => [membership.status, membership.rooms.length]),
            ],
          )
          if (isSuccess) {
            nextMappedData = mappedData
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
          // channel/space included: `.sharedInput` promises a client-side parse of the connect/join input, and the
          // mountable render (`<Connection>`/`<Membership>`) is where it runs
          if (
            this.type !== 'component' &&
            this.type !== 'provider' &&
            this.type !== 'channel' &&
            this.type !== 'space'
          ) {
            return React.createElement(ErrorComponent, {
              error: new this._Error(
                `Usual input schema are not allowed for this point: ${this.toStringWithLocation()}`,
                {
                  code: POINT0_ERROR_CODES_MAP.INPUT_SCHEMA_NOT_ALLOWED,
                  meta: { point: this.id, pointType: this.type },
                },
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
                {
                  code: POINT0_ERROR_CODES_MAP.PARAMS_SCHEMA_NOT_ALLOWED,
                  meta: { point: this.id, pointType: this.type },
                },
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
                {
                  code: POINT0_ERROR_CODES_MAP.SEARCH_SCHEMA_NOT_ALLOWED,
                  meta: { point: this.id, pointType: this.type },
                },
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
        case 'with': {
          // the fn union's return types multiply into a too-complex union for TS — the branches below narrow the
          // result by shape anyway, so call through one erased signature
          const result = (action.fn as (options: unknown) => unknown)({
            ...mountState,
            resolve: resolveQuery,
            children: React.createElement(this._Mountable, _nextMountableProps),
            LoadingComponent,
            ErrorComponent,
          })
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

          // with connection fn — `.with(channel)` returned its facade (recognized by the socket registry, exactly
          // as a query result is recognized by shape): land it in `connections` next to `queries` and provide the
          // channel context, so handlers inside may omit the connection argument. During SSR the facade is the dead
          // 'connecting' one — the context still mounts, gating (if any) already happened inside the closure.
          //
          // Feature-gated, and NOT with a throw: this is classification, not a call — with the socket off no facade
          // can exist to recognize, so the honest shape is "skip", and the whole branch (with the socket-registry
          // reads behind it) folds away in a client build that never turned the feature on.
          if (_point0_env.feature.socket) {
            const connectionChannel = getConnectionFacadeChannel(result)
            if (connectionChannel) {
              const connection = result as AnyClientChannelConnection
              const ChannelContext = getChannelReactContext(connectionChannel as never)
              return React.createElement(
                ChannelContext.Provider,
                { value: connection },
                React.createElement(this._Mountable, {
                  ..._nextMountableProps,
                  layers: _nextLayers.map((layer) => ({
                    ...layer,
                    prev: layer.prev
                      ? {
                          ...layer.prev,
                          connections: [...layer.prev.connections, connection],
                        }
                      : undefined,
                  })),
                }),
              )
            }

            // with membership fn — the space mirror: `memberships` layer + the space context
            const membershipSpace = getMembershipFacadeSpace(result)
            if (membershipSpace) {
              const membership = result as AnyClientSpaceMembership
              const SpaceContext = getSpaceReactContext(membershipSpace as never)
              return React.createElement(
                SpaceContext.Provider,
                { value: membership },
                React.createElement(this._Mountable, {
                  ..._nextMountableProps,
                  layers: _nextLayers.map((layer) => ({
                    ...layer,
                    prev: layer.prev
                      ? {
                          ...layer.prev,
                          memberships: [...layer.prev.memberships, membership],
                        }
                      : undefined,
                  })),
                }),
              )
            }
          }

          // with fn
          const redirectTask = RedirectTask.is(result)
            ? result
            : result instanceof Error && RedirectTask.is((result as any).redirect)
              ? ((result as any).redirect as RedirectTask)
              : undefined
          if (redirectTask) {
            // redirect
            const Redirect = getNavigationHelpers().Redirect
            return React.createElement(Redirect, {
              task: redirectTask,
              after: () => {
                removeRedirectsFromQueryClientCache(_ss.__POINT0_QUERY_CLIENT__.get(), redirectTask.to)
              },
            })
          } else if (React.isValidElement(result)) {
            // custom element
            return result
          } else if (result === 'loading') {
            // loading
            return React.createElement(LoadingComponent)
          } else if (result instanceof Error) {
            // error
            return React.createElement(ErrorComponent, {
              error: this._Error.from(result),
            })
          } else {
            // new props or undefined
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
        case 'selfConnection': {
          if (!_point0_env.feature.socket) {
            throw socketFeatureOffError(`<channel.Connection>, point ${this.id}`)
          }
          // the channel's own terminal render step — `<channel.Connection>`: hold the connection, gate the connect per
          // `gate` (default `{ loading: false, error: true }`) with the channel's OWN bound loading/error components,
          // provide the channel context, and land the facade in `connections` — uniform with an injected
          // `.with(channel)`. During SSR nothing connects — the connection reports `connecting`, so with `loading`
          // gated a Connection server-renders its loading state, like a clientOnly query.
          const connection = useSocketConnection(
            this as never,
            currentLayer.inputRaw as never,
            currentLayer.selfConnectionOptions as never,
          ) as AnyClientChannelConnection
          {
            const selfGate = currentLayer.selfGate ?? { loading: false, error: true }
            if (selfGate.loading && connection.status === 'connecting') {
              // the LoadingComponent/ErrorComponent PROPS override the bound chain components for this mount
              return currentLayer.SelfLoadingComponent
                ? React.createElement(currentLayer.SelfLoadingComponent, { type: 'component' })
                : React.createElement(LoadingComponent)
            }
            if (selfGate.error && connection.status === 'error' && connection.error) {
              return currentLayer.SelfErrorComponent
                ? React.createElement(currentLayer.SelfErrorComponent, { error: connection.error, type: 'component' })
                : React.createElement(ErrorComponent, { error: connection.error })
            }
          }
          const { _nextMountableProps, _nextLayers } = getNextProps()
          const ChannelContext = getChannelReactContext(this as never)
          return React.createElement(
            ChannelContext.Provider,
            { value: connection },
            React.createElement(this._Mountable, {
              ..._nextMountableProps,
              layers: _nextLayers.map((layer) => ({
                ...layer,
                prev: layer.prev
                  ? {
                      ...layer.prev,
                      connections: [...layer.prev.connections, connection],
                    }
                  : undefined,
              })),
            }),
          )
        }
        case 'selfMembership': {
          if (!_point0_env.feature.socket) {
            throw socketFeatureOffError(`<space.Membership>, point ${this.id}`)
          }
          // the space's mirror — `<space.Membership>`: join, gate per `gate` (default `{ loading: false, error: true }`)
          // with the space's own bound components, provide the space context, land the facade in `memberships`. The
          // hook resolves the underlying channel connection through the ambient `<channel.Connection>` (or the single
          // live connection). During SSR nothing joins — the membership reports `joining`.
          const membership = useSpaceMembership(
            this as never,
            currentLayer.inputRaw as never,
            currentLayer.selfMembershipOptions as never,
          ) as AnyClientSpaceMembership
          {
            const selfGate = currentLayer.selfGate ?? { loading: false, error: true }
            if (selfGate.loading && membership.status === 'joining') {
              return currentLayer.SelfLoadingComponent
                ? React.createElement(currentLayer.SelfLoadingComponent, { type: 'component' })
                : React.createElement(LoadingComponent)
            }
            if (selfGate.error && membership.status === 'error' && membership.error) {
              return currentLayer.SelfErrorComponent
                ? React.createElement(currentLayer.SelfErrorComponent, { error: membership.error, type: 'component' })
                : React.createElement(ErrorComponent, { error: membership.error })
            }
          }
          const { _nextMountableProps, _nextLayers } = getNextProps()
          const SpaceContext = getSpaceReactContext(this as never)
          return React.createElement(
            SpaceContext.Provider,
            { value: membership },
            React.createElement(this._Mountable, {
              ..._nextMountableProps,
              layers: _nextLayers.map((layer) => ({
                ...layer,
                prev: layer.prev
                  ? {
                      ...layer.prev,
                      memberships: [...layer.prev.memberships, membership],
                    }
                  : undefined,
              })),
            }),
          )
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
        prevMountActions,
        skipPageStateRelated: mountState.status === 'success' && isLayout, // we will have page below, and it should control pageState
      })
    }

    if (mountState.status === 'error') {
      const redirectTask = mountState.error.redirect
      if (redirectTask) {
        // TODO: allow custome redirect component ui
        const Redirect = getNavigationHelpers().Redirect
        return React.createElement(Redirect, {
          task: redirectTask,
          after: () => {
            removeRedirectsFromQueryClientCache(_ss.__POINT0_QUERY_CLIENT__.get(), redirectTask.to)
          },
        })
      } else {
        return React.createElement(ErrorComponent, {
          error: mountState.error,
          _isHeadable: false, // becouse we use heads in prev block
        })
      }
    }

    if (mountState.status === 'loading') {
      return React.createElement(LoadingComponent, {
        _isHeadable: false, // becouse we use heads in prev block
      })
    }

    if (mountComponent === 'children') {
      return extraProps(mountState).children
    } else {
      return React.createElement(mountComponent as never, {
        ...mountState,
        ...extraProps(mountState),
        ErrorComponent,
        LoadingComponent,
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
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>() as ExactLocation<
      CurrentRouteDefinition<TRouteDefinition>
    >

    const { inputRaw, outerProps } = React.useMemo<{
      inputRaw: InputRaw
      outerProps: TOuterProps
    }>(() => {
      const { input: providedInput, ...outerProps } = props as any
      const inputRaw = providedInput ?? { ...this._getUnsafeInputRawByLocation(location) }
      return { inputRaw, outerProps }
    }, [props, location])

    // Scroll restoration is handled centrally by the router (see
    // `useScrollRestoration`), not per-page anymore.

    return this._applyWrappers(
      this._MountableWithBoundaries({
        location,
        layers: [
          {
            inputRaw,
            outerProps,
          },
        ],
        extraProps: () => {
          return { location, setSearch }
        },
        mountComponent: this._page as never,
      }),
      { location, outerProps },
    )
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
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const { inputRaw, outerProps } = React.useMemo<{
      inputRaw: InputRaw
      outerProps: TOuterProps
    }>(() => {
      const { input: providedInput = {}, ...outerProps } = props as any
      const inputRaw = { ...providedInput }
      return { inputRaw, outerProps }
    }, [props])

    return this._applyWrappers(
      this._MountableWithBoundaries({
        layers: [
          {
            inputRaw,
            outerProps,
          },
        ],
        extraProps: () => {
          return {}
        },
        mountComponent: this._component as never,
      }),
      { outerProps },
    )
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
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const location = useLocation() as WeakAncestorLocation<CurrentRouteDefinition<TRouteDefinition>>

    const { inputRaw, children, outerProps } = React.useMemo<{
      inputRaw: InputRaw
      children: React.ReactNode
      outerProps: TOuterProps
    }>(() => {
      const { input: providedInput, children, ...outerProps } = props as any
      const inputRaw = providedInput ?? { ...this._getUnsafeInputRawByLocation(location) }
      return { inputRaw, children, outerProps }
    }, [props, location])

    return this._applyWrappers(
      this._MountableWithBoundaries({
        location,
        layers: [
          {
            inputRaw,
            outerProps,
          },
        ],
        extraProps: (mountableState: MountableState<any, any, any, any, any, any, any, any, any, any, ErrorPoint0>) => {
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
            setSearch,
          }
        },
        mountComponent: this._layout as never,
      }),
      { location, outerProps },
    )
  }

  // provider
  private getSsProviderValueKey(input?: InputRaw | undefined): string {
    const start = `__POINT0_PROVIDER_VALUE_${this.scope}_${this.type}_${this.name}`
    if (!input) {
      return start
    }
    return `${start}_${stringifyOrThrow(this._getTransformer(), input, this.id)}`
  }

  /**
   * Read a provider's value WITHOUT subscribing — not a hook, so callable anywhere (event handlers, loaders, plain
   * functions). Pass a key, an array of keys (a Pick), or nothing for the whole value. The non-reactive counterpart to
   * `.useValue()`.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     AppProvider.getValue('theme') // one key
   *     AppProvider.getValue(['theme', 'lang']) // Pick of keys
   *     AppProvider.getValue() // the whole value
   *
   * Full reference: https://1gr14.dev/point0/latest/provider
   */
  getValue(
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

  getValueOrUndefined(
    input?: FinalInputRawOrUndefined<
      TPointType,
      TServerInputSchema,
      TClientInputSchema,
      TParamsSchema,
      TSearchSchema,
      TBodySchema
    >,
  ): MountableSuccessData<TQueriesDefinitions, TMapperOutput> | undefined {
    const value = superstore.getValueOrUndefined<MountableSuccessData<TQueriesDefinitions, TMapperOutput>>(
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
      TConnectionsDefinitions,
      TMembershipsDefinitions,
      TMapperOutput
    >,
  ): React.ReactNode => {
    const { inputRaw, children, outerProps } = React.useMemo<{
      inputRaw: InputRaw
      children: React.ReactNode
      outerProps: TOuterProps
    }>(() => {
      const { input: providedInput = {}, children, ...outerProps } = props as any
      const inputRaw = { ...providedInput }
      return { inputRaw, children, outerProps }
    }, [props])

    return this._applyWrappers(
      this._MountableWithBoundaries({
        layers: [
          {
            inputRaw,
            outerProps,
          },
        ],
        extraProps: (mountableState: MountableState<any, any, any, any, any, any, any, any, any, any, ErrorPoint0>) => {
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
      }),
      { outerProps },
    )
  }

  /**
   * Read a provider's value inside render — a React hook, fine-grained: reading one key re-renders only when that key
   * changes. Pass a key, an array of keys (a Pick), or nothing for the whole value. Throws if called outside a mounted
   * provider. Use `.getValue()` for the non-reactive read.
   *
   * Server-and-client — a runtime ready-method, callable from both bundles (not compiler-stripped).
   *
   *     AppProvider.useValue('x') // one key (re-renders only on that key)
   *     AppProvider.useValue(['x', 'y']) // Pick of keys
   *     const { x } = AppProvider.useValue() // the whole value
   *
   * Full reference: https://1gr14.dev/point0/latest/provider
   */
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
    meta: EventerEventMeta,
    preventEmitError = false,
  ) {
    const event = {
      name,
      data,
      // Hoist the payload's error (when there is one) to the envelope — see `EventerEvent`.
      error: (data as { error?: TError }).error,
      meta,
      side: _point0_env.side.name,
    } as AnyEventerEvent<TError>
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
              const error0 = this._Error.from(error)
              const emitErrorMeta = { event: { name: event.name, meta: event.meta } }
              this._emit('emitError', { error: error0, event: event as never }, emitErrorMeta, true)
            }
          } catch {}
        }
      })()
    }
  }
}

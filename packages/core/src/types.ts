import type {
  AnyLocation,
  AnyRoute,
  ExactLocation,
  Extended,
  HasParams,
  ParamsInput,
  ParamsOutput,
  UnknownSearchInput,
} from '@1gr14/route0'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type {
  CancelOptions,
  InfiniteData,
  InvalidateOptions,
  Mutation,
  MutationOptions,
  Query,
  QueryState,
  RefetchOptions,
  UseInfiniteQueryOptions as OriginalUseInfiniteQueryOptions,
  UseMutationOptions as OriginalUseMutationOptions,
  UseQueryOptions as OriginalUseQueryOptions,
  UseInfiniteQueryResult,
  UseMutationResult,
  UseQueryResult,
  UseSuspenseInfiniteQueryResult,
  UseSuspenseQueryResult,
  Updater,
} from '@tanstack/react-query'
import type { OpenAPIV3 } from 'openapi-types'
import type React from 'react'
import type { ResponseEffectsSetHelper, ResponseEffectsValues } from './effects.js'
import type { ErrorPoint0 } from './error.js'
import type {
  EmptyProps,
  ErrorComponentType,
  LoadingComponentType,
  MountableSuccessComponentProps,
  MountableSuccessComponentType,
  Props,
  ConnectionsDefinitions,
  MembershipsDefinitions,
  QueriesDefinitions,
} from './mountable.js'
import type { RedirectTask } from './navigation.js'
import type { Point0 } from './point0.js'
import type { POINT0_QUERY_KEY_NAMESPACE } from './protocol.js'
import type {
  Request0,
  RequestVariantAsset,
  RequestVariantEndpoint,
  RequestVariantPage,
  RequestVariantPublicdir,
  RequestVariantType,
  RequestVariantWebsocket,
  WideRequestMethod,
} from './request0.js'
import type { GetByPath, SetByPath } from './utils.js'

// basic

export type EmptyObject = Record<never, never>
/**
 * The literal empty object and nothing else — `{}` passes, any keyed object fails. `EmptyObject` can't play this role
 * in a parameter position: `Record<never, never>` has no members, so excess-property checking never fires against it.
 */
export type EmptyObjectOnly = Record<string, never>

export type PointName = string
export type PointsScope = string

export type UndefinedRoute = undefined
export type RouteDefinition = string
export type UndefinedRouteDefinition = undefined
export type EmptyCtx = EmptyObject
export type UnknownCtx = Record<string, unknown>
export type UndefinedCtx = undefined
export type RequiredCtx = UnknownCtx | UndefinedCtx
export type Ctx = UnknownCtx | EmptyCtx
// export type Ctx = UnknownCtx
export type EmptyData = EmptyObject
export type UnknownData = Record<string, unknown>
export type UndefinedData = undefined
export type Data = UnknownData | EmptyData
// export type Data = UnknownData
// export type PromiseReactNode = Promise<React.ReactNode> & React.ReactNode
export type LoaderOutput = UnknownData | Response | React.ReactElement
export type UndefinedLoaderOutput = undefined
export type MapperOutput = Data
export type UndefinedMapperOutput = undefined
export type CtxExposedKeys = string
export type UndefinedCtxExposedKeys = undefined

// socket generic sentinels — every slot is SPELLED OUT at every use site (no generic defaults anywhere, matching
// the older generics), and each value is written the moment its entity appears in the lineage: the channel closer
// writes TChannelInput/TIdentity, the space closer writes TSpaceInput/TRoom. Until then the slot carries its
// Undefined* sentinel — `[TRoom] extends [UndefinedRoom]` (= undefined) is the "no space in the lineage"
// discriminator the handler bind surface reads.
export type UndefinedChannelInput = undefined
export type UndefinedIdentity = undefined
export type UndefinedSpaceInput = undefined
export type UndefinedRoom = undefined
export type EmptyQueriesDefinitions = []
export type EmptyConnectionsDefinitions = []
export type EmptyMembershipsDefinitions = []

/**
 * What a point IS for the client on the read side. `'subscription'` doubles as the "the loader is an async generator"
 * marker on a stage: a generator `.loader()` sets it, `.subscription()` requires it, `.action()` rejects it.
 */
export type QueryResultType = 'query' | 'infiniteQuery' | 'subscription'
export type UndefinedQueryResultType = undefined
export type QueryResultTypeOrNever<TQueryResultType extends QueryResultType | UndefinedQueryResultType> =
  TQueryResultType extends QueryResultType ? TQueryResultType : never

// export type QueryKey = readonly [string, ...string[]]
export type QueryKey = readonly [
  point0: typeof POINT0_QUERY_KEY_NAMESPACE,
  {
    scope: PointsScope
    type: PointType
    name: PointName
    mode: 'server' | 'client' | 'socket'
    finiteness: 'finite' | 'infinite'
    tags: string[]
    output: FetchServerOutputType
    /** `mode: 'socket'` keys only (a serverHandler's socket-query family): the parent channel name */
    channel?: PointName
    /** `mode: 'socket'` keys only: the bound connection's channel input, channel-transformer-serialized */
    connectionInput?: string
    /** `mode: 'socket'` keys of a SPACE handler: the parent space name */
    space?: PointName
    /**
     * `mode: 'socket'` keys of a SPACE handler: the room the binding addresses, space-transformer-serialized. The space
     * handler's whole address — the membership INPUT is deliberately absent (it is a hold-dedup key, not an address),
     * so a multi-room membership gets one cache entry per room.
     */
    room?: string
    input: string
  },
]

export type MutationKey = readonly [
  point0: typeof POINT0_QUERY_KEY_NAMESPACE,
  { scope: PointsScope; type: PointType; name: PointName; tags: string[] },
]

export type Infer<
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
> = {
  PointType: TPointType
  LetsReadyPointType: TLetsReadyPointType
  Error: TError
  /**
   * The room type — the closers WRITE the slot the moment the entity exists (`.space()` writes the room, joinerless
   * fallback included; handlers inherit it through the grow maps), so this is a straight read. Channel handlers have
   * none (`UndefinedRoom`).
   */
  Room: TRoom
  /**
   * the connection identity type — written by the `.channel()` closer (the connector's return), inherited by
   * handlers/spaces
   */
  Identity: TIdentity
  /** the parent channel's raw input on a handler/space — what binds a handler by input and keys `getConnection` */
  ChannelInput: TChannelInput
  /** the parent space's raw input on a space-grown handler — what binds it by input and keys `getMembership` */
  SpaceInput: TSpaceInput
  RequiredCtx: TRequiredCtx
  Ctx: TCtx
  CtxExposed: ExposedCtx<TCtx, TCtxExposedKeys>
  CtxExposedKeys: TCtxExposedKeys
  ServerLoaderOutput: TServerLoaderOutput
  ClientLoaderOutput: TClientLoaderOutput
  MapperOutput: TMapperOutput
  RouteDefinition: TRouteDefinition
  ServerInputSchema: TServerInputSchema
  ClientInputSchema: TClientInputSchema
  IsInputOptional: IsFinalInputOptional<
    FirstReadyPointTypeOrNever<TLetsReadyPointType, TPointType>,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema
  >
  // IsInputEmpty: IsInputsEmpty<TServerInputSchema, TClientInputSchema>
  InputRaw: FinalInputRaw<
    FirstReadyPointTypeOrNever<TLetsReadyPointType, TPointType>,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema
  >
  InputRawOrUndefined: FinalInputRawOrUndefined<
    FirstReadyPointTypeOrNever<TLetsReadyPointType, TPointType>,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema
  >
  InputRawOrUndefinedOrVoid: FinalInputRawOrUndefinedOrVoid<
    FirstReadyPointTypeOrNever<TLetsReadyPointType, TPointType>,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema
  >
  ClientInputRaw: InputRaw<TClientInputSchema>
  ClientInputParsed: InputParsed<TClientInputSchema>
  IsClientInputOptional: IsSchemaOptional<TClientInputSchema>
  ServerInputRaw: FinalServerInputRaw<
    FirstReadyPointTypeOrNever<TLetsReadyPointType, TPointType>,
    TServerInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema
  >
  ServerInputParsed: FinalServerInputParsed<
    FirstReadyPointTypeOrNever<TLetsReadyPointType, TPointType>,
    TServerInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema
  >
  IsServerInputOptional: IsFinalServerInputOptional<
    FirstReadyPointTypeOrNever<TLetsReadyPointType, TPointType>,
    TServerInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema
  >
  ParamsSchema: TParamsSchema
  ParamsRaw: InputRaw<TParamsSchema>
  ParamsParsed: InputParsed<TParamsSchema>
  SearchSchema: TSearchSchema
  SearchRaw: InputRaw<TSearchSchema>
  SearchParsed: InputParsed<TSearchSchema>
  BodySchema: TBodySchema
  BodyRaw: InputRaw<TBodySchema>
  BodyParsed: InputParsed<TBodySchema>
  HeadersSchema: THeadersSchema
  HeadersRaw: InputRaw<THeadersSchema>
  HeadersParsed: InputParsed<THeadersSchema>
  CookiesSchema: TCookiesSchema
  CookiesRaw: InputRaw<TCookiesSchema>
  CookiesParsed: InputParsed<TCookiesSchema>
  OuterProps: TOuterProps
  InnerProps: TInnerProps
  QueryResultType: TQueryResultType
  Queries: TQueriesDefinitions
  ConnectionsDefinitions: TConnectionsDefinitions
  MembershipsDefinitions: TMembershipsDefinitions
  UseQueryOptions: UsePointQueryOptions<
    FirstReadyPointTypeOrNever<TLetsReadyPointType, TPointType>,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TError
  >
  UseQueryResult: UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TError>
  FetchServerOutput: TServerLoaderOutput extends LoaderOutput ? TServerLoaderOutput : never
  FetchOutput: FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput>
  ServerQueryFiniteData: QueriedFiniteData<TServerLoaderOutput>
  ClientQueryFiniteData: QueriedFiniteData<TClientLoaderOutput>
  ServerQueryInfiniteData: QueriedInfiniteData<TServerLoaderOutput>
  ClientQueryInfiniteData: QueriedInfiniteData<TClientLoaderOutput>
  QueriedFiniteData: FinalQueriedFiniteData<TServerLoaderOutput, TClientLoaderOutput>
  QueriedInfiniteData: FinalQueriedInfiniteData<TServerLoaderOutput, TClientLoaderOutput>
  ServerQueryData: QueriedData<TQueryResultType, TServerLoaderOutput>
  ClientQueryData: QueriedData<TQueryResultType, TClientLoaderOutput>
  QueriedData: FinalQueriedData<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput>
  ServerExecuteResult: ServerExecuteResult<TCtx, TServerLoaderOutput, TError>
  EdgeComponent: MountableSuccessComponentType<
    FirstReadyPointTypeOrNever<TLetsReadyPointType, TPointType>,
    TRouteDefinition,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TMapperOutput
  >
  EdgeProps: MountableSuccessComponentProps<
    FirstReadyPointTypeOrNever<TLetsReadyPointType, TPointType>,
    TRouteDefinition,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TMapperOutput
  >
}

// points types

export type PointType =
  | 'root'
  | 'plugin'
  | 'base'
  | 'page'
  | 'component'
  | 'layout'
  | 'provider'
  | 'query'
  | 'infiniteQuery'
  | 'mutation'
  | 'action'
  | 'subscription'
  | 'channel'
  | 'space'
  | 'serverHandler'
  | 'clientHandler'
  | 'coreStage'
  | 'loadedStage'
  | 'finalStage'
export type StagePointType = 'coreStage' | 'loadedStage' | 'finalStage'
export type ReadyPointType = Exclude<PointType, StagePointType>
// handlers and spaces live on the socket, not on HTTP — only the channel (its connect request) is requestable
export type RequestableReadyPointType = Exclude<
  ReadyPointType,
  'root' | 'base' | 'plugin' | 'space' | 'serverHandler' | 'clientHandler'
>
/**
 * The point-kind taxonomy, in one place:
 *
 * - {@link MountablePointType} — kinds whose SELF is content with the full data pipeline (self-query, mapper, props); the
 *   `.loading()`/`.error()` field-vs-action split and the mountable query finalize key on this.
 * - {@link RenderablePointType} — everything that renders through the `_Mountable` interpreter: the mountables plus
 *   channel/space, whose `<Connection>`/`<Membership>` render the chain's mount actions closed by their own terminal
 *   step (no data pipeline of their own). The destination component variant keys on this.
 * - socket points (handlers, the space OPENER stage) never render — their mount actions are reset at `lets()`.
 */
export type MountablePointType = 'page' | 'component' | 'layout' | 'provider'
export type RenderablePointType = MountablePointType | 'channel' | 'space'
export type QueryableReadyPointType = MountablePointType | 'query' | 'infiniteQuery'
export type IsReadyPointType<TPointType extends PointType> = TPointType extends ReadyPointType ? true : false
export type UndefinedReadyPointType = undefined
export type ReadyPointTypeOrNever<TPointType extends PointType | UndefinedReadyPointType> =
  TPointType extends ReadyPointType ? TPointType : never
export type StagePointTypeOrNever<TPointType extends PointType | UndefinedReadyPointType> =
  TPointType extends StagePointType ? TPointType : StagePointType

export type AnyPoint<
  TPointType extends PointType = any,
  TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType = UndefinedReadyPointType,
  TRequiredCtx extends RequiredCtx = any,
  TError extends ErrorPoint0 = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = Point0<
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
>

export type RootPoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = AnyPoint<
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
>

export type PluginPoint<
  TRequiredCtx extends RequiredCtx = any,
  TError extends ErrorPoint0 = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = AnyPoint<
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
>

export type BasePoint<
  TRequiredCtx extends RequiredCtx = any,
  TError extends ErrorPoint0 = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = AnyPoint<
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
>

export type PagePoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = AnyPoint<
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

export type LayoutPoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = AnyPoint<
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

export type ActionPoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = AnyPoint<
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

export type ReadyPoint<
  TPointType extends ReadyPointType = any,
  TRequiredCtx extends RequiredCtx = any,
  TError extends ErrorPoint0 = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = AnyPoint<
  TPointType,
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

export type RequestableReadyPoint<
  TPointType extends RequestableReadyPointType = RequestableReadyPointType,
  TRequiredCtx extends RequiredCtx = any,
  TError extends ErrorPoint0 = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = AnyPoint<
  TPointType,
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

// action

export type EndpointDefinition = {
  /** The endpoint's primary method — what the client uses by default and OpenAPI documents as canonical. */
  method: WideRequestMethod
  route: AnyRoute
  /**
   * Every method the server routes this endpoint under. `[method]` for most points; a query endpoint answers to both
   * `GET` (input in the URL, cacheable) and `POST` (the client's fallback for a binary or over-long input), so it's
   * `['GET', 'POST']`. Precomputed at endpoint generation so routing never recomputes it.
   */
  methods: WideRequestMethod[]
}

type ActionInputRawBySchemaKey<
  TSchema extends InputSchema | UndefinedInputSchema,
  TKey extends 'params' | 'search' | 'body',
> = TSchema extends InputSchema
  ? IsSchemaOptional<TSchema> extends true
    ? {
        [K in TKey]?: InputRaw<TSchema>
      }
    : {
        [K in TKey]: InputRaw<TSchema>
      }
  : EmptyObject
type ActionInputParsedBySchemaKey<
  TSchema extends InputSchema | UndefinedInputSchema,
  TKey extends 'params' | 'search' | 'body',
> = IfAnyThenElse<
  TSchema,
  any,
  TSchema extends InputSchema
    ? IsSchemaOptional<TSchema> extends true
      ? {
          [K in TKey]?: InputParsed<TSchema>
        }
      : {
          [K in TKey]: InputParsed<TSchema>
        }
    : TKey extends 'body'
      ? { body?: Data | FormData }
      : EmptyObject
>
export type ActionInputRaw<
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
> = PrettifyOrEmptyObject<
  ActionInputRawBySchemaKey<TParamsSchema, 'params'> &
    ActionInputRawBySchemaKey<TSearchSchema, 'search'> &
    ActionInputRawBySchemaKey<TBodySchema, 'body'>
>
export type ActionInputParsed<
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
> = PrettifyOrEmptyObject<
  ActionInputParsedBySchemaKey<TParamsSchema, 'params'> &
    ActionInputParsedBySchemaKey<TSearchSchema, 'search'> &
    ActionInputParsedBySchemaKey<TBodySchema, 'body'>
>
export type ActionInputRawOrUndefined<
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
> = UndefinedIfEmptyObject<ActionInputRaw<TParamsSchema, TSearchSchema, TBodySchema>>
export type IsActionInputOptional<
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
> = EmptyObject extends ActionInputRaw<TParamsSchema, TSearchSchema, TBodySchema> ? true : false

export type ResponseContentType =
  | 'application/json'
  | 'text/plain'
  | 'text/html'
  | 'text/css'
  | 'text/javascript'
  | 'application/javascript'
  | 'application/xml'
  | 'application/pdf'
  | 'application/octet-stream'
  | 'multipart/form-data'
  | 'application/x-www-form-urlencoded'
  | `image/${string}`
  | `audio/${string}`
  | `video/${string}`
  | (string & {})
export type NormalizedResponseSchema = {
  [status: number]: {
    description?: string
    content: Partial<
      Record<
        ResponseContentType,
        {
          schema: InputSchema
          description?: string
          examples?: Record<string, any>
        }
      >
    >
  }
}
export type NormalizedEndpointOpenapiSchema = Omit<
  OpenAPIV3.OperationObject,
  'parameters' | 'requestBody' | 'responses'
>

// schema helper

export type SchemaHelper = {
  isSuitable: ((schema: unknown) => boolean) | string // if string, then just pick by standard schema vendor
  extractKeys?: (schema: unknown) => string[] | undefined
  hasFileOrBlob?: (schema: unknown) => boolean
  isAllItemsOptional?: (schema: unknown) => boolean
  toJson?: (schema: unknown) => object | undefined
}

// input

export type RecordValidationSchema<
  TInput extends Record<string, unknown> = Record<string, unknown>,
  TOutput extends Record<string, unknown> = Record<string, unknown>,
> = StandardSchemaV1<TInput, TOutput>
export type RecordValidationSchemaInput<S extends RecordValidationSchema> = StandardSchemaV1.InferInput<S>
export type RecordValidationSchemaOutput<S extends RecordValidationSchema> = StandardSchemaV1.InferOutput<S>

export type RouteSchema<TRouteDefinition extends RouteDefinition> = RecordValidationSchema<
  ParamsInput<TRouteDefinition>,
  ParamsOutput<TRouteDefinition>
>
export type CustomValidationFn<TOutput extends InputParsed = InputParsed> = (data: InputRawUnknown) => TOutput
export type CustomValidationFnWithKnownInput<TInput extends InputRaw, TOutput extends InputParsed> = (
  data: TInput,
) => TOutput
export type RecordSchemaToCustomValidationFn<T extends RecordValidationSchema> = (
  data: InputRawUnknown,
) => RecordValidationSchemaOutput<T>
export type CustomValidationFnToRecordValidationSchema<T extends CustomValidationFn> = RecordValidationSchema<
  ReturnType<T>,
  ReturnType<T>
>
export type CustomValidationFnWithKnownInputToRecordValidationSchema<
  T extends CustomValidationFnWithKnownInput<any, any>,
> =
  T extends CustomValidationFnWithKnownInput<infer TInput, infer TOutput>
    ? RecordValidationSchema<TInput, TOutput>
    : never

type MergeObjectsSingle<A, B> =
  IsEmptyObject<B> extends true ? A : IsEmptyObject<A> extends true ? B : Omit<A, keyof B> & B
export type MergeObjects<A, B> = A extends unknown ? (B extends unknown ? MergeObjectsSingle<A, B> : never) : never
export type MergeRecordValidationSchemas<
  TSchema1 extends RecordValidationSchema | undefined,
  TSchema2 extends RecordValidationSchema | undefined,
> = IfAnyThenElse<
  TSchema1 | TSchema2,
  any,
  TSchema1 extends RecordValidationSchema
    ? TSchema2 extends RecordValidationSchema
      ? RecordValidationSchema<
          PrettifyOrEmptyObject<
            MergeObjects<RecordValidationSchemaInput<TSchema1>, RecordValidationSchemaInput<TSchema2>>
          >,
          PrettifyOrEmptyObject<
            MergeObjects<RecordValidationSchemaOutput<TSchema1>, RecordValidationSchemaOutput<TSchema2>>
          >
        >
      : TSchema1
    : TSchema2 extends RecordValidationSchema
      ? TSchema2
      : undefined
>

export type IsObjectOptional<T> = EmptyObject extends T ? true : false
export type HasRequiredKeysInValidationSchema<S extends RecordValidationSchema | undefined> =
  S extends RecordValidationSchema ? (EmptyObject extends RecordValidationSchemaInput<S> ? false : true) : false
export type IsSchemaOptional<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = HasRequiredKeysInValidationSchema<TInputSchema> extends true ? false : true

type KeysOfUnion<T> = T extends unknown ? keyof T : never
type ValueAtKey<T, K extends PropertyKey> = T extends unknown ? (K extends keyof T ? T[K] : never) : never
type OverlapKeys<A, B> = KeysOfUnion<A> & KeysOfUnion<B>
type IsNarrowerOrEqual<New, Prev> = [New] extends [Prev] ? true : false
type HasWideningKey<Prev, New> = {
  [K in OverlapKeys<Prev, New>]: IsNarrowerOrEqual<ValueAtKey<New, K>, ValueAtKey<Prev, K>> extends true ? never : K
}[OverlapKeys<Prev, New>] extends never
  ? false
  : true

export type IsInputSchemaConflicts<
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
> = TPrevInputSchema extends InputSchema
  ? TNewInputSchema extends InputSchema
    ? HasWideningKey<InputRaw<TPrevInputSchema>, InputRaw<TNewInputSchema>>
    : false
  : false

export type IsRouteSchemaExtends<
  TCurrentRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TNewRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = TCurrentRouteDefinition extends RouteDefinition
  ? TNewRouteDefinition extends RouteDefinition
    ? RouteSchema<TNewRouteDefinition> extends RouteSchema<TCurrentRouteDefinition>
      ? true
      : false
    : false
  : true

export type AssertSchemaNotWider<
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
  TWhat extends string,
> =
  IsInputSchemaConflicts<TPrevInputSchema, TNewInputSchema> extends true
    ? ShowError<`Previous provided ${TWhat} schema is not assignable to new schema`>
    : unknown
export type AssertInputSchemaNotWider<
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
> =
  IsInputSchemaConflicts<TServerInputSchema, TNewInputSchema> extends true
    ? ShowError<`Last provided input schema is not assignable to current point server input schema`>
    : IsInputSchemaConflicts<TClientInputSchema, TNewInputSchema> extends true
      ? ShowError<`Last provided input schema is not assignable to current point client input schema`>
      : unknown
type IsInputSchemaHasAnotherKeys<
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
> = TPrevInputSchema extends InputSchema
  ? TNewInputSchema extends InputSchema
    ? Exclude<KeysOfUnion<InputRaw<TPrevInputSchema>>, KeysOfUnion<InputRaw<TNewInputSchema>>> extends never
      ? false // has not another keys
      : true // has another keys
    : false // no new schema, so has not another keys
  : TNewInputSchema extends InputSchema
    ? true // no previous schema, so has another keys
    : false // no new schema, so has not another keys
type IsInputSchemaHasSameKeys<
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
> = TPrevInputSchema extends InputSchema
  ? TNewInputSchema extends InputSchema
    ? Exclude<KeysOfUnion<InputRaw<TPrevInputSchema>>, KeysOfUnion<InputRaw<TNewInputSchema>>> extends never
      ? Exclude<KeysOfUnion<InputRaw<TNewInputSchema>>, KeysOfUnion<InputRaw<TPrevInputSchema>>> extends never
        ? true
        : false
      : false
    : false
  : true
type IsInputSchemaIncludesKeys<
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
> = TPrevInputSchema extends InputSchema
  ? TNewInputSchema extends InputSchema
    ? Exclude<KeysOfUnion<InputRaw<TPrevInputSchema>>, KeysOfUnion<InputRaw<TNewInputSchema>>> extends never
      ? true
      : false
    : false
  : true
export type AssertInputSchemaHasSameKeys<
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
  TWhat extends string,
> =
  IsInputSchemaHasSameKeys<TNewInputSchema, TPrevInputSchema> extends false
    ? ShowError<`Provided ${TWhat} schema should contain same keys as previously defined`>
    : unknown
export type AssertInputSchemaHasNotAnotherKeys<
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
  TWhat extends string,
> =
  IsInputSchemaHasAnotherKeys<TNewInputSchema, TPrevInputSchema> extends true
    ? ShowError<`Previous provided ${TWhat} should not have another keys that was previously defined`>
    : unknown
export type AssertInputSchemaIncludesKeys<
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
  TWhat extends string,
> =
  IsInputSchemaIncludesKeys<TNewInputSchema, TPrevInputSchema> extends false
    ? ShowError<`Provided ${TWhat} schema should include keys from previously defined`>
    : unknown

export type AssertRouteSchemaExtends<
  TCurrentRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TNewRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> =
  IsRouteSchemaExtends<TCurrentRouteDefinition, TNewRouteDefinition> extends true
    ? unknown
    : ShowError<`Provided route definition is not assignable to current point route definition`>

export type RoutedInputRaw<
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = (TParamsSchema extends InputSchema ? InputRaw<TParamsSchema> : EmptyObject) &
  (TSearchSchema extends InputSchema
    ? IsSchemaOptional<TSearchSchema> extends true
      ? { '?'?: InputRaw<TSearchSchema> }
      : { '?': InputRaw<TSearchSchema> }
    : { '?'?: UnknownSearchInput })
export type InputSchema = RecordValidationSchema
export type UndefinedInputSchema = undefined
export type FinalServerInputRaw<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TPointType extends 'action'
  ? ActionInputRaw<TParamsSchema, TSearchSchema, TBodySchema>
  : TPointType extends 'page' | 'layout'
    ? RoutedInputRaw<TParamsSchema, TSearchSchema>
    : // `space` included: raw = the pre-validation input (the schema's INPUT type) — the stage exists on the socket
      // exactly as on HTTP, the join frame's deserialized input is parsed by the same schema
      TPointType extends 'component' | 'provider' | 'query' | 'infiniteQuery' | 'mutation' | 'channel' | 'space'
      ? InputRaw<TServerInputSchema>
      : InputRaw
export type FinalServerInputParsed<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TPointType extends 'action'
  ? ActionInputParsed<TParamsSchema, TSearchSchema, TBodySchema>
  : TPointType extends 'page' | 'layout'
    ? InputParsed<MergeRecordValidationSchemas<TSearchSchema, TParamsSchema>>
    : TPointType extends 'component' | 'provider' | 'query' | 'infiniteQuery' | 'mutation' | 'channel' | 'space'
      ? InputParsed<TServerInputSchema>
      : InputParsed
export type FinalInputRaw<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TPointType extends 'action'
  ? ActionInputRaw<TParamsSchema, TSearchSchema, TBodySchema>
  : TPointType extends 'page' | 'layout'
    ? RoutedInputRaw<TParamsSchema, TSearchSchema>
    : TPointType extends
          | 'component'
          | 'provider'
          | 'query'
          | 'infiniteQuery'
          | 'mutation'
          | 'subscription'
          | 'channel'
          | 'space'
      ? InputRaw<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>>
      : InputRaw
export type IsFinalInputOptional<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = IsObjectOptional<
  FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>
>
export type IsFinalServerInputOptional<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = IsObjectOptional<FinalServerInputRaw<TPointType, TServerInputSchema, TParamsSchema, TSearchSchema, TBodySchema>>
export type InputParsed<TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema> =
  TInputSchema extends RecordValidationSchema ? RecordValidationSchemaOutput<TInputSchema> : EmptyObject
export type InputRaw<TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema> =
  TInputSchema extends RecordValidationSchema ? RecordValidationSchemaInput<TInputSchema> : EmptyObject
type UndefinedIfEmptyObject<T> = IsEmptyObjectSpecial<T> extends true ? undefined | EmptyObjectOnly : T
export type FinalInputRawOrUndefined<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = UndefinedIfEmptyObject<
  FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>
>

// Keep it for mutation options, so if input can be undefined, then it also can be void, so we can not pass input at all.
// The empty branch allows the literal `{}` too: a no-input point accepts `undefined` and `{}` interchangeably (both
// normalize to `{}` inside) — `EmptyObjectOnly` keeps arbitrary keyed objects out.
type UndefinedOrVoidIfEmptyObjectSuitable<T> =
  IsEmptyObjectSpecial<T> extends true
    ? undefined | void | EmptyObjectOnly
    : IsObjectOptional<T> extends true
      ? undefined | void | T
      : T

export type FinalInputRawOrUndefinedOrVoid<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = UndefinedOrVoidIfEmptyObjectSuitable<
  FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>
>

export type IsInputsSchemasDefined<
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TServerInputSchema extends InputSchema ? true : TClientInputSchema extends InputSchema ? true : false

export type IsInputFlat<
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TBodySchema extends InputSchema ? (TSearchSchema extends InputSchema ? false : true) : true

export type InputRawUnknown = Record<string, unknown>

export type SimpleSafeParseInputResult<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TError = unknown,
> =
  | {
      success: true
      data: InputParsed<TInputSchema>
      error: undefined
    }
  | {
      success: false
      data: undefined
      error: TError
    }

// utils

export type Prettify<T extends object> = {
  [K in keyof T]: T[K]
} & {}
export type PrettifyOrEmptyObject<T extends object> = IsEmptyObject<T> extends true ? EmptyObject : Prettify<T>

type EmptyObjectIfUndefined<T> = T extends undefined ? EmptyObject : T
export type AppendCtx<
  TCtx extends UnknownCtx | UndefinedCtx,
  TAppend extends UnknownCtx | UndefinedCtx,
> = PrettifyOrEmptyObject<
  TCtx extends Ctx
    ? IsNever<keyof TCtx> extends true
      ? TAppend extends undefined
        ? EmptyObject
        : IsEmptyObject<TAppend> extends true
          ? EmptyObject
          : TAppend
      : TAppend extends undefined
        ? TCtx
        : IsEmptyObject<TAppend> extends true
          ? TCtx
          : Omit<TCtx, keyof TAppend> & TAppend
    : EmptyObjectIfUndefined<TAppend>
>
export type AppendCtxExposedKeys<
  TCurrent extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TAppend extends CtxExposedKeys | UndefinedCtxExposedKeys,
> = TCurrent extends CtxExposedKeys
  ? TAppend extends CtxExposedKeys
    ? TCurrent | TAppend
    : TCurrent
  : TAppend extends CtxExposedKeys
    ? TAppend
    : UndefinedCtxExposedKeys
export type ExposedCtx<TCtx extends Ctx, TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys> = [
  TCtxExposedKeys,
] extends [CtxExposedKeys]
  ? {
      [K in TCtxExposedKeys]: K extends keyof TCtx ? TCtx[K] : never
    }
  : UndefinedCtx
export type ExposedCtxOrEmpty<TCtx extends Ctx, TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys> =
  ExposedCtx<TCtx, TCtxExposedKeys> extends undefined ? EmptyObject : ExposedCtx<TCtx, TCtxExposedKeys>
export type CurrentRouteDefinition<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = TRouteDefinition extends RouteDefinition ? TRouteDefinition : string

export type FirstReadyPointTypeOrNever<
  TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType,
  TPointType extends PointType,
> = TLetsReadyPointType extends ReadyPointType
  ? TLetsReadyPointType
  : TPointType extends ReadyPointType
    ? TPointType
    : never

export type EmptyStringIfStandaloneSlash<TRouteDefinition extends RouteDefinition> = TRouteDefinition extends `/`
  ? ''
  : TRouteDefinition
export type StandaloneSlashIfUndefined<TRouteDefinition extends RouteDefinition | undefined> =
  TRouteDefinition extends undefined ? '/' : TRouteDefinition
export type ExtendRouteDefinition<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TProvidedRoute extends RouteDefinition,
> = Extended<StandaloneSlashIfUndefined<TRouteDefinition>, EmptyStringIfStandaloneSlash<TProvidedRoute>>['definition']

export type DataOrUndefinedData<TData extends Data | Response | UndefinedData> = TData extends Data
  ? TData
  : UndefinedData
export type FinalLoaderData<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = TClientLoaderOutput extends Data
  ? TClientLoaderOutput
  : TServerLoaderOutput extends Data
    ? TServerLoaderOutput
    : undefined
export type FinalLoaderDataOrNever<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = TClientLoaderOutput extends Data
  ? TClientLoaderOutput
  : TServerLoaderOutput extends Data
    ? TServerLoaderOutput
    : never
export type FinalLoaderOutput<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = TClientLoaderOutput extends LoaderOutput
  ? TClientLoaderOutput
  : TServerLoaderOutput extends LoaderOutput
    ? TServerLoaderOutput
    : undefined
export type QueriedData<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = TLoaderOutput extends Data
  ? TQueryResultType extends 'infiniteQuery'
    ? InfiniteData<TLoaderOutput>
    : TQueryResultType extends 'query'
      ? TLoaderOutput
      : undefined
  : undefined
export type FinalQueriedData<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = QueriedData<TQueryResultType, FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
export type QueriedFiniteData<TLoaderOutput extends LoaderOutput | UndefinedLoaderOutput> = TLoaderOutput extends Data
  ? TLoaderOutput
  : undefined
export type FinalQueriedFiniteData<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = QueriedFiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
export type QueriedInfiniteData<TLoaderOutput extends LoaderOutput | UndefinedLoaderOutput> = TLoaderOutput extends Data
  ? InfiniteData<TLoaderOutput>
  : undefined
export type FinalQueriedInfiniteData<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = QueriedInfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>

export type HasAnyLoader<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = TServerLoaderOutput extends LoaderOutput ? true : TClientLoaderOutput extends LoaderOutput ? true : false

export type IsEmptyObject<T> = keyof T extends never ? true : false
export type IsRecord<T> = T extends object ? (string extends keyof T ? true : false) : false
type HasAnyKeys<T> = T extends unknown ? (keyof T extends never ? never : true) : never
export type IsEmptyObjectSpecial<T> = [T] extends [object] ? ([HasAnyKeys<T>] extends [never] ? true : false) : false
export type IsUnknownRecord<T> = T extends Record<string, unknown> ? true : false
export type IsNever<T> = [T] extends [never] ? true : false

export type IfAnyThenElse<T, Then, Else = T> = 0 extends 1 & T ? Then : Else
export type IsAny<T> = 0 extends 1 & T ? true : false

export type IfNeverThen<TElse, TThen> = [TElse] extends [never] ? TThen : TElse
export type IsUndefined<T> = T extends undefined ? true : false
// export type IfVoidThen<TThen, TElse> = IsUndefined<TThen> extends false ? TThen : TElse

export type FetchFn = (request: Request) => Promise<Response>
export type RichFetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export type ShowError<Message extends string> = {
  readonly __error__: Message
} & Record<Message, Message>
export type AssertNoArrayReturn<TValue, TMessage extends string> = TValue extends readonly unknown[]
  ? ShowError<TMessage>
  : unknown
export type AssertNotFunction<TValue, TMessage extends string> = TValue extends (...args: any[]) => any
  ? ShowError<TMessage>
  : unknown
export type WithError<TError, T> = unknown extends TError
  ? T
  : TError extends ShowError<infer TMessage>
    ? ShowError<`↑ Error in previous method: ${TMessage}`>
    : TError

// '/' → '/'
// '/my/path' → '/my/path'
// 'https://example.com' → '/'
// 'https://example.com/my/path' → '/my/path'
export type BasePathByBaseUrl<TBaseUrl extends string | undefined> = TBaseUrl extends undefined
  ? '/'
  : TBaseUrl extends `${string}://${string}/${infer TPath}`
    ? TPath extends ''
      ? '/'
      : `/${TPath}`
    : TBaseUrl extends `${string}://${string}`
      ? '/'
      : TBaseUrl extends `/${string}`
        ? TBaseUrl
        : '/'

// fetching and queries

export type UseMutationOptions<
  TData = any,
  TError = any,
  TVariables = any,
  TContext = unknown,
> = OriginalUseMutationOptions<TData, TError, TVariables, TContext>
export type ExtraUseMutationOptions<TData = any, TError = any, TVariables = any, TContext = unknown> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'mutationFn' | 'mutationKey'
>
export type UseQueryOptions<
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
> = OriginalUseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
export type ExtraQueryPoint0Options = {
  /**
   * Whether the server executes this query during SSR. Ignored on the client — after hydration and on client
   * navigations the query fetches exactly as it always did.
   *
   * - `true` (default, same as omitting) — the server fetches the query during SSR.
   * - `false` — the server never executes the query: the HTML ships this mountable's loading state and the client fetches
   *   after hydration (same shape as a `.clientLoader()` query during SSR).
   *
   * Merged like any other query option: the later, more specific declaration wins (defaults → point-kind defaults →
   * `.query()` options → the hook/`.with()` call site).
   */
  ssr?: boolean
  /**
   * Whether a pending query suspends into the nearest Suspense boundary (the closest positional `.loading()` of the
   * mountable chain) instead of returning a pending result.
   *
   * - `'auto'` (default, same as omitting) — while the server can still wait for the query, nothing special happens: the
   *   discover loop fetches it and its data ships inside the HTML. It suspends only when waiting is impossible — in the
   *   final streamed render (revealed under an already-streamed boundary, or left pending because
   *   `allowedDiscoveryRenders` cut the discover loop short) it suspends and streams into the response instead of
   *   shipping a dead pending state. Never suspends on the client.
   * - `'server'` — the server never blocks the response on this query: the loader starts immediately, the shell ships
   *   with the mountable's `.loading()` fallback, and the resolved content streams into the same response (an inline
   *   script seeds the client cache — no refetch after hydration). Never suspends on the client.
   * - `true` — like `'server'`, and the query also suspends on the client (client navigations, fresh inputs) into the
   *   same positional boundaries. For non-optional `data` in types use `useSuspenseQuery` instead.
   * - `'client'` — suspends only on the client (client navigations, fresh inputs); during SSR it never suspends (the
   *   server half of `false`: a query still pending at the final render ships the loading state and the client fetches
   *   after hydration). The mirror of `'server'`, for completeness.
   * - `false` — never suspends anywhere: a query still pending at the final render ships the loading state in the HTML
   *   and the client fetches after hydration.
   *
   * Suspension is for PENDING queries only. A failing query never throws through this option — on both sides the error
   * arrives as query state (the chain renders the positional `.error()`, a manual hook reads `query.error` itself);
   * only the dedicated suspense hooks throw errors to the boundary.
   *
   * A loader that resolves after the shell was sent cannot redirect, set cookies, or change the status/headers — and
   * cannot feed an SsrStore/cookie value into the SSR re-render loop.
   *
   * Merged like any other query option, so `.queryOptions({ suspend: 'server' })` on a root, layout, or page makes the
   * whole subtree streaming-first: the shell ships at once and every query streams in as it resolves.
   */
  suspend?: 'auto' | 'server' | 'client' | boolean
}
export type ExtraUseQueryOptions<
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryFn' | 'queryKey'> & ExtraQueryPoint0Options
type PathKeys<T> =
  T extends Record<string, unknown>
    ? {
        [K in keyof T]-?: K extends string
          ? NonNullable<T[K]> extends Record<string, unknown>
            ? K | `${K}.${PathKeys<NonNullable<T[K]>>}`
            : K
          : never
      }[keyof T]
    : never
/**
 * The value type at a (possibly deep, dot-separated) `PathKeys` path — the type-level twin of the runtime `getByPath`.
 * One path rule for every path-keyed option: `pageParamFromInput` on infinite queries and the subscription cursor pair
 * (`cursorParamFromInput` / `cursorParamFromData`). Optional steps pass through (`NonNullable`, like `PathKeys`); a
 * path a union member does not carry resolves to `undefined` for that member.
 */
type GetByPathType<T, TPath extends string> =
  T extends Record<string, unknown>
    ? TPath extends `${infer THead}.${infer TRest}`
      ? THead extends keyof T
        ? GetByPathType<NonNullable<T[THead]>, TRest>
        : undefined
      : TPath extends keyof T
        ? T[TPath]
        : undefined
    : undefined
export type UseInfiniteQueryOptions<
  TInput extends InputRaw,
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = any,
> = OriginalUseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam> & {
  pageParamFromInput:
    | PathKeys<TInput>
    | {
        set: ({ input, value, set }: { input: TInput; value: TPageParam; set: SetByPath }) => void
        get: ({ input, get }: { input: TInput; get: GetByPath }) => unknown
      }
}

export type ExtraUseInfiniteQueryOptions<
  TInput extends InputRaw,
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = any,
> = Omit<UseInfiniteQueryOptions<TInput, TQueryFnData, TError, TData, TQueryKey, TPageParam>, 'queryFn' | 'queryKey'> &
  ExtraQueryPoint0Options
export type PartialUseInfiniteQueryOptions<
  TInput extends InputRaw = InputRaw,
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = any,
> = Partial<ExtraUseInfiniteQueryOptions<TInput, TQueryFnData, TError, TData, TQueryKey, TPageParam>>

// Options for the suspense hooks (`useSuspenseQuery` / `useSuspenseInfiniteQuery`). A suspense query can never be
// disabled or placeholder-filled (it must resolve to real data — TanStack v5 semantics), and the `ssr`/`suspense`
// behavior options are meaningless there: the hook always suspends, on both sides.
export type ExtraUseSuspenseQueryOptions<
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  ExtraUseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'enabled' | 'placeholderData' | 'ssr' | 'suspend'
>
export type PartialUseSuspenseInfiniteQueryOptions<
  TInput extends InputRaw = InputRaw,
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = any,
> = Omit<
  PartialUseInfiniteQueryOptions<TInput, TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  'enabled' | 'placeholderData' | 'ssr' | 'suspend'
>

type NarrowQueryComponentPropStatus<
  T extends { status: 'pending' | 'error' | 'success' },
  S extends string,
> = IfAnyThenElse<S, T, Extract<T, { status: S }>>
export type UseServerQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TError extends ErrorPoint0,
  TStatus extends 'pending' | 'error' | 'success',
> = TServerLoaderOutput extends UndefinedLoaderOutput
  ? never
  : TQueryResultType extends 'infiniteQuery'
    ? NarrowQueryComponentPropStatus<
        UseInfiniteQueryResult<InfiniteData<FetchServerOutput<TServerLoaderOutput>>, TError>,
        TStatus
      >
    : TQueryResultType extends 'query'
      ? NarrowQueryComponentPropStatus<UseQueryResult<FetchServerOutput<TServerLoaderOutput>, TError>, TStatus>
      : never
export type UseClientQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TError extends ErrorPoint0,
  TStatus extends 'pending' | 'error' | 'success',
> = TClientLoaderOutput extends UndefinedLoaderOutput
  ? never
  : TQueryResultType extends 'infiniteQuery'
    ? NarrowQueryComponentPropStatus<UseInfiniteQueryResult<InfiniteData<TClientLoaderOutput>, TError>, TStatus>
    : TQueryResultType extends 'query'
      ? NarrowQueryComponentPropStatus<UseQueryResult<TClientLoaderOutput, TError>, TStatus>
      : never
export type UsePointQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TError extends ErrorPoint0,
  TStatus extends 'pending' | 'error' | 'success' = any,
> = TServerLoaderOutput extends Data
  ? // only one loader per point, so a server loader is always the sole loader here
    UseServerQueryResult<TQueryResultType, TServerLoaderOutput, TError, TStatus>
  : TClientLoaderOutput extends Data
    ? UseClientQueryResult<TQueryResultType, TClientLoaderOutput, TError, TStatus>
    : never
// The suspense hooks' result: real TanStack `UseSuspenseQueryResult` — `data` is non-optional, pending suspends,
// errors throw to the nearest ErrorBoundary (the mountable's positional `.error()`).
export type UsePointSuspenseQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TError extends ErrorPoint0,
> = TServerLoaderOutput extends Data
  ? // only one loader per point, so a server loader is always the sole loader here
    TQueryResultType extends 'infiniteQuery'
    ? UseSuspenseInfiniteQueryResult<InfiniteData<FetchServerOutput<TServerLoaderOutput>>, TError>
    : TQueryResultType extends 'query'
      ? UseSuspenseQueryResult<FetchServerOutput<TServerLoaderOutput>, TError>
      : never
  : TClientLoaderOutput extends Data
    ? TQueryResultType extends 'infiniteQuery'
      ? UseSuspenseInfiniteQueryResult<InfiniteData<TClientLoaderOutput>, TError>
      : TQueryResultType extends 'query'
        ? UseSuspenseQueryResult<TClientLoaderOutput, TError>
        : never
    : never
export type UsePointQueryOptions<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TError extends ErrorPoint0,
> = TQueryResultType extends 'infiniteQuery'
  ? // Partial: this is the CALL-SITE override type (`useInfiniteQuery(input, {…})`, `.with(point, input, {…})`,
    // `.relatedQuery`) — the required infinite shape (`pageParamFromInput`/`getNextPageParam`/`initialPageParam`)
    // was already declared on the `.infiniteQuery({…})` close and the runtime merge fills it in.
    PartialUseInfiniteQueryOptions<
      FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>,
      FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
      TError,
      InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
      QueryKey,
      unknown
    >
  : TQueryResultType extends 'query'
    ? ExtraUseQueryOptions<
        FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
        TError,
        FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
        QueryKey
      >
    : never

// query cache result

// export type

// settings

export type FetchOptionsFn = () => FetchOptions
export type FetchOptionsOrFn = FetchOptionsFn | FetchOptions
export type FetchOptions = RequestInit & { transform?: boolean }

export type ScrollPositionGetter = () => { x: number; y: number } | undefined
export type ScrollPositionSetter = (position: { x: number; y: number }) => void
/** `'push'` — a new navigation (forward); `'pop'` — back/forward through history. */
export type ScrollPositionRestoreType = 'push' | 'pop'
// true - restore saved position (or 0,0), false - leave scroll as-is, null - scroll to 0,0
export type ScrollPositionRestorePolicy = (options: {
  prevLocation: AnyLocation | null
  type: ScrollPositionRestoreType
}) => boolean | null
export type ScrollConfig = {
  getter: ScrollPositionGetter
  setter: ScrollPositionSetter
  policy: ScrollPositionRestorePolicy
}

export type QueryMode = 'server' | 'client'
export type PrefetchPagePolicy =
  | 'serverQuery'
  | 'clientQuery'
  | 'serverAndClientQuery'
  | 'pageDehydratedState'
  | 'pageDehydratedStateAndClientQuery'
  | 'onPrefetchOnly'
  | 'none'
  | false
export type NormalizedPrefetchPagePolicy = Exclude<PrefetchPagePolicy, boolean>

// middlewares

/**
 * SSR tuning for a single point, authored on the chain via {@link Point0.ssr} — the same knobs the engine's per-side
 * `ssr` option carries, but per point. `enabled` applies to any point; the render-loop options only matter for pages
 * and layouts. An unset key inherits the scope default (the point's root) and, under that, the engine's per-side
 * value.
 */
export type PointSsrOptions = {
  allowedDiscoveryRenders?: number
  forbiddenDiscoveryRenders?: number
  prefetchLoadersBeforePageRender?: boolean
}
/**
 * What `.ssr(...)` accepts. SSR can only be turned OFF per point, never on: `false` opts the point out of SSR (it ships
 * as the client shell), or an options object tunes the render loop (and may also opt out via `enabled: false`). Forcing
 * SSR on where the side default is off is impossible — the request pipeline never engages SSR for that side — so
 * `enabled` is `false`-only.
 */
export type PointSsrInput = false | ({ enabled?: false } & PointSsrOptions)
/** What a point stores in `_ssr`: the accumulated `.ssr(...)` merges. `enabled` is only ever `false` or absent. */
export type PointSsrState = { enabled?: false } & PointSsrOptions
/** A fully-resolved per-scope SSR default (the engine's per-side value): `enabled` plus the render-loop options. */
export type PointSsrResolved = { enabled: boolean } & PointSsrOptions

export type NiceServerPoints = {
  collection: AnyNiceReadyPoint[]
  /**
   * Per-scope SSR defaults, one entry per side (the server's own scope plus every client), filled by the engine from
   * the per-side `ssr` config. SSR resolves per-side, but this map is generated on the server, so tooling that runs
   * there (the {@link openapi} spec, notably) can resolve a point's SSR by its owning scope instead of the ambient
   * `_getSsrEnabled()` — which on the server would report the _server's_ SSR, not that of the client that owns the
   * point. An explicit `.ssr(...)` on the point still wins over this default. Absent when the points weren't built by
   * the engine.
   */
  ssrDefaultOptionsByScope?: Map<PointsScope, PointSsrResolved>
  findPoint: (options: { type: PointType; name: PointName; scope: PointsScope }) => AnyNiceReadyPoint | undefined
  findEndpoint: (
    options:
      | { method: string; location: AnyLocation; url?: undefined }
      | {
          method: string
          url: string
          location?: undefined
        },
  ) =>
    | {
        point: AnyNiceRequestableReadyPoint
        location: ExactLocation
      }
    | undefined
  findPage: (
    options:
      | { url: string | URL; scope?: PointsScope; location?: undefined }
      | { location: AnyLocation; scope?: PointsScope; url?: undefined },
  ) => undefined | { point: AnyNicePagePoint; location: ExactLocation }
}

export type UndefinedResponse = undefined

export type ServerExecuteFn = <
  TPoint extends {
    Infer: {
      IsServerInputOptional: boolean
      ServerInputRaw: any
      Ctx: Ctx
      ServerLoaderOutput: LoaderOutput | UndefinedLoaderOutput
      Error: ErrorPoint0
    }
  },
>(
  point: TPoint,
  ...args: TPoint['Infer']['IsServerInputOptional'] extends true
    ? [input?: TPoint['Infer']['ServerInputRaw']]
    : [input: TPoint['Infer']['ServerInputRaw']]
) => Promise<
  ServerExecuteResult<TPoint['Infer']['Ctx'], TPoint['Infer']['ServerLoaderOutput'], TPoint['Infer']['Error']>
>
export type ServerExecuteResult<
  TCtx extends Ctx,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TError extends ErrorPoint0,
> =
  | {
      ctx: TCtx
      data: TServerLoaderOutput extends Data ? TServerLoaderOutput : undefined
      response: TServerLoaderOutput extends Response ? TServerLoaderOutput : undefined
      redirect: undefined
      effects: ResponseEffectsValues
      error: undefined
      output: TServerLoaderOutput
      point: ReadyPoint
    }
  | {
      ctx: Ctx
      data: Data | UndefinedData
      response: Response | UndefinedResponse
      redirect: RedirectTask | undefined
      effects: ResponseEffectsValues
      error: TError
      output: LoaderOutput | UndefinedLoaderOutput
      point: ReadyPoint | undefined
    }

type WithInputParsed<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema,
> = (TServerInputSchema extends InputSchema ? { input: InputParsed<TServerInputSchema> } : unknown) &
  (TParamsSchema extends InputSchema ? { params: InputParsed<TParamsSchema> } : unknown) &
  (TSearchSchema extends InputSchema ? { search: InputParsed<TSearchSchema> } : unknown) &
  (TBodySchema extends InputSchema ? { body: InputParsed<TBodySchema> } : unknown) &
  (THeadersSchema extends InputSchema ? { headers: InputParsed<THeadersSchema> } : unknown) &
  (TCookiesSchema extends InputSchema ? { cookies: InputParsed<TCookiesSchema> } : unknown)

export type CtxProps<
  TCtxPrev extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRequestVariant extends RequestVariantType = any,
  TError extends ErrorPoint0 = ErrorPoint0,
> = Prettify<
  ExposedCtxOrEmpty<TCtxPrev, TCtxExposedKeys> & {
    request: Request0<TRequestVariant, TError>
    set: ResponseEffectsSetHelper
    // execute: ServerExecuteFn
    ctx: TCtxPrev
    points: NiceServerPoints
  } & WithInputParsed<TServerInputSchema, TParamsSchema, TSearchSchema, TBodySchema, THeadersSchema, TCookiesSchema>
>
export type CtxFn<
  TCtxPrev extends Ctx = Ctx,
  TCtxPrevExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRequestVariant extends RequestVariantType = any,
  TError extends ErrorPoint0 = ErrorPoint0,
  TCtxAppend extends Ctx | RedirectTask | undefined = Ctx | RedirectTask | undefined,
> = (
  props: CtxProps<
    TCtxPrev,
    TCtxPrevExposedKeys,
    TServerInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TRequestVariant,
    TError
  >,
) => Promise<TCtxAppend> | TCtxAppend | Promise<RedirectTask> | RedirectTask | Error | Promise<void> | void

export type ForbiddenCtxExposedKeys = 'request' | 'input' | 'inputRaw' | 'data' | 'set' | 'execute' | 'ctx'
export type AssertNoForbiddenCtxExposedKeys<TExposedKeys> = [TExposedKeys] extends [never]
  ? unknown
  : [string] extends [TExposedKeys]
    ? unknown
    : [Extract<TExposedKeys, ForbiddenCtxExposedKeys>] extends [never]
      ? unknown
      : ShowError<`Forbidden to expose ctx keys: ${Extract<TExposedKeys, ForbiddenCtxExposedKeys> & string}`>
export type InferCtxFnOutputCtxAppend<TCtxFn extends CtxFn<any, any, any, any, any, any, any, any, any, any, any>> =
  Exclude<Awaited<ReturnType<TCtxFn>>, undefined | void | RedirectTask | Error> extends never
    ? undefined
    : NormalizeCtxLike<Exclude<Awaited<ReturnType<TCtxFn>>, RedirectTask | Error>>

export type NormalizeCtxLike<T extends Record<string, any> | undefined, TExclude = undefined> = [T] extends [
  undefined | TExclude,
]
  ? Record<never, never> // strict empty object
  : {
        [K in keyof Exclude<T, undefined | TExclude>]: Exclude<T, undefined | TExclude> extends infer U
          ? U extends any
            ? K extends keyof U
              ? U[K]
              : never
            : never
          : never
      } extends infer M
    ? undefined extends T
      ? { [K in keyof M]?: M[K] }
      : { [K in keyof M]: M[K] }
    : never

export type InferCtxFnOutputCtxExposedKeys<
  TCtxFn extends CtxFn<any, any, any, any, any, any, any, any, any, any, any>,
> = Extract<keyof InferCtxFnOutputCtxAppend<TCtxFn>, string>

export type LoaderProps<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRequestVariant extends RequestVariantType = any,
  TError extends ErrorPoint0 = ErrorPoint0,
> = Prettify<
  ExposedCtxOrEmpty<TCtx, TCtxExposedKeys> & {
    request: Request0<TRequestVariant, TError>
    data: DataOrUndefinedData<TServerLoaderOutput>
    set: ResponseEffectsSetHelper
    ctx: TCtx
    points: NiceServerPoints
  } & WithInputParsed<TServerInputSchema, TParamsSchema, TSearchSchema, TBodySchema, THeadersSchema, TCookiesSchema>
>
export type LoaderFn<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRequestVariant extends RequestVariantType = any,
  TError extends ErrorPoint0 = ErrorPoint0,
  TNewServerLoaderOutput extends LoaderOutput | RedirectTask | Error | undefined | void =
    | LoaderOutput
    | RedirectTask
    | Error
    | undefined
    | void,
> = (
  props: LoaderProps<
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TServerInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TRequestVariant,
    TError
  >,
) =>
  | Promise<[number, TNewServerLoaderOutput]>
  | [number, TNewServerLoaderOutput]
  | Promise<TNewServerLoaderOutput>
  | TNewServerLoaderOutput
// the loosest callable constraint on purpose: the caller's fn type may be stage-conditional (see `.loader`), and this
// alias only ever reads the return type
type InferLoaderFnOutputBase<TLoaderResponseFn extends (...args: any[]) => any> =
  Awaited<ReturnType<TLoaderResponseFn>> extends [number, infer TNewServerLoaderOutput]
    ? TNewServerLoaderOutput extends LoaderOutput | RedirectTask | Error | undefined | void
      ? TNewServerLoaderOutput
      : never
    : Awaited<ReturnType<TLoaderResponseFn>> extends LoaderOutput | RedirectTask | Error | undefined | void
      ? Awaited<ReturnType<TLoaderResponseFn>>
      : never

export type InferLoaderFnOutput<TLoaderResponseFn extends (...args: any[]) => any> =
  Exclude<InferLoaderFnOutputBase<TLoaderResponseFn>, undefined | void | RedirectTask | Error> extends never
    ? EmptyData
    : Exclude<InferLoaderFnOutputBase<TLoaderResponseFn>, undefined | void | RedirectTask | Error>

export type ServerExecuteAction<
  TType extends
    | 'ctx'
    | 'loader'
    | 'input'
    | 'body'
    | 'params'
    | 'search'
    | 'headers'
    | 'cookies'
    | 'pluginStart'
    | 'pluginEnd' =
    | 'ctx'
    | 'loader'
    | 'input'
    | 'body'
    | 'params'
    | 'search'
    | 'headers'
    | 'cookies'
    | 'pluginStart'
    | 'pluginEnd',
> = TType extends 'ctx'
  ? {
      type: 'ctx'
      fn: CtxFn
      expose?: true | string[]
      unstableId: number
    }
  : TType extends 'loader'
    ? {
        type: 'loader'
        fn: LoaderFn
        unstableId: number
      }
    : TType extends 'input'
      ? { type: 'input'; schema: InputSchema; unstableId: number }
      : TType extends 'body'
        ? { type: 'body'; schema: InputSchema; unstableId: number }
        : TType extends 'params'
          ? { type: 'params'; schema: InputSchema; unstableId: number }
          : TType extends 'search'
            ? { type: 'search'; schema: InputSchema; unstableId: number }
            : TType extends 'headers'
              ? { type: 'headers'; schema: InputSchema; unstableId: number }
              : TType extends 'cookies'
                ? { type: 'cookies'; schema: InputSchema; unstableId: number }
                : TType extends 'pluginStart'
                  ? { type: 'pluginStart'; name: string; unstableId: number }
                  : TType extends 'pluginEnd'
                    ? { type: 'pluginEnd'; name: string; unstableId: number }
                    : never

export type ClientExecuteAction<
  TType extends 'loader' | 'input' | 'params' | 'search' | 'pluginStart' | 'pluginEnd' =
    | 'loader'
    | 'input'
    | 'params'
    | 'search'
    | 'pluginStart'
    | 'pluginEnd',
> = TType extends 'loader'
  ? {
      type: 'loader'
      fn: ClientLoaderFn
      unstableId: number
    }
  : TType extends 'input'
    ? { type: 'input'; schema: InputSchema; unstableId: number }
    : TType extends 'params'
      ? { type: 'params'; schema: InputSchema; unstableId: number }
      : TType extends 'search'
        ? { type: 'search'; schema: InputSchema; unstableId: number }
        : TType extends 'pluginStart'
          ? { type: 'pluginStart'; name: string; unstableId: number }
          : TType extends 'pluginEnd'
            ? { type: 'pluginEnd'; name: string; unstableId: number }
            : never

type WithClientInputParsed<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
> = (TClientInputSchema extends InputSchema ? { input: InputParsed<TClientInputSchema> } : unknown) &
  (TParamsSchema extends InputSchema ? { params: InputParsed<TParamsSchema> } : unknown) &
  (TSearchSchema extends InputSchema ? { search: InputParsed<TSearchSchema> } : unknown)

export type ClientLoaderProps<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = Prettify<
  {
    // server can return to client only data or response
    response: TServerLoaderOutput extends LoaderOutput ? Response : undefined
    data: TClientLoaderOutput extends undefined
      ? TServerLoaderOutput extends Response
        ? UndefinedData
        : TServerLoaderOutput extends Data
          ? TServerLoaderOutput
          : undefined
      : TClientLoaderOutput
    serverData: TServerLoaderOutput extends Data ? TServerLoaderOutput : undefined
  } & WithClientInputParsed<TClientInputSchema, TParamsSchema, TSearchSchema> &
    (TServerLoaderOutput extends LoaderOutput ? { response: Response } : unknown) &
    (TServerLoaderOutput extends Data ? { serverData: TServerLoaderOutput } : unknown)
>
export type ClientLoaderFn<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TNewClientLoaderOutput extends LoaderOutput | RedirectTask | Error | undefined | void =
    | LoaderOutput
    | RedirectTask
    | Error
    | undefined
    | void,
> = (
  props: ClientLoaderProps<TClientInputSchema, TParamsSchema, TSearchSchema, TServerLoaderOutput, TClientLoaderOutput>,
) => Promise<TNewClientLoaderOutput> | TNewClientLoaderOutput

export type InferClientLoaderFnOutput<TClientLoaderFn extends ClientLoaderFn<any, any, any, any, any, any>> =
  Exclude<Awaited<ReturnType<TClientLoaderFn>>, undefined | void | RedirectTask | Error> extends never
    ? EmptyData
    : Exclude<Awaited<ReturnType<TClientLoaderFn>>, undefined | void | RedirectTask | Error>

export type FetchServerOutput<TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput> = TServerLoaderOutput
export type FetchServerDetailedOutput<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TError extends ErrorPoint0,
> =
  | {
      response: Response
      data: TServerLoaderOutput extends Data ? TServerLoaderOutput : undefined
      output: TServerLoaderOutput extends Data ? TServerLoaderOutput : Response
      // data: TServerLoaderOutput extends Data
      // ? TServerLoaderOutput
      // : TServerLoaderOutput extends React.ReactElement
      //   ? PromiseReactNode
      //   : undefined
      // output: TServerLoaderOutput extends Data
      //   ? TServerLoaderOutput
      //   : TServerLoaderOutput extends React.ReactElement
      //     ? PromiseReactNode
      //     : Response
      redirect: undefined
      error: undefined
    }
  | {
      response: Response | undefined
      data: undefined
      output: undefined
      redirect: undefined
      error: TError
    }
  | {
      response: Response
      data: undefined
      output: undefined
      redirect: RedirectTask
      error: undefined
    }

export type FetchServerOutputType =
  | 'data'
  | 'queryClientDehydratedState'
  | 'queryClientDehydratedStateRedirect'
  | 'html'

// mountable app

export type AppComponent = () => React.ReactElement
export type AppComponentModule = { default: AppComponent }

// data transformer

export type DataTransformer = {
  serialize: (data: any) => any
  deserialize: (data: any) => any
}
export type DataTransformerExtended = {
  serialize: (data: unknown) => unknown
  deserialize: <TData = unknown>(data: unknown) => TData
  stringify: (data: unknown) => string | undefined
  parse: <TData = unknown>(stringified: string) => TData
}

// middleware

export type FetcherFetchDetailedResultGeneral<TError extends ErrorPoint0> = {
  response: Response
  request: Request0<any, TError>
  scope: PointsScope
  error: TError | undefined
}
export type FetcherFetchDetailedResultMiddleware<TError extends ErrorPoint0> =
  FetcherFetchDetailedResultGeneral<TError> & {
    variant: { type: 'middleware' }
  }
export type FetcherFetchDetailedResultPage<
  TError extends ErrorPoint0,
  TClient = unknown,
> = FetcherFetchDetailedResultGeneral<TError> & {
  variant: RequestVariantPage<TClient>
}
export type FetcherFetchDetailedResultEndpoint<TError extends ErrorPoint0> =
  FetcherFetchDetailedResultGeneral<TError> & {
    variant: RequestVariantEndpoint & { data: Data | undefined }
  }
export type FetcherFetchDetailedResultError<TError extends ErrorPoint0> = Omit<
  FetcherFetchDetailedResultGeneral<TError>,
  'error'
> & {
  error: TError
  variant: { type: 'error'; error: TError }
}
export type FetcherFetchDetailedResultPublicdir<
  TError extends ErrorPoint0,
  TPublicdir = unknown,
> = FetcherFetchDetailedResultGeneral<TError> & {
  variant: RequestVariantPublicdir<TPublicdir>
}
export type FetcherFetchDetailedResultAsset<
  TError extends ErrorPoint0,
  TPublicdir = unknown,
> = FetcherFetchDetailedResultGeneral<TError> & {
  variant: RequestVariantAsset<TPublicdir>
}
export type FetcherFetchDetailedResultOptions<TError extends ErrorPoint0> =
  FetcherFetchDetailedResultGeneral<TError> & {
    variant: { type: 'options' }
  }
export type FetcherFetchDetailedResultWebsocket<TError extends ErrorPoint0> =
  FetcherFetchDetailedResultGeneral<TError> & {
    variant: RequestVariantWebsocket
  }

export type FetcherFetchDetailedResultNoMiddleware<TError extends ErrorPoint0> =
  | FetcherFetchDetailedResultEndpoint<TError>
  | FetcherFetchDetailedResultPage<TError>
  | FetcherFetchDetailedResultError<TError>
  | FetcherFetchDetailedResultPublicdir<TError>
  | FetcherFetchDetailedResultAsset<TError>
  | FetcherFetchDetailedResultOptions<TError>
  | FetcherFetchDetailedResultWebsocket<TError>
export type FetcherFetchDetailedResult<TError extends ErrorPoint0> =
  | FetcherFetchDetailedResultNoMiddleware<TError>
  | FetcherFetchDetailedResultMiddleware<TError>
export type FetcherFetchDetailedResultSpecific<
  TVariant extends FetcherFetchDetailedResult<any>['variant']['type'] | undefined = undefined,
  TError extends ErrorPoint0 = ErrorPoint0,
> = TVariant extends undefined
  ? FetcherFetchDetailedResult<TError>
  : TVariant extends 'middleware'
    ? FetcherFetchDetailedResultMiddleware<TError>
    : TVariant extends 'page'
      ? FetcherFetchDetailedResultPage<TError>
      : TVariant extends 'endpoint'
        ? FetcherFetchDetailedResultEndpoint<TError>
        : TVariant extends 'error'
          ? FetcherFetchDetailedResultError<TError>
          : TVariant extends 'publicdir'
            ? FetcherFetchDetailedResultPublicdir<TError>
            : TVariant extends 'asset'
              ? FetcherFetchDetailedResultAsset<TError>
              : TVariant extends 'options'
                ? FetcherFetchDetailedResultOptions<TError>
                : TVariant extends 'websocket'
                  ? FetcherFetchDetailedResultWebsocket<TError>
                  : never

export type MiddlewareNextFn<TError extends ErrorPoint0> = () => Promise<FetcherFetchDetailedResult<TError>>
export type MiddlewareProps<
  TError extends ErrorPoint0,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = UndefinedRouteDefinition,
> = {
  request: Request0<any, TError>
  set: ResponseEffectsSetHelper
  scope: PointsScope
  next: MiddlewareNextFn<TError>
  points: NiceServerPoints
} & (TRouteDefinition extends RouteDefinition
  ? HasParams<TRouteDefinition> extends true
    ? { params: ParamsOutput<TRouteDefinition> }
    : unknown
  : unknown)
export type MiddlewarePropsBase<TError extends ErrorPoint0> = Omit<MiddlewareProps<TError>, 'next'>
export type MiddlewareFn<
  TError extends ErrorPoint0,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = UndefinedRouteDefinition,
> = (props: MiddlewareProps<TError, TRouteDefinition>) => Promise<Response | FetcherFetchDetailedResult<TError>>

// nice middle point

export type AssertNoForbiddenMethodsIfNotSuitableStage<
  TPointType extends PointType,
  TMethod extends
    | 'ctx'
    | 'loader'
    | 'connector'
    | 'use'
    | 'clientLoader'
    | 'input'
    | 'sharedInput'
    | 'clientInput'
    | 'params'
    | 'search'
    | 'body'
    | 'headers'
    | 'cookies'
    | 'clientSend'
    | 'serverSend'
    | 'serverReply'
    | 'clientReply'
    | 'joiner',
  // After the single loader (loadedStage) — or after finalizing (finalStage) — no setup methods are
  // allowed: ctx, the input schemas and the one loader must all be defined before the loader. Both
  // stages forbid the exact same set; they differ elsewhere (loadedStage still allows finalizers and
  // drives the mountable self-query finalization, finalStage does not).
> = TPointType extends 'loadedStage' | 'finalStage'
  ? TMethod extends
      | 'loader'
      | 'connector'
      | 'clientLoader'
      | 'ctx'
      | 'input'
      | 'sharedInput'
      | 'clientInput'
      | 'params'
      | 'search'
      | 'body'
      | 'headers'
      | 'cookies'
      | 'clientSend'
      | 'serverSend'
      | 'serverReply'
      | 'clientReply'
      | 'joiner'
    ? ShowError<`You can not use ${TMethod}() after the loader — only one loader per point, and ctx/input/schemas must be defined before it`>
    : unknown
  : unknown
export type AssertResponseNotAllowed<TOutput, TPointType extends PointType> = TOutput extends Response
  ? ShowError<`Output can not be type of "Response" for point of type "${TPointType}"`>
  : unknown
export type AssertIsNotNever<TOutput extends LoaderOutput | UndefinedLoaderOutput | Ctx | UndefinedCtx> =
  IsNever<TOutput> extends true ? ShowError<`Output can not be type of "never"`> : unknown
export type AssertNotResponseForMountable<
  TOutput extends LoaderOutput | UndefinedLoaderOutput,
  TPointType extends PointType | undefined,
> = TPointType extends MountablePointType
  ? TOutput extends Response
    ? ShowError<`Output can not be type of "Response" for point of type "${TPointType}"`>
    : unknown
  : unknown
export type AssertNotUnknownLoaderOutput<TOutput extends LoaderOutput | undefined> = undefined extends TOutput
  ? ShowError<`Loader should return specific output`>
  : unknown
type MashSchemaHint =
  `"input" is only for query, infinitieQuery, mutation, component, provider. "params" and "search" for action, page, layout. "body" for action only`
export type AsserNotMashInputSchemas<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
> =
  MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema> extends InputSchema
    ? TParamsSchema extends InputSchema
      ? ShowError<`You can not define input schema and params schema at the same time. ${MashSchemaHint}`>
      : TSearchSchema extends InputSchema
        ? ShowError<`You can not define input schema and search schema at the same time. ${MashSchemaHint}`>
        : TBodySchema extends InputSchema
          ? ShowError<`You can not define input schema and body schema at the same time. ${MashSchemaHint}`>
          : unknown
    : unknown
export type AssertRoutedInputSchemaOnly<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TWhat extends string,
> = TServerInputSchema extends InputSchema
  ? ShowError<`For "${TWhat}" not allowed "input" schema. Only "params" and "search" are allowed.`>
  : TClientInputSchema extends InputSchema
    ? ShowError<`For "${TWhat}" not allowed "input" schema. Only "params" and "search" are allowed.`>
    : TBodySchema extends InputSchema
      ? ShowError<`For "${TWhat}" not allowed "body" schema. Only "params" and "search" are allowed.`>
      : unknown
export type AssertUsualInputSchemaOnly<
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TWhat extends string,
> = TParamsSchema extends InputSchema
  ? ShowError<`For "${TWhat}" not allowed "params" schema. Only "input" are allowed.`>
  : TSearchSchema extends InputSchema
    ? ShowError<`For "${TWhat}" not allowed "search" schema. Only "input" are allowed.`>
    : TBodySchema extends InputSchema
      ? ShowError<`For "${TWhat}" not allowed "body" schema. Only "input" are allowed.`>
      : unknown
export type AssertActionSchemaOnly<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TWhat extends string,
> = TServerInputSchema extends InputSchema
  ? ShowError<`For "${TWhat}" not allowed "input" schema. Only "params", "search" and "body" are allowed.`>
  : TClientInputSchema extends InputSchema
    ? ShowError<`For "${TWhat}" not allowed "input" schema. Only "params", "search" and "body" are allowed.`>
    : unknown

export type NiceRootStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'root',
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
> = Pick<
  Point0<
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
  >,
  | 'root'
  | 'ssr'
  | 'errorClass'
  | 'schemaHelper'
  | 'use'
  | 'middleware'
  | 'clientOnly'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'transformer'
  // | 'fetchFn'
  | 'serverUrl'
  | 'clientUrl'
  | 'basePath'
  | 'mutationOptions'
  | 'queryOptions'
  | 'channelOptions'
  | 'serverHandlerOptions'
  | 'spaceOptions'
  | 'subscriptionOptions'
  | 'clientHandlerOptions'
  | 'infiniteQueryOptions'
  | 'pageQueryOptions'
  | 'pageDehydratedStateQueryOptions'
  | 'componentQueryOptions'
  | 'providerQueryOptions'
  | 'layoutQueryOptions'
  | 'fetchOptions'
  | 'rsc'
  | 'layoutError'
  | 'pageError'
  | 'componentError'
  | 'error'
  | 'layoutLoading'
  | 'pageLoading'
  | 'componentLoading'
  | 'loading'
  | 'headers'
  | 'cookies'
  // | 'params'
  | 'search'
  | 'body'
  | 'input'
  | 'models'
  | 'clientInput'
  | 'sharedInput'
  | 'ctx'
  // | 'loader'
  // | 'clientLoader'
  // | 'mapper'
  | 'head'
  | 'wrapper'
  | 'with'
  | 'scrollPosition'
  | 'scrollRestore'
  // | 'onPrefetchPage'
  // | 'serverOnPrefetchPage'
  // | 'clientOnPrefetchPage'
  | 'prefetchPageOnNavigate'
  | 'prefetchPageOnLinkHover'
  | 'prefetchPagePolicy'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
>

export type NicePluginStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'plugin',
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
> = Pick<
  Point0<
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
  >,
  | 'plugin'
  | 'use'
  | 'middleware'
  | 'clientOnly'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  // | 'transformer'
  // | 'fetchFn'
  // | 'requireCtx'
  // | 'serverUrl'
  // | 'clientUrl'
  // | 'basePath'
  | 'mutationOptions'
  | 'queryOptions'
  | 'channelOptions'
  | 'serverHandlerOptions'
  | 'spaceOptions'
  | 'subscriptionOptions'
  | 'clientHandlerOptions'
  | 'infiniteQueryOptions'
  | 'pageQueryOptions'
  | 'pageDehydratedStateQueryOptions'
  | 'componentQueryOptions'
  | 'providerQueryOptions'
  | 'layoutQueryOptions'
  | 'fetchOptions'
  | 'rsc'
  | 'layoutError'
  | 'pageError'
  | 'componentError'
  // | 'query'
  // | 'layout'
  | 'error'
  | 'layoutLoading'
  | 'pageLoading'
  | 'componentLoading'
  | 'loading'
  | 'headers'
  | 'cookies'
  // | 'params'
  | 'search'
  | 'body'
  | 'openapi'
  | 'input'
  | 'clientInput'
  | 'sharedInput'
  | 'ctx'
  // | 'loader'
  // | 'clientLoader'
  // | 'mapper'
  // | 'head'
  | 'wrapper'
  | 'with'
  // related queries can be declared inside a plugin too; their `location` is just `AnyLocation`
  // (a plugin is not bound to a route), and the actions merge into whatever mountable `.use()`s it
  | 'relatedQuery'
  | 'scrollPosition'
  | 'scrollRestore'
  | 'onPrefetchPage'
  | 'serverOnPrefetchPage'
  | 'clientOnPrefetchPage'
  // | 'prefetchPageOnNavigate'
  // | 'prefetchPageOnLinkHover'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
>

export type NiceBaseStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'base',
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
> = Pick<
  Point0<
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
  >,
  | 'base'
  | 'ssr'
  | 'basePath'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'use'
  | 'middleware'
  | 'mutationOptions'
  | 'queryOptions'
  | 'channelOptions'
  | 'serverHandlerOptions'
  | 'spaceOptions'
  | 'subscriptionOptions'
  | 'clientHandlerOptions'
  | 'infiniteQueryOptions'
  | 'pageQueryOptions'
  | 'pageDehydratedStateQueryOptions'
  | 'componentQueryOptions'
  | 'providerQueryOptions'
  | 'layoutQueryOptions'
  | 'fetchOptions'
  | 'rsc'
  | 'layoutError'
  | 'pageError'
  | 'componentError'
  | 'error'
  // | 'query'
  | 'layout'
  | 'layoutLoading'
  | 'pageLoading'
  | 'componentLoading'
  | 'loading'
  | 'wrapper'
  | 'with'
  | 'headers'
  | 'cookies'
  // | 'params'
  | 'search'
  | 'body'
  | 'models'
  | 'openapi'
  | 'input'
  | 'clientInput'
  | 'sharedInput'
  | 'ctx'
  // | 'loader'
  // | 'clientLoader'
  | 'mapper'
  | 'head'
  | 'scrollPosition'
  | 'scrollRestore'
  | 'onPrefetchPage'
  | 'serverOnPrefetchPage'
  | 'clientOnPrefetchPage'
  | 'prefetchPageOnNavigate'
  | 'prefetchPageOnLinkHover'
  | 'prefetchPagePolicy'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
>

export type NicePageStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'page',
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
> = Pick<
  Point0<
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
  >,
  | 'page'
  | 'ssr'
  | 'on'
  | 'clientOnly'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
  | 'rsc'
  | 'error'
  | 'loading'
  | 'wrapper'
  | 'layout'
  | 'with'
  | 'relatedQuery'
  | 'headers'
  | 'cookies'
  | 'params'
  | 'search'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'mapper'
  | 'head'
  | 'scrollPosition'
  | 'scrollRestore'
  | 'onPrefetchPage'
  | 'serverOnPrefetchPage'
  | 'clientOnPrefetchPage'
  | 'prefetchPageOnNavigate'
  | 'prefetchPageOnLinkHover'
  | 'prefetchPagePolicy'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
  | 'query'
  | 'pageDehydratedStateQueryOptions'
  | 'infiniteQuery'
>

export type NiceComponentStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'component',
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
> = Pick<
  Point0<
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
  >,
  | 'component'
  | 'on'
  | 'clientOnly'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
  | 'rsc'
  | 'error'
  | 'loading'
  | 'wrapper'
  | 'with'
  | 'headers'
  | 'cookies'
  | 'input'
  | 'clientInput'
  | 'sharedInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'mapper'
  // | 'onPrefetchPage'
  // | 'serverOnPrefetchPage'
  // | 'clientOnPrefetchPage'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
  | 'query'
  | 'infiniteQuery'
>

export type NiceActionStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'action',
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
> = Pick<
  Point0<
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
  >,
  | 'action'
  | 'query'
  | 'infiniteQuery'
  | 'mutation'
  | 'subscription'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'fetchOptions'
  | 'rsc'
  | 'use'
  | 'headers'
  | 'cookies'
  | 'params'
  | 'search'
  | 'body'
  | 'response'
  | 'openapi'
  | 'ctx'
  | 'loader'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
>

export type NiceQueryStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'query',
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
> = Pick<
  Point0<
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
  >,
  | 'query'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
  | 'rsc'
  | 'headers'
  | 'cookies'
  | 'input'
  | 'clientInput'
  | 'sharedInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  // | 'onPrefetchPage'
  // | 'serverOnPrefetchPage'
  // | 'clientOnPrefetchPage'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
>

export type NiceInfiniteQueryStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'infiniteQuery',
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
> = Pick<
  Point0<
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
  >,
  | 'infiniteQuery'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
  | 'rsc'
  | 'headers'
  | 'cookies'
  | 'input'
  | 'clientInput'
  | 'sharedInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  // | 'onPrefetchPage'
  // | 'serverOnPrefetchPage'
  // | 'clientOnPrefetchPage'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
>

export type NiceMutationStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'mutation',
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
> = Pick<
  Point0<
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
  >,
  | 'mutation'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  // | 'asFormData'
  | 'fetchOptions'
  | 'rsc'
  | 'headers'
  | 'cookies'
  | 'input'
  | 'clientInput'
  | 'sharedInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
>

export type NiceChannelStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'channel',
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
> = Pick<
  Point0<
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
  >,
  | 'channel'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  // the ticket connect is a plain fetch — channel-level fetch options (headers, credentials) apply to it
  | 'fetchOptions'
  | 'input'
  | 'sharedInput'
  | 'ctx'
  | 'connector'
  | 'loading'
  | 'error'
  // a channel is a mountable (`<channel.Connection>` runs the interpreter) — `.with` wrappers/injections apply to it
  | 'with'
  | 'serverHandlerOptions'
  | 'spaceOptions'
  | 'clientHandlerOptions'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
>

// A space stage carries its channel's `TChannelInput`/`TIdentity` forward (the four trailing slots) so `.joiner` can
// type its `identity` and the closer can hand them to the space's handlers. Its surface is the space builder methods.
export type NiceSpaceStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'space',
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
> = Pick<
  Point0<
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
  >,
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'input'
  | 'joiner'
  | 'enroller'
  | 'space'
  // a space is a mountable (`<space.Membership>` runs the interpreter) — same render surface as the channel stage
  | 'loading'
  | 'error'
  | 'with'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
>

export type NiceServerHandlerStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'serverHandler',
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
> = Pick<
  Point0<
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
  >,
  | 'serverHandler'
  | 'clientSend'
  | 'serverReply'
  | 'query'
  | 'mutation'
  | 'infiniteQuery'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'point'
  | 'tag'
  | 'type'
  | 'Infer'
>

export type NiceClientHandlerStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'clientHandler',
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
> = Pick<
  Point0<
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
  >,
  'clientHandler' | 'serverSend' | 'clientReply' | 'on' | 'serverOn' | 'clientOn' | 'point' | 'tag' | 'type' | 'Infer'
>

export type NiceLayoutStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'layout',
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
> = Pick<
  Point0<
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
  >,
  | 'layout'
  | 'ssr'
  | 'on'
  | 'clientOnly'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
  | 'rsc'
  | 'pageQueryOptions'
  | 'pageDehydratedStateQueryOptions'
  | 'error'
  | 'pageError'
  | 'layoutError'
  | 'loading'
  | 'pageLoading'
  | 'layoutLoading'
  | 'wrapper'
  | 'with'
  | 'relatedQuery'
  | 'headers'
  | 'cookies'
  | 'params'
  | 'search'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'mapper'
  | 'head'
  | 'scrollPosition'
  | 'scrollRestore'
  | 'onPrefetchPage'
  | 'serverOnPrefetchPage'
  | 'clientOnPrefetchPage'
  | 'prefetchPageOnNavigate'
  | 'prefetchPageOnLinkHover'
  | 'prefetchPagePolicy'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
  | 'query'
  | 'infiniteQuery'
  | 'pageQueryOptions'
  | 'layoutQueryOptions'
>

export type NiceProviderStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'provider',
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
> = Pick<
  Point0<
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
  >,
  | 'provider'
  | 'on'
  | 'clientOnly'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
  | 'rsc'
  | 'headers'
  | 'cookies'
  | 'input'
  | 'clientInput'
  | 'sharedInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'mapper'
  // | 'onPrefetchPage'
  // | 'serverOnPrefetchPage'
  // | 'clientOnPrefetchPage'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
  | 'query'
  | 'infiniteQuery'
  | 'error'
  | 'loading'
  | 'wrapper'
  | 'with'
  // | 'relatedQuery'
>

export type NiceSubscriptionStagePoint<
  in out TPointType extends StagePointType,
  out TLetsReadyPointType extends 'subscription',
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
> = Pick<
  Point0<
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
  >,
  | 'subscription'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
  | 'headers'
  | 'cookies'
  | 'input'
  | 'ctx'
  | 'loader'
  | 'point'
  | 'tag'
  | 'description'
  | 'type'
  | 'Infer'
>

type NiceStagePointMap<
  in out TPointType extends StagePointType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  out TLetsReadyPointType extends ReadyPointType,
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
> = {
  root: NiceRootStagePoint<
    TPointType,
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
    TQueriesDefinitions,
    TConnectionsDefinitions,
    TMembershipsDefinitions,
    TChannelInput,
    TIdentity,
    TSpaceInput,
    TRoom
  >
  plugin: NicePluginStagePoint<
    TPointType,
    'plugin',
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
  base: NiceBaseStagePoint<
    TPointType,
    'base',
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
  page: NicePageStagePoint<
    TPointType,
    'page',
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
  component: NiceComponentStagePoint<
    TPointType,
    'component',
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
  action: NiceActionStagePoint<
    TPointType,
    'action',
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
  query: NiceQueryStagePoint<
    TPointType,
    'query',
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
  infiniteQuery: NiceInfiniteQueryStagePoint<
    TPointType,
    'infiniteQuery',
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
  mutation: NiceMutationStagePoint<
    TPointType,
    'mutation',
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
  subscription: NiceSubscriptionStagePoint<
    TPointType,
    'subscription',
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
  channel: NiceChannelStagePoint<
    TPointType,
    'channel',
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
  space: NiceSpaceStagePoint<
    TPointType,
    'space',
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
  serverHandler: NiceServerHandlerStagePoint<
    TPointType,
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
  clientHandler: NiceClientHandlerStagePoint<
    TPointType,
    'clientHandler',
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
  layout: NiceLayoutStagePoint<
    TPointType,
    'layout',
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
  provider: NiceProviderStagePoint<
    TPointType,
    'provider',
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
}

export type NiceStagePoint<
  TPointType extends StagePointType,
  TLetsReadyPointType extends ReadyPointType,
  TRequiredCtx extends RequiredCtx,
  TError extends ErrorPoint0,
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
> = NiceStagePointMap<
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
>[TLetsReadyPointType]

// nice end point

export type NiceRootReadyPoint<
  in out TPointType extends 'root',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  'lets' | 'id' | 'point' | 'tags' | 'type' | 'Infer'
>

export type NicePluginReadyPoint<
  in out TPointType extends 'plugin',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  'id' | 'point' | 'type' | 'tags' | 'Infer'
>

export type NicePristinePluginReadyPoint = NicePluginReadyPoint<
  'plugin',
  UndefinedReadyPointType,
  UndefinedCtx,
  any,
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

export type NiceBaseReadyPoint<
  in out TPointType extends 'base',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  'lets' | 'id' | 'point' | 'type' | 'tags' | 'Infer'
>

export type WithFetchIfHasServerLoader<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TLiteral extends string,
> = TServerLoaderOutput extends LoaderOutput
  ? TLiteral | 'getFetchServerOptions' | 'fetchServer' | 'fetchServerDetailed'
  : TLiteral
export type WithQueryIfSuitable<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLiteral extends string,
> = TQueryResultType extends 'query'
  ? WithFetchIfHasServerLoader<
      TServerLoaderOutput,
      | TLiteral
      | 'useQuery'
      | 'useSuspenseQuery'
      | 'getQueryKey'
      | 'getQueryOptions'
      | 'fetchQuery'
      | 'prefetchQuery'
      | 'getQueryData'
      | 'ensureQueryData'
      | 'refetchQuery'
      | 'setQueryData'
      | 'getQueryCache'
      | 'getQueriesCache'
      | 'getQueryState'
      | 'cancelQuery'
      | 'invalidateQuery'
      | 'removeQuery'
      | 'resetQuery'
      | 'fetch'
    >
  : TQueryResultType extends 'infiniteQuery'
    ? WithFetchIfHasServerLoader<
        TServerLoaderOutput,
        | TLiteral
        | 'useInfiniteQuery'
        | 'useSuspenseInfiniteQuery'
        | 'getQueryKey'
        | 'getInfiniteQueryKey'
        | 'getInfiniteQueryOptions'
        | 'fetchInfiniteQuery'
        | 'prefetchInfiniteQuery'
        | 'getInfiniteQueryData'
        | 'ensureInfiniteQueryData'
        | 'refetchInfiniteQuery'
        | 'setInfiniteQueryData'
        | 'getInfiniteQueryCache'
        | 'getInfiniteQueriesCache'
        | 'getInfiniteQueryState'
        | 'cancelInfiniteQuery'
        | 'invalidateInfiniteQuery'
        | 'removeInfiniteQuery'
        | 'resetInfiniteQuery'
        | 'fetch'
      >
    : TLiteral

/**
 * Makes a mountable ready point directly renderable as its own `.X`, so `<MyPoint />` works without reaching for `.X`,
 * while keeping every point helper (`.X` / `.Component` / `.Provider`, queries, `useValue`, ...). We intersect the
 * ready point with a call signature derived from its `.X`.
 *
 * `.X` is flattened from a `React.ComponentType` (`ComponentClass | FunctionComponent`) to a single function-component
 * signature — at runtime `point.X` is always a function component, and the bare `ComponentClass` arm only muddies
 * inference.
 *
 * NOTE: this wrapper is applied at the authoring-method return types ONLY (see `.page()` / `.component()` / `.layout()`
 * / `.provider()` in point0.ts). The underlying `Nice*ReadyPoint` types stay plain `Pick<Point0, ...>` so the
 * `Any*ReadyPoint` matching unions keep their exact (non-callable) shape — a union of callable members breaks TS's
 * union-assignability.
 */
type AsFunctionComponent<TComponent> =
  TComponent extends React.ComponentType<infer TProps> ? (props: TProps) => React.ReactNode : never
export type Mountable<TReadyPoint extends Record<string, unknown>> = AsFunctionComponent<TReadyPoint['X']> & TReadyPoint

export type NicePageReadyPoint<
  in out TPointType extends 'page',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  WithQueryIfSuitable<
    TServerLoaderOutput,
    TQueryResultType,
    'id' | 'point' | 'tags' | 'type' | 'Infer' | 'Page' | 'X' | 'route'
  >
>

export type NiceComponentReadyPoint<
  in out TPointType extends 'component',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  WithQueryIfSuitable<
    TServerLoaderOutput,
    TQueryResultType,
    'id' | 'point' | 'tags' | 'type' | 'Infer' | 'Component' | 'X'
  >
>

export type NiceLayoutReadyPoint<
  in out TPointType extends 'layout',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  WithQueryIfSuitable<
    TServerLoaderOutput,
    TQueryResultType,
    | 'id'
    | 'point'
    | 'tags'
    | 'type'
    | 'lets'
    | 'useValue'
    | 'getValue'
    | 'getValueOrUndefined'
    | 'Infer'
    | 'Layout'
    | 'X'
    | 'route'
  >
>

export type NiceActionReadyPoint<
  in out TPointType extends 'action',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  | 'id'
  | 'point'
  | 'tags'
  | 'route'
  | 'method'
  | 'type'
  | 'Infer'
  | (TQueryResultType extends 'query'
      ?
          | 'useQuery'
          | 'getQueryKey'
          | 'getQueryOptions'
          | 'fetchQuery'
          | 'prefetchQuery'
          | 'getQueryData'
          | 'ensureQueryData'
          | 'refetchQuery'
          | 'setQueryData'
          | 'getQueryCache'
          | 'getQueriesCache'
          | 'getQueryState'
          | 'cancelQuery'
          | 'invalidateQuery'
          | 'removeQuery'
          | 'resetQuery'
          | 'fetch'
          | 'fetchServer'
          | 'fetchServerDetailed'
          | 'getFetchServerOptions'
      : TQueryResultType extends 'infiniteQuery'
        ?
            | 'useInfiniteQuery'
            | 'getQueryKey'
            | 'getInfiniteQueryKey'
            | 'getInfiniteQueryOptions'
            | 'fetchInfiniteQuery'
            | 'prefetchInfiniteQuery'
            | 'getInfiniteQueryData'
            | 'ensureInfiniteQueryData'
            | 'refetchInfiniteQuery'
            | 'setInfiniteQueryData'
            | 'getInfiniteQueryCache'
            | 'getInfiniteQueriesCache'
            | 'getInfiniteQueryState'
            | 'cancelInfiniteQuery'
            | 'invalidateInfiniteQuery'
            | 'removeInfiniteQuery'
            | 'resetInfiniteQuery'
            | 'fetch'
            | 'fetchServer'
            | 'fetchServerDetailed'
            | 'getFetchServerOptions'
        : TQueryResultType extends 'subscription'
          ? // an action whose generator loader closed with `.subscription()` — the stream surface, no plain fetches
              'useSubscription' | 'fetchSubscription'
          :
              | 'useMutation'
              | 'getMutationKey'
              | 'getMutationOptions'
              | 'getMutationCache'
              | 'getMutationsCache'
              | 'fetchMutation'
              | 'fetch'
              | 'fetchServer'
              | 'fetchServerDetailed'
              | 'getFetchServerOptions')
>

export type NiceQueryReadyPoint<
  in out TPointType extends 'query',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  WithQueryIfSuitable<TServerLoaderOutput, TQueryResultType, 'id' | 'point' | 'tags' | 'type' | 'Infer'>
>

export type NiceInfiniteQueryReadyPoint<
  in out TPointType extends 'infiniteQuery',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  WithQueryIfSuitable<TServerLoaderOutput, TQueryResultType, 'id' | 'point' | 'tags' | 'type' | 'Infer'>
>

export type NiceMutationReadyPoint<
  in out TPointType extends 'mutation',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  WithFetchIfHasServerLoader<
    TServerLoaderOutput,
    | 'id'
    | 'point'
    | 'tags'
    | 'type'
    | 'getMutationKey'
    | 'getMutationOptions'
    | 'getMutationCache'
    | 'getMutationsCache'
    | 'useMutation'
    | 'fetchMutation'
    | 'fetch'
    | 'Infer'
  >
>

export type NiceChannelReadyPoint<
  in out TPointType extends 'channel',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  | 'id'
  | 'point'
  | 'tags'
  | 'type'
  | 'lets'
  | 'useConnection'
  | 'connect'
  | 'getConnection'
  | 'getConnectionOrUndefined'
  | 'Connection'
  | 'kick'
  | 'refresh'
  | 'amendIdentity'
  | 'connections'
  | 'Infer'
>

// The space ready surface — `join` / `useMembership` / `<Membership>` / `getMembership(OrUndefined)` (client),
// `kick` / `enroll` / `memberships.*` (server admin), and `lets` (grows handlers). It carries the four trailing slots
// forward to its handlers and `Infer`. No endpoint (space runs over the socket), so no `route`.
export type NiceSpaceReadyPoint<
  TPointType extends 'space',
  TLetsReadyPointType extends UndefinedReadyPointType,
  TRequiredCtx extends RequiredCtx,
  TError extends ErrorPoint0,
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
> = Pick<
  Point0<
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
  >,
  | 'id'
  | 'point'
  | 'tags'
  | 'type'
  | 'lets'
  | 'join'
  | 'useMembership'
  | 'getMembership'
  | 'getMembershipOrUndefined'
  | 'Membership'
  | 'kick'
  | 'enroll'
  | 'memberships'
  | 'Infer'
>

/**
 * A CHANNEL handler's target for binding by call: the connection object itself, or the channel input it was opened with
 * (binding by input SEARCHES the live connections — it never opens one).
 */
export type ChannelHandlerBindTarget<TChannelInput, TError extends ErrorPoint0> =
  | ClientChannelConnection<TChannelInput, TError>
  | TChannelInput

/**
 * A SPACE handler's target for binding by call — a space handler is always addressed by ROOM: pass the room object
 * itself, or a membership as the convenience "use my single room" (exactly one room, or it throws with the bind-by-room
 * error). An optional `channelInput?` disambiguates when the room lives under several live connections of the channel.
 * Binding SEARCHES the live memberships — it never joins one. The space INPUT is not a target: it is the join's payload
 * and a client-side hold-dedup key, never an address.
 */
export type SpaceHandlerBindTarget<
  TRoom extends UnknownData | EmptyObject | UndefinedRoom,
  TError extends ErrorPoint0,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput,
> = ClientSpaceMembership<TSpaceInput, TRoom, TError, TChannelInput> | TRoom

/**
 * The fuzzy target of a socket cache method (`refetch` / `invalidate` / `cancel` / `remove` / `reset` /
 * `getSocketQueriesCache`) — mirrors the regular query surface: an exact input matches one entry, a predicate over the
 * parsed input or `true` matches many (the entries of this handler on the resolved connection; with no resolvable
 * connection the fuzzy forms match the handler across ALL connections).
 */
export type SocketQueryFuzzyInput<TServerInputSchema extends InputSchema | UndefinedInputSchema> =
  | InputRaw<TServerInputSchema>
  | ((input: InputRaw<TServerInputSchema>) => boolean)
  | true

/**
 * The flavor-gated connection-query members of a serverHandler — identical on the bare point (ambient/single-live
 * resolution) and on the bound surface (`handler(connection)`). `.query()` opens the full query family,
 * `.infiniteQuery()` its infinite twin, the default mutation flavor the mutation family — each the socket mirror of the
 * regular point surface, transport socket. The imperative `fetch*`/`prefetch*`/`ensure*` AWAIT the connect like every
 * socket send (they fail only when the connect fails); the cache methods act on the browser cache and are client-side.
 */
export type ServerHandlerSocketQueryMembers<
  TError extends ErrorPoint0,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TReply,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
> = (TQueryResultType extends UndefinedQueryResultType
  ? {
      /**
       * The handler as a TanStack mutation (the default flavor) — pass the message input to `mutate` / `mutateAsync`,
       * the `.serverReply` return is the mutation data. The connection resolves at MUTATE time: the bound target, else
       * the ambient `<channel.Connection>`, else the single live connection.
       *
       * Client-side — mutating happens over the client's WebSocket (a runtime error on the server).
       *
       *     const send = messageSendHandler(connection).useSocketMutation()
       *     send.mutate({ text })
       *
       * Full reference: https://1gr14.dev/point0/latest/socket
       */
      useSocketMutation: (
        mutationOptions?: ExtraUseMutationOptions<TReply, TError, InputRaw<TServerInputSchema>>,
      ) => UseMutationResult<TReply, TError, InputRaw<TServerInputSchema>>
      /**
       * Run the handler through the mutation machinery imperatively, outside React — the non-hook `useSocketMutation`
       * (the mutation cache entry, its callbacks and retry policy all apply; the plain `sendToServer` bypasses all of
       * that). The send queues until the connection claims, like every socket send.
       *
       * Client-side.
       *
       *     const { message } = await messageSendHandler(connection).fetchSocketMutation({ text })
       *
       * Full reference: https://1gr14.dev/point0/latest/socket
       */
      fetchSocketMutation: (
        ...args: [
          ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
          mutationOptions?: ExtraUseMutationOptions<TReply, TError, InputRaw<TServerInputSchema>>,
        ]
      ) => Promise<TReply>
      /**
       * The socket mutation's key — what `useSocketMutation` / `fetchSocketMutation` file their cache entries under.
       *
       * Full reference: https://1gr14.dev/point0/latest/socket
       */
      getSocketMutationKey: () => MutationKey
      /**
       * The resolved TanStack `MutationOptions` of the socket mutation (key, `mutationFn` over the resolved connection,
       * merged defaults) — ready to hand to `useMutation` / the mutation cache directly.
       *
       * Client-side — the `mutationFn` resolves the connection at mutate time.
       *
       * Full reference: https://1gr14.dev/point0/latest/socket
       */
      getSocketMutationOptions: (
        mutationOptions?: ExtraUseMutationOptions<TReply, TError, InputRaw<TServerInputSchema>>,
      ) => MutationOptions<TReply, TError, InputRaw<TServerInputSchema>>
      /**
       * The single `Mutation` cache entry matching an exact input (`undefined` if none) — for inspecting a specific
       * call's state. For an array of matches use `getSocketMutationsCache`.
       *
       * Full reference: https://1gr14.dev/point0/latest/socket
       */
      getSocketMutationCache: (
        ...args: ServerHandlerInputArgs<InputRaw<TServerInputSchema>>
      ) => Mutation<TReply, TError, InputRaw<TServerInputSchema>> | undefined
      /**
       * An array of `Mutation` cache entries of this handler — match by exact input (variables), a predicate over
       * variables, or `true` for all entries.
       *
       * Full reference: https://1gr14.dev/point0/latest/socket
       */
      getSocketMutationsCache: (
        input?: InputRaw<TServerInputSchema> | ((input: InputRaw<TServerInputSchema>) => boolean) | true,
      ) => Array<Mutation<TReply, TError, InputRaw<TServerInputSchema>>>
    }
  : EmptyObject) &
  (TQueryResultType extends 'query'
    ? {
        /**
         * The handler as a TanStack query over the connection (the `.query()` flavor) — the message input forms the
         * cache key together with the connection's room and input, `queryFn` is a `sendToServer`. The query never runs
         * before the connection opens (SSR included — nothing is ever open on the server, so nothing is prefetched or
         * dehydrated).
         *
         * Client-side — fetching happens over the client's WebSocket (renders pending during SSR).
         *
         *     const { data } = chatInfoHandler(connection).useSocketQuery({ q })
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        useSocketQuery: (
          ...args: ServerHandlerSendArgs<
            InputRaw<TServerInputSchema>,
            ExtraUseQueryOptions<TReply, TError, TReply, QueryKey>
          >
        ) => UseQueryResult<TReply, TError>
        /**
         * The socket query's `useSuspenseQuery` — TanStack suspense semantics: `data` is always present in types, a
         * pending query suspends into the nearest Suspense boundary, an error throws to the ErrorBoundary. The hook
         * first suspends on the CONNECT itself (the resolved connection landing open / the membership joined), then on
         * the fetch. During SSR nothing is ever connected — the HTML ships the fallback and the client resolves after
         * hydration (the socket `ssr: false` behavior).
         *
         * Client-side resolution — kept on both bundles.
         *
         *     const { data } = chatInfoHandler(connection).useSuspenseSocketQuery({ q })
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        useSuspenseSocketQuery: (
          ...args: ServerHandlerSendArgs<
            InputRaw<TServerInputSchema>,
            ExtraUseSuspenseQueryOptions<TReply, TError, TReply, QueryKey>
          >
        ) => UseSuspenseQueryResult<TReply, TError>
        /**
         * Imperatively fetch and cache the socket query — reads the cache if fresh, otherwise sends the message over
         * the resolved connection, AWAITING the connect first (up to the handler's `timeout`; it fails only when the
         * connect fails). A runtime error on the server.
         *
         * Client-side.
         *
         *     const info = await chatInfoHandler(connection).fetchSocketQuery({ q })
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        fetchSocketQuery: (...args: ServerHandlerInputArgs<InputRaw<TServerInputSchema>>) => Promise<TReply>
        /**
         * Warm the socket query's cache without returning the data (`Promise<void>`) — fetches only if not already
         * cached, awaiting the connect like `fetchSocketQuery`.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        prefetchSocketQuery: (
          ...args: [
            ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
            queryOptions?: ExtraUseQueryOptions<TReply, TError, TReply, QueryKey>,
          ]
        ) => Promise<void>
        /**
         * The cached data for an input if present, otherwise fetch it — like `fetchSocketQuery` but never refetches
         * when data already exists.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        ensureSocketQueryData: (
          ...args: [
            ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
            queryOptions?: ExtraUseQueryOptions<TReply, TError, TReply, QueryKey>,
          ]
        ) => Promise<TReply>
        /**
         * The resolved react-query `UseQueryOptions` of the socket query (key over the resolved connection, `queryFn`
         * as a `sendToServer`, merged defaults) — ready to hand to TanStack directly.
         *
         * Client-side — the key carries the live connection's room and input.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketQueryOptions: (
          ...args: [
            ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
            queryOptions?: ExtraUseQueryOptions<TReply, TError, TReply, QueryKey>,
          ]
        ) => UseQueryOptions<TReply, TError, TReply, QueryKey>
        /**
         * The socket query's key tuple for an input — the same key the hooks cache under (it carries the connection's
         * serialized room and input). Resolves the connection strictly: the bound target, else the single live
         * connection.
         *
         * Client-side — resolving the connection needs the live client runtime.
         *
         *     chatInfoHandler(connection).getSocketQueryKey({ q })
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketQueryKey: (...args: ServerHandlerInputArgs<InputRaw<TServerInputSchema>>) => QueryKey
        /**
         * Read the socket query's cached data for an exact input — `undefined` if uncached. Exact-key, no fetch.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketQueryData: (...args: ServerHandlerInputArgs<InputRaw<TServerInputSchema>>) => TReply | undefined
        /**
         * Write the socket query's cached data directly — the push-driven mirror of `setQueryData`: a clientHandler
         * push carrying the READY data lands it in the cache with zero refetch requests. Exact-key: resolves the
         * connection strictly (the bound target, else the single live one); `old` is `undefined` until the query has
         * resolved once. Returns the new data.
         *
         * Client-side.
         *
         *     presenceChangedHandler(membership).useOnMessageFromServer(({ message }) => {
         *       whoIsHereHandler(membership).setSocketQueryData(undefined, () => ({ nicknames: message.nicknames }))
         *     })
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        setSocketQueryData: (
          input: InputRaw<TServerInputSchema> | undefined,
          updater: Updater<TReply | undefined, TReply>,
        ) => TReply
        /**
         * Read the TanStack `QueryState` of the socket query for an exact input (`status`, `fetchStatus`, `error`, …) —
         * `undefined` if uncached.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketQueryState: (
          ...args: ServerHandlerInputArgs<InputRaw<TServerInputSchema>>
        ) => QueryState<TReply, TError> | undefined
        /**
         * The single TanStack `Query` cache entry of the socket query for an exact input (`undefined` if none). For
         * many entries use `getSocketQueriesCache`.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketQueryCache: (
          ...args: ServerHandlerInputArgs<InputRaw<TServerInputSchema>>
        ) => Query<TReply, TError, TReply, QueryKey> | undefined
        /**
         * An array of `Query` cache entries of this handler — match by exact input, a predicate over the parsed input,
         * or `true` for every entry (scoped to the resolved connection; with none, across all connections).
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketQueriesCache: (
          input?: SocketQueryFuzzyInput<TServerInputSchema>,
        ) => Array<Query<TReply, TError, TReply, QueryKey>>
        /**
         * Force a refetch of the socket query, ignoring staleness — target by exact input, a predicate over the parsed
         * input, or `true` for every entry of this handler on the resolved connection.
         *
         * Client-side.
         *
         *     await chatInfoHandler(connection).refetchSocketQuery({ q })
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        refetchSocketQuery: (
          ...args: [input?: SocketQueryFuzzyInput<TServerInputSchema>, refetchOptions?: RefetchOptions]
        ) => Promise<void>
        /**
         * Mark the socket query stale and refetch it if active — target by exact input, a predicate over the parsed
         * input, or `true` for every entry of this handler on the resolved connection (with no resolvable connection,
         * across ALL connections).
         *
         * Client-side.
         *
         *     await chatInfoHandler(connection).invalidateSocketQuery({ q })
         *     await chatInfoHandler.invalidateSocketQuery(true) // every entry of this handler
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        invalidateSocketQuery: (
          ...args: [input?: SocketQueryFuzzyInput<TServerInputSchema>, invalidateOptions?: InvalidateOptions]
        ) => Promise<void>
        /**
         * Cancel any in-flight fetch of the socket query — target by exact input, a predicate over the parsed input, or
         * `true`. Typically before an optimistic `setSocketQueryData`.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        cancelSocketQuery: (
          ...args: [input?: SocketQueryFuzzyInput<TServerInputSchema>, cancelOptions?: CancelOptions]
        ) => Promise<void>
        /**
         * Drop the socket query from the cache entirely — no refetch, the entry is gone. Target by exact input, a
         * predicate over the parsed input, or `true`.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        removeSocketQuery: (input?: SocketQueryFuzzyInput<TServerInputSchema>) => void
        /**
         * Reset the socket query to its initial state and refetch if active — clears data/error, not just staleness.
         * Target by exact input, a predicate over the parsed input, or `true`.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        resetSocketQuery: (input?: SocketQueryFuzzyInput<TServerInputSchema>) => Promise<void>
      }
    : EmptyObject) &
  (TQueryResultType extends 'infiniteQuery'
    ? {
        /**
         * The handler as a TanStack infinite query over the connection (the `.infiniteQuery()` flavor) — the page
         * cursor is folded into the message input under the flavor's `pageParamFromInput` key, each page is one
         * `sendToServer`. Never runs before the connection opens (SSR included).
         *
         * Client-side — fetching happens over the client's WebSocket (renders pending during SSR).
         *
         *     const feed = chatFeedHandler(connection).useSocketInfiniteQuery({ q })
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        useSocketInfiniteQuery: (
          ...args: ServerHandlerSendArgs<
            InputRaw<TServerInputSchema>,
            PartialUseInfiniteQueryOptions<
              InputRaw<TServerInputSchema>,
              TReply,
              TError,
              InfiniteData<TReply>,
              QueryKey,
              unknown
            >
          >
        ) => UseInfiniteQueryResult<InfiniteData<TReply>, TError>
        /**
         * The infinite socket query's `useSuspenseInfiniteQuery` — TanStack suspense semantics over the socket: the
         * hook first suspends on the CONNECT itself, then on the first page. During SSR nothing is ever connected — the
         * HTML ships the fallback and the client resolves after hydration (the socket `ssr: false` behavior).
         *
         * Client-side resolution — kept on both bundles.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        useSuspenseSocketInfiniteQuery: (
          ...args: ServerHandlerSendArgs<
            InputRaw<TServerInputSchema>,
            PartialUseSuspenseInfiniteQueryOptions<
              InputRaw<TServerInputSchema>,
              TReply,
              TError,
              InfiniteData<TReply>,
              QueryKey,
              unknown
            >
          >
        ) => UseSuspenseInfiniteQueryResult<InfiniteData<TReply>, TError>
        /**
         * Imperatively fetch and cache the infinite socket query (the first page, or all cached pages per TanStack
         * semantics), AWAITING the connect first. A runtime error on the server.
         *
         * Client-side.
         *
         *     const feed = await chatFeedHandler(connection).fetchSocketInfiniteQuery({ q })
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        fetchSocketInfiniteQuery: (
          ...args: ServerHandlerInputArgs<InputRaw<TServerInputSchema>>
        ) => Promise<InfiniteData<TReply>>
        /**
         * Warm the infinite socket query's cache without returning the data — fetches only if not already cached,
         * awaiting the connect like `fetchSocketInfiniteQuery`.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        prefetchSocketInfiniteQuery: (
          ...args: [
            ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
            infiniteQueryOptions?: PartialUseInfiniteQueryOptions<
              InputRaw<TServerInputSchema>,
              TReply,
              TError,
              InfiniteData<TReply>,
              QueryKey,
              unknown
            >,
          ]
        ) => Promise<void>
        /**
         * The cached pages for an input if present, otherwise fetch the first page — like `fetchSocketInfiniteQuery`
         * but never refetches when data already exists.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        ensureSocketInfiniteQueryData: (
          ...args: [
            ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
            infiniteQueryOptions?: PartialUseInfiniteQueryOptions<
              InputRaw<TServerInputSchema>,
              TReply,
              TError,
              InfiniteData<TReply>,
              QueryKey,
              unknown
            >,
          ]
        ) => Promise<InfiniteData<TReply>>
        /**
         * The resolved react-query `UseInfiniteQueryOptions` of the infinite socket query — ready to hand to TanStack
         * directly.
         *
         * Client-side — the key carries the live connection's room and input.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketInfiniteQueryOptions: (
          ...args: [
            ...ServerHandlerInputArgs<InputRaw<TServerInputSchema>>,
            infiniteQueryOptions?: PartialUseInfiniteQueryOptions<
              InputRaw<TServerInputSchema>,
              TReply,
              TError,
              InfiniteData<TReply>,
              QueryKey,
              unknown
            >,
          ]
        ) => UseInfiniteQueryOptions<InputRaw<TServerInputSchema>, TReply, TError, InfiniteData<TReply>, QueryKey>
        /**
         * The infinite socket query's key tuple for an input — the same key the hooks cache under. Resolves the
         * connection strictly.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketInfiniteQueryKey: (...args: ServerHandlerInputArgs<InputRaw<TServerInputSchema>>) => QueryKey
        /**
         * Read the infinite socket query's cached pages for an exact input — `undefined` if uncached.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketInfiniteQueryData: (
          ...args: ServerHandlerInputArgs<InputRaw<TServerInputSchema>>
        ) => InfiniteData<TReply> | undefined
        /**
         * Write the infinite socket query's cached pages directly — exact-key, `old` is `undefined` until the query has
         * resolved once. Returns the new pages.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        setSocketInfiniteQueryData: (
          input: InputRaw<TServerInputSchema> | undefined,
          updater: Updater<InfiniteData<TReply> | undefined, InfiniteData<TReply>>,
        ) => InfiniteData<TReply>
        /**
         * Read the TanStack `QueryState` of the infinite socket query for an exact input — `undefined` if uncached.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketInfiniteQueryState: (
          ...args: ServerHandlerInputArgs<InputRaw<TServerInputSchema>>
        ) => QueryState<InfiniteData<TReply>, TError> | undefined
        /**
         * The single TanStack `Query` cache entry of the infinite socket query for an exact input (`undefined` if
         * none). For many entries use `getSocketInfiniteQueriesCache`.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketInfiniteQueryCache: (
          ...args: ServerHandlerInputArgs<InputRaw<TServerInputSchema>>
        ) => Query<InfiniteData<TReply>, TError, InfiniteData<TReply>, QueryKey> | undefined
        /**
         * An array of `Query` cache entries of this infinite handler — match by exact input, a predicate over the
         * parsed input, or `true` for every entry.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        getSocketInfiniteQueriesCache: (
          input?: SocketQueryFuzzyInput<TServerInputSchema>,
        ) => Array<Query<InfiniteData<TReply>, TError, InfiniteData<TReply>, QueryKey>>
        /**
         * Force a refetch of the infinite socket query, ignoring staleness — target by exact input, a predicate over
         * the parsed input, or `true`.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        refetchSocketInfiniteQuery: (
          ...args: [input?: SocketQueryFuzzyInput<TServerInputSchema>, refetchOptions?: RefetchOptions]
        ) => Promise<void>
        /**
         * Mark the infinite socket query stale and refetch it if active — target by exact input, a predicate over the
         * parsed input, or `true` for every entry of this handler on the resolved connection (with no resolvable
         * connection, across ALL connections).
         *
         * Client-side.
         *
         *     await chatFeedHandler(connection).invalidateSocketInfiniteQuery({ q })
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        invalidateSocketInfiniteQuery: (
          ...args: [input?: SocketQueryFuzzyInput<TServerInputSchema>, invalidateOptions?: InvalidateOptions]
        ) => Promise<void>
        /**
         * Cancel any in-flight fetch of the infinite socket query — target by exact input, a predicate over the parsed
         * input, or `true`.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        cancelSocketInfiniteQuery: (
          ...args: [input?: SocketQueryFuzzyInput<TServerInputSchema>, cancelOptions?: CancelOptions]
        ) => Promise<void>
        /**
         * Drop the infinite socket query from the cache entirely — no refetch. Target by exact input, a predicate over
         * the parsed input, or `true`.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        removeSocketInfiniteQuery: (input?: SocketQueryFuzzyInput<TServerInputSchema>) => void
        /**
         * Reset the infinite socket query to its initial state and refetch if active — clears data/error, not just
         * staleness. Target by exact input, a predicate over the parsed input, or `true`.
         *
         * Client-side.
         *
         * Full reference: https://1gr14.dev/point0/latest/socket
         */
        resetSocketInfiniteQuery: (input?: SocketQueryFuzzyInput<TServerInputSchema>) => Promise<void>
      }
    : EmptyObject)

/**
 * What calling a serverHandler point with a target returns — the same client surface with the connection fixed. The
 * target resolves LAZILY on every call/render, and an explicit bound target always wins over the ambient
 * `<channel.Connection>`.
 */
export type BoundServerHandler<
  TError extends ErrorPoint0,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TReply,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
> = {
  point: AnyPoint
  /**
   * Send a message to the server over the bound connection — resolves with the `.serverReply` return; don't await it
   * and it's fire-and-forget. During a reconnect the send queues up to the handler's `timeout` (opt out with `queue:
   * false`).
   *
   * Client-side — sending happens over the client's WebSocket (a runtime error on the server).
   *
   *     const { message } = await messageSendHandler(connection).sendToServer({ text })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  sendToServer: (
    ...args: ServerHandlerSendArgs<
      InputRaw<TServerInputSchema>,
      ServerHandlerCallOptions<TReply, InputRaw<TServerInputSchema>>
    >
  ) => Promise<TReply>
} & ServerHandlerSocketQueryMembers<TError, TServerInputSchema, TReply, TQueryResultType>

/** What `useOnMessageFromServer(listener, options?)` takes. */
export type UseOnMessageFromServerOptions = {
  /** listen or not — `false` detaches the listener */
  enabled?: boolean
  /**
   * keep the latest message in state and expose it as `data` in the result, re-rendering on every message; default
   * `false` — the typical consumer reacts through the listener and never re-renders
   */
  lastMessageFromServerAsData?: boolean
}

/** The result of `useOnMessageFromServer({ lastMessageFromServerAsData: true })` — the latest message. */
export type UseOnMessageFromServerResult<TMessage> = {
  /** the latest `.sendToClient` message received on the resolved connection — `undefined` until the first one */
  data: TMessage | undefined
}

/** Picks the `useOnMessageFromServer` result shape off the call's options literal. */
export type UseOnMessageFromServerResultFor<TOptions, TInput> = TOptions extends {
  lastMessageFromServerAsData: true
}
  ? UseOnMessageFromServerResult<TInput>
  : void

/** What `iterateMessagesFromServer({...})` takes — teardown rides the signal, the consumer's loop is the policy. */
export type IterateMessagesFromServerOptions = {
  /** abort to stop iterating — the iterator ends, the listener detaches */
  signal?: AbortSignal
}

/**
 * The imperative message iterator every clientHandler carries — the server's pushes as an async iterable. No request
 * and no transport of its own: iterating attaches a listener to the resolved target (the channel connection — a SPACE
 * handler's, its membership). Identical on the bare point and on the bound surface.
 */
export type ClientHandlerIterateMembers<TMessage> = {
  /**
   * Iterate this handler's messages imperatively — the server's pushes on the resolved target, `for await` it. Yields
   * ride while the target lives (a drop parks the loop while the channel's own reconnect policy redials); the iteration
   * ends when the target closes for good and throws the target's typed error when it fails. Break out (or abort
   * `options.signal`) to detach the listener.
   *
   * Client-side — a runtime error on the server.
   *
   *     for await (const tick of tickHandler.iterateMessagesFromServer()) render(tick)
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  iterateMessagesFromServer: (options?: IterateMessagesFromServerOptions) => AsyncGenerator<TMessage, void, undefined>
}

/** What calling a clientHandler point with a target returns — the listening surface with the connection fixed. */
export type BoundClientHandler<TMessage, TRoom extends UnknownData | EmptyObject | UndefinedRoom> = {
  point: AnyPoint
  /**
   * Listen to this clientHandler's messages on the bound connection while the component is mounted. The callback
   * receives `{ message, connection, point }` (a space handler's adds `room`) and fires immediately on arrival —
   * decoupled from the `.clientReply` auto-responder. With `lastMessageFromServerAsData: true` the result gains `data`
   * (the latest message), re-rendering on every push.
   *
   * Server-and-client — kept on both bundles (a no-op during SSR).
   *
   *     typingHandler(connection).useOnMessageFromServer(({ message }) => setWho(message.userName))
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  useOnMessageFromServer: <
    TOptions extends UseOnMessageFromServerOptions | undefined = UseOnMessageFromServerOptions | undefined,
  >(
    listener: ClientHandlerListenerFn<TMessage, TRoom>,
    options?: TOptions,
  ) => UseOnMessageFromServerResultFor<TOptions, TMessage>
  /**
   * The imperative `useOnMessageFromServer` on the bound connection: register a listener, get `{ remove() }` back.
   *
   * Server-and-client — kept on both bundles (returns an inert remover during SSR).
   *
   *     const listener = messageReceivedHandler(connection).onMessageFromServer(({ message }) => render(message))
   *     listener.remove()
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  onMessageFromServer: (listener: ClientHandlerListenerFn<TMessage, TRoom>) => { remove: () => void }
} & ClientHandlerIterateMembers<TMessage>

export type NiceServerHandlerReadyPoint<
  TPointType extends 'serverHandler',
  TLetsReadyPointType extends UndefinedReadyPointType,
  TRequiredCtx extends RequiredCtx,
  TError extends ErrorPoint0,
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
> = Pick<
  Point0<
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
  >,
  'id' | 'point' | 'tags' | 'type' | 'Infer'
> & {
  /**
   * Bind the handler to one target by CALLING it. A CHANNEL handler binds a connection — the connection object or the
   * channel input it was opened with (binding by input searches the live connections, it never opens one). A SPACE
   * handler binds a ROOM — the room object, or a membership as the shorthand for its single room; a second argument
   * disambiguates when the room lives under several live connections of the channel. The returned surface carries the
   * same client methods with the target fixed; the target resolves lazily on every call/render, and it always wins over
   * the ambient `<channel.Connection>` / `<space.Membership>`.
   *
   *     const { message } = await messageSendHandler(connection).sendToServer({ text })
   *     const { data } = chatInfoHandler({ chatId }).useSocketQuery({ q }) // { chatId } is the ROOM
   *     const { data } = chatInfoHandler(membership).useSocketQuery({ q }) // its single room
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  (
    target: [TRoom] extends [undefined]
      ? ChannelHandlerBindTarget<TChannelInput, TError>
      : SpaceHandlerBindTarget<TRoom, TError, TSpaceInput, TChannelInput>,
    ...rest: [TRoom] extends [undefined] ? [] : [channelInput?: TChannelInput]
  ): BoundServerHandler<TError, TServerInputSchema, TServerLoaderOutput, TQueryResultType>
  /**
   * Send a message to the server — resolves with the `.serverReply` return; don't await it and it's fire-and-forget.
   * The bare form resolves the connection on its own: the ambient `<channel.Connection>` (in components), else the
   * single live connection of the channel — bind an explicit one by calling the handler
   * (`handler(connection).sendToServer(input)`). During a reconnect the send queues up to the handler's `timeout` (opt
   * out with `queue: false`).
   *
   * Client-side — sending happens over the client's WebSocket (a runtime error on the server).
   *
   *     const { message } = await messageSendHandler.sendToServer({ text })
   *     void markReadHandler.sendToServer() // no input declared — none passed
   *     void typingHandler.sendToServer({}, { queue: false }) // fail fast during a reconnect
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  sendToServer: (
    ...args: ServerHandlerSendArgs<
      InputRaw<TServerInputSchema>,
      ServerHandlerCallOptions<TServerLoaderOutput, InputRaw<TServerInputSchema>>
    >
  ) => Promise<TServerLoaderOutput>
} & ServerHandlerSocketQueryMembers<TError, TServerInputSchema, TServerLoaderOutput, TQueryResultType>

export type NiceClientHandlerReadyPoint<
  TPointType extends 'clientHandler',
  TLetsReadyPointType extends UndefinedReadyPointType,
  TRequiredCtx extends RequiredCtx,
  TError extends ErrorPoint0,
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
> = Pick<
  Point0<
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
  >,
  'id' | 'point' | 'tags' | 'type' | 'onMessageFromServer' | 'useOnMessageFromServer' | 'Infer'
> & {
  /**
   * Bind the handler to one target by CALLING it. A CHANNEL handler binds a connection — the connection object or the
   * channel input it was opened with (binding by input searches the live connections, it never opens one). A SPACE
   * handler binds a ROOM — the room object, or a membership as the shorthand for its single room; a room-bound listener
   * then hears ONLY the pushes addressed to that room. The returned surface carries the listening methods with the
   * target fixed; the target resolves lazily on every call/render, and it always wins over the ambient
   * `<channel.Connection>` / `<space.Membership>`.
   *
   *     typingHandler(connection).useOnMessageFromServer(({ message }) => setWho(message.userName))
   *     messageNewHandler({ chatId }).useOnMessageFromServer(({ message }) => add(message)) // one room only
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  (
    target: [TRoom] extends [undefined]
      ? ChannelHandlerBindTarget<TChannelInput, TError>
      : SpaceHandlerBindTarget<TRoom, TError, TSpaceInput, TChannelInput>,
    ...rest: [TRoom] extends [undefined] ? [] : [channelInput?: TChannelInput]
  ): BoundClientHandler<InputParsed<TClientInputSchema>, TRoom>
  /**
   * Push to clients — `sendToClient(message, target?, replies?)`. The target is the `$`-dictionary (AND-combined): a
   * CHANNEL handler addresses connections (`connectionId`, `$identity`, bare = everyone in the channel), a SPACE
   * handler addresses rooms (`room` snapshot(s), plus `connectionId` / `$identity` narrowing; bare = everyone in the
   * space). Targets and matchers are typed by the declared identity/room keys with the ordinary structural rules — a
   * mistyped key on a fresh literal is caught by the excess-property check, a matcher variable is the caller's
   * responsibility; sift operators go in the values (`{ userId: { $in: [...] } }`). Pass `replies` (only a handler with
   * `.clientReply` has it) and each client's reply travels back: `true` = an async iterable, `{ waitForAll: true }` =
   * the full array, `{ onReply }` = a callback per reply.
   *
   * Server-side — callable anywhere on the server: mutation loaders, other handlers, crons (a runtime error on the
   * client — the client listens with `onMessageFromServer`).
   *
   *     void messageNewHandler.sendToClient({ message }, { room: { chatId } })
   *     void announceHandler.sendToClient({ text }) // channel handler — everyone connected
   *     const replies = await pingHandler.sendToClient({ ask }, { room }, { waitForAll: true })
   *
   * Full reference: https://1gr14.dev/point0/latest/socket
   */
  sendToClient: ClientHandlerSendFn<
    TRoom,
    InputRaw<TClientInputSchema>,
    TServerLoaderOutput extends LoaderOutput ? TServerLoaderOutput : undefined,
    TIdentity
  >
} & ClientHandlerIterateMembers<InputParsed<TClientInputSchema>>

export type NiceProviderReadyPoint<
  in out TPointType extends 'provider',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  WithQueryIfSuitable<
    TServerLoaderOutput,
    TQueryResultType,
    'id' | 'point' | 'tags' | 'type' | 'useValue' | 'getValue' | 'getValueOrUndefined' | 'Provider' | 'X' | 'Infer'
  >
>

export type NiceSubscriptionReadyPoint<
  in out TPointType extends 'subscription',
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = Pick<
  Point0<
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
  >,
  'id' | 'point' | 'tags' | 'type' | 'useSubscription' | 'fetchSubscription' | 'Infer'
>

type NiceReadyPointMap<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  in out TPointType extends ReadyPointType,
  out TLetsReadyPointType extends UndefinedReadyPointType,
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
> = {
  root: NiceRootReadyPoint<
    'root',
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
  >
  plugin: NicePluginReadyPoint<
    'plugin',
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
  >
  base: NiceBaseReadyPoint<
    'base',
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
  >
  page: NicePageReadyPoint<
    'page',
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
  >
  component: NiceComponentReadyPoint<
    'component',
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
  >
  action: NiceActionReadyPoint<
    'action',
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
  >
  query: NiceQueryReadyPoint<
    'query',
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
  >
  infiniteQuery: NiceInfiniteQueryReadyPoint<
    'infiniteQuery',
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
  >
  mutation: NiceMutationReadyPoint<
    'mutation',
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
  >
  subscription: NiceSubscriptionReadyPoint<
    'subscription',
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
  >
  channel: NiceChannelReadyPoint<
    'channel',
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
  >
  space: NiceSpaceReadyPoint<
    'space',
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
  >
  serverHandler: NiceServerHandlerReadyPoint<
    'serverHandler',
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
  >
  clientHandler: NiceClientHandlerReadyPoint<
    'clientHandler',
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
  >
  layout: NiceLayoutReadyPoint<
    'layout',
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
  >
  provider: NiceProviderReadyPoint<
    'provider',
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
  >
}

export type NiceReadyPoint<
  TPointType extends ReadyPointType,
  TLetsReadyPointType extends UndefinedReadyPointType,
  TRequiredCtx extends RequiredCtx,
  TError extends ErrorPoint0,
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
> = NiceReadyPointMap<
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
>[TPointType]

export type AnyNiceReadyPoint<
  TPointType extends ReadyPointType = ReadyPointType,
  TLetsReadyPointType extends UndefinedReadyPointType = UndefinedReadyPointType,
  TError extends ErrorPoint0 = any,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = NiceReadyPoint<
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
>
export type AnyNicePagePoint<
  TPointType extends 'page' = 'page',
  TLetsReadyPointType extends UndefinedReadyPointType = UndefinedReadyPointType,
  TError extends ErrorPoint0 = any,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = NiceReadyPoint<
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
>
export type AnyNiceRequestableReadyPoint<
  TPointType extends RequestableReadyPointType = RequestableReadyPointType,
  TLetsReadyPointType extends UndefinedReadyPointType = UndefinedReadyPointType,
  TRequiredCtx extends RequiredCtx = any,
  TError extends ErrorPoint0 = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TBodySchema extends InputSchema | UndefinedInputSchema = any,
  THeadersSchema extends InputSchema | UndefinedInputSchema = any,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TOuterProps extends Props = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TConnectionsDefinitions extends ConnectionsDefinitions = any,
  TMembershipsDefinitions extends MembershipsDefinitions = any,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput = any,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = NiceReadyPoint<
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
>

// socket

export type ChannelConnectionStatus = 'connecting' | 'open' | 'error' | 'closed'

/**
 * The client-side connection object returned by `useConnection` / `connect` — query-shaped: a connect is a request with
 * an answer, so the connection reports `error` / `isLoading` like a query result does. Its identity lives server-side;
 * the client sees only the status and the input it connected with.
 */
export type ClientChannelConnection<TInputRaw = unknown, TError extends ErrorPoint0 = ErrorPoint0> = {
  status: ChannelConnectionStatus
  /** typed error from the connector when the connect request failed, else `null` */
  error: TError | null
  /** `status === 'connecting'` — the query-shaped loading flag */
  isLoading: boolean
  /** what this connection connected with */
  input: TInputRaw
  /** the connection id — `undefined` until the connect response arrives */
  id: string | undefined
  /** how many successful connects this connection has had — `0` while the first is in flight, `> 1` = it reconnected */
  connectionIndex: number
  /** release this hold; the real connection closes when the last hold is gone (after `linger`) */
  disconnect: () => void
}
export type AnyClientChannelConnection = ClientChannelConnection<any, any>

export type SpaceMembershipStatus = 'joining' | 'joined' | 'error' | 'closed'

/**
 * The client-side membership object returned by `useMembership` / `join` — one level below a connection. It holds the
 * space input it joined with and the rooms the server admitted it into: `rooms: []` = joined nothing (a clean deny), a
 * `.joiner` throw surfaces as `status: 'error'`.
 */
export type ClientSpaceMembership<
  TSpaceInput extends UnknownData | EmptyObject | UndefinedSpaceInput,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom,
  TError extends ErrorPoint0,
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput,
> = {
  status: SpaceMembershipStatus
  /** actual rooms the server admitted this client into — `[]` = joined nothing (a clean deny) */
  rooms: TRoom[]
  error: TError | null
  isLoading: boolean
  /** what this membership joined with */
  input: TSpaceInput
  /** the channel connection this membership rides on */
  connection: ClientChannelConnection<TChannelInput, TError>
  /**
   * how many successful joins this membership has had — `0` while the first is in flight, `> 1` = it re-entered; an
   * ENROLLED membership (no join behind it) is created at `1`
   */
  membershipIndex: number
  /**
   * release this hold; the real membership leaves when the last hold is gone (after `linger`). On an ENROLLED
   * membership (nothing holds it) it leaves right away — the rooms drop server-side and the next connection setup
   * re-runs the `.enroller`
   */
  leave: () => void
}
export type AnyClientSpaceMembership = ClientSpaceMembership<any, any, any, any>

// On the server a connection is always the bare `connectionId` string (the ephemeral cid) — server-side callbacks,
// events, targets and listings all carry it flat; the rich connection FACADE is a client-only object.

/**
 * The retry policy shared by everything that reconnects — the channel socket and a subscription's broken stream.
 * `reconnect: true` / `false` are shorthands for `{ enabled }`.
 */
export type ReconnectOptions = {
  /** reconnect at all; default `true` */
  enabled?: boolean
  /** retry the FIRST time immediately (a drop is usually accidental); default `true` */
  immediately?: boolean
  /** the base wait between retries, ms; default `300` */
  delay?: number
  /** the wait multiplier per attempt (exponential backoff) — `1` = constant `delay`; default `2` */
  backoff?: number
  /** the wait ceiling, ms; default `5000` */
  maxDelay?: number
  /** total retry attempts before giving up; default unlimited */
  retries?: number
}

// subscription — a server stream of values over HTTP (NDJSON), the pull twin of a channel's push

export type SubscriptionStatus = 'connecting' | 'open' | 'error' | 'closed'

/**
 * What the subscription lifecycle callbacks (`onConnect` / `onDisconnect`) receive. A subscription has no shared facade
 * — each consumer is its own stream — so the props carry the input that identifies the stream.
 */
export type SubscriptionConnectionEventProps<TInput = unknown> = {
  point: AnyNiceReadyPoint
  /** the input this consumer subscribed with */
  input: TInput
  /** how many successful opens this consumer's stream had BEFORE this one — `0` on the first, `> 0` = a reconnect */
  connectionIndex: number
}
export type SubscriptionConnectionErrorEventProps<TInput = unknown, TError extends ErrorPoint0 = ErrorPoint0> = {
  point: AnyNiceReadyPoint
  /** the input this consumer subscribed with */
  input: TInput
  error: TError
  /** how many successful opens this consumer's stream had BEFORE this one — `0` on the first, `> 0` = a reconnect */
  connectionIndex: number
}

/**
 * A tracked-cursor path option: the strict `PathKeys` union when the shape is known, a plain `string` under the
 * unparameterized (storage/merge) instantiations — so `point._subscriptionOptions` reads naturally while the closer
 * still validates the literal against the real input/data shapes.
 */
type SubscriptionCursorPath<T> = [unknown] extends [T] ? string : PathKeys<T>

/**
 * Options of the closing `.subscription({...})` — point-level defaults for every consumer; the call sites
 * (`useSubscription(input, {...})` / `fetchSubscription(input, {...})`) override per use.
 */
export type SubscriptionPointOptions<TMessage = unknown, TInput = unknown, TError extends ErrorPoint0 = ErrorPoint0> = {
  /**
   * restart the generator after a broken stream (a network drop, a server restart) — a boolean or
   * {@link ReconnectOptions}; default on: first retry immediate, then 300 ms doubling up to 5 s. A stream the server
   * COMPLETED (the generator returned) never restarts, and neither does a typed error — only a break does.
   * Client-read.
   */
  reconnect?: boolean | ReconnectOptions
  /**
   * Module-level listener — runs on every message this point streams to any consumer; per-call listeners add up,
   * nothing ever doubles. Client code; cut from the SERVER bundle with its imports.
   */
  onMessageFromServer?: (message: TMessage) => void | Promise<void>
  /**
   * Runs on EVERY successful open of a consumer's stream — the first and every re-open after a break; the props'
   * `connectionIndex` tells the first (`0`) from a repeat (`> 0`). Per consumer — two hooks are two streams, each fires
   * its own. Client code; cut from the SERVER bundle with its imports.
   */
  onConnect?: (props: SubscriptionConnectionEventProps<TInput>) => void | Promise<void>
  /**
   * Runs when an OPEN stream stops — a network break (the reconnect policy redials next), a server completion (the
   * generator returned) or a mid-stream typed error. A stream that never opened fires nothing, and neither does the
   * consumer's own teardown (unmount, an early break) — the consumer left, there is nobody to tell. Client code; cut
   * from the SERVER bundle with its imports.
   */
  onDisconnect?: (props: SubscriptionConnectionEventProps<TInput>) => void | Promise<void>
  /**
   * Runs when the stream reaches its terminal `error` status — a typed error (thrown by the generator or a failed
   * request) or a break the reconnect policy gave up on. Client code; cut from the SERVER bundle with its imports.
   */
  onError?: (props: SubscriptionConnectionErrorEventProps<TInput, TError>) => void | Promise<void>
  /**
   * The INPUT half of the tracked-cursor pair: the (possibly deep, dot-separated) path of the input field the client
   * rewrites with the last delivered cursor before an AUTO-RECONNECT resubscribes — the first subscribe always sends
   * the caller's input untouched, so the loader reads the cursor the same way on a fresh start and on a resume: out of
   * its input. Same path rule and the same set machinery as `pageParamFromInput` on infinite queries. Comes only as a
   * pair with `cursorParamFromData` (validated at the point's close), and only on the closing `.subscription({...})` —
   * not per call, not scope-wide. Client-read; cut from the SERVER bundle.
   */
  cursorParamFromInput?: SubscriptionCursorPath<TInput>
  /**
   * The DATA half of the tracked-cursor pair: the (possibly deep, dot-separated) path INSIDE EACH STREAMED VALUE the
   * client plucks the cursor from — the data of a tracked subscription must be an object carrying its own cursor field.
   * The plucked value is the parsed one (after the transformer — a `Date` cursor stays a `Date`), and its type must be
   * assignable to the input field named by `cursorParamFromInput` (checked at the close). Client-read; cut from the
   * SERVER bundle.
   */
  cursorParamFromData?: SubscriptionCursorPath<TMessage>
}

/**
 * The type-level validation of the tracked-cursor pair on the closing `.subscription({...})`: the two paths come only
 * TOGETHER, and the value at `cursorParamFromData` (in the data) must fit the input field at `cursorParamFromInput` —
 * the client writes the former into the latter on reconnect. Path existence itself is enforced by the option types
 * (`PathKeys`); this assert adds the pairing and the cross-type check.
 */
export type AssertSubscriptionCursorParams<TOptions, TData, TInput> = TOptions extends {
  cursorParamFromInput: infer TFromInput extends string
}
  ? TOptions extends { cursorParamFromData: infer TFromData extends string }
    ? GetByPathType<TData, TFromData> extends GetByPathType<TInput, TFromInput>
      ? unknown
      : ShowError<`The value at cursorParamFromData does not fit the input field at cursorParamFromInput — the client writes the data cursor into that input field on reconnect`>
    : ShowError<`cursorParamFromInput and cursorParamFromData come as a pair — declare both or neither`>
  : TOptions extends { cursorParamFromData: string }
    ? ShowError<`cursorParamFromInput and cursorParamFromData come as a pair — declare both or neither`>
    : unknown

/**
 * What `useSubscription(input, {...})` takes on top of the point-level options. The tracked-cursor pair is NOT here on
 * purpose — the cursor is part of the point's contract (its paths name schema fields), declared once on the closing
 * `.subscription({...})` where the pairing and the cross-type check live.
 */
export type ExtraUseSubscriptionOptions<
  TData = unknown,
  TInput = unknown,
  TError extends ErrorPoint0 = ErrorPoint0,
> = Omit<SubscriptionPointOptions<TData, TInput, TError>, 'cursorParamFromInput' | 'cursorParamFromData'> & {
  /** subscribe or not — `false` renders `closed` and opens nothing, like a disabled query */
  enabled?: boolean
  /**
   * keep the latest message in state and expose it as `data` in the result, re-rendering on every message; default
   * `false` — the typical consumer reacts through `onMessageFromServer` and never re-renders
   */
  lastMessageFromServerAsData?: boolean
}

/** What `fetchSubscription(input, {...})` takes — teardown rides the signal, reconnect is the consumer's loop. */
export type FetchSubscriptionOptions = {
  /** abort to stop the stream — the iterator ends, the server generator's `signal` fires */
  signal?: AbortSignal
}

/** The result of `useSubscription` — `data` appears only with `lastMessageFromServerAsData: true`. */
export type UseSubscriptionResultBare<TError extends ErrorPoint0 = ErrorPoint0> = {
  error: TError | null
  /**
   * `connecting` until the stream answers, `open` while it streams, `closed` when it completed, `error` on a typed
   * error
   */
  status: SubscriptionStatus
  /** `status === 'connecting'` — the query-shaped loading flag */
  isLoading: boolean
}

/** The query-shaped result of `useSubscription({ lastMessageFromServerAsData: true })`: `data` is the LATEST message. */
export type UseSubscriptionResult<
  TData = unknown,
  TError extends ErrorPoint0 = ErrorPoint0,
> = UseSubscriptionResultBare<TError> & {
  /** the latest streamed value — `undefined` until the first one arrives */
  data: TData | undefined
}

/** Picks the `useSubscription` result shape off the call's options literal. */
export type UseSubscriptionResultFor<TOptions, TData, TError extends ErrorPoint0 = ErrorPoint0> = TOptions extends {
  lastMessageFromServerAsData: true
}
  ? UseSubscriptionResult<TData, TError>
  : UseSubscriptionResultBare<TError>

/**
 * What a subscription `.loader` receives — the standard loader surface (so a plain loader on the same stage can fall
 * through overload resolution to the standard `.loader`) plus the unsubscribe `signal`.
 */
export type SubscriptionLoaderProps<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TError extends ErrorPoint0 = ErrorPoint0,
> = LoaderProps<
  TCtx,
  TCtxExposedKeys,
  UndefinedLoaderOutput,
  TServerInputSchema,
  TParamsSchema,
  TSearchSchema,
  TBodySchema,
  THeadersSchema,
  TCookiesSchema,
  'endpoint',
  TError
> & {
  /**
   * fires when the consumer unsubscribes (or vanishes) — break the loop on it, or hand it to whatever feeds the
   * generator (`for await (const [post] of on(emitter, 'add', { signal }))`); without it a generator waiting on an
   * external source outlives its consumer forever
   */
  signal: AbortSignal
}

/**
 * A subscription's `.loader` — an async GENERATOR: each `yield` is one streamed value, a `return` completes the stream.
 * The data type is the union of the yields — nothing is declared.
 */
export type SubscriptionLoaderFn<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TError extends ErrorPoint0 = ErrorPoint0,
  TYield extends UnknownData = UnknownData,
> = (
  props: SubscriptionLoaderProps<
    TCtx,
    TCtxExposedKeys,
    TServerInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema,
    TError
  >,
) => AsyncGenerator<TYield, void | undefined, any> | AsyncIterable<TYield>

/**
 * The one loader shape of an ACTION opener: the standard loader that may ALSO be an async generator (then the point
 * closes with `.subscription()` — the stream on the action's own method/path). One type instead of two overloads on
 * purpose: overload resolution contextually types an unannotated callback ONCE (by the first candidate, even a
 * `never`-gated one), so the action stage needs a single context serving both forms — the standard return union plus
 * `AsyncIterable`, and `signal` typed optional (it is always present at runtime when the loader is a generator).
 */
export type ActionLoaderFnWithStream<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TError extends ErrorPoint0 = ErrorPoint0,
  TNewServerLoaderOutput extends LoaderOutput | RedirectTask | Error | undefined | void =
    | LoaderOutput
    | RedirectTask
    | Error
    | undefined
    | void,
  TYield extends UnknownData = UnknownData,
> = (
  props: LoaderProps<
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
  > & { signal?: AbortSignal },
) =>
  | Promise<[number, TNewServerLoaderOutput]>
  | [number, TNewServerLoaderOutput]
  | Promise<TNewServerLoaderOutput>
  | TNewServerLoaderOutput
  | AsyncGenerator<TYield, void | undefined, any>
  | AsyncIterable<TYield>

/** The yield union of a subscription loader — the subscription's data type. */
export type InferSubscriptionYield<TFn extends (...args: any[]) => any> =
  ReturnType<TFn> extends AsyncIterable<infer TYield extends UnknownData> ? TYield : never

/** What the connection lifecycle callbacks (`onConnect` / `onDisconnect`) receive — the facade plus the entry facts. */
export type ChannelConnectionEventProps<TConnection = AnyClientChannelConnection> = {
  connection: TConnection
  point: AnyNiceReadyPoint
  /** how many successful connects this connection had BEFORE this one — `0` on the first, `> 0` = a reconnect */
  connectionIndex: number
  /**
   * this entry rode the RESUME path of a [`resumable: true`](socket#resumable-connections) channel — the connector,
   * joiners and enrollers were all SKIPPED; `false` = the full path (everything really re-ran). Always `false` on a
   * non-resumable channel.
   */
  resumed: boolean
  /**
   * provably nothing was missed ON THE CHANNEL LEVEL — the channel-wide and connection-addressed pushes (each
   * membership's `onEnter` carries its own rooms' verdict): `true` on the first entry (there was nothing to miss) and
   * on a resume whose channel-level streams replayed without a hole; `false` on every other re-entry. The catch-up
   * condition: `if (!gapless) refetch()`.
   */
  gapless: boolean
}
/** What `onError` receives — the failing connection plus the typed error (no entry markers: nothing was entered). */
export type ChannelConnectionErrorEventProps<
  TConnection = AnyClientChannelConnection,
  TError extends ErrorPoint0 = ErrorPoint0,
> = {
  connection: TConnection
  error: TError
  point: AnyNiceReadyPoint
  /** how many successful connects this connection had BEFORE this one — `0` on the first, `> 0` = a reconnect */
  connectionIndex: number
  /** see {@link ChannelConnectionEventProps.resumed} — always `false` here (a failed entry resumed nothing) */
  resumed: boolean
  /** see {@link ChannelConnectionEventProps.gapless} — a failed entry proves nothing, so `false` past the first */
  gapless: boolean
}

/** What the membership lifecycle callbacks (`onEnter` / `onLeave`) receive. */
export type SpaceMembershipEventProps<TMembership = AnyClientSpaceMembership> = {
  membership: TMembership
  point: AnyNiceReadyPoint
  /** how many successful joins this membership had BEFORE this one — `0` on the first, `> 0` = a re-enter */
  membershipIndex: number
  /**
   * this entry rode the RESUME path — the joiner was SKIPPED and the rooms were restored from the connection passport;
   * `false` = a real join ran. Always `false` on a non-resumable channel (and for a `resumable: false` space, whose
   * rooms a resume never restores — the client re-joins them itself).
   */
  resumed: boolean
  /**
   * provably nothing was missed BY THIS MEMBERSHIP — its rooms' and its space-wide streams: `true` on the first enter,
   * and on a resume that replayed them without a hole; `false` on every other re-entry (a gap in ANOTHER room never
   * flips this one's bit). The room-scoped catch-up condition: `if (!gapless) refetch()`.
   */
  gapless: boolean
}

/**
 * The CLIENT side of the channel options — read by the client runtime, so the connection call sites (`useConnection` /
 * `connect` / `<channel.Connection>`) may override them per call. Part of the per-side option system: on the POINT this
 * bucket is the `client` GROUP ({@link ChannelPointOptions}), which the compiler drops whole from the server bundle;
 * each call site composes the same bucket FLAT plus its call-only fields.
 */
export type ChannelOptionsClientOnly<
  TError extends ErrorPoint0 = ErrorPoint0,
  TConnection = AnyClientChannelConnection,
> = {
  /**
   * a boolean or {@link ReconnectOptions}; default on: first retry immediate, then 300 ms doubling up to 5 s.
   *
   * Read by the client; rides the `client` group, cut from the SERVER bundle with it.
   */
  reconnect?: boolean | ReconnectOptions
  /**
   * allow the cold-start upgrade-connect: the FIRST connect rides a single GET+Upgrade round trip instead of the ticket
   * fetch. Default `false` — every connect (first and re-) takes the ticket path: a plain fetch, so custom headers
   * (`.fetchOptions`) apply and the connector's typed error is readable (a browser hides a failed handshake's
   * response). Turn it on for same-origin apps on cookie auth, where the saved round trip is free. Reconnects stay on
   * the ticket path either way.
   *
   * Read by the client; rides the `client` group, cut from the SERVER bundle with it.
   */
  upgradable?: boolean
  /**
   * ms a connection outlives its last hold (survives route transitions); default `1000`.
   *
   * Read by the client; rides the `client` group, cut from the SERVER bundle with it.
   */
  linger?: number
  /**
   * keepalive interval in ms; effective on the root — one socket; default `30_000`. It also arms the client's LIVENESS
   * DEADLINE: two pings answered by nothing at all — no pong, no push, no reply — and more than two intervals of
   * silence means the socket is half-open (a NAT timeout, a machine that slept), so the client closes it locally and
   * reconnects instead of writing pushes into a dead pipe. `0` disables both halves — and then the engine recycles idle
   * sockets (its `idleTimeout` is 120 s) and connection records stop renewing their TTL, so keep the ping on outside of
   * tests.
   *
   * Read by the client; rides the `client` group, cut from the SERVER bundle with it.
   */
  ping?: number
  /**
   * ms a cold-start upgrade-connect waits for its `claimed` frame before giving up on the handshake and falling back to
   * the ticket path — the guard against a middlebox (or a dev proxy) that swallows the upgrade without failing it;
   * default `5000`. The happy path clears it in one round trip.
   *
   * Read by the client; rides the `client` group, cut from the SERVER bundle with it.
   */
  upgradeTimeout?: number
  /**
   * ms a sent `resume` entry waits for its answer before this connection falls back to the full connect — the guard
   * against a server that does not speak resume (a rolling deploy mid-upgrade) or a lost answer; default `5000`. The
   * happy path answers within one round trip.
   *
   * Read by the client; rides the `client` group, cut from the SERVER bundle with it.
   */
  resumeTimeout?: number
  /**
   * Runs on the client on EVERY successful connect — the first and every re-connect after a break; the props'
   * `connectionIndex` tells the first (`0`) from a repeat (`> 0`), and `resumed`/`gapless` carry the
   * [resumable-connection](socket#resumable-connections) entry markers (`gapless` speaks for the CHANNEL-LEVEL streams
   * — channel-wide pushes and connection-addressed ones; each membership's `onEnter` carries its own rooms' verdict) —
   * the channel-wide catch-up is one condition, `if (!gapless) refetch()`. Client code; cut from the SERVER bundle with
   * its imports.
   */
  onConnect?: (props: ChannelConnectionEventProps<TConnection>) => void | Promise<void>
  /** Runs on the client when the connection closes. Client code; cut from the SERVER bundle with its imports. */
  onDisconnect?: (props: ChannelConnectionEventProps<TConnection>) => void | Promise<void>
  /** Runs on the client when a connect fails. Client code; cut from the SERVER bundle with its imports. */
  onError?: (props: ChannelConnectionErrorEventProps<TConnection, TError>) => void | Promise<void>
}

/**
 * The SERVER side of the channel options — declared on the point (chain / closer) only; no client call site reads them,
 * so they never appear in call-site option types.
 */
export type ChannelOptionsServerOnly = {
  /**
   * the server rejects bigger incoming frames; default `1_048_576`.
   *
   * Read by the server; cut from the CLIENT bundle.
   */
  maxMessageSize?: number
  /**
   * live connections to this channel one SOCKET may hold (point0's own client keeps one socket, so per browser tab);
   * default `32`. The cap counts nothing but that socket's own live connections to THIS channel — other channels, other
   * sockets and other tabs each carry their own count, so it bounds one socket, never a user. `1` is a legitimate
   * value: the socket then holds at most one connection to the channel. Setting it low does not break reconnects — a
   * close the server saw drops that socket's connections at once, a ghost it never saw goes down with the socket on the
   * WS `idleTimeout` (its record lapses on `connectionTtl`), and the fresh socket counts from zero either way.
   *
   * Read by the server; cut from the CLIENT bundle.
   */
  maxConnections?: number
  /**
   * ms a connection record lives in the backplane without renewal (the client ping renews it — keep this comfortably
   * above `ping`); default `90_000`.
   *
   * Read by the server; cut from the CLIENT bundle.
   */
  connectionTtl?: number
  /**
   * the resume TUNING of this channel's server side — the park window and the topic streams' buffer ceilings. Only
   * meaningful with the top-level `resumable: true`, and the `.channel()` closer refuses the group without it (dead
   * config must not sit silently). All keys optional; a space's own `server.resume` overrides the ceilings for its room
   * and space-wide streams.
   *
   * Read by the server; cut from the CLIENT bundle.
   */
  resume?: ChannelResumeOptions
}

/**
 * The `server.resume` tuning group of a [`resumable`](socket#resumable-connections) channel — how long a dead-socket
 * connection stays parked and how much each topic stream buffers for the replay.
 */
export type ChannelResumeOptions = {
  /**
   * ms a resumable connection whose socket died keeps its streams addressed (parked) — the blip window a resume can
   * replay across; default `30_000`. A resume past it still works off the KV record (`connectionTtl` owns that), just
   * without the replay.
   */
  parkWindow?: number
  /**
   * frames one topic stream logs at most, across its handlers (each buffering handler also has its own ceiling — its
   * `resumable: number`); oldest evicted first, and every eviction honestly gaps the proof (`gapless: false` for a
   * client that needed it); default `1024`.
   */
  streamMaxFrames?: number
  /**
   * bytes one topic stream logs at most (the serialized frames); oldest evicted first, same honest gapping; default
   * `4_194_304` (4 MiB). At least one frame always stays — a single frame over the cap buffers alone rather than
   * turning the handler's buffer off silently.
   */
  streamMaxBytes?: number
}

/** The `server.resume` override a SPACE may carry for its own streams — the ceilings only (the park is per connection). */
export type SpaceResumeOptions = {
  /** frames one of this space's streams logs at most; default: the channel's `resume.streamMaxFrames` */
  streamMaxFrames?: number
  /** bytes one of this space's streams logs at most; default: the channel's `resume.streamMaxBytes` */
  streamMaxBytes?: number
}

/**
 * The DECLARATION-ONLY channel options — set up the chain (`.channelOptions()`) or on the closer `.channel({...})`,
 * never per call site: a wire format is a fact both sides must agree on statically, so it resolves ONCE, when the
 * channel closes.
 */
export type ChannelOptionsDeclarationOnly = {
  /**
   * `true` opts this channel's whole wire out of the scope's [transformer](transformer) — every payload the channel and
   * its spaces and handlers serialize (the connect input and identity, room keys, sends, replies, pushes) is plain
   * JSON, so raw external consumers never have to speak the transformer's envelope. The price is the channel's to keep:
   * its schemas must stay JSON-representable (no `Date`/`Map`/`Set`/`BigInt`). Resolved at `.channel()`.
   *
   * Read by both sides; kept on both bundles.
   */
  preventTransformer?: boolean
  /**
   * `true` makes this channel's connections RESUMABLE: the client keeps a per-connection resume key, and a reconnect
   * restores the connection — identity, rooms, subscriptions — without re-running the connector, the joiners or the
   * enrollers (`onConnect`/`onEnter` fire with `resumed: true`). The restore window is `connectionTtl` — the same
   * record the ping renews is the resume passport (its per-space rooms and the HASH of the resume key ride it). A
   * server `refresh`, a kick and a voluntary close all bypass/void the resume — revocation is never resumable. Default
   * `false`.
   *
   * Read by both sides (the client keeps the key and sends the resume, the server verifies and restores); kept on both
   * bundles, like `preventTransformer`.
   */
  resumable?: boolean
}

/**
 * The POINT surface of the channel options — declarable up the chain via `.channelOptions()` and on the close
 * `.channel({...})`. The sides are GROUPED: `server` holds what only the server reads, `client` what only the client
 * runtime reads, and options both sides read (`preventTransformer`) stay top-level next to the groups. The grouping is
 * what makes the compiler's split STRUCTURAL — the client bundle drops the `server` property whole, the server bundle
 * the `client` property whole, so a new option can never leak into the wrong bundle. The price: the options argument
 * must be an object LITERAL without spreads (a variable or a call is a compile error) — the group VALUES may be any
 * expression, since a whole property is what gets dropped.
 *
 *     .channel({ server: { maxMessageSize: 4096 }, client: { linger: 3000 }, preventTransformer: true })
 */
export type ChannelPointOptions<
  TError extends ErrorPoint0 = ErrorPoint0,
  TConnection = AnyClientChannelConnection,
> = ChannelOptionsDeclarationOnly & {
  /** Server-read channel options — the caps. Dropped WHOLE from the client bundle. */
  server?: ChannelOptionsServerOnly
  /**
   * Client-read channel options — the connection policy and the lifecycle callbacks. Dropped WHOLE from the server
   * bundle.
   */
  client?: ChannelOptionsClientOnly<TError, TConnection>
}

/**
 * The RESOLVED channel options — what the merge produces and the runtime reads: the groups flattened into one object
 * (no key collides across the sides), defaults → chain → closer → call site. Internal shape; the declaration surface is
 * the grouped {@link ChannelPointOptions}, the call sites are the flat {@link ExtraUseConnectionOptions}.
 */
export type ChannelOptionsResolved<
  TError extends ErrorPoint0 = ErrorPoint0,
  TConnection = AnyClientChannelConnection,
> = ChannelOptionsClientOnly<TError, TConnection> & ChannelOptionsServerOnly & ChannelOptionsDeclarationOnly

/** Call-site connection options — the channel's CLIENT side plus `enabled`. */
export type ExtraUseConnectionOptions<
  TError extends ErrorPoint0 = ErrorPoint0,
  TConnection = AnyClientChannelConnection,
> = ChannelOptionsClientOnly<TError, TConnection> & {
  /**
   * call-site only — connect or not, like a disabled query; default `true`.
   *
   * Read by the client; the call site lives in component code, nothing to cut.
   */
  enabled?: boolean
}

/** What `onReplyFromServer` receives — the server's reply (`data`) next to the raw input the send carried. */
export type ServerHandlerReplyEventProps<TData = unknown, TInput = unknown> = {
  /**
   * the input the send carried, RAW — exactly what was passed to `sendToServer`, before any server-side parse (the
   * callback fires on the CLIENT when the reply frame lands); correlates the reply with its send
   */
  input: TInput
  /** the server's reply — what `.serverReply` returned (the naming law: `data` = the other side's answer to you) */
  data: TData
  connection: AnyClientChannelConnection
  point: AnyNiceReadyPoint
}

/**
 * The CLIENT side of the server-handler options — read by the client's send path, so the client call sites
 * (`sendToServer`, the connection-query hooks) may override them per call.
 */
export type ServerHandlerOptionsClientOnly<TData = unknown, TInput = unknown> = {
  /**
   * how long this send waits for its reply, ms — waiting for the connect/join and queueing through a reconnect
   * included; default `5000`. A channel-wide default is `.serverHandlerOptions({ client: { timeout } })` on the channel
   * chain (every handler of the channel inherits it).
   *
   * Read by the client (`.sendToServer` waits with it); rides the `client` group, cut from the SERVER bundle with it.
   */
  timeout?: number
  /**
   * queue through a reconnect; `false` = fail fast (typing pings); default `true`.
   *
   * Read by the client; rides the `client` group, cut from the SERVER bundle with it.
   */
  queue?: boolean
  /**
   * Runs on the client on every reply of this handler, fire-and-forget sends included. Client code; cut from the SERVER
   * bundle with its imports.
   */
  onReplyFromServer?: (props: ServerHandlerReplyEventProps<TData, TInput>) => void | Promise<void>
}

/**
 * The SERVER side of the server-handler options — declared on the point (chain / closer) only; a client call site never
 * reads them, so they never appear in {@link ServerHandlerCallOptions}.
 */
export type ServerHandlerOptionsServerOnly<
  TData = unknown,
  TInput = unknown,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = {
  /**
   * Guard BEFORE the reply — runs on the server per incoming message, after the `.clientSend` parse and before
   * `.serverReply`. Throw a typed error and the client's send rejects with it, the reply never runs — rate limits and
   * per-message authorization live here (messages travel the socket, so request-time middleware/plugins never see
   * them). Callbacks stack chain → closer and run in order. Server code; cut from the CLIENT bundle with its imports.
   */
  onBeforeServerReply?: (props: ServerHandlerBeforeReplyEventProps<TInput, TIdentity, TRoom>) => void | Promise<void>
  /**
   * Runs on the server AFTER the reply settles — audit and metrics. Receives `output` (the reply data; `undefined` for
   * a deferred promise or a stream — their answers are produced later) and `error` (set when the reply or a guard
   * threw). Its own throw is logged and never affects the reply. Callbacks stack chain → closer and run in order.
   * Server code; cut from the CLIENT bundle with its imports.
   */
  onAfterServerReply?: (
    props: ServerHandlerAfterReplyEventProps<TInput, TIdentity, TRoom, TData>,
  ) => void | Promise<void>
}

/**
 * The POINT surface of the server-handler options — `.serverHandlerOptions()` up the chain and the close
 * `.serverHandler({...})`, sides GROUPED (the compiler drops the wrong group whole per bundle). The per-send call site
 * is the flat {@link ServerHandlerCallOptions} — the side is given by the call itself. Note the two `timeout`s of the
 * socket families are told apart by their group: this one (`client`) is the send's reply window, the clientHandler's
 * (`server`) is the reply-collection window.
 *
 *     .serverHandler({ server: { onBeforeServerReply: guard }, client: { timeout: 10_000 } })
 */
export type ServerHandlerPointOptions<
  TData = unknown,
  TInput = unknown,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
  // the client side sees the RAW send input (`onReplyFromServer` fires before any server parse), the server side the parsed one
  TInputRaw = TInput,
> = {
  /** Server-read handler options — the reply customizers. Dropped WHOLE from the client bundle. */
  server?: ServerHandlerOptionsServerOnly<TData, TInput, TIdentity, TRoom>
  /** Client-read handler options — the send window and the reply listener. Dropped WHOLE from the server bundle. */
  client?: ServerHandlerOptionsClientOnly<TData, TInputRaw>
}

/** The RESOLVED server-handler options — the groups flattened, defaults → chain → closer → send. Internal shape. */
export type ServerHandlerOptionsResolved<
  TData = unknown,
  TInput = unknown,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
  TInputRaw = TInput,
> = ServerHandlerOptionsClientOnly<TData, TInputRaw> & ServerHandlerOptionsServerOnly<TData, TInput, TIdentity, TRoom>

/**
 * The per-CALL options of `sendToServer` — the handler's CLIENT side: `onBeforeServerReply` / `onAfterServerReply` are
 * declared on the point (chain/closer, server side) and would be silently dead at a client call site. There is no
 * `room` here: a space handler's send is addressed by BINDING the room (`handler(room).sendToServer(...)`) — the one
 * way to name a room, across the whole bound surface.
 */
export type ServerHandlerCallOptions<TData = unknown, TInput = unknown> = ServerHandlerOptionsClientOnly<TData, TInput>

/**
 * What `onBeforeServerReply` receives — the message about to be replied to, with everything the connect established.
 * Typed at the CLOSER (`.serverHandler({...})` knows the handler's input and the channel's identity; a space handler
 * also its room); the chain-level `.serverHandlerOptions()` sees `unknown` everywhere — narrow by the callback's
 * `point`.
 */
export type ServerHandlerBeforeReplyEventProps<
  TInput = unknown,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = Prettify<
  {
    input: TInput
    identity: TIdentity
    connectionId: string
    messageId: string
    point: AnyNiceReadyPoint
    /** every server point of the scope — same as the stage callbacks get (rate-limit via a query, audit via a mutation) */
    points: NiceServerPoints
  } & ([TRoom] extends [undefined] ? unknown : { room: TRoom })
>

/** What `onAfterServerReply` receives — the settled reply: `output` XOR `error` (both undefined = deferred/stream). */
export type ServerHandlerAfterReplyEventProps<
  TInput = unknown,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
  TOutput = unknown,
> = ServerHandlerBeforeReplyEventProps<TInput, TIdentity, TRoom> & {
  /** the reply data — `undefined` on error AND for deferred/stream replies (their answers are produced later) */
  output: TOutput | undefined
  /** set when a guard or the reply threw */
  error: ErrorPoint0 | undefined
}

// THE SOCKET PAYLOAD NAMING LAW — one rule across every socket callback, the word encodes the transport semantics:
//   `input`   — the payload of a CALL addressed to a point (someone called it and gets an answer): the channel connect,
//               a space join (`.joiner`), a serverHandler send (`.serverReply` + its customizers) — query vocabulary.
//   `message` — the payload of a PUSH (`sendToClient` — a broadcast, nobody awaits): `.clientReply`, the
//               `onMessageFromServer` listeners, `iterateMessagesFromServer`.
//   `data`    — the OTHER side's answer to you: `await sendToServer()` resolves with it, `onReplyFromServer.data`,
//               a collected push reply (`{ data, connectionId }`).
//   `output`  — your own execution result in telemetry (`onAfter*` customizers, the `point*` events): `output` XOR
//               `error`, the eventer pair.

/**
 * What the `onMessageFromServer` / `useOnMessageFromServer` listeners receive — the pushed `message` (see the naming
 * law above) plus the connection it rode; a SPACE handler's listener also gets `room` (the room the push addressed).
 * Deliberately NO `data` here: the listeners fire immediately when the message arrives and never wait for (or depend
 * on) the `.clientReply` auto-responder — react to the reply in `.clientReply` itself.
 */
export type ClientHandlerMessageEventProps<
  TMessage = unknown,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = undefined,
> = Prettify<
  {
    /** the message the server pushed (`.sendToClient`) — a clientHandler RECEIVES messages, it takes no input */
    message: TMessage
    connection: AnyClientChannelConnection
    point: AnyNiceReadyPoint
    /**
     * this frame is a [resume](socket#resumable-connections) REPLAY — pushed while the connection was away and re-sent
     * by the resume — carrying ITS stream's verdict; `false` on every live push. The one-line policy for messages only
     * valuable as a complete sequence: `if (replayed && !replayed.gapless) return` (or declare it once — the handler's
     * `resumable: { replay: 'gapless' }` keeps such frames from being sent at all)
     */
    replayed: false | { gapless: boolean }
  } & ([TRoom] extends [undefined] ? unknown : { room: TRoom })
>

/**
 * The CLIENT side of the client-handler options — read by the client's message dispatch; the client call site
 * (`useOnMessageFromServer`) carries its own listener argument instead, so this side stays point-level in practice.
 */
export type ClientHandlerOptionsClientOnly<
  TMessage = unknown,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = undefined,
> = {
  /**
   * Module-level listener — runs on the client on every message of this handler; listeners add up, nothing ever
   * doubles. Client code; cut from the SERVER bundle with its imports.
   */
  onMessageFromServer?: (props: ClientHandlerMessageEventProps<TMessage, TRoom>) => void | Promise<void>
}

/**
 * The SERVER side of the client-handler options — its per-call form is the `replies` argument of `.sendToClient`
 * ({@link ClientHandlerSendReplies} composes this bucket).
 */
export type ClientHandlerOptionsServerOnly = {
  /**
   * the reply-collection window when replies are requested, ms; default `5000`.
   *
   * Read by the server (`.sendToClient` closes its collection window with it); rides the `server` group, cut from the
   * CLIENT bundle with it.
   */
  timeout?: number
}

/**
 * The DECLARATION-ONLY client-handler options — set on the closer (or `.clientHandlerOptions()` up the chain), never
 * per call: a fact about the handler both sides may need, top-level next to the groups (kept on both bundles).
 */
export type ClientHandlerOptionsDeclarationOnly = {
  /**
   * Opt this handler's pushes into the RESUME BUFFERS of its [`resumable`](socket#resumable-connections) channel: the
   * server logs its frames in the TOPIC STREAMS they ride (one copy per room/space/channel/personal stream, however
   * many members) and replays what a resume missed, in the original delivery order — `true` = the default ceiling
   * (128), a number = up to that many of this handler's frames per stream (the stream totals are the channel's
   * `server.resume` ceilings). Without it a push sent into a reconnect gap is dropped (and honestly gaps that stream's
   * `gapless` — the catch-up refetch covers it). Requires `resumable: true` on the channel, and is not allowed on a
   * handler of a `resumable: false` space — both misuses fail at the closer.
   *
   * The OBJECT form adds the replay POLICY next to the ceiling: `replay: 'gapless'` makes the server skip this
   * handler's frames when replaying a stream whose recovery is NOT provably gapless — for messages that are only
   * valuable as a complete sequence (deltas, patches): the client then sees the honest `gapless: false` in
   * `onEnter`/`onConnect` and refetches, without a partial tail first. Default `'always'` — replay whatever survived
   * (any subset of pushes is legal under the at-most-once contract; the per-message `replayed` props carry the same
   * verdict for a per-listener decision). `buffer` is the ceiling (`true` = the default 128).
   *
   * Declaration-only; kept on both bundles.
   */
  resumable?: number | true | { buffer?: number | true; replay?: 'always' | 'gapless' }
}

/**
 * The POINT surface of the client-handler options — `.clientHandlerOptions()` up the chain and the close
 * `.clientHandler({...})`, sides GROUPED (the compiler drops the wrong group whole per bundle), the both-sides options
 * top-level next to the groups. The server side's per-call form is the `replies` argument of `.sendToClient`.
 *
 *     .clientHandler({ server: { timeout: 10_000 }, client: { onMessageFromServer: notify } })
 */
export type ClientHandlerPointOptions<
  TMessage = unknown,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = undefined,
> = ClientHandlerOptionsDeclarationOnly & {
  /** Server-read handler options — the reply-collection window. Dropped WHOLE from the client bundle. */
  server?: ClientHandlerOptionsServerOnly
  /** Client-read handler options — the module-level listener. Dropped WHOLE from the server bundle. */
  client?: ClientHandlerOptionsClientOnly<TMessage, TRoom>
}

/** The RESOLVED client-handler options — the groups flattened, defaults → chain → closer. Internal shape. */
export type ClientHandlerOptionsResolved<
  TMessage = unknown,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = undefined,
> = ClientHandlerOptionsClientOnly<TMessage, TRoom> &
  ClientHandlerOptionsServerOnly &
  ClientHandlerOptionsDeclarationOnly

/**
 * Mongo-style matching over one identity (or room) field. The runtime is sift, so every Mongo operator works — this is
 * the typed common subset. `$where` is banned (functions cannot travel the backplane bus, and it is a hole).
 */
export type IdentityMatcherValue<TValue> =
  | TValue
  | (TValue extends UnknownData ? IdentityMatcher<TValue> : never)
  | {
      $eq?: TValue
      $ne?: TValue
      $gt?: TValue
      $gte?: TValue
      $lt?: TValue
      $lte?: TValue
      $in?: TValue[]
      $nin?: TValue[]
      $exists?: boolean
    }

/**
 * A Mongo-style query over a connection's identity (or a space's room) — what the admin/send targets filter by. When
 * the identity has NO string keys (a connectorless channel's `{}`), the collapsed mapped part is dropped on purpose:
 * `{} & { $or?, $and? }` is not a weak type (the empty `{}` member exempts the intersection), so `sendToClient`'s
 * inferred-tuple target would accept `{ $identity: { anything } }` over an identityless channel. The bare `$or`/`$and`
 * shell IS weak, and the weak-type check rejects a keyed matcher in every position, generic constraint included.
 */
export type IdentityMatcher<TIdentity> = ([keyof TIdentity & string] extends [never]
  ? unknown
  : { [K in keyof TIdentity & string]?: IdentityMatcherValue<TIdentity[K]> }) & {
  $or?: Array<IdentityMatcher<TIdentity>>
  $and?: Array<IdentityMatcher<TIdentity>>
}

/**
 * The target of `channel.kick` / `.refresh` / `.amendIdentity` / the `connections.*` enumerations — parts combine with
 * AND, a bare call means every connection of the channel. The `$`-rule: a bare key is an exact address (`connectionId`
 * — an O(1) lookup), a `$`-key is a Mongo-style selection evaluated by sift (a scan over the live entries). The matcher
 * travels the backplane bus transformer-serialized, each process evaluates it against the parsed identity it holds — so
 * Dates compare fine.
 */
export type ChannelAdminTarget<TIdentity = UnknownData | EmptyObject> = {
  /** exact connection id(s) — the O(1) address */
  connectionId?: string | string[]
  /** Mongo-style query over the connection identity (sift) */
  $identity?: IdentityMatcher<TIdentity>
}

/**
 * The target of `space.kick` / `space.enroll` / the `memberships.*` enumerations — parts combine with AND, a bare call
 * means every membership of the space (except `enroll`, where a target with NO room parts selects among ALL connections
 * of the channel — you are enrolling them into their first room). The `$`-rule: `room` is an exact room snapshot (or an
 * array of them) — full-object equality, the topic/index address; `$room` is a Mongo-style selection over rooms — a
 * flat `$room: { chatId: '5' }` reads as SUBSET semantics (every room whose `chatId` is `'5'`, whatever its other
 * fields), which is why the two are different keys: an exact address and a selection are different operations.
 */
export type SpaceAdminTarget<TRoom = UnknownData | EmptyObject, TIdentity = UnknownData | EmptyObject> = {
  /** exact room snapshot(s) — full-object equality, the hot address */
  room?: TRoom | TRoom[]
  /** Mongo-style query over the space's rooms (sift) — subset semantics for a flat object */
  $room?: IdentityMatcher<TRoom>
  /** exact connection id(s) */
  connectionId?: string | string[]
  /** Mongo-style query over the connection identity (sift) */
  $identity?: IdentityMatcher<TIdentity>
}

/** One live connection as `channel.connections.server.list()` reports it. */
export type ChannelConnectionListed<TIdentity = UnknownData | EmptyObject> = {
  connectionId: string
  identity: TIdentity
  /** per-space rooms this connection holds (space name → parsed rooms) */
  spaces: Record<string, unknown[]>
}

/**
 * One live membership as `space.memberships.server.list()` reports it — the connection plus the rooms it holds in this
 * space.
 */
export type SpaceMembershipListed<TRoom = UnknownData | EmptyObject, TIdentity = UnknownData | EmptyObject> = {
  connectionId: string
  identity: TIdentity
  rooms: TRoom[]
}

/**
 * Options of the `connections.server.*` / `memberships.server.*` enumerations. Every one is a SNAPSHOT OVER A WINDOW:
 * local connections answer immediately, other processes answer over the backplane bus within `timeout` (ms, default
 * 1000) — whoever misses the window is not in the result.
 */
export type EnumerationOptions = {
  /** the gather window, ms; default 1000 */
  timeout?: number
}

/**
 * The `channel.connections.*` namespace — two explicit FLOORS, because "which connections" is two different questions:
 * `server` reads the CLUSTER (every process, over the backplane bus; its `local` sub-floor is this process alone), and
 * `client` reads THIS BROWSER TAB (the live connection facades this tab holds). Neither is a fallback for the other —
 * `server` throws on the client, `client` throws on the server.
 */
export type ChannelConnectionsEnumeration<
  TIdentity = UnknownData | EmptyObject,
  TConnection = AnyClientChannelConnection,
> = {
  /**
   * the server floor — cluster reads over the bus, plus the synchronous `local` sub-floor; see
   * `ServerChannelConnectionsEnumeration`
   */
  server: ServerChannelConnectionsEnumeration<TIdentity>
  /** the client floor — this tab's live connection facades, synchronous; see `ClientChannelConnectionsEnumeration` */
  client: ClientChannelConnectionsEnumeration<TConnection>
}

/**
 * The `channel.connections.server.*` floor — server-side reads over the LIVE connections of the channel, everywhere in
 * the cluster. Targets are the `$`-dictionary (AND-combined; bare = every connection). All three are snapshots over a
 * window (see `EnumerationOptions`): `count` travels the bus as numbers only, `list` resolves with the merged array at
 * window close, `forEach` streams items as they arrive — with an `onConnection` callback it resolves with the processed
 * count, without one it is an async iterable.
 */
export type ServerChannelConnectionsEnumeration<TIdentity = UnknownData | EmptyObject> = {
  count: (target?: ChannelAdminTarget<TIdentity>, options?: EnumerationOptions) => Promise<number>
  list: (
    target?: ChannelAdminTarget<TIdentity>,
    options?: EnumerationOptions,
  ) => Promise<Array<ChannelConnectionListed<TIdentity>>>
  // two overloads, not a conditional return — the callback form must contextually type a destructured
  // `({ connectionId }) => …` param, which a `TOptions extends … = undefined` conditional cannot
  forEach: {
    (
      target: ChannelAdminTarget<TIdentity> | undefined,
      options: EnumerationOptions & {
        /** process each connection as it arrives — the streaming form resolves with the processed count */
        onConnection: (connection: ChannelConnectionListed<TIdentity>) => void | Promise<void>
      },
    ): Promise<number>
    (
      target?: ChannelAdminTarget<TIdentity>,
      options?: EnumerationOptions & { onConnection?: undefined },
    ): AsyncIterable<ChannelConnectionListed<TIdentity>>
  }
  /** the synchronous local sub-floor — see `LocalChannelConnectionsEnumeration` */
  local: LocalChannelConnectionsEnumeration<TIdentity>
}

/**
 * The SYNCHRONOUS local sub-floor of `channel.connections.server.*` — this process's matching slice only, read straight
 * from the room index with no bus, no gather window, no promise. Same `$`-dictionary targets and item shape as the
 * cluster floor; `list` items are `{ connectionId, identity, spaces }` (the per-space rooms are parsed here, cheaply —
 * every space transformer lives on this process). For truth across every process use the async `count` / `list`.
 */
export type LocalChannelConnectionsEnumeration<TIdentity = UnknownData | EmptyObject> = {
  /** matching local connections — a plain number, this process only */
  count: (target?: ChannelAdminTarget<TIdentity>) => number
  /** matching local connections as `{ connectionId, identity, spaces }` — this process only */
  list: (target?: ChannelAdminTarget<TIdentity>) => Array<ChannelConnectionListed<TIdentity>>
}

/**
 * The `channel.connections.client.*` floor — THIS BROWSER TAB's live connections of the channel, as the very facades
 * `connect` / `useConnection` / `getConnection` hand out (`status`, `input`, `id`, `disconnect`). Synchronous, no
 * promises, no targets: a bare call is every live connection of this channel on this client. A hold-less read — it
 * connects nothing and holds nothing.
 *
 * Client-side — a runtime error on the server (nothing is ever connected there; the cluster picture is
 * `connections.server.*`).
 */
export type ClientChannelConnectionsEnumeration<TConnection = AnyClientChannelConnection> = {
  /** how many live connections of this channel this client holds */
  count: () => number
  /** the live connection facades of this channel on this client */
  list: () => TConnection[]
}

/**
 * The `space.memberships.*` namespace — the same two floors as `channel.connections.*`, one level down: `server` reads
 * the cluster's memberships (`{ connectionId, identity, rooms }` items), `client` reads this browser tab's live
 * membership facades.
 */
export type SpaceMembershipsEnumeration<
  TRoom extends UnknownData | EmptyObject | UndefinedRoom,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity,
  TMembership = AnyClientSpaceMembership,
> = {
  /** the server floor — cluster reads over the bus, plus the synchronous `local` sub-floor */
  server: ServerSpaceMembershipsEnumeration<TRoom, TIdentity>
  /** the client floor — this tab's live membership facades, synchronous (enrolled ones included) */
  client: ClientSpaceMembershipsEnumeration<TMembership>
}

/**
 * The `space.memberships.server.*` floor — server-side reads over the LIVE memberships of the space. Same shape as
 * `channel.connections.server.*`, one level down: items are memberships (`{ connectionId, identity, rooms }`), the
 * target adds `room` (exact snapshot(s)) and `$room` (a sift selection over rooms).
 */
export type ServerSpaceMembershipsEnumeration<
  TRoom extends UnknownData | EmptyObject | UndefinedRoom,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity,
> = {
  count: (target?: SpaceAdminTarget<TRoom, TIdentity>, options?: EnumerationOptions) => Promise<number>
  list: (
    target?: SpaceAdminTarget<TRoom, TIdentity>,
    options?: EnumerationOptions,
  ) => Promise<Array<SpaceMembershipListed<TRoom, TIdentity>>>
  // two overloads, not a conditional return — see ChannelConnectionsEnumeration.forEach
  forEach: {
    (
      target: SpaceAdminTarget<TRoom, TIdentity> | undefined,
      options: EnumerationOptions & {
        /** process each membership as it arrives — the streaming form resolves with the processed count */
        onMembership: (membership: SpaceMembershipListed<TRoom, TIdentity>) => void | Promise<void>
      },
    ): Promise<number>
    (
      target?: SpaceAdminTarget<TRoom, TIdentity>,
      options?: EnumerationOptions & { onMembership?: undefined },
    ): AsyncIterable<SpaceMembershipListed<TRoom, TIdentity>>
  }
  /** the synchronous local sub-floor — see `LocalSpaceMembershipsEnumeration` */
  local: LocalSpaceMembershipsEnumeration<TRoom, TIdentity>
}

/**
 * The SYNCHRONOUS local sub-floor of `space.memberships.server.*` — this process's matching slice only, read straight
 * from the room index with no bus, no gather window, no promise. Same `$`-dictionary targets and item shape as the
 * cluster floor; `rooms` is the flat, deduped set of room snapshots the matching local memberships hold (typed as
 * `TRoom`) — the one way a join guard or callback reads a connection's current rooms: `memberships.server.local.rooms({
 * connectionId })`.
 *
 * In the join path (`.joiner` / `.enroller` / the join guards) the local slice is by construction the FULL truth about
 * the connection — a join always runs on the socket's own process. Anywhere else it is local only; for truth across
 * every process use the async `count` / `list`.
 */
export type LocalSpaceMembershipsEnumeration<
  TRoom extends UnknownData | EmptyObject | UndefinedRoom,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity,
> = {
  /** matching local memberships — a plain number, this process only */
  count: (target?: SpaceAdminTarget<TRoom, TIdentity>) => number
  /** matching local memberships as `{ connectionId, identity, rooms }` — this process only */
  list: (target?: SpaceAdminTarget<TRoom, TIdentity>) => Array<SpaceMembershipListed<TRoom, TIdentity>>
  /** the flat, deduped rooms the matching local memberships hold — the join guard's `{ connectionId }` room read */
  rooms: (target?: SpaceAdminTarget<TRoom, TIdentity>) => TRoom[]
}

/**
 * The `space.memberships.client.*` floor — THIS BROWSER TAB's live memberships of the space, as the very facades `join`
 * / `useMembership` / `getMembership` hand out (`status`, `rooms`, `connection`, `leave`). Synchronous, no promises, no
 * targets: a bare call is every live membership of this space on this client — **enrolled memberships included**, which
 * is how a space with no `.joiner` (server-enrolled only, so `getMembership` has no input to look up) is read one by
 * one.
 *
 * Client-side — a runtime error on the server (nothing is ever joined there; the cluster picture is
 * `memberships.server.*`).
 */
export type ClientSpaceMembershipsEnumeration<TMembership = AnyClientSpaceMembership> = {
  /** how many live memberships of this space this client holds */
  count: () => number
  /** the live membership facades of this space on this client, enrolled ones included */
  list: () => TMembership[]
}

/** One collected `.clientReply` answer — what the `replies` iterable/array/`onReply` hand out per client. */
export type ClientHandlerReply<TData = unknown> = {
  /** the client's reply — validated by the `.clientReply` schema when one is given */
  data: TData
  connectionId: string
}

// CHANNEL handler push target — nothing/`{}` = every connection of the channel (the `*all*` topic); parts AND-combine.
// Room keys deliberately do NOT exist here (room targeting lives on space handlers) — conditional assembly keeps the
// autocomplete clean, `Prettify` flattens so excess-property checks still fire.
type ClientHandlerChannelTarget<TIdentity> = {
  /** exact connection id(s) — the O(1) address */
  connectionId?: string | string[]
  /** Mongo-style query over the connection identity (sift) — a scan, not the hot path */
  $identity?: IdentityMatcher<TIdentity>
  /** connection id(s) this push must not wake */
  except?: string | string[]
}

// SPACE handler push target — nothing/`{}` = every member of the space (the space-wide topic); parts AND-combine.
// The `$`-rule holds here like everywhere: a bare key is an exact address (the topic hot path), a `$`-key is an
// explicit sift scan — `$room` costs what `$identity` costs (every process filters its local index).
type ClientHandlerSpaceTarget<TRoom, TIdentity> = {
  /** exact room snapshot(s) — the topic address, the hot path */
  room?: TRoom | TRoom[]
  /** Mongo-style query over the space's rooms (sift) — an explicit scan, subset semantics for a flat object */
  $room?: IdentityMatcher<TRoom>
  /** exact connection id(s) — AND-combined with `room` (the connection must be in the room) */
  connectionId?: string | string[]
  /** Mongo-style query over the connection identity (sift) — a scan, not the hot path */
  $identity?: IdentityMatcher<TIdentity>
  /** connection id(s) or room snapshot(s) (of this same space) this push must not reach */
  except?: string | string[] | TRoom | TRoom[]
}

/**
 * The `target` of server-side `.sendToClient(message, target?, replies?)` — the watershed: `TRoom = undefined` marks a
 * CHANNEL handler (addresses connections), a real room marks a SPACE handler (addresses rooms). `undefined`/`{}` =
 * everyone in the handler's scope (channel-wide / space-wide).
 */
export type ClientHandlerSendTarget<TRoom = undefined, TIdentity = EmptyObject> = [TRoom] extends [undefined]
  ? Prettify<ClientHandlerChannelTarget<TIdentity>>
  : Prettify<ClientHandlerSpaceTarget<TRoom, TIdentity>>

/**
 * The `replies` argument of `.sendToClient(message, target?, replies?)` — it exists ONLY when the handler declares
 * `.clientReply`. `true` = bare collection (an async iterable of replies); the object form tunes the window: `timeout`
 * (ms, default 5000), `onReply` (streamed into a callback next to the send), `waitForAll` (resolve with the full array
 * when the window closes). Without this argument no replies are collected.
 */
export type ClientHandlerSendReplies<TData = unknown> = true | ClientHandlerSendRepliesObject<TData>

/** The object form of the `replies` argument — the collect window's options. */
export type ClientHandlerSendRepliesObject<TData = unknown> = ClientHandlerOptionsServerOnly & {
  /** stream replies into a callback as they arrive — runs on the server, next to the send */
  onReply?: (reply: ClientHandlerReply<TData>) => void | Promise<void>
  /** resolve with the full reply array when the window closes */
  waitForAll?: boolean
}

// the message-first HEAD of the tuple: message requiredness follows the `.serverSend` schema, `target` trails. These
// are FIXED parameter slots on purpose — an inferred whole-tuple type parameter would cost every literal its
// excess-property check (freshness dies on inference), and a mistyped room/target key must stay a compile error.
export type ClientHandlerSendHeadArgs<TRoom, TInputRaw, TIdentity> =
  IsEmptyObjectSpecial<TInputRaw> extends true
    ? [message?: undefined | void | EmptyObjectOnly, target?: ClientHandlerSendTarget<TRoom, TIdentity>]
    : IsObjectOptional<TInputRaw> extends true
      ? [message?: TInputRaw, target?: ClientHandlerSendTarget<TRoom, TIdentity>]
      : [message: TInputRaw, target?: ClientHandlerSendTarget<TRoom, TIdentity>]

/**
 * The call surface of server-side `.sendToClient(message, target?, replies?)` — four OVERLOADS instead of one inferred
 * tuple, deliberately: fixed parameter slots keep the excess-property check on every fresh literal (message, target,
 * replies alike) and keep `onReply`'s argument contextually typed, while the picked overload is what types the return
 * (no replies → `void`; `true` → the async iterable; `waitForAll: true` → the array promise; the object form without it
 * → a promise that resolves when the window closes). The replies-taking overloads exist only when `.clientReply` is
 * declared (`TData` real) — no clientReply, no argument.
 */
export type ClientHandlerSendFn<
  TRoom extends UnknownData | EmptyObject | UndefinedRoom,
  TInputRaw = EmptyObject,
  TData = unknown,
  TIdentity = EmptyObject,
> = {
  (...args: [...head: ClientHandlerSendHeadArgs<TRoom, TInputRaw, TIdentity>, replies?: undefined]): void
  (
    ...args: [TData] extends [undefined]
      ? never
      : [...head: ClientHandlerSendHeadArgs<TRoom, TInputRaw, TIdentity>, replies?: true]
  ): AsyncIterable<ClientHandlerReply<TData>>
  (
    ...args: [TData] extends [undefined]
      ? never
      : [
          ...head: ClientHandlerSendHeadArgs<TRoom, TInputRaw, TIdentity>,
          replies?: ClientHandlerSendRepliesObject<TData> & { waitForAll: true },
        ]
  ): Promise<Array<ClientHandlerReply<TData>>>
  (
    ...args: [TData] extends [undefined]
      ? never
      : [
          ...head: ClientHandlerSendHeadArgs<TRoom, TInputRaw, TIdentity>,
          replies?: ClientHandlerSendRepliesObject<TData>,
        ]
  ): Promise<void>
}

/**
 * The imperative reply — in `.serverReply<T>()`'s args only (the explicit generic names the type, so the imperative
 * call can be typed at all: a call argument cannot drive inference the way a `return` does). Call it once: the envelope
 * leaves for the client immediately and the callback keeps running; a later `return` is ignored. `reply(new
 * Error(...))` rejects the client's send — the imperative `throw`; with `undefined` in the declared type
 * (`.serverReply<undefined>()`) `reply(undefined)` is the early ack.
 */
export type ServerReplyImperativeFn<TReply> = (data: TReply | Error) => void

/**
 * What `.serverReply` receives: the parsed message input, the connection's identity, and everything the connect
 * established. A SPACE handler also gets `room` (the concrete room this message addresses); a CHANNEL handler (`TRoom =
 * undefined`) has no room prop. With the explicit reply generic (`.serverReply<T>(...)`) it also gets the imperative
 * {@link ServerReplyImperativeFn | `reply`}.
 */
export type ServerReplyProps<
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TExplicitReply,
> = Prettify<
  {
    input: InputParsed<TServerInputSchema>
    identity: TIdentity
    /** the ephemeral connection id (a new one per reconnect) — address rooms, not cids, for anything long-lived */
    connectionId: string
    /** this message's server-generated id — correlates the `pointHandler*` events and logs */
    messageId: string
    points: NiceServerPoints
  } & ([TRoom] extends [undefined] ? unknown : { room: TRoom }) &
    ([TExplicitReply] extends [never]
      ? unknown
      : {
          /** answer now and keep running — the envelope leaves immediately, a later `return` is ignored */
          reply: ServerReplyImperativeFn<TExplicitReply>
        })
>

export type ServerReplyFn<
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TReply extends UnknownData,
> = (props: ServerReplyProps<TIdentity, TRoom, TServerInputSchema, never>) => Promise<TReply> | TReply

/**
 * The `.serverReply` chain constraint: the inferred form answers with its return; with the explicit reply generic the
 * return narrows to the named type (or nothing — the imperative `reply` may have answered already). A generator
 * callback is a type error by construction — the server streams to clients through a `.subscription()` clientHandler's
 * pushes, never through a reply.
 */
export type ServerReplyChainFn<
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TExplicitReply,
> = (
  props: ServerReplyProps<TIdentity, TRoom, TServerInputSchema, TExplicitReply>,
) => [TExplicitReply] extends [never]
  ? Promise<UnknownData> | UnknownData
  : Promise<TExplicitReply | void> | TExplicitReply | void

/**
 * What `.clientReply` receives — client side, so the connection is the client connection object. `message` is the
 * server push it answers (a clientHandler receives messages, not input). A SPACE handler also gets `room` (the room
 * this message addresses); a CHANNEL handler (`TRoom = undefined`) has no room prop.
 */
export type ClientReplyProps<
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TError extends ErrorPoint0,
> = Prettify<
  {
    message: InputParsed<TClientInputSchema>
    connection: ClientChannelConnection<TChannelInput, TError>
    /**
     * this frame is a resume REPLAY (see {@link ClientHandlerMessageEventProps.replayed}) — its collect window is long
     * closed and the server drops the answer, so a heavy responder may skip the work
     */
    replayed: false | { gapless: boolean }
  } & ([TRoom] extends [undefined] ? unknown : { room: TRoom })
>

export type ClientReplyFn<
  TChannelInput extends UnknownData | EmptyObject | UndefinedChannelInput,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TError extends ErrorPoint0,
  TReply extends UnknownData,
> = (props: ClientReplyProps<TChannelInput, TRoom, TClientInputSchema, TError>) => Promise<TReply> | TReply

/**
 * What a space's `.joiner` receives: its parsed input, the channel connection's frozen identity (authentication already
 * happened on the channel — no request here), and the bare `connectionId` string. Server-side; runs over the socket per
 * join.
 */
export type JoinerProps<
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
> = {
  input: InputParsed<TServerInputSchema>
  identity: TIdentity
  /** the ephemeral connection id (a new one per reconnect) — address rooms, not cids, for anything long-lived */
  connectionId: string
  points: NiceServerPoints
}

/**
 * A space's `.joiner`: which rooms this client enters. Returns one room snapshot, an ARRAY of snapshots (enters several
 * at once), an empty array or `undefined`/nothing (a clean deny) — CHECKED against the `TRoom` the space's opener
 * declared (`channel.lets<{ chatId: string }>('space', 'chat')`), never declared by the callback — the room the chain
 * carries downstream is the opener's, and the callback's return is only ever compared with it, keys included
 * (`AssertRoomNotWider`). Throw to fail the join (the client sees a `joinErr`).
 */
export type JoinerFn<
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  // the room slot mirrors the chain's room slot exactly — same union, so a chain hands its room over UNCHANGED. A
  // narrower `extends UnknownData` here would force the call site to widen it (`TRoom & UnknownData`), and the index
  // signature that rides along makes every key look declared — `{ chatId, extra }` would pass as a `{ chatId: string }`
  // room, and an extra key means a DIFFERENT room: another pub/sub topic, addressed past
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = UnknownData,
> = (
  props: JoinerProps<TIdentity, TServerInputSchema>,
) => Promise<TRoom | TRoom[] | undefined | void> | TRoom | TRoom[] | undefined | void

/**
 * What a space's `.enroller` receives — the server-side auto-enrollment run at connection setup (both connect paths:
 * claim and upgrade). There is no input (the client sent nothing — the server enrolls on its own): just the
 * connection's frozen identity, its id, and the server points. To read the connection's current rooms, use the
 * synchronous `local` sub-floor — `thisSpace.memberships.server.local.rooms({ connectionId })` (earlier enrollments of
 * the same connect are already in).
 */
export type EnrollerProps<TIdentity = UnknownData | EmptyObject> = {
  identity: TIdentity
  /** the ephemeral connection id (a new one per reconnect) — address rooms, not cids, for anything long-lived */
  connectionId: string
  points: NiceServerPoints
}

/**
 * A space's `.enroller`: which rooms the server puts a fresh connection into WITHOUT the client joining — the hot
 * personal-push room (`({ identity }) => ({ userId: identity.userId })`). Returns one room snapshot, an array, or
 * `undefined`/nothing (enroll into nothing) — checked against the opener-declared `TRoom`, extra keys included, like
 * `.joiner`. Runs on every connection setup of the space's channel; the client learns its enrollments from the connect
 * confirmation and holds them without holds — they live with the connection, and a client `leave()` drops their rooms
 * until the next connection setup runs this callback again (a permanent opt-out is data the enroller reads).
 */
export type EnrollerFn<
  TIdentity = UnknownData | EmptyObject,
  // the chain's room slot, unchanged — same reason as `JoinerFn`: nothing may widen the return position
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = UnknownData,
> = (
  props: EnrollerProps<TIdentity>,
) => Promise<TRoom | TRoom[] | undefined | void> | TRoom | TRoom[] | undefined | void

/**
 * The room a `.joiner`/`.enroller` returned carries a key the space never declared. Nothing else catches it: an object
 * with extra keys IS structurally a `{ chatId: string }`, and TypeScript's excess-property check does not fire on a
 * callback's return in any version (5.9, 6.0, 7.0 alike — the literal's freshness is gone by the time the callback's
 * own return type is compared). So the keys are compared here, against the room the OPENER declared. It matters because
 * the room snapshot IS the room's address: `{ chatId: 'c1', extra: 1 }` is a different pub/sub topic than `{ chatId:
 * 'c1' }`, so the client that joined it would never hear a `sendToClient(…, { room: { chatId: 'c1' } })`.
 */
export type AssertRoomNotWider<TReturnedRoom, TRoom> =
  IsAny<TReturnedRoom> extends true
    ? unknown
    : [Exclude<RoomKeys<TReturnedRoom>, RoomKeys<TRoom>>] extends [never]
      ? unknown
      : ShowError<`This room has keys the space never declared — declare them at the opener (.lets<{ … }>('space', …)); an extra key makes it a DIFFERENT room`>

/**
 * The keys a room shape can carry, DISTRIBUTED: over a union room every member's keys count (a bare `keyof` of a union
 * is the INTERSECTION of the members' keys — it would call every branch's own key an extra one), and a `never` room —
 * what an always-throwing joiner returns — carries no keys at all instead of `keyof never`'s every key.
 */
type RoomKeys<TRoom> = TRoom extends unknown ? keyof TRoom : never

/**
 * `amendIdentity` needs an identity with DECLARED keys to patch. A connectorless channel's identity is the strict `{}`
 * — with nothing declared, `Partial<Record<never, never>>` is `{}` and would happily take ANY patch object, growing the
 * runtime identity behind the type's back. The verdict intersects the target parameter, so the failure lands on the
 * argument; the runtime twin is the `_connectorDeclared` guard inside `amendIdentity` itself.
 */
export type AssertIdentityAmendable<TIdentity> = [keyof TIdentity] extends [never]
  ? ShowError<`amendIdentity needs a connector-declared identity — a connectorless channel has nothing to amend`>
  : unknown

/**
 * A space takes at most one `.enroller` — the slot-marker guard (the marker rides the client-loader slot, unused on
 * spaces).
 */
export type AssertEnrollerNotDefined<TClientLoaderOutput> = [TClientLoaderOutput] extends [UndefinedLoaderOutput]
  ? unknown
  : ShowError<`This space already has an .enroller — a space takes at most one`>

/**
 * What the join guards receive — the join about to run (`onBeforeJoiner`) and the settled join (`onAfterJoiner`). Typed
 * at the closer (`.space({...})` knows the space's input, identity and room); the chain-level `.spaceOptions()` sees
 * `unknown` everywhere — narrow by the callback's `point`.
 */
export type SpaceBeforeJoinerEventProps<
  TInput = unknown,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
> = {
  input: TInput
  identity: TIdentity
  connectionId: string
  point: AnyNiceReadyPoint
  /** every server point of the scope — same as the stage callbacks get (rate-limit via a query, audit via a mutation) */
  points: NiceServerPoints
}

/** What `onAfterJoiner` receives — the settled join: `output` (the admitted rooms) XOR `error`. */
export type SpaceAfterJoinerEventProps<
  TInput = unknown,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = SpaceBeforeJoinerEventProps<TInput, TIdentity> & {
  /** the rooms the joiner admitted (`[]` = a clean deny); `undefined` when a guard or the joiner threw */
  output: TRoom[] | undefined
  /** set when a guard or the joiner threw */
  error: ErrorPoint0 | undefined
}

/**
 * The CLIENT side of the space options — read by the client's membership runtime, so the join call sites
 * (`useMembership` / `join` / `<space.Membership>`) may override them per call.
 */
export type SpaceOptionsClientOnly<TMembership = AnyClientSpaceMembership> = {
  /**
   * ms a membership outlives its last hold (survives route transitions); default `1000` — the membership twin of the
   * channel `linger`. Overridable per call site. Read by the client; rides the `client` group, cut from the SERVER
   * bundle with it.
   */
  linger?: number
  /**
   * Runs on the client on EVERY landed join — the first and every replay (a reconnect, a space-kick comeback, a
   * [resume](socket#resumable-connections)); the props' `membershipIndex` tells the first (`0`) from a repeat (`> 0`),
   * and `resumed`/`gapless` carry the entry markers. The room-scoped catch-up is one condition: `if (!gapless)
   * refetch()` — a resume whose buffer covered the gap proves the refetch redundant. Client code; cut from the SERVER
   * bundle with its imports.
   */
  onEnter?: (props: SpaceMembershipEventProps<TMembership>) => void | Promise<void>
  /**
   * Runs on the client when a previously-joined membership closes (a `leave()`, the connection dying, a kick). An
   * ENROLLED membership has no lifecycle of its own — no `onEnter` ever fired for it, and its connection dying stays
   * silent — with one exception: an explicit `leave()` on it fires this, like any voluntary leave. Client code; cut
   * from the SERVER bundle with its imports.
   */
  onLeave?: (props: SpaceMembershipEventProps<TMembership>) => void | Promise<void>
}

/**
 * The SERVER side of the space options — declared on the point (chain / closer) only; no client call site reads them.
 */
export type SpaceOptionsServerOnly<
  TInput = unknown,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = {
  /**
   * rooms of this space one connection may be in, however they got there (a join, the `.enroller`, `space.enroll`);
   * default `256`, `Infinity` opts out. Respected on EVERY write path: the join that would exceed it fails with
   * `POINT0_SOCKET_MAX_ROOMS`, a connect whose enroller exceeds it fails the connection setup, an over-cap
   * `space.enroll` skips that connection with a warning. Finer policy (per-user quotas, rate limits) belongs in
   * `onBeforeJoiner`.
   *
   * Read by the server; cut from the CLIENT bundle.
   */
  maxRooms?: number
  /**
   * the resume buffer ceilings for THIS space's streams (its rooms and its space-wide stream) — overrides the channel's
   * `server.resume` ceilings; the keys are optional and fall back per key. Only meaningful on a space that takes part
   * in the resume (`resumable: true` channel, no `resumable: false` opt-out) — the `.space()` closer refuses it
   * otherwise.
   *
   * Read by the server; cut from the CLIENT bundle.
   */
  resume?: SpaceResumeOptions
  /**
   * Guard BEFORE the join — runs on the server per incoming join, after the space's `.input` parse and before
   * `.joiner`. Throw a typed error and the client's join fails with it (`joinErr`), the joiner never runs — join rate
   * limits and room-count caps live here (pair it with the synchronous `memberships.server.local.rooms({ connectionId
   * })` or the cluster-wide `memberships.server.count`). Callbacks stack chain → closer and run in order. Server code;
   * cut from the CLIENT bundle with its imports.
   */
  onBeforeJoiner?: (props: SpaceBeforeJoinerEventProps<TInput, TIdentity>) => void | Promise<void>
  /**
   * Runs on the server AFTER the join settles — audit and metrics. Receives `output` (the admitted rooms) and `error`
   * (set when a guard or the joiner threw). Its own throw is logged and never affects the join. Callbacks stack chain →
   * closer and run in order. Server code; cut from the CLIENT bundle with its imports.
   */
  onAfterJoiner?: (props: SpaceAfterJoinerEventProps<TInput, TIdentity, TRoom>) => void | Promise<void>
}

/**
 * The DECLARATION-ONLY space options — set up the chain (`.spaceOptions()`) or on the closer `.space({...})`, never per
 * call site: both sides must agree on them statically, so they stay top-level next to the groups and survive both
 * bundles (like the channel's `preventTransformer`).
 */
export type SpaceOptionsDeclarationOnly = {
  /**
   * `false` opts this space OUT of a [`resumable`](socket#resumable-connections) channel's resume: its rooms are NOT
   * written into the connection passport and NOT restored by a resume — the client re-joins them itself from its own
   * state (a normal join, the joiner re-judges). For spaces whose rooms change fast (live-query-style rooms derived
   * from client state) the write-through would hammer the backplane for rooms the client re-derives anyway. Default:
   * the channel's `resumable`. Requires `resumable: true` on the channel (a non-resumable channel has no resume to opt
   * out of) and refuses `.enroller` (a resume would silently drop the enrollments — they re-run only on a full
   * connect); both fail at the `.space()` closer.
   *
   * Read by both sides; kept on both bundles.
   */
  resumable?: false
}

/**
 * The POINT surface of the space options — `.spaceOptions()` up the chain and the close `.space({...})`, sides GROUPED
 * (the compiler drops the wrong group whole per bundle), the both-sides options top-level next to the groups. The join
 * call sites are the flat {@link ExtraUseMembershipOptions}.
 *
 *     .space({ server: { maxRooms: 8, onBeforeJoiner: guard }, client: { onEnter: refetch } })
 */
export type SpacePointOptions<
  TInput = unknown,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
  TMembership = AnyClientSpaceMembership,
> = SpaceOptionsDeclarationOnly & {
  /** Server-read space options — the room cap and the join guards. Dropped WHOLE from the client bundle. */
  server?: SpaceOptionsServerOnly<TInput, TIdentity, TRoom>
  /** Client-read space options — the membership linger and lifecycle. Dropped WHOLE from the server bundle. */
  client?: SpaceOptionsClientOnly<TMembership>
}

/** The RESOLVED space options — the groups flattened, defaults → chain → closer → call site. Internal shape. */
export type SpaceOptionsResolved<
  TInput = unknown,
  TIdentity extends UnknownData | EmptyObject | UndefinedIdentity = any,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = any,
> = SpaceOptionsClientOnly & SpaceOptionsServerOnly<TInput, TIdentity, TRoom> & SpaceOptionsDeclarationOnly

/**
 * Which non-ready states hold the children back on `<Connection>` / `<Membership>` / a channel/space `.with` — the
 * render shows the mountable's own loading/error instead of the children while the named aspect is unsettled. `true` ≡
 * `{ loading: true, error: true }`, `false` ≡ neither (render through everything), an object OVERRIDES only the named
 * aspects — an unnamed key keeps its default, like every partial options object in point0. Default: `{ loading: false,
 * error: true }` — the subtree renders progressively (the handlers inside wait for the connect on their own), but a
 * failed connect/join still surfaces; turning errors off takes an explicit `error: false` (or `false`). NOTE: unrelated
 * to a query `.with`'s `resolve` (which spreads the resolved data into props) — this only gates the render.
 */
export type Gate = boolean | { loading?: boolean; error?: boolean }

/**
 * Options for `space.useMembership` / `space.join` / `<space.Membership>` — the space's CLIENT side plus `enabled`
 * (gates joining, like a disabled query).
 */
export type ExtraUseMembershipOptions<TMembership = AnyClientSpaceMembership> = SpaceOptionsClientOnly<TMembership> & {
  /** call-site only — join or not; default `true`. Read by the client. */
  enabled?: boolean
}

/** The props of `<space.Membership>` — the join input (requiredness follows the space's schema), options, gating. */
export type SpaceMembershipComponentProps<TInputRaw, TOptions> = (IsEmptyObjectSpecial<TInputRaw> extends true
  ? { input?: EmptyObjectOnly | undefined }
  : IsObjectOptional<TInputRaw> extends true
    ? { input?: TInputRaw }
    : { input: TInputRaw }) & {
  options?: TOptions
  /**
   * which non-ready states gate the children — default `{ loading: false, error: true }`: the children render right
   * away while joining (the handlers inside wait for the join on their own) and the chain's `.error()` still shows on a
   * failed join. `gate={false}` renders through everything, `gate={true}` waits on both, an object overrides only the
   * named aspects (e.g. `gate={{ loading: true }}` also shows `.loading()` while joining; errors stay surfaced unless
   * explicitly `error: false`).
   */
  gate?: Gate
  /** on-the-spot override of the gate's loading component — wins over the chain's `.loading()` for THIS mount */
  LoadingComponent?: LoadingComponentType<any>
  /** on-the-spot override of the gate's error component — wins over the chain's `.error()` for THIS mount */
  ErrorComponent?: ErrorComponentType<any, ErrorPoint0>
  children?: React.ReactNode
}

/**
 * An `onMessageFromServer` / `useOnMessageFromServer` listener — receives {@link ClientHandlerMessageEventProps}
 * (`message` + `connection`, a space handler's adds `room`). Fires immediately on arrival, decoupled from the
 * `.clientReply` auto-responder; a throw only logs.
 */
export type ClientHandlerListenerFn<
  TMessage = unknown,
  TRoom extends UnknownData | EmptyObject | UndefinedRoom = undefined,
> = (props: ClientHandlerMessageEventProps<TMessage, TRoom>) => void | Promise<void>

/**
 * The message-input-first argument tuples of a serverHandler's client surface (`sendToServer`, the connection-query
 * hooks) — the input requiredness follows the `.clientSend` schema. The connection is never an argument: bind one by
 * CALLING the handler (`handler(connection).sendToServer(input)`), or go bare and let the ambient
 * `<channel.Connection>` / the single live connection resolve it.
 */
export type ServerHandlerSendArgs<TInputRaw, TOptions> =
  IsEmptyObjectSpecial<TInputRaw> extends true
    ? [input?: undefined | void | EmptyObjectOnly, options?: TOptions]
    : IsObjectOptional<TInputRaw> extends true
      ? [input?: TInputRaw, options?: TOptions]
      : [input: TInputRaw, options?: TOptions]

/** The input-only argument tuple of the imperative connection-query methods — requiredness follows the schema. */
export type ServerHandlerInputArgs<TInputRaw> =
  IsEmptyObjectSpecial<TInputRaw> extends true
    ? [input?: undefined | void | EmptyObjectOnly]
    : IsObjectOptional<TInputRaw> extends true
      ? [input?: TInputRaw]
      : [input: TInputRaw]

/** Props of `<channel.Connection>` — `input` requiredness follows the channel's input schema. */
export type ChannelConnectionComponentProps<TInputRaw, TOptions> = (IsEmptyObjectSpecial<TInputRaw> extends true
  ? { input?: EmptyObjectOnly | undefined }
  : IsObjectOptional<TInputRaw> extends true
    ? { input?: TInputRaw }
    : { input: TInputRaw }) & {
  options?: TOptions
  /**
   * which non-ready states gate the children — default `{ loading: false, error: true }`: the children render right
   * away while connecting (the handlers inside wait for the connect on their own) and the chain's `.error()` still
   * shows on a failed connect. `gate={false}` renders through everything, `gate={true}` waits on both, an object
   * overrides only the named aspects (e.g. `gate={{ loading: true }}` also shows `.loading()` while connecting; errors
   * stay surfaced unless explicitly `error: false`).
   */
  gate?: Gate
  /** on-the-spot override of the gate's loading component — wins over the chain's `.loading()` for THIS mount */
  LoadingComponent?: LoadingComponentType<any>
  /** on-the-spot override of the gate's error component — wins over the chain's `.error()` for THIS mount */
  ErrorComponent?: ErrorComponentType<any, ErrorPoint0>
  children?: React.ReactNode
}

/** The `.clientReply` callback return must be what the schema accepts — checked inside `.clientReply` itself. */
export type AssertClientReplyMatchesSchema<
  TReplyFn extends (...args: any[]) => any,
  TReplySchema,
> = TReplySchema extends InputSchema
  ? Awaited<ReturnType<TReplyFn>> extends InputRaw<TReplySchema>
    ? unknown
    : ShowError<`The .clientReply callback return does not match the schema it is validated with`>
  : unknown

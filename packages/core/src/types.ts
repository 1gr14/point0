import type {
  AnyLocation,
  AnyRoute,
  DescendantLocation,
  ExactLocation,
  Extended,
  ParamsInput,
  ParamsOutput,
  UnknownSearchInput,
} from '@devp0nt/route0'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type {
  InfiniteData,
  UseInfiniteQueryOptions as OriginalUseInfiniteQueryOptions,
  UseQueryOptions as OriginalUseQueryOptions,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query'
import type { ResponseEffectsSetHelper, ResponseEffectsValues } from './effects.js'
import type { ErrorPoint0 } from './error.js'
import type { EmptyProps, Props, QueriesDefinitions } from './mountable.js'
import type { Point0 } from './point0.js'
import type { Request0, WideRequestMethod } from './request0.js'
import type { GetByPath, SetByPath } from './utils.js'

// basic

export type EmptyObject = Record<never, never>

export type UndefinedMethod = undefined
export type PointName = string
export type UndefinedPointName = undefined
export type PointsScope = string
export type UndefinedPointsScope = undefined

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
export type LoaderOutput = Data | Response
export type UndefinedLoaderOutput = undefined
export type MapperOutput = Data
export type UndefinedMapperOutput = undefined
export type CtxExposedKeys = string
export type UndefinedCtxExposedKeys = undefined

export type QueryResultType = 'query' | 'infiniteQuery'
export type UndefinedQueryResultType = undefined
export type QueryResultTypeOrNever<TQueryResultType extends QueryResultType | UndefinedQueryResultType> =
  TQueryResultType extends QueryResultType ? TQueryResultType : never

// export type QueryKey = readonly [string, ...string[]]
export type QueryKey = readonly [
  point0: 'point0',
  scope: PointsScope,
  type: PointType,
  name: PointName,
  serverOrClient: 'server' | 'client' | 'combined',
  finiteOrInfinite: 'finite' | 'infinite',
  inputStringified: string,
  outputType: FetchServerOutputType,
]

export type Infer<
  TPointType extends PointType,
  TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType,
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
> = {
  PointType: TPointType
  LetsReadyPointType: TLetsReadyPointType
  Error: TError
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
    TPointType,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema
  >
  // IsInputEmpty: IsInputsEmpty<TServerInputSchema, TClientInputSchema>
  InputRaw: FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>
  InputRawOrUndefined: FinalInputRawOrUndefined<
    TPointType,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema
  >
  ClientInputRaw: InputRaw<TClientInputSchema>
  ClientInputParsed: InputParsed<TClientInputSchema>
  IsClientInputOptional: IsSchemaOptional<TClientInputSchema>
  ServerInputRaw: FinalServerInputRaw<TPointType, TServerInputSchema, TParamsSchema, TSearchSchema, TBodySchema>
  ServerInputParsed: FinalServerInputParsed<TPointType, TServerInputSchema, TParamsSchema, TSearchSchema, TBodySchema>
  IsServerInputOptional: IsFinalServerInputOptional<
    TPointType,
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
  UseQueryOptions: UsePointQueryOptions<
    TPointType,
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
  | 'coreStage'
  | 'serverStage'
  | 'clientStage'
  | 'finalStage'
export type StagePointType = 'coreStage' | 'serverStage' | 'clientStage' | 'finalStage'
export type ReadyPointType = Exclude<PointType, StagePointType>
export type RequestableReadyPointType = Exclude<ReadyPointType, 'root' | 'base' | 'plugin'>
export type MountablePointType = 'page' | 'component' | 'layout' | 'provider'
export type QueryableReadyPointType = MountablePointType | 'query' | 'infiniteQuery'
export type IsReadyPointType<TPointType extends PointType> = TPointType extends ReadyPointType ? true : false
export type UndefinedReadyPointType = undefined
export type ReadyPointTypeOrNever<TPointType extends PointType | UndefinedReadyPointType> =
  TPointType extends ReadyPointType ? TPointType : never
export type StagePointTypeOrNever<TPointType extends PointType | UndefinedReadyPointType> =
  TPointType extends StagePointType ? TPointType : StagePointType
// export type NormalizeQueryResultType<
//   TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType,
//   TCurrentQueryResultType extends QueryResultType | UndefinedQueryResultType,
//   TNewQueryResultType extends QueryResultType,
// > = TCurrentQueryResultType extends QueryResultType
//   ? TCurrentQueryResultType
//   : TLetsReadyPointType extends QueryableReadyPointType
//     ? TNewQueryResultType
//     : UndefinedQueryResultType

export type AnyPoint<
  TPointType extends PointType = PointType,
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
  TQueriesDefinitions
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
  TQueriesDefinitions
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
  TQueriesDefinitions
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
  TQueriesDefinitions
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
  TQueriesDefinitions
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
  TQueriesDefinitions
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
  TQueriesDefinitions
>

export type ReadyPoint<
  TPointType extends ReadyPointType = ReadyPointType,
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
  TQueriesDefinitions
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
  TQueriesDefinitions
>

// action

export type EndpointDefinition = {
  method: WideRequestMethod
  route: AnyRoute
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
          MergeObjects<RecordValidationSchemaInput<TSchema1>, RecordValidationSchemaInput<TSchema2>>,
          MergeObjects<RecordValidationSchemaOutput<TSchema1>, RecordValidationSchemaOutput<TSchema2>>
        >
      : TSchema1
    : TSchema2 extends RecordValidationSchema
      ? TSchema2
      : undefined
>

// type RequiredKeys<T> = {
//   // eslint-disable-next-line @typescript-eslint/no-empty-object-type
//   [K in keyof T]-?: {} extends Pick<T, K> ? never : K
// }[keyof T]
// export type HasRequiredKeysInValidationSchema<S extends RecordValidationSchema | undefined> =
//   S extends RecordValidationSchema ? (RequiredKeys<RecordValidationSchemaInput<S>> extends never ? false : true) : false

export type IsObjectOptional<T> = EmptyObject extends T ? true : false
export type HasRequiredKeysInValidationSchema<S extends RecordValidationSchema | undefined> =
  S extends RecordValidationSchema ? (EmptyObject extends RecordValidationSchemaInput<S> ? false : true) : false
export type IsSchemaOptional<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = HasRequiredKeysInValidationSchema<TInputSchema> extends true ? false : true
// export type IsInputsOptional<
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > =
//   HasRequiredKeysInValidationSchema<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>> extends true
//     ? false
//     : true

// type OverlapKeys<A, B> = keyof A & keyof B
// type IsNarrowerOrEqual<New, Prev> = [New] extends [Prev] ? true : false
// type HasWideningKey<Prev, New> = {
//   [K in OverlapKeys<Prev, New>]: IsNarrowerOrEqual<New[K], Prev[K]> extends true ? never : K
// }[OverlapKeys<Prev, New>] extends never
//   ? false
//   : true

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
type IsInputSchemaHasNotAnotherKeys<
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
> = TPrevInputSchema extends InputSchema
  ? TNewInputSchema extends InputSchema
    ? Exclude<KeysOfUnion<InputRaw<TPrevInputSchema>>, KeysOfUnion<InputRaw<TNewInputSchema>>> extends never
      ? false
      : true
    : true
  : false
type IsInputSchemaHasAllKeys<
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
> = IsInputSchemaHasNotAnotherKeys<TPrevInputSchema, TNewInputSchema> extends true ? false : true
export type AssertInputSchemaHasAllKeys<
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
  TWhat extends string,
> =
  IsInputSchemaHasAllKeys<TNewInputSchema, TPrevInputSchema> extends true
    ? unknown
    : ShowError<`Provided ${TWhat} schema should contain all previously defined keys`>
export type AssertInputSchemaHasNotAnotherKeys<
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
  TWhat extends string,
> =
  IsInputSchemaHasNotAnotherKeys<TPrevInputSchema, TNewInputSchema> extends true
    ? ShowError<`Previous provided ${TWhat} schema has another keys`>
    : unknown

export type AssertRouteSchemaExtends<
  TCurrentRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TNewRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> =
  IsRouteSchemaExtends<TCurrentRouteDefinition, TNewRouteDefinition> extends true
    ? unknown
    : ShowError<`Provided route definition is not assignable to current point route definition`>

// FlattenInput

// // 1. Bail-out list: Stops TS from recursively mapping over built-in prototypes.
// // (This is the secret to preventing the "excessively deep" error).
// type TerminalType =
//   | string
//   | number
//   | boolean
//   | bigint
//   | symbol
//   | undefined
//   | null
//   | Date
//   | RegExp
//   | Error
//   // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
//   | Function
//   | Blob
//   | File

// // 2. Safely joins the dot-notation path
// type JoinPath<P extends string, K extends string | number> = P extends '' ? `${K}` : `${P}.${K}`

// // 3. Core recursive extraction that returns a union of single-key objects
// type FlattenEntries<T, P extends string = ''> = T extends TerminalType
//   ? P extends ''
//     ? never
//     : { [K in P]: T }
//   : T extends readonly (infer U)[]
//     ? // Safely grab the array items WITHOUT mapping over Array.prototype methods
//       FlattenEntries<U, JoinPath<P, number>>
//     : T extends Record<string, unknown>
//       ? keyof T extends never
//         ? // Handles explicitly empty objects {} safely
//           P extends ''
//           ? never
//           : { [K in P]: T }
//         : // Maps over keys, recursively flattening them
//           { [K in keyof T & string]: FlattenEntries<T[K], JoinPath<P, K>> }[keyof T & string]
//       : P extends ''
//         ? never
//         : { [K in P]: T }

// // 4. Utility to squash the union back into a single object
// type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

// // 5. Final Export (The `extends infer O` trick forces TS to compute a clean tooltip)
// export type FlattenInput<T> = UnionToIntersection<FlattenEntries<T>> extends infer O ? { [K in keyof O]: O[K] } : never

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
    : TPointType extends 'component' | 'provider' | 'query' | 'infiniteQuery' | 'mutation'
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
    : TPointType extends 'component' | 'provider' | 'query' | 'infiniteQuery' | 'mutation'
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
    : TPointType extends 'component' | 'provider' | 'query' | 'infiniteQuery' | 'mutation'
      ? InputRaw<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>>
      : InputRaw
// export type RoutedInputParsed<
//   TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = (TParamsSchema extends InputSchema ? InputRaw<TParamsSchema> : EmptyObject) &
//   (TSearchSchema extends InputSchema
//     ? IsSchemaOptional<TSearchSchema> extends true
//       ? { '?'?: InputParsed<TSearchSchema> }
//       : { '?': InputParsed<TSearchSchema> }
//     : { '?'?: UnknownSearchInput })
// export type FinalInputParsed<
//   TPointType extends PointType,
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = TPointType extends 'action'
//   ? ActionInputParsed<TParamsSchema, TSearchSchema, TBodySchema>
//   : TPointType extends 'page' | 'layout'
//     ? RoutedInputParsed<TSearchSchema, TParamsSchema>
//     : TPointType extends 'component' | 'provider' | 'query' | 'infiniteQuery' | 'mutation'
//       ? InputParsed<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>>
//       : InputParsed
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
// export type InputsParsed<
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = InputParsed<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>>
export type InputRaw<TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema> =
  TInputSchema extends RecordValidationSchema ? RecordValidationSchemaInput<TInputSchema> : EmptyObject
// export type InputsRaw<
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = InputRaw<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>>
type UndefinedIfEmptyObject<T> = IsEmptyObjectSpecial<T> extends true ? undefined : T
// export type InputsRawOrUndefined<
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = UndefinedIfEmptyObject<InputsRaw<TServerInputSchema, TClientInputSchema>>
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

// TO KEEP IT, DO NOT REMOVE
type UndefinedOrVoidIfEmptyObject<T> = IsEmptyObjectSpecial<T> extends true ? undefined | void : T
// export type InputsRawOrUndefinedOrVoid<
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = UndefinedOrVoidIfEmptyObject<InputsRaw<TServerInputSchema, TClientInputSchema>>
export type FinalInputRawOrUndefinedOrVoid<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = UndefinedOrVoidIfEmptyObject<
  FinalInputRaw<TPointType, TServerInputSchema, TClientInputSchema, TParamsSchema, TSearchSchema, TBodySchema>
>
// export type IsInputsEmpty<
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = IsEmptyObject<InputsRaw<TServerInputSchema, TClientInputSchema>>

export type IsInputsSchemasDefined<
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TServerInputSchema extends InputSchema ? true : TClientInputSchema extends InputSchema ? true : false

export type IsInputFlat<
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TBodySchema extends InputSchema ? (TSearchSchema extends InputSchema ? false : true) : true

// export type InputRawMaybeOptional<
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > =
//   IsInputOptional<TInputSchema> extends true
//     ? // biome-ignore lint/suspicious/noConfusingVoidType: VERY IMPORTANT TO KEEP IT
//       InputRaw<TInputSchema> | undefined | void
//     : InputRaw<TInputSchema>
// export type InputsRawMaybeOptional<
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = InputRawMaybeOptional<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>>
export type InputRawUnknown = Record<string, unknown>
// export type InputParseResult<
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TError extends ErrorPoint0 = ErrorPoint0,
// > =
//   | {
//       inputParsed: InputParsed<TInputSchema>
//       inputParseError: null
//     }
//   | {
//       inputParsed: null // TODO: to undefined
//       inputParseError: TError
//     }
// export type InputsParseResult<
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TError extends ErrorPoint0 = ErrorPoint0,
// > = InputParseResult<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>, TError>

// export type SafeParseInputResult<
//   TPointType extends PointType,
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TError = unknown,
// > =
//   | {
//       success: true
//       data: FinalInputParsed<
//         TPointType,
//         TServerInputSchema,
//         TClientInputSchema,
//         TParamsSchema,
//         TSearchSchema,
//         TBodySchema
//       >
//       error: undefined
//     }
//   | {
//       success: false
//       data: undefined
//       error: TError
//     }
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
// export type SafeParseInputsResult<
//   TPointType extends PointType,
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TError = Error,
// > = SafeParseInputResult<
//   TPointType,
//   TServerInputSchema,
//   TClientInputSchema,
//   TParamsSchema,
//   TSearchSchema,
//   TBodySchema,
//   TError
// >

// utils

export type Prettify<T extends object> = {
  [K in keyof T]: T[K]
}
export type PrettifyOrEmptyObject<T extends object> = IsEmptyObject<T> extends true ? EmptyObject : Prettify<T>
// export type PrettifyOrUndefined<T> = T extends object ? Prettify<T> : undefined

export type AppendCtx<TCtx extends UnknownCtx | UndefinedCtx, TAppend extends UnknownCtx> = TCtx extends Ctx
  ? IsNever<keyof TCtx> extends true
    ? TAppend
    : Omit<TCtx, keyof TAppend> & TAppend
  : TAppend
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
type HasAnyKeys<T> = T extends unknown ? (keyof T extends never ? never : true) : never
export type IsEmptyObjectSpecial<T> = [T] extends [object] ? ([HasAnyKeys<T>] extends [never] ? true : false) : false
export type IsUnknownRecord<T> = T extends Record<string, unknown> ? true : false
export type IsNever<T> = [T] extends [never] ? true : false

export type IfAnyThenElse<T, Then, Else = T> = 0 extends 1 & T ? Then : Else
export type IsAny<T> = 0 extends 1 & T ? true : false

export type IfNeverThen<TElse, TThen> = [TElse] extends [never] ? TThen : TElse

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
export type BasepathByBaseurl<TBaseUrl extends string | undefined> = TBaseUrl extends undefined
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

export type UseQueryOptions<
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
> = OriginalUseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
export type ExtraUseQueryOptions<
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryFn' | 'queryKey'>
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
> = Omit<UseInfiniteQueryOptions<TInput, TQueryFnData, TError, TData, TQueryKey, TPageParam>, 'queryFn' | 'queryKey'>
export type PartialUseInfiniteQueryOptions<
  TInput extends InputRaw = InputRaw,
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = any,
> = Partial<ExtraUseInfiniteQueryOptions<TInput, TQueryFnData, TError, TData, TQueryKey, TPageParam>>

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
export type UseCombinedQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TError extends ErrorPoint0,
  TStatus extends 'pending' | 'error' | 'success',
> = TClientLoaderOutput extends UndefinedLoaderOutput
  ? never
  : TServerLoaderOutput extends UndefinedLoaderOutput
    ? never
    : TQueryResultType extends 'infiniteQuery'
      ? NarrowQueryComponentPropStatus<
          UseInfiniteQueryResult<InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>, TError>,
          TStatus
        >
      : TQueryResultType extends 'query'
        ? NarrowQueryComponentPropStatus<
            UseQueryResult<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>, TError>,
            TStatus
          >
        : never
export type UsePointQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TError extends ErrorPoint0,
  TStatus extends 'pending' | 'error' | 'success' = any,
> = TServerLoaderOutput extends Data
  ? TClientLoaderOutput extends Data
    ? UseCombinedQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TError, TStatus>
    : UseServerQueryResult<TQueryResultType, TServerLoaderOutput, TError, TStatus>
  : TClientLoaderOutput extends Data
    ? UseClientQueryResult<TQueryResultType, TClientLoaderOutput, TError, TStatus>
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
  ? ExtraUseInfiniteQueryOptions<
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

// settings

export type FetchOptionsFn = () => FetchOptions
export type FetchOptionsOrFn = FetchOptionsFn | FetchOptions
export type FetchOptions = RequestInit & { transform?: boolean }

export type ScrollPositionGetter = () => { x: number; y: number } | undefined
export type ScrollPositionSetter = (position: { x: number; y: number }) => void
export type ScrollPositionRestorePolicy = ({ prevLocation }: { prevLocation: AnyLocation | null }) => boolean | null

export type QueryMode = 'server' | 'client' | 'serverAndClient'
export type PrefetchPagePolicy =
  | 'serverQuery'
  | 'clientQuery'
  | 'serverAndClientQuery'
  | 'ssrDehydratedState'
  | 'ssrDehydratedStateAndClientQuery'
  | 'onPrefetchOnly'
  | 'none'
  | false
  | true
export type NormalizedPrefetchPagePolicy = Exclude<PrefetchPagePolicy, boolean>

// middlewares

export type UndefinedResponse = undefined
export type UndefinedClientResponse = undefined
export type UndefinedLastDataOrResponse = undefined

export type ServerExecuteFn = <
  TPoint extends NiceReadyPoint<
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
      effects: ResponseEffectsValues
      error: undefined
      output: TServerLoaderOutput
      point: ReadyPoint
    }
  | {
      ctx: Ctx
      data: Data | UndefinedData
      response: Response | UndefinedResponse
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

export type CtxFnOptions<
  TCtxPrev extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = ExposedCtxOrEmpty<TCtxPrev, TCtxExposedKeys> & {
  request: Request0
  point: ReadyPoint | undefined
  set: ResponseEffectsSetHelper
  // execute: ServerExecuteFn
  ctx: TCtxPrev
} & WithInputParsed<TServerInputSchema, TParamsSchema, TSearchSchema, TBodySchema, THeadersSchema, TCookiesSchema>
export type CtxFn<
  TCtxPrev extends Ctx = Ctx,
  TCtxPrevExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCtxAppend extends Ctx = Ctx,
> = (
  props: CtxFnOptions<
    TCtxPrev,
    TCtxPrevExposedKeys,
    TServerInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema
  >,
) => Promise<TCtxAppend> | TCtxAppend

export type CtxFnOutput<TCtxFn extends CtxFn<any, any, any, any, any, any, any, any, any>> = Awaited<ReturnType<TCtxFn>>
export type ForbiddenCtxExposedKeys = 'request' | 'input' | 'inputRaw' | 'data' | 'set' | 'execute' | 'ctx'
export type AssertNoForbiddenCtxExposedKeys<TExposedKeys> = [TExposedKeys] extends [never]
  ? unknown
  : [string] extends [TExposedKeys]
    ? unknown
    : [Extract<TExposedKeys, ForbiddenCtxExposedKeys>] extends [never]
      ? unknown
      : ShowError<`Forbidden to expose ctx keys: ${Extract<TExposedKeys, ForbiddenCtxExposedKeys> & string}`>
export type InferCtxFnOutputCtxAppend<TCtxFn extends CtxFn<any, any, any, any, any, any, any, any, any>> =
  TCtxFn extends CtxFn<any, any, any, any, any, any, any, any, infer TCtxAppend> ? TCtxAppend : never
export type InferCtxFnOutputCtxExposedKeys<TCtxFn extends CtxFn<any, any, any, any, any, any, any, any, any>> = Extract<
  keyof InferCtxFnOutputCtxAppend<TCtxFn>,
  string
>
export type LoaderResponseFnOptions<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = ExposedCtxOrEmpty<TCtx, TCtxExposedKeys> & {
  request: Request0
  point: ReadyPoint | undefined
  data: DataOrUndefinedData<TServerLoaderOutput>
  set: ResponseEffectsSetHelper
  // execute: ServerExecuteFn
  ctx: TCtx
} & WithInputParsed<TServerInputSchema, TParamsSchema, TSearchSchema, TBodySchema, THeadersSchema, TCookiesSchema>
export type LoaderResponseFn<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TNewServerLoaderOutput extends LoaderOutput = LoaderOutput,
> = (
  options: LoaderResponseFnOptions<
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TServerInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema
  >,
) =>
  | Promise<[number, TNewServerLoaderOutput extends readonly unknown[] ? never : TNewServerLoaderOutput]>
  | [number, TNewServerLoaderOutput extends readonly unknown[] ? never : TNewServerLoaderOutput]
  | Promise<TNewServerLoaderOutput extends readonly unknown[] ? never : TNewServerLoaderOutput>
  | (TNewServerLoaderOutput extends readonly unknown[] ? never : TNewServerLoaderOutput)

export type LoaderDataFnOptions<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = ExposedCtxOrEmpty<TCtx, TCtxExposedKeys> & {
  request: Request0
  point: ReadyPoint | undefined
  data: DataOrUndefinedData<TServerLoaderOutput>
  set: ResponseEffectsSetHelper
  // execute: ServerExecuteFn
  ctx: TCtx
} & WithInputParsed<TServerInputSchema, TParamsSchema, TSearchSchema, TBodySchema, THeadersSchema, TCookiesSchema>
export type LoaderDataFn<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  THeadersSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCookiesSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TNewServerLoaderOutput extends Data = Data,
> = (
  options: LoaderDataFnOptions<
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TServerInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    THeadersSchema,
    TCookiesSchema
  >,
) =>
  | Promise<[number, TNewServerLoaderOutput extends readonly unknown[] ? never : TNewServerLoaderOutput]>
  | [number, TNewServerLoaderOutput extends readonly unknown[] ? never : TNewServerLoaderOutput]
  | Promise<TNewServerLoaderOutput extends readonly unknown[] ? never : TNewServerLoaderOutput>
  | (TNewServerLoaderOutput extends readonly unknown[] ? never : TNewServerLoaderOutput)

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
        fn: LoaderResponseFn | LoaderDataFn
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
      fn: ClientLoaderResponseFn | ClientLoaderDataFn
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

export type ClientExecuteActionLocation<
  TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType = ReadyPointType | UndefinedReadyPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = TLetsReadyPointType extends 'page'
  ? ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
  : TLetsReadyPointType extends 'layout'
    ?
        | DescendantLocation<CurrentRouteDefinition<TRouteDefinition>>
        | ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
    : TLetsReadyPointType extends 'component'
      ? AnyLocation
      : AnyLocation

type WithClientInputParsed<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
> = (TClientInputSchema extends InputSchema ? { input: InputParsed<TClientInputSchema> } : unknown) &
  (TParamsSchema extends InputSchema ? { params: InputParsed<TParamsSchema> } : unknown) &
  (TSearchSchema extends InputSchema ? { search: InputParsed<TSearchSchema> } : unknown)
export type ClientLoaderResponseFnOptions<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = {
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
} & WithClientInputParsed<TClientInputSchema, TParamsSchema, TSearchSchema>
export type ClientLoaderResponseFn<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TNewClientLoaderOutput extends LoaderOutput = LoaderOutput,
> = (
  options: ClientLoaderResponseFnOptions<
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TServerLoaderOutput,
    TClientLoaderOutput
  >,
) => Promise<TNewClientLoaderOutput> | TNewClientLoaderOutput

export type ClientLoaderDataFnOptions<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = {
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
} & WithClientInputParsed<TClientInputSchema, TParamsSchema, TSearchSchema>
export type ClientLoaderDataFn<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TNewClientLoaderOutput extends Data = Data,
> = (
  options: ClientLoaderDataFnOptions<
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TServerLoaderOutput,
    TClientLoaderOutput
  >,
) => Promise<TNewClientLoaderOutput> | TNewClientLoaderOutput

export type FetchServerOutput<TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput> = TServerLoaderOutput
export type FetchServerDetailedOutput<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TError extends ErrorPoint0,
> =
  | {
      response: Response
      data: TServerLoaderOutput extends Data ? TServerLoaderOutput : undefined
      output: TServerLoaderOutput extends Data ? TServerLoaderOutput : Response
      error: undefined
    }
  | {
      response: Response | undefined
      data: undefined
      output: undefined
      error: TError
    }

export type FetchServerOutputType = 'data' | 'queryClientDehydratedState'

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

export type FetchTask = {
  pointType: ReadyPointType
  outputType: 'data' | 'queryClientDehydratedState' | 'html'
  scope: PointsScope
  pointName: PointName
  // pointInput: InputRawUnknown | undefined // in case if it is page or layout, we will parse input on task level, becouse we need it to extract totally match pageLocation
}

export type FetcherFetchDetailedResultGeneral<TError extends ErrorPoint0> = {
  response: Response
  request: Request0
  scope: PointsScope
  error: TError | undefined
}
export type FetcherFetchDetailedResultMiddleware<TError extends ErrorPoint0> =
  FetcherFetchDetailedResultGeneral<TError> & {
    variant: 'middleware'
  }
export type FetcherFetchDetailedResultPage<TError extends ErrorPoint0> = FetcherFetchDetailedResultGeneral<TError> & {
  variant: 'page'
  point: ReadyPoint | undefined
}
export type FetcherFetchDetailedResultEndpoint<TError extends ErrorPoint0> =
  FetcherFetchDetailedResultGeneral<TError> & {
    variant: 'endpoint'
    point: ReadyPoint
    data: Data | undefined
  }
// export type FetcherFetchDetailedResultUnknown<TError extends ErrorPoint0> =
//   FetcherFetchDetailedResultGeneral<TError> & {
//     variant: 'unknown'
//   }
export type FetcherFetchDetailedResultError<TError extends ErrorPoint0> = Omit<
  FetcherFetchDetailedResultGeneral<TError>,
  'error'
> & {
  variant: 'error'
  error: TError
}
export type FetcherFetchDetailedResultPublicdir<TError extends ErrorPoint0> =
  FetcherFetchDetailedResultGeneral<TError> & {
    variant: 'publicdir'
  }
export type FetcherFetchDetailedResultOptions<TError extends ErrorPoint0> =
  FetcherFetchDetailedResultGeneral<TError> & {
    variant: 'options'
  }
export type FetcherFetchDetailedResultRedirect<TError extends ErrorPoint0> =
  FetcherFetchDetailedResultGeneral<TError> & {
    variant: 'redirect'
  }

export type FetcherFetchDetailedResultNoMiddleware<TError extends ErrorPoint0> =
  | FetcherFetchDetailedResultEndpoint<TError>
  | FetcherFetchDetailedResultPage<TError>
  // | FetcherFetchDetailedResultUnknown<TError>
  | FetcherFetchDetailedResultError<TError>
  | FetcherFetchDetailedResultPublicdir<TError>
  | FetcherFetchDetailedResultOptions<TError>
  | FetcherFetchDetailedResultRedirect<TError>
export type FetcherFetchDetailedResult<TError extends ErrorPoint0> =
  | FetcherFetchDetailedResultNoMiddleware<TError>
  | FetcherFetchDetailedResultMiddleware<TError>
export type FetcherFetchDetailedResultSpecific<
  TVariant extends FetcherFetchDetailedResult<any>['variant'] | undefined = undefined,
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
          : // : TVariant extends 'unknown'
            //   ? FetcherFetchDetailedResultUnknown<TError>
            TVariant extends 'publicdir'
            ? FetcherFetchDetailedResultPublicdir<TError>
            : TVariant extends 'options'
              ? FetcherFetchDetailedResultOptions<TError>
              : TVariant extends 'redirect'
                ? FetcherFetchDetailedResultRedirect<TError>
                : never

export type MiddlewareNextFn<TError extends ErrorPoint0> = () => Promise<FetcherFetchDetailedResult<TError>>
export type MiddlewareFnOptions<TError extends ErrorPoint0> = {
  request: Request0
  set: ResponseEffectsSetHelper
  point: AnyNiceReadyPoint | undefined
  scope: PointsScope
  variant: 'endpoint' | 'page' | 'error' | 'publicdir' | 'options' | 'redirect'
  next: MiddlewareNextFn<TError>
}
export type MiddlewareFnOptionsBase<TError extends ErrorPoint0> = Omit<MiddlewareFnOptions<TError>, 'next'>
export type MiddlewareFn<TError extends ErrorPoint0> = (
  options: MiddlewareFnOptions<TError>,
) => Promise<Response | FetcherFetchDetailedResult<TError>>

// nice middle point

export type AssertNoForbiddenMethodsIfNotSuitableStage<
  TPointType extends PointType,
  TMethod extends
    | 'ctx'
    | 'loader'
    | 'use'
    | 'clientLoader'
    | 'input'
    | 'sharedInput'
    | 'clientInput'
    | 'params'
    | 'search'
    | 'body'
    | 'headers'
    | 'cookies',
> = TPointType extends 'serverStage'
  ? TMethod extends never // nothing is forbiden
    ? ShowError<`You can not use ${TMethod}() after calling .loader()`>
    : unknown
  : TPointType extends 'clientStage'
    ? TMethod extends 'loader' | 'ctx' | 'input' | 'sharedInput' | 'params' | 'search' | 'body' | 'headers' | 'cookies'
      ? ShowError<`You can not use ${TMethod}() in client loaders stage`>
      : unknown
    : TPointType extends 'finalStage'
      ? TMethod extends
          | 'loader'
          | 'ctx'
          | 'input'
          | 'sharedInput'
          | 'clientLoader'
          | 'clientInput'
          | 'params'
          | 'search'
          | 'body'
          | 'headers'
          | 'cookies'
        ? ShowError<`You can not use ${TMethod}() in final stage, add it somewhere earlier`>
        : unknown
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
  TPointType extends StagePointType,
  TLetsReadyPointType extends 'root',
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
    TQueriesDefinitions
  >,
  | 'root'
  | 'errorClass'
  | 'use'
  | 'middleware'
  | 'ssr'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'transformer'
  // | 'fetchFn'
  | 'serverurl'
  | 'basepath'
  | 'mutationOptions'
  | 'queryOptions'
  | 'infiniteQueryOptions'
  | 'pageQueryOptions'
  | 'componentQueryOptions'
  | 'providerQueryOptions'
  | 'layoutQueryOptions'
  | 'fetchOptions'
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
  | 'params'
  | 'search'
  | 'body'
  | 'input'
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
  | 'prefetchPageOnNavigate'
  | 'prefetchPageOnLinkHover'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NicePluginStagePoint<
  TPointType extends StagePointType,
  TLetsReadyPointType extends 'plugin',
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
    TQueriesDefinitions
  >,
  | 'plugin'
  | 'use'
  | 'middleware'
  | 'ssr'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'transformer'
  // | 'fetchFn'
  // | 'requireCtx'
  // | 'serverurl'
  // | 'basepath'
  | 'mutationOptions'
  | 'queryOptions'
  | 'infiniteQueryOptions'
  | 'pageQueryOptions'
  | 'componentQueryOptions'
  | 'providerQueryOptions'
  | 'layoutQueryOptions'
  | 'fetchOptions'
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
  | 'params'
  | 'search'
  | 'body'
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
  | 'scrollPosition'
  | 'scrollRestore'
  | 'onPrefetchPage'
  // | 'prefetchPageOnNavigate'
  // | 'prefetchPageOnLinkHover'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NiceBaseStagePoint<
  TPointType extends StagePointType,
  TLetsReadyPointType extends 'base',
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
    TQueriesDefinitions
  >,
  | 'base'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'use'
  | 'middleware'
  | 'mutationOptions'
  | 'queryOptions'
  | 'infiniteQueryOptions'
  | 'pageQueryOptions'
  | 'componentQueryOptions'
  | 'providerQueryOptions'
  | 'layoutQueryOptions'
  | 'fetchOptions'
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
  | 'params'
  | 'search'
  | 'body'
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
  | 'prefetchPageOnNavigate'
  | 'prefetchPageOnLinkHover'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NicePageStagePoint<
  TPointType extends StagePointType,
  TLetsReadyPointType extends 'page',
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
    TQueriesDefinitions
  >,
  | 'page'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
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
  | 'prefetchPageOnNavigate'
  | 'prefetchPageOnLinkHover'
  | 'point'
  | 'type'
  | 'Infer'
  | 'query'
  | 'infiniteQuery'
>

export type NiceComponentStagePoint<
  TPointType extends StagePointType,
  TLetsReadyPointType extends 'component',
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
    TQueriesDefinitions
  >,
  | 'component'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
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
  | 'point'
  | 'type'
  | 'Infer'
  | 'query'
  | 'infiniteQuery'
>

export type NiceActionStagePoint<
  TPointType extends StagePointType,
  TLetsReadyPointType extends 'action',
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
    TQueriesDefinitions
  >,
  | 'action'
  | 'query'
  | 'infiniteQuery'
  | 'mutation'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'fetchOptions'
  | 'use'
  | 'headers'
  | 'cookies'
  | 'params'
  | 'search'
  | 'body'
  | 'input'
  | 'ctx'
  | 'loader'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NiceQueryStagePoint<
  TPointType extends StagePointType,
  TLetsReadyPointType extends 'query',
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
    TQueriesDefinitions
  >,
  | 'query'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
  | 'headers'
  | 'cookies'
  | 'input'
  | 'clientInput'
  | 'sharedInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  // | 'onPrefetchPage'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NiceInfiniteQueryStagePoint<
  TPointType extends StagePointType,
  TLetsReadyPointType extends 'infiniteQuery',
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
    TQueriesDefinitions
  >,
  | 'infiniteQuery'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
  | 'headers'
  | 'cookies'
  | 'input'
  | 'clientInput'
  | 'sharedInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  // | 'onPrefetchPage'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NiceMutationStagePoint<
  TPointType extends StagePointType,
  TLetsReadyPointType extends 'mutation',
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
    TQueriesDefinitions
  >,
  | 'mutation'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  // | 'asFormData'
  | 'fetchOptions'
  | 'headers'
  | 'cookies'
  | 'input'
  | 'clientInput'
  | 'sharedInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NiceLayoutStagePoint<
  TPointType extends StagePointType,
  TLetsReadyPointType extends 'layout',
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
    TQueriesDefinitions
  >,
  | 'layout'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
  | 'pageQueryOptions'
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
  | 'prefetchPageOnNavigate'
  | 'prefetchPageOnLinkHover'
  | 'point'
  | 'type'
  | 'Infer'
  | 'query'
  | 'infiniteQuery'
  | 'pageQueryOptions'
  | 'layoutQueryOptions'
>

export type NiceProviderStagePoint<
  TPointType extends StagePointType,
  TLetsReadyPointType extends 'provider',
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
    TQueriesDefinitions
  >,
  | 'provider'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
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
  | 'point'
  | 'type'
  | 'Infer'
  | 'query'
  | 'infiniteQuery'
  | 'error'
  | 'loading'
  | 'wrapper'
  | 'with'
  | 'relatedQuery'
>

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
> = TLetsReadyPointType extends 'root'
  ? NiceRootStagePoint<
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
    >
  : TLetsReadyPointType extends 'plugin'
    ? NicePluginStagePoint<
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
      >
    : TLetsReadyPointType extends 'base'
      ? NiceBaseStagePoint<
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
        >
      : TLetsReadyPointType extends 'page'
        ? NicePageStagePoint<
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
          >
        : TLetsReadyPointType extends 'component'
          ? NiceComponentStagePoint<
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
            >
          : TLetsReadyPointType extends 'action'
            ? NiceActionStagePoint<
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
              >
            : TLetsReadyPointType extends 'query'
              ? NiceQueryStagePoint<
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
                >
              : TLetsReadyPointType extends 'infiniteQuery'
                ? NiceInfiniteQueryStagePoint<
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
                  >
                : TLetsReadyPointType extends 'mutation'
                  ? NiceMutationStagePoint<
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
                    >
                  : TLetsReadyPointType extends 'layout'
                    ? NiceLayoutStagePoint<
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
                      >
                    : TLetsReadyPointType extends 'provider'
                      ? NiceProviderStagePoint<
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
                        >
                      : never

// nice end point

export type NiceRootReadyPoint<
  TPointType extends 'root',
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
    TQueriesDefinitions
  >,
  'lets' | 'point' | 'type' | 'Infer'
>

export type NicePluginReadyPoint<
  TPointType extends 'plugin',
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
    TQueriesDefinitions
  >,
  'point' | 'type' | 'Infer'
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
  []
>

export type NiceBaseReadyPoint<
  TPointType extends 'base',
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
    TQueriesDefinitions
  >,
  'lets' | 'point' | 'type' | 'Infer'
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
      TLiteral | 'useQuery' | 'getQueryKey' | 'getQueryOptions' | 'fetchQuery' | 'prefetchQuery' | 'fetch'
    >
  : TQueryResultType extends 'infiniteQuery'
    ? WithFetchIfHasServerLoader<
        TServerLoaderOutput,
        | TLiteral
        | 'useInfiniteQuery'
        | 'getQueryKey'
        | 'getInfiniteQueryOptions'
        | 'fetchInfiniteQuery'
        | 'prefetchInfiniteQuery'
        | 'fetch'
      >
    : TLiteral

export type NicePageReadyPoint<
  TPointType extends 'page',
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
    TQueriesDefinitions
  >,
  WithQueryIfSuitable<TServerLoaderOutput, TQueryResultType, 'point' | 'type' | 'Infer' | 'Page' | 'X' | 'route'>
>

export type NiceComponentReadyPoint<
  TPointType extends 'component',
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
    TQueriesDefinitions
  >,
  WithQueryIfSuitable<TServerLoaderOutput, TQueryResultType, 'point' | 'type' | 'Infer' | 'Component' | 'X'>
>

export type NiceLayoutReadyPoint<
  TPointType extends 'layout',
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
    TQueriesDefinitions
  >,
  WithQueryIfSuitable<
    TServerLoaderOutput,
    TQueryResultType,
    'point' | 'type' | 'lets' | 'useValue' | 'getValue' | 'getValueWeak' | 'Infer' | 'Layout' | 'X' | 'route'
  >
>

export type NiceActionReadyPoint<
  TPointType extends 'action',
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
    TQueriesDefinitions
  >,
  | 'point'
  | 'route'
  | 'method'
  | 'type'
  | 'Infer'
  | 'fetch'
  | 'fetchServer'
  | 'fetchServerDetailed'
  | 'getFetchServerOptions'
  | (TQueryResultType extends 'query'
      ? 'useQuery' | 'getQueryKey' | 'getQueryOptions' | 'fetchQuery' | 'prefetchQuery' | 'fetch'
      : TQueryResultType extends 'infiniteQuery'
        ?
            | 'useInfiniteQuery'
            | 'getQueryKey'
            | 'getInfiniteQueryOptions'
            | 'fetchInfiniteQuery'
            | 'prefetchInfiniteQuery'
            | 'fetch'
        : 'useMutation' | 'getMutationOptions' | 'fetchMutation' | 'fetch')
>

export type NiceQueryReadyPoint<
  TPointType extends 'query',
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
    TQueriesDefinitions
  >,
  WithQueryIfSuitable<TServerLoaderOutput, TQueryResultType, 'point' | 'type' | 'Infer'>
>

export type NiceInfiniteQueryReadyPoint<
  TPointType extends 'infiniteQuery',
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
    TQueriesDefinitions
  >,
  WithQueryIfSuitable<TServerLoaderOutput, TQueryResultType, 'point' | 'type' | 'Infer'>
>

export type NiceMutationReadyPoint<
  TPointType extends 'mutation',
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
    TQueriesDefinitions
  >,
  WithFetchIfHasServerLoader<
    TServerLoaderOutput,
    'point' | 'type' | 'getMutationOptions' | 'useMutation' | 'fetchMutation' | 'fetch' | 'Infer'
  >
>

export type NiceProviderReadyPoint<
  TPointType extends 'provider',
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
    TQueriesDefinitions
  >,
  WithQueryIfSuitable<
    TServerLoaderOutput,
    TQueryResultType,
    'point' | 'type' | 'useValue' | 'getValue' | 'getValueWeak' | 'Provider' | 'X' | 'Infer'
  >
>

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
> = TPointType extends 'root'
  ? NiceRootReadyPoint<
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
    >
  : TPointType extends 'plugin'
    ? NicePluginReadyPoint<
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
      >
    : TPointType extends 'base'
      ? NiceBaseReadyPoint<
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
        >
      : TPointType extends 'page'
        ? NicePageReadyPoint<
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
          >
        : TPointType extends 'component'
          ? NiceComponentReadyPoint<
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
            >
          : TPointType extends 'action'
            ? NiceActionReadyPoint<
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
              >
            : TPointType extends 'query'
              ? NiceQueryReadyPoint<
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
                >
              : TPointType extends 'infiniteQuery'
                ? NiceInfiniteQueryReadyPoint<
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
                  >
                : TPointType extends 'mutation'
                  ? NiceMutationReadyPoint<
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
                    >
                  : TPointType extends 'layout'
                    ? NiceLayoutReadyPoint<
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
                      >
                    : TPointType extends 'provider'
                      ? NiceProviderReadyPoint<
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
                        >
                      : never

export type AnyNiceReadyPoint<
  TPointType extends ReadyPointType = any,
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
  TQueriesDefinitions
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
  TQueriesDefinitions
>

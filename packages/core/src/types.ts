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
  InfiniteData,
  UseInfiniteQueryOptions as OriginalUseInfiniteQueryOptions,
  UseMutationOptions as OriginalUseMutationOptions,
  UseQueryOptions as OriginalUseQueryOptions,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query'
import type { OpenAPIV3 } from 'openapi-types'
import type React from 'react'
import type { ResponseEffectsSetHelper, ResponseEffectsValues } from './effects.js'
import type { ErrorPoint0 } from './error.js'
import type {
  EmptyProps,
  MountableSuccessComponentProps,
  MuntableSuccessComponentType,
  Props,
  QueriesDefinitions,
} from './mountable.js'
import type { RedirectTask } from './navigation.js'
import type { Point0 } from './point0.js'
import type {
  Request0,
  RequestVariantEndpoint,
  RequestVariantPage,
  RequestVariantPublicdir,
  RequestVariantType,
  WideRequestMethod,
} from './request0.js'
import type { GetByPath, SetByPath } from './utils.js'

// basic

export type EmptyObject = Record<never, never>

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
// export type LoaderOutput = UnknownData | Response | React.ReactElement
export type LoaderOutput = UnknownData | Response
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
  {
    scope: PointsScope
    type: PointType
    name: PointName
    mode: 'server' | 'client'
    finiteness: 'finite' | 'infinite'
    tags: string[]
    output: FetchServerOutputType
    input: string
  },
]

export type MutationKey = readonly [
  point0: 'point0',
  { scope: PointsScope; type: PointType; name: PointName; tags: string[] },
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
  EdgeComponent: MuntableSuccessComponentType<
    FirstReadyPointTypeOrNever<TLetsReadyPointType, TPointType>,
    TRouteDefinition,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
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
  | 'coreStage'
  | 'loadedStage'
  | 'finalStage'
export type StagePointType = 'coreStage' | 'loadedStage' | 'finalStage'
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
    content: Record<
      ResponseContentType,
      {
        schema: InputSchema
        description?: string
        examples?: Record<string, any>
      }
    >
  }
}
export type NormalizedEndpoindOpenapiSchema = Omit<
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
type UndefinedIfEmptyObject<T> = IsEmptyObjectSpecial<T> extends true ? undefined : T
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

// Keep it for mutation options, so if input can be undefined, then it also can be void, so we can not pass input at all
type UndefinedOrVoidIfEmptyObjectSuitable<T> =
  IsEmptyObjectSpecial<T> extends true ? undefined | void : IsObjectOptional<T> extends true ? undefined | void | T : T

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
  | 'ssrDehydratedState'
  | 'ssrDehydratedStateAndClientQuery'
  | 'onPrefetchOnly'
  | 'none'
  | false
export type NormalizedPrefetchPagePolicy = Exclude<PrefetchPagePolicy, boolean>

// middlewares

export type NiceServerPoints = {
  collection: AnyNiceReadyPoint[]
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

export type CtxFnOptions<
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
  props: CtxFnOptions<
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

export type LoaderFnOptions<
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
  options: LoaderFnOptions<
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
type InferLoaderFnOutputBase<
  TLoaderResponseFn extends LoaderFn<any, any, any, any, any, any, any, any, any, any, any, any>,
> =
  Awaited<ReturnType<TLoaderResponseFn>> extends [number, infer TNewServerLoaderOutput]
    ? TNewServerLoaderOutput extends LoaderOutput | RedirectTask | Error | undefined | void
      ? TNewServerLoaderOutput
      : never
    : Awaited<ReturnType<TLoaderResponseFn>> extends LoaderOutput | RedirectTask | Error | undefined | void
      ? Awaited<ReturnType<TLoaderResponseFn>>
      : never

export type InferLoaderFnOutput<
  TLoaderResponseFn extends LoaderFn<any, any, any, any, any, any, any, any, any, any, any, any>,
> =
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

export type ClientLoaderFnOptions<
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
  options: ClientLoaderFnOptions<
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TServerLoaderOutput,
    TClientLoaderOutput
  >,
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
export type FetcherFetchDetailedResultOptions<TError extends ErrorPoint0> =
  FetcherFetchDetailedResultGeneral<TError> & {
    variant: { type: 'options' }
  }

export type FetcherFetchDetailedResultNoMiddleware<TError extends ErrorPoint0> =
  | FetcherFetchDetailedResultEndpoint<TError>
  | FetcherFetchDetailedResultPage<TError>
  | FetcherFetchDetailedResultError<TError>
  | FetcherFetchDetailedResultPublicdir<TError>
  | FetcherFetchDetailedResultOptions<TError>
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
            : TVariant extends 'options'
              ? FetcherFetchDetailedResultOptions<TError>
              : never

export type MiddlewareNextFn<TError extends ErrorPoint0> = () => Promise<FetcherFetchDetailedResult<TError>>
export type MiddlewareFnOptions<
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
export type MiddlewareFnOptionsBase<TError extends ErrorPoint0> = Omit<MiddlewareFnOptions<TError>, 'next'>
export type MiddlewareFn<
  TError extends ErrorPoint0,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = UndefinedRouteDefinition,
> = (options: MiddlewareFnOptions<TError, TRouteDefinition>) => Promise<Response | FetcherFetchDetailedResult<TError>>

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
  // After the single loader (loadedStage) — or after finalizing (finalStage) — no setup methods are
  // allowed: ctx, the input schemas and the one loader must all be defined before the loader. Both
  // stages forbid the exact same set; they differ elsewhere (loadedStage still allows finalizers and
  // drives the mountable self-query finalization, finalStage does not).
> = TPointType extends 'loadedStage' | 'finalStage'
  ? TMethod extends
      | 'loader'
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
  | 'basePath'
  | 'mutationOptions'
  | 'queryOptions'
  | 'infiniteQueryOptions'
  | 'pageQueryOptions'
  | 'pageDehydratedStateQueryOptions'
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
  | 'clientOnly'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  // | 'transformer'
  // | 'fetchFn'
  // | 'requireCtx'
  // | 'serverUrl'
  // | 'basePath'
  | 'mutationOptions'
  | 'queryOptions'
  | 'infiniteQueryOptions'
  | 'pageQueryOptions'
  | 'pageDehydratedStateQueryOptions'
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
  // | 'prefetchPageOnNavigate'
  // | 'prefetchPageOnLinkHover'
  | 'point'
  | 'tag'
  | 'description'
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
  | 'basePath'
  | 'on'
  | 'serverOn'
  | 'clientOn'
  | 'use'
  | 'middleware'
  | 'mutationOptions'
  | 'queryOptions'
  | 'infiniteQueryOptions'
  | 'pageQueryOptions'
  | 'pageDehydratedStateQueryOptions'
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
  | 'clientOnly'
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
  | 'clientOnly'
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
  | 'tag'
  | 'description'
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
  | 'tag'
  | 'description'
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
  | 'tag'
  | 'description'
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
  | 'tag'
  | 'description'
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
  | 'clientOnly'
  | 'serverOn'
  | 'clientOn'
  | 'middleware'
  | 'use'
  | 'fetchOptions'
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
  | 'clientOnly'
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

type NiceStagePointMap<
  TPointType extends StagePointType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
  TQueriesDefinitions
>[TLetsReadyPointType]

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
  'lets' | 'id' | 'point' | 'tags' | 'type' | 'Infer'
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
        | 'getQueryKey'
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
  WithQueryIfSuitable<
    TServerLoaderOutput,
    TQueryResultType,
    'id' | 'point' | 'tags' | 'type' | 'Infer' | 'Page' | 'X' | 'route'
  >
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
  WithQueryIfSuitable<
    TServerLoaderOutput,
    TQueryResultType,
    'id' | 'point' | 'tags' | 'type' | 'Infer' | 'Component' | 'X'
  >
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
    | 'id'
    | 'point'
    | 'tags'
    | 'type'
    | 'lets'
    | 'useValue'
    | 'getValue'
    | 'getValueWeak'
    | 'Infer'
    | 'Layout'
    | 'X'
    | 'route'
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
  | 'id'
  | 'point'
  | 'tags'
  | 'route'
  | 'method'
  | 'type'
  | 'Infer'
  | 'fetch'
  | 'fetchServer'
  | 'fetchServerDetailed'
  | 'getFetchServerOptions'
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
      : TQueryResultType extends 'infiniteQuery'
        ?
            | 'useInfiniteQuery'
            | 'getQueryKey'
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
        :
            | 'useMutation'
            | 'getMutationKey'
            | 'getMutationOptions'
            | 'getMutationCache'
            | 'getMutationsCache'
            | 'fetchMutation'
            | 'fetch')
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
  WithQueryIfSuitable<TServerLoaderOutput, TQueryResultType, 'id' | 'point' | 'tags' | 'type' | 'Infer'>
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
  WithQueryIfSuitable<TServerLoaderOutput, TQueryResultType, 'id' | 'point' | 'tags' | 'type' | 'Infer'>
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
    'id' | 'point' | 'tags' | 'type' | 'useValue' | 'getValue' | 'getValueWeak' | 'Provider' | 'X' | 'Infer'
  >
>

type NiceReadyPointMap<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
    TQueriesDefinitions
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
  TQueriesDefinitions
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

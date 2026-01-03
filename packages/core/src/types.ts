import type { Error0 } from '@devp0nt/error0'
import type {
  AnyLocation,
  ChildrenLocation,
  ExactLocation,
  FlatInputStringOnly,
  FlatOutput,
  HasParams,
} from '@devp0nt/route0'
import type {
  InfiniteData,
  UseInfiniteQueryOptions as OriginalUseInfiniteQueryOptions,
  UseQueryOptions as OriginalUseQueryOptions,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query'
import type { ResolvableHead } from 'unhead/types'
import type { ZodDefault, input as ZodInput, ZodObject, ZodOptional, output as ZodOutput, util as ZodUtil } from 'zod'
import type { Point0 } from './index.js'
import type { PointsManager } from './points-manager.js'
import type { Request0 } from './request.js'
import type { ResponseEffectsSetHelper } from './response-effects.js'

// basic

export type HasPageTure = true
export type HasPageFalse = false
export type HasPage = boolean
export type IsClientTrue = true
export type IsClientFalse = false
export type IsClient = boolean

export type Method = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'
export type UndefinedMethod = undefined
export type PointName = string
export type UndefinedPointName = undefined
export type PointsScope = string
export type UndefinedPointsScope = undefined

export type UndefinedRoute = undefined
export type RouteDefinition = string
export type UndefinedRouteDefinition = undefined
export type EmptyCtx = Record<never, never>
export type UnknownCtx = Record<string, unknown>
export type UndefinedCtx = undefined
export type RequiredCtx = UnknownCtx | UndefinedCtx
export type Ctx = UnknownCtx | EmptyCtx
export type EmptyData = Record<never, never>
export type UnknownData = Record<string, unknown>
export type UndefinedData = undefined
export type Data = UnknownData | EmptyData
export type AnyInfiniteData = InfiniteData<any, any>
export type AnyDataOrInfiniteData = Data | (InfiniteData<any, any> & { [key: string]: unknown })
export type LoaderOutput = Data | Response
export type UndefinedLoaderOutput = undefined
export type MapperOutput = Data
export type UndefinedMapperOutput = undefined
export type CtxExposedKeys = string
export type UndefinedCtxExposedKeys = undefined

export type QueryResultType = 'query' | 'infiniteQuery'
export type UndefinedQueryResultType = undefined

export type Props = Record<string, any>
export type UndefinedProps = undefined
export type EmptyProps = Record<never, never>
export type FinalProps<TProps extends Props | UndefinedProps> = TProps extends UndefinedProps ? EmptyProps : TProps

// export type QueryKey = readonly [string, ...string[]]
export type QueryKey = readonly [
  point0: 'point0',
  scope: PointsScope,
  type: PointType,
  name: PointName,
  serverOrClient: 'server' | 'client' | 'combined',
  finiteOrInfinite: 'finite' | 'infinite',
  inputStringified: string,
  outputType: FetchOutputType,
]

export type Infer<
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
> = {
  PointType: TPointType
  LetsEndPointType: TLetsEndPointType
  RequiredCtx: TRequiredCtx
  Ctx: TCtx
  CtxExposed: ExposedCtx<TCtx, TCtxExposedKeys>
  CtxExposedKeys: TCtxExposedKeys
  ServerLoaderOutput: TServerLoaderOutput
  ClientLoaderOutput: TClientLoaderOutput
  ClientMapperOutput: TClientMapperOutput
  RouteDefinition: TRouteDefinition
  PrevRouteDefinition: TPrevRouteDefinition
  InputSchema: TInputSchema
  QueryResultType: TQueryResultType
  Props: TProps
  InputParsed: InputParsed<TRouteDefinition, TInputSchema>
  InputRaw: InputRaw<TRouteDefinition, TInputSchema>
  FetchOutput: TServerLoaderOutput extends LoaderOutput ? TServerLoaderOutput : never
  QueriedData: FinalLoaderUnmappedOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
    ? FinalQueriedData<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput>
    : never
  FinalOutput: FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
  ClientExecuteResult: FinalLoaderMappedOutput<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput
  >
  ClientExecuteDetailedResult: ClientExecuteDetailedResult<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput
  >
  ServerExecuteResult: ServerExecuteResult<TCtx, TServerLoaderOutput>
}

// points types

export type PointType =
  | 'root'
  | 'base'
  | 'coreStage'
  | 'page'
  | 'component'
  | 'query'
  | 'infiniteQuery'
  | 'mutation'
  | 'layout'
  | 'clientStage'
  | 'mapperStage'
  | 'renderStage'
  | 'provider'
export type EndPointType = Exclude<PointType, 'coreStage' | 'clientStage' | 'renderStage' | 'mapperStage'>
export type RenderablePointType = Extract<PointType, 'page' | 'component' | 'layout'>
export type IsEndPointType<TPointType extends PointType> = TPointType extends EndPointType ? true : false
export type UndefinedEndPointType = undefined
export type EndPointTypeOrNever<TPointType extends PointType | UndefinedEndPointType> = TPointType extends EndPointType
  ? TPointType
  : never
export type EndPointTypeOrUndefinedOrNever<TPointType extends PointType | UndefinedEndPointType> =
  TPointType extends EndPointType ? TPointType : TPointType extends UndefinedEndPointType ? undefined : never

export type AnyPoint<
  TPointType extends PointType = PointType,
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = Point0<
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
>

export type BasePoint<
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
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
>

export type RootPoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
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
>

export type PagePoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
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

export type LayoutPoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
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
>

export type EndPoint<
  TPointType extends EndPointType = EndPointType,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
  TPointType,
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

// utils
export type Prettify<T extends object> = {
  [K in keyof T]: T[K]
}
export type PrettifyOrUndefined<T> = T extends object ? Prettify<T> : undefined
export type AppendCtx<TCtx extends UnknownCtx | UndefinedCtx, TAppend extends UnknownCtx> = TCtx extends Ctx
  ? IsNever<keyof TCtx> extends true
    ? TAppend
    : Omit<TCtx, keyof TAppend> & TAppend
  : TAppend
export type PrependCtx<TCtx extends UnknownCtx | UndefinedCtx, TPrepend extends UnknownCtx> = TCtx extends Ctx
  ? IsNever<keyof TCtx> extends true
    ? TPrepend
    : Omit<TPrepend, keyof TCtx> & TPrepend
  : TPrepend
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
  ExposedCtx<TCtx, TCtxExposedKeys> extends undefined ? Record<never, never> : ExposedCtx<TCtx, TCtxExposedKeys>
export type CurrentRouteDefinition<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = TRouteDefinition extends RouteDefinition ? TRouteDefinition : string

export type EmptyStringIfStandaloneSlash<TRouteDefinition extends RouteDefinition> = TRouteDefinition extends `/`
  ? ''
  : TRouteDefinition
export type StandaloneSlashIfUndefined<TRouteDefinition extends RouteDefinition | undefined> =
  TRouteDefinition extends undefined ? '/' : TRouteDefinition

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
export type FinalLoaderUnmappedOutput<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = TClientLoaderOutput extends LoaderOutput
  ? TClientLoaderOutput
  : TServerLoaderOutput extends LoaderOutput
    ? TServerLoaderOutput
    : undefined
export type FinalQueriedData<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = TQueryResultType extends 'infiniteQuery'
  ? InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>
  : TQueryResultType extends 'query'
    ? FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>
    : undefined
export type FinalLoaderMappedOutput<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = TClientMapperOutput extends MapperOutput
  ? TClientMapperOutput
  : FinalLoaderUnmappedOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
    ? TQueryResultType extends QueryResultType
      ? FinalQueriedData<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput>
      : FinalLoaderUnmappedOutput<TServerLoaderOutput, TClientLoaderOutput>
    : FinalLoaderUnmappedOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
      ? Response
      : undefined
export type HasAnyLoader<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = TServerLoaderOutput extends LoaderOutput ? true : TClientLoaderOutput extends LoaderOutput ? true : false
export type HasAnyOutput<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = TServerLoaderOutput extends LoaderOutput
  ? true
  : TClientLoaderOutput extends LoaderOutput
    ? true
    : TClientMapperOutput extends MapperOutput
      ? true
      : false

export type InputSchemaZod = ZodObject<any>
export type InputSchema = InputSchemaZod
export type UndefinedInputSchema = undefined
export type InputParsed<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TInputSchema extends InputSchemaZod
  ? ZodOutput<TInputSchema>
  : TRouteDefinition extends RouteDefinition
    ? FlatOutput<TRouteDefinition>
    : Record<never, never>
export type InputRaw<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TInputSchema extends InputSchemaZod
  ? ZodInput<TInputSchema>
  : TRouteDefinition extends RouteDefinition
    ? FlatInputStringOnly<TRouteDefinition>
    : Record<never, never>
export type InputRawMaybeOptional<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> =
  IsInputOptional<TRouteDefinition, TInputSchema> extends true
    ? // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      InputRaw<TRouteDefinition, TInputSchema> | undefined | void
    : InputRaw<TRouteDefinition, TInputSchema>
export type InputRawUnknown = Record<string, unknown>
export type InputParseResult<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> =
  | {
      inputRaw: InputRaw<TRouteDefinition, TInputSchema>
      inputParsed: InputParsed<TRouteDefinition, TInputSchema>
      inputParseError: null
    }
  | {
      inputRaw: InputRaw<TRouteDefinition, TInputSchema>
      inputParsed: null // TODO: to undefined
      inputParseError: Error0
    }

export type MergeInputSchemas<
  TInputSchema1 extends InputSchema | UndefinedInputSchema,
  TInputSchema2 extends InputSchema | UndefinedInputSchema,
> = TInputSchema1 extends InputSchemaZod
  ? TInputSchema2 extends InputSchemaZod
    ? ZodObject<ZodUtil.Extend<TInputSchema1['shape'], TInputSchema2['shape']>>
    : TInputSchema1
  : TInputSchema2 extends InputSchemaZod
    ? TInputSchema2
    : Record<never, never>

export type SafeParseInputResult<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> =
  | {
      success: true
      data: InputParsed<TRouteDefinition, TInputSchema>
      error: undefined
    }
  | {
      success: false
      data: undefined
      error: Error0
    }

export type WithMaybeOptionalReqiredCtx<TRequiredCtx extends RequiredCtx = RequiredCtx> =
  TRequiredCtx extends UndefinedCtx ? { requiredCtx?: TRequiredCtx } : { requiredCtx: TRequiredCtx }

export type HasRequiredKeysInZod<T extends ZodObject<any>> = keyof {
  [K in keyof T['shape'] as T['shape'][K] extends ZodOptional<any> | ZodDefault<any> ? never : K]: true
} extends never
  ? false
  : true

export type IsInputOptional<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TRouteDefinition extends RouteDefinition
  ? TInputSchema extends InputSchema
    ? HasRequiredKeysInZod<TInputSchema> extends true
      ? false
      : true
    : HasParams<TRouteDefinition> extends true
      ? false
      : true
  : TInputSchema extends InputSchema
    ? HasRequiredKeysInZod<TInputSchema> extends true
      ? false
      : true
    : true

export type IsPropsOptional<TProps extends Props | UndefinedProps = Props | UndefinedProps> = TProps extends undefined
  ? true
  : keyof TProps extends never // no keys at all
    ? true
    : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      {} extends TProps // all keys optional
      ? true
      : false

export type IsEmptyObject<T> = keyof T extends never ? true : false
export type IsUnknownRecord<T> = T extends Record<string, unknown> ? true : false
export type IsNever<T> = [T] extends [never] ? true : false

// export type ShowError<Message extends string> = { error: Message } & never

export type IfAnyThenElse<T, Then, Else = T> = 0 extends 1 & T ? Then : Else

export type OmitUnnamedKeys<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
}

export type ShowError<Message extends string> = {
  readonly __error__: Message
}
// export type ShowError<Message extends string> =
//   // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
//   { readonly __error__: Message } & never

// fetching and queries

export type ClientExecuteDetailedResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  serverData: TServerLoaderOutput extends Data ? TServerLoaderOutput : undefined
  serverResponse: TServerLoaderOutput extends undefined ? undefined : Response
  serverOutput: TServerLoaderOutput
  clientData: TClientLoaderOutput extends Data ? TClientLoaderOutput : undefined
  clientResponse: TClientLoaderOutput extends Response ? Response : undefined
  clientOutput: TClientLoaderOutput
  output: FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
}
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
export type UseInfiniteQueryOptions<
  TInput extends InputRaw,
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = any,
> = OriginalUseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam> & {
  pageParamFromInput: keyof TInput
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
  TQueryFnData = any,
  TError = any,
  TData = any,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = any,
> = Partial<ExtraUseInfiniteQueryOptions<InputRaw, TQueryFnData, TError, TData, TQueryKey, TPageParam>>

type NarrowQueryComponentPropStatus<
  T extends { status: 'pending' | 'error' | 'success' },
  S extends string,
> = IfAnyThenElse<S, T, Extract<T, { status: S }>>
export type UseServerQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TStatus extends 'pending' | 'error' | 'success',
> = TServerLoaderOutput extends UndefinedLoaderOutput
  ? never
  : TQueryResultType extends 'infiniteQuery'
    ? NarrowQueryComponentPropStatus<
        UseInfiniteQueryResult<InfiniteData<FetchOutput<TServerLoaderOutput>>, Error0>,
        TStatus
      >
    : TQueryResultType extends 'query'
      ? NarrowQueryComponentPropStatus<UseQueryResult<FetchOutput<TServerLoaderOutput>, Error0>, TStatus>
      : never
export type UseClientQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TStatus extends 'pending' | 'error' | 'success',
> = TClientLoaderOutput extends UndefinedLoaderOutput
  ? never
  : TQueryResultType extends 'infiniteQuery'
    ? NarrowQueryComponentPropStatus<UseInfiniteQueryResult<InfiniteData<TClientLoaderOutput>, Error0>, TStatus>
    : TQueryResultType extends 'query'
      ? NarrowQueryComponentPropStatus<UseQueryResult<TClientLoaderOutput, Error0>, TStatus>
      : never
export type UseCombinedQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TStatus extends 'pending' | 'error' | 'success',
> = TClientLoaderOutput extends UndefinedLoaderOutput
  ? never
  : TServerLoaderOutput extends UndefinedLoaderOutput
    ? never
    : TQueryResultType extends 'infiniteQuery'
      ? NarrowQueryComponentPropStatus<
          UseInfiniteQueryResult<InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>, Error0>,
          TStatus
        >
      : TQueryResultType extends 'query'
        ? NarrowQueryComponentPropStatus<
            UseQueryResult<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>, Error0>,
            TStatus
          >
        : never
export type UsePointQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TStatus extends 'pending' | 'error' | 'success',
> = TServerLoaderOutput extends Data
  ? TClientLoaderOutput extends Data
    ? UseCombinedQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TStatus>
    : UseServerQueryResult<TQueryResultType, TServerLoaderOutput, TStatus>
  : TClientLoaderOutput extends Data
    ? UseClientQueryResult<TQueryResultType, TClientLoaderOutput, TStatus>
    : never

export type AnyUseLoaderResult<
  TStatus extends 'pending' | 'error' | 'success',
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TLocation extends AnyLocation,
> = IfAnyThenElse<
  TStatus,
  | UseLoaderResult<
      'success',
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TLocation
    >
  | UseLoaderResult<
      'error',
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TLocation
    >
  | UseLoaderResult<
      'pending',
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TInputSchema,
      TRouteDefinition,
      TLocation
    >,
  UseLoaderResult<
    TStatus,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TRouteDefinition,
    TLocation
  >
>

export type UseLoaderResult<
  TStatus extends 'pending' | 'error' | 'success',
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TLocation extends AnyLocation,
> = TStatus extends 'success'
  ? {
      data: FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
      error: null
      loading: false
      query: HasAnyLoader<TServerLoaderOutput, TClientLoaderOutput> extends true
        ? UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TStatus> // TODO: to undefined
        : null
      input: InputParsed<TRouteDefinition, TInputSchema>
      inputRaw: InputRaw<TRouteDefinition, TInputSchema> // TODO: maybe remove it?
      location: TLocation
    }
  : TStatus extends 'pending'
    ? {
        data: undefined
        error: null
        loading: true
        query: HasAnyLoader<TServerLoaderOutput, TClientLoaderOutput> extends true
          ? UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TStatus> | null
          : null
        input: InputParsed<TRouteDefinition, TInputSchema>
        inputRaw: InputRaw<TRouteDefinition, TInputSchema>
        location: TLocation
      }
    : TStatus extends 'error'
      ? {
          data: undefined
          error: Error0
          loading: false
          query: HasAnyLoader<TServerLoaderOutput, TClientLoaderOutput> extends true
            ? UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TStatus> | null
            : null
          input: InputParsed<TRouteDefinition, TInputSchema> | null
          inputRaw: InputRaw<TRouteDefinition, TInputSchema>
          location: TLocation
        }
      : never
export type UnqueriedLoaderResult<
  TStatus extends 'pending' | 'error' | 'success',
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TLocation extends AnyLocation,
> = TStatus extends 'success'
  ? {
      data: FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>
      error: null
      loading: false
      input: InputParsed<TRouteDefinition, TInputSchema>
      inputRaw: InputRaw<TRouteDefinition, TInputSchema>
      location: TLocation
    }
  : TStatus extends 'pending'
    ? {
        data: undefined
        error: null
        loading: true
        input: InputParsed<TRouteDefinition, TInputSchema>
        inputRaw: InputRaw<TRouteDefinition, TInputSchema>
        location: TLocation
      }
    : TStatus extends 'error'
      ? {
          data: undefined
          error: Error0
          loading: false
          input: InputParsed<TRouteDefinition, TInputSchema> | null
          inputRaw: InputRaw<TRouteDefinition, TInputSchema>
          location: TLocation
        }
      : never
export type AnyUnqueriedLoaderResult<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TLocation extends AnyLocation = AnyLocation,
> = IfAnyThenElse<
  TStatus,
  | UnqueriedLoaderResult<
      'success',
      TServerLoaderOutput,
      TClientLoaderOutput,
      TInputSchema,
      TRouteDefinition,
      TLocation
    >
  | UnqueriedLoaderResult<'error', TServerLoaderOutput, TClientLoaderOutput, TInputSchema, TRouteDefinition, TLocation>
  | UnqueriedLoaderResult<
      'pending',
      TServerLoaderOutput,
      TClientLoaderOutput,
      TInputSchema,
      TRouteDefinition,
      TLocation
    >,
  UnqueriedLoaderResult<TStatus, TServerLoaderOutput, TClientLoaderOutput, TInputSchema, TRouteDefinition, TLocation>
>

// endpoint components

export type PageComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = UseLoaderResult<
  'success',
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TInputSchema,
  TRouteDefinition,
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
> & { props: FinalProps<TProps> }
export type PageComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  PageComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TInputSchema,
    TProps
  >
>
export type UndefinedPageComponent = undefined

export type LayoutComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = UseLoaderResult<
  'success',
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TInputSchema,
  TRouteDefinition,
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>> | ChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
> & { props: FinalProps<TProps>; children: React.ReactNode }
export type LayoutComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  LayoutComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TInputSchema,
    TProps
  >
>
export type UndefinedLayoutComponent = undefined

export type ComponentComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = UseLoaderResult<
  'success',
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TInputSchema,
  UndefinedRouteDefinition,
  AnyLocation
> & { props: FinalProps<TProps> }
export type ComponentComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  ComponentComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TProps
  >
>
export type UndefinedComponentComponent = undefined

export type MountableComponentProps<
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TWithChildren extends boolean | null,
> = (TInputSchema extends InputSchemaZod
  ? IsInputOptional<UndefinedRouteDefinition, TInputSchema> extends true
    ? { input?: ZodInput<TInputSchema> } & FinalProps<TProps>
    : { input: ZodInput<TInputSchema> } & FinalProps<TProps>
  : FinalProps<TProps>) &
  (TWithChildren extends true
    ? { children: React.ReactNode }
    : TWithChildren extends null
      ? { children?: React.ReactNode }
      : Record<never, never>)
export type MountableComponent<
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TWithChildren extends boolean | null,
> = React.ComponentType<MountableComponentProps<TInputSchema, TProps, TWithChildren>>

// extra components

export type DestinationComponentType = 'page' | 'component' | 'layout'
export type LoadingComponentProps<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = {
  type: TType
  props: FinalProps<TProps>
} & UseLoaderResult<
  'pending',
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TInputSchema,
  TRouteDefinition,
  AnyLocation
>
export type LoadingComponentType<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  LoadingComponentProps<
    TType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
>

export type ErrorComponentProps<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = {
  type: TType
  props: FinalProps<TProps>
} & UseLoaderResult<
  'error',
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TInputSchema,
  TRouteDefinition,
  AnyLocation
>
export type ErrorComponentType<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  ErrorComponentProps<
    TType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
>

export type WrapperComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = AnyUseLoaderResult<
  any,
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TInputSchema,
  TRouteDefinition,
  AnyLocation
> & {
  props: FinalProps<TProps>
  children: React.ReactNode
}
export type WrapperComponentType<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  WrapperComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
>

export type OuterComponentProps<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
  TLocation extends AnyLocation = AnyLocation,
> = {
  inputRaw: InputRawUnknown
  input: InputParsed<TRouteDefinition, TInputSchema>
  props: FinalProps<TProps>
  location: TLocation
  children: React.ReactNode
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
}
export type OuterComponentType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
  TLocation extends AnyLocation = AnyLocation,
> = React.ComponentType<OuterComponentProps<TRouteDefinition, TInputSchema, TProps, TLocation>>

// export type BeforeClientHookOptions<
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
//   TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
// > = {
//   next: symbol
//   loading: symbol
// }
// export type BeforeClientHook<
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
//   TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
//   TNewClientMapperOutput extends MapperOutput = MapperOutput,
// > = (
//   options: ClientMapperFnOptions<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>,
// ) => 'loading' | Error | undefined | 'next'

// settings

export type FetchOptionsFn = () => FetchOptions
export type FetchOptionsOrFn = FetchOptionsFn | FetchOptions
export type FetchOptions = RequestInit

export type ScrollPositionGetter = () => { x: number; y: number } | undefined
export type ScrollPositionSetter = (position: { x: number; y: number }) => void
export type ScrollPositionRestorePolicy = ({ prevLocation }: { prevLocation: AnyLocation | null }) => boolean | null

export type QueryMode = 'server' | 'client' | 'serverAndClient'
export type PagePrefetchPolicy =
  | 'serverQuery'
  | 'clientQuery'
  | 'serverClientQuery'
  | 'queryClientDehydratedState'
  | 'everything'
  | 'onPrefetchOnly'
  | 'none'
export type OnPrefetchFn = () => Promise<void> | void

// middlewares

export type UndefinedResponse = undefined
export type UndefinedClientResponse = undefined
export type UndefinedLastDataOrResponse = undefined
export type InputFnOptions<TInputSchema extends InputSchema = InputSchema> = {
  inputRaw: InputRaw<RouteDefinition | UndefinedRouteDefinition, TInputSchema>
}
export type InputFn<TInputSchema extends InputSchema = InputSchema> = (
  options: InputFnOptions<TInputSchema>,
) => InputParsed<RouteDefinition | UndefinedRouteDefinition, TInputSchema>

export type ServerExecuteFn = <
  TPoint extends NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any>,
>(
  point: TPoint,
  ...args: IsInputOptional<TPoint['Infer']['RouteDefinition'], TPoint['Infer']['InputSchema']> extends true
    ? [input?: InputRaw<TPoint['Infer']['RouteDefinition'], TPoint['Infer']['InputSchema']>]
    : [input: InputRaw<TPoint['Infer']['RouteDefinition'], TPoint['Infer']['InputSchema']>]
) => Promise<ServerExecuteResult<TPoint['Infer']['Ctx'], TPoint['Infer']['ServerLoaderOutput']>>
export type ServerExecuteResult<TCtx extends Ctx, TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput> =
  | {
      ctx: TCtx
      data: TServerLoaderOutput extends Data ? TServerLoaderOutput : undefined
      head: ResolvableHead[]
      response: TServerLoaderOutput extends Response ? TServerLoaderOutput : undefined
      effects: ResponseEffectsSetHelper
      error: null
      status: number
      output: TServerLoaderOutput
    }
  | {
      ctx: UnknownCtx
      data: UnknownData | UndefinedData
      head: ResolvableHead[]
      response: Response | UndefinedResponse
      effects: ResponseEffectsSetHelper
      error: Error0
      status: number
      output: LoaderOutput | UndefinedLoaderOutput
    }

export type CtxFnOptions<
  TCtxPrev extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = ExposedCtxOrEmpty<TCtxPrev, TCtxExposedKeys> & {
  request: Request0
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
  set: ResponseEffectsSetHelper
  execute: ServerExecuteFn
  ctx: TCtxPrev
}
export type CtxFn<
  TCtxPrev extends Ctx = Ctx,
  TCtxPrevExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCtxAppend extends Ctx = Ctx,
> = (
  props: CtxFnOptions<TCtxPrev, TCtxPrevExposedKeys, TRouteDefinition, TInputSchema>,
) =>
  | Promise<TCtxAppend>
  | Promise<[TCtxAppend, ...Array<keyof TCtxAppend>]>
  | TCtxAppend
  | [TCtxAppend, ...Array<keyof TCtxAppend>]

export type CtxFnOutput<TCtxFn extends CtxFn<any, any, any, any, any>> = Awaited<ReturnType<TCtxFn>>
export type ForbiddenCtxExposedKeys = 'request' | 'input' | 'inputRaw' | 'data' | 'set' | 'execute' | 'ctx'
export type AssertNoForbiddenCtxExposedKeys<TExposedKeys> = [TExposedKeys] extends [never]
  ? unknown
  : [string] extends [TExposedKeys]
    ? unknown
    : [Extract<TExposedKeys, ForbiddenCtxExposedKeys>] extends [never]
      ? unknown
      : ShowError<`Forbidden to expose ctx keys: ${Extract<TExposedKeys, ForbiddenCtxExposedKeys> & string}`>
export type InferCtxFnOutputCtxAppend<TCtxFn extends CtxFn<any, any, any, any, any>> =
  TCtxFn extends CtxFn<any, any, any, any, infer TCtxAppend> ? TCtxAppend : never
export type InferCtxFnOutputCtxExposedKeys<TCtxFn extends CtxFn<any, any, any, any, any>> =
  CtxFnOutput<TCtxFn> extends [infer TCtx]
    ? Extract<keyof TCtx, string>
    : CtxFnOutput<TCtxFn> extends [Ctx, ...infer TCtxExposedKeys extends string[]]
      ? TCtxExposedKeys[number]
      : undefined
export type LoaderFnOptions<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = ExposedCtxOrEmpty<TCtx, TCtxExposedKeys> & {
  request: Request0
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
  data: DataOrUndefinedData<TServerLoaderOutput>
  set: ResponseEffectsSetHelper
  execute: ServerExecuteFn
  ctx: TCtx
}
export type LoaderFn<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TNewServerLoaderOutput extends LoaderOutput = LoaderOutput,
> = (
  options: LoaderFnOptions<TCtx, TCtxExposedKeys, TServerLoaderOutput, TRouteDefinition, TInputSchema>,
) =>
  | Promise<[number, TNewServerLoaderOutput]>
  | [number, TNewServerLoaderOutput]
  | Promise<TNewServerLoaderOutput>
  | TNewServerLoaderOutput

export type ServerExecuteAction<TType extends 'ctx' | 'loader' | 'input' = 'ctx' | 'loader' | 'input'> =
  TType extends 'ctx'
    ? {
        type: 'ctx'
        fn: CtxFn
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
        : never

export type ClientExecuteAction<TType extends 'loader' | 'input' = 'loader' | 'input'> = TType extends 'loader'
  ? {
      type: 'loader'
      fn: ClientLoaderFn
      unstableId: number
    }
  : TType extends 'input'
    ? { type: 'input'; schema: InputSchema; unstableId: number }
    : never

export type ClientExecuteActionLocation<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = TLetsEndPointType extends 'page'
  ? ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
  : TLetsEndPointType extends 'layout'
    ?
        | ChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
        | ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
    : TLetsEndPointType extends 'component'
      ? AnyLocation
      : AnyLocation

export type ClientLoaderFnOptions<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
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
  location: ClientExecuteActionLocation<TLetsEndPointType, TRouteDefinition>
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
}
export type ClientLoaderFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TNewClientLoaderOutput extends LoaderOutput = LoaderOutput,
> = (
  options: ClientLoaderFnOptions<
    TLetsEndPointType,
    TRouteDefinition,
    TInputSchema,
    TServerLoaderOutput,
    TClientLoaderOutput
  >,
) => Promise<TNewClientLoaderOutput> | TNewClientLoaderOutput

export type ClientMapperFnOptions<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
> = {
  data: PrettifyOrUndefined<
    FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
  >
}
export type ClientMapperFn<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TNewClientMapperOutput extends MapperOutput = MapperOutput,
> = (
  options: ClientMapperFnOptions<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>,
) => TNewClientMapperOutput

// head

export type SuccessHeadFn<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = (
  options: MiddlewareHeadFnOptions<'success', TServerLoaderOutput, TClientLoaderOutput, TInputSchema, TRouteDefinition>,
) => ResolvableHead | string

export type ErrorHeadFn<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = (
  options: MiddlewareHeadFnOptions<'error', TServerLoaderOutput, TClientLoaderOutput, TInputSchema, TRouteDefinition>,
) => ResolvableHead | string

export type LoadingHeadFn<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = (
  options: MiddlewareHeadFnOptions<'pending', TServerLoaderOutput, TClientLoaderOutput, TInputSchema, TRouteDefinition>,
) => ResolvableHead | string

export type MiddlewareHeadFnOptions<
  TStatus extends 'pending' | 'error' | 'success',
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = AnyUnqueriedLoaderResult<
  TStatus,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TInputSchema,
  TRouteDefinition,
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
>
export type MiddlewareHeadFn<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = (
  options: MiddlewareHeadFnOptions<TStatus, TServerLoaderOutput, TClientLoaderOutput, TInputSchema, TRouteDefinition>,
) => ResolvableHead | string

export type FetchOutput<TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput> = TServerLoaderOutput
export type FetchDetailedOutput<TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput> =
  | {
      response: Response
      data: TServerLoaderOutput extends Data ? TServerLoaderOutput : undefined
      output: TServerLoaderOutput extends Data ? TServerLoaderOutput : Response
      error: null
    }
  | {
      response: Response | undefined
      data: Data | undefined
      output: undefined
      error: Error0
    }

export type FetchOutputType = 'data' | 'queryClientDehydratedState'

// mountable app

export type AppProps = { points: PointsManager }
export type AppComponent = (props: AppProps) => React.ReactElement
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

// nice middle point

export type CutMethodsIfNotSuitableStage<
  TPointType extends PointType,
  TLiteral extends string,
> = TPointType extends 'coreStage'
  ? TLiteral
  : TPointType extends 'clientStage'
    ? Exclude<TLiteral, 'ctx' | 'loader'>
    : TPointType extends 'mapperStage'
      ? Exclude<TLiteral, 'ctx' | 'loader' | 'clientLoader'>
      : TPointType extends 'renderStage'
        ? Exclude<TLiteral, 'ctx' | 'loader' | 'clientLoader' | 'mapper' | 'props'>
        : never

export type NiceRootMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'root',
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
> = Pick<
  Point0<
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
  >,
  CutMethodsIfNotSuitableStage<
    TPointType,
    | 'root'
    | 'ssr'
    | 'transformer'
    | 'requireCtx'
    | 'serverurl'
    | 'baseurl'
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
    | 'input'
    | 'ctx'
    | 'loader'
    | 'clientLoader'
    | 'mapper'
    | 'head'
    | 'scrollPosition'
    | 'scrollRestore'
    | 'prefetchPolicy'
    | 'onPrefetch'
    | 'prefetchOnHover'
    | 'point'
    | 'Infer'
  >
>

export type NiceBaseMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'base',
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
> = Pick<
  Point0<
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
  >,
  CutMethodsIfNotSuitableStage<
    TPointType,
    | 'base'
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
    | 'input'
    | 'ctx'
    | 'loader'
    | 'clientLoader'
    | 'mapper'
    | 'head'
    | 'scrollPosition'
    | 'scrollRestore'
    | 'prefetchPolicy'
    | 'onPrefetch'
    | 'prefetchOnHover'
    | 'point'
    | 'Infer'
  >
>

export type NicePageMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'page',
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
> = Pick<
  Point0<
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
  >,
  CutMethodsIfNotSuitableStage<
    TPointType,
    | 'page'
    | 'fetchOptions'
    | 'error'
    | 'loading'
    | 'wrapper'
    | 'outer'
    | 'input'
    | 'ctx'
    | 'loader'
    | 'clientLoader'
    | 'mapper'
    // | 'flatter'
    | 'head'
    | 'props'
    | 'scrollPosition'
    | 'scrollRestore'
    | 'prefetchPolicy'
    | 'onPrefetch'
    | 'prefetchOnHover'
    | 'point'
    | 'Infer'
    | 'query'
    | 'infiniteQuery'
  >
>

export type NiceComponentMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'component',
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
> = Pick<
  Point0<
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
  >,
  CutMethodsIfNotSuitableStage<
    TPointType,
    | 'component'
    | 'fetchOptions'
    | 'error'
    | 'loading'
    | 'wrapper'
    | 'outer'
    | 'input'
    | 'ctx'
    | 'loader'
    | 'clientLoader'
    | 'mapper'
    // | 'flatter'
    | 'props'
    | 'onPrefetch'
    | 'point'
    | 'Infer'
    | 'query'
    | 'infiniteQuery'
  >
>

export type NiceQueryMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'query',
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
> = Pick<
  Point0<
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
  >,
  CutMethodsIfNotSuitableStage<
    TPointType,
    'query' | 'fetchOptions' | 'input' | 'ctx' | 'loader' | 'clientLoader' | 'mapper' | 'onPrefetch' | 'point' | 'Infer'
  >
>

export type NiceInfiniteQueryMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'infiniteQuery',
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
> = Pick<
  Point0<
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
  >,
  CutMethodsIfNotSuitableStage<
    TPointType,
    | 'infiniteQuery'
    | 'fetchOptions'
    | 'input'
    | 'ctx'
    | 'loader'
    | 'clientLoader'
    | 'mapper'
    // | 'flatter'
    | 'onPrefetch'
    | 'point'
    | 'Infer'
  >
>

export type NiceMutationMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'mutation',
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
> = Pick<
  Point0<
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
  >,
  CutMethodsIfNotSuitableStage<
    TPointType,
    | 'mutation'
    // | 'asFormData'
    | 'fetchOptions'
    | 'input'
    | 'ctx'
    | 'loader'
    | 'clientLoader'
    | 'mapper'
    | 'point'
    | 'Infer'
  >
>

export type NiceLayoutMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'layout',
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
> = Pick<
  Point0<
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
  >,
  CutMethodsIfNotSuitableStage<
    TPointType,
    | 'layout'
    | 'fetchOptions'
    | 'pageQueryOptions'
    | 'error'
    | 'pageError'
    | 'layoutError'
    | 'loading'
    | 'pageLoading'
    | 'layoutLoading'
    | 'wrapper'
    | 'outer'
    | 'input'
    | 'ctx'
    | 'loader'
    | 'clientLoader'
    | 'mapper'
    // | 'flatter'
    | 'head'
    | 'props'
    | 'scrollPosition'
    | 'scrollRestore'
    | 'prefetchPolicy'
    | 'onPrefetch'
    | 'prefetchOnHover'
    | 'point'
    | 'Infer'
    | 'query'
    | 'infiniteQuery'
  >
>

export type NiceProviderMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'provider',
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
> = Pick<
  Point0<
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
  >,
  CutMethodsIfNotSuitableStage<
    TPointType,
    | 'provider'
    | 'fetchOptions'
    | 'input'
    | 'ctx'
    | 'loader'
    | 'clientLoader'
    | 'mapper'
    // | 'flatter'
    | 'onPrefetch'
    | 'point'
    | 'Infer'
    | 'query'
    | 'infiniteQuery'
    | 'error'
    | 'loading'
    | 'wrapper'
  >
>

export type NiceMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends EndPointType,
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
> = TLetsEndPointType extends 'root'
  ? NiceRootMiddlePoint<
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
    >
  : TLetsEndPointType extends 'base'
    ? NiceBaseMiddlePoint<
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
      >
    : TLetsEndPointType extends 'page'
      ? NicePageMiddlePoint<
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
        >
      : TLetsEndPointType extends 'component'
        ? NiceComponentMiddlePoint<
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
          >
        : TLetsEndPointType extends 'query'
          ? NiceQueryMiddlePoint<
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
            >
          : TLetsEndPointType extends 'infiniteQuery'
            ? NiceInfiniteQueryMiddlePoint<
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
              >
            : TLetsEndPointType extends 'mutation'
              ? NiceMutationMiddlePoint<
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
                >
              : TLetsEndPointType extends 'layout'
                ? NiceLayoutMiddlePoint<
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
                  >
                : TLetsEndPointType extends 'provider'
                  ? NiceProviderMiddlePoint<
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
                    >
                  : never

// nice end point

export type NiceRootEndPoint<
  TPointType extends 'root',
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
> = Pick<
  Point0<
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
  >,
  'attach' | 'lets' | 'point' | 'Infer'
>

export type NiceBaseEndPoint<
  TPointType extends 'base',
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
> = Pick<
  Point0<
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
  >,
  'lets' | 'point' | 'Infer'
>

export type WithFetchIfHasServerLoader<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TLiteral extends string,
> = TServerLoaderOutput extends LoaderOutput ? TLiteral | 'fetch' : TLiteral
export type WithQueryEndLiteralsIfSuitable<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLiteral extends string,
> = TQueryResultType extends 'query'
  ? WithFetchIfHasServerLoader<
      TServerLoaderOutput,
      TLiteral | 'useQuery' | 'getQueryKey' | 'getQueryOptions' | 'prefetchQuery' | 'execute' | 'executeDetailed'
    >
  : TQueryResultType extends 'infiniteQuery'
    ? WithFetchIfHasServerLoader<
        TServerLoaderOutput,
        | TLiteral
        | 'useInfiniteQuery'
        | 'getQueryKey'
        | 'getInfiniteQueryOptions'
        | 'prefetchInfiniteQuery'
        | 'execute'
        | 'executeDetailed'
      >
    : TLiteral

export type WithInputSchemaLiteralIfExists<
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TLiteral extends string,
> = TInputSchema extends InputSchema ? TLiteral | 'inputSchema' : TLiteral

export type NicePageEndPoint<
  TPointType extends 'page',
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
> = MountableComponent<TInputSchema, TProps, false> &
  Pick<
    Point0<
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
    >,
    WithInputSchemaLiteralIfExists<
      TInputSchema,
      WithQueryEndLiteralsIfSuitable<TServerLoaderOutput, TQueryResultType, 'point' | 'lets' | 'Infer' | 'Page' | 'X'>
    >
  >

export type NiceComponentEndPoint<
  TPointType extends 'component',
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
> = Pick<
  Point0<
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
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithQueryEndLiteralsIfSuitable<
      TServerLoaderOutput,
      TQueryResultType,
      'point' | 'lets' | 'Infer' | 'Component' | 'X'
    >
  >
>

export type NiceLayoutEndPoint<
  TPointType extends 'layout',
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
> = MountableComponent<TInputSchema, TProps, true> &
  Pick<
    Point0<
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
    >,
    WithInputSchemaLiteralIfExists<
      TInputSchema,
      WithQueryEndLiteralsIfSuitable<TServerLoaderOutput, TQueryResultType, 'point' | 'lets' | 'Infer' | 'Layout' | 'X'>
    >
  >

export type NiceQueryEndPoint<
  TPointType extends 'query',
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
> = Pick<
  Point0<
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
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithQueryEndLiteralsIfSuitable<TServerLoaderOutput, TQueryResultType, 'point' | 'lets' | 'Infer'>
  >
>

export type NiceInfiniteQueryEndPoint<
  TPointType extends 'infiniteQuery',
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
> = Pick<
  Point0<
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
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithQueryEndLiteralsIfSuitable<TServerLoaderOutput, TQueryResultType, 'point' | 'lets' | 'Infer'>
  >
>

export type NiceMutationEndPoint<
  TPointType extends 'mutation',
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
> = Pick<
  Point0<
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
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithFetchIfHasServerLoader<
      TServerLoaderOutput,
      'point' | 'lets' | 'getMutationOptions' | 'useMutation' | 'Infer' | 'execute' | 'executeDetailed'
    >
  >
>

export type NiceProviderEndPoint<
  TPointType extends 'provider',
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
> = Pick<
  Point0<
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
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithQueryEndLiteralsIfSuitable<
      TServerLoaderOutput,
      TQueryResultType,
      'point' | 'lets' | 'useValue' | 'getValue' | 'getValueSafe' | 'Provider' | 'X' | 'Infer'
    >
  >
>

export type NiceEndPoint<
  TPointType extends PointType,
  TLetsEndPointType extends EndPointType,
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
> = TPointType extends 'root'
  ? NiceRootEndPoint<
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
    >
  : TPointType extends 'base'
    ? NiceBaseEndPoint<
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
      >
    : TPointType extends 'page'
      ? NicePageEndPoint<
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
        >
      : TPointType extends 'component'
        ? NiceComponentEndPoint<
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
          >
        : TPointType extends 'query'
          ? NiceQueryEndPoint<
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
            >
          : TPointType extends 'infiniteQuery'
            ? NiceInfiniteQueryEndPoint<
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
              >
            : TPointType extends 'mutation'
              ? NiceMutationEndPoint<
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
                >
              : TPointType extends 'layout'
                ? NiceLayoutEndPoint<
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
                  >
                : TPointType extends 'provider'
                  ? NiceProviderEndPoint<
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
                    >
                  : never

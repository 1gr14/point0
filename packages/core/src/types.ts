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
export type EmptyCtx = Record<string, unknown> // TODO: use UndefinedCtx instead
export type UnknownCtx = Record<string, unknown>
export type UndefinedCtx = undefined
export type RequiredCtx = UnknownCtx | UndefinedCtx
export type Ctx = UnknownCtx | EmptyCtx
export type EmptyData = Record<string, unknown> // TODO: use UndefinedData instead
export type UnknownData = Record<string, unknown>
export type UndefinedData = undefined
export type Data = UnknownData | EmptyData
export type AnyInfiniteData = InfiniteData<any, any>
export type AnyDataOrInfiniteData = Data | (InfiniteData<any, any> & { [key: string]: unknown })
export type LastOutput = Data | Response
export type UndefinedLastOutput = undefined

export type QueryResultType = 'query' | 'infiniteQuery'
export type UndefinedQueryResultType = undefined

export type Props = Record<string, any>
export type UndefinedProps = undefined
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type EmptyProps = {}
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
> = {
  PointType: TPointType
  LetsEndPointType: TLetsEndPointType
  RequiredCtx: TRequiredCtx
  Ctx: TCtx
  Data: TData
  ClientData: TClientData
  RouteDefinition: TRouteDefinition
  PrevRouteDefinition: TPrevRouteDefinition
  InputSchema: TInputSchema
  Response: TResponse
  ClientResponse: TClientResponse
  QueryResultType: TQueryResultType
  Props: TProps
  InputParsed: InputParsed<TRouteDefinition, TInputSchema>
  InputRaw: InputRaw<TRouteDefinition, TInputSchema>
  LastServerOutput: TLastServerOutput
  LastClientOutput: TLastClientOutput
  QueriedData: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends Response
    ? never
    : FinalClientQueriedData<TQueryResultType, TData, TClientData>
  FetchOutput: TLastServerOutput extends LastOutput ? TLastServerOutput : never
  ClientExecuteResult: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends LastOutput
    ? FinalLastOutput<TLastServerOutput, TLastClientOutput>
    : never
  ClientExecuteDetailedResult: FinalLastOutput<TLastServerOutput, TLastClientOutput> extends LastOutput
    ? ClientExecuteDetailedResult<TData, TResponse, TClientData, TClientResponse, TLastServerOutput, TLastClientOutput>
    : never
  ServerExecuteResult: ServerExecuteResult<TCtx, TData, TResponse, TLastServerOutput>
}

// points types

export type PointType =
  | 'root'
  | 'base'
  | 'middleware'
  | 'page'
  | 'component'
  | 'response'
  | 'query'
  | 'infiniteQuery'
  | 'mutation'
  | 'layout'
  | 'clientMiddleware'
  | 'renderMiddleware'
  | 'provider'
export type EndPointType = Exclude<PointType, 'middleware' | 'clientMiddleware' | 'renderMiddleware'>
export type RenderablePointType = Extract<PointType, 'page' | 'component' | 'layout'>
export type IsEndPointType<TPointType extends PointType> = TPointType extends EndPointType ? true : false
export type UndefinedEndPointType = undefined

export type AnyPoint<
  TPointType extends PointType = PointType,
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponse extends Response | UndefinedResponse = any,
  TClientResponse extends Response | UndefinedResponse = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = any,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = any,
> = Point0<
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
>

export type BasePoint<
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponse extends UndefinedResponse = UndefinedResponse,
  TClientResponse extends UndefinedResponse = UndefinedResponse,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = any,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = any,
> = AnyPoint<
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
>

export type RootPoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponse extends UndefinedResponse = UndefinedResponse,
  TClientResponse extends UndefinedResponse = UndefinedResponse,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = any,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = any,
> = AnyPoint<
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
>

export type PagePoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  // TODO: Asap try figure out with any
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends UndefinedInputSchema = any,
  TResponse extends Response | UndefinedResponse = any,
  TClientResponse extends Response | UndefinedResponse = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = any,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = any,
> = AnyPoint<
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

export type LayoutPoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponse extends Response | UndefinedResponse = any,
  TClientResponse extends Response | UndefinedResponse = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = any,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = any,
> = AnyPoint<
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
>

export type EndPoint<
  TPointType extends EndPointType = EndPointType,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponse extends Response | UndefinedResponse = any,
  TClientResponse extends Response | UndefinedResponse = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = any,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = any,
> = AnyPoint<
  TPointType,
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

// utils

export type AppendCtx<TCtx extends UnknownCtx | UndefinedCtx, TAppend extends UnknownCtx> = TCtx extends Ctx
  ? Omit<TCtx, keyof TAppend> & TAppend
  : TAppend
export type PrependCtx<TCtx extends UnknownCtx | UndefinedCtx, TPrepend extends UnknownCtx> = TCtx extends Ctx
  ? Omit<TPrepend, keyof TCtx> & TPrepend
  : TPrepend
export type CurrentRouteDefinition<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = TRouteDefinition extends RouteDefinition ? TRouteDefinition : string

export type EmptyStringIfStandaloneSlash<TRouteDefinition extends RouteDefinition> = TRouteDefinition extends `/`
  ? ''
  : TRouteDefinition
export type StandaloneSlashIfUndefined<TRouteDefinition extends RouteDefinition | undefined> =
  TRouteDefinition extends undefined ? '/' : TRouteDefinition

export type DataOrEmptyData<TData extends Data | UndefinedData> = TData extends Data ? TData : EmptyData
export type FinalClientData<
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
> = TLastClientOutput extends Data ? TLastClientOutput : TLastServerOutput extends Data ? TLastServerOutput : never
export type FinalLastOutput<
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
> = TLastClientOutput extends LastOutput ? TLastClientOutput : TLastServerOutput

export type FinalClientQueriedData<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
> = TQueryResultType extends 'infiniteQuery'
  ? InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>
  : TQueryResultType extends 'query'
    ? FinalClientData<TLastServerOutput, TLastClientOutput>
    : FinalClientData<TLastServerOutput, TLastClientOutput>
export type HasAnyLoaderByOutputs<
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse,
> = TData extends Data
  ? true
  : TResponse extends Response
    ? true
    : TClientData extends Data
      ? true
      : TClientResponse extends Response
        ? true
        : false
export type HasAnyLoaderByLastOutput<
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
> = TLastServerOutput extends LastOutput ? true : TLastClientOutput extends LastOutput ? true : false

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
export type OmitRequiredCtxRequestProp<TRequiredCtx extends RequiredCtx = RequiredCtx> =
  TRequiredCtx extends UndefinedCtx
    ? UndefinedCtx
    : TRequiredCtx extends { request: Request }
      ? Omit<TRequiredCtx, 'request'>
      : TRequiredCtx
export type UndefinedCtxIfRequiredCtxContainsOnlyRequestProp<TRequiredCtx extends RequiredCtx = RequiredCtx> =
  TRequiredCtx extends UndefinedCtx
    ? UndefinedCtx
    : IsEmptyObject<OmitRequiredCtxRequestProp<TRequiredCtx>> extends true
      ? UndefinedCtx
      : TRequiredCtx

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

// export type ShowError<Message extends string> = { error: Message } & never

export type IfAnyThenElse<T, Then, Else = T> = 0 extends 1 & T ? Then : Else

export type OmitUnnamedKeys<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
}

export type ShowError<Message extends string> = {
  readonly __error__: Message
}

// fetching and queries

export type ClientExecuteDetailedResult<
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
> = {
  serverData: TData
  serverResponse: TResponse
  serverOutput: TLastServerOutput
  clientData: TClientData
  clientResponse: TClientResponse
  clientOutput: TLastClientOutput
  output: FinalLastOutput<TLastServerOutput, TLastClientOutput>
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
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TStatus extends 'pending' | 'error' | 'success',
> = TLastServerOutput extends UndefinedLastOutput
  ? never
  : TQueryResultType extends 'infiniteQuery'
    ? NarrowQueryComponentPropStatus<
        UseInfiniteQueryResult<InfiniteData<FetchOutput<TLastServerOutput>>, Error0>,
        TStatus
      >
    : TQueryResultType extends 'query'
      ? NarrowQueryComponentPropStatus<UseQueryResult<FetchOutput<TLastServerOutput>, Error0>, TStatus>
      : never
export type UseClientQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TStatus extends 'pending' | 'error' | 'success',
> = TLastClientOutput extends UndefinedLastOutput
  ? never
  : TQueryResultType extends 'infiniteQuery'
    ? NarrowQueryComponentPropStatus<UseInfiniteQueryResult<InfiniteData<TLastClientOutput>, Error0>, TStatus>
    : TQueryResultType extends 'query'
      ? NarrowQueryComponentPropStatus<UseQueryResult<TLastClientOutput, Error0>, TStatus>
      : never
export type UseCombinedQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TStatus extends 'pending' | 'error' | 'success',
> = TLastClientOutput extends UndefinedLastOutput
  ? never
  : TLastServerOutput extends UndefinedLastOutput
    ? never
    : TQueryResultType extends 'infiniteQuery'
      ? NarrowQueryComponentPropStatus<
          UseInfiniteQueryResult<InfiniteData<FinalClientData<TLastServerOutput, TLastClientOutput>>, Error0>,
          TStatus
        >
      : TQueryResultType extends 'query'
        ? NarrowQueryComponentPropStatus<
            UseQueryResult<FinalClientData<TLastServerOutput, TLastClientOutput>, Error0>,
            TStatus
          >
        : never
export type UsePointQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TStatus extends 'pending' | 'error' | 'success',
> = TLastServerOutput extends Data
  ? TLastClientOutput extends Data
    ? UseCombinedQueryResult<TQueryResultType, TLastServerOutput, TLastClientOutput, TStatus>
    : UseServerQueryResult<TQueryResultType, TLastServerOutput, TStatus>
  : TLastClientOutput extends Data
    ? UseClientQueryResult<TQueryResultType, TLastClientOutput, TStatus>
    : undefined

export type AnyUseLoaderResult<
  TStatus extends 'pending' | 'error' | 'success',
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TLocation extends AnyLocation,
> = IfAnyThenElse<
  TStatus,
  | UseLoaderResult<
      'success',
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TLocation
    >
  | UseLoaderResult<
      'error',
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TLocation
    >
  | UseLoaderResult<
      'pending',
      TQueryResultType,
      TLastServerOutput,
      TLastClientOutput,
      TInputSchema,
      TRouteDefinition,
      TLocation
    >,
  UseLoaderResult<
    TStatus,
    TQueryResultType,
    TLastServerOutput,
    TLastClientOutput,
    TInputSchema,
    TRouteDefinition,
    TLocation
  >
>

export type UseLoaderResult<
  TStatus extends 'pending' | 'error' | 'success',
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TLocation extends AnyLocation,
> = TStatus extends 'success'
  ? {
      data: FinalClientQueriedData<TQueryResultType, TLastServerOutput, TLastClientOutput>
      error: null
      loading: false
      query: HasAnyLoaderByLastOutput<TLastServerOutput, TLastClientOutput> extends true
        ? UsePointQueryResult<TQueryResultType, TLastServerOutput, TLastClientOutput, TStatus>
        : null
      input: InputParsed<TRouteDefinition, TInputSchema>
      inputRaw: InputRaw<TRouteDefinition, TInputSchema>
      location: TLocation
    }
  : TStatus extends 'pending'
    ? {
        data: undefined
        error: null
        loading: true
        query: HasAnyLoaderByLastOutput<TLastServerOutput, TLastClientOutput> extends true
          ? UsePointQueryResult<TQueryResultType, TLastServerOutput, TLastClientOutput, TStatus>
          : null
        input: InputParsed<TRouteDefinition, TInputSchema>
        inputRaw: InputRaw<TRouteDefinition, TInputSchema>
        location: TLocation
      }
    : TStatus extends 'error'
      ? {
          data: undefined
          error: Error0
          loading: true
          query: HasAnyLoaderByLastOutput<TLastServerOutput, TLastClientOutput> extends true
            ? UsePointQueryResult<TQueryResultType, TLastServerOutput, TLastClientOutput, TStatus>
            : null
          input: InputParsed<TRouteDefinition, TInputSchema> | null
          inputRaw: InputRaw<TRouteDefinition, TInputSchema>
          location: TLocation
        }
      : never
export type UnqueriedLoaderResult<
  TStatus extends 'pending' | 'error' | 'success',
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TLocation extends AnyLocation,
> = TStatus extends 'success'
  ? {
      data: FinalClientData<TLastServerOutput, TLastClientOutput>
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
          loading: true
          input: InputParsed<TRouteDefinition, TInputSchema> | null
          inputRaw: InputRaw<TRouteDefinition, TInputSchema>
          location: TLocation
        }
      : never
export type AnyUnqueriedLoaderResult<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TLocation extends AnyLocation = AnyLocation,
> = IfAnyThenElse<
  TStatus,
  | UnqueriedLoaderResult<'success', TLastServerOutput, TLastClientOutput, TInputSchema, TRouteDefinition, TLocation>
  | UnqueriedLoaderResult<'error', TLastServerOutput, TLastClientOutput, TInputSchema, TRouteDefinition, TLocation>
  | UnqueriedLoaderResult<'pending', TLastServerOutput, TLastClientOutput, TInputSchema, TRouteDefinition, TLocation>,
  UnqueriedLoaderResult<TStatus, TLastServerOutput, TLastClientOutput, TInputSchema, TRouteDefinition, TLocation>
>

// endpoint components

export type PageComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = UseLoaderResult<
  'success',
  TQueryResultType,
  TLastServerOutput,
  TLastClientOutput,
  TInputSchema,
  TRouteDefinition,
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
> & { props: FinalProps<TProps>; location: ExactLocation<CurrentRouteDefinition<TRouteDefinition>> }
export type PageComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  PageComponentProps<TQueryResultType, TLastServerOutput, TLastClientOutput, TRouteDefinition, TInputSchema, TProps>
>
export type UndefinedPageComponent = undefined

export type LayoutComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = UseLoaderResult<
  'success',
  TQueryResultType,
  TLastServerOutput,
  TLastClientOutput,
  TInputSchema,
  TRouteDefinition,
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>> | ChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
> & { props: FinalProps<TProps>; children: React.ReactNode }
export type LayoutComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  LayoutComponentProps<TQueryResultType, TLastServerOutput, TLastClientOutput, TRouteDefinition, TInputSchema, TProps>
>
export type UndefinedLayoutComponent = undefined

export type ComponentComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = UseLoaderResult<
  'success',
  TQueryResultType,
  TLastServerOutput,
  TLastClientOutput,
  TInputSchema,
  UndefinedRouteDefinition,
  AnyLocation
> & { props: FinalProps<TProps> }
export type ComponentComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  ComponentComponentProps<TQueryResultType, TLastServerOutput, TLastClientOutput, TInputSchema, TProps>
>
export type UndefinedComponentComponent = undefined

export type MountableComponentProps<
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TWithChildren extends boolean | null,
> = (TInputSchema extends InputSchemaZod
  ? IsInputOptional<UndefinedRouteDefinition, TInputSchema> extends true
    ? { input?: ZodOutput<TInputSchema> } & FinalProps<TProps>
    : { input: ZodOutput<TInputSchema> } & FinalProps<TProps>
  : FinalProps<TProps>) &
  (TWithChildren extends true
    ? { children: React.ReactNode }
    : TWithChildren extends null
      ? { children?: React.ReactNode }
      : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        {})
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
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = {
  type: TType
  props: FinalProps<TProps>
} & UseLoaderResult<
  'pending',
  TQueryResultType,
  TLastServerOutput,
  TLastClientOutput,
  TInputSchema,
  TRouteDefinition,
  AnyLocation
>
export type LoadingComponentType<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  LoadingComponentProps<
    TType,
    TQueryResultType,
    TLastServerOutput,
    TLastClientOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
>

export type ErrorComponentProps<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = {
  type: TType
  props: FinalProps<TProps>
} & UseLoaderResult<
  'error',
  TQueryResultType,
  TLastServerOutput,
  TLastClientOutput,
  TInputSchema,
  TRouteDefinition,
  AnyLocation
>
export type ErrorComponentType<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  ErrorComponentProps<
    TType,
    TQueryResultType,
    TLastServerOutput,
    TLastClientOutput,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
>

// export type WrapperComponentType = React.ComponentType<{ children: React.ReactNode }>
export type WrapperComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = AnyUseLoaderResult<
  any,
  TQueryResultType,
  TLastServerOutput,
  TLastClientOutput,
  TInputSchema,
  TRouteDefinition,
  AnyLocation
> & {
  props: FinalProps<TProps>
  children: React.ReactNode
}
export type WrapperComponentType<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  WrapperComponentProps<TQueryResultType, TLastServerOutput, TLastClientOutput, TInputSchema, TRouteDefinition, TProps>
>

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
  TPoint extends NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>,
>(
  point: TPoint,
  ...args: IsInputOptional<TPoint['Infer']['RouteDefinition'], TPoint['Infer']['InputSchema']> extends true
    ? [input?: InputRaw<TPoint['Infer']['RouteDefinition'], TPoint['Infer']['InputSchema']>]
    : [input: InputRaw<TPoint['Infer']['RouteDefinition'], TPoint['Infer']['InputSchema']>]
) => Promise<
  ServerExecuteResult<TPoint['Infer']['Ctx'], DataOrEmptyData<TPoint['Infer']['Data']>, TPoint['Infer']['Response']>
>
export type ServerExecuteResult<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
> =
  | {
      ctx: TCtx
      data: DataOrEmptyData<TData>
      head: ResolvableHead[]
      response: TResponse
      error: null
      status: number
      output: TLastServerOutput
    }
  | {
      ctx: UnknownCtx
      data: UnknownData
      head: ResolvableHead[]
      response: UndefinedResponse | TResponse
      error: Error0
      status: number
      output: LastOutput | UndefinedLastOutput
    }

export type CtxFnOptions<
  TCtxInput extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtxInput
  data: DataOrEmptyData<TData>
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
  execute: ServerExecuteFn
  response: TResponse
}
export type CtxFn<
  TCtxInput extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCtxOutput extends Ctx = Ctx,
> = (
  props: CtxFnOptions<TCtxInput, TData, TResponse, TRouteDefinition, TInputSchema>,
) => Promise<TCtxOutput> | TCtxOutput
export type CtxFnOutput<TCtxFn extends CtxFn> = Awaited<ReturnType<TCtxFn>>
export type InferCtxFnOutput<TCtxFn> = TCtxFn extends CtxFn<any, any, any, infer TCtxFnOutput> ? TCtxFnOutput : never

export type LoaderFnOptions<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: DataOrEmptyData<TData>
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
  execute: ServerExecuteFn
  response: TResponse
}
export type LoaderFn<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TNewServerLastOutput extends LastOutput = LastOutput,
> = (
  options: LoaderFnOptions<TCtx, TData, TResponse, TRouteDefinition, TInputSchema>,
) =>
  | Promise<[number, TNewServerLastOutput]>
  | [number, TNewServerLastOutput]
  | Promise<TNewServerLastOutput>
  | TNewServerLastOutput

export type CtxLoaderFnOptions<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: DataOrEmptyData<TData>
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
  execute: ServerExecuteFn
  response: TResponse
  output: TLastServerOutput
}
export type CtxLoaderFn<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TNewCtx extends Ctx | UndefinedCtx = Ctx | UndefinedCtx,
  TNewData extends Data | UndefinedData = Data | UndefinedData,
  TNewResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TNewLastOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
> = (
  options: CtxLoaderFnOptions<TCtx, TData, TResponse, TLastServerOutput, TRouteDefinition, TInputSchema>,
) =>
  | Promise<
      { ctx?: TNewCtx; data?: TNewData; status?: number; response?: TNewResponse; output?: TNewLastOutput } | undefined
    >
  | { ctx?: TNewCtx; data?: TNewData; status?: number; response?: TNewResponse; output?: TNewLastOutput }
  | undefined

export type ServerExecuteAction<
  TType extends 'ctx' | 'loader' | 'ctxLoader' | 'input' = 'ctx' | 'loader' | 'ctxLoader' | 'input',
> = TType extends 'ctx'
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
    : TType extends 'ctxLoader'
      ? {
          type: 'ctxLoader'
          fn: CtxLoaderFn
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
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
> = {
  // server can return to client only data or response
  data: TLastClientOutput extends undefined
    ? TLastServerOutput extends Response
      ? EmptyData
      : TLastServerOutput extends Data
        ? TLastServerOutput
        : EmptyData
    : DataOrEmptyData<TClientData>
  location: ClientExecuteActionLocation<TLetsEndPointType, TRouteDefinition>
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
  response: TLastClientOutput extends undefined
    ? TLastServerOutput extends Response
      ? TLastServerOutput
      : UndefinedResponse
    : TClientResponse
}
export type ClientLoaderFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TNewClientLastOutput extends LastOutput = LastOutput,
> = (
  options: ClientLoaderFnOptions<
    TLetsEndPointType,
    TRouteDefinition,
    TInputSchema,
    TClientData,
    TClientResponse,
    TLastServerOutput,
    TLastClientOutput
  >,
) => Promise<TNewClientLastOutput> | TNewClientLastOutput

export type ProviderValueSetterFnOptions<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
> = {
  data: FinalClientQueriedData<TQueryResultType, TLastServerOutput, TLastClientOutput>
  location: ClientExecuteActionLocation<TLetsEndPointType, TRouteDefinition>
}
export type ProviderValueSetterFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TNewClientData extends Data,
> = (
  options: ProviderValueSetterFnOptions<
    TLetsEndPointType,
    TQueryResultType,
    TRouteDefinition,
    TLastServerOutput,
    TLastClientOutput
  >,
) => TNewClientData

// head

export type SuccessHeadFn<
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = (
  options: MiddlewareHeadFnOptions<'success', TLastServerOutput, TLastClientOutput, TInputSchema, TRouteDefinition>,
) => ResolvableHead | string

export type ErrorHeadFn<
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = (
  options: MiddlewareHeadFnOptions<'error', TLastServerOutput, TLastClientOutput, TInputSchema, TRouteDefinition>,
) => ResolvableHead | string

export type LoadingHeadFn<
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = (
  options: MiddlewareHeadFnOptions<'pending', TLastServerOutput, TLastClientOutput, TInputSchema, TRouteDefinition>,
) => ResolvableHead | string

export type MiddlewareHeadFnOptions<
  TStatus extends 'pending' | 'error' | 'success',
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = AnyUnqueriedLoaderResult<
  TStatus,
  TLastServerOutput,
  TLastClientOutput,
  TInputSchema,
  TRouteDefinition,
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
>
export type MiddlewareHeadFn<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TLastServerOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TLastClientOutput extends LastOutput | UndefinedLastOutput = LastOutput | UndefinedLastOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = (
  options: MiddlewareHeadFnOptions<TStatus, TLastServerOutput, TLastClientOutput, TInputSchema, TRouteDefinition>,
) => ResolvableHead | string

export type FetchOutput<TLastServerOutput extends LastOutput | UndefinedLastOutput> = TLastServerOutput

export type FetchOutputType = 'data' | 'response' | 'queryClientDehydratedState'

// mountable app

export type AppProps = { points: PointsManager }
export type AppComponent = (props: AppProps) => React.ReactElement

// transformer

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

export type CutServerLoadersIfClientMiddleware<
  TPointType extends PointType,
  TLiteral extends string,
> = TPointType extends 'clientMiddleware' ? Exclude<TLiteral, 'ctx' | 'loader' | 'ctxLoader'> : TLiteral

export type NiceRootMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'root',
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
> = Pick<
  Point0<
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
  >,
  CutServerLoadersIfClientMiddleware<
    TPointType,
    | 'root'
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
    | 'ctxLoader'
    | 'clientLoader'
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
> = Pick<
  Point0<
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
  >,
  CutServerLoadersIfClientMiddleware<
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
    | 'ctxLoader'
    | 'clientLoader'
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
> = Pick<
  Point0<
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
  >,
  TPointType extends 'middleware' | 'clientMiddleware'
    ? CutServerLoadersIfClientMiddleware<
        TPointType,
        | 'page'
        | 'fetchOptions'
        | 'error'
        | 'loading'
        | 'wrapper'
        | 'input'
        | 'ctx'
        | 'loader'
        | 'ctxLoader'
        | 'clientLoader'
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
    : 'page' | 'error' | 'loading' | 'wrapper' | 'point' | 'Infer'
>

export type NiceComponentMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'component',
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
> = Pick<
  Point0<
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
  >,
  TPointType extends 'middleware' | 'clientMiddleware'
    ? CutServerLoadersIfClientMiddleware<
        TPointType,
        | 'component'
        | 'fetchOptions'
        | 'error'
        | 'loading'
        | 'wrapper'
        | 'input'
        | 'ctx'
        | 'loader'
        | 'ctxLoader'
        | 'clientLoader'
        | 'props'
        | 'onPrefetch'
        | 'point'
        | 'Infer'
        | 'query'
        | 'infiniteQuery'
      >
    : 'component' | 'error' | 'loading' | 'wrapper' | 'point' | 'Infer'
>

export type NiceQueryMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'query',
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
> = Pick<
  Point0<
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
  >,
  CutServerLoadersIfClientMiddleware<
    TPointType,
    | 'query'
    | 'fetchOptions'
    | 'input'
    | 'ctx'
    | 'loader'
    | 'ctxLoader'
    | 'clientLoader'
    | 'onPrefetch'
    | 'point'
    | 'Infer'
  >
>

export type NiceInfiniteQueryMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'infiniteQuery',
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
> = Pick<
  Point0<
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
  >,
  CutServerLoadersIfClientMiddleware<
    TPointType,
    | 'infiniteQuery'
    | 'fetchOptions'
    | 'input'
    | 'ctx'
    | 'loader'
    | 'ctxLoader'
    | 'clientLoader'
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
> = Pick<
  Point0<
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
  >,
  CutServerLoadersIfClientMiddleware<
    TPointType,
    | 'mutation'
    // | 'asFormData'
    | 'fetchOptions'
    | 'input'
    | 'ctx'
    | 'loader'
    | 'ctxLoader'
    | 'clientLoader'
    | 'point'
    | 'Infer'
  >
>

export type NiceLayoutMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'layout',
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
> = Pick<
  Point0<
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
  >,
  TPointType extends 'middleware' | 'clientMiddleware'
    ? CutServerLoadersIfClientMiddleware<
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
        | 'input'
        | 'ctx'
        | 'loader'
        | 'ctxLoader'
        | 'clientLoader'
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
    : 'layout' | 'loading' | 'error' | 'wrapper' | 'point' | 'Infer'
>

export type NiceProviderMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends 'provider',
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
> = TPointType extends 'middleware' | 'clientMiddleware'
  ? Pick<
      Point0<
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
      >,
      CutServerLoadersIfClientMiddleware<
        TPointType,
        | 'provider'
        | 'fetchOptions'
        | 'input'
        | 'ctx'
        | 'loader'
        | 'ctxLoader'
        | 'clientLoader'
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
  : 'provider' | 'error' | 'loading' | 'wrapper' | 'point' | 'Infer'

export type NiceMiddlePoint<
  TPointType extends PointType,
  TLetsEndPointType extends EndPointType,
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
> = TLetsEndPointType extends 'root'
  ? NiceRootMiddlePoint<
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
    >
  : TLetsEndPointType extends 'base'
    ? NiceBaseMiddlePoint<
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
      >
    : TLetsEndPointType extends 'page'
      ? NicePageMiddlePoint<
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
        >
      : TLetsEndPointType extends 'component'
        ? NiceComponentMiddlePoint<
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
          >
        : TLetsEndPointType extends 'query'
          ? NiceQueryMiddlePoint<
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
            >
          : TLetsEndPointType extends 'infiniteQuery'
            ? NiceInfiniteQueryMiddlePoint<
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
              >
            : TLetsEndPointType extends 'mutation'
              ? NiceMutationMiddlePoint<
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
                >
              : TLetsEndPointType extends 'layout'
                ? NiceLayoutMiddlePoint<
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
                  >
                : TLetsEndPointType extends 'provider'
                  ? NiceProviderMiddlePoint<
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
                    >
                  : never

// nice end point

export type NiceRootEndPoint<
  TPointType extends 'root',
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
> = Pick<
  Point0<
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
  >,
  'attach' | 'lets' | 'point' | 'Infer' | 'scope' | 'type' | 'name'
>

export type NiceBaseEndPoint<
  TPointType extends 'base',
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
> = Pick<
  Point0<
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
  >,
  'lets' | 'point' | 'Infer' | 'scope' | 'type' | 'name'
>

export type WithFetchIfHasServerLoader<
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TLiteral extends string,
> = TLastServerOutput extends LastOutput ? TLiteral | 'fetch' : TLiteral
export type WithQueryEndLiteralsIfSuitable<
  TLastServerOutput extends LastOutput | UndefinedLastOutput,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLiteral extends string,
> = TQueryResultType extends 'query'
  ? WithFetchIfHasServerLoader<
      TLastServerOutput,
      TLiteral | 'useQuery' | 'getQueryKey' | 'getQueryOptions' | 'prefetchQuery' | 'execute' | 'executeDetailed'
    >
  : TQueryResultType extends 'infiniteQuery'
    ? WithFetchIfHasServerLoader<
        TLastServerOutput,
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
> = MountableComponent<TInputSchema, TProps, false> &
  Pick<
    Point0<
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
    >,
    WithInputSchemaLiteralIfExists<
      TInputSchema,
      WithQueryEndLiteralsIfSuitable<
        TLastServerOutput,
        TQueryResultType,
        'point' | 'lets' | 'Infer' | 'scope' | 'type' | 'name'
      >
    >
  >

export type NiceComponentEndPoint<
  TPointType extends 'component',
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
> = MountableComponent<TInputSchema, TProps, false> &
  Pick<
    Point0<
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
    >,
    WithInputSchemaLiteralIfExists<
      TInputSchema,
      WithQueryEndLiteralsIfSuitable<
        TLastServerOutput,
        TQueryResultType,
        'point' | 'lets' | 'Infer' | 'scope' | 'type' | 'name'
      >
    >
  >

export type NiceLayoutEndPoint<
  TPointType extends 'layout',
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
> = MountableComponent<TInputSchema, TProps, true> &
  Pick<
    Point0<
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
    >,
    WithInputSchemaLiteralIfExists<
      TInputSchema,
      WithQueryEndLiteralsIfSuitable<
        TLastServerOutput,
        TQueryResultType,
        'point' | 'lets' | 'Infer' | 'scope' | 'type' | 'name'
      >
    >
  >

export type NiceQueryEndPoint<
  TPointType extends 'query',
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
> = Pick<
  Point0<
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
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithQueryEndLiteralsIfSuitable<
      TLastServerOutput,
      TQueryResultType,
      'point' | 'lets' | 'Infer' | 'scope' | 'type' | 'name'
    >
  >
>

export type NiceInfiniteQueryEndPoint<
  TPointType extends 'infiniteQuery',
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
> = Pick<
  Point0<
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
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithQueryEndLiteralsIfSuitable<
      TLastServerOutput,
      TQueryResultType,
      'point' | 'lets' | 'Infer' | 'scope' | 'type' | 'name'
    >
  >
>

export type NiceMutationEndPoint<
  TPointType extends 'mutation',
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
> = Pick<
  Point0<
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
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithFetchIfHasServerLoader<
      TLastServerOutput,
      | 'point'
      | 'lets'
      | 'getMutationOptions'
      | 'useMutation'
      | 'Infer'
      | 'execute'
      | 'executeDetailed'
      | 'scope'
      | 'type'
      | 'name'
    >
  >
>

export type NiceProviderEndPoint<
  TPointType extends 'provider',
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
> = Pick<
  Point0<
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
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithQueryEndLiteralsIfSuitable<
      TLastServerOutput,
      TQueryResultType,
      'point' | 'lets' | 'useValue' | 'getValue' | 'getValueSafe' | 'Provider' | 'Infer' | 'scope' | 'type' | 'name'
    >
  >
>

export type NiceEndPoint<
  TPointType extends PointType,
  TLetsEndPointType extends EndPointType,
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
> = TPointType extends 'root'
  ? NiceRootEndPoint<
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
    >
  : TPointType extends 'base'
    ? NiceBaseEndPoint<
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
      >
    : TPointType extends 'page'
      ? NicePageEndPoint<
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
        >
      : TPointType extends 'component'
        ? NiceComponentEndPoint<
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
          >
        : TPointType extends 'query'
          ? NiceQueryEndPoint<
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
            >
          : TPointType extends 'infiniteQuery'
            ? NiceInfiniteQueryEndPoint<
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
              >
            : TPointType extends 'mutation'
              ? NiceMutationEndPoint<
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
                >
              : TPointType extends 'layout'
                ? NiceLayoutEndPoint<
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
                  >
                : TPointType extends 'provider'
                  ? NiceProviderEndPoint<
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
                    >
                  : never

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
  serverOrClient: 'server' | 'client' | 'combined',
  pointType: PointType,
  pointName: PointName,
  outputType: FetchOutputType,
  finiteOrInfinite: 'finite' | 'infinite',
  input: string,
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
  LastDataOrResponse: TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse = any,
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
  TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse = any,
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
  TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse = any,
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
  TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse = any,
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
  TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse = any,
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
  TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse = any,
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
  TLastDataOrResponse
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

export type FinalData<TData extends Data | UndefinedData> = TData extends UndefinedData ? EmptyData : TData
export type FinalClientData<
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
> = TClientData extends Data ? TClientData : FinalData<TData>

export type FinalClientQueriedData<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
> = TQueryResultType extends 'infiniteQuery'
  ? InfiniteData<FinalClientData<TData, TClientData>>
  : TQueryResultType extends 'query'
    ? FinalClientData<TData, TClientData>
    : FinalClientData<TData, TClientData>
export type HasAnyLoader<
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
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TStatus extends 'pending' | 'error' | 'success',
> = TData extends UndefinedData
  ? undefined
  : TQueryResultType extends 'infiniteQuery'
    ? NarrowQueryComponentPropStatus<
        UseInfiniteQueryResult<InfiniteData<FetchOutput<TResponse, TData>>, Error0>,
        TStatus
      >
    : TQueryResultType extends 'query'
      ? NarrowQueryComponentPropStatus<UseQueryResult<FetchOutput<TResponse, TData>, Error0>, TStatus>
      : undefined
export type UseClientQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
  TStatus extends 'pending' | 'error' | 'success',
> = TClientData extends UndefinedData
  ? undefined
  : TQueryResultType extends 'infiniteQuery'
    ? NarrowQueryComponentPropStatus<
        UseInfiniteQueryResult<InfiniteData<FinalClientData<TData, TClientData>>, Error0>,
        TStatus
      >
    : TQueryResultType extends 'query'
      ? NarrowQueryComponentPropStatus<UseQueryResult<FinalClientData<TData, TClientData>, Error0>, TStatus>
      : undefined
export type UseCombinedQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
  TStatus extends 'pending' | 'error' | 'success',
> = TClientData extends UndefinedData
  ? undefined
  : TData extends UndefinedData
    ? undefined
    : TQueryResultType extends 'infiniteQuery'
      ? NarrowQueryComponentPropStatus<
          UseInfiniteQueryResult<InfiniteData<FinalClientData<TData, TClientData>>, Error0>,
          TStatus
        >
      : TQueryResultType extends 'query'
        ? NarrowQueryComponentPropStatus<UseQueryResult<FinalClientData<TData, TClientData>, Error0>, TStatus>
        : undefined
export type UsePointQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TStatus extends 'pending' | 'error' | 'success',
> = TData extends Data
  ? TClientData extends Data
    ? UseCombinedQueryResult<TQueryResultType, TData, TClientData, TStatus>
    : UseServerQueryResult<TQueryResultType, TData, TResponse, TStatus>
  : TClientData extends Data
    ? UseClientQueryResult<TQueryResultType, TData, TClientData, TStatus>
    : undefined
export type SpecificUseLoaderResult<
  TStatus extends 'pending' | 'error' | 'success',
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TLocation extends AnyLocation,
  // > = Omit<
  //   UseLoaderResult<TQueryResultType, TData, TResponse, TClientData, TInputSchema, TRouteDefinition, TStatus>,
  //   'data' | 'error' | 'loading' | 'location'
  // > & { location: TLocation } & (TStatus extends 'success'
  //     ? 'pending' extends TStatus
  //       ? 'error' extends TStatus
  //         ? {
  //             data: FinalClientQueriedData<TQueryResultType, TData, TClientData> | undefined
  //             loading: boolean
  //             error: Error0 | null
  //           }
  //         : { data: FinalClientQueriedData<TQueryResultType, TData, TClientData>; loading: boolean }
  //       : 'error' extends TStatus
  //         ? { data: FinalClientQueriedData<TQueryResultType, TData, TClientData> | undefined; error: Error0 | null }
  //         : { data: FinalClientQueriedData<TQueryResultType, TData, TClientData> }
  //     : // Has no success
  //       TStatus extends 'pending'
  //       ? 'error' extends TStatus
  //         ? { loading: boolean; error: Error0 | null }
  //         : { loading: true }
  //       : TStatus extends 'error'
  //         ? { error: Error0 }
  //         : never)
> = IfAnyThenElse<
  TStatus,
  | UseLoaderResult<
      'success',
      TQueryResultType,
      TData,
      TResponse,
      TClientData,
      TClientResponse,
      TInputSchema,
      TRouteDefinition,
      TLocation
    >
  | UseLoaderResult<
      'error',
      TQueryResultType,
      TData,
      TResponse,
      TClientData,
      TClientResponse,
      TInputSchema,
      TRouteDefinition,
      TLocation
    >
  | UseLoaderResult<
      'pending',
      TQueryResultType,
      TData,
      TResponse,
      TClientData,
      TClientResponse,
      TInputSchema,
      TRouteDefinition,
      TLocation
    >,
  UseLoaderResult<
    TStatus,
    TQueryResultType,
    TData,
    TResponse,
    TClientData,
    TClientResponse,
    TInputSchema,
    TRouteDefinition,
    TLocation
  >
>

export type UseLoaderResult<
  TStatus extends 'pending' | 'error' | 'success',
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TLocation extends AnyLocation,
  // > = {
  //   data: IfAnyThenElse<
  //     TStatus,
  //     FinalClientQueriedData<TQueryResultType, TData, TClientData> | undefined,
  //     TStatus extends 'success' ? FinalClientQueriedData<TQueryResultType, TData, TClientData> | undefined : undefined
  //   >
  //   error: IfAnyThenElse<TStatus, Error0 | null, TStatus extends 'error' ? Error0 : null>
  //   loading: IfAnyThenElse<TStatus, boolean, TStatus extends 'pending' ? true : false>
  //   query: UsePointQueryResult<TQueryResultType, TData, TResponse, TClientData, TStatus>
  //   input: InputParsed<TRouteDefinition, TInputSchema>
  //   inputRaw: InputRaw<TRouteDefinition, TInputSchema>
  //   location: AnyLocation
  // }
> = TStatus extends 'success'
  ? {
      data: FinalClientQueriedData<TQueryResultType, TData, TClientData>
      error: null
      loading: false
      query: HasAnyLoader<TData, TResponse, TClientData, TClientResponse> extends true
        ? UsePointQueryResult<TQueryResultType, TData, TResponse, TClientData, TStatus>
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
        query: HasAnyLoader<TData, TResponse, TClientData, TClientResponse> extends true
          ? UsePointQueryResult<TQueryResultType, TData, TResponse, TClientData, TStatus>
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
          query: HasAnyLoader<TData, TResponse, TClientData, TClientResponse> extends true
            ? UsePointQueryResult<TQueryResultType, TData, TResponse, TClientData, TStatus>
            : null
          input: InputParsed<TRouteDefinition, TInputSchema> | null
          inputRaw: InputRaw<TRouteDefinition, TInputSchema>
          location: TLocation
        }
      : never

// endpoint components

export type PageComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = SpecificUseLoaderResult<
  'success',
  TQueryResultType,
  TData,
  TResponse,
  TClientData,
  TClientResponse,
  TInputSchema,
  TRouteDefinition,
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
> & { props: FinalProps<TProps>; location: ExactLocation<CurrentRouteDefinition<TRouteDefinition>> }
export type PageComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  PageComponentProps<
    TQueryResultType,
    TData,
    TResponse,
    TClientData,
    TClientResponse,
    TRouteDefinition,
    TInputSchema,
    TProps
  >
>
export type UndefinedPageComponent = undefined

export type LayoutComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = SpecificUseLoaderResult<
  'success',
  TQueryResultType,
  TData,
  TResponse,
  TClientData,
  TClientResponse,
  TInputSchema,
  TRouteDefinition,
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>> | ChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
> & { props: FinalProps<TProps>; children: React.ReactNode }
export type LayoutComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  LayoutComponentProps<
    TQueryResultType,
    TData,
    TResponse,
    TClientData,
    TClientResponse,
    TRouteDefinition,
    TInputSchema,
    TProps
  >
>
export type UndefinedLayoutComponent = undefined

export type ComponentComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = SpecificUseLoaderResult<
  'success',
  TQueryResultType,
  TData,
  TResponse,
  TClientData,
  TClientResponse,
  TInputSchema,
  UndefinedRouteDefinition,
  AnyLocation
> & { props: FinalProps<TProps> }
export type ComponentComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  ComponentComponentProps<TQueryResultType, TData, TResponse, TClientData, TClientResponse, TInputSchema, TProps>
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
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = {
  type: TType
  props: FinalProps<TProps>
} & SpecificUseLoaderResult<
  'pending',
  TQueryResultType,
  TData,
  TResponse,
  TClientData,
  TClientResponse,
  TInputSchema,
  TRouteDefinition,
  AnyLocation
>
export type LoadingComponentType<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  LoadingComponentProps<
    TType,
    TQueryResultType,
    TData,
    TResponse,
    TClientData,
    TClientResponse,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
>

export type ErrorComponentProps<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = {
  type: TType
  props: FinalProps<TProps>
} & SpecificUseLoaderResult<
  'error',
  TQueryResultType,
  TData,
  TResponse,
  TClientData,
  TClientResponse,
  TInputSchema,
  TRouteDefinition,
  AnyLocation
>
export type ErrorComponentType<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  ErrorComponentProps<
    TType,
    TQueryResultType,
    TData,
    TResponse,
    TClientData,
    TClientResponse,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
>

// export type WrapperComponentType = React.ComponentType<{ children: React.ReactNode }>
export type WrapperComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = SpecificUseLoaderResult<
  any,
  TQueryResultType,
  TData,
  TResponse,
  TClientData,
  TClientResponse,
  TInputSchema,
  TRouteDefinition,
  AnyLocation
> & {
  props: FinalProps<TProps>
  children: React.ReactNode
}
export type WrapperComponentType<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  WrapperComponentProps<
    TQueryResultType,
    TData,
    TResponse,
    TClientData,
    TClientResponse,
    TInputSchema,
    TRouteDefinition,
    TProps
  >
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
export type ResponseFnOptions<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: FinalData<TData>
  input: InputParsed<TRouteDefinition, TInputSchema>
}
export type ResponseFn<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponse extends Response = Response,
> = (options: ResponseFnOptions<TCtx, TData, TRouteDefinition, TInputSchema>) => Promise<TResponse> | TResponse
export type ResponseFnOutput<TResponseFn extends ResponseFn> = Awaited<ReturnType<TResponseFn>>

export type InputFnOptions<TInputSchema extends InputSchema = InputSchema> = {
  inputRaw: InputRaw<RouteDefinition | UndefinedRouteDefinition, TInputSchema>
}
export type InputFn<TInputSchema extends InputSchema = InputSchema> = (
  options: InputFnOptions<TInputSchema>,
) => InputParsed<RouteDefinition | UndefinedRouteDefinition, TInputSchema>

export type ServerExtractFn = <
  TPoint extends NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any>,
>(
  point: TPoint,
  ...args: IsInputOptional<TPoint['Infer']['RouteDefinition'], TPoint['Infer']['InputSchema']> extends true
    ? [input?: InputRaw<TPoint['Infer']['RouteDefinition'], TPoint['Infer']['InputSchema']>]
    : [input: InputRaw<TPoint['Infer']['RouteDefinition'], TPoint['Infer']['InputSchema']>]
) => Promise<
  ServerExtractResult<TPoint['Infer']['Ctx'], FinalData<TPoint['Infer']['Data']>, TPoint['Infer']['Response']>
>
export type ServerExtractResult<
  TCtx extends Ctx = Ctx,
  TData extends Data = Data,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
> =
  | {
      ctx: TCtx
      data: TData
      head: ResolvableHead[]
      response: TResponse
      error: null
      status: number
    }
  | {
      ctx: UnknownCtx
      data: UnknownData
      head: ResolvableHead[]
      response: UndefinedResponse | TResponse
      error: Error0
      status: number
    }

// export type CtxFnOptions<
//   TCtxInput extends Ctx = Ctx,
//   TData extends Data | UndefinedData = Data | UndefinedData,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = {
//   ctx: TCtxInput
//   data: FinalData<TData>
//   input: InputParsed<TRouteDefinition, TInputSchema>
//   inputRaw: InputRawUnknown
//   extract: ServerExtractFn
// }
// export type CtxFn<
//   TCtxInput extends Ctx = Ctx,
//   TData extends Data | UndefinedData = Data | UndefinedData,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TCtxOutput extends Ctx = Ctx,
// > = (props: CtxFnOptions<TCtxInput, TData, TRouteDefinition, TInputSchema>) => Promise<TCtxOutput> | TCtxOutput
// export type CtxFnOutput<TCtxFn extends CtxFn> = Awaited<ReturnType<TCtxFn>>
// export type InferCtxFnOutput<TCtxFn> = TCtxFn extends CtxFn<any, any, any, infer TCtxFnOutput> ? TCtxFnOutput : never

// export type LoaderFnOptions<
//   TCtx extends Ctx = Ctx,
//   TData extends Data | UndefinedData = Data | UndefinedData,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = {
//   ctx: TCtx
//   data: FinalData<TData>
//   input: InputParsed<TRouteDefinition, TInputSchema>
//   inputRaw: InputRawUnknown
//   extract: ServerExtractFn
// }
// export type LoaderFn<
//   TCtx extends Ctx = Ctx,
//   TData extends Data | UndefinedData = Data | UndefinedData,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TDataOutput extends Data = Data,
// > = (
//   options: LoaderFnOptions<TCtx, TData, TRouteDefinition, TInputSchema>,
// ) => Promise<[number, TDataOutput]> | [number, TDataOutput] | Promise<TDataOutput> | TDataOutput

// export type CtxLoaderFnOptions<
//   TCtx extends Ctx = Ctx,
//   TData extends Data | UndefinedData = Data | UndefinedData,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = {
//   ctx: TCtx
//   data: FinalData<TData>
//   input: InputParsed<TRouteDefinition, TInputSchema>
//   inputRaw: InputRawUnknown
//   extract: ServerExtractFn
// }
// export type CtxLoaderFn<
//   TCtx extends Ctx = Ctx,
//   TData extends Data | UndefinedData = Data | UndefinedData,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TCtxOutput extends Ctx | UndefinedCtx = UndefinedCtx,
//   TDataOutput extends Data | UndefinedData = UndefinedData,
// > = (
//   options: CtxLoaderFnOptions<TCtx, TData, TRouteDefinition, TInputSchema>,
// ) =>
//   | Promise<{ ctx?: TCtxOutput; data?: TDataOutput; status?: number } | undefined>
//   | { ctx?: TCtxOutput; data?: TDataOutput; status?: number }
//   | undefined

export type CtxWithResponseFnOptions<
  TCtxInput extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtxInput
  data: FinalData<TData>
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
  extract: ServerExtractFn
  response: TResponse
}
export type CtxWithResponseFn<
  TCtxInput extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCtxOutput extends Ctx = Ctx,
> = (
  props: CtxWithResponseFnOptions<TCtxInput, TData, TResponse, TRouteDefinition, TInputSchema>,
) => Promise<TCtxOutput> | TCtxOutput
export type CtxWithResponseFnOutput<TCtxWithResponseFn extends CtxWithResponseFn> = Awaited<
  ReturnType<TCtxWithResponseFn>
>
export type InferCtxWithResponseFnOutput<TCtxWithResponseFn> =
  TCtxWithResponseFn extends CtxWithResponseFn<any, any, any, infer TCtxWithResponseFnOutput>
    ? TCtxWithResponseFnOutput
    : never

export type LoaderWithResponseFnOptions<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: FinalData<TData>
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
  extract: ServerExtractFn
  response: TResponse
}
export type LoaderWithResponseFn<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TDataOrResponse extends Data | Response = Data | Response,
> = (
  options: LoaderWithResponseFnOptions<TCtx, TData, TResponse, TRouteDefinition, TInputSchema>,
) => Promise<[number, TDataOrResponse]> | [number, TDataOrResponse] | Promise<TDataOrResponse> | TDataOrResponse

export type CtxLoaderWithResponseFnOptions<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: FinalData<TData>
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
  extract: ServerExtractFn
  response: TResponse
}
export type CtxLoaderWithResponseFn<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCtxOutput extends Ctx | UndefinedCtx = Ctx | UndefinedCtx,
  TDataOutput extends Data | UndefinedData = Data | UndefinedData,
  TResponseOutput extends Response | UndefinedResponse = Response | UndefinedResponse,
> = (
  options: CtxLoaderWithResponseFnOptions<TCtx, TData, TResponse, TRouteDefinition, TInputSchema>,
) =>
  | Promise<{ ctx?: TCtxOutput; data?: TDataOutput; status?: number; response?: TResponseOutput } | undefined>
  | { ctx?: TCtxOutput; data?: TDataOutput; status?: number; response?: TResponseOutput }
  | undefined

// export type ServerExtractAction<
//   TType extends 'ctx' | 'loader' | 'ctxLoader' | 'input' = 'ctx' | 'loader' | 'ctxLoader' | 'input',
//   TCtx extends Ctx = Ctx,
//   TData extends Data | UndefinedData = Data | UndefinedData,
//   TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TOutput extends Ctx | Data | Response = Ctx | Data | Response,
// > = TType extends 'ctx'
//   ? {
//       type: 'ctx'
//       fn:
//         | CtxFn<TCtx, TData, TRouteDefinition, TInputSchema, TOutput>
//         | CtxWithResponseFn<TCtx, TData, TResponse, TRouteDefinition, TInputSchema, TOutput>
//       unstableId: number
//     }
//   : TType extends 'loader'
//     ? {
//         type: 'loader'
//         fn:
//           | LoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TOutput>
//           | LoaderWithResponseFn<TCtx, TData, TResponse, TRouteDefinition, TInputSchema, TOutput>
//         unstableId: number
//       }
//     : TType extends 'ctxLoader'
//       ? {
//           type: 'ctxLoader'
//           fn:
//             | CtxLoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TOutput>
//             | CtxLoaderWithResponseFn<TCtx, TData, TResponse, TRouteDefinition, TInputSchema, TOutput>
//           unstableId: number
//         }
//       : TType extends 'input'
//         ? TInputSchema extends InputSchema
//           ? { type: 'input'; schema: TInputSchema; unstableId: number }
//           : never
//         : never
export type ServerExtractAction<
  TType extends 'ctx' | 'loader' | 'ctxLoader' | 'input' = 'ctx' | 'loader' | 'ctxLoader' | 'input',
> = TType extends 'ctx'
  ? {
      type: 'ctx'
      fn: CtxWithResponseFn
      unstableId: number
    }
  : TType extends 'loader'
    ? {
        type: 'loader'
        fn: LoaderWithResponseFn
        unstableId: number
      }
    : TType extends 'ctxLoader'
      ? {
          type: 'ctxLoader'
          fn: CtxLoaderWithResponseFn
          unstableId: number
        }
      : TType extends 'input'
        ? { type: 'input'; schema: InputSchema; unstableId: number }
        : never

// export type ClientExtractAction<
//   TType extends 'loader' | 'input' = 'loader' | 'input',
//   TClientData extends Data | UndefinedData = Data | UndefinedData,
//   TPointType extends RenderablePointType = RenderablePointType,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TOutput extends Ctx | Data = Ctx | Data,
// > = TType extends 'loader'
//   ? {
//       type: 'loader'
//       fn: ClientLoaderFn<TPointType, TRouteDefinition, TInputSchema, TClientData, TOutput>
//       unstableId: number
//     }
//   : TType extends 'input'
//     ? TInputSchema extends InputSchema
//       ? {
//           type: 'input'
//           schema: TInputSchema
//           unstableId: number
//         }
//       : never
//     : never
export type ClientExtractAction<TType extends 'loader' | 'input' = 'loader' | 'input'> = TType extends 'loader'
  ? {
      type: 'loader'
      fn: ClientLoaderFn
      unstableId: number
    }
  : TType extends 'input'
    ? { type: 'input'; schema: InputSchema; unstableId: number }
    : never

export type ClientExtractActionLocation<
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
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
> = {
  data: FinalClientData<TData, TClientData>
  location: ClientExtractActionLocation<TLetsEndPointType, TRouteDefinition>
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
}
export type ClientLoaderFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientDataOutput extends Data = Data,
> = (
  options: ClientLoaderFnOptions<TLetsEndPointType, TRouteDefinition, TInputSchema, TData, TClientData>,
) => Promise<TClientDataOutput> | TClientDataOutput

export type ClientLoaderWithResponseFnOptions<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
> = {
  // if response exists, then we have no data from server, we have only response
  // but if client loader before add some client data, the we have both data and response
  // I do not want add one more generic to Point0 to store there TClientResponse, and so we miss knowledge about server response type, ok I will add this generic
  data: TResponse extends Response
    ? TClientData extends undefined
      ? never
      : TClientData
    : FinalClientData<TData, TClientData>
  location: ClientExtractActionLocation<TLetsEndPointType, TRouteDefinition>
  input: InputParsed<TRouteDefinition, TInputSchema>
  inputRaw: InputRawUnknown
  response: TClientResponse extends Response ? TClientResponse : TResponse
}
export type ClientLoaderWithResponseFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientDataOrResponse extends Data | Response = Data | Response,
> = (
  options: ClientLoaderWithResponseFnOptions<
    TLetsEndPointType,
    TRouteDefinition,
    TInputSchema,
    TData,
    TClientData,
    TClientResponse,
    TResponse
  >,
) => Promise<TClientDataOrResponse> | TClientDataOrResponse

export type ProviderValueSetterFnOptions<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TClientData extends Data | UndefinedData,
> = {
  data: FinalClientData<any, TClientData>
  location: ClientExtractActionLocation<TLetsEndPointType, TRouteDefinition>
}
export type ProviderValueSetterFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TClientData extends Data | UndefinedData,
  TClientDataOutput extends Data,
> = (options: ProviderValueSetterFnOptions<TLetsEndPointType, TRouteDefinition, TClientData>) => TClientDataOutput

// head

export type SuccessHeadFn<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = (
  options: MiddlewareHeadFnOptions<
    'success',
    TQueryResultType,
    TData,
    TResponse,
    TClientData,
    TClientResponse,
    TInputSchema,
    TRouteDefinition
  >,
) => ResolvableHead | string

export type ErrorHeadFn<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = (
  options: MiddlewareHeadFnOptions<
    'error',
    TQueryResultType,
    TData,
    TResponse,
    TClientData,
    TClientResponse,
    TInputSchema,
    TRouteDefinition
  >,
) => ResolvableHead | string

export type LoadingHeadFn<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = (
  options: MiddlewareHeadFnOptions<
    'pending',
    TQueryResultType,
    TData,
    TResponse,
    TClientData,
    TClientResponse,
    TInputSchema,
    TRouteDefinition
  >,
) => ResolvableHead | string

export type MiddlewareHeadFnOptions<
  TStatus extends 'pending' | 'error' | 'success',
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TClientData extends Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = Omit<
  SpecificUseLoaderResult<
    TStatus,
    TQueryResultType,
    TData,
    TResponse,
    TClientData,
    TClientResponse,
    TInputSchema,
    TRouteDefinition,
    ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
  >,
  'query'
> // we omit it, becouse we try get page head on server also, where we have no current query
export type MiddlewareHeadFn<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = (
  options: MiddlewareHeadFnOptions<
    TStatus,
    TQueryResultType,
    TData,
    TResponse,
    TClientData,
    TClientResponse,
    TInputSchema,
    TRouteDefinition
  >,
) => ResolvableHead | string

export type FetchOutput<
  TResponse extends Response | UndefinedResponse = Response | UndefinedResponse,
  TData extends Data | UndefinedData = Data | UndefinedData,
> = TResponse extends Response ? TResponse : FinalData<TData>

export type FetchOutputType = 'data' | 'response' | 'queryClientDehydratedState'

// mountable app

export type AppProps = { points: PointsManager }
export type AppComponent = (props: AppProps) => React.ReactElement

// nice middle point

// export type WithoutServerMiddleLoaderLiterals<
//   TPointType extends PointType,
//   TLiteral extends string,
// > = TPointType extends 'clientMiddleware' | 'renderMiddleware'
//   ? TLiteral
//   : Exclude<TLiteral, 'ctx' | 'loader' | 'ctxLoader'>
// export type WithoutServerAndClientMiddleLoaderLiterals<
//   TPointType extends PointType,
//   TLiteral extends string,
// > = TPointType extends 'renderMiddleware'
//   ? TLiteral
//   : Exclude<TLiteral, 'ctx' | 'loader' | 'ctxLoader' | 'clientLoader'>

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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
  >,
  CutServerLoadersIfClientMiddleware<
    TPointType,
    | 'root'
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
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

// export type NiceResponseMiddlePoint<
//   TPointType extends PointType,
//   TLetsEndPointType extends 'response',
//   TRequiredCtx extends RequiredCtx,
//   TCtx extends Ctx,
//   TData extends Data | UndefinedData,
//   TClientData extends Data | UndefinedData,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
//   TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends InputSchema | UndefinedInputSchema,
//   TResponse extends Response | UndefinedResponse,
//   TClientResponse extends Response | UndefinedResponse,
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType,
//   TProps extends Props | UndefinedProps,
//   TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
// > = Pick<
//   Point0<
//     TPointType,
//     TLetsEndPointType,
//     TRequiredCtx,
//     TCtx,
//     TData,
//     TClientData,
//     TRouteDefinition,
//     TPrevRouteDefinition,
//     TInputSchema,
//     TResponse,
//     TClientResponse,
//     TQueryResultType,
//     TProps,
//     TLastDataOrResponse
//   >,
//   CutServerLoadersIfClientMiddleware<
//     TPointType,
//     | 'response'
//     | 'mutation'
//     // | 'asFormData'
//     | 'fetchOptions'
//     | 'input'
//     | 'ctx'
//     | 'loader'
//     | 'ctxLoader'
//     | 'clientLoader'
//     | 'point'
//     | 'Infer'
//   >
// >

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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
  >,
  CutServerLoadersIfClientMiddleware<
    TPointType,
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
  >,
  CutServerLoadersIfClientMiddleware<
    TPointType,
    | 'fetchOptions'
    | 'input'
    | 'ctx'
    | 'loader'
    | 'ctxLoader'
    | 'clientLoader'
    | 'onPrefetch'
    | 'point'
    | 'Infer'
    | 'infiniteQuery'
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
        TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
      TLastDataOrResponse
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
        TLastDataOrResponse
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
          TLastDataOrResponse
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
            TLastDataOrResponse
          >
        : // : TLetsEndPointType extends 'response'
          //   ? NiceResponseMiddlePoint<
          //       TPointType,
          //       TLetsEndPointType,
          //       TRequiredCtx,
          //       TCtx,
          //       TData,
          //       TClientData,
          //       TRouteDefinition,
          //       TPrevRouteDefinition,
          //       TInputSchema,
          //       TResponse,
          //       TClientResponse,
          //       TQueryResultType,
          //       TProps,
          //       TLastDataOrResponse
          //     >
          TLetsEndPointType extends 'query'
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
              TLastDataOrResponse
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
                TLastDataOrResponse
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
                  TLastDataOrResponse
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
                    TLastDataOrResponse
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
                      TLastDataOrResponse
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
  >,
  'attach' | 'lets' | 'point' | 'Infer'
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
  >,
  'lets' | 'point' | 'Infer'
>

export type WithFetchIfHasServerLoader<
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TLiteral extends string,
> = TData extends Data ? TLiteral | 'fetch' : TResponse extends Response ? TLiteral | 'fetch' : TLiteral
export type WithQueryEndLiteralsIfSuitable<
  TData extends Data | UndefinedData,
  TResponse extends Response | UndefinedResponse,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLiteral extends string,
> = TQueryResultType extends 'query'
  ? WithFetchIfHasServerLoader<
      TData,
      TResponse,
      TLiteral | 'useQuery' | 'getQueryKey' | 'getQueryOptions' | 'prefetchQuery' | 'extract'
    >
  : TQueryResultType extends 'infiniteQuery'
    ? WithFetchIfHasServerLoader<
        TData,
        TResponse,
        TLiteral | 'useInfiniteQuery' | 'getQueryKey' | 'getInfiniteQueryOptions' | 'prefetchInfiniteQuery' | 'extract'
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
      TLastDataOrResponse
    >,
    WithInputSchemaLiteralIfExists<
      TInputSchema,
      WithQueryEndLiteralsIfSuitable<TData, TResponse, TQueryResultType, 'point' | 'lets' | 'Infer'>
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
      TLastDataOrResponse
    >,
    WithInputSchemaLiteralIfExists<
      TInputSchema,
      WithQueryEndLiteralsIfSuitable<TData, TResponse, TQueryResultType, 'point' | 'lets' | 'Infer'>
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
      TLastDataOrResponse
    >,
    WithInputSchemaLiteralIfExists<
      TInputSchema,
      WithQueryEndLiteralsIfSuitable<TData, TResponse, TQueryResultType, 'point' | 'lets' | 'Infer'>
    >
  >

// export type NiceResponseEndPoint<
//   TPointType extends 'response',
//   TLetsEndPointType extends EndPointType | UndefinedEndPointType,
//   TRequiredCtx extends RequiredCtx,
//   TCtx extends Ctx,
//   TData extends Data | UndefinedData,
//   TClientData extends Data | UndefinedData,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
//   TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends InputSchema | UndefinedInputSchema,
//   TResponse extends Response | UndefinedResponse,
//   TClientResponse extends Response | UndefinedResponse,
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType,
//   TProps extends Props | UndefinedProps,
//   TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
// > = Pick<
//   Point0<
//     TPointType,
//     TLetsEndPointType,
//     TRequiredCtx,
//     TCtx,
//     TData,
//     TClientData,
//     TRouteDefinition,
//     TPrevRouteDefinition,
//     TInputSchema,
//     TResponse,
//     TClientResponse,
//     TQueryResultType,
//     TProps,
//     TLastDataOrResponse
//   >,
//   WithInputSchemaLiteralIfExists<
//     TInputSchema,
//     WithFetchIfHasServerLoader<
//       TData,
//       TResponse,
//       'extract' | 'getMutationOptions' | 'useMutation' | 'lets' | 'point' | 'Infer'
//     >
//   >
// >

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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithQueryEndLiteralsIfSuitable<TData, TResponse, TQueryResultType, 'point' | 'lets' | 'Infer'>
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithQueryEndLiteralsIfSuitable<TData, TResponse, TQueryResultType, 'point' | 'lets' | 'Infer'>
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithFetchIfHasServerLoader<
      TData,
      TResponse,
      'point' | 'lets' | 'extract' | 'getMutationOptions' | 'useMutation' | 'Infer'
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
    TLastDataOrResponse
  >,
  WithInputSchemaLiteralIfExists<
    TInputSchema,
    WithQueryEndLiteralsIfSuitable<
      TData,
      TResponse,
      TQueryResultType,
      'point' | 'lets' | 'useValue' | 'getValue' | 'getValueSafe' | 'provider' | 'Provider' | 'Infer'
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
  TLastDataOrResponse extends Data | Response | UndefinedLastDataOrResponse,
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
      TLastDataOrResponse
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
        TLastDataOrResponse
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
          TLastDataOrResponse
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
            TLastDataOrResponse
          >
        : // : TPointType extends 'response'
          //   ? NiceResponseEndPoint<
          //       TPointType,
          //       TLetsEndPointType,
          //       TRequiredCtx,
          //       TCtx,
          //       TData,
          //       TClientData,
          //       TRouteDefinition,
          //       TPrevRouteDefinition,
          //       TInputSchema,
          //       TResponse,
          //       TClientResponse,
          //       TQueryResultType,
          //       TProps,
          //       TLastDataOrResponse
          //     >
          TPointType extends 'query'
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
              TLastDataOrResponse
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
                TLastDataOrResponse
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
                  TLastDataOrResponse
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
                    TLastDataOrResponse
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
                      TLastDataOrResponse
                    >
                  : never

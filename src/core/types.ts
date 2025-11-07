import type { Error0 } from '@devp0nt/error0'
import type { AnyLocation, ChildrenLocation, ExactLocation, FlatInput, FlatOutput, HasParams } from '@devp0nt/route0'
import type {
  InfiniteData,
  UseInfiniteQueryOptions as OriginalUseInfiniteQueryOptions,
  UseQueryOptions as OriginalUseQueryOptions,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query'
import type { ResolvableHead } from 'unhead/types'
import type { ZodDefault, infer as ZodInfer, input as ZodInput, ZodObject, ZodOptional } from 'zod'
import type { EversionRun } from './eversion.js'
import type { Point0 } from './index.js'
import type { LazyPoints } from './points.js'

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
export type RootId = string
export type UndefinedRootId = undefined

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
// used to avoid circular depedencies
export type Infer<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
> = {
  RequiredCtx: TRequiredCtx
  Ctx: TCtx
  Data: TData
  ClientData: TClientData
  InputSchema: TInputSchema
  QueryResultType: TQueryResultType
}

// points types

export type PointType =
  | 'base'
  | 'middleware'
  | 'page'
  | 'component'
  | 'response'
  | 'query'
  | 'infiniteQuery'
  | 'mutation'
  | 'layout'
  | 'client-middleware'
  | 'provider'
export type EndPointType = Exclude<PointType, 'middleware' | 'client-middleware'>
export type RenderablePointType = Extract<PointType, 'page' | 'component' | 'layout'>
export type IsEndPointType<TPointType extends PointType> = TPointType extends EndPointType ? true : false
export type UndefinedEndPointType = undefined

export type AnyPoint<
  TPointType extends PointType = PointType,
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = UndefinedEndPointType,
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = Point0<
  TPointType,
  TLetsEndPointType,
  TConnectedRootSourcePoint,
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

export type BasePoint<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint = UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
  'base',
  TLetsEndPointType,
  TConnectedRootSourcePoint,
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

export type RootSourcePoint<
  TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint = UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
  'base' | 'middleware',
  UndefinedEndPointType,
  TConnectedRootSourcePoint,
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

export type RootConnectedPoint<
  TConnectedRootSourcePoint extends InferredRootSourcePoint = InferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
  'base' | 'middleware',
  UndefinedEndPointType,
  TConnectedRootSourcePoint,
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

export type RootPoint<
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> =
  | RootSourcePoint<
      UndefinedInferredRootSourcePoint,
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
  | RootConnectedPoint<
      InferredRootSourcePoint,
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

export type PagePoint<
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
  'page',
  UndefinedEndPointType,
  TConnectedRootSourcePoint,
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

export type LayoutPoint<
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
  'layout',
  UndefinedEndPointType,
  TConnectedRootSourcePoint,
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

export type ResponsePoint<
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput = ResponseOutput,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
  'response',
  UndefinedEndPointType,
  TConnectedRootSourcePoint,
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

export type ProviderPoint<
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
  'provider',
  UndefinedEndPointType,
  TConnectedRootSourcePoint,
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

export type EndPoint<
  TPointType extends EndPointType = EndPointType,
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
  TPointType,
  UndefinedEndPointType,
  TConnectedRootSourcePoint,
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

export type InferredRootSourcePoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
> = {
  Infer: Infer<TRequiredCtx, TCtx, TData, TClientData>
  _extractFns: ExtractFnRecord[]
}
export type UndefinedInferredRootSourcePoint = undefined

// point helpers

export type InferCtx<TPoint extends AnyPoint | InferredRootSourcePoint | undefined> =
  TPoint extends AnyPoint<any, any, any, infer TCtx, any, any, any, any>
    ? TCtx
    : TPoint extends InferredRootSourcePoint
      ? TPoint['Infer']['Ctx']
      : EmptyCtx
export type InferData<TPoint extends AnyPoint | InferredRootSourcePoint | undefined> =
  TPoint extends AnyPoint<any, any, any, any, infer TData, any, any, any>
    ? TData
    : TPoint extends InferredRootSourcePoint
      ? TPoint['Infer']['Data']
      : EmptyData
export type InferSourceBase<TPoint extends AnyPoint | undefined> =
  TPoint extends AnyPoint<infer TSourceBasePoint> ? TSourceBasePoint : undefined

export type AppendCtx<TCtx extends UnknownCtx | UndefinedCtx, TAppend extends UnknownCtx> = TCtx extends Ctx
  ? Omit<TCtx, keyof TAppend> & TAppend
  : TAppend
export type PrependCtx<TCtx extends UnknownCtx | UndefinedCtx, TPrepend extends UnknownCtx> = TCtx extends Ctx
  ? Omit<TPrepend, keyof TCtx> & TPrepend
  : TPrepend

export type CurrentRouteDefinition<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = TRouteDefinition extends RouteDefinition ? TRouteDefinition : string

type NarrowQueryComponentPropStatus<
  T extends { status: 'pending' | 'error' | 'success' },
  S extends string,
> = IfAnyThenElse<S, T, Extract<T, { status: S }>>
export type UseServerQueryResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TStatus extends 'pending' | 'error' | 'success',
> = TData extends UndefinedData
  ? undefined
  : TQueryResultType extends 'infiniteQuery'
    ? NarrowQueryComponentPropStatus<
        UseInfiniteQueryResult<InfiniteData<FetchOutput<TResponseOutput, TData>>, Error0>,
        TStatus
      >
    : TQueryResultType extends 'query'
      ? NarrowQueryComponentPropStatus<UseQueryResult<FetchOutput<TResponseOutput, TData>, Error0>, TStatus>
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
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TStatus extends 'pending' | 'error' | 'success',
> = TData extends Data
  ? TClientData extends Data
    ? UseCombinedQueryResult<TQueryResultType, TData, TClientData, TStatus>
    : UseServerQueryResult<TQueryResultType, TData, TResponseOutput, TStatus>
  : TClientData extends Data
    ? UseClientQueryResult<TQueryResultType, TData, TClientData, TStatus>
    : undefined
export type SpecificUseLoaderResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TStatus extends 'pending' | 'error' | 'success',
  TLocation extends AnyLocation,
> = Omit<
  UseLoaderResult<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TRouteDefinition, TStatus>,
  'data' | 'error' | 'loading' | 'location'
> & { location: TLocation } & (TStatus extends 'success'
    ? 'pending' extends TStatus
      ? 'error' extends TStatus
        ? { data: FinalClientData<TData, TClientData> | undefined; loading: boolean; error: Error0 | null }
        : { data: FinalClientData<TData, TClientData>; loading: boolean }
      : 'error' extends TStatus
        ? { data: FinalClientData<TData, TClientData> | undefined; error: Error0 | null }
        : { data: FinalClientData<TData, TClientData> }
    : // Has no success
      TStatus extends 'pending'
      ? 'error' extends TStatus
        ? { loading: boolean; error: Error0 | null }
        : { loading: true }
      : TStatus extends 'error'
        ? { error: Error0 }
        : never)

export type UseLoaderResult<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TStatus extends 'pending' | 'error' | 'success',
> = {
  data: IfAnyThenElse<
    TStatus,
    FinalClientData<TData, TClientData> | undefined,
    TStatus extends 'success' ? FinalClientData<TData, TClientData> | undefined : undefined
  >
  error: IfAnyThenElse<TStatus, Error0 | null, TStatus extends 'error' ? Error0 : null>
  loading: IfAnyThenElse<TStatus, boolean, TStatus extends 'pending' ? true : false>
  query: UsePointQueryResult<TQueryResultType, TData, TResponseOutput, TClientData, TStatus>
  input: InputParsed<TRouteDefinition, TInputSchema>
  location: AnyLocation
}

export type PageComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = SpecificUseLoaderResult<
  TQueryResultType,
  TData,
  TResponseOutput,
  TClientData,
  TInputSchema,
  TRouteDefinition,
  'success',
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
> & { props: FinalProps<TProps> }
export type PageComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  PageComponentProps<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
>
export type UndefinedPageComponent = undefined

export type LayoutComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = SpecificUseLoaderResult<
  TQueryResultType,
  TData,
  TResponseOutput,
  TClientData,
  TInputSchema,
  TRouteDefinition,
  'success',
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>> | ChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
> & { props: FinalProps<TProps>; children: React.ReactNode }
export type LayoutComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  LayoutComponentProps<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
>
export type UndefinedLayoutComponent = undefined

export type ComponentComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = SpecificUseLoaderResult<
  TQueryResultType,
  TData,
  TResponseOutput,
  TClientData,
  TInputSchema,
  UndefinedRouteDefinition,
  'success',
  AnyLocation
> & { props: FinalProps<TProps> }
export type ComponentComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  ComponentComponentProps<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TProps>
>
export type UndefinedComponentComponent = undefined

export type MountableComponentProps<
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TWithChildren extends boolean | null,
> = (TInputSchema extends InputSchemaZod
  ? { input: ZodInfer<TInputSchema> } & FinalProps<TProps>
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

export type DestinationComponentType = 'page' | 'component'
export type LoadingComponentProps<
  TType extends DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = {
  type: TType
} & SpecificUseLoaderResult<
  TQueryResultType,
  TData,
  TResponseOutput,
  TClientData,
  TInputSchema,
  TRouteDefinition,
  'pending',
  AnyLocation
>
export type LoadingComponentType<
  TType extends DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = React.ComponentType<
  LoadingComponentProps<TType, TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TRouteDefinition>
>

export type ErrorComponentProps<
  TType extends DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = {
  type: TType
} & Omit<
  UseLoaderResult<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TRouteDefinition, any>,
  'error'
> & { error: Error0 }
export type ErrorComponentType<
  TType extends DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TData extends Data | UndefinedData,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TClientData extends Data | UndefinedData,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = React.ComponentType<
  ErrorComponentProps<TType, TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TRouteDefinition>
>

export type FinalData<TData extends Data | UndefinedData> = TData extends UndefinedData ? EmptyData : TData
export type FinalClientData<
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
> = TClientData extends Data ? TClientData : FinalData<TData>

export type FetchOptionsFn = () => FetchOptions
export type FetchOptionsOrFn = FetchOptionsFn | FetchOptions
export type FetchOptions = RequestInit

export type WrapperComponentType = React.ComponentType<{ children: React.ReactNode }>

export type InputSchemaZod = ZodObject<any>
export type InputSchema = InputSchemaZod
export type UndefinedInputSchema = undefined
export type InputParsed<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TInputSchema extends InputSchemaZod
  ? ZodInfer<TInputSchema>
  : TRouteDefinition extends RouteDefinition
    ? FlatOutput<TRouteDefinition>
    : Record<never, never>
export type InputRaw<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TInputSchema extends InputSchemaZod
  ? ZodInput<TInputSchema>
  : TRouteDefinition extends RouteDefinition
    ? FlatInput<TRouteDefinition>
    : Record<never, never>

export type ResponseOutput = Response
export type UndefinedResponseOutput = undefined
export type ResponseFnProps<
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
  TResponseOutput extends ResponseOutput = ResponseOutput,
> = (props: ResponseFnProps<TCtx, TData, TRouteDefinition, TInputSchema>) => Promise<TResponseOutput> | TResponseOutput
export type ResponseFnOutput<TResponseFn extends ResponseFn> = Awaited<ReturnType<TResponseFn>>

export type CtxFnProps<
  TCtxInput extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtxInput
  data: FinalData<TData>
  input: InputParsed<TRouteDefinition, TInputSchema>
  eversionRun: EversionRun
}
export type CtxFn<
  TCtxInput extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCtxOutput extends Ctx = Ctx,
> = (props: CtxFnProps<TCtxInput, TData, TRouteDefinition, TInputSchema>) => Promise<TCtxOutput> | TCtxOutput
export type CtxFnOutput<TCtxFn extends CtxFn> = Awaited<ReturnType<TCtxFn>>
export type InferCtxFnOutput<TCtxFn> = TCtxFn extends CtxFn<any, any, any, infer TCtxFnOutput> ? TCtxFnOutput : never

export type LoaderFnProps<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: FinalData<TData>
  input: InputParsed<TRouteDefinition, TInputSchema>
  eversionRun: EversionRun
}
export type LoaderFn<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TDataOutput extends Data = Data,
> = (props: LoaderFnProps<TCtx, TData, TRouteDefinition, TInputSchema>) => Promise<TDataOutput> | TDataOutput

export type ExtractFnRecord<
  TType extends 'ctx' | 'loader' = 'ctx' | 'loader',
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TOutput extends Ctx | Data = Ctx | Data,
> = TType extends 'ctx'
  ? { type: 'ctx'; fn: CtxFn<TCtx, TData, TRouteDefinition, TInputSchema, TOutput>; unstableId: number }
  : TType extends 'loader'
    ? { type: 'loader'; fn: LoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TOutput>; unstableId: number }
    : never

export type ClientExtractFnRecord<
  TType extends 'loader' | 'head' = 'loader' | 'head',
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TPointType extends RenderablePointType = RenderablePointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TOutput extends Ctx | Data = Ctx | Data,
> = TType extends 'loader'
  ? {
      type: 'loader'
      fn: ClientLoaderFn<TPointType, TRouteDefinition, TInputSchema, TClientData, TOutput>
      unstableId: number
    }
  : TType extends 'head'
    ? {
        type: 'head'
        fn: HeadFn<TPointType, TRouteDefinition, TInputSchema, TClientData, TClientData>
        unstableId: number
      }
    : never
export type ClientExtractFnLocation<
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
      : never

export type ClientLoaderFnProps<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TClientData extends Data | UndefinedData,
> = {
  data: FinalClientData<any, TClientData>
  location: ClientExtractFnLocation<TLetsEndPointType, TRouteDefinition>
  input: InputParsed<TRouteDefinition, TInputSchema>
}
export type ClientLoaderFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TClientData extends Data | UndefinedData,
  TClientDataOutput extends Data,
> = (
  props: ClientLoaderFnProps<TLetsEndPointType, TRouteDefinition, TInputSchema, TClientData>,
) => Promise<TClientDataOutput> | TClientDataOutput

export type ProviderValueSetterFnProps<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TClientData extends Data | UndefinedData,
> = {
  data: FinalClientData<any, TClientData>
  location: ClientExtractFnLocation<TLetsEndPointType, TRouteDefinition>
}
export type ProviderValueSetterFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TClientData extends Data | UndefinedData,
  TClientDataOutput extends Data,
> = (props: ProviderValueSetterFnProps<TLetsEndPointType, TRouteDefinition, TClientData>) => TClientDataOutput

export type HeadFnProps<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
> = {
  data: FinalClientData<TData, TClientData>
  location: ClientExtractFnLocation<TLetsEndPointType, TRouteDefinition>
  input: InputParsed<TRouteDefinition, TInputSchema>
}
export type HeadFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
> = (props: HeadFnProps<TLetsEndPointType, TRouteDefinition, TInputSchema, TData, TClientData>) => ResolvableHead
export type StaticHeadsCollection = ResolvableHead[]

export type TitleFnProps<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
> = {
  data: FinalClientData<TData, TClientData>
  location: ClientExtractFnLocation<TLetsEndPointType, TRouteDefinition>
  input: InputParsed<TRouteDefinition, TInputSchema>
}
export type TitleFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
> = (props: TitleFnProps<TLetsEndPointType, TRouteDefinition, TInputSchema, TData, TClientData>) => string

// point methods

// TODO: move here Ctx etc

// endpoint helpers

// export type IsInputOptional<
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = TRouteDefinition extends RouteDefinition
//   ? TInputSchema extends InputSchema
//     ? false
//     : HasParams<TRouteDefinition> extends true
//       ? false
//       : true
//   : TInputSchema extends InputSchema
//     ? false
//     : true
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

export type FetchOutput<
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
  TData extends Data | UndefinedData = Data | UndefinedData,
> = TResponseOutput extends ResponseOutput ? TResponseOutput : FinalData<TData>

export type FetchOutputType = 'data' | 'response' | 'dehydratedState'

export type IsEmptyObject<T> = keyof T extends never ? true : false

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

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type ShowError<Message extends string> = { error: Message } & never

export type IfAnyThenElse<T, Then, Else = T> = 0 extends 1 & T ? Then : Else

import type { Error0 } from '@devp0nt/error0'
import type { Route0 } from '@devp0nt/route0'
import type {
  MutationOptions,
  QueryClient,
  QueryOptions,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query'
import type { ResolvableHead } from 'unhead/types'
import type { infer as ZodInfer, ZodObject } from 'zod'
import type { Point0 } from './index.js'
import type { EversionRun, ExtractResult } from './eversion.js'

// basic

export type HasPageTure = true
export type HasPageFalse = false
export type HasPage = boolean
export type IsClientTrue = true
export type IsClientFalse = false
export type IsClient = boolean

export type Method = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'
export type UndefinedMethod = undefined
export type Id = string
export type UndefinedId = undefined
export type RootId = string
export type UndefinedRootId = undefined

export type UndefinedRoute = undefined
export type EmptyCtx = Record<string, unknown> // TODO: use UndefinedCtx instead
export type UnknownCtx = Record<string, unknown>
export type UndefinedCtx = undefined
export type RequiredCtx = UnknownCtx | UndefinedCtx
export type Ctx = UnknownCtx | EmptyCtx
export type EmptyData = Record<string, unknown> // TODO: use UndefinedData instead
export type UnknownData = Record<string, unknown>
export type UndefinedData = undefined
export type Data = UnknownData | EmptyData

export type QueryOptionsSettings = Omit<QueryOptions<any, any, any, any, any>, 'queryFn' | 'queryKey'>
// used to avoid circular depedencies
export type Infer<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  RequiredCtx: TRequiredCtx
  Ctx: TCtx
  Data: TData
  ClientData: TClientData
  InputSchema: TInputSchema
}

// points types

export type PointType =
  | 'base'
  | 'middleware'
  | 'page'
  | 'component'
  | 'response'
  | 'query'
  | 'mutation'
  | 'layout'
  | 'client-middleware'
  | 'client-ctx'
export type EndPointType = Exclude<PointType, 'middleware' | 'base' | 'client-middleware'>
export type IsEndPointType<TPointType extends PointType> = TPointType extends EndPointType ? true : false

export type AnyPoint<
  TPointType extends PointType = PointType,
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
> = Point0<
  TPointType,
  TConnectedRootSourcePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type BasePoint<
  TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint = UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
> = AnyPoint<
  'base',
  TConnectedRootSourcePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type RootSourcePoint<
  TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint = UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
> = AnyPoint<
  'base' | 'middleware',
  TConnectedRootSourcePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type RootConnectedPoint<
  TConnectedRootSourcePoint extends InferredRootSourcePoint = InferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
> = AnyPoint<
  'base' | 'middleware',
  TConnectedRootSourcePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type RootPoint<
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
> =
  | RootSourcePoint<
      UndefinedInferredRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >
  | RootConnectedPoint<
      InferredRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >

export type PagePoint<
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
> = AnyPoint<
  'page',
  TConnectedRootSourcePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type LayoutPoint<
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
> = AnyPoint<
  'layout',
  TConnectedRootSourcePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type ResponsePoint<
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput = ResponseOutput,
> = AnyPoint<
  'response',
  TConnectedRootSourcePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type ClientCtxPoint<
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
> = AnyPoint<
  'client-ctx',
  TConnectedRootSourcePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
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
  TRoute extends Route0.AnyRoute | UndefinedRoute = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
> = AnyPoint<
  TPointType,
  TConnectedRootSourcePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
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

export type CurrentRoute<TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute> =
  TRoute extends Route0.AnyRoute ? TRoute : Route0.AnyRoute

export type PageComponentProps<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = { data: FinalClientData<TData, TClientData>; location: Route0.Location<CurrentRoute<TRoute>> }
export type PageComponent<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = React.ComponentType<PageComponentProps<TData, TClientData, TRoute>>
export type UndefinedPageComponent = undefined

export type LayoutComponentProps<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = {
  data: FinalClientData<TData, TClientData>
  location: Route0.Location<CurrentRoute<TRoute>>
  children: React.ReactNode
}
export type LayoutComponent<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = React.ComponentType<LayoutComponentProps<TData, TClientData, TRoute>>
export type UndefinedLayoutComponent = undefined

export type DestinationComponentType = 'app' | 'page' | 'component'
export type ErrorComponentProps<TType extends DestinationComponentType = DestinationComponentType> = {
  type: TType
  error: Error0
  location: Route0.Location
}
export type LoaderComponentProps<TType extends DestinationComponentType = DestinationComponentType> = {
  type: TType
  location: Route0.Location
}
export type LoaderComponentType<TType extends DestinationComponentType = DestinationComponentType> =
  React.ComponentType<LoaderComponentProps<TType>>
export type ErrorComponentType<TType extends DestinationComponentType = DestinationComponentType> = React.ComponentType<
  ErrorComponentProps<TType>
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
export type InputSchemaObject = Record<string, any>
export type InputSchema = InputSchemaZod | InputSchemaObject
export type UndefinedInputSchema = undefined
export type Input<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TRoute extends Route0.AnyRoute
  ? TInputSchema extends InputSchemaZod
    ? ZodInfer<TInputSchema> &
        Omit<Route0.Params<TRoute>, keyof ZodInfer<TInputSchema>> & { query: Route0.Query<TRoute> }
    : TInputSchema extends InputSchemaObject
      ? TInputSchema & Omit<Route0.Params<TRoute>, keyof TInputSchema> & { query: Route0.Query<TRoute> }
      : Route0.Params<TRoute> & { query: Route0.Query<TRoute> }
  : TInputSchema extends InputSchemaZod
    ? ZodInfer<TInputSchema>
    : TInputSchema extends InputSchemaObject
      ? TInputSchema
      : Record<never, never>
export type UndefinedInput = undefined

export type ResponseOutput = Response
export type UndefinedResponseOutput = undefined
export type ResponseFnProps<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: FinalData<TData>
  input: Input<TRoute, TInputSchema>
  location: Route0.Location<CurrentRoute<TRoute>>
}
export type ResponseFn<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute0 extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput = ResponseOutput,
> = (props: ResponseFnProps<TCtx, TData, TRoute0, TInputSchema>) => Promise<TResponseOutput> | TResponseOutput
export type ResponseFnOutput<TResponseFn extends ResponseFn> = Awaited<ReturnType<TResponseFn>>

export type CtxFnProps<
  TCtxInput extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtxInput
  data: FinalData<TData>
  input: Input<TRoute, TInputSchema>
  location: Route0.Location<CurrentRoute<TRoute>>
}
export type CtxFn<
  TCtxInput extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCtxOutput extends Ctx = Ctx,
> = (props: CtxFnProps<TCtxInput, TData, TRoute, TInputSchema>) => Promise<TCtxOutput> | TCtxOutput
export type CtxFnOutput<TCtxFn extends CtxFn> = Awaited<ReturnType<TCtxFn>>
export type InferCtxFnOutput<TCtxFn> = TCtxFn extends CtxFn<any, any, any, infer TCtxFnOutput> ? TCtxFnOutput : never

export type LoaderFnProps<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: FinalData<TData>
  location: Route0.Location<CurrentRoute<TRoute>>
  input: Input<TRoute, TInputSchema>
}
export type LoaderFn<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TDataOutput extends Data = Data,
> = (props: LoaderFnProps<TCtx, TData, TRoute, TInputSchema>) => Promise<TDataOutput> | TDataOutput

export type ExtractFnRecord<
  TType extends 'ctx' | 'loader' | 'head' = 'ctx' | 'loader' | 'head',
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TOutput extends Ctx | Data = Ctx | Data,
> = TType extends 'ctx'
  ? { type: 'ctx'; fn: CtxFn<TCtx, TData, TRoute, TInputSchema, TOutput>; unstableId: number }
  : TType extends 'loader'
    ? { type: 'loader'; fn: LoaderFn<TCtx, TData, TRoute, TInputSchema, TOutput>; unstableId: number }
    : TType extends 'head'
      ? { type: 'head'; fn: HeadFn<TData, TData, TRoute>; unstableId: number }
      : never

export type ClientExtractFnRecord<
  TType extends 'loader' | 'head' = 'head' | 'loader',
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TOutput extends Ctx | Data = Ctx | Data,
> = TType extends 'loader'
  ? { type: 'loader'; fn: ClientLoaderFn<TClientData, TRoute, TOutput>; unstableId: number }
  : TType extends 'head'
    ? { type: 'head'; fn: HeadFn<TClientData, TClientData, TRoute>; unstableId: number }
    : never

export type ClientLoaderFnProps<
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = {
  data: FinalData<TClientData>
  location: Route0.Location<CurrentRoute<TRoute>>
}
export type ClientLoaderFn<
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TClientDataOutput extends Data = Data,
> = (props: ClientLoaderFnProps<TClientData, TRoute>) => Promise<TClientDataOutput> | TClientDataOutput

export type HeadFnProps<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = { data: FinalClientData<TData, TClientData>; location: Route0.Location<CurrentRoute<TRoute>> }
export type HeadFn<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = (props: HeadFnProps<TData, TClientData, TRoute>) => ResolvableHead
export type StaticHeadsCollection = ResolvableHead[]

export type TitleFnProps<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = { data: FinalClientData<TData, TClientData>; location: Route0.Location<CurrentRoute<TRoute>> }
export type TitleFn<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = (props: TitleFnProps<TData, TClientData, TRoute>) => string

// point methods

// TODO: move here Ctx etc

// endpoint helpers

export type QueryKey = readonly [string, ...string[]]
export type FetcherFnArgs<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TRoute extends Route0.AnyRoute
  ? TInputSchema extends InputSchema
    ? [input: Input<TRoute, TInputSchema>]
    : Route0.HasParams<TRoute> extends true
      ? [input: Input<TRoute, TInputSchema>]
      : [input?: Input<TRoute, TInputSchema>]
  : TInputSchema extends InputSchema
    ? [input: Input<TRoute, TInputSchema>]
    : []
export type WithFetcherFnArgsPrepend<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TArg1 = any,
> = [TArg1, ...FetcherFnArgs<TRoute, TInputSchema>]
export type WithFetcherFnArgs<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TArg1 = any,
> = [...FetcherFnArgs<TRoute, TInputSchema>, TArg1?]
export type WithFetcherFnArgs2<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TArg1 = any,
  TArg2 = any,
> = [...FetcherFnArgs<TRoute, TInputSchema>, TArg1?, TArg2?]

export type FetchOutput<
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
  TData extends Data | UndefinedData = Data | UndefinedData,
> = TResponseOutput extends ResponseOutput ? TResponseOutput : FinalData<TData>

export type IsEmptyObject<T> = keyof T extends never ? true : false

// endpoint methods

export type ExtractFn<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
> = TResponseOutput extends ResponseOutput
  ? (
      ...args: WithFetcherFnArgsPrepend<TRoute, TInputSchema, EversionRun<TRequiredCtx>>
    ) => Promise<ExtractResult<TCtx, FinalData<TData>, TResponseOutput>>
  : TData extends Data
    ? (
        ...args: WithFetcherFnArgsPrepend<TRoute, TInputSchema, EversionRun<TRequiredCtx>>
      ) => Promise<ExtractResult<TCtx, FinalData<TData>, TResponseOutput>>
    : never

export type FetchFn<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
  TData extends Data | UndefinedData = Data | UndefinedData,
> = TResponseOutput extends ResponseOutput
  ? (
      ...args: WithFetcherFnArgs<TRoute, TInputSchema, FetchOptions | undefined>
    ) => Promise<FetchOutput<TResponseOutput, TData>>
  : TData extends Data
    ? (
        ...args: WithFetcherFnArgs<TRoute, TInputSchema, FetchOptions | undefined>
      ) => Promise<FetchOutput<TResponseOutput, TData>>
    : never

export type GetQueryKeyFn<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = (...args: FetcherFnArgs<TRoute, TInputSchema>) => QueryKey

export type GetQueryOptionsFn<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
  TData extends Data | UndefinedData = Data | UndefinedData,
> = (
  ...args: WithFetcherFnArgs2<TRoute, TInputSchema, QueryOptions | undefined, FetchOptions | undefined>
) => QueryOptions<FetchOutput<TResponseOutput, TData>, Error0>

export type GetMutationOptionsFn<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
  TData extends Data | UndefinedData = Data | UndefinedData,
> = (
  mutationOptions?: MutationOptions,
  fetchOptions?: FetchOptions,
) => MutationOptions<FetchOutput<TResponseOutput, TData>, Error0, Input<TRoute, TInputSchema>>

export type UseQueryFn<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
  TData extends Data | UndefinedData = Data | UndefinedData,
> = (
  ...args: WithFetcherFnArgs2<TRoute, TInputSchema, QueryOptions | undefined, FetchOptions | undefined>
) => UseQueryResult<FetchOutput<TResponseOutput, TData>, Error0>

export type UseMutationFn<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
  TData extends Data | UndefinedData = Data | UndefinedData,
> = (
  ...args: WithFetcherFnArgs2<TRoute, TInputSchema, MutationOptions | undefined, FetchOptions | undefined>
) => UseMutationResult<FetchOutput<TResponseOutput, TData>, Error0, Input<TRoute, TInputSchema>>

export type PrefetchQueryFn<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = (props: {
  queryClient: QueryClient
  queryOptions?: QueryOptions
  fetchOptions?: FetchOptions
  location?: Route0.Location
  input?: Input<TRoute, TInputSchema>
  force?: boolean
}) => Promise<void>

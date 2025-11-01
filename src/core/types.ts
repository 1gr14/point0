import type { Error0 } from '@devp0nt/error0'
import type { AnyLocation, ChildrenLocation, ExactLocation, FlatInput, FlatOutput, HasParams } from '@devp0nt/route0'
import type { QueryOptions } from '@tanstack/react-query'
import type { ResolvableHead } from 'unhead/types'
import type { infer as ZodInfer, input as ZodInput, ZodObject } from 'zod'
import type { EversionRun } from './eversion.js'
import type { Point0 } from './index.js'

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

export type Props = Record<string, any>
export type UndefinedProps = undefined
export type EmptyProps = Record<string, unknown>
export type FinalProps<TProps extends Props | UndefinedProps> = TProps extends UndefinedProps ? EmptyProps : TProps

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
  TProps
>

export type ClientCtxPoint<
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
  TProps extends Props | UndefinedProps = any,
> = AnyPoint<
  'client-ctx',
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

export type PageComponentProps<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = { data: FinalClientData<TData, TClientData>; location: ExactLocation<CurrentRouteDefinition<TRouteDefinition>> }
export type PageComponent<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = React.ComponentType<PageComponentProps<TData, TClientData, TRouteDefinition>>
export type UndefinedPageComponent = undefined

export type LayoutComponentProps<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = {
  data: FinalClientData<TData, TClientData>
  location:
    | ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
    | ChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
  children: React.ReactNode
}
export type LayoutComponent<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
> = React.ComponentType<LayoutComponentProps<TData, TClientData, TRouteDefinition>>
export type UndefinedLayoutComponent = undefined

export type ComponentComponentProps<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TProps extends Props | UndefinedProps = any,
> = {
  data: FinalClientData<TData, TClientData>
  location: AnyLocation
  props: FinalProps<TProps>
}
export type ComponentComponent<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<ComponentComponentProps<TData, TClientData, TProps>>
export type UndefinedComponentComponent = undefined

export type ComponentMountableProps<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = TInputSchema extends InputSchemaZod ? { input: ZodInfer<TInputSchema> } & FinalProps<TProps> : TProps
export type ComponentMountable<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<ComponentMountableProps<TInputSchema, TProps>>

export type DestinationComponentType = 'app' | 'page' | 'component'
export type ErrorComponentProps<TType extends DestinationComponentType = DestinationComponentType> = {
  type: TType
  error: Error0
  location: AnyLocation
}
export type LoaderComponentProps<TType extends DestinationComponentType = DestinationComponentType> = {
  type: TType
  location: AnyLocation
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
  TType extends 'loader' | 'head' = 'head' | 'loader',
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TPointType extends RenderablePointType = RenderablePointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TOutput extends Ctx | Data = Ctx | Data,
> = TType extends 'loader'
  ? {
      type: 'loader'
      fn: ClientLoaderFn<TPointType, TRouteDefinition, TClientData, TOutput>
      unstableId: number
    }
  : TType extends 'head'
    ? {
        type: 'head'
        fn: HeadFn<TPointType, TRouteDefinition, TClientData, TClientData>
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
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
> = {
  data: FinalData<TClientData>
  location: ClientExtractFnLocation<TLetsEndPointType, TRouteDefinition>
}
export type ClientLoaderFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TClientDataOutput extends Data = Data,
> = (
  props: ClientLoaderFnProps<TLetsEndPointType, TRouteDefinition, TClientData>,
) => Promise<TClientDataOutput> | TClientDataOutput

export type HeadFnProps<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
> = {
  data: FinalClientData<TData, TClientData>
  location: ClientExtractFnLocation<TLetsEndPointType, TRouteDefinition>
}
export type HeadFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
> = (props: HeadFnProps<TLetsEndPointType, TRouteDefinition, TData, TClientData>) => ResolvableHead
export type StaticHeadsCollection = ResolvableHead[]

export type TitleFnProps<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
> = {
  data: FinalClientData<TData, TClientData>
  location: ClientExtractFnLocation<TLetsEndPointType, TRouteDefinition>
}
export type TitleFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
> = (props: TitleFnProps<TLetsEndPointType, TRouteDefinition, TData, TClientData>) => string

// point methods

// TODO: move here Ctx etc

// endpoint helpers

export type IsInputOptional<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TRouteDefinition extends RouteDefinition
  ? TInputSchema extends InputSchema
    ? false
    : HasParams<TRouteDefinition> extends true
      ? false
      : true
  : TInputSchema extends InputSchema
    ? false
    : true

export type FetchOutput<
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
  TData extends Data | UndefinedData = Data | UndefinedData,
> = TResponseOutput extends ResponseOutput ? TResponseOutput : FinalData<TData>

export type IsEmptyObject<T> = keyof T extends never ? true : false

export type QueryKey = readonly [string, ...string[]]

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type ShowError<Message extends string> = { error: Message } & never

export type IfAnyThen<T, Then, Else = T> = 0 extends 1 & T ? Then : Else

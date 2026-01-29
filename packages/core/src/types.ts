import type { Error0 } from '@devp0nt/error0'
import type {
  AnyLocation,
  ChildrenLocation,
  ExactLocation,
  Extended,
  FlatInputStringOnly,
  FlatOutput,
} from '@devp0nt/route0'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type {
  InfiniteData,
  UseInfiniteQueryOptions as OriginalUseInfiniteQueryOptions,
  UseQueryOptions as OriginalUseQueryOptions,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query'
import type { ResolvableHead } from 'unhead/types'
import type { Point0 } from './index.js'
import type { PointsManager } from './points-manager.js'
import type { Request0 } from './request0.js'
import type { ResponseEffects, ResponseEffectsSetHelper } from './response0.js'

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
// export type Ctx = UnknownCtx
export type EmptyData = Record<never, never>
export type UnknownData = Record<string, unknown>
export type UndefinedData = undefined
export type Data = UnknownData | EmptyData
// export type Data = UnknownData
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
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
  ServerInputSchema: TServerInputSchema
  ClientInputSchema: TClientInputSchema
  InputOptional: IsInputsOptional<TServerInputSchema, TClientInputSchema>
  InputRaw: InputsRaw<TServerInputSchema, TClientInputSchema>
  ClientInputParsed: InputParsed<TClientInputSchema>
  ClientInputRaw: InputRaw<TClientInputSchema>
  ClientInputOptional: IsInputOptional<TClientInputSchema>
  ServerInputParsed: InputParsed<TServerInputSchema>
  ServerInputRaw: InputRaw<TServerInputSchema>
  ServerInputOptional: IsInputOptional<TServerInputSchema>
  Props: TProps
  QueryResultType: TQueryResultType
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
  | 'page'
  | 'component'
  | 'query'
  | 'infiniteQuery'
  | 'mutation'
  | 'layout'
  | 'provider'
  | 'coreStage'
  | 'clientStage'
  | 'mapperStage'
  | 'renderStage'
export type StagePointType = 'coreStage' | 'clientStage' | 'mapperStage' | 'renderStage'
export type EndPointType = Exclude<PointType, StagePointType>
export type RequestableEndPointType = Exclude<EndPointType, 'root' | 'base'>
export type MountablePointType = 'page' | 'component' | 'layout' | 'provider'
export type RenderablePointType = 'page' | 'component' | 'layout'
export type IsEndPointType<TPointType extends PointType> = TPointType extends EndPointType ? true : false
export type UndefinedEndPointType = undefined
export type EndPointTypeOrNever<TPointType extends PointType | UndefinedEndPointType> = TPointType extends EndPointType
  ? TPointType
  : never
// export type EndPointTypeOrUndefinedOrNever<TPointType extends PointType | UndefinedEndPointType> =
//   TPointType extends EndPointType ? TPointType : TPointType extends UndefinedEndPointType ? undefined : never
export type StagePointTypeOrNever<TPointType extends PointType | UndefinedEndPointType> =
  TPointType extends StagePointType ? TPointType : never
// export type StagePointTypeOrUndefinedOrNever<TPointType extends PointType | UndefinedEndPointType> =
//   TPointType extends StagePointType ? TPointType : TPointType extends UndefinedEndPointType ? undefined : never

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
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
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
  TServerInputSchema,
  TClientInputSchema,
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
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
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
  TServerInputSchema,
  TClientInputSchema,
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
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
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
  TServerInputSchema,
  TClientInputSchema,
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
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
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
  TServerInputSchema,
  TClientInputSchema,
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
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
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
  TServerInputSchema,
  TClientInputSchema,
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
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
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
  TServerInputSchema,
  TClientInputSchema,
  TQueryResultType,
  TProps
>

// input

// export type ValidationSchema<I = unknown, O = I> = StandardSchemaV1<I, O> & WithValidationSchemaParseFn<O>
// export type ValidationSchemaInput<S extends ValidationSchema> = StandardSchemaV1.InferInput<S>
// export type ValidationSchemaOutput<S extends ValidationSchema> = StandardSchemaV1.InferOutput<S>

// export type RecordValidationSchemaFunction<
//   TOutput extends Record<string, unknown> = Record<string, unknown>,
// > = (input: unknown) => TOutput
// export type RecordValidationSchemaStandard<
//   TInput extends Record<string, unknown> = Record<string, unknown>,
//   TOutput extends Record<string, unknown> = Record<string, unknown>,
// > = StandardSchemaV1<TInput, TOutput> & WithValidationSchemaParseFn<TOutput>
// & {
//   readonly '~standard': {
//     readonly types?: {
//       readonly input: Record<string, unknown>
//       readonly output: Record<string, unknown>
//     }
//   }
// }
export type RecordValidationSchema<
  TInput extends Record<string, unknown> = Record<string, unknown>,
  TOutput extends Record<string, unknown> = Record<string, unknown>,
  // > = RecordValidationSchemaFunction<TInput, TOutput> | RecordValidationSchemaStandard<TInput, TOutput>
> = StandardSchemaV1<TInput, TOutput>
export type RecordValidationSchemaInput<S extends RecordValidationSchema> = StandardSchemaV1.InferInput<S>
export type RecordValidationSchemaOutput<S extends RecordValidationSchema> = StandardSchemaV1.InferOutput<S>

// type PickOnlyStringKeys<T extends Record<string | number | symbol, unknown>> = {
//   [K in keyof T]: K extends string ? K : never
// }

export type RouteDefinitionToRecordValidationSchema<TRouteDefinition extends RouteDefinition> = RecordValidationSchema<
  // PickOnlyStringKeys<FlatInputStringOnly<TRouteDefinition>>,
  FlatInputStringOnly<TRouteDefinition>,
  // Record<string, unknown>,
  FlatOutput<TRouteDefinition>
>
export type CustomValidationFn<TOutput extends InputParsed = InputParsed> = (data: InputRawUnknown) => TOutput
export type RecordSchemaToCustomValidationFn<T extends RecordValidationSchema> = (
  data: InputRawUnknown,
) => RecordValidationSchemaOutput<T>
export type CustomValidationFnToRecordValidationSchema<T extends CustomValidationFn> = RecordValidationSchema<
  ReturnType<T>,
  ReturnType<T>
>

// export type IsRecord<T> = T extends Record<string, unknown> ? true : false
// export type IsRecordValidationSchema<S extends ValidationSchema> =
//   IsRecord<StandardSchemaV1.InferInput<S>> extends true
//     ? IsRecord<StandardSchemaV1.InferOutput<S>> extends true
//       ? true
//       : false
//     : false

export type MergeObjects<A, B> =
  IsEmptyObject<B> extends true ? A : IsEmptyObject<A> extends true ? B : Omit<A, keyof B> & B
export type MergeRecordValidationSchemas<
  TSchema1 extends RecordValidationSchema | undefined,
  TSchema2 extends RecordValidationSchema | undefined,
> = TSchema1 extends RecordValidationSchema
  ? TSchema2 extends RecordValidationSchema
    ? RecordValidationSchema<
        MergeObjects<RecordValidationSchemaInput<TSchema1>, RecordValidationSchemaInput<TSchema2>>,
        MergeObjects<RecordValidationSchemaOutput<TSchema1>, RecordValidationSchemaOutput<TSchema2>>
      >
    : TSchema1
  : TSchema2 extends RecordValidationSchema
    ? TSchema2
    : undefined

// export type MergeRouteDefinitionAndInputSchema<
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
//   TInputSchema extends RecordValidationSchema | undefined,
// > = TInputSchema extends RecordValidationSchema
//   ? TRouteDefinition extends RouteDefinition
//     ? MergeValidationSchema<
//         ValidationSchema<FlatInputStringOnly<TRouteDefinition>, FlatOutput<TRouteDefinition>>,
//         TInputSchema
//       >
//     : undefined
//   : TInputSchema
// export type MergeRouteDefinitionAndInputSchemas<
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
//   TServerInputSchema extends RecordValidationSchema | undefined,
//   TClientInputSchema extends RecordValidationSchema | undefined,
// > = TServerInputSchema extends RecordValidationSchema
//   ? TClientInputSchema extends RecordValidationSchema
//     ? ValidationSchema<
//         MergeObjects<ValidationSchemaInput<TServerInputSchema>, ValidationSchemaInput<TClientInputSchema>>,
//         MergeObjects<ValidationSchemaOutput<TServerInputSchema>, ValidationSchemaOutput<TClientInputSchema>>
//       >
//     : TServerInputSchema
//   : TClientInputSchema extends RecordValidationSchema
//     ? TClientInputSchema
//     : TRouteDefinition extends RouteDefinition
//       ? ValidationSchema<FlatInputStringOnly<TRouteDefinition>, FlatOutput<TRouteDefinition>>
//       : undefined

type RequiredKeys<T> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]
export type HasRequiredKeysInValidationSchema<S extends RecordValidationSchema | undefined> =
  S extends RecordValidationSchema ? (RequiredKeys<RecordValidationSchemaInput<S>> extends never ? false : true) : false

export type IsInputOptional<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = HasRequiredKeysInValidationSchema<TInputSchema> extends true ? false : true
export type IsInputsOptional<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> =
  HasRequiredKeysInValidationSchema<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>> extends true
    ? false
    : true

export type SimilarKeys<T extends Record<string, unknown>, U extends Record<string, unknown>> = {
  [K in keyof T]: K extends keyof U ? K : never
}[keyof T]
// export type PickSimilarKeys<T extends Record<string, unknown>, U extends Record<string, unknown>> = Pick<
//   T,
//   SimilarKeys<T, U>
// >

// new schema should be compatible with previous schema, so if it is override prev keys, new values should be NOT wider (if it was string | number, we can do it string, if it was string we can not do it string | number)

type OverlapKeys<A, B> = keyof A & keyof B
type IsNarrowerOrEqual<New, Prev> = [New] extends [Prev] ? true : false
type HasWideningKey<Prev, New> = {
  [K in OverlapKeys<Prev, New>]: IsNarrowerOrEqual<New[K], Prev[K]> extends true ? never : K
}[OverlapKeys<Prev, New>] extends never
  ? false
  : true
export type IsInputRawConflicts<TPrevInputRaw extends InputRaw, TNewInputRaw extends InputRaw> = HasWideningKey<
  TPrevInputRaw,
  TNewInputRaw
>
export type IsInputSchemaConflicts<
  TPrevInputSchema extends InputSchema | UndefinedInputSchema,
  TNewInputSchema extends InputSchema | UndefinedInputSchema,
> = TPrevInputSchema extends InputSchema
  ? TNewInputSchema extends InputSchema
    ? HasWideningKey<InputRaw<TPrevInputSchema>, InputRaw<TNewInputSchema>>
    : false
  : false

export type IsRouteDefinitionConflicts<
  TRouteDefinition extends RouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
> =
  IsInputSchemaConflicts<TServerInputSchema, RouteDefinitionToRecordValidationSchema<TRouteDefinition>> extends true
    ? true
    : IsInputSchemaConflicts<TClientInputSchema, RouteDefinitionToRecordValidationSchema<TRouteDefinition>> extends true
      ? true
      : false

// export type IsFinalInputOptional<
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
// > = TServerInputSchema extends InputSchema
//   ? TClientInputSchema extends InputSchema
//     ? IsInputOptional<
//         TRouteDefinition,
//         MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>
//       > extends true
//       ? IsInputOptional<TRouteDefinition, TClientInputSchema> extends true
//         ? true
//         : false
//       : false
//     : true
//   : TClientInputSchema extends InputSchema
//     ? IsInputOptional<TRouteDefinition, TClientInputSchema> extends true
//       ? true
//       : false
//     : true

export type InputSchema = RecordValidationSchema
export type UndefinedInputSchema = undefined
export type InputParsed<TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema> =
  TInputSchema extends RecordValidationSchema ? RecordValidationSchemaOutput<TInputSchema> : Record<never, never>
export type InputsParsed<
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = InputParsed<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>>
export type InputRaw<TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema> =
  TInputSchema extends RecordValidationSchema ? RecordValidationSchemaInput<TInputSchema> : Record<never, never>
export type InputsRaw<
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = InputRaw<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>>
export type IsInputsSchemasDefined<
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TServerInputSchema extends InputSchema ? true : TClientInputSchema extends InputSchema ? true : false
export type InputRawMaybeOptional<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> =
  IsInputOptional<TInputSchema> extends true
    ? // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      InputRaw<TInputSchema> | undefined | void
    : InputRaw<TInputSchema>
export type InputsRawMaybeOptional<
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = InputRawMaybeOptional<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>>
export type InputRawUnknown = Record<string, unknown>
export type InputRawAny = Record<string, unknown>
export type InputParseResult<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> =
  | {
      inputParsed: InputParsed<TInputSchema>
      inputParseError: null
    }
  | {
      inputParsed: null // TODO: to undefined
      inputParseError: Error0
    }
export type InputsParseResult<
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = InputParseResult<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>>

export type SafeParseInputResult<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> =
  | {
      success: true
      data: InputParsed<TInputSchema>
      error: undefined
    }
  | {
      success: false
      data: undefined
      error: Error0
    }
export type SafeParseInputsResult<
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = SafeParseInputResult<MergeRecordValidationSchemas<TServerInputSchema, TClientInputSchema>>

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

export type WithMaybeOptionalReqiredCtx<TRequiredCtx extends RequiredCtx = RequiredCtx> =
  TRequiredCtx extends UndefinedCtx ? { requiredCtx?: TRequiredCtx } : { requiredCtx: TRequiredCtx }

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
export type IsAny<T> = 0 extends 1 & T ? true : false

export type OmitUnnamedKeys<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
}

export type FetchFn = (request: Request) => Promise<Response>
export type RichFetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export type ShowError<Message extends string> = {
  readonly __error__: Message
}
// export type ShowError<Message extends string> =
//   // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
//   { readonly __error__: Message } & never

// Helper type to exclude async components (client-only, synchronous components)
// type SyncComponentType<P = Record<string, never>> = React.ComponentClass<P> | ((props: P) => React.ReactElement | null)

// Helper type to exclude Promise types from ReactNode (client-only, synchronous ReactNode)
// export type SyncReactNode = Exclude<React.ReactNode, Promise<any>>

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
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TLocation extends AnyLocation,
> = IfAnyThenElse<
  TStatus,
  | UseLoaderResult<
      'success',
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TLocation
    >
  | UseLoaderResult<
      'error',
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TLocation
    >
  | UseLoaderResult<
      'pending',
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TLocation
    >,
  UseLoaderResult<
    TStatus,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TLocation
  >
>

export type UseLoaderResult<
  TStatus extends 'pending' | 'error' | 'success',
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TLocation extends AnyLocation,
> = TStatus extends 'success'
  ? {
      data: FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
      error: null
      loading: false
      query: HasAnyLoader<TServerLoaderOutput, TClientLoaderOutput> extends true
        ? UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TStatus> // TODO: to undefined
        : null
      input: InputParsed<TClientInputSchema>
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
        input: InputParsed<TClientInputSchema>
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
          input: InputParsed<TClientInputSchema> | null
          location: TLocation
        }
      : never
// export type UnqueriedLoaderResult<
//   TStatus extends 'pending' | 'error' | 'success',
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TInputSchema extends InputSchema | UndefinedInputSchema,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
//   TLocation extends AnyLocation,
// > = TStatus extends 'success'
//   ? {
//       data: FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>
//       error: null
//       loading: false
//       input: InputParsed<TRouteDefinition, TInputSchema>
//       inputRaw: InputRaw<TRouteDefinition, TInputSchema>
//       location: TLocation
//     }
//   : TStatus extends 'pending'
//     ? {
//         data: undefined
//         error: null
//         loading: true
//         input: InputParsed<TRouteDefinition, TInputSchema>
//         inputRaw: InputRaw<TRouteDefinition, TInputSchema>
//         location: TLocation
//       }
//     : TStatus extends 'error'
//       ? {
//           data: undefined
//           error: Error0
//           loading: false
//           input: InputParsed<TRouteDefinition, TInputSchema> | null
//           inputRaw: InputRaw<TRouteDefinition, TInputSchema>
//           location: TLocation
//         }
//       : never
// export type AnyUnqueriedLoaderResult<
//   TStatus extends 'pending' | 'error' | 'success' = any,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
//   TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
//   TLocation extends AnyLocation = AnyLocation,
// > = IfAnyThenElse<
//   TStatus,
//   | UnqueriedLoaderResult<
//       'success',
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TInputSchema,
//       TRouteDefinition,
//       TLocation
//     >
//   | UnqueriedLoaderResult<'error', TServerLoaderOutput, TClientLoaderOutput, TInputSchema, TRouteDefinition, TLocation>
//   | UnqueriedLoaderResult<
//       'pending',
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TInputSchema,
//       TRouteDefinition,
//       TLocation
//     >,
//   UnqueriedLoaderResult<TStatus, TServerLoaderOutput, TClientLoaderOutput, TInputSchema, TRouteDefinition, TLocation>
// >

// endpoint components

export type PageComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = UseLoaderResult<
  'success',
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
> & { props: FinalProps<TProps> }
export type PageComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  PageComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TClientInputSchema,
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
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = UseLoaderResult<
  'success',
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
  ExactLocation<CurrentRouteDefinition<TRouteDefinition>> | ChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
> & { props: FinalProps<TProps>; children: React.ReactNode }
export type LayoutComponent<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = React.ComponentType<
  LayoutComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TClientInputSchema,
    TProps
  >
>
export type UndefinedLayoutComponent = undefined

export type ComponentComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
> = UseLoaderResult<
  'success',
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
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
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TWithChildren extends boolean | null,
> = (IsInputsSchemasDefined<TServerInputSchema, TClientInputSchema> extends true
  ? IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
    ? { input?: InputsRaw<TServerInputSchema, TClientInputSchema> } & FinalProps<TProps>
    : { input: InputsRaw<TServerInputSchema, TClientInputSchema> } & FinalProps<TProps>
  : FinalProps<TProps>) &
  (TWithChildren extends true
    ? { children: React.ReactNode }
    : TWithChildren extends null
      ? { children?: React.ReactNode }
      : Record<never, never>)
export type MountableComponent<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TWithChildren extends boolean | null,
> = React.ComponentType<MountableComponentProps<TServerInputSchema, TClientInputSchema, TProps, TWithChildren>>

// extra components

export type DestinationComponentType = 'page' | 'component' | 'layout'
export type LoadingComponentProps<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
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
  TClientInputSchema,
  AnyLocation
>
export type LoadingComponentType<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  LoadingComponentProps<
    TType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TProps
  >
>

export type ErrorComponentProps<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
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
  TClientInputSchema,
  AnyLocation
>
export type ErrorComponentType<
  TType extends DestinationComponentType = DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  ErrorComponentProps<
    TType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TProps
  >
>

export type WrapperComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = AnyUseLoaderResult<
  any,
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
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
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
> = React.ComponentType<
  WrapperComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TProps
  >
>

export type OuterComponentProps<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
  TLocation extends AnyLocation = AnyLocation,
> = {
  input: InputParsed<TClientInputSchema>
  props: FinalProps<TProps>
  location: TLocation
  children: Exclude<React.ReactNode, Promise<any>>
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
}

export type OuterComponentType<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps = Props | UndefinedProps,
  TLocation extends AnyLocation = AnyLocation,
> = React.ComponentType<OuterComponentProps<TClientInputSchema, TProps, TLocation>>

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

export type ServerExecuteFn = <
  TPoint extends NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any>,
>(
  point: TPoint,
  ...args: TPoint['Infer']['ServerInputOptional'] extends true
    ? [input?: TPoint['Infer']['ServerInputRaw']]
    : [input: TPoint['Infer']['ServerInputRaw']]
) => Promise<ServerExecuteResult<TPoint['Infer']['Ctx'], TPoint['Infer']['ServerLoaderOutput']>>
export type ServerExecuteResult<TCtx extends Ctx, TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput> =
  | {
      ctx: TCtx
      data: TServerLoaderOutput extends Data ? TServerLoaderOutput : undefined
      response: TServerLoaderOutput extends Response ? TServerLoaderOutput : undefined
      effects: ResponseEffects
      error: null
      status: number
      output: TServerLoaderOutput
    }
  | {
      ctx: Ctx
      data: Data | UndefinedData
      response: Response | UndefinedResponse
      effects: ResponseEffects
      error: Error0
      status: number
      output: LoaderOutput | UndefinedLoaderOutput
    }

export type CtxFnOptions<
  TCtxPrev extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = ExposedCtxOrEmpty<TCtxPrev, TCtxExposedKeys> & {
  request: Request0<boolean, TServerInputSchema>
  point: EndPoint | undefined
  input: InputParsed<TServerInputSchema>
  set: ResponseEffectsSetHelper
  execute: ServerExecuteFn
  ctx: TCtxPrev
}
export type CtxFn<
  TCtxPrev extends Ctx = Ctx,
  TCtxPrevExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCtxAppend extends Ctx = Ctx,
> = (
  props: CtxFnOptions<TCtxPrev, TCtxPrevExposedKeys, TServerInputSchema>,
) =>
  | Promise<TCtxAppend>
  | Promise<[TCtxAppend, ...Array<keyof TCtxAppend>]>
  | TCtxAppend
  | [TCtxAppend, ...Array<keyof TCtxAppend>]

export type CtxFnOutput<TCtxFn extends CtxFn<any, any, any, any>> = Awaited<ReturnType<TCtxFn>>
export type ForbiddenCtxExposedKeys = 'request' | 'input' | 'inputRaw' | 'data' | 'set' | 'execute' | 'ctx'
export type AssertNoForbiddenCtxExposedKeys<TExposedKeys> = [TExposedKeys] extends [never]
  ? unknown
  : [string] extends [TExposedKeys]
    ? unknown
    : [Extract<TExposedKeys, ForbiddenCtxExposedKeys>] extends [never]
      ? unknown
      : ShowError<`Forbidden to expose ctx keys: ${Extract<TExposedKeys, ForbiddenCtxExposedKeys> & string}`>
export type InferCtxFnOutputCtxAppend<TCtxFn extends CtxFn<any, any, any, any>> =
  TCtxFn extends CtxFn<any, any, any, infer TCtxAppend> ? TCtxAppend : never
export type InferCtxFnOutputCtxExposedKeys<TCtxFn extends CtxFn<any, any, any, any>> =
  CtxFnOutput<TCtxFn> extends [infer TCtx]
    ? Extract<keyof TCtx, string>
    : CtxFnOutput<TCtxFn> extends [Ctx, ...infer TCtxExposedKeys extends string[]]
      ? TCtxExposedKeys[number]
      : undefined

export type LoaderFnOptions<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = ExposedCtxOrEmpty<TCtx, TCtxExposedKeys> & {
  request: Request0<true, TServerInputSchema>
  point: EndPoint | undefined
  input: InputParsed<TServerInputSchema>
  data: DataOrUndefinedData<TServerLoaderOutput>
  set: ResponseEffectsSetHelper
  execute: ServerExecuteFn
  ctx: TCtx
}
export type LoaderFn<
  TCtx extends Ctx = Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TNewServerLoaderOutput extends LoaderOutput = LoaderOutput,
> = (
  options: LoaderFnOptions<TCtx, TCtxExposedKeys, TServerLoaderOutput, TServerInputSchema>,
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
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
  input: InputParsed<TClientInputSchema>
}
export type ClientLoaderFn<
  TLetsEndPointType extends EndPointType | UndefinedEndPointType = EndPointType | UndefinedEndPointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = RouteDefinition | UndefinedRouteDefinition,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TNewClientLoaderOutput extends LoaderOutput = LoaderOutput,
> = (
  options: ClientLoaderFnOptions<
    TLetsEndPointType,
    TRouteDefinition,
    TClientInputSchema,
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
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TLocation extends AnyLocation = AnyLocation,
> = (
  options: HeadFnOptions<
    'success',
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TLocation
  >,
) => ResolvableHead | string

export type ErrorHeadFn<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TLocation extends AnyLocation = AnyLocation,
> = (
  options: HeadFnOptions<
    'error',
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TLocation
  >,
) => ResolvableHead | string

export type LoadingHeadFn<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TLocation extends AnyLocation = AnyLocation,
> = (
  options: HeadFnOptions<
    'pending',
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TLocation
  >,
) => ResolvableHead | string

export type HeadFnOptions<
  TStatus extends 'pending' | 'error' | 'success',
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TLocation extends AnyLocation = AnyLocation,
> = AnyUseLoaderResult<
  TStatus,
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
  TLocation
>
export type HeadFn<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TLocation extends AnyLocation = AnyLocation,
> = (
  options: HeadFnOptions<
    TStatus,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TLocation
  >,
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

// middleware

export type FetchTask = {
  pointType: EndPointType
  outputType: 'data' | 'queryClientDehydratedState'
  scope: PointsScope
  pointName: PointName
  pointInput: InputRawUnknown | undefined // in case if it is page or layout, we will parse input on task level, becouse we need it to extract totally match pageLocation
}

export type FetcherFetchDetailedResultGeneral = {
  response: Response
  request: Request0
  scope: PointsScope
  error: Error0 | null
}
export type FetcherFetchDetailedResultMiddleware = FetcherFetchDetailedResultGeneral & {
  variant: 'middleware'
}
export type FetcherFetchDetailedResultPage = FetcherFetchDetailedResultGeneral & {
  variant: 'page'
  point: EndPoint | undefined
  input: InputRawUnknown | undefined
}
export type FetcherFetchDetailedResultPoint = FetcherFetchDetailedResultGeneral & {
  variant: 'point'
  point: EndPoint | undefined
  task: FetchTask
  data: Data | undefined
  responseFormat: 'json' | 'html' | 'headers'
  input: InputRawUnknown | undefined
}
export type FetcherFetchDetailedResultUnknown = FetcherFetchDetailedResultGeneral & {
  variant: 'unknown'
}
export type FetcherFetchDetailedResultPublicdir = FetcherFetchDetailedResultGeneral & {
  variant: 'publicdir'
}

export type FetcherFetchDetailedResultNoMiddleware =
  | FetcherFetchDetailedResultPoint
  | FetcherFetchDetailedResultPage
  | FetcherFetchDetailedResultUnknown
  | FetcherFetchDetailedResultPublicdir
export type FetcherFetchDetailedResult = FetcherFetchDetailedResultNoMiddleware | FetcherFetchDetailedResultMiddleware
export type FetcherFetchDetailedResultSpecific<
  TVariant extends FetcherFetchDetailedResult['variant'] | undefined = undefined,
> = TVariant extends undefined
  ? FetcherFetchDetailedResult
  : TVariant extends 'middleware'
    ? FetcherFetchDetailedResultMiddleware
    : TVariant extends 'page'
      ? FetcherFetchDetailedResultPage
      : TVariant extends 'point'
        ? FetcherFetchDetailedResultPoint
        : TVariant extends 'unknown'
          ? FetcherFetchDetailedResultUnknown
          : TVariant extends 'publicdir'
            ? FetcherFetchDetailedResultPublicdir
            : never

export type MiddlewareNextFn = () => Promise<FetcherFetchDetailedResult>
export type MiddlewareFnOptions = {
  request: Request0
  set: ResponseEffectsSetHelper
  point: AnyNiceEndPoint | undefined
  scope: PointsScope
  variant: 'point' | 'page' | 'unknown' | 'publicdir'
  next: MiddlewareNextFn
}
export type MiddlewareFnOptionsBase = Omit<MiddlewareFnOptions, 'next'>
export type MiddlewareFn = (options: MiddlewareFnOptions) => Promise<Response | FetcherFetchDetailedResult>

// nice middle point
export type AssertNoForbiddenMethodsIfNotSuitableStage<
  TPointType extends PointType,
  TMethod extends 'ctx' | 'loader' | 'clientLoader' | 'mapper' | 'props' | 'input' | 'clientInput',
> = TPointType extends 'clientStage'
  ? TMethod extends 'loader'
    ? ShowError<`You can not use loader() in client stage. Please, drop client loader via .clientLoader(false) or add you .loader() before last .clientLoader()`>
    : TMethod extends 'ctx'
      ? ShowError<`You can not use ctx() in client stage. Please, drop client loader via .clientLoader(false) or add you .ctx() before last .clientLoader()`>
      : TMethod extends 'input'
        ? ShowError<`You can not use input() in client stage. Please, drop client loader via .clientLoader(false) or add you .ctx() before last .clientLoader()`>
        : unknown
  : TPointType extends 'mapperStage'
    ? TMethod extends 'loader'
      ? ShowError<`You can not use loader() in mapper stage. Please, drop mappers via .mapper(false) or .clientLoader(false) or add you .loader() before last .clientLoader()`>
      : TMethod extends 'ctx'
        ? ShowError<`You can not use ctx() in mapper stage. Please, drop mappers via .mapper(false) or .clientLoader(false) or add you .ctx() before last .clientLoader()`>
        : TMethod extends 'input'
          ? ShowError<`You can not use input() in mapper stage. Please, drop mappers via .mapper(false) or .clientLoader(false) or add you .loader() before last .clientLoader()`>
          : TMethod extends 'clientLoader'
            ? ShowError<`You can not use clientLoader() in mapper stage. Please, drop mappers via .mapper(false) or add you .clientLoader() before last .mapper()`>
            : TMethod extends 'clientInput'
              ? ShowError<`You can not use clientInput() in mapper stage. Please, drop mappers via .mapper(false) or add you .clientLoader() before last .mapper()`>
              : unknown
    : TPointType extends 'renderStage'
      ? TMethod extends 'loader'
        ? ShowError<`You can not use loader() in render stage. Call it before any render methods`>
        : TMethod extends 'ctx'
          ? ShowError<`You can not use ctx() in render stage. Call it before any render methods`>
          : TMethod extends 'input'
            ? ShowError<`You can not use input() in render stage. Call it before any render methods`>
            : TMethod extends 'clientLoader'
              ? ShowError<`You can not use clientLoader() in render stage. Call it before any render methods`>
              : TMethod extends 'clientInput'
                ? ShowError<`You can not use clientInput() in render stage. Call it before any render methods`>
                : TMethod extends 'mapper'
                  ? ShowError<`You can not use mapper() in render stage. Call it before any render methods`>
                  : TMethod extends 'props'
                    ? ShowError<`You can not use props() in render stage. Call it before any render methods`>
                    : unknown
      : unknown

export type NiceRootStagePoint<
  TPointType extends StagePointType,
  TLetsEndPointType extends 'root',
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  | 'root'
  | 'middleware'
  | 'ssr'
  | 'transformer'
  // | 'fetchFn'
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
  | 'clientInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'mapper'
  | 'head'
  | 'scrollPosition'
  | 'scrollRestore'
  | 'prefetchPolicy'
  | 'onPrefetch'
  | 'prefetchOnLinkHover'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NiceBaseStagePoint<
  TPointType extends StagePointType,
  TLetsEndPointType extends 'base',
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
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
  | 'clientInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'mapper'
  | 'head'
  | 'scrollPosition'
  | 'scrollRestore'
  | 'prefetchPolicy'
  | 'onPrefetch'
  | 'prefetchOnLinkHover'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NicePageStagePoint<
  TPointType extends StagePointType,
  TLetsEndPointType extends 'page',
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  | 'page'
  | 'fetchOptions'
  | 'error'
  | 'loading'
  | 'wrapper'
  | 'outer'
  | 'input'
  | 'clientInput'
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
  | 'prefetchOnLinkHover'
  | 'point'
  | 'type'
  | 'Infer'
  | 'query'
  | 'infiniteQuery'
>

export type NiceComponentStagePoint<
  TPointType extends StagePointType,
  TLetsEndPointType extends 'component',
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  | 'component'
  | 'fetchOptions'
  | 'error'
  | 'loading'
  | 'wrapper'
  | 'outer'
  | 'input'
  | 'clientInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'mapper'
  // | 'flatter'
  | 'props'
  | 'onPrefetch'
  | 'point'
  | 'type'
  | 'Infer'
  | 'query'
  | 'infiniteQuery'
>

export type NiceQueryStagePoint<
  TPointType extends StagePointType,
  TLetsEndPointType extends 'query',
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  | 'query'
  | 'fetchOptions'
  | 'input'
  | 'clientInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'mapper'
  | 'onPrefetch'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NiceInfiniteQueryStagePoint<
  TPointType extends StagePointType,
  TLetsEndPointType extends 'infiniteQuery',
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  | 'infiniteQuery'
  | 'fetchOptions'
  | 'input'
  | 'clientInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'mapper'
  // | 'flatter'
  | 'onPrefetch'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NiceMutationStagePoint<
  TPointType extends StagePointType,
  TLetsEndPointType extends 'mutation',
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  | 'mutation'
  // | 'asFormData'
  | 'fetchOptions'
  | 'input'
  | 'clientInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'mapper'
  | 'point'
  | 'type'
  | 'Infer'
>

export type NiceLayoutStagePoint<
  TPointType extends StagePointType,
  TLetsEndPointType extends 'layout',
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
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
  | 'clientInput'
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
  | 'prefetchOnLinkHover'
  | 'point'
  | 'type'
  | 'Infer'
  | 'query'
  | 'infiniteQuery'
>

export type NiceProviderStagePoint<
  TPointType extends StagePointType,
  TLetsEndPointType extends 'provider',
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  | 'provider'
  | 'fetchOptions'
  | 'input'
  | 'clientInput'
  | 'ctx'
  | 'loader'
  | 'clientLoader'
  | 'mapper'
  // | 'flatter'
  | 'onPrefetch'
  | 'point'
  | 'type'
  | 'Infer'
  | 'query'
  | 'infiniteQuery'
  | 'error'
  | 'loading'
  | 'wrapper'
>

export type NiceStagePoint<
  TPointType extends StagePointType,
  TLetsEndPointType extends EndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TProps extends Props | UndefinedProps,
> = TLetsEndPointType extends 'root'
  ? NiceRootStagePoint<
      TPointType,
      TLetsEndPointType,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TQueryResultType,
      TProps
    >
  : TLetsEndPointType extends 'base'
    ? NiceBaseStagePoint<
        TPointType,
        TLetsEndPointType,
        TRequiredCtx,
        TCtx,
        TCtxExposedKeys,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TRouteDefinition,
        TServerInputSchema,
        TClientInputSchema,
        TQueryResultType,
        TProps
      >
    : TLetsEndPointType extends 'page'
      ? NicePageStagePoint<
          TPointType,
          TLetsEndPointType,
          TRequiredCtx,
          TCtx,
          TCtxExposedKeys,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TRouteDefinition,
          TServerInputSchema,
          TClientInputSchema,
          TQueryResultType,
          TProps
        >
      : TLetsEndPointType extends 'component'
        ? NiceComponentStagePoint<
            TPointType,
            TLetsEndPointType,
            TRequiredCtx,
            TCtx,
            TCtxExposedKeys,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TRouteDefinition,
            TServerInputSchema,
            TClientInputSchema,
            TQueryResultType,
            TProps
          >
        : TLetsEndPointType extends 'query'
          ? NiceQueryStagePoint<
              TPointType,
              TLetsEndPointType,
              TRequiredCtx,
              TCtx,
              TCtxExposedKeys,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TClientMapperOutput,
              TRouteDefinition,
              TServerInputSchema,
              TClientInputSchema,
              TQueryResultType,
              TProps
            >
          : TLetsEndPointType extends 'infiniteQuery'
            ? NiceInfiniteQueryStagePoint<
                TPointType,
                TLetsEndPointType,
                TRequiredCtx,
                TCtx,
                TCtxExposedKeys,
                TServerLoaderOutput,
                TClientLoaderOutput,
                TClientMapperOutput,
                TRouteDefinition,
                TServerInputSchema,
                TClientInputSchema,
                TQueryResultType,
                TProps
              >
            : TLetsEndPointType extends 'mutation'
              ? NiceMutationStagePoint<
                  TPointType,
                  TLetsEndPointType,
                  TRequiredCtx,
                  TCtx,
                  TCtxExposedKeys,
                  TServerLoaderOutput,
                  TClientLoaderOutput,
                  TClientMapperOutput,
                  TRouteDefinition,
                  TServerInputSchema,
                  TClientInputSchema,
                  TQueryResultType,
                  TProps
                >
              : TLetsEndPointType extends 'layout'
                ? NiceLayoutStagePoint<
                    TPointType,
                    TLetsEndPointType,
                    TRequiredCtx,
                    TCtx,
                    TCtxExposedKeys,
                    TServerLoaderOutput,
                    TClientLoaderOutput,
                    TClientMapperOutput,
                    TRouteDefinition,
                    TServerInputSchema,
                    TClientInputSchema,
                    TQueryResultType,
                    TProps
                  >
                : TLetsEndPointType extends 'provider'
                  ? NiceProviderStagePoint<
                      TPointType,
                      TLetsEndPointType,
                      TRequiredCtx,
                      TCtx,
                      TCtxExposedKeys,
                      TServerLoaderOutput,
                      TClientLoaderOutput,
                      TClientMapperOutput,
                      TRouteDefinition,
                      TServerInputSchema,
                      TClientInputSchema,
                      TQueryResultType,
                      TProps
                    >
                  : never

// nice end point

// | 'root'
// | 'base'
// | 'page'
// | 'component'
// | 'query'
// | 'infiniteQuery'
// | 'mutation'
// | 'layout'
// | 'provider'

// type ShowErrorIfNotSuitableEndPointType<
//   TPointType extends PointType,
//   TLetsEndPointType extends EndPointType,
//   TAllowedEndPointTypes extends EndPointType,
// > = TAllowedEndPointTypes extends TLetsEndPointType
//   ? unknown
//   : ShowError<`You can not use .lets('${TLetsEndPointType}') in ${TPointType} end point`>
// export type AssertNoForbiddenLetsIfNotSuitableEndPointType<
//   TPointType extends PointType,
//   TLetsEndPointType extends EndPointType,
// > = TPointType extends 'base'
//   ? ShowErrorIfNotSuitableEndPointType<
//       TPointType,
//       TLetsEndPointType,
//       'base' | 'page' | 'component' | 'query' | 'infiniteQuery' | 'mutation' | 'layout' | 'provider'
//     >
//   : TPointType extends 'page'
//     ? ShowErrorIfNotSuitableEndPointType<
//         TPointType,
//         TLetsEndPointType,
//         'page' | 'component' | 'query' | 'infiniteQuery' | 'mutation' | 'layout' | 'provider'
//       >
//     : unknown

export type NiceRootEndPoint<
  TPointType extends 'root',
  TLetsEndPointType extends UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  'lets' | 'point' | 'type' | 'Infer'
>

export type NiceBaseEndPoint<
  TPointType extends 'base',
  TLetsEndPointType extends UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  'lets' | 'point' | 'type' | 'Infer'
>

export type WithFetchIfHasServerLoader<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TLiteral extends string,
> = TServerLoaderOutput extends LoaderOutput ? TLiteral | 'getFetchOptions' | 'fetch' | 'fetchDetailed' : TLiteral
export type WithExecuteEndLiteralsIfSuitable<
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TLiteral extends string,
> = TQueryResultType extends 'query'
  ? WithFetchIfHasServerLoader<
      TServerLoaderOutput,
      | TLiteral
      | 'useLoader'
      | 'useQuery'
      | 'getQueryKey'
      | 'getQueryOptions'
      | 'prefetchQuery'
      | 'execute'
      | 'executeDetailed'
    >
  : TQueryResultType extends 'infiniteQuery'
    ? WithFetchIfHasServerLoader<
        TServerLoaderOutput,
        | TLiteral
        | 'useLoader'
        | 'useInfiniteQuery'
        | 'getQueryKey'
        | 'getInfiniteQueryOptions'
        | 'prefetchInfiniteQuery'
        | 'execute'
        | 'executeDetailed'
      >
    : TClientMapperOutput extends MapperOutput
      ? TLiteral | 'useLoader' | 'execute' | 'executeDetailed'
      : TLiteral

export type NicePageEndPoint<
  TPointType extends 'page',
  TLetsEndPointType extends UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  WithExecuteEndLiteralsIfSuitable<
    TServerLoaderOutput,
    TClientMapperOutput,
    TQueryResultType,
    'point' | 'type' | 'Infer' | 'Page' | 'X' | 'route'
  >
>

export type NiceComponentEndPoint<
  TPointType extends 'component',
  TLetsEndPointType extends UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  WithExecuteEndLiteralsIfSuitable<
    TServerLoaderOutput,
    TClientMapperOutput,
    TQueryResultType,
    'point' | 'type' | 'Infer' | 'Component' | 'X'
  >
>

export type NiceLayoutEndPoint<
  TPointType extends 'layout',
  TLetsEndPointType extends UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  WithExecuteEndLiteralsIfSuitable<
    TServerLoaderOutput,
    TClientMapperOutput,
    TQueryResultType,
    'point' | 'type' | 'lets' | 'useValue' | 'getValue' | 'getValueWeak' | 'Infer' | 'Layout' | 'X' | 'route'
  >
>

export type NiceQueryEndPoint<
  TPointType extends 'query',
  TLetsEndPointType extends UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  WithExecuteEndLiteralsIfSuitable<
    TServerLoaderOutput,
    TClientMapperOutput,
    TQueryResultType,
    'point' | 'type' | 'Infer'
  >
>

export type NiceInfiniteQueryEndPoint<
  TPointType extends 'infiniteQuery',
  TLetsEndPointType extends UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  WithExecuteEndLiteralsIfSuitable<
    TServerLoaderOutput,
    TClientMapperOutput,
    TQueryResultType,
    'point' | 'type' | 'Infer'
  >
>

export type NiceMutationEndPoint<
  TPointType extends 'mutation',
  TLetsEndPointType extends UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  WithFetchIfHasServerLoader<
    TServerLoaderOutput,
    'point' | 'type' | 'getMutationOptions' | 'useMutation' | 'Infer' | 'execute' | 'executeDetailed'
  >
>

export type NiceProviderEndPoint<
  TPointType extends 'provider',
  TLetsEndPointType extends UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
    TServerInputSchema,
    TClientInputSchema,
    TQueryResultType,
    TProps
  >,
  WithExecuteEndLiteralsIfSuitable<
    TServerLoaderOutput,
    TClientMapperOutput,
    TQueryResultType,
    'point' | 'type' | 'useValue' | 'getValue' | 'getValueWeak' | 'Provider' | 'X' | 'Infer'
  >
>

export type NiceEndPoint<
  TPointType extends EndPointType,
  TLetsEndPointType extends UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
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
      TServerInputSchema,
      TClientInputSchema,
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
        TServerInputSchema,
        TClientInputSchema,
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
          TServerInputSchema,
          TClientInputSchema,
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
            TServerInputSchema,
            TClientInputSchema,
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
              TServerInputSchema,
              TClientInputSchema,
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
                TServerInputSchema,
                TClientInputSchema,
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
                  TServerInputSchema,
                  TClientInputSchema,
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
                    TServerInputSchema,
                    TClientInputSchema,
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
                      TServerInputSchema,
                      TClientInputSchema,
                      TQueryResultType,
                      TProps
                    >
                  : never

export type AnyNiceEndPoint<
  TPointType extends EndPointType = any,
  TLetsEndPointType extends UndefinedEndPointType = UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = NiceEndPoint<
  TPointType,
  TLetsEndPointType,
  TRequiredCtx,
  TCtx,
  TCtxExposedKeys,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TRouteDefinition,
  TServerInputSchema,
  TClientInputSchema,
  TQueryResultType,
  TProps
>
export type AnyNiceRequestableEndPoint<
  TPointType extends RequestableEndPointType = RequestableEndPointType,
  TLetsEndPointType extends UndefinedEndPointType = UndefinedEndPointType,
  TRequiredCtx extends RequiredCtx = any,
  TCtx extends Ctx = any,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TProps extends Props | UndefinedProps = any,
> = NiceEndPoint<
  TPointType,
  TLetsEndPointType,
  TRequiredCtx,
  TCtx,
  TCtxExposedKeys,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TRouteDefinition,
  TServerInputSchema,
  TClientInputSchema,
  TQueryResultType,
  TProps
>

// export type AnyNiceEndPoint<
//   TPointType extends EndPointType = any,
//   TLetsEndPointType extends UndefinedEndPointType = UndefinedEndPointType,
//   TRequiredCtx extends RequiredCtx = any,
//   TCtx extends Ctx = any,
//   TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys = any,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
//   TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
//   TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
//   TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition = any,
//   TInputSchema extends InputSchema | UndefinedInputSchema = any,
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
//   TProps extends Props | UndefinedProps = any,
// > = IfAnyThenElse<
//   TPointType,
//   | _AnyNiceEndPoint<
//       'root',
//       TLetsEndPointType,
//       TRequiredCtx,
//       TCtx,
//       TCtxExposedKeys,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TClientMapperOutput,
//       TRouteDefinition,
//       TPrevRouteDefinition,
//       TInputSchema,
//       TQueryResultType,
//       TProps
//     >
//   | _AnyNiceEndPoint<
//       'base',
//       TLetsEndPointType,
//       TRequiredCtx,
//       TCtx,
//       TCtxExposedKeys,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TClientMapperOutput,
//       TRouteDefinition,
//       TPrevRouteDefinition,
//       TInputSchema,
//       TQueryResultType,
//       TProps
//     >
//   | _AnyNiceEndPoint<
//       'page',
//       TLetsEndPointType,
//       TRequiredCtx,
//       TCtx,
//       TCtxExposedKeys,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TClientMapperOutput,
//       TRouteDefinition,
//       TPrevRouteDefinition,
//       TInputSchema,
//       TQueryResultType,
//       TProps
//     >
//   | _AnyNiceEndPoint<
//       'component',
//       TLetsEndPointType,
//       TRequiredCtx,
//       TCtx,
//       TCtxExposedKeys,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TClientMapperOutput,
//       TRouteDefinition,
//       TPrevRouteDefinition,
//       TInputSchema,
//       TQueryResultType,
//       TProps
//     >
//   | _AnyNiceEndPoint<
//       'query',
//       TLetsEndPointType,
//       TRequiredCtx,
//       TCtx,
//       TCtxExposedKeys,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TClientMapperOutput,
//       TRouteDefinition,
//       TPrevRouteDefinition,
//       TInputSchema,
//       TQueryResultType,
//       TProps
//     >
//   | _AnyNiceEndPoint<
//       'infiniteQuery',
//       TLetsEndPointType,
//       TRequiredCtx,
//       TCtx,
//       TCtxExposedKeys,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TClientMapperOutput,
//       TRouteDefinition,
//       TPrevRouteDefinition,
//       TInputSchema,
//       TQueryResultType,
//       TProps
//     >
//   | _AnyNiceEndPoint<
//       'mutation',
//       TLetsEndPointType,
//       TRequiredCtx,
//       TCtx,
//       TCtxExposedKeys,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TClientMapperOutput,
//       TRouteDefinition,
//       TPrevRouteDefinition,
//       TInputSchema,
//       TQueryResultType,
//       TProps
//     >
//   | _AnyNiceEndPoint<
//       'layout',
//       TLetsEndPointType,
//       TRequiredCtx,
//       TCtx,
//       TCtxExposedKeys,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TClientMapperOutput,
//       TRouteDefinition,
//       TPrevRouteDefinition,
//       TInputSchema,
//       TQueryResultType,
//       TProps
//     >
//   | _AnyNiceEndPoint<
//       'provider',
//       TLetsEndPointType,
//       TRequiredCtx,
//       TCtx,
//       TCtxExposedKeys,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TClientMapperOutput,
//       TRouteDefinition,
//       TPrevRouteDefinition,
//       TInputSchema,
//       TQueryResultType,
//       TProps
//     >,
//   _AnyNiceEndPoint<
//     TPointType,
//     TLetsEndPointType,
//     TRequiredCtx,
//     TCtx,
//     TCtxExposedKeys,
//     TServerLoaderOutput,
//     TClientLoaderOutput,
//     TClientMapperOutput,
//     TRouteDefinition,
//     TPrevRouteDefinition,
//     TInputSchema,
//     TQueryResultType,
//     TProps
//   >
// >

// type X = AnyNiceEndPoint['type']
// const x: AnyNiceEndPoint
// // x.
// if (x.type === 'page') {
//   x.
// }

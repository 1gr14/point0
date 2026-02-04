// export const useLoader = (
//   ...args: IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
//     ? [
//         input?: InputsRaw<TServerInputSchema, TClientInputSchema>,
//         queryOptions?:
//           | ExtraUseQueryOptions
//           | ExtraUseInfiniteQueryOptions<
//               InputsRaw<TServerInputSchema, TClientInputSchema>,
//               FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
//               Error0,
//               InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
//               QueryKey,
//               unknown
//             >
//           | undefined,
//         fetchOptions?: FetchOptions | undefined,
//         _clientInputParseResult?: InputParseResult<TClientInputSchema>,
//       ]
//     : [
//         input: InputsRaw<TServerInputSchema, TClientInputSchema>,
//         queryOptions?:
//           | ExtraUseQueryOptions
//           | ExtraUseInfiniteQueryOptions<
//               InputsRaw<TServerInputSchema, TClientInputSchema>,
//               FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
//               Error0,
//               InfiniteData<FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>>,
//               QueryKey,
//               unknown
//             >
//           | undefined,
//         fetchOptions?: FetchOptions | undefined,
//         _clientInputParseResult?: InputParseResult<TClientInputSchema>,
//       ]
// ): AnyUseLoaderResult<
//   any,
//   TQueryResultType,
//   TServerLoaderOutput,
//   TClientLoaderOutput,
//   TMapperOutput,
//   TClientInputSchema,
//   AnyLocation
// > & { dataOrLastInfiteData: FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput> } => {
//   const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()
//   const [inputRaw = {}, queryOptions, fetchOptions, _clientInputParseResult] = args

//   const clientInputParseResult = React.useMemo<InputParseResult<TClientInputSchema>>(() => {
//     if (_clientInputParseResult) {
//       return _clientInputParseResult
//     }
//     const result = this.parseClientInputSafe(inputRaw as never)
//     if (!result.success) {
//       return { inputParsed: null, inputParseError: result.error } as InputParseResult<TClientInputSchema>
//     }
//     return { inputParsed: result.data, inputParseError: null } as InputParseResult<TClientInputSchema>
//   }, [this._getTransformer().stringify(inputRaw), _clientInputParseResult])

//   if (!this._hasServerLoader() && !this._hasClientLoader()) {
//     const result = React.useMemo(() => {
//       // const data = (
//       //   clientInputParseResult.inputParsed
//       //     ? this._mapperFns.reduce(
//       //         (data, mapperFn) => mapperFn({ data, input: clientInputParseResult.inputParsed }),
//       //         undefined as never,
//       //       )
//       //     : undefined
//       // ) as never
//       const data = undefined as never
//       return {
//         data,
//         loading: false as const,
//         error: (clientInputParseResult.inputParseError ?? null) as never,
//         query: null,
//         location,
//         input: clientInputParseResult.inputParsed,
//         dataOrLastInfiteData: data,
//       }
//     }, [clientInputParseResult, inputRaw, location])
//     return result
//   }
//   const query =
//     this._queryResultType === 'infiniteQuery'
//       ? this.useInfiniteQuery(inputRaw as never, queryOptions as never, fetchOptions as never)
//       : this.useQuery(inputRaw as never, queryOptions as never, fetchOptions as never)
//   const mappedData = useMemo(() => {
//     if (!query.data) {
//       return undefined
//     }
//     if (!this._mapperFns.length) {
//       return query.data
//     }
//     if (!clientInputParseResult.inputParsed) {
//       return undefined
//     }
//     return this._mapperFns.reduce(
//       (data, mapperFn) => mapperFn({ data, input: clientInputParseResult.inputParsed }),
//       query.data,
//     )
//   }, [query.data])
//   const result = React.useMemo(() => {
//     const dataOrLastInfiteData =
//       this._queryResultType === 'infiniteQuery' ? (query.data as any)?.pages?.at(-1) : query.data
//     return {
//       data: mappedData as never,
//       loading: query.isLoading as never,
//       error: (query.error ? Error0.from(query.error) : null) as never,
//       query: query as never,
//       location,
//       input: clientInputParseResult.inputParsed,
//       dataOrLastInfiteData,
//     }
//   }, [query, query.data, query.error, query.isLoading, clientInputParseResult, location, mappedData])
//   return result
// }

import type { Error0 } from '@devp0nt/error0'
import type { AnyLocation, ExactLocation } from '@devp0nt/route0'
import type { UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query'
import type * as React from 'react'
import type { ResolvableHead } from 'unhead/types'
import type {
  CurrentRouteDefinition,
  Data,
  EmptyData,
  EndPointType,
  FinalLoaderOutput,
  IfAnyThenElse,
  // IfAnyThenElse,
  InputParsed,
  InputSchema,
  InputsRaw,
  IsInputsOptional,
  IsInputsSchemasDefined,
  IsNever,
  LoaderOutput,
  MapperOutput,
  MountablePointType,
  PointType,
  QueryableEndPointType,
  QueryResultType,
  RouteDefinition,
  ShowError,
  UndefinedEndPointType,
  UndefinedInputSchema,
  UndefinedLoaderOutput,
  UndefinedMapperOutput,
  UndefinedQueryResultType,
  UndefinedRouteDefinition,
  UsePointQueryResult,
} from './types.js'

// type NormalizeQueries<
//   TQueryOption,
//   TQueriesOptions extends readonly unknown[] | undefined,
// > = TQueryOption extends undefined
//   ? TQueriesOptions extends readonly unknown[]
//     ? [...TQueriesOptions]
//     : []
//   : [TQueryOption, ...(TQueriesOptions extends readonly unknown[] ? [...TQueriesOptions] : [])]

// type QueryResults<TQueryOption, TQueriesOptions extends readonly unknown[] | undefined> = QueriesResults<
//   NormalizeQueries<TQueryOption, TQueriesOptions>
// >

// type FirstQueryResult<TQueryOption, TQueriesOptions extends readonly unknown[] | undefined> =
//   QueryResults<TQueryOption, TQueriesOptions> extends [infer Head, ...unknown[]] ? Head : undefined

// type FirstQueryData<TQueryOption, TQueriesOptions extends readonly unknown[] | undefined> =
//   FirstQueryResult<TQueryOption, TQueriesOptions> extends { data?: infer TData } ? TData : undefined
// type QueryDataByOptions<TQueryOption> =

// type Mapper<TQueryOption, TQueriesOptions extends readonly unknown[], TMapperOutput> = (options: {
//   data: FirstQueryData<TQueryOption, TQueriesOptions>
//   queries: QueryResults<TQueryOption, TQueriesOptions>
// }) => TMapperOutput

export type Props = Record<string, any>
export type UndefinedProps = undefined
export type EmptyProps = Record<never, never>
// export type IsPropsOptional<TOuterProps extends Props = Props> = TOuterProps extends undefined
//   ? true
//   : keyof TOuterProps extends never // no keys at all
//     ? true
//     : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
//       {} extends TOuterProps // all keys optional
//       ? true
//       : false
export type AppendProps<TPrevProps extends Props, TAppendProps extends Props> = TPrevProps extends Props
  ? IsNever<keyof TPrevProps> extends true
    ? TAppendProps
    : Omit<TPrevProps, keyof TAppendProps> & TAppendProps
  : TAppendProps

// export type WithQueries<
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TQueries extends Queries,
// > =
//   FinalLoaderUnmappedOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
//     ? TQueries extends Queries
//       ? [UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, any>, ...TQueries]
//       : [UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, any>]
//     : TQueries extends Queries
//       ? TQueries
//       : []

export type UseQueryOrInfiniteQueryResult = UseInfiniteQueryResult | UseQueryResult
export type Queries = UseQueryOrInfiniteQueryResult[]

export type AppendQueries<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TQueries extends Queries,
> =
  FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
    ? TQueryResultType extends QueryResultType
      ? [...TQueries, UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, any>]
      : TQueries
    : TQueries
// export type RemoveLastQuery<TQueries extends Queries> = TQueries extends [...infer Rest, any]
//   ? Extract<Rest, Queries>
//   : []
// export type ReplaceLastQuery<
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TQueries extends Queries,
// > = TServerLoaderOutput extends UndefinedLoaderOutput
//   ? TClientLoaderOutput extends UndefinedLoaderOutput
//     ? RemoveLastQuery<TQueries>
//     : TQueries extends [...infer Rest, any]
//       ? [
//           ...Extract<Rest, Queries>,
//           UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, any>,
//         ]
//       : [UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, any>]
//   : TQueries extends [...infer Rest, any]
//     ? [...Extract<Rest, Queries>, UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, any>]
//     : [UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, any>]
// export type AppendQueries<
//   TQueries extends Queries,
//   TQueries extends Queries,
// > = TQueries extends [infer Q1, ...infer Rest]
//   ? [Q1 extends UseQueryOrInfiniteQueryResult ? Q1 : never, ...AppendQueries<Extract<Rest, Queries>, TQueries>]
//   : TQueries extends Queries
//     ? TQueries
//     : TQueries extends undefined
//       ? TQueries extends undefined
//         ? undefined
//         : []
//       : []

// export type QueryWithQueries<
//   TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
//   TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
// > = TQuery extends UseQueryOrInfiniteQueryResult
//   ? TQueries extends UseQueryOrInfiniteQueryResult[]
//     ? [TQuery, ...TQueries]
//     : [TQuery]
//   : TQuery extends UseQueryOrInfiniteQueryResult[]
//     ? TQueries
//     : []

export type QuerySuccess<TQuery extends UseQueryOrInfiniteQueryResult> = Extract<TQuery, { status: 'success' }>
export type QueryError<TQuery extends UseQueryOrInfiniteQueryResult> = Extract<TQuery, { status: 'error' }>
export type QueryPending<TQuery extends UseQueryOrInfiniteQueryResult> = Extract<TQuery, { status: 'pending' }>
export type QueryUnknownStatus<TQuery extends UseQueryOrInfiniteQueryResult> =
  TQuery extends UseQueryResult<infer TData, infer TError>
    ? UseQueryResult<TData, TError>
    : TQuery extends UseInfiniteQueryResult<infer TData, infer TError>
      ? UseInfiniteQueryResult<TData, TError>
      : never
export type QueriesSuccess<TQueries extends UseQueryOrInfiniteQueryResult[]> = TQueries extends [
  infer Q1,
  ...infer Rest,
]
  ? [
      QuerySuccess<Q1 extends UseQueryOrInfiniteQueryResult ? Q1 : never>,
      ...QueriesSuccess<Extract<Rest, UseQueryOrInfiniteQueryResult[]>>,
    ]
  : []
export type QueriesUnknownStatus<TQueries extends UseQueryOrInfiniteQueryResult[]> = TQueries extends [
  infer Q1,
  ...infer Rest,
]
  ? [
      QueryUnknownStatus<Q1 extends UseQueryOrInfiniteQueryResult ? Q1 : never>,
      ...QueriesUnknownStatus<Extract<Rest, UseQueryOrInfiniteQueryResult[]>>,
    ]
  : []
export type QueryData<TQuery extends UseQueryOrInfiniteQueryResult> = TQuery extends { data?: infer TData }
  ? Exclude<TData, undefined> extends infer TClean
    ? [TClean] extends [never]
      ? Data
      : unknown extends TClean
        ? Data
        : TClean
    : Data
  : Data

//   export type QueriesSuccess<TQueries extends UseQueryOrInfiniteQueryResult[]> = IfAnyThenElse<
//   TQueries,
//   TQueries,
//   TQueries extends [infer Q1, ...infer Rest]
//     ? [
//         QuerySuccess<Q1 extends UseQueryOrInfiniteQueryResult ? Q1 : never>,
//         ...QueriesSuccess<Extract<Rest, UseQueryOrInfiniteQueryResult[]>>,
//       ]
//     : []
// >
// export type QueriesUnknownStatus<TQueries extends UseQueryOrInfiniteQueryResult[]> = IfAnyThenElse<
//   TQueries,
//   TQueries,
//   TQueries extends [infer Q1, ...infer Rest]
//     ? [
//         QueryUnknownStatus<Q1 extends UseQueryOrInfiniteQueryResult ? Q1 : never>,
//         ...QueriesUnknownStatus<Extract<Rest, UseQueryOrInfiniteQueryResult[]>>,
//       ]
//     : []
// >
// export type QueryData<TQuery extends UseQueryOrInfiniteQueryResult> = IfAnyThenElse<
//   TQuery,
//   any,
//   TQuery extends { data?: infer TData }
//     ? Exclude<TData, undefined> extends infer TClean
//       ? [TClean] extends [never]
//         ? Data
//         : unknown extends TClean
//           ? Data
//           : TClean
//       : Data
//     : Data
// >

export type MountableSuccessData<
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = TMapperOutput extends MapperOutput
  ? TMapperOutput
  : TQueries extends [infer Q1, ...any[]]
    ? Q1 extends UseQueryOrInfiniteQueryResult
      ? QueryData<Q1>
      : EmptyData
    : EmptyData

//     export type MountableSuccessData<
//   TQueries extends Queries,
//   TMapperOutput extends MapperOutput | UndefinedMapperOutput,
// > = IfAnyThenElse<
//   TQueries,
//   Data,
//   TMapperOutput extends MapperOutput
//     ? TMapperOutput
//     : TQueries extends [infer Q1, ...any[]]
//       ? Q1 extends UseQueryOrInfiniteQueryResult
//         ? QueryData<Q1>
//         : EmptyData
//       : EmptyData
// >

// export type QueryDataOrUndefined<TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined> =
//   TQuery extends UseQueryOrInfiniteQueryResult ? TQuery['data'] : undefined

// export type MapperFnOptions<
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
//   TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
// > = {
//   input: InputParsed<TClientInputSchema>
//   data: QueryDataOrUndefined<TQuery>
//   queries: QueryWithQueries<TQuery, TQueries>
// }
// export type MapperFn<
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
//   TQueriesIntents extends UseQueryIntent[] | undefined = undefined,
//   TMapperOutput = QueryDataOrUndefined<TQuery>,
// > = (options: MapperFnOptions<TClientInputSchema, TQuery, TQueries>) => TMapperOutput

// export type UseMountableResultSuccess<
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TMapperOutput extends MapperOutput | UndefinedMapperOutput,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema,
//   TQueries extends Queries,
// > = {
//   input: InputParsed<TClientInputSchema>
//   queries: QueriesSuccess<WithQueries<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TQueries>>
//   data: FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TMapperOutput>
//   loading: false
//   error: null
//   status: 'success'
// }
// export type UseMountableResultPending<
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   TMapperOutput extends MapperOutput | UndefinedMapperOutput,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema,
//   TQueries extends Queries,
// > = {
//   input: InputParsed<TClientInputSchema> | undefined
//   queries: WithQueries<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TQueries>
//   data: undefined
//   loading: true
//   error: undefined
//   status: 'pending'
// }
// export type UseMountableResultError<
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TMapperOutput extends MapperOutput | UndefinedMapperOutput,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema,
//   TQueries extends Queries,
// > = {
//   input: InputParsed<TClientInputSchema> | undefined
//   queries: undefined | WithQueries<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TQueries>
//   data:
//     | undefined
//     | FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TMapperOutput>
//   loading: false
//   error: Error0
//   status: 'error'
// }
// export type UseMountableResult<
//   TStatus extends 'pending' | 'error' | 'success',
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TMapperOutput extends MapperOutput | UndefinedMapperOutput,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema,
//   TQueries extends Queries,
// > = IfAnyThenElse<
//   TStatus,
//   | UseMountableResultSuccess<
//       TQueryResultType,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TMapperOutput,
//       TClientInputSchema,
//       TQueries
//     >
//   | UseMountableResultPending<
//       TQueryResultType,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TMapperOutput,
//       TClientInputSchema,
//       TQueries
//     >
//   | UseMountableResultError<
//       TQueryResultType,
//       TServerLoaderOutput,
//       TClientLoaderOutput,
//       TMapperOutput,
//       TClientInputSchema,
//       TQueries
//     >,
//   TStatus extends 'success'
//     ? UseMountableResultSuccess<
//         TQueryResultType,
//         TServerLoaderOutput,
//         TClientLoaderOutput,
//         TMapperOutput,
//         TClientInputSchema,
//         TQueries
//       >
//     : TStatus extends 'pending'
//       ? UseMountableResultPending<
//           TQueryResultType,
//           TServerLoaderOutput,
//           TClientLoaderOutput,
//           TMapperOutput,
//           TClientInputSchema,
//           TQueries
//         >
//       : TStatus extends 'error'
//         ? UseMountableResultError<
//             TQueryResultType,
//             TServerLoaderOutput,
//             TClientLoaderOutput,
//             TMapperOutput,
//             TClientInputSchema,
//             TQueries
//           >
//         : never
// >

export type MountableStateError<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
> = {
  input: InputParsed<TClientInputSchema>
  props: TInnerProps
  // queries: QueriesUnknownStatus<TQueries>
  queries: TQueries
  data: undefined
  error: Error0
  loading: false
  status: 'error'
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
}
export type MountableStatePending<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
> = {
  input: InputParsed<TClientInputSchema>
  props: TInnerProps
  // queries: QueriesUnknownStatus<TQueries>
  queries: TQueries
  data: undefined
  error: undefined
  loading: true
  status: 'pending'
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
}
export type MountableStateSuccess<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  input: InputParsed<TClientInputSchema>
  props: TInnerProps
  queries: QueriesSuccess<TQueries>
  data: MountableSuccessData<TQueries, TMapperOutput>
  error: undefined
  loading: false
  status: 'success'
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
}
export type MountableState<
  TStatus extends 'loading' | 'error' | 'success',
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = IfAnyThenElse<
  TStatus,
  | MountableStateSuccess<TClientInputSchema, TInnerProps, TQueries, TMapperOutput>
  | MountableStatePending<TClientInputSchema, TInnerProps, TQueries>
  | MountableStateError<TClientInputSchema, TInnerProps, TQueries>,
  TStatus extends 'success'
    ? MountableStateSuccess<TClientInputSchema, TInnerProps, TQueries, TMapperOutput>
    : TStatus extends 'loading'
      ? MountableStatePending<TClientInputSchema, TInnerProps, TQueries>
      : TStatus extends 'error'
        ? MountableStateError<TClientInputSchema, TInnerProps, TQueries>
        : never
>

export type DestinationComponentType = 'page' | 'component' | 'layout'
export type ErrorComponentProps<TType extends DestinationComponentType> = {
  type: TType
  error: Error0
}
export type ErrorComponentType<TType extends DestinationComponentType> = React.ComponentType<ErrorComponentProps<TType>>

export type LoadingComponentProps<TType extends DestinationComponentType> = {
  type: TType
}
export type LoadingComponentType<TType extends DestinationComponentType> = React.ComponentType<
  LoadingComponentProps<TType>
>

export type SuccessComponentProps<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  input: InputParsed<TClientInputSchema>
  props: TInnerProps
  queries: QueriesSuccess<TQueries>
  data: MountableSuccessData<TQueries, TMapperOutput>
}
export type SuccessComponentType<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<SuccessComponentProps<TClientInputSchema, TInnerProps, TQueries, TMapperOutput>>

export type MapperFnOptions<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  input: InputParsed<TClientInputSchema>
  props: TInnerProps
  queries: QueriesSuccess<TQueries>
  data: MountableSuccessData<TQueries, TMapperOutput>
}
export type MapperFn<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TNewMapperOutput extends MapperOutput,
> = (options: MapperFnOptions<TClientInputSchema, TInnerProps, TQueries, TMapperOutput>) => TNewMapperOutput

export type WrapperFnOptions<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableState<any, TClientInputSchema, TInnerProps, [...TQueries, ...Queries], TMapperOutput>
export type WrapperFn<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TNewInnerProps extends Props = TInnerProps,
> = (
  options: WrapperFnOptions<TClientInputSchema, TInnerProps, TQueries, TMapperOutput>,
) => TNewInnerProps | Exclude<React.ReactNode, Promise<any>> | undefined

export type QueryFnOptions<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = Omit<
  MountableState<any, TClientInputSchema, TInnerProps, [...TQueries, ...Queries], TMapperOutput>,
  'ErrorComponent' | 'LoadingComponent'
>
export type QueryFn<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TNewQueries extends UseQueryOrInfiniteQueryResult | UseQueryOrInfiniteQueryResult[],
> = (options: QueryFnOptions<TClientInputSchema, TInnerProps, TQueries, TMapperOutput>) => TNewQueries

export type HeadFnOptions<
  TStatus extends 'loading' | 'error' | 'success',
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = Omit<
  MountableState<TStatus, TClientInputSchema, TInnerProps, TQueries, TMapperOutput>,
  'ErrorComponent' | 'LoadingComponent'
>
export type HeadFn<
  TStatus extends 'loading' | 'error' | 'success' = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TInnerProps extends Props = any,
  TQueries extends Queries = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
> = (
  options: HeadFnOptions<TStatus, TClientInputSchema, TInnerProps, TQueries, TMapperOutput>,
) => ResolvableHead | string

// export type MountableWrapperComponentProps<
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TMapperOutput extends MapperOutput | UndefinedMapperOutput,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema,
//   TOuterProps extends Props,
//   TQueries extends Queries,
// > = {
//   props: TOuterProps
//   children: Exclude<React.ReactNode, Promise<any>>
//   LoadingComponent: React.ComponentType
//   ErrorComponent: React.ComponentType<{ error: Error }>
// } & UseMountableResult<
//   any,
//   TQueryResultType,
//   TServerLoaderOutput,
//   TClientLoaderOutput,
//   TMapperOutput,
//   TClientInputSchema,
//   TQueries
// >
// export type MountableWrapperComponentType<
//   TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
//   TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
//   TOuterProps extends Props = any,
//   TQueries extends Queries = any,
// > = React.ComponentType<
//   MountableWrapperComponentProps<
//     TQueryResultType,
//     TServerLoaderOutput,
//     TClientLoaderOutput,
//     TMapperOutput,
//     TClientInputSchema,
//     TOuterProps,
//     TQueries
//   >
// >

// export type MountableOuterComponentProps<
//   TClientInputSchema extends InputSchema | UndefinedInputSchema,
//   TOuterProps extends Props,
// > = {
//   props: TOuterProps
//   input: InputParsed<TClientInputSchema> | undefined
//   children: Exclude<React.ReactNode, Promise<any>>
//   LoadingComponent: React.ComponentType
//   ErrorComponent: React.ComponentType<{ error: Error }>
// }
// export type MountableOuterComponentType<
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
//   TOuterProps extends Props = any,
// > = React.ComponentType<MountableOuterComponentProps<TClientInputSchema, TOuterProps>>

export type PageExtraInnerProps<TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition> = {
  location: ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
}
export type PageSuccessComponentProps<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = SuccessComponentProps<TClientInputSchema, TInnerProps, TQueries, TMapperOutput> &
  PageExtraInnerProps<TRouteDefinition>
export type PageSuccessComponentType<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = React.ComponentType<
  PageSuccessComponentProps<TClientInputSchema, TInnerProps, TQueries, TMapperOutput, TRouteDefinition>
>
export type UndefinedSuccessPageComponent = undefined

export type LayoutExtraInnerProps = {
  children: Exclude<React.ReactNode, Promise<any>>
  location: AnyLocation
}
export type LayoutSuccessComponentProps<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<TClientInputSchema, TInnerProps, TQueries, TMapperOutput> & LayoutExtraInnerProps
export type LayoutSuccessComponentType<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<LayoutSuccessComponentProps<TClientInputSchema, TInnerProps, TQueries, TMapperOutput>>
export type UndefinedLayoutSuccessComponent = undefined

export type ProviderExtraInnerProps = {
  children: Exclude<React.ReactNode, Promise<any>>
}
// export type ProviderSuccessComponentProps<
//   TClientInputSchema extends InputSchema | UndefinedInputSchema,
//   TInnerProps extends Props,
//   TQueries extends Queries,
//   TMapperOutput extends MapperOutput | UndefinedMapperOutput,
// > = SuccessComponentProps<TClientInputSchema, TInnerProps, TQueries, TMapperOutput> & ProviderExtraInnerProps
// export type ProviderSuccessComponentType<
//   TClientInputSchema extends InputSchema | UndefinedInputSchema,
//   TInnerProps extends Props,
//   TQueries extends Queries,
//   TMapperOutput extends MapperOutput | UndefinedMapperOutput,
// > = React.ComponentType<ProviderSuccessComponentProps<TClientInputSchema, TInnerProps, TQueries, TMapperOutput>>
// export type UndefinedProviderSuccessComponent = undefined

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ComponentExtraInnerProps = {}
export type ComponentSuccessComponentProps<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<TClientInputSchema, TInnerProps, TQueries, TMapperOutput> & ComponentExtraInnerProps
export type ComponentSuccessComponentType<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<ComponentSuccessComponentProps<TClientInputSchema, TInnerProps, TQueries, TMapperOutput>>
export type UndefinedComponentSuccessComponent = undefined

export type MountableSelfChildrenFn<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TExtraInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = (
  options: SuccessComponentProps<TClientInputSchema, TInnerProps, TQueries, TMapperOutput> & TExtraInnerProps,
) => Exclude<React.ReactNode, Promise<any>>

export type MountableSelfProps<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TExtraInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TWithChildren extends boolean | null,
> = (IsInputsSchemasDefined<TServerInputSchema, TClientInputSchema> extends true
  ? IsInputsOptional<TServerInputSchema, TClientInputSchema> extends true
    ? { input?: InputsRaw<TServerInputSchema, TClientInputSchema> } & TOuterProps
    : { input: InputsRaw<TServerInputSchema, TClientInputSchema> } & TOuterProps
  : TOuterProps) &
  (TWithChildren extends true
    ? {
        children:
          | React.ReactNode
          | MountableSelfChildrenFn<TClientInputSchema, TInnerProps, TExtraInnerProps, TQueries, TMapperOutput>
      }
    : TWithChildren extends null
      ? {
          children?:
            | React.ReactNode
            | MountableSelfChildrenFn<TClientInputSchema, TInnerProps, TExtraInnerProps, TQueries, TMapperOutput>
        }
      : Record<never, never>)
export type MountableSelfType<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TExtraInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TWithChildren extends boolean | null,
> = React.ComponentType<
  MountableSelfProps<
    TServerInputSchema,
    TClientInputSchema,
    TOuterProps,
    TInnerProps,
    TExtraInnerProps,
    TQueries,
    TMapperOutput,
    TWithChildren
  >
>

// X: TPointType extends 'layout'
// ? MountableSelfType<TServerInputSchema, TClientInputSchema, TOuterProps, true>
// : TPointType extends 'page'
//   ? MountableSelfType<TServerInputSchema, TClientInputSchema, TOuterProps, false>
//   : TPointType extends 'component'
//     ? MountableSelfType<TServerInputSchema, TClientInputSchema, TOuterProps, false>
//     : TPointType extends 'provider'
//       ? MountableSelfType<TServerInputSchema, TClientInputSchema, TOuterProps, null>
//       : null
export type LayoutSelfProps<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  TServerInputSchema,
  TClientInputSchema,
  TOuterProps,
  TInnerProps,
  LayoutExtraInnerProps,
  TQueries,
  TMapperOutput,
  true
>
export type LayoutSelfType<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  LayoutSelfProps<TServerInputSchema, TClientInputSchema, TOuterProps, TInnerProps, TQueries, TMapperOutput>
>

export type PageSelfProps<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = MountableSelfProps<
  TServerInputSchema,
  TClientInputSchema,
  TOuterProps,
  TInnerProps,
  PageExtraInnerProps<TRouteDefinition>,
  TQueries,
  TMapperOutput,
  false
>
export type PageSelfType<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = React.ComponentType<
  PageSelfProps<
    TServerInputSchema,
    TClientInputSchema,
    TOuterProps,
    TInnerProps,
    TQueries,
    TMapperOutput,
    TRouteDefinition
  >
>

export type ComponentSelfProps<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  TServerInputSchema,
  TClientInputSchema,
  TOuterProps,
  TInnerProps,
  ComponentExtraInnerProps,
  TQueries,
  TMapperOutput,
  false
>
export type ComponentSelfType<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  ComponentSelfProps<TServerInputSchema, TClientInputSchema, TOuterProps, TInnerProps, TQueries, TMapperOutput>
>

export type ProviderSelfProps<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  TServerInputSchema,
  TClientInputSchema,
  TOuterProps,
  TInnerProps,
  ProviderExtraInnerProps,
  TQueries,
  TMapperOutput,
  null
>
export type ProviderSelfType<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  ProviderSelfProps<TServerInputSchema, TClientInputSchema, TOuterProps, TInnerProps, TQueries, TMapperOutput>
>

export type MountAction<
  TType extends 'query' | 'input' | 'wrapper' | 'mapper' | 'head' | 'selfProps' | 'selfQuery' =
    | 'query'
    | 'input'
    | 'wrapper'
    | 'mapper'
    | 'head'
    | 'selfProps'
    | 'selfQuery',
> = TType extends 'query'
  ? {
      type: 'query'
      fn: QueryFn<any, any, any, any, any>
      unstableId: number
    }
  : TType extends 'selfQuery'
    ? { type: 'selfQuery'; unstableId: number }
    : TType extends 'wrapper'
      ? { type: 'wrapper'; fn: WrapperFn<any, any, any, any>; unstableId: number }
      : TType extends 'mapper'
        ? { type: 'mapper'; fn: MapperFn<any, any, any, any, any>; unstableId: number }
        : TType extends 'selfProps'
          ? { type: 'selfProps'; unstableId: number }
          : TType extends 'mapper'
            ? { type: 'mapper'; fn: MapperFn<any, any, any, any, any>; unstableId: number }
            : TType extends 'head'
              ? { type: 'head'; fn: HeadFn<any, any, any, any, any>; unstableId: number }
              : TType extends 'input'
                ? { type: 'input'; schema: InputSchema; unstableId: number }
                : never

export type IsQueryShouldBeFinalized<
  TPointType extends PointType,
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
> = TPointType extends 'serverStage' | 'clientStage'
  ? TLetsEndPointType extends QueryableEndPointType
    ? true
    : false
  : false

export type WithSelfQueryIfShouldBeFinalized<
  TPointType extends PointType,
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TQueries extends Queries,
> =
  IsQueryShouldBeFinalized<TPointType, TLetsEndPointType> extends true
    ? [...TQueries, UsePointQueryResult<'query', TServerLoaderOutput, TClientLoaderOutput>]
    : TQueries

export type AssertMountableQueryFinalization<
  TPointType extends PointType,
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
> = TLetsEndPointType extends MountablePointType
  ? TPointType extends 'serverStage' | 'clientStage'
    ? FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
      ? ShowError<`Check this point last loader. It should return plain object data, not response. You see this message, becouse current method will finalize your query, so you should fix your loader before it`>
      : unknown
    : unknown
  : unknown

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
//   TClientMapperOutput,
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
//       //     ? this._clientMapperFns.reduce(
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
//     if (!this._clientMapperFns.length) {
//       return query.data
//     }
//     if (!clientInputParseResult.inputParsed) {
//       return undefined
//     }
//     return this._clientMapperFns.reduce(
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
import type { UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query'
import type * as React from 'react'
import type { ResolvableHead } from 'unhead/types'
import type {
  CurrentRouteDefinition,
  Data,
  FinalLoaderMappedOutput,
  FinalLoaderUnmappedOutput,
  FinalProps,
  IfAnyThenElse,
  InputParsed,
  InputSchema,
  InputsRaw,
  IsInputsOptional,
  IsInputsSchemasDefined,
  LoaderOutput,
  MapperOutput,
  Props,
  QueryResultType,
  RouteDefinition,
  UndefinedInputSchema,
  UndefinedLoaderOutput,
  UndefinedMapperOutput,
  UndefinedProps,
  UndefinedQueryResultType,
  UndefinedRouteDefinition,
  UsePointQueryResult,
} from './types.js'
import type { ChildrenLocation, ExactLocation } from '@devp0nt/route0'

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

// type MountableMapper<TQueryOption, TQueriesOptions extends readonly unknown[], TMapperOutput> = (options: {
//   data: FirstQueryData<TQueryOption, TQueriesOptions>
//   queries: QueryResults<TQueryOption, TQueriesOptions>
// }) => TMapperOutput

export type UseQueryOrInfiniteQueryResult = UseInfiniteQueryResult | UseQueryResult
export type ExtraQueries = UseQueryOrInfiniteQueryResult[]
export type UndefinedExtraQueries = undefined

export type WithExtraQueries<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> =
  FinalLoaderUnmappedOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
    ? TExtraQueries extends ExtraQueries
      ? [UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, any>, ...TExtraQueries]
      : [UsePointQueryResult<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, any>]
    : TExtraQueries extends ExtraQueries
      ? TExtraQueries
      : []

export type AppendExtraQueries<
  TQueries extends ExtraQueries | UndefinedExtraQueries,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = TQueries extends [infer Q1, ...infer Rest]
  ? [
      Q1 extends UseQueryOrInfiniteQueryResult ? Q1 : never,
      ...AppendExtraQueries<Extract<Rest, ExtraQueries>, TExtraQueries>,
    ]
  : TExtraQueries extends ExtraQueries
    ? TExtraQueries
    : TQueries extends undefined
      ? TExtraQueries extends undefined
        ? undefined
        : []
      : []

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
export type QueriesSuccess<TQueries extends UseQueryOrInfiniteQueryResult[]> = TQueries extends [
  infer Q1,
  ...infer Rest,
]
  ? [
      QuerySuccess<Q1 extends UseQueryOrInfiniteQueryResult ? Q1 : never>,
      ...QueriesSuccess<Extract<Rest, UseQueryOrInfiniteQueryResult[]>>,
    ]
  : []

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

export type UseMountableResultSuccess<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = {
  input: InputParsed<TClientInputSchema>
  queries: QueriesSuccess<WithExtraQueries<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TExtraQueries>>
  data: FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
  loading: false
  error: null
  status: 'success'
}
export type UseMountableResultPending<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = {
  input: InputParsed<TClientInputSchema>
  queries: WithExtraQueries<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TExtraQueries>
  data: undefined
  loading: true
  error: undefined
  status: 'pending'
}
export type UseMountableResultError<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = {
  input: InputParsed<TClientInputSchema> | undefined
  queries: undefined | WithExtraQueries<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TExtraQueries>
  data:
    | undefined
    | FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
  loading: false
  error: Error0
  status: 'error'
}
export type UseMountableResult<
  TStatus extends 'pending' | 'error' | 'success',
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = IfAnyThenElse<
  TStatus,
  | UseMountableResultSuccess<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TExtraQueries
    >
  | UseMountableResultPending<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TExtraQueries
    >
  | UseMountableResultError<
      TQueryResultType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TClientMapperOutput,
      TClientInputSchema,
      TExtraQueries
    >,
  TStatus extends 'success'
    ? UseMountableResultSuccess<
        TQueryResultType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TClientMapperOutput,
        TClientInputSchema,
        TExtraQueries
      >
    : TStatus extends 'pending'
      ? UseMountableResultPending<
          TQueryResultType,
          TServerLoaderOutput,
          TClientLoaderOutput,
          TClientMapperOutput,
          TClientInputSchema,
          TExtraQueries
        >
      : TStatus extends 'error'
        ? UseMountableResultError<
            TQueryResultType,
            TServerLoaderOutput,
            TClientLoaderOutput,
            TClientMapperOutput,
            TClientInputSchema,
            TExtraQueries
          >
        : never
>

export type DestinationComponentType = 'page' | 'component' | 'layout'
export type ErrorComponentProps<
  TType extends DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = {
  type: TType
  props: TProps
} & UseMountableResultError<
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
  TExtraQueries
>
export type ErrorComponentType<
  TType extends DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = React.ComponentType<
  ErrorComponentProps<
    TType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TProps,
    TExtraQueries
  >
>

export type LoadingComponentProps<
  TType extends DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = {
  type: TType
  props: TProps
} & UseMountableResultPending<
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
  TExtraQueries
>
export type LoadingComponentType<
  TType extends DestinationComponentType,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = React.ComponentType<
  LoadingComponentProps<
    TType,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TProps,
    TExtraQueries
  >
>

export type SuccessComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries = any,
> = {
  props: TProps
  input: InputParsed<TClientInputSchema>
  queries: QueriesSuccess<WithExtraQueries<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TExtraQueries>>
  data: FinalLoaderMappedOutput<TQueryResultType, TServerLoaderOutput, TClientLoaderOutput, TClientMapperOutput>
}
export type SuccessComponentType<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = React.ComponentType<
  SuccessComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TProps,
    TExtraQueries
  >
>

export type HeadFnOptions<
  TStatus extends 'pending' | 'error' | 'success',
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = {
  props: TProps
} & UseMountableResult<
  TStatus,
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
  TExtraQueries
>
export type HeadFn<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TProps extends Props | undefined = any,
  TExtraQueries extends ExtraQueries = any,
> = (
  options: HeadFnOptions<
    TStatus,
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TProps,
    TExtraQueries
  >,
) => ResolvableHead | string

export type MountableWrapperComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = {
  props: TProps
  children: Exclude<React.ReactNode, Promise<any>>
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
} & UseMountableResult<
  any,
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
  TExtraQueries
>
export type MountableWrapperComponentType<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType = any,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput = any,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TProps extends Props | undefined = any,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries = any,
> = React.ComponentType<
  MountableWrapperComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TClientInputSchema,
    TProps,
    TExtraQueries
  >
>

export type MountableOuterComponentProps<
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined,
> = {
  props: TProps
  input: InputParsed<TClientInputSchema> | undefined
  children: Exclude<React.ReactNode, Promise<any>>
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
}
export type MountableOuterComponentType<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TProps extends Props | undefined = any,
> = React.ComponentType<MountableOuterComponentProps<TClientInputSchema, TProps>>

export type PageSuccessComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries = any,
> = SuccessComponentProps<
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
  TProps,
  TExtraQueries
> & { location: ExactLocation<CurrentRouteDefinition<TRouteDefinition>> }
export type PageSuccessComponentType<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = React.ComponentType<
  PageSuccessComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TClientInputSchema,
    TProps,
    TExtraQueries
  >
>
export type UndefinedSuccessPageComponent = undefined

export type LayoutSuccessComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = SuccessComponentProps<
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
  TProps,
  TExtraQueries
> & {
  location:
    | ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
    | ChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
}
export type LayoutSuccessComponentType<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = React.ComponentType<
  LayoutSuccessComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TRouteDefinition,
    TClientInputSchema,
    TProps,
    TExtraQueries
  >
>
export type UndefinedLayoutSuccessComponent = undefined

export type ComponentSuccessComponentProps<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = SuccessComponentProps<
  TQueryResultType,
  TServerLoaderOutput,
  TClientLoaderOutput,
  TClientMapperOutput,
  TClientInputSchema,
  TProps,
  TExtraQueries
>
export type ComponentSuccessComponentType<
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TExtraQueries extends ExtraQueries | UndefinedExtraQueries,
> = React.ComponentType<
  ComponentSuccessComponentProps<
    TQueryResultType,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TClientMapperOutput,
    TInputSchema,
    TProps,
    TExtraQueries
  >
>
export type UndefinedComponentSuccessComponent = undefined

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
export type MountableComponentType<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TProps extends Props | UndefinedProps,
  TWithChildren extends boolean | null,
> = React.ComponentType<MountableComponentProps<TServerInputSchema, TClientInputSchema, TProps, TWithChildren>>

// export type WrapperComponentType<
//   TClientInput extends InputParsed = Record<never, never>,
//   TProps extends Props | undefined = undefined,
//   TQuery extends UseInfiniteQueryResult | UseQueryResult | undefined = undefined,
//   TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
//   TMapperOutput = QueryDataOrUndefined<TQuery>,
// > = (options: WrapperFnOptions<TClientInput, TProps, TQuery, TQueries, TMapperOutput>) => React.ReactNode

// export type UseQueryIntentInnerFnOptions<
//   TParentClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TParentQueries extends UseQueryOrInfiniteQueryResult[] = UseQueryOrInfiniteQueryResult[],
// > = {
//   queries: TParentQueries
//   input: InputParsed<TParentClientInputSchema>
// }
// export type UseQueryIntent<
//   TParentClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TParentQueries extends UseQueryOrInfiniteQueryResult[] = UseQueryOrInfiniteQueryResult[],
//   TSelfServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TSelfClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
//   TMethod extends 'infiniteQuery' | 'query' = 'infiniteQuery' | 'query',
//   TUseQueryOptions extends ExtraUseQueryOptions | ExtraUseInfiniteQueryOptions<any> =
//     | ExtraUseQueryOptions
//     | ExtraUseInfiniteQueryOptions<any>,
// > = {
//   method: TMethod
//   input: (
//     options: UseQueryIntentInnerFnOptions<TSelfClientInputSchema, TParentQueries>,
//   ) => InputsRaw<TSelfServerInputSchema, TSelfClientInputSchema>
//   queryOptions: (options: UseQueryIntentInnerFnOptions<TParentClientInputSchema, TParentQueries>) => TUseQueryOptions
//   fetchOptions: (options: UseQueryIntentInnerFnOptions<TParentClientInputSchema, TParentQueries>) => FetchOptions
// }

// export type MountableProps<
//   TServerInputSchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
//   TClientInputSchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
//   TProps extends Props | undefined = undefined,
//   TQuery extends UseInfiniteQueryResult | UseQueryResult | undefined = undefined,
//   TQueriesIntents extends UseQueryIntent[] | undefined = undefined,
//   TMapperOutput = QueryDataOrUndefined<TQuery>,
// > = TProps & {
//   input?: InputsRaw<TServerInputSchema, TClientInputSchema>
//   query?: TQuery
//   queries?: TQueriesIntents
//   mapper?: MapperFn<TClientInputSchema, TQuery, TQueriesIntents, TMapperOutput>
//   head?: HeadFn[]
//   wrappers?: Array<
//     MountableWrapperComponentType<any, TClientInputSchema, TProps, TQuery, TQueriesIntents, TMapperOutput>
//   >
//   outers?: Array<MountableOuterComponentType<TClientInputSchema, TProps>>
//   ErrorComponent?: ErrorComponentType<TClientInputSchema, TProps, TQuery, TQueriesIntents, TMapperOutput>
//   LoadingComponent?: LoadingComponentType<TClientInputSchema, TProps, TQuery, TQueriesIntents>
//   children: SuccessComponentType<TClientInputSchema, TProps, TQuery, TQueriesIntents, TMapperOutput>
// }

// export type _UseMountableProps =

// export type _MountableProps = {
//   point: AnyPoint
//   props: Props
//   input: InputRaw
//   wrappers: MountableWrapperComponentType[]
//   outers: MountableOuterComponentType[]
//   loadingComponent: LoadingComponentType
//   errorComponent: ErrorComponentType
// }

// export const _Mountable = ({ point, props, input, wrappers, outers, loadingComponent, errorComponent }: _MountableProps): React.ReactNode => {

//   const LoadingComponent = React.useMemo(
//     () => () => {
//       const result = {
//         data: undefined,
//         error: null,
//         input: clientInputParseResult.inputParsed,
//         location,
//         loading: true,
//         query: null,
//       } satisfies AnyUseLoaderResult<
//         'pending',
//         TQueryResultType,
//         TServerLoaderOutput,
//         TClientLoaderOutput,
//         TClientMapperOutput,
//         TClientInputSchema,
//         AnyLocation
//       >
//       this._useHead(result)
//       return this._withWrappers({
//         children: React.createElement(loadingComponent, {
//           ...result,
//           props: restProps,
//           type: 'page',
//         }),
//         useLoaderResult: result,
//         props: restProps,
//       })
//     },
//     [loadingComponent, clientInputParseResult],
//   )

//   const ErrorComponent = React.useMemo(
//     () =>
//       ({ error }: { error: Error }) => {
//         const result = {
//           data: undefined,
//           error: Error0.from(error),
//           input: clientInputParseResult.inputParsed,
//           location,
//           loading: false,
//           query: null,
//         } satisfies AnyUseLoaderResult<
//           'error',
//           TQueryResultType,
//           TServerLoaderOutput,
//           TClientLoaderOutput,
//           TClientMapperOutput,
//           TClientInputSchema,
//           AnyLocation
//         >
//         this._useHead(result)
//         return this._withWrappers({
//           children: React.createElement(errorComponent, {
//             ...result,
//             props: restProps,
//             type: 'page',
//           }),
//           props: restProps,
//           useLoaderResult: result,
//         })
//       },
//     [errorComponent, clientInputParseResult],
//   )

//   const withWrappers = (
//     innerChildren: React.ReactNode,
//     useMountableResult: UseMountableResult<any, any, any, any, any>,
//   ): Exclude<React.ReactNode, Promise<any>> => {
//     if (wrappers.length === 0) {
//       return innerChildren as Exclude<React.ReactNode, Promise<any>>
//     }
//     return [...wrappers].reverse().reduce((acc, Wrapper) => {
//       return React.createElement(Wrapper, {
//         children: acc,
//         ...useMountableResult,
//         props,
//       } as never)
//     }, innerChildren) as Exclude<React.ReactNode, Promise<any>>
//   }

//   const withOuters = (innerChildren: React.ReactNode): Exclude<React.ReactNode, Promise<any>> => {
//     if (outers.length === 0) {
//       return innerChildren as Exclude<React.ReactNode, Promise<any>>
//     }
//     return [...outers].reverse().reduce(
//       (acc, Outer) => {
//         return React.createElement(Outer as React.ComponentType<any>, {
//           children: acc,
//           input: null as any,
//           props,
//           location: null as any,
//           LoadingComponent: LoadingComponent as React.ComponentType<any>,
//           ErrorComponent: ErrorComponent as React.ComponentType<any>,
//         })
//       },
//       innerChildren as Exclude<React.ReactNode, Promise<any>>,
//     )
//   }

//   const MountableInner = (): React.ReactNode => {
//     const queriesMerged = React.useMemo(() => {
//       const merged: UseQueryOrInfiniteQueryResult[] = []
//       if (query !== undefined) {
//         merged.push(query)
//       }
//       if (queries.length > 0) {
//         merged.push(...queries)
//       }
//       return merged
//     }, [query, queries])

//     const queryData = query?.data
//     const errorSource = queriesMerged.find((item) => item.error)?.error
//     const error = errorSource ? Error0.from(errorSource) : null
//     const loading = queriesMerged.some((item) => item.isLoading) && !error
//     const ready = !error && !loading

//     const dataMapped = ready
//       ? mapper({
//           data: queryData as never,
//           input,
//           queries: queriesMerged as never,
//         })
//       : undefined

//     const runHead = (useMountableResult: UseMountableResult<any, TQuery, TQueries, TMapperOutput>) => {
//       if (!head) {
//         return
//       }
//       const headResult = head(useLoaderResult as never)
//       const resolvedHead = typeof headResult === 'string' ? { title: headResult } : headResult
//       useHead(resolvedHead as never)
//     }

//     if (error) {
//       const result = {
//         data: undefined,
//         error,
//         input: null,
//         location: null,
//         loading: false,
//         query: (firstQuery ?? null) as never,
//       } as any
//       runHead(result)
//       return withWrappers(
//         React.createElement(ErrorComponent, {
//           ...result,
//           props: restProps,
//           type: 'component',
//         }),
//         result,
//       )
//     }

//     if (loading) {
//       const result = {
//         data: undefined,
//         error: null,
//         input: null,
//         location: null,
//         loading: true,
//         query: (firstQuery ?? null) as never,
//       } as any
//       runHead(result)
//       return withWrappers(
//         React.createElement(LoadingComponent, {
//           ...result,
//           props: restProps,
//           type: 'component',
//         }),
//         result,
//       )
//     }

//     const result = {
//       data,
//       error: null,
//       input: null,
//       location: null,
//       loading: false,
//       query: (firstQuery ?? null) as never,
//     } as any
//     runHead(result)

//     return withWrappers(
//       children({
//         ...(restProps as TProps),
//         queries: typedQueriesResult,
//         data,
//       }),
//       result,
//     )
//   }

//   return withOuters(React.createElement(MountableInner))
// }

// export const DefaultErrorComponent = ({ error }: { error: Error0 }) => {
//   const { stack, ...json } = error.toJSON()
//   // TODO: move console.error to .onClientError
//   console.error(error)
//   return React.createElement(
//     React.Fragment,
//     null,
//     React.createElement('pre', null, JSON.stringify(json, null, 2)),
//     React.createElement('pre', null, stack),
//   )
// }

// export const DefaultLoadingComponent = () => {
//   React.createElement(React.Fragment, null, 'Loading...')
// }

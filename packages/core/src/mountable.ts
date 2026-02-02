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
  input: InputParsed<TClientInputSchema> | undefined
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
  children: Exclude<React.ReactNode, Promise<any>>
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

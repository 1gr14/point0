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

import { Error0 } from '@devp0nt/error0'
import type { UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query'
import { useHead } from '@unhead/react'
import * as React from 'react'
import type {
  AnyPoint,
  IfAnyThenElse,
  InputParsed,
  InputRaw,
  InputSchema,
  InputsRaw,
  Props,
  UndefinedInputSchema,
} from './types.js'
import type { ResolvableHead } from 'unhead/types'

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

export type QueryWithQueries<
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
> = TQuery extends UseQueryOrInfiniteQueryResult
  ? TQueries extends UseQueryOrInfiniteQueryResult[]
    ? [TQuery, ...TQueries]
    : [TQuery]
  : TQuery extends UseQueryOrInfiniteQueryResult[]
    ? TQueries
    : []

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

export type QueryDataOrUndefined<TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined> =
  TQuery extends UseQueryOrInfiniteQueryResult ? TQuery['data'] : undefined

export type MapperFnOptions<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
> = {
  input: InputParsed<TClientInputSchema>
  data: QueryDataOrUndefined<TQuery>
  queries: QueryWithQueries<TQuery, TQueries>
}
export type MapperFn<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = (options: MapperFnOptions<TClientInputSchema, TQuery, TQueries>) => TMapperOutput

export type UseMountableResultSuccess<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TQuery extends UseInfiniteQueryResult | UseQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = {
  input: InputParsed<TClientInputSchema>
  queries: QueriesSuccess<QueryWithQueries<TQuery, TQueries>>
  data: TMapperOutput
  loading: false
  error: null
  status: 'success'
}
export type UseMountableResultPending<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TQuery extends UseInfiniteQueryResult | UseQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
> = {
  input: InputParsed<TClientInputSchema>
  queries: QueryWithQueries<TQuery, TQueries>
  data: undefined
  loading: true
  error: undefined
  status: 'pending'
}
export type UseMountableResultError<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TQuery extends UseInfiniteQueryResult | UseQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = {
  input: InputParsed<TClientInputSchema> | undefined
  queries: QueryWithQueries<TQuery, TQueries>
  data: undefined | TMapperOutput
  loading: false
  error: Error0
  status: 'error'
}
export type UseMountableResult<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TQuery extends UseInfiniteQueryResult | UseQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = IfAnyThenElse<
  TStatus,
  | UseMountableResultSuccess<TClientInputSchema, TQuery, TQueries, TMapperOutput>
  | UseMountableResultPending<TClientInputSchema, TQuery, TQueries>
  | UseMountableResultError<TClientInputSchema, TQuery, TQueries, TMapperOutput>,
  TStatus extends 'success'
    ? UseMountableResultSuccess<TClientInputSchema, TQuery, TQueries, TMapperOutput>
    : TStatus extends 'pending'
      ? UseMountableResultPending<TClientInputSchema, TQuery, TQueries>
      : TStatus extends 'error'
        ? UseMountableResultError<TClientInputSchema, TQuery, TQueries, TMapperOutput>
        : never
>

// export type MountablePropsChildren<
//   TClientInput extends InputParsed = Record<never, never>,
//   TProps extends Props | undefined = undefined,
//   TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
//   TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
//   TMapperOutput = QueryDataOrUndefined<TQuery>,
// > = (props: {
//   props: TProps
//   input: TClientInput
//   queries: QueriesSuccess<QueryWithQueries<TQuery, TQueries>>
//   data: TMapperOutput
// }) => React.ReactNode

export type DestinationComponentType = 'page' | 'component' | 'layout'
export type ErrorComponentProps<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = {
  props: TProps
} & UseMountableResultError<TClientInputSchema, TQuery, TQueries, TMapperOutput>
export type ErrorComponentType<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = React.ComponentType<ErrorComponentProps<TClientInputSchema, TProps, TQuery, TQueries, TMapperOutput>>

export type LoadingComponentProps<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
> = {
  props: TProps
} & UseMountableResultPending<TClientInputSchema, TQuery, TQueries>
export type LoadingComponentType<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
> = React.ComponentType<LoadingComponentProps<TClientInputSchema, TProps, TQuery, TQueries>>

export type SuccessComponentProps<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = {
  props: TProps
  input: InputParsed<TClientInputSchema>
  queries: QueriesSuccess<QueryWithQueries<TQuery, TQueries>>
  data: TMapperOutput
}
export type SuccessComponentType<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = React.ComponentType<SuccessComponentProps<TClientInputSchema, TProps, TQuery, TQueries, TMapperOutput>>

export type HeadFnOptions<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = {
  props: TProps
} & UseMountableResult<TStatus, TClientInputSchema, TQuery, TQueries, TMapperOutput>
export type HeadFn<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = (
  options: HeadFnOptions<TStatus, TClientInputSchema, TProps, TQuery, TQueries, TMapperOutput>,
) => ResolvableHead | string

export type MountableWrapperComponentProps<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = {
  props: TProps
  children: Exclude<React.ReactNode, Promise<any>>
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
} & UseMountableResult<TStatus, TClientInputSchema, TQuery, TQueries, TMapperOutput>
export type MountableWrapperComponentType<
  TStatus extends 'pending' | 'error' | 'success' = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
  TQuery extends UseQueryOrInfiniteQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = React.ComponentType<
  MountableWrapperComponentProps<TStatus, TClientInputSchema, TProps, TQuery, TQueries, TMapperOutput>
>

export type MountableOuterComponentProps<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
> = {
  props: TProps
  input: InputParsed<TClientInputSchema> | undefined
  children: Exclude<React.ReactNode, Promise<any>>
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
}
export type MountableOuterComponentType<
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
> = React.ComponentType<MountableOuterComponentProps<TClientInputSchema, TProps>>

// export type WrapperComponentType<
//   TClientInput extends InputParsed = Record<never, never>,
//   TProps extends Props | undefined = undefined,
//   TQuery extends UseInfiniteQueryResult | UseQueryResult | undefined = undefined,
//   TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
//   TMapperOutput = QueryDataOrUndefined<TQuery>,
// > = (options: WrapperFnOptions<TClientInput, TProps, TQuery, TQueries, TMapperOutput>) => React.ReactNode

export type UseQueryIntent<TPoint extends { point: AnyPoint } = { point: AnyPoint }> = {
  point: TPoint
  input: () => TPoint['point']['Infer']['InputRaw']
  options: () => TPoint['point']['Infer']['UseQueryOptions']
}

export type MountableProps<
  TServerInputSchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = UndefinedInputSchema,
  TProps extends Props | undefined = undefined,
  TQuery extends UseInfiniteQueryResult | UseQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
> = TProps & {
  input?: InputsRaw<TServerInputSchema, TClientInputSchema>
  query?: TQuery
  queries?: TQueries
  mapper?: MapperFn<TClientInputSchema, TQuery, TQueries, TMapperOutput>
  head?: HeadFn[]
  wrappers?: Array<MountableWrapperComponentType<any, TClientInputSchema, TProps, TQuery, TQueries, TMapperOutput>>
  outers?: Array<MountableOuterComponentType<TClientInputSchema, TProps>>
  ErrorComponent?: ErrorComponentType<TClientInputSchema, TProps, TQuery, TQueries, TMapperOutput>
  LoadingComponent?: LoadingComponentType<TClientInputSchema, TProps, TQuery, TQueries>
  children: SuccessComponentType<TClientInputSchema, TProps, TQuery, TQueries, TMapperOutput>
}

export const Mountable = <
  TProps extends Record<string, any>,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TQuery extends UseInfiniteQueryResult | UseQueryResult | undefined = undefined,
  TQueries extends UseQueryOrInfiniteQueryResult[] | undefined = undefined,
  TMapperOutput = QueryDataOrUndefined<TQuery>,
>(
  props: MountableProps<TServerInputSchema, TClientInputSchema, TProps, TQuery, TQueries, TMapperOutput>,
): React.ReactNode => {
  const {
    input = {} as InputsRaw<TServerInputSchema, TClientInputSchema>,
    query,
    queries = [],
    mapper = (options) => options.data,
    head = [],
    wrappers = [],
    outers = [],
    ErrorComponent = DefaultErrorComponent,
    LoadingComponent = DefaultLoadingComponent,
    children,
    ...restProps
  } = props

  const withWrappers = (
    innerChildren: React.ReactNode,
    useLoaderResult: Record<string, unknown>,
  ): Exclude<React.ReactNode, Promise<any>> => {
    if (wrappers.length === 0) {
      return innerChildren as Exclude<React.ReactNode, Promise<any>>
    }
    return [...wrappers].reverse().reduce((acc, Wrapper) => {
      return React.createElement(Wrapper, {
        children: acc,
        ...useLoaderResult,
        props: restProps,
      } as never)
    }, innerChildren) as Exclude<React.ReactNode, Promise<any>>
  }

  const withOuters = (innerChildren: React.ReactNode): Exclude<React.ReactNode, Promise<any>> => {
    if (outers.length === 0) {
      return innerChildren as Exclude<React.ReactNode, Promise<any>>
    }
    return [...outers].reverse().reduce(
      (acc, Outer) => {
        return React.createElement(Outer as React.ComponentType<any>, {
          children: acc,
          input: null as any,
          props: restProps,
          location: null as any,
          LoadingComponent: LoadingComponent as React.ComponentType<any>,
          ErrorComponent: ErrorComponent as React.ComponentType<any>,
        })
      },
      innerChildren as Exclude<React.ReactNode, Promise<any>>,
    )
  }

  const MountableInner = (): React.ReactNode => {
    const queriesMerged = React.useMemo(() => {
      const merged: UseQueryOrInfiniteQueryResult[] = []
      if (query !== undefined) {
        merged.push(query)
      }
      if (queries.length > 0) {
        merged.push(...queries)
      }
      return merged
    }, [query, queries])

    const queryData = query?.data
    const errorSource = queriesMerged.find((item) => item.error)?.error
    const error = errorSource ? Error0.from(errorSource) : null
    const loading = queriesMerged.some((item) => item.isLoading) && !error
    const ready = !error && !loading

    const dataMapped = ready
      ? mapper({
          data: queryData as never,
          input,
          queries: queriesMerged as never,
        })
      : undefined

    const runHead = (useMountableResult: UseMountableResult<any, TQuery, TQueries, TMapperOutput>) => {
      if (!head) {
        return
      }
      const headResult = head(useLoaderResult as never)
      const resolvedHead = typeof headResult === 'string' ? { title: headResult } : headResult
      useHead(resolvedHead as never)
    }

    if (error) {
      const result = {
        data: undefined,
        error,
        input: null,
        location: null,
        loading: false,
        query: (firstQuery ?? null) as never,
      } as any
      runHead(result)
      return withWrappers(
        React.createElement(ErrorComponent, {
          ...result,
          props: restProps,
          type: 'component',
        }),
        result,
      )
    }

    if (loading) {
      const result = {
        data: undefined,
        error: null,
        input: null,
        location: null,
        loading: true,
        query: (firstQuery ?? null) as never,
      } as any
      runHead(result)
      return withWrappers(
        React.createElement(LoadingComponent, {
          ...result,
          props: restProps,
          type: 'component',
        }),
        result,
      )
    }

    const result = {
      data,
      error: null,
      input: null,
      location: null,
      loading: false,
      query: (firstQuery ?? null) as never,
    } as any
    runHead(result)

    return withWrappers(
      children({
        ...(restProps as TProps),
        queries: typedQueriesResult,
        data,
      }),
      result,
    )
  }

  return withOuters(React.createElement(MountableInner))
}

export const DefaultErrorComponent = ({ error }: { error: Error0 }) => {
  const { stack, ...json } = error.toJSON()
  // TODO: move console.error to .onClientError
  console.error(error)
  return React.createElement(
    React.Fragment,
    null,
    React.createElement('pre', null, JSON.stringify(json, null, 2)),
    React.createElement('pre', null, stack),
  )
}

export const DefaultLoadingComponent = () => {
  React.createElement(React.Fragment, null, 'Loading...')
}

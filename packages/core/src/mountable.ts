import type { Error0 } from '@devp0nt/error0'
import type { AnyLocation, ExactLocation, WeakAncestorLocation } from '@devp0nt/route0'
import type {
  InfiniteQueryObserverSuccessResult,
  QueryObserverSuccessResult,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query'
import type * as React from 'react'
import type { ResolvableHead } from 'unhead/types'
import type { RouterPageState } from './router.js'
import type {
  AnyPoint,
  CurrentRouteDefinition,
  Data,
  EmptyData,
  ExtraUseInfiniteQueryOptions,
  ExtraUseQueryOptions,
  FinalLoaderDataOrNever,
  IfAnyThenElse,
  InputSchema,
  InputsRaw,
  IsEmptyObject,
  IsInputsOptional,
  IsInputsSchemasDefined,
  IsNever,
  LoaderOutput,
  MapperOutput,
  PointType,
  QueryableReadyPointType,
  QueryResultType,
  ReadyPointType,
  RouteDefinition,
  UndefinedInputSchema,
  UndefinedLoaderOutput,
  UndefinedMapperOutput,
  UndefinedReadyPointType,
  UndefinedRouteDefinition,
} from './types.js'

// biome-ignore lint/suspicious/noExplicitAny: Props accept arbitrary key-value pairs
export type Props = Record<string, any>
export type UndefinedProps = undefined
export type EmptyProps = Record<never, never>

export type AppendProps<TPrevProps extends Props, TAppendProps extends Props> = TPrevProps extends Props
  ? IsNever<keyof TPrevProps> extends true
    ? TAppendProps
    : Omit<TPrevProps, keyof TAppendProps> & TAppendProps
  : TAppendProps

export type WithOuterPropsIfExists<TOuterProps extends Props> =
  IsEmptyObject<TOuterProps> extends true
    ? // biome-ignore lint/complexity/noBannedTypes: ok, becouse used as output type, not input type
      {}
    : { props: TOuterProps }
export type WithLocationIfExists<TLocation extends AnyLocation | undefined> = TLocation extends undefined
  ? // biome-ignore lint/complexity/noBannedTypes: ok, becouse used as output type, not input type
    {}
  : { location: TLocation }

type RequiredKeys<T> = {
  // biome-ignore lint/complexity/noBannedTypes: ok
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

export type IsOuterPropsOptional<TOuterProps extends Props> =
  IsNever<keyof TOuterProps> extends true ? true : RequiredKeys<TOuterProps> extends never ? true : false

export type UseQueryOrInfiniteQueryResult = UseInfiniteQueryResult | UseQueryResult
export type QueriesResults = readonly UseQueryOrInfiniteQueryResult[]
export type QueryDefinition<TQueryResultType extends QueryResultType, TQueriedData extends Data> = {
  type: TQueryResultType
  data: TQueriedData // it is infinite data in infinite data case
}
// biome-ignore lint/suspicious/noExplicitAny: Generic query/result types for definitions
export type QueriesDefinitions = Array<QueryDefinition<any, any>>
// biome-ignore lint/suspicious/noExplicitAny: Generic extraction from QueryDefinition
export type QueryByDefinition<TQueryDefinition extends QueryDefinition<any, any>> = TQueryDefinition extends {
  type: infer TQueryResultType
  data: infer TQueriedData
}
  ? TQueryResultType extends 'query'
    ? UseQueryResult<TQueriedData, Error0>
    : TQueryResultType extends 'infiniteQuery'
      ? UseInfiniteQueryResult<TQueriedData, Error0>
      : never
  : never
// biome-ignore lint/suspicious/noExplicitAny: Generic extraction from QueryDefinition
export type SuccessQueryByDefinition<TQueryDefinition extends QueryDefinition<any, any>> = TQueryDefinition extends {
  type: infer TQueryResultType
  data: infer TQueriedData
}
  ? TQueryResultType extends 'query'
    ? QueryObserverSuccessResult<TQueriedData, Error0>
    : TQueryResultType extends 'infiniteQuery'
      ? InfiniteQueryObserverSuccessResult<TQueriedData, Error0>
      : never
  : never
export type QueryDefinitionByQuery<TQueryResult extends UseQueryOrInfiniteQueryResult> =
  // biome-ignore lint/suspicious/noExplicitAny: infer TData from UseInfiniteQueryResult
  TQueryResult extends UseInfiniteQueryResult<any, any>
    ? QueryDefinition<'infiniteQuery', QueryDataByResult<TQueryResult>>
    : // biome-ignore lint/suspicious/noExplicitAny: infer TData from UseQueryResult
      TQueryResult extends UseQueryResult<any, any>
      ? QueryDefinition<'query', QueryDataByResult<TQueryResult>>
      : never
type Q2D<T> = T extends UseQueryOrInfiniteQueryResult ? QueryDefinitionByQuery<T> : never
export type QueriesDefinitionsByQueries<TQueries extends QueriesResults> = IfAnyThenElse<
  TQueries,
  // biome-ignore lint/suspicious/noExplicitAny: IfAnyThenElse fallback when TQueries is any
  any,
  TQueries extends readonly [infer Q1, infer Q2, infer Q3, infer Q4, infer Q5]
    ? [Q2D<Q1>, Q2D<Q2>, Q2D<Q3>, Q2D<Q4>, Q2D<Q5>]
    : TQueries extends readonly [infer Q1, infer Q2, infer Q3, infer Q4]
      ? [Q2D<Q1>, Q2D<Q2>, Q2D<Q3>, Q2D<Q4>]
      : TQueries extends readonly [infer Q1, infer Q2, infer Q3]
        ? [Q2D<Q1>, Q2D<Q2>, Q2D<Q3>]
        : TQueries extends readonly [infer Q1, infer Q2]
          ? [Q2D<Q1>, Q2D<Q2>]
          : TQueries extends readonly [infer Q1]
            ? [Q2D<Q1>]
            : []
>
type D2Q<T> =
  // biome-ignore lint/suspicious/noExplicitAny: Maps QueryDefinition to Query
  T extends QueryDefinition<any, any> ? QueryByDefinition<T> : never
export type QueriesByDefinitions<TQueriesDefinitions extends QueriesDefinitions> = IfAnyThenElse<
  TQueriesDefinitions,
  // biome-ignore lint/suspicious/noExplicitAny: IfAnyThenElse fallback
  any,
  TQueriesDefinitions extends readonly [infer Q1, infer Q2, infer Q3, infer Q4, infer Q5]
    ? [D2Q<Q1>, D2Q<Q2>, D2Q<Q3>, D2Q<Q4>, D2Q<Q5>]
    : TQueriesDefinitions extends readonly [infer Q1, infer Q2, infer Q3, infer Q4]
      ? [D2Q<Q1>, D2Q<Q2>, D2Q<Q3>, D2Q<Q4>]
      : TQueriesDefinitions extends readonly [infer Q1, infer Q2, infer Q3]
        ? [D2Q<Q1>, D2Q<Q2>, D2Q<Q3>]
        : TQueriesDefinitions extends readonly [infer Q1, infer Q2]
          ? [D2Q<Q1>, D2Q<Q2>]
          : TQueriesDefinitions extends readonly [infer Q1]
            ? [D2Q<Q1>]
            : []
>
type D2SQ<T> =
  // biome-ignore lint/suspicious/noExplicitAny: Maps to SuccessQueryByDefinition
  T extends QueryDefinition<any, any> ? SuccessQueryByDefinition<T> : never
export type SuccessQueriesDefinitions<TQueriesDefinitions extends QueriesDefinitions> = IfAnyThenElse<
  TQueriesDefinitions,
  // biome-ignore lint/suspicious/noExplicitAny: IfAnyThenElse fallback
  any,
  TQueriesDefinitions extends readonly [infer Q1, infer Q2, infer Q3, infer Q4, infer Q5]
    ? [D2SQ<Q1>, D2SQ<Q2>, D2SQ<Q3>, D2SQ<Q4>, D2SQ<Q5>]
    : TQueriesDefinitions extends readonly [infer Q1, infer Q2, infer Q3, infer Q4]
      ? [D2SQ<Q1>, D2SQ<Q2>, D2SQ<Q3>, D2SQ<Q4>]
      : TQueriesDefinitions extends readonly [infer Q1, infer Q2, infer Q3]
        ? [D2SQ<Q1>, D2SQ<Q2>, D2SQ<Q3>]
        : TQueriesDefinitions extends readonly [infer Q1, infer Q2]
          ? [D2SQ<Q1>, D2SQ<Q2>]
          : TQueriesDefinitions extends readonly [infer Q1]
            ? [D2SQ<Q1>]
            : []
>

export type QuerySuccess<TQuery extends UseQueryOrInfiniteQueryResult> = Extract<TQuery, { status: 'success' }>
export type QueryError<TQuery extends UseQueryOrInfiniteQueryResult> = Extract<TQuery, { status: 'error' }>
export type QueryPending<TQuery extends UseQueryOrInfiniteQueryResult> = Extract<TQuery, { status: 'pending' }>
// export type QueryUnknownStatus<TQuery extends UseQueryOrInfiniteQueryResult> =
//   TQuery extends UseQueryResult<infer TData, infer TError>
//     ? UseQueryResult<TData, TError>
//     : TQuery extends UseInfiniteQueryResult<infer TData, infer TError>
//       ? UseInfiniteQueryResult<TData, TError>
//       : never
// export type QueriesSuccess<TQueries extends QueriesResultsTuple> = IfAnyThenElse<
//   TQueries,
//   any,
//   TQueries extends [infer Q1, ...infer Rest]
//     ? [
//         QuerySuccess<Q1 extends UseQueryOrInfiniteQueryResult ? Q1 : never>,
//         ...QueriesSuccess<Extract<Rest, QueriesResultsTuple>>,
//       ]
//     : []
// >
// export type QueriesUnknownStatus<TQueries extends UseQueryOrInfiniteQueryResult[]> = TQueries extends [
//   infer Q1,
//   ...infer Rest,
// ]
//   ? [
//       QueryUnknownStatus<Q1 extends UseQueryOrInfiniteQueryResult ? Q1 : never>,
//       ...QueriesUnknownStatus<Extract<Rest, UseQueryOrInfiniteQueryResult[]>>,
//     ]
//   : []
type CleanQueryData<TData> =
  Exclude<TData, undefined> extends infer TClean
    ? [TClean] extends [never]
      ? never
      : unknown extends TClean
        ? never
        : TClean
    : never
export type QueryDataByResult<TQueryResult extends UseQueryOrInfiniteQueryResult> = IfAnyThenElse<
  TQueryResult,
  // biome-ignore lint/suspicious/noExplicitAny: IfAnyThenElse fallback
  any,
  // biome-ignore lint/suspicious/noExplicitAny: infer TData from UseInfiniteQueryResult
  TQueryResult extends UseInfiniteQueryResult<infer TData, any>
    ? CleanQueryData<TData>
    : // biome-ignore lint/suspicious/noExplicitAny: infer TData from UseQueryResult
      TQueryResult extends UseQueryResult<infer TData, any>
      ? CleanQueryData<TData>
      : Data
>
export type QueryDataByDefinition<
  TQueryDefinition extends // biome-ignore lint/suspicious/noExplicitAny: Generic extraction of data from definition
  QueryDefinition<any, any>,
> = TQueryDefinition extends {
  data: infer TData
}
  ? TData extends Data
    ? TData
    : never
  : never

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
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = IfAnyThenElse<
  TQueriesDefinitions | TMapperOutput,
  // biome-ignore lint/suspicious/noExplicitAny: IfAnyThenElse fallback
  any,
  TMapperOutput extends MapperOutput
    ? TMapperOutput
    : // biome-ignore lint/suspicious/noExplicitAny: Rest param + QueryDefinition generic extraction
      TQueriesDefinitions extends [infer Q1, ...any[]]
      ? // biome-ignore lint/suspicious/noExplicitAny: Generic extraction from QueryDefinition
        Q1 extends QueryDefinition<any, any>
        ? QueryDataByDefinition<Q1>
        : EmptyData
      : EmptyData
>

export type WithErrorAndLoadingComponents = {
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
}
export type MountableStateError<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
> = {
  location: TLocation
  props: TInnerProps
  // queries: QueriesUnknownStatus<TQueries>
  queries: QueriesByDefinitions<TQueriesDefinitions>
  data: undefined
  error: Error0
  loading: false
  status: 'error'
}
export type MountableStateLoading<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
> = {
  location: TLocation
  props: TInnerProps
  // queries: QueriesUnknownStatus<TQueries>
  queries: QueriesByDefinitions<TQueriesDefinitions>
  data: undefined
  error: undefined
  loading: true
  status: 'loading'
}
export type MountableStateSuccess<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  location: TLocation
  props: TInnerProps
  queries: SuccessQueriesDefinitions<TQueriesDefinitions>
  data: MountableSuccessData<TQueriesDefinitions, TMapperOutput>
  error: undefined
  loading: false
  status: 'success'
}
export type MountableState<
  TStatus extends 'loading' | 'error' | 'success',
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = IfAnyThenElse<
  TStatus,
  | MountableStateSuccess<TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput>
  | MountableStateLoading<TLocation, TInnerProps, TQueriesDefinitions>
  | MountableStateError<TLocation, TInnerProps, TQueriesDefinitions>,
  TStatus extends 'success'
    ? MountableStateSuccess<TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput>
    : TStatus extends 'loading'
      ? MountableStateLoading<TLocation, TInnerProps, TQueriesDefinitions>
      : TStatus extends 'error'
        ? MountableStateError<TLocation, TInnerProps, TQueriesDefinitions>
        : never
>

export type DestinationComponentVariant = 'page' | 'component' | 'layout'
export type ErrorComponentProps<TDestinationComponentVariant extends DestinationComponentVariant> = {
  type: TDestinationComponentVariant
  error: Error0
}
export type ErrorComponentType<TDestinationComponentVariant extends DestinationComponentVariant> = React.ComponentType<
  ErrorComponentProps<TDestinationComponentVariant>
>

export type LoadingComponentProps<TDestinationComponentVariant extends DestinationComponentVariant> = {
  type: TDestinationComponentVariant
}
export type LoadingComponentType<TDestinationComponentVariant extends DestinationComponentVariant> =
  React.ComponentType<LoadingComponentProps<TDestinationComponentVariant>>

export type SuccessComponentProps<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  location: TLocation
  props: TInnerProps
  queries: SuccessQueriesDefinitions<TQueriesDefinitions>
  data: MountableSuccessData<TQueriesDefinitions, TMapperOutput>
} & WithErrorAndLoadingComponents
export type SuccessComponentType<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<SuccessComponentProps<TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput>>

export type MapperFnOptions<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  location: TLocation
  props: TInnerProps
  queries: SuccessQueriesDefinitions<TQueriesDefinitions>
  data: MountableSuccessData<TQueriesDefinitions, TMapperOutput>
}
export type MapperFn<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TNewMapperOutput extends MapperOutput,
> = (options: MapperFnOptions<TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput>) => TNewMapperOutput

export type WrapperComponentProps<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> =
  // biome-ignore lint/suspicious/noExplicitAny: MountableState accepts any status
  MountableState<any, TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput> & {
    // biome-ignore lint/suspicious/noExplicitAny: React.ReactNode excludes Promise
    children: Exclude<React.ReactNode, Promise<any>> | undefined
  } & WithErrorAndLoadingComponents
export type WrapperComponentType<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = (
  options: WrapperComponentProps<TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput>,
) => Exclude<React.ReactNode, Promise<any>> // biome-ignore lint/suspicious/noExplicitAny: React.ReactNode excludes Promise

export type WithFnOptions<
  TLocation extends AnyLocation = AnyLocation,
  TInnerProps extends Props = Props,
  TQueriesDefinitions extends QueriesDefinitions = QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  // biome-ignore lint/suspicious/noExplicitAny: MountableState status generic
> = MountableState<any, TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput>
export type WithFn<
  TLocation extends AnyLocation = AnyLocation,
  TInnerProps extends Props = Props,
  TQueriesDefinitions extends QueriesDefinitions = QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TNewInnerProps extends Props = TInnerProps,
> = (
  options: WithFnOptions<TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput>,
) => Error | 'loading' | TNewInnerProps | undefined

export type WithQueryFn<
  TLocation extends AnyLocation = AnyLocation,
  TInnerProps extends Props = Props,
  TQueriesDefinitions extends QueriesDefinitions = QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TNewQueries extends UseQueryOrInfiniteQueryResult | QueriesResults = UseQueryOrInfiniteQueryResult | QueriesResults,
> = (options: WithFnOptions<TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput>) => TNewQueries

export type RelatedQueryOptions<
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional Location
  TLocation extends AnyLocation = any,
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional Props
  TOuterProps extends Props = any,
> = {
  location: TLocation
} & WithOuterPropsIfExists<TOuterProps>
export type RelatedQueryInputGetter<
  TPoint extends { point: AnyPoint },
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional Location
  TLocation extends AnyLocation = any,
> = (options: RelatedQueryOptions<TLocation>) => TPoint['point']['Infer']['InputRawOrUndefined']

export type OnPrefetchMountableFnOptions<
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional Location
  TLocation extends AnyLocation | undefined = any,
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional Props
  TOuterProps extends Props = any,
> = WithOuterPropsIfExists<TOuterProps> & WithLocationIfExists<TLocation>
export type OnPrefetchMountableFn<
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional Location
  TLocation extends AnyLocation | undefined = any,
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional Props
  TOuterProps extends Props = any,
> = (options: OnPrefetchMountableFnOptions<TLocation, TOuterProps>) => Promise<void> | void

// export type LightQueryFnOptions<TLocation extends AnyLocation> = { location: TLocation }
// export type LightQueryFn<
//   TLocation extends AnyLocation,
//   TNewQueries extends UseQueryOrInfiniteQueryResult | UseQueryOrInfiniteQueryResult[],
// > = (options: QueryFnOptions<TLocation>) => TNewQueries

export type HeadFnOptions<
  TStatus extends 'loading' | 'error' | 'success',
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableState<TStatus, TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput>
export type HeadFn<
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional status
  TStatus extends 'loading' | 'error' | 'success' = any,
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional Location
  TLocation extends AnyLocation = any,
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional Props
  TInnerProps extends Props = any,
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional QueriesDefinitions
  TQueriesDefinitions extends QueriesDefinitions = any,
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional MapperOutput
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
> = (
  options: HeadFnOptions<TStatus, TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput>,
) => ResolvableHead | string

export type GlobalHeadFnOptions<
  TStatus extends 'loading' | 'error' | 'success' | 'initial',
  TLocation extends AnyLocation,
> = RouterPageState<TStatus> & { location: TLocation }
export type GlobalHeadFn<
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional status
  TStatus extends 'loading' | 'error' | 'success' | 'initial' = any,
  // biome-ignore lint/suspicious/noExplicitAny: Default generic for optional Location
  TLocation extends AnyLocation = any,
> = (options: GlobalHeadFnOptions<TStatus, TLocation>) => ResolvableHead | string

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

// biome-ignore lint/complexity/noBannedTypes: ok, becouse used as output type, not input type
export type PageExtraInnerProps = {}
export type PageLocation<TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition> = ExactLocation<
  CurrentRouteDefinition<TRouteDefinition>
>
export type PageSuccessComponentProps<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<PageLocation<TRouteDefinition>, TInnerProps, TQueriesDefinitions, TMapperOutput>
export type PageSuccessComponentType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<PageSuccessComponentProps<TRouteDefinition, TInnerProps, TQueriesDefinitions, TMapperOutput>>
export type UndefinedSuccessPageComponent = undefined

export type LayoutExtraInnerProps = {
  // biome-ignore lint/suspicious/noExplicitAny: React.ReactNode excludes Promise
  children: Exclude<React.ReactNode, Promise<any>>
}
export type LayoutLocation<TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition> =
  | WeakAncestorLocation<CurrentRouteDefinition<TRouteDefinition>>
  | ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
export type LayoutSuccessComponentProps<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<LayoutLocation<TRouteDefinition>, TInnerProps, TQueriesDefinitions, TMapperOutput> &
  LayoutExtraInnerProps
export type LayoutSuccessComponentType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<LayoutSuccessComponentProps<TRouteDefinition, TInnerProps, TQueriesDefinitions, TMapperOutput>>
export type UndefinedLayoutSuccessComponent = undefined

export type ProviderExtraInnerProps = {
  // biome-ignore lint/suspicious/noExplicitAny: React.ReactNode excludes Promise
  children: Exclude<React.ReactNode, Promise<any>>
}
export type ProviderLocation = AnyLocation
export type ProviderSuccessComponentProps<
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<ProviderLocation, TInnerProps, TQueriesDefinitions, TMapperOutput> & ProviderExtraInnerProps
export type ProviderSuccessComponentType<
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<ProviderSuccessComponentProps<TInnerProps, TQueriesDefinitions, TMapperOutput>>
export type UndefinedProviderSuccessComponent = undefined

// biome-ignore lint/complexity/noBannedTypes: ok, becouse used as output type, not input type
export type ComponentExtraInnerProps = {}
export type ComponentLocation = AnyLocation
export type ComponentSuccessComponentProps<
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<ComponentLocation, TInnerProps, TQueriesDefinitions, TMapperOutput> & ComponentExtraInnerProps
export type ComponentSuccessComponentType<
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<ComponentSuccessComponentProps<TInnerProps, TQueriesDefinitions, TMapperOutput>>
export type UndefinedComponentSuccessComponent = undefined

export type MountableLocation<
  TPointType extends PointType | undefined,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
> = TPointType extends 'page'
  ? PageLocation<TRouteDefinition>
  : TPointType extends 'layout'
    ? LayoutLocation<TRouteDefinition>
    : TPointType extends 'component'
      ? ComponentLocation
      : TPointType extends 'provider'
        ? ProviderLocation
        : AnyLocation

export type MountableSelfChildrenFn<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TExtraInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = (
  options: SuccessComponentProps<TLocation, TInnerProps, TQueriesDefinitions, TMapperOutput> & TExtraInnerProps,
) => Exclude<React.ReactNode, Promise<any>> // biome-ignore lint/suspicious/noExplicitAny: React.ReactNode excludes Promise

export type MountableSelfProps<
  TLocation extends AnyLocation,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TExtraInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
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
          | MountableSelfChildrenFn<TLocation, TInnerProps, TExtraInnerProps, TQueriesDefinitions, TMapperOutput>
      }
    : TWithChildren extends null
      ? {
          children?:
            | React.ReactNode
            | MountableSelfChildrenFn<TLocation, TInnerProps, TExtraInnerProps, TQueriesDefinitions, TMapperOutput>
        }
      : Record<never, never>)
export type MountableSelfType<
  TLocation extends AnyLocation,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TExtraInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TWithChildren extends boolean | null,
> = React.ComponentType<
  MountableSelfProps<
    TLocation,
    TServerInputSchema,
    TClientInputSchema,
    TOuterProps,
    TInnerProps,
    TExtraInnerProps,
    TQueriesDefinitions,
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
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  LayoutLocation<TRouteDefinition>,
  TServerInputSchema,
  TClientInputSchema,
  TOuterProps,
  TInnerProps,
  LayoutExtraInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  true
>
export type LayoutSelfType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  LayoutSelfProps<
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>

export type PageSelfProps<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  PageLocation<TRouteDefinition>,
  TServerInputSchema,
  TClientInputSchema,
  TOuterProps,
  TInnerProps,
  PageExtraInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  false
>
export type PageSelfType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  PageSelfProps<
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>

export type ComponentSelfProps<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  ComponentLocation,
  TServerInputSchema,
  TClientInputSchema,
  TOuterProps,
  TInnerProps,
  ComponentExtraInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  false
>
export type ComponentSelfType<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  ComponentSelfProps<
    TServerInputSchema,
    TClientInputSchema,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>

export type ProviderSelfProps<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  ProviderLocation,
  TServerInputSchema,
  TClientInputSchema,
  TOuterProps,
  TInnerProps,
  ProviderExtraInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  null
>
export type ProviderSelfType<
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  ProviderSelfProps<
    TServerInputSchema,
    TClientInputSchema,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>

export type MountAction<
  TType extends
    | 'relatedQuery'
    | 'wrapper'
    | 'with'
    | 'mapper'
    | 'head'
    | 'globalHead'
    | 'selfProps'
    | 'selfQuery'
    | 'errorComponent'
    | 'loadingComponent'
    | 'pluginStart'
    | 'pluginEnd' =
    | 'relatedQuery'
    | 'wrapper'
    | 'with'
    | 'mapper'
    | 'head'
    | 'globalHead'
    | 'selfProps'
    | 'selfQuery'
    | 'errorComponent'
    | 'loadingComponent'
    | 'pluginStart'
    | 'pluginEnd',
> = TType extends 'relatedQuery'
  ? {
      type: 'relatedQuery'
      point: AnyPoint
      inputGetter: RelatedQueryInputGetter<{ point: AnyPoint }>
      // biome-ignore lint/suspicious/noExplicitAny: Generic query options for any point
      queryOptions: ExtraUseInfiniteQueryOptions<any> | ExtraUseQueryOptions
      unstableId: number
      ssr: boolean
    }
  : TType extends 'selfQuery'
    ? { type: 'selfQuery'; unstableId: number; ssr: boolean }
    : TType extends 'wrapper'
      ? {
          type: 'wrapper'
          // biome-ignore lint/suspicious/noExplicitAny: Generic wrapper accepts any Location/Props/Queries/Mapper
          Component: WrapperComponentType<any, any, any, any>
          unstableId: number
          ssr: boolean
        }
      : TType extends 'with'
        ? { type: 'with'; fn: WithFn | WithQueryFn; unstableId: number; ssr: boolean }
        : TType extends 'mapper'
          ? {
              type: 'mapper'
              // biome-ignore lint/suspicious/noExplicitAny: Generic MapperFn params
              fn: MapperFn<any, any, any, any, any>
              unstableId: number
              ssr: boolean
            }
          : TType extends 'selfProps'
            ? { type: 'selfProps'; unstableId: number; ssr: boolean }
            : TType extends 'head'
              ? {
                  type: 'head'
                  // biome-ignore lint/suspicious/noExplicitAny: Generic HeadFn params
                  fn: HeadFn<any, any, any, any, any>
                  unstableId: number
                  ssr: boolean
                }
              : TType extends 'globalHead'
                ? {
                    type: 'globalHead'
                    // biome-ignore lint/suspicious/noExplicitAny: Generic GlobalHeadFn params
                    fn: GlobalHeadFn<any, any>
                    unstableId: number
                    ssr: boolean
                  }
                : TType extends 'errorComponent'
                  ? {
                      type: 'errorComponent'
                      // biome-ignore lint/suspicious/noExplicitAny: ErrorComponent accepts any error props
                      Component: ErrorComponentType<any>
                      variant: DestinationComponentVariant | undefined
                      unstableId: number
                      ssr: boolean
                    }
                  : TType extends 'loadingComponent'
                    ? {
                        type: 'loadingComponent'
                        // biome-ignore lint/suspicious/noExplicitAny: LoadingComponent accepts any props
                        Component: LoadingComponentType<any>
                        variant: DestinationComponentVariant | undefined
                        unstableId: number
                        ssr: boolean
                      }
                    : TType extends 'pluginStart'
                      ? { type: 'pluginStart'; name: string; unstableId: number; ssr: boolean }
                      : TType extends 'pluginEnd'
                        ? { type: 'pluginEnd'; name: string; unstableId: number; ssr: boolean }
                        : never

export type IsQueryShouldBeFinalized<
  TPointType extends PointType,
  TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType,
> = TPointType extends 'serverStage' | 'clientStage'
  ? TLetsReadyPointType extends QueryableReadyPointType
    ? true
    : false
  : false

export type WithSelfQueryIfShouldBeFinalized<
  TPointType extends PointType,
  TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TQueriesDefinitions extends QueriesDefinitions,
> = IfAnyThenElse<
  TQueriesDefinitions | TPointType | TServerLoaderOutput | TClientLoaderOutput | TPointType,
  // biome-ignore lint/suspicious/noExplicitAny: IfAnyThenElse fallback
  any,
  IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
    ? [
        ...TQueriesDefinitions,
        // if it should be finalized, then it was not finalize with infinteQuery, so always just 'query'
        QueryDefinition<'query', FinalLoaderDataOrNever<TServerLoaderOutput, TClientLoaderOutput>>,
      ]
    : TQueriesDefinitions
>
export type MergeQueries<
  TQueriesDefinitions extends QueriesDefinitions,
  TNewQueriesDefinitions extends QueriesDefinitions,
> = IfAnyThenElse<
  TQueriesDefinitions | TNewQueriesDefinitions,
  // biome-ignore lint/suspicious/noExplicitAny: IfAnyThenElse fallback
  any,
  [...TQueriesDefinitions, ...TNewQueriesDefinitions]
>
export type AppendQueries<
  TQueriesDefinitions extends QueriesDefinitions,
  // biome-ignore lint/suspicious/noExplicitAny: Generic QueryDefinition
  TNewQueryDefinition extends QueryDefinition<any, any>,
> = IfAnyThenElse<
  TQueriesDefinitions | TNewQueryDefinition,
  // biome-ignore lint/suspicious/noExplicitAny: IfAnyThenElse fallback
  any,
  [...TQueriesDefinitions, TNewQueryDefinition]
>

// export type AssertMountableQueryFinalization<
//   TPointType extends PointType,
//   TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType,
//   TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
//   TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
// > = TLetsReadyPointType extends MountablePointType
//   ? TPointType extends 'serverStage' | 'clientStage'
//     ? FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
//       ? ShowError<`Check this point last loader. It should return plain object data, not response. You see this message, becouse current method will finalize your query, so you should fix your loader before it`>
//       : unknown
//     : unknown
//   : unknown

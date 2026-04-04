import type { AnyLocation, ExactLocation, WeakAncestorLocation } from '@devp0nt/route0'
import type {
  InfiniteQueryObserverSuccessResult,
  QueryObserverSuccessResult,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query'
import type * as React from 'react'
import type { ResolvableHead } from 'unhead/types'
import type { ErrorPoint0 } from './error.js'
import type { NavigationPageState } from './navigation.js'
import type {
  AnyPoint,
  CurrentRouteDefinition,
  Data,
  EmptyData,
  EmptyObject,
  ExtraUseInfiniteQueryOptions,
  ExtraUseQueryOptions,
  FinalInputRaw,
  FinalLoaderDataOrNever,
  IfAnyThenElse,
  InputParsed,
  InputSchema,
  IsEmptyObject,
  IsFinalInputOptional,
  IsNever,
  LoaderOutput,
  MapperOutput,
  NormalizeCtxLike,
  PointType,
  PrettifyOrEmptyObject,
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

export type Props = Record<string, any>
export type UndefinedProps = undefined
export type EmptyProps = Record<never, never>

export type AppendProps<
  TPrevProps extends Props | UndefinedProps,
  TAppendProps extends Props | UndefinedProps,
> = PrettifyOrEmptyObject<
  TPrevProps extends Props
    ? IsNever<keyof TPrevProps> extends true
      ? TAppendProps extends Props
        ? TAppendProps
        : EmptyProps
      : TAppendProps extends Props
        ? // ? Omit<TPrevProps, keyof TAppendProps> & TAppendProps
          IsEmptyObject<TAppendProps> extends true
          ? TPrevProps
          : Omit<TPrevProps, keyof TAppendProps> & TAppendProps
        : TPrevProps
    : TAppendProps extends Props
      ? // ? TAppendProps
        IsEmptyObject<TAppendProps> extends true
        ? EmptyProps
        : TAppendProps
      : EmptyProps
>

export type WithOuterPropsIfExists<TOuterProps extends Props> =
  IsEmptyObject<TOuterProps> extends true
    ? // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      {}
    : { props: TOuterProps }
export type WithLocationIfExists<TLocation extends AnyLocation | undefined> = TLocation extends undefined
  ? // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {}
  : { location: TLocation }

type RequiredKeys<T> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

export type IsOuterPropsOptional<TOuterProps extends Props> =
  IsNever<keyof TOuterProps> extends true ? true : RequiredKeys<TOuterProps> extends never ? true : false

export type UseQueryOrInfiniteQueryResult = UseInfiniteQueryResult | UseQueryResult
export type QueriesResults = readonly UseQueryOrInfiniteQueryResult[]
export type QueryDefinition<TQueryResultType extends QueryResultType, TQueriedData extends Data, TError> = {
  type: TQueryResultType
  data: TQueriedData // it is infinite data in infinite data case
  error: TError
}
export type QueriesDefinitions = Array<QueryDefinition<any, any, any>>
export type QueryByDefinition<TQueryDefinition extends QueryDefinition<any, any, any>> = TQueryDefinition extends {
  type: infer TQueryResultType
  data: infer TQueriedData
  error: infer TError
}
  ? TQueryResultType extends 'query'
    ? UseQueryResult<TQueriedData, TError>
    : TQueryResultType extends 'infiniteQuery'
      ? UseInfiniteQueryResult<TQueriedData, TError>
      : never
  : never
export type SuccessQueryByDefinition<TQueryDefinition extends QueryDefinition<any, any, any>> =
  TQueryDefinition extends {
    type: infer TQueryResultType
    data: infer TQueriedData
    error: infer TError
  }
    ? TQueryResultType extends 'query'
      ? QueryObserverSuccessResult<TQueriedData, TError>
      : TQueryResultType extends 'infiniteQuery'
        ? InfiniteQueryObserverSuccessResult<TQueriedData, TError>
        : never
    : never
export type QueryDefinitionByQuery<TQueryResult extends UseQueryOrInfiniteQueryResult> =
  TQueryResult extends UseInfiniteQueryResult<any, infer TError>
    ? QueryDefinition<'infiniteQuery', QueryDataByResult<TQueryResult>, TError>
    : TQueryResult extends UseQueryResult<any, infer TError>
      ? QueryDefinition<'query', QueryDataByResult<TQueryResult>, TError>
      : never
type Q2D<T> = T extends UseQueryOrInfiniteQueryResult ? QueryDefinitionByQuery<T> : never
export type QueriesDefinitionsByQueries<TQueries extends QueriesResults> = IfAnyThenElse<
  TQueries,
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
type D2Q<T> = T extends QueryDefinition<any, any, any> ? QueryByDefinition<T> : never
export type QueriesByDefinitions<TQueriesDefinitions extends QueriesDefinitions> = IfAnyThenElse<
  TQueriesDefinitions,
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
type D2SQ<T> = T extends QueryDefinition<any, any, any> ? SuccessQueryByDefinition<T> : never
export type SuccessQueriesDefinitions<TQueriesDefinitions extends QueriesDefinitions> = IfAnyThenElse<
  TQueriesDefinitions,
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
  any,
  TQueryResult extends UseInfiniteQueryResult<infer TData, any>
    ? CleanQueryData<TData>
    : TQueryResult extends UseQueryResult<infer TData, any>
      ? CleanQueryData<TData>
      : Data
>
export type QueryDataByDefinition<TQueryDefinition extends QueryDefinition<any, any, any>> = TQueryDefinition extends {
  data: infer TData
}
  ? TData extends Data
    ? TData
    : never
  : never

export type MountableSuccessData<
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = IfAnyThenElse<
  TQueriesDefinitions | TMapperOutput,
  any,
  TMapperOutput extends MapperOutput
    ? TMapperOutput
    : TQueriesDefinitions extends [infer Q1, ...any[]]
      ? Q1 extends QueryDefinition<any, any, any>
        ? QueryDataByDefinition<Q1>
        : EmptyData
      : EmptyData
>

export type WithErrorAndLoadingComponents = {
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
}
export type MountableStateError<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TError extends ErrorPoint0,
> = {
  props: TInnerProps
  // queries: QueriesUnknownStatus<TQueries>
  queries: QueriesByDefinitions<TQueriesDefinitions>
  data: undefined
  error: TError
  loading: false
  status: 'error'
} & WithParamsAndSearchAndInput<TParamsSchema, TSearchSchema, TClientInputSchema> &
  WithLocationIfExists<TLocation>

export type MountableStateLoading<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TError extends ErrorPoint0,
> = {
  props: TInnerProps
  queries: QueriesByDefinitions<TQueriesDefinitions>
  data: undefined
  error: undefined
  loading: true
  status: 'loading'
} & WithParamsAndSearchAndInput<TParamsSchema, TSearchSchema, TClientInputSchema> &
  WithLocationIfExists<TLocation>

export type MountableStateSuccess<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  props: TInnerProps
  queries: SuccessQueriesDefinitions<TQueriesDefinitions>
  data: MountableSuccessData<TQueriesDefinitions, TMapperOutput>
  error: undefined
  loading: false
  status: 'success'
} & WithParamsAndSearchAndInput<TParamsSchema, TSearchSchema, TClientInputSchema> &
  WithLocationIfExists<TLocation>
export type MountableState<
  TStatus extends 'loading' | 'error' | 'success',
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TError extends ErrorPoint0,
> = IfAnyThenElse<
  TStatus,
  | MountableStateSuccess<
      TLocation,
      TParamsSchema,
      TSearchSchema,
      TClientInputSchema,
      TInnerProps,
      TQueriesDefinitions,
      TMapperOutput
    >
  | MountableStateLoading<
      TLocation,
      TParamsSchema,
      TSearchSchema,
      TClientInputSchema,
      TInnerProps,
      TQueriesDefinitions,
      TError
    >
  | MountableStateError<
      TLocation,
      TParamsSchema,
      TSearchSchema,
      TClientInputSchema,
      TInnerProps,
      TQueriesDefinitions,
      TError
    >,
  TStatus extends 'success'
    ? MountableStateSuccess<
        TLocation,
        TParamsSchema,
        TSearchSchema,
        TClientInputSchema,
        TInnerProps,
        TQueriesDefinitions,
        TMapperOutput
      >
    : TStatus extends 'loading'
      ? MountableStateLoading<
          TLocation,
          TParamsSchema,
          TSearchSchema,
          TClientInputSchema,
          TInnerProps,
          TQueriesDefinitions,
          TError
        >
      : TStatus extends 'error'
        ? MountableStateError<
            TLocation,
            TParamsSchema,
            TSearchSchema,
            TClientInputSchema,
            TInnerProps,
            TQueriesDefinitions,
            TError
          >
        : never
>

export type DestinationComponentVariant = 'page' | 'component' | 'layout'
export type ErrorComponentProps<
  TDestinationComponentVariant extends DestinationComponentVariant,
  TError extends ErrorPoint0,
> = {
  type: TDestinationComponentVariant
  error: TError
}
export type ErrorComponentType<
  TDestinationComponentVariant extends DestinationComponentVariant,
  TError extends ErrorPoint0,
> = React.ComponentType<ErrorComponentProps<TDestinationComponentVariant, TError>>

export type LoadingComponentProps<TDestinationComponentVariant extends DestinationComponentVariant> = {
  type: TDestinationComponentVariant
}
export type LoadingComponentType<TDestinationComponentVariant extends DestinationComponentVariant> =
  React.ComponentType<LoadingComponentProps<TDestinationComponentVariant>>

type WithParamsAndSearchAndInput<
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TInputSchema extends InputSchema | UndefinedInputSchema,
> = IfAnyThenElse<
  TParamsSchema | TSearchSchema | TInputSchema,
  {
    params?: any
    search?: any
    input?: any
  },
  (TParamsSchema extends InputSchema
    ? {
        params: InputParsed<TParamsSchema>
      }
    : EmptyObject) &
    (TSearchSchema extends InputSchema
      ? {
          search: InputParsed<TSearchSchema>
        }
      : EmptyObject) &
    (TInputSchema extends InputSchema
      ? {
          input: InputParsed<TInputSchema>
        }
      : EmptyObject)
>

export type SuccessComponentProps<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  props: TInnerProps
  queries: SuccessQueriesDefinitions<TQueriesDefinitions>
  data: MountableSuccessData<TQueriesDefinitions, TMapperOutput>
} & WithParamsAndSearchAndInput<TParamsSchema, TSearchSchema, TClientInputSchema> &
  WithErrorAndLoadingComponents &
  WithLocationIfExists<TLocation>
export type SuccessComponentType<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  SuccessComponentProps<
    TLocation,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>

export type MapperFnOptions<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  props: TInnerProps
  queries: SuccessQueriesDefinitions<TQueriesDefinitions>
  data: MountableSuccessData<TQueriesDefinitions, TMapperOutput>
} & WithParamsAndSearchAndInput<TParamsSchema, TSearchSchema, TClientInputSchema> &
  WithLocationIfExists<TLocation>
export type MapperFn<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TNewMapperOutput extends MapperOutput,
> = (
  options: MapperFnOptions<
    TLocation,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >,
) => TNewMapperOutput

export type WrapperComponentProps<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TError extends ErrorPoint0,
> = MountableState<
  any,
  TLocation,
  TParamsSchema,
  TSearchSchema,
  TClientInputSchema,
  TInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  TError
> & {
  children: Exclude<React.ReactNode, Promise<any>> | undefined
} & WithErrorAndLoadingComponents

export type WrapperComponentType<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TError extends ErrorPoint0,
> = (
  options: WrapperComponentProps<
    TLocation,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput,
    TError
  >,
) => Exclude<React.ReactNode, Promise<any>>

export type WithFnOptions<
  TLocation extends AnyLocation | undefined = AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TInnerProps extends Props = Props,
  TQueriesDefinitions extends QueriesDefinitions = QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TError extends ErrorPoint0 = ErrorPoint0,
> = MountableState<
  any,
  TLocation,
  TParamsSchema,
  TSearchSchema,
  TClientInputSchema,
  TInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  TError
>

export type WithFn<
  TLocation extends AnyLocation | undefined = AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TInnerProps extends Props = Props,
  TQueriesDefinitions extends QueriesDefinitions = QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TError extends ErrorPoint0 = ErrorPoint0,
  TNewInnerProps extends Props = Props,
> = (
  options: WithFnOptions<
    TLocation,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput,
    TError
  >,
) => TNewInnerProps | Error | 'loading' | undefined | void
export type InferWithFnOutputNewInnerProps<TWithFn extends WithFn<any, any, any, any, any, any, any, any, any>> =
  Exclude<ReturnType<TWithFn>, undefined | void | Error | 'loading'> extends never
    ? undefined
    : NormalizeCtxLike<Exclude<ReturnType<TWithFn>, Error | 'loading'>>

export type ClientOnlyFallbackComponentProps<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TError extends ErrorPoint0,
> = MountableState<
  any,
  TLocation,
  TParamsSchema,
  TSearchSchema,
  TClientInputSchema,
  TInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  TError
> &
  WithErrorAndLoadingComponents

export type ClientOnlyFallbackComponentType<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TError extends ErrorPoint0,
> = (
  options: ClientOnlyFallbackComponentProps<
    TLocation,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput,
    TError
  >,
) => Exclude<React.ReactNode, Promise<any>>

export type WithQueryFn<
  TLocation extends AnyLocation | undefined = AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TInnerProps extends Props = Props,
  TQueriesDefinitions extends QueriesDefinitions = QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = MapperOutput | UndefinedMapperOutput,
  TError extends ErrorPoint0 = ErrorPoint0,
  TNewQueries extends UseQueryOrInfiniteQueryResult | QueriesResults = UseQueryOrInfiniteQueryResult | QueriesResults,
> = (
  options: WithFnOptions<
    TLocation,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput,
    TError
  >,
) => TNewQueries

export type RelatedQueryOptions<TLocation extends AnyLocation = any, TOuterProps extends Props = any> = {
  location: TLocation
} & WithOuterPropsIfExists<TOuterProps>
export type RelatedQueryInputGetter<TPoint extends { point: AnyPoint }, TLocation extends AnyLocation = any> = (
  options: RelatedQueryOptions<TLocation>,
) => TPoint['point']['Infer']['InputRawOrUndefined']

export type OnPrefetchMountableFnOptions<
  TLocation extends AnyLocation | undefined = any,
  TOuterProps extends Props = any,
> = WithOuterPropsIfExists<TOuterProps> & WithLocationIfExists<TLocation>
export type OnPrefetchMountableFn<TLocation extends AnyLocation | undefined = any, TOuterProps extends Props = any> = (
  options: OnPrefetchMountableFnOptions<TLocation, TOuterProps>,
) => Promise<void> | void

export type HeadFnOptions<
  TStatus extends 'loading' | 'error' | 'success',
  TLocation extends AnyLocation,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TError extends ErrorPoint0,
> = MountableState<
  TStatus,
  TLocation,
  TParamsSchema,
  TSearchSchema,
  TClientInputSchema,
  TInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  TError
>
export type HeadFn<
  TStatus extends 'loading' | 'error' | 'success' = any,
  TLocation extends AnyLocation = any,
  TParamsSchema extends InputSchema | UndefinedInputSchema = any,
  TSearchSchema extends InputSchema | UndefinedInputSchema = any,
  TClientInputSchema extends InputSchema | UndefinedInputSchema = any,
  TInnerProps extends Props = any,
  TQueriesDefinitions extends QueriesDefinitions = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
  TError extends ErrorPoint0 = ErrorPoint0,
> = (
  options: HeadFnOptions<
    TStatus,
    TLocation,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput,
    TError
  >,
) => ResolvableHead | string

export type GlobalHeadFnOptions<
  TStatus extends 'loading' | 'error' | 'success' | 'initial',
  TLocation extends AnyLocation,
> = NavigationPageState<TStatus> & { location: TLocation }
export type GlobalHeadFn<
  TStatus extends 'loading' | 'error' | 'success' | 'initial' = any,
  TLocation extends AnyLocation = any,
> = (options: GlobalHeadFnOptions<TStatus, TLocation>) => ResolvableHead | string

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type PageExtraInnerProps = {}
export type PageLocation<TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition> = ExactLocation<
  CurrentRouteDefinition<TRouteDefinition>
>
export type PageSuccessComponentProps<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<
  PageLocation<TRouteDefinition>,
  TParamsSchema,
  TSearchSchema,
  TClientInputSchema,
  TInnerProps,
  TQueriesDefinitions,
  TMapperOutput
>
export type PageSuccessComponentType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  PageSuccessComponentProps<
    TRouteDefinition,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>
export type UndefinedSuccessPageComponent = undefined

export type LayoutExtraInnerProps = {
  children: Exclude<React.ReactNode, Promise<any>>
}
export type LayoutLocation<TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition> =
  | WeakAncestorLocation<CurrentRouteDefinition<TRouteDefinition>>
  | ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
export type LayoutSuccessComponentProps<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<
  LayoutLocation<TRouteDefinition>,
  TParamsSchema,
  TSearchSchema,
  TClientInputSchema,
  TInnerProps,
  TQueriesDefinitions,
  TMapperOutput
> &
  LayoutExtraInnerProps
export type LayoutSuccessComponentType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  LayoutSuccessComponentProps<
    TRouteDefinition,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>
export type UndefinedLayoutSuccessComponent = undefined

export type ProviderExtraInnerProps = {
  children: Exclude<React.ReactNode, Promise<any>>
}
export type ProviderLocation = undefined
export type ProviderSuccessComponentProps<
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<
  ProviderLocation,
  TParamsSchema,
  TSearchSchema,
  TClientInputSchema,
  TInnerProps,
  TQueriesDefinitions,
  TMapperOutput
> &
  ProviderExtraInnerProps
export type ProviderSuccessComponentType<
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  ProviderSuccessComponentProps<
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>
export type UndefinedProviderSuccessComponent = undefined

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ComponentExtraInnerProps = {}
export type ComponentLocation = undefined
export type ComponentSuccessComponentProps<
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<
  ComponentLocation,
  TParamsSchema,
  TSearchSchema,
  TClientInputSchema,
  TInnerProps,
  TQueriesDefinitions,
  TMapperOutput
> &
  ComponentExtraInnerProps
export type ComponentSuccessComponentType<
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  ComponentSuccessComponentProps<
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>
export type UndefinedComponentSuccessComponent = undefined

export type MuntableSuccessComponentType<
  TPointType extends PointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = TPointType extends 'page'
  ? PageSuccessComponentType<
      TRouteDefinition,
      TParamsSchema,
      TSearchSchema,
      TClientInputSchema,
      TInnerProps,
      TQueriesDefinitions,
      TMapperOutput
    >
  : TPointType extends 'layout'
    ? LayoutSuccessComponentType<
        TRouteDefinition,
        TParamsSchema,
        TSearchSchema,
        TClientInputSchema,
        TInnerProps,
        TQueriesDefinitions,
        TMapperOutput
      >
    : TPointType extends 'component'
      ? ComponentSuccessComponentType<
          TParamsSchema,
          TSearchSchema,
          TClientInputSchema,
          TInnerProps,
          TQueriesDefinitions,
          TMapperOutput
        >
      : TPointType extends 'provider'
        ? ProviderSuccessComponentType<
            TParamsSchema,
            TSearchSchema,
            TClientInputSchema,
            TInnerProps,
            TQueriesDefinitions,
            TMapperOutput
          >
        : undefined

export type MountableSuccessComponentProps<
  TPointType extends PointType,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = TPointType extends 'page'
  ? PageSuccessComponentProps<
      TRouteDefinition,
      TParamsSchema,
      TSearchSchema,
      TClientInputSchema,
      TInnerProps,
      TQueriesDefinitions,
      TMapperOutput
    >
  : TPointType extends 'layout'
    ? LayoutSuccessComponentProps<
        TRouteDefinition,
        TParamsSchema,
        TSearchSchema,
        TClientInputSchema,
        TInnerProps,
        TQueriesDefinitions,
        TMapperOutput
      >
    : TPointType extends 'component'
      ? ComponentSuccessComponentProps<
          TParamsSchema,
          TSearchSchema,
          TClientInputSchema,
          TInnerProps,
          TQueriesDefinitions,
          TMapperOutput
        >
      : TPointType extends 'provider'
        ? ProviderSuccessComponentProps<
            TParamsSchema,
            TSearchSchema,
            TClientInputSchema,
            TInnerProps,
            TQueriesDefinitions,
            TMapperOutput
          >
        : never

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
        : AnyLocation | undefined
export type LocationOrAnyLocation<TLocation extends AnyLocation | undefined> = TLocation extends AnyLocation
  ? TLocation
  : AnyLocation

export type MountableSelfChildrenFn<
  TLocation extends AnyLocation | undefined,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TInnerProps extends Props,
  TExtraInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = (
  options: SuccessComponentProps<
    TLocation,
    TParamsSchema,
    TSearchSchema,
    TClientInputSchema,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  > &
    TExtraInnerProps,
) => Exclude<React.ReactNode, Promise<any>>

export type MountableSelfProps<
  TLocation extends AnyLocation | undefined,
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TExtraInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TWithChildren extends boolean | null,
> = (IsFinalInputOptional<
  TPointType,
  TServerInputSchema,
  TClientInputSchema,
  TParamsSchema,
  TSearchSchema,
  TBodySchema
> extends true
  ? {
      input?: FinalInputRaw<
        TPointType,
        TServerInputSchema,
        TClientInputSchema,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >
    }
  : {
      input: FinalInputRaw<
        TPointType,
        TServerInputSchema,
        TClientInputSchema,
        TParamsSchema,
        TSearchSchema,
        TBodySchema
      >
    }) &
  TOuterProps &
  (TWithChildren extends true
    ? {
        children:
          | React.ReactNode
          | MountableSelfChildrenFn<
              TLocation,
              TParamsSchema,
              TSearchSchema,
              TClientInputSchema,
              TInnerProps,
              TExtraInnerProps,
              TQueriesDefinitions,
              TMapperOutput
            >
      }
    : TWithChildren extends null
      ? {
          children?:
            | React.ReactNode
            | MountableSelfChildrenFn<
                TLocation,
                TParamsSchema,
                TSearchSchema,
                TClientInputSchema,
                TInnerProps,
                TExtraInnerProps,
                TQueriesDefinitions,
                TMapperOutput
              >
        }
      : Record<never, never>)
export type MountableSelfType<
  TLocation extends AnyLocation | undefined,
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TExtraInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TWithChildren extends boolean | null,
> = React.ComponentType<
  MountableSelfProps<
    TLocation,
    TPointType,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
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
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  LayoutLocation<TRouteDefinition>,
  TPointType,
  TServerInputSchema,
  TClientInputSchema,
  TParamsSchema,
  TSearchSchema,
  TBodySchema,
  TOuterProps,
  TInnerProps,
  LayoutExtraInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  true
>
export type LayoutSelfType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  LayoutSelfProps<
    TRouteDefinition,
    TPointType,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>

export type PageSelfProps<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  PageLocation<TRouteDefinition>,
  TPointType,
  TServerInputSchema,
  TClientInputSchema,
  TParamsSchema,
  TSearchSchema,
  TBodySchema,
  TOuterProps,
  TInnerProps,
  PageExtraInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  false
>
export type PageSelfType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  PageSelfProps<
    TRouteDefinition,
    TPointType,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>

export type ComponentSelfProps<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  ComponentLocation,
  TPointType,
  TServerInputSchema,
  TClientInputSchema,
  TParamsSchema,
  TSearchSchema,
  TBodySchema,
  TOuterProps,
  TInnerProps,
  ComponentExtraInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  false
>
export type ComponentSelfType<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  ComponentSelfProps<
    TPointType,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>

export type ProviderSelfProps<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  ProviderLocation,
  TPointType,
  TServerInputSchema,
  TClientInputSchema,
  TParamsSchema,
  TSearchSchema,
  TBodySchema,
  TOuterProps,
  TInnerProps,
  ProviderExtraInnerProps,
  TQueriesDefinitions,
  TMapperOutput,
  null
>
export type ProviderSelfType<
  TPointType extends PointType,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TParamsSchema extends InputSchema | UndefinedInputSchema,
  TSearchSchema extends InputSchema | UndefinedInputSchema,
  TBodySchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  ProviderSelfProps<
    TPointType,
    TServerInputSchema,
    TClientInputSchema,
    TParamsSchema,
    TSearchSchema,
    TBodySchema,
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions,
    TMapperOutput
  >
>

export type MountAction<
  TType extends
    | 'relatedQuery'
    | 'clientOnly'
    | 'input'
    | 'params'
    | 'search'
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
    | 'clientOnly'
    | 'input'
    | 'params'
    | 'search'
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
      queryOptions: ExtraUseInfiniteQueryOptions<any> | ExtraUseQueryOptions
      unstableId: number
      ssr: boolean
    }
  : TType extends 'selfQuery'
    ? { type: 'selfQuery'; unstableId: number; ssr: boolean }
    : TType extends 'clientOnly'
      ? {
          type: 'clientOnly'
          Fallback: ClientOnlyFallbackComponentType<any, any, any, any, any, any, any, any> | undefined
          unstableId: number
        }
      : TType extends 'input'
        ? { type: 'input'; schema: InputSchema; unstableId: number }
        : TType extends 'params'
          ? { type: 'params'; schema: InputSchema; unstableId: number }
          : TType extends 'search'
            ? { type: 'search'; schema: InputSchema; unstableId: number }
            : TType extends 'wrapper'
              ? {
                  type: 'wrapper'
                  Component: WrapperComponentType<any, any, any, any, any, any, any, ErrorPoint0>
                  unstableId: number
                  ssr: boolean
                }
              : TType extends 'with'
                ? { type: 'with'; fn: WithFn | WithQueryFn; unstableId: number; ssr: boolean }
                : TType extends 'mapper'
                  ? {
                      type: 'mapper'
                      fn: MapperFn<any, any, any, any, any, any, any, any>
                      unstableId: number
                      ssr: boolean
                    }
                  : TType extends 'selfProps'
                    ? { type: 'selfProps'; unstableId: number; ssr: boolean }
                    : TType extends 'head'
                      ? { type: 'head'; fn: HeadFn<any, any, any, any, any>; unstableId: number; ssr: boolean }
                      : TType extends 'globalHead'
                        ? { type: 'globalHead'; fn: GlobalHeadFn<any, any>; unstableId: number; ssr: boolean }
                        : TType extends 'errorComponent'
                          ? {
                              type: 'errorComponent'
                              Component: ErrorComponentType<any, ErrorPoint0>
                              variant: DestinationComponentVariant | undefined
                              unstableId: number
                              ssr: boolean
                            }
                          : TType extends 'loadingComponent'
                            ? {
                                type: 'loadingComponent'
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
  TError extends ErrorPoint0,
> = IfAnyThenElse<
  TQueriesDefinitions | TPointType | TServerLoaderOutput | TClientLoaderOutput | TPointType,
  any,
  IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
    ? [
        ...TQueriesDefinitions,
        // if it should be finalized, then it was not finalize with infinteQuery, so always just 'query'
        QueryDefinition<'query', FinalLoaderDataOrNever<TServerLoaderOutput, TClientLoaderOutput>, TError>,
      ]
    : TQueriesDefinitions
>
export type MergeQueries<
  TQueriesDefinitions extends QueriesDefinitions,
  TNewQueriesDefinitions extends QueriesDefinitions,
> = IfAnyThenElse<
  TQueriesDefinitions | TNewQueriesDefinitions,
  any,
  [...TQueriesDefinitions, ...TNewQueriesDefinitions]
>
export type AppendQueries<
  TQueriesDefinitions extends QueriesDefinitions,
  TNewQueryDefinition extends QueryDefinition<any, any, any>,
> = IfAnyThenElse<TQueriesDefinitions | TNewQueryDefinition, any, [...TQueriesDefinitions, TNewQueryDefinition]>

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

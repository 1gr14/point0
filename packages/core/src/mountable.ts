import type { Error0 } from '@devp0nt/error0'
import type { AnyLocation, ExactLocation, WeakChildrenLocation } from '@devp0nt/route0'
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query'
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
  UndefinedRouteDefinition,
  UsePointQueryResult,
} from './types.js'

export type Props = Record<string, any>
export type UndefinedProps = undefined
export type EmptyProps = Record<never, never>

export type AppendProps<TPrevProps extends Props, TAppendProps extends Props> = TPrevProps extends Props
  ? IsNever<keyof TPrevProps> extends true
    ? TAppendProps
    : Omit<TPrevProps, keyof TAppendProps> & TAppendProps
  : TAppendProps

export type UseQueryOrInfiniteQueryResult = UseInfiniteQueryResult | UseQueryResult
export type QueriesResults = UseQueryOrInfiniteQueryResult[]
export type QueryDefinition<TQueryResultType extends QueryResultType, TData extends Data> = {
  type: TQueryResultType
  data: TData
}
export type QueriesDefinitions = Array<QueryDefinition<any, any>>
export type QueryByDefinition<TQueryDefinition extends QueryDefinition<any, any>> = TQueryDefinition extends {
  type: infer TQueryResultType
  data: infer TData
}
  ? TQueryResultType extends 'query'
    ? UseQueryResult<TData, Error0>
    : TQueryResultType extends 'infiniteQuery'
      ? UseInfiniteQueryResult<InfiniteData<TData>, Error0>
      : never
  : never
export type QueryDefinitionByQuery<TQuery extends UseQueryOrInfiniteQueryResult> =
  TQuery extends UseInfiniteQueryResult<any, any>
    ? QueryDefinition<'infiniteQuery', QueryData<TQuery>>
    : TQuery extends UseQueryResult<any, any>
      ? QueryDefinition<'query', QueryData<TQuery>>
      : never
export type QueriesDefinitionsByQueries<TQueries extends UseQueryOrInfiniteQueryResult[]> = IfAnyThenElse<
  TQueries,
  any,
  TQueries extends [infer Q1, ...infer Rest]
    ? [
        QueryDefinitionByQuery<Q1 extends UseQueryOrInfiniteQueryResult ? Q1 : never>,
        ...QueriesDefinitionsByQueries<Extract<Rest, UseQueryOrInfiniteQueryResult[]>>,
      ]
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
export type QueriesSuccess<TQueries extends UseQueryOrInfiniteQueryResult[]> = IfAnyThenElse<
  TQueries,
  any,
  TQueries extends [infer Q1, ...infer Rest]
    ? [
        QuerySuccess<Q1 extends UseQueryOrInfiniteQueryResult ? Q1 : never>,
        ...QueriesSuccess<Extract<Rest, UseQueryOrInfiniteQueryResult[]>>,
      ]
    : []
>
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
export type QueryData<TQuery extends UseQueryOrInfiniteQueryResult> = IfAnyThenElse<
  TQuery,
  any,
  TQuery extends UseQueryResult<infer TData, any>
    ? CleanQueryData<TData>
    : TQuery extends UseInfiniteQueryResult<infer TData, any>
      ? CleanQueryData<TData>
      : Data
>

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
> = IfAnyThenElse<
  TQueries | TMapperOutput,
  any,
  TMapperOutput extends MapperOutput
    ? TMapperOutput
    : TQueries extends [infer Q1, ...any[]]
      ? Q1 extends UseQueryOrInfiniteQueryResult
        ? QueryData<Q1>
        : EmptyData
      : EmptyData
>

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

type WithLocationIfDefined<TLocation extends AnyLocation> = TLocation extends Location
  ? { location: TLocation }
  : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {}

export type MountableStateError<TLocation extends AnyLocation, TInnerProps extends Props, TQueries extends Queries> = {
  location: TLocation
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
export type MountableStateLoading<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
> = {
  location: TLocation
  props: TInnerProps
  // queries: QueriesUnknownStatus<TQueries>
  queries: TQueries
  data: undefined
  error: undefined
  loading: true
  status: 'loading'
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
}
export type MountableStateSuccess<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  location: TLocation
  props: TInnerProps
  queries: QueriesSuccess<TQueries>
  data: MountableSuccessData<TQueries, TMapperOutput>
  error: undefined
  loading: false
  status: 'success'
  LoadingComponent: React.ComponentType
  ErrorComponent: React.ComponentType<{ error: Error }>
} & WithLocationIfDefined<TLocation>
export type MountableState<
  TStatus extends 'loading' | 'error' | 'success',
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = IfAnyThenElse<
  TStatus,
  | MountableStateSuccess<TLocation, TInnerProps, TQueries, TMapperOutput>
  | MountableStateLoading<TLocation, TInnerProps, TQueries>
  | MountableStateError<TLocation, TInnerProps, TQueries>,
  TStatus extends 'success'
    ? MountableStateSuccess<TLocation, TInnerProps, TQueries, TMapperOutput>
    : TStatus extends 'loading'
      ? MountableStateLoading<TLocation, TInnerProps, TQueries>
      : TStatus extends 'error'
        ? MountableStateError<TLocation, TInnerProps, TQueries>
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
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  location: TLocation
  props: TInnerProps
  queries: QueriesSuccess<TQueries>
  data: MountableSuccessData<TQueries, TMapperOutput>
}
export type SuccessComponentType<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<SuccessComponentProps<TLocation, TInnerProps, TQueries, TMapperOutput>>

export type MapperFnOptions<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = {
  location: TLocation
  props: TInnerProps
  queries: QueriesSuccess<TQueries>
  data: MountableSuccessData<TQueries, TMapperOutput>
}
export type MapperFn<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TNewMapperOutput extends MapperOutput,
> = (options: MapperFnOptions<TLocation, TInnerProps, TQueries, TMapperOutput>) => TNewMapperOutput

export type WrapperComponentProps<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableState<any, TLocation, TInnerProps, TQueries, TMapperOutput> & {
  children: Exclude<React.ReactNode, Promise<any>> | undefined
}
export type WrapperComponentType<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = (
  options: WrapperComponentProps<TLocation, TInnerProps, TQueries, TMapperOutput>,
) => Exclude<React.ReactNode, Promise<any>>

export type WithFnOptions<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = Omit<MountableState<any, TLocation, TInnerProps, TQueries, TMapperOutput>, 'LoadingComponent' | 'ErrorComponent'>
export type WithFn<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TNewInnerProps extends Props = TInnerProps,
> = (
  options: WithFnOptions<TLocation, TInnerProps, TQueries, TMapperOutput>,
) => Error | 'loading' | TNewInnerProps | undefined

export type QueryFnOptions<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = Omit<MountableState<any, TLocation, TInnerProps, TQueries, TMapperOutput>, 'LoadingComponent' | 'ErrorComponent'>
export type QueryFn<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TNewQueries extends UseQueryOrInfiniteQueryResult | UseQueryOrInfiniteQueryResult[],
> = (options: QueryFnOptions<TLocation, TInnerProps, TQueries, TMapperOutput>) => TNewQueries

export type HeadFnOptions<
  TStatus extends 'loading' | 'error' | 'success',
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = Omit<
  MountableState<TStatus, TLocation, TInnerProps, TQueries, TMapperOutput>,
  'LoadingComponent' | 'ErrorComponent'
>
export type HeadFn<
  TStatus extends 'loading' | 'error' | 'success' = any,
  TLocation extends AnyLocation = any,
  TInnerProps extends Props = any,
  TQueries extends Queries = any,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput = any,
> = (options: HeadFnOptions<TStatus, TLocation, TInnerProps, TQueries, TMapperOutput>) => ResolvableHead | string

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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type PageExtraInnerProps = {}
export type PageLocation<TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition> =
  | ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
  | WeakChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
export type PageSuccessComponentProps<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<PageLocation<TRouteDefinition>, TInnerProps, TQueries, TMapperOutput>
export type PageSuccessComponentType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<PageSuccessComponentProps<TRouteDefinition, TInnerProps, TQueries, TMapperOutput>>
export type UndefinedSuccessPageComponent = undefined

export type LayoutExtraInnerProps = {
  children: Exclude<React.ReactNode, Promise<any>>
}
export type LayoutLocation<TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition> =
  | WeakChildrenLocation<CurrentRouteDefinition<TRouteDefinition>>
  | ExactLocation<CurrentRouteDefinition<TRouteDefinition>>
export type LayoutSuccessComponentProps<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<LayoutLocation<TRouteDefinition>, TInnerProps, TQueries, TMapperOutput> &
  LayoutExtraInnerProps
export type LayoutSuccessComponentType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<LayoutSuccessComponentProps<TRouteDefinition, TInnerProps, TQueries, TMapperOutput>>
export type UndefinedLayoutSuccessComponent = undefined

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

export type ProviderExtraInnerProps = {
  children: Exclude<React.ReactNode, Promise<any>>
}
export type ProviderLocation = AnyLocation
export type ProviderSuccessComponentProps<
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<ProviderLocation, TInnerProps, TQueries, TMapperOutput> & ProviderExtraInnerProps
export type ProviderSuccessComponentType<
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<ProviderSuccessComponentProps<TInnerProps, TQueries, TMapperOutput>>
export type UndefinedProviderSuccessComponent = undefined

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ComponentExtraInnerProps = {}
export type ComponentLocation = AnyLocation
export type ComponentSuccessComponentProps<
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = SuccessComponentProps<ComponentLocation, TInnerProps, TQueries, TMapperOutput> & ComponentExtraInnerProps
export type ComponentSuccessComponentType<
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<ComponentSuccessComponentProps<TInnerProps, TQueries, TMapperOutput>>
export type UndefinedComponentSuccessComponent = undefined

export type MountableSelfChildrenFn<
  TLocation extends AnyLocation,
  TInnerProps extends Props,
  TExtraInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = (
  options: SuccessComponentProps<TLocation, TInnerProps, TQueries, TMapperOutput> & TExtraInnerProps,
) => Exclude<React.ReactNode, Promise<any>>

export type MountableSelfProps<
  TLocation extends AnyLocation,
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
          | MountableSelfChildrenFn<TLocation, TInnerProps, TExtraInnerProps, TQueries, TMapperOutput>
      }
    : TWithChildren extends null
      ? {
          children?:
            | React.ReactNode
            | MountableSelfChildrenFn<TLocation, TInnerProps, TExtraInnerProps, TQueries, TMapperOutput>
        }
      : Record<never, never>)
export type MountableSelfType<
  TLocation extends AnyLocation,
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
    TLocation,
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
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  LayoutLocation<TRouteDefinition>,
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
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  LayoutSelfProps<
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TOuterProps,
    TInnerProps,
    TQueries,
    TMapperOutput
  >
>

export type PageSelfProps<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = MountableSelfProps<
  PageLocation<TRouteDefinition>,
  TServerInputSchema,
  TClientInputSchema,
  TOuterProps,
  TInnerProps,
  PageExtraInnerProps,
  TQueries,
  TMapperOutput,
  false
>
export type PageSelfType<
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueries extends Queries,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
> = React.ComponentType<
  PageSelfProps<
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    TOuterProps,
    TInnerProps,
    TQueries,
    TMapperOutput
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
  ComponentLocation,
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
  ProviderLocation,
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
  TType extends
    | 'query'
    | 'wrapper'
    | 'with'
    | 'mapper'
    | 'head'
    | 'selfProps'
    | 'selfQuery'
    | 'errorComponent'
    | 'loadingComponent' =
    | 'query'
    | 'wrapper'
    | 'with'
    | 'mapper'
    | 'head'
    | 'selfProps'
    | 'selfQuery'
    | 'errorComponent'
    | 'loadingComponent',
> = TType extends 'query'
  ? {
      type: 'query'
      fn: QueryFn<any, any, any, any, any>
      unstableId: number
    }
  : TType extends 'selfQuery'
    ? { type: 'selfQuery'; unstableId: number }
    : TType extends 'wrapper'
      ? { type: 'wrapper'; Component: WrapperComponentType<any, any, any, any>; unstableId: number }
      : TType extends 'with'
        ? { type: 'with'; fn: WithFn<any, any, any, any>; unstableId: number }
        : TType extends 'mapper'
          ? { type: 'mapper'; fn: MapperFn<any, any, any, any, any>; unstableId: number }
          : TType extends 'selfProps'
            ? { type: 'selfProps'; unstableId: number }
            : TType extends 'head'
              ? { type: 'head'; fn: HeadFn<any, any, any, any, any>; unstableId: number }
              : TType extends 'errorComponent'
                ? {
                    type: 'errorComponent'
                    Component: ErrorComponentType<any>
                    variant: DestinationComponentVariant | undefined
                    unstableId: number
                  }
                : TType extends 'loadingComponent'
                  ? {
                      type: 'loadingComponent'
                      Component: LoadingComponentType<any>
                      variant: DestinationComponentVariant | undefined
                      unstableId: number
                    }
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
> = IfAnyThenElse<
  TQueries | TPointType | TServerLoaderOutput | TClientLoaderOutput | TPointType,
  any,
  IsQueryShouldBeFinalized<TPointType, TLetsEndPointType> extends true
    ? [...TQueries, UsePointQueryResult<'query', TServerLoaderOutput, TClientLoaderOutput>]
    : TQueries
>
export type MergeQueries<TQueries extends Queries, TNewQueries extends Queries> = IfAnyThenElse<
  TQueries | TNewQueries,
  any,
  [...TQueries, ...TNewQueries]
>
export type AppendQueries<TQueries extends Queries, TNewQuery extends UseQueryOrInfiniteQueryResult> = IfAnyThenElse<
  TQueries | TNewQuery,
  any,
  [...TQueries, TNewQuery]
>

// TODO:ASAP cancel it, in mountable we have no response loaders
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

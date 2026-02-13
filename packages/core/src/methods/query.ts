import type { Error0 } from '@devp0nt/error0'
import type {
  IsQueryShouldBeFinalized,
  MountableLocation,
  Props,
  QueriesDefinitions,
  QueriesDefinitionsByQueries,
  QueryDefinitionByQuery,
  UseQueryOrInfiniteQueryResult,
  WithFnOptions,
  WithQueryFn,
  WithSelfQueryIfShouldBeFinalized,
} from '../mountable.js'
import type {
  Ctx,
  CtxExposedKeys,
  Data,
  ExtraUseQueryOptions,
  FinalLoaderData,
  FinalLoaderOutput,
  InputSchema,
  LoaderOutput,
  MapperOutput,
  MountablePointType,
  NiceQueryReadyPoint,
  NiceReadyPoint,
  NiceStagePoint,
  PointType,
  QueryKey,
  QueryResultType,
  ReadyPointType,
  ReadyPointTypeOrNever,
  RequiredCtx,
  RouteDefinition,
  ShowError,
  StagePointTypeOrNever,
  UndefinedCtxExposedKeys,
  UndefinedInputSchema,
  UndefinedLoaderOutput,
  UndefinedMapperOutput,
  UndefinedQueryResultType,
  UndefinedReadyPointType,
  UndefinedRouteDefinition,
} from '../types.js'

// we have this method separated, becouse of types conflict for different lets end point types

export type MethodQueryForAnyPoint<
  TPointType extends PointType,
  TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
> = TLetsReadyPointType extends 'query'
  ? MethodQueryForQueryPoint<
      TPointType,
      TLetsReadyPointType,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >
  : MethodQueryForNonQueryPoint<
      TPointType,
      TLetsReadyPointType,
      TRequiredCtx,
      TCtx,
      TCtxExposedKeys,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TMapperOutput,
      TRouteDefinition,
      TServerInputSchema,
      TClientInputSchema,
      TQueryResultType,
      TOuterProps,
      TInnerProps,
      TQueriesDefinitions
    >

export type MethodQueryForQueryPoint<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TPointType extends PointType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
> = {
  // eslint-disable-next-line @typescript-eslint/prefer-function-type
  (
    ...args: FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Data
      ? [
          queryOptions?: ExtraUseQueryOptions<
            FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
            Error0,
            FinalLoaderData<TServerLoaderOutput, TClientLoaderOutput>,
            QueryKey
          >,
        ]
      : FinalLoaderOutput<TServerLoaderOutput, TClientLoaderOutput> extends Response
        ? [ShowError<`Query can not return response. Last loader should provide plain object data, not response.`>]
        : [ShowError<`Point has no loaders. Please add .loader() or .clientLoader() before calling .query()`>]
  ): NiceQueryReadyPoint<
    'query',
    undefined,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    'query',
    TOuterProps,
    TInnerProps,
    TQueriesDefinitions
  >
}

export type MethodQueryForNonQueryPoint<
  TPointType extends PointType,
  TLetsReadyPointType extends ReadyPointType | UndefinedReadyPointType,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TCtxExposedKeys extends CtxExposedKeys | UndefinedCtxExposedKeys,
  TServerLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TClientLoaderOutput extends LoaderOutput | UndefinedLoaderOutput,
  TMapperOutput extends MapperOutput | UndefinedMapperOutput,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TServerInputSchema extends InputSchema | UndefinedInputSchema,
  TClientInputSchema extends InputSchema | UndefinedInputSchema,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TOuterProps extends Props,
  TInnerProps extends Props,
  TQueriesDefinitions extends QueriesDefinitions,
> = {
  <
    TPoint extends NiceReadyPoint<
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      'infiniteQuery' | 'query',
      any,
      any,
      any
    >,
  >(
    point: TPoint,
    input:
      | TPoint['Infer']['InputRaw']
      | ((
          options: WithFnOptions<
            MountableLocation<TLetsReadyPointType, TRouteDefinition>,
            TInnerProps,
            WithSelfQueryIfShouldBeFinalized<
              TPointType,
              TLetsReadyPointType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TQueriesDefinitions
            >,
            TMapperOutput
          >,
        ) => TPoint['Infer']['InputRaw']),
    queryOptions?: TPoint['Infer']['UseQueryOptions'],
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    [
      ...WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      {
        type: TPoint['Infer']['QueryResultType'] extends 'infiniteQuery' ? 'infiniteQuery' : 'query'
        data: TPoint['Infer']['QueriedData']
      },
    ]
  >

  <
    TPoint extends NiceReadyPoint<
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      'infiniteQuery' | 'query',
      any,
      any,
      any
    >,
  >(
    ...args: TLetsReadyPointType extends MountablePointType
      ? [
          point: TPoint &
            (TPoint['Infer']['IsInputOptional'] extends true
              ? unknown
              : Record<`Input as second argument is required`, `Input as second argument is required`>),
        ]
      : never
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    [
      ...WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      {
        type: TPoint['Infer']['QueryResultType'] extends 'infiniteQuery' ? 'infiniteQuery' : 'query'
        data: TPoint['Infer']['QueriedData']
      },
    ]
  >

  <TNewQueries extends UseQueryOrInfiniteQueryResult | UseQueryOrInfiniteQueryResult[]>(
    ...args: TLetsReadyPointType extends MountablePointType
      ? [
          queryFn: WithQueryFn<
            MountableLocation<TLetsReadyPointType, TRouteDefinition>,
            TInnerProps,
            WithSelfQueryIfShouldBeFinalized<
              TPointType,
              TLetsReadyPointType,
              TServerLoaderOutput,
              TClientLoaderOutput,
              TQueriesDefinitions
            >,
            TMapperOutput,
            TNewQueries
          >,
        ]
      : never
  ): NiceStagePoint<
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true
      ? 'finalStage'
      : StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    TCtx,
    TCtxExposedKeys,
    TServerLoaderOutput,
    TClientLoaderOutput,
    TMapperOutput,
    TRouteDefinition,
    TServerInputSchema,
    TClientInputSchema,
    IsQueryShouldBeFinalized<TPointType, TLetsReadyPointType> extends true ? 'query' : TQueryResultType,
    TOuterProps,
    TInnerProps,
    [
      ...WithSelfQueryIfShouldBeFinalized<
        TPointType,
        TLetsReadyPointType,
        TServerLoaderOutput,
        TClientLoaderOutput,
        TQueriesDefinitions
      >,
      ...(TNewQueries extends UseQueryOrInfiniteQueryResult
        ? [QueryDefinitionByQuery<TNewQueries>]
        : TNewQueries extends UseQueryOrInfiniteQueryResult[]
          ? QueriesDefinitionsByQueries<TNewQueries>
          : never),
    ]
  >
}

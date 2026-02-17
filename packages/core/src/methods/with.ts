import type {
  AppendProps,
  IsQueryShouldBeFinalized,
  MountableLocation,
  Props,
  QueriesDefinitions,
  QueriesDefinitionsByQueries,
  QueriesResults,
  QueryDefinitionByQuery,
  UseQueryOrInfiniteQueryResult,
  WithFn,
  WithFnOptions,
  WithPluginFn,
  WithPluginFnOptions,
  WithPluginQueryFn,
  WithQueryFn,
  WithSelfQueryIfShouldBeFinalized,
} from '../mountable.js'
import type {
  Ctx,
  CtxExposedKeys,
  InputSchema,
  LoaderOutput,
  MapperOutput,
  MountablePointType,
  NiceReadyPoint,
  NiceStagePoint,
  PointType,
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

export type MethodWith<
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
    ...args: TLetsReadyPointType extends MountablePointType
      ? [
          // point: TPoint &
          //   (TPoint['Infer']['IsInputOptional'] extends true
          //     ? unknown
          //     : Record<`Input as second argument is required`, `Input as second argument is required`>),
          point: TPoint,
          ...rest: TPoint['Infer']['IsInputOptional'] extends true
            ? [
                input?:
                  | TPoint['Infer']['InputRawOrUndefined']
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
                    ) => TPoint['Infer']['InputRawOrUndefined']),
                queryOptions?: TPoint['Infer']['UseQueryOptions'],
              ]
            : [
                input:
                  | TPoint['Infer']['InputRawOrUndefined']
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
                    ) => TPoint['Infer']['InputRawOrUndefined']),
                queryOptions?: TPoint['Infer']['UseQueryOptions'],
              ],
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
  <TNewQueries extends UseQueryOrInfiniteQueryResult | QueriesResults>(
    withQueryFn: WithQueryFn<
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
      // ...(TNewQueries extends UseQueryOrInfiniteQueryResult
      //   ? [QueryDefinitionByQuery<TNewQueries>]
      //   : TNewQueries extends UseQueryOrInfiniteQueryResult[]
      //     ? QueriesDefinitionsByQueries<TNewQueries>
      //     : never),
      ...(TNewQueries extends QueriesResults
        ? QueriesDefinitionsByQueries<TNewQueries>
        : TNewQueries extends UseQueryOrInfiniteQueryResult
          ? [QueryDefinitionByQuery<TNewQueries>]
          : never),
    ]
  >
  <TNewInnerProps extends Props>(
    withFn: WithFn<
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
      TNewInnerProps
    > &
      (TNewInnerProps extends UseQueryOrInfiniteQueryResult[]
        ? ShowError<`To return array of queries add as const after array like return [q1, q2] as const`>
        : unknown),
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
    AppendProps<TInnerProps, TNewInnerProps>,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
}

export type MethodPluginWith<
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
    ...args: TLetsReadyPointType extends MountablePointType
      ? [
          // point: TPoint &
          //   (TPoint['Infer']['IsInputOptional'] extends true
          //     ? unknown
          //     : Record<`Input as second argument is required`, `Input as second argument is required`>),
          point: TPoint,
          ...rest: TPoint['Infer']['IsInputOptional'] extends true
            ? [
                input?:
                  | TPoint['Infer']['InputRawOrUndefined']
                  | ((options: WithPluginFnOptions) => TPoint['Infer']['InputRawOrUndefined']),
                queryOptions?: TPoint['Infer']['UseQueryOptions'],
              ]
            : [
                input:
                  | TPoint['Infer']['InputRawOrUndefined']
                  | ((options: WithPluginFnOptions) => TPoint['Infer']['InputRawOrUndefined']),
                queryOptions?: TPoint['Infer']['UseQueryOptions'],
              ],
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
  <TNewQueries extends UseQueryOrInfiniteQueryResult | QueriesResults>(
    withQueryFn: WithPluginQueryFn<TNewQueries>,
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
      // ...(TNewQueries extends UseQueryOrInfiniteQueryResult
      //   ? [QueryDefinitionByQuery<TNewQueries>]
      //   : TNewQueries extends UseQueryOrInfiniteQueryResult[]
      //     ? QueriesDefinitionsByQueries<TNewQueries>
      //     : never),
      ...(TNewQueries extends QueriesResults
        ? QueriesDefinitionsByQueries<TNewQueries>
        : TNewQueries extends UseQueryOrInfiniteQueryResult
          ? [QueryDefinitionByQuery<TNewQueries>]
          : never),
    ]
  >
  <TNewInnerProps extends Props>(
    withFn: WithPluginFn<TNewInnerProps> &
      (TNewInnerProps extends UseQueryOrInfiniteQueryResult[]
        ? ShowError<`To return array of queries add as const after array like return [q1, q2] as const`>
        : unknown),
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
    AppendProps<TInnerProps, TNewInnerProps>,
    WithSelfQueryIfShouldBeFinalized<
      TPointType,
      TLetsReadyPointType,
      TServerLoaderOutput,
      TClientLoaderOutput,
      TQueriesDefinitions
    >
  >
}

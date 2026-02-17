import type { Props, QueriesDefinitions } from '../mountable.js'
import type {
  AppendCtx,
  AppendCtxExposedKeys,
  AssertNoForbiddenCtxExposedKeys,
  AssertNoForbiddenMethodsIfNotSuitableStage,
  Ctx,
  CtxExposedKeys,
  CtxFn,
  CtxPluginFn,
  InferCtxFnOutputCtxAppend,
  InferCtxFnOutputCtxExposedKeys,
  InferCtxPluginFnOutputCtxAppend,
  InferCtxPluginFnOutputCtxExposedKeys,
  InputSchema,
  LoaderOutput,
  MapperOutput,
  NiceStagePoint,
  PointType,
  QueryResultType,
  ReadyPointType,
  ReadyPointTypeOrNever,
  RequiredCtx,
  RouteDefinition,
  StagePointTypeOrNever,
  UndefinedCtxExposedKeys,
  UndefinedInputSchema,
  UndefinedLoaderOutput,
  UndefinedMapperOutput,
  UndefinedQueryResultType,
  UndefinedReadyPointType,
  UndefinedRouteDefinition,
} from '../types.js'

export type MethodAnyCtx<
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
  <TCtxFn extends CtxFn<TCtx, TCtxExposedKeys, TServerInputSchema, Ctx>>(
    ctxFn: TCtxFn &
      AssertNoForbiddenCtxExposedKeys<InferCtxFnOutputCtxExposedKeys<TCtxFn>> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, InferCtxFnOutputCtxAppend<TCtxFn>>,
    AppendCtxExposedKeys<TCtxExposedKeys, InferCtxFnOutputCtxExposedKeys<TCtxFn>>,
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
  <TAppendCtx extends Ctx>(
    ctx: [TAppendCtx] &
      AssertNoForbiddenCtxExposedKeys<Extract<keyof TAppendCtx, string>> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
    AppendCtxExposedKeys<TCtxExposedKeys, Extract<keyof TAppendCtx, string>>,
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
  <TAppendCtx extends Ctx, TAppendCtxExposedKeys extends Extract<keyof TAppendCtx, string>>(
    ctx: [TAppendCtx, ...TAppendCtxExposedKeys[]] &
      AssertNoForbiddenCtxExposedKeys<TAppendCtxExposedKeys> &
      AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
    AppendCtxExposedKeys<TCtxExposedKeys, TAppendCtxExposedKeys>,
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
  <TAppendCtx extends Ctx>(
    ctx: TAppendCtx & AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
  ): NiceStagePoint<
    StagePointTypeOrNever<TPointType>,
    ReadyPointTypeOrNever<TLetsReadyPointType>,
    TRequiredCtx,
    AppendCtx<TCtx, TAppendCtx>,
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
}

export type MethodCtx<
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
> = (<TCtxFn extends CtxFn<TCtx, TCtxExposedKeys, TServerInputSchema, Ctx>>(
  ctxFn: TCtxFn &
    AssertNoForbiddenCtxExposedKeys<InferCtxFnOutputCtxExposedKeys<TCtxFn>> &
    AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
) => NiceStagePoint<
  StagePointTypeOrNever<TPointType>,
  ReadyPointTypeOrNever<TLetsReadyPointType>,
  TRequiredCtx,
  AppendCtx<TCtx, InferCtxFnOutputCtxAppend<TCtxFn>>,
  AppendCtxExposedKeys<TCtxExposedKeys, InferCtxFnOutputCtxExposedKeys<TCtxFn>>,
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
>) &
  MethodAnyCtx<
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

export type MethodPluginCtx<
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
> = (<TCtxPluginFn extends CtxPluginFn<Ctx>>(
  ctxFn: TCtxPluginFn &
    AssertNoForbiddenCtxExposedKeys<InferCtxPluginFnOutputCtxExposedKeys<TCtxPluginFn>> &
    AssertNoForbiddenMethodsIfNotSuitableStage<TPointType, 'ctx'>,
) => NiceStagePoint<
  StagePointTypeOrNever<TPointType>,
  ReadyPointTypeOrNever<TLetsReadyPointType>,
  TRequiredCtx,
  AppendCtx<TCtx, InferCtxPluginFnOutputCtxAppend<TCtxPluginFn>>,
  AppendCtxExposedKeys<TCtxExposedKeys, InferCtxPluginFnOutputCtxExposedKeys<TCtxPluginFn>>,
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
>) &
  MethodAnyCtx<
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

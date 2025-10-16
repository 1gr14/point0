import type { Route0 } from '@devp0nt/route0'
import type { AnyServerPage0, InferServerPageCtxOutput, InferServerPageDataOutput } from './server-page.js'
import type { Ctx, Data } from './shared.js'

export class ClientPage0<
  TServerPage0 extends AnyServerPage0,
  TCtxOutput extends Ctx = InferServerPageCtxOutput<TServerPage0>,
  TDataOutput extends Data = InferServerPageDataOutput<TServerPage0>,
> {
  extendFns: ExtendFnRecord[]

  constructor() {
    this.extendFns = []
  }

  ctx<TNewCtxOutput extends Ctx = Ctx>(
    ctxFn: CtxFn<TCtxOutput, TDataOutput, Route0.AnyRoute, TNewCtxOutput>,
  ): ClientPage0<TServerPage0, TNewCtxOutput, TDataOutput> {
    const newClientPage0 = new ClientPage0<TServerPage0, TNewCtxOutput, TDataOutput>()
    newClientPage0.extendFns.push(...this.extendFns, { type: 'ctx', fn: ctxFn as never })
    return newClientPage0
  }

  loader<TNewDataOutput extends Data = Data>(
    loaderFn: LoaderFn<TCtxOutput, TDataOutput, Route0.AnyRoute, TNewDataOutput>,
  ): ClientPage0<TServerPage0, TCtxOutput, TNewDataOutput> {
    const newClientPage0 = new ClientPage0<TServerPage0, TCtxOutput, TNewDataOutput>()
    newClientPage0.extendFns.push(...this.extendFns, { type: 'loader', fn: loaderFn as never })
    return newClientPage0
  }
}

export type CtxFnProps<
  TCtxInput extends Ctx = Ctx,
  TData extends Data = Data,
  TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
> = {
  ctx: TCtxInput
  data: TData
  location: Route0.Location<TRoute0>
}
export type CtxFn<
  TCtxInput extends Ctx = Ctx,
  TData extends Data = Data,
  TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
  TCtxOutput extends Ctx = Ctx,
> = (props: CtxFnProps<TCtxInput, TData, TRoute0>) => Promise<TCtxOutput> | TCtxOutput
export type CtxFnOutput<TCtxFn extends CtxFn> = Awaited<ReturnType<TCtxFn>>
export type InferCtxFnOutput<TCtxFn> = TCtxFn extends CtxFn<any, any, any, infer TCtxFnOutput> ? TCtxFnOutput : never

export type LoaderFnProps<
  TCtx extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
> = {
  ctx: TCtx
  data: TDataInput
  location: Route0.Location<TRoute0>
}
export type LoaderFn<
  TCtx extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
  TDataOutput extends Data = Data,
> = (props: LoaderFnProps<TCtx, TDataInput, TRoute0>) => Promise<TDataOutput> | TDataOutput
export type LoaderFnOutput<TLoader extends LoaderFn> = Awaited<ReturnType<TLoader>>

export type ExtendFnRecord<
  TType extends 'ctx' | 'loader' = 'ctx' | 'loader',
  TCtxInput extends Ctx = Ctx,
  TDataInput extends Data = Data,
  TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
  TOutput extends Ctx | Data = Ctx | Data,
> = TType extends 'ctx'
  ? { type: 'ctx'; fn: CtxFn<TCtxInput, TDataInput, TRoute0, TOutput> }
  : TType extends 'loader'
    ? { type: 'loader'; fn: LoaderFn<TCtxInput, TDataInput, TRoute0, TOutput> }
    : never

export type ResultSuccess<TOutput> = {
  error: undefined
  output: TOutput
}
export type ResultError = {
  error: Error
  output: undefined
}
export type Result<TOutput> = ResultSuccess<TOutput> | ResultError

export type PreapreFnOutput<TCtxOutput extends Ctx = Ctx, TDataOutput extends Data = Data> = {
  ctx: TCtxOutput
  data: TDataOutput
}
export type PreapreFnResult<TCtxOutput extends Ctx = Ctx, TDataOutput extends Data = Data> = Result<
  PreapreFnOutput<TCtxOutput, TDataOutput>
>

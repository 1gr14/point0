import { Route0 } from '@devp0nt/route0'
import cloneDeep from 'lodash/cloneDeep.js'

export class ServerPage0<
  TCtxInput extends Ctx = NeverCtx,
  TCtxOutput extends Ctx = NeverCtx,
  TDataOutput extends Data = EmptyData,
> {
  extendFns: ExtendFnRecord[]

  constructor() {
    this.extendFns = []
  }

  ctx<TNewCtxOutput extends Ctx = Ctx>(
    ctxFn: CtxFn<TCtxOutput, TDataOutput, Route0.AnyRoute, TNewCtxOutput>,
  ): ServerPage0<TCtxInput, TNewCtxOutput, TDataOutput> {
    const newServerPage0 = new ServerPage0<TCtxInput, TNewCtxOutput, TDataOutput>()
    newServerPage0.extendFns.push(...this.extendFns, { type: 'ctx', fn: ctxFn as never })
    return newServerPage0
  }

  loader<TNewDataOutput extends Data = Data>(
    loaderFn: LoaderFn<TCtxOutput, TDataOutput, Route0.AnyRoute, TNewDataOutput>,
  ): ServerPage0<TCtxInput, TCtxOutput, TNewDataOutput> {
    const newServerPage0 = new ServerPage0<TCtxInput, TCtxOutput, TNewDataOutput>()
    newServerPage0.extendFns.push(...this.extendFns, { type: 'loader', fn: loaderFn as never })
    return newServerPage0
  }

  async prepare(url: string): Promise<PreapreFnResult<TCtxOutput, TDataOutput>>
  async prepare(url: string, ctx: TCtxInput): Promise<PreapreFnResult<TCtxOutput, TDataOutput>>
  async prepare(url: string, ctx?: TCtxInput): Promise<PreapreFnResult<TCtxOutput, TDataOutput>> {
    let ctxOutput: Ctx = {}
    let dataOutput: Data = {}

    try {
      const location = Route0.getLocation(url)
      for (const extendFn of this.extendFns) {
        const ctxOutputCloned = cloneDeep(ctxOutput)
        switch (extendFn.type) {
          case 'ctx':
            ctxOutput = await extendFn.fn({ ctx: ctxOutputCloned, data: dataOutput, location })
            break
          case 'loader':
            dataOutput = await extendFn.fn({ ctx: ctxOutputCloned, data: dataOutput, location })
            break
          // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
          default:
            throw new Error(`Unknown extend function type: ${(extendFn as any).type}`)
        }
      }
    } catch (error) {
      return { error: error as Error, output: undefined }
    }

    return {
      output: { ctx: ctxOutput as TCtxOutput, data: dataOutput as TDataOutput },
      error: undefined,
    }
  }
}

export type UnknownCtx = Record<string, unknown>
export type NeverCtx = Record<never, never>
export type Ctx = UnknownCtx | NeverCtx
export type UnknownData = Record<string, unknown>
export type EmptyData = Record<never, never>
export type Data = UnknownData | EmptyData

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

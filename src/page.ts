// import { Route0 } from '@devp0nt/route0'
// import type { Ctx, Data, RequiredCtx, UndefinedCtx, EmptyCtx, EmptyData } from './shared.js'

// export class Page0<
//   TCtxRequired extends RequiredCtx = UndefinedCtx,
//   TCtxOutput extends Ctx = TCtxRequired extends UndefinedCtx ? EmptyCtx : TCtxRequired,
//   TDataOutput extends Data = EmptyData,
// > {
//   extendFns: ExtendFnRecord[]

//   constructor() {
//     this.extendFns = []
//   }

//   ctx<TNewCtxOutput extends Ctx = Ctx>(
//     ctxFn: CtxFn<TCtxOutput, TDataOutput, Route0.AnyRoute, TNewCtxOutput>,
//   ): ServerPage0<TCtxRequired, TNewCtxOutput, TDataOutput> {
//     const newServerPage0 = new ServerPage0<TCtxRequired, TNewCtxOutput, TDataOutput>()
//     newServerPage0.extendFns.push(...this.extendFns, { type: 'ctx', fn: ctxFn as never })
//     return newServerPage0
//   }

//   loader<TNewDataOutput extends Data = Data>(
//     loaderFn: LoaderFn<TCtxOutput, TDataOutput, Route0.AnyRoute, TNewDataOutput>,
//   ): ServerPage0<TCtxRequired, TCtxOutput, TNewDataOutput> {
//     const newServerPage0 = new ServerPage0<TCtxRequired, TCtxOutput, TNewDataOutput>()
//     newServerPage0.extendFns.push(...this.extendFns, { type: 'loader', fn: loaderFn as never })
//     return newServerPage0
//   }
//   async prepare(
//     ...args: TCtxRequired extends Ctx ? [url: string, ctx: TCtxRequired] : [url: string]
//   ): Promise<PreapreFnResult<TCtxOutput, TDataOutput>> {
//     const [url, requiredCtx] = args as [string, Ctx | undefined]
//     let ctxOutput: Ctx = requiredCtx || {}
//     let dataOutput: Data = {}

//     try {
//       const location = Route0.getLocation(url)
//       for (const extendFn of this.extendFns) {
//         switch (extendFn.type) {
//           case 'ctx':
//             ctxOutput = await extendFn.fn({ ctx: { ...ctxOutput }, data: { ...dataOutput }, location })
//             break
//           case 'loader':
//             dataOutput = await extendFn.fn({ ctx: { ...ctxOutput }, data: { ...dataOutput }, location })
//             break
//           // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
//           default:
//             throw new Error(`Unknown extend function type: ${(extendFn as any).type}`)
//         }
//       }
//     } catch (error) {
//       return { error: error as Error, output: undefined }
//     }

//     return {
//       output: { ctx: ctxOutput as TCtxOutput, data: dataOutput as TDataOutput },
//       error: undefined,
//     }
//   }
// }

// export type AnyServerPage0<
//   TCtxRequired extends RequiredCtx = RequiredCtx,
//   TCtxOutput extends Ctx = Ctx,
//   TDataOutput extends Data = Data,
// > = ServerPage0<TCtxRequired, TCtxOutput, TDataOutput>

// export type CtxFnProps<
//   TCtxInput extends Ctx = Ctx,
//   TData extends Data = Data,
//   TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
// > = {
//   ctx: TCtxInput
//   data: TData
//   location: Route0.Location<TRoute0>
// }
// export type CtxFn<
//   TCtxInput extends Ctx = Ctx,
//   TData extends Data = Data,
//   TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
//   TCtxOutput extends Ctx = Ctx,
// > = (props: CtxFnProps<TCtxInput, TData, TRoute0>) => Promise<TCtxOutput> | TCtxOutput
// export type CtxFnOutput<TCtxFn extends CtxFn> = Awaited<ReturnType<TCtxFn>>
// export type InferCtxFnOutput<TCtxFn> = TCtxFn extends CtxFn<any, any, any, infer TCtxFnOutput> ? TCtxFnOutput : never

// export type LoaderFnProps<
//   TCtx extends Ctx = Ctx,
//   TDataInput extends Data = Data,
//   TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
// > = {
//   ctx: TCtx
//   data: TDataInput
//   location: Route0.Location<TRoute0>
// }
// export type LoaderFn<
//   TCtx extends Ctx = Ctx,
//   TDataInput extends Data = Data,
//   TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
//   TDataOutput extends Data = Data,
// > = (props: LoaderFnProps<TCtx, TDataInput, TRoute0>) => Promise<TDataOutput> | TDataOutput
// export type LoaderFnOutput<TLoader extends LoaderFn> = Awaited<ReturnType<TLoader>>

// export type ExtendFnRecord<
//   TType extends 'ctx' | 'loader' = 'ctx' | 'loader',
//   TCtxInput extends Ctx = Ctx,
//   TDataInput extends Data = Data,
//   TRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
//   TOutput extends Ctx | Data = Ctx | Data,
// > = TType extends 'ctx'
//   ? { type: 'ctx'; fn: CtxFn<TCtxInput, TDataInput, TRoute0, TOutput> }
//   : TType extends 'loader'
//     ? { type: 'loader'; fn: LoaderFn<TCtxInput, TDataInput, TRoute0, TOutput> }
//     : never

// export type ResultSuccess<TOutput> = {
//   error: undefined
//   output: TOutput
// }
// export type ResultError = {
//   error: Error
//   output: undefined
// }
// export type Result<TOutput> = ResultSuccess<TOutput> | ResultError

// export type PreapreFnOutput<TCtxOutput extends Ctx = Ctx, TDataOutput extends Data = Data> = {
//   ctx: TCtxOutput
//   data: TDataOutput
// }
// export type PreapreFnResult<TCtxOutput extends Ctx = Ctx, TDataOutput extends Data = Data> = Result<
//   PreapreFnOutput<TCtxOutput, TDataOutput>
// >

// export type InferServerPageCtxOutput<TServerPage0 extends AnyServerPage0> =
//   TServerPage0 extends AnyServerPage0<any, infer TCtxOutput, any> ? TCtxOutput : never
// export type InferServerPageDataOutput<TServerPage0 extends AnyServerPage0> =
//   TServerPage0 extends AnyServerPage0<any, any, infer TDataOutput> ? TDataOutput : never

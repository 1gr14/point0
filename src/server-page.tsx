import type { Route0 } from '@devp0nt/route0'
import type { AnyClientPage0, ClientPages0 } from './client-page.js'
import { ClientPage0 } from './client-page.js'
import type {
  Ctx,
  CtxFn,
  Data,
  EmptyCtx,
  EmptyData,
  ExtendFnRecord,
  LoaderFn,
  RequiredCtx,
  UndefinedCtx,
} from './types.js'
import { renderToStaticMarkup } from 'react-dom/server'

export class ServerPage0<
  TCtxRequired extends RequiredCtx = UndefinedCtx,
  TCtxOutput extends Ctx = TCtxRequired extends UndefinedCtx ? EmptyCtx : TCtxRequired,
  TDataOutput extends Data = EmptyData,
> {
  _extendFns: ExtendFnRecord[]

  constructor() {
    this._extendFns = []
  }

  ctx<TNewCtxOutput extends Ctx = Ctx>(
    ctxFn: CtxFn<TCtxOutput, TDataOutput, Route0.AnyRoute, TNewCtxOutput>,
  ): ServerPage0<TCtxRequired, TNewCtxOutput, TDataOutput> {
    const newServerPage0 = new ServerPage0<TCtxRequired, TNewCtxOutput, TDataOutput>()
    newServerPage0._extendFns.push(...this._extendFns, { type: 'ctx', fn: ctxFn as never })
    return newServerPage0
  }

  loader<TNewDataOutput extends Data = Data>(
    loaderFn: LoaderFn<TCtxOutput, TDataOutput, Route0.AnyRoute, TNewDataOutput>,
  ): ServerPage0<TCtxRequired, TCtxOutput, TNewDataOutput> {
    const newServerPage0 = new ServerPage0<TCtxRequired, TCtxOutput, TNewDataOutput>()
    newServerPage0._extendFns.push(...this._extendFns, { type: 'loader', fn: loaderFn as never })
    return newServerPage0
  }

  async _runCtxAndLoaderFns({
    location,
    clientPage0,
    requiredCtx,
  }: {
    location: Route0.Location
    clientPage0: AnyClientPage0
    requiredCtx?: Ctx
  }): Promise<{ ctx: TCtxOutput; data: TDataOutput }> {
    let ctxOutput: Ctx = requiredCtx ?? {}
    let dataOutput: Data = {}
    const extendFns = [...this._extendFns, ...clientPage0.getExtendFns()]

    for (const extendFn of extendFns) {
      switch (extendFn.type) {
        case 'ctx':
          ctxOutput = await extendFn.fn({ ctx: { ...ctxOutput }, data: { ...dataOutput }, location })
          break
        case 'loader':
          dataOutput = await extendFn.fn({ ctx: { ...ctxOutput }, data: { ...dataOutput }, location })
          break
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        default:
          throw new Error(`Unknown extend function type: ${(extendFn as any).type}`)
      }
    }

    return { ctx: ctxOutput as TCtxOutput, data: dataOutput as TDataOutput }
  }

  async _getReactNode({
    location,
    clientPage0,
    requiredCtx,
  }: {
    location: Route0.Location
    clientPage0: AnyClientPage0
    requiredCtx?: Ctx | UndefinedCtx
  }): Promise<{ data: TDataOutput; ctx: TCtxOutput; reactNode: React.ReactNode }> {
    // TODO: what to do with ctx? Can I pass it to the component?
    // If there prisma for exmaple, but make it available only during server rendering?
    // Maybe first run with ctx, then get all data of useCtx returns, and then run again with just data outputs

    const { data, ctx } = await this._runCtxAndLoaderFns({
      location,
      clientPage0,
      requiredCtx,
    })
    const PageComponent = clientPage0.getComponent()
    return { data, ctx, reactNode: <PageComponent data={data} location={location} /> }
  }

  async _getSuitableReactNode({
    url,
    clientPages0,
    requiredCtx,
  }: {
    url: string
    clientPages0: ClientPages0
    requiredCtx?: Ctx | UndefinedCtx
  }): Promise<{ data: TDataOutput; ctx: TCtxOutput; reactNode: React.ReactNode }> {
    for (const [route, clientPage0Getter] of clientPages0) {
      const match = route.match(url)
      if (!match.exact) {
        continue
      }
      const clientPage0 = clientPage0Getter instanceof ClientPage0 ? clientPage0Getter : await clientPage0Getter()
      return await this._getReactNode({ location: match.location, clientPage0, requiredCtx })
    }
    throw new Error(`Page not found for url: ${url}`)
  }

  async render({
    url,
    clientPages0,
    requiredCtx,
  }: TCtxRequired extends Ctx
    ? {
        url: string
        clientPages0: ClientPages0
        requiredCtx: TCtxRequired
      }
    : {
        url: string
        clientPages0: ClientPages0
        requiredCtx?: undefined
      }): Promise<{
    html: string
    data: TDataOutput
    ctx: TCtxOutput
  }> {
    const { reactNode, data, ctx } = await this._getSuitableReactNode({ url, clientPages0, requiredCtx })
    return { html: renderToStaticMarkup(reactNode), data, ctx }
    // TODO: I DO NOT WHAT TO DO NEXT? I THINK I NEED ANOTHER FILE FOR FINAL SSR RENDERING
    // AND BUN TESTS
  }
}

export type AnyServerPage0<
  TCtxRequired extends RequiredCtx = RequiredCtx,
  TCtxOutput extends Ctx = Ctx,
  TDataOutput extends Data = Data,
> = ServerPage0<TCtxRequired, TCtxOutput, TDataOutput>

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

export type InferServerPageCtxOutput<TServerPage0 extends AnyServerPage0> =
  TServerPage0 extends AnyServerPage0<any, infer TCtxOutput, any> ? TCtxOutput : never
export type InferServerPageDataOutput<TServerPage0 extends AnyServerPage0> =
  TServerPage0 extends AnyServerPage0<any, any, infer TDataOutput> ? TDataOutput : never

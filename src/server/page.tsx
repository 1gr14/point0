import type { Route0 } from '@devp0nt/route0'
import type { AnyClientPage0, ClientPages0 } from '../client/page.js'
import { ClientPage0 } from '../client/page.js'
import type {
  Ctx,
  CtxFn,
  Data,
  EmptyCtx,
  EmptyData,
  ExtendFnRecord,
  LoaderFn,
  // ReadableStreamRenderer,
  RequiredCtx,
  StaticRenderer,
  UndefinedCtx,
} from '../shared/types.js'
import { renderDocumentHtml } from './html.js'
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
    clientPage0?: AnyClientPage0 | undefined
    requiredCtx?: Ctx
  }): Promise<{ ctx: TCtxOutput; data: TDataOutput }> {
    let ctxOutput: Ctx = requiredCtx ?? {}
    let dataOutput: Data = {}
    const extendFns = [...this._extendFns, ...(clientPage0?.getExtendFns() ?? [])]

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

  async _getSuitableNode({
    path,
    clientPages0,
    requiredCtx,
  }: {
    path: string
    clientPages0: ClientPages0
    requiredCtx?: Ctx | UndefinedCtx
  }): Promise<{
    data: TDataOutput
    ctx: TCtxOutput
    reactNode: React.ReactNode
    location: Route0.Location
    clientPage0: AnyClientPage0 | undefined
  }> {
    const { location, clientPage0 } = await ClientPage0._getSuitable({ path, clientPages0 })
    const { data, ctx } = await this._runCtxAndLoaderFns({
      location,
      clientPage0,
      requiredCtx,
    })
    const reactNode = (() => {
      if (!clientPage0) {
        return undefined
      }
      const PageComponent = clientPage0.getComponent()
      return <PageComponent data={data} location={location} />
    })()
    return { data, ctx, reactNode, location, clientPage0 }
  }

  async renderStatic({
    path,
    clientPages0,
    renderer = renderToStaticMarkup,
    clientBundlePath,
    ...restProps
  }: WithRequiredCtx<
    TCtxRequired,
    {
      renderer?: StaticRenderer
      path: string
      clientPages0: ClientPages0
      clientBundlePath: string
    }
  >): Promise<string> {
    let location: Route0.Location | undefined
    let clientPage0: AnyClientPage0 | undefined
    let data: Data = {}
    // eslint-disable-next-line no-useless-catch
    try {
      const suitable = await ClientPage0._getSuitable({ path, clientPages0 })
      location = suitable.location
      clientPage0 = suitable.clientPage0
      const runResult = await this._runCtxAndLoaderFns({
        location,
        clientPage0,
        requiredCtx: restProps.requiredCtx,
      })
      data = runResult.data
      const reactNode = (() => {
        if (!clientPage0) {
          // TODO: use provided errors
          return <div>Page not found</div>
        }
        const PageComponent = clientPage0.getComponent()
        return <PageComponent data={data} location={location} />
      })()
      const pageHtml = renderer(reactNode)
      const payload = { location, data }
      // TODO: use provided meta
      return renderDocumentHtml({ meta: { title: 'Hello, world!' }, pageHtml, payload, clientBundlePath })
    } catch (error) {
      throw error
      // TODO: use provided errors
      // console.error(error)
      // const pageHtml = renderer(<div>Error: {(error as any).message}</div>)
      // return renderDocumentHtml({
      //   meta: { title: 'Hello, world!' },
      //   pageHtml,
      //   payload: { location: location as never, data },
      //   clientBundlePath,
      // })
    }
  }

  // TODO: figure out how to render readable stream
  // async renderReadableStream({
  //   url,
  //   clientPages0,
  //   renderer,
  //   ...restProps
  // }: {
  //   renderer: ReadableStreamRenderer
  //   url: string
  //   clientPages0: ClientPages0
  // } & WithRequiredCtx<TCtxRequired>): Promise<{
  //   readableStream: ReadableStream<string>
  //   data: TDataOutput
  //   ctx: TCtxOutput
  // }> {
  //   const { data, ctx, reactNode } = await this._getSuitableNode({
  //     url,
  //     clientPages0,
  //     requiredCtx: 'requiredCtx' in restProps ? restProps.requiredCtx : undefined,
  //   })
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   const readableStream = renderer(reactNode)
  //   throw new Error('Not implemented')
  // }
}

export type AnyServerPage0<
  TCtxRequired extends RequiredCtx = RequiredCtx,
  TCtxOutput extends Ctx = Ctx,
  TDataOutput extends Data = Data,
> = ServerPage0<TCtxRequired, TCtxOutput, TDataOutput>

export type WithRequiredCtx<TCtxRequired extends RequiredCtx, TRest> = TCtxRequired extends Ctx
  ? {
      requiredCtx: TCtxRequired
    } & TRest
  : { requiredCtx?: undefined } & TRest

export type InferServerPageCtxOutput<TServerPage0 extends AnyServerPage0> =
  TServerPage0 extends AnyServerPage0<any, infer TCtxOutput, any> ? TCtxOutput : never
export type InferServerPageDataOutput<TServerPage0 extends AnyServerPage0> =
  TServerPage0 extends AnyServerPage0<any, any, infer TDataOutput> ? TDataOutput : never

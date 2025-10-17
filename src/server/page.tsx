import { Route0 } from '@devp0nt/route0'
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server'
import type { AnyClientPage0, ClientPages } from '../client/page.js'
import { ClientPage0 } from '../client/page.js'
import type {
  Ctx,
  CtxFn,
  Data,
  EmptyCtx,
  EmptyData,
  ExtendFnRecord,
  LoaderFn,
  Payload,
  ReadableStreamRenderer,
  RequiredCtx,
  StaticRenderer,
  UndefinedCtx,
} from '../shared/types.js'
import { renderDocumentHtml, renderDocumentHtmlPrefix, renderDocumentHtmlSuffix } from './html.js'

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
    routePath,
    clientPages,
    requiredCtx,
  }: {
    routePath: string
    clientPages: ClientPages
    requiredCtx?: Ctx | UndefinedCtx
  }): Promise<{
    data: TDataOutput
    ctx: TCtxOutput
    reactNode: React.ReactNode
    location: Route0.Location
    clientPage0: AnyClientPage0 | undefined
  }> {
    const { location, clientPage0 } = await ClientPage0._getSuitable({ routePath, clientPages })
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

  async renderNode({
    routePath,
    clientPages,
    requiredCtx,
  }: WithRequiredCtx<
    TCtxRequired,
    {
      routePath: string
      clientPages: ClientPages
    }
  >): Promise<{
    node: React.ReactNode
    payload: Payload
    clientPage0: AnyClientPage0 | undefined
    error: unknown
  }> {
    const location = Route0.getLocation(routePath)
    let clientPage0: AnyClientPage0 | undefined
    let data: Data = {}
    try {
      const suitable = await ClientPage0._getSuitable({ location, clientPages })
      clientPage0 = suitable.clientPage0 // may be undefined if not found
      const runResult = await this._runCtxAndLoaderFns({
        location,
        clientPage0,
        requiredCtx,
      })
      data = runResult.data
      const payload = { location, data, meta: { title: 'Hello, world!' } }
      if (!clientPage0) {
        // TODO: use provided errors
        const node = <div>Page not found</div>
        return { node, payload, clientPage0, error: new Error(`Page not found: ${location.pathname}`) }
      }
      const PageComponent = clientPage0.getComponent()
      const node = <PageComponent data={data} location={location} />
      // TODO: use provided meta
      return { node, payload, clientPage0, error: undefined }
    } catch (error) {
      // TODO: use provided errors
      const node = <div>Error: {(error as any).message}</div>
      const payload = { location, data, meta: { title: 'Error' } }
      return { node, payload, clientPage0, error }
    }
  }

  async renderStatic({
    routePath,
    clientPages,
    renderer = renderToStaticMarkup,
    clientBundlePath,
    requiredCtx,
  }: WithRequiredCtx<
    TCtxRequired,
    {
      renderer?: StaticRenderer
      routePath: string
      clientPages: ClientPages
      clientBundlePath?: string
    }
  >): Promise<{
    html: string
    payload: Payload
    node: React.ReactNode
    clientPage0: AnyClientPage0 | undefined
    error: unknown
  }> {
    const { node, payload, clientPage0, error } = await this.renderNode({
      routePath,
      clientPages,
      requiredCtx,
    } as WithRequiredCtx<TCtxRequired, { routePath: string; clientPages: ClientPages }>)
    const pageHtml = renderer(node)
    const html = renderDocumentHtml({ pageHtml, payload, clientBundlePath })
    return { html, payload, node, clientPage0, error }
  }

  async renderReadableStream({
    routePath,
    clientPages,
    renderer = renderToReadableStream,
    clientBundlePath,
    requiredCtx,
  }: WithRequiredCtx<
    TCtxRequired,
    {
      renderer?: ReadableStreamRenderer
      routePath: string
      clientPages: ClientPages
      clientBundlePath?: string
    }
  >): Promise<{
    readableStream: ReadableStream
    payload: Payload
    node: React.ReactNode
    clientPage0: AnyClientPage0 | undefined
    error: unknown
  }> {
    const { node, payload, clientPage0, error } = await this.renderNode({
      routePath,
      clientPages,
      requiredCtx,
    } as WithRequiredCtx<TCtxRequired, { routePath: string; clientPages: ClientPages }>)
    const prefix = renderDocumentHtmlPrefix({ payload })
    const suffix = renderDocumentHtmlSuffix({ clientBundlePath })
    const encoder = new TextEncoder()
    const transform = new TransformStream({
      start(controller) {
        controller.enqueue(encoder.encode(prefix))
      },
      transform(chunk, controller) {
        controller.enqueue(chunk)
      },
      flush(controller) {
        controller.enqueue(encoder.encode(suffix))
      },
    })
    const reactStream = await renderer(node)
    const readableStream = reactStream.pipeThrough(transform)
    return { readableStream, payload, node, clientPage0, error }
  }
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

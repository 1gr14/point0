import { Route0 } from '@devp0nt/route0'
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server'
import { ClientPage0, type AnyClientPage0, type PagesCollection } from '../client/page.js'
import type { Ctx, Data, Payload, ReadableStreamRenderer, StaticRenderer, UndefinedCtx } from '../shared/types.js'
import { renderDocumentHtml, renderDocumentHtmlPrefix, renderDocumentHtmlSuffix } from './html.js'
import { ServerPage0 } from './page.js'

export async function renderNode({
  requiredCtx,
  serverPage0,
  clientPage0,
  ...restProps
}: {
  serverPage0?: ServerPage0
  requiredCtx?: Ctx | UndefinedCtx
  clientPage0?: AnyClientPage0 | undefined
} & ({ routePath: string } | { location: Route0.Location })): Promise<{
  node: React.ReactNode
  status: number
  payload: Payload
  error: unknown
}> {
  const location = 'location' in restProps ? restProps.location : Route0.getLocation(restProps.routePath)
  let data: Data = {}
  try {
    const runResult = await ServerPage0.extract({
      location,
      serverPage0,
      clientPage0,
      requiredCtx,
    })
    data = runResult.data
    const payload = { location, data, meta: { title: 'Hello, world!' } }
    // TODO: add correct errornames, like no pacge compoentn, no end callback, etc
    const ClientPageComponent = clientPage0?.getComponent()
    const ServerPageComponent = undefined // serverPage0?.getComponent() TODO: combine them
    const PageComponent = ClientPageComponent ?? ServerPageComponent
    if (!PageComponent) {
      // TODO: use provided errors
      const node = <div>Page not found</div>
      return { node, payload, error: new Error(`Page not found: ${location.pathname}`), status: 404 }
    }
    const node = <PageComponent data={data} location={location} />
    // TODO: use provided meta
    return { node, payload, error: undefined, status: 200 }
  } catch (error) {
    // TODO: use provided errors
    const node = <div>Error: {(error as any).message}</div>
    const payload = { location, data, meta: { title: 'Error' } }
    return { node, payload, error, status: 500 }
  }
}

export async function renderSuitableNode({
  requiredCtx,
  serverPage0,
  pages,
  ...restProps
}: {
  serverPage0?: ServerPage0
  requiredCtx?: Ctx | UndefinedCtx
  pages: PagesCollection
} & ({ routePath: string } | { location: Route0.Location })): Promise<{
  node: React.ReactNode
  status: number
  payload: Payload
  error: unknown
}> {
  const { clientPage0, location } = await ClientPage0.getSuitable({ pages, ...restProps })
  return await renderNode({ serverPage0, clientPage0, requiredCtx, location })
}

export function renderStatic({
  node,
  payload,
  renderer = renderToStaticMarkup,
  clientBundlePath,
}: {
  node: React.ReactNode
  payload: Payload
  renderer?: StaticRenderer
  clientBundlePath: string
}): string {
  return renderDocumentHtml({ content: renderer(node), payload, clientBundlePath }).html
}

export async function getReadableStreamWithWrapper({
  node,
  prefix,
  suffix,
  renderer = renderToReadableStream,
  clientBundlePath,
}: {
  node: React.ReactNode
  suffix?: string
  prefix?: string
  clientBundlePath?: string
  renderer?: ReadableStreamRenderer
}) {
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
  const reactStream = await renderer(node, {
    ...(clientBundlePath ? { bootstrapModules: [clientBundlePath] } : {}),
  })
  return reactStream.pipeThrough(transform)
}

export async function renderReadableStream({
  node,
  payload,
  clientBundlePath,
  renderer = renderToReadableStream,
}: {
  node: React.ReactNode
  payload: Payload
  renderer?: ReadableStreamRenderer
  clientBundlePath?: string
}): Promise<ReadableStream> {
  const prefix = renderDocumentHtmlPrefix({ payload })
  const suffix = renderDocumentHtmlSuffix({ clientBundlePath: undefined })
  return await getReadableStreamWithWrapper({ node, prefix, suffix, renderer, clientBundlePath })
}

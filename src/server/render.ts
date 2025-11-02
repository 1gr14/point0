import type { AnyLocation } from '@devp0nt/route0'
import type { DehydratedState } from '@tanstack/react-query'
import { createHead, transformHtmlTemplate } from '@unhead/react/server'
import { createElement } from 'react'
import type { ReactDOMServerReadableStream, RenderToReadableStreamOptions } from 'react-dom/server'
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server'
import type { ResolvableHead } from 'unhead/types'
import type { EversionRun, Payload } from '../core/eversion.js'
import type { HydratedAppComponent } from '../core/hydrate.js'
import type { AnyPoint, InputRaw } from '../core/types.js'

export type StaticRenderer = (reactNode: React.ReactNode) => string
export type ReadableStreamRenderer = (
  reactNode: React.ReactNode,
  options?: RenderToReadableStreamOptions,
) => Promise<ReactDOMServerReadableStream>

export function escapeForInlineJSON(json: string) {
  return json
    .replace(/</g, '\\u003C')
    .replace(/-->/g, '\\u002D\\u002D\\u003E')
    .replace(/<\/script/gi, '\\u003C/script')
}

export function serializePayload(payload: Payload) {
  return escapeForInlineJSON(JSON.stringify(payload))
}

export function renderDocumentHtmlSuffix(props?: { clientBundlePath?: string }) {
  const { clientBundlePath } = props ?? {}
  return `</div>${
    clientBundlePath
      ? `
<script src="${clientBundlePath}" defer></script>`
      : ''
  }
</body>
</html>`
}

export type DocumentHtmlResult<TContent extends string | undefined> = {
  prefix: string
  content: TContent
  suffix: string
  html: string
}

export function fillRootElement({
  html,
  content,
  rootElementId = 'root',
  position = 'append',
}: {
  html: string
  content: string
  rootElementId?: string
  position?: 'append' | 'prepend'
}) {
  // Match <div ... id="root" ...> ... </div> without eating siblings
  const pattern = new RegExp(
    `<div\\b([^>]*?)\\bid=["']${rootElementId}["']([^>]*)>(.*?)</div>`,
    'is', // i = case-insensitive, s = dotAll (so . matches newlines)
  )
  const replacement = (_: string, before: string, after: string, inner: string) => {
    const newInner = position === 'prepend' ? `${content}${inner}` : `${inner}${content}`
    return `<div${before.trimEnd()} id="${rootElementId}"${after}>${newInner}</div>`
  }

  return html.replace(pattern, replacement)
}

function prependBodyElement({ html, content }: { html: string; content: string }) {
  // Match the <body> tag and capture its existing content
  const pattern = /<body\b[^>]*>([\s\S]*?)<\/body>/i

  const replacement = (match: string, inner: string) => {
    const newContent = `${content}${inner}` // prepend payload to the beginning of <body>
    return match.replace(inner, newContent)
  }

  return html.replace(pattern, replacement)
}

export async function overrideDocumentHtml<TContent extends string | undefined = undefined>({
  originalIndexHtml,
  content,
  dehydratedState,
  pageLocation,
  head,
  rootElementId,
  clientBundlePath,
}: {
  originalIndexHtml: string
  content?: TContent
  // TODO: make it choosable by settings
  dehydratedState: DehydratedState
  pageLocation: AnyLocation
  head: ResolvableHead[]
  rootElementId?: string
  clientBundlePath?: string
}): Promise<DocumentHtmlResult<TContent>> {
  const serializedPayload = serializePayload({ dehydratedState, location: pageLocation })

  let html = prependBodyElement({
    content: `<script id="__POINT0_PAYLOAD__" type="application/json">${serializedPayload}</script>`,
    html: originalIndexHtml,
  })
  if (clientBundlePath) {
    html = prependBodyElement({
      content: `<script src="${clientBundlePath}" defer></script>`,
      html,
    })
  }
  html = fillRootElement({
    content: content
      ? `<!-- __POINT0_TARGET_START__ -->${content}<!-- __POINT0_TARGET_END__ -->`
      : '<!-- __POINT0_TARGET__ -->',
    html,
    rootElementId,
  })
  if (head.length > 0) {
    html = await transformHtmlTemplate(createHead({ init: head }), html)
  }

  if (html.includes('<!-- __POINT0_TARGET__ -->')) {
    const [prefix, suffix] = html.split('<!-- __POINT0_TARGET__ -->')
    return { prefix, content: undefined as TContent, suffix, html: `${prefix}${suffix}` }
  } else if (html.includes('<!-- __POINT0_TARGET_START__ -->') && html.includes('<!-- __POINT0_TARGET_END__ -->')) {
    const prefix = html.split('<!-- __POINT0_TARGET_START__ -->')[0]
    const suffix = html.split('<!-- __POINT0_TARGET_END__ -->')[1]
    const content = html
      .replace(prefix, '')
      .replace(suffix, '')
      .replace('<!-- __POINT0_TARGET_START__ -->', '')
      .replace('<!-- __POINT0_TARGET_END__ -->', '')
    return { prefix, content: content as TContent, suffix, html: `${prefix}${content}${suffix}` }
  } else {
    throw new Error('<!-- __POINT0_TARGET__ --> not found')
  }
}

export async function renderStatic({
  element,
  dehydratedState,
  head,
  pageLocation,
  renderer = renderToStaticMarkup,
  clientBundlePath,
  originalIndexHtml,
  rootElementId,
}: {
  element: React.ReactElement
  dehydratedState: DehydratedState
  pageLocation: AnyLocation
  head: ResolvableHead[]
  renderer?: StaticRenderer
  clientBundlePath: string
  originalIndexHtml: string
  rootElementId: string
}): Promise<string> {
  return (
    await overrideDocumentHtml({
      content: renderer(element),
      dehydratedState,
      pageLocation,
      head,
      clientBundlePath,
      originalIndexHtml,
      rootElementId,
    })
  ).html
}

export async function getReadableStreamWithWrapper({
  element,
  prefix,
  suffix,
  renderer = renderToReadableStream,
  clientBundlePath,
}: {
  element: React.ReactElement
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
  const reactStream = await renderer(element, {
    ...(clientBundlePath ? { bootstrapModules: [clientBundlePath] } : {}),
  })
  return reactStream.pipeThrough(transform)
}

export async function renderReadableStream({
  element,
  dehydratedState,
  pageLocation,
  head,
  clientBundlePath,
  renderer = renderToReadableStream,
  originalIndexHtml,
  rootElementId,
}: {
  element: React.ReactElement
  dehydratedState: DehydratedState
  pageLocation: AnyLocation
  head: ResolvableHead[]
  renderer?: ReadableStreamRenderer
  clientBundlePath?: string
  originalIndexHtml: string
  rootElementId?: string
}): Promise<ReadableStream> {
  const { prefix, suffix } = await overrideDocumentHtml({
    originalIndexHtml,
    dehydratedState,
    pageLocation,
    head,
    rootElementId,
  })
  return await getReadableStreamWithWrapper({ element, prefix, suffix, renderer, clientBundlePath })
}

export async function renderAppAsReadableStream({
  App,
  eversionRun,
  pageLocation,
  pagePoint,
  input,
  ...props
}: {
  App: HydratedAppComponent
  eversionRun: EversionRun
  pageLocation: AnyLocation
  pagePoint: AnyPoint | undefined
  input: InputRaw
  head: ResolvableHead[]
  renderer?: ReadableStreamRenderer
  clientBundlePath?: string
  originalIndexHtml: string
  rootElementId?: string
}): Promise<ReadableStream> {
  await eversionRun.prefetchAppPagePoints({
    App,
    renderToReadableStream,
    pagePoint,
    input,
  })
  const element = createElement(App, {
    ssrLocation: pageLocation,
    root: eversionRun.eversion.root,
    points: eversionRun.eversion.points,
    queryClient: eversionRun.queryClient,
  })
  return await renderReadableStream({
    ...props,
    pageLocation,
    element,
    dehydratedState: eversionRun.getQueryClientDehydratedState(),
  })
}

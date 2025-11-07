import { createHead, transformHtmlTemplate } from '@unhead/react/server'
import { createElement } from 'react'
import type { ReactDOMServerReadableStream, RenderToReadableStreamOptions } from 'react-dom/server'
import { renderToReadableStream } from 'react-dom/server'
import superjson from 'superjson'
import type { ResolvableHead } from 'unhead/types'
import type { EversionRun } from '../core/eversion.js'
import { GlobalStore } from '../core/global-store.js'
import type { AppComponent } from '../core/mount.js'
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

function prependHeadElement({ html, content }: { html: string; content: string }) {
  // Match the <head> tag and capture its existing content
  const pattern = /<head\b[^>]*>([\s\S]*?)<\/head>/i

  const replacement = (match: string, inner: string) => {
    const newContent = `${content}${inner}` // prepend payload to the beginning of <head>
    return match.replace(inner, newContent)
  }

  return html.replace(pattern, replacement)
}

export async function overrideDocumentHtml<TContent extends string | undefined = undefined>({
  originalIndexHtml,
  content,
  eversionRun,
  head,
  env,
  rootElementId,
  clientBundlePath,
}: {
  originalIndexHtml: string
  content?: TContent
  eversionRun: EversionRun
  head: ResolvableHead[]
  env?: Record<string, string | number | boolean | undefined>
  rootElementId?: string
  clientBundlePath?: string
}): Promise<DocumentHtmlResult<TContent>> {
  const packedGlobalStore = await eversionRun.withServerGlobalState(async () => {
    const packed = GlobalStore.pack()
    const stringified = superjson.stringify(packed)
    return stringified
  })

  let html = prependBodyElement({
    content: `<script id="__PACKED_GLOBAL_STORE__" type="application/json">${packedGlobalStore}</script>`,
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
  html = prependHeadElement({
    content: `<script id="__POINT0_ENV__" type="text/javascript">
  const __ENV__ = ${escapeForInlineJSON(JSON.stringify({ ...env, IS_CLIENT: '1' }))};
  window.process = window.process || {};
  window.process.env = { ...(window.process.env || {}), ...__ENV__ };
  window.import = window.import || {};
  window.import.meta = window.import.meta || {};
  window.import.meta.env = { ...(window.import.meta.env || {}), ...__ENV__ };
</script>`,
    html,
  })

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

export async function getReadableStreamWithWrapper({
  App,
  prefix,
  suffix,
  renderer = renderToReadableStream,
  clientBundlePath,
  eversionRun,
}: {
  App: AppComponent
  suffix?: string
  prefix?: string
  clientBundlePath?: string
  renderer?: ReadableStreamRenderer
  eversionRun: EversionRun
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
  const reactStream = await eversionRun.withServerGlobalState(
    async () =>
      await renderer(createElement(App), {
        ...(clientBundlePath ? { bootstrapModules: [clientBundlePath] } : {}),
      }),
  )

  return reactStream.pipeThrough(transform)
}

export async function renderReadableStream({
  App,
  head,
  env,
  clientBundlePath,
  renderer = renderToReadableStream,
  originalIndexHtml,
  rootElementId,
  eversionRun,
}: {
  App: AppComponent
  head: ResolvableHead[]
  env?: Record<string, string | number | boolean | undefined>
  renderer?: ReadableStreamRenderer
  clientBundlePath?: string
  originalIndexHtml: string
  rootElementId?: string
  eversionRun: EversionRun
}): Promise<ReadableStream> {
  const { prefix, suffix } = await overrideDocumentHtml({
    originalIndexHtml,
    eversionRun,
    head,
    env,
    rootElementId,
  })
  return await getReadableStreamWithWrapper({ App, prefix, suffix, renderer, clientBundlePath, eversionRun })
}

export async function renderAppAsReadableStream({
  App,
  eversionRun,
  pagePoint,
  input,
  ...props
}: {
  App: AppComponent
  eversionRun: EversionRun
  pagePoint: AnyPoint | undefined
  input: InputRaw
  env?: Record<string, string | number | boolean | undefined>
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
  return await renderReadableStream({
    ...props,
    App,
    eversionRun,
  })
}

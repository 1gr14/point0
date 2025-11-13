import { createHead, transformHtmlTemplate } from '@unhead/react/server'
import { createElement } from 'react'
import type { ReactDOMServerReadableStream, RenderToReadableStreamOptions } from 'react-dom/server'
import { renderToReadableStream } from 'react-dom/server'
import superjson from 'superjson'
import type { ResolvableHead } from 'unhead/types'
import type { EversionRun } from '../core/eversion.js'
import { SuperStore } from '../core/super-store.js'
import type { AppComponent } from '../core/mount.js'
import type { AnyPoint, InputRaw } from '../core/types.js'
import type { AnyLocation } from '@devp0nt/route0'

export type StaticRenderer = (reactNode: React.ReactNode) => string
export type ReadableStreamRenderer = (
  reactNode: React.ReactNode,
  options?: RenderToReadableStreamOptions,
) => Promise<ReactDOMServerReadableStream>

function escapeForInlineJSON(json: string) {
  return json
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
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
  domRootElementId = 'root',
  position = 'append',
}: {
  html: string
  content: string
  domRootElementId?: string
  position?: 'append' | 'prepend'
}) {
  // Match <div ... id="root" ...> ... </div> without eating siblings
  const pattern = new RegExp(
    `<div\\b([^>]*?)\\bid=["']${domRootElementId}["']([^>]*)>(.*?)</div>`,
    'is', // i = case-insensitive, s = dotAll (so . matches newlines)
  )
  const replacement = (_: string, before: string, after: string, inner: string) => {
    const newInner = position === 'prepend' ? `${content}${inner}` : `${inner}${content}`
    return `<div${before.trimEnd()} id="${domRootElementId}"${after}>${newInner}</div>`
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
  domRootElementId,
  clientBundlePath,
}: {
  originalIndexHtml: string
  content?: TContent
  eversionRun: EversionRun
  head: ResolvableHead[]
  env?: Record<string, string | number | boolean | undefined>
  domRootElementId?: string
  clientBundlePath?: string
}): Promise<DocumentHtmlResult<TContent>> {
  let html = originalIndexHtml
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
    domRootElementId,
  })
  if (head.length > 0) {
    html = await transformHtmlTemplate(createHead({ init: head }), html)
  }
  html = prependHeadElement({
    content: `<script id="__POINT0_ENV__" type="text/javascript">
  const __ENV__ = ${escapeForInlineJSON(JSON.stringify({ ...env }))};
  window.process = window.process || {};
  window.process.env = { ...(window.process.env || {}), ...__ENV__ };
  window.import = window.import || {};
  window.import.meta = window.import.meta || {};
  window.import.meta.env = { ...(window.import.meta.env || {}), ...__ENV__ };
</script>`,
    html,
  })
  html = prependHeadElement({
    content: '<!-- __DEHYDRATED_SUPER_STORE__ -->',
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

  // one scope for both render and pack ensures consistency
  return await eversionRun.withServerGlobalState(async () => {
    // Kick off the render first; any randoms used during render happen now
    const reactStream = await renderer(createElement(App), {
      ...(clientBundlePath ? { bootstrapModules: [clientBundlePath] } : {}),
    })

    // Snapshot AFTER render started, in the same state scope
    const dehydrated = SuperStore.dehydrate()
    const escapedJS = escapeForInlineJSON(superjson.stringify(dehydrated))
    const compiledPrefix = (prefix ?? '').replace(
      '<!-- __DEHYDRATED_SUPER_STORE__ -->',
      `<script id="__DEHYDRATED_SUPER_STORE_SCRIPT__">
         window.__DEHYDRATED_SUPER_STORE__ = ${JSON.stringify(escapedJS)};
       </script>`,
    )

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      start(controller) {
        if (compiledPrefix) controller.enqueue(encoder.encode(compiledPrefix))
      },
      transform(chunk, controller) {
        controller.enqueue(chunk)
      },
      flush(controller) {
        if (suffix) controller.enqueue(encoder.encode(suffix))
      },
    })

    return reactStream.pipeThrough(transform)
  })
}

export async function renderReadableStream({
  App,
  head,
  env,
  clientBundlePath,
  renderer = renderToReadableStream,
  originalIndexHtml,
  domRootElementId,
  eversionRun,
}: {
  App: AppComponent
  head: ResolvableHead[]
  env?: Record<string, string | number | boolean | undefined>
  renderer?: ReadableStreamRenderer
  clientBundlePath?: string
  originalIndexHtml: string
  domRootElementId?: string
  eversionRun: EversionRun
}): Promise<ReadableStream> {
  const { prefix, suffix } = await overrideDocumentHtml({
    originalIndexHtml,
    eversionRun,
    head,
    env,
    domRootElementId,
  })
  return await getReadableStreamWithWrapper({ App, prefix, suffix, renderer, clientBundlePath, eversionRun })
}

export async function renderAppAsReadableStream({
  App,
  eversionRun,
  pagePoint,
  pageLocation,
  input,
  ...props
}: {
  App: AppComponent
  eversionRun: EversionRun
  pagePoint: AnyPoint | undefined
  pageLocation: AnyLocation
  input: InputRaw
  env?: Record<string, string | number | boolean | undefined>
  // TODO: remove head from here, lets extract it from Super Store
  head: ResolvableHead[]
  renderer?: ReadableStreamRenderer
  clientBundlePath?: string
  originalIndexHtml: string
  domRootElementId?: string
}): Promise<ReadableStream> {
  await eversionRun.prefetchAppPagePointDeep({
    App,
    renderToReadableStream,
    pagePoint,
    pageLocation,
    input,
  })
  return await renderReadableStream({
    ...props,
    App,
    eversionRun,
  })
}

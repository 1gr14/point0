import type { AnyLocation } from '@devp0nt/route0'
import type { AppComponent, InputRaw, PagePoint } from '@point0/core'
import { superstore } from '@point0/core'
import { transformHtmlTemplate } from '@unhead/react/server'
import { createElement } from 'react'
import type { ReactDOMServerReadableStream, RenderToReadableStreamOptions } from 'react-dom/server'
import { renderToReadableStream } from 'react-dom/server'
import type { Executor } from './executor.js'

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

function prependHeadElement({ html, content }: { html: string; content: string }): string {
  // Match the <head> tag and capture its existing content
  const pattern = /<head\b[^>]*>([\s\S]*?)<\/head>/i

  const replacement = (match: string, inner: string) => {
    const newContent = `${content}${inner}` // prepend payload to the beginning of <head>
    return match.replace(inner, newContent)
  }

  return html.replace(pattern, replacement)
}

/**
 * Extracts all script tags from HTML while preserving their order and location
 * Returns an object with scripts from head and body separately
 */
function extractScripts(html: string): {
  headScripts: Array<{ tag: string; placeholder: string }>
  bodyScripts: Array<{ tag: string; placeholder: string }>
  htmlWithPlaceholders: string
} {
  const headScripts: Array<{ tag: string; placeholder: string }> = []
  const bodyScripts: Array<{ tag: string; placeholder: string }> = []

  // Extract scripts from head - handles both <script>...</script> and <script ... />
  html = html.replace(/<head\b[^>]*>([\s\S]*?)<\/head>/i, (headMatch, headContent) => {
    const headWithPlaceholders = headContent.replace(
      /<script\b[^>]*(?:\/>|>[\s\S]*?<\/script>)/gi,
      (scriptTag: string) => {
        const placeholder = `<!-- __POINT0_SCRIPT_HEAD_${headScripts.length}__ -->`
        headScripts.push({ tag: scriptTag, placeholder })
        return placeholder
      },
    )
    return headMatch.replace(headContent, headWithPlaceholders)
  })

  // Extract scripts from body - handles both <script>...</script> and <script ... />
  html = html.replace(/<body\b[^>]*>([\s\S]*?)<\/body>/i, (bodyMatch, bodyContent) => {
    const bodyWithPlaceholders = bodyContent.replace(
      /<script\b[^>]*(?:\/>|>[\s\S]*?<\/script>)/gi,
      (scriptTag: string) => {
        const placeholder = `<!-- __POINT0_SCRIPT_BODY_${bodyScripts.length}__ -->`
        bodyScripts.push({ tag: scriptTag, placeholder })
        return placeholder
      },
    )
    return bodyMatch.replace(bodyContent, bodyWithPlaceholders)
  })

  return { headScripts, bodyScripts, htmlWithPlaceholders: html }
}

/**
 * Restores original scripts to their placeholders in the HTML
 */
function restoreScripts(
  html: string,
  headScripts: Array<{ tag: string; placeholder: string }>,
  bodyScripts: Array<{ tag: string; placeholder: string }>,
): string {
  // Restore scripts in reverse order to avoid issues if placeholders contain similar text
  // Restore head scripts
  for (let i = headScripts.length - 1; i >= 0; i--) {
    const { tag, placeholder } = headScripts[i]
    html = html.replace(placeholder, tag)
  }

  // Restore body scripts
  for (let i = bodyScripts.length - 1; i >= 0; i--) {
    const { tag, placeholder } = bodyScripts[i]
    html = html.replace(placeholder, tag)
  }

  return html
}

export function addEnvToDocumentHtml({
  html,
  env,
}: {
  html: string
  env?: Record<string, string | number | boolean | undefined>
}): string {
  env ??= {}
  return prependHeadElement({
    content: `<script id="__POINT0_ENV__" type="text/javascript">
  const __POINT0_ENV__ = ${escapeForInlineJSON(JSON.stringify({ ...env }))};
  window.process = window.process || {};
  window.process.env = { ...(window.process.env || {}), ...__POINT0_ENV__ };
  window.import = window.import || {};
  window.import.meta = window.import.meta || {};
  window.import.meta.env = { ...(window.import.meta.env || {}), ...__POINT0_ENV__ };
</script>`,
    html,
  })
}

export async function overrideDocumentHtml<TContent extends string | undefined = undefined>({
  originalIndexHtml,
  content,
  executor,
  env,
  domRootElementId,
  clientBundlePath,
}: {
  originalIndexHtml: string
  content?: TContent
  executor: Executor
  env?: Record<string, string | number | boolean | undefined>
  domRootElementId?: string
  clientBundlePath?: string
}): Promise<DocumentHtmlResult<TContent>> {
  let html = originalIndexHtml

  // Extract existing scripts to preserve their order
  const { headScripts, bodyScripts, htmlWithPlaceholders } = extractScripts(html)

  // Transform HTML with Unhead (this may reorder scripts, but we'll restore original order)
  html = await transformHtmlTemplate(executor.serverStorageState.__POINT0_UNHEAD_HEAD__, htmlWithPlaceholders)

  // Restore original scripts in their original positions
  html = restoreScripts(html, headScripts, bodyScripts)
  if (clientBundlePath) {
    html = prependBodyElement({
      content: `<script src="${clientBundlePath}" defer></script>`,
      html,
    })
  }
  html = fillRootElement({
    content: content ? `<!-- __Target_START__ -->${content}<!-- __Target_END__ -->` : '<!-- __Target__ -->',
    html,
    domRootElementId,
  })
  html = addEnvToDocumentHtml({ html, env })
  html = prependHeadElement({
    content: '<!-- __POINT0_DEHYDRATED_SUPER_STORE__ -->',
    html,
  })

  if (html.includes('<!-- __Target__ -->')) {
    const [prefix, suffix] = html.split('<!-- __Target__ -->')
    return { prefix, content: undefined as TContent, suffix, html: `${prefix}${suffix}` }
  } else if (html.includes('<!-- __Target_START__ -->') && html.includes('<!-- __Target_END__ -->')) {
    const prefix = html.split('<!-- __Target_START__ -->')[0]
    const suffix = html.split('<!-- __Target_END__ -->')[1]
    const content = html
      .replace(prefix, '')
      .replace(suffix, '')
      .replace('<!-- __Target_START__ -->', '')
      .replace('<!-- __Target_END__ -->', '')
    return { prefix, content: content as TContent, suffix, html: `${prefix}${content}${suffix}` }
  } else {
    throw new Error('<!-- __Target__ --> not found')
  }
}

export async function getReadableStreamWithWrapper({
  App,
  prefix,
  suffix,
  renderer = renderToReadableStream,
  clientBundlePath,
  executor,
}: {
  App: AppComponent
  suffix?: string
  prefix?: string
  clientBundlePath?: string
  renderer?: ReadableStreamRenderer
  executor: Executor
}) {
  const encoder = new TextEncoder()

  // one scope for both render and pack ensures consistency
  return await executor.withServerGlobalState(async () => {
    // Kick off the render first; any randoms used during render happen now
    const reactStream = await renderer(
      createElement(App, {
        points: executor.pointsManager,
      }),
      {
        ...(clientBundlePath ? { bootstrapModules: [clientBundlePath] } : {}),
      },
    )

    // Snapshot AFTER render started, in the same state scope
    const escapedJS = escapeForInlineJSON(superstore.stringify(executor.pointsManager.transformer))
    const compiledPrefix = (prefix ?? '').replace(
      '<!-- __POINT0_DEHYDRATED_SUPER_STORE__ -->',
      `<script id="__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__">
         window.__POINT0_DEHYDRATED_SUPER_STORE__ = ${JSON.stringify(escapedJS)};
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
  env,
  clientBundlePath,
  renderer = renderToReadableStream,
  originalIndexHtml,
  domRootElementId,
  executor,
}: {
  App: AppComponent
  env?: Record<string, string | number | boolean | undefined>
  renderer?: ReadableStreamRenderer
  clientBundlePath?: string
  originalIndexHtml: string
  domRootElementId?: string
  executor: Executor
}): Promise<ReadableStream> {
  const { prefix, suffix } = await overrideDocumentHtml({
    originalIndexHtml,
    executor,
    env,
    domRootElementId,
  })
  return await getReadableStreamWithWrapper({ App, prefix, suffix, renderer, clientBundlePath, executor })
}

export async function renderAppAsReadableStream({
  App,
  executor,
  pagePoint,
  pageLocation,
  input,
  ...props
}: {
  App: AppComponent
  executor: Executor
  pagePoint: PagePoint | undefined
  pageLocation: AnyLocation
  input: InputRaw
  env?: Record<string, string | number | boolean | undefined>
  renderer?: ReadableStreamRenderer
  clientBundlePath?: string
  originalIndexHtml: string
  domRootElementId?: string
}): Promise<ReadableStream> {
  await executor.prefetchAppPagePointDeep({
    App,
    renderToReadableStream,
    pagePoint,
    pageLocation,
    input,
  })
  return await renderReadableStream({
    ...props,
    App,
    executor,
  })
}

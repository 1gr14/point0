import type { AnyLocation } from '@1gr14/route0'
import { superstore } from '@point0/core'
import type { AppComponent, ClientPoints, PagePoint } from '@point0/core'
import { transformHtmlTemplate } from '@unhead/react/server'
import { uneval } from 'devalue'
import { createElement } from 'react'
import { renderToReadableStream } from 'react-dom/server'
import type { ReactDOMServerReadableStream, RenderToReadableStreamOptions } from 'react-dom/server'
import type { SsrOptionsResolved } from './config.js'
import type { Executor } from './executor.js'
import { renderModulePreloadLinks } from './preload-manifest.js'

export type StaticRenderer = (reactNode: React.ReactNode) => string
export type ReadableStreamRenderer = (
  reactNode: React.ReactNode,
  options?: RenderToReadableStreamOptions,
) => Promise<ReactDOMServerReadableStream>

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

function prependHeadElement({
  html,
  content,
  afterScriptId,
}: {
  html: string
  content: string
  afterScriptId?: string
}): string {
  // Match the <head> tag and capture its existing content
  const pattern = /<head\b[^>]*>([\s\S]*?)<\/head>/i

  const replacement = (match: string, inner: string) => {
    if (afterScriptId) {
      const escapedId = afterScriptId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const targetScriptPattern = new RegExp(
        `<script\\b[^>]*\\bid=["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/script>`,
        'i',
      )
      const targetMatch = inner.match(targetScriptPattern)
      if (targetMatch) {
        const targetTag = targetMatch[0]
        const newInner = inner.replace(targetTag, `${targetTag}${content}`)
        return match.replace(inner, newInner)
      }
    }
    const newContent = `${content}${inner}` // prepend payload to the beginning of <head>
    return match.replace(inner, newContent)
  }

  return html.replace(pattern, replacement)
}

/** Insert `content` at the END of `<head>` (right before `</head>`) — the opposite of {@link prependHeadElement}. */
function appendHeadElement({ html, content }: { html: string; content: string }): string {
  return html.replace(/<\/head>/i, `${content}</head>`)
}

/**
 * Force `<meta charset="utf-8">` to be the FIRST child of `<head>`, deduping any charset declaration the template or
 * Unhead already produced. The transport `; charset=utf-8` response header is the primary, authoritative fix; this is
 * defense in depth for when a proxy/CDN strips that header. Per the WHATWG "prescan a byte stream" algorithm the
 * browser only scans the first 1024 bytes for a `<meta charset>` — and the dehydrated super-store script (~200 KB on a
 * real page) used to sit at the very top of `<head>`, pushing the template's charset meta far past that window and
 * leaving the browser to guess (→ intermittent UTF-8-as-Windows-1252 mojibake). Engine-owned so an app template can't
 * drop it. Run LAST among the head injections so the meta wins the first position over the env / preload / store
 * elements.
 */
function ensureHeadCharsetFirst({ html }: { html: string }): string {
  const headPattern = /(<head\b[^>]*>)([\s\S]*?)(<\/head>)/i
  return html.replace(headPattern, (_match, open: string, inner: string, close: string) => {
    const withoutCharset = inner
      .replace(/<meta\b[^>]*\bcharset\b[^>]*>/gi, '')
      .replace(/<meta\b[^>]*\bhttp-equiv=["']?content-type["']?[^>]*>/gi, '')
    return `${open}<meta charset="utf-8">${withoutCharset}${close}`
  })
}

/**
 * Extracts all script tags from HTML while preserving their order and location Returns an object with scripts from head
 * and body separately
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
  envVars,
  envConsts,
}: {
  html: string
  envVars?: Record<string, string | number | boolean | undefined>
  envConsts?: Record<string, string | number | boolean | undefined>
}): string {
  const htmlWithConsts = addEnvConstsToDocumentHtml({ html, envConsts })
  return addEnvVarsToDocumentHtml({ html: htmlWithConsts, envVars })
}

function toJsonCompatibleEnv(
  env?: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  return JSON.parse(JSON.stringify(env ?? {})) as Record<string, string | number | boolean>
}

function upsertHeadScript({
  html,
  id,
  scriptBody,
  afterScriptId,
}: {
  html: string
  id: string
  scriptBody: string
  afterScriptId?: string
}): string {
  const pattern = new RegExp(`<script\\s+id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`, 'i')
  const scriptTag = `<script id="${id}" type="text/javascript">
${scriptBody}
</script>`
  if (pattern.test(html)) {
    return html.replace(pattern, scriptTag)
  }
  return prependHeadElement({
    afterScriptId,
    content: scriptTag,
    html,
  })
}

export function addEnvVarsToDocumentHtml({
  html,
  envVars,
}: {
  html: string
  envVars?: Record<string, string | number | boolean | undefined>
}): string {
  const jsonCompatibleEnvVars = toJsonCompatibleEnv(envVars)
  return upsertHeadScript({
    id: '__POINT0_ENV_VARS__',
    html,
    afterScriptId: '__POINT0_ENV_CONSTS__',
    scriptBody: `const __POINT0_ENV_VARS__ = ${uneval(jsonCompatibleEnvVars)};
window.__POINT0_ENV_VARS__ = __POINT0_ENV_VARS__;
window.__POINT0_ENV_EXTEND_FN__({ ...__POINT0_ENV_VARS__, ...(window.__POINT0_ENV_CONSTS__ || {}) });`,
  })
}

export function addEnvConstsToDocumentHtml({
  html,
  envConsts,
}: {
  html: string
  envConsts?: Record<string, string | number | boolean | undefined>
}): string {
  const jsonCompatibleEnvConsts = toJsonCompatibleEnv(envConsts)
  return upsertHeadScript({
    id: '__POINT0_ENV_CONSTS__',
    html,
    scriptBody: `const __POINT0_ENV_CONSTS__ = ${uneval(jsonCompatibleEnvConsts)};
window.__POINT0_ENV_CONSTS__ = __POINT0_ENV_CONSTS__;
window.__POINT0_ENV_EXTEND_FN__ = function(values) {
  window.process = window.process || {};
  window.process.env = { ...(window.process.env || {}), ...values };
}
window.__POINT0_ENV_EXTEND_FN__(__POINT0_ENV_CONSTS__);`,
  })
}

// window.import = window.import || {};
// window.import.meta = window.import.meta || {};
// window.import.meta.env = { ...(window.import.meta.env || {}), ...values };

export async function overrideDocumentHtml<TContent extends string | undefined = undefined>({
  originalIndexHtml,
  content,
  executor,
  envVars,
  envConsts,
  domRootElementId,
  clientBundlePath,
  modulePreloads,
}: {
  originalIndexHtml: string
  content?: TContent
  executor: Executor
  envVars?: Record<string, string | number | boolean | undefined>
  envConsts?: Record<string, string | number | boolean | undefined>
  domRootElementId?: string
  clientBundlePath?: string
  modulePreloads?: string[]
}): Promise<DocumentHtmlResult<TContent>> {
  let html = originalIndexHtml

  // Extract existing scripts to preserve their order
  const { headScripts, bodyScripts, htmlWithPlaceholders } = extractScripts(html)

  // Transform HTML with Unhead (this may reorder scripts, but we'll restore original order)
  html = await transformHtmlTemplate(executor.serverStorageState.__POINT0_UNHEAD_SERVER_HEAD__, htmlWithPlaceholders)

  // Restore original scripts in their original positions
  html = restoreScripts(html, headScripts, bodyScripts)
  if (clientBundlePath) {
    html = prependBodyElement({
      content: `<script src="${clientBundlePath}" defer></script>`,
      html,
    })
  }
  html = fillRootElement({
    content: content ? `<!-- __TARGET_START__ -->${content}<!-- __TARGET_END__ -->` : '<!-- __TARGET__ -->',
    html,
    domRootElementId,
  })
  html = addEnvToDocumentHtml({ html, envVars, envConsts })
  if (modulePreloads && modulePreloads.length > 0) {
    // Per-request preload hints: turn the entry's import waterfall (and, later, the matched page's lazy chunk) into one
    // parallel fetch straight from the document. Prepended to <head> so the browser sees them before the entry script.
    html = prependHeadElement({ content: renderModulePreloadLinks(modulePreloads), html })
  }
  // The dehydrated super-store (~200 KB on a real page) only needs to be defined before the body bootstrap module runs,
  // so it goes at the END of <head> rather than the top — keeping the charset meta, title and preload links inside the
  // early-parse / 1024-byte-prescan window instead of behind a huge script.
  html = appendHeadElement({
    content: '<!-- __POINT0_DEHYDRATED_SUPER_STORE__ -->',
    html,
  })
  // Last, so the charset meta wins the first <head> position over everything injected above (store, preloads, env).
  html = ensureHeadCharsetFirst({ html })

  if (html.includes('<!-- __TARGET__ -->')) {
    const [prefix, suffix] = html.split('<!-- __TARGET__ -->')
    return { prefix, content: undefined as TContent, suffix, html: `${prefix}${suffix}` }
  } else if (html.includes('<!-- __TARGET_START__ -->') && html.includes('<!-- __TARGET_END__ -->')) {
    const prefix = html.split('<!-- __TARGET_START__ -->')[0]
    const suffix = html.split('<!-- __TARGET_END__ -->')[1]
    const content = html
      .replace(prefix, '')
      .replace(suffix, '')
      .replace('<!-- __TARGET_START__ -->', '')
      .replace('<!-- __TARGET_END__ -->', '')
    return { prefix, content: content as TContent, suffix, html: `${prefix}${content}${suffix}` }
  } else {
    throw new Error('<!-- __TARGET__ --> not found')
  }
}

export async function getReadableStreamWithWrapper({
  App,
  prefix,
  suffix,
  renderer = renderToReadableStream,
  waitForAllReady,
  clientBundlePath,
  clientPoints,
  executor,
}: {
  App: AppComponent
  suffix?: string
  prefix?: string
  waitForAllReady?: boolean
  clientBundlePath?: string
  renderer?: ReadableStreamRenderer
  clientPoints: ClientPoints<any>
  executor: Executor
}) {
  const encoder = new TextEncoder()

  // one scope for both render and pack ensures consistency
  return await executor.withServerGlobalState(async () => {
    // Kick off the render first; any randoms used during render happen now
    const reactStream = await renderer(createElement(App), {
      ...(clientBundlePath ? { bootstrapModules: [clientBundlePath] } : {}),
    })
    if (waitForAllReady) {
      await reactStream.allReady
    }

    // Snapshot AFTER render started, in the same state scope
    const compiledPrefix = (prefix ?? '').replace(
      '<!-- __POINT0_DEHYDRATED_SUPER_STORE__ -->',
      `<script id="__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__">
         window.__POINT0_DEHYDRATED_SUPER_STORE__ = ${uneval(superstore.stringify(clientPoints.transformer))};
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
  envVars,
  envConsts,
  clientBundlePath,
  clientPoints,
  renderer = renderToReadableStream,
  waitForAllReady,
  originalIndexHtml,
  domRootElementId,
  modulePreloads,
  executor,
}: {
  App: AppComponent
  envVars?: Record<string, string | number | boolean | undefined>
  envConsts?: Record<string, string | number | boolean | undefined>
  clientPoints: ClientPoints<any>
  renderer?: ReadableStreamRenderer
  waitForAllReady?: boolean
  clientBundlePath?: string
  originalIndexHtml: string
  domRootElementId?: string
  modulePreloads?: string[]
  executor: Executor
}): Promise<ReadableStream> {
  const { prefix, suffix } = await overrideDocumentHtml({
    originalIndexHtml,
    executor,
    envVars,
    envConsts,
    domRootElementId,
    modulePreloads,
  })
  return await getReadableStreamWithWrapper({
    App,
    prefix,
    suffix,
    renderer,
    waitForAllReady,
    clientBundlePath,
    executor,
    clientPoints,
  })
}

export async function renderAppAsReadableStream({
  App,
  executor,
  pagePoint,
  pageLocation,
  clientPoints,
  redirectPolicy,
  waitForAllReady,
  ssrOptions,
  ...props
}: {
  App: AppComponent
  executor: Executor
  pagePoint: PagePoint | undefined
  pageLocation: AnyLocation
  clientPoints: ClientPoints<any>
  envVars?: Record<string, string | number | boolean | undefined>
  envConsts?: Record<string, string | number | boolean | undefined>
  renderer?: ReadableStreamRenderer
  clientBundlePath?: string
  originalIndexHtml: string
  domRootElementId?: string
  modulePreloads?: string[]
  redirectPolicy: 'continue' | 'throw'
  waitForAllReady?: boolean
  ssrOptions: SsrOptionsResolved
}): Promise<ReadableStream> {
  await executor.prefetchAppPagePointDeep({
    App,
    renderToReadableStream,
    clientPoints,
    pagePoint,
    pageLocation,
    redirectPolicy,
    ssrOptions,
  })
  return await renderReadableStream({
    ...props,
    App,
    executor,
    clientPoints,
    waitForAllReady,
  })
}

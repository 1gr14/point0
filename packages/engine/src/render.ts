import type { AnyLocation } from '@1gr14/route0'
import {
  _ss,
  getDehydratedStateFromQueryClientDehydratedStateQuery,
  isQueryClientDehydratedStateQuery,
  serializeErrorsInDehydratedState,
  superstore,
} from '@point0/core'
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
    // Kick off the render first; any randoms used during render happen now.
    //
    // The app is wrapped in a `display: contents` host div (no box, zero layout impact,
    // self-identifying via `data-point0`; `mount()` renders the same wrapper on the client so
    // hydration matches). Without it, when the FIRST markup-producing mountable suspends (a
    // streamed suspense query), the pending Suspense boundary is the ROOT of React's output — and
    // Fizz then withholds the entire response until the boundary resolves (a root-level boundary
    // may still contribute preamble/head content, so React cannot commit the shell). A host
    // element around the tree pins the host context and streaming works.
    const reactStream = await renderer(
      createElement('div', { 'data-point0': '', style: { display: 'contents' } }, createElement(App)),
      {
        ...(clientBundlePath ? { bootstrapModules: [clientBundlePath] } : {}),
        // Render errors that happen after the shell was sent (a throw inside a streamed Suspense
        // boundary) have no other server-side trace — log them. Failed streamed LOADERS never
        // reach this callback: their suspension resolves and the mountable's `.error()` streams in
        // place, with the failure logged through the query-error event pipeline. Providing onError
        // also replaces React's default console.error for shell errors — those still reject the
        // render promise and travel the usual SPA-fallback path.
        onError: (error: unknown) => {
          executor.logStreamRenderError(error)
        },
      },
    )
    if (waitForAllReady) {
      await reactStream.allReady
    }

    // Snapshot AFTER render started, in the same state scope. The tiny receiver ahead of the
    // dehydrated store buffers streamed query pushes (see below) until `mount()` installs the
    // real handler — inline push <script>s can execute both before and after the bundle loads.
    const compiledPrefix = (prefix ?? '').replace(
      '<!-- __POINT0_DEHYDRATED_SUPER_STORE__ -->',
      `<script id="__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__">
         window.__POINT0_PUSH_QUERY_BUFFER__ = [];
         window.__POINT0_PUSH_QUERY__ = function (pushedQuery) { window.__POINT0_PUSH_QUERY_BUFFER__.push(pushedQuery) };
         window.__POINT0_DEHYDRATED_SUPER_STORE__ = ${uneval(superstore.stringify(clientPoints.transformer))};
       </script>`,
    )

    // Streamed query push-hydration. The dehydrated store in the prefix was snapshotted before any
    // streamed query resolved, so their data is NOT in it — without this the client would silently
    // refetch after hydration and flash the streamed content. Every React flush after the shell is
    // a resolved Suspense boundary; prepending the newly settled query states to that same chunk
    // guarantees the data <script> executes (in document order) before React's reveal script and
    // before the revealed content hydrates — the client's useQuery finds the data in cache.
    // "Sent" = what the client actually receives from the prefix. When the page carries a
    // dehydrated-state snapshot query, the client's hydrated cache is exactly its INNER queries
    // (taken at end of discovery, pending-filtered) — a query that settled after that snapshot is
    // in the raw server cache but NOT in the prefix, so it must be pushed. Without a snapshot
    // query the prefix dehydrates the raw cache, so everything non-pending counts as sent.
    const queryClient = _ss.__POINT0_QUERY_CLIENT__.get()
    const sentQueryHashes = new Set<string>()
    const dehydratedStateQueries = queryClient.getQueryCache().getAll().filter(isQueryClientDehydratedStateQuery)
    if (dehydratedStateQueries.length > 0) {
      for (const query of dehydratedStateQueries) {
        sentQueryHashes.add(query.queryHash)
        const innerDehydratedState = getDehydratedStateFromQueryClientDehydratedStateQuery(query)
        for (const innerQuery of innerDehydratedState?.queries ?? []) {
          sentQueryHashes.add(innerQuery.queryHash)
        }
      }
    } else {
      for (const query of queryClient.getQueryCache().getAll()) {
        if (query.state.status !== 'pending') {
          sentQueryHashes.add(query.queryHash)
        }
      }
    }
    // Both success AND error states are pushed: a failed streamed loader streams the mountable's
    // `.error()` in place, so the client cache must hold the same error state — otherwise the
    // hydrated boundary would mismatch (server shows `.error()`, client cache says pending).
    // Errors travel through the same projection the prefix uses (public in production).
    const ErrorClass = clientPoints.manager.root._Error
    const collectNewlySettledQueryScripts = (): string | undefined => {
      const scripts: string[] = []
      for (const query of queryClient.getQueryCache().getAll()) {
        if (query.state.status === 'pending' || sentQueryHashes.has(query.queryHash)) {
          continue
        }
        sentQueryHashes.add(query.queryHash)
        if (isQueryClientDehydratedStateQuery(query)) {
          // client-navigation snapshots, not page data — never pushed
          continue
        }
        const payload = serializeErrorsInDehydratedState(
          {
            queries: [{ queryKey: query.queryKey, queryHash: query.queryHash, state: query.state }],
            mutations: [],
          },
          ErrorClass,
        ).queries[0]
        scripts.push(
          `<script>window.__POINT0_PUSH_QUERY__(${uneval(clientPoints.transformer.stringify(payload))})</script>`,
        )
      }
      return scripts.length > 0 ? scripts.join('') : undefined
    }

    // In streaming mode, the first flushed chunk is the shell leaving the process — from that
    // moment a still-running loader can no longer redirect or change cookies/headers/status. Seal
    // the effects so late writes warn instead of disappearing silently (`Effects.sealed` itself
    // is the idempotency guard — re-sealing would only rewrite the same reason).
    const sealEffectsOnFirstChunk = () => {
      if (waitForAllReady || executor.effects.sealed) {
        return
      }
      executor.effects.seal(
        'the response shell was already sent (this page streams suspended queries); a loader that resolves after the shell cannot redirect or change cookies/headers/status',
      )
    }

    // Manual pull-based pump, NOT `reactStream.pipeThrough(transform)`: piping React's (direct)
    // stream through a TransformStream makes Bun deliver nothing until the render fully completes,
    // which silently turns streamed SSR back into whole-page SSR. Reading the React stream with
    // its own reader (what a plain consumer does) keeps the progressive flushes — shell first,
    // each resolved Suspense boundary as its own chunk.
    const reactStreamReader = reactStream.getReader()
    return new ReadableStream<Uint8Array>({
      start(controller) {
        if (compiledPrefix) controller.enqueue(encoder.encode(compiledPrefix))
      },
      async pull(controller) {
        const { done, value } = await reactStreamReader.read()
        if (done) {
          if (suffix) controller.enqueue(encoder.encode(suffix))
          controller.close()
          return
        }
        sealEffectsOnFirstChunk()
        const pushScripts = collectNewlySettledQueryScripts()
        if (pushScripts) controller.enqueue(encoder.encode(pushScripts))
        controller.enqueue(value)
      },
      cancel(reason) {
        void reactStreamReader.cancel(reason)
      },
    })
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
  waitForAllReady?: boolean | 'auto'
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
    target: 'html',
  })
  // Discovery is over — from here the suspense query gates may suspend (final render). The same
  // boundary call decides whether the final render may suspend, from what discovery saw + what
  // is still pending in the cache.
  const { shouldStreamSuspense } = executor.markSsrRenderPhase()
  // 'auto': hold the response for the full tree (the classic whole-HTML behavior) unless the
  // final render may suspend — then stream: the shell ships at once and each suspended Suspense
  // boundary follows in the same response as it resolves. An explicit boolean (e.g.
  // renderAsString) is respected as-is: `true` degrades streaming to blocking.
  const resolvedWaitForAllReady = waitForAllReady === 'auto' ? !shouldStreamSuspense : waitForAllReady
  return await renderReadableStream({
    ...props,
    App,
    executor,
    clientPoints,
    waitForAllReady: resolvedWaitForAllReady,
  })
}

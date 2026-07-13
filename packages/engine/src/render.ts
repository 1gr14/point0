import type { AnyLocation } from '@1gr14/route0'
import {
  _ss,
  collectRscComponentNames,
  getDehydratedStateFromQueryClientDehydratedStateQuery,
  isQueryClientDehydratedStateQuery,
  POINT0_CLIENT_BUILD_VERSION_GLOBAL,
  POINT0_DEHYDRATED_SUPER_STORE_GLOBAL,
  POINT0_ENV_CONSTS_GLOBAL,
  POINT0_ENV_VARS_GLOBAL,
  POINT0_PUSH_QUERY_BUFFER_GLOBAL,
  POINT0_PUSH_QUERY_GLOBAL,
  POINT0_PUSH_RSC_BUFFER_GLOBAL,
  POINT0_PUSH_RSC_GLOBAL,
  serializeErrorsInDehydratedState,
  superstore,
} from '@point0/core'
import type { AppComponent, ClientPoints, ErrorPoint0, EventerEmitFn, PagePoint } from '@point0/core'
import { createHead } from '@unhead/react/server'
import { uneval } from 'devalue'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToReadableStream } from 'react-dom/server'
import { capoTagWeight } from 'unhead/server'
import { resolveTags } from 'unhead/utils'
import type { SsrOptionsResolved } from './config.js'
import {
  buildDocumentElement,
  findRootTemplateElement,
  htmlAttrsToReactProps,
  parseDocumentTemplate,
  SSR_ROOT_OUTLET_MARKUP,
  SSR_ROOT_OUTLET_TAG,
} from './document.js'
import type { Executor } from './executor.js'
import { POINT0_ENV_EXTEND_FN_GLOBAL } from './protocol.js'
import { buildHolePushPayload, emitHoleError, raceIsTimeout, RSC_STREAM_HEARTBEAT_MS } from './rsc-stream.js'
import { readableStreamToString } from './utils.js'

/**
 * The render pipeline: the APP renders as its OWN React root — the `#root` element, `<div id="root">{app}</div>` — and
 * the document shell renders SEPARATELY and is spliced around the app stream. React's `useId` is relative to the render
 * root, and the client hydrates `#root`; rendering the app at `#root` on the server (not nested inside the `<html>`
 * tree) is what keeps every id identical on both sides — the hydration contract React 19.2 enforces.
 *
 * The `index.html` template is parsed once into a React-renderable tree (see ./document.ts). The shell renders that
 * tree with the WHOLE `#root` element replaced by an outlet marker (still React → head/body are structural elements,
 * not string splicing) into a single string, split on the marker into a prefix (`<!DOCTYPE html>`…just before the
 * `#root` open tag) and suffix (the template's post-`#root` body content…`</html>`). The app itself carries `#root`'s
 * open and close tags: it is rendered with `renderToReadableStream(<div id="root">{app}</div>)`, and the shell flushes
 * immediately (prefix + the app's first chunk), each resolved Suspense boundary follows as its own chunk, and the
 * suffix closes the document last. Making `#root` (a host element) the render root also pins Fizz's host context so a
 * suspended root boundary still streams, and keeps every post-shell byte Fizz emits (hidden segments, completion
 * scripts) after `</div>` — outside the hydration container.
 */

// A script's `id` attribute and the global it installs are two different contracts — the id is how a later render finds
// and replaces the script it baked into a template, the global is how the client bundle reads its payload. For the env
// scripts they happen to be the same string, so they are bound rather than spelled twice; the super-store script's id
// deliberately differs from its global, which is why it carries its own literal.
export const ENV_CONSTS_SCRIPT_ID = POINT0_ENV_CONSTS_GLOBAL
export const ENV_VARS_SCRIPT_ID = POINT0_ENV_VARS_GLOBAL
export const DEHYDRATED_SUPER_STORE_SCRIPT_ID = '__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__'

/**
 * Engine-owned scripts a template may already carry (a built `dist/client/index.html` has the baked env-consts script
 * for static hosting) — the document render replaces them with fresh serve-time versions instead of duplicating.
 */
const ENGINE_OWNED_HEAD_SCRIPT_IDS = [
  ENV_CONSTS_SCRIPT_ID,
  ENV_VARS_SCRIPT_ID,
  DEHYDRATED_SUPER_STORE_SCRIPT_ID,
] as const

type EnvValues = Record<string, string | number | boolean | undefined>

function toJsonCompatibleEnv(env?: EnvValues): Record<string, string | number | boolean> {
  return JSON.parse(JSON.stringify(env ?? {})) as Record<string, string | number | boolean>
}

/**
 * The env-consts script body: defines `window.__POINT0_ENV_CONSTS__` and the `__POINT0_ENV_EXTEND_FN__` helper that
 * folds env values into `window.process.env` (what `@point0/core`'s env module reads on the client). Also used by the
 * build step that bakes build-time consts into the emitted `dist/client/index.html` for static hosting.
 */
export function buildEnvConstsScriptBody(envConsts?: EnvValues): string {
  return `const ${POINT0_ENV_CONSTS_GLOBAL} = ${uneval(toJsonCompatibleEnv(envConsts))};
window.${POINT0_ENV_CONSTS_GLOBAL} = ${POINT0_ENV_CONSTS_GLOBAL};
window.${POINT0_ENV_EXTEND_FN_GLOBAL} = function(values) {
  window.process = window.process || {};
  window.process.env = { ...(window.process.env || {}), ...values };
}
window.${POINT0_ENV_EXTEND_FN_GLOBAL}(${POINT0_ENV_CONSTS_GLOBAL});`
}

/** The env-vars script body — runtime values; consts win on key conflicts, so they are spread last. */
export function buildEnvVarsScriptBody(envVars?: EnvValues): string {
  return `const ${POINT0_ENV_VARS_GLOBAL} = ${uneval(toJsonCompatibleEnv(envVars))};
window.${POINT0_ENV_VARS_GLOBAL} = ${POINT0_ENV_VARS_GLOBAL};
window.${POINT0_ENV_EXTEND_FN_GLOBAL}({ ...${POINT0_ENV_VARS_GLOBAL}, ...(window.${POINT0_ENV_CONSTS_GLOBAL} || {}) });`
}

/**
 * The two env scripts as React elements for the top of `<head>`. Consts come first — they define
 * `__POINT0_ENV_EXTEND_FN__`, which the vars script calls. React keeps inline scripts in authored order (it only floats
 * metadata tags above them), and the entry bundle is a module/deferred script, so env values are always installed
 * before any app code runs.
 */
function envScriptElements({ envVars, envConsts }: { envVars?: EnvValues; envConsts?: EnvValues }): ReactNode[] {
  return [
    createElement('script', {
      id: ENV_CONSTS_SCRIPT_ID,
      key: 'p0-env-consts',
      dangerouslySetInnerHTML: { __html: buildEnvConstsScriptBody(envConsts) },
    }),
    createElement('script', {
      id: ENV_VARS_SCRIPT_ID,
      key: 'p0-env-vars',
      dangerouslySetInnerHTML: { __html: buildEnvVarsScriptBody(envVars) },
    }),
  ]
}

/**
 * Inject the client build identity into a document: `window.__POINT0_CLIENT_BUILD_VERSION__` (read by `@point0/core`'s
 * stale module to compare against the server's `x-point0-client-build` header and the `build-version.json` handshake)
 * plus, when the entry chunk is known, a reload-once guard for the initial load.
 *
 * Injected ONLY into the BUILT `dist` index.html (see `EngineClient.buildByBun` / `buildByVite`) — and from there it
 * reaches every serving mode for free: the static SPA serves that html directly, and the SSR document is assembled from
 * it (the parsed template's head scripts render verbatim, see ./document.ts). Dev never gets it — nothing is bundled,
 * so there is no build to be stale against. Like the env-consts bake, this is a FILE edit done with HTMLRewriter
 * (upsert: any existing copies of the two scripts are dropped, fresh ones are prepended to `<head>`).
 *
 * The guard covers the case the navigation-level stale handling cannot: a cached/stale document whose ENTRY script is
 * gone after a redeploy — the app never boots, so no navigation code runs. A capture-phase `error` listener (resource
 * load errors don't bubble, but they do capture) watches for THAT entry failing to load and reloads the document once
 * per build version (sessionStorage-guarded; when storage is unavailable it does nothing rather than risk a reload
 * loop). Third-party scripts failing never trigger it — only the exact entry path.
 */
export const CLIENT_BUILD_VERSION_SCRIPT_ID = POINT0_CLIENT_BUILD_VERSION_GLOBAL
export const STALE_ENTRY_GUARD_SCRIPT_ID = '__POINT0_STALE_ENTRY_GUARD__'
export async function addClientBuildToDocumentHtml({
  html,
  buildVersion,
  entryPublicPath,
}: {
  html: string
  buildVersion: string
  entryPublicPath: string | null
}): Promise<string> {
  const versionScript = `<script id="${CLIENT_BUILD_VERSION_SCRIPT_ID}">window.${POINT0_CLIENT_BUILD_VERSION_GLOBAL} = ${JSON.stringify(buildVersion)};</script>`
  const guardScript = entryPublicPath
    ? `<script id="${STALE_ENTRY_GUARD_SCRIPT_ID}">(function () {
  var entry = ${JSON.stringify(entryPublicPath)};
  var key = '__POINT0_STALE_ENTRY_RELOAD__:' + ${JSON.stringify(buildVersion)};
  window.addEventListener('error', function (event) {
    var el = event.target;
    if (!el || el === window || !el.tagName || el.tagName !== 'SCRIPT' || !el.src) return;
    var pathname;
    try { pathname = new URL(el.src, location.href).pathname; } catch (e) { return; }
    if (pathname !== entry) return;
    try {
      if (sessionStorage.getItem(key) !== null) return;
      sessionStorage.setItem(key, '1');
    } catch (e) { return; }
    location.reload();
  }, true);
})();</script>`
    : ''
  return await new HTMLRewriter()
    .on(`script[id="${CLIENT_BUILD_VERSION_SCRIPT_ID}"]`, {
      element(el) {
        el.remove()
      },
    })
    .on(`script[id="${STALE_ENTRY_GUARD_SCRIPT_ID}"]`, {
      element(el) {
        el.remove()
      },
    })
    .on('head', {
      element(el) {
        el.prepend(`${versionScript}${guardScript}`, { html: true })
      },
    })
    .transform(new Response(html))
    .text()
}

/**
 * Renders the document WITHOUT the app — the SPA shell: the template plus env scripts, with an empty root element.
 * Serves the `ssr: false` clients and the fallback when an SSR render throws. Same pipeline as the SSR document (one
 * mechanism, no string splicing), just with a fresh unhead instance holding only the template's own head input.
 */
export async function renderDocumentShellHtml({
  originalIndexHtml,
  envVars,
  envConsts,
  domRootElementId = 'root',
}: {
  originalIndexHtml: string
  envVars?: EnvValues
  envConsts?: EnvValues
  domRootElementId?: string
}): Promise<string> {
  const template = await parseDocumentTemplate(originalIndexHtml)
  const head = createHead()
  head.push(template.headInput, { _index: 0 })
  const documentElement = buildDocumentElement({
    template,
    resolvedHeadTags: resolveTags(head, { tagWeight: capoTagWeight }),
    app: undefined,
    domRootElementId,
    headStart: envScriptElements({ envVars, envConsts }),
    omitHeadScriptIds: ENGINE_OWNED_HEAD_SCRIPT_IDS,
  })
  const stream = await renderToReadableStream(documentElement)
  await stream.allReady
  return await readableStreamToString(stream)
}

/** Concatenate two byte chunks into one — used to lead the first streamed chunk with the document-shell prefix. */
function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
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
  envVars,
  envConsts,
  originalIndexHtml,
  domRootElementId = 'root',
  modulePreloads,
  resolveRscComponentPreloads,
}: {
  App: AppComponent
  executor: Executor
  pagePoint: PagePoint | undefined
  pageLocation: AnyLocation
  clientPoints: ClientPoints<any>
  envVars?: EnvValues
  envConsts?: EnvValues
  originalIndexHtml: string
  domRootElementId?: string
  modulePreloads?: string[]
  resolveRscComponentPreloads?: (componentNames: string[]) => Promise<string[]>
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
  const resolvedWaitForAllReady = waitForAllReady === 'auto' ? !shouldStreamSuspense : (waitForAllReady ?? false)
  const template = await parseDocumentTemplate(originalIndexHtml)

  const encoder = new TextEncoder()

  // one scope for both render and store/push serialization ensures consistency
  return await executor.withServerGlobalState(async () => {
    // The request's unhead instance already carries every `.head()` entry the discovery renders pushed. The template's
    // own head content joins as the LOWEST-priority entry (page values win; unhead dedupes/merges — this is
    // `transformHtmlTemplate`'s extraction semantics, minus scripts, which never go through unhead). Resolved BEFORE
    // the final render, exactly like the old string pipeline: `.head()` pushes from the final render itself are
    // ignored on the server.
    const serverHead = executor.serverStorageState.__POINT0_UNHEAD_SERVER_HEAD__
    serverHead.push(template.headInput, { _index: 0 })
    const resolvedHeadTags = resolveTags(serverHead, { tagWeight: capoTagWeight })

    // RSC: component points referenced by the payload get <link rel=modulepreload> in the document head, so the
    // browser fetches their chunks in parallel with the entry bundle instead of discovering them after decode.
    // Discovery is over, so the store already holds every reference the shell will carry (a query streaming in
    // post-shell delivers its references via the push script — decode starts those imports itself; no head link is
    // possible for content the head has already shipped past). Prod-build-only by the resolver's own gating.
    const rscComponentNames = collectRscComponentNames(superstore.dehydrate())
    const rscModulePreloads =
      rscComponentNames.length && resolveRscComponentPreloads
        ? await resolveRscComponentPreloads(rscComponentNames)
        : []
    const allModulePreloads = [
      ...(modulePreloads ?? []),
      ...rscModulePreloads.filter((f) => !modulePreloads?.includes(f)),
    ]

    const queryClient = _ss.__POINT0_QUERY_CLIENT__.get()

    // "Sent" = what the client receives inside the dehydrated store. When the page carries a dehydrated-state snapshot
    // query, the client's hydrated cache is exactly its INNER queries (taken at end of discovery, pending-filtered) —
    // a query that settled after that snapshot is in the raw server cache but NOT in the store, so it must be pushed.
    // Without a snapshot query the store dehydrates the raw cache, so everything non-pending counts as sent. Captured
    // at the SAME instant the store script serializes (it renders inside the shell) — the store and the push pump must
    // agree on one moment, or a query settling between the two would be silently lost from both.
    const sentQueryHashes = new Set<string>()
    let sentQueryHashesCaptured = false
    const captureSentQueryHashes = () => {
      if (sentQueryHashesCaptured) {
        return
      }
      sentQueryHashesCaptured = true
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
    }

    // The dehydrated super-store script, rendered as the LAST head element (see buildDocumentElement's order
    // rationale). It serializes at shell-render time — inside the same server-global-state scope, after discovery, so
    // it sees exactly the state the old string pipeline snapshotted. The tiny receiver ahead of the store buffers
    // streamed query pushes until `mount()` installs the real handler — inline push <script>s can execute both before
    // and after the bundle loads.
    const StoreScript = () => {
      captureSentQueryHashes()
      return createElement('script', {
        id: DEHYDRATED_SUPER_STORE_SCRIPT_ID,
        dangerouslySetInnerHTML: {
          __html: `window.${POINT0_PUSH_QUERY_BUFFER_GLOBAL} = [];
window.${POINT0_PUSH_QUERY_GLOBAL} = function (pushedQuery) { window.${POINT0_PUSH_QUERY_BUFFER_GLOBAL}.push(pushedQuery) };
window.${POINT0_PUSH_RSC_BUFFER_GLOBAL} = [];
window.${POINT0_PUSH_RSC_GLOBAL} = function (pushedRsc) { window.${POINT0_PUSH_RSC_BUFFER_GLOBAL}.push(pushedRsc) };
window.${POINT0_DEHYDRATED_SUPER_STORE_GLOBAL} = ${uneval(superstore.stringify(clientPoints.transformer))};`,
        },
      })
    }

    // The app renders as its OWN React root — the `#root` element itself, `<div id="root">{app}</div>` — NOT nested
    // inside the document `<html>` tree. React's `useId` encodes a component's position RELATIVE TO ITS RENDER ROOT,
    // and the client hydrates `#root` with the app as its root (react-dom/src/mount.ts). Rendering the app under the
    // full `<html><body>…` shell on the server would offset every `useId` by the shell's fork structure — a hydration
    // mismatch React 19.2 no longer patches up (visible as diverging Radix ids). So the app's render root and the
    // client's hydration root must be the same tree position: the `#root` element.
    //
    // Making `#root` (a host element) the root — rather than a bare app fragment — matters twice over: it pins the
    // host context so a suspended root boundary still streams (a bare suspended root makes Fizz withhold the whole
    // response), and it guarantees every post-shell byte Fizz emits (hidden segments, `$RC` completion scripts, and
    // our injected push/heartbeat scripts) lands AFTER `</div>`, outside the hydration container — never as stray
    // nodes inside `#root` that hydration would trip over. This stream carries `#root`'s own open and close tags; the
    // document shell around it (prefix `<!DOCTYPE html><html>…<body>…` up to the `#root` open tag, suffix the
    // template's post-`#root` body content…`</body></html>`) is rendered separately below and spliced on.
    const rootNode = findRootTemplateElement(template.bodyNodes, domRootElementId)
    if (!rootNode) {
      throw new Error(`Root element #${domRootElementId} not found in the <body> of the index.html template`)
    }
    const appRootElement = createElement(rootNode.tag, htmlAttrsToReactProps(rootNode.attrs), createElement(App))

    // Kick off the render; any randoms used during render happen now.
    const reactStream = await renderToReadableStream(appRootElement, {
      // Render errors that happen after the shell was sent (a throw inside a streamed Suspense
      // boundary) have no other server-side trace — log them. Failed streamed LOADERS never
      // reach this callback: their suspension resolves and the mountable's `.error()` streams in
      // place, with the failure logged through the query-error event pipeline. Providing onError
      // also replaces React's default console.error for shell errors — those still reject the
      // render promise and travel the usual SPA-fallback path.
      //
      // The throw's SSR effects are recovered first (throw/return parity — a thrown error's
      // `status` reaches the response while the effects are unsealed; sealed ones skip
      // silently). A redirect-carrying throw is control flow, not a failure: no error log —
      // during discovery it already became the real HTTP redirect, post-shell the client
      // boundary hops after hydration.
      onError: (error: unknown) => {
        const { redirectTask } = executor.applyRenderThrowSsrEffects(error)
        if (!redirectTask) {
          executor.logStreamRenderError(error)
        }
      },
    })
    if (resolvedWaitForAllReady) {
      await reactStream.allReady
    }

    // A redirect rendered INTO the final render's shell can still become the real HTTP redirect:
    // nothing has been sent yet — the pull-based response stream below hasn't even started.
    // Reachable only when discovery never saw the redirect (a zero / cut-short
    // `allowedDiscoveryRenders` budget — a discovered one was already handled by
    // `handleRedirectTask`). Same contract as during discovery: mark handled, throw, the
    // fetcher's catch answers with the 30x response. Only under the `'throw'` policy — the HTML
    // path always uses it; `'continue'` callers own their recursion and get no throw from here.
    // A redirect a streamed subtree renders POST-shell is not covered: the client hops after
    // hydration.
    const redirectTaskHolder = _ss.__POINT0_SSR_REDIRECT_TASK__.get()
    if (redirectPolicy === 'throw' && redirectTaskHolder && !redirectTaskHolder.handled) {
      redirectTaskHolder.handled = true
      throw redirectTaskHolder.task
    }

    // The app's shell is rendered and no redirect fired — now materialize the document shell around it. Rendering the
    // shell as its own `<html>` tree (a) prepends `<!DOCTYPE html>` for free (React emits it for an `<html>` root),
    // and (b) renders the StoreScript HERE, so `captureSentQueryHashes` snapshots the super-store at ONE instant in
    // this same server-global scope — exactly what the old single-tree render did when its `<head>` rendered. The
    // `#root` element is a bare outlet marker; splitting the string on it yields the prefix (up to, excluding, the
    // outlet) and suffix (from just after it), between which the pump splices the app stream that renders the real
    // `<div id="root">…</div>`. Anything settling after this snapshot is streamed by the pump (never double-sent — the
    // shared `sentQueryHashes` set already excludes it).
    const shellElement = buildDocumentElement({
      template,
      resolvedHeadTags,
      app: undefined,
      domRootElementId,
      headStart: envScriptElements({ envVars, envConsts }),
      headEnd: [createElement(StoreScript, { key: 'p0-store' })],
      modulePreloads: allModulePreloads,
      omitHeadScriptIds: ENGINE_OWNED_HEAD_SCRIPT_IDS,
      rootOutletTag: SSR_ROOT_OUTLET_TAG,
    })
    const shellStream = await renderToReadableStream(shellElement)
    await shellStream.allReady
    const shellHtml = await readableStreamToString(shellStream)
    const outletIndex = shellHtml.indexOf(SSR_ROOT_OUTLET_MARKUP)
    if (outletIndex === -1) {
      // buildDocumentElement throws on 0/>1 root matches, so exactly one outlet is always present — unreachable, but a
      // missing seam would silently drop the app, so fail loud rather than serve a rootless document.
      throw new Error('The document shell is missing the app-root outlet marker')
    }
    if (outletIndex !== shellHtml.lastIndexOf(SSR_ROOT_OUTLET_MARKUP)) {
      // React can never emit the literal marker twice from the tree (element text is escaped), but a template `<script>`
      // body renders verbatim — a copy of the marker string BEFORE `#root` would splice the app inside that script.
      // One comparison turns that into a loud failure instead of a silently broken document.
      throw new Error('The document shell contains the app-root outlet marker more than once')
    }
    const prefixBytes = encoder.encode(shellHtml.slice(0, outletIndex))
    // The suffix is the template's post-`#root` body content (e.g. the entry `<script type="module">`, which the app
    // stream and its trailing scripts precede) through `</body></html>`. On a STREAMED page in dev (no preload
    // manifest — prod-build-only) the browser therefore discovers the entry URL only at stream end; harmless (module
    // scripts defer to document EOF regardless), just a slightly later download than the head `modulepreload` gives in
    // prod. `#root`'s own close tag is NOT here — the app stream carries it.
    const suffixBytes = encoder.encode(shellHtml.slice(outletIndex + SSR_ROOT_OUTLET_MARKUP.length))

    // Streamed query push-hydration. The dehydrated store was snapshotted at shell-render time (just above): queries
    // settled by then are IN the store, but a streamed query is still SUSPENDED then, so its data is NOT — without this
    // the client would silently refetch after hydration and flash the streamed content. Every React flush after the
    // shell is a resolved Suspense boundary; prepending the newly
    // settled query states to that same chunk guarantees the data <script> executes (in document order) before
    // React's reveal script and before the revealed content hydrates — the client's useQuery finds the data in cache.
    // Both success AND error states are pushed: a failed streamed loader streams the mountable's `.error()` in place,
    // so the client cache must hold the same error state — otherwise the hydrated boundary would mismatch (server
    // shows `.error()`, client cache says pending). Errors travel through the same projection the store uses (public
    // in production).
    const ErrorClass = clientPoints.manager.root._Error
    const collectNewlySettledQueryScripts = (): string | undefined => {
      captureSentQueryHashes()
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
          `<script>window.${POINT0_PUSH_QUERY_GLOBAL}(${uneval(clientPoints.transformer.stringify(payload))})</script>`,
        )
      }
      return scripts.length > 0 ? scripts.join('') : undefined
    }

    // Deferred RSC holes (see `defer`): as each subtree resolves it is pushed into the same response — the exact analog
    // of the query push above, on its own `__POINT0_PUSH_RSC__` channel. Prepended to the chunk that reveals the hole's
    // Suspense boundary, so the fill lands in the client hole registry before React reveals the content and hydration
    // matches. `undefined` when the page never used `defer` (no registry, or nothing resolved since the last flush).
    const holeRegistry = _ss.__POINT0_RSC_HOLES__.get()
    // Cast like `Engine.getEmit` does — a specific `_emit` doesn't unify with `EventerEmitFn`'s erased param type.
    const rscEmit = clientPoints.manager.root._emit.bind(clientPoints.manager.root) as EventerEmitFn<ErrorPoint0>
    const collectNewlyResolvedHoleScripts = (): string | undefined => {
      if (!holeRegistry) {
        return undefined
      }
      const scripts: string[] = []
      for (const entry of holeRegistry.takeResolved()) {
        // A failed subtree is observable server-side via `rscError` before its error state streams to the client.
        emitHoleError(rscEmit, entry, ErrorClass)
        // The same push payload the client-fetch NDJSON framing writes (a failed subtree carries its error's public
        // projection so the client hole slot re-throws it to the nearest boundary) — here wrapped in an inline script.
        const payload = buildHolePushPayload(entry, ErrorClass)
        scripts.push(
          `<script>window.${POINT0_PUSH_RSC_GLOBAL}(${uneval(clientPoints.transformer.stringify(payload))})</script>`,
        )
      }
      return scripts.length > 0 ? scripts.join('') : undefined
    }

    // In streaming mode, the first flushed chunk is the shell leaving the process — from that
    // moment a still-running loader can no longer redirect or change cookies/headers/status. Seal
    // the effects so late writes warn instead of disappearing silently (`Effects.sealed` itself
    // is the idempotency guard — re-sealing would only rewrite the same reason).
    const sealEffectsOnFirstChunk = () => {
      if (resolvedWaitForAllReady || executor.effects.sealed) {
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
    //
    // Push scripts (and heartbeats) are injected ONLY at FLUSH BOUNDARIES — before a chunk the reader actually had to
    // WAIT for. Fizz emits one flush as a synchronous BURST of enqueues whose boundaries can fall anywhere in the
    // markup — even mid-<script> (observed on the vite dev document: a push script prepended to a burst chunk landed
    // inside the dehydrated-store script and killed it with a JS parse error). A read that resolves without waiting is
    // the same burst still draining — pass it through untouched; a read we waited for starts a fresh flush, so its
    // front is a safe injection point. A fill's reveal always arrives in a LATER flush than the fill settles
    // (the hole slot's Suspense retry is a new Fizz task), so the fill script still precedes its boundary reveal.
    // Nothing is ever injected before the FIRST chunk — it opens with `<!DOCTYPE html>`, and the store script inside
    // the shell already carries everything settled up to that point.
    const reactStreamReader = reactStream.getReader()
    let firstChunkSent = false
    let atFlushBoundary = false
    // One in-flight React read survives a heartbeat-interrupted wait — a beat must not issue a SECOND read (reads
    // would queue and deliver chunks out of order with the beats).
    let pendingRead: ReturnType<typeof reactStreamReader.read> | undefined
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        const read = (pendingRead ??= reactStreamReader.read())
        // Already-queued data (a burst still draining) wins this race via its earlier-queued microtask; an empty
        // queue means we are about to WAIT — a flush boundary.
        const readWasQueued = await Promise.race([read.then(() => true), Promise.resolve().then(() => false)])
        if (!readWasQueued) {
          atFlushBoundary = true
          if (firstChunkSent) {
            // Heartbeat while React has nothing to flush (a slow suspended query / deferred hole): a no-op script
            // every RSC_STREAM_HEARTBEAT_MS keeps the socket non-idle past Bun's default 10s idleTimeout and proxy
            // idle windows. Injected through the same channel as the push scripts, and only AFTER the shell — nothing
            // may precede `<!DOCTYPE html>` (silence BEFORE the shell is an ordinary slow request, the same class as
            // any non-streamed slow response).
            while (await raceIsTimeout(read, RSC_STREAM_HEARTBEAT_MS)) {
              controller.enqueue(encoder.encode('<script></script>'))
            }
          }
        }
        const { done, value } = await read
        pendingRead = undefined
        if (done) {
          // Defensive: React always emits at least the root element, so the prefix has already led a first chunk by
          // now — but if the app stream closed empty, still frame the document so the response is a whole page.
          if (!firstChunkSent) {
            firstChunkSent = true
            sealEffectsOnFirstChunk()
            controller.enqueue(prefixBytes)
          }
          // A query or hole can settle without producing another React flush (e.g. a blocking render
          // that arrived as one chunk) — drain the leftovers before closing. These trailing scripts land after the
          // app stream (outside `#root`), and the buffer stubs capture them pre-hydration.
          const pushScripts = collectNewlySettledQueryScripts()
          if (pushScripts) {
            controller.enqueue(encoder.encode(pushScripts))
          }
          const holeScripts = collectNewlyResolvedHoleScripts()
          if (holeScripts) {
            controller.enqueue(encoder.encode(holeScripts))
          }
          // The shell suffix (the template's post-`#root` body content through `</html>`) closes the document last —
          // after the app stream (which already emitted `#root`'s `</div>`) and its trailing push/hole scripts.
          controller.enqueue(suffixBytes)
          controller.close()
          return
        }
        if (!firstChunkSent) {
          firstChunkSent = true
          // the shell may continue in this same burst — a pre-shell wait must not authorize an injection into it
          atFlushBoundary = false
          sealEffectsOnFirstChunk()
          // The shell prefix (doctype through just before `#root`) LEADS the first app chunk, in one enqueue so
          // nothing can precede `<!DOCTYPE html>` and no injection can wedge between the prefix and the app's opening.
          controller.enqueue(concatBytes(prefixBytes, value))
          return
        }
        if (atFlushBoundary) {
          atFlushBoundary = false
          const pushScripts = collectNewlySettledQueryScripts()
          if (pushScripts) {
            controller.enqueue(encoder.encode(pushScripts))
          }
          const holeScripts = collectNewlyResolvedHoleScripts()
          if (holeScripts) {
            controller.enqueue(encoder.encode(holeScripts))
          }
        }
        controller.enqueue(value)
      },
      cancel(reason) {
        void reactStreamReader.cancel(reason)
      },
    })
  })
}

import { _point0_env } from './env.js'
import type { ErrorPoint0 } from './error.js'
import { log } from './logger.js'
import {
  getClientBuildVersionRoutePath,
  POINT0_CLIENT_BUILD_HEADER,
  POINT0_CLIENT_BUILD_VERSION_GLOBAL,
} from './protocol.js'

/**
 * Stale client build — deploy invalidation.
 *
 * After a redeploy the client chunk hashes change. A tab that was loaded before the deploy still holds the OLD chunk
 * URLs; its next client navigation dynamic-imports a chunk that no longer exists on the server (404, or an HTML
 * fallback served with a non-JS MIME type). This module carries the shared contract and the client-side machinery that
 * detects that situation and lets the navigation layer recover from it:
 *
 * - The build writes `<outdir>/_point0/<scope>/build-version.json` (see `@point0/engine`'s client-build-version) and
 *   injects the same version into the HTML as `window.__POINT0_CLIENT_BUILD_VERSION__` — so every loaded document knows
 *   which client build it runs.
 * - The server echoes the version on every response it can attribute to a client scope via the
 *   {@link POINT0_CLIENT_BUILD_HEADER} header (`<scope>:<version>`). The client's fetch layer calls
 *   {@link noticeClientBuildHeaderFromResponse} on every response — a mismatch marks the build stale, and the NEXT
 *   client navigation downgrades to a full document navigation.
 * - When a page chunk fails to load during navigation, the navigation layer confirms staleness against the
 *   `build-version.json` (fetched fresh, never cached) via {@link fetchLatestClientBuildVersion} — a confirmed new
 *   version means "recover by document navigation", an unchanged version means "real network error, surface it".
 *
 * Everything here is inert in dev and on the server: no version is injected (nothing is bundled), so every check
 * resolves to "unknown" and the navigation behaves exactly as before.
 */

// The wire vocabulary this module speaks lives in `protocol.ts`; re-exported here (and so through
// `@point0/core/navigation`) because that is where consumers have always imported it from.
export { getClientBuildVersionRoutePath, POINT0_CLIENT_BUILD_HEADER }

/** Build the {@link POINT0_CLIENT_BUILD_HEADER} value — the parsing counterpart is {@link compareClientBuildHeaderValue}. */
export const buildClientBuildHeaderValue = ({ scope, buildVersion }: { scope: string; buildVersion: string }): string =>
  `${scope}:${buildVersion}`

/** A navigation-level reaction to a confirmed-stale client build. */
export type StaleReaction = 'navigate' | 'error'

/** What a {@link StaleFn} receives — everything known about the stale situation at decision time. */
export type StaleContext = {
  /** The navigation target (resolved href) the user was heading to. */
  to: string
  /**
   * The page-chunk load error that triggered the check, when there was one. `undefined` when the build was already
   * known stale (header mismatch noticed earlier) and the navigation is deciding BEFORE loading anything.
   */
  error: ErrorPoint0 | undefined
  /** The build version this tab runs (from the HTML it was loaded with), if known. */
  clientBuildVersion: string | undefined
  /** The build version currently served (from the header or the fresh `build-version.json`), if known. */
  latestBuildVersion: string | undefined
}

/**
 * Custom stale handler. Return `'navigate'` to let the framework finish with a full document navigation to the target
 * (loop-guarded), `'error'` to surface the classified error through the normal navigation error path (the page's
 * `.error()`), or nothing to take full ownership — the framework then neither navigates nor commits the failed
 * client-side navigation (the user stays on the current page).
 */
export type StaleFn = (
  ctx: StaleContext,
) => StaleReaction | undefined | void | Promise<StaleReaction | undefined | void>

/**
 * Policy for handling a stale client build during navigation, configured via `createNavigation({ stale })`:
 *
 * - `'navigate'` (default) — recover with a full document navigation to the SAME target the user clicked: they land where
 *   they wanted, on fresh HTML with fresh chunks. Guarded against reload loops (once per new build version).
 * - `'error'` — never auto-navigate; the failure surfaces through the normal error path as an error coded
 *   `POINT0_STALE_CLIENT_BUILD`, so the app's `.error()` can render "a new version is available".
 * - `'off'` — disable the reaction entirely (detection still runs; behavior matches the pre-feature framework).
 * - A {@link StaleFn} — full control (e.g. show your own UI), optionally delegating back by returning a reaction.
 *
 * Full reference: https://1gr14.dev/point0/latest/navigation
 */
export type StalePolicy = StaleReaction | 'off' | StaleFn

/**
 * Resolve a {@link StalePolicy} into the concrete reaction for one stale situation. A custom {@link StaleFn} returning
 * nothing means `'handled'` — the caller must back off entirely (no navigation, no error commit). `'off'` never reaches
 * this point (callers skip stale handling altogether); mapped to `'error'` defensively.
 */
export const resolveStaleReaction = async ({
  policy,
  ctx,
}: {
  policy: StalePolicy
  ctx: StaleContext
}): Promise<StaleReaction | 'handled'> => {
  if (typeof policy === 'function') {
    const result = await policy(ctx)
    return result ?? 'handled'
  }
  return policy === 'off' ? 'error' : policy
}

declare global {
  interface Window {
    /** The client build version injected into the HTML by the build / SSR render. Absent in dev. */
    [POINT0_CLIENT_BUILD_VERSION_GLOBAL]?: string
  }
}

/** The build version this tab runs — injected into the HTML the document was loaded with. `undefined` in dev / SSR. */
export const getClientBuildVersion = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }
  const version = window[POINT0_CLIENT_BUILD_VERSION_GLOBAL]
  return typeof version === 'string' && version.length > 0 ? version : undefined
}

/**
 * Browser-tab-local stale state. Module-local on purpose: it describes THIS loaded document (its build version can
 * never change without a document load), never exists on the server, and must survive across navigation contexts — a
 * plain module variable is the honest storage.
 */
let staleClientBuildState: { latestBuildVersion: string } | undefined

/** Mark this tab's client build as stale — a newer build was seen on the server. Idempotent. */
export const markClientBuildStale = ({ latestBuildVersion }: { latestBuildVersion: string }): void => {
  if (staleClientBuildState?.latestBuildVersion === latestBuildVersion) {
    return
  }
  staleClientBuildState = { latestBuildVersion }
  log({
    level: 'info',
    category: ['navigation', 'stale'],
    message: `A newer client build "${latestBuildVersion}" was deployed (this tab runs "${getClientBuildVersion() ?? 'unknown'}"); the next client navigation will be a full document navigation`,
  })
}

/** The stale mark set by {@link markClientBuildStale}, or `undefined` while this tab's build matches the server. */
export const getStaleClientBuildState = (): { latestBuildVersion: string } | undefined => staleClientBuildState

/** Test-only reset of the tab-local stale mark. */
export const _resetStaleClientBuildState = (): void => {
  staleClientBuildState = undefined
}

/**
 * Compare a {@link POINT0_CLIENT_BUILD_HEADER} value against this client's scope + version. Pure — the decision is unit
 * testable. `'unknown'` means "not comparable" (no header, foreign scope, or this tab has no version): never treat it
 * as a mismatch.
 */
export const compareClientBuildHeaderValue = ({
  headerValue,
  scope,
  clientBuildVersion,
}: {
  headerValue: string | null | undefined
  scope: string | undefined
  clientBuildVersion: string | undefined
}): { result: 'match' | 'mismatch' | 'unknown'; latestBuildVersion?: string } => {
  if (!headerValue || !scope || !clientBuildVersion) {
    return { result: 'unknown' }
  }
  const separatorIndex = headerValue.indexOf(':')
  if (separatorIndex <= 0) {
    return { result: 'unknown' }
  }
  const headerScope = headerValue.slice(0, separatorIndex)
  const headerVersion = headerValue.slice(separatorIndex + 1)
  if (headerScope !== scope || !headerVersion) {
    return { result: 'unknown' }
  }
  return headerVersion === clientBuildVersion
    ? { result: 'match' }
    : { result: 'mismatch', latestBuildVersion: headerVersion }
}

/**
 * Client-side, called by the fetch layer on every server response: read the build header and mark this tab stale on a
 * confirmed mismatch for our own scope. Never throws; free when the header is absent (dev, foreign servers).
 */
export const noticeClientBuildHeaderFromResponse = ({
  response,
  scope,
}: {
  response: Response
  scope: string | undefined
}): void => {
  if (!_point0_env.side.is.client) {
    return
  }
  const comparison = compareClientBuildHeaderValue({
    headerValue: response.headers.get(POINT0_CLIENT_BUILD_HEADER),
    scope,
    clientBuildVersion: getClientBuildVersion(),
  })
  if (comparison.result === 'mismatch' && comparison.latestBuildVersion) {
    markClientBuildStale({ latestBuildVersion: comparison.latestBuildVersion })
  }
}

/**
 * Fetch the currently served build version for a scope from its `build-version.json` — always over the network (`cache:
 * 'no-store'`), from the same origin the document lives on (the file is emitted into the client build output, so it is
 * served wherever the chunks are). `undefined` on any failure — offline, 404 (dev, pre-feature build), or a malformed
 * file — so callers treat "can't confirm" as "not stale".
 */
export const fetchLatestClientBuildVersion = async ({ scope }: { scope: string }): Promise<string | undefined> => {
  if (typeof window === 'undefined') {
    return undefined
  }
  try {
    const response = await fetch(getClientBuildVersionRoutePath(scope), { cache: 'no-store' })
    if (!response.ok) {
      return undefined
    }
    const parsed: unknown = await response.json()
    const buildVersion = (parsed as { buildVersion?: unknown } | null)?.buildVersion
    return typeof buildVersion === 'string' && buildVersion.length > 0 ? buildVersion : undefined
  } catch {
    return undefined
  }
}

const STALE_RELOAD_STORAGE_KEY_PREFIX = '__POINT0_STALE_RELOAD__:'

/**
 * Reload-loop guard: allow ONE document navigation per new build version (the React Router pattern — keyed by version,
 * not a bare boolean, so every future deploy gets its own fresh attempt). Returns `true` and records the attempt when
 * this version was not tried yet; `false` when a document load for it already happened — the caller must then surface
 * the error instead of navigating again. `sessionStorage` scoping is exactly right: per-tab, survives the document
 * navigation, gone when the tab closes.
 */
export const shouldAttemptStaleReload = ({ latestBuildVersion }: { latestBuildVersion: string }): boolean => {
  const key = `${STALE_RELOAD_STORAGE_KEY_PREFIX}${latestBuildVersion}`
  try {
    if (window.sessionStorage.getItem(key) !== null) {
      return false
    }
    window.sessionStorage.setItem(key, new Date().toISOString())
    return true
  } catch {
    // Storage unavailable (private mode, quota): no guard is possible, and reloading without one risks a loop — the
    // version check above us ("only when the version actually changed") is still in place, so allow the attempt.
    return true
  }
}

/**
 * Leave the SPA with a full document navigation to `href` — fresh HTML, fresh chunks. `assign` (not `replace`): the
 * current page stays in history, exactly like a normal navigation.
 *
 * `href` is a browser document URL (the standard path-based location hook produces exactly that). When the target
 * differs from the current URL only in the hash — or not at all — `assign` would NOT fetch a new document (a hash
 * change just scrolls), so the URL is written first and the document is force-reloaded. Apps on a non-path location
 * scheme (a hash-based or memory location hook) should handle staleness themselves via a custom `stale` function —
 * their SPA hrefs are not document URLs.
 */
export const documentNavigate = (href: string): void => {
  const target = new URL(href, window.location.href)
  if (target.pathname === window.location.pathname && target.search === window.location.search) {
    if (target.href !== window.location.href) {
      // Write the hash without triggering a scroll-then-no-reload `assign`; `replaceState` keeps one history entry for
      // what is, after the reload below, one navigation.
      window.history.replaceState(null, '', target.href)
    }
    window.location.reload()
    return
  }
  window.location.assign(target.href)
}

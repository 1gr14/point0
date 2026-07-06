import type { AnyLocation } from '@1gr14/route0'
import { useEffect, useRef } from 'react'
import { getClientPoints } from './helpers.js'
import { useLocation, useNavigationHelpers } from './navigation.js'
import type { ScrollConfig, ScrollPositionRestoreType } from './types.js'
import {
  defaultScrollPositionRestorePolicy,
  singletonize,
  windowScrollPositionGetter,
  windowScrollPositionSetter,
} from './utils.js'

// --- Scroll restoration --------------------------------------------------------
// Centralized in the router (mount <ScrollRestoration/> once) instead of a
// per-page effect. On a pathname change it applies the entering page's restore
// policy. Default: a new navigation (push) scrolls to the top; back/forward
// (pop) restores the saved position. Per-page `.scrollPosition()` /
// `.scrollRestore()` still apply. Search-only changes (e.g. setSearch) keep the
// scroll untouched. Leaving positions are captured while the leaving page is
// still mounted — continuously on scroll plus right before a programmatic
// commit (see saveScrollPositionForLocation) — never after the location change.
//
// The public surface (ScrollRestoration, useScrollRestoration, the scrollToHash
// policy types and resolvers) is re-exported from navigation.tsx. The signal
// singletons and capture helpers are exported for navigation.tsx's commit path
// only — internal, deliberately not part of that re-export.
const scrollPositionsByHref = singletonize('Point0ScrollPositionsByHref', new Map<string, { x: number; y: number }>())
// Hard (instant) vs smooth scrolling to a #hash element.
export type ScrollToHashBehavior = 'hard' | 'smooth'
/**
 * Scroll-to-hash policy. Usable both globally (`createNavigation({ scrollToHash })`) and per-call on `navigate` /
 * `Link` / `redirect` (where it overrides the global one for that navigation — handy because a link may resolve to the
 * current page or a different one):
 *
 * - `false` / `'none'` — never jump to the hash
 * - `'pushHard'` — hard jump on a cross-page (push) navigation only
 * - `'pushHardCurrentSmooth'` / `true` (default) — hard on push, smooth on a current-page (#anchor) navigation
 * - `'pushHardCurrentHard'` — hard on both
 *
 * `current` is a navigation to the same pathname (an in-page anchor). Named `current` (not `same`) to avoid clashing
 * with the NavLink `same` state. Back/forward (pop) never jumps to the hash — the scroll position is restored.
 */
export type ScrollToHashPolicy = boolean | 'none' | 'pushHard' | 'pushHardCurrentSmooth' | 'pushHardCurrentHard'
export type ResolvedScrollToHashPolicy = { push?: ScrollToHashBehavior; current?: ScrollToHashBehavior }
export const resolveScrollToHashPolicy = (policy: ScrollToHashPolicy | undefined): ResolvedScrollToHashPolicy => {
  const normalized =
    policy === true ? 'pushHardCurrentSmooth' : policy === false || policy === undefined ? 'none' : policy
  switch (normalized) {
    case 'pushHard':
      return { push: 'hard' }
    case 'pushHardCurrentSmooth':
      return { push: 'hard', current: 'smooth' }
    case 'pushHardCurrentHard':
      return { push: 'hard', current: 'hard' }
    case 'none':
    default:
      return {}
  }
}
// Behavior for one navigation: per-call overrides the global default, then pick
// the trigger ('push' for cross-page, 'current' for a current-page #hash jump).
export const resolveScrollToHashBehavior = (
  perCall: ScrollToHashPolicy | undefined,
  globalPolicy: ScrollToHashPolicy | undefined,
  trigger: 'push' | 'current',
): ScrollToHashBehavior | undefined => {
  return resolveScrollToHashPolicy(perCall ?? globalPolicy)[trigger]
}

// Per-navigation scrollToHash override, set by navigateWithTransitions immediately before the
// adapter commit of a cross-page navigation (see the no-leak reasoning at scrollRestorationSignal)
// and consumed (cleared) by the scroll manager. `undefined` → fall back to the global default.
export const scrollToHashSignal = singletonize('Point0ScrollToHashSignal', {
  override: undefined as ScrollToHashPolicy | undefined,
})

const getScrollConfigForLocation = (location: AnyLocation): ScrollConfig => {
  try {
    const config = getClientPoints()._getPageScrollConfigByHref(location.hrefRel)
    if (config) {
      return config
    }
  } catch {
    // no client points / no matching page (e.g. 404) — fall back to window scroll
  }
  return {
    getter: windowScrollPositionGetter,
    setter: windowScrollPositionSetter,
    policy: defaultScrollPositionRestorePolicy,
  }
}

// Remember `location`'s current scroll position for a later pop restore. Must run while that
// page's DOM is still mounted: once a shorter page replaces it, the browser has already clamped
// the scroll and the read is wrong. Hence the call sites — continuously on scroll events, right
// before the adapter commit for a programmatic navigation, on pagehide for a reload — and never
// the location effect, which runs after the new page rendered. (The continuous capture is what
// covers back/forward: React flushes a popstate's render and effects synchronously inside the
// history adapter's own popstate listener, so by the time any listener of ours fires the old
// page is gone and the restore has already run — the position must already be in the map.)
export const saveScrollPositionForLocation = (location: AnyLocation): void => {
  const position = getScrollConfigForLocation(location).getter()
  if (position) {
    scrollPositionsByHref.set(location.hrefRel, position)
  }
}

// Jump to the element matching the URL hash, like a native browser fragment
// navigation. Returns false if the element is not in the DOM (yet).
const scrollToHashElement = (hash: string, behavior: ScrollToHashBehavior): boolean => {
  if (typeof document === 'undefined') {
    return false
  }
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  if (!id) {
    return false
  }
  const element = document.getElementById(id)
  if (!element) {
    return false
  }
  // `'instant'` (not `'auto'`) so a hard jump stays hard even if CSS sets
  // `scroll-behavior: smooth`.
  element.scrollIntoView({ behavior: behavior === 'smooth' ? 'smooth' : 'instant' })
  return true
}
// The target page's content may render a frame or two after the navigation
// commits (async data). Keep retrying for a few frames until the element shows up.
const retryScrollToHashElement = (hash: string, behavior: ScrollToHashBehavior, attemptsLeft: number): void => {
  if (typeof window === 'undefined' || attemptsLeft <= 0) {
    return
  }
  window.requestAnimationFrame(() => {
    if (!scrollToHashElement(hash, behavior)) {
      retryScrollToHashElement(hash, behavior, attemptsLeft - 1)
    }
  })
}
// Jump to the hash element now if it exists, otherwise keep trying for a few
// frames (the page content may render a tick later after an async navigation).
export const scrollToHashElementWithRetry = (hash: string, behavior: ScrollToHashBehavior): void => {
  if (!scrollToHashElement(hash, behavior)) {
    retryScrollToHashElement(hash, behavior, 5)
  }
}

const isNearScrollPosition = (a: { x: number; y: number }, b: { x: number; y: number }): boolean =>
  Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1
const retryRestoreScrollPosition = (
  config: ScrollConfig,
  position: { x: number; y: number },
  attemptsLeft: number,
): void => {
  if (typeof window === 'undefined' || attemptsLeft <= 0) {
    return
  }
  // What the last apply actually achieved (post-clamp). If by the next frame the position is
  // anything else, something other than clamping moved the scroll (the user, an anchor jump) —
  // back off for good instead of fighting it.
  const applied = config.getter()
  window.requestAnimationFrame(() => {
    const current = config.getter()
    if (!current || !applied) {
      return
    }
    if (isNearScrollPosition(current, position)) {
      return
    }
    if (!isNearScrollPosition(current, applied)) {
      return
    }
    config.setter(position)
    retryRestoreScrollPosition(config, position, attemptsLeft - 1)
  })
}
// Apply a remembered scroll position, re-applying when it doesn't stick — a scroll past the
// current document height is silently clamped, and the entering page's content may need time to
// reach its full height (async data, images). Keeps trying for up to ~1s (60 frames), but backs
// off the moment anything else moves the scroll, so it never wrestles the user.
const restoreScrollPosition = (config: ScrollConfig, position: { x: number; y: number }): void => {
  config.setter(position)
  retryRestoreScrollPosition(config, position, 60)
}

// Scroll-manager signals, set by `navigateWithTransitions` immediately before the adapter
// navigate commits a cross-page location change and consumed (cleared) by the scroll manager's
// location effect. Set at the commit rather than when the navigation starts, so an aborted or
// superseded navigation (external target, redirect found, another navigate started) returns
// before ever touching them and can't leak stale state into an unrelated location change — e.g.
// a back/forward that lands while a slow prefetch is still in flight.
// - `programmaticPush`: push vs pop. A flagged change is a push → scroll to top / #hash. An
//   unflagged one is a pop → restore the saved position: back/forward arrive via popstate and
//   never pass through `navigateWithTransitions`.
// - `captureSuspended`: pauses the continuous scroll capture between the commit and the location
//   effect. When the entering page is shorter, its very first render clamps the scroll and fires
//   a scroll event; without the pause that event would overwrite the leaving page's remembered
//   position with the clamped one.
export const scrollRestorationSignal = singletonize('Point0ScrollRestorationSignal', {
  programmaticPush: false,
  captureSuspended: false,
})

// The History API may be missing or partial outside the browser (React Native / Expo, some
// embeddings). Everything that touches it is guarded so scroll restoration degrades to a no-op
// there instead of throwing.
const scrollHistoryApiAvailable = (): boolean => typeof window !== 'undefined' && typeof window.history !== 'undefined'

// `sessionStorage` can be absent or throw on access (Expo, privacy mode, sandboxed iframes).
const getScrollSessionStorage = (): Storage | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- sessionStorage isn't guaranteed at runtime (Expo, sandboxed iframe)
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : undefined
  } catch {
    return undefined
  }
}
const scrollSessionKey = '__point0ScrollPositions__'
// The in-memory map is lost on reload; persisting it lets a reload restore the scroll the browser
// no longer restores for us under `scrollRestoration = 'manual'`.
const loadScrollPositionsFromSession = (): void => {
  const storage = getScrollSessionStorage()
  if (!storage) {
    return
  }
  try {
    const raw = storage.getItem(scrollSessionKey)
    if (!raw) {
      return
    }
    const parsed = JSON.parse(raw) as Record<string, { x: number; y: number }>
    for (const [href, pos] of Object.entries(parsed)) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- parsed JSON isn't guaranteed to match the asserted type
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        scrollPositionsByHref.set(href, pos)
      }
    }
  } catch {
    // corrupt or unavailable — ignore
  }
}
const saveScrollPositionsToSession = (): void => {
  const storage = getScrollSessionStorage()
  if (!storage) {
    return
  }
  try {
    storage.setItem(scrollSessionKey, JSON.stringify(Object.fromEntries(scrollPositionsByHref)))
  } catch {
    // quota or unavailable — ignore
  }
}

// How the current document was loaded — 'reload' / 'back_forward' restore the remembered scroll,
// a plain 'navigate' with a #hash is a deep link (the hash wins). Guarded: `undefined` where the
// Performance API isn't available.
const getInitialNavigationType = (): string | undefined => {
  try {
    if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
      return undefined
    }
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    return entries.length > 0 ? entries[0].type : undefined
  } catch {
    return undefined
  }
}

export const useScrollRestoration = (): void => {
  const location = useLocation()
  const { scrollToHash } = useNavigationHelpers()
  const prevLocationRef = useRef<AnyLocation | null>(null)

  // Take scroll restoration away from the browser. With the default (`'auto'`), a back/forward to a
  // URL that carries a `#hash` makes the browser jump to that fragment instead of restoring the
  // remembered scroll position. With `'manual'` the browser does nothing on history traversal (incl.
  // reload) and this hook is the single source of truth. Guarded — no-op where the History API /
  // `scrollRestoration` aren't available (SSR, React Native / Expo).
  useEffect(() => {
    if (!scrollHistoryApiAvailable() || !('scrollRestoration' in window.history)) {
      return
    }
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  // Keep the current page's remembered position fresh, while its DOM is still mounted (see
  // saveScrollPositionForLocation):
  // - scroll (capture phase, so container scrolls are seen too): the continuous capture — this is
  //   what a back/forward restores from. Skipped while `captureSuspended` (see the signal).
  // - pagehide: reload / tab close / bfcache — capture once more and persist the map, so the next
  //   document (whose in-memory map starts empty) can restore. That snapshot is rehydrated here
  //   on mount, before the main effect below runs its initial restore.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    loadScrollPositionsFromSession()
    const capture = () => {
      if (prevLocationRef.current) {
        saveScrollPositionForLocation(prevLocationRef.current)
      }
    }
    const captureOnScroll = () => {
      if (!scrollRestorationSignal.captureSuspended) {
        capture()
      }
    }
    const persist = () => {
      capture()
      saveScrollPositionsToSession()
    }
    window.addEventListener('scroll', captureOnScroll, { capture: true, passive: true })
    window.addEventListener('pagehide', persist)
    return () => {
      window.removeEventListener('scroll', captureOnScroll, { capture: true })
      window.removeEventListener('pagehide', persist)
    }
  }, [])

  useEffect(() => {
    const prevLocation = prevLocationRef.current
    prevLocationRef.current = location
    // Push (programmatic cross-page navigate) vs pop (back / forward / reload). See scrollRestorationSignal.
    const type: ScrollPositionRestoreType = scrollRestorationSignal.programmaticPush ? 'push' : 'pop'
    scrollRestorationSignal.programmaticPush = false
    // The location change this suspension guarded has been processed (its clamp scroll event, if
    // any, fired before this post-paint effect) — resume the continuous capture.
    scrollRestorationSignal.captureSuspended = false

    // Initial mount. A reload / bf-cache-miss restores the remembered position (the browser no
    // longer does under `'manual'`). A fresh navigation with an explicit `#hash` is a deep link →
    // jump to it (the hash wins over any remembered position); a plain one keeps the first paint.
    if (!prevLocation) {
      const initialNavType = getInitialNavigationType()
      if (initialNavType === 'reload' || initialNavType === 'back_forward') {
        const saved = scrollPositionsByHref.get(location.hrefRel)
        if (saved) {
          restoreScrollPosition(getScrollConfigForLocation(location), saved)
          return
        }
      }
      const initialHash = typeof window !== 'undefined' ? window.location.hash : ''
      if (initialHash) {
        const behavior = resolveScrollToHashBehavior(undefined, scrollToHash, 'push')
        if (behavior) {
          scrollToHashElementWithRetry(initialHash, behavior)
        }
      }
      return
    }
    // Search/hash-only change (e.g. setSearch): keep the scroll untouched.
    // (A current-page `#hash` jump is handled imperatively in
    // navigateWithTransitions, since this effect doesn't refire for it.)
    if (prevLocation.pathname === location.pathname) {
      return
    }
    // Per-navigation scrollToHash override (set by navigateWithTransitions for
    // this cross-page navigation), else the global default. (The leaving page's
    // position is not read here — by now its DOM is gone and a shorter incoming
    // page has already clamped the scroll; it was captured at the commit, see
    // saveScrollPositionForLocation.)
    const scrollToHashOverride = scrollToHashSignal.override
    scrollToHashSignal.override = undefined
    const scrollConfig = getScrollConfigForLocation(location)
    // Cross-page (push) to a #hash → jump to that element per the policy. On
    // back/forward (pop) we restore instead (below), so we don't override the
    // remembered scroll position.
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const hashBehavior =
      type === 'push' ? resolveScrollToHashBehavior(scrollToHashOverride, scrollToHash, 'push') : undefined
    if (hash && hashBehavior) {
      if (!scrollToHashElement(hash, hashBehavior)) {
        // Not in the DOM yet: land at the top, then snap to the anchor once the
        // page content renders.
        scrollConfig.setter({ x: 0, y: 0 })
        retryScrollToHashElement(hash, hashBehavior, 5)
      }
      return
    }
    // Otherwise apply the entering page's restore policy.
    const decision = scrollConfig.policy({ prevLocation, type })
    if (decision === false) {
      return
    }
    if (decision === true) {
      restoreScrollPosition(scrollConfig, scrollPositionsByHref.get(location.hrefRel) ?? { x: 0, y: 0 })
      return
    }
    scrollConfig.setter({ x: 0, y: 0 })
  }, [location.hrefRel])
}

export const ScrollRestoration = (): null => {
  useScrollRestoration()
  return null
}

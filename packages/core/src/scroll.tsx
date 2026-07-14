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
// OWNERSHIP — the line runs between same-document and document-load:
// - SAME-DOCUMENT navigation (push/pop in the SPA) is OURS. The browser would
//   restore before React rendered the entering page, and prefers a `#hash` over
//   the remembered position, so we hold `scrollRestoration = 'manual'` while the
//   document is alive.
// - A DOCUMENT LOAD (reload, cross-document back/forward) is the PLATFORM'S. It
//   restores before the first paint — something a React effect structurally
//   cannot do, which is why holding `'manual'` across a reload made the page
//   flash at the top and then jump. The mode lives on the history entry and
//   survives the load, so we yield it on the way out and reclaim it on return
//   (see claimScrollRestoration / yieldScrollRestorationToBrowser).
// Everything the platform can't do — content that grows after load, custom
// scroll containers, `#hash` entries, CSR — is REPAIRED by the initial-mount
// branch below, from the sessionStorage snapshot.
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

const windowScrollConfig: ScrollConfig = {
  getter: windowScrollPositionGetter,
  setter: windowScrollPositionSetter,
  policy: defaultScrollPositionRestorePolicy,
}

/**
 * How `location`'s page scrolls — or `'pending'` when we do not know YET.
 *
 * The distinction is the whole point. A page is code-split, so between a navigation and its chunk landing we cannot
 * tell whether it scrolls the window or a container of its own. Answering "the window" in that gap is not a safe
 * default, it is a WRONG one: it scrolls the wrong thing, and it stores the window's offset under a container page's
 * href, corrupting what a later restore reads back. That silent collapse of "unknown" into "window" is what hid the
 * `.scrollPosition()` bug for the whole life of the feature. A page that genuinely does not exist (a 404) is a
 * different thing entirely — that answer IS the window, definitively.
 */
const getScrollConfigForLocation = (location: AnyLocation): ScrollConfig | 'pending' => {
  try {
    const config = getClientPoints()._getPageScrollConfigByHref(location.hrefRel)
    // `undefined` = no page matches (404) → the window, definitively. `'pending'` passes straight through.
    return config ?? windowScrollConfig
  } catch {
    // no client points at all (not mounted / not a point0 route) — the window
    return windowScrollConfig
  }
}

// Waiting for the position to STICK once we know where to put it: the entering page's content may need a
// few frames to reach its full height (async data, images), and a scroll past the current height is
// silently clamped.
const scrollRestoreRetryFrames = 60

/**
 * Make this page's scroll config KNOWABLE — synchronously, from now on.
 *
 * A code-split page's collection record holds nothing but its chunk LOADER until something loads it, and `loadPage`
 * (the framework's own, per-point deduped loader) is what turns it into a ready record. Until then every synchronous
 * reader — above all the continuous scroll capture — gets `'pending'` and skips, so the page's position is never
 * remembered and a later back/forward has nothing to restore. The router never closes this gap on its own: on the
 * client `loadPage` runs only from `prefetchPage`, which a server-rendered first page never goes through.
 *
 * Costs nothing: it is the same chunk the router is already fetching to render the page, and calling it again once the
 * record is ready touches no network at all.
 */
const resolveScrollConfigForLocation = async (location: AnyLocation): Promise<void> => {
  try {
    await getClientPoints().loadPage({ location })
  } catch {
    // No client points, or the chunk failed to load (offline, a stale deploy). The navigation path is what surfaces
    // and recovers from a failed chunk; here there is simply no page left to scroll.
  }
}

/**
 * Run `apply` with this location's scroll config, WAITING for the page's chunk rather than guessing while its record
 * still holds only the loader. Nothing is lost by waiting: a page whose chunk has not landed cannot be tall yet either,
 * so there is no position to restore to. Runs SYNCHRONOUSLY when the config is already known — which is every warm
 * page, so the common path is unchanged.
 *
 * `isCurrent` is not optional in spirit: once this can defer, a queued `apply` outlives its navigation. The user
 * navigates away from a slow page while its chunk is still loading; the chunk then lands, and without this guard the
 * stale `apply` would restore the OLD page's offset onto the NEW page — and defend it for the whole retry budget.
 */
const withResolvedScrollConfig = (
  location: AnyLocation,
  apply: (config: ScrollConfig) => void,
  isCurrent: () => boolean,
): void => {
  const config = getScrollConfigForLocation(location)
  if (config !== 'pending') {
    apply(config)
    return
  }
  void resolveScrollConfigForLocation(location).then(() => {
    if (!isCurrent()) {
      return
    }
    const resolved = getScrollConfigForLocation(location)
    // Still `'pending'` means the chunk never landed — there is no page to scroll.
    if (resolved !== 'pending') {
      apply(resolved)
    }
  })
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
  const config = getScrollConfigForLocation(location)
  // Its chunk hasn't landed, so we do not know WHAT scrolls on this page. Writing anything now would write the
  // window's offset under a page that may scroll a container — the very corruption this used to produce.
  if (config === 'pending') {
    return
  }
  const position = config.getter()
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
  //
  // This comparison is only sound because the config is FIXED for the whole retry: callers reach here
  // through `withResolvedScrollConfig`, so the page's chunk has already landed and its scroll target
  // can no longer change under us. Re-resolving mid-retry would compare a reading of the window against
  // a reading of a container and mistake the switch for the user moving — and back off for good.
  const applied = config.getter()
  window.requestAnimationFrame(() => {
    const current = config.getter()
    if (!current || !applied) {
      // No position to read at all: a custom scroll container that is not in the DOM yet, because its
      // page is still rendering. That is precisely what this retry exists for — the setter was a no-op,
      // so keep trying rather than giving up. (Backing off is only right when something ELSE moved the
      // scroll, and "absent" is not "moved".)
      config.setter(position)
      retryRestoreScrollPosition(config, position, attemptsLeft - 1)
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
  retryRestoreScrollPosition(config, position, scrollRestoreRetryFrames)
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
const scrollRestorationModeAvailable = (): boolean =>
  scrollHistoryApiAvailable() && 'scrollRestoration' in window.history

// Writing the mode can throw in sandboxed/embedded contexts — and one of the call sites runs during
// unload, where a throw is least affordable. Never let it break the page.
const setScrollRestorationMode = (mode: ScrollRestoration): void => {
  if (!scrollRestorationModeAvailable()) {
    return
  }
  try {
    window.history.scrollRestoration = mode
  } catch {
    // sandboxed / embedded — the platform keeps whatever mode it had
  }
}

/**
 * Take same-document navigation back from the browser.
 *
 * While this document is alive, push/pop are OURS: on a popstate the browser restores before React has rendered the
 * entering page (so a taller saved position clamps against a page that isn't there yet), and it prefers a `#hash` over
 * the remembered position. `'manual'` stops both.
 */
export const claimScrollRestoration = (): void => setScrollRestorationMode('manual')

/**
 * Hand the DOCUMENT-LOAD restore back to the browser — the one thing it does better than we ever can.
 *
 * A reload (or a cross-document back/forward) is restored by the browser BEFORE the first paint, with the real document
 * height in hand. We structurally cannot match that: our restore lives in a React effect, which runs after hydration,
 * which runs after that first paint — so under `'manual'` the user sees the TOP of the page and is thrown down a moment
 * later. The mode is a property of the SESSION HISTORY ENTRY and survives the load, so the only moment we can give it
 * back is on the way out.
 *
 * NOT for a URL carrying a `#hash`: there the browser prefers the fragment over the stored position (measured — it
 * lands on the anchor, not where you were), which is the exact bug `'manual'` was introduced to fix. Those entries keep
 * our own restore, first-paint flash and all.
 *
 * Deliberately a PURE PLATFORM operation: it reads no app state — no client points, no scroll config — because it runs
 * during unload, where anything that can fail, does.
 */
export const yieldScrollRestorationToBrowser = (): void => {
  if (typeof window === 'undefined' || window.location.hash) {
    return
  }
  setScrollRestorationMode('auto')
}

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
// The in-memory map is lost on reload; persisting it is what lets the next document REPAIR a restore
// the platform could not perform. That is not the same as the mechanism it used to be: the browser now
// restores hashless document loads for us (see yieldScrollRestorationToBrowser), pre-paint. This
// snapshot covers what it demonstrably cannot — content that only reaches its full height after load
// (the browser makes one attempt around load, clamps against a short document, and gives up), custom
// scroll containers (never natively restored at all), `#hash` entries we deliberately kept, and CSR,
// whose first paint is an empty root.
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

  // Scroll-restoration OWNERSHIP, split along the only line that matters: who can see the document.
  //
  // Same-document navigation (push/pop inside the SPA) is ours — the browser would restore before
  // React rendered the entering page, and would prefer a `#hash` over the remembered position. So we
  // hold `'manual'` while this document is alive.
  //
  // A DOCUMENT LOAD (reload, cross-document back/forward) is the platform's — it restores before the
  // first paint, which a React effect can never do. We hand the mode back on the way out (see the
  // pagehide/hidden handler below) and take it again when this document comes back. Guarded — a no-op
  // where the History API isn't available (SSR, React Native / Expo).
  useEffect(() => {
    if (!scrollRestorationModeAvailable()) {
      return
    }
    claimScrollRestoration()
    return () => {
      // This manager is going away, so hand the entry back UNCONDITIONALLY — deliberately not through
      // `yieldScrollRestorationToBrowser`, whose `#hash` gate does not apply here. That gate protects
      // OUR restore from the browser's fragment preference; with no manager left there is no restore of
      // ours to protect, and leaving a hashed entry on `'manual'` would mean nobody restores it at all.
      // `'auto'` is also the mode every document starts in.
      setScrollRestorationMode('auto')
    }
  }, [])

  // Keep the current page's remembered position fresh, while its DOM is still mounted (see
  // saveScrollPositionForLocation), and manage the hand-off of the mode across the document's life:
  // - scroll (capture phase, so container scrolls are seen too): the continuous capture — this is
  //   what a back/forward restores from. Skipped while `captureSuspended` (see the signal).
  // - LEAVING (`pagehide` AND `visibilitychange` → hidden): capture once more, persist the map so the
  //   next document can repair what the platform can't, and yield the mode so the platform restores a
  //   plain reload pre-paint. Both events run because neither alone is enough: a reload fires both,
  //   but a discarded mobile tab may only ever fire `visibilitychange`. They are idempotent by
  //   construction, so firing twice costs nothing.
  // - RETURNING (`pageshow`, and `visibilitychange` → visible): take the mode back. This is not
  //   optional: a bfcache resume brings this very document back ALIVE, and if it kept running under
  //   the `'auto'` we left behind, the browser would start restoring same-document pops again —
  //   resurrecting, intermittently, the exact `#hash` bug `'manual'` exists to prevent. `pageshow`
  //   also fires on a PLAIN initial load, so the claim runs there too — deliberately: it is a no-op
  //   the platform has nothing pending to lose (its restore is one attempt around load, not a retry
  //   loop), so don't "fix" this by filtering on `event.persisted`.
  //
  // ORDER MATTERS: this effect rehydrates the sessionStorage snapshot into the in-memory map, and it
  // is declared BEFORE the location effect below, which repairs from that map on the initial mount.
  // Move this load elsewhere, or reorder the effects, and the repair silently reads an empty map and
  // does nothing — on every path where the platform cannot help.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }
    loadScrollPositionsFromSession()
    const capture = () => {
      if (prevLocationRef.current) {
        saveScrollPositionForLocation(prevLocationRef.current)
      }
    }
    const captureIfNotSuspended = () => {
      if (!scrollRestorationSignal.captureSuspended) {
        capture()
      }
    }
    const leave = () => {
      // The suspension applies HERE too, not just to the scroll listener. `visibilitychange` → hidden can land in the
      // window between the adapter commit and the location effect, and in that window `prevLocationRef` still points at
      // the LEAVING page while a shorter incoming page has already clamped the scroll — so an unguarded capture would
      // write the clamped value under the leaving page's href, which is the exact corruption the suspension exists to
      // prevent. Nothing is lost by skipping: the map already holds this page's position, captured at the commit (see
      // saveScrollPositionForLocation's call in navigateWithTransitions), so persisting it below is still right.
      captureIfNotSuspended()
      saveScrollPositionsToSession()
      yieldScrollRestorationToBrowser()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        leave()
      } else {
        claimScrollRestoration()
      }
    }
    window.addEventListener('scroll', captureIfNotSuspended, { capture: true, passive: true })
    window.addEventListener('pagehide', leave)
    window.addEventListener('pageshow', claimScrollRestoration)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('scroll', captureIfNotSuspended, { capture: true })
      window.removeEventListener('pagehide', leave)
      window.removeEventListener('pageshow', claimScrollRestoration)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const prevLocation = prevLocationRef.current
    prevLocationRef.current = location
    // Insurance: we yield the mode whenever the tab goes hidden, and a same-document navigation can
    // land before `visibilitychange` → visible takes it back. Any navigation means this document is
    // driving again — one idempotent property write, so `'auto'` can never persist into the next pop.
    claimScrollRestoration()
    // Push (programmatic cross-page navigate) vs pop (back / forward / reload). See scrollRestorationSignal.
    const type: ScrollPositionRestoreType = scrollRestorationSignal.programmaticPush ? 'push' : 'pop'
    scrollRestorationSignal.programmaticPush = false
    // The location change this suspension guarded has been processed (its clamp scroll event, if
    // any, fired before this post-paint effect) — resume the continuous capture.
    scrollRestorationSignal.captureSuspended = false
    // Anything below may be DEFERRED (a code-split page's chunk can still be in flight), so it must be
    // able to tell whether it is still speaking for the current navigation. `prevLocationRef` was just
    // set to `location` above and is reassigned by the next run of this effect, so it is exactly that
    // marker — no extra state.
    const isCurrentLocation = () => prevLocationRef.current?.hrefRel === location.hrefRel
    // Learn how THIS page scrolls, on every branch below — including the ones that scroll nothing. The
    // branches only need the config when they are about to move the scroll; the continuous CAPTURE needs it
    // all the time, and it is synchronous, so a page whose record still holds only its loader is skipped by
    // it — for as long as the record stays that way. Without this the position of a code-split page reached
    // by a plain first navigation would never be remembered at all, and coming back to it would restore
    // nothing.
    void resolveScrollConfigForLocation(location)

    // Initial mount, i.e. this document just loaded. For a reload / cross-document back-forward the
    // platform has ALREADY restored the position — before the first paint, which is the whole point of
    // yielding the mode to it. So this branch is a REPAIR, not the mechanism: it only acts where the
    // platform demonstrably cannot. A fresh navigation with an explicit `#hash` is a deep link → jump
    // to it (the hash wins over any remembered position); a plain one keeps the first paint.
    if (!prevLocation) {
      const initialNavType = getInitialNavigationType()
      if (initialNavType === 'reload' || initialNavType === 'back_forward') {
        const saved = scrollPositionsByHref.get(location.hrefRel)
        if (saved) {
          // Wait for this page's chunk before touching anything: until it lands we don't know whether it
          // scrolls the window or a container, and moving the window on a container page would be a
          // spurious jump nothing ever undoes. (`saved` is read ABOVE, synchronously — see the pop
          // branch below for why that matters.)
          withResolvedScrollConfig(
            location,
            (config) => {
              const current = config.getter()
              // The platform landed it. Touch NOTHING: re-applying would start a retry loop for no reason
              // and could yank a user who already scrolled away during hydration.
              if (current && isNearScrollPosition(current, saved)) {
                return
              }
              // It didn't (or was never given the chance). Repair, and keep retrying while the page grows:
              // a `#hash` entry we deliberately kept on `'manual'`; content that only reaches its full
              // height after load (the browser makes one attempt around load, clamps, and gives up); a
              // custom scroll container (no browser restores element scroll, in any mode); CSR, whose first
              // paint is an empty root.
              // `current === undefined` (a container that isn't in the DOM yet) falls through to here too.
              restoreScrollPosition(config, saved)
            },
            isCurrentLocation,
          )
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
    // Cross-page (push) to a #hash → jump to that element per the policy. On
    // back/forward (pop) we restore instead (below), so we don't override the
    // remembered scroll position.
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const hashBehavior =
      type === 'push' ? resolveScrollToHashBehavior(scrollToHashOverride, scrollToHash, 'push') : undefined
    // The remembered position, read NOW rather than inside the callback below. That callback can run a
    // frame or more later (a code-split page's chunk), and by then the continuous capture is live again
    // (`captureSuspended` was just cleared) and no longer skipping on `'pending'` — so a clamp scroll
    // event fired while the resolved content settles would overwrite this entry with the clamped value,
    // and the restore would then dutifully "restore" that. Reading it here freezes the intent at the
    // moment of the navigation, which is when it was true.
    const savedForLocation = scrollPositionsByHref.get(location.hrefRel) ?? { x: 0, y: 0 }
    // Everything past here needs the ENTERING page's own config — its scroll target AND its
    // `.scrollRestore()` policy. Both live in its chunk, so both have to wait for it: deciding from a
    // provisional config means a lazy page's `.scrollRestore(false)` is silently ignored and its
    // `.scrollRestore(true)` gets a scroll-to-top instead of a restore, because the fallback policy is
    // the default one. The decision is one-shot — there is no second chance to get it right.
    withResolvedScrollConfig(
      location,
      (scrollConfig) => {
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
          restoreScrollPosition(scrollConfig, savedForLocation)
          return
        }
        scrollConfig.setter({ x: 0, y: 0 })
      },
      isCurrentLocation,
    )
  }, [location.hrefRel])
}

export const ScrollRestoration = (): null => {
  useScrollRestoration()
  return null
}

import { flat0 } from '@devp0nt/flat0'
import type {
  AnyLocation,
  AnyRouteOrDefinition,
  ExactLocation,
  ExtractRoute,
  ExtractRoutesKeys,
  GetPathInputByRoute,
  IsParamsOptional,
  RoutesPretty,
  UnknownLocation,
  UnknownSearchInput,
  UnknownSearchParsed,
} from '@devp0nt/route0'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorPoint0 } from './error.js'
import type { ClassLikeError0 } from './error.js'
import { getClientPoints, useEffectAsap, useEffectSsr } from './helpers.js'
import { _ss } from './internals.js'
import { log } from './logger.js'
import { findRedirectTaskInQueryClientCache, removeRedirectsFromQueryClientCache } from './query-client.js'
import type { RedirectTask } from './redirect.js'
import type { IfAnyThenElse, PrefetchPagePolicy, ScrollConfig, ScrollPositionRestoreType } from './types.js'
import {
  defaultScrollPositionRestorePolicy,
  generateId,
  singletonize,
  windowScrollPositionGetter,
  windowScrollPositionSetter,
} from './utils.js'

export type NavigationCallback<TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions> = (
  to: string,
  options?: TAdapterNavigateOptions & SpecialNavigateOptions<TAdapterNavigateOptions>,
) => void | Promise<void>
export type SpecialNavigateOptions<TAdapterNavigateOptions extends AdapterNavigateOptions> = {
  prefetch?: PrefetchPagePolicy
  before?: NavigationCallback<TAdapterNavigateOptions>
  after?: NavigationCallback<TAdapterNavigateOptions>
  /** Open the target in a new tab (uses the `openExternal` hook). */
  newTab?: boolean
  /**
   * Scroll-to-hash policy for this navigation, overriding the global `createNavigation({ scrollToHash })`. See
   * {@link ScrollToHashPolicy}.
   */
  scrollToHash?: ScrollToHashPolicy
}
export type SpecialLinkOptions<TAdapterNavigateOptions extends AdapterNavigateOptions> = {
  prefetch?: PrefetchPagePolicy
  prefetchOnHover?: PrefetchPagePolicy
  prefetchOnNavigate?: PrefetchPagePolicy
  before?: NavigationCallback<TAdapterNavigateOptions>
  after?: NavigationCallback<TAdapterNavigateOptions>
  /** Open the target in a new tab (uses the `openExternal` hook). */
  newTab?: boolean
  /**
   * Scroll-to-hash policy for this navigation, overriding the global `createNavigation({ scrollToHash })`. See
   * {@link ScrollToHashPolicy}.
   */
  scrollToHash?: ScrollToHashPolicy
}
export type SpecialRedirectOptions = {
  status?: number
}

/**
 * Opens a link that leaves the SPA: a cross-origin URL, or any URL requested with `newTab`. Override via
 * `createNavigation({ openExternal })` — e.g. on capacitor/expo, open in the system browser instead of replacing the
 * webview.
 */
export type OpenExternalFn = (to: string, options: { newTab?: boolean }) => void
export const defaultOpenExternal: OpenExternalFn = (to, { newTab }) => {
  if (typeof window === 'undefined') {
    return
  }
  if (newTab) {
    window.open(to, '_blank', 'noopener,noreferrer')
  } else {
    window.location.assign(to)
  }
}
// export type SpecialLinkOptionsInDataAttributes<
//   TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions,
// > = {
//   ['data-prefetch-on-hover']?: PrefetchPagePolicy
//   ['data-prefetch']?: PrefetchPagePolicy
//   ['data-prefetch-on-navigate']?: PrefetchPagePolicy
//   ['data-before']?: NavigationCallback<TAdapterNavigateOptions>
//   ['data-after']?: NavigationCallback<TAdapterNavigateOptions>
// }
// export type SpecialRedirectOptionsInDataAttributes = {
//   ['data-status']?: number
// }

export type AdapterNavigateOptions = Record<string, unknown>
export type AdapterNavigateFn<TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions> = (
  to: string,
  options?: TAdapterNavigateOptions,
) => any

export type NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn extends AdapterNavigateFn> = NonNullable<
  Parameters<TAdapterNavigateFn>[1]
>
export type RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn extends AdapterNavigateFn> =
  NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialRedirectOptions

export type NavigateHelper<
  TRoutes extends RoutesPretty,
  TAdapterNavigateFn extends AdapterNavigateFn,
  TErrorClass extends ClassLikeError0<ErrorPoint0>,
> = {
  <TRouteName extends ExtractRoutesKeys<TRoutes>>(
    ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? [
          route: TRouteName,
          input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
            SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
        ]
      : [
          route: TRouteName,
          input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
            SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
        ]
  ): Promise<{ location: AnyLocation; error: InstanceType<TErrorClass> | undefined }>
  to: (
    to: string,
    options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
  ) => Promise<{ location: AnyLocation; error: InstanceType<TErrorClass> | undefined }>
  /** Go back one entry in history (`window.history.back()`). */
  back: () => void
  /** Go forward one entry in history (`window.history.forward()`). */
  forward: () => void
}

export type RedirectHelper<TRoutes extends RoutesPretty, TAdapterNavigateFn extends AdapterNavigateFn> = {
  <TRouteName extends ExtractRoutesKeys<TRoutes>>(
    ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? [
          route: TRouteName,
          input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
            SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
        ]
      : [
          route: TRouteName,
          input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
            SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
        ]
  ): RedirectTask<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
  to: (
    to: string,
    options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>,
  ) => RedirectTask<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
}

export type RedirectComponentRouteProps<TRoutes extends RoutesPretty, TAdapterNavigateFn extends AdapterNavigateFn> = {
  [TRouteName in ExtractRoutesKeys<TRoutes>]: {
    route: TRouteName
  } & (IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
    ? { input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>> }
    : { input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>> }) &
    RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
    SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
}[ExtractRoutesKeys<TRoutes>]
export type RedirectComponentProps<TRoutes extends RoutesPretty, TAdapterNavigateFn extends AdapterNavigateFn> =
  | RedirectComponentRouteProps<TRoutes, TAdapterNavigateFn>
  | ({ to: string } & RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>)
  | ({ href: string } & RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>)
  | ({
      task: RedirectTask<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
    } & RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
      SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>)
export type RedirectComponent<TRoutes extends RoutesPretty, TAdapterNavigateFn extends AdapterNavigateFn> = (
  props: RedirectComponentProps<TRoutes, TAdapterNavigateFn>,
) => React.ReactElement | null

export type UseLocationOptions = { addHash?: boolean }
export type UseLocationFn = (options?: UseLocationOptions) => ExactLocation | UnknownLocation

export type NavigationStatus = 'idle' | 'preparing' | 'transitioning'

export type UseOnNavigateFn = (options: {
  prevLocation: AnyLocation
  nextLocation: AnyLocation
}) => undefined | (() => void)
export type UseOnNavigateDetailedFn = (options: {
  prevLocation: AnyLocation
  nextLocation: AnyLocation
  status: NavigationStatus
  error: Error | undefined
}) => void

export type NavigationPageStateSuccess = {
  status: 'success'
  error: undefined
  loading: false
  success: true
  initial: false
}
export type NavigationPageStateLoading = {
  status: 'loading'
  error: undefined
  loading: true
  success: false
  initial: false
}
export type NavigationPageStateError<TError extends ErrorPoint0 = ErrorPoint0> = {
  status: 'error'
  error: TError
  loading: false
  success: false
  initial: false
}
export type NavigationPageStateInitial = {
  status: 'initial'
  error: undefined
  loading: undefined
  success: undefined
  initial: true
}
export type NavigationPageState<TStatus extends 'success' | 'loading' | 'error' | 'initial' = any> = IfAnyThenElse<
  TStatus,
  NavigationPageStateSuccess | NavigationPageStateLoading | NavigationPageStateError | NavigationPageStateInitial,
  TStatus extends 'success'
    ? NavigationPageStateSuccess
    : TStatus extends 'loading'
      ? NavigationPageStateLoading
      : TStatus extends 'error'
        ? NavigationPageStateError
        : TStatus extends 'initial'
          ? NavigationPageStateInitial
          : never
>
export type NavigationPageStateContextValue = NavigationPageState<any>

// Page state is an imperative, externally-subscribable store rather than React
// state on the navigation provider. The framework writes the page status
// (loading / success / error) from deep inside the mountable tree on every
// navigation; if that write lived in a top-level `useState`, every write would
// re-render the whole provider subtree (and so every page). Backing it with
// `useSyncExternalStore` keeps the reactive read opt-in and component-scoped —
// a page-state change only re-renders the components that actually read it.
const initialNavigationPageState: NavigationPageStateContextValue = {
  status: 'initial',
  error: undefined,
  loading: undefined,
  success: undefined,
  initial: true,
}
const navigationPageStateListeners = singletonize('NavigationPageStateListeners', new Set<() => void>())
const getNavigationPageStateSnapshot = (): NavigationPageStateContextValue =>
  _ss.__POINT0_NAVIGATION_PAGE_STATE__.getWeak() ?? initialNavigationPageState
const subscribeNavigationPageState = (listener: () => void): (() => void) => {
  navigationPageStateListeners.add(listener)
  return () => {
    navigationPageStateListeners.delete(listener)
  }
}
export const setNavigationPageState = (next: React.SetStateAction<NavigationPageStateContextValue>): void => {
  const prev = getNavigationPageStateSnapshot()
  const value =
    typeof next === 'function'
      ? (next as (prev: NavigationPageStateContextValue) => NavigationPageStateContextValue)(prev)
      : next
  // Keep the snapshot reference stable when nothing changed, so subscribers
  // (and `useSyncExternalStore`) don't re-render or loop.
  if (value === prev) {
    return
  }
  _ss.__POINT0_NAVIGATION_PAGE_STATE__.set(value)
  for (const listener of navigationPageStateListeners) {
    listener()
  }
}
export const getNavigationPageState = (): NavigationPageStateContextValue => getNavigationPageStateSnapshot()
export const useNavigationPageState = (): NavigationPageStateContextValue =>
  React.useSyncExternalStore(
    subscribeNavigationPageState,
    getNavigationPageStateSnapshot,
    getNavigationPageStateSnapshot,
  )
type SetNavigationPageStateOptions = {
  status: 'loading' | 'success' | 'initial' | 'error'
  error?: unknown
  skip?: boolean
}
export const useSetNavigationPageState = (options: SetNavigationPageStateOptions): void => {
  const helpers = useNavigationHelpers()
  const { status, error, skip } = options
  useEffectSsr(() => {
    if (skip) {
      return
    }
    helpers.setPageState((currentPageState) => {
      if (status === 'error') {
        const error0 = helpers.ErrorClass.from(error)
        if (status === currentPageState.status && error0.message === currentPageState.error.message) {
          return currentPageState
        } else {
          return {
            status: 'error',
            error: error0,
            success: false,
            initial: false,
            loading: false,
          }
        }
      } else {
        if (status === currentPageState.status) {
          return currentPageState
        } else {
          return {
            status: status,
            error: undefined,
            ...(status === 'initial'
              ? { initial: true, success: undefined, loading: undefined }
              : {
                  initial: false,
                  success: status === 'success',
                  loading: status === 'loading',
                }),
          } as NavigationPageState
        }
      }
    })
  }, [status, skip])
}
export const NavigationPageStateSetter = (
  props: { children?: React.ReactNode } & SetNavigationPageStateOptions,
): React.ReactNode => {
  const { children, ...options } = props
  useSetNavigationPageState(options)
  return typeof children === 'undefined' ? null : children
}

export type NavigationHelpersContextValue<
  TRoutes extends RoutesPretty = RoutesPretty,
  TAdapterNavigateFn extends AdapterNavigateFn = AdapterNavigateFn,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
> = {
  ssrLocation: AnyLocation | null
  adapterNavigate: TAdapterNavigateFn
  navigate: NavigateHelper<TRoutes, TAdapterNavigateFn, TErrorClass>
  redirect: RedirectHelper<TRoutes, TAdapterNavigateFn>
  Redirect: RedirectComponent<TRoutes, TAdapterNavigateFn>
  useAdapterLocation: UseLocationFn
  addHashToLocation: boolean
  setPrevLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setNextLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setTransitionStatus: React.Dispatch<React.SetStateAction<NavigationStatus>>
  setTransitionError: React.Dispatch<React.SetStateAction<Error | undefined>>
  setPageState: React.Dispatch<React.SetStateAction<NavigationPageState>>
  ErrorClass: ClassLikeError0<ErrorPoint0>
  openExternal: OpenExternalFn
  scrollToHash: ScrollToHashPolicy
}
export const NavigationHelpersContext = singletonize(
  'NavigationHelpersContext',
  React.createContext<NavigationHelpersContextValue | null>(null),
)
export const useNavigationHelpers = (): NavigationHelpersContextValue => {
  const ctx = React.useContext(NavigationHelpersContext)
  if (!ctx) throw new Error('useNavigationHelpers must be used within NavigationHelpersContextProvider')
  return ctx
}
export const getNavigationHelpers = (): NavigationHelpersContextValue => {
  const navigationHelpers = _ss.__POINT0_NAVIGATION_HELPERS__.getWeak()
  if (navigationHelpers) {
    return navigationHelpers
  }
  throw new Error('NavigationHelpersContextProvider is not yet initialized')
}

export type NavigationTransitionStateContextValue = {
  prevLocation: AnyLocation | null
  currentLocation: AnyLocation
  nextLocation: AnyLocation | null
  status: NavigationStatus
  error: Error | undefined
}
export const NavigationTransitionStateContext = singletonize(
  'NavigationTransitionStateContext',
  React.createContext<NavigationTransitionStateContextValue | null>(null),
)
export const useNavigationTransitionState = (): NavigationTransitionStateContextValue => {
  const ctx = React.useContext(NavigationTransitionStateContext)
  if (!ctx) throw new Error('useNavigationTransitionState must be used within NavigationTransitionStateContextProvider')
  return ctx
}
export const getNavigationTransitionState = (): NavigationTransitionStateContextValue => {
  const navigationTransitionState = _ss.__POINT0_NAVIGATION_TRANSITION_STATE__.getWeak()
  if (navigationTransitionState) {
    return navigationTransitionState
  }
  throw new Error('NavigationTransitionStateContextProvider is not yet initialized')
}

export type NavigationLocationContextValue = {
  useAdapterLocation: UseLocationFn
  currentLocation: AnyLocation
  addHashToLocation: boolean
}
export const NavigationLocationContext = singletonize(
  'NavigationLocationContext',
  React.createContext<NavigationLocationContextValue | null>(null),
)

export type NavigationContextProviderProps<
  TRoutes extends RoutesPretty = RoutesPretty,
  TAdapterNavigateFn extends AdapterNavigateFn = AdapterNavigateFn,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
> = {
  children: React.ReactNode
  useAdapterLocation: UseLocationFn
  ssrLocation?: AnyLocation | null
  addHashToLocation?: boolean
  adapterNavigate: TAdapterNavigateFn
  navigate: NavigateHelper<TRoutes, TAdapterNavigateFn, TErrorClass>
  redirect: RedirectHelper<TRoutes, TAdapterNavigateFn>
  Redirect: RedirectComponent<TRoutes, TAdapterNavigateFn>
  ErrorClass?: TErrorClass
  openExternal?: OpenExternalFn
  scrollToHash?: ScrollToHashPolicy
}

export function NavigationContextProvider<
  TRoutes extends RoutesPretty,
  TAdapterNavigateFn extends AdapterNavigateFn,
  TErrorClass extends ClassLikeError0<ErrorPoint0>,
>({
  children,
  useAdapterLocation,
  ssrLocation,
  adapterNavigate,
  navigate,
  redirect,
  Redirect,
  addHashToLocation = false,
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
  openExternal = defaultOpenExternal,
  scrollToHash = true,
}: NavigationContextProviderProps<TRoutes, TAdapterNavigateFn, TErrorClass>) {
  const [nextLocation, setNextLocation] = useState<AnyLocation | null>(null)
  const [prevLocation, setPrevLocation] = useState<AnyLocation | null>(null)
  const [transitionStatus, setTransitionStatus] = useState<NavigationStatus>('idle')
  const [transitionError, setTransitionError] = useState<Error | undefined>(undefined)

  const currentLocation = useAdapterLocation()
  useEffectAsap(() => {
    _ss.__POINT0_CURRENT_LOCATION__.set(currentLocation)
  }, [currentLocation])

  const locationValue = useMemo<NavigationLocationContextValue>(
    () => ({
      useAdapterLocation,
      currentLocation,
      addHashToLocation,
    }),
    [currentLocation, addHashToLocation, useAdapterLocation],
  )

  const helpersValue = useMemo<NavigationHelpersContextValue>(
    () => ({
      ssrLocation: ssrLocation ?? null,
      adapterNavigate,
      setNextLocation,
      setPrevLocation,
      setTransitionStatus,
      setTransitionError,
      useAdapterLocation,
      addHashToLocation,
      setPageState: setNavigationPageState,
      ErrorClass,
      navigate,
      redirect,
      Redirect,
      openExternal,
      scrollToHash,
    }),
    [ssrLocation, useAdapterLocation, adapterNavigate, addHashToLocation, ErrorClass, openExternal, scrollToHash],
  )
  useEffectAsap(() => {
    _ss.__POINT0_NAVIGATION_HELPERS__.set(helpersValue)
  }, [helpersValue])

  const transitionStateValue = useMemo<NavigationTransitionStateContextValue>(
    () => ({
      prevLocation,
      currentLocation,
      nextLocation,
      status: transitionStatus,
      error: transitionError,
    }),
    [prevLocation, currentLocation, nextLocation, transitionStatus, transitionError],
  )
  useEffectAsap(() => {
    _ss.__POINT0_NAVIGATION_TRANSITION_STATE__.set(transitionStateValue)
  }, [transitionStateValue])

  return (
    <NavigationHelpersContext.Provider value={helpersValue}>
      <NavigationLocationContext.Provider value={locationValue}>
        <NavigationTransitionStateContext.Provider value={transitionStateValue}>
          {children}
        </NavigationTransitionStateContext.Provider>
      </NavigationLocationContext.Provider>
    </NavigationHelpersContext.Provider>
  )
}

export const useNavigationLocationContext = (): NavigationLocationContextValue => {
  const ctx = React.useContext(NavigationLocationContext)
  if (!ctx) throw new Error('useNavigationLocationContext must be used within NavigationContextProvider')
  return ctx
}
export function useLocation<TRouteDefinition extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  options?: UseLocationOptions,
): UnknownLocation | ExactLocation<TRouteDefinition> {
  const locationCtx = useNavigationLocationContext()
  const addHash =
    options && 'addHash' in options && typeof options.addHash === 'boolean'
      ? options.addHash
      : locationCtx.addHashToLocation
  return locationCtx.useAdapterLocation({ ...options, addHash }) as UnknownLocation | ExactLocation<TRouteDefinition>
}
export const getLocation = <TRouteDefinition extends AnyRouteOrDefinition = AnyRouteOrDefinition>():
  | ExactLocation<TRouteDefinition>
  | UnknownLocation => {
  const location = _ss.__POINT0_CURRENT_LOCATION__.getWeak()
  if (!location) {
    throw new Error('Current location is not yet initialized')
  }
  return location as ExactLocation<TRouteDefinition> | UnknownLocation
}

// --- Search params -------------------------------------------------------------
// `search` is already handed to pages as a parsed prop. These helpers add the
// matching setter plus a standalone hook / imperative API. A setSearch is a
// "soft" URL update: it goes straight through the adapter (replace by default),
// bypassing the navigate transition pipeline (no prefetch, no loading flash).
// The page re-renders with the new parsed `search` and its queries refetch in the
// background because `search` is part of their key.
export type SetSearchOptions = {
  /** Replace the current history entry instead of pushing a new one. Default: true. */
  replace?: boolean
}
export type SetSearchValues<TSearchInput = UnknownSearchInput> = {
  [TKey in keyof TSearchInput]?: TSearchInput[TKey] | undefined
}
export type SetSearchInput<TSearchInput = UnknownSearchInput> =
  | SetSearchValues<TSearchInput>
  | ((prev: SetSearchValues<TSearchInput>) => SetSearchValues<TSearchInput>)
/**
 * Sets the URL query. The value is the search **input** (raw) — the same type `route.get({ '?': ... })` takes; the page
 * re-parses it through its own schema (so e.g. for a `z.coerce.number()` search the value here is the schema's input,
 * not the parsed `number`).
 *
 * The object form **replaces** the whole query — `setSearch({ a: 1 })` makes the query exactly `?a=1`, and
 * `setSearch({})` clears it. To patch, use the updater form and spread: `setSearch((prev) => ({ ...prev, a: 1 }))`.
 * `undefined` values are dropped, so `({ ...prev, a: undefined })` removes a key.
 */
export type SetSearchHelper<TSearchInput = UnknownSearchInput> = (
  next: SetSearchInput<TSearchInput>,
  options?: SetSearchOptions,
) => void

export const getSearch = <TSearch = UnknownSearchParsed,>(): TSearch => {
  return getLocation().search as TSearch
}

export const setSearch: SetSearchHelper = (next, options) => {
  const helpers = getNavigationHelpers()
  const location = getLocation()
  // Object form replaces the whole query; the updater form gets the current raw
  // query and returns the full next one (spread `prev` to patch). `flat0.stringify`
  // already drops `undefined` values, so a removed key just disappears.
  const nextValues = typeof next === 'function' ? next(location.search) : next
  const searchString = flat0.stringify(nextValues)
  const to = `${location.pathname}${searchString ? `?${searchString}` : ''}${location.hash || ''}`
  helpers.adapterNavigate(to, { replace: options?.replace !== false })
}

// Returns `[search, setSearch]`. Single generic: whatever type you pass is what
// you get for both — no schema parsing or point inference, the caller owns the
// type. (`search` is the raw `location.search`; the parsed, schema-typed search
// is the page/layout `search` prop.)
export const useSearch = <TSearch = UnknownSearchParsed,>(): [TSearch, SetSearchHelper<TSearch>] => {
  const location = useLocation()
  return [location.search as TSearch, setSearch as SetSearchHelper<TSearch>]
}

// --- Scroll restoration --------------------------------------------------------
// Centralized in the router (mount <ScrollRestoration/> once) instead of a
// per-page effect. On a pathname change it saves the leaving page's scroll
// position and applies the entering page's restore policy. Default: a new
// navigation (push) scrolls to the top; back/forward (pop) restores the saved
// position. Per-page `.scrollPosition()` / `.scrollRestore()` still apply.
// Search-only changes (e.g. setSearch) keep the scroll untouched.
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

// Per-navigation scrollToHash override, set by navigateWithTransitions for the
// upcoming cross-page navigation and consumed (cleared) by the scroll manager.
// `undefined` → fall back to the global default.
const scrollToHashSignal = singletonize('Point0ScrollToHashSignal', {
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
const scrollToHashElementWithRetry = (hash: string, behavior: ScrollToHashBehavior): void => {
  if (!scrollToHashElement(hash, behavior)) {
    retryScrollToHashElement(hash, behavior, 5)
  }
}

export const useScrollRestoration = (): void => {
  const location = useLocation()
  const { scrollToHash } = useNavigationHelpers()
  const prevLocationRef = useRef<AnyLocation | null>(null)
  const navTypeRef = useRef<ScrollPositionRestoreType>('push')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const onPopState = () => {
      navTypeRef.current = 'pop'
    }
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  useEffect(() => {
    const prevLocation = prevLocationRef.current
    prevLocationRef.current = location
    const type = navTypeRef.current
    navTypeRef.current = 'push'
    // Initial render — let the browser keep its own scroll (incl. native #hash
    // scrolling on an SSR'd page).
    if (!prevLocation) {
      return
    }
    // Search/hash-only change (e.g. setSearch): keep the scroll untouched.
    // (A current-page `#hash` jump is handled imperatively in
    // navigateWithTransitions, since this effect doesn't refire for it.)
    if (prevLocation.pathname === location.pathname) {
      return
    }
    // Per-navigation scrollToHash override (set by navigateWithTransitions for
    // this cross-page navigation), else the global default.
    const scrollToHashOverride = scrollToHashSignal.override
    scrollToHashSignal.override = undefined
    // Save the position of the page we are leaving.
    const leavingPosition = getScrollConfigForLocation(prevLocation).getter()
    if (leavingPosition) {
      scrollPositionsByHref.set(prevLocation.hrefRel, leavingPosition)
    }
    const { setter, policy } = getScrollConfigForLocation(location)
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
        setter({ x: 0, y: 0 })
        retryScrollToHashElement(hash, hashBehavior, 5)
      }
      return
    }
    // Otherwise apply the entering page's restore policy.
    const decision = policy({ prevLocation, type })
    if (decision === false) {
      return
    }
    if (decision === true) {
      setter(scrollPositionsByHref.get(location.hrefRel) ?? { x: 0, y: 0 })
      return
    }
    setter({ x: 0, y: 0 })
  }, [location.hrefRel])
}

export const ScrollRestoration = (): null => {
  useScrollRestoration()
  return null
}

const isSameNavigationLocation = (left: AnyLocation, right: AnyLocation) => {
  return left.href && right.href ? left.href === right.href : left.hrefRel === right.hrefRel
}

export const useOnNavigate = (fn: UseOnNavigateFn) => {
  const ctx = useNavigationTransitionState()

  const prevLocationRef = useRef(ctx.currentLocation)
  const activeNextLocationRef = useRef<AnyLocation | null>(null)
  const cleanupFnRef = useRef<(() => void) | null>(null)

  const cleanupActiveNavigation = ({ commitNextLocation }: { commitNextLocation: boolean }) => {
    const activeNextLocation = activeNextLocationRef.current
    cleanupFnRef.current?.()
    cleanupFnRef.current = null
    activeNextLocationRef.current = null
    if (commitNextLocation && activeNextLocation) {
      prevLocationRef.current = activeNextLocation
    }
  }

  useEffect(() => {
    if (!ctx.nextLocation) {
      return
    }

    const prevLocation = prevLocationRef.current
    const nextLocation = ctx.nextLocation
    const activeNextLocation = activeNextLocationRef.current
    if (isSameNavigationLocation(prevLocation, nextLocation)) {
      return
    }
    if (activeNextLocation && isSameNavigationLocation(activeNextLocation, nextLocation)) {
      return
    }

    cleanupActiveNavigation({ commitNextLocation: false })
    const cleanup = fn({ prevLocation, nextLocation })
    cleanupFnRef.current = typeof cleanup === 'function' ? cleanup : null
    activeNextLocationRef.current = nextLocation
  }, [ctx.nextLocation])

  useEffect(() => {
    if (ctx.status !== 'idle' || !activeNextLocationRef.current) {
      return
    }
    cleanupActiveNavigation({ commitNextLocation: true })
  }, [ctx.status])

  useEffect(
    () => () => {
      cleanupActiveNavigation({ commitNextLocation: false })
    },
    [],
  )
}

export const useIsNavigating = (): boolean => {
  const [isNavigating, setIsNavigating] = useState(false)
  useOnNavigate(() => {
    setIsNavigating(true)
    return () => {
      setIsNavigating(false)
    }
  })
  return isNavigating
}

export const specialNavigationOptionsSymbols = {
  prefetchOnHover: Symbol('prefetchOnHover'),
  prefetch: Symbol('prefetch'),
  prefetchOnNavigate: Symbol('prefetchOnNavigate'),
  before: Symbol('before'),
  after: Symbol('after'),
  status: Symbol('status'),
  newTab: Symbol('newTab'),
  scrollToHash: Symbol('scrollToHash'),
}

export type NavigateWithTransitionsReturnType<
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
> = Promise<{ location: AnyLocation; error: InstanceType<TErrorClass> | undefined }>
export async function navigateWithTransitions<
  TAdapterNavigateFn extends AdapterNavigateFn = AdapterNavigateFn,
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
>({
  to: providedTo,
  navigate,
  options,
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
}: {
  to: string
  navigate: () => any
  options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
    SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
  ErrorClass?: TErrorClass
}): NavigateWithTransitionsReturnType<TErrorClass> {
  const navigateId = generateId()
  _ss.__POINT0_CURRENT_NAVIGATE_ID__.set(navigateId)
  const helpers = getNavigationHelpers()
  const prevLocation = getLocation()
  const to = (() => {
    if (providedTo.startsWith('#')) {
      return prevLocation.pathname + providedTo
    }
    return providedTo
  })()
  const clientPoints = getClientPoints()
  const location = clientPoints.routes._.getLocation(to)
  // Leave the SPA when the target is cross-origin, or when a new tab is requested.
  // A same-origin absolute URL stays internal (wouter handles it). Hand off to the
  // `openExternal` hook instead of the client router (which would throw on a
  // cross-origin pushState).
  const newTab = (options as { newTab?: boolean } | undefined)?.newTab === true
  const currentOrigin = prevLocation.origin ?? (typeof window !== 'undefined' ? window.location.origin : undefined)
  const isExternal = Boolean(location.origin && currentOrigin && location.origin !== currentOrigin)
  if (isExternal || newTab) {
    helpers.openExternal(location.href ?? to, { newTab })
    return { location, error: undefined }
  }
  // Skip a redundant navigation to the same pathname + search (e.g. a re-click on
  // the page we are already on). A hash change still goes through, so in-page
  // anchors keep working. Full no-op: no prefetch, no before/after, no history.
  if (
    location.hash === '' &&
    location.pathname === prevLocation.pathname &&
    location.searchString === prevLocation.searchString
  ) {
    return { location, error: undefined }
  }
  // Resolve scrollToHash for this navigation. The cross-page case is handled by
  // the central scroll manager (correct timing — after the new page renders) via
  // this signal; the current-page (#anchor) case is handled imperatively below,
  // because the manager's location effect doesn't refire for a hash-only change.
  const scrollToHashOption = (options as { scrollToHash?: ScrollToHashPolicy } | undefined)?.scrollToHash
  const isCurrentPathname = location.pathname === prevLocation.pathname
  // Cross-page: hand the per-call override to the central scroll manager. Current
  // page: resolve the behavior here (the manager won't refire) and jump below.
  scrollToHashSignal.override = isCurrentPathname ? undefined : scrollToHashOption
  const currentScrollToHashBehavior = isCurrentPathname
    ? resolveScrollToHashBehavior(scrollToHashOption, helpers.scrollToHash, 'current')
    : undefined

  helpers.setPrevLocation(prevLocation)
  helpers.setTransitionError(undefined)
  helpers.setNextLocation(location)
  helpers.setTransitionStatus('preparing')
  try {
    const queryClient = _ss.__POINT0_QUERY_CLIENT__.getWeak()
    const tryTriggerRedirect = () => {
      const redirectTask = queryClient ? findRedirectTaskInQueryClientCache(queryClient, to) : undefined
      if (redirectTask && queryClient) {
        if (redirectTask.to === to) {
          removeRedirectsFromQueryClientCache(queryClient, redirectTask.to)
          return undefined
        }
        void helpers.navigate.to(redirectTask.to, {
          ...redirectTask.options,
          after: (...args) => {
            void options?.after?.(...args)
            removeRedirectsFromQueryClientCache(queryClient, redirectTask.to)
          },
        })
        return {
          location,
          error: new ErrorClass(
            'Redirect task found in query client cache, will be triggered now',
          ) as InstanceType<TErrorClass>,
        }
      }
      return undefined
    }
    void options?.before?.(to, options)
    const redirectResult1 = tryTriggerRedirect()
    if (redirectResult1) {
      return redirectResult1
    }
    await clientPoints.prefetchPage({
      location,
      policy: options?.prefetch,
      trigger: 'navigate',
    })
    const redirectResult2 = tryTriggerRedirect()
    if (redirectResult2) {
      return redirectResult2
    }
    if (navigateId !== _ss.__POINT0_CURRENT_NAVIGATE_ID__.get()) {
      return { location, error: new ErrorClass('Another navigate has been started') as InstanceType<TErrorClass> }
    }
    helpers.setTransitionStatus('transitioning')
    await navigate()
    void options?.after?.(to, options)
    helpers.setTransitionStatus('idle')
    helpers.setNextLocation(null)
    // Current-page #anchor jump: the page is already mounted, so jump to the
    // element right away (cross-page jumps are done by the scroll manager).
    if (currentScrollToHashBehavior && location.hash) {
      scrollToHashElementWithRetry(location.hash, currentScrollToHashBehavior)
    }
    return { location, error: undefined }
  } catch (error) {
    log({
      level: 'error',
      category: ['navigation'],
      message: 'Error during navigation',
      error,
    })
    if (navigateId !== _ss.__POINT0_CURRENT_NAVIGATE_ID__.get()) {
      return { location, error: new ErrorClass('Another navigate has been started') as InstanceType<TErrorClass> }
    }
    const error0 = ErrorClass.from(error) as InstanceType<TErrorClass>
    helpers.setTransitionError(error0)
    helpers.setTransitionStatus('transitioning')
    await navigate()
    void options?.after?.(to, options)
    helpers.setTransitionStatus('idle')
    helpers.setNextLocation(null)
    return { location, error: error0 }
  }
}

export * from './redirect.js'

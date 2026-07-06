import * as flat from '@1gr14/flat'
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
} from '@1gr14/route0'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorPoint0, POINT0_ERROR_CODES_MAP } from './error.js'
import type { ClassLikeError0 } from './error.js'
import { getClientPoints, useEffectAsap, useEffectSsr } from './helpers.js'
import { _ss } from './internals.js'
import { log } from './logger.js'
import { findRedirectTaskInQueryClientCache, removeRedirectsFromQueryClientCache } from './query-client.js'
import type { RedirectTask } from './redirect.js'
import {
  documentNavigate,
  fetchLatestClientBuildVersion,
  getClientBuildVersion,
  getStaleClientBuildState,
  markClientBuildStale,
  resolveStaleReaction,
  shouldAttemptStaleReload,
} from './stale.js'
import type { StalePolicy } from './stale.js'
import type {
  IfAnyThenElse,
  PointsScope,
  PrefetchPagePolicy,
  ScrollConfig,
  ScrollPositionRestoreType,
} from './types.js'
import {
  defaultScrollPositionRestorePolicy,
  generateId,
  singletonize,
  windowScrollPositionGetter,
  windowScrollPositionSetter,
} from './utils.js'
import { _point0_env } from './env.js'

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
  _ss.__POINT0_NAVIGATION_PAGE_STATE__.getOrUndefined() ?? initialNavigationPageState
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
  stale: StalePolicy
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
  const navigationHelpers = _ss.__POINT0_NAVIGATION_HELPERS__.getOrUndefined()
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
  const navigationTransitionState = _ss.__POINT0_NAVIGATION_TRANSITION_STATE__.getOrUndefined()
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
  stale?: StalePolicy
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
  stale = 'navigate',
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
      stale,
    }),
    [
      ssrLocation,
      useAdapterLocation,
      adapterNavigate,
      addHashToLocation,
      ErrorClass,
      openExternal,
      scrollToHash,
      stale,
    ],
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
/**
 * The current location, reactive: `useLocation()` re-renders the component on every navigation. It's the same value
 * pages and layouts already get as a `location` prop — pull it from here in any other component.
 *
 *     const location = useLocation()
 *     location.pathname // "/ideas/123"
 *     location.search // parsed query object
 *     location.params // parsed route params
 *
 * For an imperative read outside React, use `getLocation()` (throws if the router hasn't mounted yet).
 *
 * Full reference: https://1gr14.dev/point0/latest/navigation
 */
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
/**
 * Reads the current location imperatively (no React subscription, no re-render) — for use outside components, e.g. in a
 * loader or an event handler. Throws `"Current location is not yet initialized"` if called before the router mounts;
 * inside a component prefer the reactive `useLocation()`.
 *
 * Full reference: https://1gr14.dev/point0/latest/navigation
 */
export const getLocation = <TRouteDefinition extends AnyRouteOrDefinition = AnyRouteOrDefinition>():
  | ExactLocation<TRouteDefinition>
  | UnknownLocation => {
  const location = _ss.__POINT0_CURRENT_LOCATION__.getOrUndefined()
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
  // Client-only: writes the URL through the adapter navigate (history / hash /
  // memory). On the server there is nothing to navigate, so no-op — SSR code
  // paths can call it safely.
  if (_point0_env.side.is.server) {
    return
  }
  const helpers = getNavigationHelpers()
  const location = getLocation()
  // Object form replaces the whole query; the updater form gets the current raw
  // query and returns the full next one (spread `prev` to patch). `flat.stringify`
  // already drops `undefined` values, so a removed key just disappears.
  const nextValues = typeof next === 'function' ? next(location.search) : next
  const searchString = flat.stringify(nextValues)
  // Skip a redundant write when the query is unchanged (same values, or an
  // identity updater): comparing the canonical `flat` form of both sides — not
  // the raw `searchString`, whose encoding/order may differ — avoids a no-op
  // history entry and re-render. pathname + hash come from the current location
  // and never change here, so an unchanged query means an identical URL.
  if (searchString === flat.stringify(location.search)) {
    return
  }
  const to = `${location.pathname}${searchString ? `?${searchString}` : ''}${location.hash || ''}`
  helpers.adapterNavigate(to, { replace: options?.replace !== false })
}

// Returns `[search, setSearch]`. Single generic: whatever type you pass is what
// you get for both — no schema parsing or point inference, the caller owns the
// type. (`search` here is the generically-parsed query object — `flat.parse` of
// the query string — so its values are raw strings/arrays, NOT coerced by any
// schema; the schema-typed, coerced search is the page/layout `search` prop.)
export const useSearch = <TSearch = UnknownSearchParsed,>(): [TSearch, SetSearchHelper<TSearch>] => {
  const location = useLocation()
  return [location.search as TSearch, setSearch as SetSearchHelper<TSearch>]
}

// --- Scroll restoration --------------------------------------------------------
// Centralized in the router (mount <ScrollRestoration/> once) instead of a
// per-page effect. On a pathname change it applies the entering page's restore
// policy. Default: a new navigation (push) scrolls to the top; back/forward
// (pop) restores the saved position. Per-page `.scrollPosition()` /
// `.scrollRestore()` still apply. Search-only changes (e.g. setSearch) keep the
// scroll untouched. Leaving positions are captured while the leaving page is
// still mounted — continuously on scroll plus right before a programmatic
// commit (see saveScrollPositionForLocation) — never after the location change.
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

// Remember `location`'s current scroll position for a later pop restore. Must run while that
// page's DOM is still mounted: once a shorter page replaces it, the browser has already clamped
// the scroll and the read is wrong. Hence the call sites — continuously on scroll events, right
// before the adapter commit for a programmatic navigation, on pagehide for a reload — and never
// the location effect, which runs after the new page rendered. (The continuous capture is what
// covers back/forward: React flushes a popstate's render and effects synchronously inside the
// history adapter's own popstate listener, so by the time any listener of ours fires the old
// page is gone and the restore has already run — the position must already be in the map.)
const saveScrollPositionForLocation = (location: AnyLocation): void => {
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
const scrollToHashElementWithRetry = (hash: string, behavior: ScrollToHashBehavior): void => {
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
const scrollRestorationSignal = singletonize('Point0ScrollRestorationSignal', {
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

const isSameNavigationLocation = (left: AnyLocation, right: AnyLocation) => {
  return left.href && right.href ? left.href === right.href : left.hrefRel === right.hrefRel
}

/**
 * Runs `fn` when a navigation **starts**; the cleanup it returns runs when that navigation settles. The right hook for
 * a progress bar or a "navigating" spinner. It skips the very first page load and fires at navigation start, not when
 * the new page paints — for first-load page-view analytics, read `useLocation()` in an effect instead.
 *
 *     useOnNavigate(() => {
 *       nprogress.start()
 *       return () => nprogress.done()
 *     })
 *
 * `useIsNavigating()` is the boolean built on top of this. Full reference: https://1gr14.dev/point0/latest/navigation
 */
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
// Resolve a navigation target against the current location, the same way a browser resolves an
// `<a href>`: a relative path (`deploy`, `../x`), a bare `#hash`, or a `?query` all resolve against
// the page you are on — while an absolute URL or a root-relative `/path` pass through unchanged.
// Without this, a relative target is resolved against the site root when computing the prefetch
// location, so prefetch misses the page the adapter navigate actually lands on and the navigation
// commits before that page's query is ready (a mid-page loading flash instead of a prefetched jump).
export const resolveNavigationTarget = (providedTo: string, currentLocation: AnyLocation): string => {
  const base = currentLocation.href ?? (typeof window !== 'undefined' ? window.location.href : undefined)
  if (base) {
    try {
      const resolved = new URL(providedTo, base)
      // Same-origin → a root-relative href (what the adapter navigate and `getLocation` expect);
      // cross-origin → the full href, so the external-navigation branch can detect and hand it off.
      return resolved.origin === new URL(base).origin
        ? resolved.pathname + resolved.search + resolved.hash
        : resolved.href
    } catch {
      // A target even `new URL` can't parse against a valid base (`http://`, a space in the
      // host): fall through to the passthrough below instead of crashing the navigation.
    }
  }
  // No absolute base to resolve against (SSR without an origin), or an unparsable target: keep
  // the historical `#hash` handling and pass everything else through untouched.
  return providedTo.startsWith('#') ? currentLocation.pathname + providedTo : providedTo
}

/**
 * Deploy invalidation, the reactive branch: a page chunk failed to load during navigation. Only a CONFIRMED newer
 * deploy triggers recovery — the current `build-version.json` is fetched fresh (or a header mismatch already marked the
 * tab stale) and compared to the version this tab runs. An unchanged version means a genuine network error: it surfaces
 * through the normal error path untouched. See {@link StalePolicy} for the reactions.
 */
async function handleStalePageChunkLoadFailure({
  error0,
  href,
  scope,
  stalePolicy,
  ErrorClass,
}: {
  error0: ErrorPoint0
  href: string
  scope: PointsScope
  stalePolicy: StalePolicy
  ErrorClass: ClassLikeError0<ErrorPoint0>
}): Promise<{ action: 'proceed'; error: ErrorPoint0 } | { action: 'navigated' } | { action: 'handled' }> {
  if (
    typeof window === 'undefined' ||
    stalePolicy === 'off' ||
    error0.code !== POINT0_ERROR_CODES_MAP.PAGE_CHUNK_LOAD_FAILED
  ) {
    return { action: 'proceed', error: error0 }
  }
  const clientBuildVersion = getClientBuildVersion()
  const latestBuildVersion =
    getStaleClientBuildState()?.latestBuildVersion ?? (await fetchLatestClientBuildVersion({ scope }))
  const confirmedStale = Boolean(clientBuildVersion && latestBuildVersion && clientBuildVersion !== latestBuildVersion)
  if (!confirmedStale || !latestBuildVersion) {
    return { action: 'proceed', error: error0 }
  }
  markClientBuildStale({ latestBuildVersion })
  const reaction = await resolveStaleReaction({
    policy: stalePolicy,
    ctx: { to: href, error: error0, clientBuildVersion, latestBuildVersion },
  })
  if (reaction === 'handled') {
    return { action: 'handled' }
  }
  if (reaction === 'navigate' && shouldAttemptStaleReload({ latestBuildVersion })) {
    documentNavigate(href)
    return { action: 'navigated' }
  }
  // 'error' — or a 'navigate' blocked by the reload-once guard: this new build already got its document load and
  // still cannot serve the chunk (a broken deploy) — surface instead of looping.
  return {
    action: 'proceed',
    error: new ErrorClass(
      `A newer client build "${latestBuildVersion}" was deployed while this tab runs "${clientBuildVersion ?? 'unknown'}" — the page chunk it requested no longer exists`,
      {
        code: POINT0_ERROR_CODES_MAP.STALE_CLIENT_BUILD,
        cause: error0,
        meta: { clientBuildVersion, latestBuildVersion },
      },
    ),
  }
}

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
  navigate: (to: string) => any
  options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> &
    SpecialNavigateOptions<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
  ErrorClass?: TErrorClass
}): NavigateWithTransitionsReturnType<TErrorClass> {
  const navigateId = generateId()
  _ss.__POINT0_CURRENT_NAVIGATE_ID__.set(navigateId)
  const helpers = getNavigationHelpers()
  const prevLocation = getLocation()
  const to = resolveNavigationTarget(providedTo, prevLocation)
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
  // Deploy invalidation, the proactive branch: a newer client build was already noticed (via the
  // X-Point0-Client-Build response header — see stale.ts), so don't even try to client-navigate with
  // the old chunks — leave with a full document navigation to the SAME target. `'error'` deliberately
  // proceeds: the old chunks may still load fine (or are already loaded), and if they don't, the
  // reactive branch in the catch below classifies the failure.
  const stalePolicy = helpers.stale
  const staleState = typeof window === 'undefined' ? undefined : getStaleClientBuildState()
  if (staleState && stalePolicy !== 'off' && stalePolicy !== 'error') {
    const staleReaction = await resolveStaleReaction({
      policy: stalePolicy,
      ctx: {
        to: location.href ?? to,
        error: undefined,
        clientBuildVersion: getClientBuildVersion(),
        latestBuildVersion: staleState.latestBuildVersion,
      },
    })
    if (staleReaction === 'navigate') {
      // Same reload-once-per-version guard as the failure path: if the one document load for this version already
      // happened and the mark is back (a client whose build can never match the server — e.g. shipped inside a native
      // app package — or a flapping rolling deploy), keep client-navigating normally; the loaded chunks still work.
      if (shouldAttemptStaleReload({ latestBuildVersion: staleState.latestBuildVersion })) {
        documentNavigate(location.href ?? to)
        return { location, error: undefined }
      }
    } else if (staleReaction === 'handled') {
      return { location, error: undefined }
    }
    // 'error' (or a guard-blocked 'navigate'): fall through to the normal client navigation.
  }
  // Resolve scrollToHash for this navigation. The cross-page case is handled by
  // the central scroll manager (correct timing — after the new page renders) via
  // the signal set in commitNavigate; the current-page (#anchor) case is handled
  // imperatively below, because the manager's location effect doesn't refire for
  // a hash-only change.
  const scrollToHashOption = (options as { scrollToHash?: ScrollToHashPolicy } | undefined)?.scrollToHash
  const isCurrentPathname = location.pathname === prevLocation.pathname
  const currentScrollToHashBehavior = isCurrentPathname
    ? resolveScrollToHashBehavior(scrollToHashOption, helpers.scrollToHash, 'current')
    : undefined
  // Commit the location change through the adapter. The scroll signals and the leaving page's
  // position are handled here — immediately before the commit — rather than when the navigation
  // starts: every abort path (redirect found, superseded by another navigate) returns before this
  // point, so nothing leaks into an unrelated location change (e.g. a back/forward landing while
  // a slow prefetch is still in flight), and the position is read while the leaving page's DOM is
  // still mounted (not yet clamped by a shorter incoming page). Same-page #hash changes skip all
  // of it — they don't re-fire the scroll manager's location effect, nothing would consume it.
  const commitNavigate = async () => {
    if (!isCurrentPathname) {
      saveScrollPositionForLocation(prevLocation)
      scrollToHashSignal.override = scrollToHashOption
      scrollRestorationSignal.programmaticPush = true
      scrollRestorationSignal.captureSuspended = true
    }
    try {
      await navigate(to)
    } catch (error) {
      // The location effect that would resume the capture may never fire — resume it here.
      scrollRestorationSignal.captureSuspended = false
      throw error
    }
  }

  helpers.setPrevLocation(prevLocation)
  helpers.setTransitionError(undefined)
  helpers.setNextLocation(location)
  helpers.setTransitionStatus('preparing')
  try {
    const queryClient = _ss.__POINT0_QUERY_CLIENT__.getOrUndefined()
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
    await commitNavigate()
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
    const staleResult = await handleStalePageChunkLoadFailure({
      error0: ErrorClass.from(error),
      href: location.href ?? to,
      scope: clientPoints.manager.scope,
      stalePolicy,
      ErrorClass,
    })
    if (staleResult.action === 'navigated') {
      // The document navigation to the target is underway — nothing to commit client-side.
      return { location, error: undefined }
    }
    if (staleResult.action === 'handled') {
      // A custom stale handler took ownership: no document navigation, no commit of the failed
      // client navigation — the user stays where they are.
      helpers.setTransitionStatus('idle')
      helpers.setNextLocation(null)
      return { location, error: ErrorClass.from(error) as InstanceType<TErrorClass> }
    }
    const error0 = staleResult.error as InstanceType<TErrorClass>
    helpers.setTransitionError(error0)
    helpers.setTransitionStatus('transitioning')
    await commitNavigate()
    void options?.after?.(to, options)
    helpers.setTransitionStatus('idle')
    helpers.setNextLocation(null)
    return { location, error: error0 }
  }
}

export * from './redirect.js'
export * from './stale.js'

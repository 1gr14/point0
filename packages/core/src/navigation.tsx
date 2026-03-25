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
} from '@devp0nt/route0'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { _point0_env } from './env.js'
import { ErrorPoint0 } from './error.js'
import type { ClassLikeError0 } from './error.js'
import { getClientPoints } from './helpers.js'
import { _ss } from './internals.js'
import { superstore } from './super-store.js'
import type { IfAnyThenElse, PrefetchPagePolicy } from './types.js'
import { generateId } from './utils.js'

export type SpecialNavigateOptions = {
  prefetch?: PrefetchPagePolicy
}
export type SpecialLinkOptions = {
  prefetch?: PrefetchPagePolicy
  prefetchOnHover?: PrefetchPagePolicy
  prefetchOnNavigate?: PrefetchPagePolicy
}
export type SpecialLinkOptionsInDataAttributes = {
  ['data-prefetch-on-hover']?: PrefetchPagePolicy
  ['data-prefetch']?: PrefetchPagePolicy
  ['data-prefetch-on-navigate']?: PrefetchPagePolicy
}

export type AdapterNavigateOptions = Record<string, unknown>
export type AdapterNavigateFn<TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions> = (
  to: string,
  options?: TAdapterNavigateOptions,
) => any

export type NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn extends AdapterNavigateFn> = NonNullable<
  Parameters<TAdapterNavigateFn>[1]
>
export type RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn extends AdapterNavigateFn> =
  NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> & {
    status?: number
  }

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
          options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions,
        ]
      : [
          route: TRouteName,
          input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions,
        ]
  ): Promise<{ location: AnyLocation; error: InstanceType<TErrorClass> | undefined }>
  to: (
    to: string,
    options?: NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions,
  ) => Promise<{ location: AnyLocation; error: InstanceType<TErrorClass> | undefined }>
}

export type RedirectHelper<TRoutes extends RoutesPretty, TAdapterNavigateFn extends AdapterNavigateFn> = {
  <TRouteName extends ExtractRoutesKeys<TRoutes>>(
    ...args: IsParamsOptional<ExtractRoute<TRoutes, TRouteName>> extends true
      ? [
          route: TRouteName,
          input?: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn>,
        ]
      : [
          route: TRouteName,
          input: GetPathInputByRoute<ExtractRoute<TRoutes, TRouteName>>,
          options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn>,
        ]
  ): RedirectTask<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
  to: (
    to: string,
    options?: RedirectOptionsByAdapterNavigateFn<TAdapterNavigateFn> & SpecialNavigateOptions,
  ) => RedirectTask<NavigateOptionsByAdapterNavigateFn<TAdapterNavigateFn>>
}

export type UseLocationOptions = { addHash?: boolean }
export type UseLocationFn = (options?: UseLocationOptions) => ExactLocation | UnknownLocation

export type NavigationStatus = 'idle' | 'prefetching' | 'transitioning'

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
  initial: false
}
export type NavigationPageStateLoading = {
  status: 'loading'
  error: undefined
  loading: true
  initial: false
}
export type NavigationPageStateError<TError extends ErrorPoint0 = ErrorPoint0> = {
  status: 'error'
  error: TError
  loading: false
  initial: false
}
export type NavigationPageStateInitial = {
  status: 'initial'
  error: undefined
  loading: undefined
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
export const NavigationPageStateContext = React.createContext<NavigationPageStateContextValue | null>(null)
export const getNavigationPageState = (): NavigationPageStateContextValue => {
  const navigationPageState = _ss.__POINT0_NAVIGATION_PAGE_STATE__.getWeak()
  if (navigationPageState) {
    return navigationPageState
  }
  throw new Error('NavigationPageStateContextProvider is not yet initialized')
}
export const useNavigationPageState = (): NavigationPageStateContextValue => {
  const ctx = React.useContext(NavigationPageStateContext)
  if (!ctx) throw new Error('useNavigationPageState must be used within NavigationPageStateContextProvider')
  return ctx
}

export type NavigationHelpersContextValue = {
  ssrLocation: AnyLocation | null
  adapterNavigate: AdapterNavigateFn
  useAdapterLocation: UseLocationFn
  addHashToLocation: boolean
  setPrevLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setNextLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setTransitionStatus: React.Dispatch<React.SetStateAction<NavigationStatus>>
  setTransitionError: React.Dispatch<React.SetStateAction<Error | undefined>>
  setPageState: React.Dispatch<React.SetStateAction<NavigationPageState>>
}
export const NavigationHelpersContext = React.createContext<NavigationHelpersContextValue | null>(null)
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
export const NavigationTransitionStateContext = React.createContext<NavigationTransitionStateContextValue | null>(null)
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
export const NavigationLocationContext = React.createContext<NavigationLocationContextValue | null>(null)

export type NavigationContextProviderProps = {
  children: React.ReactNode
  status?: NavigationStatus
  useAdapterLocation: UseLocationFn
  ssrLocation?: AnyLocation | null
  addHashToLocation?: boolean
  adapterNavigate: AdapterNavigateFn
}

export function NavigationContextProvider({
  children,
  status = 'idle',
  useAdapterLocation,
  ssrLocation,
  adapterNavigate,
  addHashToLocation = false,
}: NavigationContextProviderProps) {
  const [nextLocation, setNextLocation] = useState<AnyLocation | null>(null)
  const [prevLocation, setPrevLocation] = useState<AnyLocation | null>(null)
  const [transitionStatus, setTransitionStatus] = useState<NavigationStatus>(status)
  const [transitionError, setTransitionError] = useState<Error | undefined>(undefined)
  const [pageState, _setPageState] = useState<NavigationPageState>(
    _ss.__POINT0_NAVIGATION_PAGE_STATE__.getWeak() ?? {
      status: 'initial',
      error: undefined,
      loading: undefined,
      initial: true,
    },
  )
  const setPageState = useCallback<React.Dispatch<React.SetStateAction<NavigationPageState>>>((pageState) => {
    if (_point0_env.side.is.server) {
      const previousPageState = _ss.__POINT0_NAVIGATION_PAGE_STATE__.getWeak() ?? {
        status: 'initial',
        error: undefined,
        loading: undefined,
        initial: true,
      }
      const nextPageState = typeof pageState === 'function' ? pageState(previousPageState) : pageState
      _ss.__POINT0_NAVIGATION_PAGE_STATE__.set(nextPageState)
    } else {
      _setPageState(pageState)
    }
  }, [])

  const currentLocation = useAdapterLocation()
  useEffect(() => {
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
      setPageState,
    }),
    [ssrLocation, useAdapterLocation, adapterNavigate, addHashToLocation],
  )
  useEffect(() => {
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
  useEffect(() => {
    _ss.__POINT0_NAVIGATION_TRANSITION_STATE__.set(transitionStateValue)
  }, [transitionStateValue])

  useEffect(() => {
    _ss.__POINT0_NAVIGATION_PAGE_STATE__.set(pageState)
  }, [pageState])

  return (
    <NavigationHelpersContext.Provider value={helpersValue}>
      <NavigationTransitionStateContext.Provider value={transitionStateValue}>
        <NavigationPageStateContext.Provider value={pageState}>
          <NavigationLocationContext.Provider value={locationValue}>{children}</NavigationLocationContext.Provider>
        </NavigationPageStateContext.Provider>
      </NavigationTransitionStateContext.Provider>
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

export const useOnNavigate = (fn: UseOnNavigateFn) => {
  const ctx = useNavigationTransitionState()

  const prevLocationRef = useRef(ctx.currentLocation)
  const nextLocationRef = useRef(ctx.nextLocation)
  const cleanupFnRef = useRef<(() => void) | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    if (!ctx.nextLocation) {
      return
    }

    const prevLocation = prevLocationRef.current
    const nextLocation = ctx.nextLocation
    if (
      prevLocation.href && nextLocation.href
        ? prevLocation.href === nextLocation.href
        : prevLocation.hrefRel === nextLocation.hrefRel
    ) {
      return
    }

    const cleanup = fn({ prevLocation, nextLocation })
    cleanupFnRef.current = typeof cleanup === 'function' ? cleanup : null
    nextLocationRef.current = nextLocation
    setIsNavigating(true)
  }, [ctx.nextLocation])

  useEffect(() => {
    if (!isNavigating || !nextLocationRef.current) {
      return
    }
    if (ctx.status === 'idle') {
      cleanupFnRef.current?.()
      setIsNavigating(false)
      cleanupFnRef.current = null
      prevLocationRef.current = nextLocationRef.current
    }
  }, [ctx.status, isNavigating])
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

export type NavigateWithTransitionsReturnType<
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
> = Promise<{ location: AnyLocation; error: InstanceType<TErrorClass> | undefined }>
export async function navigateWithTransitions<
  TErrorClass extends ClassLikeError0<ErrorPoint0> = ClassLikeError0<ErrorPoint0>,
>({
  to: providedTo,
  navigate,
  options,
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
}: {
  to: string
  navigate: () => any
  options?: SpecialNavigateOptions
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
  helpers.setPrevLocation(prevLocation)
  helpers.setTransitionError(undefined)
  helpers.setNextLocation(location)
  helpers.setTransitionStatus('prefetching')
  try {
    await clientPoints.prefetchPage({
      location,
      policy: options?.prefetch,
      trigger: 'navigate',
    })
    if (navigateId !== _ss.__POINT0_CURRENT_NAVIGATE_ID__.get()) {
      return { location, error: new Error('Another navigate has been started') as InstanceType<TErrorClass> }
    }
    helpers.setTransitionStatus('transitioning')
    await navigate()
    helpers.setTransitionStatus('idle')
    helpers.setNextLocation(null)
    _ss.__POINT0_CURRENT_NAVIGATE_ID__.set(undefined)
    return { location, error: undefined }
  } catch (error) {
    if (navigateId !== _ss.__POINT0_CURRENT_NAVIGATE_ID__.get()) {
      return { location, error: new Error('Another navigate has been started') as InstanceType<TErrorClass> }
    }
    const error0 = ErrorClass.from(error) as InstanceType<TErrorClass>
    helpers.setTransitionError(error0)
    helpers.setTransitionStatus('transitioning')
    await navigate()
    helpers.setTransitionStatus('idle')
    helpers.setNextLocation(null)
    _ss.__POINT0_CURRENT_NAVIGATE_ID__.set(undefined)
    return { location, error: error0 }
  }
}

export class RedirectTask<TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions> {
  readonly to: string
  readonly status?: number
  readonly options?: TAdapterNavigateOptions & SpecialNavigateOptions

  constructor({
    to,
    status,
    options,
  }: {
    to: string
    status?: number
    options?: TAdapterNavigateOptions & SpecialNavigateOptions
  }) {
    this.to = to
    this.status = status
    this.options = options
  }

  serialize() {
    return {
      to: this.to,
      status: this.status,
      options: this.options,
    }
  }

  static from<TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions>(
    input:
      | string
      | Record<string, unknown>
      | { to: string; status?: number; options?: TAdapterNavigateOptions & SpecialNavigateOptions },
  ): RedirectTask<TAdapterNavigateOptions> {
    try {
      if (input instanceof RedirectTask) {
        return input
      }
      const parsed = typeof input === 'string' ? JSON.parse(input) : input
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('input must be an object')
      }
      if (typeof parsed.to !== 'string') {
        throw new Error('to must be a string')
      }
      if (parsed.status !== undefined && typeof parsed.status !== 'number') {
        throw new Error('status must be a number')
      }
      if ((parsed.options !== undefined && typeof parsed.options !== 'object') || parsed.options === null) {
        throw new Error('options must be an object')
      }
      return new RedirectTask({
        to: parsed.to,
        status: parsed.status,
        options: parsed.options as TAdapterNavigateOptions & SpecialNavigateOptions,
      })
    } catch (error) {
      throw new Error('Failed to parse redirect task: ' + (error instanceof Error ? error.message : String(error)))
    }
  }
}

export const ssrRedirectTask = superstore.define<RedirectTask | undefined>(
  '__POINT0_SSR_REDIRECT_TASK__',
  () => undefined,
  'serverOnlyStorage',
)

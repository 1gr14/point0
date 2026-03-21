import { Route0 } from '@devp0nt/route0'
import type { AnyLocation, AnyRouteOrDefinition, ExactLocation, KnownLocation, UnknownLocation } from '@devp0nt/route0'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ClientPoints } from './client-points.js'
import { ErrorPoint0 } from './error.js'
import type { ClassLikeError0 } from './error.js'
import { _ssItems } from './internals.js'
import { superstore } from './super-store.js'
import type { IfAnyThenElse } from './types.js'

export type AdapterNavigateOptions = Record<string, unknown>
export type AdapterNavigateFn = (to: string, options?: AdapterNavigateOptions) => any

export type UseAdapterLocationFn = () => AnyLocation

export type NavigationStatus = 'idle' | 'prefetching' | 'transitioning'

export type UseNavigationContextFn = () => NavigationContextValue
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
  NavigationPageStateSuccess | NavigationPageStateLoading | NavigationPageStateError,
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

export type NavigationContextValue = {
  ssrLocation: AnyLocation | null
  prevLocation: AnyLocation | null
  currentLocation: AnyLocation
  nextLocation: AnyLocation | null
  adapterNavigate: AdapterNavigateFn
  status: NavigationStatus
  error: Error | undefined
  useAdapterLocation: UseAdapterLocationFn
  addHashToLocation: boolean
  pageState: NavigationPageState

  // setters
  setPrevLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setNextLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setStatus: React.Dispatch<React.SetStateAction<NavigationStatus>>
  setError: React.Dispatch<React.SetStateAction<Error | undefined>>
  setPageState: React.Dispatch<React.SetStateAction<NavigationPageState>>
}

export const NavigationContext = React.createContext<NavigationContextValue | null>(null)
export type NavigationLocationContextValue = {
  useAdapterLocation: UseAdapterLocationFn
  currentLocation: AnyLocation
  addHashToLocation: boolean
}
export const NavigationLocationContext = React.createContext<NavigationLocationContextValue | null>(null)

export type NavigationContextProviderProps = {
  children: React.ReactNode
  status?: NavigationStatus
  useAdapterLocation: UseAdapterLocationFn
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
  const [navigationStatus, setStatus] = useState<NavigationStatus>(status)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [pageState, setPageState] = useState<NavigationPageState>({
    status: 'initial',
    error: undefined,
    loading: undefined,
    initial: true,
  })
  const currentLocation = useAdapterLocation()
  useEffect(() => {
    _ssItems.__POINT0_CURRENT_LOCATION__.set(currentLocation)
  }, [currentLocation])

  const value = useMemo(
    () => ({
      ssrLocation: ssrLocation ?? null,
      currentLocation,
      prevLocation,
      nextLocation,
      status: navigationStatus,
      error,
      adapterNavigate,
      setNextLocation,
      setPrevLocation,
      setStatus,
      setError,
      useAdapterLocation,
      addHashToLocation,
      pageState,
      setPageState,
    }),
    [
      ssrLocation,
      currentLocation,
      prevLocation,
      nextLocation,
      navigationStatus,
      error,
      useAdapterLocation,
      adapterNavigate,
    ],
  )
  useEffect(() => {
    _ssItems.__POINT0_NAVIGATION_CONTEXT__.set(value)
  }, [value])
  const locationValue = useMemo<NavigationLocationContextValue>(
    () => ({
      useAdapterLocation,
      currentLocation,
      addHashToLocation,
    }),
    [currentLocation, addHashToLocation, useAdapterLocation],
  )

  return (
    <NavigationContext.Provider value={value}>
      <NavigationLocationContext.Provider value={locationValue}>{children}</NavigationLocationContext.Provider>
    </NavigationContext.Provider>
  )
}

export const getNavigationContext = (): NavigationContextValue => {
  const navigationContext = _ssItems.__POINT0_NAVIGATION_CONTEXT__.getWeak()
  if (navigationContext) {
    return navigationContext
  }
  throw new Error('NavigationContextProvider is not yet initialized')
}

/** Hooks **/

export function useLocation(addHashToLocation?: boolean): UnknownLocation | ExactLocation
export function useLocation<TRoute extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  route?: TRoute,
  addHashToLocation?: boolean,
): UnknownLocation | KnownLocation<TRoute>
export function useLocation<TRoute extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  route?: TRoute,
  location?: AnyLocation,
  addHashToLocation?: boolean,
): UnknownLocation | KnownLocation<TRoute>
export function useLocation<TRoute extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  ...args: [(TRoute | boolean)?, (AnyLocation | boolean)?, boolean?]
) {
  const locationCtx = React.useContext(NavigationLocationContext)
  if (!locationCtx) throw new Error('useLocation must be used within NavigationLocationContextProvider')
  const locationByAdapter = locationCtx.useAdapterLocation()
  const { route, location, addHashToLocation } = ((): {
    route: TRoute | undefined
    location: AnyLocation
    addHashToLocation: boolean
  } => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const fallbackLocation = locationByAdapter ?? locationCtx.currentLocation
    if (args.length === 0) {
      return { route: undefined, location: fallbackLocation, addHashToLocation: locationCtx.addHashToLocation }
    }
    if (args.length === 1) {
      if (typeof args[0] === 'boolean') {
        return { route: undefined, location: fallbackLocation, addHashToLocation: args[0] }
      }
      return { route: args[0], location: fallbackLocation, addHashToLocation: locationCtx.addHashToLocation }
    }
    if (args.length === 2) {
      if (typeof args[1] === 'boolean') {
        return { route: args[0] as TRoute, location: fallbackLocation, addHashToLocation: args[1] }
      }
      return {
        route: args[0] as TRoute,
        location: args[1] as AnyLocation,
        addHashToLocation: locationCtx.addHashToLocation,
      }
    }
    return { route: args[0] as TRoute, location: args[1] as AnyLocation, addHashToLocation: !!args[2] }
  })()
  return useMemo(() => {
    const withHashSuffix = <T extends AnyLocation | UnknownLocation | ExactLocation<TRoute>>(location: T): T =>
      addHashToLocation
        ? Object.assign(location, { hash: typeof window !== 'undefined' ? window.location.hash : '' })
        : location
    if (!route) {
      return withHashSuffix(ClientPoints.getInstance().routes._.getLocation(location))
    }
    return withHashSuffix(Route0.from(route).getLocation(location))
  }, [route, location, ClientPoints.getInstance().routesHash, addHashToLocation])
}

export const useNavigationContext: UseNavigationContextFn = () => {
  const ctx = React.useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation must be used within NavigationContextProvider')
  return ctx
}

export const useNavigationLocationContext = (): NavigationLocationContextValue => {
  const ctx = React.useContext(NavigationLocationContext)
  if (!ctx) throw new Error('useNavigationLocationContext must be used within NavigationContextProvider')
  return ctx
}

// export const _usePageStateManager = (): {
//   pageState: NavigationPageState
//   setPageState: React.Dispatch<React.SetStateAction<NavigationPageState>>
// } => {
//   const ctx = React.useContext(NavigationContext)
//   if (!ctx) throw new Error('useSetPageState must be used within NavigationContextProvider')
//   return { pageState: ctx.pageState, setPageState: ctx.setPageState }
// }

export const useOnNavigate = (fn: UseOnNavigateFn) => {
  const ctx = React.useContext(NavigationContext)
  if (!ctx) throw new Error('useOnNavigate must be used within NavigationContextProvider')

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
  ErrorClass = ErrorPoint0 as unknown as TErrorClass,
}: {
  to: string
  navigate: () => any
  ErrorClass?: TErrorClass
}): NavigateWithTransitionsReturnType<TErrorClass> {
  const navigationContext = getNavigationContext()
  const to = (() => {
    if (providedTo.startsWith('#')) {
      return navigationContext.currentLocation.pathname + providedTo
    }
    return providedTo
  })()
  const prevLocation = navigationContext.currentLocation
  const location = ClientPoints.getInstance().routes._.getLocation(to)
  navigationContext.setPrevLocation(prevLocation)
  navigationContext.setError(undefined)
  navigationContext.setNextLocation(location)
  navigationContext.setStatus('prefetching')
  try {
    await ClientPoints.getInstance().prefetchPage({
      location,
      trigger: 'navigate',
    })
    navigationContext.setStatus('transitioning')
    await navigate()
    navigationContext.setStatus('idle')
    navigationContext.setNextLocation(null)
    return { location, error: undefined }
  } catch (error) {
    const error0 = ErrorClass.from(error) as InstanceType<TErrorClass>
    navigationContext.setError(error0)
    navigationContext.setStatus('transitioning')
    await navigate()
    navigationContext.setStatus('idle')
    navigationContext.setNextLocation(null)
    return { location, error: error0 }
  }
}

export class RedirectTask<TNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions> {
  readonly to: string
  readonly status?: number
  readonly options?: TNavigateOptions

  constructor({ to, status, options }: { to: string; status?: number; options?: TNavigateOptions }) {
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

  static from<TNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions>(
    input: string | Record<string, unknown> | { to: string; status?: number; options?: TNavigateOptions },
  ): RedirectTask<TNavigateOptions> {
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
        options: parsed.options as TNavigateOptions,
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

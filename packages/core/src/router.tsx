import { Error0 } from '@devp0nt/error0'
import type { AnyLocation, AnyRouteOrDefinition, KnownLocation } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ClientPoints } from './client-points.js'
import { _ssItems } from './internals.js'
import type { IfAnyThenElse } from './types.js'

export type UseAdapterLocationFn = () => AnyLocation

export type RouterStatus = 'idle' | 'prefetching' | 'transitioning'

export type UseRouterContextFn = () => RouterContextValue
export type UseNavigateFn = (href: string) => never | Promise<never>
export type UseOnNavigateFn = (options: {
  prevLocation: AnyLocation
  nextLocation: AnyLocation
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
}) => void | (() => void)
export type UseOnNavigateDetailedFn = (options: {
  prevLocation: AnyLocation
  nextLocation: AnyLocation
  status: RouterStatus
  error: Error | undefined
}) => void
export type UseIsInitalSsrLocationFn = () => boolean

export type RouterPageStateSuccess = {
  status: 'success'
  error: undefined
  loading: false
  initial: false
}
export type RouterPageStateLoading = {
  status: 'loading'
  error: undefined
  loading: true
  initial: false
}
export type RouterPageStateError = {
  status: 'error'
  error: Error0
  loading: false
  initial: false
}
export type RouterPageStateInitial = {
  status: 'initial'
  error: undefined
  loading: undefined
  initial: true
}
export type RouterPageState<TStatus extends 'success' | 'loading' | 'error' | 'initial' = any> = IfAnyThenElse<
  TStatus,
  RouterPageStateSuccess | RouterPageStateLoading | RouterPageStateError,
  TStatus extends 'success'
    ? RouterPageStateSuccess
    : TStatus extends 'loading'
      ? RouterPageStateLoading
      : TStatus extends 'error'
        ? RouterPageStateError
        : TStatus extends 'initial'
          ? RouterPageStateInitial
          : never
>

export type RouterContextValue = {
  ssrLocation: AnyLocation | null
  // isSsr: boolean
  prevLocation: AnyLocation | null
  currentLocation: AnyLocation
  nextLocation: AnyLocation | null
  status: RouterStatus
  error: Error | undefined
  useAdapterLocation: UseAdapterLocationFn
  addHashToLocation: boolean
  pageState: RouterPageState

  // setters
  setPrevLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setNextLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setStatus: React.Dispatch<React.SetStateAction<RouterStatus>>
  setError: React.Dispatch<React.SetStateAction<Error | undefined>>
  setPageState: React.Dispatch<React.SetStateAction<RouterPageState>>
}

export const RouterContext = React.createContext<RouterContextValue | null>(null)

export type RouterContextProviderProps = {
  children: React.ReactNode
  status?: RouterStatus
  useAdapterLocation: UseAdapterLocationFn
  ssrLocation?: AnyLocation | null
  addHashToLocation?: boolean
}

export function RouterContextProvider({
  children,
  status = 'idle',
  useAdapterLocation,
  ssrLocation,
  addHashToLocation = false,
}: RouterContextProviderProps) {
  const [nextLocation, setNextLocation] = useState<AnyLocation | null>(null)
  const [prevLocation, setPrevLocation] = useState<AnyLocation | null>(null)
  const [routerStatus, setStatus] = useState<RouterStatus>(status)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [pageState, setPageState] = useState<RouterPageState>({
    status: 'initial',
    error: undefined,
    loading: undefined,
    initial: true,
  })
  const currentLocation = useAdapterLocation()
  useEffect(() => {
    _ssItems.__POINT0_CURRENT_LOCATION__.set(currentLocation)
  }, [currentLocation])

  // const [isSsr, setIsSsr] = useState(!!ssrLocation)
  // useEffect(() => {
  //   if (isSsr) {
  //     setIsSsr(false)
  //   }
  // }, [isSsr])

  const value = useMemo(
    () => ({
      ssrLocation: ssrLocation ?? null,
      currentLocation,
      prevLocation,
      nextLocation,
      status: routerStatus,
      error,
      setNextLocation,
      setPrevLocation,
      setStatus,
      setError,
      useAdapterLocation,
      // isSsr,
      addHashToLocation,
      pageState,
      setPageState,
    }),
    [ssrLocation, currentLocation, prevLocation, nextLocation, routerStatus, error, useAdapterLocation],
  )
  useEffect(() => {
    // _routerContextHolder.value = value
    _ssItems.__POINT0_ROUTER_CONTEXT__.set(value)
  }, [value])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

// const _routerContextHolder = { value: null as RouterContextValue | null }
export const getRouterContext = (): RouterContextValue => {
  const routerContext = _ssItems.__POINT0_ROUTER_CONTEXT__.getWeak()
  if (routerContext) {
    return routerContext
  }
  throw new Error('RouterContextProvider is not yet initialized')
}

/** Hooks **/

export function useLocation(addHashToLocation?: boolean): AnyLocation
export function useLocation<TRoute extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  route?: TRoute,
  addHashToLocation?: boolean,
): KnownLocation<TRoute>
export function useLocation<TRoute extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  route?: TRoute,
  location?: AnyLocation,
  addHashToLocation?: boolean,
): KnownLocation<TRoute>
export function useLocation<TRoute extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  ...args: [(TRoute | boolean)?, (AnyLocation | boolean)?, boolean?]
) {
  const routerCtx = React.useContext(RouterContext)
  if (!routerCtx) throw new Error('useLocation must be used within RouterContextProvider')
  const locationByAdapter = routerCtx.useAdapterLocation()
  const { route, location, addHashToLocation } = ((): {
    route: TRoute | undefined
    location: AnyLocation
    addHashToLocation: boolean
  } => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const fallbackLocation = locationByAdapter ?? routerCtx.currentLocation
    if (args.length === 0) {
      return { route: undefined, location: fallbackLocation, addHashToLocation: routerCtx.addHashToLocation }
    }
    if (args.length === 1) {
      if (typeof args[0] === 'boolean') {
        return { route: undefined, location: fallbackLocation, addHashToLocation: args[0] }
      }
      return { route: args[0], location: fallbackLocation, addHashToLocation: routerCtx.addHashToLocation }
    }
    if (args.length === 2) {
      if (typeof args[1] === 'boolean') {
        return { route: args[0] as TRoute, location: fallbackLocation, addHashToLocation: args[1] }
      }
      return {
        route: args[0] as TRoute,
        location: args[1] as AnyLocation,
        addHashToLocation: routerCtx.addHashToLocation,
      }
    }
    return { route: args[0] as TRoute, location: args[1] as AnyLocation, addHashToLocation: !!args[2] }
  })()
  return useMemo(() => {
    // const hashSuffix = routerCtx.isSsr ? '' : typeof window !== 'undefined' ? window.location.hash : ''
    const hashSuffix = !addHashToLocation ? '' : typeof window !== 'undefined' ? window.location.hash : ''
    if (!route) {
      return { ...(ClientPoints.getInstance().routes._.getLocation(location) as AnyLocation), hash: hashSuffix }
    }
    return { ...(Route0.from(route).getLocation(location) as KnownLocation<TRoute>), hash: hashSuffix }
    // }, [route, location, PointsManager.getPointsManager().routesHash, routerCtx.isSsr])
  }, [route, location, addHashToLocation ? ClientPoints.getInstance().routesHash : '', addHashToLocation])
}

// export const useIsInitalSsrLocation: UseIsInitalSsrLocationFn = () => {
//   const ctx = React.useContext(RouterContext)
//   if (!ctx) throw new Error('useIsInitalSsrLocation must be used within RouterContextProvider')
//   const location = useLocation()
//   return !!ctx.ssrLocation && ctx.ssrLocation.href === location.href
// }

// export const useIsRouterPrefetching = (): boolean => {
//   const ctx = React.useContext(RouterContext)
//   if (!ctx) throw new Error('useIsRouterPrefetching must be used within RouterContextProvider')
//   return ctx.status === 'prefetching'
// }

export const useRouterContext: UseRouterContextFn = () => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used within RouterContextProvider')
  return ctx
}

export const _usePageStateManager = (): {
  pageState: RouterPageState
  setPageState: React.Dispatch<React.SetStateAction<RouterPageState>>
} => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useSetPageState must be used within RouterContextProvider')
  return { pageState: ctx.pageState, setPageState: ctx.setPageState }
}

export const useOnNavigate = (fn: UseOnNavigateFn) => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useOnNavigate must be used within RouterContextProvider')

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

// export const useOnNavigateDetailed = (fn: UseOnNavigateDetailedFn) => {
//   const ctx = React.useContext(RouterContext)
//   if (!ctx) throw new Error('useOnNavigate must be used within RouterContextProvider')

//   const prevLocationRef = useRef(ctx.currentLocation)
//   const nextLocationRef = useRef(ctx.nextLocation)
//   const [isNavigating, setIsNavigating] = useState(false)

//   useEffect(() => {
//     if (!ctx.nextLocation) {
//       return
//     }

//     const prevLocation = prevLocationRef.current
//     const nextLocation = ctx.nextLocation
//     console.log('prevLocation', prevLocation)
//     console.log('nextLocation', nextLocation)
//     if (
//       prevLocation.href && nextLocation.href
//         ? prevLocation.href === nextLocation.href
//         : prevLocation.hrefRel === nextLocation.hrefRel
//     ) {
//       return
//     }

//     nextLocationRef.current = nextLocation
//     setIsNavigating(true)
//   }, [ctx.nextLocation])

//   useEffect(() => {
//     if (!isNavigating || !nextLocationRef.current) {
//       return
//     }
//     fn({
//       prevLocation: prevLocationRef.current,
//       nextLocation: nextLocationRef.current,
//       status: ctx.status,
//       error: ctx.error,
//     })
//     if (ctx.status === 'idle') {
//       prevLocationRef.current = nextLocationRef.current
//       setIsNavigating(false)
//     }
//   }, [ctx.status, ctx.error, isNavigating])
// }

export function _wrapUseNavigate<T extends () => (to: string, ...args: any[]) => any>(
  useAdapterNavigate: T,
): () => (...args: Parameters<ReturnType<T>>) => Promise<{ location: AnyLocation; error: Error0 | undefined }> {
  return () => {
    // const routerContext = React.useContext(RouterContext)
    // if (!routerContext) throw new Error('useNavigate must be used within RouterContextProvider')
    const adapterNavigate = useAdapterNavigate()
    return _wrapNavigate(adapterNavigate)

    // return async (...args: Parameters<ReturnType<T>>) => {
    //   const to = (() => {
    //     // if (args[0].startsWith('#') && routerContext.addHashToLocation) {
    //     return routerContext.currentLocation.pathname + args[0]
    //     // }
    //     // return args[0]
    //   })()
    //   const prevLocation = routerContext.currentLocation
    //   const location = PointsManager.getPointsManager().routes._.getLocation(to)
    //   routerContext.setPrevLocation(prevLocation)
    //   routerContext.setError(null)
    //   routerContext.setNextLocation(location)
    //   routerContext.setStatus('prefetching')
    //   try {
    //     await PointsManager.getPointsManager().prefetchSuitablePagePoint({
    //       location,
    //     })
    //     routerContext.setStatus('transitioning')
    //     await adapterNavigate(...(args as [string, ...any[]]))
    //     routerContext.setStatus('idle')
    //     routerContext.setNextLocation(null)
    //     return { location, error: null }
    //   } catch (error) {
    //     const error0 = Error0.from(error)
    //     routerContext.setError(error0)
    //     routerContext.setStatus('transitioning')
    //     await adapterNavigate(...(args as [string, ...any[]]))
    //     routerContext.setStatus('idle')
    //     routerContext.setNextLocation(null)
    //     return { location, error: error0 }
    //   }
    // }
  }
}

export function _wrapNavigate<T extends (to: string, ...args: any[]) => any>(
  adapterNavigate: T,
): (...args: Parameters<T>) => Promise<{ location: AnyLocation; error: Error0 | undefined }> {
  return async (...args: Parameters<T>) => {
    const routerContext = getRouterContext()
    const to = (() => {
      if (args[0].startsWith('#')) {
        return routerContext.currentLocation.pathname + args[0]
      }
      return args[0]
    })()
    const prevLocation = routerContext.currentLocation
    const location = ClientPoints.getInstance().routes._.getLocation(to)
    routerContext.setPrevLocation(prevLocation)
    routerContext.setError(undefined)
    routerContext.setNextLocation(location)
    routerContext.setStatus('prefetching')
    try {
      await ClientPoints.getInstance().prefetchPage({
        location,
        trigger: 'navigate',
      })
      routerContext.setStatus('transitioning')

      await adapterNavigate(...(args as [string, ...any[]]))
      routerContext.setStatus('idle')
      routerContext.setNextLocation(null)
      return { location, error: undefined }
    } catch (error) {
      const error0 = Error0.from(error)
      routerContext.setError(error0)
      routerContext.setStatus('transitioning')

      await adapterNavigate(...(args as [string, ...any[]]))
      routerContext.setStatus('idle')
      routerContext.setNextLocation(null)
      return { location, error: error0 }
    }
  }
}

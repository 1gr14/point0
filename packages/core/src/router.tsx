import { Error0 } from '@devp0nt/error0'
import type { AnyLocation, AnyRouteOrDefinition, KnownLocation } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ExtractorStore } from './extractor-store.js'
import { PointsManager } from './points-manager.js'

export type UseAdapterLocationFn = () => AnyLocation

export type RouterStatus = 'idle' | 'prefetching' | 'transitioning'
export type RouterPolicy = 'simple' | 'prefetch'

export type UseRouterContextFn = () => RouterContextValue
export type UseNavigateFn = (href: string) => never | Promise<never>
export type UseOnNavigateFn = (props: {
  prevLocation: AnyLocation
  nextLocation: AnyLocation
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
}) => void | (() => any)
export type UseOnNavigateDetailedFn = (props: {
  prevLocation: AnyLocation
  nextLocation: AnyLocation
  status: RouterStatus
  error: Error | null
}) => void
export type UseIsInitalSsrLocationFn = () => boolean
export type UseRouterPolicyFn = () => RouterPolicy

type RouterContextValue = {
  ssrLocation: AnyLocation | null
  prevLocation: AnyLocation | null
  currentLocation: AnyLocation
  nextLocation: AnyLocation | null
  policy: RouterPolicy
  status: RouterStatus
  error: Error | null
  useAdapterLocation: UseAdapterLocationFn

  // setters
  setPrevLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setNextLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setStatus: React.Dispatch<React.SetStateAction<RouterStatus>>
  setError: React.Dispatch<React.SetStateAction<Error | null>>
}

export const RouterContext = React.createContext<RouterContextValue | null>(null)

export type RouterContextProviderProps = {
  children: React.ReactNode
  policy?: RouterPolicy
  status?: RouterStatus
  useAdapterLocation: UseAdapterLocationFn
  ssrLocation?: AnyLocation | null
}

export function RouterContextProvider({
  children,
  policy = 'simple',
  status = 'idle',
  useAdapterLocation,
  ssrLocation,
}: RouterContextProviderProps) {
  const [nextLocation, setNextLocation] = useState<AnyLocation | null>(null)
  const [prevLocation, setPrevLocation] = useState<AnyLocation | null>(null)
  const [routerStatus, setStatus] = useState<RouterStatus>(status)
  const [error, setError] = useState<Error | null>(null)
  const currentLocation = useAdapterLocation()
  useEffect(() => {
    // Point0._currentLocation.set(currentLocation)
    ExtractorStore.set('__POINT0_CURRENT_LOCATION__', currentLocation)
  }, [currentLocation])

  const value = useMemo(
    () => ({
      ssrLocation: ssrLocation ?? null,
      currentLocation,
      prevLocation,
      nextLocation,
      policy,
      status: routerStatus,
      error,
      setNextLocation,
      setPrevLocation,
      setStatus,
      setError,
      useAdapterLocation,
    }),
    [ssrLocation, currentLocation, prevLocation, nextLocation, policy, routerStatus, error, useAdapterLocation],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

/** Hooks **/

export function useLocation(): AnyLocation
export function useLocation<TRoute extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  route?: TRoute,
  location?: AnyLocation,
): KnownLocation<TRoute>
export function useLocation<TRoute extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  route?: TRoute,
  location?: AnyLocation,
) {
  const routerCtx = React.useContext(RouterContext)
  if (!routerCtx) throw new Error('useLocation must be used within RouterContextProvider')
  const locationByAdapter = routerCtx.useAdapterLocation()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- try remove usage of routerCtx.currentLocation
  location ??= locationByAdapter ?? routerCtx.currentLocation
  return useMemo(() => {
    if (!route) {
      return PointsManager.getGlobalPoints().routes._.getLocation(location) as AnyLocation
    }
    return Route0.from(route).getLocation(location) as KnownLocation<TRoute>
  }, [route, location, PointsManager.getGlobalPoints().routesHash])
}

// export const useIsInitalSsrLocation: UseIsInitalSsrLocationFn = () => {
//   const ctx = React.useContext(RouterContext)
//   if (!ctx) throw new Error('useIsInitalSsrLocation must be used within RouterContextProvider')
//   const location = useLocation()
//   return !!ctx.ssrLocation && ctx.ssrLocation.href === location.href
// }

export const useRouterPolicy: UseRouterPolicyFn = () => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useRouterPolicy must be used within RouterContextProvider')
  return ctx.policy
}

export const useIsRouterPrefetching = (): boolean => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useIsRouterPrefetching must be used within RouterContextProvider')
  return ctx.status === 'prefetching'
}

export const useRouterContext: UseRouterContextFn = () => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used within RouterContextProvider')
  return ctx
}

export const useOnNavigate = (fn: UseOnNavigateFn) => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useOnNavigate must be used within RouterContextProvider')

  const prevLocationRef = useRef(ctx.currentLocation)
  const nextLocationRef = useRef(ctx.nextLocation)
  const cleanupFnRef = useRef<(() => any) | null>(null)
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

export const useOnNavigateDetailed = (fn: UseOnNavigateDetailedFn) => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useOnNavigate must be used within RouterContextProvider')

  const prevLocationRef = useRef(ctx.currentLocation)
  const nextLocationRef = useRef(ctx.nextLocation)
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

    nextLocationRef.current = nextLocation
    setIsNavigating(true)
  }, [ctx.nextLocation])

  useEffect(() => {
    if (!isNavigating || !nextLocationRef.current) {
      return
    }
    fn({
      prevLocation: prevLocationRef.current,
      nextLocation: nextLocationRef.current,
      status: ctx.status,
      error: ctx.error,
    })
    if (ctx.status === 'idle') {
      prevLocationRef.current = nextLocationRef.current
      setIsNavigating(false)
    }
  }, [ctx.status, ctx.error, isNavigating])
}

export function _wrapUseNavigate<T extends () => (href: string, ...args: any[]) => any>(
  useAdapterNavigate: T,
): () => (...args: Parameters<ReturnType<T>>) => Promise<{ location: AnyLocation; error: Error0 | null }> {
  return () => {
    const routerContext = React.useContext(RouterContext)
    if (!routerContext) throw new Error('useNavigate must be used within RouterContextProvider')
    const queryClient = useQueryClient()
    const adapterNavigate = useAdapterNavigate()

    return async (...args: Parameters<ReturnType<T>>) => {
      const href = args[0]
      const prevLocation = routerContext.currentLocation
      const location = PointsManager.getGlobalPoints().routes._.getLocation(href)
      routerContext.setPrevLocation(prevLocation)
      routerContext.setError(null)
      routerContext.setNextLocation(location)

      // simple mode
      if (routerContext.policy === 'simple') {
        routerContext.setStatus('transitioning')

        try {
          await adapterNavigate(...(args as [string, ...any[]]))
          routerContext.setStatus('idle')
          routerContext.setNextLocation(null)
          // ctx.setCurrentLocation(location)
          return { location, error: null }
        } catch (error) {
          const error0 = Error0.from(error)
          routerContext.setError(error0)
          routerContext.setStatus('idle')
          routerContext.setNextLocation(null)
          return { location, error: error0 }
        }
      }

      // prefetch mode
      routerContext.setStatus('prefetching')
      try {
        await PointsManager.getGlobalPoints().prefetchSuitablePagePoint({
          location,
          queryClient,
          mode: 'serverAndClient',
        })
        routerContext.setStatus('transitioning')
        await adapterNavigate(...(args as [string, ...any[]]))
        routerContext.setStatus('idle')
        routerContext.setNextLocation(null)
        return { location, error: null }
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
}

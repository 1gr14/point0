import type { AnyLocation, AnyRouteOrDefinition, KnownLocation } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ExtractorStore } from './extractor-store.js'
import { PointsManager } from './points-manager.js'

export type UseAdapterLocationFn = () => AnyLocation

export type RouterStatus = 'idle' | 'transit' | 'fetching' | 'transit-success' | 'transit-error' | 'success' | 'error'
export type RouterPolicy = 'simple' | 'prefetch'

export type UseRouterContextFn = () => RouterContextValue
export type UseNavigateFn = (href: string) => never | Promise<never>
export type UseOnNavigateFn = (
  prevLocation: AnyLocation,
  nextLocation: AnyLocation,
) => ((status: RouterStatus) => void) | undefined
export type UseIsInitalSsrLocationFn = () => boolean
export type UseRouterPolicyFn = () => RouterPolicy

type RouterContextValue = {
  ssrLocation: AnyLocation | null
  prevLocation: AnyLocation | null
  currentLocation: AnyLocation
  nextLocation: AnyLocation | null
  policy: RouterPolicy
  status: RouterStatus
  useAdapterLocation: UseAdapterLocationFn

  // setters
  setPrevLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setNextLocation: React.Dispatch<React.SetStateAction<AnyLocation | null>>
  setStatus: React.Dispatch<React.SetStateAction<RouterStatus>>
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
      setNextLocation,
      setPrevLocation,
      setStatus,
      useAdapterLocation,
    }),
    [ssrLocation, currentLocation, prevLocation, nextLocation, policy, routerStatus, useAdapterLocation],
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

export const useIsRouterFetching = (): boolean => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useIsRouterFetching must be used within RouterContextProvider')
  return ctx.status === 'fetching'
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
  const cleanupRef = useRef<((status: RouterStatus) => void) | null>(null)

  // On navigation start
  useEffect(() => {
    if (!ctx.nextLocation) return
    const prev = prevLocationRef.current
    const next = ctx.nextLocation
    if (prev.href === next.href) return

    const cleanup = fn(prev, next)
    cleanupRef.current = typeof cleanup === 'function' ? cleanup : null
    prevLocationRef.current = next
  }, [ctx.nextLocation])

  // On navigation completion (status change)
  useEffect(() => {
    if (ctx.status === 'success' || ctx.status === 'error' || ctx.status === 'idle') {
      cleanupRef.current?.(ctx.status)
      cleanupRef.current = null
    }
  }, [ctx.status])
}

export function _wrapUseNavigate<T extends () => (href: string, ...args: any[]) => any>(
  useAdapterNavigate: T,
): () => (...args: Parameters<ReturnType<T>>) => Promise<{ status: RouterStatus; location: AnyLocation }> {
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
      routerContext.setNextLocation(location)

      // simple mode
      if (routerContext.policy === 'simple') {
        routerContext.setStatus('idle')

        try {
          await adapterNavigate(...(args as [string, ...any[]]))
          routerContext.setNextLocation(null)
          // ctx.setCurrentLocation(location)
          return { status: 'idle', location }
        } catch {
          routerContext.setNextLocation(null)
          return { status: 'idle', location }
        }
      }

      // prefetch mode
      routerContext.setStatus('fetching')

      try {
        await PointsManager.getGlobalPoints().prefetchSuitablePagePoint({
          location,
          queryClient,
          mode: 'any',
        })

        routerContext.setStatus('transit-success')
        await adapterNavigate(...(args as [string, ...any[]]))
        routerContext.setNextLocation(null)
        // ctx.setCurrentLocation(location)
        routerContext.setStatus('success')
        return { status: 'success', location }
      } catch {
        routerContext.setStatus('transit-error')
        await adapterNavigate(...(args as [string, ...any[]]))
        routerContext.setNextLocation(null)
        routerContext.setStatus('error')
        return { status: 'error', location: routerContext.currentLocation }
      }
    }
  }
}

import type { AnyLocation, AnyRouteOrDefinition, KnownLocation } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Point0 } from './index.js'

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
  ssrLocation: AnyLocation | undefined
  currentLocation: AnyLocation
  nextLocation: AnyLocation | undefined
  policy: RouterPolicy
  status: RouterStatus
  useAdapterLocation: UseAdapterLocationFn

  // setters
  setNextLocation: React.Dispatch<React.SetStateAction<AnyLocation | undefined>>
  setStatus: React.Dispatch<React.SetStateAction<RouterStatus>>
}

export const RouterContext = React.createContext<RouterContextValue | null>(null)

export type RouterContextProviderProps = {
  children: React.ReactNode
  policy?: RouterPolicy
  status?: RouterStatus
  useAdapterLocation: UseAdapterLocationFn
  ssrLocation?: AnyLocation | undefined
}

export function RouterContextProvider({
  children,
  policy = 'simple',
  status = 'idle',
  useAdapterLocation,
  ssrLocation,
}: RouterContextProviderProps) {
  const [nextLocation, setNextLocation] = useState<AnyLocation | undefined>()
  const [routerStatus, setStatus] = useState<RouterStatus>(status)
  const currentLocation = useAdapterLocation()
  useEffect(() => {
    Point0._currentLocation.set(currentLocation)
  }, [currentLocation])

  const value = useMemo(
    () => ({
      ssrLocation,
      currentLocation,
      nextLocation,
      policy,
      status: routerStatus,
      setNextLocation,
      setStatus,
      useAdapterLocation,
    }),
    [ssrLocation, currentLocation, nextLocation, policy, routerStatus, useAdapterLocation],
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
  return useMemo(() => {
    if (!route) {
      return Point0.getPoints().routes._.getLocation(location ?? routerCtx.currentLocation) as AnyLocation
    }
    return Route0.from(route).getLocation(location ?? routerCtx.currentLocation) as KnownLocation<TRoute>
  }, [route, location, routerCtx.currentLocation, Point0.getPoints().routesHash])
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
      const location = Point0.getPoints().routes._.getLocation(href)
      routerContext.setNextLocation(location)

      // simple mode
      if (routerContext.policy === 'simple') {
        routerContext.setStatus('idle')

        try {
          await adapterNavigate(...(args as [string, ...any[]]))
          routerContext.setNextLocation(undefined)
          // ctx.setCurrentLocation(location)
          return { status: 'idle', location }
        } catch {
          routerContext.setNextLocation(undefined)
          return { status: 'idle', location }
        }
      }

      // prefetch mode
      routerContext.setStatus('fetching')

      try {
        await Point0.getPoints().prefetchSuitablePagePoint({
          location,
          queryClient,
          mode: 'any',
        })

        routerContext.setStatus('transit-success')
        await adapterNavigate(...(args as [string, ...any[]]))
        routerContext.setNextLocation(undefined)
        // ctx.setCurrentLocation(location)
        routerContext.setStatus('success')
        return { status: 'success', location }
      } catch {
        routerContext.setStatus('transit-error')
        await adapterNavigate(...(args as [string, ...any[]]))
        routerContext.setNextLocation(undefined)
        routerContext.setStatus('error')
        return { status: 'error', location: routerContext.currentLocation }
      }
    }
  }
}

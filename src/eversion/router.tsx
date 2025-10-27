import { Route0 } from '@devp0nt/route0'
import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PagesTree, RoutesCollection } from './main.js'
import { Eversion0 } from './main.js'

export type UseAdapterLocationFn = UseLocationFn

export type RouterStatus = 'idle' | 'transit' | 'fetching' | 'transit-success' | 'transit-error' | 'success' | 'error'
export type RouterPolicy = 'simple' | 'prefetch'

export type UseRouterContextFn = () => RouterContextValue
export type UseLocationFn = <TRoute extends Route0.AnyRoute = Route0.AnyRoute>() => Route0.Location<TRoute>
export type UseNavigateFn = (href: string) => never | Promise<never>
export type UseRouteFn = <TRoute extends Route0.AnyRoute>(route: TRoute) => Route0.MatchResult<TRoute>
export type UseOnNavigateFn = (
  prevLocation: Route0.Location,
  nextLocation: Route0.Location,
) => ((status: RouterStatus) => void) | undefined
export type UseIsInitalSsrLocationFn = () => boolean
export type UseRouterPolicyFn = () => RouterPolicy

type RouterContextValue = {
  ssrLocation: Route0.Location | undefined
  currentLocation: Route0.Location
  nextLocation: Route0.Location | undefined
  policy: RouterPolicy
  status: RouterStatus
  pagesTree: PagesTree
  routes: RoutesCollection
  useAdapterLocation: UseAdapterLocationFn

  // setters
  setNextLocation: React.Dispatch<React.SetStateAction<Route0.Location | undefined>>
  setStatus: React.Dispatch<React.SetStateAction<RouterStatus>>
}

export const RouterContext = React.createContext<RouterContextValue | null>(null)

export type RouterContextProviderProps = {
  children: React.ReactNode
  policy?: RouterPolicy
  status?: RouterStatus
  pagesTree?: PagesTree
  routes: RoutesCollection
  useAdapterLocation: UseAdapterLocationFn
  ssrLocation?: Route0.Location | undefined
}

export function RouterContextProvider({
  children,
  policy = 'simple',
  status = 'idle',
  pagesTree = [],
  routes,
  useAdapterLocation,
  ssrLocation,
}: RouterContextProviderProps) {
  const [nextLocation, setNextLocation] = useState<Route0.Location | undefined>()
  const [routerStatus, setStatus] = useState<RouterStatus>(status)
  const currentLocation = useAdapterLocation()

  const value = useMemo(
    () => ({
      ssrLocation,
      currentLocation,
      nextLocation,
      policy,
      status: routerStatus,
      pagesTree,
      routes,
      setNextLocation,
      setStatus,
      useAdapterLocation,
    }),
    [ssrLocation, currentLocation, nextLocation, policy, routerStatus, pagesTree, routes, useAdapterLocation],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

/** Hooks **/

export function useLocation<TRoute extends Route0.AnyRoute = Route0.AnyRoute>(): Route0.Location<TRoute> {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useLocation must be used within RouterContextProvider')
  return ctx.currentLocation as Route0.Location<TRoute>
}

export const useRoute: UseRouteFn = <TRoute extends Route0.AnyRoute>(route: TRoute, location?: Route0.Location) => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useRoute must be used within RouterContextProvider')
  return useMemo(
    () => Route0.getMatch(route, location || ctx.currentLocation),
    [route, location || ctx.currentLocation],
  )
}

export const useIsInitalSsrLocation: UseIsInitalSsrLocationFn = () => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useIsInitalSsrLocation must be used within RouterContextProvider')
  const location = useLocation()
  return !!ctx.ssrLocation && ctx.ssrLocation.href === location.href
}

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

/** External helpers to modify context **/

export function setNextLocation(location: Route0.Location) {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('setNextLocation must be used within RouterContextProvider')
  ctx.setNextLocation(location)
}

/** Navigate helper **/

export function wrapUseNavigate<T extends () => (href: string, ...args: any[]) => any>(
  useAdapterNavigate: T,
): () => (...args: Parameters<ReturnType<T>>) => Promise<{ status: RouterStatus; location: Route0.Location }> {
  return () => {
    const ctx = React.useContext(RouterContext)
    if (!ctx) throw new Error('useNavigate must be used within RouterContextProvider')
    const queryClient = useQueryClient()
    const adapterNavigate = useAdapterNavigate()

    return async (...args: Parameters<ReturnType<T>>) => {
      const href = args[0]
      const rawLocation = Route0.getLocation(href)
      const location = Eversion0.getRouteMatch(ctx.routes, rawLocation)?.location || rawLocation
      ctx.setNextLocation(location)
      console.log('location', location)
      console.log('ctx.policy', ctx.policy)
      if (ctx.policy === 'simple') {
        ctx.setStatus('idle')

        try {
          await adapterNavigate(...(args as [string, ...any[]]))
          ctx.setNextLocation(undefined)
          // ctx.setCurrentLocation(location)
          return { status: 'idle', location }
        } catch {
          ctx.setNextLocation(undefined)
          return { status: 'idle', location }
        }
      }

      // PREFETCH MODE
      ctx.setStatus('fetching')

      try {
        console.log('prefetching')
        await Eversion0.prefetchSuitablePagePoint({
          pagesTree: ctx.pagesTree,
          location,
          queryClient,
        })
        console.log('prefetching done')

        ctx.setStatus('transit-success')
        await adapterNavigate(...(args as [string, ...any[]]))
        ctx.setNextLocation(undefined)
        // ctx.setCurrentLocation(location)
        ctx.setStatus('success')
        return { status: 'success', location }
      } catch {
        ctx.setStatus('transit-error')
        await adapterNavigate(...(args as [string, ...any[]]))
        ctx.setNextLocation(undefined)
        ctx.setStatus('error')
        return { status: 'error', location: ctx.currentLocation }
      }
    }
  }
}

/** Navigation hook **/

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

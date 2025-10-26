import { Route0 } from '@devp0nt/route0'
import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PagesTree, RoutesCollection } from './main.js'
import { Eversion0 } from './main.js'

export type UseAdapterNavigateFn = () => (href: string) => never | Promise<never>
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
) => never | ((status: RouterStatus) => never)

type RouterContextValue = {
  initialLocation: Route0.Location
  currentLocation: Route0.Location
  nextLocation: Route0.Location | undefined
  policy: RouterPolicy
  status: RouterStatus
  pagesTree: PagesTree
  useAdapterNavigate: UseAdapterNavigateFn
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
  useAdapterNavigate: UseAdapterNavigateFn
  useAdapterLocation: UseAdapterLocationFn
  initialLocation?: Route0.Location
}

export function RouterContextProvider({
  children,
  policy = 'simple',
  status = 'idle',
  pagesTree = [],
  routes,
  useAdapterNavigate,
  useAdapterLocation,
  initialLocation = Route0.getLocation(''),
}: RouterContextProviderProps) {
  const [nextLocation, setNextLocation] = useState<Route0.Location | undefined>()
  const [routerStatus, setStatus] = useState<RouterStatus>(status)
  const currentLocation = useAdapterLocation()

  const value = useMemo(
    () => ({
      initialLocation,
      currentLocation,
      nextLocation,
      policy,
      status: routerStatus,
      pagesTree,
      routes,
      setNextLocation,
      setStatus,
      useAdapterNavigate,
      useAdapterLocation,
    }),
    [
      initialLocation,
      currentLocation,
      nextLocation,
      policy,
      routerStatus,
      pagesTree,
      routes,
      useAdapterNavigate,
      useAdapterLocation,
    ],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

/** Hooks **/

export function useLocation<TRoute extends Route0.AnyRoute = Route0.AnyRoute>(): Route0.Location<TRoute> {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useLocation must be used within RouterContextProvider')
  return ctx.currentLocation as Route0.Location<TRoute>
}

export const useRoute: UseRouteFn = <TRoute extends Route0.AnyRoute>(route: TRoute) => {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useRoute must be used within RouterContextProvider')
  return useMemo(() => Route0.getMatch(route, ctx.currentLocation), [route, ctx.currentLocation])
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

export function useNavigate() {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useNavigate must be used within RouterContextProvider')

  const queryClient = useQueryClient()
  const adapterNavigate = ctx.useAdapterNavigate()

  const navigate = useCallback(
    async (href: string) => {
      const location = Route0.getLocation(href)
      ctx.setNextLocation(location)

      if (ctx.policy === 'simple') {
        // ── SIMPLE MODE ──
        ctx.setStatus('transit')

        // Immediate transition
        try {
          await adapterNavigate(location.href)
          // ctx.setCurrentLocation(location)
          ctx.setNextLocation(undefined)
          ctx.setStatus('idle')
          return { status: 'idle', location }
        } catch (err) {
          ctx.setStatus('idle')
          ctx.setNextLocation(undefined)
          return { status: 'idle', location: ctx.currentLocation }
        }
      } else {
        // ── PREFETCH MODE ──
        ctx.setStatus('fetching')

        try {
          await Eversion0.prefetchSuitablePagePoint({
            pagesTree: ctx.pagesTree,
            location,
            queryClient,
          })

          // After prefetch — perform actual navigation
          ctx.setStatus('transit-success')
          await adapterNavigate(location.href)
          // ctx.setCurrentLocation(location)
          ctx.setNextLocation(undefined)
          ctx.setStatus('success')
          return { status: 'success', location }
        } catch (err) {
          ctx.setStatus('transit-error')
          await adapterNavigate(location.href)
          ctx.setStatus('error')
          ctx.setNextLocation(undefined)
          return { status: 'error', location: ctx.currentLocation }
        }
      }
    },
    [ctx.policy, ctx.pagesTree, adapterNavigate, ctx.currentLocation, queryClient],
  )

  return navigate
}

/** Navigation hook **/

export function useOnNavigate(fn: UseOnNavigateFn) {
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

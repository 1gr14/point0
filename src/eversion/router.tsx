import { Route0 } from '@devp0nt/route0'
import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PagesTree } from './main.js'
import { Eversion0 } from './main.js'

export type UseRouteResult<TRoute extends Route0.AnyRoute> = Route0.MatchResult<TRoute>
export type UseRouteFn = <TRoute extends Route0.AnyRoute>(route: TRoute) => UseRouteResult<TRoute>
export type RouterStatus = 'idle' | 'transit' | 'fetching' | 'transit-success' | 'transit-error' | 'success' | 'error'
export type RouterPolicy = 'simple' | 'prefetch'
export type UseOnNavigateFn = (
  prevLocation: Route0.Location,
  nextLocation: Route0.Location,
) => never | ((status: RouterStatus) => never)
export type NavigateFn = (href: string) => Promise<{ status: RouterStatus; location: Route0.Location }>
export type RealNavigateFn = (href: string) => never | Promise<never>

type RouterContextValue = {
  initialLocation: Route0.Location
  currentLocation: Route0.Location
  nextLocation: Route0.Location | undefined
  policy: RouterPolicy
  status: RouterStatus
  pagesTree: PagesTree
  realNavigate: RealNavigateFn

  // setters
  setCurrentLocation: React.Dispatch<React.SetStateAction<Route0.Location>>
  setNextLocation: React.Dispatch<React.SetStateAction<Route0.Location | undefined>>
  setStatus: React.Dispatch<React.SetStateAction<RouterStatus>>
}

export const RouterContext = React.createContext<RouterContextValue | null>(null)

export type RouterContextProviderProps = {
  children: React.ReactNode
  policy?: RouterPolicy
  status?: RouterStatus
  pagesTree?: PagesTree
  realNavigate: RealNavigateFn
  initialLocation?: Route0.Location
}

export function RouterContextProvider({
  children,
  policy = 'simple',
  status = 'idle',
  pagesTree = [],
  realNavigate,
  initialLocation = Route0.getLocation(''),
}: RouterContextProviderProps) {
  const [currentLocation, setCurrentLocation] = useState(initialLocation)
  const [nextLocation, setNextLocation] = useState<Route0.Location | undefined>()
  const [routerStatus, setStatus] = useState<RouterStatus>(status)

  const value = useMemo(
    () => ({
      initialLocation,
      currentLocation,
      nextLocation,
      policy,
      status: routerStatus,
      pagesTree,
      setCurrentLocation,
      setNextLocation,
      setStatus,
      realNavigate,
    }),
    [initialLocation, currentLocation, nextLocation, policy, routerStatus, pagesTree],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

/** Hooks **/

export function useLocation<TRoute extends Route0.AnyRoute = Route0.AnyRoute>(): Route0.Location<TRoute> {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useLocation must be used within RouterContextProvider')
  return ctx.currentLocation as Route0.Location<TRoute>
}

export function useRoute<TRoute extends Route0.AnyRoute>(route: TRoute): UseRouteResult<TRoute> {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useRoute must be used within RouterContextProvider')
  return useMemo(() => Route0.getMatch(route, ctx.currentLocation), [route, ctx.currentLocation])
}

export function useRouter() {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used within RouterContextProvider')
  return ctx
}

/** External helpers to modify context **/

export function setCurrentLocation(location: Route0.Location) {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('setLocation must be used within RouterContextProvider')
  ctx.setCurrentLocation(location)
}

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

  const navigate = useCallback(
    async (href: string) => {
      const location = Route0.getLocation(href)
      ctx.setNextLocation(location)

      if (ctx.policy === 'simple') {
        // ── SIMPLE MODE ──
        ctx.setStatus('transit')

        // Immediate transition
        try {
          await ctx.realNavigate(location.href)
          ctx.setCurrentLocation(location)
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
          await ctx.realNavigate(location.href)
          ctx.setCurrentLocation(location)
          ctx.setNextLocation(undefined)
          ctx.setStatus('success')
          return { status: 'success', location }
        } catch (err) {
          ctx.setStatus('transit-error')
          await ctx.realNavigate(location.href)
          ctx.setStatus('error')
          ctx.setNextLocation(undefined)
          return { status: 'error', location: ctx.currentLocation }
        }
      }
    },
    [ctx.policy, ctx.pagesTree, ctx.realNavigate, ctx.currentLocation, queryClient],
  )

  return navigate
}

/** Navigation hook **/

export function useOnNavigate(fn: UseOnNavigateFn) {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useOnNavigate must be used within RouterContextProvider')

  const prevLocationRef = useRef<Route0.Location | null>(ctx.currentLocation)
  const cleanupRef = useRef<((status: RouterStatus) => void) | null>(null)

  useEffect(() => {
    const { policy, nextLocation } = ctx

    // no navigation
    if (!nextLocation) return

    const prev = prevLocationRef.current
    const next = nextLocation

    // prevent same href triggering twice
    if (!prev || prev.href === next.href) return

    // 1️⃣ call user callback on navigation start
    const cleanup = fn(prev, next)
    if (typeof cleanup === 'function') {
      cleanupRef.current = cleanup
    } else {
      cleanupRef.current = null
    }

    // 2️⃣ handle immediate transition (simple policy)
    if (policy === 'simple') {
      ctx.setStatus('idle')
      ctx.setCurrentLocation(next)
      ctx.setNextLocation(undefined)
      cleanupRef.current?.('success')
      cleanupRef.current = null
    }

    // 3️⃣ store last location for next run
    prevLocationRef.current = next
  }, [ctx.nextLocation])

  // 4️⃣ handle async completion for prefetch mode
  useEffect(() => {
    if (ctx.policy !== 'prefetch') return
    if (!ctx.nextLocation) return

    // when status changes, call cleanup with current status
    if (ctx.status === 'success' || ctx.status === 'error') {
      cleanupRef.current?.(ctx.status)
      cleanupRef.current = null
    }
  }, [ctx.status])
}

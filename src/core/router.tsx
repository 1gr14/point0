import type { AnyLocation, AnyRouteOrDefinition, KnownLocation } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Points, type PagesTree, type PagesTreeRecord } from './points.js'
import type { LayoutPoint, PagePoint } from './types.js'

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
  const pointsCtx = React.useContext(Points.Context)
  if (!pointsCtx) throw new Error('useLocation must be used within Points.Context')
  if (!routerCtx) throw new Error('useLocation must be used within RouterContextProvider')
  return useMemo(() => {
    if (!route) {
      return pointsCtx.routes._.getLocation(location ?? routerCtx.currentLocation) as AnyLocation
    }
    return Route0.create(route).getLocation(location ?? routerCtx.currentLocation) as KnownLocation<TRoute>
  }, [route, location, routerCtx.currentLocation, pointsCtx.routes])
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
    const pointsCtx = React.useContext(Points.Context)
    if (!routerContext) throw new Error('useNavigate must be used within RouterContextProvider')
    if (!pointsCtx) throw new Error('useNavigate must be used within Points.Context')
    const queryClient = useQueryClient()
    const adapterNavigate = useAdapterNavigate()

    return async (...args: Parameters<ReturnType<T>>) => {
      const href = args[0]
      const location = pointsCtx.routes._.getLocation(href)
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
        await _prefetchSuitablePagePoint({
          pagesTree: pointsCtx.pagesTree,
          location,
          queryClient,
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

// Best-effort prefetch for React.lazy components (safe if not lazy)
export const _prefetchLazyComponent = async (
  component: React.ComponentType<any> | React.LazyExoticComponent<React.ComponentType<any>> | undefined,
): Promise<void> => {
  const anyComp = component as any
  if (!anyComp) return
  try {
    // React 18 lazy internals
    if (anyComp?._init && anyComp?._payload) {
      await anyComp._init(anyComp._payload)
      return
    }
    // Some libraries expose preload()
    if (typeof anyComp?.preload === 'function') {
      await anyComp.preload()
      return
    }
    // Fallback: sometimes the payload carries a thunk
    if (anyComp?._payload && typeof anyComp._payload._result === 'function') {
      await anyComp._payload._result()
    }
  } catch {
    // ignore — prefetch is best-effort
  }
}

export const _getSuitablePagePoint = async ({
  pagesTree,
  location,
}: {
  pagesTree: PagesTree
  location: AnyLocation
}): Promise<
  | {
      pagePoint: PagePoint
      pageComponent: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
      layouts: Array<{
        layoutPoint: LayoutPoint
        layoutComponent:
          | React.ComponentType<{ children: React.ReactNode }>
          | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
      }>
    }
  | undefined
> => {
  type Found = {
    page: PagesTreeRecord['pages'][number]
    layoutPath: PagesTreeRecord[] // root -> node containing the page
  }

  let found: Found | undefined
  const stack: PagesTreeRecord[] = []

  const dfs = (node: PagesTreeRecord): void => {
    if (found) return
    stack.push(node)

    // check pages at this node
    for (const p of node.pages) {
      const match = p.route.getLocation(location)
      if (match.exact) {
        found = { page: p, layoutPath: [...stack] }
        break
      }
    }

    // descend if not found
    if (!found) {
      for (const child of node.nestedPagesTree) {
        dfs(child)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (found) break
      }
    }

    stack.pop()
  }

  for (const root of pagesTree) {
    dfs(root)
    if (found) break
  }

  if (!found) return undefined

  // Load the PagePoint (await if it's a promise-returning factory)
  const pagePoint = typeof found.page.pagePoint === 'function' ? await found.page.pagePoint() : found.page.pagePoint

  // Prefetch the (possibly lazy) page component
  await _prefetchLazyComponent(found.page.pageComponent)

  // Build layouts chain: take all ancestors that actually represent a layout node
  const layoutNodes = found.layoutPath.filter((n) => n.layoutComponent && n.layoutPoint) as Array<
    Required<Pick<PagesTreeRecord, 'layoutComponent' | 'layoutPoint'>>
  >

  // Resolve layoutPoints (if lazy factory) and prefetch lazy layout components
  const layouts = await Promise.all(
    layoutNodes.flatMap(async (n) => {
      if (!n.layoutComponent || !n.layoutPoint) {
        return [] as never
      }
      const layoutPoint = typeof n.layoutPoint === 'function' ? await n.layoutPoint() : n.layoutPoint
      await _prefetchLazyComponent(n.layoutComponent)
      return {
        layoutPoint,
        layoutComponent: n.layoutComponent,
      }
    }),
  )

  return {
    pagePoint,
    pageComponent: found.page.pageComponent,
    layouts,
  }
}

export const _prefetchSuitablePagePoint = async ({
  pagesTree,
  location,
  queryClient, // kept for signature parity if you need it later
}: {
  pagesTree: PagesTree
  location: AnyLocation
  queryClient: QueryClient
}): Promise<PagePoint | undefined> => {
  const result = await _getSuitablePagePoint({ pagesTree, location })
  if (!result) {
    return undefined
  }

  // const points = [result.pagePoint, ...result.layouts.map((l) => l.layoutPoint)]
  // await Promise.all(
  //   points.map(async (p) => {
  //     // TODO: if page or layout has not SELF loaders but only nested loaders, then prefetch only nested and to query cache add its result
  //     await p._prefetchQueryByLocation(location, { queryClient })
  //   }),
  // )
  await result.pagePoint.prefetchPage({ ...result.pagePoint._getUnsafeInputRawByLocation(location) }, { queryClient })

  return result.pagePoint
}

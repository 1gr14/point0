import type { AnyLocation, AnyRoute, AnyRouteOrDefinition, KnownLocation } from '@devp0nt/route0'
import { Routes, Route0 } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LoadedPointsCollection, PointsCollection } from './eversion.js'
import type { Id, LayoutPoint, PagePoint } from './types.js'

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

type RouterContextValue<TRoutes extends Routes = Routes> = {
  ssrLocation: AnyLocation | undefined
  currentLocation: AnyLocation
  nextLocation: AnyLocation | undefined
  policy: RouterPolicy
  status: RouterStatus
  pagesTree: PagesTree
  routes: TRoutes
  useAdapterLocation: UseAdapterLocationFn

  // setters
  setNextLocation: React.Dispatch<React.SetStateAction<AnyLocation | undefined>>
  setStatus: React.Dispatch<React.SetStateAction<RouterStatus>>
}

export const RouterContext = React.createContext<RouterContextValue | null>(null)

export type RouterContextProviderProps<TRoutes extends Routes = Routes> = {
  children: React.ReactNode
  policy?: RouterPolicy
  status?: RouterStatus
  pagesTree?: PagesTree
  routes: TRoutes
  useAdapterLocation: UseAdapterLocationFn
  ssrLocation?: AnyLocation | undefined
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

export function useLocation(): AnyLocation
export function useLocation<TRoute extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  route?: TRoute,
  location?: AnyLocation,
): KnownLocation<TRoute>
export function useLocation<TRoute extends AnyRouteOrDefinition = AnyRouteOrDefinition>(
  route?: TRoute,
  location?: AnyLocation,
) {
  const ctx = React.useContext(RouterContext)
  if (!ctx) throw new Error('useLocation must be used within RouterContextProvider')
  if (!route) {
    return location ?? ctx.currentLocation
  }
  return useMemo(
    () => Route0.create(route).getLocation(location ?? ctx.currentLocation) as KnownLocation<TRoute>,
    [route, location, ctx.currentLocation],
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
    const ctx = React.useContext(RouterContext)
    if (!ctx) throw new Error('useNavigate must be used within RouterContextProvider')
    const queryClient = useQueryClient()
    const adapterNavigate = useAdapterNavigate()

    return async (...args: Parameters<ReturnType<T>>) => {
      const href = args[0]
      const location = ctx.routes._.getLocation(href)
      ctx.setNextLocation(location)

      // simple mode
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

      // prefetch mode
      ctx.setStatus('fetching')

      try {
        console.log('prefetching', location)
        await _prefetchSuitablePagePointWithLayouts({
          pagesTree: ctx.pagesTree,
          location,
          queryClient,
        })

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

export const _prefetchSuitablePagePointWithLayouts = async ({
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

  const points = [result.pagePoint, ...result.layouts.map((l) => l.layoutPoint)]
  await Promise.all(
    points.map(async (p) => {
      // TODO: if page or layout has not SELF loaders but only nested loaders, then prefetch only nested and to query cache add its result
      await p._prefetchQueryByLocation(location, { queryClient })
    }),
  )

  return result.pagePoint
}

export const _toPagesAndLayoutsCollection = ({
  points,
}: {
  points: PointsCollection | LoadedPointsCollection
}): PagesAndLayoutsCollection => {
  const collection: PagesAndLayoutsCollection = {
    pages: [],
    layouts: [],
  }
  for (const record of points) {
    if (record.type !== 'layout' || !record.route) {
      continue
    }
    const point = record.point
    collection.layouts.push({
      type: 'layout',
      id: record.id,
      route: Route0.create(record.route),
      point: point as LayoutPoint | (() => Promise<LayoutPoint>),
      layoutComponent:
        typeof point === 'function'
          ? React.lazy(async () => ({
              default: (await point())._Layout,
            }))
          : point._Layout,
      layoutPagesRoutes: record.layoutPagesRoutes?.map((route) => Route0.create(route)) ?? [],
    })
  }
  for (const record of points) {
    if (record.type !== 'page' || !record.route) {
      continue
    }
    const point = record.point
    collection.pages.push({
      type: 'page',
      id: record.id,
      route: Route0.create(record.route),
      point: point as PagePoint | (() => Promise<PagePoint>),
      pageComponent:
        typeof point === 'function'
          ? React.lazy(async () => ({
              default: (await point())._Page,
            }))
          : point._Page,
      layoutComponents: collection.layouts
        // .filter((l) => record.layoutPagesRoutes?.includes(l.route.getDefinition()))
        .filter((l) =>
          l.layoutPagesRoutes.some(
            (lpr) => record.route && lpr.getDefinition() === Route0.create(record.route).getDefinition(),
          ),
        )
        .map((l) => l.layoutComponent),
    })
  }
  return collection
}

export const _toPagesTreeFromPagesAndLayouts = ({
  pagesAndLayouts,
}: {
  pagesAndLayouts: PagesAndLayoutsCollection
}): PagesTree => {
  const layouts = pagesAndLayouts.layouts
  const pages = pagesAndLayouts.pages
  const pagesWithoutLayouts = pages.filter((p) => p.layoutComponents.length === 0)

  const buildLayoutTree = (layout: LayoutsCollectionRecord, level = 0): PagesTreeRecord | undefined => {
    const layoutPages = pages.filter((p) =>
      layout.layoutPagesRoutes.some((lpr) => lpr.getDefinition() === p.route.getDefinition()),
    )
    const layoutPagesWhereThisLayoutIndexEqLevelAndIsLast = layoutPages.filter((lp) => {
      return (
        lp.layoutComponents[level] === layout.layoutComponent &&
        lp.layoutComponents[level] === lp.layoutComponents[lp.layoutComponents.length - 1]
      )
    })
    const nestedLayouts = layouts.filter(
      (l) =>
        l.route.getDefinition().startsWith(layout.route.getDefinition()) &&
        l.route.getDefinition() !== layout.route.getDefinition(),
    )
    const nestedLayoutsTrees = nestedLayouts.map((l) => buildLayoutTree(l, level + 1))
    const result: PagesTreeRecord = {
      route: layout.route,
      id: layout.id,
      layoutComponent: layout.layoutComponent,
      layoutPoint: layout.point,
      pages: layoutPagesWhereThisLayoutIndexEqLevelAndIsLast.map((lp) => ({
        id: lp.id,
        route: lp.route,
        pageComponent: lp.pageComponent,
        pagePoint: lp.point,
      })),
      nestedPagesTree: nestedLayoutsTrees.flatMap((t) => t ?? []),
    }
    if (result.nestedPagesTree.length === 0 && result.pages.length === 0) {
      return undefined
    }
    return result
  }

  const noLayoutTree: PagesTreeRecord = {
    route: Route0.create('/'),
    id: '_point0_no_layout_placeholder',
    pages: pagesWithoutLayouts.map((p) => ({
      id: p.id,
      route: p.route,
      pageComponent: p.pageComponent,
      pagePoint: p.point,
    })),
    layoutComponent: undefined,
    layoutPoint: undefined,
    nestedPagesTree: [],
  }
  const pagesTree: PagesTree = [
    ...(noLayoutTree.pages.length > 0 ? [noLayoutTree] : []),
    ...layouts.flatMap((l) => buildLayoutTree(l) ?? []),
  ]
  return pagesTree
}

export const toPagesTree = ({ points }: { points: PointsCollection | LoadedPointsCollection }): PagesTree => {
  const pagesAndLayouts = _toPagesAndLayoutsCollection({ points })
  return _toPagesTreeFromPagesAndLayouts({ pagesAndLayouts })
}

export const _toRoutesCollection = ({ pagesTree }: { pagesTree: PagesTree }): Routes => {
  const routes: Record<string, AnyRoute> = {}
  const traverse = (node: PagesTreeRecord): void => {
    // Add all page routes
    for (const page of node.pages) {
      routes[page.id] = page.route
    }
    // Recurse into nested layout trees
    for (const child of node.nestedPagesTree) {
      traverse(child)
    }
  }
  for (const root of pagesTree) {
    traverse(root)
  }
  return Routes.create(routes)
}

export const _toLoggablePagesTree = (pagesTree: PagesTree): object => {
  return pagesTree.map((node) => {
    return {
      route: node.route.getDefinition(),
      layoutComponent: !!node.layoutComponent,
      pages: node.pages.map((p) => p.route.getDefinition()),
      nestedPagesTree: _toLoggablePagesTree(node.nestedPagesTree),
    }
  })
}

export type PagesCollectionRecord = {
  type: 'page'
  id: Id
  route: AnyRoute
  point: PagePoint | (() => Promise<PagePoint>)
  pageComponent: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
  layoutComponents: Array<
    | React.ComponentType<{ children: React.ReactNode }>
    | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
  >
}
export type PagesCollection = PagesCollectionRecord[]

export type LayoutsCollectionRecord = {
  type: 'layout'
  id: Id
  route: AnyRoute
  point: LayoutPoint | (() => Promise<LayoutPoint>)
  layoutComponent:
    | React.ComponentType<{ children: React.ReactNode }>
    | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
  layoutPagesRoutes: AnyRoute[]
}
export type LayoutsCollection = LayoutsCollectionRecord[]

export type PagesAndLayoutsCollection = {
  pages: PagesCollection
  layouts: LayoutsCollection
}

export type PagesTreeRecord = {
  route: AnyRoute
  id: Id
  layoutPoint: LayoutPoint | (() => Promise<LayoutPoint>) | undefined
  layoutComponent:
    | React.ComponentType<{ children: React.ReactNode }>
    | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
    | undefined
  pages: Array<{
    id: Id
    route: AnyRoute
    pagePoint: PagePoint | (() => Promise<PagePoint>)
    pageComponent: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
  }>
  nestedPagesTree: PagesTreeRecord[]
}
export type PagesTree = PagesTreeRecord[]

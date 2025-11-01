import type { AnyLocation, AnyRoute, ExactLocation } from '@devp0nt/route0'
import { Route0, Routes } from '@devp0nt/route0'
import * as React from 'react'
import type { EndPoint, EndPointType, InputRaw, LayoutPoint, PagePoint, PointName, UndefinedRoute } from './types.js'
import type { QueryClient } from '@tanstack/react-query'

// TODO: when find suitable allow porvide "rootId", then it will find only inside that
// so remove force
export class Points<TReady extends boolean = boolean> {
  collection: TReady extends true ? ReadyRoutedPointsCollection : LazyRoutedPointsCollection
  ready: TReady
  pagesTree: PagesTree
  routes: Routes
  routesHash: string

  private constructor({
    collection,
    pagesTree,
    routes,
    ready,
  }: {
    collection: TReady extends true ? ReadyRoutedPointsCollection : LazyRoutedPointsCollection
    pagesTree: PagesTree
    routes: Routes
    ready: boolean
  }) {
    this.collection = collection
    this.pagesTree = pagesTree
    this.routes = routes
    this.ready = ready as TReady
    this.routesHash = routes._.pathsOrdering.join(',')
  }

  static readonly ready = (readyPoints: ReadyPointsCollection): Points<true> => {
    Points.validate(readyPoints)
    const routedPoints = Points.toRoutedPointsCollection(readyPoints)
    const pagesTree = Points.toPagesTree({ points: routedPoints })
    const routes = Points.toRoutes({ points: routedPoints })
    return new Points<true>({ collection: routedPoints, pagesTree, routes, ready: true })
  }

  static readonly lazy = (lazyPoints: LazyPointsCollection): Points<false> => {
    Points.validate(lazyPoints)
    const routedPoints = Points.toRoutedPointsCollection(lazyPoints)
    const pagesTree = Points.toPagesTree({ points: routedPoints })
    const routes = Points.toRoutes({ points: routedPoints })
    return new Points<false>({ collection: routedPoints, pagesTree, routes, ready: false })
  }

  async load(): Promise<Points<true>> {
    if (this.ready) {
      return this as Points<true>
    }
    const { readyPoints, errors } = await Points.toLoadedPointsCollection(this.collection as LazyRoutedPointsCollection)
    for (const error of errors) {
      console.error(error)
    }
    const pagesTree = Points.toPagesTree({ points: readyPoints })
    const routes = Points.toRoutes({ points: readyPoints })
    return new Points<true>({ collection: readyPoints, pagesTree, routes, ready: true })
  }

  static validate(points: ReadyPointsCollection | LazyPointsCollection): void {
    const rootRecordsCount = points.filter((r) => r.root).length
    if (rootRecordsCount > 1) {
      throw new Error(
        'Multiple root points are not allowed. Please, check why you have multiple root points. Maybe in generator your server base point comes to client points?',
      )
    }
  }

  private static toRoutedPointsCollection(points: LazyPointsCollection): LazyRoutedPointsCollection
  private static toRoutedPointsCollection(points: ReadyPointsCollection): ReadyRoutedPointsCollection
  private static toRoutedPointsCollection(
    points: LazyPointsCollection | ReadyPointsCollection,
  ): LazyRoutedPointsCollection | ReadyRoutedPointsCollection {
    return points.map((record, index) => {
      return {
        type: record.type,
        name: record.name,
        route: record.route ? Route0.create(record.route) : undefined,
        point: record.point,
        layouts: record.layouts ?? [],
      }
    }) as LazyRoutedPointsCollection | ReadyRoutedPointsCollection
  }

  private static readonly toRoutes = ({
    points,
  }: {
    points: ReadyRoutedPointsCollection | LazyRoutedPointsCollection
  }): Routes => {
    const routes: Record<string, AnyRoute> = {}
    for (const record of points) {
      if (record.route && record.type === 'page') {
        routes[record.name] = record.route
      }
    }
    return Routes.create(routes)
  }

  private static async toLoadedPointsCollection(
    points: LazyRoutedPointsCollection,
  ): Promise<{ readyPoints: ReadyRoutedPointsCollection; errors: unknown[] }> {
    const results = await Promise.allSettled(
      points.map(async (record, index) => {
        const pointPromise = typeof record.point === 'function' ? record.point() : record.point
        const point = await pointPromise
        const route = point._route
        if (point._pointType === 'page' && !route) {
          throw new Error(`No client route provided for page point. Index: ${index}.`)
        }
        const routeDefinition = route?.definition
        const recordRouteDefinition = record.route ? Route0.create(record.route).getDefinition() : undefined
        if (routeDefinition !== recordRouteDefinition) {
          // console.warn(
          //   `Client route definition does not match record route definition. Forget to regenerate points file?. Index: ${index}. Client route definition: ${routeDefinition}. Record route definition: ${recordRouteDefinition}.`,
          // )
        }
        const recordType = record.type
        const pointType = point._pointType
        const pointName = point._name
        const recordName = record.name
        if (pointName !== recordName) {
          // console.warn(
          //   `Point name does not match record name. Forget to regenerate points file?. Index: ${index}. ${pointType}.${pointName} !== ${recordType}.${recordName}`,
          // )
        }
        if (recordType !== pointType) {
          // console.warn(
          //   `Record type does not match point type. Forget to regenerate points file?. Index: ${index}. ${pointType}.${pointName} !== ${recordType}.${recordName}`,
          // )
        }
        const recordLayouts = record.layouts
        return {
          root: record.root,
          ready: true,
          point,
          route,
          name: pointName || record.name,
          type: pointType,
          layouts: recordLayouts,
        }
      }),
    )
    const readyPoints = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
    const errors = results.filter((r) => r.status === 'rejected').map((r) => r.reason)
    return { readyPoints, errors }
  }

  // pages tree

  private static readonly toPagesAndLayoutsCollection = ({
    points,
  }: {
    points: ReadyRoutedPointsCollection | LazyRoutedPointsCollection
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
        name: record.name,
        route: Route0.create(record.route),
        point: point as LayoutPoint | (() => Promise<LayoutPoint>),
        layoutComponent:
          typeof point === 'function'
            ? React.lazy(async () => ({
                default: (await point())._Layout,
              }))
            : point._Layout,
        layoutPagesRoutes: points
          .filter((p) => p.type === 'page' && p.layouts.some((l) => l === record.name))
          .flatMap((p) => p.route ?? []),
      })
    }
    for (const record of points) {
      if (record.type !== 'page' || !record.route) {
        continue
      }
      const point = record.point
      collection.pages.push({
        type: 'page',
        name: record.name,
        route: Route0.create(record.route),
        point: point as PagePoint | (() => Promise<PagePoint>),
        pageComponent:
          typeof point === 'function'
            ? React.lazy(async () => ({
                default: (await point())._Page,
              }))
            : point._Page,
        layouts: record.layouts,
      })
    }
    return collection
  }

  private static readonly toPagesTreeFromPagesAndLayouts = ({
    pagesAndLayouts,
  }: {
    pagesAndLayouts: PagesAndLayoutsCollection
  }): PagesTree => {
    const layouts = pagesAndLayouts.layouts
    const pages = pagesAndLayouts.pages
    const pagesWithoutLayouts = pages.filter((p) => !p.layouts.length)
    const buildLayoutTree = (layout: LayoutsCollectionRecord, level = 0): PagesTreeRecord | undefined => {
      const layoutPages = pages.filter((p) => layout.layoutPagesRoutes.some((lpr) => lpr.isSame(p.route)))
      const layoutPagesWhereThisLayoutIndexEqLevelAndIsLast = layoutPages.filter((lp) => {
        return lp.layouts[level] === layout.name && lp.layouts[level] === lp.layouts[lp.layouts.length - 1]
      })

      const nestedLayouts = layouts.filter((l) => l.route.isChildren(layout.route))
      const nestedLayoutsTrees = nestedLayouts.map((l) => buildLayoutTree(l, level + 1))
      const result: PagesTreeRecord = {
        route: layout.route,
        name: layout.name,
        layoutComponent: layout.layoutComponent,
        layoutPoint: layout.point,
        pages: layoutPagesWhereThisLayoutIndexEqLevelAndIsLast.map((lp) => ({
          name: lp.name,
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
      name: '_point0_no_layout_placeholder',
      pages: pagesWithoutLayouts.map((p) => ({
        name: p.name,
        route: p.route,
        pageComponent: p.pageComponent,
        pagePoint: p.point,
      })),
      layoutComponent: undefined,
      layoutPoint: undefined,
      nestedPagesTree: [],
    }
    const pagesTree: PagesTree = [
      ...layouts.flatMap((l) => buildLayoutTree(l) ?? []),
      ...(noLayoutTree.pages.length > 0 ? [noLayoutTree] : []),
    ]
    return pagesTree
  }

  private static readonly prefetchLazyComponent = async (
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

  private readonly getSuitablePagePointFromPagesTree = async ({
    location,
  }: {
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

    for (const root of this.pagesTree) {
      dfs(root)
      if (found) break
    }

    if (!found) return undefined

    // Load the PagePoint (await if it's a promise-returning factory)
    const pagePoint = typeof found.page.pagePoint === 'function' ? await found.page.pagePoint() : found.page.pagePoint

    // Prefetch the (possibly lazy) page component
    await Points.prefetchLazyComponent(found.page.pageComponent)

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
        await Points.prefetchLazyComponent(n.layoutComponent)
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

  prefetchSuitablePagePoint = async ({
    location,
    queryClient, // kept for signature parity if you need it later
    partial = false,
  }: {
    location: AnyLocation
    queryClient: QueryClient
    partial?: boolean
  }): Promise<PagePoint | undefined> => {
    const result = await this.getSuitablePagePointFromPagesTree({ location })
    if (!result) {
      return undefined
    }

    if (partial) {
      await Promise.all(
        [result.pagePoint, ...result.layouts.map((l) => l.layoutPoint)].map(async (p) => {
          const input = p._getUnsafeInputRawByLocation(location)
          await p.prefetchQuery(input, { queryClient })
        }),
      )
      return result.pagePoint
    }

    const input = result.pagePoint._getUnsafeInputRawByLocation(location)
    await result.pagePoint.prefetchPage(input, { queryClient })

    return result.pagePoint
  }

  private static readonly toPagesTree = ({
    points,
  }: {
    points: ReadyRoutedPointsCollection | LazyRoutedPointsCollection
  }): PagesTree => {
    const pagesAndLayouts = Points.toPagesAndLayoutsCollection({ points })
    return Points.toPagesTreeFromPagesAndLayouts({ pagesAndLayouts })
  }

  // suitable point

  getSuitablePoint({
    pageLocation,
    input,
    pointType,
    pointName,
  }: {
    pageLocation?: AnyLocation | undefined
    input?: InputRaw
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
  }):
    | {
        point: EndPoint
        pageLocation: ExactLocation | undefined
      }
    | undefined {
    if (!this.ready) {
      throw new Error('Points are not ready, call load() first')
    }
    for (const { route, point, type, name } of this.collection as ReadyRoutedPointsCollection) {
      if (pointType && type !== pointType) {
        continue
      }
      if (pointName) {
        if (name === pointName) {
          if (type !== 'page') {
            return {
              point,
              pageLocation: undefined,
            }
          }
          if (!route || !input) {
            return {
              point,
              pageLocation: undefined,
            }
          }
          // TODO: add helper for htis in route0, like route.getSelfLocation(input): ExactLocation
          const match = route.getLocation(route.get(input))
          return {
            point,
            pageLocation: match.exact ? match : undefined,
          }
        }
        continue
      }
      // only pages and layouts has client route, but layouts data never should be requested on server by its own client path,
      // becouse it can be same as page path, instead they are requested by its server path
      if (type !== 'page' || !pageLocation) {
        continue
      }
      const match = route?.getLocation(pageLocation)
      if (match?.exact) {
        return {
          point,
          pageLocation: match,
        }
      }
    }
    return undefined
  }

  pagesTreeToLogableObject = (pagesTree = this.pagesTree): Array<Record<string, any>> => {
    return pagesTree.map((p) => ({
      name: p.name,
      route: p.route.getDefinition(),
      layoutComponent: !!p.layoutComponent,
      layoutPoint: !!p.layoutPoint,
      pages: p.pages.map((p) => ({
        name: p.name,
        route: p.route.getDefinition(),
        pageComponent: !!p.pageComponent,
        pagePoint: !!p.pagePoint,
      })),
      nestedPagesTree: this.pagesTreeToLogableObject(p.nestedPagesTree),
    }))
  }

  static Context = React.createContext<Points | undefined>(undefined)
  Provider = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(Points.Context.Provider, { value: this }, children)
  }
}

export type LazyPointsCollectionRecord = {
  root?: boolean
  type: EndPointType
  name: PointName
  route?: string | undefined
  point: () => Promise<EndPoint>
  layouts?: string[]
}
export type LazyPointsCollection = LazyPointsCollectionRecord[]
export type ReadyPointsCollectionRecord = {
  root?: boolean
  type: EndPointType
  name: PointName
  route?: string | undefined
  point: EndPoint
  layouts?: string[]
}
export type ReadyPointsCollection = ReadyPointsCollectionRecord[]
export type LazyRoutedPointsCollectionRecord = {
  root?: boolean
  type: EndPointType
  name: PointName
  route: AnyRoute | UndefinedRoute
  point: () => Promise<EndPoint>
  layouts: string[]
}
export type LazyRoutedPointsCollection = LazyRoutedPointsCollectionRecord[]
export type ReadyRoutedPointsCollectionRecord = {
  root?: boolean
  type: EndPointType
  name: PointName
  route: AnyRoute | UndefinedRoute
  point: EndPoint
  layouts: string[]
}
export type ReadyRoutedPointsCollection = ReadyRoutedPointsCollectionRecord[]

export type PagesCollectionRecord = {
  type: 'page'
  name: PointName
  route: AnyRoute
  point: PagePoint | (() => Promise<PagePoint>)
  pageComponent: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
  layouts: string[]
}
export type PagesCollection = PagesCollectionRecord[]

export type LayoutsCollectionRecord = {
  type: 'layout'
  name: PointName
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
  name: PointName
  layoutPoint: LayoutPoint | (() => Promise<LayoutPoint>) | undefined
  layoutComponent:
    | React.ComponentType<{ children: React.ReactNode }>
    | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
    | undefined
  pages: Array<{
    name: PointName
    route: AnyRoute
    pagePoint: PagePoint | (() => Promise<PagePoint>)
    pageComponent: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
  }>
  nestedPagesTree: PagesTreeRecord[]
}
export type PagesTree = PagesTreeRecord[]

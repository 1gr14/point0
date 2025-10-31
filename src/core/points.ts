import type { AnyLocation, AnyRoute, ExactLocation } from '@devp0nt/route0'
import { Route0, Routes } from '@devp0nt/route0'
import * as React from 'react'
import type { EndPoint, EndPointType, InputRaw, LayoutPoint, PagePoint, PointName, UndefinedRoute } from './types.js'

// TODO: when find suitable allow porvide "rootId", then it will find only inside that
// so remove force
export class Points<TLoaded extends boolean = boolean> {
  collection: TLoaded extends true ? LoadedPointsCollection : RoutedPointsCollection
  loaded: TLoaded
  pagesTree: PagesTree
  routes: Routes

  private constructor({
    collection,
    pagesTree,
    routes,
    loaded,
  }: {
    collection: TLoaded extends true ? LoadedPointsCollection : RoutedPointsCollection
    pagesTree: PagesTree
    routes: Routes
    loaded: boolean
  }) {
    this.collection = collection
    this.pagesTree = pagesTree
    this.routes = routes
    this.loaded = loaded as TLoaded
  }

  static create(points: PointsCollection): Points<false> {
    const routedPoints = Points.toRoutedPointsCollection(points)
    const pagesTree = Points.toPagesTree({ points: routedPoints })
    const routes = Points.toRoutes({ points: routedPoints })
    return new Points<false>({ collection: routedPoints, pagesTree, routes, loaded: false })
  }

  static async load(points: PointsCollection): Promise<Points<true>> {
    const loadedPoints = await Points.toLoadedPointsCollection(points)
    const pagesTree = Points.toPagesTree({ points: loadedPoints })
    const routes = Points.toRoutes({ points: loadedPoints })
    return new Points<true>({ collection: loadedPoints, pagesTree, routes, loaded: true })
  }

  private static toRoutedPointsCollection(points: PointsCollection): RoutedPointsCollection {
    return points.map((record, index) => {
      return {
        type: record.type,
        id: record.id,
        route: record.route ? Route0.create(record.route) : undefined,
        point: record.point,
        layoutPagesRoutes: record.layoutPagesRoutes?.map((route) => Route0.create(route)) ?? [],
      }
    })
  }

  private static readonly toRoutes = ({
    points,
  }: {
    points: LoadedPointsCollection | RoutedPointsCollection
  }): Routes => {
    const routes: Record<string, AnyRoute> = {}
    for (const record of points) {
      if (record.route && record.type === 'page') {
        routes[record.id] = record.route
      }
    }
    return Routes.create(routes)
  }

  private static async toLoadedPointsCollection(points: PointsCollection): Promise<LoadedPointsCollection> {
    return await Promise.all(
      points.map(async (record, index) => {
        const pointPromise = typeof record.point === 'function' ? record.point() : record.point
        const [point] = await Promise.all([pointPromise])
        const route = point._route
        if (point._pointType === 'page' && !route) {
          throw new Error(`No client route provided for page point. Index: ${index}.`)
        }
        const routeDefinition = route?.definition
        const recordRouteDefinition = record.route ? Route0.create(record.route).getDefinition() : undefined
        if (routeDefinition !== recordRouteDefinition) {
          throw new Error(
            `Client route definition does not match record route definition. Forget to regenerate points file?. Index: ${index}. Client route definition: ${routeDefinition}. Record route definition: ${recordRouteDefinition}.`,
          )
        }
        const pointId = record.id
        const recordId = record.id
        if (pointId !== recordId) {
          throw new Error(
            `Point id does not match record id. Forget to regenerate points file?. Index: ${index}. Point id: ${pointId}. Record id: ${recordId}.`,
          )
        }
        const recordType = record.type
        const pointType = point._pointType
        if (recordType !== pointType) {
          throw new Error(
            `Record type does not match point type. Forget to regenerate points file?. Index: ${index}. Record type: ${recordType}. Point type: ${pointType}.`,
          )
        }
        const recordLayoutPagesRoutes = record.layoutPagesRoutes?.map((route) => Route0.create(route)) ?? []
        return {
          loaded: true,
          point,
          route,
          id: pointId,
          type: pointType,
          layoutPagesRoutes: recordLayoutPagesRoutes,
        }
      }),
    )
  }

  // pages tree

  private static readonly toPagesAndLayoutsCollection = ({
    points,
  }: {
    points: RoutedPointsCollection | LoadedPointsCollection
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
        layoutPagesRoutes: record.layoutPagesRoutes,
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
          .filter((l) => l.layoutPagesRoutes.some((lpr) => record.route?.isSame(lpr)))
          .map((l) => l.layoutComponent),
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
    const pagesWithoutLayouts = pages.filter((p) => p.layoutComponents.length === 0)

    const buildLayoutTree = (layout: LayoutsCollectionRecord, level = 0): PagesTreeRecord | undefined => {
      const layoutPages = pages.filter((p) => layout.layoutPagesRoutes.some((lpr) => lpr.isSame(p.route)))
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
        // TODO: use it
        // l.route.isChildren(layout.route),
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
      ...layouts.flatMap((l) => buildLayoutTree(l) ?? []),
      ...(noLayoutTree.pages.length > 0 ? [noLayoutTree] : []),
    ]
    return pagesTree
  }

  private static readonly toPagesTree = ({
    points,
  }: {
    points: RoutedPointsCollection | LoadedPointsCollection
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
    if (!this.loaded) {
      throw new Error('Points are not loaded')
    }
    for (const { route, point } of this.collection as LoadedPointsCollection) {
      if (pointType && point._pointType !== pointType) {
        continue
      }
      if (pointName) {
        if (point._name === pointName) {
          if (point._pointType !== 'page') {
            return {
              point,
              pageLocation: undefined,
            }
          }
          if (!point._route || !input) {
            return {
              point,
              pageLocation: undefined,
            }
          }
          // TODO: add helper for htis in route0, like route.getSelfLocation(input): ExactLocation
          const match = point._route.getLocation(point._route.get(input))
          return {
            point,
            pageLocation: match.exact ? match : undefined,
          }
        }
        continue
      }
      // only pages and layouts has client route, but layouts data never should be requested on server by its own client path,
      // becouse it can be same as page path, instead they are requested by its server path
      if (point._pointType !== 'page' || !pageLocation) {
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
      id: p.id,
      route: p.route.getDefinition(),
      layoutComponent: !!p.layoutComponent,
      layoutPoint: !!p.layoutPoint,
      pages: p.pages.map((p) => ({
        id: p.id,
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

export type PointsCollectionRecord<TEndPointType extends EndPointType = EndPointType> = {
  type: TEndPointType
  id: PointName
  route?: string | undefined
  point: EndPoint<TEndPointType> | (() => Promise<EndPoint<TEndPointType>>)
  layoutPagesRoutes?: string[]
}
export type PointsCollection = PointsCollectionRecord[]
export type RoutedPointsCollectionRecord<TEndPointType extends EndPointType = EndPointType> = {
  type: TEndPointType
  id: PointName
  route: AnyRoute | UndefinedRoute
  point: EndPoint<TEndPointType> | (() => Promise<EndPoint<TEndPointType>>)
  layoutPagesRoutes: AnyRoute[]
}
export type RoutedPointsCollection = RoutedPointsCollectionRecord[]
export type LoadedPointsCollectionRecord<TEndPointType extends EndPointType = EndPointType> = {
  type: TEndPointType
  id: PointName
  route: AnyRoute | UndefinedRoute
  point: EndPoint<TEndPointType>
  layoutPagesRoutes: AnyRoute[]
}
export type LoadedPointsCollection = LoadedPointsCollectionRecord[]

export type PagesCollectionRecord = {
  type: 'page'
  id: PointName
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
  id: PointName
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
  id: PointName
  layoutPoint: LayoutPoint | (() => Promise<LayoutPoint>) | undefined
  layoutComponent:
    | React.ComponentType<{ children: React.ReactNode }>
    | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
    | undefined
  pages: Array<{
    id: PointName
    route: AnyRoute
    pagePoint: PagePoint | (() => Promise<PagePoint>)
    pageComponent: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
  }>
  nestedPagesTree: PagesTreeRecord[]
}
export type PagesTree = PagesTreeRecord[]

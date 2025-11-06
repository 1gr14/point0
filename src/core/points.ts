import type { AnyLocation, AnyRoute, ExactLocation } from '@devp0nt/route0'
import { Route0, Routes } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { Point0 } from './index.js'
import type {
  EndPoint,
  EndPointType,
  InputRaw,
  LayoutPoint,
  PagePoint,
  PointName,
  PointType,
  RootPoint,
  UndefinedRoute,
} from './types.js'

// TODO: when find suitable allow porvide "rootId", then it will find only inside that
// so remove force
export class Points<TReady extends boolean = boolean> {
  collection: TReady extends true ? ReadyRoutedPointsCollection : LazyRoutedPointsCollection
  ready: TReady
  pagesTree: PagesTree
  routes: Routes
  routesHash: string

  private readonly pagesTreeSource: PagesTreeSource

  readonly _: {
    pagesTreeSource: Points['pagesTreeSource']
  }

  private constructor({
    collection,
    pagesTree,
    pagesTreeSource,
    routes,
    ready,
  }: {
    collection: TReady extends true ? ReadyRoutedPointsCollection : LazyRoutedPointsCollection
    pagesTree: PagesTree
    pagesTreeSource: PagesTreeSource
    routes: Routes
    ready: boolean
  }) {
    this.collection = collection
    this.pagesTree = pagesTree
    this.routes = routes
    this.ready = ready as TReady
    this.routesHash = routes._.pathsOrdering.join(',')
    this.pagesTreeSource = pagesTreeSource
    this._ = { pagesTreeSource }
  }

  static readonly ready = (readyPoints: ReadyPointsCollection | RawPointsCollection): Points<true> => {
    if (Points.isRawPointsCollection(readyPoints)) {
      readyPoints = Points.rawToReadyPointsCollection(readyPoints)
    }
    Points.validate(readyPoints)
    const routedPoints = Points.toRoutedPointsCollection(readyPoints)
    const pagesTreeSource = Points.toPagesTreeSource({ points: routedPoints })
    const pagesTree = Points.toPagesTree({ points: routedPoints, pagesTreeSource })
    const routes = Points.toRoutes({ points: routedPoints })
    return new Points<true>({ collection: routedPoints, pagesTree, pagesTreeSource, routes, ready: true })
  }

  static readonly lazy = (lazyPoints: LazyPointsCollection): Points<false> => {
    Points.validate(lazyPoints)
    const routedPoints = Points.toRoutedPointsCollection(lazyPoints)
    const pagesTreeSource = Points.toPagesTreeSource({ points: routedPoints })
    const pagesTree = Points.toPagesTree({ points: routedPoints, pagesTreeSource })
    const routes = Points.toRoutes({ points: routedPoints })
    return new Points<false>({ collection: routedPoints, pagesTree, pagesTreeSource, routes, ready: false })
  }

  async load(): Promise<Points<true>> {
    if (this.ready) {
      return this as Points<true>
    }
    const { readyPoints, errors } = await Points.toReadyPointsCollection(this.collection as LazyRoutedPointsCollection)
    for (const error of errors) {
      console.error(error)
    }
    const pagesTreeSource = this.pagesTreeSource
    const pagesTree = Points.toPagesTree({ points: readyPoints, pagesTreeSource })
    const routes = Points.toRoutes({ points: readyPoints })
    return new Points<true>({ collection: readyPoints, pagesTree, pagesTreeSource, routes, ready: true })
  }

  private static validate(points: ReadyPointsCollection | LazyPointsCollection): void {
    const rootRecordsCount = points.filter((r) => r.root).length
    if (rootRecordsCount > 1) {
      throw new Error(
        'Multiple root points are not allowed. Please, check why you have multiple root points. Maybe in generator your server base point comes to client points?',
      )
    }
  }

  _getRootPoint(): RootPoint | undefined {
    return this.collection.find((record) => record.root)?.point as RootPoint | undefined
  }

  private static isRawPointsCollection(points: any): points is RawPointsCollection {
    return points.length && points.every((p: any) => p instanceof Point0)
  }

  private static rawToReadyPointsCollection(points: RawPointsCollection): ReadyPointsCollection {
    return points.map((point) => {
      return {
        type: point._pointType,
        name: point._name || '__UNNAMED__',
        point,
        layouts: point._layouts.map((l) => l._name || '__UNNAMED__'),
        route: point._route,
        root: point._isRoot(),
      }
    })
  }

  //         typeof point === 'function'
  //           ? React.lazy(async () => ({
  //               default: (await point())._Layout,
  //             }))
  //           : point._Layout,

  private static toRoutedPointsCollection(points: LazyPointsCollection): LazyRoutedPointsCollection
  private static toRoutedPointsCollection(points: ReadyPointsCollection): ReadyRoutedPointsCollection
  private static toRoutedPointsCollection(
    points: LazyPointsCollection | ReadyPointsCollection,
  ): LazyRoutedPointsCollection | ReadyRoutedPointsCollection {
    return points.map((record, index) => {
      const point = record.point
      return {
        type: record.type,
        name: record.name,
        route: record.route ? Route0.from(record.route) : undefined,
        point: record.point,
        layouts: record.layouts ?? [],
        root: record.root,
        Component:
          record.type === 'layout'
            ? typeof point === 'function'
              ? React.lazy(async () => ({
                  default: (await point())._Layout,
                }))
              : point._Layout
            : record.type === 'page'
              ? typeof point === 'function'
                ? React.lazy(async () => ({
                    default: (await point())._Page,
                  }))
                : point._Page
              : record.type === 'component'
                ? typeof point === 'function'
                  ? React.lazy(async () => ({
                      default: (await point())._Component,
                    }))
                  : point._Component
                : record.type === 'provider'
                  ? typeof point === 'function'
                    ? React.lazy(async () => ({
                        default: (await point()).Provider,
                      }))
                    : point.Provider
                  : undefined,
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

  private static async toReadyPointsCollection(
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
        const recordRouteDefinition = record.route ? Route0.from(record.route).getDefinition() : undefined
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

  static readonly toPagesTreeSource = ({
    points,
  }: {
    points: ReadyRoutedPointsCollection | LazyRoutedPointsCollection
  }): PagesTreeSource => {
    const pages = points.filter((p) => p.type === 'page')
    const tree: PagesTreeSource = []

    const pagesWithoutLayout = pages.filter((p) => !p.layouts.length)
    if (pagesWithoutLayout.length) {
      tree.push({
        layout: undefined,
        pages: pagesWithoutLayout.map((p) => p.name),
        nested: undefined,
      })
    }

    const addPageToTree = ({
      tree,
      page,
      layouts,
    }: {
      tree: PagesTreeSource
      page: string
      layouts: string[] // min length 1
    }): PagesTreeSourceRecord => {
      const currentLevelLayoutRecord = (() => {
        for (const record of tree) {
          if (record.layout === layouts[0]) {
            return record
          }
        }
        const newRecord: PagesTreeSourceRecord = {
          layout: layouts[0],
          pages: [],
          nested: undefined,
        }
        tree.push(newRecord)
        return newRecord
      })()

      if (layouts.length === 1) {
        currentLevelLayoutRecord.pages.push(page)
        return currentLevelLayoutRecord
      } else {
        currentLevelLayoutRecord.nested ||= []
        addPageToTree({
          tree: currentLevelLayoutRecord.nested,
          page,
          layouts: layouts.slice(1),
        })
        return currentLevelLayoutRecord
      }
    }

    const pagesWithLayout = pages.filter((p) => p.layouts.length)
    for (const page of pagesWithLayout) {
      addPageToTree({
        tree,
        page: page.name,
        layouts: page.layouts,
      })
    }
    return tree
  }

  private static readonly toPagesTree = ({
    points,
    pagesTreeSource,
  }: {
    points: ReadyRoutedPointsCollection | LazyRoutedPointsCollection
    pagesTreeSource: PagesTreeSource
  }): PagesTree => {
    const pagesTree: PagesTree = []
    for (const pagesTreeSourceRecord of pagesTreeSource) {
      const layoutRecord = points.find((l) => l.type === 'layout' && l.name === pagesTreeSourceRecord.layout)
      const pagesRecords = points.filter((p) => p.type === 'page' && pagesTreeSourceRecord.pages.includes(p.name))
      const pagesTreeRecord: PagesTreeRecord = {
        Layout: layoutRecord?.Component as React.ComponentType<{ children: React.ReactNode }> | undefined,
        layoutName: layoutRecord?.name,
        layoutPoint: layoutRecord?.point as LayoutPoint | (() => Promise<LayoutPoint>) | undefined,
        pages: pagesRecords.map((p) => ({
          Page: p.Component as React.ComponentType | React.LazyExoticComponent<React.ComponentType>,
          pageName: p.name,
          pageRoute: p.route as AnyRoute,
          pagePoint: p.point as PagePoint | (() => Promise<PagePoint>),
        })),
        nested: !pagesTreeSourceRecord.nested
          ? undefined
          : Points.toPagesTree({
              pagesTreeSource: pagesTreeSourceRecord.nested,
              points,
            }),
      }
      pagesTree.push(pagesTreeRecord)
    }
    return pagesTree
  }

  // prefetching

  // TODO: check if it is really correct way
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

  private readonly loadSuitablePage = async ({
    location,
  }: {
    location: AnyLocation
  }): Promise<
    | {
        page: PagePoint
        layouts: LayoutPoint[]
      }
    | undefined
  > => {
    const suitable = this.getSuitablePoint({ pageLocation: location, pointType: 'page' })
    if (!suitable) {
      return undefined
    }
    const page = typeof suitable.point === 'function' ? await suitable.point() : suitable.point

    // Prefetch the (possibly lazy) page component
    if (suitable.Component) {
      await Points.prefetchLazyComponent(suitable.Component)
    }

    const layouts = await Promise.all(
      this.collection
        .filter((p) => p.type === 'layout' && suitable.layouts?.includes(p.name))
        .map(async (layout) => {
          if (layout.Component) {
            await Points.prefetchLazyComponent(layout.Component)
          }
          return typeof layout.point === 'function' ? await layout.point() : layout.point
        }),
    )

    // TODO: maybe we should replace in pagesTree and points this page and layouts points, becouse it is loaded now

    return {
      page: page as PagePoint,
      layouts: layouts as LayoutPoint[],
    }
  }

  prefetchSuitablePagePoint = async ({
    location,
    queryClient, // kept for signature parity if you need it later
    partial = false,
  }: {
    location: AnyLocation
    queryClient?: QueryClient
    partial?: boolean
  }): Promise<PagePoint | undefined> => {
    const result = await this.loadSuitablePage({ location })
    if (!result) {
      return undefined
    }

    if (partial) {
      await Promise.all(
        [result.page, ...result.layouts].map(async (p) => {
          const input = p._getUnsafeInputRawByLocation(location)
          await p.prefetchQuery({ queryClient, input, location })
        }),
      )
      return result.page
    }

    const input = result.page._getUnsafeInputRawByLocation(location)
    await result.page.prefetchPage({ queryClient, input, location })

    return result.page
  }

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
        point: TReady extends true ? EndPoint : () => Promise<EndPoint>
        name: PointName
        type: PointType
        Component: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>> | undefined
        pageLocation: ExactLocation | undefined
        layouts: string[] | undefined
      }
    | undefined {
    for (const { route, point, type, name, Component, layouts } of this.collection as ReadyRoutedPointsCollection) {
      if (pointType && type !== pointType) {
        continue
      }
      if (pointName) {
        if (name === pointName) {
          if (type !== 'page') {
            return {
              point: point as TReady extends true ? EndPoint : () => Promise<EndPoint>,
              name,
              type,
              pageLocation: undefined,
              Component,
              layouts,
            }
          }
          if (!route || !input) {
            return {
              point: point as TReady extends true ? EndPoint : () => Promise<EndPoint>,
              name,
              type,
              pageLocation: undefined,
              Component,
              layouts,
            }
          }
          // TODO: add helper for htis in route0, like route.getSelfLocation(input): ExactLocation
          const match = route.getLocation(route.get(input))
          return {
            point: point as TReady extends true ? EndPoint : () => Promise<EndPoint>,
            name,
            type,
            pageLocation: match.exact ? match : undefined,
            Component,
            layouts,
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
          point: point as TReady extends true ? EndPoint : () => Promise<EndPoint>,
          name,
          type,
          pageLocation: match,
          Component,
          layouts,
        }
      }
    }
    return undefined
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
  Component?: React.ComponentType
  layouts?: string[]
}
export type ReadyPointsCollection = ReadyPointsCollectionRecord[]
export type LazyRoutedPointsCollectionRecord = {
  root: boolean
  type: EndPointType
  name: PointName
  route: AnyRoute | UndefinedRoute
  point: () => Promise<EndPoint>
  Component?: React.LazyExoticComponent<React.ComponentType>
  layouts: string[]
}
export type LazyRoutedPointsCollection = LazyRoutedPointsCollectionRecord[]
export type ReadyRoutedPointsCollectionRecord = {
  root: boolean
  type: EndPointType
  name: PointName
  route: AnyRoute | UndefinedRoute
  point: EndPoint
  Component?: React.ComponentType
  layouts: string[]
}
export type ReadyRoutedPointsCollection = ReadyRoutedPointsCollectionRecord[]
export type RawPointsCollection = EndPoint[]

export type PagesTreeSourceRecord = {
  layout: string | undefined
  pages: string[]
  nested: undefined | PagesTreeSourceRecord[]
}
export type PagesTreeSource = PagesTreeSourceRecord[]

export type PagesTreeRecord = {
  layoutName?: PointName
  layoutPoint?: LayoutPoint | (() => Promise<LayoutPoint>) | undefined
  Layout?:
    | React.ComponentType<{ children: React.ReactNode }>
    | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
    | undefined
  pages: Array<{
    pageName: PointName
    pageRoute: AnyRoute
    pagePoint: PagePoint | (() => Promise<PagePoint>)
    Page: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
  }>
  nested: undefined | PagesTreeRecord[]
}
export type PagesTree = PagesTreeRecord[]

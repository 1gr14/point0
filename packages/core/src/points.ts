import type { AnyLocation, AnyRoute, ExactLocation } from '@devp0nt/route0'
import { Route0, Routes } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { ClientServerHelpers } from './client-server.js'
import { EversionStore } from './eversion-store.js'
import type {
  EndPoint,
  EndPointType,
  InputRaw,
  LayoutPoint,
  PagePoint,
  PointName,
  PointsScope,
  PointType,
  RequiredCtx,
  RootPoint,
  UndefinedRoute,
} from './types.js'

// TODO: when find suitable allow porvide "scope", then it will find only inside that
// so remove force
export class Points<TReady extends boolean = boolean, TRequiredCtx extends RequiredCtx = RequiredCtx> {
  absPath: string | null
  readFn: PointsReadFn | null
  root: RootPoint
  collection: TReady extends true ? ReadyRoutedPointsCollection : LazyRoutedPointsCollection
  ready: TReady
  routes: Routes
  routesHash: string
  pagesTreeSource: PagesTreeSource
  pagesTree: PagesTree

  Infer: {
    RequiredCtx: TRequiredCtx
  } = {} as never

  private constructor({
    absPath,
    readFn,
    root,
    collection,
    routes,
    ready,
    pagesTreeSource,
    pagesTree,
  }: {
    absPath: string | null
    readFn: PointsReadFn | null
    root: RootPoint
    collection: TReady extends true ? ReadyRoutedPointsCollection : LazyRoutedPointsCollection
    routes: Routes
    ready: boolean
    pagesTreeSource: PagesTreeSource
    pagesTree: PagesTree
  }) {
    this.absPath = absPath
    this.readFn = readFn
    this.routes = routes
    this.ready = ready as TReady
    this.routesHash = routes._.pathsOrdering.join(',')
    this.collection = Points.sortCollection({ points: collection, routes })
    this.pagesTreeSource = pagesTreeSource
    this.pagesTree = pagesTree
    this.root = root
    Points.setGlobalPoints(this)
    if (ClientServerHelpers.isClient) {
      EversionStore.setWeak('__POINT0_SCOPE__', this.root._scope)
    }
  }

  static readonly ready = <TReadyPointsModule extends ReadyPointsModule>(
    readyPoints: TReadyPointsModule,
    absPath?: string,
    readFn?: PointsReadFn,
  ): Points<true, TReadyPointsModule['root']['Infer']['RequiredCtx']> => {
    const { root, ...rest } = readyPoints
    const readyPointsWithoutRoot = Object.values(rest).map((p) => p.point)
    const rawPoints = Points.rawToReadyPointsCollection(readyPointsWithoutRoot)
    const routedPoints = Points.toRoutedPointsCollection(rawPoints)
    const routes = Points.toRoutes({ points: routedPoints })
    const pagesTreeSource = Points.toPagesTreeSource({ points: routedPoints })
    const pagesTree = Points.toPagesTree({ points: routedPoints, pagesTreeSource })
    return new Points<true, TReadyPointsModule['root']['Infer']['RequiredCtx']>({
      root,
      collection: routedPoints,
      routes,
      ready: true,
      pagesTreeSource,
      pagesTree,
      absPath: absPath ?? null,
      readFn: readFn ?? null,
    })
  }

  static readonly lazy = <TLazyPointsModule extends LazyPointsModule>(
    lazyPoints: TLazyPointsModule,
    absPath?: string,
    readFn?: PointsReadFn,
  ): Points<false, TLazyPointsModule['root_lazy']['point']['Infer']['RequiredCtx']> => {
    const { root_lazy, ...rest } = lazyPoints
    const lazyPointsWithoutRoot = Object.values(rest) as LazyRoutedPointsCollection
    const routedPoints = Points.toRoutedPointsCollection(lazyPointsWithoutRoot)
    const routes = Points.toRoutes({ points: routedPoints })
    const pagesTreeSource = Points.toPagesTreeSource({ points: routedPoints })
    const pagesTree = Points.toPagesTree({ points: routedPoints, pagesTreeSource })
    return new Points<false, TLazyPointsModule['root_lazy']['point']['Infer']['RequiredCtx']>({
      root: root_lazy.point,
      collection: routedPoints,
      routes,
      ready: false,
      pagesTreeSource,
      pagesTree,
      absPath: absPath ?? null,
      readFn: readFn ?? null,
    })
  }

  static readonly read = async <TReady extends boolean>(
    absPath: string,
    readFn: PointsReadFn,
  ): Promise<Points<TReady>> => {
    const pointsModule = await readFn(absPath)
    return Points.create(pointsModule, absPath, readFn) as Points<TReady>
  }

  static readonly create = <TPoints extends ReadyPointsModule | LazyPointsModule | Points>(
    points: TPoints,
    absPath?: string,
    readFn?: PointsReadFn,
  ): Points<
    boolean,
    TPoints extends Points
      ? TPoints['root']['Infer']['RequiredCtx']
      : TPoints extends ReadyPointsModule
        ? TPoints['root']['Infer']['RequiredCtx']
        : TPoints extends LazyPointsModule
          ? TPoints['root_lazy']['point']['Infer']['RequiredCtx']
          : RequiredCtx
  > => {
    if (points instanceof Points) {
      points.readFn = readFn ?? points.readFn
      points.absPath = absPath ?? points.absPath
      return points as never
    }
    if (Points.isReadyPointsModule(points)) {
      return Points.ready(points, absPath, readFn)
    }
    if (Points.isLazyPointsModule(points)) {
      return Points.lazy(points, absPath, readFn)
    }
    throw new Error('Invalid points input')
  }

  async replace(points: Points): Promise<void> {
    this.absPath = points.absPath
    this.readFn = points.readFn
    this.root = points.root
    this.collection = points.collection as TReady extends true
      ? ReadyRoutedPointsCollection
      : LazyRoutedPointsCollection
    this.routes = points.routes
    this.routesHash = points.routesHash
    this.pagesTreeSource = points.pagesTreeSource
    this.pagesTree = points.pagesTree
    if (this.ready && !points.ready) {
      await this.replace(await this.load(true))
    } else {
      Points.setGlobalPoints(this)
    }
  }

  async read(): Promise<void> {
    if (this.readFn && this.absPath) {
      const freshPointsModule = await this.readFn(this.absPath)
      const freshPoints = Points.create(freshPointsModule, this.absPath, this.readFn)
      await this.replace(freshPoints)
    }
  }

  async load(force?: boolean): Promise<Points<true>> {
    if (this.ready && !force) {
      return this as Points<true>
    }
    const { readyPoints, errors } = await Points.toReadyPointsCollection(this.collection as LazyRoutedPointsCollection)
    for (const error of errors) {
      console.error(error)
    }
    const routes = Points.toRoutes({ points: readyPoints })
    const pagesTreeSource = Points.toPagesTreeSource({ points: readyPoints })
    const pagesTree = Points.toPagesTree({ points: readyPoints, pagesTreeSource })
    return new Points<true>({
      root: this.root,
      collection: readyPoints,
      routes,
      ready: true,
      pagesTreeSource,
      pagesTree,
      readFn: this.readFn,
      absPath: this.absPath,
    })
  }

  static sortCollection<T extends Array<{ type: PointType; name: PointName; route?: AnyRoute | undefined }>>({
    routes,
    points,
  }: {
    routes?: Routes
    points: T
  }): T {
    routes ??= this.toRoutes({ points })
    const order = routes._.pathsOrdering
    return points.sort((a, b) => {
      if (!a.route || !b.route) {
        return 0
      }
      const aIndex = order.indexOf(a.route.definition)
      const bIndex = order.indexOf(b.route.definition)
      return aIndex - bIndex
    })
  }

  _getRootPoint(): RootPoint | undefined {
    return this.collection.find((record) => record.root)?.point as RootPoint | undefined
  }

  private static isLazyPointsModule(points: any): points is LazyPointsModule {
    return (
      !Array.isArray(points) &&
      // Object.keys(points).length > 0 &&
      Object.values(points).every((p: any) => typeof p.name === 'string')
    )
  }

  private static isReadyPointsModule(points: any): points is ReadyPointsModule {
    return (
      !Array.isArray(points) &&
      // Object.keys(points).length > 0 &&
      Object.values(points).every((p: any) => typeof p.point?._name === 'string')
    )
  }

  static isRoutedPointsCollection(points: any): points is LazyRoutedPointsCollection | ReadyRoutedPointsCollection {
    if (!Array.isArray(points)) {
      return false
    }
    if (points.length === 0) {
      return true
    }
    return points.every((p: any) => 'Component' in p)
  }

  private static rawToReadyPointsCollection(points: RawPointsCollection): ReadyPointsCollection {
    return points.map((point) => {
      return {
        type: point._pointType,
        name: point._name || '__POINT0_UNNAMED__',
        point,
        layouts: point._layouts.map((l) => l._name || '__POINT0_UNNAMED__'),
        route: point._route,
        root: point._isRoot(),
      }
    })
  }

  private static moduleToReadyPointsCollection(points: ReadyPointsModule): ReadyPointsCollection {
    const { root, ...rest } = points
    return this.rawToReadyPointsCollection(Object.values(rest).map((p) => p.point))
  }

  private static moduleToLazyPointsCollection(points: LazyPointsModule): LazyPointsCollection {
    return Object.values(points).flatMap((p) => ('_pointType' in p ? [] : p))
  }

  private static toPointsCollection(
    points:
      | LazyPointsCollection
      | ReadyPointsCollection
      | LazyPointsModule
      | ReadyPointsModule
      | LazyRoutedPointsCollection
      | ReadyRoutedPointsCollection,
  ): LazyPointsCollection | ReadyPointsCollection | LazyRoutedPointsCollection | ReadyRoutedPointsCollection {
    if (Points.isLazyPointsModule(points)) {
      return Points.moduleToLazyPointsCollection(points)
    }
    if (Points.isReadyPointsModule(points)) {
      return Points.moduleToReadyPointsCollection(points)
    }
    return points
  }

  static toRoutedPointsCollection(
    points: ReadyPointsCollection | ReadyPointsModule | ReadyRoutedPointsCollection,
  ): ReadyRoutedPointsCollection
  static toRoutedPointsCollection(
    points: LazyPointsCollection | LazyPointsModule | LazyRoutedPointsCollection,
  ): LazyRoutedPointsCollection
  static toRoutedPointsCollection(
    points:
      | LazyPointsCollection
      | ReadyPointsCollection
      | LazyPointsModule
      | ReadyPointsModule
      | LazyRoutedPointsCollection
      | ReadyRoutedPointsCollection,
  ): LazyRoutedPointsCollection | ReadyRoutedPointsCollection
  static toRoutedPointsCollection(
    points:
      | LazyPointsCollection
      | ReadyPointsCollection
      | LazyPointsModule
      | ReadyPointsModule
      | LazyRoutedPointsCollection
      | ReadyRoutedPointsCollection,
  ): LazyRoutedPointsCollection | ReadyRoutedPointsCollection {
    if (this.isRoutedPointsCollection(points)) {
      return points
    }
    const pointsCollection = Points.toPointsCollection(points)
    return pointsCollection.map((record) => {
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

  static readonly toRoutes = ({
    points,
  }: {
    points: Array<{ type: PointType; name: PointName; route?: string | undefined | AnyRoute }>
  }): Routes => {
    const routes: Record<string, AnyRoute> = {}
    for (const item of points) {
      const type = item.type
      const routeSrc = item.route
      if (type !== 'page' || !routeSrc) {
        continue
      }
      const route = Route0.from(routeSrc)
      const name = item.name
      if (!name) {
        throw new Error('Invalid point name')
      }
      routes[name] = route
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
          Component: record.Component,
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
    points:
      | Array<{ type: EndPointType; name: PointName; route?: string | undefined | AnyRoute; layouts?: string[] }>
      | ReadyRoutedPointsCollection
      | LazyRoutedPointsCollection
  }): PagesTreeSource => {
    const pointsCollection = points // Points.toRoutedPointsCollection(points)
    const pages = pointsCollection.filter((p) => p.type === 'page' && p.layouts) as Array<{
      type: 'page'
      name: PointName
      route?: string | undefined
      layouts: string[]
    }>
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

  static readonly toPagesTree = ({
    points,
    pagesTreeSource,
  }: {
    points: ReadyRoutedPointsCollection | LazyRoutedPointsCollection // | LazyPointsModule | ReadyPointsModule
    pagesTreeSource: PagesTreeSource
  }): PagesTree => {
    const pointsCollection = points // this.toRoutedPointsCollection(points)
    const pagesTree: PagesTree = []
    for (const pagesTreeSourceRecord of pagesTreeSource) {
      const layoutRecord = pointsCollection.find((l) => l.type === 'layout' && l.name === pagesTreeSourceRecord.layout)
      const pagesRecords = pointsCollection.filter(
        (p) => p.type === 'page' && pagesTreeSourceRecord.pages.includes(p.name),
      )
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
    mode = 'any',
  }: {
    location: AnyLocation
    queryClient?: QueryClient
    mode?: 'server' | 'client' | 'any' | 'dehydratedState' | 'all'
  }): Promise<PagePoint | undefined> => {
    const result = await this.loadSuitablePage({ location })
    if (!result) {
      return undefined
    }
    await result.page.prefetchPage({
      queryClient,
      input: result.page._getUnsafeInputRawByLocation(location),
      location,
      mode,
    })
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

  // global

  private static readonly setGlobalPoints = (points: ReadyPointsModule | LazyPointsModule | Points) => {
    const createdPoints = Points.create(points)
    if (!(globalThis as any).__POINT0_POINTS__) {
      ;(globalThis as any).__POINT0_POINTS__ = {}
    }
    ;(globalThis as any).__POINT0_POINTS__[createdPoints.root._scope] = createdPoints
    return createdPoints
  }
  static getGlobalPoints = (scope?: PointsScope): Points => {
    scope ??= EversionStore.getWeak<PointsScope>('__POINT0_SCOPE__')
    if (!scope) {
      throw new Error('Points scope not found if EversionStore. You should provide scope.')
    }
    const points =
      scope in (globalThis as any).__POINT0_POINTS__ ? (globalThis as any).__POINT0_POINTS__[scope] : undefined
    if (!points) {
      throw new Error('Points not found. Forget to call Points.create()?')
    }
    return points
  }
}

export type LazyPointsCollectionRecord = {
  root?: boolean
  type: EndPointType
  name: PointName
  route?: string | undefined
  point: (() => Promise<EndPoint>) | EndPoint
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

export type LazyPointsModule = {
  root_lazy: { point: RootPoint; type: 'base'; root: true; name: string }
} & Record<string, LazyPointsCollectionRecord>
export type ReadyPointsModule = { root: RootPoint } & Record<string, { point: EndPoint }>

export type PointsModuleType = 'ready' | 'lazy'

export type LazyPoints = Points<false>
export type ReadyPoints = Points<true>

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

export type PointsReadFn = (absPath: string) => Promise<ReadyPointsModule | LazyPointsModule>

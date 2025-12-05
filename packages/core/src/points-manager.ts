import { Error0 } from '@devp0nt/error0'
import type { AnyLocation, AnyRoute, ExactLocation } from '@devp0nt/route0'
import { Route0, Routes } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { ClientServerHelpers } from './client-server.js'
import { ExtractorStore } from './extractor-store.js'
import { Extractor } from './extractor.js'
import type {
  EndPoint,
  EndPointType,
  InputParsed,
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
import { appendSlash, getBasepathOrNull, getHostnameOrNull, parseUrl, type ParsedUrl } from './utils.js'

// TODO: when find suitable allow porvide "scope", then it will find only inside that
// so remove force
export class PointsManager<TReady extends boolean = boolean, TRequiredCtx extends RequiredCtx = RequiredCtx> {
  absPath: string | null
  readFn: PointsReadFn | null
  scope: PointsScope
  baseurl: string | null | undefined
  basepath: string | null
  hostname: string | null
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
    scope: PointsScope
    pagesTreeSource: PagesTreeSource
    pagesTree: PagesTree
  }) {
    this.absPath = absPath
    this.readFn = readFn
    this.routes = routes
    this.ready = ready as TReady
    this.routesHash = routes._.pathsOrdering.join(',')
    this.collection = PointsManager.sortCollection({ points: collection, routes })
    this.pagesTreeSource = pagesTreeSource
    this.pagesTree = pagesTree
    this.root = root
    this.scope = this.root._scope
    this.baseurl = this.root._baseurl
    this.basepath = getBasepathOrNull(this.baseurl)
    this.hostname = getHostnameOrNull(this.baseurl)
    PointsManager.setGlobalPoints(this)
    if (ClientServerHelpers.isClient) {
      ExtractorStore.setWeak('__POINT0_SCOPE__', this.scope)
    }
  }

  // TODO: add readyByModule and readyByCollection
  static readonly ready = <TReadyPointsModule extends ReadyPointsModule>(
    readyPoints: TReadyPointsModule,
    absPath?: string,
    readFn?: PointsReadFn,
  ): PointsManager<true, TReadyPointsModule['root_ready']['point']['Infer']['RequiredCtx']> => {
    const { root_ready, ...rest } = readyPoints
    const readyPointsWithoutRoot = Object.values(rest).map((p) => p.point)
    const rawPoints = PointsManager.rawToReadyPointsCollection(readyPointsWithoutRoot)
    const routedPoints = PointsManager.toRoutedPointsCollection(rawPoints)
    const routes = PointsManager.toRoutes({ points: routedPoints })
    const pagesTreeSource = PointsManager.toPagesTreeSource({ points: routedPoints })
    const pagesTree = PointsManager.toPagesTree({ points: routedPoints, pagesTreeSource })
    return new PointsManager<true, TReadyPointsModule['root_ready']['point']['Infer']['RequiredCtx']>({
      root: root_ready.point,
      scope: root_ready.point._scope,
      collection: routedPoints,
      routes,
      ready: true,
      pagesTreeSource,
      pagesTree,
      absPath: absPath ?? null,
      readFn: readFn ?? null,
    })
  }

  // TODO: add lazyByModule and lazyByCollection
  static readonly lazy = <TLazyPointsModule extends LazyPointsModule>(
    lazyPoints: TLazyPointsModule,
    absPath?: string,
    readFn?: PointsReadFn,
  ): PointsManager<false, TLazyPointsModule['root_lazy']['point']['Infer']['RequiredCtx']> => {
    const { root_lazy, ...rest } = lazyPoints
    const lazyPointsWithoutRoot = Object.values(rest) as LazyRoutedPointsCollection
    const routedPoints = PointsManager.toRoutedPointsCollection(lazyPointsWithoutRoot)
    const routes = PointsManager.toRoutes({ points: routedPoints })
    const pagesTreeSource = PointsManager.toPagesTreeSource({ points: routedPoints })
    const pagesTree = PointsManager.toPagesTree({ points: routedPoints, pagesTreeSource })
    return new PointsManager<false, TLazyPointsModule['root_lazy']['point']['Infer']['RequiredCtx']>({
      root: root_lazy.point,
      scope: root_lazy.point._scope,
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
  ): Promise<PointsManager<TReady>> => {
    const pointsModule = await readFn(absPath)
    return PointsManager.create(pointsModule, absPath, readFn) as PointsManager<TReady>
  }

  static readonly create = <TPoints extends ReadyPointsModule | LazyPointsModule | PointsManager>(
    points: TPoints,
    absPath?: string,
    readFn?: PointsReadFn,
  ): PointsManager<
    boolean,
    TPoints extends PointsManager
      ? TPoints['root']['point']['Infer']['RequiredCtx']
      : TPoints extends ReadyPointsModule
        ? TPoints['root']['point']['Infer']['RequiredCtx']
        : TPoints extends LazyPointsModule
          ? TPoints['root_lazy']['point']['Infer']['RequiredCtx']
          : RequiredCtx
  > => {
    if (points instanceof PointsManager) {
      points.readFn = readFn ?? points.readFn
      points.absPath = absPath ?? points.absPath
      return points as never
    }
    if (PointsManager.isReadyPointsModule(points)) {
      return PointsManager.ready(points, absPath, readFn)
    }
    if (PointsManager.isLazyPointsModule(points)) {
      return PointsManager.lazy(points, absPath, readFn)
    }
    throw new Error('Invalid points input')
  }

  async replace(points: PointsManager): Promise<void> {
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
      PointsManager.setGlobalPoints(this)
    }
  }

  async read(): Promise<void> {
    if (this.readFn && this.absPath) {
      const freshPointsModule = await this.readFn(this.absPath)
      const freshPoints = PointsManager.create(freshPointsModule, this.absPath, this.readFn)
      await this.replace(freshPoints)
    }
  }

  async load(force?: boolean): Promise<PointsManager<true, TRequiredCtx>> {
    if (this.ready && !force) {
      return this as PointsManager<true, TRequiredCtx>
    }
    const { readyPoints, errors } = await PointsManager.toReadyPointsCollection(
      this.collection as LazyRoutedPointsCollection,
    )
    for (const error of errors) {
      console.error(error)
    }
    const routes = PointsManager.toRoutes({ points: readyPoints })
    const pagesTreeSource = PointsManager.toPagesTreeSource({ points: readyPoints })
    const pagesTree = PointsManager.toPagesTree({ points: readyPoints, pagesTreeSource })
    return new PointsManager<true, TRequiredCtx>({
      root: this.root,
      scope: this.root._scope,
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
    return this.collection.find((record) => record.type === 'root')?.point as RootPoint | undefined
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
    if (PointsManager.isLazyPointsModule(points)) {
      return PointsManager.moduleToLazyPointsCollection(points)
    }
    if (PointsManager.isReadyPointsModule(points)) {
      return PointsManager.moduleToReadyPointsCollection(points)
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
    const pointsCollection = PointsManager.toPointsCollection(points)
    return pointsCollection.map((record) => {
      const point = record.point
      return {
        type: record.type,
        name: record.name,
        route: record.route ? Route0.from(record.route) : undefined,
        point: record.point,
        layouts: record.layouts ?? [],
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
          : PointsManager.toPagesTree({
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
      await PointsManager.prefetchLazyComponent(suitable.Component)
    }

    const layouts = await Promise.all(
      this.collection
        .filter((p) => p.type === 'layout' && suitable.layouts?.includes(p.name))
        .map(async (layout) => {
          if (layout.Component) {
            await PointsManager.prefetchLazyComponent(layout.Component)
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
    mode = 'serverAndClient',
  }: {
    location: AnyLocation
    queryClient?: QueryClient
    mode?: 'server' | 'client' | 'serverAndClient' | 'queryClientDehydratedState' | 'everything'
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

  isPageLocationSuitable = ({ pageLocation }: { pageLocation: AnyLocation }): boolean => {
    if (this.baseurl === null) {
      return false
    }
    if (this.hostname && pageLocation.hostname && pageLocation.hostname !== this.hostname) {
      return false
    }
    if (this.basepath) {
      if (pageLocation.pathname === this.basepath) {
        return true
      }
      if (pageLocation.pathname.startsWith(appendSlash(this.basepath))) {
        return true
      }
      return false
    }
    return true
  }

  getSuitablePoint({
    pageLocation,
    input,
    pointType,
    pointName,
    scope,
  }: {
    pageLocation?: AnyLocation | undefined
    input?: InputRaw
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
    scope?: PointsScope | undefined
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
    if (scope && this.scope !== scope) {
      return undefined
    }
    if (pageLocation && this.baseurl === null) {
      return undefined
    }
    if (pageLocation && pageLocation.hostname && this.hostname && pageLocation.hostname !== this.hostname) {
      return undefined
    }
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

  private static readonly setGlobalPoints = (points: ReadyPointsModule | LazyPointsModule | PointsManager) => {
    const createdPoints = PointsManager.create(points)
    if (!(globalThis as any).__POINT0_POINTS__) {
      ;(globalThis as any).__POINT0_POINTS__ = {}
    }
    ;(globalThis as any).__POINT0_POINTS__[createdPoints.scope] = createdPoints
    return createdPoints
  }
  static getGlobalPoints = (scope?: PointsScope): PointsManager => {
    scope ??= ExtractorStore.getWeak<PointsScope>('__POINT0_SCOPE__')
    if (!scope) {
      throw new Error('Points scope not found if ExtractorStore. You should provide scope.')
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
  type: EndPointType
  name: PointName
  route?: string | undefined
  point: (() => Promise<EndPoint>) | EndPoint
  layouts?: string[]
}
export type LazyPointsCollection = LazyPointsCollectionRecord[]
export type ReadyPointsCollectionRecord = {
  type: EndPointType
  name: PointName
  route?: string | undefined
  point: EndPoint
  Component?: React.ComponentType
  layouts?: string[]
}
export type ReadyPointsCollection = ReadyPointsCollectionRecord[]
export type LazyRoutedPointsCollectionRecord = {
  type: EndPointType
  name: PointName
  route: AnyRoute | UndefinedRoute
  point: () => Promise<EndPoint>
  Component?: React.LazyExoticComponent<React.ComponentType>
  layouts: string[]
}
export type LazyRoutedPointsCollection = LazyRoutedPointsCollectionRecord[]
export type ReadyRoutedPointsCollectionRecord = {
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
  root_lazy: { point: RootPoint; type: 'root'; name: string }
} & Record<string, LazyPointsCollectionRecord>
export type ReadyPointsModule = { root_ready: { point: RootPoint } } & Record<string, { point: EndPoint }>

export type PointsModuleType = 'ready' | 'lazy'

export type LazyPoints = PointsManager<false>
export type ReadyPoints = PointsManager<true>

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

// TODO: when find suitable allow porvide "scope", then it will find only inside that
// so remove force
// TODO: add generic and type Source, and Connection so we can understand which ine used now
export class PointsManagersGroup<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  pointsManagers: Array<PointsManager<true>>

  private constructor(pointsManagers: Array<PointsManager<true, TRequiredCtx>>) {
    this.pointsManagers = pointsManagers
  }

  static create<TRequiredCtx extends RequiredCtx>(
    ...points: Array<PointsManager<true, TRequiredCtx>>
  ): PointsManagersGroup<TRequiredCtx> {
    return new PointsManagersGroup<TRequiredCtx>(points)
  }

  async add(...points: Array<PointsManager<boolean, TRequiredCtx>>): Promise<typeof this> {
    this.pointsManagers.push(...(await Promise.all(points.map(async (p) => await p.load()))))
    return this
  }

  async readPoints(): Promise<void> {
    await Promise.all(
      this.pointsManagers.map(async (pointsManager) => {
        await pointsManager.read()
      }),
    )
  }

  getSuitable({
    scope,
    fallbackScope,
    pageLocation,
    pointType,
    pointName,
    input,
  }: {
    scope?: PointsScope
    fallbackScope: PointsScope
    pageLocation?: AnyLocation | undefined
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
    input?: InputParsed | undefined
  }): GetSuitableResult {
    // find exact match
    for (const points of this.pointsManagers) {
      const suitablePoint = points.getSuitablePoint({ pageLocation, pointType, pointName, input, scope })
      if (suitablePoint) {
        return {
          point: suitablePoint.point,
          pageLocation: suitablePoint.pageLocation,
          pointsManager: points,
        }
      }
    }

    // find root by scope
    if (scope) {
      for (const points of this.pointsManagers) {
        if (points.scope === scope) {
          return {
            point: undefined,
            pageLocation: undefined,
            pointsManager: points,
          }
        }
      }
      throw new Error0(`No points found with scope "${scope}"`, { httpStatus: 404 })
    }

    // find root by page location
    if (pageLocation) {
      for (const points of this.pointsManagers) {
        if (points.isPageLocationSuitable({ pageLocation })) {
          return {
            point: undefined,
            pageLocation,
            pointsManager: points,
          }
        }
      }
    }

    // find by fallback scope
    if (fallbackScope) {
      for (const points of this.pointsManagers) {
        if (points.scope === fallbackScope) {
          return {
            point: undefined,
            pageLocation: undefined,
            pointsManager: points,
          }
        }
      }
    }

    throw new Error(
      `No suitable points manager found at scope "${scope}" and fallback scope "${fallbackScope}" and page location "${pageLocation?.href || pageLocation?.pathname || 'undefined'}"`,
    )
  }

  async prepareExtractorByRequest({
    request,
    parsedUrl,
    fallbackScope,
    scope,
    requiredCtx,
  }: {
    request: Request
    parsedUrl?: ParsedUrl
    fallbackScope: PointsScope
    scope?: PointsScope
    requiredCtx: TRequiredCtx
  }): Promise<{
    task: FetchTask | undefined
    // TODO: it is not parsed input it is raw input
    input: InputParsed
    suitable: GetSuitableResult
    extractor: Extractor
  }> {
    parsedUrl ??= parseUrl(request.url)
    const task = await (async () => {
      if (parsedUrl.urlObj.pathname !== '/_point0') {
        return undefined
      }
      const bodyRaw = await (async () => {
        try {
          return await request.json()
        } catch (error) {
          return {}
        }
      })()
      const parsed = (() => {
        const validPointTypes = [
          'page',
          'layout',
          'component',
          'response',
          'query',
          'infiniteQuery',
          'mutation',
          'provider',
        ] as const
        const validOutputTypes = ['data', 'response', 'queryClientDehydratedState'] as const
        if (!bodyRaw || typeof bodyRaw !== 'object') {
          throw new Error('Invalid request body: must be an object')
        }
        const { pointType, outputType, pointInput, scope, pointName } = bodyRaw as Record<string, unknown>
        if (!validPointTypes.includes(pointType as (typeof validPointTypes)[number])) {
          throw new Error(
            `Invalid pointType: must be one of ${validPointTypes.join(', ')}, got ${JSON.stringify(pointType).slice(0, 100)}`,
          )
        }
        if (!validOutputTypes.includes(outputType as (typeof validOutputTypes)[number])) {
          throw new Error(
            `Invalid outputType: must be one of ${validOutputTypes.join(', ')}, got ${JSON.stringify(outputType).slice(0, 100)}`,
          )
        }
        if (!pointInput || typeof pointInput !== 'object' || Array.isArray(pointInput)) {
          throw new Error(`Invalid pointInput: must be an object, got ${JSON.stringify(pointInput).slice(0, 100)}`)
        }
        if (typeof scope !== 'string' || scope.length === 0) {
          throw new Error(`Invalid scope: must be a non-empty string, got ${JSON.stringify(scope).slice(0, 100)}`)
        }
        if (typeof pointName !== 'string' || pointName.length === 0) {
          throw new Error(
            `Invalid pointName: must be a non-empty string, got ${JSON.stringify(pointName).slice(0, 100)}`,
          )
        }
        return {
          pointType: pointType as (typeof validPointTypes)[number],
          outputType: outputType as (typeof validOutputTypes)[number],
          pointInput: pointInput as Record<string, unknown>,
          scope,
          pointName,
        }
      })()
      if (scope && parsed.scope !== scope) {
        throw new Error(`Parsed scope "${parsed.scope}" does not match provided scope "${scope}"`)
      }
      return parsed
    })()
    const location = Route0.getLocation(parsedUrl.urlStr)
    const suitable = this.getSuitable({
      pointType: task?.pointType ?? 'page',
      scope: task?.scope || scope,
      pointName: task?.pointName,
      pageLocation: !task ? location : undefined,
      input: task?.pointInput,
      fallbackScope,
    })
    const extractor = await Extractor.create({
      points: suitable.pointsManager,
      pageLocation: suitable.pageLocation,
      currentLocation: suitable.pageLocation ?? Route0.toRelLocation(location),
      requiredCtx,
    })
    const input = task?.pointInput ?? { ...location.searchParams, ...suitable.pageLocation?.params }
    return {
      task,
      input,
      suitable,
      extractor,
    }
  }

  // async preparePageEversionRunByUrl({
  //   url,
  //   fallbackScope,
  //   scope,
  //   requiredCtx,
  // }: {
  //   url: string
  //   fallbackScope: Scope
  //   scope?: Scope
  //   requiredCtx: TRequiredCtx
  // }): Promise<{
  //   suitable: GetSuitableResult
  //   extractor: EversionRun
  //   input: InputParsed
  //   location: AnyLocation
  // }> {
  //   const location = Route0.getLocation(url)
  //   const suitable = this.getSuitable({
  //     pointType: 'page',
  //     scope,
  //     pageLocation: location,
  //     fallbackScope,
  //   })
  //   const extractor = await suitable.???.createRun({
  //     pageLocation: suitable.pageLocation,
  //     currentLocation: suitable.pageLocation ?? Route0.toRelLocation(location),
  //     requiredCtx,
  //   })
  //   const input = { ...location.searchParams, ...suitable.pageLocation?.params }
  //   return {
  //     suitable,
  //     extractor,
  //     input,
  //     location: suitable.pageLocation || location,
  //   }
  // }
}

export type GetSuitablePointResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint
  pageLocation: ExactLocation | undefined
  pointsManager: PointsManager<true, TRequiredCtx>
}

export type GetSuitableResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint | undefined
  pageLocation: AnyLocation | undefined
  pointsManager: PointsManager<true, TRequiredCtx>
}

export type FetchTask = {
  pointType: EndPointType
  outputType: 'data' | 'response' | 'queryClientDehydratedState'
  pointInput: InputParsed
  scope: PointsScope
  pointName: PointName
}

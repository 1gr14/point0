import type { AnyLocation, AnyRoute, ExactLocation, RoutesPretty } from '@devp0nt/route0'
import { Route0, Routes } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { ClientServerHelpers } from './client-server.js'
import { SuperStore } from './super-store.js'
import type {
  DataTransformerExtended,
  EndPoint,
  EndPointType,
  IfAnyThenElse,
  InputRaw,
  IsEmptyObject,
  LayoutPoint,
  PagePoint,
  PagePrefetchPolicy,
  PointName,
  PointsScope,
  PointType,
  RequiredCtx,
  RootPoint,
  UndefinedRoute,
} from './types.js'
import { appendSlash, getBasepathOrNull, getHostnameOrNull } from './utils.js'

// TODO: maybe do not use modules, use just points collection. I think modules can help later with hmr or something else, so we can remove it later

export class PointsManager<TReady extends boolean = boolean, TRequiredCtx extends RequiredCtx = RequiredCtx> {
  transformer: DataTransformerExtended
  absPath: string | null
  readFn: PointsReadFn | null
  scope: PointsScope
  baseurl: string | null | undefined
  basepath: string | null
  hostname: string | null
  root: RootPoint
  collection: TReady extends true ? ReadyRoutedPointsCollection : LazyRoutedPointsCollection
  ready: TReady
  routes: RoutesPretty
  routesHash: string
  pagesTreeSource: PagesTreeSource
  pagesTree: PagesTree
  ssr: boolean

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
    routes: RoutesPretty
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
    this.scope = this.root.scope
    this.baseurl = this.root._baseurl
    this.basepath = getBasepathOrNull(this.baseurl)
    this.hostname = getHostnameOrNull(this.baseurl)
    this.transformer = this.root._tranformer
    this.ssr = this.root._ssr
    PointsManager.setPointsManager(this)
    if (ClientServerHelpers.isClient) {
      SuperStore.setWeak('__POINT0_SCOPE__', this.scope)
    }
  }

  // TODO: add readyByModule and readyByCollection
  static readonly ready = <TReadyPointsModule extends ReadyPointsModule>(
    readyPoints: TReadyPointsModule,
    options?: {
      absPath?: string
      readFn?: PointsReadFn
    },
  ): PointsManager<true, TReadyPointsModule['_root_ready']['point']['Infer']['RequiredCtx']> => {
    const { absPath, readFn } = options ?? {}
    const { _root_ready, ...rest } = readyPoints
    const readyPointsWithoutRoot = Object.values(rest).map((p) => p.point)
    const rawPoints = PointsManager.rawToReadyPointsCollection(readyPointsWithoutRoot)
    const routedPoints = PointsManager.toRoutedPointsCollection(rawPoints)
    const routes = PointsManager.toRoutes({ points: routedPoints })
    const pagesTreeSource = PointsManager.toPagesTreeSource({ points: routedPoints })
    const pagesTree = PointsManager.toPagesTree({ points: routedPoints, pagesTreeSource })
    return new PointsManager<true, TReadyPointsModule['_root_ready']['point']['Infer']['RequiredCtx']>({
      root: _root_ready.point,
      scope: _root_ready.point.scope,
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
    options?: {
      absPath?: string
      readFn?: PointsReadFn
    },
  ): PointsManager<false, TLazyPointsModule['_root_lazy']['point']['Infer']['RequiredCtx']> => {
    const { absPath, readFn } = options ?? {}
    const { _root_lazy, ...rest } = lazyPoints
    const lazyPointsWithoutRoot = Object.values(rest) as LazyRoutedPointsCollection
    const routedPoints = PointsManager.toRoutedPointsCollection(lazyPointsWithoutRoot)
    const routes = PointsManager.toRoutes({ points: routedPoints })
    const pagesTreeSource = PointsManager.toPagesTreeSource({ points: routedPoints })
    const pagesTree = PointsManager.toPagesTree({ points: routedPoints, pagesTreeSource })
    return new PointsManager<false, TLazyPointsModule['_root_lazy']['point']['Infer']['RequiredCtx']>({
      root: _root_lazy.point,
      scope: _root_lazy.point.scope,
      collection: routedPoints,
      routes,
      ready: false,
      pagesTreeSource,
      pagesTree,
      absPath: absPath ?? null,
      readFn: readFn ?? null,
    })
  }

  static readonly read = async <TReady extends boolean>({
    absPath,
    readFn,
  }: {
    absPath: string
    readFn: PointsReadFn
  }): Promise<PointsManager<TReady>> => {
    const pointsModule = await readFn(absPath)
    return PointsManager.create(pointsModule, { absPath, readFn }) as PointsManager<TReady>
  }

  static readonly create = <TPoints extends ReadyPointsModule | LazyPointsModule | PointsManager>(
    points: TPoints,
    options?: {
      absPath?: string
      readFn?: PointsReadFn
    },
  ): PointsManager<
    boolean,
    TPoints extends PointsManager
      ? TPoints['root']['point']['Infer']['RequiredCtx']
      : TPoints extends ReadyPointsModule
        ? TPoints['root']['point']['Infer']['RequiredCtx']
        : TPoints extends LazyPointsModule
          ? TPoints['_root_lazy']['point']['Infer']['RequiredCtx']
          : RequiredCtx
  > => {
    const { absPath, readFn } = options ?? {}
    if (points instanceof PointsManager) {
      points.readFn = readFn ?? points.readFn
      points.absPath = absPath ?? points.absPath
      return points as never
    }
    if (PointsManager.isReadyPointsModule(points)) {
      return PointsManager.ready(points, { absPath, readFn })
    }
    if (PointsManager.isLazyPointsModule(points)) {
      return PointsManager.lazy(points, { absPath, readFn })
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
      PointsManager.setPointsManager(this)
    }
  }

  async read(): Promise<void> {
    if (this.readFn && this.absPath) {
      const freshPointsModule = await this.readFn(this.absPath)
      const freshPoints = PointsManager.create(freshPointsModule, { absPath: this.absPath, readFn: this.readFn })
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
      scope: this.root.scope,
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
    routes?: RoutesPretty
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
      Object.values(points).every((p: any) => typeof p.type === 'string')
    )
  }

  private static isReadyPointsModule(points: any): points is ReadyPointsModule {
    return (
      !Array.isArray(points) &&
      // Object.keys(points).length > 0 &&
      Object.values(points).every((p: any) => typeof p.point?.type === 'string')
    )
  }

  static isRoutedPointsCollection(points: any): points is LazyRoutedPointsCollection | ReadyRoutedPointsCollection {
    if (!Array.isArray(points)) {
      return false
    }
    if (points.length === 0) {
      return true
    }
    return points.every((p: any) => 'FC' in p)
  }

  private static rawToReadyPointsCollection(points: RawPointsCollection): ReadyPointsCollection {
    return points.map((point) => {
      return {
        type: point.type,
        name: point.name || '__POINT0_UNNAMED__',
        point,
        shouldBePrefetchedOnLinkHover: point.shouldBePrefetchedOnLinkHover,
        layouts: point._layouts.map((l) => l.name || '__POINT0_UNNAMED__'),
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
    return Object.values(points).flatMap((p) => ('type' in p ? [] : p))
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
        shouldBePrefetchedOnLinkHover: record.shouldBePrefetchedOnLinkHover,
        point: record.point,
        layouts: record.layouts ?? [],
        FC:
          record.type === 'layout'
            ? typeof point === 'function'
              ? React.lazy(async () => ({
                  default: await point().then((p) => p.Layout),
                }))
              : point.Layout
            : record.type === 'page'
              ? typeof point === 'function'
                ? React.lazy(async () => ({
                    default: await point().then((p) => p.Page),
                  }))
                : point.Page
              : record.type === 'component'
                ? typeof point === 'function'
                  ? React.lazy(async () => ({
                      default: await point().then((p) => p.Component),
                    }))
                  : point.Component
                : record.type === 'provider'
                  ? typeof point === 'function'
                    ? React.lazy(async () => ({
                        default: await point().then((p) => p.Provider),
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
  }): RoutesPretty => {
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
        if (point.type === 'page' && !route) {
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
        const pointType = point.type
        const pointName = point.name
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
          shouldBePrefetchedOnLinkHover: record.shouldBePrefetchedOnLinkHover,
          name: pointName || record.name,
          type: pointType,
          layouts: recordLayouts,
          FC: record.FC,
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
        Layout: layoutRecord?.FC as React.ComponentType<{ children: React.ReactNode }> | undefined,
        layoutName: layoutRecord?.name,
        layoutPoint: layoutRecord?.point as LayoutPoint | (() => Promise<LayoutPoint>) | undefined,
        pages: pagesRecords.map((p) => ({
          Page: p.FC as React.ComponentType | React.LazyExoticComponent<React.ComponentType>,
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
    if (suitable.FC) {
      await PointsManager.prefetchLazyComponent(suitable.FC)
    }

    const layouts = await Promise.all(
      this.collection
        .filter((p) => p.type === 'layout' && suitable.layouts?.includes(p.name))
        .map(async (layout) => {
          if (layout.FC) {
            await PointsManager.prefetchLazyComponent(layout.FC)
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

  static _pagesPrefetchingPromises: Map<string, Promise<PagePoint | undefined>> = new Map<
    string,
    Promise<PagePoint | undefined>
  >()

  prefetchSuitablePagePoint = async ({
    location,
    queryClient,
    policy,
  }: {
    location: AnyLocation
    queryClient?: QueryClient
    policy?: PagePrefetchPolicy
  }): Promise<PagePoint | undefined> => {
    const locationString = JSON.stringify(location)
    const exPromise = PointsManager._pagesPrefetchingPromises.get(locationString)
    if (exPromise) {
      return await exPromise
    }
    const promise = (async () => {
      const result = await this.loadSuitablePage({ location })
      if (!result) {
        return undefined
      }
      await result.page.prefetchPage(result.page._getUnsafeInputRawByLocation(location), undefined, {
        queryClient,
        location,
        policy,
      })
      return result.page
    })()
    PointsManager._pagesPrefetchingPromises.set(locationString, promise)
    try {
      const result = await promise
      PointsManager._pagesPrefetchingPromises.delete(locationString)
      return result
    } catch (error) {
      PointsManager._pagesPrefetchingPromises.delete(locationString)
      throw error
    }
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
        FC: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>> | undefined
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
    for (const { route, point, type, name, FC, layouts } of this.collection as ReadyRoutedPointsCollection) {
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
              FC,
              layouts,
            }
          }
          if (!route || !input) {
            return {
              point: point as TReady extends true ? EndPoint : () => Promise<EndPoint>,
              name,
              type,
              pageLocation: undefined,
              FC,
              layouts,
            }
          }
          // TODO: add helper for htis in route0, like route.getSelfLocation(input): ExactLocation
          const match = route.getLocation(route.get(input)) // it is ok, that we do not parse here input with superjson, becouse if it is page input, it is always object with strings
          return {
            point: point as TReady extends true ? EndPoint : () => Promise<EndPoint>,
            name,
            type,
            pageLocation: match.exact ? match : undefined,
            FC,
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
          FC,
          layouts,
        }
      }
    }
    return undefined
  }

  _getPagePointByHref = (
    href: string,
  ):
    | { point: ReadyRoutedPointsCollectionRecord | LazyRoutedPointsCollectionRecord; location: ExactLocation }
    | undefined => {
    const location = this.routes._.getLocation(href)
    if (!location.exact || !location.route) {
      return undefined
    }
    const point = this.collection.find((p) => p.type === 'page' && p.route?.definition === location.route)
    if (!point) {
      return undefined
    }
    return { point, location }
  }

  // global

  private static readonly setPointsManager = (points: ReadyPointsModule | LazyPointsModule | PointsManager) => {
    const createdPoints = PointsManager.create(points)
    if (!(globalThis as any).__POINT0_POINTS_MANAGER__) {
      ;(globalThis as any).__POINT0_POINTS_MANAGER__ = {}
    }
    ;(globalThis as any).__POINT0_POINTS_MANAGER__[createdPoints.scope] = createdPoints
    return createdPoints
  }
  static getPointsManager = (scope?: PointsScope): PointsManager => {
    scope ??= SuperStore.getWeak<PointsScope>('__POINT0_SCOPE__')
    if (!scope) {
      throw new Error('Points scope not found if SuperStore. You should provide scope.')
    }
    const points =
      scope in (globalThis as any).__POINT0_POINTS_MANAGER__
        ? (globalThis as any).__POINT0_POINTS_MANAGER__[scope]
        : undefined
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
  shouldBePrefetchedOnLinkHover?: boolean | number
  point: (() => Promise<EndPoint>) | EndPoint
  layouts?: string[]
}
export type LazyPointsCollection = LazyPointsCollectionRecord[]
export type ReadyPointsCollectionRecord = {
  type: EndPointType
  name: PointName
  route?: string | undefined
  shouldBePrefetchedOnLinkHover: boolean | number
  point: EndPoint
  FC?: React.ComponentType
  layouts?: string[]
}
export type ReadyPointsCollection = ReadyPointsCollectionRecord[]
export type LazyRoutedPointsCollectionRecord = {
  type: EndPointType
  name: PointName
  route: AnyRoute | UndefinedRoute
  point: () => Promise<EndPoint>
  shouldBePrefetchedOnLinkHover: boolean | number
  FC?: React.LazyExoticComponent<React.ComponentType>
  layouts: string[]
}
export type LazyRoutedPointsCollection = LazyRoutedPointsCollectionRecord[]
export type ReadyRoutedPointsCollectionRecord = {
  type: EndPointType
  name: PointName
  route: AnyRoute | UndefinedRoute
  point: EndPoint
  shouldBePrefetchedOnLinkHover: boolean | number
  FC?: React.ComponentType
  layouts: string[]
}
export type ReadyRoutedPointsCollection = ReadyRoutedPointsCollectionRecord[]
export type RawPointsCollection = EndPoint[]

export type LazyPointsModule<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  _root_lazy: { point: RootPoint<TRequiredCtx>; type: 'root'; name: string }
} & Record<string, LazyPointsCollectionRecord>
export type ReadyPointsModule<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  _root_ready: { point: RootPoint<TRequiredCtx> }
} & Record<string, { point: EndPoint }>
export type AnyPointsModule<TRequiredCtx extends RequiredCtx = any> =
  | LazyPointsModule<TRequiredCtx>
  | ReadyPointsModule<TRequiredCtx>

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

export type RequiredCtxByPointsModule<TPointsModule extends ReadyPointsModule | LazyPointsModule> =
  TPointsModule extends ReadyPointsModule
    ? TPointsModule['_root_ready']['point']['Infer']['RequiredCtx']
    : TPointsModule extends LazyPointsModule
      ? TPointsModule['_root_lazy']['point']['Infer']['RequiredCtx']
      : RequiredCtx

export type RequiredCtxByPointsModules<
  T1 extends AnyPointsModule = AnyPointsModule,
  T2 extends AnyPointsModule = AnyPointsModule,
  T3 extends AnyPointsModule = AnyPointsModule,
  T4 extends AnyPointsModule = AnyPointsModule,
> = Prettify<
  MergeOmitAnyMany<
    RequiredCtxByPointsModule<T1>,
    RequiredCtxByPointsModule<T2>,
    RequiredCtxByPointsModule<T3>,
    RequiredCtxByPointsModule<T4>
  >
>

type Prettify<T> = T extends undefined
  ? undefined
  : {
      [K in keyof T]: T[K]
    }
type UndefinedToAny<T extends object | undefined> = T extends undefined ? any : T
type MergeOmitAny<T1 extends object | undefined, T2 extends object | undefined> = IfAnyThenElse<
  UndefinedToAny<T1>,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  T1
> &
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  IfAnyThenElse<UndefinedToAny<T2>, {}, T2>
type EmptyObjectToUndefined<T extends object | undefined> = IsEmptyObject<T> extends true ? undefined : T
type MergeOmitAnyMany<
  T1 extends object | undefined,
  T2 extends object | undefined,
  T3 extends object | undefined,
  T4 extends object | undefined,
> = EmptyObjectToUndefined<MergeOmitAny<MergeOmitAny<MergeOmitAny<T1, T2>, T3>, T4>>

// type FC = MergeOmitAnyMany<undefined, {}, any, {x: 1}>

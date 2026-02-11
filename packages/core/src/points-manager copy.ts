import type { AnyLocation, AnyRoute, ExactLocation, RoutesPretty } from '@devp0nt/route0'
import { Route0, Routes } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { _point0_env } from './env.js'
import { _ssItems, _getFakeClient } from './internals.js'
import type {
  DataTransformerExtended,
  ReadyPoint,
  ReadyPointType,
  InputRawUnknown,
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

export class PointsManager<TReady extends boolean = boolean, TRequiredCtx extends RequiredCtx = RequiredCtx> {
  transformer: DataTransformerExtended
  absPath: string | null
  readFn: PointsReadFn | null
  scope: PointsScope
  baseurl: string | null | undefined
  basepath: string | null
  hostname: string | null
  root: RootPoint
  collection: TReady extends true ? ReadyPointsCollection : NormalizedPointsCollection
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
    collection: TReady extends true ? ReadyPointsCollection : NormalizedPointsCollection
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
    this.transformer = this.root._getTransformer()
    this.ssr = this.root._ssr
    PointsManager.setPointsManager(this)
    if (_point0_env.target.is.client) {
      _ssItems.__POINT0_CLIENT_SCOPE__.set(this.scope)
    }
  }

  // // TODO: add readyByModule and readyByCollection
  // private static readonly ready = <TReadyPointsModule extends ReadyPointsModule>(
  //   readyPoints: TReadyPointsModule,
  //   options?: {
  //     absPath?: string
  //     readFn?: PointsReadFn
  //   },
  // ): PointsManager<true, TReadyPointsModule['_root']['point']['point']['Infer']['RequiredCtx']> => {
  //   const { absPath, readFn } = options ?? {}
  //   const { _root, ...rest } = readyPoints
  //   const rawPoints: ReadyPoint[] = Object.values(rest).map((p) => p.point.point)
  //   const collection = this.rawPointsCollectionToReadyPointsCollection(rawPoints)
  //   const routes = PointsManager.toRoutes({ points: collection })
  //   const pagesTreeSource = PointsManager.toPagesTreeSource({ points: collection })
  //   const pagesTree = PointsManager.toPagesTree({ points: collection, pagesTreeSource })
  //   return new PointsManager<true, TReadyPointsModule['_root']['point']['point']['Infer']['RequiredCtx']>({
  //     root: _root.point.point,
  //     scope: _root.point.point.scope,
  //     collection,
  //     routes,
  //     ready: true,
  //     pagesTreeSource,
  //     pagesTree,
  //     absPath: absPath ?? null,
  //     readFn: readFn ?? null,
  //   })
  // }

  // // TODO: add lazyByModule and lazyByCollection
  // private static readonly lazy = <TLazyPointsModule extends LazyPointsModule>(
  //   lazyPoints: TLazyPointsModule,
  //   options?: {
  //     absPath?: string
  //     readFn?: PointsReadFn
  //   },
  // ): PointsManager<false, TLazyPointsModule['_root']['point']['point']['Infer']['RequiredCtx']> => {
  //   const { absPath, readFn } = options ?? {}
  //   const { _root, ...rest } = lazyPoints
  //   const lazyPointsWithoutRoot = Object.values(rest) as LazyPointsCollection
  //   const collection = PointsManager.toNormalizedLazyPointsCollection(lazyPointsWithoutRoot)
  //   const routes = PointsManager.toRoutes({ points: collection })
  //   const pagesTreeSource = PointsManager.toPagesTreeSource({ points: collection })
  //   const pagesTree = PointsManager.toPagesTree({ points: collection, pagesTreeSource })
  //   return new PointsManager<false, TLazyPointsModule['_root']['point']['point']['Infer']['RequiredCtx']>({
  //     root: _root.point.point,
  //     scope: _root.point.point.scope,
  //     collection,
  //     routes,
  //     ready: false,
  //     pagesTreeSource,
  //     pagesTree,
  //     absPath: absPath ?? null,
  //     readFn: readFn ?? null,
  //   })
  // }

  static readonly create = <TPoints extends PointsDefinition | PointsManager>(
    points: TPoints,
    options?: {
      absPath?: string
      readFn?: PointsReadFn
    },
  ): PointsManager<
    false,
    TPoints extends PointsManager
      ? TPoints['root']['point']['point']['Infer']['RequiredCtx']
      : TPoints extends PointsDefinition<infer TRequiredCtx>
        ? TRequiredCtx
        : RequiredCtx
  > => {
    const { absPath, readFn } = options ?? {}
    if (points instanceof PointsManager) {
      points.readFn = readFn ?? points.readFn
      points.absPath = absPath ?? points.absPath
      return points as never
    }
    const collection = PointsManager.toNormalizedPointsCollection(points)
    const fristRecord = collection.at(0)
    if (!PointsManager.isRootRecord(fristRecord)) {
      throw new Error('Root point not found')
    }
    const root = fristRecord.point as RootPoint
    const routes = PointsManager.toRoutes({ points: collection })
    const pagesTreeSource = PointsManager.toPagesTreeSource({ points: collection })
    const pagesTree = PointsManager.toPagesTree({ points: collection, pagesTreeSource })
    return new PointsManager({
      root,
      scope: root.scope,
      collection,
      routes,
      ready: false,
      pagesTreeSource,
      pagesTree,
      absPath: absPath ?? null,
      readFn: readFn ?? null,
    })
    // if (PointsManager.isReadyPointsModule(points)) {
    //   return PointsManager.ready(points, { absPath, readFn }) as never
    // }
    // if (PointsManager.isLazyPointsModule(points)) {
    //   return PointsManager.lazy(points, { absPath, readFn }) as never
    // }
    // if (PointsManager.isRawPointsDefinition(points)) {
    //   return PointsManager.ready(PointsManager.rawPointsDefinitionToReadyPointsModule(points), {
    //     absPath,
    //     readFn,
    //   }) as never
    // }
    // throw new Error('Invalid points input')
  }

  static async createFromSource<TSource extends PointsDefinitionSource>(
    source: TSource,
    options?: {
      absPath?: string
      readFn?: PointsReadFn
    },
  ): Promise<PointsManager<false, TSource extends PointsDefinitionSource<infer TRequiredCtx> ? TRequiredCtx : never>> {
    if (typeof source === 'function') {
      const result = await source()
      const points = 'default' in result ? result.default : result
      return PointsManager.create(points, options) as never
    }
    if ('default' in source) {
      const points = source.default
      return PointsManager.create(points, options) as never
    }
    return PointsManager.create(source, options) as never
  }

  private static isRootRecord(
    record: NormalizedPointsCollectionRecord | undefined,
  ): record is NormalizedPointsCollectionRecord {
    return typeof record === 'object' && 'type' in record && record.type === 'root' && 'point' in record.point
  }

  async replace(points: PointsManager): Promise<void> {
    this.absPath = points.absPath
    this.readFn = points.readFn
    this.root = points.root
    this.collection = points.collection as TReady extends true ? ReadyPointsCollection : NormalizedLazyPointsCollection
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
      const freshPoints = PointsManager.create(freshPointsModule.default, {
        absPath: this.absPath,
        readFn: this.readFn,
      })
      await this.replace(freshPoints)
    }
  }

  async load(force?: boolean): Promise<PointsManager<true, TRequiredCtx>> {
    if (this.ready && !force) {
      return this as PointsManager<true, TRequiredCtx>
    }
    const { readyPoints, errors } = await PointsManager.toReadyPointsCollection(this.collection)
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

  // private static isLazyPointsModule(points: unknown): points is LazyPointsModule {
  //   return (
  //     typeof points === 'object' &&
  //     points !== null &&
  //     !Array.isArray(points) &&
  //     Object.values(points).some((p: any) => p?.point?.__POINT0_INSTANCE__ !== true)
  //   )
  // }

  // private static isReadyPointsModule(points: unknown): points is ReadyPointsModule {
  //   return (
  //     typeof points === 'object' &&
  //     points !== null &&
  //     !Array.isArray(points) &&
  //     Object.values(points).every((p: any) => p?.point?.__POINT0_INSTANCE__ === true)
  //   )
  // }

  // private static isRawPointsDefinition(points: unknown): points is RawPointsDefinition {
  //   return (
  //     Array.isArray(points) &&
  //     points.length > 0 &&
  //     points[0].type === 'root' &&
  //     points.every((p: any) => p?.point?.__POINT0_INSTANCE__ === true)
  //   )
  // }

  // static isNormalizedLazyPointsCollection(points: any): points is NormalizedLazyPointsCollection {
  //   if (!Array.isArray(points)) {
  //     return false
  //   }
  //   if (points.length === 0) {
  //     return true
  //   }
  //   return points.every((p: any) => 'FC' in p)
  // }

  static toNormalizedPointsCollection(points: MixedPointsCollection | PointsDefinition): NormalizedPointsCollection {
    return points.map((p) => {
      // const sourcePoint = record.point
      const point = 'point' in p && 'point' in p.point ? p.point.point : undefined
      const record = 'type' in p && !('point' in p && 'point' in p.point) ? p : undefined
      const source = point ?? (record as Exclude<typeof record, undefined>)
      const pointSource = point ?? source.point
      return {
        type: source.type,
        name: source.name,
        route: source.route ? Route0.from(source.route) : undefined,
        polh: !!source.polh,
        point: point ?? source.point,
        layouts: record ? (record.layouts ?? []) : point ? point._layouts.map((l) => l.name) : [],
        FC:
          source.type === 'layout'
            ? typeof pointSource === 'function'
              ? React.lazy(async () => ({
                  default: await pointSource().then((p) => p.point.Layout),
                }))
              : pointSource.point.Layout
            : source.type === 'page'
              ? typeof pointSource === 'function'
                ? React.lazy(async () => ({
                    default: await pointSource().then((p) => p.point.Page),
                  }))
                : pointSource.point.Page
              : source.type === 'component'
                ? typeof pointSource === 'function'
                  ? React.lazy(async () => ({
                      default: await pointSource().then((p) => p.point.Component),
                    }))
                  : pointSource.point.Component
                : source.type === 'provider'
                  ? typeof pointSource === 'function'
                    ? React.lazy(async () => ({
                        default: await pointSource().then((p) => p.point.Provider),
                      }))
                    : pointSource.point.Provider
                  : undefined,
      }
    })
  }

  // static toNormalizedLazyPointsCollection(points: LazyPointsCollection): NormalizedLazyPointsCollection {
  //   if (this.isNormalizedLazyPointsCollection(points)) {
  //     return points
  //   }
  //   return points.map((record) => {
  //     const point = record.point
  //     return {
  //       type: record.type,
  //       name: record.name,
  //       route: record.route ? Route0.from(record.route) : undefined,
  //       polh: !!record.polh,
  //       point: record.point,
  //       layouts: record.layouts ?? [],
  //       FC:
  //         record.type === 'layout'
  //           ? typeof point === 'function'
  //             ? React.lazy(async () => ({
  //                 default: await point().then((p) => p.point.Layout),
  //               }))
  //             : point.point.Layout
  //           : record.type === 'page'
  //             ? typeof point === 'function'
  //               ? React.lazy(async () => ({
  //                   default: await point().then((p) => p.point.Page),
  //                 }))
  //               : point.point.Page
  //             : record.type === 'component'
  //               ? typeof point === 'function'
  //                 ? React.lazy(async () => ({
  //                     default: await point().then((p) => p.point.Component),
  //                   }))
  //                 : point.point.Component
  //               : record.type === 'provider'
  //                 ? typeof point === 'function'
  //                   ? React.lazy(async () => ({
  //                       default: await point().then((p) => p.point.Provider),
  //                     }))
  //                   : point.point.Provider
  //                 : undefined,
  //     }
  //   })
  // }

  private static rawPointsCollectionToReadyPointsCollection(points: ReadyPoint[]): ReadyPointsCollection {
    return points.map((point) => {
      return {
        ready: true,
        type: point.type,
        name: point.name,
        route: point.route ? Route0.from(point.route) : undefined,
        polh: point.polh,
        point,
        layouts: point._layouts.map((l) => l.name),
        FC:
          point.type === 'layout'
            ? point.Layout
            : point.type === 'page'
              ? point.Page
              : point.type === 'component'
                ? point.Component
                : point.type === 'provider'
                  ? point.Provider
                  : undefined,
      }
    })
  }

  // static readonly rawPointsDefinitionToReadyPointsModule = (definition: RawPointsDefinition): ReadyPointsModule => {
  //   const [_root, ...rest] = definition

  //   if (!_root) {
  //     throw new Error('Root point not found')
  //   }
  //   return {
  //     _root,
  //     ...Object.fromEntries(rest.map((p, index) => [`${p.point.type}_${p.point.name}_${index}`, { point: p.point }])),
  //   }
  // }

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
    points: NormalizedPointsCollection | ReadyPointsCollection,
  ): Promise<{ readyPoints: ReadyPointsCollection; errors: unknown[] }> {
    const results = await Promise.allSettled(
      points.map(async (record, index) => {
        const pointPromise = typeof record.point === 'function' ? record.point() : record.point
        return (await pointPromise).point
      }),
    )
    const rawPoints = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
    const readyPoints = this.rawPointsCollectionToReadyPointsCollection(rawPoints)
    const errors = results.filter((r) => r.status === 'rejected').map((r) => r.reason)
    return { readyPoints, errors }
  }

  // pages tree

  static readonly toPagesTreeSource = ({
    points,
  }: {
    points:
      | Array<{ type: ReadyPointType; name: PointName; route?: string | undefined | AnyRoute; layouts?: string[] }>
      | ReadyPointsCollection
      | NormalizedLazyPointsCollection
  }): PagesTreeSource => {
    const pointsCollection = points
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
    points: ReadyPointsCollection | NormalizedPointsCollection
    pagesTreeSource: PagesTreeSource
  }): PagesTree => {
    const pointsCollection = points
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
    const page: ReadyPoint = typeof suitable.point === 'function' ? await suitable.point() : suitable.point

    // Prefetch the (possibly lazy) page component
    if (suitable.FC) {
      await PointsManager.prefetchLazyComponent(suitable.FC)
    }

    const layouts: ReadyPoint[] = await Promise.all(
      this.collection
        .filter((p) => p.type === 'layout' && suitable.layouts?.includes(p.name))
        .map(async (layout) => {
          if (layout.FC) {
            await PointsManager.prefetchLazyComponent(layout.FC)
          }
          return typeof layout.point === 'function' ? (await layout.point()).point : layout.point.point
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
    input?: InputRawUnknown | undefined
    pointType?: ReadyPointType | undefined
    pointName?: PointName | undefined
    scope?: PointsScope | undefined
  }):
    | {
        point: TReady extends true ? ReadyPoint : (() => Promise<ReadyPoint>) | ReadyPoint
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
    for (const { route, point, type, name, FC, layouts } of this.collection) {
      if (pointType && type !== pointType) {
        continue
      }
      if (pointName) {
        if (name === pointName) {
          if (type !== 'page') {
            return {
              // point: point as TReady extends true
              //   ? { point: ReadyPoint }
              //   : (() => Promise<{ point: ReadyPoint }>) | { point: ReadyPoint },
              point: (typeof point === 'function' ? async () => (await point()).point : point.point) as ReadyPoint,
              name,
              type,
              pageLocation: undefined,
              FC,
              layouts,
            }
          }
          if (!route || !input) {
            return {
              // point: point as TReady extends true
              //   ? { point: ReadyPoint }
              //   : (() => Promise<{ point: ReadyPoint }>) | { point: ReadyPoint },
              point: (typeof point === 'function' ? async () => (await point()).point : point.point) as ReadyPoint,
              name,
              type,
              pageLocation: undefined,
              FC,
              layouts,
            }
          }
          // TODO: add helper for htis in route0, like route.getSelfLocation(input): ExactLocation
          const match = route.getLocation(route.get(input))
          return {
            // point: point as TReady extends true ? { point: ReadyPoint } : () => Promise<{ point: ReadyPoint }>,
            point: (typeof point === 'function' ? async () => (await point()).point : point.point) as ReadyPoint,
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
          // point: point as TReady extends true
          //   ? { point: ReadyPoint }
          //   : (() => Promise<{ point: ReadyPoint }>) | { point: ReadyPoint },
          point: (typeof point === 'function' ? async () => (await point()).point : point.point) as ReadyPoint,
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
    | { point: ReadyPointsCollectionRecord | NormalizedLazyPointsCollectionRecord; location: ExactLocation }
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

  private static readonly setPointsManager = (points: PointsDefinition | PointsManager) => {
    const createdPoints = PointsManager.create(points)
    if (!(globalThis as any).__POINT0_CLIENT_POINTS__) {
      ;(globalThis as any).__POINT0_CLIENT_POINTS__ = {}
    }
    ;(globalThis as any).__POINT0_CLIENT_POINTS__[createdPoints.scope] = createdPoints
    return createdPoints
  }
  static getPointsManager = (scope?: PointsScope): PointsManager => {
    // all this needed only for router, to know which routes and pages exists in current scope
    // we can not here use env.scope, because for server it can be 'root' while for client it can be 'site' for example
    // and this code will be executed on server
    scope ??= _ssItems.__POINT0_CLIENT_SCOPE__.getWeak() ?? _getFakeClient()?.scope
    if (!scope) {
      throw new Error('Points scope not found if SuperStore. You should provide scope.')
    }
    const points =
      scope in (globalThis as any).__POINT0_CLIENT_POINTS__
        ? (globalThis as any).__POINT0_CLIENT_POINTS__[scope]
        : undefined
    if (!points) {
      throw new Error('Points not found. Forget to call Points.create()?')
    }
    return points
  }
}

// utils

export type PointsReadFn = (absPath: string) => Promise<PointsDefinitionModule>

// collection

export type ReadyPointsCollectionRecord = {
  ready: true
  type: ReadyPointType
  name: PointName
  route: AnyRoute | undefined
  polh: boolean | number
  point: ReadyPoint
  FC: React.ComponentType | undefined
  layouts?: string[]
}
export type ReadyPointsCollection = ReadyPointsCollectionRecord[]

export type LazyPointsCollectionRecord = {
  type: ReadyPointType
  name: PointName
  route?: string | undefined
  polh?: boolean | number
  point: (() => Promise<{ point: ReadyPoint }>) | { point: ReadyPoint }
  layouts?: string[]
}
export type LazyPointsCollection = LazyPointsCollectionRecord[]
export type NormalizedLazyPointsCollectionRecord = {
  type: ReadyPointType
  name: PointName
  route: AnyRoute | UndefinedRoute
  point: (() => Promise<{ point: ReadyPoint }>) | { point: ReadyPoint }
  polh: boolean | number
  FC: React.LazyExoticComponent<React.ComponentType> | React.ComponentType | undefined
  layouts: string[]
}
export type NormalizedLazyPointsCollection = NormalizedLazyPointsCollectionRecord[]

export type RawPointsCollectionRecord = { point: ReadyPoint }

export type MixedPointsCollectionRecord =
  | ReadyPointsCollectionRecord
  | LazyPointsCollectionRecord
  | NormalizedLazyPointsCollectionRecord
  | RawPointsCollectionRecord
export type MixedPointsCollection = MixedPointsCollectionRecord[]

export type NormalizedPointsCollectionRecord = ReadyPointsCollectionRecord | NormalizedLazyPointsCollectionRecord
export type NormalizedPointsCollection = NormalizedPointsCollectionRecord[]

export type PointsDefinition<TRequiredCtx extends RequiredCtx = RequiredCtx> =
  | [{ point: RootPoint<TRequiredCtx> }, ...MixedPointsCollectionRecord[]]
  | readonly [{ point: RootPoint<TRequiredCtx> }, ...MixedPointsCollectionRecord[]]
export type PointsDefinitionGetter<TRequiredCtx extends RequiredCtx = RequiredCtx> = () => Promise<
  PointsDefinition<TRequiredCtx>
>
export type PointsDefinitionModule<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  default: PointsDefinition<TRequiredCtx>
}
export type PointsDefinitionModuleGetter<TRequiredCtx extends RequiredCtx = RequiredCtx> = () => Promise<
  PointsDefinitionModule<TRequiredCtx>
>
export type PointsDefinitionSource<TRequiredCtx extends RequiredCtx = RequiredCtx> =
  | PointsDefinition<TRequiredCtx>
  | PointsDefinitionGetter<TRequiredCtx>
  | PointsDefinitionModule<TRequiredCtx>
  | PointsDefinitionModuleGetter<TRequiredCtx>
export type ExtractPointsDefinition<T extends PointsDefinitionSource> = T extends PointsDefinition
  ? T
  : T extends PointsDefinitionModule
    ? T['default']
    : T extends PointsDefinitionModuleGetter
      ? Awaited<ReturnType<T>> extends PointsDefinition
        ? Awaited<ReturnType<T>>
        : Awaited<ReturnType<T>> extends PointsDefinitionModule
          ? Awaited<ReturnType<T>>['default']
          : never
      : never
export type RequiredCtxByPointsDefinitionSource<T extends PointsDefinitionSource> =
  ExtractPointsDefinition<T>[0]['point']['Infer']['RequiredCtx']
export type RequiredCtxByPointsDefinitionSourceOrUndefined<T extends PointsDefinitionSource | undefined> =
  T extends PointsDefinitionSource ? RequiredCtxByPointsDefinitionSource<T> : T extends undefined ? undefined : never

// pages tree

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

// // required ctx type helpers

// export type RequiredCtxByPointsDefinition<T extends PointsDefinition> =
//   ExtractPointsDefinition<T>[0]['point']['Infer']['RequiredCtx']
// export type RequiredCtxByPointsDefinitionSource<T extends PointsDefinitionSource> = RequiredCtxByPointsDefinition<
//   ExtractPointsDefinition<T>
// >
// export type RequiredCtxByPointsDefinitionSources<
//   T1 extends PointsDefinitionSource = PointsDefinitionSource,
//   T2 extends PointsDefinitionSource = PointsDefinitionSource,
//   T3 extends PointsDefinitionSource = PointsDefinitionSource,
//   T4 extends PointsDefinitionSource = PointsDefinitionSource,
// > = PrettifyOrUndefined<
//   MergeOmitAnyMany<
//     RequiredCtxByPointsDefinitionSource<T1>,
//     RequiredCtxByPointsDefinitionSource<T2>,
//     RequiredCtxByPointsDefinitionSource<T3>,
//     RequiredCtxByPointsDefinitionSource<T4>
//   >
// >

// type UndefinedToAny<T extends object | undefined> = T extends undefined ? any : T
// type MergeOmitAny<T1 extends object | undefined, T2 extends object | undefined> = IfAnyThenElse<
//   UndefinedToAny<T1>,
//   // eslint-disable-next-line @typescript-eslint/no-empty-object-type
//   {},
//   T1
// > &
//   // eslint-disable-next-line @typescript-eslint/no-empty-object-type
//   IfAnyThenElse<UndefinedToAny<T2>, {}, T2>
// type EmptyObjectToUndefined<T extends object | undefined> = IsEmptyObject<T> extends true ? undefined : T
// type MergeOmitAnyMany<
//   T1 extends object | undefined,
//   T2 extends object | undefined,
//   T3 extends object | undefined,
//   T4 extends object | undefined,
// > = EmptyObjectToUndefined<MergeOmitAny<MergeOmitAny<MergeOmitAny<T1, T2>, T3>, T4>>

// // type FC = MergeOmitAnyMany<undefined, {}, any, {x: 1}>

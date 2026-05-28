import { Route0, Routes } from '@devp0nt/route0'
import type { AnyLocation, AnyRoute, ExactLocation, RoutesPretty } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import { _point0_env } from './env.js'
import type { ErrorPoint0 } from './error.js'
import { _ss } from './internals.js'
import { _defaultLogFn, _ssClientLog } from './logger.js'
import type { LogFn } from './logger.js'
import { PointsManager } from './points-manager.js'
import type {
  NormalizedLazyPointsCollection,
  NormalizedLazyPointsCollectionRecord,
  NormalizedPointsCollection,
  PointsDefinition,
  PointsDefinitionSource,
  ReadyPointsCollection,
  ReadyPointsCollectionRecord,
} from './points-manager.js'
import type {
  DataTransformerExtended,
  ExtraUseQueryOptions,
  FetchOptions,
  LayoutPoint,
  MiddlewareFn,
  PagePoint,
  PointName,
  PointsScope,
  PointType,
  PrefetchPagePolicy,
  ReadyPoint,
  ReadyPointType,
} from './types.js'
import { isAbsoluteUrl } from './utils.js'

export class ClientPoints<TError extends ErrorPoint0> {
  manager: PointsManager

  basePath: AnyRoute | undefined
  middlewares: MiddlewareFn<TError, any>[]
  transformer: DataTransformerExtended

  routes: RoutesPretty
  routesHash: string
  pagesTreeSource: PagesTreeSource
  pagesTree: PagesTree
  layouts: ClientPointsLayouts

  private constructor({
    manager,
    routes,
    routesHash,
    pagesTreeSource,
    pagesTree,
    layouts,
    basePath,
    middlewares,
    transformer,
  }: {
    manager: PointsManager
    routes: RoutesPretty
    routesHash: string
    pagesTreeSource: PagesTreeSource
    pagesTree: PagesTree
    layouts: ClientPointsLayouts
    basePath: AnyRoute | undefined
    middlewares: MiddlewareFn<TError, any>[]
    transformer: DataTransformerExtended
  }) {
    this.manager = manager
    this.routes = routes
    this.routesHash = routesHash
    this.pagesTreeSource = pagesTreeSource
    this.pagesTree = pagesTree
    this.layouts = layouts
    this.basePath = basePath
    this.middlewares = middlewares
    this.transformer = transformer
  }

  static createFromDefintion<TError extends ErrorPoint0>(
    points: PointsDefinition<any, TError> | PointsManager<any, any, TError>,
    options: { log?: LogFn } = {},
  ): ClientPoints<TError> {
    const manager = PointsManager.createFromDefinition(points, options)
    const roots = manager.getRoots()
    const root = roots.at(0)
    if (!root) {
      throw new Error('No root points found')
    }
    if (roots.length > 1) {
      throw new Error('Multiple root points not allowed for client points')
    }

    const routes = ClientPoints.toRoutes({ points: manager.collection, scope: manager.scope })
    manager.collection = ClientPoints.sortCollection({ points: manager.collection, routes, scope: manager.scope })
    const pagesTreeSource = ClientPoints.toPagesTreeSource({ points: manager.collection })
    const pagesTree = ClientPoints.toPagesTree({ points: manager.collection, pagesTreeSource })
    const routesHash = routes._.pathsOrdering.join(',')
    const layouts = ClientPoints.toLayouts({ points: manager.collection })
    const basePath = root._basePath
    const middlewares = root._middlewares
    const transformer = root._getTransformer()

    return new ClientPoints<any>({
      manager,
      routes,
      routesHash,
      pagesTreeSource,
      pagesTree,
      layouts,
      basePath,
      middlewares,
      transformer,
    })
  }

  static async createFromSource<TError extends ErrorPoint0>(
    source: PointsDefinitionSource<any, TError>,
    options: { log?: LogFn } = {},
  ): Promise<ClientPoints<TError>> {
    const manager = await PointsManager.createFromSource(source, options)
    return ClientPoints.createFromDefintion(manager, options)
  }

  static readonly toRoutes = ({
    points,
    scope,
  }: {
    points: Array<{
      type: PointType
      name: PointName
      route?: string | undefined | AnyRoute
      toStringWithLocation?: () => string
    }>
    scope: PointsScope
  }): RoutesPretty => {
    const routes: Record<string, AnyRoute> = {}
    const pagePointsByRouteDefinition = new Map<
      string,
      {
        name: PointName
        route: AnyRoute
        toStringWithLocation?: () => string
      }
    >()
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
      for (const existingPagePoint of pagePointsByRouteDefinition.values()) {
        if (!route.isConflict(existingPagePoint.route)) {
          continue
        }
        const currentPointString = item.toStringWithLocation?.() ?? `${scope}.page.${name}`
        const existingPointString =
          existingPagePoint.toStringWithLocation?.() ?? `${scope}.page.${existingPagePoint.name}`
        throw new Error(`Conflicted page routes: ${currentPointString} conflicts with ${existingPointString}`)
      }
      pagePointsByRouteDefinition.set(route.definition, {
        name,
        route,
        toStringWithLocation: item.toStringWithLocation,
      })
      routes[name] = route
    }
    return Routes.create(routes)
  }

  static sortCollection<T extends Array<{ type: PointType; name: PointName; route?: AnyRoute | undefined }>>({
    routes,
    points,
    scope,
  }: {
    routes?: RoutesPretty
    points: T
    scope: PointsScope
  }): T {
    routes ??= ClientPoints.toRoutes({ points, scope })
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

  static readonly toLayouts = ({
    points,
  }: {
    points: ReadyPointsCollection | NormalizedPointsCollection
  }): ClientPointsLayouts => {
    const layouts: ClientPointsLayouts = {}
    for (const point of points.filter((p) => p.type === 'layout')) {
      layouts[point.name] = point.FC as
        | React.ComponentType<{ children: React.ReactNode }>
        | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
    }
    return layouts
  }

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
    const getNestedPageNames = (record: PagesTreeSourceRecord): string[] => [
      ...record.pages,
      ...(record.nested?.flatMap(getNestedPageNames) ?? []),
    ]
    for (const pagesTreeSourceRecord of pagesTreeSource) {
      const layoutRecord = pointsCollection.find((l) => l.type === 'layout' && l.name === pagesTreeSourceRecord.layout)
      const pagesRecords = pointsCollection.filter(
        (p) => p.type === 'page' && pagesTreeSourceRecord.pages.includes(p.name),
      )
      const pageNamesDeep = getNestedPageNames(pagesTreeSourceRecord)
      const pagesRecordsDeep = pointsCollection.filter((p) => p.type === 'page' && pageNamesDeep.includes(p.name))
      const pagesRoutesRegexStrings = pagesRecordsDeep.map((p) => {
        const route = p.route as AnyRoute
        return `(?:${route.regexBaseString})`
      })
      const pagesRoutesRegex = new RegExp(`^(?:${pagesRoutesRegexStrings.join('|')})$`)
      const pagesTreeRecord: PagesTreeRecord = {
        Layout: layoutRecord?.FC as React.ComponentType<{ children: React.ReactNode }> | undefined,
        layoutName: layoutRecord?.name,
        layoutPoint: layoutRecord?.point as LayoutPoint | (() => Promise<LayoutPoint>) | undefined,
        pagesRoutesRegex,
        pages: pagesRecords.map((p) => ({
          Page: p.FC as React.ComponentType | React.LazyExoticComponent<React.ComponentType>,
          pageName: p.name,
          pageRoute: p.route as AnyRoute,
          pagePoint: p.point as PagePoint | (() => Promise<PagePoint>),
        })),
        nested: !pagesTreeSourceRecord.nested
          ? undefined
          : ClientPoints.toPagesTree({
              pagesTreeSource: pagesTreeSourceRecord.nested,
              points,
            }),
      }
      pagesTree.push(pagesTreeRecord)
    }
    return pagesTree
  }

  // prefetching

  // private static readonly prefetchLazyComponent = async (
  //   component: React.ComponentType<any> | React.LazyExoticComponent<React.ComponentType<any>> | undefined,
  // ): Promise<void> => {
  //   const anyComp = component as any
  //   if (!anyComp) return
  //   try {
  //     // React 18 lazy internals
  //     if (anyComp?._init && anyComp?._payload) {
  //       await anyComp._init(anyComp._payload)
  //       return
  //     }
  //     // Some libraries expose preload()
  //     if (typeof anyComp?.preload === 'function') {
  //       await anyComp.preload()
  //       return
  //     }
  //     // Fallback: sometimes the payload carries a thunk
  //     if (anyComp?._payload && typeof anyComp._payload._result === 'function') {
  //       await anyComp._payload._result()
  //     }
  //   } catch {
  //     // ignore — prefetch is best-effort
  //   }
  // }

  readonly getPage = ({
    location,
  }: {
    location: AnyLocation
  }):
    | {
        point: ReadyPoint | (() => Promise<ReadyPoint>)
        name: PointName
        type: PointType
        FC: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
        pageLocation: ExactLocation
        layouts: string[]
      }
    | undefined => {
    for (const record of this.manager.collection) {
      if (record.type === 'page' && record.route && record.FC && record.layouts) {
        if (record.route.isExact(location.pathname)) {
          const relation = record.route.getRelation(location)
          const pageLocation = Object.assign(
            { ...location },
            {
              route: record.route.definition,
              params: relation.params,
            },
          )
          const pointOriginal = record.point
          const pointOrLoader =
            typeof pointOriginal === 'function' ? async () => (await pointOriginal()).point : pointOriginal.point
          return {
            point: pointOrLoader,
            name: record.name,
            type: record.type,
            pageLocation,
            FC: record.FC,
            layouts: record.layouts,
          }
        }
      }
    }
    return undefined
  }

  private readonly _loadPage = async (
    options:
      | {
          location: AnyLocation
        }
      | { suitable: NonNullable<ReturnType<ClientPoints<TError>['getPage']>> },
  ): Promise<
    | {
        page: PagePoint
        layouts: LayoutPoint[]
      }
    | undefined
  > => {
    const suitable = 'suitable' in options ? options.suitable : this.getPage({ location: options.location })
    if (!suitable) {
      return undefined
    }
    const page: ReadyPoint = typeof suitable.point === 'function' ? await suitable.point() : suitable.point

    // Prefetch the (possibly lazy) page component
    // But if we fetch page, then we also fetch it components, so looks like not needed
    // await ClientPoints.prefetchLazyComponent(suitable.FC)

    this.manager.setReadyPoint(page)

    return {
      page: page as PagePoint,
      layouts: page._layouts as LayoutPoint[],
    }
  }

  readonly loadPage = async (
    options:
      | {
          location: AnyLocation
        }
      | { suitable: NonNullable<ReturnType<ClientPoints<TError>['getPage']>> },
  ): Promise<
    | {
        page: PagePoint
        layouts: LayoutPoint[]
        pageLocation: ExactLocation
      }
    | undefined
  > => {
    const suitable = 'suitable' in options ? options.suitable : this.getPage({ location: options.location })
    if (!suitable) {
      return undefined
    }
    const loadPagePromises = _ss.__POINT0_LOAD_PAGE_COMPONENT_PROMISES__.getWeak()
    const hash = suitable.name
    const exPromise = loadPagePromises?.get(hash)
    if (exPromise) {
      const result = await exPromise
      if (!result) {
        return undefined
      }
      return { ...result, pageLocation: suitable.pageLocation }
    }
    const newPromise = this._loadPage({ suitable })
    loadPagePromises?.set(hash, newPromise)
    const result = await newPromise
    loadPagePromises?.delete(hash)
    if (!result) {
      return undefined
    }
    return { ...result, pageLocation: suitable.pageLocation }
  }

  prefetchPage = async ({
    location,
    queryClient,
    policy,
    trigger,
    fetchOptions,
    pageDehydratedStateQueryOptions,
  }: {
    location: AnyLocation
    queryClient?: QueryClient
    policy?: PrefetchPagePolicy
    trigger?: 'navigate' | 'linkHover'
    fetchOptions?: FetchOptions
    pageDehydratedStateQueryOptions?: ExtraUseQueryOptions
  }): Promise<PagePoint | undefined> => {
    // TODO: somehow do this requests in parallel
    // problem here, that we should know search params keys to generate correct queryKey
    // it can be solved by adding to client points definition array of search params
    // but we now can not detect search params keys by static analysis, only runtime
    const loadPageResult = await this.loadPage({ location })
    if (!loadPageResult) {
      return undefined
    }
    const { page } = loadPageResult
    await page.prefetchPage(page._getUnsafeInputRawByLocation(loadPageResult.pageLocation), {
      queryClient,
      policy,
      trigger,
      fetchOptions,
      pageDehydratedStateQueryOptions,
    })
    return page
  }

  _getPageByHref = (
    href: string,
  ):
    | { point: ReadyPointsCollectionRecord | NormalizedLazyPointsCollectionRecord; location: ExactLocation }
    | undefined => {
    const hrefNonRel =
      isAbsoluteUrl(href) || href.startsWith('/')
        ? href
        : typeof window !== 'undefined'
          ? window.location.pathname.split('/').slice(0, -1).join('/') + '/' + href
          : href
    const location = this.routes._.getLocation(hrefNonRel)
    if (!location.route) {
      return undefined
    }
    const point = this.manager.collection.find((p) => p.type === 'page' && p.route?.definition === location.route)
    if (!point) {
      return undefined
    }
    return { point, location }
  }

  static isPageLocationSuitable = ({
    basePath,
    pageLocation,
  }: {
    basePath: AnyRoute | undefined
    pageLocation: AnyLocation
  }): boolean => {
    if (basePath) {
      return basePath.isExactOrAncestor(pageLocation.pathname)
    }
    return true
  }
  isPageLocationSuitable = ({ pageLocation }: { pageLocation: AnyLocation }): boolean => {
    return ClientPoints.isPageLocationSuitable({
      basePath: this.basePath,
      pageLocation,
    })
  }

  static mount<TError extends ErrorPoint0>(
    points: PointsDefinition<any, TError> | PointsManager<any, any, TError>,
    options: { log?: LogFn } = {},
  ): ClientPoints<TError> {
    const clientPoints = ClientPoints.createFromDefintion(points, options)
    clientPoints.mount()
    return clientPoints
  }

  mount = () => {
    if (_point0_env.side.is.server) {
      throw new Error('Client points can not be mounted on server')
    }
    _ss.__POINT0_CLIENT_POINTS__.set(this as unknown as ClientPoints<ErrorPoint0>)
    const fromRoot = this.manager.root._getLogFn()
    _ssClientLog.set(fromRoot ?? this.manager.log ?? _defaultLogFn)
  }
}

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
  pagesRoutesRegex: RegExp
  pages: Array<{
    pageName: PointName
    pageRoute: AnyRoute
    pagePoint: PagePoint | (() => Promise<PagePoint>)
    Page: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
  }>
  nested: undefined | PagesTreeRecord[]
}
export type PagesTree = PagesTreeRecord[]
export type ClientPointsLayouts = Record<
  string,
  | React.ComponentType<{ children: React.ReactNode }>
  | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
>

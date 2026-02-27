import { Route0, Routes } from '@devp0nt/route0'
import type { AnyLocation, AnyRoute, ExactLocation, RoutesPretty } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import type { ErrorPoint0 } from './index.js'
import { _point0_env, appendSlash } from './index.js'
import { _getFakeClient, _ssItems } from './internals.js'
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
  LayoutPoint,
  MiddlewareFn,
  PagePoint,
  PointName,
  PointType,
  PrefetchPagePolicy,
  ReadyPoint,
  ReadyPointType,
} from './types.js'

export class ClientPoints<TError extends ErrorPoint0 = ErrorPoint0> {
  manager: PointsManager

  basepath: string
  ssr: boolean
  middlewares: MiddlewareFn<TError>[]
  transformer: DataTransformerExtended

  routes: RoutesPretty
  routesHash: string
  pagesTreeSource: PagesTreeSource
  pagesTree: PagesTree

  private constructor({
    manager,
    routes,
    routesHash,
    pagesTreeSource,
    pagesTree,
    basepath,
    ssr,
    middlewares,
    transformer,
  }: {
    manager: PointsManager
    routes: RoutesPretty
    routesHash: string
    pagesTreeSource: PagesTreeSource
    pagesTree: PagesTree
    basepath: string
    ssr: boolean
    middlewares: MiddlewareFn<TError>[]
    transformer: DataTransformerExtended
  }) {
    this.manager = manager
    this.routes = routes
    this.routesHash = routesHash
    this.pagesTreeSource = pagesTreeSource
    this.pagesTree = pagesTree
    this.basepath = basepath
    this.ssr = ssr
    this.middlewares = middlewares
    this.transformer = transformer
  }

  static createFromDefintion<TError extends ErrorPoint0>(
    points: PointsDefinition | PointsManager,
  ): ClientPoints<TError> {
    const manager = PointsManager.createFromDefinition(points)
    // const manager = PointsManager.createFromCollection(_manager.collection.filter((p) => ['root', 'page', 'layout', 'provider', 'init'].))
    // I was tried to filter not needed points, but for what? In real client we already filter it on generate pahes, on server does not matter if there more points then needed
    const roots = manager.getRoots()
    const root = roots.at(0)
    if (!root) {
      throw new Error('No root points found')
    }
    if (roots.length > 1) {
      throw new Error('Multiple root points not allowed for client points')
    }

    const routes = ClientPoints.toRoutes({ points: manager.collection })
    manager.collection = ClientPoints.sortCollection({ points: manager.collection, routes })
    const pagesTreeSource = ClientPoints.toPagesTreeSource({ points: manager.collection })
    const pagesTree = ClientPoints.toPagesTree({ points: manager.collection, pagesTreeSource })
    const routesHash = routes._.pathsOrdering.join(',')

    const basepath = root._basepath ?? '/'
    const ssr = root._ssr
    const middlewares = root._middlewares
    const transformer = root._getTransformer()

    return new ClientPoints<any>({
      manager,
      routes,
      routesHash,
      pagesTreeSource,
      pagesTree,
      basepath,
      ssr,
      middlewares,
      transformer,
    })
  }

  static async createFromSource<TError extends ErrorPoint0>(
    source: PointsDefinitionSource,
  ): Promise<ClientPoints<TError>> {
    const manager = await PointsManager.createFromSource(source)
    return ClientPoints.createFromDefintion(manager)
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

  static sortCollection<T extends Array<{ type: PointType; name: PointName; route?: AnyRoute | undefined }>>({
    routes,
    points,
  }: {
    routes?: RoutesPretty
    points: T
  }): T {
    routes ??= ClientPoints.toRoutes({ points })
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

  private readonly getPage = ({
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
    for (const { type, name, route, point, FC, layouts } of this.manager.collection) {
      if (type === 'page' && route && FC && layouts) {
        const match = route.getLocation(location)
        if (match.exact) {
          return {
            point: (typeof point === 'function' ? async () => (await point()).point : point.point) as ReadyPoint,
            name,
            type,
            pageLocation: match,
            FC,
            layouts,
          }
        }
      }
    }
    return undefined
  }

  static _loadPagePromises = new Map<
    string,
    Promise<
      | {
          page: PagePoint
          layouts: LayoutPoint[]
          pageLocation: ExactLocation
        }
      | undefined
    >
  >()

  readonly loadPage = async ({
    location,
  }: {
    location: AnyLocation
  }): Promise<
    | {
        page: PagePoint
        layouts: LayoutPoint[]
        pageLocation: ExactLocation
      }
    | undefined
  > => {
    const locationString = JSON.stringify(location)
    const exPromise = ClientPoints._loadPagePromises.get(locationString)
    if (exPromise) {
      return await exPromise
    }
    const promise = (async () => {
      const suitable = this.getPage({ location })
      if (!suitable) {
        return undefined
      }
      const page: ReadyPoint = typeof suitable.point === 'function' ? await suitable.point() : suitable.point

      // Prefetch the (possibly lazy) page component
      await ClientPoints.prefetchLazyComponent(suitable.FC)

      const layouts: ReadyPoint[] = await Promise.all(
        this.manager.collection
          .filter((p) => p.type === 'layout' && suitable.layouts.includes(p.name))
          .map(async (layout) => {
            await ClientPoints.prefetchLazyComponent(layout.FC)
            return typeof layout.point === 'function' ? (await layout.point()).point : layout.point.point
          }),
      )

      // TODO: ? maybe we should replace in pagesTree and points this page and layouts points, becouse it is loaded now

      return {
        page: page as PagePoint,
        layouts: layouts as LayoutPoint[],
        pageLocation: suitable.pageLocation,
      }
    })()
    ClientPoints._loadPagePromises.set(locationString, promise)
    try {
      const result = await promise
      ClientPoints._loadPagePromises.delete(locationString)
      return result
    } catch (error) {
      ClientPoints._loadPagePromises.delete(locationString)
      throw error
    }
  }

  static _pagesPrefetchingPromises = new Map<string, Promise<PagePoint | undefined>>()

  prefetchPage = async ({
    location,
    queryClient,
    policy: providedPolicy,
    trigger,
  }: {
    location: AnyLocation
    queryClient?: QueryClient
    policy?: PrefetchPagePolicy
    trigger?: 'navigate' | 'linkHover'
  }): Promise<PagePoint | undefined> => {
    const loadPageResult = await this.loadPage({ location })
    if (!loadPageResult) {
      return undefined
    }

    const { page } = loadPageResult
    const policy = page._getPrefetchPagePolicy(trigger, providedPolicy)

    const locationAndPolicyString = JSON.stringify({ location, policy })
    const exPromise = ClientPoints._pagesPrefetchingPromises.get(locationAndPolicyString)
    if (exPromise) {
      return await exPromise
    }
    const promise = (async () => {
      await page.prefetchPage(page._getUnsafeInputRawByLocation(location), {
        queryClient,
        location,
        policy,
        trigger,
      })
      return page
    })()
    ClientPoints._pagesPrefetchingPromises.set(locationAndPolicyString, promise)
    try {
      const result = await promise
      ClientPoints._pagesPrefetchingPromises.delete(locationAndPolicyString)
      return result
    } catch (error) {
      ClientPoints._pagesPrefetchingPromises.delete(locationAndPolicyString)
      throw error
    }
  }

  _getPageByHref = (
    href: string,
  ):
    | { point: ReadyPointsCollectionRecord | NormalizedLazyPointsCollectionRecord; location: ExactLocation }
    | undefined => {
    const location = this.routes._.getLocation(href)
    if (!location.exact || !location.route) {
      return undefined
    }
    const point = this.manager.collection.find((p) => p.type === 'page' && p.route?.definition === location.route)
    if (!point) {
      return undefined
    }
    return { point, location }
  }

  static isPageLocationSuitable = ({
    basepath,
    pageLocation,
  }: {
    basepath: string | null
    pageLocation: AnyLocation
  }): boolean => {
    if (basepath) {
      if (pageLocation.pathname === basepath) {
        return true
      }
      if (pageLocation.pathname.startsWith(appendSlash(basepath))) {
        return true
      }
      return false
    }
    return true
  }
  isPageLocationSuitable = ({ pageLocation }: { pageLocation: AnyLocation }): boolean => {
    return ClientPoints.isPageLocationSuitable({
      basepath: this.basepath,
      pageLocation,
    })
  }

  mount = () => {
    if (_point0_env.side.is.server) {
      throw new Error('Client points can not be mounted on server')
    }
    _ssItems.__POINT0_CLIENT_POINTS__.set(this as unknown as ClientPoints<ErrorPoint0>)
  }

  static getInstance = <TError extends ErrorPoint0>(): ClientPoints<TError> => {
    // all this needed only for router, to know which routes and pages exists in current scope
    // we can not here use env.scope, because for server it can be 'root' while for client it can be 'site' for example
    // and this code will be executed on server
    const fakeClient = _getFakeClient()
    const clientPoints = fakeClient ? fakeClient.points : _ssItems.__POINT0_CLIENT_POINTS__.getWeak()
    if (!clientPoints) {
      if (_point0_env.side.is.server) {
        throw new Error(
          'Client points not found if SuperStore. Looks like you call this fn outside of client context. You should call it only in components, hooks, functions, not in top of files without wrappers',
        )
      } else {
        throw new Error(
          'Client points instance not found. You should call clientPoints.mount() first to mount it on client',
        )
      }
    }
    return clientPoints as unknown as ClientPoints<TError>
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
  pages: Array<{
    pageName: PointName
    pageRoute: AnyRoute
    pagePoint: PagePoint | (() => Promise<PagePoint>)

    Page: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
  }>
  nested: undefined | PagesTreeRecord[]
}
export type PagesTree = PagesTreeRecord[]

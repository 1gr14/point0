import { Error0 } from '@devp0nt/error0'
import { Route0 } from '@devp0nt/route0'
import type { DehydratedState } from '@tanstack/react-query'
import { dehydrate, hashKey, QueryClient } from '@tanstack/react-query'
import { lazy } from 'react'
import type { ResolvableHead } from 'unhead/types'
import type {
  AnyPoint,
  RootConnectionPoint,
  RootId,
  RootPoint,
  RootSourcePoint,
  Ctx,
  Data,
  EmptyCtx,
  EmptyData,
  EndPoint,
  EndPointType,
  ExtendFnRecord,
  Input,
  LayoutPoint,
  Method,
  PagePoint,
  QueryKey,
  RequiredCtx,
  UndefinedCtx,
} from '../core/index.js'
import { emptyDehydratedState } from '../core/utils.js'

// TODO: when find suitable allow porvide "rootId", then it will find only inside that
// so remove force
export class Eversion0<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  root: RootPoint<TRequiredCtx>
  source: Eversion0<TRequiredCtx> | undefined
  points: LoadedPointsCollection
  connections: Array<Eversion0<TRequiredCtx>>

  private constructor({
    root,
    source,
    points,
    connections,
  }: {
    root: RootPoint
    source?: Eversion0<TRequiredCtx> | undefined
    points?: LoadedPointsCollection
    connections?: Array<Eversion0<TRequiredCtx>>
  }) {
    this.root = root as RootPoint<TRequiredCtx>
    this.points = points ?? []
    this.connections = connections ?? []
    this.source = source
  }

  static async create<TRootPoint extends RootPoint>({
    root,
    points,
  }: {
    root: TRootPoint
    points?: PointsCollectionRecord[]
  }): Promise<Eversion0<TRootPoint['Infer']['RequiredCtx']>> {
    return new Eversion0<TRootPoint['Infer']['RequiredCtx']>({
      root,
      points: await Eversion0.toLoadedPointsCollection(points),
    })
  }

  static async toLoadedPointsCollection(points?: PointsCollection): Promise<LoadedPointsCollection> {
    return await Promise.all(
      points?.map(async (record) => {
        const pointPromise = typeof record.point === 'function' ? record.point() : record.point
        const [point] = await Promise.all([pointPromise])
        return {
          point,
          route: Route0.create(record.route),
          type: record.type,
          layoutPagesRoutes: record.layoutPagesRoutes ?? [],
        }
      }) ?? [],
    )
  }

  async connect({ root, points }: { root: RootPoint; points?: PointsCollection }): Promise<Eversion0<TRequiredCtx>> {
    const connection = new Eversion0<TRequiredCtx>({
      root,
      points: await Eversion0.toLoadedPointsCollection(points),
      source: this,
    })
    this.connections.push(connection)
    return connection
  }

  // Best-effort prefetch for React.lazy components (safe if not lazy)
  private static async _prefetchLazyComponent(
    component: React.ComponentType<any> | React.LazyExoticComponent<React.ComponentType<any>> | undefined,
  ): Promise<void> {
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

  static getSuitablePagePoint = async ({
    pagesTree,
    location,
  }: {
    pagesTree: PagesTree
    location: Route0.Location
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
        const match = Route0.getMatch(p.route, location)
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
    await Eversion0._prefetchLazyComponent(found.page.pageComponent)

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
        await Eversion0._prefetchLazyComponent(n.layoutComponent)
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

  static prefetchSuitablePagePoint = async ({
    pagesTree,
    location,
    queryClient, // kept for signature parity if you need it later
  }: {
    pagesTree: PagesTree
    location: Route0.Location
    queryClient: QueryClient
  }): Promise<PagePoint | undefined> => {
    const result = await Eversion0.getSuitablePagePoint({ pagesTree, location })
    console.log('result', !!result)
    if (!result) {
      return undefined
    }

    const points = [result.pagePoint, ...result.layouts.map((l) => l.layoutPoint)]
    await Promise.all(
      points.map(async (p) => {
        // TODO: if page or layout has not SELF loaders but only nested loaders, then prefetch only nested and to query cache add its result
        await Eversion0.prefetchPoint({ point: p, queryClient, location })
      }),
    )

    return result.pagePoint
  }

  static prefetchPoint = async ({
    point,
    queryClient,
    location,
  }: {
    point: AnyPoint
    queryClient: QueryClient
    location: Route0.Location
  }): Promise<void> => {
    console.log(123)
    if (!point._hasLoader()) {
      return
    }
    console.log(234)
    const queryOptions = point.getQueryOptions({ ...location.query, ...location.params })
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryOptions.queryKey as QueryKey })
    if (query) {
      return
    }
    console.log(456)
    await queryClient.prefetchQuery(queryOptions as never)
  }

  static toPagesAndLayoutsCollection = ({
    points,
  }: {
    points: PointsCollection | LoadedPointsCollection
  }): PagesAndLayoutsCollection => {
    const collection: PagesAndLayoutsCollection = {
      pages: [],
      layouts: [],
    }
    for (const record of points) {
      if (record.type !== 'layout') {
        continue
      }
      const point = record.point
      collection.layouts.push({
        type: 'layout',
        route: typeof record.route === 'string' ? Route0.create(record.route) : record.route,
        point: point as LayoutPoint | (() => Promise<LayoutPoint>),
        layoutComponent:
          typeof point === 'function'
            ? lazy(async () => ({
                default: (await point())._Layout,
              }))
            : point._Layout,
        layoutPagesRoutes: record.layoutPagesRoutes?.map((route) => Route0.create(route)) ?? [],
      })
    }
    for (const record of points) {
      if (record.type !== 'page') {
        continue
      }
      const point = record.point
      collection.pages.push({
        type: 'page',
        route: typeof record.route === 'string' ? Route0.create(record.route) : record.route,
        point: point as PagePoint | (() => Promise<PagePoint>),
        pageComponent:
          typeof point === 'function'
            ? lazy(async () => ({
                default: (await point())._Page,
              }))
            : point._Page,
        layoutComponents: collection.layouts
          // .filter((l) => record.layoutPagesRoutes?.includes(l.route.getDefinition()))
          .filter((l) =>
            l.layoutPagesRoutes.some(
              (lpr) =>
                lpr.getDefinition() ===
                (typeof record.route === 'string' ? Route0.create(record.route) : record.route).getDefinition(),
            ),
          )
          .map((l) => l.layoutComponent),
      })
    }
    return collection
  }

  static toPagesTreeFromPagesAndLayouts = ({
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
        layoutComponent: layout.layoutComponent,
        layoutPoint: layout.point,
        pages: layoutPagesWhereThisLayoutIndexEqLevelAndIsLast.map((lp) => ({
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
      pages: pagesWithoutLayouts.map((p) => ({
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

  static toPagesTree = ({ points }: { points: PointsCollection | LoadedPointsCollection }): PagesTree => {
    const pagesAndLayouts = Eversion0.toPagesAndLayoutsCollection({ points })
    return Eversion0.toPagesTreeFromPagesAndLayouts({ pagesAndLayouts })
  }

  static toLoadedPagesTree = async ({ points }: { points: PointsCollection }): Promise<PagesTree> => {
    const loadedPoints = await Eversion0.toLoadedPointsCollection(points)
    return Eversion0.toPagesTree({ points: loadedPoints })
  }
  static toRoutesCollection = ({ pagesTree }: { pagesTree: PagesTree }): RoutesCollection => {
    const routes: RoutesCollection = {}
    const traverse = (node: PagesTreeRecord): void => {
      // Add all page routes
      for (const page of node.pages) {
        routes[page.route.getDefinition()] = page.route
      }
      // Recurse into nested layout trees
      for (const child of node.nestedPagesTree) {
        traverse(child)
      }
    }
    for (const root of pagesTree) {
      traverse(root)
    }
    return routes
  }

  static toLoggablePagesTree = (pagesTree: PagesTree): object => {
    return pagesTree.map((node) => {
      return {
        route: node.route.getDefinition(),
        layoutComponent: !!node.layoutComponent,
        pages: node.pages.map((p) => p.route.getDefinition()),
        nestedPagesTree: Eversion0.toLoggablePagesTree(node.nestedPagesTree),
      }
    })
  }

  static getRouteMatch = (
    routes: RoutesCollection,
    location: Route0.Location,
  ): { route: Route0.AnyRoute; location: Route0.Location } | undefined => {
    for (const route of Object.values(routes)) {
      const match = Route0.getMatch(route, location)
      if (match.exact) {
        return {
          route,
          location: match.location,
        }
      }
    }
    return undefined
  }

  getParents(): [RootSourcePoint, ...RootConnectionPoint[]] | [] {
    const sources: Array<RootSourcePoint | RootConnectionPoint> = []
    let current: Eversion0<TRequiredCtx> | undefined = this.source
    while (current) {
      sources.push(current.root)
      current = current.source
    }
    return sources.reverse() as [RootSourcePoint, ...RootConnectionPoint[]] | []
  }

  normalizeLocation(input: LocationInput): Route0.Location {
    const location =
      'location' in input ? input.location : 'pathname' in input ? Route0.getLocation(input.pathname) : undefined
    if (location) {
      return location
    }
    const id = 'id' in input ? input.id : undefined
    if (id) {
      return Route0.getLocation(`/endpoints/${id}`)
    }
    throw new Error('location or path or id is required')
  }

  _getSuitableSelfPoint({
    method: providedMethod,
    rootId,
    ...locationProps
  }: {
    method: Method
    rootId?: RootId
  } & LocationInput):
    | {
        point: EndPoint
        location: Route0.Location
        eversion: Eversion0<TRequiredCtx>
      }
    | undefined {
    if (rootId && this.root._rootId !== rootId) {
      return undefined
    }
    const location = this.normalizeLocation(locationProps)
    for (const { route, point } of this.points) {
      if (!point._method || providedMethod.toLowerCase() !== point._method.toLowerCase()) {
        continue
      }
      const match = Route0.getMatch(route, location)
      if (!match.exact) {
        continue
      }
      return {
        point,
        location: match.location,
        eversion: this,
      }
    }
    return undefined
  }
  getSuitablePoint({
    method: providedMethod,
    rootId,
    ...locationProps
  }: {
    method: Method
    rootId?: RootId
  } & LocationInput): GetSuitablePointResult<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const suitableSelfPoint = this._getSuitableSelfPoint({ method: providedMethod, location, rootId })
    if (suitableSelfPoint) {
      return suitableSelfPoint
    }
    const suitableConnectionPoint = (() => {
      for (const connection of this.connections) {
        const result = connection.getSuitablePoint({ method: providedMethod, location, rootId })
        if (result) {
          return result
        }
      }
      return undefined
    })()
    if (suitableConnectionPoint) {
      return suitableConnectionPoint
    }
    return undefined
  }

  _getSuitableSelfEversionByLocation({
    method: providedMethod,
    rootId,
    ...locationProps
  }: {
    method: Method
    rootId?: RootId | undefined
  } & LocationInput): Eversion0<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const route = this.root._route
    if (!route) {
      return undefined
    }
    const match = Route0.getMatch(route, location)
    if (match.parent || match.exact) {
      return this
    }
    return undefined
  }
  _getSuitableEversionByLocation({
    method: providedMethod,
    rootId,
    ...locationProps
  }: {
    method: Method
    rootId?: RootId | undefined
  } & LocationInput): Eversion0<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const suitableSelfEversion = this._getSuitableSelfEversionByLocation({ method: providedMethod, location, rootId })
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableConnectionEversion = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitableEversionByLocation({ method: providedMethod, location, rootId })
        if (result) {
          return result
        }
      }
      return undefined
    })()
    if (suitableConnectionEversion) {
      return suitableConnectionEversion
    }
    return undefined
  }
  _getSuitableEversionByRootId({ rootId }: { rootId: RootId | undefined }): Eversion0<TRequiredCtx> | undefined {
    const suitableSelfEversion = this.root._rootId === rootId ? this : undefined
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableConnectionEversion = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitableEversionByRootId({ rootId })
        if (result) {
          return result
        }
      }
      return undefined
    })()
    if (suitableConnectionEversion) {
      return suitableConnectionEversion
    }
    return undefined
  }
  getSuitableEversionByLocation({
    method: providedMethod,
    rootId,
    fallbackRootId,
    ...locationProps
  }: {
    method: Method
    rootId?: RootId | undefined
    fallbackRootId: RootId | undefined
  } & LocationInput): Eversion0<TRequiredCtx> {
    const location = this.normalizeLocation(locationProps)
    const suitableEversionByLoaction = this._getSuitableEversionByLocation({ method: providedMethod, location, rootId })
    if (suitableEversionByLoaction) {
      return suitableEversionByLoaction
    }
    const suitableEversionByRootId = this._getSuitableEversionByRootId({ rootId })
    if (suitableEversionByRootId) {
      return suitableEversionByRootId
    }
    const suitableEversionByFallbackRootId = this._getSuitableEversionByRootId({ rootId: fallbackRootId })
    if (suitableEversionByFallbackRootId) {
      return suitableEversionByFallbackRootId
    }
    throw new Error(
      `No suitable eversion found for method "${providedMethod}" at location "${location.pathname}" and root id "${rootId}" and fallback root id "${fallbackRootId}"`,
    )
  }

  getSuitable({
    method: providedMethod,
    rootId,
    fallbackRootId,
    ...locationProps
  }: {
    method: Method
    rootId?: RootId
    fallbackRootId: RootId
  } & LocationInput): GetSuitableResult<TRequiredCtx> {
    const location = this.normalizeLocation(locationProps)
    const suitablePoint = this.getSuitablePoint({ method: providedMethod, location, rootId })
    if (suitablePoint) {
      return suitablePoint
    }
    // TODO: allow find just by id
    const suitableEversion = this.getSuitableEversionByLocation({
      method: providedMethod,
      location,
      rootId,
      fallbackRootId,
    })
    return { point: undefined, location, eversion: suitableEversion }
  }

  async extract({
    point,
    input = {},
    requiredCtx,
    extendFnsWithOutput = [],
    queryClient,
    skipDehydration = false,
    ...locationProps
  }: WithRequiredCtx<TRequiredCtx> & {
    point?: AnyPoint | undefined
    input?: Input
    extendFnsWithOutput?: ExtendFnWithOutput[]
    queryClient?: QueryClient
    skipDehydration?: boolean
  } & LocationInput): Promise<ExtractResult> {
    queryClient ??= new QueryClient()
    const location = this.normalizeLocation(locationProps)

    if (point?._pointType === 'page') {
      for (const layout of point._layouts) {
        if (!layout._hasLoader()) {
          continue
        }
        const layoutRoute = layout._getRoute()
        const layoutRoutePath = layoutRoute.get({ ...location.params, query: { ...location.query } } as never)
        const layoutLocation = layoutRoute.match(layoutRoutePath).location
        const result = await this.extract({
          point: layout,
          input,
          requiredCtx,
          extendFnsWithOutput,
          queryClient,
          location: layoutLocation,
          skipDehydration: true,
        })
        extendFnsWithOutput = result.extendFnsWithOutput
      }
    }

    const { parsedInput, inputError } = (() => {
      if (point?._inputSchema) {
        const parseResult = point._inputSchema.safeParse(input)
        if (parseResult.success) {
          return { parsedInput: parseResult.data, inputError: undefined }
        }
        return { parsedInput: input, inputError: parseResult.error }
      }
      return { parsedInput: input, inputError: undefined }
    })()
    if (inputError) {
      return {
        ctx: requiredCtx ?? {},
        data: {},
        head: [],
        location,
        point,
        error: inputError,
        status: 422,
        root: this.root,
        eversion: this,
        queryClient,
        extendFnsWithOutput,
        dehydratedState: skipDehydration ? emptyDehydratedState : this.getQueryClientDehydratedState({ queryClient }),
        response: undefined,
      }
    }

    let ctxOutput: Ctx = requiredCtx ?? {}
    let dataOutput: Data = {}
    const headOutput: ResolvableHead[] = []
    const extendFns = [
      ...this.getParents().flatMap((source) => source._extendFns),
      ...this.root._extendFns,
      ...(point?._extendFns ?? []),
    ]
    const heads = [
      ...this.getParents().flatMap((source) => source._heads),
      ...this.root._heads,
      ...(point?._heads ?? []),
    ]
    // TODO: get status from real point data

    try {
      for (const extendFn of extendFns) {
        switch (extendFn.type) {
          case 'ctx': {
            const ex = extendFnsWithOutput.find(
              (e) => e.record.unstableId === extendFn.unstableId && e.record.type === 'ctx',
            )
            if (ex) {
              ctxOutput = { ...ex.output }
            } else {
              ctxOutput = await extendFn.fn({
                ctx: { ...ctxOutput },
                data: { ...dataOutput },
                location,
                input: parsedInput,
              })
              extendFnsWithOutput.push({
                output: ctxOutput,
                record: extendFn,
              })
            }
            break
          }
          case 'loader': {
            const ex = extendFnsWithOutput.find(
              (e) => e.record.unstableId === extendFn.unstableId && e.record.type === 'loader',
            )
            if (ex) {
              dataOutput = { ...ex.output }
            } else {
              dataOutput = await extendFn.fn({
                ctx: { ...ctxOutput },
                data: { ...dataOutput },
                location,
                input: parsedInput,
              })
              extendFnsWithOutput.push({
                output: dataOutput,
                record: extendFn,
              })
            }
            break
          }
          // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
          default:
            throw new Error(`Unknown extend function type: ${(extendFn as any).type}`)
        }
      }
      for (const head of heads) {
        headOutput.push(typeof head === 'function' ? head({ data: { ...dataOutput }, location }) : head)
      }
      const response = await (async () => {
        if (point?._pointType === 'response') {
          if (!point._responseFn) {
            throw new Error('Response function not found')
          }
          return await point._responseFn({ ctx: ctxOutput, data: dataOutput, location, input: parsedInput })
        }
        return undefined
      })()
      if (point) {
        this.appendQueryClientCache({ data: dataOutput, location, point, error: undefined, queryClient })
        const dehydratedState = skipDehydration
          ? emptyDehydratedState
          : this.getQueryClientDehydratedState({ queryClient })
        return {
          ctx: ctxOutput,
          data: dataOutput,
          head: headOutput,
          location,
          point,
          error: undefined,
          status: 200,
          root: this.root,
          eversion: this,
          response,
          extendFnsWithOutput,
          queryClient,
          dehydratedState,
        }
      } else {
        const error = new Error0(`Point Not Found: ${location.pathname}`)
        this.appendQueryClientCache({ data: dataOutput, location, point, error, queryClient })
        return {
          ctx: ctxOutput,
          data: dataOutput,
          head: headOutput,
          location,
          point,
          error,
          status: 404,
          response: undefined,
          root: this.root,
          eversion: this,
          extendFnsWithOutput,
          queryClient,
          dehydratedState: skipDehydration ? emptyDehydratedState : this.getQueryClientDehydratedState({ queryClient }),
        }
      }
    } catch (error) {
      this.appendQueryClientCache({ data: dataOutput, location, point, error, queryClient })
      return {
        ctx: ctxOutput,
        data: dataOutput,
        head: headOutput,
        location,
        point,
        error,
        status: 500,
        root: this.root,
        eversion: this,
        response: undefined,
        extendFnsWithOutput,
        queryClient,
        dehydratedState: skipDehydration ? emptyDehydratedState : this.getQueryClientDehydratedState({ queryClient }),
      }
    }
  }

  async extractSuitable({
    method: providedMethod,
    requiredCtx,
    rootId,
    fallbackRootId,
    input,
    ...locationProps
  }: WithRequiredCtx<TRequiredCtx> & {
    method: Method
    rootId?: RootId | undefined
    fallbackRootId: RootId
    point?: AnyPoint | undefined
    input?: Input
  } & LocationInput): Promise<ExtractResult> {
    const location = this.normalizeLocation(locationProps)
    const suitable = this.getSuitable({ method: providedMethod, location, rootId, fallbackRootId })
    return await suitable.eversion.extract({
      point: suitable.point,
      requiredCtx,
      location: suitable.location,
      input,
    } as never)
  }

  appendQueryClientCache({
    data,
    location,
    error,
    point,
    queryClient,
  }: {
    data: Data
    location: Route0.Location
    error: unknown
    point: AnyPoint | undefined
    queryClient: QueryClient
  }): void {
    if (
      point &&
      (point._pointType === 'query' ||
        point._pointType === 'page' ||
        point._pointType === 'layout' ||
        point._pointType === 'component')
    ) {
      const queryKey: QueryKey = point.getQueryKey({ ...location.query, ...location.params })
      const query = queryClient.getQueryCache().build(queryClient, { queryKey, queryHash: hashKey(queryKey) })
      if (error) {
        query.setState({
          data: undefined,
          error: { ...Error0.toJSON(error), name: 'Error0' },
          status: 'error',
          fetchStatus: 'idle',
        })
      } else {
        const query = queryClient.getQueryCache().build(queryClient, { queryKey, queryHash: hashKey(queryKey) })
        query.setState({
          data,
          error: null,
          status: 'success',
          fetchStatus: 'idle',
        })
      }
    }
  }

  getQueryClientDehydratedState({ queryClient }: { queryClient: QueryClient }): DehydratedState {
    const dehydratedState = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => {
        // This will include all queries, including failed ones
        return true
      },
    })
    return dehydratedState
  }
}

export type CreateEversionInput<TRequiredCtx extends RequiredCtx> = {
  root: RootPoint<TRequiredCtx>
  source?: null
  points?: PointsCollection
}

export type GetSuitablePointResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint
  location: Route0.Location
  eversion: Eversion0<TRequiredCtx>
}
export type GetSuitableResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint | undefined
  location: Route0.Location
  eversion: Eversion0<TRequiredCtx>
}
export type GetSuitablePageComponentResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: PagePoint | undefined
  root: RootPoint
  location: Route0.Location
  eversion: Eversion0<TRequiredCtx>
}
export type FillPageResult = {
  element: React.ReactElement
  error: unknown
  status: number | undefined
}

export type PointsCollectionRecord<TEndPointType extends EndPointType = EndPointType> = {
  type: TEndPointType
  route: string
  point: EndPoint<TEndPointType> | (() => Promise<EndPoint<TEndPointType>>)
  layoutPagesRoutes?: string[]
}
export type PointsCollection = PointsCollectionRecord[]
export type LoadedPointsCollectionRecord<TEndPointType extends EndPointType = EndPointType> = {
  type: TEndPointType
  route: Route0.AnyRoute
  point: EndPoint<TEndPointType>
  layoutPagesRoutes: string[]
}
export type LoadedPointsCollection = LoadedPointsCollectionRecord[]

export type LocationInput = { pathname: string } | { location: Route0.Location } | { id: string }

// TODO: remove this complexity, please
// export type WithRequiredCtx<TRequiredCtx extends RequiredCtx = UndefinedCtx> = TRequiredCtx extends Ctx
//   ? {
//       requiredCtx: TRequiredCtx
//     }
//   : { requiredCtx?: undefined }
export type WithRequiredCtx<TRequiredCtx extends RequiredCtx = UndefinedCtx> = {
  requiredCtx: TRequiredCtx
}

export type ExtendFnWithOutput = {
  output: Ctx | Data
  record: ExtendFnRecord
}
export type ExtractResult<TOutputCtx extends Ctx = Ctx, TOutputData extends Data = Data> = {
  ctx: TOutputCtx
  data: TOutputData
  head: ResolvableHead[]
  response: Response | undefined
  dehydratedState: DehydratedState
  location: Route0.Location
  error: unknown
  status: number
  root: RootPoint
  point: AnyPoint | undefined
  eversion: Eversion0
  extendFnsWithOutput: ExtendFnWithOutput[]
  queryClient: QueryClient
}
export type InferExtractResult<TPoint extends AnyPoint> =
  TPoint extends AnyPoint<any, any, any, infer TOutputCtx, infer TOutputData, any, any>
    ? ExtractResult<TOutputCtx, TOutputData>
    : ExtractResult<EmptyCtx, EmptyData>

export type Payload = {
  dehydratedState: DehydratedState
  location: Route0.Location
}

export type PagesCollectionRecord = {
  type: 'page'
  route: Route0.AnyRoute
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
  route: Route0.AnyRoute
  point: LayoutPoint | (() => Promise<LayoutPoint>)
  layoutComponent:
    | React.ComponentType<{ children: React.ReactNode }>
    | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
  layoutPagesRoutes: Route0.AnyRoute[]
}
export type LayoutsCollection = LayoutsCollectionRecord[]

export type PagesAndLayoutsCollection = {
  pages: PagesCollection
  layouts: LayoutsCollection
}

export type PagesTreeRecord = {
  route: Route0.AnyRoute
  layoutPoint: LayoutPoint | (() => Promise<LayoutPoint>) | undefined
  layoutComponent:
    | React.ComponentType<{ children: React.ReactNode }>
    | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
    | undefined
  pages: Array<{
    route: Route0.AnyRoute
    pagePoint: PagePoint | (() => Promise<PagePoint>)
    pageComponent: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
  }>
  nestedPagesTree: PagesTreeRecord[]
}
export type PagesTree = PagesTreeRecord[]

export type RoutesCollection = Record<string, Route0.AnyRoute>

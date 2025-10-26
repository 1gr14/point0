import { Error0 } from '@devp0nt/error0'
import { Route0 } from '@devp0nt/route0'
import type { DehydratedState } from '@tanstack/react-query'
import { dehydrate, hashKey, QueryClient } from '@tanstack/react-query'
import { lazy } from 'react'
import type { ResolvableHead } from 'unhead/types'
import type {
  AnyPoint,
  BaseConnectionPoint,
  BaseId,
  BasePoint,
  BaseSourcePoint,
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

// TODO: when find suitable allow porvide "baseId", then it will find only inside that
// so remove force
export class Eversion0<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  base: BasePoint<TRequiredCtx>
  source: Eversion0<TRequiredCtx> | undefined
  points: LoadedPointsCollection
  connections: Array<Eversion0<TRequiredCtx>>

  private constructor({
    base,
    source,
    points,
    connections,
  }: {
    base: BasePoint
    source?: Eversion0<TRequiredCtx> | undefined
    points?: LoadedPointsCollection
    connections?: Array<Eversion0<TRequiredCtx>>
  }) {
    this.base = base as BasePoint<TRequiredCtx>
    this.points = points ?? []
    this.connections = connections ?? []
    this.source = source
  }

  static async create<TBasePoint extends BasePoint>({
    base,
    points,
  }: {
    base: TBasePoint
    points?: PointsCollectionRecord[]
  }): Promise<Eversion0<TBasePoint['Infer']['RequiredCtx']>> {
    return new Eversion0<TBasePoint['Infer']['RequiredCtx']>({
      base,
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

  async connect({ base, points }: { base: BasePoint; points?: PointsCollection }): Promise<Eversion0<TRequiredCtx>> {
    const connection = new Eversion0<TRequiredCtx>({
      base,
      points: await Eversion0.toLoadedPointsCollection(points),
      source: this,
    })
    this.connections.push(connection)
    return connection
  }

  static getSuitablePageLocation = ({
    points,
    location,
  }: {
    points: PointsCollection
    location: Route0.Location
  }): Route0.Location => {
    for (const record of points) {
      if (record.type !== 'page') {
        continue
      }
      const match = Route0.getMatch(Route0.create(record.route), location)
      if (match.exact) {
        return match.location
      }
    }
    return location
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
                default: (await point())._getWrappedLayoutComponent(),
              }))
            : point._getWrappedLayoutComponent(),
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
                default: (await point())._getWrappedPageComponent(),
              }))
            : point._getWrappedPageComponent(),
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

  static toPagesTree = ({ pagesAndLayouts }: { pagesAndLayouts: PagesAndLayoutsCollection }): PagesTree => {
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
        pages: layoutPagesWhereThisLayoutIndexEqLevelAndIsLast.map((lp) => ({
          route: lp.route,
          pageComponent: lp.pageComponent,
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
      })),
      layoutComponent: undefined,
      nestedPagesTree: [],
    }
    const pagesTree: PagesTree = [
      ...(noLayoutTree.pages.length > 0 ? [noLayoutTree] : []),
      ...layouts.flatMap((l) => buildLayoutTree(l) ?? []),
    ]
    return pagesTree
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

  getParents(): [BaseSourcePoint, ...BaseConnectionPoint[]] | [] {
    const sources: Array<BaseSourcePoint | BaseConnectionPoint> = []
    let current: Eversion0<TRequiredCtx> | undefined = this.source
    while (current) {
      sources.push(current.base)
      current = current.source
    }
    return sources.reverse() as [BaseSourcePoint, ...BaseConnectionPoint[]] | []
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
    baseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId
  } & LocationInput):
    | {
        point: EndPoint
        location: Route0.Location
        eversion: Eversion0<TRequiredCtx>
      }
    | undefined {
    if (baseId && this.base._baseId !== baseId) {
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
    baseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId
  } & LocationInput): GetSuitablePointResult<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const suitableSelfPoint = this._getSuitableSelfPoint({ method: providedMethod, location, baseId })
    if (suitableSelfPoint) {
      return suitableSelfPoint
    }
    const suitableConnectionPoint = (() => {
      for (const connection of this.connections) {
        const result = connection.getSuitablePoint({ method: providedMethod, location, baseId })
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
    baseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId | undefined
  } & LocationInput): Eversion0<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const route = this.base._route
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
    baseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId | undefined
  } & LocationInput): Eversion0<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const suitableSelfEversion = this._getSuitableSelfEversionByLocation({ method: providedMethod, location, baseId })
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableConnectionEversion = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitableEversionByLocation({ method: providedMethod, location, baseId })
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
  _getSuitableEversionByBaseId({ baseId }: { baseId: BaseId | undefined }): Eversion0<TRequiredCtx> | undefined {
    const suitableSelfEversion = this.base._baseId === baseId ? this : undefined
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableConnectionEversion = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitableEversionByBaseId({ baseId })
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
    baseId,
    fallbackBaseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId | undefined
    fallbackBaseId: BaseId | undefined
  } & LocationInput): Eversion0<TRequiredCtx> {
    const location = this.normalizeLocation(locationProps)
    const suitableEversionByLoaction = this._getSuitableEversionByLocation({ method: providedMethod, location, baseId })
    if (suitableEversionByLoaction) {
      return suitableEversionByLoaction
    }
    const suitableEversionByBaseId = this._getSuitableEversionByBaseId({ baseId })
    if (suitableEversionByBaseId) {
      return suitableEversionByBaseId
    }
    const suitableEversionByFallbackBaseId = this._getSuitableEversionByBaseId({ baseId: fallbackBaseId })
    if (suitableEversionByFallbackBaseId) {
      return suitableEversionByFallbackBaseId
    }
    throw new Error(
      `No suitable eversion found for method "${providedMethod}" at location "${location.pathname}" and base id "${baseId}" and fallback base id "${fallbackBaseId}"`,
    )
  }

  getSuitable({
    method: providedMethod,
    baseId,
    fallbackBaseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId
    fallbackBaseId: BaseId
  } & LocationInput): GetSuitableResult<TRequiredCtx> {
    const location = this.normalizeLocation(locationProps)
    const suitablePoint = this.getSuitablePoint({ method: providedMethod, location, baseId })
    if (suitablePoint) {
      return suitablePoint
    }
    // TODO: allow find just by id
    const suitableEversion = this.getSuitableEversionByLocation({
      method: providedMethod,
      location,
      baseId,
      fallbackBaseId,
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
        const layoutLocation = {
          // layout will request own state on client, it has different route based on id, but it wants to recieve same input. Input for get routes made based o params and query.
          ...Route0.getLocation(layout._getRouteAbsPath({ query: { ...location.query, ...location.params } } as never)),
        }
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
        base: this.base,
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
      ...this.base._extendFns,
      ...(point?._extendFns ?? []),
    ]
    const heads = [
      ...this.getParents().flatMap((source) => source._heads),
      ...this.base._heads,
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
          base: this.base,
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
          base: this.base,
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
        base: this.base,
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
    baseId,
    fallbackBaseId,
    input,
    ...locationProps
  }: WithRequiredCtx<TRequiredCtx> & {
    method: Method
    baseId?: BaseId | undefined
    fallbackBaseId: BaseId
    point?: AnyPoint | undefined
    input?: Input
  } & LocationInput): Promise<ExtractResult> {
    const location = this.normalizeLocation(locationProps)
    const suitable = this.getSuitable({ method: providedMethod, location, baseId, fallbackBaseId })
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

// type EversionContextValue = {
//   isInitialPage: boolean
//   setIsInitialPage: React.Dispatch<React.SetStateAction<boolean>>
// }
// const EversionContext = React.createContext<EversionContextValue | undefined>(undefined)
// function EversionContextProvider({ children }: { children: React.ReactNode }) {
//   const [isInitialPage, setIsInitialPage] = React.useState(true)
//   const value = React.useMemo(() => ({ isInitialPage, setIsInitialPage }), [isInitialPage])
//   return React.createElement(EversionContext.Provider, { value }, children)
// }
// export function useEversionContext(): EversionContextValue {
//   const ctx = React.useContext(EversionContext)
//   if (!ctx) throw new Error('useEversionContext must be used inside EversionContextProvider')
//   return ctx
// }

export type CreateEversionInput<TRequiredCtx extends RequiredCtx> = {
  base: BasePoint<TRequiredCtx>
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
  base: BasePoint
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

// export type LayoutsCollectionRecord<TEndPointType extends EndPointType = EndPointType> = {
//   routes: string[]
//   point: EndPoint<TEndPointType> | (() => Promise<EndPoint<TEndPointType>>)
// }
// export type LayoutsCollection = LayoutsCollectionRecord[]
// export type LoadedLayoutsCollectionRecord<TEndPointType extends EndPointType = EndPointType> = {
//   routes: Route0.AnyRoute[]
//   point: EndPoint<TEndPointType>
// }
// export type LoadedLayoutsCollection = LoadedLayoutsCollectionRecord[]

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
  base: BasePoint
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
  layoutComponent:
    | React.ComponentType<{ children: React.ReactNode }>
    | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
    | undefined
  pages: Array<{
    route: Route0.AnyRoute
    pageComponent: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
  }>
  nestedPagesTree: PagesTreeRecord[]
}
export type PagesTree = PagesTreeRecord[]

export type RoutesCollection = Record<string, Route0.AnyRoute>

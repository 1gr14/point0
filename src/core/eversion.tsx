import { Error0 } from '@devp0nt/error0'
import { Route0 } from '@devp0nt/route0'
import type { DehydratedState } from '@tanstack/react-query'
import { dehydrate, hashKey, QueryClient } from '@tanstack/react-query'
import * as React from 'react'
import type { renderToReadableStream as RenderToReadableStream } from 'react-dom/server'
import type { ResolvableHead } from 'unhead/types'
import type { HydratedAppComponent } from './hydrate.js'
import { Point0 } from './index.js'
import { toPagesTree } from './router.js'
import type {
  AnyPoint,
  Ctx,
  Data,
  EmptyCtx,
  EmptyData,
  EndPoint,
  EndPointType,
  ExtractFnRecord,
  FinalData,
  Input,
  Method,
  PagePoint,
  QueryKey,
  RequiredCtx,
  RootConnectedPoint,
  RootId,
  RootPoint,
  RootSourcePoint,
  UndefinedCtx,
} from './types.js'

// TODO: when find suitable allow porvide "rootId", then it will find only inside that
// so remove force
export class Eversion<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  root: RootPoint<TRequiredCtx>
  source: Eversion<TRequiredCtx> | undefined
  points: LoadedPointsCollection
  connections: Array<Eversion<TRequiredCtx>>

  private constructor({
    root,
    source,
    points,
    connections,
  }: {
    root: RootPoint
    source?: Eversion<TRequiredCtx> | undefined
    points?: LoadedPointsCollection
    connections?: Array<Eversion<TRequiredCtx>>
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
  }): Promise<Eversion<TRootPoint['Infer']['RequiredCtx']>> {
    return new Eversion<TRootPoint['Infer']['RequiredCtx']>({
      root,
      points: await Eversion.toLoadedPointsCollection(points),
    })
  }

  async connect({
    root,
    points,
  }: {
    root: RootPoint
    points?: PointsCollection | LoadedPointsCollection
  }): Promise<Eversion<TRequiredCtx>> {
    const connection = new Eversion<TRequiredCtx>({
      root,
      points: await Eversion.toLoadedPointsCollection(points),
      source: this,
    })
    this.connections.push(connection)
    return connection
  }

  static async toLoadedPointsCollection(
    points?: PointsCollection | LoadedPointsCollection,
  ): Promise<LoadedPointsCollection> {
    return await Promise.all(
      points?.map(async (record) => {
        const pointPromise = typeof record.point === 'function' ? record.point() : record.point
        const [point] = await Promise.all([pointPromise])
        return {
          point,
          route: typeof record.route === 'string' ? Route0.create(record.route) : record.route,
          type: record.type,
          layoutPagesRoutes: record.layoutPagesRoutes ?? [],
        }
      }) ?? [],
    )
  }

  async createRun({
    location,
    requiredCtx,
  }: {
    location: Route0.Location
    requiredCtx: TRequiredCtx
  }): Promise<EversionRun<TRequiredCtx>> {
    const eversionRun = new EversionRun({
      eversion: this,
      location,
      requiredCtx,
    })
    eversionRun.eversion = await this._cloneWithEversionRun(eversionRun)
    return eversionRun
  }

  async _cloneSourceWithEversionRun(eversionRun: EversionRun<TRequiredCtx>): Promise<Eversion<TRequiredCtx>> {
    if (this.source) {
      return await this.source._cloneSourceWithEversionRun(eversionRun)
    }
    const eversionWithEversionRun = new Eversion<TRequiredCtx>({
      root: this.root._cloneWithEversionRun(eversionRun),
      points: this.points.map((record) => ({ ...record, point: record.point._cloneWithEversionRun(eversionRun) })),
    })
    await Promise.all(
      this.connections.map(async (connection) => {
        await eversionWithEversionRun.connect({
          root: connection.root._cloneWithEversionRun(eversionRun),
          points: connection.points.map((record) => ({
            ...record,
            point: record.point._cloneWithEversionRun(eversionRun),
          })),
        })
      }),
    )
    return eversionWithEversionRun
  }

  async _cloneWithEversionRun(eversionRun: EversionRun<TRequiredCtx>): Promise<Eversion<TRequiredCtx>> {
    const sourceEversionWithEversionRun = await this._cloneSourceWithEversionRun(eversionRun)
    const thisEversionWithEversionRun = sourceEversionWithEversionRun._getSuitableEversionByRootId({
      rootId: this.root._rootId,
    })
    if (!thisEversionWithEversionRun) {
      throw new Error('This eversion is not suitable for the root id')
    }
    return thisEversionWithEversionRun
  }

  _getParents(): [RootSourcePoint, ...RootConnectedPoint[]] | [] {
    const sources: Array<RootSourcePoint | RootConnectedPoint> = []
    let current: Eversion<TRequiredCtx> | undefined = this.source
    while (current) {
      sources.push(current.root)
      current = current.source
    }
    return sources.reverse() as [RootSourcePoint, ...RootConnectedPoint[]] | []
  }

  _normalizeLocation(input: OptionalLocationInput, fallback?: Route0.Location): Route0.Location {
    const location =
      'location' in input && input.location
        ? input.location
        : 'pathname' in input && input.pathname
          ? Route0.getLocation(input.pathname)
          : undefined
    if (location) {
      return location
    }
    const id = 'id' in input ? input.id : undefined
    if (id) {
      return Route0.getLocation(`/endpoints/${id}`)
    }
    if (fallback) {
      return fallback
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
        eversion: Eversion<TRequiredCtx>
      }
    | undefined {
    if (rootId && this.root._rootId !== rootId) {
      return undefined
    }
    const location = this._normalizeLocation(locationProps)
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
  _getSuitablePoint({
    method: providedMethod,
    rootId,
    ...locationProps
  }: {
    method: Method
    rootId?: RootId
  } & LocationInput): GetSuitablePointResult<TRequiredCtx> | undefined {
    const location = this._normalizeLocation(locationProps)
    const suitableSelfPoint = this._getSuitableSelfPoint({ method: providedMethod, location, rootId })
    if (suitableSelfPoint) {
      return suitableSelfPoint
    }
    const suitableConnectionPoint = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitablePoint({ method: providedMethod, location, rootId })
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
  } & LocationInput): Eversion<TRequiredCtx> | undefined {
    const location = this._normalizeLocation(locationProps)
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
  _getSuitableEversionByLocationOrUndefined({
    method: providedMethod,
    rootId,
    ...locationProps
  }: {
    method: Method
    rootId?: RootId | undefined
  } & LocationInput): Eversion<TRequiredCtx> | undefined {
    const location = this._normalizeLocation(locationProps)
    const suitableSelfEversion = this._getSuitableSelfEversionByLocation({ method: providedMethod, location, rootId })
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableConnectionEversion = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitableEversionByLocationOrUndefined({
          method: providedMethod,
          location,
          rootId,
        })
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
  _getSuitableEversionByRootId({ rootId }: { rootId: RootId | undefined }): Eversion<TRequiredCtx> | undefined {
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
  _getSuitableEversionByLocation({
    method: providedMethod,
    rootId,
    fallbackRootId,
    ...locationProps
  }: {
    method: Method
    rootId?: RootId | undefined
    fallbackRootId: RootId | undefined
  } & LocationInput): Eversion<TRequiredCtx> {
    const location = this._normalizeLocation(locationProps)
    const suitableEversionByLoaction = this._getSuitableEversionByLocationOrUndefined({
      method: providedMethod,
      location,
      rootId,
    })
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
    const location = this._normalizeLocation(locationProps)
    const suitablePoint = this._getSuitablePoint({ method: providedMethod, location, rootId })
    if (suitablePoint) {
      return suitablePoint
    }
    // TODO: allow find just by id
    const suitableEversion = this._getSuitableEversionByLocation({
      method: providedMethod,
      location,
      rootId,
      fallbackRootId,
    })
    return { point: undefined, location, eversion: suitableEversion }
  }
}

export class EversionRun<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  eversion: Eversion<TRequiredCtx>
  extractFnsWithOutput: ExtractFnWithOutput[]
  queryClient: QueryClient
  location: Route0.Location
  requiredCtx: TRequiredCtx
  dehydratedState: DehydratedState

  constructor({
    eversion,
    location,
    requiredCtx,
  }: {
    eversion: Eversion<TRequiredCtx>
    requiredCtx: TRequiredCtx
    location: Route0.Location
  }) {
    this.eversion = eversion
    this.extractFnsWithOutput = []
    this.queryClient = new QueryClient()
    this.location = location
    this.requiredCtx = requiredCtx
    this.dehydratedState = dehydrate(this.queryClient)
  }

  async extract({ point, input = {}, ...locationProps }: ExtractOptions): Promise<ExtractResult> {
    const location = this.eversion._normalizeLocation(locationProps, this.location)

    // TODO: maybe remove it, we will prefetch everything in createPrefetchedAppElement
    // But it is faster, becouse we should not always rerender our app for every layout
    if (point?._pointType === 'page') {
      for (const layout of point._layouts) {
        if (!layout._hasLoader()) {
          continue
        }
        const layoutRoute = layout._getRoute()
        const layoutRoutePath = layoutRoute.get({ ...location.params, query: { ...location.query } } as never)
        const layoutLocation = layoutRoute.match(layoutRoutePath).location
        await this.extract({
          point: layout,
          input,
          location: layoutLocation,
        })
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
        ctx: this.requiredCtx ?? {},
        data: {},
        head: [],
        location,
        error: inputError,
        status: 422,
        response: undefined,
      }
    }

    let currentCtx: Ctx = this.requiredCtx ?? {}
    let currentData: Data = {}
    const extractFns = [
      ...this.eversion._getParents().flatMap((source) => source._extractFns),
      ...this.eversion.root._extractFns,
      ...(point?._extractFns ?? []),
    ]
    const staticHeads = [
      ...this.eversion._getParents().flatMap((source) => source._staticHeads),
      ...this.eversion.root._staticHeads,
      ...(point?._staticHeads ?? []),
    ]
    // TODO: get status from real point data

    try {
      for (const extractFn of extractFns) {
        switch (extractFn.type) {
          case 'ctx': {
            const ex = this.extractFnsWithOutput.find(
              (e) => e.record.unstableId === extractFn.unstableId && e.record.type === 'ctx',
            )
            if (ex) {
              currentCtx = { ...ex.output }
            } else {
              currentCtx = await extractFn.fn({
                ctx: { ...currentCtx },
                data: { ...currentData },
                location,
                input: parsedInput,
              })
              this.extractFnsWithOutput.push({
                output: currentCtx,
                record: extractFn,
              })
            }
            break
          }
          case 'loader': {
            const ex = this.extractFnsWithOutput.find(
              (e) => e.record.unstableId === extractFn.unstableId && e.record.type === 'loader',
            )
            if (ex) {
              currentData = { ...ex.output }
            } else {
              currentData = await extractFn.fn({
                ctx: { ...currentCtx },
                data: { ...currentData },
                location,
                input: parsedInput,
              })
              this.extractFnsWithOutput.push({
                output: currentData,
                record: extractFn,
              })
            }
            break
          }

          default:
            throw new Error(`Unknown extend function type: ${(extractFn as any).type}`)
        }
      }
      // for (const staticHead of staticHeads) {
      //   currentStaticHeads.push(staticHead)
      // }
      const response = await (async () => {
        if (point?._pointType === 'response') {
          if (!point._responseFn) {
            throw new Error('Response function not found')
          }
          return await point._responseFn({ ctx: currentCtx, data: currentData, location, input: parsedInput })
        }
        return undefined
      })()
      if (point) {
        this.appendQueryClientCache({ data: currentData, location, point, error: undefined })
        return {
          ctx: currentCtx,
          data: currentData,
          head: staticHeads,
          location,
          response,
          error: undefined,
          status: 200,
        }
      } else {
        const error = new Error0(`Point Not Found: ${location.pathname}`)
        this.appendQueryClientCache({ data: currentData, location, point, error })
        return {
          ctx: currentCtx,
          data: currentData,
          head: staticHeads,
          location,
          error,
          status: 404,
          response: undefined,
        }
      }
    } catch (error) {
      this.appendQueryClientCache({ data: currentData, location, point, error })
      return {
        ctx: currentCtx,
        data: currentData,
        head: staticHeads,
        location,
        error,
        status: 500,
        response: undefined,
      }
    }
  }

  // async extractSuitable({
  //   method: providedMethod,
  //   requiredCtx,
  //   rootId,
  //   fallbackRootId,
  //   input,
  //   ...locationProps
  // }: WithRequiredCtx<TRequiredCtx> & {
  //   method: Method
  //   rootId?: RootId | undefined
  //   fallbackRootId: RootId
  //   point?: AnyPoint | undefined
  //   input?: Input
  // } & LocationInput): Promise<ExtractResult> {
  //   const location = this.normalizeLocation(locationProps)
  //   const suitable = this.getSuitable({ method: providedMethod, location, rootId, fallbackRootId })
  //   return await suitable.eversion.extract({
  //     point: suitable.point,
  //     requiredCtx,
  //     location: suitable.location,
  //     input,
  //   } as never)
  // }

  async prefetchAppPoints({
    App,
    renderToReadableStream,
    allFetchedPoints = [],
  }: {
    App: HydratedAppComponent
    renderToReadableStream: typeof RenderToReadableStream
    allFetchedPoints?: AnyPoint[]
  }): Promise<void> {
    const pagesTree = toPagesTree({ points: this.eversion.points })
    const nonfetchedPoints: AnyPoint[] = []

    const NonfetchedPointsCollectorContextProvider = ({
      register,
      children,
    }: {
      register: (point: AnyPoint) => void
      children: React.ReactNode
    }): React.ReactNode => {
      return (
        <Point0._SsrNonfetchedPointsCollectorContext.Provider value={{ register }}>
          {children}
        </Point0._SsrNonfetchedPointsCollectorContext.Provider>
      )
    }

    // 1) First render to collect points
    const probeTree = (
      <NonfetchedPointsCollectorContextProvider
        register={(point) => {
          nonfetchedPoints.push(point)
        }}
      >
        <App ssrLocation={this.location} pagesTree={pagesTree} dehydratedState={this.getQueryClientDehydratedState()} />
      </NonfetchedPointsCollectorContextProvider>
    )
    const stream = await renderToReadableStream(probeTree)
    await stream.allReady
    const fetchedPoints: AnyPoint[] = []

    for (const nonfetchedPoint of nonfetchedPoints) {
      const record = this.eversion.points.find(
        (p) => p.point._getRouteDefinition() === nonfetchedPoint._getRouteDefinition(),
      )
      if (!record) {
        continue
      }
      const isCurcular = allFetchedPoints.some((p) => p._getRouteDefinition() === record.point._getRouteDefinition())
      if (isCurcular) {
        return
      }
      const route = record.point._getRoute()
      const routePath = route.get({
        ...this.location.params,
        query: { ...this.location.query },
      } as never)
      const location = route.match(routePath).location
      await record.point.prefetchQuery({
        queryClient: this.queryClient,
        location,
      })
      fetchedPoints.push(record.point)
    }

    if (nonfetchedPoints.length === 0) {
      return
    }
    if (fetchedPoints.length !== nonfetchedPoints.length) {
      return
    }
    await this.prefetchAppPoints({
      App,
      renderToReadableStream,
      allFetchedPoints: [...allFetchedPoints, ...fetchedPoints],
    })
  }

  appendQueryClientCache({
    data,
    location,
    error,
    point,
  }: {
    data: Data
    location: Route0.Location
    error: unknown
    point: AnyPoint | undefined
  }): void {
    if (
      point &&
      (point._pointType === 'query' ||
        point._pointType === 'page' ||
        point._pointType === 'layout' ||
        point._pointType === 'component')
    ) {
      const queryKey: QueryKey = point.getQueryKey({ ...location.query, ...location.params })
      const query = this.queryClient.getQueryCache().build(this.queryClient, { queryKey, queryHash: hashKey(queryKey) })
      if (error) {
        query.setState({
          data: undefined,
          error: { ...Error0.toJSON(error), name: 'Error0' },
          status: 'error',
          fetchStatus: 'idle',
        })
      } else {
        const query = this.queryClient
          .getQueryCache()
          .build(this.queryClient, { queryKey, queryHash: hashKey(queryKey) })
        query.setState({
          data,
          error: null,
          status: 'success',
          fetchStatus: 'idle',
        })
      }
    }
  }

  getQueryClientDehydratedState(): DehydratedState {
    const dehydratedState = dehydrate(this.queryClient, {
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
  eversion: Eversion<TRequiredCtx>
}
export type GetSuitableResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint | undefined
  location: Route0.Location
  eversion: Eversion<TRequiredCtx>
}
export type GetSuitablePageComponentResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: PagePoint | undefined
  root: RootPoint
  location: Route0.Location
  eversion: Eversion<TRequiredCtx>
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
export type OptionalLocationInput = { pathname?: string } | { location?: Route0.Location } | { id?: string }

// TODO: remove this complexity, please
// export type WithRequiredCtx<TRequiredCtx extends RequiredCtx = UndefinedCtx> = TRequiredCtx extends Ctx
//   ? {
//       requiredCtx: TRequiredCtx
//     }
//   : { requiredCtx?: undefined }
export type WithRequiredCtx<TRequiredCtx extends RequiredCtx = UndefinedCtx> = {
  requiredCtx: TRequiredCtx
}

export type ExtractOptions = {
  point?: AnyPoint | undefined
  input?: Input
} & OptionalLocationInput
export type ExtractFnWithOutput = {
  output: Ctx | Data
  record: ExtractFnRecord
}
export type ExtractResult<TCtx extends Ctx = Ctx, TData extends Data = Data> = {
  ctx: TCtx
  data: TData
  head: ResolvableHead[]
  response: Response | undefined
  location: Route0.Location
  error: unknown
  status: number
}
export type InferExtractResult<TPoint extends AnyPoint> =
  TPoint extends AnyPoint<any, any, any, infer TCtx, infer TData, any, any, any>
    ? ExtractResult<TCtx, FinalData<TData>>
    : ExtractResult<EmptyCtx, EmptyData>

export type Payload = {
  dehydratedState: DehydratedState
  location: Route0.Location
}

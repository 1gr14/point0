import { Error0 } from '@devp0nt/error0'
import { Route0 } from '@devp0nt/route0'
import type { DehydratedState } from '@tanstack/react-query'
import { dehydrate, hashKey, QueryClient } from '@tanstack/react-query'
import type { ResolvableHead } from 'unhead/types'
import type {
  AnyPoint,
  Ctx,
  Data,
  EmptyCtx,
  EmptyData,
  EndPoint,
  EndPointType,
  ExtendFnRecord,
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
} from './index.js'
import { emptyDehydratedState } from './utils.js'

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

  getParents(): [RootSourcePoint, ...RootConnectedPoint[]] | [] {
    const sources: Array<RootSourcePoint | RootConnectedPoint> = []
    let current: Eversion0<TRequiredCtx> | undefined = this.source
    while (current) {
      sources.push(current.root)
      current = current.source
    }
    return sources.reverse() as [RootSourcePoint, ...RootConnectedPoint[]] | []
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
export type ExtractResult<TCtx extends Ctx = Ctx, TData extends Data = Data> = {
  ctx: TCtx
  data: TData
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
  TPoint extends AnyPoint<any, any, any, infer TCtx, infer TData, any, any>
    ? ExtractResult<TCtx, TData>
    : ExtractResult<EmptyCtx, EmptyData>

export type Payload = {
  dehydratedState: DehydratedState
  location: Route0.Location
}

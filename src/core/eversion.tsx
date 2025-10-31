import { Error0 } from '@devp0nt/error0'
import type { AnyLocation, AnyRoute, ExactLocation } from '@devp0nt/route0'
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
  InputParsed,
  PointName,
  RequiredCtx,
  ResponseOutput,
  RootConnectedPoint,
  RootId,
  RootPoint,
  RootSourcePoint,
  UndefinedCtx,
  UndefinedResponseOutput,
  UndefinedRoute,
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
    const firstPoint = points?.at(0)
    if (firstPoint && 'loaded' in firstPoint) {
      return points as LoadedPointsCollection
    }
    return await Promise.all(
      points?.map(async (record, index) => {
        const pointPromise = typeof record.point === 'function' ? record.point() : record.point
        const [point] = await Promise.all([pointPromise])
        const route = point._route
        if (point._pointType === 'page' && !route) {
          throw new Error(`No client route provided for page point. Index: ${index}.`)
        }
        const routeDefinition = route?.definition
        const recordRouteDefinition = record.route ? Route0.create(record.route).getDefinition() : undefined
        if (routeDefinition !== recordRouteDefinition) {
          throw new Error(
            `Client route definition does not match record route definition. Forget to regenerate points file?. Index: ${index}. Client route definition: ${routeDefinition}. Record route definition: ${recordRouteDefinition}.`,
          )
        }
        const pointId = record.id
        const recordId = record.id
        if (pointId !== recordId) {
          throw new Error(
            `Point id does not match record id. Forget to regenerate points file?. Index: ${index}. Point id: ${pointId}. Record id: ${recordId}.`,
          )
        }
        const recordType = record.type
        const pointType = point._pointType
        if (recordType !== pointType) {
          throw new Error(
            `Record type does not match point type. Forget to regenerate points file?. Index: ${index}. Record type: ${recordType}. Point type: ${pointType}.`,
          )
        }
        const recordLayoutPagesRoutes = record.layoutPagesRoutes ?? []
        return {
          loaded: true,
          point,
          route,
          id: pointId,
          type: pointType,
          layoutPagesRoutes: recordLayoutPagesRoutes,
        }
      }) ?? [],
    )
  }

  async createRun({
    pageLocation,
    requiredCtx,
  }: {
    pageLocation: AnyLocation | undefined
    requiredCtx: TRequiredCtx
  }): Promise<EversionRun<TRequiredCtx>> {
    return new EversionRun({
      eversion: this,
      pageLocation,
      requiredCtx,
    })
  }

  _getParents(): [RootSourcePoint, ...RootConnectedPoint[]] | [] {
    const sources: Array<RootSourcePoint | RootConnectedPoint> = []
    let current: Eversion<TRequiredCtx> | undefined = this.source
    while (current) {
      sources.push(current.root as RootSourcePoint | RootConnectedPoint)
      current = current.source
    }
    return sources.reverse() as [RootSourcePoint, ...RootConnectedPoint[]] | []
  }

  _getSuitableSelfPoint({
    rootId,
    pageLocation,
    pointType,
    pointName,
  }: {
    rootId?: RootId
    pageLocation?: AnyLocation | undefined
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
  }):
    | {
        point: EndPoint
        pageLocation: ExactLocation | undefined
        eversion: Eversion<TRequiredCtx>
      }
    | undefined {
    if (rootId && this.root._rootId !== rootId) {
      return undefined
    }
    for (const { route, point } of this.points) {
      // TODO:ASAP
      if (pointType && point._pointType !== pointType) {
        continue
      }
      if (pointName) {
        if (point._name === pointName) {
          return {
            point,
            pageLocation: undefined,
            eversion: this,
          }
        }
        continue
      }
      // only pages and layouts has client route, but layouts data never should be requested on server by its own client path,
      // becouse it can be same as page path, instead they are requested by its server path
      if (point._pointType !== 'page' || !pageLocation) {
        continue
      }
      const match = route?.getLocation(pageLocation)
      if (match?.exact) {
        return {
          point,
          pageLocation: match,
          eversion: this,
        }
      }
    }
    return undefined
  }
  _getSuitablePoint({
    rootId,
    pageLocation,
    pointType,
    pointName,
  }: {
    rootId?: RootId
    pageLocation?: AnyLocation | undefined
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
  }): GetSuitablePointResult<TRequiredCtx> | undefined {
    const suitableSelfPoint = this._getSuitableSelfPoint({ pageLocation, rootId, pointType, pointName })
    if (suitableSelfPoint) {
      return suitableSelfPoint
    }
    const suitableConnectionPoint = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitablePoint({ pageLocation, rootId, pointType, pointName })
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

  _getSuitableSelfEversionByPageLocation({
    rootId,
    pageLocation,
  }: {
    rootId?: RootId | undefined
    pageLocation: AnyLocation
  }): Eversion<TRequiredCtx> | undefined {
    if (rootId && this.root._rootId !== rootId) {
      return undefined
    }
    const route = this.root._route
    if (!route) {
      return undefined
    }
    const match = route.getLocation(pageLocation)
    if (match.parent || match.exact) {
      return this
    }
    return undefined
  }
  _getSuitableEversionByPageLocationOrUndefined({
    rootId,
    pageLocation,
  }: {
    rootId?: RootId | undefined
    pageLocation: AnyLocation
  }): Eversion<TRequiredCtx> | undefined {
    const suitableSelfEversion = this._getSuitableSelfEversionByPageLocation({ pageLocation, rootId })
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableConnectionEversion = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitableEversionByPageLocationOrUndefined({
          pageLocation,
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
  _getSuitableEversionByPageLocation({
    rootId,
    fallbackRootId,
    pageLocation,
  }: {
    rootId?: RootId | undefined
    fallbackRootId: RootId | undefined
    pageLocation?: AnyLocation | undefined
  }): Eversion<TRequiredCtx> {
    if (!pageLocation) {
      throw new Error('Page location is required')
    }
    const suitableEversionByLoaction = this._getSuitableEversionByPageLocationOrUndefined({
      pageLocation,
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
      `No suitable eversion found at location "${location.pathname}" and root id "${rootId}" and fallback root id "${fallbackRootId}"`,
    )
  }

  getSuitable({
    rootId,
    fallbackRootId,
    pageLocation,
    pointType,
    pointName,
  }: {
    rootId?: RootId
    fallbackRootId: RootId
    pageLocation?: AnyLocation | undefined
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
  }): GetSuitableResult<TRequiredCtx> {
    const suitablePoint = this._getSuitablePoint({ pageLocation, rootId, pointType, pointName })
    if (suitablePoint) {
      return suitablePoint
    }
    // TODO: allow find just by fallbackRootId
    const suitableEversion = this._getSuitableEversionByPageLocation({
      pageLocation,
      rootId,
      fallbackRootId,
    })
    return { point: undefined, pageLocation, eversion: suitableEversion }
  }
}

export class EversionRun<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  eversion: Eversion<TRequiredCtx>
  extractFnsWithOutput: ExtractFnWithOutput[]
  queryClient: QueryClient
  pageLocation: AnyLocation | undefined
  requiredCtx: TRequiredCtx
  dehydratedState: DehydratedState

  constructor({
    eversion,
    pageLocation,
    requiredCtx,
  }: {
    eversion: Eversion<TRequiredCtx>
    requiredCtx: TRequiredCtx
    pageLocation: AnyLocation | undefined
  }) {
    this.eversion = eversion
    this.extractFnsWithOutput = []
    this.queryClient = new QueryClient()
    this.pageLocation = pageLocation
    this.requiredCtx = requiredCtx
    this.dehydratedState = dehydrate(this.queryClient)
  }

  async extract({ point, input }: ExtractOptions): Promise<ExtractResult> {
    // TODO: maybe remove it, we will prefetch everything in createPrefetchedAppElement
    // But it is faster, becouse we should not always rerender our app for every layout
    if (point?._pointType === 'page') {
      for (const layout of point._layouts) {
        if (!layout._hasLoader()) {
          continue
        }
        await this.extract({
          point: layout,
          input,
        })
      }
    }

    // const mergedInput = { ...point?._getUnsafeInputRawByLocation(location), ...input }

    const { parsedInput, inputError } = (() => {
      if (point?._inputSchema) {
        const parseResult = point._inputSchema.safeParse(input)
        if (parseResult.success) {
          return { parsedInput: parseResult.data, inputError: undefined }
        }
        return { parsedInput: {}, inputError: parseResult.error }
      }
      return { parsedInput: input, inputError: undefined }
    })()
    if (inputError) {
      return {
        ctx: this.requiredCtx ?? {},
        data: {},
        head: [],
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
                input: parsedInput,
                eversionRun: this as never,
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
                input: parsedInput,
                eversionRun: this as never,
              })
              this.extractFnsWithOutput.push({
                output: currentData,
                record: extractFn,
              })
            }
            break
          }
          // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
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
          return await point._responseFn({
            ctx: currentCtx,
            data: currentData,
            input: parsedInput,
          })
        }
        return undefined
      })()
      if (point) {
        this.appendQueryClientCache({ data: currentData, point, error: undefined, input })
        return {
          ctx: currentCtx,
          data: currentData,
          head: staticHeads,
          response,
          error: undefined,
          status: 200,
        }
      } else {
        const error = new Error0(`Point Not Found: ${location.pathname}`)
        this.appendQueryClientCache({ data: currentData, point, error, input })
        return {
          ctx: currentCtx,
          data: currentData,
          head: staticHeads,
          error,
          status: 404,
          response: undefined,
        }
      }
    } catch (error) {
      this.appendQueryClientCache({ data: currentData, point, error, input })
      return {
        ctx: currentCtx,
        data: currentData,
        head: staticHeads,
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
    allFetchedRecords = [],
  }: {
    App: HydratedAppComponent
    renderToReadableStream: typeof RenderToReadableStream
    allFetchedRecords?: FetchPointRecord[]
  }): Promise<void> {
    const pagesTree = toPagesTree({ points: this.eversion.points })
    const nonfetchedRecords: FetchPointRecord[] = []

    const NonfetchedRecordsCollectorContextProvider = ({
      register,
      children,
    }: {
      register: (point: AnyPoint, input: Record<string, any>) => void
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
      <NonfetchedRecordsCollectorContextProvider
        register={(point, input) => {
          nonfetchedRecords.push({ point, input })
        }}
      >
        <App
          ssrLocation={this.pageLocation}
          pagesTree={pagesTree}
          dehydratedState={this.getQueryClientDehydratedState()}
        />
      </NonfetchedRecordsCollectorContextProvider>
    )
    const stream = await renderToReadableStream(probeTree)
    await stream.allReady
    const fetchedRecords: FetchPointRecord[] = []

    for (const nonfetchedRecord of nonfetchedRecords) {
      const isCurcular = allFetchedRecords.some(
        ({ point }) =>
          point._name === nonfetchedRecord.point._name &&
          point._rootId === nonfetchedRecord.point._rootId &&
          point._pointType === nonfetchedRecord.point._pointType,
      )
      if (isCurcular) {
        return
      }
      await nonfetchedRecord.point.extract(this, nonfetchedRecord.input)
      fetchedRecords.push(nonfetchedRecord)
    }

    if (nonfetchedRecords.length === 0) {
      return
    }
    if (fetchedRecords.length !== nonfetchedRecords.length) {
      return
    }
    await this.prefetchAppPoints({
      App,
      renderToReadableStream,
      allFetchedRecords: [...allFetchedRecords, ...fetchedRecords],
    })
  }

  appendQueryClientCache({
    data,
    input,
    error,
    point,
  }: {
    data: Data
    input: InputParsed
    error: unknown
    point: AnyPoint | undefined
  }): void {
    if (
      point &&
      (point._pointType === 'query' ||
        point._pointType === 'page' ||
        point._pointType === 'layout' ||
        point._pointType === 'client-ctx' ||
        point._pointType === 'component')
    ) {
      const queryKey = point.getQueryKey(input)
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
  pageLocation: ExactLocation | undefined
  eversion: Eversion<TRequiredCtx>
}
export type GetSuitableResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint | undefined
  pageLocation: AnyLocation | undefined
  eversion: Eversion<TRequiredCtx>
}
export type FillPageResult = {
  element: React.ReactElement
  error: unknown
  status: number | undefined
}

export type PointsCollectionRecord<TEndPointType extends EndPointType = EndPointType> = {
  type: TEndPointType
  id: PointName
  route?: string | undefined
  point: EndPoint<TEndPointType> | (() => Promise<EndPoint<TEndPointType>>)
  layoutPagesRoutes?: string[]
}
export type PointsCollection = PointsCollectionRecord[]
export type LoadedPointsCollectionRecord<TEndPointType extends EndPointType = EndPointType> = {
  loaded: true
  type: TEndPointType
  id: PointName
  route: AnyRoute | UndefinedRoute
  point: EndPoint<TEndPointType>
  layoutPagesRoutes: string[]
}
export type LoadedPointsCollection = LoadedPointsCollectionRecord[]

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
  input: InputParsed
}
export type ExtractFnWithOutput = {
  output: Ctx | Data
  record: ExtractFnRecord
}
export type ExtractResult<
  TCtx extends Ctx = Ctx,
  TData extends Data = Data,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
> = {
  ctx: TCtx
  data: TData
  head: ResolvableHead[]
  response: TResponseOutput
  error: unknown
  status: number
}
export type InferExtractResult<TPoint extends AnyPoint> =
  TPoint extends AnyPoint<any, any, any, any, infer TCtx, infer TData, any, any, any, infer TResponseOutput>
    ? ExtractResult<TCtx, FinalData<TData>, TResponseOutput>
    : ExtractResult<EmptyCtx, EmptyData, UndefinedResponseOutput>

export type Payload = {
  dehydratedState: DehydratedState
  location: AnyLocation
}

type FetchPointRecord = { point: AnyPoint; input: Record<string, any> }

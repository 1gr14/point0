import { Error0 } from '@devp0nt/error0'
import type { AnyLocation, ExactLocation } from '@devp0nt/route0'
import type { DehydratedState, QueryClient } from '@tanstack/react-query'
import { dehydrate, hashKey, hydrate } from '@tanstack/react-query'
import * as React from 'react'
import type { renderToReadableStream as RenderToReadableStream } from 'react-dom/server'
import type { ResolvableHead } from 'unhead/types'
import type { HydratedAppComponent } from './hydrate.js'
import { Point0 } from './index.js'
import { Points } from './points.js'
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
  InputRaw,
  PointName,
  RequiredCtx,
  ResponseOutput,
  RootConnectedPoint,
  RootId,
  RootPoint,
  RootSourcePoint,
  UndefinedCtx,
  UndefinedResponseOutput,
} from './types.js'

// TODO: when find suitable allow porvide "rootId", then it will find only inside that
// so remove force
export class Eversion<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  root: RootPoint<TRequiredCtx>
  source: Eversion<TRequiredCtx> | undefined
  points: Points<true>
  connections: Array<Eversion<TRequiredCtx>>

  private constructor({
    root,
    source,
    points,
    connections,
  }: {
    root: RootPoint
    source?: Eversion<TRequiredCtx> | undefined
    points: Points<true>
    connections?: Array<Eversion<TRequiredCtx>>
  }) {
    this.root = root as RootPoint<TRequiredCtx>
    this.points = points
    this.connections = connections ?? []
    this.source = source
  }

  static async create<TRootPoint extends RootPoint>({
    root,
    points = Points.ready([]),
  }: {
    root: TRootPoint
    points?: Points
  }): Promise<Eversion<TRootPoint['Infer']['RequiredCtx']>> {
    return new Eversion<TRootPoint['Infer']['RequiredCtx']>({
      root,
      points: await points.load(),
    })
  }

  async connect({
    root,
    points = Points.ready([]),
  }: {
    root: RootPoint
    points?: Points
  }): Promise<Eversion<TRequiredCtx>> {
    const connection = new Eversion<TRequiredCtx>({
      root,
      points: await points.load(),
      source: this,
    })
    this.connections.push(connection)
    return connection
  }

  async createRun({
    pageLocation,
    requiredCtx,
  }: {
    pageLocation: AnyLocation | undefined
    requiredCtx: TRequiredCtx
  }): Promise<EversionRun<TRequiredCtx>> {
    return await EversionRun.create({
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
    input,
  }: {
    rootId?: RootId
    pageLocation?: AnyLocation | undefined
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
    input?: InputParsed | undefined
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
    const suitablePoint = this.points.getSuitablePoint({ pageLocation, pointType, pointName, input })
    if (suitablePoint) {
      return {
        point: suitablePoint.point,
        pageLocation: suitablePoint.pageLocation,
        eversion: this,
      }
    }
    return undefined
  }
  _getSuitablePoint({
    rootId,
    pageLocation,
    pointType,
    pointName,
    input,
  }: {
    rootId?: RootId
    pageLocation?: AnyLocation | undefined
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
    input?: InputParsed | undefined
  }): GetSuitablePointResult<TRequiredCtx> | undefined {
    const suitableSelfPoint = this._getSuitableSelfPoint({ pageLocation, rootId, pointType, pointName, input })
    if (suitableSelfPoint) {
      return suitableSelfPoint
    }
    const suitableConnectionPoint = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitablePoint({ pageLocation, rootId, pointType, pointName, input })
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
    // TODO: fix it later, it now not used
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
    input,
  }: {
    rootId?: RootId
    fallbackRootId: RootId
    pageLocation?: AnyLocation | undefined
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
    input?: InputParsed | undefined
  }): GetSuitableResult<TRequiredCtx> {
    const suitablePoint = this._getSuitablePoint({ pageLocation, rootId, pointType, pointName, input })
    if (suitablePoint) {
      return suitablePoint
    }
    // TODO: allow find just by fallbackRootId
    if (pageLocation) {
      const suitableEversion = this._getSuitableEversionByPageLocation({
        pageLocation,
        rootId,
        fallbackRootId,
      })
      return { point: undefined, pageLocation, eversion: suitableEversion }
    }
    const suitableEversion = this._getSuitableEversionByRootId({ rootId })
    if (!suitableEversion) {
      throw new Error(`No suitable eversion found at root id "${rootId}"`)
    }
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

  private constructor({
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
    this.queryClient = this.eversion.root.getQueryClient()
    this.pageLocation = pageLocation
    this.requiredCtx = requiredCtx
    this.dehydratedState = dehydrate(this.queryClient)
  }

  static async create<TRequiredCtx extends RequiredCtx = RequiredCtx>({
    eversion,
    pageLocation,
    requiredCtx,
  }: {
    eversion: Eversion<TRequiredCtx>
    requiredCtx: TRequiredCtx
    pageLocation: AnyLocation | undefined
  }): Promise<EversionRun<TRequiredCtx>> {
    return new EversionRun<TRequiredCtx>({ eversion, pageLocation, requiredCtx })
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
      ...(point?._extractFns ?? []),
    ]
    const curretHead = [
      ...this.eversion._getParents().flatMap((source) => source._staticHeads),
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

      const pageLocation = this.pageLocation
      if (pageLocation && point?._pointType === 'page') {
        curretHead.push(
          ...point
            ._getClientHeadFnsUntilFirstClientLoader()
            .map((headFn) => headFn.fn({ data: currentData, location: pageLocation })),
        )
      }

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
          head: curretHead,
          response,
          error: undefined,
          status: 200,
        }
      } else {
        const error = new Error0(`Point Not Found`)
        this.appendQueryClientCache({ data: currentData, point, error, input })
        return {
          ctx: currentCtx,
          data: currentData,
          head: curretHead,
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
        head: curretHead,
        error,
        status: 500,
        response: undefined,
      }
    }
  }

  async prefetchAppPagePoints({
    App,
    renderToReadableStream,
    pagePoint,
    input,
    seenQueryHashes = new Set<string>(),
    level = 0,
  }: {
    App: HydratedAppComponent
    renderToReadableStream: typeof RenderToReadableStream
    pagePoint: AnyPoint | undefined
    input: InputRaw
    seenQueryHashes?: Set<string>
    level?: number
  }): Promise<void> {
    const probeTree = (
      <App
        ssrLocation={this.pageLocation}
        root={this.eversion.root}
        points={this.eversion.points}
        queryClient={this.queryClient}
      />
    )
    const stream = await renderToReadableStream(probeTree)
    await stream.allReady
    const queryClientState = this.queryClient.getQueryCache().findAll()
    const suitableMarkers = queryClientState.flatMap((query) => {
      const hash = query.queryHash
      if (seenQueryHashes.has(hash)) {
        return []
      }
      const parsedQueryKey = Point0.parseQueryKey(query.queryKey)
      if (!parsedQueryKey) {
        return []
      }
      if (parsedQueryKey.outputType !== 'data') {
        return []
      }
      seenQueryHashes.add(hash)
      return parsedQueryKey
    })

    if (suitableMarkers.length === 0) {
      if (level === 0 && pagePoint) {
        this.addPrefetchPageDehydratedStateToQueryClient({ pagePoint, input })
      }
      return
    }

    for (const suitableMarker of suitableMarkers) {
      const suitable = this.eversion.getSuitable({
        pointType: suitableMarker.pointType,
        pointName: suitableMarker.pointName,
        input: suitableMarker.input,
        rootId: this.eversion.root._rootId,
        fallbackRootId: this.eversion.root._rootId,
      })
      if (suitable.point) {
        await this.extract({ point: suitable.point, input: suitableMarker.input })
      }
    }

    await this.prefetchAppPagePoints({
      App,
      renderToReadableStream,
      pagePoint,
      input,
      seenQueryHashes,
    })

    if (level === 0 && pagePoint) {
      this.addPrefetchPageDehydratedStateToQueryClient({ pagePoint, input })
    }
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
        point._pointType === 'infiniteQuery' ||
        point._pointType === 'page' ||
        point._pointType === 'layout' ||
        point._pointType === 'clientCtx' ||
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
        if (point._queryResultType === 'infiniteQuery') {
          query.setState({
            data: {
              pages: Array.isArray(data) ? data : [data],
              pageParams: [undefined], // or your actual param if known
            },
            error: null,
            status: 'success',
            fetchStatus: 'idle',
          })
        } else {
          query.setState({
            data,
            error: null,
            status: 'success',
            fetchStatus: 'idle',
          })
        }
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

  addPrefetchPageDehydratedStateToQueryClient({ pagePoint, input }: { pagePoint: AnyPoint; input: InputRaw }): void {
    const prefetchPageQueryOptions = pagePoint.getQueryOptions(input, undefined, undefined, 'dehydratedState')

    // you said you already have this:
    const relatedQueriesDehydratedState = this.getQueryClientDehydratedState()

    // register per-key options (retry, gcTime, etc.)
    const tempQueryClient = pagePoint._generalStore._createQueryClient()
    const { queryKey, ...restOptions } = prefetchPageQueryOptions
    tempQueryClient.setQueryDefaults(prefetchPageQueryOptions.queryKey, {
      ...restOptions,
    })
    tempQueryClient.setQueryData(prefetchPageQueryOptions.queryKey, { dehydratedState: relatedQueriesDehydratedState })
    const tempDehydratedState = dehydrate(tempQueryClient)

    hydrate(this.queryClient, tempDehydratedState)
  }
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
  TPoint extends AnyPoint<any, any, any, any, infer TCtx, infer TData, any, any, any, any, infer TResponseOutput>
    ? ExtractResult<TCtx, FinalData<TData>, TResponseOutput>
    : ExtractResult<EmptyCtx, EmptyData, UndefinedResponseOutput>

export type Payload = {
  dehydratedState: DehydratedState
  location: AnyLocation
}

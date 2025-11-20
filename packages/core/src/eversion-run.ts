import { Error0 } from '@devp0nt/error0'
import type { AnyLocation } from '@devp0nt/route0'
import type { DehydratedState, QueryClient } from '@tanstack/react-query'
import { dehydrate, hashKey, hydrate } from '@tanstack/react-query'
import * as React from 'react'
import type { renderToReadableStream as RenderToReadableStream } from 'react-dom/server'
import type { ResolvableHead } from 'unhead/types'
import { isClient } from './client-server.js'
import type { Eversion } from './eversion.js'
import { Point0 } from './index.js'
import type { AppComponent } from './mount.js'
import { EversionStore } from './eversion-store.js'
import type {
  AnyPoint,
  Ctx,
  Data,
  EmptyCtx,
  EmptyData,
  EndPointType,
  ExtractFnRecord,
  FinalData,
  InputParsed,
  InputRaw,
  PointName,
  PointsScope,
  RequiredCtx,
  ResponseOutput,
  UndefinedResponseOutput,
} from './types.js'

export class EversionRun<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  eversion: Eversion<TRequiredCtx>
  extractFnsWithOutput: ExtractFnWithOutput[]
  pageLocation: AnyLocation | undefined
  requiredCtx: TRequiredCtx
  serverGlobalState: {
    __POINT0_SCOPE__: PointsScope
    __POINT0_QUERY_CLIENT__: QueryClient
    __POINT0_SSR_LOCATION__: AnyLocation | undefined
    __POINT0_CURRENT_LOCATION__: AnyLocation
  }

  private constructor({
    eversion,
    pageLocation,
    requiredCtx,
    extractFnsWithOutput,
    serverGlobalState,
  }: {
    eversion: Eversion<TRequiredCtx>
    extractFnsWithOutput: ExtractFnWithOutput[]
    pageLocation: AnyLocation | undefined
    requiredCtx: TRequiredCtx
    serverGlobalState: {
      __POINT0_SCOPE__: PointsScope
      __POINT0_QUERY_CLIENT__: QueryClient
      __POINT0_SSR_LOCATION__: AnyLocation | undefined
      __POINT0_CURRENT_LOCATION__: AnyLocation
    }
  }) {
    this.eversion = eversion
    this.extractFnsWithOutput = extractFnsWithOutput
    this.pageLocation = pageLocation
    this.requiredCtx = requiredCtx
    this.serverGlobalState = serverGlobalState
  }

  static async create<TRequiredCtx extends RequiredCtx = RequiredCtx>({
    eversion,
    pageLocation,
    currentLocation,
    requiredCtx,
  }: {
    eversion: Eversion<TRequiredCtx>
    currentLocation: AnyLocation
    requiredCtx: TRequiredCtx
    pageLocation: AnyLocation | undefined
  }): Promise<EversionRun<TRequiredCtx>> {
    const serverGlobalState = {}
    return await EversionStore.runWithServerStorageProvider(serverGlobalState, async () => {
      return new EversionRun<TRequiredCtx>({
        eversion,
        pageLocation,
        requiredCtx,
        extractFnsWithOutput: [],
        serverGlobalState: {
          __POINT0_SCOPE__: eversion.points.root._scope,
          __POINT0_QUERY_CLIENT__: EversionStore.get<QueryClient>('__POINT0_QUERY_CLIENT__'),
          __POINT0_SSR_LOCATION__: undefined,
          __POINT0_CURRENT_LOCATION__: currentLocation,
          ...serverGlobalState,
        },
      })
    })
  }

  getQueryClient(): QueryClient {
    return isClient ? EversionStore.get('__POINT0_QUERY_CLIENT__') : this.serverGlobalState.__POINT0_QUERY_CLIENT__
  }

  getScope(): PointsScope {
    return this.serverGlobalState.__POINT0_SCOPE__
  }

  setSsrLocation(ssrLocation: AnyLocation): void {
    if (isClient) {
      EversionStore.set('__POINT0_SSR_LOCATION__', ssrLocation)
      return
    }
    this.serverGlobalState.__POINT0_SSR_LOCATION__ = ssrLocation
  }

  setCurrentLocation(currentLocation: AnyLocation): void {
    if (isClient) {
      EversionStore.set('__POINT0_CURRENT_LOCATION__', currentLocation)
      return
    }
    this.serverGlobalState.__POINT0_CURRENT_LOCATION__ = currentLocation
  }

  async withServerGlobalState<T>(callback: () => Promise<T>): Promise<T> {
    return await EversionStore.runWithServerStorageProvider(this.serverGlobalState, callback)
  }

  async extract({ point, input }: ExtractOptions): Promise<ExtractResult> {
    return await this.withServerGlobalState(async () => {
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
              .map((headFn) => headFn.fn({ data: currentData, location: pageLocation, input: parsedInput })),
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
          await this.appendQueryClientCache({ data: currentData, point, error: undefined, input })
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
          await this.appendQueryClientCache({ data: currentData, point, error, input })
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
        await this.appendQueryClientCache({ data: currentData, point, error, input })
        return {
          ctx: currentCtx,
          data: currentData,
          head: curretHead,
          error,
          status: 500,
          response: undefined,
        }
      }
    })
  }

  async prefetchAppPagePointDeep({
    App,
    renderToReadableStream,
    pagePoint,
    pageLocation,
    input,
    seenQueryHashes = new Set<string>(),
    level = 0,
  }: {
    App: AppComponent
    renderToReadableStream: typeof RenderToReadableStream
    pagePoint: AnyPoint | undefined
    pageLocation: AnyLocation
    input: InputRaw
    seenQueryHashes?: Set<string>
    level?: number
  }): Promise<void> {
    if (level === 0) {
      this.setCurrentLocation(pageLocation)
      this.setSsrLocation(pageLocation)
    }
    await this.withServerGlobalState(async () => {
      const stream = await renderToReadableStream(
        React.createElement(App, {
          points: this.eversion.points,
        }),
      )
      await stream.allReady
      const queryClientState = this.getQueryClient().getQueryCache().findAll()
      const suitableMarkers = queryClientState.flatMap((query) => {
        const hash = query.queryHash
        if (seenQueryHashes.has(hash)) {
          return []
        }
        const parsedQueryKey = Point0.parseQueryKey(query.queryKey)
        if (!parsedQueryKey) {
          return []
        }
        if (!parsedQueryKey.isServer) {
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
          await this.addPrefetchPageDehydratedStateToQueryClient({ pagePoint, input })
        }
        return
      }

      for (const suitableMarker of suitableMarkers) {
        const suitable = this.eversion.getSuitable({
          pointType: suitableMarker.pointType,
          pointName: suitableMarker.pointName,
          input: suitableMarker.input,
          scope: this.eversion.points.root._scope,
          fallbackScope: this.eversion.points.root._scope,
        })
        if (suitable.point) {
          await this.extract({ point: suitable.point, input: suitableMarker.input })
        }
      }

      await this.prefetchAppPagePointDeep({
        App,
        renderToReadableStream,
        pagePoint,
        pageLocation,
        input,
        seenQueryHashes,
      })

      if (level === 0 && pagePoint) {
        await this.addPrefetchPageDehydratedStateToQueryClient({ pagePoint, input })
      }
    })
  }

  async appendQueryClientCache({
    data,
    input,
    error,
    point,
  }: {
    data: Data
    input: InputParsed
    error: unknown
    point: AnyPoint | undefined
  }): Promise<void> {
    await this.withServerGlobalState(async () => {
      if (
        point &&
        (point._pointType === 'query' ||
          point._pointType === 'infiniteQuery' ||
          point._pointType === 'page' ||
          point._pointType === 'layout' ||
          point._pointType === 'provider' ||
          point._pointType === 'component')
      ) {
        const queryKey = point._getServerQueryKey({
          input,
          isInfiniteQuery: point._queryResultType === 'infiniteQuery',
        })
        const query = this.getQueryClient()
          .getQueryCache()
          .build(this.getQueryClient(), { queryKey, queryHash: hashKey(queryKey) })
        if (error) {
          query.setState({
            data: undefined,
            error: { ...Error0.toJSON(error), name: 'Error0' },
            status: 'error',
            fetchStatus: 'idle',
          })
        } else {
          const query = this.getQueryClient()
            .getQueryCache()
            .build(this.getQueryClient(), { queryKey, queryHash: hashKey(queryKey) })
          if (point._queryResultType === 'infiniteQuery') {
            const pageParam =
              (input as any)?.[point._infiniteQueryOptions.pageParamFromInput] ||
              point._infiniteQueryOptions.initialPageParam
            query.setState({
              data: {
                pages: Array.isArray(data) ? data : [data],
                pageParams: [pageParam], // or your actual param if known
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
    })
  }

  async getQueryClientDehydratedState(): Promise<DehydratedState> {
    return await this.withServerGlobalState(async () => {
      const dehydratedState = dehydrate(this.getQueryClient(), {
        shouldDehydrateQuery: (query) => {
          // This will include all queries, including failed ones
          return true
        },
      })
      return dehydratedState
    })
  }

  async addPrefetchPageDehydratedStateToQueryClient({
    pagePoint,
    input,
  }: {
    pagePoint: AnyPoint
    input: InputRaw
  }): Promise<void> {
    await this.withServerGlobalState(async () => {
      if (!pagePoint._hasLoader()) {
        return
      }
      const prefetchPageQueryOptions = pagePoint._getServerQueryOptions({
        input,
        // location: this.pageLocation as AnyLocation,
        // queryClient: this.getQueryClient(),
        queryOptions: undefined,
        fetchOptions: undefined,
        outputType: 'dehydratedState',
      })

      // you said you already have this:
      const relatedQueriesDehydratedState = this.getQueryClientDehydratedState()

      // register per-key options (retry, gcTime, etc.)
      const tempQueryClient = EversionStore.getConfig('__POINT0_QUERY_CLIENT__')?.init()
      if (!tempQueryClient) {
        throw new Error('Query client not found')
      }
      const { queryKey, ...restOptions } = prefetchPageQueryOptions
      tempQueryClient.setQueryDefaults(prefetchPageQueryOptions.queryKey, {
        ...(restOptions as any),
      })
      tempQueryClient.setQueryData(prefetchPageQueryOptions.queryKey, {
        dehydratedState: relatedQueriesDehydratedState,
      })
      const tempDehydratedState = dehydrate(tempQueryClient)

      hydrate(this.getQueryClient(), tempDehydratedState)
    })
  }
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

export type FetchTask = {
  pointType: EndPointType
  outputType: 'data' | 'response' | 'dehydratedState'
  pointInput: InputParsed
  scope: PointsScope
  pointName: PointName
}

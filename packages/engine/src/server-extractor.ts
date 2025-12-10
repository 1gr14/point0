import { Error0 } from '@devp0nt/error0'
import { Route0, type AnyLocation } from '@devp0nt/route0'
import { ClientServerHelpers } from '@point0/core/client-server'
import { ExtractorStore } from '@point0/core/extractor-store'
import { PointsManager } from '@point0/core/points-manager'
import type {
  AnyPoint,
  AppComponent,
  Ctx,
  Data,
  EndPoint,
  EndPointType,
  InputParsed,
  InputRaw,
  InputSchema,
  PointName,
  PointsScope,
  QueryKey,
  RequiredCtx,
  ServerExtractAction,
  ServerExtractResult,
  WithMaybeOptionalReqiredCtx,
} from '@point0/core/types'
import type { DehydratedState, QueryKey as OriginalQueryKey, QueryClient } from '@tanstack/react-query'
import { dehydrate, hashKey, hydrate } from '@tanstack/react-query'
import * as React from 'react'
import type { renderToReadableStream as RenderToReadableStream } from 'react-dom/server'
import type { ResolvableHead } from 'unhead/types'

export class ServerExtractor<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  points: PointsManager<true, TRequiredCtx>
  serverExtractActionsWithOutput: Array<ServerExtractActionWithOutput<any>>
  pageLocation: AnyLocation | undefined
  requiredCtx: TRequiredCtx
  serverGlobalState: {
    __POINT0_SCOPE__: PointsScope
    __POINT0_QUERY_CLIENT__: QueryClient
    __POINT0_SSR_LOCATION__: AnyLocation | undefined
    __POINT0_CURRENT_LOCATION__: AnyLocation
  }

  private constructor({
    points,
    pageLocation,
    requiredCtx,
    serverExtractActionsWithOutput,
    serverGlobalState,
  }: {
    points: PointsManager<true, TRequiredCtx>
    serverExtractActionsWithOutput: Array<ServerExtractActionWithOutput<any>>
    pageLocation: AnyLocation | undefined
    requiredCtx: TRequiredCtx
    serverGlobalState: {
      __POINT0_SCOPE__: PointsScope
      __POINT0_QUERY_CLIENT__: QueryClient
      __POINT0_SSR_LOCATION__: AnyLocation | undefined
      __POINT0_CURRENT_LOCATION__: AnyLocation
    }
  }) {
    this.points = points
    this.serverExtractActionsWithOutput = serverExtractActionsWithOutput
    this.pageLocation = pageLocation
    this.requiredCtx = requiredCtx
    this.serverGlobalState = serverGlobalState
  }

  static async create<TRequiredCtx extends RequiredCtx = RequiredCtx>({
    points,
    pageLocation,
    currentLocation,
    requiredCtx,
  }: {
    points: PointsManager<true, TRequiredCtx>
    currentLocation: AnyLocation
    requiredCtx: TRequiredCtx
    pageLocation: AnyLocation | undefined
  }): Promise<ServerExtractor<TRequiredCtx>> {
    const serverGlobalState = {}
    return await ExtractorStore.runWithServerStorageProvider(serverGlobalState, async () => {
      return new ServerExtractor<TRequiredCtx>({
        points,
        pageLocation,
        requiredCtx,
        serverExtractActionsWithOutput: [],
        serverGlobalState: {
          __POINT0_SCOPE__: points.scope,
          __POINT0_QUERY_CLIENT__: ExtractorStore.get<QueryClient>('__POINT0_QUERY_CLIENT__'),
          __POINT0_SSR_LOCATION__: undefined,
          __POINT0_CURRENT_LOCATION__: currentLocation,
          ...serverGlobalState,
        },
      })
    })
  }

  getQueryClient(): QueryClient {
    return ClientServerHelpers.isClient
      ? ExtractorStore.get('__POINT0_QUERY_CLIENT__')
      : this.serverGlobalState.__POINT0_QUERY_CLIENT__
  }

  getScope(): PointsScope {
    return this.serverGlobalState.__POINT0_SCOPE__
  }

  setSsrLocation(ssrLocation: AnyLocation): void {
    if (ClientServerHelpers.isClient) {
      ExtractorStore.set('__POINT0_SSR_LOCATION__', ssrLocation)
      return
    }
    this.serverGlobalState.__POINT0_SSR_LOCATION__ = ssrLocation
  }

  setCurrentLocation(currentLocation: AnyLocation): void {
    if (ClientServerHelpers.isClient) {
      ExtractorStore.set('__POINT0_CURRENT_LOCATION__', currentLocation)
      return
    }
    this.serverGlobalState.__POINT0_CURRENT_LOCATION__ = currentLocation
  }

  async withServerGlobalState<T>(callback: () => Promise<T>): Promise<T> {
    return await ExtractorStore.runWithServerStorageProvider(this.serverGlobalState, callback)
  }

  static async extract<TPoint extends EndPoint>({
    extractor,
    point,
    input,
    requiredCtx,
    withLayouts,
  }: {
    point: TPoint
    input: TPoint['Infer']['InputRaw']
    extractor?: ServerExtractor<TPoint['Infer']['RequiredCtx']> | undefined
    withLayouts?: boolean
  } & WithMaybeOptionalReqiredCtx<TPoint['Infer']['RequiredCtx']>): Promise<ServerExtractResult> {
    if (!point._root) {
      throw new Error('Point root not found')
    }
    const location = point._route ? point._route.flat(input) : Route0.getLocation('/')
    const layoutsObject = Object.fromEntries(point._layouts.map((layout) => [`layout_${layout._name}`, layout]))
    extractor ??= await ServerExtractor.create({
      points: PointsManager.ready({ root_ready: point._root, point, ...layoutsObject }),
      currentLocation: location,
      requiredCtx,
      pageLocation: point._pointType === 'page' ? location : undefined,
    })
    return await extractor.extract({ point, input, withLayouts })
  }

  async extract(point: AnyPoint | undefined, input?: InputRaw): Promise<ServerExtractResult>
  async extract({ point, input, withLayouts }: ExtractOptions): Promise<ServerExtractResult>
  async extract(
    ...args: [options: ExtractOptions] | [point: AnyPoint | undefined, input?: InputRaw]
  ): Promise<ServerExtractResult> {
    const {
      point,
      input = {},
      withLayouts = false,
    } = (() => {
      if (args[0] === undefined || '_itIsPoint0' in args[0]) {
        return { point: args[0], input: args[1], withLayouts: false }
      }
      return { point: args[0].point, input: args[0].input, withLayouts: args[0].withLayouts }
    })()

    return await this.withServerGlobalState(async () => {
      if (point?._pointType === 'page' && withLayouts) {
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

      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- we parse input step by step, so we do not need initial parse result
      const { parsedInput, inputError } = (() => {
        if (point?.inputSchema) {
          const parseResult = point.inputSchema.safeParse(input)
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
      let currentStatus = 200
      let currentInputParsed: InputParsed = input
      let currentInputSchema: InputSchema | undefined = undefined
      const serverExtractActions = [...(point?._serverExtractActions ?? [])]

      try {
        for (const serverExtractAction of serverExtractActions) {
          switch (serverExtractAction.type) {
            case 'input': {
              currentInputSchema = currentInputSchema
                ? currentInputSchema.extend(serverExtractAction.schema.shape)
                : serverExtractAction.schema
              const safeParseResult = currentInputSchema.safeParse(input)
              if (safeParseResult.error) {
                return {
                  ctx: this.requiredCtx ?? {},
                  data: {},
                  head: [],
                  error: safeParseResult.error,
                  status: 422,
                  response: undefined,
                }
              }
              currentInputParsed = safeParseResult.data
              break
            }
            case 'ctx': {
              const ex = this.serverExtractActionsWithOutput.find(
                (e) => e.record.unstableId === serverExtractAction.unstableId && e.record.type === 'ctx',
              ) as ServerExtractActionWithOutput<'ctx'> | undefined
              if (ex) {
                currentCtx = { ...ex.output }
              } else {
                currentCtx = await serverExtractAction.fn({
                  ctx: { ...currentCtx },
                  data: { ...currentData },
                  input: currentInputParsed,
                  extract: this.extract.bind(this),
                })
                this.serverExtractActionsWithOutput.push({
                  output: currentCtx,
                  record: serverExtractAction,
                })
              }
              break
            }
            case 'loader': {
              const ex = this.serverExtractActionsWithOutput.find(
                (e) => e.record.unstableId === serverExtractAction.unstableId && e.record.type === 'loader',
              ) as ServerExtractActionWithOutput<'loader'> | undefined
              if (ex) {
                if (Array.isArray(ex.output)) {
                  currentStatus = ex.output[0]
                  currentData = ex.output[1]
                } else {
                  currentData = ex.output
                }
              } else {
                const result = await serverExtractAction.fn({
                  ctx: { ...currentCtx },
                  data: { ...currentData },
                  input: currentInputParsed,
                  extract: this.extract.bind(this),
                })
                if (Array.isArray(result)) {
                  currentStatus = result[0]
                  currentData = result[1]
                } else {
                  currentData = result
                }
                this.serverExtractActionsWithOutput.push({
                  output: result,
                  record: serverExtractAction,
                })
              }
              break
            }
            case 'ctxLoader': {
              const ex = this.serverExtractActionsWithOutput.find(
                (e) => e.record.unstableId === serverExtractAction.unstableId && e.record.type === 'ctxLoader',
              ) as ServerExtractActionWithOutput<'ctxLoader'> | undefined
              if (ex) {
                currentData = { ...ex.output.data }
                currentCtx = { ...ex.output.ctx }
                currentStatus = ex.output.status ?? currentStatus
              } else {
                const { ctx, data, status } = await serverExtractAction.fn({
                  ctx: { ...currentCtx },
                  data: { ...currentData },
                  input: currentInputParsed,
                  extract: this.extract.bind(this),
                })
                currentCtx = ctx
                currentData = data
                currentStatus = status ?? currentStatus
                this.serverExtractActionsWithOutput.push({
                  output: { ctx: currentCtx, data: currentData },
                  record: serverExtractAction,
                })
              }
              break
            }
            // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
            default:
              throw new Error(`Unknown extend function type: ${(serverExtractAction as any).type}`)
          }
        }

        const response = await (async () => {
          if (point?._pointType === 'response') {
            if (!point._responseFn) {
              throw new Error('Response function not found')
            }
            return await point._responseFn({
              ctx: currentCtx,
              data: currentData,
              input: currentInputParsed,
            })
          }
          return undefined
        })()
        if (point) {
          await this.appendQueryClientCache({ data: currentData, point, error: undefined, input })
          return {
            ctx: currentCtx,
            data: currentData,
            head: this.getCurrentPageHead({ point, input, data: currentData, error: null }),
            response,
            error: undefined,
            status: currentStatus,
          }
        } else {
          const error = new Error0(`Point Not Found`)
          await this.appendQueryClientCache({ data: currentData, point, error, input })
          return {
            ctx: currentCtx,
            data: currentData,
            head: this.getCurrentPageHead({ point: this.points.root, input, data: currentData, error }),
            error,
            status: 404,
            response: undefined,
          }
        }
      } catch (error) {
        try {
          await this.appendQueryClientCache({ data: currentData, point, error, input })
          return {
            ctx: currentCtx,
            data: currentData,
            head: this.getCurrentPageHead({ point: point ?? this.points.root, input, data: currentData, error }),
            error,
            status: Error0.from(error).httpStatus ?? 500,
            response: undefined,
          }
        } catch (error2) {
          // in case if we have error in head resolver
          return {
            ctx: currentCtx,
            data: currentData,
            head: [],
            error,
            status: Error0.from(error2).httpStatus ?? 500,
            response: undefined,
          }
        }
      }
    })
  }

  static parseQueryKey(queryKey: OriginalQueryKey | QueryKey):
    | {
        isServer: boolean
        isClient: boolean
        pointType: EndPointType
        pointName: PointName
        outputType: string
        isInfiniteQuery: boolean
        input: InputRaw
      }
    | undefined {
    const [check, serverOrClient, pointType, pointName, outputType, finiteOrInfinite, input] = queryKey
    if (
      check !== 'point0' ||
      typeof serverOrClient !== 'string' ||
      typeof pointType !== 'string' ||
      typeof pointName !== 'string' ||
      typeof outputType !== 'string' ||
      typeof finiteOrInfinite !== 'string' ||
      typeof input !== 'string'
    ) {
      return undefined
    }
    return {
      isServer: serverOrClient === 'server' || serverOrClient === 'combined',
      isClient: serverOrClient === 'client' || serverOrClient === 'combined',
      pointType: pointType as EndPointType,
      pointName,
      outputType,
      isInfiniteQuery: finiteOrInfinite === 'infinite',
      input: JSON.parse(input) as InputRaw,
    }
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
          points: this.points,
        }),
      )
      await stream.allReady
      const queryClientState = this.getQueryClient().getQueryCache().findAll()
      const suitableMarkers = queryClientState.flatMap((query) => {
        const hash = query.queryHash
        if (seenQueryHashes.has(hash)) {
          return []
        }
        const parsedQueryKey = ServerExtractor.parseQueryKey(query.queryKey)
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
        const suitable = this.points.getSuitablePoint({
          pointType: suitableMarker.pointType,
          pointName: suitableMarker.pointName,
          input: suitableMarker.input,
        })
        if (suitable) {
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

  getCurrentPageHead({
    point,
    input,
    data,
    error,
  }: {
    point: AnyPoint
    input: InputRaw
    data: Data
    error: unknown
  }): ResolvableHead[] {
    if (!this.pageLocation) {
      return []
    }
    const useLoaderResult = {
      data: !point._hasClientLoader() ? data : undefined,
      error: error ? Error0.from(error) : null,
      input,
      location: this.pageLocation,
      loading: point._hasClientLoader() && !error,
    }
    return point._extractHead(useLoaderResult)
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
        outputType: 'queryClientDehydratedState',
      })

      // you said you already have this:
      const relatedQueriesDehydratedState = this.getQueryClientDehydratedState()

      // register per-key options (retry, gcTime, etc.)
      const tempQueryClient = ExtractorStore.getConfig('__POINT0_QUERY_CLIENT__')?.init()
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
  input: InputRaw
  withLayouts?: boolean
}
export type ServerExtractActionWithOutput<TType extends 'ctx' | 'loader' | 'ctxLoader'> = TType extends 'ctx'
  ? {
      output: Ctx
      record: ServerExtractAction<'ctx'>
    }
  : TType extends 'loader'
    ? {
        output: Data | [number, Data]
        record: ServerExtractAction<'loader'>
      }
    : TType extends 'ctxLoader'
      ? {
          output: { ctx: Ctx; data: Data; status?: number }
          record: ServerExtractAction<'ctxLoader'>
        }
      : never

export type FetchTask = {
  pointType: EndPointType
  outputType: 'data' | 'response' | 'queryClientDehydratedState'
  pointInput: InputParsed
  scope: PointsScope
  pointName: PointName
}

import { Error0 } from '@devp0nt/error0'
import type { AnyLocation } from '@devp0nt/route0'
import type {
  AnyPoint,
  AppComponent,
  ClientPoints,
  // Ctx,
  Data,
  DataTransformerExtended,
  InputParsed,
  InputRaw,
  InputSchema,
  IsInputOptional,
  LoaderOutput,
  NiceReadyPoint,
  PagePoint,
  PointName,
  PointsScope,
  QueryKey,
  ReadyPoint,
  ReadyPointType,
  RequiredCtx,
  SafeParseInputResult,
  // ServerExecuteAction,
  ServerExecuteResult,
  SuperStoreInternalValues,
  SuperStoreInternalValuesOrErrors,
  UndefinedData,
  UndefinedInputSchema,
  UndefinedLoaderOutput,
  UnknownCtx,
  UnknownData,
} from '@point0/core'
import type { Request0 } from '@point0/core/request0'
import { _ssItems, _ssRunWithServerStorageState } from '@point0/core'
import { Effects } from '@point0/core/effects'
import type { DehydratedState, QueryKey as OriginalQueryKey } from '@tanstack/react-query'
import { dehydrate } from '@tanstack/react-query'
import { createHead } from '@unhead/react/server'
import * as React from 'react'
import type { renderToReadableStream as RenderToReadableStream } from 'react-dom/server'
import { stringify } from 'safe-stable-stringify'
import type { Engine } from './engine.js'

export class Executor<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  engine: Engine
  request: Request0
  effects: Effects
  requiredCtx: TRequiredCtx
  serverStorageState: SuperStoreInternalValues

  private constructor({
    engine,
    request,
    requiredCtx,
    // serverExecuteActionsWithOutput,
    serverStorageState,
    effects,
  }: {
    engine: Engine
    request: Request0
    requiredCtx: TRequiredCtx
    // serverExecuteActionsWithOutput: Array<ServerExecuteActionWithOutput<any>>
    serverStorageState: SuperStoreInternalValues
    effects: Effects
  }) {
    this.engine = engine
    this.request = request
    this.effects = effects
    this.requiredCtx = requiredCtx
    // this.serverExecuteActionsWithOutput = serverExecuteActionsWithOutput
    this.serverStorageState = serverStorageState
  }

  static async create<TRequiredCtx extends RequiredCtx = RequiredCtx>({
    engine,
    request,
    requiredCtx,
    effects,
    serverStorageState: providedServerStorageState,
  }: {
    engine: Engine
    request: Request0
    requiredCtx: TRequiredCtx
    effects: Effects
    serverStorageState: SuperStoreInternalValuesOrErrors
  }): Promise<Executor<TRequiredCtx>> {
    const serverStorageState = Object.assign(providedServerStorageState, {
      __POINT0_FAKE_CLIENT__: undefined,
      __POINT0_FETCH_FN__: engine.fetch.bind(engine),
      __POINT0_REQUEST0__: request,
      __POINT0_EFFECTS__: effects,
      __POINT0_CLIENT_POINTS__: undefined,
      // in case of recursive server response we want preserve query client to keep state
      __POINT0_QUERY_CLIENT_FROM_PARENT_RUN__: undefined,
      __POINT0_QUERY_CLIENT__:
        _ssItems.__POINT0_QUERY_CLIENT_FROM_PARENT_RUN__.getWeak() || _ssItems.__POINT0_QUERY_CLIENT__.config.init(),
      __POINT0_SSR_LOCATION__: undefined,
      __POINT0_CURRENT_LOCATION__: new Error('Current location will exists only on ssr phase') as never,
      __POINT0_ROUTER_CONTEXT__: new Error('Router context will exists only on ssr phase') as never,
      __POINT0_UNHEAD_HEAD__: createHead(),
    } satisfies SuperStoreInternalValues)
    return new Executor<TRequiredCtx>({
      engine,
      request,
      requiredCtx,
      // serverExecuteActionsWithOutput: [],
      effects,
      serverStorageState,
    })
  }

  async withServerGlobalState<T>(callback: () => Promise<T>): Promise<T> {
    return await _ssRunWithServerStorageState(this.serverStorageState, callback)
  }

  private static async parseInputSafeAsync<TInputSchema extends InputSchema | UndefinedInputSchema>(
    inputSchema: TInputSchema,
    ...args: IsInputOptional<TInputSchema> extends true
      ? [input?: InputRaw<TInputSchema>]
      : [input: InputRaw<TInputSchema>]
  ): Promise<SafeParseInputResult<TInputSchema>> {
    const [input = {}] = args
    if (!inputSchema) {
      return {
        success: true,
        data: {} as InputParsed<TInputSchema>,
        error: undefined,
      }
    }
    try {
      const result = await inputSchema['~standard'].validate(input)

      if ('value' in result) {
        return {
          success: true,
          data: result.value as InputParsed<TInputSchema>,
          error: undefined,
        }
      }

      const firstIssue = result.issues.at(0)
      if (!firstIssue) {
        return {
          success: false,
          data: undefined,
          error: new Error0('Unknown input schema error'),
        }
      }
      const path = firstIssue.path?.map((p) => (typeof p === 'object' ? p.key : p)).join('.')
      const message = [path, firstIssue.message].filter(Boolean).join(': ')
      const error = new Error0(message)
      return {
        success: false,
        data: undefined,
        error,
      }
    } catch (error) {
      return { success: false, data: undefined, error: Error0.from(error) }
    }
  }

  private static async parsePointInputSafeAsync<TPoint extends AnyPoint>(
    point: TPoint,
    input: TPoint['Infer']['ServerInputRaw'],
  ): Promise<SafeParseInputResult<TPoint['Infer']['ServerInputSchema']>> {
    const output = {} as InputParsed<TPoint['Infer']['ServerInputSchema']>
    for (const serverExecuteAction of point._serverExecuteActions) {
      if (serverExecuteAction.type === 'input') {
        const result = await Executor.parseInputSafeAsync(serverExecuteAction.schema, input)
        if (!result.success) {
          return result
        }
        Object.assign(output, result.data)
      }
    }
    return { success: true, data: output, error: undefined }
  }

  async execute<
    TPoint extends NiceReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>,
  >(
    point: TPoint,
    ...args: TPoint['Infer']['IsServerInputOptional'] extends true
      ? [input?: TPoint['Infer']['ServerInputRaw'], effects?: Effects]
      : [input: TPoint['Infer']['ServerInputRaw'], effects?: Effects]
  ): Promise<ServerExecuteResult<TPoint['Infer']['Ctx'], TPoint['Infer']['ServerLoaderOutput']>>
  async execute<
    TPoint extends
      | NiceReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
      | ReadyPoint
      | undefined,
  >({
    point,
    input,
    effects,
  }: ExecuteOptions<TPoint>): Promise<
    ServerExecuteResult<
      TPoint extends NiceReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
        ? TPoint['Infer']['Ctx']
        : UnknownCtx,
      TPoint extends NiceReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
        ? TPoint['Infer']['ServerLoaderOutput']
        : UnknownData
    >
  >
  async execute(
    ...args:
      | [options: ExecuteOptions<any>]
      | [
          point:
            | ReadyPoint
            | NiceReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
            | undefined,
          input?: InputRaw,
          effects?: Effects,
        ]
  ): Promise<ServerExecuteResult<any, any>> {
    const {
      point,
      input = {},
      effects = Effects.create(),
    } = ((): {
      point: ReadyPoint | undefined
      input: InputRaw
      effects?: Effects
    } => {
      if (args[0] === undefined || 'Infer' in args[0]) {
        // so it is NiceReadyPoint provided like first argument
        return { point: args[0]?.point, input: args[1] as InputRaw, effects: args[2] }
      }
      // so it is ReadyPoint provided in object
      return {
        point: args[0].point,
        input: args[0].input,
        effects: args[0].effects,
      }
    })()

    return await this.withServerGlobalState(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- we parse input step by step, so we do not need initial parse result
      const { parsedInput, inputError } = await (async () => {
        if (!point) {
          // we will throw 404 later, so input unused
          return { parsedInput: {}, inputError: undefined }
        }
        const result = await Executor.parsePointInputSafeAsync(point, input)
        if (!result.success) {
          return { parsedInput: {}, inputError: result.error }
        }
        return { parsedInput: result.data, inputError: undefined }
      })()
      if (inputError) {
        const status = 422
        effects.set.status(status)
        return {
          ctx: this.requiredCtx ?? {},
          data: {},
          error: Error0.from(inputError),
          status,
          response: undefined,
          output: {},
          effects: effects.values,
          point,
        }
      }

      let currentCtx: UnknownCtx = this.requiredCtx ?? {}
      let currentCtxExposedKeys: string[] = []
      let currentCtxExposed: UnknownCtx = {}
      let currentData: UnknownData | UndefinedData = undefined
      let currentResponse: Response | undefined = undefined
      let currentOutput: LoaderOutput | UndefinedLoaderOutput = currentData
      let currentInputParsed: InputParsed = {}

      try {
        if (!point) {
          const error = new Error0(`Point Not Found`)
          const status = 404
          effects.set.status(status)
          return {
            ctx: currentCtx,
            data: currentData,
            error,
            status,
            response: currentResponse,
            output: currentOutput,
            effects: effects.values,
            point: undefined,
          }
        }

        if (!point._hasServerLoader()) {
          const error = new Error0(`Point "${point.toString()}" has no server loader`)
          const status = 500
          effects.set.status(status)
          return {
            ctx: currentCtx,
            data: currentData,
            error,
            status,
            response: currentResponse,
            output: currentOutput,
            effects: effects.values,
            point,
          }
        }

        for (const serverExecuteAction of point._serverExecuteActions) {
          switch (serverExecuteAction.type) {
            case 'input': {
              const safeParseResult = await Executor.parseInputSafeAsync(serverExecuteAction.schema, input)
              if (safeParseResult.error) {
                const status = 422
                effects.set.status(status)
                return {
                  ctx: this.requiredCtx ?? {},
                  data: currentData,
                  error: Error0.from(safeParseResult.error),
                  status,
                  response: currentResponse,
                  output: currentOutput,
                  effects: effects.values,
                  point,
                }
              }
              currentInputParsed = {
                ...currentInputParsed,
                ...safeParseResult.data,
              }
              break
            }
            case 'ctx': {
              // const ex = this.serverExecuteActionsWithOutput.find(
              //   (e) => e.record.unstableId === serverExecuteAction.unstableId && e.record.type === 'ctx',
              // ) as ServerExecuteActionWithOutput<'ctx'> | undefined
              // if (ex) {
              //   if (Array.isArray(ex.output)) {
              //     const appendCtxExposedKeys =
              //       ex.output.length > 1 ? (ex.output.slice(1) as string[]) : Object.keys(ex.output[0])
              //     currentCtxExposedKeys = [...new Set([...currentCtxExposedKeys, ...appendCtxExposedKeys])]
              //     currentCtx = { ...currentCtx, ...ex.output[0] }
              //     // eslint-disable-next-line @typescript-eslint/no-loop-func
              //     currentCtxExposed = Object.fromEntries(currentCtxExposedKeys.map((key) => [key, currentCtx[key]]))
              //   } else {
              //     currentCtx = { ...currentCtx, ...ex.output }
              //     // eslint-disable-next-line @typescript-eslint/no-loop-func
              //     currentCtxExposed = Object.fromEntries(currentCtxExposedKeys.map((key) => [key, currentCtx[key]]))
              //   }
              // } else {
              const nonPluginOptions = {
                ...currentCtxExposed,
                ctx: { ...currentCtx },
                input: currentInputParsed,
                execute: this.execute.bind(this),
              }
              const pluginOptions = {
                request: this.request,
                set: effects.set,
                point,
              }
              const options = serverExecuteAction.plugin
                ? (pluginOptions as never)
                : { ...nonPluginOptions, ...pluginOptions }
              const result = await serverExecuteAction.fn(options)
              if (Array.isArray(result)) {
                const appendCtxExposedKeys = result.length > 1 ? (result.slice(1) as string[]) : Object.keys(result[0])
                currentCtxExposedKeys = [...new Set([...currentCtxExposedKeys, ...appendCtxExposedKeys])]
                currentCtx = { ...currentCtx, ...result[0] }
                // eslint-disable-next-line @typescript-eslint/no-loop-func
                currentCtxExposed = Object.fromEntries(currentCtxExposedKeys.map((key) => [key, currentCtx[key]]))
              } else {
                currentCtx = { ...currentCtx, ...result }
                // eslint-disable-next-line @typescript-eslint/no-loop-func
                currentCtxExposed = Object.fromEntries(currentCtxExposedKeys.map((key) => [key, currentCtx[key]]))
              }
              // this.serverExecuteActionsWithOutput.push({
              //   output: result,
              //   record: serverExecuteAction,
              // })
              // }
              break
            }
            case 'loader': {
              // const ex = this.serverExecuteActionsWithOutput.find(
              //   (e) => e.record.unstableId === serverExecuteAction.unstableId && e.record.type === 'loader',
              // ) as ServerExecuteActionWithOutput<'loader'> | undefined
              // if (ex) {
              //   if (Array.isArray(ex.output)) {
              //     this.effects.set.status(ex.output[0])
              //     if (ex.output[1] instanceof Response) {
              //       currentResponse = ex.output[1]
              //       currentOutput = ex.output[1]
              //     } else {
              //       currentData = ex.output[1]
              //       currentOutput = ex.output[1]
              //     }
              //   } else {
              //     if (ex.output instanceof Response) {
              //       currentResponse = ex.output
              //       currentOutput = ex.output
              //     } else {
              //       currentData = ex.output
              //       currentOutput = ex.output
              //     }
              //   }
              // } else {
              const nonPluginOptions = {
                ...currentCtxExposed,
                ctx: { ...currentCtx },
                data: { ...currentData },
                input: currentInputParsed,
                execute: this.execute.bind(this),
              }
              const pluginOptions = {
                request: this.request as never,
                set: effects.set,
                point,
              }
              const options = serverExecuteAction.plugin
                ? (pluginOptions as never)
                : { ...nonPluginOptions, ...pluginOptions }
              const promise = serverExecuteAction.fn(options)
              const result = (await (promise as any)) as [number, Data | Response] | Data | Response
              if (Array.isArray(result)) {
                effects.set.status(result[0])
                if (result[1] instanceof Response) {
                  currentResponse = result[1]
                  currentOutput = result[1]
                } else {
                  currentData = result[1]
                  currentOutput = result[1]
                }
              } else {
                if (result instanceof Response) {
                  currentResponse = result
                  currentOutput = result
                } else {
                  currentData = result
                  currentOutput = result
                }
              }
              // this.serverExecuteActionsWithOutput.push({
              //   output: result,
              //   record: serverExecuteAction,
              // })
              // }
              break
            }
            // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
            default:
              throw new Error(`Unknown extend function type: ${(serverExecuteAction as any).type}`)
          }
        }

        if (currentResponse) {
          // if we have response, then we can not have data by design
          currentData = undefined
        }

        const status = effects.status ?? 200
        effects.set.status(status)
        return {
          ctx: currentCtx,
          data: currentData,
          response: currentResponse,
          error: undefined,
          status,
          output: currentOutput,
          effects: effects.values,
          point,
        }
      } catch (error) {
        try {
          const error0 = Error0.from(error)
          const status = error0.httpStatus ?? 500
          effects.set.status(status)
          return {
            ctx: currentCtx,
            data: currentData,
            error: error0,
            status,
            response: currentResponse,
            output: currentOutput,
            effects: effects.values,
            point,
          }
        } catch (error2) {
          const error0 = Error0.from(error)
          const status = error0.httpStatus ?? 500
          effects.set.status(status)
          return {
            ctx: currentCtx,
            data: currentData,
            error: error0,
            status,
            response: currentResponse,
            output: currentOutput,
            effects: effects.values,
            point,
          }
        }
      }
    })
  }

  static parseQueryKey({
    queryKey,
    transformer,
  }: {
    queryKey: OriginalQueryKey | QueryKey
    transformer: DataTransformerExtended
  }):
    | {
        isServer: boolean
        isClient: boolean
        isCombined: boolean
        scope: PointsScope
        pointType: ReadyPointType
        pointName: PointName
        outputType: string
        isInfiniteQuery: boolean
        input: InputRaw
        serverHash: string
      }
    | undefined {
    const [check, scope, pointType, pointName, serverOrClient, finiteOrInfinite, inputStringified, outputType] =
      queryKey
    if (
      check !== 'point0' ||
      typeof serverOrClient !== 'string' ||
      typeof pointType !== 'string' ||
      typeof pointName !== 'string' ||
      typeof outputType !== 'string' ||
      typeof finiteOrInfinite !== 'string' ||
      typeof inputStringified !== 'string' ||
      typeof scope !== 'string'
    ) {
      return undefined
    }
    const isServer = serverOrClient === 'server' || serverOrClient === 'combined'
    const isClient = serverOrClient === 'client' || serverOrClient === 'combined'
    const isCombined = serverOrClient === 'combined'
    const isInfiniteQuery = finiteOrInfinite === 'infinite'
    const serverHash =
      stringify({
        isServer,
        scope,
        pointType,
        pointName,
        outputType,
        isInfiniteQuery,
        inputStringified,
      }) ?? 'unknown'
    return {
      isServer,
      isClient,
      isCombined,
      scope,
      pointType: pointType as ReadyPointType,
      pointName,
      outputType,
      isInfiniteQuery,
      input: transformer.parse<InputRaw>(inputStringified),
      serverHash,
    }
  }

  async prefetchAppPagePointDeep({
    App,
    clientPoints,
    renderToReadableStream,
    pagePoint,
    pageLocation,
    input,
    seenQueryHashes = new Set<string>(),
    level = 0,
  }: {
    App: AppComponent
    clientPoints: ClientPoints
    renderToReadableStream: typeof RenderToReadableStream
    pagePoint: PagePoint | undefined
    pageLocation: AnyLocation
    input: InputRaw
    seenQueryHashes?: Set<string>
    level?: number
  }): Promise<void> {
    if (level === 0) {
      this.serverStorageState.__POINT0_CURRENT_LOCATION__ = pageLocation
      this.serverStorageState.__POINT0_SSR_LOCATION__ = pageLocation
      this.serverStorageState.__POINT0_CLIENT_POINTS__ = clientPoints
    }
    await this.withServerGlobalState(async () => {
      const stream = await renderToReadableStream(
        React.createElement(App, {
          points: clientPoints,
        }),
      )
      await stream.allReady
      const queryClientState = _ssItems.__POINT0_QUERY_CLIENT__.get().getQueryCache().findAll()
      const suitableMarkers = queryClientState.flatMap((query) => {
        const parsedQueryKey = Executor.parseQueryKey({
          queryKey: query.queryKey,
          transformer: clientPoints.transformer,
        })
        if (!parsedQueryKey) {
          return []
        }
        if (seenQueryHashes.has(parsedQueryKey.serverHash)) {
          return []
        }
        if (!parsedQueryKey.isServer) {
          return []
        }
        if (parsedQueryKey.outputType !== 'data') {
          return []
        }
        seenQueryHashes.add(parsedQueryKey.serverHash)
        return parsedQueryKey
      })

      if (suitableMarkers.length === 0) {
        if (level === 0 && pagePoint) {
          await this.addPrefetchPageDehydratedStateToQueryClient({ pagePoint, input })
        }
        return
      }

      for (const suitableMarker of suitableMarkers) {
        const exactPoint = this.engine.server.points?.findExact({
          scope: suitableMarker.scope,
          type: suitableMarker.pointType,
          name: suitableMarker.pointName,
        })
        if (exactPoint) {
          if (exactPoint._queryResultType === 'infiniteQuery') {
            await exactPoint.prefetchInfiniteQuery(suitableMarker.input, undefined, { force: true, mode: 'server' })
          } else {
            await exactPoint.prefetchQuery(suitableMarker.input, undefined, { force: true, mode: 'server' })
          }
        }
      }

      await this.prefetchAppPagePointDeep({
        App,
        renderToReadableStream,
        pagePoint,
        pageLocation,
        clientPoints,
        input,
        seenQueryHashes,
        level: level + 1,
      })

      if (level === 0 && pagePoint) {
        await this.addPrefetchPageDehydratedStateToQueryClient({ pagePoint, input })
      }
    })
  }

  async getQueryClientReadyDehydratedState(): Promise<DehydratedState> {
    const result = await this.withServerGlobalState(async () => {
      const dehydratedState = dehydrate(_ssItems.__POINT0_QUERY_CLIENT__.get(), {
        shouldDehydrateQuery: (query) => {
          // This will include all queries, including failed ones
          return true
        },
      })
      return dehydratedState
    })
    result.queries = result.queries.filter((query) => query.state.status !== 'pending')
    return result
  }

  async addPrefetchPageDehydratedStateToQueryClient({
    pagePoint,
    input,
  }: {
    pagePoint: ReadyPoint
    input: InputRaw
  }): Promise<void> {
    await this.withServerGlobalState(async () => {
      // do not uncomment it. If page itself has no loaders, it does not mean, that it not has any components which has loaders
      // if (!pagePoint._hasLoader()) {
      //   return
      // }
      const prefetchPageQueryOptions = pagePoint._getServerQueryOptions({
        input,
        queryOptions: undefined,
        fetchOptions: undefined,
        outputType: 'queryClientDehydratedState',
      })
      const relatedQueriesDehydratedState = await this.getQueryClientReadyDehydratedState()
      const queryClient = _ssItems.__POINT0_QUERY_CLIENT__.get()
      const { queryKey, ...restOptions } = prefetchPageQueryOptions
      queryClient.setQueryDefaults(prefetchPageQueryOptions.queryKey, {
        ...(restOptions as any),
      })
      queryClient.setQueryData(prefetchPageQueryOptions.queryKey, {
        dehydratedState: relatedQueriesDehydratedState,
      })
    })
  }
}

export type ExecuteOptions<
  TPoint extends
    | ReadyPoint
    | NiceReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
    | undefined,
> = {
  point?: TPoint | undefined
  input: TPoint extends ReadyPoint ? TPoint['Infer']['ServerInputRaw'] : InputRaw
  effects?: Effects
}

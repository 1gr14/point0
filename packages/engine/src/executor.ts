import { Error0 } from '@devp0nt/error0'
import type { AnyLocation } from '@devp0nt/route0'
import type {
  AnyPoint,
  AppComponent,
  // Ctx,
  Data,
  DataTransformerExtended,
  EndPoint,
  EndPointType,
  InputParsed,
  InputRaw,
  InputSchema,
  IsInputOptional,
  LoaderOutput,
  NiceEndPoint,
  PagePoint,
  PointName,
  PointsDefinition,
  PointsScope,
  QueryKey,
  Request0,
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
import { _ssItems, _ssRunWithServerStorageState, PointsManager, Response0 } from '@point0/core'
import type { DehydratedState, QueryKey as OriginalQueryKey } from '@tanstack/react-query'
import { dehydrate } from '@tanstack/react-query'
import { createHead } from '@unhead/react/server'
import * as React from 'react'
import type { renderToReadableStream as RenderToReadableStream } from 'react-dom/server'
import type { Engine } from './engine.js'
import { stringify } from 'safe-stable-stringify'

export class Executor<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  engine: Engine
  request: Request0
  response0: Response0
  pointsManager: PointsManager<true, TRequiredCtx>
  // serverExecuteActionsWithOutput: Array<ServerExecuteActionWithOutput<any>>
  pageLocation: AnyLocation | undefined
  requiredCtx: TRequiredCtx
  serverStorageState: SuperStoreInternalValues

  private constructor({
    engine,
    request,
    pointsManager,
    pageLocation,
    requiredCtx,
    // serverExecuteActionsWithOutput,
    serverStorageState,
    response0,
  }: {
    engine: Engine
    request: Request0
    pointsManager: PointsManager<true, TRequiredCtx>
    pageLocation: AnyLocation | undefined
    requiredCtx: TRequiredCtx
    // serverExecuteActionsWithOutput: Array<ServerExecuteActionWithOutput<any>>
    serverStorageState: SuperStoreInternalValues
    response0: Response0
  }) {
    this.engine = engine
    this.request = request
    this.response0 = response0
    this.pointsManager = pointsManager
    this.pageLocation = pageLocation
    this.requiredCtx = requiredCtx
    // this.serverExecuteActionsWithOutput = serverExecuteActionsWithOutput
    this.serverStorageState = serverStorageState
  }

  static async create<TRequiredCtx extends RequiredCtx = RequiredCtx>({
    engine,
    request,
    points,
    pageLocation,
    currentLocation,
    requiredCtx,
    response0,
    serverStorageState: providedServerStorageState,
  }: {
    engine: Engine
    request: Request0
    points: PointsManager<boolean, TRequiredCtx> | PointsDefinition
    currentLocation: AnyLocation
    requiredCtx: TRequiredCtx
    pageLocation: AnyLocation | undefined
    response0: Response0
    serverStorageState: SuperStoreInternalValuesOrErrors
  }): Promise<Executor<TRequiredCtx>> {
    const pointsManager = (await PointsManager.create(points).load()) as PointsManager<true, TRequiredCtx>
    const serverStorageState = Object.assign(providedServerStorageState, {
      __POINT0_FAKE_CLIENT__: undefined,
      __POINT0_FETCH_FN__: engine.fetch.bind(engine),
      __POINT0_REQUEST0__: request,
      __POINT0_RESPONSE0__: response0,
      __POINT0_CLIENT_SCOPE__: pointsManager.scope,
      // in case of recursive server response we want preserve query client to keep state
      __POINT0_QUERY_CLIENT_FROM_PARENT_RUN__: undefined,
      __POINT0_QUERY_CLIENT__:
        _ssItems.__POINT0_QUERY_CLIENT_FROM_PARENT_RUN__.getWeak() || _ssItems.__POINT0_QUERY_CLIENT__.config.init(),
      __POINT0_SSR_LOCATION__: undefined,
      __POINT0_CURRENT_LOCATION__: currentLocation,
      __POINT0_UNHEAD_HEAD__: createHead(),
    } satisfies SuperStoreInternalValues)
    return new Executor<TRequiredCtx>({
      engine,
      request,
      pointsManager,
      pageLocation,
      requiredCtx,
      // serverExecuteActionsWithOutput: [],
      response0,
      serverStorageState,
    })
  }

  async withServerGlobalState<T>(callback: () => Promise<T>): Promise<T> {
    return await _ssRunWithServerStorageState(this.serverStorageState, callback)
  }

  // maybe not needed helpers to execute points

  // static createRequestByPointAndInput<TPoint extends EndPoint>({
  //   point,
  //   input,
  // }: {
  //   point: TPoint
  //   input: TPoint['Infer']['InputRaw']
  // }): Request {
  //   // TODO: generate real request by point and input
  //   return new Request(`http://localhost:3000/_point0/TODO:FIXME`)
  // }

  // static createRequestByPointScopeTypeNameInput({
  //   scope,
  //   pointType,
  //   pointName,
  //   input,
  // }: {
  //   scope: PointsScope
  //   pointType: EndPointType
  //   pointName: PointName
  //   input: InputRaw
  // }): Request {
  //   // TODO: generate real request by point scope type name and input
  //   return new Request(`http://localhost:3000/_point0/TODO:FIXME`)
  // }

  // static async execute<TPoint extends EndPoint>({
  //   engine,
  //   executor,
  //   point,
  //   input,
  //   requiredCtx,
  //   withLayouts,
  //   response0,
  // }: {
  //   engine: Engine
  //   point: TPoint
  //   input: TPoint['Infer']['InputRaw']
  //   executor?: Executor<TPoint['Infer']['RequiredCtx']> | undefined
  //   withLayouts?: boolean
  //   response0?: Response0
  // } & WithMaybeOptionalReqiredCtx<TPoint['Infer']['RequiredCtx']>): Promise<
  //   ServerExecuteResult<TPoint['Infer']['Ctx'], TPoint['Infer']['ServerLoaderOutput']>
  // > {
  //   if (!point._root) {
  //     throw new Error('Point root not found')
  //   }
  //   const location = point.route ? point.route.flat(input) : Route0.getLocation('/')
  //   const layoutsObject = Object.fromEntries(point._layouts.map((layout) => [`layout_${layout.name}`, layout]))
  //   executor ??= await Executor.create({
  //     engine,
  //     request: Executor.createRequestByPointAndInput({ point, input }),
  //     points: { _root: point._root, point, ...layoutsObject },
  //     currentLocation: location,
  //     requiredCtx,
  //     pageLocation: point.type === 'page' ? location : undefined,
  //   })
  //   return await executor.execute({ point, input, withLayouts, response0 })
  // }

  // old execute method

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

  // parseClientInput(
  //   ...args: IsInputOptional<TClientInputSchema> extends true
  //     ? [input?: InputRaw<TClientInputSchema>]
  //     : [input: InputRaw<TClientInputSchema>]
  // ): InputParsed<TClientInputSchema> {
  //   const result = this.parseClientInputSafe(...args)
  //   if (!result.success) {
  //     throw result.error
  //   }
  //   return result.data
  // }

  async execute<TPoint extends NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>>(
    point: TPoint,
    ...args: TPoint['Infer']['ServerInputOptional'] extends true
      ? [input?: TPoint['Infer']['ServerInputRaw'], response0?: Response0]
      : [input: TPoint['Infer']['ServerInputRaw'], response0?: Response0]
  ): Promise<ServerExecuteResult<TPoint['Infer']['Ctx'], TPoint['Infer']['ServerLoaderOutput']>>
  async execute<
    TPoint extends
      | NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
      | EndPoint
      | undefined,
  >({
    point,
    input,
    response0,
  }: ExecuteOptions<TPoint>): Promise<
    ServerExecuteResult<
      TPoint extends NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
        ? TPoint['Infer']['Ctx']
        : UnknownCtx,
      TPoint extends NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
        ? TPoint['Infer']['ServerLoaderOutput']
        : UnknownData
    >
  >
  async execute(
    ...args:
      | [options: ExecuteOptions<any>]
      | [
          point:
            | EndPoint
            | NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
            | undefined,
          input?: InputRaw,
          response0?: Response0,
        ]
  ): Promise<ServerExecuteResult<any, any>> {
    const {
      point,
      input = {},
      response0 = Response0.create(),
    } = ((): {
      point: EndPoint | undefined
      input: InputRaw
      response0?: Response0
    } => {
      if (args[0] === undefined || 'Infer' in args[0]) {
        // so it is NiceEndPoint provided like first argument
        return { point: args[0]?.point, input: args[1] as InputRaw, response0: args[2] }
      }
      // so it is EndPoint provided in object
      return {
        point: args[0].point,
        input: args[0].input,
        response0: args[0].response0,
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
        response0.set.status(status)
        return {
          ctx: this.requiredCtx ?? {},
          data: {},
          error: Error0.from(inputError),
          status,
          response: undefined,
          output: {},
          effects: response0.effects,
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
          response0.set.status(status)
          return {
            ctx: currentCtx,
            data: currentData,
            error,
            status,
            response: currentResponse,
            output: currentOutput,
            effects: response0.effects,
          }
        }

        for (const serverExecuteAction of point._serverExecuteActions) {
          switch (serverExecuteAction.type) {
            case 'input': {
              const safeParseResult = await Executor.parseInputSafeAsync(serverExecuteAction.schema, input)
              if (safeParseResult.error) {
                const status = 422
                response0.set.status(status)
                return {
                  ctx: this.requiredCtx ?? {},
                  data: currentData,
                  error: Error0.from(safeParseResult.error),
                  status,
                  response: currentResponse,
                  output: currentOutput,
                  effects: response0.effects,
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
              const result = await serverExecuteAction.fn({
                ...currentCtxExposed,
                ctx: { ...currentCtx },
                input: currentInputParsed,
                execute: this.execute.bind(this),
                request: this.request,
                set: response0.set,
                point,
              })
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
              //     this.response0.set.status(ex.output[0])
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
              const result: [number, Data | Response] | Data | Response = await serverExecuteAction.fn({
                ...currentCtxExposed,
                ctx: { ...currentCtx },
                data: { ...currentData },
                input: currentInputParsed,
                execute: this.execute.bind(this),
                request: this.request as never,
                set: response0.set,
                point,
              })
              if (Array.isArray(result)) {
                response0.set.status(result[0])
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

        const status = response0.status ?? 200
        response0.set.status(status)
        return {
          ctx: currentCtx,
          data: currentData,
          response: currentResponse,
          error: null,
          status,
          output: currentOutput,
          effects: response0.effects,
        }
      } catch (error) {
        try {
          const error0 = Error0.from(error)
          const status = error0.httpStatus ?? 500
          response0.set.status(status)
          return {
            ctx: currentCtx,
            data: currentData,
            error: error0,
            status,
            response: currentResponse,
            output: currentOutput,
            effects: response0.effects,
          }
        } catch (error2) {
          const error0 = Error0.from(error)
          const status = error0.httpStatus ?? 500
          response0.set.status(status)
          return {
            ctx: currentCtx,
            data: currentData,
            error: error0,
            status,
            response: currentResponse,
            output: currentOutput,
            effects: response0.effects,
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
        pointType: EndPointType
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
      pointType: pointType as EndPointType,
      pointName,
      outputType,
      isInfiniteQuery,
      input: transformer.parse<InputRaw>(inputStringified),
      serverHash,
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
    pagePoint: PagePoint | undefined
    pageLocation: AnyLocation
    input: InputRaw
    seenQueryHashes?: Set<string>
    level?: number
  }): Promise<void> {
    if (level === 0) {
      this.serverStorageState.__POINT0_CURRENT_LOCATION__ = pageLocation
      this.serverStorageState.__POINT0_SSR_LOCATION__ = pageLocation
    }
    await this.withServerGlobalState(async () => {
      const stream = await renderToReadableStream(
        React.createElement(App, {
          points: this.pointsManager,
        }),
      )
      await stream.allReady
      const queryClientState = _ssItems.__POINT0_QUERY_CLIENT__.get().getQueryCache().findAll()
      const suitableMarkers = queryClientState.flatMap((query) => {
        const parsedQueryKey = Executor.parseQueryKey({
          queryKey: query.queryKey,
          transformer: this.pointsManager.transformer,
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
        const suitable = this.pointsManager.getSuitablePoint({
          scope: suitableMarker.scope,
          pointType: suitableMarker.pointType,
          pointName: suitableMarker.pointName,
          input: suitableMarker.input,
        })
        if (suitable) {
          // ...we want fully imitate spa behaviour on server, so we should not just execute, but do full fetch request to keep all middlewares and side effects
          // await this.execute({
          //   point: suitable.point,
          //   input: suitableMarker.input,
          //   response0: suitable.point === pagePoint ? this.response0 : undefined, // if it is loader for desired page, then we want it to be applied to executor response0, else new one will be created
          // })
          // ...here underth hood point already use engine.fetch, not native fetch, so no real request to url
          // const { response } = await suitable.point.fetchDetailed(suitableMarker.input)
          // if (response) {
          //   const cookies = Response0.parseCookies(response)
          //   for (const cookie of cookies) {
          //     this.response0.set.cookies(cookie)
          //   }
          // }
          // ...I think better use prefetchQuery.
          // console.log(123123, _ssItems.__POINT0_REQUEST0__.getWeak())
          // await suitable.point.prefetchQuery(suitableMarker.input)
          if (suitable.point._queryResultType === 'infiniteQuery') {
            await suitable.point.prefetchInfiniteQuery(suitableMarker.input, undefined, { force: true, mode: 'server' })
          } else {
            await suitable.point.prefetchQuery(suitableMarker.input, undefined, { force: true, mode: 'server' })
          }
        }
      }

      await this.prefetchAppPagePointDeep({
        App,
        renderToReadableStream,
        pagePoint,
        pageLocation,
        input,
        seenQueryHashes,
        level: level + 1,
      })

      if (level === 0 && pagePoint) {
        await this.addPrefetchPageDehydratedStateToQueryClient({ pagePoint, input })
      }
    })
  }

  // async prefetchAppPagePointDeep({
  //   App,
  //   renderToReadableStream,
  //   pagePoint,
  //   pageLocation,
  //   input,
  //   seenQueryHashes = new Set<string>(),
  //   level = 0,
  // }: {
  //   App: AppComponent
  //   renderToReadableStream: typeof RenderToReadableStream
  //   pagePoint: PagePoint | undefined
  //   pageLocation: AnyLocation
  //   input: InputRaw
  //   seenQueryHashes?: Set<string>
  //   level?: number
  // }): Promise<void> {
  //   if (level === 0) {
  //     this.serverStorageState.__POINT0_CURRENT_LOCATION__ = pageLocation
  //     this.serverStorageState.__POINT0_SSR_LOCATION__ = pageLocation
  //   }
  //   await this.withServerGlobalState(async () => {
  //     const stream = await renderToReadableStream(
  //       React.createElement(App, {
  //         points: this.pointsManager,
  //       }),
  //     )
  //     await stream.allReady
  //     const queryClientState = _ssItems.__POINT0_QUERY_CLIENT__.get().getQueryCache().findAll()
  //     const suitableMarkers = queryClientState.flatMap((query) => {
  //       const hash = query.queryHash
  //       if (seenQueryHashes.has(hash)) {
  //         return []
  //       }
  //       const parsedQueryKey = Executor.parseQueryKey({
  //         queryKey: query.queryKey,
  //         transformer: this.pointsManager.transformer,
  //       })
  //       if (!parsedQueryKey) {
  //         return []
  //       }
  //       if (!parsedQueryKey.isServer) {
  //         return []
  //       }
  //       if (parsedQueryKey.outputType !== 'data') {
  //         return []
  //       }
  //       seenQueryHashes.add(hash)
  //       return parsedQueryKey
  //     })

  //     if (suitableMarkers.length === 0) {
  //       if (level === 0 && pagePoint) {
  //         await this.addPrefetchPageDehydratedStateToQueryClient({ pagePoint, input })
  //       }
  //       return
  //     }

  //     for (const suitableMarker of suitableMarkers) {
  //       const suitable = this.pointsManager.getSuitablePoint({
  //         scope: suitableMarker.scope,
  //         pointType: suitableMarker.pointType,
  //         pointName: suitableMarker.pointName,
  //         input: suitableMarker.input,
  //       })
  //       if (suitable) {
  //         await this.execute({
  //           point: suitable.point,
  //           input: suitableMarker.input,
  //           response0: suitable.point === pagePoint ? this.response0 : undefined, // if it is loader for desired page, then we want it to be applied to executor response0, else new one will be created
  //         })
  //       }
  //     }

  //     await this.prefetchAppPagePointDeep({
  //       App,
  //       renderToReadableStream,
  //       pagePoint,
  //       pageLocation,
  //       input,
  //       seenQueryHashes,
  //     })

  //     if (level === 0 && pagePoint) {
  //       await this.addPrefetchPageDehydratedStateToQueryClient({ pagePoint, input })
  //     }
  //   })
  // }

  // async appendQueryClientCache({
  //   data,
  //   input,
  //   error,
  //   point,
  // }: {
  //   data: Data
  //   input: InputParsed
  //   error: unknown
  //   point: EndPoint | undefined
  // }): Promise<void> {
  //   await this.withServerGlobalState(async () => {
  //     if (
  //       point &&
  //       (point.type === 'query' ||
  //         point.type === 'infiniteQuery' ||
  //         point.type === 'page' ||
  //         point.type === 'layout' ||
  //         point.type === 'provider' ||
  //         point.type === 'component')
  //     ) {
  //       const queryKey = point._getServerQueryKey({
  //         input,
  //         isInfiniteQuery: point._queryResultType === 'infiniteQuery',
  //       })
  //       const query = _ssItems.__POINT0_QUERY_CLIENT__
  //         .get()
  //         .getQueryCache()
  //         .build(_ssItems.__POINT0_QUERY_CLIENT__.get(), { queryKey, queryHash: hashKey(queryKey) })
  //       if (error) {
  //         query.setState({
  //           data: undefined,
  //           error: { ...Error0.toJSON(error), name: 'Error0' },
  //           status: 'error',
  //           fetchStatus: 'idle',
  //         })
  //       } else {
  //         const query = _ssItems.__POINT0_QUERY_CLIENT__
  //           .get()
  //           .getQueryCache()
  //           .build(_ssItems.__POINT0_QUERY_CLIENT__.get(), { queryKey, queryHash: hashKey(queryKey) })
  //         if (point._queryResultType === 'infiniteQuery') {
  //           const pageParam =
  //             (input as any)?.[point._infiniteQueryOptions.pageParamFromInput] ||
  //             point._infiniteQueryOptions.initialPageParam
  //           query.setState({
  //             data: {
  //               pages: Array.isArray(data) ? data : [data],
  //               pageParams: [pageParam], // or your actual param if known
  //             },
  //             error: null,
  //             status: 'success',
  //             fetchStatus: 'idle',
  //           })
  //         } else {
  //           query.setState({
  //             data,
  //             error: null,
  //             status: 'success',
  //             fetchStatus: 'idle',
  //           })
  //         }
  //       }
  //     }
  //   })
  // }

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
    pagePoint: EndPoint
    input: InputRaw
  }): Promise<void> {
    await this.withServerGlobalState(async () => {
      // do not uncomment it. If page itself has no loaders, it does not mean, that it not has any components which has loaders
      // if (!pagePoint._hasLoader()) {
      //   return
      // }
      const prefetchPageQueryOptions = pagePoint._getServerQueryOptions({
        input,
        // location: this.pageLocation as AnyLocation,
        // queryClient: _ssItems.__POINT0_QUERY_CLIENT__.get(),
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

      // // register per-key options (retry, gcTime, etc.)
      // const tempQueryClient = _ssItems.__POINT0_QUERY_CLIENT__.config.init()
      // // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      // if (!tempQueryClient) {
      //   throw new Error('Query client not found')
      // }
      // const { queryKey, ...restOptions } = prefetchPageQueryOptions
      // tempQueryClient.setQueryDefaults(prefetchPageQueryOptions.queryKey, {
      //   ...(restOptions as any),
      // })
      // tempQueryClient.setQueryData(prefetchPageQueryOptions.queryKey, {
      //   dehydratedState: relatedQueriesDehydratedState,
      // })
      // const tempDehydratedState = dehydrate(tempQueryClient)
      // _ssItems.__POINT0_QUERY_CLIENT__.get().clear()
      // hydrate(_ssItems.__POINT0_QUERY_CLIENT__.get(), tempDehydratedState)
    })
  }
}

export type ExecuteOptions<
  TPoint extends
    | EndPoint
    | NiceEndPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
    | undefined,
> = {
  point?: TPoint | undefined
  input: TPoint extends EndPoint ? TPoint['Infer']['ServerInputRaw'] : InputRaw
  response0?: Response0
}

// export type ServerExecuteActionWithOutput<TType extends 'ctx' | 'loader'> = TType extends 'ctx'
//   ? {
//       output: Ctx | [Ctx, ...string[]]
//       record: ServerExecuteAction<'ctx'>
//     }
//   : TType extends 'loader'
//     ? {
//         output: Data | Response | [number, Data | Response]
//         record: ServerExecuteAction<'loader'>
//       }
//     : never

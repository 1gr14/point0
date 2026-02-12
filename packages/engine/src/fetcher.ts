import { Error0 } from '@devp0nt/error0'
import type { AnyLocation, CallableRoute, ExactLocation } from '@devp0nt/route0'
import type {
  Data,
  FetcherFetchDetailedResult,
  FetcherFetchDetailedResultGeneral,
  FetcherFetchDetailedResultNoMiddleware,
  FetchTask,
  InputRawUnknown,
  MiddlewareFn,
  MiddlewareFnOptionsBase,
  PagePoint,
  PointsScope,
  ReadyPoint,
  RequiredCtx,
  RootPoint,
  SuperStoreInternalValuesOrErrors,
} from '@point0/core'
import {
  _getSsItemsWithRestErrors,
  _ssItems,
  _ssRunWithServerStorageState,
  blankDataTransformerExtended,
  Request0,
} from '@point0/core'
import { Effects } from '@point0/core/effects'
import { unflatten } from 'flat'
import type { EngineClient } from './client.js'
import type { Engine } from './engine.js'
import { toJsonErrorResponse } from './error.js'
import { Executor } from './executor.js'
import type { Publicdir } from './publicdir.js'
import type { EngineServer } from './server.js'
import { generateId } from './utils.js'

export class Fetcher {
  engine: Engine<RequiredCtx, true>
  server: EngineServer<true>

  private constructor({ engine, server }: { engine: Engine<RequiredCtx, true>; server: EngineServer<true> }) {
    this.engine = engine
    this.server = server
  }

  static create({ engine, server }: { engine: Engine<RequiredCtx, true>; server: EngineServer<true> }): Fetcher {
    return new Fetcher({ engine, server })
  }

  static fetchAbsFilePathOnDevServer = async ({ request }: { request: Request0 }): Promise<Response | undefined> => {
    // if it is client bun dev server and assets was imported on ssr it returns abs file paths not bun assets, so just in dev we try to fetch them
    if (process.env.NODE_ENV === 'production') {
      return undefined
    }
    const absPath = request.location.pathname
    const bunFile = Bun.file(absPath)
    if (await bunFile.exists()) {
      return new Response(Bun.file(absPath))
    }
    return undefined
  }

  getTaskFromRequest = async ({ request }: { request: Request0 }): Promise<FetchTask | undefined> => {
    if (request.location.pathname !== '/_point0') {
      return undefined
    }
    const searchParams = request.location.searchParams
    const validPointTypes = ['page', 'layout', 'component', 'query', 'infiniteQuery', 'mutation', 'provider'] as const
    const validOutputTypes = ['data', 'queryClientDehydratedState'] as const
    const { type: pointType, output: outputType, scope, name: pointName } = searchParams as Record<string, unknown>
    if (typeof scope !== 'string' || scope.length === 0) {
      throw new Error(`Invalid scope: must be a non-empty string, got ${typeof scope}`)
    }
    if (!validPointTypes.includes(pointType as (typeof validPointTypes)[number])) {
      throw new Error(`Invalid pointType: must be one of ${validPointTypes.join(', ')}, got ${typeof pointType}`)
    }
    if (typeof pointName !== 'string' || pointName.length === 0) {
      throw new Error(`Invalid pointName: must be a non-empty string, got ${typeof pointName}`)
    }
    if (!validOutputTypes.includes(outputType as (typeof validOutputTypes)[number])) {
      throw new Error(`Invalid outputType: must be one of ${validOutputTypes.join(', ')}, got ${typeof outputType}`)
    }
    const pointInput = await (async () => {
      if (pointType === 'page' || pointType === 'layout') {
        return await this.getPointInputFromTaskRequest({ request, scope })
      }
      return undefined
    })()
    return {
      pointType: pointType as (typeof validPointTypes)[number],
      outputType: outputType as (typeof validOutputTypes)[number],
      scope,
      pointName,
      pointInput,
    }
  }

  private readonly _getPointInputFromTaskRequest = async ({
    request,
    scope,
  }: {
    request: Request0
    scope: PointsScope
  }): Promise<InputRawUnknown> => {
    if (request.location.pathname !== '/_point0') {
      return {}
    }
    const inputRawNotTransformed = await (async () => {
      if (request.original.headers.get('Content-Type')?.includes('multipart/form-data')) {
        const formData = await request.original.formData()
        const parsed = [...formData.entries()].reduce<Record<string, unknown>>((acc, [key, value]) => {
          if (typeof value === 'string') {
            acc[key] = JSON.parse(value)
          } else {
            acc[key] = value
          }
          return acc
        }, {})
        const unflattened = unflatten(parsed)
        return unflattened
      }
      try {
        return await request.original.json()
      } catch (error) {
        return {}
      }
    })()
    if (
      !inputRawNotTransformed ||
      typeof inputRawNotTransformed !== 'object' ||
      Array.isArray(inputRawNotTransformed)
    ) {
      throw new Error(`Invalid body point input: must be an object, got ${typeof inputRawNotTransformed}`)
    }
    const transformer =
      this.server.points?.getTransformerByScope({
        scope,
      }) || blankDataTransformerExtended
    const inputRaw = transformer.deserialize<InputRawUnknown>(inputRawNotTransformed)
    return inputRaw
  }
  getPointInputFromTaskRequest = async ({
    request,
    scope,
  }: {
    request: Request0
    scope: PointsScope
  }): Promise<InputRawUnknown> => {
    if (request.state.__POINT0_RAW_UNKNOWN_INPUT__) {
      return request.state.__POINT0_RAW_UNKNOWN_INPUT__ as InputRawUnknown
    }
    const result = await this._getPointInputFromTaskRequest({ request, scope })
    request.state.__POINT0_RAW_UNKNOWN_INPUT__ = result
    return result
  }

  private readonly _getPointInputFormSuitablePageLocation = ({
    pageLocation,
  }: {
    pageLocation: ExactLocation | AnyLocation
  }): InputRawUnknown => {
    return { ...pageLocation.searchParams, ...pageLocation.params }
  }
  getPointInputFormSuitablePageLocation = ({
    pageLocation,
    request,
  }: {
    pageLocation: ExactLocation | AnyLocation
    request: Request0
  }): InputRawUnknown => {
    const result = this._getPointInputFormSuitablePageLocation({ pageLocation })
    request.state.__POINT0_RAW_UNKNOWN_INPUT__ = result
    return result
  }

  // private readonly _getPointInput = async ({
  //   suitable,
  //   task,
  //   request,
  // }: {
  //   suitable: GetSuitableResult
  //   task: FetchTask | undefined
  //   request: Request0
  // }): Promise<InputRawUnknown> => {
  //   // we do not call it immediatelly, becouse for openapi points we do not want parse input, so developer can read body when it needed
  //   if (task?.pointInput) {
  //     return task.pointInput
  //   }
  //   const inputFromTaskRequest = await this.getPointInputFromTaskRequest({
  //     request,
  //     scope: suitable.pointsManager.scope,
  //   })
  //   if (inputFromTaskRequest) {
  //     return inputFromTaskRequest
  //   }
  //   const inputFromSuitablePageOrLayout = this.getPointInputFormSuitablePageOrLayout({ suitable, request })
  //   if (inputFromSuitablePageOrLayout) {
  //     return inputFromSuitablePageOrLayout
  //   }
  //   return {}
  // }

  // getPointInput = async ({
  //   suitable,
  //   task,
  //   request,
  // }: {
  //   suitable: GetSuitableResult
  //   task: FetchTask | undefined
  //   request: Request0
  // }): Promise<InputRawUnknown> => {
  //   const result = await this._getPointInput({ suitable, task, request })
  //   request.state.__POINT0_RAW_UNKNOWN_INPUT__ = result
  //   return result
  // }

  prepareFetch = async ({
    originalRequest,
    bunServer,
  }: {
    originalRequest: Request
    bunServer?: Bun.Server<unknown>
  }): Promise<PrepareFetchResult> => {
    const effects = Effects.create()
    const isFromServer =
      '__POINT0_IS_SERVER_REQUEST__' in originalRequest && originalRequest.__POINT0_IS_SERVER_REQUEST__ === true
    const request = Request0.create(originalRequest, {
      bunServer: bunServer || this.server.bunServer,
      id: generateId(),
      isFromServer,
    })

    // TODO:ASAP when action will be available allow it first
    if (request.method === 'options') {
      return {
        scope: this.server.scope,
        request,
        effects,
        middlewares: [],
        middlewareOptions: {
          request,
          set: effects.set,
          point: undefined,
          scope: this.server.scope,
          variant: 'unknown',
        },
        publicdirResult: undefined,
        taskPointResult: undefined,
        pagePointResult: undefined,
        actionPointResult: undefined,
        errorResult: new Error0('OPTIONS request must be handled by middleware before point execution', {
          httpStatus: 500,
          meta: {
            method: request.original.method,
            url: request.original.url,
          },
        }),
      }
    }

    for (const publicdir of this.server.publicdirs) {
      const staticResponse = await publicdir.fetch({ request })
      if (staticResponse) {
        const scope = publicdir.scope
        return {
          scope,
          request,
          effects,
          middlewares:
            this.server.points?.middlewares.get(publicdir.scope) ??
            this.server.points?.middlewares.get(this.server.scope) ??
            [],
          middlewareOptions: {
            request,
            set: effects.set,
            point: undefined,
            scope,
            variant: 'publicdir',
          },
          publicdirResult: { publicdir, response: staticResponse },
          taskPointResult: undefined,
          pagePointResult: undefined,
          actionPointResult: undefined,
          errorResult: undefined,
        }
      }
    }

    const task = await this.getTaskFromRequest({ request })

    if (!task) {
      const responseFromAbsFilePath = await Fetcher.fetchAbsFilePathOnDevServer({ request })
      if (responseFromAbsFilePath) {
        return {
          scope: this.engine.server.scope,
          request,
          effects,
          middlewares: [],
          middlewareOptions: {
            request,
            set: effects.set,
            point: undefined,
            scope: this.engine.server.scope,
            variant: '' as never, // it is dev only thing, lets forget about it
          },
          publicdirResult: { publicdir: undefined, response: responseFromAbsFilePath },
          taskPointResult: undefined,
          pagePointResult: undefined,
          actionPointResult: undefined,
          errorResult: undefined,
        }
      }
    }

    if (task) {
      const exact = this.server.points?.findExact({
        scope: task.scope,
        type: task.pointType,
        name: task.pointName,
      })
      const root = exact?._root ?? this.server.points?.roots.get(task.scope)
      if (!root) {
        return {
          scope: task.scope,
          request,
          effects,
          middlewares: [],
          middlewareOptions: {
            request,
            set: effects.set,
            point: undefined,
            scope: task.scope,
            variant: 'unknown',
          },
          publicdirResult: undefined,
          taskPointResult: undefined,
          pagePointResult: undefined,
          actionPointResult: undefined,
          errorResult: new Error0(`Root for point "${task.scope}.${task.pointType}.${task.pointName}" not found`, {
            httpStatus: 404,
          }),
        }
      } else {
        return {
          scope: task.scope,
          request,
          effects,
          middlewares: exact?._middlewares ?? root._middlewares,
          middlewareOptions: {
            request,
            set: effects.set,
            point: exact,
            scope: task.scope,
            variant: 'task',
          },
          publicdirResult: undefined,
          taskPointResult: { task, point: exact, root },
          pagePointResult: undefined,
          actionPointResult: undefined,
          errorResult: undefined,
        }
      }
    }

    const pageLocation = request.location

    const foundExactPage = await (async () => {
      for (const client of this.engine.clients) {
        if (!client.points) {
          continue
        }
        const found = await client.points.loadPage({ location: pageLocation })
        if (found) {
          return {
            page: found.page,
            client,
            pageLocation: found.pageLocation,
          }
        }
      }
      return undefined
    })()
    if (foundExactPage) {
      return {
        scope: foundExactPage.client.scope,
        request,
        effects,
        middlewares: foundExactPage.page._middlewares,
        middlewareOptions: {
          request,
          set: effects.set,
          point: foundExactPage.page,
          scope: foundExactPage.client.scope,
          variant: 'page',
        },
        publicdirResult: undefined,
        taskPointResult: undefined,
        pagePointResult: {
          client: foundExactPage.client,
          pageLocation: foundExactPage.pageLocation,
          point: foundExactPage.page,
        },
        actionPointResult: undefined,
        errorResult: undefined,
      }
    }

    const foundSuitableClient = await (async () => {
      for (const client of this.engine.clients) {
        // we can not do nothing wit this client on server if it has no indexHtml
        if (!client.indexHtml) {
          continue
        }
        if (client.isPageLocationSuitable({ pageLocation })) {
          return client
        }
      }
      return undefined
    })()
    if (foundSuitableClient) {
      return {
        scope: foundSuitableClient.scope,
        request,
        effects,
        middlewares: foundSuitableClient.points?.middlewares ?? [],
        middlewareOptions: {
          request,
          set: effects.set,
          point: undefined,
          scope: foundSuitableClient.scope,
          variant: 'unknown',
        },
        publicdirResult: undefined,
        taskPointResult: undefined,
        pagePointResult: {
          client: foundSuitableClient,
          pageLocation,
          point: undefined,
        },
        actionPointResult: undefined,
        errorResult: undefined,
      }
    }

    return {
      scope: this.server.scope,
      request,
      effects,
      middlewares: this.server.points?.middlewares.get(this.server.scope) ?? [],
      middlewareOptions: {
        request,
        set: effects.set,
        point: undefined,
        scope: this.server.scope,
        variant: 'unknown',
      },
      publicdirResult: undefined,
      taskPointResult: undefined,
      pagePointResult: undefined,
      actionPointResult: undefined,
      errorResult: new Error0(`Not Found`, { httpStatus: 404 }),
    }
  }

  // private readonly fetchPoint = async ({
  //   suitable,
  //   task,
  //   request,
  //   requiredCtx,
  //   effects,
  //   serverStorageState,
  // }: {
  //   suitable: GetSuitableResult
  //   task: FetchTask | undefined
  //   request: Request0
  //   requiredCtx: RequiredCtx
  //   effects: Effects
  //   serverStorageState: SuperStoreInternalValuesOrErrors
  // }): Promise<FetcherFetchPointResult> => {
  //   const meta: Record<string, any> = {
  //     url: request.original.url,
  //     scope: suitable.pointsManager.scope,
  //   }
  //   const partialResult = {
  //     request,
  //     scope: suitable.pointsManager.scope,
  //     task,
  //     point: suitable.point,
  //     variant: 'point' as const,
  //     data: undefined,
  //     error: null,
  //   }

  //   try {
  //     // TODO: lets provide here wrapResponse and wrapRequest and call it
  //     // TODO: also there on error fo input not throw it but return as error

  //     if (request.original.method === 'OPTIONS') {
  //       // TODO: when we will have headers midlewares, remove this
  //       const response = new Response(null, {
  //         status: 204,
  //       })
  //       return {
  //         ...partialResult,
  //         response,
  //         responseFormat: 'headers',
  //       }
  //     }

  //     const executor = await Executor.create({
  //       engine: this.engine,
  //       request,
  //       points: suitable.pointsManager,
  //       pageLocation: suitable.pageLocation,
  //       currentLocation: suitable.pageLocation ?? Route0.toRelLocation(request.location),
  //       requiredCtx,
  //       effects,
  //       serverStorageState,
  //     })
  //     meta.scope = suitable.pointsManager.scope

  //     const pointType = task?.pointType ?? 'page'
  //     const outputType = task?.outputType ?? 'html'
  //     meta.pointType = pointType
  //     meta.outputType = outputType
  //     meta.pointName = task?.pointName
  //     meta.pointType = task?.pointType

  //     const relatedClient = this.server.clients.find(
  //       (client) => client.pointsManager.scope === suitable.pointsManager.scope,
  //     )

  //     if (relatedClient) {
  //       if (relatedClient.ssr && outputType === 'html' && pointType === 'page') {
  //         try {
  //           if (!suitable.pageLocation) {
  //             // I think it will never throw, but who knows
  //             throw new Error('Page Critical Error: Not Found')
  //           }
  //           const input = await this.getPointInput({ suitable, task, request })
  //           const readableStream = await relatedClient.renderAsReadableStream({
  //             executor,
  //             pagePoint: suitable.point as PagePoint | undefined,
  //             pageLocation: suitable.pageLocation,
  //             input,
  //           })
  //           const response = new Response(readableStream, {
  //             headers: { 'Content-Type': 'text/html' },
  //           })
  //           return {
  //             ...partialResult,
  //             response,
  //             responseFormat: 'html',
  //           }
  //         } catch (error) {
  //           // in case if entry provided in index.html is not correct, we fallback to original index.html with provided bun error
  //           if (error instanceof Error && error.message.includes('<!-- __Target__ --> not found')) {
  //             const indexHtml = await relatedClient.getOriginalIndexHtmlWithEnvs(request.original.url)
  //             const response = new Response(indexHtml, {
  //               headers: { 'Content-Type': 'text/html' },
  //               status: 500,
  //             })
  //             return {
  //               ...partialResult,
  //               response,
  //               error: Error0.from(error),
  //               responseFormat: 'html',
  //             }
  //           }
  //           throw error
  //         }
  //       } else if (!relatedClient.ssr && outputType === 'html' && pointType === 'page' && relatedClient.indexHtml) {
  //         const indexHtml = await relatedClient.getOriginalIndexHtmlWithEnvs(request.original.url)
  //         const response = new Response(indexHtml, {
  //           headers: { 'Content-Type': 'text/html' },
  //           status: 200,
  //         })
  //         return {
  //           ...partialResult,
  //           response,
  //           responseFormat: 'html',
  //         }
  //       } else if (outputType === 'queryClientDehydratedState' && pointType === 'page') {
  //         if (!suitable.pageLocation) {
  //           // I think it will never throw, but who knows
  //           throw new Error('Page Critical Error: Not Found')
  //         }
  //         await relatedClient.prefetchAppPagePointDeep({
  //           executor,
  //           pagePoint: suitable.point as PagePoint | undefined,
  //           pageLocation: suitable.pageLocation,
  //           input: await this.getPointInput({ suitable, task, request }),
  //         })
  //         const dehydratedState = await executor.getQueryClientReadyDehydratedState()
  //         const response = new Response(executor.pointsManager.transformer.stringify({ dehydratedState }), {
  //           headers: { 'Content-Type': 'application/json' },
  //           status: 200,
  //         })
  //         return {
  //           ...partialResult,
  //           response,
  //           data: { dehydratedState },
  //           responseFormat: 'json',
  //         }
  //       }
  //     } else if (outputType === 'html' && pointType === 'page') {
  //       throw new Error(`Client not found for point "${suitable.point?.name ?? 'unknown'}" while requested page html`)
  //     }

  //     const executeResult = await executor.execute({
  //       point: suitable.point,
  //       // TODO: wehn openapi will be ready, do not send here parsed input for this type of points
  //       input: await this.getPointInput({ suitable, task, request }),
  //       effects: executor.effects, // here we pass executor effects, becouse we want to apply status and effects to it
  //     })
  //     if (executeResult.error) {
  //       this.server.logger.error(executeResult.error, meta)
  //     }

  //     if (executeResult.error) {
  //       const response = toJsonErrorResponse(executeResult.error, executeResult.status)
  //       return {
  //         ...partialResult,
  //         response,
  //         error: executeResult.error,
  //         responseFormat: 'json',
  //       }
  //     }

  //     if (executeResult.output instanceof Response) {
  //       executeResult.output.headers.set('X-Point0-Not-Json-Data', 'true')
  //       return {
  //         ...partialResult,
  //         response: executeResult.output,
  //         responseFormat: 'json',
  //       }
  //     }

  //     if (!executeResult.output) {
  //       const error = new Error0('No output')
  //       const response = toJsonErrorResponse(error, 404)
  //       return {
  //         ...partialResult,
  //         response,
  //         error,
  //         responseFormat: 'json',
  //       }
  //     }

  //     // else we try to get endpoint json
  //     const response = new Response(executor.pointsManager.transformer.stringify(executeResult.output), {
  //       headers: { 'Content-Type': 'application/json' },
  //       status: executeResult.status,
  //     })
  //     return {
  //       ...partialResult,
  //       response,
  //       data: executeResult.output,
  //       responseFormat: 'json',
  //     }
  //   } catch (error) {
  //     this.server.logger.error(error, meta)
  //     const error0 = Error0.from(error)
  //     const response = toJsonErrorResponse(error0)
  //     return {
  //       ...partialResult,
  //       response,
  //       error: error0,
  //       responseFormat: 'json',
  //     }
  //   }
  // }

  private readonly fetchTaskPoint = async ({
    root,
    point,
    task,
    request,
    requiredCtx,
    effects,
    serverStorageState,
  }: {
    root: RootPoint
    point: ReadyPoint | undefined
    task: FetchTask
    request: Request0
    requiredCtx: RequiredCtx
    effects: Effects
    serverStorageState: SuperStoreInternalValuesOrErrors
  }): Promise<FetcherFetchTaskPointResult> => {
    const client = this.server.clients.find((client) => client.scope === root.scope)
    const meta: Record<string, any> = {
      url: request.original.url,
      scope: root.scope,
      pointType: task.pointType,
      outputType: task.outputType,
      pointName: task.pointName,
      pointInput: task.pointInput,
    }
    const partialResult = {
      request,
      scope: root.scope,
      task,
      point,
      client,
      variant: 'point' as const,
      data: undefined,
      error: null,
    }
    let input: InputRawUnknown = {}

    try {
      if (task.outputType === 'html' && task.pointType === 'page') {
        if (!client) {
          throw new Error(`Client for scope "${root.scope}" not found while requested page html via task`)
        }
        if (!point) {
          throw new Error(
            `Point "${task.scope}.${task.pointType}.${task.pointName}" not found while requested page html via task`,
          )
        }
        if (!point.route) {
          throw new Error(
            `Point "${task.scope}.${task.pointType}.${task.pointName}" has no route while requested page html via task`,
          )
        }
        input = await this.getPointInputFromTaskRequest({ request, scope: root.scope })
        const pageLocation = (point.route as CallableRoute).getLocation((point.route as CallableRoute).flat(input))
        const result = await this.fetchPagePoint({
          client,
          point: point as PagePoint | undefined,
          pageLocation: pageLocation as ExactLocation | AnyLocation,
          request,
          effects,
          serverStorageState,
          requiredCtx,
        })
        return {
          ...partialResult,
          ...result,
        }
      }

      const executor = await Executor.create({
        engine: this.engine,
        request,
        requiredCtx,
        effects,
        serverStorageState,
      })
      input = await this.getPointInputFromTaskRequest({ request, scope: root.scope })

      if (task.outputType === 'queryClientDehydratedState') {
        if (task.pointType !== 'page') {
          throw new Error(`Point type "${task.pointType}" is not supported for queryClientDehydratedState output type`)
        }
        if (!client) {
          throw new Error(`Client for scope "${root.scope}" not found while requested page html via task`)
        }
        if (!point) {
          throw new Error(
            `Point "${task.scope}.${task.pointType}.${task.pointName}" not found while requested page html via task`,
          )
        }
        if (!point.route) {
          throw new Error(
            `Point "${task.scope}.${task.pointType}.${task.pointName}" has no route while requested page html via task`,
          )
        }
        const pageLocation = (point.route as CallableRoute).getLocation((point.route as CallableRoute).flat(input))
        await client.prefetchAppPagePointDeep({
          executor,
          pagePoint: point as PagePoint,
          pageLocation: pageLocation as ExactLocation | AnyLocation,
          input,
        })
        const dehydratedState = await executor.getQueryClientReadyDehydratedState()
        const response = new Response(point._getTransformer().stringify({ dehydratedState }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
        return {
          ...partialResult,
          input,
          response,
          data: { dehydratedState },
          pageLocation,
          responseFormat: 'json',
        }
      }

      const executeResult = await executor.execute({
        point,
        input,
        effects: executor.effects, // here we pass executor effects, becouse we want to apply status and effects to it
      })
      if (executeResult.error) {
        this.server.logger.error(executeResult.error, meta)
      }

      if (executeResult.error) {
        const response = toJsonErrorResponse(executeResult.error, executeResult.status)
        return {
          ...partialResult,
          input,
          response,
          error: executeResult.error,
          responseFormat: 'json',
          pageLocation: undefined,
        }
      }

      if (executeResult.output instanceof Response) {
        executeResult.output.headers.set('X-Point0-Not-Json-Data', 'true')
        return {
          ...partialResult,
          input,
          response: executeResult.output,
          responseFormat: 'json',
          pageLocation: undefined,
        }
      }

      if (!executeResult.output) {
        const error = new Error0('No output')
        const response = toJsonErrorResponse(error, 404)
        return {
          ...partialResult,
          input,
          response,
          error,
          responseFormat: 'json',
          pageLocation: undefined,
        }
      }

      // else we try to get endpoint json
      const response = new Response(executeResult.point._getTransformer().stringify(executeResult.output), {
        headers: { 'Content-Type': 'application/json' },
        status: executeResult.status,
      })
      return {
        ...partialResult,
        input,
        response,
        data: executeResult.output,
        responseFormat: 'json',
        pageLocation: undefined,
      }
    } catch (error) {
      this.server.logger.error(error, meta)
      const error0 = Error0.from(error)
      const response = toJsonErrorResponse(error0)
      return {
        ...partialResult,
        input,
        response,
        error: error0,
        responseFormat: 'json',
        pageLocation: undefined,
      }
    }
  }

  private readonly fetchPagePoint = async ({
    client,
    point,
    pageLocation,
    request,
    requiredCtx,
    effects,
    serverStorageState,
  }: {
    client: EngineClient<true>
    point: PagePoint | undefined
    pageLocation: AnyLocation | ExactLocation
    request: Request0
    requiredCtx: RequiredCtx
    effects: Effects
    serverStorageState: SuperStoreInternalValuesOrErrors
  }): Promise<FetcherFetchPagePointResult> => {
    const input = this.getPointInputFormSuitablePageLocation({ pageLocation, request })
    const meta: Record<string, any> = {
      url: request.original.url,
      scope: client.scope,
      pointType: 'page',
      outputType: 'html',
      pointName: point?.name,
      pointInput: input,
    }
    const partialResult = {
      client,
      pageLocation,
      request,
      scope: client.scope,
      point,
      variant: 'page' as const,
      data: undefined,
      error: null,
      responseFormat: 'html' as const,
      input,
    }

    try {
      // TODO: lets provide here wrapResponse and wrapRequest and call it
      // TODO: also there on error fo input not throw it but return as error

      const executor = await Executor.create({
        engine: this.engine,
        request,
        requiredCtx,
        effects,
        serverStorageState,
      })

      if (client.ssr) {
        try {
          const readableStream = await client.renderAsReadableStream({
            executor,
            pagePoint: point,
            pageLocation,
            input,
          })
          const response = new Response(readableStream, {
            headers: { 'Content-Type': 'text/html' },
          })
          return {
            ...partialResult,
            response,
          }
        } catch (error) {
          // in case if entry provided in index.html is not correct, we fallback to original index.html with provided bun error
          if (error instanceof Error && error.message.includes('<!-- __Target__ --> not found')) {
            const indexHtml = await client.getOriginalIndexHtmlWithEnvs(request.original.url)
            const response = new Response(indexHtml, {
              headers: { 'Content-Type': 'text/html' },
              status: 500,
            })
            return {
              ...partialResult,
              response,
              error: Error0.from(error),
            }
          }
          throw error
        }
      } else if (client.indexHtml) {
        const indexHtml = await client.getOriginalIndexHtmlWithEnvs(request.original.url)
        const response = new Response(indexHtml, {
          headers: { 'Content-Type': 'text/html' },
          status: !point && client.points ? 404 : 200,
        })
        return {
          ...partialResult,
          response,
        }
      } else {
        throw new Error(`Client "${client.scope}" has no indexHtml`)
      }
    } catch (error) {
      this.server.logger.error(error, meta)
      const error0 = Error0.from(error)
      const response = toJsonErrorResponse(error0)
      return {
        ...partialResult,
        response,
        error: error0,
      }
    }
  }

  private async _composeMiddlewares({
    middlewares,
    finalHandler,
    baseOptions,
  }: {
    middlewares: MiddlewareFn[]
    finalHandler: () => Promise<FetcherFetchDetailedResultNoMiddleware>
    baseOptions: MiddlewareFnOptionsBase
  }): Promise<FetcherFetchDetailedResult> {
    let index = -1
    let isMiddleware = true as boolean

    async function dispatch(i: number): Promise<Response | FetcherFetchDetailedResult> {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i

      if (i === middlewares.length) {
        isMiddleware = false
        return await finalHandler()
        // // eslint-disable-next-line @typescript-eslint/only-throw-error
        // throw finishSymbol
      }

      const mw = middlewares[i]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!mw) {
        throw new Error('Middleware is undefined')
      }

      return await mw({
        ...baseOptions,
        next: async () => {
          const result = await dispatch(i + 1)
          if (result instanceof Response) {
            return {
              request: baseOptions.request,
              scope: baseOptions.scope,
              response: result,
              variant: 'middleware',
              error: null,
            }
          }
          return result
        },
      })
    }

    try {
      const result = await dispatch(0)
      if (result instanceof Response) {
        return {
          request: baseOptions.request,
          scope: baseOptions.scope,
          response: result,
          variant: 'middleware',
          error: null,
        }
      }
      return result
    } catch (error) {
      const error0 = Error0.from(error)
      return {
        request: baseOptions.request,
        scope: baseOptions.scope,
        response: toJsonErrorResponse(error0),
        variant: isMiddleware ? 'middleware' : 'unknown',
        error: error0,
      }
    }
  }

  private async _fetchDetailed({
    requiredCtx,
    prepareFetchResult,
    serverStorageState,
  }: {
    requiredCtx: RequiredCtx
    prepareFetchResult: PrepareFetchResult
    serverStorageState: SuperStoreInternalValuesOrErrors
  }): Promise<FetcherFetchDetailedResultNoMiddleware> {
    if (prepareFetchResult.publicdirResult) {
      return {
        request: prepareFetchResult.request,
        scope: prepareFetchResult.scope,
        response: prepareFetchResult.publicdirResult.response,
        variant: 'publicdir',
        error: null,
      }
    }

    if (prepareFetchResult.errorResult) {
      return {
        request: prepareFetchResult.request,
        scope: prepareFetchResult.scope,
        response: toJsonErrorResponse(prepareFetchResult.errorResult),
        variant: 'unknown',
        error: prepareFetchResult.errorResult,
      }
    }

    // if (prepareFetchResult.actionPointResult) {
    //   const error = new Error0(`Not Implemented`, { httpStatus: 501 })
    //   return {
    //     request: prepareFetchResult.request,
    //     scope: prepareFetchResult.scope,
    //     response: toJsonErrorResponse(error),
    //     variant: 'unknown',
    //     error,
    //   }
    // }

    if (prepareFetchResult.pagePointResult) {
      const fetchPagePointResult = await this.fetchPagePoint({
        client: prepareFetchResult.pagePointResult.client,
        point: prepareFetchResult.pagePointResult.point,
        pageLocation: prepareFetchResult.pagePointResult.pageLocation,
        request: prepareFetchResult.request,
        requiredCtx,
        effects: prepareFetchResult.effects,
        serverStorageState,
      })
      return {
        ...fetchPagePointResult,
        variant: 'page',
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (prepareFetchResult.taskPointResult) {
      const fetchTaskPointResult = await this.fetchTaskPoint({
        root: prepareFetchResult.taskPointResult.root,
        point: prepareFetchResult.taskPointResult.point,
        task: prepareFetchResult.taskPointResult.task,
        request: prepareFetchResult.request,
        requiredCtx,
        effects: prepareFetchResult.effects,
        serverStorageState,
      })
      return {
        ...fetchTaskPointResult,
        variant: 'task',
      }
    }

    const error = new Error0(`Not Found`, { httpStatus: 404 })
    return {
      request: (prepareFetchResult as any).request,
      scope: (prepareFetchResult as any).scope,
      response: toJsonErrorResponse(error),
      variant: 'unknown',
      error: new Error0(`Critical Error: Not Found`, { httpStatus: 404 }),
    }

    // const fetchPointResult = await this.fetchPoint({
    //   request: prepareFetchResult.request,
    //   suitable: prepareFetchResult.pointResult.suitable,
    //   task: prepareFetchResult.pointResult.task,
    //   requiredCtx,
    //   effects: prepareFetchResult.effects,
    //   serverStorageState,
    // })

    // if (fetchPointResult.task) {
    //   return {
    //     ...fetchPointResult,
    //     task: fetchPointResult.task,
    //     variant: 'point',
    //     response: fetchPointResult.response,
    //     input: fetchPointResult.request.state.__POINT0_RAW_UNKNOWN_INPUT__ as InputRawUnknown | undefined,
    //   }
    // }

    // if (fetchPointResult.responseFormat === 'html') {
    //   return {
    //     ...fetchPointResult,
    //     variant: 'page',
    //     response: fetchPointResult.response,
    //     input: fetchPointResult.request.state.__POINT0_RAW_UNKNOWN_INPUT__ as InputRawUnknown | undefined,
    //   }
    // }

    // return {
    //   ...fetchPointResult,
    //   variant: 'unknown',
    //   response: fetchPointResult.response,
    // }
  }

  async fetchDetailed({
    request,
    requiredCtx,
    bunServer,
  }: {
    request: Request
    requiredCtx: RequiredCtx
    bunServer?: Bun.Server<unknown>
  }): Promise<FetcherFetchDetailedResult> {
    const prepareFetchResult = await this.prepareFetch({
      originalRequest: request,
      bunServer,
    })

    const serverStorageState = _getSsItemsWithRestErrors(
      {
        __POINT0_REQUEST0__: prepareFetchResult.request,
        __POINT0_EFFECTS__: prepareFetchResult.effects,
        // in case of recursive server response we want preserve query client to keep state
        __POINT0_QUERY_CLIENT_FROM_PARENT_RUN__: _ssItems.__POINT0_QUERY_CLIENT__.getWeak(),
      },
      'Not exists in middleware call, this value accessible only in loader, ctx, components etc',
    )

    const middlewares = prepareFetchResult.middlewares
    const middlewareOptions = prepareFetchResult.middlewareOptions

    return await _ssRunWithServerStorageState(serverStorageState, async () => {
      const result = await this._composeMiddlewares({
        middlewares,
        finalHandler: async () =>
          await this._fetchDetailed({
            requiredCtx,
            prepareFetchResult,
            serverStorageState,
          }),
        baseOptions: middlewareOptions,
      })
      const response = prepareFetchResult.effects.apply(result.response)
      const finalResult = {
        ...result,
        response,
      } as FetcherFetchDetailedResult
      return finalResult
    })
  }

  async fetch({
    request,
    requiredCtx,
    bunServer,
  }: {
    request: Request
    requiredCtx: RequiredCtx
    bunServer?: Bun.Server<unknown>
  }): Promise<Response | undefined> {
    const fetchDetailedResult = await this.fetchDetailed({ request, requiredCtx, bunServer })
    return fetchDetailedResult.response
  }
}

export type PrepareFetchResult =
  | {
      scope: PointsScope
      request: Request0
      effects: Effects
      middlewares: MiddlewareFn[]
      middlewareOptions: MiddlewareFnOptionsBase
      publicdirResult: { publicdir: Publicdir<true> | undefined; response: Response } // in case if it is bun dev server try to fetch abs path
      taskPointResult: undefined
      pagePointResult: undefined
      actionPointResult: undefined
      errorResult: undefined
    }
  | {
      scope: PointsScope
      request: Request0
      effects: Effects
      middlewares: MiddlewareFn[]
      middlewareOptions: MiddlewareFnOptionsBase
      publicdirResult: undefined
      taskPointResult: { task: FetchTask; point: ReadyPoint | undefined; root: RootPoint }
      pagePointResult: undefined
      actionPointResult: undefined
      errorResult: undefined
    }
  | {
      scope: PointsScope
      request: Request0
      effects: Effects
      middlewares: MiddlewareFn[]
      middlewareOptions: MiddlewareFnOptionsBase
      publicdirResult: undefined
      taskPointResult: undefined
      pagePointResult: {
        pageLocation: ExactLocation | AnyLocation
        point: PagePoint | undefined
        client: EngineClient<true>
      }
      actionPointResult: undefined
      errorResult: undefined
    }
  | {
      scope: PointsScope
      request: Request0
      effects: Effects
      middlewares: MiddlewareFn[]
      middlewareOptions: MiddlewareFnOptionsBase
      publicdirResult: undefined
      taskPointResult: undefined
      pagePointResult: undefined
      actionPointResult: undefined
      errorResult: Error0
    }

// export type FetcherFetchDetailedResultGeneral = {
//   response: Response | undefined
//   request: Request0
//   scope: PointsScope
//   error: Error0 | null
// }
// export type FetcherFetchDetailedResultMiddleware = FetcherFetchDetailedResultGeneral & {
//   variant: 'middleware'
// }
// export type FetcherFetchDetailedResultPage = FetcherFetchDetailedResultGeneral & {
//   variant: 'page'
//   point: ReadyPoint | undefined
//   input: InputRawUnknown | undefined
// }
// export type FetcherFetchDetailedResultPoint = FetcherFetchDetailedResultGeneral & {
//   variant: 'point'
//   point: ReadyPoint | undefined
//   task: FetchTask
//   data: Data | undefined
//   responseFormat: 'json' | 'html' | 'headers'
//   input: InputRawUnknown | undefined
// }
// export type FetcherFetchDetailedResultUnknown = FetcherFetchDetailedResultGeneral & {
//   variant: 'unknown'
// }
// export type FetcherFetchDetailedResultPublicdir = FetcherFetchDetailedResultGeneral & {
//   variant: 'publicdir'
//   publicdir: Publicdir<true> | undefined
// }
// export type FetcherFetchDetailedResultDevClientsProxy = FetcherFetchDetailedResultGeneral & {
//   variant: 'devClientsProxy'
// }

// export type FetcherFetchDetailedResultNoMiddleware =
//   | FetcherFetchDetailedResultPoint
//   | FetcherFetchDetailedResultPage
//   | FetcherFetchDetailedResultUnknown
//   | FetcherFetchDetailedResultPublicdir
//   | FetcherFetchDetailedResultDevClientsProxy
// export type FetcherFetchDetailedResult = FetcherFetchDetailedResultNoMiddleware | FetcherFetchDetailedResultMiddleware
// export type FetcherFetchDetailedResultSpecific<
//   TVariant extends FetcherFetchDetailedResult['variant'] | undefined = undefined,
// > = TVariant extends undefined
//   ? FetcherFetchDetailedResult
//   : TVariant extends 'middleware'
//     ? FetcherFetchDetailedResultMiddleware
//     : TVariant extends 'page'
//       ? FetcherFetchDetailedResultPage
//       : TVariant extends 'point'
//         ? FetcherFetchDetailedResultPoint
//         : TVariant extends 'unknown'
//           ? FetcherFetchDetailedResultUnknown
//           : TVariant extends 'publicdir'
//             ? FetcherFetchDetailedResultPublicdir
//             : TVariant extends 'devClientsProxy'
//               ? FetcherFetchDetailedResultDevClientsProxy
//               : never

// // TODO:ASAP simplify names
// export type FetchTask = {
//   pointType: ReadyPointType
//   outputType: 'data' | 'queryClientDehydratedState'
//   scope: PointsScope
//   pointName: PointName
//   pointInput: InputRawUnknown | undefined // in case if it is page or layout, we will parse input on task level, becouse we need it to extract totally match pageLocation
// }

export type FetcherFetchPagePointResult = Omit<FetcherFetchDetailedResultGeneral, 'response'> & {
  response: Response
  point: ReadyPoint | undefined
  pageLocation: AnyLocation
  client: EngineClient<true>
  scope: PointsScope
  responseFormat: 'html'
  input: InputRawUnknown
}
export type FetcherFetchTaskPointResult = Omit<FetcherFetchDetailedResultGeneral, 'response'> & {
  response: Response
  point: ReadyPoint | undefined
  pageLocation: AnyLocation | undefined
  client: EngineClient<true> | undefined
  scope: PointsScope
  task: FetchTask
  data: Data | undefined
  responseFormat: 'json' | 'html'
  input: InputRawUnknown
}

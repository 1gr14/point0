import { Error0 } from '@devp0nt/error0'
import { Route0 } from '@devp0nt/route0'
import type { EndPointType, InputRawUnknown, PointName, PointsScope, RequiredCtx, PagePoint } from '@point0/core'
import { Request0, Response0, SuperStore } from '@point0/core'
import { unflatten } from 'flat'
import type { GetSuitableResult } from './all-points-managers.js'
import { toJsonErrorResponse } from './error.js'
import { Executor } from './executor.js'
import type { Publicdir } from './publicdir.js'
import type { ServerBun } from './server.js'

export class Fetcher {
  server: ServerBun<true>

  private constructor({ server }: { server: ServerBun<true> }) {
    this.server = server
  }

  static create({ server }: { server: ServerBun<true> }): Fetcher {
    return new Fetcher({ server })
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

  getPointInputFromTaskRequest = async ({
    request,
    scope,
  }: {
    request: Request0
    scope: PointsScope
  }): Promise<InputRawUnknown | undefined> => {
    if (request.location.pathname !== '/_point0') {
      return undefined
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
    const transformer = this.server.allPointsManagers.getTransformerByScope({
      scope,
      fallbackScope: this.server.fallbackScope,
    })
    const inputRaw = transformer.deserialize<InputRawUnknown>(inputRawNotTransformed)
    return inputRaw
  }

  getPointInputFormSuitablePageOrLayout = ({
    suitable,
  }: {
    suitable: GetSuitableResult
  }): InputRawUnknown | undefined => {
    if ((suitable.point?.type === 'page' || suitable.point?.type === 'layout') && suitable.pageLocation) {
      return { ...suitable.pageLocation.searchParams, ...suitable.pageLocation.params }
    }
    return undefined
  }

  getPointInput = async ({
    suitable,
    task,
    request,
  }: {
    suitable: GetSuitableResult
    task: FetchTask | undefined
    request: Request0
  }): Promise<InputRawUnknown> => {
    // we do not call it immediatelly, becouse for openapi points we do not want parse input, so developer can read body when it needed
    if (task?.pointInput) {
      return task.pointInput
    }
    const inputFromTaskRequest = await this.getPointInputFromTaskRequest({
      request,
      scope: suitable.pointsManager.scope,
    })
    if (inputFromTaskRequest) {
      return inputFromTaskRequest
    }
    const inputFromSuitablePageOrLayout = this.getPointInputFormSuitablePageOrLayout({ suitable })
    if (inputFromSuitablePageOrLayout) {
      return inputFromSuitablePageOrLayout
    }
    return {}
  }

  prepareFetch = async ({
    originalRequest,
    scope,
    bunServer,
  }: {
    originalRequest: Request
    scope?: PointsScope
    bunServer?: Bun.Server<unknown>
  }): Promise<PrepareFetchResult> => {
    const request = Request0.create(originalRequest, bunServer || this.server.bunServer)

    const devClientsProxyResponse = await this.fetchDevClientsProxy({
      request,
      bunServer,
    })
    if (devClientsProxyResponse) {
      return {
        request,
        devClientsProxyResult: devClientsProxyResponse,
        publicdirResult: undefined,
        pointResult: undefined,
      }
    }

    for (const publicdir of this.server.publicdirs) {
      const staticResponse = await publicdir.fetch({ request })
      if (staticResponse) {
        return {
          request,
          devClientsProxyResult: undefined,
          publicdirResult: { publicdir, response: staticResponse },
          pointResult: undefined,
        }
      }
    }

    const task = await this.getTaskFromRequest({ request })

    if (!task) {
      const responseFromAbsFilePath = await Fetcher.fetchAbsFilePathOnDevServer({ request })
      if (responseFromAbsFilePath) {
        return {
          request,
          devClientsProxyResult: undefined,
          publicdirResult: { publicdir: undefined, response: responseFromAbsFilePath },
          pointResult: undefined,
        }
      }
    }

    const suitable = this.server.allPointsManagers.getSuitable({
      pointType: task?.pointType ?? 'page',
      scope: task?.scope || scope,
      pointName: task?.pointName,
      input: task?.pointInput,
      pageLocation: !task ? request.location : undefined,
      fallbackScope: this.server.fallbackScope,
    })

    return {
      request,
      devClientsProxyResult: undefined,
      publicdirResult: undefined,
      pointResult: { suitable, task },
    }
  }

  fetchDevClientsProxy = async ({
    request,
    bunServer,
  }: {
    request: Request0
    bunServer?: Bun.Server<unknown>
  }): Promise<{ response: Response | undefined } | undefined> => {
    if (process.env.NODE_ENV === 'production') {
      return undefined
    }
    if (request.original.headers.get('X-Point0-Forwarded-From-Dev-Client-Server') === 'true') {
      return undefined
    }
    bunServer ??= this.server.bunServer
    for (const client of this.server.clients) {
      // it is provided when we serve via bun, if we serve via elysia, then elysia manages websocket by itself
      if (bunServer) {
        const bunDevServerUpgradeWebSocketResult = await client.upgradeProxyBunDevServerWebSocket({
          request,
          bunServer,
        })
        if (bunDevServerUpgradeWebSocketResult) {
          return { response: bunDevServerUpgradeWebSocketResult.result } // in this case response really should be undefined
        }
      }
      const clientViteDevServerResponse = await client.fetchViteDevServerMiddleware({ request })
      if (clientViteDevServerResponse) {
        return { response: clientViteDevServerResponse }
      }
      const clientBunDevServerResponse = await client.fetchBunDevServerMiddleware({ request })
      if (clientBunDevServerResponse) {
        return { response: clientBunDevServerResponse }
      }
    }
    return undefined // this mean that we did not find any dev client proxy response, and should continue to fetch point
  }

  fetchPoint = async ({
    suitable,
    task,
    request,
    scope,
    requiredCtx,
    response0,
  }: {
    suitable: GetSuitableResult
    task: FetchTask | undefined
    request: Request0
    scope?: PointsScope
    requiredCtx: RequiredCtx
    response0: Response0
  }): Promise<Response> => {
    const meta: Record<string, any> = {
      url: request.original.url,
      scope,
    }

    try {
      // TODO: lets provide here wrapResponse and wrapRequest and call it
      // TODO: also there on error fo input not throw it but return as error

      if (request.original.method === 'OPTIONS') {
        // TODO: when we will have headers midlewares, remove this
        return new Response(null, {
          status: 204,
        })
      }

      const executor = await Executor.create({
        request,
        pointsManager: suitable.pointsManager,
        pageLocation: suitable.pageLocation,
        currentLocation: suitable.pageLocation ?? Route0.toRelLocation(request.location),
        requiredCtx,
        response0,
      })
      meta.scope = suitable.pointsManager.scope

      const pointType = task?.pointType ?? 'page'
      const outputType = task?.outputType ?? 'html'
      meta.pointType = pointType
      meta.outputType = outputType
      meta.pointName = task?.pointName
      meta.pointType = task?.pointType

      const relatedClient = this.server.clients.find(
        (client) => client.pointsManager.scope === suitable.pointsManager.scope,
      )

      if (relatedClient) {
        if (relatedClient.ssr && outputType === 'html' && pointType === 'page') {
          try {
            if (!suitable.pageLocation) {
              // I think it will never throw, but who knows
              throw new Error('Page Critical Error: Not Found')
            }
            const input = await this.getPointInput({ suitable, task, request })
            const executeResult = await executor.execute({
              point: suitable.point,
              input,
              withLayouts: true,
            })
            if (executeResult.error) {
              this.server.logger.error(executeResult.error, meta)
            }
            const readableStream = await relatedClient.renderAsReadableStream({
              executor,
              executeResult,
              pagePoint: suitable.point as PagePoint | undefined,
              pageLocation: suitable.pageLocation,
              input,
            })
            return new Response(readableStream, {
              headers: { 'Content-Type': 'text/html' },
              status: executeResult.status,
            })
          } catch (error) {
            // in case if entry provided in index.html is not correct, we fallback to original index.html with provided bun error
            if (error instanceof Error && error.message.includes('<!-- __POINT0_TARGET__ --> not found')) {
              const indexHtml = await relatedClient.getOriginalIndexHtmlWithEnvs(request.original.url)
              return new Response(indexHtml, {
                headers: { 'Content-Type': 'text/html' },
                status: 500,
              })
            }
            throw error
          }
        } else if (!relatedClient.ssr && outputType === 'html' && pointType === 'page' && relatedClient.indexHtml) {
          const indexHtml = await relatedClient.getOriginalIndexHtmlWithEnvs(request.original.url)
          return new Response(indexHtml, {
            headers: { 'Content-Type': 'text/html' },
            status: 200,
          })
        } else if (outputType === 'queryClientDehydratedState' && pointType === 'page') {
          if (!suitable.pageLocation) {
            // I think it will never throw, but who knows
            throw new Error('Page Critical Error: Not Found')
          }
          await relatedClient.prefetchAppPagePointDeep({
            executor,
            pagePoint: suitable.point as PagePoint | undefined,
            pageLocation: suitable.pageLocation,
            input: await this.getPointInput({ suitable, task, request }),
          })
          const dehydratedState = await executor.getQueryClientDehydratedState()
          return new Response(executor.pointsManager.transformer.stringify({ dehydratedState }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          })
        }
      } else if (outputType === 'html' && pointType === 'page') {
        throw new Error(`Client not found for point "${suitable.point?.name ?? 'unknown'}" while requested page html`)
      }

      const executeResult = await executor.execute({
        point: suitable.point,
        // TODO: wehn openapi will be ready, do not send here parsed input for this type of points
        input: await this.getPointInput({ suitable, task, request }),
      })
      if (executeResult.error) {
        this.server.logger.error(executeResult.error, meta)
      }

      if (executeResult.error) {
        return toJsonErrorResponse(executeResult.error, executeResult.status)
      }

      if (executeResult.output instanceof Response) {
        executeResult.output.headers.set('X-Point0-Not-Json-Data', 'true')
        return executeResult.output
      }

      if (!executeResult.output) {
        return toJsonErrorResponse(new Error0('No output'), 404)
      }

      // else we try to get endpoint json
      return new Response(executor.pointsManager.transformer.stringify(executeResult.output), {
        headers: { 'Content-Type': 'application/json' },
        status: executeResult.status,
      })
    } catch (error) {
      this.server.logger.error(error, meta)
      return toJsonErrorResponse(error)
    }
  }

  async fetch({
    request,
    requiredCtx,
    scope,
    bunServer,
  }: {
    request: Request
    requiredCtx: RequiredCtx
    scope?: PointsScope
    bunServer?: Bun.Server<unknown>
  }): Promise<Response | undefined> {
    const response0 = Response0.create()

    const prepareFetchResult = await this.prepareFetch({
      originalRequest: request,
      scope,
      bunServer,
    })

    return await SuperStore.runWithServerStorageProvider(
      {
        __POINT0_REQUEST0__: prepareFetchResult.request,
        __POINT0_RESPONSE0__: response0,
      },
      async () => {
        if (prepareFetchResult.devClientsProxyResult) {
          return prepareFetchResult.devClientsProxyResult.response
        }

        if (prepareFetchResult.publicdirResult) {
          return response0.apply(prepareFetchResult.publicdirResult.response)
        }

        const fetchPointResponse = await this.fetchPoint({
          request: prepareFetchResult.request,
          suitable: prepareFetchResult.pointResult.suitable,
          task: prepareFetchResult.pointResult.task,
          requiredCtx,
          scope,
          response0,
        })

        return response0.apply(fetchPointResponse)
      },
    )
  }
}

export type PrepareFetchResult =
  | {
      publicdirResult: undefined
      request: Request0
      devClientsProxyResult: { response: Response | undefined }
      pointResult: undefined
    }
  | {
      publicdirResult: { publicdir: Publicdir<true> | undefined; response: Response } // in case if it is bun dev server try to fetch abs path
      request: Request0
      devClientsProxyResult: undefined
      pointResult: undefined
    }
  | {
      publicdirResult: undefined
      request: Request0
      devClientsProxyResult: undefined
      pointResult: { suitable: GetSuitableResult; task: FetchTask | undefined }
    }

export type FetchTask = {
  pointType: EndPointType
  outputType: 'data' | 'queryClientDehydratedState'
  scope: PointsScope
  pointName: PointName
  pointInput: InputRawUnknown | undefined // in case if it is page or layout, we will parse input on task level, becouse we need it to extract totally match pageLocation
}

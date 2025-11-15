import type { Eversion } from '../core/eversion.js'
import type { RequiredCtx, RootId, WrapResponseFn } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { EngineLogger } from '../engine-shared/config.js'
import { toJsonErrorResponse } from '../engine-shared/error.js'
import type { ClientBun } from './client.js'
import type { ServerBun } from './server.js'

export const engineFetch = async ({
  server,
  clients,
  eversion,
  request,
  parsedUrl,
  rootId,
  fallbackRootId,
  requiredCtx,
  logger,
}: {
  server: ServerBun
  clients: ClientBun[]
  eversion: Eversion
  request: Request
  parsedUrl?: ParsedUrl
  rootId?: RootId
  fallbackRootId: RootId
  requiredCtx: RequiredCtx
  logger: EngineLogger
}): Promise<Response> => {
  if (process.env.NODE_ENV !== 'production') {
    // in case if some points was loaded via vite, we should refetch them
    await eversion.readPoints()
  }
  parsedUrl ??= parseUrl(request.url)
  let wrapResponse: WrapResponseFn = eversion.points.root._wrapResponse.bind(eversion.points.root)
  const meta: Record<string, any> = {
    url: request.url,
    rootId,
  }

  try {
    const publicDirs = [server.publicDir, ...clients.map((client) => client.publicDir)]
    for (const publicDir of publicDirs) {
      const staticResponse = await publicDir.fetch({ parsedUrl, request })
      if (staticResponse) {
        return staticResponse // already wrapped
      }
    }

    const responseFromSourceRootWrapRequest = await eversion.points.root._wrapRequest({
      request,
    })
    if (responseFromSourceRootWrapRequest) {
      return responseFromSourceRootWrapRequest
    }

    // TODO: lets provide here wrapResponse and wrapRequest and call it
    // TODO: also there on error fo input not throw it but return as error
    const { task, input, suitable, eversionRun } = await eversion.prepareEversionRunByRequest({
      request,
      parsedUrl,
      fallbackRootId,
      rootId,
      requiredCtx,
    })
    meta.rootId = suitable.eversion.points.root._rootId

    wrapResponse = async ({ request, response }) => {
      const responseFromSourceRootWrapResponse = await eversion.points.root._wrapResponse({
        request,
        response,
      })
      if (!suitable.point) {
        return responseFromSourceRootWrapResponse
      }
      const responseFromPointWrapResponse = await suitable.point._wrapResponse({
        request,
        response: responseFromSourceRootWrapResponse,
      })
      return responseFromPointWrapResponse
    }

    if (suitable.point && suitable.point !== eversion.points.root) {
      const responseFromPointWrapRequest = await suitable.point._wrapRequest({
        request,
      })
      if (responseFromPointWrapRequest) {
        return await wrapResponse({ request, response: responseFromPointWrapRequest })
      }
    }

    if (!suitable.point && process.env.NODE_ENV !== 'production') {
      const responseFromAbsFilePath = await fetchAbsFilePathOnDevServer({ parsedUrl, request })
      if (responseFromAbsFilePath) {
        return responseFromAbsFilePath
      }
    }

    const pointType = task?.pointType ?? 'page'
    const outputType = task?.outputType ?? 'html'
    meta.pointType = pointType
    meta.outputType = outputType
    meta.pointName = task?.pointName
    meta.pointType = task?.pointType

    const relatedClient = clients.find((client) => client.points.root === suitable.eversion.points.root)

    if (relatedClient) {
      if (relatedClient.ssr && outputType === 'html' && pointType === 'page') {
        try {
          if (!suitable.pageLocation) {
            // I think it will never throw, but who knows
            throw new Error('Page Critical Error: Not Found')
          }
          const extractResult = await eversionRun.extract({
            point: suitable.point,
            input,
          })
          if (extractResult.error) {
            logger.error(extractResult.error, meta)
          }
          const readableStream = await relatedClient.renderAsReadableStream({
            eversionRun,
            extractResult,
            pagePoint: suitable.point,
            pageLocation: suitable.pageLocation,
            input,
          })
          return await wrapResponse({
            request,
            response: new Response(readableStream, {
              headers: { 'Content-Type': 'text/html' },
              status: extractResult.status,
            }),
          })
        } catch (error) {
          // in case if entry provided in index.html is not correct, we fallback to original index.html with provided bun error
          if (error instanceof Error && error.message.includes('<!-- __POINT0_TARGET__ --> not found')) {
            const indexHtml = await relatedClient.getOriginalIndexHtmlWithEnvs(request.url)
            return await wrapResponse({
              request,
              response: new Response(indexHtml, {
                headers: { 'Content-Type': 'text/html' },
                status: 500,
              }),
            })
          }
          throw error
        }
      } else if (!relatedClient.ssr && outputType === 'html' && pointType === 'page' && relatedClient.indexHtml) {
        const indexHtml = await relatedClient.getOriginalIndexHtmlWithEnvs(request.url)
        return await wrapResponse({
          request,
          response: new Response(indexHtml, {
            headers: { 'Content-Type': 'text/html' },
            status: 200,
          }),
        })
      } else if (outputType === 'dehydratedState' && pointType === 'page') {
        if (!suitable.pageLocation) {
          // I think it will never throw, but who knows
          throw new Error('Page Critical Error: Not Found')
        }
        await relatedClient.prefetchAppPagePointDeep({
          eversionRun,
          pagePoint: suitable.point,
          pageLocation: suitable.pageLocation,
          input,
        })
        const dehydratedState = await eversionRun.getQueryClientDehydratedState()
        return await wrapResponse({
          request,
          response: new Response(JSON.stringify({ dehydratedState }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          }),
        })
      }
    } else if (outputType === 'html' && pointType === 'page') {
      throw new Error(`Client not found for point "${suitable.point?._name ?? 'unknown'}" while requested page html`)
    }

    const extractResult = await eversionRun.extract({
      point: suitable.point,
      input,
    })
    if (extractResult.error) {
      logger.error(extractResult.error, meta)
    }

    if (extractResult.error) {
      return await wrapResponse({
        request,
        response: toJsonErrorResponse(extractResult.error, extractResult.status),
      })
    }

    if (extractResult.response) {
      return await wrapResponse({
        request,
        response: extractResult.response,
      })
    }

    // else we try to get endpoint json
    return await wrapResponse({
      request,
      response: new Response(JSON.stringify(extractResult.data), {
        headers: { 'Content-Type': 'application/json' },
        status: extractResult.status,
      }),
    })
  } catch (error) {
    logger.error(error, meta)
    return await wrapResponse({
      request,
      response: toJsonErrorResponse(error, 500),
    })
  }
}

async function fetchAbsFilePathOnDevServer({
  parsedUrl,
  request,
}: {
  parsedUrl?: ParsedUrl
  request: Request
}): Promise<Response | undefined> {
  // if it is client bun dev serverm and assets was imported on ssr it returns abs file paths not bun assets, so just in dev we try to fetch them
  if (process.env.NODE_ENV === 'production') {
    return undefined
  }
  parsedUrl ??= parseUrl(request.url)
  const absPath = parsedUrl.urlObj.pathname
  const bunFile = Bun.file(absPath)
  if (await bunFile.exists()) {
    return new Response(Bun.file(absPath))
  }
  return undefined
}

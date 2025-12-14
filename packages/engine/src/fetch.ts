import type { ParsedUrl, PointsScope, RequiredCtx } from '@point0/core'
import { parseUrl } from '@point0/core'
import type { AllPointsManagers } from './all-points-managers.js'
import type { ClientBun } from './client.js'
import type { EngineLogger } from './config.js'
import { toJsonErrorResponse } from './error.js'
import type { ServerBun } from './server.js'
import { Error0 } from '@devp0nt/error0'

export const engineFetch = async ({
  bunServer,
  server,
  clients,
  allPointsManagers,
  request,
  parsedUrl,
  scope,
  fallbackScope,
  requiredCtx,
  logger,
}: {
  bunServer?: Bun.Server<unknown>
  server: ServerBun<true>
  clients: Array<ClientBun<true>>
  allPointsManagers: AllPointsManagers
  request: Request
  parsedUrl?: ParsedUrl
  scope?: PointsScope
  fallbackScope: PointsScope
  requiredCtx: RequiredCtx
  logger: EngineLogger
}): Promise<Response> => {
  if (process.env.NODE_ENV !== 'production') {
    for (const client of clients) {
      // it is provided when we serve via bun, if we serve via elysia, then elysia manages websocket by itself
      if (bunServer) {
        const bunDevServerUpgradeWebSocketResult = await client.upgradeProxyBunDevServerWebSocket({
          request,
          bunServer,
          parsedUrl,
        })
        if (bunDevServerUpgradeWebSocketResult) {
          return bunDevServerUpgradeWebSocketResult.result as never // it is just for hmr on dev
        }
      }
      const clientViteDevServerResponse = await client.fetchClientViteDevServerMiddleware({ request, parsedUrl })
      if (clientViteDevServerResponse) {
        return clientViteDevServerResponse
      }
      const clientBunDevServerResponse = await client.fetchClientBunDevServerMiddleware({ request, parsedUrl })
      if (clientBunDevServerResponse) {
        return clientBunDevServerResponse
      }
    }

    // in case if some points was loaded via vite, we should refetch them
    await allPointsManagers.readPoints()
  }
  parsedUrl ??= parseUrl(request.url)
  const meta: Record<string, any> = {
    url: request.url,
    scope,
  }

  try {
    const publicdirs = [server.publicdir, ...clients.map((client) => client.publicdir)]
    for (const publicdir of publicdirs) {
      const staticResponse = await publicdir.fetch({ parsedUrl, request })
      if (staticResponse) {
        return staticResponse
      }
    }

    // TODO: lets provide here wrapResponse and wrapRequest and call it
    // TODO: also there on error fo input not throw it but return as error
    const { task, input, suitable, extractor } = await allPointsManagers.prepareExtractorByRequest({
      request,
      parsedUrl,
      fallbackScope,
      scope,
      requiredCtx,
    })
    meta.scope = suitable.pointsManager.scope

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

    const relatedClient = clients.find((client) => client.pointsManager.scope === suitable.pointsManager.scope)

    if (relatedClient) {
      if (relatedClient.ssr && outputType === 'html' && pointType === 'page') {
        try {
          if (!suitable.pageLocation) {
            // I think it will never throw, but who knows
            throw new Error('Page Critical Error: Not Found')
          }
          const extractResult = await extractor.extract({
            point: suitable.point,
            input,
            withLayouts: true,
          })
          if (extractResult.error) {
            logger.error(extractResult.error, meta)
          }
          const readableStream = await relatedClient.renderAsReadableStream({
            extractor,
            extractResult,
            pagePoint: suitable.point,
            pageLocation: suitable.pageLocation,
            input,
          })
          return new Response(readableStream, {
            headers: { 'Content-Type': 'text/html' },
            status: extractResult.status,
          })
        } catch (error) {
          // in case if entry provided in index.html is not correct, we fallback to original index.html with provided bun error
          if (error instanceof Error && error.message.includes('<!-- __POINT0_TARGET__ --> not found')) {
            const indexHtml = await relatedClient.getOriginalIndexHtmlWithEnvs(request.url)
            return new Response(indexHtml, {
              headers: { 'Content-Type': 'text/html' },
              status: 500,
            })
          }
          throw error
        }
      } else if (!relatedClient.ssr && outputType === 'html' && pointType === 'page' && relatedClient.indexHtml) {
        const indexHtml = await relatedClient.getOriginalIndexHtmlWithEnvs(request.url)
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
          extractor,
          pagePoint: suitable.point,
          pageLocation: suitable.pageLocation,
          input,
        })
        const dehydratedState = await extractor.getQueryClientDehydratedState()
        return new Response(JSON.stringify({ dehydratedState }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    } else if (outputType === 'html' && pointType === 'page') {
      throw new Error(`Client not found for point "${suitable.point?._name ?? 'unknown'}" while requested page html`)
    }

    const extractResult = await extractor.extract({
      point: suitable.point,
      input,
    })
    if (extractResult.error) {
      logger.error(extractResult.error, meta)
    }

    if (extractResult.error) {
      return toJsonErrorResponse(extractResult.error, extractResult.status)
    }

    if (extractResult.output instanceof Response) {
      extractResult.output.headers.set('X-Point0-Response', 'true')
      return extractResult.output
    }

    if (!extractResult.output) {
      return toJsonErrorResponse(new Error0('No output'), 404)
    }

    // else we try to get endpoint json
    return new Response(JSON.stringify(extractResult.output), {
      headers: { 'Content-Type': 'application/json' },
      status: extractResult.status,
    })
  } catch (error) {
    logger.error(error, meta)
    return toJsonErrorResponse(error)
  }
}

async function fetchAbsFilePathOnDevServer({
  parsedUrl,
  request,
}: {
  parsedUrl?: ParsedUrl
  request: Request
}): Promise<Response | undefined> {
  // if it is client bun dev server and assets was imported on ssr it returns abs file paths not bun assets, so just in dev we try to fetch them
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

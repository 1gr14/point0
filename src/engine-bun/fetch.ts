import type { Eversion } from '../core/eversion.js'
import type { RequiredCtx, RootId } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { EngineLogger } from '../engine-shared/config.js'
import { toJsonErrorResponse } from '../engine-shared/error.js'
import { ClientBun } from './client-bun.js'
import type { ClientVite } from './client-vite.js'
import type { StaticDir } from './static-dir.js'

export const engineFetch = async ({
  clients,
  eversion,
  request,
  parsedUrl,
  rootId,
  fallbackRootId,
  requiredCtx,
  staticDirs,
  logger,
}: {
  clients: Array<ClientBun | ClientVite>
  eversion: Eversion
  request: Request
  parsedUrl?: ParsedUrl
  rootId?: RootId
  fallbackRootId: RootId
  requiredCtx: RequiredCtx
  staticDirs: StaticDir[]
  logger: EngineLogger
}): Promise<Response> => {
  parsedUrl ??= parseUrl(request.url)
  try {
    for (const staticDir of staticDirs) {
      const staticResponse = staticDir.fetch(parsedUrl)
      if (staticResponse) {
        return staticResponse
      }
    }
    const { task, extractResult, input, suitable, eversionRun } = await eversion.extractByRequest({
      request,
      parsedUrl,
      fallbackRootId,
      requiredCtx,
    })
    const pointType = task?.pointType ?? 'page'
    const outputType = task?.outputType ?? 'html'
    rootId = suitable.eversion.points.root._rootId

    // TODO: fix this when ClientVite will be implemented
    const relatedClient = clients.find(
      (client) => client.points.root === suitable.eversion.points.root && client instanceof ClientBun,
    ) as ClientBun | undefined
    if (extractResult.error) {
      logger.error(extractResult.error, { rootId })
    }

    if (relatedClient) {
      if (relatedClient.ssr && outputType === 'html' && pointType === 'page') {
        try {
          if (!suitable.pageLocation) {
            // I think it will never throw, but who knows
            throw new Error('Page Critical Error: Not Found')
          }
          // console.log(2222, { suitable })
          const readableStream = await relatedClient.renderAsReadableStream({
            eversionRun,
            extractResult,
            pagePoint: suitable.point,
            pageLocation: suitable.pageLocation,
            input,
          })
          // console.log(3333, { readableStream })
          return new Response(readableStream, {
            headers: { 'Content-Type': 'text/html' },
            status: extractResult.status,
          })
        } catch (error) {
          // in case if entry provided in index.html is not correct, we fallback to original index.html with provided bun error
          if (error instanceof Error && error.message.includes('<!-- __POINT0_TARGET__ --> not found')) {
            logger.error(error, { rootId: suitable.eversion.points.root._rootId })
            return new Response(await relatedClient.getOriginalIndexHtml(), {
              headers: { 'Content-Type': 'text/html' },
              status: 500,
            })
          }
          throw error
        }
      } else if (!relatedClient.ssr && outputType === 'html' && pointType === 'page' && relatedClient.distIndexHtml) {
        return new Response(await relatedClient.getOriginalIndexHtml(), {
          headers: { 'Content-Type': 'text/html' },
          status: 200,
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
        return new Response(JSON.stringify({ dehydratedState }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    if (extractResult.error) {
      return toJsonErrorResponse(extractResult.error, extractResult.status)
    }

    if (extractResult.response) {
      return extractResult.response
    }

    // else we try to get endpoint json
    return new Response(JSON.stringify(extractResult.data), {
      headers: { 'Content-Type': 'application/json' },
      status: extractResult.status,
    })
  } catch (error) {
    logger.error(error, { rootId })
    return toJsonErrorResponse(error, 500)
  }
}

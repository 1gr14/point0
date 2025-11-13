import type { Eversion } from '../core/eversion.js'
import type { RequiredCtx, RootId, WrapResponseFn } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { EngineLogger } from '../engine-shared/config.js'
import { toJsonErrorResponse } from '../engine-shared/error.js'
import type { ClientBun } from './client-bun.js'
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
  let wrapResponse: WrapResponseFn = eversion.points.root._wrapResponse.bind(eversion.points.root)
  const meta: Record<string, any> = {
    url: request.url,
    rootId,
  }

  try {
    for (const staticDir of staticDirs) {
      const staticResponse = await staticDir.fetch({ parsedUrl, request })
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

    const extractResult = await eversionRun.extract({
      point: suitable.point,
      input,
    })
    const pointType = task?.pointType ?? 'page'
    const outputType = task?.outputType ?? 'html'
    meta.pointType = pointType
    meta.outputType = outputType
    meta.pointName = task?.pointName
    meta.pointType = task?.pointType

    const relatedClient = clients.find((client) => client.points.root === suitable.eversion.points.root)
    if (extractResult.error) {
      logger.error(extractResult.error, meta)
    }

    if (relatedClient) {
      if (relatedClient.ssr && outputType === 'html' && pointType === 'page') {
        try {
          if (!suitable.pageLocation) {
            // I think it will never throw, but who knows
            throw new Error('Page Critical Error: Not Found')
          }
          const readableStream = await relatedClient.renderAsReadableStream({
            eversionRun,
            extractResult,
            pagePoint: suitable.point,
            pageLocation: suitable.pageLocation,
            input,
          })
          // const readableStream =
          //   relatedClient instanceof ClientBun
          //     ? await relatedClient.renderAsReadableStream({
          //         eversionRun,
          //         extractResult,
          //         pagePoint: suitable.point,
          //         pageLocation: suitable.pageLocation,
          //         input,
          //       })
          //     : await relatedClient.renderAppAsReadableStreamByUrl({
          //         eversion,
          //         rootId: suitable.eversion.points.root._rootId,
          //         url: request.url,
          //         env: relatedClient.env,
          //         originalIndexHtml: await relatedClient.getOriginalIndexHtml(),
          //         domRootElementId: relatedClient.domRootElementId,
          //       })
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
            logger.error(error, meta)
            const indexHtml = await relatedClient.getOriginalIndexHtml(request.url)
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
      } else if (!relatedClient.ssr && outputType === 'html' && pointType === 'page' && relatedClient.distIndexHtml) {
        const indexHtml = await relatedClient.getOriginalIndexHtml(request.url)
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
        // if (relatedClient instanceof ClientBun) {
        //   await relatedClient.prefetchAppPagePointDeep({
        //     eversionRun,
        //     pagePoint: suitable.point,
        //     pageLocation: suitable.pageLocation,
        //     input,
        //   })
        // } else {
        //   await relatedClient.prefetchAppPagePointDeepByUrl({
        //     eversion,
        //     rootId: suitable.eversion.points.root._rootId,
        //     url: request.url,
        //   })
        // }
        const dehydratedState = await eversionRun.getQueryClientDehydratedState()
        return await wrapResponse({
          request,
          response: new Response(JSON.stringify({ dehydratedState }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          }),
        })
      }
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

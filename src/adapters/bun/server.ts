import type {} from 'bun'
import { serve } from 'bun'
import * as nodePath from 'node:path'
import type { Method } from '../../core/index.js'
import { Eversion0 } from '../../eversion/runtime.js'
import { renderReadableStream } from '../../server/render.js'
import { parseServeInput, type ServeServerInput } from '../../server/serve.js'
import { isPathnameUnderBasepath } from '../../server/utils.js'
import { toJsonErrorResponse, toSuitableErrorResponse } from '../../server/error.js'
import { createElement } from 'react'
import type { AppComponent } from '../../client/mount.js'

// TODO: {points, clients: {points}}
// TODO: allow public dir per each client also
// TODO: allow special origin per each client also

export const createBunServer = async (props: ServeServerInput) => {
  const { points, port, publicDir, base, logger, clients } = parseServeInput(props)
  const fallbackBaseId = props.fallbackBaseId || clients.at(0)?.base._baseId || base._baseId
  const eversion = await Eversion0.create({ base, points })
  for (const client of clients) {
    await eversion.connect({ base: client.base, points: client.points })
  }

  // cache public files paths
  const publicFilesPaths = new Map<string, string>()
  if (publicDir) {
    try {
      const glob = new Bun.Glob('**/*')
      for await (const relPath of glob.scan({ cwd: publicDir, onlyFiles: true })) {
        const absPath = nodePath.resolve(publicDir, relPath)
        publicFilesPaths.set(relPath, absPath)
      }
    } catch (error) {
      // publicDir doesn't exist or is not accessible
      logger.info(`🔴 Please, fix path of publicDir provided to getBunServer: ${publicDir}`)
      throw error
    }
  }

  // dev serve client index.html
  const devClientSsrRoutes: Record<string, any> = await (async () => {
    if (process.env.NODE_ENV !== 'production') {
      return Object.fromEntries(
        await Promise.all(
          clients
            .flatMap((client) => (client.srcIndexHtml ? [{ client, srcIndexHtml: client.srcIndexHtml }] : []))
            .map(async (clientWithSrcIndexHtml) => {
              if (!(await Bun.file(clientWithSrcIndexHtml.srcIndexHtml).exists())) {
                throw new Error(
                  `srcIndexHtml file "${clientWithSrcIndexHtml.srcIndexHtml}" not found in development mode for client ${clientWithSrcIndexHtml.client.base._baseId}`,
                )
              }
              return [
                `/client-development-${clientWithSrcIndexHtml.client.base._baseId}.index.html`,
                (await import(clientWithSrcIndexHtml.srcIndexHtml)).default,
              ]
            }),
        ),
      )
    }
    return {}
  })()

  // prod serve client index.html from dist
  // dev serve index.html from '/client-development-<base-id>.index.html', will be set below on first request
  const originalIndexHtmls: Record<string, string | undefined> = await (async () => {
    return Object.fromEntries(
      await Promise.all(
        clients.map(async (client) => {
          if (process.env.NODE_ENV !== 'production') {
            return [client.base._baseId, undefined]
          }
          if (!client.distIndexHtml) {
            return [client.base._baseId, undefined]
          }
          if (!(await Bun.file(client.distIndexHtml).exists())) {
            throw new Error(`"${client.distIndexHtml}" not found in production mode for client ${client.base._baseId}`)
          }
          return [client.base._baseId, await Bun.file(client.distIndexHtml).text()]
        }),
      ),
    )
  })()

  // preload app.tsx
  const appsTsx: Record<string, string | undefined> = await (async () => {
    return Object.fromEntries(
      await Promise.all(
        clients.map(async (client) => {
          return [client.base._baseId, process.env.NODE_ENV === 'production' ? client.distAppTsx : client.srcAppTsx]
        }),
      ),
    )
  })()

  const bunServer = serve({
    port,
    development: process.env.NODE_ENV !== 'production' && {
      hmr: true,
    },
    routes: {
      ...devClientSsrRoutes,
      '/*': async (request) => {
        const url = new URL(request.url)
        const pathname = url.pathname
        const pathnameAsRelPath = pathname.replace(/^\//, '')
        const isJsonAcceptable = request.headers.get('Accept')?.includes('application/json')

        try {
          // serve client dist dir for production
          if (process.env.NODE_ENV === 'production') {
            const relatedClient = clients.find((client) => isPathnameUnderBasepath(pathname, client.distRoute))
            if (relatedClient?.distDir && relatedClient.distRoute && pathname.startsWith(relatedClient.distRoute)) {
              const clientFilePathAbs = nodePath.resolve(
                relatedClient.distDir,
                pathname.replace(new RegExp(`^${relatedClient.distRoute}`), ''),
              )
              if (clientFilePathAbs.startsWith(relatedClient.distDir)) {
                const clientFile = Bun.file(clientFilePathAbs)
                if (await clientFile.exists()) {
                  return new Response(Bun.file(clientFilePathAbs))
                }
              }
            }
          }

          // public dir
          if (publicDir) {
            const absPath = publicFilesPaths.get(pathnameAsRelPath)
            if (absPath) {
              try {
                return new Response(Bun.file(absPath))
              } catch (error) {
                return new Response('Not found', { status: 404 })
              }
            }
          }

          // robots.txt, will be applied only if there is no robots.txt in public dir
          if (pathname === '/robots.txt') {
            // return new Response('User-agent: *\nDisallow: /', { headers: { 'Content-Type': 'text/plain' } })
            return new Response('', { headers: { 'Content-Type': 'text/plain' } })
          }

          // avoid useless 404 errors in chrome devtools
          if (pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
            return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
          }

          // TODO: getSuitableLayouts, getSuitablePage, getSuitableEndpoint
          const extractResult = await eversion.extractSuitable({
            method: request.method as Method,
            path: pathname,
            fallbackBaseId,
          })
          const relatedClient = clients.find((client) => client.base === extractResult.base)
          if (extractResult.error) {
            logger.error(extractResult.error)
          }

          if (relatedClient) {
            if (
              relatedClient.srcIndexHtml &&
              process.env.NODE_ENV !== 'production' &&
              !originalIndexHtmls[relatedClient.base._baseId]
            ) {
              originalIndexHtmls[relatedClient.base._baseId] = await (
                await fetch(
                  `${url.origin}${relatedClient.basepath}client-development-${relatedClient.base._baseId}.index.html`,
                )
              ).text()
            }
            const originalIndexHtml = originalIndexHtmls[relatedClient.base._baseId]
            const appTsx = appsTsx[relatedClient.base._baseId]

            if (relatedClient.ssr && !isJsonAcceptable) {
              if (!originalIndexHtml) {
                if (process.env.NODE_ENV !== 'production') {
                  throw new Error(
                    `index.html not found for client ${relatedClient.base._baseId}, please provide srcIndexHtml for client in development mode`,
                  )
                } else {
                  throw new Error(
                    `index.html not found for client ${relatedClient.base._baseId}, please provide distIndexHtml for client in production mode`,
                  )
                }
              }
              // so we render page wrapped with layouts
              try {
                if (!appTsx) {
                  throw new Error(
                    `${process.env.NODE_ENV === 'production' ? 'dist' : 'src'}AppTsx not found for client "${relatedClient.base._baseId}", please provide it`,
                  )
                }
                const appComponent: AppComponent | undefined = await import(appTsx).then((module) => module.default)
                if (!appComponent) {
                  throw new Error(
                    `${process.env.NODE_ENV === 'production' ? 'dist' : 'src'}AppTsx not have default export`,
                  )
                }
                const pages = await Eversion0.toServerPagesCollection({
                  points: relatedClient.points,
                  ssrLocation: extractResult.location,
                })
                const appElement = createElement(appComponent, {
                  pages,
                  ssrLocation: extractResult.location,
                  dehydratedState: extractResult.dehydratedState,
                })
                const readableStream = await renderReadableStream({
                  element: appElement,
                  dehydratedState: extractResult.dehydratedState,
                  head: extractResult.head,
                  originalIndexHtml,
                  rootElementId: relatedClient.rootElementId,
                })
                return new Response(readableStream, {
                  headers: { 'Content-Type': 'text/html' },
                  status: extractResult.status,
                })
              } catch (error) {
                // in case if entry provided in index.html is not correct, we fallback to original index.html with provided bun error
                if (error instanceof Error && error.message.includes('<!-- __POINT0_TARGET__ --> not found')) {
                  logger.error(error)
                  return new Response(originalIndexHtml, {
                    headers: { 'Content-Type': 'text/html' },
                    status: 500,
                  })
                }
                throw error
              }
            } else if (!relatedClient.ssr && !isJsonAcceptable && relatedClient.distIndexHtml) {
              return new Response(originalIndexHtml, {
                headers: { 'Content-Type': 'text/html' },
                status: 200,
              })
            }
          }

          if (extractResult.error) {
            return toJsonErrorResponse(extractResult.error, extractResult.status)
          }

          // else we try to get endpoint json
          return new Response(JSON.stringify(extractResult.data), {
            headers: { 'Content-Type': 'application/json' },
            status: extractResult.status,
          })
        } catch (error) {
          logger.error(error)
          return toSuitableErrorResponse(error, 500, request.headers.get('Accept'))
        }
      },
    },
  })

  logger.info(`server is running at http://localhost:${bunServer.port}`)
  return bunServer
}

export default createBunServer

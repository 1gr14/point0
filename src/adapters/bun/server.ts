import type {} from 'bun'
import { serve } from 'bun'
import * as nodePath from 'node:path'
import { Point0 } from '../../core/index.js'
import { toJsonErrorResponse, toSuitableErrorResponse } from '../../server/error.js'
import { renderReadableStream } from '../../server/render.js'
import { parseServeInput, type ServeServerInput } from '../../server/serve.js'
import { isPathnameUnderBasepath } from '../../server/utils.js'

// TODO: {points, clients: {points}}
// TODO: {base, clients: {base}}
// TODO: allow public dir per each client also
// TODO: allow special origin per each client also

export const createBunServer = async (props: ServeServerInput) => {
  const { points, port, publicDir, server, client, logger, clients } = parseServeInput(props)

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
          clients.map(async (client, index) => {
            if (!client.srcEntry) {
              throw new Error(`srcEntry is required for client in development mode at index ${index}`)
            }
            if (!(await Bun.file(client.srcEntry).exists())) {
              throw new Error(`srcEntry file "${client.srcEntry}" not found in development mode at index ${index}`)
            }
            return [`/client-development-${index}.index.html`, (await import(client.srcEntry)).default]
          }),
        ),
      )
    }
    return {}
  })()

  // prod serve client index.html from dist
  // dev serve index.html from '/development.index.html', will be set below on first request
  const originalIndexHtmls: string[] = await (async () => {
    if (process.env.NODE_ENV === 'production') {
      return await Promise.all(
        clients.map(async (client, index) => {
          if (!client.distDir) {
            throw new Error(`distDir is required for client in production mode at index ${index}`)
          }
          if (!client.distRoute) {
            throw new Error(`distRoute is required for client in production mode at index ${index}`)
          }
          const clientDistIndexHtmlPath = nodePath.resolve(client.distDir, client.distRoute, 'index.html')
          if (!(await Bun.file(clientDistIndexHtmlPath).exists())) {
            throw new Error(`"${clientDistIndexHtmlPath}" not found in production mode at index ${index}`)
          }
          return await Bun.file(clientDistIndexHtmlPath).text()
        }),
      )
    }
    return []
  })()

  const bunServer = serve({
    port,
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
            const relatedClient = clients
              .map((client, index) => ({ index, ...client }))
              .find((client) => isPathnameUnderBasepath(pathname, client.distRoute))
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
          const { point, location } = await Point0.getSuitable({
            points,
            routePath: pathname,
          })
          if (!point) {
            return toSuitableErrorResponse({ message: 'Not Found', status: 404 })
          }

          const relatedClient = clients
            .map((client, index) => ({ index, ...client }))
            .find((client) => isPathnameUnderBasepath(pathname, client.basepath))

          if (relatedClient && relatedClient.ssr && !isJsonAcceptable) {
            if (process.env.NODE_ENV !== 'production') {
              originalIndexHtmls[relatedClient.index] = await (
                await fetch(
                  `${url.origin}${relatedClient.basepath}client-development-${relatedClient.index}.index.html`,
                )
              ).text()
            }
            const originalIndexHtml = originalIndexHtmls[relatedClient.index]

            // so we render page wrapped with layouts
            const {
              payload,
              error: extractError,
              status,
            } = await Point0.extractPage({
              server,
              client,
              point,
              location,
              requiredCtx: undefined, // can be headers here for example
            })
            const { element, error: fillError } = await Point0.fillPage({
              client,
              point,
              payload,
              location,
            })
            if (extractError || fillError) {
              logger.error(extractError || fillError)
            }
            try {
              // dev preset index.html with correct entry.js inserted ho have hml in client

              const readableStream = await renderReadableStream({
                element,
                payload,
                originalIndexHtml,
              })
              return new Response(readableStream, {
                headers: { 'Content-Type': 'text/html' },
                status,
              })
            } catch (error) {
              if (error instanceof Error && error.message.includes('<!-- __POINT0_TARGET__ --> not found')) {
                logger.error(error)
                return new Response(originalIndexHtml, {
                  headers: { 'Content-Type': 'text/html' },
                  status,
                })
              }
              throw error
            }
          }

          // else we try to get endpoint json
          const { data, error, status } = await Point0.extractEndpoint({
            server,
            client,
            point,
            location,
            requiredCtx: undefined, // can be headers here for example
          })
          if (error) {
            logger.error(error)
          }
          if (data) {
            return new Response(JSON.stringify(data), {
              headers: { 'Content-Type': 'application/json' },
              status,
            })
          } else if (error) {
            return toJsonErrorResponse({ error, status, data })
          } else {
            return toJsonErrorResponse({ message: 'Endpoint return nothing, no error, no data', status, data })
          }
        } catch (error) {
          logger.error(error)
          return toSuitableErrorResponse({ error, prefix: 'Fatal Error' })
        }
      },
    },
  })

  logger.info(`🚀 running at http://localhost:${bunServer.port}`)

  return bunServer
}

export default createBunServer

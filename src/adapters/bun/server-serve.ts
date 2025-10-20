import type {} from 'bun'
import { serve } from 'bun'
import * as nodePath from 'node:path'
import { Point0 } from '../../core/index.js'
import { toJsonErrorResponse, toSuitableErrorResponse } from '../../server/error.js'
import { renderReadableStream } from '../../server/render.js'
import { parseServeInput, type ServeServerInput } from '../../server/serve.js'

// TODO: const {routes} = createPointsGenerator({})
// TODO: const {routes} = createBunAdapter({})
// index:
//   path: src/index.html
// points:
//   path: node_modules/@point0/points.ts
//   generate: true
// public:
//   path: public
//   enabled: true
// client:
//   entry: node_modules/@point0/entry-client.ts
//   dist: dist/client
//   generate: true
// server:
//   entry: node_modules/@point0/entry-server.ts
//   dist: dist/server
//   generate: true
//   port: 'env.PORT' # true for auto port, string for manual port, number for port, false for no port so u can serve via somethig else manually
// )

// TODO: cache bun check results

export const getBunServer = async (props: ServeServerInput) => {
  const {
    points,
    port,
    publicDir,
    server,
    client,
    logger,
    clientServe,
    clientDistDir,
    clientDistRoute,
    clientSrcEntry,
  } = parseServeInput(props)

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
    if (process.env.NODE_ENV !== 'production' && clientSrcEntry && clientServe) {
      if (!(await Bun.file(clientSrcEntry).exists())) {
        throw new Error(`clientSrcEntry file "${clientSrcEntry}" not found`)
      }
      return {
        '/development.index.html': (await import(clientSrcEntry)).default,
      }
    }
    return {}
  })()

  // prod serve client index.html from dist
  // dev serve index.html from '/development.index.html', will be set below on first request
  let originalIndexHtml: string | undefined = await (async () => {
    if (process.env.NODE_ENV === 'production' && clientDistDir && clientServe) {
      const clientDistIndexHtmlPath = nodePath.resolve(clientDistDir, 'index.html')
      if (!(await Bun.file(clientDistIndexHtmlPath).exists())) {
        throw new Error(`"${clientDistIndexHtmlPath}" not found`)
      }
      return await Bun.file(clientDistIndexHtmlPath).text()
    }
    return undefined
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
          // dev preset index.html with correct entry.js inserted ho have hml in client
          if (process.env.NODE_ENV !== 'production' && clientServe && !originalIndexHtml) {
            originalIndexHtml = await (await fetch(`${url.origin}/development.index.html`)).text()
          }

          // serve client dist dir for production
          if (process.env.NODE_ENV === 'production' && clientServe && clientDistDir && clientDistRoute) {
            const distDirFixed = clientDistDir.replace(/\/$/, '') + '/'
            const distRouteFixed = clientDistRoute.replace(/^\//, '').replace(/\/$/, '') + '/'
            if (pathnameAsRelPath.startsWith(distRouteFixed)) {
              const clientFilePathAbs = nodePath.resolve(
                distDirFixed,
                pathnameAsRelPath.replace(new RegExp(`^${distRouteFixed}`), ''),
              )
              if (clientFilePathAbs.startsWith(distDirFixed)) {
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

          if (client && clientServe === 'ssr' && !isJsonAcceptable) {
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

  if (port && process.env.NODE_ENV !== 'production') {
    logger.info(`🚀 running at http://localhost:${port}`)
  }

  return bunServer
}

export default getBunServer

import type {} from 'bun'
import { serve } from 'bun'
import * as nodePath from 'node:path'
import { Point0 } from '../../core/index.js'
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
      logger.info(`Could not scan public directory: ${publicDir}`)
    }
  }

  // dev serve client index.html
  const devClientSsrRoutes: Record<string, any> = await (async () => {
    if (process.env.NODE_ENV === 'development' && clientSrcEntry && clientServe) {
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
        const isJsonRequested = request.headers.get('Accept')?.includes('application/json')
        const createErrorResponse = (message: string, status: number) => {
          if (isJsonRequested) {
            return new Response(JSON.stringify({ error: message }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            })
          } else {
            return new Response(message, {
              status: 500,
              headers: { 'Content-Type': 'text/html' },
            })
          }
        }

        try {
          // dev preset index.html with correct entry.js inserted ho have hml in client
          if (process.env.NODE_ENV === 'development' && clientServe && !originalIndexHtml) {
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

          // TODO: serve client with ssr or not
          // TODO: if request type json then json, else if ssr or not
          const { point, location } = await Point0.getSuitable({
            points,
            routePath: pathname,
          })
          if (!point) {
            return createErrorResponse('Not Found', 404)
          }

          if (clientServe === 'ssr' && !isJsonRequested) {
            // so we just render page
            const { element, payload, error, status } = await Point0.extractPageElement({
              server,
              point,
              location,
              requiredCtx: undefined, // can be headers here for example
            })
            if (error) {
              logger.error(error)
            }
            const readableStream = await renderReadableStream({ element, payload, originalHtml: originalIndexHtml })
            return new Response(readableStream, {
              headers: { 'Content-Type': 'text/html' },
              status,
            })
          }

          // else we try to get endpoint json
          const { data, error, status } = await Point0.extractEndpointResponse({
            server,
            point,
            location,
            requiredCtx: undefined, // can be headers here for example
          })
          if (error) {
            logger.error(error)
          }
          if (data) {
            return new Response(data, {
              headers: { 'Content-Type': 'application/json' },
              status,
            })
          } else if (error) {
            return new Response(data, {
              headers: { 'Content-Type': 'application/json' },
              status,
            })
          } else {
            return new Response(JSON.stringify({ error: 'Endpoint return nothing, no error, no data' }), {
              headers: { 'Content-Type': 'application/json' },
              status,
            })
          }
        } catch (error) {
          logger.error(error)
          return createErrorResponse('Internal Server Error', 500)
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

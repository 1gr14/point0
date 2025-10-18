import { renderReadableStream } from 'point0/entry-server.js'
import { Point0 } from 'point0/index'
import { serve } from 'bun'
import nodePath from 'node:path'
import { server } from '../src/lib/server.js'
import { points } from './points.js'
import type {} from 'bun'

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

const PORT = process.env.PORT ?? '3000'
const PUBLIC_DIR_PATH = nodePath.resolve(__dirname, '../public')
const CLIENT_DIST_DIR_PATH = nodePath.resolve(__dirname, '../dist/client')
const INDEX_FILE_DIST_PATH = nodePath.resolve(CLIENT_DIST_DIR_PATH, 'index.html')

const devRoutes: Record<string, any> = {}
if (process.env.NODE_ENV === 'development') {
  devRoutes['/development.index.html'] = (await import('../src/index.html')).default
}

let originalHtml: string | undefined = undefined

serve({
  port: PORT,
  routes: {
    ...devRoutes,
    '/*': async (request) => {
      const pathname = new URL(request.url).pathname
      const filePathRel = pathname.replace(/^\//, '')

      // client dist dir for production
      if (process.env.NODE_ENV === 'production') {
        if (filePathRel.startsWith('dist/client/')) {
          const clientFilePathAbs = nodePath.resolve(CLIENT_DIST_DIR_PATH, filePathRel.replace(/^dist\/client\//, ''))
          if (clientFilePathAbs.startsWith(CLIENT_DIST_DIR_PATH)) {
            const clientFile = Bun.file(clientFilePathAbs)
            if (await clientFile.exists()) {
              return new Response(Bun.file(clientFilePathAbs))
            }
          }
        }
      }

      // public dir
      const publicFilePathAbs = nodePath.resolve(PUBLIC_DIR_PATH, filePathRel)
      if (publicFilePathAbs.startsWith(PUBLIC_DIR_PATH)) {
        const publicFile = Bun.file(publicFilePathAbs)
        if (await publicFile.exists()) {
          return new Response(Bun.file(publicFilePathAbs))
        }
      }

      // robots.txt
      if (pathname === '/robots.txt') {
        return new Response('User-agent: *\nDisallow: /', { headers: { 'Content-Type': 'text/plain' } })
      }

      // avoid useless 404 errors in chrome devtools
      if (pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
        return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
      }

      // point0
      try {
        const url = new URL(request.url)
        originalHtml ||=
          process.env.NODE_ENV === 'development'
            ? await (await fetch(`${url.origin}/development.index.html`)).text()
            : await Bun.file(INDEX_FILE_DIST_PATH).text()
        const { element, payload, status, error } = await Point0.extractSuitablePageElement({
          server,
          points,
          routePath: url.pathname,
          requiredCtx: undefined, // can be headers here for example
        })
        if (error) {
          console.error('Rendering Error:', error)
        }
        const readableStream = await renderReadableStream({ element, payload, originalHtml })
        return new Response(readableStream, {
          headers: { 'Content-Type': 'text/html' },
          status,
        })
      } catch (error) {
        console.error('Fatal Error:', error)
        return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/html' } })
      }
    },
  },
})

console.log(`🚀 running at http://localhost:${PORT}`)

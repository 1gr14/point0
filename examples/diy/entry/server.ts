import { renderReadableStream } from 'point0/entry-server.js'
import { Point0 } from 'point0/index'
import { serve } from 'bun'
import nodePath from 'node:path'
import indexHtml from '../src/index.html'
import { server } from '../src/lib/server.js'
import { points } from './points.js'

const isDev = import.meta.env.NODE_ENV !== 'production'
const PORT = process.env.PORT ?? '3000'
// TODO: serve in prod
const PUBLIC_DIR_PATH = nodePath.resolve(__dirname, '../public')
const INDEX_FILE_PATH = nodePath.resolve(__dirname, '../src/index.html')
const INDEX_FILE_CONTENT = isDev ? undefined : await Bun.file(INDEX_FILE_PATH).text()

serve({
  development: isDev
    ? {
        hmr: true,
        console: true,
      }
    : false,
  port: PORT,
  routes: {
    ...(isDev
      ? {
          '/index.html': indexHtml,
        }
      : ({} as never)),
    '/*': async (request) => {
      const pathname = new URL(request.url).pathname

      // public dir
      const filePathRel = pathname.replace(/^\//, '')
      const filePathAbs = nodePath.resolve(PUBLIC_DIR_PATH, filePathRel)
      const file = Bun.file(filePathAbs)
      if (await file.exists()) {
        return new Response(Bun.file(filePathAbs))
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
        const originalHtml = isDev ? await (await fetch(`${url.origin}/index.html`)).text() : INDEX_FILE_CONTENT
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

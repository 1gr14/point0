import { overrideDocumentHtml } from '@devp0nt/page0/server'
import { serve } from 'bun'
import pages from '../client/pages/index.js'
import { serverPage0 } from '../server/page0'
import indexHtml from '../client/index.html'
import nodePath from 'node:path'

const isDev = import.meta.env.NODE_ENV !== 'production'
const PORT = process.env.PORT ?? '3000'
const PUBLIC_DIR_PATH = nodePath.resolve(__dirname, '../public')

serve({
  development: isDev
    ? {
        hmr: true,
        console: true,
      }
    : false,
  port: PORT,
  fetch: async (request) => {
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

    // well-known/appspecific/com.chrome.devtools.json
    if (pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
      return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
    }

    // page0
    try {
      const url = new URL(request.url)
      const originalHtml = isDev ? await (await fetch(`${url.origin}/index.html`)).text() : undefined
      const { clientPage0, node, payload, error } = await serverPage0.renderNode({
        pages,
        routePath: url.pathname,
        requiredCtx: undefined, // can be headers here for example
      })
      const { prefix, suffix } = originalHtml ? overrideDocumentHtml({
        originalHtml,
        payload,
      }) : 
      if (error) {
        console.error('Error rendering page:', error)
        return new Response((error as Error).message || 'Internal Server Error', {
          status: 500,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      const status = clientPage0 ? 200 : 404
      const readableStream = await serverPage0.getReadableStreamWithWrapper({ node, prefix, suffix })
      return new Response(readableStream, {
        headers: { 'Content-Type': 'text/html' },
        status,
      })
    } catch (error) {
      console.error('Error rendering page:', error)
      return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/html' } })
    }
  },
  routes: {
    '/robots.txt': async () => {
      return new Response('User-agent: *\nDisallow: /', { headers: { 'Content-Type': 'text/plain' } })
    },
    '/.well-known/appspecific/com.chrome.devtools.json': async () => {
      return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
    },
    '/index.html': indexHtml,
    '/*': 
  },
})

console.log(`🚀 running at http://localhost:${PORT}`)

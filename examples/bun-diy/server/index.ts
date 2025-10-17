import { serve } from 'bun'
import nodePath from 'node:path'
import { serverPage0 } from './page0'
import { overrideDocumentHtml } from '@devp0nt/page0/server'
import pages from '../client/pages/index.js'
// import type originalPagesCollection from '../client/pages/index.js'
import indexHtml from '../client/index.html'
import type { PagesCollection } from '@devp0nt/page0/client'
import type { ServerPage0 } from '@devp0nt/page0/server'

// TODO: movehelpers to lib
// TODO: files to entry dir/ entry/server.ts and entry/client.ts

const isDev = import.meta.env.NODE_ENV !== 'production'
const PORT = process.env.PORT ?? '3000'
// const CLIENT_ENTRY_SRC_ROUTE = '/client/index.js'
// const CLIENT_ENTRY_SRC_FILE_PATH = nodePath.resolve(__dirname, '../client/index.ts'
const CLIENT_SRC_DIR_PATH = nodePath.resolve(__dirname, '../client')
const CLIENT_DIST_DIR_PATH = nodePath.resolve(__dirname, '../dist/client')
const CLIENT_INDEX_HTML_SRC_PATH = nodePath.resolve(CLIENT_SRC_DIR_PATH, 'index.html')
const CLIENT_INDEX_HTML_DIST_PATH = nodePath.resolve(CLIENT_DIST_DIR_PATH, 'index.html')
const CLIENT_PAGES_SRC_FILE_PATH = nodePath.resolve(CLIENT_SRC_DIR_PATH, 'pages/index.js')
const CLIENT_PAGES_DIST_FILE_PATH = nodePath.resolve(CLIENT_DIST_DIR_PATH, 'pages/index.js')
const CLIENT_ENTRY_DIST_FILE_PATH = nodePath.resolve(CLIENT_DIST_DIR_PATH, 'index.js')
const CLIENT_ENTRY_DIST_DIR_ROUTE = '/dist/client'
const CLIENT_ENTRY_DIST_FILE_ROUTE = nodePath.resolve(CLIENT_ENTRY_DIST_DIR_ROUTE, 'index.js')
const SERVER_PAGE0_FILE_PATH = nodePath.resolve(__dirname, './page0.js')

// if (isDev) {
//   await Bun.build({
//     entrypoints: [CLIENT_ENTRY_SRC_FILE_PATH],
//     outdir: CLIENT_ENTRY_DIST_DIR_PATH,
//     splitting: true,
//   })
// }

serve({
  development: {
    hmr: true,
    console: true,
    // chromeDevToolsAutomaticWorkspaceFolders: true,
  },
  port: PORT,
  routes: {
    // [`${CLIENT_ENTRY_DIST_DIR_ROUTE}/**`]: async (req) => {
    //   const reqPath = new URL(req.url).pathname
    //   const filePathRel = reqPath.replace(new RegExp(`^${CLIENT_ENTRY_DIST_DIR_ROUTE}/`), '')
    //   const filePathAbs = nodePath.resolve(CLIENT_ENTRY_DIST_DIR_PATH, filePathRel)
    //   if (!filePathAbs.startsWith(CLIENT_ENTRY_DIST_DIR_PATH)) {
    //     return new Response('Not Found', { status: 404 })
    //   }
    //   return new Response(Bun.file(filePathAbs), {
    //     headers: {
    //       'Content-Type': 'application/javascript',
    //     },
    //   })
    // },
    '/robots.txt': async () => {
      return new Response('User-agent: *\nDisallow: /', {
        headers: { 'Content-Type': 'text/plain' },
      })
    },
    // '/.well-known/appspecific/com.chrome.devtools.json': async () => {
    //   return new Response('{}', {
    //     headers: { 'Content-Type': 'application/json' },
    //   })
    // },
    '/index.html': indexHtml,
    '/*': async (request) => {
      try {
        const url = new URL(request.url)
        const originalHtml = await (await fetch(`${url.origin}/index.html`)).text()
        // const pages = (await import(`${CLIENT_PAGES_SRC_FILE_PATH}?fresh=${Date.now()}`)).default as PagesCollection
        // const serverPage0 = (await import(`${SERVER_PAGE0_FILE_PATH}?fresh=${Date.now()}`)).serverPage0 as ServerPage0
        const { clientPage0, node, payload, error } = await serverPage0.renderNode({
          pages,
          routePath: url.pathname,
          requiredCtx: undefined, // can be headers here for example
        })
        const { prefix, suffix } = overrideDocumentHtml({
          originalHtml,
          payload,
        })
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
    // '/*': async (request) => {
    //   try {
    //     const url = new URL(request.url)
    //     console.log(123, CLIENT_ENTRY_DIST_FILE_PATH)
    //     const pages = (await import(`${CLIENT_PAGES_DIST_FILE_PATH}?fresh=${Date.now()}`)).default as PagesCollection
    //     console.log(3434, pages.length)
    //     const { readableStream, clientPage0, error } = await serverPage0.renderReadableStream({
    //       routePath: url.pathname,
    //       pages,
    //       clientBundlePath: CLIENT_ENTRY_DIST_FILE_ROUTE,
    //       requiredCtx: undefined, // can be headers here for example
    //     })
    //     if (error) {
    //       console.error('Error rendering page:', error)
    //       return new Response((error as Error).message || 'Internal Server Error', {
    //         status: 500,
    //         headers: { 'Content-Type': 'text/html' },
    //       })
    //     }
    //     const status = clientPage0 ? 200 : 404
    //     return new Response(readableStream, {
    //       headers: { 'Content-Type': 'text/html' },
    //       status,
    //     })
    //   } catch (error) {
    //     console.error('Error rendering page:', error)
    //     return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/html' } })
    //   }
    // },
  },
})

console.log(`🚀 server is running at http://localhost:${PORT}`)

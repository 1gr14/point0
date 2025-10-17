import { serve } from 'bun'
import { renderToReadableStream } from 'react-dom/server'
import { clientPages0 } from '../client/pages/index.js'
import { serverPage0 } from './page0.js'
import nodePath from 'node:path'

const PORT = process.env.PORT ?? '3000'
const CLIENT_ENTRY_SRC_ROUTE = '/client/index.js'
const CLIENT_ENTRY_SRC_REL_PATH = '../client/index.ts'
const CLIENT_ENTRY_SRC_ABS_PATH = nodePath.resolve(__dirname, CLIENT_ENTRY_SRC_REL_PATH)
const CLIENT_ENTRY_DIST_ROUTE = '/dist/client/index.js'
const CLIENT_ENTRY_DIST_REL_PATH = '../dist/client/index.js'
const CLIENT_ENTRY_DIST_ABS_PATH = nodePath.resolve(__dirname, CLIENT_ENTRY_DIST_REL_PATH)

await Bun.build({
  entrypoints: [CLIENT_ENTRY_SRC_ABS_PATH],
  outdir: 'dist/client',
})

serve({
  development: {
    hmr: true,
    console: true,
  },
  port: PORT,
  routes: {
    [CLIENT_ENTRY_SRC_ROUTE]: async () => {
      return new Response(Bun.file(CLIENT_ENTRY_SRC_ABS_PATH), {
        headers: {
          'Content-Type': 'application/javascript',
        },
      })
    },
    [CLIENT_ENTRY_DIST_ROUTE]: async () => {
      return new Response(Bun.file(CLIENT_ENTRY_DIST_ABS_PATH), {
        headers: {
          'Content-Type': 'application/javascript',
        },
      })
    },
    '/*': async (request) => {
      try {
        const url = new URL(request.url)
        // const { node, payload, meta } = await serverPage0.renderNode({
        //   path: url.pathname,
        //   clientPages0,
        //   requiredCtx: undefined, // can be headers here for example
        // })
        // const stream = await renderToReadableStream(node, { bootstrapModules: [CLIENT_ENTRY_SRC_ROUTE] })
        // return new Response(stream, {
        //   headers: {
        //     'Content-Type': 'text/html',
        //   },
        //   status: 200,
        // })
        const { html, payload, meta, node, clientPage0 } = await serverPage0.renderStatic({
          path: url.pathname,
          clientPages0,
          clientBundlePath: CLIENT_ENTRY_DIST_REL_PATH,
          requiredCtx: undefined, // can be headers here for example
        })
        // const stream = await renderToReadableStream(html, { bootstrapModules: [CLIENT_ENTRY_SRC_ROUTE] })
        console.log(444, html)
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' },
        })
      } catch (error) {
        console.error('Error rendering page:', error)
        return new Response('Internal Server Error', { status: 500 })
      }
    },
  },
  // async fetch(req) {
  //   const path = new URL(req.url).pathname
  //   console.log(3334, path)
  //   if (path === CLIENT_ENTRY_SRC_ROUTE)
  //     return new Response(Bun.file(CLIENT_ENTRY_DIST_PATH), {
  //       headers: {
  //         'Content-Type': 'application/javascript',
  //       },
  //     })
  //   return new Response('Not Found', { status: 404 })
  // },

  // routes: {
  //   '/': async () => {
  //     try {
  //       const { node, payload, meta } = await serverPage0.renderNode({
  //         path: url.pathname,
  //         clientPages0,
  //         requiredCtx: undefined, // can be headers here for example
  //       })
  //       return new Response(stream, {
  //         headers: {
  //           'Content-Type': 'text/html',
  //         },
  //         status: 200,
  //       })
  //     } catch (error) {
  //       console.error('Error rendering page:', error)
  //       return new Response('Internal Server Error', { status: 500 })
  //     }
  //   },
  // },

  // fetch: async (req) => {
  //   const url = new URL(req.url)
  //   const { node, payload, meta } = await serverPage0.renderNode({
  //     path: url.pathname,
  //     clientPages0,
  //     requiredCtx: undefined, // can be headers here for example
  //   })
  //   const stream = await renderToReadableStream(node, { bootstrapScripts: ['/client/index.js'] })
  //   return new Response(stream, {
  //     headers: { 'Content-Type': 'text/html' },
  //   })
  // },

  // routes: {
  //   '/': indexHtml,
  //   '/*': async (req) => {
  //     const url = new URL(req.url)
  //     const html = await serverPage0.renderStatic({
  //       path: url.pathname,
  //       clientPages0,
  //       renderer: renderToStaticMarkup,
  //       clientBundlePath: '/client/main.js',
  //     })
  //     return new Response(html, {
  //       headers: { 'Content-Type': 'text/html' },
  //     })
  //   },
  // },
})

console.log(`🚀 IdeaNick server is running at http://localhost:${PORT}`)

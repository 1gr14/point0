import { serve } from 'bun'
import nodePath from 'node:path'
import { clientPages } from '../client/pages/index.js'
import { serverPage0 } from './page0.js'

const PORT = process.env.PORT ?? '3000'
// const CLIENT_ENTRY_SRC_ROUTE = '/client/index.js'
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
        const { readableStream, clientPage0, error } = await serverPage0.renderReadableStream({
          routePath: url.pathname,
          clientPages,
          clientBundlePath: CLIENT_ENTRY_DIST_REL_PATH,
          requiredCtx: undefined, // can be headers here for example
        })
        if (error) {
          console.error('Error rendering page:', error)
          return new Response((error as Error).message || 'Internal Server Error', {
            status: 500,
            headers: { 'Content-Type': 'text/html' },
          })
        }
        const status = clientPage0 ? 200 : 404
        return new Response(readableStream, {
          headers: { 'Content-Type': 'text/html' },
          status,
        })
      } catch (error) {
        console.error('Error rendering page:', error)
        return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/html' } })
      }
    },
  },
})

console.log(`🚀 server is running at http://localhost:${PORT}`)

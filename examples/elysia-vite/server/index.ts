import { staticPlugin } from '@elysiajs/static'
import { Elysia } from 'elysia'
import { renderToStaticMarkup } from 'react-dom/server'
import { clientPages0 } from '../pages/index'
import { serverPage0 } from './page0'

const isDev = import.meta.env.NODE_ENV === 'development'
const clientBundlePath = isDev ? '/@vite/client' : '/assets/main.js'

const app = new Elysia()
  // Serve static files from Vite build for production
  .use(
    staticPlugin({
      assets: './dist/client',
      prefix: '/assets',
    }),
  )
  // Prevent Vite HMR client from being served as a static file
  // .get('/entry-client.js', () => undefined)
  // .get('/@vite/client', () => undefined)
  // Handle all routes with SSR
  .get('/*', async ({ request }) => {
    const url = new URL(request.url)
    const path = url.pathname
    console.log(3334, path)
    if (path === '/entry-client.tsx') {
      return undefined
    }
    if (path === '/@vite/client') {
      return undefined
    }

    try {
      const html = await serverPage0.renderStatic({
        path: url.pathname,
        clientPages0,
        renderer: renderToStaticMarkup,
        clientBundlePath,
      })

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    } catch (error) {
      console.error('Error rendering page:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  })

const port = import.meta.env.PORT ? parseInt(import.meta.env.PORT) : 3000

app.listen(port, () => {
  console.log(`🚀 IdeaNick server is running at http://localhost:${port}`)
  console.log(`📦 Mode: ${isDev ? 'development' : 'production'}`)
  console.log(`🔧 Client bundle: ${isDev ? 'HMR enabled' : 'production bundle'}`)
})

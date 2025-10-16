import { staticPlugin } from '@elysiajs/static'
import { Elysia } from 'elysia'
import { renderToStaticMarkup } from 'react-dom/server'
import { clientPages0 } from '../client/pages.js'
import { serverPage0 } from './page.js'

const app = new Elysia()
  // Serve static files from Vite build
  .use(
    staticPlugin({
      assets: './dist/client',
      prefix: '/assets',
    }),
  )

  // Handle all routes with SSR
  .get('/*', async ({ request }) => {
    const url = new URL(request.url)
    try {
      const html = await serverPage0.renderStatic({
        path: url.pathname,
        clientPages0,
        renderer: renderToStaticMarkup,
        clientBundlePath: '/assets/main.js',
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

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000

app.listen(port, () => {
  console.log(`🚀 IdeaNick server is running at http://localhost:${port}`)
})

import { Engine } from '@point0/engine'
import { routes } from './lib/routes'

export const engine = Engine.create(import.meta.url, {
  // clientsServerOutdir: '../dist/server',
  // clientsSelfOutdir: '../dist',
  pointsGlob: ['**/*.{ts,tsx}'],
  server: {
    scope: 'server',
    port: 3000,
    entry: './index.server.ts',
    outdir: '../dist/server/self',
    publicdirOutdir: '../dist/public',
  },
  clients: [
    {
      scope: 'client',
      app: './app.js',
      points: './lib/points.ts',
      pointsLazy: './lib/points.ts',
      routes,
      indexHtml: '../index.html',
      port: 3001,
      env: ['SOURCE_BASE_URL'],
      publicdir: [
        '../public',
        {
          '.well-known/appspecific/com.chrome.devtools.json': new Response('{}'),
          'robots.txt': new Response('User-agent: *\nDisallow: /'),
        },
      ],
      outdir: '../dist/client',
      serverOutdir: '../dist/server/client',
      publicdirOutdir: '../dist/client',
      viteConfig: '../vite.config.ts',
    },
  ],
})

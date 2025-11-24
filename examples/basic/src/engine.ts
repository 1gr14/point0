import { Engine } from '@point0/engine'
import { routes } from './lib/routes'

export const engine = Engine.create(import.meta.url, {
  // clientsServerOutdir: '../dist/server',
  // clientsSelfOutdir: '../dist',
  pointsGlob: ['**/*.{ts,tsx}'],
  server: {
    scope: 'server',
    port: 3000,
    entry: { main: './index.server.ts' },
    outdir: '../dist/server/self',
  },
  clients: [
    {
      scope: 'client',
      ssr: true,
      app: './app.js',
      points: './lib/points.ts',
      routes,
      indexHtml: './index.html',
      port: 3001,
      env: ['SOURCE_BASE_URL'],
      outdir: '../dist/client',
      serverOutdir: '../dist/server/client',
      publicdir: ['../public', { '.well-known/appspecific/com.chrome.devtools.json': new Response('{}') }],
      publicdirOutdir: '../dist/client',
    },
  ],
})

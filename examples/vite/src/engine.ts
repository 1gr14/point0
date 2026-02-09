import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url,
  // clientsServerOutdir: '../dist/server',
  // clientsSelfOutdir: '../dist',
  pointsGlob: ['**/*.{ts,tsx}'],
  server: {
    scope: 'client',
    points: async () => await import('./lib/points'),
    port: 3000,
    entry: './index.server.ts',
    outdir: '../dist/server',
    viteConfig: '../vite.config.ts',
  },
  clients: [
    {
      scope: 'client',
      app: async () => await import('./app'),
      points: async () => await import('./lib/points'),
      generate: [
        {
          what: 'points',
          path: './lib/points.ts',
        },
        {
          what: 'routes',
          path: './lib/routes.generated.ts',
        },
      ],
      routes: async () => await import('./lib/routes').then((m) => m.routes),
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
      publicdirOutdir: '../dist/client',
      viteConfig: '../vite.config.ts',
    },
  ],
})

import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url,
  // clientsServerOutdir: '../dist/server',
  // clientsSelfOutdir: '../dist',
  pointsGlob: ['**/*.{ts,tsx}'],
  server: {
    scope: 'server',
    port: 3000,
    entry: { main: './index.server.ts' },
    points: async () => await import('./lib/points.server.js'),
    routes: async () => await import('./lib/routes').then((m) => m.routes),
    outdir: '../dist/server',
    generate: [
      {
        what: 'points',
        file: './lib/points.server.ts',
      },
      {
        what: 'routes',
        file: './lib/routes.generated.ts',
      },
    ],
  },
  clients: [
    {
      scope: 'client',
      app: async () => await import('./app.js'),
      points: async () => await import('./lib/points.js'),
      generate: [
        {
          what: 'points',
          file: './lib/points.client.ts',
        },
        {
          what: 'routes',
          file: './lib/routes.generated.ts',
        },
      ],
      routes: async () => await import('./lib/routes').then((m) => m.routes),
      indexHtml: './index.html',
      port: 3001,
      env: { vars: ['SOURCE_BASE_URL'] },
      outdir: '../dist/client',
      publicdir: {
        source: [
          '../public',
          {
            '.well-known/appspecific/com.chrome.devtools.json': new Response('{}'),
            'robots.txt': new Response('User-agent: *\nDisallow: /'),
          },
        ],
        outdir: '../dist/client',
      },
    },
  ],
})

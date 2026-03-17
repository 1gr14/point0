import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url,
  // clientsServerOutdir: '../dist/server',
  // clientsSelfOutdir: '../dist',
  pointsGlob: ['**/*.{ts,tsx}'],
  server: {
    scope: 'client',
    points: async () => await import('./lib/points.server'),
    generate: [
      {
        what: 'points',
        outfile: './lib/points.server.ts',
      },
    ],
    port: 3020,
    entry: './index.server.ts',
    outdir: '../dist/server',
    viteConfig: '../vite.config.ts',
  },
  clients: [
    {
      scope: 'client',
      app: async () => await import('./app'),
      points: async () => await import('./lib/points.client'),
      generate: [
        {
          what: 'points',
          outfile: './lib/points.client.ts',
        },
        {
          what: 'routes',
          outfile: './lib/routes.generated.ts',
        },
      ],
      routes: async () => await import('./lib/routes').then((m) => m.routes),
      indexHtml: './index.html',
      port: 3021,
      env: { vars: ['SOURCE_BASE_URL'] },
      publicdir: {
        source: [
          '../public',
          {
            '.well-known/appspecific/com.chrome.devtools.json': () => '{}',
            'robots.txt': () => 'User-agent: *\nDisallow: /',
          },
        ],
        outdir: '../dist/client',
      },
      outdir: '../dist/client',
      viteConfig: '../vite.config.ts',
    },
  ],
})

import { Engine } from '@point0/engine'
export const engine = Engine.create({
  file: import.meta.url,
  pointsGlob: ['**/*.{ts,tsx}'],
  portPolicy: 'kill',
  server: {
    scope: 'client',
    port: 3000,
    entry: { main: './index.server.ts' },
    generate: [
      {
        what: 'points',
        outfile: './lib/points.ready.ts',
      },
    ],
    points: async () => await import('./lib/points.ready'),
    outdir: '../dist/server',
  },
  clients: [
    {
      scope: 'client',
      app: async () => await import('./app'),
      points: async () => await import('./lib/points.ready'),
      // points: async () => points,
      // generatePointsLazy: './lib/points.lazy.ts',
      // generatePointsReady: './lib/points.ready.ts',
      generate: [
        {
          what: 'points',
          outfile: './lib/points.lazy.ts',
        },
        {
          what: 'routes',
          outfile: './lib/routes.generated.ts',
        },
      ],
      // pointsModuleType: 'ready',
      // points: await import('./lib/points'),
      routes: async () => await import('./lib/routes'),
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

import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url,
  pointsGlob: ['**/*.{ts,tsx,mdx}'],
  portPolicy: 'kill',
  ssr: true,
  server: {
    scope: 'client',
    port: 3000,
    entry: { main: './index.server.ts' },
    generate: [
      {
        what: 'points',
        outfile: './lib/points.server.ts',
      },
    ],
    points: async () => await import('./lib/points.server'),
    outdir: '../dist/server',
  },
  clients: [
    {
      scope: 'client',
      app: async () => await import('./app'),
      points: async () => await import('./lib/points.client'),
      // points: async () => points,
      // generatePointsLazy: './lib/points.lazy.ts',
      // generatePointsReady: './lib/points.ready.ts',
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
            '.well-known/appspecific/com.chrome.devtools.json': () => '{}',
            'robots.txt': () => 'User-agent: *\nDisallow: /',
          },
        ],
        outdir: '../dist/client',
      },
    },
  ],
})

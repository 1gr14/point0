import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url,
  pointsGlob: ['**/*.{ts,tsx}'],
  portPolicy: 'kill',
  ssr: true,
  server: {
    scope: 'site',
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
      scope: 'site',
      app: async () => await import('./app'),
      points: async () => await import('./lib/points.client'),
      generate: [
        {
          what: 'points',
          outfile: './lib/points.client.ts',
        },
        {
          what: 'routes',
          outfile: './lib/routes.ts',
        },
      ],
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

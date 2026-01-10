import { Engine } from '@point0/engine'
export const engine = Engine.create(
  {
    pointsGlob: ['**/*.{ts,tsx}'],
    server: {
      scope: 'server',
      port: 3000,
      entry: { main: './index.server.ts' },
      outdir: '../dist/server',
    },
    clients: [
      {
        scope: 'client',
        app: async () => await import('./app'),
        points: async () => await import('./lib/points.ready'),
        // points: async () => points,
        generatePointsLazy: './lib/points.lazy.ts',
        generatePointsReady: './lib/points.ready.ts',
        // pointsModuleType: 'ready',
        // points: await import('./lib/points'),
        routes: async () => await import('./lib/routes'),
        indexHtml: './index.html',
        port: 3001,
        env: ['SOURCE_BASE_URL'],
        outdir: '../dist/client',
        publicdir: [
          '../public',
          {
            '.well-known/appspecific/com.chrome.devtools.json': new Response('{}'),
            'robots.txt': new Response('User-agent: *\nDisallow: /'),
          },
        ],
        publicdirOutdir: '../dist/client',
      },
    ],
  },
  import.meta.url,
)

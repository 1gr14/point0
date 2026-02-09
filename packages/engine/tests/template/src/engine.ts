import { Engine } from '@point0/engine'
export const engine = Engine.create({
  file: import.meta.url,
  pointsGlob: ['**/*.{ts,tsx}'],
  server: {
    scope: 'root',
    entry: { main: './index.server.ts' },
    points: async () => await import('./lib/points.server'),
    generate: [
      {
        what: 'points',
        path: './lib/points.server.ts',
      },
      {
        what: 'routes',
        path: './lib/routes.generated.ts',
      },
    ],
    outdir: '../dist/server',
    // port: server,
    // hmrPort: server,
    // viteConfig: '../vite.config.ts',
  },
  clients: [
    {
      scope: 'root',
      app: async () => await import('./app'),
      points: async () => await import('./lib/points.client'),
      routes: async () => await import('./lib/routes'),
      generate: [
        {
          what: 'points',
          path: './lib/points.client.ts',
        },
        {
          what: 'routes',
          path: './lib/routes.ts',
        },
      ],
      indexHtml: './index.html',
      outdir: '../dist/client',
      publicdir: '../public',
      publicdirOutdir: '../dist/client',
      // port: client,
      // hmrPort: client,
      // viteConfig: '../vite.config.ts',
    },
  ],
})

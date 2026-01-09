import { Engine } from '@point0/engine'
export const engine = Engine.create(import.meta.url, {
  pointsGlob: ['**/*.{ts,tsx}'],
  server: {
    scope: 'root',
    entry: { main: './index.server.ts' },
    points: async () => await import('./lib/points.server'),
    generatePointsReady: './lib/points.server.ts',
    outdir: '../dist/server',
  },
  clients: [
    {
      scope: 'root',
      app: async () => await import('./app'),
      points: async () => await import('./lib/points.client'),
      routes: async () => await import('./lib/routes'),
      generatePointsLazy: './lib/points.client.ts',
      generateRoutes: './lib/routes.ts',
      indexHtml: './index.html',
      outdir: '../dist/client',
      publicdir: '../public',
      publicdirOutdir: '../dist/client',
    },
  ],
})

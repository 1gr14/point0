import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url,
  pointsGlob: ['**/*.{ts,tsx}'],
  ssr: true,
  generate: { assetsTypes: './lib/assets.d.ts' },
  server: {
    scope: 'site',
    devWatchGlob: ['**/*.{ts,tsx}'],
    port: 3000,
    entry: { main: './index.server.ts' },
    generate: { points: './lib/points.server.ts' },
    points: async () => await import('./lib/points.server'),
    outdir: '../dist/server',
  },
  client: {
    scope: 'site',
    app: async () => await import('./app'),
    points: async () => await import('./lib/points.client'),
    generate: { points: './lib/points.client.ts', routes: './lib/routes.ts' },
    routes: async () => await import('./lib/routes'),
    indexHtml: './index.html',
    port: 3001,
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
})

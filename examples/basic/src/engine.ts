import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url,
  pointsGlob: ['**/*.{ts,tsx,mdx}'],
  portPolicy: 'kill',
  ssr: true,
  generate: { meta: './lib/meta.ts' },
  server: {
    scope: 'root',
    port: 3000,
    entry: { main: './index.server.ts' },
    generate: { points: './lib/points.server.ts' },
    points: async () => await import('./lib/points.server'),
    outdir: '../dist/server',
    importer: {
      deny: ['./lib/client-thing.*'],
    },
  },
  clients: [
    {
      scope: 'root',
      app: async () => await import('./app'),
      points: async () => await import('./lib/points.client'),
      // points: async () => points,
      // generatePointsLazy: './lib/points.lazy.ts',
      // generatePointsReady: './lib/points.ready.ts',
      generate: { points: './lib/points.client.ts', routes: './lib/routes.ts' },
      importer: {
        deny: ['**/prisma.*'],
      },
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

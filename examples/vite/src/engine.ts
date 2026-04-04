import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url,
  // clientsServerOutdir: '../dist/server',
  // clientsSelfOutdir: '../dist',
  ssr: true,
  pointsGlob: ['**/*.{ts,tsx,mdx}'],
  server: {
    scope: 'client',
    devWatchGlob: ['**/*.{ts,tsx,mdx}'],
    points: async () => await import('./lib/points.server'),
    generate: { points: './lib/points.server.ts' },
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
      generate: { points: './lib/points.client.ts', routes: './lib/routes.ts' },
      routes: async () => await import('./lib/routes').then((m) => m.routes),
      importer: {
        deny: ['**/prisma.*'],
      },
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

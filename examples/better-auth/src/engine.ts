import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url,
  ssr: true,
  pointsGlob: '**/*.{ts,tsx,mdx}',
  generate: { meta: './generated/point0/meta.ts' },
  server: {
    scope: 'root',
    port: 3000,
    entry: { main: './index.server.ts' },
    points: async () => await import('./generated/point0/points.server'),
    generate: { points: './generated/point0/points.server.ts' },
    outdir: '../dist/server',
    devWatchGlob: ['**/*.{ts,tsx,mdx}', '!generated/point0/meta.ts'],
  },
  clients: [
    {
      scope: 'root',
      port: 3001,
      indexHtml: './index.html',
      app: async () => await import('./app.client'),
      points: async () => await import('./generated/point0/points.client'),
      generate: { points: './generated/point0/points.client.ts', routes: './generated/point0/routes.ts' },
      importer: {
        deny: ['**/prisma.*'],
      },
      bunPlugins: ['bun-plugin-tailwind'],
      env: { vars: ['SERVER_URL', 'BETTER_AUTH_URL'] },
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
    },
  ],
})

import { Engine } from '@point0/engine'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

export const engine = Engine.create({
  file: import.meta.url,
  ssr: true,
  pointsGlob: '**/*.{ts,tsx,mdx}',
  generate: { meta: './generated/point0/meta.ts' },
  viteConfig: ({ plugins }) => {
    return {
      resolve: {
        tsconfigPaths: true,
      },
      plugins: [
        ...plugins,
        react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
        svgr(),
        tailwindcss(),
        // options.side === 'client' ? analyzer() : null,
      ],
    }
  },
  server: {
    scope: 'root',
    port: process.env.SERVER_PORT,
    entry: { main: './app.server.ts' },
    points: async () => await import('./generated/point0/points.server'),
    generate: { points: './generated/point0/points.server.ts' },
    outdir: '../dist/server',
    devWatchGlob: ['**/*.{ts,tsx,mdx}', '!generated/point0/meta.ts'],
  },
  client: {
    scope: 'root',
    port: process.env.CLIENT_PORT,
    indexHtml: './index.html',
    app: async () => await import('./app.client'),
    points: async () => await import('./generated/point0/points.client'),
    generate: { points: './generated/point0/points.client.ts', routes: './generated/point0/routes.ts' },
    importer: {
      deny: ['**/prisma.*'],
    },
    env: { vars: ['SERVER_URL'] },
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
})

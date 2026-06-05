import { Engine } from '@point0/engine'
import { clientEnvKeys } from '@/lib/env/client-shape'

export const engine = Engine.create({
  file: import.meta.url,
  ssr: true,
  pointsGlob: '**/*.{ts,tsx,mdx}',
  generate: { meta: './generated/point0/meta.ts', assetsTypes: './generated/point0/assets.d.ts' },
  server: {
    scope: 'root',
    port: process.env.SERVER_PORT || process.env.PORT,
    entry: { main: './app.server.ts' },
    points: async () => await import('./generated/point0/points.server'),
    generate: { points: './generated/point0/points.server.ts' },
    outdir: '../dist/server',
  },
  client: {
    compiler: {
      babel: ['babel-plugin-react-compiler'],
    },
    scope: 'root',
    port: process.env.CLIENT_PORT,
    indexHtml: './index.html',
    app: async () => await import('./app.client'),
    points: async () => await import('./generated/point0/points.client'),
    generate: {
      points: './generated/point0/points.client.ts',
      routes: './generated/point0/routes.ts',
    },
    bunPlugins: ['bun-plugin-tailwind'],
    env: { vars: clientEnvKeys },
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

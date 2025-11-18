import { Engine } from 'point0/engine-bun/index.js'
import { routes } from './lib/routes'

export const engine = Engine.create(import.meta.url, {
  clientsServerOutdir: '../dist/server',
  clientsSelfOutdir: '../dist',
  pointsGlob: ['**/*.{ts,tsx}'],
  server: {
    scope: 'server',
    points: './lib/points.server.ts',
    port: 3000,
    entry: { main: './index.server.ts' },
    outdir: '../dist/server/self',
  },
  clients: [
    {
      scope: 'client',
      ssr: true,
      app: './app.js',
      points: './lib/points.ready.ts',
      routes,
      indexHtml: './index.html',
      port: 3001,
      env: ['SOURCE_BASE_URL'],
      publicdir: '../public',
    },
  ],
})

if (process.env.TASK === 'build') {
  await engine.build()
  process.exit(0)
}

if (process.env.TASK === 'generate') {
  await engine.generate()
  process.exit(0)
}

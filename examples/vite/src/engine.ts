import { Engine } from 'point0/engine-bun/index.js'
import { source } from './lib/server.js'

export const engine = Engine.create(import.meta.url, {
  clientsServerOutdir: '../dist/server',
  clientsSelfOutdir: '../dist',
  server: {
    scope: 'server',
    points: { root: source },
    port: 3000,
    entry: './index.server.ts',
    outdir: '../dist/server/self',
    publicdirOutdir: '../dist/public',
  },
  clients: [
    {
      scope: 'client',
      ssr: true,
      app: './app.js',
      points: './lib/points.ready.js',
      indexHtml: '../index.html',
      port: 3001,
      env: ['SOURCE_BASE_URL'],
      publicdir: '../public',
      outdir: '../dist/client',
      publicdirOutdir: '../dist/client',
      viteConfig: '../vite.config.js',
    },
  ],
})

if (process.env.TASK === 'build') {
  await engine.build()
  process.exit(0)
}

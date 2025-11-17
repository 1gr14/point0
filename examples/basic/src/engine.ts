import { Engine } from 'point0/engine-bun/index.js'

export const engine = await Engine.create(import.meta.url, {
  clientsServerOutdir: '../dist/server',
  clientsSelfOutdir: '../dist',
  server: {
    scope: 'server',
    points: './lib/points.server.js',
    port: 3000,
    entry: { main: './index.server.ts' },
    outdir: '../dist/server/self',
  },
  clients: [
    {
      scope: 'client',
      ssr: true,
      app: './app.js',
      points: './lib/points.ready.js',
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

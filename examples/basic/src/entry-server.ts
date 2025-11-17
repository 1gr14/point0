import { Engine } from 'point0/engine-bun/index.js'

const engine = await Engine.create(import.meta.url, {
  clientsServerOutdir: '../dist/clients-server',
  clientsSelfOutdir: '../dist/clients-self',
  server: {
    rootId: 'server',
    points: './lib/points.server.js',
    port: 3000,
    // entry: './entry-server.ts',
    entry: { main: './entry-server.ts' },
    outdir: '../dist/server',
  },
  clients: [
    {
      rootId: 'client',
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
} else {
  await engine.serve()
}

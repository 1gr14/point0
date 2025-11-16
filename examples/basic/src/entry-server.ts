import { EngineBun } from 'point0/engine-bun/index.js'
import { source } from './lib/server.js'

const engine = await EngineBun.create({
  itWasBuilt: !!process.env.ENGINE_WAS_BUILT,
  cwdAfterBuild: !process.env.ENGINE_WAS_BUILT ? '../dist/server' : import.meta.dir,
  cwdBeforeBuild: !process.env.ENGINE_WAS_BUILT ? import.meta.dir : '../../src',
  // below all paths should be relative to cwdBeforeBuild like it was not built yet
  server: {
    points: { root: source },
    port: 3000,
    entryFile: './entry-server.ts',
    distDir: '../dist/server',
    publicDistDir: '../dist/public',
    clientsDistDir: '../dist/server-clients',
  },
  clients: [
    {
      ssr: true,
      app: './app.js',
      points: './lib/points.ready.js',
      indexHtml: './index.html',
      port: 3001,
      env: ['SOURCE_BASE_URL'],
      publicDir: '../public',
      distDir: '../dist/client',
      publicDistDir: '../dist/client',
    },
  ],
})

if (process.env.TASK === 'build') {
  await engine.build()
  process.exit(0)
} else {
  await engine.serve()
}

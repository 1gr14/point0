import type { client } from '@/lib/client'
import { Engine } from '@point0/engine'
// import * as points from './lib/points.ready.js'
// import './lib/points.js'

// bun build --compile ./dist/server/index.server.js ./dist/client/**/* --outfile x
// bun build --compile ./x.ts --outfile x

export const engine = Engine.create<(typeof client)['Infer']['RequiredCtx']>(import.meta.url, {
  // clientsServerOutdir: '../dist/server',
  // clientsSelfOutdir: '../dist',
  pointsGlob: ['**/*.{ts,tsx}'],
  server: {
    scope: 'server',
    port: 3000,
    entry: { main: './index.server.ts' },
    outdir: '../dist/server',
  },
  clients: [
    {
      scope: 'client',
      // plugins of bun we can have where we want
      // TODO: allow provide app itself and points itself (so alway just app should be provided)
      app: async () => await import('./app'),
      points: async () => await import('./lib/points.ready'),
      // points: async () => points,
      generatePointsLazy: './lib/points.lazy.ts',
      generatePointsReady: './lib/points.ready.ts',
      // pointsModuleType: 'ready',
      // points: await import('./lib/points'),
      // routes: './lib/routes.generated.ts',
      routes: async () => await import('./lib/routes'),
      indexHtml: './index.html',
      port: 3001,
      env: ['SOURCE_BASE_URL'],
      outdir: '../dist/client',
      publicdir: [
        '../public',
        {
          '.well-known/appspecific/com.chrome.devtools.json': new Response('{}'),
          'robots.txt': new Response('User-agent: *\nDisallow: /'),
        },
      ],
      publicdirOutdir: '../dist/client',
    },
  ],
})
// require('./lib/points.ready.js')
// console.log(engine.clients[0].pointsProvided)
// const pointsPath = getDevPathInsideImportFn(engine.clients[0].pointsProvided, import.meta.file)
// console.log('pointsPath', pointsPath)
// await import(pointsPath)
// await engine.clients[0].initPointsManager()

// const y = async () => await import('./lib/points.ready.js')
// function getStringInsideFn(fn: Function): string | null {
//   const src = fn.toString()
//   const match = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/.exec(src)
//   return match?.[1] ?? null
// }
// const x = getStringInsideFn(y)
// console.log(x)
// await import(x)
// // await y()

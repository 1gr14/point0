import { Engine } from 'point0/engine-bun/index.js'
// import * as points from './lib/points.ready.js'
import { source } from './lib/server.js'
// import * as points from './lib/points.ready.js'

// @ts-expect-error - no types
const points = (await import('../dist/client/points.js')) as typeof import('./lib/points.ready.js')

// @ts-expect-error - no types
const App = (await import('../dist/client/app.js').then((m) => m.default)) as typeof import('./app.js').default

console.log({ App })

const engine = await Engine.create({
  cwd: import.meta.dir,
  server: {
    points: { root: source },
    port: 3000,
    // all paths will be relative to it. it is optional, you may pass all paths as absolute
    // before build it is right here, after build it is in dist/server or where you build it
    publicDir:
      process.env.NODE_ENV === 'production'
        ? '../public' // when self location is "dist/server/entry-server.js" it points to "dist/public"
        : '../public', // when self location is "src/entry-server.ts" it points to "public"
  },
  clients: [
    {
      ssr: true,
      App,
      points,
      // TODO: use without src or dist prefixes
      srcIndexHtml: './index.html', // only when NODE_ENV=development
      distIndexHtml: process.env.NODE_ENV === 'production' ? '../client/index.html' : undefined, // only when NODE_ENV=production
      distDir: process.env.NODE_ENV === 'production' ? '../client' : undefined, // only when NODE_ENV=production
      distRoute: process.env.NODE_ENV === 'production' ? '/dist/client' : undefined, // only when NODE_ENV=production
      port: 3001,
      // viteConfig: viteConfig as never,
      env: {
        SOURCE_BASE_URL: process.env.SOURCE_BASE_URL,
      },
    },
  ],
})

await engine.serve()

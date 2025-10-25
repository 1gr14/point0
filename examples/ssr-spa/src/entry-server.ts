import { BunAdapter } from 'point0/adapters/bun/index.js'
import { points } from './lib/points.js'
import { server } from './lib/server.js'
import { client } from './lib/client.js'
import App from './app.js'

const adapter = await BunAdapter.create({
  base: server,
  port: 3000,
  // all paths will be relative to it. it is optional, you may pass all paths as absolute
  // before build it is right here, after build it is in dist/server or where you build it
  dirname: import.meta.dir,
  publicDir:
    process.env.NODE_ENV === 'production'
      ? '../public' // when self location is "dist/server/entry-server.js" it points to "dist/public"
      : '../public', // when self location is "src/entry-server.ts" it points to "public"
  clients: [
    {
      ssr: true,
      base: client,
      points,
      // TODO: use without src or dist prefixes
      srcIndexHtml: './index.html', // only when NODE_ENV=development
      distIndexHtml: '../client/index.html', // only when NODE_ENV=production
      App,
      distDir: '../client', // only when NODE_ENV=production
      distRoute: '/dist/client', // only when NODE_ENV=production
      basepath: '/',
    },
  ],
})

adapter.serve()

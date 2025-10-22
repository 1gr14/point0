import serve from 'point0/adapters/bun/server.js'
import { points } from './lib/points.js'
import { server } from './lib/server.js'
import { client } from './lib/client.js'

void serve({
  base: server,
  port: 3000,
  dirname: import.meta.dir, // all paths will be relative to it. it is optional, you may pass all paths as absolute
  publicDir:
    process.env.NODE_ENV === 'production'
      ? '../public' // when self location is "dist/server/entry-server.js" it points to "dist/public"
      : '../public', // when self location is "src/entry-server.ts" it points to "public"
  clients: [
    {
      ssr: true,
      base: client,
      points,
      srcEntry: './index.html', // only when NODE_ENV=development
      distEntry: '../client/index.html', // only when NODE_ENV=production
      distDir: '../client', // only when NODE_ENV=production
      distRoute: '/dist/client', // only when NODE_ENV=production
      basepath: '/',
    },
  ],
})

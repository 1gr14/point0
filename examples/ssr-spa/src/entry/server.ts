import { createBunServer } from 'point0/adapters/bun/server.js'
import { points } from '../lib/points.js'
import { server } from '../lib/server.js'
import { client } from '../lib/client.js'

void createBunServer({
  base: server,
  port: 3000,
  dirname: import.meta.dir, // all paths will be relative to it. it is optional, you may pass all paths as absolute
  publicDir:
    process.env.NODE_NEV === 'production'
      ? '../public' // when self location is "dist/server.js" it points to "dist/public"
      : '../../public', // when self location is "src/entry/server.ts" it points to "public"
  clients: [
    {
      ssr: true,
      base: client,
      points,
      srcEntry: '../index.html', // only when NODE_NEV=development
      distEntry: '../client/index.html', // only when NODE_NEV=production
      distDir: '../client', // only when NODE_NEV=production
      distRoute: '/dist/client', // only when NODE_NEV=production
      basepath: '/',
    },
  ],
})

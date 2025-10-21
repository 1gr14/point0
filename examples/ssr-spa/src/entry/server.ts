import { createBunServer } from 'point0/adapters/bun/server.js'
import { points } from '../lib/points.js'
import { server } from '../lib/server.js'
import { client } from '../lib/client.js'

void createBunServer({
  base: server,
  port: 3000,
  dirname: __dirname, // all paths will be relative to it. it is optional, you may pass all paths as absolute
  publicDir:
    process.env.NODE_NEV === 'production'
      ? '../public' // in "dist/server" is points to "dist/public"
      : '../../public', // in "src/entry/server.ts" is points to "public"
  clients: [
    {
      ssr: true,
      base: client,
      points,
      distDir: '../client', // only when NODE_NEV=production
      distRoute: '/dist/client', // only when NODE_NEV=production
      srcEntry: '../index.html', // only when NODE_NEV=development
      basepath: '/',
    },
  ],
})

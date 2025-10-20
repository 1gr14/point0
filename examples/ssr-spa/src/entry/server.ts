import { createBunServer } from 'point0/adapters/bun/server.js'
import { points } from './points.js'
import { server } from '../lib/server.js'
import { client } from '../lib/client.js'

void createBunServer({
  server,
  client,
  points,
  port: 3000,
  dirname: __dirname, // all paths will be relative to it. it is optional, you may pass all paths as absolute
  publicDir: process.env.NODE_NEV === 'production' ? '../public' : '../../public',
  clients: [
    {
      ssr: true,
      distDir: '../client', // only when NODE_NEV=production
      distRoute: '/dist/client', // only when NODE_NEV=production
      srcEntry: '../index.html', // only when NODE_NEV=development
      basepath: '/',
    },
  ],
})

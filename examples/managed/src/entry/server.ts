import { getBunServer } from 'point0/adapters/bun/server-serve.js'
import { points } from './points.js'
import { server } from '../lib/server.js'
import { client } from '../lib/client.js'

void getBunServer({
  server,
  client,
  points,
  port: 3000,
  basepath: __dirname, // all paths will be relative to it. it is optional, you may pass all paths as absolute
  publicDir: process.env.NODE_NEV === 'production' ? '../public' : '../../public',
  clientServe: 'ssr',
  clientDistDir: '../client', // only when NODE_NEV=production
  clientDistRoute: '/dist/client', // only when NODE_NEV=production
  clientSrcEntry: '../index.html', // only when NODE_NEV=development
})

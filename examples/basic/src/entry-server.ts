// import { EngineBun } from 'point0/engine-bun/index.js'
// import { source } from './lib/server.js'

// const engine = await EngineBun.create({
//   // all paths will be relative to it. it is optional, you may pass all paths as absolute
//   // before build it is right here, after build it is in dist/server or where you build it
//   cwd: import.meta.dir,
//   server: {
//     points: { root: source },
//     port: 3000,
//     publicDir:
//       process.env.NODE_ENV === 'production'
//         ? '../public' // when self location is "dist/server/entry-server.js" it points to "dist/public"
//         : '../public', // when self location is "src/entry-server.ts" it points to "public"
//   },
//   clients: [
//     {
//       ssr: true,
//       app: './app.js',
//       points: './lib/points.ready.js',
//       indexHtml: process.env.NODE_ENV === 'production' ? '../client/index.html' : './index.html', // only when NODE_ENV=production
//       publicDir: process.env.NODE_ENV === 'production' ? { '/': '../client' } : {}, // only when NODE_ENV=production
//       port: 3001,
//       env: {
//         SOURCE_BASE_URL: process.env.SOURCE_BASE_URL,
//       },
//     },
//   ],
// })

// if (process.env.TASK === 'build') {
//   await engine.build()
// } else {
//   await engine.serve()
// }

import { EngineBun } from 'point0/engine-bun/index.js'
import { source } from './lib/server.js'

const engine = await EngineBun.create({
  // all paths will be relative to it. it is required to be "import.meta.dir" if you use "server.distDir"
  // before build it is right here, after build it is in dist/server or where you build it
  cwd: import.meta.dir,
  server: {
    points: { root: source },
    port: 3000,
    publicDir: '../public',
    // it is required to be defined like this if defined, becouse we will recalculate "cwd" based on it
    distDir: !process.env.IT_WAS_BUILT ? '../dist/server' : import.meta.dir,
  },
  clients: [
    {
      ssr: true,
      app: './app.js',
      points: './lib/points.ready.js',
      indexHtml: './index.html',
      port: 3001,
      env: ['SOURCE_BASE_URL'],
      distDir: '../dist/client',
    },
  ],
})

if (process.env.TASK === 'build') {
  await engine.build()
  process.exit(0)
} else {
  await engine.serve()
}

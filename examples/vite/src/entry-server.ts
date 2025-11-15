import { EngineBun } from 'point0/engine-bun/index.js'
import { source } from './lib/server.js'

const engine = await EngineBun.create({
  cwd: import.meta.dir,
  // all paths will be relative to it. it is optional, you may pass all paths as absolute
  // before build it is right here, after build it is in dist/server or where you build it
  server: {
    points: { root: source },
    port: 3000,
    // publicDir:
    //   process.env.NODE_ENV === 'production'
    //     ? '../public' // when self location is "dist/server/entry-server.js" it points to "dist/public"
    //     : '../public', // when self location is "src/entry-server.ts" it points to "public"
  },
  clients: [
    {
      ssr: true,
      // ssr: false,
      app: '/src/app.tsx',
      points: process.env.NODE_ENV === 'production' ? '../client/points.js' : './lib/points.ready.js',
      // app: '../client/app.js',
      // points: '../client/points.js',
      indexHtml: process.env.NODE_ENV === 'production' ? '../client/index.html' : '../index.html', // only when NODE_ENV=production
      publicDir: process.env.NODE_ENV === 'production' ? { '/': '../client' } : {}, // only when NODE_ENV=production
      port: 3001,
      // hmrPort: process.env.TARGET_ROOT_ID === 'client' ? 3101 : null,
      viteConfig: process.env.NODE_ENV === 'production' ? null : '../vite.config.js',
      // env: {
      //   SOURCE_BASE_URL: process.env.SOURCE_BASE_URL,
      // },
      env: ['SOURCE_BASE_URL'],
    },
  ],
})

await engine.serve()

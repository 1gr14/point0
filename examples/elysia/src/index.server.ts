import { hmr } from '@point0/elysia'
import { Elysia } from 'elysia'
import { engine } from './engine.js'

await engine.init()

new Elysia()
  .get('/check', () => 'Hello Elysia')
  .state('x', 3)
  .state('y', 4)
  .state('z', '4')
  .use(hmr(engine)) // hmr for clients that serves via native bun servers, if you use vite this plugin does not needed
  // just mount if requiredCtx has nothing except request
  // .mount('*', engine.fetch.bind(engine))
  // if you have requiredCtx, do simething like:
  .all('*', async ({ request, store }) => {
    return await engine.fetch(request, { requiredCtx: store })
  })
  .listen(engine.server.port) // you can pick any port, so does not needed to use .server.port, but it is more readable

console.info(`🚀 http://localhost:${engine.server.port}`)

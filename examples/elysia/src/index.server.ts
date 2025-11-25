import { hmr } from '@point0/elysia'
import { Elysia } from 'elysia'
import { engine } from './engine.js'

await engine.init()

const app = new Elysia()
  .get('/check', () => 'Hello Elysia')
  .state('x', 1)
  .use(hmr(engine)) // hmr for clients that serves via native bun servers, if you use vite this plugin does not needed

  // just mount if requiredCtx has nothing except request
  // .mount('*', engine.fetch.bind(engine))

  .all('*', async ({ request, store }) => {
    return await engine.fetch(request, store) // second arg is just requiredCtx which will be passed to points
  })
  .listen(3000)

console.info(`🚀 http://localhost:${app.server?.port}`)

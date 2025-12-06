import { engine } from './engine.js'

await engine.serve({
  requiredCtx: undefined,
})

console.info(`🚀 http://localhost:${engine.server.port}`)

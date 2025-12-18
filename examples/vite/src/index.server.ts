import { engine } from './engine.js'

await engine.init()
await engine.serve({
  requiredCtx: undefined,
})

console.info(`🚀 http://localhost:${engine.server.port}`)

export const dispose = engine.dispose.bind(engine)

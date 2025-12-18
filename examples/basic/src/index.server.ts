import { engine } from './engine.js'

await engine.init()
await engine.serve()

console.info(`🚀 http://localhost:${engine.server.port}`)

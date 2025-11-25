import { engine } from './engine.js'

await engine.serve()

console.info(`🚀 http://localhost:${engine.server.port}`)

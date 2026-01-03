import { engine } from './engine.js'

await engine.init()
await engine.serve({ requiredCtx: { zxc: 123 } })

console.info(`🚀 http://localhost:${engine.server.port}`)

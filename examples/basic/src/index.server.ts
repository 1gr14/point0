import { engine } from './engine.js'

await engine.prepare()
await engine.serve({ requiredCtx: { zxc: 123 } })

console.info(`🚀 http://localhost:${engine.server.port}`)

import { engine } from './engine.js'

await engine.init()
await engine.serve()

console.info(`server started on ${engine.server.port}`)
console.info(`client started on ${engine.clients[0].port}`)

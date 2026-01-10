import { engine } from './engine.js'

await engine.init()
await engine.serve()

console.info(`server started http://localhost:${engine.server.port}`)
console.info(`client started http://localhost:${engine.clients[0].port}`)

export const dispose = () => engine.dispose()

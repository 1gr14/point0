import { engine } from './engine.js'

await engine.prepare()
await engine.serve()

console.info(`server started http://localhost:${engine.server.port}`)
console.info(`client1 started http://localhost:${engine.clients[0].port}`)
console.info(`client2 started http://localhost:${engine.clients[1].port}`)

export const dispose = () => engine.dispose()

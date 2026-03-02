import { engine } from './engine.js'

await engine.prepare()
await engine.serve()

export const dispose = () => engine.dispose()

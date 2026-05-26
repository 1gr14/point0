import { engine } from './engine.js'

await engine.serve()

export const dispose = () => engine.dispose()

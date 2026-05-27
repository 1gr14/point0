import { engine } from './engine'

await import('./lib/env').then((m) => m.validateServerEnv())

await engine.serve()

export const dispose = () => engine.dispose()

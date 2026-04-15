import { engine } from './engine'

await engine.prepare()
await import('./lib/env').then((m) => m.validateServerEnv())
await import('./app.server')

import { engine } from './engine'
import { validateServerEnv } from './lib/env'

validateServerEnv()
await engine.prepare()
await import('./app.server')

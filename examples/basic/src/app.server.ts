import { engine } from '@/engine.js'

await import('./lib/env').then((m) => m.validateServerEnv())

await engine.serve()

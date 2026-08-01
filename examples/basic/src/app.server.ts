import { serverEnv } from '@/lib/env/server'
import { engine } from '@/engine.js'

// The env handle is lazy, so nothing is checked until it's read. Validate the whole server shape up front instead —
// a misconfigured server then fails at startup, not on the first request that happens to touch a missing variable.
serverEnv.validate()

await engine.serve()

// you can place any other server code here (workers, initializers, etc.), it is not only api entry point

import { serverEnv } from '@/lib/env/server'
import { engine } from '@/engine'

// The env handle is lazy, so nothing is checked until it's read. Validate the whole server shape up front instead —
// a misconfigured server then fails at startup, not on the first request that happens to touch a missing variable.
serverEnv.validate()

await engine.serve()

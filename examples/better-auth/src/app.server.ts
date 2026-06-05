// Validate server env before anything else so a misconfigured server fails fast.
import '@/lib/env/server'

import { engine } from '@/engine.js'

await engine.serve()

// you can place any other server code here (workers, initializers, etc.), it is not only api entry point

// Validate server env before anything else so a misconfigured server fails fast.
import '@/lib/env/server'

import { engine } from '@/engine'

await engine.serve()

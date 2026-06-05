// Validate server env before anything else so a misconfigured server fails fast.
import '@/lib/env/server'

import { engine } from '@/engine'

await engine.serve()

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.dispose(() => engine.dispose())
  import.meta.hot.accept()
}

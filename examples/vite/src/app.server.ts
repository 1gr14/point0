import { engine } from './engine'

await import('./lib/env').then((m) => m.validateServerEnv())

await engine.serve()

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.dispose(() => engine.dispose())
  import.meta.hot.accept()
}

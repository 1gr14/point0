import { engine } from './engine.js'

await engine.serve()

if (import.meta.hot) {
  import.meta.hot.dispose(() => engine.dispose())
  import.meta.hot.accept()
}

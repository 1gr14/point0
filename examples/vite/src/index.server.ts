import { engine } from './engine.js'

await engine.prepare()
await engine.serve({
  requiredCtx: undefined,
})

export const dispose = engine.dispose.bind(engine)

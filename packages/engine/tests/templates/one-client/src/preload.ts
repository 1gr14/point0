import { engine } from './engine.js'

await engine.preload({ nodeEnvFallback: 'development', preventLoadBunPlugins: !!engine.server.viteConfig })

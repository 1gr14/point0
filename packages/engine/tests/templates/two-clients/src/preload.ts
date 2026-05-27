import { engine } from './engine.js'

if (engine.isFileInEngineDir()) {
  await engine.preload({ nodeEnvFallback: 'development', preventLoadBunPlugins: !!engine.server.viteConfig })
}

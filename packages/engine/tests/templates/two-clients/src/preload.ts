import { engine } from './engine.js'

if (engine.isFileInEngineDir() || engine.isCliFile()) {
  await engine.preload({ nodeEnvFallback: 'development', preventLoadBunPlugins: !!engine.server.viteConfig })
}

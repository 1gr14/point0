import { engine } from '@/engine'

if (engine.isFileInEngineDir()) {
  await engine.preload({ nodeEnvFallback: 'development', preventLoadBunPlugins: true })
}

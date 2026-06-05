import { engine } from '@/engine'

if (engine.isFileInEngineDir() || engine.isCliFile()) {
  await engine.preload({ nodeEnvFallback: 'development' })
}

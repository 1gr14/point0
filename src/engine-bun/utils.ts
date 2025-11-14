import type { Jiti } from 'jiti'
import { createJiti } from 'jiti'
import type { ViteDevServer } from 'vite'
import type { LazyPointsModule, ReadyPointsModule } from '../core/points.js'
import { Points } from '../core/points.js'
import type { EngineOptionsViteConfig } from '../engine-shared/config.js'

export const createJitiInstance = (name: string) =>
  createJiti(name, {
    cache: false,
    interopDefault: true,
    moduleCache: false,
    fsCache: false,
    extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs'],
  })

export const createViteDevServer = async ({
  viteConfig,
}: {
  viteConfig: EngineOptionsViteConfig
}): Promise<ViteDevServer> => {
  const createServer = await import('vite').then((module) => module.createServer)
  const loadedViteConfig =
    typeof viteConfig === 'function'
      ? await viteConfig({ command: 'serve', mode: process.env.NODE_ENV || 'development' })
      : await viteConfig
  return await createServer({
    ...loadedViteConfig,
    appType: 'custom',
    server: { ...loadedViteConfig.server, middlewareMode: true },
  })
}

export const createFreshPoints = async ({
  providedPoints,
  pointsPath,
  viteDevServer,
  jiti,
  clientIndex,
}: {
  providedPoints: Points | null
  pointsPath: string | null
  viteDevServer: ViteDevServer | null
  jiti: Jiti
  clientIndex: number | null
}): Promise<Points> => {
  if (providedPoints) {
    return providedPoints
  }
  if (pointsPath) {
    if (viteDevServer) {
      return await Points.read(
        pointsPath,
        async (absPath) => (await viteDevServer.ssrLoadModule(absPath)) as LazyPointsModule | ReadyPointsModule,
      )
    } else {
      return await Points.read(pointsPath, async (absPath) => await jiti.import(absPath))
    }
  }
  if (clientIndex !== null) {
    throw new Error(`Points not provided for client at position "${clientIndex}"`)
  }
  throw new Error('Points not provided for server')
}

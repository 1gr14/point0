import { fileURLToPath } from 'node:url'
import { Engine } from '../engine-shared/index.js'
import type { EngineOptions } from '../engine-shared/config.js'
import { bunAdapter } from './adapter.js'
import type {
  BunEngineServerOptions,
  BunEngineClientOptions,
  BunBuildConfigDefinition,
  BunPluginsDefinition,
} from './adapter.js'

export type BunEngineOptions = Omit<EngineOptions, 'server' | 'clients'> & {
  server: BunEngineServerOptions
  clients: BunEngineClientOptions[]
}

export function createEngine(fileUrl: string, options: BunEngineOptions): Engine<false>
export function createEngine(options: BunEngineOptions): Engine<false>
export function createEngine(...args: [string, BunEngineOptions] | [BunEngineOptions]): Engine<false> {
  const options = args.length === 2 ? args[1] : args[0]
  const fileUrl = args.length === 2 ? args[0] : undefined

  // Extract Bun-specific configs from extended options
  const extendedOptions = {
    server: {
      bunBuildConfig: options.server.bunBuildConfig,
      bunPlugins: options.server.bunPlugins,
    },
    clients: options.clients.map((client) => ({
      bunBuildConfig: client.bunBuildConfig,
      bunPlugins: client.bunPlugins,
    })),
  }

  // Create base options without Bun-specific configs
  const baseOptions: EngineOptions = {
    ...options,
    server: {
      scope: options.server.scope,
      points: options.server.points,
      publicdir: options.server.publicdir,
      port: options.server.port,
      hmrPort: options.server.hmrPort,
      outdir: options.server.outdir,
      entry: options.server.entry,
      publicdirOutdir: options.server.publicdirOutdir,
      routes: options.server.routes,
      pointsModuleType: options.server.pointsModuleType,
      banner: options.server.banner,
    },
    clients: options.clients.map((client) => ({
      scope: client.scope,
      points: client.points,
      ssr: client.ssr,
      app: client.app,
      hostname: client.hostname,
      basepath: client.basepath,
      publicdir: client.publicdir,
      indexHtml: client.indexHtml,
      domRootElementId: client.domRootElementId,
      env: client.env,
      port: client.port,
      hmrPort: client.hmrPort,
      viteConfig: client.viteConfig,
      outdir: client.outdir,
      serverOutdir: client.serverOutdir,
      publicdirOutdir: client.publicdirOutdir,
      routes: client.routes,
      pointsModuleType: client.pointsModuleType,
      banner: client.banner,
    })),
  }

  if (fileUrl) {
    return Engine.create(fileURLToPath(fileUrl), baseOptions, bunAdapter, extendedOptions)
  }
  return Engine.create(baseOptions, bunAdapter, extendedOptions)
}

// Re-export Engine class and types for convenience
export { Engine } from '../engine-shared/index.js'
export type { EngineOptions as BaseEngineOptions } from '../engine-shared/config.js'

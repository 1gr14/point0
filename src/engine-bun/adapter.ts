import type { BuildConfig, BunPlugin } from 'bun'
import { plugin } from 'bun'
import type { RuntimeAdapter, FileHandle, GlobHandle } from '../engine-shared/adapters.js'
import type { EngineClientOptions, EngineServerOptions } from '../engine-shared/config.js'

// Bun build config types
export type BunBuildConfigDefinitionFnOptions = {
  mode: string
  target: 'server' | 'client'
  command: 'serve' | 'build'
}
export type BunBuildConfigDefinitionFn = (options: BunBuildConfigDefinitionFnOptions) => Partial<BuildConfig>
export type BunBuildConfigDefinition = BunBuildConfigDefinitionFn | Partial<BuildConfig>

export type BunPluginsDefinitionFnOptions = {
  mode: string
  command: 'serve' | 'build'
  target: 'server' | 'client'
}
export type BunPluginsDefinitionFn = (options: BunPluginsDefinitionFnOptions) => Array<BunPlugin | string>
export type BunPluginsDefinition = BunPluginsDefinitionFn | Array<BunPlugin | string>

// Extended config types for Bun engine
export type BunEngineServerOptions = EngineServerOptions & {
  bunBuildConfig?: BunBuildConfigDefinition
  bunPlugins?: BunPluginsDefinition
}

export type BunEngineClientOptions = EngineClientOptions & {
  bunBuildConfig?: BunBuildConfigDefinition
  bunPlugins?: BunPluginsDefinition
}

// Bun-specific build config extraction utilities
export const extractBunBuildConfig = async ({
  mode,
  command,
  target,
  bunBuildConfig,
  bunPlugins,
}: {
  mode: string
  command: 'serve' | 'build'
  target: 'server' | 'client'
  bunBuildConfig: BunBuildConfigDefinition
  bunPlugins: BunPluginsDefinition
}): Promise<Partial<BuildConfig>> => {
  const extractedBunConfig =
    typeof bunBuildConfig === 'function' ? bunBuildConfig({ mode, command, target }) : bunBuildConfig
  const extractedBunPlugins = await extractBunPlugins({ mode, command, target, bunPlugins })
  return {
    ...extractedBunConfig,
    plugins: [...extractedBunPlugins, ...(extractedBunConfig.plugins ?? [])],
  }
}

export const extractBunPlugins = async ({
  mode,
  command,
  target,
  bunPlugins,
}: {
  mode: string
  command: 'serve' | 'build'
  target: 'server' | 'client'
  bunPlugins: BunPluginsDefinition
}): Promise<BunPlugin[]> => {
  const bunPluginsArray = typeof bunPlugins === 'function' ? bunPlugins({ mode, command, target }) : bunPlugins
  return await Promise.all(
    bunPluginsArray.map(async (p) => {
      if (typeof p === 'string') {
        return await import(p).then((module) => module.default || module)
      }
      return p
    }),
  )
}

export const loadBunPlugins = async ({
  mode,
  command,
  target,
  bunPlugins,
}: {
  mode: string
  command: 'serve' | 'build'
  target: 'server' | 'client'
  bunPlugins: string[]
}): Promise<void> => {
  const extractedBunPlugins = await extractBunPlugins({ mode, command, target, bunPlugins })
  await Promise.all(
    extractedBunPlugins.map(async (p) => {
      await plugin(p)
    }),
  )
}

// Bun runtime adapter implementation
export const bunAdapter: RuntimeAdapter = {
  file: Object.assign(
    (path: string): FileHandle => {
      const bunFile = Bun.file(path)
      return {
        exists: async () => await bunFile.exists(),
        text: async () => await bunFile.text(),
        arrayBuffer: async () => await bunFile.arrayBuffer(),
        stream: () => bunFile.stream(),
      }
    },
    {
      exists: async (path: string) => {
        return await Bun.file(path).exists()
      },
      text: async (path: string) => {
        return await Bun.file(path).text()
      },
    },
  ),
  glob: (pattern: string): GlobHandle => {
    return new Bun.Glob(pattern)
  },
  write: async (path: string, content: string | Uint8Array) => {
    await Bun.write(path, content)
  },
}

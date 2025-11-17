import type { BuildConfig, BunPlugin } from 'bun'
import { plugin } from 'bun'

export type BunBuildConfigDefinitionFnOptions = {
  target: 'server' | 'client'
  command: 'serve' | 'build'
}
export type BunBuildConfigDefinitionFn = (options: BunBuildConfigDefinitionFnOptions) => Partial<BuildConfig>
export type BunBuildConfigDefinition = BunBuildConfigDefinitionFn | Partial<BuildConfig>
export const extractBunBuildConfig = async ({
  command,
  target,
  bunBuildConfig,
  bunPlugins,
}: {
  command: 'serve' | 'build'
  target: 'server' | 'client'
  bunBuildConfig: BunBuildConfigDefinition
  bunPlugins: BunPluginsDefinition
}): Promise<Partial<BuildConfig>> => {
  const extractedBunConfig = typeof bunBuildConfig === 'function' ? bunBuildConfig({ command, target }) : bunBuildConfig
  const extractedBunPlugins = await extractBunPlugins({ command, target, bunPlugins })
  return {
    ...extractedBunConfig,
    plugins: [...extractedBunPlugins, ...(extractedBunConfig.plugins ?? [])],
  }
}

export type BunPluginsDefinitionFnOptions = {
  command: 'serve' | 'build'
  target: 'server' | 'client'
}
export type BunPluginsDefinitionFn = (options: BunPluginsDefinitionFnOptions) => Array<BunPlugin | string>
export type BunPluginsDefinition = BunPluginsDefinitionFn | Array<BunPlugin | string>
export const extractBunPlugins = async ({
  command,
  target,
  bunPlugins,
}: {
  command: 'serve' | 'build'
  target: 'server' | 'client'
  bunPlugins: BunPluginsDefinition
}): Promise<BunPlugin[]> => {
  const bunPluginsArray = typeof bunPlugins === 'function' ? bunPlugins({ command, target }) : bunPlugins
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
  command,
  target,
  bunPlugins,
}: {
  command: 'serve' | 'build'
  target: 'server' | 'client'
  bunPlugins: string[]
}): Promise<void> => {
  const extractedBunPlugins = await extractBunPlugins({ command, target, bunPlugins })
  await Promise.all(
    extractedBunPlugins.map(async (p) => {
      await plugin(p)
    }),
  )
}

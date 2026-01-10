import type { BuildConfig, BunPlugin } from 'bun'
import { plugin } from 'bun'
import * as nodeFsSync from 'node:fs'
import * as nodePath from 'node:path'
import type { EngineOptionsEnvParsed, EngineOptionsViteConfig, ExtractedViteConfig } from './config.js'
import type { PointsScope } from '@point0/core'
import type { ViteDevServer } from 'vite'

export const toPathsOrUndefined = (path: string | string[] | undefined): string[] | undefined => {
  if (!path) {
    return undefined
  }
  return Array.isArray(path) ? path : [path]
}

export const toAbsPath = <T extends string | undefined | null>(cwd: string | undefined, path: T): T => {
  if (!path) {
    return undefined as T
  }
  if (!cwd) {
    if (!nodePath.isAbsolute(path)) {
      throw new Error(`Path "${path}" is not absolute, but should be`)
    }
    return path
  }
  if (!nodePath.isAbsolute(cwd)) {
    throw new Error(`Cwd "${cwd}" is not absolute, but should be`)
  }
  return nodePath.resolve(cwd, path) as T
}

export const toRelPath = <T extends string | undefined | null>(cwd: string | undefined, path: T): T => {
  if (!path) {
    return undefined as T
  }
  if (!cwd) {
    return path as T
  }
  if (!nodePath.isAbsolute(cwd)) {
    throw new Error(`Cwd "${cwd}" is not absolute, but should be`)
  }
  return nodePath.relative(cwd, path) as T
}

export const toAbsPaths = (cwd: string | undefined, path: Array<string | undefined> | string | undefined): string[] => {
  if (!path) {
    return []
  }
  const paths = Array.isArray(path) ? path : [path]
  return paths.flatMap((path) => toAbsPath(cwd, path) ?? [])
}

export const findFirstExistsFilePath = (path: string[] | string | undefined): string | undefined => {
  if (!path) {
    return undefined
  }
  const paths = Array.isArray(path) ? path : [path]
  for (const path of paths) {
    if (nodeFsSync.existsSync(path)) {
      return path
    }
  }
  return undefined
}

export const pickNonUniqArrayElements = (array: Array<string | undefined>) => {
  const uniqElements: { [element: string]: number } = {}
  const nonUniqElements: { [element: string]: number } = {}
  for (const [index, element] of array.entries()) {
    if (uniqElements[element || 'undefined']) {
      nonUniqElements[element || 'undefined'] = index
    } else {
      uniqElements[element || 'undefined'] = index
    }
  }
  return nonUniqElements
}

export const throwOnNonUniqueArrayElements = (array: Array<string | undefined>, message: string) => {
  const nonUniqElements = pickNonUniqArrayElements(array)
  if (Object.keys(nonUniqElements).length > 0) {
    throw new Error(
      `${message}: ${Object.entries(nonUniqElements)
        .map(([element, index]) => `${element} at index ${index}`)
        .join(', ')}`,
    )
  }
}

export const getDirByPaths = ({
  paths,
  pathsHasGlob = null,
  pathsHasFiles = null,
  pathsHasDirs = null,
}: {
  paths: string[]
  pathsHasGlob?: boolean | null
  pathsHasFiles?: boolean | null
  pathsHasDirs?: boolean | null
}): string => {
  if (paths.length === 0) {
    throw new Error('paths is empty')
  }

  function stripGlobParts(p: string): string {
    if (pathsHasGlob === false) {
      return p
    }
    const parts = p.split(nodePath.sep)
    const globIndex = parts.findIndex((part) => /[*?[\]]/.test(part)) // detect glob chars
    if (globIndex >= 0) {
      return parts.slice(0, globIndex).join(nodePath.sep) || nodePath.sep
    }
    return p
  }

  const exts = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
  function isFile(path: string): boolean {
    if (pathsHasFiles === false) {
      return false
    }
    if (pathsHasDirs === false && pathsHasFiles === true) {
      return true
    }
    return exts.some((ext) => path.endsWith(ext))
  }

  // Strip glob parts first
  const stripped = paths.map(stripGlobParts)

  // Map each path to its directory (if path is a file) or keep as-is (if directory)
  const dirs = stripped.map((p) => (isFile(p) ? nodePath.dirname(p) : p))

  // Reduce to deepest common ancestor directory
  let commonDir = dirs[0]
  for (let i = 1; i < dirs.length; i++) {
    let dir = dirs[i]

    while (
      commonDir !== dir &&
      !dir.startsWith(commonDir.endsWith(nodePath.sep) ? commonDir : commonDir + nodePath.sep)
    ) {
      const next = nodePath.dirname(commonDir)
      if (next === commonDir) break
      commonDir = next
    }
    while (commonDir !== dir && !commonDir.startsWith(dir.endsWith(nodePath.sep) ? dir : dir + nodePath.sep)) {
      const next = nodePath.dirname(dir)
      if (next === dir) break
      dir = next
    }
    commonDir = commonDir.length <= dir.length ? commonDir : dir
  }
  return commonDir
}

export const withError = async <T>(fn: () => Promise<T>, subMessage?: string): Promise<T> => {
  try {
    return await fn()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error([subMessage, errorMessage].filter(Boolean).join(': '), { cause: error })
  }
}

export const validateEntrypoints = (entrypoints: Array<string | null | undefined>): string[] => {
  const uniqEntrypoints = [...new Set(entrypoints.flatMap((p) => p || []))]
  const entrypointsBasenamesWithJsExtension = uniqEntrypoints.map((p) => ({
    basename: toJsExtension(nodePath.basename(p)),
    path: p,
  }))
  const notUniqueEntrypointsBasenames = entrypointsBasenamesWithJsExtension.filter(
    (p) => entrypointsBasenamesWithJsExtension.filter((p2) => p2.basename === p.basename).length > 1,
  )
  if (notUniqueEntrypointsBasenames.length > 0) {
    throw new Error(
      `All entrypoints should have unique basenames. This paths not suitable: ${notUniqueEntrypointsBasenames.map((p) => p.path).join(', ')}`,
    )
  }
  return uniqEntrypoints
}

export const toJsExtension = (path: string) => {
  return path.replace(/\.tsx?$/, '.js')
}

export const removeLikeJsExtension = (path: string) => {
  return path.replace(/\.(?:[cm]?jsx?|tsx?)$/i, '')
}

// build config

// TODO:ASAP make any config suitable
export type ServerBunBuildConfigDefinitionFnOptions = {
  environment: string
  target: 'server'
}
export type ServerBunBuildConfigDefinitionFn = (
  options: ServerBunBuildConfigDefinitionFnOptions,
) => Partial<BuildConfig>
export type ServerBunBuildConfigDefinition = ServerBunBuildConfigDefinitionFn | Partial<BuildConfig>

export type ClientBunBuildConfigDefinitionFnOptions = {
  environment: string
  target: 'client'
}
export type ClientBunBuildConfigDefinitionFn = (
  options: ClientBunBuildConfigDefinitionFnOptions,
) => Partial<BuildConfig>
export type ClientBunBuildConfigDefinition = ClientBunBuildConfigDefinitionFn | Partial<BuildConfig>

export type BunBuildConfigDefinitionFnOptions = {
  environment: string
  target: 'client' | 'server'
}
export type BunBuildConfigDefinitionFn = (options: BunBuildConfigDefinitionFnOptions) => Partial<BuildConfig>
export type BunBuildConfigDefinition = BunBuildConfigDefinitionFn | Partial<BuildConfig>

export const executeServerBunBuildConfig = async ({
  environment,
  bunBuildConfig,
  bunPlugins,
}: {
  environment: string
  bunBuildConfig: ServerBunBuildConfigDefinition
  bunPlugins: ServerBunPluginsDefinition
}): Promise<Partial<BuildConfig>> => {
  return await extractBunBuildConfig({
    environment,
    bunBuildConfig: bunBuildConfig as BunBuildConfigDefinition,
    bunPlugins: bunPlugins as BunPluginsDefinition,
    target: 'server',
  })
}

export const extractClientBunBuildConfig = async ({
  environment,
  bunBuildConfig,
  bunPlugins,
}: {
  environment: string
  bunBuildConfig: ClientBunBuildConfigDefinition
  bunPlugins: ClientBunPluginsDefinition
}): Promise<Partial<BuildConfig>> => {
  return await extractBunBuildConfig({
    environment,
    bunBuildConfig: bunBuildConfig as BunBuildConfigDefinition,
    bunPlugins: bunPlugins as BunPluginsDefinition,
    target: 'client',
  })
}

export const extractBunBuildConfig = async ({
  environment,
  target,
  bunBuildConfig,
  bunPlugins,
}: {
  environment: string
  target: 'client' | 'server'
  bunBuildConfig: BunBuildConfigDefinition
  bunPlugins: BunPluginsDefinition
}): Promise<Partial<BuildConfig>> => {
  const executedBunConfig =
    typeof bunBuildConfig === 'function' ? bunBuildConfig({ environment, target }) : bunBuildConfig
  const extractedBunPlugins = await extractBunPlugins({ environment, command: 'build', bunPlugins, target })
  return {
    ...executedBunConfig,
    plugins: [...extractedBunPlugins, ...(executedBunConfig.plugins ?? [])],
  }
}

// plugins

export type ServerBunPluginsDefinitionFnOptions = {
  environment: string
  command: 'serve' | 'build'
  target: 'server'
}
export type ServerBunPluginsDefinitionFn = (
  options: ServerBunPluginsDefinitionFnOptions,
) => Array<BunPlugin | string> | Promise<Array<BunPlugin | string>>
export type ServerBunPluginsDefinition = ServerBunPluginsDefinitionFn | Array<BunPlugin | string>

export type ClientBunPluginsDefinitionFnOptions = {
  environment: string
  command: 'serve' | 'build'
  target: 'client'
}
export type ClientBunPluginsDefinitionFn = (
  options: ClientBunPluginsDefinitionFnOptions,
) => Array<BunPlugin | string> | Promise<Array<BunPlugin | string>>
export type ClientBunPluginsDefinition = ClientBunPluginsDefinitionFn | Array<BunPlugin | string>

export type BunPluginsDefinitionFnOptions = {
  environment: string
  command: 'serve' | 'build'
  target: 'client' | 'server'
}
export type BunPluginsDefinitionFn = (
  options: BunPluginsDefinitionFnOptions,
) => Array<BunPlugin | string> | Promise<Array<BunPlugin | string>>
export type BunPluginsDefinition = BunPluginsDefinitionFn | Array<BunPlugin | string>

export const extractServerBunPlugins = async ({
  environment,
  command,
  bunPlugins,
}: {
  environment: string
  command: 'serve' | 'build'
  bunPlugins: ServerBunPluginsDefinition
}): Promise<BunPlugin[]> => {
  return await extractBunPlugins({
    environment,
    command,
    bunPlugins: bunPlugins as BunPluginsDefinition,
    target: 'server',
  })
}

export const extractClientBunPlugins = async ({
  environment,
  command,
  bunPlugins,
}: {
  environment: string
  command: 'serve' | 'build'
  bunPlugins: ClientBunPluginsDefinition
}): Promise<BunPlugin[]> => {
  return await extractBunPlugins({
    environment,
    command,
    bunPlugins: bunPlugins as BunPluginsDefinition,
    target: 'client',
  })
}

export const extractBunPlugins = async ({
  environment,
  command,
  bunPlugins,
  target,
}: {
  environment: string
  command: 'serve' | 'build'
  bunPlugins: BunPluginsDefinition
  target: 'client' | 'server'
}): Promise<BunPlugin[]> => {
  const bunPluginsArray =
    typeof bunPlugins === 'function' ? await bunPlugins({ environment, command, target }) : bunPlugins
  return await Promise.all(
    bunPluginsArray.map(async (p) => {
      if (typeof p === 'string') {
        return await import(/* @vite-ignore */ p).then((module) => module.default || module)
      }
      return p
    }),
  )
}

export const extractClientBunDevPluginsStrings = async ({
  cwd,
  environment,
  command,
  bunPlugins,
  errorOnNotString,
}: {
  cwd: string
  environment: string
  command: 'serve' | 'build'
  bunPlugins: ClientBunPluginsDefinition
  errorOnNotString: string
}): Promise<string[]> => {
  const bunPluginsArray =
    typeof bunPlugins === 'function' ? await bunPlugins({ environment, command, target: 'client' }) : bunPlugins
  return await Promise.all(
    bunPluginsArray.map(async (p, index) => {
      if (typeof p === 'string') {
        if (!p.startsWith('.')) {
          return p
        }
        return nodePath.resolve(cwd, p)
      }
      throw new Error(`${errorOnNotString}: plugin at index ${index} is not a string`)
    }),
  )
}

export const loadBunPlugins = async ({ extractedBunPlugins }: { extractedBunPlugins: BunPlugin[] }): Promise<void> => {
  await Promise.all(
    extractedBunPlugins.map(async (p) => {
      await plugin(p)
    }),
  )
}

export const resolveTempDirPath = (subdir: string[] = []): string => {
  let dir = process.cwd()
  let lastDir = ''

  // Walk up until we find a node_modules folder
  while (dir !== lastDir) {
    const candidate = nodePath.join(dir, 'node_modules')
    if (nodeFsSync.existsSync(candidate)) {
      const tempDir = nodePath.join(candidate, '.cache', '@point0', ...subdir)
      nodeFsSync.mkdirSync(tempDir, { recursive: true })
      return tempDir
    }

    // Move one level up
    lastDir = dir
    dir = nodePath.dirname(dir)
  }

  // Fallback: if no node_modules found, use system tmp
  // const fallback = nodePath.join(nodeFsSync.realpathSync(nodeOs.tmpdir()), '@point0', ...subdir)
  // nodeFsSync.mkdirSync(fallback, { recursive: true })
  // return fallback
  throw new Error('No node_modules found. Please run "bun install" in the project root.')
}

// vite

export const extractViteConfig = async ({
  viteConfig,
  command,
  target,
}: {
  viteConfig: EngineOptionsViteConfig
  command: 'serve' | 'build'
  target: 'client' | 'server'
}): Promise<ExtractedViteConfig> => {
  return typeof viteConfig === 'function'
    ? await viteConfig({ command, mode: `${process.env.NODE_ENV || 'development'}-${target}` })
    : typeof viteConfig === 'string'
      ? await (async () => {
          const importedViteConfig = await import(/* @vite-ignore */ viteConfig).then(
            (module) => module.default || module,
          )
          if (typeof importedViteConfig === 'function') {
            return await importedViteConfig({ command, mode: `${process.env.NODE_ENV || 'development'}-${target}` })
          }
          return importedViteConfig
        })()
      : await viteConfig
}

export const createViteDevServer = async ({
  viteConfig,
  scope,
  target,
  hmrPort,
  env,
}: {
  viteConfig: EngineOptionsViteConfig | null
  scope: PointsScope
  target: 'client' | 'server'
  hmrPort: number | null
  env?: EngineOptionsEnvParsed
}): Promise<ViteDevServer> => {
  return await shakeItOnEngineHolderBuildPhase(async () => {
    if (!viteConfig) {
      throw new Error(`Vite config not found for client "${scope}"`)
    }
    const createServer = await import('vite').then((module) => module.createServer)
    const loadedViteConfig: ExtractedViteConfig = await extractViteConfig({
      viteConfig,
      command: 'serve',
      target,
    })

    const compilerPlugin = await import('@point0/compiler/plugin/vite').then((module) =>
      module.compilerVitePlugin({ target, scope }),
    )

    const hmr =
      loadedViteConfig.server?.hmr === false
        ? false
        : hmrPort === null
          ? false
          : {
              ...(typeof loadedViteConfig.server?.hmr === 'object' ? loadedViteConfig.server.hmr : {}),
              port: hmrPort,
            }
    return await createServer({
      ...loadedViteConfig,
      plugins: [compilerPlugin, ...(loadedViteConfig.plugins ?? [])],
      configFile: false,
      clearScreen: loadedViteConfig.clearScreen ?? false,
      appType: 'custom',
      server: {
        ...loadedViteConfig.server,
        middlewareMode: true,
        ws: !hmr ? false : loadedViteConfig.server?.ws,
        hmr,
      },
      define: {
        ...loadedViteConfig.define,
        ...Object.fromEntries(
          Object.entries(env ?? {}).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
        ),
        ...Object.fromEntries(
          Object.entries(env ?? {}).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
        ),
      },
    })
  })
}

// export const getDevPathInsideImportFn = (
//   fn: (...args: any[]) => Promise<any>,
//   engineFile: string | null,
// ): string | null => {
//   // if we just call fn that contains () => await import(x) in bun we will have no HMR (it is bun bug). So we need extract string from fn and import it separately.
//   if (process.env.NODE_ENV === 'production') {
//     return null
//   }
//   if (!engineFile) {
//     return null
//   }
//   const src = fn.toString()
//   const match = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/.exec(src)
//   const path = match?.[1] ?? null
//   if (!path) {
//     return null
//   }
//   return nodePath.resolve(nodePath.dirname(engineFile), path)
// }

// build helpers

export const shakeItOnEngineHolderBuildPhase = <T>(callback: () => T): T => {
  return callback()
}

export const readableStreamToString = async (readableStream: ReadableStream): Promise<string> => {
  const chunks: Uint8Array[] = []
  const reader = readableStream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

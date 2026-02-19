import * as nodeFsSync from 'node:fs'
import * as nodePath from 'node:path'
import type { NormalizedNodeEnv, PointsScope } from '@point0/core'
import { env } from '@point0/core'
import type { BuildConfig, BunPlugin } from 'bun'
import { plugin } from 'bun'
import type { Options as RetryOptions } from 'p-retry'
import pRetry from 'p-retry'
import type { ViteDevServer } from 'vite'
import type { EngineOptionsEnvParsed, EngineOptionsViteConfig, ExtractedViteConfig } from './config.js'

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

export type EngineServerBuildConfigDefinitionFnOptions = {
  mode: NormalizedNodeEnv
  side: 'server'
}
export type EngineServerBuildConfigDefinitionFn = (
  options: EngineServerBuildConfigDefinitionFnOptions,
) => Partial<BuildConfig> | Promise<Partial<BuildConfig>>
export type EngineServerBuildConfigDefinition = EngineServerBuildConfigDefinitionFn | Partial<BuildConfig>

export type EngineClientBuildConfigDefinitionFnOptions = {
  mode: NormalizedNodeEnv
  side: 'client'
}
export type EngineClientBuildConfigDefinitionFn = (
  options: EngineClientBuildConfigDefinitionFnOptions,
) => Partial<BuildConfig> | Promise<Partial<BuildConfig>>
export type EngineClientBuildConfigDefinition = EngineClientBuildConfigDefinitionFn | Partial<BuildConfig>

export type BunBuildConfigDefinitionFnOptions = {
  mode: NormalizedNodeEnv
  side: 'client' | 'server'
  scope: PointsScope
}
export type BunBuildConfigDefinitionFn = (
  options: BunBuildConfigDefinitionFnOptions,
) => Partial<BuildConfig> | Promise<Partial<BuildConfig>>
export type BunBuildConfigDefinition = BunBuildConfigDefinitionFn | Partial<BuildConfig>

export const executeEngineServerBuildConfig = async ({
  mode,
  bunBuildConfig,
  bunPlugins,
  scope,
}: {
  mode: NormalizedNodeEnv
  bunBuildConfig: EngineServerBuildConfigDefinition
  bunPlugins: EngineServerPluginsDefinition
  scope: PointsScope
}): Promise<Partial<BuildConfig>> => {
  return await extractBunBuildConfig({
    mode,
    bunBuildConfig: bunBuildConfig as BunBuildConfigDefinition,
    bunPlugins: bunPlugins as BunPluginsDefinition,
    side: 'server',
    scope,
  })
}

export const extractEngineClientBuildConfig = async ({
  mode,
  bunBuildConfig,
  bunPlugins,
  scope,
}: {
  mode: NormalizedNodeEnv
  bunBuildConfig: EngineClientBuildConfigDefinition
  bunPlugins: EngineClientPluginsDefinition
  scope: PointsScope
}): Promise<Partial<BuildConfig>> => {
  return await extractBunBuildConfig({
    mode,
    bunBuildConfig: bunBuildConfig as BunBuildConfigDefinition,
    bunPlugins: bunPlugins as BunPluginsDefinition,
    side: 'client',
    scope,
  })
}

export const extractBunBuildConfig = async ({
  mode,
  side,
  bunBuildConfig,
  bunPlugins,
  scope,
}: {
  mode: NormalizedNodeEnv
  side: 'client' | 'server'
  bunBuildConfig: BunBuildConfigDefinition
  bunPlugins: BunPluginsDefinition
  scope: PointsScope
}): Promise<Partial<BuildConfig>> => {
  const executedBunConfig =
    typeof bunBuildConfig === 'function' ? await bunBuildConfig({ mode, side, scope }) : bunBuildConfig
  const extractedBunPlugins = await extractBunPlugins({ mode, command: 'build', bunPlugins, side, scope })
  return {
    ...executedBunConfig,
    plugins: [...extractedBunPlugins, ...(executedBunConfig.plugins ?? [])],
  }
}

// plugins

export type EngineServerPluginsDefinitionFnOptions = {
  mode: NormalizedNodeEnv
  command: 'serve' | 'build'
  side: 'server'
}
export type EngineServerPluginsDefinitionFn = (
  options: EngineServerPluginsDefinitionFnOptions,
) => Array<BunPlugin | string> | Promise<Array<BunPlugin | string>>
export type EngineServerPluginsDefinition = EngineServerPluginsDefinitionFn | Array<BunPlugin | string>

export type EngineClientPluginsDefinitionFnOptions = {
  mode: NormalizedNodeEnv
  command: 'serve' | 'build'
  side: 'client'
}
export type EngineClientPluginsDefinitionFn = (
  options: EngineClientPluginsDefinitionFnOptions,
) => Array<BunPlugin | string> | Promise<Array<BunPlugin | string>>
export type EngineClientPluginsDefinition = EngineClientPluginsDefinitionFn | Array<BunPlugin | string>

export type BunPluginsDefinitionFnOptions = {
  mode: NormalizedNodeEnv
  command: 'serve' | 'build'
  side: 'client' | 'server'
  scope: PointsScope
}
export type BunPluginsDefinitionFn = (
  options: BunPluginsDefinitionFnOptions,
) => Array<BunPlugin | string> | Promise<Array<BunPlugin | string>>
export type BunPluginsDefinition = BunPluginsDefinitionFn | Array<BunPlugin | string>

export const extractEngineServerPlugins = async ({
  mode,
  command,
  bunPlugins,
  scope,
}: {
  mode: NormalizedNodeEnv
  command: 'serve' | 'build'
  bunPlugins: EngineServerPluginsDefinition
  scope: PointsScope
}): Promise<BunPlugin[]> => {
  return await extractBunPlugins({
    mode,
    command,
    bunPlugins: bunPlugins as BunPluginsDefinition,
    side: 'server',
    scope,
  })
}

export const extractEngineClientPlugins = async ({
  mode,
  command,
  bunPlugins,
  scope,
}: {
  mode: NormalizedNodeEnv
  command: 'serve' | 'build'
  bunPlugins: EngineClientPluginsDefinition
  scope: PointsScope
}): Promise<BunPlugin[]> => {
  return await extractBunPlugins({
    mode,
    command,
    bunPlugins: bunPlugins as BunPluginsDefinition,
    side: 'client',
    scope,
  })
}

export const extractBunPlugins = async ({
  mode,
  command,
  bunPlugins,
  side,
  scope,
}: {
  mode: NormalizedNodeEnv
  command: 'serve' | 'build'
  bunPlugins: BunPluginsDefinition
  side: 'client' | 'server'
  scope: PointsScope
}): Promise<BunPlugin[]> => {
  const bunPluginsArray =
    typeof bunPlugins === 'function' ? await bunPlugins({ mode, command, side, scope }) : bunPlugins
  return await Promise.all(
    bunPluginsArray.map(async (p) => {
      if (typeof p === 'string') {
        return await import(/* @vite-ignore */ p).then((module) => module.default || module)
      }
      return p
    }),
  )
}

export const extractEngineClientDevPluginsStrings = async ({
  cwd,
  mode,
  command,
  bunPlugins,
  errorOnNotString,
}: {
  cwd: string
  mode: NormalizedNodeEnv
  command: 'serve' | 'build'
  bunPlugins: EngineClientPluginsDefinition
  errorOnNotString: string
}): Promise<string[]> => {
  const bunPluginsArray =
    typeof bunPlugins === 'function' ? await bunPlugins({ mode, command, side: 'client' }) : bunPlugins
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
  side,
  mode,
  scope,
}: {
  viteConfig: EngineOptionsViteConfig
  command: 'serve' | 'build'
  side: 'client' | 'server'
  mode: NormalizedNodeEnv
  scope: PointsScope
}): Promise<ExtractedViteConfig> => {
  return typeof viteConfig === 'function'
    ? await viteConfig({ mode, command, side, scope })
    : typeof viteConfig === 'string'
      ? await (async () => {
          const importedViteConfig = await import(/* @vite-ignore */ viteConfig).then(
            (module) => module.default || module,
          )
          if (typeof importedViteConfig === 'function') {
            return await importedViteConfig({ mode, command, side, scope })
          }
          return importedViteConfig
        })()
      : viteConfig
}

export const createViteDevServer = async ({
  viteConfig,
  scope,
  side,
  mode,
  hmrPort,
  envConsts,
  root,
}: {
  viteConfig: EngineOptionsViteConfig | null
  scope: PointsScope
  side: 'client' | 'server'
  hmrPort: number | false
  envConsts?: EngineOptionsEnvParsed | EngineOptionsEnvParsed
  mode: NormalizedNodeEnv
  root: string | undefined
}): Promise<ViteDevServer> => {
  if (env.build.was) {
    throw new Error('You can not serve by dev client with built engine')
  } else {
    if (!viteConfig) {
      throw new Error(`Vite config not found for client "${scope}"`)
    }
    const createServer = await import('vite').then((module) => module.createServer)
    const loadedViteConfig: ExtractedViteConfig = await extractViteConfig({
      viteConfig,
      command: 'serve',
      side,
      mode,
      scope,
    })

    const compilerPlugin = await import('@point0/compiler/plugin/vite').then((module) =>
      module.compilerVitePlugin({ side, scope }),
    )

    const hmr =
      loadedViteConfig.server?.hmr === false
        ? false
        : hmrPort === false
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
      root: loadedViteConfig.root ?? root,
      define: {
        ...loadedViteConfig.define,
        ...Object.fromEntries(
          Object.entries(envConsts ?? {}).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
        ),
        ...Object.fromEntries(
          Object.entries(envConsts ?? {}).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
        ),
      },
    })
  }
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

export const readableStreamToString = async (readableStream: ReadableStream): Promise<string> => {
  const chunks: Uint8Array[] = []
  const reader = readableStream.getReader()
  // biome-ignore lint/nursery/noUnnecessaryConditions: ok
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

type WithRetriesFn = {
  <T extends (...args: any[]) => any>(count: number, filter: string[], fn: T): T
  <T extends (...args: any[]) => any>(count: number, fn: T): T
}
export const withRetries: WithRetriesFn = <T extends (...args: any[]) => any>(
  ...args: [count: number, filter: string[], fn: T] | [count: number, fn: T]
): T => {
  const [count, filter, fn] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], undefined, args[1]]

  // We return a new function that mimics the original function's signature
  return ((...innerArgs: Parameters<T>): ReturnType<T> => {
    let retryIndex = 0

    const attempt = (): any => {
      try {
        const result = fn(...innerArgs)

        // Check if the result is a Promise (Async case)
        if (result instanceof Promise) {
          return result.catch((error: unknown) => {
            handleError(error)
            return attempt()
          })
        }

        // Sync case success
        return result
      } catch (error) {
        // Sync case error
        handleError(error)
        return attempt()
      }
    }

    const handleError = (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isFiltered = filter && !filter.some((f) => errorMessage.includes(f))

      if (isFiltered || retryIndex >= count) {
        throw error
      }
      retryIndex++
    }

    return attempt()
  }) as T
}

type WithAsyncRetriesFn = {
  <T extends (...args: any[]) => any>(
    options: RetryOptions,
    fn: T,
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>
  <T extends (...args: any[]) => any>(count: number, fn: T): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>
  <T extends (...args: any[]) => any>(
    count: number,
    minTimeout: number,
    fn: T,
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>
}
export const withAsyncRetries: WithAsyncRetriesFn = (
  ...args:
    | [options: RetryOptions, fn: (...args: any[]) => any]
    | [count: number, fn: (...args: any[]) => any]
    | [count: number, minTimeout: number, fn: (...args: any[]) => any]
): any => {
  const { options, fn } = ((): {
    options: RetryOptions
    fn: (...args: any[]) => any
  } => {
    if (typeof args[0] === 'object') {
      return { options: args[0], fn: args[1] as (...args: any[]) => any }
    } else if (typeof args[1] === 'function') {
      return { options: { retries: args[0] }, fn: args[1] }
    } else {
      return { options: { retries: args[0], minTimeout: args[1] }, fn: args[2] as (...args: any[]) => any }
    }
  })()
  return async (...args: any[]) => {
    return await pRetry(async () => await Promise.resolve(fn(...args)), {
      randomize: true,
      factor: 1.7,
      minTimeout: 200,
      ...options,
    })
  }
}

export const normalizeAndValidateNodeEnv = (fallback?: NormalizedNodeEnv): NormalizedNodeEnv => {
  const validValues: NormalizedNodeEnv[] = ['production', 'development', 'test']
  const nodeEnv = process.env.NODE_ENV
  if (!nodeEnv && fallback) {
    process.env.NODE_ENV = fallback
    return fallback
  }
  if (!nodeEnv || !validValues.includes(nodeEnv as NormalizedNodeEnv)) {
    throw new Error(`Invalid process.env.NODE_ENV: ${nodeEnv}. Allowed values: ${validValues.join(', ')}`)
  }
  process.env.NODE_ENV = nodeEnv
  return nodeEnv as NormalizedNodeEnv
}

export const isAsyncFn = (fn: unknown): fn is (...args: any[]) => Promise<any> =>
  typeof fn === 'function' && fn.constructor.name === 'AsyncFunction'

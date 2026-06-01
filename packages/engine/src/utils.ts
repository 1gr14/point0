import type { CompilerOptions } from '@point0/compiler'
import type { NormalizedNodeEnv, PointsScope } from '@point0/core'
import { env } from '@point0/core'
import type { BuildConfig, BunPlugin } from 'bun'
import { plugin } from 'bun'
import * as nodeFsSync from 'node:fs'
import * as nodePath from 'node:path'
import type { Options as RetryOptions } from 'p-retry'
import pRetry from 'p-retry'
import type { Plugin, ViteDevServer } from 'vite'
import type {
  EngineOptionsEnvParsed,
  EngineOptionsViteConfig,
  ExtractedViteConfig,
  ExtractViteConfigFn,
} from './config.js'

// /**
//  * True when the current Bun process was started with the engine's own CLI (`point0` or `point0-mcp`)
//  * as its entry. Used by preload to skip user-code transformer plugins — the CLI talks to the engine
//  * via its public API, so installing plugins is wasted work and can interfere with module loading.
//  *
//  * Resolves siblings of *this* file via `import.meta.url`, so it correctly tracks both `src` (point0
//  * monorepo dev) and `dist/esm` (installed package) layouts without string-matching package paths.
//  */
// const engineCliEntryPaths = ((): Set<string> => {
//   const selfDir = nodePath.dirname(fileURLToPath(import.meta.url))
//   const names = ['cli', 'mcp']
//   const exts = ['js', 'ts', 'mjs', 'cjs', 'mts', 'cts']
//   const paths = new Set<string>()
//   for (const name of names) {
//     for (const ext of exts) {
//       paths.add(nodePath.resolve(selfDir, `${name}.${ext}`))
//     }
//   }
//   return paths
// })()

// export const isBunMainEngineCli = (): boolean => {
//   return !!Bun.main && engineCliEntryPaths.has(Bun.main)
// }

export const stripTerminalClearSequences = (text: string): string =>
  text
    .replace(/\x1bc/g, '')
    .replace(/\x1b\[\?1049[hl]/g, '')
    .replace(/\x1b\[\?1047[hl]/g, '')
    .replace(/\x1b\[\?47[hl]/g, '')
    .replace(/\x1b\[(?:[0-3]?J|2K|K|H|1;1H)/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

export const pipeStreamStripped = ({
  stream,
  target,
  onChunk,
}: {
  stream: ReadableStream<Uint8Array> | null
  target: NodeJS.WriteStream
  onChunk?: (rawText: string) => void
}): void => {
  if (!stream) {
    return
  }
  const decoder = new TextDecoder()
  void stream
    .pipeTo(
      new WritableStream({
        write(chunk) {
          const text = decoder.decode(chunk, { stream: true })
          const cleaned = stripTerminalClearSequences(text)
          if (cleaned.length > 0) {
            target.write(cleaned)
          }
          onChunk?.(text)
        },
        close() {
          const flushed = decoder.decode()
          const cleaned = stripTerminalClearSequences(flushed)
          if (cleaned.length > 0) {
            target.write(cleaned)
          }
        },
      }),
    )
    .catch(() => {
      // Process streams can close abruptly during normal shutdown.
    })
}

export const toPathsOrUndefined = (path: string | string[] | undefined): string[] | undefined => {
  if (!path) {
    return undefined
  }
  return Array.isArray(path) ? path : [path]
}

export const toAbsPath = <T extends string | undefined | null>(
  cwd: string | undefined,
  path: T,
  respectExclamationMark = false,
): T => {
  if (!path) {
    return undefined as T
  }
  const hasExclamationMark = respectExclamationMark && path.startsWith('!')
  const normalizedPath = hasExclamationMark ? path.replace(/^!/, '') : path
  const withExclamationMark = (path: string) => (hasExclamationMark ? `!${path}` : path)
  if (!cwd) {
    if (!nodePath.isAbsolute(normalizedPath)) {
      throw new Error(`Path "${normalizedPath}" is not absolute, but should be`)
    }
    return withExclamationMark(normalizedPath) as T
  }
  if (!nodePath.isAbsolute(cwd)) {
    throw new Error(`Cwd "${cwd}" is not absolute, but should be`)
  }
  return withExclamationMark(nodePath.resolve(cwd, normalizedPath)) as T
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

  // const exts = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
  function isFile(path: string): boolean {
    if (pathsHasFiles === false) {
      return false
    }
    if (pathsHasDirs === false && pathsHasFiles === true) {
      return true
    }
    // return exts.some((ext) => path.endsWith(ext))
    return nodePath.extname(path) !== ''
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

export const externalizeRollupModule = ({ external, moduleId }: { external: unknown; moduleId: string }): unknown => {
  if (!external) {
    return [moduleId]
  }
  if (typeof external === 'function') {
    return (...args: any[]) => {
      if (args[0] === moduleId) {
        return true
      }
      return external(...args)
    }
  }
  if (typeof external === 'string') {
    return external === moduleId ? external : [external, moduleId]
  }
  if (external instanceof RegExp) {
    return [external, moduleId]
  }
  if (Array.isArray(external)) {
    return external.some((item) => typeof item === 'string' && item === moduleId) ? external : [...external, moduleId]
  }
  return [moduleId]
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

export type EngineSharedPluginsDefinitionFnOptions = {
  mode: NormalizedNodeEnv
  command: 'serve' | 'build'
  side: 'client' | 'server'
  scope: PointsScope
}
export type EngineSharedPluginsDefinitionFn = (
  options: EngineSharedPluginsDefinitionFnOptions,
) => Array<BunPlugin | string> | Promise<Array<BunPlugin | string>>
export type EngineSharedPluginsDefinition = EngineSharedPluginsDefinitionFn | Array<BunPlugin | string>

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
  bunPlugins: EngineServerPluginsDefinition | EngineSharedPluginsDefinition
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
        return await import(/* @preserve */ /* @vite-ignore */ p).then((module) => module.default || module)
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
  scope,
  errorOnNotString,
}: {
  cwd: string
  mode: NormalizedNodeEnv
  command: 'serve' | 'build'
  bunPlugins: EngineClientPluginsDefinition | EngineSharedPluginsDefinition
  scope: PointsScope
  errorOnNotString: string
}): Promise<string[]> => {
  const bunPluginsArray =
    typeof bunPlugins === 'function' ? await bunPlugins({ mode, command, side: 'client', scope }) : bunPlugins
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

// vite

/**
 * Module-level flag set while we're inside `extractViteConfig` calling the user's `viteConfig` function (incl. the
 * string-form pointing at `vite.config.ts`). `Engine.getViteConfig` checks it to short-circuit: when the user's
 * `vite.config.ts` calls `engine.getViteConfig(env)`, we must NOT recursively re-enter extraction — instead return the
 * engine's bare contribution (compiler plugin + root) so the user's mergeConfig still produces a complete config
 * without infinite recursion.
 */
let viteConfigExtractionDepth = 0
export const isExtractingViteConfig = (): boolean => viteConfigExtractionDepth > 0

export const extractViteConfig = async ({
  viteConfig,
  command,
  side,
  mode,
  scope,
  plugins,
}: {
  viteConfig: EngineOptionsViteConfig
  command: 'serve' | 'build'
  side: 'client' | 'server'
  mode: NormalizedNodeEnv
  scope: PointsScope
  plugins: Plugin[]
}): Promise<ExtractedViteConfig> => {
  // Function-form: hand `plugins` to the user and trust their placement. Object/string-form:
  // user has no way to receive `plugins`, so we still prepend them ourselves. `isSsrBuild` and
  // `isPreview` are spread in so a native `defineConfig(env => ...)` callback in the user's
  // `vite.config.ts` sees the standard `ConfigEnv` shape — `side`/`scope`/`plugins` are extra
  // engine-provided fields.
  const opts = { mode, command, side, scope, plugins, isSsrBuild: side === 'server', isPreview: false }
  const mergePluginsIntoObject = (config: ExtractedViteConfig): ExtractedViteConfig => ({
    ...config,
    plugins: [...plugins, ...(config.plugins ?? [])],
  })
  viteConfigExtractionDepth++
  try {
    if (typeof viteConfig === 'function') {
      return await viteConfig(opts)
    }
    if (typeof viteConfig === 'string') {
      const imported = await import(/* @preserve */ /* @vite-ignore */ viteConfig).then(
        (module) => module.default || module,
      )
      if (typeof imported === 'function') {
        return await imported(opts)
      }
      return mergePluginsIntoObject(imported)
    }
    return mergePluginsIntoObject(viteConfig)
  } finally {
    viteConfigExtractionDepth--
  }
}

export const getViteRoot = ({
  viteConfig,
  loadedViteConfig,
  engineFile,
}: {
  viteConfig: EngineOptionsViteConfig | string | null
  loadedViteConfig: ExtractedViteConfig
  engineFile: string | null
}): string | undefined => {
  if (loadedViteConfig.root) {
    return loadedViteConfig.root
  }
  if (engineFile) {
    return nodePath.dirname(engineFile)
  }
  if (typeof viteConfig === 'string') {
    return nodePath.dirname(viteConfig)
  }
  return undefined
}

export const defineViteConfig = (definition: ExtractViteConfigFn): ExtractViteConfigFn => {
  return definition
}

/**
 * Build the full vite UserConfig used by {@link createViteDevServer} (and therefore by both server SSR dev and client
 * dev). Extracted as a standalone function so the same config can be returned by {@link Engine.getViteConfig} without
 * going through createServer.
 */
export const getViteConfigForDev = async ({
  viteConfig,
  scope,
  side,
  mode,
  hmrPort,
  envConsts,
  engineFile,
  compilerOptions,
}: {
  viteConfig: EngineOptionsViteConfig | null
  scope: PointsScope
  side: 'client' | 'server'
  hmrPort: number | false
  envConsts?: EngineOptionsEnvParsed
  mode: NormalizedNodeEnv
  engineFile: string | null
  compilerOptions: CompilerOptions | false
}): Promise<ExtractedViteConfig> => {
  if (env.build.was) {
    throw new Error('You can not serve by dev client with built engine')
  }
  if (!viteConfig) {
    throw new Error(`Vite config not found for client "${scope}"`)
  }

  const compilerPlugin: Plugin[] = compilerOptions
    ? [await import('@point0/compiler/plugin/vite').then((module) => module.compilerVitePlugin(compilerOptions))]
    : []

  const loadedViteConfig: ExtractedViteConfig = await extractViteConfig({
    viteConfig,
    command: 'serve',
    side,
    mode,
    scope,
    plugins: compilerPlugin,
  })

  const hmr =
    loadedViteConfig.server?.hmr === false
      ? false
      : hmrPort === false
        ? false
        : {
            ...(typeof loadedViteConfig.server?.hmr === 'object' ? loadedViteConfig.server.hmr : {}),
            port: hmrPort,
          }

  return {
    ...loadedViteConfig,
    plugins: loadedViteConfig.plugins,
    clearScreen: loadedViteConfig.clearScreen ?? false,
    appType: 'custom',
    server: {
      ...loadedViteConfig.server,
      middlewareMode: true,
      ws: !hmr ? false : loadedViteConfig.server?.ws,
      hmr,
    },
    root: getViteRoot({ viteConfig, loadedViteConfig, engineFile }),
    define: {
      ...(side === 'client' ? { 'process.env': `window.process.env` } : {}),
      ...loadedViteConfig.define,
      ...Object.fromEntries(
        Object.entries(envConsts ?? {}).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
      ),
    },
  }
}

export const createViteDevServer = async (options: {
  viteConfig: EngineOptionsViteConfig | null
  scope: PointsScope
  side: 'client' | 'server'
  hmrPort: number | false
  envConsts?: EngineOptionsEnvParsed
  mode: NormalizedNodeEnv
  engineFile: string | null
  compilerOptions: CompilerOptions | false
}): Promise<ViteDevServer> => {
  const config = await getViteConfigForDev(options)
  const createServer = await import('vite').then((module) => module.createServer)
  // `configFile: false` is vite-runtime-only (not part of UserConfig) — set here so the engine
  // never lets vite recurse into a real vite.config.ts at server start.
  return await createServer({ ...config, configFile: false })
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

// type WithAsyncRetriesFn = {
//   <T extends (...args: any[]) => any>(
//     options: RetryOptions,
//     fn: T,
//   ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>
//   <T extends (...args: any[]) => any>(count: number, fn: T): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>
//   <T extends (...args: any[]) => any>(
//     count: number,
//     minTimeout: number,
//     fn: T,
//   ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>
// }
// export const withAsyncRetries: WithAsyncRetriesFn = (
//   ...args:
//     | [options: RetryOptions, fn: (...args: any[]) => any]
//     | [count: number, fn: (...args: any[]) => any]
//     | [count: number, minTimeout: number, fn: (...args: any[]) => any]
// ): any => {
//   const { options, fn } = ((): {
//     options: RetryOptions
//     fn: (...args: any[]) => any
//   } => {
//     if (typeof args[0] === 'object') {
//       return { options: args[0], fn: args[1] as (...args: any[]) => any }
//     } else if (typeof args[1] === 'function') {
//       return { options: { retries: args[0] }, fn: args[1] }
//     } else {
//       return { options: { retries: args[0], minTimeout: args[1] }, fn: args[2] as (...args: any[]) => any }
//     }
//   })()
//   return async (...args: any[]) => {
//     return await pRetry(async () => await Promise.resolve(fn(...args)), {
//       randomize: true,
//       factor: 1.7,
//       minTimeout: 200,
//       ...options,
//     })
//   }
// }

const isConnectionRefusedError = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null | undefined)?.code
  return code === 'ConnectionRefused' || code === 'ECONNREFUSED'
}

/**
 * `fetch` for forwarding a request to a dev server that may be briefly unreachable — e.g. while the server is
 * mid-restart, when the client keeps proxying refetches into a port that is momentarily closed. On a connection-refused
 * error we quietly retry every `intervalMs` for up to `timeoutMs`, so the caller's promise just stays pending instead
 * of rejecting. The restart almost always finishes inside the window and the real response comes back; nothing is
 * logged either way (the server's own logs already pipe to the client). Any other error is real and propagates. If the
 * window elapses with the server still down we resolve to a silent 502 rather than throw, so the caller never surfaces
 * a noisy ConnectionRefused stack.
 */
export const fetchRetryingConnectionRefused = async (
  input: string,
  init?: RequestInit,
  options?: { intervalMs?: number; timeoutMs?: number },
): Promise<Response> => {
  const intervalMs = options?.intervalMs ?? 30
  const timeoutMs = options?.timeoutMs ?? 3000
  // A ReadableStream body can be consumed only once; buffer it so every attempt can re-send it.
  const body =
    init?.body && typeof (init.body as ReadableStream).getReader === 'function'
      ? await new Response(init.body as BodyInit).arrayBuffer()
      : init?.body
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      return await fetch(input, { ...init, body })
    } catch (error) {
      if (!isConnectionRefusedError(error)) {
        throw error
      }
      if (Date.now() >= deadline) {
        return new Response('Dev server unavailable', { status: 502 })
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
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

export const registerOnProcessExit = (fn: () => void): void => {
  let triggered = false
  const triggerIfNotYet = (): void => {
    if (triggered) {
      return
    }
    triggered = true
    try {
      fn()
    } catch {
      // Cleanup failures must not block other handlers from running.
    }
  }

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP']
  const signalHandlers = new Map<NodeJS.Signals, () => void>()

  const removeSignalHandlers = (): void => {
    for (const [signal, handler] of signalHandlers.entries()) {
      process.removeListener(signal, handler)
    }
    signalHandlers.clear()
  }

  for (const signal of signals) {
    const handler = (): void => {
      triggerIfNotYet()
      removeSignalHandlers()
      process.kill(process.pid, signal)
    }
    signalHandlers.set(signal, handler)
    process.on(signal, handler)
  }

  process.on('beforeExit', triggerIfNotYet)
  process.on('exit', triggerIfNotYet)
  process.on('uncaughtException', triggerIfNotYet)
  process.on('unhandledRejection', triggerIfNotYet)
}

type AnySubprocess = Bun.Subprocess<any, any, any>
type SubprocessRef = AnySubprocess | null | undefined

const killSubprocessIfAlive = (child: SubprocessRef): void => {
  if (!child || child.exitCode !== null) {
    return
  }
  try {
    child.kill('SIGKILL')
  } catch {
    // Already dead or detached.
  }
}

export const killSubprocessOnExit = (getChild: () => SubprocessRef | Iterable<SubprocessRef>): void => {
  registerOnProcessExit(() => {
    const value = getChild()
    if (!value) {
      return
    }
    if (Symbol.iterator in Object(value)) {
      for (const child of value as Iterable<SubprocessRef>) {
        killSubprocessIfAlive(child)
      }
      return
    }
    killSubprocessIfAlive(value as SubprocessRef)
  })
}

export const parseGlobs = ({
  cwd,
  globs,
}: {
  cwd: string
  globs: string[]
}): {
  patterns: string[]
  includes: string[]
  excludes: string[]
  dir: string
} => {
  const patterns: string[] = []
  const includes: string[] = []
  const excludes: string[] = []
  for (const glob of globs) {
    const isExclude = glob.startsWith('!')
    const pathMaybeRel = isExclude ? glob.slice(1) : glob
    const pathAbs = nodePath.resolve(cwd, pathMaybeRel)
    patterns.push(isExclude ? `!${pathAbs}` : pathAbs)
    if (isExclude) {
      excludes.push(pathAbs)
    } else {
      includes.push(pathAbs)
    }
  }
  return { patterns, includes, excludes, dir: includes.length > 0 ? getDirByPaths({ paths: includes }) : cwd }
}

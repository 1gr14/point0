import type { RoutesPretty } from '@devp0nt/route0'
import { normalizeEnvConsts } from '@point0/compiler'
import type { CompilerEnvConsts, CompilerEnvConstsNormalized, ImporterOptionsInput } from '@point0/compiler'
import { _defaultLogFn, prependAndDeappendSlash } from '@point0/core'
import type {
  AppComponent,
  AppComponentModule,
  EnvOsName,
  EnvRuntimeName,
  ErrorPoint0,
  LogFn,
  NormalizedNodeEnv,
  PointsDefinitionSource,
  PointsScope,
  RequiredCtx,
} from '@point0/core'
import type { Request0 } from '@point0/core/request0'
import type { Serve } from 'bun'
import { minimatch } from 'minimatch'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import { FilesGenerator } from './generator.js'
import type {
  FilesGeneratorSimpleClientConfig,
  FilesGeneratorSimpleGeneralConfig,
  FilesGeneratorSimpleServerConfig,
  FilesGeneratorTask,
  FilesGeneratorTaskMeta,
} from './generator.js'
import type { PublicdirDefinition } from './publicdir.js'
import { toAbsPath, toJsExtension } from './utils.js'
import type {
  BunBuildConfigDefinition,
  EngineClientBuildConfigDefinition,
  EngineClientPluginsDefinition,
  EngineServerBuildConfigDefinition,
  EngineServerPluginsDefinition,
  EngineSharedPluginsDefinition,
} from './utils.js'
import { Point0 } from '@point0/core'

export type EngineOptionsPublicdir =
  | string
  | Record<string, string | (() => string | Promise<string>)>
  | Array<
      | string
      | Record<string, string | (() => string | Promise<string>)>
      | [string, string | (() => string | Promise<string>)]
    >
export type EngineOptionsPublicdirParsed = Array<[string, string | (() => string | Promise<string>)]>

export type EngineOptionsEnvWide =
  | string
  | Record<string, string | undefined>
  | Array<string | Record<string, string | undefined>>
export type EngineOptionsEnvStrict = Record<string, string | undefined> | Array<Record<string, string | undefined>>
export type EngineOptionsEnvParsed = Record<string, string | undefined>

export type ExtractedViteConfig = import('vite').UserConfig
export type ExtractViteConfigOptions = {
  command: 'serve' | 'build'
  side: 'client' | 'server'
  mode: NormalizedNodeEnv
  scope: PointsScope
  plugins: import('vite').Plugin[]
}
export type ExtractViteConfigFn = (
  options: ExtractViteConfigOptions,
) => Promise<ExtractedViteConfig> | ExtractedViteConfig
export type EngineOptionsViteConfig =
  | ExtractViteConfigFn
  | ExtractedViteConfig
  // | ReturnType<typeof import('vite').defineConfig>
  | string

export type EngineOptionsAppComponent = (() => Promise<AppComponent | AppComponentModule>) | AppComponent
export type EngineOptionsRoutes = () =>
  | Promise<RoutesPretty | { routes: RoutesPretty } | { default: RoutesPretty }>
  | RoutesPretty

export type AnyBunServeConfig = Serve.Options<any, any>

export type EngineOptionsCompilerGeneral = {
  side?: boolean
  scope?: boolean
  mode?: boolean
  runtime?: boolean
  os?: boolean
  consts?: CompilerEnvConsts
  filter?: RegExp
  ssr?: boolean
  cache?: boolean
}
// export type EngineOptionsCompilerGeneralParsed = {
//   side: boolean
//   scope: boolean
//   consts: CompilerEnvConstsNormalized | undefined
//   mode: boolean
//   runtime: boolean
//   os: boolean
//   filter: RegExp | undefined
//   ssr: boolean
// }
export type EngineOptionsCompilerSpecific = {
  side?: boolean
  scope?: boolean
  mode?: boolean
  runtime?: EnvRuntimeName | false
  os?: EnvOsName | false
  consts?: CompilerEnvConsts
  filter?: RegExp
  ssr?: boolean
  importer?: ImporterOptionsInput | undefined
  cache?: boolean
}
export type EngineOptionsCompilerSpecificParsed = {
  side: boolean
  scope: boolean
  consts: CompilerEnvConstsNormalized | undefined
  mode: boolean
  runtime: EnvRuntimeName | false
  os: EnvOsName | false
  filter: RegExp | undefined
  ssr: boolean
  importer: ImporterOptionsInput
  cache: boolean
}

export type EngineOptionsServing = boolean | string | ((options: { request: Request0 }) => boolean)

export type EngineGeneralOptions = {
  file: string
  generte?: Array<Omit<FilesGeneratorTaskMeta, 'scopes'>>
  log?: LogFn
  generate?: FilesGeneratorSimpleGeneralConfig | FilesGeneratorTask[]
  itWasBuilt?: boolean
  cwdAfterBuild?: string
  cwdBeforeBuild?: string
  autoFixBuiltPaths?: boolean
  clientsOutdir?: string
  pointsGlob?: string | string[]
  buildWatchGlob?: string | string[]
  banner?: string
  bunBuildConfig?: BunBuildConfigDefinition
  bunPlugins?: EngineSharedPluginsDefinition
  viteConfig?: EngineOptionsViteConfig
  compiler?: EngineOptionsCompilerGeneral | boolean
  // default ssr value
  ssr?: boolean
}

export type EngineServerOptions<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
> = {
  scope: PointsScope
  points?: PointsDefinitionSource<TRequiredCtx, TError>
  // generate?: Array<Omit<FilesGeneratorTaskPoints, 'scope' | 'side'> | Omit<FilesGeneratorTaskRoutes, 'scope' | 'side'>>
  generate?: FilesGeneratorSimpleServerConfig
  publicdir?: {
    source: EngineOptionsPublicdir
    outdir: string
    cacheLimit?: number | boolean
  }
  importer?: ImporterOptionsInput
  env?: { vars?: EngineOptionsEnvStrict; consts?: EngineOptionsEnvWide }
  port?: number | string
  outdir?: string
  entry?: string | Record<string, string>
  devWatchGlob?: string | string[]
  bunServeConfig?: Serve.Options<any, any>
  bunBuildConfig?: EngineServerBuildConfigDefinition
  bunPlugins?: EngineServerPluginsDefinition
  viteConfig?: EngineOptionsViteConfig
  compiler?: EngineOptionsCompilerSpecific | boolean
  routes?: EngineOptionsRoutes
  banner?: string
  hmrPort?: number | string | boolean
  ssr?: boolean
}

export type EngineClientOptions = {
  scope: PointsScope
  points?: PointsDefinitionSource<any, any>
  serving?: EngineOptionsServing
  // generate?: Array<Omit<FilesGeneratorTaskPoints, 'scope' | 'side'> | Omit<FilesGeneratorTaskRoutes, 'scope' | 'side'>>
  generate?: FilesGeneratorSimpleClientConfig
  app?: EngineOptionsAppComponent
  publicdir?: {
    source: EngineOptionsPublicdir
    outdir: string
    cacheLimit?: number | boolean
  }
  importer?: ImporterOptionsInput
  indexHtml?: string
  domRootElementId?: string
  env?: { vars?: EngineOptionsEnvWide; consts?: EngineOptionsEnvWide }
  port?: number | string
  hmrPort?: number | string | boolean
  bunBuildConfig?: EngineClientBuildConfigDefinition
  bunPlugins?: EngineClientPluginsDefinition
  viteConfig?: EngineOptionsViteConfig
  compiler?: EngineOptionsCompilerSpecific | boolean
  outdir?: string
  routes?: EngineOptionsRoutes
  banner?: string
  ssr?: boolean
}
export type EngineOptions<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
> = EngineGeneralOptions & {
  server?: EngineServerOptions<TRequiredCtx, TError>
  client?: EngineClientOptions
  clients?: EngineClientOptions[]
}

export type EngineGeneralOptionsParsed = {
  log: LogFn
  itWasBuilt: boolean
  cwdAfterBuild: string
  cwdBeforeBuild: string
  engineFile: string
  cwd: string
  generate: Array<FilesGeneratorTask>
  autoFixBuiltPaths: boolean
  clientsOutdir: string | null
  pointsGlob: string[]
  buildWatchGlob: string[]
  banner: string | null
  compiler: EngineOptionsCompilerGeneral | boolean | null
  viteConfig: EngineOptionsViteConfig | null
  bunBuildConfig: BunBuildConfigDefinition | null
  bunPlugins: EngineSharedPluginsDefinition
  ssr: boolean | undefined
}
export type EngineClientOptionsParsed = {
  scope: PointsScope
  engineFile: string
  pointsProvided: PointsDefinitionSource<any, any> | null
  serving: EngineOptionsServing
  banner: string | null
  generate: Array<FilesGeneratorTask>
  routesProvided: EngineOptionsRoutes | null
  // pointsDistFile: string | null
  appProvided: EngineOptionsAppComponent | null
  // appDistFile: string | null
  indexHtml: string | null
  // indexHtmlDistFile: string | null
  envVars: EngineOptionsEnvParsed
  envConsts: EngineOptionsEnvParsed
  domRootElementId: string
  port: number
  hmrPort: number | false
  index: number
  outdir: string | null
  bunBuildConfig: EngineClientBuildConfigDefinition
  bunPlugins: EngineClientPluginsDefinition
  viteConfig: EngineOptionsViteConfig | null
  compiler: EngineOptionsCompilerSpecificParsed | false
  publicdir: {
    source: PublicdirDefinition
    outdir: string
    cacheLimit: number | boolean
  } | null
  ssr: boolean
}
export type EngineServerOptionsParsed = {
  scope: PointsScope
  pointsProvided: PointsDefinitionSource<any, any>
  banner: string | null
  generate: Array<FilesGeneratorTask>
  routesProvided: EngineOptionsRoutes | null
  port: number
  entry: Record<string, string> | null
  outdir: string | null
  envVars: EngineOptionsEnvParsed
  envConsts: EngineOptionsEnvParsed
  publicdir: {
    source: PublicdirDefinition
    outdir: string
    cacheLimit: number | boolean
  } | null
  engineFile: string
  cwdBeforeBuild: string
  itWasBuilt: boolean
  bunBuildConfig: EngineServerBuildConfigDefinition
  bunServeConfig: Serve.Options<any, any> | null
  bunPlugins: EngineServerPluginsDefinition
  viteConfig: EngineOptionsViteConfig | null
  compiler: EngineOptionsCompilerSpecificParsed | false
  hmrPort: number | false
  ssr: boolean
  devWatchGlob: string[]
}
export type EngineOptionsParsed = {
  general: EngineGeneralOptionsParsed
  server: EngineServerOptionsParsed
  clients: EngineClientOptionsParsed[]
  routes: Record<string, RoutesPretty | EngineOptionsRoutes | null>
}

const parsePublicdir = (input: EngineOptionsPublicdir, cwd: string): EngineOptionsPublicdirParsed => {
  if (typeof input === 'string') {
    return [['/', toAbsPath(cwd, input)]]
  }
  if (!Array.isArray(input)) {
    return Object.entries(input).map(([routePath, absPathOrResponseOrFn]) => [
      prependAndDeappendSlash(routePath),
      typeof absPathOrResponseOrFn === 'string' ? toAbsPath(cwd, absPathOrResponseOrFn) : absPathOrResponseOrFn,
    ])
  }
  const result: EngineOptionsPublicdirParsed = []
  for (const item of input) {
    if (typeof item === 'string') {
      result.push(...parsePublicdir(item, cwd))
      continue
    }
    if (!Array.isArray(item)) {
      result.push(...parsePublicdir(item, cwd))
      continue
    }
    result.push([prependAndDeappendSlash(item[0]), typeof item[1] === 'string' ? toAbsPath(cwd, item[1]) : item[1]])
  }
  return result
}

const parseEnv = (input: EngineOptionsEnvWide | EngineOptionsEnvStrict): EngineOptionsEnvParsed => {
  if (typeof input === 'string') {
    if (input.includes('*')) {
      // for (const key of Object.keys(process.env)) {
      //   if (minimatch(key, input)) {
      //     result[key] = process.env[key]
      //   }
      // }
      return Object.fromEntries(Object.entries(process.env).filter(([key]) => minimatch(key, input)))
    } else {
      return { [input]: process.env[input] }
    }
  }
  if (!Array.isArray(input)) {
    return input
  }
  const result: EngineOptionsEnvParsed = {}
  for (const item of input) {
    Object.assign(result, parseEnv(item))
  }
  return result
}

export const throwOnEmptyStringOrAsteriskEnv = (
  env: EngineOptionsEnvWide | EngineOptionsEnvStrict,
  errorSuffix: string,
): void => {
  if (typeof env === 'string') {
    if (env === '' || env === '*') {
      throw new Error(`Environment variable "${env}" is not allowed for ${errorSuffix}`)
    }
  }
  if (!Array.isArray(env)) {
    return
  }
  for (const item of env) {
    throwOnEmptyStringOrAsteriskEnv(item, errorSuffix)
  }
}

const isFileURL = (str: string): boolean => {
  try {
    // Check if it starts with a URL scheme (file://, http://, https://, etc.)
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(str)) {
      // Validate it's a proper URL
      const url = new URL(str)
      // fileURLToPath specifically works with file:// URLs
      return url.protocol === 'file:'
    }
    return false
  } catch {
    return false
  }
}

const parseEngineGeneralOptions = ({
  generalOptions,
  serverOptions,
  clientsOptions,
}: {
  generalOptions: EngineGeneralOptions
  serverOptions: EngineServerOptions<any, any>
  clientsOptions: EngineClientOptions[] | undefined
}): EngineGeneralOptionsParsed => {
  if (!generalOptions.file) {
    throw new Error('You should provide engine file path via file: import.meta.url, it is critical for engine to work')
  }
  // Convert file URL to path if needed, since we'll use it with nodePath functions
  const engineFile = isFileURL(generalOptions.file) ? fileURLToPath(generalOptions.file) : generalOptions.file
  const itWasBuilt = generalOptions.itWasBuilt ?? process.env.POINT0_ENGINE_WAS_BUILT === 'true'
  const { cwdAfterBuild, cwdBeforeBuild, cwd } = (() => {
    generalOptions.itWasBuilt ??= process.env.POINT0_ENGINE_WAS_BUILT === 'true'

    if (!itWasBuilt) {
      generalOptions.cwdBeforeBuild ??= nodePath.dirname(engineFile)
      serverOptions.outdir ||= 'dist'

      if (!generalOptions.cwdAfterBuild && generalOptions.cwdBeforeBuild && serverOptions.outdir) {
        if (!nodePath.isAbsolute(generalOptions.cwdBeforeBuild)) {
          throw new Error(
            `cwdBeforeBuild "${generalOptions.cwdBeforeBuild}" is not absolute, but should be, while tryin auto detect cwdAfterBuild`,
          )
        }
        generalOptions.cwdAfterBuild = nodePath.resolve(generalOptions.cwdBeforeBuild, serverOptions.outdir)
      }
    } else {
      if (!generalOptions.cwdBeforeBuild || !generalOptions.cwdAfterBuild) {
        const POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED = process.env.POINT0_ENGINE_CWD_BEFORE_BUILD ?? null
        const POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED = process.env.POINT0_ENGINE_CWD_AFTER_BUILD ?? null
        if (!POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED || !POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED || !engineFile) {
          throw new Error(
            `You should provide POINT0_ENGINE_CWD_BEFORE_BUILD and POINT0_ENGINE_CWD_AFTER_BUILD and engineFile if itWasBuilt is true and cwdBeforeBuild and cwdAfterBuild are not provided`,
          )
        }
        const CWD_AFTER_BUILD_CURRENT = nodePath.dirname(engineFile)
        if (!CWD_AFTER_BUILD_CURRENT.endsWith(POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED)) {
          throw new Error(
            `POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED "${POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED}" is not a subdirectory of CWD_AFTER_BUILD_CURRENT "${CWD_AFTER_BUILD_CURRENT}"`,
          )
        }
        const localDir = CWD_AFTER_BUILD_CURRENT.replace(new RegExp(`${POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED}$`), '')
        generalOptions.cwdBeforeBuild = nodePath.join(localDir, POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED)
        generalOptions.cwdAfterBuild = nodePath.join(localDir, POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED)
      }
    }

    if (!generalOptions.cwdBeforeBuild && !generalOptions.cwdAfterBuild) {
      return { cwdAfterBuild: process.cwd(), cwdBeforeBuild: process.cwd(), cwd: process.cwd() }
    }
    if (!generalOptions.cwdAfterBuild || !generalOptions.cwdBeforeBuild) {
      throw new Error(`You should provide both cwdAfterBuild and cwdBeforeBuild, or non of them`)
    }
    if (itWasBuilt) {
      if (!nodePath.isAbsolute(generalOptions.cwdAfterBuild)) {
        throw new Error(
          `cwdAfterBuild "${generalOptions.cwdAfterBuild}" is not absolute, but should be, when itWasBuilt is true`,
        )
      }
      const cwdBeforeBuild = toAbsPath(generalOptions.cwdAfterBuild, generalOptions.cwdBeforeBuild)
      const cwdAfterBuild = generalOptions.cwdAfterBuild
      const cwd = cwdAfterBuild
      return { cwdAfterBuild, cwdBeforeBuild, cwd }
    }
    if (!nodePath.isAbsolute(generalOptions.cwdBeforeBuild)) {
      throw new Error(
        `cwdBeforeBuild "${generalOptions.cwdBeforeBuild}" is not absolute, but should be, when itWasBuilt is false`,
      )
    }
    const cwdBeforeBuild = generalOptions.cwdBeforeBuild
    const cwdAfterBuild = toAbsPath(generalOptions.cwdBeforeBuild, generalOptions.cwdAfterBuild)
    const cwd = cwdBeforeBuild
    return { cwdAfterBuild, cwdBeforeBuild, cwd }
  })()
  const ssr = generalOptions.ssr
  const compiler =
    generalOptions.compiler === undefined
      ? null
      : generalOptions.compiler === false
        ? false
        : generalOptions.compiler === true
          ? true
          : {
              ...(generalOptions.compiler.cache !== undefined ? { cache: generalOptions.compiler.cache } : {}),
              ...(generalOptions.compiler.consts ? { consts: generalOptions.compiler.consts } : {}),
              ...(generalOptions.compiler.filter ? { filter: generalOptions.compiler.filter } : {}),
              ...(generalOptions.compiler.mode !== undefined ? { mode: generalOptions.compiler.mode } : {}),
              ...(generalOptions.compiler.runtime !== undefined ? { runtime: generalOptions.compiler.runtime } : {}),
              ...(generalOptions.compiler.os !== undefined ? { os: generalOptions.compiler.os } : {}),
              ...(generalOptions.compiler.scope !== undefined ? { scope: generalOptions.compiler.scope } : {}),
              ...(generalOptions.compiler.side !== undefined ? { side: generalOptions.compiler.side } : {}),
              ...(generalOptions.compiler.ssr !== undefined
                ? { ssr: generalOptions.compiler.ssr }
                : ssr !== undefined
                  ? { ssr }
                  : {}),
            }
  const providedGenerate = generalOptions.generate
  const scopes = [
    ...new Set([serverOptions.scope, clientsOptions?.map((client) => client.scope)].filter(Boolean)),
  ] as string[]
  const generate = !providedGenerate
    ? []
    : Array.isArray(providedGenerate)
      ? providedGenerate
      : FilesGenerator.simpleGeneralConfigToTasks({
          config: providedGenerate,
          scopes,
          engine: {
            file: engineFile,
            server: { scope: serverOptions.scope },
            clients: clientsOptions?.map((client) => ({ scope: client.scope })),
          },
        })
  const result = {
    log: generalOptions.log ?? _defaultLogFn,
    itWasBuilt,
    cwdAfterBuild,
    cwdBeforeBuild,
    engineFile,
    cwd,
    autoFixBuiltPaths: generalOptions.autoFixBuiltPaths ?? true,
    banner: generalOptions.banner ?? null,
    compiler,
    generate,
  }
  return {
    ...result,
    bunBuildConfig: generalOptions.bunBuildConfig ?? null,
    bunPlugins: generalOptions.bunPlugins ?? [],
    viteConfig:
      typeof generalOptions.viteConfig === 'string'
        ? toFinalPath({
            ...result,
            relPathAfterBuild: null,
            cwdIfWasBuilt: null,
            path: generalOptions.viteConfig,
          })
        : (generalOptions.viteConfig ?? null),
    clientsOutdir: toFinalPath({
      ...result,
      cwdIfWasBuilt: null,
      path: generalOptions.clientsOutdir,
    }),
    pointsGlob: (!generalOptions.pointsGlob
      ? []
      : Array.isArray(generalOptions.pointsGlob)
        ? generalOptions.pointsGlob
        : [generalOptions.pointsGlob]
    ).map((g) => toAbsPath(cwd, g, true)),
    buildWatchGlob: (!generalOptions.buildWatchGlob
      ? []
      : Array.isArray(generalOptions.buildWatchGlob)
        ? generalOptions.buildWatchGlob
        : [generalOptions.buildWatchGlob]
    ).map((g) => toAbsPath(cwd, g, true)),
    ssr,
  }
}

const toFinalPath = <T extends string | null | undefined>({
  autoFixBuiltPaths,
  itWasBuilt,
  cwdAfterBuild,
  cwdBeforeBuild,
  cwdIfWasBuilt,
  path,
  relPathAfterBuild,
  omitDirAfterBuild,
}: {
  autoFixBuiltPaths: boolean
  itWasBuilt: boolean
  cwdAfterBuild: string
  cwdBeforeBuild: string
  cwdIfWasBuilt: string | null | undefined
  path: T
  relPathAfterBuild?: string | null
  omitDirAfterBuild?: boolean
}): T extends null | undefined ? null : T => {
  if (!path) {
    return (path ?? null) as T extends null | undefined ? null : T
  }

  if (!path.startsWith('.')) {
    return path as T extends null | undefined ? null : T
  }

  const pathBeforeBuildAbs = nodePath.resolve(cwdBeforeBuild, path)

  if (!itWasBuilt) {
    return pathBeforeBuildAbs as T extends null | undefined ? null : T
  }
  if (!autoFixBuiltPaths) {
    return toAbsPath(cwdAfterBuild, path) as T extends null | undefined ? null : T
  }

  if (relPathAfterBuild === null) {
    return null as T extends null | undefined ? null : T
  }

  const cwdAfterBuildFinal = cwdIfWasBuilt ? nodePath.resolve(cwdBeforeBuild, cwdIfWasBuilt) : cwdBeforeBuild

  if (relPathAfterBuild) {
    const fixedPath = nodePath.resolve(cwdAfterBuildFinal, toJsExtension(relPathAfterBuild))
    return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
  }

  if (omitDirAfterBuild && !nodePath.isAbsolute(path)) {
    const fixedPath = toJsExtension(nodePath.basename(path))
    return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
  }

  const fixedPath = toJsExtension(path)
  return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
}

// const toFinalDistPath = <T extends string | null | undefined>({
//   autoFixBuiltPaths,
//   cwdAfterBuild,
//   cwdBeforeBuild,
//   cwdIfWasBuilt,
//   path,
//   relPathAfterBuild,
//   omitDirAfterBuild,
// }: {
//   autoFixBuiltPaths: boolean
//   cwdAfterBuild: string
//   cwdBeforeBuild: string
//   cwdIfWasBuilt: string | null | undefined
//   path: T
//   relPathAfterBuild?: string | null
//   omitDirAfterBuild?: boolean
// }): T extends null | undefined ? null : T => {
//   if (!path) {
//     return (path ?? null) as T extends null | undefined ? null : T
//   }

//   if (!autoFixBuiltPaths) {
//     return toAbsPath(cwdAfterBuild, path) as T extends null | undefined ? null : T
//   }

//   if (relPathAfterBuild === null) {
//     return null as T extends null | undefined ? null : T
//   }

//   const cwdAfterBuildFinal = cwdIfWasBuilt ? nodePath.resolve(cwdBeforeBuild, cwdIfWasBuilt) : cwdBeforeBuild

//   if (relPathAfterBuild) {
//     const fixedPath = nodePath.resolve(cwdAfterBuildFinal, toJsExtension(relPathAfterBuild))
//     return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
//   }

//   if (omitDirAfterBuild && !nodePath.isAbsolute(path)) {
//     const fixedPath = toJsExtension(nodePath.basename(path))
//     return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
//   }

//   const fixedPath = toJsExtension(path)
//   return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
// }

export const parseEngineServerOptions = ({
  serverOptions,
  generalOptionsParsed,
}: {
  serverOptions: EngineServerOptions
  clientsOptions: EngineClientOptions[]
  generalOptionsParsed: EngineGeneralOptionsParsed
}): EngineServerOptionsParsed => {
  const port = typeof serverOptions.port !== 'undefined' ? Number(serverOptions.port) : 3000
  const hmrPort =
    serverOptions.hmrPort === false
      ? false
      : typeof serverOptions.hmrPort !== 'undefined' && serverOptions.hmrPort !== true
        ? Number(serverOptions.hmrPort)
        : port + 100
  const entriesRecordInput =
    typeof serverOptions.entry === 'string' ? { main: serverOptions.entry } : serverOptions.entry
  const outdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: serverOptions.outdir,
  })
  const publicdirOutdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: serverOptions.publicdir?.outdir,
  })
  const publicdirSource: PublicdirDefinition =
    !generalOptionsParsed.autoFixBuiltPaths || !generalOptionsParsed.itWasBuilt
      ? parsePublicdir(serverOptions.publicdir?.source ?? [], generalOptionsParsed.cwd)
      : publicdirOutdir && serverOptions.publicdir?.source
        ? [['/', publicdirOutdir]]
        : []
  const publicdir = publicdirOutdir ? { source: publicdirSource, outdir: publicdirOutdir } : null
  const publicdirCacheLimitInput = serverOptions.publicdir?.cacheLimit
  const publicdirCacheLimit =
    publicdirCacheLimitInput === false || publicdirCacheLimitInput === 0
      ? 0
      : publicdirCacheLimitInput === true || typeof publicdirCacheLimitInput === 'undefined'
        ? true
        : Math.max(0, Math.floor(publicdirCacheLimitInput))
  const entriesRecord = entriesRecordInput
    ? Object.fromEntries(
        Object.entries(entriesRecordInput).map(([key, value]) => [
          key,
          toFinalPath({ ...generalOptionsParsed, cwdIfWasBuilt: outdir, path: value, omitDirAfterBuild: true }),
        ]),
      )
    : null
  const generalOptionsParsedCompilerRecord =
    typeof generalOptionsParsed.compiler === 'object' && generalOptionsParsed.compiler !== null
      ? generalOptionsParsed.compiler
      : {}
  const serverOptionsCompilerRecord = typeof serverOptions.compiler === 'object' ? serverOptions.compiler : {}
  const ssr =
    typeof serverOptions.ssr !== 'undefined'
      ? serverOptions.ssr
      : generalOptionsParsed.ssr !== undefined
        ? generalOptionsParsed.ssr
        : false
  const mergedCompilerRecord = {
    side: true,
    scope: true,
    mode: true,
    filter: undefined,
    ...generalOptionsParsedCompilerRecord,
    ...serverOptionsCompilerRecord,
    runtime:
      generalOptionsParsedCompilerRecord.runtime === false ? false : (serverOptionsCompilerRecord.runtime ?? false),
    cache: serverOptionsCompilerRecord.cache ?? generalOptionsParsedCompilerRecord.cache ?? true,
    os: generalOptionsParsedCompilerRecord.os === false ? false : (serverOptionsCompilerRecord.os ?? false),
    consts: [
      ...(generalOptionsParsedCompilerRecord.consts
        ? Array.isArray(generalOptionsParsedCompilerRecord.consts)
          ? generalOptionsParsedCompilerRecord.consts
          : [generalOptionsParsedCompilerRecord.consts]
        : []),
      ...(serverOptionsCompilerRecord.consts
        ? Array.isArray(serverOptionsCompilerRecord.consts)
          ? serverOptionsCompilerRecord.consts
          : [serverOptionsCompilerRecord.consts]
        : []),
    ],
    ssr:
      serverOptionsCompilerRecord.ssr !== undefined
        ? serverOptionsCompilerRecord.ssr
        : generalOptionsParsedCompilerRecord.ssr !== undefined
          ? generalOptionsParsedCompilerRecord.ssr
          : ssr,
    importer:
      serverOptionsCompilerRecord.importer !== undefined
        ? {
            ...serverOptionsCompilerRecord.importer,
            cwd: serverOptionsCompilerRecord.importer.cwd ?? generalOptionsParsed.cwd,
          }
        : serverOptions.importer !== undefined
          ? {
              ...serverOptions.importer,
              cwd: serverOptions.importer.cwd ?? generalOptionsParsed.cwd,
            }
          : {
              cwd: generalOptionsParsed.cwd,
            },
  } satisfies EngineOptionsCompilerSpecificParsed
  const compiler =
    serverOptions.compiler === false
      ? (false as const)
      : serverOptions.compiler === true
        ? {
            side: true,
            scope: true,
            mode: true,
            runtime: false as const,
            os: false as const,
            consts: mergedCompilerRecord.consts,
            filter: mergedCompilerRecord.filter,
            ssr: mergedCompilerRecord.ssr,
            importer: mergedCompilerRecord.importer,
            cache: mergedCompilerRecord.cache,
          }
        : serverOptions.compiler !== undefined
          ? mergedCompilerRecord
          : generalOptionsParsed.compiler === false
            ? false
            : mergedCompilerRecord
  if (compiler) {
    compiler.consts = [...normalizeEnvConsts(compiler.consts), ...normalizeEnvConsts(serverOptions.env?.consts ?? {})]
  }
  const providedGenerate = serverOptions.generate
  const generate = !providedGenerate
    ? []
    : Array.isArray(providedGenerate)
      ? providedGenerate
      : FilesGenerator.simpleServerConfigToTasks({ config: providedGenerate, scope: serverOptions.scope })
  const devWatchGlob = (
    !serverOptions.devWatchGlob
      ? []
      : Array.isArray(serverOptions.devWatchGlob)
        ? serverOptions.devWatchGlob
        : [serverOptions.devWatchGlob]
  ).map((g) => toAbsPath(generalOptionsParsed.cwd, g, true))
  return {
    scope: serverOptions.scope,
    pointsProvided: serverOptions.points ?? [Point0.lets('root', serverOptions.scope).root()],
    port,
    hmrPort,
    outdir,
    entry: entriesRecord,
    publicdir: publicdir ? { ...publicdir, cacheLimit: publicdirCacheLimit } : null,
    engineFile: generalOptionsParsed.engineFile,
    cwdBeforeBuild: generalOptionsParsed.cwdBeforeBuild,
    itWasBuilt: generalOptionsParsed.itWasBuilt,
    bunBuildConfig: serverOptions.bunBuildConfig ?? {},
    bunPlugins: serverOptions.bunPlugins ?? [],
    bunServeConfig: serverOptions.bunServeConfig ?? null,
    compiler,
    envVars: parseEnv(serverOptions.env?.vars ?? {}),
    envConsts: parseEnv(serverOptions.env?.consts ?? {}),
    routesProvided: serverOptions.routes ?? null,
    generate,
    banner: serverOptions.banner ?? null,
    viteConfig:
      typeof serverOptions.viteConfig === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            relPathAfterBuild: null,
            cwdIfWasBuilt: null,
            path: serverOptions.viteConfig,
          })
        : (serverOptions.viteConfig ?? generalOptionsParsed.viteConfig ?? null),
    ssr,
    devWatchGlob,
  }
}
const parseEngineClientOptions = ({
  index,
  clientOptions,
  serverOptionsParsed,
  generalOptionsParsed,
}: {
  index: number
  clientOptions: EngineClientOptions
  serverOptionsParsed: EngineServerOptionsParsed
  generalOptionsParsed: EngineGeneralOptionsParsed
}): EngineClientOptionsParsed => {
  const port =
    typeof clientOptions.port !== 'undefined' ? Number(clientOptions.port) : serverOptionsParsed.port + index + 1
  const hmrPort =
    clientOptions.hmrPort === false
      ? false
      : typeof clientOptions.hmrPort !== 'undefined' && clientOptions.hmrPort !== true
        ? Number(clientOptions.hmrPort)
        : port + 100
  const outdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: clientOptions.outdir ?? null,
  })
  const publicdirOutdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: clientOptions.publicdir?.outdir,
  })
  const publicdirSource: PublicdirDefinition =
    !generalOptionsParsed.autoFixBuiltPaths || !generalOptionsParsed.itWasBuilt
      ? parsePublicdir(clientOptions.publicdir?.source ?? [], generalOptionsParsed.cwd)
      : publicdirOutdir && clientOptions.publicdir?.source
        ? [['/', publicdirOutdir]]
        : []
  const publicdirCacheLimitInput = clientOptions.publicdir?.cacheLimit
  const publicdirCacheLimit =
    publicdirCacheLimitInput === false || publicdirCacheLimitInput === 0
      ? 0
      : publicdirCacheLimitInput === true || typeof publicdirCacheLimitInput === 'undefined'
        ? true
        : Math.max(0, Math.floor(publicdirCacheLimitInput))
  const publicdir = publicdirOutdir
    ? { source: publicdirSource, outdir: publicdirOutdir, cacheLimit: publicdirCacheLimit }
    : null
  const generalOptionsParsedCompilerRecord =
    typeof generalOptionsParsed.compiler === 'object' && generalOptionsParsed.compiler !== null
      ? generalOptionsParsed.compiler
      : {}
  const clientOptionsCompilerRecord = typeof clientOptions.compiler === 'object' ? clientOptions.compiler : {}
  const ssr =
    typeof clientOptions.ssr !== 'undefined'
      ? clientOptions.ssr
      : generalOptionsParsed.ssr !== undefined
        ? generalOptionsParsed.ssr
        : false
  const mergedCompilerRecord = {
    side: true,
    scope: true,
    mode: true,
    filter: undefined,
    ...generalOptionsParsedCompilerRecord,
    ...clientOptionsCompilerRecord,
    runtime:
      generalOptionsParsedCompilerRecord.runtime === false ? false : (clientOptionsCompilerRecord.runtime ?? false),
    os: generalOptionsParsedCompilerRecord.os === false ? false : (clientOptionsCompilerRecord.os ?? false),
    cache: clientOptionsCompilerRecord.cache ?? generalOptionsParsedCompilerRecord.cache ?? true,
    consts: [
      ...(generalOptionsParsedCompilerRecord.consts
        ? Array.isArray(generalOptionsParsedCompilerRecord.consts)
          ? generalOptionsParsedCompilerRecord.consts
          : [generalOptionsParsedCompilerRecord.consts]
        : []),
      ...(clientOptionsCompilerRecord.consts
        ? Array.isArray(clientOptionsCompilerRecord.consts)
          ? clientOptionsCompilerRecord.consts
          : [clientOptionsCompilerRecord.consts]
        : []),
    ],
    ssr:
      clientOptionsCompilerRecord.ssr !== undefined
        ? clientOptionsCompilerRecord.ssr
        : generalOptionsParsedCompilerRecord.ssr !== undefined
          ? generalOptionsParsedCompilerRecord.ssr
          : ssr,
    importer:
      clientOptionsCompilerRecord.importer !== undefined
        ? {
            ...clientOptionsCompilerRecord.importer,
            cwd: clientOptionsCompilerRecord.importer.cwd ?? generalOptionsParsed.cwd,
          }
        : clientOptions.importer !== undefined
          ? {
              ...clientOptions.importer,
              cwd: clientOptions.importer.cwd ?? generalOptionsParsed.cwd,
            }
          : {
              cwd: generalOptionsParsed.cwd,
            },
  } satisfies EngineOptionsCompilerSpecificParsed
  const compiler =
    clientOptions.compiler === false
      ? false
      : clientOptions.compiler === true
        ? {
            side: true,
            scope: true,
            mode: true,
            runtime: false as const,
            os: false as const,
            consts: mergedCompilerRecord.consts,
            filter: mergedCompilerRecord.filter,
            ssr: mergedCompilerRecord.ssr,
            importer: mergedCompilerRecord.importer,
            cache: mergedCompilerRecord.cache,
          }
        : clientOptions.compiler !== undefined
          ? mergedCompilerRecord
          : generalOptionsParsed.compiler === false
            ? false
            : mergedCompilerRecord
  if (compiler) {
    compiler.consts = [...normalizeEnvConsts(compiler.consts), ...normalizeEnvConsts(clientOptions.env?.consts ?? {})]
  }
  const providedGenerate = clientOptions.generate
  const generate = !providedGenerate
    ? []
    : Array.isArray(providedGenerate)
      ? providedGenerate
      : FilesGenerator.simpleClientConfigToTasks({ config: providedGenerate, scope: clientOptions.scope })
  throwOnEmptyStringOrAsteriskEnv(clientOptions.env?.vars ?? {}, 'client env vars config')
  throwOnEmptyStringOrAsteriskEnv(clientOptions.env?.consts ?? {}, 'client env consts config')
  return {
    scope: clientOptions.scope,
    compiler,
    pointsProvided: clientOptions.points ?? null,
    serving: clientOptions.serving ?? true,
    routesProvided: clientOptions.routes ?? null,
    generate,
    banner: clientOptions.banner ?? null,
    // pointsDistFile:
    //   typeof clientOptions.points === 'string'
    //     ? toFinalDistPath({
    //         ...generalOptionsParsed,
    //         cwdIfWasBuilt: serverOutdir,
    //         relPathAfterBuild: clientOptions.viteConfig ? './points.js' : undefined,
    //         path: clientOptions.points,
    //         omitDirAfterBuild: true,
    //       })
    //     : null,
    appProvided: clientOptions.app ?? null,
    // appDistFile:
    //   typeof clientOptions.app === 'string'
    //     ? toFinalDistPath({
    //         ...generalOptionsParsed,
    //         cwdIfWasBuilt: serverOutdir,
    //         relPathAfterBuild: clientOptions.viteConfig ? './app.js' : undefined,
    //         path: clientOptions.app,
    //         omitDirAfterBuild: true,
    //       })
    //     : null,
    domRootElementId: clientOptions.domRootElementId || 'root',
    port,
    hmrPort,
    index,
    envVars: parseEnv(clientOptions.env?.vars ?? {}),
    envConsts: parseEnv(clientOptions.env?.consts ?? {}),
    viteConfig:
      typeof clientOptions.viteConfig === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            relPathAfterBuild: null,
            cwdIfWasBuilt: null,
            path: clientOptions.viteConfig,
          })
        : (clientOptions.viteConfig ?? generalOptionsParsed.viteConfig ?? null),
    outdir,
    indexHtml: toFinalPath({
      ...generalOptionsParsed,
      cwdIfWasBuilt: outdir,
      relPathAfterBuild: clientOptions.indexHtml ? nodePath.basename(clientOptions.indexHtml) : undefined,
      path: clientOptions.indexHtml,
    }),
    // indexHtmlDistFile: toFinalDistPath({
    //   ...generalOptionsParsed,
    //   cwdIfWasBuilt: outdir,
    //   relPathAfterBuild: './index.html',
    //   path: clientOptions.indexHtml,
    // }),
    publicdir,
    bunBuildConfig: clientOptions.bunBuildConfig ?? {},
    bunPlugins: clientOptions.bunPlugins ?? [],
    engineFile: generalOptionsParsed.engineFile,
    ssr,
  }
}

export const parseEngineOptions = (options: EngineOptions<any, any>): EngineOptionsParsed => {
  const {
    server: serverOptions = { scope: 'root', ssr: false },
    client: clientOptionShorthand,
    clients: clientsOptionsRaw,
    ...generalOptions
  } = options
  const clientsOptions = [...(clientOptionShorthand ? [clientOptionShorthand] : []), ...(clientsOptionsRaw ?? [])]
  const generalOptionsParsed = parseEngineGeneralOptions({
    generalOptions,
    serverOptions,
    clientsOptions,
  })
  const serverOptionsParsed = parseEngineServerOptions({
    serverOptions,
    clientsOptions,
    generalOptionsParsed,
  })
  const clientsOptionsParsed = clientsOptions.map((clientOptions, index) =>
    parseEngineClientOptions({
      index,
      clientOptions,
      serverOptionsParsed,
      generalOptionsParsed,
    }),
  )
  const routes = {
    [serverOptionsParsed.scope]: serverOptionsParsed.routesProvided,
    ...Object.fromEntries(
      clientsOptionsParsed.map((clientOptions) => [clientOptions.scope, clientOptions.routesProvided]),
    ),
  } satisfies Record<string, EngineOptionsRoutes | null>
  return {
    general: generalOptionsParsed,
    server: serverOptionsParsed,
    clients: clientsOptionsParsed,
    routes,
  }
}

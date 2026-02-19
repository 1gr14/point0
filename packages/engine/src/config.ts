import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RoutesPretty } from '@devp0nt/route0'
import type {
  AppComponent,
  AppComponentModule,
  EnvOsName,
  EnvRuntimeName,
  NormalizedNodeEnv,
  PointsDefinitionSource,
  PointsScope,
  RequiredCtx,
} from '@point0/core'
import { prependAndDeappendSlash } from '@point0/core'
import { minimatch } from 'minimatch'
import { type CompilerEnvConsts, normalizeEnvConsts } from '../../compiler/dist/utils.js'
import type { FilesGeneratorTaskMeta, FilesGeneratorTaskPoints, FilesGeneratorTaskRoutes } from './generator.js'
import type { PublicdirDefinition } from './publicdir.js'
import type {
  BunBuildConfigDefinition,
  BunPluginsDefinition,
  EngineClientBuildConfigDefinition,
  EngineClientPluginsDefinition,
  EngineServerBuildConfigDefinition,
  EngineServerPluginsDefinition,
} from './utils.js'
import { toAbsPath, toJsExtension } from './utils.js'

// TODO:ASAP transform to class
// TODO:ASAP allow predefined config mutable, which can be pased to Engine.create or in EngineOptions
// TODO:ASAP add tests

export type EngineLogger = {
  info: (message: string, meta?: Record<string, any>) => void

  error: (error: unknown, meta?: Record<string, any>) => void

  warn: (message: string, meta?: Record<string, any>) => void

  debug: (message: string, meta?: Record<string, any>) => void
}

export type EngineOptionsPublicdir =
  | string
  | Record<string, string | Response | (() => Response | Promise<Response>)>
  | Array<
      | string
      | Record<string, string | Response | (() => Response | Promise<Response>)>
      | [string, string | Response | (() => Response | Promise<Response>)]
    >
export type EngineOptionsPublicdirParsed = Array<[string, string | Response | (() => Response | Promise<Response>)]>

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

export type EngineOptionsCompilerGeneral = {
  side?: boolean
  scope?: boolean
  mode?: boolean
  runtime?: boolean
  os?: boolean
  consts?: CompilerEnvConsts
  filter?: RegExp
}
export type EngineOptionsCompilerGeneralParsed = {
  side: boolean
  scope: boolean
  consts: CompilerEnvConsts | undefined
  mode: boolean
  runtime: boolean
  os: boolean
  filter: RegExp | undefined
}
export type EngineOptionsCompilerSpecific = {
  side?: boolean
  scope?: boolean
  mode?: boolean
  runtime?: EnvRuntimeName | false
  os?: EnvOsName | false
  consts?: CompilerEnvConsts
  filter?: RegExp
}
export type EngineOptionsCompilerSpecificParsed = {
  side: boolean
  scope: boolean
  consts: CompilerEnvConsts | undefined
  mode: boolean
  runtime: EnvRuntimeName | false
  os: EnvOsName | false
  filter: RegExp | undefined
}

export type PortPolicy = 'kill' | 'auto' | 'simple'

export type EngineGeneralOptions = {
  file: string
  generte?: Array<Omit<FilesGeneratorTaskMeta, 'scopes'>>
  logger?: EngineLogger
  portPolicy?: PortPolicy
  serveRetries?: number
  itWasBuilt?: boolean
  cwdAfterBuild?: string
  cwdBeforeBuild?: string
  autoFixBuiltPaths?: boolean
  clientsOutdir?: string
  pointsGlob?: string | string[]
  buildWatchGlob?: string | string[]
  banner?: string
  bunBuildConfig?: BunBuildConfigDefinition
  bunPlugins?: BunPluginsDefinition
  viteConfig?: EngineOptionsViteConfig
  compiler?: EngineOptionsCompilerGeneral | boolean
}

export type EngineServerOptions<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  scope: PointsScope
  points?: PointsDefinitionSource<TRequiredCtx>
  generate?: Array<Omit<FilesGeneratorTaskPoints, 'scope' | 'side'> | Omit<FilesGeneratorTaskRoutes, 'scope' | 'side'>>
  publicdir?: {
    source: EngineOptionsPublicdir
    outdir: string
  }
  env?: { vars?: EngineOptionsEnvStrict; consts?: EngineOptionsEnvWide }
  port?: number | string
  outdir?: string
  entry?: string | Record<string, string>
  bunBuildConfig?: EngineServerBuildConfigDefinition
  bunPlugins?: EngineServerPluginsDefinition
  viteConfig?: EngineOptionsViteConfig
  compiler?: EngineOptionsCompilerSpecific | boolean
  routes?: EngineOptionsRoutes
  banner?: string
  hmrPort?: number | string | boolean
  portPolicy?: PortPolicy
  serveRetries?: number
}

export type EngineClientOptions<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  scope: PointsScope
  // TODO: allow empty points
  // TODO: allow points collection
  points?: PointsDefinitionSource<TRequiredCtx>
  generate?: Array<Omit<FilesGeneratorTaskPoints, 'scope' | 'side'> | Omit<FilesGeneratorTaskRoutes, 'scope' | 'side'>>
  app?: EngineOptionsAppComponent
  publicdir?: {
    source: EngineOptionsPublicdir
    outdir: string
  }
  indexHtml?: string
  domRootElementId?: string
  env?: { vars?: EngineOptionsEnvWide; consts?: EngineOptionsEnvWide }
  port?: number | string
  hmrPort?: number | string | boolean
  portPolicy?: PortPolicy
  serveRetries?: number
  bunBuildConfig?: EngineClientBuildConfigDefinition
  bunPlugins?: EngineClientPluginsDefinition
  viteConfig?: EngineOptionsViteConfig
  compiler?: EngineOptionsCompilerSpecific | boolean
  outdir?: string
  routes?: EngineOptionsRoutes
  banner?: string
}
export type EngineOptions<
  TServer1 extends RequiredCtx = RequiredCtx,
  TClient1 extends RequiredCtx = RequiredCtx,
  TClient2 extends RequiredCtx = RequiredCtx,
  TClient3 extends RequiredCtx = RequiredCtx,
> = EngineGeneralOptions & {
  server: EngineServerOptions<TServer1>
  clients?:
    | []
    | [EngineClientOptions<TClient1>]
    | [EngineClientOptions<TClient1>, EngineClientOptions<TClient2>]
    | [EngineClientOptions<TClient1>, EngineClientOptions<TClient2>, EngineClientOptions<TClient3>]
}

// type IsUnknown<T> = unknown extends T ? ([T] extends [unknown] ? true : false) : false

// type UnknownToUndefined<T> = IsUnknown<T> extends true ? undefined : T

// type UndefinedToUnknown<T extends RequiredCtx | UndefinedCtx> = T extends UndefinedCtx ? unknown : T

// type MergeRequiredCtx<
//   T1 extends RequiredCtx | UndefinedCtx,
//   T2 extends RequiredCtx | UndefinedCtx,
//   T3 extends RequiredCtx | UndefinedCtx,
//   T4 extends RequiredCtx | UndefinedCtx,
// > = UnknownToUndefined<
//   UndefinedToUnknown<T1> & UndefinedToUnknown<T2> & UndefinedToUnknown<T3> & UndefinedToUnknown<T4>
// >

// export type RequiredCtxByEngineOptions<TOptions extends EngineOptions> = TOptions extends {
//   server: EngineServerOptions<infer TServer>
//   clients: []
// }
//   ? RequiredCtxByPointsDefinitionSourceOrUndefined<TServer>
//   : TOptions extends {
//         server: EngineServerOptions<infer TServer>
//         clients: [EngineClientOptions<infer TClient1>]
//       }
//     ? MergeRequiredCtx<
//         RequiredCtxByPointsDefinitionSourceOrUndefined<TServer>,
//         RequiredCtxByPointsDefinitionSourceOrUndefined<TClient1>,
//         undefined,
//         undefined
//       >
//     : TOptions extends {
//           server: EngineServerOptions<infer TServer>
//           clients: [EngineClientOptions<infer TClient1>, EngineClientOptions<infer TClient2>]
//         }
//       ? MergeRequiredCtx<
//           RequiredCtxByPointsDefinitionSourceOrUndefined<TServer>,
//           RequiredCtxByPointsDefinitionSourceOrUndefined<TClient1>,
//           RequiredCtxByPointsDefinitionSourceOrUndefined<TClient2>,
//           undefined
//         >
//       : TOptions extends {
//             server: EngineServerOptions<infer TServer>
//             clients: [
//               EngineClientOptions<infer TClient1>,
//               EngineClientOptions<infer TClient2>,
//               EngineClientOptions<infer TClient3>,
//             ]
//           }
//         ? MergeRequiredCtx<
//             RequiredCtxByPointsDefinitionSourceOrUndefined<TServer>,
//             RequiredCtxByPointsDefinitionSourceOrUndefined<TClient1>,
//             RequiredCtxByPointsDefinitionSourceOrUndefined<TClient2>,
//             RequiredCtxByPointsDefinitionSourceOrUndefined<TClient3>
//           >
//         : never

// export type EngineOptions<
//   TServerPointsModule extends AnyPointsModule = AnyPointsModule,
//   TClient1PointsModule extends AnyPointsModule = AnyPointsModule,
//   TClient2PointsModule extends AnyPointsModule = AnyPointsModule,
//   TClient3PointsModule extends AnyPointsModule = AnyPointsModule,
// > = EngineGeneralOptions & {
//   server: EngineServerOptions<TServerPointsModule>
//   clients?:
//     | []
//     | [EngineClientOptions<TClient1PointsModule>]
//     | [EngineClientOptions<TClient1PointsModule>, EngineClientOptions<TClient2PointsModule>]
//     | [
//         EngineClientOptions<TClient1PointsModule>,
//         EngineClientOptions<TClient2PointsModule>,
//         EngineClientOptions<TClient3PointsModule>,
//       ]
// }

// export type RequiredCtxByEngineOptions<TOptions extends EngineOptions> = TOptions extends {
//   server: EngineServerOptions<infer TServerPointsModule>
//   clients: []
// }
//   ? RequiredCtxByPointsModules<TServerPointsModule>
//   : TOptions extends {
//         server: EngineServerOptions<infer TServerPointsModule>
//         clients: [EngineClientOptions<infer TClient1PointsModule>]
//       }
//     ? RequiredCtxByPointsModules<TServerPointsModule, TClient1PointsModule>
//     : TOptions extends {
//           server: EngineServerOptions<infer TServerPointsModule>
//           clients: [EngineClientOptions<infer TClient1PointsModule>, EngineClientOptions<infer TClient2PointsModule>]
//         }
//       ? RequiredCtxByPointsModules<TServerPointsModule, TClient1PointsModule, TClient2PointsModule>
//       : TOptions extends {
//             server: EngineServerOptions<infer TServerPointsModule>
//             clients: [
//               EngineClientOptions<infer TClient1PointsModule>,
//               EngineClientOptions<infer TClient2PointsModule>,
//               EngineClientOptions<infer TClient3PointsModule>,
//             ]
//           }
//         ? RequiredCtxByPointsModules<
//             TServerPointsModule,
//             TClient1PointsModule,
//             TClient2PointsModule,
//             TClient3PointsModule
//           >
//         : never

// export type RequiredCtxByEngineShortOptions<TOptions extends EngineShortOptions> = TOptions extends {
//   server: infer TServerPointsDefinition extends RawPointsDefinition
//   clients: []
// }
//   ? RequiredCtxByPointsDefinitions<TServerPointsDefinition>
//   : TOptions extends {
//         server: infer TServerPointsDefinition extends RawPointsDefinition
//         clients: [infer TClient1PointsDefinition extends RawPointsDefinition]
//       }
//     ? RequiredCtxByPointsDefinitions<TServerPointsDefinition, TClient1PointsDefinition>
//     : TOptions extends {
//           server: infer TServerPointsDefinition extends RawPointsDefinition
//           clients: [
//             infer TClient1PointsDefinition extends RawPointsDefinition,
//             infer TClient2PointsDefinition extends RawPointsDefinition,
//           ]
//         }
//       ? RequiredCtxByPointsDefinitions<TServerPointsDefinition, TClient1PointsDefinition, TClient2PointsDefinition>
//       : TOptions extends {
//             server: infer TServerPointsDefinition extends RawPointsDefinition
//             clients: [
//               infer TClient1PointsDefinition extends RawPointsDefinition,
//               infer TClient2PointsDefinition extends RawPointsDefinition,
//               infer TClient3PointsDefinition extends RawPointsDefinition,
//             ]
//           }
//         ? RequiredCtxByPointsDefinitions<
//             TServerPointsDefinition,
//             TClient1PointsDefinition,
//             TClient2PointsDefinition,
//             TClient3PointsDefinition
//           >
//         : never

export type EngineGeneralOptionsParsed = {
  logger: EngineLogger
  itWasBuilt: boolean
  cwdAfterBuild: string
  cwdBeforeBuild: string
  engineFile: string
  cwd: string
  autoFixBuiltPaths: boolean
  clientsOutdir: string | null
  pointsGlob: string[]
  buildWatchGlob: string[]
  banner: string | null
  compiler: EngineOptionsCompilerGeneral | boolean | null
  viteConfig: EngineOptionsViteConfig | null
  bunBuildConfig: BunBuildConfigDefinition | null
  bunPlugins: BunPluginsDefinition | null
  portPolicy: PortPolicy | null
  serveRetries: number | null
}
export type EngineClientOptionsParsed = {
  scope: PointsScope
  engineFile: string
  pointsProvided: PointsDefinitionSource | null
  banner: string | null
  generate: Array<FilesGeneratorTaskPoints | FilesGeneratorTaskRoutes>
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
  } | null
  portPolicy: PortPolicy
  serveRetries: number
}
export type EngineServerOptionsParsed = {
  scope: PointsScope
  pointsProvided: PointsDefinitionSource | null
  banner: string | null
  generate: Array<FilesGeneratorTaskPoints | FilesGeneratorTaskRoutes>
  routesProvided: EngineOptionsRoutes | null
  port: number
  entry: Record<string, string> | null
  outdir: string | null
  envVars: EngineOptionsEnvParsed
  envConsts: EngineOptionsEnvParsed
  publicdir: {
    source: PublicdirDefinition
    outdir: string
  } | null
  engineFile: string
  cwdBeforeBuild: string
  itWasBuilt: boolean
  bunBuildConfig: EngineServerBuildConfigDefinition
  bunPlugins: EngineServerPluginsDefinition
  viteConfig: EngineOptionsViteConfig | null
  compiler: EngineOptionsCompilerSpecificParsed | false
  hmrPort: number | false
  portPolicy: PortPolicy
  serveRetries: number
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
}: {
  generalOptions: EngineGeneralOptions
  serverOptions: EngineServerOptions
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
      // first
      // if (engineFile) {
      //   generalOptions.cwdBeforeBuild ??= nodePath.dirname(engineFile)
      // }

      // second
      // generalOptions.cwdBeforeBuild ??= nodePath.dirname(engineFile)
      // now

      // now
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
  const compiler =
    generalOptions.compiler === undefined
      ? null
      : generalOptions.compiler === false
        ? false
        : generalOptions.compiler === true
          ? true
          : {
              ...(generalOptions.compiler.consts ? { consts: generalOptions.compiler.consts } : {}),
              ...(generalOptions.compiler.filter ? { filter: generalOptions.compiler.filter } : {}),
              ...(generalOptions.compiler.mode !== undefined ? { mode: generalOptions.compiler.mode } : {}),
              ...(generalOptions.compiler.runtime !== undefined ? { runtime: generalOptions.compiler.runtime } : {}),
              ...(generalOptions.compiler.os !== undefined ? { os: generalOptions.compiler.os } : {}),
              ...(generalOptions.compiler.scope !== undefined ? { scope: generalOptions.compiler.scope } : {}),
              ...(generalOptions.compiler.side !== undefined ? { side: generalOptions.compiler.side } : {}),
            }
  const result = {
    logger: generalOptions.logger || {
      info: console.info.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      debug: console.debug.bind(console),
    },
    itWasBuilt,
    cwdAfterBuild,
    cwdBeforeBuild,
    engineFile,
    cwd,
    autoFixBuiltPaths: generalOptions.autoFixBuiltPaths ?? true,
    banner: generalOptions.banner ?? null,
    compiler,
  }
  return {
    ...result,
    bunBuildConfig: generalOptions.bunBuildConfig ?? null,
    bunPlugins: generalOptions.bunPlugins ?? null,
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
    pointsGlob: !generalOptions.pointsGlob
      ? []
      : Array.isArray(generalOptions.pointsGlob)
        ? generalOptions.pointsGlob
        : [generalOptions.pointsGlob],
    buildWatchGlob: !generalOptions.buildWatchGlob
      ? []
      : Array.isArray(generalOptions.buildWatchGlob)
        ? generalOptions.buildWatchGlob
        : [generalOptions.buildWatchGlob],
    portPolicy: generalOptions.portPolicy ?? null,
    serveRetries: generalOptions.serveRetries ?? null,
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
  const mergedCompilerRecord = {
    side: true,
    scope: true,
    mode: true,
    filter: undefined,
    ...generalOptionsParsedCompilerRecord,
    ...serverOptionsCompilerRecord,
    runtime:
      generalOptionsParsedCompilerRecord.runtime === false ? false : (serverOptionsCompilerRecord.runtime ?? false),
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
          }
        : serverOptions.compiler !== undefined
          ? mergedCompilerRecord
          : generalOptionsParsed.compiler === false
            ? false
            : mergedCompilerRecord
  if (compiler) {
    compiler.consts = [...normalizeEnvConsts(compiler.consts), ...normalizeEnvConsts(serverOptions.env?.consts ?? {})]
  }
  return {
    scope: serverOptions.scope,
    pointsProvided: serverOptions.points ?? null,
    port,
    hmrPort,
    outdir,
    entry: entriesRecord,
    publicdir,
    engineFile: generalOptionsParsed.engineFile,
    cwdBeforeBuild: generalOptionsParsed.cwdBeforeBuild,
    itWasBuilt: generalOptionsParsed.itWasBuilt,
    bunBuildConfig: serverOptions.bunBuildConfig ?? {},
    bunPlugins: serverOptions.bunPlugins ?? [],
    compiler,
    envVars: parseEnv(serverOptions.env?.vars ?? {}),
    envConsts: parseEnv(serverOptions.env?.consts ?? {}),
    routesProvided: serverOptions.routes ?? null,
    generate: (serverOptions.generate ?? []).map((task) => ({
      ...task,
      scope: serverOptions.scope,
      side: 'server',
    })),
    banner: serverOptions.banner ?? null,
    portPolicy: serverOptions.portPolicy ?? generalOptionsParsed.portPolicy ?? 'simple',
    serveRetries: serverOptions.serveRetries ?? generalOptionsParsed.serveRetries ?? 0,
    viteConfig:
      typeof serverOptions.viteConfig === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            relPathAfterBuild: null,
            cwdIfWasBuilt: null,
            path: serverOptions.viteConfig,
          })
        : (serverOptions.viteConfig ?? generalOptionsParsed.viteConfig ?? null),
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
  const publicdir = publicdirOutdir ? { source: publicdirSource, outdir: publicdirOutdir } : null
  const generalOptionsParsedCompilerRecord =
    typeof generalOptionsParsed.compiler === 'object' && generalOptionsParsed.compiler !== null
      ? generalOptionsParsed.compiler
      : {}
  const clientOptionsCompilerRecord = typeof clientOptions.compiler === 'object' ? clientOptions.compiler : {}
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
          }
        : clientOptions.compiler !== undefined
          ? mergedCompilerRecord
          : generalOptionsParsed.compiler === false
            ? false
            : mergedCompilerRecord
  if (compiler) {
    compiler.consts = [...normalizeEnvConsts(compiler.consts), ...normalizeEnvConsts(clientOptions.env?.consts ?? {})]
  }
  return {
    scope: clientOptions.scope,
    compiler,
    pointsProvided: clientOptions.points ?? null,
    routesProvided: clientOptions.routes ?? null,
    generate: (clientOptions.generate ?? []).map((task) => ({
      ...task,
      scope: clientOptions.scope,
      side: 'client',
    })),
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
      relPathAfterBuild: './index.html',
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
    portPolicy: clientOptions.portPolicy ?? generalOptionsParsed.portPolicy ?? 'simple',
    serveRetries: clientOptions.serveRetries ?? generalOptionsParsed.serveRetries ?? 0,
  }
}

// const shortEngineOptionsToEngineOptions = (options: EngineShortOptions | EngineOptions): EngineOptions => {
//   if (Array.isArray(options.server)) {
//     const module = PointsManager.rawPointsDefinitionToReadyPointsModule(options.server)
//     const scope = module._root.point.point.scope
//     options.server = {
//       scope,
//       points: async () => module,
//     }
//   }
//   const clients = options.clients?.flatMap((client) => {
//     if (Array.isArray(client)) {
//       const module = PointsManager.rawPointsDefinitionToReadyPointsModule(client)
//       const scope = module._root.point.point.scope
//       return {
//         scope,
//         points: async () => module,
//       }
//     }
//     return client as EngineClientOptions
//   })
//   if (!options.server) {
//     const scope = clients?.at(0)?.scope
//     if (!scope) {
//       throw new Error('No scope found in clients and no server points provided')
//     }
//     options.server = { scope }
//   }
//   return {
//     ...options,
//     clients,
//   } as EngineOptions
// }

export const parseEngineOptions = (options: EngineOptions): EngineOptionsParsed => {
  const { server: serverOptions, clients: clientsOptionsRaw, ...generalOptions } = options
  // const clientsOptions = clientsOptionsRaw?.flatMap((clientOptions) => (clientOptions ? [clientOptions] : [])) ?? []
  const clientsOptions = clientsOptionsRaw ?? []
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

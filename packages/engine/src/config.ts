import type { RoutesPretty } from '@devp0nt/route0'
import type {
  AnyPointsModule,
  AppComponent,
  AppComponentModule,
  PointsScope,
  RequiredCtxByPointsModules,
} from '@point0/core'
import { appendSlash, prependAndDeappendSlash } from '@point0/core'
import { minimatch } from 'minimatch'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  BunBuildConfigDefinition,
  BunPluginsDefinition,
  ClientBunBuildConfigDefinition,
  ClientBunPluginsDefinition,
  ServerBunBuildConfigDefinition,
  ServerBunPluginsDefinition,
} from './utils.js'
import { toAbsPath, toJsExtension } from './utils.js'
import type { POINT0_NODE_ENV } from '@point0/env'
import type { CompilerEnvConsts } from '../../compiler/dist/utils.js'

export type EngineLogger = {
  info: (message: string, meta?: Record<string, any>) => any
  error: (error: unknown, meta?: Record<string, any>) => any
  warn: (message: string, meta?: Record<string, any>) => any
  debug: (message: string, meta?: Record<string, any>) => any
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

export type EngineOptionsEnv = string | Record<string, any> | Array<string | Record<string, any>>
export type EngineOptionsEnvParsed = Record<string, any>

export type ExtractedViteConfig = import('vite').UserConfig
export type ExtractViteConfigFn = (options: {
  command: 'serve' | 'build'
  target: 'client' | 'server'
  mode: POINT0_NODE_ENV
  scope: PointsScope
}) => Promise<ExtractedViteConfig> | ExtractedViteConfig
export type EngineOptionsViteConfig =
  | ExtractedViteConfig
  | ReturnType<typeof import('vite').defineConfig>
  | string
  | ExtractViteConfigFn

export type EngineOptionsAppComponent = () => Promise<AppComponent | AppComponentModule>
export type EngineOptionsPoints<TPointsModule extends AnyPointsModule = AnyPointsModule> = () => Promise<TPointsModule>
export type EngineOptionsRoutes = () => Promise<
  RoutesPretty<any> | { routes: RoutesPretty<any> } | { default: RoutesPretty<any> }
>

export type EngineOptionsCompiler = {
  target?: boolean
  scope?: boolean
  consts?: CompilerEnvConsts
  filter?: RegExp
}
export type EngineOptionsCompilerParsed = {
  target: boolean
  scope: boolean
  consts: CompilerEnvConsts | undefined
  filter: RegExp | undefined
}

export type EngineGeneralOptions = {
  file: string
  fallbackScope?: PointsScope
  logger?: EngineLogger
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
  compiler?: EngineOptionsCompiler | boolean
}
export type EngineServerOptions<TPointsModule extends AnyPointsModule = AnyPointsModule> = {
  scope: PointsScope
  points?: EngineOptionsPoints<TPointsModule>
  generatePointsLazy?: string
  generatePointsReady?: string
  publicdir?: EngineOptionsPublicdir
  port?: number | string
  outdir?: string
  entry?: string | Record<string, string>
  publicdirOutdir?: string
  bunBuildConfig?: ServerBunBuildConfigDefinition
  bunPlugins?: ServerBunPluginsDefinition
  viteConfig?: EngineOptionsViteConfig
  compiler?: EngineOptionsCompiler | boolean
  routes?: EngineOptionsRoutes
  generateRoutes?: string
  banner?: string
  hmrPort?: number | string | boolean
}
export type EngineClientOptions<TPointsModule extends AnyPointsModule = AnyPointsModule> = {
  scope: PointsScope
  // TODO: allow empty points
  // TODO: allow points collection
  points: EngineOptionsPoints<TPointsModule>
  generatePointsLazy?: string
  generatePointsReady?: string
  app?: EngineOptionsAppComponent
  baseurl?: string
  publicdir?: EngineOptionsPublicdir
  indexHtml?: string
  domRootElementId?: string
  env?: EngineOptionsEnv
  port?: number | string
  hmrPort?: number | string | boolean
  bunBuildConfig?: ClientBunBuildConfigDefinition
  bunPlugins?: ClientBunPluginsDefinition
  viteConfig?: EngineOptionsViteConfig
  compiler?: EngineOptionsCompiler | boolean
  outdir?: string
  publicdirOutdir?: string
  routes?: EngineOptionsRoutes
  generateRoutes?: string
  banner?: string
}
export type EngineOptions<
  TServerPointsModule extends AnyPointsModule = AnyPointsModule,
  TClient1PointsModule extends AnyPointsModule = AnyPointsModule,
  TClient2PointsModule extends AnyPointsModule = AnyPointsModule,
  TClient3PointsModule extends AnyPointsModule = AnyPointsModule,
> = EngineGeneralOptions & {
  server: EngineServerOptions<TServerPointsModule>
  clients?:
    | []
    | [EngineClientOptions<TClient1PointsModule>]
    | [EngineClientOptions<TClient1PointsModule>, EngineClientOptions<TClient2PointsModule>]
    | [
        EngineClientOptions<TClient1PointsModule>,
        EngineClientOptions<TClient2PointsModule>,
        EngineClientOptions<TClient3PointsModule>,
      ]
}

export type RequiredCtxByEngineOptions<TOptions extends EngineOptions> = TOptions extends {
  server: EngineServerOptions<infer TServerPointsModule>
  clients: []
}
  ? RequiredCtxByPointsModules<TServerPointsModule>
  : TOptions extends {
        server: EngineServerOptions<infer TServerPointsModule>
        clients: [EngineClientOptions<infer TClient1PointsModule>]
      }
    ? RequiredCtxByPointsModules<TServerPointsModule, TClient1PointsModule>
    : TOptions extends {
          server: EngineServerOptions<infer TServerPointsModule>
          clients: [EngineClientOptions<infer TClient1PointsModule>, EngineClientOptions<infer TClient2PointsModule>]
        }
      ? RequiredCtxByPointsModules<TServerPointsModule, TClient1PointsModule, TClient2PointsModule>
      : TOptions extends {
            server: EngineServerOptions<infer TServerPointsModule>
            clients: [
              EngineClientOptions<infer TClient1PointsModule>,
              EngineClientOptions<infer TClient2PointsModule>,
              EngineClientOptions<infer TClient3PointsModule>,
            ]
          }
        ? RequiredCtxByPointsModules<
            TServerPointsModule,
            TClient1PointsModule,
            TClient2PointsModule,
            TClient3PointsModule
          >
        : never

export type EngineGeneralOptionsParsed = {
  fallbackScope: PointsScope
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
  compiler: EngineOptionsCompiler | boolean | null
  bunBuildConfig: BunBuildConfigDefinition | null
  bunPlugins: BunPluginsDefinition | null
}
export type EngineClientOptionsParsed = {
  scope: PointsScope
  engineFile: string
  pointsProvided: EngineOptionsPoints
  generatePointsLazy: string | null
  generatePointsReady: string | null
  // pointsDistFile: string | null
  appProvided: EngineOptionsAppComponent | null
  // appDistFile: string | null
  baseurl: string
  publicdir: EngineOptionsPublicdirParsed
  indexHtml: string | null
  // indexHtmlDistFile: string | null
  env: EngineOptionsEnvParsed
  domRootElementId: string
  port: number
  hmrPort: number | false
  index: number
  outdir: string | null
  bunBuildConfig: ClientBunBuildConfigDefinition
  bunPlugins: ClientBunPluginsDefinition
  viteConfig: EngineOptionsViteConfig | null
  compiler: EngineOptionsCompilerParsed | false
  publicdirOutdir: string | null
  routesInstance: EngineOptionsRoutes | null
  routesFile: string | null
  banner: string | null
}
export type EngineServerOptionsParsed = {
  scope: PointsScope
  pointsProvided: EngineOptionsPoints | null
  generatePointsLazy: string | null
  generatePointsReady: string | null
  publicdir: EngineOptionsPublicdirParsed
  port: number
  entry: Record<string, string> | null
  outdir: string | null
  publicdirOutdir: string | null
  engineFile: string
  cwdBeforeBuild: string
  itWasBuilt: boolean
  fallbackScope: PointsScope
  bunBuildConfig: ServerBunBuildConfigDefinition
  bunPlugins: ServerBunPluginsDefinition
  viteConfig: EngineOptionsViteConfig | null
  compiler: EngineOptionsCompilerParsed | false
  routesInstance: EngineOptionsRoutes | null
  routesFile: string | null
  banner: string | null
  hmrPort: number | false
}
export type EngineOptionsParsed = {
  general: EngineGeneralOptionsParsed
  server: EngineServerOptionsParsed
  clients: EngineClientOptionsParsed[]
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

const parseEnv = (input: EngineOptionsEnv): EngineOptionsEnvParsed => {
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
  clientsOptions,
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
              ...(generalOptions.compiler.scope !== undefined ? { scope: generalOptions.compiler.scope } : {}),
              ...(generalOptions.compiler.target !== undefined ? { target: generalOptions.compiler.target } : {}),
            }
  const result = {
    fallbackScope: generalOptions.fallbackScope || clientsOptions?.at(0)?.scope || serverOptions.scope,
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
  clientsOptions,
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
    path: serverOptions.publicdirOutdir ?? (outdir && serverOptions.publicdir ? nodePath.join(outdir, 'public') : null),
  })
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
    ...generalOptionsParsedCompilerRecord,
    ...serverOptionsCompilerRecord,
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
  }
  const compiler =
    serverOptions.compiler === false
      ? false
      : serverOptions.compiler === true
        ? {
            target: true,
            scope: true,
            consts: undefined,
            filter: undefined,
          }
        : {
            target: true,
            scope: true,
            filter: undefined,
            ...mergedCompilerRecord,
          }
  return {
    scope: serverOptions.scope,
    pointsProvided: serverOptions.points ?? null,
    port,
    hmrPort,
    outdir,
    entry: entriesRecord,
    publicdir:
      !generalOptionsParsed.autoFixBuiltPaths || !generalOptionsParsed.itWasBuilt
        ? parsePublicdir(serverOptions.publicdir ?? [], generalOptionsParsed.cwd)
        : publicdirOutdir && serverOptions.publicdir
          ? [['/', publicdirOutdir]]
          : [],
    publicdirOutdir,
    engineFile: generalOptionsParsed.engineFile,
    cwdBeforeBuild: generalOptionsParsed.cwdBeforeBuild,
    itWasBuilt: generalOptionsParsed.itWasBuilt,
    fallbackScope: generalOptionsParsed.fallbackScope,
    bunBuildConfig: serverOptions.bunBuildConfig ?? {},
    bunPlugins: serverOptions.bunPlugins ?? [],
    compiler,
    routesInstance: serverOptions.routes ?? null,
    routesFile: serverOptions.generateRoutes ?? null,
    generatePointsLazy: serverOptions.generatePointsLazy ?? null,
    generatePointsReady: serverOptions.generatePointsReady ?? null,
    banner: serverOptions.banner ?? null,
    viteConfig:
      typeof serverOptions.viteConfig === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            relPathAfterBuild: null,
            cwdIfWasBuilt: null,
            path: serverOptions.viteConfig,
          })
        : (serverOptions.viteConfig ?? null),
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
    path: clientOptions.publicdirOutdir ?? (outdir && clientOptions.publicdir ? nodePath.join(outdir, 'public') : null),
  })
  const generalOptionsParsedCompilerRecord =
    typeof generalOptionsParsed.compiler === 'object' && generalOptionsParsed.compiler !== null
      ? generalOptionsParsed.compiler
      : {}
  const clientOptionsCompilerRecord = typeof clientOptions.compiler === 'object' ? clientOptions.compiler : {}
  const mergedCompilerRecord = {
    ...generalOptionsParsedCompilerRecord,
    ...clientOptionsCompilerRecord,
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
  }
  const compiler =
    clientOptions.compiler === false
      ? false
      : clientOptions.compiler === true
        ? {
            target: true,
            scope: true,
            consts: undefined,
            filter: undefined,
          }
        : {
            target: true,
            scope: true,
            filter: undefined,
            ...mergedCompilerRecord,
          }
  return {
    scope: clientOptions.scope,
    compiler,
    pointsProvided: clientOptions.points,
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
    baseurl: appendSlash(clientOptions.baseurl) ?? '/',
    domRootElementId: clientOptions.domRootElementId || 'root',
    port,
    hmrPort,
    index,
    env: parseEnv(clientOptions.env ?? {}),
    viteConfig:
      typeof clientOptions.viteConfig === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            relPathAfterBuild: null,
            cwdIfWasBuilt: null,
            path: clientOptions.viteConfig,
          })
        : (clientOptions.viteConfig ?? null),
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
    publicdir:
      !generalOptionsParsed.autoFixBuiltPaths || !generalOptionsParsed.itWasBuilt
        ? parsePublicdir(clientOptions.publicdir ?? [], generalOptionsParsed.cwd)
        : publicdirOutdir && clientOptions.publicdir
          ? [['/', publicdirOutdir]]
          : [],
    publicdirOutdir,
    bunBuildConfig: clientOptions.bunBuildConfig ?? {},
    bunPlugins: clientOptions.bunPlugins ?? [],
    routesInstance: clientOptions.routes ?? null,
    routesFile: clientOptions.generateRoutes ?? null,
    generatePointsLazy: clientOptions.generatePointsLazy ?? null,
    generatePointsReady: clientOptions.generatePointsReady ?? null,
    banner: clientOptions.banner ?? null,
    engineFile: generalOptionsParsed.engineFile,
  }
}
export const parseEngineOptions = (options: EngineOptions): EngineOptionsParsed => {
  const { server: serverOptions, clients: clientsOptionsRaw, ...generalOptions } = options
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const clientsOptions = clientsOptionsRaw?.flatMap((clientOptions) => (clientOptions ? [clientOptions] : [])) ?? []
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
  return {
    general: generalOptionsParsed,
    server: serverOptionsParsed,
    clients: clientsOptionsParsed,
  }
}

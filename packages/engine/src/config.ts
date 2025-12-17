import type { RoutesPretty } from '@devp0nt/route0'
import type { AppComponent, LazyPointsModule, PointsScope, ReadyPointsModule } from '@point0/core'
import { appendSlash, PointsManager, prependAndDeappendSlash } from '@point0/core'
import { minimatch } from 'minimatch'
import nodePath from 'node:path'
import type {
  ClientBunBuildConfigDefinition,
  ClientBunPluginsDefinition,
  ServerBunBuildConfigDefinition,
  ServerBunPluginsDefinition,
} from './utils.js'
import { toAbsPath, toJsExtension } from './utils.js'

export type EngineLogger = {
  info: (message: string, meta?: Record<string, any>) => any
  error: (error: unknown, meta?: Record<string, any>) => any
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
export type EngineOptionsViteConfig = ExtractedViteConfig | ReturnType<typeof import('vite').defineConfig> | string

export type EngineGeneralOptions = {
  fallbackScope?: PointsScope
  logger?: EngineLogger
  itWasBuilt?: boolean
  cwdAfterBuild?: string
  cwdBeforeBuild?: string
  engineFile?: string
  autoFixBuiltPaths?: boolean
  clientsServerOutdir?: string | null
  clientsSelfOutdir?: string | null
  pointsGlob?: string | string[]
  buildWatchGlob?: string | string[]
  banner?: string | null
}
export type EngineServerOptions = {
  scope: PointsScope
  points?: string | ReadyPointsModule | LazyPointsModule | null
  pointsLazy?: string | null
  pointsReady?: string | null
  publicdir?: EngineOptionsPublicdir
  port?: number | string | null
  outdir?: string | null
  entry?: string | Record<string, string> | null
  publicdirOutdir?: string | null
  bunBuildConfig?: ServerBunBuildConfigDefinition
  bunPlugins?: ServerBunPluginsDefinition
  routes?: RoutesPretty<any> | string | null
  banner?: string | null
}
export type EngineClientOptions = {
  scope: PointsScope
  points: string | ReadyPointsModule | LazyPointsModule
  pointsLazy?: string | null
  pointsReady?: string | null
  ssr?: boolean | null
  app?: string | AppComponent | null
  baseurl?: string | null
  publicdir?: EngineOptionsPublicdir | null
  indexHtml?: string | null
  domRootElementId?: string
  env?: EngineOptionsEnv | null
  port?: number | string | null
  hmrPort?: number | string | null
  viteConfig?: EngineOptionsViteConfig | null
  bunBuildConfig?: ClientBunBuildConfigDefinition
  bunPlugins?: ClientBunPluginsDefinition
  outdir?: string | null
  serverOutdir?: string | null
  publicdirOutdir?: string | null
  routes?: RoutesPretty<any> | string | null
  banner?: string | null
  prune?: boolean
  pruneServer?: boolean
}
export type EngineOptions = EngineGeneralOptions & {
  server: EngineServerOptions
  clients: EngineClientOptions[]
}

export type EngineGeneralOptionsParsed = {
  fallbackScope: PointsScope
  logger: EngineLogger
  itWasBuilt: boolean
  cwdAfterBuild: string
  cwdBeforeBuild: string
  engineFile: string | null
  cwd: string
  autoFixBuiltPaths: boolean
  clientsServerOutdir: string | null
  clientsSelfOutdir: string | null
  pointsGlob: string[]
  buildWatchGlob: string[]
  banner: string | null
}
export type EngineClientOptionsParsed = {
  scope: PointsScope
  engineFile: string | null
  points: PointsManager | string
  pointsLazy: string | null
  pointsReady: string | null
  ssr: boolean
  // pointsDistFile: string | null
  app: string | AppComponent | null
  // appDistFile: string | null
  baseurl: string
  publicdir: EngineOptionsPublicdirParsed
  indexHtml: string | null
  // indexHtmlDistFile: string | null
  env: EngineOptionsEnvParsed
  domRootElementId: string
  port: number
  hmrPort: number
  index: number
  viteConfig: EngineOptionsViteConfig | null
  outdir: string | null
  bunBuildConfig: ClientBunBuildConfigDefinition
  bunPlugins: ClientBunPluginsDefinition
  serverOutdir: string | null
  publicdirOutdir: string | null
  routes: RoutesPretty<any> | string | null
  banner: string | null
  prune: boolean
  pruneServer: boolean
}
export type EngineServerOptionsParsed = {
  scope: PointsScope
  points: PointsManager | string | null
  pointsLazy: string | null
  pointsReady: string | null
  publicdir: EngineOptionsPublicdirParsed
  port: number
  entry: Record<string, string> | null
  outdir: string | null
  publicdirOutdir: string | null
  engineFile: string | null
  cwdBeforeBuild: string
  itWasBuilt: boolean
  fallbackScope: PointsScope
  bunBuildConfig: ServerBunBuildConfigDefinition
  bunPlugins: ServerBunPluginsDefinition
  routes: RoutesPretty<any> | string | null
  banner: string | null
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

const parseEngineGeneralOptions = ({
  generalOptions,
  serverOptions,
  clientsOptions,
}: {
  generalOptions: EngineGeneralOptions
  serverOptions: EngineServerOptions
  clientsOptions: EngineClientOptions[] | undefined
}): EngineGeneralOptionsParsed => {
  const itWasBuilt = generalOptions.itWasBuilt ?? process.env.ENGINE_WAS_BUILT === 'true'
  const { cwdAfterBuild, cwdBeforeBuild, cwd } = (() => {
    generalOptions.itWasBuilt ??= process.env.ENGINE_WAS_BUILT === 'true'

    if (!itWasBuilt) {
      if (generalOptions.engineFile) {
        generalOptions.cwdBeforeBuild ??= nodePath.dirname(generalOptions.engineFile)
      }
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
        const ENGINE_CWD_BEFORE_BUILD_CUTTED = process.env.ENGINE_CWD_BEFORE_BUILD ?? null
        const ENGINE_CWD_AFTER_BUILD_CUTTED = process.env.ENGINE_CWD_AFTER_BUILD ?? null
        if (!ENGINE_CWD_BEFORE_BUILD_CUTTED || !ENGINE_CWD_AFTER_BUILD_CUTTED || !generalOptions.engineFile) {
          throw new Error(
            `You should provide ENGINE_CWD_BEFORE_BUILD and ENGINE_CWD_AFTER_BUILD and engineFile if itWasBuilt is true and cwdBeforeBuild and cwdAfterBuild are not provided`,
          )
        }
        const CWD_AFTER_BUILD_CURRENT = nodePath.dirname(generalOptions.engineFile)
        if (!CWD_AFTER_BUILD_CURRENT.endsWith(ENGINE_CWD_AFTER_BUILD_CUTTED)) {
          throw new Error(
            `ENGINE_CWD_AFTER_BUILD_CUTTED "${ENGINE_CWD_AFTER_BUILD_CUTTED}" is not a subdirectory of CWD_AFTER_BUILD_CURRENT "${CWD_AFTER_BUILD_CURRENT}"`,
          )
        }
        const localDir = CWD_AFTER_BUILD_CURRENT.replace(new RegExp(`${ENGINE_CWD_AFTER_BUILD_CUTTED}$`), '')
        generalOptions.cwdBeforeBuild = nodePath.join(localDir, ENGINE_CWD_BEFORE_BUILD_CUTTED)
        generalOptions.cwdAfterBuild = nodePath.join(localDir, ENGINE_CWD_AFTER_BUILD_CUTTED)
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
  const result = {
    fallbackScope: generalOptions.fallbackScope || clientsOptions?.at(0)?.scope || serverOptions.scope,
    logger: generalOptions.logger || {
      info: console.info.bind(console),
      error: console.error.bind(console),
    },
    itWasBuilt,
    cwdAfterBuild,
    cwdBeforeBuild,
    engineFile: generalOptions.engineFile || null,
    cwd,
    autoFixBuiltPaths: generalOptions.autoFixBuiltPaths ?? true,
    banner: generalOptions.banner ?? null,
  }
  return {
    ...result,
    clientsServerOutdir: toFinalPath({
      ...result,
      cwdIfWasBuilt: null,
      path: generalOptions.clientsServerOutdir,
    }),
    clientsSelfOutdir: toFinalPath({
      ...result,
      cwdIfWasBuilt: null,
      path: generalOptions.clientsSelfOutdir,
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
  return {
    scope: serverOptions.scope,
    points:
      typeof serverOptions.points === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            cwdIfWasBuilt: outdir,
            path: serverOptions.points,
            omitDirAfterBuild: true,
          })
        : !serverOptions.points
          ? null
          : PointsManager.create(serverOptions.points),
    port,
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
    routes: serverOptions.routes ?? null,
    pointsLazy: serverOptions.pointsLazy ?? null,
    pointsReady: serverOptions.pointsReady ?? null,
    banner: serverOptions.banner ?? null,
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
  if (clientOptions.ssr && !clientOptions.app) {
    throw new Error('You should provide app module, to enable SSR')
  }
  const port =
    typeof clientOptions.port !== 'undefined' ? Number(clientOptions.port) : serverOptionsParsed.port + index + 1
  const hmrPort = typeof clientOptions.hmrPort !== 'undefined' ? Number(clientOptions.hmrPort) : port + 100
  const serverOutdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path:
      clientOptions.serverOutdir ??
      (generalOptionsParsed.clientsServerOutdir
        ? nodePath.resolve(generalOptionsParsed.clientsServerOutdir, clientOptions.scope)
        : null),
  })
  const outdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path:
      clientOptions.outdir ??
      (generalOptionsParsed.clientsSelfOutdir
        ? nodePath.resolve(generalOptionsParsed.clientsSelfOutdir, clientOptions.scope)
        : null),
  })
  const publicdirOutdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: clientOptions.publicdirOutdir ?? (outdir && clientOptions.publicdir ? nodePath.join(outdir, 'public') : null),
  })
  return {
    scope: clientOptions.scope,
    points:
      typeof clientOptions.points === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            cwdIfWasBuilt: serverOutdir,
            relPathAfterBuild: clientOptions.viteConfig ? './points.js' : undefined,
            path: clientOptions.points,
            omitDirAfterBuild: true,
          })
        : PointsManager.create(clientOptions.points),
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
    app:
      typeof clientOptions.app === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            cwdIfWasBuilt: serverOutdir,
            relPathAfterBuild: clientOptions.viteConfig ? './app.js' : undefined,
            path: clientOptions.app,
            omitDirAfterBuild: true,
          })
        : (clientOptions.app ?? null),
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
    serverOutdir,
    publicdirOutdir,
    bunBuildConfig: clientOptions.bunBuildConfig ?? {},
    bunPlugins: clientOptions.bunPlugins ?? [],
    routes: clientOptions.routes ?? null,
    pointsLazy: clientOptions.pointsLazy ?? null,
    pointsReady: clientOptions.pointsReady ?? null,
    ssr: clientOptions.ssr ?? !!clientOptions.app,
    banner: clientOptions.banner ?? null,
    prune: clientOptions.prune ?? true,
    pruneServer: clientOptions.pruneServer ?? true,
    engineFile: generalOptionsParsed.engineFile,
  }
}
export const parseEngineOptions = (options: EngineOptions): EngineOptionsParsed => {
  const { server: serverOptions, clients: clientsOptions, ...generalOptions } = options
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

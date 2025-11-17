import { minimatch } from 'minimatch'
import nodePath from 'node:path'
import type { AppComponent } from '../core/mount.js'
import type { LazyPointsModule, ReadyPointsModule } from '../core/points.js'
import { Points } from '../core/points.js'
import type { RootId } from '../core/types.js'
import { prependAndAppendSlash, prependAndDeappendSlash, toAbsPath } from './utils.js'

// TODO: bunConfigBuildForServer, bunConfigBuildForClient, viteConfigBuildForServer, viteConfigBuildForClient, viteConfigDevServer

export type EngineLogger = {
  info: (message: string, meta?: Record<string, any>) => any
  error: (error: unknown, meta?: Record<string, any>) => any
}

export type EngineOptionsPublicDir =
  | string
  | Record<string, string | Response | (() => Response | Promise<Response>)>
  | Array<
      | string
      | Record<string, string | Response | (() => Response | Promise<Response>)>
      | [string, string | Response | (() => Response | Promise<Response>)]
    >
export type EngineOptionsPublicDirParsed = Array<[string, string | Response | (() => Response | Promise<Response>)]>

export type EngineOptionsEnv = string | Record<string, any> | Array<string | Record<string, any>>
export type EngineOptionsEnvParsed = Record<string, any>

export type LoadedViteConfig = import('vite').UserConfig
export type EngineOptionsViteConfig = LoadedViteConfig | ReturnType<typeof import('vite').defineConfig> | string

export type EngineGeneralOptions = {
  fallbackRootId?: RootId
  logger?: EngineLogger
  itWasBuilt?: boolean
  cwdAfterBuild?: string
  cwdBeforeBuild?: string
  autoFixBuiltPaths?: boolean
}
export type EngineServerOptions = {
  rootId: RootId
  points: ReadyPointsModule | LazyPointsModule
  publicDir?: EngineOptionsPublicDir
  port?: number | string | null
  hmrPort?: number | string | null
  distDir?: string | null
  entry?: string | Record<string, string> | null
  clientsDistDir?: string | null
  publicDistDir?: string | null
}
export type EngineClientOptions = {
  rootId: RootId
  points: string | ReadyPointsModule | LazyPointsModule
  ssr?: boolean
  app?: string | AppComponent | null
  hostname?: string | null
  basepath?: string | null
  publicDir?: EngineOptionsPublicDir | null
  indexHtml?: string | null
  domRootElementId?: string
  env?: EngineOptionsEnv | null
  port?: number | string | null
  hmrPort?: number | string | null
  viteConfig?: EngineOptionsViteConfig | null
  distDir?: string | null
  serverDistDir?: string | null
  publicDistDir?: string | null
}
export type EngineOptions = EngineGeneralOptions & {
  server: EngineServerOptions
  clients: EngineClientOptions[]
}

export type EngineGeneralOptionsParsed = {
  fallbackRootId: RootId | null
  logger: EngineLogger
  itWasBuilt: boolean
  cwdAfterBuild: string
  cwdBeforeBuild: string
  cwd: string
  autoFixBuiltPaths: boolean
}
export type EngineClientOptionsParsed = {
  rootId: RootId
  points: Points | string
  ssr: boolean
  app: string | AppComponent | null
  hostname: string | null
  basepath: string
  publicDir: EngineOptionsPublicDirParsed
  indexHtml: string | null
  env: EngineOptionsEnvParsed
  domRootElementId: string
  port: number
  hmrPort: number
  index: number
  viteConfig: EngineOptionsViteConfig | null
  distDir: string | null
  serverDistDir: string | null
  publicDistDir: string | null
}
export type EngineServerOptionsParsed = {
  rootId: RootId
  points: Points
  publicDir: EngineOptionsPublicDirParsed
  port: number
  hmrPort: number
  entry: Record<string, string> | null
  distDir: string | null
  clientsDistDir: string | null
  publicDistDir: string | null
}
export type EngineOptionsParsed = {
  general: EngineGeneralOptionsParsed
  server: EngineServerOptionsParsed
  clients: EngineClientOptionsParsed[]
}

const parsePublicDir = (input: EngineOptionsPublicDir, cwd: string): EngineOptionsPublicDirParsed => {
  if (typeof input === 'string') {
    return [['/', toAbsPath(cwd, input)]]
  }
  if (!Array.isArray(input)) {
    return Object.entries(input).map(([routePath, absPathOrResponseOrFn]) => [
      prependAndDeappendSlash(routePath),
      typeof absPathOrResponseOrFn === 'string' ? toAbsPath(cwd, absPathOrResponseOrFn) : absPathOrResponseOrFn,
    ])
  }
  const result: EngineOptionsPublicDirParsed = []
  for (const item of input) {
    if (typeof item === 'string') {
      result.push(...parsePublicDir(item, cwd))
      continue
    }
    if (!Array.isArray(item)) {
      result.push(...parsePublicDir(item, cwd))
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
  const itWasBuilt = generalOptions.itWasBuilt ?? false
  const { cwdAfterBuild, cwdBeforeBuild, cwd } = (() => {
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
  return {
    // will be resolved after parsing clients and server
    fallbackRootId: generalOptions.fallbackRootId || null,
    logger: generalOptions.logger || {
      info: console.info.bind(console),
      error: console.error.bind(console),
    },
    itWasBuilt,
    cwdAfterBuild,
    cwdBeforeBuild,
    cwd,
    autoFixBuiltPaths: generalOptions.autoFixBuiltPaths ?? true,
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

  const fixedPath =
    relPathAfterBuild ?? (omitDirAfterBuild && !nodePath.isAbsolute(path) ? nodePath.basename(path) : path)
  const pathWithJsExt = fixedPath.replace(/\.tsx?$/, '.js')
  return nodePath.resolve(cwdAfterBuildFinal, pathWithJsExt) as T extends null | undefined ? null : T
}

export const parseEngineServerOptions = ({
  serverOptions,
  generalOptionsParsed,
}: {
  serverOptions: EngineServerOptions
  generalOptionsParsed: EngineGeneralOptionsParsed
}): EngineServerOptionsParsed => {
  const port = typeof serverOptions.port !== 'undefined' ? Number(serverOptions.port) : 3000
  const hmrPort = typeof serverOptions.hmrPort !== 'undefined' ? Number(serverOptions.hmrPort) : port + 100
  const entriesRecordInput =
    typeof serverOptions.entry === 'string' ? { main: serverOptions.entry } : serverOptions.entry
  const distDir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: serverOptions.distDir,
  })
  const entriesRecord = entriesRecordInput
    ? Object.fromEntries(
        Object.entries(entriesRecordInput).map(([key, value]) => [
          key,
          toFinalPath({ ...generalOptionsParsed, cwdIfWasBuilt: distDir, path: value, omitDirAfterBuild: true }),
        ]),
      )
    : null
  return {
    rootId: serverOptions.rootId,
    points: Points.create(serverOptions.points),
    port,
    hmrPort,
    distDir,
    entry: entriesRecord,
    clientsDistDir: toFinalPath({
      ...generalOptionsParsed,
      cwdIfWasBuilt: null,
      path: serverOptions.clientsDistDir,
    }),
    publicDir:
      !generalOptionsParsed.autoFixBuiltPaths || !generalOptionsParsed.itWasBuilt
        ? parsePublicDir(serverOptions.publicDir ?? [], generalOptionsParsed.cwd)
        : serverOptions.publicDistDir
          ? [
              [
                '/',
                toFinalPath({
                  ...generalOptionsParsed,
                  cwdIfWasBuilt: null,
                  path: serverOptions.publicDistDir,
                }),
              ],
            ]
          : [],
    publicDistDir: toFinalPath({
      ...generalOptionsParsed,
      cwdIfWasBuilt: null,
      path: serverOptions.publicDistDir,
    }),
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
  const hmrPort = typeof clientOptions.hmrPort !== 'undefined' ? Number(clientOptions.hmrPort) : port + 100
  const serverDistDirProvided =
    clientOptions.serverDistDir ??
    (serverOptionsParsed.clientsDistDir
      ? nodePath.resolve(serverOptionsParsed.clientsDistDir, clientOptions.rootId)
      : null)
  const serverDistDir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: serverDistDirProvided,
  })
  const distDir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: clientOptions.distDir,
  })
  return {
    rootId: clientOptions.rootId,
    points:
      typeof clientOptions.points === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            cwdIfWasBuilt: serverDistDir,
            relPathAfterBuild: clientOptions.viteConfig ? './points.js' : undefined,
            path: clientOptions.points,
            omitDirAfterBuild: true,
          })
        : Points.create(clientOptions.points),
    ssr: clientOptions.ssr ?? false,
    app:
      typeof clientOptions.app === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            cwdIfWasBuilt: serverDistDir,
            relPathAfterBuild: clientOptions.viteConfig ? './app.js' : undefined,
            path: clientOptions.app,
            omitDirAfterBuild: true,
          })
        : (clientOptions.app ?? null),
    hostname: clientOptions.hostname ?? null,
    basepath: prependAndAppendSlash(clientOptions.basepath) || '/',
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
    distDir,
    indexHtml: toFinalPath({
      ...generalOptionsParsed,
      cwdIfWasBuilt: clientOptions.distDir,
      relPathAfterBuild: './index.html',
      path: clientOptions.indexHtml,
    }),
    publicDir:
      !generalOptionsParsed.autoFixBuiltPaths || !generalOptionsParsed.itWasBuilt
        ? parsePublicDir(clientOptions.publicDir ?? [], generalOptionsParsed.cwd)
        : clientOptions.distDir
          ? [['/', toFinalPath({ ...generalOptionsParsed, cwdIfWasBuilt: undefined, path: clientOptions.distDir })]]
          : [],
    serverDistDir,
    publicDistDir: toFinalPath({
      ...generalOptionsParsed,
      cwdIfWasBuilt: undefined,
      path: clientOptions.publicDistDir,
    }),
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
  // we can not do it here, becouse points may be readable via vite config
  // so we will do it after engine initialization
  // generalOptionsParsed.fallbackRootId ||=
  //   clientsOptionsParsed.at(0)?.points.root.point._rootId || serverOptionsParsed.points.root.point._rootId
  return {
    general: generalOptionsParsed,
    server: serverOptionsParsed,
    clients: clientsOptionsParsed,
  }
}

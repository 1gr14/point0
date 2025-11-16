import { minimatch } from 'minimatch'
import type { AppComponent } from '../core/mount.js'
import type { LazyPointsModule, ReadyPointsModule } from '../core/points.js'
import { Points } from '../core/points.js'
import type { RootId } from '../core/types.js'
import { prependAndAppendSlash, prependAndDeappendSlash, toAbsPath } from './utils.js'
import nodePath from 'node:path'

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
  points: ReadyPointsModule | LazyPointsModule | string
  publicDir?: EngineOptionsPublicDir
  port?: number | string | null
  hmrPort?: number | string | null
  distDir?: string | null
  entryFile?: string | null
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
  points: Points | string
  publicDir: EngineOptionsPublicDirParsed
  port: number
  hmrPort: number
  entryFile: string | null
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

// const toFinalPath = <T extends string | null | undefined>({
//   autoFixBuiltPaths,
//   itWasBuilt,
//   cwdBeforeBuild,
//   distDir,
//   path,
// }: {
//   autoFixBuiltPaths: boolean
//   itWasBuilt: boolean
//   cwdBeforeBuild: string
//   distDir?: string | null
//   path: T
// }): T extends null | undefined ? null : T => {
//   if (!path) {
//     return (path ?? null) as T extends null | undefined ? null : T
//   }
//   if (!itWasBuilt || !autoFixBuiltPaths) {
//     return toAbsPath(cwdBeforeBuild, path) as T extends null | undefined ? null : T
//   }
//   const pathWithJsExt = path.replace(/\.tsx?$/, '.js')
//   // const pathBeforeBuild = nodePath.resolve(cwdBeforeBuild, path)
//   const distDirAbs = distDir ? nodePath.resolve(cwdBeforeBuild, distDir) : cwdBeforeBuild
//   const pathAfterBuild = nodePath.resolve(distDirAbs, pathWithJsExt)
//   return pathAfterBuild as T extends null | undefined ? null : T
// }

// const createToFinalPath =
//   ({
//     autoFixBuiltPaths,
//     itWasBuilt,
//     cwdBeforeBuild,
//     distDir,
//   }: {
//     autoFixBuiltPaths: boolean
//     itWasBuilt: boolean
//     cwdBeforeBuild: string
//     distDir?: string | null
//   }) =>
//   <T extends string | null | undefined>(
//     path: T,
//     overrideDistDir: boolean | null | string = true,
//   ): T extends null | undefined ? null : T =>
//     toFinalPath({
//       autoFixBuiltPaths,
//       itWasBuilt,
//       cwdBeforeBuild,
//       distDir: overrideDistDir === true ? distDir : !overrideDistDir ? undefined : overrideDistDir,
//       path,
//     })

const toFinalPath = <T extends string | null | undefined>({
  autoFixBuiltPaths,
  itWasBuilt,
  cwdAfterBuild,
  cwdBeforeBuild,
  cwdIfWasBuilt,
  path,
}: {
  autoFixBuiltPaths: boolean
  itWasBuilt: boolean
  cwdAfterBuild: string
  cwdBeforeBuild: string
  cwdIfWasBuilt: string | null | undefined
  path: T
}): T extends null | undefined ? null : T => {
  if (!path) {
    return (path ?? null) as T extends null | undefined ? null : T
  }
  if (!itWasBuilt || !autoFixBuiltPaths) {
    return toAbsPath(itWasBuilt ? cwdAfterBuild : cwdBeforeBuild, path) as T extends null | undefined ? null : T
  }
  const pathWithJsExt = path.replace(/\.tsx?$/, '.js')
  const cwdIfWasBuiltNormalized = cwdIfWasBuilt ? toAbsPath(cwdBeforeBuild, cwdIfWasBuilt) : cwdBeforeBuild
  const pathAfterBuild = nodePath.resolve(cwdIfWasBuiltNormalized || cwdBeforeBuild, pathWithJsExt)
  return pathAfterBuild as T extends null | undefined ? null : T
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
  return {
    rootId: serverOptions.rootId,
    points:
      typeof serverOptions.points === 'string'
        ? toFinalPath({ ...generalOptionsParsed, cwdIfWasBuilt: serverOptions.distDir, path: serverOptions.points })
        : Points.create(serverOptions.points),
    port,
    hmrPort,
    distDir: toFinalPath({ ...generalOptionsParsed, cwdIfWasBuilt: undefined, path: serverOptions.distDir }),
    entryFile: toFinalPath({
      ...generalOptionsParsed,
      cwdIfWasBuilt: serverOptions.distDir,
      path: serverOptions.entryFile,
    }),
    clientsDistDir: toFinalPath({
      ...generalOptionsParsed,
      cwdIfWasBuilt: undefined,
      path: serverOptions.clientsDistDir,
    }),
    publicDir:
      !generalOptionsParsed.autoFixBuiltPaths || !generalOptionsParsed.itWasBuilt
        ? parsePublicDir(serverOptions.publicDir ?? [], generalOptionsParsed.cwd)
        : serverOptions.publicDistDir
          ? [
              [
                '/',
                toFinalPath({ ...generalOptionsParsed, cwdIfWasBuilt: undefined, path: serverOptions.publicDistDir }),
              ],
            ]
          : [],
    publicDistDir: toFinalPath({
      ...generalOptionsParsed,
      cwdIfWasBuilt: undefined,
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
    cwdIfWasBuilt: undefined,
    path: serverDistDirProvided,
  })
  return {
    rootId: clientOptions.rootId,
    points:
      typeof clientOptions.points === 'string'
        ? generalOptionsParsed.autoFixBuiltPaths && generalOptionsParsed.itWasBuilt
          ? serverDistDir
            ? toFinalPath({
                ...generalOptionsParsed,
                cwdIfWasBuilt: serverDistDir,
                path: clientOptions.viteConfig ? './points.js' : clientOptions.points,
              })
            : toFinalPath({
                ...generalOptionsParsed,
                cwdIfWasBuilt: serverDistDir,
                path: clientOptions.viteConfig ? './points.js' : clientOptions.points,
              })
          : toFinalPath({ ...generalOptionsParsed, cwdIfWasBuilt: undefined, path: clientOptions.points })
        : Points.create(clientOptions.points),
    ssr: clientOptions.ssr ?? false,
    app:
      typeof clientOptions.app === 'string'
        ? generalOptionsParsed.autoFixBuiltPaths && generalOptionsParsed.itWasBuilt
          ? serverDistDir
            ? toFinalPath({
                ...generalOptionsParsed,
                cwdIfWasBuilt: serverDistDir,
                path: clientOptions.viteConfig ? './app.js' : clientOptions.app,
              })
            : toFinalPath({
                ...generalOptionsParsed,
                cwdIfWasBuilt: serverDistDir,
                path: clientOptions.viteConfig ? './app.js' : clientOptions.app,
              })
          : toFinalPath({ ...generalOptionsParsed, cwdIfWasBuilt: undefined, path: clientOptions.app })
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
        ? toFinalPath({ ...generalOptionsParsed, cwdIfWasBuilt: clientOptions.distDir, path: clientOptions.viteConfig })
        : (clientOptions.viteConfig ?? null),
    distDir: toFinalPath({ ...generalOptionsParsed, cwdIfWasBuilt: undefined, path: clientOptions.distDir }),
    indexHtml: toFinalPath({
      ...generalOptionsParsed,
      cwdIfWasBuilt: clientOptions.distDir,
      path: generalOptionsParsed.itWasBuilt
        ? clientOptions.indexHtml
          ? './index.html'
          : null
        : clientOptions.indexHtml,
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

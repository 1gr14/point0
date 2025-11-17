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

export type LoadedViteConfig = import('vite').UserConfig
export type EngineOptionsViteConfig = LoadedViteConfig | ReturnType<typeof import('vite').defineConfig> | string

export type EngineGeneralOptions = {
  fallbackRootId?: RootId
  logger?: EngineLogger
  itWasBuilt?: boolean
  cwdAfterBuild?: string
  cwdBeforeBuild?: string
  autoFixBuiltPaths?: boolean
  clientsServerOutdir?: string | null
  clientsSelfOutdir?: string | null
}
export type EngineServerOptions = {
  rootId: RootId
  points: ReadyPointsModule | LazyPointsModule
  publicdir?: EngineOptionsPublicdir
  port?: number | string | null
  hmrPort?: number | string | null
  outdir?: string | null
  entry?: string | Record<string, string> | null
  publicdirOutdir?: string | null
}
export type EngineClientOptions = {
  rootId: RootId
  points: string | ReadyPointsModule | LazyPointsModule
  ssr?: boolean
  app?: string | AppComponent | null
  hostname?: string | null
  basepath?: string | null
  publicdir?: EngineOptionsPublicdir | null
  indexHtml?: string | null
  domRootElementId?: string
  env?: EngineOptionsEnv | null
  port?: number | string | null
  hmrPort?: number | string | null
  viteConfig?: EngineOptionsViteConfig | null
  outdir?: string | null
  serverOutdir?: string | null
  publicdirOutdir?: string | null
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
  clientsServerOutdir: string | null
  clientsSelfOutdir: string | null
}
export type EngineClientOptionsParsed = {
  rootId: RootId
  points: Points | string
  ssr: boolean
  app: string | AppComponent | null
  hostname: string | null
  basepath: string
  publicdir: EngineOptionsPublicdirParsed
  indexHtml: string | null
  env: EngineOptionsEnvParsed
  domRootElementId: string
  port: number
  hmrPort: number
  index: number
  viteConfig: EngineOptionsViteConfig | null
  outdir: string | null
  serverOutdir: string | null
  publicdirOutdir: string | null
}
export type EngineServerOptionsParsed = {
  rootId: RootId
  points: Points
  publicdir: EngineOptionsPublicdirParsed
  port: number
  hmrPort: number
  entry: Record<string, string> | null
  outdir: string | null
  publicdirOutdir: string | null
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
  const result = {
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

  if (relPathAfterBuild) {
    const fixedPath = nodePath.resolve(cwdAfterBuildFinal, relPathAfterBuild.replace(/\.tsx?$/, '.js'))
    return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
  }

  if (omitDirAfterBuild && !nodePath.isAbsolute(path)) {
    const fixedPath = nodePath.basename(path).replace(/\.tsx?$/, '.js')
    return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
  }

  const fixedPath = path.replace(/\.tsx?$/, '.js')
  return nodePath.resolve(cwdAfterBuildFinal, fixedPath) as T extends null | undefined ? null : T
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
  const outdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: serverOptions.outdir,
  })
  const publicdirOutdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: serverOptions.publicdirOutdir || (outdir && serverOptions.publicdir ? nodePath.join(outdir, 'public') : null),
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
    rootId: serverOptions.rootId,
    points: Points.create(serverOptions.points),
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
  const serverOutdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path:
      clientOptions.serverOutdir ??
      (generalOptionsParsed.clientsServerOutdir
        ? nodePath.resolve(generalOptionsParsed.clientsServerOutdir, clientOptions.rootId)
        : null),
  })
  const outdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path:
      clientOptions.outdir ??
      (generalOptionsParsed.clientsSelfOutdir
        ? nodePath.resolve(generalOptionsParsed.clientsSelfOutdir, clientOptions.rootId)
        : null),
  })
  const publicdirOutdir = toFinalPath({
    ...generalOptionsParsed,
    cwdIfWasBuilt: null,
    path: clientOptions.publicdirOutdir || outdir,
  })
  return {
    rootId: clientOptions.rootId,
    points:
      typeof clientOptions.points === 'string'
        ? toFinalPath({
            ...generalOptionsParsed,
            cwdIfWasBuilt: serverOutdir,
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
            cwdIfWasBuilt: serverOutdir,
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
    outdir,
    indexHtml: toFinalPath({
      ...generalOptionsParsed,
      cwdIfWasBuilt: outdir,
      relPathAfterBuild: './index.html',
      path: clientOptions.indexHtml,
    }),
    publicdir:
      !generalOptionsParsed.autoFixBuiltPaths || !generalOptionsParsed.itWasBuilt
        ? parsePublicdir(clientOptions.publicdir ?? [], generalOptionsParsed.cwd)
        : publicdirOutdir && clientOptions.publicdir
          ? [['/', publicdirOutdir]]
          : [],
    serverOutdir,
    publicdirOutdir,
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
  return {
    general: generalOptionsParsed,
    server: serverOptionsParsed,
    clients: clientsOptionsParsed,
  }
}

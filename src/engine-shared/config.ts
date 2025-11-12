import type { AppComponent } from '../core/mount.js'
import type { ReadyPointsModule } from '../core/points.js'
import { Points } from '../core/points.js'
import type { RootId } from '../core/types.js'
import { absPath, prependAndAppendSlash, throwOnNonUniqueArrayElements } from './utils.js'

export type EngineLogger = {
  info: (message: string, meta?: Record<string, any>) => any
  error: (error: unknown, meta?: Record<string, any>) => any
}
export type EngineGeneralOptions = {
  fallbackRootId?: RootId | undefined
  logger?: EngineLogger
  cwd?: string | undefined
}
export type EngineServerOptions = {
  points: ReadyPointsModule
  publicDir?: string
  port?: number | string
}
export type EngineClientOptions = {
  points: ReadyPointsModule
  ssr?: boolean
  App?: AppComponent
  hostname?: string
  basepath?: string
  distDir?: string
  distRoute?: string
  publicDir?: string
  srcIndexHtml?: string
  distIndexHtml?: string
  domRootElementId?: string
  port?: number | string
}
export type EngineOptions = EngineGeneralOptions & {
  server: EngineServerOptions
  clients: EngineClientOptions[]
}

export type EngineGeneralOptionsParsed = {
  fallbackRootId: RootId
  logger: EngineLogger
  cwd: string | undefined
}
export type EngineClientOptionsParsed = {
  points: Points
  ssr: boolean
  App: AppComponent | undefined
  hostname: string | undefined
  basepath: string
  distDir: string | undefined
  distRoute: string | undefined
  publicDir: string | undefined
  srcIndexHtml: string | undefined
  distIndexHtml: string | undefined
  domRootElementId: string
  port: number | undefined
  index: number
}
export type EngineServerOptionsParsed = {
  points: Points
  publicDir: string | undefined
  port: number
}
export type EngineOptionsParsed = {
  general: EngineGeneralOptionsParsed
  server: EngineServerOptionsParsed
  clients: EngineClientOptionsParsed[]
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
  return {
    fallbackRootId:
      generalOptions.fallbackRootId ||
      clientsOptions?.[0]?.points.root.point._rootId ||
      serverOptions.points.root.point._rootId,
    logger: generalOptions.logger || {
      info: console.info.bind(console),
      error: console.error.bind(console),
    },
    cwd: generalOptions.cwd,
  }
}
export const parseEngineServerOptions = ({
  serverOptions,
  generalOptionsParsed,
}: {
  serverOptions: EngineServerOptions
  generalOptionsParsed: EngineGeneralOptionsParsed
}): EngineServerOptionsParsed => {
  return {
    points: Points.create(serverOptions.points),
    port: typeof serverOptions.port !== 'undefined' ? Number(serverOptions.port) : 3000,
    publicDir: absPath(generalOptionsParsed.cwd, serverOptions.publicDir),
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
  const distDir = prependAndAppendSlash(absPath(generalOptionsParsed.cwd, clientOptions.distDir))
  const srcIndexHtml = absPath(generalOptionsParsed.cwd, clientOptions.srcIndexHtml)
  const distIndexHtml = absPath(generalOptionsParsed.cwd, clientOptions.distIndexHtml)
  const basepath = prependAndAppendSlash(clientOptions.basepath) || '/'
  const distRoute = prependAndAppendSlash(clientOptions.distRoute)
  if (distRoute !== 'undefined' && !distDir) {
    throw new Error(`client ad index ${index} has distRoute but no distDir`)
  }
  if (distDir !== 'undefined' && !distRoute) {
    throw new Error(`client ad index ${index} has distDir but no distRoute`)
  }
  const publicDir = absPath(generalOptionsParsed.cwd, clientOptions.publicDir)
  const ssr = clientOptions.ssr ?? true
  return {
    points: Points.create(clientOptions.points),
    ssr,
    App: clientOptions.App,
    basepath,
    hostname: clientOptions.hostname,
    distDir,
    distRoute,
    publicDir,
    srcIndexHtml,
    distIndexHtml,
    domRootElementId: clientOptions.domRootElementId || 'root',
    port: typeof clientOptions.port !== 'undefined' ? Number(clientOptions.port) : serverOptionsParsed.port + index + 1,
    index,
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
  if (process.env.NODE_ENV === 'production') {
    throwOnNonUniqueArrayElements(
      clientsOptionsParsed.map((client) => client.distDir),
      'each client distDir must be unique',
    )
    throwOnNonUniqueArrayElements(
      clientsOptionsParsed.map((client) => client.distRoute),
      'each client distRoute must be unique',
    )
    throwOnNonUniqueArrayElements(
      clientsOptionsParsed.map((client) => client.distIndexHtml),
      'each client distIndexHtml must be unique',
    )
  } else {
    throwOnNonUniqueArrayElements(
      clientsOptionsParsed.map((client) => client.srcIndexHtml),
      'each client srcIndexHtml must be unique',
    )
  }
  return {
    general: generalOptionsParsed,
    server: serverOptionsParsed,
    clients: clientsOptionsParsed,
  }
}

import type { AppComponent } from '../client/mount.js'
import type { BaseId, BasePoint } from '../core/index.js'
import type { PointsCollection } from '../eversion/runtime.js'
import { absPath, prependAndAppendSlash, throwOnNonUniqueArrayElements } from './utils.js'

export type ServeLogger = {
  info: (message: string) => any
  error: (error: unknown) => any
}
export type ServeClientInput = {
  ssr?: boolean
  points?: PointsCollection
  base: BasePoint
  basepath?: string
  distDir?: string
  distRoute?: string
  srcIndexHtml?: string
  distIndexHtml?: string
  App?: AppComponent
  rootElementId?: string
}
export type ServeServerInput = {
  base: BasePoint
  points?: PointsCollection
  port?: number | string | undefined
  logger?: ServeLogger
  dirname?: string
  publicDir?: string
  fallbackBaseId?: BaseId | undefined
  clients?: ServeClientInput[] | undefined
}

export type ServeClientInputParsed = {
  ssr: boolean
  points: PointsCollection
  base: BasePoint
  basepath: string
  distDir: string | undefined
  distRoute: string | undefined
  srcIndexHtml: string | undefined
  distIndexHtml: string | undefined
  App: AppComponent | undefined
  index: number
  rootElementId: string | undefined
}
export type ServeServerInputParsed = {
  base: BasePoint
  points: PointsCollection
  port: number | string | undefined
  logger: ServeLogger
  dirname: string | undefined
  publicDir: string | undefined
  fallbackBaseId: BaseId | undefined
  clients: ServeClientInputParsed[]
}
export type ServeServerResult = {
  fetch: any
}

// TODO: extract input from server and client itself
const parseServeClientInput = (
  index: number,
  input: ServeClientInput,
  dirname: string | undefined,
): ServeClientInputParsed => {
  const distDir = prependAndAppendSlash(absPath(dirname, input.distDir))
  const srcIndexHtml = absPath(dirname, input.srcIndexHtml)
  const distIndexHtml = absPath(dirname, input.distIndexHtml)
  const basepath = prependAndAppendSlash(input.basepath) || '/'
  const distRoute = prependAndAppendSlash(input.distRoute)
  if (distRoute !== 'undefined' && (distRoute === '' || distRoute === '/')) {
    throw new Error('clientDistRoute cannot be empty or root')
  }
  const ssr = input.ssr ?? true
  return {
    ssr,
    points: input.points ?? [],
    base: input.base,
    basepath,
    distDir,
    distRoute,
    srcIndexHtml,
    distIndexHtml,
    App: input.App,
    index,
    rootElementId: input.rootElementId,
  }
}
export const parseServeInput = (input: ServeServerInput): ServeServerInputParsed => {
  const { dirname, port, points, base } = input
  const logger = input.logger || {
    info: console.info.bind(console),
    error: console.error.bind(console),
  }
  const publicDir = absPath(dirname, input.publicDir)
  const clients: ServeClientInputParsed[] =
    input.clients?.map((clientInput, index) => parseServeClientInput(index, clientInput, dirname)) ?? []
  if (process.env.NODE_ENV === 'production') {
    throwOnNonUniqueArrayElements(
      clients.map((client) => client.distDir),
      'each client distDir must be unique',
    )
    throwOnNonUniqueArrayElements(
      clients.map((client) => client.distRoute),
      'each client distRoute must be unique',
    )
  } else {
    throwOnNonUniqueArrayElements(
      clients.map((client) => client.srcIndexHtml),
      'each client srcEntry must be unique',
    )
  }
  return {
    points: points ?? [],
    port,
    logger,
    dirname,
    publicDir,
    base,
    fallbackBaseId: input.fallbackBaseId,
    clients,
  }
}

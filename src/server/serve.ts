import type { AnyPoint, InitialPoint, PointsCollection } from '../core/index.js'
import { absPath, prependAndAppendSlash, throwOnNonUniqueArrayElements } from './utils.js'

export type ServeLogger = {
  info: (message: string) => any
  error: (error: unknown) => any
}
export type ServeClientInput = {
  ssr?: boolean
  base: AnyPoint
  basepath?: string
  distDir?: string
  distRoute?: string
  srcEntry?: string
}
export type ServeServerInput = {
  base: InitialPoint
  points: PointsCollection
  port?: number | string | undefined
  logger?: ServeLogger
  dirname?: string
  publicDir?: string
  clients?: ServeClientInput[] | undefined
}

export type ServeClientInputParsed = {
  ssr: boolean
  base: AnyPoint
  basepath: string
  distDir: string | undefined
  distRoute: string | undefined
  srcEntry: string | undefined
}
export type ServeServerInputParsed = {
  base: InitialPoint
  points: PointsCollection
  port: number | string | undefined
  logger: ServeLogger
  dirname: string | undefined
  publicDir: string | undefined
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
  const srcEntry = absPath(dirname, input.srcEntry)
  const distDir = prependAndAppendSlash(absPath(dirname, input.distDir))
  const basepath = prependAndAppendSlash(input.basepath) || '/'
  const distRoute = prependAndAppendSlash(input.distRoute)
  if (distRoute !== 'undefined' && (distRoute === '' || distRoute === '/')) {
    throw new Error('clientDistRoute cannot be empty or root')
  }
  const ssr = input.ssr ?? true
  if (process.env.NODE_ENV !== 'production') {
    if (!srcEntry) {
      throw new Error(`To serve client in development mode you should provide srcEntry for client at index ${index}`)
    }
  } else {
    if (!distDir) {
      throw new Error(`To serve client in production mode you should provide distDir for client at index ${index}`)
    }
    if (!distRoute) {
      throw new Error(`To serve client in production mode you should provide distRoute for client at index ${index}`)
    }
  }
  return {
    ssr,
    base: input.base,
    basepath,
    distDir,
    distRoute,
    srcEntry,
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
      clients.map((client) => client.srcEntry),
      'each client srcEntry must be unique',
    )
  }
  return {
    points,
    port,
    logger,
    dirname,
    publicDir,
    base,
    clients,
  }
}

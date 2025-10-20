import type { AnyClient, AnyServer, PointsCollection, UndefinedServer } from '../core/index.js'
import { absPath } from './utils.js'

export type ServeLogger = {
  info: (message: string) => any
  error: (error: unknown) => any
}
export type ServeServerInput<TServer extends AnyServer = AnyServer> = {
  server: TServer
  client?: AnyClient<TServer> | undefined
  points: PointsCollection<TServer | UndefinedServer>
  port?: number | string | undefined // TODO: add "true" auto choose option
  logger?: ServeLogger
  basepath?: string
  publicDir?: string
  clientServe?: 'ssr' | 'static' | false | undefined
  clientDistDir?: string // prod
  clientDistRoute?: string // prod
  clientSrcEntry?: string // dev
}

export type ServeServerInputParsed<TServer extends AnyServer = AnyServer> = {
  server: TServer
  client?: AnyClient<TServer> | undefined
  points: PointsCollection<TServer | UndefinedServer>
  port: number | string | undefined
  logger: ServeLogger
  basepath?: string
  publicDir: string | undefined
  clientServe: 'ssr' | 'static' | false
  clientSrcEntry?: string // for development
  clientDistDir?: string // for production
  clientDistRoute?: string // for production
}
export type ServeServerResult = {
  fetch: any
}

// TODO: extract input from server and client itself
export const parseServeInput = (input: ServeServerInput): ServeServerInputParsed => {
  const { basepath, port, points, server } = input
  const clientSrcEntry = absPath(basepath, input.clientSrcEntry)
  const clientDistDir = absPath(basepath, input.clientDistDir)
  const clientDistRoute = input.clientDistRoute
  if (clientDistRoute !== 'undefined' && (clientDistRoute === '' || clientDistRoute === '/')) {
    throw new Error('clientDistRoute cannot be empty or root')
  }
  const publicDir = absPath(basepath, input.publicDir)
  const clientServe = input.clientServe || false
  const logger = input.logger || {
    info: console.info.bind(console),
    error: console.error.bind(console),
  }
  if (clientServe) {
    if (process.env.NODE_ENV === 'development') {
      if (!clientSrcEntry) {
        throw new Error('To serve client in development mode you should provide clientSrcEntry')
      }
    }
    if (process.env.NODE_ENV === 'production') {
      if (!clientDistDir) {
        throw new Error('To serve client in production mode you should provide clientDistDir')
      }
      if (!clientDistRoute) {
        throw new Error('To serve client in production mode you should provide clientDistRoute')
      }
    }
  }
  return {
    server,
    points,
    port,
    logger,
    basepath,
    publicDir,
    clientServe,
    clientSrcEntry,
    clientDistDir,
    clientDistRoute,
  }
}

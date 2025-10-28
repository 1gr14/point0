import type { HydratedAppComponent } from '../client/hydrate.js'
import type { RootId, RootPoint, RequiredCtx } from '../core/types.js'
import type { PointsCollection } from '../core/eversion.js'
import { absPath, prependAndAppendSlash, throwOnNonUniqueArrayElements } from './utils.js'

export type ServerAdapterLogger = {
  info: (message: string) => any
  error: (error: unknown) => any
}
export type ServerAdapterClientInput = {
  ssr?: boolean
  points?: PointsCollection
  root: RootPoint
  basepath?: string
  distDir?: string
  distRoute?: string
  srcIndexHtml?: string
  distIndexHtml?: string
  App?: HydratedAppComponent
  rootElementId?: string
}
export type ServerAdapterServerInput<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  root: RootPoint<TRequiredCtx>
  points?: PointsCollection
  port?: number | string | undefined
  clientsDevServerPort?: number | string | undefined
  logger?: ServerAdapterLogger
  dirname?: string
  publicDir?: string
  fallbackRootId?: RootId | undefined
  clients?: ServerAdapterClientInput[] | undefined
}

export type ServerAdapterClientInputParsed = {
  ssr: boolean
  points: PointsCollection
  root: RootPoint
  basepath: string
  distDir: string | undefined
  distRoute: string | undefined
  srcIndexHtml: string | undefined
  distIndexHtml: string | undefined
  App: HydratedAppComponent | undefined
  index: number
  rootElementId: string | undefined
}
export type ServerAdapterServerInputParsed<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  root: RootPoint<TRequiredCtx>
  points: PointsCollection
  port: number | string | undefined
  clientsDevServerPort: number | string | undefined
  logger: ServerAdapterLogger
  dirname: string | undefined
  publicDir: string | undefined
  fallbackRootId: RootId | undefined
  clients: ServerAdapterClientInputParsed[]
}

// TODO: extract input from server and client itself
const parseServerAdapterClientInput = (
  index: number,
  input: ServerAdapterClientInput,
  dirname: string | undefined,
): ServerAdapterClientInputParsed => {
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
    root: input.root,
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
export const parseServerAdapterInput = <TRequiredCtx extends RequiredCtx = RequiredCtx>(
  input: ServerAdapterServerInput<TRequiredCtx>,
): ServerAdapterServerInputParsed<TRequiredCtx> => {
  const { dirname, port, points, root } = input
  const logger = input.logger || {
    info: console.info.bind(console),
    error: console.error.bind(console),
  }
  const publicDir = absPath(dirname, input.publicDir)
  const clients: ServerAdapterClientInputParsed[] =
    input.clients?.map((clientInput, index) => parseServerAdapterClientInput(index, clientInput, dirname)) ?? []
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
    clientsDevServerPort: input.clientsDevServerPort,
    logger,
    dirname,
    publicDir,
    root,
    fallbackRootId: input.fallbackRootId,
    clients,
  }
}

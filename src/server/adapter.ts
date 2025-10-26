import type { HydratedAppComponent } from '../client/hydrate.js'
import type { BaseId, BasePoint, RequiredCtx } from '../core/index.js'
import type { PointsCollection } from '../eversion/main.js'
import { absPath, prependAndAppendSlash, throwOnNonUniqueArrayElements } from './utils.js'

export type AdapterLogger = {
  info: (message: string) => any
  error: (error: unknown) => any
}
export type AdapterClientInput = {
  ssr?: boolean
  points?: PointsCollection
  base: BasePoint
  basepath?: string
  distDir?: string
  distRoute?: string
  srcIndexHtml?: string
  distIndexHtml?: string
  App?: HydratedAppComponent
  rootElementId?: string
}
export type AdapterServerInput<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  base: BasePoint<TRequiredCtx>
  points?: PointsCollection
  port?: number | string | undefined
  clientsDevServerPort?: number | string | undefined
  logger?: AdapterLogger
  dirname?: string
  publicDir?: string
  fallbackBaseId?: BaseId | undefined
  clients?: AdapterClientInput[] | undefined
}

export type AdapterClientInputParsed = {
  ssr: boolean
  points: PointsCollection
  base: BasePoint
  basepath: string
  distDir: string | undefined
  distRoute: string | undefined
  srcIndexHtml: string | undefined
  distIndexHtml: string | undefined
  App: HydratedAppComponent | undefined
  index: number
  rootElementId: string | undefined
}
export type AdapterServerInputParsed<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  base: BasePoint<TRequiredCtx>
  points: PointsCollection
  port: number | string | undefined
  clientsDevServerPort: number | string | undefined
  logger: AdapterLogger
  dirname: string | undefined
  publicDir: string | undefined
  fallbackBaseId: BaseId | undefined
  clients: AdapterClientInputParsed[]
}

// TODO: extract input from server and client itself
const parseAdapterClientInput = (
  index: number,
  input: AdapterClientInput,
  dirname: string | undefined,
): AdapterClientInputParsed => {
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
export const parseAdapterInput = <TRequiredCtx extends RequiredCtx = RequiredCtx>(
  input: AdapterServerInput<TRequiredCtx>,
): AdapterServerInputParsed<TRequiredCtx> => {
  const { dirname, port, points, base } = input
  const logger = input.logger || {
    info: console.info.bind(console),
    error: console.error.bind(console),
  }
  const publicDir = absPath(dirname, input.publicDir)
  const clients: AdapterClientInputParsed[] =
    input.clients?.map((clientInput, index) => parseAdapterClientInput(index, clientInput, dirname)) ?? []
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
    base,
    fallbackBaseId: input.fallbackBaseId,
    clients,
  }
}

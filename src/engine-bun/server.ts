import type { Eversion } from '../core/eversion.js'
import type { Points } from '../core/points.js'
import type { RequiredCtx, RootId } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { EngineLogger, EngineOptionsPublicDirParsed } from '../engine-shared/config.js'
import type { ClientBun } from './client.js'
import { engineFetch } from './fetch.js'
import { PublicDir } from './public-dir.js'

export class ServerBun {
  eversion: Eversion
  points: Points
  port: number
  clients: ClientBun[]
  logger: EngineLogger
  publicDir: PublicDir
  fallbackRootId: RootId

  bunServer: Bun.Server<unknown> | undefined

  private constructor(input: {
    points: Points
    port: number

    fallbackRootId: RootId
    logger: EngineLogger
    clients: ClientBun[]
    publicDir: PublicDir
    eversion: Eversion
  }) {
    this.eversion = input.eversion
    this.points = input.points
    this.port = input.port
    this.clients = input.clients
    this.logger = input.logger
    this.publicDir = input.publicDir
    this.fallbackRootId = input.fallbackRootId
  }

  static async create(input: {
    points: Points
    port: number
    publicDir: EngineOptionsPublicDirParsed
    fallbackRootId: RootId
    logger: EngineLogger
    clients: ClientBun[]
    eversion: Eversion
  }): Promise<ServerBun> {
    const publicDir = await PublicDir.create({
      hostname: null,
      definition: input.publicDir,
      root: input.points.root,
      eversion: input.eversion,
    })
    const server = new ServerBun({
      ...input,
      publicDir,
    })
    return server
  }

  async serve({ requiredCtx }: { requiredCtx: RequiredCtx }): Promise<void> {
    this.bunServer = Bun.serve({
      port: this.port,
      fetch: async (request) => {
        const parsedUrl = parseUrl(request.url)
        return await this.fetch({ parsedUrl, request, requiredCtx })
      },
    })
  }

  async fetch({
    parsedUrl,
    request,
    requiredCtx,
    rootId,
  }: {
    parsedUrl?: ParsedUrl
    request: Request
    requiredCtx: RequiredCtx
    rootId?: RootId
  }): Promise<Response> {
    return await engineFetch({
      server: this,
      clients: this.clients,
      eversion: this.eversion,
      request,
      parsedUrl,
      fallbackRootId: rootId ?? this.fallbackRootId,
      rootId,
      requiredCtx,
      logger: this.logger,
    })
  }
}

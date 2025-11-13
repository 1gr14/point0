import type { Eversion } from '../core/eversion.js'
import type { Points } from '../core/points.js'
import type { RequiredCtx, RootId } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { EngineLogger } from '../engine-shared/config.js'
import { ClientBun } from './client-bun.js'
import { ClientVite } from './client-vite.js'
import { engineFetch } from './fetch.js'
import { StaticDir } from './static-dir.js'

export class ServerBun {
  eversion: Eversion
  points: Points
  port: number
  clients: Array<ClientBun | ClientVite>
  logger: EngineLogger
  publicDir: StaticDir | undefined
  fallbackRootId: RootId

  bunServer: Bun.Server<unknown> | undefined

  private constructor(input: {
    points: Points
    port: number

    fallbackRootId: RootId
    logger: EngineLogger
    clients: Array<ClientBun | ClientVite>
    publicDir: StaticDir | undefined
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
    publicDir: string | undefined
    fallbackRootId: RootId
    logger: EngineLogger
    clients: Array<ClientBun | ClientVite>
    eversion: Eversion
  }): Promise<ServerBun> {
    const publicDir = input.publicDir
      ? await StaticDir.create({
          hostname: undefined,
          absPath: input.publicDir,
          routePath: '/',
          root: input.points.root,
          eversion: input.eversion,
        })
      : undefined
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
  }: {
    parsedUrl?: ParsedUrl
    request: Request
    requiredCtx: RequiredCtx
  }): Promise<Response> {
    const clientsStaticDirs = this.clients.flatMap((client) =>
      client instanceof ClientBun || client instanceof ClientVite ? [client.distDir || [], client.publicDir || []] : [],
    )
    const allStaticDirs = [this.publicDir || [], ...clientsStaticDirs].flatMap((dir) => dir)
    return await engineFetch({
      clients: this.clients,
      eversion: this.eversion,
      request,
      parsedUrl,
      fallbackRootId: this.fallbackRootId,
      requiredCtx,
      staticDirs: allStaticDirs,
      logger: this.logger,
    })
  }

  async fetchStatic({
    parsedUrl,
    request,
  }: {
    parsedUrl?: ParsedUrl
    request: Request
  }): Promise<Response | undefined> {
    return await this.publicDir?.fetch({ parsedUrl, request })
  }
}

import { Eversion } from '../core/eversion.js'
import type { Points } from '../core/points.js'
import type { RequiredCtx, RootId } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { EngineLogger, EngineOptionsPublicDirParsed, EngineOptionsViteConfig } from '../engine-shared/config.js'
import type { ClientBun } from './client.js'
import { engineFetch } from './fetch.js'
import { PublicDir } from './public-dir.js'
import { createFreshPoints, createJitiInstance, createViteDevServer } from '../engine-shared/utils.js'

export class ServerBun {
  cwd: string
  eversion: Eversion
  points: Points
  pointsPath: string | null
  providedPoints: Points | null
  port: number
  clients: ClientBun[]
  logger: EngineLogger
  publicDir: PublicDir
  fallbackRootId: RootId

  bunServer: Bun.Server<unknown> | undefined

  private constructor(input: {
    cwd: string
    points: Points
    pointsPath: string | null
    providedPoints: Points | null
    port: number

    fallbackRootId: RootId
    logger: EngineLogger
    clients: ClientBun[]
    publicDir: PublicDir
    eversion: Eversion
  }) {
    this.cwd = input.cwd
    this.eversion = input.eversion
    this.points = input.points
    this.pointsPath = input.pointsPath
    this.providedPoints = input.providedPoints
    this.port = input.port
    this.clients = input.clients
    this.logger = input.logger
    this.publicDir = input.publicDir
    this.fallbackRootId = input.fallbackRootId
  }

  static async create(input: {
    cwd: string
    points: Points | string
    viteConfig: EngineOptionsViteConfig | null
    port: number
    publicDir: EngineOptionsPublicDirParsed
    fallbackRootId: RootId
    logger: EngineLogger
    clients: ClientBun[]
    // eversion: Eversion
  }): Promise<ServerBun> {
    const jiti = createJitiInstance(input.cwd)

    const viteDevServer = !input.viteConfig
      ? null
      : await createViteDevServer({ viteConfig: input.viteConfig, jiti, clientIndex: null })

    const providedPoints = typeof input.points === 'string' ? null : input.points
    const pointsPath = typeof input.points === 'string' ? input.points : null
    const points = await createFreshPoints({
      providedPoints,
      pointsPath,
      viteDevServer,
      jiti,
      clientIndex: null,
    })

    const eversion = await Eversion.create({ points })

    const publicDir = await PublicDir.create({
      hostname: null,
      definition: input.publicDir,
      root: points.root,
      eversion,
    })

    const server = new ServerBun({
      ...input,
      points,
      pointsPath,
      providedPoints,
      publicDir,
      eversion,
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

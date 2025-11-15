import { Eversion } from '../core/eversion.js'
import type { Points } from '../core/points.js'
import type { RequiredCtx, RootId } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { EngineLogger, EngineOptionsPublicDirParsed, EngineOptionsViteConfig } from '../engine-shared/config.js'
import { createFreshPoints, createViteDevServer } from '../engine-shared/utils.js'
import type { ClientBun } from './client.js'
import { engineFetch } from './fetch.js'
import { PublicDir } from './public-dir.js'

export class ServerBun {
  cwd: string
  eversion: Eversion
  points: Points
  pointsPath: string | null
  providedPoints: Points | null
  port: number
  hmrPort: number | null
  clients: ClientBun[]
  logger: EngineLogger
  publicDir: PublicDir
  distDir: string | null
  fallbackRootId: RootId

  bunServer: Bun.Server<unknown> | undefined

  private constructor(input: {
    cwd: string
    points: Points
    pointsPath: string | null
    providedPoints: Points | null
    port: number
    hmrPort: number | null
    fallbackRootId: RootId
    logger: EngineLogger
    clients: ClientBun[]
    publicDir: PublicDir
    distDir: string | null
    eversion: Eversion
  }) {
    this.cwd = input.cwd
    this.eversion = input.eversion
    this.points = input.points
    this.pointsPath = input.pointsPath
    this.providedPoints = input.providedPoints
    this.port = input.port
    this.hmrPort = input.hmrPort
    this.clients = input.clients
    this.logger = input.logger
    this.publicDir = input.publicDir
    this.distDir = input.distDir
    this.fallbackRootId = input.fallbackRootId
  }

  static async create(input: {
    cwd: string
    points: Points | string
    viteConfig: EngineOptionsViteConfig | null
    port: number
    hmrPort: number | null
    publicDir: EngineOptionsPublicDirParsed
    distDir: string | null
    fallbackRootId: RootId
    logger: EngineLogger
    clients: ClientBun[]
  }): Promise<ServerBun> {
    const viteDevServer = !input.viteConfig
      ? null
      : await createViteDevServer({
          viteConfig: input.viteConfig,
          clientIndex: null,
          hmrPort: input.hmrPort,
        })

    const providedPoints = typeof input.points === 'string' ? null : input.points
    const pointsPath = typeof input.points === 'string' ? input.points : null
    const points = await createFreshPoints({
      providedPoints,
      pointsPath,
      viteDevServer,
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
      fetch: async (request, server) => {
        const parsedUrl = parseUrl(request.url)

        if (process.env.NODE_ENV !== 'production') {
          for (const client of this.clients) {
            const bunDevServerUpgradeWebSocketResult = await client.upgradeBunDevServerWebSocket(
              request,
              server,
              parsedUrl,
            )
            if (bunDevServerUpgradeWebSocketResult) {
              return bunDevServerUpgradeWebSocketResult.result
            }
            const viteDevServerResponse = await client.fetchViteDevServerMiddleware(request, parsedUrl)
            if (viteDevServerResponse) {
              return viteDevServerResponse
            }
            const bunDevServerResponse = await client.fetchBunDevServerMiddleware(request, parsedUrl)
            if (bunDevServerResponse) {
              return bunDevServerResponse
            }
          }
        }

        return await this.fetch({ parsedUrl, request, requiredCtx })
      },
      websocket: {
        open(ws) {
          if (process.env.NODE_ENV !== 'production') {
            // Only proxy WebSocket connections that have a wsUrl (Bun dev server connections)
            const data = ws.data as { wsUrl?: string; upstream?: WebSocket }
            if (!data.wsUrl) {
              return
            }

            // Connect to upstream WebSocket when client connects
            const upstream = new WebSocket(data.wsUrl)

            upstream.onopen = () => {
              // Store upstream reference in ws data
              data.upstream = upstream
            }

            upstream.onmessage = (event) => {
              // Forward messages from upstream to client
              ws.send(event.data)
            }

            upstream.onclose = () => {
              ws.close()
            }

            upstream.onerror = () => {
              ws.close()
            }

            // Store upstream for later use
            data.upstream = upstream
          }
        },
        message(ws, message) {
          // Forward messages from client to upstream (only for proxied connections)
          if (process.env.NODE_ENV !== 'production') {
            const data = ws.data as { upstream?: WebSocket }
            if (data.upstream && data.upstream.readyState === WebSocket.OPEN) {
              data.upstream.send(message)
            }
          }
        },
        close(ws) {
          if (process.env.NODE_ENV !== 'production') {
            // Clean up upstream connection when client disconnects
            const data = ws.data as { upstream?: WebSocket }
            if (data.upstream) {
              data.upstream.close()
            }
          }
        },
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

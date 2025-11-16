import type { BuildConfig } from 'bun'
import { Eversion } from '../core/eversion.js'
import type { Points } from '../core/points.js'
import type { RequiredCtx, RootId } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { EngineLogger, EngineOptionsPublicDirParsed } from '../engine-shared/config.js'
import { createFreshPoints } from '../engine-shared/utils.js'
import type { ClientBun } from './client.js'
import { engineFetch } from './fetch.js'
import { PublicDir } from './public-dir.js'
import * as nodeFs from 'node:fs/promises'

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
  entryFile: string | null
  publicDir: PublicDir
  distDir: string | null
  clientsDistDir: string | null
  publicDistDir: string | null
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
    entryFile: string | null
    publicDir: PublicDir
    distDir: string | null
    clientsDistDir: string | null
    publicDistDir: string | null
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
    this.entryFile = input.entryFile
    this.publicDir = input.publicDir
    this.distDir = input.distDir
    this.clientsDistDir = input.clientsDistDir
    this.publicDistDir = input.publicDistDir
    this.fallbackRootId = input.fallbackRootId
  }

  static async create(input: {
    cwd: string
    points: Points | string
    port: number
    hmrPort: number | null
    entryFile: string | null
    publicDir: EngineOptionsPublicDirParsed
    distDir: string | null
    clientsDistDir: string | null
    publicDistDir: string | null
    fallbackRootId: RootId
    logger: EngineLogger
    clients: ClientBun[]
  }): Promise<ServerBun> {
    const providedPoints = typeof input.points === 'string' ? null : input.points
    const pointsPath = typeof input.points === 'string' ? input.points : null
    // TODO:ASAP get pointsPath in production && distDir
    const points = await createFreshPoints({
      providedPoints,
      pointsPath,
      viteDevServer: null,
      clientIndex: null,
    })

    const eversion = await Eversion.create({ points })

    const publicDir = await PublicDir.create({
      hostname: null,
      definition: input.publicDir,
      root: points.root,
      eversion,
      distDir: input.publicDistDir,
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

  getBuildPaths(): {
    distDir: string | null
    entryFile: string | null
    entrypointsExists: boolean
  } {
    const entryFile = this.entryFile
    const entrypointsExists = !!entryFile
    return {
      distDir: this.distDir,
      entryFile,
      entrypointsExists,
    }
  }

  async cleanSelf(): Promise<void> {
    const distDir = this.distDir
    if (distDir) {
      await nodeFs.rm(distDir, { recursive: true })
    }
    await this.publicDir.clean().catch(() => {
      /* ignore */
    })
  }

  async buildSelf(buildConfig?: BuildConfig): Promise<boolean> {
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.entryFile) {
      return false
    }
    if (!buildPaths.distDir) {
      throw new Error(`distDir not provided for server`)
    }
    const NODE_ENV = process.env.NODE_ENV || 'production'
    await Bun.build({
      target: 'bun',
      packages: 'external',
      sourcemap: true,
      minify: false,
      ...buildConfig,
      entrypoints: [buildPaths.entryFile],
      outdir: buildPaths.distDir,
      define: {
        ...buildConfig?.define,
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'process.env.BUILD_TARGET': 'server',
      },
    })
    return true
  }

  async build(buildConfig?: BuildConfig): Promise<{ self: boolean; publicDir: boolean }> {
    await Promise.all([this.cleanSelf(), this.publicDir.clean()])
    const [self, publicDir] = await Promise.all([this.buildSelf(buildConfig), this.publicDir.build()])
    return { self, publicDir }
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

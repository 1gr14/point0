import type { BuildConfig } from 'bun'
import * as nodeFs from 'node:fs/promises'
import { Eversion } from '../core/eversion.js'
import type { Points } from '../core/points.js'
import type { RequiredCtx, RootId } from '../core/types.js'
import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { EngineLogger, EngineOptionsPublicDirParsed } from '../engine-shared/config.js'
import type { ClientBun } from './client.js'
import { engineFetch } from './fetch.js'
import { PublicDir } from './public-dir.js'

export class ServerBun {
  cwd: string
  eversion: Eversion
  points: Points
  port: number
  hmrPort: number | null
  clients: ClientBun[]
  logger: EngineLogger
  entry: Record<string, string> | null
  publicDir: PublicDir
  distDir: string | null
  clientsDistDir: string | null
  publicDistDir: string | null
  fallbackRootId: RootId

  bunServer: Bun.Server<unknown> | undefined

  private constructor(input: {
    cwd: string
    points: Points
    port: number
    hmrPort: number | null
    fallbackRootId: RootId
    logger: EngineLogger
    clients: ClientBun[]
    entry: Record<string, string> | null
    publicDir: PublicDir
    distDir: string | null
    clientsDistDir: string | null
    publicDistDir: string | null
    eversion: Eversion
  }) {
    this.cwd = input.cwd
    this.eversion = input.eversion
    this.points = input.points
    this.port = input.port
    this.hmrPort = input.hmrPort
    this.clients = input.clients
    this.logger = input.logger
    this.entry = input.entry
    this.publicDir = input.publicDir
    this.distDir = input.distDir
    this.clientsDistDir = input.clientsDistDir
    this.publicDistDir = input.publicDistDir
    this.fallbackRootId = input.fallbackRootId
  }

  static async create(input: {
    cwd: string
    points: Points
    port: number
    hmrPort: number | null
    entry: Record<string, string> | null
    publicDir: EngineOptionsPublicDirParsed
    distDir: string | null
    clientsDistDir: string | null
    publicDistDir: string | null
    fallbackRootId: RootId
    logger: EngineLogger
    clients: ClientBun[]
  }): Promise<ServerBun> {
    const eversion = await Eversion.create({ points: input.points })

    const publicDir = await PublicDir.create({
      hostname: null,
      definition: input.publicDir,
      root: input.points.root,
      eversion,
      distDir: input.publicDistDir,
    })

    const server = new ServerBun({
      ...input,
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
    entry: Record<string, string> | null
    entrypointsExists: boolean
  } {
    const entry = this.entry
    const entrypointsExists = !!entry
    return {
      distDir: this.distDir,
      entry,
      entrypointsExists,
    }
  }

  async cleanSelf(): Promise<boolean> {
    const distDir = this.distDir
    if (!distDir) {
      return false
    }
    await nodeFs.rm(distDir, { recursive: true })
    return true
  }

  async clean(): Promise<{ self: boolean; publicDir: boolean }> {
    const [self, publicDir] = await Promise.all([this.cleanSelf(), this.publicDir.clean()])
    return { self, publicDir }
  }

  async buildSelf(buildConfig?: BuildConfig): Promise<string[] | null> {
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.entry) {
      return null
    }
    if (!buildPaths.distDir) {
      throw new Error(`distDir not provided for server`)
    }
    const NODE_ENV = process.env.NODE_ENV || 'production'
    const buildOutput = await Bun.build({
      target: 'bun',
      packages: 'external',
      sourcemap: true,
      minify: false,
      ...buildConfig,
      entrypoints: Object.values(buildPaths.entry),
      naming: {
        entry: '[name].js',
      },
      outdir: buildPaths.distDir,
      define: {
        ...buildConfig?.define,
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'process.env.BUILD_TARGET': 'server',
        'process.env.ENGINE_WAS_BUILT': JSON.stringify(true),
      },
    })
    return buildOutput.outputs.map((output) => output.path)
  }

  async build(buildConfig?: BuildConfig): Promise<{ self: string[] | null; publicDir: string[] | null }> {
    await this.clean()
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

import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { Eversion } from '@point0/core/eversion'
import type { LazyPointsModule, ReadyPointsModule } from '@point0/core/points'
import { Points } from '@point0/core/points'
import type { PointsScope, RequiredCtx } from '@point0/core/types'
import { parseUrl, type ParsedUrl } from '@point0/core/utils'
import type { ClientBun } from './client.js'
import type { EngineLogger, EngineOptionsPublicdirParsed } from './config.js'
import { engineFetch } from './fetch.js'
import { Publicdir } from './publicdir.js'
import {
  extractServerBunBuildConfig,
  extractServerBunPlugins,
  getDirByPaths,
  loadBunPlugins,
  prependAndDeappendSlash,
  toJsExtension,
  validateEntrypoints,
  withError,
  type ServerBunBuildConfigDefinition,
  type ServerBunPluginsDefinition,
} from './utils.js'
import type { BunPlugin } from 'bun'

export class ServerBun<TInitialized extends boolean = boolean> {
  scope: PointsScope
  cwd: string
  eversion: TInitialized extends true ? Eversion : Eversion | null
  providedPoints: Points | null
  pointsFile: string | null
  points: TInitialized extends true ? Points : Points | null
  itWasBuilt: boolean
  engineFile: string | null
  cwdBeforeBuild: string
  port: number
  clients: TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
  logger: EngineLogger
  entry: Record<string, string> | null
  publicdir: TInitialized extends true ? Publicdir<true> : Publicdir<false>
  outdir: string | null
  bunBuildConfig: ServerBunBuildConfigDefinition
  bunPlugins: ServerBunPluginsDefinition
  publicdirOutdir: string | null
  fallbackScope: PointsScope
  initialized: TInitialized
  bunServer: Bun.Server<unknown> | undefined

  private constructor(input: {
    initialized: TInitialized
    cwd: string
    scope: PointsScope
    providedPoints: Points | null
    pointsFile: string | null
    points: Points | null
    itWasBuilt: boolean
    engineFile: string | null
    cwdBeforeBuild: string
    port: number
    fallbackScope: PointsScope
    logger: EngineLogger
    clients: ClientBun[]
    entry: Record<string, string> | null
    publicdir: Publicdir | null
    outdir: string | null
    bunBuildConfig: ServerBunBuildConfigDefinition
    bunPlugins: ServerBunPluginsDefinition
    publicdirOutdir: string | null
    eversion: Eversion | null
  }) {
    this.cwd = input.cwd
    this.eversion = input.eversion as TInitialized extends true ? Eversion : null
    this.scope = input.scope
    this.providedPoints = input.providedPoints
    this.pointsFile = input.pointsFile
    this.points = input.points as TInitialized extends true ? Points : null
    this.itWasBuilt = process.env.ENGINE_WAS_BUILT ? process.env.ENGINE_WAS_BUILT === 'true' : input.itWasBuilt
    this.engineFile = input.itWasBuilt ? (process.env.ENGINE_FILE_AFTER_BUILD ?? input.engineFile) : input.engineFile
    this.cwdBeforeBuild = process.env.ENGINE_CWD_BEFORE_BUILD ?? input.cwdBeforeBuild
    this.port = input.port
    this.clients = input.clients as TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
    this.logger = input.logger
    this.entry = input.entry
    this.publicdir = input.publicdir as TInitialized extends true ? Publicdir<true> : Publicdir<false>
    this.outdir = input.outdir
    this.bunBuildConfig = input.bunBuildConfig
    this.bunPlugins = input.bunPlugins
    this.publicdirOutdir = input.publicdirOutdir
    this.fallbackScope = input.fallbackScope
    this.initialized = input.initialized
  }

  static create(input: {
    cwd: string
    scope: PointsScope
    points: Points | string
    engineFile: string | null
    cwdBeforeBuild: string
    itWasBuilt: boolean
    port: number
    entry: Record<string, string> | null
    publicdir: EngineOptionsPublicdirParsed
    outdir: string | null
    bunBuildConfig: ServerBunBuildConfigDefinition
    bunPlugins: ServerBunPluginsDefinition
    publicdirOutdir: string | null
    fallbackScope: PointsScope
    logger: EngineLogger
    clients: ClientBun[]
  }): ServerBun<false> {
    const providedPoints = typeof input.points === 'string' ? null : input.points
    const pointsFile = typeof input.points === 'string' ? input.points : null
    const points = null

    const eversion = null

    const publicdir = Publicdir.create({
      hostname: null,
      definition: input.publicdir,
      root: null,
      eversion,
      outdir: input.publicdirOutdir,
    })

    const server = new ServerBun<false>({
      ...input,
      publicdir,
      eversion,
      points,
      pointsFile,
      providedPoints,
      initialized: false,
    })
    return server
  }

  isInitialized(): this is ServerBun<true> {
    return !!this.initialized
  }

  async init(): Promise<ServerBun<true>> {
    if (this.isInitialized()) {
      return this as ServerBun<true>
    }

    const points = await ServerBun.createPoints({
      providedPoints: this.providedPoints,
      pointsFile: this.pointsFile,
    })
    this.eversion = await Eversion.create({ points })
    await this.publicdir.init({ root: points.root, eversion: this.eversion })
    this.initialized = true as never
    return this as ServerBun<true>
  }

  static readonly createPoints = async ({
    providedPoints,
    pointsFile,
  }: {
    providedPoints: Points | null
    pointsFile: string | null
  }): Promise<Points> => {
    if (providedPoints) {
      return providedPoints
    }
    if (pointsFile) {
      return Points.create(
        await withError(
          async () => (await import(toJsExtension(pointsFile))) as LazyPointsModule | ReadyPointsModule,
          `Failed to import points from ${pointsFile} on server`,
        ),
      )
    }
    throw new Error(`Points not provided for server`)
  }

  async extractBunPlugins(): Promise<BunPlugin[]> {
    const extractedPlugins = await extractServerBunPlugins({
      nodeEnv: process.env.NODE_ENV,
      command: 'serve',
      bunPlugins: this.bunPlugins,
    })
    const extractedBunPlugins = [...extractedPlugins]
    return extractedBunPlugins
  }

  async loadBunPlugins(): Promise<void> {
    const extractedBunPlugins = await this.extractBunPlugins()
    await loadBunPlugins({ extractedBunPlugins })
  }

  async serve({
    requiredCtx,
    loadPlugins = process.env.NODE_ENV !== 'production',
  }: {
    requiredCtx: RequiredCtx
    loadPlugins?: boolean
  }): Promise<void> {
    if (loadPlugins) {
      await this.loadBunPlugins()
    }
    this.bunServer = Bun.serve({
      port: this.port,
      fetch: async (request, server) => {
        const parsedUrl = parseUrl(request.url)

        if (process.env.NODE_ENV !== 'production') {
          for (const client of this.clients) {
            const bunDevServerUpgradeWebSocketResult = await client.upgradeProxyBunDevServerWebSocket(
              request,
              server,
              parsedUrl,
            )
            if (bunDevServerUpgradeWebSocketResult) {
              return bunDevServerUpgradeWebSocketResult.result
            }
            const clientViteDevServerResponse = await client.fetchClientViteDevServerMiddleware(request, parsedUrl)
            if (clientViteDevServerResponse) {
              return clientViteDevServerResponse
            }
            const clientBunDevServerResponse = await client.fetchClientBunDevServerMiddleware(request, parsedUrl)
            if (clientBunDevServerResponse) {
              return clientBunDevServerResponse
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
    outdir: string | null
    entryFiles: string[]
    pointsFile: string | null
    engineFile: string | null
    entrypointsExists: boolean
  } {
    const entryFiles = this.entry ? Object.values(this.entry) : []
    const entrypointsExists = entryFiles.length > 0 || !!this.engineFile || !!this.pointsFile
    return {
      outdir: this.outdir,
      entryFiles,
      pointsFile: this.pointsFile,
      engineFile: this.engineFile,
      entrypointsExists,
    }
  }

  async cleanSelf(): Promise<boolean> {
    const outdir = this.outdir
    if (!outdir) {
      return false
    }
    // TODO: add if exists check on all clean methods
    await nodeFs.rm(outdir, { recursive: true }).catch(() => {
      /* ignore */
    })
    return true
  }

  async clean(): Promise<{ self: boolean; publicdir: boolean }> {
    const [self, publicdir] = await Promise.all([this.cleanSelf(), this.publicdir.clean()])
    return { self, publicdir }
  }

  async buildSelf(bunBuildConfig: ServerBunBuildConfigDefinition = {}): Promise<string[] | null> {
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.entrypointsExists) {
      return null
    }
    if (!buildPaths.outdir) {
      throw new Error(`outdir not provided for server`)
    }

    const NODE_ENV = process.env.NODE_ENV

    const thisBunBuildConfig = await extractServerBunBuildConfig({
      nodeEnv: NODE_ENV,
      bunBuildConfig: this.bunBuildConfig,
      bunPlugins: this.bunPlugins,
    })
    const providedBunBuildConfig = await extractServerBunBuildConfig({
      nodeEnv: NODE_ENV,
      bunBuildConfig,
      bunPlugins: [],
    })

    const ENGINE_CWD_BEFORE_BUILD_LOCAL = (() => {
      if (this.cwdBeforeBuild) {
        return this.cwdBeforeBuild
      }
      if (this.engineFile) {
        return nodePath.dirname(this.engineFile)
      }
      return null
    })()
    const ENGINE_CWD_AFTER_BUILD_LOCAL = (() => {
      if (!ENGINE_CWD_BEFORE_BUILD_LOCAL) {
        return null
      }
      if (this.outdir) {
        return nodePath.resolve(this.cwdBeforeBuild, this.outdir)
      }
      return null
    })()
    const { ENGINE_CWD_BEFORE_BUILD_CUTTED, ENGINE_CWD_AFTER_BUILD_CUTTED } = (() => {
      if (!ENGINE_CWD_BEFORE_BUILD_LOCAL || !ENGINE_CWD_AFTER_BUILD_LOCAL) {
        return {
          ENGINE_CWD_BEFORE_BUILD_CUTTED: null,
          ENGINE_CWD_AFTER_BUILD_CUTTED: null,
        }
      }
      const localDir = getDirByPaths({
        paths: [ENGINE_CWD_BEFORE_BUILD_LOCAL, ENGINE_CWD_AFTER_BUILD_LOCAL],
      })
      return {
        ENGINE_CWD_BEFORE_BUILD_CUTTED: prependAndDeappendSlash(ENGINE_CWD_BEFORE_BUILD_LOCAL.replace(localDir, '')),
        ENGINE_CWD_AFTER_BUILD_CUTTED: prependAndDeappendSlash(ENGINE_CWD_AFTER_BUILD_LOCAL.replace(localDir, '')),
      }
    })()

    const injectedEnvs = {
      'process.env.ENGINE_WAS_BUILT': JSON.stringify('true'),
      ...(ENGINE_CWD_BEFORE_BUILD_CUTTED
        ? { 'process.env.ENGINE_CWD_BEFORE_BUILD': JSON.stringify(ENGINE_CWD_BEFORE_BUILD_CUTTED) }
        : {}),
      ...(ENGINE_CWD_AFTER_BUILD_CUTTED
        ? { 'process.env.ENGINE_CWD_AFTER_BUILD': JSON.stringify(ENGINE_CWD_AFTER_BUILD_CUTTED) }
        : {}),
    }
    const injectEnvsScript =
      Object.entries(injectedEnvs)
        .map(([key, value]) => `${key}=${value};`)
        .join('\n') + '\n'
    const buildOutput = await Bun.build({
      target: 'bun',
      packages: 'external',
      sourcemap: 'linked',
      minify: true,
      splitting: true,
      ...thisBunBuildConfig,
      ...providedBunBuildConfig,
      plugins: [
        ...(thisBunBuildConfig.plugins ?? []),
        ...(providedBunBuildConfig.plugins ?? []),
        ...(await this.extractBunPlugins()),
      ],
      banner: [injectEnvsScript, thisBunBuildConfig.banner, providedBunBuildConfig.banner].filter(Boolean).join('\n'),
      entrypoints: validateEntrypoints([
        ...buildPaths.entryFiles,
        buildPaths.engineFile,
        buildPaths.pointsFile,
        ...(thisBunBuildConfig.entrypoints ?? []),
        ...(providedBunBuildConfig.entrypoints ?? []),
      ]),
      naming: {
        ...(typeof thisBunBuildConfig.naming === 'object' ? thisBunBuildConfig.naming : {}),
        ...(typeof providedBunBuildConfig.naming === 'object' ? providedBunBuildConfig.naming : {}),
        entry: '[name].js',
      },
      outdir: buildPaths.outdir,
      define: {
        ...thisBunBuildConfig.define,
        ...providedBunBuildConfig.define,
        ...(NODE_ENV ? { 'process.env.NODE_ENV': JSON.stringify(NODE_ENV) } : {}),
        ...injectedEnvs,
      },
    })
    return buildOutput.outputs.map((output) => output.path)
  }

  async build(
    bunBuildConfig: ServerBunBuildConfigDefinition = {},
  ): Promise<{ self: string[] | null; publicdir: string[] | null }> {
    await this.clean()
    const [self, publicdir] = await Promise.all([this.buildSelf(bunBuildConfig), this.publicdir.build()])
    return { self, publicdir }
  }

  async fetch({
    parsedUrl,
    request,
    requiredCtx,
    scope,
  }: {
    parsedUrl?: ParsedUrl
    request: Request
    requiredCtx: RequiredCtx
    scope?: PointsScope
  }): Promise<Response> {
    if (!this.isInitialized()) {
      throw new Error('Server is not initialized')
    }

    return await engineFetch({
      server: this,
      clients: this.clients,
      eversion: this.eversion,
      request,
      parsedUrl,
      fallbackScope: scope ?? this.fallbackScope,
      scope,
      requiredCtx,
      logger: this.logger,
    })
  }
}

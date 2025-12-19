import type { ParsedUrl, PointsScope, RequiredCtx } from '@point0/core'
import { PointsManager, prependAndDeappendSlash } from '@point0/core'
import type { BunPlugin } from 'bun'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { ViteDevServer } from 'vite'
import type { AllPointsManagers } from './all-points-managers.js'
import type { ClientBun } from './client.js'
import type {
  EngineLogger,
  EngineOptionsPoints,
  EngineOptionsPublicdirParsed,
  EngineOptionsViteConfig,
  ExtractedViteConfig,
} from './config.js'
import { engineFetch } from './fetch.js'
import { Publicdir } from './publicdir.js'
import type { ServerBunBuildConfigDefinition, ServerBunPluginsDefinition } from './utils.js'
import {
  createViteDevServer,
  executeServerBunBuildConfig,
  extractServerBunPlugins,
  extractViteConfig,
  getDirByPaths,
  loadBunPlugins,
  pruneItWhenPoint0ServerBuildInProgress,
  removeLikeJsExtension,
  validateEntrypoints,
} from './utils.js'

export class ServerBun<TInitialized extends boolean = boolean> {
  scope: PointsScope
  cwd: string
  allPointsManagers: AllPointsManagers
  pointsManager: PointsManager | null
  pointsProvided: EngineOptionsPoints | null
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
  bunPluginsLoaded = false
  bunServer: Bun.Server<unknown> | undefined
  viteConfig: EngineOptionsViteConfig | null
  viteDevServer: ViteDevServer | null
  hmrPort: number | null

  private constructor(input: {
    initialized: TInitialized
    cwd: string
    scope: PointsScope
    pointsProvided: EngineOptionsPoints | null
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
    allPointsManagers: AllPointsManagers
    viteConfig: EngineOptionsViteConfig | null
    viteDevServer: ViteDevServer | null
    hmrPort: number | null
  }) {
    this.cwd = input.cwd
    this.allPointsManagers = input.allPointsManagers
    this.scope = input.scope
    this.pointsProvided = input.pointsProvided
    this.pointsManager = null as TInitialized extends true ? PointsManager : null
    this.itWasBuilt = process.env.POINT0_ENGINE_WAS_BUILT
      ? process.env.POINT0_ENGINE_WAS_BUILT === 'true'
      : input.itWasBuilt
    this.engineFile = input.itWasBuilt
      ? (process.env.POINT0_ENGINE_FILE_AFTER_BUILD ?? input.engineFile)
      : input.engineFile
    this.cwdBeforeBuild = process.env.POINT0_ENGINE_CWD_BEFORE_BUILD ?? input.cwdBeforeBuild
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
    this.viteConfig = input.viteConfig
    this.viteDevServer = input.viteDevServer
    this.hmrPort = input.hmrPort
  }

  static create(input: {
    cwd: string
    scope: PointsScope
    pointsProvided: EngineOptionsPoints | null
    allPointsManagers: AllPointsManagers
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
    viteConfig: EngineOptionsViteConfig | null
    hmrPort: number | null
  }): ServerBun<false> {
    const publicdir = Publicdir.create({
      hostname: null,
      definition: input.publicdir,
      outdir: input.publicdirOutdir,
      scope: input.scope,
    })

    const viteDevServer = null

    const server = new ServerBun<false>({
      ...input,
      publicdir,
      initialized: false,
      viteDevServer,
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
    await Promise.all([this.loadBunPlugins().then(async () => await this.initPointsManager()), this.publicdir.init()])
    this.initialized = true as never
    return this as ServerBun<true>
  }

  async initPointsManager(): Promise<PointsManager | null> {
    if (!this.pointsProvided) {
      return null
    }
    // const importPath = getDevPathInsideImportFn(this.pointsProvided, this.engineFile)
    // if (!importPath && process.env.NODE_ENV !== 'production') {
    //   console.warn(
    //     `While preoviding points in fn, you should use () => await import('yor/path/to/points.ts') strictly like this, or you will not get HRM in bun, becouse of bun bug`,
    //   )
    // }
    // const pointsManager = PointsManager.create(importPath ? await import(importPath) : await this.pointsProvided())
    // await pointsManager.load()
    // this.pointsManager = pointsManager
    // return pointsManager
    const pointsManager = PointsManager.create(await this.pointsProvided())
    this.pointsManager = pointsManager as TInitialized extends true ? PointsManager : PointsManager | null
    return pointsManager
  }

  async extractBunPlugins(): Promise<BunPlugin[]> {
    const extractedPlugins = await extractServerBunPlugins({
      nodeEnv: process.env.NODE_ENV ?? 'development',
      command: 'serve',
      bunPlugins: this.bunPlugins,
    })
    const prunePlugin = this.viteConfig // we inject vite prune plugin in vite config
      ? []
      : [
          await import('./pruner-bun.js').then((module) =>
            module.prunerBunPlugin({
              customer: 'server',
              scope: null,
            }),
          ),
        ]
    const extractedBunPlugins = [...extractedPlugins, ...prunePlugin]
    return extractedBunPlugins
  }

  async loadBunPlugins(): Promise<void> {
    if (this.bunPluginsLoaded) {
      return
    }
    const extractedBunPlugins = await this.extractBunPlugins()
    await loadBunPlugins({ extractedBunPlugins })
    this.bunPluginsLoaded = true
  }

  async startViteDevServer(): Promise<ViteDevServer> {
    if (!this.viteConfig) {
      throw new Error(`Vite config not found for server`)
    }
    const viteDevServer = await createViteDevServer({
      viteConfig: this.viteConfig,
      scope: this.scope,
      customer: 'server',
      hmrPort: this.hmrPort,
    })
    this.viteDevServer = viteDevServer
    return viteDevServer
  }

  async loadViteDevEntry(options: { hot?: boolean; entry: string; viteDevServer: ViteDevServer }): Promise<any> {
    const { hot = true, entry, viteDevServer } = options
    if (!this.viteConfig) {
      throw new Error(`Vite config not found for server`)
    }
    // const viteDevServer = this.viteDevServer
    // if (!viteDevServer) {
    //   throw new Error(`Vite dev server not started for server`)
    // }
    const entryPath = this.entry?.[entry]
    if (!entryPath) {
      throw new Error(`Entry point not found for server by name "${entry}"`)
    }
    // const loadedModule = await this.viteDevServer.ssrLoadModule(entryPath)
    if (!hot) {
      await viteDevServer.ssrLoadModule(entryPath)
      return
    }

    let serverModule: any
    let dispose: (() => Promise<void>) | undefined
    const load = async () => {
      try {
        // await new Promise((resolve) => setTimeout(resolve, 1000))
        if (dispose) {
          await dispose()
          dispose = undefined
        }
        serverModule = await viteDevServer.ssrLoadModule(entryPath)
        dispose = serverModule.dispose
        if (!dispose) {
          throw new Error(`Dispose function not exported from server entry point "${entry}": ${entryPath}`)
        }
      } catch (error) {
        console.error(`Error loading entry point "${entry}"`, error)
      }
    }
    await load()
    viteDevServer.watcher.on('change', (file) => {
      if (file.includes('/src/')) {
        void load()
      }
    })
  }

  async loadViteDevEntries(options: {
    hot?: boolean
    entries?: string[]
    viteDevServer: ViteDevServer
  }): Promise<void> {
    if (!this.viteConfig) {
      throw new Error(`Vite config not found for server`)
    }
    const { hot, entries = Object.keys(this.entry || {}), viteDevServer } = options
    await Promise.all(entries.map(async (entry) => await this.loadViteDevEntry({ hot, entry, viteDevServer })))
  }

  serve({ requiredCtx }: { requiredCtx: RequiredCtx }): void {
    if (!this.isInitialized()) {
      throw new Error('Server is not initialized')
    }
    this.bunServer = Bun.serve({
      port: this.port,
      fetch: async (request, bunServer) => {
        const response = await this.fetch({ request, requiredCtx, bunServer })

        // Add CORS headers in dev mode for requests from localhost with client ports (for vite development)
        if (process.env.NODE_ENV !== 'production') {
          const origin = request.headers.get('origin')
          if (origin) {
            const originUrl = new URL(origin)
            // Check if origin is localhost and port matches any client port
            const isLocalhostClient =
              originUrl.hostname === 'localhost' &&
              this.clients.some((client) => originUrl.port === String(client.port))

            if (isLocalhostClient) {
              // Handle preflight OPTIONS requests
              if (request.method === 'OPTIONS') {
                const requestedHeaders = request.headers.get('Access-Control-Request-Headers')
                return new Response(null, {
                  status: 204,
                  headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                    'Access-Control-Allow-Headers': requestedHeaders || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Max-Age': '86400',
                  },
                })
              }

              // Add CORS headers to the response
              const newHeaders = new Headers(response.headers)
              newHeaders.set('Access-Control-Allow-Origin', origin)
              newHeaders.set('Access-Control-Allow-Credentials', 'true')
              // Expose all response headers (can't use * with credentials, so list them)
              const exposedHeaders: string[] = []
              response.headers.forEach((_, key) => {
                exposedHeaders.push(key)
              })
              if (exposedHeaders.length > 0) {
                newHeaders.set('Access-Control-Expose-Headers', exposedHeaders.join(', '))
              }

              return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
              })
            }
          }
        }

        return response
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

  async dispose(): Promise<void> {
    if (!this.isInitialized()) {
      throw new Error('Server is not initialized')
    }
    if (this.bunServer) {
      await this.bunServer.stop()
    }
    // it is always running in separate process, so we can not close it here
    // if (this.viteDevServer) {
    //   await this.viteDevServer.close()
    // }
  }

  getBuildPaths(): {
    outdir: string | null
    entryFiles: string[]
    engineFile: string | null
    entrypointsExists: boolean
  } {
    const entryFiles = this.entry ? Object.values(this.entry) : []
    const entrypointsExists = entryFiles.length > 0 || !!this.engineFile
    return {
      outdir: this.outdir,
      entryFiles,
      engineFile: this.engineFile,
      entrypointsExists,
    }
  }

  async cleanServer(): Promise<boolean> {
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

  async clean(): Promise<{ server: boolean; publicdir: boolean }> {
    const [server, publicdir] = await Promise.all([this.cleanServer(), this.publicdir.clean()])
    return { server, publicdir }
  }

  getBuildInjectedEnvs(): {
    injectedEnvs: Record<string, string>
    injectEnvsScript: string
  } {
    const POINT0_ENGINE_CWD_BEFORE_BUILD_LOCAL = (() => {
      if (this.cwdBeforeBuild) {
        return this.cwdBeforeBuild
      }
      if (this.engineFile) {
        return nodePath.dirname(this.engineFile)
      }
      return null
    })()
    const POINT0_ENGINE_CWD_AFTER_BUILD_LOCAL = (() => {
      if (!POINT0_ENGINE_CWD_BEFORE_BUILD_LOCAL) {
        return null
      }
      if (this.outdir) {
        return nodePath.resolve(this.cwdBeforeBuild, this.outdir)
      }
      return null
    })()
    const { POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED, POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED } = (() => {
      if (!POINT0_ENGINE_CWD_BEFORE_BUILD_LOCAL || !POINT0_ENGINE_CWD_AFTER_BUILD_LOCAL) {
        return {
          POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED: null,
          POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED: null,
        }
      }
      const localDir = getDirByPaths({
        paths: [POINT0_ENGINE_CWD_BEFORE_BUILD_LOCAL, POINT0_ENGINE_CWD_AFTER_BUILD_LOCAL],
      })
      return {
        POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED: prependAndDeappendSlash(
          POINT0_ENGINE_CWD_BEFORE_BUILD_LOCAL.replace(localDir, ''),
        ),
        POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED: prependAndDeappendSlash(
          POINT0_ENGINE_CWD_AFTER_BUILD_LOCAL.replace(localDir, ''),
        ),
      }
    })()

    const injectedEnvs = {
      'process.env.POINT0_ENGINE_WAS_BUILT': JSON.stringify('true'),
      ...(POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED
        ? { 'process.env.POINT0_ENGINE_CWD_BEFORE_BUILD': JSON.stringify(POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED) }
        : {}),
      ...(POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED
        ? { 'process.env.POINT0_ENGINE_CWD_AFTER_BUILD': JSON.stringify(POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED) }
        : {}),
    }
    const injectEnvsScript =
      Object.entries(injectedEnvs)
        .map(([key, value]) => `${key}=${value};`)
        .join('\n') + '\n'
    return { injectedEnvs, injectEnvsScript }
  }

  async buildByBun(options?: {
    bunBuildConfig?: ServerBunBuildConfigDefinition
    clean?: boolean
  }): Promise<string[] | null> {
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.entrypointsExists) {
      return null
    }
    if (!buildPaths.outdir) {
      throw new Error(`outdir not provided for server`)
    }

    const { bunBuildConfig, clean = false } = options ?? {}
    if (clean) {
      await this.cleanServer()
    }

    const NODE_ENV = process.env.NODE_ENV || 'production'
    process.env.NODE_ENV = NODE_ENV

    const thisBunBuildConfig = await executeServerBunBuildConfig({
      nodeEnv: NODE_ENV,
      bunBuildConfig: this.bunBuildConfig,
      bunPlugins: this.bunPlugins,
    })
    const providedBunBuildConfig = bunBuildConfig
      ? await executeServerBunBuildConfig({
          nodeEnv: NODE_ENV,
          bunBuildConfig,
          bunPlugins: [],
        })
      : {}

    const { injectedEnvs, injectEnvsScript } = this.getBuildInjectedEnvs()

    process.env.POINT0_SERVER_BUILD_IN_PROGRESS = 'true'
    const buildOutput = await Bun.build({
      target: 'bun',
      // packages: 'external',
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
        ...injectedEnvs,
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
      },
    })
    process.env.POINT0_SERVER_BUILD_IN_PROGRESS = 'false'
    return buildOutput.outputs.map((output) => output.path)
  }

  async buildByVite(options?: { clean?: boolean }): Promise<string[] | null> {
    return await pruneItWhenPoint0ServerBuildInProgress(async () => {
      if (!this.viteConfig) {
        throw new Error(`viteConfig not provided for server`)
      }
      const { build: viteBuild } = await import('vite')

      const buildPaths = this.getBuildPaths()
      if (!buildPaths.entrypointsExists) {
        return null
      }
      if (!buildPaths.outdir) {
        throw new Error(`outdir not provided for server`)
      }

      const { clean = false } = options ?? {}
      if (clean) {
        await this.cleanServer()
      }

      const NODE_ENV = process.env.NODE_ENV || 'production'

      const loadedViteConfig = await extractViteConfig({
        viteConfig: this.viteConfig,
        command: 'build',
        customer: 'server',
      })

      const { injectedEnvs, injectEnvsScript } = this.getBuildInjectedEnvs()

      const existingRollupOptionsOutput = loadedViteConfig.build?.rollupOptions?.output
      const normalizedExistsingRollupOptionsOutput =
        (Array.isArray(existingRollupOptionsOutput) ? existingRollupOptionsOutput[0] : existingRollupOptionsOutput) ||
        {}

      const rollupOptionsOutput: Extract<
        NonNullable<NonNullable<ExtractedViteConfig['build']>['rollupOptions']>['output'],
        object
      > = {
        ...normalizedExistsingRollupOptionsOutput,
        banner: [injectEnvsScript, normalizedExistsingRollupOptionsOutput.banner].filter(Boolean).join('\n'),
      }
      const fixedExistingRollupOptionsOutput = Array.isArray(existingRollupOptionsOutput)
        ? [rollupOptionsOutput, ...existingRollupOptionsOutput.slice(1)]
        : rollupOptionsOutput

      const viteRoot =
        loadedViteConfig.root || (typeof this.viteConfig === 'string' && nodePath.dirname(this.viteConfig)) || this.cwd

      const prunePlugin = await import('./pruner-vite.js').then((module) =>
        module.prunerVitePlugin({ customer: 'server', scope: this.scope }),
      )

      const config: ExtractedViteConfig = {
        ...loadedViteConfig,
        plugins: [...(loadedViteConfig.plugins ?? []), prunePlugin],
        root: viteRoot,
        build: {
          ...loadedViteConfig.build,
          outDir: buildPaths.outdir,
          minify: loadedViteConfig.build?.minify ?? true,
          sourcemap: loadedViteConfig.build?.sourcemap ?? true,
          ssr: true,
          rollupOptions: {
            ...loadedViteConfig.build?.rollupOptions,
            input: {
              // ...Object.fromEntries(
              //   validateEntrypoints([...buildPaths.entryFiles, buildPaths.engineFile]).map((entryFile) => [
              //     removeLikeJsExtension(nodePath.basename(entryFile)),
              //     entryFile,
              //   ]),
              // ),
              ...this.entry,
              ...(this.engineFile ? { engine: this.engineFile } : {}),
            },
            // external: createRollupOptionsExternalFunction(),
            output: fixedExistingRollupOptionsOutput,
          },
          copyPublicDir: false,
          emptyOutDir: false,
        },
        define: {
          ...loadedViteConfig.define,
          ...injectedEnvs,
          'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
          'process.env.POINT0_CUSTOMER': JSON.stringify('server'),
          'process.env.POINT0_SCOPE': JSON.stringify(this.scope),
        },
      }
      process.env.POINT0_SERVER_BUILD_IN_PROGRESS = 'true'
      const buildResult = await viteBuild(config)
      process.env.POINT0_SERVER_BUILD_IN_PROGRESS = 'false'

      const rollupOutputs = Array.isArray(buildResult) ? buildResult : [buildResult]
      const outputFiles: string[] = []
      for (const rollupOutput of rollupOutputs) {
        if ('output' in rollupOutput) {
          const chunks = Array.isArray(rollupOutput.output) ? rollupOutput.output : []
          for (const chunk of chunks) {
            if ('fileName' in chunk && typeof chunk.fileName === 'string') {
              outputFiles.push(nodePath.resolve(buildPaths.outdir, chunk.fileName))
            }
          }
        }
      }
      return outputFiles
    })
  }

  async buildServer(options?: {
    bunBuildConfig?: ServerBunBuildConfigDefinition
    clean?: boolean
  }): Promise<string[] | null> {
    const { bunBuildConfig, clean } = options ?? {}
    if (this.viteConfig) {
      return await this.buildByVite({ clean })
    } else {
      return await this.buildByBun({ bunBuildConfig, clean })
    }
  }

  async build(options?: {
    bunBuildConfig?: ServerBunBuildConfigDefinition
    publicdir?: boolean
    clean?: boolean
  }): Promise<{ server: string[] | null; publicdir: string[] | null }> {
    const { bunBuildConfig, clean = false, publicdir = true } = options ?? {}
    if (clean) {
      await this.clean()
    }
    const [server, publicdirBuildOutput] = await Promise.all([
      this.buildServer({ bunBuildConfig, clean: false }), // we clean already before
      !publicdir ? null : this.publicdir.build({ clean: false }), // we clean already before
    ])
    return { server, publicdir: publicdirBuildOutput }
  }

  async fetch({
    bunServer,
    parsedUrl,
    request,
    requiredCtx,
    scope,
  }: {
    bunServer?: Bun.Server<unknown>
    parsedUrl?: ParsedUrl
    request: Request
    requiredCtx: RequiredCtx
    scope?: PointsScope
  }): Promise<Response> {
    if (!this.isInitialized()) {
      throw new Error('Server is not initialized')
    }

    return await engineFetch({
      bunServer,
      server: this,
      clients: this.clients,
      allPointsManagers: this.allPointsManagers,
      request,
      parsedUrl,
      fallbackScope: scope ?? this.fallbackScope,
      scope,
      requiredCtx,
      logger: this.logger,
    })
  }
}

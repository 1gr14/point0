import type {
  FetcherFetchDetailedResult,
  NormalizedNodeEnv,
  PointsDefinitionSource,
  PointsScope,
  RequiredCtx,
} from '@point0/core'
import { env, getHostnameOrNull, prependAndDeappendSlash } from '@point0/core'
import type { BunPlugin } from 'bun'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { ViteDevServer } from 'vite'
import type { CompilerOptions } from '../../compiler/dist/compiler.js'
import type { EngineClient } from './client.js'
import type {
  EngineLogger,
  EngineOptionsCompilerSpecificParsed,
  EngineOptionsEnvParsed,
  EngineOptionsViteConfig,
  ExtractedViteConfig,
} from './config.js'
import type { Engine } from './engine.js'
import { Fetcher } from './fetcher.js'
import type { PublicdirDefinition } from './publicdir.js'
import { Publicdir } from './publicdir.js'
import { ServerPoints } from './server-points.js'
import type { EngineServerBuildConfigDefinition, EngineServerPluginsDefinition } from './utils.js'
import {
  createViteDevServer,
  executeEngineServerBuildConfig,
  extractEngineServerPlugins,
  extractViteConfig,
  getDirByPaths,
  loadBunPlugins,
  normalizeAndValidateNodeEnv,
  validateEntrypoints,
  withRetries,
} from './utils.js'

export class EngineServer<TInitialized extends boolean = boolean> {
  scope: PointsScope
  cwd: string
  points: TInitialized extends true ? ServerPoints | null : undefined
  pointsProvided: PointsDefinitionSource | null
  itWasBuilt: boolean
  engineFile: string | null
  cwdBeforeBuild: string
  port: number
  clients: TInitialized extends true ? Array<EngineClient<true>> : EngineClient[]
  logger: EngineLogger
  entry: Record<string, string> | null
  publicdir: TInitialized extends true ? Publicdir<true> | null : Publicdir<false> | null
  // it is collection of server itself public dir and all its clients public dirs
  publicdirs: TInitialized extends true ? Array<Publicdir<true>> : Array<Publicdir<false>>
  outdir: string | null
  bunBuildConfig: EngineServerBuildConfigDefinition
  bunPlugins: EngineServerPluginsDefinition
  baseurl: TInitialized extends true ? string | null : undefined
  initialized: TInitialized
  bunPluginsLoaded = false
  bunServer: Bun.Server<unknown> | undefined
  viteConfig: EngineOptionsViteConfig | null
  viteDevServer: ViteDevServer | null
  envConsts: EngineOptionsEnvParsed
  envVars: EngineOptionsEnvParsed
  hmrPort: number | false
  fetcher: TInitialized extends true ? Fetcher : null
  compiler: EngineOptionsCompilerSpecificParsed | false

  private constructor(input: {
    initialized: TInitialized
    cwd: string
    scope: PointsScope
    pointsProvided: PointsDefinitionSource | null
    itWasBuilt: boolean
    engineFile: string | null
    cwdBeforeBuild: string
    port: number
    logger: EngineLogger
    clients: EngineClient[]
    envConsts: EngineOptionsEnvParsed
    envVars: EngineOptionsEnvParsed
    entry: Record<string, string> | null
    publicdir: Publicdir<false> | null
    outdir: string | null
    bunBuildConfig: EngineServerBuildConfigDefinition
    bunPlugins: EngineServerPluginsDefinition
    viteConfig: EngineOptionsViteConfig | null
    viteDevServer: ViteDevServer | null
    hmrPort: number | false
    compiler: EngineOptionsCompilerSpecificParsed | false
  }) {
    this.cwd = input.cwd
    this.scope = input.scope
    this.pointsProvided = input.pointsProvided
    this.points = undefined as TInitialized extends true ? ServerPoints : undefined
    this.itWasBuilt = process.env.POINT0_ENGINE_WAS_BUILT
      ? process.env.POINT0_ENGINE_WAS_BUILT === 'true'
      : input.itWasBuilt
    this.engineFile = input.itWasBuilt
      ? (process.env.POINT0_ENGINE_FILE_AFTER_BUILD ?? input.engineFile)
      : input.engineFile
    this.envConsts = input.envConsts
    this.envVars = input.envVars
    this.cwdBeforeBuild = process.env.POINT0_ENGINE_CWD_BEFORE_BUILD ?? input.cwdBeforeBuild
    this.port = input.port
    this.clients = input.clients as TInitialized extends true ? Array<EngineClient<true>> : EngineClient[]
    this.logger = input.logger
    this.entry = input.entry
    this.publicdir = input.publicdir as TInitialized extends true ? Publicdir<true> | null : Publicdir<false> | null
    this.publicdirs = [] as unknown as TInitialized extends true ? Array<Publicdir<true>> : Array<Publicdir<false>>
    this.outdir = input.outdir
    this.bunBuildConfig = input.bunBuildConfig
    this.bunPlugins = input.bunPlugins
    this.initialized = input.initialized
    this.viteConfig = input.viteConfig
    this.viteDevServer = input.viteDevServer
    this.hmrPort = input.hmrPort
    this.compiler = input.compiler
    this.baseurl = undefined as TInitialized extends true ? string | null : undefined
    this.fetcher = null as TInitialized extends true ? Fetcher : null
  }

  static create(input: {
    cwd: string
    scope: PointsScope
    pointsProvided: PointsDefinitionSource | null
    engineFile: string | null
    cwdBeforeBuild: string
    itWasBuilt: boolean
    port: number
    entry: Record<string, string> | null
    publicdir: {
      source: PublicdirDefinition
      outdir: string
    } | null
    envConsts: EngineOptionsEnvParsed
    envVars: EngineOptionsEnvParsed
    outdir: string | null
    bunBuildConfig: EngineServerBuildConfigDefinition
    bunPlugins: EngineServerPluginsDefinition
    logger: EngineLogger
    clients: EngineClient[]
    viteConfig: EngineOptionsViteConfig | null
    hmrPort: number | false
    compiler: EngineOptionsCompilerSpecificParsed | false
  }): EngineServer<false> {
    const publicdir = input.publicdir
      ? Publicdir.create({
          hostname: null,
          source: input.publicdir.source,
          outdir: input.publicdir.outdir,
          scope: input.scope,
          server: null,
          client: null,
        })
      : null

    const viteDevServer = null

    const server = new EngineServer<false>({
      ...input,
      publicdir,
      initialized: false,
      viteDevServer,
    })
    if (publicdir) {
      publicdir.server = server
    }
    return server
  }

  isInitialized(): this is EngineServer<true> {
    return !!this.initialized
  }

  private setEnvVars({
    nodeEnvFallback,
    assignToProcessEnv,
  }: {
    nodeEnvFallback: NormalizedNodeEnv | undefined
    assignToProcessEnv: boolean
  }): { NODE_ENV: NormalizedNodeEnv; POINT0_SCOPE: PointsScope; POINT0_SIDE: 'server' } {
    const NODE_ENV = normalizeAndValidateNodeEnv(nodeEnvFallback)
    const POINT0_SCOPE = this.scope
    const POINT0_SIDE = 'server'
    this.envConsts.NODE_ENV = NODE_ENV
    this.envConsts.POINT0_SCOPE = POINT0_SCOPE
    this.envConsts.POINT0_SIDE = POINT0_SIDE
    if (assignToProcessEnv) {
      for (const [envVarKey, envVarValue] of Object.entries({ ...this.envVars, ...this.envConsts })) {
        process.env[envVarKey] = envVarValue
        import.meta.env[envVarKey] = envVarValue
      }
    }
    return { NODE_ENV, POINT0_SCOPE, POINT0_SIDE }
  }

  async init({ engine }: { engine: Engine<RequiredCtx, true> }): Promise<EngineServer<true>> {
    if (this.isInitialized()) {
      return this as EngineServer<true>
    }
    this.setEnvVars({ assignToProcessEnv: true, nodeEnvFallback: undefined })
    const [points] = await Promise.all([
      this.loadBunPlugins({ built: env.build.was }).then(async () => await this.readServerPoints()),
      this.publicdir ? this.publicdir.init() : Promise.resolve(),
    ])
    this.baseurl = (points?.baseurl ?? null) as TInitialized extends true ? string | null : undefined
    if (this.publicdir) {
      this.publicdir.hostname = getHostnameOrNull(this.baseurl)
    }
    this.initialized = true as never
    this.fetcher = Fetcher.create({ engine, server: this as EngineServer<true> }) as TInitialized extends true
      ? Fetcher
      : null
    return this as EngineServer<true>
  }

  async readServerPoints(): Promise<ServerPoints | null> {
    if (!this.pointsProvided) {
      return null
    }
    const points = await ServerPoints.createFromSource(this.pointsProvided)
    await points.load()
    this.points = points as TInitialized extends true ? ServerPoints | null : undefined
    return points
  }

  getCompilerOptions(): CompilerOptions | false {
    if (!this.compiler) {
      return false
    }
    return {
      scope: this.compiler.scope ? this.scope : false,
      side: this.compiler.side ? 'server' : false,
      mode: this.compiler.mode ? normalizeAndValidateNodeEnv() : false,
      runtime: this.compiler.runtime,
      os: this.compiler.os,
      // TODO:ASAP add env varsconsts here from engine options
      consts: this.compiler.consts,
      filter: this.compiler.filter,
    }
  }

  async extractBunPlugins({
    built,
    extraPlugins = [],
  }: {
    built: boolean
    extraPlugins?: BunPlugin[]
  }): Promise<BunPlugin[]> {
    const extractedPlugins = await extractEngineServerPlugins({
      mode: normalizeAndValidateNodeEnv(),
      command: 'serve',
      bunPlugins: this.bunPlugins,
      scope: this.scope,
    })
    const compilerOptions = this.getCompilerOptions()
    const compilerPlugin = this.viteConfig // we inject vite compiler plugin in vite config
      ? []
      : env.build.was || !compilerOptions
        ? []
        : [
            await import('@point0/compiler/plugin/bun').then((module) =>
              module.compilerBunPlugin({
                built,
                ...compilerOptions,
              }),
            ),
          ]
    const extractedBunPlugins = [...compilerPlugin, ...extraPlugins, ...extractedPlugins]
    return extractedBunPlugins
  }

  async loadBunPlugins({ built, extraPlugins = [] }: { built: boolean; extraPlugins?: BunPlugin[] }): Promise<void> {
    if (this.bunPluginsLoaded) {
      return
    }
    const extractedBunPlugins = await this.extractBunPlugins({ built, extraPlugins })
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
      side: 'server',
      hmrPort: this.hmrPort,
      mode: normalizeAndValidateNodeEnv(),
      envConsts: this.envConsts,
      root:
        typeof this.viteConfig === 'string'
          ? nodePath.dirname(this.viteConfig)
          : this.engineFile
            ? nodePath.dirname(this.engineFile)
            : undefined,
    })
    this.viteDevServer = viteDevServer
    return viteDevServer
  }

  async loadViteDevEntry(options: { watch?: boolean; entryFile: string; viteDevServer?: ViteDevServer }): Promise<any> {
    const { watch, entryFile, viteDevServer = this.viteDevServer } = options
    if (!this.viteConfig) {
      throw new Error(`Vite config not found for server`)
    }
    if (!viteDevServer) {
      throw new Error(`Vite dev server not started for server`)
    }
    // const loadedModule = await this.viteDevServer.ssrLoadModule(entryPath)
    if (!watch) {
      await viteDevServer.ssrLoadModule(entryFile)
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
        serverModule = await viteDevServer.ssrLoadModule(entryFile)
        dispose = serverModule.dispose
        if (!dispose) {
          throw new Error(`Dispose function not exported from server entry point "${entryFile}": ${entryFile}`)
        }
      } catch (error) {
        console.error(`Error loading entry point "${entryFile}"`, error)
      }
    }
    await load()
    viteDevServer.watcher.on('change', (file) => {
      if (file.includes('/src/')) {
        void load()
      }
    })
  }

  async loadViteDevEntries(options?: {
    watch?: boolean
    entriesFiles?: string[]
    viteDevServer?: ViteDevServer
  }): Promise<void> {
    if (!this.viteConfig) {
      throw new Error(`Vite config not found for server`)
    }
    const { watch, entriesFiles = Object.values(this.entry || {}), viteDevServer = this.viteDevServer } = options ?? {}
    if (!viteDevServer) {
      throw new Error(`Vite dev server not started for server`)
    }
    await Promise.all(
      entriesFiles.map(async (entryFile) => await this.loadViteDevEntry({ watch, entryFile, viteDevServer })),
    )
  }

  private readonly fetchDevClientsProxy = async ({
    request,
    bunServer,
  }: {
    request: Request
    bunServer?: Bun.Server<unknown>
  }): Promise<{ response: Response | undefined } | undefined> => {
    if (process.env.NODE_ENV === 'production') {
      return undefined
    }
    if (request.headers.get('X-Point0-Forwarded-From-Dev-Client-Server') === 'true') {
      return undefined
    }
    bunServer ??= this.bunServer
    for (const client of this.clients) {
      // it is provided when we serve via bun, if we serve via elysia, then elysia manages websocket by itself
      if (bunServer) {
        const bunDevServerUpgradeWebSocketResult = await client.upgradeProxyBunDevServerWebSocket({
          request,
          bunServer,
        })
        if (bunDevServerUpgradeWebSocketResult) {
          return { response: bunDevServerUpgradeWebSocketResult.result } // in this case response really should be undefined
        }
      }
      const clientViteDevServerResponse = await client.fetchViteDevServerMiddleware({ request })
      if (clientViteDevServerResponse) {
        return { response: clientViteDevServerResponse }
      }
      const clientBunDevServerResponse = await client.fetchBunDevServerMiddleware({ request })
      if (clientBunDevServerResponse) {
        return { response: clientBunDevServerResponse }
      }
    }
    return undefined // this mean that we did not find any dev client proxy response, and should continue to fetch point
  }

  serve({ requiredCtx }: { requiredCtx: RequiredCtx }): void {
    if (!this.isInitialized()) {
      throw new Error('Server is not initialized')
    }
    this.bunServer = withRetries(process.env.NODE_ENV === 'test' ? 99 : 5, () =>
      Bun.serve({
        port: this.port,
        fetch: async (request, bunServer) => {
          const devClientsProxyResponse = await this.fetchDevClientsProxy({ request, bunServer })
          if (devClientsProxyResponse) {
            return devClientsProxyResponse.response
          }

          const result = await this.fetchDetailed({ request, requiredCtx, bunServer })

          // Add CORS headers in dev mode for requests from localhost with client ports (for vite development)
          // TODO: remove it, we now just forward from client to server
          // if (process.env.NODE_ENV !== 'production') {
          //   const origin = request.headers.get('origin')
          //   if (origin) {
          //     const originUrl = new URL(origin)
          //     // Check if origin is localhost and port matches any client port
          //     const isLocalhostClient =
          //       originUrl.hostname === 'localhost' &&
          //       this.clients.some((client) => originUrl.port === String(client.port))

          //     if (isLocalhostClient) {
          //       // Handle preflight OPTIONS requests
          //       if (request.method === 'OPTIONS') {
          //         const requestedHeaders = request.headers.get('Access-Control-Request-Headers')
          //         return new Response(null, {
          //           status: 204,
          //           headers: {
          //             'Access-Control-Allow-Origin': origin,
          //             'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          //             'Access-Control-Allow-Headers': requestedHeaders || '*',
          //             'Access-Control-Allow-Credentials': 'true',
          //             'Access-Control-Max-Age': '86400',
          //           },
          //         })
          //       }

          //       // Add CORS headers to the response
          //       const newHeaders = new Headers(response.headers)
          //       newHeaders.set('Access-Control-Allow-Origin', origin)
          //       newHeaders.set('Access-Control-Allow-Credentials', 'true')
          //       // Expose all response headers (can't use * with credentials, so list them)
          //       const exposedHeaders: string[] = []
          //       response.headers.forEach((_, key) => {
          //         exposedHeaders.push(key)
          //       })
          //       if (exposedHeaders.length > 0) {
          //         newHeaders.set('Access-Control-Expose-Headers', exposedHeaders.join(', '))
          //       }

          //       return new Response(response.body, {
          //         status: response.status,
          //         statusText: response.statusText,
          //         headers: newHeaders,
          //       })
          //     }
          //   }
          // }

          return result.response
        },
        websocket: {
          open(ws) {
            if (process.env.NODE_ENV !== 'production') {
              // Only proxy WebSocket connections that have a wsUrl (Bun dev server connections)
              const data = ws.data as unknown as { wsUrl?: string; upstream?: WebSocket }
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
              const data = ws.data as unknown as { upstream?: WebSocket }
              if (data.upstream?.readyState === WebSocket.OPEN) {
                data.upstream.send(message)
              }
            }
          },
          close(ws) {
            if (process.env.NODE_ENV !== 'production') {
              // Clean up upstream connection when client disconnects
              const data = ws.data as unknown as { upstream?: WebSocket }
              if (data.upstream) {
                data.upstream.close()
              }
            }
          },
        },
      }),
    )()
  }

  async dispose(options?: { closeViteDevServer?: boolean }): Promise<void> {
    const { closeViteDevServer = false } = options ?? {}
    if (!this.isInitialized()) {
      throw new Error('Server is not initialized')
    }
    if (this.bunServer) {
      await this.bunServer.stop()
    }
    if (closeViteDevServer && this.viteDevServer) {
      // we do not close it by default, becouse it should alway persist for hot reloads
      await this.viteDevServer.close()
    }
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
    const [server, publicdir] = await Promise.all([
      this.cleanServer(),
      this.publicdir ? this.publicdir.clean() : Promise.resolve(false),
    ])
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

    const envConstsWithBuilt = {
      ...this.envConsts,
      POINT0_BUILT: 'true',
    }
    const injectedEnvs = {
      'process.env.POINT0_ENGINE_WAS_BUILT': JSON.stringify('true'),
      ...(POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED
        ? { 'process.env.POINT0_ENGINE_CWD_BEFORE_BUILD': JSON.stringify(POINT0_ENGINE_CWD_BEFORE_BUILD_CUTTED) }
        : {}),
      ...(POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED
        ? { 'process.env.POINT0_ENGINE_CWD_AFTER_BUILD': JSON.stringify(POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED) }
        : {}),
      ...Object.fromEntries(
        Object.entries(envConstsWithBuilt).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
      ),
      ...Object.fromEntries(
        Object.entries(envConstsWithBuilt).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
      ),
    }
    const injectEnvsScript =
      Object.entries(injectedEnvs)
        .map(([key, value]) => `${key}=${value};`)
        .join('\n') + '\n'
    return { injectedEnvs, injectEnvsScript }
  }

  async buildByBun(options?: {
    bunBuildConfig?: EngineServerBuildConfigDefinition
    clean?: boolean
  }): Promise<string[] | null> {
    this.setEnvVars({ assignToProcessEnv: false, nodeEnvFallback: 'production' })
    const { NODE_ENV } = this.setEnvVars({
      assignToProcessEnv: false,
      nodeEnvFallback: 'production',
    })
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

    const thisBunBuildConfig = await executeEngineServerBuildConfig({
      mode: NODE_ENV,
      bunBuildConfig: this.bunBuildConfig,
      bunPlugins: this.bunPlugins,
      scope: this.scope,
    })
    const providedBunBuildConfig = bunBuildConfig
      ? await executeEngineServerBuildConfig({
          mode: NODE_ENV,
          bunBuildConfig,
          bunPlugins: [],
          scope: this.scope,
        })
      : {}

    const { injectedEnvs, injectEnvsScript } = this.getBuildInjectedEnvs()

    const buildOutput = await Bun.build({
      target: 'bun',
      sourcemap: 'linked',
      minify: true,
      splitting: true,
      ...thisBunBuildConfig,
      ...providedBunBuildConfig,
      plugins: [
        ...(await this.extractBunPlugins({
          built: true,
          extraPlugins: [...(thisBunBuildConfig.plugins ?? []), ...(providedBunBuildConfig.plugins ?? [])],
        })),
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
      },
    })
    return buildOutput.outputs.map((output) => output.path)
  }

  async buildByVite(options?: { clean?: boolean }): Promise<string[] | null> {
    if (env.build.was) {
      throw new Error('You can not build by built engine')
    } else {
      const { NODE_ENV } = this.setEnvVars({ assignToProcessEnv: false, nodeEnvFallback: 'production' })
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

      this.envConsts.NODE_ENV = NODE_ENV

      const loadedViteConfig = await extractViteConfig({
        viteConfig: this.viteConfig,
        command: 'build',
        side: 'server',
        mode: NODE_ENV,
        scope: this.scope,
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
        loadedViteConfig.root ||
        (typeof this.viteConfig === 'string' && nodePath.dirname(this.viteConfig)) ||
        (this.engineFile ? nodePath.dirname(this.engineFile) : undefined)

      const compilerOptions = this.getCompilerOptions()
      const compilerPlugin = compilerOptions
        ? [
            await import('@point0/compiler/plugin/vite').then((module) =>
              module.compilerVitePlugin({ ...compilerOptions, built: true }),
            ),
          ]
        : []

      const config: ExtractedViteConfig = {
        ...loadedViteConfig,
        plugins: [...compilerPlugin, ...(loadedViteConfig.plugins ?? [])],
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
              ...this.entry,
              ...(this.engineFile ? { engine: this.engineFile } : {}),
            },
            output: fixedExistingRollupOptionsOutput,
          },
          copyPublicDir: false,
          emptyOutDir: false,
        },
        define: {
          ...loadedViteConfig.define,
          ...injectedEnvs,
        },
      }
      const buildResult = await viteBuild(config)

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
    }
  }

  async buildServer(options?: {
    bunBuildConfig?: EngineServerBuildConfigDefinition
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
    bunBuildConfig?: EngineServerBuildConfigDefinition
    publicdir?: boolean
    clean?: boolean
  }): Promise<{ server: string[] | null; publicdir: string[] | null }> {
    const { bunBuildConfig, clean = false, publicdir = true } = options ?? {}
    if (clean) {
      await this.clean()
    }
    const [server, publicdirBuildOutput] = await Promise.all([
      this.buildServer({ bunBuildConfig, clean: false }), // we clean already before
      !publicdir || !this.publicdir ? null : this.publicdir.build({ clean: false }), // we clean already before
    ])
    return { server, publicdir: publicdirBuildOutput }
  }

  async fetchDetailed({
    request,
    requiredCtx,
    bunServer,
  }: {
    request: Request
    requiredCtx: RequiredCtx
    bunServer?: Bun.Server<unknown>
  }): Promise<FetcherFetchDetailedResult> {
    if (!this.isInitialized()) {
      throw new Error('Server is not initialized')
    }
    return await this.fetcher.fetchDetailed({ request, requiredCtx, bunServer })
  }

  // async fetch({
  //   request,
  //   requiredCtx,
  //   scope,
  //   bunServer,
  // }: {
  //   request: Request
  //   requiredCtx: RequiredCtx
  //   scope?: PointsScope
  //   bunServer?: Bun.Server<unknown>
  // }): Promise<Response | undefined> {
  //   const result = await this.fetchDetailed({ request, requiredCtx, scope, bunServer })
  //   return result.response
  // }
}

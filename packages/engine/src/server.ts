import { Compiler, type CompilerOptions } from '@point0/compiler'
import type {
  ErrorPoint0,
  FetcherFetchDetailedResult,
  LogFn,
  NormalizedNodeEnv,
  PointsDefinitionSource,
  PointsScope,
  RequiredCtx,
} from '@point0/core'
import { _point0_env, _ssServerLog, prependAndDeappendSlash } from '@point0/core'
import type { BunPlugin, Serve } from 'bun'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { ViteDevServer } from 'vite'
import type { EngineClient } from './client.js'
import type {
  EngineOptionsCompilerSpecificParsed,
  EngineOptionsEnvParsed,
  EngineOptionsViteConfig,
  ExtractedViteConfig,
} from './config.js'
import type { Engine } from './engine.js'
import { Fetcher } from './fetcher.js'
import { killPort } from './port.js'
import type { PublicdirDefinition } from './publicdir.js'
import { Publicdir } from './publicdir.js'
import { ServerPoints } from './server-points.js'
import type {
  EngineServerBuildConfigDefinition,
  EngineServerPluginsDefinition,
  EngineSharedPluginsDefinition,
} from './utils.js'
import {
  createViteDevServer,
  executeEngineServerBuildConfig,
  externalizeRollupModule,
  extractEngineServerPlugins,
  extractViteConfig,
  getDirByPaths,
  getViteRoot,
  killSubprocessOnExit,
  loadBunPlugins,
  normalizeAndValidateNodeEnv,
  pipeStreamStripped,
  registerOnProcessExit,
  validateEntrypoints,
} from './utils.js'
import { FilesWatcher } from './watcher.js'

export class EngineServer<TPrepared extends boolean, TError extends ErrorPoint0> {
  scope: PointsScope
  cwd: string
  points: TPrepared extends true ? ServerPoints<TError> : undefined
  pointsProvided: PointsDefinitionSource<RequiredCtx, TError>
  itWasBuilt: boolean
  engineFile: string | null
  cwdBeforeBuild: string
  port: number
  clients: TPrepared extends true ? Array<EngineClient<true, TError>> : EngineClient<false, TError>[]
  log: LogFn
  entry: Record<string, string> | null
  publicdir: TPrepared extends true ? Publicdir<true, TError> | null : Publicdir<false, TError> | null
  // it is collection of server itself public dir and all its clients public dirs
  publicdirs: TPrepared extends true ? Array<Publicdir<true, TError>> : Array<Publicdir<false, TError>>
  outdir: string | null
  bunBuildConfig: EngineServerBuildConfigDefinition
  bunServeConfig: Serve.Options<any, any> | null
  bunPlugins: EngineServerPluginsDefinition
  generalBunPlugins: EngineSharedPluginsDefinition
  prepared: TPrepared
  bunPluginsLoaded = false
  envVarsApplied = false
  bunServer: Bun.Server<undefined> | undefined
  viteConfig: EngineOptionsViteConfig | null
  viteDevServer: ViteDevServer | null
  envConsts: EngineOptionsEnvParsed
  envVars: EngineOptionsEnvParsed
  hmrPort: number | false
  fetcher: TPrepared extends true ? Fetcher<TError> : null
  compiler: EngineOptionsCompilerSpecificParsed | false
  ssr: boolean

  private constructor(input: {
    prepared: TPrepared
    cwd: string
    scope: PointsScope
    pointsProvided: PointsDefinitionSource<any, TError>
    itWasBuilt: boolean
    engineFile: string | null
    cwdBeforeBuild: string
    port: number
    log: LogFn
    clients: EngineClient<any, TError>[]
    envConsts: EngineOptionsEnvParsed
    envVars: EngineOptionsEnvParsed
    entry: Record<string, string> | null
    publicdir: Publicdir<false, TError> | null
    outdir: string | null
    bunBuildConfig: EngineServerBuildConfigDefinition
    bunServeConfig: Serve.Options<any, any> | null
    bunPlugins: EngineServerPluginsDefinition
    generalBunPlugins: EngineSharedPluginsDefinition
    viteConfig: EngineOptionsViteConfig | null
    viteDevServer: ViteDevServer | null
    hmrPort: number | false
    compiler: EngineOptionsCompilerSpecificParsed | false
    ssr: boolean
  }) {
    this.cwd = input.cwd
    this.scope = input.scope
    this.pointsProvided = input.pointsProvided
    this.points = undefined as TPrepared extends true ? ServerPoints<TError> : undefined
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
    this.clients = input.clients as TPrepared extends true
      ? Array<EngineClient<true, TError>>
      : EngineClient<false, TError>[]
    this.log = input.log
    this.entry = input.entry
    this.publicdir = input.publicdir as TPrepared extends true
      ? Publicdir<true, TError> | null
      : Publicdir<false, TError> | null
    this.publicdirs = [] as unknown as TPrepared extends true
      ? Array<Publicdir<true, TError>>
      : Array<Publicdir<false, TError>>
    this.outdir = input.outdir
    this.bunBuildConfig = input.bunBuildConfig
    this.bunServeConfig = input.bunServeConfig
    this.bunPlugins = input.bunPlugins
    this.generalBunPlugins = input.generalBunPlugins
    this.prepared = input.prepared
    this.viteConfig = input.viteConfig
    this.viteDevServer = input.viteDevServer
    this.hmrPort = input.hmrPort
    this.compiler = input.compiler
    this.fetcher = null as TPrepared extends true ? Fetcher<TError> : null
    this.ssr = input.ssr
  }

  static create<TError extends ErrorPoint0>(input: {
    cwd: string
    scope: PointsScope
    pointsProvided: PointsDefinitionSource<any, TError>
    engineFile: string | null
    cwdBeforeBuild: string
    itWasBuilt: boolean
    port: number
    entry: Record<string, string> | null
    publicdir: {
      source: PublicdirDefinition
      outdir: string
      cacheLimit: number | boolean
    } | null
    envConsts: EngineOptionsEnvParsed
    envVars: EngineOptionsEnvParsed
    outdir: string | null
    bunBuildConfig: EngineServerBuildConfigDefinition
    bunServeConfig: Serve.Options<any, any> | null
    bunPlugins: EngineServerPluginsDefinition
    generalBunPlugins: EngineSharedPluginsDefinition
    log: LogFn
    clients: EngineClient<any, TError>[]
    viteConfig: EngineOptionsViteConfig | null
    hmrPort: number | false
    compiler: EngineOptionsCompilerSpecificParsed | false
    ssr: boolean
  }): EngineServer<false, TError> {
    const publicdir = input.publicdir
      ? Publicdir.create<TError>({
          serving: true,
          source: input.publicdir.source,
          outdir: input.publicdir.outdir,
          cacheLimit: input.publicdir.cacheLimit,
          scope: input.scope,
          server: null,
          client: null,
        })
      : null

    const viteDevServer = null

    const server = new EngineServer<false, TError>({
      ...input,
      publicdir,
      prepared: false,
      viteDevServer,
    })
    if (publicdir) {
      publicdir.server = server
    }
    return server
  }

  isPrepared(): this is EngineServer<true, TError> {
    return !!this.prepared
  }

  // private static patchConsoleForViteSsrStacktraceFix(): void {
  //   if (EngineServer.viteSsrConsolePatched) {
  //     return
  //   }
  //   EngineServer.viteSsrConsolePatched = true
  //   const methods: Array<'error' | 'warn' | 'info'> = ['error', 'warn', 'info']
  //   for (const method of methods) {
  //     // eslint-disable-next-line no-console
  //     const originalMethod = console[method].bind(console) as (...args: unknown[]) => void
  //     // eslint-disable-next-line no-console
  //     console[method] = ((...args: unknown[]) => {
  //       const fixer = EngineServer.viteSsrStacktraceFixer
  //       if (fixer) {
  //         for (const arg of args) {
  //           fixer(arg)
  //         }
  //       }
  //       originalMethod(...args)
  //     }) as Console[typeof method]
  //   }
  // }

  fixViteSsrStacktrace(error: unknown): void {
    if (!this.viteDevServer || !(error instanceof Error)) {
      return
    }
    const seen = new Set<object>()
    const maxDepth = 100
    let depth = 0
    seen.add(error)
    this.viteDevServer.ssrFixStacktrace(error)
    let cause = (error as Error & { cause?: unknown }).cause
    while (cause instanceof Error && !seen.has(cause) && depth < maxDepth) {
      this.viteDevServer.ssrFixStacktrace(cause)
      cause = (cause as Error & { cause?: unknown }).cause
      depth++
    }
  }

  private installViteSsrStacktraceFixer(): void {
    if (this.itWasBuilt || !this.viteDevServer) {
      return
    }
    ;(globalThis as any).__ERROR0_FIX_STACKTRACE__ = (value: unknown) => {
      this.fixViteSsrStacktrace(value)
    }
  }

  private uninstallViteSsrStacktraceFixer(): void {
    if (this.itWasBuilt || !this.viteDevServer) {
      return
    }
    ;(globalThis as any).__ERROR0_FIX_STACKTRACE__ = undefined
  }

  setEnvVars({
    nodeEnvFallback,
    assignToProcessEnv,
  }: {
    nodeEnvFallback: NormalizedNodeEnv | undefined
    assignToProcessEnv: boolean
  }): { NODE_ENV: NormalizedNodeEnv; POINT0_SCOPE: PointsScope; POINT0_SIDE: 'server'; POINT0_SSR: 'true' | 'false' } {
    const NODE_ENV = normalizeAndValidateNodeEnv(nodeEnvFallback)
    const POINT0_SCOPE = this.scope
    const POINT0_SIDE = 'server'
    const POINT0_SSR = this.ssr ? 'true' : 'false'
    this.envConsts.NODE_ENV = NODE_ENV
    this.envConsts.POINT0_SCOPE = POINT0_SCOPE
    this.envConsts.POINT0_SIDE = POINT0_SIDE
    this.envConsts.POINT0_SSR = POINT0_SSR
    if (assignToProcessEnv && !this.envVarsApplied) {
      this.envVarsApplied = true
      for (const [envVarKey, envVarValue] of Object.entries({ ...this.envVars, ...this.envConsts })) {
        process.env[envVarKey] = envVarValue
        // try {
        //   import.meta.env[envVarKey] = envVarValue
        // } catch {
        //   // ignore
        // }
      }
    }
    return { NODE_ENV, POINT0_SCOPE, POINT0_SIDE, POINT0_SSR }
  }

  isFileInOutdir(file: string = Bun.main): boolean {
    if (!this.outdir) {
      return false
    }
    return !nodePath.relative(this.outdir, file).startsWith('..')
  }

  async preload({
    preventSetEnvVars = false,
    nodeEnvFallback = undefined,
    preventLoadBunPlugins = false,
  }: {
    preventSetEnvVars?: boolean
    nodeEnvFallback?: NormalizedNodeEnv
    preventLoadBunPlugins?: boolean
  } = {}): Promise<void> {
    // if (process.env.POINT0_PREVENT_ENGINE_PRELOAD === 'true') {
    //   return
    // }
    // if (isBunMainEngineCli()) {
    //   return
    // }
    // if (this.isFileInOutdir(Bun.main) && process.env.POINT0_PREVENT_ENGINE_PRELOAD !== 'false') {
    //   return
    // }
    // if (_point0_env.build.was && process.env.POINT0_PREVENT_ENGINE_PRELOAD !== 'false') {
    //   return
    // }
    if (!preventSetEnvVars) {
      this.setEnvVars({ assignToProcessEnv: true, nodeEnvFallback })
    }
    if (!preventLoadBunPlugins) {
      await this.loadBunPlugins({ built: false })
    }
  }

  async prepare({ engine }: { engine: Engine<RequiredCtx, TError, true> }): Promise<EngineServer<true, TError>> {
    if (this.isPrepared()) {
      return this as EngineServer<true, TError>
    }
    await this.readPoints()
    this.prepared = true as never
    this._applyRootLogger()
    this.fetcher = Fetcher.create({ engine, server: this as EngineServer<true, TError> }) as TPrepared extends true
      ? Fetcher<TError>
      : null
    return this as EngineServer<true, TError>
  }

  /** Override default engine logger with root point _logger when present (point logger > engine config). */
  private _applyRootLogger(): void {
    if (!this.points) return
    const rootLogger = this.points.manager.root._getLogFn()
    if (!rootLogger) return
    _ssServerLog.set(rootLogger)
    this.log = rootLogger
    this.points.manager.log = rootLogger
    for (const client of this.clients) {
      client.log = rootLogger
    }
  }

  async readPoints(): Promise<ServerPoints<TError>> {
    const points = await ServerPoints.createFromSource(this.pointsProvided, { log: this.log })
    await points.load()
    this.points = points as TPrepared extends true ? ServerPoints<TError> : undefined
    return points
  }

  async setPoints(points: PointsDefinitionSource<RequiredCtx, TError>): Promise<ServerPoints<TError>> {
    this.pointsProvided = points
    return await this.readPoints()
  }

  getCompilerOptions({ built, onDeny }: { built?: boolean; onDeny?: 'throw' | 'log' } = {}): CompilerOptions | false {
    if (!this.compiler) {
      return false
    }
    return {
      scope: this.compiler.scope ? this.scope : false,
      side: this.compiler.side ? 'server' : false,
      mode: this.compiler.mode ? normalizeAndValidateNodeEnv() : false,
      runtime: this.compiler.runtime,
      os: this.compiler.os,
      consts: [...(this.compiler.consts ?? []), this.envConsts],
      filter: this.compiler.filter,
      ssr: this.compiler.ssr,
      importer: { ...this.compiler.importer, onDeny: onDeny !== undefined ? onDeny : this.compiler.importer.onDeny },
      built,
      cache: this.compiler.cache,
    }
  }

  async extractBunPlugins({
    built = _point0_env.build.was,
    onDeny,
    extraPlugins = [],
  }: {
    built?: boolean
    onDeny?: 'throw' | 'log'
    extraPlugins?: BunPlugin[]
  } = {}): Promise<BunPlugin[]> {
    const ownExtractedPlugins = await extractEngineServerPlugins({
      mode: normalizeAndValidateNodeEnv(),
      command: 'serve',
      bunPlugins: this.bunPlugins,
      scope: this.scope,
    })
    const generalExtractedPlugins = await extractEngineServerPlugins({
      mode: normalizeAndValidateNodeEnv(),
      command: 'serve',
      bunPlugins: this.generalBunPlugins,
      scope: this.scope,
    })
    const extractedPlugins = [...generalExtractedPlugins, ...ownExtractedPlugins]
    const compilerOptions = this.getCompilerOptions({ built, onDeny })
    const compilerPlugin = this.viteConfig // we inject vite compiler plugin in vite config
      ? []
      : _point0_env.build.was || !compilerOptions
        ? []
        : [await import('@point0/compiler/plugin/bun').then((module) => module.compilerBunPlugin(compilerOptions))]
    const extractedBunPlugins = [...compilerPlugin, ...extraPlugins, ...extractedPlugins]
    return extractedBunPlugins
  }

  async loadBunPlugins({
    built,
    extraPlugins = [],
  }: { built?: boolean; extraPlugins?: BunPlugin[] } = {}): Promise<void> {
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
      engineFile: this.engineFile,
      compilerOptions: this.getCompilerOptions({ built: _point0_env.build.was }),
    })
    this.viteDevServer = viteDevServer
    this.installViteSsrStacktraceFixer()
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
      await viteDevServer.ssrLoadModule(entryFile, { fixStacktrace: true })
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
        serverModule = await viteDevServer.ssrLoadModule(entryFile, { fixStacktrace: true })
        dispose = serverModule.dispose
        if (!dispose) {
          throw new Error(`Dispose function not exported from server entry point "${entryFile}": ${entryFile}`)
        }
      } catch (error) {
        this.fixViteSsrStacktrace(error)
        // this.logger.error(`Error loading entry point "${entryFile}"`, error)
        this.log({
          level: 'error',
          category: ['server'],
          message: `Failed to load entry point "${entryFile}"`,
          error,
        })
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
    if (this.itWasBuilt) {
      return undefined
    }
    const forwardedFromClientScope = request.headers.get('X-Point0-Forwarded-From-Dev-Client')
    if (forwardedFromClientScope) {
      return undefined
    }
    for (const client of this.clients) {
      bunServer ??= this.bunServer
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

  async serve({
    requiredCtx,
    ..._providedServeConfig
  }: { requiredCtx?: RequiredCtx } & Partial<Serve.Options<any, any>> = {}): Promise<void> {
    if (!this.isPrepared()) {
      throw new Error('Server is not prepared')
    }

    if (this.bunServer) {
      throw new Error('Server is already running')
    }

    const customServeConfig = ((this.bunServeConfig as unknown) ?? {}) as Record<string, unknown>
    const customWebsocketConfig = this.bunServeConfig?.websocket as any
    const providedServeConfig = _providedServeConfig as Record<string, unknown>
    const providedWebsocketConfig = _providedServeConfig.websocket as any
    const serveConfig: Serve.Options<any, any> = {
      ...customServeConfig,
      ...providedServeConfig,
      port: this.port,
      fetch: async (request, bunServer) => {
        const devClientsProxyResponse = await this.fetchDevClientsProxy({ request, bunServer })
        if (devClientsProxyResponse) {
          return devClientsProxyResponse.response
        }

        const customFetch = this.bunServeConfig?.fetch?.bind(bunServer)
        const customResult = await customFetch?.(request, bunServer)
        if (customResult) {
          return customResult
        }

        const result = await this.fetchDetailed({ request, requiredCtx, bunServer })
        return result.response
      },
      websocket: {
        ...(customWebsocketConfig ?? {}),
        ...(providedWebsocketConfig ?? {}),
        // later will be user for channels
        open: (ws) => {
          const customOpen = customWebsocketConfig?.open?.bind(ws)
          if (customOpen) {
            return customOpen(ws)
          }
          return undefined
        },
        message: (ws, message) => {
          const customMessage = customWebsocketConfig?.message?.bind(ws)
          if (customMessage) {
            return customMessage(ws, message)
          }
          return undefined
        },
        close: (ws, code, reason) => {
          const customClose = customWebsocketConfig?.close?.bind(ws)
          if (customClose) {
            return customClose(ws, code, reason)
          }
          return undefined
        },
      },
    }

    if (!_point0_env.mode.is.production) {
      await killPort([this.port, this.hmrPort].filter(Boolean) as number[], {
        force: true,
        category: ['server'],
      })
    }
    this.bunServer = Bun.serve(serveConfig)
    registerOnProcessExit(() => {
      void this.bunServer?.stop()
    })
    const inMessage = !process.env.POINT0_SERVER_REGISTERED_PROCESS_UPTIME
      ? ` in ${Math.ceil(process.uptime() * 1000)}ms`
      : ''
    this.log({
      level: 'info',
      category: ['server'],
      message: `Server started http://localhost:${this.port}${inMessage}`,
    })
    if (!process.env.POINT0_SERVER_REGISTERED_PROCESS_UPTIME) {
      process.env.POINT0_SERVER_REGISTERED_PROCESS_UPTIME = process.uptime().toString()
    }
  }

  async dispose(options?: { closeViteDevServer?: boolean }): Promise<void> {
    const { closeViteDevServer = false } = options ?? {}
    if (!this.isPrepared()) {
      throw new Error('Server is not prepared')
    }
    if (this.bunServer) {
      await this.bunServer.stop()
    }
    if (closeViteDevServer && this.viteDevServer) {
      // we do not close it by default, becouse it should alway persist for hot reloads
      await this.viteDevServer.close()
    }
    this.uninstallViteSsrStacktraceFixer()
  }

  async startBunDevProcess({
    entriesFiles,
    bunRunArgs = [],
    watch,
    cwd,
  }: {
    entriesFiles: string[]
    bunRunArgs?: string[]
    watch: string[] | boolean
    cwd: string
  }): Promise<void> {
    // Two restart strategies:
    // - touch  (POINT0_DEV_SERVER_TOUCH_ON_WATCH=true): child runs with `bun --watch`; on import change
    //   we rewrite the entry file's bytes so bun's content-hash watcher restarts the child itself.
    // - respawn (default): child runs without `--watch`; on import change we SIGKILL that child and spawn a new one.
    const useTouch = process.env.POINT0_DEV_SERVER_TOUCH_ON_WATCH === 'true'

    const activeEntries = Object.values(this.entry || []).filter((entryFile) => entriesFiles.includes(entryFile))

    const allChildren = new Set<Bun.Subprocess<'ignore', 'pipe', 'pipe'>>()
    killSubprocessOnExit(() => allChildren)

    const spawnEntry = (entryFile: string): Bun.Subprocess<'ignore', 'pipe', 'pipe'> => {
      const child = Bun.spawn({
        cmd: ['bun', 'run', '--no-orphans', ...(watch ? ['--watch'] : []), ...bunRunArgs, entryFile],
        env: {
          ...process.env,
        },
        stdin: 'ignore',
        stdout: 'pipe',
        stderr: 'pipe',
      })
      allChildren.add(child)
      void child.exited.finally(() => allChildren.delete(child))
      pipeStreamStripped({ stream: child.stdout, target: process.stdout })
      pipeStreamStripped({ stream: child.stderr, target: process.stderr })
      return child
    }

    const childByEntry = new Map<string, Bun.Subprocess<'ignore', 'pipe', 'pipe'>>()
    for (const entryFile of activeEntries) {
      childByEntry.set(entryFile, spawnEntry(entryFile))
    }

    if (!watch) {
      return
    }

    const compilerOptions = this.getCompilerOptions()
    const compiler = compilerOptions ? Compiler.create(compilerOptions) : undefined
    const skipImport = (resolved: { pathResolved: string | undefined }) =>
      resolved.pathResolved === undefined || resolved.pathResolved.includes('/node_modules/')
    const userPatterns = Array.isArray(watch) ? watch : []

    const collectEntryPatterns = (entryFile: string): string[] => {
      const importFiles = new Set<string>()
      if (compiler) {
        const deepImports = compiler.collectImportsDeep({ target: entryFile, skip: skipImport })
        for (const item of deepImports) {
          if (item.pathResolved) {
            importFiles.add(item.pathResolved)
          }
        }
      }
      return [...userPatterns, ...importFiles]
    }

    const touchEntry = async (entryFile: string): Promise<void> => {
      const original = await nodeFs.readFile(entryFile)
      await nodeFs.writeFile(entryFile, Buffer.concat([original, Buffer.from('\n')]))
      await nodeFs.writeFile(entryFile, original)
    }

    const respawnEntry = async (entryFile: string): Promise<void> => {
      const old = childByEntry.get(entryFile)
      if (old) {
        try {
          old.kill('SIGKILL')
          await old.exited
        } catch {
          // Already dead or detached.
        }
      }
      childByEntry.set(entryFile, spawnEntry(entryFile))
    }

    const restartEntry = useTouch ? touchEntry : respawnEntry

    for (const entryFile of activeEntries) {
      const initialPatterns = collectEntryPatterns(entryFile)
      if (initialPatterns.length === 0) {
        continue
      }
      const watcher = FilesWatcher.create({ cwd, patterns: initialPatterns })
      await watcher.start({
        onEvent: async (event) => {
          this.log({
            level: 'info',
            category: ['server'],
            message: `Server restarting... (changed: ${nodePath.relative(this.cwd, event.path)})`,
          })
          try {
            await restartEntry(entryFile)
          } catch (error) {
            this.log({
              level: 'error',
              category: ['server'],
              message: `Failed to restart entry ${nodePath.relative(this.cwd, entryFile)}`,
              error,
            })
          }
          await watcher.restart({ cwd, patterns: collectEntryPatterns(entryFile) })
        },
        onError: async (error) => {
          this.log({
            level: 'error',
            category: ['dev', 'watch'],
            message: 'Watcher error. Still watching for changes...',
            error,
          })
        },
      })
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
      'process.env.POINT0_PREVENT_REDIRECT_TO_DEV_CLIENT': JSON.stringify('true'),
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
      // ...Object.fromEntries(
      //   Object.entries(envConstsWithBuilt).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
      // ),
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
          onDeny: 'throw',
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
    if (_point0_env.build.was) {
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

      const existingRolldownOptionsOutput = loadedViteConfig.build?.rolldownOptions?.output
      const normalizedExistingRolldownOptionsOutput =
        (Array.isArray(existingRolldownOptionsOutput)
          ? existingRolldownOptionsOutput[0]
          : existingRolldownOptionsOutput) || {}

      // Vite 8 / Rolldown's default `chunkFileNames` is `assets/[name]-[hash].js`, which nests
      // shared chunks under `<outdir>/assets/`. With multiple SSR entries that share modules,
      // the user's `engine.ts` (the one calling `Engine.create({ file: import.meta.url, … })`)
      // gets hoisted into one such shared chunk. At runtime `import.meta.url` then resolves to
      // `<outdir>/assets/engine-<hash>.js`, and the runtime check
      //   `dirname(engineFile).endsWith(POINT0_ENGINE_CWD_AFTER_BUILD_CUTTED)`
      // in `config.ts` (parseEngineGeneralOptions) fails — `/dist/server/assets` does not end
      // with `/dist/server`.
      //
      // Flatten chunk output so chunks live next to entries (no `assets/` prefix). The chunk
      // that actually contains `engine.ts`'s code then sits at `<outdir>/engine-<hash>.js`,
      // `dirname(...) === <outdir>`, and the invariant holds. SSR builds don't emit real assets
      // (images/CSS) so collapsing `assetsDir` is safe here.
      const rolldownOptionsOutput: Extract<
        NonNullable<NonNullable<ExtractedViteConfig['build']>['rolldownOptions']>['output'],
        object
      > = {
        ...normalizedExistingRolldownOptionsOutput,
        banner: [injectEnvsScript, normalizedExistingRolldownOptionsOutput.banner].filter(Boolean).join('\n'),
        chunkFileNames: normalizedExistingRolldownOptionsOutput.chunkFileNames ?? '[name]-[hash].js',
      }
      const fixedExistingRolldownOptionsOutput = Array.isArray(existingRolldownOptionsOutput)
        ? [rolldownOptionsOutput, ...existingRolldownOptionsOutput.slice(1)]
        : rolldownOptionsOutput

      const compilerOptions = this.getCompilerOptions({ built: true, onDeny: 'throw' })
      const compilerPlugin = compilerOptions
        ? [await import('@point0/compiler/plugin/vite').then((module) => module.compilerVitePlugin(compilerOptions))]
        : []

      const config: ExtractedViteConfig = {
        ...loadedViteConfig,
        plugins: [...compilerPlugin, ...(loadedViteConfig.plugins ?? [])],
        root: getViteRoot({ viteConfig: this.viteConfig, loadedViteConfig, engineFile: this.engineFile }),
        build: {
          ...loadedViteConfig.build,
          outDir: buildPaths.outdir,
          minify: loadedViteConfig.build?.minify ?? true,
          sourcemap: loadedViteConfig.build?.sourcemap ?? true,
          ssr: true,
          rolldownOptions: {
            ...loadedViteConfig.build?.rolldownOptions,
            input: {
              ...this.entry,
              ...(this.engineFile ? { engine: this.engineFile } : {}),
            },
            external: externalizeRollupModule({
              external: loadedViteConfig.build?.rolldownOptions?.external,
              moduleId: 'bun',
            }) as never,
            output: fixedExistingRolldownOptionsOutput,
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
  }): Promise<FetcherFetchDetailedResult<TError>> {
    if (!this.isPrepared()) {
      throw new Error('Server is not prepared')
    }
    return await this.fetcher.fetchDetailed({ request, requiredCtx, bunServer })
  }
}

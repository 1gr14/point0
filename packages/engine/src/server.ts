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
import { _point0_env, PointsSourceNotReadyError, prependAndDeappendSlash } from '@point0/core'
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
import { isDevShuttingDown, registerDevChild, requestDevShutdown } from './devlock.js'
import { killPort } from './port.js'
import type { PublicdirDefinition } from './publicdir.js'
import { Publicdir } from './publicdir.js'
import { ServerHotStore } from './server-hot-store.js'
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
  loadBunPlugins,
  normalizeAndValidateNodeEnv,
  pipeStreamStripped,
  registerOnProcessExit,
  validateEntrypoints,
} from './utils.js'
import { collectImportGraphPatterns, FilesWatcher } from './watcher.js'

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
  /**
   * Server-dev hot-reload binding (CHILD side). Set by {@link bindHotStore} when the stable dev child runs in hot mode:
   * `readPoints` then re-imports the server points aggregator from the content-addressed store (per request, gated by
   * the manifest hash) instead of `pointsProvided`. Both null in build/prod/normal dev. `hotAggregatorAbs` is this
   * server's points-aggregator original path (the store/manifest key); null if the `points` source isn't a resolvable
   * dynamic import (e.g. an inline points array) — then this side stays on `pointsProvided` (no hot).
   */
  hotStore: ServerHotStore | null = null
  hotAggregatorAbs: string | null = null

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

  // Fix a single Error's `.stack` in place using vite's SSR module-graph mappings.
  // Single-error contract: callers (ErrorPoint0 / Error0) are responsible for walking their
  // own `cause` chains and invoking the hook per link. Keeps the hook composable and the
  // walk policy (seen-set, depth cap, what counts as a cause) close to the error class.
  fixViteSsrStacktrace(error: unknown): void {
    if (!this.viteDevServer || !(error instanceof Error)) {
      return
    }
    this.viteDevServer.ssrFixStacktrace(error)
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
    this._applyRootLogger(engine)
    this.fetcher = Fetcher.create({ engine, server: this as EngineServer<true, TError> }) as TPrepared extends true
      ? Fetcher<TError>
      : null
    return this as EngineServer<true, TError>
  }

  /** Override the engine logger with the root point's `_logger` when present (point logger > engine config). */
  private _applyRootLogger(engine: Engine<RequiredCtx, TError, true>): void {
    if (!this.points) return
    const rootLogger = this.points.manager.root._getLogFn()
    if (!rootLogger) return
    engine._setLog(rootLogger)
  }

  /** Bind this server to the content-addressed hot store (child side). See {@link ServerHotStore}. */
  bindHotStore(hotStore: ServerHotStore, aggregatorAbs: string | null): void {
    this.hotStore = hotStore
    this.hotAggregatorAbs = aggregatorAbs
    hotStore.registerAggregator(aggregatorAbs)
  }

  async readPoints(): Promise<ServerPoints<TError>> {
    let source = this.pointsProvided
    // Hot mode: re-import the server points aggregator from the content-addressed store. The store filename is the
    // aggregator's content hash — unchanged content => same name => Bun cache hit (singletons live); changed content
    // => new name => fresh module identity (no React tear). See server-hot-store.ts.
    const hot = this.hotStore && this.hotAggregatorAbs ? { store: this.hotStore, abs: this.hotAggregatorAbs } : null
    let hotHash: string | undefined
    if (hot) {
      const mod = hot.store.currentModule(hot.abs)
      if (!mod.changed && this.points) {
        return this.points
      }
      hotHash = mod.hash
      source = () => import(mod.url)
    }
    try {
      const points = await ServerPoints.createFromSource(source, { log: this.log })
      await points.load()
      this.points = points as TPrepared extends true ? ServerPoints<TError> : undefined
      if (hot && hotHash !== undefined) {
        hot.store.markLoaded(hot.abs, hotHash)
      }
      return points
    } catch (error) {
      // In dev the points module is re-imported on every request (see Fetcher.fetchDetailed), so a
      // Vite HMR invalidation window can hand us a transiently-empty source. Keep the last-good
      // points instead of failing the request — the next read (once Vite settles) picks up the new
      // ones. Any other error is a real problem and must surface.
      if (error instanceof PointsSourceNotReadyError && this.points) {
        this.log({
          level: 'debug',
          category: ['server', 'points'],
          message: 'Points source not ready (HMR transient) — keeping previously loaded points',
        })
        return this.points
      }
      throw error
    }
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
      markdown: this.compiler.markdown,
      babel: this.compiler.babel,
      // Asset pipeline rides on the compiler (like `markdown`/`babel`); `false` → native asset behavior. Per-build
      // dirs (`urlDir`/`fileDir`/`writeUrlBytes`) are merged into `assets` by `extractBunPlugins`/the build sites.
      assets: this.compiler.assets,
    }
  }

  async extractBunPlugins({
    built = _point0_env.build.was,
    onDeny,
    extraPlugins = [],
    assetsDirs,
  }: {
    built?: boolean
    onDeny?: 'throw' | 'log'
    extraPlugins?: BunPlugin[]
    /** Per-build asset dirs merged into `compilerOptions.assets` (the asset pipeline rides in the compiler plugin). */
    assetsDirs?: { urlDir?: string; fileDir?: string; writeUrlBytes?: boolean }
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
    // Merge the caller's per-build asset dirs into `compilerOptions.assets` (the pipeline rides in the compiler
    // plugin). Dev passes none; build sites pass their output dirs. `compiler: false` → no assets (native behavior).
    if (compilerOptions && compilerOptions.assets && assetsDirs) {
      compilerOptions.assets = { ...compilerOptions.assets, ...assetsDirs }
    }
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

  async loadViteDevEntry(options: { entryFile: string; viteDevServer?: ViteDevServer }): Promise<any> {
    if (_point0_env.build.was) {
      throw new Error('You can not load vite dev entry after build')
    } else {
      const { entryFile, viteDevServer = this.viteDevServer } = options
      if (!this.viteConfig) {
        throw new Error(`Vite config not found for server`)
      }
      if (!viteDevServer) {
        throw new Error(`Vite dev server not started for server`)
      }
      // Vite 8: load via the ModuleRunner. Per the Environment API docs the server entry should
      // self-accept (`import.meta.hot.accept()`) so a change doesn't invalidate the whole server
      // module graph; because our entry is side-effect-ful (it calls `engine.serve()`), it also
      // registers `import.meta.hot.dispose(() => engine.dispose())` to tear the old server down.
      // That boilerplate lives in the user's entry file (see examples/*/src/*.server.ts) — vite's
      // HMR pipeline drives re-execution, so no manual watcher is needed here.
      const ssrEnv = viteDevServer.environments.ssr
      // Lazy import: keep `vite` out of the engine's static graph so a Bun-only build never bundles it (and never
      // needs vite's optional-peer `esbuild`). This method is dev + vite only — guarded by the throws above.
      const { isRunnableDevEnvironment } = await import('vite')
      if (!isRunnableDevEnvironment(ssrEnv)) {
        throw new Error(`Vite SSR environment is not runnable (cannot import server entry in-process)`)
      }
      return await ssrEnv.runner.import(entryFile)
    }
  }

  async loadViteDevEntries(options?: { entriesFiles?: string[]; viteDevServer?: ViteDevServer }): Promise<void> {
    if (!this.viteConfig) {
      throw new Error(`Vite config not found for server`)
    }
    const { entriesFiles = Object.values(this.entry || {}), viteDevServer = this.viteDevServer } = options ?? {}
    if (!viteDevServer) {
      throw new Error(`Vite dev server not started for server`)
    }
    await Promise.all(entriesFiles.map(async (entryFile) => await this.loadViteDevEntry({ entryFile, viteDevServer })))
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
      // throw new Error('Server is already running')
      return
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

    // Dev port acquisition. The old behavior — unconditionally SIGKILL whatever holds the port, then bind — is exactly
    // how a dev tree murders itself: under rapid edits a freshly spawned server killed its own predecessor (or a
    // sibling) mid-handover, the survivor then failed to bind, and the whole dev tree tore down. Instead, bind with
    // patient retries:
    //  - under the dev orchestrator (POINT0_DEV_CHILD): the orchestrator serializes respawns, so a conflict is always a
    //    short handover (the predecessor draining its shutdown hooks) — wait it out; only if it persists past
    //    `killAfterMs` is the holder a zombie from a dead session, and only then take the port.
    //  - standalone non-production runs keep the "a new run takes the port over" convenience, just reactively: the
    //    first conflict frees the port, the retry binds.
    // Production binds once and throws — taking over a port is a dev convenience, never a prod behavior.
    if (!_point0_env.mode.is.production) {
      const isDevChild = process.env.POINT0_DEV_CHILD === 'true'
      const bindTimeoutMs = Number(process.env.POINT0_DEV_BIND_TIMEOUT_MS ?? 10000)
      const killAfterMs = isDevChild ? Math.min(2000, bindTimeoutMs) : 0
      const startedAt = Date.now()
      let portFreed = false
      let loggedBusy = false
      for (;;) {
        try {
          this.bunServer = Bun.serve(serveConfig)
          break
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          const isPortConflict =
            (error as { code?: string } | null)?.code === 'EADDRINUSE' || /port .* in use|EADDRINUSE/i.test(message)
          if (!isPortConflict || Date.now() - startedAt >= bindTimeoutMs) {
            throw error
          }
          if (!loggedBusy) {
            loggedBusy = true
            this.log({
              level: 'debug',
              category: ['server'],
              message: `Port ${this.port} is busy — waiting for it to free...`,
            })
          }
          if (!portFreed && Date.now() - startedAt >= killAfterMs) {
            portFreed = true
            await killPort([this.port, this.hmrPort].filter(Boolean) as number[], {
              force: true,
              category: ['server'],
            })
          }
          await new Promise((resolve) => setTimeout(resolve, 150))
        }
      }
    } else {
      this.bunServer = Bun.serve(serveConfig)
    }
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
    devStore,
  }: {
    entriesFiles: string[]
    bunRunArgs?: string[]
    watch: string[] | boolean
    cwd: string
    /**
     * Server-dev hot reload (POINT0_DEV_SERVER_HOT). When set, the child re-imports the points aggregators from a
     * content-addressed store the orchestrator (re)builds on change. `entries` are the re-importable aggregators
     * (server points + each client points), `appSrcDir` bounds the store to the app source, `storeDir` is passed to the
     * child via `POINT0_DEV_STORE_DIR`.
     */
    devStore?: { storeDir: string; entries: string[]; appSrcDir: string }
  }): Promise<void> {
    // The server child runs under `bun --watch` (see the spawn below). That matters twice: bun reloads it in-process on
    // change, and — crucially for the dev lifecycle — it keeps the child ALIVE (printing the error) when the code
    // throws, instead of letting the process exit. So a developer's syntax/runtime error never makes `child.exited`
    // resolve, and the unexpected-exit teardown is never tripped by a code error you can just fix. On top of bun's own
    // watch, the orchestrator watches the entry's deep-import graph and forces a restart there:
    // - respawn (default): SIGKILL the child and spawn a fresh one (marked in `intentionalKills` so its exit is not
    //   mistaken for a crash).
    // - touch (POINT0_DEV_SERVER_TOUCH_ON_WATCH=true): rewrite the entry file's bytes so bun's own watcher restarts it.
    //
    // Hot mode (`devStore` set) keeps `--watch` on, and it lands exactly where we want: bun's watcher only sees the
    // entry's STATIC import graph — i.e. the boot/cold chain (`*.server.ts` -> engine -> env) — while the points/pages
    // are reached DYNAMICALLY through the store (`import(storeFile)` per request) and are invisible to it (bun#5844).
    // So `--watch` gives the cold chain its restart-on-edit + keep-alive-on-crash for free, and never fights the
    // hot-swap. The orchestrator's import-graph watcher still owns the decision per change: a HOT file (in the point
    // store) -> rebuild the store + bump the manifest, NO restart (the child re-imports the fresh aggregator on its
    // next request, with no React tear); anything else (the cold-marker/cold-config subtree, the boot entry, files
    // outside the store) -> a full child restart.
    const useTouch = process.env.POINT0_DEV_SERVER_TOUCH_ON_WATCH === 'true'

    const activeEntries = Object.values(this.entry || []).filter((entryFile) => entriesFiles.includes(entryFile))

    // Children we kill on purpose (a respawn on import-graph change) so their exit does not look "unexpected" and
    // trip the teardown below.
    const intentionalKills = new Set<Bun.Subprocess<'ignore', 'pipe', 'pipe'>>()

    // One server compiler, shared by the import-graph watcher and (in hot mode) the store builder.
    const compilerOptions = this.getCompilerOptions()
    const compiler = compilerOptions ? Compiler.create(compilerOptions) : undefined
    // Hot mode needs the watcher: the store only rebuilds from a watch event, so with `watch` off a built store would
    // be immortal (edits never picked up). When serverHot is requested but watch is off, fall back to normal
    // restart-based dev rather than serve a frozen store (and skip wiring POINT0_DEV_STORE_DIR into the child).
    // `devStore` carries the resolved aggregator paths; if none are resolvable (e.g. inline points arrays) there is
    // nothing to content-address — also fall back to restart-based dev.
    // `hotStore` is set only when hot mode is fully live (serverHot + watch + a built store with aggregators); its
    // truthiness IS "hot mode" everywhere below. When serverHot is requested but watch is off, warn and fall back to
    // restart-based dev (a never-rebuilt store would be immortal). `devStore` is only handed to us when the engine
    // already resolved at least one aggregator (Engine._resolveServerHotStore returns undefined otherwise — that's
    // where the inline-points-array fallback is decided), so `hasAggregators` here is a cheap belt-and-suspenders guard.
    let hotStore: ServerHotStore | undefined
    if (devStore && compiler && watch) {
      const store = ServerHotStore.forBuild({
        dir: devStore.storeDir,
        appSrcDir: devStore.appSrcDir,
        compiler,
        log: this.log,
      })
      for (const entry of devStore.entries) store.registerAggregator(entry)
      if (store.hasAggregators) hotStore = store
    } else if (devStore && compiler && !watch) {
      this.log({
        level: 'warn',
        category: ['server'],
        message: 'Server hot reload (serverHot) requested but watch is off — using restart-based dev (no hot store).',
      })
    }

    // Hot mode: (re)build the content-addressed point store. The store tracks its own hot node set (a change to one is
    // a hot-swap; anything else is a restart) and version counter; the first build cleans the dir (no child is serving
    // yet), rebuilds leave files in place so none disappears under a concurrent request — the atomic manifest swap
    // flips the live aggregators. See ServerHotStore.
    // Hot mode initial store build. A failure here (a compile error in the points graph; an un-flattenable import in an
    // aggregator) must NOT tear the dev tree down — that would break "infinite dev" (you'd re-run `point0 dev` for every
    // typo). Instead mirror what `bun --watch` does for a crashing boot entry: log the cause and keep the orchestrator +
    // file watcher ALIVE, DEFERRING the server child until a save fixes the build. `storeReady` gates the first spawn;
    // the watcher below retries the build on every change and starts the server the moment it succeeds. (Non-hot dev has
    // no store, so it's always "ready" and spawns immediately — bun --watch keeps a crashing child alive on its own.)
    let storeReady = true
    if (hotStore) {
      try {
        hotStore.rebuild() // first build; on success the child reads a valid manifest
      } catch (error) {
        storeReady = false
        this.log({
          level: 'error',
          category: ['server'],
          message: 'Server hot-reload store build failed — fix the error and save; the server will start automatically',
          error,
        })
      }
    }

    // Per-entry "did the child actually finish booting (bind its port)?" — scraped from the child's own startup log
    // (see EngineServer.serve, which logs `Server started http://…`). A child that CRASHES during boot — e.g. `--hot`
    // was started while a hot file had a syntax error, so the child throws importing the store before `Bun.serve` —
    // never logs this. The hot-node watcher branch reads it: a fix to a never-booted server must RESPAWN it (re-boot
    // against the rebuilt store), not hot-swap a server that never came up. Reset to false on every (re)spawn.
    const SERVER_STARTED_MARKER = 'Server started http'
    const bootedByEntry = new Map<string, boolean>()
    // Memory GC backstop: a hot-swap leaves the child's superseded module versions in Bun's cache forever (no eviction
    // API), so a very long session's heap creeps up. Every Nth booted hot reload we restart instead of hot-swapping to
    // release them — the disk store is GC'd continuously (ServerHotStore sweep), this bounds the in-memory side. Default
    // 200 (a brief restart roughly every 200 edits); `POINT0_DEV_SERVER_HOT_RESTART_EVERY=0` disables it.
    const HOT_RESTART_EVERY = Number(process.env.POINT0_DEV_SERVER_HOT_RESTART_EVERY ?? 200)
    let hotReloadsSinceRespawn = 0
    // Restart pacing. SETTLE: a freshly requested restart waits this long so the rest of the same save burst (an agent
    // edits 3 files in 200ms) collapses into ONE respawn. GRACE: the old child first gets a catchable SIGTERM and this
    // window to run the app's own shutdown hooks (close the DB pool, drain a job queue) before SIGKILL — a dev restart
    // should not sever resources mid-flight on every save.
    const RESTART_SETTLE_MS = Number(process.env.POINT0_DEV_RESTART_SETTLE_MS ?? 120)
    const RESTART_GRACE_MS = Number(process.env.POINT0_DEV_RESTART_GRACE_MS ?? 1500)

    const isChildAlive = (child: Bun.Subprocess<'ignore', 'pipe', 'pipe'>): boolean =>
      child.exitCode === null && child.signalCode === null

    // Per-entry watcher registry, so the boot detector (below) can narrow an entry's watch set the moment it boots.
    const watcherByEntry = new Map<string, FilesWatcher>()

    const spawnEntry = (entryFile: string): Bun.Subprocess<'ignore', 'pipe', 'pipe'> => {
      bootedByEntry.set(entryFile, false)
      const child = Bun.spawn({
        cmd: ['bun', 'run', '--no-orphans', ...(watch ? ['--watch'] : []), ...bunRunArgs, entryFile],
        env: {
          ...process.env,
          // Tells the child's own `serve()` it runs under this orchestrator: bind with patient retries and NEVER
          // force-kill the port's holder (under serialized respawns a transient conflict is always a handover, and the
          // holder may be the predecessor still draining — killing it is how dev trees used to murder themselves).
          POINT0_DEV_CHILD: 'true',
          ...(hotStore ? { POINT0_DEV_STORE_DIR: hotStore.dir } : {}),
        },
        stdin: 'ignore',
        stdout: 'pipe',
        stderr: 'pipe',
      })
      registerDevChild(child)
      void child.exited.then((code) => {
        if (intentionalKills.delete(child) || isDevShuttingDown()) {
          return
        }
        // A superseded child (no longer the entry's tracked child) must not decide the tree's fate — its replacement
        // is already running or spawning. Without this guard a late exit from a replaced child (e.g. it lost a port
        // race) tears down a perfectly healthy dev tree.
        if (childByEntry.get(entryFile) !== child) {
          this.log({
            level: 'debug',
            category: ['server'],
            message: `Superseded server dev process exited (entry "${nodePath.relative(cwd, entryFile)}", code ${String(code)}) — ignoring.`,
          })
          return
        }
        // Hot mode: a child that exits WITHOUT ever having booted (it never logged that it bound the port) crashed
        // DURING boot — almost always importing a store built from a file that was broken at `--hot` startup. That's a
        // fixable code error, not a dead tree: don't tear down. Drop the corpse and leave the watcher to respawn it on
        // the fix (its hot-node branch sees the child is gone and restarts). (A child that HAD booted and then died IS
        // a real crash → tear down.)
        if (hotStore && bootedByEntry.get(entryFile) === false) {
          childByEntry.delete(entryFile)
          this.log({
            level: 'error',
            category: ['server'],
            message: `Server failed to boot (entry "${nodePath.relative(cwd, entryFile)}", code ${String(code)}) — fix the error and save; it will start automatically.`,
          })
          return
        }
        // A booted child died on its own (crash, or an agent freeing its port). The dev tree lives and dies as one
        // unit, so tear the rest down rather than leave a half-alive tree behind.
        requestDevShutdown({
          reason: `Server dev process exited unexpectedly (entry "${nodePath.relative(cwd, entryFile)}", code ${String(code)}). Tearing down dev.`,
          log: this.log,
        })
      })
      pipeStreamStripped({
        stream: child.stdout,
        target: process.stdout,
        onChunk: (raw) => {
          if (!bootedByEntry.get(entryFile) && raw.includes(SERVER_STARTED_MARKER)) {
            bootedByEntry.set(entryFile, true)
            // Now that the server is confirmed up, narrow this entry's watch set from the broad app-src tree back to
            // the precise import graph (don't wait for the next event — until then ANY src file would restart it).
            const entryWatcher = watcherByEntry.get(entryFile)
            if (entryWatcher) {
              void entryWatcher.restart({ cwd, patterns: watchPatterns(entryFile) }).catch(() => undefined)
            }
          }
        },
      })
      pipeStreamStripped({ stream: child.stderr, target: process.stderr })
      return child
    }

    const childByEntry = new Map<string, Bun.Subprocess<'ignore', 'pipe', 'pipe'>>()
    const spawnAll = (): void => {
      if (isDevShuttingDown()) return
      // Idempotent: skip an entry that already has a live child (so a cross-watcher race during recovery can't double-spawn).
      for (const entryFile of activeEntries) {
        if (!childByEntry.has(entryFile)) childByEntry.set(entryFile, spawnEntry(entryFile))
      }
    }
    // When the hot store failed its first build, hold the spawn — the watcher starts the server once a save fixes it.
    if (storeReady) spawnAll()

    if (!watch) {
      return
    }

    const skipImport = (resolved: { pathResolved: string | undefined }) =>
      resolved.pathResolved === undefined || resolved.pathResolved.includes('/node_modules/')
    const userPatterns = Array.isArray(watch) ? watch : []

    const collectEntryPatterns = (entryFile: string): string[] => {
      try {
        return collectImportGraphPatterns({ compiler, entries: [entryFile], userPatterns, skip: skipImport })
      } catch {
        // A compile error somewhere in the import graph can break the deep walk. Fall back to the user patterns plus the
        // entry's own directory tree so we still SEE the fix; the next successful rebuild restores the precise watch set.
        return [...userPatterns, nodePath.join(nodePath.dirname(entryFile), '**', '*')]
      }
    }
    // Watch set for an entry. Precise (import-graph) once the server is CONFIRMED UP; otherwise watch the whole app
    // source tree. "Not up" covers both a failing store build (`storeReady === false`) and a child that crashed at boot
    // (`bootedByEntry` false) — in either state the precise import-graph walk can't be trusted to include the file that
    // will FIX it (a not-yet-resolvable import, or a node whose unparsed subtree the walk silently skipped), and missing
    // that file means the fix is never seen and the server never recovers. Narrow to precise only once it's serving.
    const watchPatterns = (entryFile: string): string[] => {
      const precise = collectEntryPatterns(entryFile)
      const serverUp = storeReady && bootedByEntry.get(entryFile) === true
      if (!serverUp && devStore) return [...precise, nodePath.join(devStore.appSrcDir, '**', '*')]
      return precise
    }

    const touchEntry = async (entryFile: string): Promise<void> => {
      const original = await nodeFs.readFile(entryFile)
      await nodeFs.writeFile(entryFile, Buffer.concat([original, Buffer.from('\n')]))
      await nodeFs.writeFile(entryFile, original)
    }

    // Stop a child the way the tree-wide teardown does: catchable SIGTERM first, a grace window for the app's own
    // shutdown hooks, SIGKILL only for a straggler. The exit is marked intentional BEFORE the signal so it can never
    // race the unexpected-exit handler.
    const killChild = async (child: Bun.Subprocess<'ignore', 'pipe', 'pipe'>): Promise<void> => {
      if (!isChildAlive(child)) {
        return
      }
      intentionalKills.add(child)
      try {
        child.kill('SIGTERM')
      } catch {
        // Already dead or detached.
      }
      await Promise.race([child.exited, new Promise((resolve) => setTimeout(resolve, RESTART_GRACE_MS))])
      if (isChildAlive(child)) {
        try {
          child.kill('SIGKILL')
        } catch {
          // Already dead or detached.
        }
        await child.exited
      }
    }

    const respawnEntry = async (entryFile: string): Promise<void> => {
      const old = childByEntry.get(entryFile)
      if (old) {
        await killChild(old)
      }
      if (isDevShuttingDown()) {
        // The tree began tearing down while we were stopping the old child — never spawn into a dying tree (such a
        // child would outlive the orchestrator's kill sweep and linger orphaned).
        childByEntry.delete(entryFile)
        return
      }
      childByEntry.set(entryFile, spawnEntry(entryFile))
    }

    const restartEntry = useTouch ? touchEntry : respawnEntry

    // Per-entry restart scheduler: at most ONE restart queued at a time, executed strictly one after another. A burst
    // of save events (an agent editing many files back-to-back) requests many restarts; the first waits SETTLE ms (so
    // the burst's tail joins it) and the rest coalesce into it — the entry restarts ONCE per burst, never N times, and
    // never concurrently (concurrent respawns are how multiple children used to race one port and kill each other).
    const restartStateByEntry = new Map<string, { queued: boolean; chain: Promise<void> }>()
    const scheduleRestart = (entryFile: string): void => {
      let state = restartStateByEntry.get(entryFile)
      if (!state) {
        state = { queued: false, chain: Promise.resolve() }
        restartStateByEntry.set(entryFile, state)
      }
      if (state.queued) {
        return
      }
      state.queued = true
      const scheduledState = state
      state.chain = state.chain.then(async () => {
        await new Promise((resolve) => setTimeout(resolve, RESTART_SETTLE_MS))
        scheduledState.queued = false
        if (isDevShuttingDown()) {
          return
        }
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
      })
    }

    for (const entryFile of activeEntries) {
      const initialPatterns = watchPatterns(entryFile)
      if (initialPatterns.length === 0) {
        continue
      }
      const watcher = FilesWatcher.create({ cwd, patterns: initialPatterns })
      watcherByEntry.set(entryFile, watcher)
      await watcher.start({
        onEvent: async (event) => {
          const changed = event.path.split('?', 1)[0] as string
          // Recovery: the hot store's first build failed, so no server is running yet (storeReady=false). Retry on every
          // save; the moment the build succeeds, start the server child(ren) for the first time. Until then stay alive
          // and keep watching — never tear the dev tree down for a fixable error.
          if (hotStore && !storeReady) {
            try {
              hotStore.rebuild()
              storeReady = true
              this.log({
                level: 'info',
                category: ['server'],
                message: `Server hot-reload store recovered — starting server (fixed: ${nodePath.relative(this.cwd, changed)})`,
              })
              spawnAll()
            } catch (error) {
              this.log({
                level: 'error',
                category: ['server'],
                message: `Server hot-reload store still failing — fix the error and save again`,
                error,
              })
            }
            await watcher.restart({ cwd, patterns: watchPatterns(entryFile) })
            return
          }
          // Hot swap: the changed file is a hot store node. Rebuild the store; normally the stable child re-imports the
          // fresh aggregator on its next request — no restart. A child that is ALIVE but still BOOTING needs no restart
          // either: it reads the manifest per request, so once it finishes booting it serves the rebuilt store — killing
          // it mid-boot would only start the boot over (under a steady stream of agent edits that loop literally never
          // converges — each respawn re-arms before the previous boot finishes, and the server stays down for minutes).
          // Only a child that is GONE (crashed importing a then-broken store at `--hot` startup — the unexpected-exit
          // handler dropped it) needs a respawn: that's the real failed-boot recovery.
          if (hotStore?.isHotNode(changed)) {
            const child = childByEntry.get(entryFile)
            const childAlive = child !== undefined && isChildAlive(child)
            const booted = childAlive && bootedByEntry.get(entryFile) === true
            if (booted) hotReloadsSinceRespawn++
            const gcRestart = booted && HOT_RESTART_EVERY > 0 && hotReloadsSinceRespawn >= HOT_RESTART_EVERY
            if (gcRestart) hotReloadsSinceRespawn = 0
            const willRestart = !childAlive || gcRestart
            this.log({
              level: 'info',
              category: ['server'],
              message: !childAlive
                ? `Server recovering a failed boot — restarting... (changed: ${nodePath.relative(this.cwd, changed)})`
                : gcRestart
                  ? `Server hot reload: periodic restart to release the module cache (every ${HOT_RESTART_EVERY} reloads)`
                  : `Server hot reloading... (changed: ${nodePath.relative(this.cwd, changed)})`,
            })
            try {
              hotStore.rebuild()
              // the completion matching "Server hot reloading..." — only when no restart follows (a restarting child
              // announces "Server started" itself, and rebuild() after a cold restart is mere bookkeeping)
              if (!willRestart) {
                this.log({ level: 'info', category: ['server'], message: `Server hot reloaded` })
              }
            } catch (error) {
              this.log({
                level: 'error',
                category: ['server'],
                message: `Hot reload failed — keeping the previous store (fix the error and save again)`,
                error,
              })
            }
            if (willRestart) scheduleRestart(entryFile)
            await watcher.restart({ cwd, patterns: watchPatterns(entryFile) })
            return
          }
          // Full restart: cold-marker subtree, the boot entry, or any file not in the hot store. Coalesced + serialized
          // by the scheduler: a burst of saves lands as ONE respawn, and respawns never overlap.
          this.log({
            level: 'info',
            category: ['server'],
            message: `Server restarting... (changed: ${nodePath.relative(this.cwd, changed)})`,
          })
          scheduleRestart(entryFile)
          if (hotStore) {
            // Boot/cold deps may have shifted the hot/cold classification — rebuild so the watcher stays accurate.
            // A rebuild failure must not block the restart (already scheduled); the dev tree stays alive regardless.
            try {
              hotStore.rebuild()
            } catch (error) {
              this.log({
                level: 'error',
                category: ['server'],
                message: `Store rebuild after restart failed — keeping the previous store (fix the error and save again)`,
                error,
              })
            }
          }
          await watcher.restart({ cwd, patterns: watchPatterns(entryFile) })
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
      external: [
        ...(thisBunBuildConfig.external ?? []),
        ...(providedBunBuildConfig.external ?? []),
        // `vite` (and its optional-peer `esbuild`) are reached only on the lazy vite code paths — never in a Bun-only
        // app. Keep them external so the Bun bundler never pulls vite into the server bundle (which would fail to
        // resolve esbuild when it isn't installed). A Bun-only app thus builds and runs with neither installed.
        'vite',
        'esbuild',
      ],
      plugins: [
        // Server build assets: `writeUrlBytes: false` because the client build already wrote the url bytes (shared
        // content hash → the same `/_point0/asset/<hash>` URL); only `?file` bytes are copied, next to the server bundle.
        ...(await this.extractBunPlugins({
          built: true,
          onDeny: 'throw',
          extraPlugins: [...(thisBunBuildConfig.plugins ?? []), ...(providedBunBuildConfig.plugins ?? [])],
          assetsDirs: { writeUrlBytes: false, fileDir: buildPaths.outdir },
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

  /**
   * Returns the full vite UserConfig that {@link buildByVite} would pass to `vite.build` for this server. Used both
   * internally by `buildByVite` (so there's only one source of truth for the server build config) and from
   * {@link Engine.getViteConfig} when the user's `vite.config.ts` asks for it.
   */
  async getViteConfigForBuild(): Promise<ExtractedViteConfig> {
    if (_point0_env.build.was) {
      throw new Error('You can not build by built engine')
    }
    if (!this.viteConfig) {
      throw new Error(`viteConfig not provided for server`)
    }
    const { NODE_ENV } = this.setEnvVars({ assignToProcessEnv: false, nodeEnvFallback: 'production' })
    const buildPaths = this.getBuildPaths()
    if (!buildPaths.entrypointsExists || !buildPaths.outdir) {
      throw new Error(`No server entrypoints / outdir to build`)
    }
    this.envConsts.NODE_ENV = NODE_ENV

    const compilerOptions = this.getCompilerOptions({ built: true, onDeny: 'throw' })
    if (compilerOptions && compilerOptions.assets) {
      // `?file` build: copy bytes next to the emitted server bundle so server code can read them at runtime (Vite
      // owns `?url`/`?raw`).
      compilerOptions.assets = { ...compilerOptions.assets, fileDir: buildPaths.outdir }
    }
    const compilerPlugin = compilerOptions
      ? [await import('@point0/compiler/plugin/vite').then((module) => module.compilerVitePlugin(compilerOptions))]
      : []

    const loadedViteConfig = await extractViteConfig({
      viteConfig: this.viteConfig,
      command: 'build',
      side: 'server',
      mode: NODE_ENV,
      scope: this.scope,
      plugins: compilerPlugin,
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

    return {
      ...loadedViteConfig,
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
  }

  async buildByVite(options?: { clean?: boolean }): Promise<string[] | null> {
    if (_point0_env.build.was) {
      throw new Error('You can not build by built engine')
    } else {
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

      const config = await this.getViteConfigForBuild()
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

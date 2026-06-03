import { resolveTempDirPath } from '@point0/compiler'
import type { NormalizedNodeEnv, RichFetchFn } from '@point0/core'
import {
  __POINT0_QUERY_CLIENT__,
  _defaultLogFn,
  _getSsItemsWithRestErrors,
  _ssRunWithServerStorageState,
  _ssServerLog,
  type AnyNiceReadyPoint,
  type AnyPoint,
  type ErrorPoint0,
  type EventerEmitFn,
  type FetcherFetchDetailedResult,
  type LogFn,
  type PointsScope,
  type RequiredCtx,
  type UndefinedCtx,
} from '@point0/core'
import type { Serve } from 'bun'
import nodeFs from 'node:fs'
import nodeFsPromises from 'node:fs/promises'
import nodePath from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { EngineClient } from './client.js'
import type { EngineOptions, LoggerOptionsInput } from './config.js'
import { parseEngineOptions } from './config.js'
import type { FileGeneratorProcessResult } from './generator.js'
import { FilesGenerator } from './generator.js'
import type { Publicdir } from './publicdir.js'
import { EngineServer } from './server.js'
import {
  getViteConfigForDev,
  isExtractingViteConfig,
  killSubprocessOnExit,
  normalizeAndValidateNodeEnv,
  registerOnProcessExit,
} from './utils.js'
import { markDevShuttingDown, removeDevLockSync, stopDevTree, writeDevLock } from './devlock.js'
import { FilesWatcher } from './watcher.js'

export class Engine<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
  TPrepared extends boolean = boolean,
> {
  clients: TPrepared extends true ? Array<EngineClient<true, TError>> : EngineClient<false, TError>[]
  get client(): TPrepared extends true ? EngineClient<true, TError> : EngineClient<false, TError> {
    const first = this.clients.at(0)
    if (!first) {
      throw new Error('No clients available in engine. Define at least one client in engine options')
    }
    return first as TPrepared extends true ? EngineClient<true, TError> : EngineClient<false, TError>
  }
  server: TPrepared extends true ? EngineServer<true, TError> : EngineServer<false, TError>
  publicdirs: TPrepared extends true ? Array<Publicdir<true, TError>> : Array<Publicdir<false, TError>>
  log: LogFn
  logger: LoggerOptionsInput | undefined
  generator: FilesGenerator
  prepared: TPrepared
  pointsGlob: string[]
  buildWatchGlob: string[]
  serverDevWatchGlob: string[]
  cwd: string
  wasBuilt: boolean
  file: string

  private readonly __POINT0_ENGINE__ = true as const

  private constructor(input: {
    clients: EngineClient<any, TError>[]
    server: EngineServer<any, any>
    log: LogFn
    logger: LoggerOptionsInput | undefined
    prepared: TPrepared
    generator: FilesGenerator
    publicdirs: Array<Publicdir<false, TError>>
    pointsGlob: string[]
    buildWatchGlob: string[]
    serverDevWatchGlob: string[]
    cwd: string
    wasBuilt: boolean
    file: string
  }) {
    this.clients = input.clients as TPrepared extends true
      ? Array<EngineClient<true, TError>>
      : EngineClient<false, TError>[]
    this.server = input.server as TPrepared extends true ? EngineServer<true, TError> : EngineServer<false, TError>
    this.log = input.log
    this.logger = input.logger
    this.prepared = input.prepared
    this.generator = input.generator
    this.publicdirs = input.publicdirs as TPrepared extends true
      ? Array<Publicdir<true, TError>>
      : Array<Publicdir<false, TError>>
    this.pointsGlob = input.pointsGlob
    this.buildWatchGlob = input.buildWatchGlob
    this.serverDevWatchGlob = input.serverDevWatchGlob
    this.cwd = input.cwd
    this.wasBuilt = input.wasBuilt
    this.file = input.file
  }

  // static create<TRequiredCtx extends RequiredCtx = RequiredCtx>(
  //   fileUrl: string,
  //   options: EngineOptions,
  // ): Engine<TRequiredCtx, false>
  // static create<TRequiredCtx extends RequiredCtx = RequiredCtx>(options: EngineOptions): Engine<TRequiredCtx, false>
  // static create<TRequiredCtx extends RequiredCtx = RequiredCtx>(
  // static create<TRequiredCtx extends RequiredCtx = RequiredCtx>(options: EngineOptions): Engine<TRequiredCtx, false> {
  static create<TRequiredCtx extends RequiredCtx = RequiredCtx, TError extends ErrorPoint0 = ErrorPoint0>(
    options: EngineOptions<TRequiredCtx, TError>,
  ): Engine<TRequiredCtx, TError, false> {
    process.env.POINT0_ENGINE_CWD = options.file
    const parsedOptions = parseEngineOptions(options)

    _ssServerLog.set(parsedOptions.general.log)

    const server = EngineServer.create({
      ...parsedOptions.server,
      cwd: parsedOptions.general.cwd,
      cwdBeforeBuild: parsedOptions.general.cwdBeforeBuild,
      engineFile: parsedOptions.general.engineFile,
      log: parsedOptions.general.log,
      clients: [],
      generalBunPlugins: parsedOptions.general.bunPlugins,
    })

    const clients = parsedOptions.clients.map((clientOptions) => {
      const client = EngineClient.create({
        ...clientOptions,
        cwd: parsedOptions.general.cwd,
        log: parsedOptions.general.log,
        server,
        generalBunPlugins: parsedOptions.general.bunPlugins,
      })
      return client
    })

    const serverClients = clients.filter((client) => client.serving !== false)
    server.clients = serverClients

    const generator = FilesGenerator.create({
      ssr: parsedOptions.general.ssr,
      log: parsedOptions.general.log,
      cwd: parsedOptions.general.cwd,
      glob: parsedOptions.general.pointsGlob,
      routes: parsedOptions.routes,
      tasks: [
        ...parsedOptions.general.generate,
        ...parsedOptions.server.generate,
        ...parsedOptions.clients.flatMap((client) => client.generate),
      ],
    })

    const publicdirs = [server.publicdir, ...serverClients.map((client) => client.publicdir)].flatMap((publicdir) =>
      publicdir ? [publicdir] : [],
    )
    server.publicdirs = publicdirs

    return new Engine({
      clients,
      server,
      log: parsedOptions.general.log,
      logger: parsedOptions.general.logger,
      prepared: false,
      generator,
      publicdirs,
      pointsGlob: parsedOptions.general.pointsGlob,
      buildWatchGlob: parsedOptions.general.buildWatchGlob,
      serverDevWatchGlob: parsedOptions.server.devWatchGlob,
      cwd: parsedOptions.general.cwd,
      wasBuilt: parsedOptions.general.itWasBuilt,
      file: parsedOptions.general.engineFile,
    })
  }

  async preload<TPrepare extends boolean = false>({
    preventSetEnvVars,
    nodeEnvFallback,
    preventLoadBunPlugins,
    prepare = false as TPrepare,
  }: {
    preventSetEnvVars?: boolean
    nodeEnvFallback?: NormalizedNodeEnv
    preventLoadBunPlugins?: boolean
    prepare?: TPrepare
  } = {}): Promise<TPrepare extends true ? Engine<TRequiredCtx, TError, true> : typeof this> {
    await this.server.preload({ preventSetEnvVars, nodeEnvFallback, preventLoadBunPlugins })
    await this.applyLogger()
    if (prepare) {
      await this.prepare()
    }
    return this as TPrepare extends true ? Engine<TRequiredCtx, TError, true> : typeof this
  }

  /**
   * The single source of truth for logger propagation: apply a log fn to every place that holds one in this process —
   * the engine, server, generator and clients, the server/client superstores, and the points manager (once loaded).
   * Future per-side (server/client) overrides would slot in here.
   */
  _setLog(logFn: LogFn): void {
    this.log = logFn
    this.generator.log = logFn
    this.server.log = logFn
    for (const client of this.clients) {
      client.log = logFn
    }
    const manager = this.server.points?.manager
    if (manager) {
      manager.log = logFn
    }
    _ssServerLog.set(logFn)
    // later will fix, for now client uses only default logger
    // _ssClientLog.set(logFn)
  }

  /**
   * Resolve the configured `logger` (awaiting the function form) and propagate it via `_setLog`. Idempotent — the raw
   * `logger` is consumed on first call. Callers must ensure bun plugins are active first (preload in the main process;
   * bunfig in spawned dev children).
   */
  async applyLogger(): Promise<void> {
    const logger = this.logger
    if (logger === undefined) {
      return
    }
    this.logger = undefined
    const config = typeof logger === 'function' ? await logger() : logger
    this._setLog(config.log ?? _defaultLogFn)
  }

  async prepare(): Promise<Engine<TRequiredCtx, TError, true>> {
    if (this.prepared) {
      return this as Engine<TRequiredCtx, TError, true>
    }
    await this.applyLogger()
    await this.server.prepare({ engine: this as Engine<TRequiredCtx, TError, true> })
    await Promise.all(
      this.clients.map(async (client) => {
        if (client.serving === false) {
          return
        }
        return await client.prepare()
      }),
    )
    this.prepared = true as never

    // Warm up publicdir file indexes in the background: usually ready by the first request, but never blocks startup.
    // Swallow failures here — `Publicdir.fetch` re-runs `prepare()` lazily (a failed run resets its promise) and will
    // surface a real error on the request that actually needs it.
    void this.preparePublicdirs().catch((error: unknown) => {
      this.log({
        level: 'error',
        category: ['publicdir'],
        message: 'Failed to warm up publicdirs in background',
        error,
      })
    })

    return this as Engine<TRequiredCtx, TError, true>
  }

  /**
   * Eager-load every publicdir's file index. Optional: publicdirs prepare themselves lazily on their first matching
   * request, so `serve()` no longer blocks on this. Call it explicitly when you need static file serving ready before
   * the first request (e.g. tests, smoke checks) or to warm the index up front.
   */
  async preparePublicdirs(): Promise<void> {
    await Promise.all(this.publicdirs.map((publicdir) => publicdir.prepare()))
  }

  async serveClientDevServers({ scopes }: { scopes?: PointsScope[] | undefined } = {}): Promise<void> {
    await Promise.all(
      this.clients.map(async (client) => {
        if (client.serving === false) {
          return
        }
        if (!scopes || scopes.includes(client.scope)) {
          await client.startDevServer()
        }
      }),
    )
  }

  toEntryPath({ entry, cwd = process.cwd() }: { entry: string; cwd?: string }): string {
    if (entry.startsWith('.') || entry.startsWith('/')) {
      return nodePath.resolve(cwd, entry)
    } else {
      const entryPath = this.server.entry?.[entry]
      if (!entryPath) {
        throw new Error(`Entry point not found for server by name "${entry}"`)
      }
      return entryPath
    }
  }

  async dev(options?: {
    generateFiles?: boolean
    side?: 'server' | 'client' | undefined
    scope?: PointsScope | undefined
    entries?: string[] // paths or names
    bunRunArgs?: string[]
    watch?: string | string[] | boolean
    restart?: boolean
    cwd?: string
  }): Promise<void> {
    const {
      generateFiles = true,
      side,
      scope,
      entries,
      bunRunArgs = [],
      watch: watchProvided,
      cwd = process.cwd(),
    } = options ?? {}
    const watch =
      watchProvided === true
        ? true
        : watchProvided === undefined
          ? this.serverDevWatchGlob
          : watchProvided === false
            ? false
            : Array.isArray(watchProvided)
              ? watchProvided
              : [watchProvided]

    normalizeAndValidateNodeEnv('development')

    // Dev process-tree lifecycle. The dev tree (this orchestrator + server child + client children) must behave as one
    // unit: reap any stale tree left over for this project, then claim a lockfile so `point0 stop` and the next
    // `point0 dev` can find and tear this whole tree down. The lockfile is written before anything is spawned, so its
    // presence always implies "children may exist". Removal + the shutting-down flag are registered on process exit so
    // every teardown path (Ctrl-C, SIGTERM from `point0 stop`, an unexpected child death) cleans up and the children's
    // own exit handlers know not to re-trigger a teardown.
    const reaped = await stopDevTree({ cwd, log: this.log, excludePid: process.pid })
    if (reaped.stopped) {
      this.log({
        level: 'info',
        category: ['dev'],
        message: `Reaped a previous dev tree for this project before starting${reaped.pid ? ` (was pid ${reaped.pid})` : ''}.`,
      })
    }
    await writeDevLock({
      pid: process.pid,
      ppid: process.ppid,
      cwd,
      ports: this.collectDevPorts(),
      startedAt: new Date().toISOString(),
    })
    registerOnProcessExit(() => {
      markDevShuttingDown()
      removeDevLockSync(cwd)
    })

    const isSideServer = !side || side === 'server'
    const isSideClient = !side || side === 'client'
    const isScopeServer = !scope || scope === this.server.scope

    if (generateFiles) {
      await this.generate({ logOnNotWritten: true })
    }
    const generatorWatchProcess = generateFiles && watch ? this.generateWatch() : null
    const withServer = isSideServer && isScopeServer && !!this.server.entry
    const entriesFiles =
      entries && entries.length > 0
        ? entries.map((entry) => this.toEntryPath({ entry, cwd }))
        : Object.values(this.server.entry || {})
    // client dev servers always run as a single instance in this (the engine.dev) process.
    // server entries (subprocesses for bun-native, in-process for vite) just proxy to them.
    const clientsDevServers = isSideClient
      ? this.serveClientDevServers({ scopes: scope ? [scope] : undefined })
      : Promise.resolve()
    if (withServer) {
      const serverEntryProcesses: Array<Promise<any>> = await (async () => {
        this.log({
          level: 'info',
          category: ['server'],
          message: `Server starting...`,
        })
        if (this.server.viteConfig) {
          await this.server.preload({ nodeEnvFallback: 'development', preventLoadBunPlugins: true })
          await this.server.startViteDevServer()
          return [this.server.loadViteDevEntries({ entriesFiles })]
        } else {
          await this.server.startBunDevProcess({ entriesFiles, bunRunArgs, watch, cwd })
          return []
        }
      })()
      await Promise.all([generatorWatchProcess, ...serverEntryProcesses, clientsDevServers])
    } else {
      await Promise.all([generatorWatchProcess, this.prepare(), clientsDevServers])
    }
  }

  /**
   * Every port the dev tree may bind — server + every client, including their hmr ports — recorded in the dev lockfile
   * so `point0 stop` can free them as a fallback if a child outlives its parent. Ports may arrive as strings from env
   * (e.g. `port: process.env.SERVER_PORT`), so they are coerced and de-duplicated here.
   */
  private collectDevPorts(): number[] {
    const ports: number[] = []
    const add = (value: unknown): void => {
      const port = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
      if (Number.isFinite(port) && port > 0) {
        ports.push(port)
      }
    }
    add(this.server.port)
    add(this.server.hmrPort)
    for (const client of this.clients) {
      add(client.port)
      add(client.hmrPort)
    }
    return [...new Set(ports)]
  }

  /**
   * Return the engine's contribution to a vite `UserConfig` — currently the point0 compiler plugin (when enabled) and
   * the right `root`. Intended for use from a project's native `vite.config.ts`:
   *
   * ```ts
   * import { defineConfig, mergeConfig } from 'vite'
   * import { engine } from './src/engine'
   *
   * export default defineConfig(async (env) => {
   *   const base = await engine.getViteConfig(env)
   *   return mergeConfig(base, { plugins: [react()] })
   * })
   * ```
   *
   * `env` is native vite `ConfigEnv` (`{ command, mode, isSsrBuild, isPreview }`); the engine may also pass `side` and
   * `scope` when it loads this config itself (`engine.dev` / `engine.build`). When neither is present (e.g. vitest
   * loads the file), defaults are used — `side` follows `isSsrBuild`, `scope` falls back to the first available client
   * (or the server scope).
   */
  /**
   * Returns the FULL vite config the engine would use for the given side/command. This is the single source of truth —
   * internally `client.buildByVite`, `server.buildByVite`, and the dev-server setup all derive from the same
   * `getViteConfigFor{Dev,Build}` helpers — so what the user gets here is bit-for-bit what the engine itself would run
   * with.
   *
   * Two callers, two paths:
   *
   * 1. The user's `vite.config.ts` calls `engine.getViteConfig(env)` to compose with their own overrides via
   *    `mergeConfig`. When this happens DURING the engine's own extraction (i.e. `engine.dev()` / `engine.build()` is
   *    loading that same `vite.config.ts` via the `viteConfig: '../vite.config.ts'` string form), we'd otherwise
   *    recurse forever. The {@link isExtractingViteConfig} guard short-circuits that case and returns just the engine's
   *    bare contribution (compiler plugin + root + the `plugins` already passed in via `env.plugins`) — enough for the
   *    user's `mergeConfig` to produce a valid config, and the engine's outer extraction will still produce the full
   *    config after the user function returns.
   * 2. Vitest / raw `vite` / IDE introspection loads `vite.config.ts` directly, with no extraction in progress. We
   *    dispatch to the matching `getViteConfigFor{Dev,Build}` and return the FULL config (plugins, root, define,
   *    build.rolldownOptions, etc.).
   */
  async getViteConfig(
    env: {
      command?: 'serve' | 'build'
      mode?: string
      isSsrBuild?: boolean
      isPreview?: boolean
      side?: 'server' | 'client'
      scope?: PointsScope
      plugins?: import('vite').Plugin[]
    } = {},
  ): Promise<import('vite').UserConfig> {
    // `side`/`scope` resolution order:
    //   1. explicit arg from the caller (engine internally passes these)
    //   2. `POINT0_SIDE` / `POINT0_SCOPE` env vars — handy when the same `vite.config.ts` is
    //      invoked by a tool (vitest, raw `vite`) and you want to control which target it sees
    //      without editing the file (e.g. `POINT0_SIDE=server vitest`)
    //   3. inferred fallback (`isSsrBuild` for side, first client / server scope for scope)
    const envVarSide =
      process.env.POINT0_SIDE === 'server' || process.env.POINT0_SIDE === 'client' ? process.env.POINT0_SIDE : undefined
    const envVarScope = process.env.POINT0_SCOPE ? (process.env.POINT0_SCOPE as PointsScope) : undefined
    const side: 'server' | 'client' = env.side ?? envVarSide ?? (env.isSsrBuild ? 'server' : 'client')
    const command: 'serve' | 'build' = env.command ?? 'serve'

    // Recursion guard — see jsdoc above.
    if (isExtractingViteConfig()) {
      const root = nodePath.dirname(this.file)
      if (env.plugins !== undefined) {
        return { plugins: env.plugins, root }
      }
      const target =
        side === 'server'
          ? this.server
          : (this.clients.find((c) => c.scope === (env.scope ?? envVarScope ?? this.clients.at(0)?.scope)) ??
            this.clients.at(0))
      if (!target) return { root }
      const compilerOptions = target.getCompilerOptions({ built: command === 'build' })
      if (!compilerOptions) return { root }
      const { compilerVitePlugin } = await import('@point0/compiler/plugin/vite')
      return { plugins: [compilerVitePlugin(compilerOptions)], root }
    }

    // Full-config path: dispatch to the same helpers the engine uses internally.
    if (side === 'server') {
      if (command === 'build') {
        return await this.server.getViteConfigForBuild()
      }
      return await getViteConfigForDev({
        viteConfig: this.server.viteConfig,
        scope: this.server.scope,
        side: 'server',
        hmrPort: this.server.hmrPort,
        mode: (env.mode as NormalizedNodeEnv | undefined) ?? normalizeAndValidateNodeEnv('development'),
        envConsts: this.server.envConsts,
        engineFile: this.server.engineFile,
        compilerOptions: this.server.getCompilerOptions({ built: false }),
      })
    }

    const scope = env.scope ?? envVarScope ?? this.clients.at(0)?.scope
    const client = this.clients.find((c) => c.scope === scope) ?? this.clients.at(0)
    if (!client) return {}
    if (command === 'build') {
      return await client.getViteConfigForBuild()
    }
    return await getViteConfigForDev({
      viteConfig: client.viteConfig,
      scope: client.scope,
      side: 'client',
      hmrPort: client.hmrPort,
      mode: (env.mode as NormalizedNodeEnv | undefined) ?? normalizeAndValidateNodeEnv('development'),
      envConsts: client.envConsts,
      engineFile: client.engineFile,
      compilerOptions: client.getCompilerOptions({ built: false }),
    })
  }

  async serve(
    ...args: TRequiredCtx extends UndefinedCtx
      ? [
          options?: {
            requiredCtx?: TRequiredCtx
          } & Partial<Serve.Options<any, any>>,
        ]
      : [
          options: {
            requiredCtx: TRequiredCtx
          } & Partial<Serve.Options<any, any>>,
        ]
  ): Promise<void> {
    const options = args[0] ?? {}
    await this.prepare()
    await this.server.serve(options)
  }

  async dispose(): Promise<void> {
    await Promise.all([
      ...this.clients.map(async (client) => {
        await client.dispose()
      }),
      this.server.dispose(),
    ])
  }

  async fetchDetailed(
    ...args: TRequiredCtx extends UndefinedCtx
      ? [request: string | URL | Request, options?: { requiredCtx?: TRequiredCtx } & RequestInit]
      : [request: string | URL | Request, options: { requiredCtx: TRequiredCtx } & RequestInit]
  ): Promise<FetcherFetchDetailedResult<ErrorPoint0>> {
    if (!this.server.prepared) {
      throw new Error('Engine server is not prepared. Please call await engine.prepare() first.')
    }
    const request = args[0] instanceof Request ? args[0] : new Request(args[0], args[1])
    const { requiredCtx } = args[1] ?? {}
    const result = await this.server.fetchDetailed({
      request,
      requiredCtx,
    })
    return result
  }
  async fetch(
    ...args: TRequiredCtx extends UndefinedCtx
      ? [request: string | URL | Request, options?: { requiredCtx?: TRequiredCtx } & RequestInit]
      : [request: string | URL | Request, options: { requiredCtx: TRequiredCtx } & RequestInit]
  ): Promise<Response> {
    const result = await this.fetchDetailed(...args)
    return result.response
  }

  withFetch<TCallback extends (fetch: typeof this.fetch) => any>(callback: TCallback): ReturnType<TCallback> {
    const fetchFn = this.fetch.bind(this)
    const serverStorageState = _getSsItemsWithRestErrors(
      {
        __POINT0_SERVER_PORT__: this.server.port,
        __POINT0_FETCH_FN__: fetchFn as RichFetchFn,
        __POINT0_QUERY_CLIENT__: __POINT0_QUERY_CLIENT__.getWeak() || __POINT0_QUERY_CLIENT__.config.init(),
      },
      'Value "%s" not exists in server storage context yet',
    )
    return _ssRunWithServerStorageState(serverStorageState, () => {
      return callback(fetchFn)
    })
  }

  async clean(): Promise<void> {
    await Promise.all([...this.clients.map(async (client) => await client.clean()), this.server.clean()])
  }

  async prune(): Promise<void> {
    const removeDirAsync = async (dir: string) => {
      await nodeFsPromises.rm(dir, { recursive: true }).catch(() => {
        /* ignore */
      })
    }
    // const generator = resolveTempDirPath(['generator'])
    // const compilerVirtual = resolveTempDirPath(['compiler-virtual'])
    // const clientBunDevServer = resolveTempDirPath(['client-bun-dev-server'])
    // const compilerCache = resolveTempDirPath(['compiler-cache'])
    // await Promise.all([
    //   removeDirAsync(generator),
    //   removeDirAsync(compilerVirtual),
    //   removeDirAsync(clientBunDevServer),
    //   removeDirAsync(compilerCache),
    // ])
    const cacheDir = resolveTempDirPath()
    await removeDirAsync(cacheDir)
  }

  async build(options?: {
    generate?: boolean
    side?: 'server' | 'client' | undefined
    scope?: PointsScope
    clean?: boolean
    publicdir?: boolean
    file?: string
  }): Promise<{
    clients: Array<{
      client: string[] | null
      publicdir: string[] | null
      scope: PointsScope
    }>
    server: { server: string[] | null; publicdir: string[] | null }
  }> {
    const startedAt = performance.now()
    this.log({
      level: 'info',
      category: ['build'],
      message: 'Build...',
    })
    const { generate = true, side, scope, clean = true, publicdir } = options ?? {}
    normalizeAndValidateNodeEnv('production')

    if (generate) {
      await this.generator.sync({ logOnNotWritten: true })
    }

    const isSideServer = side === 'server' || !side
    const isSideClient = side === 'client' || !side
    const isScopeServer = !scope || (scope && scope === this.server.scope)
    const isScopeClient = (clientScope: PointsScope) => !scope || clientScope === scope

    if (clean) {
      await Promise.all([
        ...(isSideClient
          ? this.clients.map(async (client) => {
              if (!isScopeClient(client.scope)) {
                return
              }
              await client.clean()
            })
          : []),
        ...(isScopeServer && isSideServer ? [this.server.clean()] : []),
      ])
    }

    const buildClientsPromise = Promise.all(
      this.clients.map(async (client) => {
        if (!isScopeClient(client.scope)) {
          return {
            client: null,
            publicdir: null,
            scope: client.scope,
          }
        }
        const buildOutput = await client.build({
          publicdir,
          clean: false,
        })
        return {
          client: buildOutput.client,
          publicdir: buildOutput.publicdir,
          scope: client.scope,
        }
      }),
    )
    const buildServerPromise = (async () => {
      if (isScopeServer && isSideServer) {
        return await this.server.build({
          clean: false,
          publicdir,
        })
      } else {
        return { server: null, publicdir: null }
      }
    })()
    const [clients, server] = await Promise.all([buildClientsPromise, buildServerPromise])
    const duration = performance.now() - startedAt
    const durationMs = Math.round(duration)
    this.log({
      level: 'info',
      category: ['build'],
      message: `Build completed in ${durationMs}ms`,
    })
    return { clients, server }
  }

  async buildWatch(options?: {
    generate?: boolean
    watch?: string | string[] | true | undefined
    side?: 'server' | 'client' | undefined
    scope?: PointsScope
    clean?: boolean
    publicdir?: boolean
    file?: string
    cwd?: string
  }): Promise<void> {
    const { watch, cwd = this.cwd, ...buildOptions } = options ?? {}
    const globs = !watch || watch === true ? this.buildWatchGlob : Array.isArray(watch) ? watch : [watch]
    if (globs.length === 0) {
      throw new Error(
        'Build watch glob is not provided, please provide --watch <glob> or set buildWatchGlob in engine options',
      )
    }
    let currentBuildProcess: ReturnType<typeof Bun.spawn> | undefined
    killSubprocessOnExit(() => currentBuildProcess)
    const toCliBuildArgs = (): string[] => {
      const args = []
      if (buildOptions.scope) {
        args.push('--scope', buildOptions.scope)
      }
      if (buildOptions.side) {
        args.push('--side', buildOptions.side)
      }
      if (buildOptions.generate === false) {
        args.push('--no-generate')
      }
      if (buildOptions.clean === false) {
        args.push('--no-clean')
      }
      if (buildOptions.publicdir === false) {
        args.push('--no-publicdir')
      }
      const engineFile = buildOptions.file || Engine.findSelfFile({ cwd: this.cwd }) // this.cwd becouse we will found it here 100%
      if (!engineFile) {
        throw new Error('Engine file is not provided')
      }
      args.push('--engine', engineFile)
      return args
    }
    const stopCurrentBuild = async (): Promise<void> => {
      const processToStop = currentBuildProcess
      if (!processToStop) {
        return
      }
      currentBuildProcess = undefined
      try {
        processToStop.kill('SIGKILL')
      } catch {
        // Process may already be finished.
      }
      try {
        await processToStop.exited
      } catch {
        // Ignore spawn/exit race errors while stopping.
      }
    }
    const startBuild = (): void => {
      const cmd = ['bunx', 'point0', 'build', ...toCliBuildArgs()]
      const buildProcess = Bun.spawn({
        cmd,
        cwd: this.cwd, // this.cwd becouse we will found it here 100%
        stdout: 'inherit',
        stderr: 'inherit',
        stdin: 'ignore',
        env: {
          ...process.env,
          FORCE_COLOR: process.env.FORCE_COLOR ?? '1',
        },
      })
      currentBuildProcess = buildProcess
      void buildProcess.exited
        .then((exitCode) => {
          if (currentBuildProcess !== buildProcess) {
            return
          }
          currentBuildProcess = undefined
          if (exitCode !== 0) {
            this.log({
              level: 'warn',
              category: ['build'],
              message: `Build process exited with code ${exitCode}. Watching for next change...`,
            })
          }
        })
        .catch((error) => {
          if (currentBuildProcess !== buildProcess) {
            return
          }
          currentBuildProcess = undefined
          this.log({
            level: 'error',
            category: ['build'],
            message: 'Build process failed. Watching for next change...',
            error,
          })
        })
    }
    const watcher = FilesWatcher.create({
      cwd,
      patterns: globs,
    })
    try {
      this.log({
        level: 'info',
        category: ['build'],
        message: 'Build watcher started',
      })
      startBuild()
      await watcher.start({
        onEvent: async (_event) => {
          await stopCurrentBuild()
          startBuild()
        },
        onError: async (error) => {
          this.log({
            level: 'error',
            category: ['build', 'watch'],
            message: 'Watcher error. Still watching for changes...',
            error,
          })
        },
      })
    } catch (error) {
      this.log({
        level: 'error',
        category: ['build', 'watch'],
        message: 'Failed to start build watcher',
        error,
      })
    }
  }

  async generate({
    logOnNotWritten = true,
    silent,
  }: {
    logOnNotWritten?: boolean
    silent?: boolean
  } = {}): Promise<FileGeneratorProcessResult> {
    return await this.generator.sync({ logOnNotWritten, silent })
  }

  async generateWatch({
    logOnNotWritten = false,
    sync = true,
  }: {
    logOnNotWritten?: boolean
    sync?: boolean
  } = {}): Promise<void> {
    if (sync) {
      void this.generator.sync({ logOnNotWritten }).catch((error: unknown) => {
        this.log({
          level: 'error',
          category: ['generator'],
          message: 'Failed to generate files',
          error,
        })
      })
    }
    await this.generator.watch()
  }

  static findSelfFile(options?: { cwd: string }): string | undefined {
    const { cwd: providedCwd = process.cwd() } = options ?? {}
    let cwd = providedCwd
    if (!nodePath.isAbsolute(cwd)) {
      cwd = nodePath.resolve(process.cwd(), providedCwd)
    }
    const subdirs = ['.', './src', './lib', './src/lib', './point0', './src/point0', './lib/point0', './src/lib/point0']
    const basenames = ['engine']
    const extnames = ['ts', 'js', 'tsx', 'jsx']
    for (const subdir of subdirs) {
      for (const basename of basenames) {
        for (const extname of extnames) {
          const filePath = nodePath.resolve(cwd, subdir, basename + '.' + extname)
          if (nodeFs.existsSync(filePath)) {
            return filePath
          }
        }
      }
    }
    return undefined
  }

  static async findAndImportSelf(options?: {
    engineFile?: string | undefined
    cwd?: string
  }): Promise<{ engine: Engine; engineFile: string }> {
    const { engineFile: providedEngineFile = process.env.POINT0_ENGINE_FILE, cwd = process.cwd() } = options ?? {}
    let engineFile: string | undefined

    if (providedEngineFile) {
      // Resolve the path (handles both absolute and relative paths)
      engineFile = nodePath.resolve(cwd, providedEngineFile)
      if (!nodeFs.existsSync(engineFile)) {
        throw new Error(`Engine file not found: ${engineFile}`)
      }
    } else {
      // Auto-find engine file
      engineFile = Engine.findSelfFile({ cwd })
      if (!engineFile) {
        throw new Error(
          'Could not find engine.ts or engine.js file. Searched in: ./, ./src/. Use --engine <path> to specify the engine file location',
        )
      }
    }

    try {
      const engineUrl = pathToFileURL(engineFile).href
      const module = await import(/* @preserve */ /* @vite-ignore */ engineUrl)

      // Try named export first, then default
      const engine = module.engine ?? module.default

      if (!engine) {
        throw new Error('engine.ts must export "engine" or have a default export')
      }

      // Check if it's an Engine instance
      if (
        !(engine instanceof Engine) &&
        !(
          typeof engine === 'object' &&
          engine !== null &&
          '__POINT0_ENGINE__' in engine &&
          engine.__POINT0_ENGINE__ === true
        )
      ) {
        throw new Error('Exported engine must be an instance of Engine')
      }

      return { engine, engineFile }
    } catch (error) {
      throw new Error(`Error importing engine: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      })
    }
  }

  guessSideAndScope(options?: { side?: string; scope?: PointsScope }): {
    side: 'server' | 'client'
    scope: PointsScope
  } {
    const { side, scope } = options ?? {}
    if (side && side !== 'server' && side !== 'client') {
      throw new Error(`Invalid side: ${side}, valid values are 'server' or 'client'`)
    }
    const hasServer = this.server.compiler !== false
    const serverScope = hasServer ? this.server.scope : undefined
    const clientScopes = [
      ...new Set(this.clients.filter((client) => client.compiler !== false).map((client) => client.scope)),
    ]
    const hasClient = clientScopes.length > 0

    if (scope) {
      const matchesServer = hasServer && scope === serverScope
      const matchesClient = hasClient && clientScopes.includes(scope)
      if (side === 'server') {
        if (!hasServer) {
          throw new Error('Server side is not available in engine')
        }
        if (!matchesServer) {
          throw new Error(`Scope "${scope}" is not suitable for side "server"`)
        }
        return { side: 'server', scope }
      }
      if (side === 'client') {
        if (!hasClient) {
          throw new Error('Client side is not available in engine')
        }
        if (!matchesClient) {
          throw new Error(`Scope "${scope}" is not suitable for side "client"`)
        }
        return { side: 'client', scope }
      }
      if (matchesServer && matchesClient) {
        throw new Error(`Scope "${scope}" is available for both server and client. Provide "--side" explicitly`)
      }
      if (matchesServer) {
        return { side: 'server', scope }
      }
      if (matchesClient) {
        return { side: 'client', scope }
      }
      throw new Error(`Scope "${scope}" was not found in engine`)
    }

    if (side === 'server') {
      if (!hasServer || !serverScope) {
        throw new Error('Server side is not available in engine')
      }
      return { side: 'server', scope: serverScope }
    }
    if (side === 'client') {
      if (!hasClient) {
        throw new Error('Client side is not available in engine')
      }
      if (clientScopes.length > 1) {
        throw new Error('Option "--scope" is required for side "client" when multiple client scopes are available')
      }
      return { side: 'client', scope: clientScopes[0] as PointsScope }
    }

    if (hasServer && hasClient) {
      throw new Error(
        'Can not detect scope: both server and client are available. Provide "--side" (and maybe "--scope")',
      )
    }
    if (!hasServer && !hasClient) {
      throw new Error('Can not detect scope: both server and client are unavailable in engine')
    }
    if (hasServer && serverScope) {
      return { side: 'server', scope: serverScope }
    }
    if (clientScopes.length === 1) {
      return { side: 'client', scope: clientScopes[0] as PointsScope }
    }
    if (clientScopes.length > 1) {
      throw new Error('Can not detect scope automatically: multiple client scopes are available')
    }
    throw new Error('Scope was not detected by provided options')
  }

  getEmit({
    point,
    scope,
  }: {
    point?: AnyPoint | AnyNiceReadyPoint | undefined
    scope?: PointsScope | undefined
  } = {}): EventerEmitFn<TError> | undefined {
    if (point) {
      return point.point._emit.bind(point.point) as EventerEmitFn<TError>
    }
    if (scope) {
      const root = this.server.points?.roots.get(scope)
      if (root) {
        return root._emit.bind(root) as EventerEmitFn<TError>
      }
    }
    const root = this.server.points?.roots.get(this.server.scope)
    if (root) {
      return root._emit.bind(root) as EventerEmitFn<TError>
    }
    return undefined
  }

  isFileInEngineDir(file: string = Bun.main): boolean {
    const engineFileDir = nodePath.dirname(this.file)
    return !nodePath.relative(engineFileDir, file).startsWith('..')
  }

  isCliFile(file: string = Bun.main): boolean {
    const selfDir = nodePath.dirname(fileURLToPath(import.meta.url))
    const names = ['cli']
    const exts = ['js', 'ts', 'mjs', 'cjs', 'mts', 'cts']
    const paths = new Set<string>()
    for (const name of names) {
      for (const ext of exts) {
        paths.add(nodePath.resolve(selfDir, `${name}.${ext}`))
      }
    }
    return paths.has(file)
  }

  async readEverything(): Promise<void> {
    await this.server.readPoints()
    await Promise.all([
      ...this.clients.flatMap((client) => [client.readPoints(), client.readAppComponent()]),
      this.server.readPoints(),
    ])
  }
}

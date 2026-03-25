import {
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
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { pathToFileURL } from 'node:url'
import { EngineClient } from './client.js'
import { parseEngineOptions } from './config.js'
import type { EngineOptions } from './config.js'
import { FilesGenerator } from './generator.js'
import type { FileGeneratorProcessResult, FilesGeneratorPointsFilesChangeWatcher } from './generator.js'
import { killPort } from './port.js'
import type { Publicdir } from './publicdir.js'
import { EngineServer } from './server.js'
import { normalizeAndValidateNodeEnv } from './utils.js'
import { FilesWatcher } from './watcher.js'

export class Engine<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
  TPrepared extends boolean = boolean,
> {
  clients: TPrepared extends true ? Array<EngineClient<true>> : EngineClient[]
  server: TPrepared extends true ? EngineServer<true, TError> : EngineServer<false, TError>
  publicdirs: TPrepared extends true ? Array<Publicdir<true, TError>> : Array<Publicdir<false, TError>>
  log: LogFn
  generator: FilesGenerator
  prepared: TPrepared
  pointsGlob: string[]
  buildWatchGlob: string[]
  cwd: string

  private readonly __POINT0_ENGINE__ = true as const

  private constructor(input: {
    clients: EngineClient[]
    server: EngineServer<any, any>
    log: LogFn
    prepared: TPrepared
    generator: FilesGenerator
    publicdirs: Array<Publicdir<false, TError>>
    pointsGlob: string[]
    buildWatchGlob: string[]
    cwd: string
  }) {
    this.clients = input.clients as TPrepared extends true ? Array<EngineClient<true>> : EngineClient[]
    this.server = input.server as TPrepared extends true ? EngineServer<true, TError> : EngineServer<false, TError>
    this.log = input.log
    this.prepared = input.prepared
    this.generator = input.generator
    this.publicdirs = input.publicdirs as TPrepared extends true
      ? Array<Publicdir<true, TError>>
      : Array<Publicdir<false, TError>>
    this.pointsGlob = input.pointsGlob
    this.buildWatchGlob = input.buildWatchGlob
    this.cwd = input.cwd
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
      tasks: [...parsedOptions.server.generate, ...parsedOptions.clients.flatMap((client) => client.generate)],
    })

    const publicdirs = [server.publicdir, ...serverClients.map((client) => client.publicdir)].flatMap((publicdir) =>
      publicdir ? [publicdir] : [],
    )
    server.publicdirs = publicdirs

    return new Engine({
      clients,
      server,
      log: parsedOptions.general.log,
      prepared: false,
      generator,
      publicdirs,
      pointsGlob: parsedOptions.general.pointsGlob,
      buildWatchGlob: parsedOptions.general.buildWatchGlob,
      cwd: parsedOptions.general.cwd,
    })
  }

  // async prepare(): Promise<Engine<true>> {
  async prepare(options?: { preventClientDevServers?: boolean }): Promise<Engine<TRequiredCtx, TError, true>> {
    const { preventClientDevServers } = options ?? {}
    if (this.isPrepared()) {
      return this as Engine<TRequiredCtx, TError, true>
    }

    await this.server.prepare({ engine: this as Engine<TRequiredCtx, TError, true> })
    await Promise.all(
      this.clients.map(async (client) => {
        if (client.serving === false) {
          return
        }
        return await client.prepare({
          preventDevServer: preventClientDevServers,
        })
      }),
    )
    this.prepared = true as never

    return this as Engine<TRequiredCtx, TError, true>
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

  isPrepared(): this is Engine<TRequiredCtx, TError, true> {
    return !!this.prepared
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
    // engineFile: string
    generateFiles?: boolean
    // clientDevServersOnly?: boolean
    side?: 'server' | 'client' | undefined
    scope?: PointsScope | undefined
    entries?: string[] // paths or names
    bunRunArgs?: string[]
    watch?: boolean
    cwd?: string
  }): Promise<void> {
    // const hot = options.hot !== false
    const {
      // engineFile,
      generateFiles = true,
      // clientDevServersOnly,
      side,
      scope,
      entries,
      bunRunArgs = [],
      watch = true,
      cwd = process.cwd(),
    } = options ?? {}
    normalizeAndValidateNodeEnv('development')
    const isSideServer = !side || side === 'server'
    const isSideClient = !side || side === 'client'
    const isScopeServer = !scope || scope === this.server.scope
    const isScopeClient = (clientScope: PointsScope) => !scope || clientScope === scope

    const registerKillPortsOnSelfProcessEnding = (): void => {
      const ports = [
        ...(!isSideServer || !isScopeServer ? [] : [this.server.port, this.server.hmrPort]),
        ...this.clients.flatMap((client) =>
          !isSideClient || !isScopeClient(client.scope) ? [] : [client.port, client.hmrPort],
        ),
      ].flatMap((port) => (typeof port === 'number' ? [port] : []))
      const uniqPorts = [...new Set(ports)]
      if (uniqPorts.length === 0) {
        return
      }
      let inProgress = false
      const onEnd = async (): Promise<void> => {
        if (inProgress) {
          return
        }
        inProgress = true
        try {
          await killPort(uniqPorts, {
            force: true,
            silent: true,
            category: ['engine', 'dev', 'shutdown'],
          })
        } finally {
          inProgress = false
        }
      }
      process.once('beforeExit', () => {
        void onEnd()
      })
      process.once('exit', () => {
        void onEnd()
      })
      process.once('SIGINT', () => {
        void onEnd().finally(() => {
          process.exit(130)
        })
      })
      process.once('SIGTERM', () => {
        void onEnd().finally(() => {
          process.exit(143)
        })
      })
    }
    registerKillPortsOnSelfProcessEnding()

    // const generatorProcess = generateFiles ? (watch ? this.generateWatch() : this.generate()) : null
    if (generateFiles) {
      await this.generate({ logOnNotWritten: false })
    }
    const generatorWatchProcess = generateFiles && watch ? this.generateWatch() : null
    const withServer = isSideServer && isScopeServer && !!this.server.entry
    const entriesFiles =
      entries && entries.length > 0
        ? entries.map((entry) => this.toEntryPath({ entry, cwd }))
        : Object.values(this.server.entry || {})
    if (withServer) {
      // here we run server entries which already serving server, but prevent multiple client dev servers, so we do not run it here
      const serverEntryProcesses: Array<Promise<any>> = await (async () => {
        if (this.server.viteConfig) {
          process.env.POINT0_PREVENT_CLIENT_DEV_SERVER = 'true'
          await this.server.startViteDevServer()
          return [this.server.loadViteDevEntries({ watch, entriesFiles })]
        } else {
          let isFirstStart = true
          const start = () => {
            const overridenPortPolicyEnv = isFirstStart
              ? {}
              : {
                  [`POINT0_PORT_POLICY_${this.server.scope.toUpperCase()}_SERVER`]: 'kill',
                }
            isFirstStart = false
            return Object.values(this.server.entry || [])
              .filter((entryFile) => entriesFiles.includes(entryFile))
              .map((entryFile) => {
                return Bun.spawn({
                  cmd: ['bun', 'run', ...(watch ? ['--watch'] : []), ...bunRunArgs, entryFile],
                  env: {
                    ...process.env,
                    ...overridenPortPolicyEnv,
                    POINT0_PREVENT_CLIENT_DEV_SERVER: 'true',
                  },
                  stdout: 'inherit',
                  stderr: 'inherit',
                })
              })
          }

          let processes = start()
          this.onPointFileChange((_event, _path, _points) => {
            processes.forEach((p) => {
              p.kill('SIGKILL')
            })
            processes = start()
          })
          return []
        }
      })()
      // and here we run one instance of client dev servers per each client
      const clientsDevSevers =
        isSideClient && isScopeClient(this.server.scope)
          ? this.serveClientDevServers({ scopes: scope ? [scope] : undefined })
          : Promise.resolve()
      await Promise.all([generatorWatchProcess, ...serverEntryProcesses, clientsDevSevers])
    } else {
      // when we prepare, we create and also start clientDevServers
      await Promise.all([generatorWatchProcess, this.prepare()])
    }
  }

  async serve(
    ...args: TRequiredCtx extends UndefinedCtx
      ? [
          options?: {
            requiredCtx?: TRequiredCtx
          },
        ]
      : [
          options: {
            requiredCtx: TRequiredCtx
          },
        ]
  ): Promise<void> {
    const { requiredCtx } = args[0] ?? {}
    // if (!this.isPrepared()) {
    //   throw new Error(
    //     'Engine is not prepared. Please call await engine.prepare() first. And do it in each server entrypoint file, strongly before any other import',
    //   )
    // }
    await this.prepare()
    await this.server.serve({ requiredCtx })
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
    if (!this.isPrepared()) {
      throw new Error('Engine is not prepared. Please call await engine.prepare() first.')
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

  // richFetch: RichFetchFn = async (...args) => {
  //   const request = args[0] instanceof Request ? args[0] : new Request(args[0], args[1])
  //   return await (this.fetch as any)(request)
  // }

  // richFetchDetailed: RichFetchFn = async (...args) => {
  //   const request = args[0] instanceof Request ? args[0] : new Request(args[0], args[1])
  //   return await (this.fetchDetailed as any)(request)
  // }

  async clean(): Promise<void> {
    await Promise.all([...this.clients.map(async (client) => await client.clean()), this.server.clean()])
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
      await this.generator.sync({ logOnNotWritten: false })
    }

    const isSideServer = side === 'server' || !side
    const isSideClient = side === 'client' || !side
    const isScopeServer = !scope || (scope && scope === this.server.scope)
    const isScopeClient = (clientScope: PointsScope) => !scope || clientScope === scope

    // const preparedEngine = await this.prepare()

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
    watch?: string | string[] | undefined
    side?: 'server' | 'client' | undefined
    scope?: PointsScope
    clean?: boolean
    publicdir?: boolean
    file?: string
    cwd?: string
  }): Promise<void> {
    const { watch, cwd = this.cwd, ...buildOptions } = options ?? {}
    const glob = !watch ? this.buildWatchGlob : Array.isArray(watch) ? watch : [watch]
    if (glob.length === 0) {
      throw new Error(
        'Build watch glob is not provided, please provide --watch <glob> or set buildWatchGlob in engine options',
      )
    }
    const globInclude = glob.filter((g) => !g.startsWith('!')).map((g) => nodePath.resolve(cwd, g))
    const globExclude = glob.filter((g) => g.startsWith('!')).map((g) => nodePath.resolve(cwd, g.slice(1)))
    let currentBuildProcess: ReturnType<typeof Bun.spawn> | undefined
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
        stdin: 'inherit',
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
      ignore: globExclude,
      patterns: globInclude,
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

  onPointFileChange(callback: FilesGeneratorPointsFilesChangeWatcher): void {
    this.generator.onPointFileChange(callback)
  }

  static findSelfFile(options?: { cwd: string }): string | undefined {
    const { cwd: providedCwd = process.cwd() } = options ?? {}
    let cwd = providedCwd
    if (!nodePath.isAbsolute(cwd)) {
      cwd = nodePath.resolve(process.cwd(), providedCwd)
    }
    // TODO: add more places to look for engine file
    const subdirs = ['.', './src']
    const basenames = ['engine.ts', 'engine.js']
    for (const subdir of subdirs) {
      for (const basename of basenames) {
        const filePath = nodePath.resolve(cwd, subdir, basename)
        if (nodeFs.existsSync(filePath)) {
          return filePath
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
      const module = await import(/* @vite-ignore */ engineUrl)

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

  // getErrorClass<TError extends ErrorPoint0>(fallback: ClassLikeError0<TError> | undefined): ClassLikeError0<TError> {
  //   return (this.server.points?.manager.root._Error ?? fallback ?? ErrorPoint0) as ClassLikeError0<TError>
  // }
}

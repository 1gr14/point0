import {
  _ssServerLogger,
  type AnyNiceReadyPoint,
  type AnyPoint,
  type ErrorPoint0,
  type EventerEmitFn,
  type FetcherFetchDetailedResult,
  type LoggerFn,
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
import type { Publicdir } from './publicdir.js'
import { EngineServer } from './server.js'
import { normalizeAndValidateNodeEnv } from './utils.js'

export class Engine<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
  TPrepared extends boolean = boolean,
> {
  clients: TPrepared extends true ? Array<EngineClient<true>> : EngineClient[]
  server: TPrepared extends true ? EngineServer<true, TError> : EngineServer<false, TError>
  publicdirs: TPrepared extends true ? Array<Publicdir<true>> : Array<Publicdir<false>>
  logger: LoggerFn
  generator: FilesGenerator
  prepared: TPrepared

  private readonly __POINT0_ENGINE__ = true as const

  private constructor(input: {
    clients: EngineClient[]
    server: EngineServer<any, any>
    logger: LoggerFn
    prepared: TPrepared
    generator: FilesGenerator
    publicdirs: Array<Publicdir<false>>
  }) {
    this.clients = input.clients as TPrepared extends true ? Array<EngineClient<true>> : EngineClient[]
    this.server = input.server as TPrepared extends true ? EngineServer<true, TError> : EngineServer<false, TError>
    this.logger = input.logger
    this.prepared = input.prepared
    this.generator = input.generator
    this.publicdirs = input.publicdirs as TPrepared extends true ? Array<Publicdir<true>> : Array<Publicdir<false>>
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

    _ssServerLogger.set(parsedOptions.general.logger)

    const server = EngineServer.create({
      ...parsedOptions.server,
      cwd: parsedOptions.general.cwd,
      cwdBeforeBuild: parsedOptions.general.cwdBeforeBuild,
      engineFile: parsedOptions.general.engineFile,
      logger: parsedOptions.general.logger,
      clients: [],
    })

    const clients = parsedOptions.clients.map((clientOptions) => {
      const client = EngineClient.create({
        ...clientOptions,
        cwd: parsedOptions.general.cwd,
        logger: parsedOptions.general.logger,
        server,
      })
      return client
    })

    const serverClients = clients.filter((client) => client.serving !== false)
    server.clients = serverClients

    const generator = FilesGenerator.create({
      logger: parsedOptions.general.logger,
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
      logger: parsedOptions.general.logger,
      prepared: false,
      generator,
      publicdirs,
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

  async serveClientDevServers(): Promise<void> {
    await Promise.all(
      this.clients.map(async (client) => {
        if (client.serving === false) {
          return
        }
        await client.startDevServer()
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
    clientDevServersOnly?: boolean
    entries?: string[] // paths or names
    bunRunArgs?: string[]
    watch?: boolean
    cwd?: string
  }): Promise<void> {
    // const hot = options.hot !== false
    const {
      // engineFile,
      generateFiles = true,
      clientDevServersOnly,
      entries,
      bunRunArgs = [],
      watch = true,
      cwd = process.cwd(),
    } = options ?? {}
    normalizeAndValidateNodeEnv('development')
    // const generatorProcess = generateFiles ? (watch ? this.generateWatch() : this.generate()) : null
    if (generateFiles) {
      await this.generate({ logOnNotWritten: false })
    }
    const generatorWatchProcess = generateFiles && watch ? this.generateWatch() : null
    const withServer = clientDevServersOnly !== true && !!this.server.entry
    const entriesFiles =
      entries && entries.length > 0
        ? entries.map((entry) => this.toEntryPath({ entry, cwd }))
        : Object.values(this.server.entry || {})
    if (withServer) {
      // here we run server entries which already serving server, but prevent multiple client dev servers, so we do not run it here
      const serverEntryProcesses: Array<Promise<any>> = await (async () => {
        if (this.server.viteConfig) {
          process.env.POINT0_PREVENT_CLIENT_DEV_SERVER = 'true'
          // const viteDevServer = await this.server.startViteDevServer()
          // const engineVitedModule = await viteDevServer.ssrLoadModule(engineFile)
          // const engineVited: typeof this = engineVitedModule.engine ?? engineVitedModule.default
          // return [engineVited.server.loadViteDevEntries({ watch, viteDevServer })]
          await this.server.startViteDevServer()
          return [this.server.loadViteDevEntries({ watch, entriesFiles })]
        } else {
          const start = () =>
            Object.values(this.server.entry || [])
              .filter((entryFile) => entriesFiles.includes(entryFile))
              .map((entryFile) => {
                return Bun.spawn({
                  cmd: ['bun', 'run', ...(watch ? ['--watch'] : []), ...bunRunArgs, entryFile],
                  // cmd: ['bun', 'run', ...bunRunArgs, entryFile],
                  // cmd: ['bun', ...bunRunArgs, entryFile],
                  env: {
                    ...process.env,
                    POINT0_PREVENT_CLIENT_DEV_SERVER: 'true',
                  },
                  stdout: 'inherit',
                  stderr: 'inherit',
                })
              })

          let processes = start()
          this.onPointFileChange((_event, _path, _points) => {
            processes.forEach((p) => {
              p.kill('SIGKILL')
            })
            // void killPort(this.server.port).finally(() => {
            //   processes = start()
            // })
            processes = start()
          })
          return []
        }
      })()
      // and here we run one instance of client dev servers per each client
      const clientsDevSevers = this.serveClientDevServers()
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
    if (!this.isPrepared()) {
      throw new Error(
        'Engine is not prepared. Please call await engine.prepare() first. And do it in each server entrypoint file, strongly before any other import',
      )
    }
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
      ? [request: Request, options?: { requiredCtx?: TRequiredCtx }]
      : [request: Request, options: { requiredCtx: TRequiredCtx }]
  ): Promise<FetcherFetchDetailedResult<ErrorPoint0>> {
    if (!this.isPrepared()) {
      throw new Error('Engine is not prepared. Please call await engine.prepare() first.')
    }
    const request = args[0]
    const { requiredCtx } = args[1] ?? {}
    const result = await this.server.fetchDetailed({
      request,
      requiredCtx,
    })
    return result
  }

  async fetch(
    ...args: TRequiredCtx extends UndefinedCtx
      ? [request: Request, options?: { requiredCtx?: TRequiredCtx }]
      : [request: Request, options: { requiredCtx: TRequiredCtx }]
  ): Promise<Response> {
    const result = await this.fetchDetailed(...args)
    return result.response
  }

  async clean(): Promise<void> {
    await Promise.all([...this.clients.map(async (client) => await client.clean()), this.server.clean()])
  }

  async build(options?: { generate?: boolean; scope?: PointsScope; clean?: boolean; publicdir?: boolean }): Promise<{
    clients: Array<{
      client: string[] | null
      publicdir: string[] | null
      scope: PointsScope
    }>
    server: { server: string[] | null; publicdir: string[] | null }
  }> {
    const { generate = true, scope, clean = true, publicdir } = options ?? {}
    normalizeAndValidateNodeEnv('production')

    if (generate) {
      await this.generator.sync({ logOnNotWritten: false })
    }

    // const preparedEngine = await this.prepare()

    if (clean) {
      await Promise.all([
        ...this.clients.map(async (client) => {
          if (scope && client.scope !== scope) {
            return
          }
          await client.clean()
        }),
        ...((scope && scope === this.server.scope) || !scope ? [this.server.clean()] : []),
      ])
    }

    const buildClientsPromise = Promise.all(
      this.clients.map(async (client) => {
        if (scope && client.scope !== scope) {
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
      if (scope) {
        if (scope === this.server.scope) {
          return await this.server.build({
            clean: false,
            publicdir,
          })
        } else {
          return { server: null, publicdir: null }
        }
      } else {
        return await this.server.build({
          clean: false,
          publicdir,
        })
      }
    })()
    const [clients, server] = await Promise.all([buildClientsPromise, buildServerPromise])
    return { clients, server }
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
        this.logger({
          lever: 'error',
          topic: 'FilesGenerator',
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
  } = {}): EventerEmitFn<ErrorPoint0> | undefined {
    if (point) {
      return point.point._emit.bind(point.point) as EventerEmitFn<ErrorPoint0>
    }
    if (scope) {
      const root = this.server.points?.roots.get(scope)
      if (root) {
        return root._emit.bind(root) as EventerEmitFn<ErrorPoint0>
      }
    }
    const root = this.server.points?.roots.get(this.server.scope)
    if (root) {
      return root._emit.bind(root) as EventerEmitFn<ErrorPoint0>
    }
    return undefined
  }

  // getErrorClass<TError extends ErrorPoint0>(fallback: ClassLikeError0<TError> | undefined): ClassLikeError0<TError> {
  //   return (this.server.points?.manager.root._Error ?? fallback ?? ErrorPoint0) as ClassLikeError0<TError>
  // }
}

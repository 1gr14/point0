import { Route0 } from '@devp0nt/route0'
import type {
  EndPoint,
  PointsScope,
  RequiredCtx,
  ServerExecuteResult,
  UndefinedCtx,
  WithMaybeOptionalReqiredCtx,
} from '@point0/core'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { AllPointsManagers } from './all-points-managers.js'
import { ClientBun } from './client.js'
import type { EngineLogger, EngineOptions, RequiredCtxByEngineOptions } from './config.js'
import { parseEngineOptions } from './config.js'
import { Executor } from './executor.js'
import type { FilesGeneratorPointsFilesChangeWatcher, FilesGeneratorTargetOptions } from './generator.js'
import { FilesGenerator } from './generator.js'
import type { Publicdir } from './publicdir.js'
import { ServerBun } from './server.js'

export class Engine<TRequiredCtx extends RequiredCtx = RequiredCtx, TInitialized extends boolean = boolean> {
  clients: TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
  server: TInitialized extends true ? ServerBun<true> : ServerBun<false>
  publicdirs: TInitialized extends true ? Array<Publicdir<true>> : Array<Publicdir<false>>
  logger: EngineLogger
  generator: FilesGenerator
  allPointsManagers: AllPointsManagers
  initialized: TInitialized

  private readonly __POINT0_ENGINE__ = true as const

  private constructor(input: {
    clients: ClientBun[]
    server: ServerBun
    logger: EngineLogger
    allPointsManagers: AllPointsManagers
    initialized: TInitialized
    generator: FilesGenerator
    publicdirs: Array<Publicdir<false>>
  }) {
    this.clients = input.clients as TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
    this.server = input.server as TInitialized extends true ? ServerBun<true> : ServerBun<false>
    this.logger = input.logger
    this.allPointsManagers = input.allPointsManagers
    this.initialized = input.initialized
    this.generator = input.generator
    this.publicdirs = input.publicdirs as TInitialized extends true ? Array<Publicdir<true>> : Array<Publicdir<false>>
  }

  // static create<TRequiredCtx extends RequiredCtx = RequiredCtx>(
  //   fileUrl: string,
  //   options: EngineOptions,
  // ): Engine<TRequiredCtx, false>
  // static create<TRequiredCtx extends RequiredCtx = RequiredCtx>(options: EngineOptions): Engine<TRequiredCtx, false>
  // static create<TRequiredCtx extends RequiredCtx = RequiredCtx>(
  static create<TOptions extends EngineOptions>(
    fileUrl: string,
    options: TOptions,
  ): Engine<RequiredCtxByEngineOptions<TOptions>, false>
  static create<TOptions extends EngineOptions>(options: TOptions): Engine<RequiredCtxByEngineOptions<TOptions>, false>
  static create(...args: [string, EngineOptions] | [EngineOptions]): Engine {
    const options = args.length === 2 ? args[1] : args[0]
    const fileUrl = args.length === 2 ? args[0] : undefined
    if (fileUrl) {
      options.engineFile ??= fileURLToPath(fileUrl)
    }
    const parsedOptions = parseEngineOptions(options)
    const allPointsManagers = AllPointsManagers.create()

    const server = ServerBun.create({
      ...parsedOptions.server,
      allPointsManagers,
      cwd: parsedOptions.general.cwd,
      cwdBeforeBuild: parsedOptions.general.cwdBeforeBuild,
      engineFile: parsedOptions.general.engineFile,
      logger: parsedOptions.general.logger,
      clients: [],
    })

    const clients = parsedOptions.clients.map((clientOptions) => {
      const client = ClientBun.create({
        ...clientOptions,
        cwd: parsedOptions.general.cwd,
        logger: parsedOptions.general.logger,
        allPointsManagers,
        server,
      })
      return client
    })

    server.clients = clients

    const generator = FilesGenerator.create({
      logger: parsedOptions.general.logger,
      cwd: parsedOptions.general.cwd,
      glob: parsedOptions.general.pointsGlob,
      targets: [
        {
          scope: parsedOptions.server.scope,
          routesInstance: parsedOptions.server.routesInstance,
          routesFile: parsedOptions.server.routesFile,
          pointsLazy: parsedOptions.server.generatePointsLazy,
          pointsReady: parsedOptions.server.generatePointsReady,
          banner: parsedOptions.server.banner,
        },
        ...parsedOptions.clients.map(
          (client) =>
            ({
              scope: client.scope,
              routesInstance: client.routesInstance,
              routesFile: client.routesFile,
              pointsLazy: client.generatePointsLazy,
              pointsReady: client.generatePointsReady,
              banner: client.banner,
            }) satisfies FilesGeneratorTargetOptions,
        ),
      ],
    })

    const publicdirs = [server.publicdir, ...clients.map((client) => client.publicdir)]
    server.publicdirs = publicdirs

    return new Engine({
      clients,
      server,
      logger: parsedOptions.general.logger,
      allPointsManagers,
      initialized: false,
      generator,
      publicdirs,
    })
  }

  // async init(): Promise<Engine<true>> {
  async init(options?: { preventClientDevServers?: boolean }): Promise<Engine<TRequiredCtx, true>> {
    const { preventClientDevServers } = options ?? {}
    if (this.isInitialized()) {
      return this as Engine<TRequiredCtx, true>
    }

    const intializedServer = await this.server.init()
    const intializedClients = await Promise.all(
      this.clients.map(async (client) => {
        return await client.init({
          preventDevServer: preventClientDevServers,
        })
      }),
    )
    await this.allPointsManagers.add(
      ...(intializedServer.pointsManager ? [intializedServer.pointsManager] : []),
      ...intializedClients.map((client) => client.pointsManager),
    )
    this.initialized = true as never

    return this as Engine<TRequiredCtx, true>
  }

  async serveClientDevServers(): Promise<void> {
    await Promise.all(
      this.clients.map(async (client) => {
        await client.startDevServer()
      }),
    )
  }

  isInitialized(): this is Engine<TRequiredCtx, true> {
    return !!this.initialized
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

  async dev(options: {
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
    } = options
    process.env.NODE_ENV ??= 'development'
    const generatorProcess = generateFiles ? (watch ? this.generateWatch() : this.generate()) : null
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

          // TODO:ASAP check if it is required, does not watch enough?

          start()
          // let processes = start()
          // this.onPointFileChange((event, path, points) => {
          //   processes.forEach((p) => {
          //     p.kill('SIGKILL')
          //   })
          //   processes = start()
          // })
          return []
        }
      })()
      // and here we run one instance of client dev servers per each client
      const clientsDevSevers = this.serveClientDevServers()
      await Promise.all([generatorProcess, ...serverEntryProcesses, clientsDevSevers])
    } else {
      // when we init, we create also start clientDevServers
      await Promise.all([generatorProcess, this.init()])
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
    if (!this.isInitialized()) {
      throw new Error(
        'Engine is not initialized. Please call await engine.init() first. And do it in each server entrypoint file, strongly before any other import',
      )
    }
    this.server.serve({ requiredCtx })
  }

  async dispose(): Promise<void> {
    await Promise.all([
      ...this.clients.map(async (client) => {
        await client.dispose()
      }),
      this.server.dispose(),
    ])
  }

  async fetch(
    ...args: TRequiredCtx extends UndefinedCtx
      ? [request: Request, options?: { requiredCtx?: TRequiredCtx }]
      : [request: Request, options: { requiredCtx: TRequiredCtx }]
  ): Promise<Response | undefined> {
    if (!this.isInitialized()) {
      throw new Error('Engine is not initialized. Please call await engine.init() first.')
    }
    const request = args[0]
    const { requiredCtx } = args[1] ?? {}
    return await this.server.fetch({
      request,
      requiredCtx,
    })
  }

  async execute<TPoint extends EndPoint>({
    point,
    input,
    requiredCtx,
    withLayouts,
  }: {
    point: TPoint
    input: TPoint['Infer']['InputRaw']
    withLayouts?: boolean
  } & WithMaybeOptionalReqiredCtx<TPoint['Infer']['RequiredCtx']>): Promise<
    ServerExecuteResult<TPoint['Infer']['Ctx'], TPoint['Infer']['ServerLoaderOutput']>
  > {
    if (!this.isInitialized()) {
      throw new Error('Engine is not initialized. Please call await engine.init() first.')
    }
    if (!point._root) {
      throw new Error('Point root not found')
    }
    const location = point._route ? point._route.flat(input) : Route0.getLocation('/')
    const suitable = this.allPointsManagers.getSuitable({
      pointType: point.type,
      scope: point.scope,
      pointName: point.name,
      input,
      fallbackScope: point.scope,
    })
    const executor = await Executor.create({
      request: Executor.createRequestByPointAndInput({ point, input }),
      points: suitable.pointsManager,
      pageLocation: suitable.pageLocation,
      currentLocation: location,
      requiredCtx,
    })
    return await executor.execute({ point: suitable.point, input, withLayouts, response0: executor.response0 })
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

    if (generate) {
      await this.generator.sync({ logOnNotWritten: false })
    }

    // const intializedEngine = await this.init()

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

  async generate(): Promise<void> {
    await this.generator.sync({ logOnNotWritten: true })
  }

  async generateWatch(): Promise<void> {
    void this.generator.sync({ logOnNotWritten: false }).catch((error: unknown) => {
      console.error(error)
    })
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
}

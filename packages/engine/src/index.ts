import type {
  EndPoint,
  OmitRequiredCtxRequestProp,
  PointsScope,
  RequiredCtx,
  ServerExecuteResult,
  UndefinedCtx,
  UndefinedCtxIfRequiredCtxContainsOnlyRequestProp,
  WithMaybeOptionalReqiredCtx,
} from '@point0/core'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { AllPointsManagers } from './all-points-managers.js'
import { ClientBun } from './client.js'
import { parseEngineOptions, type EngineLogger, type EngineOptions } from './config.js'
import type { FilesGeneratorPointsFilesChangeWatcher, FilesGeneratorTargetOptions } from './generator.js'
import { FilesGenerator } from './generator.js'
import { ServerBun } from './server.js'

export class Engine<TRequiredCtx extends RequiredCtx = RequiredCtx, TInitialized extends boolean = boolean> {
  clients: TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
  server: TInitialized extends true ? ServerBun<true> : ServerBun<false>
  logger: EngineLogger
  generator: FilesGenerator
  allPointsManagers: AllPointsManagers
  initialized: TInitialized

  private constructor(input: {
    clients: ClientBun[]
    server: ServerBun
    logger: EngineLogger
    allPointsManagers: AllPointsManagers
    initialized: TInitialized
    generator: FilesGenerator
  }) {
    this.clients = input.clients as TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
    this.server = input.server as TInitialized extends true ? ServerBun<true> : ServerBun<false>
    this.logger = input.logger
    this.allPointsManagers = input.allPointsManagers
    this.initialized = input.initialized
    this.generator = input.generator
  }

  static create<TRequiredCtx extends RequiredCtx = RequiredCtx>(
    fileUrl: string,
    options: EngineOptions,
  ): Engine<TRequiredCtx, false>
  static create<TRequiredCtx extends RequiredCtx = RequiredCtx>(options: EngineOptions): Engine<TRequiredCtx, false>
  static create<TRequiredCtx extends RequiredCtx = RequiredCtx>(
    ...args: [string, EngineOptions] | [EngineOptions]
  ): Engine<TRequiredCtx, false> {
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

    return new Engine({
      clients,
      server,
      logger: parsedOptions.general.logger,
      allPointsManagers,
      initialized: false,
      generator,
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

  async serve(
    ...args: UndefinedCtxIfRequiredCtxContainsOnlyRequestProp<TRequiredCtx> extends UndefinedCtx
      ? [
          options?: {
            requiredCtx?: OmitRequiredCtxRequestProp<TRequiredCtx>
          },
        ]
      : [
          options: {
            requiredCtx: OmitRequiredCtxRequestProp<TRequiredCtx>
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
  ): Promise<Response> {
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
  } & WithMaybeOptionalReqiredCtx<TPoint['Infer']['RequiredCtx']>): Promise<ServerExecuteResult> {
    if (!this.isInitialized()) {
      throw new Error('Engine is not initialized. Please call await engine.init() first.')
    }
    if (!point._root) {
      throw new Error('Point root not found')
    }
    const { executor, suitable } = await this.allPointsManagers.prepareExecutorByPointAndInput({
      input,
      point,
      ...((requiredCtx ? { requiredCtx } : {}) as WithMaybeOptionalReqiredCtx<TPoint['Infer']['RequiredCtx']>),
    })
    return await executor.execute({ point: suitable.point, input, withLayouts })
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

  static findSelfFile(cwd: string = process.cwd()): string | undefined {
    if (!nodePath.isAbsolute(cwd)) {
      cwd = nodePath.resolve(process.cwd(), cwd)
    }
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

  static async findAndImportSelf(
    enginePath?: string | null,
    cwd: string = process.cwd(),
  ): Promise<{ engine: Engine; engineFile: string }> {
    let engineFile: string | undefined

    if (enginePath) {
      // Resolve the path (handles both absolute and relative paths)
      engineFile = nodePath.resolve(cwd, enginePath)
      if (!nodeFs.existsSync(engineFile)) {
        throw new Error(`Engine file not found: ${engineFile}`)
      }
    } else {
      // Auto-find engine file
      engineFile = Engine.findSelfFile(cwd)
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

      // Check if it's an Engine instance - use duck typing as fallback for module resolution edge cases
      if (
        !(engine instanceof Engine) &&
        !(
          typeof engine === 'object' &&
          engine !== null &&
          'init' in engine &&
          'build' in engine &&
          'dev' in engine &&
          'serve' in engine &&
          typeof engine.init === 'function' &&
          typeof engine.build === 'function'
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

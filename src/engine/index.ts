import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Eversion } from '../core/eversion.js'
import type { PointsScope, RequiredCtx } from '../core/types.js'
import { parseEngineOptions, type EngineLogger, type EngineOptions } from './config.js'
import type { FilesGeneratorTargetOptions } from './generator.js'
import { FilesGenerator } from './generator.js'
import { ClientBun } from './client.js'
import { ServerBun } from './server.js'

export class Engine<TInitialized extends boolean = boolean> {
  clients: TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
  server: TInitialized extends true ? ServerBun<true> : ServerBun<false>
  logger: EngineLogger
  generator: FilesGenerator
  eversion: TInitialized extends true ? Eversion : Eversion | null
  initialized: TInitialized

  private constructor(input: {
    clients: ClientBun[]
    server: ServerBun
    logger: EngineLogger
    eversion: Eversion | null
    initialized: TInitialized
    generator: FilesGenerator
  }) {
    this.clients = input.clients as TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
    this.server = input.server as TInitialized extends true ? ServerBun<true> : ServerBun<false>
    this.logger = input.logger
    this.eversion = input.eversion as TInitialized extends true ? Eversion : Eversion | null
    this.initialized = input.initialized
    this.generator = input.generator
  }

  static create(fileUrl: string, options: EngineOptions): Engine<false>
  static create(options: EngineOptions): Engine<false>
  static create(...args: [string, EngineOptions] | [EngineOptions]): Engine<false> {
    const options = args.length === 2 ? args[1] : args[0]
    const fileUrl = args.length === 2 ? args[0] : undefined
    if (fileUrl) {
      options.engineFile ??= fileURLToPath(fileUrl)
    }
    const parsedOptions = parseEngineOptions(options)
    const server = ServerBun.create({
      ...parsedOptions.server,
      cwd: parsedOptions.general.cwd,
      cwdBeforeBuild: parsedOptions.general.cwdBeforeBuild,
      engineFile: parsedOptions.general.engineFile,
      logger: parsedOptions.general.logger,
      clients: [],
    })

    const eversion = server.eversion

    const clients = parsedOptions.clients.map((clientOptions) => {
      const client = ClientBun.create({
        ...clientOptions,
        cwd: parsedOptions.general.cwd,
        logger: parsedOptions.general.logger,
        eversion,
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
          routes: parsedOptions.server.routes,
          points: typeof parsedOptions.server.points === 'string' ? parsedOptions.server.points : null,
          pointsModuleType: parsedOptions.server.pointsModuleType,
          banner: parsedOptions.server.banner,
        },
        ...parsedOptions.clients.map(
          (client) =>
            ({
              scope: client.scope,
              routes: client.routes,
              points: typeof client.points === 'string' ? client.points : null,
              pointsModuleType: client.pointsModuleType,
              banner: client.banner,
            }) satisfies FilesGeneratorTargetOptions,
        ),
      ],
    })

    return new Engine({
      clients,
      server,
      logger: parsedOptions.general.logger,
      eversion,
      initialized: false,
      generator,
    })
  }

  // async init(): Promise<Engine<true>> {
  async init(): Promise<Engine<true>> {
    if (this.isInitialized()) {
      return this as Engine<true>
    }

    const intializedServer = await this.server.init()
    await Promise.all(
      this.clients.map(async (client) => {
        return await client.init({ eversion: intializedServer.eversion })
      }),
    )
    this.eversion = intializedServer.eversion
    this.initialized = true as never

    return this as Engine<true>
  }

  isInitialized(): this is Engine<true> {
    return !!this.initialized
  }

  async dev(options?: { requiredCtx?: RequiredCtx; noGenerate?: boolean; noServer?: boolean }) {
    if (!options?.noGenerate) {
      await this.generateWatch()
    }
    if (!options?.noServer) {
      await this.serve(options?.requiredCtx)
    } else {
      await this.init() // so we just initialize clients dev servers
    }
  }

  async serve(options?: { requiredCtx?: RequiredCtx }): Promise<void> {
    const intializedEngine = await this.init()
    await intializedEngine.server.serve({ requiredCtx: options?.requiredCtx })
    this.logger.info(`🚀 http://localhost:${this.server.port}`)
  }

  async fetch(request: Request, requiredCtx?: RequiredCtx): Promise<Response> {
    if (!this.isInitialized()) {
      throw new Error('Engine is not initialized. Please call await engine.init() first.')
    }
    return await this.server.fetch({
      request,
      requiredCtx,
    })
  }

  async clean(): Promise<void> {
    await Promise.all([...this.clients.map(async (client) => await client.clean()), this.server.clean()])
  }

  async build(options?: { noGenerate?: boolean }): Promise<{
    clients: Array<{
      self: string[] | null
      server: string[] | null
      publicdir: string[] | null
      scope: PointsScope
      index: number
    }>
    server: { self: string[] | null; publicdir: string[] | null }
  }> {
    if (!options?.noGenerate) {
      await this.generator.sync({ logOnNotWritten: false })
    }

    const intializedEngine = await this.init()

    const clients = await Promise.all(
      intializedEngine.clients.map(async (client) => {
        const buildOutput = await client.build()
        return {
          self: buildOutput.self,
          server: buildOutput.server,
          publicdir: buildOutput.publicdir,
          scope: client.points.root._scope,
          index: client.index,
        }
      }),
    )
    const server = await intializedEngine.server.build()
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

  static async findAndImportSelf(enginePath?: string, cwd: string = process.cwd()): Promise<Engine> {
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
      const module = await import(engineUrl)

      // Try named export first, then default
      const engine = module.engine ?? module.default

      if (!engine) {
        throw new Error('engine.ts must export "engine" or have a default export')
      }

      if (!(engine instanceof Engine)) {
        throw new Error('Exported engine must be an instance of Engine')
      }

      return engine
    } catch (error) {
      throw new Error(`Error importing engine: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      })
    }
  }
}

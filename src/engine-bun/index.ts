import { fileURLToPath } from 'node:url'
import type { Eversion } from '../core/eversion.js'
import type { PointsScope, RequiredCtx } from '../core/types.js'
import { parseEngineOptions, type EngineLogger, type EngineOptions } from '../engine-shared/config.js'
import type { FilesGeneratorTargetOptions } from '../engine-shared/generator.js'
import { FilesGenerator } from '../engine-shared/generator.js'
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

  async dev(options?: { requiredCtx?: RequiredCtx; noGenerate?: boolean }) {
    await this.generateWatch()
    await this.serve(options?.requiredCtx)
  }

  async serve(requiredCtx?: RequiredCtx): Promise<void> {
    const intializedEngine = await this.init()
    await intializedEngine.server.serve({ requiredCtx })
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
      await this.generate()
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
    await this.generator.sync({ logOnNotWritten: false })
    await this.generator.watch()
  }
}

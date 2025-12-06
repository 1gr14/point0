import type { ExtractResult } from '@point0/core/extractor'
import { PointsManagersGroup } from '@point0/core/points-manager'
import type { EndPoint, PointsScope, RequiredCtx, WithMaybeOptionalReqiredCtx } from '@point0/core/types'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ClientBun } from './client.js'
import { parseEngineOptions, type EngineLogger, type EngineOptions } from './config.js'
import type { FilesGeneratorTargetOptions } from './generator.js'
import { FilesGenerator } from './generator.js'
import { ServerBun } from './server.js'

export class Engine<TInitialized extends boolean = boolean> {
  clients: TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
  server: TInitialized extends true ? ServerBun<true> : ServerBun<false>
  logger: EngineLogger
  generator: FilesGenerator
  pmg: PointsManagersGroup
  initialized: TInitialized

  private constructor(input: {
    clients: ClientBun[]
    server: ServerBun
    logger: EngineLogger
    pmg: PointsManagersGroup
    initialized: TInitialized
    generator: FilesGenerator
  }) {
    this.clients = input.clients as TInitialized extends true ? Array<ClientBun<true>> : ClientBun[]
    this.server = input.server as TInitialized extends true ? ServerBun<true> : ServerBun<false>
    this.logger = input.logger
    this.pmg = input.pmg
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
    const pmg = PointsManagersGroup.create()

    const server = ServerBun.create({
      ...parsedOptions.server,
      pmg,
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
        pmg,
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
      pmg,
      initialized: false,
      generator,
    })
  }

  // async init(): Promise<Engine<true>> {
  async init(options?: { preventClientDevServers?: boolean }): Promise<Engine<true>> {
    if (this.isInitialized()) {
      return this as Engine<true>
    }

    const intializedServer = await this.server.init()
    const intializedClients = await Promise.all(
      this.clients.map(async (client) => {
        return await client.init({
          preventClientDevServers: options?.preventClientDevServers,
        })
      }),
    )
    await this.pmg.add(
      ...(intializedServer.pointsManager ? [intializedServer.pointsManager] : []),
      ...intializedClients.map((client) => client.pointsManager),
    )
    this.initialized = true as never

    return this as Engine<true>
  }

  async serveClientDevServers(): Promise<void> {
    await Promise.all(
      this.clients.map(async (client) => {
        await client.serveClientDevServer()
      }),
    )
  }

  isInitialized(): this is Engine<true> {
    return !!this.initialized
  }

  // async dev(options?: { requiredCtx?: RequiredCtx; generate?: boolean; server?: boolean }) {
  //   const { requiredCtx = {}, generate = true, server = true } = options ?? {}
  //   if (generate) {
  //     await this.generateWatch()
  //   }
  //   if (server) {
  //     await this.serve(requiredCtx)
  //   } else {
  //     await this.init() // so we just initialize clients dev servers
  //   }
  // }

  async serve(options?: { requiredCtx?: RequiredCtx; preventClientDevServers?: boolean }): Promise<void> {
    const intializedEngine = await this.init({ preventClientDevServers: options?.preventClientDevServers })
    await intializedEngine.server.serve({ requiredCtx: options?.requiredCtx })
  }

  async fetch(request: Request, { requiredCtx }: { requiredCtx?: RequiredCtx }): Promise<Response> {
    if (!this.isInitialized()) {
      throw new Error('Engine is not initialized. Please call await engine.init() first.')
    }
    return await this.server.fetch({
      request,
      requiredCtx,
    })
  }

  async extract<TPoint extends EndPoint>({
    point,
    input,
    requiredCtx,
    withLayouts,
  }: {
    point: TPoint
    input: TPoint['Infer']['InputRaw']
    withLayouts?: boolean
  } & WithMaybeOptionalReqiredCtx<TPoint['Infer']['RequiredCtx']>): Promise<ExtractResult> {
    if (!this.isInitialized()) {
      throw new Error('Engine is not initialized. Please call await engine.init() first.')
    }
    if (!point._root) {
      throw new Error('Point root not found')
    }
    const { extractor, suitable } = await this.pmg.prepareExtractorByPointAndInput({
      input,
      point,
      ...((requiredCtx ? { requiredCtx } : {}) as WithMaybeOptionalReqiredCtx<TPoint['Infer']['RequiredCtx']>),
    })
    return await extractor.extract({ point: suitable.point, input, withLayouts })
  }

  async clean(): Promise<void> {
    await Promise.all([...this.clients.map(async (client) => await client.clean()), this.server.clean()])
  }

  async build(options?: {
    generate?: boolean
    target?: 'client' | 'server'
    scope?: PointsScope
    clean?: boolean
    publicdir?: boolean
  }): Promise<{
    clients: Array<{
      client: string[] | null
      server: string[] | null
      publicdir: string[] | null
      scope: PointsScope
      index: number
    }>
    server: { self: string[] | null; publicdir: string[] | null }
  }> {
    const { generate = true, target, scope, clean, publicdir } = options ?? {}

    if (generate) {
      await this.generator.sync({ logOnNotWritten: false })
    }

    // const intializedEngine = await this.init()

    const clients = await Promise.all(
      this.clients.map(async (client) => {
        if (scope && client.scope !== scope) {
          return {
            client: null,
            server: null,
            publicdir: null,
            scope: client.scope,
            index: client.index,
          }
        }
        const buildOutput = await client.build({
          target,
          publicdir,
          clean,
        })
        return {
          client: buildOutput.client,
          server: buildOutput.server,
          publicdir: buildOutput.publicdir,
          scope: client.scope,
          index: client.index,
        }
      }),
    )
    const server = await (async () => {
      if (scope) {
        if (scope === this.server.scope) {
          return await this.server.build({
            clean,
            publicdir,
          })
        } else {
          return { self: null, publicdir: null }
        }
      } else {
        return await this.server.build({
          clean,
        })
      }
    })()
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

  static async findAndImportSelf(enginePath?: string | null, cwd: string = process.cwd()): Promise<Engine> {
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

      return engine
    } catch (error) {
      throw new Error(`Error importing engine: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      })
    }
  }
}

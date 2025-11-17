import { fileURLToPath } from 'node:url'
import type { Eversion } from '../core/eversion.js'
import type { RequiredCtx, RootId } from '../core/types.js'
import { parseEngineOptions, type EngineLogger, type EngineOptions } from '../engine-shared/config.js'
import { ClientBun } from './client.js'
import { ServerBun } from './server.js'

export class Engine {
  clients: ClientBun[]
  server: ServerBun
  logger: EngineLogger
  eversion: Eversion

  private constructor(input: { clients: ClientBun[]; server: ServerBun; logger: EngineLogger; eversion: Eversion }) {
    this.clients = input.clients
    this.server = input.server
    this.logger = input.logger
    this.eversion = input.eversion
  }

  static async create(fileUrl: string, options: EngineOptions): Promise<Engine>
  static async create(options: EngineOptions): Promise<Engine>
  static async create(...args: [string, EngineOptions] | [EngineOptions]): Promise<Engine> {
    const options = args.length === 2 ? args[1] : args[0]
    const fileUrl = args.length === 2 ? args[0] : undefined
    if (fileUrl) {
      options.engineFile ??= fileURLToPath(fileUrl)
    }
    const parsedOptions = parseEngineOptions(options)
    const server = await ServerBun.create({
      ...parsedOptions.server,
      cwd: parsedOptions.general.cwd,
      cwdBeforeBuild: parsedOptions.general.cwdBeforeBuild,
      engineFile: parsedOptions.general.engineFile,
      fallbackRootId: '',
      logger: parsedOptions.general.logger,
      clients: [],
    })

    const eversion = server.eversion

    const clients = await Promise.all(
      parsedOptions.clients.map(async (clientOptions) => {
        const client = await ClientBun.create({
          ...clientOptions,
          cwd: parsedOptions.general.cwd,
          logger: parsedOptions.general.logger,
          eversion,
          server,
        })
        await eversion.connect({ points: client.points })
        return client
      }),
    )

    server.clients = clients
    server.fallbackRootId ||= clients.at(0)?.points.root._rootId || server.points.root._rootId

    return new Engine({ clients, server, logger: parsedOptions.general.logger, eversion })
  }

  async serve(requiredCtx?: RequiredCtx): Promise<void> {
    await this.server.serve({ requiredCtx })
    this.logger.info(`🚀 http://localhost:${this.server.port}`)
  }

  async fetch(request: Request, requiredCtx?: RequiredCtx): Promise<Response> {
    return await this.server.fetch({
      request,
      requiredCtx,
    })
  }

  async clean(): Promise<void> {
    await Promise.all([...this.clients.map(async (client) => await client.clean()), this.server.clean()])
  }

  async build(): Promise<{
    clients: Array<{
      self: string[] | null
      server: string[] | null
      publicdir: string[] | null
      rootId: RootId
      index: number
    }>
    server: { self: string[] | null; publicdir: string[] | null }
  }> {
    const clients = await Promise.all(
      this.clients.map(async (client) => {
        const buildOutput = await client.build()
        return {
          self: buildOutput.self,
          server: buildOutput.server,
          publicdir: buildOutput.publicdir,
          rootId: client.points.root._rootId,
          index: client.index,
        }
      }),
    )
    const server = await this.server.build()
    return { clients, server }
  }
}

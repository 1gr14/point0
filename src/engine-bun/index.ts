import type { Eversion } from '../core/eversion.js'
import type { RequiredCtx } from '../core/types.js'
import { parseEngineOptions, type EngineLogger, type EngineOptions } from '../engine-shared/config.js'
import { ClientBun } from './client.js'
import { ServerBun } from './server.js'

export class EngineBun {
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

  static async create(input: EngineOptions): Promise<EngineBun> {
    const parsedInput = parseEngineOptions(input)
    const server = await ServerBun.create({
      ...parsedInput.server,
      cwd: parsedInput.general.cwd,
      fallbackRootId: '',
      logger: parsedInput.general.logger,
      clients: [],
    })

    const eversion = server.eversion

    const clients = await Promise.all(
      parsedInput.clients.map(async (clientOptions) => {
        const client = await ClientBun.create({
          ...clientOptions,
          cwd: parsedInput.general.cwd,
          logger: parsedInput.general.logger,
          eversion,
          server,
        })
        await eversion.connect({ points: client.points })
        return client
      }),
    )

    server.clients = clients
    server.fallbackRootId ||= clients.at(0)?.points.root._rootId || server.points.root._rootId

    return new EngineBun({ clients, server, logger: parsedInput.general.logger, eversion })
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

  async build(): Promise<void> {
    await Promise.all(
      this.clients.map(async (client) => {
        await client.build()
      }),
    )
  }
}

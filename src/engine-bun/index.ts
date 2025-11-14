import type { RequiredCtx, RootId } from '../core/types.js'
import { parseEngineOptions, type EngineLogger, type EngineOptions } from '../engine-shared/config.js'
import { ClientBun } from './client.js'
import { ServerBun } from './server.js'
import type { Eversion } from '../core/eversion.js'

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

  async serve(requiredCtx?: RequiredCtx, targetRootId = process.env.TARGET_ROOT_ID): Promise<void> {
    if (!targetRootId) {
      throw new Error(
        'TARGET_ROOT_ID is required. Please set TARGET_ROOT_ID environment variable or pass it as argument to serve function.',
      )
    }
    const target =
      this.server.points.root._rootId === targetRootId
        ? this.server
        : this.clients.find((client) => client.points.root._rootId === targetRootId)
    if (!target) {
      throw new Error(`Target with root id "${targetRootId}" not found`)
    }
    if (target instanceof ServerBun) {
      await target.serve({ requiredCtx })
      this.logger.info(`Server is running on http://localhost:${this.server.port}`)
    } else if (target instanceof ClientBun) {
      await target.serve({ requiredCtx })
      this.logger.info(
        `Client${this.clients.length > 1 ? ` "${target.points.root._rootId}"` : ''} is running on http://localhost:${target.port}`,
      )
    } else {
      throw new Error(`Unknown target type found for target with root id "${targetRootId}".`)
    }
  }

  async fetch(request: Request, requiredCtx?: RequiredCtx): Promise<Response> {
    return await this.server.fetch({
      request,
      requiredCtx,
    })
  }
}

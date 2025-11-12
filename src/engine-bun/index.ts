import { Eversion } from '../core/eversion.js'
import type { RequiredCtx } from '../core/types.js'
import { parseEngineOptions, type EngineLogger, type EngineOptions } from '../engine-shared/config.js'
import { ClientBun } from './client-bun.js'
import type { ClientVite } from './client-vite.js'
import { ServerBun } from './server.js'

export class Engine {
  clients: Array<ClientBun | ClientVite>
  server: ServerBun
  logger: EngineLogger

  private constructor(input: { clients: Array<ClientBun | ClientVite>; server: ServerBun; logger: EngineLogger }) {
    this.clients = input.clients
    this.server = input.server
    this.logger = input.logger
  }

  static async create(input: EngineOptions): Promise<Engine> {
    const parsedInput = parseEngineOptions(input)
    const eversion = await Eversion.create({ points: parsedInput.server.points })
    const clients = await Promise.all(
      parsedInput.clients.map(async (clientOptions) => {
        await eversion.connect({ points: clientOptions.points })
        // TODO: fix it when vite will be implemented
        return await ClientBun.create({
          ...clientOptions,
          logger: parsedInput.general.logger,
          eversion,
        })
      }),
    )
    const server = await ServerBun.create({
      ...parsedInput.server,
      fallbackRootId: parsedInput.general.fallbackRootId,
      logger: parsedInput.general.logger,
      clients,
      eversion,
    })
    return new Engine({ clients, server, logger: parsedInput.general.logger })
  }

  async serve(
    requiredCtx?: RequiredCtx,
    target = process.env.TARGET as 'server' | 'client' | undefined,
  ): Promise<void> {
    if (target === 'server') {
      await this.server.serve({ requiredCtx })
      this.logger.info(`Server is running on http://localhost:${this.server.port}`)
    } else if (target === 'client') {
      const clientsWithPort = this.clients.flatMap((client) => {
        if (client instanceof ClientBun && typeof client.port === 'number') {
          return client
        }
        return []
      })
      for (const client of clientsWithPort) {
        if (client instanceof ClientBun) {
          // TODO: fix it when vite will be implemented
          await client.serve({ requiredCtx })
          this.logger.info(
            `Client${clientsWithPort.length > 1 ? ` "${client.points.root._rootId}"` : ''} is running on http://localhost:${client.port}`,
          )
        }
      }
    } else {
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        `Unknown target: ${target || 'undefined'}. Please set TARGET environment variable to 'server' or 'client'. Or pass it as argument to serve function.`,
      )
    }
  }

  async fetch(request: Request, requiredCtx?: RequiredCtx): Promise<Response> {
    return await this.server.fetch({
      request,
      requiredCtx,
    })
  }
}

import type { Eversion } from '../core/eversion.js'
import type { RequiredCtx, RootId } from '../core/types.js'
import { parseEngineOptions, type EngineLogger, type EngineOptions } from '../engine-shared/config.js'
import { ClientBun } from './client.js'
import { ServerBun } from './server.js'
import * as nodePath from 'node:path'

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
    for (const client of clients) {
      if (!client.serverDistDir && server.clientsDistDir) {
        client.serverDistDir = nodePath.resolve(server.clientsDistDir, client.points.root._rootId)
      }
    }

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

  async clean(): Promise<void> {
    await Promise.all([...this.clients.map(async (client) => await client.clean()), this.server.clean()])
  }

  async build(): Promise<{
    clients: Array<{
      self: string[] | null
      server: string[] | null
      publicDir: string[] | null
      rootId: RootId
      index: number
    }>
    server: { self: string[] | null; publicDir: string[] | null }
  }> {
    const clients = await Promise.all(
      this.clients.map(async (client) => {
        const buildOutput = await client.build()
        return {
          self: buildOutput.self,
          server: buildOutput.server,
          publicDir: buildOutput.publicDir,
          rootId: client.points.root._rootId,
          index: client.index,
        }
      }),
    )
    const server = await this.server.build()
    return { clients, server }
  }
}

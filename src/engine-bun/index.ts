import type { ClientBun } from './client-bun.js'
import type { ClientVite } from './client-vite.js'
import type { ServerBun } from './server.js'

export class Engine {
  clients: Array<ClientBun | ClientVite>
  server: ServerBun

  private constructor(input: { clients: Array<ClientBun | ClientVite>; server: ServerBun }) {
    this.clients = input.clients
    this.server = input.server
  }

  static async create(input: { clients: Array<ClientBun | ClientVite>; server: ServerBun }): Promise<Engine> {
    return new Engine(input)
  }
}

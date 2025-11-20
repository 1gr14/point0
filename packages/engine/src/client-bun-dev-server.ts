import type { Engine } from './index.js'

const engineFile: string | undefined = process.argv[2]
const scope: string | undefined = process.argv[3]

if (!engineFile) {
  console.error('Engine file path is not provided for client bun dev server')
  process.exit(1)
}
if (!scope) {
  console.error('Scope is not provided for client bun dev server')
  process.exit(1)
}

const engine: Engine | undefined = await import(engineFile).then((module) => module.default || module.engine || module)

if (!engine || typeof engine !== 'object' || typeof engine.clients !== 'object' || !Array.isArray(engine.clients)) {
  console.error('Engine is not a valid engine')
  process.exit(1)
}

const client = engine.clients.find((client) => client.scope === scope)
if (!client) {
  console.error(`Client "${scope}" is not found`)
  process.exit(1)
}

await client.createClientBunDevServer()

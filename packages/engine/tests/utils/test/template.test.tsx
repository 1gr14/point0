import { afterAll, describe, expect, it } from 'bun:test'
import type { Engine } from '../../../src/engine.js'
import { TestProjectOneClientFactory } from '../project.one-client.js'
import type { TestProjectOneClient, TestProjectOneClientFactoryCreateProjectOptions } from '../project.one-client.js'

const tpf = TestProjectOneClientFactory.create({
  namespace: 'template',
  portsRange: [0, Infinity], // will not run anything there
})

type ItFn = (done: (err?: unknown) => void) => void | Promise<void>

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectOneClientFactoryCreateProjectOptions & { preserve?: boolean },
  callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>,
): ItFn
function wrp(callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>): ItFn
function wrp(
  ...args:
    | [callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>]
    | [
        options: TestProjectOneClientFactoryCreateProjectOptions & { preserve?: boolean },
        callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>,
      ]
): ItFn {
  const [options, callback] = args.length === 1 ? [{}, args[0]] : args
  const { preserve = false, ...tpOptions } = options
  if (preserve) {
    preventFinalFilesCleanup = true
  }
  const tp = tpf.create(tpOptions)
  return async () => {
    try {
      await tp.init()
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
      throw error
    }
  }
}

describe('template', () => {
  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: false, browser: false })
  })

  it(
    'copy template to temp dir',
    wrp(async ({ tp }) => {
      expect(await tp.files.packageJson.text()).toContain(tp.name)
    }),
    {
      retry: 3,
    },
  )

  it(
    'import engine',
    wrp(async ({ tp }) => {
      const engine = await tp.importEngine()
      expect(engine).toBeDefined()
      expect(engine.server.prepared).toBe(false)
    }),
    {
      retry: 3,
    },
  )

  it(
    'set server and client ports',
    wrp(async ({ tp }) => {
      await tp.init()
      const engine = await tp.importEngine()
      expect(engine.server.port).toBe(4)
      expect(engine.client.port).toBe(5)
    }),
    {
      retry: 3,
    },
  )
})

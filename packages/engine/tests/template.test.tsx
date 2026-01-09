import { afterAll, describe, expect, it } from 'bun:test'
import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'
import type { Engine } from '../src/engine.js'

const tpf = TestProjectFactory.create({
  namespace: 'dev',
  portsRange: [0, Infinity], // will not run anything there
})

type ItFn = (done: (err?: unknown) => any) => any

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectFactoryCreateProjectOptions & { deleteFiles?: boolean },
  callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
): ItFn
function wrp(callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any): ItFn
function wrp(
  ...args:
    | [callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any]
    | [
        options: TestProjectFactoryCreateProjectOptions & { deleteFiles?: boolean },
        callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
      ]
): ItFn {
  const [options, callback] = args.length === 1 ? [{}, args[0]] : args
  const { deleteFiles = true, ...tpOptions } = options
  if (!deleteFiles) {
    preventFinalFilesCleanup = true
  }
  const tp = tpf.create(tpOptions)
  return async () => {
    try {
      await tp.init()
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await tp.cleanup({ files: deleteFiles, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: deleteFiles, ports: true, processes: true })
      throw error
    }
  }
}

describe('template', () => {
  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: false })
  })

  it.concurrent(
    'copy template to temp dir',
    wrp(async ({ tp }) => {
      expect(await tp.files.packageJson.text()).toContain(tp.name)
    }),
  )

  it.concurrent(
    'import engine',
    wrp(async ({ tp }) => {
      const engine = await tp.importEngine()
      expect(engine).toBeDefined()
      expect(engine.isInitialized()).toBe(false)
    }),
  )

  it.concurrent(
    'set server and client ports',
    wrp(async ({ tp }) => {
      await tp.init()
      const engine = await tp.importEngine()
      expect(engine.server.port).toBe(8)
      expect(engine.clients[0].port).toBe(9)
      expect(engine.server.hmrPort).toBe(10)
      expect(engine.clients[0].hmrPort).toBe(11)
    }),
  )
})

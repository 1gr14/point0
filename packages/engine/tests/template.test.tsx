import { afterAll, describe, expect, it } from 'bun:test'
import type { TestProject } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'

const tpf = TestProjectFactory.create({
  namespace: 'dev',
  portsRange: [0, Infinity], // will not run anything there
})

let preventFinalCleanup = false
const wrp = (callback: ({ tp }: { tp: TestProject }) => any, deleteFiles = true) => {
  if (!deleteFiles) {
    preventFinalCleanup = true
  }
  const tp = tpf.create()
  return async () => {
    try {
      await tp.init()
      await callback({ tp })
      await tp.cleanup({ files: deleteFiles, processes: true, ports: true })
    } catch (error) {
      await tp.cleanup({ files: deleteFiles, processes: true, ports: true })
      throw error
    }
  }
}

describe('template', () => {
  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalCleanup, processes: true, ports: true })
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
      tp.serverPort = 4000
      tp.clientPort = 4001
      await tp.init()
      const engine = await tp.importEngine()
      expect(engine.server.port).toBe(4000)
      expect(engine.clients[0].port).toBe(4001)
    }),
  )
})

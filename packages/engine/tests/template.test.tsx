import { afterAll, describe, expect, it } from 'bun:test'
import type { TestProject } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'

const tpf = TestProjectFactory.create({
  namespace: 'dev',
})

let preventFinalCleanup = false
const wrp = (callback: ({ tp }: { tp: TestProject }) => any, deleteFiles = true) => {
  if (!deleteFiles) {
    preventFinalCleanup = true
  }
  return async () => {
    let tp: TestProject | undefined
    const cleanup = async () => {
      if (!deleteFiles && tp) {
        await tp.cleanup()
      }
    }
    try {
      tp = await tpf.init()
      await callback({ tp })
      await cleanup()
    } catch (error) {
      await cleanup()
      throw error
    }
  }
}

describe('template', () => {
  afterAll(async () => {
    if (!preventFinalCleanup) {
      await tpf.cleanup()
    }
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

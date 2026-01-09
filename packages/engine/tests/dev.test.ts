import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { TestProject, TestProjectFactoryCreateOptions } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'
import { waitForResponseStatus } from './utils/other.js'
import type { Engine } from '../src/engine.js'

setDefaultTimeout(20000)

const tpf = TestProjectFactory.create({
  namespace: 'dev',
})

type ItFn = (done: (err?: unknown) => any) => any

let preventFinalCleanup = false
function wrp(
  options: TestProjectFactoryCreateOptions & { deleteFiles?: boolean },
  callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
): ItFn
function wrp(callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any): ItFn
function wrp(
  ...args:
    | [callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any]
    | [
        options: TestProjectFactoryCreateOptions & { deleteFiles?: boolean },
        callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
      ]
): ItFn {
  const [options, callback] = args.length === 1 ? [{}, args[0]] : args
  const { deleteFiles = true, ...tpOptions } = options
  if (!deleteFiles) {
    preventFinalCleanup = true
  }
  const tp = tpf.create(tpOptions)
  return async () => {
    const cleanup = async () => {
      if (!deleteFiles) {
        await tp.cleanup(deleteFiles)
      }
    }
    try {
      await tp.init()
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await cleanup()
    } catch (error) {
      await cleanup()
      throw error
    }
  }
}

describe('dev', () => {
  beforeAll(async () => {
    await tpf.cleanup()
  })

  afterAll(async () => {
    if (!preventFinalCleanup) {
      await tpf.cleanup()
    }
  })

  it.only(
    'start ssr dev server',
    wrp({ ssr: true, deleteFiles: false }, async ({ tp, engine }) => {
      const startedAt = Date.now()
      const getDuration = () => Date.now() - startedAt
      console.log(1, getDuration())
      const process = await tp.spawn(['bun', 'run', 'dev'])
      console.log(2, getDuration())
      expect(engine.server.port).toBe(3000)
      expect(engine.clients[0].port).toBe(3001)
      console.log(3, getDuration())
      const result = await waitForResponseStatus(`http://localhost:${engine.server.port}`, 200, 10000)
      console.log(4, getDuration())
      expect(result).toBeDefined()
      const html = await result.text()
      console.log(5, getDuration())
      expect(html).toContain('<div>Page Not Found</div>')
      expect(html).toContain('__POINT0_ENV__')
      console.log('output', process.output)
      await process.kill()
      console.log(6, getDuration())
    }),
  )

  it.concurrent(
    'start spa dev server',
    wrp({ ssr: false, deleteFiles: false }, async ({ tp, engine }) => {
      const process = await tp.spawn(['bun', 'run', 'dev'])
      expect(engine.server.port).toBe(3002)
      expect(engine.clients[0].port).toBe(3003)
      const response = await waitForResponseStatus(`http://localhost:${engine.server.port}`, 200, 10000)
      const html = await response.text()
      console.log('html', html)
      expect(html).toContain('__POINT0_ENV__')
      console.log('output', process.output)
      await process.kill()
    }),
  )
})

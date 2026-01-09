import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
import { waitForResponse } from './utils/other.js'
import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'

setDefaultTimeout(15000)

const tpf = TestProjectFactory.create({
  namespace: 'dev',
  portsRange: [3000, 3099],
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

describe.concurrent('dev', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true })
  })

  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true })
  })

  it.concurrent(
    'start ssr dev server',
    wrp({ ssr: true }, async ({ tp, engine }) => {
      tp.spawn(['bun', 'run', 'dev'])
      expect(engine.server.port).toBe(3000)
      expect(engine.clients[0].port).toBe(3001)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const result = await waitForResponse(`http://localhost:${engine.server.port}`, undefined, 7000)
      expect(result).toBeDefined()
      const html = await result.text()
      expect(html).toContain('<div>Page Not Found</div>')
      expect(html).toContain('__POINT0_ENV__')
    }),
  )

  it.concurrent(
    'start spa dev server',
    wrp({ ssr: false }, async ({ tp, engine }) => {
      tp.spawn(['bun', 'run', 'dev'])
      expect(engine.server.port).toBe(3004)
      expect(engine.clients[0].port).toBe(3005)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const response = await waitForResponse(`http://localhost:${engine.server.port}`, undefined, 7000)
      const html = await response.text()
      expect(html).toContain('__POINT0_ENV__')
      expect(html).not.toContain('<div>Page Not Found</div>')
    }),
  )
})

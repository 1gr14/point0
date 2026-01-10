import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'

setDefaultTimeout(15000)

const tpf = TestProjectFactory.create({
  namespace: 'build',
  portsRange: [3100, 3199],
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

describe.concurrent('build', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
  })

  it.concurrent(
    'build and start ssr server',
    wrp({ ssr: true }, async ({ tp, engine }) => {
      const bp = tp.spawn(['bun', 'run', 'build'])
      await bp.exited
      tp.spawn(['bun', 'run', 'start'])
      expect(engine.server.port).toBe(3100)
      expect(engine.clients[0].port).toBe(3101)
      await tp.waitStarted()
      const response = await tp.fetchServer('/')
      expect(response).toBeDefined()
      const html = await response.text()
      expect(html).toContain('<div>Page Not Found</div>')
      expect(html).toContain('__POINT0_ENV__')
    }),
    {
      retry: 3,
    },
  )

  it.concurrent(
    'build and start spa server',
    wrp({ ssr: false }, async ({ tp, engine }) => {
      const bp = tp.spawn(['bun', 'run', 'build'])
      await bp.exited
      tp.spawn(['bun', 'run', 'start'])
      expect(engine.server.port).toBe(3102)
      expect(engine.clients[0].port).toBe(3103)
      await tp.waitStarted()
      const response = await tp.fetchServer('/')
      const html = await response.text()
      expect(html).toContain('__POINT0_ENV__')
      expect(html).not.toContain('<div>Page Not Found</div>')
    }),
    {
      retry: 3,
    },
  )
})

import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import nodePath from 'node:path'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(20000)

const packageRoot = nodePath.resolve(__dirname, '..')
const cliPath = nodePath.resolve(packageRoot, 'src', 'cli.ts')
const tpf = TestProjectOneClientFactory.create({
  namespace: 'cli',
  portsRange: [3400, 3499],
})

const writeTestSources = async (tp: TestProjectOneClient): Promise<void> => {
  await tp.write(
    'src/cli.points.tsx',
    `import { root } from './lib/root.js'
export const cliPage = root.lets('page', 'cliPage', '/cli').page(() => <div>CLI page</div>)
export const cliActionAction = root.lets.action('GET', '/api/cli').action(() => ({ ok: true }))
`,
  )
  await tp.write(
    'src/cli-target.ts',
    `export const cliTarget = 'cli-target'
`,
  )
  await tp.write(
    'src/cli-source.ts',
    `import { cliTarget } from './cli-target.js'
export const cliSource = () => cliTarget
`,
  )
}

const setupCliProject = async (): Promise<TestProjectOneClient> => {
  const tp = tpf.create()
  await tp.cleanup('ports')
  await tp.init()
  await writeTestSources(tp)
  await tp.replace(
    tp.files.engine,
    'file: import.meta.url,',
    `file: import.meta.url,\n  generate: { meta: './lib/meta.ts' },`,
  )
  const engine = await tp.importEngine(true)
  await engine.generate({ silent: true })
  return tp
}

const runCli = async ({
  tp,
  args,
}: {
  tp: TestProjectOneClient
  args: string[]
}): Promise<{ output: string; exitCode: number }> => {
  const process = tp.spawn(['bun', 'run', cliPath, ...args], { cwd: packageRoot })
  const exitCode = await process.exited
  return { output: process.output, exitCode }
}

function parseJsonFromOutput<T>(output: string): T {
  const firstCurly = output.indexOf('{')
  if (firstCurly === -1) {
    throw new Error(`Could not find JSON object in output: ${output}`)
  }
  return JSON.parse(output.slice(firstCurly)) as T
}

beforeAll(async () => {
  await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
})

afterAll(async () => {
  await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
})

describe('point0 CLI', () => {
  it('compile prints compiled code', async () => {
    const tp = await setupCliProject()
    try {
      const result = await runCli({
        tp,
        args: [
          'compile',
          tp.resolve('src/cli.points.tsx'),
          '--engine',
          tp.resolve('src/engine.ts'),
          '--side',
          'server',
        ],
      })
      expect(result.exitCode).toBe(0)
      expect(result.output).toContain('cliPage')
      expect(result.output).toContain('cliAction')
      expect(result.output).toMatchInlineSnapshot(`
        "import { root } from './lib/root.js'
        export const cliPage = root.lets('page', 'cliPage', '/cli').page(() => <div>CLI page</div>)
        export const cliActionAction = root.lets       ("action","cliAction",'GET','/api/cli').action(()=>({ok:true}))
        "
      `)
    } finally {
      await tp.cleanup({ files: true, ports: true, processes: true })
    }
  })

  it('trace prints import chain', async () => {
    const tp = await setupCliProject()
    try {
      const result = await runCli({
        tp,
        args: [
          'trace',
          './cli-target.js',
          tp.resolve('src/cli-source.ts'),
          '--engine',
          tp.resolve('src/engine.ts'),
          '--side',
          'server',
          '--scope',
          'root',
        ],
      })
      expect(result.exitCode).toBe(0)
      expect(result.output).toContain('cli-source.ts')
    } finally {
      await tp.cleanup({ files: true, ports: true, processes: true })
    }
  })

  it('points list returns filtered point list', async () => {
    const tp = await setupCliProject()
    try {
      const result = await runCli({
        tp,
        args: [
          'points',
          'list',
          '--meta',
          tp.resolve('src/lib/meta.ts'),
          '--endpoint-url',
          '/api/cli',
          '--fields',
          'id,name',
        ],
      })
      expect(result.exitCode).toBe(0)
      const payload = parseJsonFromOutput<{ points: Array<{ id: string; name: string }>; total: number }>(result.output)
      expect(payload.total).toBe(1)
      expect(payload.points[0]?.name).toBe('cliAction')
      expect(payload.points[0]?.id).toContain('.action.cliAction')
    } finally {
      await tp.cleanup({ files: true, ports: true, processes: true })
    }
  })

  it('points get returns first matching point', async () => {
    const tp = await setupCliProject()
    try {
      const result = await runCli({
        tp,
        args: ['points', 'get', '--meta', tp.resolve('src/lib/meta.ts'), '--url', '/cli', '--fields', 'id'],
      })
      expect(result.exitCode).toBe(0)
      const payload = parseJsonFromOutput<{ id: string }>(result.output)
      expect(payload).toEqual({ id: 'root.page.cliPage' })
    } finally {
      await tp.cleanup({ files: true, ports: true, processes: true })
    }
  })
})

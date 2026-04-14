import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import nodePath from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(20000)

const packageRoot = nodePath.resolve(__dirname, '..')
const tpf = TestProjectOneClientFactory.create({
  namespace: 'mcp',
  portsRange: [3300, 3399],
})

const writeTestSources = async (tp: TestProjectOneClient): Promise<void> => {
  await tp.write(
    'src/mcp.points.tsx',
    `import { root } from './lib/root.js'
export const mcpPage = root.lets('page', 'mcpPage', '/mcp').tag('root', 'page').page(() => <div>MCP page</div>)
export const mcpActionAction = root.lets.action('GET', '/api/mcp').tag('root', 'action').action(() => ({ ok: true }))
`,
  )
  await tp.write(
    'src/mcp-target.ts',
    `export const mcpTarget = 'mcp-target'
`,
  )
  await tp.write(
    'src/mcp-source.ts',
    `import { mcpTarget } from './mcp-target.js'
export const mcpSource = () => mcpTarget
`,
  )
}

const setupMcpClient = async (): Promise<{
  tp: TestProjectOneClient
  client: Client
  transport: StdioClientTransport
}> => {
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
  const transport = new StdioClientTransport({
    command: 'bun',
    args: ['run', './src/mcp.ts', '--meta', tp.resolve('src/lib/meta.ts')],
    cwd: packageRoot,
    stderr: 'pipe',
  })
  const client = new Client({
    name: 'point0-engine-test-client',
    version: '0.0.0',
  })
  await client.connect(transport)
  return { tp, client, transport }
}

const teardownMcpClient = async ({
  tp,
  client,
  transport,
}: {
  tp: TestProjectOneClient
  client: Client
  transport: StdioClientTransport
}): Promise<void> => {
  await client.close()
  await transport.close()
  await tp.cleanup({ files: true, ports: true, processes: true })
}

beforeAll(async () => {
  await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
})

afterAll(async () => {
  await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
})

describe('point0 MCP server', () => {
  it(
    'registers tools',
    async () => {
      const ctx = await setupMcpClient()
      try {
        const tools = await ctx.client.listTools()
        const toolNames = tools.tools.map((tool) => tool.name)
        expect(toolNames).toContain('list_points')
        expect(toolNames).toContain('get_point')
        expect(toolNames).toContain('compile')
        expect(toolNames).toContain('trace')
      } finally {
        await teardownMcpClient(ctx)
      }
    },
    {
      retry: 3,
    },
  )

  it('list_points returns filtered points from real meta', async () => {
    const ctx = await setupMcpClient()
    try {
      const listed = await ctx.client.callTool({
        name: 'list_points',
        arguments: {
          fields: ['id', 'name'],
          endpointUrl: '/api/mcp',
          tags: ['root', 'action'],
        },
      })
      expect(listed.isError).not.toBe(true)
      expect(listed.structuredContent).toBeDefined()
      const listedStructured = listed.structuredContent as {
        points: Array<{ id: string; name: string }>
        total: number
      }
      expect(listedStructured.total).toBe(1)
      expect(listedStructured.points[0]?.name).toBe('mcpAction')
      expect(listedStructured.points[0]?.id).toContain('.action.mcpAction')
    } finally {
      await teardownMcpClient(ctx)
    }
  })

  it('get_point returns first matching point', async () => {
    const ctx = await setupMcpClient()
    try {
      const single = await ctx.client.callTool({
        name: 'get_point',
        arguments: {
          fields: ['id'],
          url: '/mcp',
        },
      })
      expect(single.isError).not.toBe(true)
      expect(single.structuredContent).toEqual({ id: 'root.page.mcpPage' })
    } finally {
      await teardownMcpClient(ctx)
    }
  })

  it('compile returns compiled source', async () => {
    const ctx = await setupMcpClient()
    try {
      const compiled = await ctx.client.callTool({
        name: 'compile',
        arguments: {
          file: ctx.tp.resolve('src/mcp.points.tsx'),
          side: 'server',
          scope: 'root',
        },
      })
      expect(compiled.isError).not.toBe(true)
      const compiledStructured = compiled.structuredContent as { code: string }
      expect(compiledStructured.code).toMatchInlineSnapshot(`
        "import { root } from './lib/root.js'
        export const mcpPage = root.lets('page', 'mcpPage', '/mcp').tag('root', 'page').page(() => <div>MCP page</div>)
        export const mcpActionAction = root.lets       ("action","mcpAction",'GET','/api/mcp').tag('root','action').action(()=>({ok:true}))"
      `)
    } finally {
      await teardownMcpClient(ctx)
    }
  })

  it('trace returns import chain', async () => {
    const ctx = await setupMcpClient()
    try {
      const traced = await ctx.client.callTool({
        name: 'trace',
        arguments: {
          target: './mcp-target.js',
          source: ctx.tp.resolve('src/mcp-source.ts'),
          side: 'server',
          scope: 'root',
        },
      })
      expect(traced.isError).not.toBe(true)
      const tracedStructured = traced.structuredContent as { trace: string[] }
      expect(Array.isArray(tracedStructured.trace)).toBe(true)
      expect(tracedStructured.trace.length).toBeGreaterThan(0)
      expect(tracedStructured.trace.join('\n')).toContain('mcp-source.ts')
    } finally {
      await teardownMcpClient(ctx)
    }
  })
})

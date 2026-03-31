import { afterEach, describe, expect, it } from 'bun:test'
import nodeFs from 'node:fs/promises'
import nodePath from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const packageRoot = nodePath.resolve(__dirname, '..')
const tempRoot = nodePath.join(__dirname, 'temp', 'mcp')

const cleanupPaths = new Set<string>()

const makeMetaFile = async (): Promise<string> => {
  await nodeFs.mkdir(tempRoot, { recursive: true })
  const filePath = nodePath.join(tempRoot, `${crypto.randomUUID()}.mjs`)
  const fileContent = `
export default {
  engine: {
    file: '/tmp/engine.ts',
    import: async () => ({}),
    server: undefined,
    clients: undefined,
  },
  points: [
    {
      scope: 'app',
      type: 'page',
      name: 'home',
      id: 'point.home',
      route: {
        definition: '/home',
        getRelation: (url) => ({ exact: url === '/home' }),
      },
      endpoint: undefined,
      pos: { file: '/tmp/home.tsx' },
      import: undefined,
      valid: true,
      errors: [],
      ssr: false,
      parents: [],
      layouts: [],
    },
    {
      scope: 'app',
      type: 'query',
      name: 'users',
      id: 'point.users',
      route: undefined,
      endpoint: {
        method: 'GET',
        route: {
          definition: '/api/users',
          getRelation: (url) => ({ exact: url === '/api/users' }),
        },
      },
      pos: { file: '/tmp/users.ts' },
      import: undefined,
      valid: true,
      errors: [],
      ssr: false,
      parents: [],
      layouts: [],
    },
  ],
}
`
  await nodeFs.writeFile(filePath, fileContent, 'utf8')
  cleanupPaths.add(filePath)
  return filePath
}

afterEach(async () => {
  await Promise.all(
    [...cleanupPaths].map(async (filePath) => {
      cleanupPaths.delete(filePath)
      await nodeFs.rm(filePath, { force: true })
    }),
  )
})

describe('point0 MCP server', () => {
  it('registers tools and serves list_points/get_point', async () => {
    const metaPath = await makeMetaFile()
    const transport = new StdioClientTransport({
      command: 'bun',
      args: ['run', './src/mcp.ts', '--meta', metaPath],
      cwd: packageRoot,
      stderr: 'pipe',
    })
    const client = new Client({
      name: 'point0-engine-test-client',
      version: '0.0.0',
    })

    try {
      await client.connect(transport)

      const tools = await client.listTools()
      const toolNames = tools.tools.map((tool) => tool.name)
      expect(toolNames).toContain('list_points')
      expect(toolNames).toContain('get_point')

      const listed = await client.callTool({
        name: 'list_points',
        arguments: {
          fields: ['id', 'name'],
          endpointUrl: '/api/users',
        },
      })
      expect(listed.isError).not.toBe(true)
      expect(listed.structuredContent).toBeDefined()
      const listedStructured = listed.structuredContent as {
        points: Array<{ id: string; name: string }>
        total: number
      }
      expect(listedStructured.total).toBe(1)
      expect(listedStructured.points).toEqual([{ id: 'point.users', name: 'users' }])

      const single = await client.callTool({
        name: 'get_point',
        arguments: {
          fields: ['id'],
          url: '/home',
        },
      })
      expect(single.isError).not.toBe(true)
      expect(single.structuredContent).toEqual({ id: 'point.home' })
    } finally {
      await client.close()
      await transport.close()
    }
  })
})

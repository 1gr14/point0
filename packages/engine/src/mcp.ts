#!/usr/bin/env bun

import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { Analyzer, analyzerListPointsSchemaShape, analyzerPointSelectSchemaShape } from './analyzer.js'
import type { AnalyzerPointSelectOptions, AnalyzerPointsFilterOptions } from './analyzer.js'

const parseMetaArgs = (): string[] => {
  const args = process.argv.slice(2)
  const metaPaths: string[] = []

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--meta') {
      const value = args[i + 1]
      if (!value || value.startsWith('--')) {
        throw new Error("Each '--meta' flag must be followed by a path.")
      }
      metaPaths.push(value)
      i++
    }
  }

  if (metaPaths.length === 0) {
    throw new Error("At least one '--meta <path>' flag is required.")
  }

  return metaPaths
}

const resolveMetaImportPaths = (metaPaths: string[]): string[] => {
  return metaPaths.map((metaPath) => {
    const absolutePath = path.isAbsolute(metaPath) ? metaPath : path.resolve(process.cwd(), metaPath)
    return pathToFileURL(absolutePath).href
  })
}

let analyzerPromise: Promise<Analyzer> | undefined

const getAnalyzer = async (): Promise<Analyzer> => {
  analyzerPromise ??= Analyzer.load(resolveMetaImportPaths(parseMetaArgs()))
  return await analyzerPromise
}

const buildFilter = (input: AnalyzerPointSelectOptions): AnalyzerPointsFilterOptions => {
  return {
    ids: input.ids,
    id: input.id,
    scope: input.scope,
    type: input.type,
    name: input.name,
    route: input.route,
    url: input.url,
    endpointMethod: input.endpointMethod,
    endpointRoute: input.endpointRoute,
    endpointUrl: input.endpointUrl,
    valid: input.valid,
    ssr: input.ssr,
    file: input.file,
    parendId: input.parendId,
    layoutId: input.layoutId,
  }
}

const server = new McpServer(
  {
    name: 'point0',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

server.registerTool(
  'list_points',
  {
    title: 'List points',
    description: 'List points with filtering, pagination, and optional field selection.',
    inputSchema: analyzerListPointsSchemaShape,
  },
  async (input) => {
    const analyzer = await getAnalyzer()
    const filter = buildFilter(input)

    const result = analyzer.listPoints({
      filter,
      fields: input.fields,
      limit: input.limit ?? 100,
      offset: input.offset ?? 0,
      omitImports: true,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
      structuredContent: result,
    }
  },
)

server.registerTool(
  'get_point',
  {
    title: 'Get point',
    description: 'Get the first point that matches the provided filters.',
    inputSchema: analyzerPointSelectSchemaShape,
  },
  async (input) => {
    const analyzer = await getAnalyzer()
    const filter = buildFilter(input)

    const result = analyzer.getPoint({
      filter,
      fields: input.fields,
      omitImports: true,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result ?? null, null, 2),
        },
      ],
      structuredContent: result ?? undefined,
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)

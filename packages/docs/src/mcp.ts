#!/usr/bin/env bun

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { getDocOrUndefined, listDocs, searchDocs } from './search.js'

const server = new McpServer(
  {
    name: 'point0-docs',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

server.registerTool(
  'list_docs',
  {
    title: 'List Point0 docs',
    description:
      'List all Point0 documentation pages (table of contents) with their slug, category, title and description.',
    inputSchema: {
      limit: z.number().int().nonnegative().optional().describe('Maximum number of docs to return. Default: all.'),
      offset: z.number().int().nonnegative().optional().describe('Zero-based pagination offset. Default 0.'),
    },
  },
  async ({ limit, offset }) => {
    const result = listDocs({ limit, offset })
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    }
  },
)

server.registerTool(
  'search_docs',
  {
    title: 'Search Point0 docs',
    description:
      'Hybrid (keyword + semantic) search across Point0 documentation. Returns matching sections with snippets.',
    inputSchema: {
      query: z.string().describe('Natural-language search query.'),
      limit: z.number().int().nonnegative().optional().describe('Max number of results (default 8).'),
      offset: z.number().int().nonnegative().optional().describe('Zero-based pagination offset. Default 0.'),
    },
  },
  async ({ query, limit, offset }) => {
    const result = await searchDocs(query, { limit, offset })
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    }
  },
)

server.registerTool(
  'get_doc',
  {
    title: 'Get Point0 doc',
    description:
      'Get the full markdown content of a single Point0 documentation page by its slug (the file name, e.g. "overview").',
    inputSchema: {
      slug: z.string().describe('Doc slug — the file name, e.g. "overview".'),
    },
  },
  async ({ slug }) => {
    const doc = getDocOrUndefined(slug)
    if (!doc) {
      return {
        content: [{ type: 'text', text: `No doc found for slug "${slug}".` }],
        isError: true,
      }
    }
    return {
      content: [{ type: 'text', text: doc.content }],
      structuredContent: doc,
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)

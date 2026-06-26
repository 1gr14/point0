#!/usr/bin/env bun

import { createRequire } from 'node:module'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  getDocOrUndefined,
  getDocOutlineOrUndefined,
  getDocSectionOrUndefined,
  listDocs,
  searchDocs,
} from './search.js'

// Read the real installed version from @point0/docs's own package.json (dist/mcp.js sits one level under it).
const { version: point0DocsVersion } = createRequire(import.meta.url)('../package.json') as { version: string }

const server = new McpServer(
  {
    name: 'point0-docs',
    version: point0DocsVersion,
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
      'Hybrid (keyword + semantic) search across Point0 documentation. Returns matching sections, each with its heading ' +
      'anchor (`headingId`) and a ready-to-use `ref` (`slug#headingId`) plus `chars` (section size). Read just the ' +
      'matched section with get_section(slug, headingId) instead of pulling the whole page with get_doc.',
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
      'Get the full markdown content of a single Point0 documentation page by its slug (the file name, e.g. "overview"). ' +
      'Returns the entire page, which can be large — for a big page, prefer get_outline to see its sections, then ' +
      'get_section to read only the part you need.',
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

server.registerTool(
  'get_outline',
  {
    title: 'Get Point0 doc outline',
    description:
      'Get the heading outline (table of contents) of a single Point0 doc page by slug: every section heading with its ' +
      'anchor id (`headingId`), level, and size in characters. Use this to navigate a large page, then read just the ' +
      'section you need with get_section — cheaper than pulling the whole page with get_doc.',
    inputSchema: {
      slug: z.string().describe('Doc slug — the file name, e.g. "overview".'),
    },
  },
  async ({ slug }) => {
    const outline = getDocOutlineOrUndefined(slug)
    if (!outline) {
      return {
        content: [{ type: 'text', text: `No doc found for slug "${slug}".` }],
        isError: true,
      }
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(outline, null, 2) }],
      structuredContent: outline,
    }
  },
)

server.registerTool(
  'get_section',
  {
    title: 'Get Point0 doc section',
    description:
      'Get one section of a Point0 doc page as markdown, addressed by slug + heading anchor (the `headingId` / part ' +
      "after `#` in a search hit's `ref`, or an id from get_outline). Returns just that heading and its body, including " +
      'any subsections under it — far smaller than the whole page. Prefer this over get_doc for large pages.',
    inputSchema: {
      slug: z.string().describe('Doc slug — the file name, e.g. "overview".'),
      heading: z
        .string()
        .describe('Heading anchor within the page, e.g. "server-side-rendering" — a search hit\'s `headingId`.'),
    },
  },
  async ({ slug, heading }) => {
    const section = getDocSectionOrUndefined(slug, heading)
    if (!section) {
      return {
        content: [{ type: 'text', text: `No section "${heading}" found in doc "${slug}".` }],
        isError: true,
      }
    }
    return {
      content: [{ type: 'text', text: section.content }],
      structuredContent: section,
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)

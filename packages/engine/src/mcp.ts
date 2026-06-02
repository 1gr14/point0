#!/usr/bin/env bun

import path from 'node:path'
import { Compiler } from '@point0/compiler'
import type { PointsScope } from '@point0/core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  analyzerListPointsSchemaShape,
  analyzerPointSelectSchemaShape,
  buildPointsFilter,
  createMetaAnalyzerLoader,
} from './analyzer.js'
import type { Analyzer, AnalyzerMetaEngine } from './analyzer.js'
import { normalizeAndValidateNodeEnv } from './utils.js'

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

let loadAnalyzer: (() => Promise<Analyzer>) | undefined

// Re-reads the on-disk meta on every call (see createMetaAnalyzerLoader), so the long-lived MCP
// never serves stale points after `point0 generate` regenerates the meta. parseMetaArgs stays
// lazy so a missing `--meta` surfaces on first tool call, not at connect time.
const getAnalyzer = (): Promise<Analyzer> => {
  loadAnalyzer ??= createMetaAnalyzerLoader(parseMetaArgs())
  return loadAnalyzer()
}

const getMetaEngine = async (engineFile?: string): Promise<AnalyzerMetaEngine> => {
  const analyzer = await getAnalyzer()
  const engines = analyzer.engines
  if (engines.length === 0) {
    throw new Error('No engines found in provided meta files.')
  }
  if (!engineFile) {
    if (engines.length > 1) {
      throw new Error("Multiple engines found. Provide 'engineFile' to select one.")
    }
    return engines[0]
  }
  const resolvedEngineFile = path.isAbsolute(engineFile) ? engineFile : path.resolve(process.cwd(), engineFile)
  const matched = engines.find((engine) => engine.file === resolvedEngineFile)
  if (!matched) {
    throw new Error(`No engine found for file: ${resolvedEngineFile}`)
  }
  return matched
}

const compileSchemaShape = {
  file: z.string().describe('Path to file to compile (absolute or relative to cwd).'),
  side: z.enum(['server', 'client']).optional().describe("Compile side: 'server' or 'client'."),
  scope: z.string().optional().describe('Compile scope (optional, inferred from side when omitted).'),
  hmr: z.boolean().optional().describe('Enable HMR fix in compiled output.'),
  engineFile: z.string().optional().describe('Engine file path when multiple metas/engines are provided.'),
}

const traceSchemaShape = {
  target: z.string().describe('Import target to trace.'),
  source: z.string().describe('Source file to trace from (absolute or relative to cwd).'),
  side: z.enum(['server', 'client']).optional().describe("Trace side: 'server' or 'client'."),
  scope: z.string().optional().describe('Trace scope (optional, inferred from side when omitted).'),
  cwd: z.string().optional().describe('Trace cwd (optional, inferred from engine file when omitted).'),
  engineFile: z.string().optional().describe('Engine file path when multiple metas/engines are provided.'),
}

const server = new McpServer(
  {
    name: 'point0-project',
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
    const filter = buildPointsFilter(input)

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
    const filter = buildPointsFilter(input)

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

server.registerTool(
  'compile',
  {
    title: 'Compile file',
    description:
      'Show compiled code for file using compiler options from engine. Useful for which server/client code was remove after compiling',
    inputSchema: compileSchemaShape,
  },
  async (input) => {
    normalizeAndValidateNodeEnv('development')
    const cwd = process.cwd()
    const metaEngine = await getMetaEngine(input.engineFile)
    const engine = await metaEngine.import()
    const { side: compileSide, scope: compileScope } = engine.guessSideAndScope({
      side: input.side,
      scope: input.scope as PointsScope | undefined,
    })
    const runtime =
      compileSide === 'server' ? engine.server : engine.clients.find((client) => client.scope === compileScope)
    if (!runtime) {
      throw new Error(`Can not find ${compileSide} runtime for scope "${compileScope}"`)
    }
    const compilerOptions = runtime.getCompilerOptions({
      built: process.env.POINT0_BUILT === 'true',
    })
    if (!compilerOptions) {
      throw new Error(`Compiler is disabled for ${compileSide} scope "${compileScope}"`)
    }
    const compiler = Compiler.create({
      ...compilerOptions,
      hmrFix: input.hmr === true,
    })
    const resolvedFile = path.isAbsolute(input.file) ? input.file : path.resolve(cwd, input.file)
    const result = compiler.compile({ file: resolvedFile })
    if (result.errors.length > 0) {
      throw result.errors[0] as Error
    }
    return {
      content: [
        {
          type: 'text',
          text: result.code,
        },
      ],
      structuredContent: {
        code: result.code,
      },
    }
  },
)

server.registerTool(
  'trace',
  {
    title: 'Trace import chain',
    description:
      'Trace import chain using compiler from engine config. Useful for understanding how one file come to another by imports.',
    inputSchema: traceSchemaShape,
  },
  async (input) => {
    normalizeAndValidateNodeEnv('development')
    const cwd = process.cwd()
    const metaEngine = await getMetaEngine(input.engineFile)
    const engine = await metaEngine.import()
    const normalizedCwd = input.cwd ? path.resolve(cwd, input.cwd) : path.dirname(metaEngine.file)
    const { side: traceSide, scope: traceScope } = engine.guessSideAndScope({
      side: input.side,
      scope: input.scope as PointsScope | undefined,
    })
    const runtime =
      traceSide === 'server' ? engine.server : engine.clients.find((client) => client.scope === traceScope)
    if (!runtime) {
      throw new Error(`Can not find ${traceSide} runtime for scope "${traceScope}"`)
    }
    const compilerOptions = runtime.getCompilerOptions({
      built: process.env.POINT0_BUILT === 'true',
    })
    if (!compilerOptions) {
      throw new Error(`Compiler is disabled for ${traceSide} scope "${traceScope}"`)
    }
    const compiler = Compiler.create(compilerOptions)
    const resolvedSource = path.isAbsolute(input.source) ? input.source : path.resolve(cwd, input.source)
    const result = compiler.trace({
      policy: 'compiling',
      target: input.target,
      source: resolvedSource,
      cwd: normalizedCwd,
    })
    if (!result.found) {
      throw new Error('Trace was not found')
    }
    return {
      content: [
        {
          type: 'text',
          text: result.trace.join('\n'),
        },
      ],
      structuredContent: {
        trace: result.trace,
      },
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)

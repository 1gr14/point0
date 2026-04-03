#!/usr/bin/env bun

import { Compiler } from '@point0/compiler'
import type { PointsScope } from '@point0/core'
import { Command } from 'commander'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Analyzer } from './analyzer.js'
import type { AnalyzerPointSelectOptions, AnalyzerPointsFilterOptions } from './analyzer.js'
import { Engine } from './engine.js'
import { normalizeAndValidateNodeEnv } from './utils.js'
import nodePath from 'node:path'

const program = new Command()

program.name('point0').description('Point0 CLI').version('0.1.0').enablePositionalOptions()

const dictionary = {
  noGenerate: 'Skip files generation',
  enginePath: 'Path to engine file (absolute or relative to cwd)',
}
const parseCommaSeparatedOption = (value: string, previous: string[] = []): string[] => {
  previous.push(...value.split(','))
  return previous
}

program
  .command('dev')
  .description('Start development server and clients')
  .passThroughOptions() // forward anything after --
  .allowExcessArguments() // allow args after --
  .option('-G, --no-generate', dictionary.noGenerate)
  .option('--side <side>', "Serve only one side: 'server' or 'client'")
  .option('--scope <scope>', 'Server only one scope')
  .option('-W, --no-watch', 'Prevent watch file changes, restrat server, regenrate files')
  .option(
    '--entry <name|path>',
    'Server entry points, names or paths (--entry <entry1>,<entry2>,...) or (--entry <entry1> --entry <entry2> ...)',
    parseCommaSeparatedOption,
    [],
  )
  .option('--engine <path>', dictionary.enginePath)
  .option(
    '--env <name_eq_value>',
    'Environment variables to define, name=value (--env name1=value1 --env name2=value2 ...)',
    (value, previous: string[] = []) => {
      previous.push(value)
      return previous
    },
    [],
  )
  .action(
    async (options: {
      engine?: string
      entry?: string[]
      env?: string[]
      side?: 'server' | 'client' | undefined
      scope?: string | undefined
      generate?: boolean
      watch?: boolean
    }) => {
      // const { engine, engineFile } = await Engine.findAndImportSelf(options.engine)
      const cwd = process.cwd()
      const { engine } = await Engine.findAndImportSelf({ engineFile: options.engine, cwd })
      const dashDashIndex = process.argv.indexOf('--')
      const bunRunArgs = dashDashIndex === -1 ? [] : process.argv.slice(dashDashIndex + 1)
      const generateFiles = options.generate !== false
      const watch = options.watch !== false
      const entries = options.entry
      for (const env of options.env ?? []) {
        const [name, ...valueParts] = env.split('=')
        const value = valueParts.join('=')
        process.env[name] = value
      }
      const side = options.side as string | undefined
      const scope = options.scope as string | boolean | undefined
      if (side && side !== 'server' && side !== 'client') {
        throw new Error(`Invalid side: ${side}, valid values are 'server' or 'client'`)
      }
      if (scope && typeof scope !== 'string') {
        throw new Error(`Invalid scope: ${scope}, valid values are strings`)
      }
      await engine.dev({
        // engineFile,
        generateFiles,
        side: side as 'server' | 'client' | undefined,
        scope: scope as string | undefined,
        watch,
        bunRunArgs,
        cwd,
        entries,
      })
    },
  )

program
  .command('build')
  .description('Build server and clients')
  .option('--engine <path>', dictionary.enginePath)
  .option(
    '-w, --watch [glob]',
    'Watch files and rebuild on changes (no value = default points glob, comma-separated or repeated values supported)',
    parseCommaSeparatedOption,
  )
  .option('--side <side>', 'Build only one side: server or client')
  .option('--scope <scope>', 'Scope to build')
  .option('-G, --no-generate', dictionary.noGenerate)
  .option('-C, --no-clean', 'Do not clean build')
  .option('-P, --no-publicdir', 'Do not build publicdir')
  .option(
    '--env <name_eq_value>',
    'Environment variables to define, name=value (--env name1=value1 --env name2=value2 ...)',
    (value, previous: string[] = []) => {
      previous.push(value)
      return previous
    },
    [],
  )
  .action(
    async (options: {
      engine?: string
      watch?: boolean | string[]
      side?: 'server' | 'client'
      scope?: string
      generate?: boolean
      clean?: boolean
      publicdir?: boolean
      env?: string[]
    }) => {
      process.env.NODE_ENV ??= 'production'
      const { engine } = await Engine.findAndImportSelf({ engineFile: options.engine, cwd: process.cwd() })
      for (const env of options.env ?? []) {
        const [name, ...valueParts] = env.split('=')
        const value = valueParts.join('=')
        process.env[name] = value
      }
      const watch = Array.isArray(options.watch) ? options.watch : undefined
      const buildOptions = {
        generate: options.generate !== false,
        side: options.side as 'server' | 'client' | undefined,
        scope: options.scope as PointsScope,
        clean: options.clean !== false,
        publicdir: options.publicdir !== false,
      }
      if (options.watch) {
        await engine.buildWatch({
          ...buildOptions,
          watch,
          cwd: process.cwd(),
        })
      } else {
        await engine.build(buildOptions)
      }
    },
  )

program
  .command('generate')
  .description('Generate points and routes files')
  .option('-w, --watch', 'Watch for changes and regenerate')
  .option('--engine <path>', dictionary.enginePath)
  .action(async (options) => {
    const { engine } = await Engine.findAndImportSelf(options.engine)
    if (options.watch) {
      await engine.generateWatch()
    } else {
      await engine.generate()
    }
  })

program
  .command('compile <file>')
  .description('Show compiled code for file')
  .option('--engine <path>', dictionary.enginePath)
  .option('--side <side>', "Trace side: 'server' or 'client'")
  .option('--scope <scope>', 'Trace scope (optional, inferred from side when omitted)')
  .option('--hmr', 'Do not omit hmr fix')
  .action(
    async (
      file: string,
      options: {
        hmr?: boolean
        engine?: string
        side?: string
        scope?: PointsScope
      },
    ) => {
      const cwd = process.cwd()
      normalizeAndValidateNodeEnv('development')
      const { engine } = await Engine.findAndImportSelf({ engineFile: options.engine, cwd })
      const { side: compileSide, scope: compileScope } = engine.guessSideAndScope({
        side: options.side,
        scope: options.scope,
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
        // Keep output readable by default; enable with --hmr.
        hmrFix: options.hmr === true,
      })
      const resolvedFile = path.isAbsolute(file) ? file : path.resolve(cwd, file)
      const result = compiler.compile({ file: resolvedFile })
      if (result.errors.length > 0) {
        throw result.errors[0] as Error
      }
      console.info(result.code)
    },
  )

program
  .command('trace <target> <source>')
  .description('Trace import chain using compiler from engine config')
  .option('--engine <path>', dictionary.enginePath)
  .option('--side <side>', "Trace side: 'server' or 'client'")
  .option('--scope <scope>', 'Trace scope (optional, inferred from side when omitted)')
  .option('--cwd <cwd>', 'Trace cwd (optional, inferred from engine file when omitted)')
  // .option('--policy <policy>', "Trace policy: 'memory' or 'compiling' (default: compiling)")
  .action(
    async (
      target: string,
      source: string | undefined,
      options: {
        engine?: string
        side?: string
        scope?: PointsScope
        cwd?: string
        // policy?: string
      },
    ) => {
      const cwd = process.cwd()
      normalizeAndValidateNodeEnv('development')
      const { engine, engineFile } = await Engine.findAndImportSelf({ engineFile: options.engine, cwd })
      const normalizedCwd = options.cwd ? path.resolve(cwd, options.cwd) : nodePath.dirname(engineFile)
      const { side: traceSide, scope: traceScope } = engine.guessSideAndScope({
        side: options.side,
        scope: options.scope,
      })
      // const policy = options.policy ?? 'compiling'
      // if (policy !== 'memory' && policy !== 'compiling') {
      // throw new Error(`Invalid policy: ${policy}, valid values are 'memory' or 'compiling'`)
      // }

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
      const resolvedSource = source ? (path.isAbsolute(source) ? source : path.resolve(cwd, source)) : undefined

      // if (policy === 'compiling' && !resolvedSource) {
      //   throw new Error('To create trace by compiling policy, "source" is required')
      // }
      if (!resolvedSource) {
        throw new Error('To create trace, "source" is required')
      }

      // const result =
      //   policy === 'compiling'
      //     ? compiler.trace({ policy, target, source: resolvedSource as string })
      //     : compiler.trace({ policy, target })
      const result = compiler.trace({
        policy: 'compiling',
        target,
        source: resolvedSource as string,
        cwd: normalizedCwd,
      })
      if (!result.found) {
        throw new Error('Trace was not found')
      }
      console.info(result.trace.join('\n'))
    },
  )

const pointsCommand = program.command('points').description('Inspect points from analyzer meta files')

const parseBooleanOption = (value: string): boolean => {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  throw new Error(`Invalid boolean value: ${value}. Use "true" or "false".`)
}
const parseNonNegativeIntegerOption =
  (optionName: string) =>
  (value: string): number => {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`Invalid ${optionName}: ${value}. Must be a non-negative integer.`)
    }
    return parsed
  }
const ensureMetaPaths = (meta: string[] | undefined): string[] => {
  if (!meta || meta.length === 0) {
    throw new Error("At least one '--meta <path>' flag is required.")
  }
  return meta
}
const resolveMetaImportPaths = (metaPaths: string[]): string[] => {
  return metaPaths.map((metaPath) => {
    const absolutePath = path.isAbsolute(metaPath) ? metaPath : path.resolve(process.cwd(), metaPath)
    return pathToFileURL(absolutePath).href
  })
}
const loadAnalyzer = async (meta: string[] | undefined): Promise<Analyzer> => {
  return await Analyzer.load(resolveMetaImportPaths(ensureMetaPaths(meta)))
}
const buildPointsFilter = (input: AnalyzerPointSelectOptions): AnalyzerPointsFilterOptions => {
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
const undefinedIfEmpty = <T>(value: T[] | undefined): T[] | undefined => {
  if (!value || value.length === 0) {
    return undefined
  }
  return value
}

pointsCommand
  .command('list')
  .description('List points with filters, pagination, and field selection')
  .option('--meta <path>', 'Path to analyzer meta module', (value, previous: string[] = []) => [...previous, value])
  .option('--ids <ids>', 'Comma-separated point ids', parseCommaSeparatedOption)
  .option('--id <id>', 'Point id')
  .option('--scope <scope>', 'Point scope')
  .option('--type <type>', 'Point type')
  .option('--name <name>', 'Point name')
  .option('--route <route>', 'Point route definition')
  .option('--url <url>', 'Exact URL match against point route')
  .option('--endpoint-method <method>', 'Endpoint HTTP method')
  .option('--endpoint-route <route>', 'Endpoint route definition')
  .option('--endpoint-url <url>', 'Exact URL match against endpoint route')
  .option('--valid <boolean>', 'Point validity filter (true|false)', parseBooleanOption)
  .option('--ssr <boolean>', 'Point SSR filter (true|false)', parseBooleanOption)
  .option('--file <path>', 'Point source file path')
  .option('--parend-id <id>', "Filter by parent id (kept as 'parendId' for compatibility)")
  .option('--layout-id <id>', 'Filter by layout id')
  .option('--fields <fields>', 'Comma-separated fields to return', parseCommaSeparatedOption)
  .option('--limit <number>', 'Maximum number of points', parseNonNegativeIntegerOption('limit'))
  .option('--offset <number>', 'Pagination offset', parseNonNegativeIntegerOption('offset'))
  .action(
    async (
      options: AnalyzerPointSelectOptions & { meta?: string[]; fields?: string[]; limit?: number; offset?: number },
    ) => {
      const analyzer = await loadAnalyzer(options.meta)
      const selectOptions = {
        ...options,
        ids: undefinedIfEmpty(options.ids),
        fields: undefinedIfEmpty(options.fields),
      } as AnalyzerPointSelectOptions
      const filter = buildPointsFilter(selectOptions)
      const result = analyzer.listPoints({
        filter,
        fields: selectOptions.fields as never,
        limit: options.limit ?? 100,
        offset: options.offset ?? 0,
        omitImports: true,
      })
      console.info(JSON.stringify(result, null, 2))
    },
  )

pointsCommand
  .command('get')
  .description('Get the first point that matches provided filters')
  .option('--meta <path>', 'Path to analyzer meta module', (value, previous: string[] = []) => [...previous, value])
  .option('--ids <ids>', 'Comma-separated point ids', parseCommaSeparatedOption)
  .option('--id <id>', 'Point id')
  .option('--scope <scope>', 'Point scope')
  .option('--type <type>', 'Point type')
  .option('--name <name>', 'Point name')
  .option('--route <route>', 'Point route definition')
  .option('--url <url>', 'Exact URL match against point route')
  .option('--endpoint-method <method>', 'Endpoint HTTP method')
  .option('--endpoint-route <route>', 'Endpoint route definition')
  .option('--endpoint-url <url>', 'Exact URL match against endpoint route')
  .option('--valid <boolean>', 'Point validity filter (true|false)', parseBooleanOption)
  .option('--ssr <boolean>', 'Point SSR filter (true|false)', parseBooleanOption)
  .option('--file <path>', 'Point source file path')
  .option('--parend-id <id>', "Filter by parent id (kept as 'parendId' for compatibility)")
  .option('--layout-id <id>', 'Filter by layout id')
  .option('--fields <fields>', 'Comma-separated fields to return', parseCommaSeparatedOption)
  .action(async (options: AnalyzerPointSelectOptions & { meta?: string[]; fields?: string[] }) => {
    const analyzer = await loadAnalyzer(options.meta)
    const selectOptions = {
      ...options,
      ids: undefinedIfEmpty(options.ids),
      fields: undefinedIfEmpty(options.fields),
    } as AnalyzerPointSelectOptions
    const filter = buildPointsFilter(selectOptions)
    const result = analyzer.getPoint({
      filter,
      fields: selectOptions.fields as never,
      omitImports: true,
    })
    console.info(JSON.stringify(result ?? null, null, 2))
  })

program.parse()

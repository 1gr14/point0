#!/usr/bin/env bun

import { Compiler } from '@point0/compiler'
import type { PointsScope } from '@point0/core'
import { Command } from 'commander'
import { default as nodePath, default as path } from 'node:path'
import { Analyzer, buildPointsFilter, ensureMetaPaths, resolveMetaImportPaths } from './analyzer.js'
import type { AnalyzerPointSelectOptions } from './analyzer.js'
import { Engine } from './engine.js'
import { normalizeAndValidateNodeEnv } from './utils.js'

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
    '-w, --watch [glob]',
    'Watch files and rebuild on changes (no value = default devWatchGlob glob from server engine config, comma-separated or repeated values supported)',
    parseCommaSeparatedOption,
    [],
  )
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
      watch?: boolean | string[]
    }) => {
      // const { engine, engineFile } = await Engine.findAndImportSelf(options.engine)
      const cwd = process.cwd()
      const { engine } = await Engine.findAndImportSelf({ engineFile: options.engine, cwd })
      const dashDashIndex = process.argv.indexOf('--')
      const bunRunArgs = dashDashIndex === -1 ? [] : process.argv.slice(dashDashIndex + 1)
      const generateFiles = options.generate !== false
      const watch = Array.isArray(options.watch)
        ? options.watch.length === 0
          ? undefined
          : options.watch.map((w) => nodePath.resolve(cwd, w))
        : options.watch
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
  .command('prune')
  .description('Prune temporary directories')
  .action(async () => {
    const { engine } = await Engine.findAndImportSelf({ cwd: process.cwd() })
    await engine.prune()
  })

program
  .command('build')
  .description('Build server and clients')
  .option('--engine <path>', dictionary.enginePath)
  .option(
    '-w, --watch [glob]',
    'Watch files and rebuild on changes (no value = default buildWatchGlob glob from engine config, comma-separated or repeated values supported)',
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
      process.env.LOG_MODE = 'pretty'
      const { engine } = await Engine.findAndImportSelf({ engineFile: options.engine, cwd: process.cwd() })
      for (const env of options.env ?? []) {
        const [name, ...valueParts] = env.split('=')
        const value = valueParts.join('=')
        process.env[name] = value
      }
      const watch = Array.isArray(options.watch)
        ? options.watch.length === 0
          ? undefined
          : options.watch.map((w) => nodePath.resolve(process.cwd(), w))
        : options.watch

      const buildOptions = {
        generate: options.generate !== false,
        side: options.side as 'server' | 'client' | undefined,
        scope: options.scope as PointsScope,
        clean: options.clean !== false,
        publicdir: options.publicdir !== false,
      }
      if (watch) {
        await engine.buildWatch({
          ...buildOptions,
          watch,
          cwd: process.cwd(),
        })
      } else {
        await engine.build(buildOptions)
        process.exit(0)
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
  // Reassign help to `--help` only so `-h` is free for `--hmr` below. Long-form `--help` still works.
  .helpOption('--help', 'display help for command')
  .option('--engine <path>', dictionary.enginePath)
  .option('--side <side>', "Compile side: 'server' or 'client'")
  .option('-c, --client', 'Shorthand for --side client')
  .option('-s, --server', 'Shorthand for --side server')
  .option('--scope <scope>', 'Compile scope (optional, inferred from side when omitted)')
  .option('--mode <mode>', "NODE_ENV mode: 'production' | 'development' | 'test' (else current NODE_ENV)")
  .option('-b, --built', `Treat the engine as built (else POINT0_BUILT === 'true')`)
  .option('-p, --production', 'Shorthand for --mode production')
  .option('-d, --development', 'Shorthand for --mode development')
  .option('-t, --test', 'Shorthand for --mode test')
  .option('-B, --no-babel', 'Strip babel plugins from compiler options')
  // Paired --hmr / --no-hmr: separate shorts, same key. If neither flag is passed, the value
  // is left unset and we inherit the engine-config hmrFix.
  .option('-h, --hmr', 'Force hmrFix: true')
  .option('-H, --no-hmr', 'Force hmrFix: false (else use engine config value)')
  .action(
    async (
      file: string,
      options: {
        engine?: string
        side?: string
        client?: boolean
        server?: boolean
        scope?: PointsScope
        mode?: string
        production?: boolean
        development?: boolean
        test?: boolean
        built?: boolean
        // Commander negates `--no-*` into the positive key, defaulting to `true`. The flag is
        // present (i.e. user passed `-B`/`-H`) when the value is `false`.
        babel?: boolean
        hmr?: boolean
      },
    ) => {
      const cwd = process.cwd()
      // Resolve --mode (shorthand > --mode > current NODE_ENV). Set NODE_ENV before the engine
      // module loads, since downstream code reads it at evaluation time.
      const resolvedMode = options.production
        ? 'production'
        : options.development
          ? 'development'
          : options.test
            ? 'test'
            : options.mode
      if (resolvedMode) {
        process.env.NODE_ENV = resolvedMode
      }
      normalizeAndValidateNodeEnv('development')
      const { engine } = await Engine.findAndImportSelf({ engineFile: options.engine, cwd })
      // Resolve side: -c / -s shorthand wins over --side.
      const sideArg = options.client ? 'client' : options.server ? 'server' : options.side
      const { side: compileSide, scope: compileScope } = engine.guessSideAndScope({
        side: sideArg,
        scope: options.scope,
      })
      const runtime =
        compileSide === 'server' ? engine.server : engine.clients.find((client) => client.scope === compileScope)
      if (!runtime) {
        throw new Error(`Can not find ${compileSide} runtime for scope "${compileScope}"`)
      }
      // Resolve --built: explicit flag wins, else env var.
      const built = options.built === true || process.env.POINT0_BUILT === 'true'
      const compilerOptions = runtime.getCompilerOptions({ built })
      if (!compilerOptions) {
        throw new Error(`Compiler is disabled for ${compileSide} scope "${compileScope}"`)
      }
      // --no-babel (-B): drop babel plugins so we see point0-only transforms.
      const babelOverride = options.babel === false ? { babel: [] } : {}
      // --hmr (-h) → force true; --no-hmr (-H) → force false; absent → leave engine-config value.
      // (commander resolves to last-wins if both are passed)
      const hmrOverride =
        options.hmr === true ? { hmrFix: true } : options.hmr === false ? { hmrFix: false } : {}
      const compiler = Compiler.create({
        ...compilerOptions,
        ...babelOverride,
        ...hmrOverride,
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

      if (!resolvedSource) {
        throw new Error('To create trace, "source" is required')
      }

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
const loadAnalyzer = async (meta: string[] | undefined): Promise<Analyzer> => {
  return await Analyzer.load(resolveMetaImportPaths(ensureMetaPaths(meta)))
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
  .option('--tags <tags>', 'Comma-separated tags (all provided tags must match)', parseCommaSeparatedOption)
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
  .option('--tags <tags>', 'Comma-separated tags (all provided tags must match)', parseCommaSeparatedOption)
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

const docsCommand = program
  .command('docs')
  .description('Search and read Point0 documentation (requires the @point0/docs package)')

const loadDocs = async (): Promise<typeof import('@point0/docs')> => {
  try {
    return await import('@point0/docs')
  } catch {
    throw new Error('Point0 docs are not installed. Install them with: bun add -D @point0/docs')
  }
}

docsCommand
  .command('search <query...>')
  .description('Hybrid (keyword + semantic) search across the docs')
  .option('--limit <number>', 'Maximum number of results', parseNonNegativeIntegerOption('limit'))
  .option('--offset <number>', 'Pagination offset', parseNonNegativeIntegerOption('offset'))
  .action(async (query: string[], options: { limit?: number; offset?: number }) => {
    const docs = await loadDocs()
    const result = await docs.searchDocs(query.join(' '), { limit: options.limit, offset: options.offset })
    console.info(JSON.stringify(result, null, 2))
  })

docsCommand
  .command('list')
  .description('List all docs as a table of contents')
  .option('--limit <number>', 'Maximum number of docs', parseNonNegativeIntegerOption('limit'))
  .option('--offset <number>', 'Pagination offset', parseNonNegativeIntegerOption('offset'))
  .action(async (options: { limit?: number; offset?: number }) => {
    const docs = await loadDocs()
    console.info(JSON.stringify(docs.listDocs({ limit: options.limit, offset: options.offset }), null, 2))
  })

docsCommand
  .command('get <slug>')
  .description('Get the full markdown of a doc by its slug (the file name)')
  .action(async (slug: string) => {
    const docs = await loadDocs()
    const doc = docs.getDoc(slug)
    if (!doc) {
      throw new Error(`No doc found for slug "${slug}".`)
    }
    console.info(doc.content)
  })

program.parse()

#!/usr/bin/env -S bun --no-orphans --no-env-file --config=/dev/null

// ^ The shebang (bun >= 1.3.14; `env -S` splits it into arguments on macOS and Linux) makes the CLI
// hermetic and leak-proof: `--no-env-file` stops Bun from auto-loading .env files before any CLI code
// runs (with NODE_ENV unset it would assume development and load .env.development), `--config=/dev/null`
// keeps the app's bunfig out of this process, and `--no-orphans` (bun >= 1.3.14, no-op on Windows) ties
// the whole process tree to its parent: the CLI exits when whatever launched it dies — even by SIGKILL —
// and on exit SIGKILLs every descendant it spawned (Bun re-verifies each descendant's parentage before
// killing, so recycled PIDs are safe). The flag is inherited by nested bun processes, so dev children and
// `build --watch`'s spawned builds are covered without repeating it (they still pass it explicitly for
// invocations that bypass the shebang). Ctrl-C stays graceful: `bun run` waits for its child after
// forwarding the signal, so the orchestrator finishes its SIGTERM + grace teardown before the wrapper
// exits. Each command resolves its mode from flags and calls applyEnvMode (env-files.ts) to load the
// right-mode cascade BEFORE the user's engine file is imported. Invocations that bypass the shebang
// (Windows shims, `bun .../cli.js` directly) are detected via process.execArgv and handled by the
// env-files.ts legacy fallback.

import { Compiler } from '@point0/compiler'
import type { PointsScope } from '@point0/core'
import { Command } from 'commander'
import { default as nodePath, default as path } from 'node:path'
import { Analyzer, buildPointsFilter, ensureMetaPaths, resolveMetaImportPaths } from './analyzer.js'
import type { AnalyzerPointSelectOptions } from './analyzer.js'
import { stopAllDevTrees } from './devlock.js'
import { Engine } from './engine.js'
import { applyEnvMode } from './env-files.js'

const program = new Command()

program.name('point0').description('Point0 CLI').version('0.1.0').enablePositionalOptions()

const dictionary = {
  noGenerate: 'Skip files generation',
  enginePath: 'Path to engine file (absolute or relative to cwd)',
  mode: "NODE_ENV mode: 'production' | 'development' | 'test'. Decides which .env files apply (.env, .env.<mode>, .env.local, .env.<mode>.local) — values Bun pre-loaded for another mode are unloaded",
  modeProduction: 'Shorthand for --mode production',
  modeDevelopment: 'Shorthand for --mode development',
  modeTest: 'Shorthand for --mode test',
  env: 'Environment variables to define, name=value (--env name1=value1 --env name2=value2 ...); they override .env file values',
}
const parseCommaSeparatedOption = (value: string, previous: string[] = []): string[] => {
  previous.push(...value.split(','))
  return previous
}

type ModeFlagOptions = { mode?: string; production?: boolean; development?: boolean; test?: boolean }

// Resolve the mode flags (shorthand > --mode), same precedence the compile command always had.
const resolveModeFlag = (options: ModeFlagOptions): 'production' | 'development' | 'test' | undefined => {
  const mode = options.production
    ? 'production'
    : options.development
      ? 'development'
      : options.test
        ? 'test'
        : options.mode
  if (mode === undefined) {
    return undefined
  }
  if (mode !== 'production' && mode !== 'development' && mode !== 'test') {
    throw new Error(`Invalid --mode: ${mode}. Allowed values: production, development, test`)
  }
  return mode
}

program
  .command('dev')
  .description('Start development server and clients')
  .passThroughOptions() // forward anything after --
  .allowExcessArguments() // allow args after --
  .option('-G, --no-generate', dictionary.noGenerate)
  .option('--side <side>', "Serve only one side: 'server' or 'client'")
  .option('--scope <scope>', 'Serve only one scope')
  .option('-W, --no-watch', 'Disable file watching: do not restart the server or regenerate files on change')
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
    '--hot',
    'Server-side hot reload (bun-native dev): hot-swap edited points without restarting the server; cold files (the `@point0/core/cold` marker subtree, the boot entry) still restart. Experimental.',
  )
  .option(
    '--env <name_eq_value>',
    dictionary.env,
    (value, previous: string[] = []) => {
      previous.push(value)
      return previous
    },
    [],
  )
  .option('--mode <mode>', dictionary.mode)
  .action(
    async (options: {
      engine?: string
      entry?: string[]
      env?: string[]
      side?: 'server' | 'client' | undefined
      scope?: string | undefined
      generate?: boolean
      watch?: boolean | string[]
      hot?: boolean
      mode?: string
    }) => {
      const cwd = process.cwd()
      // Load the right-mode .env cascade BEFORE the user's engine file is imported — it reads
      // process.env at module scope.
      applyEnvMode({ cwd, flagMode: resolveModeFlag(options), envPairs: options.env, defaultMode: 'development' })
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
        serverHot: options.hot,
      })
    },
  )

program
  .command('prune')
  .description('Prune temporary directories')
  .action(async () => {
    applyEnvMode({ cwd: process.cwd(), defaultMode: 'development' })
    const { engine } = await Engine.findAndImportSelf({ cwd: process.cwd() })
    await engine.prune()
  })

program
  .command('stop')
  .description('Stop the running dev tree for this project (server + clients), via the dev lockfile')
  .action(async () => {
    // Runs against the current working directory — same anchor as `point0 dev`. Stops every dev tree of this folder
    // (there can be more than one, on different ports). Deliberately does not import the engine: stopping must work
    // even when the app's engine throws on import. Reports what actually happened: a lockfile is a claim, not proof —
    // a stale one (dead tree, reused PID, ports now held by someone else's process) is removed without killing
    // anything, and saying "stopped" for it would be a lie.
    const results = await stopAllDevTrees({ cwd: process.cwd() })
    const stopped = results.filter((result) => result.stopped)
    const staleCount = results.filter((result) => result.staleLockRemoved).length
    const staleNote = staleCount > 0 ? ` Removed ${staleCount} stale dev lockfile${staleCount === 1 ? '' : 's'}.` : ''
    if (stopped.length === 0) {
      console.info(`point0: no running dev server found for this project.${staleNote}`)
      return
    }
    const describe = (tree: (typeof stopped)[number]): string => {
      if (tree.orchestratorStopped) {
        const pidPart = tree.pid ? ` (pid ${tree.pid})` : ''
        const orphansPart =
          tree.orphansKilled.length > 0 ? `, also killed orphaned pids ${tree.orphansKilled.join(', ')}` : ''
        return `dev stopped${pidPart}${orphansPart}.`
      }
      // No live orchestrator — only its leftover children were found on the recorded ports and cleaned up.
      return `cleaned up ${tree.orphansKilled.length} orphaned dev process${tree.orphansKilled.length === 1 ? '' : 'es'} (pids ${tree.orphansKilled.join(', ')}) on ports ${tree.ports.join(', ')}.`
    }
    if (stopped.length === 1) {
      console.info(`point0: ${describe(stopped[0])}${staleNote}`)
      return
    }
    console.info(`point0: stopped ${stopped.length} dev trees:${staleNote}`)
    for (const tree of stopped) {
      console.info(`  - ${describe(tree)}`)
    }
  })

program
  .command('build')
  .description('Build server and clients')
  .option('--engine <path>', dictionary.enginePath)
  .option(
    '-w, --watch [glob]',
    "Watch files and rebuild on changes. With no value, watches the build entries' import graph (no glob needed); a glob value (comma-separated or repeated) is added on top of that, as is engine config's buildWatchGlob",
    parseCommaSeparatedOption,
  )
  .option('--side <side>', 'Build only one side: server or client')
  .option('--scope <scope>', 'Scope to build')
  .option('-G, --no-generate', dictionary.noGenerate)
  .option('-C, --no-clean', 'Do not clean build')
  .option('-P, --no-publicdir', 'Do not build publicdir')
  .option(
    '-k, --keep-alive',
    'Do not exit after the build: wait for Ctrl+C so long-lived build plugins (e.g. a bundle-analyzer server) keep running',
  )
  .option(
    '--env <name_eq_value>',
    dictionary.env,
    (value, previous: string[] = []) => {
      previous.push(value)
      return previous
    },
    [],
  )
  .option('--mode <mode>', dictionary.mode)
  .action(
    async (options: {
      engine?: string
      watch?: boolean | string[]
      side?: 'server' | 'client'
      scope?: string
      generate?: boolean
      clean?: boolean
      publicdir?: boolean
      keepAlive?: boolean
      env?: string[]
      mode?: string
    }) => {
      process.env.LOG_MODE = 'pretty'
      // Load the right-mode .env cascade (production by default for build) BEFORE the user's
      // engine file is imported — it reads process.env at module scope.
      applyEnvMode({
        cwd: process.cwd(),
        flagMode: resolveModeFlag(options),
        envPairs: options.env,
        defaultMode: 'production',
      })
      const { engine } = await Engine.findAndImportSelf({ engineFile: options.engine, cwd: process.cwd() })
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
        if (options.keepAlive) {
          // --keep-alive: don't exit. Long-lived build plugins (e.g. a bundle-analyzer server on
          // :8888) stay reachable until the user stops the process. A pending promise / signal
          // listener does NOT keep Bun's event loop alive on its own, so hold it open with a ref'd
          // timer; clear it and exit cleanly on Ctrl+C.
          const keepAlive = setInterval(() => {}, 1 << 30)
          await new Promise<void>((resolve) => {
            process.once('SIGINT', resolve)
            process.once('SIGTERM', resolve)
          })
          clearInterval(keepAlive)
          process.exit(0)
        }
        // Let the process exit naturally so build plugins can finish flushing (reports, telemetry,
        // streams) and output isn't truncated by an abrupt exit. Safety net: if some plugin leaves a
        // dangling handle, don't hang forever (e.g. in CI) — force-exit after a short grace period.
        setTimeout(() => process.exit(0), 5000).unref()
      }
    },
  )

program
  .command('generate')
  .description('Generate points and routes files')
  .option('-w, --watch', 'Watch for changes and regenerate')
  .option('--engine <path>', dictionary.enginePath)
  .action(async (options) => {
    applyEnvMode({ cwd: process.cwd(), defaultMode: 'development' })
    const { engine } = await Engine.findAndImportSelf({ engineFile: options.engine, cwd: process.cwd() })
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
  .option('--mode <mode>', dictionary.mode)
  .option('-b, --built', `Treat the engine as built (else POINT0_BUILT === 'true')`)
  .option('-p, --production', dictionary.modeProduction)
  .option('-d, --development', dictionary.modeDevelopment)
  .option('-t, --test', dictionary.modeTest)
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
      // Load the right-mode .env cascade before the engine module loads — downstream code reads it
      // at evaluation time. No reportEnvMode here: compile's stdout is the compiled code, keep it clean.
      applyEnvMode({ cwd, flagMode: resolveModeFlag(options), defaultMode: 'development' })
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
      const hmrOverride = options.hmr === true ? { hmrFix: true } : options.hmr === false ? { hmrFix: false } : {}
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
      applyEnvMode({ cwd, defaultMode: 'development' })
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
  .option('--parent-id <id>', 'Filter by parent id')
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
  .option('--parent-id <id>', 'Filter by parent id')
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
    const doc = docs.getDocOrUndefined(slug)
    if (!doc) {
      throw new Error(`No doc found for slug "${slug}".`)
    }
    console.info(doc.content)
  })

program.parse()

#!/usr/bin/env bun

import type { PointsScope } from '@point0/core'
import { Command } from 'commander'
import { Engine } from './engine.js'

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
  .option('-S, --no-server', 'Do not serve server, so serve only clients dev servers')
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
      server?: boolean
      generate?: boolean
      watch?: boolean
    }) => {
      // const { engine, engineFile } = await Engine.findAndImportSelf(options.engine)
      const cwd = process.cwd()
      const { engine } = await Engine.findAndImportSelf({ engineFile: options.engine, cwd })
      const dashDashIndex = process.argv.indexOf('--')
      const bunRunArgs = dashDashIndex === -1 ? [] : process.argv.slice(dashDashIndex + 1)
      const clientDevServersOnly = options.server === false
      const generateFiles = options.generate !== false
      const watch = options.watch !== false
      const entries = options.entry
      for (const env of options.env ?? []) {
        const [name, ...valueParts] = env.split('=')
        const value = valueParts.join('=')
        process.env[name] = value
      }
      await engine.dev({
        // engineFile,
        generateFiles,
        clientDevServersOnly,
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

program.parse()

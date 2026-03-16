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
    (value, previous: string[] = []) => {
      previous.push(...value.split(','))
      return previous
    },
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
  .option('-s, --scope <scope>', 'Scope to build')
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
  .action(async (options) => {
    process.env.NODE_ENV ??= 'production'
    const { engine } = await Engine.findAndImportSelf(options.engine)
    for (const env of options.env ?? []) {
      const [name, ...valueParts] = env.split('=')
      const value = valueParts.join('=')
      process.env[name] = value
    }
    await engine.build({
      generate: options.generate !== false,
      scope: options.scope as PointsScope,
      clean: options.clean !== false,
      publicdir: options.publicdir !== false,
    })
  })

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

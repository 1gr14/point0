#!/usr/bin/env bun

import type { PointsScope } from '@point0/core'
import { Command } from 'commander'
import { Engine } from './index.js'

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
    '-e, --entry <name|path>',
    'Server entry points, names or paths (-e <entry1>,<entry2>,...) or (-e <entry1> -e <entry2> ...)',
    (value, previous: string[] = []) => {
      previous.push(...value.split(','))
      return previous
    },
    [],
  )
  .option('--engine <path>', dictionary.enginePath)
  .action(
    async (options: { engine?: string; entry?: string[]; server?: boolean; generate?: boolean; watch?: boolean }) => {
      // const { engine, engineFile } = await Engine.findAndImportSelf(options.engine)
      const cwd = process.cwd()
      const { engine } = await Engine.findAndImportSelf({ engineFile: options.engine, cwd })
      const dashDashIndex = process.argv.indexOf('--')
      const bunRunArgs = dashDashIndex === -1 ? [] : process.argv.slice(dashDashIndex + 1)
      const clientDevServersOnly = options.server === false
      const generateFiles = options.generate !== false
      const watch = options.watch !== false
      const entries = options.entry
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
  .action(async (options) => {
    process.env.NODE_ENV ??= 'production'
    const { engine } = await Engine.findAndImportSelf(options.engine)
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

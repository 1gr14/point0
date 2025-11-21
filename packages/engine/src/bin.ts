#!/usr/bin/env bun

import { Command } from 'commander'
import { Engine } from './index.js'
import type { PointsScope } from '@point0/core/types'

const program = new Command()

program.name('point0').description('Point0 CLI').version('0.1.0')

const dictionary = {
  noGenerate: 'Skip files generation',
  enginePath: 'Path to engine file (absolute or relative to cwd)',
}

// program
//   .command('dev')
//   .description('Start development server and clients')
//   .option('-G, --no-generate', dictionary.noGenerate)
//   .option('-S, --no-server', 'Do not serve server, serve only clients dev servers')
//   .option('-e, --engine <path>', dictionary.enginePath)
//   .action(async (options) => {
//     process.env.NODE_ENV ??= 'development'
//     const engine = await Engine.findAndImportSelf(options.engine)
//     await engine.dev({ generate: options.generate !== false, server: options.server !== false })
//   })

program
  .command('dev')
  .description('Start development server and clients')
  .option('-G, --no-generate', dictionary.noGenerate)
  .option('-S, --no-server', 'Do not serve server, serve only clients dev servers')
  .option('-e, --engine <path>', dictionary.enginePath)
  .action(async (options) => {
    process.env.NODE_ENV ??= 'development'
    const engine = await Engine.findAndImportSelf(options.engine)
    // await engine.dev({ generate: options.generate !== false, server: options.server !== false })
    const serverEntryHotRuns: Array<Promise<any>> =
      options.server !== false && engine.server.entry
        ? Object.values(engine.server.entry).map(
            async (entry) => await Bun.$`POINT0_PREVENT_BUN_DEV_CLIENT_SERVE=true bun run --hot ${entry}`,
          )
        : []
    const clientsDevSevers = engine.init()
    const generatorProcess = options.generate !== false ? engine.generateWatch() : null
    await Promise.all([...(generatorProcess ? [generatorProcess] : []), ...serverEntryHotRuns, clientsDevSevers])
  })

program
  .command('build')
  .description('Build server and clients')
  .option('-e, --engine <path>', dictionary.enginePath)
  .option('-t, --target <target>', 'Target to build')
  .option('-s, --scope <scope>', 'Scope to build')
  .option('-G, --no-generate', dictionary.noGenerate)
  .option('-C, --no-clean', 'Do not clean build')
  .option('-P, --no-publicdir', 'Do not build publicdir')
  .action(async (options) => {
    process.env.NODE_ENV ??= 'production'
    const engine = await Engine.findAndImportSelf(options.engine)
    await engine.build({
      generate: options.generate !== false,
      target: options.target as 'client' | 'server',
      scope: options.scope as PointsScope,
      clean: options.clean !== false,
      publicdir: options.publicdir !== false,
    })
  })

program
  .command('generate')
  .description('Generate points and routes files')
  .option('-w, --watch', 'Watch for changes and regenerate')
  .option('-e, --engine <path>', dictionary.enginePath)
  .action(async (options) => {
    const engine = await Engine.findAndImportSelf(options.engine)
    if (options.watch) {
      await engine.generateWatch()
    } else {
      await engine.generate()
    }
  })

program.parse()

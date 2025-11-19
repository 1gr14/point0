#!/usr/bin/env bun

import { Command } from 'commander'
import { Engine } from './index.js'

const program = new Command()

program.name('point0').description('Point0 CLI').version('0.1.0')

const dictionary = {
  noGenerate: 'Skip files generation',
  enginePath: 'Path to engine file (absolute or relative to cwd)',
}

program
  .command('dev')
  .description('Start development server and clients')
  .option('-G, --no-generate', dictionary.noGenerate)
  .option('-S, --no-server', 'Do not serve server, serve only clients dev servers')
  .option('-e, --engine <path>', dictionary.enginePath)
  .action(async (options) => {
    const engine = await Engine.findAndImportSelf(options.engine)
    await engine.dev({ noGenerate: options.generate === false, noServer: options.server === false })
  })

program
  .command('build')
  .description('Build server and clients')
  .option('-G, --no-generate', dictionary.noGenerate)
  .option('-e, --engine <path>', dictionary.enginePath)
  .action(async (options) => {
    const engine = await Engine.findAndImportSelf(options.engine)
    await engine.build({ noGenerate: options.generate === false })
    process.exit(0)
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
      process.exit(0)
    }
  })

program.parse()

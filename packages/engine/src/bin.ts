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
  // do NOT call allowUnknownOption()
  .option('-G, --no-generate', dictionary.noGenerate)
  .option('-S, --no-server', 'Do not serve server, serve only clients dev servers')
  .option('-H, --no-hot', 'Prevent --hot flag for bun run command')
  .option('-e, --engine <path>', dictionary.enginePath)
  .action(async (options) => {
    const hot = options.hot !== false
    const dashDashIndex = process.argv.indexOf('--')
    const extraArgs = dashDashIndex === -1 ? [] : process.argv.slice(dashDashIndex + 1)
    process.env.NODE_ENV ??= 'development'
    const engine = await Engine.findAndImportSelf(options.engine)
    const generatorProcess = options.generate !== false ? engine.generateWatch() : null
    const withServer = options.server !== false && !!engine.server.entry
    if (withServer) {
      // cancel. we still want separate client dev servers, to prevent hmr conflicts
      // const entriesPaths = Object.values(engine.server.entry || [])
      // if (entriesPaths.length === 1) {
      //   const serverEntryHotRunWithClientDevServers = Bun.$`${['bun', 'run', hot ? '--hot' : '', ...extraArgs, entriesPaths[0]]}`
      //   await Promise.all([generatorProcess, serverEntryHotRunWithClientDevServers])
      // } else {
      // here we run server entries which already serving server, but prevent multiple client dev servers, so we do not run it here
      const serverEntryHotRuns: Array<Promise<any>> = Object.values(engine.server.entry || []).map(async (entry) => {
        return await Bun.$`POINT0_PREVENT_CLIENT_DEV_SERVER=true bun run ${hot ? '--hot' : ''} ${extraArgs.join(' ')} ${entry}`
      })
      // and here we rung one instance of client dev servers per each client
      const clientsDevSevers = engine.serveClientDevServers()
      await Promise.all([generatorProcess, ...serverEntryHotRuns, clientsDevSevers])
      // }
    } else {
      await Promise.all([generatorProcess, engine.init()])
    }
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

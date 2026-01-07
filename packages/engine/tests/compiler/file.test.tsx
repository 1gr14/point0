import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { CompilerFile } from '../../src/compiler/file.js'

type TestFile = Bun.BunFile & {
  path: string
  basename: string
  importpath: string
  cf: CompilerFile<false>
  wrp: (content: string) => Promise<CompilerFile<true>>
}

const tempDir = nodePath.join(__dirname, 'temp/file')

const prepareRandomFile = (): TestFile => {
  const basename = crypto.randomUUID()
  const path = nodePath.join(tempDir, basename + '.tsx')
  const importpath = './' + basename + '.js'
  const cf: CompilerFile<false> = CompilerFile.create(path)
  const bunFile = Bun.file(path)
  // write, read, parse
  const wrp = async (content: string) => {
    await bunFile.write(content)
    await cf.read()
    cf.assertRead()
    return cf
  }
  return Object.assign(bunFile, { path, basename, importpath, cf, wrp })
}

const helper = (callback: ({ files }: { files: TestFile[] }) => any, deleteFiles = true) => {
  return async () => {
    const files = Array.from({ length: 11 }, prepareRandomFile)
    try {
      await callback({
        files,
      })
    } finally {
      await Promise.allSettled(
        files.map(async (file) => {
          if (deleteFiles) await file.delete()
        }),
      )
    }
  }
}

describe('CompilerFile', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  const prefix = `const runtime=require('@point0/runtime');`

  describe('#shakeForRuntimeTarget', () => {
    it.concurrent(
      'runtime.is.server = true',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} if (runtime.is.server) console.info('server')`)
        cf.shakeForRuntimeTarget({ target: 'server' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');if (true) console.info('server');"`,
        )
      }),
    )

    it.concurrent(
      'runtime.is.server = false',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} if (runtime.is.server) console.info('server')`)
        cf.shakeForRuntimeTarget({ target: 'client' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');if (false) console.info('server');"`,
        )
      }),
    )

    it.concurrent(
      'runtime.is.client = true',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} if (runtime.is.client) console.info('client')`)
        cf.shakeForRuntimeTarget({ target: 'client' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');if (true) console.info('client');"`,
        )
      }),
    )

    it.concurrent(
      'runtime.is.client = false',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} if (runtime.is.client) console.info('client')`)
        cf.shakeForRuntimeTarget({ target: 'server' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');if (false) console.info('client');"`,
        )
      }),
    )

    it.concurrent(
      'runtime.is.ssr not changed',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} if (runtime.is.ssr) console.info('ssr')`)
        cf.shakeForRuntimeTarget({ target: 'client' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');if (runtime.is.ssr) console.info('ssr');"`,
        )
      }),
    )

    it.concurrent(
      'runtime.call.server() - client target replaces callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} runtime.call.server(() => console.info('server'))`)
        cf.shakeForRuntimeTarget({ target: 'client' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');runtime.call.server(() => {throw new Error("Call server function from client");});"`,
        )
      }),
    )

    it.concurrent(
      'runtime.call.server() - server target keeps callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} runtime.call.server(() => console.info('server'))`)
        cf.shakeForRuntimeTarget({ target: 'server' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');runtime.call.server(() => console.info('server'));"`,
        )
      }),
    )

    it.concurrent(
      'runtime.call.client() - server target replaces callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} runtime.call.client(() => console.info('client'))`)
        cf.shakeForRuntimeTarget({ target: 'server' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');runtime.call.client(() => {throw new Error("Call client function from server");});"`,
        )
      }),
    )

    it.concurrent(
      'runtime.call.client() - client target keeps callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} runtime.call.client(() => console.info('client'))`)
        cf.shakeForRuntimeTarget({ target: 'client' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');runtime.call.client(() => console.info('client'));"`,
        )
      }),
    )

    it.concurrent(
      'runtime.call() with server option - client target replaces callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(
          `${prefix} runtime.call({ server: () => console.info('server'), client: () => console.info('client') })`,
        )
        cf.shakeForRuntimeTarget({ target: 'client' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');runtime.call({ server: () => {throw new Error("Call server function from client");}, client: () => console.info('client') });"`,
        )
      }),
    )

    it.concurrent(
      'runtime.call() with client option - server target replaces callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(
          `${prefix} runtime.call({ server: () => console.info('server'), client: () => console.info('client') })`,
        )
        cf.shakeForRuntimeTarget({ target: 'server' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');runtime.call({ server: () => console.info('server'), client: () => {throw new Error("Call client function from server");} });"`,
        )
      }),
    )

    it.concurrent(
      'runtime.define.server() - client target replaces value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} const x = runtime.define.server('server-value')`)
        cf.shakeForRuntimeTarget({ target: 'client' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');const x = runtime.define.server(undefined);"`,
        )
      }),
    )

    it.concurrent(
      'runtime.define.server() - server target keeps value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} const x = runtime.define.server('server-value')`)
        cf.shakeForRuntimeTarget({ target: 'server' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');const x = runtime.define.server('server-value');"`,
        )
      }),
    )

    it.concurrent(
      'runtime.define.client() - server target replaces value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} const x = runtime.define.client('client-value')`)
        cf.shakeForRuntimeTarget({ target: 'server' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');const x = runtime.define.client(undefined);"`,
        )
      }),
    )

    it.concurrent(
      'runtime.define.client() - client target keeps value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} const x = runtime.define.client('client-value')`)
        cf.shakeForRuntimeTarget({ target: 'client' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');const x = runtime.define.client('client-value');"`,
        )
      }),
    )

    it.concurrent(
      'runtime.define() with server option - client target replaces value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(
          `${prefix} const x = runtime.define({ server: 'server-value', client: 'client-value' })`,
        )
        cf.shakeForRuntimeTarget({ target: 'client' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');const x = runtime.define({ server: undefined, client: 'client-value' });"`,
        )
      }),
    )

    it.concurrent(
      'runtime.define() with client option - server target replaces value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(
          `${prefix} const x = runtime.define({ server: 'server-value', client: 'client-value' })`,
        )
        cf.shakeForRuntimeTarget({ target: 'server' })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');const x = runtime.define({ server: 'server-value', client: undefined });"`,
        )
      }),
    )
  })

  describe('#shakeForEngineHolderBuildPhase', () => {
    it.concurrent(
      'isEngineHolderBuildPhase = false does not modify code',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} shakeItOnEngineHolderBuildPhase(() => console.info('test'))`)
        cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase: false })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');shakeItOnEngineHolderBuildPhase(() => console.info('test'));"`,
        )
      }),
    )

    it.concurrent(
      'isEngineHolderBuildPhase = true replaces callback with throw',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} shakeItOnEngineHolderBuildPhase(() => console.info('test'))`)
        cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase: true })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');shakeItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});"`,
        )
      }),
    )

    it.concurrent(
      'isEngineHolderBuildPhase = true with no matching call does not modify code',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} console.info('test')`)
        cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase: true })
        expect(cf.toCode()).toMatchInlineSnapshot(`"const runtime = require('@point0/runtime');console.info('test');"`)
      }),
    )

    it.concurrent(
      'isEngineHolderBuildPhase = true replaces multiple callbacks',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(
          `${prefix} shakeItOnEngineHolderBuildPhase(() => console.info('test1')); shakeItOnEngineHolderBuildPhase(() => console.info('test2'))`,
        )
        cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase: true })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');shakeItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});shakeItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});"`,
        )
      }),
    )

    it.concurrent(
      'isEngineHolderBuildPhase = true with no arguments does not crash',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} shakeItOnEngineHolderBuildPhase()`)
        cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase: true })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');shakeItOnEngineHolderBuildPhase();"`,
        )
      }),
    )

    it.concurrent(
      'isEngineHolderBuildPhase = true replaces callback with complex body',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} shakeItOnEngineHolderBuildPhase(() => { const x = 1; return x + 2; })`)
        cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase: true })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const runtime = require('@point0/runtime');shakeItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});"`,
        )
      }),
    )
  })
})

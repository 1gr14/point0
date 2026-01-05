import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { CompilerFile } from '../../src/compiler/file.js'

type TestFile = Bun.BunFile & {
  path: string
  basename: string
  importpath: string
  cf: CompilerFile
  wrp: (content: string) => Promise<CompilerFile<'parsed'>>
}

const tempDir = nodePath.join(__dirname, 'temp/file')

const prepareRandomFile = (): TestFile => {
  const basename = crypto.randomUUID()
  const path = nodePath.join(tempDir, basename + '.tsx')
  const importpath = './' + basename + '.js'
  const cf = CompilerFile.create(path)
  const bunFile = Bun.file(path)
  // write, read, parse
  const wrp = async (content: string) => {
    await bunFile.write(content)
    await cf.read()
    return cf.parse()
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

  describe('#pruneForRuntimeTarget', () => {
    it.concurrent(
      'runtime.is.server = true',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`if (runtime.is.server) console.log('server')`)
        cf.pruneForRuntimeTarget('server')
        expect(cf.toCode()).toMatchInlineSnapshot(`"if (true) console.log('server');"`)
      }),
    )

    it.concurrent(
      'runtime.is.server = false',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`if (runtime.is.server) console.log('server')`)
        cf.pruneForRuntimeTarget('client')
        expect(cf.toCode()).toMatchInlineSnapshot(`"if (false) console.log('server');"`)
      }),
    )

    it.concurrent(
      'runtime.is.client = true',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`if (runtime.is.client) console.log('client')`)
        cf.pruneForRuntimeTarget('client')
        expect(cf.toCode()).toMatchInlineSnapshot(`"if (true) console.log('client');"`)
      }),
    )

    it.concurrent(
      'runtime.is.client = false',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`if (runtime.is.client) console.log('client')`)
        cf.pruneForRuntimeTarget('server')
        expect(cf.toCode()).toMatchInlineSnapshot(`"if (false) console.log('client');"`)
      }),
    )

    it.concurrent(
      'runtime.is.ssr not changed',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`if (runtime.is.ssr) console.log('ssr')`)
        cf.pruneForRuntimeTarget('client')
        expect(cf.toCode()).toMatchInlineSnapshot(`"if (runtime.is.ssr) console.log('ssr');"`)
      }),
    )

    it.concurrent(
      'runtime.call.server() - client target replaces callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`runtime.call.server(() => console.log('server'))`)
        cf.pruneForRuntimeTarget('client')
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"runtime.call.server(() => {throw new Error("Call server function from client");});"`,
        )
      }),
    )

    it.concurrent(
      'runtime.call.server() - server target keeps callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`runtime.call.server(() => console.log('server'))`)
        cf.pruneForRuntimeTarget('server')
        expect(cf.toCode()).toMatchInlineSnapshot(`"runtime.call.server(() => console.log('server'));"`)
      }),
    )

    it.concurrent(
      'runtime.call.client() - server target replaces callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`runtime.call.client(() => console.log('client'))`)
        cf.pruneForRuntimeTarget('server')
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"runtime.call.client(() => {throw new Error("Call client function from server");});"`,
        )
      }),
    )

    it.concurrent(
      'runtime.call.client() - client target keeps callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`runtime.call.client(() => console.log('client'))`)
        cf.pruneForRuntimeTarget('client')
        expect(cf.toCode()).toMatchInlineSnapshot(`"runtime.call.client(() => console.log('client'));"`)
      }),
    )

    it.concurrent(
      'runtime.call() with server option - client target replaces callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(
          `runtime.call({ server: () => console.log('server'), client: () => console.log('client') })`,
        )
        cf.pruneForRuntimeTarget('client')
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"runtime.call({ server: () => {throw new Error("Call server function from client");}, client: () => console.log('client') });"`,
        )
      }),
    )

    it.concurrent(
      'runtime.call() with client option - server target replaces callback',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(
          `runtime.call({ server: () => console.log('server'), client: () => console.log('client') })`,
        )
        cf.pruneForRuntimeTarget('server')
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"runtime.call({ server: () => console.log('server'), client: () => {throw new Error("Call client function from server");} });"`,
        )
      }),
    )

    it.concurrent(
      'runtime.define.server() - client target replaces value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`const x = runtime.define.server('server-value')`)
        cf.pruneForRuntimeTarget('client')
        expect(cf.toCode()).toMatchInlineSnapshot(`"const x = runtime.define.server(undefined);"`)
      }),
    )

    it.concurrent(
      'runtime.define.server() - server target keeps value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`const x = runtime.define.server('server-value')`)
        cf.pruneForRuntimeTarget('server')
        expect(cf.toCode()).toMatchInlineSnapshot(`"const x = runtime.define.server('server-value');"`)
      }),
    )

    it.concurrent(
      'runtime.define.client() - server target replaces value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`const x = runtime.define.client('client-value')`)
        cf.pruneForRuntimeTarget('server')
        expect(cf.toCode()).toMatchInlineSnapshot(`"const x = runtime.define.client(undefined);"`)
      }),
    )

    it.concurrent(
      'runtime.define.client() - client target keeps value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`const x = runtime.define.client('client-value')`)
        cf.pruneForRuntimeTarget('client')
        expect(cf.toCode()).toMatchInlineSnapshot(`"const x = runtime.define.client('client-value');"`)
      }),
    )

    it.concurrent(
      'runtime.define() with server option - client target replaces value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`const x = runtime.define({ server: 'server-value', client: 'client-value' })`)
        cf.pruneForRuntimeTarget('client')
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const x = runtime.define({ server: undefined, client: 'client-value' });"`,
        )
      }),
    )

    it.concurrent(
      'runtime.define() with client option - server target replaces value',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`const x = runtime.define({ server: 'server-value', client: 'client-value' })`)
        cf.pruneForRuntimeTarget('server')
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const x = runtime.define({ server: 'server-value', client: undefined });"`,
        )
      }),
    )
  })

  describe('#pruneForEngineHolderBuildPhase', () => {
    it.concurrent(
      'isBuildPhase = false does not modify code',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`pruneItOnEngineHolderBuildPhase(() => console.log('test'))`)
        cf.pruneForEngineHolderBuildPhase(false)
        expect(cf.toCode()).toMatchInlineSnapshot(`"pruneItOnEngineHolderBuildPhase(() => console.log('test'));"`)
      }),
    )

    it.concurrent(
      'isBuildPhase = true replaces callback with throw',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`pruneItOnEngineHolderBuildPhase(() => console.log('test'))`)
        cf.pruneForEngineHolderBuildPhase(true)
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"pruneItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});"`,
        )
      }),
    )

    it.concurrent(
      'isBuildPhase = true with no matching call does not modify code',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`console.log('test')`)
        cf.pruneForEngineHolderBuildPhase(true)
        expect(cf.toCode()).toMatchInlineSnapshot(`"console.log('test');"`)
      }),
    )

    it.concurrent(
      'isBuildPhase = true replaces multiple callbacks',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(
          `pruneItOnEngineHolderBuildPhase(() => console.log('test1')); pruneItOnEngineHolderBuildPhase(() => console.log('test2'))`,
        )
        cf.pruneForEngineHolderBuildPhase(true)
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"pruneItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});pruneItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});"`,
        )
      }),
    )

    it.concurrent(
      'isBuildPhase = true with no arguments does not crash',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`pruneItOnEngineHolderBuildPhase()`)
        cf.pruneForEngineHolderBuildPhase(true)
        expect(cf.toCode()).toMatchInlineSnapshot(`"pruneItOnEngineHolderBuildPhase();"`)
      }),
    )

    it.concurrent(
      'isBuildPhase = true replaces callback with complex body',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`pruneItOnEngineHolderBuildPhase(() => { const x = 1; return x + 2; })`)
        cf.pruneForEngineHolderBuildPhase(true)
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"pruneItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});"`,
        )
      }),
    )
  })
})

import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { CompilerFile } from '../src/file.js'
import { toText } from './utils.js'

type TestFile = Bun.BunFile & {
  path: string
  basename: string
  importpath: string
  cf: CompilerFile<false>
  wrp: (content: string | (() => any)) => Promise<CompilerFile<true>>
}

const tempDir = nodePath.join(__dirname, 'temp/file')

const prepareRandomFile = (): TestFile => {
  const basename = crypto.randomUUID()
  const path = nodePath.join(tempDir, basename + '.tsx')
  const importpath = './' + basename + '.js'
  const cf: CompilerFile<false> = CompilerFile.create(path)
  const bunFile = Bun.file(path)
  // write, read, parse
  const wrp = async (content: string | (() => any)) => {
    await bunFile.write(toText(content))
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

  const prefix = `const env=require('@point0/env');`

  describe('#shakeForEnv', () => {
    describe('env.target.is', () => {
      it.concurrent(
        'env.target.is.server = true',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/env')
            if (env.target.is.server) console.info('server')
          })
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');if (true) console.info('server');"`,
          )
        }),
      )

      it.concurrent(
        'env.target.is.server = false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} if (env.target.is.server) console.info('server')`)
          cf.shakeForEnv({ target: 'client', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');if (false) console.info('server');"`,
          )
        }),
      )

      it.concurrent(
        'env.target.is.client = true',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} if (env.target.is.client) console.info('client')`)
          cf.shakeForEnv({ target: 'client', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');if (true) console.info('client');"`,
          )
        }),
      )

      it.concurrent(
        'env.target.is.client = false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} if (env.target.is.client) console.info('client')`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');if (false) console.info('client');"`,
          )
        }),
      )

      it.concurrent(
        'env.target.is.ssr = false when target is client',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} if (env.target.is.ssr) console.info('ssr')`)
          cf.shakeForEnv({ target: 'client', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');if (false) console.info('ssr');"`,
          )
        }),
      )

      it.concurrent(
        'env.target.is.ssr not changed when target is server',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} if (env.target.is.ssr) console.info('ssr')`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');if (env.target.is.ssr) console.info('ssr');"`,
          )
        }),
      )
    })

    describe('env.target.define', () => {
      it.concurrent(
        'env.target.define.server() - client target replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} const x = env.target.define.server('server-value')`)
          cf.shakeForEnv({ target: 'client', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const x = env.target.define.server(undefined);"`,
          )
        }),
      )

      it.concurrent(
        'env.target.define.server() - server target keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} const x = env.target.define.server('server-value')`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const x = env.target.define.server('server-value');"`,
          )
        }),
      )

      it.concurrent(
        'env.target.define.client() - server target replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} const x = env.target.define.client('client-value')`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const x = env.target.define.client(undefined);"`,
          )
        }),
      )

      it.concurrent(
        'env.target.define.client() - client target keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} const x = env.target.define.client('client-value')`)
          cf.shakeForEnv({ target: 'client', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const x = env.target.define.client('client-value');"`,
          )
        }),
      )

      it.concurrent(
        'env.target.define() with server option - client target replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(
            `${prefix} const x = env.target.define({ server: 'server-value', client: 'client-value' })`,
          )
          cf.shakeForEnv({ target: 'client', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const x = env.target.define({ server: undefined, client: 'client-value' });"`,
          )
        }),
      )

      it.concurrent(
        'env.target.define() with client option - server target replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(
            `${prefix} const x = env.target.define({ server: 'server-value', client: 'client-value' })`,
          )
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const x = env.target.define({ server: 'server-value', client: undefined });"`,
          )
        }),
      )

      it.concurrent(
        'env.target.define.unsafe.server() - client target replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} const x = env.target.define.unsafe.server('server-value')`)
          cf.shakeForEnv({ target: 'client', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const x = env.target.define.unsafe.server(undefined);"`,
          )
        }),
      )

      it.concurrent(
        'env.target.define.unsafe.server() - server target keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} const x = env.target.define.unsafe.server('server-value')`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const x = env.target.define.unsafe.server('server-value');"`,
          )
        }),
      )

      it.concurrent(
        'env.target.define.unsafe.client() - server target replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} const x = env.target.define.unsafe.client('client-value')`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const x = env.target.define.unsafe.client(undefined);"`,
          )
        }),
      )

      it.concurrent(
        'env.target.define.unsafe.client() - client target keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} const x = env.target.define.unsafe.client('client-value')`)
          cf.shakeForEnv({ target: 'client', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const x = env.target.define.unsafe.client('client-value');"`,
          )
        }),
      )
    })

    describe('env.scope', () => {
      describe('env.scope.is', () => {
        it.concurrent(
          'env.scope.is.x = true when scope is x',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(`${prefix} if (env.scope.is.x) console.info('x')`)
            cf.shakeForEnv({ target: 'server', scope: 'x' })
            expect(cf.toCode()).toMatchInlineSnapshot(
              `"const env = require('@point0/env');if (true) console.info('x');"`,
            )
          }),
        )

        it.concurrent(
          'env.scope.is.x = false when scope is y',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(`${prefix} if (env.scope.is.x) console.info('x')`)
            cf.shakeForEnv({ target: 'server', scope: 'y' })
            expect(cf.toCode()).toMatchInlineSnapshot(
              `"const env = require('@point0/env');if (false) console.info('x');"`,
            )
          }),
        )
      })

      describe('env.scope.define', () => {
        it.concurrent(
          'env.scope.define.x() - scope y replaces value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(`${prefix} const x = env.scope.define.x('x-value')`)
            cf.shakeForEnv({ target: 'server', scope: 'y' })
            expect(cf.toCode()).toMatchInlineSnapshot(
              `"const env = require('@point0/env');const x = env.scope.define.x(undefined);"`,
            )
          }),
        )

        it.concurrent(
          'env.scope.define.x() - scope x keeps value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(`${prefix} const x = env.scope.define.x('x-value')`)
            cf.shakeForEnv({ target: 'server', scope: 'x' })
            expect(cf.toCode()).toMatchInlineSnapshot(
              `"const env = require('@point0/env');const x = env.scope.define.x('x-value');"`,
            )
          }),
        )

        it.concurrent(
          'env.scope.define() with x option - scope y replaces value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(`${prefix} const x = env.scope.define({ x: 'x-value', y: 'y-value' })`)
            cf.shakeForEnv({ target: 'server', scope: 'y' })
            expect(cf.toCode()).toMatchInlineSnapshot(
              `"const env = require('@point0/env');const x = env.scope.define({ x: undefined, y: 'y-value' });"`,
            )
          }),
        )

        it.concurrent(
          'env.scope.define() with y option - scope x replaces value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(`${prefix} const x = env.scope.define({ x: 'x-value', y: 'y-value' })`)
            cf.shakeForEnv({ target: 'server', scope: 'x' })
            expect(cf.toCode()).toMatchInlineSnapshot(
              `"const env = require('@point0/env');const x = env.scope.define({ x: 'x-value', y: undefined });"`,
            )
          }),
        )

        it.concurrent(
          'env.scope.define.unsafe.x() - scope y replaces value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(`${prefix} const x = env.scope.define.unsafe.x('x-value')`)
            cf.shakeForEnv({ target: 'server', scope: 'y' })
            expect(cf.toCode()).toMatchInlineSnapshot(
              `"const env = require('@point0/env');const x = env.scope.define.unsafe.x(undefined);"`,
            )
          }),
        )

        it.concurrent(
          'env.scope.define.unsafe.x() - scope x keeps value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(`${prefix} const x = env.scope.define.unsafe.x('x-value')`)
            cf.shakeForEnv({ target: 'server', scope: 'x' })
            expect(cf.toCode()).toMatchInlineSnapshot(
              `"const env = require('@point0/env');const x = env.scope.define.unsafe.x('x-value');"`,
            )
          }),
        )
      })
    })

    describe('env.vars', () => {
      it.concurrent(
        'env.vars.X replaced when X is in consts',
        helper(async ({ files: [file] }) => {
          process.env.CUSTOM_VAR = 'custom-value'
          const cf = await file.wrp(`${prefix} const x = env.vars.CUSTOM_VAR`)
          cf.shakeForEnv({ target: 'server', scope: 'test', consts: ['CUSTOM_VAR'] })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const x = "custom-value";"`)
          delete process.env.CUSTOM_VAR
        }),
      )

      it.concurrent(
        'env.vars.X not replaced when X is not in consts',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} const x = env.vars.OTHER_VAR`)
          cf.shakeForEnv({ target: 'server', scope: 'test', consts: ['CUSTOM_VAR'] })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const x = env.vars.OTHER_VAR;"`,
          )
        }),
      )

      it.concurrent(
        'env.vars.X replaced with undefined when not set in process.env',
        helper(async ({ files: [file] }) => {
          delete process.env.UNDEFINED_VAR
          const cf = await file.wrp(`${prefix} const x = env.vars.UNDEFINED_VAR`)
          cf.shakeForEnv({ target: 'server', scope: 'test', consts: ['UNDEFINED_VAR'] })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const x = undefined;"`)
        }),
      )

      it(
        'env.vars.NODE_ENV always replaced (auto-added to consts)',
        helper(async ({ files: [file] }) => {
          const originalNodeEnv = process.env.NODE_ENV
          process.env.NODE_ENV = 'production'
          const cf = await file.wrp(`${prefix} const x = env.vars.NODE_ENV`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const x = "production";"`)
          if (originalNodeEnv) {
            process.env.NODE_ENV = originalNodeEnv
          } else {
            delete process.env.NODE_ENV
          }
        }),
      )

      it.concurrent(
        'env.vars with wildcard pattern SOMETHING_*',
        helper(async ({ files: [file] }) => {
          process.env.SOMETHING_A = 'value-a'
          process.env.SOMETHING_B = 'value-b'
          const cf = await file.wrp(
            `${prefix} const a = env.vars.SOMETHING_A; const b = env.vars.SOMETHING_B; const c = env.vars.OTHER_VAR`,
          )
          cf.shakeForEnv({ target: 'server', scope: 'test', consts: ['SOMETHING_*'] })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const a = "value-a";const b = "value-b";const c = env.vars.OTHER_VAR;"`,
          )
          delete process.env.SOMETHING_A
          delete process.env.SOMETHING_B
        }),
      )

      it(
        'env.vars.X replaced with forced string value from object consts',
        helper(async ({ files: [file] }) => {
          process.env.CUSTOM_VAR = 'original-value'
          const cf = await file.wrp(`${prefix} const x = env.vars.CUSTOM_VAR`)
          cf.shakeForEnv({ target: 'server', scope: 'test', consts: [{ CUSTOM_VAR: 'forced-value' }] })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const x = "forced-value";"`)
          delete process.env.CUSTOM_VAR
        }),
      )

      it(
        'env.vars.X replaced with forced number value from object consts',
        helper(async ({ files: [file] }) => {
          process.env.NUM_VAR = '123'
          const cf = await file.wrp(`${prefix} const x = env.vars.NUM_VAR`)
          cf.shakeForEnv({ target: 'server', scope: 'test', consts: [{ NUM_VAR: 42 }] })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const x = 42;"`)
          delete process.env.NUM_VAR
        }),
      )

      it(
        'env.vars.X replaced with forced boolean value from object consts',
        helper(async ({ files: [file] }) => {
          process.env.BOOL_VAR = 'false'
          const cf = await file.wrp(`${prefix} const x = env.vars.BOOL_VAR`)
          cf.shakeForEnv({ target: 'server', scope: 'test', consts: [{ BOOL_VAR: true }] })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const x = true;"`)
          delete process.env.BOOL_VAR
        }),
      )

      it(
        'env.vars.X replaced with null from object consts',
        helper(async ({ files: [file] }) => {
          process.env.NULL_VAR = 'some-value'
          const cf = await file.wrp(`${prefix} const x = env.vars.NULL_VAR`)
          cf.shakeForEnv({ target: 'server', scope: 'test', consts: [{ NULL_VAR: null }] })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const x = null;"`)
          delete process.env.NULL_VAR
        }),
      )

      it(
        'env.vars.X replaced with undefined from object consts',
        helper(async ({ files: [file] }) => {
          process.env.UNDEFINED_VAR = 'some-value'
          const cf = await file.wrp(`${prefix} const x = env.vars.UNDEFINED_VAR`)
          cf.shakeForEnv({ target: 'server', scope: 'test', consts: [{ UNDEFINED_VAR: undefined }] })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const x = undefined;"`)
          delete process.env.UNDEFINED_VAR
        }),
      )

      it(
        'env.vars with multiple object consts - last match wins',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`${prefix} const x = env.vars.MULTI_VAR`)
          cf.shakeForEnv({
            target: 'server',
            scope: 'test',
            consts: [{ MULTI_VAR: 'first' }, { MULTI_VAR: 'second' }],
          })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const x = "second";"`)
        }),
      )

      it(
        'env.vars with mixed string and object consts - object takes precedence if later',
        helper(async ({ files: [file] }) => {
          process.env.MIXED_VAR = 'from-env'
          const cf = await file.wrp(`${prefix} const x = env.vars.MIXED_VAR`)
          cf.shakeForEnv({
            target: 'server',
            scope: 'test',
            consts: ['MIXED_VAR', { MIXED_VAR: 'from-object' }],
          })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const x = "from-object";"`)
          delete process.env.MIXED_VAR
        }),
      )

      it(
        'env.vars with mixed string and object consts - string takes precedence if later',
        helper(async ({ files: [file] }) => {
          const originalValue = process.env.MIXED_VAR2
          process.env.MIXED_VAR2 = 'from-env'
          const cf = await file.wrp(`${prefix} const x = env.vars.MIXED_VAR2`)
          cf.shakeForEnv({
            target: 'server',
            scope: 'test',
            consts: [{ MIXED_VAR2: 'from-object' }, 'MIXED_VAR2'],
          })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const x = "from-env";"`)
          if (originalValue) {
            process.env.MIXED_VAR2 = originalValue
          } else {
            delete process.env.MIXED_VAR2
          }
        }),
      )

      it.concurrent(
        'env.vars with multiple vars in single object const',
        helper(async ({ files: [file] }) => {
          process.env.STR_VAR = 'original-str'
          process.env.NUM_VAR = 'original-num'
          const cf = await file.wrp(`${prefix} const s = env.vars.STR_VAR; const n = env.vars.NUM_VAR`)
          cf.shakeForEnv({
            target: 'server',
            scope: 'test',
            consts: [{ STR_VAR: 'forced-str', NUM_VAR: 999 }],
          })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');const s = "forced-str";const n = 999;"`,
          )
          delete process.env.STR_VAR
          delete process.env.NUM_VAR
        }),
      )
    })

    describe('env.mode', () => {
      it(
        'env.mode.name replaced with NODE_ENV',
        helper(async ({ files: [file] }) => {
          const originalNodeEnv = process.env.NODE_ENV
          process.env.NODE_ENV = 'production'
          const cf = await file.wrp(`${prefix} const mode = env.mode.name`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');const mode = "production";"`)
          if (originalNodeEnv) {
            process.env.NODE_ENV = originalNodeEnv
          } else {
            delete process.env.NODE_ENV
          }
        }),
      )

      it(
        'env.mode.is.production = true when NODE_ENV is production',
        helper(async ({ files: [file] }) => {
          const originalNodeEnv = process.env.NODE_ENV
          process.env.NODE_ENV = 'production'
          const cf = await file.wrp(`${prefix} if (env.mode.is.production) console.info('prod')`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');if (true) console.info('prod');"`,
          )
          if (originalNodeEnv) {
            process.env.NODE_ENV = originalNodeEnv
          } else {
            delete process.env.NODE_ENV
          }
        }),
      )

      it(
        'env.mode.is.production = false when NODE_ENV is development',
        helper(async ({ files: [file] }) => {
          const originalNodeEnv = process.env.NODE_ENV
          process.env.NODE_ENV = 'development'
          const cf = await file.wrp(`${prefix} if (env.mode.is.production) console.info('prod')`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');if (false) console.info('prod');"`,
          )
          if (originalNodeEnv) {
            process.env.NODE_ENV = originalNodeEnv
          } else {
            delete process.env.NODE_ENV
          }
        }),
      )

      it(
        'env.mode.is.development = true when NODE_ENV is development',
        helper(async ({ files: [file] }) => {
          const originalNodeEnv = process.env.NODE_ENV
          process.env.NODE_ENV = 'development'
          const cf = await file.wrp(`${prefix} if (env.mode.is.development) console.info('dev')`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');if (true) console.info('dev');"`,
          )
          if (originalNodeEnv) {
            process.env.NODE_ENV = originalNodeEnv
          } else {
            delete process.env.NODE_ENV
          }
        }),
      )

      it(
        'env.mode.is.test = true when NODE_ENV is test',
        helper(async ({ files: [file] }) => {
          const originalNodeEnv = process.env.NODE_ENV
          process.env.NODE_ENV = 'test'
          const cf = await file.wrp(`${prefix} if (env.mode.is.test) console.info('test')`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');if (true) console.info('test');"`,
          )
          if (originalNodeEnv) {
            process.env.NODE_ENV = originalNodeEnv
          } else {
            delete process.env.NODE_ENV
          }
        }),
      )

      it(
        'env.mode.is.test = false when NODE_ENV is production',
        helper(async ({ files: [file] }) => {
          const originalNodeEnv = process.env.NODE_ENV
          process.env.NODE_ENV = 'production'
          const cf = await file.wrp(`${prefix} if (env.mode.is.test) console.info('test')`)
          cf.shakeForEnv({ target: 'server', scope: 'test' })
          expect(cf.toCode()).toMatchInlineSnapshot(
            `"const env = require('@point0/env');if (false) console.info('test');"`,
          )
          if (originalNodeEnv) {
            process.env.NODE_ENV = originalNodeEnv
          } else {
            delete process.env.NODE_ENV
          }
        }),
      )
    })
  })

  describe('#shakeForEngineHolderBuildPhase', () => {
    it.concurrent(
      'isEngineHolderBuildPhase = false does not modify code',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} shakeItOnEngineHolderBuildPhase(() => console.info('test'))`)
        cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase: false })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const env = require('@point0/env');shakeItOnEngineHolderBuildPhase(() => console.info('test'));"`,
        )
      }),
    )

    it.concurrent(
      'isEngineHolderBuildPhase = true replaces callback with throw',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} shakeItOnEngineHolderBuildPhase(() => console.info('test'))`)
        cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase: true })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const env = require('@point0/env');shakeItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});"`,
        )
      }),
    )

    it.concurrent(
      'isEngineHolderBuildPhase = true with no matching call does not modify code',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} console.info('test')`)
        cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase: true })
        expect(cf.toCode()).toMatchInlineSnapshot(`"const env = require('@point0/env');console.info('test');"`)
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
          `"const env = require('@point0/env');shakeItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});shakeItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});"`,
        )
      }),
    )

    it.concurrent(
      'isEngineHolderBuildPhase = true with no arguments does not crash',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} shakeItOnEngineHolderBuildPhase()`)
        cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase: true })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const env = require('@point0/env');shakeItOnEngineHolderBuildPhase();"`,
        )
      }),
    )

    it.concurrent(
      'isEngineHolderBuildPhase = true replaces callback with complex body',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`${prefix} shakeItOnEngineHolderBuildPhase(() => { const x = 1; return x + 2; })`)
        cf.shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase: true })
        expect(cf.toCode()).toMatchInlineSnapshot(
          `"const env = require('@point0/env');shakeItOnEngineHolderBuildPhase(() => {throw new Error("Not available after build");});"`,
        )
      }),
    )
  })
})

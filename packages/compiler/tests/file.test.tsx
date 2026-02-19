import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { CompilerFile } from '../src/file.js'
import { Walker } from '../src/walker.js'
import { toText } from './utils.js'

type Awaitable<T> = T | Promise<T>
type WrapCallback = () => Awaitable<void>

type TestFile = Bun.BunFile & {
  path: string
  basename: string
  importpath: string
  cf: CompilerFile<false>
  wrp: (content: string | WrapCallback) => Promise<CompilerFile<true>>
  wrpsync: (content: string | WrapCallback) => Promise<CompilerFile<true>>
}

const tempDir = nodePath.join(__dirname, 'temp/file')

const prepareRandomFile = (walker: Walker): TestFile => {
  const basename = crypto.randomUUID()
  const path = nodePath.join(tempDir, basename + '.tsx')
  const importpath = './' + basename + '.js'
  const cf: CompilerFile<false> = CompilerFile.create({ walker, file: path })
  const bunFile = Bun.file(path)
  // write, read, parse
  const wrp = async (content: string | WrapCallback) => {
    await bunFile.write(await toText(content))
    await cf.readAsync(true)
    cf.assertHasContent()
    return cf
  }
  const wrpsync = async (content: string | WrapCallback) => {
    await bunFile.write(await toText(content))
    cf.readSync(true)
    cf.assertHasContent()
    return cf
  }
  return Object.assign(bunFile, { path, basename, importpath, cf, wrp, wrpsync })
}

const helper = (callback: ({ files }: { files: TestFile[] }) => Awaitable<void>, preserve = false) => {
  return async () => {
    const walker = new Walker({ routes: undefined })
    const files = Array.from({ length: 11 }, () => prepareRandomFile(walker))
    try {
      await callback({
        files,
      })
    } finally {
      await Promise.allSettled(
        files.map(async (file) => {
          if (!preserve) await file.delete()
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

  describe('#shakeForEnv', () => {
    describe('env.side.is', () => {
      it.concurrent(
        'env.side.is.server = true',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.side.is.server) console.info('server')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (true) console.info('server')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.is.server = false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.side.is.server) console.info('server')
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (false) console.info('server')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.is.client = true',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.side.is.client) console.info('client')
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (true) console.info('client')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.is.client = false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrpsync(async () => {
            const { env } = await import('@point0/core')
            if (env.side.is.client) console.info('client')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (false) console.info('client')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.is.ssr = false when side is client',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.side.is.ssr) console.info('ssr')
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (false) console.info('ssr')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.is.ssr not changed when side is server',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrpsync(async () => {
            const { env } = await import('@point0/core')
            if (env.side.is.ssr) console.info('ssr')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (env.side.is.ssr) console.info('ssr')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.is.server = true (env imported from different source)',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            // @ts-expect-error - testing with non-existent module
            const { _point0_env } = await import('./custom-env.js')
            if (_point0_env.side.is.server) console.info('server')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { _point0_env } = await import('./custom-env.js')
              if (true) console.info('server')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.is.client = true (env imported from different source)',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            // @ts-expect-error - testing with non-existent module
            const { _point0_env } = await import('@some/other-package')
            if (_point0_env.side.is.client) console.info('client')
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { _point0_env } = await import('@some/other-package')
              if (true) console.info('client')
              "
            `,
          )
        }),
      )
    })

    describe('env.build', () => {
      it.concurrent(
        'env.build.was = true',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.build.was) console.info('built')
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development', built: true })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (true) console.info('built')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.build.was = false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.build.was) console.info('built')
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development', built: false })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (false) console.info('built')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.build.was = true (env imported from different source)',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            // @ts-expect-error - testing with non-existent module
            const { _point0_env } = await import('./custom-env.js')
            if (_point0_env.build.was) console.info('built')
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development', built: true })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { _point0_env } = await import('./custom-env.js')
              if (true) console.info('built')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.build.define() prunes before when built',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(
              env.build.define({
                before: 'before-value',
                after: 'after-value',
              }),
            )
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development', built: true })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('after-value')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.build.define() with only before option becomes undefined when built',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(
              env.build.define({
                before: 123,
              }),
            )
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development', built: true })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(undefined)
              "
            `,
          )
        }),
      )
    })

    describe('env.side.define', () => {
      it.concurrent(
        'env.side.define.server() - client side replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.server('server-value'))
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.side.define.server(undefined))
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.define.server() - server side keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrpsync(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.server('server-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.side.define.server('server-value'))
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.define.client() - server side replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.client('client-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.side.define.client(undefined))
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.define.client() - client side keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrpsync(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.client('client-value'))
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.side.define.client('client-value'))
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.define() with server option - client side replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define({ server: 'server-value', client: 'client-value' }))
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.side.define({ server: undefined, client: 'client-value' }))
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.define() with client option - server side replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrpsync(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define({ server: 'server-value', client: 'client-value' }))
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.side.define({ server: 'server-value', client: undefined }))
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.define.unsafe.server() - client side replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.unsafe.server('server-value'))
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.side.define.unsafe.server(undefined))
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.define.unsafe.server() - server side keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.unsafe.server('server-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.side.define.unsafe.server('server-value'))
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.define.unsafe.client() - server side replaces value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.unsafe.client('client-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.side.define.unsafe.client(undefined))
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.define.unsafe.client() - client side keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.unsafe.client('client-value'))
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.side.define.unsafe.client('client-value'))
              "
            `,
          )
        }),
      )
    })

    describe('superstore.define ssr config', () => {
      it.concurrent(
        'server side replaces hydrate with unavailable throw',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { superstore } = await import('@point0/core')
            superstore.define('x', () => 'value', {
              dehydrate: (value) => value,
              hydrate: (dehydratedValue) => dehydratedValue,
            })
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { superstore } = await import('@point0/core')
              superstore.define('x', () => 'value', {
                dehydrate: (value) => value,
                hydrate: () => {
                  throw new Error('Not available on server')
                },
              })
              "
            `,
          )
        }),
      )

      it.concurrent(
        'client side replaces dehydrate with unavailable throw',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { superstore } = await import('@point0/core')
            superstore.define('x', () => 'value', {
              dehydrate: (value) => value,
              hydrate: (dehydratedValue) => dehydratedValue,
            })
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { superstore } = await import('@point0/core')
              superstore.define('x', () => 'value', {
                dehydrate: () => {
                  throw new Error('Not available on client')
                },
                hydrate: (dehydratedValue) => dehydratedValue,
              })
              "
            `,
          )
        }),
      )

      it.concurrent(
        'side false keeps both dehydrate and hydrate unchanged',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { superstore } = await import('@point0/core')
            superstore.define('x', () => 'value', {
              dehydrate: (value) => value,
              hydrate: (dehydratedValue) => dehydratedValue,
            })
          })
          cf.shakeForEnv({ side: false, scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { superstore } = await import('@point0/core')
              superstore.define('x', () => 'value', {
                dehydrate: (value) => value,
                hydrate: (dehydratedValue) => dehydratedValue,
              })
              "
            `,
          )
        }),
      )
    })

    describe('env.scope', () => {
      describe('env.scope.is', () => {
        it.concurrent(
          'env.scope.is.x = true when scope is x',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              const { env } = await import('@point0/core')
              if (env.scope.is.x) console.info('x')
            })
            cf.shakeForEnv({ side: 'server', scope: 'x', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { env } = await import('@point0/core')
                if (true) console.info('x')
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.is.x = false when scope is y',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              const { env } = await import('@point0/core')
              if (env.scope.is.x) console.info('x')
            })
            cf.shakeForEnv({ side: 'server', scope: 'y', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { env } = await import('@point0/core')
                if (false) console.info('x')
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.is.x = true when scope is x (env imported from different source)',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              // @ts-expect-error - testing with non-existent module
              const { _point0_env } = await import('./custom-env.js')
              if (_point0_env.scope.is.x) console.info('x')
            })
            cf.shakeForEnv({ side: 'server', scope: 'x', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { _point0_env } = await import('./custom-env.js')
                if (true) console.info('x')
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.is.x = false when scope is y (env imported from different source)',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              // @ts-expect-error - testing with non-existent module
              const { _point0_env } = await import('./custom-env.js')
              if (_point0_env.scope.is.x) console.info('x')
            })
            cf.shakeForEnv({ side: 'server', scope: 'y', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { _point0_env } = await import('./custom-env.js')
                if (false) console.info('x')
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.is.x = true when scope is x (env imported from @some/other-package)',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              // @ts-expect-error - testing with non-existent module
              const { _point0_env } = await import('@some/other-package')
              if (_point0_env.scope.is.x) console.info('x')
            })
            cf.shakeForEnv({ side: 'server', scope: 'x', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { _point0_env } = await import('@some/other-package')
                if (true) console.info('x')
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.is.x = false when scope is y (env imported from @some/other-package)',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              // @ts-expect-error - testing with non-existent module
              const { _point0_env } = await import('@some/other-package')
              if (_point0_env.scope.is.x) console.info('x')
            })
            cf.shakeForEnv({ side: 'server', scope: 'y', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { _point0_env } = await import('@some/other-package')
                if (false) console.info('x')
                "
              `,
            )
          }),
        )
      })

      describe('env.scope.define', () => {
        it.concurrent(
          'env.scope.define.x() - scope y replaces value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              const { env } = await import('@point0/core')
              console.info(env.scope.define.x('x-value'))
            })
            cf.shakeForEnv({ side: 'server', scope: 'y', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { env } = await import('@point0/core')
                console.info(undefined)
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.define.x() - scope x keeps value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              const { env } = await import('@point0/core')
              console.info(env.scope.define.x('x-value'))
            })
            cf.shakeForEnv({ side: 'server', scope: 'x', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { env } = await import('@point0/core')
                console.info('x-value')
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.define() with x option - scope y replaces value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              const { env } = await import('@point0/core')
              console.info(env.scope.define({ x: 'x-value', y: 'y-value' }))
            })
            cf.shakeForEnv({ side: 'server', scope: 'y', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { env } = await import('@point0/core')
                console.info('y-value')
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.define() with y option - scope x replaces value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              const { env } = await import('@point0/core')
              console.info(env.scope.define({ x: 'x-value', y: 'y-value' }))
            })
            cf.shakeForEnv({ side: 'server', scope: 'x', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { env } = await import('@point0/core')
                console.info('x-value')
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.define.unsafe.x() - scope y replaces value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              const { env } = await import('@point0/core')
              console.info(env.scope.define.unsafe.x('x-value'))
            })
            cf.shakeForEnv({ side: 'server', scope: 'y', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { env } = await import('@point0/core')
                console.info(undefined)
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.define.unsafe.x() - scope x keeps value',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              const { env } = await import('@point0/core')
              console.info(env.scope.define.unsafe.x('x-value'))
            })
            cf.shakeForEnv({ side: 'server', scope: 'x', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { env } = await import('@point0/core')
                console.info('x-value')
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.define.x() - scope y replaces value (env imported from different source)',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              // @ts-expect-error - testing with non-existent module
              const { _point0_env } = await import('./custom-env.js')
              console.info(_point0_env.scope.define.x('x-value'))
            })
            cf.shakeForEnv({ side: 'server', scope: 'y', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { _point0_env } = await import('./custom-env.js')
                console.info(undefined)
                "
              `,
            )
          }),
        )

        it.concurrent(
          'env.scope.define.x() - scope x keeps value (env imported from different source)',
          helper(async ({ files: [file] }) => {
            const cf = await file.wrp(async () => {
              // @ts-expect-error - testing with non-existent module
              const { _point0_env } = await import('@some/other-package')
              console.info(_point0_env.scope.define.x('x-value'))
            })
            cf.shakeForEnv({ side: 'server', scope: 'x', mode: 'development' })
            expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
              `
                "const { _point0_env } = await import('@some/other-package')
                console.info('x-value')
                "
              `,
            )
          }),
        )
      })
    })

    describe('env.vars', () => {
      it.concurrent(
        'env.vars.X replaced when X is in consts',
        helper(async ({ files: [file] }) => {
          process.env.CUSTOM_VAR1 = 'custom-value'
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.CUSTOM_VAR1)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', consts: ['CUSTOM_VAR1'] })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('custom-value')
              "
            `,
          )
          delete process.env.CUSTOM_VAR1
        }),
      )

      it.concurrent(
        'env.vars.X not replaced when X is not in consts',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.OTHER_VAR)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', consts: ['CUSTOM_VAR'] })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.vars.OTHER_VAR)
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.vars.X replaced with undefined when not set in process.env',
        helper(async ({ files: [file] }) => {
          delete process.env.UNDEFINED_VAR1
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.UNDEFINED_VAR1)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', consts: ['UNDEFINED_VAR1'] })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(undefined)
              "
            `,
          )
        }),
      )

      it(
        'env.vars.NODE_ENV always replaced with mode parameter (auto-added to consts)',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.NODE_ENV)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('development')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.vars with wildcard pattern SOMETHING_*',
        helper(async ({ files: [file] }) => {
          process.env.SOMETHING_A1 = 'value-a'
          process.env.SOMETHING_B1 = 'value-b'
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.SOMETHING_A1)
            console.info(env.vars.SOMETHING_B1)
            console.info(env.vars.OTHER_VAR)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', consts: ['SOMETHING_*'] })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('value-a')
              console.info('value-b')
              console.info(env.vars.OTHER_VAR)
              "
            `,
          )
          delete process.env.SOMETHING_A1
          delete process.env.SOMETHING_B1
        }),
      )

      it(
        'env.vars.X replaced with forced string value from object consts',
        helper(async ({ files: [file] }) => {
          process.env.CUSTOM_VAR = 'original-value'
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.CUSTOM_VAR)
          })
          cf.shakeForEnv({
            side: 'server',
            scope: 'test',
            mode: 'development',
            consts: [{ CUSTOM_VAR: 'forced-value' }],
          })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('forced-value')
              "
            `,
          )
          delete process.env.CUSTOM_VAR
        }),
      )

      it(
        'env.vars.X replaced with forced number value from object consts',
        helper(async ({ files: [file] }) => {
          process.env.NUM_VAR = '123'
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.NUM_VAR)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', consts: [{ NUM_VAR: 42 }] })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(42)
              "
            `,
          )
          delete process.env.NUM_VAR
        }),
      )

      it(
        'env.vars.X replaced with forced boolean value from object consts',
        helper(async ({ files: [file] }) => {
          process.env.BOOL_VAR = 'false'
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.BOOL_VAR)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', consts: [{ BOOL_VAR: true }] })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(true)
              "
            `,
          )
          delete process.env.BOOL_VAR
        }),
      )

      it(
        'env.vars.X replaced with null from object consts',
        helper(async ({ files: [file] }) => {
          process.env.NULL_VAR = 'some-value'
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.NULL_VAR)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', consts: [{ NULL_VAR: null }] })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(null)
              "
            `,
          )
          delete process.env.NULL_VAR
        }),
      )

      it(
        'env.vars.X replaced with undefined from object consts',
        helper(async ({ files: [file] }) => {
          process.env.UNDEFINED_VAR = 'some-value'
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.UNDEFINED_VAR)
          })
          cf.shakeForEnv({
            side: 'server',
            scope: 'test',
            mode: 'development',
            consts: [{ UNDEFINED_VAR: undefined }],
          })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(undefined)
              "
            `,
          )
          delete process.env.UNDEFINED_VAR
        }),
      )

      it(
        'env.vars with multiple object consts - last match wins',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.MULTI_VAR)
          })
          cf.shakeForEnv({
            side: 'server',
            scope: 'test',
            mode: 'development',
            consts: [{ MULTI_VAR: 'first' }, { MULTI_VAR: 'second' }],
          })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('second')
              "
            `,
          )
        }),
      )

      it(
        'env.vars with mixed string and object consts - object takes precedence if later',
        helper(async ({ files: [file] }) => {
          process.env.MIXED_VAR = 'from-env'
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.MIXED_VAR)
          })
          cf.shakeForEnv({
            side: 'server',
            scope: 'test',
            mode: 'development',
            consts: ['MIXED_VAR', { MIXED_VAR: 'from-object' }],
          })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('from-object')
              "
            `,
          )
          delete process.env.MIXED_VAR
        }),
      )

      it(
        'env.vars with mixed string and object consts - string takes precedence if later',
        helper(async ({ files: [file] }) => {
          const originalValue = process.env.MIXED_VAR2
          process.env.MIXED_VAR2 = 'from-env'
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.MIXED_VAR2)
          })
          cf.shakeForEnv({
            side: 'server',
            scope: 'test',
            mode: 'development',
            consts: [{ MIXED_VAR2: 'from-object' }, 'MIXED_VAR2'],
          })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('from-env')
              "
            `,
          )
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
          process.env.STR_VAR1 = 'original-str'
          process.env.NUM_VAR1 = 'original-num'
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.STR_VAR1)
            console.info(env.vars.NUM_VAR1)
          })
          cf.shakeForEnv({
            side: 'server',
            scope: 'test',
            mode: 'development',
            consts: [{ STR_VAR1: 'forced-str', NUM_VAR1: 999 }],
          })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('forced-str')
              console.info(999)
              "
            `,
          )
          delete process.env.STR_VAR1
          delete process.env.NUM_VAR1
        }),
      )

      it.concurrent(
        'env.vars.X replaced when X is in consts (env imported from different source)',
        helper(async ({ files: [file] }) => {
          process.env.CUSTOM_VAR2 = 'custom-value'
          const cf = await file.wrp(async () => {
            // @ts-expect-error - testing with non-existent module
            const { _point0_env } = await import('./custom-env.js')
            console.info(_point0_env.vars.CUSTOM_VAR2)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', consts: ['CUSTOM_VAR2'] })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { _point0_env } = await import('./custom-env.js')
              console.info('custom-value')
              "
            `,
          )
          delete process.env.CUSTOM_VAR2
        }),
      )

      it.concurrent(
        'env.vars.X replaced with forced value from object consts (env imported from different source)',
        helper(async ({ files: [file] }) => {
          process.env.CUSTOM_VAR3 = 'original-value'
          const cf = await file.wrp(async () => {
            // @ts-expect-error - testing with non-existent module
            const { _point0_env } = await import('@some/other-package')
            console.info(_point0_env.vars.CUSTOM_VAR3)
          })
          cf.shakeForEnv({
            side: 'server',
            scope: 'test',
            mode: 'development',
            consts: [{ CUSTOM_VAR3: 'forced-value' }],
          })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { _point0_env } = await import('@some/other-package')
              console.info('forced-value')
              "
            `,
          )
          delete process.env.CUSTOM_VAR3
        }),
      )
    })

    describe('env.mode', () => {
      it(
        'env.mode.name replaced with mode parameter',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.mode.name)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'production' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('production')
              "
            `,
          )
        }),
      )

      it(
        'env.mode.is.production = true when mode is production',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.mode.is.production) console.info('prod')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'production' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (true) console.info('prod')
              "
            `,
          )
        }),
      )

      it(
        'env.mode.is.production = false when mode is development',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.mode.is.production) console.info('prod')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (false) console.info('prod')
              "
            `,
          )
        }),
      )

      it(
        'env.mode.is.development = true when mode is development',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.mode.is.development) console.info('dev')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (true) console.info('dev')
              "
            `,
          )
        }),
      )

      it(
        'env.mode.is.test = true when mode is test',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.mode.is.test) console.info('test')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'test' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (true) console.info('test')
              "
            `,
          )
        }),
      )

      it(
        'env.mode.is.test = false when mode is production',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.mode.is.test) console.info('test')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'production' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (false) console.info('test')
              "
            `,
          )
        }),
      )

      it(
        'env.mode.name replaced with mode parameter (env imported from different source)',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            // @ts-expect-error - testing with non-existent module
            const { _point0_env } = await import('./custom-env.js')
            console.info(_point0_env.mode.name)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'production' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { _point0_env } = await import('./custom-env.js')
              console.info('production')
              "
            `,
          )
        }),
      )

      it(
        'env.mode.is.production = true when mode is production (env imported from different source)',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            // @ts-expect-error - testing with non-existent module
            const { _point0_env } = await import('@some/other-package')
            if (_point0_env.mode.is.production) console.info('prod')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'production' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { _point0_env } = await import('@some/other-package')
              if (true) console.info('prod')
              "
            `,
          )
        }),
      )

      it(
        'env.mode.is.development = true when mode is development (env imported from different source)',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            // @ts-expect-error - testing with non-existent module
            const { _point0_env } = await import('./custom-env.js')
            if (_point0_env.mode.is.development) console.info('dev')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { _point0_env } = await import('./custom-env.js')
              if (true) console.info('dev')
              "
            `,
          )
        }),
      )
    })

    describe('env.runtime', () => {
      it(
        'env.runtime.name replaced with runtime parameter',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.runtime.name)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', runtime: 'bun' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('bun')
              "
            `,
          )
        }),
      )

      it(
        'env.runtime.is.browser = true when runtime is browser',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.runtime.is.browser) console.info('browser')
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development', runtime: 'browser' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (true) console.info('browser')
              "
            `,
          )
        }),
      )

      it(
        'env.runtime.is.nodejs = false when runtime is browser',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.runtime.is.nodejs) console.info('node')
          })
          cf.shakeForEnv({ side: 'client', scope: 'test', mode: 'development', runtime: 'browser' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (false) console.info('node')
              "
            `,
          )
        }),
      )

      it(
        'env.runtime.define.browser() replaced with undefined when runtime is bun',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.runtime.define.browser('browser-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', runtime: 'bun' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(undefined)
              "
            `,
          )
        }),
      )

      it(
        'env.runtime.define() options pruned by runtime',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(
              env.runtime.define({
                browser: 'browser-value',
                bun: 'bun-value',
              }),
            )
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', runtime: 'bun' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('bun-value')
              "
            `,
          )
        }),
      )

      it(
        'env.runtime.define.unsafe.browser() replaced with undefined when runtime is bun',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.runtime.define.unsafe.browser('browser-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', runtime: 'bun' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(undefined)
              "
            `,
          )
        }),
      )

      it(
        'env.runtime.define.unsafe.bun() keeps value when runtime is bun',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.runtime.define.unsafe.bun('bun-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', runtime: 'bun' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('bun-value')
              "
            `,
          )
        }),
      )
    })

    describe('env.os', () => {
      it(
        'env.os.name replaced with os parameter',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.os.name)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', os: 'linux' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('linux')
              "
            `,
          )
        }),
      )

      it(
        'env.os.is.windows = true when os is windows',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.os.is.windows) console.info('win')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', os: 'windows' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (true) console.info('win')
              "
            `,
          )
        }),
      )

      it(
        'env.os.is.mac = false when os is linux',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.os.is.mac) console.info('mac')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', os: 'linux' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (false) console.info('mac')
              "
            `,
          )
        }),
      )

      it(
        'env.os.define.ios() replaced with undefined when os is linux',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.os.define.ios('ios-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', os: 'linux' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(undefined)
              "
            `,
          )
        }),
      )

      it(
        'env.os.define() options pruned by os',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(
              env.os.define({
                windows: 'win-value',
                linux: 'linux-value',
              }),
            )
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', os: 'linux' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('linux-value')
              "
            `,
          )
        }),
      )

      it(
        'env.os.define.unsafe.ios() replaced with undefined when os is linux',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.os.define.unsafe.ios('ios-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', os: 'linux' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(undefined)
              "
            `,
          )
        }),
      )

      it(
        'env.os.define.unsafe.linux() keeps value when os is linux',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.os.define.unsafe.linux('linux-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: 'development', os: 'linux' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('linux-value')
              "
            `,
          )
        }),
      )
    })

    describe('false values', () => {
      it.concurrent(
        'env.side.is.* not hardcoded when side is false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.side.is.client) console.info('client')
            if (env.side.is.server) console.info('server')
          })
          cf.shakeForEnv({ side: false, scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (env.side.is.client) console.info('client')
              if (env.side.is.server) console.info('server')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.define.* not hardcoded when side is false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.client('client-value'))
            console.info(env.side.define.server('server-value'))
          })
          cf.shakeForEnv({ side: false, scope: 'test', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.side.define.client('client-value'))
              console.info(env.side.define.server('server-value'))
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.scope.is.* not hardcoded when scope is false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.scope.is.x) console.info('x')
            if (env.scope.is.y) console.info('y')
          })
          cf.shakeForEnv({ side: 'server', scope: false, mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (env.scope.is.x) console.info('x')
              if (env.scope.is.y) console.info('y')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.scope.define.* not hardcoded when scope is false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.scope.define.x('x-value'))
            console.info(env.scope.define.y('y-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: false, mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.scope.define.x('x-value'))
              console.info(env.scope.define.y('y-value'))
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.mode.name not hardcoded when mode is false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.mode.name)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: false })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.mode.name)
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.mode.is.* not hardcoded when mode is false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.mode.is.production) console.info('prod')
            if (env.mode.is.development) console.info('dev')
            if (env.mode.is.test) console.info('test')
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: false })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (env.mode.is.production) console.info('prod')
              if (env.mode.is.development) console.info('dev')
              if (env.mode.is.test) console.info('test')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.vars.NODE_ENV not auto-added to consts when mode is false',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.vars.NODE_ENV)
          })
          cf.shakeForEnv({ side: 'server', scope: 'test', mode: false })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info(env.vars.NODE_ENV)
              "
            `,
          )
        }),
      )

      it.concurrent(
        'all false values - nothing hardcoded',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            if (env.side.is.client) console.info('client')
            if (env.scope.is.x) console.info('x')
            console.info(env.mode.name)
            console.info(env.runtime.name)
            console.info(env.os.name)
          })
          cf.shakeForEnv({ side: false, scope: false, mode: false, runtime: false, os: false })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              if (env.side.is.client) console.info('client')
              if (env.scope.is.x) console.info('x')
              console.info(env.mode.name)
              console.info(env.runtime.name)
              console.info(env.os.name)
              "
            `,
          )
        }),
      )
    })
  })

  describe('#shakeForBuiltEngine', () => {
    it.concurrent(
      'keeps port and hmrPort properties unchanged',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(` 
          const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              port: 3000,
              hmrPort: 3001,
            },
          })
        `)
        cf.shakeForBuiltEngine()
        expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
          `
          "const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              port: 3000,
              hmrPort: 3001,
            },
          })
          "
        `,
        )
      }),
    )

    it.concurrent(
      'replaces viteConfig with empty object',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`
          const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              viteConfig: '../vite.config.ts',
            },
          })
        `)
        cf.shakeForBuiltEngine()
        expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
          `
          "const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              viteConfig: {},
            },
          })
          "
        `,
        )
      }),
    )

    it.concurrent(
      'replaces bunBuildConfig with empty object',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(` 
          const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              bunBuildConfig: { target: 'bun' },
            },
          })
        `)
        cf.shakeForBuiltEngine()
        expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
          `
          "const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              bunBuildConfig: {},
            },
          })
          "
        `,
        )
      }),
    )

    it.concurrent(
      'replaces bunPlugins with empty array',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(` 
          const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              bunPlugins: [() => {}],
            },
          })
        `)
        cf.shakeForBuiltEngine()
        expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
          `
          "const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              bunPlugins: [],
            },
          })
          "
        `,
        )
      }),
    )

    it.concurrent(
      'handles multiple properties in server config',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(` 
          const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              port: 3000,
              viteConfig: {define: {x: 1}},
              bunPlugins: ['plugin'],
            },
          })
        `)
        cf.shakeForBuiltEngine()
        expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
          `
          "const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              port: 3000,
              viteConfig: {},
              bunPlugins: [],
            },
          })
          "
        `,
        )
      }),
    )

    it.concurrent(
      'handles properties in client config',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(` 
          const { Engine } = await import('@point0/engine')
          Engine.create({
            clients: [
              {
                port: 3000,
                viteConfig: '../vite.config.ts',
              },
            ],
          })
        `)
        cf.shakeForBuiltEngine()
        expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
          `
          "const { Engine } = await import('@point0/engine')
          Engine.create({
            clients: [
              {
                port: 3000,
                viteConfig: {},
              },
            ],
          })
          "
        `,
        )
      }),
    )

    it.concurrent(
      'adds import.meta.url as second argument if missing',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(` 
          const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {},
          })
        `)
        cf.shakeForBuiltEngine()
        expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
          `
          "const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {},
          })
          "
        `,
        )
      }),
    )

    it.concurrent(
      'does not add import.meta.url if second argument already exists',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(` 
          const { Engine } = await import('@point0/engine')
          Engine.create(
            {
              server: {},
            },
            'custom-url',
          )
        `)
        cf.shakeForBuiltEngine()
        expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
          `
          "const { Engine } = await import('@point0/engine')
          Engine.create(
            {
              server: {},
            },
            'custom-url',
          )
          "
        `,
        )
      }),
    )

    it.concurrent(
      'does not modify files without Engine.create',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(` 
          console.info('no Engine.create here')
        `)
        const originalContent = cf.content
        cf.shakeForBuiltEngine()
        expect(cf.content).toBe(originalContent)
        expect(cf.modified).toBe(false)
      }),
    )

    it.concurrent(
      'handles all properties together',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(` 
          const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              port: 3000,
              hmrPort: 3001,
              viteConfig: '../vite.config.ts',
              bunBuildConfig: { target: 'bun' },
              bunPlugins: [() => {}],
            },
            clients: [
              {
                port: 4000,
                hmrPort: 4001,
                viteConfig: '../vite.config.client.ts',
              },
            ],
          })
        `)
        cf.shakeForBuiltEngine()
        expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
          `
          "const { Engine } = await import('@point0/engine')
          Engine.create({
            server: {
              port: 3000,
              hmrPort: 3001,
              viteConfig: {},
              bunBuildConfig: {},
              bunPlugins: [],
            },
            clients: [
              {
                port: 4000,
                hmrPort: 4001,
                viteConfig: {},
              },
            ],
          })
          "
        `,
        )
      }),
    )
  })
})

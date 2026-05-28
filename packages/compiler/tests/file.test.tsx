import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Compiler } from '../src/compiler.js'
import { CompilerFile } from '../src/file.js'
import { parseImporterOptions, parseVirtualModulePath } from '../src/importer.js'
import { Walker } from '../src/walker.js'
import { toText } from './utils.js'

type TestFile = Bun.BunFile & {
  path: string
  basename: string
  importpath: string
  cf: CompilerFile<false>
  wrp: (content: string | (() => void)) => Promise<CompilerFile<true>>
  wrpsync: (content: string | (() => void)) => Promise<CompilerFile<true>>
}

const tempDir = nodePath.join(__dirname, 'temp/file')

const prepareRandomFile = (walker: Walker): TestFile => {
  const basename = crypto.randomUUID()
  const path = nodePath.join(tempDir, basename + '.tsx')
  const importpath = './' + basename + '.js'
  const cf: CompilerFile<false> = CompilerFile.create({ walker, file: path })
  const bunFile = Bun.file(path)
  // write, read, parse
  const wrp = async (content: string | (() => void)) => {
    await bunFile.write(await toText(content))
    cf.readSync(true)
    cf.assertHasContent()
    return cf
  }
  const wrpsync = async (content: string | (() => void)) => {
    await bunFile.write(await toText(content))
    cf.readSync(true)
    cf.assertHasContent()
    return cf
  }
  return Object.assign(bunFile, { path, basename, importpath, cf, wrp, wrpsync })
}

const helper = (
  callback: ({ files }: { files: TestFile[] }) => void | Promise<void>,
  { preserve = false, ssr = false }: { preserve?: boolean; ssr?: boolean } = {},
) => {
  return async () => {
    const walker = new Walker({ routes: undefined, ssr })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
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

    describe('ClientOnly', () => {
      it.concurrent(
        'replaces ClientOnly children with null on server side',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`
            import { ClientOnly } from '@point0/core'
            import { MyComponent } from './my-component.tsx'
            const x = (
              <ClientOnly fallback={<div>my-fallback</div>}>
                <div>client-only-content</div>
              </ClientOnly>
            )
            console.info(x)
          `)
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
          const output = await cf.toCompressedPrettyCode()
          expect(output).toMatchInlineSnapshot(`
            "import { ClientOnly } from '@point0/core'
            import { MyComponent } from './my-component.tsx'
            const x = <ClientOnly fallback={<div>my-fallback</div>}>{null}</ClientOnly>
            console.info(x)
            "
          `)
        }),
      )

      it.concurrent(
        'keeps ClientOnly children on client side',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(`
            const { ClientOnly } = await import('@point0/core')
            const x = (
              <ClientOnly fallback={<div>my-fallback</div>}>
                <div>client-only-content</div>
              </ClientOnly>
            )
            console.info(x)
          `)
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
          const output = await cf.toCompressedPrettyCode()
          expect(output).toMatchInlineSnapshot(`
            "const { ClientOnly } = await import('@point0/core')
            const x = (
              <ClientOnly fallback={<div>my-fallback</div>}>
                <div>client-only-content</div>
              </ClientOnly>
            )
            console.info(x)
            "
          `)
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development', built: true })
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development', built: false })
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development', built: true })
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development', built: true })
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development', built: true })
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
        'env.build.define() with nested env.side.define() applies nested transform',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(
              env.build.define({
                before: env.side.define.server('before-server-value'),
                after: env.side.define.client('after-client-value'),
              }),
            )
          })
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', built: true })
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
        'stress: combined define transforms resolve in fixed-point passes',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info({
              a: env.build.define({
                before: 'before-value',
                after: env.runtime.define.bun(
                  env.os.define.linux(env.scope.define.x(env.side.define.server('a-value'))),
                ),
              }),
              b: env.side.define({
                server: env.runtime.define.unsafe.bun('server-runtime'),
                client: env.runtime.define.browser('client-runtime'),
              }),
              c: env.scope.define({
                x: env.os.define.unsafe.linux('scope-os-unsafe'),
                y: env.os.define.ios('scope-os'),
              }),
              d: env.runtime.define({
                bun: env.build.define({
                  before: 'runtime-before',
                  after: env.scope.define.unsafe.x('runtime-build-scope'),
                }),
                browser: 'runtime-browser',
              }),
            })
          })
          cf.shakeForEnv({
            side: 'client',
            scope: 'x',
            mode: 'development',
            runtime: 'bun',
            os: 'linux',
            built: true,
          })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info({
                a: undefined,
                b: undefined,
                c: 'scope-os-unsafe',
                d: 'runtime-build-scope',
              })
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.build.define() resolves deeply nested chain (beyond 8 levels)',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(
              env.build.define({
                before: 'b0',
                after: env.build.define({
                  before: 'b1',
                  after: env.build.define({
                    before: 'b2',
                    after: env.build.define({
                      before: 'b3',
                      after: env.build.define({
                        before: 'b4',
                        after: env.build.define({
                          before: 'b5',
                          after: env.build.define({
                            before: 'b6',
                            after: env.build.define({
                              before: 'b7',
                              after: env.build.define({
                                before: 'b8',
                                after: env.build.define({
                                  before: 'b9',
                                  after: env.build.define({
                                    before: 'b10',
                                    after: env.build.define({
                                      before: 'b11',
                                      after: 'deep-final',
                                    }),
                                  }),
                                }),
                              }),
                            }),
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            )
          })
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development', built: true })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('deep-final')
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
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
        'env.side.define.server() - server side keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrpsync(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.server('server-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('server-value')
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
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
        'env.side.define.client() - client side keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrpsync(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.client('client-value'))
          })
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('client-value')
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('client-value')
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('server-value')
              "
            `,
          )
        }),
      )

      it.concurrent(
        'env.side.define() with missing selected branch becomes undefined',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define({ server: 'server-only' }))
          })
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
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
        'env.side.define() with string literal keys collapses correctly',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrpsync(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define({ server: 'server-value', client: 'client-value' }))
          })
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('server-value')
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
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
        'env.side.define.unsafe.server() - server side keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.unsafe.server('server-value'))
          })
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('server-value')
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
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
        'env.side.define.unsafe.client() - client side keeps value',
        helper(async ({ files: [file] }) => {
          const cf = await file.wrp(async () => {
            const { env } = await import('@point0/core')
            console.info(env.side.define.unsafe.client('client-value'))
          })
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { env } = await import('@point0/core')
              console.info('client-value')
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: false, scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', consts: ['CUSTOM_VAR1'] })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', consts: ['CUSTOM_VAR'] })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', consts: ['UNDEFINED_VAR1'] })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', consts: ['SOMETHING_*'] })
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
            scope: 'root',
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', consts: [{ NUM_VAR: 42 }] })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', consts: [{ BOOL_VAR: true }] })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', consts: [{ NULL_VAR: null }] })
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
            scope: 'root',
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
            scope: 'root',
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
            scope: 'root',
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
            scope: 'root',
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
            scope: 'root',
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', consts: ['CUSTOM_VAR2'] })
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
            scope: 'root',
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

    describe('processEnvAliases', () => {
      it.concurrent(
        'replaces values for all provided aliases (identifier and string-literal access)',
        helper(async ({ files: [file] }) => {
          process.env.SERVER_ALIAS_VAR = 'server-alias-value'
          process.env.CLIENT_ALIAS_VAR = 'client-alias-value'
          const cf = await file.wrp(async () => {
            // @ts-expect-error - testing with non-existent module
            const { serverEnv, clientEnv } = await import('@some/other-package')
            console.info(serverEnv.SERVER_ALIAS_VAR)
            console.info(clientEnv['CLIENT_ALIAS_VAR'])
          })
          cf.shakeForEnv({
            side: 'server',
            scope: 'root',
            mode: 'development',
            consts: ['SERVER_ALIAS_VAR', 'CLIENT_ALIAS_VAR'],
            processEnvAliases: ['serverEnv', 'clientEnv'],
          })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { serverEnv, clientEnv } = await import('@some/other-package')
              console.info('server-alias-value')
              console.info('client-alias-value')
              "
            `,
          )
          delete process.env.SERVER_ALIAS_VAR
          delete process.env.CLIENT_ALIAS_VAR
        }),
      )

      it.concurrent(
        'does not replace alias when it is not configured',
        helper(async ({ files: [file] }) => {
          process.env.UNCONFIGURED_ALIAS_VAR = 'unconfigured-alias-value'
          const cf = await file.wrp(async () => {
            // @ts-expect-error - testing with non-existent module
            const { serverEnv } = await import('./custom-env.js')
            console.info(serverEnv.UNCONFIGURED_ALIAS_VAR)
          })
          cf.shakeForEnv({
            side: 'server',
            scope: 'root',
            mode: 'development',
            consts: ['UNCONFIGURED_ALIAS_VAR'],
            processEnvAliases: ['clientEnv'],
          })
          expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
            `
              "const { serverEnv } = await import('./custom-env.js')
              console.info(serverEnv.UNCONFIGURED_ALIAS_VAR)
              "
            `,
          )
          delete process.env.UNCONFIGURED_ALIAS_VAR
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'production' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'production' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'test' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'production' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'production' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'production' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', runtime: 'bun' })
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development', runtime: 'browser' })
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
          cf.shakeForEnv({ side: 'client', scope: 'root', mode: 'development', runtime: 'browser' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', runtime: 'bun' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', runtime: 'bun' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', runtime: 'bun' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', runtime: 'bun' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', os: 'linux' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', os: 'windows' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', os: 'linux' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', os: 'linux' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', os: 'linux' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', os: 'linux' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: 'development', os: 'linux' })
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
          cf.shakeForEnv({ side: false, scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: false, scope: 'root', mode: 'development' })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: false })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: false })
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
          cf.shakeForEnv({ side: 'server', scope: 'root', mode: false })
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
      'replaces compiler with false (server/client/root)',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(`
          const { Engine } = await import('@point0/engine')
          Engine.create({
            compiler: { babel: ['babel-plugin-react-compiler'] },
            server: {
              compiler: { markdown: { format: 'md' } },
            },
            clients: [
              { compiler: { babel: ['react-compiler'] } },
            ],
          })
        `)
        cf.shakeForBuiltEngine()
        expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
          `
          "const { Engine } = await import('@point0/engine')
          Engine.create({
            compiler: false,
            server: {
              compiler: false,
            },
            clients: [
              {
                compiler: false,
              },
            ],
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
      'handles properties in client (many) config',
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
      'handles properties in client (one) config',
      helper(async ({ files: [file] }) => {
        const cf = await file.wrp(` 
          const { Engine } = await import('@point0/engine')
          Engine.create({
            client: {
              port: 3000,
              viteConfig: '../vite.config.ts',
            },
          })
        `)
        cf.shakeForBuiltEngine()
        expect(await cf.toCompressedPrettyCode()).toMatchInlineSnapshot(
          `
          "const { Engine } = await import('@point0/engine')
          Engine.create({
            client: {
              port: 3000,
              viteConfig: {},
            },
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
                bunPlugins: [() => {}],
              },
            ],
            client: {
              port: 5000,
              hmrPort: 5001,
              viteConfig: '../vite.config.client.ts',
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
                bunPlugins: [],
              },
            ],
            client: {
              port: 5000,
              hmrPort: 5001,
              viteConfig: {},
              bunPlugins: [],
            },
          })
          "
        `,
        )
      }),
    )
  })

  describe('#collectImports', () => {
    const normalizeImports = (
      imports: Array<{ pathOriginal: string; pathResolved: string | undefined; exportNames: string[] }>,
    ): Array<{ pathOriginal: string; pathResolved: string | undefined; exportNames: string[] }> => {
      return [...imports]
        .map((entry) => ({
          pathOriginal: entry.pathOriginal,
          pathResolved: entry.pathResolved,
          exportNames: [...entry.exportNames].sort(),
        }))
        .sort((a, b) =>
          `${a.pathOriginal}::${a.pathResolved ?? ''}`.localeCompare(`${b.pathOriginal}::${b.pathResolved ?? ''}`),
        )
    }

    it.concurrent(
      'collects declared static named imports and excludes default import',
      helper(async ({ files: [fileA, fileB] }) => {
        const cf = await fileA.wrp(`
          import def, { usedA, usedB as aliasB, unusedC } from '${fileB.importpath}'
          console.info(usedA, aliasB, def)
        `)
        const result = cf.collectImports({ includeExportNames: true })
        const normalized = normalizeImports(result.imports)
        expect(result.ok).toBe(true)
        expect(normalized).toEqual(
          normalizeImports([
            {
              pathOriginal: fileB.importpath,
              pathResolved: nodePath.resolve(nodePath.dirname(fileA.path), fileB.importpath),
              exportNames: ['unusedC', 'usedA', 'usedB'],
            },
          ]),
        )
      }),
    )

    it.concurrent(
      'collects names from namespace import member usage',
      helper(async ({ files: [fileA, fileB] }) => {
        const cf = await fileA.wrp(`
          import * as mod from '${fileB.importpath}'
          console.info(mod.alpha)
          console.info(mod['beta'])
          console.info(mod.default)
        `)
        const result = cf.collectImports({ includeExportNames: true })
        const normalized = normalizeImports(result.imports)
        expect(result.ok).toBe(true)
        expect(normalized).toEqual(
          normalizeImports([
            {
              pathOriginal: fileB.importpath,
              pathResolved: nodePath.resolve(nodePath.dirname(fileA.path), fileB.importpath),
              exportNames: ['alpha', 'beta'],
            },
          ]),
        )
      }),
    )

    it.concurrent(
      'collects await import destructuring and object member usage',
      helper(async ({ files: [fileA, fileB, fileC] }) => {
        const cf = await fileA.wrp(`
          const { one, two: localTwo, default: ignoredDefault } = await import('${fileB.importpath}')
          const mod = await import('${fileC.importpath}')
          console.info(one, localTwo, ignoredDefault, mod.three, mod['four'], mod.default)
        `)
        const result = cf.collectImports({ includeExportNames: true })
        const normalized = normalizeImports(result.imports)
        expect(result.ok).toBe(true)
        expect(normalized).toEqual(
          normalizeImports([
            {
              pathOriginal: fileB.importpath,
              pathResolved: nodePath.resolve(nodePath.dirname(fileA.path), fileB.importpath),
              exportNames: ['one', 'two'],
            },
            {
              pathOriginal: fileC.importpath,
              pathResolved: nodePath.resolve(nodePath.dirname(fileA.path), fileC.importpath),
              exportNames: ['four', 'three'],
            },
          ]),
        )
      }),
    )

    it.concurrent(
      'collects require destructuring, object and direct member usage',
      helper(async ({ files: [fileA, fileB, fileC, fileD] }) => {
        const cf = await fileA.wrp(`
          const { r1, r2: localR2, default: ignoredDefault } = require('${fileB.importpath}')
          const req = require('${fileC.importpath}')
          console.info(req.r3, req['r4'], req.default, localR2, ignoredDefault)
          console.info(require('${fileD.importpath}').r5)
          console.info(require('${fileD.importpath}')['r6'])
          console.info(r1)
        `)
        const result = cf.collectImports({ includeExportNames: true })
        const normalized = normalizeImports(result.imports)
        expect(result.ok).toBe(true)
        expect(normalized).toEqual(
          normalizeImports([
            {
              pathOriginal: fileB.importpath,
              pathResolved: nodePath.resolve(nodePath.dirname(fileA.path), fileB.importpath),
              exportNames: ['r1', 'r2'],
            },
            {
              pathOriginal: fileC.importpath,
              pathResolved: nodePath.resolve(nodePath.dirname(fileA.path), fileC.importpath),
              exportNames: ['r3', 'r4'],
            },
            {
              pathOriginal: fileD.importpath,
              pathResolved: nodePath.resolve(nodePath.dirname(fileA.path), fileD.importpath),
              exportNames: ['r5', 'r6'],
            },
          ]),
        )
      }),
    )

    it.concurrent(
      'keeps side-effect import empty and includes unused static names',
      helper(async ({ files: [fileA, fileB, fileC] }) => {
        const cf = await fileA.wrp(`
          import '${fileB.importpath}'
          import { UnusedA, UnusedB } from '${fileC.importpath}'
          console.info('ok')
        `)
        const result = cf.collectImports({ includeExportNames: true })
        const normalized = normalizeImports(result.imports)
        expect(result.ok).toBe(true)
        expect(normalized).toEqual(
          normalizeImports([
            {
              pathOriginal: fileB.importpath,
              pathResolved: nodePath.resolve(nodePath.dirname(fileA.path), fileB.importpath),
              exportNames: [],
            },
            {
              pathOriginal: fileC.importpath,
              pathResolved: nodePath.resolve(nodePath.dirname(fileA.path), fileC.importpath),
              exportNames: ['UnusedA', 'UnusedB'],
            },
          ]),
        )
      }),
    )

    it.concurrent(
      'merges repeated imports from same path and deduplicates names',
      helper(async ({ files: [fileA, fileB] }) => {
        const cf = await fileA.wrp(`
          import { a } from '${fileB.importpath}'
          import * as ns from '${fileB.importpath}'
          const req = require('${fileB.importpath}')
          const { c } = await import('${fileB.importpath}')
          console.info(a, ns.b, req.d, ns.b, c)
        `)
        const result = cf.collectImports({ includeExportNames: true })
        const normalized = normalizeImports(result.imports)
        expect(result.ok).toBe(true)
        expect(normalized).toEqual(
          normalizeImports([
            {
              pathOriginal: fileB.importpath,
              pathResolved: nodePath.resolve(nodePath.dirname(fileA.path), fileB.importpath),
              exportNames: ['a', 'b', 'c', 'd'],
            },
          ]),
        )
      }),
    )
  })

  describe('#replaceImportsWithVirtualModulesPaths', () => {
    it.concurrent(
      'rewrites all matched import source literals and marks file modified',
      helper(async ({ files: [fileA, fileB] }) => {
        const cf = await fileA.wrp(`
          import { a } from '${fileB.importpath}'
          const mod = await import('${fileB.importpath}')
          const req = require('${fileB.importpath}')
          console.info(a, mod.b, req.c)
        `)
        const before = await cf.toCompressedPrettyCode()
        const resolvedImportPath = nodePath.resolve(nodePath.dirname(fileA.path), fileB.importpath)
        const result = cf.applyImporter({
          importer: parseImporterOptions({
            mock: [resolvedImportPath],
          }),
          scope: 'root',
          side: 'client',
          compiler: Compiler.create({
            side: 'client',
            scope: 'root',
          }),
        })
        const after = await cf.toCompressedPrettyCode()
        expect(result.ok).toBe(true)
        expect(result.errors).toEqual([])
        expect(result.modified).toBe(true)
        expect(cf.modified).toBe(true)
        expect(before).toContain(fileB.importpath)
        expect(after).not.toContain(fileB.importpath)
        expect(after.match(/@point0\/virtual\?/g)?.length).toBe(3)
        expect(cf.imports).toHaveLength(1)
        expect(cf.imports[0]?.sourceNodePaths).toHaveLength(3)
        expect(cf.imports[0]?.virtualPath).toContain('@point0/virtual?')
      }),
    )

    it.concurrent(
      'does not rewrite when deny/mock patterns do not match',
      helper(async ({ files: [fileA, fileB] }) => {
        const cf = await fileA.wrp(`
          import { a } from '${fileB.importpath}'
          console.info(a)
        `)
        const before = await cf.toCompressedPrettyCode()
        const result = cf.applyImporter({
          importer: parseImporterOptions({
            mock: ['**/*.not-matching.ext'],
            deny: ['**/*.also-not-matching.ext'],
          }),
          scope: 'root',
          side: 'server',
          compiler: Compiler.create({
            side: 'server',
            scope: 'root',
          }),
        })
        const after = await cf.toCompressedPrettyCode()

        expect(result.ok).toBe(true)
        expect(result.errors).toEqual([])
        expect(result.modified).toBe(false)
        expect(cf.modified).toBe(false)
        expect(after).toEqual(before)
      }),
    )

    it.concurrent(
      'includes compact importer location metadata in deny virtual paths',
      helper(async ({ files: [fileA, fileB] }) => {
        const cwd = nodePath.dirname(fileA.path)
        const cf = await fileA.wrp(`
          import { a } from '${fileB.importpath}'
          const mod = await import('${fileB.importpath}')
          console.info(a, mod.b)
        `)

        const result = cf.applyImporter({
          importer: parseImporterOptions({
            cwd,
            deny: [fileB.importpath],
          }),
          scope: 'root',
          side: 'server',
          compiler: Compiler.create({
            side: 'server',
            scope: 'root',
          }),
        })
        const virtualPath = cf.imports[0]?.virtualPath
        expect(result.ok).toBe(true)
        expect(result.modified).toBe(true)
        expect(virtualPath).toBeDefined()

        const parsed = parseVirtualModulePath(virtualPath as string)
        expect(parsed.pathResolved).toBe(`${fileB.basename}.js`)
        expect(parsed.deny).toBe(fileB.importpath)
        expect(parsed.importer?.includes(`${fileA.basename}.tsx:`)).toBe(true)
        expect(parsed.importer?.startsWith('/')).toBe(false)
      }),
    )
  })

  describe('mdx', () => {
    it('defaultFilter matches md, mdx, mdc', () => {
      const filter = Compiler.defaultFilter
      expect(filter.test('/tmp/page.md')).toBe(true)
      expect(filter.test('/tmp/page.mdx')).toBe(true)
      expect(filter.test('/tmp/page.mdc')).toBe(true)
      expect(filter.test('/tmp/page.tsx')).toBe(true)
      expect(filter.test('/tmp/page.txt')).toBe(false)
    })

    it('compiles mdx and still runs env shake transforms', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
      })
      const result = compiler.compile({
        file: '/virtual/page.mdx',
        content: `
  import { env } from '@point0/core'
  
  # Test
  
  {env.side.is.client ? 'client' : 'server'}
        `,
      })

      expect(result.errors).toEqual([])
      expect(result.modified).toBe(true)
      expect(result.code).toContain('react/jsx-dev-runtime')
      expect(result.code).not.toContain('env.side.is.client')
      expect(result.code).toContain("'client'")
      expect(result.code).not.toContain("'server'")
    })

    it('compiles mdx and replaces ClientOnly children on server side', () => {
      const compiler = Compiler.create({
        side: 'server',
        scope: 'root',
        mode: 'development',
      })
      const result = compiler.compile({
        file: '/virtual/page.mdx',
        content: `
  import { ClientOnly } from '@point0/core'
  
  # Test
  
  <ClientOnly><span>client-only-content</span></ClientOnly>
        `,
      })

      expect(result.errors).toEqual([])
      expect(result.modified).toBe(true)
      expect(result.code).toContain('react/jsx-dev-runtime')
      expect(result.code).toContain('_jsxDEV(ClientOnly')
      // experimental_preserveFormat keeps original whitespace where it can; the substituted
      // `null` lands without space because the original `children: _jsxDEV(...)` arg got
      // replaced in-place using its own token span.
      expect(result.code).toContain('children: null')
      expect(result.code).not.toContain('client-only-content')
    })

    it('compiles .mdc extension', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
      })
      const result = compiler.compile({
        file: '/virtual/page.mdc',
        content: '# Hello from mdc',
      })

      expect(result.errors).toEqual([])
      expect(result.modified).toBe(true)
      expect(result.code).toContain('react/jsx-dev-runtime')
    })

    it('emits production jsx-runtime when compiled for a build (built: true)', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
        built: true,
      })
      const result = compiler.compile({
        file: '/virtual/page.mdx',
        content: '# Hello',
      })

      expect(result.errors).toEqual([])
      expect(result.modified).toBe(true)
      expect(result.code).toContain('react/jsx-runtime')
      expect(result.code).not.toContain('react/jsx-dev-runtime')
    })

    it('resolves a remark plugin passed as a string path', () => {
      const pluginPath = nodePath.resolve(__dirname, 'fixtures/test-remark-plugin.cjs')
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
        markdown: {
          remarkPlugins: [pluginPath as unknown as never],
        },
      })
      const result = compiler.compile({
        file: '/virtual/page.mdx',
        content: '# Hello',
      })

      expect(result.errors).toEqual([])
      expect(result.modified).toBe(true)
      // The fixture plugin prepends a paragraph with the marker text.
      expect(result.code).toContain('REMARK_PLUGIN_RAN')
    })

    it('resolves a remark plugin passed as a [string, options] tuple', () => {
      const pluginPath = nodePath.resolve(__dirname, 'fixtures/test-remark-plugin.cjs')
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
        markdown: {
          remarkPlugins: [[pluginPath, {}] as unknown as never],
        },
      })
      const result = compiler.compile({
        file: '/virtual/page.mdx',
        content: '# Hello',
      })

      expect(result.errors).toEqual([])
      expect(result.code).toContain('REMARK_PLUGIN_RAN')
    })

    // MARKDOWN
    it('exports frontmatter from mdc files', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
      })
      const result = compiler.compile({
        file: '/virtual/page.mdc',
        content: `---
zxc: 123
abc: Hello
---

# Hello from mdc`,
      })

      expect(result.errors).toEqual([])
      expect(result.modified).toBe(true)
      expect(result.code).toContain('export const frontmatter')
      expect(result.code).toContain('"zxc": 123')
      expect(result.code).toContain('"abc": "Hello"')
      expect(result.code).not.toContain('zxc: 123')
    })
  })

  describe('babel plugins', () => {
    it('runs user-provided babel plugin (react-compiler) on a tsx component', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
        babel: ['babel-plugin-react-compiler'],
      })
      const result = compiler.compile({
        file: '/virtual/Counter.tsx',
        content: `
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>
}
`,
      })

      expect(result.errors).toEqual([])
      expect(result.modified).toBe(true)
      // react-compiler injects an import from react/compiler-runtime
      // and rewrites the component to call its memo-cache helper.
      expect(result.code).toContain('react/compiler-runtime')
    })

    it('skips the babel pass entirely when no plugins/presets are configured', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
      })
      const result = compiler.compile({
        file: '/virtual/plain.tsx',
        content: `
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>
}
`,
      })

      expect(result.errors).toEqual([])
      expect(result.code).not.toContain('react/compiler-runtime')
    })
  })

  describe('chain-callback use-memo injection', () => {
    const pointSource = `
import { Point0 } from '@point0/core'
import { useState } from 'react'

const root = Point0.scope('root')

export const widget = root.lets
  .component<{ cta: string }>()
  .wrapper(({ children }) => {
    return <div>{children}</div>
  })
  .component(({ props }) => {
    const [count, setCount] = useState(0)
    return <button onClick={() => setCount(count + 1)}>{props.cta} {count}</button>
  })

export default root.lets
  .page('home', '/')
  .loader(async () => ({ value: 1 }))
  .page(({ data }) => {
    const [count, setCount] = useState(0)
    return <div onClick={() => setCount(count + 1)}>{data.value}/{count}</div>
  })
`

    it('injects "use memo" into chain callbacks when react-compiler is in babel (infer/default)', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
        babel: ['babel-plugin-react-compiler'],
      })
      expect(compiler.chainCallbackUseMemo).toBe(true)
      const result = compiler.compile({
        file: '/virtual/widget.tsx',
        content: pointSource,
      })
      expect(result.errors).toEqual([])
      // Plugin is kept and runs — generated bundle imports compiler-runtime.
      expect(result.code).toContain('react/compiler-runtime')
      // Chain callbacks for component-producing methods get the directive applied;
      // react-compiler then rewrites them, which leaves _c() / cache slots in the output.
      // (We assert behaviorally rather than searching for the literal string,
      // since react-compiler consumes the directive.)
      expect(result.code).toContain('_c')
    })

    it('strips the react-compiler plugin but still injects the directive when compilationMode is "point0"', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
        babel: [['babel-plugin-react-compiler', { compilationMode: 'point0' }]],
      })
      expect(compiler.chainCallbackUseMemo).toBe(true)
      // Plugin must be stripped from the actual babel list.
      expect(compiler.babel.plugins).toEqual([])
      const result = compiler.compile({
        file: '/virtual/widget.tsx',
        content: pointSource,
      })
      expect(result.errors).toEqual([])
      // Plugin is gone, so no compiler-runtime import.
      expect(result.code).not.toContain('react/compiler-runtime')
      // But the directives are present on the chain callbacks.
      expect(result.code).toContain('"use memo"')
    })

    it('does not inject when compilationMode is "all" (plugin compiles everything itself)', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
        babel: [['babel-plugin-react-compiler', { compilationMode: 'all' }]],
      })
      expect(compiler.chainCallbackUseMemo).toBe(false)
      const result = compiler.compile({
        file: '/virtual/widget.tsx',
        content: pointSource,
      })
      expect(result.errors).toEqual([])
      expect(result.code).not.toContain('"use memo"')
    })

    it('does not inject when react-compiler is absent from babel', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
      })
      expect(compiler.chainCallbackUseMemo).toBe(false)
      const result = compiler.compile({
        file: '/virtual/widget.tsx',
        content: pointSource,
      })
      expect(result.errors).toEqual([])
      expect(result.code).not.toContain('"use memo"')
    })

    it('does not touch non-component chain methods (loader, mutation, query)', () => {
      const compiler = Compiler.create({
        side: 'server',
        scope: 'root',
        mode: 'development',
        babel: [['babel-plugin-react-compiler', { compilationMode: 'point0' }]],
      })
      const result = compiler.compile({
        file: '/virtual/api.ts',
        content: `
import { Point0 } from '@point0/core'

const root = Point0.scope('root')

export const action = root.lets
  .mutation('doThing')
  .loader(async () => {
    return { ok: true }
  })
  .mutation(async () => {
    return { ok: true }
  })
`,
      })
      expect(result.errors).toEqual([])
      // None of loader / mutation should receive the directive — it's only for
      // component-producing methods.
      expect(result.code).not.toContain('"use memo"')
    })

    it('accepts "Point0" (mixed case) as the sentinel value', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
        babel: [['babel-plugin-react-compiler', { compilationMode: 'Point0' }]],
      })
      expect(compiler.chainCallbackUseMemo).toBe(true)
      expect(compiler.babel.plugins).toEqual([])
    })

    it('also matches the babel short-name form "react-compiler"', () => {
      const compiler = Compiler.create({
        side: 'client',
        scope: 'root',
        mode: 'development',
        babel: [['react-compiler', { compilationMode: 'point0' }]],
      })
      expect(compiler.chainCallbackUseMemo).toBe(true)
      expect(compiler.babel.plugins).toEqual([])
    })
  })
})

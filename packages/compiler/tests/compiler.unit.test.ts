import { beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Compiler } from '../src/compiler.js'
import { parseVirtualModulePath } from '../src/importer.js'
import { getHash, toPosixPath } from '../src/utils.js'
import { toText } from './utils.js'

// The whole file runs ~1s alone, but under the parallel runner (test-parallel.ts saturates every core) a single
// compile-heavy test can be starved past bun's 5s default — the babel-backed desugar tests were flaking on exactly
// that. Generous budget; the tests are fast, the machine under `testf`/`testa` is not.
setDefaultTimeout(30000)

type TestFile = Bun.BunFile & { path: string; basename: string; importpath: string }

const tempDir = nodePath.join(__dirname, 'temp/compiler')

const prepareRandomFile = () => {
  const basename = crypto.randomUUID()
  // The compiler reports file identities in posix form, so build the test path the same way (Bun + fs accept `/`).
  const path = toPosixPath(nodePath.join(tempDir, basename + '.tsx'))
  const importpath = './' + basename + '.js'
  return Object.assign(Bun.file(path), { path, basename, importpath })
}

const helper = (callback: ({ files }: { files: TestFile[] }) => void | Promise<void>, preserve = false) => {
  return async () => {
    const files = Array.from({ length: 11 }, prepareRandomFile)
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

describe('Compiler', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  describe('#compile', () => {
    it.concurrent(
      'compiles basic file with root point',
      helper(async ({ files: [file] }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
        `)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.modified).toBe(true)
        expect(result.code).toContain('Point0.lets')
      }),
    )

    // we have disabled typescript pruning
    //     it.concurrent(
    //       'strips TypeScript syntax from emitted code',
    //       helper(async ({ files: [file] }) => {
    //         await file.write(`import type { ReactNode } from 'react'
    // type Props = { label: string; children?: ReactNode }
    // interface InternalProps { id: string }
    // const props: Props = { label: 'Hello' }
    // export const value = props.label as string
    // export const view = <div>{props.label satisfies string}</div>
    //         `)
    //         const compiler = Compiler.create({ side: 'client', scope: 'root' })
    //         const result = compiler.compile({ file: file.path })
    //         const code = await toText(result.code)

    //         expect(result.errors).toHaveLength(0)
    //         expect(result.modified).toBe(true)
    //         expect(code).not.toContain('import type')
    //         expect(code).not.toContain('type Props')
    //         expect(code).not.toContain('interface InternalProps')
    //         expect(code).not.toContain(': Props')
    //         expect(code).not.toContain(' as string')
    //         expect(code).not.toContain(' satisfies string')
    //         expect(code).toContain("label: 'Hello'")
    //         expect(code).toContain('export const value = props.label')
    //         expect(code).toContain('export const view = <div>{props.label}</div>')
    //       }),
    //     )

    it.concurrent(
      'desugars lets.<type>() syntax before point processing',
      helper(async ({ files: [file] }) => {
        await file.write(`import {Point0} from '@point0/core'
export const mainRoot = Point0.lets.root().root()
export const ideaPage = mainRoot.lets.page('/idea/:id').page(() => <div>Hello</div>)
export const ideaLayout = mainRoot.lets.layout('/idea').layout()
export const saveAction = mainRoot.lets.action('POST', '/save').loader(() => ({ ok: true })).action()
export const myPlugin = Point0.lets.plugin().plugin()
        `)
        const compiler = Compiler.create({ side: 'client', scope: 'main' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(5)
        expect(result.modified).toBe(true)
        expect(await toText(result.code)).toMatchInlineSnapshot(`
"import { Point0 } from '@point0/core'
export const mainRoot = Point0.lets('root', 'main')
  .root()
  ._tail(function X() {
    return null
  })
export const ideaPage = mainRoot
  .lets('page', 'idea', '/idea/:id')
  .page(PageIdea)
  ._tail(function X() {
    return null
  })
export const ideaLayout = mainRoot
  .lets('layout', 'idea', '/idea')
  .layout()
  ._tail(function X() {
    return null
  })
export const saveAction = mainRoot
  .lets('action', 'save', 'POST', '/save')
  .loader()
  .action()
  ._tail(function X() {
    return null
  })
export const myPlugin = Point0.lets('plugin', 'my')
  .plugin()
  ._tail(function X() {
    return null
  })
function PageIdea() {
  return <div>Hello</div>
}
"
`)
      }),
    )

    it.concurrent(
      'desugars lets.<type>() syntax even without ending or invalid args',
      helper(async ({ files: [file] }) => {
        await file.write(`import {Point0} from '@point0/core'
export const mainRoot = Point0.lets.root()
export const ideaPage = mainRoot.lets.page()
export const ideaLayout = mainRoot.lets.layout('/idea')
export const saveAction = mainRoot.lets.action('POST')
        `)
        const compiler = Compiler.create({ side: 'client', scope: 'main' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(4)
        expect(result.modified).toBe(true)
        expect(await toText(result.code)).toMatchInlineSnapshot(`
"import { Point0 } from '@point0/core'
export const mainRoot = Point0.lets('root', 'main')
export const ideaPage = mainRoot.lets('page', 'idea')
export const ideaLayout = mainRoot.lets('layout', 'idea', '/idea')
export const saveAction = mainRoot.lets('action', 'save', 'POST')
"
`)
      }),
    )

    it.concurrent(
      'desugars default export lets.<type>() using file basename as point name',
      helper(async () => {
        const filePath = nodePath.join(tempDir, 'lets-sugar-default.tsx')
        try {
          await Bun.write(
            filePath,
            `import {Point0} from '@point0/core'
export const root = Point0.lets.root().ctx({x: 1}).ctx({y: 2}).root()
export default root.lets.page('/idea').loader(() => ({ ok: true })).page(() => <div>Hello</div>)
          `,
          )
          const compiler = Compiler.create({ side: 'server', scope: 'root' })
          const result = compiler.compile({ file: filePath })
          expect(result.errors).toHaveLength(0)
          expect(result.points).toHaveLength(2)
          expect(result.modified).toBe(true)
          expect(await toText(result.code)).toMatchInlineSnapshot(`
"import { Point0 } from '@point0/core'
export const root = Point0.lets('root', 'root')
  .ctx({
    x: 1,
  })
  .ctx({
    y: 2,
  })
  .root()
export default root
  .lets('page', 'lets-sugar-default', '/idea')
  .loader(() => ({
    ok: true,
  }))
  .page()
"
`)
        } finally {
          await Bun.file(filePath).delete()
        }
      }),
    )

    it.concurrent(
      'desugars page/layout type-only names via filepath and strips Query for infiniteQuery',
      helper(async () => {
        const filePath = nodePath.join(tempDir, 'lets-sugar-fallbacks.tsx')
        try {
          await Bun.write(
            filePath,
            `import {Point0} from '@point0/core'
export const root = Point0.lets.root().root()
export const page = root.lets.page('/page').page(() => <div>Page</div>)
export const layout = root.lets.layout('/layout').layout()
export const ideasQuery = root.lets.infiniteQuery().infiniteQuery()
          `,
          )
          const compiler = Compiler.create({ side: 'client', scope: 'root' })
          const result = compiler.compile({ file: filePath })
          expect(result.errors).toHaveLength(0)
          expect(result.points).toHaveLength(4)
          expect(result.modified).toBe(true)
          expect(await toText(result.code)).toMatchInlineSnapshot(`
"import { Point0 } from '@point0/core'
export const root = Point0.lets('root', 'root')
  .root()
  ._tail(function X() {
    return null
  })
export const page = root
  .lets('page', 'lets-sugar-fallbacks', '/page')
  .page(PageLetsSugarFallbacks)
  ._tail(function X() {
    return null
  })
export const layout = root
  .lets('layout', 'lets-sugar-fallbacks', '/layout')
  .layout()
  ._tail(function X() {
    return null
  })
export const ideasQuery = root
  .lets('infiniteQuery', 'ideas')
  .infiniteQuery()
  ._tail(function X() {
    return null
  })
function PageLetsSugarFallbacks() {
  return <div>Page</div>
}
"
`)
        } finally {
          await Bun.file(filePath).delete()
        }
      }),
    )

    it.concurrent(
      'respects side option - client',
      helper(async ({ files: [file] }) => {
        await file.write(`const {env}=require('@point0/core'); if (env.side.is.client) console.info('client')`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`console.info('client')`)
      }),
    )

    it.concurrent(
      'respects side option - server',
      helper(async ({ files: [file] }) => {
        await file.write(`const {env}=require('@point0/core'); if (env.side.is.server) console.info('server')`)
        const compiler = Compiler.create({ side: 'server', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`console.info('server')`)
      }),
    )

    it.concurrent(
      'removes dead guarded expression for false && branch',
      helper(async ({ files: [file] }) => {
        await file.write(`const {env}=require('@point0/core'); env.side.is.server && console.info('server')`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`console.info('server')`)
      }),
    )

    it.concurrent(
      'removes dead guarded expression for true || branch',
      helper(async ({ files: [file] }) => {
        await file.write(`const {env}=require('@point0/core'); env.side.is.client || console.info('client')`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`console.info('client')`)
      }),
    )

    it.concurrent(
      'removes dead if block for false condition',
      helper(async ({ files: [file] }) => {
        await file.write(`const {env}=require('@point0/core'); if (env.side.is.client) { console.info('client') }`)
        const compiler = Compiler.create({ side: 'server', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`console.info('client')`)
      }),
    )

    it.concurrent(
      'removes import declaration when all imported bindings are pruned',
      helper(async ({ files: [file] }) => {
        await file.write(`import { prisma } from './lib/prisma'
const {env}=require('@point0/core'); env.side.is.server && prisma.idea.findMany()`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`from './lib/prisma'`)
      }),
    )

    it.concurrent(
      'removes prisma import after loader body is pruned',
      helper(async ({ files: [file] }) => {
        await file.write(`import { root } from './lib/root'
import { prisma } from './lib/prisma'
export const ideasQuery = root
  .lets('query', 'ideas')
  .loader(async () => {
    const ideas = await prisma.idea.findMany({ orderBy: { createdAt: 'desc' } })
    return { ideas }
  })
  .query()`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`from './lib/root'`)
        expect(result.code).not.toContain(`from './lib/prisma'`)
      }),
    )

    it.concurrent(
      'keeps side-effect-only imports while pruning unused bound imports',
      helper(async ({ files: [file] }) => {
        await file.write(`import './lib/setup'
import { prisma } from './lib/prisma'
const {env}=require('@point0/core'); env.side.is.server && prisma.idea.findMany()`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`import './lib/setup'`)
        expect(result.code).not.toContain(`from './lib/prisma'`)
      }),
    )

    it.concurrent(
      'prunes unused imports after ClientOnly children are replaced on server side',
      helper(async ({ files: [file] }) => {
        await file.write(`import { ClientOnly } from '@point0/core'
import { MyClientComponent } from './lib/my-client-component.tsx'
console.info(
  <ClientOnly>
    <MyClientComponent />
  </ClientOnly>,
)`)
        const compiler = Compiler.create({ side: 'server', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        console.info(result.code)
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`from '@point0/core'`)
        expect(result.code).not.toContain(`my-client-component`)
      }),
    )

    it.concurrent(
      'does not shake env when env is not imported from @point0/core',
      helper(async ({ files: [file] }) => {
        await file.write(`import { env } from 'somewhere-else'
if (env.side.is.server) console.info('server')`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`env.side.is.server`)
        expect(result.code).toContain(`console.info('server')`)
      }),
    )

    it.concurrent(
      'shakes env for destructured await import from @point0/core',
      helper(async ({ files: [file] }) => {
        await file.write(`void (async () => {
  const { env } = await import('@point0/core')
  if (env.side.is.server) console.info('server')
})()`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`env.side.is.server`)
        expect(result.code).not.toContain(`console.info('server')`)
      }),
    )

    it.concurrent(
      'does not shake env for destructured await import from non-core module',
      helper(async ({ files: [file] }) => {
        await file.write(`void (async () => {
  const { env } = await import('somewhere-else')
  if (env.side.is.server) console.info('server')
})()`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`env.side.is.server`)
        expect(result.code).toContain(`console.info('server')`)
      }),
    )

    it.concurrent(
      'still shakes _point0_env without import source checks',
      helper(async ({ files: [file] }) => {
        await file.write(`import { env as renamedEnv } from 'somewhere-else'
const _point0_env = renamedEnv
if (_point0_env.side.is.server) console.info('server')`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`console.info('server')`)
      }),
    )

    it.concurrent(
      'does not replace non-core ClientOnly component on server side',
      helper(async ({ files: [file] }) => {
        await file.write(`import { MyClientComponent } from './lib/my-client-component.tsx'
const ClientOnly = ({ children }: { children: unknown }) => children
console.info(
  <ClientOnly>
    <MyClientComponent />
  </ClientOnly>,
)`)
        const compiler = Compiler.create({ side: 'server', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`my-client-component`)
      }),
    )

    it.concurrent(
      'respects scope option',
      helper(async ({ files: [file] }) => {
        await file.write(`const {env}=require('@point0/core'); if (env.scope.is.test) console.info('test')`)
        const compiler = Compiler.create({ side: 'client', scope: 'test' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`console.info('test')`)
      }),
    )

    it.concurrent(
      'respects consts option',
      helper(async ({ files: [file] }) => {
        await file.write(`const {env}=require('@point0/core'); if (env.vars.TEST_VAR) console.info('test')`)
        const compiler = Compiler.create({ side: 'client', scope: 'root', consts: [{ TEST_VAR: true }] })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`console.info('test')`)
      }),
    )

    it.concurrent(
      'replaces process.env bracket access using consts',
      helper(async ({ files: [file] }) => {
        await file.write(`import { env } from '@point0/core'; if (process.env['TEST_VAR']) console.info('test')`)
        const compiler = Compiler.create({ side: 'client', scope: 'root', consts: [{ TEST_VAR: false }] })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`console.info('test')`)
      }),
    )

    it.concurrent(
      'replaces import.meta.env bracket access using consts',
      helper(async ({ files: [file] }) => {
        await file.write(`import { env } from '@point0/core'; if (import.meta.env['TEST_VAR']) console.info('test')`)
        const compiler = Compiler.create({ side: 'client', scope: 'root', consts: [{ TEST_VAR: false }] })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`console.info('test')`)
      }),
    )

    it.concurrent(
      'respects hmrFix option - true',
      helper(async ({ files: [file] }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
        `)
        const compiler = Compiler.create({ side: 'client', scope: 'root', hmrFix: true })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain('._tail(function')
      }),
    )

    it.concurrent(
      'respects hmrFix option - false',
      helper(async ({ files: [file] }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
        `)
        const compiler = Compiler.create({ side: 'client', scope: 'root', hmrFix: false })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain('._tail')
      }),
    )

    it.concurrent(
      'handles file with no points',
      helper(async ({ files: [file] }) => {
        await file.write(`console.info('hello')`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(0)
        expect(result.modified).toBe(false)
      }),
    )

    it.concurrent(
      'rewrites @point0/core/client-only to denied virtual module on server side',
      helper(async ({ files: [file] }) => {
        await file.write(`import { ClientOnly } from '@point0/core/client-only'
console.info(ClientOnly)`)
        const compiler = Compiler.create({
          side: 'server',
          scope: 'root',
          importer: {
            cwd: nodePath.dirname(file.path),
          },
        })
        const result = compiler.compile({ file: file.path })
        const virtualPath = result.file?.imports[0]?.virtualPath

        expect(result.errors).toHaveLength(0)
        expect(virtualPath).toBeDefined()
        expect(result.code).toContain('@point0/virtual?')

        const parsed = parseVirtualModulePath(virtualPath as string)
        expect(parsed.deny).toBe('@point0/core/client-only')
        expect(parsed.pathOriginal).toBe('@point0/core/client-only')
        expect(parsed.pathResolved).toBe('@point0/core/client-only')
        expect(parsed.importer?.includes(`${file.basename}.tsx`)).toBe(true)
      }),
    )

    it.concurrent(
      'rewrites @point0/core/server-only to denied virtual module on client side',
      helper(async ({ files: [file] }) => {
        await file.write(`import { ServerOnly } from '@point0/core/server-only'
console.info(ServerOnly)`)
        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: {
            cwd: nodePath.dirname(file.path),
          },
        })
        const result = compiler.compile({ file: file.path })
        const virtualPath = result.file?.imports[0]?.virtualPath

        expect(result.errors).toHaveLength(0)
        expect(virtualPath).toBeDefined()
        expect(result.code).toContain('@point0/virtual?')

        const parsed = parseVirtualModulePath(virtualPath as string)
        expect(parsed.deny).toBe('@point0/core/server-only')
        expect(parsed.pathOriginal).toBe('@point0/core/server-only')
        expect(parsed.pathResolved).toBe('@point0/core/server-only')
        expect(parsed.importer?.includes(`${file.basename}.tsx`)).toBe(true)
      }),
    )

    it.concurrent(
      'throws when compiling denied virtual module when importer.onDeny is throw',
      helper(async ({ files: [file1, file2] }) => {
        await file1.write(`import '@point0/core/client-only'
    export const x = 1
    `)
        await file2.write(`import { x } from '${file1.importpath}'
    console.info(x)`)
        const compiler = Compiler.create({
          side: 'server',
          scope: 'root',
          importer: {
            cwd: nodePath.dirname(file1.path),
            onDeny: 'throw',
          },
        })
        compiler.compile({ file: file2.path })
        const pass1 = compiler.compile({ file: file1.path, pruneWalker: false })
        expect(compiler.walker.files.size).toBe(2)
        const virtualPath = pass1.file?.imports[0]?.virtualPath
        expect(virtualPath).toBeDefined()
        expect(() => compiler.compile({ file: virtualPath as string })).toThrow('Import denied on side "server"')
      }),
    )

    it.concurrent(
      'returns deny virtual module code without throwing when importer.onDeny is log',
      helper(async ({ files: [file1, file2] }) => {
        await file1.write(`import '@point0/core/client-only'
export const x = 1
`)
        await file2.write(`import { x } from '${file1.importpath}'
console.info(x)`)
        const compiler = Compiler.create({
          side: 'server',
          scope: 'root',
          importer: {
            cwd: nodePath.dirname(file2.path),
            onDeny: 'log',
          },
        })
        compiler.compile({ file: file2.path })
        const pass1 = compiler.compile({ file: file1.path, pruneWalker: false })
        expect(compiler.walker.files.size).toBe(2)
        const virtualPath = pass1.file?.imports[0]?.virtualPath
        expect(virtualPath).toBeDefined()

        const virtualResult = compiler.compile({ file: virtualPath as string })
        expect(virtualResult.errors).toHaveLength(0)
        expect(virtualResult.code).toContain('throw new Error(')
        expect(virtualResult.code).toContain('Import denied on side \\"server\\"')
        expect(virtualResult.code).toContain('Rule: @point0/core/client-only')
      }),
    )

    // Helper for the suite below: unescape the deny-message that's been wrapped in
    // `throw new Error(JSON.stringify(...))`. Returns the human-readable message text so the
    // assertions can check for literal substrings without worrying about JSON quoting.
    const extractDenyMessage = (code: string): string => {
      const match = code.match(/throw new Error\((?<json>"(?:\\.|[^"\\])*")\)/)
      if (!match?.groups?.json) {
        throw new Error('Could not find throw new Error(...) in virtual module code')
      }
      return JSON.parse(match.groups.json) as string
    }

    it.concurrent(
      'CLI suggestion for @point0/core/client-only has NO "./" prefix on the specifier',
      helper(async ({ files: [file] }) => {
        await file.write(`import { ClientOnly } from '@point0/core/client-only'
export const x = ClientOnly`)
        const compiler = Compiler.create({
          side: 'server',
          scope: 'root',
          importer: { cwd: nodePath.dirname(file.path) },
        })
        const result = compiler.compile({ file: file.path, pruneWalker: false })
        const virtualPath = result.file?.imports[0]?.virtualPath
        expect(virtualPath).toBeDefined()
        const virtualResult = compiler.compile({ file: virtualPath as string })
        const message = extractDenyMessage(virtualResult.code)

        // The suggestion must show the bare specifier exactly as it appears in source —
        // never prefixed with "./" (that would both look wrong AND wouldn't match in
        // `point0 trace`, which compares against pathOriginal === '@point0/core/client-only').
        expect(message).toContain('"@point0/core/client-only" "<source-file-path>"')
        expect(message).not.toContain('"./@point0/core/client-only"')
      }),
    )

    it.concurrent(
      'CLI suggestion for @point0/core/server-only has NO "./" prefix on the specifier',
      helper(async ({ files: [file] }) => {
        await file.write(`import { ServerOnly } from '@point0/core/server-only'
export const x = ServerOnly`)
        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(file.path) },
        })
        const result = compiler.compile({ file: file.path, pruneWalker: false })
        const virtualPath = result.file?.imports[0]?.virtualPath
        expect(virtualPath).toBeDefined()
        const virtualResult = compiler.compile({ file: virtualPath as string })
        const message = extractDenyMessage(virtualResult.code)
        expect(message).toContain('"@point0/core/server-only" "<source-file-path>"')
        expect(message).not.toContain('"./@point0/core/server-only"')
      }),
    )

    it.concurrent(
      'CLI suggestion for relative file deny still gets "./" prefix',
      helper(async ({ files: [denied, source] }) => {
        await denied.write(`export const prisma = {}`)
        await source.write(`import { prisma } from '${denied.importpath}'
export const useIt = prisma`)
        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: {
            cwd: nodePath.dirname(source.path),
            deny: [`**/${denied.basename}.*`],
          },
        })
        const result = compiler.compile({ file: source.path, pruneWalker: false })
        const virtualPath = result.file?.imports[0]?.virtualPath
        expect(virtualPath).toBeDefined()
        const virtualResult = compiler.compile({ file: virtualPath as string })
        const message = extractDenyMessage(virtualResult.code)

        // For relative file paths (produced by nodePath.relative(cwd, abs)), the suggestion
        // adds "./" so the shell + CLI both recognize it as a path.
        expect(message).toMatch(/"\.\/[^"]*\.tsx?" "<source-file-path>"/)
        // No double-prefix like "././…".
        expect(message).not.toContain('"././')
      }),
    )

    it.concurrent(
      'CLI suggestion preserves an already-./-prefixed specifier as-is (no "././")',
      helper(async ({ files: [file] }) => {
        // Force the deny path to land on a value that starts with "./" already by using
        // a specifier-style deny on the bare import string. Stress-tests the formatter.
        await file.write(`import { ClientOnly } from '@point0/core/client-only'
export const x = ClientOnly`)
        const compiler = Compiler.create({
          side: 'server',
          scope: 'root',
          importer: { cwd: nodePath.dirname(file.path) },
        })
        const result = compiler.compile({ file: file.path, pruneWalker: false })
        const virtualPath = result.file?.imports[0]?.virtualPath
        const virtualResult = compiler.compile({ file: virtualPath as string })
        const message = extractDenyMessage(virtualResult.code)
        expect(message).not.toContain('"././')
      }),
    )

    it.concurrent(
      'shakes a point registered earlier from a disk parse when compile later receives bundler content (vite transform-order race)',
      helper(async ({ files: [rootFile, pageFile] }) => {
        // In a production build (pruneWalker: false, like the vite plugin with built: true) the bundler may transform
        // the page BEFORE the root file. The page compile resolves its parent chain by reading the root file from
        // disk, registering the root point bound to that disk AST. When the bundler then hands the root file's
        // content to compile(), a fresh AST is parsed for the same source — the registered point must not be reused
        // for it, or shakeMethods mutates the stale AST while the fresh one is serialized unshaken (leaking
        // server-only method args, e.g. `.middleware(cors())`, into the client bundle).
        const rootContent = `import { Point0 } from '@point0/core'
export const root = Point0.lets('root', 'root').middleware(() => ({ leaked: 'MY_SERVER_ONLY_MIDDLEWARE' })).root()
`
        await rootFile.write(rootContent)
        await pageFile.write(`import { root } from '${rootFile.importpath}'
export const page = root.lets('page', 'home', '/').page(() => 'home')
`)
        const compiler = Compiler.create({ side: 'client', scope: 'root' })
        const pageResult = compiler.compile({ file: pageFile.path, pruneWalker: false })
        expect(pageResult.errors).toHaveLength(0)
        const rootResult = compiler.compile({ file: rootFile.path, content: rootContent, pruneWalker: false })
        expect(rootResult.errors).toHaveLength(0)
        expect(rootResult.code).toContain('.middleware()')
        expect(rootResult.code).not.toContain('MY_SERVER_ONLY_MIDDLEWARE')
      }),
    )
  })

  describe('#trace', () => {
    it.concurrent(
      'finds memory trace when "to" is package specifier',
      helper(async ({ files: [fileA, fileB] }) => {
        await fileA.write(`import 'react-native'
export const a = 1`)
        await fileB.write(`import { a } from '${fileA.importpath}'
console.info(a)`)

        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(fileA.path) },
        })
        compiler.compile({ file: fileA.path, pruneWalker: false })
        compiler.compile({ file: fileB.path, pruneWalker: false })

        const result = compiler.trace({
          target: 'react-native',
          policy: 'memory',
        })

        expect(result.found).toBe(true)
        expect(result.items).toHaveLength(2)
        expect(result.items[0]?.importer).toBe(fileA.path)
        expect(result.items[0]?.pathOriginal).toBe('react-native')
        expect(result.items[1]?.importer).toBe(fileB.path)
        expect(result.trace).toHaveLength(2)
        expect(result.trace[0]).toBe(`${result.items[0]?.importer}:${result.items[0]?.line}:${result.items[0]?.column}`)
        expect(result.trace[1]).toBe(`${result.items[1]?.importer}:${result.items[1]?.line}:${result.items[1]?.column}`)

        const resultWithTarget = compiler.trace({
          target: 'react-native',
          policy: 'memory',
          includeTarget: true,
        })
        expect(resultWithTarget.trace[0]?.startsWith('react-native:')).toBe(true)
      }),
    )

    it.concurrent(
      'finds compiling trace when "to" matches import pathOriginal',
      helper(async ({ files: [fileA, fileB] }) => {
        await fileA.write(`import 'react-native'
export const a = 1`)
        await fileB.write(`import { a } from '${fileA.importpath}'
console.info(a)`)

        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(fileA.path) },
        })

        const result = compiler.trace({
          target: 'react-native',
          source: fileB.path,
          policy: 'compiling',
        })

        expect(result.found).toBe(true)
        expect(result.items).toHaveLength(2)
        expect(result.items[0]?.importer).toBe(fileA.path)
        expect(result.items[0]?.pathOriginal).toBe('react-native')
        expect(result.items[1]?.importer).toBe(fileB.path)
        expect(result.trace).toHaveLength(2)
        expect(result.trace[0]).toBe(`${result.items[0]?.importer}:${result.items[0]?.line}:${result.items[0]?.column}`)
        expect(result.trace[1]).toBe(`${result.items[1]?.importer}:${result.items[1]?.line}:${result.items[1]?.column}`)
      }),
    )

    it.concurrent(
      'finds memory trace across 5 files with circular dependencies',
      helper(async ({ files: [fileA, fileB, fileC, fileD, fileE] }) => {
        await fileA.write(`import 'react-native'
import { e } from '${fileE.importpath}'
export const a = e + 1`)
        await fileB.write(`import { a } from '${fileA.importpath}'
export const b = a + 1`)
        await fileC.write(`import { b } from '${fileB.importpath}'
export const c = b + 1`)
        await fileD.write(`import { c } from '${fileC.importpath}'
export const d = c + 1`)
        await fileE.write(`import { d } from '${fileD.importpath}'
export const e = d + 1`)

        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(fileA.path) },
        })
        compiler.compile({ file: fileA.path, pruneWalker: false })
        compiler.compile({ file: fileB.path, pruneWalker: false })
        compiler.compile({ file: fileC.path, pruneWalker: false })
        compiler.compile({ file: fileD.path, pruneWalker: false })
        compiler.compile({ file: fileE.path, pruneWalker: false })

        const result = compiler.trace({
          target: 'react-native',
          policy: 'memory',
        })

        expect(result.found).toBe(true)
        expect(result.items).toHaveLength(5)
        expect(result.trace).toHaveLength(5)
        expect(result.items[0]?.importer).toBe(fileA.path)
        expect(result.items[4]?.importer).toBe(fileE.path)
        expect(new Set(result.items.map((item) => item.importer)).size).toBe(result.items.length)
      }),
    )
  })

  describe('#collectImportsDeep', () => {
    it.concurrent(
      'collects single direct import',
      helper(async ({ files: [fileA, fileB] }) => {
        await fileA.write(`export const a = 1`)
        await fileB.write(`import { a } from '${fileA.importpath}'
export const b = a + 1`)

        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(fileA.path) },
        })

        const result = compiler.collectImportsDeep({ target: fileB.path })

        expect(result).toHaveLength(1)
        expect(result[0]?.importer).toBe(fileB.path)
        expect(result[0]?.pathResolved).toBe(fileA.path)
      }),
    )

    it.concurrent(
      'recursively collects transitive imports across multiple files',
      helper(async ({ files: [fileA, fileB, fileC, fileD] }) => {
        await fileA.write(`export const a = 1`)
        await fileB.write(`import { a } from '${fileA.importpath}'
export const b = a + 1`)
        await fileC.write(`import { b } from '${fileB.importpath}'
export const c = b + 1`)
        await fileD.write(`import { c } from '${fileC.importpath}'
export const d = c + 1`)

        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(fileA.path) },
        })

        const result = compiler.collectImportsDeep({ target: fileD.path })
        const resolvedPaths = result.map((item) => item.pathResolved).sort()

        expect(result).toHaveLength(3)
        expect(resolvedPaths).toEqual([fileA.path, fileB.path, fileC.path].sort())
      }),
    )

    it.concurrent(
      'still walks the graph when the on-disk compile cache is warm',
      helper(async ({ files: [fileA, fileB, fileC] }) => {
        await fileA.write(`export const a = 1`)
        await fileB.write(`import { a } from '${fileA.importpath}'
export const b = a + 1`)
        await fileC.write(`import { b } from '${fileB.importpath}'
export const c = b + 1`)

        // First compiler instance — populates disk cache.
        const warmer = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(fileA.path) },
        })
        warmer.compile({ file: fileA.path, pruneWalker: false })
        warmer.compile({ file: fileB.path, pruneWalker: false })
        warmer.compile({ file: fileC.path, pruneWalker: false })

        // Fresh compiler — its walker is empty; only the disk cache is warm.
        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(fileA.path) },
        })

        const result = compiler.collectImportsDeep({ target: fileC.path })
        const resolvedPaths = result.map((item) => item.pathResolved).sort()

        expect(result).toHaveLength(2)
        expect(resolvedPaths).toEqual([fileA.path, fileB.path].sort())
      }),
    )

    it.concurrent(
      'omits imports inside env.side.define dead branches after shaking',
      helper(async ({ files: [entry, clientOnly, serverOnly] }) => {
        await clientOnly.write(`export const c = 'client'`)
        await serverOnly.write(`export const s = 'server'`)
        await entry.write(`import { env } from '@point0/core'
import { c } from '${clientOnly.importpath}'
import { s } from '${serverOnly.importpath}'
export const value = env.side.define({ client: c, server: s })`)

        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(entry.path) },
        })

        const result = compiler.collectImportsDeep({ target: entry.path })
        const resolvedPaths = result.map((item) => item.pathResolved)

        expect(resolvedPaths).toContain(clientOnly.path)
        expect(resolvedPaths).not.toContain(serverOnly.path)
      }),
    )

    it.concurrent(
      'handles circular dependencies without infinite recursion',
      helper(async ({ files: [fileA, fileB, fileC] }) => {
        await fileA.write(`import { c } from '${fileC.importpath}'
export const a = c + 1`)
        await fileB.write(`import { a } from '${fileA.importpath}'
export const b = a + 1`)
        await fileC.write(`import { b } from '${fileB.importpath}'
export const c = b + 1`)

        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(fileA.path) },
        })

        const result = compiler.collectImportsDeep({ target: fileA.path })
        const resolvedPaths = new Set(result.map((item) => item.pathResolved))

        expect(resolvedPaths.has(fileA.path)).toBe(true)
        expect(resolvedPaths.has(fileB.path)).toBe(true)
        expect(resolvedPaths.has(fileC.path)).toBe(true)
      }),
    )

    it.concurrent(
      'skip predicate prunes branches',
      helper(async ({ files: [fileA, fileB, fileC] }) => {
        await fileA.write(`export const a = 1`)
        await fileB.write(`import { a } from '${fileA.importpath}'
export const b = a + 1`)
        await fileC.write(`import { b } from '${fileB.importpath}'
export const c = b + 1`)

        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(fileA.path) },
        })

        const result = compiler.collectImportsDeep({
          target: fileC.path,
          skip: (resolved) => resolved.pathResolved === fileB.path,
        })

        const resolvedPaths = result.map((item) => item.pathResolved)
        expect(resolvedPaths).not.toContain(fileB.path)
        expect(resolvedPaths).not.toContain(fileA.path)
      }),
    )

    it.concurrent(
      'collects branching imports from a single entry',
      helper(async ({ files: [entry, leaf1, leaf2, leaf3] }) => {
        await leaf1.write(`export const x = 1`)
        await leaf2.write(`export const y = 2`)
        await leaf3.write(`export const z = 3`)
        await entry.write(`import { x } from '${leaf1.importpath}'
import { y } from '${leaf2.importpath}'
import { z } from '${leaf3.importpath}'
export const e = x + y + z`)

        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(entry.path) },
        })

        const result = compiler.collectImportsDeep({ target: entry.path })
        const resolvedPaths = result.map((item) => item.pathResolved).sort()

        expect(result).toHaveLength(3)
        expect(resolvedPaths).toEqual([leaf1.path, leaf2.path, leaf3.path].sort())
      }),
    )

    it.concurrent(
      'works without "side" configuration',
      helper(async ({ files: [fileA, fileB] }) => {
        await fileA.write(`export const a = 1`)
        await fileB.write(`import { a } from '${fileA.importpath}'
export const b = a + 1`)

        const compiler = Compiler.create({
          side: false,
          scope: false,
          importer: { cwd: nodePath.dirname(fileA.path) },
        })

        const result = compiler.collectImportsDeep({ target: fileB.path })
        expect(result).toHaveLength(1)
        expect(result[0]?.pathResolved).toBe(fileA.path)
      }),
    )

    it.concurrent(
      'does not recurse into bare package specifiers',
      helper(async ({ files: [fileA, fileB] }) => {
        await fileA.write(`import 'react-native'
export const a = 1`)
        await fileB.write(`import { a } from '${fileA.importpath}'
export const b = a + 1`)

        const compiler = Compiler.create({
          side: 'client',
          scope: 'root',
          importer: { cwd: nodePath.dirname(fileA.path) },
        })

        const result = compiler.collectImportsDeep({ target: fileB.path })
        const originals = result.map((item) => item.pathOriginal)

        expect(originals).toContain('react-native')
        expect(result.some((item) => item.pathResolved === fileA.path)).toBe(true)
      }),
    )
  })

  describe('disk cache', () => {
    // Every compiler here is built from the same options on purpose: the cache dir is keyed by a hash of the compiler
    // settings, so only identical options share entries — which is what these tests need to observe.
    const createCompiler = (deny?: string[]) =>
      Compiler.create({
        side: 'client',
        scope: 'root',
        importer: { cwd: tempDir, ...(deny ? { deny } : {}) },
      })

    // A cache hit returns no points (the early return has nothing to hand back), a real compile always does — the one
    // signal that says which path a compile took.
    const wasCacheHit = (result: { points: unknown[] | undefined }) => result.points === undefined

    const cacheEntriesOf = (compiler: Compiler, file: string): string[] => {
      const dir = compiler.getCacheDir({ map: false, hmrFix: true })
      const prefix = getHash(file) + '.'
      return nodeFs.readdirSync(dir).filter((name) => name.startsWith(prefix))
    }

    it.concurrent(
      'reresolves imports on a cache hit: a dependency renamed .ts → .tsx invalidates the entry',
      helper(async ({ files: [importerFile] }) => {
        const depBasename = `dep-${crypto.randomUUID()}`
        const depTs = toPosixPath(nodePath.join(tempDir, `${depBasename}.ts`))
        const depTsx = toPosixPath(nodePath.join(tempDir, `${depBasename}.tsx`))
        try {
          nodeFs.writeFileSync(depTs, 'export const dep = 1\n')
          await importerFile.write(`import { dep } from './${depBasename}.js'
export const value = dep + 1`)

          const first = createCompiler().compile({ file: importerFile.path })
          expect(wasCacheHit(first)).toBe(false)
          expect(first.imports.map((item) => item.pathResolved)).toEqual([depTs])

          // Control: nothing moved, so a fresh compiler (empty walker) answers from the warm disk cache.
          const cached = createCompiler().compile({ file: importerFile.path })
          expect(wasCacheHit(cached)).toBe(true)
          expect(cached.imports.map((item) => item.pathResolved)).toEqual([depTs])

          // The importer itself is untouched by the rename — its path, mtime and the settings all still match the
          // entry, so only the import check can catch this.
          nodeFs.renameSync(depTs, depTsx)

          const after = createCompiler().compile({ file: importerFile.path })
          expect(wasCacheHit(after)).toBe(false)
          expect(after.imports.map((item) => item.pathResolved)).toEqual([depTsx])
        } finally {
          nodeFs.rmSync(depTs, { force: true })
          nodeFs.rmSync(depTsx, { force: true })
        }
      }),
    )

    it.concurrent(
      'reresolves imports on a cache hit: a dependency moved to x/index.ts invalidates the entry',
      helper(async ({ files: [importerFile] }) => {
        const depBasename = `dep-${crypto.randomUUID()}`
        const depFlat = toPosixPath(nodePath.join(tempDir, `${depBasename}.ts`))
        const depDir = toPosixPath(nodePath.join(tempDir, depBasename))
        const depIndex = toPosixPath(nodePath.join(depDir, 'index.ts'))
        try {
          nodeFs.writeFileSync(depFlat, 'export const dep = 1\n')
          await importerFile.write(`import { dep } from './${depBasename}'
export const value = dep + 1`)

          const first = createCompiler().compile({ file: importerFile.path })
          expect(wasCacheHit(first)).toBe(false)
          expect(first.imports.map((item) => item.pathResolved)).toEqual([depFlat])

          const cached = createCompiler().compile({ file: importerFile.path })
          expect(wasCacheHit(cached)).toBe(true)

          nodeFs.mkdirSync(depDir, { recursive: true })
          nodeFs.renameSync(depFlat, depIndex)

          const after = createCompiler().compile({ file: importerFile.path })
          expect(wasCacheHit(after)).toBe(false)
          expect(after.imports.map((item) => item.pathResolved)).toEqual([depIndex])
        } finally {
          nodeFs.rmSync(depFlat, { force: true })
          nodeFs.rmSync(depDir, { recursive: true, force: true })
        }
      }),
    )

    it.concurrent(
      'drops the poisoned emit when a dependency moves out of a deny rule',
      helper(async ({ files: [importerFile] }) => {
        const depBasename = `dep-${crypto.randomUUID()}`
        const depTs = toPosixPath(nodePath.join(tempDir, `${depBasename}.ts`))
        const depTsx = toPosixPath(nodePath.join(tempDir, `${depBasename}.tsx`))
        // Matches the dependency at its `.ts` path and nowhere else — renaming it to `.tsx` takes it out of the rule.
        const deny = [`**/${depBasename}.ts`]
        try {
          nodeFs.writeFileSync(depTs, 'export const dep = 1\n')
          await importerFile.write(`import { dep } from './${depBasename}.js'
export const value = dep + 1`)

          const first = createCompiler(deny).compile({ file: importerFile.path })
          expect(wasCacheHit(first)).toBe(false)
          expect(first.code).toContain('@point0/virtual?')
          expect(first.modified).toBe(true)

          const cached = createCompiler(deny).compile({ file: importerFile.path })
          expect(wasCacheHit(cached)).toBe(true)
          expect(cached.code).toContain('@point0/virtual?')

          nodeFs.renameSync(depTs, depTsx)

          // The deny decision lives in the CACHED CODE, not just in the recorded paths — serving that code again would
          // keep an import blocked that no rule matches anymore.
          const after = createCompiler(deny).compile({ file: importerFile.path })
          expect(wasCacheHit(after)).toBe(false)
          expect(after.code).not.toContain('@point0/virtual?')
          expect(after.code).toContain(`./${depBasename}.js`)
        } finally {
          nodeFs.rmSync(depTs, { force: true })
          nodeFs.rmSync(depTsx, { force: true })
        }
      }),
    )

    it.concurrent(
      'invalidates on a dependency CONTENT change that the emit baked in (read log)',
      helper(async ({ files: [importerFile] }) => {
        const depBasename = `dep-${crypto.randomUUID()}`
        const depTs = toPosixPath(nodePath.join(tempDir, `${depBasename}.ts`))
        try {
          // v1: the imported base IS a Point0 chain, so the importer's `.lets.page()` sugar gets desugared — a
          // decision derived from the DEPENDENCY'S CONTENT, baked into the importer's emit.
          nodeFs.writeFileSync(
            depTs,
            `import {Point0} from '@point0/core'\nexport const depRoot = Point0.lets('root', 'root').root()\n`,
          )
          await importerFile.write(`import {depRoot} from './${depBasename}.js'
export const pg = depRoot.lets.page('/pg').page(() => null)`)

          const first = createCompiler().compile({ file: importerFile.path })
          expect(wasCacheHit(first)).toBe(false)
          expect(first.code).toContain(`lets("page"`)

          // Control: nothing changed → warm hit with the same emit.
          const cached = createCompiler().compile({ file: importerFile.path })
          expect(wasCacheHit(cached)).toBe(true)
          expect(cached.code).toContain(`lets("page"`)

          // Change ONLY the dependency's content: the importer's path, mtime and every import RESOLUTION stay
          // identical — only the read log knows the emit consumed these bytes.
          await Bun.sleep(5)
          nodeFs.writeFileSync(
            depTs,
            `export const depRoot = { lets: { page: (r: string) => ({ page: () => null }) } }\n`,
          )

          const after = createCompiler().compile({ file: importerFile.path })
          expect(wasCacheHit(after)).toBe(false)
          expect(after.code).not.toContain(`lets("page"`)
        } finally {
          nodeFs.rmSync(depTs, { force: true })
        }
      }),
    )

    it.concurrent(
      'records chain reads even when a compile serves points from walker memory (cross-partition write)',
      helper(async ({ files: [rootFile, layoutFile] }) => {
        // The dev orchestrator's pattern: ONE compiler serves `map: true` compiles (hot-store) and `map: false`
        // compiles (watch-graph collect) — separate cache partitions. The second compile of the same unchanged file
        // finds no entry in ITS partition and collects from walker memory (`allPointsWasCollected`, zero re-parses,
        // the root file never re-read) — only the points' recorded chain reads can put the root into that entry.
        const builtCompilerOptions = {
          side: 'client',
          scope: 'root',
          built: true,
          importer: { cwd: tempDir },
        } satisfies Parameters<typeof Compiler.create>[0]
        await rootFile.write(`import {Point0} from '@point0/core'
export const mainRoot = Point0.lets('root', 'root').root()`)
        await layoutFile.write(`import {mainRoot} from '${rootFile.importpath}'
export const lay = mainRoot.lets('layout', 'lay', '/lay').layout()`)

        const compiler = Compiler.create(builtCompilerOptions)
        const first = compiler.compile({ file: layoutFile.path, map: true }) // fresh collect, map-true partition
        expect(wasCacheHit(first)).toBe(false)
        expect(first.errors).toHaveLength(0)
        const second = compiler.compile({ file: layoutFile.path, map: false }) // memory-served, map-false partition
        expect(wasCacheHit(second)).toBe(false)

        // Control: the map-false entry answers a fresh compiler.
        expect(wasCacheHit(Compiler.create(builtCompilerOptions).compile({ file: layoutFile.path, map: false }))).toBe(
          true,
        )

        // Change the ROOT file (the layout's own mtime and every import resolution stay identical). Serving the
        // memory-written entry would keep decisions derived from the old root.
        await Bun.sleep(5)
        await rootFile.write(`import {Point0} from '@point0/core'
export const mainRoot = Point0.lets('root', 'root').basePath('/moved').root()`)

        const after = Compiler.create(builtCompilerOptions).compile({ file: layoutFile.path, map: false })
        expect(wasCacheHit(after)).toBe(false)
      }),
    )

    it.concurrent(
      'refreshes stale walker memory when a persistent compiler sees its entry invalidated',
      helper(async ({ files: [importerFile] }) => {
        const depBasename = `dep-${crypto.randomUUID()}`
        const depTs = toPosixPath(nodePath.join(tempDir, `${depBasename}.ts`))
        try {
          nodeFs.writeFileSync(
            depTs,
            `import {Point0} from '@point0/core'\nexport const depRoot = Point0.lets('root', 'root').root()\n`,
          )
          await importerFile.write(`import {depRoot} from './${depBasename}.js'
export const pg = depRoot.lets.page('/pg').page(() => null)`)

          // ONE compiler with a persistent walker: the first compile memoizes the importer's desugared points.
          const compiler = Compiler.create({
            side: 'client',
            scope: 'root',
            built: true,
            importer: { cwd: tempDir },
          })
          const first = compiler.compile({ file: importerFile.path })
          expect(wasCacheHit(first)).toBe(false)
          expect(first.code).toContain(`lets("page"`)

          await Bun.sleep(5)
          nodeFs.writeFileSync(
            depTs,
            `export const depRoot = { lets: { page: (r: string) => ({ page: () => null }) } }\n`,
          )

          // The SAME compiler must not answer from its (equally stale) walker memory after the disk entry drops: the
          // invalidation refreshes the file's memos, so the fresh pass re-derives the sugar decision from the new dep.
          const after = compiler.compile({ file: importerFile.path })
          expect(wasCacheHit(after)).toBe(false)
          expect(after.code).not.toContain(`lets("page"`)
        } finally {
          nodeFs.rmSync(depTs, { force: true })
        }
      }),
    )

    it.concurrent(
      'reads an entry from an older cache format (no read log) as a miss, without crashing',
      helper(async ({ files: [file] }) => {
        await file.write(`export const value = 1`)

        const compiler = createCompiler()
        compiler.compile({ file: file.path })
        const dir = compiler.getCacheDir({ map: false, hmrFix: true })
        const entries = cacheEntriesOf(compiler, file.path)
        expect(entries).toHaveLength(1)

        // Rewrite the entry the way the previous format stored it: same payload, no `reads` list.
        const entryPath = nodePath.join(dir, entries[0] as string)
        const payload = JSON.parse(nodeFs.readFileSync(entryPath, 'utf8')) as Record<string, unknown>
        delete payload.reads
        nodeFs.writeFileSync(entryPath, JSON.stringify(payload), 'utf8')

        const result = createCompiler().compile({ file: file.path })
        expect(wasCacheHit(result)).toBe(false)

        // And the fall-through pass rewrote the entry in the current format.
        const rewritten = JSON.parse(
          nodeFs.readFileSync(nodePath.join(dir, cacheEntriesOf(compiler, file.path)[0] as string), 'utf8'),
        ) as Record<string, unknown>
        expect(Array.isArray(rewritten.reads)).toBe(true)
      }),
    )

    it.concurrent(
      'keeps compiles with explicit content out of the disk cache',
      helper(async ({ files: [file] }) => {
        await file.write(`export const value = 'from-disk'`)

        const compiler = createCompiler()

        // Content compiles write nothing: their result belongs to the content they were handed, and the entry key
        // (path + mtime) knows nothing about it.
        const contentFirst = compiler.compile({ file: file.path, content: `export const value = 'from-content-1'` })
        expect(contentFirst.code).toContain('from-content-1')
        expect(cacheEntriesOf(compiler, file.path)).toHaveLength(0)

        // Control: the same file compiled from disk does write one — so the lookup above is looking in the right place.
        compiler.compile({ file: file.path })
        expect(cacheEntriesOf(compiler, file.path)).toHaveLength(1)

        // And with the cache now warm for this file, a content compile still answers from the content it was given —
        // and leaves the disk-backed entry alone (the stale-entry sweep must not run for it either).
        const contentSecond = createCompiler().compile({
          file: file.path,
          content: `export const value = 'from-content-2'`,
        })
        expect(contentSecond.code).toContain('from-content-2')
        expect(contentSecond.code).not.toContain('from-disk')
        expect(cacheEntriesOf(compiler, file.path)).toHaveLength(1)
      }),
    )

    it.concurrent(
      'an import that never resolves stays a cache HIT — no perpetual invalidation for a genuinely missing file',
      helper(async ({ files: [file] }) => {
        const missing = `missing-${crypto.randomUUID()}`
        await file.write(`import { nope } from './${missing}.js'
export const value = 1`)

        const first = createCompiler().compile({ file: file.path })
        expect(wasCacheHit(first)).toBe(false)
        expect(first.imports.map((item) => item.pathResolved)).toEqual([undefined])

        // An unresolved import records no path and no read — there is nothing to re-check, so the entry keeps
        // answering. The alternative would recompile the file on every request forever.
        const second = createCompiler().compile({ file: file.path })
        expect(wasCacheHit(second)).toBe(true)
        const third = createCompiler().compile({ file: file.path })
        expect(wasCacheHit(third)).toBe(true)
      }),
    )
  })

  describe('persistent walker (pruneWalker: false)', () => {
    it.concurrent(
      'recompiles an edited file from its new content, not from leftover memos',
      helper(async ({ files: [file] }) => {
        const depXBasename = `dep-${crypto.randomUUID()}`
        const depYBasename = `dep-${crypto.randomUUID()}`
        const depX = toPosixPath(nodePath.join(tempDir, `${depXBasename}.ts`))
        const depY = toPosixPath(nodePath.join(tempDir, `${depYBasename}.ts`))
        try {
          nodeFs.writeFileSync(depX, 'export const x = 1\n')
          nodeFs.writeFileSync(depY, 'export const y = 2\n')
          await file.write(`import { x } from './${depXBasename}.js'
export const v = x`)

          // `built: true` keeps the walker between compiles; `cache: false` isolates the in-memory path — every memo
          // derived from the file's content (import list, importer result, babel result) must fall with its mtime.
          const compiler = Compiler.create({ side: 'client', scope: 'root', built: true, importer: { cwd: tempDir } })
          const first = compiler.compile({ file: file.path, cache: false })
          expect(first.imports.map((item) => item.pathResolved)).toEqual([depX])

          await Bun.sleep(5)
          await file.write(`import { y } from './${depYBasename}.js'
export const v = y`)

          const second = compiler.compile({ file: file.path, cache: false })
          expect(second.imports.map((item) => item.pathResolved)).toEqual([depY])
          expect(second.code).toContain(depYBasename)
        } finally {
          nodeFs.rmSync(depX, { force: true })
          nodeFs.rmSync(depY, { force: true })
        }
      }),
    )
  })
})

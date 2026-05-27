import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Compiler } from '../src/compiler.js'
import { parseVirtualModulePath } from '../src/importer.js'
import { toText } from './utils.js'

type TestFile = Bun.BunFile & { path: string; basename: string; importpath: string }

const tempDir = nodePath.join(__dirname, 'temp/compiler')

const prepareRandomFile = () => {
  const basename = crypto.randomUUID()
  const path = nodePath.join(tempDir, basename + '.tsx')
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
  .ctx({ x: 1 })
  .ctx({ y: 2 })
  .root()
export default root
  .lets('page', 'lets-sugar-default', '/idea')
  .loader(() => ({ ok: true }))
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
})

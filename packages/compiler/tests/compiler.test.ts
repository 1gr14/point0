import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Compiler } from '../src/compiler.js'

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
        const compiler = Compiler.create({ side: 'client', scope: 'test' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.modified).toBe(true)
        expect(result.code).toContain('Point0.lets')
      }),
    )

    it.concurrent(
      'respects side option - client',
      helper(async ({ files: [file] }) => {
        await file.write(`const env=require('@point0/core'); if (env.side.is.client) console.info('client')`)
        const compiler = Compiler.create({ side: 'client', scope: 'test' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`console.info('client')`)
      }),
    )

    it.concurrent(
      'respects side option - server',
      helper(async ({ files: [file] }) => {
        await file.write(`const env=require('@point0/core'); if (env.side.is.server) console.info('server')`)
        const compiler = Compiler.create({ side: 'server', scope: 'test' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`console.info('server')`)
      }),
    )

    it.concurrent(
      'removes dead guarded expression for false && branch',
      helper(async ({ files: [file] }) => {
        await file.write(`const env=require('@point0/core'); env.side.is.server && console.info('server')`)
        const compiler = Compiler.create({ side: 'client', scope: 'test' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`console.info('server')`)
      }),
    )

    it.concurrent(
      'removes dead guarded expression for true || branch',
      helper(async ({ files: [file] }) => {
        await file.write(`const env=require('@point0/core'); env.side.is.client || console.info('client')`)
        const compiler = Compiler.create({ side: 'client', scope: 'test' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`console.info('client')`)
      }),
    )

    it.concurrent(
      'removes dead if block for false condition',
      helper(async ({ files: [file] }) => {
        await file.write(`const env=require('@point0/core'); if (env.side.is.client) { console.info('client') }`)
        const compiler = Compiler.create({ side: 'server', scope: 'test' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`console.info('client')`)
      }),
    )

    it.concurrent(
      'removes import declaration when all imported bindings are pruned',
      helper(async ({ files: [file] }) => {
        await file.write(`import { prisma } from './lib/prisma'
const env=require('@point0/core'); env.side.is.server && prisma.idea.findMany()`)
        const compiler = Compiler.create({ side: 'client', scope: 'test' })
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
        const compiler = Compiler.create({ side: 'client', scope: 'test' })
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
const env=require('@point0/core'); env.side.is.server && prisma.idea.findMany()`)
        const compiler = Compiler.create({ side: 'client', scope: 'test' })
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
        const compiler = Compiler.create({ side: 'server', scope: 'test' })
        const result = compiler.compile({ file: file.path })
        console.info(result.code)
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`from '@point0/core'`)
        expect(result.code).not.toContain(`my-client-component`)
      }),
    )

    it.concurrent(
      'respects scope option',
      helper(async ({ files: [file] }) => {
        await file.write(`const env=require('@point0/core'); if (env.scope.is.test) console.info('test')`)
        const compiler = Compiler.create({ side: 'client', scope: 'test' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`console.info('test')`)
      }),
    )

    it.concurrent(
      'respects consts option',
      helper(async ({ files: [file] }) => {
        await file.write(`const env=require('@point0/core'); if (env.vars.TEST_VAR) console.info('test')`)
        const compiler = Compiler.create({ side: 'client', scope: 'test', consts: [{ TEST_VAR: true }] })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain(`console.info('test')`)
      }),
    )

    it.concurrent(
      'replaces process.env bracket access using consts',
      helper(async ({ files: [file] }) => {
        await file.write(`import { env } from '@point0/core'; if (process.env['TEST_VAR']) console.info('test')`)
        const compiler = Compiler.create({ side: 'client', scope: 'test', consts: [{ TEST_VAR: false }] })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain(`console.info('test')`)
      }),
    )

    it.concurrent(
      'replaces import.meta.env bracket access using consts',
      helper(async ({ files: [file] }) => {
        await file.write(`import { env } from '@point0/core'; if (import.meta.env['TEST_VAR']) console.info('test')`)
        const compiler = Compiler.create({ side: 'client', scope: 'test', consts: [{ TEST_VAR: false }] })
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
        const compiler = Compiler.create({ side: 'client', scope: 'test', hmrFix: true })
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
        const compiler = Compiler.create({ side: 'client', scope: 'test', hmrFix: false })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain('._tail')
      }),
    )

    it.concurrent(
      'handles file with no points',
      helper(async ({ files: [file] }) => {
        await file.write(`console.info('hello')`)
        const compiler = Compiler.create({ side: 'client', scope: 'test' })
        const result = compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(0)
        expect(result.modified).toBe(false)
      }),
    )
  })
})

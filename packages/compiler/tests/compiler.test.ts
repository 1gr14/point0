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
        const compiler = Compiler.create({ target: 'client' })
        const result = await compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.modified).toBe(true)
        expect(result.code).toContain('Point0.lets')
      }),
    )

    it.concurrent(
      'respects target option - client',
      helper(async ({ files: [file] }) => {
        await file.write(`const runtime=require('@point0/runtime'); if (runtime.is.client) console.info('client')`)
        const compiler = Compiler.create({ target: 'client' })
        const result = await compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain('if (true)')
      }),
    )

    it.concurrent(
      'respects target option - server',
      helper(async ({ files: [file] }) => {
        await file.write(`const runtime=require('@point0/runtime'); if (runtime.is.server) console.info('server')`)
        const compiler = Compiler.create({ target: 'server' })
        const result = await compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain('if (true)')
      }),
    )

    it.concurrent(
      'respects isEngineHolderBuildPhase option',
      helper(async ({ files: [file] }) => {
        await file.write(
          `const runtime=require('@point0/runtime'); shakeItOnEngineHolderBuildPhase(() => console.info('test'))`,
        )
        const compiler = Compiler.create({ target: 'client', isEngineHolderBuildPhase: true })
        const result = await compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain('throw new Error("Not available after build")')
      }),
    )

    it.concurrent(
      'respects hmrFixPolicy option - functionDeclaration',
      helper(async ({ files: [file] }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
        `)
        const compiler = Compiler.create({ target: 'client', hmrFixPolicy: 'functionDeclaration' })
        const result = await compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain('._hmr(function X()')
      }),
    )

    it.concurrent(
      'respects hmrFixPolicy option - arrowFunctionExpression',
      helper(async ({ files: [file] }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
        `)
        const compiler = Compiler.create({ target: 'client', hmrFixPolicy: 'arrowFunctionExpression' })
        const result = await compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).toContain('._hmr(() =>')
      }),
    )

    it.concurrent(
      'respects hmrFixPolicy option - none',
      helper(async ({ files: [file] }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
        `)
        const compiler = Compiler.create({ target: 'client', hmrFixPolicy: 'none' })
        const result = await compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.code).not.toContain('._hmr')
      }),
    )

    it.concurrent(
      'handles file with no points',
      helper(async ({ files: [file] }) => {
        await file.write(`console.log('hello')`)
        const compiler = Compiler.create({ target: 'client' })
        const result = await compiler.compile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(0)
        expect(result.modified).toBe(true)
      }),
    )
  })
})

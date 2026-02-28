import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping'
import { beforeAll, describe, expect, it } from 'bun:test'
import { transform as esbuildTransform } from 'esbuild'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Compiler } from '../src/compiler.js'
import { compilerVitePlugin } from '../src/plugin/vite.js'

const tempDir = nodePath.join(__dirname, 'temp/sourcemap')

const sourceCode = `import { env } from '@point0/core'

export function ideaLoader() {
  if (env.side.is.server) {
    const error = new Error('test error')
    console.error(444, error)
    throw error
    return 202
  }
  return 200
}
`

const sourceCodeViteLike = `import { useState } from 'react'
import { Link } from '@/lib/navigate'
import { ideaLayout } from '../layouts/idea.js'

// const getIdea = async (ctx: Ctx, id: number) => {
//   const idea = await ctx.prisma.idea.findUniqueOrThrow({
//     where: { id },
//   })
//   return { idea }
// }

export const ideaPage = ideaLayout
  .lets('page', 'idea', '/')
  .loader(async ({ ctx, input }) => {
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: +input.id },
    })
    const error = new Error('test error')
    console.error(444, error)
    throw error
    return { idea }
  })
  .page(({ props: { idea }, location }) => {
    const [state, setState] = useState(() => 0)
    return (
      <div onClick={() => setState(state + 1)}>
        <p>{idea.description}</p>
        <p>{JSON.stringify(location)}</p>
      </div>
    )
  })

export default ideaPage
`

function lineOf(content: string, search: string) {
  const line = content.split('\n').findIndex((item) => item.includes(search)) + 1
  if (!line) {
    throw new Error(`Line with "${search}" not found`)
  }
  return line
}

function positionOf(content: string, search: string) {
  const line = lineOf(content, search)
  const sourceLine = content.split('\n')[line - 1] ?? ''
  const column = sourceLine.indexOf(search)
  if (column < 0) {
    throw new Error(`Column for "${search}" not found`)
  }
  return { line, column }
}

function positionOfRegex(content: string, pattern: RegExp, search: string) {
  const line = content.split('\n').findIndex((item) => pattern.test(item)) + 1
  if (!line) {
    throw new Error(`Line matching "${pattern.source}" not found`)
  }
  const sourceLine = content.split('\n')[line - 1] ?? ''
  const column = sourceLine.indexOf(search)
  if (column < 0) {
    throw new Error(`Column for "${search}" not found in regex-matched line`)
  }
  return { line, column }
}

function getInlineSourceMapFromCode(code: string) {
  const match = code.match(/\/\/# sourceMappingURL=data:application\/json[^,]*,([A-Za-z0-9+/=]+)\s*$/m)
  const encodedMap = match?.[1]
  if (!encodedMap) {
    throw new Error('Inline sourcemap was not found in transformed code')
  }
  return JSON.parse(Buffer.from(encodedMap, 'base64').toString('utf8')) as ConstructorParameters<typeof TraceMap>[0]
}

describe('Compiler sourcemaps', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  it('maps throw line correctly in Vite plugin output', async () => {
    const filepath = nodePath.join(tempDir, `${crypto.randomUUID()}.tsx`)
    await Bun.write(filepath, sourceCode)
    try {
      const plugin = compilerVitePlugin({ side: 'server', scope: 'test', hmrFix: false })
      const transform = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform?.handler
      expect(typeof transform).toBe('function')
      if (!transform) return

      const transformed = await transform.call({} as never, sourceCode, filepath)
      expect(transformed && typeof transformed !== 'string').toBe(true)
      if (!transformed || typeof transformed === 'string' || !transformed.map) return
      if (typeof transformed.code !== 'string') return

      const generatedThrowPos = positionOf(transformed.code, 'throw error')
      const sourceThrowPos = positionOf(sourceCode, 'throw error')
      const mapInput = typeof transformed.map === 'string' ? JSON.parse(transformed.map) : transformed.map
      if (!mapInput) return
      const traceMap = new TraceMap(mapInput)
      const original = originalPositionFor(traceMap, generatedThrowPos)

      expect(original.line).toBe(sourceThrowPos.line)
    } finally {
      await Bun.file(filepath).delete()
    }
  })

  it('keeps accurate line mapping after Vite-like esbuild map composition', async () => {
    const filepath = nodePath.join(tempDir, `${crypto.randomUUID()}.tsx`)
    await Bun.write(filepath, sourceCodeViteLike)
    try {
      const plugin = compilerVitePlugin({ side: 'server', scope: 'test' })
      const transform = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform?.handler
      expect(typeof transform).toBe('function')
      if (!transform) return

      const transformed = await transform.call({} as never, sourceCodeViteLike, filepath)
      expect(transformed && typeof transformed !== 'string').toBe(true)
      if (!transformed || typeof transformed === 'string' || !transformed.map) return
      if (typeof transformed.code !== 'string') return
      const mapInput = typeof transformed.map === 'string' ? JSON.parse(transformed.map) : transformed.map
      if (!mapInput) return

      const codeWithInlineMap = `${transformed.code}\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(
        JSON.stringify(mapInput),
        'utf8',
      ).toString('base64')}\n`
      const esbuildResult = await esbuildTransform(codeWithInlineMap, {
        loader: 'tsx',
        format: 'esm',
        sourcemap: 'external',
        sourcefile: filepath,
      })

      const generatedErrorPos = positionOfRegex(esbuildResult.code, /new Error\(/, 'new Error(')
      const sourceErrorPos = positionOf(sourceCodeViteLike, "const error = new Error('test error')")
      const esbuildMap = JSON.parse(esbuildResult.map) as ConstructorParameters<typeof TraceMap>[0]
      const original = originalPositionFor(new TraceMap(esbuildMap), generatedErrorPos)

      expect(original.line).toBe(sourceErrorPos.line)
    } finally {
      await Bun.file(filepath).delete()
    }
  })

  it('preserves multiline chain layout in Vite plugin output', async () => {
    const filepath = nodePath.join(tempDir, `${crypto.randomUUID()}.tsx`)
    await Bun.write(filepath, sourceCodeViteLike)
    try {
      const plugin = compilerVitePlugin({ side: 'server', scope: 'test' })
      const transform = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform?.handler
      expect(typeof transform).toBe('function')
      if (!transform) return

      const transformed = await transform.call({} as never, sourceCodeViteLike, filepath)
      expect(transformed && typeof transformed !== 'string').toBe(true)
      if (!transformed || typeof transformed === 'string') return
      if (typeof transformed.code !== 'string') return

      expect(transformed.code).toContain("export const ideaPage = ideaLayout\n  .lets('page', 'idea', '/')\n  .loader(")
    } finally {
      await Bun.file(filepath).delete()
    }
  })

  it('preserves parenthesized expression structure during env replacement', async () => {
    const filepath = nodePath.join(tempDir, `${crypto.randomUUID()}.ts`)
    const source = `import { env } from '@point0/core'
export const value = ((env.side.is.server)) ? 1 : 2
`
    await Bun.write(filepath, source)
    try {
      const compiler = Compiler.create({ side: 'server', scope: 'test', hmrFix: false })
      const result = compiler.compile({ file: filepath })
      expect(result.modified).toBe(true)
      expect(result.code).toMatch(/value\s*=\s*\(\(\s*true/)
    } finally {
      await Bun.file(filepath).delete()
    }
  })

  // it.only('maps throw line correctly in Bun plugin output', async () => {
  //   const filepath = nodePath.join(tempDir, `${crypto.randomUUID()}.tsx`)
  //   await Bun.write(filepath, sourceCode)
  //   try {
  //     const plugin = compilerBunPlugin({ side: 'server', scope: 'test', hmrFix: false })
  //     let onLoadHandler: ((args: { path: string }) => unknown | Promise<unknown>) | undefined
  //     await plugin.setup({
  //       onLoad(_opts: { filter: RegExp }, handler: (args: { path: string }) => unknown | Promise<unknown>) {
  //         onLoadHandler = handler
  //       },
  //     } as never)

  //     expect(typeof onLoadHandler).toBe('function')
  //     if (!onLoadHandler) return

  //     const loaded = (await onLoadHandler({ path: filepath })) as { contents: string }
  //     const loadedMap = getInlineSourceMapFromCode(loaded.contents)
  //     const generatedThrowPos = positionOf(loaded.contents, 'throw error')
  //     const sourceThrowPos = positionOf(sourceCode, 'throw error')
  //     const original = originalPositionFor(new TraceMap(loadedMap), generatedThrowPos)

  //     expect(original.line).toBe(sourceThrowPos.line)
  //   } finally {
  //     await Bun.file(filepath).delete()
  //   }
  // })
})

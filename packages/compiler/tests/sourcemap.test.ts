import { beforeAll, describe, expect, it } from 'bun:test'
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { compilerBunPlugin } from '../src/plugin/bun.js'
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

  it('maps throw line correctly in Bun plugin output', async () => {
    const filepath = nodePath.join(tempDir, `${crypto.randomUUID()}.tsx`)
    await Bun.write(filepath, sourceCode)
    try {
      const plugin = compilerBunPlugin({ side: 'server', scope: 'test', hmrFix: false })
      let onLoadHandler: ((args: { path: string }) => unknown | Promise<unknown>) | undefined
      await plugin.setup({
        onLoad(
          _opts: { filter: RegExp },
          handler: (args: { path: string }) => unknown | Promise<unknown>,
        ) {
          onLoadHandler = handler
        },
      } as never)

      expect(typeof onLoadHandler).toBe('function')
      if (!onLoadHandler) return

      const loaded = (await onLoadHandler({ path: filepath })) as { contents: string }
      const loadedMap = getInlineSourceMapFromCode(loaded.contents)
      const generatedThrowPos = positionOf(loaded.contents, 'throw error')
      const sourceThrowPos = positionOf(sourceCode, 'throw error')
      const original = originalPositionFor(new TraceMap(loadedMap), generatedThrowPos)

      expect(original.line).toBe(sourceThrowPos.line)
    } finally {
      await Bun.file(filepath).delete()
    }
  })
})

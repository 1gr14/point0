import { Compiler } from '../compiler.js'
import type { CompilerOptions } from '@point0/core'

export function compilerBabelPlugin(_babel: never, options: CompilerOptions | Compiler) {
  const compiler = options instanceof Compiler ? options : Compiler.create(options)

  return {
    parserOverride(
      code: string,
      parserOptions: { sourceFileName?: string },
      parse: (code: string, options: unknown) => unknown,
    ) {
      const filename = parserOptions.sourceFileName
      if (!filename || !compiler.filter.test(filename)) {
        return parse(code, parserOptions)
      }

      try {
        const result = compiler.compile({
          content: code,
          file: filename,
        })
        return parse(result.code, parserOptions)
      } catch (e) {
        console.error('[point0-compiler]', e)
        return parse(code, parserOptions)
      }
    },
  }
}

export default compilerBabelPlugin

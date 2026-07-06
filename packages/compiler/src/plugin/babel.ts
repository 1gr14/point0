import { log } from '@point0/core'
import { Compiler } from '../compiler.js'
import type { CompilerOptions } from '../compiler.js'
import { virtualModulePathRegex } from '../importer.js'

export function compilerBabelPlugin(_babel: never, options: CompilerOptions) {
  const compiler = options instanceof Compiler ? options : Compiler.create(options)

  return {
    parserOverride(
      code: string,
      parserOptions: { sourceFileName?: string },
      parse: (code: string, options: unknown) => unknown,
    ) {
      const filename = parserOptions.sourceFileName
      if (!filename || !compiler.filter.test(filename) || virtualModulePathRegex.test(filename)) {
        return parse(code, parserOptions)
      }

      try {
        const result = compiler.compile({
          content: code,
          file: filename,
          writeVirtual: true,
        })
        return parse(result.code, parserOptions)
      } catch (e) {
        log({
          level: 'error',
          category: ['compiler'],
          message: 'Compiler transform failed (non-critical) — serving the file untransformed',
          error: e,
        })
        return parse(code, parserOptions)
      }
    },
  }
}

export default compilerBabelPlugin

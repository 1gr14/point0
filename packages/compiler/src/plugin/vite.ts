import type { Plugin } from 'vite'
import type { CompilerOptions } from '../compiler.js'
import { Compiler } from '../compiler.js'

export function compilerVitePlugin(options: CompilerOptions | Compiler): Plugin {
  const compiler =
    options instanceof Compiler
      ? options
      : Compiler.create({
          ...options,
        })
  return {
    name: 'point0-compiler',
    enforce: 'pre',
    transform(code, id) {
      const [filepath] = id.split('?', 1)
      if (!compiler.filter.test(filepath)) return null
      const result = compiler.compile({
        content: code,
        file: filepath,
      })

      if (!result.modified) return null
      const codeAndMap = result.file?.toCodeWithMap()

      if (filepath.includes('pages/idea.tsx')) {
        console.log(111, codeAndMap?.code)
      }

      return {
        code: codeAndMap?.code ?? result.code,
        map: codeAndMap?.map ?? null,
      }
    },
  }
}

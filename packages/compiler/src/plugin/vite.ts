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
        map: true,
      })

      // if (filepath.includes('page.tsx')) {
      //   console.log(111, result.code)
      // }

      if (!result.modified) return null

      return {
        code: result.code,
        map: result.map,
      }
    },
  }
}

import MagicString from 'magic-string'
import type { Plugin } from 'vite'
import type { CompilerOptions } from '../compiler.js'
import { Compiler } from '../compiler.js'

export function compilerVitePlugin(options: CompilerOptions | Compiler): Plugin {
  const compiler =
    options instanceof Compiler
      ? options
      : Compiler.create({
          ...options,
          hmrFixPolicy: options.hmrFixPolicy ?? (process.env.NODE_ENV !== 'production' ? 'function' : 'none'),
        })
  return {
    name: 'point0-compiler',
    enforce: 'pre',
    async transform(code, id, options) {
      const [filepath] = id.split('?', 1)
      if (!compiler.compilerFilepathFilter.test(filepath)) return null
      const result = await compiler.compile({
        content: code,
        file: filepath,
      })

      if (!result.modified) return null

      const ms = new MagicString(code)
      ms.overwrite(0, code.length, result.code)

      return {
        code: result.code,
        map: ms.generateMap({
          source: filepath,
          includeContent: true,
          hires: true,
        }),
      }
    },
  }
}

import type { Plugin } from 'vite'
import { Compiler } from '../compiler.js'
import type { CompilerOptions } from '../compiler.js'
import { virtualModulePathRegex } from '../importer.js'

export function compilerVitePlugin(options: CompilerOptions | Compiler): Plugin {
  const compiler =
    options instanceof Compiler
      ? options
      : Compiler.create({
          ...options,
        })
  const virtualPrefix = '\0'
  const stripVirtualPrefix = (id: string) => (id.startsWith(virtualPrefix) ? id.slice(1) : id)

  return {
    name: 'point0-compiler',
    enforce: 'pre',
    resolveId(source) {
      if (!virtualModulePathRegex.test(source)) return null
      return `${virtualPrefix}${source}`
    },
    load(id) {
      const normalizedId = stripVirtualPrefix(id)
      if (!virtualModulePathRegex.test(normalizedId)) return null

      const result = compiler.compile({
        file: normalizedId,
        map: true,
      })

      return {
        code: result.code,
        map: result.map,
      }
    },
    transform(code, id) {
      const normalizedId = stripVirtualPrefix(id)
      const [filepath] = normalizedId.split('?', 1)
      if (!compiler.filter.test(filepath)) return null
      const result = compiler.compile({
        content: code,
        file: normalizedId,
        map: true,
      })

      if (!result.modified) return null

      return {
        code: result.code,
        map: result.map,
      }
    },
  }
}

import type { Plugin } from 'vite'
import { Walker } from './walker.js'
import MagicString from 'magic-string'

export function prunerVitePlugin({ customer }: { customer: 'client' | 'serverSsr' | 'serverNoSsr' }): Plugin {
  return {
    name: 'point0-pruner',
    enforce: 'pre',
    async transform(code, id, options) {
      const [filepath] = id.split('?', 1)
      if (!/\.[cm]?[tj]sx?$/.test(filepath)) return null
      if (filepath.includes('node_modules')) return null

      const walker = new Walker()
      const transformed = await walker.prune({ content: code, fileAbs: filepath, customer })
      if (transformed === code) return null

      const ms = new MagicString(code)
      ms.overwrite(0, code.length, transformed)

      return {
        code: transformed,
        map: ms.generateMap({
          source: filepath,
          includeContent: true,
          hires: true,
        }),
      }
    },
  }
}

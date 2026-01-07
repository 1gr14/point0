import MagicString from 'magic-string'
import type { Plugin } from 'vite'
import { compile, compilerFilepathFilter } from '../index.js'

export function compilerVitePlugin({
  target,
  isEngineHolderBuildPhase,
}: {
  target: 'client' | 'server'
  isEngineHolderBuildPhase?: boolean
}): Plugin {
  return {
    name: 'point0-compiler',
    enforce: 'pre',
    async transform(code, id, options) {
      const [filepath] = id.split('?', 1)
      if (!compilerFilepathFilter.test(filepath)) return null
      const result = await compile({
        content: code,
        file: filepath,
        target,
        isEngineHolderBuildPhase,
        hmrFixPolicy: 'functionDeclaration',
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

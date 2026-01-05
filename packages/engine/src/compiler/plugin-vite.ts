import type { PointsScope } from '@point0/core'
import MagicString from 'magic-string'
import type { Plugin } from 'vite'
import type { PruneCustomer } from './collector.js'
import { Collector } from './collector.js'

export function compilerVitePlugin({
  customer,
  scope,
  includedNodeModulesPrefixes: providedIncludedNodeModulesPrefixes = [],
}: {
  customer: PruneCustomer
  scope: PointsScope | null
  includedNodeModulesPrefixes?: string[]
}): Plugin {
  function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  const includedNodeModulesPrefixes = ['@point0/', ...providedIncludedNodeModulesPrefixes]
  const prefixPattern = includedNodeModulesPrefixes.map((p) => escapeRegExp(p)).join('|')
  const filter = new RegExp(`^(?!.*node_modules/(?!(${prefixPattern}))).*\\.[cm]?[tj]sx?$`)
  return {
    name: 'point0-compiler',
    enforce: 'pre',
    async transform(code, id, options) {
      const [filepath] = id.split('?', 1)
      if (!filter.test(filepath)) return null

      const collector = new Collector()
      let transformed = await collector.prunePoint0Methods({ content: code, fileAbs: filepath, customer })
      transformed = await collector.prunePoint0ClientServer({ content: transformed, fileAbs: filepath, customer })
      transformed = await collector.pruneForBuildInProgress({
        content: transformed,
        fileAbs: filepath,
        customer,
      })
      if (process.env.NODE_ENV !== 'production' && customer === 'client') {
        transformed = await collector.addHmrToNonComponentPoints({ content: transformed, fileAbs: filepath, customer })
      }

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

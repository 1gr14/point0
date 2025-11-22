import type { BunPlugin } from 'bun'
// import MagicString from 'magic-string'
import type { PointsScope } from '@point0/core/types'
import type { PruneCustomer } from './walker.js'
import { Walker } from './walker.js'

export function prunerBunPlugin({
  customer,
  scope,
  includedNodeModulesPrefixes: providedIncludedNodeModulesPrefixes = [],
}: {
  customer: PruneCustomer
  scope: PointsScope | null
  includedNodeModulesPrefixes: string[]
}): BunPlugin {
  return {
    name: 'point0-pruner',
    setup(build) {
      function escapeRegExp(str: string) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      }
      const includedNodeModulesPrefixes = ['@point0/', ...providedIncludedNodeModulesPrefixes]
      const prefixPattern = includedNodeModulesPrefixes.map((p) => escapeRegExp(p)).join('|')
      const filter = new RegExp(`^(?!.*node_modules/(?!(${prefixPattern}))).*\\.[cm]?[tj]sx?$`)
      build.onLoad({ filter }, async (args) => {
        let original: string | undefined
        const filepath = args.path
        try {
          original = await Bun.file(filepath).text()
          const walker = new Walker()
          const transformed = await walker.prunePoint0Methods({
            content: original,
            fileAbs: filepath,
            customer,
          })

          if (transformed === original) {
            return {
              contents: original,
              loader: guessLoader(filepath),
            }
          }

          // const ms = new MagicString(original)
          // ms.overwrite(0, original.length, transformed)

          return {
            contents: transformed,
            loader: guessLoader(filepath),
            // sourcemap: ms.generateMap({
            //   source: filepath,
            //   includeContent: true,
            //   hires: true,
            // }),
          }
        } catch (e) {
          console.error(e)
          return {
            contents: original ?? '',
            loader: guessLoader(filepath),
          }
        }
      })
    },
  } satisfies BunPlugin
}

function guessLoader(path: string) {
  if (path.endsWith('.ts')) return 'ts'
  if (path.endsWith('.tsx')) return 'tsx'
  if (path.endsWith('.jsx')) return 'jsx'
  return 'js'
}

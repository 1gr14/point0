import type { BunPlugin } from 'bun'
// import MagicString from 'magic-string'
import type { PointsScope } from '@point0/core'
import type { PruneCustomer } from './collector.js'
import { Collector } from './collector.js'

export function compilerBunPlugin({
  customer,
  scope,
  includedNodeModulesPrefixes: providedIncludedNodeModulesPrefixes = [],
}: {
  customer: PruneCustomer
  scope: PointsScope | null
  includedNodeModulesPrefixes?: string[]
}): BunPlugin {
  return {
    name: 'point0-compiler',
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
          const walker = new Collector()
          let transformed = await walker.prunePoint0Methods({
            content: original,
            fileAbs: filepath,
            customer,
          })
          transformed = await walker.prunePoint0ClientServer({
            content: transformed,
            fileAbs: filepath,
            customer,
          })
          transformed = await walker.pruneForBuildInProgress({
            content: transformed,
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

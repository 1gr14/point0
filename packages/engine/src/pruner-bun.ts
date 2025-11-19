import type { BunPlugin } from 'bun'
// import MagicString from 'magic-string'
import { Walker } from './walker.js'

export function prunerBunPlugin({ target }: { target: 'client' | 'server-ssr' | 'server-nossr' }): BunPlugin {
  return {
    name: 'point0-pruner',
    setup(build) {
      build.onLoad(
        { filter: /\.[cm]?[tj]sx?$/ }, // JS/TS files
        async (args) => {
          const filepath = args.path

          if (filepath.includes('node_modules')) return

          const original = await Bun.file(filepath).text()
          const walker = new Walker()
          const transformed = await walker.prune({
            content: original,
            fileAbs: filepath,
            target,
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
        },
      )
    },
  } satisfies BunPlugin
}

function guessLoader(path: string) {
  if (path.endsWith('.ts')) return 'ts'
  if (path.endsWith('.tsx')) return 'tsx'
  if (path.endsWith('.jsx')) return 'jsx'
  return 'js'
}

import type { BunPlugin } from 'bun'
// import MagicString from 'magic-string'
import { compile, compilerFilepathFilter } from '../index.js'

export function compilerBunPlugin({
  target,
  isEngineHolderBuildPhase,
}: {
  target: 'client' | 'server'
  isEngineHolderBuildPhase?: boolean
}): BunPlugin {
  return {
    name: 'point0-compiler',
    setup(build) {
      build.onLoad({ filter: compilerFilepathFilter }, async (args) => {
        const filepath = args.path
        try {
          const result = await compile({
            file: filepath,
            target,
            isEngineHolderBuildPhase,
            hmrFixPolicy: 'arrowFunctionExpression',
          })
          if (!result.modified) {
            return {
              contents: result.code,
              loader: guessLoader(filepath),
            }
          }

          // const ms = new MagicString(original)
          // ms.overwrite(0, original.length, transformed)

          return {
            contents: result.code,
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
            // TODO:ASAP
            contents: '',
            // contents: CompilerFile.getCachedContentOrUndefined(filepath) ?? '',
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

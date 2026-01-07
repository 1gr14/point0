import type { BunPlugin } from 'bun'
// import MagicString from 'magic-string'
import type { CompilerOptions } from '../compiler.js'
import { Compiler } from '../compiler.js'

export function compilerBunPlugin(options: CompilerOptions | Compiler): BunPlugin {
  const compiler =
    options instanceof Compiler
      ? options
      : Compiler.create({
          ...options,
          hmrFixPolicy: options.hmrFixPolicy ?? (process.env.NODE_ENV !== 'production' ? 'externalFunction' : 'none'),
        })
  return {
    name: 'point0-compiler',
    setup(build) {
      build.onLoad({ filter: compiler.compilerFilepathFilter }, async (args) => {
        const filepath = args.path
        try {
          const result = await compiler.compile({
            file: filepath,
          })
          if (!result.modified) {
            return {
              contents: result.code,
              loader: guessLoader(filepath),
            }
          }
          if (filepath === '/Users/iserdmi/cc/opensource/devp0nt/point0/examples/basic/src/pages/home.tsx') {
            console.info('result.modified', result.modified)
            console.info('result.code', result.code)
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

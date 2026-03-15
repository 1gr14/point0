import type { BunPlugin } from 'bun'
import type { CompilerOptions } from '../compiler.js'
import { Compiler } from '../compiler.js'

export function compilerBunPlugin(options: CompilerOptions | Compiler): BunPlugin {
  const compiler =
    options instanceof Compiler
      ? options
      : Compiler.create({
          ...options,
        })
  return {
    name: 'point0-compiler',
    setup(build) {
      build.onLoad({ filter: compiler.filter }, (args) => {
        const filepath = args.path
        try {
          const result = compiler.compile({
            file: filepath,
          })
          if (!result.modified) {
            return {
              contents: result.code,
              loader: guessLoader(filepath),
            }
          }

          return {
            // contents: appendInlineSourceMap(result.code, result.map),
            contents: result.code,
            loader: guessLoader(filepath),
          }
        } catch (e) {
          console.error(e)
          return {
            contents: '',
            // contents: CompilerFile.getCachedContentOrUndefined(filepath) ?? '',
            loader: guessLoader(filepath),
          }
        }
      })
    },
  } satisfies BunPlugin
}

// function appendInlineSourceMap(code: string, map: Record<string, unknown> | undefined) {
//   if (!map) return code
//   const encoded = Buffer.from(JSON.stringify(map), 'utf8').toString('base64')
//   return `${code}\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${encoded}\n`
// }

function guessLoader(path: string) {
  if (path.endsWith('.ts')) return 'ts'
  if (path.endsWith('.tsx')) return 'tsx'
  if (path.endsWith('.jsx')) return 'jsx'
  return 'js'
}

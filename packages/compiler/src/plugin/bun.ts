import type { BunPlugin, OnLoadResult } from 'bun'
import nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Compiler } from '../compiler.js'
import type { CompilerOptions } from '../compiler.js'
import { createVirtualModuleCode, parseVirtualModulePath, virtualModulePathRegex } from '../importer.js'
import { getHash, resolveTempDirPath } from '../utils.js'

export function compilerBunPlugin(options: CompilerOptions | Compiler): BunPlugin {
  const compiler =
    options instanceof Compiler
      ? options
      : Compiler.create({
          ...options,
        })
  const tempDir = resolveTempDirPath(['compiler-bun-plugin'])
  nodeFs.mkdirSync(tempDir, { recursive: true })

  // everything may be easy if namespaces will correctly works on server side
  // but they works only while build or static site runtime
  // so we need to save our virtual modules to real files

  return {
    name: 'point0-compiler',
    setup(build) {
      const loader = (filepath: string): OnLoadResult => {
        // console.log('loader', filepath)
        try {
          const result = compiler.compile({
            file: filepath,
          })
          return {
            contents: result.code,
            loader: guessLoader(filepath),
          }
        } catch (e) {
          console.error(e)
          const contents = (() => {
            try {
              return nodeFs.readFileSync(filepath, 'utf-8')
            } catch {
              return ''
            }
          })()
          return {
            contents,
            loader: guessLoader(filepath),
          }
        }
      }
      build.onResolve({ filter: virtualModulePathRegex }, (args) => {
        const options = parseVirtualModulePath(args.path)
        const hash = getHash(args.path)
        const filePath = nodePath.join(tempDir, hash + '.js')
        const { code, error } = createVirtualModuleCode(options)
        if (error) {
          if (compiler.importer.onDeny === 'exit') {
            console.error(error)
            process.exit(1)
          } else if (compiler.importer.onDeny === 'throw') {
            throw new Error(error)
          } else {
            console.error(error)
          }
        }
        if (!nodeFs.existsSync(filePath)) {
          nodeFs.writeFileSync(filePath, code)
        }
        return {
          path: filePath,
          namespace: 'file',
        }
      })
      build.onLoad({ filter: compiler.filter }, (args) => {
        return loader(args.path)
      })
    },
  } satisfies BunPlugin
}

function guessLoader(path: string): Bun.Loader {
  const cleanedPath = path.toLowerCase().replace(/[?#].*$/, '')
  const filename = cleanedPath.split('/').pop() ?? cleanedPath

  if (filename.endsWith('.tsx')) return 'tsx'
  if (filename.endsWith('.ts')) return 'ts'
  if (filename.endsWith('.jsx')) return 'jsx'
  if (filename.endsWith('.js') || filename.endsWith('.mjs') || filename.endsWith('.cjs')) {
    return 'js'
  }

  if (filename.endsWith('.json')) return 'json'
  if (filename.endsWith('.jsonc')) return 'jsonc'
  if (filename.endsWith('.toml')) return 'toml'
  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'yaml'

  if (filename.endsWith('.node')) return 'napi'
  if (filename.endsWith('.wasm')) return 'wasm'
  if (filename.endsWith('.css')) return 'css'
  if (filename.endsWith('.html') || filename.endsWith('.htm')) return 'html'

  // Common text-like assets.
  if (
    filename.endsWith('.txt') ||
    filename.endsWith('.md') ||
    filename.endsWith('.csv') ||
    filename.endsWith('.xml') ||
    filename.endsWith('.svg')
  ) {
    return 'text'
  }

  // Common binary/static assets.
  if (
    filename.endsWith('.png') ||
    filename.endsWith('.jpg') ||
    filename.endsWith('.jpeg') ||
    filename.endsWith('.gif') ||
    filename.endsWith('.webp') ||
    filename.endsWith('.avif') ||
    filename.endsWith('.ico') ||
    filename.endsWith('.bmp') ||
    filename.endsWith('.mp3') ||
    filename.endsWith('.wav') ||
    filename.endsWith('.ogg') ||
    filename.endsWith('.mp4') ||
    filename.endsWith('.webm') ||
    filename.endsWith('.mov') ||
    filename.endsWith('.woff') ||
    filename.endsWith('.woff2') ||
    filename.endsWith('.ttf') ||
    filename.endsWith('.otf') ||
    filename.endsWith('.eot') ||
    filename.endsWith('.pdf') ||
    filename.endsWith('.zip') ||
    filename.endsWith('.gz')
  ) {
    return 'file'
  }

  // Runtime transpilation target is usually JavaScript.
  return 'js'
}

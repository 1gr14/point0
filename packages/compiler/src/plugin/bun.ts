import type { BunPlugin, OnLoadResult } from 'bun'
import nodeFs from 'node:fs'
import { applyAssetsBunPlugin } from '../assets.js'
import { Compiler } from '../compiler.js'
import type { CompilerOptions } from '../compiler.js'
import { appendInlineSourceMap, getDevSourceMapRegistry } from '../sourcemap.js'
import { CriticalCompilerError } from '../error.js'
import { virtualModulePathRegex } from '../importer.js'

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
      // everything may be easy if namespaces will correctly works on server side
      // but they works only while build or static site runtime
      // so we need to save our virtual modules to real files
      const isNormalBundler = 'onStart' in build

      const loader = (filepath: string): OnLoadResult => {
        try {
          const result = compiler.compile({
            file: filepath,
            map: true,
            writeVirtual: !isNormalBundler,
            // pruneWalker: !isNormalBundler,
          })
          // Dev runtime only (not the bundler): stash the map so source-map-support can remap this file's stack frames.
          if (!isNormalBundler && result.map) {
            getDevSourceMapRegistry().set(
              filepath,
              typeof result.map === 'string' ? result.map : JSON.stringify(result.map),
            )
          }
          return {
            contents: appendInlineSourceMap(result.code, result.map),
            loader: guessLoader(filepath),
          }
        } catch (e) {
          if (e instanceof CriticalCompilerError) {
            throw e
          }
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
      if (isNormalBundler) {
        build.onResolve({ filter: virtualModulePathRegex }, (args) => {
          return {
            path: args.path,
            namespace: 'point0-virtual',
          }
        })
        build.onLoad({ filter: virtualModulePathRegex, namespace: 'point0-virtual' }, (args) => {
          return loader(args.path)
        })
      }
      build.onLoad({ filter: compiler.filter }, (args) => {
        return loader(args.path)
      })
      // Managed static-asset imports (`./x.png`, `?url`/`?file`/`?text`/`?react`) ride inside this plugin, gated on
      // `compiler.assets` (carried on the compiler like `filter`/`markdown`/`babel`, so the options and instance forms
      // behave the same). `false` → the bundler's native asset behavior.
      if (compiler.assets) {
        void applyAssetsBunPlugin(build, compiler.assets)
      }
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

  // MARKDOWN
  if (filename.endsWith('.md') || filename.endsWith('.mdx') || filename.endsWith('.mdc')) {
    return 'js'
  }

  if (filename.endsWith('.node')) return 'napi'
  if (filename.endsWith('.wasm')) return 'wasm'
  if (filename.endsWith('.css')) return 'css'
  if (filename.endsWith('.html') || filename.endsWith('.htm')) return 'html'

  // Common text-like assets.
  if (
    filename.endsWith('.txt') ||
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

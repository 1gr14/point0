import { log } from '@point0/core'
import type { BunPlugin, OnLoadResult } from 'bun'
import nodeFs from 'node:fs'
import { applyAssetsBunPlugin } from '../assets.js'
import { Compiler } from '../compiler.js'
import type { CompilerOptions } from '../compiler.js'
import { appendInlineSourceMap, getDevSourceMapRegistry } from '../sourcemap.js'
import { CriticalCompilerError } from '../error.js'
import { virtualModulePathRegex } from '../importer.js'
import { POINT0_COMPILER_PLUGIN_NAME, POINT0_VIRTUAL_MODULE_NAMESPACE } from '../protocol.js'

export function compilerBunPlugin(options: CompilerOptions | Compiler): BunPlugin {
  const compiler =
    options instanceof Compiler
      ? options
      : Compiler.create({
          ...options,
        })

  return {
    name: POINT0_COMPILER_PLUGIN_NAME,
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
          log({
            level: 'error',
            category: ['compiler'],
            message: 'Compiler transform failed (non-critical) — serving the file untransformed',
            error: e,
          })
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
            namespace: POINT0_VIRTUAL_MODULE_NAMESPACE,
          }
        })
        build.onLoad({ filter: virtualModulePathRegex, namespace: POINT0_VIRTUAL_MODULE_NAMESPACE }, (args) => {
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

export function guessLoader(path: string): Bun.Loader {
  const cleanedPath = path.toLowerCase().replace(/[?#].*$/, '')
  const filename = cleanedPath.split('/').pop() ?? cleanedPath

  if (filename.endsWith('.tsx')) return 'tsx'
  // `.mts`/`.cts` are TypeScript too, and `compiler.filter` accepts them (`[cm]?[jt]sx?`) — without these they fell
  // through to the `js` default at the bottom and their type annotations failed to parse.
  if (filename.endsWith('.ts') || filename.endsWith('.mts') || filename.endsWith('.cts')) return 'ts'
  // `.js` gets `js`, NOT `jsx`, even though Bun's own by-extension default for `.js` is jsx-enabled. The plugin claims
  // more than app source: `compiler.filter` deliberately keeps `node_modules` paths containing "point0", so every
  // `@point0/*` dist bundle comes through here, and reading shipped JavaScript with the JSX grammar changes what a
  // bare `<` means in it. Tried the other way — `dev-hot-reload.e2e` broke. {@link relocatedExtension} is what keeps
  // the hot store in step with this choice.
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

/**
 * The extension a copy of `path` must carry when it is moved somewhere this plugin does NOT claim — today, the
 * hot-reload store's flattened modules, imported as plain files: there the loader comes from the NAME, so the name must
 * yield the same loader {@link guessLoader} hands the bundler for the original. `loader-dialect.unit.test.ts` checks the
 * pairing cell by cell.
 *
 * Most extensions are their own answer. `.js` and markdown are not: `guessLoader` gives both the strict `js` loader,
 * but Bun's by-extension default for `.js` is jsx-enabled — so they move as `.mjs`, the extension whose default IS
 * plain-js. (Fine for markdown too: it is compiled to JS before it is moved. point0 is ESM-only, so `.mjs` loses
 * nothing.)
 */
export function relocatedExtension(path: string): string {
  const cleanedPath = path.toLowerCase().replace(/[?#].*$/, '')
  const ext = /\.[^./\\]+$/.exec(cleanedPath)?.[0] ?? ''
  if (ext === '.js' || ext === '.md' || ext === '.mdx' || ext === '.mdc') return '.mjs'
  return ext
}

import { log } from '@point0/core'
import type { Plugin } from 'vite'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { DEFAULT_ASSET_EXTENSIONS, assetHash, svgrToJsx, viteAssetMode, writeAssetOnce } from '../assets.js'
import { Compiler } from '../compiler.js'
import type { CompilerOptions } from '../compiler.js'
import { CriticalCompilerError } from '../error.js'
import { virtualModulePathRegex } from '../importer.js'

export function compilerVitePlugin(options: CompilerOptions | Compiler): Plugin {
  const compiler =
    options instanceof Compiler
      ? options
      : Compiler.create({
          ...options,
        })
  const virtualPrefix = '\0'
  const stripVirtualPrefix = (id: string) => (id.startsWith(virtualPrefix) ? id.slice(1) : id)

  /**
   * Handle a managed static-asset import under Vite. Returns the module source for `?text`/`?file`/`?react`, or `null`
   * to let Vite's natives handle it (`?url`/`?raw`/bare → Vite's own asset URL). Mirrors the Bun pipeline so the two
   * bundlers agree on the resolved value.
   */
  const loadAsset = async (id: string) => {
    // Read off the compiler (like `filter`/`markdown`/`babel`), so the options and `Compiler`-instance forms match.
    // A local `const` (not `compiler.assets` inline) keeps the narrowing below stable across the `await`s.
    const assets = compiler.assets
    if (!assets) return null
    const queryIndex = id.indexOf('?')
    const filepath = queryIndex === -1 ? id : id.slice(0, queryIndex)
    const query = queryIndex === -1 ? '' : id.slice(queryIndex + 1)
    const ext = nodePath.extname(filepath).toLowerCase().replace(/^\./, '')
    const extensions = assets.extensions ?? DEFAULT_ASSET_EXTENSIONS
    if (!extensions.includes(ext)) return null
    const mode = viteAssetMode(query, assets.defaultMode)
    if (!mode) return null // `?url` / `?raw` / bare(url) → leave to Vite's natives

    if (mode === 'text') {
      const text = await nodeFs.promises.readFile(filepath, 'utf8')
      return { code: `export default ${JSON.stringify(text)}` }
    }

    if (mode === 'react') {
      const svgr = assets.svgr
      if (svgr === false) return null // disabled → let the user's own svgr plugin (if any) claim it
      if (ext !== 'svg') {
        throw new Error(`[point0] assets: \`?react\` is only supported for .svg files (got "${filepath}")`)
      }
      const svg = await nodeFs.promises.readFile(filepath, 'utf8')
      const jsx = await svgrToJsx(svg, svgr, filepath)
      // SVGR emits JSX, and Vite won't auto-transform a `.svg?react` id — so transpile it ourselves with Vite's own
      // esbuild (`transformWithEsbuild`, available whatever Vite bundles with). Classic JSX matches SVGR's
      // `import * as React`. Lazy-imported so `vite` stays out of the module graph for Bun-only consumers.
      const { transformWithEsbuild } = await import('vite')
      const res = await transformWithEsbuild(jsx, filepath, { loader: 'jsx' })
      return { code: res.code, map: res.map }
    }

    // mode === 'file'. `compiler.built` (set per-build by the engine — true for `vite build`, false for dev) is the
    // same signal as Vite's `config.command`, so we read it off the compiler rather than tracking the command ourselves.
    if (!compiler.built || !assets.fileDir) {
      // Dev (or no fileDir): the source file is on disk — hand back its real path for the server to read at runtime.
      return { code: `export default ${JSON.stringify(filepath)}` }
    }
    const buffer = await nodeFs.promises.readFile(filepath)
    const name = `${assetHash(buffer)}.${ext}`
    await writeAssetOnce(assets.fileDir, name, buffer)
    // Resolve next to the emitted server chunk at runtime, cwd-independent (same shape as the Bun build). `fileURLToPath`
    // (not `URL.pathname`) is required for a usable filesystem path on Windows, where `pathname` is the URL form `/C:/…`.
    return {
      code: `import { fileURLToPath as __p0FileURLToPath } from 'node:url'\nexport default __p0FileURLToPath(new URL(${JSON.stringify('./' + name)}, import.meta.url))`,
    }
  }

  return {
    name: 'point0-compiler',
    enforce: 'pre',
    resolveId(source) {
      if (!virtualModulePathRegex.test(source)) return null
      return `${virtualPrefix}${source}`
    },
    async load(id) {
      // Static assets first (`?text`/`?file`/`?react`); everything else falls through to virtual-module compilation.
      const asset = await loadAsset(id)
      if (asset) return asset
      try {
        const normalizedId = stripVirtualPrefix(id)
        if (!virtualModulePathRegex.test(normalizedId)) return null

        const result = compiler.compile({
          file: normalizedId,
          map: true,
        })

        return {
          code: result.code,
          map: result.map,
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
        return null
      }
    },
    transform(code, id) {
      try {
        const normalizedId = stripVirtualPrefix(id)
        const [filepath] = normalizedId.split('?', 1)
        if (!compiler.filter.test(filepath)) return null
        const result = compiler.compile({
          content: code,
          file: normalizedId,
          map: true,
        })

        if (!result.modified) return null

        return {
          code: result.code,
          map: result.map,
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
        return null
      }
    },
  }
}

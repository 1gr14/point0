import type { BunPlugin } from 'bun'
import crypto from 'node:crypto'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { DEV_SSR_FIX_ASSETS_URL_PREFIX, resolveDevSsrFixAssetsDir } from '../utils.js'

/**
 * Dev-only, Bun-only fix for static asset imports. See the long note next to {@link DEV_SSR_FIX_ASSETS_URL_PREFIX} in
 * `../utils.ts` for the why. This module is a self-contained {@link BunPlugin} with its own filter, deliberately kept
 * out of the main `compilerBunPlugin` so it can be injected only where it's needed (dev + Bun, both the browser dev
 * server and the SSR runtime), never in builds or Vite, and removed wholesale when Bun fixes its runtime loader.
 *
 * What it does: intercept `file`-loader asset imports, copy the bytes into a content-addressed cache, and rewrite the
 * import to a stable `${DEV_SSR_FIX_ASSETS_URL_PREFIX}<hash>.<ext>` URL. Because the _same_ plugin runs in both the
 * browser and SSR passes, both sides emit the identical URL → hydration matches, and the engine serves the bytes back
 * from the same cache (no absolute paths in HTML, no arbitrary file reads).
 */

// Extensions Bun resolves to its `file` loader (a path/URL) rather than inlining — the only ones affected by the
// runtime-vs-bundler mismatch. This is everything EXCEPT Bun's built-in inlining loaders (js/jsx/ts/tsx/json/jsonc/
// toml/txt/css/html/wasm/node). Note `svg`/`csv`/`xml` belong here too: `guessLoader` (./bun.ts) maps them to `text`,
// but that branch is dead for assets (the compiler's filter only matches js/ts/md), so at runtime Bun's default `file`
// loader handles them — and they hit the exact same SSR abs-path bug as images. Verified empirically; `txt` does NOT
// (Bun has a built-in `text` loader for it), so it's intentionally absent.
const ASSET_EXTENSIONS = [
  // images
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'ico',
  'bmp',
  'svg',
  // audio / video
  'mp3',
  'wav',
  'ogg',
  'mp4',
  'webm',
  'mov',
  // fonts
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  // other binary / data files Bun serves as files (not txt — that has a built-in text loader)
  'pdf',
  'zip',
  'gz',
  'csv',
  'xml',
]

const assetFilter = new RegExp(`\\.(${ASSET_EXTENSIONS.join('|')})(\\?.*|#.*)?$`, 'i')

const hashContent = (buffer: Buffer): string => crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16)

export const makeDevSsrFixAssetsBunPlugin = (): BunPlugin => ({
  name: 'point0-dev-ssr-fix-assets',
  setup(build) {
    const cacheDir = resolveDevSsrFixAssetsDir()

    build.onLoad({ filter: assetFilter }, async (args) => {
      const filePath = args.path.replace(/[?#].*$/, '')
      const buffer = await nodeFs.promises.readFile(filePath)
      const ext = nodePath.extname(filePath).toLowerCase()
      const name = `${hashContent(buffer)}${ext}`
      const dest = nodePath.join(cacheDir, name)

      // Content-addressed: identical bytes → identical name, so writing is idempotent and safe across the separate
      // browser/SSR processes that both hit this plugin. Write to a pid-tagged temp then rename, so a concurrent
      // reader never sees a half-written file.
      try {
        await nodeFs.promises.access(dest)
      } catch {
        const tmp = `${dest}.${process.pid}.tmp`
        try {
          await nodeFs.promises.writeFile(tmp, buffer)
          await nodeFs.promises.rename(tmp, dest)
        } catch {
          await nodeFs.promises.rm(tmp, { force: true }).catch(() => {})
          // A lost race is fine — the winner wrote identical bytes to `dest`. But a genuine write failure (disk full,
          // perms) would leave nothing to serve and 404 later, so surface it rather than failing silently.
          const cached = await nodeFs.promises.access(dest).then(
            () => true,
            () => false,
          )
          if (!cached) {
            console.warn(`[point0] dev-ssr-fix-assets: failed to cache asset "${filePath}"`)
          }
        }
      }

      const url = `${DEV_SSR_FIX_ASSETS_URL_PREFIX}${name}`
      return { contents: `export default ${JSON.stringify(url)}`, loader: 'js' }
    })
  },
})

export default makeDevSsrFixAssetsBunPlugin()

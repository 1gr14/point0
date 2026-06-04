import type { CompilerEnvConsts, CompilerEnvConstsNormalized } from './compiler.js'
import * as nodeFsSync from 'node:fs'
import * as nodePath from 'node:path'
import crypto from 'node:crypto'

export const normalizeEnvConsts = (consts: CompilerEnvConsts): CompilerEnvConstsNormalized => {
  if (!consts) {
    return []
  }
  if (typeof consts === 'string') {
    return [consts]
  }
  if (typeof consts === 'object' && !Array.isArray(consts)) {
    return [consts]
  }
  return consts
}

export const resolveTempDirPath = (subdir: string[] = []): string => {
  let dir = process.cwd()
  let lastDir = ''

  // Walk up until we find a node_modules folder
  while (dir !== lastDir) {
    const candidate = nodePath.join(dir, 'node_modules')
    if (nodeFsSync.existsSync(candidate)) {
      const tempDir = nodePath.join(candidate, '.cache', '@point0', ...subdir)
      nodeFsSync.mkdirSync(tempDir, { recursive: true })
      return tempDir
    }

    // Move one level up
    lastDir = dir
    dir = nodePath.dirname(dir)
  }

  // Fallback: if no node_modules found, use system tmp
  // const fallback = nodePath.join(nodeFsSync.realpathSync(nodeOs.tmpdir()), '@point0', ...subdir)
  // nodeFsSync.mkdirSync(fallback, { recursive: true })
  // return fallback
  throw new Error('No node_modules found. Please run "bun install" in the project root.')
}

export const getHash = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Dev-only, Bun-only workaround for static asset imports (`import logo from './logo.png'`).
 *
 * In dev the SSR code runs through the **Bun runtime**, whose default loader for `file`-loader assets returns the
 * file's _absolute path on disk_ instead of a served URL. The browser bundle (Bun's HTML dev server) resolves the same
 * import to a hashed URL, so SSR HTML and client disagree → broken hydration + a 404 image. After `Bun.build` (server
 * build / prod) this is a non-issue — the bundler resolves assets correctly — and Vite has its own asset pipeline. So
 * this fix is intentionally scoped to **dev + Bun only** and lives in its own opt-out plugin
 * (`@point0/compiler/plugin/bun-plugin-dev-ssr-fix-assets`), to be deleted once Bun fixes the runtime loader.
 *
 * The constants below are the single source of truth shared by that plugin (which rewrites the import to this URL and
 * caches the bytes content-addressed) and the engine (which serves the URL back from the same cache).
 */
export const DEV_SSR_FIX_ASSETS_URL_PREFIX = '/_point0/asset/'

/** Content-addressed cache the plugin writes to and the engine serves from. Stable across every process of one app. */
export const resolveDevSsrFixAssetsDir = (): string => resolveTempDirPath(['dev-ssr-fix-assets'])

/** On by default; set `POINT0_DEV_SSR_FIX_ASSETS=false` (or `0`) to disable the whole workaround. */
export const isDevSsrFixAssetsEnabled = (): boolean => {
  const value = process.env.POINT0_DEV_SSR_FIX_ASSETS
  return value !== 'false' && value !== '0'
}

/** Served names are flat and content-addressed (`<hash>.<ext>`) — no slashes, so no path traversal. */
export const devSsrFixAssetNameRegex = /^[a-f0-9]{8,}\.[a-z0-9]+$/i

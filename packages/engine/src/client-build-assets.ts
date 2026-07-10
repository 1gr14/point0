import { ASSET_URL_PREFIX } from '@point0/compiler'
import { POINT0_BUILD_ASSETS_FILE_NAME, POINT0_INTERNAL_PATH_PREFIX, POINT0_INTERNAL_URL_PREFIX } from '@point0/core'
import type { PointsScope } from '@point0/core'
import { toPublicPath } from './utils.js'

/**
 * Client build assets manifest — the build-side list of every emitted file whose NAME carries a content hash (bundler
 * chunks including the entry, plus `_point0/assets/*`). Such a URL can never serve different bytes, so this set is
 * exactly the `asset` request variant.
 *
 * Emitted to `<outdir>/_point0/<scope>/build-assets.json` at build time and read ONLY by the server's fetcher (to
 * classify a publicdir-served file as `asset` vs plain `publicdir`). Kept separate from the client-fetched
 * `build-version.json` on purpose: that file is polled by the browser (`cache: 'no-store'`) just to compare the deploy
 * version and must stay tiny, while this list grows with the app and is server-only — never sent over the wire. The
 * version in `build-version.json` is the hash of exactly this file set (see `client-build-version.ts`).
 */
export type ClientBuildAssetsFile = {
  /** Sorted, deduped public paths of every content-hashed emitted file — the `asset` variant set. */
  files: string[]
}

/** Outdir-relative path segments of a client's build assets file (posix-joined they form its public URL path). */
export const getClientBuildAssetsPathSegments = (scope: PointsScope): string[] => [
  POINT0_INTERNAL_PATH_PREFIX,
  scope,
  POINT0_BUILD_ASSETS_FILE_NAME,
]

/**
 * Whether an emitted file identifies the build — i.e. carries a content hash in its name. Excluded: `.html` (stable
 * names, mutable content), sourcemaps (never navigated to; excluding them keeps the version stable across
 * sourcemap-mode changes), and the per-client `_point0/<scope>/` metadata files (`preload-manifest.json`, the
 * version/assets files themselves — stable names, mutable content). `_point0/assets/*` stays IN: those are the
 * compiler's content-addressed asset bytes (unscoped — shared, content-addressed).
 */
const identifiesBuild = (publicPath: string): boolean => {
  if (publicPath.endsWith('.html') || publicPath.endsWith('.map')) {
    return false
  }
  if (publicPath.startsWith(POINT0_INTERNAL_URL_PREFIX) && !publicPath.startsWith(ASSET_URL_PREFIX)) {
    return false
  }
  return true
}

/**
 * The content-hashed public paths of a client build, from its emitted output files (Bun.build outputs or Rollup
 * fileNames — absolute, cwd-relative, or outdir-relative; normalized to public paths). Sorted and deduped: this exact
 * list is persisted as {@link ClientBuildAssetsFile.files}, and its hash is the build version.
 */
export const collectClientBuildHashedFiles = ({
  outputFiles,
  outdir,
}: {
  outputFiles: string[]
  outdir: string
}): string[] => [...new Set(outputFiles.map((file) => toPublicPath(file, outdir)).filter(identifiesBuild))].sort()

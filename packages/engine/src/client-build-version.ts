import { POINT0_BUILD_VERSION_FILE_NAME, POINT0_INTERNAL_PATH_PREFIX } from '@point0/core'
import type { PointsScope } from '@point0/core'
import { collectClientBuildHashedFiles } from './client-build-assets.js'

/**
 * Client build version — the build-side half of point0's deploy invalidation (the client-side half lives in
 * `@point0/core`'s stale module).
 *
 * Each client build gets a deterministic version and emits it to `<outdir>/_point0/<scope>/build-version.json`. Because
 * the file is emitted INTO the client build output, it travels with the chunks wherever they are hosted (the point0
 * server, a static host, a CDN) and is always fetchable from the same base the chunks load from. Two consumers:
 *
 * - The CLIENT fetches it (never cached — the fetch itself is `cache: 'no-store'`) when a page chunk fails to load, to
 *   confirm whether a newer build was deployed.
 * - The SERVER reads it at serve time to echo the version on every response (the `x-point0-client-build` handshake).
 *
 * Kept to a single field so the browser-polled file stays tiny; the content-hashed file list the version is derived
 * from lives separately, server-only, in `build-assets.json` (see `client-build-assets.ts`).
 */
export type ClientBuildVersionFile = {
  /**
   * Deterministic identity of this client build: a hash of the sorted public paths of every emitted content-hashed
   * file. Chunk names already carry content hashes, so any code change changes the path set and therefore the version;
   * an identical rebuild keeps it. Deliberately derived from NAMES, not file contents: names are what an old client
   * requests, and a bundler that renames chunks without a code change only causes a harmless extra "new version" signal
   * — never a missed one.
   */
  buildVersion: string
}

/** Outdir-relative path segments of a client's build version file (posix-joined they form its public URL path). */
export const getClientBuildVersionPathSegments = (scope: PointsScope): string[] => [
  POINT0_INTERNAL_PATH_PREFIX,
  scope,
  POINT0_BUILD_VERSION_FILE_NAME,
]

/**
 * Hash a set of public paths into a build version. Order-insensitive (sorted, deduped) so bundler emission order never
 * shakes the version; 16 hex chars of SHA-256 — plenty against accidental collision, short enough for a header.
 */
export const computeClientBuildVersion = (publicPaths: string[]): string => {
  const normalized = [...new Set(publicPaths)].sort()
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(normalized.join('\n'))
  return hasher.digest('hex').slice(0, 16)
}

/**
 * Compute the build version from the emitted output files of a client build (Bun.build outputs or Rollup fileNames —
 * absolute, cwd-relative, or outdir-relative; normalized to public paths). The version is the hash of the same
 * content-hashed file set persisted to `build-assets.json`.
 */
export const computeClientBuildVersionFromOutputs = ({
  outputFiles,
  outdir,
}: {
  outputFiles: string[]
  outdir: string
}): string => computeClientBuildVersion(collectClientBuildHashedFiles({ outputFiles, outdir }))

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

/**
 * Resolve (and create) a directory under the nearest `node_modules/.cache/`, walking up from cwd. The single source of
 * truth for "where point0 keeps its build/dev scratch dirs". `segments` are joined under `.cache`, so the caller picks
 * the namespace — e.g. `['@point0', 'generator']` for the standard temp dir, or `['server-hot', scope]` for the dev
 * hot-reload store (kept OUT of the `@point0` namespace on purpose; see `@point0/engine`'s server-hot-store).
 */
export const resolveCacheDirPath = (segments: string[]): string => {
  let dir = process.cwd()
  let lastDir = ''

  // Walk up until we find a node_modules folder
  while (dir !== lastDir) {
    const candidate = nodePath.join(dir, 'node_modules')
    if (nodeFsSync.existsSync(candidate)) {
      const cacheDir = nodePath.join(candidate, '.cache', ...segments)
      nodeFsSync.mkdirSync(cacheDir, { recursive: true })
      return cacheDir
    }

    // Move one level up
    lastDir = dir
    dir = nodePath.dirname(dir)
  }

  throw new Error('No node_modules found. Please run "bun install" in the project root.')
}

/** Standard point0 temp dir: `node_modules/.cache/@point0/<subdir>`. Thin wrapper over {@link resolveCacheDirPath}. */
export const resolveTempDirPath = (subdir: string[] = []): string => {
  return resolveCacheDirPath(['@point0', ...subdir])
}

export const getHash = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex')
}

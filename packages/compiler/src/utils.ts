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

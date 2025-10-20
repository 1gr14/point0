import * as nodePath from 'node:path'
import * as nodeFs from 'node:fs'

export const toPathsOrUndefined = (path: string | string[] | undefined): string[] | undefined => {
  if (!path) {
    return undefined
  }
  return Array.isArray(path) ? path : [path]
}

export const absPath = (basepath: string | undefined, path: string | undefined): string | undefined => {
  if (!path) {
    return undefined
  }
  if (!basepath) {
    if (!nodePath.isAbsolute(path)) {
      throw new Error(`Path "${path}" is not absolute, but should be`)
    }
    return path
  }
  if (!nodePath.isAbsolute(basepath)) {
    throw new Error(`Basepath "${basepath}" is not absolute, but should be`)
  }
  return nodePath.resolve(basepath, path)
}

export const relPath = (basepath: string | undefined, path: string | undefined): string | undefined => {
  if (!path) {
    return undefined
  }
  if (!basepath) {
    return path
  }
  if (!nodePath.isAbsolute(basepath)) {
    throw new Error(`Basepath "${basepath}" is not absolute, but should be`)
  }
  return nodePath.relative(basepath, path)
}

export const parsePaths = (basepath: string | undefined, path: string[] | string | undefined): string[] => {
  if (!path) {
    return []
  }
  const paths = Array.isArray(path) ? path : [path]
  return paths.flatMap((path) => absPath(basepath, path) ?? [])
}

export const findFirstExistsFilePath = (path: string[] | string | undefined): string | undefined => {
  if (!path) {
    return undefined
  }
  const paths = Array.isArray(path) ? path : [path]
  for (const path of paths) {
    if (nodeFs.existsSync(path)) {
      return path
    }
  }
  return undefined
}

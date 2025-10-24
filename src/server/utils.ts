import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'

export const toPathsOrUndefined = (path: string | string[] | undefined): string[] | undefined => {
  if (!path) {
    return undefined
  }
  return Array.isArray(path) ? path : [path]
}

export const absPath = (dirname: string | undefined, path: string | undefined): string | undefined => {
  if (!path) {
    return undefined
  }
  if (!dirname) {
    if (!nodePath.isAbsolute(path)) {
      throw new Error(`Path "${path}" is not absolute, but should be`)
    }
    return path
  }
  if (!nodePath.isAbsolute(dirname)) {
    throw new Error(`Basepath "${dirname}" is not absolute, but should be`)
  }
  return nodePath.resolve(dirname, path)
}

export const relPath = (dirname: string | undefined, path: string | undefined): string | undefined => {
  if (!path) {
    return undefined
  }
  if (!dirname) {
    return path
  }
  if (!nodePath.isAbsolute(dirname)) {
    throw new Error(`Basepath "${dirname}" is not absolute, but should be`)
  }
  return nodePath.relative(dirname, path)
}

export const parsePaths = (dirname: string | undefined, path: string[] | string | undefined): string[] => {
  if (!path) {
    return []
  }
  const paths = Array.isArray(path) ? path : [path]
  return paths.flatMap((path) => absPath(dirname, path) ?? [])
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

export const pickNonUniqArrayElements = (array: Array<string | undefined>) => {
  const uniqElements: { [element: string]: number } = {}
  const nonUniqElements: { [element: string]: number } = {}
  for (const [index, element] of array.entries()) {
    if (uniqElements[element || 'undefined']) {
      nonUniqElements[element || 'undefined'] = index
    } else {
      uniqElements[element || 'undefined'] = index
    }
  }
  return nonUniqElements
}

export const throwOnNonUniqueArrayElements = (array: Array<string | undefined>, message: string) => {
  const nonUniqElements = pickNonUniqArrayElements(array)
  if (Object.keys(nonUniqElements).length > 0) {
    throw new Error(
      `${message}: ${Object.entries(nonUniqElements)
        .map(([element, index]) => `${element} at index ${index}`)
        .join(', ')}`,
    )
  }
}

export const prependAndAppendSlash = <T extends string | undefined>(path: T): T => {
  if (!path) {
    return undefined as T
  }
  return ('/' + path.replace(/^\//, '').replace(/\/$/, '').replace(/\/\/+/g, '/') + '/') as T
}

export const isPathnameUnderBasepath = (pathname: string, basepath: string | undefined) => {
  if (!basepath) {
    return false
  }
  return pathname.startsWith(basepath) || pathname.replace(/\/$/, '') === basepath.replace(/\/$/, '')
}

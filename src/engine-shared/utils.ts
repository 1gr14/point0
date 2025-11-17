import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'

// export const responseWithWrappers = ({
//   response,
//   onResponse,
//   generalOnResponse,
// }: {
//   response: Response
//   onResponse: ((response: Response) => Response) | undefined
//   generalOnResponse: ((response: Response) => Response) | undefined
// }): Response => {
//   if (generalOnResponse) {
//     response = generalOnResponse(response)
//   }
//   if (onResponse) {
//     response = onResponse(response)
//   }
//   return response
// }

// export const mergeWrapResponseFns = (wrapResponseFns: WrapResponseFn[]): WrapResponseFn => {
//   return async ({ request, response }) => {
//     for (const wrapResponseFn of wrapResponseFns) {
//       response = await wrapResponseFn({ request, response })
//     }
//     return response
//   }
// }

// export const mergeWrapRequestFns = (wrapRequestFns: WrapRequestFn[]): WrapRequestFn => {
//   // const seen = new Set<WrapRequestFn>()
//   return async ({ request }) => {
//     for (const wrapRequestFn of wrapRequestFns) {
//       // if (seen.has(wrapRequestFn)) {
//       //   continue
//       // }
//       // seen.add(wrapRequestFn)
//       const response = await wrapRequestFn({ request })
//       if (response) {
//         return response
//       }
//     }
//     return undefined
//   }
// }

export const toPathsOrUndefined = (path: string | string[] | undefined): string[] | undefined => {
  if (!path) {
    return undefined
  }
  return Array.isArray(path) ? path : [path]
}

export const toAbsPath = <T extends string | undefined | null>(cwd: string | undefined, path: T): T => {
  if (!path) {
    return undefined as T
  }
  if (!cwd) {
    if (!nodePath.isAbsolute(path)) {
      throw new Error(`Path "${path}" is not absolute, but should be`)
    }
    return path
  }
  if (!nodePath.isAbsolute(cwd)) {
    throw new Error(`Cwd "${cwd}" is not absolute, but should be`)
  }
  return nodePath.resolve(cwd, path) as T
}

export const toRelPath = <T extends string | undefined | null>(cwd: string | undefined, path: T): T => {
  if (!path) {
    return undefined as T
  }
  if (!cwd) {
    return path as T
  }
  if (!nodePath.isAbsolute(cwd)) {
    throw new Error(`Cwd "${cwd}" is not absolute, but should be`)
  }
  return nodePath.relative(cwd, path) as T
}

export const toAbsPaths = (cwd: string | undefined, path: Array<string | undefined> | string | undefined): string[] => {
  if (!path) {
    return []
  }
  const paths = Array.isArray(path) ? path : [path]
  return paths.flatMap((path) => toAbsPath(cwd, path) ?? [])
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

export const dedupeSlashes = (path: string) => {
  return path.replace(/\/\/+/g, '/')
}

export const prependAndDeappendSlash = <T extends string | undefined | null>(path: T): T => {
  if (!path) {
    return undefined as T
  }
  let result = '/' + path.replace(/^\//, '')
  result = result.replace(/\/\/+/g, '/')
  result = result.replace(/\/$/, '')
  return result as T
}

export const prependAndAppendSlash = <T extends string | undefined | null>(path: T): T => {
  if (!path) {
    return undefined as T
  }
  return (prependAndAppendSlash(path) + '/') as T
}

// export const isPathnameUnderBasepath = (pathname: string, basepath: string | undefined) => {
//   if (!basepath) {
//     return false
//   }
//   return pathname.startsWith(basepath) || pathname.replace(/\/$/, '') === basepath.replace(/\/$/, '')
// }

export const getDirByPaths = ({
  paths,
  fallbackDir,
  pathsHasGlob = null,
  pathsHasFiles = null,
  pathsHasDirs = null,
}: {
  paths: string[]
  fallbackDir: string
  pathsHasGlob?: boolean | null
  pathsHasFiles?: boolean | null
  pathsHasDirs?: boolean | null
}): string => {
  if (paths.length === 0) {
    return fallbackDir
  }

  function stripGlobParts(p: string): string {
    if (pathsHasGlob === false) {
      return p
    }
    const parts = p.split(nodePath.sep)
    const globIndex = parts.findIndex((part) => /[*?[\]]/.test(part)) // detect glob chars
    if (globIndex >= 0) {
      return parts.slice(0, globIndex).join(nodePath.sep) || nodePath.sep
    }
    return p
  }

  const exts = ['.ts', '.tsx', '.js', '.mjs', '.cjs']
  function isFile(path: string): boolean {
    if (pathsHasFiles === false) {
      return false
    }
    if (pathsHasDirs === false && pathsHasFiles === true) {
      return true
    }
    return exts.some((ext) => path.endsWith(ext))
  }

  // Strip glob parts first
  const stripped = paths.map(stripGlobParts)

  // Map each path to its directory (if path is a file) or keep as-is (if directory)
  const dirs = stripped.map((p) => (isFile(p) ? nodePath.dirname(p) : p))

  // Reduce to deepest common ancestor directory
  let commonDir = dirs[0]
  for (let i = 1; i < dirs.length; i++) {
    let dir = dirs[i]

    while (
      commonDir !== dir &&
      !dir.startsWith(commonDir.endsWith(nodePath.sep) ? commonDir : commonDir + nodePath.sep)
    ) {
      const next = nodePath.dirname(commonDir)
      if (next === commonDir) break
      commonDir = next
    }
    while (commonDir !== dir && !commonDir.startsWith(dir.endsWith(nodePath.sep) ? dir : dir + nodePath.sep)) {
      const next = nodePath.dirname(dir)
      if (next === dir) break
      dir = next
    }
    commonDir = commonDir.length <= dir.length ? commonDir : dir
  }
  return commonDir
}

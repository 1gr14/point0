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

import { createJiti } from 'jiti'
import type { ViteDevServer } from 'vite'
import type { LazyPointsModule, ReadyPointsModule } from '../core/points.js'
import { Points } from '../core/points.js'
import type { EngineOptionsEnvParsed, EngineOptionsViteConfig, LoadedViteConfig } from '../engine-shared/config.js'

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

export const toRelPath = (cwd: string | undefined, path: string | undefined): string | undefined => {
  if (!path) {
    return undefined
  }
  if (!cwd) {
    return path
  }
  if (!nodePath.isAbsolute(cwd)) {
    throw new Error(`Cwd "${cwd}" is not absolute, but should be`)
  }
  return nodePath.relative(cwd, path)
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

export const isPathnameUnderBasepath = (pathname: string, basepath: string | undefined) => {
  if (!basepath) {
    return false
  }
  return pathname.startsWith(basepath) || pathname.replace(/\/$/, '') === basepath.replace(/\/$/, '')
}

export const createJitiInstance = (id: string) =>
  createJiti(id, {
    cache: false,
    interopDefault: true,
    moduleCache: false,
    fsCache: false,
    extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs'],
  })

export const createViteDevServerInternal = async ({
  viteConfig,
  clientIndex,
  hmrPort,
}: {
  viteConfig: EngineOptionsViteConfig
  clientIndex: number | null
  hmrPort: number | null
}): Promise<ViteDevServer> => {
  const createServer = await import('vite').then((module) => module.createServer)
  const loadedViteConfig: LoadedViteConfig | undefined =
    typeof viteConfig === 'function'
      ? await viteConfig({ command: 'serve', mode: process.env.NODE_ENV || 'development' })
      : typeof viteConfig === 'string'
        ? await import(viteConfig)
        : await viteConfig
  if (!loadedViteConfig) {
    throw new Error(
      `Vite config not found for ${clientIndex !== null ? `client at position "${clientIndex}"` : 'server'}`,
    )
  }
  console.log({
    hmr:
      loadedViteConfig.server?.hmr === false
        ? false
        : hmrPort === null
          ? false
          : {
              ...(typeof loadedViteConfig.server?.hmr === 'object' ? loadedViteConfig.server.hmr : {}),
              port: hmrPort,
            },
  })
  return await createServer({
    ...loadedViteConfig,
    appType: 'custom',
    server: {
      ...loadedViteConfig.server,
      middlewareMode: true,
      hmr:
        loadedViteConfig.server?.hmr === false
          ? false
          : hmrPort === null
            ? false
            : {
                ...(typeof loadedViteConfig.server?.hmr === 'object' ? loadedViteConfig.server.hmr : {}),
                port: hmrPort,
              },
    },
  })
}

export const createViteDevServerExternal = async ({
  viteConfig,
  clientIndex,
  port,
  hmrPort,
  serverPort,
  env,
}: {
  viteConfig: EngineOptionsViteConfig
  clientIndex: number | null
  port: number
  hmrPort: number | null
  serverPort: number
  env: EngineOptionsEnvParsed
}): Promise<ViteDevServer> => {
  const createServer = await import('vite').then((module) => module.createServer)
  const loadedViteConfig: LoadedViteConfig | undefined =
    typeof viteConfig === 'function'
      ? await viteConfig({ command: 'serve', mode: process.env.NODE_ENV || 'development' })
      : typeof viteConfig === 'string'
        ? // ? await jiti.import(viteConfig, { default: true })
          await import(viteConfig)
        : await viteConfig
  if (!loadedViteConfig) {
    throw new Error(
      `Vite config not found for ${clientIndex !== null ? `client at position "${clientIndex}"` : 'server'}`,
    )
  }
  return await createServer({
    ...loadedViteConfig,
    appType: 'custom',
    server: {
      ...loadedViteConfig.server,
      port,
      // middlewareMode: false,
      middlewareMode: true,
      // proxy: {
      //   '/_point0': `http://localhost:${serverPort}`,
      // },
      hmr:
        loadedViteConfig.server?.hmr === false
          ? false
          : hmrPort === null
            ? false
            : {
                ...(typeof loadedViteConfig.server?.hmr === 'object' ? loadedViteConfig.server.hmr : {}),
                port: hmrPort,
              },
    },
    // define: {
    //   ...Object.fromEntries(Object.entries(env).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])),
    //   ...Object.fromEntries(
    //     Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
    //   ),
    // },
  })
}

export const createFreshPoints = async ({
  providedPoints,
  pointsPath,
  viteDevServerInternal,
  clientIndex,
}: {
  providedPoints: Points | null
  pointsPath: string | null
  viteDevServerInternal: ViteDevServer | null
  clientIndex: number | null
}): Promise<Points> => {
  if (providedPoints) {
    return providedPoints
  }
  if (pointsPath) {
    if (viteDevServerInternal) {
      return await Points.read(
        pointsPath,
        async (absPath) => (await viteDevServerInternal.ssrLoadModule(absPath)) as LazyPointsModule | ReadyPointsModule,
      )
      // } else if (jiti) {
      //   return await Points.read(pointsPath, async (absPath) => await jiti.import(absPath))
    } else {
      return Points.create((await import(pointsPath)) as LazyPointsModule | ReadyPointsModule)
    }
  }
  throw new Error(`Points not provided for ${clientIndex !== null ? `client at position "${clientIndex}"` : 'server'}`)
}

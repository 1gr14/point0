import type { DehydratedState } from '@tanstack/react-query'

export function mergeHeaders(
  base?: HeadersInit,
  ...extras: Array<HeadersInit | Record<string, string> | undefined>
): Headers {
  const merged = new Headers(base)
  for (const extra of extras) {
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        merged.set(key, value)
      }
    }
  }
  return merged
}

// export function mergeResolvableHead(...heads: ResolvableHead[]): ResolvableHead {
//   return heads.reduce((acc, head) => _mergeResolvableHead(acc, head), {})
// }

// function _mergeResolvableHead(base?: ResolvableHead, extra?: ResolvableHead): ResolvableHead {
//   if (!base) return extra || {}
//   if (!extra) return base

//   const merged: ResolvableHead = { ...base }

//   for (const [key, value] of Object.entries(extra) as Array<
//     [keyof ResolvableHead, ResolvableHead[keyof ResolvableHead]]
//   >) {
//     if (value == null) continue

//     switch (key) {
//       case 'htmlAttrs':
//       case 'bodyAttrs': {
//         const baseAttrs = (isPlainObject(base[key]) ? base[key] : {}) as Record<string, any>
//         const extraAttrs = (isPlainObject(value) ? value : {}) as Record<string, any>
//         merged[key] = { ...baseAttrs, ...extraAttrs } as any
//         break
//       }

//       case 'meta':
//       case 'link':
//       case 'style':
//       case 'script':
//       case 'noscript': {
//         const baseArr = Array.isArray(base[key]) ? base[key] : []
//         const extraArr = Array.isArray(value) ? value : []
//         merged[key] = [...baseArr, ...extraArr] as any
//         break
//       }

//       case 'templateParams': {
//         const baseParams = isPlainObject(base.templateParams) ? base.templateParams : {}
//         const extraParams = (isPlainObject(value) ? value : {}) as Record<string, any>
//         merged.templateParams = { ...baseParams, ...extraParams }
//         break
//       }

//       default:
//         // For title, base, titleTemplate, etc.
//         ;(merged as any)[key] = value
//         break
//     }
//   }

//   return merged
// }

export function isPlainObject(obj: unknown): obj is Record<string, any> {
  return !!obj && typeof obj === 'object' && !Array.isArray(obj)
}

export const emptyDehydratedState: DehydratedState = {
  queries: [],
  mutations: [],
}

export const parseUrl = (url: string) => {
  const urlObj = new URL(url)
  return {
    urlObj,
    urlStr: url,
  }
}
export type ParsedUrl = {
  urlObj: URL
  urlStr: string
}

// type VisitorFn = (element: React.ReactElement<any>) => void | Promise<void>
// export async function walkElementsAsync(node: ReactNode, visitor: VisitorFn): Promise<void> {
//   if (node == null) return

//   if (Array.isArray(node)) {
//     for (const child of node) {
//       await walkElementsAsync(child, visitor)
//     }
//     return
//   }

//   if (!React.isValidElement(node)) return

//   await visitor(node)

//   const { type, props } = node

//   // If it's a function component, call it to expand children
//   if (typeof type === 'function') {
//     try {
//       const rendered = type(props)
//       await walkElementsAsync(rendered, visitor)
//       return
//     } catch (err) {
//       console.error(err)
//       // Ignore hook errors or components needing context
//       return
//     }
//   }

//   // Otherwise, descend into its children if present
//   if (props?.children) {
//     await walkElementsAsync(props.children, visitor)
//   }
// }

// export const getEnv = <T = unknown>(keys: string | string[]): T | undefined => {
//   if (Array.isArray(keys)) {
//     const values = keys.map((key) => getEnv<T>(key))
//     return values.find((value) => value !== undefined)
//   }

//   const key = keys

//   const fromProcessEnv = (() => {
//     try {
//       // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
//       return Function('return process.env.' + key)() as T | undefined
//     } catch {
//       return undefined
//     }
//   })()

//   const fromImportMeta = (() => {
//     try {
//       // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
//       return Function('return import.meta.env.' + key)() as T | undefined
//     } catch {
//       return undefined
//     }
//   })()

//   return fromProcessEnv ?? fromImportMeta
// }

export const getHostnameOrNull = (baseurl: string | null | undefined): string | null => {
  if (!baseurl) {
    return null
  }
  if (/^https?:\/\//.test(baseurl)) {
    return new URL(baseurl).hostname
  }
  return null
}

export const getBasepathOrNull = (baseurl: string | null | undefined): string | null => {
  if (!baseurl) {
    return null
  }
  if (/^https?:\/\//.test(baseurl)) {
    return new URL(baseurl).pathname
  }
  return baseurl
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
  return (prependAndDeappendSlash(path) + '/') as T
}

export const appendSlash = <T extends string | undefined | null>(path: T): T => {
  if (!path) {
    return undefined as T
  }
  return (path + '/').replace(/\/\/+/g, '/') as T
}

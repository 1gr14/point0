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

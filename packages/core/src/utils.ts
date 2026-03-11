import type { DehydratedState } from '@tanstack/react-query'
import { stringify } from 'safe-stable-stringify'
import type { DataTransformer, DataTransformerExtended, ScrollPositionGetter, ScrollPositionSetter } from './types.js'

export function mergeHeaders(base?: HeadersInit, ...extras: Array<HeadersInit | undefined>): Headers {
  const merged = new Headers(base)
  for (const extra of extras) {
    if (!extra) continue
    const normalized = new Headers(extra)
    normalized.forEach((value, key) => {
      merged.set(key, value)
    })
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

// export const getOriginFromBaseurlOrNull = (baseurl: string | null | undefined): string | null => {
//   if (!baseurl) {
//     return null
//   }
//   if (/^https?:\/\//.test(baseurl)) {
//     return new URL(baseurl).origin
//   }
//   return null
// }

// export const getHostOrNull = (baseurl: string | null | undefined): string | null => {
//   if (!baseurl) {
//     return null
//   }
//   if (/^https?:\/\//.test(baseurl)) {
//     return new URL(baseurl).host
//   }
//   return null
// }

// export const getBasepathOrNull = (baseurl: string | null | undefined): string | null => {
//   if (!baseurl) {
//     return null
//   }
//   if (/^https?:\/\//.test(baseurl)) {
//     return new URL(baseurl).pathname
//   }
//   return baseurl
// }

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

export const deprependSlash = <T extends string | undefined | null>(path: T): T => {
  if (!path) {
    return undefined as T
  }
  return path.replace(/^\/+/, '') as T
}

export const deappendSlash = <T extends string | undefined | null>(path: T): T => {
  if (!path) {
    return undefined as T
  }
  return path.replace(/\/+$/, '') as T
}

export const windowScrollPositionGetter: ScrollPositionGetter = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { x: 0, y: 0 }
  }
  const doc = document.documentElement
  const body = document.body
   
  const x = window.pageXOffset !== undefined ? window.pageXOffset : doc.scrollLeft || body.scrollLeft || 0
   
  const y = window.pageYOffset !== undefined ? window.pageYOffset : doc.scrollTop || body.scrollTop || 0
  return { x, y }
}

export const windowScrollPositionSetter: ScrollPositionSetter = ({ x, y }: { x: number; y: number }) => {
   
  x ??= 0
   
  y ??= 0
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }
  if (typeof window.scrollTo === 'function') {
    window.scrollTo(x, y)
    return
  }
  const doc = document.documentElement
  const body = document.body
  doc.scrollLeft = body.scrollLeft = x
  doc.scrollTop = body.scrollTop = y
}

export const getWindowScrollPositionGetterByElementGetter = (elementGetter: () => HTMLElement | null) => {
  return () => {
    const element = elementGetter()
    if (!element) {
      return { x: 0, y: 0 }
    }
    return { x: element.scrollLeft, y: element.scrollTop }
  }
}

export const getWindowScrollPositionSetterByElementGetter = (elementGetter: () => HTMLElement | null) => {
  return (position: { x: number; y: number }) => {
    const element = elementGetter()
    if (!element) {
      return
    }
    element.scrollLeft = position.x
    element.scrollTop = position.y
  }
}

export const getWindowScrollPositionGetterBySelector = (selector: string) => {
  return getWindowScrollPositionGetterByElementGetter(() => document.querySelector(selector))
}

export const getWindowScrollPositionSetterBySelector = (selector: string) => {
  return getWindowScrollPositionSetterByElementGetter(() => document.querySelector(selector))
}

export const isContainsBinary = (value: unknown): boolean => {
  if (value instanceof File || value instanceof Blob) {
    return true
  }
  if (Array.isArray(value)) {
    return value.some(isContainsBinary)
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some(isContainsBinary)
  }
  return false
}

export const blankDataTransformer: DataTransformer = {
  serialize: (data) => data,
  deserialize: (data) => data,
}

export const toExtendedTransformer = (transformer: DataTransformer): DataTransformerExtended => {
  return {
    serialize: transformer.serialize.bind(transformer),
    deserialize: transformer.deserialize.bind(transformer) as <TData>(data: unknown) => TData,
    stringify: (data) => stringify(transformer.serialize(data)),
    parse: <TData>(stringified: string): TData => transformer.deserialize(JSON.parse(stringified)) as TData,
  }
}

export const blankDataTransformerExtended: DataTransformerExtended = toExtendedTransformer(blankDataTransformer)

const WORD_SEP = /[_\-.:/\\\s]+/g

const splitWords = (str: string): string[] => {
  return (
    str
      .normalize('NFKD')
      // split camelCase / PascalCase boundaries
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(WORD_SEP, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
  )
}

export const toCapitalized = (str: string): string => (str ? str[0].toUpperCase() + str.slice(1) : '')

export const toCamelCase = (str: string): string => {
  const words = splitWords(str)
  if (words.length === 0) return ''

  return (
    words[0].toLowerCase() +
    words
      .slice(1)
      .map((w) => toCapitalized(w.toLowerCase()))
      .join('')
  )
}

export const toPascalCase = (str: string): string => {
  const words = splitWords(str)
  if (words.length === 0) return ''

  const pascal = words.map((w) => toCapitalized(w.toLowerCase())).join('')
  return /^[A-Za-z_$]/.test(pascal) ? pascal : `_${pascal}`
}

export const toKebabCase = (str: string): string => {
  const words = splitWords(str)
  if (words.length === 0) return ''

  return words.map((w) => w.toLowerCase()).join('-')
}

export const generateId = (): string => {
  try {
    // for server and modern clients
    return crypto.randomUUID()
  } catch {
    // for old clients
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

export const getCallerLocation = (skip = 2): FsLocation | undefined => {
  const stack = new Error().stack
  if (!stack) return undefined

  const lines = stack.split('\n')
  const target = lines[skip]
  if (!target) return undefined

  // Matches:
  // at fn (/path/file.ts:10:5)
  // at /path/file.ts:10:5
  const match = target.match(/\((.*):(\d+):(\d+)\)/) || target.match(/at (.*):(\d+):(\d+)/)

  if (!match) return undefined

  return {
    path: match[1],
    line: Number(match[2]),
    column: Number(match[3]),
  }
}
export type FsLocation = {
  path: string
  line: number
  column: number
}

const toPathParts = (path: string): string[] => path.split('.').filter(Boolean)
const isArrayIndex = (part: string): boolean => /^\d+$/.test(part)

// inspired by https://github.com/envindavsorg/ts-safe-path/blob/main/src/types.ts

type PathKeys<T> =
  T extends Record<string, unknown>
    ? {
        [K in keyof T]-?: K extends string
          ? NonNullable<T[K]> extends Record<string, unknown>
            ? K | `${K}.${PathKeys<NonNullable<T[K]>>}`
            : K
          : never
      }[keyof T]
    : never

export type SetByPath = <T extends Record<string, unknown>>(target: T, path: PathKeys<T>, value: unknown) => void
export const setByPath: SetByPath = (target, path, value) => {
  const parts = toPathParts(path)
  if (parts.length === 0) return

  let current: unknown = target
  for (let i = 0; i < parts.length; i += 1) {
    if (current === null || typeof current !== 'object') return

    const part = parts[i]!
    const key: string | number = isArrayIndex(part) ? Number(part) : part
    const currentObject = current as Record<string | number, unknown>
    const isLast = i === parts.length - 1

    if (isLast) {
      currentObject[key] = value
      return
    }

    const nextPart = parts[i + 1]!
    const shouldBeArray = isArrayIndex(nextPart)
    const nextValue = currentObject[key]
    if (nextValue === null || typeof nextValue !== 'object') {
      currentObject[key] = shouldBeArray ? [] : {}
    }
    current = currentObject[key]
  }
}

export type GetByPath = <T extends Record<string, unknown>>(target: T, path: PathKeys<T>) => unknown
export const getByPath: GetByPath = (target, path) => {
  const parts = toPathParts(path)
  if (parts.length === 0) return target

  let current: unknown = target
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined

    const key: string | number = isArrayIndex(part) ? Number(part) : part
    current = (current as Record<string | number, unknown>)[key]
  }
  return current
}

import type { DehydratedState } from '@tanstack/react-query'
import type { ResolvableHead } from 'unhead/types'

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

export function mergeResolvableHead(base?: ResolvableHead, extra?: ResolvableHead): ResolvableHead {
  if (!base) return extra || {}
  if (!extra) return base

  const merged: ResolvableHead = { ...base }

  for (const [key, value] of Object.entries(extra) as Array<
    [keyof ResolvableHead, ResolvableHead[keyof ResolvableHead]]
  >) {
    if (value == null) continue

    switch (key) {
      case 'htmlAttrs':
      case 'bodyAttrs': {
        const baseAttrs = (isPlainObject(base[key]) ? base[key] : {}) as Record<string, any>
        const extraAttrs = (isPlainObject(value) ? value : {}) as Record<string, any>
        merged[key] = { ...baseAttrs, ...extraAttrs } as any
        break
      }

      case 'meta':
      case 'link':
      case 'style':
      case 'script':
      case 'noscript': {
        const baseArr = Array.isArray(base[key]) ? base[key] : []
        const extraArr = Array.isArray(value) ? value : []
        merged[key] = [...baseArr, ...extraArr] as any
        break
      }

      case 'templateParams': {
        const baseParams = isPlainObject(base.templateParams) ? base.templateParams : {}
        const extraParams = (isPlainObject(value) ? value : {}) as Record<string, any>
        merged.templateParams = { ...baseParams, ...extraParams }
        break
      }

      default:
        // For title, base, titleTemplate, etc.
        ;(merged as any)[key] = value
        break
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

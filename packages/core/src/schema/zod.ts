import type { StandardJSONSchemaV1 } from '@standard-schema/spec'
import * as z from 'zod'
import type { ToJSONSchemaParams } from 'zod/v4/core'

export const zodSchemaHelper = (options?: { jsonSchema?: ToJSONSchemaParams }) => {
  const jsonSchemaOptions: StandardJSONSchemaV1.Options = {
    ...options?.jsonSchema,
    target: options?.jsonSchema?.target ?? 'openapi-3.0',
  }
  return {
    isSuitable: 'zod',
    extractKeys: (schema: any) => {
      try {
        if (schema.def.type !== 'object') {
          return undefined
        }
        return Object.keys(schema.def.shape)
      } catch {
        return undefined
      }
    },
    toJson: (schema: unknown) => {
      try {
        if (typeof schema !== 'object' || schema === null) {
          return undefined
        }
        const jsonSchema = z.toJSONSchema(schema as never, jsonSchemaOptions)
        return JSON.parse(JSON.stringify(jsonSchema)) as object
      } catch {
        return undefined
      }
    },
    hasFileOrBlob: (schema: unknown) => {
      const isFileOrBlobCustomCheck = (value: unknown): boolean => {
        if (typeof value !== 'function') {
          return false
        }
        try {
          if (typeof Blob !== 'undefined' && value(new Blob(['point0'])) === true) {
            return true
          }
        } catch {}
        try {
          if (typeof File !== 'undefined' && value(new File(['point0'], 'point0.txt')) === true) {
            return true
          }
        } catch {}
        return false
      }
      const seen = new WeakSet<object>()
      const walk = (value: unknown): boolean => {
        if (typeof value !== 'object' || value === null) {
          return false
        }
        if (seen.has(value)) {
          return false
        }
        seen.add(value)

        const def = (value as { def?: unknown }).def
        if (typeof def === 'object' && def !== null) {
          const type = (def as { type?: unknown }).type
          if (type === 'file' || type === 'blob') {
            return true
          }
          if (type === 'custom' && isFileOrBlobCustomCheck((def as { fn?: unknown }).fn)) {
            return true
          }
        }

        if (Array.isArray(value)) {
          for (const item of value) {
            if (walk(item)) {
              return true
            }
          }
          return false
        }
        for (const nested of Object.values(value as Record<string, unknown>)) {
          if (walk(nested)) {
            return true
          }
        }
        return false
      }
      try {
        return walk(schema)
      } catch {
        return false
      }
    },
    isAllItemsOptional: (schema: unknown) => {
      try {
        if (typeof schema !== 'object' || schema === null) {
          return false
        }
        const def = (schema as { def?: unknown }).def
        if (typeof def !== 'object' || def === null || (def as { type?: unknown }).type !== 'object') {
          return false
        }
        const shape = (def as { shape?: unknown }).shape
        if (typeof shape !== 'object' || shape === null) {
          return false
        }
        return Object.values(shape as Record<string, unknown>).every((item) => {
          if (typeof item !== 'object' || item === null) {
            return false
          }
          const safeParse = (item as { safeParse?: unknown }).safeParse
          if (typeof safeParse !== 'function') {
            return false
          }
          const result = safeParse(undefined)
          return (
            typeof result === 'object' &&
            result !== null &&
            'success' in result &&
            (result as { success?: unknown }).success === true
          )
        })
      } catch {
        return false
      }
    },
  }
}

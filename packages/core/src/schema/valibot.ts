import { toJsonSchema } from '@valibot/to-json-schema'
import { safeParse } from 'valibot'
import type { ConversionConfig } from '@valibot/to-json-schema'

export const valibotSchemaHelper = (options?: { jsonSchema?: ConversionConfig }) => {
  const jsonSchemaOptions: ConversionConfig = {
    ...options?.jsonSchema,
    target: options?.jsonSchema?.target ?? 'openapi-3.0',
  }
  return {
    isSuitable: 'valibot',
    extractKeys: (schema: any) => {
      try {
        if (schema.type !== 'object' || typeof schema.entries !== 'object' || schema.entries === null) {
          return undefined
        }
        return Object.keys(schema.entries)
      } catch {
        return undefined
      }
    },
    toJson: (schema: unknown) => {
      try {
        return toJsonSchema(schema as never, jsonSchemaOptions)
      } catch {
        return undefined
      }
    },
    hasFileOrBlob: (schema: unknown) => {
      const seen = new WeakSet<object>()
      const walk = (value: unknown): boolean => {
        if (typeof value !== 'object' || value === null) {
          return false
        }
        if (seen.has(value)) {
          return false
        }
        seen.add(value)

        const typed = value as { type?: unknown }
        if (typed.type === 'file' || typed.type === 'blob') {
          return true
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
        if (typeof schema !== 'object' || schema === null || (schema as { type?: unknown }).type !== 'object') {
          return false
        }
        const entries = (schema as { entries?: unknown }).entries
        if (typeof entries !== 'object' || entries === null) {
          return false
        }
        return Object.values(entries as Record<string, unknown>).every((entry) => {
          return safeParse(entry as never, undefined).success
        })
      } catch {
        return false
      }
    },
  }
}

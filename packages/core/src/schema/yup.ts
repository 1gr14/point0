import type { ResolveOptions } from '@sodaru/yup-to-json-schema/dist/types.js'
import type { SchemaHelper } from '../types.js'
import { convertSchema } from '@sodaru/yup-to-json-schema'

export const yupSchemaHelper = (options?: { jsonSchema?: ResolveOptions }): SchemaHelper => {
  const jsonSchemaOptions: ResolveOptions = {
    ...options?.jsonSchema,
  }
  return {
    isSuitable: 'yup',
    extractKeys: (schema: any) => {
      try {
        if (schema.type !== 'object' || typeof schema.fields !== 'object') {
          return undefined
        }
        return Object.keys(schema.fields)
      } catch {
        return undefined
      }
    },
    toJson: (schema: unknown) => {
      try {
        if (typeof schema !== 'object' || schema === null) {
          return undefined
        }
        const jsonSchema = convertSchema(schema as any, jsonSchemaOptions)
        return JSON.parse(JSON.stringify(jsonSchema)) as object
      } catch {
        return undefined
      }
    },
    hasFileOrBlob: (schema: unknown) => {
      const isFileOrBlobTest = (value: unknown): boolean => {
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
      const isFileOrBlobTestOptions = (value: unknown): boolean => {
        if (typeof value !== 'object' || value === null) {
          return false
        }
        const name = (value as { name?: unknown }).name
        if (typeof name !== 'string' || !/(file|blob)/i.test(name)) {
          return false
        }
        return isFileOrBlobTest((value as { test?: unknown }).test)
      }
      const seen = new WeakSet<object>()
      const walk = (value: unknown): boolean => {
        if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
          return false
        }
        if (seen.has(value as object)) {
          return false
        }
        seen.add(value as object)

        const options = (value as { OPTIONS?: unknown }).OPTIONS
        if (isFileOrBlobTestOptions(options)) {
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
        const fields = (schema as { fields?: unknown }).fields
        if (typeof fields !== 'object' || fields === null) {
          return false
        }
        return Object.values(fields as Record<string, unknown>).every((field) => {
          if (typeof field !== 'object' || field === null) {
            return false
          }
          if (typeof (field as { isValidSync?: unknown }).isValidSync !== 'function') {
            return false
          }
          return (field as { isValidSync: (value: unknown) => boolean }).isValidSync(undefined) === true
        })
      } catch {
        return false
      }
    },
  }
}

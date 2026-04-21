import type { SchemaHelper } from '../types.js'
import { create as superstructCreate } from 'superstruct'

const isSuperstructObjectSchema = (
  schema: unknown,
): schema is {
  type: 'object'
  schema: Record<string, unknown>
} => {
  if (typeof schema !== 'object' || schema === null) {
    return false
  }
  const typed = schema as Record<string, unknown>
  return typed.type === 'object' && typeof typed.schema === 'object' && typed.schema !== null
}

export const superstructSchemaHelper = (): SchemaHelper => {
  return {
    isSuitable: isSuperstructObjectSchema,
    extractKeys: (schema: unknown) => {
      try {
        if (!isSuperstructObjectSchema(schema)) {
          return undefined
        }
        return Object.keys(schema.schema)
      } catch {
        return undefined
      }
    },
    toJson: (schema: unknown) => {
      try {
        if (typeof schema !== 'object' || schema === null) {
          return undefined
        }
        return superstructToJsonSchema(schema as Struct<any, any>)
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
        const typed = value as { type?: unknown; schema?: unknown }
        if (typed.type === 'file' || typed.type === 'blob') {
          return true
        }
        if (Array.isArray(typed.schema)) {
          for (const item of typed.schema) {
            if (walk(item)) {
              return true
            }
          }
        } else if (typeof typed.schema === 'object' && typed.schema !== null) {
          for (const nested of Object.values(typed.schema as Record<string, unknown>)) {
            if (walk(nested)) {
              return true
            }
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
        if (!isSuperstructObjectSchema(schema)) {
          return false
        }
        return Object.entries(schema.schema).every(([key, value]) => {
          try {
            superstructCreate({}, { ...schema, schema: { [key]: value } } as Struct<any, any>)
            return true
          } catch {
            return false
          }
        })
      } catch {
        return false
      }
    },
  }
}

import type { Struct } from 'superstruct'

export const superstructToJsonSchema = (
  struct: Struct<any, any>,
  defs: any = {},
  path?: string,
): object | undefined => {
  // reuse via $ref if named
  if (path && defs[path]) {
    return { $ref: `#/definitions/${path}` }
  }

  const base = (() => {
    switch (struct.type) {
      case 'string':
        return { type: 'string' }

      case 'number':
        return { type: 'number' }

      case 'boolean':
        return { type: 'boolean' }

      case 'literal':
        return { const: struct.schema }

      case 'array':
        return {
          type: 'array',
          items: superstructToJsonSchema(struct.schema, defs),
        }

      case 'object': {
        const properties: any = {}
        const required: string[] = []

        for (const [key, value] of Object.entries(struct.schema)) {
          properties[key] = superstructToJsonSchema(value as Struct<any, any>, defs)

          if ((value as any).type !== 'optional') {
            required.push(key)
          }
        }

        return {
          type: 'object',
          properties,
          ...(required.length ? { required } : {}),
          additionalProperties: false,
        }
      }

      case 'union':
        return {
          oneOf: struct.schema.map((s: Struct<any, any>) => superstructToJsonSchema(s, defs)),
        }

      case 'optional':
        return superstructToJsonSchema(struct.schema, defs)

      case 'nullable': {
        const inner = superstructToJsonSchema(struct.schema, defs)
        return {
          anyOf: [inner, { type: 'null' }],
        }
      }

      default:
        return {} // fallback
    }
  })()

  // store definition if named
  if (path) {
    defs[path] = base
    return { $ref: `#/definitions/${path}` }
  }

  return base
}

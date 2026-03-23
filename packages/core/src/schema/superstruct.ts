import type { SchemaHelper } from '../types.js'

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

export const superstructSchemaHelper: SchemaHelper = {
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
}

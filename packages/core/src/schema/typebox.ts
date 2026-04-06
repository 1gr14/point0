import { Kind } from '@sinclair/typebox'
import type { SchemaHelper } from '../types.js'

export const typeboxSchemaHelper = (): SchemaHelper => {
  return {
    isSuitable: (schema) => {
      return typeof schema === 'object' && schema !== null && Kind in schema
    },
    extractKeys: (schema: any) => {
      try {
        if (schema[Kind] !== 'Object' || typeof schema.properties !== 'object') {
          return undefined
        }
        return Object.keys(schema.properties)
      } catch {
        return undefined
      }
    },
    toJson: (schema: unknown) => {
      try {
        if (typeof schema !== 'object' || schema === null || !(Kind in schema) || (schema as any)[Kind] !== 'Object') {
          return undefined
        }
        // TypeBox schemas already use JSON Schema shape.
        return JSON.parse(JSON.stringify(schema)) as object
      } catch {
        return undefined
      }
    },
  }
}

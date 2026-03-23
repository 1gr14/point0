import { Kind } from '@sinclair/typebox'
import type { SchemaHelper } from '../types.js'

export const typeboxSchemaHelper: SchemaHelper = {
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
}

import type { SchemaHelper } from '../types.js'

export const valibotSchemaHelper: SchemaHelper = {
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
}

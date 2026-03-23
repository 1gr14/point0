import type { SchemaHelper } from '../types.js'

export const zodSchemaHelper: SchemaHelper = {
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
}

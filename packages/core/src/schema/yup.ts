import type { SchemaHelper } from '../types.js'

export const yupSchemaHelper: SchemaHelper = {
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
}

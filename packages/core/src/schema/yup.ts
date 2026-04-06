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
  }
}

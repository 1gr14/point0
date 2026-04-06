import type { StandardJSONSchemaV1 } from '@standard-schema/spec'
import * as z from 'zod'
import type { ToJSONSchemaParams } from 'zod/v4/core'

export const zodSchemaHelper = (options?: { jsonSchema?: ToJSONSchemaParams }) => {
  const jsonSchemaOptions: StandardJSONSchemaV1.Options = {
    ...options?.jsonSchema,
    target: options?.jsonSchema?.target ?? 'openapi-3.0',
  }
  return {
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
    toJson: (schema: unknown) => {
      try {
        if (typeof schema !== 'object' || schema === null) {
          return undefined
        }
        const jsonSchema = z.toJSONSchema(schema as never, jsonSchemaOptions)
        return JSON.parse(JSON.stringify(jsonSchema)) as object
      } catch {
        return undefined
      }
    },
  }
}

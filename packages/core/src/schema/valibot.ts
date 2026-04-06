import { toJsonSchema } from '@valibot/to-json-schema'
import type { ConversionConfig } from '@valibot/to-json-schema'

export const valibotSchemaHelper = (options?: { jsonSchema?: ConversionConfig }) => {
  const jsonSchemaOptions: ConversionConfig = {
    ...options?.jsonSchema,
    target: options?.jsonSchema?.target ?? 'openapi-3.0',
  }
  return {
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
    toJson: (schema: unknown) => {
      try {
        return toJsonSchema(schema as never, jsonSchemaOptions)
      } catch {
        return undefined
      }
    },
  }
}

import type { StandardJSONSchemaV1 } from '@standard-schema/spec'
import { StandardSchemaV1 } from '@standard-schema/spec'
import type { SchemaHelper } from '../types.js'

export const getSchemaVendor = (schema: unknown): string | undefined => {
  if (typeof schema !== 'object' || schema === null) {
    return undefined
  }

  const standard = (schema as { ['~standard']?: unknown })['~standard']
  if (typeof standard !== 'object' || standard === null) {
    return undefined
  }

  const vendor = (standard as { vendor?: unknown }).vendor
  return vendor as string | undefined
}

export const getSutableSchemaHelper = (
  schema: unknown,
  schemaHelpers: SchemaHelper[] | undefined,
): SchemaHelper | undefined => {
  if (!schemaHelpers) {
    return undefined
  }
  let vendor: string | undefined
  for (const schemaHelper of schemaHelpers) {
    const suitable =
      typeof schemaHelper.isSuitable === 'function'
        ? schemaHelper.isSuitable(schema)
        : schemaHelper.isSuitable === (vendor ??= getSchemaVendor(schema))
    if (suitable) {
      return schemaHelper
    }
  }
  return undefined
}

export const extractKeysBySchemasHelpers = (
  schema: unknown,
  schemaHelpers: SchemaHelper[] | undefined,
): string[] | undefined => {
  const schemaHelper = getSutableSchemaHelper(schema, schemaHelpers)
  return schemaHelper?.extractKeys?.(schema)
}

export const extractJsonSchemaBySchemasHelpers = (
  schema: unknown,
  schemaHelpers: SchemaHelper[] | undefined,
): object | undefined => {
  const schemaHelper = getSutableSchemaHelper(schema, schemaHelpers)
  if (schemaHelper?.toJson) {
    return schemaHelper.toJson(schema)
  } else {
    try {
      return (schema as any)['~standard'].jsonSchema.input({ target: 'openapi-3.0' }) || undefined
    } catch {
      return undefined
    }
  }
}

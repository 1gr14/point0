import type { SchemaHelper } from '../types.js'
import type { Type } from 'arktype'

type ArkTypeSchema = {
  ['~standard']?: {
    vendor?: unknown
  }
  json?: {
    domain?: unknown
    required?: Array<{ key?: unknown }>
    optional?: Array<{ key?: unknown }>
  }
}

const isArktypeObjectSchema = (schema: unknown): schema is ArkTypeSchema => {
  if (typeof schema !== 'function' && (typeof schema !== 'object' || schema === null)) {
    return false
  }
  const typed = schema as ArkTypeSchema
  return typed.json?.domain === 'object'
}

export const arktypeSchemaHelper = (options?: { jsonSchema?: Parameters<Type['toJsonSchema']>[0] }): SchemaHelper => {
  const jsonSchemaOptions: Parameters<Type['toJsonSchema']>[0] = {
    ...options?.jsonSchema,
  }
  return {
    isSuitable: (schema: unknown) => {
      if (typeof schema !== 'function' && (typeof schema !== 'object' || schema === null)) {
        return false
      }
      return (schema as ArkTypeSchema)['~standard']?.vendor === 'arktype'
    },
    extractKeys: (schema: unknown) => {
      try {
        if (!isArktypeObjectSchema(schema)) {
          return undefined
        }
        const requiredKeys = schema.json?.required
          ?.map((item) => item.key)
          .filter((key): key is string => typeof key === 'string')
        const optionalKeys = schema.json?.optional
          ?.map((item) => item.key)
          .filter((key): key is string => typeof key === 'string')
        return [...(requiredKeys ?? []), ...(optionalKeys ?? [])]
      } catch {
        return undefined
      }
    },
    toJson: (schema: unknown) => {
      try {
        if (typeof schema !== 'function' && (typeof schema !== 'object' || schema === null)) {
          return undefined
        }
        if ('toJsonSchema' in schema) {
          return (schema as any).toJsonSchema(jsonSchemaOptions)
        }
      } catch {
        return undefined
      }
    },
  }
}

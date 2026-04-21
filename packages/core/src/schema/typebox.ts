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
    hasFileOrBlob: (schema: unknown) => {
      const seen = new WeakSet<object>()
      const walk = (value: unknown): boolean => {
        if (typeof value !== 'object' || value === null) {
          return false
        }
        if (seen.has(value)) {
          return false
        }
        seen.add(value)

        const typed = value as { type?: unknown; format?: unknown }
        if (typed.format === 'binary' && typed.type === 'string') {
          return true
        }

        if (Array.isArray(value)) {
          for (const item of value) {
            if (walk(item)) {
              return true
            }
          }
          return false
        }
        for (const nested of Object.values(value as Record<string, unknown>)) {
          if (walk(nested)) {
            return true
          }
        }
        return false
      }
      try {
        return walk(schema)
      } catch {
        return false
      }
    },
    isAllItemsOptional: (schema: unknown) => {
      try {
        if (typeof schema !== 'object' || schema === null || !(Kind in schema) || (schema as any)[Kind] !== 'Object') {
          return false
        }
        const properties = (schema as { properties?: unknown }).properties
        if (typeof properties !== 'object' || properties === null) {
          return false
        }
        const requiredList = Array.isArray((schema as { required?: unknown }).required)
          ? (schema as never as { required: unknown[] }).required.filter(
              (value): value is string => typeof value === 'string',
            )
          : []
        return Object.entries(properties as Record<string, unknown>).every(([key, property]) => {
          const hasDefault =
            typeof property === 'object' && property !== null && 'default' in (property as Record<string, unknown>)
          return hasDefault || !requiredList.includes(key)
        })
      } catch {
        return false
      }
    },
  }
}

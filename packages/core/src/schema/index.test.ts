import { Type } from '@sinclair/typebox'
import { type } from 'arktype'
import { describe, expect, it } from 'bun:test'
import { number as ssNumber, object as ssObject, optional as ssOptional, string as ssString } from 'superstruct'
import * as v from 'valibot'
import * as yup from 'yup'
import { z } from 'zod'
import { arktypeSchemaHelper } from './arktype.js'
import { superstructSchemaHelper } from './superstruct.js'
import { typeboxSchemaHelper } from './typebox.js'
import { extractJsonSchemaBySchemasHelpers, extractKeysBySchemasHelpers } from './utils.js'
import { valibotSchemaHelper } from './valibot.js'
import { yupSchemaHelper } from './yup.js'
import { zodSchemaHelper } from './zod.js'

const mixedSchemaHelpers = [
  zodSchemaHelper(),
  typeboxSchemaHelper(),
  valibotSchemaHelper(),
  yupSchemaHelper(),
  superstructSchemaHelper(),
  arktypeSchemaHelper(),
]

describe('schema helpers', () => {
  describe('keys', () => {
    describe('zod', () => {
      it('returns keys for object schema', () => {
        const schema = z.object({
          id: z.string(),
          age: z.number(),
        })
        expect(extractKeysBySchemasHelpers(schema, [zodSchemaHelper()])).toEqual(['id', 'age'])
      })

      it('returns keys for optional object schema', () => {
        const schema = z.object({
          id: z.string().optional(),
          age: z.number().optional(),
        })
        expect(extractKeysBySchemasHelpers(schema, [zodSchemaHelper()])).toEqual(['id', 'age'])
      })

      it('returns empty array for empty zod object schema', () => {
        const schema = z.object({})
        expect(extractKeysBySchemasHelpers(schema, [zodSchemaHelper()])).toEqual([])
      })

      it('returns undefined for non-object zod schema', () => {
        expect(extractKeysBySchemasHelpers(z.string(), [zodSchemaHelper()])).toBeUndefined()
      })

      it('returns undefined for non schema', () => {
        expect(extractKeysBySchemasHelpers({ some: 'thing' }, [zodSchemaHelper()])).toBeUndefined()
      })

      it('returns undefined for mixed schema helpers', () => {
        const schema = z.object({
          id: z.string().optional(),
          age: z.number().optional(),
        })
        expect(extractKeysBySchemasHelpers(schema, mixedSchemaHelpers)).toEqual(['id', 'age'])
      })
    })

    describe('typebox', () => {
      it('returns keys for object schema', () => {
        const schema = Type.Object({
          id: Type.String(),
          age: Type.Number(),
        })
        expect(extractKeysBySchemasHelpers(schema, [typeboxSchemaHelper()])).toEqual(['id', 'age'])
      })

      it('returns keys for optional object schema', () => {
        const schema = Type.Object({
          id: Type.Optional(Type.String()),
          age: Type.Optional(Type.Number()),
        })
        expect(extractKeysBySchemasHelpers(schema, [typeboxSchemaHelper()])).toEqual(['id', 'age'])
      })

      it('returns empty array for empty typebox object schema', () => {
        const schema = Type.Object({})
        expect(extractKeysBySchemasHelpers(schema, [typeboxSchemaHelper()])).toEqual([])
      })

      it('returns undefined for non-object typebox schema', () => {
        expect(extractKeysBySchemasHelpers(Type.String(), [typeboxSchemaHelper()])).toBeUndefined()
      })

      it('returns undefined for mixed schema helpers', () => {
        const schema = Type.Object({
          id: Type.String(),
          age: Type.Number(),
        })
        expect(extractKeysBySchemasHelpers(schema, mixedSchemaHelpers)).toEqual(['id', 'age'])
      })
    })

    describe('valibot', () => {
      it('returns keys for object schema', () => {
        const schema = v.object({
          id: v.string(),
          age: v.number(),
        })
        expect(extractKeysBySchemasHelpers(schema, [valibotSchemaHelper()])).toEqual(['id', 'age'])
      })

      it('returns keys for optional object schema', () => {
        const schema = v.object({
          id: v.optional(v.string()),
          age: v.optional(v.number()),
        })
        expect(extractKeysBySchemasHelpers(schema, [valibotSchemaHelper()])).toEqual(['id', 'age'])
      })

      it('returns empty array for empty valibot object schema', () => {
        const schema = v.object({})
        expect(extractKeysBySchemasHelpers(schema, [valibotSchemaHelper()])).toEqual([])
      })

      it('returns undefined for non-object valibot schema', () => {
        expect(extractKeysBySchemasHelpers(v.string(), [valibotSchemaHelper()])).toBeUndefined()
      })

      it('returns undefined for mixed schema helpers', () => {
        const schema = v.object({
          id: v.string(),
          age: v.number(),
        })
        expect(extractKeysBySchemasHelpers(schema, mixedSchemaHelpers)).toEqual(['id', 'age'])
      })
    })

    describe('yup', () => {
      it('returns keys for object schema', () => {
        const schema = yup.object({
          id: yup.string(),
          age: yup.number(),
        })
        expect(extractKeysBySchemasHelpers(schema, [yupSchemaHelper()])).toEqual(['id', 'age'])
      })

      it('returns empty array for empty yup object schema', () => {
        const schema = yup.object({})
        expect(extractKeysBySchemasHelpers(schema, [yupSchemaHelper()])).toEqual([])
      })

      it('returns undefined for non-object yup schema', () => {
        expect(extractKeysBySchemasHelpers(yup.string(), [yupSchemaHelper()])).toBeUndefined()
      })

      it('returns undefined for mixed schema helpers', () => {
        const schema = yup.object({
          id: yup.string(),
          age: yup.number(),
        })
        expect(extractKeysBySchemasHelpers(schema, mixedSchemaHelpers)).toEqual(['id', 'age'])
      })
    })

    describe('superstruct', () => {
      it('returns keys for object schema', () => {
        const schema = ssObject({
          id: ssString(),
          age: ssNumber(),
        })
        expect(extractKeysBySchemasHelpers(schema, [superstructSchemaHelper()])).toEqual(['id', 'age'])
      })

      it('returns keys for optional object schema', () => {
        const schema = ssObject({
          id: ssOptional(ssString()),
          age: ssOptional(ssNumber()),
        })
        expect(extractKeysBySchemasHelpers(schema, [superstructSchemaHelper()])).toEqual(['id', 'age'])
      })

      it('returns empty array for empty superstruct object schema', () => {
        const schema = ssObject({})
        expect(extractKeysBySchemasHelpers(schema, [superstructSchemaHelper()])).toEqual([])
      })

      it('returns undefined for non-object superstruct schema', () => {
        expect(extractKeysBySchemasHelpers(ssString(), [superstructSchemaHelper()])).toBeUndefined()
      })

      it('returns undefined for mixed schema helpers', () => {
        const schema = ssObject({
          id: ssString(),
          age: ssNumber(),
        })
        expect(extractKeysBySchemasHelpers(schema, mixedSchemaHelpers)).toEqual(['id', 'age'])
      })
    })

    describe('arktype', () => {
      it('returns keys for object schema', () => {
        const schema = type({
          id: 'string',
          age: 'number',
        })
        expect(extractKeysBySchemasHelpers(schema, [arktypeSchemaHelper()])).toEqual(['age', 'id'])
      })

      it('returns empty array for empty arktype object schema', () => {
        const schema = type({})
        expect(extractKeysBySchemasHelpers(schema, [arktypeSchemaHelper()])).toEqual([])
      })

      it('returns undefined for non-object arktype schema', () => {
        expect(extractKeysBySchemasHelpers(type('string'), [arktypeSchemaHelper()])).toBeUndefined()
      })

      it('returns undefined for mixed schema helpers', () => {
        const schema = type({
          id: 'string',
          age: 'number',
        })
        expect(extractKeysBySchemasHelpers(schema, mixedSchemaHelpers)).toEqual(['age', 'id'])
      })
    })
  })

  describe('JSON Schema', () => {
    describe('zod', () => {
      it('returns json schema for object schema', () => {
        const schema = z.object({
          id: z.string(),
          age: z.number(),
        })
        expect(extractJsonSchemaBySchemasHelpers(schema, [zodSchemaHelper()])).toMatchInlineSnapshot(`
          {
            "additionalProperties": false,
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "required": [
              "id",
              "age",
            ],
            "type": "object",
          }
        `)
      })

      it('returns undefined for non schema', () => {
        expect(extractJsonSchemaBySchemasHelpers({ some: 'thing' }, [zodSchemaHelper()])).toBeUndefined()
      })

      it('returns json schema for mixed schema helpers', () => {
        const schema = z.object({
          id: z.string().optional(),
          age: z.number().optional(),
        })
        expect(extractJsonSchemaBySchemasHelpers(schema, mixedSchemaHelpers)).toMatchInlineSnapshot(`
          {
            "additionalProperties": false,
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "type": "object",
          }
        `)
      })
    })

    describe('typebox', () => {
      it('returns json schema for object schema', () => {
        const schema = Type.Object({
          id: Type.String(),
          age: Type.Number(),
        })
        expect(extractJsonSchemaBySchemasHelpers(schema, [typeboxSchemaHelper()])).toMatchInlineSnapshot(`
          {
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "required": [
              "id",
              "age",
            ],
            "type": "object",
          }
        `)
      })

      it('returns json schema for mixed schema helpers', () => {
        const schema = Type.Object({
          id: Type.String(),
          age: Type.Number(),
        })
        expect(extractJsonSchemaBySchemasHelpers(schema, mixedSchemaHelpers)).toMatchInlineSnapshot(`
          {
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "required": [
              "id",
              "age",
            ],
            "type": "object",
          }
        `)
      })
    })

    describe('valibot', () => {
      it('returns json schema for object schema', () => {
        const schema = v.object({
          id: v.string(),
          age: v.number(),
        })
        expect(extractJsonSchemaBySchemasHelpers(schema, [valibotSchemaHelper()])).toMatchInlineSnapshot(`
          {
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "required": [
              "id",
              "age",
            ],
            "type": "object",
          }
        `)
      })

      it('returns json schema for mixed schema helpers', () => {
        const schema = v.object({
          id: v.string(),
          age: v.number(),
        })
        expect(extractJsonSchemaBySchemasHelpers(schema, mixedSchemaHelpers)).toMatchInlineSnapshot(`
          {
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "required": [
              "id",
              "age",
            ],
            "type": "object",
          }
        `)
      })
    })

    describe('yup', () => {
      it('returns json schema for object schema', () => {
        const schema = yup.object({
          id: yup.string().required(),
          age: yup.number(),
        })
        expect(extractJsonSchemaBySchemasHelpers(schema, [yupSchemaHelper()])).toMatchInlineSnapshot(`
          {
            "default": {},
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "required": [
              "id",
            ],
            "type": "object",
          }
        `)
      })

      it('returns json schema for mixed schema helpers', () => {
        const schema = yup.object({
          id: yup.string().required(),
          age: yup.number(),
        })
        expect(extractJsonSchemaBySchemasHelpers(schema, mixedSchemaHelpers)).toMatchInlineSnapshot(`
          {
            "default": {},
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "required": [
              "id",
            ],
            "type": "object",
          }
        `)
      })
    })

    describe('superstruct', () => {
      it('returns json schema for object schema', () => {
        const schema = ssObject({
          id: ssString(),
          age: ssNumber(),
        })
        expect(extractJsonSchemaBySchemasHelpers(schema, [superstructSchemaHelper()])).toMatchInlineSnapshot(`
          {
            "additionalProperties": false,
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "required": [
              "id",
              "age",
            ],
            "type": "object",
          }
        `)
      })

      it('returns json schema for mixed schema helpers', () => {
        const schema = ssObject({
          id: ssString(),
          age: ssNumber(),
        })
        expect(extractJsonSchemaBySchemasHelpers(schema, mixedSchemaHelpers)).toMatchInlineSnapshot(`
          {
            "additionalProperties": false,
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "required": [
              "id",
              "age",
            ],
            "type": "object",
          }
        `)
      })
    })

    describe('arktype', () => {
      it('returns json schema for object schema', () => {
        const schema = type({
          id: 'string',
          age: 'number',
        })
        expect(extractJsonSchemaBySchemasHelpers(schema, [arktypeSchemaHelper()])).toMatchInlineSnapshot(`
          {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "required": [
              "age",
              "id",
            ],
            "type": "object",
          }
        `)
      })

      it('returns json schema for mixed schema helpers', () => {
        const schema = type({
          id: 'string',
          age: 'number',
        })
        schema.toJsonSchema()
        expect(extractJsonSchemaBySchemasHelpers(schema, mixedSchemaHelpers)).toMatchInlineSnapshot(`
          {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "properties": {
              "age": {
                "type": "number",
              },
              "id": {
                "type": "string",
              },
            },
            "required": [
              "age",
              "id",
            ],
            "type": "object",
          }
        `)
      })
    })
  })
})

import type { ReadyPoint, RecordValidationSchema, SchemaHelper } from '@point0/core'
import { extractJsonSchemaBySchemasHelpers } from '@point0/core/schema/utils'

type JsonSchema = object
type OpenapiSchema = object

// export type PointServerInputValidatorSchemas = {
//   params: RecordValidationSchema[]
//   search: RecordValidationSchema[]
//   body: RecordValidationSchema[]
//   headers: RecordValidationSchema[]
//   cookies: RecordValidationSchema[]
//   input: RecordValidationSchema[] // queries and mutations have no body, search, params, they have input, which is body
// }

export type PointServerInputJsonSchemas = {
  params: JsonSchema | undefined
  search: JsonSchema | undefined
  body: JsonSchema | undefined
  headers: JsonSchema | undefined
  cookies: JsonSchema | undefined
  input: JsonSchema | undefined // queries and mutations have no body, search, params, they have input, which is body
}

const mergeJsonSchemas = (oldJsonSchema: JsonSchema | undefined, newJsonSchema: JsonSchema | undefined) => {
  if (!oldJsonSchema) {
    return newJsonSchema
  }
  if (!newJsonSchema) {
    return oldJsonSchema
  }
  // TODO: merge object schema helpers correctly
  return { ...oldJsonSchema, ...newJsonSchema }
}

const appendJsonShemaByValidatorSchema = ({
  jsonSchema,
  validatorSchema,
  schemasHelpers,
}: {
  jsonSchema: JsonSchema | undefined
  validatorSchema: RecordValidationSchema
  schemasHelpers: SchemaHelper[] | undefined
}) => {
  const newJsonSchema = extractJsonSchemaBySchemasHelpers(validatorSchema, schemasHelpers)
  return mergeJsonSchemas(jsonSchema, newJsonSchema)
}

export const getJsonSchemasFromPoint = (point: ReadyPoint) => {
  const schemas: PointServerInputJsonSchemas = {
    params: undefined,
    search: undefined,
    body: undefined,
    headers: undefined,
    cookies: undefined,
    input: undefined,
  }
  for (const action of point._serverExecuteActions) {
    if (action.type === 'input') {
      schemas.input = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.input,
        validatorSchema: action.schema,
        schemasHelpers: point._schemasHelpers,
      })
    }
    if (action.type === 'body') {
      schemas.body = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.body,
        validatorSchema: action.schema,
        schemasHelpers: point._schemasHelpers,
      })
    }
    if (action.type === 'headers') {
      schemas.headers = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.headers,
        validatorSchema: action.schema,
        schemasHelpers: point._schemasHelpers,
      })
    }
    if (action.type === 'cookies') {
      schemas.cookies = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.cookies,
        validatorSchema: action.schema,
        schemasHelpers: point._schemasHelpers,
      })
    }
    if (action.type === 'params') {
      schemas.params = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.params,
        validatorSchema: action.schema,
        schemasHelpers: point._schemasHelpers,
      })
    }
    if (action.type === 'search') {
      schemas.search = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.search,
        validatorSchema: action.schema,
        schemasHelpers: point._schemasHelpers,
      })
    }
  }

  return schemas
}

export const getOpenapiSchemaFromPoint = (point: ReadyPoint): object | undefined => {
  const endpoint = point._endpoint
  if (!endpoint) {
    return undefined
  }
  const jsonSchemas = getJsonSchemasFromPoint(point)
  // TODO: return json schema
  return undefined
}

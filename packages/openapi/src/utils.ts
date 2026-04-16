import { toCamelCase } from '@point0/core'
import type { InputSchema, ReadyPoint, RecordValidationSchema, ResponseContentType, SchemaHelper } from '@point0/core'
import { extractJsonSchemaBySchemasHelpers } from '@point0/core/schema/utils'
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types'
import stringify from 'safe-stable-stringify'

type OpenapiOptionsGeneral = {
  helpers?: SchemaHelper[]
  models?: Record<string, InputSchema>
  hideTransformHeader?: boolean
}

export type OpenapiOptionsV3 = OpenapiOptionsGeneral & {
  openapi?: `3.0${string}`
} & Partial<OpenAPIV3.Document>

export type OpenapiOptionsV3_1 = OpenapiOptionsGeneral & {
  openapi: `3.1${string}`
} & Partial<OpenAPIV3_1.Document>

export type OpenapiOptions<TOpenapiVersion extends string> = TOpenapiVersion extends `3.1${string}`
  ? OpenapiOptionsV3_1
  : OpenapiOptionsV3

export type OpenapiSchemaV3 = OpenAPIV3.Document
export type OpenapiSchemaV3_1 = OpenAPIV3_1.Document
export type OpenapiSchema<TOpenapiVersion extends string> = TOpenapiVersion extends `3.1${string}`
  ? OpenapiSchemaV3_1
  : OpenapiSchemaV3

type JsonSchema = object
type OpenapiParameterIn = 'path' | 'query' | 'header' | 'cookie'
type JsonRecord = Record<string, unknown>

export type PointServerInputJsonSchemas = {
  params: JsonSchema | undefined
  search: JsonSchema | undefined
  body: JsonSchema | undefined
  headers: JsonSchema | undefined
  cookies: JsonSchema | undefined
  input: JsonSchema | undefined // queries and mutations have no body, search, params, they have input, which is body
  response: OpenAPIV3.ResponsesObject | undefined
}

const mergeJsonSchemas = (
  oldJsonSchema: JsonSchema | undefined,
  newJsonSchema: JsonSchema | undefined,
): JsonSchema | undefined => {
  if (!oldJsonSchema) {
    return newJsonSchema
  }
  if (!newJsonSchema) {
    return oldJsonSchema
  }
  if (!isObjectRecord(oldJsonSchema) || !isObjectRecord(newJsonSchema)) {
    return newJsonSchema
  }

  const oldProperties = isObjectRecord(oldJsonSchema.properties) ? oldJsonSchema.properties : undefined
  const newProperties = isObjectRecord(newJsonSchema.properties) ? newJsonSchema.properties : undefined

  const mergedProperties: Record<string, JsonSchema> | undefined =
    oldProperties || newProperties
      ? Object.fromEntries(
          Array.from(new Set([...Object.keys(oldProperties ?? {}), ...Object.keys(newProperties ?? {})])).map((key) => {
            const oldProperty = oldProperties?.[key]
            const newProperty = newProperties?.[key]
            if (oldProperty !== undefined && newProperty !== undefined) {
              return [key, mergeJsonSchemas(oldProperty as JsonSchema, newProperty as JsonSchema) as JsonSchema]
            }
            return [key, (newProperty ?? oldProperty) as JsonSchema]
          }),
        )
      : undefined

  const oldRequired = Array.isArray(oldJsonSchema.required)
    ? oldJsonSchema.required.filter((value): value is string => typeof value === 'string')
    : []
  const newRequired = Array.isArray(newJsonSchema.required)
    ? newJsonSchema.required.filter((value): value is string => typeof value === 'string')
    : []
  const mergedRequired = Array.from(new Set([...oldRequired, ...newRequired]))

  return {
    ...oldJsonSchema,
    ...newJsonSchema,
    ...(mergedProperties ? { properties: mergedProperties } : {}),
    ...(mergedRequired.length ? { required: mergedRequired } : {}),
  }
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

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

const convertRouteDefinitionToOpenapiPath = (routeDefinition: string): string => {
  return routeDefinition.replace(/:([a-zA-Z0-9_]+)/g, '{$1}')
}

const buildOpenapiParametersBySchema = (
  schema: JsonSchema | undefined,
  kind: OpenapiParameterIn,
): Array<OpenAPIV3.ParameterObject> => {
  if (!schema || !isObjectRecord(schema)) {
    return []
  }
  const properties = schema.properties
  if (!isObjectRecord(properties)) {
    return []
  }
  const requiredList = Array.isArray(schema.required) ? schema.required.filter((item) => typeof item === 'string') : []
  return Object.entries(properties).map(([name, propertySchema]) => ({
    name,
    in: kind,
    required: kind === 'path' ? true : requiredList.includes(name),
    schema: isObjectRecord(propertySchema) ? propertySchema : {},
  }))
}

const toModelSchemaRef = (modelName: string): JsonRecord => ({
  $ref: `#/components/schemas/${modelName}`,
})

const replaceSchemaByModelRefs = (value: unknown, modelNameBySignature: Map<string, string>): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => replaceSchemaByModelRefs(item, modelNameBySignature))
  }
  if (!isObjectRecord(value)) {
    return value
  }
  if (typeof value.$ref === 'string') {
    return value
  }
  const modelName = modelNameBySignature.get(stringify(value))
  if (modelName) {
    return toModelSchemaRef(modelName)
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, replaceSchemaByModelRefs(item, modelNameBySignature)]),
  )
}

const getModelJsonSchemas = (
  modelsSchemas: Record<string, InputSchema>,
  schemasHelpers: SchemaHelper[],
): Record<string, JsonSchema> => {
  const output: Record<string, JsonSchema> = {}
  for (const [modelName, modelSchema] of Object.entries(modelsSchemas)) {
    const modelJsonSchema = extractJsonSchemaBySchemasHelpers(modelSchema, schemasHelpers)
    if (!modelJsonSchema) {
      continue
    }
    output[modelName] = modelJsonSchema
  }
  return output
}

const getSchemasHelpersFromPoints = (points: Array<ReadyPoint | { point: ReadyPoint }>): SchemaHelper[] => {
  return points.reduce<SchemaHelper[]>((acc, point) => {
    return [...acc, ...(point.point._schemasHelpers ?? [])]
  }, [])
}

const getJsonSchemasFromPoint = (
  point: ReadyPoint | { point: ReadyPoint },
  options?: {
    modelNameBySignature?: Map<string, string>
    schemasHelpers?: SchemaHelper[]
  },
) => {
  const normalizedPoint = point.point
  const modelNameBySignature = options?.modelNameBySignature
  const schemasHelpers = options?.schemasHelpers ?? normalizedPoint._schemasHelpers
  const schemas: PointServerInputJsonSchemas = {
    params: undefined,
    search: undefined,
    body: undefined,
    headers: undefined,
    cookies: undefined,
    input: undefined,
    response: undefined,
  }
  for (const action of normalizedPoint._serverExecuteActions) {
    if (action.type === 'input') {
      schemas.input = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.input,
        validatorSchema: action.schema,
        schemasHelpers,
      })
    }
    if (action.type === 'body') {
      schemas.body = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.body,
        validatorSchema: action.schema,
        schemasHelpers,
      })
    }
    if (action.type === 'headers') {
      schemas.headers = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.headers,
        validatorSchema: action.schema,
        schemasHelpers,
      })
    }
    if (action.type === 'cookies') {
      schemas.cookies = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.cookies,
        validatorSchema: action.schema,
        schemasHelpers,
      })
    }
    if (action.type === 'params') {
      schemas.params = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.params,
        validatorSchema: action.schema,
        schemasHelpers,
      })
    }
    if (action.type === 'search') {
      schemas.search = appendJsonShemaByValidatorSchema({
        jsonSchema: schemas.search,
        validatorSchema: action.schema,
        schemasHelpers,
      })
    }
  }
  if (modelNameBySignature) {
    for (const key of ['params', 'search', 'body', 'headers', 'cookies', 'input'] as const) {
      const schema = schemas[key]
      if (!schema) {
        continue
      }
      schemas[key] = replaceSchemaByModelRefs(schema, modelNameBySignature) as JsonSchema
    }
  }
  if (normalizedPoint._responseSchema) {
    const responseJsonSchema: OpenAPIV3.ResponsesObject = {}
    for (const _status of Object.keys(normalizedPoint._responseSchema)) {
      const status = Number(_status)
      const responseStatusSchema = normalizedPoint._responseSchema[status]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!responseStatusSchema) {
        continue
      }
      for (const content of Object.keys(responseStatusSchema.content)) {
        const contentType = content as ResponseContentType
        const responseContentSchema = responseStatusSchema.content[contentType]
        const schema = responseContentSchema.schema
        const jsonSchema = extractJsonSchemaBySchemasHelpers(schema, schemasHelpers)
        if (!jsonSchema) {
          continue
        }
        const normalizedJsonSchema = modelNameBySignature
          ? (replaceSchemaByModelRefs(jsonSchema, modelNameBySignature) as JsonSchema)
          : jsonSchema
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!responseJsonSchema[status]) {
          responseJsonSchema[status] = {
            description: responseStatusSchema.description as never,
            content: {},
          }
        }
        ;(responseJsonSchema[status] as any).content[contentType] = {
          schema: normalizedJsonSchema,
          description: responseContentSchema.description,
          examples: responseContentSchema.examples,
        }
      }
    }
    schemas.response = responseJsonSchema
  }

  return schemas
}

const getOpenapiSchemaFromPoint = (
  point: ReadyPoint | { point: ReadyPoint },
  options?: {
    modelNameBySignature?: Map<string, string>
    schemasHelpers?: SchemaHelper[]
    hideTransformHeader?: boolean
  },
): object | undefined => {
  const normalizedPoint = point.point
  const showTransformHeader = !options?.hideTransformHeader && !!normalizedPoint._transformer
  const endpoint = normalizedPoint._endpoint // {method, route} (route.definition is string iwth /zxc/:id params)
  if (!endpoint) {
    return undefined
  }
  const jsonSchemas = getJsonSchemasFromPoint(normalizedPoint, options)
  const path = convertRouteDefinitionToOpenapiPath(endpoint.route.definition)
  const method = endpoint.method.toLowerCase()

  const parameters = [
    ...buildOpenapiParametersBySchema(jsonSchemas.params, 'path'),
    ...buildOpenapiParametersBySchema(jsonSchemas.search, 'query'),
    ...buildOpenapiParametersBySchema(jsonSchemas.headers, 'header'),
    ...buildOpenapiParametersBySchema(jsonSchemas.cookies, 'cookie'),
  ]
  if (normalizedPoint.type === 'page' && normalizedPoint._getSsr()) {
    const outputTypeParameterName = 'X-Point0-Output-Type'
    const outputTypeEnum = normalizedPoint._hasServerLoader
      ? ['data', 'queryClientDehydratedState', 'html']
      : ['queryClientDehydratedState', 'html']
    const normalizedParameters = parameters.filter((parameter) => {
      return !(parameter.in === 'header' && parameter.name === outputTypeParameterName)
    })
    normalizedParameters.push({
      in: 'header',
      name: outputTypeParameterName,
      required: normalizedPoint._getSsr() && !normalizedPoint._hasServerLoader,
      schema: {
        type: 'string',
        enum: outputTypeEnum,
      },
      description: 'Output type of the response',
    })
    parameters.splice(0, parameters.length, ...normalizedParameters)
  }
  if (showTransformHeader) {
    parameters.push({
      in: 'header',
      name: 'X-Point0-Transform',
      required: false,
      schema: { type: 'string', enum: ['true', 'false'] },
      description: 'Transform the response body by transformer or not',
    })
  }
  const bodySchema = jsonSchemas.body ?? jsonSchemas.input
  const operationSchema: OpenAPIV3.OperationObject = {
    ...(normalizedPoint._openapiSchema ?? {}),
    parameters,
    responses: jsonSchemas.response ?? {
      200: {
        description: 'Successful response',
      },
    },
  }
  if (bodySchema) {
    operationSchema.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: bodySchema,
        },
      },
    }
  }
  if (normalizedPoint.type !== 'action') {
    if (!operationSchema.summary) {
      operationSchema.summary = normalizedPoint.toString()
    }
  }
  if (!operationSchema.operationId) {
    if (normalizedPoint.type === 'action') {
      if (normalizedPoint.name !== `${normalizedPoint.method} ${normalizedPoint.route?.definition}`) {
        operationSchema.operationId = normalizedPoint.name
      }
    } else {
      operationSchema.operationId = toCamelCase(normalizedPoint.name + '_' + normalizedPoint.type)
    }
  }
  return {
    [path]: {
      [method]: operationSchema,
    },
  }
}

const getModelsSchemasFromPoints = (points: Array<ReadyPoint | { point: ReadyPoint }>): Record<string, InputSchema> => {
  return points.reduce<Record<string, InputSchema>>((acc, point) => {
    return { ...acc, ...(point.point._modelsShemas ?? {}) }
  }, {})
}

const _cache = new Map<string, OpenapiSchemaV3_1 | OpenapiSchemaV3>()

export function getOpenapiSchemaFromPoints(
  points: Array<ReadyPoint | { point: ReadyPoint }>,
  options: OpenapiOptionsV3_1 & { cache?: string },
): OpenapiSchemaV3_1
export function getOpenapiSchemaFromPoints(
  points: Array<ReadyPoint | { point: ReadyPoint }>,
  options?: OpenapiOptionsV3 & { cache?: string },
): OpenapiSchemaV3
export function getOpenapiSchemaFromPoints(
  points: Array<ReadyPoint | { point: ReadyPoint }>,
  options: (OpenapiOptionsV3_1 | OpenapiOptionsV3) & { cache?: string } = {},
): OpenapiSchemaV3_1 | OpenapiSchemaV3 {
  const { models: providedModelsSchemas, helpers: providedSchemasHelpers, cache, ...providedDocument } = options

  if (cache) {
    const cached = _cache.get(cache)
    if (cached) {
      return cached
    }
  }

  const modelsSchemas = providedModelsSchemas ?? getModelsSchemasFromPoints(points)
  const schemasHelpers = providedSchemasHelpers ?? getSchemasHelpersFromPoints(points)
  const componentsSchemas = getModelJsonSchemas(modelsSchemas, schemasHelpers)

  const modelNameBySignature = new Map<string, string>()
  for (const [modelName, modelJsonSchema] of Object.entries(componentsSchemas)) {
    modelNameBySignature.set(stringify(modelJsonSchema), modelName)
  }

  const paths = points.reduce<Record<string, unknown>>((acc, point) => {
    const pointSchema = getOpenapiSchemaFromPoint(point, {
      modelNameBySignature,
    })
    if (!pointSchema || !isObjectRecord(pointSchema)) {
      return acc
    }
    return { ...acc, ...pointSchema }
  }, {})

  const version = providedDocument.openapi ?? '3.0.0'

  const schema = {
    ...providedDocument,
    openapi: version,
    paths: {
      ...paths,
      ...providedDocument.paths,
    },
    components: {
      ...providedDocument.components,
      schemas: {
        ...componentsSchemas,
        ...providedDocument.components?.schemas,
      },
    },
  }

  if (cache) {
    _cache.set(cache, schema as never)
  }

  return schema as never
}

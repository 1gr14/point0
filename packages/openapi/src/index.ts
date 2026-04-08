import { env } from '@point0/core'
import type {
  AnyNiceRequestableReadyPoint,
  InputSchema,
  MiddlewareFn,
  ReadyPoint,
  RecordValidationSchema,
  ResponseContentType,
  SchemaHelper,
} from '@point0/core'
import { extractJsonSchemaBySchemasHelpers } from '@point0/core/schema/utils'
import type { ApiReferenceConfigurationWithSource } from '@scalar/types/api-reference'
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types'
import stringify from 'safe-stable-stringify'

export type OpenapiMiddlewareOptionsGeneral = {
  route: string
  filter?: ((point: AnyNiceRequestableReadyPoint) => boolean) | 'all' | 'action'
  scalar?: (Partial<ApiReferenceConfigurationWithSource> & { route?: string }) | true
}

export type OpenapiMiddlewareOptions<TOpenapiVersion extends string> = OpenapiOptions<TOpenapiVersion> &
  OpenapiMiddlewareOptionsGeneral

export type OpenapiOptionsV3 = {
  helpers?: SchemaHelper[]
  models?: Record<string, InputSchema>
  openapi?: `3.0${string}`
} & Partial<OpenAPIV3.Document>

export type OpenapiOptionsV3_1 = {
  helpers?: SchemaHelper[]
  models?: Record<string, InputSchema>
  openapi: `3.1${string}`
} & Partial<OpenAPIV3_1.Document>

export type OpenapiOptions<TOpenapiVersion extends string> = TOpenapiVersion extends `3.1${string}`
  ? OpenapiOptionsV3_1
  : OpenapiOptionsV3

type OpenapiSchemaV3 = Partial<OpenAPIV3.Document> &
  Pick<OpenAPIV3.Document, 'paths'> & {
    components: NonNullable<OpenAPIV3.Document['components']>
  }
type OpenapiSchemaV3_1 = Partial<OpenAPIV3_1.Document> &
  Pick<OpenAPIV3_1.Document, 'paths'> & {
    components: NonNullable<OpenAPIV3_1.Document['components']>
  }
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
  response: NormalizedResponseJsonSchema | undefined
}

type NormalizedResponseJsonSchema = Partial<
  Record<
    number,
    {
      description?: string
      content: Partial<
        Record<
          ResponseContentType,
          {
            schema: JsonSchema
            description?: string
            examples?: Record<string, any>
          }
        >
      >
    }
  >
>

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

const escapeForInlineScriptString = (value: string): string => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/</g, '\\u003C')
}

const serializeToJsLiteral = (value: unknown, seen = new WeakSet<object>()): string => {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }
  if (typeof value === 'string') {
    return `'${escapeForInlineScriptString(value)}'`
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'null'
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'bigint') {
    return `BigInt('${value.toString()}')`
  }
  if (typeof value === 'function') {
    return value.toString()
  }
  if (typeof value !== 'object') {
    return 'undefined'
  }
  if (seen.has(value)) {
    throw new TypeError('Cannot serialize circular structure to inline JavaScript')
  }
  seen.add(value)

  if (Array.isArray(value)) {
    const serializedItems = value.map((item) => serializeToJsLiteral(item, seen)).join(', ')
    seen.delete(value)
    return `[${serializedItems}]`
  }

  if (value instanceof Date) {
    const iso = escapeForInlineScriptString(value.toISOString())
    seen.delete(value)
    return `new Date('${iso}')`
  }

  if (value instanceof RegExp) {
    const source = escapeForInlineScriptString(value.source)
    const flags = escapeForInlineScriptString(value.flags)
    seen.delete(value)
    return `new RegExp('${source}', '${flags}')`
  }

  const entries = Object.entries(value as Record<string, unknown>)
  const serializedEntries = entries
    .map(([key, entryValue]) => {
      const normalizedKey = /^[$A-Z_][0-9A-Z_$]*$/i.test(key) ? key : `'${escapeForInlineScriptString(key)}'`
      return `${normalizedKey}: ${serializeToJsLiteral(entryValue, seen)}`
    })
    .join(', ')

  seen.delete(value)
  return `{ ${serializedEntries} }`
}

const buildOpenapiParametersBySchema = (
  schema: JsonSchema | undefined,
  kind: OpenapiParameterIn,
): Array<Record<string, unknown>> => {
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

export const getJsonSchemasFromPoint = (
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
    const responseJsonSchema: NormalizedResponseJsonSchema = {}
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
        if (!responseJsonSchema[status]) {
          responseJsonSchema[status] = {
            description: responseStatusSchema.description,
            content: {},
          }
        }
        responseJsonSchema[status].content[contentType] = {
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

export const getOpenapiSchemaFromPoint = (
  point: ReadyPoint | { point: ReadyPoint },
  options?: {
    modelNameBySignature?: Map<string, string>
    schemasHelpers?: SchemaHelper[]
  },
): object | undefined => {
  const normalizedPoint = point.point
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
  const bodySchema = jsonSchemas.body ?? jsonSchemas.input
  const operationSchema: Record<string, unknown> = {
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

  return {
    [path]: {
      [method]: operationSchema,
    },
  }
}

export const getModelsSchemasFromPoints = (
  points: Array<ReadyPoint | { point: ReadyPoint }>,
): Record<string, InputSchema> => {
  return points.reduce<Record<string, InputSchema>>((acc, point) => {
    return { ...acc, ...(point.point._modelsShemas ?? {}) }
  }, {})
}

export function getOpenapiSchemaFromPoints(
  points: Array<ReadyPoint | { point: ReadyPoint }>,
  options: OpenapiOptionsV3_1,
): OpenapiSchemaV3_1
export function getOpenapiSchemaFromPoints(
  points: Array<ReadyPoint | { point: ReadyPoint }>,
  options?: OpenapiOptionsV3,
): OpenapiSchemaV3
export function getOpenapiSchemaFromPoints(
  points: Array<ReadyPoint | { point: ReadyPoint }>,
  options: OpenapiOptionsV3_1 | OpenapiOptionsV3 = {},
): OpenapiSchemaV3_1 | OpenapiSchemaV3 {
  const { models: providedModelsSchemas, helpers: providedSchemasHelpers, ...providedDocument } = options
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

  const schema = {
    ...providedDocument,
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
  return schema as never
}

const _cache = new Map<string, any>()

export const openapi = <TOpenapiVersion extends string>(
  options: OpenapiMiddlewareOptions<TOpenapiVersion>,
): MiddlewareFn<any> => {
  if (env.side.is.client) {
    return async ({ next }) => {
      return await next()
    }
  } else {
    const { route: jsonRoute, filter: filterProvided, scalar, ...openapiOptions } = options
    const filter =
      filterProvided === 'all'
        ? () => true
        : filterProvided === 'action'
          ? (point: AnyNiceRequestableReadyPoint) => point.type === 'action'
          : (filterProvided ?? ((point: AnyNiceRequestableReadyPoint) => point.type === 'action'))
    const { route: scalarRouteProvided, ...scalarOptions } = (
      scalar === true ? {} : scalar || {}
    ) as Partial<ApiReferenceConfigurationWithSource> & { route?: string }
    const scalarOptionsNormalized = !scalar
      ? undefined
      : {
          ...scalarOptions,
          url: scalarOptions.url ?? jsonRoute,
        }
    const scalarRoute = !scalar
      ? undefined
      : (scalarRouteProvided ?? (jsonRoute.endsWith('.json') ? jsonRoute.slice(0, -5) : `${jsonRoute}.scalar`))

    const middleware: MiddlewareFn<any> = async ({ next, request, points }) => {
      if (request.method !== 'GET') {
        return await next()
      }

      if (request.location.pathname === jsonRoute) {
        const schema = (() => {
          const cache = _cache.get(jsonRoute)
          if (cache) {
            return cache
          }
          const filterdPoints = points.filter(filter)
          const schema = getOpenapiSchemaFromPoints(filterdPoints, openapiOptions as never)
          _cache.set(jsonRoute, schema)
          return schema
        })()
        return new Response(JSON.stringify(schema), {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }

      if (scalarRoute && request.location.pathname === scalarRoute) {
        return new Response(
          `<!doctype html>
      <html>
        <head>
          <title>API Reference</title>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1" />
        </head>
        <body>
          <div id="app"></div>
          <!-- Load the Script -->
          <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
          <!-- Initialize the API Reference -->
          <script>
            Scalar.createApiReference('#app', ${serializeToJsLiteral(scalarOptionsNormalized)})
          </script>
        </body>
      </html>`,
          {
            headers: {
              'Content-Type': 'text/html',
            },
          },
        )
      }

      return await next()
    }

    return middleware
  }
}

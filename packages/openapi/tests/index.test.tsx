import { Point0 } from '@point0/core'
import { zodSchemaHelper } from '@point0/core/schema/zod'
import { describe, expect, it } from 'bun:test'
import superjson from 'superjson'
import { z } from 'zod'
import { createTestThings } from '../../engine/tests/utils/internal-testing.js'
import { openapi } from '../src/index.js'
import { basicAuth, getBasicAuthHeader } from '@point0/basic-auth'

describe('openapi', () => {
  const zResult = z.object({
    id: z.string().min(1).describe('id description'),
    name: z.string().optional().describe('name description'),
    nickname: z.string().min(1).describe('nickname description'),
  })

  const createRoot = () =>
    Point0.lets('root', 'root')
      .transformer(superjson)
      .models({
        entity: zResult,
      })
      .middleware(
        openapi({
          before: async ({ next, set }) => {
            set.headers('x', 'test-1')
            return await next()
          },
          route: '/openapi.json',
          scalar: { route: '/openapi', onLoaded: () => console.info('Hello') },
          swagger: { route: '/swagger', showExtensions: true },
          filter: 'all',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
        }),
      )
      .queryOptions({
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
      })
      .schemaHelper(zodSchemaHelper())
      .root()

  it('general', async () => {
    const root = createRoot()
    const query = root
      .lets('query', 'query1')
      .loader(() => {
        return {
          x: 'test-1',
        }
      })
      .query()

    const page = root.lets('page', 'page1', '/').page(() => <div id="page">page1</div>)

    const action1 = root
      .lets('action', 'action1', 'POST', '/api/my-test/:id')
      .openapi({
        description: 'Action 1 description',
        summary: 'Action 1 summary',
        operationId: 'action1',
        tags: ['actions', 'action1'],
        deprecated: true,
      })
      .params(z.object({ id: z.string().min(1).describe('id description') }))
      .headers(z.object({ x: z.string().min(1).describe('x description') }))
      .search(z.object({ y: z.string().min(1).describe('y description') }))
      .body(z.object({ b: z.number().min(1).describe('b description'), d: z.bigint().describe('d description') }))
      .response(z.object({ entity: zResult, x: z.string().min(1).describe('x description') }))
      .loader(() => {
        return {
          x: 'test-1',
          entity: {
            id: '1',
            name: 'test-1',
            nickname: 'test-1',
          },
        }
      })
      .action()

    const action2 = root
      .lets('action', 'action2', 'POST', '/api/another-test/:id')
      .headers(z.object({ x: z.string().min(1) }))
      .search(z.object({ y: z.string().min(1) }))
      .body(z.object({ b: z.number().min(1), d: z.bigint() }))
      .response(z.object({ entity: zResult, y: z.string().min(1) }))
      .loader(() => {
        return {
          y: 'test-2',
          entity: {
            id: '1',
            name: 'test-2',
            nickname: 'test-2',
          },
        }
      })
      .action()

    const { fetch } = await createTestThings({ points: [root, query, action1, action2, page], ssr: true })
    const response1 = await fetch('http://localhost:3000/openapi.json')
    expect(response1.headers.get('x')).toBe('test-1')
    const json1 = await response1.json()
    expect(json1).toMatchInlineSnapshot(`
      {
        "components": {
          "schemas": {
            "entity": {
              "additionalProperties": false,
              "properties": {
                "id": {
                  "description": "id description",
                  "minLength": 1,
                  "type": "string",
                },
                "name": {
                  "description": "name description",
                  "type": "string",
                },
                "nickname": {
                  "description": "nickname description",
                  "minLength": 1,
                  "type": "string",
                },
              },
              "required": [
                "id",
                "nickname",
              ],
              "type": "object",
            },
          },
        },
        "info": {
          "title": "Test API",
          "version": "1.0.0",
        },
        "openapi": "3.0.0",
        "paths": {
          "/_point0/root/query/query1": {
            "post": {
              "operationId": "query1Query",
              "parameters": [
                {
                  "description": "Transform the response body by transformer or not",
                  "in": "header",
                  "name": "X-Point0-Transform",
                  "required": false,
                  "schema": {
                    "enum": [
                      "true",
                      "false",
                    ],
                    "type": "string",
                  },
                },
              ],
              "responses": {
                "200": {
                  "description": "Successful response",
                },
              },
              "summary": "root:query:query1",
            },
          },
          "/api/another-test/{id}": {
            "post": {
              "operationId": "action2",
              "parameters": [
                {
                  "in": "path",
                  "name": "id",
                  "required": true,
                  "schema": {
                    "anyOf": [
                      {
                        "type": "string",
                      },
                      {
                        "type": "number",
                      },
                    ],
                  },
                },
                {
                  "in": "query",
                  "name": "y",
                  "required": true,
                  "schema": {
                    "minLength": 1,
                    "type": "string",
                  },
                },
                {
                  "in": "header",
                  "name": "x",
                  "required": true,
                  "schema": {
                    "minLength": 1,
                    "type": "string",
                  },
                },
                {
                  "description": "Transform the response body by transformer or not",
                  "in": "header",
                  "name": "X-Point0-Transform",
                  "required": false,
                  "schema": {
                    "enum": [
                      "true",
                      "false",
                    ],
                    "type": "string",
                  },
                },
              ],
              "responses": {
                "200": {
                  "content": {
                    "application/json": {
                      "schema": {
                        "additionalProperties": false,
                        "properties": {
                          "entity": {
                            "$ref": "#/components/schemas/entity",
                          },
                          "y": {
                            "minLength": 1,
                            "type": "string",
                          },
                        },
                        "required": [
                          "entity",
                          "y",
                        ],
                        "type": "object",
                      },
                    },
                  },
                  "description": "Successful response",
                },
              },
            },
          },
          "/api/my-test/{id}": {
            "post": {
              "deprecated": true,
              "description": "Action 1 description",
              "operationId": "action1",
              "parameters": [
                {
                  "in": "path",
                  "name": "id",
                  "required": true,
                  "schema": {
                    "anyOf": [
                      {
                        "type": "string",
                      },
                      {
                        "type": "number",
                      },
                    ],
                    "description": "id description",
                    "minLength": 1,
                    "type": "string",
                  },
                },
                {
                  "in": "query",
                  "name": "y",
                  "required": true,
                  "schema": {
                    "description": "y description",
                    "minLength": 1,
                    "type": "string",
                  },
                },
                {
                  "in": "header",
                  "name": "x",
                  "required": true,
                  "schema": {
                    "description": "x description",
                    "minLength": 1,
                    "type": "string",
                  },
                },
                {
                  "description": "Transform the response body by transformer or not",
                  "in": "header",
                  "name": "X-Point0-Transform",
                  "required": false,
                  "schema": {
                    "enum": [
                      "true",
                      "false",
                    ],
                    "type": "string",
                  },
                },
              ],
              "responses": {
                "200": {
                  "content": {
                    "application/json": {
                      "schema": {
                        "additionalProperties": false,
                        "properties": {
                          "entity": {
                            "$ref": "#/components/schemas/entity",
                          },
                          "x": {
                            "description": "x description",
                            "minLength": 1,
                            "type": "string",
                          },
                        },
                        "required": [
                          "entity",
                          "x",
                        ],
                        "type": "object",
                      },
                    },
                  },
                  "description": "Successful response",
                },
              },
              "summary": "Action 1 summary",
              "tags": [
                "actions",
                "action1",
              ],
            },
          },
        },
      }
    `)

    const response2 = await fetch('http://localhost:3000/openapi')
    expect(response2.headers.get('x')).toBe('test-1')
    const html2 = await response2.text()
    expect(html2).toMatchInlineSnapshot(`
      "<!doctype html>
      <html lang="en">
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
            Scalar.createApiReference('#app', { onLoaded: () => console.info("Hello"), url: '/openapi.json' })
          </script>
        </body>
      </html>"
    `)

    const response3 = await fetch('http://localhost:3000/swagger')
    expect(response3.headers.get('x')).toBe('test-1')
    const html3 = await response3.text()
    expect(html3).toMatchInlineSnapshot(`
      "<!doctype html>
      <html lang="en">
        <head>
          <title>Swagger UI</title>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1" />
          <link
            rel="stylesheet"
            href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
          <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
          <script>
            SwaggerUIBundle({ dom_id: '#swagger-ui', layout: 'BaseLayout', showExtensions: true, url: '/openapi.json' , presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset] })
          </script>
        </body>
      </html>"
    `)
  })

  it('can be protected by basic-auth', async () => {
    const root = Point0.lets('root', 'root')
      .transformer(superjson)
      .middleware(
        openapi({
          before: basicAuth({ users: { admin: 'zxc' } }),
          cache: false,
          route: '/openapi.json',
          scalar: { route: '/openapi', onLoaded: () => console.info('Hello') },
          swagger: { route: '/swagger', showExtensions: true },
          filter: 'all',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
        }),
      )
      .queryOptions({
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
      })
      .schemaHelper(zodSchemaHelper())
      .root()
    const action = root.lets('action', 'action1', 'GET', '/api/test').action(() => {
      return {
        x: 'test',
      }
    })
    const { fetch } = await createTestThings({ points: [root, action], ssr: true })

    const response1 = await fetch('http://localhost:3000/openapi.json')
    expect(response1.status).toBe(401)
    expect(response1.headers.get('WWW-Authenticate')).toBe('Basic realm="Restricted", charset="UTF-8"')

    const response2 = await fetch('http://localhost:3000/openapi.json', {
      headers: {
        Authorization: getBasicAuthHeader('admin', 'zxc'),
      },
    })
    expect(response2.status).toBe(200)
    const json2 = await response2.json()
    expect(json2).toMatchInlineSnapshot(`
      {
        "components": {
          "schemas": {},
        },
        "info": {
          "title": "Test API",
          "version": "1.0.0",
        },
        "openapi": "3.0.0",
        "paths": {
          "/api/test": {
            "get": {
              "operationId": "action1",
              "parameters": [
                {
                  "description": "Transform the response body by transformer or not",
                  "in": "header",
                  "name": "X-Point0-Transform",
                  "required": false,
                  "schema": {
                    "enum": [
                      "true",
                      "false",
                    ],
                    "type": "string",
                  },
                },
              ],
              "responses": {
                "200": {
                  "description": "Successful response",
                },
              },
            },
          },
        },
      }
    `)
  })

  it('uses multipart/form-data for file body schema', async () => {
    const root = Point0.lets('root', 'root')
      .transformer(superjson)
      .middleware(
        openapi({
          cache: false,
          route: '/openapi.json',
          filter: 'all',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
        }),
      )
      .schemaHelper(zodSchemaHelper())
      .root()

    const uploadAction = root
      .lets('action', 'upload', 'POST', '/api/upload')
      .body(
        z.object({
          file: z.file(),
        }),
      )
      .action(() => {
        return { ok: true }
      })

    const { fetch } = await createTestThings({ points: [root, uploadAction], ssr: true })
    const response = await fetch('http://localhost:3000/openapi.json')
    expect(response.status).toBe(200)
    const json = await response.json()
    const requestBody = json.paths?.['/api/upload']?.post?.requestBody

    expect(requestBody?.content?.['multipart/form-data']?.schema).toEqual({
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          contentEncoding: 'binary',
        },
      },
      additionalProperties: false,
    })
    expect(requestBody?.content?.['application/json']).toBeUndefined()
  })

  it('sets request body required to false when all body items are optional', async () => {
    const root = Point0.lets('root', 'root')
      .transformer(superjson)
      .middleware(
        openapi({
          cache: false,
          route: '/openapi.json',
          filter: 'all',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
        }),
      )
      .schemaHelper(zodSchemaHelper())
      .root()

    const optionalBodyAction = root
      .lets('action', 'optional-body', 'POST', '/api/optional-body')
      .body(
        z.object({
          id: z.string().optional(),
          age: z.number().default(1),
        }),
      )
      .action(() => {
        return { ok: true }
      })

    const { fetch } = await createTestThings({ points: [root, optionalBodyAction], ssr: true })
    const response = await fetch('http://localhost:3000/openapi.json')
    expect(response.status).toBe(200)
    const json = await response.json()
    const requestBody = json.paths?.['/api/optional-body']?.post?.requestBody

    expect(requestBody?.required).toBe(false)
    expect(requestBody?.content?.['application/json']?.schema).toEqual({
      type: 'object',
      required: ['age'],
      properties: {
        id: {
          type: 'string',
        },
        age: {
          type: 'number',
          default: 1,
        },
      },
      additionalProperties: false,
    })
  })

  it('hideTransformHeader drops X-Point0-Transform and never leaks the option into the document', async () => {
    const root = Point0.lets('root', 'root')
      .transformer(superjson)
      .middleware(
        openapi({
          cache: false,
          route: '/openapi.json',
          hideTransformHeader: true,
          filter: 'all',
          info: { title: 'Test API', version: '1.0.0' },
        }),
      )
      .schemaHelper(zodSchemaHelper())
      .root()
    const action = root.lets('action', 'action1', 'POST', '/api/test').action(() => ({ x: 'test' }))
    const { fetch } = await createTestThings({ points: [root, action], ssr: true })
    const response = await fetch('http://localhost:3000/openapi.json')
    expect(response.status).toBe(200)
    const text = await response.text()
    // the auto-added transform header parameter is suppressed everywhere in the spec
    expect(text).not.toContain('X-Point0-Transform')
    // and the flag itself does not bleed into the emitted document
    const json = JSON.parse(text)
    expect('hideTransformHeader' in json).toBe(false)
  })

  it('emits every status from an already-normalized response map', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(
        openapi({
          cache: false,
          route: '/openapi.json',
          filter: 'all',
          info: { title: 'Test API', version: '1.0.0' },
        }),
      )
      .schemaHelper(zodSchemaHelper())
      .root()
    const action = root
      .lets('action', 'multi', 'POST', '/api/multi')
      .response({
        200: { description: 'ok', content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } } },
        404: { description: 'missing', content: { 'application/json': { schema: z.object({ error: z.string() }) } } },
      })
      .loader(() => ({ ok: true }))
      .action()
    const { fetch } = await createTestThings({ points: [root, action], ssr: true })
    const response = await fetch('http://localhost:3000/openapi.json')
    expect(response.status).toBe(200)
    const json = await response.json()
    const responses = json.paths?.['/api/multi']?.post?.responses
    expect(Object.keys(responses ?? {}).sort()).toEqual(['200', '404'])
  })
})

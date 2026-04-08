import { Point0 } from '@point0/core'
import { zodSchemaHelper } from '@point0/core/schema/zod'
import { describe, expect, it } from 'bun:test'
import superjson from 'superjson'
import { z } from 'zod'
import { getOpenapiSchemaFromPoints } from '../src/index.js'

describe('openapi', () => {
  const zResult = z.object({ id: z.string().min(1), name: z.string().optional(), nickname: z.string().min(1) })

  const createRoot = () =>
    Point0.lets('root', 'root')
      .transformer(superjson)
      .models({
        entity: zResult,
      })
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
    const action1 = root
      .lets('action', 'action1', 'POST', '/api/my-test/:id')
      .params(z.object({ id: z.string().min(1) }))
      .headers(z.object({ x: z.string().min(1) }))
      .search(z.object({ y: z.string().min(1) }))
      .body(z.object({ b: z.number().min(1), d: z.bigint() }))
      .response(z.object({ entity: zResult, x: z.string().min(1) }))
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
      .lets('action', 'action2', 'POST', '/api/my-test')
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

    const schema1 = getOpenapiSchemaFromPoints([action1, action2], {
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
    })
    expect(schema1).toMatchInlineSnapshot(`
      {
        "components": {
          "schemas": {
            "entity": {
              "additionalProperties": false,
              "properties": {
                "id": {
                  "minLength": 1,
                  "type": "string",
                },
                "name": {
                  "type": "string",
                },
                "nickname": {
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
        "paths": {
          "/api/my-test": {
            "post": {
              "parameters": [
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
              ],
              "responses": {
                "200": {
                  "content": {
                    "application/json": {
                      "description": undefined,
                      "examples": undefined,
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
              "parameters": [
                {
                  "in": "path",
                  "name": "id",
                  "required": true,
                  "schema": {
                    "minLength": 1,
                    "type": "string",
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
              ],
              "responses": {
                "200": {
                  "content": {
                    "application/json": {
                      "description": undefined,
                      "examples": undefined,
                      "schema": {
                        "additionalProperties": false,
                        "properties": {
                          "entity": {
                            "$ref": "#/components/schemas/entity",
                          },
                          "x": {
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
            },
          },
        },
      }
    `)
  })
})

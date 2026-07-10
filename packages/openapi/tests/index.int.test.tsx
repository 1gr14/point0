import { Point0, defer } from '@point0/core'
import { zodSchemaHelper } from '@point0/core/schema/zod'
import { describe, expect, it } from 'bun:test'
import superjson from 'superjson'
import { z } from 'zod'
import { createTestThings } from '../../engine/tests/utils/internal-testing.js'
import { getOpenapiSchemaFromPoints, openapi } from '../src/index.js'
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
            "get": {
              "operationId": "query1Query",
              "parameters": [
                {
                  "description": "Transform the response body by transformer or not",
                  "in": "header",
                  "name": "x-point0-transform",
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
            "post": {
              "operationId": "query1QueryPost",
              "parameters": [
                {
                  "description": "Transform the response body by transformer or not",
                  "in": "header",
                  "name": "x-point0-transform",
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
                  "name": "x-point0-transform",
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
                  "name": "x-point0-transform",
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
                  "name": "x-point0-transform",
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

  it('documents a query endpoint under both GET (?input=) and POST (body), with or without input', async () => {
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

    const withInput = root
      .lets('query', 'withInput')
      .input(z.object({ id: z.string().min(1) }))
      .loader(({ input }) => ({ id: input.id }))
      .query()

    const noInput = root
      .lets('query', 'noInput')
      .loader(() => ({ ok: true }))
      .query()

    const { fetch } = await createTestThings({ points: [root, withInput, noInput], ssr: true })
    const response = await fetch('http://localhost:3000/openapi.json')
    expect(response.status).toBe(200)
    const json = await response.json()

    // Input-bearing query: GET carries the input in the ?input= query param; POST carries it in the JSON body.
    const withInputPath = json.paths?.['/_point0/root/query/with-input']
    expect(withInputPath?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          in: 'query',
          name: 'input',
          content: { 'application/json': { schema: expect.any(Object) } },
        }),
      ]),
    )
    expect(withInputPath?.get?.requestBody).toBeUndefined()
    expect(withInputPath?.post?.requestBody?.content?.['application/json']?.schema).toBeDefined()
    expect(withInputPath?.post?.parameters ?? []).not.toContainEqual(
      expect.objectContaining({ in: 'query', name: 'input' }),
    )

    // No-input query: still documented under both methods; neither carries input.
    const noInputPath = json.paths?.['/_point0/root/query/no-input']
    expect(noInputPath?.get).toBeDefined()
    expect(noInputPath?.post).toBeDefined()
    expect(noInputPath?.post?.requestBody).toBeUndefined()
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

  it('hideTransformHeader drops x-point0-transform and never leaks the option into the document', async () => {
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
    expect(text).not.toContain('x-point0-transform')
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

  // SSR resolves per-side, and the spec is generated on the server, so a page's ambient `_getSsrEnabled()` reports the
  // server's SSR — not the SSR of the client that owns the page. The `html` / `queryClientDehydratedState` output types
  // only make sense when the owning client SSRs, so the enum must resolve by the point's scope via the engine-supplied
  // `ssrByScope` map, not the ambient value. Each page carries a server loader so its endpoint survives regardless of
  // the ambient SSR (that would otherwise strip `_endpoint` at authoring time and drop the page from the spec).
  describe('x-point0-output-type reflects the owning scope SSR, not the ambient one', () => {
    const scopedPage = ({ scope, name, clientOnly }: { scope: string; name: string; clientOnly?: boolean }) => {
      const root = Point0.lets('root', scope).root()
      const base = root.lets('page', name, `/${name}`).loader(() => ({ ok: true }))
      return (clientOnly ? base.clientOnly() : base).page(() => <div />)
    }

    // The path keys whose page operation advertises the SSR-only output-type header.
    const outputTypeHeaderPaths = (spec: any): string[] => {
      const paths: string[] = []
      for (const [pathKey, pathItem] of Object.entries<any>(spec.paths ?? {})) {
        for (const operation of Object.values<any>(pathItem)) {
          const parameters: any[] = operation?.parameters ?? []
          if (parameters.some((p) => p.in === 'header' && p.name === 'x-point0-output-type')) {
            paths.push(pathKey)
          }
        }
      }
      return paths
    }

    it('advertises for the ssr:true scope and not the ssr:false scope', () => {
      const pageA = scopedPage({ scope: 'scopea', name: 'pagea' })
      const pageB = scopedPage({ scope: 'scopeb', name: 'pageb' })
      const spec = getOpenapiSchemaFromPoints([pageA, pageB], {
        info: { title: 'T', version: '1.0.0' },
        ssrDefaultOptionsByScope: new Map([
          ['scopea', { enabled: true }],
          ['scopeb', { enabled: false }],
        ]),
      })
      const advertised = outputTypeHeaderPaths(spec)
      expect(advertised.some((path) => path.includes('pagea'))).toBe(true)
      expect(advertised.some((path) => path.includes('pageb'))).toBe(false)
      // Both pages keep their endpoint in the spec — only the advertised output-type header differs by scope.
      expect(Object.keys(spec.paths).some((path) => path.includes('pageb'))).toBe(true)
    })

    it('advertises for a clientOnly page too — clientOnly is irrelevant here, only SSR matters', () => {
      // A clientOnly page still SSRs: its layout renders on the server and ships HTML, only the page content is
      // browser-only. So the output-type header must be advertised — clientOnly is about where the render runs, not
      // whether the server serves the page.
      const co = scopedPage({ scope: 'scopec', name: 'pagec', clientOnly: true })
      const spec = getOpenapiSchemaFromPoints([co], {
        info: { title: 'T', version: '1.0.0' },
        ssrDefaultOptionsByScope: new Map([['scopec', { enabled: true }]]),
      })
      expect(outputTypeHeaderPaths(spec).some((path) => path.includes('pagec'))).toBe(true)
    })

    it('without a scope map, falls back to the ambient _getSsrEnabled() (back-compat)', () => {
      const pageD = scopedPage({ scope: 'scoped', name: 'paged' })
      const spec = getOpenapiSchemaFromPoints([pageD], { info: { title: 'T', version: '1.0.0' } })
      // With no map the resolver must behave exactly as before — advertise iff the ambient SSR says so.
      expect(outputTypeHeaderPaths(spec).length > 0).toBe(pageD.point._getSsrEnabled())
    })
  })

  it('an RSC loader with defer() and a promise prop keeps the schema generating and serves OpenAPI consumers an inline body', async () => {
    // OpenAPI consumers never advertise streaming (no x-point0-stream header), so a `defer()` in the loader must
    // degrade to a single JSON body with the subtree awaited inline — same for a promise handed to an island prop,
    // whose resolved value rides ON the node (`{ t: 3, v }`) — and a loader returning elements must not break schema
    // generation.
    const root = createRoot()
    const Slow = async () => <b>OPENAPI-INLINE</b>
    const Stats = root.lets<{ data?: Promise<string> }>('component', 'openapiStats').component(() => <div />)
    const report = root
      .lets('action', 'report', 'GET', '/api/report')
      .rsc({ depth: 1 })
      .loader(async () => ({
        x: defer(<Slow />, <span>fb</span>),
        w: <Stats data={Promise.resolve('OPENAPI-PP-INLINE')} />,
      }))
      .action()
    const { fetch } = await createTestThings({ points: [root, Stats, report] })
    // schema generation walks the RSC point without choking (built directly — the served /openapi.json reflects the
    // process-global root, which belongs to the first test in this file)
    const schema = getOpenapiSchemaFromPoints([root, report], { info: { title: 'T', version: '1.0.0' } })
    expect(Object.keys(schema.paths as Record<string, unknown>)).toContain('/api/report')
    const dataRes = await fetch('http://localhost:3000/api/report')
    expect(dataRes.status).toBe(200)
    expect(dataRes.headers.get('x-point0-stream')).toBeNull()
    const body = await dataRes.text()
    expect(body).toContain('OPENAPI-INLINE')
    expect(body).not.toContain('"t":2')
    // the promise prop inlined too: the value is IN the body, and no streaming hole id is advertised
    expect(body).toContain('OPENAPI-PP-INLINE')
  })
})

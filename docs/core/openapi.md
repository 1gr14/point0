---
index: 1100
title: OpenAPI
description: Turn every query, mutation, and action into an OpenAPI spec — served as JSON, Scalar, and Swagger — with no schema written by hand.
---

Every [query](query), [mutation](mutation), and [action](action) is already a
real HTTP endpoint with a typed input. The `@point0/openapi` package reads those
points and emits an OpenAPI document — one operation per endpoint, request and
response schemas pulled from your validation schemas. You add it as one
[middleware](middleware) on the [root](root); it serves the raw JSON spec plus
two ready UIs (Scalar and Swagger).

```tsx
import { openapi } from '@point0/openapi'
import { basicAuth } from '@point0/basic-auth'

export const root = Point0.lets
  .root()
  // ...
  .middleware(
    openapi({
      route: '/openapi.json', // serves the raw JSON spec
      scalar: '/scalar', // Scalar UI
      swagger: '/swagger', // Swagger UI
      filter: 'all', // include queries, mutations, pages — not just actions
      before: basicAuth({ users: { admin: 'admin' } }), // protect the docs
    }),
  )
  .root()
```

`GET /openapi.json` now returns the spec, `/scalar` and `/swagger` render it. The
rest of this page shows where each operation comes from and how to shape it.

## Installing

`@point0/openapi` is a separate package. Install it and import `openapi` from it:

```sh
bun add @point0/openapi
```

The spec is only generated on the **server**. On the client the middleware is a
no-op pass-through, so it ships nothing to the browser.

For schemas to make it into the spec, the root needs a
[schema helper](validation) registered — that is what teaches Point0 how to turn
a zod/valibot/… schema into JSON Schema:

```tsx
import { zodSchemaHelper } from '@point0/core/schema/zod'

export const root = Point0.lets.root().schemaHelper(zodSchemaHelper()).root()
```

Without a matching helper (or a Standard-Schema `jsonSchema.input`), a point's
request/response schemas can't be extracted and the operation is emitted without
them.

## What becomes an operation

Each point with an endpoint becomes one `path` → `method` → operation:

- A **query** → `POST /_point0/<scope>/query/<kebab-name>`
- A **mutation** → `POST /_point0/<scope>/mutation/<kebab-name>`
- An **action** → its declared method and route, e.g. `PUT /api/ideas/:id`
- A **page/layout** → `GET` at its route — but only when it's an endpoint (SSR on,
  or it has a server `.loader`); see [page or endpoint](page).

Scope, type, and name are all kebab-cased in the path, so a query named
`recentIdeas` in the `root` scope is served at
`POST /_point0/root/query/recent-ideas`. A point with no endpoint (a
client-loader-only query, a loader-less page) is skipped entirely. Route params
are converted to OpenAPI syntax — `:id` becomes `{id}`, so an action on
`/api/ideas/:id` shows up at `/api/ideas/{id}`.

### `filter` — what gets included

By default **only actions** appear in the spec. That is rarely what you want, so
every example passes `filter: 'all'`:

```tsx
openapi({ route: '/openapi.json', filter: 'all' }) // every endpoint point
openapi({ route: '/openapi.json' }) // default: actions only
openapi({ route: '/openapi.json', filter: 'action' }) // same as default, explicit
openapi({
  route: '/openapi.json',
  filter: (point) => point.tags.includes('public'), // a custom predicate
})
```

The predicate receives each ready point and runs *after* the endpoint check, so
you only ever filter points that already have an endpoint.

### summary and operationId

These are derived from the point automatically, so a fresh spec is already
readable:

```tsx
// a query named `idea` →
//   summary:     "root:query:idea"   (the point id: scope:type:name)
//   operationId: "ideaQuery"         (camelCase of name + '_' + type)
```

Two gotchas, both from how the point is named:

- **Actions get no auto-summary.** A query/mutation/page gets `summary` defaulted
  to its point id; an action shows a summary only if you set one with
  [`.openapi()`](#openapi-operation-metadata).
- **An action's `operationId` is its name** — but only when the action was given
  an explicit name. An action whose name is still the auto-generated
  `"METHOD /route"` gets no `operationId`. Name it (or set `operationId` via
  `.openapi()`) to get a stable one.

Anything you set explicitly always wins over the derived value.

## Request schemas

The request side is read straight from the point's [validation](validation)
schemas — you write the schema once, it both validates the request and documents
it.

- `.params(...)` → path parameters (always `required: true`)
- `.search(...)` → query parameters (`required` per the schema)
- `.headers(...)` → header parameters
- `.cookies(...)` → cookie parameters
- `.body(...)` (actions) / `.input(...)` (queries & mutations) → request body

```tsx
export const ideaUpdateAction = root.lets
  .action('PUT', '/api/ideas/:id')
  .params(z.object({ id: z.string().min(1) })) // → path param {id}, required
  .search(z.object({ draft: z.boolean().optional() })) // → query param, optional
  .body(z.object({ title: z.string().min(1), content: z.string().min(1) })) // → requestBody
  .action(/* ... */)
```

The request body is `application/json` by default. If the body schema contains a
file or blob field, the content type switches to `multipart/form-data` and the
JSON variant is dropped:

```tsx
.body(z.object({ avatar: z.file() }))
// → requestBody content is multipart/form-data;
//   avatar serializes to { type: 'string', format: 'binary', ... }
```

`requestBody.required` is `false` when every field in the body is optional, and
`true` otherwise.

### Auto-added header parameters

Two header parameters can appear that you did not declare:

- **`X-Point0-Transform`** — added to every endpoint when a
  [transformer](transformer) (e.g. `superjson`) is set on the root. It is
  `enum: ['true', 'false']`, optional, and controls whether the response body is
  run through the transformer. Suppress it with `hideTransformHeader: true`.
- **`X-Point0-Output-Type`** — added to a **page** endpoint when SSR is on
  (`enum` of `data` / `queryClientDehydratedState` / `html`), selecting the
  output format of the page response.

<!-- TODO(high): verify hideTransformHeader actually suppresses X-Point0-Transform through the middleware path before documenting it as effective -->


## Response schemas — `.response()`

The response type is **not** inferred from your loader's return type yet — declare
it with `.response()` if you want it in the spec. Without it, an endpoint shows a
bare `200: { description: 'Successful response' }`.

```tsx
export const ideaQuery = root.lets
  .query()
  .input(z.object({ id: z.number() }))
  .response(z.object({ idea: ideaSchema })) // → 200, application/json, this schema
  .loader(/* ... */)
  .query()
```

A plain schema is wrapped as a `200` JSON response. To document several statuses,
pass a map keyed by status code:

```tsx
.response({
  200: z.object({ idea: ideaSchema }), // → description: 'Successful response'
  404: z.object({ message: z.string() }), // → description: 'Error response' (4xx)
})
```

A 4xx status gets the description `'Error response'`; anything else gets
`'Successful response'`. For full control — custom content types, descriptions,
or examples — pass an already-normalized response object:

```tsx
.response({
  200: {
    description: 'The idea',
    content: { 'application/json': { schema: z.object({ idea: ideaSchema }) } },
  },
})
```

`.response()` is available on the endpoint points — queries, mutations, and
actions.

<!-- TODO(low): the examples field on a normalized response and non-JSON content types (text/plain, image/*, …) are allowed by the types but not exercised by any test or example — confirm before presenting as worked examples -->


## `.openapi()` — operation metadata

`.openapi()` sets the OpenAPI fields that aren't generated — `summary`,
`description`, `operationId`, `tags`, `deprecated`, `externalDocs`, `security`,
and so on:

```tsx
export const ideaUpdateAction = root.lets
  .action('PUT', '/api/ideas/:id')
  .body(z.object({ title: z.string().min(1), content: z.string().min(1) }))
  .response(z.object({ idea: ideaSchema }))
  .openapi({
    summary: 'Update an idea',
    description: 'Updates an existing idea and returns it',
    operationId: 'updateIdea',
    tags: ['ideas'],
    deprecated: false,
  })
  .action(/* ... */)
```

You **cannot** set `parameters`, `requestBody`, or `responses` through
`.openapi()` — those are generated from your schemas (and `.response()`). The
argument type omits exactly those three keys; everything else on an OpenAPI
operation object is allowed, including `x-*` extensions.

Call `.openapi()` more than once and the objects merge — last call wins per key,
**except `tags`, which are unioned and de-duplicated** across calls:

```tsx
.openapi({ tags: ['ideas'], summary: 'A' })
.openapi({ tags: ['public'], summary: 'B' })
// → summary: 'B', tags: ['ideas', 'public']
```

### tags and description are never auto-generated

Point0 maps `tags` and `description` to the operation **only when you set them via
`.openapi()`** — there is no derivation from the point's name, scope, or its
`.tag()` / `.description()` metadata. If you want grouped, described operations,
pass `tags` and `description` to `.openapi()` explicitly. (`summary`,
`operationId`, `deprecated` from `.openapi()` are mapped the same way — set, and
they land on the operation.)

## Models and `$ref`

Schemas you register as named models on the root with `.models({...})` are emitted
under `components.schemas`, and any inline request/response schema that exactly
matches a model is replaced by a `$ref` to it:

```tsx
export const root = Point0.lets
  .root()
  .schemaHelper(zodSchemaHelper())
  .models({ idea: ideaSchema }) // → components.schemas.idea
  .root()

// an action that returns { idea: ideaSchema } now references it:
//   "idea": { "$ref": "#/components/schemas/idea" }
```

Matching is by a deterministic signature, so two structurally identical inline
schemas collapse to the same `$ref`.

## The UIs: Scalar and Swagger

`scalar` and `swagger` each take either a string (the route to serve the UI at) or
an object — UI options plus a `route`:

```tsx
openapi({
  route: '/openapi.json',
  scalar: '/scalar', // string form
  swagger: { route: '/swagger', showExtensions: true }, // object form + options
})
```

Each UI defaults its spec `url` to the `route` you set for the JSON spec, so you
don't repeat it. Omit `scalar` or `swagger` and that UI route simply isn't served.
Scalar options are `@scalar/api-reference` config (e.g. `theme`, `onLoaded`);
Swagger options are `swagger-ui` config. Both UIs load their bundles from a CDN.

<!-- TODO(low): pull the enumerated Scalar (ApiReferenceConfigurationWithSource) and Swagger (SwaggerUIOptions) option lists from each tool's own docs -->


## Protecting the docs

The `before` option runs middleware **only on the doc routes** (json/scalar/swagger),
not on every request — the natural place to put auth in front of your spec. The
canonical guard is [`@point0/basic-auth`](basic-auth):

```tsx
import { basicAuth } from '@point0/basic-auth'

openapi({
  route: '/openapi.json',
  scalar: '/scalar',
  swagger: '/swagger',
  filter: 'all',
  before: basicAuth({ users: serverEnv.OPENAPI_CREDENTIALS }), // env-driven in prod
})
```

Without credentials the doc routes return `401` with a `WWW-Authenticate` header;
with valid credentials they serve normally. `before` accepts a single middleware
or an array.

## Caching

The generated spec is **cached by default**, keyed by the JSON route. Tune it with
`cache`:

```tsx
openapi({ route: '/openapi.json' }) // default: cached under '/openapi.json'
openapi({ route: '/openapi.json', cache: false }) // never cache — rebuild every hit
openapi({ route: '/openapi.json', cache: 'specs' }) // cache under a custom key
openapi({ route: '/openapi.json', cache: true }) // explicit: cache under the json route
```

Because caching is on by default, schema changes you make at runtime won't show up
until the process restarts — pass `cache: false` if you need a fresh spec on every
request (e.g. while iterating).

## Document-level fields

`openapi(...)` also accepts any top-level field of an OpenAPI document — they are
merged into the output, with your values overriding the generated ones:

```tsx
openapi({
  route: '/openapi.json',
  filter: 'all',
  openapi: '3.0.0', // spec version; default '3.0.0'. Use '3.1.x' for OpenAPI 3.1 types
  info: { title: 'My API', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com' }],
})
```

The `openapi` version string is a type discriminator: a `'3.1...'` value switches
the option and output types to OpenAPI 3.1. `info`, `servers`, `tags`,
`security`, `components`, and the rest are passed straight through.

<!-- TODO(low): servers / security / multi-status response examples are supported by the types but not exercised by any test or example — verify before presenting as worked examples -->


## Generating the spec without the middleware

For tooling that needs the spec outside a request (writing it to a file at build
time, say), `getOpenapiSchemaFromPoints` is exported — it's what the middleware
calls internally:

```tsx
import { getOpenapiSchemaFromPoints } from '@point0/openapi'

const spec = getOpenapiSchemaFromPoints(points, {
  info: { title: 'My API', version: '1.0.0' },
})
```

It takes an array of ready points (or `{ point }` wrappers) and the same
document-level options as the middleware, and returns the spec object.

## Reference

### `openapi(options)` options

| Option                | Type                                                        | Default                  |
| --------------------- | ----------------------------------------------------------- | ------------------------ |
| `route`               | `string` (**required**)                                     | —                        |
| `filter`              | `'all'` \| `'action'` \| `(point) => boolean`               | `'action'` (actions only)|
| `scalar`              | `string` \| `ScalarOptions & { route }`                     | not served               |
| `swagger`             | `string` \| `SwaggerOptions & { route }`                    | not served               |
| `before`              | `MiddlewareFn` \| `MiddlewareFn[]`                          | none                     |
| `cache`               | `string` \| `boolean`                                       | on, keyed by `route`     |
| `openapi`             | `` `3.0${string}` `` \| `` `3.1${string}` ``                | `'3.0.0'`                |
| `info`, `servers`, `tags`, `security`, `components`, … | any `OpenAPI Document` field   | —                        |
| `models`              | `Record<string, InputSchema>`                               | gathered from points     |
| `helpers`             | `SchemaHelper[]`                                            | gathered from points     |
| `hideTransformHeader` | `boolean`                                                   | `false`                  |

### Point methods

| Method        | On                          | Sets                                            |
| ------------- | --------------------------- | ----------------------------------------------- |
| `.openapi()`  | query, mutation, action (endpoint points) | operation metadata — `summary`, `description`, `operationId`, `tags`, `deprecated`, … (not `parameters`/`requestBody`/`responses`) |
| `.response()` | query, mutation, action     | response schema(s) → `responses` in the spec    |

Request schemas come from the [validation](validation) methods (`.params`,
`.search`, `.headers`, `.cookies`, `.body`, `.input`); named models come from
`.models()` on the root.

### What is and isn't mapped today

- **Mapped:** path/method, request parameters and body (from validation schemas),
  `requestBody.required`, multipart detection for file bodies, responses (from
  `.response()`), `$ref` dedup against `.models()`, the `X-Point0-Transform` and
  `X-Point0-Output-Type` headers, and every operation field you pass to
  `.openapi()` (`summary`, `description`, `operationId`, `tags`, `deprecated`, …).
- **Auto-derived:** `summary` (point id, non-actions only), `operationId` (camelCase
  of name+type for non-actions; the action name for explicitly-named actions).
- **Not derived:** `tags` and `description` are never generated from the point —
  supply them via `.openapi()`. Response types are not inferred from the loader's
  return type — declare them via `.response()`.

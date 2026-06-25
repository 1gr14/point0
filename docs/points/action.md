---
index: 900
title: Action
description:
  A server endpoint where you control the HTTP method and path — and may return
  a raw Response.
---

An action is a point that becomes a real HTTP endpoint with a method and path
you choose. Queries and mutations also serve over HTTP, but at
framework-assigned URLs that always speak point0's own JSON; an action gives you
the route, the verb, and — unlike a query — the freedom to return a native
`Response`. Reach for it when you need a webhook, a REST-ish endpoint, or raw
bytes.

```ts
import { root } from '@/lib/root'

export const apiHealthAction = root.lets
  .action('GET', '/api/health')
  .action(
    () =>
      new Response('OK', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
  )

// GET /api/health  →  200  "OK"
```

`apiHealthAction.route` is the route you declared, callable like any other:
`fetch(apiHealthAction.route.abs())`. The rest of this page shows when to use an
action and how each piece works.

## When to use an action

A [query](query) and a [mutation](mutation) cover most server calls and give you
a TanStack cache for free, on a stable framework URL
(`POST /_point0/.../query/...`, `POST /_point0/.../mutation/...`). Use an
**action** when you need something they can't give:

- **A specific method and path** — `GET /api/health`, `PUT /api/ideas/:id`. A
  query and a mutation always live at a framework-assigned `POST` URL; only an
  action lets you pick the verb and the route.
- **A raw `Response`** — plain text, bytes, a custom `Content-Type`, a redirect
  of your own. A [mutation](mutation) loader can also return a `Response`, so
  this alone isn't the reason to reach for an action — but combined with the
  custom method and path, the action is the point built for raw HTTP. (A query
  loader is type-blocked from returning a `Response`.)
- **A webhook** — a third party posts to a URL you publish and often needs the
  unparsed request body (e.g. signature verification).
- **A REST-ish endpoint** other tools call by URL.

If you don't need any of these, prefer a query or mutation — you get caching and
a flat input for free.

## Declaring an action

An action needs a **method** and a **route**, and is closed with `.action(...)`.
Two notations, both equivalent:

```ts
// short: name inferred from the variable
export const apiHealthAction = root.lets
  .action('GET', '/api/health')
  .action(/* ... */)

// shortest: the verb leads, '.action' is implied
export const apiHealthAction = root.lets('GET', '/api/health').action(/* ... */)
```

Both expand to the explicit
`root.lets('action', 'apiHealth', 'GET', '/api/health')`, where the name comes
from the variable — see [points](points) for the notation. The method is
uppercased for you, so `'get'` and `'GET'` are the same.

Both the method and the route are required — leave either off an action and you
get `Method is required for action point` /
`Route is required for action point`. The seven popular verbs
(`GET POST PUT DELETE PATCH OPTIONS HEAD`) work in the short form; an exotic
method needs the explicit long form:

```ts
root.lets('action', 'report', 'REPORT', '/api/report').action(/* ... */)
```

`OPTIONS` and `HEAD` are among the seven popular verbs, so they take the short
form too. point0 itself only auto-handles an `OPTIONS` request when no action
matches its route — an unmatched `OPTIONS` gets a blank `204`. If you need real
CORS preflight handling, declare it (an `OPTIONS` action, or the [CORS](cors)
helper) — the framework doesn't add CORS headers for you.

When the name is inferred, the action is named after its method and route:

```ts
const a = root.lets('POST', '/api/my-test/:id').action(/* ... */)
a.point.name // => "POST /api/my-test/:id"
a.method // => "POST"
a.route.definition // => "/api/my-test/:id"
```

A route token can't be a wildcard — `root.lets('GET', '/files/*')` throws
(`Wildcard is not allowed in action point. Use middleware instead`).

### The route prefix is inherited

Like a page, an action extends a [base](base)'s `basePath`:

```ts
const base = root.lets('base', 'api').basePath('/my/prefix').base()
const a = base.lets('POST', '/api/my-test/:id').action(/* ... */)
a.route.definition // => "/my/prefix/api/my-test/:id"
```

An action's route always resolves against the **server URL** (`serverUrl`), not
the client URL — actions are API endpoints that live on the server.

## Input: params, search, body — not `input`

A query uses one flat `.input`. An action **splits** its input by where it comes
from in the HTTP request:

```ts
const action = root.lets
  .action('POST', '/api/my-test/:id')
  .params(z.object({ id: z.string().min(1) })) // from the path
  .headers(z.object({ x: z.string().min(1) })) // from request headers
  .search(z.object({ y: z.string().min(1) })) // from the query string
  .body(z.object({ b: z.number().min(1) })) // from the request body
  .action(({ params, search, headers, body }) => {
    return { params, search, headers, body }
  })
```

Each schema is any [Standard Schema](validation) (zod, valibot, arktype, …). The
route's param keys are auto-merged into the `params` schema. Writing `.input`
(or `.clientInput` / `.sharedInput`) on an action is a type error:
`For "action" not allowed "input" schema. Only "params", "search" and "body" are allowed.`

Cut from the client bundle — their bodies and the imports they use are removed,
so they never ship to the browser. On an action `.params`, `.search`, `.body`,
`.headers`, and `.cookies` parse the incoming HTTP request (it runs on the
server). (On a non-action mountable, `.params`/`.search` are isomorphic instead
— but an action has no client render, so here they're server-only.)

`.cookies(schema)` is also accepted, alongside `.headers`. It validates
`request.cookies` — the `Cookie` header parsed into a flat `{ [name]: value }`
map of decoded strings — and the parsed result lands on the loader's `cookies`
field.

## The body, and webhooks

If you declare a `.body` schema, point0 reads and parses the request body for
you — JSON by default, or multipart form data when the `Content-Type` is
`multipart/form-data` — and keeps the original on `request.rawBody`:

```ts
// POST /api/raw-body/store  with  {"b":777}
.body(z.object({ b: z.number() }))
.loader(({ request, body }) => {
  body // => { b: 777 }       (parsed)
  request.rawBody // => '{"b":777}'  (original text)
  request.original.bodyUsed // => true  (framework consumed it)
})
```

With **no** `.body` schema, point0 doesn't touch the body — `request.original`
stays unread, so you can read the raw stream yourself. This is the webhook
shape: skip `.body`, read the raw text, verify the signature:

```ts
export const stripeWebhookAction = root.lets
  .action('POST', '/api/webhooks/stripe')
  .loader(async ({ request }) => {
    const event = await stripe.webhooks.constructEvent(
      await request.original.text(), // raw, unparsed body
      request.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    )
    await handleStripeEvent(event)
    return { received: true }
  })
  .action()
```

## The loader and the return value

An action's loader receives the parsed request and returns the output. The
callback object is
`{ request, params, search, body, headers, cookies, set, ctx, data, points }`
(each schema-derived field present only when its schema is set).

Cut from the client bundle — its body and the imports it uses are removed, so it
never ships to the browser. The `.loader` (and the `.action` server fn below) is
the endpoint body, so DB calls and secrets stay on the server (it runs there).

You can pass the loader **inline** to `.action(fn)` instead of a separate
`.loader`:

```ts
root
  .lets('POST', '/api/echo')
  .body(z.object({ msg: z.string() }))
  .action(({ body }) => body)
```

…or declare `.loader(fn)` and close with a bare `.action()`:

```ts
root
  .lets('POST', '/api/echo')
  .body(/* ... */)
  .loader(({ body }) => body)
  .action()
```

A bare `.action()` with no prior loader is an error — an action needs a
`.loader` (inline or separate) to have anything to run.

**What the loader may return** — this is the action's defining freedom:

```ts
.action(({ body }) => {
  // plain data → serialized as JSON
  return { received: true }

  // a native Response → returned as-is (text, bytes, custom Content-Type)
  return new Response('OK', { status: 200, headers: { 'content-type': 'text/plain' } })

  // [status, data] → sets the HTTP status
  return [201, { id }]
})
```

Returning a plain object serializes it to JSON (with your
[`.transformer`](transformer), so `Date` / `bigint` round-trip when point0's own
client fetches it). Returning a `Response` ships it untouched — when there's a
response there's no `data`, by design. A returned `Error` is thrown; a returned
`RedirectTask` redirects.

Whether the transformer runs is decided by one request header,
`X-Point0-Transform`, not by who's calling — so any caller, point0 or not, can
opt in or out:

- **`X-Point0-Transform: true`** — point0 serializes the response with your
  [`.transformer`](transformer), and a client that deserializes with the same
  transformer gets `Date` / `bigint` back as real values. point0's own client
  sets this header automatically when it fetches the endpoint.
- **Header absent** (a plain `fetch`, curl, a third-party service) — no
  transformer round-trip; the body is plain JSON, so a `Date` arrives as an ISO
  string `"2026-03-11T12:00:00.000Z"`. You can still send the header yourself
  from a plain `fetch` if you want the transformed shape, as long as your side
  knows how to deserialize it.

The header is also surfaced in the generated [OpenAPI](openapi) spec (for any
endpoint whose point has a transformer), so callers reading the spec can see the
opt-in.

### Setting status, headers, cookies

The loader's `set` helper writes response status, headers, and cookies — it
applies to a plain return and to a manually returned `Response` alike:

```ts
.action(({ set, body }) => {
  set.status(201)
  set.cookies('session', token, { httpOnly: true })
  return { id }
})
```

`set` is the same response-effects helper documented for [mutations](mutation)
and on the [Response](response) page; the full shape lives there.

## Consuming an action as a query, mutation, or infinite query

An action is special: besides closing with `.action()`, it can be **finalized**
as a query, a mutation, or an infinite query. You keep the custom route and the
split `{ params, search, body }` input, and gain the matching TanStack surface.

```ts
// finalize as a query — gives useQuery / fetchQuery
const action = root.lets('GET', '/api/my-test/:id').loader(/* ... */).query()
// inject it like any query
page.lets
  .page('/:id')
  .with(action, ({ params }) => ({ params }))
  .page(/* ... */)
```

```ts
// finalize as a mutation — gives useMutation
const action = root
  .lets('POST', '/api/my-test')
  .body(z.object({ y: z.number() }))
  .loader(/* ... */)
  .mutation()

const mutation = action.useMutation()
mutation.mutate({ body: { y: 123 } }) // input is the structured { params?, search?, body? }
```

Each of these needs a prior `.loader`
(`Point has no server loader. Please add .loader() before calling .query() to finalize action`).
And finalizing as a `.query()` rejects a loader that returns a `Response`:
`Query can not return response. Last loader should provide plain object data, not response.`
So a `Response`-returning action can only close with `.action()`.

For the infinite case, wire the cursor with `pageParamFromInput` (e.g.
`'body.cursor'`) exactly as on a [page's self query](infinite-query).

## OpenAPI

An action shows up in the generated [OpenAPI](openapi) spec under its method and
route, with `params`/`search`/`headers` mapped to path/query/header parameters.
The output type is **not** inferred from the loader — declare it with
`.response`:

```ts
export const ideaUpdateAction = root.lets
  .action('PUT', '/api/ideas/:id')
  .body(z.object({ title: z.string().min(1), content: z.string().min(1) }))
  .response(z.object({ idea: ideaSchema })) // documents the 200 response body
  .openapi({ summary: 'Update idea', tags: ['ideas'] }) // operation metadata
  .action(async ({ params: { id }, body }) => {
    const idea = await prisma.idea.update({ where: { id }, data: body })
    return { idea }
  })
```

`.response` takes one schema (wrapped as a `200` `application/json` response) or
a `{ [status]: schema }` map. `.openapi` sets operation metadata (`summary`,
`description`, `operationId`, `tags`, `deprecated`). Without `.response`, the
spec lists only `200: Successful response`. Full details on [OpenAPI](openapi).

Cut from the client bundle — their bodies and the imports they use are removed,
so they never ship to the browser. `.response`, `.openapi`, and `.description`
only feed the server-generated spec (it runs on the server).

## Gating an action

An action is a public HTTP endpoint — anyone who knows the URL can hit it. Its
loader body, and the imports it uses, are cut from the client bundle at compile
time, so DB calls and secrets never ship; but the _route_ is open, so
authorization has to happen on the server, in the request path.

Gate it from [`.ctx`](ctx) (or a server-side [`.middleware`](middleware) /
[plugin](plugin)): return (or throw) an error there. `.ctx` runs in the endpoint
executor and always fires when the action is fetched, so it's the right place
for the check.

Cut from the client bundle — their bodies and the imports they use are removed,
so they never ship to the browser. `.ctx`, `.middleware`, and the server work of
a [`.use`](plugin) plugin are gone from the client build; the check can't be
bypassed from the browser because it isn't there (it runs on the server).
(`.use` itself stays on both bundles, but its server hooks are cut from the
client.)

```ts
import { authPlugin } from '@/lib/auth' // puts the user into props.me
import { AppError } from '@/lib/error' // your own error class (or ErrorPoint0)

export const adminExportAction = root.lets
  .action('GET', '/api/export')
  .use(authPlugin)
  .ctx(({ props: { me } }) => {
    if (!me?.isAdmin) return new AppError('Forbidden', { code: 'FORBIDDEN' })
    return { me }
  })
  .action(/* ... */)
```

## Edge cases

- **Conflicting routes throw at startup.** Two actions whose routes collide for
  the same method (`POST /api/my-test/:id` vs `POST /api/my-test/:sn` — param
  names don't matter) fail when the engine builds:
  `Conflicted endpoint routes for method "POST"`.
- **A missing action returns 404.** Fetching a route whose point isn't
  registered (deleted on the server, stale client) returns a `404`. The body's
  shape follows the environment: development gets the **private** projection
  (`{ name, message, code, status, stack, … }`), production the **public** one
  (`{ name, message, code }`, dropping `status`, `stack`, and `meta`). So in
  production the body is
  `{ name: 'ErrorPoint0', message: 'Not Found', code: 'POINT0_NOT_FOUND' }`.

- **A preset `rawBody` wins.** If a middleware sets `request.rawBody` before
  body parsing, point0 uses it and leaves `request.original.bodyUsed` `false` —
  even if the actual HTTP body is non-JSON.

## Reference

### Methods on an action

These are the [stage-methods](stage-methods) you can call while building an
action.

Input: [`.params`](validation), [`.search`](validation), [`.body`](validation),
`.headers`, `.cookies` (**not** `.input` / `.clientInput` / `.sharedInput`). All
**server-only** on an action — cut from the client bundle: their bodies and the
imports they use are removed, so they never ship to the browser (they parse the
request on the server).

Data: [`.loader`](loader), [`.ctx`](ctx). Both **server-only** — cut from the
client bundle: their bodies and the imports they use are removed at compile time
and never reach the browser (they run on the server). An action has no
client-side render pass, so there's nothing to cut on the server side — the
loader is the endpoint. An action has **no `.clientLoader`** — it's a server
endpoint with no client render, so the chain never offers one.

OpenAPI: `.response`, `.openapi` (see [OpenAPI](openapi)). Both **server-only**
— cut from the client bundle: their bodies and the imports they use are removed,
so they never ship to the browser (they only feed the server-generated spec).

Shared: [`.use`](plugin), [`.middleware`](middleware), `.on` / `.serverOn` /
`.clientOn` (events), [`.transformer`](transformer), `.fetchOptions`, `.tag`,
`.description`. Strip categories differ per method: `.middleware`, `.serverOn`,
and `.description` are **server-only** — cut from the client bundle (body and
imports removed, never shipped to the browser); `.clientOn` is **client-only** —
cut from the server bundle (body and its imports removed), though an action has
no client render so it's inert here; `.use` itself, `.on`, `.transformer`,
`.fetchOptions`, and `.tag` are **server-and-client** — not cut from either
bundle, kept in both (isomorphic), even where their server-side hooks run
server-only.

Closers: `.action(loaderFn?)`, or finalize as [`.query`](query) /
[`.mutation`](mutation) / [`.infiniteQuery`](infinite-query). The `.action`
server fn is **server-only** — cut from the client bundle: its body and the
imports it uses are removed, so it never ships to the browser; the closer calls
themselves are **server-and-client** — not cut from either bundle, kept in both,
the chained call stays so types resolve while only the server fn's body is cut.

### The action ready point

A finalized action exposes `id`, `point` (`.name`, `.method`), `route`,
`method`, `type`, `tags`, [`Infer`](infer), plus fetch helpers `fetch`,
`fetchServer`, `fetchServerDetailed`, `getFetchServerOptions`. The rest of the
surface depends on how you closed it:

| Closed with                 | You get                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `.action()` / `.mutation()` | `useMutation`, `fetchMutation`, `getMutationKey`, … (full [mutation](mutation) surface) |
| `.query()`                  | `useQuery`, `fetchQuery`, `getQueryKey`, … (full [query](query) surface)                |
| `.infiniteQuery(...)`       | the `*InfiniteQuery*` surface ([infinite-query](infinite-query))                        |

`action.route` is a callable [route0](navigation) route, so you can build the
URL to fetch it directly. `.abs()` gives the absolute URL — an action's route
resolves against the server URL, which point0 fills in as the route's origin:

```ts
action.route({ id: 123 }) // => "/api/my-test/123"           (path only)
action.route.abs({ id: 123 }) // => "https://example.com/api/my-test/123"  (absolute)
fetch(action.route.abs()) // for a no-params route
```

### Input shape for the fetch helpers

Every fetch helper takes the structured input as its first argument —
`{ params?, search?, body? }` — matching the declared schemas:

```ts
await action.fetchMutation({ params: { id }, body: { title, content } })
```

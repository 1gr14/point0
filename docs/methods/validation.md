---
index: 100
title: Validation
description:
  Eight schema methods that parse and type a point's input — input, params,
  search, body, headers, cookies, and the two client variants.
---

A point's input is validated before its loader runs. You attach a schema with
one of eight methods — `.input`, `.params`, `.search`, `.body`, `.clientInput`,
`.sharedInput`, `.headers`, `.cookies` — and from then on that data is parsed
and typed everywhere it flows: the loader, the component, the cache key, the
OpenAPI spec. Any [Standard Schema](https://standardschema.dev) library works
(zod, valibot, arktype, typebox, yup, superstruct), or a plain validate
function.

```tsx
import { root } from '@/lib/root'
import { z } from 'zod'

export const ideaQuery = root.lets
  .query()
  .input(z.object({ id: z.number() })) // input is { id: number } from here on
  .loader(async ({ input }) => {
    // input is already parsed and typed — never `unknown`
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: input.id },
    })
    return { idea }
  })
  .query()

ideaQuery.useQuery({ id: 123 }) // { id: 123 } is checked against the schema
ideaQuery.useQuery({ id: 'x' }) // type error — id must be a number
```

## Which method for which point

Each method is only available — on the type and at runtime — on the point types
it makes sense for. Pick by what the point is:

```tsx
// query / infiniteQuery / mutation / component / provider → .input
.query().input(z.object({ id: z.number() }))

// page / layout → .params (route segments) and .search (query string)
.page('/ideas/:id').params(z.object({ id: z.coerce.number() }))
.page('/ideas').search(z.object({ page: z.coerce.number().default(0) }))

// action → .params, .search, and .body
.action('POST', '/api/ideas/:id')
  .params(z.object({ id: z.string() }))
  .body(z.object({ title: z.string() }))
```

Reaching for the wrong one is a **type error**, not a silent no-op. The
per-point-type gating is enforced when the point is finalized (at `.query()` /
`.page()`), so the error surfaces on the trailing finalizer rather than on the
schema method itself:

```tsx
root.lets.query().search(/* ... */).query() // type error at .query(): .search is for page/layout/action
root.lets.page('/x').input(/* ... */).page() // type error at .page(): .input is for query/mutation/…
```

`.headers` and `.cookies` are the exception — they apply to **every** point
type, because any server-handled point can read request headers and cookies. The
full matrix is in the [reference](#reference) below.

## Any Standard Schema library

`.input(schema)` and its siblings accept any object that implements the
[Standard Schema](https://standardschema.dev) interface. zod is the default in
our examples, but the validation path only touches the `~standard` contract, so
the library is interchangeable:

```tsx
import * as v from 'valibot'
.input(v.object({ id: v.number() })) // valibot — same as zod here
```

```tsx
import { type } from 'arktype'
.input(type({ id: 'number' })) // arktype
```

Instead of a schema you can pass a **validate function** — it receives the raw
input and returns the parsed value, throwing to reject:

```tsx
.input((raw) => {
  if (typeof raw.id !== 'number') throw new Error('id must be a number')
  return { id: raw.id }
})
```

A thrown error becomes one validation issue and fails the parse — on the client
/ mount path with the code `INPUT_SCHEMA_INVALID`; server-side the error
surfaces as your error class without that specific code. Server-side validation
runs **asynchronously** — a schema whose `~standard` validate returns a Promise
is awaited and accepted. Only the **client / mount** validation path is
synchronous: there, a Promise-returning schema is rejected at runtime with
`INPUT_SCHEMA_PROMISE_NOT_ALLOWED` (its message reads "for client input
schemas").

## Schema helpers — register your library on the root

A schema library is fully usable for validation on its own. But two things — the
routable keys of `.search`, and [OpenAPI](openapi) generation — need Point0 to
_look inside_ the schema (read its keys, detect file fields, emit JSON Schema).
That introspection is library-specific, so you register a **schema helper** once
on the [root](root):

```tsx
import { zodSchemaHelper } from '@point0/core/schema/zod'

export const root = Point0.lets
  .root()
  .schemaHelper(zodSchemaHelper()) // teach Point0 how to read zod schemas
  .root()
```

Six helpers ship, each as a subpath of `@point0/core` — import the one matching
your library:

```tsx
import { zodSchemaHelper } from '@point0/core/schema/zod'
import { valibotSchemaHelper } from '@point0/core/schema/valibot'
import { arktypeSchemaHelper } from '@point0/core/schema/arktype'
import { yupSchemaHelper } from '@point0/core/schema/yup'
import { typeboxSchemaHelper } from '@point0/core/schema/typebox'
import { superstructSchemaHelper } from '@point0/core/schema/superstruct'
```

You can register more than one
(`.schemaHelper(zodSchemaHelper()).schemaHelper(valibotSchemaHelper())`) — they
accumulate, and the first one that recognizes a given schema wins.

`.schemaHelper` is **server-and-client** — not cut from either bundle, because
introspection (search keys, OpenAPI) runs on both sides.

Without a helper, `.search` treats **every** query-string key as a search param
— see [`.search`](#search--the-query-string) below.

## `.input` — queries, mutations, components

`.input` is the schema for a [query](query), [infiniteQuery](infinite-query),
[mutation](mutation), [component](component), or [provider](provider). It forms
the cache key, is validated on the server, and is sent to the loader:

```tsx
export const ideaListQuery = root.lets
  .infiniteQuery()
  .input(
    z.object({ limit: z.number().optional(), cursor: z.number().optional() }),
  )
  .loader(async ({ input: { limit = 20, cursor } }) => {
    /* ... */
  })
  .infiniteQuery(/* ... */)
```

`.input` validates on the **server only**. The component never sees an
unvalidated input, but it also doesn't re-validate input at render. For input
that must be checked on the client too, use the two variants:

```tsx
.clientInput(schema)  // validate at render / on the client — not on the server
.sharedInput(schema)  // validate on BOTH server and client
```

Use `.clientInput` / `.sharedInput` when a client-loader query (or a component)
must validate its input in the browser. Plain `.input` is the right default for
a server query.

`.input` is **server-only** — cut from the client bundle: its schema and the
imports it pulls in never ship to the browser. `.clientInput` is the mirror:
**client-only** — cut from the server bundle. `.sharedInput` is
**server-and-client** — not cut from either bundle, validating in both places.

## `.params` and `.search` — pages and layouts

A [page](page) or [layout](layout) gets its input from the URL: `.params` from
the route segments, `.search` from the query string.

### `.params` — route segments

The route already types its own segments: `.page('/ideas/:sn')` gives you a
typed `params.sn` (a `string`) with no schema at all. You reach for `.params`
**only** when you want to transform or coerce those strings into something else
— turn `"123"` into a number, validate a format, narrow a union:

```tsx
export const ideaViewPage = generalLayout.lets
  .page('/ideas/:sn')
  .params(z.object({ sn: z.coerce.number() })) // "123" → 123
  .page(({ params }) => <h1>Idea #{params.sn}</h1>) // params.sn is a number
```

A validate function passed to `.params` receives `Record<string, string>` —
every value is a string, because that's what the router extracts from the path.

On a page or layout, `.params` is **server-and-client** — not cut from either
bundle, because the route parses the URL on either side. (On an [action](action)
the same method is **server-only** — cut from the client bundle, since an action
has no client side.)

`.params` can only _refine_ the keys already in the route — it can't introduce a
key that isn't a route segment. Adding an unknown key is a type error
(`Previous provided params should not have another keys…`). `.search` and
`.body` have no such restriction.

### `.search` — the query string

`.search` parses the URL query string. It's the one validation method that also
drives routing — its keys are registered as the page's recognized search params:

```tsx
export const ideaListPage = generalLayout.lets
  .page('/ideas')
  .search(
    z.object({
      page: z.coerce.number().default(0),
      limit: z.coerce.number().default(2),
    }),
  )
  .page(({ search, setSearch }) => {
    // search is { page: number, limit: number }
    // setSearch updates the URL query (client-only; a no-op during SSR)
  })
```

To extract those keys, `.search` needs a
[schema helper](#schema-helpers--register-your-library-on-the-root) registered
on the root. **Without one**, Point0 can't read the schema's keys and falls back
to treating _every_ query-string key as a search param — register the helper for
your library.

Like `.params`, `.search` is **server-and-client** on a page or layout — not cut
from either bundle, so the query string parses on either side — and
**server-only** on an [action](action), where it's cut from the client bundle.

`setSearch` and the rest of the search/routing surface live on
[Navigation](navigation).

## `.body`, `.headers`, `.cookies` — actions and request data

An [action](action) is a raw HTTP endpoint, so it splits its request across the
request schemas. This is the only place all of them appear together:

```tsx
export const updateAction = root.lets
  .action('POST', '/api/ideas/:id')
  .params(z.object({ id: z.string().min(1) })) // → path params (always required)
  .search(z.object({ draft: z.coerce.boolean() })) // → query string
  .headers(z.object({ 'x-api-key': z.string().min(1) })) // → request headers
  .body(z.object({ title: z.string().min(1) })) // → request body
  .loader(({ params, search, headers, body }) => {
    /* all four are parsed and typed */
    return { ok: true }
  })
  .action()
```

Each schema maps to an OpenAPI location: `.params` → path, `.search` → query,
`.headers` → header, `.cookies` → cookie, `.body` → request body. For a query or
mutation, `.input` is what OpenAPI emits as the body. See [OpenAPI](openapi).

`.headers` and `.cookies` are available on every point type — a page or layout
can read auth headers or cookies on its server request the same way. They
validate on the server.

`.body`, `.headers`, and `.cookies` are all **server-only** — cut from the
client bundle: each reads from the incoming HTTP request on the server, so its
schema never ships to the browser. (`.params` / `.search` on the action above
are also **server-only**, since an action has no client side; on a page or
layout those two are server-and-client — see above.)

## Schemas merge down the chain

A schema declared up the chain is **merged** with one declared lower — they
union by key. A [base](base) or [plugin](plugin) can declare part of an input,
and the point fills in the rest:

```tsx
export const tenantBase = root.lets
  .base()
  .input(z.object({ tenantId: z.string() })) // every query off this base carries tenantId
  .base()

export const ideaQuery = tenantBase.lets
  .query()
  .input(z.object({ id: z.number() })) // merged input: { tenantId: string, id: number }
  .loader(async ({ input }) => {
    input.tenantId // ✓ from the base
    input.id // ✓ from the query
  })
  .query()
```

`.sharedInput` merges into both the server and client input slots.

## Narrowing is allowed, widening is a type error

When a child redeclares a key the parent already set, it may **narrow** the type
(make it more specific) but never **widen** it. Widening a parent's schema is a
compile error:

```tsx
.base().input(z.object({ id: z.number() }))
  .query().input(z.object({ id: z.literal(1) })) // ✓ narrows number → 1

.base().input(z.object({ id: z.number() }))
  .query().input(z.object({ id: z.string() })) // type error: not assignable to the base schema
```

## Security: validation runs on the server

For a server query, page, or action, input is parsed on the server before the
loader runs — the client can't smuggle an unvalidated shape into your loader.
But validation is not authorization. Gate access with a [`.with`](with) wrapper
that throws your [error class](error-handling) (`ErrorPoint0` by default, or
your own), not by trusting `.ctx` (which runs only when the point has a loader).
A `.params`/`.search`/`.input` schema decides _what shape_ the data has, never
_who_ may send it.

## Reference

### Method → point types → request location

| Method          | Available on                                                             | Validated on    | OpenAPI location |
| --------------- | ------------------------------------------------------------------------ | --------------- | ---------------- |
| `.input`        | query, infiniteQuery, mutation, component, provider (+ root/base/plugin) | server          | request body     |
| `.clientInput`  | same as `.input`                                                         | client / mount  | —                |
| `.sharedInput`  | same as `.input`                                                         | server + client | request body     |
| `.params`       | page, layout, action                                                     | server + client | path (required)  |
| `.search`       | page, layout, action (+ root/base/plugin)                                | server + client | query            |
| `.body`         | action (+ root/base/plugin)                                              | server          | request body     |
| `.headers`      | every point type                                                         | server          | header           |
| `.cookies`      | every point type                                                         | server          | cookie           |
| `.schemaHelper` | root only                                                                | —               | —                |

`.params` is deliberately **not** available on root/base/plugin — params are
route-bound and only mean something on a page, layout, or action.

### Overloads

Each schema method accepts the same three input shapes (where supported):

```tsx
.input(schema)            // a Standard Schema object (zod/valibot/…)
.input((raw) => parsed)   // a custom validate function
.input<{ id: number }>()  // zero-arg: declare the shape at the type level only
```

The zero-arg type-only form exists on `.input`, `.clientInput`, `.sharedInput`,
and `.search`. `.params` and `.body` have only the schema and validate-function
forms (no zero-arg overload).

### How validation runs

Schemas are validated in **declaration order**; the first failure short-circuits
and returns the error — the loader never runs. Each schema reads from its own
bucket (`params` from route params, `search` from the query string, `body` from
the request body, and so on). One quirk: on an **action**, an `.input` schema
would read from `search` — but `.input` isn't available on actions, so in
practice actions use `.params` / `.search` / `.body`.

### `.input` vs component props

On a [component](component) (or provider), `.input` and the outer props declared
with the `.component<{…}>()` / `.provider<{…}>()` generic are two different
things. `.input` is the **validated** schema that forms the cache key and feeds
the loader — passed as `input={{…}}` at the mount site. Outer props are the
plain attributes the element accepts (`<Greet name="…" />`), spread directly and
not schema-validated. See [component](component) for both side by side.

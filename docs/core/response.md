---
index: 400
title: Response
description:
  The set helper for headers, status, and cookies, the [status, data] return,
  and how effects merge into the response.
---

Every loader, [`.ctx`](ctx), and [middleware](middleware) gets a `set` helper —
the one surface for shaping the HTTP response from inside your code. With it you
set headers, the status code, and cookies; the framework collects them and
applies them to the final response. The simplest path doesn't even need `set`: a
loader can return `[statusCode, data]`.

```tsx
export const loginMutation = root.lets
  .mutation()
  .input(z.object({ email: z.string(), password: z.string() }))
  .loader(async ({ input, set }) => {
    const { user, token } = await auth.login(input)
    set.cookies('session', token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24,
    })
    set.headers('X-User-Id', user.id) // a response header
    set.status(201) // the HTTP status
    return { user } // becomes the mutation's data
  })
  .mutation()
```

On the client `set` does nothing useful — the response is already sent. These
writes matter only on the server, under SSR or for an endpoint call.

## set.status — the HTTP status

```tsx
.loader(({ set }) => {
  set.status(201) // any number; no validation, no clamping
  return { ok: true }
})
```

The status you write wins over the response's default `200`. When the status
tracks the data, return a tuple instead.

### Return [statusCode, data]

A loader can return `[status, data]` and skip `set.status` entirely:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .loader(() => [201, { x: 1 }]) // status 201, data { x: 1 }
  .page(({ data }) => <p>{data.x}</p>) // data is { x: number } — the status is stripped
```

The status sets the response code; the second element is the data your component
or caller sees. The tuple's status is **erased from the data type**, so `data`
stays `{ x: number }`, never `[number, …]`. It works the same on a mutation:

```tsx
.loader(() => [201, { x: 1 }]).mutation()
// result.response?.status === 201, result.data?.x === 1
```

If the data slot is `undefined` or `null`, the data normalizes to `{}`:

```tsx
.loader(() => [204, undefined]) // status 204, data {}
```

## set.headers — response headers

Three call forms, one method:

```tsx
set.headers('X-User-Id', user.id) // name + value
set.headers({ 'Content-Type': 'text/plain', 'X-Custom': '1' }) // an object
set.headers(someHeadersInstance) // copy a whole Headers object
```

Two things to know:

```tsx
set.headers('X-User-Id', '42')
set.inspect.headers['x-user-id'] // => '42'  — names are LOWERCASED
set.inspect.headers['X-User-Id'] // => undefined

set.headers('x-foo', undefined) // an undefined value DELETES the header from the response
```

A real use is a CORS middleware writing the allow-origin and vary headers:

```tsx
set.headers('Access-Control-Allow-Origin', allowOriginValue)
set.headers('Vary', '*')
```

## set.cookies — response cookies

Set a cookie by name and value, or as one options object:

```tsx
set.cookies('session', token, {
  httpOnly: true,
  secure: true,
  maxAge: 60 * 60 * 24,
})
set.cookies({ name: 'theme', value: 'dark', sameSite: 'strict' })
```

Two defaults are filled in on every write:

```tsx
set.cookies('session', 'abc123')
set.inspect.cookies.session
// => { name: 'session', value: 'abc123', path: '/', sameSite: 'lax' }
```

`path` defaults to `'/'` and `sameSite` to `'lax'`. To let the browser pick the
path, pass `path: ''`. Everything else (`domain`, `secure`, `httpOnly`,
`partitioned`, `maxAge`, `expires`) passes through as given. When serialized
into the `Set-Cookie` header, `maxAge` is floored to an integer, attribute
values are truncated at the first `;` (no injection), and an invalid `sameSite`
falls back to `'lax'`.

**Delete a cookie by passing `undefined` as the value** — both call forms work,
and the framework expires it for you (`Max-Age=0`, `Expires` in the past):

```tsx
set.cookies('session', undefined) // delete the cookie
set.cookies({ name: 'token', value: undefined }) // same, object form
```

`set.cookies(...)` is the low-level write. For a typed cookie with transformers,
fallbacks, and a read/write API, use the [CookieStore](cookie-store) — it
funnels its server writes through this same `set.cookies` under the hood.

> Read **request** cookies — the ones the browser sent — from
> `request.cookies['name']`, not from `set`. `set` is for the response only. See
> [Request](request).

## set.inspect — read what's accumulated

`set.inspect` returns a fresh snapshot of the headers, cookies, and status set
so far:

```tsx
set.inspect // => { headers: {...}, cookies: {...}, status: 201 | undefined }
```

Each access is a new object with copied contents — reading it never mutates
state, and header keys are lowercased here too. Because every middleware,
`.ctx`, and loader on one request share the same effects, a later step reads
what an earlier one wrote:

```tsx
// a middleware sets a header...
.middleware(async ({ set, next }) => {
  set.headers('y', '3')
  return await next()
})
// ...and a page loader downstream reads it back
.loader(({ set }) => ({ x: 1, y: set.inspect.headers.y, z: set.inspect.headers.z }))
// renders x=1, y='3', z=undefined  (z was never set)
```

## How effects accumulate

One effects collector lives per request. Every middleware, `.ctx`, and loader in
the chain writes into it, so effects **accumulate** across the whole point
execution — last write wins per key (headers by lowercased name, cookies by
name, status is a single slot). At the end, the framework applies the collected
effects to the response. Because that apply runs after the whole chain has
finished, a middleware that writes an effect _after_ `await next()` returns
still lands in the final response — and, being the last write for its key, it
wins.

The framework writes effects too: a request-id header, input-validation `422`, a
`404` for an unknown point, a `500` for a point with no server loader, and (in
dev only) an `X-Point0-Discovery-Renders` header — all land in the same
collector.

## Returning a Response (actions and mutations only)

For full control, return a native `Response` from a loader. This is allowed
**only on a [mutation](mutation) or an [action](action)** — every other point
type (page, layout, component, query, …) rejects a `Response` return at compile
time:

```tsx
export const apiHealthAction = root.lets
  .action('GET', '/api/health')
  .action(async () => {
    return new Response('OK', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  })
```

```tsx
// on a page, this is a type error:
root.lets.page('/x').loader(() => new Response('zxc'))
// Output can not be type of "Response" for point of type "page"
```

When a loader returns a `Response`, that response carries the result and the
point has no `data`. Your `set` effects **still apply** to it — headers,
cookies, and status set via `set` merge into the Response you returned. The same
holds for a middleware: returning a `Response` short-circuits the chain, but
effects set by earlier middlewares still land:

```tsx
.middleware(async ({ set, next }) => { set.headers('y', '3'); return await next() })
.middleware(() => new Response('custom response'))
// final response: body 'custom response', status 200, header y === '3'
```

A `.ctx` cannot return a `Response` — only `data`-shaping, a redirect, or an
error. Use a loader for that.

### Who wins when both set something

When effects meet a returned Response, the **Response's own values win**:

- **Headers** — the Response's headers override effects headers of the same
  name.
- **Cookies** — a `Set-Cookie` on the Response keeps its cookie; an effects
  cookie of the same name is dropped, others append.
- **Status** — `effects.status` is used only if the Response didn't set one.

## Error status under SSR

During server-side rendering, an error's HTTP status flows through the same
effects collector, so the page responds with the right code.

**A loader (or `.ctx`) throws or returns an error with a status:**

```tsx
.loader(() => { throw new AppError('gone', { status: 410 }) })
// SSR response.status === 410   (returning the error works the same)
```

`AppError` here is either the built-in `ErrorPoint0` or your own error class —
any class of the same-or-wider structure, wired in with `.errorClass(...)`. A
`status` on the error becomes the response status. ([Error0](error-handling) is
one optional way to build such a class.)

**An error rendered by the error component** sets the status during the render
pass. Call `setStatus` from anywhere in a component — it's exported from
`@point0/core`:

```tsx
import { setStatus, useSetStatus } from '@point0/core'

setStatus(404) // safe to call anywhere — sets the status under SSR, no-op on the client
```

`setStatus` takes effect only under SSR; on the client the status is already
sent and the call is a safe no-op. So you can call it straight from a
component's render without guarding the side:

```tsx
function NotFound() {
  useSetStatus(404) // identical to setStatus(404), just the hook-shaped name
  return <p>Not found</p>
}
```

`useSetStatus` is the **same function** under a `use*` name — not a real hook,
no extra behavior. Calling `setStatus` at the top of a component looks like a
side effect during render, which trips React's rules-of-hooks lint; the `use*`
alias quiets that lint.

The framework also writes SSR status directly in a few spots: `404` when no page
matches the URL, `422` on input-validation failure, and a redirect honors only
`301 / 302 / 303 / 307 / 308` (anything else falls back to `302`).

> In production SSR the error **stack** is never rendered (only message/status).
> Error serialization is on [Error handling](error-handling).

## The Effects object

`set` is the write surface, but it's only _part_ of the per-request effects
collector. That collector is an `Effects` instance, and you can reach it
directly when you build a helper that has no `set` in scope (a plain server
function):

```tsx
import { getEffects, getEffectsOrUndefined } from '@point0/core'

const effects = getEffects() // the same collector every loader/ctx/middleware shares
```

`getEffects` throws when there's no request in scope; `getEffectsOrUndefined`
returns `undefined` — that's how `setStatus` stays a safe no-op off-request:

```tsx
getEffects().set.status(204) // throws if called outside a request
getEffectsOrUndefined()?.set.headers('x-trace', id) // undefined outside a request
```

An `Effects` instance exposes more than just `set`:

| Member             | What it is                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `effects.set`      | the write helper — `set.headers`, `set.cookies`, `set.status`, `set.inspect`, `set.apply` (the very `set` your loaders receive) |
| `effects.headers`  | the raw accumulated headers object (lowercased keys), live state                                                                |
| `effects.cookies`  | the raw accumulated cookies object (keyed by cookie name), live state                                                           |
| `effects.status`   | the accumulated status, or `undefined` if none was set                                                                          |
| `effects.values`   | a fresh, deep-copied `{ headers, cookies, status }` snapshot — same shape as `set.inspect`                                      |
| `effects.apply(r)` | return a new `Response` with the accumulated effects merged in (the framework calls this at the end of each request)            |

## Reference

### `set` surface

The object passed as `set` to loaders, `.ctx`, and middlewares:

| Member        | Signature                                  | What it does                                                           |
| ------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `set.status`  | `(status: number) => void`                 | set the response status                                                |
| `set.headers` | `(name, value)` / `(object)` / `(Headers)` | set/delete response headers                                            |
| `set.cookies` | `(name, value, opts?)` / `(opts)`          | set/delete response cookies                                            |
| `set.inspect` | `{ headers, cookies, status }` (getter)    | a fresh snapshot of accumulated effects                                |
| `set.apply`   | `(response: Response) => Response`         | apply effects to a Response (mostly internal — the framework calls it) |

`set` is a forbidden key for `.ctx(..., { expose: [...] })` — you can't
re-export it from ctx.

### Cookie options

`set.cookies` accepts these (only `name` and `value` are required;
`value: undefined` deletes):

| Option        | Type                          | Default | Notes                                     |
| ------------- | ----------------------------- | ------- | ----------------------------------------- |
| `name`        | `string`                      | —       | required                                  |
| `value`       | `string`                      | —       | `undefined` deletes the cookie            |
| `path`        | `string`                      | `'/'`   | pass `''` to let the browser choose       |
| `sameSite`    | `'strict' \| 'lax' \| 'none'` | `'lax'` | invalid value falls back to `'lax'`       |
| `domain`      | `string`                      | —       |                                           |
| `expires`     | `number \| Date \| string`    | —       | a bare `number` is epoch milliseconds     |
| `maxAge`      | `number`                      | —       | floored to an integer in the `Set-Cookie` |
| `secure`      | `boolean`                     | —       |                                           |
| `httpOnly`    | `boolean`                     | —       | keep session tokens out of client JS      |
| `partitioned` | `boolean`                     | —       |                                           |

A bare `number` for `expires` is **epoch milliseconds** — the same rule on the
server (`set.cookies`) and in the browser (`CookieStore`). Use `maxAge`
(seconds) for a relative lifetime.

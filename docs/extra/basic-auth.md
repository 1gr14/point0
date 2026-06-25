---
index: 300
title: Basic Auth
description: An HTTP Basic auth gate — a middleware that guards points or your OpenAPI docs with a user table or a custom validator.
---

`@point0/basic-auth` is an HTTP Basic auth gate. `basicAuth(options)` returns a
Point0 [middleware](middleware) function (the value of `BasicAuth`'s `.middleware`
getter): give it a user table, mount it on a point, and every request without
valid `username:password` credentials gets a `401`. It runs server-side only and
adds per-user / per-IP brute-force throttling for free.

The most direct use is to close your whole site off from prying eyes — a staging
deploy, a private preview, an internal tool. Mount it on `root` and the browser
pops its native login dialog before anyone reaches a single page:

```tsx
import { basicAuth } from '@point0/basic-auth'

export const root = Point0.lets
  .root()
  // ...
  // every request under root needs admin:secret first
  .middleware(basicAuth({ users: { admin: 'secret' } }))
  .root()
```

That's it — no page knows or cares it's there. The rest of this page covers
scoping the gate to one subtree, guarding only your OpenAPI docs, the config, and
the responses it returns.

<!-- TODO(low): confirm the package is published publicly before documenting an install command — package.json carries publishConfig.access: "restricted", which may be a pre-launch artifact. -->

## Mounting it

`basicAuth(...)` is a plain Point0 middleware, so it goes wherever
[`.middleware`](middleware) goes. Three useful placements:

**Guard everything on a point.** Pass it straight to `.middleware()` and it gates
every request reaching that point's scope — this is the whole-site gate from
above:

```tsx
// guards every request under root
.middleware(basicAuth({ users: { admin: 'secret' } }))
```

This is what the package's own test does: a `root` with `basicAuth` and an
`/api/test` action returns `401` without credentials and `200` with them
(`packages/basic-auth/tests/index.test.tsx`).

**Guard one path.** `.middleware` also takes a route, so you can scope the gate to
a subtree — e.g. an `/admin/*` area while the rest of the site stays open:

```tsx
.middleware('/admin/*', basicAuth({ users: { admin: 'secret' } }))
```

**Guard the OpenAPI docs.** Pass it as the `before` option of
[`openapi(...)`](openapi), which runs it *only* on the doc routes. This is how
every shipped example uses it — the app stays open, the schema and viewers don't:

```tsx
import { openapi } from '@point0/openapi'

// examples/basic/src/lib/root.tsx
.middleware(
  openapi({
    route: '/openapi.json',
    scalar: '/scalar',
    swagger: '/swagger',
    filter: 'all',
    before: basicAuth({ users: { admin: 'admin' } }), // ← the gate
  }),
)
```

Now `/openapi.json`, `/scalar`, and `/swagger` prompt for a login; anything else
stays open.

`basicAuth` is a **no-op on the client** — middleware runs server-side only, and
the compiler strips server middleware bodies out of the client bundle. (Unlike
some sibling built-ins, basic-auth has no explicit client branch of its own; it
relies on the compiler.)

## The user table: `users`

`users` is the built-in credential check. It accepts three shapes, all normalized
to a `{ username: password }` record:

```tsx
basicAuth({ users: { admin: 'secret', john: 'pass123' } }) // record
basicAuth({ users: 'admin:secret' }) //                       single "user:pass" string
basicAuth({ users: ['admin:secret', 'john:pass123'] }) //     list of "user:pass" strings
```

The string form is the one to reach for in production — keep the credentials in an
env var, not in source. This is what `create-point0-app` scaffolds and what
start0 ships:

```tsx
// packages/create-app/template/src/lib/root.tsx
before: basicAuth({ users: serverEnv.OPENAPI_CREDENTIALS }) // e.g. "admin:admin"
```

A `"user:pass"` string splits on the **first** `:`, so the password may itself
contain colons. An empty username or empty password (`':pass'`, `'user:'`, or a
string with no `:`) **throws at config time** — when `basicAuth(...)` is called,
not per request:

```tsx
basicAuth({ users: 'admin:' }) // throws: Invalid user string format. Expected "username:password".
```

Passwords are compared as **plaintext** with strict `===`, guarded by
`hasOwnProperty` (so prototype keys like `toString` can't be used as a login).
There's no hashing — for hashed passwords or a database lookup, use `validator`
below.

## A custom check: `validator`

Pass a `validator` function instead of `users` to replace the built-in table
entirely. It receives the parsed credentials plus the full [request](request),
returns a boolean, and may be async:

```tsx
basicAuth({
  validator: async ({ username, password, request }) => {
    const user = await db.user.findUnique({ where: { username } })
    return !!user && (await verifyHash(password, user.passwordHash))
  },
})
```

`users` and `validator` are **mutually exclusive** — pass exactly one. The type is
a discriminated union, so passing both (or neither) is a compile error.

## Hooks: logging failures

Three optional callbacks fire on each failure path. They're side-effect hooks —
run for logging or metrics, **before** the failure response is built; they may be
async (and are awaited), but they can't change the response:

```tsx
basicAuth({
  users: { admin: 'secret' },
  onUnauthorized: ({ ip }) => console.warn('no credentials', { ip }),
  onWrongCredentials: ({ username, ip }) => console.warn('bad credentials', { username, ip }),
  onLimitExceeded: ({ username, ip }) => console.error('throttled', { username, ip }),
})
```

`onLimitExceeded` also receives `limitPerUser`, `limitPerIp`, and `staleTimeMs`.
All three receive `{ request, username, ip }` (`username`/`ip` may be
`undefined`).

## The responses

The gate produces three outcomes, each a real HTTP response:

| Case                | Status | Body                                                | `WWW-Authenticate`        |
| ------------------- | ------ | --------------------------------------------------- | ------------------------- |
| no / malformed header | `401` | `Unauthorized`                                      | sent (unless `challenge: false`) |
| wrong credentials   | `401`  | `Unauthorized`                                      | sent (unless `challenge: false`) |
| too many failures   | `429`  | `Too many failed HTTP auth attempts. Limit exceeded.` | never sent              |

The `WWW-Authenticate` header is the constant
`Basic realm="Restricted", charset="UTF-8"` — it's what makes a browser pop its
native login dialog. The **realm is fixed** to `"Restricted"` and the charset to
`UTF-8`; there is no option to change either.

<!-- TODO(low): the topic brief mentions a `realm` config — there is no `realm` option. The realm is hardcoded. Decide whether to expose it or keep it fixed. -->

The `Basic` scheme is matched **case-insensitively**, so `Basic`, `basic`, and
`BASIC` all parse.

### `challenge: false` — suppress the browser dialog

By default (`challenge: true`) a `401` carries the `WWW-Authenticate` header, which
triggers the browser's native login popup. Set `challenge: false` to drop that
header — useful for an API where you handle the `401` in your own client and don't
want a browser prompt:

```tsx
basicAuth({ users: { admin: 'secret' }, challenge: false }) // 401s carry no WWW-Authenticate
```

The `429` never carries the challenge header, even with `challenge: true`.

## Brute-force throttling

Every failed *credential* attempt (a valid Basic header with a wrong
username/password) is recorded in memory as `{ dateMs, username, ip }`. Requests
with no or malformed header are *not* counted toward the throttle. Once a client
crosses a limit, further attempts return `429` instead of `401`:

```tsx
basicAuth({
  users: { admin: 'secret' },
  limitPerUser: 100, //              max failures per username (default 100)
  limitPerIp: 100, //                max failures per IP       (default 100)
  staleTimeMs: 1000 * 60 * 60 * 24, // failures older than this are forgotten (default 24h)
  memorySize: 1000, //               hard cap on remembered attempts (default 1000)
})
```

The limit trips when **either** the per-user **or** the per-IP count is reached
(they're OR-combined). A successful login clears every recorded failure matching
that IP *or* that username — so a login from one user can also wipe another
user's recorded failures that share the same IP. The IP comes from
[`request.from.ip`](request) (Bun's trusted source
first, then `x-forwarded-for` / `x-real-ip` / `cf-connecting-ip`); requests with
no resolvable IP all share one `'unknown'` bucket.

> **Gotcha — the memory is in-process and volatile.** It resets on restart and is
> per-instance. Across multiple server processes, the limit counts per process,
> not globally. There's no shared / persistent store option.

## Advanced API

`basicAuth(options)` is the high-level factory. The package also exposes a
lower-level surface, used in its tests but not in any example:

- **`BasicAuth.create(options)`** — the class behind the factory (the constructor
  is private). Its `.middleware` getter is exactly what `basicAuth()` returns.
  `validateRequest` and `getFailureResponse` are **methods on a `BasicAuth`
  instance** (reachable via `BasicAuth.create(...)`), not separate top-level
  exports.
- **`instance.validateRequest(request)`** — returns the full
  `BasicAuthValidationResult` (`{ ok, username, ip, response, reason }` on
  failure) instead of acting as middleware.
- **`instance.getFailureResponse(request)`** — returns the failure `Response`, or
  `undefined` when the request is authorized. For gating by hand, outside
  `.middleware()`.
- **`getBasicAuthHeader(username, password)`** — a top-level export that builds a
  `Basic <base64>` header value. Handy for crafting authenticated requests in
  tests.

<!-- TODO(low): `BasicAuth.create` and the `validateRequest` method are exercised by tests, but no example or app uses this lower-level surface, and `getFailureResponse` has no test coverage — documented as available, not as a recommended path. -->

## Reference

### `basicAuth(options)`

Exactly one of `users` / `validator` is required; everything else is optional.

| Option               | Type                                              | Default       | What                                                        |
| -------------------- | ------------------------------------------------- | ------------- | ----------------------------------------------------------- |
| `users`              | `Record<user,pass>` \| `"user:pass"` \| `string[]` | —             | built-in credential table (mutually exclusive with `validator`) |
| `validator`          | `({ username, password, request }) => boolean \| Promise` | —     | custom check, replaces `users`                              |
| `challenge`          | `boolean`                                          | `true`        | send `WWW-Authenticate` on `401` (browser login dialog)     |
| `limitPerUser`       | `number`                                           | `100`         | max failed attempts per username before `429`               |
| `limitPerIp`         | `number`                                           | `100`         | max failed attempts per IP before `429`                     |
| `staleTimeMs`        | `number`                                           | `86_400_000`  | how long a failed attempt is remembered (24h)               |
| `memorySize`         | `number`                                           | `1000`        | hard cap on remembered attempts                             |
| `onUnauthorized`     | `({ request, username, ip }) => void`             | —             | hook: no / bad header                                       |
| `onWrongCredentials` | `({ request, username, ip }) => void`             | —             | hook: wrong credentials                                     |
| `onLimitExceeded`    | `({ request, username, ip, limitPerUser, limitPerIp, staleTimeMs }) => void` | — | hook: throttled                            |

### Behavior at a glance

| Aspect                 | Behavior                                                       |
| ---------------------- | ------------------------------------------------------------- |
| Side                   | server-only — a no-op on the client                           |
| Scheme                 | `Basic` matched case-insensitively                            |
| Password with `:`      | allowed — `"user:pass"` splits on the first `:` only          |
| Empty user / pass      | throws at config time, not per request                        |
| Password comparison    | plaintext `===`, `hasOwnProperty`-guarded — no hashing        |
| Realm / charset        | fixed `Basic realm="Restricted", charset="UTF-8"` — not configurable |
| Throttle limits        | per-user OR per-IP; in-memory, volatile, per-process          |
| Missing IP             | bucketed under `'unknown'`                                     |

<!-- TODO(low): `safe-stable-stringify` is declared as a peer dependency but isn't imported anywhere in `src` — likely stale; don't document it as required for consumers. -->

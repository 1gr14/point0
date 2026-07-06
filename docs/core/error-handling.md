---
index: 500
title: Error handling
description:
  One typed error class from server to UI — serialized safely in production,
  fully in development, never leaking a stack.
---

Every error in Point0 is a typed instance, never `unknown`. By default that's
[`ErrorPoint0`](#the-default-error-class-errorpoint0), and you can throw it
as-is. You _can_ — but don't have to — swap it for **any error class of the same
or a wider structure** via [`.errorClass`](stage-methods): a constructor with
the `(message?, options?)` shape plus the three statics `from` /
`serializePublic` / `serializePrivate`. Whatever class you pick threads through
the whole app: a query's `.error`, the `.on('error')` callback, the error a
[`.with`](with) may return, and the props the error component renders. Across
the wire it's serialized for the audience — public for an untrusted client in
production, full for the developer in development — and the server stack never
reaches the browser, even though the first page load is server-rendered.

This page describes that class — its fields, how it serializes, and how a throw
reaches your error component. One way to _build_ such a class is
[Error0](https://1gr14.dev/error0), covered
[below](#building-apperror-with-error0); you could equally hand-write a
`class extends Error`.

This is the full error class Start0 wires onto its root — typical of a real app,
plugins and all:

```tsx
// src/lib/error.ts — built with Error0 (one option; see below)
import { Error0 } from '@1gr14/error0'
import { causePlugin } from '@1gr14/error0/plugins/cause'
import { codeStatusPlugin } from '@1gr14/error0/plugins/code-status'
import { expectedPlugin } from '@1gr14/error0/plugins/expected'
import { metaPlugin } from '@1gr14/error0/plugins/meta'
import { redirectPlugin } from '@1gr14/error0/plugins/point0-redirect'
import { responsePlugin } from '@1gr14/error0/plugins/response'
import { stackPlugin } from '@1gr14/error0/plugins/stack'

export const AppError = Error0.mark('AppError')
  .use(
    codeStatusPlugin({
      codes: { UNAUTHORIZED: 401, FORBIDDEN: 403, UNSUBSCRIBED: 403 },
      transport: 'public', // these codes survive the public wire in production
    }),
  )
  .use(metaPlugin()) // structured, private-by-default context
  .use(causePlugin()) // keep the cause chain for the private projection
  .use(responsePlugin()) // let an error carry a ready-made Response
  .use(redirectPlugin()) // bridge a `cause: RedirectTask` into `error.redirect`
  .use(expectedPlugin({ transport: 'public' })) // a public flag your reporter reads
  .use(stackPlugin()) // stack in the private projection only
export type AppError = InstanceType<typeof AppError>
```

```tsx
// src/lib/root.tsx — register it once on the root
export const root = Point0.lets.root().errorClass(AppError).root()
```

```tsx
// anywhere a controllable, serializable error is wanted:
throw new AppError('Sign in to continue', { code: 'UNAUTHORIZED' }) // => HTTP 401
throw new AppError('Not found', { status: 404, meta: { id } })
```

The thrown `AppError` is what the client receives, what `query.error` is typed
as, and what the error component renders.

## The default error class: `ErrorPoint0`

If you never call [`.errorClass`](stage-methods), Point0 uses `ErrorPoint0`. It
extends `Error` and adds optional fields the framework reads:

```tsx
import { ErrorPoint0 } from '@point0/core'

throw new ErrorPoint0('Failed', {
  status: 500, // drives the HTTP status of the response (and SSR)
  code: 'SOMETHING_BROKE', // a stable string code you branch on
  meta: { attemptId }, // structured context for logs (never sent to the client)
})
```

The constructor copies each option onto the instance only when **truthy** — so
`status: 0` or an empty `code` won't be set, and an empty message falls back to
`'Unknown error'`:

```tsx
new ErrorPoint0().message // => 'Unknown error'
new ErrorPoint0('x', { status: 0 }).status // => undefined (0 is falsy)
```

All fields are optional: `status`, `code`, `redirect`, `response`, `headers`,
`meta`. You rarely construct `ErrorPoint0` by hand — you replace it with your
own class (below) and throw that. But it's the type behind every
framework-raised error (a 404 on an unmatched route, a redirect carrier) when
you haven't set one.

`response` and `headers` are wired in the engine. When `error.response` is set,
it's used verbatim as the emitted `Response`; otherwise the engine builds a JSON
error response from `status`. When `error.headers` is set, it's merged into the
response headers through the effects system.

## Replacing the class: `.errorClass(AppError)`

`.errorClass` is a **root-only** setting. It swaps the default and retypes the
entire chain — every downstream typed-error slot becomes your class:

```tsx
export const root = Point0.lets.root().errorClass(AppError).root()
```

The contract is structural: a constructor with the `(message?, options?)` shape
plus three statics — `from`, `serializePublic`, `serializePrivate`. A plain
`class extends Error` that satisfies it works; Error0 just gives it to you for
free.

```tsx
// either of these is valid as the app error class:
const AppError = Error0.mark('AppError').use(/* plugins */) // built with Error0
class AppError extends Error {
  /* …implements from/serializePublic/serializePrivate */
}
```

Once set, the engine constructs every framework error through your class
(`new AppError(...)`, `AppError.from(...)`), so it's the wire and render type
end to end. See [`.errorClass`](stage-methods) for the setter itself.

## Building `AppError` with Error0

[Error0](https://1gr14.dev/error0) is a separate `@1gr14` library for composing
a serializable error class from plugins. It's **one** way to satisfy the
contract above, not a requirement; the plugin API belongs to Error0. Two real
shapes from the codebase:

**The examples shape** — status from a plugin, stack stripped in production:

```tsx
// abridged from examples/basic/src/lib/error.ts (other plugins omitted)
import { statusPlugin } from '@1gr14/error0/plugins/status'
import { codePlugin } from '@1gr14/error0/plugins/code'
import { metaPlugin } from '@1gr14/error0/plugins/meta'
import { env } from '@point0/core'

export const AppError = Error0.use(statusPlugin())
  .use(codePlugin())
  .use(metaPlugin())
  .use('stack', {
    // only keep the stack off-production
    serialize: ({ value }) => (env.mode.is.production ? undefined : value),
  })
export type AppError = InstanceType<typeof AppError>
```

**The production shape** (Start0) — a `code → status` map, so a code implies a
status:

```tsx
// abridged from start0's src/lib/error.ts (cause/response/redirect/expected and
// other plugins omitted)
export const AppError = Error0.mark('AppError')
  .use(
    codeStatusPlugin({
      codes: { UNAUTHORIZED: 401, FORBIDDEN: 403, UNSUBSCRIBED: 403 },
      transport: 'public',
    }),
  )
  .use(metaPlugin())
  .use(stackPlugin())
export type AppError = InstanceType<typeof AppError>

throw new AppError('Sign in to continue', { code: 'UNAUTHORIZED' }) // => 401
```

`transport: 'public'` opts a property into the public projection — it survives
the production wire, so the client can branch on it even for an error that
arrived from the server. (In Start0 that's how the `expected` flag — its own
plugin, also marked `transport: 'public'` — reaches the client to decide whether
to report an error to Sentry; the `code` above is public for the same reason.)
Without it, a property is private and appears only in logs / development.

The full Error0 plugin API — `Error0.mark`, `.use`, the plugin options,
`transport` — is documented on [Error0](https://1gr14.dev/error0).

## Two audiences: `serializePublic` vs `serializePrivate`

An error crosses the wire as one of two projections. The class provides both as
statics (and instance methods that delegate to them):

```tsx
AppError.serializePublic(error)
// => { message, code?, redirect? }   ← what an untrusted client may see

AppError.serializePrivate(error)
// => { message, code?, status?, meta?, stack?, redirect?, cause? }  ← the operator view
```

`serializePublic` **never** emits a stack, `status`, `meta`, or the cause chain
— regardless of environment. `serializePrivate` is the full picture: `status`,
stack, `meta` (JSON-roundtripped; silently dropped if not serializable), and the
whole `cause` chain.

Neither projection carries the **class name**. Every error is coerced to one
class (`ErrorPoint0`, or your `.errorClass`), so the name is a constant that
identifies nothing; the receiver reconstructs an error from the fields it
recognizes (`from()` type-checks each one), not from a name. Each link of the
private `cause` chain still keeps its own native name — there a `TypeError` vs a
`RangeError` is real signal for the operator.

The serializer itself never reads the environment — **the caller picks the
audience by env**. The rule everywhere:

- **HTTP error responses and the error component** branch on the mode:
  `production → serializePublic`, otherwise `serializePrivate`. So in
  development the developer sees the full error (stack and all) right in the
  browser; in production an untrusted client gets only the safe projection.
- **Logs are always private**, never env-gated. Serialize with
  `serializePrivate` — the operator always needs the stack and cause chain:

```tsx
// always private, regardless of NODE_ENV
console.error(AppError.serializePrivate(error))
```

With the `log` function exported from `@point0/core` you don't call
`serializePrivate` yourself: hand it the raw error in the `error` field and it
serializes privately for you (never `toJSON`, which is the public projection).
Its `LogOptions` is `{ level, category: string[], message, error?, meta? }`:

```tsx
import { log } from '@point0/core'

log({
  level: 'error',
  category: ['point0'],
  message: 'request failed',
  error,
})
```

There's also a safety net: `ErrorPoint0` defines a non-enumerable `toJSON` that
returns the **public** projection. So an accidental `JSON.stringify` of a
payload that happens to carry an error leaks only `{ message, code? }`, never
the stack or meta:

```tsx
JSON.stringify({ error: new ErrorPoint0('x', { meta: { secret: 1 } }) })
// => '{"error":{"message":"x"}}'  — no meta, no stack
```

## How a thrown error reaches the error component

When a [loader](loader), [`.ctx`](ctx), a [`.with`](with), or the render body
itself throws, Point0 coerces it through `AppError.from(error)` and routes it to
the nearest error component up the chain — set with `.error` (and the variant
setters `.layoutError` / `.pageError` / `.componentError`):

```tsx
export const root = Point0.lets
  .root()
  .error(({ error }) => <ErrorPageComponent error={error} />)
  .componentError(({ error }) => <ErrorComponent error={error} />)
  .root()
```

The component receives `{ type, error }`, where `error` is your typed class and
`type` is the point variant (`'page'`, `'layout'`, `'component'`). A thrown
error's `status` flows into the SSR response: the bound error component calls
`setStatus(error.status)`, so `throw new AppError('Not found', { status: 404 })`
makes the SSR response a real 404.

**Which boundary catches it.** The error renders **at the point that failed** —
the point whose loader / `.ctx` / `.with` / related query produced it. A failed
layout shows its error in the layout's own slot and its child page never mounts;
a failed page shows its error inside the already-rendered layout. Errors do
**not** bubble between variants — a component error never "becomes" a page
error.

For that failing point, Point0 picks the error component in this order:

1. the **nearest `.error`** declared up the chain (an `.error` on the point or
   on a [plugin](plugin) it uses wins over one set higher up — the closest one
   wins);
2. otherwise the variant-specific setter matching the failing point's variant —
   `.pageError` for a page, `.layoutError` for a layout, `.componentError` for a
   component (root/base `.error` seeds all three at once);
3. otherwise the built-in default error component.

So a `.pageError` set on a layout still catches a _page_ below it, and a page's
own `.error` overrides that inherited `.pageError`.

> These boundaries catch **both phases**. Errors carried in resolved state — a
> thrown/returned error from a loader, `.ctx`, `.with`, or a related query —
> route to `.error` as data. And every mountable render is additionally wrapped
> in a real React error boundary, so an error thrown _while rendering_ (the
> component body, a `.mapper`) also lands in the nearest `.error` and the rest
> of the page stays alive; the boundary resets on navigation. Prefer signaling
> from the data phase anyway — a returned error is typed and sets the SSR
> `status`; the render boundary is the safety net.

[`.with`](with) is the other path — returning (not throwing) an `Error` from a
`.with` renders the error component too, and that's how you build an auth gate
that fires even on a loader-less page:

```tsx
.with(({ props: { me } }) => {
  if (!me) return new AppError('Sign in to continue', { code: 'UNAUTHORIZED' })
  return { me }
})
```

When you set no custom error component, Point0 renders a built-in fallback that
shows the serialized error as JSON plus the stack — but only in development.
**In production it renders the public projection (no stack) and never falls back
to `error.stack`**, because doing so would bake the server stack into the SSR
HTML the client downloads:

```tsx
// the framework default error component, in essence:
const json = env.mode.is.production
  ? AppError.serializePublic(error) // prod: no stack at all
  : AppError.serializePrivate(error) // dev: full
// production stack is always undefined here — never error.stack
```

Mirror that in your own component: gate the stack on `!env.mode.is.production`
(and render it client-only). The Start0 error component does exactly this — it
branches on `error.code` / `error.status` for the user-facing copy and shows the
stack only off-production, inside `<ClientOnly>`.

## Typed error in `query.error` and `.on('error')`

Because the class threads through the chain, `query.error` is your class, never
`unknown`:

```tsx
const result = ideaQuery.useQuery({ id })
if (result.error) {
  return <div>{result.error.message}</div> // result.error is AppError, fully typed
}
```

The aggregate subscription `.on('error', cb)` fires on any error event. The
string `'error'` is sugar that expands to the four concrete error events —
`pointQueryError`, `pointMutationError`, `pointInfiniteQueryError`,
`engineFetchError`:

```tsx
export const root = Point0.lets
  .root()
  .on('error', ({ side, name, error, meta }) => {
    // `error` is the typed instance; `meta` is a log-friendly projection of the payload
    console.error({ side, name, error: error.serializePrivate(), ...meta })
  })
  .root()
```

The callback envelope is `{ side, name, data, error, meta }`. Use `error` and
`meta` for logs — `meta` is the slim, already-serialized projection (points
become ids, requests become `{ method, path }`, errors serialized). Don't log
`data`: it's the raw payload and not always safe to serialize. Subscribe per
side with `.serverOn` / `.clientOn` (server-only events like `engineFetchError`
are visible only inside `.serverOn`). Full event surface on [Events](events).

## Redirect as an error

A redirect travels as a `RedirectTask`. You don't throw a dedicated class — you
return or throw the task from a [`.ctx`](ctx), [`.with`](with), or
[loader](loader), and Point0 turns it into a real `Location` response:

```tsx
import { redirect } from '@/lib/navigation' // from createNavigation(...)

// in a .with gate — return the task, it's treated as a navigation directive
.with(({ props: { me } }) => {
  if (!me) return redirect('signIn')
  return { me }
})

// in a mutation loader — throw it to short-circuit after the write
.loader(async ({ input }) => {
  const idea = await createIdea(input)
  throw redirect('ideaView', { id: idea.id })
})
```

The two transports differ by where the navigation happens:

- **From an SSR page render**, the `RedirectTask` becomes a real `Location`
  response — a genuine HTTP redirect status the browser follows before any of
  your JS runs. Status is **302** by default; only `301 / 302 / 303 / 307 / 308`
  are honored, anything else is clamped to 302.
- **From a query or mutation**, the redirect rides back in the serialized error
  as an _instruction_: the client receives it, then navigates to the new page
  itself — no full reload, the client-side (SPA-style) navigation you'd get from
  `<Link>`.

`ErrorPoint0` carries a `redirect` field, and both serializers include
`redirect: error.redirect.serialize()` when present — that's how the instruction
survives the wire. When you build your class with Error0, the
[`point0-redirect`](https://1gr14.dev/error0) plugin bridges a
`cause: RedirectTask` into `error.redirect` for you, so throwing a `redirect`
through an ordinary error path just works. Full navigation mechanics are on
[Navigation](navigation).

## There is no `NotFoundError`

Point0 ships **no** `NotFoundError`, `RedirectError`, `notFound()`, or
`redirect()`-throwing subclass. You model these states with a **code and status
on your error class**, not a dedicated subclass:

```tsx
throw new AppError('Idea not found', { status: 404, meta: { id } })
throw new AppError('Sign in to continue', { code: 'UNAUTHORIZED' }) // => 401 via codeStatusPlugin
throw new AppError('Only the author can edit', { code: 'FORBIDDEN' }) // => 403
```

The `status` drives the HTTP response and the error component's `setStatus`; the
`code` is what your error component branches on. Internally an unmatched route
is just `new AppError('Not Found', { status: 404, code: 'POINT0_NOT_FOUND' })` —
same mechanism. Point0 exposes its own codes through `POINT0_ERROR_CODES_MAP`
(`.NOT_FOUND`, `.REDIRECT`, …) for matching framework errors; you can treat
`POINT0_NOT_FOUND` as expected noise to keep scanner 404s out of your error
reporter.

## Security

The browser bundle is public — anyone can read it. Server-only code (loader
bodies, secrets, DB calls) is stripped from it at compile time, so `meta` and
the private projection never ship to the browser unless your serializer
explicitly marks a property public. (The first page load is still
server-rendered; what's stripped is the _server-only code_, not the rendered
HTML.) Two rules that follow:

- **Keep sensitive context in `meta`, not `message`.** `message` and `code` are
  public; `meta`, `status`, and the stack are private and only appear in logs
  and development.
- **Gate auth in [`.with`](with), not [`.ctx`](ctx).** `.ctx` runs only when a
  point has a loader, so a loader-less page's `.ctx` never executes and can't
  protect anything. A `.with` that returns an `AppError` (or a `redirect`) runs
  at render and always fires — see [`.with`](with).

## Reference

### `ErrorPoint0` / `AppError` fields

| Field      | Type                                   | Notes                                                                  |
| ---------- | -------------------------------------- | ---------------------------------------------------------------------- |
| `message`  | `string`                               | empty → `'Unknown error'`. Public.                                     |
| `status`   | `number?`                              | drives the HTTP/SSR status. Private. `0` is not set.                   |
| `code`     | `string?`                              | stable code you branch on. Public.                                     |
| `redirect` | `RedirectTask?`                        | carries a redirect; serialized into both projections.                  |
| `meta`     | `Record<string, unknown>?`             | log/dev context. Private. Must be JSON-serializable.                   |
| `response` | `Response?`                            | when set, emitted verbatim as the response (else built from `status`). |
| `headers`  | `Record<string, string \| undefined>?` | when set, merged into the response headers via effects.                |
| `cause`    | `unknown`                              | standard `Error` cause; included in `serializePrivate`.                |

### Static methods (the `.errorClass` contract)

| Static                    | Returns                                                         | Use                                           |
| ------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| `from(error: unknown)`    | an instance                                                     | coerce anything thrown into the class         |
| `serializePublic(error)`  | `{ message, code?, redirect? }`                                 | untrusted client / production wire — no stack |
| `serializePrivate(error)` | `{ message, code?, status?, meta?, stack?, redirect?, cause? }` | logs / development — full view                |

Instance methods `error.serializePublic()` / `error.serializePrivate()` delegate
to the statics.

### `from()` coercion notes

- An `ErrorPoint0` / `AppError` is returned unchanged.
- A plain `new Error(...)` (constructor exactly `Error`) is **not** nested as
  its own `cause` — only a subclass instance becomes the `cause`.
- `message`, `status`, `code`, `stack`, and `meta` are lifted off the source
  when present; a `RedirectTask` source reconstructs `redirect` and defaults the
  message to `'Page Redirect'`.

### Default statuses

| Situation           | Status                                 |
| ------------------- | -------------------------------------- |
| JSON error response | `error.status ?? 500`                  |
| unmatched route     | `404` (`code: POINT0_NOT_FOUND`)       |
| redirect            | `302` (clamped to 301/302/303/307/308) |

### Env gate

Audience selection reads `env.mode.is.production` (from [`env`](env), derived
from `NODE_ENV`). `production` → `serializePublic`; otherwise →
`serializePrivate`. Logs ignore the gate and always use `serializePrivate`.

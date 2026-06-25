---
index: 800
title: Mutation
description: A mutation is an input schema plus a loader — a real HTTP POST endpoint and a TanStack Mutation in one.
---

A mutation pairs an input schema with a loader that does the write. It's a real
HTTP endpoint (its own `POST` path, in the OpenAPI spec) and, at the same time,
a thin wrapper over a classic
[TanStack (react-query) mutation](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) —
declared once, called anywhere by importing it directly.

```tsx
import { root } from '@/lib/root'
import { authorizedOnlyPlugin } from '@/lib/auth'
import { z } from 'zod'

export const ideaCreateMutation = root.lets
  .mutation()
  .use(authorizedOnlyPlugin) // brings ctx.me — the current user
  .input(z.object({ title: z.string().min(1), content: z.string().min(1) }))
  .loader(async ({ ctx, input: { title, content } }) => {
    // cut from the client bundle — this body and its imports never ship to the browser
    const idea = await prisma.idea.create({
      data: { title, content, authorId: ctx.me.user.id },
    })
    return { idea }
  })
  .mutation()
```

```tsx
// anywhere in a component:
const mutation = ideaCreateMutation.useMutation()
await mutation.mutateAsync({ title, content })
```

The first argument to every mutation call is the **input** — that's what gets
validated, sent to the loader, and used to find a specific call in the mutation
cache.

## Declaring a mutation

Open with `.mutation()`, declare input and a loader, close with
`.mutation(options?)`:

```tsx
export const ideaCreateMutation = root.lets
  .mutation() // open
  .input(z.object({ title: z.string().min(1) }))
  .loader(async ({ input }) => ({ idea: await createIdea(input) }))
  .mutation() // close
```

See [points](points) for the `.lets` notation.

The two `.mutation()` calls are not the same method: the first **opens** a
mutation-stage point, the second **closes** it into a ready mutation. You must
add a [`.loader`](loader) (or `.clientLoader`) before closing — calling
`.mutation()` with no loader is a type error:

```tsx
root.lets.mutation().input(/* ... */).mutation()
// type error: Point has no loaders. Please add .loader()
//             or .clientLoader() before calling .mutation()
```

The closing `.mutation(options?)` closer is **server-and-client** — it's not cut
from either bundle, kept in both (isomorphic), because the options carry
react-query defaults the browser needs.

## The loader is the mutation body

The [`.loader`](loader) is the function that runs when the mutation fires; its
return value becomes the mutation's `data`:

```tsx
.loader(async ({ input }) => {
  const idea = await prisma.idea.create({ data: input })
  return { idea } // => mutation.data is { idea }
})
```

The server `.loader` is **server-only** — cut from the client bundle: its body
and the imports it uses are removed, so it never ships to the browser. Stays in
the server build (it runs on the server).

A mutation can have a server loader, a client loader, or both:

```tsx
// server loader → cut from the client bundle (body + imports gone); the mutation is an HTTP endpoint
.loader(async ({ input }) => ({ idea: await prisma.idea.create({ data: input }) }))

// clientLoader only → cut from the server bundle (body + imports gone); no server request at all
.clientLoader(async ({ input }) => ({ ok: await callSomeBrowserApi(input) }))
```

`.clientLoader` is **client-only** — cut from the server bundle: body and its
imports removed (regardless of SSR), so it never lands in the server build. Kept
in the client build (it runs in the browser).

With a server loader, calling the mutation sends one request to the server; with
a client-only loader, nothing leaves the browser. See [Loader](loader) for the
full callback surface and how server code is removed from the client build.

## Input and validation

`.input(schema)` takes any [Standard Schema](validation) — zod, valibot,
arktype, and others — or a custom validate function:

```tsx
.input(z.object({ title: z.string().min(1), content: z.string().min(1) }))
```

For a client loader, use `.clientInput` (client side) or `.sharedInput` (both
sides). Input schemas **merge down the chain**: a parent — a [base](base) or
[plugin](plugin) — can declare part of the input and the mutation adds the rest.

`.input` is **server-only** — cut from the client bundle: the server validation
schema and the imports it uses are removed, so it never ships to the browser.
`.clientInput` is **client-only** — cut from the server bundle: body and its
imports removed.
<!-- TODO(med): confirm .sharedInput's strip category against the compiler (point.ts ~1014-1170) — R3 lists .input as server-only and .clientInput as client-only, but does not name .sharedInput; verify it's kept on both bundles before documenting its strip note. -->

A mutation uses `.input` (plus `.clientInput` / `.sharedInput`) — **not**
`.params`, `.search`, or `.body`; those are for [pages](page) and
[actions](action) and are a type error on a mutation:

```tsx
root.lets.mutation().params(/* ... */)
// type error: For "mutation" not allowed "params" schema.
//             Only "input" are allowed.
```

A mutation with no input schema takes an optional input — `mutation.mutate()`
with no argument works. File inputs work too: a `z.instanceof(File)` field is
sent as multipart and the loader receives a real `File`. Full schema mechanics
live in [Validation](validation); file handling in [File upload](file-upload).

## Using a mutation

**As a hook.** `useMutation` returns the standard TanStack `UseMutationResult` —
`.mutate`, `.mutateAsync`, `.data`, `.isPending`, `.error`, and the rest:

```tsx
const mutation = ideaCreateMutation.useMutation()

// input is the first argument; per-call options follow it
await mutation.mutateAsync(
  { title, content },
  { onSuccess: async ({ idea }) => { await navigate('ideaView', { id: idea.id }) } },
)

mutation.isPending // disable the submit button while it runs
```

**Imperatively, no hook.** `fetchMutation` runs the mutation outside a React
render and resolves to the loader's output. Input is the first argument:

```tsx
const { idea } = await ideaUpdateMutation.fetchMutation({ id, title, content })
await navigate('ideaView', { id: idea.id })
```

Pass `{ queryClient }` in the trailing options to target a specific client;
otherwise the global one is used.

## react-query options

The closing `.mutation({...})` takes standard TanStack `useMutation` options —
everything **except** `mutationFn` and `mutationKey`, which Point0 supplies.
They become the mutation's defaults and are the natural place to update other
caches on success:

```tsx
export const ideaCreateMutation = root.lets
  .mutation()
  .input(ideaCreateSchema)
  .loader(async ({ input }) => ({ idea: await createIdea(input) }))
  .mutation({
    onSuccess: async ({ idea }) => {
      // seed the view query's cache so the next page reads it instantly
      ideaViewQuery.setQueryData({ id: idea.id }, { idea })
    },
  })
```

`onSuccess` here receives the loader's output, typed; `onError`, `onSettled`,
`onMutate`, `retry`, `gcTime`, and the rest are all available and typed against
the real output and input.

Per-call options on `useMutation` / `mutateAsync` / `fetchMutation` **merge**
with these defaults rather than replacing them — the callbacks chain, so both an
`onSuccess` on `.mutation({...})` and an `onSuccess` on `mutateAsync(...)` run,
in order.

## Defaults from up the chain

Set mutation defaults once on the [root](root), a [base](base), or a
[plugin](plugin) with `.mutationOptions(...)`, and they apply to every mutation
beneath. There is no `.mutationOptions()` on the mutation itself — per-mutation
options go through the closing `.mutation({...})`. Both `.mutationOptions` and the
closing `.mutation({...})` are **server-and-client** — not cut from either bundle,
kept in both (isomorphic), because they hold react-query defaults the browser
needs.
Resolution is lowest-to-highest:

1. root/base/plugin `.mutationOptions(...)`
2. the mutation's own closing `.mutation({...})`
3. the call-site options on `useMutation` / `mutateAsync` / `fetchMutation`

Callbacks (`onMutate` / `onSuccess` / `onError` / `onSettled`) at every level run
in order rather than overwriting each other.

## Authorization

`.ctx` is **server-only** — cut from the client bundle: its body and the imports
it uses are removed, so it never ships to the browser. It runs **only when the
mutation runs its loader** — which a mutation always does, so a
`.use(plugin)` that resolves the current user into `ctx` lets the loader gate the
write server-side:

```tsx
export const ideaUpdateMutation = root.lets
  .mutation()
  .use(authorizedOnlyPlugin) // ctx.me — resolved server-side
  .input(ideaUpdateMutationSchema)
  .loader(async ({ ctx, input: { sn, title, content } }) => {
    const existing = await prisma.idea.findUniqueOrThrow({
      select: { authorId: true },
      where: { sn },
    })
    if (existing.authorId !== ctx.me.user.id) {
      throw new AppError('Only the author can edit this idea', { code: 'FORBIDDEN' })
    }
    return { idea: await prisma.idea.update({ where: { sn }, data: { title, content } }) }
  })
  .mutation()
```

`AppError` here is your own error class (`ErrorPoint0` by default, or whatever
you set via `.errorClass(...)` — see [error handling](error-handling)); throwing
it from the loader rejects the mutation, and `mutation.error` is typed as that
class. Unlike a [page](page) — where a loader-less point never runs `.ctx`, so
auth must be gated in
[`.with`](with) — a mutation has no loader-less case, so a ctx gate inside the
loader always fires.

## A real endpoint

A mutation with a server loader is served over HTTP at an auto-generated path —
`POST /_point0/<scope>/mutation/<kebab-name>` — with the input in the request
body, and it shows up in the generated [OpenAPI](openapi) spec. You never write the
path; `useMutation` / `fetchMutation` route to it for you. Unlike a single
RPC-style endpoint, every mutation has its own stable URL, which is what gives
full OpenAPI coverage.

A mutation whose only loader is a `.clientLoader` runs in the browser and has
**no endpoint** (and no OpenAPI entry).

<!-- TODO(low): the mutation method is always POST and the prefix is _point0; a custom method or endpoint prefix for a plain mutation is NOT FOUND in tests or examples — method override is the action surface. -->

## The mutation key

You rarely touch it, but knowing its shape helps when reading the cache.
`getMutationKey()` takes **no arguments** and returns a two-element tuple:

```tsx
ideaCreateMutation.getMutationKey()
// [
//   'point0',
//   {
//     scope: 'root',        // which client/root this point grows from
//     type: 'mutation',
//     name: 'ideaCreate',
//     tags: [],             // from .tag(...)
//   },
// ]
```

Unlike a [query](query) key, the mutation key carries **no input** — input is per
call, so it lives in each cached mutation's `variables`, not in the key. `tags`
come from `.tag('a', 'b')` and let you match groups of mutations.

To filter the react-query mutation cache, the exported `getMutationPredicate`
helper matches on `id` (= `scope:type:name`), `tags`, `scope`, `type`, or
`name`:

```tsx
import { getMutationPredicate } from '@point0/core'

queryClient.getMutationCache().findAll({
  predicate: getMutationPredicate({ tags: 'idea' }),
})
```

> **GOTCHA:** for a tags **array**, the mutation predicate matches if **any** tag
> is present (`some` / OR), whereas the query predicate requires **all** tags
> (`every` / AND). `getMutationPredicate({ tags: ['a', 'b'] })` matches a mutation
> tagged with `a` *or* `b`.

## Reading the mutation cache

Each `.mutate(input)` creates a cache entry keyed by its `variables`. Two
accessors read it back:

```tsx
// one entry — exact input match
const m = ideaCreateMutation.getMutationCache({ id: 7 })
m?.state.variables // => { id: 7 }
m?.state.data // => the loader output, or undefined if not run yet

// many entries — three filter modes for the first argument:
ideaCreateMutation.getMutationsCache(true) // all entries for this mutation
ideaCreateMutation.getMutationsCache({ id: 7 }) // exact-input matches
ideaCreateMutation.getMutationsCache((v) => v.id === 7) // predicate over variables
```

`getMutationCache` returns the single matching `Mutation` or `undefined`;
`getMutationsCache` always returns an array. Input matching is exact on the
stringified variables (using the point's [transformer](transformer)), and ignores
tags.

## Edge cases

- **Server execution throws.** A mutation's `mutationFn` is client-only; calling
  it on the server throws. For a server-side write, use `engine.execute` /
  `Executor.execute`, or the `execute` function passed to a loader/ctx.
- **A loader can redirect.** `throw redirect('ideaView', { id })` inside the
  loader navigates the client after the mutation settles — see
  [Navigation](navigation).
- **Events fire on every run.** Each mutation emits `pointMutationStart`, then
  `pointMutationSettled` plus `pointMutationSuccess` (or `pointMutationError`).
  Subscribe with `.on` / `.serverOn` / `.clientOn` — see [Events](events).

## Reference

### Method surface

A ready mutation point exposes:

| Method                | Signature                                | Returns                          |
| --------------------- | ---------------------------------------- | -------------------------------- |
| `useMutation`         | `(mutationOptions?, options?)`           | TanStack `UseMutationResult`     |
| `fetchMutation`       | `(input, mutationOptions?, options?)`    | `Promise<data>`                  |
| `getMutationOptions`  | `(mutationOptions?, options?)`           | built react-query `MutationOptions` |
| `getMutationKey`      | `()`                                     | the `MutationKey` tuple          |
| `getMutationCache`    | `(input, options?)`                      | `Mutation \| undefined`          |
| `getMutationsCache`   | `(input \| predicate \| true, options?)` | `Mutation[]`                     |

`mutationOptions` is the [react-query options](#react-query-options) (no
`mutationFn` / `mutationKey`); `options` is `{ fetchOptions?, queryClient? }`
(members vary by method). On `useMutation` / `getMutationOptions` the input is
not a method argument — it's passed to `.mutate` / `.mutateAsync` at call time;
`fetchMutation` and `getMutationCache` take the input as their first argument.

Also exposed: `id` (= `` `${scope}:${type}:${name}` ``), `type` (`'mutation'`),
`tags`, `point` (the self-reference), and `Infer` (type inference — see
[Infer](infer)).

<!-- TODO(med): with a server loader the mutation also exposes lower-level fetch / getFetchServerOptions / fetchServer / fetchServerDetailed helpers, but no test or example exercises them on a mutation — their behavior for the mutation case is NOT FOUND. Primary surface is the six methods above. -->

<!-- TODO(low): fetchOptions / headers / cookies are accepted while composing a mutation, and options.fetchOptions is typed on the fetch helpers, but their effect on a mutation request is NOT FOUND in tests or examples. -->

### Methods that apply to a mutation

Data & context: [`.loader`](loader), `.clientLoader`, [`.ctx`](ctx),
[`.input` / `.clientInput` / `.sharedInput`](validation), `.use` (plugins).

Strip categories for these: `.loader`, `.ctx`, `.input` are **server-only** —
cut from the client bundle (body + the imports they use removed, so they never
ship to the browser); `.clientLoader`, `.clientInput` are **client-only** — cut
from the server bundle (body + imports removed).
<!-- TODO(med): confirm .sharedInput and .use strip categories against the compiler (point.ts ~1014-1170) — not named in R3. -->

Shared: [`.middleware`](middleware), `.on` / `.serverOn` / `.clientOn` (events),
`.tag`, `.description`, `.fetchOptions`, `.headers`, `.cookies`.

Strip categories: `.middleware`, `.serverOn`, `.description`, `.headers`,
`.cookies` are **server-only** — cut from the client bundle (body + imports
removed); `.clientOn` is **client-only** — cut from the server bundle (body +
imports removed); `.tag`, `.on`, and `.fetchOptions` are **server-and-client** —
not cut from either bundle, kept in both (isomorphic).

Defaults (`.mutationOptions`) live on the [root](root) / [base](base) /
[plugin](plugin) above the mutation, not on the mutation itself — it's
**server-and-client**: not cut from either bundle, kept in both (isomorphic).

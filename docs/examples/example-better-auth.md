---
index: 300
title: Better Auth Example
description:
  The basic ideas board plus authentication — a Better Auth middleware mount, an
  auth plugin that resolves the user, and gated pages and mutations.
label: Better Auth
example: examples/better-auth
---

`examples/better-auth` is the **same app as [basic](example-basic)** — the
IdeaNick ideas board — plus authentication through
[Better Auth](https://better-auth.com): sign-in/up, a profile page, protected
pages and mutations, and an error class carrying `UNAUTHORIZED` / `FORBIDDEN`
codes. Everything else is unchanged from basic. The buttons above and below open
the full source.

Two things make this the distinctive example. First, Better Auth's own router is
mounted as a single [middleware](middleware) on the [root](root) — middlewares
run server-side only, so the handler body never reaches the browser bundle:

```tsx
// examples/better-auth/src/lib/root.tsx
.middleware('/api/auth/*', async ({ request }) => await authServer.handler(request.original))
```

Second, gating is a [plugin](plugin). A plugin bundles [`.ctx`](ctx) (server)
and [`.with`](with) (render, client + SSR), so one `.use(...)` protects a point
on both sides:

```tsx
// examples/better-auth/src/lib/auth/plugins.ts
export const authorizedOnlyPlugin = Point0.lets
  .plugin('authorizedOnly')
  .use(mePlugin) // puts the resolved user into ctx + props
  .ctx(({ ctx: { me } }) => {
    if (!me)
      throw new AppError('Only for authorized users', { code: 'UNAUTHORIZED' })
    return { me } // narrowed to non-null
  })
  .with(({ props: { me } }) => {
    if (!me)
      return new AppError('Only for authorized users', { code: 'UNAUTHORIZED' }) // return, don't throw
    return { me }
  })
  .plugin()
```

Note the asymmetry: `.ctx` **throws** the error (rejecting the server load),
`.with` **returns** it (short-circuiting to the error component). The example
ships four such plugins — `mePlugin` (read the user), `authorizedOnlyPlugin` and
`redirectUnauthorizedPlugin` (gate anonymous visitors by error or redirect), and
`redirectAuthorizedPlugin` (keep signed-in users off the sign-in page). Gating a
point is then one `.use(authorizedOnlyPlugin)`; a protected mutation reads
`ctx.me` and enforces ownership server-side, while the matching page re-checks
on the client for UX.

The error class adds a `code` field (here via [error0](error-handling)'s code
plugin, marked public so it survives serialization), and the error component
branches on it — `UNAUTHORIZED` renders a sign-in link, `FORBIDDEN` shows the
message. See [`.middleware`](middleware), [`.with`](with), [Plugin](plugin),
[Env](env), and [Error handling](error-handling) for the mechanics.

<!-- TODO(low): the exact endpoints under /api/auth/* (sign-in/email, get-session, …) live inside Better Auth, not this repo — link the Better Auth docs for the full list. -->

## Running it

Identical to [basic](example-basic) — `bun install && bun run build` at the repo
root, then `bun run setup && bun run dev` inside `examples/better-auth`. The
seed creates a user **through Better Auth itself** (`authServer.api.signUpEmail`
with `x@example.com` / `12345678`) and prefills the sign-in form with those
credentials. See [getting-started](getting-started).

## For a real app

This example shows auth in isolation. For a real product, start from
**[start0](https://1gr14.dev/start0)** — it ships this auth setup with social
providers and more, alongside admin, forms, CRUD, email, and deploy
(`bun create start0 my-app`).

## What this example adds over basic

| Area            | basic                             | better-auth                                           |
| --------------- | --------------------------------- | ----------------------------------------------------- |
| Root middleware | OpenAPI only                      | `/api/auth/*` Better Auth handler **+** OpenAPI       |
| `src/lib/auth/` | —                                 | `server.ts`, `client.ts`, `api.ts`, `plugins.ts`      |
| Prisma models   | `Idea`, `IdeaNewsPost`            | adds `User`, `Session`, `Account`, `Verification`     |
| Create / update | one open `idea-create-update.tsx` | split `idea-create.tsx` + `idea-update.tsx`, gated    |
| Errors          | generic                           | `UNAUTHORIZED` / `FORBIDDEN` codes drive the error UI |

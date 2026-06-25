---
index: 1200
title: Testing
description: Run a point's loader, drive a request, or walk a real browser — three test levels, no manual server boot.
---

A Point0 app is a normal fullstack app, so you test it however you already test
fullstack apps — there is no Point0-specific test framework to learn. Two facts
matter, and the rest of this page is just **one** way to organize around them:

1. **It runs in a real browser.** The built (or dev) app serves real HTML over
   HTTP, so you can drive it end-to-end with [Playwright](https://playwright.dev/)
   (or any browser driver) exactly like any other web app.
2. **You can also call a point's server loader directly, in-process, with full
   types.** `point.fetchServer(input)` runs the point's server loader and hands
   back its typed output — no socket, no HTTP framing. `point.fetchServerDetailed`
   does the same but returns a discriminated `{ output } | { error } | { redirect }`
   so you can assert on failures. Both run inside `engine.withFetch(...)`, against
   the `engine` you already export.

That second point is the one worth remembering — it lets you unit-test backend
logic against your real engine without booting a server:

```ts
// run a query's server loader in-process, no server, typed output
import { engine } from '@/engine'
import { getMeQuery } from '@/modules/auth/api'
import { expect, test } from 'bun:test'

test('anonymous user gets null "me"', async () => {
  const result = await engine.withFetch(async () => {
    return await getMeQuery.fetchServer(undefined, { headers: {} })
  })
  expect(result.me).toBeNull() // => the loader's typed output, no HTTP framing
})
```

That is the whole framework surface for testing: `engine.withFetch`,
`engine.fetch`, `point.fetchServer` / `fetchServerDetailed`. The runner above is
**Bun's** `bun:test` — not Jest or Vitest — but nothing here is tied to it.

<!-- TODO(med): the example apps under examples/* ship no tests, and it is NOT
confirmed whether create-point0-app scaffolds a src/test/ rig. The layout below is
a pattern to copy, not generated output. -->

## This page is one example, not the way

Everything below — the four-kind `unit` / `dom` / `int` / `e2e` taxonomy, the file
suffixes, the `src/test/setup/*` preloads, the fixtures and `cleanDb` helpers — is
how [start0](https://1gr14.dev/start0), our boilerplate, happens to lay its tests
out. None of it is Point0 API. **Copy what fits, ignore the rest, or structure your
tests completely differently.** Point0 only gives you the runtime hooks; you wire
the test harness yourself.

## The four kinds

Pick the **lightest** kind that can catch the bug.

| Kind | Suffix | Spins up | For |
| --- | --- | --- | --- |
| **unit** | `*.unit.test.ts` | plain Bun | a util, a pure function, a schema |
| **dom** | `*.dom.test.tsx` | happy-dom + Testing Library, **no browser** | React components and hooks |
| **int** | `*.int.test.ts` | engine + Prisma in-process, **no server** | endpoint / backend behavior |
| **e2e** | `*.e2e.test.ts` | **real server + real browser** (Playwright) | full user flows |

Each kind loads its own setup via Bun's `--preload`, and the file suffix is how
Bun's filter picks the suite. start0 runs them all under `NODE_ENV=test` against a
separate test database:

```sh
bun run test         # unit → dom → int → e2e (build) in order
bun run test:unit
bun run test:dom
bun run test:int
bun run test:e2e:dev # see e2e section for the three server modes
```

Each script is a Bun test run filtered by suffix, with the matching setup
preloaded:

```jsonc
// package.json — start0
"test:int":  "cross-env NODE_ENV=test bun test --pass-with-no-tests --preload ./src/test/setup/int.ts .int.test.",
"test:dom":  "cross-env NODE_ENV=test bun test --pass-with-no-tests --preload ./src/test/setup/dom.ts .dom.test.",
"test":      "bun test:unit && bun test:dom && bun test:int && bun test:e2e:build",
```

The trailing `.int.test.` is Bun's filename filter; `--preload` runs the setup
before any test file. (start0 also keeps one `src/test/setup/preload.ts`
dispatcher that reads the test file's name and imports the matching setup — same
result, one entry point.)

## int — run one point's loader (`engine.withFetch` + `fetchServer`)

This is the default for backend tests: execute **one point's server loader**, get
its typed output, no HTTP request, no socket. Two pieces:

- **`point.fetchServer(input, fetchOptions?)`** runs the point's server loader and
  returns the loader's output. It **throws** on a loader error or a redirect.
- **`engine.withFetch(callback)`** is the wrapper you run it inside. It swaps the
  fetch that points use under the hood so the loader runs **against this engine
  in-process** instead of hitting the network. Call `fetchServer` *inside* the
  callback.

```ts
import { engine } from '@/engine'
import { ideaListQuery } from '@/features/idea/api'
import { expect, test } from 'bun:test'

test('returns the newest ideas first', async () => {
  const result = await engine.withFetch(async () => {
    return await ideaListQuery.fetchServer({}) // input is typed from the query
  })
  expect(result.items.map((i) => i.sn)).toEqual([third.sn, second.sn, first.sn])
})
```

### Simulate auth: pass `headers`

The second argument is `FetchOptions` — a standard `RequestInit` (so `headers`,
`method`, `body`, …) plus a `transform?: boolean` flag. Pass `headers` to run the
loader as a specific user, or `{}` for anonymous:

```ts
await getMeQuery.fetchServer(undefined, { headers: {} })          // anonymous
await getMeQuery.fetchServer(undefined, { headers: user.headers }) // signed-in
```

`user.headers` here comes from a test fixture that creates a real user — that
fixture is a start0 helper, shown in [fixtures](#fixtures-seed-and-authenticate)
further down, not a Point0 API.

### Assert on errors: `fetchServerDetailed`

`fetchServer` throws on error, which is what you want when you just need the value.
When you want to **assert on the error** instead, use `fetchServerDetailed` — same
execution, but it returns a discriminated result (`{ output }` on success, `{
error }` on failure, `{ redirect }` on redirect) rather than throwing:

```ts
test('rejects anonymous users', async () => {
  const result = await engine.withFetch(async () => {
    return await ideaCreateMutation.fetchServerDetailed(
      { title: 'Nope', content: 'Nope' },
      { headers: {} },
    )
  })
  expect(result.error?.code).toBe('UNAUTHORIZED') // your AppError's code
  expect(await prisma.idea.count()).toBe(0)        // and nothing was written
})
```

Int tests run in the same process as the engine, so you read the database
**directly** through Prisma to verify side effects (`prisma.idea.count()`,
`findUniqueOrThrow`) — there is no server to ask. Ownership and authorization
gates are the highest-value cases:

```ts
test('forbids non-authors', async () => {
  const author = await createTestUser()
  const intruder = await createTestUser({ index: 1 })
  const created = await seedIdea({ authorId: author.id, title: 'Untouchable' })

  const result = await engine.withFetch(async () => {
    return await ideaUpdateMutation.fetchServerDetailed(
      { sn: created.sn, title: 'Hijacked', content: 'Hijacked' },
      { headers: intruder.headers },
    )
  })
  expect(result.error?.code).toBe('FORBIDDEN')

  const inDb = await prisma.idea.findUniqueOrThrow({ where: { sn: created.sn } })
  expect(inDb.title).toBe('Untouchable') // unchanged
})
```

> **What to test:** write int tests for states that *do* something that can break —
> authorization gates, ownership checks, data rules. Skip plumbing like pagination;
> tests written just to have tests only grow the codebase.

### The int setup: `engine.prepare()`

Before any in-process fetch, the engine must be prepared once. start0 does it in
the int preload:

```ts
// src/test/setup/int.ts
import { engine } from '@/engine'

// int tests have only the server, so point pages at the server origin too
process.env.CLIENT_URL = process.env.SERVER_URL
await import('@/preload') // load env + register points before the engine reads them

// Prepare the engine once for the whole run. Prisma connects lazily on the first
// query, so this touches no database and opens no port.
await engine.prepare()
export {}
```

`engine.prepare()` makes the engine read its registered points and ready its
server side — the same step `engine.serve()` does for you automatically; here you
call it by hand because there is no `serve()`. **Skip it and `fetchServer` /
`engine.fetch` throw** `Engine server is not prepared. Please call await
engine.prepare() first.` It does not open a port or touch the DB. (Compare
[engine-runtime](engine-runtime) for `serve` / `prepare` / `preload`.)

## int — drive a raw request (`engine.fetch`)

When the unit under test is the **request pipeline** — middleware, an action
endpoint, a status code, a 404 — use `engine.fetch(request, init?)`. It runs a
real `Request` through the engine in-process and returns a `Response`, no socket
opened:

```ts
const response = await engine.fetch('http://localhost:3001/zxc/123', { method: 'POST' })
expect(response.status).toBe(201)
expect(await response.json()).toEqual({ id: '123' })
```

The first argument is a `string | URL | Request`; the second is a `RequestInit`.
**Use a full absolute URL** — the router needs an origin to parse path and method.
The port value is arbitrary in-process; only the path and method matter.

A not-found request flows through the same way:

```ts
const response = await engine.fetch('http://localhost:3001/zxc/123', {
  method: 'PUT',
  headers: { Accept: 'application/json' },
})
expect(response.status).toBe(404)
expect(await response.json()).toMatchObject({ message: 'Not Found' })
```

For assertions on the transport layer beyond the body — which point matched,
headers, the raw error — `engine.fetchDetailed(...)` returns the full result and
`engine.fetch` is just `(...).response`.

> **`fetchServer` vs `fetch`:** `engine.fetch` exercises the whole HTTP pipeline
> (routing, middleware, serialization). `point.fetchServer` runs **one loader**
> directly and hands back its typed value — fewer moving parts, better types.
> Reach for `fetchServer` to test a point's logic, `engine.fetch` to test the
> request path around it.

When the engine is created with a required ctx, `engine.fetch`'s overload makes
`requiredCtx` a mandatory option (`engine.fetch(url, { requiredCtx, ...init })`).
Most apps (start0 included) require none, so you pass just the URL and an
optional `RequestInit`.

<!-- TODO(low): FetchOptions.transform — default and exact effect on the
transformer round-trip in tests — is not pinned down by any test; confirm before
documenting it here. -->
<!-- TODO(low): cross-link [transformer](transformer) once transform behavior in
tests is confirmed. -->
<!-- TODO(low): provide a concrete engine.fetch example for an engine that does
require a ctx, once one exists in the examples or start0. -->

## fixtures: seed and authenticate

int tests need real rows and real sessions. These are start0 helpers — patterns to
replicate, not framework API:

```ts
// create a user straight in the DB; get back the row + ready auth headers + login()
const user = await createTestUser()
const other = await createTestUser({ index: 1 }) // a second, distinct user
const { headers } = await user.login()           // refresh headers via a real sign-in
```

`createTestUser` writes through better-auth's test helpers, rereads the row through
Prisma for full types, and returns `{ ...user, headers, login }`. `seedIdea`
inserts domain rows. Between tests, truncate everything:

```ts
import { cleanDb } from '@/modules/seed/utils'
beforeEach(async () => {
  await cleanDb() // TRUNCATE every public table except _prisma_migrations
})
```

`cleanDb` is guarded by `throwIfNotSafeToDestroyDb`: it refuses unless `NODE_ENV
!== 'production'`, `HOST_ENV === 'local'`, and `DATABASE_URL` contains `localhost`
— so a test run can never wipe a staging database. Migrate the test DB before
running int or e2e:

```sh
cross-env NODE_ENV=test prisma migrate dev # start0: bun run prisma:migrate:test
```

## dom — components without a browser

dom tests render React with happy-dom and Testing Library — fast, no browser. The
setup has one sharp edge worth copying verbatim:

```ts
// src/test/setup/dom.ts
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { afterEach } from 'bun:test'

if (!GlobalRegistrator.isRegistered) {
  GlobalRegistrator.register()
}

// NO static import of @testing-library/*. Those packages are CommonJS — they
// capture document.body at module-load time — and static imports get hoisted
// ahead of any function body, so we keep them behind a dynamic import() that
// fires only AFTER GlobalRegistrator.register() has run.
const rtl = await import('@testing-library/react')
afterEach(() => rtl.cleanup())
```

<!-- TODO(med): add a real dom component-test body snippet (only the setup is
shown). e.g. render a component point, assert with Testing Library queries. -->

## e2e — the real app in a browser (Playwright)

e2e drives the **running app** through a real browser. Playwright is used as a
library (`playwright` + `playwright/test`'s `expect`); Bun is still the runner.
A new browser context per test keeps sessions isolated:

```ts
import { routes } from '@/generated/point0/routes'
import { afterAll, afterEach, beforeAll, beforeEach, describe, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright'
import { expect } from 'playwright/test'

let browser: Browser
let page: Page

beforeAll(async () => { browser = await chromium.launch() })
// browser.newPage() opens its own context, so every test starts clean
beforeEach(async () => { page = await browser.newPage() })
afterEach(async () => { await page.close() })
afterAll(async () => { void browser.close() })

describe('smoke e2e', () => {
  test('home page available', async () => {
    await page.goto(routes.home.abs())        // navigate via generated routes, not hand-written URLs
    await expect(page.locator('body')).toContainText('Welcome')
  })
})
```

**Navigate via generated [`routes`](generator), never literal URLs.**
`routes.home.abs()` is the absolute URL (origin from the engine's client URL);
`routes.signOut()` is the path only — both come from `@/generated/point0/routes`,
so `bun run generate` (or `setup`) must have run first or the import is empty.

**The app runs in a separate process, so the browser is the only way in** — you
cannot reach its DB or engine from the test. Set up state by driving the UI:

```ts
// a shared flow helper — sign a fresh user up through the real form
export const signUpViaUi = async (page: Page, { prefix }: { prefix: string }) => {
  const email = `${prefix}-${Date.now()}@example.com` // unique per call
  await page.goto(routes.signUp.abs())
  const form = page.locator('#sign-up-email-form')
  await form.locator('[name="email"]').fill(email)
  await form.locator('[name="password"]').fill('12345678')
  // ...
  await form.locator('button[type="submit"]').click()
  await expect(page.locator(`a[href="${routes.signOut()}"]`)).toBeVisible() // wait for the session
  return { email }
}
```

For a second, unauthenticated visitor inside one test, open another page from the
same browser in a `try/finally`:

```ts
const anonymous = await browser.newPage()
try {
  await anonymous.goto(routes.ideaList.abs())
  await anonymous.getByRole('link', { name: title }).click()
  await expect(anonymous.getByRole('link', { name: 'Edit idea' })).toHaveCount(0)
} finally {
  await anonymous.close()
}
```

> **GOTCHA:** prefer `page.goto(route)` over clicking a header link when a toast or
> overlay may sit over it — an overlapping success toast can swallow the click.

### Three ways to get a server

e2e needs a running app; the setup chooses how it starts, by env flag:

```sh
bun run test:e2e:dev     # start the app in dev mode, no build — fast, the default locally
bun run test:e2e:build   # build first, then run the built server — closest to prod (what `bun run test` uses)
bun run test:e2e:no-run  # don't start anything; connect to a server you already run
```

For the fastest iteration, run the server yourself once and reuse it across runs:

```sh
bun run dev:test       # NODE_ENV=test dev server, in one shell
bun run test:e2e:no-run # tests connect to it, in another — no per-run boot
```

Each script is the same Bun e2e run with a different flag the e2e setup reads:
`E2E_TESTS_BUILD=true` builds then runs `dist/server/index.server.js`;
`E2E_TESTS_NO_RUN=true` skips launching; the default runs `point0 dev`. (There is
**no `point0 serve`/`start` command** — the built server is run by executing
`dist/server/index.server.js` directly. See [build](build) and [deploy](deploy).)

### What the e2e setup does

`src/test/setup/e2e.ts` boots the app and gates the tests on health. The shape
worth copying:

```ts
import { killPort } from '@point0/engine/port'

// 1. free the ports first (a public engine helper)
await killPort([Number(process.env.CLIENT_PORT), Number(process.env.SERVER_PORT)])

// 2. spawn the app as a child process (point0 dev, or the built server, or nothing)
const mainProcess = Bun.spawn(runCommand, { stdout: 'inherit', stderr: 'inherit', env: { ...process.env, NODE_ENV: 'test' } })

// 3. kill it when this process exits — afterAll + plain signal listeners, so an
//    interrupted run never orphans the app (signal-exit doesn't hold under Bun)
afterAll(() => mainProcess.kill())
process.on('exit', () => mainProcess.kill())
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.once(signal, () => { mainProcess.kill(); process.exit(1) })
}

// 4. wait until the app is actually serving before any test runs
await waitForApiToBeHealthy()
await waitForClientToBeHealthy()
```

The health gate is a small pattern: add a plain health [action](action) and poll
it until the app answers.

```ts
// expose a health endpoint…
export const apiHealthAction = root.lets
  .action('GET', '/api/health')
  .action(async () => new Response('OK', { status: 200 }))

// …and poll it (and the client HTML) before running tests
const isApiHealthy = async () => (await fetch(serverEnv.SERVER_URL + apiHealthAction.route.get())).ok
```

## Reference

### Test-time engine API

| Call | Returns | Use for |
| --- | --- | --- |
| `engine.prepare()` | `Promise<void>` | ready the engine once before any in-process fetch (no port, no DB) |
| `engine.withFetch(cb)` | `cb`'s return | wrap in-process point fetches so loaders run against this engine |
| `point.fetchServer(input, fetchOptions?)` | the loader's typed output | run one point's server loader; **throws** on error / redirect |
| `point.fetchServerDetailed(input, fetchOptions?)` | `{ output } \| { error } \| { redirect }` | same, but assert on `error` / `redirect` instead of throwing |
| `engine.fetch(request, init?)` | `Promise<Response>` | drive a raw HTTP request through the pipeline in-process |
| `engine.fetchDetailed(request, init?)` | detailed result | as above, plus matched point / scope / raw error |
| `killPort(ports)` | `Promise<void>` | free ports before spawning the app (`@point0/engine/port`) |

`fetchOptions` is `RequestInit & { transform?: boolean }`. Both `fetchServer*`
also take a third `{ outputType? }` option (`'data'` by default; other values
shape the result for SSR) — not needed for ordinary tests.

### Test kinds and scripts

| Kind | Suffix | Setup spins up | Default run |
| --- | --- | --- | --- |
| unit | `*.unit.test.ts` | nothing | `bun run test:unit` |
| dom | `*.dom.test.tsx` | happy-dom + Testing Library | `bun run test:dom` |
| int | `*.int.test.ts` | engine (`prepare`) + Prisma, no server | `bun run test:int` |
| e2e | `*.e2e.test.ts` | real server + Playwright browser | `bun run test:e2e:dev` |

<!-- TODO(low): document the Playwright `playwright install` browser-binary step
once confirmed (whether it's needed and where it belongs in setup). -->
<!-- TODO(low): bunfig [test] preload vs per-script --preload — start0 uses
per-script flags; decide which to recommend. -->

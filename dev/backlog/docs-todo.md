# Docs TODOs — sorted by priority

Auto-extracted from the `<!-- TODO(high|med|low): … -->` markers across `docs/`
on 2026-06-25 (regenerated after the big triage pass — see "Resolved in the
2026-06-25 pass" below). Identical TODOs are merged; the bolded slugs are the
pages that carry them. Priority: **high** = a wrong/missing API or a real
code/compiler gap a reader needs · **med** = a worthwhile gap · **low** =
nice-to-have / unverified-but-plausible detail.

The five remaining markers are genuine **product decisions or external-doc
links** — kept in the docs because someone has to make the call. **Test-coverage
gaps moved to [add-tests.md](add-tests.md)**; the docs no longer carry "not
tested" hedges. To regenerate this file, run the `perl` extractor in
[dev/docs/docs.md](../docs/docs.md).

## HIGH

_None._ All HIGH markers were resolved in the 2026-06-25 pass (see below).

## MED

_None._ The coverage gaps that lived here (assets HMR, the env
negative-whitelist test, the mcp multi-tool walkthrough) moved to
[add-tests.md](add-tests.md) — they need a test or an example, not a doc edit.

## LOW

Five genuine **product decisions or external-doc links** — they stay as markers
until someone makes the call. (Test-coverage gaps are in
[add-tests.md](add-tests.md), not here.)

- **ssr** — Point0 waits for the full tree (`stream.allReady`) before shipping
  HTML — no progressive / Suspense-boundary streaming, no RSC. Document the
  non-streaming model once it's confirmed as an intentional, stable guarantee.
- **points** — "everything is a point" covers every building block you author
  with `.lets`, but Point0 also has non-point primitives (env, error,
  navigation, eventer, super-store) — decide whether to scope the claim to the
  authored surface.
- **getting-started** — `--no-orphans` needs Bun >= 1.3.14, but the generated
  app declares no `engines` floor. Decide whether to add an `engines`
  requirement and a minimum Bun version.
- **getting-started** — only `bun create point0-app` is documented; decide
  whether to support / list `npx` / `pnpm dlx` / `yarn create` alternatives (all
  require Bun anyway).
- **example-better-auth** — the exact endpoints under `/api/auth/*` live inside
  Better Auth, not this repo — link the Better Auth docs for the full list.

## Resolved in the 2026-06-25 pass

The full HIGH set and the large majority of MED/LOW were closed. Doc-only
resolutions (verified each claim against code/tests and corrected the prose) are
not listed here; the **code/compiler/type fixes** that landed alongside the doc
updates are:

- **compiler** — `.models` is now stripped from the client bundle (server-only);
  `point.ts` `shakeMethodsForClient` + `shakeMethodsForAnotherScope`.
- **compiler** — `.onPrefetchPage` is no longer stripped from the server bundle:
  it is now **server-and-client** and runs during server-side prefetch (the
  runtime already invoked it; the compiler was neutering it). `point.ts`
  `shakeMethodsForServer`.
- **core (request0.ts)** — `from.ip` is now **always** Bun's unspoofable
  `requestIP` (or `null`), never a header value; spoofable header candidates
  live only in `from.ips`.
- **openapi (utils.ts)** — `hideTransformHeader` now actually suppresses
  `X-Point0-Transform` (it was never forwarded into `getOpenapiSchemaFromPoint`
  and leaked into the document).
- **core (point0.ts) + openapi** — the already-normalized
  `.response({ 200: {…}, 404: {…} })` form now emits every status (was returning
  only the first); `NormalizedResponseSchema.content` is now
  `Partial<Record<…>>` so a single content type is valid.
- **core (cookie-store.ts)** — a numeric cookie `expires` is now **epoch
  milliseconds** on the client document setter too, matching the server
  serializer (was days-from-now).
- **core (point0.ts)** — the `pageDehydratedState` prefetch path now emits
  `pointPrefetchPageSettled` before `pointPrefetchPageSuccess`, matching every
  other path.
- **engine (cli.ts)** — `point0 --version` now prints the installed
  `@point0/engine` version (was a hardcoded `0.1.0`).
- **engine (engine.ts)** — removed the dead `restart?: boolean` from the `dev()`
  options type.
- **basic-auth (package.json)** — removed the stale `safe-stable-stringify` peer
  dependency (never imported).
- **examples** — capacitor scaffold leftovers cleaned (`ionic.config.json` name,
  stray `<h1>`, dead `navigation.ts` comments, unused `SOURCE_BASE_URL`); expo
  Babel `scope` corrected `'site'` → `'root'` and its README de-staled.

### Flagged, deliberately NOT changed (need a decision)

- **error.ts `serializePublic`** — the action TODO asked to drop `name` from the
  public (production) error projection. Left as-is: `error.test.ts` deliberately
  codifies `name` in the public projection ("carries identity"), which
  contradicts the TODO's hedged intent. The docs now document the real
  `{ name, message, code }` shape. **Your call** whether to remove `name`.
- **server.ts (~747)** — a stale code comment says the dev server child "runs
  under `bun --watch`", but the shipped code spawns plain `bun run` and recovers
  via the orchestrator's respawn branch. Not rewritten (it sits in the sensitive
  dev-lifecycle path and an accurate rewrite needs tracing the current
  keep-alive/respawn model) — flagged for a focused follow-up.

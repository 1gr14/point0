# Vite client build: server-only method args leaked by transform order

**Status:** root-caused, fixed · **Area:** compiler (walker point registry) ·
**Kind:** resolved regression

Held the 0.2.1 release: `build.e2e.test.ts` ›
`build › vite › prune client and server` failed its CORS assertion
(`Access-Control-Allow-Origin` found in the client bundle) on ~50% of production
builds — a real assertion diff, not a flake by the
[ci-flakes.md](./ci-flakes.md) definition, and sticky across all 4 retries
within a bad CI run.

## The symptom

On a vite production build, the client bundle intermittently contained the whole
`@point0/cors` module: the emitted `root.tsx` still had `.middleware(cors())`
with its argument intact, so rolldown kept the import. The rest of the client
shake (env guards, other files' server-only markers) was correct in the same
build — the miss was localized to the one file whose point was resolved as a
_parent_ before its own transform ran. Bun builds were consistently green
(deterministic module visit order), and dev was immune (`compile()` defaults
`pruneWalker = !built`, so the dev walker resets between compiles).

## Root cause

`Walker.collectPointByLetsNodePath` cached points in `walker.points` keyed by
`strpos` (`file:line:column`) and reused a hit unconditionally. Two parses of
the same source can coexist in one build:

1. Rolldown transforms modules in nondeterministic order. When `page.tsx` was
   compiled **before** `root.tsx`, resolving the page's parent chain read
   `root.tsx` **from disk** (`findBaseLetsNodePathByBaseNodePath` →
   `CompilerFile.readSync`) and registered the root point bound to that disk
   AST.
2. When vite's `transform` later delivered `root.tsx`'s content, the compiler
   parsed a **fresh AST** — but the strpos lookup returned the registered point
   bound to the _old_ one. `shakeMethodsForClient` stripped `.middleware(...)`
   args on the stale AST while `toCode()` serialized the fresh, unshaken AST.
   Server-only args shipped to the client.

Order is a coin flip per build (~50%); within one build every retry of the
assertion reads the same poisoned output, hence the stickiness.

## The fix

`packages/compiler/src/walker.ts`: reuse the registered point **only when it is
bound to the exact AST being collected** (same `CompilerFile` instance and same
lets `NodePath`); on any binding mismatch, register the fresh point instead.
strpos-keyed consumers (parent resolution, cycle detection) are unaffected —
they just see the newest binding. Regression test:
`packages/compiler/tests/compiler.unit.test.ts` › "shakes a point registered
earlier from a disk parse…" (fails on the pre-fix walker, passes after).

Verified: 30/30 clean isolated vite builds locally (pre-fix: leaked on run 1),
plus `test-one.yml` runs of `build.e2e.test.ts` on ubuntu (repeat) and windows.

## Watch out for

- The `cors()` "server-only by construction" JSDoc guarantee depends on this
  shake being deterministic — any future point-registry caching must preserve
  the binding check.
- The compiler's disk transform cache keys by `(settings, path, mtime)` and
  writes non-atomically (`writeCache`); it can persist a bad result for as long
  as the source mtime is stable. Not the trigger here, but worth remembering
  when a "sticky" wrong output survives rebuilds.

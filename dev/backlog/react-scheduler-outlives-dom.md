# React scheduled work outlives the test's DOM, and Bun 1.4 counts it

**Status:** open · **Area:** test-infra (int lane, Linux) · **Kind:** teardown
leak

Seen twice on ubuntu right after the Bun 1.4 bump, in two different files, with
one signature: react-dom's scheduler callback runs **after** the test's DOM is
gone and dereferences `window`.

```
# Unhandled error between tests
17920 |   schedulerEvent = window.event;
TypeError: undefined is not an object (evaluating 'window.event')
  at react-dom-client.development.js:17920
  at performWorkUntilDeadline (scheduler.development.js:45)
```

- **run 32402353586, `int-2`** —
  `engine/tests/subscription-lifecycle.int.test.tsx`: `3 pass, 0 fail, 1 error`.
  Every assertion passed; the file went red purely on the unhandled error, and
  took the job with it.
- **run 32399811362, `int-3`** —
  `engine/tests/subscription-tracked.int.test.tsx`: the same `window.event`
  error, plus three tests failing with
  `Cannot access serverOnlyGlobal item "__POINT0_SERVER_LOGGER__" from client` —
  the store resolving a client variant in what should be a server context.

Neither reproduces on macOS: both files pass in isolation, and the whole `int-3`
group passes locally (19 files, ~95 s).

## Why it is worth a card, not a rerun

`0 fail, 1 error` is the tell. The product code under test is fine — what fails
is the boundary: React keeps a scheduler task queued past the end of the test,
the harness tears down the happy-dom globals, and the task then lands in a world
with no `window`. Bun 1.4 shifted the timing enough to make the overlap common;
the shape has nothing to do with load, so a green rerun is luck, not evidence.

Both symptoms are the same boundary, crossed in opposite directions — and the
boundary is the fake client's **async context**, not the DOM globals.

`GlobalThisItemProxy` (engine/src/fake-client.ts) does not assign
`globalThis.window`; it installs a **getter** that asks
`superstore.getFakeClient()` — i.e. `AsyncLocalStorage.getStore()` — who is
asking, and answers `originalValue` (`undefined` for `window` under Bun) to
anyone outside a fake-client context. So:

- **Context missing when it should be there** — React's scheduler task runs on a
  chain the ALS store doesn't reach, `window` resolves to `undefined`, and
  `window.event` throws. This is the `int-2` failure.
- **Context present when it should not be** — `subscription-tracked` builds its
  engine through a plain `Engine.create()` at test level, outside any
  `fakeClient.run()`. If a previous test's context is still on the chain,
  `getFakeClient()` answers, `superstore` resolves `variant: 'fakeClient'`
  instead of `'server'`, and the `serverOnlyGlobal` write throws. This is the
  `int-3` failure.

Note that `variant` is decided in `super-store.ts` from `POINT0_SIDE`, the ALS
store and the fake client — **not** from `window`. An earlier draft of this card
blamed the DOM global for the variant confusion; that was wrong.

## What is fixed, and what is not

**The int-2 half is fixed** (`FakeClient.destroy`): teardown now drains the
macrotask queue inside the client's context, before the `finally` drops the
client's values, so React's late unmount work still resolves `window`.

**The int-3 half is not.** How a fake-client context outlives its `run()` and
greets the next test's `Engine.create()` is still unexplained, and nothing here
addresses it.

Neither half reproduces in isolation: `test-one.yml` ran each file ×10 on ubuntu
green (runs 32458036398, 32458045167). It needs the fast lane's real load —
dozens of files in parallel on one runner — so verification means pushing a
branch with `--run-tests=linux`, not a point run.

## Related

- [ci-flakes](./ci-flakes.md) — the rule this follows: an unhandled error with
  clean assertions is not the loaded-runner flake profile.
- [playwright-dom-queue-race](./playwright-dom-queue-race.md) — the other
  harness race the 1.4 bump surfaced, on Windows, unrelated in mechanism.

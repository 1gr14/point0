# Bun-on-Windows: green test file's process won't exit

**Status:** root-caused, workaround landed · **Area:** test infra / Bun upstream
· **Kind:** tracked workaround

> **Root cause found (2026-07-09, Mac↔Windows bridge session).** Not an idle
> hang — a **busy-spin**: one JS thread pinned at 100%, event loop never
> empties. Bisected to exactly one test (`rsc.unit.test.tsx` "a hole that misses
> its deadline fails with RSC_HOLE_TIMEOUT") and proven by toggling one line: on
> bun 1.3.14/Windows, **the `.unref()` on the hole-deadline timer** — in this
> exact context (async subtree through normalize + settle, inside the superstore
> ALS, late-released gate) — spins the loop forever after the timer fires. A
> bare `setTimeout().unref()` does NOT reproduce (the full context is required),
> and skipping the post-fire `clearTimeout` (the first workaround attempt) does
> NOT help. Fix landed in `packages/core/src/rsc.ts`: **drop the `.unref()`**,
> keep the settle-time `clearTimeout` — verified 5/5 clean exits on a real
> Windows machine (61 pass, EXITCODE=0 each run). Trade-off: an exit with a
> genuinely un-settled hole now waits at most `holeTimeoutMs` for the deadline
> to fire. The runner's pass-with-warning policy below stays as the safety net
> for any OTHER non-exit. Remaining: minimize a standalone repro → bun issue.

## The symptom

`bun test packages/core/tests/rsc.unit.test.tsx` on **Windows**: every test
passes (61 pass, 0 fail, full summary printed), then the `bun` process never
exits. Locally on macOS the same file finishes in ~300 ms and exits clean.
Windows-only, load-sensitive (bites on CI runners far more than on a desktop).

## What was ruled out (v0.2.0 release debugging, 2026-07-09)

- **Not slowness** — every assertion completes; only the exit hangs.
- **Not a leaked stream/timer in the tests** — the stream tests all drain
  (`await done`, `controller.close()`), the hole-deadline timers are `.unref()`d
  and cleared. Isolating the file on its own runner didn't help, so it's not
  cross-file contention either.
- The hanging stack showed `node:async_hooks` (`runWithServerStorageState` =
  AsyncLocalStorage) → points at a **Bun-on-Windows teardown quirk**
  (AsyncLocalStorage / streams / dynamic import), not a fixable test leak.

## The policy (how the suite stays green without losing coverage)

`scripts/test.ts` detects the exact signature — wall-clock timeout hit AND the
output carries a full green summary (`N pass` / `0 fail`, no `(fail)`) — kills
the process tree, and counts the file as a **pass with a loud warning** (`⚠` in
the breadcrumbs + a Warnings section in the log). Assertions ran green; the
non-exit is this card, not a test failure. A file that times out _without_ a
green summary still fails and retries as before, so real hangs keep failing.

## Next

- Root-cause on a real Windows machine (bridge session with the Windows agent):
  minimize the repro — which describe/test leaves the handle behind, does
  `AsyncLocalStorage.disable()` / avoiding `run()` at module scope fix it, does
  it reproduce on newer Bun.
- If it minimizes cleanly → file a Bun issue with the repro.
- When a Bun release fixes it: the `⚠` warnings simply stop appearing — nothing
  to un-quarantine (the suite never skipped anything).

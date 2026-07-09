# CI flakes — the v0.2.0 cluster and where each fix lives

**Status:** resolved-by-rework (watch the next release runs) · **Area:** CI /
test-infra reliability · **Kind:** triage map

The v0.2.0 release run
([29014747793](https://github.com/1gr14/point0/actions/runs/29014747793)) went
red on a cluster of three flakes — all timeouts/resets, zero assertion diffs —
and blocked the publish. A five-round quarantine chase on the (unmerged, now
archived) `ci-flakes` branch ended in skipping whole suites, which was the wrong
trade; the `ci-rework` branch replaced it with the suffix-driven test plan
(`scripts/test.ts`, see [ci.md](../docs/ci.md)) plus targeted fixes. This card
maps each flake to its real fix, for the next triage.

## The three flakes → where each fix lives

1. **`core/tests/rsc.unit.test.tsx` — Windows: all green, process won't exit**
   (10-min timeout red). → `scripts/test.ts` detects the exact signature (green
   summary + no exit), kills the tree, counts a **pass with a loud `⚠`**.
   Root-cause hunt: [test-non-exit.md](./test-non-exit.md).
2. **`dev-bundler.e2e.test.ts` — vite HMR pair red on both OSes.** Root cause
   found on ci-rework: NOT load — since the ssr-batch the vite Fast Refresh
   remount is **deterministic** (a page edit resets the page's state, so the
   state-continuation waits `Hay 1`/`Hay 11` can never appear on vite). → both
   tests fork on vite right after the first edit: the client test asserts
   propagation only, the server test asserts the server half on a FRESH page
   (state 0 + one click ⇒ the edited `inc: 10`). Load-hardening landed too:
   `waitStarted` 90s on vite (cold deps optimizer), 15s `waitContent` ceilings,
   retry on a fresh project for both. Cards:
   [vite-fast-refresh-point-state-loss.md](./vite-fast-refresh-point-state-loss.md)
   (the REAL vite FR remount issue — architectural, still open),
   [vite-dev-tests-order-dependent-flakes.md](./vite-dev-tests-order-dependent-flakes.md).
3. **`rsc.slow.test.tsx` — ubuntu browser e2e, rotating causes** (chromium
   launch pipe-termination, vite dev startup, cold prod serve). → the file
   carried FOUR browser launches; it's now four `rsc-*.e2e.test.tsx` files (one
   launch per solo runner, no cross-describe cascade), `chromium.launch` retries
   3× with a 40s per-attempt timeout (`tests/utils/playwright.ts`), and the
   build files boot + warm the prod server in `beforeAll` (`warmProdServe` polls
   `/rsc` with bounded attempts) — off the per-test budget.

## What the failed chase taught (don't repeat it)

- Each matrix job is its OWN 4-vCPU/16 GB VM — memory is never shared between
  legs, and the account cap (20 concurrent jobs) just queues extras. So
  cross-job `max-parallel` caps don't fix in-job starvation; **reduce the load
  INSIDE a runner** (fewer browser launches per file, boots out of test budgets,
  bounded infra retries) instead.
- Green-by-quarantine ≠ healthy: skipping `rsc.slow` on Linux traded away
  browser coverage on the deploy OS for a badge. The full log of that chase
  (five rounds, run links, evidence) lives on the archived `ci-flakes` branch in
  this same file path.
- A flake here means: assertions pass (or it's a timeout/reset — never an
  `expected X got Y` diff), it doesn't reproduce locally in isolation, and it
  clusters on loaded runners. Real regressions don't belong on this card.

## Triage tools

- `gh workflow run test-one.yml --ref <branch> -f file=<path> -f os=<os> -f repeat=5`
  — reproduce one leg on a real runner without the full matrix.
- `--run-tests[=os]` in a branch commit message — full matrix on demand.
- The runner's breadcrumbs: a `▶` with no `✓`/`✗` names the hung file; the `⚠`
  warnings section lists green-but-won't-exit files.

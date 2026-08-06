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

## The v0.3.6 pair — both were real, neither was load

The 0.3.6 release run went red four times on two different files, and both
turned out to be a product/harness hole rather than a loaded runner. Worth
reading before blaming the next red on load.

1. **`socket-browser.e2e` on ubuntu — a teardown that could hang forever.**
   Every assertion passed; the file died three minutes later in `afterAll`.
   Fixed by bounding each teardown step (`teardownStep`) and closing the browser
   before killing the dev servers. Full card:
   [socket-linux-ci.md](./socket-linux-ci.md).
2. **`dev-entries.int` on windows — dev announced itself before it was
   watching.** The test edits a file ~1.5 s after dev starts and waits for the
   entry to re-run; on the runner the edit produced no event at all, and the
   dumped dev output ended at `Server started` with 30 s of silence after it.
   Root cause: `Server.dev` spawned the children first and subscribed the
   watchers after — an import-graph walk per entry plus a native recursive
   subscribe — so a save in that window was lost with no event and no error (a
   user-facing bug, not just a test one). Children now spawn only after every
   watcher is live.

## Two known flakes left standing (2026-08-06), and why

Both are understood, neither is fixed. Written down so the next red run is
recognised instead of re-investigated.

1. **`bun install` dies on Windows runners, intermittently.** The `bun` npm
   package is in our tree ONLY as an auto-installed peer of
   `bun-plugin-tailwind` (examples basic / better-auth / socket + the create-app
   template). Nothing imports it. Its postinstall provisions a ~98 MB native Bun
   binary onto a machine already running Bun: it requires the platform optional
   dep `@oven/bun-<platform>` and, when that misses, fetches it from the
   registry live — and that fetch is what fails. The install action already
   retries 3×; on 0.3.6's run the retries did not save it, and the failure
   surfaces as `error: postinstall script from "bun" exited with 1` followed by
   `bin executable does not exist on disk` (the package manager failing to link
   the bins the `bun` package declares — not our `point0` bin; that one bun
   fails silently). **Tried and rejected:** patching the plugin's manifest to
   mark the peer `optional` — proven not to work, twice: peers are resolved from
   the registry manifest, and a patch only ever reaches the extracted files
   (verified in a 3-package scratch project: `bun` installs anyway).
   `[install] peer = false` does remove it, but it is global — 8 peers are
   auto-installed here and 7 of them are wanted (`@testing-library/dom` holds
   the dom tests; `expo-linking`, `react-native-gesture-handler`,
   `react-native-reanimated`, `react-native-worklets`,
   `@react-native/metro-config` hold the expo example; plus a nested
   `cosmiconfig`). Declaring those by hand is the hack we refused. **Left to
   try:** upstream (`tailwindlabs/tailwindcss`, `packages/@tailwindcss-bun` —
   the runtime should not be a required npm peer), or dropping
   `bun-plugin-tailwind` from the examples entirely. Bun is pinned in CI now, so
   at least the behaviour no longer changes under us.
2. **`packages/docs/tests/search.unit.test.ts` times out on Windows** (30 s).
   The test embeds a query, so it needs the ~23 MB Hugging Face model — and only
   `build.yml` caches it; the test jobs download it every run and always have
   (this predates `env.cacheDir` being pinned; `node_modules` is not cached
   either, so the old in-`node_modules` location was just as cold). A 23 MB
   download inside a 30 s test budget is the same shape of mistake as a wait
   budget equal to the delay. Fix when it next bites: give the test jobs the
   same cache step `build.yml` has, and a ceiling that is not a stopwatch.

## Triage tools

- `gh workflow run test-one.yml --ref <branch> -f file=<path> -f os=<os> -f repeat=5`
  — reproduce one leg on a real runner without the full matrix.
- `--run-tests[=os]` in a branch commit message — full matrix on demand.
- The runner's breadcrumbs: a `▶` with no `✓`/`✗` names the hung file; the `⚠`
  warnings section lists green-but-won't-exit files.

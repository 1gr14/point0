# Coverage — raising it, and measuring what e2e already covers

The machinery landed (see [dev/docs/coverage.md](../docs/coverage.md)):
`bun run cov` merges per-file lcov shards and ranks what to test next. Two
things are left open, and the second matters more than the first.

## 1. The number understates the truth, by construction

Only code executed inside the `bun test` process is instrumented. Everything the
`.e2e` suite drives lives outside it:

- the **CLI**, the **dev server** and the **production build pipeline** run in a
  spawned `point0` child process;
- all **browser-side** hydration, navigation and island code runs in Chromium.

Both are exercised hard — they're just never line-counted. So `coverage.md`'s
"never executed in-process" section holds a pile of files that are, in fact,
tested. Chasing that section with unit tests would move the percentage while
making the suite worse.

Which is exactly why the repo-wide percentage is the wrong thing to publish or
optimise. Fix the measurement before reacting to it.

## 2. Count what e2e covers — browser side first

**Feasible today.** Playwright exposes V8 coverage on Chromium:
`page.coverage.startJSCoverage({ resetOnNavigation: false })` →
`stopJSCoverage()` returns, per script, `{ url, source?, functions[] }` with V8
byte ranges. `v8-to-istanbul` maps those ranges back through the bundle's
sourcemap to the original files, and Istanbul JSON converts to lcov — which
`scripts/coverage.ts` already knows how to merge.

That would light up `@point0/core`'s client half and all of `@point0/react-dom`,
which today only `unit`/`int` tests reach.

Sketch:

- wrap the browser helper
  ([`packages/engine/tests/utils/playwright.ts`](../../packages/engine/tests/utils/playwright.ts))
  so JS coverage starts with the page and stops on teardown, gated behind the
  same `--coverage` flag `scripts/test.ts` already threads through;
- write each page's entries to `coverage/raw/<slug>/` as lcov, so the merge
  picks them up with no changes;
- map `/_point0/assets/*.js` back to `packages/*/src` via the emitted sourcemap.

Two things to check before committing to it:

- **Sourcemaps must exist in the mode under test.** Dev has them
  ([dev/docs/source-maps.md](../docs/source-maps.md)); confirm the production
  `build` e2e tests emit them too, or the `build.e2e` legs contribute nothing.
- **`resetOnNavigation: false` is best-effort** — Playwright says so outright. A
  navigation-heavy test may drop coverage between pages; collect per-page and
  merge rather than relying on one span.

Chromium-only, but so is the whole e2e lane.

## 3. Count what e2e covers — server side

**Not possible today.** Bun's `--coverage` exists only on `bun test`; a spawned
`bun run dev` / `point0 build` cannot be instrumented, and Bun is JSC, so Node's
`NODE_V8_COVERAGE` doesn't apply either.

Options, in order of value:

- **Track it upstream.** Watch for runtime coverage in Bun (`bun run --coverage`
  or an equivalent). Add to the watchlist; it would close this hole outright.
- **Move behaviour in-process where it belongs.** `internal-testing.tsx` already
  imports `Engine` from source and boots it in the test process — several
  behaviours currently proven by spawning a real server could be `.int` tests
  instead, which both instruments them and makes them faster. Do this where it
  genuinely tests the same thing, never to move a number.
- **Leave the rest declared.** The CLI's argument parsing, the dev server's
  watch loop, the build orchestration: covered behaviourally, and honestly
  labelled as such in the report.

## 4. Then raise the number

Once (2) lands, re-read `coverage/coverage.md`'s ranking — files ordered by
absolute uncovered lines, not by percentage. The concrete gaps already known
from writing the docs live in [add-tests.md](add-tests.md); start there, because
those are behaviours we _know_ are unpinned rather than lines that merely never
ran.

Only after the picture is honest is it worth deciding whether to publish the
number (Codecov project page, README badge) at all. Publishing a
structurally-understated percentage would misinform readers about a suite that
is in fact heavy on integration and e2e.

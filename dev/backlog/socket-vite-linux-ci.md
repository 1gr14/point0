# socket-browser vite variant wedges on GitHub ubuntu runners

`packages/engine/tests/socket-browser.e2e.test.tsx` — the
`socket browser (vite)` describe is currently skipped when `CI && linux` (see
the comment at the `run('vite', …)` call). Remove the gate once the cause is
found.

## The evidence (v0.3.1 release run 30643016181, attempts 1 and 3)

- Twice out of two real executions on `ubuntu-latest` the vite variant wedged
  the same way: `cold start` and `useMembership` pass, then
  `suspense socket query` hangs for its full 180 s, and every later vite test
  (and even the afterEach hook) starves at 180 s each. The dev server prints
  nothing at the wedge — the first hanging await is the test's
  `tp.fetchServerHtml(…)` / `gotoServer(…)` stretch, i.e. an SSR request that
  never answers.
- The same file in the same runs: `socket browser (bun)` and `(bun-hot)` all
  green on the same runner, and the whole file green on `windows-latest`.
- Unreproducible locally: green on macOS, green on Linux (bun 1.3.14 container
  over the repo, chromium headless shell), green even through the exact CI path
  — `CI=1 bun scripts/test.ts --file …` with the container throttled to 2 CPUs
  (GH runners have 4). 19 pass / 0 fail in 2 min.

## Leads for the next attempt

- The container was debian (oven/bun image); GH runners are ubuntu-noble — a
  distro-userland repro (`ubuntu:24.04` + bun) was not tried.
- Bound `fetchServerHtml` / `gotoServer` with their own short timeouts so a CI
  recurrence names the exact hanging stage instead of burning the 180 s test
  timeout four times.
- Suspect surface: the vite dev server's proxy path for an SSR page request
  racing the already-open WebSocket upgrade of the previous test (the suite
  already knows the vite proxy "does not carry two simultaneous upgrade sockets"
  — that is why `multiTab` is bun-only).
- `LIVE_TEST_OUTPUT=1` on a `workflow_dispatch` run would stream the dev
  server's own log at the wedge instead of the buffered silence.

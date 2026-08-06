# socket-browser wedges on GitHub ubuntu runners

`packages/engine/tests/socket-browser.e2e.test.tsx` starves on `ubuntu-latest`
and nowhere else — not on `windows-latest`, not on macOS, not on Linux in a
container. It has appeared in two shapes.

## Shape 1 — the vite variant (v0.3.1 release run 30643016181, attempts 1 and 3)

The `socket browser (vite)` describe is skipped when `CI && linux` (see the
comment at the `run('vite', …)` call). Remove the gate once the cause is found.

- Twice out of two real executions on `ubuntu-latest` the vite variant wedged
  the same way: `cold start` and `useMembership` pass, then
  `suspense socket query` hangs for its full 180 s, and every later vite test
  (and even the afterEach hook) starves at 180 s each. The dev server prints
  nothing at the wedge — the first hanging await is the test's
  `tp.fetchServerHtml(…)` / `gotoServer(…)` stretch.
- The same file in the same runs: `socket browser (bun)` and `(bun-hot)` all
  green on the same runner, and the whole file green on `windows-latest`.
- Unreproducible locally: green on macOS, green on Linux (bun 1.3.14 container
  over the repo, chromium headless shell), green even through the exact CI path
  — `CI=1 bun scripts/test.ts --file …` with the container throttled to 2 CPUs
  (GH runners have 4). 19 pass / 0 fail in 2 min.

## Shape 2 — the bun-hot teardown (v0.3.6 release run 31041772883, three attempts)

The release run for 0.3.6 went red three times in a row, always in `bun-hot`,
always after **every assertion in the file had passed**:

| attempt | what starved                                                 |
| ------- | ------------------------------------------------------------ |
| 1       | the file's last `afterAll` — 180 s                           |
| 2       | the last test's `afterEach` (360 s), then `afterAll` (180 s) |
| 3       | the last test itself (180 s), then `afterAll` (180 s)        |

The environment was identical to the green 0.3.5 run: runner image
`20260720.247.2`, bun 1.3.14, chromium `151.0.7922.34`, `--frozen-lockfile`. The
release commit changed only `.md` files and version strings. A `test one`
dispatch of the same file reproduced it (run 31045504037), and its live output
pinned the wedge: the last test passed, then 180 seconds of complete silence
inside `tpf.cleanup({ files, processes, ports, browser })`.

Everything else in that chain was already bounded — `killTree` waits 2 s,
`waitPortFree` 1 s and throws, `nodeFs.rm` retries for 15 s. The two unbounded
awaits were `killPort` and Playwright's `page.close()` / `browser.close()`. That
attempt 2 hung in `afterEach`, which does nothing but close pages, points at
Playwright rather than at the dev server.

## What was done (2026-08-05)

- **`teardownStep(label, step, timeoutMs)`** in `tests/utils/other.ts`: every
  teardown await is bounded, and one that overruns names itself in a warning
  instead of being charged to bun's hook budget. A teardown can no longer fail a
  file whose assertions passed, and it can no longer fail anonymously. Applied
  to both Playwright wrappers (`page.close()`, `browser.close()`,
  `killCdpShell`) and to `killPort` / `killTree` in both project factories.
- **Clients before servers** in both factory `cleanup`s: the browser closes
  first, the dev servers die after. Killing the server under still-open tabs
  left every one of them reconnecting to a dead port, which is the worst moment
  to be closing a page.

## The bound worked, the wedge did not go away (run 31071763090)

The first run after the fix said exactly what it was built to say:

```
[teardown] "page.close()" did not finish within 15000ms — abandoned, it may leak a process
[teardown] "page.close()" did not finish within 15000ms — abandoned, it may leak a process
✗ socket browser (bun-hot) > a channel-wide broadcast reaches every connection regardless of room [46298.22ms]
[teardown] "browser.close()" did not finish within 15000ms — abandoned, it may leak a process
```

So the browser still stops answering on that runner — but it now costs 15 s and
names itself instead of eating a three-minute hook budget in silence, and the
file died in 1m44 rather than 3m+. What the bound cannot do is save a TEST whose
own page calls hang: this time the wedge landed in the test body (46 s) rather
than in teardown, and the file went red on its own merits. Two consecutive runs
before it (0.3.7's release, and the one before) were green on the same file, so
it stays intermittent.

That is the whole state of it: legible and no longer fatal-by-default, root
cause still unknown.

## It is upstream, and it is known (searched 2026-08-06)

Playwright has both halves of this on file:

- **`chrome-headless-shell` sometimes never exits after `Browser.close` over
  CDP** —
  [microsoft/playwright#39753](https://github.com/microsoft/playwright/issues/39753).
  The reporters' own observation matches ours exactly: the timeout "became a lot
  more frequent when running playwright directly on CI workers and not in a
  docker container". GitHub's runners are bare VMs, and our container repro was
  green.
- **Some CDP calls carry no timeout at all** —
  [microsoft/playwright#11776](https://github.com/microsoft/playwright/issues/11776):
  a call "never returns / hangs forever about 30% of the time… a timeout is
  missing there".

So `teardownStep` is not a workaround around our own bug; it supplies the
deadline the library does not. Checked and ruled out on the way: `/dev/shm`
starvation, the usual first suspect for chromium in CI — Playwright already
passes `--disable-dev-shm-usage` among its default switches (verified in the
installed `playwright-core` bundle), and GitHub's runners are VMs with a
normal-sized `/dev/shm` anyway, not 64 MB containers.

What is NOT fixable on our side: a browser that stops answering mid-test. The
in-test waits are already bounded — `waitContent` polls against its own clock
and throws on its budget (that is why the broadcast test died at 46 s instead of
hanging), so the file fails honestly and a rerun passes. Reducing exposure means
reducing what the file asks of one browser, per the lesson on
[ci-flakes.md](./ci-flakes.md): fewer live tabs, fewer launches per runner.

## Still open

Why chromium stops answering on that runner. The bound turns a three-minute
silent starvation into a named warning, so the next occurrence arrives labelled
— `[teardown] "browser.close()" did not finish within 15000ms` — instead of as a
nameless hook timeout. Leads never tried:

- A distro-userland repro (`ubuntu:24.04` + bun); the earlier container attempt
  was debian (oven/bun image).
- Shape 1 was read as "an SSR request that never answers", but `gotoServer` is a
  CDP call. If the browser is what wedges, both shapes are one bug. Bounding
  `fetchServerHtml` (a plain fetch, no browser involved) separately from
  `gotoServer` makes the next occurrence tell them apart.
- `LIVE_TEST_OUTPUT=1` through a `test one` dispatch reproduces the wedge, so
  the runner is reachable for experiments without burning a release run.

# Bun on Windows never drops the slow pub/sub subscriber

`packages/engine/tests/socket-backpressure.int.test.ts` — the fan-out test
(`the pub/sub fan-out: the slow subscriber is disconnected…`) is
`skipIf(win32)`. Remove the skip once the platform gap is understood or fixed
upstream.

## The evidence (v0.3.1 run 30643016181, v0.3.2 run 30649570210)

- Three `windows-latest` executions, three identical failures: the paused raw
  subscriber is never torn down —
  `Timed out waiting for the slow connection to be dropped`. The last run
  flooded in batches up to ~512 MB total (the v0.3.2 batched-flood version), so
  "the flood sat in the kernel buffers" no longer explains it: no sane socket
  buffer absorbs half a gigabyte.
- Linux and macOS drop the subscriber within the first ~26 MB batch, every time
  (CI and local).
- The second test in the file — the engine's own direct-send funnel closing the
  connection on backpressure status — is green on Windows. Only the publish path
  (`closeOnBackpressureLimit`, enforced by Bun/uWS itself) never fires there.

## Read

Everything points at Bun-on-Windows not honoring `closeOnBackpressureLimit` for
`server.publish` fan-out (the libuv/uSockets Windows backend differs from the
POSIX one). Next step: a minimal bare-`Bun.serve` repro (one publisher, one
paused raw socket, tiny `backpressureLimit`, watch for the close) — if it holds,
file it upstream next to the `server.stop()` leak
(dev/backlog/bun-issue-server-stop.md).

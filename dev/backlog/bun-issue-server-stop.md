# Bun issue: `server.stop()` виснет после закрытия вебсокета

**Status:** репро готов и проверен, issue не создан · **Area:** Bun upstream /
engine teardown · **Kind:** готовый баг-репорт для github.com/oven-sh/bun

## Что это и что с этим делать

Готовый баг-репорт в Bun. Скопировать английский текст ниже (от «Title» до
конца) в новый issue на <https://github.com/oven-sh/bun/issues> (шаблон «Bug
report» — секции уже под него). Репро-скрипт самодостаточный, запускается
`bun repro.ts`, проверен на этой машине: Bun 1.3.14, macOS 15.4.1 (arm64), 3
прогона из 3 — оба баг-сценария «HUNG after ~5000 ms», контроль «stopped cleanly
in 0 ms».

Нашли при исследовании backpressure (gotcha «после funnel-close `server.stop()`
не settle» в dev/docs/socket.md), но минимизация показала: backpressure ни при
чём. Течёт **любое** штатное закрытие вебсокета — `server.pendingWebSockets` не
декрементится, и последующий `server.stop()` (и graceful, и `stop(true)`)
никогда не резолвится. Исходный backpressure-сценарий (флуд до дропа →
`ws.close()` на переполненном сокете → стоп виснет; контраст: собственный
teardown uWS при `closeOnBackpressureLimit: true` стопается чисто) тоже
воспроизводится 3/3 — это частный случай того же лика. Движковый воркараунд —
рейс `stop(true)` с таймаутом — уже стоит в
`packages/engine/tests/socket-backpressure.int.test.ts`; раз виснет любое
нормальное закрытие, а не только защитный килл, основной teardown движка стоит
перепроверить на тот же рейс (отдельная задача, не эта карточка).

Дап-чек 2026-07-31: точного дубликата не нашёл. Ближайшие issue — не о том:
[#25722](https://github.com/oven-sh/bun/issues/25722) (feature request про
закрытие коннектов на выходе процесса),
[#14946](https://github.com/oven-sh/bun/issues/14946) (close-колбэк не
вызывается), [#6632](https://github.com/oven-sh/bun/issues/6632)
(переиспользование порта). Перед отправкой можно повторить поиск.

Скрипты лежат в скретчпаде сессии (`bun-stop-repro/`): `repro.ts` — канон,
идентичен инлайну ниже; `repro-backpressure.ts` — исходный флуд-сценарий 2×2;
`cells.ts` / `cross.ts` / `cross2.ts` / `counter.ts` / `variants.ts` — матрица,
которой добивались формулировки из «Additional information». Скретчпад эфемерный
— канонический скрипт живёт в этой карточке.

---

## Title

`server.stop()` never resolves after a WebSocket connection closes normally
(`pendingWebSockets` is never decremented)

## What version of Bun is running?

1.3.14

## What platform is your computer?

Darwin 24.4.0 arm64 (macOS 15.4.1, Apple Silicon). Not tested on other
platforms.

## What steps can reproduce the bug?

Open a WebSocket connection to a `Bun.serve` server, close it normally — server
`ws.close(code, reason)`, server `ws.terminate()`, or a client-side `close()`,
it makes no difference — wait until both sides have observed the close, then
call `server.stop()`, with or without `force`. The returned promise never
resolves.

Self-contained repro (`bun repro.ts`), three scenarios: graceful stop after a
closed WebSocket (hangs), forced stop after a closed WebSocket (hangs), and
`stop(true)` with the socket still open (control — resolves):

```ts
// A server WebSocket that closes through the normal close path never
// decrements server.pendingWebSockets, so a later server.stop() — graceful
// or stop(true) — never resolves. Run: bun repro.ts
const STOP_TIMEOUT_MS = 5000

async function scenario(
  name: string,
  close: boolean,
  force: boolean,
): Promise<void> {
  console.log(`\n--- ${name} ---`)
  const opened = Promise.withResolvers<Bun.ServerWebSocket<undefined>>()
  const closedOnServer = Promise.withResolvers<void>()
  const server = Bun.serve({
    port: 0,
    fetch(req, srv) {
      if (srv.upgrade(req)) return
      return new Response('websocket only', { status: 400 })
    },
    websocket: {
      message() {},
      open(ws: Bun.ServerWebSocket<undefined>) {
        opened.resolve(ws)
      },
      close() {
        closedOnServer.resolve()
      },
    },
  })
  const client = new WebSocket(`ws://127.0.0.1:${server.port}/`)
  const closedOnClient = Promise.withResolvers<void>()
  client.onclose = () => closedOnClient.resolve()
  const ws = await opened.promise

  if (close) {
    ws.close(1000, 'done') // client.close() or ws.terminate() leak identically
    await closedOnServer.promise
    await closedOnClient.promise
    await Bun.sleep(300) // the connection is fully closed on both sides
    console.log(
      `  connection closed on both sides; pendingWebSockets = ${server.pendingWebSockets}`,
    )
  } else {
    console.log(
      `  socket left open; pendingWebSockets = ${server.pendingWebSockets}`,
    )
  }

  const t0 = performance.now()
  const outcome = await Promise.race([
    server.stop(force).then(() => 'resolved' as const),
    Bun.sleep(STOP_TIMEOUT_MS).then(() => 'timeout' as const),
  ])
  const ms = Math.round(performance.now() - t0)
  if (outcome === 'resolved') {
    console.log(
      `  server.stop(${force ? 'true' : ''}) -> stopped cleanly in ${ms} ms, pendingWebSockets = ${server.pendingWebSockets}`,
    )
  } else {
    console.log(
      `  server.stop(${force ? 'true' : ''}) -> HUNG after ${ms} ms (promise still pending), pendingWebSockets = ${server.pendingWebSockets}`,
    )
    process.exitCode = 1
  }
}

console.log(`Bun ${Bun.version} (${process.platform} ${process.arch})`)
await scenario('ws.close(), then graceful server.stop()', true, false) // HUNG
await scenario('ws.close(), then server.stop(true)', true, true) // HUNG
await scenario('no close, server.stop(true) on the live socket', false, true) // clean
process.exit(process.exitCode ?? 0)
```

## What is the expected behavior?

After the only WebSocket connection has closed (both close handlers fired, the
close handshake completed), `server.pendingWebSockets` reads `0`, and both
`server.stop()` and `server.stop(true)` resolve promptly.

## What do you see instead?

`pendingWebSockets` stays at `1` after the connection is gone, and both stop
promises never resolve. Output of the repro (deterministic, 3 runs out of 3):

```text
Bun 1.3.14 (darwin arm64)

--- ws.close(), then graceful server.stop() ---
  connection closed on both sides; pendingWebSockets = 1
  server.stop() -> HUNG after 5002 ms (promise still pending), pendingWebSockets = 1

--- ws.close(), then server.stop(true) ---
  connection closed on both sides; pendingWebSockets = 1
  server.stop(true) -> HUNG after 5000 ms (promise still pending), pendingWebSockets = 1

--- no close, server.stop(true) on the live socket ---
  socket left open; pendingWebSockets = 1
  server.stop(true) -> stopped cleanly in 0 ms, pendingWebSockets = 0
```

The hang is not a delayed resolve: the promise is still pending after 15 s and
after 30 s (measured separately), and `idleTimeout` does not reap the phantom
entry.

## Additional information

All of the below measured on Bun 1.3.14:

- The close initiator does not matter: server `ws.close(code, reason)`, server
  `ws.terminate()`, and a client-initiated `close()` all leak the counter the
  same way.
- The peer does not matter: reproduced with the in-process `WebSocket` client
  above, with a client in a separate OS process (including one that fully exited
  before `stop()` was called), and with raw TCP peers.
- Teardowns that bypass the WebSocket close path are accounted correctly and do
  not leak: `stop(true)` terminating still-open sockets (scenario 3 above,
  `pendingWebSockets` drops to 0), and the shutdown uWS performs itself when
  `closeOnBackpressureLimit: true` trips (after it, `pendingWebSockets` reads 0
  and both stop flavors resolve immediately).
- During a hung graceful `stop()` the listener is actually closed — new
  connections are refused; only the promise (and the `pendingWebSockets`
  accounting) never settles.
- Quirk: while a graceful `stop()` promise is pending, a subsequent
  `server.stop(true)` call returns a promise that does resolve — but the first
  promise still never settles.
- How we hit this: our framework's engine protectively calls `ws.close()` on a
  socket whose peer stopped reading and tripped `backpressureLimit` (`send()`
  starts returning `0`, dropping frames silently under the default
  `closeOnBackpressureLimit: false`). After any such kill — in fact after any
  normally-closed WebSocket — the engine's `dispose()` awaits `server.stop()`
  and hangs forever. A server needs to be able to shut down after a WebSocket
  connection has come and gone.

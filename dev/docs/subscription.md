# Subscription — server value streams (implementation knowledge base)

How Point0's subscription points work inside: the endpoint route from
`useSubscription` to the generator loader, the NDJSON wire contract, the
reconnect state machine, and where each piece lives. This documents the code as
it is TODAY. User-facing docs:
[docs/points/subscription.md](../../docs/points/subscription.md). Sockets
(channels/handlers) are a separate machine — [dev/docs/socket.md](socket.md) —
with no subscription vocabulary at all: a clientHandler's pushes are consumed by
its listeners and `iterateMessagesFromServer` (see «The message iterator»
there).

## File map

| Piece                                                                                                          | Where                                                      |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Client runtime: line reader, attempt state machine, reconnect, `useSubscriptionValue`, `iterateSubscription`   | `packages/core/src/subscription.ts`                        |
| Wire envelope contract (`SubscriptionStreamEnvelope`: `{v}` / `{e}` / `{d}`)                                   | `packages/core/src/protocol.ts`                            |
| Builder surface: generator `.loader` overload, `.subscription()` closer, `useSubscription`/`fetchSubscription` | `packages/core/src/point0.ts` (search `subscription`)      |
| Types: options, loader fn, hook results, `InferSubscriptionYield`                                              | `packages/core/src/types.ts` (search `Subscription`)       |
| Server stream: generator → NDJSON/SSE framing, heartbeats, terminal envelopes, cancel→signal                   | `packages/engine/src/subscription-stream.ts`               |
| Fetcher branch (`isSubscription`), the AbortController per request                                             | `packages/engine/src/fetcher.ts` (search `isSubscription`) |
| Executor: the generator is returned UNTOUCHED (no await, no RSC normalize), `signal` plumb                     | `packages/engine/src/executor.ts` (loader case)            |
| Compiler: type registry, query-transport methods, the action-closer list (`getAllowedLastMethodNames`)         | `packages/compiler/src/point.ts`                           |

## The route, step by step

1. A component mounts; `taskProgressSubscription.useSubscription({ taskId })`
   runs (`useSubscriptionValue` in subscription.ts). During SSR nothing streams
   — the hook renders `'connecting'` and does the real work after mount. Each
   hook holds its OWN stream: no cross-component dedup (an HTTP stream is
   per-reader by nature; this is a deliberate contrast with channel
   connections).
2. The client fetches the framework endpoint
   `GET /_point0/<scope>/subscription/<name>?input=<json>` — the standard
   query-transport URL builder (`_getFetchServerOptions`), POST fallback for
   binary/over-long input included (`pointTypeUsesQueryTransport` counts
   subscription in the query-transport family).
3. The server runs the FULL endpoint pipeline through the executor — middleware,
   plugins, `.ctx`, input parse. The loader case sees `_isHttpSubscription()` (a
   real subscription point, or an action whose flavor is `'subscription'`) and
   calls the generator fn WITHOUT awaiting: an async generator function returns
   its generator synchronously, and awaiting or RSC-normalizing it would destroy
   it. The generator lands in `executeResult.output` untouched. The loader args
   carry `signal` — an `AbortController` the fetcher created for this request.
4. Pipeline errors (schema 422, ctx throw) answer as a plain single JSON error
   BEFORE any streaming — the client reader treats any non-2xx as a typed error,
   single body.
5. The fetcher's subscription branch wraps the generator in
   `createSubscriptionStream` and answers `Content-Type: application/x-ndjson`,
   `Cache-Control: private, no-store`, `X-Accel-Buffering: no`.
6. The stream drains the generator: each yield →
   `transformer.stringify({ v: value })` + `\n`. While the generator sits
   between yields, a blank-line heartbeat goes out every 5 s
   (`SUBSCRIPTION_STREAM_HEARTBEAT_MS`, same race-the-iterator trick as the RSC
   hole stream) so idle proxies don't reap a quiet stream. The generator
   returning → `{d:true}` line + close; the generator throwing →
   `{e:<public serialization>}` line + close (logged server-side).
7. The client reads lines (`readLinesFromBody` — buffer, split on `\n`, skip
   empties), parses each with the point transformer: `{v}` → the listeners
   (point-level `.subscription({ onMessageFromServer })` + the call's
   `onMessageFromServer`; state/`data` only under
   `lastMessageFromServerAsData: true`), `{e}` → status `'error'` with the typed
   error, `{d}` → status `'closed'`.
8. Unsubscribe (unmount, input change, `enabled` flip): the client aborts its
   fetch → the ReadableStream's `cancel()` fires server-side → it aborts the
   loader's `signal` AND calls `generator.return()` — a generator waiting on an
   external source unwinds instead of leaking.
9. The bytes ending with NO terminal line is a BREAK (network drop, server
   restart, dev reload) — the only case `reconnect` restarts: shared policy from
   `core/src/reconnect.ts` (first retry immediate, then `delay 300` ×`backoff 2`
   per attempt up to `maxDelay 5000`, optional `retries` cap,
   `boolean | ReconnectOptions`), `reconnect: false` opts out (then a break
   surfaces as `'error'` with `POINT0_SUBSCRIPTION_LOST`). The attempt counter
   resets on every successful open. A COMPLETED stream or a typed error never
   restarts — those are answers. On a TRACKED point (the cursor pair below) the
   redial rewrites the input with the last delivered cursor — a resume, not a
   restart; the cursor survives across multiple consecutive breaks (it is
   per-consumer state, not per-attempt).

## Wire contract

One transformer-serialized JSON envelope per unit (`SubscriptionStreamEnvelope`)
in one of TWO framings, negotiated by `Accept` in the fetcher: the native NDJSON
(one envelope per line, blank-line heartbeats) when the request names
`application/x-ndjson` — our client always does — and SSE for everything else
(`data: <envelope>\n\n` per envelope, `:\n\n` comment heartbeats,
`Content-Type: text/event-stream`; the fallback, because a client that did not
name our framing is most likely an `EventSource`). Responses carry
`Vary: Accept`. SSE `id:`/`event:` fields are unused — resumption deliberately
does NOT ride the SSE protocol or any header: it is the tracked-cursor pair
(below), pure client behavior over an unchanged wire. Exactly one key per
envelope:

| Line        | Meaning                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| `{v: ...}`  | one streamed value (a loader yield)                                     |
| `{e: ...}`  | the loader threw — the error's public serialization; the stream is over |
| `{d: true}` | the loader COMPLETED (returned); the stream is over                     |
| _(blank)_   | heartbeat — skipped by every reader                                     |

The `d`/`e` terminal lines are load-bearing: an end WITHOUT one is a break and
is what the client restarts on. `assertSingleLine` fails loud if a transformer
pretty-prints (multi-line output would corrupt the framing).

## The `fetchSubscription` iterable

`iterateSubscription` (subscription.ts) — one attempt, NO reconnect (an
imperative consumer loops on its own terms). Values yield through; `{e}` and a
break THROW; `{d}` ends the iteration. Everything that happens to the BYTES is a
break, folded into one guarded generator around read+parse: a transport reject
mid-read and an unparsable line alike (same as the hook path, where
`runSubscriptionAttempt`'s single catch covers both) — the consumer is promised
the point's typed error, never a raw `SyntaxError` from the transformer. It is
an async generator, so breaking out of the consumer's `for await` runs its
`finally` → aborts the fetch → the server cancel path above. `options.signal` is
linked to the same controller. Server-side call throws
(`fetchSubscription is for the client only`).

## Builder mechanics

- There is ONE `.loader` fn overload, and its generic CONSTRAINT is
  stage-conditional — that conditional IS the callback's contextual type: the
  subscription stage takes `SubscriptionLoaderFn` (required `signal`), the
  action stage `ActionLoaderFnWithStream` (the standard return union PLUS
  `AsyncIterable`, `signal` typed optional), everything else the standard
  `LoaderFn`. Not overloads, deliberately: overload resolution contextually
  types an unannotated callback by the FIRST candidate and keeps that typing —
  even a `never`-gated earlier overload poisons it (that broke plain action
  loaders one way and generator loaders the other way before this landed). The
  return computes `TServerLoaderOutput` = the yield union when
  `ReturnType extends AsyncIterable` (`InferSubscriptionYield`,
  `infer TYield extends UnknownData` keeps the slot inside `LoaderOutput`) and
  sets **`TQueryResultType = 'subscription'`** — the "this loader is a
  generator" marker.
- That marker is what the closers gate on: `.subscription()` requires it (a
  plain loader → ShowError), `.action()` / `.query()` / `.mutation()` /
  `.infiniteQuery()` on an action stage reject it (a stream closes with
  `.subscription()` only). Semantically the slot is honest — `'subscription'` IS
  what the point is for the client, next to `'query'`/`'infiniteQuery'`.
- The dedicated `.subscription()` opener's runtime closer sets
  `type: 'subscription'`, `_queryResultType: 'subscription'`,
  `_subscriptionOptions` (point-level `reconnect` default) and keeps the
  endpoint (`undefinedEndpointIfHasNotServerLoader`). An ACTION opener closed
  with `.subscription()` STAYS `type: 'action'` — the stream is its FLAVOR
  (`_queryResultType: 'subscription'`), exactly as `.query()`/`.mutation()`
  closers keep an action an action; its endpoint was already built from the
  declared method/route at `lets()` time and survives the close. Transport and
  socket checks read the flavor, not the point type: `_isHttpSubscription()` =
  type `'subscription'` OR an action carrying the `'subscription'` flavor. The
  input follows the ACTION transport — `_getFetchServerOptions` takes the action
  branch (params in the path, search in the query string, body in the body), and
  `useSubscription`/`fetchSubscription` type their input as `ActionInputRaw`.
- The compiler tracks no flavor at all: `getAllowedLastMethodNames` lists
  `subscription` among the action closers so the chain type-checks the closer,
  and the endpoint meta keys on the TRUE point type. The runtime
  `_queryResultType` slot (set by the closer) is the only flavor record, and
  transport/socket checks read it there.
- Sockets have no subscription anything: a clientHandler chain refuses
  `.subscription()` (type + runtime), the pushes ride
  `iterateMessagesFromServer` / the `onMessageFromServer` listeners
  (`core/src/socket.ts` — see dev/docs/socket.md, «The message iterator»). A
  serverHandler never streams — a generator `.serverReply` is refused (type +
  runtime).

## The tracked cursor (resume)

`.subscription({ cursorParamFromInput, cursorParamFromData })` — a broken stream
RESUMES instead of restarting. Entirely client-side: the server, the envelope,
the loader signature and the compiler's endpoint handling are all untouched —
the loader reads the cursor out of its own input, identically on a fresh start
and on a resume.

- **Runtime** (`core/src/subscription.ts`): `getCursorParams` reads the pair off
  `point._subscriptionOptions` (point-level ONLY — the call sites and
  `.subscriptionOptions()` cannot carry it). In `subscribeToSubscriptionPoint`'s
  loop, `onValue` plucks `getByPath(value, cursorParamFromData)` from every
  delivered value (already transformer-parsed — a `Date` cursor is a `Date`); a
  pluck that reads `undefined` keeps the previous cursor (writing `undefined`
  into the input would forget the resume point). Before a redial the attempt
  input is the caller's input shallow-cloned with
  `setByPath(clone, cursorParamFromInput, lastCursor)` — the exact
  `_toInputWithPageParam` fold the infinite query uses for its pageParam, one
  path machinery (`getByPath`/`setByPath`, dot-paths) for both features. The
  FIRST attempt (and a redial before any value arrived) sends the caller's input
  untouched — an explicit "read from N" survives. The
  `pointSubscriptionClientStart`/`Data` events carry the EFFECTIVE attempt input
  (what the wire carried); the lifecycle props keep the caller's input — that is
  the stream's identity (and the hook's `inputKey`). `iterateSubscription`
  (`fetchSubscription`) never reconnects, so it never rewrites anything.
- **Types** (`core/src/types.ts`): both options are `PathKeys<...>` of their
  shapes (deep dot-paths — the `pageParamFromInput` rule); `GetByPathType` (the
  type-level twin of `getByPath`, next to `PathKeys`) resolves a path's value
  type. `AssertSubscriptionCursorParams` on the closer enforces the PAIRING and
  the CROSS-TYPE constraint (the data cursor's type must be assignable to the
  input field's). The closer is generic over the options literal with the
  intersection-assert pattern; its type-param DEFAULT is the wide options type,
  NOT `undefined` — a context-sensitive callback in the literal defers
  inference, and an `undefined` default then rejects the whole argument.
  `SubscriptionCursorPath` widens the props to `string` under the
  unparameterized (storage/merge) instantiations so `_subscriptionOptions` reads
  naturally. `ExtraUseSubscriptionOptions` `Omit`s the pair (no per-call
  surface); `.subscriptionOptions()` `Omit`s it too (scope defaults cannot name
  one point's schema fields).
- **Runtime guard** (`core/src/point0.ts`, `_assertSubscriptionCursorParams`,
  run at the `.subscription()` close on the MERGED options): the pair comes only
  together (throw otherwise); the input path's FIRST segment must exist in the
  input schema when it is introspectable — `extractKeysBySchemasHelpers`
  best-effort, the search-key convention (no schema helper, a validate-fn
  schema, or the client's blanked `.input()` → skipped); an action-opened
  point's path must start with `params`/`search`/`body`. The data path has no
  runtime schema — the type level owns it.
- **Compiler** (`compiler/src/point.ts`): the pair survives BOTH bundles — the
  `reconnect` precedent, plain data is never stripped; the server-side strip of
  `subscription`/`subscriptionOptions` options drops only the listener and the
  lifecycle callbacks (the client cut does not touch the closer options at all).
  Consequence: the schema-introspection half of the close guard fires wherever
  the input schema is real — every server, compiled or not, and uncompiled runs
  (tests, a `compiler: false` engine); the client's blanked `.input()` skips
  that half, and the pairing check still runs client-side.

## Gotchas

- **The executor must never await the loader's return for subscriptions** — an
  async generator object is not a thenable, but `normalizeRscOutput` would walk
  it as data and destroy it. The `_isHttpSubscription()` branch in the loader
  case is load-bearing.
- The tracked-cursor input fold is a SHALLOW clone + `setByPath` — deliberately
  the exact `_toInputWithPageParam` shape. Shared consequence: a DEEP
  `cursorParamFromInput` whose intermediate object already exists in the
  caller's input writes the cursor into that shared nested object (the clone
  copies only the top level). A top-level cursor field is fully aliasing-safe;
  the infinite query's pageParam fold has the same property.
- The yield union of a generator LITERAL gets TS's object-literal union
  normalization (`{a} | {b}` becomes `{a; b?: undefined} | {a?: undefined; b}`)
  — same as array literals, nothing subscription-specific; annotate the
  generator's return type to opt out.
- SSR/prefetch: subscriptions are invisible to the executor's query-cache-driven
  prefetch discovery — by design, same as mutations. Nothing dehydrates; the
  hook is inert server-side.
- The dev hosts (bun and vite) forward the stream through their plain-fetch
  proxy without buffering — proven by the browser e2e on all three bundlers
  (`subscription-browser.e2e.test.tsx`).
- Events: the side-split `pointSubscriptionServer*`/`Client*` families fire PER
  ATTEMPT — `Start` (with `attempt`, +1 per reconnect), `Data` per streamed
  value, `Settled` with `outcome: completed | failed | broken`, `Error` when the
  consumer sees an error (a failed attempt, or a break that will not be
  retried). Client emits in subscription.ts (`emitAttemptOutcome` — a deliberate
  cancel via `signal.aborted` emits nothing), server in fetcher.ts (`Start`) +
  subscription-stream.ts (`Data`/`Settled`/`Error`; a consumer cancel settles as
  `broken`). `pointFetchServer*` still does not fire for subscription streams —
  the fetch bypasses `_fetchServerDetailed`, and the subscription family is the
  replacement.

## Tests

| File                                               | Covers                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/tests/subscription-builders.unit.test.ts`    | closer/endpoint/options, action-opened form, guards, full type surface; the cursor pair: pairing/key runtime guards + the type pins (paths, cross-type, no per-call/scope surface)                                                                                                                                                                      |
| `compiler/tests/subscription.unit.test.tsx`        | parse (both openers) + strip snapshots (generator cut client-side; the cursor pair survives BOTH cuts), and the armed close guard: a compiled server bundle with a wrong input path throws at import                                                                                                                                                    |
| `core/tests/subscription-ssr.unit.test.tsx`        | SSR inertness: `useSubscription` renders `connecting`/`closed` and opens nothing server-side; a clientHandler consumer is inert there too                                                                                                                                                                                                               |
| `engine/tests/subscription.int.test.ts`            | the real transport headless: values, completion, mid-stream typed error, 422, cancel→signal, both framings incl. the heartbeat of a quiet generator, custom path, the `pointSubscription*` event families on both sides                                                                                                                                 |
| `engine/tests/subscription-lifecycle.int.test.tsx` | the callbacks through the real hook under FakeClient over a scripted NDJSON body: break → redial → completion, and the two mid-read failures (a rejecting body, an unparsable line) as breaks                                                                                                                                                           |
| `engine/tests/subscription-tracked.int.test.tsx`   | the cursor pair through the real hook + a real Engine server point (a fetch wrapper cuts the body = the break): resume with the rewritten input server-logged, no duplicates, first subscribe / explicit cursor untouched, a Date cursor via superjson over deep paths, a non-tracked point redials byte-identical, fetchSubscription yields plain data |
| `engine/tests/subscription-browser.e2e.test.tsx`   | Playwright on bun/vite/bun-hot: useSubscription SSR+live, a clientHandler's iterateMessagesFromServer                                                                                                                                                                                                                                                   |

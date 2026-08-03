---
index: 925
title: Subscription
description:
  A subscription is an input schema plus an async-generator loader — a live
  server stream over plain HTTP, no WebSocket needed.
---

A subscription streams values from the server: its loader is an async
**generator**, and every `yield` travels to the client the moment it happens.
The transport is plain HTTP — an NDJSON response on a real endpoint, not a
WebSocket — so there are no tickets, no rooms, no socket to keep alive: the
cheapest way to watch a long task, tail a log, or follow a feed.

```tsx
import { root } from '@/lib/root'
import { z } from 'zod'

export const taskProgressSubscription = root.lets
  .subscription()
  .input(z.object({ taskId: z.string() }))
  .loader(async function* ({ input, signal }) {
    // cut from the client bundle — the generator runs on the server
    for await (const percent of watchProgress(input.taskId, { signal })) {
      yield { percent } // one streamed value per yield
    }
  })
  .subscription()
```

```tsx
export const TaskProgress = ({ taskId }: { taskId: string }) => {
  const { data, status } = taskProgressSubscription.useSubscription(
    { taskId },
    { lastMessageFromServerAsData: true }, // keep the latest message in `data`
  )
  if (status === 'closed') return <span>Done</span> // the generator returned
  return <progress value={data?.percent ?? 0} max={100} />
}
```

## Declaring a subscription

Open with `.subscription()`, declare input and a **generator** loader, close
with `.subscription(options?)`:

```tsx
export const countSubscription = root.lets
  .subscription() // open
  .input(z.object({ upTo: z.number().max(10) }))
  .loader(async function* ({ input }) {
    for (let n = 1; n <= input.upTo; n++) {
      yield { n } // each yield is one streamed value
    }
    // the generator returns → the stream completes, consumers see 'closed'
  })
  .subscription({ reconnect: false }) // close, with point-level options
```

The loader is an async generator — that's the whole declaration of the data:
each `yield` is one streamed value, a `return` completes the stream, and the
**data type is the union of the yields** — nothing is declared. A plain
(non-generator) loader can't close with `.subscription()`, and a generator
loader can't close with `.query()` or `.mutation()` — both are type errors.

Beyond `signal` (covered [below](#stopping-the-stream--the-signal)), the
generator receives the standard [loader](loader) surface — the parsed `input`,
any `ctx` from `.ctx`/plugins, the `request`, a `set` helper, and `points`.
`.input(schema)` takes any [Standard Schema](validation) and merges down the
chain, exactly as on a [query](query).

## A real endpoint

A subscription is served at `GET /_point0/<scope>/subscription/<kebab-name>` — a
**GET with the input JSON-encoded in the `?input=` search param**, same as a
query; an input that carries a `File`/`Blob` or overflows the URL falls back to
a `POST` body automatically. The response is NDJSON (`application/x-ndjson`):
one transformer-serialized line per yield, closed by a terminal line that says
whether the generator completed or threw. While the generator sits quiet between
yields, blank-line heartbeats keep idle proxies from reaping the stream. You
never write the path — `useSubscription` / `fetchSubscription` route to it for
you.

The connect is a full request: [middleware](middleware), [plugins](plugin),
[`.ctx`](ctx), and input validation all run, like on any endpoint. An input that
fails its schema answers as a plain typed error (status 422) before anything
streams; a loader that throws **mid-stream** delivers the typed error after the
values already yielded — see [error handling](error-handling).

## Consuming with the hook

`useSubscription(input?, options?)` holds the stream while the component is
mounted. By default **messages never re-render the component** — react to them
through the `onMessageFromServer` callback:

```tsx
const { error, status, isLoading } = taskProgressSubscription.useSubscription(
  { taskId },
  { onMessageFromServer: (tick) => setPercent(tick.percent) }, // fires on every message
)

status // 'connecting' | 'open' | 'closed' | 'error'
isLoading // status === 'connecting'
```

When you want to **render** the latest message directly, opt into the
query-shaped result with `lastMessageFromServerAsData: true` — the result gains
`data` (typed as the union of the yields) and the component re-renders on every
message:

```tsx
const { data } = taskProgressSubscription.useSubscription(
  { taskId },
  { lastMessageFromServerAsData: true },
)
data // the latest streamed value — undefined until the first one
```

Pick by what you do with a message: a callback for reactions (update a store,
toast, feed a query cache — no render churn), `lastMessageFromServerAsData` for
rendering the latest value (a ticker, a progress bar — the re-render is the
point). `status` walks `connecting` → `open` → `closed` (the generator
completed) or `error` (a typed error — final, never restarted); `error` is typed
by the point's error class, as everywhere. All options together:

```tsx
taskProgressSubscription.useSubscription(
  { taskId },
  {
    enabled: !!taskId, // false → nothing opens, status is 'closed'
    onMessageFromServer: (tick) => console.info(tick.percent), // fires on every message
    lastMessageFromServerAsData: true, // keep the latest message in `data`; default false
    reconnect: { delay: 1000 }, // per-call override — see Reconnect
  },
)
```

A listener can also live on the point itself —
`.subscription({ onMessageFromServer })` runs for every consumer's every message
(per-call listeners add up, nothing doubles). It's client code: the compiler
cuts it from the server bundle with its imports.

Scope-wide defaults live on `.subscriptionOptions({...})` — declarable on root,
base, or a plugin, like [`.queryOptions`](stage-methods): the same `reconnect`
and `onMessageFromServer` shape, applied to every subscription in scope. Options
resolve lowest-to-highest — `.subscriptionOptions()`, then the closing
`.subscription({...})`, then the `useSubscription` call — and
`onMessageFromServer` listeners at every level all run, in that order (nothing
doubles).

Changing the input closes the old stream and opens a new one (the input's
serialized form is the identity). Each hook holds its **own** stream — two
components subscribing with the same input are two independent streams, with no
cross-component dedup (an HTTP stream is per-reader by nature — the deliberate
contrast with [channel](socket) connections and space memberships, which dedupe
by input). The values live in the hook, not in the react-query cache: unmount
and they're gone.

During [SSR](ssr) nothing streams — the hook renders `connecting` on the server
and does the real work after mount. Nothing is prefetched or dehydrated.

## The imperative consumer: `for await`

`fetchSubscription(input?, options?)` returns an `AsyncIterable` of the streamed
values:

```tsx
for await (const { percent } of taskProgressSubscription.fetchSubscription({
  taskId,
})) {
  render(percent)
}
// the loop ends when the generator completes
```

A typed error — or a broken stream — **throws** out of the loop; there is no
auto-restart (an imperative consumer loops on its own terms). Breaking out of
the loop cancels the stream — the server generator's `signal` fires. To cancel
from outside the loop, pass a signal:

```tsx
const controller = new AbortController()
for await (const value of feedSubscription.fetchSubscription(undefined, {
  signal: controller.signal,
})) {
  // controller.abort() anywhere stops the stream
}
```

`fetchSubscription` is client-only — a runtime error on the server.

## Stopping the stream — the `signal`

The generator receives `signal` — an `AbortSignal` that fires when the consumer
unsubscribes (the component unmounts, the `for await` loop breaks, the tab
closes). Hand it to whatever feeds the generator, or check it in the loop —
without it, a generator waiting on an external source outlives its consumer
forever.

**The server pulls its own source** — poll, sleep, check the signal:

```tsx
export const logTailSubscription = root.lets
  .subscription()
  .input(z.object({ file: z.string() }))
  .loader(async function* ({ input, signal }) {
    let offset = 0
    while (!signal.aborted) {
      const { lines, nextOffset } = await readNewLines(input.file, offset)
      offset = nextOffset
      if (lines.length > 0) yield { lines }
      await sleep(1000)
    }
  })
  .subscription()
```

**Outside events drive the stream** — `on` from `node:events` turns an emitter
into an async iterable and takes the signal directly, so a mutation firing an
event anywhere on the server streams to every subscribed client, still without a
WebSocket:

```tsx
import { on } from 'node:events'
import { postsEmitter } from '@/lib/posts' // .emit('add', post) in a mutation

export const newPostsSubscription = root.lets
  .subscription()
  .loader(async function* ({ signal }) {
    for await (const [post] of on(postsEmitter, 'add', { signal })) {
      yield { post }
    }
  })
  .subscription()
```

The teardown is symmetric: when the consumer goes away, the server aborts the
signal **and** closes the generator, so `finally` blocks in the loader run and
nothing leaks.

## Reconnect

Only a **broken** stream restarts — the bytes stopped without a terminal line (a
network drop, a server restart, a dev reload), or a line arrived that the
transformer cannot parse, which says the same thing: what comes out of this
connection is no longer the framing. The first retry fires immediately (a drop
is usually accidental); from there the waits run `delay`, `delay·backoff`,
`delay·backoff²`, … capped at `maxDelay` — by default 300 ms doubling up to 5 s.
The attempt counter resets whenever a stream opens successfully. While
reconnecting, `status` is `connecting` and `data` keeps the last streamed value.

A **completed** stream (the generator returned) and a **typed error** (the
loader threw, the input failed validation) are answers — they never restart.

```tsx
export const newPostsSubscription = root.lets
  .subscription()
  .loader(async function* ({ signal }) {
    for await (const [post] of on(postsEmitter, 'add', { signal })) {
      yield { post }
    }
  })
  .subscription({ reconnect: { immediately: false, delay: 1000 } }) // never retry instantly

// the other forms the closer takes:
// { reconnect: true }                  the default — same as omitting it
// { reconnect: { backoff: 1 } }        constant 300ms waits, no exponent
// { reconnect: { retries: 3 } }        give up after 3 attempts
// { reconnect: false }                 a break surfaces as a typed error
```

The policy lives on the closing `.subscription({...})` and every
`useSubscription` call can override it. With `reconnect: false` (or the
`retries` cap exhausted) a break reports `status: 'error'` with a typed
`POINT0_SUBSCRIPTION_LOST` error. `fetchSubscription` never reconnects — a break
throws, and the `for await` loop retries if you wrap it in one.

A reconnect restarts the generator from scratch — whatever streamed during the
gap is lost unless the point resumes instead: see
[Resuming after a break](#resuming-after-a-break).

## Resuming after a break

Declare the **tracked-cursor pair** on the closing `.subscription({...})` and a
broken stream resumes where it left off: the client plucks a cursor out of every
delivered value, and when the auto-reconnect redials it writes the last one into
the input it resubscribes with.

```tsx
export const feedSubscription = root.lets
  .subscription()
  .input(
    z.object({ channelId: z.string(), lastEventId: z.string().optional() }),
  )
  .loader(async function* ({ input, signal }) {
    // a fresh start and a resume read the cursor the SAME way — out of the input
    for (const missed of await db.eventsAfter(
      input.channelId,
      input.lastEventId,
    )) {
      yield missed // { id, ... }
    }
    for await (const event of live(input.channelId, { signal })) {
      yield event
    }
  })
  .subscription({
    cursorParamFromInput: 'lastEventId', // the input field the reconnect rewrites
    cursorParamFromData: 'id', // where the cursor lives inside each streamed value
  })
```

- **`cursorParamFromData`** names the field **inside each streamed value** the
  client remembers — the data of a tracked subscription is an object carrying
  its own cursor. There is no separately computed cursor: an event that needs
  one gets a field.
- **`cursorParamFromInput`** names the **input field** the auto-reconnect
  rewrites with the last delivered cursor before resubscribing. The first
  subscribe sends your input untouched — leave the field unset to start from the
  top, or set it to start "from N". Make the field optional in the schema, or
  give it a meaning on the first subscribe.
- Both are **paths**, dots included (`'filter.since'`, `'meta.at'`) — the same
  rule as `pageParamFromInput` on an [infinite query](infinite-query) — and both
  are **typed**: each path must exist in its shape, and the data cursor's type
  must fit the input field it lands in, all checked at the close. The pair comes
  only together, and only here — not per call, not in `.subscriptionOptions()`.

The feature is entirely client-side. The server, the wire and the loader don't
change: the loader reads the cursor out of its input — identically on a fresh
start and on a resume — and serves the missed events itself (nothing is buffered
for replay). The [transformer](transformer) covers the cursor like any input: a
`Date` plucked from the data arrives in the loader a `Date`. Serve
strictly-after the cursor and nothing duplicates across the break.

The tRPC contrast: there resumption is `tracked(id, data)` plus the
`Last-Event-ID` HTTP header — a string outside the transformer, under an imposed
name. Here the cursor is a field of your input: typed by your schema, serialized
by the transformer, named whatever you like.

`fetchSubscription` never reconnects, so it never rewrites anything — the pair
changes nothing for the imperative consumer, which loops with its own cursor.

## Lifecycle callbacks

The same three callbacks a [channel](socket) declares, in the subscription
vocabulary — on the closing `.subscription({...})` (fires for every consumer)
and per `useSubscription` call; both levels run, point level first:

```tsx
export const taskProgressSubscription = root.lets
  .subscription()
  .input(z.object({ taskId: z.string() }))
  .loader(async function* ({ input, signal }) {
    yield* watchProgress(input.taskId, { signal })
  })
  .subscription({
    onConnect: ({ connectionIndex }) => console.log('open', connectionIndex), // 0 — the first connect, > 0 — a re-open after a break
    onDisconnect: ({ connectionIndex }) =>
      console.log('stopped', connectionIndex),
    onError: ({ error }) => toast.error(error.message),
  })
```

- **`onConnect`** — the stream opened, the first time and on every successful
  re-open after a break alike; `connectionIndex` counts the opens before this
  one (`0` = the first, `> 0` = a re-open). Per consumer: two hooks are two
  streams, each fires its own.
- **`onDisconnect`** — an **open** stream stopped: a break (the reconnect policy
  redials next), a completion, or a mid-stream typed error. A stream that never
  opened fires nothing, and neither does your own teardown — unmount and an
  early `break` are you leaving, there is nobody left to tell.
- **`onError`** — the terminal `error` status: a typed error or a break the
  policy gave up on. A request that never opened (a 401, failed validation)
  fires `onError` alone.

The props carry `{ point, input, connectionIndex }` (`error` too on `onError`) —
the `input` identifies the stream, since a subscription has no shared facade.
All three are client code, cut from the server bundle with their imports.
`fetchSubscription` fires the point-level callbacks too (one attempt,
`connectionIndex: 0`); its call site takes no callbacks — the imperative
consumer IS the loop.

A [clientHandler](socket)'s pushes have none of these on purpose: they have no
connection of their own — the moments belong to the channel connection or the
space membership that carries them (`onConnect` on the channel, `onEnter` on the
space).

## A stream on your own URL

Open with `.action(method, path)` instead — a generator loader closed with
`.subscription()` streams on the method and path you declared:

```tsx
export const feedSubscription = root.lets
  .action('GET', '/api/feed')
  .loader(async function* ({ signal }) {
    for await (const item of watchFeed({ signal })) {
      yield { item }
    }
  })
  .subscription()
```

Closing a generator loader with `.action()` (or `.query()` / `.mutation()`) is a
type error — a stream closes with `.subscription()` only. The endpoint answers
the declared method only (no POST fallback), and the input rides the ACTION
shape: route params fill the path, `.search` keys ride the query string, a
`.body` rides the body — `useSubscription`/`fetchSubscription` take the same
`{ params, search, body }` input the action's own callers would. On this form
`signal` is typed `AbortSignal | undefined` — an action opener also accepts
plain loaders, so the two share one loader shape — but for a generator loader it
is always there at runtime.

## Foreign clients: SSE

The wire is content-negotiated. Point0's own client asks for the native NDJSON
framing (`Accept: application/x-ndjson`); any other client — including a plain
browser `EventSource` — gets the SAME envelopes in **SSE** framing
(`Content-Type: text/event-stream`, one `data:` event per envelope, comment
lines as heartbeats). No option to set — the endpoint answers whatever asks:

```ts
const source = new EventSource(
  '/_point0/root/subscription/task-progress?input=' + input,
)
source.onmessage = (event) => {
  const envelope = JSON.parse(event.data) // { v: value } | { e: error } | { d: true }
}
```

The envelope semantics survive the framing: `{ v }` is one value, `{ e }` is a
typed failure, `{ d: true }` is completion — an SSE stream ending without a
terminal envelope is a break, same as NDJSON. SSE `id:`/`event:` fields are
unused: resumption does not ride the SSE protocol — it is the
[cursor pair](#resuming-after-a-break), which travels as a field of the input,
so a foreign client resumes the same way Point0's own does (put the cursor in
the input); a foreign reconnect without one restarts the generator. Responses
carry `Vary: Accept` so caches never mix the framings.

## Subscription vs channel

Both push live; they solve opposite directions.

- A **subscription** is the server **pulling or generating** a stream for one
  consumer: the progress of a long task, a tail, a feed. One-way, one HTTP
  request per consumer, nothing shared — no socket, no tickets, no rooms. When
  the reader is what starts the flow, reach here first: it's the cheaper
  machine.
- A **[channel](socket)** is **push from outside** to many clients: chats,
  presence, notifications. Two-way messages, spaces of rooms deciding who's
  together, one WebSocket carrying everything — a bigger machine for a bigger
  job.

The line between them is the REQUEST: a subscription is one, a clientHandler's
pushes are not — which is why there is no `.subscription()` on socket points.
The socket side consumes its pushes with `useOnMessageFromServer` /
`onMessageFromServer` and iterates them with
[`iterateMessagesFromServer`](socket#iterating-the-pushes).

## The usual point machinery

- **Stripping** — the generator `.loader` is **cut from the client bundle**: its
  body and the imports it uses are removed, so it never ships to the browser (it
  runs server-side) — the standard server-only loader rule. `.input` is cut from
  the client bundle likewise. The closing `.subscription(...)` is **not cut from
  either bundle** — kept in both (isomorphic): it has to resolve the point on
  the server and the client alike.
- **Transformer** — every streamed line goes through the point's
  [transformer](transformer), like query payloads: set `.transformer(superjson)`
  up the chain and Dates or Maps survive the stream too.
- **Middleware, ctx, plugins** — run per subscription request like on any
  endpoint; the connect is a full request.
- **OpenAPI** — the endpoint appears in the generated [OpenAPI](openapi) spec
  under `filter: 'all'`; the stream's line-by-line body is not expressible in
  OpenAPI, so the operation describes the endpoint, not the values.
- **No react-query cache** — a subscription's values live in the hook that holds
  the stream, not in the query cache; there is nothing to invalidate or
  dehydrate.
- **[Events](events)** — the side-split `pointSubscriptionServer*` /
  `pointSubscriptionClient*` families fire per stream attempt on both sides:
  `Start` (the client one's `attempt` counts its reconnects — 0 is the first;
  the server cannot know the retry count and carries none), `Data` on every
  streamed value, `Settled` with the outcome (`completed` / `failed` /
  `broken`), and `Error` whenever the consumer sees an error. Deliberately
  stopping the stream (unmount, breaking out of the loop) emits nothing further.

## Reference

### Statuses

| Status       | Meaning                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `connecting` | the request is in flight — also during a reconnect wait, on the server during SSR                  |
| `open`       | the stream answered; values are arriving                                                           |
| `closed`     | the generator completed (`return`) — final; also the state under `enabled: false`                  |
| `error`      | a typed error (a loader throw, failed validation, retries exhausted) — final, never auto-restarted |

### Options

`.subscription({...})` — point-level defaults, overridable per `useSubscription`
call (except the cursor pair — it names schema fields, a point contract, so
neither the call site nor `.subscriptionOptions()` carries it):

| Option                 | Default | What it does                                                                                                                                                                                                             |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reconnect`            | on      | restart a **broken** stream — a boolean or `{ enabled, immediately, delay, backoff, maxDelay, retries }` (first retry immediate, then 300 ms doubling up to 5 s); completed streams and typed errors never restart       |
| `cursorParamFromInput` | —       | the input field (a dot-path) the auto-reconnect rewrites with the last delivered cursor — resumes instead of restarting; always paired with `cursorParamFromData`, see [Resuming after a break](#resuming-after-a-break) |
| `cursorParamFromData`  | —       | the field (a dot-path) **inside each streamed value** the client plucks the cursor from; always paired with `cursorParamFromInput`                                                                                       |
| `onMessageFromServer`  | —       | module-level listener — fires for every consumer's every message; client code, cut from the server bundle                                                                                                                |
| `onConnect`            | —       | a consumer's stream opened — every successful open, first and re-opens alike (`connectionIndex`: `0` = the first, `> 0` = a re-open) — see [Lifecycle callbacks](#lifecycle-callbacks)                                   |
| `onDisconnect`         | —       | an open stream stopped (break / completion / mid-stream error); never on the consumer's own teardown                                                                                                                     |
| `onError`              | —       | the terminal `error` status — the typed error in the props                                                                                                                                                               |

`useSubscription(input, {...})` — on top of the point-level options:

| Option                        | Default | What it does                                                                                           |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `enabled`                     | `true`  | subscribe or not — `false` renders `closed` and opens nothing                                          |
| `onMessageFromServer`         | —       | fires on every message — the reactive path, no re-renders                                              |
| `lastMessageFromServerAsData` | `false` | keep the latest message in state as `data`, re-rendering per message (query-shaped result)             |
| the three lifecycle callbacks | —       | `onConnect` / `onDisconnect` / `onError`, per call — compose with (never replace) the point-level ones |

`fetchSubscription(input, {...})`:

| Option   | Default | What it does                                                            |
| -------- | ------- | ----------------------------------------------------------------------- |
| `signal` | —       | abort to stop the stream — the iterator ends, the server `signal` fires |

### Method surface

Both take the **input** first (omit it when the subscription declares none). The
hook is kept in both bundles (it renders the connecting state during SSR); the
imperative consumer is client-only.

| Method              | Signature           | Returns                                                                                      |
| ------------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `useSubscription`   | `(input, options?)` | `{ error, status, isLoading }`; `+ data` (latest message) with `lastMessageFromServerAsData` |
| `fetchSubscription` | `(input, options?)` | `AsyncIterable<data>` — a typed error or a break throws                                      |

A subscription also exposes the standard `id` (`scope:type:name` — e.g.
`root:subscription:taskProgress`), `type` (`'subscription'`), `tags`, `point`,
and `Infer`.

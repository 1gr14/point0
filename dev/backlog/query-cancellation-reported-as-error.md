# Cancelled / aborted queries are reported as errors (`pointQueryError`)

**Status:** open · **Area:** core / `Point._getServerQueryOptions` +
`_getInfiniteQueryOptions` query functions, `_fetchServerDetailed`, eventer
`'error'` aggregation · **Impact:** every Point0 app that wires
`root.on('error')` (or any `clientOn('queryError')`) to a reporter (Sentry,
logger, toast) gets **spurious error reports on perfectly normal navigation**.
Each time an in-flight query is cancelled (the user navigates away while a fetch
is running, a component unmounts mid-fetch, a refetch supersedes the previous
one), Point0's query function emits a `pointQueryError` carrying the browser's
abort `DOMException` ("signal is aborted without reason"). It is pure noise — a
cancellation is the correct outcome of navigating away, not a bug.

## Symptom

On the 1gr14 site (prod), normal navigation produced a Sentry issue
`19016508e3b7467282f85fa5a21da038` titled **"AppError: signal is aborted without
reason"** (`1gr14-web` project, `2026-06-24`). Pulled and confirmed via the
Sentry API — the event nails the mechanism exactly:

- **It is the `pointQueryError` emit, captured through `root.on('error')`** —
  not a React boundary catch. The event's `extra` carries the handler's props:
  `name: "pointQueryError"`, `point: "root:query:getOpensourceNavigation"`,
  `mode: "server"`, `side: "client"`,
  `input: { project: "error0", version: "latest" }`, `expected: false`, and a
  `queryKey`. There is **no `componentStack`** anywhere on the event, and
  `mechanism: { type: "generic", handled: true }` — i.e. an explicit
  `captureException` via the logger sink, not an uncaught throw.
- **The `AppError` stack is the wrap site:**
  `j._fromNonError0 → j.from → _fetchServerDetailed → _fetchServer → Y` (the
  query function) — exactly `point0.ts:8751` → `:8795` → `:8997`.
- **The `cause` (the real `AbortError`) stack is the origin:**
  `onCancel → P [as cancel] → HD.removeObserver → u7.destroy → u7.onUnsubscribe → …React unmount`.
  So a `useQuery` observer for the shared `getOpensourceNavigation` query
  **unsubscribed on unmount during the route change**, TanStack cancelled the
  in-flight fetch
  (`removeObserver → retryer.cancel({ revert: true }) → onCancel → abortController.abort()`),
  and the fetch rejected with the default abort reason. Textbook clean cancel
  (Case 1).

So the event is a **benign cancellation reported as an error** — exactly this
bug. The `getOpensourceNavigation` query is the docs nav/sidebar loader, shared
across docs pages; navigating from one docs page to another unmounts/realigns
its observer and cancels the in-flight fetch.

"signal is aborted without reason" is the default `AbortSignal.reason` a browser
sets when `controller.abort()` is called with no argument (`DOMException`,
`name: "AbortError"`).

### The "error screen" was a different, co-occurring error (stale chunk)

The full-screen error the reporter saw in the same navigation was **not** this
abort. The event's breadcrumbs show the real failure: clicking a docs link
(`/point0/latest/overview` → `/error0/latest/overview#…`) hit
`TypeError: Failed to fetch dynamically imported module: https://1gr14.dev/chunk-…js`
**twice** within ~300 ms, immediately before the abort. That is a
**stale-chunk-after-redeploy** error (the open tab held an old index whose lazy
page-chunk URLs 404 after a deploy) — the case
`src/components/other/error-boundary.tsx` (`isStaleChunkError` →
`reloadIfStaleChunk`) is built to auto-reload. It is _not_ in Sentry as an issue
(the reload path reports nothing), which is why only the abort showed up there.
The abort is a side effect of that same navigation: the page unmounted, the nav
query's observer unsubscribed, the fetch cancelled. Two separate things, one
click — easy to conflate.

(Possible follow-up for the 1gr14 repo, not this card: confirm the stale-chunk
auto-reload actually fires when the failing dynamic import is caught by
`navigateWithTransitions` rather than thrown to the host `ErrorBoundary` — the
breadcrumb shows the import error logged as "Error during navigation", so it may
have bypassed the reload and left the user on a broken transition.)

### Why an abort can never (today) render an error page

Even setting the stale chunk aside — an abort cannot, in the current
architecture, reach a renderable error state:

- **Every Point0 query uses TanStack's own abort signal.** Verified: there is no
  `new AbortController`, no `request.signal`, and no custom `signal` passed into
  any query's `fetchOptions` anywhere in Point0 or in the 1gr14 site (the only
  `signal` in the app is the Ask-AI **direct** `fetchServer` stream, which is
  not a TanStack query — see below).
- **With TanStack's own signal, a cancel is always the "clean" path.**
  `retryer.cancel()` rejects the retryer with a `CancelledError` _first_, then
  `onCancel` aborts the controller (`@tanstack/query-core` `query.ts`). The
  abort makes the fetch reject, but the retryer is already resolved, so
  `if (isResolved()) return` discards Point0's thrown `error0`
  (`retryer.ts:165`). The query **reverts** (`onCancel` →
  `setState({ ...#revertState, fetchStatus: 'idle' })`): previous data kept, or
  `pending`/no-data on an initial fetch. **`query.error` never holds the
  abort.**
- **Point0 renders query errors inline, never throwing to a React boundary**
  (`point0.ts:11947` → `React.createElement(ErrorComponent, …)`), and
  `queriesState` only flags `status: 'error'` when `query.error` is set
  (`point0.ts:11413`) — which, per the point above, an abort never is.

Conclusion: the abort is **Sentry-only noise**; it does not corrupt the query
cache and does not render any error UI. If a real full-screen error was ever
seen alongside this, it was a **different** error during the same (interrupted)
navigation — e.g. the destination page genuinely failing to load. The two are
separable in Sentry: the abort event is captured via `root.on('error')` and its
`extra` carries `side` / `name` (`pointQueryError`) / `point` / `queryKey` /
`mode` and **no** `componentStack`; a real render throw is captured via the host
`ErrorBoundary`'s `componentDidCatch` → `l.error(error, { componentStack })` and
**has** a `componentStack`. Check that field on `19016508…` to confirm it is the
emit.

## Root cause

Point0 treats a **cancellation as a normal query error**. It has no notion of
"this fetch was aborted on purpose" anywhere (grep for
`abort`/`cancelled`/`AbortError` over `packages/*/src` → nothing).

For a server-loader query:

1. The query function forwards TanStack's `signal` into the fetch:
   `fetchOptions: { signal, ...fetchOptions }`
   (`packages/core/src/point0.ts:8986`).

2. TanStack cancels the query (last observer leaves mid-fetch, a `cancelRefetch`
   supersede, etc.). It rejects its retryer with `CancelledError`, then
   `onCancel` calls `abortController.abort()`. The in-flight `fetch` rejects
   with `DOMException("signal is aborted without reason")`.

3. That rejection bubbles `_fetchServerDetailed` (`catch` at `point0.ts:8751`,
   wraps into `error0`) → `_fetchServer` re-throws (`:8795`) → the query
   function's own `catch` (`:8997`) runs `this._emit('pointQueryError', …)`
   (`:9016`) and `throw error0`.

   **Key insight:** the `_emit('pointQueryError')` runs _inside the query
   function_, which completes before the retryer gets to swallow the rejection.
   So the error event fires **even though the query was cancelled** and TanStack
   discards the result and reverts the state.

4. Point0 folds `pointQueryError` into the synthetic `'error'` event —
   `uniqEventerErrorEventNames = ['pointMutationError', 'pointQueryError', 'pointInfiniteQueryError', 'engineFetchError']`
   (`eventer.ts:480`).

5. The app's `root.on('error')` logs it; the logger→Sentry sink ships it (not
   `expected` → not filtered).

Same shape in the infinite-query function: `_emit('pointInfiniteQueryError')` at
`point0.ts:9321`; and in `_fetchServerDetailed`:
`_emit('pointFetchServerError')` at `:8764`. Note `pointFetchServerError` is
**not** in `uniqEventerErrorEventNames`, so a _direct_
`point.fetchServer({}, { signal })` abort (the Ask-AI stream — `1gr14` site
`features/search/client.ts`, which already guards with
`if (signal.aborted) return`) does **not** reach `root.on('error')`. The Sentry
hit comes specifically from the TanStack-backed query layer (`pointQueryError`).

## The fix must NOT write empty data

The query cache is already correct on cancel (it reverts — see above), so the
fix is purely about the **observability emit**. Two hard constraints:

- The query function must keep **throwing** on abort, so TanStack's
  `CancelledError` / revert path stays intact. Returning a value on abort would
  be the genuine cache-corrupting bug (a fake `success` with empty `data`) — do
  not do that.
- We only stop _emitting the error event_ (and stop wrapping/reporting) when the
  failure is a cancellation. Everything else (real fetch failures, redirects)
  keeps its current behaviour.

## Proposed fix (true fix, in the framework)

1. **Detect cancellation in the `catch`, before emitting.** Cheapest reliable
   signal: `signal.aborted === true` (the very signal handed to `fetch`) — this
   mirrors what app code already does on the direct path
   (`features/search/client.ts` → `if (signal.aborted) return`). Optionally also
   treat `error instanceof DOMException && error.name === 'AbortError'` and
   TanStack's `CancelledError` as cancellation, to be robust if a future caller
   introduces a non-TanStack signal.

2. **On cancellation:** skip `_emit('pointQueryError')` /
   `_emit('pointInfiniteQueryError')` / `_emit('pointFetchServerError')` (and
   the error-wrapping/reporting branch), but **still `throw`** so the retryer's
   cancel path is unchanged.

3. **Decide the observability contract** (open question): on cancel, emit
   nothing, or emit a dedicated `pointQueryCancelled` (and a
   `pointQuerySettled{ cancelled: true }`) so apps that want to _count_
   cancellations still can while reporters keyed off `'error'` stay quiet.
   Leaning toward a dedicated "cancelled" outcome — keeps the start/settled
   symmetry and lets the docs state plainly that "a cancellation is a settled,
   non-error outcome." Whatever event is chosen must **not** be added to
   `uniqEventerErrorEventNames` (`eventer.ts:480`).

4. **Apply to all three sites** symmetrically: server query (`:8997`), infinite
   query (`:9302`), and `_fetchServerDetailed` (`:8751`). Mutations (`:9701`)
   use the same shape — fix them too if a mutation can be aborted (e.g.
   component unmounts mid-mutation).

5. **Tests:** start a query, cancel it mid-flight (remove the last observer /
   supersede with `cancelRefetch` / abort the signal), assert (a) no
   `pointQueryError` / `'error'` event fires, (b) the query state reverts
   cleanly (no `error`, no fake-empty `data`, renders loading or keeps
   previous), (c) the same for the infinite query, (d) a real fetch failure
   still emits `pointQueryError` as before (no regression).

## Defense in depth (not triggerable today, but correct to harden)

These cannot be hit by an abort in the current architecture (no custom/request
signals exist, so an abort never lands in `query.error`), but harden them in
case someone later passes a custom `signal` via `.fetchOptions({ signal })` and
aborts it directly (that path _would_ record an abort as a real error state):

- `_Mountable`'s `queriesState` (`point0.ts:11413`) maps any `query.error` to
  `status: 'error'`. Teach it to treat an abort/cancel `query.error` as
  transient (render loading / keep previous), not `error`, so navigation churn
  can never flash the `.error()` page.
- `serializeErrorsInDehydratedState` / `deserializeErrorsInDehydratedState`
  (`query-client.ts`) ship and revive `query.state.error` across the SSR wire
  and hydrate it live. They should drop (not ship) an abort/cancel error rather
  than resurrecting it as a live errored query on the client.

## Site-side mitigation (separate, smaller — track in the `1gr14` repo, not here)

Until the framework fix ships, the site can silence the Sentry noise by
classifying aborts as `expected` (logged, not reported): extend the
`expectedPlugin` `override` in `src/lib/error.ts`, or filter in
`root.on('error')` (`src/lib/root.tsx:48`) / the Sentry sink
(`src/modules/sentry/shared.ts`). Worth keeping as belt-and-suspenders even
after the true fix (covers aborts from third-party fetches), but it is **not**
the real fix — the framework should not emit an error for a cancellation in the
first place.

## References

- Query function emits on abort: `packages/core/src/point0.ts:8981` (`queryFn`),
  `:8997`–`:9018` (`catch` → `_emit('pointQueryError')` + `throw`), signal
  forwarded at `:8986`.
- Infinite-query function, same shape: `:9285`, emit at `:9321`.
- Mutation error path (same modelling): `:9701`.
- Fetch layer wraps + emits: `:8751` (`catch`), `:8764`
  (`pointFetchServerError`), `_fetchServer` rethrow at `:8795`.
- `'error'` aggregation list: `packages/core/src/eventer.ts:480`
  (`uniqEventerErrorEventNames` — note `pointFetchServerError` is absent).
- TanStack always reverts on cancel (no cache corruption, abort never recorded):
  `node_modules/@tanstack/query-core/src/query.ts` (`onCancel` → `setState`
  revert; `fetch` `catch` CancelledError handling),
  `node_modules/@tanstack/query-core/src/retryer.ts:88` (`cancel` →
  `CancelledError` first), `:165` (`isResolved()` drops the late abort
  rejection).
- No abort/cancel awareness, no custom/request signals: grep
  `abort|cancelled|AbortError` and
  `new AbortController|request\.signal|\.signal` over `packages/*/src` → nothing
  (only TanStack's `abortController.signal`).
- Errors rendered inline, never thrown to a boundary:
  `packages/core/src/point0.ts:11413` (`queriesState`), `:11947` (renders
  `ErrorComponent` / for a page `ErrorPageComponent`). Host boundary that
  _would_ catch a render throw: `src/components/other/error-boundary.tsx`.
- Live trigger on the 1gr14 site: Sentry `19016508e3b7467282f85fa5a21da038`;
  reporting chain `src/lib/root.tsx:48` → logger →
  `src/modules/sentry/shared.ts` (`sentryGetSink` ships every non-`expected`
  `error`/`fatal`). Navigation policy that routes pages through the server
  query: `src/lib/root.tsx:34`
  (`prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')`), `:39`
  (`retry: false`).

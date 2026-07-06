# The `suspend` query option & streamed SSR (implementation knowledge base)

How streamed SSR works inside: the `ssr` / `suspend` query options, the
`useSuspenseQuery` / `useSuspenseInfiniteQuery` hooks, the universal
Suspense/ErrorBoundary wrappers, and the platform landmines that shaped every
non-obvious decision. Lives in the `ssr-defer` worktree
(`~/cc/worktrees/point0/ssr-defer`, branch `ssr-defer` off `main` @ v0.1.12) as
uncommitted changes. User-facing docs:
[docs/core/ssr.md](../../docs/core/ssr.md) ("The `ssr` and `suspend` query
options" section). Remaining work:
[dev/backlog/suspend.md](../backlog/suspend.md); planned refactors:
[dev/backlog/refactoring.md](../backlog/refactoring.md).

## The feature in one paragraph

Every per-query options site (`useQuery` / `useInfiniteQuery` call site,
`.query()` / `.infiniteQuery()` closers, `.with(point, input, queryOptions)`,
`.relatedQuery`, the `*QueryOptions` defaults) accepts two orthogonal switches:
`ssr?: boolean` (does the server execute the query during SSR; `false` =
clientLoader-shaped: loading state in the HTML, client fetches after hydration)
and `suspend?: 'auto' | 'server' | 'client' | boolean` (does a pending query
suspend into the nearest positional Suspense boundary, and where).
`'auto'`/omitted — a normal blocking discover-loop participant that suspends
only when waiting is impossible (cascades under streamed boundaries, a
budget-cut loop); `'server'` — never blocks the response: kicked at discovery,
the shell ships with the `.loading()` fallback, the resolved content streams
into the same response (React out-of-order streaming) and an inline push script
seeds the client cache — no refetch, no flicker; `true` — `'server'` +
client-side suspension; `'client'` — client-side suspension only ('auto' on the
server; the client half of `true`, for completeness); `false` — never suspends
anywhere. There are also honest suspense hooks (`useSuspenseQuery` /
`useSuspenseInfiniteQuery`): TanStack v5 parity — `data` non-optional, errors
throw to the boundary, no `enabled`/`ssr`/`suspend` options. Because options
merge, `.queryOptions({ suspend: 'server' })` on a root/layout/page is a
streaming-first "mode" for the whole subtree — no engine switch needed.

## Type surface — one choke point

`ExtraQueryPoint0Options` in
[packages/core/src/types.ts](../../packages/core/src/types.ts) (intersected into
`ExtraUseQueryOptions` and `ExtraUseInfiniteQueryOptions`) covers every
declaration site transitively: the hooks, the three `.query()` overloads,
`.with()` (via `Infer.UseQueryOptions` → `UsePointQueryOptions`),
`.relatedQuery`, all eight `_default*QueryOptions` fields and their setters.
Merging needs no new code — `mergeQueryOptions` is last-wins `Object.assign`, so
the later/more specific `ssr`/`suspend` wins. Both ride the options object
handed to TanStack verbatim (inert unknown keys, read back from `query.options`
in the executor exactly like the existing `enabled` read). The option is
deliberately named `suspend`, NOT `suspense`: TanStack v5 still honors a truthy
legacy `suspense` option (gotcha #5), and the builders additionally neutralize a
stray `suspense` key defensively. Do not add the options to the raw
`UseQueryOptions` aliases (they type `_getServerQueryOptions`'s return).

Call-site options are PARTIAL for infinite queries too: the hook, `.with()` (via
`UsePointQueryOptions`), `getInfiniteQueryOptions`, and the imperative
fetch/prefetch/ensure methods all take `PartialUseInfiniteQueryOptions` — the
required infinite shape (`getNextPageParam`/`initialPageParam`/
`pageParamFromInput`) is declared once on the `.infiniteQuery({...})` close and
the runtime merge fills it in.
`useInfiniteQuery(undefined, { suspend: 'server' })` type-checks. The
`.infiniteQuery({...})` close itself stays strict (that IS the declaration
site).

The suspense hooks have their own option/result types:
`ExtraUseSuspenseQueryOptions` / `PartialUseSuspenseInfiniteQueryOptions` = the
regular ones minus `enabled`, `placeholderData`, `ssr`, `suspend` (a suspense
query can never be disabled or placeholder-filled, and always suspends), and
`UsePointSuspenseQueryResult` = TanStack's real `UseSuspenseQueryResult` /
`UseSuspenseInfiniteQueryResult` — `data` non-optional.

The public point surface lists methods TWICE: the type allowlist
(`WithQueryIfSuitable` in types.ts) and the runtime bind list
(`_assignNicePointMethodsToComponent` in point0.ts — what `_tail` decorates
non-mountable points with). A new point method must be added to BOTH or it
type-checks but is `undefined` at runtime on the client. Single-source-of-truth
refactor planned (see refactoring.md).

## Runtime mechanics

### The SSR phase — one tri-state

`__POINT0_SSR_PHASE__: 'none' | 'discovery' | 'render'` (superstore item in core
`env.ts`, exposed via `_ss`; `clientServerIsolated`, never reaches the HTML).
The single source of truth for every SSR check, exposed publicly as `env.ssr` (a
discriminated union: `active` is `phase !== 'none'`, `phase` is the raw
tri-state, `target` says what the pass is FOR — 'html' page response vs the
render-less 'data' mode, from `__POINT0_SSR_TARGET__`, set by the executor
together with `phase: 'discovery'`). The suspend gate fires at
`phase === 'render'`, and meaningless flag combinations are unrepresentable. On
the client the compiler folds `env.ssr.active/phase/target` to
`false`/'none'/'none' for dead-code elimination (like `env.side.is.*`).

- `'none'` — no SSR underway: the client always; the server outside an SSR pass
  (middleware calls, plain data fetches — the fetcher seeds it explicitly).
- `'discovery'` — set at the start of the discover loop
  (`executor.prefetchAppPagePointDeep`, `rendersCount === 0`). Option-driven
  suspension must NOT fire here: the `useQuery`-based gate returns a plain
  pending result and the EXECUTOR classifies the marker instead. The dedicated
  suspense hooks (no pending return by contract) DO throw here — a promise that
  never resolves, a pure "paused subtree" marker; that is why discovery awaits
  only the SHELL (see Executor below). The render-less data mode
  (`queryClientDehydratedState`) lives its whole life in this phase.
- `'render'` — set by `executor.markSsrRenderPhase()`, called in
  `renderAppAsReadableStream` right after discovery, before the final render
  (the one that becomes the response). The only place the option gate suspends.

### The suspension paths (point0.ts)

**Option gate — `_maybeSuspendQueryByOption`**, called by all four internal
hooks (`_useServerQuery` / `_useServerInfiniteQuery` with
`loaderSide: 'server'`, `_useClientQuery` / `_useClientInfiniteQuery` with
`'client'`). Gates: pending result + outputType `data` + `suspend !== false`,
then per side:

- SERVER: only in `phase === 'render'`; `ssr: false` never suspends (it would
  execute the excluded loader); a client loader never suspends during SSR (it
  cannot resolve there — stays pending, renders the loading state). Every
  pending query with `suspend !== false && suspend !== 'client'` suspends here —
  `'auto'`, `'server'` and `true` are identical at this point; their difference
  lives entirely in the executor's marker classification. `'client'` is excluded
  together with `false`: on the server both never suspend (a still-pending query
  ships its loading state).
- CLIENT: only an explicit `suspend: true | 'client'`.

Then it throws `ensureQueryData(...).catch(() => undefined)`:

- `ensureQueryData` (not a bare wait on the in-flight fetch) is what makes
  CASCADES work: a query revealed only after an outer streamed boundary resolved
  was never seen by discovery, so the suspend path itself must be able to start
  the fetch. TanStack dedupes with the executor's background kick by query hash.
- The `.catch(() => undefined)` is load-bearing — see gotcha #3.

**Suspense hooks tail — `_suspenseHookResult`** (`useSuspenseQuery` /
`useSuspenseInfiniteQuery` public methods force `enabled: true` +
`suspend: true` at call-site level, build the same server/client query options
the regular hooks build, run `useQuery`/`useInfiniteQuery`, then): success →
return (data real, matching the non-optional type); error → THROW to the
boundary (TanStack semantics; on the server a render throw ships the fallback
and the client retries → ErrorBoundary → `.error()`); pending → client: throw
ensure; server render phase: throw ensure (or a descriptive render Error when
the loader cannot run there — `ssr: false` merged from defaults, or a client
loader — a never-resolving throw would hang the open response); server
discovery: throw `new Promise(() => undefined)` — never resolves, nothing awaits
it, the executor kicks the fetch from the cache marker.

### Executor (engine)

- **Discovery awaits the SHELL, not `stream.allReady`**: the promise
  `renderToReadableStream` returns resolves at shell-readiness — everything
  outside suspended boundaries, which is all a discovery pass can observe anyway
  (suspended queries registered themselves in the cache BEFORE throwing). With
  nothing suspended the shell IS the full tree, so the classic whole-HTML flow
  is byte-identical. The per-pass stream object is discarded.
- **Marker classification** in `prefetchAppPagePointDeep`: `ssr: false` markers
  are skipped entirely (like clientLoader queries); `suspend: 'server' | true`
  markers go to `streamedMarkers` — background prefetch kick
  (`void prefetchMarker(...)`, not awaited; `prefetchQuery` never rejects),
  added to `seenQueryHashes`, never counted toward the re-render recursion; the
  rest (`'auto'`, `false`) are the classic awaited, re-render-driving
  participants.
- **`allowedDiscoveryRenders` bounds the query-discovery passes** as well as the
  SsrStore/cookie stabilization ones, counting DISCOVERY RENDERS (not
  re-renders; the paired hard cap is `forbiddenDiscoveryRenders`). A pass's
  markers are still prefetched (awaited — their data reaches the final render);
  only the next render is skipped. The budget limits renders, not data waiting —
  early TTFB stays `suspend: 'server'`'s job. When the budget cuts the loop
  while re-render-worthy markers were on hand, `discoveryCutShort` is set:
  whatever hides behind that data can only surface in the final render, so the
  response must stream (the cache scan below cannot see those queries — their
  branches never rendered). `0` skips discovery entirely: the preamble
  (onPrefetch hooks + `prefetchLoadersBeforePageRender`) still runs, the guard
  sets `discoveryCutShort` and jumps to the loop tail (a mirrored early exit —
  cookie flush, page dehydrated-state snapshot, `X-Point0-Discovery-Renders`
  header, which reports 0). The data-only path is NOT clamped: at `0` it serves
  whatever the warm-up prefetched — a client-navigation prefetch then matches a
  direct visit.
- **`shouldStreamSuspense`** (returned by `markSsrRenderPhase` — the same call
  that flips the phase, so the decision reads the world exactly as discovery
  left it) =
  `sawSuspenseMarkers || discoveryCutShort || hasPendingSuspendableQueries()`.
  The scan: any pending enabled server 'data' query with `suspend !== false` and
  `ssr !== false` still in the cache when discovery ends.
- **`suspenseQueryPolicy: 'background' | 'skip'`** — the HTML path kicks
  streamed markers, the data-only/dehydrated-state path (fetcher's
  `queryClientDehydratedState` branch) passes `'skip'`: no stream to push into,
  the client fetches after navigating.
- `_prefetchPage`'s server-side `serverQuery` policy
  (`prefetchLoadersBeforePageRender`) honors the merged options too via
  `_getMergedSsrSuspendQueryOptions`: `ssr: false` → skip,
  `suspend: 'server' | true` → kick without await, the rest → awaited (full
  warm-up); client-side prefetch untouched. The helper mirrors the real merge
  chains via the shared merge helpers, with KEEP IN SYNC sentinels on both ends
  (single-source refactor planned).

### Response path (engine render.ts / fetcher.ts)

- `waitForAllReady: 'auto'` (fetcher passes it): resolves to
  `!shouldStreamSuspense` (from `markSsrRenderPhase`) — whole-HTML unless the
  final render may suspend. An explicit boolean is respected: `renderAsString`
  with `true` degrades streaming to blocking (right for SSG-ish flows;
  ensure-based suspensions resolve, so allReady completes).
- The final render wraps the app in `<div data-point0 style="display:contents">`
  (self-identifying via the `data-point0` attribute) — see gotcha #1.
- Manual pull pump instead of `pipeThrough` — see gotcha #2.
- `onError` on `renderToReadableStream` → `executor.logStreamRenderError`
  (post-shell render throws, including a suspense hook throwing its query error;
  failed option-gate loaders never reach it — their errors flow through the
  pointQueryError event pipeline).
- Effects seal: on the first streamed chunk (streaming mode only)
  `executor.effects.seal(...)`. Sealed effects are FROZEN: a later
  `effects.set.status/headers/cookies` is DROPPED (mutating the snapshot would
  lie about what was sent) and warns through the core logger (category
  `['ssr']`) — unless it is IDEMPOTENT: re-setting the exact status/header
  value/cookie (canonical `serializeCookie` comparison — attributes count) that
  already went out is not a loss and stays silent, e.g. the final render
  repeating a `setStatus` it already applied during discovery. The warning means
  USER code only: the engine's own status bubble-up after a nested server fetch
  (`_fetchServerDetailed` in core) and the bound `.error()` component's
  page-status write both check `effects.sealed` and skip once the shell left — a
  streamed loader settling post-shell never trips it. `CookieStore.set` is a
  STAGED writer (it never touches `effects.set` during SSR; commits happen only
  between discovery passes), so it checks `sealed` itself with the same
  idempotency rule (value-level, via `serverCookieGetter` — consistent with
  `hasPendingChanges`): a streamed subtree staging a CHANGING cookie post-shell
  gets `CookieStore.set("…") has no effect` (via `effects.sealedReason`) instead
  of a silent drop. NOT covered (known, documented as "cannot feed the re-render
  loops"): an SsrStore write from a post-shell subtree still disappears quietly
  — it never reaches the response, only the SSR render state.

### Push-hydration protocol

- Server: per React flush, the pump prepends
  `<script>window.__POINT0_PUSH_QUERY__("<transformer-serialized payload>")</script>`
  for every newly settled (success OR error) query not already delivered by the
  prefix. Inline scripts execute in document order, so the data lands before
  React's reveal script and before that boundary hydrates. "Already delivered"
  is computed from what the prefix actually carries: the hashes inside the
  page's dehydrated-state snapshot query (taken at end of discovery,
  pending-filtered) — a query settling between that snapshot and the shell is
  correctly pushed. Internal `queryClientDehydratedState` snapshot queries are
  never pushed. Error states are serialized with
  `serializeErrorsInDehydratedState` (public projection in production).
- Prefix bootstrap (same script tag as the dehydrated store): a buffering stub
  `window.__POINT0_PUSH_QUERY__` + `__POINT0_PUSH_QUERY_BUFFER__`.
- Client: `installPushedQueriesReceiver` (core query-client.ts, called by
  `mount()` after `superstore.prepare`, before `hydrateRoot`) replaces the stub,
  drains the buffer, revives errors via `deserializeErrorsInDehydratedState`,
  force-freshens `dataUpdatedAt`/`errorUpdatedAt`, and `hydrate()`s into the
  (lazily created) `__POINT0_QUERY_CLIENT__`. Both script orders (before and
  after the bundle loads) work.
- Dehydration everywhere EXCLUDES pending queries (`shouldDehydrateQuery`, both
  the superstore prefix config and `getQueryClientReadyDehydratedState`) — a
  pending query carries nothing for the client, and dehydrating one makes
  TanStack capture `query.promise` (gotcha #4's tail).

### Universal wrappers (core)

- Entry: every mountable render (Page/Component/Layout/Provider) goes through
  `_MountableWithBoundaries` →
  `<ErrorBoundary0><Suspense fallback={entry loading}>` around
  `createElement(this._Mountable, …)`. CRITICAL: the chain must be an ELEMENT,
  not a direct call — a direct call runs the first chain slice's hooks (e.g. the
  self query) in the caller's instance, OUTSIDE the boundary, and the suspend
  escapes into the shell. Entry fallbacks bind with empty prevMountActions and
  resolve to the point's `_loadingComponent` / `_errorComponent` fields — i.e.
  the LAST `.loading()`/`.error()` declared on the point (each call overwrites
  the field), which keeps the common `.query().loading(L)` ordering intuitive.
- Positional: the `loadingComponent`/`errorComponent` mount actions are WRAPPING
  actions — they rebind, then return a new Suspense/ErrorBoundary around the
  REST of the chain. Positional semantics: the boundary that catches is the
  closest one declared above the suspending/throwing query in the chain.
- `ErrorBoundary0`
  ([packages/core/src/error-boundary.ts](../../packages/core/src/error-boundary.ts)):
  generic class boundary; `renderError` closure (built in point0.ts) does the
  redirect passthrough (RedirectTask / `error0.redirect` → `<Redirect>`) and
  renders the bound ErrorComponent; `resetKey` (location href) drops a caught
  error on navigation. Client render throws land in the mountable's `.error()`
  instead of killing the page; the SPA fallback remains only for errors outside
  every boundary (shell errors still reject the renderer promise → fetcher
  catch).
- Client parity: `mount()` renders the same `data-point0` + `display: contents`
  wrapper; `hydrateRoot` has `onRecoverableError` logging (boundaries can mask
  hydration mismatches).

### Error semantics for a failed streamed loader

Fizz on Bun hangs forever on a rejected suspense thenable (gotcha #3), so "abort
the boundary and let the client retry" is unshippable for the option gate.
Instead — and it is better UX anyway: the thrown thenable always resolves; the
Suspense retry re-render reads the ERROR state from the cache and streams the
mountable's `.error()` in place; the error state is pushed to the client (public
projection in prod) so hydration matches and TanStack's normal client options
decide about retrying. The mountable `.error()` renders only for CHAIN queries
(`.query()` close, `.with`, `.relatedQuery`); a `useQuery` hook called manually
inside a component body leaves error rendering to that component's own code —
same as on the client. The SUSPENSE HOOKS differ deliberately (TanStack
semantics): they THROW the query error — on the server the boundary keeps its
fallback in the HTML and the CLIENT retries after hydration (ErrorBoundary →
positional `.error()`); the pushed error state means the retry reads the cache,
no refetch.

## Known subtleties (deliberate)

- **Dual fallback semantics.** The SUSPEND path picks the boundary POSITIONALLY
  (the closest `.loading()` declared above the suspending query in the chain);
  the plain pending tail render (client, discovery passes, `ssr: false` queries)
  picks the LAST `.loading()` of the whole chain (each `.loading()` call
  overwrites the point's `_loadingComponent` field). Identical for
  single-`.loading()` chains; can differ when a chain declares several.
- **Client suspension and hydration.** `suspend: true` / the suspense hooks
  never suspend during hydration of a streamed page: the pushed query state is
  already in the cache before `hydrateRoot`. They suspend on client navigations
  and fresh inputs, landing in the same positional boundaries.
- **ErrorBoundary reset only on navigation.** A boundary-caught client render
  throw resets via `resetKey` (the location href) — navigating drops the error
  and re-renders children. If a user's error UI refetches the query WITHOUT
  navigating, the boundary stays in error state: query errors normally travel
  through query STATE (never thrown), the boundary holds only render throws, and
  a successful refetch does not reach a subtree the boundary replaced. Decision:
  documented, not coded around — resetting on query success would couple the
  generic boundary to the query cache for a narrow case.
- **Lazy points don't flash the wrappers' fallbacks on navigation.** Client
  navigation awaits the chunk BEFORE rendering (`navigateWithTransitions` →
  `prefetchPage` → `loadPage` → `await point()` — the same thunk `React.lazy`
  uses, so the module cache is warm when React renders). And a point's own
  `React.lazy` boundary sits ABOVE its `_MountableWithBoundaries` wrapper (the
  wrapper exists only once the chunk resolved), so the entry Suspense cannot
  catch its own point's chunk load anyway — a cold chunk rendered outside the
  awaited path would land in the parent layout's boundary. On the server nothing
  is ever lazy: server points are eager-loaded at startup and the page's client
  module is resolved (`loadPage`) before any SSR render. Covered by the
  client-navigation e2e test (no fallback flash in the tale).

## The five platform gotchas (React 19.2 Fizz + Bun 1.3.14 + TanStack 5.101)

Each of these cost real debugging time. Verified with minimal
pure-React/pure-TanStack repros (and, for #5, a stack trace through
`react-query/src/suspense.ts`).

1. **A pending Suspense boundary at the ROOT of React's markup blocks ALL
   streaming.** If no host element wraps the boundary (providers/routers render
   no DOM), Fizz withholds every byte until the boundary resolves, then emits
   completed boundaries in-order — streaming silently becomes blocking. Root
   cause: a root-level boundary may still contribute preamble/head content, so
   the shell cannot commit. Both the bun and browser builds behave this way.
   Fix: the engine renders the app inside
   `<div data-point0 style="display:contents">` (no box, zero layout impact) and
   `mount()` mirrors it for hydration parity. Test-util follow-up: `HtmlView`
   skips `display:contents` elements in previews (they generate no box —
   previews model the visual tree).
2. **`reactStream.pipeThrough(new TransformStream(...))` buffers everything on
   Bun** — zero bytes delivered until the render completes; streaming silently
   reverts to whole-page. Fix: manual pull pump — `getReader()` + a fresh
   `ReadableStream` whose `pull` reads the React stream directly (that is what
   the working pure-React consumers do).
3. **A REJECTED suspense thenable hangs Fizz on Bun forever** — no retry, no
   boundary abort, no onError, the stream never closes. (A resolving thenable
   whose consumer then renders error state streams fine.) Hence
   `throw ensure().catch(() => undefined)` — the thenable must always resolve.
4. **TanStack: `retryOnMount` truthy + ERRORED query + fresh observer ⇒
   optimistic `pending`** ("a mount will retry me") — but nothing ever mounts
   during SSR. For a failed streamed query this produced an endless suspend →
   `ensureQueryData` refetch → reject → ping loop (~2ms per cycle, response
   never closes). Fix: `_getServerQueryOptions` (finite + infinite) forces
   `retryOnMount: false` on the server, next to the other forced-deterministic
   options — which is also why SSR renders the true `.error()` (and error
   `.head()` title) for ANY errored loader instead of an optimistic loading
   state. Related: **dehydrating a pending query captures `query.promise`**
   (TanStack promise-chase); both dehydrate sites exclude pending queries via
   `shouldDehydrateQuery`.
5. **TanStack v5 still honors a truthy legacy `suspense` OPTION inside
   `useBaseQuery`** (the v4 escape hatch survives in
   `react-query/src/suspense.ts` — `shouldSuspend` + `fetchOptimistic`). A
   truthy `suspense` key reaching TanStack makes useBaseQuery fetch-in-render
   and suspend BY ITSELF — starting loaders the data-mode `'skip'` policy
   skipped, and flashing Suspense fallbacks on the client where `'server'` must
   mean nothing. That is why our option is named `suspend`, and the four option
   builders (`_getServer[Infinite]QueryOptions` /
   `_getClient[Infinite]QueryOptions`) additionally set `suspense: undefined` to
   neutralize a stray key from plain-JS callers.

## What the branch touches (all uncommitted in the worktree)

Core: `types.ts` (ExtraQueryPoint0Options — `ssr?: boolean` +
`suspend?: 'auto' | 'server' | 'client' | boolean` with JSDoc;
`PartialUseInfiniteQueryOptions` at every infinite call-site position incl.
`UsePointQueryOptions`; suspense hook types `ExtraUseSuspenseQueryOptions` /
`PartialUseSuspenseInfiniteQueryOptions` / `UsePointSuspenseQueryResult`; the
type allowlist `WithQueryIfSuitable` includes the suspense hooks), `env.ts` +
`internals.ts` (`__POINT0_SSR_PHASE__` tri-state), `point0.ts`
(`_maybeSuspendQueryByOption`; `_suspenseHookResult` + `useSuspenseQuery` /
`useSuspenseInfiniteQuery`; the runtime bind list in
`_assignNicePointMethodsToComponent` includes the suspense hooks;
`_MountableWithBoundaries`; positional wrapper actions; `_renderBoundaryError`;
`_getMergedSsrSuspendQueryOptions`; `_prefetchPage` skip/kick/await handling;
server `retryOnMount: false`; the `suspense: undefined` neutralizer in the four
option builders; loaderless `useQuery` / `useInfiniteQuery` throw
`No loader found on point …` (a coded framework error, `POINT0_POINT_NO_LOADER`,
on every query surface) — the old silent `{ data: {} }` stub is gone; the
nested-fetch status bubble-up and the bound `.error()` component's page-status
write skip sealed effects), `error-boundary.ts` (new), `error.ts` (new codes
`POINT0_POINT_NO_LOADER` + `POINT0_SSR_STREAM_RENDER_ERROR`), `query-client.ts`
(push receiver typed as `DataTransformerExtended`; a failed push hydration logs
via the core logger; pending excluded from dehydrate), `effects.ts` (seal;
sealed effects are FROZEN — writes are dropped, idempotent late writes stay
silent, changing ones warn via the core logger, category `['ssr']`; public
`sealed` / `sealedReason` getters), `cookie-store.ts` (post-shell staging warns
via the logger instead of dropping silently, idempotent-quiet; reads
`env.ssr.active`), `env.ts` (public `env.ssr` discriminated union —
`active`/`phase`/`target`; `__POINT0_SSR_TARGET__` item; `env.side.is.ssr`
REMOVED — the SSR axis moved out of `side`). Engine: `executor.ts` (shell-await
discovery, marker split by `suspend`, kick, `suspenseQueryPolicy`,
discovery-renders budget + zero-render guard + `discoveryCutShort`, `target`
param stored with `phase: 'discovery'`, `markSsrRenderPhase` returning
`shouldStreamSuspense` + cache scan, `logStreamRenderError` — wraps the render
throw into a coded `POINT0_SSR_STREAM_RENDER_ERROR` error with the original as
`cause`, pending excluded from dehydrate, the dev `X-Point0-Discovery-Renders`
header — renamed from `X-Point0-Renders-Count`), `render.ts` (auto
waitForAllReady, `data-point0` wrapper div, manual pump, per-flush push
collector, prefix receiver stub, onError, effects seal, `target: 'html'`),
`fetcher.ts` (`waitForAllReady: 'auto'`, data path
`suspenseQueryPolicy: 'skip'`), `client.ts` (type widening + passthrough; the
deep-prefetch wrapper takes a required `target` its callers pass — the fetcher's
data branch passes 'data'). React-dom: `mount.ts` (wrapper div, receiver
install, onRecoverableError logging via the core logger). Compiler: `file.ts`
(folds `env.ssr.active/phase/target` to constants on the client — replaces the
old `env.side.is.ssr` fold). Tests: `packages/engine/tests/suspend.test.tsx`
(see Tests below), `utils/html-view.ts` (display:contents skip), 6 test files
with updated error-path snapshots, `scripts/slow-tests.ts` (the suspend file is
a slow shard), `packages/core/tests/env.test.ts` (the `env.ssr` union),
`packages/core/tests/effects.test.ts` (sealed idempotency),
`packages/core/tests/point0-no-loader-guard.test.ts` (new — the loaderless throw
on every query surface), `packages/compiler/tests/file.test.tsx` (`env.ssr`
folds), `packages/engine/tests/with.test.tsx` (a throw inside `.with` renders
`.error()` in place). Docs/example: `docs/core/ssr.md`, `docs/core/env.md`
(`env.ssr` section), `docs/points/query.md` + `infinite-query.md` + `page.md` +
`component.md` (suspense hooks + `ssr`/`suspend` options in the method
surfaces), `docs/methods/loading-error.md` (fallbacks-above-loaders habit;
`.error` IS a render boundary now), `docs/methods/with.md` + `mapper.md` +
`docs/core/error-handling.md` (throwing is caught by the mountable boundary),
`docs/methods/stage-methods.md` (`ssr`/`suspend` on the `*QueryOptions`
setters), `docs/engine/compiler.md` (env.ssr folding),
`docs/intro/full-overview.md` (streaming woven into the SSR story; env.ssr;
redirect-throw note), `examples/basic/src/pages/defer-demo.tsx` (live demo,
`/defer-demo`, generated + type-checked, fallbacks declared above the loader).

## Tests

`cd packages/engine && bun test tests/suspend.test.tsx` — one SLOW file
(`scripts/slow-tests.ts`: runs in its own process locally, its own CI shard),
three describes:

- `suspend` — in-process harness (`createTestThings`): shell-before-resolve
  (incremental stream reads with a gated loader), `.with()` streaming, nested
  cascade (inner query invisible to discovery, fetched by the suspend path),
  infinite streaming (per-call `{ suspend: 'server' }` — partial call-site
  options), `ssr: false` (loader never runs), call-site override, data endpoint
  skips streamed/false, `prefetchLoadersBeforePageRender` (kicks streamed
  without awaiting, never runs `ssr: false`), `useSuspenseQuery` streams + its
  error path (fallback ships, error pushed, response closes),
  `allowedDiscoveryRenders` budget cut → 'auto' streams / `suspend: false` ships
  pending, `allowedDiscoveryRenders: 0` → zero-render shell +
  data-endpoint-serves-warm-up, root-level
  `.queryOptions({ suspend: 'server' })` streaming-first, failed streamed loader
  streams `.error()` + push + stream closes, render throw contained (no SPA
  fallback). The shell-before-resolve and failed-loader tests also spy on
  `console.warn` and assert NO sealed-effects warning: the engine's own
  post-shell bookkeeping (nested-fetch status bubble-up, the bound `.error()`
  component's page-status write) must stay silent — the warning is reserved for
  user code. The cookie test asserts the reverse: a streamed subtree staging a
  `CookieStore` cookie post-shell DOES warn (the staged write can never be
  committed). Tests are SERIAL (`it`, not `it.concurrent`) — concurrent gated
  streams in one process interleave badly; a comment in the file guards this.
- `suspend e2e (browser)` — temp dev project (bun bundler, ports 3900-3949)
  - real Chromium via the shared Playwright utils: streaming over HTTP (shell
    before the loader resolves, same response), push-hydration (zero refetch of
    the streamed query after hydration, no hydration-error logs), client
    navigation (the client fetches the query itself; no lazy-chunk fallback
    flash in the tale), failed stream hydrates alive (`.error()` on screen,
    store present — no SPA fallback), `useSuspenseQuery` direct load (streams +
    zero refetch) and client navigation (suspends into the positional
    `.loading()`, then renders).
- `suspend e2e (vite smoke)` — the same streaming-over-HTTP assertion through
  the vite dev server (ports 3950-3999).

## Known limitations (documented in docs/core/ssr.md)

Loaders that resolve after the shell cannot redirect / set cookies / change
status or headers (runtime warning via sealed effects), cannot feed
SsrStore/cookie SSR re-render loops, and a data-dependent `.head()` ships the
loading-state head in the shell (client corrects after hydration). HTML
realities Sergei accepted: Suspense comment markers (`<!--$-->` etc.) and the
one `data-point0` `display:contents` wrapper div inside `#root`.

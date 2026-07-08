# RSC — elements as data (implementation knowledge base)

How Point0's RSC works inside: the codec, the normalize pass, the transformer
wiring, component-point references, preloading, and the platform landmines that
shaped every non-obvious decision. Built as `feat(rsc)` (78487ee1) on the
`ssr-batch` lineage; the follow-up branch `rsc-vite` (0b757e9a, worktree
`~/cc/worktrees/point0/rsc-vite`) adds the vite-parity e2e, three behavior
tests, and the docs rework — merge it in when this lands. User-facing docs:
[docs/core/rsc.md](../../docs/core/rsc.md). Future work:
[dev/backlog/rsc-flight.md](../backlog/rsc-flight.md).

## The feature in one paragraph

A server `.loader()` (of any point: page, layout, query, mutation, component,
provider) can return React elements — as the whole output or nested in the
output object, gated by `.rscDepth(n)`. Elements travel through the app's data
transformer like every other value: plain function components UNFOLD on the
server (their code never ships), component points serialize as name references
and hydrate as interactive islands resolved from the points collection, host
elements/Fragment/Suspense encode structurally. There is no Flight, no
react-server module graph, no directives, no client-side decode step — the
element arrives in `data` already live. That single decision (elements ride the
normal data pipe) is why SSR embed, streamed pushes, client refetches, caching,
and both bundlers work without RSC-specific code.

## The three pieces (all in `packages/core/src/rsc.ts`)

1. **`normalizeRscOutput`** — runs on the server right after the loader resolves
   (executor loader case). Walks the output to the point's resolved
   `.rscDepth()` (objects consume a budget level, arrays are transparent),
   validates element positions, and unfolds plain function components by calling
   them (async awaited, `memo` unwrapped, `forwardRef` rendered with
   `ref: undefined`) until only wire-representable nodes remain. SSR renders
   THIS normalized tree and the wire encodes THE SAME tree — hydration matches
   by construction, not by discipline. Skip-fast path: `rscDataHasElements`
   bails before any work for element-free outputs (the common case).
2. **`encodeRscData` / `decodeRscData`** — the codec. `{ __p0e: { t, k?, p? } }`
   markers inside plain data; `t` is a host tag, `0` = Fragment, `1` = Suspense,
   `{ c: name }` = component-point reference. User keys colliding with `__p0e`
   are `$`-escaped both ways. Encode shares structure where nothing changed.
   Decode rebuilds elements with `createElementSpreadingChildren` — array
   children spread as varargs, or React demands keys on what was a static JSX
   list.
3. **`RscComponentsRegistry`** — the client-side name → component slot cache for
   LAZY references. `resolve(name, load)` kicks the dynamic import immediately
   and hands out a branded wrapper; `drainPending()` awaits all in-flight chunk
   imports so callers hand data to React only with chunks warm.

## Codec totality: the `RSC_REF_BRAND`

The lazy-reference wrapper is **not** `React.lazy` — lazy suspends on its first
render even when its promise is already settled (payload status updates in a
microtask), which flashes fallbacks and disturbs hydration despite the drain.
The wrapper fills a slot the moment the chunk lands and throws the thenable only
when genuinely unloaded. It is BRANDED (`__POINT0_RSC_REF__` = point name) so
encode can turn a decoded reference back into `{ c: name }` — the codec is
total: everything decode produces, encode accepts. This matters in production:
the server's copy of the client points normally resolves REAL mounts (eager,
below), but any collection still holding lazy records (hand-built ClientPoints,
harnesses, re-encoding decoded trees) yields wrappers, and those must survive a
decode → encode roundtrip into the SSR embed. Only the browser e2e caught this
originally — in-process tests have ready mounts in the collection.

## Reference resolution: the points collection IS the registry

No runtime `register()` side-effects in generated files (deliberate review
call). `resolveRef(name)` looks the component up in
`getClientPoints().manager.collection`:

- a statically imported point (instance or its `.X` — same function at runtime)
  → returned directly;
- a lazy aggregator record
  (`{ type: 'component', name, point: async () => import(...) }`) →
  `rscComponentsRegistry.resolve` slot wrapper.

The generator ([generator.ts](../../packages/engine/src/generator.ts)) lists
component points in the CLIENT aggregator as lazy records (each referenced
component gets its own chunk under both bundlers) and enforces per-scope name
uniqueness at emit time (two exports sharing a name would silently render the
wrong component — generation fails with both file paths). The server aggregator
stays endpoint-only; SSR does NOT read `points.server.ts` for references.

**Server side:** `EngineClient` builds its points with
`ClientPoints.createFromSource(source, { eager: true })`
([client.ts](../../packages/engine/src/client.ts) ~403) — the collection holds
plain eager components, so SSR decode resolves real mounts and never suspends on
chunk loads. The executor exposes the per-request copy via
`serverStorageState.__POINT0_CLIENT_POINTS__` (set at SSR-prefetch start,
[executor.ts](../../packages/engine/src/executor.ts) ~983; read ~869).

## Transformer wiring — one-way security

`wrapTransformerWithRsc(transformer)`: serialize/stringify encode elements
FIRST, then run the user transformer (so custom types — superjson `Date`, `Map`,
decimals — keep working INSIDE element props); parse/deserialize run the user
transformer first, decode LAST. Cached per Point0 instance as
`_getTransformerWithRsc` ([point0.ts](../../packages/core/src/point0.ts)).

Where it is applied — OUTPUT ONLY:

- fetcher endpoint responses
  ([fetcher.ts](../../packages/engine/src/fetcher.ts));
- the SSR-embedded dehydrated super-store and streamed push scripts (render.ts /
  document.ts ride `clientPoints.transformer`, which is the wrapped one);
- client-side parsing of those server-produced payloads.

Client INPUT always parses with the RAW transformer (`getTransformer`) — a
`__p0e` marker arriving in an input stays inert JSON. The server never builds
elements or component references from untrusted bytes (the TanStack/Next CVE
class). `toJsonErrorResponse` stays raw on purpose. Naming per review:
`…WithRsc`, never `…Data…`.

## Preloading islands

- Build time: `engine.build` feeds each client `preloadComponentSources`
  (component name → source file) from the generator's in-memory points
  ([engine.ts](../../packages/engine/src/engine.ts) ~770) — BEFORE the bundler
  path splits, so bun and vite share it. The manifest writer
  ([preload-manifest.ts](../../packages/engine/src/preload-manifest.ts)) emits
  `byComponent` (per-component chunk + static closure, minus entry closure) into
  `dist/client/_point0/<scope>/preload-manifest.json`. Bun graphs come from the
  build metafile, vite/rolldown from `chunkGraphFromRollup` — the manifest shape
  is bundler-agnostic.
- Serve time (prod only, `shouldServeModulePreload` gate):
  `collectRscComponentNames(superstore.dehydrate())` runs before the document
  render and the names' chunks merge into the document `modulePreloads` — the
  browser fetches island chunks in parallel with the entry.
- Client-fetch time: `resolveRscComponentPreloads` + registry drain points —
  `_fetchServerDetailed` after parse, `mount()` before `hydrateRoot`, the push
  receiver before hydrating a pushed query. A query resolves only when
  referenced chunks are warm → islands never flash a Suspense fallback because
  code is downloading.

## Query-cache interplay

- **`structuralSharing` default**: element-containing query data is handed back
  fresh instead of deep-merged (TanStack's merge corrupts element trees).
  Shipped as a Point0 default inside `createQueryClient`.
- **`createQueryClient` takes `() => QueryClientConfig`, NEVER a QueryClient**
  (review call): Point0 constructs the client and merges user config over its
  defaults, so the RSC-safe default survives unless explicitly overridden.
  Passing a QueryClient instance THROWS (it structurally satisfies the
  all-optional config type — a silent break otherwise). BREAKING for
  `createQueryClient(() => new QueryClient())` apps: the игрич site
  (`src/lib/query-client.ts`) and start0 must migrate on the next проходка;
  examples/template/docs migrated in-repo.

## Behavior facts locked by tests

- **A referenced component point with its own `.loader`/`.sharedInput`**: during
  SSR its loader runs server-side and the query ships in the dehydrated state —
  the reference's `input` prop travels as data and keys the same query, so
  hydration never refetches. Decoded on the client (refetch/mutation), it
  fetches its own loader like any mounted component. Nothing RSC-specific —
  plain query machinery.
- **Children/slots**: props (children included) travel through the transformer;
  nested elements, server components, and islands-inside-islands all work.
- **A server component that throws**: the unfold `catch` is dead simple —
  `throw ErrorClass.from(error)` (the resolved app error class via
  `options.ErrorClass`, else base `ErrorPoint0`), same as everywhere in the
  framework. `from` keeps an intentional typed error's fields
  (code/status/message survive even across a module boundary, because it reads
  the fields, not `instanceof`) and coerces a plain throw. Nothing is
  editorialized — no typed-vs-runtime heuristic, no `.is()`, no wrapping (an
  earlier friendly-hint wrapper was dropped: it mislabeled a user's own
  `throw new Error(...)` as hook misuse). Hooks in a server component just
  surface React's own "Invalid hook call".
- Whole-output element unfolding to null → empty Fragment stands in (the
  engine's no-output check needs a value). Keys survive unfold (Fragment
  wrapper) and encode/decode (`k`).
- Rejections (all fail the loader naming the path): functions in host/reference
  props, `ref`, class components, context/`React.lazy` elements, `<ClientOnly>`
  (use `.clientOnly()` on the component point), non-component point instances,
  elements deeper than `rscDepth`.

## Bundler parity — zero bundler-specific code

Proven on the `rsc-vite` branch: the SAME shared e2e assertions run as four
describes (bun dev / bun build / vite dev / vite build) in
`packages/engine/tests/rsc.slow.test.tsx`, ports 4100-4199 (moved off 3950-3999,
which collided with suspend.slow's vite smoke under parallel slow shards). Why
parity is free: the codec/executor/fetcher are runtime; the aggregator's lazy
records split natively under rolldown; the vite compiler plugin shares the strip
logic (`Compiler`) with the bun plugin; in vite mode the server is vite-built
too and eager client points resolve through vite SSR (dev) / the vite server
bundle (prod).

## Types gotcha

New chain methods MUST be added to the `Nice*` method-name unions in
`packages/core/src/types.ts` (11 lists) — the class method alone is invisible on
the public chain type and everything after silently degrades to `any`.
`.rscDepth` is server-and-client (isomorphic config), available on every point
type and on `root`/`base`/`plugin` (root default is the promoted pattern).

## Deferred holes (`defer`) — progressive in-tree streaming

`defer(element, fallback?)` (core `rsc.ts`) closes the one real gap vs Flight: a
loader can defer a slow server subtree so `normalizeRscOutput` never awaits it.
It is a recombination of shipped pieces — Suspense-as-wire-node, the
slot-wrapper, the query-push channel — sketched in
[dev/backlog/rsc-flight.md](../backlog/rsc-flight.md).

The moving parts:

- **`defer`** returns a branded marker (`__POINT0_RSC_DEFER__`), TYPED as
  `React.ReactElement` (after normalize the field IS a live `Suspense`, so
  `{data.x}` renders like any RSC output — the brand is an internal detail
  `isDeferred` unwraps). Detected in `rscDataHasElements` + `normalizeData`
  BEFORE the plain-object branch (a branded literal has `Object.prototype`).
- **`normalizeHole`** (server): mints an id in the per-request
  `RscHoleRegistry`, kicks off the subtree's normalization WITHOUT awaiting it,
  and returns a wire `<Suspense fallback>` wrapping a branded server hole slot
  (`serverHoleComponent`). The slot suspends on a **never-rejecting** settle
  promise (a rejected Suspense thenable hangs Fizz on Bun — gotcha #3 in
  suspend.md), renders the resolved subtree on retry, and re-throws a failed
  subtree's error at render (→ nearest boundary; the pushed error state lets the
  client match). Self-wrapping in `Suspense` (not requiring a user ancestor) is
  the Phase-1 choice: foolproof, one boundary per deferred subtree, matches
  `.loading` and TanStack's per-promise `<Suspense>`.
- **Wire node `t: 2`** (`{ t: 2, id }`): `encodeElement` emits it for a
  hole-branded slot (`RSC_HOLE_BRAND`); `decodeElement` resolves it via
  `resolveHoleSlot`.
- **`resolveHoleSlot` is environment-aware — THE load-bearing subtlety.** A
  page/ layer loader's data round-trips the transformer even server-side (it is
  fetched in a NESTED executor and the outer render DESERIALIZES the response),
  so the outer SSR render decodes the hole back to a slot. Decoding to the
  client push-fed slot there would suspend forever (no push on the server) — the
  boundary streams its fallback but never reveals. So `resolveHoleSlot` looks up
  the still-live per-request server `RscHoleRegistry` (via `superstore.getItem`)
  and streams from its entry when present (SSR); only on the client (no server
  registry) does it fall to `rscHolesRegistry.slotComponent(id)` (push-fed).
  This exact hang is what the in-process test caught.
- **Per-request registry propagation.** The registry lives on
  `serverStorageState.__POINT0_RSC_HOLES__` (internals `_ss`,
  `clientServerIsolated`), minted at `prefetchAppPagePointDeep`
  `rendersCount === 0`. Because loaders run in a NESTED executor, it must be
  forwarded like `__POINT0_QUERY_CLIENT__`: the fetcher's nested-run literal
  (`fetcher.ts`) and the executor constructor literal both carry
  `__POINT0_RSC_HOLES__: _ss.__POINT0_RSC_HOLES__.getOrUndefined()`, so a nested
  loader's holes land in the outer render's registry (which the pump drains).
- **Streaming gate.** `markSsrRenderPhase` OR-s in `hasPendingHoles()` — a hole
  still pending when discovery ends forces streaming (else the response blocks
  on `allReady` waiting for the very subtree the hole deferred).
- **Fill delivery — two channels, one payload.** Both serialize the same shape
  via the shared `buildHolePushPayload(entry, ErrorClass)` (engine
  `rsc-stream.ts`) — the encoded subtree, or an error via `serializeStateError`.
  - **SSR push** (`render.ts` pump): `collectNewlyResolvedHoleScripts` drains
    the registry's `takeResolved()` each flush and prepends
    `<script>window.__POINT0_PUSH_RSC__(…)</script>` — the exact
    `__POINT0_PUSH_QUERY__` pattern, incl. the shell bootstrap stub and the
    final drain. `mount()` installs `installPushedRscReceiver` (core
    `query-client.ts`): parse (decodes elements + starts island chunk imports),
    drain `rscComponentsRegistry`, then `rscHolesRegistry.fill(id, …)`. It
    returns a promise for the BUFFERED fills; `mount()` awaits it before
    `hydrateRoot`, so a hole delivered before hydration is filled at hydration.
  - **Client fetch (NDJSON)** (`fetcher.ts` + core `_fetchServerDetailed`): line
    1 is the payload (holes as `{ t: 2 }`), then one line per resolved hole via
    the same `takeResolved()` drain (`createHoleNdjsonStream`, the loop that the
    SSR pump runs per-flush, here run to completion). The client reader
    (`readStreamedRscFetch`) resolves the query/mutation with line 1 at once and
    fills each hole with `applyPushedRscFill` (the receiver's per-fill logic,
    shared) as its line lands.
- **Streaming is gated + transport-scoped.** The client advertises it can read a
  stream with the `POINT0_STREAM_HEADER` (`x-point0-stream`) request header on
  every data/query/mutation fetch (client-side, transform on); the server mints
  the data-path registry and frames NDJSON only when that header is present, and
  echoes it on the response so the reader knows to read incrementally. A
  server-to-server SSR nested fetch and any foreign/OpenAPI client never send it
  → single JSON body, `defer` inlined — zero impact. Client navigation runs the
  same path (the page loader is fetched as `outputType: 'data'`); the
  `queryClientDehydratedState` prefetch frames NDJSON too.
- **Hole ids are globally unique.** Each `RscHoleRegistry` seeds a
  `generateId()` prefix (lazily, on first `defer`), so ids never collide in the
  bundle-wide client `rscHolesRegistry` when several concurrent streamed fetches
  (each with its own server registry counting from 0) plus the SSR push channel
  feed it at once.
- **Error / abort.** An error fill line → the slot re-throws to its nearest
  `ErrorBoundary0` (same as SSR). The reader diffs
  `rscHolesRegistry.pendingIds()` around line-1 decode to learn ITS holes, and
  `failIfPending`s any left when the stream ends (a drop, not a clean close,
  since the server drains every hole before closing) so a hole never spins
  forever. Unmount/navigation aborts the fetch → the reader stops; the server
  stream's `cancel()` stops draining.
- **Client hydration — the one remaining limit, SSR initial load only.** On the
  first document render the server streams the subtree's markup into the
  boundary via Fizz (`$RC` reveal), so it always DISPLAYS, but React never
  re-enters a server-revealed boundary whose client child suspended at
  hydration: an island revealed AFTER hydration displays inert (a hand-thrown
  promise AND `React.use` both fail to resume it — `React.use` was tried and
  reverted). So on the FIRST PAINT, `defer` is for server MARKUP; interactive
  islands go top-level or in a `suspend: 'server'` query. **A CLIENT-fetch hole
  has no such limit** — it renders fresh on the client (no Fizz, no `$RC`), so
  an island inside it is live (proven by the browser e2e on both bundlers). This
  is the Phase 2 payoff.
- **Why `suspend: 'server'` keeps an island live where `defer` doesn't — tested,
  both bundlers.** Both stream through a Fizz-revealed boundary on SSR, so the
  difference isn't the reveal — it's the **observer**. A `suspend` query's
  content subscribes to react-query (`useSyncExternalStore`); when the data
  lands (pushed → cache), the observer forces a CLIENT re-render of the
  subscriber, which mounts the island fresh (handlers attached). A `defer`
  hole's fill only `wake()`s a Suspense thenable — no observer, no re-render, so
  React leaves the server-revealed island inert. Net rule, now pinned by
  `rsc.slow`: interactive slow content on the SSR first paint →
  `suspend: 'server'` (an island element in a suspend query, OR an island with
  its own suspend loader — both verified live); `defer` → pure server markup (an
  island inside it is verified DEAD on first paint, live only on later client
  fetches).
- **Per-hole error fallback — LANDED.** `defer(el, fallback?, errorFallback?)`'s
  3rd arg: a failed subtree renders in its place (scoped to the hole) instead of
  throwing to the nearest boundary. The arg is static markup **or a function of
  the error**, `(error) => …`. The function runs on the server the moment the
  subtree fails (in `RscHoleRegistry.register`'s rejection handler, before the
  entry is marked settled, so every consumer reads a ready entry), and gets the
  error PROJECTED through the app's error class — `projectHoleError` =
  `ErrorClass.from(serializeStateError(ErrorClass, err))`, i.e. public in prod /
  full in dev, the same instance the boundary gets, so nothing private leaks and
  a fallback and a boundary agree. The class is threaded via
  `NormalizeRscOutputOptions.errorClass` (executor passes
  `server.points.manager.root._Error`); it defaults to base `ErrorPoint0` for
  the inline/unit path. The resolved markup rides the error fill
  (`buildHolePushPayload` → `applyPushedRscFill` → the slot renders it), so no
  wire-node change; both `serverHoleComponent` and the client slot honor it. A
  fallback that itself throws is dropped, leaving the original error to bubble.
  The inline (no-registry) path now applies the fallback too.
  `serializeStateError` moved core-internal from `query-client.ts` to `error.ts`
  (its home) so `rsc.ts` can use it without a `rsc ↔ query-client` cycle.
  Verified in-process + browser e2e (both bundlers).
- **RSC errors are ErrorPoint0, never native `Error` — LANDED.** The `rscError`
  factory builds the app's error class (`options.ErrorClass`, else base
  `ErrorPoint0`) with a `code` (`POINT0_RSC_DEPTH_EXCEEDED` /
  `_INVALID_OUTPUT`), so a validation failure (depth, a ref, a function prop, a
  class component, a non-component point) projects public/private and flows
  through the boundary like any framework error. When a **server component
  throws**, the catch is dead simple — `throw ErrorClass.from(error)` — same as
  everywhere else in the framework: `from` keeps an intentional typed error's
  fields (code/status/message survive even across a module boundary, because
  `from` reads the fields rather than trusting `instanceof`) and coerces a plain
  throw. NOTHING is editorialized: no "typed vs runtime" heuristic, no `.is()`,
  no wrapping — a user's own `throw new Error('…')` reaches the boundary /
  `defer` fallback exactly as written (an earlier friendly-hint wrapper was
  dropped: it mislabeled plain throws as hook misuse). Naming: the threaded
  class is `ErrorClass` everywhere, matching the rest of the code.
- **`rscError` eventer event — LANDED.** A failed `defer` subtree is the one RSC
  failure that ESCAPES the loader error events (`pointQueryError` /
  `engineFetchError`): the loader's shell already returned, the subtree fails
  asynchronously, its error is caught in the hole registry and streamed. So the
  pump emits `rscError` (`{ error, label, holeId }`, server side) as it drains a
  failed hole — `emitHoleError` in `rsc-stream.ts`, called from BOTH the SSR
  pump (`render.ts`, root `_emit`) and the NDJSON drain (`fetcher.ts` passes the
  scope-root's bound `_emit`). Added to `uniqEventerErrorEventNames`, so
  `.on('error')` aggregates it. Normalize/encode failures DO propagate as loader
  errors and are deliberately NOT re-emitted (no double report).
- **Still open (Phase 3)**: in-hole island hydration on the SSR path (needs a
  Flight-style client reconciler or a client-reveal mode), promises-as-props,
  and dedup/backrefs.

Tests:

- `packages/core/tests/rsc.test.tsx` — defer normalize (Suspense + hole node,
  not awaited), hole codec roundtrip, fill either order, error re-throw, depth
  guard, no-registry inline degradation; a **function** error fallback runs with
  the failed subtree's error and lands normalized on the entry; a fallback that
  itself throws is dropped so the original bubbles; a server component throwing
  a **typed** point0 error preserves it whole (code kept), not the RSC hint
  wrapper; `failIfPending` fails only an unfilled hole (a delivered one keeps
  its content).
- `packages/engine/tests/rsc.fast.test.tsx` — **SSR push**: single hole streams
  (shell fallback → fill + island ref over `__POINT0_PUSH_RSC__`), THREE holes
  at different speeds stream out of order into one response (each pushed once),
  a throwing subtree never hangs the stream, no-fallback hole. **Client fetch
  (NDJSON)**: a stream-capable fetch frames the defer as NDJSON (line-1 hole, a
  later fill line — no header → single inline JSON); a query hole fills
  progressively and an interactive island INSIDE it is live (clickable); client
  navigation (`queryClientDehydratedState`) frames a page-loader defer as
  NDJSON; a throwing subtree's error reaches the nearest boundary; a mutation
  `defer()` streams and lands as `data.receipt`; a **function** error fallback
  renders the real error in the hole; an island whose OWN loader `defer()`s
  streams its subtree into the page response; a deferred subtree that ITSELF
  defers streams both holes — the inner, minted only when the outer resolves, is
  caught by the drain loop and streams in after it (nested holes, one response);
  and a failed subtree emits the `rscError` event (server-side, aggregated by
  `.on('error')`).
- `packages/engine/tests/rsc.slow.test.tsx` — browser e2e on both bundlers:
  three deferred markup blocks stream in, display, and hydrate with zero
  refetch; the strip test proves a deferred server component's code
  (DEFER_SERVER_MARKER) never ships to the client; and — the Phase 2 payoff — on
  a client navigation an interactive island INSIDE a streamed hole is clickable
  (what an SSR hole can't hydrate). **The SSR interactivity matrix** is pinned
  too: an island inside a `defer` hole is DEAD on the first SSR paint, while the
  same island streamed via a `suspend: 'server'` query — or with its own suspend
  loader — is LIVE (the `defer`-vs-`suspend` division proven, not asserted).
  Islands-within-islands each with their OWN loader hydrate and stay interactive
  (nesting is not the limitation); and `defer`'s function error fallback renders
  a **typed** error's `code` in the browser — `ErrorClass.from` preserves the
  code across the module boundary (the app's `@point0/core` copy ≠ the runtime's
  in a built app), which an in-process test can't exercise.
- `examples/basic` `defer-demo` page runs both a `suspend: 'server'` query block
  and a `defer()` server component.

## Tests & docs inventory

- `packages/core/tests/rsc.test.tsx` — 16 codec units (roundtrips, escaping,
  depth budget, rejections, registry drain).
- `packages/engine/tests/rsc.fast.test.tsx` — 19 in-process. NOTE: the harness
  `render()` is a PURE CLIENT MOUNT (no SSR request, no hydration); SSR-boundary
  assertions go through `fetchSsr`. `fetchPreview` of a streaming page may parse
  oddly — the rendered end state via `render()`/`waitContent` is the reliable
  signal.
- `packages/engine/tests/rsc.slow.test.tsx` — 14 browser e2e on both bundlers
  (registered in `scripts/slow-tests.ts`).
- User docs: [docs/core/rsc.md](../../docs/core/rsc.md) (+ loader,
  stage-methods, component, query-client, ssr pages). Component-point JSX in
  tests and docs uses the instance directly (`<Stats input={…} />`) — `.X` is
  the same function at runtime; pages are NOT JSX-callable (no call signature on
  the plain `Nice*ReadyPoint`), so negative tests keep `<page.X />`.

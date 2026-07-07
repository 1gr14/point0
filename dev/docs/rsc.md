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
  `dist/client/_point0/preload.json`. Bun graphs come from the build metafile,
  vite/rolldown from `chunkGraphFromRollup` — the manifest shape is
  bundler-agnostic.
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
- **Hooks in a server component**: the unfold try/catch wraps React's "Invalid
  hook call" into the friendly "make it a component point" loader error.
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

# RSC — Flight-grade streaming (better-rsc)

Plan for closing the real gap between Point0's "elements as data" RSC and the
Flight-based stacks (Next.js, TanStack Start): **progressive streaming inside
the element tree**. Engineering context: [dev/docs/rsc.md](../docs/rsc.md); the
streamed-SSR machinery this builds on:
[dev/docs/suspend.md](../docs/suspend.md).

## The problem, honestly

External critique of our model (fair parts, triaged):

1. **In-tree streaming — the real gap.** Flight streams a tree progressively:
   the shell ships with holes, async server components fill them as they
   resolve, client Suspense integrates natively. Our `normalizeRscOutput` AWAITS
   every async server component before anything ships — one slow server
   component delays the whole loader payload (the SSR content or the whole
   client-fetch response). TanStack's `renderToReadableStream` /
   `createFromReadableStream` keep this Flight property. We currently cover it
   only at coarser granularity (see "what we already have").
2. **Semantics subset — real but enumerable.** Flight also handles: promises as
   props to client components (streamed), row-level dedup/backrefs for repeated
   subtrees, error digests per boundary. We reject/lack these today. Each is a
   bounded feature, not a protocol wall — tracked in phases below.
3. **Ecosystem compatibility — low practical impact.** Tools built on
   `react-server-dom-*` are framework-internal plumbing; almost nothing
   user-facing consumes raw Flight streams. Revisit if that changes. Adopting
   Flight itself is rejected for the original reasons: a second (react-server)
   module graph kills bundler independence, couples us to experimental builds,
   and breaks the transformer-in-props story. NOTE the seam though: the codec
   lives in a transformer wrapper — if React ever ships a stable,
   environment-light Flight runtime, a per-subtree codec swap is possible
   without touching the pipe (TanStack validated wrapping Flight bytes inside
   another serializer).
4. **Future React drift — a watch item.** Our contract is ours to maintain; the
   surface is small (element shape, Suspense, memo/forwardRef unwrap). Add to
   the release checklist: re-run the RSC suites on each React minor.
5. **Terminology.** "This is not RSC, it's server-rendered element
   serialization + islands" — technically defensible either way; positioning
   question, not engineering. Keep calling the property what it is: server-only
   rendering of parts of the tree.

## What we already have (the assets)

The streaming design below is mostly a recombination of shipped pieces:

- **A total recursive codec** with `Suspense` as a first-class wire node
  (`t: 1`) — holes need a boundary to resolve under; we already encode one.
- **The slot-wrapper primitive** (`RscComponentsRegistry.resolve`): a cached
  component that renders the real thing when its slot is filled and throws the
  thenable when not — built for lazy island chunks, and it is EXACTLY what a
  streamed hole needs on the client. Not React.lazy, on purpose (no settled-
  promise fallback flash).
- **An in-response push channel**: streamed SSR already ships the shell and
  pushes resolved queries into the same HTTP response as inline scripts
  (`__POINT0_PUSH_QUERY__`), with the hydration-timing dance solved (drain
  before hydrate, receiver hydration). Fizz streams out-of-order boundaries
  natively; the full-document render rides it.
- **One pipe**: fills are just more transformer-encoded data — no new
  serialization story.
- **Coarse-grained streaming TODAY** (document as patterns until phases land): a
  slow subtree modeled as a `suspend: 'server'` query streams into the SSR
  response; a slow ISLAND (component point with its own loader) streams via its
  own query. Limitation that motivates this backlog: both force the subtree to
  be a query/island — pure server markup can't stream without becoming client
  code.

## What's missing

1. A way for normalize to NOT await an async server component (deferral).
2. A hole node in the wire format + a client-side hole registry (slot cache
   keyed by hole id instead of component name).
3. Fill delivery: (a) SSR — push scripts, direct analog of query pushes; (b)
   client fetches — a framed streaming response and an incremental fetcher.
4. Error/abort semantics for a hole (fail → nearest boundary; disconnect →
   abandoned holes reject; unmount/navigation → abort upstream work).
5. Dedup/backrefs for repeated subtrees (payload size polish).

## Design sketch, by phase

### Phase 1 — deferred holes over streamed SSR

- **API**: explicit opt-in, matching the `.rscDepth` philosophy — a `defer()`
  wrapper from core: `hero: defer(<SlowHero />)` (name TBD; a `<Defer>` element
  also works). Normalize requires a wire `<Suspense fallback=…>` ancestor for
  every hole — friendly error otherwise ("a deferred subtree needs a Suspense
  boundary with a fallback"). No implicit auto-defer of async components: it
  would silently change existing payload timing.
- **Server**: normalize registers the pending subtree in a per-request hole
  registry (lives on `serverStorageState`, like `__POINT0_CLIENT_POINTS__`),
  emits a hole node on the wire (`t: 2, id`) and hands SSR a slot element that
  throws the promise — Fizz streams the boundary natively, nothing new there.
  When the subtree resolves it is normalized (same pass, `Infinity` budget) and
  pushed as `__POINT0_PUSH_RSC__(id, encoded)` into the response — the exact
  `__POINT0_PUSH_QUERY__` pattern, including the pre-hydration receiver and
  drain coordination.
- **Client decode**: a hole decodes to a registry slot wrapped by the codec (no
  React.lazy, brand it like `RSC_REF_BRAND` so re-encoding stays total). Fill
  arrives → slot fills → boundary retries. Holes are EXCLUDED from
  `drainPending` (they are Suspense-visible by design; the drain is for chunk
  code, which must never flash).
- **Scope**: SSR/page loads only — client-side fetches still await the full
  payload in this phase. That alone matches what streamed SSR gave queries.

### Phase 2 — streaming client fetches

The bigger lift: today the fetcher awaits one JSON body.

- **Framing**: NDJSON on the same endpoints — line 1 the main payload (with
  holes), following lines `{ id, data | error }` fills, terminator line. Framed
  ONLY when the output actually contains holes (header flag, e.g.
  `x-point0-stream: 1`) — hole-free payloads stay plain JSON, zero impact on
  existing clients/OpenAPI.
- **Fetcher**: incremental reader; the query RESOLVES after line 1 (fast data
  fast), fills land in registry slots in place — data identity is stable, so
  react-query's structural sharing and subscribers are untouched; boundaries
  retry as slots fill.
- **Errors/abort**: a fill error makes the slot throw at render → nearest
  ErrorBoundary (reuse the wire `Suspense`+`.error()` composition); stream end
  with unfilled holes rejects them; navigation/unmount aborts the reader and the
  server observes cancellation to stop loader work.
- **Known platform caveat** (inherited from streamed SSR, see
  [dev/backlog/suspend.md](suspend.md)): proxies/gzip may buffer — verify
  progressiveness on the deployed target, feature degrades to "arrives at once",
  never breaks.

### Phase 3 — parity polish

- Promises as props to component points (a hole in props position — same
  registry, prop-slot decode).
- Subtree dedup/backrefs in the codec (`{ r: n }` nodes) — measure first; our
  payloads are already small next to Flight's row format.
- Size/latency baseline vs Next and TanStack Start on the benchmarks repo.

### Non-goals

Flight byte-compatibility; `'use server'` actions; a react-server module graph.
These are the exact costs the model was chosen to avoid — the phases above add
Flight's _useful property_ (progressive tree delivery) without them.

## Article follow-ups (positioning, from the critique)

- Add the explicit-tradeoff paragraph: "Point0 does not try to be
  Flight-compatible — deliberate tradeoff: we lose Flight tooling compatibility
  and some native semantics (in-tree streaming — on the roadmap), we gain a
  data-first model through the same loaders, serializer, cache, SSR, and refetch
  as the rest of the framework."
- Soften "CVE class closed by construction" → "the class caused by deserializing
  client-sent RSC payloads does not apply: the element codec is output-only".
- Don't claim streaming parity until Phase 1 ships; today's honest wording:
  "streamed SSR pushes elements at query granularity; in-tree holes are
  planned".

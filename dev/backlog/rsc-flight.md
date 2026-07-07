# RSC — Flight-grade streaming (better-rsc)

Plan for closing the real gap between Point0's "elements as data" RSC and the
Flight-based stacks (Next.js, TanStack Start): **progressive streaming inside
the element tree**. Engineering context: [dev/docs/rsc.md](../docs/rsc.md); the
streamed-SSR machinery this builds on:
[dev/docs/suspend.md](../docs/suspend.md).

## Status — Phase 1 landed, Phase 2 is next (START HERE for a new session)

**Done (Phase 1, worktree `rsc-flight` off `ssr-batch`, uncommitted):**
`defer()` streams a slow server subtree over **SSR / the initial page load** —
the shell ships with a fallback and the resolved markup pushes into the SAME
HTML response (`__POINT0_PUSH_RSC__`, the RSC twin of the streamed-query push).
Works for server MARKUP; verified in-process + browser e2e on both bundlers.
Full mechanics + the gotchas: [dev/docs/rsc.md](../docs/rsc.md) → "Deferred
holes (`defer`)".

**The one honest limitation found while building Phase 1:** an interactive
island INSIDE a hole DISPLAYS but is not hydrated on the initial SSR load —
React completes the Fizz-revealed boundary from the server stream and never
re-enters the suspended client child (a non-Flight streaming limit; the query
path shares it, it just never streamed an island). So TODAY: `defer` = server
markup; interactivity = top-level islands or `suspend: 'server'`.

**Next — Phase 2 (the payoff), fully specced below.** Make streaming work for
CLIENT-initiated fetches too — client navigation, mutations, refetches — not
just SSR. This closes most of the remaining TanStack-parity gap AND **fixes the
interactivity limitation for everything after the first load**: a client-fetch
hole renders FRESH on the client (no Fizz `$RC`), so islands inside it are live.
The mechanism is 90% reused from Phase 1; the new work is the transport (NDJSON)
and an incremental client reader. Jump to "### Phase 2".

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

### Phase 1 — deferred holes over streamed SSR — ✅ LANDED

`defer(element, fallback?)` from `@point0/core`. Full mechanics + the 3 platform
gotchas: [dev/docs/rsc.md](../docs/rsc.md) → "Deferred holes (`defer`)". Files:
core `rsc.ts` (defer, `t: 2` hole wire node, `RscHoleRegistry` server +
`RscHolesRegistry` client, env-aware `resolveHoleSlot`, `normalizeHole`),
`query-client.ts` (`installPushedRscReceiver`), `internals.ts`
(`__POINT0_RSC_HOLES__`); engine `executor.ts` (mint the registry + the
`hasPendingHoles()` streaming gate + pass it to `normalizeRscOutput`),
`render.ts` (pump pushes `__POINT0_PUSH_RSC__` + the shell stub), `fetcher.ts`
(forward the registry to nested runs); react-dom `mount.ts` (await buffered
fills before `hydrateRoot`).

Two calls that changed from the original sketch:

- **`defer(el, fallback?)` self-wraps in `Suspense`** (foolproof — no
  user-provided-ancestor requirement, works as a bare field or inside a tree,
  one boundary per subtree, matches `.loading` / TanStack's per-promise
  `<Suspense>`).
- **`resolveHoleSlot` is environment-aware.** A loader's data round-trips the
  transformer even server-side (nested-executor fetch → outer render
  deserializes), so the outer render DECODES the hole back and must resolve it
  against the live per-request server registry (stream from the resolving
  subtree), NOT the client push slot (which never resolves on the server — that
  hangs the response). This was the load-bearing surprise.

**Limitation discovered (carry this forward):** the server streams the subtree
markup via Fizz (`$RC` reveal) so it always DISPLAYS, but React does not
client-hydrate a boundary whose client child suspended at hydration — a hole
revealed AFTER hydration displays inert (`fibers = 0` on the content). So an
**interactive component point inside a deferred subtree is not wired on first
paint**. Neither a hand-thrown promise nor `React.use` resumes it (`React.use`
was tried and reverted — no hydration win, and it is uncallable outside a render
so the codec units couldn't exercise it). The query path dodges this only
because its content is a stable cache-reading component nudged by its observer,
and it never streamed an interactive island. Net: `defer` is for server MARKUP;
interactivity → top-level islands or `suspend: 'server'`. **Phase 2 resolves
this for client fetches** (client render, no `$RC`). Documented in
docs/core/rsc.md + dev/docs/rsc.md.

Tests: core `rsc.test.tsx` (defer normalize, hole codec, fill either order,
error, depth guard, no-registry inline degradation); engine `rsc.fast.test.tsx`
(single hole; THREE holes at different speeds out-of-order in one response; a
throwing subtree = no hang; no-fallback hole; a mutation's `defer()` degrades to
an inline server render as `data.element`); engine `rsc.slow.test.tsx` browser
e2e on both bundlers (three markup blocks stream + display + hydrate with zero
refetch; a deferred server component's code is stripped from the client).
Example `examples/basic` `defer-demo` runs both a `suspend: 'server'` block and
a `defer()` server component.

### Phase 2 — streaming client fetches (THE NEXT BUILD — detailed plan)

**Goal in one line.** The "shell first, slow parts stream in" experience — today
only on the first SSR page load — should also work for everything the client
initiates once the app is live: **client navigation, mutations, query refetches
/ `ssr: false` queries**. Today those await one JSON body, so `defer` in that
context degrades to inline (correct result, no progressiveness).

**Why it's the high-value step.**

1. Closes most of the remaining TanStack-parity gap — they stream any server
   output to the client (`createFromReadableStream`), we only stream SSR.
2. **Fixes the Phase-1 interactivity limitation** for client fetches: a
   client-fetch hole renders FRESH on the client (no Fizz, no `$RC`), so
   interactive islands inside it are LIVE. The hydration conflict simply does
   not exist on this path.
3. Enables `defer` in mutations (the question that kicked this off): a mutation
   returning `{ card: <Card/>, related: defer(<Slow/>) }` sends `card` at once
   and streams `related`. Level (whole-output vs field) does not matter — the
   blocker was always the transport, and field-level holes are the general case.

**Already built → REUSE as-is (do NOT rebuild):**

- `defer()`, the `t: 2` hole wire node, the codec (`encodeRscData` /
  `decodeRscData`).
- `RscHoleRegistry` (server, per-request): `register()` (kicks the subtree's
  normalization un-awaited) + `takeResolved()` (the same drain the SSR pump
  uses).
- `rscHolesRegistry` (client): `slotComponent(id)` / `fill(id, …)`.
- `normalizeHole` — makes the hole + registers the subtree.
- The registry is ALREADY forwarded into nested fetcher runs (`fetcher.ts`
  literal `__POINT0_RSC_HOLES__: _ss.__POINT0_RSC_HOLES__.getOrUndefined()`).
- `resolveHoleSlot` env-awareness — on the CLIENT it returns the fill-fed slot,
  which is exactly what a client-fetch hole needs.

**NEW work (this is the whole of Phase 2):**

1. **Mint a hole registry on the DATA-fetch path.** Today only
   `prefetchAppPagePointDeep` (the page SSR render) mints
   `__POINT0_RSC_HOLES__`; a plain data / mutation fetch does not, so `defer`
   inlines (`_ss.__POINT0_RSC_HOLES__.getOrUndefined()` is `undefined` at
   `executor.execute` normalize sites ~677/701 → `normalizeHole` awaits inline).
   Mint a fresh `RscHoleRegistry` on the data-fetch path (in `fetcher.ts`, the
   non-HTML branch that runs the loader / `queryClientDehydratedState`) so
   `normalizeHole` produces holes. First checkpoint: an in-process test that a
   client fetch of a `defer`-ing loader yields a `{t:2}` hole in the serialized
   body instead of inlined content.

2. **NDJSON framing on the response (server, `fetcher.ts`).** When the
   serialized output contains holes (registry non-empty), stream the response as
   NDJSON instead of one JSON body:
   - line 1 = the main payload (RSC-transformer-serialized, holes as
     `{t:2,id}`);
   - then, per resolved hole, one line: RSC-transformer-serialized
     `{ id, data }` or `{ id, error }` (errors via `serializeStateError`,
     exactly like `render.ts`'s `collectNewlyResolvedHoleScripts`);
   - a terminator line, then close.
   - Gate on a response header (e.g. `x-point0-stream: 1`) so hole-free payloads
     stay plain JSON — zero impact on existing clients, OpenAPI, non-streaming
     consumers. The drain loop is the SAME `holeRegistry.takeResolved()` the SSR
     pump uses in `render.ts` — factor it into a shared helper (`render.ts` and
     `fetcher.ts` both call it; render wraps each batch in
     `<script>__POINT0_PUSH_RSC__(…)</script>`, fetcher writes raw NDJSON
     lines).

3. **Incremental reader on the CLIENT fetcher (core).** Find where the client
   parses a fetch response body — the client half of `_fetchServerDetailed` /
   the fetch the query & mutation machinery call (grep core for where the
   response text is `transformer.parse`d on the client). Today: `await` the
   whole body, parse, done. Phase 2: if `x-point0-stream` is set, read the body
   incrementally (a `ReadableStream` reader split on `\n`):
   - line 1 → parse (RSC transformer → holes decode to client slots) → RESOLVE
     the query/mutation with THIS data now (fast data fast). react-query
     structural sharing keeps data identity stable, subscribers untouched.
   - each following line → `rscHolesRegistry.fill(id, decoded)` → the client
     hole slot reveals its subtree (fresh client render → island interactive).
   - stream end → any still-unfilled holes reject (their slots throw to the
     boundary).

4. **Error / abort semantics.** A fill line with `error` →
   `rscHolesRegistry.fill` the revived error → the slot throws at render →
   nearest `ErrorBoundary0`. Stream ends with holes unfilled → reject them.
   Client navigates away / unmounts mid-stream → abort the reader; the server
   should observe cancellation and stop the loader work (the SSR pump already
   cancels the React stream on `cancel(reason)` — mirror for the data stream).

**Suggested order of attack:** (1) mint the registry on the data path + prove a
hole is produced (in-process); (2) server NDJSON framing behind the header flag;
(3) client incremental reader (resolve after line 1, fill per line); (4) wire
into client navigation + mutation + refetch, test each in-process; (5) browser
e2e: navigate to a `defer` page, assert fast parts show first, slow streams in,
AND an island inside a client-fetch hole is CLICKABLE (the interactivity SSR
holes lack — this is the proof that Phase 2 buys it back).

**Known caveat (inherited):** proxies / gzip can buffer NDJSON — verify
progressiveness on the deployed target (igrich / start0); it degrades to
"arrives at once", never breaks. See [dev/backlog/suspend.md](suspend.md).

### Phase 3 — parity polish & beyond

- Promises as props to component points (a hole in props position — same
  registry, prop-slot decode).
- Subtree dedup / backrefs in the codec (`{ r: n }` nodes) — measure first; our
  payloads are already small next to Flight's row format.
- Size / latency baseline vs Next and TanStack Start on the benchmarks repo.
- **SSR-streamed INTERACTIVE content** (the Phase-1 limitation, for the SSR path
  only). To make an interactive island inside an SSR hole hydrate, we'd need
  either a Flight-style client reconciler or a "client-reveal" mode (the server
  ships the fallback, the client renders the content — interactive, but the
  content leaves the SSR HTML, losing no-JS / fast-paint). Open design question,
  LOW priority: Phase 2 covers the client-fetch case, and `suspend: 'server'` /
  top-level islands already cover interactive content on SSR.
- **Composite Components** (TanStack's Apr-2026 RSC post): the server renders
  markup with OPEN slots that the CLIENT fills with its own client components
  (render props / children), instead of the server naming every island up front.
  A genuinely different primitive from our server-named component-points —
  decide whether it fits our model (our page component already composes server
  fragments as siblings; this would let the client inject INTO server markup at
  named join points). Separate track, not blocking Phase 2.

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
- Streaming wording now that Phase 1 shipped: "streamed SSR pushes elements at
  query granularity AND in-tree via `defer` (server markup)". Do NOT yet claim
  full parity for interactive/client-side streaming — that is Phase 2. Honest
  line: "progressive in-tree streaming of server markup on the initial load;
  client-side streaming (navigation, mutations) is on the roadmap".

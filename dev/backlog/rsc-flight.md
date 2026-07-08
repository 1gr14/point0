# RSC — Flight-grade streaming: backlog

`defer()` progressive in-tree streaming shipped (initial SSR load AND client
fetches — navigation, mutations, refetches). How it all works — the codec, the
hole registry, the two delivery channels, the gotchas — lives in
[dev/docs/rsc.md](../docs/rsc.md) → "Deferred holes (`defer`)". This card is
only what is LEFT to do and what each item buys.

## TODO

- [ ] **SSR-streamed INTERACTIVE content** — the one honest limit that remains.
      An island inside a `defer` hole displays on the first SSR paint but its
      handlers stay unwired: React never re-enters a server-revealed `Suspense`
      boundary whose child suspended at hydration. **Gives:** slow _interactive_
      content live on the very first paint through plain `defer`, with no
      `suspend`. Needs either a Flight-style client reconciler or a
      "client-reveal" mode (the server ships the fallback, the client renders
      the content — interactive, but the content leaves the SSR HTML, losing
      no-JS / fast-paint). **LOW priority:** `suspend: 'server'` and top-level
      islands already cover first-paint interactivity, and every client fetch
      after the first paint already has no such limit.
- [ ] **Promises as props to component points.** A hole in _prop_ position (same
      registry, a prop-slot decode). **Gives:** hand a still-resolving value
      straight to an island prop and let it stream in, instead of having to wrap
      the whole subtree in `defer`.
- [ ] **Subtree dedup / backrefs in the codec** (`{ r: n }` nodes). **Gives:**
      smaller payloads when the same subtree repeats. Measure first — our
      payloads are already small next to Flight's row format, so this may not
      earn its complexity.
- [ ] **Composite Components** (from TanStack's Apr-2026 RSC post). The server
      renders markup with OPEN slots that the CLIENT fills with its own client
      components (render props / children), instead of the server naming every
      island up front. **Gives:** the client injects INTO server markup at named
      join points — a genuinely different primitive from our server-named
      component points. Separate track; first decide whether it fits our model
      (the page component already composes server fragments as siblings).
- [ ] **Size / latency baseline vs Next and TanStack Start** on the benchmarks
      repo. **Gives:** numbers behind the "same progressive-delivery property,
      far less machinery" claim.
- [ ] **Release guard: re-run the RSC suites on each React minor.** The contract
      is ours (element shape, `Suspense`, `memo`/`forwardRef` unwrap) — small
      surface, but worth a check against React drift. Add to the release
      checklist.

## Non-goals (deliberate — the costs the model was chosen to avoid)

Flight byte-compatibility, `'use server'` actions, a second (react-server)
module graph. These are exactly what a data-first, transformer-based model
trades away; the work above adds Flight's _useful_ property (progressive tree
delivery) without them. The seam is left open, though: the codec lives in a
transformer wrapper, so if React ever ships a stable, environment-light Flight
runtime, a per-subtree codec swap becomes possible without touching the pipe.

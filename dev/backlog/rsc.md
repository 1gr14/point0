# RSC — what's next (and what deliberately isn't)

`defer()` progressive in-tree streaming shipped (initial SSR load AND client
fetches — navigation, mutations, refetches), with heartbeats, per-hole
deadlines, and the full validation pass — and promises as island props shipped
on top of the same machinery (`<Stats slowStats={promise} />` — a `{ t: 3 }`
hole in prop position the client reads with React 19 `use()`). How it all works
— the codec, the hole registry, the two delivery channels, the gotchas — lives
in [dev/docs/rsc.md](../docs/rsc.md). The public framing of the same list
(edges, planned, non-goals) is the "The model's edges" section of
[docs/core/rsc.md](../../docs/core/rsc.md) — keep the two in sync. Benchmarks
live in their own repo (`point0-benchmarks`, see its `PLAN.md`); the React-minor
release guard sits in the release checklist
([dev/docs/releasing.md](../docs/releasing.md)).

## Not doing — recorded for information

- **SSR-streamed INTERACTIVE content inside a `defer` hole.** An island inside a
  hole displays on the first SSR paint but its handlers stay unwired: React
  never re-enters a server-revealed `Suspense` boundary whose child suspended at
  hydration. Technically possible via a Flight-style client reconciler or a
  "client-reveal" mode (server ships only the fallback; the content leaves the
  SSR HTML, losing no-JS and fast-paint) — both cost exactly what this model was
  chosen to avoid, and `suspend: 'server'` / top-level islands cover first-paint
  interactivity as first-class patterns. Not planned; stated publicly in
  docs/core/rsc.md.
- **Subtree dedup / backrefs in the codec** (`{ r: n }` nodes). Smaller payloads
  when the same subtree repeats — but our payloads are already small next to
  Flight's row format. Not doing until a REAL issue about payload size arrives;
  the wire-size benchmark in `point0-benchmarks` is the measurement that would
  reopen this.
- **Composite Components** (from TanStack's Apr-2026 RSC post): the server
  renders markup with OPEN slots the CLIENT fills with its own components — a
  genuinely different primitive from our server-named component points. Only if
  a real issue / user request for it lands; then the first step is deciding
  whether it fits the model at all (the page already composes server fragments
  as siblings).

## Non-goals (deliberate — the costs the model was chosen to avoid)

Flight byte-compatibility, `'use server'` actions, a second (react-server)
module graph. These are exactly what a data-first, transformer-based model
trades away; the work above adds Flight's _useful_ property (progressive tree
delivery) without them. The seam is left open, though: the codec lives in a
transformer wrapper, so if React ever ships a stable, environment-light Flight
runtime, a per-subtree codec swap becomes possible without touching the pipe.

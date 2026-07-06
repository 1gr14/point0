# Refactoring backlog

Planned structural refactors — none of them block shipping; the code works and
reads fine today. The bar for doing any of these: it must REMOVE a real drift
risk or make code easier to read in place. No helpers for helpers' sake, no DRY
for the line count — if duplicated code reads predictably where it is,
duplication stays. Tick items off as they land.

- [ ] **One source of truth for the public point method surface.** The method
      list lives twice with nothing keeping them in sync: the type allowlist
      (`WithQueryIfSuitable` in packages/core/src/types.ts) and the runtime bind
      list (`_assignNicePointMethodsToComponent` in packages/core/src/point0.ts
      — what `_tail` decorates non-mountable points with). Adding
      `useSuspenseQuery` required editing both, and missing the runtime one
      produced a client-only "point.useSuspenseQuery is not a function" that
      types could not catch. Refactor: a single
      `const POINT_QUERY_METHODS = [...] as const` — the runtime binds over it,
      the type derives from `(typeof POINT_QUERY_METHODS)[number]`. This one
      PREVENTS a proven bug class, not just lines.

- [ ] **Collapse the four query-option builders.** `_getServerQueryOptions`,
      `_getClientQueryOptions`, `_getServerInfiniteQueryOptions`,
      `_getClientInfiniteQueryOptions` (packages/core/src/point0.ts) are four
      near-identical walls: the retry closure is pasted four times, the
      server-forced deterministic options twice, the event scaffolding almost
      identical, and one-line policy changes (e.g. the `suspense: undefined`
      neutralizer, `retryOnMount: false`) must be pasted into all four. One
      parameterized builder (side × finiteness) — but only if the result reads
      top-to-bottom as clearly as the current copies; otherwise keep the copies
      and accept the 4x edits.

- [ ] **Share the merge-source lists between the real builders and
      `_getMergedSsrSuspendQueryOptions`.** The cheap reader mirrors the
      builders' merge chains and is guarded only by KEEP IN SYNC sentinel
      comments (packages/core/src/point0.ts) — one silent drift already happened
      (the copy missed `_infiniteQueryOptions`). Extract the source lists
      (`defaults → kind defaults → close options → call site`) into one place
      both consume. Natural companion to the builder collapse above.

- [ ] **Deduplicate `_prefetchPage`'s two prefetch blocks.** The relatedQueries
      block and the self-queries block (packages/core/src/point0.ts) repeat the
      same policy ladder (mode resolution, hasLoaderForMode, ssr/suspend
      skip-kick-await) with only the options/input source differing — and the
      ssr/suspend block is pasted verbatim in both. Worth one honest helper for
      the ladder IF it keeps the two call sites readable; the method is also a
      giant worth splitting while at it.

- [ ] **Shrink point0.ts.** ~13,500 lines and growing; the suspension machinery
      added this branch (`_maybeSuspendQueryByOption`, `_suspenseHookResult`,
      the suspense hooks, `_MountableWithBoundaries`, `_renderBoundaryError`) is
      self-contained enough to move into its own module the way
      `error-boundary.ts` already did. Helps navigation and keeps chain-typing
      perf pressure down. Do it as plain code moves, not as an abstraction pass.

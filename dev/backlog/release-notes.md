# Next release (ssr-batch) — notes & pre-release checks

What the `ssr-batch` release announcement must carry, plus the two checks that
can only happen at проходка time. Distilled from the retired
`dev/backlog/suspend.md` working checklist (its implementation items all landed;
игрич + start0 already verified against this branch). Done items get deleted.

## Verify at проходка

- [ ] **Streaming survives production proxies.** Railway/edge + gzip can buffer
      responses: locally the stream is progressive, in prod it may arrive as one
      chunk (TTFB win lost, feature silently inert). NDJSON responses now send
      `X-Accel-Buffering: no`, but that only covers nginx-style proxies — check
      a deployed page with a streamed query (and a `defer()`) actually streams
      in the browser.
- [ ] **Type-perf trace on the игрич codebase.** Chain typing perf is sensitive
      (see `point0-chain-types-perf`); the `ExtraQueryPoint0Options`
      intersection + `PartialUseInfiniteQueryOptions` call-site switch +
      suspense hook types are small but worth one trace run to confirm no
      regression.

## Release-note bullets

- **Docs recommendation (not a behavior change):** what SSR renders for a FAILED
  loader explicitly follows TanStack's `retryOnMount`, exactly like a client
  mount (default unset → `true` renders the loading state, the client retries on
  mount — same as before; `retryOnMount: false` renders the real `.error()` +
  its `.head()` into the SSR HTML). Recommended:
  `.queryOptions({ retryOnMount: false })` on the root — every example now does.
  See "Failed loaders and retryOnMount" in docs/core/ssr.md.
- **BREAKING rename:** `ssr.allowedRerendersCount` /
  `ssr.forbiddenRerendersCount` → `ssr.allowedDiscoveryRenders` /
  `ssr.forbiddenDiscoveryRenders`, now counting DISCOVERY RENDERS instead of
  re-renders (old `N` ≡ new `N + 1`; an explicit old value must be bumped by
  one). New capability: `allowedDiscoveryRenders: 0` skips discovery entirely —
  earliest shell, everything streams.
- **Server behavior:** the engine loads the client points EAGERLY on the server
  (`ClientPoints.createFromSource(…, { eager: true })`): every page/layout
  module is imported up front, so SSR never suspends on a `React.lazy` chunk.
  Visible effects: slightly heavier dev boot, fully-warm prod boot; the first
  `queryClientDehydratedState` request per process no longer misses the page's
  queries. The browser bundle keeps the lazy collection (code splitting
  unchanged).
- **SPA boot behavior:** on the very first client-side mount of an SPA
  (`ssr: false` client, no server HTML) the root/layout `.loading()` now renders
  while the first page chunk loads — previously the root stayed BLANK until the
  chunk was ready. Client NAVIGATIONS are unaffected (`loadPage` pre-warms the
  lazy page instance) — pinned by the prefetch-page suite.

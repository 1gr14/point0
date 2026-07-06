# suspend / streamed SSR — remaining work

Working checklist for the `ssr-defer` branch (worktree
`~/cc/worktrees/point0/ssr-defer`). Engineering context:
[dev/docs/suspend.md](../docs/suspend.md). Post-merge refactors live separately
in [refactoring.md](refactoring.md). Done items get deleted, not ticked — this
file only carries what is left.

## Verify before releasing (проходка)

- [ ] **Run the игрич site and start0 against this branch** via
      `bun install-point0.js`. The wrappers are universal — every page of every
      app gets the entry boundaries; eyeball layouts for general weirdness. (The
      `data-point0` wrapper div is gone — React renders the whole document, so
      `#root > *` selectors are not a concern anymore. First pass done
      2026-07-06 on the streaming-document worktree: both apps' `test:e2e:build`
      green.)

- [ ] **Verify streaming survives production proxies.** Railway/edge + gzip can
      buffer responses: locally the stream is progressive, in prod it may arrive
      as one chunk (TTFB win lost, feature silently inert). Check a deployed
      page with a streamed query actually streams in the browser.

- [ ] **Type-perf trace on the игрич codebase.** Chain typing perf is sensitive
      (see `point0-chain-types-perf`); the `ExtraQueryPoint0Options`
      intersection + `PartialUseInfiniteQueryOptions` call-site switch +
      suspense hook types are small but worth one trace run to confirm no
      regression.

- [ ] **Release-note bullet** (docs recommendation, not a behavior change): what
      SSR renders for a FAILED loader now explicitly follows TanStack's
      `retryOnMount`, exactly like a client mount (the default, unset → `true`,
      renders the loading state and the client retries on mount — same as before
      this release; `retryOnMount: false` renders the real `.error()` + its
      `.head()` into the SSR HTML). Recommended: set
      `.queryOptions({ retryOnMount: false })` on the root — every example now
      does. Loader redirects and error HTTP statuses reach the response in both
      modes; the suspense hooks throw to the boundary on the server regardless
      (nothing can "retry on mount" there). See "Failed loaders and
      retryOnMount" in docs/core/ssr.md.

- [ ] **Release-note bullet** (breaking rename): `ssr.allowedRerendersCount` /
      `ssr.forbiddenRerendersCount` → `ssr.allowedDiscoveryRenders` /
      `ssr.forbiddenDiscoveryRenders`, now counting DISCOVERY RENDERS instead of
      re-renders (old `N` ≡ new `N + 1`; an explicit old value must be bumped by
      one). New capability: `allowedDiscoveryRenders: 0` skips discovery
      entirely — earliest shell, everything streams; the data endpoint serves
      the onPrefetch/`prefetchLoadersBeforePageRender` warm-up.

- [ ] **Release-note bullet** (server behavior): the engine now loads the client
      points EAGERLY on the server
      (`ClientPoints.createFromSource(…, { eager: true })` — the mirror of the
      server points' `load()`): every page/layout module is imported up front,
      so SSR never suspends on a `React.lazy` chunk. Visible effects: server
      startup (and each hot-store swap / vite re-read) imports all page modules
      — slightly heavier dev boot, fully-warm prod boot; the first
      `queryClientDehydratedState` request per process no longer misses the
      page's queries. The browser bundle keeps the lazy collection (code
      splitting unchanged).

- [ ] **Release-note bullet** (SPA boot behavior): on the very first client-side
      mount of an SPA (`ssr: false` client, no server HTML) the root/layout
      `.loading()` now renders while the first page chunk loads — previously the
      root stayed BLANK until the chunk was ready (a suspension with no boundary
      just delayed the first commit; now the mountable entry boundaries catch
      it). Client NAVIGATIONS are unaffected: `loadPage` pre-warms the lazy page
      instance (payload included), so navigating never flashes a wrapper
      fallback — pinned by the prefetch-page suite.

# suspend / streamed SSR — remaining work

Working checklist for the `ssr-defer` branch (worktree
`~/cc/worktrees/point0/ssr-defer`). Engineering context:
[dev/docs/suspend.md](../docs/suspend.md). Post-merge refactors live separately
in [refactoring.md](refactoring.md). Done items get deleted, not ticked — this
file only carries what is left.

## Agreed — do in the next session on this branch

- [ ] **Thrown errors must carry the same SSR effects as returned ones (status,
      redirect) — no observable difference between `return error` and
      `throw error`.** Agreed with Sergei 2026-07-06. Today the docs steer users
      to RETURN an error from `.with` "because it carries the HTTP `status` into
      the SSR response" — that difference is accidental, not a design choice.
      Make the mountable ErrorBoundary path apply the same effects the data path
      applies: - **Status**: when the boundary catches a thrown error during
      SSR, set `error.status` on the response exactly like the bound `.error()`
      component does for data errors (`setStatus(error0.status)` — the
      boundary's `renderError` renders the same bound component, so verify it
      already happens and pin it with a test; if it only works for the data
      path, wire it). - **Redirect**: a THROWN redirect caught by the boundary
      during SSR must produce the real HTTP 302 (like a returned `RedirectTask`
      does via the redirect-task machinery), not just render `<Redirect>` for a
      client-side hop after hydration. Check `_renderBoundaryError`'s redirect
      passthrough: does it register `__POINT0_SSR_REDIRECT_TASK__` during
      discovery so `handleRedirectTask` picks it up? Pin both paths with tests
      (discovery-phase throw → HTTP redirect; post-shell throw → pushed +
      client-side hop is the best that's physically possible). - Post-shell
      writes stay governed by the sealed-effects rules (idempotent quiet,
      changing warn) — parity applies to what CAN still reach the response. -
      **Then update the docs that state the old difference** (they were
      deliberately written to today's behavior; after the fix soften them to
      "returning is still nicer because it's typed"): - `docs/methods/with.md` —
      the paragraph after the "What you can return" table ("carries an HTTP
      `status` into the SSR response; prefer returning") and the security
      section paragraph ("returning is the better gate: it is typed, and it
      carries the HTTP `status`"). - `docs/methods/loading-error.md` — "Details
      of the boundary behavior" list ("Prefer signaling errors from the data
      phase anyway — … it carries an HTTP `status` into the SSR response"). -
      `docs/methods/mapper.md` — closing sentence of the throw paragraph ("that
      path is typed and carries an HTTP `status`"). -
      `docs/core/error-handling.md` — the boundary note ("a returned error is
      typed and sets the SSR `status`"). - `docs/intro/full-overview.md` — the
      Redirect-section comment ("returning is the idiomatic way… keep that as
      the escape hatch") — after parity a thrown redirect is a full equal,
      reword. - Mirror the same rewording in `~/cc/agents/posts/point0/long.md`
      and `long.en.md` (they carry the same Redirect comment).

## Awaiting design (discussed 2026-07-06, do NOT start without Sergei)

- [ ] **Let the user own `retryOnMount` on the server (failed-loader SSR
      rendering).** Today `_getServerQueryOptions` force-sets
      `retryOnMount: false` on the server so an ERRORED query reports its real
      error during SSR — that is what renders `.error()` (and its `.head()`)
      instead of a loading state, and what makes a failed streamed loader stream
      `.error()` in place. The force exists because of gotcha #4: TanStack's
      truthy `retryOnMount` + ERRORED query + fresh observer ⇒ optimistic
      `pending` ("a mount will retry me"), which turned a failed streamed
      suspense query into an endless suspend → refetch → reject loop. Sergei's
      point: the hardcode takes a choice away — a user may WANT "render the
      loading state and let the client retry on mount". Design sketch (agreed
      direction, verify when implementing): 1. The suspend gate must not suspend
      on an optimistic-pending ERRORED query — check the cache
      `state.status === 'error'` underneath instead of the observer's
      `isPending`. That kills the hang independently of the option, so the force
      stops being load-bearing for streaming. 2. Then respect an EXPLICITLY set
      `retryOnMount` (the merged options carry it): undefined → keep forcing
      `false` (today's deliberate default — the release-note bullet below stays
      true); set → the user wins. With truthy `retryOnMount` an errored query
      renders the optimistic loading state on the server (whole-HTML or the
      streamed fallback block), the error state still travels in the
      push/dehydrated cache, the client hydrates the same optimistic-pending
      view (same option ⇒ same render — no hydration mismatch) and retries on
      mount. No extra machinery needed. 3. While there, review the neighbors
      forced alongside it (`refetchOnMount: false` etc.) — those are
      server-render determinism (nothing mounts during SSR), likely fine to keep
      forced, but say so explicitly in the code comment.

## Test matrix (handoff — do in a separate session)

- [ ] **`suspend: 'client'` on the client (browser e2e)** — suspends into the
      positional `.loading()` on client navigation / fresh inputs, exactly like
      `suspend: true` minus the server half (SSR-side behavior is pinned
      in-process: never suspends on the server, like `false`).

- [ ] **`.with(point, input, { suspend: 'server' }, resolve)`** — the resolve
      callback over a streaming query: it must not run against empty data /
      crash before the query resolves; after the stream resolves the mapped
      props render. Separately: resolve over a FAILED streamed query.

- [ ] **`useSuspenseInfiniteQuery`** — zero tests today: first page streams on
      SSR; client navigation suspends into the positional `.loading()`;
      `fetchNextPage` does NOT suspend (TanStack semantics).

- [ ] **`suspend: true` on a plain `useQuery`, client side** — suspends on
      client navigation / fresh input into the positional boundary (browser e2e
      exists only for the suspense hooks). Also pin the error path: the option
      gate throws only pending promises — a query ERROR arrives as state, the
      ErrorBoundary must NOT trigger.

- [ ] **`ssr: false` + `suspend: true`** — after hydration the client starts the
      fetch: does it suspend into the positional boundary (fallback flash after
      hydration?). NEEDS A DECISION from Sergei on the desired behavior first,
      then pin it.

- [ ] **`.relatedQuery` with `suspend: 'server'`** — streaming is covered only
      for `.with()` and the self query; cover the relatedQuery path.

- [ ] **clientLoader query + `suspend: true`** — on the server it never suspends
      (stays pending, renders the loading state — asserted only by code today);
      on the client it suspends.

- [ ] **Redirect from a streamed loader (post-shell)** — the error state with
      the redirect is pushed, the client hydrates and navigates via
      `<Redirect>`. Designed in code, no test.

- [ ] **`useSuspenseQuery` in a data request** — the discovery throw
      (never-resolving promise) + `suspenseQueryPolicy: 'skip'`: the response
      must not hang, the query is absent from the dehydrated state.

- [ ] **`allowedDiscoveryRenders: 0` + a redirect in the final render's shell**
      (e.g. a root layout redirect): the render promise rejects before the shell
      is sent, so the HTTP 302 still works — pin that the zero-render mode did
      not kill shell redirects.

## Verify before releasing (проходка)

- [ ] **Run the игрич site and start0 against this branch** via
      `bun install-point0.js`. The wrappers are universal — every page of every
      app gets the entry boundaries and the wrapper div; eyeball layouts for
      broken `#root > *`-style selectors and general weirdness.

- [ ] **Verify streaming survives production proxies.** Railway/edge + gzip can
      buffer responses: locally the stream is progressive, in prod it may arrive
      as one chunk (TTFB win lost, feature silently inert). Check a deployed
      page with a streamed query actually streams in the browser.

- [ ] **Type-perf trace on the игрич codebase.** Chain typing perf is sensitive
      (see `point0-chain-types-perf`); the `ExtraQueryPoint0Options`
      intersection + `PartialUseInfiniteQueryOptions` call-site switch +
      suspense hook types are small but worth one trace run to confirm no
      regression.

- [ ] **Release-note bullet** (behavior visible to users): SSR renders a failed
      blocking loader's real `.error()` (and its error `.head()`) instead of a
      loading state — the server forces `retryOnMount: false`, so an ERRORED
      query no longer reports an optimistic pending result during SSR. Applies
      to every failed server loader, streamed or not.

- [ ] **Release-note bullet** (breaking rename): `ssr.allowedRerendersCount` /
      `ssr.forbiddenRerendersCount` → `ssr.allowedDiscoveryRenders` /
      `ssr.forbiddenDiscoveryRenders`, now counting DISCOVERY RENDERS instead of
      re-renders (old `N` ≡ new `N + 1`; an explicit old value must be bumped by
      one). New capability: `allowedDiscoveryRenders: 0` skips discovery
      entirely — earliest shell, everything streams; the data endpoint serves
      the onPrefetch/`prefetchLoadersBeforePageRender` warm-up.

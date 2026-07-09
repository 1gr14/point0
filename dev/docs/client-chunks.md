# Client chunks — deploy invalidation (stale client builds)

How point0 survives a redeploy under open tabs. A deploy changes the client
chunk hashes; a tab loaded before it still holds the old URLs, and its next
client navigation dynamic-imports a chunk that no longer exists (404, or an html
fallback with a non-JS MIME type on foreign hosts). This doc is the map of the
mechanism — every moving part with its file, plus the edge cases and tests. The
user-facing halves are docs/core/navigation.md ("Stale deploys") and
docs/engine/deploy.md ("Stale clients after a deploy").

## The design in one pass

1. The BUILD stamps each client build with a deterministic version, writes it to
   `dist/client/_point0/<scope>/build-version.json`, and injects it into the
   dist index.html (`window.__POINT0_CLIENT_BUILD_VERSION__` + an entry-load
   reload guard).
2. The SERVER echoes the version on every response it can attribute to a client
   scope: `X-Point0-Client-Build: <scope>:<version>`.
3. The CLIENT compares the header against its own version on every point0 fetch
   — a mismatch marks the tab stale (proactive channel) — and classifies a
   failed page-chunk import during navigation (reactive channel), confirming
   against a fresh fetch of `build-version.json`.
4. The NAVIGATION reacts per `createNavigation({ stale })`: `'navigate'`
   (default) leaves the SPA with a full document navigation to the SAME target,
   once per new version (sessionStorage-guarded); `'error'` surfaces a
   `POINT0_STALE_CLIENT_BUILD`-coded error to `.error()`; `'off'` restores the
   pre-feature behavior; a custom fn owns the situation.

Everything is inert in dev and on native: no build → no version injected → every
check resolves to "unknown" and nothing reacts.

## Build side (engine)

- `packages/engine/src/client-build-version.ts` — the version itself.
  `computeClientBuildVersion` hashes the SORTED public paths of the build's
  content-hashed files (16 hex chars of SHA-256). Derived from NAMES, not
  contents, on purpose: names are what an old client requests, and a bundler
  that renames chunks without a code change only causes a harmless extra "new
  version" signal — never a missed one. `identifiesBuild` excludes
  mutable-by-name artifacts (`.html`, `.map`, `_point0/` metadata;
  `_point0/assets/*` stays in). Path helper:
  `getClientBuildVersionPathSegments(scope)` →
  `_point0/<scope>/build-version.json` (same reserved namespace family as the
  `/_point0/<scope>/<type>/<name>` endpoints; publicdir is matched before
  endpoints, so the static file always wins).
- `packages/engine/src/client.ts` →
  `writeClientBuildVersionAndInjectIntoDistIndexHtml` — called at the end of
  BOTH `buildByBun` and `buildByVite` (right after `writePreloadManifest`, same
  chunk graph). Writes the json and stamps the dist index.html. Wrapped in
  try/warn — a resilience feature never fails an otherwise-good build.
- `packages/engine/src/render.ts` → `addClientBuildToDocumentHtml` — injects two
  head scripts via an `HTMLRewriter` file transform (idempotent upsert: existing
  copies are dropped by id, fresh ones prepended to `<head>`): the version
  global, and the ENTRY reload-once guard — a capture-phase `error` listener
  (resource load errors don't bubble but do capture) that reloads the document
  when THE entry script path fails to load, once per version via sessionStorage;
  when storage is unavailable it does nothing rather than risk a loop. It covers
  the case navigation-level handling can't: a cached document whose entry is
  gone — the app never boots, so no navigation code runs. Third-party script
  failures never match (exact entry pathname only).
- **The dist index.html is the single carrier.** The static SPA serves it
  directly; the SSR document is assembled FROM it (the parsed template's head
  scripts render verbatim — see engine `document.ts`), so one build-time
  injection covers SPA + SSR + both bundlers. Nothing is injected at render
  time.
- Runtime read-back: `EngineClient.getClientBuildVersion()` — lazy, cached,
  gated by `_point0_env.build.was` (same gate as the preload manifest, so a
  stale `dist` from an earlier build never leaks into dev serving).
- Circularity note: the version can NOT be baked into the bundle itself (define/
  env consts) — the version derives from chunk names, which derive from bundle
  contents. The html is outside that loop, which is why it is the carrier.

## Serve side (engine)

- `packages/engine/src/fetcher.ts` → `setClientBuildHeaderEffect` — called in
  `fetchDetailed` right before `effects.apply(...)`, the one choke point every
  response passes. Finds the client by `prepareFetchResult.scope`, sets
  `X-Point0-Client-Build: <scope>:<version>` (value built by core's
  `buildClientBuildHeaderValue`; the scope prefix makes it self-describing, so a
  cross-scope fetch never marks the wrong client stale). Off in dev
  (`itWasBuilt` gate).
- **No cache headers by design** — caching policy belongs to the app; see
  dev/backlog/cache-control.md for the planned `@point0/cache-control`
  middleware package (prototype: the игрич site's `src/lib/cache-headers.ts`).
  The handshake doesn't need response cache headers for correctness: the
  client's confirmation fetch is `cache: 'no-store'` on the REQUEST side.
- A missing chunk URL gets an honest JSON 404 (the `unknown` request variant):
  an `import()` request sends `Accept: */*`, which never matches the
  `isMayBePage` html fallback — so no `text/html` MIME error can mask the 404.
  Pinned in the e2e.

## Client side (core + react-dom)

- `packages/core/src/stale.ts` — the whole client machinery, exported ONLY via
  `@point0/core/navigation` (like `redirect.js`; not on the core index):
  - `POINT0_CLIENT_BUILD_HEADER`, `buildClientBuildHeaderValue` /
    `compareClientBuildHeaderValue` (pure parse+compare; "unknown" is never a
    mismatch — no header, foreign scope, no own version),
    `getClientBuildVersionRoutePath`.
  - Tab state: `markClientBuildStale` / `getStaleClientBuildState` — a
    module-local variable, deliberately not the super-store: it describes THIS
    loaded document, never exists on the server, and must survive across
    navigation contexts.
  - `fetchLatestClientBuildVersion` — `cache: 'no-store'` fetch of the version
    file from the SAME origin the document lives on (the file ships with the
    chunks, so this works on any host). Any failure → `undefined` → "can't
    confirm" → treated as NOT stale.
  - `shouldAttemptStaleReload` — the reload-once guard, sessionStorage keyed PER
    VERSION (the React Router pattern): every future deploy gets one fresh
    attempt; storage-unavailable allows the attempt (the version check still
    gates it).
  - `documentNavigate` — `location.assign` for a different document URL; when
    the target differs only in hash (or not at all), `assign` would NOT fetch a
    new document (a hash change just scrolls) → `history.replaceState` +
    `location.reload()`. Assumes path-based document URLs — hash/memory location
    hooks must use a custom `stale` fn (documented on the navigation page).
  - `resolveStaleReaction` — literal policies pass through; a custom fn
    returning nothing = `'handled'` → the caller backs off entirely (no
    navigation, no error commit).
- `packages/core/src/point0.ts` → `_fetchServerDetailed` — after every client
  fetch response, `noticeClientBuildHeaderFromResponse` (scope from
  `_ss.__POINT0_CLIENT_POINTS__`). This is the proactive channel: queries,
  mutations, actions all pass here.
- `packages/core/src/client-points.ts` → `_loadPage` — THE single await of a
  page chunk (`await suitable.point()`). A rejection is classified here into a
  `POINT0_PAGE_CHUNK_LOAD_FAILED`-coded error (browser failure shapes vary —
  404, offline, MIME — so classify at the await, match on the code upstream).
  `loadPage`'s in-flight dedupe map deletes in `finally` — before this work a
  REJECTED promise stayed cached forever and replayed the failure on every
  future visit of that page (found and fixed in this session).
- `packages/core/src/navigation.tsx`:
  - the PRE-CHECK branch in `navigateWithTransitions` (before prefetch): tab
    already marked stale + policy allows → resolve reaction → `'navigate'` goes
    through `shouldAttemptStaleReload` — a guard-blocked navigate falls through
    to a NORMAL client navigation (the app-shipped-client case: a capacitor
    webview whose build can never match the server gets at most one wasted
    reload per version, then keeps SPA-navigating on its local chunks).
  - the CATCH branch → `handleStalePageChunkLoadFailure`: only a
    `PAGE_CHUNK_LOAD_FAILED` code enters; confirm staleness (known mark or fresh
    version fetch); unconfirmed → the untouched pre-feature error path;
    confirmed → mark + react (`'navigate'` guarded; guard-blocked or `'error'` →
    wrap into `POINT0_STALE_CLIENT_BUILD` and commit the navigation with the
    error, as the old flow did; `'handled'` → no commit, user stays put).
- `packages/react-dom/src/router.tsx` — the `stale` option plumbing
  (`createNavigation` → `createRouter` → `NavigationContextProvider` →
  `helpers.stale`, exactly like `scrollToHash`/`openExternal`), and the hover
  prefetch `.catch` (a failed warm-up logs at debug and stays quiet — the real
  navigation does its own load and recovery).

## Edge cases in one place

- **Dev / native (Metro)** — inert: no version in the html.
- **Hash-only navigation while stale** — handled by `documentNavigate`'s
  replaceState+reload branch (a plain `assign('#x')` would never reload).
- **Custom location hooks (hash/memory)** — SPA hrefs are not document URLs; the
  default `'navigate'` is only correct for the standard browser hook — use a
  custom `stale` fn (documented).
- **Rolling deploys / flapping replicas** — no loops: one document navigation
  per new version, and only after the version check confirmed a change; worst
  case is one extra full-page navigation.
- **Broken deploy** (the one allowed reload still can't load the chunk) — the
  error surfaces to `.error()` as `POINT0_STALE_CLIENT_BUILD`.
- **Genuine network failure** (version unchanged) — never reloads; the normal
  error path, exactly as before the feature.

## Tests

- `packages/core/tests/stale.unit.test.ts` — header build/parse, mark/state, the
  reload-once guard, `documentNavigate` branches, `resolveStaleReaction`.
- `packages/engine/tests/client-build-version.unit.test.ts` — version
  determinism / sensitivity, the identifiesBuild exclusions, path segments, the
  html injection (version script, entry guard, idempotence).
- `packages/engine/tests/config.unit.test.ts` ("generate scopes") — the
  flattening regression this session fixed (client scopes used to enter the list
  as one nested array element and were silently dropped by
  `scopes.includes(...)`).
- `packages/engine/tests/client-build-stale.e2e.test.ts` — e2e, solo lane (own
  process/runner, planned by scripts/test.ts): a real redeploy under two
  Playwright tabs, per bundler — reactive (dead chunk → document nav lands on
  the target, new build) and proactive (mutation response header → next nav
  leaves the SPA); plus bun-only: the custom handler owning the situation
  (context delivered, no commit), and a genuine network failure NOT reloading.

## Still open (the goal is to KNOW, not to fix)

- **A manually rendered `<lazy.X />`** inside a component body (not reached via
  router navigation): nothing prefetched the chunk — which Suspense boundary
  shows the fallback while it loads, and which ErrorBoundary catches a load
  error? This path does NOT go through `loadPage`, so the stale-deploy recovery
  deliberately does not apply — a React.lazy failure has no navigation to
  downgrade.
- **Concurrent navigations**: navigation A's chunk is still loading, the user
  clicks B — the `navigateId` guard makes A resolve with "Another navigate has
  been started", but the no-flash / no-state-corruption claim deserves its own
  verification (and a pin test if anything surprises).

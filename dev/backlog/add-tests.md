# Tests worth adding

Real coverage gaps found while writing the docs. The behavior in each case is
already correct in code (and documented as such) — these tests would _pin_ it
against regressions, not discover anything. Pulled out of the docs so the pages
stay assertive instead of hedging.

## High value (a real guarantee, currently unpinned)

- **env — a non-whitelisted secret never reaches the client.**
  `build.int.test.ts` asserts that whitelisted vars (`VAR1`/`CONST1`) appear in
  the served HTML, but never that an un-whitelisted secret is _absent_. Add a
  negative assertion: set a secret env var, leave it out of `client.env.vars`,
  build, and assert its value appears in neither the client bundle nor the
  served HTML. (Server injects only the resolved whitelist via
  `render.ts buildEnvVarsScriptBody`; the client `getEnvVars` reads only
  `__POINT0_ENV_VARS__` / `__POINT0_ENV_CONSTS__`.)

- **error-handling — a thrown error's `response` / `headers` shape the emitted
  `Response`.** `fetcher.ts` uses `error.response` verbatim (else builds a JSON
  response from `status`) and merges `error.headers` via effects, but
  `error.int.test.tsx` only checks message/code/status/meta. Add a case: a
  loader throws an `AppError` carrying a `response` (and `headers`); assert the
  emitted `Response` body / status / headers.

- **loading-error — a render-phase throw is NOT caught by `.error`.** The docs
  (mapper, loading-error) state this as a contract: `.error` handles a
  loader/query error _state_ (and an `Error` returned from `.with`), but a throw
  from a component body or a `.mapper` (which runs in a `useMemo`,
  `point0.ts ~11646`) is a render error that Point0 does not wrap — no React
  error boundary exists in `react-dom`/`core`. Add a test: a `.mapper`/component
  that throws bubbles past `.error` (and fails the SSR render); a `.with` that
  _returns_ an `Error` renders `.error`.

## Medium value

- **middleware — `params['*']` wildcard shape.** `.middleware('/api/auth/*', …)`
  matching `/api/auth/sign-in/email` should expose the captured remainder as
  `params['*'] === '/sign-in/email'` (documented in middleware.md). No point0
  test asserts the `params['*']` shape for a wildcard middleware route.

- **file-upload — an action File round-trip at runtime.** Only the OpenAPI
  output for an action file body is tested
  (`packages/openapi/tests/index.int.test.tsx`); the encode→FormData→decode
  executor path is verified for mutations only. Add an action upload round-trip,
  plus a nested / array-of-files case (`{ profile: { avatar: File } }`,
  `{ files: [File, File] }`) — `isContainsBinary` recurses but has no test.

- **assets — the edited-asset HMR cycle in dev.** `dev.test.ts` proves an asset
  import resolves through the hot store to a content-hashed
  `/_point0/<scope>/assets/<hash>.<ext>` and the dev route serves the bytes. The
  untested gap is the _edit_ cycle: change the file's bytes → re-hash → new URL
  → new bytes served. Add a test that edits an imported asset and asserts the
  served URL/content changes.

- **publicdir — binary integrity through the build copy + non-`dist` `outdir`.**
  The build copies directory entries with `Bun.write(dest, Bun.file(src))`
  (binary-safe, no `.text()` round-trip), but no test serves a real binary (e.g.
  `favicon.ico`, a font) through a `publicdir` whose `outdir` is not
  `dist/client` and asserts byte-for-byte integrity.

- **publicdir — range requests on the caching-off path.** With caching off, a
  real file is served as `new Response(Bun.file(...))`, where Bun handles
  `Range` natively. No point0 test issues a `Range` request and asserts a
  `206` + correct slice.

- **importer — `compiler: false` disables import protection for that side.**
  `getCompilerOptions` returns `false` when `compiler` is off, so the importer
  plugin never runs and a wrong-side import is not rewritten/denied. No test
  asserts this no-op (a denied import passing through untouched when the side's
  compiler is off).

- **importer — a marker carried by a third-party package guards it.** The
  server-only/client-only markers match the importing file's own marker import,
  so a `node_modules` package importing `@point0/core/server-only` should be
  guarded. No test covers a dependency carrying the marker.

## Smaller / nice-to-have

- **mcp/compile/trace — `POINT0_BUILT === 'true'` selects the built transform.**
  `mcp.ts` `compile`/`trace` read `built` only from the env (no per-call input),
  unlike the `point0 compile` CLI's `--built`. Documented in mcp-project.md
  ("Compiling against a built project"). No test asserts that setting
  `POINT0_BUILT` flips the MCP's compiler options to built.
- **engine — `guessSideAndScope` inference + ambiguity errors.** `engine.ts`
  infers side/scope and throws on ambiguity (multiple client scopes need
  `--scope`; both sides available need `--side`). Documented in compiler.md
  (`--scope` inference) and mcp-project.md. No test asserts the inference table
  or the specific throw messages.
- **request — cookie parsing edge cases.** Quoted values, `%XX` decode failures,
  duplicate names, `__Host-`/`__Secure-` prefixes: implemented (`request0.ts`
  `decodeCookieValue` + the `cookies` getter), no dedicated test.
- **request — `from.location` on a relative / malformed referer.** Only a
  well-formed absolute referer is tested.
- **query-client — two scopes in one server request.** The ALS-per-context store
  implies cache isolation per scope; no test asserts the
  two-scopes-in-one-request case.
- **layout — no re-fetch on sibling navigation.** The layout stays mounted
  around an inner page switch (design intent); no test asserts a fetch-count
  across such a navigation.
- **ssr — re-render tuning is read from the client, not the server.** The
  executor reads `allowedDiscoveryRenders` / `forbiddenDiscoveryRenders` /
  `prefetchLoadersBeforePageRender` from the resolved client SSR options; the
  server keeps only the boolean. No test asserts that tuning on `server.ssr` is
  dropped while the client's value takes effect for server-rendered output.
- **onPrefetchPage — client-side firing + hook-warmed collapse.**
  `ssr-on-prefetch-page` covers the always-on server before-render step (hooks
  fire) and the `prefetchLoadersBeforePageRender` loader collapse (on → 1
  render, off → discover loop). Still uncovered: the hook firing during a
  client-side navigate/hover prefetch, and that warming the page+layout queries
  _inside_ the hook (rather than via the setting) collapses the discover loop.
  (`serverOnPrefetchPage` / `clientOnPrefetchPage` side-stripping is covered by
  the compiler `#shakeMethods` tests, not at runtime — uncompiled both sides
  run.)
- **importer — a build forces `onDeny: 'throw'` regardless of config.** Build
  paths pass `onDeny: 'throw'` (client/server
  `getCompilerOptions({ built: true })`), default is `'log'`. No test asserts a
  denied import fails the build even when `onDeny: 'log'` is configured.
- **engine.serve — `bunServeConfig` vs `serve()` option precedence.** `serve()`
  spreads `bunServeConfig` then the call's options, then forces
  `port`/`fetch`/`websocket`. No test asserts the call wins over
  `bunServeConfig` and that the three owned keys can't be overridden.
- **fetchServer/fetch — `transform: false` sends plain JSON.**
  `FetchOptions.transform` defaults `true` (round-trips through the point's
  transformer); no test asserts `transform: false` skips the transformer so raw
  JSON is sent and received.

## SSR/RSC batch (ssr-batch review) — pin these

Surfaced by the pre-PR validation of the ssr-batch pack — documented behavior
with no test. (The `transform:false`-element decode and the nested-hole
stream-drop failsafe that landed in that review are now pinned by real tests:
`rsc.unit.test.tsx` + `rsc.int.test.tsx`.)

- **get-reads — GET round-trip + both POST fallbacks.** Only the malformed-input
  400 is tested. Add: a valid `?input={"id":"x"}` GET whose loader receives
  `{id:'x'}`; a low `POINT0_QUERY_GET_MAX_URL_LENGTH` forcing the over-long
  POST-body fallback (assert method POST, loader still gets the input); and a
  Blob input forcing the FormData POST fallback.
- **cache-control/asset — runtime classification.** Only the build-side
  `collectClientBuildHashedFiles` is tested. Add an engine test driving the
  fetcher for a hashed chunk path vs a stable-name publicdir file and asserting
  `variant.type` is `asset` vs `publicdir`; plus a unit for
  `Client.isClientBuildAssetPath` (dev → false, absent/unparsable file, exact vs
  miss).
- **stale — `stale: 'error'` surfaces `POINT0_STALE_CLIENT_BUILD`.**
  `client-build-stale.e2e.test.ts` covers `'navigate'`, a custom handler, and
  the network-error path, but never `createNavigation({ stale: 'error' })`. Add
  an e2e variant asserting the target page's `.error()` receives a
  `POINT0_STALE_CLIENT_BUILD`-coded error and the SPA is NOT document-navigated.
- **stale — a layout chunk failing on its own triggers recovery (fix landed).**
  `_loadPage` now warms the page + layout FCs with `rethrowLoadError` BEFORE
  committing the ready point, so a layout whose chunk 404s independently (not in
  the page module's static import graph) surfaces as `PAGE_CHUNK_LOAD_FAILED`
  and reaches deploy-invalidation recovery, instead of being swallowed and
  failing at render. Add a test where a layout's lazy FC load rejects while the
  page chunk loads fine, asserting `_loadPage` throws `PAGE_CHUNK_LOAD_FAILED`
  (and, e2e, that stale recovery runs).

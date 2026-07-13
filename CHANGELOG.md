# Changelog

All notable changes to point0. Add notes under **Unreleased** as you work; `bun run
release` promotes that section to the new version.

## Unreleased

- SSR now renders your app as its own React root — the `#root` element itself —
  instead of nesting it inside the whole-document React tree. React's `useId` is
  relative to the render root, and the client hydrates `#root`, so the previous
  whole-document render offset every id by the surrounding `<html>`/`<body>`
  structure. React 19.2 turned that latent offset into a hard, unrecoverable
  hydration mismatch — visible as diverging component ids (e.g. Radix
  `radix-_R_bcb_` on the server vs `radix-_R_5m5q_` on the client). The document
  shell is now rendered separately and streamed around the app, so every `useId`
  is identical on both sides. One consequence of the app no longer being part of
  the document tree: React 19's native `<title>`/`<meta>` hoisting doesn't reach
  the document `<head>` from inside your components — route head tags through
  `.head()` / unhead, which is already the documented path.

## 0.2.4 — 2026-07-10

- Every string two independently compiled sides must agree on — the `x-point0-*`
  headers, the `/_point0/` path family, the globals the SSR html injects — now
  lives in one `protocol.ts` module per package (`@point0/core` for the wire
  contract, engine/compiler for their internal ids), imported by both sides and
  pinned by tests. No wire behavior changes; the only visible difference is that
  the generated OpenAPI document now spells its header parameters lowercase
  (`x-point0-transform`, `x-point0-output-type`) — header names are
  case-insensitive per spec, so existing clients keep working.
- The generated points meta (what `point0-project-mcp` serves) now carries the
  endpoint URLs the server actually mounts. The compiler used to bake raw
  camelCase segments (`/_point0/root/mutation/ideaCreate`) while the server
  mounts kebab (`/_point0/root/mutation/idea-create`), so anything trusting the
  meta called a 404. Both sides now kebab-case identically.
- Two type-guard copy-paste fixes: the validate-fn overload of `.cookies()`
  checked the new schema against the HEADERS schema instead of the cookies one,
  and `.use()` checked a plugin's search/body/headers/cookies schemas against
  the point's PARAMS schema. The guards now compare like with like — plugin code
  whose schema mismatch previously slipped through (or was falsely rejected) may
  see its type errors change accordingly. Types only, no runtime change.
- Removed the dead `_endpointPrefix` option on `Point0`. It reached one of the
  nine places that build `/_point0/` paths, so setting it silently broke the
  other eight; nothing ever set it. The prefix is a constant
  (`POINT0_INTERNAL_PATH_PREFIX`), not an option.
- `getLocation()` and `getSearch()` now answer on the server wherever the request
  stands for a page. A **page**'s loader — and every RSC server component its data
  returns, `defer`red subtrees included — can read them on any path: the SSR
  render, the client-navigation data fetch, a plain refetch of its query, and
  `ssr(false)`. A **layout**'s loader can only while a page renders or prefetches
  around it — a layout has no route of its own, so its query fetched alone (an
  invalidation, a `staleTime` refetch, a navigation that misses the cache) still
  throws. Before, the nested run that executes a page's loader dropped the page
  location, and the plain data fetch never had one, so both threw
  `"Current location is not yet initialized"`. A **query** or **mutation** point
  still has no page and still throws — there, keep the value in the query input,
  which also keys the cache. On the server `origin`/`href` may come from the
  browser's `Referer`, so don't build security-sensitive absolute urls from them;
  `pathname`, `params` and `search` cannot be spoofed. `useLocation()` is unchanged: it is a hook, so it
  belongs to pages, layouts and component points (islands), never to a server
  component, which runs as one plain function call.
- A page fetched through its endpoint no longer loses its origin. The page url was
  built from the `Referer` alone, so a request without one
  (`Referrer-Policy: no-referrer`, a privacy extension) produced an origin-less
  page location. On the client-navigation prefetch that location matched no page:
  the response carried an empty dehydrated state and the browser refetched
  everything after hydration. The origin now falls back to the root's
  `.clientUrl()` / `.serverUrl()`, and then to the request's own.
- An origin-less location no longer corrupts its own pathname. The router read it
  back by string-concatenating the origin, so a missing one became the literal
  segment `"/undefined/…"` — e.g. `/undefined/ideas/42`. It now yields a relative
  href, which is what an origin-less location means.

## 0.2.3 — 2026-07-09

- **0.2.2 never reached npm either.** Its tag was pushed and the whole test
  matrix passed, but the publish job failed: npm `12.0.0` (just promoted to
  `latest`) ships a broken provenance path (`Cannot find module 'sigstore'`) and
  the release CI upgraded npm to `latest` before publishing. The publish job now
  pins npm to 11.x, so a brand-new npm major can't break provenance again. 0.2.3
  is the first published build of everything listed under 0.2.0 through 0.2.3.

## 0.2.2 — 2026-07-09

- **0.2.1 never reached npm either.** Its release tag was pushed, but the run
  failed on the vite client-bundle leak fixed below, so npm `latest` stayed at
  0.1.12.
- Vite production builds no longer intermittently leak server-only method
  arguments into the client bundle. Rolldown transforms modules in
  nondeterministic order: when a page compiled before the file defining its
  parent point, that point got registered from a disk parse of the parent file,
  and the parent's own client compile then shook the stale AST instead of the
  one being emitted — `.middleware(cors())` (and any other server-only args)
  survived, pulling `@point0/cors` into the client chunk on ~50% of builds. The
  compiler now reuses a registered point only when it is bound to the exact AST
  being compiled.

## 0.2.1 — 2026-07-09

- **0.2.0 never reached npm.** Its release tag was pushed, but the release run
  failed on a CI flake before the publish step, so npm `latest` stayed at
  0.1.12.
- The RSC hole-deadline timer no longer calls `.unref()`. On bun-on-Windows a
  fired deadline timer could busy-spin the event loop and keep a short-lived
  process from exiting; dropping `.unref()` works around it. Trade-off: an exit
  with a genuinely un-settled hole now waits at most `holeTimeoutMs` for the
  deadline to fire.

## 0.2.0 — 2026-07-09

- Streamed SSR, rebuilt end to end. React renders the whole document (no
  wrapper div, no string splicing), the shell flushes immediately, and slow
  parts stream into the same response. Per-query `ssr` and `suspend` options
  control what the server awaits, streams, or leaves to the client. BREAKING
  rename: `ssr.allowedRerendersCount` / `ssr.forbiddenRerendersCount` →
  `allowedDiscoveryRenders` / `forbiddenDiscoveryRenders`, now counting
  discovery renders (old `N` ≡ new `N + 1`; `0` skips discovery entirely — the
  earliest possible shell).
- RSC — React elements as data. A server loader can return React elements,
  whole or nested in the output (gated by `.rsc({ depth })`): plain function
  components run on the server and ship as markup (their code never reaches the
  browser), component points hydrate as interactive islands resolved from the
  points collection, and everything rides the normal data pipe — SSR, client
  fetches, caching, both bundlers, no Flight, no directives.
- `defer(element, fallback?, errorFallback?)` streams a slow server subtree as
  a hole in the same response — over the SSR document and over client fetches
  (NDJSON, gated on the `x-point0-stream` header; foreign clients get the
  subtree inlined). Waiting streams heartbeat every 5s so idle reapers (Bun's
  10s default, proxies) never kill a legitimately slow subtree, and every hole
  carries a deadline — `.rsc({ holeTimeoutMs })`, default 60s — so a hung one
  fails loud with `POINT0_RSC_HOLE_TIMEOUT` instead of holding the connection.
- Promises as island props. Hand a still-resolving value straight to an island
  prop — `<Stats slowStats={getSlowStats()} />` — and the island mounts LIVE at
  once (first SSR paint included) while the value streams into the prop; the
  island reads it with React 19 `use()`. Non-streaming consumers get the value
  awaited inline.
- Per-point `.ssr(false | options)` split from `.clientOnly()`: whether the
  server executes a point during SSR and whether its render runs only in the
  browser are now independent switches.
- Query-family reads go over GET (`?input=` JSON, automatic POST fallback for
  oversized or binary inputs), so CDNs can cache them; new packages
  `@point0/cache-control` (correct `Cache-Control` per response variant,
  content-hashed assets immutable) and `@point0/compress` (streaming
  brotli/gzip/zstd with per-chunk flush).
- `createQueryClient` now takes a config factory and merges it over Point0's
  defaults (element-carrying query data opts out of structural sharing);
  passing a `QueryClient` instance throws. BREAKING for
  `createQueryClient(() => new QueryClient())` apps.
- The server loads the client points eagerly: every page/layout module is
  imported up front, so SSR never suspends on a `React.lazy` chunk — slightly
  heavier dev boot, fully-warm prod boot. The browser bundle keeps the lazy
  collection (code splitting unchanged).
- On the very first client-side mount of an SPA (`ssr: false`, no server HTML)
  the root/layout `.loading()` renders while the first page chunk loads —
  previously the root stayed blank. Client navigations are unaffected.
- What SSR renders for a FAILED loader explicitly follows TanStack's
  `retryOnMount`, exactly like a client mount; recommended:
  `.queryOptions({ retryOnMount: false })` on the root (every example now does)
  to render the real `.error()` + its `.head()` into the SSR HTML. See "Failed
  loaders and retryOnMount" in the SSR docs.

## 0.1.12 — 2026-07-03

- Internal: cleared dead imports and an unused store-dir helper from the engine
  `dev-hot-reload` / `dev-source-maps` tests, so `bun run lint` is green across
  the whole repo. No runtime or API change.

## 0.1.11 — 2026-07-03

- `point0 dev` now forwards origin `Content-Encoding` transparently. A server
  compression middleware (gzip/brotli) used to serve a 200 + blank page in dev
  (`ERR_CONTENT_DECODING_FAILED`): the client dev-server proxy's `fetch()`
  decoded the body but left the `Content-Encoding` header on it, so the browser
  tried to decode already-decoded bytes. The proxy now forwards the compressed
  bytes as-is (`decompress: false`) on every hop, so origin compression behaves
  in dev exactly as in a production build.
- Scroll restoration is now the router's job, not the browser's. Point0 sets
  `history.scrollRestoration = 'manual'` and becomes the single source of truth:
  a push scrolls to the top (or the target `#hash`), while back/forward restores
  the remembered position — even when the URL carries a `#hash`, where the
  browser would otherwise jump to the fragment instead of the saved offset.
  Positions are remembered per URL and persisted to `sessionStorage`, so a
  reload lands back at the same offset; a first load with a `#hash` is treated
  as a deep link and jumps to the anchor. While the entering page is still
  growing (async data, images), the restore re-applies for up to ~1s and backs
  off the instant anything else moves the scroll, so it never fights the user.
- `navigate.to(...)` now resolves a string target relatively, the way a browser
  resolves an `<a href>`: `'edit'` from `/ideas/list` goes to `/ideas/edit`,
  `'../x'` climbs a segment, a bare `'#section'` stays on the current URL
  (keeping its search), and a bare `'?page=2'` replaces just the search.
  Root-relative (`'/x'`) and same-origin absolute targets become root-relative
  hrefs; cross-origin ones go to `openExternal`; an unparsable target is handed
  to the adapter as-is.
- Docs: the intro overview and README gain a "The rest of the framework" section
  that sizes up everything beyond the five examples, and lead with a tighter
  pitch ("the scope of Next.js and TanStack Start, the simplicity of tRPC"). The
  README's `## Root` heading becomes `## Root point`, matching the overview.

## 0.1.10 — 2026-07-03

- Docs fix: the overview's `## Root` heading is renamed to `## Root point`. Its
  slugified anchor id was `root`, which collided with the docs site's `#root`
  mount element and broke that page's layout. (Matches full-overview, which
  already uses "Root point".)

## 0.1.9 — 2026-07-03

- Docs only: the intro is reshaped — `overview.md` is now the short pitch, the
  long announcement-article walkthrough moves to `full-overview.md`, and a new
  `benchmarks.md` sizes Point0 up against Next.js and TanStack Start. The
  reference pages (points, methods, core, engine, extra, examples) get a
  prose-tightening pass: same facts, denser (~600 fewer lines across 61 pages).
  No package code changed — this cut just moves the stable tag so the docs site
  serves the reworked content.
- Repaired the `@point0/docs` outline test that had pinned the `overview` page
  as an example of nested subsections; the reshape made `overview` a flat short
  pitch, so the test now reads `full-overview` (the deep-structured page). This
  is why v0.1.8 was tagged but never published — its release run went red on the
  stale assertion; 0.1.9 supersedes it.

## 0.1.7 — 2026-07-01

- `create-point0-app`: after scaffolding, it now prints a "Next steps" note —
  `cd <app>` (unless created in place) then `bun dev`, and `bun install` +
  `bun run setup` first when `--no-install` was used — instead of ending on a
  bare "created successfully" line.

## 0.1.6 — 2026-07-01

- `create-point0-app`: the template now ships a real `public/robots.txt`
  (crawl-open by default) instead of the `some.txt` placeholder, so a scaffolded
  app has a sensible robots file from the first run; the e2e test now asserts the
  client dev server serves it.
- Docs: the scaffold commands now recommend `bun create point0-app@latest` /
  `bun create start0@latest`, so `bun create` always fetches the newest
  scaffolder instead of a cached one.

## 0.1.5 — 2026-07-01

- `create-point0-app`: a scaffolded app now gets its `.gitignore` (the template
  ships it as `gitignore`, since npm strips real dotfiles, and the scaffolder
  materializes it) and a `.env` copied from `env.example`; the published package
  no longer ships `template/dev.db` or `template/src/generated`.
- Template and examples `lib/error.ts` now use the published `@1gr14/error0`
  redirect / stack plugins instead of the pre-publication local shim.

## 0.1.4 — 2026-06-30

- Dev hot-store now rewrites import specifiers via AST instead of a text regex,
  so a specifier that appears quoted inside a string or template literal (e.g. an
  `import …` shown as a code sample on a page) is no longer corrupted in the
  dev-served / SSR'd output — only real import / export-from / dynamic-import /
  require source positions are rewritten.

## 0.1.3 — 2026-06-29

- `.with` now keeps the query of a callable (component) point passed to it: the
  type discriminator tests the point brand before the function check, so the
  component's `input` is accepted and its query is no longer silently dropped
  (types-only — the runtime was already correct). See
  [docs/methods/with.md](docs/methods/with.md).
- Vite dev no longer hits "Port already in use" when re-serving after a page
  edit: the server-HMR dispose/accept block now lives on the server entry
  (`index.server.ts`), so a bubbling SSR-program reload disposes the old Bun
  server before the new one binds.

## 0.1.2 — 2026-06-29

## 0.1.1 — 2026-06-29

- Initial release.
- Per-page module preloading: production builds emit a preload manifest and the
  server injects `<link rel="modulepreload">` per request for the entry's shared
  closure plus the requested page's own chunks (bun + vite). Production-build-only
  — never injected in dev (a stale `dist` manifest can't leak into dev-served
  HTML) — and disablable entirely via `POINT0_MODULE_PRELOAD=false`. See
  [dev/docs/preload-manifest.md](dev/docs/preload-manifest.md).

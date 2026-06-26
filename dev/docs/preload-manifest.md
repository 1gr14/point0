# Per-page module preloading

In production point0 injects `<link rel="modulepreload">` into the document
`<head>` **per request**, for exactly the chunks the requested page needs: the
client entry's shared static closure (the same on every page) plus that page's
own lazy chunk and its static-import closure (which already covers its layouts).
The browser then fetches them in parallel straight from the HTML instead of
discovering them through the ES-module import waterfall after the entry boots.

## The problem it solves

The built client is **one entry `<script type="module">`** plus many split
chunks. Without preload the browser can only discover a chunk by loading and
parsing the chunk that imports it: load entry → parse → fetch its static imports
→ parse those → … (a waterfall), and a page's own code isn't fetched at all
until the entry boots, the router matches the URL, and its `import()` runs. On a
docs-heavy app that's ~20+ chunks trickling in level by level.

A `modulepreload` link tells the browser to fetch (and parse) a module
immediately, in parallel, the moment it sees the link — collapsing the waterfall
and letting the matched page's chunk arrive **with the document**.

## Why serve-time, not build-time

The set of chunks differs per page, and the server already knows which page a
request resolved to (`pagePoint`, used for SSR + prefetch). So we inject the
links at serve time in the renderer — the same place and mechanism that already
injects env vars and the dehydrated store
([render.ts](../../packages/engine/src/render.ts)). The build only produces a
static **manifest**; the renderer reads it and picks the right links for
`pagePoint`. (`modulepreload`, not a second `<script type="module">`: a page
chunk is a dynamic-import target, not an entry — preloading warms the cache so
the router's `import()` resolves instantly, without executing the module
standalone or fighting the bootstrap.)

## The manifest

Each client writes `dist/client/_point0/preload.json`
([`PRELOAD_MANIFEST_RELPATH`](../../packages/engine/src/preload-manifest.ts)):

```jsonc
{
  "entry": "/chunk-ad98yad8.js",          // the bootstrap <script> the HTML already loads
  "entryPreload": ["/chunk-…", …],        // entry's transitive STATIC-import closure (shared, every page)
  "byPoint": { "home": ["/chunk-…"], … }  // per page POINT: its lazy chunk + that chunk's static closure, minus entryPreload
}
```

Keyed by **point name** (not route pattern): the name is a plain string present
both on the compiler point at build time and on the runtime `pagePoint`, so
concrete vs parameterized URLs don't matter and we never stringify a `Route0`.

## Build side — chunk graph → manifest

[`preload-manifest.ts`](../../packages/engine/src/preload-manifest.ts) is pure
and bundler-agnostic. Each bundler's output is normalized to a `ChunkGraph`
(`{ entryFile, chunks: { [publicPath]: { staticImports, dynamicImports, entryPoint, inputs } } }`):

- **Bun** (`chunkGraphFromBunMetafile`): from the
  `Bun.build({ metafile: true })` metafile. Each output carries
  `imports: [{ path, kind }]` where `kind` is `import-statement` (static) or
  `dynamic-import` (lazy), plus `entryPoint` (set on the html entry chunk and on
  each dynamic-entry chunk). The entry chunk is the output whose `entryPoint` is
  the build's `index.html`.
- **Vite/Rolldown** (`chunkGraphFromRollup`): from the rollup output chunks,
  which separate `imports` (static) from `dynamicImports`, with `facadeModuleId`
  as the chunk's source module and `isEntry` marking the entry.

From the graph: `entryPreload` = the entry's transitive **static** closure;
`byPoint[name]` = the page's own chunk (its dynamic-entry / input chunk) plus
that chunk's static closure — which already covers the layouts the page
statically imports — minus anything already in `entryPreload` (no point
preloading a chunk twice).

### bun vs vite — different shapes, same goal

Bun splits shared static deps (react, core, the schema lib, the markdown/shiki
stack, …) into their own chunks, so **`entryPreload` is large** and is the main
win. Vite/Rolldown **inlines** all static deps into the single entry chunk and
only splits dynamic imports, so its **`entryPreload` is legitimately empty** —
the entry `<script>` already carries that code — and the whole win is the
**per-page** `byPoint` preload of lazy route chunks. Both paths are exercised by
the tests.

## Page → source mapping

To fill `byPoint` we need, per page, its source file so we can find that file's
chunk in the graph. We get it from the **in-memory compiler points** the engine
already holds — never by parsing the generated aggregator's text:

1. The build runs the generator first
   ([`engine.build`](../../packages/engine/src/engine.ts) →
   `FilesGenerator.sync`), which parses every point and records each one's
   `pos.file` (absolute source path), `type`, `name`, and `scope`.
2. [`FilesGenerator.getPagePoints`](../../packages/engine/src/generator.ts)
   returns the valid `page` points as `{ scope, name, file }`.
3. `engine.build` maps those into each client's
   [`preloadPageSources`](../../packages/engine/src/client.ts)
   (`{ name, sourceFiles: [file] }`), filtered to the client's scope, right
   before building. The manifest writer reads that field — no
   `Function.prototype.toString`, no aggregator regex, no `FileResolver`.
4. Each source file is matched to a chunk by `entryPoint`/`inputs`
   (`findChunkForSourceFile`), then we take that chunk plus its static closure,
   minus `entryPreload`. Path comparison normalizes to absolute (bun metafile
   inputs are cwd-relative; rollup `moduleIds` and the points' `pos.file` are
   absolute).

### Layouts ride the page's static closure — no separate tracking

A page is authored ON its layout (`generalLayout.lets('page', …)`), so the page
module **statically imports** its layouts. The layout is its own lazy point (its
own chunk), but the page chunk has a static-import edge to it, so
`staticClosure(pageChunk)` already contains the layout chunk (and its closure).
We therefore feed `buildPreloadManifest` only the page's own source file and
still preload its layouts. Whether the bundler keeps the layout as a separate
chunk or inlines it into the page chunk, the layout's code lands in `byPoint`.

**Always generated, best-effort, never fatal.** `engine.build` (and
`buildWatch`) always run `generator.sync` first — there is no "build without
generate" (the flag was removed: skipping it would ship a stale aggregator and
leave no points to map). So the in-memory points are always populated for the
mapping. On top of that it's still defensive: resolving the page sources is
wrapped in try/catch in `engine.build` (a glitch logs a `warn` via `engine.log`
and leaves `preloadPageSources` empty), and the manifest write is wrapped the
same way in `EngineClient.writePreloadManifest` — either way the feature
degrades to entry-closure-only and never fails the build.

## Serve side — injection

[`EngineClient.renderAsReadableStream`](../../packages/engine/src/client.ts)
resolves `resolvePreloadsForPoint(manifest, pagePoint.name)` (entry closure +
that page's extras, deduped, entry excluded) and threads it as `modulePreloads`
through
`renderAppAsReadableStream → renderReadableStream → overrideDocumentHtml`, which
prepends the `<link rel="modulepreload" crossorigin>` tags to `<head>`.

### Gating — production-build-only, with a kill switch

`resolvePreloads` short-circuits to `[]` **before touching the manifest** unless
[`shouldServeModulePreload({ buildWas, envFlag })`](../../packages/engine/src/preload-manifest.ts)
returns true. Two reasons it might not:

- **Dev (and the builder process).** `buildWas` is `_point0_env.build.was`, true
  _only_ in the built, prod-serve runtime — the same signal the dev servers gate
  on. In dev nothing is bundled (there are no `/chunk-*.js` to point at), so the
  feature must be inert. Crucially this holds **even when a stale
  `dist/client/_point0/preload.json` is present** (e.g. the user ran
  `point0 build` once, then `point0 dev`): without the gate that leftover
  manifest would leak hashed prod chunk links into dev-served HTML — the exact
  regression this gate prevents.
- **The env kill switch.** `POINT0_MODULE_PRELOAD=false` (also `0` / `off`)
  disables the feature entirely, in prod too. It's checked in **both**
  directions: serve-time injection here, and manifest emission at build time
  (`writePreloadManifest` skips writing when the flag is set), so nothing is
  even produced. Default is on (any other / unset value).

The decision lives in two **pure** helpers (`shouldServeModulePreload`,
`isModulePreloadDisabledByEnv`) so the policy — including the dev guard that the
regression slipped through — is locked by unit tests, not just integration ones.

## Maintenance notes

- **Best-effort, never fatal.** Manifest emission is wrapped in try/catch — a
  preload glitch must never fail a build. And even past the gate, a missing
  manifest (a build from before this feature) → `getPreloadManifest` returns
  null → no links, normal serving. Preload is a pure perf hint.
- **Prod-build-only, gated — not "dev has no manifest".** The feature is off in
  dev because of the `shouldServeModulePreload` gate above, **not** because the
  file is absent: a `dist` from an earlier `point0 build` does leave a manifest
  behind, and dev would happily read it without the gate. Never relax the
  `buildWas` check to "manifest exists" — that's the regression. See the Gating
  section.
- **Load-bearing bundler facts:** the bun metafile `imports[].kind` distinction
  (static vs dynamic) and rollup's `imports` vs `dynamicImports`. If a bun
  upgrade changes the metafile shape, `chunkGraphFromBunMetafile` is where to
  look.
- **Page sources come from the in-memory compiler points, not the aggregator
  text.** `FilesGenerator.getPagePoints` reads each page's `pos.file`, and
  `engine.build` feeds it into `client.preloadPageSources` before building.
  Layouts are intentionally NOT resolved — a page statically imports its
  layouts, so their chunks ride the page chunk's static closure (a unit test and
  the integration test's layout case pin this).
- **The "duplicate entry script" that isn't.** The served HTML may _look_ like
  it has two `<script type="module" src="…">` for the entry, but the second is
  inside an HTML comment (the commented-out example line in
  `src/index.client.html`, whose `src` the bun build-fix incidentally rewrites).
  The DOM has exactly one active entry script — verified.

## Files & tests

- [`preload-manifest.ts`](../../packages/engine/src/preload-manifest.ts) — graph
  normalization, closure, manifest assembly, link rendering, and the pure gating
  policy (`shouldServeModulePreload`, `isModulePreloadDisabledByEnv`).
- [`generator.ts`](../../packages/engine/src/generator.ts) — `getPagePoints`
  exposes valid page points (`{ scope, name, file }`) from the in-memory
  compiler points.
- [`engine.ts`](../../packages/engine/src/engine.ts) — feeds each client's
  `preloadPageSources` from `getPagePoints` before building.
- [`client.ts`](../../packages/engine/src/client.ts) — holds
  `preloadPageSources`, emits the manifest after each build, and reads it at
  serve time.
- [`render.ts`](../../packages/engine/src/render.ts) — injects the links.
- [`module-preload-manifest.test.ts`](../../packages/engine/tests/module-preload-manifest.test.ts)
  (unit) and
  [`module-preload-serve.test.ts`](../../packages/engine/tests/module-preload-serve.test.ts)
  (integration: builds an app under **both** bundlers, asserts the served HTML
  preloads the entry closure + the requested page, and only the requested page).

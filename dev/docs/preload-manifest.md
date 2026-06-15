# Per-page module preloading

In production point0 injects `<link rel="modulepreload">` into the document
`<head>` **per request**, for exactly the chunks the requested page needs: the
client entry's shared static closure (the same on every page) plus that page's
own lazy chunk and its layouts' chunks. The browser then fetches them in
parallel straight from the HTML instead of discovering them through the
ES-module import waterfall after the entry boots.

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

Each client writes `dist/client/__point0_preload__.json`
([`PRELOAD_MANIFEST_BASENAME`](../../packages/engine/src/preload-manifest.ts)):

```jsonc
{
  "entry": "/chunk-ad98yad8.js",          // the bootstrap <script> the HTML already loads
  "entryPreload": ["/chunk-…", …],        // entry's transitive STATIC-import closure (shared, every page)
  "byPoint": { "home": ["/chunk-…"], … }  // per page POINT: its lazy chunk + layouts' chunks, minus entryPreload
}
```

Keyed by **point name** (not route pattern): the name is a plain string present
both in the aggregator and on the runtime `pagePoint`, so concrete vs
parameterized URLs don't matter and we never stringify a `Route0`.

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
that chunk's static closure plus the same for each of its layouts — minus
anything already in `entryPreload` (no point preloading a chunk twice).

### bun vs vite — different shapes, same goal

Bun splits shared static deps (react, core, the schema lib, the markdown/shiki
stack, …) into their own chunks, so **`entryPreload` is large** and is the main
win. Vite/Rolldown **inlines** all static deps into the single entry chunk and
only splits dynamic imports, so its **`entryPreload` is legitimately empty** —
the entry `<script>` already carries that code — and the whole win is the
**per-page** `byPoint` preload of lazy route chunks. Both paths are exercised by
the tests.

## Page → source mapping (the tricky bit)

To fill `byPoint` we need, per page, its source module(s) so we can find their
chunks in the graph. We get this from the points the engine **actually
imports**, never from a hardcoded `generate` path:

1. [`resolvePointsAggregatorAbs`](../../packages/engine/src/server-hot-store.ts)
   (`{ source: client.pointsProvided, engineFile }`) —
   `Function.prototype.toString` on the `points` thunk, regex out the
   `import('…')` specifier, resolve it with the compiler's `FileResolver`. Same
   mechanism the hot store uses; works whether or not `point0 generate` ran.
2. [`parseAggregatorPoints`](../../packages/engine/src/preload-manifest.ts)
   parses the resolved aggregator's text into
   `{ type, name, layoutNames, importSpec }` per entry. Each entry's body is
   **bounded** to the span up to the next `type/name` so a statically-imported
   point (no `import('…')` in its body) gets `importSpec: undefined` instead of
   grabbing a neighbour's import.
3. Each `importSpec` (and each layout's) is resolved with `FileResolver` to an
   absolute source file, matched to a chunk by `entryPoint`/`inputs`. Path
   comparison normalizes to absolute (bun is cwd-relative, rollup + FileResolver
   are absolute).

**Non-lazy points degrade, never break.** A statically-imported point is bundled
into the entry and has no separate chunk — it yields no `byPoint` entry and is
already covered by `entryPreload`. A hand-written aggregator that doesn't match
the generated lazy shape simply yields fewer entries; the feature falls back to
entry-closure-only.

## Serve side — injection

[`EngineClient.renderAsReadableStream`](../../packages/engine/src/client.ts)
resolves `resolvePreloadsForPoint(manifest, pagePoint.name)` (entry closure +
that page's extras, deduped, entry excluded) and threads it as `modulePreloads`
through
`renderAppAsReadableStream → renderReadableStream → overrideDocumentHtml`, which
prepends the `<link rel="modulepreload" crossorigin>` tags to `<head>`.

## Maintenance notes

- **Best-effort, never fatal.** Manifest emission is wrapped in try/catch — a
  preload glitch must never fail a build. A missing/old manifest (dev, or a
  build from before this feature) → `getPreloadManifest` returns null → no
  links, normal serving. Preload is a pure perf hint.
- **Dev has no manifest.** It's written only by the bun/vite production builds;
  dev serving is unchanged.
- **Load-bearing bundler facts:** the bun metafile `imports[].kind` distinction
  (static vs dynamic) and rollup's `imports` vs `dynamicImports`. If a bun
  upgrade changes the metafile shape, `chunkGraphFromBunMetafile` is where to
  look.
- **The aggregator parse targets the generated lazy format.** If the generator's
  `points.client.ts` shape changes (field order/names), revisit
  `parseAggregatorPoints`; its unit tests pin the contract, including the
  non-lazy-doesn't-bleed guarantee.
- **The "duplicate entry script" that isn't.** The served HTML may _look_ like
  it has two `<script type="module" src="…">` for the entry, but the second is
  inside an HTML comment (the commented-out example line in
  `src/index.client.html`, whose `src` the bun build-fix incidentally rewrites).
  The DOM has exactly one active entry script — verified.

## Files & tests

- [`preload-manifest.ts`](../../packages/engine/src/preload-manifest.ts) — graph
  normalization, closure, manifest assembly, aggregator parse, link rendering.
- [`client.ts`](../../packages/engine/src/client.ts) — emits the manifest after
  each build; resolves page sources + reads the manifest at serve time.
- [`render.ts`](../../packages/engine/src/render.ts) — injects the links.
- [`preload-manifest.test.ts`](../../packages/engine/tests/preload-manifest.test.ts)
  (unit) and [`preload.test.ts`](../../packages/engine/tests/preload.test.ts)
  (integration: builds an app under **both** bundlers, asserts the served HTML
  preloads the entry closure + the requested page, and only the requested page).

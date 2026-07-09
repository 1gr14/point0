# Asset pipeline — technical reference

> Maintainer-facing reference for point0's static-asset pipeline — how it works,
> why, config, code map, tests. Works on both bundlers (Bun and Vite), dev +
> build, all modes (`?url`/`?file`/`?text`/`?raw`/`?react`). Assets are part of
> the compiler plugin.

## What it is

A single static-asset import gives one stable, **app-absolute URL** that is
identical across dev & prod, client & SSR, so SSR HTML matches the client bundle
(no hydration mismatch, no 404, resolves from any route). The URL is computed
from point0's **own content hash**, so the two builds (browser + bun) agree by
construction rather than by coincidentally producing the same bundler hash.

On top of the default URL behavior there is an explicit per-import query API and
generated TS types.

```ts
import url from './logo.png' // "/_point0/assets/<hash>.png"  (default = url; client + SSR identical)
import url from './logo.png?url' // same, explicit
import path from './logo.png?file' // a real path the SERVER can read at runtime (bytes copied into dist)
import text from './logo.svg?text' // file contents as a string  (?raw is an accepted alias — Vite's spelling)
import Logo from './logo.svg?react' // a React component (SVGR), svg only
```

`<hash>` = `sha256(bytes).slice(0, 16)`. URL scheme:
`/_point0/assets/<hash>.<ext>` — a fixed, unscoped constant
(`ASSET_URL_PREFIX`). The URL is content-addressed, so it is a literal baked
into the compiled modules, identical across the server bundle and every client
bundle by construction.

## Why (the bugs this fixes)

- **dev on Bun:** SSR runs through the Bun runtime, whose `file` loader returns
  an asset's **absolute disk path**, while the browser bundle uses a hashed URL
  → SSR HTML ≠ client → broken hydration + 404 image.
- **prod build:** the server `Bun.build` (target `bun`, no `publicPath`) emits a
  **relative** `./<hash>.png` URL → mismatches the client's `/<hash>.png` and
  404s on nested routes (the browser resolves `./x` against the current path).
  `publicPath: '/'` on the server build is **not** an option — Bun also prefixes
  **chunk** imports, so the server can't load its own chunks.
- **Why ours:** point0 owns asset URLs via one plugin that computes the URL by
  its own content hash, identical on both sides — the only way both bundles
  agree by construction rather than coincidence.

## How it works under the hood

`point0 build` cleans `dist` once, then builds client (`Bun.build` target
`browser` → `dist/client`) and server (target `bun` → `dist/server`) in
parallel, both with the compiler plugin (the asset pipeline rides inside it).

For `import logo from './logo.png'` (url mode):

- The plugin reads the bytes, computes the hash, and returns
  `export default "/_point0/assets/<hash>.png"`. The import becomes a plain
  string — **identical in both bundles** because the hash is ours.
- The **client** build also **writes** the bytes to
  `dist/client/_point0/assets/<hash>.png`.
- The **server** build does **not** write (`writeUrlBytes: false`) — it only
  emits the same URL string. No `dist/server` duplicate.

Result in `dist`:

```
dist/client/_point0/assets/<hash>.png   ← the only copy of the bytes (this is what gets served)
dist/client/**.js                       ← references "/_point0/assets/<hash>.png"
dist/server/**.js                       ← references the same string; no file next to it
```

- **Prod serving:** the built server serves static files from `dist/client` at
  `/` (the publicdir wiring in `config.ts`), so `GET /_point0/assets/<hash>.png`
  → `dist/client/_point0/assets/<hash>.png`.
- **Dev serving:** the plugin writes bytes to a content-addressed cache
  (`node_modules/.cache/@point0/assets`) and the engine serves
  `/_point0/assets/*` from it via a dev-only route (`Fetcher.fetchDevAsset`,
  matching a request whose `pathname.startsWith(ASSET_URL_PREFIX)` and whose
  name matches `assetNameRegex`; the cache is one shared content-addressed
  pool). Prod doesn't need that route.
- **Per-side builds (`point0 build --side …`) — where the bytes come from:**
  url-mode bytes are written **only by the client build** (the server build runs
  with `writeUrlBytes: false` — same URL, no file, no `dist/server` duplicate).
  So `--side client` is self-sufficient for url assets (bytes → `dist/client`,
  served by whoever hosts it), but `--side server` **alone** does NOT produce
  servable url assets — `/_point0/assets/<hash>` 404s unless a client build
  already populated `dist/client`. Only `?file` (bytes → that side's own outdir)
  is self-contained on a server-only build. So build both sides (the default),
  or build the client into the same `dist`, whenever the app uses url-mode
  assets.

### Modes

| Import           | Mode  | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bare / `?url`    | url   | served URL string. url-mode bytes written to `urlDir` (client build / dev cache).                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `?file`          | file  | **Server-side use** (the value is a real fs path read at runtime; the browser has no fs — don't render it into a hydrated page). bytes copied into the plugin's own `fileDir`; value is `fileURLToPath(new URL('./<hash>.ext', import.meta.url))` — resolves next to the emitted **server** chunk at runtime, cwd-independent (`fileURLToPath`, not `URL.pathname`, so the path is usable on Windows). In dev (no `fileDir`) it returns the original source path. Client-side `?file` is unsupported (a browser can't read it). |
| `?text` / `?raw` | text  | the file's utf-8 contents inlined as a `string`. No bytes written.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `?react`         | react | an SVGR-generated React component (`loader: 'jsx'`). **svg only** — throws for other extensions. `@svgr/core` is lazy-imported.                                                                                                                                                                                                                                                                                                                                                                                                 |

## Configuration — `compiler.assets`

The pipeline **rides along with the compiler**: it is only active for a side
whose compiler is enabled. A `compiler: false` side (pure backend, client-only,
etc.) keeps the **bundler's native asset behavior** — point0 does not touch its
imports. This gating is deliberate: a side that doesn't own its build can't
produce a consistent client==server URL, so point0 stays out of its way.

```ts
compiler: {
  // ...
  assets: true | false | {
    enabled?: boolean       // default true; false disables the pipeline for an otherwise-enabled compiler
    extensions?: string[]   // managed extensions; defaults to DEFAULT_ASSET_EXTENSIONS
    defaultMode?: 'url' | 'file' | 'text' | 'react' | false  // how a bare import resolves; default 'url'. false → bare goes native, explicit queries stay managed
    svgr?: import('@svgr/core').Config               // SVGR options for ?react
  }
}
```

- Resolution: `compiler: false` → no pipeline. `compiler: true` / object with no
  `assets` key → enabled with defaults. `assets: false` (or `enabled: false`) →
  disabled for that side.
- `assets` is parsed like `markdown`/`babel` (mergeable, general + a per-side
  override) and can be written in two places, like `importer`/`ssr`: nested
  under `compiler.assets`, or as a top-level convenience — `assets` on the
  general options (engine-wide default, like `ssr`) and `assets` on a
  server/client (per-side). Precedence at each level: nested `compiler.assets`
  wins over the top-level `assets`; then general + per-side merge field-by-field
  (specific wins). Keep `extensions`/`defaultMode`/`svgr` **identical across
  sides** — they must agree for the client and SSR to emit the same URL;
  per-side overrides are allowed but a footgun.
- The enabled/disabled gate is folded into `mergeAssetsOptions` (in
  `config.ts`): the parsed `compiler.assets` is already the final
  `CompilerAssetsOptions | false` the plugin reads — no separate resolve step.
  The per-site directories (`urlDir`/`fileDir`/`writeUrlBytes`) are added by
  each build call site.

## Generated types — `generate.assetsTypes`

The generator can emit an ambient `.d.ts` so imported assets are typed in user
code (like `vite/client`):

```ts
generate: {
  meta: 'src/generated/point0/meta.ts',
  assetsTypes: 'src/generated/point0/assets.d.ts',  // or { outfile, banner?, extensions? }
}
```

It declares, **per managed extension**: the bare module +
`?url`/`?file`/`?text`/`?raw` as `string`, and (only when `svg` is managed)
`*.svg?react` as `FC<SVGProps<SVGSVGElement>>`. The extension list defaults from
`compiler.assets.extensions` (single source of truth);
`generate.assetsTypes.extensions` can override. The content is static (depends
only on the extension list, not on points), so it is emitted via a dedicated
`assetsTypes` generator task that calls `generateAssetsDts()` from
`@point0/compiler`. Reference the file from tsconfig `include`/`types` or a
`/// <reference path="..." />`.

## Bun constraints (discovered empirically — do not relearn the hard way)

1. **Import attributes (`with { type: 'text' }`) are invisible to plugins** and
   don't change a module's identity. Bun dedupes by resolved path, so a
   path-filter `onLoad` hijacks a managed-extension import regardless of
   `with { type }` (it returns the URL, not the text). → We provide our own
   `?text`/`?raw`/`?react` queries instead; the escape hatch is to drop an
   extension from the managed `extensions` set (then native Bun +
   `with { type }` works). `txt` is intentionally **not** managed (Bun has a
   built-in `text` loader).
2. **Returning `undefined`/`void` from `onLoad` segfaults Bun (1.3.x).** Always
   return a result.
3. **A `?query` only survives if `onResolve` keeps it in the returned `path`** —
   otherwise Bun dedupes `./x.png` and `./x.png?file` into one module. We route
   queries through a namespace and keep a `?<mode>` marker in the path.
4. `onLoad`/`onResolve` args: `{ path, namespace, loader, defer }` /
   `{ path, importer, namespace, resolveDir, kind }`. No `with`, no `suffix`.
   `args.loader` is the _extension default_, not the attribute.

## Key code locations

- **All asset logic:** `packages/compiler/src/assets.ts` — `makeAssetsBunPlugin`
  (the standalone `BunPlugin` factory that builds the onResolve/onLoad hooks,
  kept for unit tests / bring-your-own-bundler), `applyAssetsBunPlugin` (the
  thin wrapper `makeAssetsBunPlugin(o).setup(build)` the compiler plugin calls
  so assets ride inside it), the modes, `DEFAULT_ASSET_EXTENSIONS`, the shared
  URL/serving helpers (`ASSET_URL_PREFIX`, `resolveAssetsCacheDir`,
  `assetNameRegex`), and the d.ts helper `generateAssetsDts`. Re-exported
  through the `@point0/compiler` barrel.
- **Assets are a first-class `Compiler` field:** `compiler.ts` carries `assets`
  on the `Compiler` instance next to `filter`/`markdown`/`babel` (the ctor +
  `create` store it; `CompilerOptions.assets` feeds it). `plugin/bun.ts`
  `compilerBunPlugin` reads `compiler.assets` and calls
  `applyAssetsBunPlugin(build, assets)` after its own hooks (skipped when
  `assets` is `false` → the bundler's native asset behavior); `plugin/vite.ts`
  does the same. So the options and `Compiler`-instance plugin forms behave
  identically (no silent asset-drop). `assets` is intentionally **excluded**
  from `getSettingsHash` (the transform cache key): it doesn't change
  `compile()` output and carries per-build dirs that would fragment the cache.
  There is **no** separate asset plugin, subpath, or env var — assets travel on
  the compiler that's already threaded everywhere.
- **Dev browser child:** `plugin/bun-static.ts` (subpath
  `@point0/compiler/plugin/bun-static`) builds the compiler plugin from
  `POINT0_STATIC_COMPILER_OPTIONS` (+ `POINT0_STATIC_COMPILER_REF`); since
  `assets` rides in those options it reaches the spawned child for free. The REF
  path also reattaches `assets` from the live config — its `svgr` may carry
  function refs (template, custom SVGR plugins) that `JSON.stringify` nulled,
  exactly the `markdown`/`babel` fix.
- **Engine config:** `packages/engine/src/config.ts` —
  `EngineOptionsCompilerAssets` type, `normalizeAssetsOptions`, and
  `mergeAssetsOptions` (general + per-side override → the final
  `CompilerAssetsOptions | false`, enable-gate folded in). `assets` is parsed
  wherever `markdown`/`babel` are.
- **Engine wiring (assets ride in `compilerOptions.assets`, gated on the
  compiler):**
  - `getCompilerOptions` (`client.ts`/`server.ts`) forwards
    `assets: this.compiler.assets` (the parsed `CompilerAssetsOptions | false`,
    uniform with `markdown`/`babel`; `false` for a `compiler: false` side or
    `assets: false`).
  - dev browser — `client.ts` `startBunNativeDevServer`: just loads
    `@point0/compiler/plugin/bun-static`; assets ride in
    `POINT0_STATIC_COMPILER_OPTIONS` (no extra plugin string, no extra env).
  - dev SSR runtime — `server.ts` `extractBunPlugins`: the compiler plugin
    carries assets with dev defaults (not under Vite, not in the built runtime —
    where the compiler plugin itself is absent).
  - client build — `client.ts` `buildByBun`: merges
    `urlDir = <dist/client>/_point0/assets` (a fixed constant path, mirroring
    `ASSET_URL_PREFIX`), `fileDir = <dist/client>` into
    `compilerOptions.assets`.
  - server build — `server.ts` `buildByBun`: passes
    `assetsDirs = { writeUrlBytes: false, fileDir: <dist/server> }` into
    `extractBunPlugins`, which merges it into `compilerOptions.assets`.
- **Dev serving:** `packages/engine/src/fetcher.ts` `Fetcher.fetchDevAsset`
  (dev-only route) + its call site in `prepareFetch`. Prod static serving:
  `config.ts` publicdir (`[['/', dist/client]]`).
- **Generator:** `packages/engine/src/generator.ts` —
  `FilesGeneratorSimpleGeneralConfig.assetsTypes` + `simpleGeneralConfigToTasks`
  (emits a dedicated `assetsTypes` task calling `generateAssetsDts`).
  `config.ts` threads `assetsDefaults` (extensions + defaultMode) from the
  general `compiler.assets`; the d.ts's bare-import type follows `defaultMode`.

## Testing

Focused only — never the full suite. Unit tests are fast; integration spawns
full dev/build apps + Playwright.

```sh
cd packages/engine
bun test tests/assets.e2e.test.tsx -t "unit"          # 23 fast unit tests (no app spawn)
bun test tests/assets.e2e.test.tsx -t "integration"   # 4 integration tests: {bun,vite} × {dev,build}
```

Without a `FOCUS_BUN`/`FOCUS_VITE` focus, integration runs for **both** bundlers
(→ 27 pass). The Vite tests need `esbuild`, which is a root **devDependency**
(see Environment notes) — it ships with the repo install, so the suite runs
as-is; it is _not_ a published/peer dependency.

Coverage (unit): bare→url, url-bytes-written, `?file`, bare-vs-`?url` identity &
`?file` distinct, `defaultMode`, unmanaged-ext + `with { type:text }` native,
`.txt` native, the documented `with { type }` hijack, `?text`, `?raw` alias,
`?react` (rendered to `<svg>` via `renderToStaticMarkup`), `generateAssetsDts`,
and its `defaultMode`-aware bare type. The 4 integration tests assert the full
contract — one app-absolute URL shared by SSR + client, served (200, right
content-type), resolving on a **nested** route, image rendering
(`naturalWidth > 0`) — for Bun and Vite, dev and build. They also exercise the
query API end-to-end on both bundlers: `?text` (inlined string), `?react` (an
SVGR component rendered on SSR **and** the client — proving no hydration
mismatch), and `?file` (a server action reads the emitted bytes at runtime and
its length must match the source).

> Unit tests build under
> `packages/engine/node_modules/.cache/point0-assets-test` (not `os.tmpdir()`)
> so SVGR's `?react` output can resolve `react` / the jsx runtime against the
> hoisted root `node_modules`; `react` is externalized in those builds so the
> component shares the test's single React instance. The integration asset is
> padded past Vite's 4 KB `build.assetsInlineLimit` so Vite emits a _served_ URL
> (not an inline `data:` URI) — that's the path the contract tests. Bun never
> inlines, so it's unaffected.

### Manual end-to-end verify (Bun, reference app)

```sh
cd examples/basic && bun run setup && bun run build       # setup = prisma generate + sqlite (needed once); png+svg in home.tsx
SERVER_PORT=4490 CLIENT_PORT=4491 SERVER_URL=http://localhost:4490 NODE_ENV=production bun run ./dist/server/index.server.js &
curl -s --retry 60 --retry-connrefused http://localhost:4490/ | grep -o '<img[^>]*>'   # src must be /_point0/assets/<hash>.* (absolute)
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://localhost:4490/_point0/assets/<hash>.png   # 200 image/png
# and: no relative './' leak in dist/server; the only bytes copy is in dist/client/_point0/assets
```

## Environment notes

- **Fresh-worktree bootstrap:** `bun install` then `bun run build` (no
  `node_modules`/`dist` yet). After building, `bun install` again relinks the
  `point0` bin if needed. There is no `build:watch` running unless you start
  one, so rebuild `compiler` + `engine` after edits (the example imports
  `@point0/*` from `dist`).
- **esbuild & Vite (root-caused & fixed):** Vite 8 makes `esbuild` an **optional
  peer**, so a fresh install doesn't materialize it. Original symptom: the Bun
  server build bundles the engine, and the engine _statically_ imported `vite`
  (`isRunnableDevEnvironment` in `server.ts`), so Bun pulled Vite into the
  bundle and failed on Vite's lazy `import("esbuild")` — _before_ any asset
  handling. The fix: that import is now lazy (`await import('vite')`, inside the
  dev-only `loadViteDevEntry`), and the server `Bun.build` marks
  `vite`/`esbuild` `external`. **A Bun-only app now builds and runs with neither
  Vite nor esbuild installed** — verified by running the Bun build integration
  test with esbuild removed from `node_modules`. point0 therefore does **not**
  declare `esbuild` (it's Vite's peer — supplied by whoever runs a Vite build).
  Vite _dev_ needs neither (Vite's dev server doesn't invoke esbuild); Vite
  _build_ does, so `esbuild` is pinned in the repo's **root `devDependencies`**
  (for our own Vite tests/examples) — a dev-only need, never a published/peer
  dependency. Consumers who run Vite bring their own (it's Vite's optional
  peer).
- **Machine load:** integration tests spawn full apps + Playwright with a ~30s
  `waitStarted`. Close heavy apps first (an earlier run was wrecked by a game at
  load avg 36).

## Vite path

Same `?url`/`?file`/`?text`/`?raw`/`?react` API under Vite as on Bun, dev +
build. Design: **lean on Vite's natives** where they exist; point0 only takes
over what Vite lacks. All of it lives in `compilerVitePlugin` (`enforce: 'pre'`,
so it wins over Vite's asset plugin for the queries it claims; the dev-vs-build
signal comes from `compiler.built`, set per-build by the engine — not from
Vite's `config.command`). No second Vite plugin and no extra wiring — it already
receives `compilerOptions.assets`.

- **`?url` / `?raw` / bare → Vite native.** `viteAssetMode` returns `null` for
  these, so `load` falls through to Vite's own asset handling: dev → its dev URL
  (e.g. `/logo.svg`), build → `/assets/<name>-<hash>.<ext>` (or an inline
  `data:` URI under the 4 KB `build.assetsInlineLimit`). Both `/`-absolute, SSR
  == client.
- **`?text` → string.** Read the file, `export default <json>`.
- **`?react` → SVGR component.** Our own `@svgr/core` via the shared `svgrToJsx`
  (identical to the Bun path), then
  `transformWithEsbuild(jsx, { loader: 'jsx' })` to transpile SVGR's JSX (Vite
  won't auto-transform a `.svg?react` id; `transformWithEsbuild` is re-exported
  by Vite, so it works whatever Vite bundles with).
  `compiler.assets.svgr: false` opts out → `load` returns `null` so a user's own
  `vite-plugin-svgr` can claim it.
- **`?file` → server-readable path.** Dev (or no `fileDir`): the source path on
  disk. Build: copy the bytes to the build `fileDir` (threaded at the
  client/server `getViteConfigForBuild` sites) and return
  `fileURLToPath(new URL('./<hash>.<ext>', import.meta.url))` — the same shape
  as Bun, resolving next to the emitted server chunk.

The test template's `vite.config.ts` carries no `vite-plugin-svgr` (point0 owns
`?react`); `@vitejs/plugin-react` stays for the app's own JSX.

### Why assets live inside the compiler plugin

Assets are handled _inside_ the compiler plugin, not as a second plugin — so a
future maintainer doesn't split them back out. Rationale:

- Deciding what `import x from './x.png'` _means_ is the compiler's job — the
  same category of work as the `.md`/`.mdx` and env-const transforms the
  compiler already owns. Assets are a sibling of those, so they belong under the
  same roof and the same `compiler.*` config.
- Assets share the compiler's activation condition and lifecycle exactly:
  they're meaningful only when point0 owns the build (consistent client==server
  URL + dev serving), which is precisely "compiler enabled." The compiler is
  _always_ present in the Vite path anyway (it splits server/client code
  regardless of assets), so "assets without the compiler" isn't a real scenario
  — only the deliberate `compiler: false` native-escape-hatch.
- Separation of concerns is preserved at the **module** level: all asset logic
  stays in `assets.ts`; the compiler plugin merely _invokes_ it
  (`applyAssetsBunPlugin`). One plugin ≠ one blob.

Assets ride inside the compiler options already threaded everywhere (incl.
`POINT0_STATIC_COMPILER_OPTIONS` to the dev child); the Vite query forms live in
`compilerVitePlugin`, not a second Vite plugin.

## Decisions locked

- URL scheme `/_point0/assets/<hash>.<ext>` — a fixed, unscoped constant
  (`ASSET_URL_PREFIX`), baked as a literal; `hash = sha256(bytes).slice(0, 16)`
  (ours; identical client + server).
- Default managed extensions: images (`png jpg jpeg gif webp avif ico bmp svg`),
  a/v (`mp3 wav ogg mp4 webm mov`), fonts (`woff woff2 ttf otf eot`), other
  (`pdf zip gz csv xml`). `txt` intentionally not managed.
- `with { type }` on a managed extension can't be honored (Bun limitation) — use
  the `?` query API or drop the ext.
- The pipeline is **compiler-gated**: `compiler: false` keeps native bundler
  behavior on that side.
- **Assets are part of the compiler plugin, not a second plugin** — config lives
  in `compiler.assets`, the pipeline rides inside `compilerBunPlugin` and
  `compilerVitePlugin`. See "Why assets live inside the compiler plugin" above.
- The pipeline is governed by config alone (`compiler: false` / `assets: false`
  / `enabled: false`), consistent with every other compiler feature — there is
  no env kill-switch.
- Vite uses its **native** asset URLs (lean-on-natives); point0 does not re-own
  asset URLs in Vite. Vite _dev_ → Vite's dev URL (e.g. `/logo.svg`); Vite
  _build_ → `/assets/…` (inline `data:` under 4 KB). Both `/`-absolute, SSR ==
  client.
- The generated d.ts's **bare**-import type follows
  `compiler.assets.defaultMode` (`string` for url/file/text, the React component
  for react+svg); the explicit query forms are fixed
  (`?url`/`?file`/`?text`/`?raw` → `string`, `*.svg?react` → component).
- point0 declares **neither** `vite` nor `esbuild` (both are peers). Bun and
  Vite-dev need neither; only Vite-build needs esbuild.

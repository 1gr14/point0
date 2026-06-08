# Dev source maps under Bun (correct file:line in error stacks)

**Status: LANDED & verified.** In dev, `point0` compiles user source to a
different shape/location than the original (the content-addressed hot store, and
onLoad-transformed sources), so a thrown error's `Error.stack` used to point at
the compiled file with compiled line numbers. This doc explains why, what
does/doesn't work under Bun, and the solution we shipped.

## The problem

- **Hot store:** each user file is compiled and written to
  `node_modules/.cache/server-hot/<scope>-<port>/<name>.<hash>.tsx`. A throw
  reports `…/server-hot/…/pages_home.<hash>.tsx:47`, not
  `src/pages/home.tsx:55`.
- **onLoad (non-hot dev):** the compiler runs as a Bun `onLoad` plugin; the
  on-disk file is the untransformed original but Bun runs the transformed code,
  so the path is right but the **line** is the transformed line.

## What does NOT work under Bun (all empirically tested, Bun 1.3.14)

1. **Bun does not consume external/inline source maps for runtime
   `Error.stack`.** A pure `.js` from `bun build --minify --sourcemap=inline`,
   imported and thrown, still reports `compiled.js:1`. Bun only applies maps
   from its **own** transpilation. (`.tsx` store files: Bun re-transpiles them
   and uses its own map → store path. `.js`: Bun ignores our inline map.)
   esbuild plugins, `Bun.build` sourcemaps, `NODE_OPTIONS=--enable-source-maps`,
   `BUN_*` env — none make Bun read our maps at runtime.
2. **~~`POINT0_BUN_COMPILER_EXPERIMENTAL_FIX` (babel
   `retainLines`/preserveFormat)~~ — REMOVED (2026-06-06).** It kept compiled
   lines == original lines so a store frame showed the correct LINE (but still
   the store PATH) without runtime maps. `source-map-support` now does that job
   better (PATH **and** line, default-on, no syntax risk), so the flag — opt-in,
   off-by-default, and risky (preserveFormat reuses source spans → can emit
   broken syntax) — was deleted from the compiler. Its one residual edge (fixing
   the LINE for the Bun-native-reporter path in item 3) wasn't worth the
   complexity; that path is an accepted limit.
3. **Bun's `console.error(errorObject)`, `console.trace()`, and uncaught errors
   bypass the JS `.stack` getter entirely** — Bun's native error reporter
   formats them itself. Proven: set `e.stack = 'SENTINEL'`, then
   `console.error(e)` still prints the compiled path, ignoring the mutation.
   **No JS-level fix exists for these under Bun** (it's a Bun limit).

## The solution: `source-map-support` + maps we feed it

`Error.prepareStackTrace` **is** implemented in Bun. `source-map-support`
overrides it and remaps `err.stack` **itself** using maps we provide. So we
don't need Bun to honor anything — we remap.

- **engine** auto-installs `source-map-support` in `prepare()` for any
  bun-native dev (gated `!itWasBuilt && !viteConfig`; off in prod / under Vite,
  which keeps its own `ssrFixStacktrace`). `handleUncaughtExceptions: false`
  (Bun's native uncaught reporter bypasses `prepareStackTrace` anyway).
  `Engine._installBunSourceMapSupport()`.
- **Two map delivery paths** (one process-global `retrieveSourceMap` covers both
  — registry first, else SMS reads a file's inline `//# sourceMappingURL`):
  - **Hot store** → inline maps on disk. `server-hot-store.ts` compiles with
    `map: true` and appends the inline map (`appendInlineSourceMap`). SMS's
    default file-read finds it.
  - **onLoad (non-hot dev, + the boot/cold chain in hot mode)** → in-process
    registry. The map lives only in memory (the disk file is the original), so
    the onLoad plugin stashes it in `globalThis.__POINT0_DEV_SOURCEMAPS__`
    (`getDevSourceMapRegistry()`, gated to the dev runtime, not the bundler).
    SMS's `retrieveSourceMap` reads it via `lookupDevSourceMap(source)`. Both
    the registry and `appendInlineSourceMap` live in one neutral module
    (`compiler/src/sourcemap.ts`, re-exported from the package index) so the
    inline-map format and the registry contract are each defined exactly once —
    the plugin (producer) and the engine (consumer) import the same symbols
    instead of redeclaring the `globalThis` shape.
- **Unmodified files need an identity map.** The compiler returns `map: null`
  for files it doesn't transform (`compile()` →
  `{ code: cf.content, map: null }`). Those store files are line-identical to
  the original (only import specifiers were rewritten in place), so the LINE is
  already right — but without a map SMS can't rewrite the store PATH. Fix:
  `identitySourceMap()` in `server-hot-store.ts` emits a line-level identity map
  (`AAAA;AACA;…`) with `sources: [originalAbs]` for those files. (onLoad doesn't
  need this — an unmodified file's onLoad frame already shows the original
  path:line.)
- **Enabler:** the compiler cache bug fix. `getSettingsHash` did not include
  `map`/`hmrFix`, so a `map:false` result was served for a `map:true` request (→
  no map). Now the cache partitions on `map` + `hmrFix`.

## Coverage

✅ Anything that **reads `err.stack`** (a string): point0's error overlay,
structured logs, the serialized dev error response, `console.error(err.stack)`,
libs that read `.stack`. Both `--hot` and plain `point0 dev`. Path **and** line
(and column for transformed files; column 0 for identity-mapped unmodified
files).

❌ `console.error(errorObject)`, `console.trace()`, uncaught (terminal) — Bun
formats these natively, bypassing the JS stack. Hard Bun limit; nothing on the
JS side fixes it.

## Coverage matrix (which path remaps a server-side `err.stack`)

|                                 | unmodified file                                 | modified file (points/env/imports)  |
| ------------------------------- | ----------------------------------------------- | ----------------------------------- |
| **hot store** (file relocated)  | `identitySourceMap()` inline map (path rewrite) | compiler's real map, inline         |
| **onLoad** (file NOT relocated) | Bun's OWN transpile map (disk == original)      | dev registry → `source-map-support` |

All four cells land at the original `file:line`. The bottom-left needs nothing
from us: the on-disk file is the original (only Bun re-transpiles it), so Bun's
own map already points home — that's why `identitySourceMap` lives in the store
(the only stage that RELOCATES a file), not in the compiler. The compiler's
`map: null` for an unmodified file is a correct "I didn't transform this"
signal, not a bug; each transform stage owns the map for ITS transform (the
store owns the path-relocation identity map; the compiler owns the content map).

## Client / browser side — a SEPARATE, still-open gap (everything above is SERVER only)

All of the above fixes the dev server (Node/Bun) stack. Errors that surface in
the **browser** (a client React render / effect) are NOT covered, and the source
map does NOT reach your real line. Investigated live (`examples/basic`, bun dev,
2026-06-06) with a `console.error(new Error())` in a page effect on
`src/pages/smap.tsx:6`:

- Bun's client dev bundler DOES serve a map
  (`//# sourceMappingURL=…/index-*.js.map`, 200) — so it's not "missing".
- But there are TWO client transforms: (1) **our compiler** turns `smap.tsx`
  into an intermediate (hoist render fn, react-compiler memoization, effect →
  `_temp`) WITH a correct inline map (intermediate→original, verified:
  intermediate L33 → original L6); (2) **Bun's bundler** bundles that
  intermediate and emits a map `bundle → intermediate`, but does **NOT chain our
  inline map**. So the served map stops at the intermediate: it resolves the
  error to `smap.tsx:33` pointing at generated code (`function _temp(){…}`), not
  your real `smap.tsx:6`.
- Net browser experience: the raw `error.stack` string shows the bundle URL
  (`index-*.js:60814`), and DevTools (using the served map) shows `smap.tsx:33`
  of the TRANSFORMED intermediate. Either way you don't land on your source
  line.
- Root cause is the SAME family as the server side (Bun ignores our inline maps)
  — but on the bundler side, and `source-map-support` (a Node
  `prepareStackTrace` hook) can't help the browser. It's Bun issue **#6173**
  (open enhancement; PRs #30539 / #20865 in progress, unmerged): Bun's bundler
  doesn't read the inline map an onLoad plugin returns.
- **PRODUCTION build is affected identically** (verified on `point0 build` of
  `examples/basic`): each `dist/client/*.js.map` carries the TRANSFORMED
  intermediate as `sourcesContent` (417 lines for home.tsx, full of
  `react/compiler-runtime` / `_c(` / `_temp` markers), not the 189-line
  original. So prod browser stacks / Sentry would point at generated code too.
- **Fix:** we don't need Bun to chain — we have BOTH halves and compose them
  ourselves. Bun emits `bundle → intermediate`; the intermediate carries its OWN
  inline `intermediate → original` map (in `sourcesContent`). They're collapsed
  with `@jridgewell/remapping` (already a dep; the compiler uses it for
  react-compiler chaining).
  - **PRODUCTION — DONE (2026-06-06).** `packages/engine/src/sourcemap-chain.ts`
    (`chainSourceMap` / `chainBundledSourceMaps`): after the client `Bun.build`,
    `EngineClient.buildByBun` rewrites every `dist/client/*.js.map` — for each
    source that carries our embedded inline map, hand it to `remapping` so the
    chain collapses to `bundle → original`, then relativize sources back to the
    map dir (drop `file://` / build-machine abs paths). Gated on
    `NODE_ENV==='production'` (external maps) + our compiler running. Verified
    end-to-end on `examples/basic`: build logs
    `re-chained 12/18 client chunk maps`, and `chunk-*.js.map`'s
    `sourcesContent` for home.tsx went from the 417-line intermediate (markers)
    to the **189-line real original, zero markers**. Unit test:
    `engine/tests/sourcemap-chain.test.ts` (a bundle position resolves to the
    original line, sources relativized, null when nothing to chain).
  - **DEV — investigated, intentionally NOT done (blocked cleanly; will
    self-heal via Bun #6173).** The build-time gate is `NODE_ENV`-independent
    now (`chainBundledSourceMaps` handles BOTH external `*.js.map` and
    inline-in-`*.js`), so a one-shot `point0 build` in any env is covered. But
    the dev _server_ can't be patched the same way:
    - The client dev server is a `Bun.serve` with an **HTMLBundle** route
      (`routes: { '/index.html': indexHtml }`). Bun bundles + serves the assets
      (`/_bun/client/*.js`, `*.js.map`) **internally, before the `fetch`
      handler** — proven with a sentinel: a `.js.map` request returns the real
      map, never reaching `fetch`. So there is no in-server hook to rewrite the
      served map.
    - The only interception point is a **proxy in front** of the dev server
      (fetch Bun's map from an inner server, re-chain, return) — but that proxy
      must pass through Bun's **HMR websocket**, and HMR here is the area the
      code explicitly flags as fragile ("hmr will be always enabled… please do
      not try this… Very hard to debug", client.ts `startDevServer`). High risk
      for a dev-only DX gain.
    - **Why deferring is fine:** our compiler already emits a CORRECT
      `intermediate → original` inline map in the dev bundle too (verified — the
      served map's `sourcesContent` carries it). Bun just doesn't chain it
      (#6173). So the moment Bun ships #6173 (PRs #30539/#20865), **dev fixes
      itself for free** — no proxy needed. Prod (the high-value,
      error-monitoring case) is handled now; dev is a wait-on-upstream.

## Verified

- Live `examples/basic`: error response shows `src/pages/home.tsx:55`
  (complex/modified page) and `src/pages/smin.tsx:4` (minimal/unmodified page
  via the identity map), 0 store-path mentions — for both `--hot` and non-hot
  dev.
- Tests: `dev.test.ts` → `describe('dev source maps (bun-native)')` (hot +
  non-hot guards), and **`'keeps error stack'` is now un-gated for bun** (was
  `it.if(bundler !== 'bun')`, skipped per bun#6173). The proof is its **page2**
  case — a loader (SERVER-side) throw: with SMS _disabled_ the bun SSR stack
  reports the COMPILED line `page.tsx:18`, with SMS it remaps to the original
  `page.tsx:23`. That 18→23 delta (confirmed by a one-off `POINT0_DISABLE_SMS`
  probe) is the genuine, non-coincidental evidence the onLoad+registry pipeline
  works under bun.
  - **page1** (a client React _render_ `new Error()`) is only existence-checked,
    NOT line-asserted. The compiler hoists the render fn to the bottom of the
    file (`addHmrFix` → `externalizeFirstArrowFunctionArg`), so `new Error`
    compiles to a lower line (e.g. 12→15) — but OUR sourcemap correctly points
    it back to 12 (verified by tracing the emitted map). So our map is NOT the
    problem. Under bun the SSR stack lands on 12 even WITHOUT SMS (SMS only
    nudges the column 21→19), so page1 doesn't exercise the fix. Under vite it
    mis-maps to ~21 because vite re-processes the hoisted _component_ (React
    Fast Refresh) and its chained map lands off — the loader (page2), NOT a
    component, maps fine under vite (23). So the vite gap is component-specific
    and vite-side, not a defect in how we emit maps.

## Code pointers

- `packages/engine/src/engine.ts` — `_installBunSourceMapSupport()` (install +
  `retrieveSourceMap` → `lookupDevSourceMap`).
- `packages/engine/src/server-hot-store.ts` — `identitySourceMap`, `map: true`
  compile (uses `appendInlineSourceMap`).
- `packages/compiler/src/sourcemap.ts` — single owner of the inline-map WIRE
  FORMAT (`appendInlineSourceMap`, `encodeInlineSourceMap`,
  `extractInlineSourceMap`, `INLINE_MAP_TRAILING_RE`) + the dev registry
  (`getDevSourceMapRegistry`, `lookupDevSourceMap`).
- `packages/engine/src/sourcemap-chain.ts` — build-time chaining; imports the
  wire-format helpers from `@point0/compiler`.
- `packages/compiler/src/plugin/bun.ts` — onLoad map registration (imports from
  `sourcemap.ts`).
- `packages/compiler/src/compiler.ts` — `getSettingsHash` (cache key now
  includes `map`/`hmrFix`).
- Dep: `source-map-support` (+ `@types/source-map-support`) in the root
  catalog + engine.

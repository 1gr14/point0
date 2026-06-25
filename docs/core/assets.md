---
index: 900
title: Assets
description:
  Import images, fonts, and files — content-hashed URLs that match across SSR
  and client, plus SVGR, ?text, and ?file.
---

`import` an asset and Point0 turns it into a stable, app-absolute URL —
`/_point0/asset/<hash>.<ext>` — that is identical in the browser bundle and the
SSR runtime, so the server HTML and the client agree (no hydration mismatch).
Query suffixes pick a different shape: `?react` gives an SVG React component,
`?text` inlines the file as a string, `?file` gives a server-readable path.

```tsx
import gemUrl from '@/assets/gem.png' // a URL string
import GemIcon from '@/assets/gem.svg?react' // an SVG React component

export const homePage = root.lets.page('/').page(() => (
  <div>
    <img src={gemUrl} width={40} height={40} alt="gem" />
    <GemIcon width={40} height={40} />
  </div>
))
```

That's from [examples/basic](example-basic). The rest of this page shows the
import modes, SVGR, the generated typings, and the engine config.

## Why Point0 manages assets

Under SSR, Bun's native file loader hands the **server runtime an absolute file
path** but the **client bundle a bundled URL** — two different values for the
same import, which mismatches on hydration. Point0 computes the URL from **one
source of truth (its own content hash)**, so both sides emit the same string.
The same plugin runs everywhere; the URL doesn't depend on two builds
coincidentally agreeing.

This pipeline is **gated on the compiler**: a side with `compiler: false` keeps
the bundler's native asset behavior and Point0 doesn't touch its imports. Under
[Vite](bun-vs-vite), Vite owns asset URLs natively, so Point0 only takes over
the `?text` / `?file` / `?react` forms; bare imports stay Vite's.

## Import modes

A bare import (or `?url`) is the default: **url mode**. Three query suffixes
change the shape.

```tsx
import logo from './logo.png' // url mode (default) → '/_point0/asset/<hash>.png'
import logoUrl from './logo.png?url' // same as bare — same module, same URL
import Logo from './logo.svg?react' // react mode → an SVG React component
import logoSvg from './logo.svg?text' // text mode → the file's utf-8 contents
import logoFile from './logo.png?file' // file mode → a server-readable path
```

`?url` and the bare import resolve to the **same** module; `?file` is a distinct
module. `?raw` (Vite's spelling) is an alias for `?text`.

### url mode — the default

The bytes are written out and the import value is the served URL
`/_point0/asset/<hash>.<ext>`:

```tsx
import gemUrl from '@/assets/gem.png'
// gemUrl === '/_point0/asset/a1b2c3d4e5f60718.png'  (16-hex content hash)
;<img src={gemUrl} alt="gem" />
```

The hash is the first 16 hex chars of the file's sha256. The served name is flat
and content-addressed — no slashes, no `..`, so no path traversal.

### react mode (`?react`) — SVGR, svg only

`?react` runs the SVG through [SVGR](https://react-svgr.com/) and gives you a
React component:

```tsx
import GemIcon from '@/assets/gem.svg?react'
;<GemIcon width={40} height={40} /> // renders an <svg>
```

`?react` is **svg only** — any other extension throws at build:

```tsx
import X from './photo.png?react'
// build error: [point0] assets: `?react` is only supported for .svg files
```

It also requires SVGR to be enabled. With `svgr: false` (see [config](#config))
`?react` throws so you can bring your own SVGR plugin instead:

```tsx
import X from './logo.svg?react'
// build error: [point0] assets: `?react` is disabled (compiler.assets.svgr === false)
//              — enable it or bring your own SVGR plugin
```

Your app must have `@svgr/core` and `@svgr/plugin-jsx` installed (the
[scaffold](getting-started) adds them). See [SVGR details](#svgr-details) below
for the runtime gotchas.

### text mode (`?text`, alias `?raw`)

`?text` inlines the file's utf-8 contents as a string — handy for inlining an
SVG's markup rather than linking it:

```tsx
import favicon from '@/assets/favicon.svg?text'
// favicon === '<svg xmlns="..." viewBox="...">...</svg>'
;<Svg src={favicon} /> // a component that renders raw SVG markup
```

> **GOTCHA:** use the explicit `?text` suffix — **not**
> `import x from './x.svg' with { type: 'text' }`. Bun doesn't expose import
> attributes to plugins, so for a managed extension the pipeline wins and you
> silently get a `/_point0/asset/…` URL string instead of the text. The
> generated typings type both as `string`, so TS won't catch it. See
> [Bun gotchas](#bun-gotchas).

### file mode (`?file`) — server-side file access

`?file` gives a path the **server** reads at runtime, resolved relative to the
chunk so it's cwd-independent. It's for server-side file access, so keep it in a
server [loader](loader) or [action](action), never in a page render — the
server's path and the client's would differ and mismatch on a hydrated page:

```tsx
import logoFile from './logo.svg?file'
import nodeFs from 'node:fs'

export const filecheck = root.lets
  .action('GET', '/api/file-check')
  .loader(() => ({ fileLen: nodeFs.readFileSync(logoFile, 'utf8').length }))
  .action()
```

In a [build](build) the bytes are copied next to the bundle and the path
resolves via `import.meta.url`; in [dev](dev) (no output dir) the value is the
original source path.

## Managed extensions

Point0 manages the extensions Bun resolves to its `file` loader — images, audio,
video, fonts, and a few data files. The default set:

```
png jpg jpeg gif webp avif ico bmp svg     # images
mp3 wav ogg mp4 webm mov                    # audio / video
woff woff2 ttf otf eot                      # fonts
pdf zip gz csv xml                          # other binary / data
```

`svg`, `csv`, and `xml` are included on purpose (Bun's `file` loader handles
them). `txt` is **intentionally absent** — Bun has a built-in `text` loader for
it, so `import t from './note.txt'` is left untouched and gives you the file's
text:

```tsx
import note from './note.txt' // not managed → Bun's text loader → 'hello text'
```

Any extension **not** in the set is left entirely to the bundler, including
`with { type }`. Override the set via [config](#config) — drop an extension to
hand it back to Bun, or add one to manage it.

Every extension in the set goes through the same pipeline, so url / `?file` /
`?text` behave the same regardless of type (only `?react` is special — svg
only).

## The generated typings (`assets.d.ts`)

So `import x from './x.png'` is typed (like `vite/client`), the
[generator](generator) emits an ambient `assets.d.ts` declaring every managed
import. Wire it once in the engine's `generate` config:

```tsx
generate: {
  meta: './generated/point0/meta.ts',
  assetsTypes: './generated/point0/assets.d.ts',
}
```

`point0 generate` ([CLI](cli)) writes the file; it's gitignored and regenerated,
so never edit it. It lands under `src/generated/`, which your `tsconfig`
`include` already covers — no manual `reference` needed. The output starts with
an auto-generated banner and declares, per managed extension, the bare module
plus each query form:

```ts
// AUTO-GENERATED by point0 — do not edit. ...
declare module '*.png' {
  const src: string
  export default src
}
declare module '*.png?url' {
  /* string */
}
declare module '*.png?file' {
  /* string */
}
declare module '*.png?text' {
  /* string */
}
declare module '*.png?raw' {
  /* string */
}
```

The **bare** module's type follows `defaultMode`: `string` for
`url`/`file`/`text`, or the React component for `react`. `*.svg?react` is
declared as a component only when `svg` is in `extensions` (SVGR is svg-only):

```ts
declare module '*.svg?react' {
  import type { FC, SVGProps } from 'react'
  const ReactComponent: FC<SVGProps<SVGSVGElement>>
  export default ReactComponent
}
```

With `defaultMode: false` the bare module is **omitted** entirely (so the
bundler's own ambient types own a bare import and `with { type }` results aren't
mistyped) — the query forms are still declared.

The extension list and `defaultMode` come from one source: the general
`compiler.assets`. They default from there so the typings match what the plugin
emits; `assetsTypes.extensions` can override the extension list for the typings
only.

## Config

Assets ride along with the [compiler](compiler). With the compiler on and no
`assets` block, the pipeline is **on with defaults** — the examples and start0
omit it entirely. Configure it under `assets`:

```tsx
Engine.create({
  // ...
  assets: {
    enabled: true,
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg'], // managed set (default: the full list)
    defaultMode: 'url', // how a bare import resolves (default 'url')
    svgr: {}, // SVGR options, or false to disable ?react
  },
})
```

`assets: false` disables the pipeline for that side (the compiler stays on).
`defaultMode: false` is **not** the same: the pipeline stays on, only the bare
default opts out — explicit `?url` / `?file` / `?text` / `?react` still resolve.

### Where it can be set

There are four layers; the more specific wins:

| Layer                                               | Scope                          |
| --------------------------------------------------- | ------------------------------ |
| `assets`                                            | whole engine (general)         |
| `compiler.assets`                                   | whole engine (general, nested) |
| `server.assets` / `client.assets`                   | one side                       |
| `server.compiler.assets` / `client.compiler.assets` | one side (nested)              |

A general top-level `assets` folds into `compiler.assets`; a nested
`compiler.assets` wins over a sibling top-level `assets`; a per-side block wins
over the general one. Merging is field-by-field — specific wins per field.

> Keep `extensions` / `defaultMode` / `svgr` **identical across sides**. They
> must agree for client and SSR to emit the same URL; a per-side override is
> allowed but is a footgun.

## Assets vs the public dir

Two different mechanisms — don't confuse them:

- **The asset pipeline** (this page): `import`-driven, content-hashed, served at
  `/_point0/asset/<hash>.<ext>`, typed, with the `?react`/`?text`/`?file` modes.
- **The [public dir](publicdir)**: static files served **verbatim** from a
  source dir at chosen route prefixes — `favicon.ico`, `robots.txt`, and the
  like. Not hashed, not imported, not typed.

In a [build](build) the same `dist/client` dir serves both — the pipeline's
`/_point0/asset/*` lives next to your public files. Use the pipeline for
anything you `import` into code; use the public dir for files referenced by a
fixed, public URL.

## How assets are served

- **[Dev](dev)** (Bun): the plugin caches the bytes content-addressed under
  `node_modules/.cache/@point0/assets`, and a dev route serves them back from
  there. Only names matching `<hash>.<ext>` are accepted — no path traversal, no
  arbitrary file read; Point0 only ever serves assets you actually imported.
- **[Build](build)** (Bun): the client build writes url-mode bytes to
  `dist/client/_point0/asset/`, served by the static `dist/client` public dir in
  production. The server build doesn't re-copy them — both sides compute the
  same hash, so the server only emits the matching URL.
- **[Vite](bun-vs-vite)**: Vite serves url-mode assets natively (its own
  app-absolute URL, identical client and server); Point0 handles only
  `?text`/`?file`/`?react`.

The cross-build contract is the one thing guaranteed everywhere: one
app-absolute URL, shared by SSR and client, served and rendering — verified for
Bun and Vite, in both dev and build.

The `Content-Type` isn't a Point0 table — the dev route hands the file to
`new Response(Bun.file(path))`, so Bun infers the mime from the extension; in a
build the static `dist/client` dir serves the bytes the same way. The served
name keeps the original extension (`<hash>.<ext>`), which is what that inference
reads.

## SVGR details

A few load-bearing internals, in case `?react` behaves oddly.

- **Classic JSX runtime is forced.** Point0 transpiles SVGR output with the
  classic runtime (`import * as React`), so it sets `jsxRuntime: 'classic'`
  after your options. `'automatic'` would drop the React import and crash with
  "React is not defined" at render.
- **Component name is internal.** SVGR default-exports the component; your
  import names its own binding, so the derived name is cosmetic. Point0 derives
  it from the filename (`logo.svg` → `Logo`) and prefixes any collision with
  `Svg` (so `react.svg` → `SvgReact`, never the reserved `React`).
- **Options.** `svgr` is `@svgr/core`'s `Config` — `icon`, `typescript`,
  `svgoConfig`, `plugins`, etc. Point0's defaults (classic runtime,
  `@svgr/plugin-jsx`) are spread under your options.

Under [Vite](bun-vs-vite), `svgr: false` makes Point0 hand `?react` back so your
own plugin (e.g. `vite-plugin-svgr`) can claim it.

## Bun gotchas

These come from Bun's plugin model (verified empirically) and explain a few
surprises:

- **`with { type: 'text' }` is ignored for a managed extension.** Bun doesn't
  expose import attributes to plugins and dedupes by path, so the pipeline
  hijacks the import to a URL regardless of the attribute. Use the `?text`
  suffix instead. Two escape hatches: drop the extension from `extensions`, or
  set `defaultMode: false` — either hands the bare import back to Bun, where
  `with { type }` works again.
- **A `?file` query only survives as a distinct module** because `onResolve`
  keeps the suffix in the returned path — otherwise Bun would dedupe `./x.png`
  and `./x.png?file` into one.

## Reference

### Import modes

| Suffix   | Value                         | Notes                               |
| -------- | ----------------------------- | ----------------------------------- |
| bare     | served URL `string`           | url mode — the default              |
| `?url`   | served URL `string`           | same module as bare                 |
| `?react` | `FC<SVGProps<SVGSVGElement>>` | SVGR component; **svg only**        |
| `?text`  | the file's utf-8 `string`     | inlined contents                    |
| `?raw`   | the file's utf-8 `string`     | alias for `?text` (Vite's spelling) |
| `?file`  | server-readable path `string` | server-only; use in a loader/action |

When several flags are present (rare — one per import in practice), precedence
is `file` > `react` > `text`/`raw` > `url`.

### Config (`assets` / `compiler.assets`)

| Field         | Type                                            | Default               |
| ------------- | ----------------------------------------------- | --------------------- |
| `enabled`     | `boolean`                                       | `true` (compiler on)  |
| `extensions`  | `string[]`                                      | the full managed list |
| `defaultMode` | `'url' \| 'file' \| 'text' \| 'react' \| false` | `'url'`               |
| `svgr`        | `@svgr/core` `Config` \| `false`                | `{}` (enabled)        |

`assets: false` / `enabled: false` disables the pipeline for that side.
`defaultMode: false` keeps it on but opts the **bare** import out (queries stay
managed) and omits the bare module from the typings.

`urlDir`, `fileDir`, and `writeUrlBytes` exist on the resolved internal shape
but are filled in per-build by the engine — not user-facing.

### Public API (`@point0/compiler`)

For bring-your-own-bundler use, the module re-exports: `ASSET_URL_PREFIX`,
`resolveAssetsCacheDir`, `assetNameRegex`, `DEFAULT_ASSET_EXTENSIONS`,
`assetHash(buffer)`, `writeAssetOnce(dir, name, buffer)`,
`makeAssetsBunPlugin(options?)`, `applyAssetsBunPlugin(build, options?)`,
`svgrToJsx`, `viteAssetMode`, and `generateAssetsDts(options?)`, plus the
`AssetResolveMode`, `AssetsSvgrOptions`, and `CompilerAssetsOptions` types.

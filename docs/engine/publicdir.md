---
index: 1100
title: Public dir
description:
  Serve static files — favicons, robots.txt, the built bundle — straight from
  disk at a route prefix.
---

A `publicdir` serves files from disk verbatim — same name, same bytes, at the
route you mount them on. You configure it per side (`client` or `server`), point
`source` at a directory, and set `outdir` to where those files are copied at
build time. In production it's also what serves your whole built client bundle
at `/`.

```ts
// examples/basic/src/engine.ts — on the client side
publicdir: {
  source: [
    '../public', // every file under public/ → served at /
    {
      // virtual files: the function's return value is the file body
      '.well-known/appspecific/com.chrome.devtools.json': () => '{}',
      'robots.txt': () => 'User-agent: *\nDisallow: /',
    },
  ],
  outdir: '../dist/client',
},
```

With this, `public/favicon.ico` is served at `/favicon.ico`, and `/robots.txt`
returns the inline string — no route, no point, no compiler involvement.

> **Naming:** the key is **`publicdir`** (one lowercase word), not `publicDir`.

## The simplest form

Most apps just point `source` at one directory and copy it into the client
build:

```ts
publicdir: {
  source: '../public', // mounts public/ at /
  outdir: '../dist/client',
},
```

A bare string mounts that directory at `/`. Relative paths resolve against the
engine's `cwd`.

## Where it goes in the config

`publicdir` is a property of a **side**, not a top-level engine option. Both the
`server` and each `client` (including entries in `clients[]`) take their own
`publicdir`:

```ts
Engine.create({
  server: {
    /* ... */
    publicdir: { source: '../public-server', outdir: '../dist/server/public' },
  },
  client: {
    /* ... */
    publicdir: { source: '../public', outdir: '../dist/client' },
  },
})
```

The examples ship `publicdir` on the **client** side, since that's where the web
assets live. The server side accepts the same shape, so use it when the server
origin needs to serve its own static files.

## `source` — what to serve

`source` accepts a string, an object map, an array, or any mix. A **string** is
a directory mounted at `/`. An **object** maps route paths to directories or
functions. An **array** combines both, plus `[routePath, value]` tuples:

```ts
source: [
  '../public', //                         directory → mounted at /
  { '/assets': '../other/dir/assets' }, // a directory elsewhere → mounted at /assets
  ['/static', '../shared/static'], //      tuple form, same effect
  { 'robots.txt': () => 'User-agent: *' }, // function → one virtual file
]
```

The **value** behind a route is one of two things:

- **A directory path (string).** Every file under it is walked recursively and
  mounted under the route prefix. `{ '/a': '../public-a' }` serves
  `../public-a/one.txt` at `/a/one.txt`.
- **A function `() => string | Promise<string>`.** It produces a single virtual
  file whose body is the return value, served at the function's route path. Sync
  or async both work:

```ts
source: {
  'robots.txt': () => 'User-agent: *\nDisallow: /',
  'config.json': async () => JSON.stringify(await loadConfig()),
}
```

Route paths are normalized: a leading slash is added, a trailing slash stripped,
repeated slashes collapsed. So `'robots.txt'` and `'/robots.txt'` resolve to the
same `/robots.txt`.

> **Note — when a function file is re-invoked.** In `dev`, where files are read
> live, a function entry is re-invoked per request and never cached — only real
> files (directory entries) hit the in-memory cache — so keep dev-time function
> bodies cheap. A **build** invokes each function once and writes its output as
> a real file into `outdir` (see below); in production that file is indexed,
> served, and cached like any other, and the function never runs per request.

> **Gotcha — a typo'd source path fails silently.** A missing or
> permission-denied source directory yields zero files with no warning — the
> route just 404s. Double-check relative paths.

## `outdir` — required, or nothing serves

```ts
publicdir: {
  source: '../public',
  outdir: '../dist/client', // copy target at build time
},
```

`outdir` is the directory the publicdir's files are **copied into at build
time**. In every example it equals the client build `outdir`, so static files
land next to the JS bundle.

> **Gotcha — no `outdir`, no publicdir.** If you omit `outdir`, the whole
> `publicdir` resolves to `null` and **nothing is served**, even with a valid
> `source` — silently, with no default. If your static files 404, check that
> `outdir` is set.

At build time, directory entries are copied file-by-file into `outdir`, and
function entries are invoked and their output written as real files — so
`() => '{}'` becomes an actual `.json` file in `dist`. When the client JS build
and the publicdir build write to the same directory, the JS build wins (dist
files override publicdir files on a name clash).

## `cacheLimit` — the in-memory cache

Served real files are cached in memory keyed by absolute path (an LRU); each
entry holds the file's bytes and content type. `cacheLimit` bounds it:

```ts
publicdir: {
  source: '../public',
  outdir: '../dist/client',
  cacheLimit: 64 * 1024 * 1024, // 64 MB; or `false`/`0` to disable; `true`/omit = auto
},
```

| `cacheLimit`     | Effect                                           |
| ---------------- | ------------------------------------------------ |
| omitted / `true` | auto: 5% of total RAM, clamped to 32 MB – 512 MB |
| `false` / `0`    | caching disabled — read from disk every request  |
| a number         | that many bytes (floored, never negative)        |

A single file larger than the whole limit is never cached. The cache clears
whenever the file index is rebuilt.

> **Gotcha — auto can hold up to 512 MB.** On a host with lots of RAM and a big
> static dir, the auto limit (5% of RAM) climbs toward its 512 MB cap. Set an
> explicit number, or `false`, to bound memory.

Note: the publicdir cache is an **in-memory server cache only**. The responses
themselves carry no HTTP cache headers (`Cache-Control` / `ETag` / `max-age`).

For browser/CDN caching, add headers in a root [middleware](middleware): inspect
the result of `next()`, and when it served a static file
(`result.variant.type === 'publicdir'`) attach the headers before returning it.

```ts
// inside Engine.create({ server: { ... } }) — a root middleware
.middleware(async ({ next }) => {
  const result = await next()
  if (result.variant.type === 'publicdir') {
    result.response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
  return result
})
```

## How it differs from imported assets

Static files reach the browser two ways:

```tsx
// 1. Imported asset — compiler-managed, content-hashed
import logo from './logo.png'
// → served at /_point0/assets/<hash>.png, filename hashed

// 2. publicdir file — served verbatim, original name
// public/logo.png → served at /logo.png
```

[Imported assets](assets) go through the compiler: the URL is content-addressed
(`/_point0/assets/<hash>.png`), so the browser can cache them forever. A
**publicdir** file is served as-is at the route you declared, with its original
name — no hashing, no compiler.

**In production they converge.** The compiler writes hashed asset bytes into
`dist/client/_point0/assets/…`, and after a build the canonical
`publicdir: { source: '../public', outdir: '../dist/client' }` serves all of
`dist/client` at `/`. That one config serves your `public/` files **and** the
compiler-emitted hashed assets — both live in `dist/client`. See
[assets](assets) for the asset pipeline.

Practically: put files you reference by a fixed, predictable URL (favicon,
`robots.txt`, manifest, `.well-known/…`) in `publicdir`. Let `import` handle
anything you reference from code and want cache-busted.

## Serving semantics

A publicdir matches **before** pages and endpoints, and only for `GET`, `HEAD`,
and `OPTIONS`:

```ts
// request flow for GET /foo:
//   1. each publicdir is checked in order (server publicdir first, then client
//      publicdirs in clients[] order) — first match wins, served as a file
//   2. only if none match → pages / endpoints
```

> **Gotcha — a static file wins a route collision.** If a publicdir file and a
> page share a path, a `GET`/`HEAD`/`OPTIONS` request gets the file, not the
> page. `POST` and other methods fall through to endpoints.

The matched response is exposed to your code as the `'publicdir'`
[request](request) variant.

The file index is **lazy** — the directory walk happens on the first matching
request, not at startup, so a publicdir never blocks the server from coming up.
The engine also warms the index in the background, and you can force it eagerly
with `engine.preparePublicdirs()`.

When two publicdirs (e.g. server + client) claim the same route, the first in
that order wins. There is no cross-publicdir conflict validation — the collision
is silent, and the first match simply serves.

### Content type

Content type is inferred from the file. For real files it comes from Bun's file
detection; for function files it's inferred from the route's extension (`.json`
→ `application/json`, `.css` → `text/css`, …).

### Client publicdir and `serving`

A **server** publicdir always serves. A **client** publicdir inherits the
client's `serving` option (default `true`):

```ts
client: {
  serving: 'app.example.com', // this client's publicdir only serves on this host
  publicdir: { source: '../public', outdir: '../dist/client' },
}
```

`serving` is `true` (always) / `false` (never) / a host string (serve only when
`request.location.host` matches exactly) / a function (decide per request). In a
multi-client app, each client's publicdir is gated by its own `serving`.

## Production serving

There is no `point0 start` command. You start production by running the built
server directly:

```jsonc
// examples/basic/package.json
"start": "cross-env NODE_ENV=production bun run ./dist/server/index.server.js"
```

When the engine config is re-imported after a build, the publicdir `source` is
rewritten to serve the built `outdir` itself — effectively
`[['/', dist/client]]`. That's the mechanism behind "the built server serves
`dist/client` at `/`": your `public/` files, the hashed assets, and the JS
bundle all sit in `dist/client` and are served from there. This auto-rewrite is
on by default and controlled by the engine's `autoFixBuiltPaths` option.

The built server can serve `dist/client` directly, or sit behind a CDN or
reverse proxy — point0 prescribes no host-specific config either way. The
publicdir responses carry no HTTP cache headers, so if you front them with a
CDN, set caching there or attach headers in a [middleware](middleware) (see the
`cacheLimit` section). See [Deploy](deploy) for the production run-and-serve
story.

## The `--no-publicdir` build flag

One CLI flag touches the publicdir, on [`build`](build):

```sh
point0 build                  # builds JS and copies public files into outdir
point0 build --no-publicdir   # builds JS only — skips the publicdir copy
point0 build -P               # short form of --no-publicdir
```

Use `--no-publicdir` when your static files are managed separately or haven't
changed. There is no equivalent flag for [`dev`](dev) — dev always serves the
publicdir live (files are read on the fly, never copied).

## Reference

### Config shape

`publicdir` lives on `server` and on each `client`:

```ts
publicdir?: {
  source: EngineOptionsPublicdir // string | object map | array (mix)
  outdir: string //                required — copy target; omit it ⇒ nothing serves
  cacheLimit?: number | boolean // bytes; false/0 off; true/omit = auto (32–512 MB)
}
```

### `source` forms

| Form                          | Mounts                                          |
| ----------------------------- | ----------------------------------------------- |
| `'../public'`                 | that directory at `/`                           |
| `{ '/a': '../public-a' }`     | a directory at `/a`                             |
| `{ 'robots.txt': () => '…' }` | a virtual file (function body) at `/robots.txt` |
| `['/x', './dir']`             | tuple — same as the object form, one entry      |
| `[ …mix of the above ]`       | array — entries combined, in order              |

A directory value is walked recursively; a function value
(`() => string \| Promise<string>`) is one virtual file, re-run per request.

### Behavior at a glance

| Aspect             | Behavior                                                   |
| ------------------ | ---------------------------------------------------------- |
| Match order        | publicdir runs **before** pages/endpoints                  |
| Methods            | `GET`, `HEAD`, `OPTIONS` only                              |
| Index build        | lazy (first matching request); warmed in background        |
| `outdir` missing   | publicdir is `null` — nothing serves                       |
| Build-time         | directories copied; function files written as real files   |
| Dist vs publicdir  | on a same-dir name clash, dist (JS build) wins             |
| Server `serving`   | always serves                                              |
| Client `serving`   | `true` / `false` / host string / function (default `true`) |
| HTTP cache headers | none — in-memory server cache only                         |

### Related engine methods

- `engine.preparePublicdirs()` — eager-load every publicdir's file index
  (otherwise lazy on first request).
- `engine.build({ publicdir: false })` — the programmatic equivalent of
  `--no-publicdir`.
- `engine.clean()` — clean every outdir (each side's outdir **and** its
  publicdir, plus the server outdir). It takes no arguments; there is no
  `engine.clean({ publicdir })` overload. The publicdir-only clean is the
  internal `publicdir.clean()` on a `Publicdir` instance, not an engine method.

### Binary files

The build-time copy is binary-safe. Directory entries are copied with
`Bun.write(dest, Bun.file(src))` — a native byte-for-byte copy, never a UTF-8
`.text()` round-trip — so images, fonts, and other binaries land in `outdir`
intact regardless of where `outdir` points.

### Range requests and large files

With caching on (the default) a real file is read into memory on its first
request (`file.arrayBuffer()`), cached, and served from that `ArrayBuffer`;
later requests hit the cache. With caching off the file is streamed as
`new Response(Bun.file(...))`, where Bun handles range requests natively.

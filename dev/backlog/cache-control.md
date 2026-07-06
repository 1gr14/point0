# cacheControl middleware — a separate package

Point0's handlers deliberately leave `Cache-Control` unset (a CDN/browser is
left to guess), and we deliberately did NOT bake default cache headers into the
engine during the deploy-invalidation work — forcing immutable/no-cache defaults
from inside the fetcher is opaque and unconfigurable, and caching policy is app
territory. The игрич site already carries the proof-of-shape as app code:
`~/cc/projects/1gr14/src/lib/cache-headers.ts` — a middleware that sets, unless
the app already set one:

- `public, max-age=31536000, immutable` for content-hashed publicdir files
  (bundle chunks + `/_point0/assets/*`),
- a short revalidate for stable-name publicdir files (favicons, og images…),
- `private, no-store` for SSR `page`/`error` HTML (the dehydrated store embeds
  the current user's data — it must never sit in a shared cache).

Build that as a first-class package, `@point0/cache-control` (same family as
`@point0/cors` / `@point0/basic-auth`): a middleware factory users plug in
explicitly —

```ts
root.middleware(cacheControl())
// or with knobs:
root.middleware(cacheControl({ publicdir: { immutable: ..., revalidate: '1h' }, page: 'private, no-store' }))
```

Requirements from the deploy-invalidation session:

- Transparent, overridable defaults close to the игрич middleware above; an
  explicit `Cache-Control` set by the app (auth, streams, downloads) always
  wins.
- Immutable detection: pattern-based (`/chunk-<hash>.js`, `/_point0/assets/*`)
  or config; note the exact set of a build's hashed files is knowable — the
  client build can enumerate its outputs — if we ever want precision over
  patterns.
- The deploy-invalidation handshake does NOT depend on this package: the client
  fetches `/_point0/<scope>/build-version.json` with `cache: 'no-store'` on the
  request, so no response header is required for correctness. But the docs
  ([deploy](../../docs/engine/deploy.md), "Stale clients after a deploy")
  recommend the html-no-cache / chunks-immutable split — this package is where
  that recommendation becomes one line of code.
- Docs page under `extra` (like cors / basic-auth) + wire the recommendation
  from the deploy page to it.

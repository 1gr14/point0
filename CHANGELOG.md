# Changelog

All notable changes to point0. Add notes under **Unreleased** as you work; `bun run
release` promotes that section to the new version.

## Unreleased

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

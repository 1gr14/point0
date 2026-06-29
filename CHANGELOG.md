# Changelog

All notable changes to point0. Add notes under **Unreleased** as you work; `bun run
release` promotes that section to the new version.

## Unreleased

## 0.1.1 — 2026-06-29

- Initial release.
- Per-page module preloading: production builds emit a preload manifest and the
  server injects `<link rel="modulepreload">` per request for the entry's shared
  closure plus the requested page's own chunks (bun + vite). Production-build-only
  — never injected in dev (a stale `dist` manifest can't leak into dev-served
  HTML) — and disablable entirely via `POINT0_MODULE_PRELOAD=false`. See
  [dev/docs/preload-manifest.md](dev/docs/preload-manifest.md).

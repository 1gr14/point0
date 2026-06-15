# Changelog

All notable changes to point0. Add notes under **Unreleased** as you work; `bun run
release` promotes that section to the new version.

## Unreleased

- Initial release.
- Per-page module preloading: production builds emit a preload manifest and the
  server injects `<link rel="modulepreload">` per request for the entry's shared
  closure plus the requested page's own chunks (bun + vite). See
  [dev/docs/preload-manifest.md](dev/docs/preload-manifest.md).

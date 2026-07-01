# Changelog

All notable changes to point0. Add notes under **Unreleased** as you work; `bun run
release` promotes that section to the new version.

## Unreleased

## 0.1.6 — 2026-07-01

- `create-point0-app`: the template now ships a real `public/robots.txt`
  (crawl-open by default) instead of the `some.txt` placeholder, so a scaffolded
  app has a sensible robots file from the first run; the e2e test now asserts the
  client dev server serves it.
- Docs: the scaffold commands now recommend `bun create point0-app@latest` /
  `bun create start0@latest`, so `bun create` always fetches the newest
  scaffolder instead of a cached one.

## 0.1.5 — 2026-07-01

- `create-point0-app`: a scaffolded app now gets its `.gitignore` (the template
  ships it as `gitignore`, since npm strips real dotfiles, and the scaffolder
  materializes it) and a `.env` copied from `env.example`; the published package
  no longer ships `template/dev.db` or `template/src/generated`.
- Template and examples `lib/error.ts` now use the published `@1gr14/error0`
  redirect / stack plugins instead of the pre-publication local shim.

## 0.1.4 — 2026-06-30

- Dev hot-store now rewrites import specifiers via AST instead of a text regex,
  so a specifier that appears quoted inside a string or template literal (e.g. an
  `import …` shown as a code sample on a page) is no longer corrupted in the
  dev-served / SSR'd output — only real import / export-from / dynamic-import /
  require source positions are rewritten.

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

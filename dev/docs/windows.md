# Windows support

point0 runs on Windows as well as macOS/Linux. The posix platforms were green
from the start (native separator is already `/`), so essentially every
Windows-only bug traced back to **one** root cause: filesystem path-separator
identity. This page is the reference for keeping Windows working as you add
features — the per-site "why" lives in the code comments; this is the
cross-cutting story.

## The one principle: posix path identity

point0 keys files, modules, routes, caches, watch state, source-map sources and
globs by their **posix identity** (`/` separators) on **every OS** — the same
convention TypeScript, Vite, Bun, fast-glob and minimatch already use. On
Windows, `node:path` and the platform APIs emit `\`; if that leaks into logic
that assumes `/`, the same file gets two identities and caches miss, globs match
nothing, routes carry a drive letter, watch events never correlate, and stack
frames garble.

The fix is always the same shape: normalize at the boundary with
[`toPosixPath`](../../packages/compiler/src/utils.ts), **not** scattered
`if (process.platform === 'win32')` branches at call sites. It's defined once in
the compiler; the engine imports it directly from `@point0/compiler` at each
site (no re-export), so there's a single implementation. The helper itself is
the one place that branches on the OS: off Windows it's the identity function
(only Windows uses `\` as a separator, so there's nothing to convert — and a `\`
is a legal filename char on macOS/Linux). Node's `fs`, `Bun.file` and
`node:path` all accept `/` on Windows, so a normalized path stays usable
everywhere.

**When you add code that handles paths:** posix-normalize the moment a native
path enters logic that compares, keys, globs, or embeds it. The established
boundaries (grep `toPosixPath` for the current set):

- **compiler** — `CompilerFile.create` (the `walker.files` cache key and
  everything derived from it), `FileResolver` (resolution results + the tsconfig
  walk, which otherwise spins forever on Windows), `importer` (globs +
  diagnostic/virtual-module display paths), `sourcemap` key, `file.ts` babel-map
  `sources` pinning. Emitted asset code uses `fileURLToPath`, never
  `URL.pathname` (which is `/C:/…` on Windows) — see
  [assets.ts](../../packages/compiler/src/assets.ts).
- **engine** — `parseGlobs` + `FilesGenerator` (fast-glob patterns and the file
  set), [watcher.ts](../../packages/engine/src/watcher.ts) (minimatch),
  `server-hot-store` (`norm`/`appSrcDir`, so a hot edit isn't misclassified as a
  full restart), `preload-manifest` (public paths), `publicdir` (URL route
  paths), `sourcemap-chain`, the `config.ts`/`server.ts` cwd-relocation
  suffixes, and the generated module-path / single-quoted-literal escaping in
  `client.ts` / `generator.ts` (a `\` in a generated JS string would be read as
  a string escape).

**Where NOT to normalize — config/fs-path resolution stays native.** `toAbsPath`
and the config path resolver ([config.ts](../../packages/engine/src/config.ts))
return native absolute filesystem paths on purpose: resolution has many
`nodePath.resolve` branches (plus verbatim user-absolute input), so posix-ifying
just one of them would make a single field's separator inconsistent. Normalize
at the _identity-use_ site instead (embedding a path in generated code, keying a
cache, feeding a glob — the boundaries above), not in the resolver. This is why
the config test uses a `p()` helper to push expected posix fixtures back to the
platform's native form, rather than the config emitting posix.

**When a test hard-codes a native path,** normalize the expected value the same
way: import `toPosixPath` from `@point0/compiler` (the compiler's own unit tests
use `../src/utils.js`) — don't reimplement `replaceAll('\\', '/')` inline.

## Legitimately OS-specific code (not path identity)

Two modules branch on the platform on purpose — they are correct per-OS
implementations, not workarounds:

- [port.ts](../../packages/engine/src/port.ts) — listing/killing port holders:
  `netstat` / `taskkill` / `Get-CimInstance` on Windows vs `lsof` / `kill` on
  posix.
- [env-os.ts](../../packages/engine/src/env-os.ts) — reading the genuine native
  environment block: `GetEnvironmentStringsW` (kernel32) vs `/proc/self/environ`
  vs `_NSGetEnviron`.

## Spawning child processes

- **Spawn `process.execPath`, not a bare `'bun'`.** On Windows the bun dir is
  added to `PATH` by the shell profile, not the OS environment block, so a
  spawned child may not inherit it and `bun` fails with ENOENT.
  `process.execPath` is the running bun — same binary on posix. (See
  `server.ts`, `client.ts`, and the test helpers in `tests/utils/process.ts`.)
- **The bun dev server's cwd must be the app root.** Bun's HTMLBundle dev server
  only watches files under its cwd for HMR (oven-sh/bun#19479). Running it in
  the generated temp dir left every app source unwatched, so edits never
  rebundled — the bug long mis-blamed on "Bun HMR doesn't work on Windows".
  [client.ts](../../packages/engine/src/client.ts) pins `cwd` to the app root
  and passes `--config=<tempDir/bunfig.toml>` (the `=` form is required — a
  space makes bun's `run` parser swallow the script path and exit 0 silently).

## Tests on Windows

- **Browser tests use CDP, not `launch()`.** Bun can't `chromium.launch()` on
  Windows (the pipe transport hangs / `uv_spawn` fails). Instead we spawn
  `chrome-headless-shell` with an auto-assigned debug port and `connectOverCDP`
  — see
  [tests/utils/playwright.ts](../../packages/engine/tests/utils/playwright.ts)
  and the `create-app` E2E. This needs the `playwright-core` patch (below). It's
  test-only infra; nothing ships to users.
- **Retry directory removal after killing processes.** Windows releases a
  terminated process's file handles asynchronously, so an `fs.rm` right after a
  kill can hit EBUSY/EPERM. Use
  `rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })`
  (the test project factories do this).
- **Timeouts are flat and generous, no platform branch.** Windows spawns/builds
  are slower, so the slow engine test files set a roomy `setDefaultTimeout`
  (60–80s) and a couple of `waitOutput` calls pass an explicit timeout. Don't
  reintroduce a `win32 ? … : …` conditional or a multiplier helper — a generous
  flat value is enough and reads cleaner.
- **Run pointwise, reap between runs.** Never run the whole suite (`bun test`) —
  run one file at a time (`bun test path/file.test.ts -t "name"`;
  `FOCUS_BUN=1`/`FOCUS_VITE=1` halve the bundler matrix). Between browser runs,
  reap leftovers:
  `taskkill //F //IM bun.exe ; taskkill //F //IM chrome-headless-shell.exe`.
  **Never** `taskkill //IM chrome.exe` — that's the user's real browser.

## Environment setup (one-time)

- **Node for builds.** The framework runs on Bun, but the `tsdown` build step
  runs on Node — use a current Node (the repo's CI builds on **Node 24 LTS**;
  e.g. `nvm install 24 && nvm use 24`). Also keep `.bun/bin` on `PATH` so
  spawned `bun`/`bunx`/`taskkill`/`chrome-headless-shell` resolve in children.
- **playwright-core patch.** `bun install` applies
  `patches/playwright-core@*.patch` (via `package.json` `patchedDependencies`);
  it swaps Bun's working `ws` shim into Playwright's CDP transport, which
  otherwise mishandles the upgrade under Bun. Required for the browser tests.
- **chrome-headless-shell.** `bunx playwright install chromium` installs both
  chromium and chrome-headless-shell (the browser tests spawn the latter).

## Known limitation

Headed Chromium under Bun on Windows is unavailable:
`chromium.launch({ headless: false })` fails `uv_spawn EUNKNOWN` and headed
`chrome.exe` hits a side-by-side ("SxS") configuration error; even headless
`launch()` hangs. The CDP + chrome-headless-shell path is the workaround, and it
works regardless. The headed/SxS failure may be partly box-specific — worth
re-checking on a clean Windows box.

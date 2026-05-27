/**
 * Standard `vite.config.ts` so that tools that expect one — vitest, the Vite IDE integration,
 * vite-aware plugins like `@vitest/coverage`, etc. — recognize this project as "a normal vite
 * project".
 *
 * The REAL vite config lives in `src/engine.ts` (the `viteConfig: ({ plugins }) => ...`
 * callback). This file is just a thin view of it for external tooling:
 *
 *  - `engine.dev()` / `engine.build()` read `viteConfig` from `src/engine.ts` directly and
 *    never load this file.
 *  - vitest (and friends) load this file, call `engine.getViteConfig(env)`, and get back the
 *    exact same complete vite config the engine itself would use for that `side`/`command` —
 *    plugins (compiler + user's react/svgr/tailwind/...), root, define, server middleware,
 *    build.rolldownOptions, the lot.
 *
 * Use `mergeConfig` if you need to layer extra overrides only for the external-tooling path
 * (e.g. vitest-only plugins, test-only defines). `mergeConfig` concatenates `plugins` and
 * deep-merges objects, so the engine's plugins stay in place — see the example below.
 *
 * So: edit `src/engine.ts` for vite config changes that should also apply at runtime. Use
 * `mergeConfig` here for overrides that should only affect external tools.
 */
import { defineConfig, mergeConfig } from 'vite'
import { engine } from './src/engine.js'

export default defineConfig(async (env) => {
  const base = await engine.getViteConfig(env)
  return mergeConfig(base, {
    // Example: an override only the external-tooling path sees. Delete or replace as needed.
    // define: { __VITEST_ONLY__: JSON.stringify(true) },
  })
})

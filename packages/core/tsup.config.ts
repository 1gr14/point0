import { defineConfig, type Options } from 'tsup'
import { fixImportsPlugin } from 'esbuild-fix-imports-plugin'

const general = {
  entry: [
    'src/cookies-store.ts',
    'src/env.ts',
    'src/env.types.ts',
    'src/env.utils.ts',
    'src/index.ts',
    'src/internals.ts',
    'src/points-manager.ts',
    'src/query-client.tsx',
    'src/request0.ts',
    'src/response0.ts',
    'src/router.tsx',
    'src/super-store.ts',
    'src/types.ts',
    'src/unhead.ts',
    'src/utils.ts',
  ],
  clean: false,
  dts: true,
  sourcemap: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  external: ['bun:test'],
  treeshake: true,
  bundle: false,
  esbuildPlugins: [fixImportsPlugin()],
  platform: 'node',
  tsconfig: './tsconfig.json',
} satisfies Options

export default defineConfig({
  ...general,
  format: 'esm',
  outDir: 'dist',
  esbuildOptions(options) {
    // Ensure source content is included in source maps so Bun can show original TS files
    options.sourcesContent = true
  },
})

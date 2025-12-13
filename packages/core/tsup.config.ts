import { defineConfig, type Options } from 'tsup'
import { fixImportsPlugin } from 'esbuild-fix-imports-plugin'

// TODO: set best options
const general = {
  entry: ['src/index.ts'],
  clean: false,
  dts: true,
  sourcemap: true,
  splitting: false,
  minify: true,
  target: 'es2022',
  external: ['bun:test'],
  treeshake: true,
  bundle: true,
  esbuildPlugins: [fixImportsPlugin()],
  platform: 'node',
  tsconfig: './tsconfig.json',
} satisfies Options

export default defineConfig({
  ...general,
  format: 'esm',
  outDir: 'dist',
})

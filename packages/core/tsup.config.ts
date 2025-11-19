import { defineConfig, type Options } from 'tsup'
import { fixImportsPlugin } from 'esbuild-fix-imports-plugin'

const general = {
  entry: [
    'src/index.tsx',
    'src/mount.ts',
    'src/points.ts',
    'src/router.tsx',
    'src/super-store.ts',
    'src/types.ts',
    'src/unhead.ts',
    'src/utils.ts',
    'src/client-server.ts',
    'src/eversion.ts',
  ],
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  external: ['bun:test'],
  treeshake: false,
  bundle: false,
  esbuildPlugins: [fixImportsPlugin()],
  platform: 'node',
  tsconfig: './tsconfig.json',
} satisfies Options

export default defineConfig({
  ...general,
  format: 'esm',
  outDir: 'dist',
})

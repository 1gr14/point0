import { fixImportsPlugin } from 'esbuild-fix-imports-plugin'
import { defineConfig, type Options } from 'tsup'

const general = {
  entry: [
    'src/plugin/bun-static.ts',
    'src/plugin/bun.ts',
    'src/plugin/babel.ts',
    'src/plugin/vite.ts',
    'src/compiler.ts',
    'src/error.ts',
    'src/file.ts',
    'src/importer.ts',
    'src/index.ts',
    'src/point.ts',
    'src/resolver.ts',
    'src/utils.ts',
    'src/walker.ts',
  ],
  clean: false,
  dts: true,
  sourcemap: false,
  splitting: false,
  minify: false,
  target: 'es2022',
  external: ['bun:test'],
  treeshake: false,
  bundle: false,
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  esbuildPlugins: [fixImportsPlugin()],
  platform: 'node',
  tsconfig: './tsconfig.build.json',
} satisfies Options

export default defineConfig([
  {
    ...general,
    format: 'esm',
    outDir: 'dist/esm',
  },
  {
    ...general,
    format: 'cjs',
    outDir: 'dist/cjs',
  },
])

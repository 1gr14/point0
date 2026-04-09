import { fixImportsPlugin } from 'esbuild-fix-imports-plugin'
import { defineConfig, type Options } from 'tsup'

const general = {
  entry: ['src/index.ts', 'src/scalar.ts', 'src/swagger.ts', 'src/utils.ts', 'src/middleware.ts', 'src/serialize.ts'],
  clean: false,
  dts: true,
  sourcemap: false,
  splitting: false,
  minify: false,
  target: 'es2022',
  external: ['bun:test', '@point0/core', '@point0/engine'],
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

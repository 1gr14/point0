import { defineConfig, type Options } from 'tsup'

const general = {
  entry: [
    'src/index.ts',
    'src/bin.ts',
    'src/client.ts',
    'src/config.ts',
    'src/error.ts',
    'src/fetch.ts',
    'src/generator.ts',
    'src/publicdir.ts',
    'src/render.ts',
    'src/server.ts',
    'src/utils.ts',
    'src/walker.ts',
  ],
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  external: ['bun:test', '@point0/core', '@point0/core/*'],
  treeshake: false,
  bundle: false,
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  platform: 'node',
  tsconfig: './tsconfig.json',
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

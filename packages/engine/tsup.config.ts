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
    'src/pruner.ts',
    'src/pruner-bun-static.ts',
    'src/pruner-bun.ts',
    'src/pruner-vite.ts',
    'src/publicdir.ts',
    'src/render.ts',
    'src/server.ts',
    'src/utils.ts',
    'src/walker.ts',
    'src/client-server.ts',
    'src/server-extractor.ts',
    'src/all-points-managers.ts',
  ],
  clean: false,
  dts: true,
  sourcemap: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  external: ['bun:test', '@point0/core'],
  treeshake: false,
  bundle: false,
  platform: 'node',
  tsconfig: './tsconfig.json',
} satisfies Options

export default defineConfig({
  ...general,
  format: 'esm',
  outDir: 'dist',
})

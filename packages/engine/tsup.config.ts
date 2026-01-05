import { defineConfig, type Options } from 'tsup'

const general = {
  entry: [
    'src/index.ts',
    'src/cli.ts',
    'src/client.ts',
    'src/config.ts',
    'src/error.ts',
    'src/fetcher.ts',
    'src/compiler/collector.ts',
    'src/compiler/file.ts',
    'src/compiler/generator.ts',
    'src/compiler/plugin-bun-static.ts',
    'src/compiler/plugin-bun.ts',
    'src/compiler/plugin-vite.ts',
    'src/compiler/point.ts',
    'src/compiler/resolver.ts',
    'src/publicdir.ts',
    'src/render.ts',
    'src/server.ts',
    'src/utils.ts',
    'src/executor.ts',
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

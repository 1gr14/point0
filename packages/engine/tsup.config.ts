import { defineConfig, type Options } from 'tsup'

const general = {
  entry: [
    'src/index.ts',
    'src/engine.ts',
    'src/cli.ts',
    'src/client.ts',
    'src/config.ts',
    'src/error.ts',
    'src/fetcher.ts',
    'src/generator.ts',
    'src/publicdir.ts',
    'src/render.ts',
    'src/server.ts',
    'src/utils.ts',
    'src/executor.ts',
    'src/all-points-managers.ts',
    'src/kill-port.ts',
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
  tsconfig: './tsconfig.build.json',
} satisfies Options

export default defineConfig({
  ...general,
  format: 'esm',
  outDir: 'dist',
})

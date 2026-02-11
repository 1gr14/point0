import { defineConfig, type Options } from 'tsup'

const general = {
  entry: [
    'src/cli.ts',
    'src/client.ts',
    'src/config.ts',
    'src/engine.ts',
    'src/error.ts',
    'src/executor.ts',
    'src/fake-client.ts',
    'src/fetcher.ts',
    'src/generator.ts',
    'src/index.ts',
    'src/kill-port.ts',
    'src/meta.ts',
    'src/publicdir.ts',
    'src/render.ts',
    'src/server-points.ts',
    'src/server.ts',
    'src/utils.ts',
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

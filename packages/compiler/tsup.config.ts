import { defineConfig, type Options } from 'tsup'

const general = {
  entry: [
    'src/index.ts',
    'src/compiler.ts',
    'src/walker.ts',
    'src/file.ts',
    'src/plugin/bun-static.ts',
    'src/plugin/bun.ts',
    'src/plugin/vite.ts',
    'src/point.ts',
    'src/resolver.ts',
    'src/utils.ts',
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
  platform: 'node',
  tsconfig: './tsconfig.build.json',
} satisfies Options

export default defineConfig({
  ...general,
  format: 'esm',
  outDir: 'dist',
})

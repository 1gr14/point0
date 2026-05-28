import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/scalar.ts', 'src/swagger.ts', 'src/utils.ts', 'src/middleware.ts', 'src/serialize.ts'],
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  outDir: 'dist',
  clean: true,
  dts: { resolver: 'tsc' },
  sourcemap: false,
  unbundle: true,
  treeshake: false,
  outExtensions: () => ({ js: '.js' }),
  tsconfig: './tsconfig.build.json',
  deps: {
    skipNodeModulesBundle: true,
    neverBundle: ['bun', /^@types\//],
  },
})

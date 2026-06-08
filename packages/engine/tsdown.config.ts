import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/analyzer.ts',
    'src/cli.ts',
    'src/client.ts',
    'src/client.bun-build-fix.ts',
    'src/config.ts',
    'src/engine.ts',
    'src/executor.ts',
    'src/fake-client.ts',
    'src/fetcher.ts',
    'src/generator.ts',
    'src/index.ts',
    'src/mcp.ts',
    'src/port.ts',
    'src/meta.ts',
    'src/publicdir.ts',
    'src/render.ts',
    'src/server-hot-store.ts',
    'src/server-points.ts',
    'src/server.ts',
    'src/utils.ts',
    'src/watcher.ts',
  ],
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
    // Keep workspace packages as package imports instead of copying another
    // package's dist output into this package during parallel builds.
    neverBundle: ['bun', /^@types\//, /^@point0\//],
  },
})

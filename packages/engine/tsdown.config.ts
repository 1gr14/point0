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
    // `@point0/docs` is an optional runtime dependency, loaded lazily via a
    // try/catch `import('@point0/docs')` in cli.ts. It must never be bundled —
    // otherwise the build tries to load `../docs/dist` and races against the
    // docs package cleaning its own dist during a parallel `bun run build`.
    neverBundle: ['bun', /^@types\//, '@point0/docs'],
  },
})

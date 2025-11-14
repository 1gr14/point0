import { Generator } from 'point0/generator'
import { routes } from './lib/routes'

const generator = Generator.create({
  cwd: import.meta.dir,
  glob: ['./**/*.{ts,tsx}', '!./lib/server.ts'],
  ready: './lib/points.ready.ts',
  lazy: './lib/points.lazy.ts',
  routes,
  // wouterRoutes: './lib/wouter-routes.tsx',
})

await generator.sync()

if (process.env.WATCH) {
  generator.watch()
}

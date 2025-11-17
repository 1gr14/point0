import { Generator } from 'point0/generator'
import { routes } from './lib/routes'

const generator = Generator.create({
  cwd: import.meta.dir,
  glob: ['./**/*.{ts,tsx}', '!./lib/server.ts'],
  ready: './lib/points.ready.ts',
  lazy: './lib/points.lazy.ts',
  routes,
})
await generator.sync()

const generator2 = Generator.create({
  cwd: import.meta.dir,
  glob: ['./lib/server.ts'],
  ready: './lib/points.server.ts',
})
await generator2.sync()

if (process.env.WATCH) {
  generator.watch()
  generator2.watch()
}

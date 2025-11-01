import { FileGenerator } from 'point0/generator'
import { routes } from './lib/routes'

const generator = FileGenerator.create({
  basepath: import.meta.dir,
  glob: ['../../**/*.{ts,tsx}', '!./lib/server.ts'],
  ready: './lib/points.ready.ts',
  lazy: './lib/points.lazy.ts',
  routes,
})

await generator.sync()

if (process.env.WATCH) {
  generator.watch()
}

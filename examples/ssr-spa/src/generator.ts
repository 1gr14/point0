import { FileGenerator } from 'point0/generator'
import { routes } from './lib/routes'

const generator = FileGenerator.create({
  glob: ['../../**/*.{ts,tsx}', '!./lib/server.ts'],
  output: './lib/points.ts',
  basepath: import.meta.dir,
  routes,
})

await generator.sync()

if (process.env.WATCH) {
  generator.watch()
}

import { FileGenerator } from 'point0/generator'

const generator = FileGenerator.create({
  glob: ['../../**/*.{ts,tsx}', '!./lib/server.ts'],
  output: './lib/_points.ts',
  basepath: import.meta.dir,
})

await generator.sync()

if (process.env.WATCH) {
  // generator.watch()
  // FileGenerator.watch({ generators:[generator1, generator2], glob: ['../../**/*.{ts,tsx'] })
}

import { compilerBunPlugin } from './bun.js'

if (!process.env.POINT0_COMPILER_OPTIONS) {
  throw new Error('POINT0_COMPILER_OPTIONS is not set')
}

const parsedOptions = JSON.parse(process.env.POINT0_COMPILER_OPTIONS)

export default compilerBunPlugin(parsedOptions)

import { compilerBunPlugin } from './bun.js'

const POINT0_COMPILER_OPTIONS = process.env.POINT0_COMPILER_OPTIONS
if (!POINT0_COMPILER_OPTIONS) {
  throw new Error('POINT0_COMPILER_OPTIONS is not set')
}
const parsedOptions = JSON.parse(POINT0_COMPILER_OPTIONS)
export default compilerBunPlugin(parsedOptions)

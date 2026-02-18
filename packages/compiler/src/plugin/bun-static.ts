import { compilerBunPlugin } from './bun.js'

const parsedOptions = process.env.POINT0_COMPILER_OPTIONS
  ? JSON.parse(process.env.POINT0_COMPILER_OPTIONS)
  : { side: 'client' }

export default compilerBunPlugin(parsedOptions)

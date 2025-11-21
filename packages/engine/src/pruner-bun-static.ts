import { prunerBunPlugin } from './pruner-bun.js'

if (!process.env.POINT0_PRUNER_OPTIONS) {
  throw new Error('POINT0_PRUNER_OPTIONS is not set')
}

const parsedOptions = JSON.parse(process.env.POINT0_PRUNER_OPTIONS)

export default prunerBunPlugin(parsedOptions)

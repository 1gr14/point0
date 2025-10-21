import { Point0 } from 'point0/core/index.js'
import type { server } from './server.js'

export const client = Point0.extend<typeof server>().id('client')

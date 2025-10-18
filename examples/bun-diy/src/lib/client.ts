import { Point0 } from 'point0/index'
import type { server } from './server.js'

export const client = Point0.client<typeof server>()

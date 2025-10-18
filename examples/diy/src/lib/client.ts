import { Point0 } from '@devp0nt/point0/index'
import type { server } from './server.js'

export const client = new Point0<typeof server>()

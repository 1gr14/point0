import { Point0 } from '@devp0nt/point0/index'
import type { serverPoint0 } from '../../server/point0.js'

export const point0 = new Point0<typeof serverPoint0>()

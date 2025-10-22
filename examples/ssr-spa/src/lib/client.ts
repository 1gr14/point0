import { Point0 } from 'point0/core/index.js'
import type { server } from './server.js'
import App from '../layouts/app.js'

export const client = Point0.extend<typeof server>({ id: 'client' }).wrapper(App)

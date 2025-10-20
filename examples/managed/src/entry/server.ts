import { entry } from 'point0/server/entry.js'
import { points } from './points.js'
import { server } from '../lib/client.js'
import { getAdapter } from 'point0/adapters/bun/server.js'

void entry({ server, points, adapter: getAdapter() })

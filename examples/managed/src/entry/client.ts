import { entry } from 'point0/client/entry.js'
import { points } from './points.js'
import { client } from '../lib/client.js'
import bun from 'point0/adapters/bun/client.js'

void entry({ client, points, adapter: bun() })

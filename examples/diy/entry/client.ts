import { clientSsrEntry } from 'point0/adapters/bun/client-ssr.js'
import { points } from './points.js'
import { client } from '../src/lib/client.js'

void clientSsrEntry({ points, client })

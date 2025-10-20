import { clientSsrEntry } from 'point0/adapters/bun/client-ssr.js'
import { points } from './points.js'
import { client } from '../lib/client.js'

void clientSsrEntry({ client, points })

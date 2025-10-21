import { hydrate } from 'point0/client/hydrate.js'
import { points } from './points.js'
import { client } from '../lib/client.js'

import.meta.hot.accept()
void hydrate({ base: client, points })

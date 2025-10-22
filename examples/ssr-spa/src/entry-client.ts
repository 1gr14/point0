import { hydrate } from 'point0/client/hydrate.js'
import { client } from './lib/client.js'
import { points } from './lib/points.js'

import.meta.hot.accept()
void hydrate({ base: client, points })

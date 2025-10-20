import { entry } from 'point0/client/entry.js'
import { points } from './points.js'
import { client } from '../src/lib/client.js'

import.meta.hot.accept()
void entry({ points, client })

// TODO: createBunClient()

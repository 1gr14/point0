import { hydrate } from 'point0/client/hydrate.js'
import { points } from './points.js'

import.meta.hot.accept()
void hydrate({ points })

// TODO: createBunClient()

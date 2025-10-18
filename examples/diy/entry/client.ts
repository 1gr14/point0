import { hydrate } from '@devp0nt/point0/entry-client.js'
import { points } from './points.js'

import.meta.hot.accept()
void hydrate({ points })

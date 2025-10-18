import { hydrate } from '@devp0nt/point0/entry-client.js'
import pages from '../client/pages/index.js'

import.meta.hot.accept()
void hydrate({ pages })

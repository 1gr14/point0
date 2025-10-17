import { hydrate } from '@devp0nt/page0/client'
import pages from '../client/pages/index.js'

import.meta.hot.accept()
void hydrate({ pages })

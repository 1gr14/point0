import { hydrate } from '@devp0nt/page0/client'
import pages from './pages/index.js'

import.meta.hot.accept()
void hydrate({
  pages,
})

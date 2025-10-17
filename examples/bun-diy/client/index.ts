import { hydrate } from '@devp0nt/page0/client'
import clientPages from './pages/index.js'

import.meta.hot.accept()
void hydrate({
  clientPages,
})

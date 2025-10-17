import { hydrate } from '@devp0nt/page0/client'
import { clientPages } from './pages/index.js'

import.meta.hot.accept((newModule) => {
  if (newModule) {
    // newModule is undefined when SyntaxError happened
    console.log('updated: count is now ', newModule.count)
  }
})

void hydrate({
  pages: clientPages,
})

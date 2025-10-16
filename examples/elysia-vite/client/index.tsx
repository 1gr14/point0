import { hydrate } from '@devp0nt/page0/client'
import { clientPages0 } from './pages.js'
import { createRoot } from 'react-dom/client'

void hydrate({
  pages: clientPages0,
  after: ({ rootEl, reactEl }) => {
    import.meta.hot.accept(() => {
      console.log('[HMR] React page reloaded')
      createRoot(rootEl).render(reactEl)
    })
  },
})

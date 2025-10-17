import React from 'react'
import { hydrate } from '@devp0nt/page0/client'
import { clientPages0 } from './pages/index.js'
import { createRoot, hydrateRoot } from 'react-dom/client'

void hydrate({
  pages: clientPages0,
  // after: ({ payload, clientPage0, location, rootEl }) => {
  //   console.log('HMR', import.meta.hot)
  //   if (import.meta.hot) {
  //     import.meta.hot.accept(() => {
  //       const Component = clientPage0.getComponent() as React.ComponentType<any>
  //       const el = React.createElement(Component, { data: payload.data, location })
  //       if (rootEl.hasChildNodes()) {
  //         hydrateRoot(rootEl, el)
  //       } else {
  //         createRoot(rootEl).render(el)
  //       }
  //     })
  //   }
  // },
})

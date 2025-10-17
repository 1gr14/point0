import React from 'react'
import { hydrate } from '@devp0nt/page0/client'
import { clientPages } from './pages/index.js'
import { createRoot, hydrateRoot } from 'react-dom/client'

void hydrate({
  pages: clientPages,
})

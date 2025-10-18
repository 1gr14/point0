import React from 'react'
import { hydrate } from '@devp0nt/point0/client'
import { pages } from './pages/index.js'
import { createRoot, hydrateRoot } from 'react-dom/client'

void hydrate({
  pages: pages,
})

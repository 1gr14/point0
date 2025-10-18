import React from 'react'
import { hydrate } from 'point0/client'
import { pages } from './pages/index.js'
import { createRoot, hydrateRoot } from 'react-dom/client'

void hydrate({
  pages: pages,
})

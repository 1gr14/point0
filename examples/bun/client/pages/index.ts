import type { ClientPages } from '@devp0nt/page0/client'
import { homeRoute, ideasRoute, ideaRoute } from '../lib/routes.js'

export const clientPages: ClientPages = [
  [homeRoute, async () => (await import('./home.js')).default],
  [ideasRoute, async () => (await import('./ideas.js')).default],
  [ideaRoute, async () => (await import('./idea.js')).default],
]

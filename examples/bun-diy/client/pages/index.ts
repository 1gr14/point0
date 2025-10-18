import type { PagesCollection } from '@devp0nt/point0/index'
import { homeRoute, ideaRoute, ideasRoute } from '../lib/routes.js'

export default [
  [homeRoute, async () => (await import('./home.js')).default],
  [ideasRoute, async () => (await import('./ideas.js')).default],
  [ideaRoute, async () => (await import('./idea.js')).default],
] as PagesCollection

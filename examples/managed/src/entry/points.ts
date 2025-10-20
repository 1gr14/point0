import type { PointsCollection } from 'point0/core/index.js'
import { routes } from '../lib/routes.js'

export const points: PointsCollection = [
  // should be generated automatically
  [routes.home, async () => (await import('../pages/home.js')).default],
  [routes.ideas, async () => (await import('../pages/ideas.js')).default],
  [routes.idea, async () => (await import('../pages/idea.js')).default],
]

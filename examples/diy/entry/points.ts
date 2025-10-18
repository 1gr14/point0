import type { PointsCollection } from '@devp0nt/point0/index'
import { routes } from '../src/lib/routes.js'

export const points: PointsCollection = [
  // can be generated automatically
  [routes.home, async () => (await import('../src/pages/home.js')).default],
  [routes.ideas, async () => (await import('../src/pages/ideas.js')).default],
  [routes.idea, async () => (await import('../src/pages/idea.js')).default],
]

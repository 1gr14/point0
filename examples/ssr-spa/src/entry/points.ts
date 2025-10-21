import type { PointsCollection } from 'point0/core/index.js'
import { routes } from '../lib/routes.js'

export const points: PointsCollection = [
  // should be generated automatically
  // and here we can import them as is without lazy loading,
  // but in pages for spa application we will import it with lazy loading
  { method: 'get', route: routes.home, point: async () => (await import('../pages/home.js')).default },
  { method: 'get', route: routes.ideas, point: async () => (await import('../pages/ideas.js')).default },
  { method: 'get', route: routes.idea, point: async () => (await import('../pages/idea.js')).default },
  { method: 'get', route: routes.ideaNews, point: async () => (await import('../pages/ideas.js')).default },
]

import type { PointsCollection } from 'point0/eversion/runtime.js'
import { routes } from './routes.js'

export const points: PointsCollection = [
  // should be generated automatically
  // and here we can import them as is without lazy loading,
  // but in pages for spa application we will import it with lazy loading
  { method: 'get', route: routes.home, point: (await import('../pages/home.js')).default },
  { method: 'get', route: routes.ideas, point: (await import('../pages/ideas.js')).default },
  { method: 'get', route: routes.idea, point: (await import('../pages/idea.js')).default },
  { method: 'get', route: routes.ideaNews, point: (await import('../pages/ideas.js')).default },
]

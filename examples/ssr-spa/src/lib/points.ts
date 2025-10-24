import type { PointsCollection } from 'point0/eversion/runtime.js'

export const points: PointsCollection = [
  // should be generated automatically
  // and here we can import them as is without lazy loading,
  // but in pages for spa application we will import it with lazy loading
  { type: 'page', route: '/', point: async () => (await import('../pages/home.js')).default },
  { type: 'page', route: '/ideas', point: async () => (await import('../pages/ideas.js')).default },
  {
    type: 'page',
    route: '/ideas/new',
    point: async () => (await import('../pages/new-idea.js')).default,
  },
  {
    type: 'json',
    route: '/endpoints/createIdea',
    point: async () => (await import('../pages/new-idea.js')).createIdeaMutation,
  },
  { type: 'page', route: '/ideas/:id', point: async () => (await import('../pages/idea.js')).default },
  {
    type: 'page',
    route: '/ideas/:id/news',
    point: async () => (await import('../pages/ideas.js')).default,
  },
]

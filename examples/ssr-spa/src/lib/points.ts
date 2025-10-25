import type { PointsCollection } from 'point0/eversion/runtime.js'

export const points: PointsCollection = [
  // should be generated automatically
  // and here we can import them as is without lazy loading,
  // but in pages for spa application we will import it with lazy loading
  {
    type: 'page',
    route: '/',
    point: async () => (await import('../pages/home.js')).default,
    layouts: [async () => (await import('../layouts/general.js')).generalLayout],
  },
  {
    type: 'page',
    route: '/ideas',
    point: async () => (await import('../pages/ideas.js')).default,
    layouts: [async () => (await import('../layouts/general.js')).generalLayout],
  },
  {
    type: 'page',
    route: '/ideas/new',
    point: async () => (await import('../pages/idea-create.js')).default,
    layouts: [async () => (await import('../layouts/general.js')).generalLayout],
  },
  {
    type: 'mutation',
    route: '/endpoints/createIdea',
    point: async () => (await import('../pages/idea-create.js')).createIdeaMutation,
  },
  {
    type: 'response',
    route: '/endpoints/generateIdea',
    point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation,
  },
  {
    type: 'page',
    route: '/ideas/:id',
    point: async () => (await import('../pages/idea.js')).default,
    layouts: [
      async () => (await import('../layouts/general.js')).generalLayout,
      async () => (await import('../layouts/idea.js')).ideaLayout,
    ],
  },
  {
    type: 'page',
    route: '/ideas/:id/news',
    point: async () => (await import('../pages/idea-news.js')).default,
    layouts: [
      async () => (await import('../layouts/general.js')).generalLayout,
      async () => (await import('../layouts/idea.js')).ideaLayout,
    ],
  },
]

import type { PointsCollection } from 'point0/core/eversion.js'

// TODO: clientRoute and serverRoute

export const points: PointsCollection = [
  // should be generated automatically
  // and here we can import them as is without lazy loading,
  // but in pages for spa application we will import it with lazy loading
  {
    type: 'page',
    route: '/',
    point: async () => (await import('../pages/home.js')).default,
  },
  {
    type: 'page',
    route: '/ideas',
    point: async () => (await import('../pages/ideas.js')).default,
  },
  {
    type: 'page',
    route: '/ideas/new',
    point: async () => (await import('../pages/idea-create.js')).default,
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
    type: 'component',
    route: '/ideas/best',
    point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
  },
  {
    type: 'page',
    route: '/ideas/:id',
    point: async () => (await import('../pages/idea.js')).default,
  },
  {
    type: 'page',
    route: '/ideas/:id/news',
    point: async () => (await import('../pages/idea-news.js')).default,
  },
  {
    type: 'layout',
    route: '/',
    point: async () => (await import('../layouts/general.js')).generalLayout,
    layoutPagesRoutes: ['/', '/ideas', '/ideas/new', '/ideas/:id', '/ideas/:id/news'],
  },
  {
    type: 'layout',
    route: '/ideas/:id',
    point: async () => (await import('../layouts/idea.js')).ideaLayout,
    layoutPagesRoutes: ['/ideas/:id', '/ideas/:id/news'],
  },
  {
    type: 'client-ctx',
    route: '/endpoints/test-client-ctx-1',
    point: async () => (await import('../lib/client-ctx.js')).clientCtx1,
  },
  {
    type: 'client-ctx',
    route: '/endpoints/test-client-ctx-2',
    point: async () => (await import('../lib/client-ctx.js')).clientCtx2,
  },
  {
    type: 'client-ctx',
    route: '/endpoints/test-client-ctx-3',
    point: async () => (await import('../lib/client-ctx.js')).clientCtx3,
  },
]

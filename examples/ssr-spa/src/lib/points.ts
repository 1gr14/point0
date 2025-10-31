import type { PointsCollection } from 'point0/core/points.js'

// TODO: clientRoute and serverRoute

export const points = [
  // should be generated automatically
  // and here we can import them as is without lazy loading,
  // but in pages for spa application we will import it with lazy loading
  {
    type: 'page',
    name: 'home',
    route: '/',
    point: async () => (await import('../pages/home.js')).default,
  },
  {
    type: 'page',
    name: 'empty',
    route: '/empty',
    point: async () => (await import('../pages/empty.js')).empty,
  },
  {
    type: 'page',
    name: 'ideas',
    route: '/ideas',
    point: async () => (await import('../pages/ideas.js')).default,
  },
  {
    type: 'page',
    name: 'newIdea',
    route: '/ideas/new',
    point: async () => (await import('../pages/idea-create.js')).default,
  },
  {
    type: 'mutation',
    name: 'createIdea',
    point: async () => (await import('../pages/idea-create.js')).createIdeaMutation,
  },
  {
    type: 'response',
    name: 'generateIdea',
    point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation,
  },
  {
    type: 'component',
    name: 'bestIdea',
    point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
  },
  {
    type: 'page',
    name: 'idea',
    route: '/ideas/:id',
    point: async () => (await import('../pages/idea.js')).default,
  },
  {
    type: 'page',
    name: 'ideaNews',
    route: '/ideas/:id/news',
    point: async () => (await import('../pages/idea-news.js')).default,
  },
  {
    type: 'layout',
    name: 'generalLayout',
    route: '/',
    point: async () => (await import('../layouts/general.js')).generalLayout,
    layoutPagesRoutes: ['/', '/ideas', '/ideas/new', '/ideas/:id', '/ideas/:id/news'],
  },
  {
    type: 'layout',
    name: 'ideaLayout',
    route: '/ideas/:id',
    point: async () => (await import('../layouts/idea.js')).ideaLayout,
    layoutPagesRoutes: ['/ideas/:id', '/ideas/:id/news'],
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx1',
    point: async () => (await import('../lib/client-ctx.js')).clientCtx1,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx2',
    point: async () => (await import('../lib/client-ctx.js')).clientCtx2,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx3',
    point: async () => (await import('../lib/client-ctx.js')).clientCtx3,
  },
] as PointsCollection

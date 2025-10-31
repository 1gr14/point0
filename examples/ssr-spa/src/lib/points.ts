import type { PointsCollection } from 'point0/core/eversion.js'

// TODO: clientRoute and serverRoute

export const points = [
  // should be generated automatically
  // and here we can import them as is without lazy loading,
  // but in pages for spa application we will import it with lazy loading
  {
    type: 'page',
    id: 'homePage',
    route: '/',
    point: async () => (await import('../pages/home.js')).default,
  },
  {
    type: 'page',
    id: 'emptyPage',
    route: '/empty',
    point: async () => (await import('../pages/empty.js')).empty,
  },
  {
    type: 'page',
    id: 'ideasPage',
    route: '/ideas',
    point: async () => (await import('../pages/ideas.js')).default,
  },
  {
    type: 'page',
    id: 'newIdeaPage',
    route: '/ideas/new',
    point: async () => (await import('../pages/idea-create.js')).default,
  },
  {
    type: 'mutation',
    id: 'createIdea',
    point: async () => (await import('../pages/idea-create.js')).createIdeaMutation,
  },
  {
    type: 'response',
    id: 'generateIdea',
    point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation,
  },
  {
    type: 'component',
    id: 'bestIdeaComponent',
    point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
  },
  {
    type: 'page',
    id: 'ideaPage',
    route: '/ideas/:id',
    point: async () => (await import('../pages/idea.js')).default,
  },
  {
    type: 'page',
    id: 'ideaNewsPage',
    route: '/ideas/:id/news',
    point: async () => (await import('../pages/idea-news.js')).default,
  },
  {
    type: 'layout',
    id: 'generalLayout',
    route: '/',
    point: async () => (await import('../layouts/general.js')).generalLayout,
    layoutPagesRoutes: ['/', '/ideas', '/ideas/new', '/ideas/:id', '/ideas/:id/news'],
  },
  {
    type: 'layout',
    id: 'ideaLayout',
    route: '/ideas/:id',
    point: async () => (await import('../layouts/idea.js')).ideaLayout,
    layoutPagesRoutes: ['/ideas/:id', '/ideas/:id/news'],
  },
  {
    type: 'client-ctx',
    id: 'testClientCtx1',
    point: async () => (await import('../lib/client-ctx.js')).clientCtx1,
  },
  {
    type: 'client-ctx',
    id: 'testClientCtx2',
    point: async () => (await import('../lib/client-ctx.js')).clientCtx2,
  },
  {
    type: 'client-ctx',
    id: 'testClientCtx3',
    point: async () => (await import('../lib/client-ctx.js')).clientCtx3,
  },
] as PointsCollection

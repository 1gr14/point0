import type { PointsCollection } from 'point0/core/points.js'

export const points = [
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
    type: 'page',
    name: 'newIdea',
    route: '/ideas/new',
    point: async () => (await import('../pages/idea-create.js')).default,
  },
  {
    type: 'page',
    name: 'ideas',
    route: '/ideas',
    point: async () => (await import('../pages/ideas.js')).ideasPage,
  },
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
    name: 'ideaNews',
    route: '/ideas/:id/news',
    point: async () => (await import('../pages/idea-news.js')).ideasNewsPage,
  },
  {
    type: 'page',
    name: 'idea',
    route: '/ideas/:id',
    point: async () => (await import('../pages/idea.js')).ideaPage,
  },
  {
    type: 'base',
    name: 'client',
    point: async () => (await import('./client.js')).client,
  },
  {
    type: 'layout',
    name: 'ideaLayout',
    route: '/ideas/:id',
    layoutPagesRoutes: ['/ideas/:id', '/ideas/:id/news'],
    point: async () => (await import('../layouts/idea.js')).ideaLayout,
  },
  {
    type: 'layout',
    name: 'generalLayout',
    route: '/',
    layoutPagesRoutes: ['/ideas/new', '/', '/ideas'],
    point: async () => (await import('../layouts/general.js')).generalLayout,
  },
] as PointsCollection

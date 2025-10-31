import type { PointsCollection } from 'point0/core/points.js'
import { Routes } from '@devp0nt/route0'

export const routes = Routes.create({
  home: '/',
  empty: '/empty',
  ideas: '/ideas',
  newIdea: '/ideas/new',
  idea: '/ideas/:id',
  ideaNews: '/ideas/:id/news',
})

export const points = [
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
    point: async () => (await import('../pages/ideas.js')).ideasPage,
  },
  {
    type: 'page',
    name: 'newIdea',
    route: '/ideas/new',
    point: async () => (await import('../pages/idea-create.js')).default,
  },
  {
    type: 'page',
    name: 'idea',
    route: '/ideas/:id',
    point: async () => (await import('../pages/idea.js')).ideaPage,
  },
  {
    type: 'page',
    name: 'ideaNews',
    route: '/ideas/:id/news',
    point: async () => (await import('../pages/idea-news.js')).ideasNewsPage,
  },
  {
    type: 'layout',
    name: 'generalLayout',
    layoutPagesRoutes: ['/', '/ideas/new', '/ideas'],
    point: async () => (await import('../layouts/general.js')).generalLayout,
  },
  {
    type: 'layout',
    name: 'ideaLayout',
    route: '/ideas/:id',
    layoutPagesRoutes: ['/ideas/:id', '/ideas/:id/news'],
    point: async () => (await import('../layouts/idea.js')).ideaLayout,
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
    type: 'client-ctx',
    name: 'testClientCtx1',
    point: async () => (await import('./client-ctx.js')).clientCtx1,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx2',
    point: async () => (await import('./client-ctx.js')).clientCtx2,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx3',
    point: async () => (await import('./client-ctx.js')).clientCtx3,
  },
  {
    type: 'base',
    name: 'client',
    point: async () => (await import('./client.js')).client,
  },
] as PointsCollection

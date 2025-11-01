import { Points } from 'point0/core/points.js'
import { Routes } from '@devp0nt/route0'

export const routes = Routes.create({
  empty: '/empty/:id',
  ideas: '/ideas',
  newIdea: '/ideas/new',
  idea: '/ideas/:id',
  ideaNews: '/ideas/:id/news',
})

export const points = Points.create([
  {
    type: 'page',
    name: 'home',
    point: async () => (await import('../pages/home.js')).default.point,
  },
  {
    type: 'page',
    name: 'empty',
    route: '/empty/:id',
    point: async () => (await import('../pages/empty.js')).empty.point,
  },
  {
    type: 'page',
    name: 'ideas',
    route: '/ideas',
    point: async () => (await import('../pages/ideas.js')).ideasPage.point,
  },
  {
    type: 'page',
    name: 'newIdea',
    route: '/ideas/new',
    point: async () => (await import('../pages/idea-create.js')).default.point,
  },
  {
    type: 'page',
    name: 'idea',
    route: '/ideas/:id',
    point: async () => (await import('../pages/idea.js')).ideaPage.point,
  },
  {
    type: 'page',
    name: 'ideaNews',
    route: '/ideas/:id/news',
    point: async () => (await import('../pages/idea-news.js')).ideasNewsPage.point,
  },
  {
    type: 'layout',
    name: 'generalLayout',
    route: '/',
    point: async () => (await import('../layouts/general.js')).generalLayout.point,
  },
  {
    type: 'layout',
    name: 'ideaLayout',
    route: '/ideas/:id',
    point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
  },
  {
    type: 'component',
    name: 'bestIdea',
    point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
  },
  {
    type: 'mutation',
    name: 'createIdea',
    point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
  },
  {
    type: 'response',
    name: 'generateIdea',
    point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx1',
    point: async () => (await import('./client-ctx.js')).clientCtx1.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx2',
    point: async () => (await import('./client-ctx.js')).clientCtx2.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx3',
    point: async () => (await import('./client-ctx.js')).clientCtx3.point,
  },
])

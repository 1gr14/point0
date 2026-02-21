import type { PointsDefinition } from '@point0/core'
import { client as root_0 } from './client.js'
export default [
  root_0,
  {
    type: 'page',
    name: 'home',
    route: '/',
    polh: true,
    layouts: ['generalLayout'],
    point: async () => (await import('../pages/home.js')).default,
  },
  {
    type: 'page',
    name: 'empty',
    route: '/empty',
    polh: true,
    point: async () => (await import('../pages/empty.js')).empty,
  },
  {
    type: 'page',
    name: 'ideas',
    route: '/ideas',
    polh: true,
    layouts: ['generalLayout'],
    point: async () => (await import('../pages/ideas.js')).ideasPage,
  },
  {
    type: 'page',
    name: 'newIdea',
    route: '/ideas/new',
    polh: true,
    layouts: ['generalLayout'],
    point: async () => (await import('../pages/idea-create.js')).default,
  },
  {
    type: 'page',
    name: 'idea',
    route: '/ideas/:id',
    polh: true,
    layouts: ['generalLayout', 'ideaLayout'],
    point: async () => (await import('../pages/idea.js')).ideaPage,
  },
  {
    type: 'page',
    name: 'ideaNews',
    route: '/ideas/:id/news',
    polh: true,
    layouts: ['generalLayout', 'ideaLayout'],
    point: async () => (await import('../pages/idea-news.js')).ideasNewsPage,
  },
  {
    type: 'layout',
    name: 'generalLayout',
    route: '/',
    point: async () => (await import('../layouts/general.js')).generalLayout,
  },
  {
    type: 'layout',
    name: 'ideaLayout',
    route: '/ideas/:id',
    point: async () => (await import('../layouts/idea.js')).ideaLayout,
  },
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>

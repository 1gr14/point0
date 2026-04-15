import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from '../../lib/root.js'
export default [
  root_0,
  {
    type: 'page',
    name: 'home',
    route: '/',
    polh: true,
    layouts: ['generalLayout'],
    point: async () => (await import('../../pages/home.js')).default,
  },
  {
    type: 'page',
    name: 'about',
    route: '/about',
    polh: true,
    layouts: ['generalLayout'],
    point: async () => (await import('../../pages/about.mdx')).page,
  },
  {
    type: 'layout',
    name: 'generalLayout',
    route: '/',
    point: async () => (await import('../../layouts/general.js')).generalLayout,
  },
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>

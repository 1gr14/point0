import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from './root.js'
export default [
  root_0,
  {
    type: 'page',
    name: 'home',
    route: '/',
    polh: true,
    point: async () => (await import('../pages/home.js')).default,
  },
  {
    type: 'page',
    name: 'ideas',
    route: '/ideas',
    polh: true,
    point: async () => (await import('../pages/ideas.js')).default,
  },
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>

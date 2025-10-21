import type { PagesCollection } from 'point0/eversion/index.js'
import { routes } from '../lib/routes.js'

export const pages: PagesCollection = [
  // should be generated automatically
  // and here we can import them as is without lazy loading,
  // but in pages for spa application we will import it with lazy loading
  {
    route: routes.home,
    lazy: async () => (await import('../pages/home.js')).default.getAnyPageComponentOrThrow(),
  },
  {
    route: routes.ideas,
    lazy: async () => (await import('../pages/ideas.js')).default.getAnyPageComponentOrThrow(),
  },
  {
    route: routes.idea,
    lazy: async () => (await import('../pages/idea.js')).default.getAnyPageComponentOrThrow(),
  },
  {
    route: routes.ideaNews,
    lazy: async () => (await import('../pages/ideas.js')).default.getAnyPageComponentOrThrow(),
  },
]

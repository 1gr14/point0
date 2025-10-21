import type { PagesCollection } from 'point0/eversion/runtime.js'
import { routes } from '../lib/routes.js'

export const pages: PagesCollection = [
  // should be generated automatically
  // and here we can import them as is without lazy loading,
  // but in pages for spa application we will import it with lazy loading
  {
    route: routes.home,
    lazy: async () => (await import('./home.js')).default.getAnyPageComponentOrThrow(),
  },
  {
    route: routes.ideas,
    lazy: async () => (await import('./ideas.js')).default.getAnyPageComponentOrThrow(),
  },
  {
    route: routes.idea,
    lazy: async () => (await import('./idea.js')).default.getAnyPageComponentOrThrow(),
  },
  {
    route: routes.ideaNews,
    lazy: async () => (await import('./ideas.js')).default.getAnyPageComponentOrThrow(),
  },
]

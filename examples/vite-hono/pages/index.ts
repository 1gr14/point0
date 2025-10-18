import type { PagesCollection } from 'point0/client'
import { homeRoute, ideasRoute, ideaRoute } from '../shared/routes.js'

export const pages: PagesCollection = [
  [homeRoute, async () => await import('./home').then((m) => m.homePage)],
  [ideasRoute, async () => await import('./ideas').then((m) => m.ideasPage)],
  [ideaRoute, async () => await import('./idea').then((m) => m.ideaPage)],
]

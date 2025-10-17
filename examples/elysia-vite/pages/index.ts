import type { ClientPages0 } from '@devp0nt/page0/client'
import { homeRoute, ideasRoute, ideaRoute } from '../shared/routes.js'

export const clientPages0: ClientPages0 = [
  [homeRoute, async () => await import('./home').then((m) => m.homePage)],
  [ideasRoute, async () => await import('./ideas').then((m) => m.ideasPage)],
  [ideaRoute, async () => await import('./idea').then((m) => m.ideaPage)],
]

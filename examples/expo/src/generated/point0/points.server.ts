import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from '../../lib/root.js'
import { ideaScreenComponent as ideaScreenComponent_1 } from '../../app/[id].js'
import { createIdeaMutation as createIdeaMutation_2, ideaQuery as ideaQuery_3, ideasQuery as ideasQuery_4 } from '../../ideas.js'
export default [
  root_0,
  ideaScreenComponent_1,
  createIdeaMutation_2,
  ideaQuery_3,
  ideasQuery_4,
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>

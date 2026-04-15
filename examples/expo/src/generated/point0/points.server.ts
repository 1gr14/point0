import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from '../../lib/root.js'
import { createIdeaMutation as createIdeaMutation_1, ideaQuery as ideaQuery_2, ideasQuery as ideasQuery_3 } from '../../ideas.js'
export default [
  root_0,
  createIdeaMutation_1,
  ideaQuery_2,
  ideasQuery_3,
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>

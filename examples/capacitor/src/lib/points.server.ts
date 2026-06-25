import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from './root.js'
import { default as unnamed_1 } from '../pages/home.js'
import { default as unnamed_2 } from '../pages/ideas.js'
import { createIdeaMutation as createIdeaMutation_3, ideasQuery as ideasQuery_4 } from '../ideas.js'
export default [root_0, unnamed_1, unnamed_2, createIdeaMutation_3, ideasQuery_4] as PointsDefinition<
  (typeof root_0)['Infer']['RequiredCtx'],
  (typeof root_0)['Infer']['Error']
>

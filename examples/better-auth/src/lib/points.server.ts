import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from './root.js'
import { default as unnamed_1 } from '../pages/home.js'
import { default as unnamed_2 } from '../pages/auth.js'
import { default as unnamed_3, createIdeaMutation as createIdeaMutation_6 } from '../pages/ideas.js'
import { default as unnamed_4 } from '../pages/idea.js'
import { default as unnamed_5 } from '../pages/profile.js'
import { getMeQuery as getMeQuery_7 } from './auth/utils.js'
export default [
  root_0,
  unnamed_1,
  unnamed_2,
  unnamed_3,
  unnamed_4,
  unnamed_5,
  createIdeaMutation_6,
  getMeQuery_7,
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>

import type { PointsDefinition } from '@point0/core'
import { client as root_0 } from './client.js'
import { default as unnamed_1, BestIdeaComponent as BestIdeaComponent_9 } from '../pages/home.js'
import { empty as empty_2 } from '../pages/empty.js'
import { ideasPage as ideasPage_3 } from '../pages/ideas.js'
import { default as unnamed_4, createIdeaMutation as createIdeaMutation_10, generateIdeaMutation as generateIdeaMutation_11 } from '../pages/idea-create.js'
import { ideaPage as ideaPage_5 } from '../pages/idea.js'
import { ideasNewsPage as ideasNewsPage_6 } from '../pages/idea-news.js'
import { generalLayout as generalLayout_7 } from '../layouts/general.js'
import { ideaLayout as ideaLayout_8 } from '../layouts/idea.js'
import { clientCtx1 as clientCtx1_12, clientCtx2 as clientCtx2_13, clientCtx3 as clientCtx3_14 } from './client-ctx.js'
export default [
  root_0,
  unnamed_1,
  empty_2,
  ideasPage_3,
  unnamed_4,
  ideaPage_5,
  ideasNewsPage_6,
  generalLayout_7,
  ideaLayout_8,
  BestIdeaComponent_9,
  createIdeaMutation_10,
  generateIdeaMutation_11,
  clientCtx1_12,
  clientCtx2_13,
  clientCtx3_14,
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>

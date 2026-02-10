import type { PointsDefinition } from '@point0/core'
import { client as root_0 } from './client.js'
import { default as unnamed_1 } from '../pages/home.js'
import { empty as empty_2, sharedEmptyPage as sharedEmptyPage_8 } from '../pages/empty.js'
import { filePage as filePage_3 } from '../pages/file.js'
import { ideasPage as ideasPage_4 } from '../pages/ideas.js'
import { default as unnamed_5 } from '../pages/idea-create.js'
import { ideaPage as ideaPage_6 } from '../pages/idea.js'
import { ideaNewsPage as ideaNewsPage_7 } from '../pages/idea-news.js'
import { generalLayout as generalLayout_9 } from '../layouts/general.js'
import { ideaLayout as ideaLayout_10 } from '../layouts/idea.js'
export default [
  root_0,
  unnamed_1,
  empty_2,
  filePage_3,
  ideasPage_4,
  unnamed_5,
  ideaPage_6,
  ideaNewsPage_7,
  sharedEmptyPage_8,
  generalLayout_9,
  ideaLayout_10,
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>

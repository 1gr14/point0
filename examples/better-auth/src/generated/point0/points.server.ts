import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from '../../lib/root.js'
import { default as unnamed_1, ideaBestComponent as ideaBestComponent_11 } from '../../pages/home.js'
import { page as page_2 } from '../../pages/about.mdx'
import { ideaListPage as ideaListPage_3 } from '../../pages/idea-list.js'
import { ideaCreatePage as ideaCreatePage_4, ideaCreateMutation as ideaCreateMutation_12 } from '../../pages/idea-create.js'
import { ideaViewPage as ideaViewPage_5 } from '../../pages/idea-view.js'
import { ideaUpdatePage as ideaUpdatePage_6, ideaUpdateMutation as ideaUpdateMutation_14 } from '../../pages/idea-update.js'
import { ideaNewsPage as ideaNewsPage_7, ideaNewsPostCreateMutation as ideaNewsPostCreateMutation_13 } from '../../pages/idea-news.js'
import { profilePage as profilePage_8 } from '../../pages/profile.js'
import { signInPage as signInPage_9, signUpPage as signUpPage_10 } from '../../pages/auth.js'
import { getMeQuery as getMeQuery_15 } from '../../lib/auth/utils.js'
import { ideaViewQuery as ideaViewQuery_16 } from '../../lib/idea.js'
export default [
  root_0,
  unnamed_1,
  page_2,
  ideaListPage_3,
  ideaCreatePage_4,
  ideaViewPage_5,
  ideaUpdatePage_6,
  ideaNewsPage_7,
  profilePage_8,
  signInPage_9,
  signUpPage_10,
  ideaBestComponent_11,
  ideaCreateMutation_12,
  ideaNewsPostCreateMutation_13,
  ideaUpdateMutation_14,
  getMeQuery_15,
  ideaViewQuery_16,
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>

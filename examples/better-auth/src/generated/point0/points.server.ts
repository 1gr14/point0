import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from '../../lib/root.js'
import { default as unnamed_1, ideaBestComponent as ideaBestComponent_11 } from '../../pages/home.js'
import { page as page_2 } from '../../pages/about.mdx'
import { ideaListPage as ideaListPage_3 } from '../../pages/idea-list.js'
import { profilePage as profilePage_4 } from '../../pages/profile.js'
import { signInPage as signInPage_5, signUpPage as signUpPage_6 } from '../../pages/auth.js'
import { ideaCreatePage as ideaCreatePage_7, ideaCreateMutation as ideaCreateMutation_12 } from '../../pages/idea-create.js'
import { ideaViewPage as ideaViewPage_8 } from '../../pages/idea-view.js'
import { ideaUpdatePage as ideaUpdatePage_9, ideaUpdateMutation as ideaUpdateMutation_14 } from '../../pages/idea-update.js'
import { ideaNewsPage as ideaNewsPage_10, ideaNewsPostCreateMutation as ideaNewsPostCreateMutation_13 } from '../../pages/idea-news.js'
import { getMeQuery as getMeQuery_15 } from '../../lib/auth/api.js'
import { ideaViewQuery as ideaViewQuery_16 } from '../../lib/idea.js'
export default [
  root_0,
  unnamed_1,
  page_2,
  ideaListPage_3,
  profilePage_4,
  signInPage_5,
  signUpPage_6,
  ideaCreatePage_7,
  ideaViewPage_8,
  ideaUpdatePage_9,
  ideaNewsPage_10,
  ideaBestComponent_11,
  ideaCreateMutation_12,
  ideaNewsPostCreateMutation_13,
  ideaUpdateMutation_14,
  getMeQuery_15,
  ideaViewQuery_16,
] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>

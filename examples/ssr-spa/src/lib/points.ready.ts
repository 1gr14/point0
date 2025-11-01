import { Points } from 'point0/core/points.js'
import unnamed0, { BestIdeaComponent as BestIdeaComponent8 } from '../pages/home.js'
import { empty as empty1 } from '../pages/empty.js'
import { ideasPage as ideasPage2 } from '../pages/ideas.js'
import unnamed3, { createIdeaMutation as createIdeaMutation9, generateIdeaMutation as generateIdeaMutation10 } from '../pages/idea-create.js'
import { ideaPage as ideaPage4 } from '../pages/idea.js'
import { ideasNewsPage as ideasNewsPage5 } from '../pages/idea-news.js'
import { generalLayout as generalLayout6 } from '../layouts/general.js'
import { ideaLayout as ideaLayout7 } from '../layouts/idea.js'
import { clientCtx1 as clientCtx111, clientCtx2 as clientCtx212, clientCtx3 as clientCtx313 } from './client-ctx.js'

export const points = Points.ready([
  {
    type: 'page',
    name: 'home',
    route: '/',
    layouts: ['generalLayout'],
    point: unnamed0.point,
  },
  {
    type: 'page',
    name: 'empty',
    route: '/empty',
    point: empty1.point,
  },
  {
    type: 'page',
    name: 'ideas',
    route: '/ideas',
    layouts: ['generalLayout'],
    point: ideasPage2.point,
  },
  {
    type: 'page',
    name: 'newIdea',
    route: '/ideas/new',
    layouts: ['generalLayout'],
    point: unnamed3.point,
  },
  {
    type: 'page',
    name: 'idea',
    route: '/ideas/:id/',
    layouts: ['generalLayout', 'ideaLayout'],
    point: ideaPage4.point,
  },
  {
    type: 'page',
    name: 'ideaNews',
    route: '/ideas/:id/news',
    layouts: ['generalLayout', 'ideaLayout'],
    point: ideasNewsPage5.point,
  },
  {
    type: 'layout',
    name: 'generalLayout',
    route: '/',
    point: generalLayout6.point,
  },
  {
    type: 'layout',
    name: 'ideaLayout',
    route: '/ideas/:id',
    point: ideaLayout7.point,
  },
  {
    type: 'component',
    name: 'bestIdea',
    point: BestIdeaComponent8.point,
  },
  {
    type: 'mutation',
    name: 'createIdea',
    point: createIdeaMutation9.point,
  },
  {
    type: 'response',
    name: 'generateIdea',
    point: generateIdeaMutation10.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx1',
    point: clientCtx111.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx2',
    point: clientCtx212.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx3',
    point: clientCtx313.point,
  },
])

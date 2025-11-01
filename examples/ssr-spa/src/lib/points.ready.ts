import { Points } from 'point0/core/points.js'
import unnamed0, { BestIdeaComponent as BestIdeaComponent7 } from '../pages/home.js'
import { empty as empty1 } from '../pages/empty.js'
import { ideasPage as ideasPage2 } from '../pages/ideas.js'
import unnamed3, { createIdeaMutation as createIdeaMutation8, generateIdeaMutation as generateIdeaMutation9 } from '../pages/idea-create.js'
import { ideasNewsPage as ideasNewsPage4 } from '../pages/idea-news.js'
import { generalLayout as generalLayout5 } from '../layouts/general.js'
import { ideaLayout as ideaLayout6 } from '../layouts/idea.js'
import { clientCtx1 as clientCtx110, clientCtx2 as clientCtx211, clientCtx3 as clientCtx312 } from './client-ctx.js'
import { client as client13 } from './client.js'

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
    name: 'ideaNews',
    route: '/ideas/:id/news',
    layouts: ['generalLayout', 'ideaLayout'],
    point: ideasNewsPage4.point,
  },
  {
    type: 'layout',
    name: 'generalLayout',
    route: '/',
    point: generalLayout5.point,
  },
  {
    type: 'layout',
    name: 'ideaLayout',
    route: '/ideas/:id',
    point: ideaLayout6.point,
  },
  {
    type: 'component',
    name: 'bestIdea',
    point: BestIdeaComponent7.point,
  },
  {
    type: 'mutation',
    name: 'createIdea',
    point: createIdeaMutation8.point,
  },
  {
    type: 'response',
    name: 'generateIdea',
    point: generateIdeaMutation9.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx1',
    point: clientCtx110.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx2',
    point: clientCtx211.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx3',
    point: clientCtx312.point,
  },
  {
    root: true,
    type: 'base',
    name: 'client',
    point: client13.point,
  },
])

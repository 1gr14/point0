import { Points } from 'point0/core/points.js'
import unnamed_1i1npmsah29, { BestIdeaComponent as BestIdeaComponent_1kyend7v629 } from '../pages/home.js'
import { empty as empty_23f2978d186 } from '../pages/empty.js'
import { ideasPage as ideasPage_zw6xuh2prm } from '../pages/ideas.js'
import unnamed_j1iy24wzvp, { createIdeaMutation as createIdeaMutation_j6ofa6bpkz, generateIdeaMutation as generateIdeaMutation_1fxvkflc0se } from '../pages/idea-create.js'
import { ideasNewsPage as ideasNewsPage_1alvljl3atu } from '../pages/idea-news.js'
import { generalLayout as generalLayout_cye3xgq6aj } from '../layouts/general.js'
import { ideaLayout as ideaLayout_7a6s761am9 } from '../layouts/idea.js'
import { clientCtx1 as clientCtx1_hwnh96tt7k, clientCtx2 as clientCtx2_pyju4jkxzw, clientCtx3 as clientCtx3_1tk4n7wua57 } from './client-ctx.js'
import { client as client_1pb2f47mnzg } from './client.js'

export const points = Points.ready([
  {
    type: 'page',
    name: 'home',
    route: '/',
    layouts: ['generalLayout'],
    point: unnamed_1i1npmsah29.point,
  },
  {
    type: 'page',
    name: 'empty',
    route: '/empty',
    point: empty_23f2978d186.point,
  },
  {
    type: 'page',
    name: 'ideas',
    route: '/ideas',
    layouts: ['generalLayout'],
    point: ideasPage_zw6xuh2prm.point,
  },
  {
    type: 'page',
    name: 'newIdea',
    route: '/ideas/new',
    layouts: ['generalLayout'],
    point: unnamed_j1iy24wzvp.point,
  },
  {
    type: 'page',
    name: 'ideaNews',
    route: '/ideas/:id/news',
    layouts: ['generalLayout', 'ideaLayout'],
    point: ideasNewsPage_1alvljl3atu.point,
  },
  {
    type: 'layout',
    name: 'generalLayout',
    route: '/',
    point: generalLayout_cye3xgq6aj.point,
  },
  {
    type: 'layout',
    name: 'ideaLayout',
    route: '/ideas/:id',
    point: ideaLayout_7a6s761am9.point,
  },
  {
    type: 'component',
    name: 'bestIdea',
    point: BestIdeaComponent_1kyend7v629.point,
  },
  {
    type: 'mutation',
    name: 'createIdea',
    point: createIdeaMutation_j6ofa6bpkz.point,
  },
  {
    type: 'response',
    name: 'generateIdea',
    point: generateIdeaMutation_1fxvkflc0se.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx1',
    point: clientCtx1_hwnh96tt7k.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx2',
    point: clientCtx2_pyju4jkxzw.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx3',
    point: clientCtx3_1tk4n7wua57.point,
  },
  {
    root: true,
    type: 'base',
    name: 'client',
    point: client_1pb2f47mnzg.point,
  },
])

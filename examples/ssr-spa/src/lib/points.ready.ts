import { Points } from 'point0/core/points.js'
import unnamed_6l07mdq734, { BestIdeaComponent as BestIdeaComponent_3qkxiugr0k } from '../pages/home.js'
import { empty as empty_n50wzpyog6 } from '../pages/empty.js'
import { ideasPage as ideasPage_1ez06sxoz6e } from '../pages/ideas.js'
import unnamed_rhg2sxrtie, { createIdeaMutation as createIdeaMutation_210fo46cs0t, generateIdeaMutation as generateIdeaMutation_qlhpr7tzjc } from '../pages/idea-create.js'
import { ideaPage as ideaPage_hr2d3acswa } from '../pages/idea.js'
import { ideasNewsPage as ideasNewsPage_1molf60443b } from '../pages/idea-news.js'
import { generalLayout as generalLayout_1sm4sgw7w4h } from '../layouts/general.js'
import { ideaLayout as ideaLayout_15r5wfdlfdu } from '../layouts/idea.js'
import { clientCtx1 as clientCtx1_e0e2noswu2, clientCtx2 as clientCtx2_10xmsz16jme, clientCtx3 as clientCtx3_5lscxj0gv7 } from './client-ctx.js'
import { client as client_29b1dq6qbu2 } from './client.js'

export const points = Points.ready([
  {
    type: 'page',
    name: 'home',
    route: '/',
    layouts: ['generalLayout'],
    point: unnamed_6l07mdq734.point,
  },
  {
    type: 'page',
    name: 'empty',
    route: '/empty',
    point: empty_n50wzpyog6.point,
  },
  {
    type: 'page',
    name: 'ideas',
    route: '/ideas&page',
    layouts: ['generalLayout'],
    point: ideasPage_1ez06sxoz6e.point,
  },
  {
    type: 'page',
    name: 'newIdea',
    route: '/ideas/new',
    layouts: ['generalLayout'],
    point: unnamed_rhg2sxrtie.point,
  },
  {
    type: 'page',
    name: 'idea',
    route: '/ideas/:id/',
    layouts: ['generalLayout', 'ideaLayout'],
    point: ideaPage_hr2d3acswa.point,
  },
  {
    type: 'page',
    name: 'ideaNews',
    route: '/ideas/:id/news',
    layouts: ['generalLayout', 'ideaLayout'],
    point: ideasNewsPage_1molf60443b.point,
  },
  {
    type: 'layout',
    name: 'generalLayout',
    route: '/',
    point: generalLayout_1sm4sgw7w4h.point,
  },
  {
    type: 'layout',
    name: 'ideaLayout',
    route: '/ideas/:id',
    point: ideaLayout_15r5wfdlfdu.point,
  },
  {
    type: 'component',
    name: 'bestIdea',
    point: BestIdeaComponent_3qkxiugr0k.point,
  },
  {
    type: 'mutation',
    name: 'createIdea',
    point: createIdeaMutation_210fo46cs0t.point,
  },
  {
    type: 'response',
    name: 'generateIdea',
    point: generateIdeaMutation_qlhpr7tzjc.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx1',
    point: clientCtx1_e0e2noswu2.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx2',
    point: clientCtx2_10xmsz16jme.point,
  },
  {
    type: 'client-ctx',
    name: 'testClientCtx3',
    point: clientCtx3_5lscxj0gv7.point,
  },
  {
    root: true,
    type: 'base',
    name: 'client',
    point: client_29b1dq6qbu2.point,
  },
])

import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const _unnamed_r4atzobnk4_lazy = {
  type: 'page',
  name: 'home',
  route: '/',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const _empty_pruxxbl098_lazy = {
  type: 'page',
  name: 'empty',
  route: '/empty',
  polh: true,
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const _ideasPage_vhmioaam4g_lazy = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const _unnamed_m9qrdar25y_lazy = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const _ideaPage_1jj9b86ff42_lazy = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  polh: true,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const _ideasNewsPage_z4vr0ssubq_lazy = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  polh: true,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideasNewsPage.point,
} as LazyPointsCollectionRecord

export const _generalLayout_1ya49gjm3f3_lazy = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const _ideaLayout_nt15d99se5_lazy = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const _BestIdeaComponent_1sqqm2reutm_lazy = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent2_jzuivdmkji_lazy = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent2.point,
} as LazyPointsCollectionRecord

export const _createIdeaMutation_k3umsnbq7x_lazy = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _generateIdeaMutation_msnv38cpgt_lazy = {
  type: 'mutation',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _myMut_1frdd0falw5_lazy = {
  type: 'mutation',
  name: 'myMut',
  point: async () => (await import('../pages/home.helper.js')).myMut.point,
} as LazyPointsCollectionRecord

export const _clientCtx1_9jgh9cnuwr_lazy = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const _clientCtx2_13tpyj7t2hn_lazy = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const _clientCtx3_zqycaromyz_lazy = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const _root_lazy = {
  type: 'root' as const,
  name: 'client',
  point: root.point,
}

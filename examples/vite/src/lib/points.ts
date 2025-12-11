import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const unnamed_1xupg4f5vv0_lazy = {
  type: 'page',
  name: 'home',
  route: '/',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const empty_2bnq424ef49_lazy = {
  type: 'page',
  name: 'empty',
  route: '/empty',
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const ideasPage_1bqac7f434e_lazy = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const unnamed_witwsejp4z_lazy = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const ideaPage_1z3ri2l3oep_lazy = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const ideasNewsPage_f1cgsfcemm_lazy = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideasNewsPage.point,
} as LazyPointsCollectionRecord

export const generalLayout_10x3orfssi_lazy = {
  type: 'layout',
  name: 'generalLayout',
  route: '/generalLayout',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const ideaLayout_lrs2f3kknb_lazy = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const BestIdeaComponent_1grnomu16ja_lazy = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const createIdeaMutation_2456swjgg4g_lazy = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const generateIdeaMutation_5tk1n390tb_lazy = {
  type: 'response',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const clientCtx1_1wf24hhxbev_lazy = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const clientCtx2_1ef3feebldj_lazy = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const clientCtx3_11wnml4ki1j_lazy = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const root_lazy = {
  type: 'root' as const,
  name: 'client',
  point: root.point,
}

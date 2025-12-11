import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const empty_1e907mxbta1_lazy = {
  type: 'page',
  name: 'empty&x',
  route: '/empty&x',
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const unnamed_26z5ww20orm_lazy = {
  type: 'page',
  name: 'home',
  route: '/home',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const ideasPage_ssfqq9iosy_lazy = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const unnamed_1qt41um74na_lazy = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const ideaPage_20lppw25s2w_lazy = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const ideasNewsPage_28s169x55t9_lazy = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideasNewsPage.point,
} as LazyPointsCollectionRecord

export const sharedEmptyPage_1etebo1y5ff_lazy = {
  type: 'page',
  name: 'sharedEmpty',
  route: '/sharedEmpty',
  point: async () => (await import('../pages/empty.js')).sharedEmptyPage.point,
} as LazyPointsCollectionRecord

export const generalLayout_193elwvbgq2_lazy = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const ideaLayout_18ynb9ws4rt_lazy = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const BestIdeaComponent_d4fc40o18s_lazy = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const ExternalHelperComponent2_n833jxaakp_lazy = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent2.point,
} as LazyPointsCollectionRecord

export const createIdeaMutation_8yx92ovk3m_lazy = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const sharedQuery_2ccf8pbspaq_lazy = {
  type: 'query',
  name: 'sharedQuery',
  point: async () => root.point.attach((await import('./shared.js')).sharedQuery.point),
} as LazyPointsCollectionRecord

export const generateIdeaMutation_1ssnr64ebrb_lazy = {
  type: 'response',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const clientCtx1_j9bk3icrtg_lazy = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const clientCtx2_ifnzefuc3c_lazy = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const clientCtx3_g5nrysn71_lazy = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const root_lazy = {
  type: 'root' as const,
  name: 'client',
  point: root.point,
}


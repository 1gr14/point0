await import('point0/core/super-store.js').then(async ({ SuperStore }) => await SuperStore.init({}))
import type { LazyPointsCollectionRecord } from 'point0/core/points.js'

export const unnamed_6l07mdq734_lazy = {
  type: 'page',
  name: 'home',
  route: '/',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const empty_n50wzpyog6_lazy = {
  type: 'page',
  name: 'empty',
  route: '/empty',
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const ideasPage_1ez06sxoz6e_lazy = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const unnamed_rhg2sxrtie_lazy = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const ideaPage_hr2d3acswa_lazy = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const ideasNewsPage_1molf60443b_lazy = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideasNewsPage.point,
} as LazyPointsCollectionRecord

export const generalLayout_1sm4sgw7w4h_lazy = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const ideaLayout_15r5wfdlfdu_lazy = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const BestIdeaComponent_3qkxiugr0k_lazy = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const createIdeaMutation_210fo46cs0t_lazy = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const generateIdeaMutation_qlhpr7tzjc_lazy = {
  type: 'response',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const clientCtx1_1fcj193ea8l_lazy = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const clientCtx2_1qoylysk392_lazy = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const clientCtx3_kjm4ujslwt_lazy = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const client_29b1dq6qbu2_lazy = {
  root: true,
  type: 'base',
  name: 'client',
  point: async () => (await import('./client.js')).client.point,
} as LazyPointsCollectionRecord


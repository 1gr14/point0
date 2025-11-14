import type { LazyPointsCollectionRecord } from 'point0/core/points.js'
import { client as root } from './client.js'

export const unnamed_2nirgelrix_lazy = {
  type: 'page',
  name: 'home',
  route: '/',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const empty_1qwi1vhszn9_lazy = {
  type: 'page',
  name: 'empty',
  route: '/empty',
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const ideasPage_hxulrl1nnn_lazy = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const unnamed_y1pdiec1nq_lazy = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const ideaPage_10qiz95u14t_lazy = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const ideasNewsPage_253gmlsno9c_lazy = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideasNewsPage.point,
} as LazyPointsCollectionRecord

export const generalLayout_2gfpzb6j7l7_lazy = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const ideaLayout_1n4r1krk2p1_lazy = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const BestIdeaComponent_vv6nvq4ewn_lazy = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const createIdeaMutation_g510oe8thx_lazy = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const generateIdeaMutation_exi0y23t6q_lazy = {
  type: 'response',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const clientCtx1_ebcomz2sbs_lazy = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const clientCtx2_2bzhjg0q8a8_lazy = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const clientCtx3_1qtevav4o3t_lazy = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const root_lazy = {
  root: true as const,
  type: 'base' as const,
  name: 'client',
  point: root.point,
}


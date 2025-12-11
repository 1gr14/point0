import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const empty_2amkwtcj9yz_lazy = {
  type: 'page',
  name: 'empty',
  route: '/empty',
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const sharedEmptyPage_1eh47lm9zhm_lazy = {
  type: 'page',
  name: 'sharedEmpty',
  route: '/empty/shared',
  point: async () => (await import('../pages/empty.js')).sharedEmptyPage.point,
} as LazyPointsCollectionRecord

export const unnamed_xlz7nckd56_lazy = {
  type: 'page',
  name: 'home',
  route: '/home',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const ideasPage_2219ahp9gxy_lazy = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const unnamed_2cx5dh3uigf_lazy = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const ideaPage_1a2r6duvifi_lazy = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const ideasNewsPage_408hi1t0rg_lazy = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideasNewsPage.point,
} as LazyPointsCollectionRecord

export const generalLayout_27c91mv210p_lazy = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const ideaLayout_fx3wrdu229_lazy = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const BestIdeaComponent_zwue12ns3q_lazy = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const createIdeaMutation_1w8riijaun4_lazy = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const sharedQuery_1uckkkbr0v_lazy = {
  type: 'query',
  name: 'sharedQuery',
  point: async () => root.point.attach((await import('./shared.js')).sharedQuery.point),
} as LazyPointsCollectionRecord

export const generateIdeaMutation_16hdcucp52f_lazy = {
  type: 'response',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const clientCtx1_29pjcp9gqa2_lazy = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const clientCtx2_15pamwpw7fz_lazy = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const clientCtx3_24942art9vc_lazy = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const root_lazy = {
  type: 'root' as const,
  name: 'client',
  point: root.point,
}


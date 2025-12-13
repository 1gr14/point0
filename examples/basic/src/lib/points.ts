import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const unnamed_194a12vzyrr_lazy = {
  type: 'page',
  name: 'home',
  route: '/',
  shouldBePrefetchedOnLinkHover: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const empty_26z4arz84c0_lazy = {
  type: 'page',
  name: 'empty',
  route: '/empty&x',
  shouldBePrefetchedOnLinkHover: true,
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const ideasPage_dsuwn7kpg6_lazy = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  shouldBePrefetchedOnLinkHover: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const unnamed_rblpffd78f_lazy = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  shouldBePrefetchedOnLinkHover: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const ideaPage_1lbwy4x6i7a_lazy = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  shouldBePrefetchedOnLinkHover: true,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const ideaNewsPage_swg9xetjej_lazy = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  shouldBePrefetchedOnLinkHover: 2000,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideaNewsPage.point,
} as LazyPointsCollectionRecord

export const sharedEmptyPage_1x5p7rnbnfb_lazy = {
  type: 'page',
  name: 'sharedEmpty',
  route: '/sharedEmpty2',
  shouldBePrefetchedOnLinkHover: true,
  point: async () => (await import('../pages/empty.js')).sharedEmptyPage.point,
} as LazyPointsCollectionRecord

export const generalLayout_2a89rn3ysgd_lazy = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const ideaLayout_109ae95y9wr_lazy = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const BestIdeaComponent_242jb1jm1kp_lazy = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const ExternalHelperComponent2_n1xbrdietv_lazy = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent2.point,
} as LazyPointsCollectionRecord

export const createIdeaMutation_covj1sfftq_lazy = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const sharedQuery_ehd68url3u_lazy = {
  type: 'query',
  name: 'sharedQuery',
  point: async () => root.point.attach((await import('./shared.js')).sharedQuery.point),
} as LazyPointsCollectionRecord

export const generateIdeaMutation_26eqf9w1e8t_lazy = {
  type: 'response',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const clientCtx1_2aazoua7zcl_lazy = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const clientCtx2_1vl423rboa8_lazy = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const clientCtx3_1rlhk9hehay_lazy = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const root_lazy = {
  type: 'root' as const,
  name: 'client',
  point: root.point,
}


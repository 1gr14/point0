import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const _unnamed_194a12vzyrr_lazy = {
  type: 'page',
  name: 'home',
  route: '/',
  shouldBePrefetchedOnLinkHover: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const _empty_26z4arz84c0_lazy = {
  type: 'page',
  name: 'empty',
  route: '/empty&x',
  shouldBePrefetchedOnLinkHover: true,
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const _filePage_k5oe64f0zy_lazy = {
  type: 'page',
  name: 'file',
  route: '/file',
  shouldBePrefetchedOnLinkHover: true,
  point: async () => (await import('../pages/file.js')).filePage.point,
} as LazyPointsCollectionRecord

export const _ideasPage_dsuwn7kpg6_lazy = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  shouldBePrefetchedOnLinkHover: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const _unnamed_rblpffd78f_lazy = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  shouldBePrefetchedOnLinkHover: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const _ideaPage_1lbwy4x6i7a_lazy = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  shouldBePrefetchedOnLinkHover: true,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const _ideaNewsPage_swg9xetjej_lazy = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  shouldBePrefetchedOnLinkHover: 2000,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideaNewsPage.point,
} as LazyPointsCollectionRecord

export const _sharedEmptyPage_1x5p7rnbnfb_lazy = {
  type: 'page',
  name: 'sharedEmpty',
  route: '/sharedEmpty2',
  shouldBePrefetchedOnLinkHover: true,
  point: async () => (await import('../pages/empty.js')).sharedEmptyPage.point,
} as LazyPointsCollectionRecord

export const _generalLayout_2a89rn3ysgd_lazy = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const _ideaLayout_109ae95y9wr_lazy = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const _BestIdeaComponent_242jb1jm1kp_lazy = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent2_n1xbrdietv_lazy = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent2.point,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent3_zzfd1v06eh_lazy = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent3.point,
} as LazyPointsCollectionRecord

export const _clientFn2Mutation_13ogi387skq_lazy = {
  type: 'mutation',
  name: 'clientFn2Mutation',
  point: async () => (await import('../pages/idea-create.js')).clientFn2Mutation.point,
} as LazyPointsCollectionRecord

export const _clientFnMutation_267786urot4_lazy = {
  type: 'mutation',
  name: 'clientFnMutation',
  point: async () => (await import('../pages/idea-create.js')).clientFnMutation.point,
} as LazyPointsCollectionRecord

export const _clientFnMutationX_g8voc16gwq_lazy = {
  type: 'mutation',
  name: 'clientFnMutation',
  point: async () => (await import('../pages/idea-create.js')).clientFnMutationX.point,
} as LazyPointsCollectionRecord

export const _createIdeaMutation_covj1sfftq_lazy = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _generateIdeaMutation_2cgsxzalkcb_lazy = {
  type: 'mutation',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _uploadFileMutation_231owori99c_lazy = {
  type: 'mutation',
  name: 'uploadFile',
  point: async () => (await import('../pages/file.js')).uploadFileMutation.point,
} as LazyPointsCollectionRecord

export const _sharedQuery_ehd68url3u_lazy = {
  type: 'query',
  name: 'sharedQuery',
  point: async () => root.point.attach((await import('./shared.js')).sharedQuery.point),
} as LazyPointsCollectionRecord

export const _clientCtx1_2aazoua7zcl_lazy = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const _clientCtx2_1vl423rboa8_lazy = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const _clientCtx3_1rlhk9hehay_lazy = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const _root_lazy = {
  type: 'root' as const,
  name: 'client',
  point: root.point,
}


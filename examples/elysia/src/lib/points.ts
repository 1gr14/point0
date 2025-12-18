import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const _unnamed_1ou1x35w0ni_lazy = {
  type: 'page',
  name: 'home',
  route: '/',
  shouldBePrefetchedOnLinkHover: false,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const _empty_1hkfpsw8bf8_lazy = {
  type: 'page',
  name: 'empty',
  route: '/empty',
  shouldBePrefetchedOnLinkHover: false,
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const _sharedEmptyPage_2fpm0morg6d_lazy = {
  type: 'page',
  name: 'sharedEmpty',
  route: '/empty/shared',
  shouldBePrefetchedOnLinkHover: false,
  point: async () => (await import('../pages/empty.js')).sharedEmptyPage.point,
} as LazyPointsCollectionRecord

export const _ideasPage_1ph5cjq2lcy_lazy = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  shouldBePrefetchedOnLinkHover: false,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const _unnamed_12ssc61x8py_lazy = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  shouldBePrefetchedOnLinkHover: false,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const _ideaPage_lgqlupqrd2_lazy = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  shouldBePrefetchedOnLinkHover: false,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const _ideasNewsPage_1199g1po7xm_lazy = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  shouldBePrefetchedOnLinkHover: false,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideasNewsPage.point,
} as LazyPointsCollectionRecord

export const _generalLayout_1x5fgy0uzab_lazy = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const _ideaLayout_1uzidssunaw_lazy = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const _BestIdeaComponent_2byxvvo82xu_lazy = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const _createIdeaMutation_ha6j0osvps_lazy = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _generateIdeaMutation_14mvrunlk5k_lazy = {
  type: 'mutation',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _sharedQuery_1k45m2h3yh2_lazy = {
  type: 'query',
  name: 'sharedQuery',
  point: async () => root.point.attach((await import('./shared.js')).sharedQuery.point),
} as LazyPointsCollectionRecord

export const _clientCtx1_ul6w2i92gm_lazy = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const _clientCtx2_1xb6z12ry3t_lazy = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const _clientCtx3_2e5g3i06egd_lazy = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const _root_lazy = {
  type: 'root' as const,
  name: 'client',
  point: root.point,
}


import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const _unnamed_vd4c05r168 = {
  type: 'page',
  name: 'home',
  route: '/',
  polh: false,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const _empty_1wf38llrwqh = {
  type: 'page',
  name: 'empty',
  route: '/empty',
  polh: false,
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const _sharedEmptyPage_hay5zkyl89 = {
  type: 'page',
  name: 'sharedEmpty',
  route: '/empty/shared',
  polh: false,
  point: async () => (await import('../pages/empty.js')).sharedEmptyPage.point,
} as LazyPointsCollectionRecord

export const _ideasPage_1cx7s7l9itn = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  polh: false,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const _unnamed_1jxceo4mo22 = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  polh: false,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const _ideaPage_cpf4zmtycs = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  polh: false,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const _ideasNewsPage_11n15dsdnb3 = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  polh: false,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideasNewsPage.point,
} as LazyPointsCollectionRecord

export const _generalLayout_1uwkojo084w = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const _ideaLayout_1701fa2ffip = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const _BestIdeaComponent_3k1zb80ysl = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent2_1lz2psdl4ee = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent2.point,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent3_138h3uovfui = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent3.point,
} as LazyPointsCollectionRecord

export const _createIdeaMutation_1mjz1eotas4 = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _generateIdeaMutation_2emcqmcw63r = {
  type: 'mutation',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _sharedQuery_7zo2k6kt41 = {
  type: 'query',
  name: 'sharedQuery',
  point: async () => root.point.attach((await import('./shared.js')).sharedQuery.point),
} as LazyPointsCollectionRecord

export const _clientCtx1_wqvubaa4go = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const _clientCtx2_241bc2xnwxn = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const _clientCtx3_5ftiqzzyd8 = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const _root = {
  type: 'root' as const,
  name: 'client',
  point: root.point,
}


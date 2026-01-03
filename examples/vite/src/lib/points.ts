import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const _unnamed_2a78uroggpi = {
  type: 'page',
  name: 'home',
  route: '/',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const _empty_7kxbg5jzbk = {
  type: 'page',
  name: 'empty',
  route: '/empty',
  polh: true,
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const _ideasPage_2wj7zaz5wh = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const _unnamed_1d0wterh2ib = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const _ideaPage_23qdk9z4qme = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  polh: true,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const _ideasNewsPage_1lv76qu1lku = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  polh: true,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideasNewsPage.point,
} as LazyPointsCollectionRecord

export const _generalLayout_2fac5gnfddz = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const _ideaLayout_65wplwgn5h = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const _BestIdeaComponent_6braxmk099 = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent2_2erogz4ecu8 = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent2.point,
} as LazyPointsCollectionRecord

export const _createIdeaMutation_vsxbegp2hg = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _generateIdeaMutation_mhzwg8ajh4 = {
  type: 'mutation',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _myMut_e5xmvjps0n = {
  type: 'mutation',
  name: 'myMut',
  point: async () => (await import('../pages/home.helper.js')).myMut.point,
} as LazyPointsCollectionRecord

export const _clientCtx1_25rx8jenapo = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const _clientCtx2_1mnh1b3bmu5 = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const _clientCtx3_276i7s0o9es = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const _root = {
  type: 'root' as const,
  name: 'client',
  point: root.point,
}


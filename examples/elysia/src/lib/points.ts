import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const _unnamed_0 = {
  type: 'page',
  name: 'home',
  route: '/',
  polh: false,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default,
} as LazyPointsCollectionRecord

export const _empty_1 = {
  type: 'page',
  name: 'empty',
  route: '/empty',
  polh: false,
  point: async () => (await import('../pages/empty.js')).empty,
} as LazyPointsCollectionRecord

export const _ideasPage_2 = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  polh: false,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage,
} as LazyPointsCollectionRecord

export const _unnamed_3 = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  polh: false,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default,
} as LazyPointsCollectionRecord

export const _ideaPage_4 = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  polh: false,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage,
} as LazyPointsCollectionRecord

export const _ideasNewsPage_5 = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  polh: false,
  layouts: ['generalLayout', 'ideaLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideasNewsPage,
} as LazyPointsCollectionRecord

export const _generalLayout_6 = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout,
} as LazyPointsCollectionRecord

export const _ideaLayout_7 = {
  type: 'layout',
  name: 'ideaLayout',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout,
} as LazyPointsCollectionRecord

export const _BestIdeaComponent_8 = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent2_9 = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent2,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent3_10 = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent3,
} as LazyPointsCollectionRecord

export const _createIdeaMutation_11 = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation,
} as LazyPointsCollectionRecord

export const _generateIdeaMutation_12 = {
  type: 'mutation',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation,
} as LazyPointsCollectionRecord

export const _clientCtx1_13 = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1,
} as LazyPointsCollectionRecord

export const _clientCtx2_14 = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2,
} as LazyPointsCollectionRecord

export const _clientCtx3_15 = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3,
} as LazyPointsCollectionRecord

export const _root = root

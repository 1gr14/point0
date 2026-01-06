import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const _empty_0 = {
  type: 'page',
  name: 'empty',
  route: '/empty',
  polh: true,
  point: async () => (await import('../pages/empty.js')).empty,
} as LazyPointsCollectionRecord

export const _generalLayout_1 = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout,
} as LazyPointsCollectionRecord

export const _BestIdeaComponent_2 = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent2_3 = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent2,
} as LazyPointsCollectionRecord

export const _createIdeaMutation_4 = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation,
} as LazyPointsCollectionRecord

export const _generateIdeaMutation_5 = {
  type: 'mutation',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation,
} as LazyPointsCollectionRecord

export const _myMut_6 = {
  type: 'mutation',
  name: 'myMut',
  point: async () => (await import('../pages/home.helper.js')).myMut,
} as LazyPointsCollectionRecord

export const _clientCtx1_7 = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1,
} as LazyPointsCollectionRecord

export const _clientCtx2_8 = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2,
} as LazyPointsCollectionRecord

export const _clientCtx3_9 = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3,
} as LazyPointsCollectionRecord

export const _root = root

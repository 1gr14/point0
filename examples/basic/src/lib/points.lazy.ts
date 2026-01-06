import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const _unnamed_0 = {
  type: 'page',
  name: 'home',
  route: '/',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default,
} as LazyPointsCollectionRecord

export const _empty_1 = {
  type: 'page',
  name: 'empty',
  route: '/empty&x',
  polh: true,
  point: async () => (await import('../pages/empty.js')).empty,
} as LazyPointsCollectionRecord

export const _filePage_2 = {
  type: 'page',
  name: 'file',
  route: '/file',
  polh: true,
  point: async () => (await import('../pages/file.js')).filePage,
} as LazyPointsCollectionRecord

export const _ideasPage_3 = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage,
} as LazyPointsCollectionRecord

export const _unnamed_4 = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default,
} as LazyPointsCollectionRecord

export const _ideaPage_5 = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  polh: true,
  layouts: ['idea', 'generalLayout'],
  point: async () => (await import('../pages/idea.js')).ideaPage,
} as LazyPointsCollectionRecord

export const _ideaNewsPage_6 = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  polh: 2000,
  layouts: ['idea', 'generalLayout'],
  point: async () => (await import('../pages/idea-news.js')).ideaNewsPage,
} as LazyPointsCollectionRecord

export const _generalLayout_7 = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout,
} as LazyPointsCollectionRecord

export const _ideaLayout_8 = {
  type: 'layout',
  name: 'idea',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout,
} as LazyPointsCollectionRecord

export const _BestIdeaComponent_9 = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent2_10 = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent2,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent3_11 = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent3,
} as LazyPointsCollectionRecord

export const _clientFn2Mutation_12 = {
  type: 'mutation',
  name: 'clientFn2Mutation',
  point: async () => (await import('../pages/idea-create.js')).clientFn2Mutation,
} as LazyPointsCollectionRecord

export const _clientFnMutation_13 = {
  type: 'mutation',
  name: 'clientFnMutation',
  point: async () => (await import('../pages/idea-create.js')).clientFnMutation,
} as LazyPointsCollectionRecord

export const _clientFnMutationX_14 = {
  type: 'mutation',
  name: 'clientFnMutation',
  point: async () => (await import('../pages/idea-create.js')).clientFnMutationX,
} as LazyPointsCollectionRecord

export const _createIdeaMutation_15 = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation,
} as LazyPointsCollectionRecord

export const _generateIdeaMutation_16 = {
  type: 'mutation',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation,
} as LazyPointsCollectionRecord

export const _uploadFileMutation_17 = {
  type: 'mutation',
  name: 'uploadFile',
  point: async () => (await import('../pages/file.js')).uploadFileMutation,
} as LazyPointsCollectionRecord

export const _clientCtx1_18 = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1,
} as LazyPointsCollectionRecord

export const _clientCtx2_19 = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2,
} as LazyPointsCollectionRecord

export const _clientCtx3_20 = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3,
} as LazyPointsCollectionRecord

export const _root = root

import type { LazyPointsCollectionRecord } from '@point0/core'
import { client as root } from './client.js'

export const _unnamed_vcrzt7ph3o = {
  type: 'page',
  name: 'home',
  route: '/',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/home.js')).default.point,
} as LazyPointsCollectionRecord

export const _empty_29zfptrjw1d = {
  type: 'page',
  name: 'empty',
  route: '/empty&x',
  polh: true,
  point: async () => (await import('../pages/empty.js')).empty.point,
} as LazyPointsCollectionRecord

export const _filePage_12cq24h4kex = {
  type: 'page',
  name: 'file',
  route: '/file',
  polh: true,
  point: async () => (await import('../pages/file.js')).filePage.point,
} as LazyPointsCollectionRecord

export const _ideasPage_yf0mq6zo2a = {
  type: 'page',
  name: 'ideas',
  route: '/ideas',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/ideas.js')).ideasPage.point,
} as LazyPointsCollectionRecord

export const _unnamed_np56kcde8h = {
  type: 'page',
  name: 'newIdea',
  route: '/ideas/new',
  polh: true,
  layouts: ['generalLayout'],
  point: async () => (await import('../pages/idea-create.js')).default.point,
} as LazyPointsCollectionRecord

export const _ideaPage_22cou3sgy48 = {
  type: 'page',
  name: 'idea',
  route: '/ideas/:id',
  polh: true,
  layouts: ['generalLayout', 'idea'],
  point: async () => (await import('../pages/idea.js')).ideaPage.point,
} as LazyPointsCollectionRecord

export const _ideaNewsPage_1bvixp2xuk8 = {
  type: 'page',
  name: 'ideaNews',
  route: '/ideas/:id/news',
  polh: 2000,
  layouts: ['generalLayout', 'idea'],
  point: async () => (await import('../pages/idea-news.js')).ideaNewsPage.point,
} as LazyPointsCollectionRecord

export const _sharedEmptyPage_10in8p3i6ro = {
  type: 'page',
  name: 'sharedEmpty',
  route: '/sharedEmpty2',
  polh: true,
  point: async () => (await import('../pages/empty.js')).sharedEmptyPage.point,
} as LazyPointsCollectionRecord

export const _generalLayout_9hxs9xjakt = {
  type: 'layout',
  name: 'generalLayout',
  route: '/',
  point: async () => (await import('../layouts/general.js')).generalLayout.point,
} as LazyPointsCollectionRecord

export const _ideaLayout_1l0lkelfnny = {
  type: 'layout',
  name: 'idea',
  route: '/ideas/:id',
  point: async () => (await import('../layouts/idea.js')).ideaLayout.point,
} as LazyPointsCollectionRecord

export const _BestIdeaComponent_2g95l27hv37 = {
  type: 'component',
  name: 'bestIdea',
  point: async () => (await import('../pages/home.js')).BestIdeaComponent.point,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent2_2gjnidctt4q = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent2.point,
} as LazyPointsCollectionRecord

export const _ExternalHelperComponent3_20y9zhu2wzl = {
  type: 'component',
  name: 'externalHelper2',
  point: async () => (await import('../pages/home.helper.js')).ExternalHelperComponent3.point,
} as LazyPointsCollectionRecord

export const _clientFn2Mutation_pebipqvgey = {
  type: 'mutation',
  name: 'clientFn2Mutation',
  point: async () => (await import('../pages/idea-create.js')).clientFn2Mutation.point,
} as LazyPointsCollectionRecord

export const _clientFnMutation_1pfvxperpc2 = {
  type: 'mutation',
  name: 'clientFnMutation',
  point: async () => (await import('../pages/idea-create.js')).clientFnMutation.point,
} as LazyPointsCollectionRecord

export const _clientFnMutationX_mbkgfjtlgl = {
  type: 'mutation',
  name: 'clientFnMutation',
  point: async () => (await import('../pages/idea-create.js')).clientFnMutationX.point,
} as LazyPointsCollectionRecord

export const _createIdeaMutation_6lsfldlwq8 = {
  type: 'mutation',
  name: 'createIdea',
  point: async () => (await import('../pages/idea-create.js')).createIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _generateIdeaMutation_2epecrkeuwn = {
  type: 'mutation',
  name: 'generateIdea',
  point: async () => (await import('../pages/idea-create.js')).generateIdeaMutation.point,
} as LazyPointsCollectionRecord

export const _uploadFileMutation_2e3iyhqfm1h = {
  type: 'mutation',
  name: 'uploadFile',
  point: async () => (await import('../pages/file.js')).uploadFileMutation.point,
} as LazyPointsCollectionRecord

export const _sharedQuery_aj42zpd8gt = {
  type: 'query',
  name: 'sharedQuery',
  point: async () => root.point.attach((await import('./shared.js')).sharedQuery.point),
} as LazyPointsCollectionRecord

export const _clientCtx1_7hzqlccbi = {
  type: 'provider',
  name: 'testClientCtx1',
  point: async () => (await import('./client-ctx.js')).clientCtx1.point,
} as LazyPointsCollectionRecord

export const _clientCtx2_1jnj2bt0ivu = {
  type: 'provider',
  name: 'testClientCtx2',
  point: async () => (await import('./client-ctx.js')).clientCtx2.point,
} as LazyPointsCollectionRecord

export const _clientCtx3_25y0jpqc3fk = {
  type: 'provider',
  name: 'testClientCtx3',
  point: async () => (await import('./client-ctx.js')).clientCtx3.point,
} as LazyPointsCollectionRecord

export const _root = {
  type: 'root' as const,
  name: 'client',
  point: root.point,
}


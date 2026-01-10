import type { LazyPointsCollectionRecord } from '@point0/core'
import { root as root } from '../packages/engine/tests/template/src/lib/root.js'

export const _page_0 = {
  type: 'page',
  name: 'home',
  route: '/',
  polh: false,
  point: async () => (await import('../packages/engine/tests/temp/build/test-1/src/page.js')).page,
} as LazyPointsCollectionRecord

export const _page_1 = {
  type: 'page',
  name: 'home',
  route: '/',
  polh: false,
  point: async () => (await import('../node_modules/@point0/engine/tests/temp/build/test-1/src/page.js')).page,
} as LazyPointsCollectionRecord

export const _root = root
export const _root = root
export const _root = root
export const _root = root
export const _root = root

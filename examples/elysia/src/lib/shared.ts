import { Point0 } from '@point0/core'
import type { client } from './client'

export const shared = Point0.create<typeof client>('shared', ['client'])
  .loader(() => ({
    shared1: 'shared22',
  }))
  .root()

export const sharedQuery = shared
  .lets('query', 'sharedQuery')
  .loader(({ data }) => ({
    ...data,
    shared2: 'shared11',
  }))
  .query()
